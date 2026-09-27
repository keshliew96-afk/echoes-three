// gntfixM5b4-lobbyunit.mjs — fix-M5b-r4 (NET4-F2): server-side host resume, unit level (no I/O).
// The Lobby class with a recording send(): a host drops mid-game and comes back with
// reconnect { fresh } — with a cached keyframe (resume), without one (migrate now), alone
// without one (explicit reject), and the plain (non-fresh) reconnect path unchanged.
// node tools/gntfixM5b4-lobbyunit.mjs
import { Lobby } from '../server/lobby.mjs';
import { writeJson } from './gntfixM5b4-lib.mjs';

let clock = 1000;
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300)); };
function setup({ guests = 2, keyframe = true, kfAgeMs = 800 } = {}) {
  const sent = [];
  const lobby = new Lobby({ send: (p, t, payload) => sent.push({ to: p.id, t, ...payload }), now: () => clock });
  const mk = (id) => ({ id, name: id, build: 'b', protocol: 3, rttMs: 20, roomCode: null, seat: null });
  const H = mk('host');
  const G = Array.from({ length: guests }, (_, i) => mk(`g${i + 1}`));
  const { room } = lobby.createRoom(H, { visibility: 'private' });
  for (const g of G) lobby.joinRoom(g, room.code);
  room.state = 'in_game';
  if (keyframe) {
    const bytes = new Uint8Array(64);
    room.keyframe = { tick: 1234, bytes, receivedAt: clock - kfAgeMs, hostLastSeenAt: clock, hostPeerId: H.id, b64: () => 'AAAA' };
  }
  return { lobby, room, H, G, sent };
}

// 1) keyframe cached: the host drops, returns fresh inside the grace -> resume as host.
{
  const { lobby, room, H, sent } = setup();
  lobby.peerDropped(H, 'close');
  check('host drop -> room migrating', room.state === 'migrating', room.state);
  clock += 4000;
  sent.length = 0;
  const r = lobby.reattach(H, room.code, { fresh: true });
  const bh = sent.find((m) => m.t === 'become_host' && m.to === 'host');
  const hc = sent.filter((m) => m.t === 'host_changed');
  const rs = sent.filter((m) => m.t === 'room_state');
  check('fresh host reattach -> resumed as host', r.ok && r.host && r.resumed && room.hostPeerId === 'host' && room.state === 'in_game', { r: { ok: r.ok, host: r.host, resumed: r.resumed }, state: room.state });
  check('become_host { reason host_resume, keyframe, room } sent to the host', !!bh && bh.reason === 'host_resume' && bh.keyframe && bh.keyframe.tick === 1234 && bh.room && bh.room.code === room.code, bh && { reason: bh.reason, tick: bh.keyframe && bh.keyframe.tick, stateAgeMs: bh.keyframe && bh.keyframe.stateAgeMs });
  check('host_changed { reason host_resume } to both guests (not the host)', hc.length === 2 && hc.every((m) => m.reason === 'host_resume' && m.hostPeerId === 'host' && m.to !== 'host'), hc.map((m) => m.to));
  check('become_host precedes the room_state push', sent.indexOf(bh) < sent.indexOf(rs.find((m) => m.to === 'host')), sent.map((m) => `${m.t}>${m.to}`));
  check('stateAgeMs = keyframe age at the drop (800 ms)', bh && bh.keyframe.stateAgeMs === 800, bh && bh.keyframe.stateAgeMs);
  check('counter hostResumes', lobby.counters.hostResumes === 1, lobby.counters);
}
// 2) the host is still connected (second tab superseded the live socket): fresh -> resume too.
{
  const { lobby, room, H, sent } = setup();
  sent.length = 0;
  const r = lobby.reattach(H, room.code, { fresh: true });
  check('fresh reattach while the seat is live -> resume', r.ok && r.resumed && sent.some((m) => m.t === 'become_host' && m.reason === 'host_resume'), { r: r.ok, resumed: r.resumed });
}
// 3) no keyframe, guests connected -> migrate now; the returning player is a guest on seat 0.
{
  const { lobby, room, H, sent } = setup({ keyframe: false });
  lobby.peerDropped(H, 'close');
  sent.length = 0;
  const r = lobby.reattach(H, room.code, { fresh: true });
  const bh = sent.find((m) => m.t === 'become_host');
  check('no keyframe -> migrate now to a guest', r.ok && !r.host && room.hostPeerId !== 'host' && bh && bh.to !== 'host' && bh.reason === 'host_reloaded', { host: room.hostPeerId, bh: bh && { to: bh.to, reason: bh.reason } });
  check('returning player keeps seat 0, connected', room.seats[0].peerId === 'host' && room.seats[0].connected, room.seats[0]);
}
// 4) no keyframe, nobody else -> the room closes and the reconnect is rejected explicitly.
{
  const { lobby, room, H, sent } = setup({ guests: 0, keyframe: false });
  lobby.peerDropped(H, 'close');
  sent.length = 0;
  const r = lobby.reattach(H, room.code, { fresh: true });
  const rej = sent.find((m) => m.t === 'join_rejected' && m.to === 'host');
  check('alone without keyframe -> closed + join_rejected not_found with a reason', !r.ok && room.state === 'closed' && rej && rej.reason === 'not_found' && /nobody else/.test(rej.detail), rej);
}
// 5) stale keyframe (> 10 s of play missing) with guests -> migrate, never a stale resume.
{
  const { lobby, room, H, sent } = setup({ kfAgeMs: 15000 });
  lobby.peerDropped(H, 'close');
  sent.length = 0;
  lobby.reattach(H, room.code, { fresh: true });
  check('stale keyframe -> no host_resume', !sent.some((m) => m.reason === 'host_resume'), sent.map((m) => `${m.t}:${m.reason || ''}`));
  const bh = sent.find((m) => m.t === 'become_host');
  check('stale keyframe -> the migrated host continues from its own view (keyframe null)', bh && bh.keyframe === null, bh && { to: bh.to, keyframe: bh.keyframe });
}
// 6) plain reconnect (the in-page link-blip path) is unchanged: peer_restored { host: true }, no keyframe.
{
  const { lobby, room, H, sent } = setup();
  lobby.peerDropped(H, 'silence');
  sent.length = 0;
  const r = lobby.reattach(H, room.code);
  check('non-fresh host reattach -> peer_restored { host: true }, no become_host', r.ok && r.host && !r.resumed && sent.some((m) => m.t === 'peer_restored' && m.host) && !sent.some((m) => m.t === 'become_host'), sent.map((m) => m.t));
}
// 7) a fresh GUEST reattach is a plain reattach.
{
  const { lobby, room, G, sent } = setup();
  lobby.peerDropped(G[0], 'close');
  sent.length = 0;
  const r = lobby.reattach(G[0], room.code, { fresh: true });
  check('fresh guest reattach -> plain peer_restored, host unchanged', r.ok && !r.host && room.hostPeerId === 'host' && sent.some((m) => m.t === 'peer_restored') && !sent.some((m) => m.t === 'become_host'), sent.map((m) => m.t));
}
const pass = checks.filter((c) => c.ok).length;
writeJson('gntfixM5b4-lobbyunit.json', { checks, pass, total: checks.length });
console.log(`${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
