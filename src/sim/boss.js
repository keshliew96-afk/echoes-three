// The Hollow Stag — room-8 boss sim (BUILD_BRIEF §11 "Boss" row + bullets).
//
// §11 numbers, verbatim:
//   HP 200 · move 1.8 u/s · primary 15 dmg / cd 4.0 s / telegraphed 0.7 s ·
//   secondary 12 dmg / cd 2.5 s / untelegraphed · party-height x2.2.
//   Antler Quake (primary): Ember decal RING radius 1.6 u at the CURRENT
//     TARGET's position, 0.7 s warning, then burst 15 dmg.
//   Trample (secondary): short lunge at the nearest party member within 1.5 u,
//     contact 12 dmg.
//   Adds: at 75% / 50% / 25% HP spawn 2 Boars + 1 Mantis (concurrent cap <=7
//     in the boss room).
//   Boss is immune to knockback; clear = boss AND adds all dead.
//
// Telegraph cadence (§11 structural rule, "applies across boss + adds too"):
// no two player-targeted telegraphs resolve within 1.2 s of each other. The
// enemy block enforces it for mantises through its own governor; the Stag
// enforces the same two clauses from this side — it refuses to start a quake
// while two player-targeted telegraphs are already live ANYWHERE in the
// registry, or within 72 ticks of the last player-targeted telegraph start it
// has seen on the bus (mantis starts included). Telegraph durations are
// uniform (42 ticks), so staggered starts imply staggered resolutions.
//
// Sim discipline: no DOM, no render imports, no wall clock — integer ticks and
// the seeded stream only (the only draws are the crit rolls inside
// combat.applyDamage plus the add-spawn point picks).
import { SCREENSHAKE, TICK_HZ } from '../core/constants.js';
import { walkStep, innerBounds } from './movement.js';
import { SPAWN_POINTS } from './waves.js';
import { GOVERNOR } from './enemies.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const STAG = Object.freeze({
  // §11 authored 200 — but §11's own kit numbers give the party a measured
  // ~220 opening burst and ~120 dps sustained (Round D2 run critic, yrn-ttk:
  // 200 -> 0 in 57 ticks, all three add phases inside 31 ticks). The same
  // section wants a fight that spans quake cycles (cd 4.0 s) and three SPACED
  // add waves, so the HP row is the tuning knob that was never validated:
  // 1800 buys ~15-20 s at that output with the adds pulling focus. Recorded as
  // a tuning deviation in BUILD_BRIEF §11 — not a hidden mechanic.
  hp: 1800,
  moveSpeed: 1.8, // §11 u/s
  scale: 2.2, // §11 party-height x2.2
  radius: 0.66, // 0.3 u party capsule x 2.2 (scaffold mapping of the scale row)
  quake: Object.freeze({
    damage: 15, // §11 primary 15
    cdTicks: 240, // §11 4.0 s
    telegraphTicks: 42, // §11 0.7 s warning
    radius: 1.6, // §11 ring radius 1.6 u
  }),
  trample: Object.freeze({
    damage: 12, // §11 secondary 12
    cdTicks: 150, // §11 2.5 s
    range: 1.5, // §11 "nearest party member within 1.5 u"
    lungeTicks: 12, // scaffold: the "short lunge" travel window
    lungeSpeed: 5.4, // scaffold: 3x walk — a lunge has to read as a lunge
  }),
  addPhases: Object.freeze([0.75, 0.5, 0.25]), // §11 add waves
  // §11 cadence ("applies across boss + adds too"): a burst that crosses two
  // thresholds may not fire two waves back to back — each add phase waits at
  // least one quake cycle after the previous one.
  addPhaseGapTicks: 240,
  addComposition: Object.freeze(['boar', 'boar', 'mantis']), // §11 2 Boars + 1 Mantis
  addCap: 7, // §11 concurrent cap <=7 in the boss room
  standoff: 0.15, // scaffold: stop just inside contact so the charge reads
});

// NO immunity, no HP floor. An earlier cut clamped the Stag's HP at each
// unplayed add threshold ("the Hollow Seal") to stretch the fight against the
// party's burst; it was not in §11, had no tell, and absorbed hits that still
// popped numerals (Round D F5c). §11 is now implemented verbatim: adds spawn
// at 75/50/25% and nothing else gates damage. Balance, if the fight needs it,
// is a brief change — not a hidden mechanic.

export function createBossSystem({ registry, events, rng, combat, getTick, enemies, bus }) {
  let bossId = null;
  let active = false;
  let cleared = false;
  let phasesFired = 0;
  let lastAddsTick = -Infinity; // tick of the last add phase (cadence gate)
  let addIds = [];
  // Act scaling (docs/gauntlet/PLAN.md §4.2, set by run.js at room 8 through
  // start()'s opts — minimal M4a hook): Stag HP / damage multiplier and the
  // act's add composition + ramp. Defaults = v0.4.63 exactly.
  let scale = { dmgMul: 1, adds: null, addHpMul: 1, addDmgMul: 1 };
  // Cross-block telegraph cadence: the last START tick of ANY player-targeted
  // telegraph, observed on the bus (mantis starts included).
  let lastPlayerTelegraphStart = -100000;
  if (bus) {
    bus.on('telegraph_start', (ev) => {
      if (ev.playerTargeted) lastPlayerTelegraphStart = ev.tick;
    });
  }

  const boss = () => (bossId !== null ? registry.byId(bossId) : null);

  const partyBodies = () =>
    registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);

  function nearestParty(x, z) {
    let best = null;
    let bestD2 = Infinity;
    for (const p of partyBodies()) {
      const d2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = p;
      }
    }
    return best;
  }

  function liveAdds() {
    addIds = addIds.filter((id) => {
      const e = registry.byId(id);
      return e && e.hp > 0 && e.state === 'active';
    });
    return addIds.length;
  }

  // §11 governor, boss side: cap on simultaneous player-targeted telegraphs
  // (counted across every entity that carries one) + the >= 1.2 s stagger.
  function governorGrants(tick) {
    let live = 0;
    for (const e of registry.all()) {
      if (e.telegraph && e.telegraph.playerTargeted) live += 1;
    }
    return (
      live < GOVERNOR.maxConcurrent && tick - lastPlayerTelegraphStart >= GOVERNOR.staggerTicks
    );
  }

  // --------------------------------------------------------------- spawn --
  function start(x = 0, z = -4.2, opts = {}) {
    const tick = getTick();
    despawn();
    const o = opts && typeof opts === 'object' ? opts : {};
    const hpMax = Number.isFinite(o.hp) && o.hp > 0 ? o.hp : STAG.hp;
    scale = {
      dmgMul: Number.isFinite(o.dmgMul) && o.dmgMul > 0 ? o.dmgMul : 1,
      adds: Array.isArray(o.adds) && o.adds.length > 0 ? o.adds.flatMap(([et, n]) => new Array(Math.max(0, n | 0)).fill(et)) : null,
      addHpMul: Number.isFinite(o.addHpMul) && o.addHpMul > 0 ? o.addHpMul : 1,
      addDmgMul: Number.isFinite(o.addDmgMul) && o.addDmgMul > 0 ? o.addDmgMul : 1,
    };
    const { mx, mz } = innerBounds(STAG.radius);
    const sx = Math.min(mx, Math.max(-mx, x));
    const sz = Math.min(mz, Math.max(-mz, z));
    const e = registry.spawn({
      kind: 'stag',
      faction: 'hostile',
      hittable: true,
      knockbackable: false, // §11: boss immune to knockback
      hp: hpMax,
      maxHp: hpMax,
      radius: STAG.radius,
      x: sx,
      z: sz,
      px: sx,
      pz: sz,
      kbVx: 0,
      kbVz: 0,
      kbTicks: 0,
      iframeUntilTick: 0,
      state: 'active',
      targetId: null,
      telegraph: null, // { startTick, resolveTick, x, z, radius, playerTargeted }
      nextQuakeTick: 0,
      nextTrampleTick: 0,
      lungeTicksLeft: 0,
      lungeVx: 0,
      lungeVz: 0,
      lungeHit: false,
      faceX: 0,
      faceZ: 1,
    });
    bossId = e.id;
    active = true;
    cleared = false;
    phasesFired = 0;
    lastAddsTick = -Infinity;
    addIds = [];
    events.emit(tick, 'boss_spawn', {
      id: e.id,
      name: 'THE HOLLOW STAG',
      hp: hpMax,
      x: r2(sx),
      z: r2(sz),
    });
    return e.id;
  }

  function despawn() {
    const b = boss();
    if (b) {
      events.emit(getTick(), 'boss_despawn', { id: b.id, cause: 'reset' });
      registry.despawn(b.id);
    }
    bossId = null;
    active = false;
    for (const id of addIds) {
      const a = registry.byId(id);
      if (a) {
        events.emit(getTick(), 'enemy_despawn', { id, etype: a.kind, cause: 'reset' });
        registry.despawn(id);
      }
    }
    addIds = [];
  }

  // ----------------------------------------------------------- continuous --
  function continuous() {
    const b = boss();
    if (!active || !b || b.hp <= 0) return;

    // Trample lunge owns the body while it travels; contact damage lands on
    // the first party body the lunge touches (once).
    if (b.lungeTicksLeft > 0) {
      walkStep(b, b.lungeVx, b.lungeVz, b.radius);
      b.lungeTicksLeft -= 1;
      if (!b.lungeHit) {
        for (const p of partyBodies()) {
          const d = Math.hypot(p.x - b.x, p.z - b.z);
          if (d <= b.radius + p.radius + 0.06) {
            b.lungeHit = true;
            const l = d > 1e-6 ? d : 1;
            events.emit(getTick(), 'boss_trample_hit', { id: b.id, target: p.id });
            combat.applyDamage(p, STAG.trample.damage * scale.dmgMul, {
              delivery: 'contact',
              shape: 'contact',
              dirX: (p.x - b.x) / l,
              dirZ: (p.z - b.z) / l,
              attacker: b.id,
            });
            break;
          }
        }
      }
      return;
    }

    // PARTY (BUILD_BRIEF §25.2): a live taunt (≤ 60 ticks on the Stag, then
    // 300 ticks immune — status.js) picks the target while its source stands.
    let target = nearestParty(b.x, b.z);
    const ts = combat.status && typeof combat.status.tauntSource === 'function' ? combat.status.tauntSource(b, getTick()) : null;
    if (ts !== null) {
      const src = registry.byId(ts);
      if (src && src.hp > 0) target = src;
    }
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    // A telegraphing Stag plants its hooves — the locked ring IS the promise.
    if (b.telegraph) return;
    const stop = b.radius + target.radius + STAG.standoff;
    if (d > stop) {
      const adv = Math.min(STAG.moveSpeed * TICK_DT, d - stop);
      walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  }

  // ------------------------------------------------------------- discrete --
  function resolve() {
    const b = boss();
    if (!active || !b || b.hp <= 0) return;
    const tick = getTick();

    // Antler Quake maturation: burst 15 on every party body inside the ring.
    if (b.telegraph) {
      if (tick >= b.telegraph.resolveTick) {
        const { x, z, radius } = b.telegraph;
        const victims = partyBodies().filter(
          (p) => Math.hypot(p.x - x, p.z - z) <= radius + p.radius
        );
        events.emit(tick, 'boss_quake_resolve', {
          id: b.id,
          x: r2(x),
          z: r2(z),
          radius,
          victims: victims.length,
          telegraphTicks: tick - b.telegraph.startTick,
        });
        events.emit(tick, 'telegraph_resolve', { id: b.id, playerTargeted: true });
        // §9 #7: the quake LANDING shakes the frame (the wind-up never does).
        events.emit(tick, 'screenshake', {
          cause: 'boss_quake',
          amp: SCREENSHAKE.maxAmp,
          durationSec: SCREENSHAKE.bossSec,
          x: r2(x),
          z: r2(z),
        });
        for (const p of victims) {
          const l = Math.hypot(p.x - x, p.z - z) || 1;
          combat.applyDamage(p, STAG.quake.damage * scale.dmgMul, {
            delivery: 'skill',
            shape: 'ground_aoe',
            dirX: (p.x - x) / l,
            dirZ: (p.z - z) / l,
            attacker: b.id,
          });
        }
        b.telegraph = null;
        b.nextQuakeTick = tick + STAG.quake.cdTicks;
      }
      return; // one action per tick while the primary is committed
    }

    if (b.lungeTicksLeft > 0) return;

    const target = b.targetId != null ? registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);

    // Primary first (ascending "slot" order, §4 ②): Antler Quake.
    if (tick >= b.nextQuakeTick && governorGrants(tick)) {
      b.telegraph = {
        startTick: tick,
        resolveTick: tick + STAG.quake.telegraphTicks, // §11: visible >= 0.7 s
        x: target.x, // locked at the CURRENT TARGET's position
        z: target.z,
        radius: STAG.quake.radius,
        playerTargeted: true,
        targetId: target.id,
      };
      lastPlayerTelegraphStart = tick;
      events.emit(tick, 'boss_quake_start', {
        id: b.id,
        target: target.id,
        x: r2(target.x),
        z: r2(target.z),
        radius: STAG.quake.radius,
        resolveTick: b.telegraph.resolveTick,
      });
      events.emit(tick, 'telegraph_start', {
        id: b.id,
        target: target.id,
        x: r2(target.x),
        z: r2(target.z),
        resolveTick: b.telegraph.resolveTick,
        playerTargeted: true,
      });
      return;
    }

    // Secondary: Trample — untelegraphed short lunge inside 1.5 u.
    if (tick >= b.nextTrampleTick && d <= STAG.trample.range + target.radius) {
      const l = d > 1e-6 ? d : 1;
      b.lungeVx = ((target.x - b.x) / l) * STAG.trample.lungeSpeed * TICK_DT;
      b.lungeVz = ((target.z - b.z) / l) * STAG.trample.lungeSpeed * TICK_DT;
      b.lungeTicksLeft = STAG.trample.lungeTicks;
      b.lungeHit = false;
      b.nextTrampleTick = tick + STAG.trample.cdTicks;
      events.emit(tick, 'boss_trample', { id: b.id, target: target.id, x: r2(b.x), z: r2(b.z) });
      // §9 #7: a 2.2x body throwing itself at the party is a stomp, not a hit.
      events.emit(tick, 'screenshake', {
        cause: 'boss_trample',
        amp: SCREENSHAKE.maxAmp,
        durationSec: SCREENSHAKE.bossSec,
        x: r2(b.x),
        z: r2(b.z),
      });
    }
  }

  // ----------------------------------------------------------- end of tick --
  // Add phases + the boss-room clear predicate (§11: clear = boss and adds all
  // dead), both evaluated at end of tick like every other room predicate.
  function endOfTick() {
    if (!active || cleared) return;
    const tick = getTick();
    const b = boss();

    if (b && b.hp > 0) {
      // §11 add waves, verbatim: at 75% / 50% / 25% HP spawn 2 Boars + 1
      // Mantis (cap <= 7). One threshold resolves per tick so a single burst
      // that crosses two of them still lands two distinct `boss_adds` beats;
      // HP is never clamped and nothing here touches the damage pipeline.
      if (phasesFired < STAG.addPhases.length && tick - lastAddsTick >= STAG.addPhaseGapTicks) {
        const pct = STAG.addPhases[phasesFired];
        if (b.hp <= b.maxHp * pct) {
          phasesFired += 1;
          lastAddsTick = tick;
          spawnAdds(tick, pct);
        }
      }
      return;
    }

    // Boss down: the room clears once the adds are gone too — on the killing
    // blow's own tick (§11 "Clear = boss and adds all dead"). An enemy shot
    // still in flight never holds the clear: it dissolves with it (§13 step 2,
    // "no instance may land after the clear tick"; the Gungeon / Hades rule —
    // the last kill clears the bullets). Waiting for it (a shot flies up to
    // 7 u / 4 u/s = 105 ticks) delayed `level_clear` and pushed the campaign's
    // killing blow -> next-level control past PLAN GC.7's 4.0 s bound
    // (CAMPAIGN fix r3, GC7-inflight-4s). A party wipe still outranks it.
    if (liveAdds() > 0) return;
    let partyUp = false;
    for (const e of registry.all()) {
      if (e.partyIndex !== undefined && e.hp > 0) {
        partyUp = true;
        break;
      }
    }
    if (!partyUp) return;
    cleared = true;
    enemies.despawnShots();
    enemies.retreatAllSurvivors();
    events.emit(tick, 'room_cleared', { mode: 'boss', softFailed: false });
  }

  function spawnAdds(tick, pct) {
    const spawned = [];
    for (const etype of scale.adds ?? STAG.addComposition) {
      if (liveAdds() >= STAG.addCap) break; // §11 concurrent cap
      const [sx, sz] = SPAWN_POINTS[rng.int(SPAWN_POINTS.length)];
      const scaled = scale.adds && typeof enemies.spawnScaled === 'function';
      const e = scaled
        ? enemies.spawnScaled(etype, sx, sz, { hpMul: scale.addHpMul, dmgMul: scale.addDmgMul, wave: 100 + phasesFired })
        : enemies.spawn(etype, sx, sz, 100 + phasesFired);
      if (e) {
        addIds.push(e.id);
        spawned.push({ id: e.id, etype, x: r2(sx), z: r2(sz) });
      }
    }
    events.emit(tick, 'boss_adds', {
      pct,
      phase: phasesFired,
      spawned: spawned.length,
      cap: STAG.addCap,
      adds: spawned,
    });
  }

  // ----------------------------------------------------------------- view --
  function view() {
    const b = boss();
    return {
      active,
      cleared,
      name: 'THE HOLLOW STAG',
      id: bossId,
      hp: b ? r2(b.hp) : 0,
      maxHp: b ? b.maxHp : STAG.hp,
      pct: b ? r2(Math.max(0, b.hp / b.maxHp)) : 0,
      x: b ? r2(b.x) : 0,
      z: b ? r2(b.z) : 0,
      phasesFired,
      adds: liveAdds(),
      quake: b && b.telegraph
        ? {
            x: r2(b.telegraph.x),
            z: r2(b.telegraph.z),
            radius: b.telegraph.radius,
            startTick: b.telegraph.startTick,
            resolveTick: b.telegraph.resolveTick,
          }
        : null,
      lunging: b ? b.lungeTicksLeft > 0 : false,
    };
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the Stag fight's private
  // state (the body and its adds are registry data; addIds are ids).
  // lastAddsTick starts at -Infinity (canonical JSON tags it).
  function saveState() {
    return { bossId, active, cleared, phasesFired, lastAddsTick, addIds, scale, lastPlayerTelegraphStart };
  }
  function loadState(d) {
    if (!d) throw new TypeError('boss.loadState: missing data');
    bossId = d.bossId ?? null;
    active = !!d.active;
    cleared = !!d.cleared;
    phasesFired = d.phasesFired ?? 0;
    lastAddsTick = typeof d.lastAddsTick === 'number' ? d.lastAddsTick : -Infinity;
    addIds = Array.isArray(d.addIds) ? d.addIds : [];
    scale = d.scale ?? { dmgMul: 1, adds: null, addHpMul: 1, addDmgMul: 1 };
    lastPlayerTelegraphStart = Number.isFinite(d.lastPlayerTelegraphStart) ? d.lastPlayerTelegraphStart : -100000;
  }

  return {
    saveState,
    loadState,
    start,
    despawn,
    continuous,
    resolve,
    endOfTick,
    view,
    entity: boss,
    isActive: () => active,
    isCleared: () => cleared,
    // Test hook: drive the Stag to a HP fraction through the real pipeline's
    // sibling path (no crit roll — this is a debug setter, not an instance).
    // skipPhases = true marks the add waves at or above pct as already played,
    // so a probe can park the Stag below a threshold without spawning adds.
    setHpPct: (pct, skipPhases = false) => {
      const b = boss();
      if (!b) return null;
      if (skipPhases) {
        while (phasesFired < STAG.addPhases.length && pct <= STAG.addPhases[phasesFired])
          phasesFired += 1;
      }
      b.hp = Math.max(0, (b.maxHp ?? STAG.hp) * pct);
      if (b.hp <= 0) combat.kill(b);
      return r2(b.hp);
    },
  };
}
