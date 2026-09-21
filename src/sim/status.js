// Status effects (docs/gauntlet/PLAN.md §4.4, docs/BUILD_BRIEF.md §23.4).
// Owner: M4a. ARCH stub: the READ side M4b's enemy/hazard code calls from
// day one (all neutral until something applies a status), plus the write-side
// signatures M4a implements. Statuses live ON THE ENTITY as plain data
// (`e.status = { slow: { mag, untilTick, src }, ... }`) so the registry
// serialises them for free (save / network snapshots) — never in closures.
//
// Kinds (magnitudes are fractions):
//   slow      move speed × (1 − mag)        hostile + party; boss immune; mag cap 0.6
//   stun      no move / no attack starts    non-boss hostiles; max 60 ticks; 120-tick immunity after
//   haste     move speed × (1 + mag)        party
//   shield    absorbs damage before HP      party; amount stored in `mag` (HP points), cap 50% maxHp
//   ward      damage taken × (1 − mag)      party
//   exposed   damage taken × (1 + mag)      hostile
//   inspired  damage dealt × (1 + mag)      party
// Refresh rule: re-applying a kind keeps max(mag) and max(untilTick) — never stacks.

const KINDS = Object.freeze(['slow', 'stun', 'haste', 'shield', 'ward', 'exposed', 'inspired']);
export const STATUS_KINDS = KINDS;

function live(e, kind, tick) {
  const s = e && e.status && e.status[kind];
  return s && s.untilTick > tick ? s : null;
}

// ------------------------------------------------------------- read side --
export function speedMul(e, tick) {
  if (!e || !e.status) return 1;
  if (live(e, 'stun', tick)) return 0;
  let m = 1;
  const sl = live(e, 'slow', tick);
  if (sl) m *= 1 - Math.min(0.6, sl.mag);
  const ha = live(e, 'haste', tick);
  if (ha) m *= 1 + ha.mag;
  return m;
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

// ------------------------------------------------------------ write side --
// apply(e, kind, mag, ticks, tick, srcId?) -> the stored record | null.
// M4a owns immunity rules (boss, stun DR) and the `status_apply` event.
export function apply(e, kind, mag, ticks, tick, srcId = null) {
  if (!e || !KINDS.includes(kind) || !(ticks > 0)) return null;
  if (!e.status) e.status = {};
  const prev = live(e, kind, tick);
  const rec = {
    mag: prev ? Math.max(prev.mag, mag) : mag,
    untilTick: prev ? Math.max(prev.untilTick, tick + ticks) : tick + ticks,
    src: srcId,
  };
  e.status[kind] = rec;
  return rec;
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
