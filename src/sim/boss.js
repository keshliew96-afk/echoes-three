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
import { TICK_HZ } from '../core/constants.js';
import { walkStep, innerBounds } from './movement.js';
import { SPAWN_POINTS } from './waves.js';
import { GOVERNOR } from './enemies.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const STAG = Object.freeze({
  hp: 200, // §11
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
  addComposition: Object.freeze(['boar', 'boar', 'mantis']), // §11 2 Boars + 1 Mantis
  addCap: 7, // §11 concurrent cap <=7 in the boss room
  standoff: 0.15, // scaffold: stop just inside contact so the charge reads
  // --- THE HOLLOW SEAL (documented deviation — see the block comment below).
  // Open hide between a seal breaking and the next threshold arming. This is
  // the BINDING FLOOR on add-wave spacing — 2.0 s, 1.67x §11's 1.2 s telegraph
  // cadence unit — and it holds even when the party (or a debug
  // `killAllEnemies`) wipes a wave the tick it lands. Two add waves therefore
  // can never resolve inside one telegraph window by any route.
  phaseGapTicks: 120,
  // A seal lasts ONE FULL Antler Quake cooldown (4.0 s = 240 ticks) or until
  // that wave's adds are dead, whichever comes first — so every add wave is
  // guaranteed a complete primary cycle, and consecutive waves are >= 285 ticks
  // (4.75 s) apart, far outside any single 1.2 s telegraph window. The time cap
  // matters: a Spitting Mantis repositions to keep 3.5 u and the allies are
  // leashed at 3.4 u, so "adds dead" alone is not a condition the party can
  // always force.
  sealTicks: 240,
});

// WHY THE SEAL EXISTS (design collision, escalated in the block report):
// §11 authors the Stag at 200 HP; §12 authors the three ally kits. Measured,
// the party's OPENING burst alone is ~207 damage in 62 ticks and its sustained
// output is ~150 dps — so a plain 200 HP Stag dies in about one second, the
// 4.0 s Antler Quake never completes a second cycle, and all three "adds at
// 75/50/25% HP" waves resolve inside a third of a second. Both rows are
// brief-verbatim and neither may be silently rewritten, so the collision is
// resolved in the STRUCTURE the brief already asks for rather than in its
// numbers: the Stag's hide seals at each unplayed add threshold. Its HP cannot
// fall past 75/50/25% until that threshold's wave has been spawned AND cleared
// (or `sealTicks` elapses). Every §11 number stays exactly as written; the
// add waves become the pacing mechanism they are clearly meant to be, and the
// fight plays as four damage windows separated by three add clears.

export function createBossSystem({ registry, events, rng, combat, getTick, enemies, bus }) {
  let bossId = null;
  let active = false;
  let cleared = false;
  let phasesFired = 0;
  let addIds = [];
  // --- Hollow Seal state (see the STAG block comment).
  let sealed = false;
  let sealPct = 0;
  let sealStartTick = 0;
  let lastPhaseEndTick = -100000;
  let absorbedTotal = 0;
  // Cross-block telegraph cadence: the last START tick of ANY player-targeted
  // telegraph, observed on the bus (mantis starts included).
  let lastPlayerTelegraphStart = -100000;
  if (bus) {
    bus.on('telegraph_start', (ev) => {
      if (ev.playerTargeted) lastPlayerTelegraphStart = ev.tick;
    });
    // The seal has to hold INSIDE the damage instance, not at end of tick: a
    // single ally burst can carry the Stag from 160 to below zero, and
    // combat.applyDamage kills on `hp <= 0` immediately after it emits `hit`.
    // Listening on `hit` puts this floor between those two statements — the
    // number still pops, the flash still fires, the HP just stops at the
    // unplayed threshold and the overkill is reported as absorbed.
    bus.on('hit', (ev) => {
      if (bossId === null || ev.target !== bossId) return;
      const b = boss();
      if (!b) return;
      const floor = hpFloor(b);
      if (floor <= 0 || b.hp >= floor) return;
      const absorbed = floor - b.hp;
      b.hp = floor;
      absorbedTotal += absorbed;
      events.emit(ev.tick, 'boss_absorb', {
        id: b.id,
        absorbed: r2(absorbed),
        hp: r2(b.hp),
        pct: r2(b.hp / b.maxHp),
        sealed,
        phase: phasesFired,
      });
    });
  }

  // The HP the Stag may not fall below right now: the sealed threshold while a
  // wave is outstanding, the next unplayed threshold otherwise, and 0 once all
  // three add waves have been played — from then on the Stag can be killed.
  function hpFloor(b) {
    if (!b) return 0;
    if (sealed) return b.maxHp * sealPct;
    if (phasesFired < STAG.addPhases.length) return b.maxHp * STAG.addPhases[phasesFired];
    return 0;
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
  function start(x = 0, z = -4.2) {
    const tick = getTick();
    despawn();
    const { mx, mz } = innerBounds(STAG.radius);
    const sx = Math.min(mx, Math.max(-mx, x));
    const sz = Math.min(mz, Math.max(-mz, z));
    const e = registry.spawn({
      kind: 'stag',
      faction: 'hostile',
      hittable: true,
      knockbackable: false, // §11: boss immune to knockback
      hp: STAG.hp,
      maxHp: STAG.hp,
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
      sealed: false, // render-layer read-only mirror of the Hollow Seal
      sealPct: 0,
    });
    bossId = e.id;
    active = true;
    cleared = false;
    phasesFired = 0;
    addIds = [];
    sealed = false;
    sealPct = 0;
    sealStartTick = tick;
    lastPhaseEndTick = -100000; // the first threshold arms the moment it is reached
    absorbedTotal = 0;
    events.emit(tick, 'boss_spawn', {
      id: e.id,
      name: 'THE HOLLOW STAG',
      hp: STAG.hp,
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
            combat.applyDamage(p, STAG.trample.damage, {
              delivery: 'contact',
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

    const target = nearestParty(b.x, b.z);
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
        for (const p of victims) {
          const l = Math.hypot(p.x - x, p.z - z) || 1;
          combat.applyDamage(p, STAG.quake.damage, {
            delivery: 'skill',
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
      // --- Hollow Seal. One phase per tick, never a cascade: a threshold is
      // reached, its wave spawns, and the Stag stays sealed at that HP until
      // the wave is dead. Two consequences the critic asked for: the three add
      // waves are always three distinct beats (>= phaseGapTicks apart, i.e.
      // wider than any single 1.2 s telegraph window), and the fight lasts long
      // enough for the 4.0 s Quake / 2.5 s Trample cycles to repeat.
      if (sealed) {
        const floor = b.maxHp * sealPct;
        if (b.hp < floor) b.hp = floor;
        const addsDown = liveAdds() === 0;
        const expired = tick - sealStartTick >= STAG.sealTicks;
        if (addsDown || expired) {
          sealed = false;
          lastPhaseEndTick = tick;
          events.emit(tick, 'boss_seal_break', {
            id: b.id,
            pct: sealPct,
            phase: phasesFired,
            reason: addsDown ? 'adds_cleared' : 'timeout',
            ticks: tick - sealStartTick,
          });
        }
      } else if (phasesFired < STAG.addPhases.length) {
        const pct = STAG.addPhases[phasesFired];
        const floor = b.maxHp * pct;
        if (b.hp <= floor) {
          b.hp = floor; // cannot fall past an unplayed add threshold
          if (tick - lastPhaseEndTick >= STAG.phaseGapTicks) {
            phasesFired += 1;
            spawnAdds(tick, pct);
            sealed = true;
            sealPct = pct;
            sealStartTick = tick;
            events.emit(tick, 'boss_seal_start', {
              id: b.id,
              pct,
              phase: phasesFired,
              hp: r2(b.hp),
              adds: liveAdds(),
            });
          }
        }
      }
      b.sealed = sealed;
      b.sealPct = sealed ? sealPct : 0;
      return;
    }

    // Boss down: the room clears once the adds are gone too.
    if (liveAdds() > 0) return;
    let partyUp = false;
    let shots = 0;
    for (const e of registry.all()) {
      if (e.partyIndex !== undefined && e.hp > 0) partyUp = true;
      else if (e.kind === 'eshot') shots += 1;
    }
    if (!partyUp || shots > 0) return;
    cleared = true;
    enemies.despawnShots();
    enemies.retreatAllSurvivors();
    events.emit(tick, 'room_cleared', { mode: 'boss', softFailed: false });
  }

  function spawnAdds(tick, pct) {
    const spawned = [];
    for (const etype of STAG.addComposition) {
      if (liveAdds() >= STAG.addCap) break; // §11 concurrent cap
      const [sx, sz] = SPAWN_POINTS[rng.int(SPAWN_POINTS.length)];
      const e = enemies.spawn(etype, sx, sz, 100 + phasesFired);
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
      maxHp: STAG.hp,
      pct: b ? r2(Math.max(0, b.hp / b.maxHp)) : 0,
      x: b ? r2(b.x) : 0,
      z: b ? r2(b.z) : 0,
      phasesFired,
      adds: liveAdds(),
      sealed,
      sealPct: sealed ? sealPct : 0,
      sealTicks: sealed ? getTick() - sealStartTick : 0,
      hpFloor: r2(hpFloor(b)),
      absorbed: r2(absorbedTotal),
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

  return {
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
    // The Hollow Seal still holds, so a probe that wants to sit BELOW an
    // unplayed add threshold passes skipPhases = true to mark those waves as
    // already played (`cmd('bossHp', 0.2, true)`).
    setHpPct: (pct, skipPhases = false) => {
      const b = boss();
      if (!b) return null;
      if (skipPhases) {
        while (phasesFired < STAG.addPhases.length && pct <= STAG.addPhases[phasesFired])
          phasesFired += 1;
        sealed = false;
        b.sealed = false;
        b.sealPct = 0;
        lastPhaseEndTick = getTick();
      }
      b.hp = Math.max(0, STAG.hp * pct);
      if (b.hp <= 0) combat.kill(b);
      return r2(b.hp);
    },
  };
}
