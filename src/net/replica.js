// Guest replica (docs/gauntlet/PLAN.md §3.7 "Replica bus" + "Interpolation").
// Owner: M5b.
//
// A guest's world is the boot world switched into replica mode: it is NEVER
// stepped; its registry and every system are written only here, from the
// decoded snapshot view trees (registry.restore — host ids verbatim,
// nextOrdinal from the host — then world.loadState + the module states),
// and host events reach PRESENTATION listeners only, through bus.replay().
//
// Timing. Snapshots are buffered by host tick; the render clock (net/
// interp.js) runs interpDelay behind the freshest data. When the render tick
// reaches snapshot A's tick, A becomes the replica's state:
//   pass 1 — every buffered event of (lastApplied, A] of despawn/death class
//            (death, *_despawn, broken, downed) and every event whose payload
//            references an entity id absent from A's state, in host order,
//            BEFORE the apply (the entity still exists — a handler that looks
//            it up finds it);
//   apply  — A's state;
//   pass 2 — every remaining event of (lastApplied, A], in host order.
// Between A and the next snapshot B every replicated body is placed at the
// lerp A→B for the render tick, written as px/pz (a tick behind) and x/z so
// every existing render layer interpolates unchanged with the frame alpha.
// No B yet: linear movers keep flying, everything else extrapolates from
// its last velocity for <= 100 ms (6 ticks) and then holds.
//
// Visual error smoothing (Unreal "simulated proxy" smoothing / Overwatch
// remote-entity blend): the raw interpolated path can be DISCONTINUOUS — an
// extrapolation corrected when the late snapshot lands, a hold released, a
// reordered snapshot slotting in between A and B. The part of a frame's
// displacement the path's own velocity cannot explain becomes a per-entity
// offset (rendered = path + offset) that decays with τ = 100 ms and moves the
// body at most 0.1 u per rendered frame, so a remote body never pops; an
// authoritative teleport is drawn as the cut it is, and an offset past the
// snap threshold below (4 u for a party body) snaps instead of smoothing.
//
// The guest's OWN seat body is skipped here (net/reconcile.js predicts it).
// Events a guest must not present twice (its own confirmed predictions) are
// filtered by the `suppress(ev)` hook; host-local feedback (`intent_denied`
// — the Healer's HUD nudge + deny beep) is never replayed on a guest.
const DEATH_CLASS = (t) => t === 'death' || t === 'broken' || t === 'downed' || t.endsWith('_despawn');
const HOST_LOCAL = new Set(['intent_denied']);
const EXTRAPOLATE_MAX_TICKS = 6; // 100 ms
// A move this big between two snapshots is a TELEPORT: an authoritative cut,
// never lerped and never smoothed (party bodies are re-seated at room / camp
// boundaries, moles burrow). The bound GROWS with the gap between the two
// snapshots — a lost run of snapshots legitimately covers more ground (walk
// 0.045 u/tick, dash 0.12 u/tick, a charge more).
const TELEPORT_PARTY_U = 1.0; // + the per-tick allowance below
const TELEPORT_U = 3;
const TELEPORT_PER_TICK_U = 0.2;
const TELEPORT_SPAN_CAP_U = 1.0; // the gap allowance never grows past this
const teleportBound = (party, spanTicks) => (party ? TELEPORT_PARTY_U : TELEPORT_U) + Math.min(TELEPORT_SPAN_CAP_U, TELEPORT_PER_TICK_U * Math.max(0, spanTicks));
// Events that RE-SEAT the party (a room / run boundary, a restored save):
// the bodies cut to new places, so the smoothing and smoothness history is
// dropped on them instead of being smoothed or counted as a pop.
const SEAT_CUT_EVENTS = new Set(['room_start', 'room_enter', 'run_start', 'run_wiped', 'state_restored', 'return_to_camp', 'layout_enter']);
const SMOOTH_TAU_TICKS = 6; // 100 ms (CORRECTION_TAU_MS) in host ticks
const SMOOTH_MAX_STEP_U = 0.1; // per rendered frame (small errors)
// A big error (a lost run of snapshots) is caught up faster, but always
// under the 0.3 u "visible pop" bar the gates use.
const SMOOTH_MAX_STEP_BIG_U = 0.2;
const SMOOTH_BIG_U = 1.0;
const SMOOTH_EPS_U = 0.02; // path discontinuities below this are drawn as they are
// A visual error bigger than this snaps instead of smoothing. It sits far
// above the own-seat threshold (CORRECTION_SNAP_U 1.0): a remote body that
// stood still through a lost run of snapshots and then reappears 1-3 u along
// its path reads as fast walking while the offset decays (<= 0.2 u/frame,
// always under the 0.3 u pop bar) — a snap would not.
const SMOOTH_SNAP_PARTY_U = 4;
const SMOOTH_SNAP_U = 6;
// Render-clock ticks without new data past which a frame is a STALL frame
// (extrapolate 6 + hold): 12 ticks = 200 ms, i.e. four lost snapshots in a row.
const STALL_TICKS = 12;

export function createReplica({ world, registry, bus, scene, restoreShapes, restoreMovement, log = () => {} }) {
  const snaps = []; // ascending tick: { seq, tick, view, ents: Map(id -> ent), arrival }
  let applied = null;
  let prevApplied = null;
  let appliedTick = -1;
  let firstTick = null;
  let ownId = null;
  let suppress = null;
  const leads = new Map(); // own-seat mover id -> lead ticks (predicted-bolt handoff)
  const eventQ = []; // { ev, key }
  const seen = new Set(); // event keys (batchSeq:index) already queued
  let lastScene = { mode: null, layout: '' };
  let resyncs = 0;
  const stats = {
    applied: 0,
    applyErrors: 0,
    applyMs: [],
    eventsReplayed: 0,
    eventsSuppressed: 0,
    eventsHostLocal: 0,
    eventsLate: 0,
    eventsDropped: 0,
    duplicates: 0,
    pass1: 0,
    pass2: 0,
    extrapolatedFrames: 0,
    heldFrames: 0,
    frames: 0,
    remoteJumpMax: 0,
    remoteJumps03: 0,
    remoteJumps06: 0,
    remoteFrames: 0,
    remoteStepMax: 0,
    hostileJumpMax: 0,
    hostileJumps03: 0,
    hostileFrames: 0,
    smoothed: 0,
    smoothedMaxU: 0,
    smoothSnaps: 0,
    teleports: 0,
    teleportFrames: 0,
    stallFrames: 0,
    clockFrames: 0,
    orderViolations: 0,
    batchesIn: 0,
    batchGaps: 0,
  };
  const lastRender = new Map(); // party body id -> { x, z } (jump metric)
  let lastBatch = 0;
  const replayedKeys = []; // ring of recently replayed event identities (exactly-once audit)
  const replayLedger = new Map(); // `${tick}|${type}|${ordinalInTick}` -> count (G5b.14 audit, bounded)

  const push = (arr, v, cap = 600) => {
    arr.push(v);
    if (arr.length > cap) arr.shift();
  };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function entsOf(view) {
    const m = new Map();
    const list = view && view.registry && Array.isArray(view.registry.entities) ? view.registry.entities : [];
    for (const e of list) {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
      const mover = Number.isFinite(e.vx) && Number.isFinite(e.vz) && Number.isFinite(e.traveled) && Number.isFinite(e.range);
      m.set(e.id, { x: e.x, z: e.z, vx: mover ? e.vx : 0, vz: mover ? e.vz : 0, mover, party: e.partyIndex !== undefined, sourceId: e.sourceId ?? null });
    }
    return m;
  }

  // pushSnapshot(tick, seq, view) — a decoded snapshot (view = a private
  // plain tree). Returns false for a stale / duplicate tick.
  function pushSnapshot(tick, seq, view) {
    if (applied && tick <= appliedTick) return false;
    for (const s of snaps) if (s.tick === tick) return false;
    const list = view && view.registry && Array.isArray(view.registry.entities) ? view.registry.entities : [];
    const rec = { seq, tick, view, ents: entsOf(view), ids: new Set(list.map((e) => e.id)), arrival: now() };
    let i = snaps.length;
    while (i > 0 && snaps[i - 1].tick > tick) i--;
    snaps.splice(i, 0, rec);
    while (snaps.length > 48) snaps.shift();
    return true;
  }

  // pushEvents(batch) — a decoded EVENTS batch (reliable, in order).
  function pushEvents(b) {
    stats.batchesIn += 1;
    lastBatch = b.batchSeq;
    for (let i = 0; i < b.events.length; i++) {
      const ev = b.events[i];
      const key = `${b.batchSeq}:${i}`;
      if (seen.has(key)) {
        stats.duplicates += 1;
        continue;
      }
      seen.add(key);
      if (seen.size > 20000) seen.delete(seen.values().next().value);
      // Host order within a tick (batches arrive in host order): the
      // exactly-once ledger keys events by (tick, type, ordinal-in-tick).
      const ord = hostOrd.get(ev.tick) || 0;
      hostOrd.set(ev.tick, ord + 1);
      if (hostOrd.size > 600) hostOrd.delete(hostOrd.keys().next().value);
      if (firstTick !== null && ev.tick <= firstTick && !applied) continue;
      if (applied && ev.tick <= appliedTick) {
        // Late (a reliable retransmit behind the render clock): present it
        // now, once — its state is already in the replica.
        stats.eventsLate += 1;
        deliver(ev, ord);
        continue;
      }
      eventQ.push({ ev, key, ord });
    }
    if (eventQ.length > 6000) {
      stats.eventsDropped += eventQ.length - 6000;
      eventQ.splice(0, eventQ.length - 6000);
    }
  }

  const hostOrd = new Map(); // tick -> next host ordinal
  function deliver(ev, ord) {
    const k = `${ev.tick}|${ev.type}|${ord}`;
    const c = replayLedger.get(k) || 0;
    replayLedger.set(k, c + 1);
    if (c > 0) stats.duplicates += 1;
    if (replayLedger.size > 40000) replayLedger.delete(replayLedger.keys().next().value);
    if (HOST_LOCAL.has(ev.type)) {
      stats.eventsHostLocal += 1;
      return;
    }
    if (suppress && suppress(ev)) {
      stats.eventsSuppressed += 1;
      return;
    }
    stats.eventsReplayed += 1;
    if (SEAT_CUT_EVENTS.has(ev.type)) lastRender.clear();
    push(replayedKeys, k, 200);
    try {
      bus.replay(ev);
    } catch (err) {
      log('replay_listener_error', { type: ev.type, error: String(err && err.message) });
    }
  }

  function applyState(rec) {
    const t0 = now();
    const view = rec.view;
    const sc = view.scene || {};
    const lk = sc.layout ? `${sc.layout.act ?? ''}:${sc.layout.layoutId ?? ''}` : '';
    if (sc.mode && (sc.mode !== lastScene.mode || lk !== lastScene.layout)) {
      try {
        if (scene && typeof scene.cmd === 'function') scene.cmd('restoreScene', [{ mode: sc.mode, layout: sc.layout }]);
      } catch (err) {
        log('restore_scene_error', { error: String(err && err.message) });
      }
      lastScene = { mode: sc.mode, layout: lk };
    }
    registry.restore(view.registry);
    world.loadState({ world: view.world, systems: view.systems });
    if (view.systems) {
      restoreShapes(view.systems.shapes);
      restoreMovement(view.systems.movement);
    }
    push(stats.applyMs, now() - t0);
  }

  // Bring the replica to snapshot `rec` (two-pass events around the apply).
  function applyUpTo(rec) {
    const due = [];
    const keep = [];
    for (const q of eventQ) (q.ev.tick <= rec.tick ? due : keep).push(q);
    // Batches may arrive out of order (the unreliable resend overtakes a
    // retransmitted reliable copy): host order = (tick, ordinal-in-tick).
    due.sort((x, y) => x.ev.tick - y.ev.tick || x.ord - y.ord);
    eventQ.length = 0;
    for (const q of keep) eventQ.push(q);
    const ids = rec.ids;
    const idOf = (ev) => (Number.isInteger(ev.id) ? ev.id : Number.isInteger(ev.target) ? ev.target : null);
    const pass1 = [];
    const pass2 = [];
    for (const q of due) {
      const ev = q.ev;
      const ref = idOf(ev);
      if (DEATH_CLASS(ev.type) || (ref !== null && !ids.has(ref))) pass1.push(q);
      else pass2.push(q);
    }
    for (const q of pass1) deliver(q.ev, q.ord);
    stats.pass1 += pass1.length;
    let ok = true;
    try {
      applyState(rec);
    } catch (err) {
      ok = false;
      stats.applyErrors += 1;
      log('replica_apply_error', { tick: rec.tick, error: String(err && err.message) });
    }
    for (const q of pass2) deliver(q.ev, q.ord);
    stats.pass2 += pass2.length;
    prevApplied = applied;
    applied = rec;
    appliedTick = rec.tick;
    stats.applied += 1;
    const i = snaps.indexOf(rec);
    if (i > 0) snaps.splice(0, i); // older than A: done (A stays for the lerp)
    return ok;
  }

  // First state after a (re)sync: apply at once and resync every layer.
  function syncTo(rec, reason) {
    for (const q of eventQ) if (q.ev.tick <= rec.tick) stats.eventsDropped += 1;
    const later = eventQ.filter((q) => q.ev.tick > rec.tick);
    eventQ.length = 0;
    for (const q of later) eventQ.push(q);
    try {
      applyState(rec);
    } catch (err) {
      stats.applyErrors += 1;
      log('replica_sync_error', { error: String(err && err.message) });
      return false;
    }
    prevApplied = null;
    applied = rec;
    appliedTick = rec.tick;
    firstTick = rec.tick;
    resyncs += 1;
    stats.applied += 1;
    const i = snaps.indexOf(rec);
    if (i > 0) snaps.splice(0, i);
    // One presentation resync (layers rebuild rigs from the registry, pages
    // reopen from run.view()) — replayed, never a sim emit on a guest.
    try {
      bus.replay({ tick: rec.tick, type: 'state_restored', reason, mode: rec.view.scene ? rec.view.scene.mode : null, view: true });
    } catch (err) {
      log('replay_listener_error', { type: 'state_restored', error: String(err && err.message) });
    }
    return true;
  }

  // frame(rt, alpha) — once per rendered frame on a guest: bring the replica
  // to the render tick and place every replicated body. Returns a summary.
  function frame(rt, alpha) {
    stats.frames += 1;
    if (!snaps.length || rt === null) return { state: 'empty' };
    if (!applied) {
      // First data: show it at once (render clock catches up from there).
      syncTo(snaps[0], 'net_sync');
    }
    // A = newest snapshot at or before rt (never older than the applied one).
    let A = applied;
    for (const s of snaps) if (s.tick <= rt && s.tick > A.tick) A = s;
    if (A !== applied) applyUpTo(A);
    let B = null;
    for (const s of snaps) {
      if (s.tick > A.tick) {
        B = s;
        break;
      }
    }
    let state = 'lerp';
    let f = 0;
    let extra = 0;
    if (B) f = Math.max(0, Math.min(1, (rt - A.tick) / (B.tick - A.tick)));
    else {
      extra = Math.max(0, Math.min(EXTRAPOLATE_MAX_TICKS, rt - A.tick));
      state = rt - A.tick > EXTRAPOLATE_MAX_TICKS ? 'hold' : 'extrapolate';
      if (state === 'hold') stats.heldFrames += 1;
      else if (extra > 0) stats.extrapolatedFrames += 1;
    }
    const P = prevApplied && prevApplied.tick < A.tick ? prevApplied : null;
    for (const e of registry.all()) {
      if (e.id === ownId) continue;
      const a = A.ents.get(e.id);
      if (!a) continue;
      let x = a.x;
      let z = a.z;
      let vx = 0;
      let vz = 0;
      const b = B ? B.ents.get(e.id) : null;
      const snapU = a.party ? SMOOTH_SNAP_PARTY_U : SMOOTH_SNAP_U;
      if (b) {
        const span = B.tick - A.tick;
        if (Math.hypot(b.x - a.x, b.z - a.z) > teleportBound(a.party, span)) {
          stats.teleports += 1;
        } else {
          vx = (b.x - a.x) / span;
          vz = (b.z - a.z) / span;
          x = a.x + (b.x - a.x) * f;
          z = a.z + (b.z - a.z) * f;
        }
      } else if (a.mover) {
        // Linear movers fly on (they despawn with the next state they miss).
        const dt = B ? rt - A.tick : Math.max(0, rt - A.tick);
        vx = a.vx;
        vz = a.vz;
        x = a.x + a.vx * Math.min(dt, 30);
        z = a.z + a.vz * Math.min(dt, 30);
      } else if (!B && extra > 0 && P) {
        const p = P.ents.get(e.id);
        const pspan = A.tick - P.tick;
        if (p && Math.hypot(a.x - p.x, a.z - p.z) < teleportBound(a.party, pspan)) {
          const span = pspan;
          vx = (a.x - p.x) / span;
          vz = (a.z - p.z) / span;
          x = a.x + vx * extra;
          z = a.z + vz * extra;
          if (state === 'hold') {
            vx = 0;
            vz = 0;
          }
        }
      }
      const lead = a.mover && leads.has(e.id) ? leads.get(e.id) : 0;
      if (lead) {
        x += a.vx * lead;
        z += a.vz * lead;
      }
      const speed = Math.hypot(vx, vz); // u per host tick along the path
      const lr = lastRender.get(e.id);
      const drt = lr ? rt - lr.rt : 0;
      // A frame that crosses an authoritative teleport (re-seat, burrow) is
      // drawn as the cut it is — never smoothed, never a smoothness failure.
      const pp = P ? P.ents.get(e.id) : null;
      const tele = (b && Math.hypot(b.x - a.x, b.z - a.z) > teleportBound(a.party, B.tick - A.tick)) || (pp && Math.hypot(a.x - pp.x, a.z - pp.z) > teleportBound(a.party, A.tick - P.tick));
      // ---- visual error smoothing (header): path discontinuity -> offset
      let ox = 0;
      let oz = 0;
      // A frame that crosses a DATA STALL (the render clock advanced further
      // than the extrapolate-then-hold window while no snapshot arrived) is
      // counted apart: the smoothing still hides it, but a pop there is a
      // link stall, not a smoothness failure.
      const stalled = drt > STALL_TICKS;
      // The render clock re-anchored (join, host migration, a long stall):
      // the whole scene cuts to a new time, which is not a smoothness fault.
      const reanchored = drt < 0 || drt > 24;
      if (lr && !a.mover && !tele && drt >= 0 && drt < 60) {
        ox = lr.ox;
        oz = lr.oz;
        const allow = Math.max(speed, lr.speed) * drt;
        const jx = x - lr.tx - vx * drt;
        const jz = z - lr.tz - vz * drt;
        if (Math.hypot(x - lr.tx, z - lr.tz) > allow + SMOOTH_EPS_U && Math.hypot(jx, jz) > SMOOTH_EPS_U) {
          ox -= jx;
          oz -= jz;
          stats.smoothed += 1;
        }
        const mag = Math.hypot(ox, oz);
        if (mag > snapU) {
          ox = 0;
          oz = 0;
          stats.smoothSnaps += 1;
        } else if (mag > 0) {
          if (mag > stats.smoothedMaxU) stats.smoothedMaxU = mag;
          let step = mag * (1 - Math.exp(-drt / SMOOTH_TAU_TICKS));
          const cap = mag > SMOOTH_BIG_U ? SMOOTH_MAX_STEP_BIG_U : SMOOTH_MAX_STEP_U;
          if (step > cap) step = cap;
          const k = mag - step < 1e-4 ? 0 : (mag - step) / mag;
          ox *= k;
          oz *= k;
        }
      }
      const tx = x;
      const tz = z;
      x += ox;
      z += oz;
      e.px = x - vx * alpha;
      e.pz = z - vz * alpha;
      e.x = x + vx * (1 - alpha);
      e.z = z + vz * (1 - alpha);
      if (lr && !a.mover) {
        const step = Math.hypot(x - lr.x, z - lr.z);
        // A JUMP is the part of a frame's RENDERED displacement the
        // replicated path does not explain: the body may legitimately cover
        // speed × Δrt (a dash through a long frame moves 0.5 u in 50 ms);
        // anything beyond that is a visible pop. The raw step is kept too.
        const jump = Math.max(0, step - Math.max(speed, lr.speed) * Math.max(0, drt));
        if (tele && step > 0.3) stats.teleportFrames += 1;
        else if (reanchored && step > 0.3) stats.clockFrames += 1;
        else if (stalled && step > 0.3) stats.stallFrames += 1;
        else if (a.party) {
          if (step > stats.remoteStepMax) stats.remoteStepMax = step;
          if (jump > stats.remoteJumpMax) stats.remoteJumpMax = jump;
          if (jump > 0.3) stats.remoteJumps03 += 1;
          if (jump > 0.6) stats.remoteJumps06 += 1;
          stats.remoteFrames += 1;
        } else {
          if (jump > stats.hostileJumpMax) stats.hostileJumpMax = jump;
          if (jump > 0.3) stats.hostileJumps03 += 1;
          stats.hostileFrames += 1;
        }
      }
      lastRender.set(e.id, { x, z, tx, tz, ox, oz, rt, speed });
    }
    if (lastRender.size > registry.all().length + 64) {
      for (const id of lastRender.keys()) if (!registry.byId(id)) lastRender.delete(id);
    }
    return { state, f, extra, A: A.tick, B: B ? B.tick : null };
  }

  function reset() {
    snaps.length = 0;
    applied = null;
    prevApplied = null;
    appliedTick = -1;
    firstTick = null;
    eventQ.length = 0;
    leads.clear();
    lastRender.clear();
    lastBatch = 0;
    lastScene = { mode: null, layout: '' };
  }

  // A resync keeps the replica (it stays on screen) but restarts the
  // timeline: the next snapshot is applied at once.
  function resync() {
    snaps.length = 0;
    applied = null;
    prevApplied = null;
    appliedTick = -1;
    eventQ.length = 0;
    lastRender.clear();
    lastBatch = 0;
  }

  return {
    pushSnapshot,
    pushEvents,
    frame,
    reset,
    resync,
    setOwnId(id) {
      ownId = id;
    },
    setSuppress(fn) {
      suppress = fn;
    },
    leads,
    get appliedTick() {
      return appliedTick;
    },
    get applied() {
      return applied;
    },
    get newest() {
      return snaps.length ? snaps[snaps.length - 1] : applied;
    },
    get buffered() {
      return snaps.length;
    },
    get resyncs() {
      return resyncs;
    },
    queuedEvents: () => eventQ.length,
    ledger: () => replayLedger,
    // Measurement window restart (probes): the smoothness / extrapolation
    // counters only — the ledgers and the timeline are untouched.
    resetStats() {
      for (const k of ['extrapolatedFrames', 'heldFrames', 'remoteJumpMax', 'remoteJumps03', 'remoteJumps06', 'remoteFrames', 'remoteStepMax', 'hostileJumpMax', 'hostileJumps03', 'hostileFrames', 'smoothed', 'smoothedMaxU', 'smoothSnaps', 'teleports', 'teleportFrames', 'stallFrames', 'clockFrames']) stats[k] = 0;
    },
    stats: () => {
      const a = [...stats.applyMs].sort((x, y) => x - y);
      return {
        ...stats,
        applyMs: undefined,
        applyMsP95: a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] * 100) / 100 : null,
        remoteJumpRate06: stats.remoteFrames ? Math.round((stats.remoteJumps06 / stats.remoteFrames) * 10000) / 10000 : 0,
        remoteJumpMax: Math.round(stats.remoteJumpMax * 1000) / 1000,
        remoteStepMax: Math.round(stats.remoteStepMax * 1000) / 1000,
        hostileJumpMax: Math.round(stats.hostileJumpMax * 1000) / 1000,
        smoothedMaxU: Math.round(stats.smoothedMaxU * 1000) / 1000,
        buffered: snaps.length,
        queuedEvents: eventQ.length,
        resyncs,
      };
    },
  };
}
