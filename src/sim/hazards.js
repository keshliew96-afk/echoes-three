// Hazards (docs/gauntlet/PLAN.md §3.6 "Hazard", BUILD_BRIEF §23.6) + the
// room-layout director that spawns every layout's placements. Owner: M4b.
//
// Five hazard types, all world objects of faction 'neutral' that hurt EVERY
// faction unless stated (a tool as much as a threat):
//   bramble    static thorn patch r 0.9-1.3: ground bodies inside move x0.65
//              (slow 0.35; fliers, burrowers and the Stag are immune); no damage
//   puffcap    fungus body r 0.35: idle 300 -> swell 60 (Ember ring r 1.3) ->
//              burst 10 dmg r 1.3 -> cooldown 120 -> idle. ANY damage while idle
//              starts the swell at once (pop it next to enemies)
//   millrace   water lane 1.4 u wide: ground bodies inside are pushed along the
//              flow at 1.3 u/s (displacement, swept — party included); every
//              540 ticks a 60-tick Ember telegraph, then a 30-tick SURGE: 12 dmg
//              once per body + push 3.0 u/s. The Sluice Lever stops both
//   rockfall   a room-long schedule (every 240-360 ticks, fixed at room start)
//              drops rock on a party member's position at telegraph start: Ember
//              ring r 0.9 for 72 ticks, 15 dmg, then RUBBLE (collider r 0.6,
//              blocks movement + projectiles) for 480 ticks, <= 2 at once.
//              Player-targeted, so it goes through the §11 governor
//   gravefire  a line of 3 vents erupting 18 ticks apart: Ember glyph ring
//              r 0.7 for 54 ticks per vent, then a 12-tick column (12 dmg once
//              per body); cycle 420 ticks
//
//   slip       slick floor (Slick floor slice, docs/SLICK_FLOOR.md): a patch
//              r 1.1-1.9 of wet flagstone (skin 'wet', Mill), grave frost
//              (skin 'frost', Barrow) or heart crystal (skin 'glass', Act
//              IV). Walking bodies on it keep their
//              momentum (sim/movement.js slipFollow): they slide when they
//              stop, turn wide, and dodges and knockbacks carry further.
//              Fliers, burrowers and bosses never slip. No damage, no phases:
//              the surface itself is the telegraph
//
// Telegraph discipline (§23.6): every hazard telegraph is Ember and >= 42
// ticks; idle states are drawn in the biome palette. No two SCHEDULED hazard
// resolutions land within 0.6 s (36 ticks) of each other: every resolution is
// reserved on one shared clock (`reserve`), which pushes a clashing resolve
// later (the telegraph simply runs longer). A gravefire line reserves its whole
// 36-tick eruption window.
//
// Determinism: no gameplay-RNG draws at all. The rockfall schedule is a pure
// hash of (run seed, room, layout id), so hazards never shift the wave
// director's roll order. Everything is plain entity data + the few scalars
// serialize() returns (PLAN §3.4).
import { TICK_HZ, SCREENSHAKE } from '../core/constants.js';
import { walkStep, resolveStatics, setSlipPatches, slipPatches } from './movement.js';
import * as statusMod from './status.js';
import { ENEMY_KINDS } from './enemies.js';
import { LAYOUTS } from '../data/layouts.js';
import { registerContentProbe } from '../data/content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const TICK_DT = 1 / TICK_HZ;

export const HAZARD_TYPES = Object.freeze({
  bramble: Object.freeze({ slow: 0.35, affects: 'ground' }),
  slip: Object.freeze({ radius: 1.4, affects: 'ground' }),
  puffcap: Object.freeze({
    idleTicks: 300,
    telegraphTicks: 60,
    cooldownTicks: 120,
    damage: 10,
    radius: 1.3, // burst
    bodyRadius: 0.35,
    affects: 'all',
  }),
  millrace: Object.freeze({
    width: 1.4,
    pushSpeed: 1.3, // u/s
    surgeEvery: 540,
    telegraphTicks: 60,
    surgeTicks: 30,
    surgePush: 3.0, // u/s
    damage: 12,
    affects: 'ground',
  }),
  rockfall: Object.freeze({
    telegraphTicks: 72,
    minGap: 240,
    maxGap: 360,
    firstDelay: 150, // ticks into the room before the first drop can start (scaffold)
    damage: 15,
    radius: 0.9,
    rubbleR: 0.6,
    rubbleTicks: 480,
    maxRubble: 2,
    playerTargeted: true,
    affects: 'all',
  }),
  gravefire: Object.freeze({
    telegraphTicks: 54,
    stagger: 18,
    activeTicks: 12,
    damage: 12,
    radius: 0.7,
    cycleTicks: 420,
    firstDelay: 120, // ticks into the room before the first cycle (scaffold)
    affects: 'all',
  }),
});
// Slick floor skins: how much grip each surface leaves (per-tick ease of a
// body's momentum toward its step; lower = slicker). Frost is the slicker.
export const SLIP_SKINS = Object.freeze({
  wet: Object.freeze({ grip: 0.09 }),
  frost: Object.freeze({ grip: 0.07 }),
  // Act IV (docs/ACT_IV.md): polished violet crystal in the Hollow Heart.
  glass: Object.freeze({ grip: 0.08 }),
});
export const HAZARD_SPACING_TICKS = 36; // §23.6: no two resolutions inside 0.6 s

// splitmix-style 32-bit mixer (same family as sim/script.js) — the hazard
// schedule stream. Pure: (seed, n) -> uint32.
function mix32(x) {
  x = (x + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
const hash = (a, b) => mix32(mix32(a >>> 0) ^ (b >>> 0));

// Point-in-lane test: { inside, along (0..len), side (signed) }.
function laneLocal(h, x, z) {
  const rx = x - h.lane.x0;
  const rz = z - h.lane.z0;
  const along = rx * h.dirX + rz * h.dirZ;
  const side = -rx * h.dirZ + rz * h.dirX;
  return { along, side, inside: along >= 0 && along <= h.len && Math.abs(side) <= h.lane.w / 2 };
}

export function createHazardSystem({ registry, events, combat, getTick, getSeed = () => 0, governor = null }) {
  let dormant = false; // room cleared: hazards stop acting (§13 "every live combat entity ends")
  let reservations = []; // [{ a, b }] reserved resolution windows (ticks)

  const isGround = (e) => !e.flier && !e.burrowed;
  const isMobile = (e) =>
    (e.partyIndex !== undefined && e.hp > 0) || (ENEMY_KINDS.has(e.kind) && e.state === 'active');
  function damageable(e, self) {
    if (!(e.hp > 0) || e === self || e.id === self.id) return false;
    if (e.kind === 'stag' || e.boss === true) return false; // boss rooms carry no hazards; never a hazard victim
    if (e.faction === 'party') return true;
    if (e.faction === 'hostile') return e.hittable !== false;
    if (e.faction === 'neutral') return !!e.hittable;
    return false;
  }

  // --- the shared resolution clock (§23.6 spacing).
  function reserve(tick, want, span = 0) {
    reservations = reservations.filter((r) => r.b >= tick - HAZARD_SPACING_TICKS);
    let a = Math.max(want, tick);
    for (let guard = 0; guard < 64; guard++) {
      const clash = reservations.find(
        (r) => a < r.b + HAZARD_SPACING_TICKS && a + span > r.a - HAZARD_SPACING_TICKS
      );
      if (!clash) break;
      a = clash.b + HAZARD_SPACING_TICKS;
    }
    reservations.push({ a, b: a + span });
    return a;
  }

  function hurt(h, x, z, radius, base, { ground = false } = {}) {
    const victims = [];
    for (const t of registry.all()) {
      if (!damageable(t, h)) continue;
      if (ground && !isGround(t)) continue;
      if (Math.hypot(t.x - x, t.z - z) <= radius + (t.radius ?? 0)) victims.push(t);
    }
    for (const t of victims) {
      if (!registry.byId(t.id) || !(t.hp > 0)) continue;
      const dx = t.x - x;
      const dz = t.z - z;
      const l = Math.hypot(dx, dz);
      combat.applyDamage(t, base, {
        delivery: 'hazard',
        shape: 'hazard',
        dirX: l > 1e-6 ? dx / l : 0,
        dirZ: l > 1e-6 ? dz / l : 1,
        attacker: h.id,
        source: h.htype,
      });
    }
    return victims.length;
  }

  function emitTelegraph(h, tick, x, z, radius, resolveTick, extra = {}) {
    events.emit(tick, 'hazard_telegraph', {
      id: h.id,
      htype: h.htype,
      x: r2(x),
      z: r2(z),
      radius,
      resolveTick,
      ...extra,
    });
  }

  // ------------------------------------------------------------ spawning --
  function spawnHazard(htype, x = 0, z = 0, params = {}) {
    const T = HAZARD_TYPES[htype];
    if (!T) return null;
    const tick = getTick();
    const base = { kind: 'hazard', htype, faction: 'neutral', x, z, px: x, pz: z, phase: 'idle', phaseUntilTick: 0 };
    let h;
    if (htype === 'bramble') {
      h = registry.spawn({ ...base, radius: params.r ?? 1.1, phase: 'active', slow: T.slow });
    } else if (htype === 'slip') {
      const skin = SLIP_SKINS[params.skin] ? params.skin : 'wet';
      h = registry.spawn({ ...base, radius: params.r ?? T.radius, phase: 'active', skin, grip: SLIP_SKINS[skin].grip });
    } else if (htype === 'puffcap') {
      const off = Math.max(0, Math.min(T.idleTicks - 60, params.offset ?? 0));
      h = registry.spawn({
        ...base,
        radius: T.bodyRadius,
        blastRadius: T.radius,
        hittable: true, // any damage while idle starts the swell
        hp: 999,
        maxHp: 999,
        lifecycle: 'break', // safety: never a `death`, never a kill decal
        knockbackable: false,
        phaseUntilTick: tick + T.idleTicks - off,
        resolveTick: null,
        bursts: 0,
      });
    } else if (htype === 'millrace') {
      const x0 = params.x0 ?? x - 3;
      const z0 = params.z0 ?? z;
      const x1 = params.x1 ?? x + 3;
      const z1 = params.z1 ?? z;
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const off = Math.max(0, Math.min(T.surgeEvery - T.telegraphTicks, params.offset ?? 0));
      h = registry.spawn({
        ...base,
        x: (x0 + x1) / 2,
        z: (z0 + z1) / 2,
        px: (x0 + x1) / 2,
        pz: (z0 + z1) / 2,
        lane: { x0, z0, x1, z1, w: params.w ?? T.width },
        dirX: (x1 - x0) / len,
        dirZ: (z1 - z0) / len,
        len,
        radius: len / 2,
        nextSurgeTick: tick + T.surgeEvery - off,
        stoppedUntilTick: 0,
        surgeHits: [],
        resolveTick: null,
        surges: 0,
      });
    } else if (htype === 'rockfall') {
      const seed = hash(getSeed() >>> 0, 0x70ccf011 ^ ((params.room ?? 0) * 977) ^ ((params.layoutId ?? 0) * 131));
      const schedule = [];
      let t = tick + T.firstDelay + (hash(seed, 0) % 90);
      for (let i = 0; i < 48; i++) {
        schedule.push(t);
        t += T.minGap + (hash(seed, i + 1) % (T.maxGap - T.minGap + 1));
      }
      h = registry.spawn({
        ...base,
        x: 0,
        z: 0,
        radius: T.radius,
        schedule,
        pick: schedule.map((_, i) => hash(seed, 1000 + i) % 4), // party-slot preference per drop
        next: 0,
        telegraph: null,
        drops: 0,
      });
    } else if (htype === 'gravefire') {
      const vents = (params.vents ?? [[x - 1.2, z], [x, z], [x + 1.2, z]]).map(([vx, vz]) => ({
        x: vx,
        z: vz,
        phase: 'idle',
        hits: [],
      }));
      const mx = vents.reduce((a, v) => a + v.x, 0) / vents.length;
      const mz = vents.reduce((a, v) => a + v.z, 0) / vents.length;
      h = registry.spawn({
        ...base,
        x: mx,
        z: mz,
        px: mx,
        pz: mz,
        radius: T.radius,
        vents,
        // Act IV: the Heart's vein vents ('vein') are gravefire in its own
        // colours; the skin is dressing only.
        ...(params.skin ? { skin: params.skin } : {}),
        cycleStart: reserveLine(tick, tick + T.firstDelay + (params.offset ?? 0)),
        cycles: 0,
      });
    }
    if (!h) return null;
    events.emit(tick, 'hazard_spawn', { id: h.id, htype, x: r2(h.x), z: r2(h.z), radius: h.radius });
    if (htype === 'slip') installSlips();
    return h;
  }

  // A gravefire line reserves [t0 + 54, t0 + 54 + 36] (its three eruptions).
  function reserveLine(tick, t0) {
    const T = HAZARD_TYPES.gravefire;
    const first = t0 + T.telegraphTicks;
    const got = reserve(tick, first, T.stagger * 2);
    return got - T.telegraphTicks;
  }

  // The movement module's slip patch list, rebuilt from the live 'slip'
  // hazards (ascending id). Only touched once a patch has existed, so a room
  // without one never writes it.
  function installSlips() {
    const list = [];
    for (const e of registry.all()) if (e.kind === 'hazard' && e.htype === 'slip') list.push({ id: e.id, x: e.x, z: e.z, r: e.radius, grip: e.grip });
    if (list.length > 0 || slipPatches().length > 0) setSlipPatches(list);
  }

  function despawnAll(tick, cause = 'room_exit') {
    for (const e of registry.all()) {
      if (e.kind === 'hazard' || e.kind === 'rubble') {
        events.emit(tick, e.kind === 'hazard' ? 'hazard_despawn' : 'rubble_crumble', { id: e.id, htype: e.htype, cause });
        registry.despawn(e.id);
      }
    }
    reservations = [];
    if (slipPatches().length > 0) setSlipPatches(null);
  }

  // ------------------------------------------------------------ continuous --
  // Pushes and slows (displacement settles before knockback and projectiles),
  // plus the puffcap hit check (any HP lost since last tick = a hit).
  function continuous() {
    const tick = getTick();
    const all = registry.all();
    installSlips(); // a load or a debug despawn changes the list between ticks
    for (const h of all) {
      if (h.kind !== 'hazard') continue;
      if (h.htype === 'puffcap') {
        if (h.hp < h.maxHp) {
          h.hp = h.maxHp; // the fungus shrugs damage off; the hit only triggers it
          if (!dormant && h.phase === 'idle') startSwell(h, tick, 'hit');
        }
        continue;
      }
      if (dormant) continue;
      if (h.htype === 'bramble') {
        for (const e of all) {
          if (!isMobile(e) || !isGround(e) || e.kind === 'stag' || e.boss === true) continue;
          if (Math.hypot(e.x - h.x, e.z - h.z) > h.radius) continue;
          lease(e, 'slow', h.slow, tick, h.id);
        }
      } else if (h.htype === 'millrace') {
        if (tick < h.stoppedUntilTick) continue;
        const T = HAZARD_TYPES.millrace;
        const speed = h.phase === 'active' ? T.surgePush : T.pushSpeed;
        const step = speed * TICK_DT;
        for (const e of all) {
          if (!isMobile(e) || !isGround(e)) continue;
          if (!laneLocal(h, e.x, e.z).inside) continue;
          walkStep(e, h.dirX * step, h.dirZ * step, e.radius);
        }
      }
    }
    for (const r of all) {
      if (r.kind === 'rubble' && tick >= r.untilTick) {
        events.emit(tick, 'rubble_crumble', { id: r.id, cause: 'expired', x: r2(r.x), z: r2(r.z) });
        registry.despawn(r.id);
        blockersDirty = true;
      }
    }
  }

  // A status lease: apply once, then extend the SAME record silently while the
  // body stays inside, so `status_apply` fires on entry, not every tick.
  function lease(e, kind, mag, tick, srcId) {
    const cur = e.status && e.status[kind];
    if (cur && cur.src === srcId && cur.untilTick > tick && cur.mag >= Math.min(mag, 0.6)) {
      cur.untilTick = Math.max(cur.untilTick, tick + 3);
      return;
    }
    statusMod.apply(e, kind, mag, 3, tick, srcId);
  }

  function startSwell(h, tick, cause) {
    const T = HAZARD_TYPES.puffcap;
    const r = reserve(tick, tick + T.telegraphTicks);
    h.phase = 'telegraph';
    h.resolveTick = r;
    h.phaseUntilTick = r;
    h.telegraphStartTick = tick;
    emitTelegraph(h, tick, h.x, h.z, h.blastRadius, r, { cause });
  }

  // -------------------------------------------------------------- discrete --
  let blockersDirty = false;
  function discrete() {
    const tick = getTick();
    for (const h of registry.all()) {
      if (h.kind !== 'hazard' || !registry.byId(h.id)) continue;
      if (h.forcePhase) {
        const f = h.forcePhase;
        h.forcePhase = null;
        forcePhase(h, f, tick);
        continue;
      }
      if (dormant) continue;
      if (h.htype === 'puffcap') stepPuffcap(h, tick);
      else if (h.htype === 'millrace') stepMillrace(h, tick);
      else if (h.htype === 'rockfall') stepRockfall(h, tick);
      else if (h.htype === 'gravefire') stepGravefire(h, tick);
    }
  }

  function stepPuffcap(h, tick) {
    const T = HAZARD_TYPES.puffcap;
    if (h.phase === 'idle' && tick >= h.phaseUntilTick) startSwell(h, tick, 'cycle');
    else if (h.phase === 'telegraph' && tick >= h.resolveTick) burstPuffcap(h, tick);
    else if (h.phase === 'cooldown' && tick >= h.phaseUntilTick) {
      h.phase = 'idle';
      h.phaseUntilTick = tick + T.idleTicks;
    }
  }

  function burstPuffcap(h, tick) {
    const T = HAZARD_TYPES.puffcap;
    const victims = hurt(h, h.x, h.z, h.blastRadius, T.damage);
    h.bursts += 1;
    h.phase = 'cooldown';
    h.resolveTick = null;
    h.phaseUntilTick = tick + T.cooldownTicks;
    events.emit(tick, 'hazard_resolve', {
      id: h.id,
      htype: h.htype,
      x: r2(h.x),
      z: r2(h.z),
      radius: h.blastRadius,
      victims,
      telegraphTicks: tick - (h.telegraphStartTick ?? tick),
    });
  }

  function stepMillrace(h, tick) {
    const T = HAZARD_TYPES.millrace;
    if (tick < h.stoppedUntilTick) return;
    if (h.phase === 'idle' && tick >= h.nextSurgeTick - T.telegraphTicks) {
      const r = reserve(tick, Math.max(h.nextSurgeTick, tick + T.telegraphTicks));
      h.phase = 'telegraph';
      h.resolveTick = r;
      h.phaseUntilTick = r;
      h.telegraphStartTick = tick;
      emitTelegraph(h, tick, h.x, h.z, h.radius, r, { lane: { ...h.lane } });
    } else if (h.phase === 'telegraph' && tick >= h.resolveTick) {
      h.phase = 'active';
      h.phaseUntilTick = tick + T.surgeTicks;
      h.surgeHits = [];
      h.surges += 1;
      events.emit(tick, 'hazard_resolve', {
        id: h.id,
        htype: h.htype,
        x: r2(h.x),
        z: r2(h.z),
        radius: h.radius,
        telegraphTicks: tick - (h.telegraphStartTick ?? tick),
        surge: true,
      });
      surgeDamage(h, tick);
      h.nextSurgeTick = tick + T.surgeEvery;
    } else if (h.phase === 'active') {
      surgeDamage(h, tick);
      if (tick >= h.phaseUntilTick) {
        h.phase = 'idle';
        h.resolveTick = null;
        events.emit(tick, 'millrace_calm', { id: h.id });
      }
    }
  }

  function surgeDamage(h, tick) {
    const T = HAZARD_TYPES.millrace;
    const fresh = [];
    for (const t of registry.all()) {
      if (!damageable(t, h) || !isGround(t) || h.surgeHits.includes(t.id)) continue;
      if (!isMobile(t) && t.faction !== 'neutral') continue;
      if (laneLocal(h, t.x, t.z).inside) fresh.push(t);
    }
    for (const t of fresh) {
      h.surgeHits.push(t.id);
      if (!registry.byId(t.id) || !(t.hp > 0)) continue;
      combat.applyDamage(t, T.damage, {
        delivery: 'hazard',
        shape: 'hazard',
        dirX: h.dirX,
        dirZ: h.dirZ,
        attacker: h.id,
        source: h.htype,
      });
    }
    void tick;
  }

  // Sluice Lever (interactables.js): stop a millrace's current + surges.
  function stopMillrace(id, ticks) {
    const h = registry.byId(id);
    if (!h || h.htype !== 'millrace') return null;
    const tick = getTick();
    const T = HAZARD_TYPES.millrace;
    const wasSurging = h.phase === 'telegraph' || h.phase === 'active';
    h.stoppedUntilTick = tick + ticks;
    h.phase = 'idle';
    h.resolveTick = null;
    h.surgeHits = [];
    h.nextSurgeTick = Math.max(h.nextSurgeTick, h.stoppedUntilTick + T.surgeEvery / 2);
    events.emit(tick, 'millrace_stop', { id, untilTick: h.stoppedUntilTick, cancelledSurge: wasSurging });
    return h.stoppedUntilTick;
  }

  function stepRockfall(h, tick, force = false) {
    const T = HAZARD_TYPES.rockfall;
    if (h.telegraph) {
      if (tick >= h.telegraph.resolveTick) resolveRock(h, tick);
      return;
    }
    if (h.next >= h.schedule.length || tick < h.schedule[h.next]) return;
    const party = registry
      .all()
      .filter((e) => e.partyIndex !== undefined && e.hp > 0)
      .sort((a, b) => a.partyIndex - b.partyIndex);
    if (party.length === 0) return;
    if (!force && governor && !governor.grants(tick)) return; // player-targeted: waits its turn
    const target = party[h.pick[h.next] % party.length];
    const r = reserve(tick, tick + T.telegraphTicks);
    h.telegraph = {
      kind: 'ring',
      startTick: tick,
      resolveTick: r,
      x: target.x,
      z: target.z,
      dirX: 0,
      dirZ: 1,
      radius: T.radius,
      playerTargeted: true,
      targetId: target.id,
    };
    h.x = target.x;
    h.z = target.z;
    h.px = h.x;
    h.pz = h.z;
    h.phase = 'telegraph';
    h.phaseUntilTick = r;
    h.resolveTick = r;
    if (governor) governor.noteStart(tick);
    emitTelegraph(h, tick, target.x, target.z, T.radius, r, { target: target.id });
    events.emit(tick, 'telegraph_start', {
      id: h.id,
      etype: 'rockfall',
      shape: 'ring',
      target: target.id,
      x: r2(target.x),
      z: r2(target.z),
      resolveTick: r,
      playerTargeted: true,
    });
  }

  function resolveRock(h, tick) {
    const T = HAZARD_TYPES.rockfall;
    const t = h.telegraph;
    const victims = hurt(h, t.x, t.z, t.radius, T.damage);
    h.telegraph = null;
    h.phase = 'idle';
    h.resolveTick = null;
    h.next += 1;
    h.drops += 1;
    events.emit(tick, 'telegraph_resolve', { id: h.id, playerTargeted: true });
    events.emit(tick, 'hazard_resolve', {
      id: h.id,
      htype: h.htype,
      x: r2(t.x),
      z: r2(t.z),
      radius: t.radius,
      victims,
      telegraphTicks: tick - t.startTick,
    });
    events.emit(tick, 'screenshake', {
      cause: 'rockfall',
      amp: SCREENSHAKE.amp,
      durationSec: SCREENSHAKE.durationSec,
      x: r2(t.x),
      z: r2(t.z),
    });
    // Rubble: temporary cover, <= 2 at once (the oldest crumbles first).
    const rubble = registry.all().filter((e) => e.kind === 'rubble');
    while (rubble.length >= T.maxRubble) {
      const old = rubble.shift();
      events.emit(tick, 'rubble_crumble', { id: old.id, cause: 'cap', x: r2(old.x), z: r2(old.z) });
      registry.despawn(old.id);
    }
    const rb = registry.spawn({
      kind: 'rubble',
      faction: 'neutral',
      x: t.x,
      z: t.z,
      px: t.x,
      pz: t.z,
      radius: T.rubbleR,
      collider: { r: T.rubbleR },
      blocksMovement: true,
      blocksProjectiles: true,
      startTick: tick,
      untilTick: tick + T.rubbleTicks,
      hazardId: h.id,
    });
    events.emit(tick, 'rubble_spawn', { id: rb.id, x: r2(t.x), z: r2(t.z), radius: T.rubbleR, untilTick: rb.untilTick });
    blockersDirty = true;
  }

  function stepGravefire(h, tick) {
    const T = HAZARD_TYPES.gravefire;
    if (tick >= h.cycleStart + T.cycleTicks) {
      h.cycleStart = reserveLine(tick, h.cycleStart + T.cycleTicks);
      h.cycles += 1;
    }
    let lineMax = 'idle';
    h.vents.forEach((v, i) => {
      const t0 = h.cycleStart + i * T.stagger;
      const tA = t0 + T.telegraphTicks;
      const tE = tA + T.activeTicks;
      let ph = 'idle';
      if (tick >= t0 && tick < tA) ph = 'telegraph';
      else if (tick >= tA && tick < tE) ph = 'active';
      if (ph !== v.phase) {
        if (ph === 'telegraph') {
          v.hits = [];
          emitTelegraph(h, tick, v.x, v.z, T.radius, tA, { vent: i });
        } else if (ph === 'active') {
          events.emit(tick, 'hazard_resolve', {
            id: h.id,
            htype: h.htype,
            vent: i,
            x: r2(v.x),
            z: r2(v.z),
            radius: T.radius,
            telegraphTicks: T.telegraphTicks,
          });
        }
        v.phase = ph;
        v.phaseUntilTick = ph === 'telegraph' ? tA : ph === 'active' ? tE : t0 + T.cycleTicks;
      }
      if (ph === 'active') {
        const fresh = [];
        for (const t of registry.all()) {
          if (!damageable(t, h) || t.burrowed || v.hits.includes(t.id)) continue;
          if (Math.hypot(t.x - v.x, t.z - v.z) <= T.radius + (t.radius ?? 0)) fresh.push(t);
        }
        for (const t of fresh) {
          v.hits.push(t.id);
          const dx = t.x - v.x;
          const dz = t.z - v.z;
          const l = Math.hypot(dx, dz);
          combat.applyDamage(t, T.damage, {
            delivery: 'hazard',
            shape: 'hazard',
            dirX: l > 1e-6 ? dx / l : 0,
            dirZ: l > 1e-6 ? dz / l : 1,
            attacker: h.id,
            source: h.htype,
          });
        }
      }
      if (ph === 'active' || (ph === 'telegraph' && lineMax === 'idle')) lineMax = ph;
    });
    h.phase = lineMax;
  }

  // --- debug: hazardPhase(id, phase) — forced at the next tick boundary.
  function forcePhase(h, phase, tick) {
    if (h.htype === 'puffcap') {
      const T = HAZARD_TYPES.puffcap;
      if (phase === 'telegraph') {
        h.phase = 'telegraph';
        h.resolveTick = tick + T.telegraphTicks;
        h.phaseUntilTick = h.resolveTick;
        h.telegraphStartTick = tick;
        emitTelegraph(h, tick, h.x, h.z, h.blastRadius, h.resolveTick, { cause: 'debug' });
      } else if (phase === 'active') burstPuffcap(h, tick);
      else if (phase === 'cooldown') {
        h.phase = 'cooldown';
        h.phaseUntilTick = tick + T.cooldownTicks;
      } else {
        h.phase = 'idle';
        h.phaseUntilTick = tick + T.idleTicks;
      }
    } else if (h.htype === 'millrace') {
      const T = HAZARD_TYPES.millrace;
      h.stoppedUntilTick = 0;
      if (phase === 'telegraph') {
        h.phase = 'telegraph';
        h.resolveTick = tick + T.telegraphTicks;
        h.phaseUntilTick = h.resolveTick;
        h.telegraphStartTick = tick;
        h.nextSurgeTick = h.resolveTick;
        emitTelegraph(h, tick, h.x, h.z, h.radius, h.resolveTick, { lane: { ...h.lane }, cause: 'debug' });
      } else if (phase === 'active') {
        h.phase = 'telegraph';
        h.resolveTick = tick;
        h.telegraphStartTick = tick;
        stepMillrace(h, tick);
      } else {
        h.phase = 'idle';
        h.nextSurgeTick = tick + T.surgeEvery;
      }
    } else if (h.htype === 'rockfall') {
      if (phase === 'telegraph' || phase === 'active') {
        h.telegraph = null;
        if (h.next >= h.schedule.length) h.schedule.push(tick);
        else h.schedule[h.next] = tick;
        stepRockfall(h, tick, true); // a forced drop ignores the cadence governor
        if (phase === 'active' && h.telegraph) resolveRock(h, tick);
      } else {
        h.telegraph = null;
        h.phase = 'idle';
      }
    } else if (h.htype === 'gravefire') {
      const T = HAZARD_TYPES.gravefire;
      if (phase === 'telegraph') h.cycleStart = tick;
      else if (phase === 'active') h.cycleStart = tick - T.telegraphTicks;
      else h.cycleStart = tick + T.cycleTicks;
      stepGravefire(h, tick);
    }
  }

  function setDormant(on) {
    const tick = getTick();
    dormant = !!on;
    if (!dormant) return;
    for (const h of registry.all()) {
      if (h.kind !== 'hazard') continue;
      const live = h.phase === 'telegraph' || h.phase === 'active' || h.telegraph;
      if (h.telegraph) {
        h.telegraph = null;
        events.emit(tick, 'telegraph_cancel', { id: h.id, etype: h.htype, reason: 'room_clear', playerTargeted: true });
      }
      if (h.htype !== 'bramble' && h.htype !== 'slip') h.phase = 'idle';
      if (h.vents) for (const v of h.vents) v.phase = 'idle';
      if (live) events.emit(tick, 'hazard_cancel', { id: h.id, htype: h.htype, cause: 'room_clear' });
    }
  }

  function view() {
    const tick = getTick();
    return registry
      .all()
      .filter((e) => e.kind === 'hazard' || e.kind === 'rubble')
      .map((h) => ({
        id: h.id,
        kind: h.kind,
        htype: h.htype ?? 'rubble',
        x: r2(h.x),
        z: r2(h.z),
        radius: h.radius,
        phase: h.phase ?? 'active',
        phaseUntilTick: h.phaseUntilTick ?? null,
        resolveTick: h.resolveTick ?? null,
        ...(h.lane ? { lane: { ...h.lane }, stopped: tick < h.stoppedUntilTick, stoppedUntilTick: h.stoppedUntilTick, nextSurgeTick: h.nextSurgeTick } : {}),
        ...(h.vents ? { vents: h.vents.map((v) => ({ x: v.x, z: v.z, phase: v.phase })), cycleStart: h.cycleStart } : {}),
        ...(h.htype === 'rockfall' ? { next: h.schedule[h.next] ?? null, drops: h.drops, telegraph: h.telegraph ? { ...h.telegraph } : null } : {}),
        ...(h.kind === 'rubble' ? { untilTick: h.untilTick } : {}),
        ...(h.htype === 'puffcap' ? { bursts: h.bursts } : {}),
        ...(h.htype === 'slip' ? { skin: h.skin, grip: h.grip } : {}),
        ...(h.htype !== 'slip' && h.skin ? { skin: h.skin } : {}), // Act IV's vein gravefire (dressing only)
      }));
  }

  return {
    spawnHazard,
    despawnAll,
    continuous,
    discrete,
    stopMillrace,
    setDormant,
    isDormant: () => dormant,
    reserve,
    view,
    takeBlockersDirty() {
      const d = blockersDirty;
      blockersDirty = false;
      return d;
    },
    serialize: () => ({ dormant, reservations: reservations.map((r) => ({ ...r })) }),
    restore(data) {
      dormant = !!(data && data.dormant);
      reservations = data && Array.isArray(data.reservations) ? data.reservations.map((r) => ({ a: r.a, b: r.b })) : [];
    },
    // Save system (PLAN §3.4, M2): serialize() + the blocker-refresh flag.
    saveState: () => ({ dormant, reservations, blockersDirty }),
    loadState(data) {
      dormant = !!(data && data.dormant);
      reservations = data && Array.isArray(data.reservations) ? data.reservations : [];
      blockersDirty = !!(data && data.blockersDirty);
    },
    resolveOverlaps(x, z, radius) {
      // A new blocker landing on bodies pushes them out at once.
      for (const e of registry.all()) {
        if (!isMobile(e) || e.flier || e.burrowed) continue;
        if (Math.hypot(e.x - x, e.z - z) < radius + (e.radius ?? 0)) resolveStatics(e, e.radius);
      }
    },
  };
}

// --------------------------------------------------------------------------
// Layout director: the per-room placement lifecycle (PLAN §3.6 (a)). run.js
// (M4a) calls enter(layout, tick) at the room-enter point and exit(tick) at
// room exit / run end; the ?room= harness calls setLayout(id). Boss and shop
// rooms spawn nothing (BUILD_BRIEF §23.7). Owns no gameplay-RNG draws.
export function createLayoutSystem({ registry, events, getTick, hazards, interactables, getRunView = () => null, getRoomMode = () => null, getSeed = () => 0 }) {
  let active = null; // { layoutId, act, biome, room, mode, spawned }

  function place(layoutId, { room = null, act = null, mode = null } = {}) {
    const tick = getTick();
    clear(tick, 'relayout');
    const L = LAYOUTS[layoutId];
    if (!L) {
      active = null;
      return null;
    }
    const m = mode ?? 'kill_all';
    const spawn = m === 'kill_all' || m === 'defend' || m === 'hunt' || m === 'purge';
    active = { layoutId, act: act ?? L.act, biome: L.biome, room, mode: m, spawned: spawn };
    hazards.setDormant(false);
    if (spawn) {
      const laneIds = [];
      for (const p of L.hazards) {
        if (p.minRoom && room !== null && room < p.minRoom) continue;
        const h = hazards.spawnHazard(p.type, p.x ?? 0, p.z ?? 0, { ...p, room: room ?? 0, layoutId });
        if (h && p.type === 'millrace') laneIds.push(h.id);
      }
      for (const p of L.interactables) {
        const params = { ...p };
        if (p.type === 'sluice') params.laneIds = (p.lanes ?? [0]).map((i) => laneIds[i]).filter((v) => v !== undefined);
        interactables.spawnInteractable(p.type, p.x, p.z, params);
      }
      interactables.refreshBlockers();
    }
    events.emit(tick, 'layout_placed', {
      layoutId,
      act: active.act,
      biome: active.biome,
      room,
      mode: m,
      hazards: registry.all().filter((e) => e.kind === 'hazard').length,
      interactables: registry.all().filter((e) => e.interactable || e.kind === 'barricade' || e.kind === 'keg').length,
    });
    return { ...active };
  }

  function clear(tick = getTick(), cause = 'room_exit') {
    hazards.despawnAll(tick, cause);
    interactables.despawnAll(tick, cause);
    interactables.refreshBlockers();
  }

  function enter(layout, tick) {
    const run = getRunView() || {};
    const id = typeof layout === 'number' ? layout : layout && (layout.layoutId ?? layout.id);
    return place(id, {
      room: (layout && layout.room) ?? run.room ?? null,
      act: (layout && layout.act) ?? null,
      mode: (layout && layout.mode) ?? run.mode ?? null,
    });
    void tick;
  }

  function exit(tick) {
    clear(tick ?? getTick(), 'room_exit');
    active = null;
  }

  function continuous() {
    hazards.continuous();
    interactables.continuous();
    if (hazards.takeBlockersDirty()) interactables.refreshBlockers();
  }

  function discrete(snapshot) {
    interactables.discrete(snapshot);
    hazards.discrete();
    if (hazards.takeBlockersDirty()) {
      interactables.refreshBlockers();
      for (const r of registry.all()) if (r.kind === 'rubble' && r.startTick === getTick()) hazards.resolveOverlaps(r.x, r.z, r.radius);
    }
  }

  function onRoomCleared() {
    hazards.setDormant(true);
    interactables.setDormant(true);
  }

  // Debug commands (PLAN §6.4). Each returns plain data or undefined (not ours).
  function cmd(name, args) {
    switch (name) {
      case 'spawnHazard': {
        const [htype, x, z, params] = args;
        const h = hazards.spawnHazard(htype, x ?? 0, z ?? 0, { ...(params || {}), room: active?.room ?? 0, layoutId: active?.layoutId ?? 0 });
        interactables.refreshBlockers();
        return h ? h.id : null;
      }
      case 'spawnInteractable': {
        const [itype, x, z, params] = args;
        const e = interactables.spawnInteractable(itype, x ?? 0, z ?? 0, params || {});
        interactables.refreshBlockers();
        return e ? e.id : null;
      }
      case 'hazardPhase': {
        const [id, phase] = args;
        const h = registry.byId(id);
        if (!h || h.kind !== 'hazard') return null;
        if (!['idle', 'telegraph', 'active', 'cooldown'].includes(phase)) return null;
        hazards.setDormant(false);
        h.forcePhase = phase;
        return { id, htype: h.htype, forced: phase, atTick: getTick() + 1 };
      }
      case 'armKeg':
        return interactables.armKeg(args[0]);
      case 'interactPress': {
        // Same-tick presses from several party members (network seats; PLAN
        // §3.6 "a same-tick double use activates once"): args[0] = [partyIndex...].
        const idx = Array.isArray(args[0]) ? args[0] : [0];
        const actors = registry.all().filter((e) => e.partyIndex !== undefined && idx.includes(e.partyIndex));
        const before = registry.all().length;
        interactables.resolvePresses(actors.map((a) => ({ actor: a, press: { kind: 'interact' } })));
        void before;
        return actors.map((a) => a.partyIndex);
      }
      case 'setLayout': {
        const id = Number(args[0]);
        const run = getRunView() || {};
        const mode = run.active ? run.mode : getRoomMode() ?? 'kill_all';
        const r = place(id, { room: run.active ? run.room : null, mode });
        return r;
      }
      case 'clearLayout':
        clear(getTick(), 'debug');
        active = null;
        return true;
      case 'contentState':
        return probe();
      default:
        return undefined;
    }
  }

  function probe() {
    return {
      layout: active ? { ...active } : null,
      dormant: hazards.isDormant(),
      hazards: hazards.view(),
      interactables: interactables.view(),
    };
  }

  registerContentProbe('hazards', () => hazards.view());
  registerContentProbe('interactables', () => interactables.view());
  registerContentProbe('layout', () => (active ? { ...active, name: LAYOUTS[active.layoutId]?.name ?? null } : null));

  return {
    place,
    enter,
    exit,
    clear,
    continuous,
    discrete,
    onRoomCleared,
    cmd,
    probe,
    active: () => (active ? { ...active } : null),
    serialize: () => ({
      active: active ? { ...active } : null,
      hazards: hazards.serialize(),
      interactables: interactables.serialize(),
    }),
    restore(data) {
      active = data && data.active ? { ...data.active } : null;
      hazards.restore(data ? data.hazards : null);
      interactables.restore(data ? data.interactables : null);
      interactables.refreshBlockers();
    },
    // Save system (PLAN §3.4, M2): the complete director + hazard + asset
    // state. No blocker refresh here — the save layer restores the movement
    // module's collider list verbatim afterwards (it is tick-end exact).
    saveState: () => ({
      active,
      hazards: hazards.saveState(),
      interactables: interactables.serialize(),
    }),
    loadState(data) {
      if (!data) throw new TypeError('layout.loadState: missing data');
      active = data.active ?? null;
      hazards.loadState(data.hazards ?? null);
      interactables.restore(data.interactables ?? null);
    },
    getSeed,
  };
}
