#!/usr/bin/env node
// THE TIDECALLER co-op team pick (docs/LINEUP.md), unit level (no I/O): the
// Lobby class with a recording send(). Each player picks a character from
// the whole roster (select_class), then the host picks who joins as AI for
// the empty seats (set_team). Humans keep their characters and follow them
// to their seats.
//
//   node tools/team-lobbyunit.mjs
import { Lobby } from '../server/lobby.mjs';

let fails = 0;
const check = (ok, what, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail === undefined ? '' : ` (${JSON.stringify(detail)})`}`);
  if (!ok) fails += 1;
};
const sent = [];
const lobby = new Lobby({ send: (p, t, payload) => sent.push({ to: p.id, t, ...payload }), now: () => 1000 });
const mk = (id) => ({ id, name: id, build: 'b', protocol: 3, rttMs: 20, roomCode: null, seat: null });
const H = mk('host');
const G = mk('g1');
const G2 = mk('g2');
const { room } = lobby.createRoom(H, { visibility: 'private' });
lobby.joinRoom(G, room.code);
const classes = () => room.seats.map((s) => s.classId).join(',');
const who = () => room.seats.map((s) => `${s.classId}:${s.peerId || 'AI'}`).join(' ');
const lastErr = (peer) => [...sent].reverse().find((m) => m.to === peer.id && m.t === 'error');

check(classes() === 'healer,tank,swordsman,archer' && lobby.view(room).lineup.join(',') === classes(), 'a new room is the default four', classes());

// The guest picks Rill: she takes their own ally seat's place.
const g0 = lobby.seatOf(room, 'g1').index;
check(lobby.selectClass(G, 'tidecaller').ok && lobby.seatOf(room, 'g1').classId === 'tidecaller' && lobby.seatOf(room, 'g1').index === g0, 'the guest picks the Tidecaller in place of their seat', who());
check(G.seat === lobby.seatOf(room, 'g1').index, 'the peer seat follows', G.seat);

// The host moves off the Healer to the Archer, which is still in the team.
check(lobby.selectClass(H, 'archer').ok && lobby.seatOf(room, 'host').classId === 'archer', 'the host picks the Archer (its seat)', who());
check(room.seats[0].classId === 'healer' && room.seats[0].peerId === null, 'the Healer stays on seat 0, played by the AI', who());

// A class another human holds is refused.
sent.length = 0;
check(!lobby.selectClass(H, 'tidecaller').ok && lastErr(H) && lastErr(H).reason === 'seat_taken', 'a class another player holds is refused', lastErr(H));

// Only the host fills the AI seats, and the team must keep every human.
check(!lobby.setTeam(G, ['tank', 'archer', 'tidecaller']).ok, 'a guest cannot set the team');
check(!lobby.setTeam(H, ['tank', 'swordsman', 'archer']).ok && classes().includes('tidecaller'), 'a team without a human\'s character is refused', who());
check(lobby.setTeam(H, ['swordsman', 'archer', 'tidecaller']).ok, 'the host picks Swordsman to join as AI', who());
check(classes() === 'healer,swordsman,archer,tidecaller', 'seats follow the roster order', classes());
check(lobby.seatOf(room, 'host').classId === 'archer' && lobby.seatOf(room, 'g1').classId === 'tidecaller', 'both humans keep their characters', who());
check(H.seat === lobby.seatOf(room, 'host').index && G.seat === lobby.seatOf(room, 'g1').index, 'peer seats follow the move', { host: H.seat, g1: G.seat });
check(room.seats.find((s) => s.classId === 'swordsman').peerId === null, 'the Swordsman is an AI seat');

// A late joiner gets a free seat and can take an AI-held character.
lobby.joinRoom(G2, room.code);
check(lobby.seatOf(room, 'g2') && lobby.seatOf(room, 'g2').peerId === 'g2', 'a third player joins a free seat', who());
check(lobby.selectClass(G2, 'swordsman').ok && lobby.seatOf(room, 'g2').classId === 'swordsman', 'and takes the AI-held Swordsman', who());

// Bad teams are refused.
check(!lobby.setTeam(H, ['healer', 'archer', 'tidecaller']).ok && !lobby.setTeam(H, ['archer', 'archer', 'tidecaller']).ok, 'bad teams are refused', classes());

// After the start nothing moves.
lobby.setReady(G, true);
lobby.setReady(G2, true);
check(lobby.startGame(H).ok, 'the host starts');
check(!lobby.setTeam(H, ['tank', 'archer', 'tidecaller']).ok && !lobby.selectClass(G2, 'tank').ok, 'the team is locked once the game starts', classes());

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
