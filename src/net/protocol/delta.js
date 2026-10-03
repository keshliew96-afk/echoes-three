// HOT entity-table delta codec (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ISOMORPHIC, pure.
//
// Encodes the quantised entity table (quantize.js) of one snapshot against a
// BASELINE table (the newest snapshot the receiver acknowledged) or against
// nothing (a full snapshot):
//
//   varu despawnCount · varu ids (ascending, first absolute then +gaps)
//   varu changedCount · entries (ascending id):
//     varu id (first absolute, then +gap) · varu field mask (protocol v3:
//     the bits every moving actor sets sit below 128, so the usual mask is
//     ONE byte — fix-M5a-r4 NET4-F3; v2 wrote a u16 with X at bit 2) ·
//     bit 0  X      vari Δqx          bit 1  Z     vari Δqz
//     bit 2  YAWF   u8 yaw            bit 3  REST  (see below)
//     bit 4  HP     vari Δhp          bit 5  YAW   u8 yaw
//     bit 6  FLAGS  varu presence · varu values
//     bit 7  AIM    vari Δax · vari Δaz
//     bit 8  NEW    no baseline entity: every present channel written raw
//     bit 9  CH     u8 channel layout (always with NEW)
//     bit 10 MOVER  u8 present · vari Δt0 · vari Δx0 · vari Δz0 · vari Δtr0
//                   (anchor; a NEW mover's t0 is relative to the snapshot tick)
//     REST          the rest-field tree-diff patch (bvalue.js encodePatch
//                   against the baseline entity's rest and the snapshot's
//                   tick distance), or the whole rest object with NEW
//                   (bvalue.js encodeValue)
//   Fields are written in the order CH X Z HP YAW YAWF AIM FLAGS MOVER REST.
//
// Unchanged entities cost nothing; a moving actor costs ~5-7 bytes; a linear
// mover costs its spawn entry once and then nothing until it despawns (or
// re-anchors).
import { ByteWriter, ByteReader } from './codec.js';
import { diff, apply, isEmptyPatch, plainClone } from './treediff.js';
import { sameAnchor } from './quantize.js';
import { encodeValue, decodeValue, encodePatch, decodePatch } from './bvalue.js';

export const M = Object.freeze({
  X: 1 << 0,
  Z: 1 << 1,
  YAWF: 1 << 2,
  REST: 1 << 3,
  HP: 1 << 4,
  YAW: 1 << 5,
  FLAGS: 1 << 6,
  AIM: 1 << 7,
  NEW: 1 << 8,
  CH: 1 << 9,
  MOVER: 1 << 10,
});

const ZERO = Object.freeze({ id: 0, ch: 0, qx: 0, qz: 0, hp: 0, yaw: 0, yawf: 0, ax: 0, az: 0, fp: 0, fv: 0, mv: null, rest: {} });
const ZERO_MV = Object.freeze({ t0: 0, x0: 0, z0: 0, tr0: 0 });

// encodeHot(w, cur, base, dt?, tick?) — cur/base: arrays of quantised
// entities in ascending id order (base null = full); dt = cur tick - base tick
// (rest patches), tick = the snapshot tick (NEW mover anchors). The decoder
// passes the same dt / tick. Returns { changed, despawned, bytes }.
export function encodeHot(w, cur, base, dt = 0, tick = 0) {
  const start = w.len;
  const baseMap = new Map();
  if (base) for (const b of base) baseMap.set(b.id, b);
  const curIds = new Set();
  for (const e of cur) curIds.add(e.id);
  const despawned = [];
  if (base) for (const b of base) if (!curIds.has(b.id)) despawned.push(b.id);
  w.varu(despawned.length);
  let prev = 0;
  despawned.forEach((id, i) => {
    w.varu(i === 0 ? id : id - prev);
    prev = id;
  });

  const entries = [];
  for (const e of cur) {
    const b = baseMap.get(e.id);
    if (!b) {
      entries.push({ e, b: null, patch: null });
      continue;
    }
    const patch = diff(b.rest, e.rest);
    if (!isEmptyPatch(patch) || !sameChannelsNoRest(e, b)) entries.push({ e, b, patch });
  }
  w.varu(entries.length);
  prev = 0;
  entries.forEach(({ e, b, patch }, i) => {
    w.varu(i === 0 ? e.id : e.id - prev);
    prev = e.id;
    writeEntity(w, e, b, patch, dt, tick);
  });
  return { changed: entries.length, despawned: despawned.length, bytes: w.len - start };
}

function sameChannelsNoRest(a, b) {
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

function writeEntity(w, e, b, patch, dt, tick) {
  const isNew = !b;
  const base = b || ZERO;
  let mask = 0;
  if (isNew) mask |= M.NEW | M.CH;
  else if (e.ch !== base.ch) mask |= M.CH;
  if (e.qx !== base.qx) mask |= M.X;
  if (e.qz !== base.qz) mask |= M.Z;
  if (e.hp !== base.hp) mask |= M.HP;
  if (e.yaw !== base.yaw) mask |= M.YAW;
  if (e.yawf !== base.yawf) mask |= M.YAWF;
  if (e.ax !== base.ax || e.az !== base.az) mask |= M.AIM;
  if (e.fp !== base.fp || e.fv !== base.fv) mask |= M.FLAGS;
  if (!sameAnchor(e.mv, base.mv)) mask |= M.MOVER;
  if (isNew) {
    if (Object.keys(e.rest).length > 0) mask |= M.REST;
  } else if (patch && !isEmptyPatch(patch)) mask |= M.REST;
  w.varu(mask);
  if (mask & M.CH) w.u8(e.ch);
  if (mask & M.X) w.vari(e.qx - base.qx);
  if (mask & M.Z) w.vari(e.qz - base.qz);
  if (mask & M.HP) w.vari(e.hp - base.hp);
  if (mask & M.YAW) w.u8(e.yaw);
  if (mask & M.YAWF) w.u8(e.yawf);
  if (mask & M.AIM) {
    w.vari(e.ax - base.ax);
    w.vari(e.az - base.az);
  }
  if (mask & M.FLAGS) {
    w.varu(e.fp);
    w.varu(e.fv);
  }
  if (mask & M.MOVER) {
    const m = e.mv || ZERO_MV;
    const bm = base.mv || (isNew ? { ...ZERO_MV, t0: tick } : ZERO_MV);
    w.u8(e.mv ? 1 : 0);
    w.vari(m.t0 - bm.t0);
    w.vari(m.x0 - bm.x0);
    w.vari(m.z0 - bm.z0);
    w.vari(m.tr0 - bm.tr0);
  }
  if (mask & M.REST) {
    if (isNew) encodeValue(w, e.rest);
    else encodePatch(w, patch, b.rest, dt);
  }
}

// decodeHot(r, base) -> quantised entity array (ascending id). `base` is the
// baseline's quantised array (null for a full snapshot). Baseline objects are
// never mutated (their rest objects are shared when unchanged).
export function decodeHot(r, base, dt = 0, tick = 0) {
  const map = new Map();
  if (base) for (const b of base) map.set(b.id, b);
  const nDes = r.varu();
  let id = 0;
  for (let i = 0; i < nDes; i++) {
    id = i === 0 ? r.varu() : id + r.varu();
    if (!map.delete(id)) throw new RangeError(`delta despawns unknown entity ${id}`);
  }
  const nCh = r.varu();
  id = 0;
  for (let i = 0; i < nCh; i++) {
    id = i === 0 ? r.varu() : id + r.varu();
    const mask = r.varu();
    if (mask >= 1 << 11) throw new RangeError(`delta: bad field mask ${mask}`);
    const b = map.get(id);
    const isNew = (mask & M.NEW) !== 0;
    if (isNew === !!b) throw new RangeError(isNew ? `NEW entity ${id} already in baseline` : `delta for entity ${id} missing from baseline`);
    const base = b || ZERO;
    const q = {
      id,
      ch: mask & M.CH ? r.u8() : base.ch,
      qx: base.qx,
      qz: base.qz,
      hp: base.hp,
      yaw: base.yaw,
      yawf: base.yawf,
      ax: base.ax,
      az: base.az,
      fp: base.fp,
      fv: base.fv,
      mv: base.mv,
      rest: base.rest,
    };
    if (mask & M.X) q.qx = base.qx + r.vari();
    if (mask & M.Z) q.qz = base.qz + r.vari();
    if (mask & M.HP) q.hp = base.hp + r.vari();
    if (mask & M.YAW) q.yaw = r.u8();
    if (mask & M.YAWF) q.yawf = r.u8();
    if (mask & M.AIM) {
      q.ax = base.ax + r.vari();
      q.az = base.az + r.vari();
    }
    if (mask & M.FLAGS) {
      q.fp = r.varu();
      q.fv = r.varu();
    }
    if (mask & M.MOVER) {
      const present = r.u8() === 1;
      const bm = base.mv || (isNew ? { ...ZERO_MV, t0: tick } : ZERO_MV);
      const m = { t0: bm.t0 + r.vari(), x0: bm.x0 + r.vari(), z0: bm.z0 + r.vari(), tr0: bm.tr0 + r.vari() };
      q.mv = present ? m : null;
    }
    if (mask & M.REST) {
      if (isNew) {
        const obj = decodeValue(r);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new RangeError('NEW rest is not an object');
        q.rest = obj;
      } else q.rest = apply(plainClone(base.rest), decodePatch(r, 0, base.rest, dt));
    } else if (isNew) q.rest = {};
    map.set(id, q);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

// Stand-alone helpers (tests / tools).
export function encodeHotBytes(cur, base) {
  const w = new ByteWriter(64 + cur.length * 16);
  encodeHot(w, cur, base);
  return w.finish();
}
export function decodeHotBytes(u8, base) {
  return decodeHot(new ByteReader(u8), base);
}
