// gntM5b — PLAYING Node guests for the network-play probes. Owner: M5b.
//
// M5a's createGuestBot (tools/gntM5a-botlib.mjs) streams NEUTRAL input: its
// seat is "human" but stands still. A playing guest here is the same lobby
// client (src/net/lobbyClient.js over Node's WebSocket) with a session
// driver of its own: it decodes every snapshot with the real snapshot client
// (baseline/ack deltas, hash checks), acks the newest one in every input
// packet, and sends 60 Hz input frames with the 6-frame redundancy built by
// src/sim/netseats.js from the pure scripted input generator (sim/script.js)
// — walking, aiming at the nearest hostile, holding basic, pressing its four
// kit skills and dodge — steered back toward its party when it strays. So a
// host with three of these runs three moving, attacking human seats.
//
//   const g = createPlayingGuest({ server, name, seed, version });
//   await g.net.join(code); await g.net.setReady(true);  … g.stats(); g.stop();
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;
const { createNetClient } = await import(u('src/net/lobbyClient.js'));
const { createSnapshotClient } = await import(u('src/net/protocol/snapshot.js'));
const { encodeInputPacket, encodeCmd, decodeEvents, decodeEventsBundle } = await import(u('src/net/protocol/codec.js'));
const { BIN, SIM_HZ } = await import(u('src/net/protocol/constants.js'));
const { frameFromSnapshot } = await import(u('src/sim/netseats.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { VERSION } = await import(u('src/version.js'));

export function createPlayingGuest({ server, name = 'Player', seed = 5, version = VERSION, presses = true } = {}) {
  const net = createNetClient({ params: { net: server, netName: name }, version, autoStart: false, probeStream: false });
  const dec = createSnapshotClient();
  let seq = 0;
  let frames = [];
  let lastConsumed = null;
  let needFull = true;
  let latestTick = 0;
  let me = null;
  let target = null;
  let centroid = null;
  let away = false;
  let cut = false; // input stream cut (stale-input probe)
  const batches = new Set();
  const st = { snapshots: 0, full: 0, bytes: 0, hashChecks: 0, desyncs: 0, decodeErrors: 0, noBaseline: 0, eventBatches: 0, events: 0, framesSent: 0, packets: 0 };

  function onSnap(u8) {
    const r = dec.decode(u8);
    if (!r.ok) {
      if (r.error === 'no_baseline') st.noBaseline += 1;
      else st.decodeErrors += 1;
      needFull = true;
      return;
    }
    if (r.duplicate) return;
    st.snapshots += 1;
    st.bytes += r.bytes;
    if (r.full) {
      st.full += 1;
      needFull = false;
    }
    if (r.hash) st.hashChecks += 1;
    if (r.hashOk === false) {
      st.desyncs += 1;
      dec.reset();
      needFull = true;
      return;
    }
    if (r.lastInputSeqConsumed !== null && (lastConsumed === null || r.lastInputSeqConsumed > lastConsumed)) lastConsumed = r.lastInputSeqConsumed;
    if (r.tick <= latestTick) return;
    latestTick = r.tick;
    const ents = r.entities();
    const seat = net.seat;
    const mine = ents.find((e) => e.kind === 'ally' && e.partyIndex === seat);
    if (mine) me = { x: mine.x, z: mine.z, hp: mine.hp };
    let best = null;
    let bd = Infinity;
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const e of ents) {
      if ((e.kind === 'player' || e.kind === 'ally') && e.partyIndex !== seat) {
        cx += e.x;
        cz += e.z;
        n += 1;
      }
      if (e.faction !== 'hostile' || !(e.hp > 0) || !me) continue;
      const d = (e.x - me.x) ** 2 + (e.z - me.z) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    target = best ? { x: best.x, z: best.z, d: Math.sqrt(bd) } : null;
    centroid = n ? { x: cx / n, z: cz / n } : null;
  }

  net.setSessionDriver({
    onBinary(u8) {
      const ch = u8[0];
      try {
        if (ch === BIN.SNAP) onSnap(u8);
        else if (ch === BIN.EVENTS || ch === BIN.EVENTS_U) {
          const list = ch === BIN.EVENTS ? [decodeEvents(u8)] : decodeEventsBundle(u8);
          for (const b of list) {
            if (batches.has(b.batchSeq)) continue;
            batches.add(b.batchSeq);
            if (batches.size > 4000) batches.delete(batches.values().next().value);
            st.eventBatches += 1;
            st.events += b.events.length;
          }
        }
      } catch {
        st.decodeErrors += 1;
      }
    },
    onControl(m) {
      if (m.t === 'host_changed' || m.t === 'become_host') {
        dec.reset();
        needFull = true;
        lastConsumed = null;
        latestTick = 0;
      }
    },
  });

  let forced = null; // a fixed input (stale-input probe): { move: {x, z}, aim? }
  function sample() {
    if (forced) return { move: forced.move || { x: 0, z: 0 }, aim: forced.aim || (me ? { x: me.x + 1, z: me.z } : null), basicAttackHeld: false, reviveHeld: false, presses: [] };
    const s = scriptedInput(seed, seq, { skillSlots: 4, cx: me ? me.x : 0, cz: me ? me.z : 0, aimRadius: 2.4 });
    if (target && me) {
      s.aim = { x: target.x, z: target.z };
      if (target.d > 1.4 && Math.floor(seq / 120) % 3 !== 2) s.move = { x: (target.x - me.x) / target.d, z: (target.z - me.z) / target.d };
    } else if (centroid && me) {
      const d = Math.hypot(centroid.x - me.x, centroid.z - me.z);
      if (d > 2.5) s.move = { x: (centroid.x - me.x) / d, z: (centroid.z - me.z) / d };
    }
    if (!presses) s.presses = [];
    s.presses = s.presses.filter((p) => p.kind === 'dodge' || /^skill_[1-4]$/.test(p.kind));
    return s;
  }

  const timer = setInterval(() => {
    if (net.state !== 'guest' || net.transport.state !== 'open' || net.seat === null || cut) return;
    seq += 1;
    const f = frameFromSnapshot(away ? null : sample(), { seq, tick: seq, viewTick: Math.max(0, latestTick - 9), away });
    frames.push(f);
    frames = frames.filter((x) => lastConsumed === null || x.seq > lastConsumed).slice(-6);
    try {
      net.transport.sendBinary(encodeInputPacket(net.seat, needFull ? null : dec.ackSeq, frames));
      st.framesSent += 1;
      st.packets += 1;
    } catch {
      /* link down */
    }
  }, 1000 / SIM_HZ);

  return {
    kind: 'playing-bot',
    name,
    net,
    stats: () => ({ ...st, seat: net.seat, state: net.state, me, lastConsumed, latestTick, dec: dec.stats() }),
    setAway(v) {
      away = !!v;
    },
    setCut(v) {
      cut = !!v;
    },
    setForced(v) {
      forced = v || null;
    },
    requestFull() {
      needFull = true;
      try {
        net.transport.sendBinary(encodeCmd(net.seat ?? 0, 1, { kind: 'full', why: 'bot' }));
      } catch {
        /* ignore */
      }
    },
    stop() {
      clearInterval(timer);
      net.disconnect();
    },
  };
}
