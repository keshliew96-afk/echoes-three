// Null-safe tagged tree diff (docs/gauntlet/PLAN.md §3.7 COLD part). Owner:
// M5a. ISOMORPHIC, pure.
//
// NOT RFC 7386 merge patch: there `null` means "delete" and arrays are
// replaced wholesale, while the sim tree is full of fields that legitimately
// become null (allies mark / rallyPoint, boss bossId, run reward / path /
// shop / frame, skills override, waves waystoneId).
//
//   Patch := { [key]: Op }                       only keys whose canonical value changed
//   Op    := ['s', value]                        set / replace (null, [], {} or any value)
//          | ['d']                               delete the key (absent ≠ null)
//          | ['o', Patch]                        recurse: plain object on both sides
//          | ['a', newLen, [[i, Op], …]]         array by index: resize to newLen, then patch
//                                                the listed indices (indices ≥ old length use 's')
//          | ['k', idKey, order[], { [id]: Op }] keyed array: every element on both sides is a
//                                                plain object with a unique scalar id at idKey
//                                                ('id'), or a [k, v] pair with a unique scalar k
//                                                (idKey 0 = Map-as-pairs); order = new id
//                                                sequence; ids new to the array use 's'
//
// diffValue(a, b) picks 'k' when both arrays qualify (auto-detected,
// deterministic), else 'a' when both are arrays, 'o' when both are plain
// objects, else 's'.
//
// Law (gate G5a.3): canonicalJSON(apply(clone(a), diff(a, b))) === canonicalJSON(b)
// for every pair canonicalJSON accepts; diff(a, a) = {}.
//
// Equality is CANONICAL equality: an object member holding `undefined` is the
// same as an absent member, an array element holding `undefined` is `null`
// (exactly what canonicalJSON writes), NaN equals NaN, and -0 differs from 0
// (canonicalJSON tags -0). Functions / class instances throw (the §3.4
// plain-data contract), like canonicalJSON.
//
// A patch is plain data: send it with canonicalJSON and read it back with
// parseCanonical so -0 / NaN / ±Infinity survive the wire.

function kindOf(v) {
  if (v === null || v === undefined) return 'null';
  const t = typeof v;
  if (t === 'number' || t === 'string' || t === 'boolean') return t;
  if (t === 'function' || t === 'symbol' || t === 'bigint') throw new TypeError(`treediff: ${t} is not plain data`);
  if (Array.isArray(v)) return 'array';
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError(`treediff: non-plain ${(v.constructor && v.constructor.name) || 'object'} (use arrays/objects only)`);
  }
  return 'object';
}

// Canonical deep equality.
export function canonicalEqual(a, b) {
  if (a === b) return a !== 0 || Object.is(a, b); // 0 vs -0 differ
  const ka = kindOf(a);
  const kb = kindOf(b);
  if (ka !== kb) return false;
  switch (ka) {
    case 'null':
      return true;
    case 'number':
      return Object.is(a, b);
    case 'string':
    case 'boolean':
      return false; // a !== b already
    case 'array': {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!canonicalEqual(a[i], b[i])) return false;
      return true;
    }
    default: {
      let na = 0;
      for (const k of Object.keys(a)) {
        const va = a[k];
        if (va === undefined) continue;
        na += 1;
        if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
        if (!canonicalEqual(va, b[k])) return false;
      }
      let nb = 0;
      for (const k of Object.keys(b)) if (b[k] !== undefined) nb += 1;
      return na === nb;
    }
  }
}

// Deep plain clone with canonical normalisation (undefined members dropped,
// undefined array elements -> null). Numbers are copied exactly.
export function plainClone(v) {
  const k = kindOf(v);
  if (k === 'null') return null;
  if (k === 'array') {
    const out = new Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = plainClone(v[i]);
    return out;
  }
  if (k === 'object') {
    const out = {};
    for (const key of Object.keys(v)) {
      const x = v[key];
      if (x === undefined) continue;
      setOwn(out, key, plainClone(x));
    }
    return out;
  }
  return v;
}

// `__proto__` as a data key must never become a prototype assignment
// (prototype pollution from a hostile patch).
function setOwn(obj, key, value) {
  if (key === '__proto__') Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
  else obj[key] = value;
}
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ------------------------------------------------------ keyed arrays --
function scalarId(v) {
  if (typeof v === 'string') return 's';
  if (typeof v === 'number' && Number.isFinite(v) && !Object.is(v, -0)) return 'n';
  return null;
}

// Returns the idKey ('id' | 0) both arrays qualify for, or null.
function keyedIdKey(a, b) {
  if (a.length === 0 && b.length === 0) return null;
  if (qualifies(a, b, 'id')) return 'id';
  if (qualifies(a, b, 0)) return 0;
  return null;
}
function qualifies(a, b, idKey) {
  let type = null;
  for (const arr of [a, b]) {
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      let id;
      if (idKey === 'id') {
        if (e === null || typeof e !== 'object' || Array.isArray(e)) return false;
        const proto = Object.getPrototypeOf(e);
        if (proto !== Object.prototype && proto !== null) return false;
        id = e.id;
      } else {
        if (!Array.isArray(e) || e.length !== 2) return false;
        id = e[0];
      }
      const t = scalarId(id);
      if (!t) return false;
      if (type === null) type = t;
      else if (type !== t) return false;
      const key = String(id);
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return true;
}
const idOf = (e, idKey) => (idKey === 'id' ? e.id : e[0]);

// ------------------------------------------------------------- diff --
// diffValue(a, b) -> Op | null (null = canonically equal).
export function diffValue(a, b) {
  const ka = kindOf(a);
  const kb = kindOf(b);
  if (ka === 'object' && kb === 'object') {
    const p = diffObject(a, b);
    return p === null ? null : ['o', p];
  }
  if (ka === 'array' && kb === 'array') return diffArray(a, b);
  if (ka === kb) {
    if (ka === 'null') return null;
    if (ka === 'number' ? Object.is(a, b) : a === b) return null;
  }
  return ['s', plainClone(b)];
}

// Patch between two plain objects, or null when equal.
function diffObject(a, b) {
  let patch = null;
  for (const k of Object.keys(b)) {
    const vb = b[k];
    if (vb === undefined) continue;
    const va = hasOwn(a, k) ? a[k] : undefined;
    const op = va === undefined ? ['s', plainClone(vb)] : diffValue(va, vb);
    if (op) {
      if (!patch) patch = {};
      setOwn(patch, k, op);
    }
  }
  for (const k of Object.keys(a)) {
    if (a[k] === undefined) continue;
    if (!hasOwn(b, k) || b[k] === undefined) {
      if (!patch) patch = {};
      setOwn(patch, k, ['d']);
    }
  }
  return patch;
}

function diffArray(a, b) {
  const idKey = keyedIdKey(a, b);
  if (idKey !== null) {
    const old = new Map();
    for (const e of a) old.set(String(idOf(e, idKey)), e);
    const order = new Array(b.length);
    let ops = null;
    let sameOrder = a.length === b.length;
    for (let i = 0; i < b.length; i++) {
      const e = b[i];
      const id = idOf(e, idKey);
      order[i] = id;
      const key = String(id);
      if (sameOrder && String(idOf(a[i], idKey)) !== key) sameOrder = false;
      const prev = old.get(key);
      const op = prev === undefined ? ['s', plainClone(e)] : diffValue(prev, e);
      if (op) {
        if (!ops) ops = {};
        setOwn(ops, key, op);
      }
    }
    if (sameOrder && !ops) return null;
    return ['k', idKey, order, ops || {}];
  }
  const ops = [];
  const n = b.length;
  for (let i = 0; i < n; i++) {
    const vb = b[i] === undefined ? null : b[i];
    if (i >= a.length) {
      ops.push([i, ['s', plainClone(vb)]]);
      continue;
    }
    const va = a[i] === undefined ? null : a[i];
    const op = diffValue(va, vb);
    if (op) ops.push([i, op]);
  }
  if (ops.length === 0 && a.length === n) return null;
  return ['a', n, ops];
}

// diff(a, b) -> Patch for two plain-object roots ({} when equal).
export function diff(a, b) {
  if (kindOf(a) !== 'object' || kindOf(b) !== 'object') throw new TypeError('treediff.diff: both roots must be plain objects (use diffValue for other values)');
  return diffObject(a, b) || {};
}

export function isEmptyPatch(p) {
  if (!p) return true;
  for (const _k in p) return false; // eslint-disable-line no-unreachable-loop
  return true;
}

// ------------------------------------------------------------ apply --
// applyOp(value, op) -> the new value. May mutate `value` in place (objects
// and arrays are patched, not copied) — apply to a clone when the original
// must survive. Throws a TypeError('corrupt patch …') on an op that cannot
// apply, so a damaged or hostile patch never yields silently wrong state.
export function applyOp(value, op) {
  if (!Array.isArray(op) || op.length === 0) throw new TypeError('corrupt patch: op is not a tagged array');
  switch (op[0]) {
    case 's':
      if (op.length !== 2) throw new TypeError('corrupt patch: bad s op');
      return plainClone(op[1]);
    case 'o': {
      if (kindOf(value) !== 'object') throw new TypeError('corrupt patch: o op on a non-object');
      applyPatch(value, op[1]);
      return value;
    }
    case 'a': {
      if (kindOf(value) !== 'array') throw new TypeError('corrupt patch: a op on a non-array');
      const newLen = op[1];
      const list = op[2];
      if (!Number.isInteger(newLen) || newLen < 0 || !Array.isArray(list)) throw new TypeError('corrupt patch: bad a op');
      const oldLen = value.length;
      if (newLen < oldLen) value.length = newLen;
      for (const entry of list) {
        if (!Array.isArray(entry) || entry.length !== 2) throw new TypeError('corrupt patch: bad a entry');
        const [i, sub] = entry;
        if (!Number.isInteger(i) || i < 0 || i >= newLen) throw new TypeError('corrupt patch: a index out of range');
        if (i >= oldLen) {
          if (!Array.isArray(sub) || sub[0] !== 's') throw new TypeError('corrupt patch: new a index must use s');
          value[i] = plainClone(sub[1]);
        } else value[i] = applyOp(value[i] === undefined ? null : value[i], sub);
      }
      if (value.length < newLen) value.length = newLen;
      for (let i = oldLen; i < newLen; i++) if (!(i in value)) throw new TypeError('corrupt patch: a op left a hole');
      return value;
    }
    case 'k': {
      if (kindOf(value) !== 'array') throw new TypeError('corrupt patch: k op on a non-array');
      const idKey = op[1];
      const order = op[2];
      const ops = op[3];
      if ((idKey !== 'id' && idKey !== 0) || !Array.isArray(order) || kindOf(ops) !== 'object') throw new TypeError('corrupt patch: bad k op');
      const old = new Map();
      for (const e of value) {
        const id = idKey === 'id' ? e && e.id : Array.isArray(e) ? e[0] : undefined;
        old.set(String(id), e);
      }
      const out = new Array(order.length);
      for (let i = 0; i < order.length; i++) {
        const key = String(order[i]);
        const sub = hasOwn(ops, key) ? ops[key] : undefined;
        const prev = old.get(key);
        if (sub !== undefined) out[i] = prev === undefined ? applyNew(sub) : applyOp(prev, sub);
        else if (prev !== undefined) out[i] = prev;
        else throw new TypeError(`corrupt patch: k id ${key} has neither a baseline element nor an op`);
      }
      value.length = 0;
      for (let i = 0; i < out.length; i++) value.push(out[i]);
      return value;
    }
    case 'd':
      throw new TypeError('corrupt patch: d op outside an object');
    default:
      throw new TypeError(`corrupt patch: unknown op ${String(op[0])}`);
  }
}
function applyNew(sub) {
  if (!Array.isArray(sub) || sub[0] !== 's') throw new TypeError('corrupt patch: a new k element must use s');
  return plainClone(sub[1]);
}

function applyPatch(obj, patch) {
  if (kindOf(patch) !== 'object') throw new TypeError('corrupt patch: patch is not an object');
  for (const k of Object.keys(patch)) {
    if (k === '__proto__') throw new TypeError('corrupt patch: __proto__ key');
    const op = patch[k];
    if (Array.isArray(op) && op[0] === 'd') {
      if (op.length !== 1) throw new TypeError('corrupt patch: bad d op');
      delete obj[k];
      continue;
    }
    const cur = hasOwn(obj, k) ? obj[k] : undefined;
    if (cur === undefined) {
      if (!Array.isArray(op) || op[0] !== 's') throw new TypeError(`corrupt patch: key ${k} is absent, only s can create it`);
      setOwn(obj, k, plainClone(op[1]));
    } else setOwn(obj, k, applyOp(cur, op));
  }
  return obj;
}

// apply(target, patch) -> target, patched in place (plain-object root).
export function apply(target, patch) {
  if (kindOf(target) !== 'object') throw new TypeError('treediff.apply: root must be a plain object');
  return applyPatch(target, patch);
}
