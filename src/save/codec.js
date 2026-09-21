// Save codec (docs/gauntlet/PLAN.md §3.4). Owner: M2. Pure module — no DOM,
// no three — so the browser, Node tools and the network layer share it.
//
//   clonePlain(v)        deep copy of plain data, EXACT for every number
//                        (-0, NaN, ±Infinity survive) and for key order;
//                        throws a TypeError naming the path on a function,
//                        symbol, bigint, class instance or a cycle.
//   encodeOrdered(v)     tagged JSON in INSERTION key order (the file body).
//                        Same number tags as core/canonical.js, so
//                        parseCanonical() decodes it; key order is kept so a
//                        loaded object iterates exactly like the saved one
//                        (status records, Map-as-pairs arrays). The integrity
//                        hash is always hashState() = FNV-1a over the SORTED
//                        canonical form, so order never changes a hash.
//   buildFile / parseFile / checkTree / MIGRATIONS — the schema v1 envelope.
import { parseCanonical } from '../core/canonical.js';
import { hashState } from '../core/hash.js';

export const SAVE_FORMAT = 'echoes-save';
export const SCHEMA = 1;
const MAX_DEPTH = 64;

// --------------------------------------------------------------- clone --
function cloneAt(v, path, depth, seen) {
  if (v === null) return null;
  const t = typeof v;
  if (t === 'number' || t === 'string' || t === 'boolean') return v;
  if (t === 'undefined') return undefined;
  if (t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new TypeError(`save: ${t} at ${path} (sim state must be plain data)`);
  }
  if (depth > MAX_DEPTH) throw new TypeError(`save: nesting deeper than ${MAX_DEPTH} at ${path}`);
  if (seen.has(v)) throw new TypeError(`save: cycle at ${path}`);
  seen.add(v);
  let out;
  if (Array.isArray(v)) {
    out = new Array(v.length);
    for (let i = 0; i < v.length; i++) {
      const c = cloneAt(v[i], `${path}[${i}]`, depth + 1, seen);
      out[i] = c === undefined ? null : c; // JSON array semantics
    }
  } else {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) {
      const name = (v.constructor && v.constructor.name) || 'unknown';
      throw new TypeError(`save: non-plain ${name} at ${path} (use arrays/objects only)`);
    }
    out = {};
    for (const k of Object.keys(v)) {
      const c = cloneAt(v[k], `${path}.${k}`, depth + 1, seen);
      if (c !== undefined) out[k] = c;
    }
  }
  seen.delete(v); // shared (aliased) sub-objects are fine — only cycles are not
  return out;
}

export function clonePlain(v) {
  return cloneAt(v, '$', 0, new Set());
}

// -------------------------------------------------------------- encode --
function encNum(n) {
  if (Number.isNaN(n)) return '{"$n":"NaN"}';
  if (n === Infinity) return '{"$n":"Inf"}';
  if (n === -Infinity) return '{"$n":"-Inf"}';
  if (n === 0 && 1 / n < 0) return '{"$n":"-0"}';
  return JSON.stringify(n);
}

function enc(v, out) {
  if (v === null) {
    out.push('null');
    return;
  }
  switch (typeof v) {
    case 'number':
      out.push(encNum(v));
      return;
    case 'string':
      out.push(JSON.stringify(v));
      return;
    case 'boolean':
      out.push(v ? 'true' : 'false');
      return;
    default:
      break;
  }
  if (Array.isArray(v)) {
    out.push('[');
    for (let i = 0; i < v.length; i++) {
      if (i) out.push(',');
      const e = v[i];
      if (e === undefined || typeof e === 'function' || typeof e === 'symbol') out.push('null');
      else enc(e, out);
    }
    out.push(']');
    return;
  }
  out.push('{');
  let first = true;
  for (const k of Object.keys(v)) {
    const e = v[k];
    if (e === undefined || typeof e === 'function' || typeof e === 'symbol') continue;
    if (!first) out.push(',');
    first = false;
    out.push(JSON.stringify(k), ':');
    enc(e, out);
  }
  out.push('}');
}

// encodeOrdered(value) -> string (call on clonePlain output: it assumes plain data).
export function encodeOrdered(value) {
  const out = [];
  enc(value, out);
  return out.join('');
}

export const decode = parseCanonical;

// ---------------------------------------------------------- migrations --
// MIGRATIONS[n] upgrades a schema-n file body to schema n+1 (v1 is current,
// so the chain is empty; the slot exists so v2 lands as one function).
export const MIGRATIONS = Object.freeze({
  // 1: (file) => ({ ...file, schema: 2, state: upgradeTree(file.state) }),
});

// ------------------------------------------------------------ envelope --
const TREE_KEYS = ['v', 'clock', 'rng', 'registry', 'world', 'systems', 'scene', 'app'];
const SYSTEM_KEYS = ['combat', 'skills', 'build', 'enemies', 'waves', 'allies', 'boss', 'run', 'layout', 'movement', 'shapes'];

// checkTree(tree) -> null | 'reason' — structural validation BEFORE anything
// touches the live world (apply() refuses a tree that fails it).
export function checkTree(tree) {
  if (!tree || typeof tree !== 'object') return 'state is not an object';
  for (const k of TREE_KEYS) if (!(k in tree)) return `state.${k} missing`;
  if (tree.v !== 1) return `state.v ${tree.v} unsupported`;
  if (!tree.clock || !Number.isFinite(tree.clock.tick)) return 'state.clock.tick missing';
  if (!tree.rng || !Number.isFinite(tree.rng.s) || !Number.isFinite(tree.rng.seed)) return 'state.rng incomplete';
  const reg = tree.registry;
  if (!reg || !Array.isArray(reg.entities) || !Number.isFinite(reg.nextOrdinal)) return 'state.registry incomplete';
  let prev = -1;
  for (const e of reg.entities) {
    if (!e || typeof e !== 'object' || !Number.isFinite(e.id)) return 'state.registry has an entity without an id';
    if (e.id <= prev) return 'state.registry ids are not strictly ascending';
    if (e.id >= reg.nextOrdinal) return 'state.registry id beyond nextOrdinal';
    prev = e.id;
  }
  if (!reg.entities.some((e) => e.kind === 'player')) return 'state.registry has no player';
  if (!tree.world || !Number.isFinite(tree.world.tick)) return 'state.world.tick missing';
  if (!tree.systems || typeof tree.systems !== 'object') return 'state.systems missing';
  for (const k of SYSTEM_KEYS) if (!(k in tree.systems)) return `state.systems.${k} missing`;
  if (!tree.systems.run || typeof tree.systems.run.phase !== 'string') return 'state.systems.run.phase missing';
  if (!tree.systems.skills || !Array.isArray(tree.systems.skills.slots)) return 'state.systems.skills.slots missing';
  return null;
}

// buildFile({ slot, meta, state, game, createdAt, savedAt }) -> { file, text, hash }
// `state` must already be a clonePlain() tree.
export function buildFile({ slot, meta, state, game, createdAt, savedAt }) {
  const hash = hashState(state);
  const file = {
    format: SAVE_FORMAT,
    schema: SCHEMA,
    game,
    slot,
    createdAt,
    savedAt,
    meta,
    state,
    hash,
  };
  return { file, text: encodeOrdered(file), hash };
}

// parseFile(text, { maxSchema = SCHEMA }) ->
//   { ok: true, file, migrated }                   verified + migrated to SCHEMA
//   { ok: false, error: 'corrupt'|'version'|'hash', detail, file? }
// Order of checks: JSON -> envelope -> schema (newer = refused, never
// modified) -> required keys -> integrity hash over the tree AS STORED (a
// migrated tree's hash is recomputed by the next save) -> migrations.
export function parseFile(text, { maxSchema = SCHEMA } = {}) {
  if (typeof text !== 'string' || text.length === 0) return { ok: false, error: 'corrupt', detail: 'empty file' };
  let file;
  try {
    file = decode(text);
  } catch (err) {
    return { ok: false, error: 'corrupt', detail: `not valid JSON (${String(err && err.message).slice(0, 80)})` };
  }
  if (!file || typeof file !== 'object' || file.format !== SAVE_FORMAT) {
    return { ok: false, error: 'corrupt', detail: 'not an Echoes save file' };
  }
  if (!Number.isInteger(file.schema) || file.schema < 1) return { ok: false, error: 'corrupt', detail: 'schema missing', file };
  if (file.schema > maxSchema) {
    return { ok: false, error: 'version', detail: `made by a newer version of Echoes (schema ${file.schema}, this build reads ${maxSchema})`, file };
  }
  if (!file.slot || typeof file.slot !== 'object' || !file.meta || typeof file.hash !== 'string') {
    return { ok: false, error: 'corrupt', detail: 'required keys missing (slot / meta / hash)', file };
  }
  const bad = file.schema === SCHEMA ? checkTree(file.state) : null;
  if (bad) return { ok: false, error: 'corrupt', detail: `required keys missing (${bad})`, file };
  let h;
  try {
    h = hashState(file.state);
  } catch (err) {
    return { ok: false, error: 'corrupt', detail: `state is not plain data (${String(err && err.message).slice(0, 80)})`, file };
  }
  if (h !== file.hash) return { ok: false, error: 'hash', detail: `integrity check failed (stored ${file.hash}, computed ${h})`, file };
  let migrated = false;
  while (file.schema < SCHEMA) {
    const up = MIGRATIONS[file.schema];
    if (typeof up !== 'function') return { ok: false, error: 'version', detail: `no migration from schema ${file.schema}`, file };
    file = up(file);
    migrated = true;
  }
  if (migrated) {
    const bad2 = checkTree(file.state);
    if (bad2) return { ok: false, error: 'corrupt', detail: `migration produced an invalid tree (${bad2})`, file };
  }
  return { ok: true, file, migrated };
}
