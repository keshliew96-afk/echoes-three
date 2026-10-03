// Host session driver — the authoritative side of network play
// (docs/gauntlet/PLAN.md §3.7). Owner: M5b.
//
// The HOST browser runs the one authoritative sim. Per sim tick this driver
//   1. consumes ONE input frame per human seat from that seat's jitter buffer
//      (target depth 2; two frames when the buffer has grown past 4 — every
//      frame keeps its own movement step, sim/remote.js), repeats the last
//      HELD state for <= 8 ticks when a seat is starved (never presses), then
//      feeds neutral input (a starved seat's dash waits for its frames for
//      <= DASH_HOLD_TICKS); a frame lost beyond the 6-frame input redundancy
//      is consumed as a repeat and its presses, if it ever arrives, land on
//      the next tick (never dropped);
//   2. steps world.step(tick, playerSnapshot, seatInputs) — seat 0 is the
//      host's own input (or, after a migration, a remote human / the leader
//      bot); absent seats are played by the §12 ally AI;
// and at every tick END (clock.onTickEnd — PLAN §3.4 rule 6):
//   3. records the hostile rewind ring (lag compensation, net/lagcomp.js);
//   4. every 3rd tick captures the COMPLETE state (save.capture()) once and
//      sends each guest a baseline/ack delta snapshot (Quake 3 model,
//      src/net/protocol/snapshot.js) carrying the last input seq consumed for
//      that guest and its buffer depth, plus one reliable EVENTS batch with
//      every sim event since the previous batch (never `sound`);
//   5. every 120 ticks sends a KEYFRAME (the exact tree) to the server for
//      reconnect / host migration.
// Net work is timed per rendered frame (hostNetMs, frameOver50Net).
import { BIN, SNAPSHOT_EVERY_TICKS, KEYFRAME_EVERY_TICKS, SIM_HZ } from './protocol/constants.js';
import { createSnapshotHost, pct } from './protocol/snapshot.js';
import { decodeInputPacket, decodeCmd, encodeCmd, encodeEvents, encodeKeyframe, encodeEventsBundle, eventsBody, SEAT_ALL } from './protocol/codec.js';
import { seatInputOf, repeatFrame, neutralFrame, frameFromSnapshot, playerSnapshotOf, STALE_REPEAT_TICKS, DASH_HOLD_TICKS } from '../sim/netseats.js';
import { emptySnapshot } from '../core/intents.js';
import { createRewindRing } from './lagcomp.js';

export const TARGET_INPUT_DEPTH = 2;
const DRAIN_ABOVE = TARGET_INPUT_DEPTH + 2;
const FULL_GAP_MIN_MS = 100;
const FULL_GAP_MAX_MS = 600;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// onPlayerController(controller, tick) — called BEFORE the tick's world.step
// whenever who plays seat 0 changes on a host that is not seat 0 ('human' =
// a remote human's frames drive the Healer, 'ai' = nobody does: the leader
// bot). The session switches the leader bot with it, so the bot never
// overrides a human Healer's input (NET3-F1).
export function createHostDriver({ net, world, clock, bus, registry, capture, sampleLocal, localSeat = 0, snapEvery = SNAPSHOT_EVERY_TICKS, log = () => {}, onCmd = null, onPlayerController = null, onPartyCmd = null }) {
  const snap = createSnapshotHost();
  const ring = createRewindRing({ registry });
  const feeds = new Map(); // seat -> feed
  let mySeat = localSeat;
  let localSeq = 0;
  let batchSeq = 0;
  let evFrom = clock.tick;
  let pending = [];
  let lastKeyframeTick = -Infinity;
  let cmdSeq = 0;
  let migrateReasons = null; // one tick of 'migrate' reasons after become_host
  let playerController = 'human';
  let running = false;
  const stats = {
    snapshots: 0,
    keyframes: 0,
    keyframeBytes: 0,
    keyframeMs: [],
    eventBatches: 0,
    eventsSent: 0,
    captureErrors: 0,
    tickEndMs: [],
    frameNetMs: [],
    frameOver50Net: 0,
    staleRepeatTicksMax: 0,
    staleRepeats: 0,
    neutralTicks: 0,
    longStarves: 0, // starve runs that outlasted DASH_HOLD_TICKS (a held dash ran out)
    gapsFilled: 0,
    latePresses: 0,
    drains: 0,
    cmds: 0,
    rejected: 0,
    pings: 0,
  };
  let frameNet = 0; // net ms accumulated in the current rendered frame
  const ledger = [];
  const ledgerOrd = new Map();
  let prevBody = null; // the previous EVENTS batch body (EVENTS_U resend)
  const push = (arr, v, cap = 600) => {
    arr.push(v);
    if (arr.length > cap) arr.shift();
  };

  // ------------------------------------------------------------- feeds --
  function feedFor(seat) {
    let f = feeds.get(seat);
    if (!f) {
      f = {
        seat,
        link: snap.link(),
        buffer: new Map(),
        lastConsumed: null,
        lastFrame: null,
        missingRun: 0,
        carryBits: 0,
        carrySeqs: [],
        synthetic: new Set(),
        state: 'none', // none | human | away
        pendingReason: null,
        depthReport: 0,
        packets: 0,
        frames: 0,
        lastRecvAt: 0,
        recv: [],
        fullsRequested: 0,
        // Bumped whenever the feed's seq line restarts (reset / rejoin): a
        // snapshot queued before it never carries the old line's k.
        gen: 0,
      };
      feeds.set(seat, f);
    }
    return f;
  }
  function resetFeed(seat, reason) {
    const f = feeds.get(seat);
    if (!f) return;
    f.buffer.clear();
    f.lastConsumed = null;
    f.gen += 1;
    f.lastFrame = null;
    f.missingRun = 0;
    f.carryBits = 0;
    f.carrySeqs = [];
    f.synthetic.clear();
    f.link.acked = 0;
    if (f.state === 'human') f.pendingReason = reason;
    f.state = 'none';
  }

  function onInput(u8) {
    const p = decodeInputPacket(u8);
    const f = feedFor(p.seat);
    f.packets += 1;
    f.lastRecvAt = now();
    if (p.ackSnapSeq === null) {
      if (f.link.acked) f.fullsRequested += 1;
      f.link.acked = 0;
    } else snap.ack(f.link, p.ackSnapSeq);
    for (const fr of p.frames) {
      if (f.lastConsumed !== null && fr.seq <= f.lastConsumed) {
        // Late: already consumed (as a repeat when it went missing). Its
        // presses land on the next tick, exactly once.
        if (fr.press && f.synthetic.has(fr.seq)) {
          f.carryBits |= fr.press;
          f.carrySeqs.push({ bits: fr.press, seq: fr.seq });
          f.synthetic.delete(fr.seq);
          stats.latePresses += 1;
        }
        continue;
      }
      if (!f.buffer.has(fr.seq)) {
        f.buffer.set(fr.seq, fr);
        f.frames += 1;
      }
    }
    const newest = p.frames.length ? p.frames[p.frames.length - 1].seq : null;
    if (newest !== null) {
      f.recv.push({ at: now(), seq: newest });
      while (f.recv.length && now() - f.recv[0].at > 10000) f.recv.shift();
    }
  }

  // consume(feed) -> SeatInput | 'away' | null (no input yet)
  const staleLog = []; // { seat, startTick, neutralTick, endTick } (probes, last 40)
  function consume(f, tick = 0) {
    if (f.lastConsumed === null) {
      if (f.buffer.size === 0) return null;
      f.lastConsumed = Math.min(...f.buffer.keys()) - 1;
    }
    const depth = f.buffer.size;
    let frames = [];
    const next = f.lastConsumed + 1;
    if (f.buffer.has(next)) {
      const take = depth > DRAIN_ABOVE ? 2 : 1;
      if (take > 1) stats.drains += 1;
      for (let k = 0; k < take; k++) {
        const fr = f.buffer.get(f.lastConsumed + 1);
        if (!fr) break;
        f.buffer.delete(fr.seq);
        f.lastConsumed = fr.seq;
        frames.push(fr);
      }
      f.lastFrame = frames[frames.length - 1];
      if (f.missingRun > 0) {
        const e = staleLog.findLast((x) => x.seat === f.seat);
        if (e && e.endTick === null) e.endTick = tick;
      }
      f.missingRun = 0;
    } else if (depth > 0) {
      // A gap: `next` was lost beyond the input redundancy. Consume it as a
      // repeat of the held state so the seq line stays whole.
      const base = f.lastFrame || { ...[...f.buffer.values()][0], press: 0 };
      frames = [repeatFrame(base, next)];
      f.synthetic.add(next);
      if (f.synthetic.size > 64) f.synthetic.delete(f.synthetic.values().next().value);
      f.lastConsumed = next;
      f.lastFrame = frames[0];
      stats.gapsFilled += 1;
    } else {
      // Starved (nothing buffered): repeat the HELD state <= 8 ticks, then
      // neutral; no seq is consumed — the real frames still land in order.
      if (!f.lastFrame) return null;
      f.missingRun += 1;
      if (f.missingRun === 1) {
        staleLog.push({ seat: f.seat, startTick: tick, neutralTick: null, endTick: null });
        if (staleLog.length > 40) staleLog.shift();
      } else if (f.missingRun === STALE_REPEAT_TICKS + 1) {
        const e = staleLog.findLast((x) => x.seat === f.seat);
        if (e && e.neutralTick === null) e.neutralTick = tick;
      }
      if (f.missingRun > stats.staleRepeatTicksMax && f.missingRun <= STALE_REPEAT_TICKS) stats.staleRepeatTicksMax = f.missingRun;
      if (f.lastFrame.away) return 'away';
      const fr = f.missingRun <= STALE_REPEAT_TICKS ? repeatFrame(f.lastFrame, f.lastConsumed) : neutralFrame(f.lastFrame, f.lastConsumed);
      // A starved tick consumes no input frame: the seat's dash waits for the
      // frames that carry it (sim/allies.js humanContinuous) through the
      // repeat window AND the neutral ticks after it, up to DASH_HOLD_TICKS,
      // so the state a snapshot reports at k is the dash after exactly frames
      // <= k across a guest stall of up to 0.5 s (NET3-F2). A longer silence
      // runs the dash out on the neutral frames.
      if (f.missingRun <= DASH_HOLD_TICKS) fr.starved = true;
      if (f.missingRun === DASH_HOLD_TICKS + 1) stats.longStarves += 1;
      if (f.missingRun <= STALE_REPEAT_TICKS) stats.staleRepeats += 1;
      else stats.neutralTicks += 1;
      frames = [fr];
    }
    f.depthReport = f.buffer.size;
    const last = frames[frames.length - 1];
    if (last.away) return 'away';
    const bits = f.carryBits;
    const cs = f.carrySeqs;
    f.carryBits = 0;
    f.carrySeqs = [];
    return seatInputOf(frames, bits, cs);
  }

  // ------------------------------------------------------------- step --
  function connectedGuestSeats() {
    const room = net.room;
    if (!room) return [];
    return room.seats.filter((s) => s.peerId && s.connected && s.peerId !== net.peerId);
  }

  function step(tick) {
    const local = sampleLocal();
    const si = { seats: {}, reasons: {}, player: 'human', rewind: (vt) => ring.query(vt) };
    let playerSnap = null;
    if (mySeat === 0) playerSnap = local;
    else {
      localSeq += 1;
      si.seats[mySeat] = seatInputOf([frameFromSnapshot(local, { seq: localSeq, tick })]);
    }
    const live = new Set(connectedGuestSeats().map((s) => s.index));
    for (const [seat, f] of feeds) {
      if (seat === mySeat) continue;
      let inp = live.has(seat) ? consume(f, tick) : null;
      if (inp === 'away') {
        if (f.state === 'human') si.reasons[seat] = 'away';
        f.state = 'away';
        inp = null;
      } else if (inp) {
        if (f.state !== 'human') si.reasons[seat] = f.state === 'away' || f.pendingReason === 'drop' ? 'return' : 'join';
        f.state = 'human';
        f.pendingReason = null;
      } else if (f.state === 'human') {
        si.reasons[seat] = 'drop';
        f.state = 'none';
      } else if (f.pendingReason) {
        si.reasons[seat] = f.pendingReason;
        f.pendingReason = null;
      }
      if (!inp) continue;
      if (seat === 0) playerSnap = playerSnapshotOf(inp);
      else si.seats[seat] = inp;
    }
    if (!playerSnap) {
      // No human on the Healer (after a migration): the leader bot plays it
      // (M4a's autopilot replaces this empty snapshot inside world.step).
      playerSnap = emptySnapshot();
      si.player = 'ai';
    }
    if (si.player !== playerController && mySeat !== 0 && typeof onPlayerController === 'function') {
      try {
        onPlayerController(si.player, tick);
      } catch (err) {
        log('player_controller_error', { error: String(err && err.message) });
      }
    }
    playerController = si.player;
    if (migrateReasons) {
      for (let i = 0; i < 4; i++) if (!si.reasons[i]) si.reasons[i] = 'migrate';
      migrateReasons = null;
    }
    world.step(tick, playerSnap, si);
  }

  // ---------------------------------------------------------- tick end --
  let offTickEnd = null;
  let offBus = null;
  // Snapshot encodes are SPREAD across the ticks between snapshots: the state
  // is captured once (§3.7 "capture once per snapshot tick, shared by all
  // guests"), the first guest's delta is encoded and sent on that tick, and
  // the remaining guests get theirs on the following ticks from the SAME
  // capture (16-33 ms staler, far inside the interpolation delay). So a host
  // with three guests never does three encodes in one frame — the per-frame
  // net budget (hostNetMsP95 <= 2 ms, G5b.9) holds as guests are added.
  let encodeQueue = []; // [{ rec, seat }]
  // Upstream loss of one guest's input packets over the last 5 s (gaps in
  // the newest frame seq per packet; null until 20 seqs are spanned) —
  // echoed to that guest in its snapshot header so its chip can show it
  // (NET-F2, fix-M5a-r1; snapshot.js flags bits 0-6). Cached 500 ms.
  // -> { pct, got, expected } (cached per feed).
  function feedLoss(f) {
    const t = now();
    if (f.lossCache && t - f.lossCache.at < 500) return f.lossCache;
    const win = [];
    for (let i = f.recv.length - 1; i >= 0 && t - f.recv[i].at <= 5000; i--) win.push(f.recv[i].seq);
    win.sort((a, b) => b - a);
    // A jump of more than 1 s of frames between neighbouring seqs is a
    // reconnect / a guest that was not sending, not loss in transit: the
    // window starts after it.
    let lo = win.length ? win[0] : Infinity;
    const hi = lo;
    for (let i = 1; i < win.length && win[i - 1] - win[i] <= LOSS_SEGMENT_GAP; i++) lo = win[i];
    // Received = any seq in [lo, hi] still in the 10 s ring: a packet that
    // arrived just before the window but belongs inside it (reordered by
    // jitter) is not counted as lost.
    const seen = new Set();
    if (win.length >= 2) for (const x of f.recv) if (x.seq >= lo && x.seq <= hi) seen.add(x.seq);
    const expected = win.length ? hi - lo + 1 : 0;
    const pct = seen.size >= 2 && expected >= 20 ? Math.max(0, Math.round((1 - seen.size / expected) * 1000) / 10) : null;
    f.lossCache = { at: t, pct, got: pct === null ? 0 : seen.size, expected: pct === null ? 0 : expected };
    return f.lossCache;
  }
  const LOSS_SEGMENT_GAP = 60;
  const feedLossPct = (f) => feedLoss(f).pct;
  // lastInputSeqConsumed is the seat's k AT THE CAPTURE (NET3-F2): the
  // state in `rec` is the world after consuming exactly the frames <= k. A
  // snapshot served on a later tick (the encode queue below) must not carry
  // the send tick's k — the guest would drop the 1-2 frames consumed in
  // between from its replay (a dodge press among them rewound the body to
  // the pre-dodge spot: 1.8 u snaps, the 2nd / 3rd guest far more often).
  // Paced fulls (snapshot.js, fix-M5a-r4 NET4-F3): a link waiting for the ack
  // of a full gets deltas against that full, and a new full only after the
  // round trip host -> server -> guest -> server -> host (+ 50 ms), 100-600 ms.
  function seatRttMs(seat) {
    const room = net.room;
    const s = room && room.seats ? room.seats.find((x) => x.index === seat) : null;
    return s && Number.isFinite(s.rttMs) ? s.rttMs : null;
  }
  function fullGapMs(seat) {
    const g = seatRttMs(seat);
    const h = seatRttMs(mySeat);
    return Math.max(FULL_GAP_MIN_MS, Math.min(FULL_GAP_MAX_MS, (g === null ? 150 : g) + (h === null ? 0 : h) + 50));
  }
  function sendSnapshotTo(rec, seat, k) {
    const f = feedFor(seat);
    net.transport.sendBinary(snap.encodeFor(f.link, rec, { seat, lastInputSeqConsumed: k, inputBufferDepth: f.depthReport, upLossPct: feedLossPct(f), fullGapMs: fullGapMs(seat) }));
  }
  function tickEnd(tick) {
    const t0 = now();
    ring.record(tick);
    if (tick % snapEvery !== 0) {
      let encoded = false;
      if (encodeQueue.length && net.transport.state === 'open') {
        const q = encodeQueue.shift();
        encoded = true;
        try {
          // A feed restarted since the capture skips this one (the next
          // capture serves it, <= 3 ticks later).
          if (feedFor(q.seat).gen === q.gen) sendSnapshotTo(q.rec, q.seat, q.k);
        } catch (err) {
          log('host_encode_error', { error: String(err && err.message) });
        }
      }
      const dt = now() - t0;
      if (encoded) push(stats.tickEndMs, dt); // tickEndMs = ticks that did net work
      frameNet += dt;
      return;
    }
    const guests = connectedGuestSeats();
    if (!guests.length || net.transport.state !== 'open') {
      pending = [];
      evFrom = tick;
      // Nobody received the batches of this gap: a guest joining later must
      // never get an old batch as its first (its delivery clock would wait
      // for the batches in between forever).
      prevBody = null;
      frameNet += now() - t0;
      return;
    }
    let tree;
    try {
      tree = capture();
    } catch (err) {
      stats.captureErrors += 1;
      if (stats.captureErrors <= 3) log('host_capture_error', { error: String(err && err.message) });
      frameNet += now() - t0;
      return;
    }
    const rec = snap.capture(tick, tree, { clone: false });
    // A guest still queued from the previous snapshot is served from the
    // newer capture instead (never two snapshots behind).
    encodeQueue = [];
    sendSnapshotTo(rec, guests[0].index, feedFor(guests[0].index).lastConsumed);
    for (let i = 1; i < guests.length; i++) {
      const f = feedFor(guests[i].index);
      encodeQueue.push({ rec, seat: guests[i].index, k: f.lastConsumed, gen: f.gen });
    }
    stats.snapshots += 1;
    // One EVENTS batch per snapshot (an empty one too: it keeps the guests'
    // "events delivered through tick" clock moving — prediction retractions
    // wait on it), reliable; then the PREVIOUS batch again, unreliable
    // (EVENTS_U) — a batch whose reliable copy sits in a retransmit still
    // reaches the guest one snapshot later, ahead of its render clock (the
    // interpolation delay is >= 2 snapshot intervals). One copy, 50 ms after
    // the reliable one, also outlives a short burst that took both copies
    // sent together. fix-M5a-r4 NET4-F3: v2 resent the newest TWO batches
    // (the current one twice in the same instant) — 3 copies of every event,
    // 26-29 % of a guest's downstream in Levels 2-3, over the §3.7 budget.
    const evFrame = encodeEvents(SEAT_ALL, ++batchSeq, evFrom, tick, pending);
    net.transport.sendBinary(evFrame);
    stats.eventBatches += 1;
    stats.eventsSent += pending.length;
    pending = [];
    if (prevBody) net.transport.sendBinary(encodeEventsBundle(SEAT_ALL, [prevBody]));
    prevBody = eventsBody(evFrame).slice();
    evFrom = tick;
    if (tick - lastKeyframeTick >= KEYFRAME_EVERY_TICKS) {
      lastKeyframeTick = tick;
      const k0 = now();
      try {
        const kf = encodeKeyframe(tick, tree);
        net.transport.sendBinary(kf);
        stats.keyframes += 1;
        stats.keyframeBytes = kf.length;
      } catch (err) {
        log('keyframe_error', { error: String(err && err.message) });
      }
      push(stats.keyframeMs, now() - k0, 60);
    }
    const dt = now() - t0;
    push(stats.tickEndMs, dt);
    frameNet += dt;
  }

  // Frame accounting (called once per rendered frame by the session).
  function frameEnd(frameMs) {
    push(stats.frameNetMs, frameNet);
    if (frameMs > 50 && frameNet > 10) stats.frameOver50Net += 1;
    frameNet = 0;
  }

  // ----------------------------------------------------------- binary --
  function onBinary(u8) {
    const t0 = now();
    try {
      if (u8[0] === BIN.INPUT) onInput(u8);
      else if (u8[0] === BIN.CMD) onGuestCmd(decodeCmd(u8));
    } catch (err) {
      log('host_decode_error', { error: String(err && err.message) });
    }
    frameNet += now() - t0;
  }

  function sendCmd(seat, cmd) {
    cmdSeq += 1;
    net.transport.sendBinary(encodeCmd(seat, cmdSeq, cmd));
  }

  // CAMPAIGN (PLAN §12.9): each guest's "I can draw level N" report.
  const levelReadyBySeat = new Map();
  function onGuestCmd(c) {
    stats.cmds += 1;
    const cmd = c.cmd || {};
    if (cmd.kind === 'level_ready') {
      levelReadyBySeat.set(c.seat, { level: Number(cmd.level) || 0, ready: !!cmd.ready, tick: clock.tick });
      return;
    }
    if (cmd.kind === 'full') {
      const f = feedFor(c.seat);
      f.link.acked = 0;
      f.fullsRequested += 1;
      return;
    }
    if (cmd.kind === 'ping') {
      stats.pings += 1;
      const ping = { kind: 'ping', seat: c.seat, page: cmd.page ?? null, index: cmd.index ?? null, at: clock.tick };
      sendCmd(SEAT_ALL, ping);
      if (onCmd) onCmd(ping);
      return;
    }
    if (cmd.kind === 'party') {
      // PARTY (PLAN §16.5, BUILD_BRIEF §25.7): a guest's OWN-seat build
      // decision (page card, shelf, Done, sockets, slot order, its "Socket my
      // new nodes" setting). The session validates ownership (seat ===
      // sender's seat, the seat human-held), the phase and combat_active,
      // then calls the same sim entry point single-player uses; anything
      // else is answered command_rejected and changes nothing.
      stats.partyCmds = (stats.partyCmds || 0) + 1;
      let r = null;
      try {
        r = onPartyCmd ? onPartyCmd(c) : { reason: 'unsupported' };
      } catch (err) {
        r = { reason: 'error' };
        log('party_cmd_error', { error: String(err && err.message) });
      }
      if (r && r.reason) {
        stats.rejected += 1;
        sendCmd(c.seat, { kind: 'command_rejected', re: c.cmdSeq, what: cmd.op ?? null, seat: Number.isInteger(cmd.seat) ? cmd.seat : null, reason: r.reason });
      } else {
        // fix-M5b-r6 (NET6-F1): applied — the ack names the host tick, so
        // the guest's party shadow retires its prediction once the replica
        // state it shows is past that tick (it then carries the change).
        stats.partyAcks = (stats.partyAcks || 0) + 1;
        sendCmd(c.seat, { kind: 'party_ack', re: c.cmdSeq, what: cmd.op ?? null, tick: clock.tick });
      }
      return;
    }
    if (cmd.kind === 'pick') {
      // Build decisions belong to the host (PLAN §3.7): a guest's pick is
      // answered command_rejected and shown to everyone as a ping.
      stats.rejected += 1;
      sendCmd(c.seat, { kind: 'command_rejected', re: c.cmdSeq, what: cmd.what ?? null, reason: 'host_decides' });
      const ping = { kind: 'ping', seat: c.seat, page: cmd.page ?? null, index: cmd.index ?? null, at: clock.tick };
      sendCmd(SEAT_ALL, ping);
      if (onCmd) onCmd(ping);
    }
  }

  function onControl(m) {
    if (m.t === 'peer_dropped' || m.t === 'peer_left') {
      encodeQueue = encodeQueue.filter((q) => q.seat !== m.seat);
      resetFeed(m.seat, 'drop');
    } else if (m.t === 'peer_joined' || m.t === 'peer_restored') {
      const f = feeds.get(m.seat);
      if (f) {
        f.buffer.clear();
        f.lastConsumed = null;
        f.gen += 1;
        f.link.acked = 0;
      }
    }
  }

  function start({ migrated = false } = {}) {
    if (running) return;
    running = true;
    evFrom = clock.tick;
    pending = [];
    offTickEnd = clock.onTickEnd((tick) => {
      try {
        tickEnd(tick);
      } catch (err) {
        stats.captureErrors += 1;
        if (stats.captureErrors <= 5) log('host_tick_end_error', { error: String(err && err.message) });
      }
    });
    offBus = bus.on('*', (ev) => {
      if (ev.type === 'sound' || ev.predicted || ev.view) return;
      pending.push(ev);
      if (pending.length > 4000) pending.shift();
      // Exactly-once audit (G5b.14): every sent event by (tick, type,
      // ordinal-in-tick) — guests key their replays the same way.
      const ord = ledgerOrd.get(ev.tick) || 0;
      ledgerOrd.set(ev.tick, ord + 1);
      if (ledgerOrd.size > 600) ledgerOrd.delete(ledgerOrd.keys().next().value);
      ledger.push(`${ev.tick}|${ev.type}|${ord}`);
      if (ledger.length > 60000) ledger.splice(0, 10000);
    });
    if (migrated) migrateReasons = true;
    log('host_driver_started', { seat: mySeat, migrated });
  }
  function stop() {
    if (!running) return;
    running = false;
    encodeQueue = [];
    if (offTickEnd) offTickEnd();
    if (offBus) offBus();
    offTickEnd = null;
    offBus = null;
    log('host_driver_stopped', {});
  }

  function hostStats() {
    const sh = snap.stats();
    const depths = [...feeds.values()].filter((f) => f.state === 'human').map((f) => f.depthReport);
    const lag = world.cmd('netSeats') || {};
    const rs = ring.stats();
    // Input-packet loss over every guest (the same 5 s reconnect-aware window
    // as the per-seat echo, NET-F2 fix-M5a-r1; was 10 s over the raw ring, so
    // a guest's reconnect gap read as ~20 % loss for 10 s).
    let got = 0;
    let expected = 0;
    for (const f of feeds.values()) {
      const L = feedLoss(f);
      got += L.got;
      expected += L.expected;
    }
    return {
      hostNetMsP50: pct(stats.frameNetMs, 0.5),
      hostNetMsP95: pct(stats.frameNetMs, 0.95),
      hostNetMsMax: stats.frameNetMs.length ? Math.max(...stats.frameNetMs) : null,
      tickEndMsP95: pct(stats.tickEndMs, 0.95),
      keyframeMsP95: pct(stats.keyframeMs, 0.95),
      keyframeBytes: stats.keyframeBytes,
      frameOver50Net: stats.frameOver50Net,
      captureMsP95: sh.captureMsP95,
      encodeMsP95: sh.encodeMsP95,
      snapshotBytesAvg: sh.fullCount + sh.deltaCount ? Math.round(((sh.fullBytes + sh.deltaBytes) / (sh.fullCount + sh.deltaCount)) * 10) / 10 : null,
      fullBytesAvg: sh.fullAvg ? Math.round(sh.fullAvg * 10) / 10 : null,
      deltaBytesAvg: sh.deltaAvg ? Math.round(sh.deltaAvg * 10) / 10 : null,
      deltaRatio: sh.fullAvg && sh.deltaAvg ? Math.round((sh.deltaAvg / sh.fullAvg) * 1000) / 1000 : null,
      fullSnapshots: sh.fullCount,
      // PARTY (GP.10 bandwidth probe): the average delta body split.
      deltaHotAvg: Math.round((sh.deltaHotAvg || 0) * 10) / 10,
      deltaColdAvg: Math.round((sh.deltaColdAvg || 0) * 10) / 10,
      deltaChangedAvg: Math.round((sh.deltaChangedAvg || 0) * 10) / 10,
      moverAnchors: sh.anchors,
      pacedDeltas: sh.pacedDeltas,
      snapshotsSent: stats.snapshots,
      eventBatches: stats.eventBatches,
      eventsSent: stats.eventsSent,
      inputBufferDepth: depths.length ? Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 100) / 100 : null,
      staleRepeatTicksMax: stats.staleRepeatTicksMax,
      staleLog: staleLog.slice(-40),
      staleRepeats: stats.staleRepeats,
      neutralTicks: stats.neutralTicks,
      longStarves: stats.longStarves,
      gapsFilled: stats.gapsFilled,
      latePresses: stats.latePresses,
      drains: stats.drains,
      awaySeats: [...feeds.values()].filter((f) => f.state === 'away').map((f) => f.seat),
      humanSeats: [...feeds.values()].filter((f) => f.state === 'human').map((f) => f.seat),
      rewindTicksAvg: rs.avgTicks,
      rewinds: rs.rewound,
      rewindClamped: rs.clamped,
      rewindWantedP50: rs.wantedP50,
      rewindWantedP95: rs.wantedP95,
      rewindMaxTicks: rs.maxRewind,
      lagCompHits: lag.lag ? lag.lag.compHits : null,
      lagCompSelections: lag.lag ? lag.lag.selections : null,
      lagCompOn: ring.enabled,
      playerController,
      lossPct: expected ? Math.max(0, Math.round((1 - got / expected) * 1000) / 10) : 0,
      lossBySeat: Object.fromEntries([...feeds.values()].map((f) => [f.seat, feedLossPct(f)])),
      cmds: stats.cmds,
      rejectedPicks: stats.rejected,
      pings: stats.pings,
      captureErrors: stats.captureErrors,
      fullsRequested: [...feeds.values()].reduce((s, f) => s + f.fullsRequested, 0),
    };
  }

  return {
    role: 'host',
    step,
    levelReady: (seat) => levelReadyBySeat.get(seat) ?? null, // CAMPAIGN (PLAN §12.9)
    onBinary,
    onControl,
    start,
    stop,
    frameEnd,
    stats: hostStats,
    feeds,
    ring,
    sendCmd,
    ledger: () => ledger.slice(),
    get mySeat() {
      return mySeat;
    },
    setMySeat(s) {
      mySeat = s;
    },
    // Measurement window restart (probes): per-frame net timing and the
    // stale-input counters.
    resetStats() {
      stats.frameNetMs.length = 0;
      stats.tickEndMs.length = 0;
      stats.frameOver50Net = 0;
      stats.staleRepeatTicksMax = 0;
      stats.staleRepeats = 0;
      stats.neutralTicks = 0;
      stats.longStarves = 0;
    },
    setLagCompensation(on) {
      ring.setEnabled(on);
      world.cmd('lagCompensation', !!on);
      return ring.enabled;
    },
    setSnapshotEvery(n) {
      snapEvery = Math.max(1, n | 0);
    },
    get snapEvery() {
      return snapEvery;
    },
    get running() {
      return running;
    },
    SIM_HZ,
  };
}
