// ELITE AFFIXES (content plan 2, slice 3; docs/ELITE_AFFIXES.md). An elite in
// a campaign room carries one or two named powers from a set of eight. Each
// power is plain data on the elite (`e.affixes = ['molten', ...]` plus a few
// clocks), so saves and co-op snapshots carry it for free, and each one
// shows itself: a name plate over the elite, its own aura, and an Ember
// telegraph before anything that hurts.
//
//   Molten     dies into a molten core; once the §11 governor allows, the
//              core swells under an Ember ring (1.0 s) and bursts, leaving a
//              burning pool for 4 s
//   Frozen     roots itself and charges a frost nova under an Ember ring
//              (1.0 s); the burst leaves a frost patch that slows by 45%
//   Vampiric   heals for 40% of the damage it deals
//   Warded     a ward shimmers for 0.75 s, then makes it immune for 2.5 s,
//              every 7.5 s (the Grave Wisp's hit_immune)
//   Blinking   marks a spot by its target with a ring for 0.7 s, then
//              blinks there (every 5.5 s, when the target is 3.2 u away)
//   Splitting  splits into two smaller copies when it dies (the Brood
//              Spider's split)
//   Hasted     moves 40% faster
//   Thorned    a party hit from within 2.6 u stings back for 20% (at most 8)
//
// The two damaging telegraphs (Molten, Frozen) are player-targeted and go
// through the §11 governor (two at most, starts 1.2 s apart). Every draw is a
// hash of the run seed, the level, the room and the elite's spawn ordinal,
// so affixes never touch the gameplay RNG; and the run only installs the
// rule in campaign rooms (never the tutorial, the legacy single-level run or
// the ?room= harness), so the nine golden traces never see one.
//
// Sim discipline: no DOM, no i18n (names are English and translated by the
// UI), no wall clock.

const r2 = (v) => Math.round(v * 100) / 100;

export const AFFIX_IDS = Object.freeze(['molten', 'frozen', 'vampiric', 'warded', 'blinking', 'splitting', 'hasted', 'thorned']);

// name / text are shown by the UI through t(). `not` lists enemy kinds the
// power never rolls on (a kind it would break or make pointless); `clash`
// lists powers it never shares an elite with.
export const AFFIXES = Object.freeze({
  molten: Object.freeze({ id: 'molten', name: 'Molten', text: 'Bursts into a burning pool when it dies.', not: Object.freeze([]), clash: Object.freeze(['frozen']) }),
  frozen: Object.freeze({ id: 'frozen', name: 'Frozen', text: 'Stops to charge a frost nova that slows.', not: Object.freeze(['gravewisp', 'censer']), clash: Object.freeze(['molten']) }),
  vampiric: Object.freeze({ id: 'vampiric', name: 'Vampiric', text: 'Heals for part of the damage it deals.', not: Object.freeze(['gravewisp', 'censer']), clash: Object.freeze([]) }),
  warded: Object.freeze({ id: 'warded', name: 'Warded', text: 'A ward makes it immune for a few seconds at a time.', not: Object.freeze([]), clash: Object.freeze([]) }),
  blinking: Object.freeze({ id: 'blinking', name: 'Blinking', text: 'Marks a spot beside you, then blinks to it.', not: Object.freeze(['mole', 'lamprey', 'gravewisp', 'censer']), clash: Object.freeze([]) }),
  splitting: Object.freeze({ id: 'splitting', name: 'Splitting', text: 'Splits into two smaller copies when it dies.', not: Object.freeze(['brood', 'broodling', 'knight', 'lamprey', 'gravewisp', 'censer']), clash: Object.freeze([]) }),
  hasted: Object.freeze({ id: 'hasted', name: 'Hasted', text: 'Moves much faster.', not: Object.freeze([]), clash: Object.freeze([]) }),
  thorned: Object.freeze({ id: 'thorned', name: 'Thorned', text: 'Hits from close range sting back.', not: Object.freeze(['gravewisp', 'censer']), clash: Object.freeze([]) }),
});

// Every number in one place (ticks at 60 Hz).
export const AFFIX_RULES = Object.freeze({
  molten: Object.freeze({ waitTicks: 180, swellTicks: 60, radius: 1.7, power: 14, poolRadius: 1.3, poolTicks: 240, burn: 3, burnEvery: 30 }),
  frozen: Object.freeze({ firstTicks: 120, cdTicks: 360, range: 3.0, windTicks: 60, radius: 2.4, power: 6, patchTicks: 90, slow: 0.45 }),
  vampiric: Object.freeze({ leech: 0.4 }),
  warded: Object.freeze({ firstTicks: 120, warnTicks: 45, onTicks: 150, offTicks: 255 }),
  blinking: Object.freeze({ firstTicks: 150, cdTicks: 330, minDist: 3.2, markTicks: 42, offset: 1.5 }),
  splitting: Object.freeze({ count: 2, hpFrac: 0.4, dmgFrac: 0.7, scale: 0.78, spread: 0.7 }),
  hasted: Object.freeze({ speed: 1.4 }),
  thorned: Object.freeze({ reflect: 0.2, cap: 8, reach: 2.6 }),
});

// How many powers an elite carries: one on Level I, one in rooms 1-3 and two
// from room 4 on Level II, two on Levels III and IV and at every Endless
// depth past the campaign (Depth 5 on; Depths 1-4 count as their level).
export function affixCountFor({ act = 1, room = 1, endless = false } = {}) {
  if (endless) return 2;
  if (act >= 3) return 2;
  if (act === 2) return room >= 4 ? 2 : 1;
  return 1;
}

// FNV-1a over a string -> uint32 (deterministic in every engine).
export function hash32(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// The powers for one elite: `count` distinct ids from those its kind may
// carry, never two that clash. Pure: (salt, ordinal, etype, count) -> ids.
export function rollAffixes(salt, ordinal, etype, count) {
  const out = [];
  let pool = AFFIX_IDS.filter((id) => !AFFIXES[id].not.includes(etype));
  for (let k = 0; k < count && pool.length > 0; k++) {
    const id = pool[hash32(`${salt}|${ordinal}|${k}`) % pool.length];
    out.push(id);
    pool = pool.filter((p) => p !== id && !AFFIXES[id].clash.includes(p));
  }
  return out;
}

export const hasAffix = (e, id) => !!(e && Array.isArray(e.affixes) && e.affixes.includes(id));

// The live logic. ctx (from sim/enemies.js): registry, events, combat,
// governor, spawnGlob, spawnChild, nearestTarget, stunned, movement
// ({ innerBounds, staticClearance, sweptContactT }).
export function createAffixLogic(ctx) {
  const { registry, events, combat, governor } = ctx;
  const R = AFFIX_RULES;

  // Arm a freshly spawned elite (its clocks, its speed factor).
  function arm(e, list, tick) {
    e.affixes = [...list];
    e.affixSpeed = hasAffix(e, 'hasted') ? R.hasted.speed : 1;
    if (hasAffix(e, 'frozen')) e.frostAt = tick + R.frozen.firstTicks;
    if (hasAffix(e, 'warded')) {
      e.wardAt = tick + R.warded.firstTicks;
      e.affixWard = null; // null | 'warn' | 'on'
    }
    if (hasAffix(e, 'blinking')) {
      e.blinkAt = tick + R.blinking.firstTicks;
      e.blink = null; // { x, z, at } while a spot is marked
    }
    events.emit(tick, 'elite_affixes', { id: e.id, etype: e.kind, affixes: [...list], x: r2(e.x), z: r2(e.z) });
  }

  const busy = (e, tick) => !!e.telegraph || !!e.burrowed || e.mode === 'charge' || e.mode === 'swoop' || ctx.stunned(e, tick) || e.kbTicks > 0;

  // Discrete phase, once per affixed elite per tick (after its own resolve).
  function resolve(e, tick) {
    if (e.state !== 'active' || !(e.hp > 0)) return;
    const base = hasAffix(e, 'hasted') ? R.hasted.speed : 1;
    // WARDED: shimmer, then immune, then a rest.
    if (hasAffix(e, 'warded')) {
      const W = R.warded;
      if (e.affixWard === null && tick >= e.wardAt) {
        e.affixWard = 'warn';
        e.wardAt = tick + W.warnTicks;
        events.emit(tick, 'affix_ward', { id: e.id, stage: 'warn', untilTick: e.wardAt, x: r2(e.x), z: r2(e.z) });
      } else if (e.affixWard === 'warn' && tick >= e.wardAt) {
        e.affixWard = 'on';
        e.wardAt = tick + W.onTicks;
        events.emit(tick, 'affix_ward', { id: e.id, stage: 'on', untilTick: e.wardAt, x: r2(e.x), z: r2(e.z) });
      } else if (e.affixWard === 'on' && tick >= e.wardAt) {
        e.affixWard = null;
        e.wardAt = tick + W.offTicks;
        e.iframeUntilTick = Math.min(e.iframeUntilTick ?? 0, tick);
        events.emit(tick, 'affix_ward', { id: e.id, stage: 'off', x: r2(e.x), z: r2(e.z) });
      }
      // Kept live through both phases of the tick (the wisp's own rule).
      if (e.affixWard === 'on') e.iframeUntilTick = Math.max(e.iframeUntilTick ?? 0, tick + 2);
    }
    // FROZEN: a rooted wind-up under its own ring (the glob carries it).
    let speed = base;
    if (hasAffix(e, 'frozen')) {
      const F = R.frozen;
      if (e.frostUntil > tick) speed = 0;
      else if (tick >= e.frostAt && !busy(e, tick)) {
        const foe = ctx.nearestTarget(e);
        const near = foe && foe.partyIndex !== undefined && Math.hypot(foe.x - e.x, foe.z - e.z) <= F.range;
        if (near && governor.grants(tick)) {
          ctx.spawnGlob(e, tick, {
            tx: e.x,
            tz: e.z,
            flightTicks: F.windTicks,
            radius: F.radius,
            power: F.power * (e.dmgMul ?? 1),
            slickRadius: F.radius,
            slickTicks: F.patchTicks,
            slickSlow: F.slow,
            slickVariant: 'frost',
            playerTargeted: true,
            targetId: foe.id,
            affix: 'frozen',
          });
          e.frostUntil = tick + F.windTicks;
          e.frostAt = tick + F.cdTicks;
          speed = 0;
          events.emit(tick, 'affix_frost', { id: e.id, x: r2(e.x), z: r2(e.z), resolveTick: tick + F.windTicks });
        }
      }
    }
    e.affixSpeed = speed;
    // BLINKING: mark a spot by the target, then appear there.
    if (hasAffix(e, 'blinking')) {
      const B = R.blinking;
      if (e.blink) {
        if (tick >= e.blink.at) {
          const to = e.blink;
          e.blink = null;
          if (!busy(e, tick)) {
            const fx = e.x;
            const fz = e.z;
            e.x = e.px = to.x;
            e.z = e.pz = to.z;
            events.emit(tick, 'affix_blink', { id: e.id, fromX: r2(fx), fromZ: r2(fz), x: r2(to.x), z: r2(to.z) });
          }
        }
      } else if (tick >= e.blinkAt && !busy(e, tick)) {
        const foe = ctx.nearestTarget(e);
        if (foe && Math.hypot(foe.x - e.x, foe.z - e.z) >= B.minDist) {
          const spot = blinkSpot(e, foe);
          e.blinkAt = tick + B.cdTicks;
          if (spot) {
            e.blink = { x: spot.x, z: spot.z, at: tick + B.markTicks, startTick: tick };
            events.emit(tick, 'affix_blink_mark', { id: e.id, x: r2(spot.x), z: r2(spot.z), atTick: e.blink.at });
          }
        }
      }
    }
  }

  // A clear spot `offset` from the target on the elite's side: the straight
  // line from the target to it must be free of props and walls (the target
  // stands on open ground, so the spot does too).
  function blinkSpot(e, foe) {
    const M = ctx.movement;
    const dx = e.x - foe.x;
    const dz = e.z - foe.z;
    const l = Math.hypot(dx, dz) || 1;
    for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) {
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      const ux = (dx / l) * c - (dz / l) * s;
      const uz = (dx / l) * s + (dz / l) * c;
      const off = R.blinking.offset + (foe.radius ?? 0.3) + e.radius;
      const { mx, mz } = M.innerBounds(e.radius);
      const x = Math.min(mx, Math.max(-mx, foe.x + ux * off));
      const z = Math.min(mz, Math.max(-mz, foe.z + uz * off));
      if (M.sweptContactT(foe.x, foe.z, x - foe.x, z - foe.z, e.radius) < 1) continue;
      if (M.staticClearance(x, z, e.radius) < 0) continue;
      return { x, z };
    }
    return null;
  }

  // A `hit` on the bus: Vampiric leech and Thorned sting.
  function onHit(ev) {
    if (!(ev.amount > 0)) return;
    const tick = ev.tick;
    const atk = ev.attacker != null ? registry.byId(ev.attacker) : null;
    if (atk && atk.faction === 'hostile' && hasAffix(atk, 'vampiric') && atk.hp > 0 && atk.state === 'active') {
      const tgt = registry.byId(ev.target);
      if (tgt && tgt.faction === 'party') {
        const gain = Math.min(atk.maxHp - atk.hp, ev.amount * R.vampiric.leech);
        if (gain > 0) {
          atk.hp += gain;
          events.emit(tick, 'affix_leech', { id: atk.id, target: ev.target, amount: r2(gain), x: r2(atk.x), z: r2(atk.z) });
        }
      }
    }
    const tgt = registry.byId(ev.target);
    if (tgt && hasAffix(tgt, 'thorned') && atk && atk.partyIndex !== undefined && atk.hp > 0) {
      const T = R.thorned;
      const d = Math.hypot(atk.x - tgt.x, atk.z - tgt.z);
      if (d > T.reach + (atk.radius ?? 0) + tgt.radius) return;
      const back = Math.min(T.cap, ev.amount * T.reflect);
      events.emit(tick, 'affix_thorns', { id: tgt.id, target: atk.id, x: r2(tgt.x), z: r2(tgt.z) });
      const l = d > 1e-6 ? d : 1;
      combat.applyDamage(atk, back, { delivery: 'contact', shape: 'thorns', dirX: (atk.x - tgt.x) / l, dirZ: (atk.z - tgt.z) / l, attacker: tgt.id, source: 'thorned' });
    }
  }

  // The `death` of an affixed elite (fired before its body is despawned).
  function onDeath(e, tick) {
    if (hasAffix(e, 'molten')) {
      const M = R.molten;
      const core = registry.spawn({
        kind: 'affix_core',
        faction: 'neutral',
        x: e.x,
        z: e.z,
        px: e.x,
        pz: e.z,
        radius: 0.3,
        ownerKind: e.kind,
        power: M.power * (e.dmgMul ?? 1),
        startTick: tick,
        untilTick: tick + M.waitTicks,
      });
      events.emit(tick, 'affix_core', { id: core.id, owner: e.id, x: r2(e.x), z: r2(e.z) });
    }
    if (hasAffix(e, 'splitting')) {
      const S = R.splitting;
      const baseHp = e.maxHp / (e.elite ? 1.8 : 1);
      const ids = [];
      for (let i = 0; i < S.count; i++) {
        const a = Math.atan2(e.faceZ ?? 1, e.faceX ?? 0) + Math.PI / 2 + i * Math.PI;
        const st = ctx.statsOf(e.kind);
        const hpMul = (baseHp / (st ? st.hp : baseHp)) * S.hpFrac;
        const dmgMul = ((e.dmgMul ?? 1) / (e.elite ? 1.25 : 1)) * S.dmgFrac;
        const c = ctx.spawnChild(e.kind, e.x + Math.cos(a) * S.spread, e.z + Math.sin(a) * S.spread, { hpMul, dmgMul, wave: e.wave, noAffix: true });
        if (!c) continue;
        c.splitling = true;
        c.scale = S.scale;
        c.radius = r2(c.radius * S.scale);
        ids.push(c.id);
      }
      if (ids.length) events.emit(tick, 'affix_split', { id: e.id, etype: e.kind, x: r2(e.x), z: r2(e.z), brood: ids });
    }
  }

  // Molten cores: wait for the governor, then swell and burst (as a glob
  // that lands where it lies). A core that never gets a slot fizzles.
  function stepCores(tick) {
    for (const c of registry.all()) {
      if (c.kind !== 'affix_core') continue;
      if (tick >= c.untilTick) {
        events.emit(tick, 'affix_core_end', { id: c.id, cause: 'fizzle' });
        registry.despawn(c.id);
        continue;
      }
      if (!governor.grants(tick)) continue;
      const M = R.molten;
      ctx.spawnGlob({ id: c.id, kind: c.ownerKind, x: c.x, z: c.z }, tick, {
        tx: c.x,
        tz: c.z,
        flightTicks: M.swellTicks,
        radius: M.radius,
        power: c.power,
        slickRadius: M.poolRadius,
        slickTicks: M.poolTicks,
        slickSlow: 0,
        slickVariant: 'molten',
        slickBurn: M.burn,
        playerTargeted: true,
        targetId: null,
        affix: 'molten',
      });
      events.emit(tick, 'affix_core_end', { id: c.id, cause: 'burst' });
      registry.despawn(c.id);
    }
  }

  return { arm, resolve, onHit, onDeath, stepCores };
}
