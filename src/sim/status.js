// Status effects (docs/gauntlet/PLAN.md §3.6, docs/BUILD_BRIEF.md §23.8).
// Owner: M4a. The READ side (speedMul / isStunned / damageDealtMul /
// damageTakenMul / absorb) is what every key calls — M4b's enemies, hazards
// and boss, M4a's world walk, ally steering and the combat pipeline. The
// WRITE side (apply / addShield / clear*) owns the immunity rules and the
// caps. Statuses live ON THE ENTITY as plain data
// (`e.status = { slow: { mag, untilTick, src, at }, ... }`) so the registry
// serialises them for free (save files, network snapshots) — never closures,
// never module state (PLAN gate G4a.7).
//
// Kinds (magnitudes are fractions, except shield = HP points):
//   slow      move speed × (1 − mag)        hostile + party; the boss is immune; mag cap 0.6
//   stun      no move / no attack starts    non-boss hostiles only; ≤ 60 ticks, then 120 ticks of stun immunity
//   haste     move speed × (1 + mag)        party
//   shield    absorbs damage before HP      party; amount stored in `mag`, cap 50% maxHp
//   ward      damage taken × (1 − mag)      party
//   exposed   damage taken × (1 + mag)      hostile
//   inspired  damage dealt × (1 + mag)      party
//   taunt     the enemy's target IS `src`   hostile (PARTY, BUILD_BRIEF §25.2): ≤ 240 ticks;
//             the boss ≤ 60 ticks, then 300 ticks of taunt immunity
// Refresh rule (§23.8): re-applying a kind keeps max(mag) and max(untilTick) —
// never stacks. The one accumulating writer is addShield() (Bulwark), which
// adds to a live shield up to its own cap; it is still bounded by the 50%
// maxHp shield cap.
//
// Events: the module functions stay pure (they are called from inside other
// keys' systems, which own no event contract for them). Each record carries
// `at` = the tick it was (re)applied and `fresh: true` until it has been
// announced; createStatusTracker().endOfTick() — run once per tick by the run
// system, at the very end of the discrete phase — announces `status_apply`
// for every fresh record (clearing the flag) and `status_expire` for every
// record it prunes. So every status, whoever applied it and whenever (inside
// a tick or between ticks from a probe), is visible on the bus exactly once
// per application.

const KINDS = Object.freeze(['slow', 'stun', 'haste', 'shield', 'ward', 'exposed', 'inspired', 'taunt']);
export const STATUS_KINDS = KINDS;

// §23.8 caps and immunity windows (frozen; BUILD_BRIEF is the source).
export const STATUS_RULES = Object.freeze({
  slowCap: 0.6, // slow magnitude cap
  stunMaxTicks: 60, // a stun never lasts longer than 1.0 s
  stunImmuneTicks: 120, // then 2.0 s of stun immunity
  shieldCapFrac: 0.5, // a shield never exceeds 50% of max HP
  // PARTY §25.2 taunt (data/classes.js TAUNT mirrors these numbers).
  tauntMaxTicks: 240,
  tauntBossMaxTicks: 60,
  tauntBossImmuneTicks: 300,
});

// Kind -> which side may carry it. The boss (the Hollow Stag, kind 'stag', or
// any entity flagged `boss: true`) is immune to slow and stun.
const PARTY_ONLY = new Set(['haste', 'shield', 'ward', 'inspired']);
const HOSTILE_ONLY = new Set(['stun', 'exposed', 'taunt']);
const IMMUNE_KEY = 'stunImmune'; // internal record (not a public kind)
const TAUNT_IMMUNE_KEY = 'tauntImmune'; // internal record: the boss after a taunt

export const isBoss = (e) => !!e && (e.boss === true || e.kind === 'stag');
const isParty = (e) => !!e && (e.partyIndex !== undefined || e.faction === 'party');

function live(e, kind, tick) {
  const s = e && e.status && e.status[kind];
  return s && s.untilTick > tick ? s : null;
}

// ------------------------------------------------------------- read side --
export function speedMul(e, tick) {
  if (!e) return 1;
  // ELITE AFFIXES: Hasted (x1.4) and the Frozen wind-up (x0) ride on the
  // body as `affixSpeed`; absent on every other body (x1, the old rule).
  const am = e.affixSpeed;
  if (!e.status) return am === undefined ? 1 : am;
  if (live(e, 'stun', tick)) return 0;
  let m = 1;
  const sl = live(e, 'slow', tick);
  if (sl) m *= 1 - Math.min(STATUS_RULES.slowCap, sl.mag);
  const ha = live(e, 'haste', tick);
  if (ha) m *= 1 + ha.mag;
  return am === undefined ? m : m * am;
}

export function isStunned(e, tick) {
  return !!live(e, 'stun', tick);
}

export function damageDealtMul(attacker, tick) {
  const s = live(attacker, 'inspired', tick);
  return s ? 1 + s.mag : 1;
}

export function damageTakenMul(target, tick) {
  if (!target || !target.status) return 1;
  let m = 1;
  const w = live(target, 'ward', tick);
  if (w) m *= 1 - w.mag;
  const x = live(target, 'exposed', tick);
  if (x) m *= 1 + x.mag;
  return m;
}

// absorb(target, amount, tick) -> { absorbed, remaining } — shield soaks first.
export function absorb(target, amount, tick) {
  const s = live(target, 'shield', tick);
  if (!s || !(amount > 0)) return { absorbed: 0, remaining: amount };
  const a = Math.min(s.mag, amount);
  s.mag -= a;
  return { absorbed: a, remaining: amount - a };
}

// Live magnitude of one kind (0 when absent/expired) — HUD / VFX / probes.
export function magnitude(e, kind, tick) {
  const s = live(e, kind, tick);
  return s ? s.mag : 0;
}

// PARTY: the id of the body a live taunt forces this enemy to target, else
// null (the caller checks that the source still stands).
export function tauntSource(e, tick) {
  const s = live(e, 'taunt', tick);
  return s && s.src !== null && s.src !== undefined ? s.src : null;
}

// Plain view of every live status on an entity (probes, HUD).
export function view(e, tick) {
  const out = {};
  if (!e || !e.status) return out;
  for (const k of KINDS) {
    const s = live(e, k, tick);
    if (s) out[k] = { mag: Math.round(s.mag * 1000) / 1000, ticksLeft: s.untilTick - tick, src: s.src ?? null };
  }
  return out;
}

// Why a status would be refused on this entity right now (null = allowed).
export function refusal(e, kind, tick) {
  if (!e) return 'no_entity';
  if (!KINDS.includes(kind)) return 'unknown_kind';
  const party = isParty(e);
  if (PARTY_ONLY.has(kind) && !party) return 'party_only';
  if (HOSTILE_ONLY.has(kind) && party) return 'hostile_only';
  if ((kind === 'slow' || kind === 'stun') && isBoss(e)) return 'boss_immune';
  if (kind === 'stun' && live(e, IMMUNE_KEY, tick)) return 'stun_immune';
  if (kind === 'taunt' && live(e, TAUNT_IMMUNE_KEY, tick) && !live(e, 'taunt', tick)) return 'taunt_immune';
  return null;
}

// ------------------------------------------------------------ write side --
// apply(e, kind, mag, ticks, tick, srcId?) -> the stored record | null
// (null = refused by an immunity rule or a non-positive duration/magnitude).
export function apply(e, kind, mag, ticks, tick, srcId = null) {
  if (!(ticks > 0) || !(mag > 0)) return null;
  if (refusal(e, kind, tick)) return null;
  if (!e.status) e.status = {};
  let t = Math.round(ticks);
  let m = mag;
  if (kind === 'stun') t = Math.min(STATUS_RULES.stunMaxTicks, t);
  if (kind === 'taunt') t = Math.min(isBoss(e) ? STATUS_RULES.tauntBossMaxTicks : STATUS_RULES.tauntMaxTicks, t);
  if (kind === 'slow') m = Math.min(STATUS_RULES.slowCap, m);
  if (kind === 'shield') m = Math.min(m, shieldCap(e));
  const prev = live(e, kind, tick);
  const rec = {
    mag: prev ? Math.max(prev.mag, m) : m,
    untilTick: prev ? Math.max(prev.untilTick, tick + t) : tick + t,
    src: srcId,
    at: tick,
    fresh: true,
  };
  if (kind === 'taunt' && prev && isBoss(e)) {
    // The Stag's taunt never outlasts its first 60 ticks (the immunity is
    // live from the first application; a refresh cannot extend it).
    rec.untilTick = Math.min(rec.untilTick, e.status[TAUNT_IMMUNE_KEY] ? e.status[TAUNT_IMMUNE_KEY].untilTick - STATUS_RULES.tauntBossImmuneTicks : rec.untilTick);
  }
  e.status[kind] = rec;
  if (kind === 'taunt' && isBoss(e) && !prev) {
    // §25.2: the Stag — then 300 ticks of taunt immunity.
    e.status[TAUNT_IMMUNE_KEY] = { mag: 1, untilTick: rec.untilTick + STATUS_RULES.tauntBossImmuneTicks, src: srcId, at: tick };
  }
  if (kind === 'stun') {
    // §23.8: 120 ticks of stun immunity after the stun ends. The immunity is
    // live DURING the stun too, so a second stun can never extend the first.
    e.status[IMMUNE_KEY] = { mag: 1, untilTick: rec.untilTick + STATUS_RULES.stunImmuneTicks, src: srcId, at: tick };
  }
  return rec;
}

// Bulwark's accumulating shield: adds `amount` to a live shield, bounded by
// `cap` (the node's own cap) and by the 50% maxHp shield cap; refreshes the
// expiry to max(untilTick, tick + ticks).
export function addShield(e, amount, cap, ticks, tick, srcId = null, skill = null) {
  if (!(amount > 0) || !(ticks > 0)) return null;
  if (refusal(e, 'shield', tick)) return null;
  if (!e.status) e.status = {};
  const prev = live(e, 'shield', tick);
  const limit = Math.min(cap, shieldCap(e));
  const cur = prev ? prev.mag : 0;
  const next = Math.min(limit, cur + amount);
  if (next <= cur && prev) {
    prev.untilTick = Math.max(prev.untilTick, tick + Math.round(ticks));
    return prev;
  }
  const rec = {
    mag: next,
    untilTick: prev ? Math.max(prev.untilTick, tick + Math.round(ticks)) : tick + Math.round(ticks),
    src: srcId,
    at: tick,
    fresh: true,
  };
  if (skill) rec.skill = skill; // PARTY: the granting skill (present only when given)
  e.status.shield = rec;
  return rec;
}

function shieldCap(e) {
  const max = Number.isFinite(e.maxHp) ? e.maxHp : 0;
  return max > 0 ? max * STATUS_RULES.shieldCapFrac : Infinity;
}

export function clear(e, kind) {
  if (!e || !e.status) return false;
  if (kind === undefined || kind === null) {
    e.status = {};
    return true;
  }
  const had = !!e.status[kind];
  delete e.status[kind];
  if (kind === 'stun') delete e.status[IMMUNE_KEY];
  if (kind === 'taunt') delete e.status[TAUNT_IMMUNE_KEY];
  return had;
}

export function clearAll(e) {
  if (e && e.status) e.status = {};
}

// Drop expired records (call once per tick for bodies that carry statuses) so
// save files and snapshots do not accumulate dead entries.
export function prune(e, tick) {
  if (!e || !e.status) return;
  for (const k of Object.keys(e.status)) if (!(e.status[k].untilTick > tick)) delete e.status[k];
}

// ---------------------------------------------------------------- events --
// createStatusTracker({ registry, events, getTick }).endOfTick() — see the
// header. Stateless (it derives everything from the records' `at` and
// `untilTick`), so a save/load or a network snapshot needs nothing from it.
const r2 = (v) => Math.round(v * 100) / 100;
export function createStatusTracker({ registry, events, getTick }) {
  function endOfTick() {
    const tick = getTick();
    for (const e of registry.all()) {
      const st = e.status;
      if (!st) continue;
      if (typeof st !== 'object') continue;
      for (const k of Object.keys(st)) {
        const rec = st[k];
        if (!rec || typeof rec !== 'object' || !Number.isFinite(rec.untilTick)) continue; // not a status record
        if (k === IMMUNE_KEY || k === TAUNT_IMMUNE_KEY) {
          if (!(rec.untilTick > tick)) delete st[k];
          continue;
        }
        // A shield soaked down to nothing is spent, not merely waiting out
        // its clock (the HUD rim and the body shell must drop with it).
        if (k === 'shield' && !(rec.mag > 1e-6) && !rec.fresh) {
          delete st[k];
          events.emit(tick, 'status_expire', { id: e.id, kind: e.kind, status: k, spent: true });
          continue;
        }
        if (rec.fresh && rec.untilTick > tick) {
          delete rec.fresh;
          events.emit(tick, 'status_apply', {
            id: e.id,
            kind: e.kind,
            status: k,
            mag: r2(rec.mag),
            untilTick: rec.untilTick,
            src: rec.src ?? null,
            x: r2(e.x ?? 0),
            z: r2(e.z ?? 0),
          });
        } else if (!(rec.untilTick > tick)) {
          delete st[k];
          events.emit(tick, 'status_expire', { id: e.id, kind: e.kind, status: k });
        }
      }
    }
  }
  return { endOfTick };
}
