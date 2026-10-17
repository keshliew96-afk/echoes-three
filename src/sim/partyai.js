// AI policy for AI-held seats (BUILD_BRIEF §25.8, PLAN §16.3). Owner: PARTY.
//
// Deterministic, state-only, no RNG, ascending ids — the same code serves
// Suggested pre-picks, Automatic mode, host-built seats, timeouts, starter
// grants and catch-ups.
//
// CAST (every tick, AI-held seats only): walk the equipped slots ascending;
// fire the first ACTIVE that is off cooldown and whose §25.2 AI rule holds;
// else the §7 basic. Range tests use the RESOLVED definition. The idle
// fallback casts an active that has been ready ≥ 480 ticks under the §7 range
// rule, so no equipped skill idles. For the 12 starting skills the AI rule IS
// the §7 range rule, so an unbuilt party casts exactly as v0.5.150.
import { AI_IDLE_FALLBACK_TICKS, AI_ENGAGE, AI_DUSK, swapSuggestion } from '../data/classes.js';
import { shapeRange } from './allycast.js';
import { CHAMPION_IDS } from './champions.js';

const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

// Does a live telegraph cover (x, z)? (rings + lanes, a small margin)
export function telegraphCovers(registry, x, z, tick) {
  for (const e of registry.all()) {
    const t = e.telegraph;
    if (!t || !(e.faction === 'hostile' || e.kind === 'hazard')) continue;
    if (Number.isFinite(t.resolveTick) && t.resolveTick < tick) continue;
    const kind = t.kind ?? (e.kind === 'mantis' ? 'lane' : 'ring');
    if (kind === 'lane') {
      const fx = t.fromX ?? e.x;
      const fz = t.fromZ ?? e.z;
      const dx = t.dirX ?? (t.x ?? e.x) - fx;
      const dz = t.dirZ ?? (t.z ?? e.z) - fz;
      const l = Math.hypot(dx, dz) || 1;
      const len = t.length ?? Math.hypot((t.x ?? e.x) - fx, (t.z ?? e.z) - fz);
      const ux = dx / l;
      const uz = dz / l;
      const px = x - fx;
      const pz = z - fz;
      const along = px * ux + pz * uz;
      if (along < -0.3 || along > Math.max(len, 1) + 0.3) continue;
      const across = Math.abs(px * uz - pz * ux);
      if (across <= (t.width ?? 0.7) / 2 + 0.3) return true;
    } else {
      const cx = kind === 'cone' ? e.x : t.x ?? e.x;
      const cz = kind === 'cone' ? e.z : t.z ?? e.z;
      const r = (kind === 'cone' ? t.length ?? t.radius ?? 1.8 : t.radius ?? 1.0) + 0.3;
      if (d2(x, z, cx, cz) <= r * r) return true;
    }
  }
  return false;
}

// THE TIDECALLER: a live soak on an enemy (sim/status.js).
const CHAMPIONS = new Set(CHAMPION_IDS);
const soakedNow = (e, tick) => !!(e && e.status && e.status.soaked && e.status.soaked.untilTick > tick);
// THE BELLWRIGHT: the bells a seat has hung (its azones flagged `bell`).
const bellsOf = (registry, id) => registry.all().filter((z) => z.kind === 'azone' && z.bell && z.sourceId === id);
// THE DUSKWING: a live blind, and the enemies a cone from (x, z) along u holds.
const blindNow = (e, tick) => !!(e && e.status && e.status.blind && e.status.blind.untilTick > tick);
const isBig = (e) => e.elite || CHAMPIONS.has(e.kind) || e.champion || e.boss === true || e.kind === 'stag';
function inCone(list, x, z, ux, uz, reach, halfDeg) {
  const c = Math.cos((halfDeg * Math.PI) / 180);
  return list.filter((o) => {
    const dx = o.x - x;
    const dz = o.z - z;
    const d = Math.hypot(dx, dz);
    if (d > reach) return false;
    return d < 1e-3 || (dx * ux + dz * uz) / d >= c;
  });
}

// castChoice(a, tick, ctx) -> { slot, def, target } | null
//   ctx: { registry, slots (ids ×4), resolve(def), baseDef(id), cds (a.cds),
//          readySince (per-slot tick an active became ready), hostiles,
//          party, healer, waystone, combo (seat state), leashOk(x, z),
//          engage (campaign engagement rules on, AI_ENGAGE), reachOk(e) }
export function castChoice(a, target, tick, ctx) {
  const { slots } = ctx;
  const hostiles = ctx.hostiles();
  const near = (x, z, r) => hostiles.filter((e) => d2(e.x, e.z, x, z) <= r * r);
  const dist = (e) => Math.hypot(e.x - a.x, e.z - a.z);
  if (ctx.engage) {
    // fix-M4a-r5 (GP.8): an OVERDUE active is served first — its own rule,
    // else the nearest hostile in its reach (a melee delivery lunging the last
    // <= AI_ENGAGE.lungeU) — so a higher slot never starves a lower one.
    for (let slot = 0; slot < slots.length; slot++) {
      const id = slots[slot];
      if (!id) continue;
      const base = ctx.baseDef(id);
      if (!base || base.shape === 'aura') continue;
      if (tick < (ctx.cds[slot] ?? 0)) continue;
      const since = ctx.readySince ? ctx.readySince[slot] : null;
      const wait = ctx.castThisRoom && !ctx.castThisRoom(slot) ? AI_ENGAGE.firstUseTicks : AI_IDLE_FALLBACK_TICKS;
      if (!(Number.isFinite(since) && tick - since >= wait)) continue;
      const def = ctx.resolve(base);
      const pick = ruleFor(a, id, def, target, tick, ctx, { near, dist, hostiles });
      if (pick) return { slot, def: base, target: pick };
      if (def.archetype === 'guard') continue;
      const r = shapeRange(def);
      const melee = (def.shape === 'melee_arc' || def.shape === 'nova') && !def.parry;
      const reach = melee || def.parry ? r + AI_ENGAGE.lungeU : r;
      let best = null;
      for (const e of hostiles) {
        const d = dist(e);
        if (d > reach || (ctx.reachOk && !ctx.reachOk(e))) continue;
        if (!best || d < best.d || (d === best.d && e.id < best.e.id)) best = { e, d };
      }
      if (best) return { slot, def: base, target: best.e, fallback: true, lunge: melee && best.d > r * AI_ENGAGE.commitStandFrac };
    }
  }
  for (let slot = 0; slot < slots.length; slot++) {
    const id = slots[slot];
    if (!id) continue;
    const base = ctx.baseDef(id);
    if (!base || base.shape === 'aura') continue; // passives are always on
    if (tick < (ctx.cds[slot] ?? 0)) continue;
    const def = ctx.resolve(base);
    const pick = ruleFor(a, id, def, target, tick, ctx, { near, dist, hostiles });
    if (pick) return { slot, def: base, target: pick };
    // Idle fallback: ready ≥ 480 ticks → the §7 range rule.
    const since = ctx.readySince ? ctx.readySince[slot] : null;
    if (target && Number.isFinite(since) && tick - since >= AI_IDLE_FALLBACK_TICKS && dist(target) <= shapeRange(def) && def.archetype !== 'guard')
      return { slot, def: base, target, fallback: true };
    if (def.archetype === 'guard' && Number.isFinite(since) && tick - since >= AI_IDLE_FALLBACK_TICKS) {
      const any = ctx.party().some((m) => m.hp > 0 && m.id !== a.id && dist(m) <= def.range);
      if (any) return { slot, def: base, target: target ?? a, fallback: true };
    }
  }
  return null;
}

function ruleFor(a, id, def, target, tick, ctx, u) {
  const { near, dist, hostiles } = u;
  const inRange = target && dist(target) <= shapeRange(def);
  switch (id) {
    // ---------------------------------------------------------- Tank --
    case 'taunting_roar': {
      const around = near(a.x, a.z, def.area);
      if (around.length >= 3) return target ?? around[0];
      const peel = around.find((e) => e.targetId != null && e.targetId !== a.id);
      return peel ? target ?? peel : null;
    }
    case 'shield_wall': {
      const party = ctx.party().filter((m) => m.hp > 0);
      const need = party.some((m) => (m.id === a.id || dist(m) <= def.range) && (m.hp < m.maxHp * 0.75 || telegraphCovers(ctx.registry, m.x, m.z, tick)));
      return need ? a : null; // the delivery picks its own recipients (never a Downed member)
    }
    case 'shoulder_charge': {
      if (target) {
        const d = dist(target);
        if (d > 1.1 && d <= 3.3) return target;
      }
      const h = ctx.healer();
      if (h && h.hp > 0 && Math.hypot(h.x - a.x, h.z - a.z) > 1.5) {
        const peel = near(h.x, h.z, 1.0).sort((p, q) => p.id - q.id)[0];
        if (peel && dist(peel) <= 3.3) return peel;
      }
      return null;
    }
    // ----------------------------------------------------- Swordsman --
    case 'fox_step': {
      if (!target) return null;
      const d = dist(target);
      return d > 0.75 && d <= 2.8 ? target : null;
    }
    case 'crescent_finisher': {
      if (!inRange) return null;
      const combo = ctx.comboCount ? ctx.comboCount(id, tick, def) : 0;
      return combo >= 1 ? target : null;
    }
    case 'riposte': {
      if (near(a.x, a.z, 1.5).length === 0) return null; // never with no hostile within 1.5 u
      const threat = near(a.x, a.z, 1.0).some((e) => e.targetId === a.id);
      if (threat || telegraphCovers(ctx.registry, a.x, a.z, tick)) return target ?? near(a.x, a.z, 1.0)[0] ?? a;
      return null;
    }
    // -------------------------------------------------------- Archer --
    case 'vault_shot': {
      const close = near(a.x, a.z, 1.4);
      if (close.length === 0) return null;
      if (target && dist(target) <= def.range) return target;
      return close.sort((p, q) => p.id - q.id)[0];
    }
    case 'pinning_arrow': {
      const h = ctx.healer();
      const anchors = [];
      if (h && h.hp > 0) anchors.push(h);
      const w = ctx.waystone ? ctx.waystone() : null;
      if (w) anchors.push(w);
      const boss = (e) => e.kind === 'stag' || e.boss === true;
      const cands = [];
      for (const an of anchors) for (const e of near(an.x, an.z, 2.0)) if (dist(e) <= def.range && !cands.includes(e)) cands.push(e);
      cands.sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id);
      const nonBoss = cands.find((e) => !boss(e));
      if (nonBoss) return nonBoss;
      if (target && dist(target) <= def.range) {
        if (!boss(target)) return target;
        // Never the Stag while another target qualifies.
        const other = hostiles.filter((e) => !boss(e) && dist(e) <= def.range).sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id)[0];
        return other ?? target;
      }
      return cands[0] ?? null;
    }
    case 'rain_of_arrows': {
      let best = null;
      let bestN = 0;
      for (const e of hostiles) {
        if (dist(e) > def.range) continue;
        const n = near(e.x, e.z, def.area).length;
        if (n > bestN || (n === bestN && best && e.id < best.id)) {
          bestN = n;
          best = e;
        }
      }
      if (best && bestN >= 3) return best;
      return inRange ? target : null;
    }
    // MORE CLASS SKILLS (docs/CLASS_SKILLS.md).
    case 'rallying_cry': {
      // Two or more members in reach, one of them hurt or under a telegraph.
      const party = ctx.party().filter((m) => m.hp > 0 && (m.id === a.id || dist(m) <= def.range));
      const need = party.some((m) => m.hp < m.maxHp * 0.8 || telegraphCovers(ctx.registry, m.x, m.z, tick));
      return party.length >= 2 && need ? a : null;
    }
    case 'earthen_grasp':
    case 'blade_dance': {
      const around = near(a.x, a.z, def.area);
      if (around.length >= 2) return target ?? around[0];
      return null;
    }
    case 'moonfang': {
      if (!target) return null;
      const d = dist(target);
      return d > 0.75 && d <= 4.0 ? target : null;
    }
    case 'feather_fan': {
      const close = near(a.x, a.z, 2.4);
      if (close.length === 0) return null;
      if (target && dist(target) <= 2.4) return target;
      return close.sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id)[0];
    }
    case 'hunters_mark': {
      // The toughest hostile in range: a boss or an elite first, else the target.
      const inR = hostiles.filter((e) => dist(e) <= def.range);
      const big = inR.filter((e) => e.boss === true || e.kind === 'stag' || e.elite).sort((p, q) => q.hp - p.hp || p.id - q.id)[0];
      return big ?? (inRange ? target : null);
    }
    case 'barbed_trap': {
      // A hostile coming at the Healer or the Archer, else the target.
      const h = ctx.healer();
      for (const an of [h, a]) {
        if (!an || !(an.hp > 0)) continue;
        const c = near(an.x, an.z, 1.8).filter((e) => dist(e) <= def.range).sort((p, q) => p.id - q.id)[0];
        if (c) return c;
      }
      return inRange ? target : null;
    }
    // ---------------------------------------------------- Tidecaller --
    // THE TIDECALLER (docs/TIDECALLER.md §AI): soak, then crash.
    case 'riverbolt': {
      // Spread the soak: the target when it is dry, else the nearest dry
      // hostile in range, else the target anyway (it refreshes the soak).
      if (inRange && !soakedNow(target, tick)) return target;
      const dry = hostiles.filter((e) => dist(e) <= def.range && !soakedNow(e, tick)).sort((p, q) => dist(p) - dist(q) || p.id - q.id)[0];
      return dry ?? (inRange ? target : null);
    }
    case 'undertow': {
      // The densest pack in reach, a pack within 2 u of the Tank (its arc) or
      // of the Waystone (a defend room) first.
      const tank = ctx.party().find((m) => m.classId === 'tank' && m.hp > 0) ?? null;
      const w = ctx.waystone ? ctx.waystone() : null;
      let best = null;
      let bestScore = 0;
      for (const e of hostiles) {
        if (dist(e) > def.range) continue;
        const n = near(e.x, e.z, def.area + 0.6).length;
        const fed = (tank && d2(e.x, e.z, tank.x, tank.z) <= 4) || (w && d2(e.x, e.z, w.x, w.z) <= 4) ? 0.5 : 0;
        const score = n + fed;
        if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
          bestScore = score;
          best = e;
        }
      }
      if (best && bestScore >= 2) return best;
      return inRange ? target : null;
    }
    case 'breaker': {
      // A Crash waits for its payoff: two soaked enemies in the burst, or one
      // soaked elite, champion or boss. A hostile on top of her (inside 0.9 u
      // and after her) is the other reason: Breaker is her answer to a rush.
      const around = near(a.x, a.z, def.area);
      const wet = around.filter((e) => soakedNow(e, tick));
      if (wet.length >= 2 || wet.some((e) => e.elite || CHAMPIONS.has(e.kind) || e.boss === true || e.kind === 'stag')) return wet[0];
      const rush = near(a.x, a.z, 0.9).filter((e) => e.targetId === a.id);
      if (rush.length >= 1) return rush[0];
      return null;
    }
    // Her whole kit (Tidecaller slice 3).
    case 'torrent': {
      // The jet runs the whole line: aim where the line holds two enemies, or
      // one soaked (each soaked one counts twice: the Crash).
      let best = null;
      let bestScore = 0;
      for (const e of hostiles) {
        const d = dist(e);
        if (d > def.range || d < 1e-3) continue;
        const ux = (e.x - a.x) / d;
        const uz = (e.z - a.z) / d;
        let score = 0;
        for (const o of hostiles) {
          const px = o.x - a.x;
          const pz = o.z - a.z;
          const along = px * ux + pz * uz;
          if (along < 0 || along > def.range) continue;
          if (Math.abs(px * uz - pz * ux) <= 0.45) score += soakedNow(o, tick) ? 2 : 1;
        }
        if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
          bestScore = score;
          best = e;
        }
      }
      return best && bestScore >= 2 ? best : null;
    }
    case 'whirlpool':
    case 'rain_squall': {
      // The densest pack (three or more), one by the Tank or the Waystone first.
      const tank = ctx.party().find((m) => m.classId === 'tank' && m.hp > 0) ?? null;
      const w = ctx.waystone ? ctx.waystone() : null;
      let best = null;
      let bestScore = 0;
      for (const e of hostiles) {
        if (dist(e) > def.range) continue;
        const n = near(e.x, e.z, def.area).length;
        const fed = (tank && d2(e.x, e.z, tank.x, tank.z) <= 4) || (w && d2(e.x, e.z, w.x, w.z) <= 4) ? 0.5 : 0;
        const score = n + fed;
        if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
          bestScore = score;
          best = e;
        }
      }
      return best && bestScore >= 3 ? best : null;
    }
    case 'ripple_step': {
      // Her panic button: an enemy on top of her (inside 1.2 u and after her,
      // or inside 0.8 u at all). The vault runs from the nearest.
      const close = near(a.x, a.z, 1.2).filter((e) => e.targetId === a.id || d2(e.x, e.z, a.x, a.z) <= 0.64);
      return close.sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id)[0] ?? null;
    }
    case 'bubble_ward': {
      // A member in reach that an enemy is closing on (inside 1.6 u and after
      // it) or that is hurt below 70%; the delivery picks the bubble's bearer.
      const party = ctx.party().filter((m) => m.hp > 0 && (m.id === a.id || dist(m) <= def.range));
      const need = party.some((m) => m.hp < m.maxHp * 0.7 || hostiles.some((e) => e.targetId === m.id && d2(e.x, e.z, m.x, m.z) <= 1.6 * 1.6));
      return need ? a : null;
    }
    case 'crashing_wave': {
      // Like Breaker, at reach: two soaked in front of her, or one soaked big
      // target, or three of anything close.
      const reach = def.range;
      const wet = near(a.x, a.z, reach).filter((e) => soakedNow(e, tick)).sort((p, q) => dist(p) - dist(q) || p.id - q.id);
      if (wet.length >= 2 || wet.some((e) => e.elite || CHAMPIONS.has(e.kind) || e.boss === true || e.kind === 'stag')) return wet[0];
      const any = near(a.x, a.z, reach * 0.9);
      if (any.length >= 3) return target && dist(target) <= reach ? target : any[0];
      return null;
    }
    case 'maelstrom': {
      // The capstone: four in the draw, or two soaked in it.
      const drawn = near(a.x, a.z, def.drawArea ?? def.area);
      if (drawn.length >= 4 || drawn.filter((e) => soakedNow(e, tick)).length >= 2) return target ?? drawn[0];
      return null;
    }
    // ---------------------------------------------------- Bellwright --
    // THE BELLWRIGHT (docs/BELLWRIGHT.md §AI): hang, then ring.
    case 'hang_bell':
    case 'great_bell': {
      // The densest pack in reach that no bell of hers already covers, a pack
      // by the Tank or the Waystone first; else the target.
      const bells = bellsOf(ctx.registry, a.id);
      const tank = ctx.party().find((m) => m.classId === 'tank' && m.hp > 0) ?? null;
      const w = ctx.waystone ? ctx.waystone() : null;
      let best = null;
      let bestScore = 0;
      for (const e of hostiles) {
        if (dist(e) > def.range) continue;
        if (bells.some((z) => d2(e.x, e.z, z.x, z.z) <= z.radius * z.radius * 0.6)) continue;
        const n = near(e.x, e.z, def.area + 0.4).length;
        const fed = (tank && d2(e.x, e.z, tank.x, tank.z) <= 4) || (w && d2(e.x, e.z, w.x, w.z) <= 4) ? 0.5 : 0;
        const score = n + fed;
        if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
          bestScore = score;
          best = e;
        }
      }
      if (best) return best;
      return inRange && !bells.some((z) => d2(target.x, target.z, z.x, z.z) <= z.radius * z.radius * 0.6) ? target : null;
    }
    case 'peal':
    case 'carillon': {
      // The Peal waits for its payoff: two enemies inside her bells' rings,
      // or one elite, champion or boss. With no bell hung it rings round her
      // (two in the burst, or one on top of her). The Carillon, her capstone,
      // waits for two bells and three enemies in their rings (or a big one).
      const bells = bellsOf(ctx.registry, a.id);
      if (id === 'carillon' && bells.length === 1) return null;
      if (bells.length) {
        const rung = hostiles.filter((e) => bells.some((z) => d2(e.x, e.z, z.x, z.z) <= def.area * def.area));
        const need = id === 'carillon' ? 3 : 2;
        if (rung.length >= need || rung.some((e) => e.elite || CHAMPIONS.has(e.kind) || e.boss === true || e.kind === 'stag')) return rung[0];
        return null;
      }
      if (id === 'carillon') {
        const around = near(a.x, a.z, def.area);
        return around.length >= 3 ? around[0] : null;
      }
      const around = near(a.x, a.z, def.area);
      if (around.length >= 2) return around[0];
      const rush = near(a.x, a.z, 0.9).filter((e) => e.targetId === a.id);
      return rush[0] ?? null;
    }
    case 'clapper': {
      // An enemy standing in one of her rings first (the Clapper's +50%).
      const bells = bellsOf(ctx.registry, a.id);
      const rung = hostiles
        .filter((e) => dist(e) <= def.range && bells.some((z) => d2(e.x, e.z, z.x, z.z) <= z.radius * z.radius))
        .sort((p, q) => dist(p) - dist(q) || p.id - q.id)[0];
      return rung ?? (inRange ? target : null);
    }
    case 'knell': {
      // The note runs the whole line: aim where it holds two enemies (each
      // one standing in a ring of hers counts twice: the ring bonus).
      const bells = bellsOf(ctx.registry, a.id);
      const ringed = (o) => bells.some((z) => d2(o.x, o.z, z.x, z.z) <= z.radius * z.radius);
      let best = null;
      let bestScore = 0;
      for (const e of hostiles) {
        const d = dist(e);
        if (d > def.range || d < 1e-3) continue;
        const ux = (e.x - a.x) / d;
        const uz = (e.z - a.z) / d;
        let score = 0;
        for (const o of hostiles) {
          const px = o.x - a.x;
          const pz = o.z - a.z;
          const along = px * ux + pz * uz;
          if (along < 0 || along > def.range) continue;
          if (Math.abs(px * uz - pz * ux) <= 0.45) score += ringed(o) ? 2 : 1;
        }
        if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
          bestScore = score;
          best = e;
        }
      }
      return best && bestScore >= 2 ? best : null;
    }
    case 'bell_swing': {
      // Two enemies in reach of the swing, or one on top of her.
      const close = near(a.x, a.z, def.range).sort((p, q) => dist(p) - dist(q) || p.id - q.id);
      if (close.length >= 2) return target && dist(target) <= def.range ? target : close[0];
      return close.find((e) => e.targetId === a.id && dist(e) <= 1.0) ?? null;
    }
    case 'wing_hop': {
      // Her panic button: an enemy on top of her. The hop runs from the
      // nearest and leaves a handbell tolling at it.
      const close = near(a.x, a.z, 1.2).filter((e) => e.targetId === a.id || d2(e.x, e.z, a.x, a.z) <= 0.64);
      return close.sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id)[0] ?? null;
    }
    case 'vesper_chime': {
      // A member in reach that an enemy is closing on, or hurt below 70%; the
      // delivery picks the two enemies are after.
      const party = ctx.party().filter((m) => m.hp > 0 && (m.id === a.id || dist(m) <= def.range));
      const need = party.some((m) => m.hp < m.maxHp * 0.7 || hostiles.some((e) => e.targetId === m.id && d2(e.x, e.z, m.x, m.z) <= 1.6 * 1.6));
      return need ? a : null;
    }
    case 'tuning_fork': {
      // Two more members in reach and a fight on: an enemy within 3 u of one.
      const party = ctx.party().filter((m) => m.hp > 0 && m.id !== a.id && dist(m) <= def.range);
      if (party.length < 2) return null;
      return party.some((m) => near(m.x, m.z, 3).length > 0) ? a : null;
    }
    // ------------------------------------------------------ Duskwing --
    // THE DUSKWING (docs/DUSKWING.md §AI): he dives onto a pack, bites when
    // hurt, throws the dark over a crowd, and pulls out when he runs low
    // (the steering half lives in sim/allies.js, AI_DUSK).
    case 'dusk_dive': {
      // Never while he is pulled out or low; never onto a landing a
      // telegraph covers. The densest pack in reach, two or more, else his
      // target from a gap.
      if (a.duskPullOut || a.hp < a.maxHp * AI_DUSK.diveFloorFrac) return null;
      let best = null;
      let bestN = 0;
      for (const e of hostiles) {
        const d = dist(e);
        if (d > def.dash.dist + def.area || d < 0.6) continue;
        if (telegraphCovers(ctx.registry, e.x, e.z, tick)) continue;
        const n = near(e.x, e.z, def.area).length;
        if (n > bestN || (n === bestN && best && e.id < best.id)) {
          bestN = n;
          best = e;
        }
      }
      if (best && bestN >= 2) return best;
      if (!target) return null;
      const d = dist(target);
      return d > 1.0 && d <= def.dash.dist + def.area ? target : null;
    }
    case 'blood_bite': {
      // In reach; at once when he is hurt below 70%, else on his target.
      const close = near(a.x, a.z, def.range).sort((p, q) => dist(p) - dist(q) || p.id - q.id);
      if (close.length === 0) return null;
      if (a.hp < a.maxHp * 0.7) return close[0];
      return inRange ? target : close[0];
    }
    case 'nightfall': {
      // Three enemies round him, or one champion or elite on top of him.
      const around = near(a.x, a.z, def.area);
      if (around.length >= 3) return target ?? around[0];
      const big = around.find((e) => (e.elite || e.champion) && !(e.boss === true || e.kind === 'stag'));
      return big ?? null;
    }
    // His whole kit (content plan 5, slice 5).
    case 'echo_screech': {
      // The cone that holds the most, two or more (or one big enemy).
      let best = null;
      let bestN = 0;
      for (const e of hostiles) {
        const d = dist(e);
        if (d > def.range || d < 1e-3) continue;
        const n = inCone(hostiles, a.x, a.z, (e.x - a.x) / d, (e.z - a.z) / d, def.range, def.area).length;
        if (n > bestN || (n === bestN && best && e.id < best.id)) {
          bestN = n;
          best = e;
        }
      }
      if (best && bestN >= 2) return best;
      const big = hostiles.filter((e) => isBig(e) && dist(e) <= def.range).sort((p, q) => dist(p) - dist(q) || p.id - q.id)[0];
      return big ?? null;
    }
    case 'talon_rake': {
      // Two enemies in reach of the rake, or one on top of him.
      const close = near(a.x, a.z, def.range).sort((p, q) => dist(p) - dist(q) || p.id - q.id);
      if (close.length >= 2) return target && dist(target) <= def.range ? target : close[0];
      return close.find((e) => e.targetId === a.id && dist(e) <= 0.9) ?? null;
    }
    case 'bat_swarm': {
      // The densest pack in reach (two or more), else a big enemy.
      let best = null;
      let bestN = 0;
      for (const e of hostiles) {
        if (dist(e) > def.range) continue;
        const n = near(e.x, e.z, def.area).length;
        if (n > bestN || (n === bestN && best && e.id < best.id)) {
          bestN = n;
          best = e;
        }
      }
      if (best && bestN >= 2) return best;
      return inRange && isBig(target) ? target : null;
    }
    case 'shadow_veil': {
      // A blow on its way: an enemy on top of him and after him, a telegraph
      // over him, or hurt below 60% with an enemy close.
      const rush = near(a.x, a.z, 1.2).filter((e) => e.targetId === a.id);
      const close = near(a.x, a.z, 2.0);
      if (rush.length >= 1 || telegraphCovers(ctx.registry, a.x, a.z, tick) || (a.hp < a.maxHp * 0.6 && close.length)) return close.sort((p, q) => dist(p) - dist(q) || p.id - q.id)[0] ?? a;
      return null;
    }
    case 'flit': {
      // His way out: low (below AI_DUSK.pullOutFrac, or already pulled out)
      // with an enemy close, or a telegraph over him. The flit runs from the
      // nearest and leaves the dark where he was.
      const close = near(a.x, a.z, 1.4).sort((p, q) => d2(p.x, p.z, a.x, a.z) - d2(q.x, q.z, a.x, a.z) || p.id - q.id);
      if (close.length === 0) return null;
      const low = a.duskPullOut || a.hp < a.maxHp * AI_DUSK.pullOutFrac;
      return low || telegraphCovers(ctx.registry, a.x, a.z, tick) ? close[0] : null;
    }
    case 'blood_moon': {
      // The capstone: four round him, or three when he is hungry (below
      // half) or one of them is big. Blinded ones already count less.
      const around = near(a.x, a.z, def.area);
      const fresh = around.filter((e) => !blindNow(e, tick));
      const need = a.hp < a.maxHp * 0.5 || around.some(isBig) ? 3 : 4;
      if (around.length >= need && fresh.length >= 2) return target && dist(target) <= def.area ? target : around[0];
      return null;
    }
    default:
      // The 12 starting skills: §7 — target in shape range.
      return inRange ? target : null;
  }
}

// ------------------------------------------------------------ equip rules --
// A card for an AI-held seat: a swap offer takes when the offered skill
// outranks the lowest-priority owned skill (§25.8), a node offer: take.
export function suggestCard(classId, slots, card) {
  if (!card || !card.type) return { choice: 'leave', replace: null };
  if (card.type === 'skill' && card.swap) return swapSuggestion(classId, slots, card.id);
  return { choice: 'take', replace: null };
}

// Shop: the cheapest affordable card first while the purse lasts (ties:
// shelf order). Returns the indices to buy, in order.
export function suggestShelf(shelf, purse) {
  const out = [];
  let left = purse;
  const avail = shelf.map((c, i) => ({ c, i })).filter((x) => x.c && !x.c.sold);
  for (let guard = 0; guard < 8; guard++) {
    let best = null;
    for (const x of avail) {
      if (out.includes(x.i) || x.c.price > left) continue;
      if (!best || x.c.price < best.c.price) best = x;
    }
    if (!best) break;
    out.push(best.i);
    left -= best.c.price;
  }
  return out;
}
