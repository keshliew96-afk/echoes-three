// Snapshot quantisation (docs/gauntlet/PLAN.md §3.7 HOT part). Owner: M5a.
// ISOMORPHIC, pure.
//
// The host replicates a QUANTISED view of its registry entity table. Every
// entity is split into binary channels and a `rest` object (all remaining
// fields, carried exactly by the per-entity tree diff):
//
//   POS    x, z                 int16 at 1/256 u   (|v| < 128 u, else exact in rest)
//   HP     hp                   integer at 0.01    (finite only, else exact in rest)
//   YAW    facing {x, z}        uint8, 256 steps   (unit vectors only)
//   YAWF   faceX / faceZ        uint8, 256 steps   (unit vectors only)
//   AIM    aim {x, z}           int16 at 1/64 u    (|v| < 512 u)
//   FLAGS  FLAG_KEYS booleans   u16 presence + u16 values
//   MOVER  linear movers (numeric vx, vz, traveled, range): x, z and
//          traveled are NOT sent per snapshot — the host sends an anchor
//          { t0, x0, z0, tr0 } once and both sides extrapolate with the
//          entity's own per-tick velocity; the host re-anchors whenever the
//          true position drifts > 1/64 u from the extrapolation (a blocked,
//          deflected or homing mover), so the view never lags truth by more
//          than 1/64 u.
//   dropped: DROP_KEYS — px, pz (render interpolation history; the guest's
//          replica writes them from the previous snapshot, PLAN "Interpolation")
//          and per-tick scratch (leashD0), see below.
//
// view(q) rebuilds a plain entity from its quantised form using only exact
// arithmetic (integer / power-of-two division, IEEE-exact multiply, sqrt and
// Math.round) and a precomputed unit-circle table rounded to 1/4096, so the
// host and every guest — in any JavaScript engine — reconstruct the SAME
// bytes, and hashState(view) is a valid desync check (PLAN "Desync detection").

export const QPOS = 256;
export const QAIM = 64;
export const QHP = 100;
export const POS_LIMIT = 32767 / QPOS; // ±127.996 u
export const AIM_LIMIT = 32767 / QAIM; // ±511.98 u
export const MOVER_TOL = QPOS / 64; // re-anchor when drift > 1/64 u (4 position units)

// Never replicated: render interpolation history (px, pz — the guest's
// replica writes them from the previous snapshot) and per-tick scratch the
// host sim rewrites before every read (allies.js `leashD0` = the pre-move
// distance the same tick's post-separation clamp reads). Changing this list
// changes the replicated view (bump PROTOCOL_VERSION).
// PARTY (protocol v4, GP.10): SIM-ONLY bolt / zone fields no presentation
// layer reads — a pierce's hitsLeft + hitIds (host-side hit bookkeeping),
// the class-technique `mods` (castId, scatter, execute …), the damage
// `power` and the bolt subsystem tag `boltOwner` — so a NEW bolt costs ~26
// bytes less on every delta that still carries it (with four max-stress
// builds bolts spawn at ~12 / s). A replica never steps (the session's end
// resets the world synchronously, app.quitToTitle), guests cannot save, and
// a migrated host resumes from the exact keyframe — the dropped fields are
// never needed off the host.
export const DROP_KEYS = Object.freeze(['px', 'pz', 'leashD0', 'mods', 'hitIds', 'hitsLeft', 'power', 'boltOwner']);

// Channel bits (quantised entity `ch`).
export const CH = Object.freeze({ POS: 1, HP: 2, YAW: 4, YAWF: 8, AIM: 16, FLAGS: 32, MOVER: 64 });

// Up to 16 well-known boolean entity fields ride in the FLAGS channel (bit =
// index). Changing this list changes the wire format (bump PROTOCOL_VERSION).
export const FLAG_KEYS = Object.freeze([
  'hittable',
  'knockbackable',
  'downed',
  'moving',
  'leashOut',
  'elite',
  'heal',
  'flier',
  'burrowed',
  'interactable',
  'blocksMovement',
  'blocksProjectiles',
  'stunned',
  'telegraphing',
  'dashing',
  'casting',
]);
const FLAG_INDEX = new Map(FLAG_KEYS.map((k, i) => [k, i]));

// Unit circle at 256 steps, each component rounded to 1/4096 so the table is
// bit-identical in every engine (Math.cos may differ in the last ulp; the
// rounding absorbs it).
export const COS8 = new Float64Array(256);
export const SIN8 = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const a = (i / 256) * 2 * Math.PI;
  COS8[i] = Math.round(Math.cos(a) * 4096) / 4096 + 0;
  SIN8[i] = Math.round(Math.sin(a) * 4096) / 4096 + 0;
}

export const qpos = (v) => Math.round(v * QPOS) | 0;
export const dpos = (q) => q / QPOS;
export const qaim = (v) => Math.round(v * QAIM) | 0;
export const daim = (q) => q / QAIM;
export const qhp = (v) => Math.round(v * QHP) + 0;
export const dhp = (q) => q / QHP;
// Host only (the guest never calls atan2): direction -> 0..255.
export function yawOf(x, z) {
  const s = Math.round((Math.atan2(z, x) * 128) / Math.PI);
  return ((s % 256) + 256) % 256;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isUnit = (x, z) => isNum(x) && isNum(z) && Math.abs(x * x + z * z - 1) < 2e-3;
const isVec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && isNum(v.x) && isNum(v.z) && Object.keys(v).length === 2;

export function isLinearMover(e) {
  return isNum(e.vx) && isNum(e.vz) && isNum(e.traveled) && isNum(e.range) && isNum(e.x) && isNum(e.z) && Math.abs(e.x) < POS_LIMIT && Math.abs(e.z) < POS_LIMIT;
}

// Extrapolated mover channels at `tick` from anchor + the entity's velocity
// (exact IEEE operations only).
export function moverAt(anchor, vx, vz, tick) {
  const dt = tick - anchor.t0;
  const speed = Math.sqrt(vx * vx + vz * vz);
  return {
    qx: (anchor.x0 + Math.round(vx * QPOS * dt)) | 0,
    qz: (anchor.z0 + Math.round(vz * QPOS * dt)) | 0,
    qtr: anchor.tr0 + Math.round(speed * QPOS * dt) + 0,
  };
}

// quantizeEntity(e, tick, anchors) -> quantised entity
//   { id, ch, qx, qz, hp, yaw, ax, az, fp, fv, mv: {t0,x0,z0,tr0}|null, rest }
// `anchors` (Map id -> anchor) is the HOST's mover-anchor table; it is read
// and updated here (pass null for a stateless quantisation: every mover is
// then anchored at `tick`).
export function quantizeEntity(e, tick, anchors) {
  const q = { id: e.id, ch: 0, qx: 0, qz: 0, hp: 0, yaw: 0, ax: 0, az: 0, fp: 0, fv: 0, mv: null, rest: null };
  const rest = {};
  let moverVel = null;
  const handled = new Set(['id', ...DROP_KEYS]);
  if (isLinearMover(e)) {
    q.ch |= CH.MOVER;
    handled.add('x');
    handled.add('z');
    handled.add('traveled');
    const tx = qpos(e.x);
    const tz = qpos(e.z);
    const ttr = qhpPos(e.traveled);
    // Protocol v3: the replicated velocity is quantised to 1/65536 u per
    // tick (a dyadic value — 3-5 bytes on the wire instead of 9) and BOTH
    // sides extrapolate with it; the host's re-anchor test below uses the same
    // quantised velocity, so the view still never drifts > 1/64 u from truth.
    const qvx = qvel(e.vx);
    const qvz = qvel(e.vz);
    moverVel = { vx: qvx, vz: qvz };
    let a = anchors ? anchors.get(e.id) : undefined;
    if (a) {
      const p = moverAt(a, qvx, qvz, tick);
      if (Math.abs(p.qx - tx) > MOVER_TOL || Math.abs(p.qz - tz) > MOVER_TOL || Math.abs(p.qtr - ttr) > MOVER_TOL || tick < a.t0) a = undefined;
    }
    if (!a) {
      a = { t0: tick, x0: tx, z0: tz, tr0: ttr };
      if (anchors) anchors.set(e.id, a);
    }
    q.mv = { t0: a.t0, x0: a.x0, z0: a.z0, tr0: a.tr0 };
  } else if (isNum(e.x) && isNum(e.z) && Math.abs(e.x) < POS_LIMIT && Math.abs(e.z) < POS_LIMIT) {
    q.ch |= CH.POS;
    q.qx = qpos(e.x);
    q.qz = qpos(e.z);
    handled.add('x');
    handled.add('z');
  }
  if (isNum(e.hp) && Math.abs(e.hp) < 1e12) {
    q.ch |= CH.HP;
    q.hp = qhp(e.hp);
    handled.add('hp');
  }
  if (isVec(e.facing) && isUnit(e.facing.x, e.facing.z)) {
    q.ch |= CH.YAW;
    q.yaw = yawOf(e.facing.x, e.facing.z);
    handled.add('facing');
  }
  if (isUnit(e.faceX, e.faceZ)) {
    q.ch |= CH.YAWF;
    q.yawf = yawOf(e.faceX, e.faceZ);
    handled.add('faceX');
    handled.add('faceZ');
  }
  if (isVec(e.aim) && Math.abs(e.aim.x) < AIM_LIMIT && Math.abs(e.aim.z) < AIM_LIMIT) {
    q.ch |= CH.AIM;
    q.ax = qaim(e.aim.x);
    q.az = qaim(e.aim.z);
    handled.add('aim');
  }
  for (const k of Object.keys(e)) {
    const v = e[k];
    if (typeof v === 'boolean' && FLAG_INDEX.has(k)) {
      const bit = 1 << FLAG_INDEX.get(k);
      q.fp |= bit;
      if (v) q.fv |= bit;
      handled.add(k);
    }
  }
  if (q.fp) q.ch |= CH.FLAGS;
  for (const k of Object.keys(e)) {
    if (handled.has(k)) continue;
    const v = e[k];
    if (v === undefined) continue;
    rest[k] = v;
  }
  if (moverVel) {
    rest.vx = moverVel.vx;
    rest.vz = moverVel.vz;
  }
  // Protocol v3 (fix-M5a-r4, NET4-F3 — measured per-snapshot costs): unit
  // directions that ride in the rest as raw doubles are snapped to the same
  // 256-step table as YAW (values k/4096: dyadic, 3 bytes each), so a
  // Healer's aim (lastAimDir) or a ram's guard arc (guard.dirX/dirZ, rewritten
  // every tick from its facing) changes on the wire only when the direction
  // moves a step. Presentation-only on a guest; the host sim keeps its own.
  if (isVec(rest.lastAimDir) && isUnit(rest.lastAimDir.x, rest.lastAimDir.z)) {
    const i = yawOf(rest.lastAimDir.x, rest.lastAimDir.z);
    rest.lastAimDir = { x: COS8[i], z: SIN8[i] };
  }
  const g = rest.guard;
  if (g !== null && typeof g === 'object' && !Array.isArray(g) && isUnit(g.dirX, g.dirZ)) {
    const i = yawOf(g.dirX, g.dirZ);
    rest.guard = { ...g, dirX: COS8[i], dirZ: SIN8[i] };
  }
  q.rest = rest;
  if (!(q.ch & CH.YAWF)) q.yawf = 0;
  return q;
}
// Replicated mover velocity: 1/65536 u per tick (exact dyadic); beyond
// ±2^20 u/tick (never in the sim) the raw value is kept.
function qvel(v) {
  return Math.abs(v) < 2 ** 20 ? Math.round(v * 65536) / 65536 + 0 : v;
}
// traveled uses the position grid too (a distance in u).
function qhpPos(v) {
  return Math.round(v * QPOS) + 0;
}

// view(q, tick) -> plain entity (the quantised truth both sides agree on).
// `rest` is shallow-shared: callers that mutate must clone (snapshot.js
// hands out views built from its own decoded copies).
export function viewEntity(q, tick) {
  const e = {};
  const rest = q.rest || {};
  for (const k of Object.keys(rest)) e[k] = rest[k];
  e.id = q.id;
  if (q.ch & CH.MOVER) {
    const p = moverAt(q.mv, rest.vx, rest.vz, tick);
    e.x = dpos(p.qx);
    e.z = dpos(p.qz);
    e.traveled = p.qtr / QPOS;
  } else if (q.ch & CH.POS) {
    e.x = dpos(q.qx);
    e.z = dpos(q.qz);
  }
  if (q.ch & CH.HP) e.hp = dhp(q.hp);
  if (q.ch & CH.YAW) e.facing = { x: COS8[q.yaw], z: SIN8[q.yaw] };
  if (q.ch & CH.YAWF) {
    e.faceX = COS8[q.yawf];
    e.faceZ = SIN8[q.yawf];
  }
  if (q.ch & CH.AIM) e.aim = { x: daim(q.ax), z: daim(q.az) };
  if (q.ch & CH.FLAGS) {
    for (let i = 0; i < FLAG_KEYS.length; i++) {
      const bit = 1 << i;
      if (q.fp & bit) e[FLAG_KEYS[i]] = (q.fv & bit) !== 0;
    }
  }
  return e;
}

// Quantised-channel equality (rest compared separately by the tree diff).
export function sameChannels(a, b) {
  return (
    a.ch === b.ch &&
    a.qx === b.qx &&
    a.qz === b.qz &&
    a.hp === b.hp &&
    a.yaw === b.yaw &&
    a.yawf === b.yawf &&
    a.ax === b.ax &&
    a.az === b.az &&
    a.fp === b.fp &&
    a.fv === b.fv &&
    sameAnchor(a.mv, b.mv)
  );
}
export function sameAnchor(a, b) {
  if (!a || !b) return a === b;
  return a.t0 === b.t0 && a.x0 === b.x0 && a.z0 === b.z0 && a.tr0 === b.tr0;
}
