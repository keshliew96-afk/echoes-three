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
// Schema 2 (M4c, 2026-09-22 user correction): at most 4 skill slots and 8 node
// sockets on every skill. Schema-1 files (8 skill slots, 2-socket active rows,
// 1-socket passive rows) load through MIGRATIONS[1] below.
// Schema 3 (CAMPAIGN, 2026-09-25 — PLAN §12.8, the linear campaign): the run
// system's level director (`systems.run.campaign`, the level-transition card
// included) and `meta.level / levelName / campaign`. Schema-2 files load
// through MIGRATIONS[2] below (an active act run becomes a campaign from its
// level).
export const SCHEMA = 3;
// StateTree `v` written by capture.js (STATE_VERSION there must equal this).
export const TREE_VERSION = 3;
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
// MIGRATIONS[n] upgrades a schema-n file body to schema n+1.
//
// 1 -> 2 (M4c, the user's skill/socket correction). Deterministic, pure, never
// throws on a structurally valid v1 tree, draws no RNG:
//   - skills: the owned skills are compacted in ascending slot order and the
//     FIRST 4 are kept (the two starters always survive); a skill beyond the
//     4th is dropped — its socketed nodes go back to the bench (provenance
//     kept, bench order: existing bench, then the dropped rows in slot order),
//     its passive clock, Resonance counter, pending Echo recasts and Reapply
//     clock go with it. The player entity's `skills` mirror follows.
//   - build rows: every kept row pads to 8 sockets (was 2 on actives, 1 on
//     passives); no node moves.
//   - run: a pending SKILL reward with no free slot left becomes the §16
//     empty offer ("the run moves on"); the free-slot counts of a pending
//     reward / path offer are recomputed as 4 − owned.
//   - meta.skills: trimmed to the kept skills.
// The numbers are the schema-2 constants frozen here (4 slots, 8 sockets) —
// a later change to either lands as its own migration.
const V2_SKILL_SLOTS = 4;
const V2_SOCKETS = 8;
function migrateTree1to2(tree) {
  const t = clonePlain(tree);
  t.v = 2;
  const sys = t.systems && typeof t.systems === 'object' ? t.systems : {};
  const sk = sys.skills;
  const kept = [];
  const dropped = [];
  if (sk && Array.isArray(sk.slots)) {
    for (const s of sk.slots) {
      if (!s || typeof s !== 'object' || typeof s.id !== 'string') continue;
      if (kept.length < V2_SKILL_SLOTS) kept.push(s);
      else dropped.push(s.id);
    }
    sk.slots = kept.slice();
    while (sk.slots.length < V2_SKILL_SLOTS) sk.slots.push(null);
    if (Array.isArray(sk.auraNext)) sk.auraNext = sk.auraNext.filter((p) => Array.isArray(p) && !dropped.includes(p[0]));
  }
  const keptIds = kept.map((s) => s.id);
  const ents = t.registry && Array.isArray(t.registry.entities) ? t.registry.entities : [];
  const player = ents.find((e) => e && e.kind === 'player');
  if (player && Array.isArray(player.skills)) {
    player.skills = keptIds.slice();
    while (player.skills.length < V2_SKILL_SLOTS) player.skills.push(null);
  }
  const b = sys.build;
  if (b && typeof b === 'object') {
    if (!Array.isArray(b.bench)) b.bench = [];
    const rows = [];
    for (const pair of Array.isArray(b.assignments) ? b.assignments : []) {
      if (!Array.isArray(pair)) continue;
      const [id, row] = pair;
      const list = Array.isArray(row) ? row : [];
      if (dropped.includes(id)) {
        for (const r of list) if (r) b.bench.push(r);
        continue;
      }
      const out = list.map((r) => (r ? r : null));
      while (out.length < V2_SOCKETS) out.push(null);
      rows.push([id, out]);
    }
    b.assignments = rows;
    if (Array.isArray(b.resonance)) b.resonance = b.resonance.filter((p) => Array.isArray(p) && !dropped.includes(p[0]));
    if (Array.isArray(b.echoQueue)) b.echoQueue = b.echoQueue.filter((r) => !(r && dropped.includes(r.skill)));
    if (Array.isArray(b.auraEchoNext)) b.auraEchoNext = b.auraEchoNext.filter((p) => Array.isArray(p) && !dropped.includes(p[0]));
  }
  const free = Math.max(0, V2_SKILL_SLOTS - kept.length);
  const run = sys.run;
  if (run && typeof run === 'object') {
    if (run.reward && typeof run.reward === 'object') {
      if (run.reward.type === 'skill' && (free === 0 || keptIds.includes(run.reward.id))) {
        run.reward = { ...run.reward, type: null, id: null, substituted: false, line: 'the run moves on', poolSize: 0 };
      }
      run.reward.freeSkillSlots = free;
    }
    if (run.path && typeof run.path === 'object') run.path.freeSkillSlots = free;
  }
  return { tree: t, dropped, kept: keptIds };
}
export function migrateFile1to2(file) {
  const { tree, kept } = migrateTree1to2(file.state);
  const meta = file.meta && typeof file.meta === 'object' ? { ...file.meta } : file.meta;
  if (meta && Array.isArray(meta.skills)) meta.skills = kept.slice();
  return { ...file, schema: 2, meta, state: tree };
}

// 2 -> 3 (CAMPAIGN, the user's linear-campaign refactor — PLAN §12.8). Pure,
// deterministic, draws no RNG, never throws on a structurally valid v2 tree:
//   - an ACTIVE run at act N becomes a campaign from level N (mode
//     'campaign', index 1, no starter grant — the build is already there,
//     not harness-started: the load lock check applies); its level record
//     keeps the rooms done so far;
//   - a camp tree (no active run) gets `campaign: null`;
//   - `autoReturnTick: null` (no CAMPAIGN COMPLETE card in a v2 tree);
//   - a v2 tree written by a v0.5.89-90 build already carries `campaign`:
//     it is kept as it is;
//   - meta gains `level`, `levelName` and `campaign { mode, startLevel,
//     level, index }` (the slot list reads them).
function campaignOfRun(run) {
  if (!run || typeof run !== 'object' || !run.active) return null;
  const act = Number.isFinite(run.act) ? run.act : 1;
  const startTick = Number.isFinite(run.startTick) ? run.startTick : 0;
  return {
    mode: 'campaign',
    harness: false,
    startLevel: act,
    level: act,
    index: 1,
    levels: [{ level: act, index: 1, startTick, rooms: Number.isFinite(run.roomsDone) ? run.roomsDone : 0, cleared: false, ticks: 0 }],
    startTick,
    levelStartTick: startTick,
    clearedAt: 0,
    card: null,
    grant: null,
    transitions: 0,
  };
}
export function campaignMeta(run) {
  const c = run && run.campaign && typeof run.campaign === 'object' ? run.campaign : null;
  return c ? { mode: c.mode ?? 'campaign', startLevel: c.startLevel ?? null, level: c.level ?? null, index: c.index ?? 1 } : null;
}
function migrateTree2to3(tree) {
  const t = clonePlain(tree);
  t.v = 3;
  const run = t.systems && t.systems.run && typeof t.systems.run === 'object' ? t.systems.run : null;
  if (run) {
    if (!('campaign' in run) || run.campaign === undefined) run.campaign = campaignOfRun(run);
    if (!Number.isFinite(run.autoReturnTick)) run.autoReturnTick = null;
  }
  return t;
}
export function migrateFile2to3(file) {
  const tree = migrateTree2to3(file.state);
  const run = tree.systems && tree.systems.run ? tree.systems.run : null;
  const meta = file.meta && typeof file.meta === 'object' ? { ...file.meta } : file.meta;
  if (meta && typeof meta === 'object') {
    meta.level = Number.isFinite(meta.act) ? meta.act : run && Number.isFinite(run.act) ? run.act : 1;
    if (!('levelName' in meta)) meta.levelName = meta.actName ?? null;
    meta.campaign = campaignMeta(run);
  }
  return { ...file, schema: 3, meta, state: tree };
}

export const MIGRATIONS = Object.freeze({
  1: migrateFile1to2,
  2: migrateFile2to3,
});

// ------------------------------------------------------------ envelope --
const TREE_KEYS = ['v', 'clock', 'rng', 'registry', 'world', 'systems', 'scene', 'app'];
const SYSTEM_KEYS = ['combat', 'skills', 'build', 'enemies', 'waves', 'allies', 'boss', 'run', 'layout', 'movement', 'shapes'];

// checkTree(tree) -> null | 'reason' — structural validation BEFORE anything
// touches the live world (apply() refuses a tree that fails it).
export function checkTree(tree) {
  if (!tree || typeof tree !== 'object') return 'state is not an object';
  for (const k of TREE_KEYS) if (!(k in tree)) return `state.${k} missing`;
  if (tree.v !== TREE_VERSION) return `state.v ${tree.v} unsupported`;
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
    // The stored tree was verified above; the migrated body gets its own
    // hash so a caller that re-writes it (rename, import, restore) writes a
    // self-consistent file of the current schema (M4c; CAMPAIGN schema 3).
    try {
      file = { ...file, hash: hashState(file.state) };
    } catch (err) {
      return { ok: false, error: 'corrupt', detail: `migration produced non-plain data (${String(err && err.message).slice(0, 80)})`, file };
    }
  }
  return { ok: true, file, migrated };
}
