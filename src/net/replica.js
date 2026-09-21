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
// The guest's OWN seat body is skipped here (net/reconcile.js predicts it).
// Events a guest must not present twice (its own confirmed predictions) are
// filtered by the `suppress(ev)` hook; host-local feedback (`intent_denied`
// — the Healer's HUD nudge + deny beep) is never replayed on a guest.
const DEATH_CLASS = (t) => t === 'death' || t === 'broken' || t === 'downed' || t.endsWith('_despawn');
const HOST_LOCAL = new Set(['intent_denied']);
const EXTRAPOLATE_MAX_TICKS = 6; // 100 ms
// A jump this big between two snapshots is a teleport (never lerped): party
// bodies are re-seated at room / camp boundaries (a snapshot interval moves
// them at most ~0.4 u by walk or dash); enemies may charge, so theirs is wider.
const TELEPORT_PARTY_U = 1.0;
const TELEPORT_U = 3;

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
    teleports: 0,
    teleportFrames: 0,
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
      const tpU = a.party ? TELEPORT_PARTY_U : TELEPORT_U;
      if (b) {
        const span = B.tick - A.tick;
        if (Math.hypot(b.x - a.x, b.z - a.z) > tpU) {
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
        if (p && Math.hypot(a.x - p.x, a.z - p.z) < tpU) {
          const span = A.tick - P.tick;
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
      e.px = x - vx * alpha;
      e.pz = z - vz * alpha;
      e.x = x + vx * (1 - alpha);
      e.z = z + vz * (1 - alpha);
      if (a.party) {
        const lr = lastRender.get(e.id);
        if (lr) {
          const jump = Math.hypot(x - lr.x, z - lr.z);
          // A frame that crosses an authoritative teleport (re-seat) is not a
          // smoothness failure: counted apart.
          const pp = P ? P.ents.get(e.id) : null;
          const tele = (b && Math.hypot(b.x - a.x, b.z - a.z) > tpU) || (pp && Math.hypot(a.x - pp.x, a.z - pp.z) > tpU);
          if (tele && jump > 0.3) stats.teleportFrames += 1;
          else {
            if (jump > stats.remoteJumpMax) stats.remoteJumpMax = jump;
            if (jump > 0.3) stats.remoteJumps03 += 1;
            if (jump > 0.6) stats.remoteJumps06 += 1;
          }
          stats.remoteFrames += 1;
        }
        lastRender.set(e.id, { x, z });
      }
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
    stats: () => {
      const a = [...stats.applyMs].sort((x, y) => x - y);
      return {
        ...stats,
        applyMs: undefined,
        applyMsP95: a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] * 100) / 100 : null,
        remoteJumpRate06: stats.remoteFrames ? Math.round((stats.remoteJumps06 / stats.remoteFrames) * 10000) / 10000 : 0,
        remoteJumpMax: Math.round(stats.remoteJumpMax * 1000) / 1000,
        buffered: snaps.length,
        queuedEvents: eventQ.length,
        resyncs,
      };
    },
  };
}
