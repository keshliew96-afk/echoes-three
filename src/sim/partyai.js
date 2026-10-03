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
import { AI_IDLE_FALLBACK_TICKS, AI_ENGAGE, swapSuggestion } from '../data/classes.js';
import { shapeRange } from './allycast.js';

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
