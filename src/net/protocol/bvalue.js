// Binary canonical-value codec (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ISOMORPHIC, pure.
//
// Carries canonical-JSON data (the §3.4 plain-data contract: null, booleans,
// numbers incl. -0 / NaN / ±Infinity, strings, arrays, plain objects) and
// tree-diff patches (treediff.js ops s/d/o/a/k) in a compact binary form.
// decodeValue(encodeValue(v)) is CANONICALLY IDENTICAL to v (same
// canonicalJSON bytes; undefined members dropped, undefined array elements
// null) — the patch/tree SEMANTICS are exactly the JSON format PLAN §3.7
// specifies; only the byte encoding is tighter (~4-5x smaller than the JSON
// text for per-tick diffs such as {"castLeftTicks":["s",11]}: 25 -> 5 bytes).
//
// Value tags (u8):
//   0 null · 1 false · 2 true · 3 int (vari, safe integers, never -0)
//   4 f64 · 5 dec2 (vari k, value === k/100 exactly) · 6 q256 (vari k, k/256)
//   7 string inline (blob utf8) · 8 string from STR_DICT (varu index)
//   9 array (varu n, n values) · 10 object (varu n, n × key + value)
//   11 NaN · 12 +Infinity · 13 -Infinity · 14 -0
//   15 dyadic (protocol v3): u8 e (9-30) · vari k, value === k / 2^e exactly —
//      the quantised unit vectors (k/4096) and mover velocities (k/65536)
//      quantize.js puts in an entity's rest cost 3-5 bytes instead of 9
// Keys: varu code < KEY_DICT.length -> dictionary key; otherwise an inline
// utf8 key of (code - KEY_DICT.length) bytes follows.
// Patch: varu nKeys, nKeys × (key, op). Op tags (u8):
//   0 's' value · 1 'd' · 2 'o' patch · 3 'a' varu newLen · varu n · n × (varu i, op)
//   4 'k' u8 idKind (0 = 'id', 1 = pair index 0) · varu n · n × id value ·
//         varu m · m × (id value, op)
// BASELINE-RELATIVE forms (protocol v3, fix-M5a-r4 NET4-F3 — the encoder and
// the decoder both hold the patch's BASE tree, canonically equal, plus dt =
// the tick distance between the two snapshots). They decode to exactly the
// JSON ops above, so the §3.7 tree-diff law and its JSON format are unchanged;
// only the bytes shrink:
//   5 'u' = ['s', base + dt]  6 'w' = ['s', base - dt]   (a tick counter /
//     countdown: clock.tick, castLeftTicks, untilTick-style timers — no value)
//   7 'D' vari delta = ['s', base + delta]  (safe integers: ordinals, counters)
//   8 'k' against the base array: u8 idKind | orderMode << 1, then
//     orderMode 1: order = the base's id order (no ids written)
//     orderMode 2: order = the base's ids minus varu nDrop × varu index-gap,
//                  then varu nAdd × id value appended
//     followed by varu m · m × (id value, op) as in 4.
// A decoder without the base never meets them: encodePatch(w, patch) with no
// base writes tags 0-4 only.
// The dictionaries are part of the protocol (both sides run the same build —
// the server refuses mismatched builds); unknown keys / strings still work,
// they are just written inline. Order = measured frequency in the sim (the
// first 128 entries cost one byte) — re-measured for protocol v3 over Levels
// 1-3 and the Stag (tools/gntfixM5a4-dictscan.mjs + gntfixM5a4-gendict.mjs):
// snapshot keys, event values and strings; event KEYS ride in codec.js's
// static event shapes instead.
// Self-contained (no import from codec.js, which imports THIS module): the
// writer / reader are codec.js ByteWriter / ByteReader instances passed in.
// treediff.js (no imports of its own) rebuilds a queue's JSON op for 'as'.
import { diffValue, applyOp, plainClone } from './treediff.js';
const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });
const utf8 = (s) => te.encode(s);
const fromUtf8 = (b) => td.decode(b);

export const KEY_DICT = Object.freeze([
  'tick', 'stats', 'castLeftTicks', 'kind', 'radius', 'targetId', 'ticks', 'app', 'autopilot',
  'clock', 'playtimeTicks', 'run', 'systems', 'world', 'power', 'nextBasicTick', 'untilTick',
  'status', 'range', 'vx', 'vz', 'x', 'at', 'z', 'skill', 'nextOrdinal', 'registry', 'sourceId',
  'lastHitTick', 'draws', 'rng', 's', 'boltOwner', 'slow', 'hits', 'faction', 'nextTickTick',
  'ticksDone', 'kbTicks', 'atTick', 'kbVz', 'kbVx', 'telegraph', 'dirX', 'dirZ', 'cds', 'combat',
  'stopTick', 'delivery', 'lastAimDir', 'lastPlayerTelegraphStart', 'phase', 'grants', 'haste',
  'startTick', 'src', 'resolveTick', 'amount', 'mag', 'inspired', 'nextAttackTick', 'cost', 'build',
  'phaseUntilTick', 'wave', 'etype', 'mode', 'boss', 'heals', 'lastHeal', 'guard', 'playerTargeted',
  'maxHp', 'enemies', 'allies', 'fromX', 'fromZ', 'prevBasicHeld', 'readyTick', 'dmgMul', 'applied',
  'source', 'stopGranted', 'totalTicks', 'state', 'ownerId', 'cdByTarget', 'iframeUntilTick',
  'scale', 'skills', 'dashTicksLeft', 'target', 'casts', 'kills', 'spawnTick', 'slots', 'layout',
  'classId', 'crits', 'healCrits', 'shield', 'vents', 'blastRadius', 'hitstopRemaining', 'yaw',
  'hazards', 'throwTick', 'swoopTicksLeft', 'a', 'b', 'aiState', 'resonance', 'chargeTicksLeft',
  'reservations', 'landTick', 'ownerKind', 'slickRadius', 'slickSlow', 'slickTicks', 'tx', 'tz',
  'dodgeReadyTick', 'dashVel', 'dodges', 'lungeTicksLeft', 'echoQueue', 'critBonus', 'crit',
  'waves', 'bursts', 'telegraphStartTick', 'surfaceUntilTick', 'itype', 'lifecycle', 'budget',
  'type', 'pending', 'room', 'swoopVx', 'swoopVz', 'chargeVx', 'chargeVz', 'fullySpawnedTick', 'hx',
  'hz', 'length', 'shape', 'width', 'slot', 'cast', 'due', 'elite', 'layoutId', 'swoopHits',
  'burrowStartTick', 'lungeVx', 'lungeVz', 'nextTrampleTick', 'hitIds', 'tech', 'id', 'addIds',
  'cleared', 'dynamics', 'htype', 'movement', 'chargeHits', 'collider', 'staggerUntilTick', 'units',
  'waveIndex', 'lastHit', 'dormant', 'active', 'size', 'skin', 'hpMul', 'node', 'override',
  'provenance', 'targets', 'zone', 'schedule', 'index', 'eliteChance', 'act', 'clearedRooms',
  'plan', 'roomsDone', 'scene', 'wallet', 'level', 'nodes', 'activeUntilTick', 'cooldownUntilTick',
  'cycleStart', 'cycles', 'interactRadius', 'lastCombatLayout', 'nextQuakeTick', 'r', 'roomIndex',
  'roomPlan', 'spentLabel', 'usedBy', 'usedTick', 'uses', 'verb', 'defendBudget', 'drops',
  'intervalTicks', 'next', 'nextSurgeTick', 'rewardFor', 'surges', 'waveIntervalTicks', 'rooms',
  'assignments', 'blastTick', 'campaign', 'doors', 'fadeUntilTick', 'hp', 'kb', 'kegId',
  'pendingRoom', 'sockets', 'spoils', 'glint', 'levels', 'bench', 'biome', 'drafts', 'halfAngleDeg',
  'hazardId', 'lastAddsTick', 'phasesFired', 'reward', 'side', 'spoilsTotal', 'waystoneHp', 'win',
  'stun', 'grant', 'attacker', 'autoReturnTick', 'blocked', 'bossId', 'card', 'challenge', 'frame',
  'healer', 'lastBlockedTick', 'levelKillBase', 'levelKills', 'lungeHit', 'pick', 'roster',
  'socketed', 'softFailed', 'stunImmune', 'summary', 'surgeHits', 'w', 'waystoneId', 'x0', 'x1',
  'z0', 'z1', 'complete', 'harness', 'levelsCleared', 'startLevel', 'actName', 'addDmgMul',
  'addHpMul', 'aim', 'bossDmgMul', 'bossHp', 'campSeats', 'clearedAt', 'combatRooms', 'defendAt',
  'despawnTick', 'from', 'halfArcDeg', 'hardUntilTick', 'interactables', 'kbScale', 'lane',
  'laneIds', 'lastRoom', 'leftovers', 'len', 'levelStartTick', 'minSkipTick', 'modes', 'party',
  'path', 'result', 'retreatDx', 'retreatDz', 'seed', 'shapes', 'sides', 'spawned',
  'stoppedUntilTick', 'to', 'transitions', 'upgrades', 'victory', 'partyIndex', 'downed',
  'hittable', 'knockbackable', 'graceUntilTick', 'moving', 'cd', 'count', 'area', 'faceX', 'faceZ',
  'reviving', 'downedTick', 'reviveTargetId', 'leashOut', 'moveSpeed', 'reviveTarget', 'anchorDist',
  'heal', 'traveled', 'durationSec', 'name', 'passive', 'abbrev', 'remainingTicks', 'archetype',
  'caps', 'base', 'resolved', 'statusTicks', 'dx', 'dz', 'combatActive', 'iframed', 'cause',
  'freeSkillSlots', 'facing', 'rngDraws', 'shop', 'fadeTicksLeft', 'immune', 'party_ai', 'mark',
  'rallyPoint', 'anchor', 'leash', 'defeated', 'repeats', 'channels', 'healOverride', 'zones',
  'azones', 'skillBolts', 'projectiles', 'eshots', 'auraEcho', 'blocksMovement',
  'blocksProjectiles', 'wavesTotal', 'waveSizes', 'pendingSpawns', 'aliveEnemies',
  'defendTicksLeft', 'waystone', 'interactable', 'total', 'n', 'hit', 'reach', 'halfAngle',
  'burrowed', 'flier', 'pct', 'amp', 'adds', 'quake', 'lunging', 'v', 'entities', 'playtimeSec',
  'seat', 'inputSeq', 'predicted', 'predId', 'controller', 'reason', 'ready',
]);

export const STR_DICT = Object.freeze([
  'archer_basic', 'skillbolt', 'ally_kits', 'dewfall', 'ally', 'heal', 'status_apply', 'basic',
  'projectile', 'hit', 'slow', 'bolt', 'party', 'swift_mend', 'mending_bolt', 'volley', 'skill',
  'melee_arc', 'spirit_bolt', 'full_heal', 'skill_bolt_despawn', 'skill_bolt_spawn', 'archer',
  'hostile', 'ally_basic', 'impact', 'active', 'stag', 'piercing_shot', 'ring', 'neutral', 'mantis',
  'toad', 'expired', 'quillback', 'idle', 'swordsman', 'mole', 'ally_cast', 'hitstop',
  'detonating_charge', 'telegraph', 'boar', 'moth', 'azone', 'caltrops', 'bell_toll', 'player',
  'azone_tick', 'projectile_despawn', 'basic_fire', 'projectile_spawn', 'haste', 'dewfall:detonate',
  'eglob', 'tank', 'ground_crack', 'detonate', 'healer_kit', 'ground_aoe', 'skill_cast', 'inspired',
  'status_expire', 'slick', 'zone_tick', 'kill', 'barricade', 'lane', 'telegraph_start',
  'swordsman_basic', 'screenshake', 'keg', 'split', 'telegraph_resolve', 'break', 'kill_all',
  'intent_denied', 'priority_suppressed', 'hazard', 'bulwark', 'puffcap', 'contact', 'cooldown',
  'return', 'engage', 'bounce_hop', 'nova', 'direct', 'ram', 'zone', 'burrowed', 'enemy_spawn',
  'death', 'split_shards', 'orbit', 'shot', 'spawn_telegraph', 'approach', 'emerging', 'shield',
  'azone_spawn', 'azone_expire', 'mending_bolt:split', 'surfaced', 'eshot', 'tank_basic',
  'mending_bolt:bounce', 'hazard_telegraph', 'gravefire', 'hazard_resolve', 'room_clear',
  'lunge_strike', 'technique_pulse', 'split_shard', 'enemy_lob', 'slick_expire',
  'swift_mend:bounce', 'swoop', 'boss_trample', 'flurry', 'quicken', 'enemy_glob_land',
  'slick_spawn', 'dash_end', 'dodge', 'intent', 'node', 'swift_mend:detonate', 'charge', 'complete',
  'skill_1', 'skill_2', 'rockfall', 'room_exit', 'spoils', 'cycle', 'dewfont', 'bramble',
  'brutal_cleave', 'heavy_slam', 'sharpen', 'blade_storm', 'multiply', 'whirling_guard',
  'interactable_spawn', 'bounce', 'cone', 'combat', 'echo_armed', 'echo_recast', 'hold', 'widen',
  'zone_expire', 'zone_spawn', 'bell', 'boss_trample_hit', 'keen', 'snare', 'blocked', 'galvanize',
  'millrace', 'barrow', 'cairn', 'enemy_emerge', 'fade', 'kegfuse', 'shield_absorb', 'timber',
  'enemy_fire', 'eshot_despawn', 'hazard_spawn', 'interactable_despawn', 'echo', 'hazard_despawn',
  'linger', 'resonance', 'defend', 'resonance_proc', 'skill_3', 'sundering_nova', 'Drink', 'Dry',
  'crates', 'damage', 'rubble', 'wave_start', 'enemy_swoop', 'drafted', 'sluice', 'wall',
  'basic_attack', 'broken', 'enemy_charge', 'skill_4', 'standard', 'victory', 'Ring', 'Rung',
  'bell_toll:quicken', 'dewfall:widen', 'enemy_burrow', 'grant', 'heal_override', 'node_granted',
  'swift_mend:split', 'The Ashen Barrow', 'elite_spawn', 'hazard_cancel', 'live', 'node_socketed',
  'waystone', 'boss_quake', 'boss_quake_resolve', 'boss_quake_start', 'clear_stipend', 'glint_gain',
  'room_cleared', 'campaign', 'clear', 'layout_enter', 'layout_placed', 'room_enter', 'room_start',
  'Closed', 'Pull', 'advance', 'bell_toll:bulwark', 'bell_toll:linger', 'bell_toll:multiply',
  'bell_toll:resonance', 'bell_toll:sharpen', 'bell_toll:snare', 'build_autofill', 'camp',
  'dewfall:echo', 'dewfall:galvanize', 'dewfall:keen', 'dewfall:linger', 'dewfall:quicken',
  'enemy_slam', 'enemy_swoop_end', 'keg_blast', 'keg_ignite', 'mending_bolt:bulwark',
  'mending_bolt:galvanize', 'mending_bolt:keen', 'mending_bolt:multiply', 'mending_bolt:snare',
  'millrace_calm', 'path_chosen', 'path_offer', 'reach', 'retreating', 'room_transition',
  'swift_mend:bulwark', 'swift_mend:echo', 'swift_mend:keen', 'swift_mend:multiply',
  'swift_mend:resonance', 'swift_mend:snare', 'transit', 'wood', 'boss', 'boss_adds', 'draft_taken',
  'level_clear', 'reward_offer', 'rubble_crumble', 'rubble_spawn', 'spoils_drop', 'stun', 'rare',
  'legendary', 'MB', 'SM', 'Mending Bolt', 'Swift Mend', 'warding_aura', 'The Hollow Wood', 'shop',
  'guardian_bond', 'kindred_shield', 'sanctuary', 'The Sunken Mill', 'mill', 'THE HOLLOW STAG',
  'defeat', 'WA', 'Warding Aura', 'passive', 'aura', 'KS', 'Kindred Shield', 'GB', 'Guardian Bond',
  'DF', 'Dewfall', 'revive', 'SA', 'Sanctuary', 'aura_pulse',
]);

const KEY_INDEX = new Map(KEY_DICT.map((k, i) => [k, i]));
const STR_INDEX = new Map(STR_DICT.map((s, i) => [s, i]));
const T = Object.freeze({ NULL: 0, FALSE: 1, TRUE: 2, INT: 3, F64: 4, DEC2: 5, Q256: 6, STR: 7, SDICT: 8, ARR: 9, OBJ: 10, NAN: 11, PINF: 12, NINF: 13, NZERO: 14, DYADIC: 15 });

function writeKey(w, k) {
  const i = KEY_INDEX.get(k);
  if (i !== undefined) {
    w.varu(i);
    return;
  }
  const b = utf8(k);
  w.varu(KEY_DICT.length + b.length);
  w.bytes(b);
}
function readKey(r) {
  const code = r.varu();
  if (code < KEY_DICT.length) return KEY_DICT[code];
  return fromUtf8(r.bytes(code - KEY_DICT.length));
}

function kindError(v) {
  const t = typeof v;
  if (t === 'function' || t === 'symbol' || t === 'bigint') return new TypeError(`bvalue: ${t} is not plain data`);
  return new TypeError(`bvalue: non-plain ${(v && v.constructor && v.constructor.name) || 'object'}`);
}

export function encodeValue(w, v) {
  if (v === null || v === undefined) {
    w.u8(T.NULL);
    return;
  }
  switch (typeof v) {
    case 'boolean':
      w.u8(v ? T.TRUE : T.FALSE);
      return;
    case 'number':
      encodeNumber(w, v);
      return;
    case 'string': {
      const i = STR_INDEX.get(v);
      if (i !== undefined) {
        w.u8(T.SDICT);
        w.varu(i);
      } else {
        w.u8(T.STR);
        w.str(v);
      }
      return;
    }
    case 'object':
      break;
    default:
      throw kindError(v);
  }
  if (Array.isArray(v)) {
    w.u8(T.ARR);
    w.varu(v.length);
    for (let i = 0; i < v.length; i++) encodeValue(w, v[i]);
    return;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) throw kindError(v);
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
  w.u8(T.OBJ);
  w.varu(keys.length);
  for (const k of keys) {
    writeKey(w, k);
    encodeValue(w, v[k]);
  }
}

function encodeNumber(w, v) {
  if (Number.isNaN(v)) return void w.u8(T.NAN);
  if (v === Infinity) return void w.u8(T.PINF);
  if (v === -Infinity) return void w.u8(T.NINF);
  if (v === 0 && 1 / v < 0) return void w.u8(T.NZERO);
  // |v| < 2^51: the zigzag form (2|v|) stays a safe integer; larger safe
  // integers (never met in the sim; they threw before protocol v3) ride as f64.
  if (Number.isSafeInteger(v) && Math.abs(v) < 2 ** 51) {
    w.u8(T.INT);
    w.vari(v);
    return;
  }
  const k100 = Math.round(v * 100);
  if (Math.abs(k100) < 2 ** 40 && k100 / 100 === v) {
    w.u8(T.DEC2);
    w.vari(k100);
    return;
  }
  const k256 = Math.round(v * 256);
  if (Math.abs(k256) < 2 ** 40 && k256 / 256 === v) {
    w.u8(T.Q256);
    w.vari(k256);
    return;
  }
  for (let e = 9; e <= 30; e++) {
    const k = v * 2 ** e; // exact: scaling by a power of two never rounds here
    if (Math.abs(k) >= 2 ** 45) break;
    if (Number.isInteger(k)) {
      w.u8(T.DYADIC);
      w.u8(e);
      w.vari(k);
      return;
    }
  }
  w.u8(T.F64);
  w.f64(v);
}

export function decodeValue(r, depth = 0) {
  if (depth > 64) throw new RangeError('bvalue: nesting too deep');
  const tag = r.u8();
  switch (tag) {
    case T.NULL:
      return null;
    case T.FALSE:
      return false;
    case T.TRUE:
      return true;
    case T.INT:
      return r.vari();
    case T.F64:
      return r.f64();
    case T.DEC2:
      return r.vari() / 100;
    case T.Q256:
      return r.vari() / 256;
    case T.STR:
      return r.str();
    case T.SDICT: {
      const i = r.varu();
      if (i >= STR_DICT.length) throw new RangeError('bvalue: string dictionary index out of range');
      return STR_DICT[i];
    }
    case T.ARR: {
      const n = r.varu();
      if (n > r.remaining) throw new RangeError('bvalue: array longer than the frame');
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = decodeValue(r, depth + 1);
      return out;
    }
    case T.OBJ: {
      const n = r.varu();
      if (n > r.remaining) throw new RangeError('bvalue: object larger than the frame');
      const out = {};
      for (let i = 0; i < n; i++) {
        const k = readKey(r);
        const val = decodeValue(r, depth + 1);
        if (k === '__proto__') Object.defineProperty(out, k, { value: val, enumerable: true, writable: true, configurable: true });
        else out[k] = val;
      }
      return out;
    }
    case T.NAN:
      return NaN;
    case T.PINF:
      return Infinity;
    case T.NINF:
      return -Infinity;
    case T.NZERO:
      return -0;
    case T.DYADIC: {
      const e = r.u8();
      if (e < 9 || e > 30) throw new RangeError(`bvalue: dyadic exponent ${e}`);
      return r.vari() / 2 ** e;
    }
    default:
      throw new RangeError(`bvalue: unknown tag ${tag}`);
  }
}

// ------------------------------------------------------------ patches --
const OP = Object.freeze({ s: 0, d: 1, o: 2, a: 3, k: 4, u: 5, w: 6, D: 7, kb: 8, as: 9 });
const SHIFT_MAX = 8; // front drops tried for a queue-like array ('as')
const SHIFT_LEN_MAX = 64;

const hasOwnP = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isPlainObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// The base value under key k of a base object (undefined = no base there).
const baseAt = (b, k) => (isPlainObj(b) && hasOwnP(b, k) ? b[k] : undefined);
const kIdOf = (e, idKey) => (idKey === 'id' ? (isPlainObj(e) ? e.id : undefined) : Array.isArray(e) ? e[0] : undefined);
// LEB128 byte count of a zigzag-encoded integer.
function zigSize(v) {
  let u = v >= 0 ? v * 2 : -v * 2 - 1;
  let n = 1;
  while (u >= 128) {
    u = Math.floor(u / 128);
    n += 1;
  }
  return n;
}

// encodePatch(w, patch, base?, dt?) — base = the tree the patch applies to
// (the decoder passes the same one), dt = tick distance (> 0) for 'u' / 'w'.
export function encodePatch(w, patch, base = undefined, dt = 0) {
  const keys = Object.keys(patch);
  w.varu(keys.length);
  for (const k of keys) {
    writeKey(w, k);
    encodeOp(w, patch[k], baseAt(base, k), dt);
  }
}

function encodeSet(w, v, b, dt) {
  if (typeof v === 'number' && typeof b === 'number') {
    if (dt > 0) {
      if (Object.is(b + dt, v)) return void w.u8(OP.u);
      if (Object.is(b - dt, v)) return void w.u8(OP.w);
    }
    if (Number.isSafeInteger(v) && Number.isSafeInteger(b) && !Object.is(v, -0)) {
      const d = v - b;
      if (Math.abs(d) < 2 ** 51 && zigSize(d) < 1 + zigSize(v)) {
        w.u8(OP.D);
        w.vari(d);
        return;
      }
    }
  }
  w.u8(OP.s);
  encodeValue(w, v);
}

function encodeOp(w, op, b, dt) {
  switch (op[0]) {
    case 's':
      encodeSet(w, op[1], b, dt);
      return;
    case 'd':
      w.u8(OP.d);
      return;
    case 'o':
      w.u8(OP.o);
      encodePatch(w, op[1], isPlainObj(b) ? b : undefined, dt);
      return;
    case 'a': {
      const arr = Array.isArray(b) ? b : null;
      // A queue (front consumed, back appended) re-sends every element by
      // index; against the base shifted by k it is a few ops. Try k = 1..8
      // and keep whichever form is shortest ('as', protocol v3).
      if (arr && arr.length > 0 && arr.length <= SHIFT_LEN_MAX && op[1] <= SHIFT_LEN_MAX) {
        const plain = new w.constructor(64);
        writeArrayOp(plain, OP.a, 0, op[1], op[2], arr, dt);
        let best = plain.finish();
        const next = applyOp(plainClone(arr), op);
        for (let k = 1; k <= Math.min(SHIFT_MAX, arr.length); k++) {
          const shifted = arr.slice(k);
          const list = [];
          for (let i = 0; i < next.length; i++) {
            if (i >= shifted.length) list.push([i, ['s', next[i]]]);
            else {
              const d = diffValue(shifted[i], next[i]);
              if (d) list.push([i, d]);
            }
          }
          const cand = new w.constructor(64);
          writeArrayOp(cand, OP.as, k, next.length, list, shifted, dt);
          const u8 = cand.finish();
          if (u8.length < best.length) best = u8;
        }
        w.bytes(best);
        return;
      }
      writeArrayOp(w, OP.a, 0, op[1], op[2], arr, dt);
      return;
    }
    case 'k': {
      const idKey = op[1];
      const order = op[2];
      const baseIds = Array.isArray(b) ? b.map((e) => kIdOf(e, idKey)) : null;
      let mode = 0;
      let drops = null;
      let adds = null;
      if (baseIds && baseIds.every((id) => id !== undefined)) {
        // order = the base ids with some dropped (in place) + new ids appended?
        drops = [];
        let j = 0;
        for (let i = 0; i < baseIds.length; i++) {
          if (j < order.length && order[j] === baseIds[i]) j += 1;
          else drops.push(i);
        }
        adds = order.slice(j);
        const inBase = new Set(baseIds.map(String));
        if (adds.every((id) => !inBase.has(String(id)))) mode = drops.length === 0 && adds.length === 0 ? 1 : 2;
        if (mode === 2 && drops.length + 2 * adds.length > 2 * order.length) mode = 0; // explicit is shorter
      }
      if (mode === 0) {
        w.u8(OP.k);
        w.u8(idKey === 'id' ? 0 : 1);
        w.varu(order.length);
        for (const id of order) encodeValue(w, id);
      } else {
        w.u8(OP.kb);
        w.u8((idKey === 'id' ? 0 : 1) | (mode << 1));
        if (mode === 2) {
          w.varu(drops.length);
          let prev = -1;
          for (const i of drops) {
            w.varu(i - prev - 1);
            prev = i;
          }
          w.varu(adds.length);
          for (const id of adds) encodeValue(w, id);
        }
      }
      // The ops map is keyed by String(id); recover the typed id from order.
      const byKey = new Map(order.map((id) => [String(id), id]));
      const baseByKey = Array.isArray(b) ? new Map(b.map((e) => [String(kIdOf(e, idKey)), e])) : null;
      const opKeys = Object.keys(op[3]);
      w.varu(opKeys.length);
      for (const key of opKeys) {
        encodeValue(w, byKey.has(key) ? byKey.get(key) : key);
        encodeOp(w, op[3][key], baseByKey ? baseByKey.get(key) : undefined, dt);
      }
      return;
    }
    default:
      throw new TypeError(`bvalue: unknown op ${op[0]}`);
  }
}

// 'a' (tag 3) or the shifted 'as' (tag 9): the list is relative to base.slice(k).
function writeArrayOp(w, tag, k, newLen, list, arr, dt) {
  w.u8(tag);
  if (tag === OP.as) w.varu(k);
  w.varu(newLen);
  w.varu(list.length);
  for (const [i, sub] of list) {
    w.varu(i);
    encodeOp(w, sub, arr && i < arr.length ? arr[i] : undefined, dt);
  }
}

// decodePatch(r, depth?, base?, dt?) — base / dt exactly as the encoder had them.
export function decodePatch(r, depth = 0, base = undefined, dt = 0) {
  if (depth > 64) throw new RangeError('bvalue: patch nesting too deep');
  const n = r.varu();
  if (n > r.remaining) throw new RangeError('bvalue: patch larger than the frame');
  const out = {};
  for (let i = 0; i < n; i++) {
    const k = readKey(r);
    if (k === '__proto__') throw new RangeError('bvalue: __proto__ key in a patch');
    out[k] = decodeOp(r, depth + 1, baseAt(base, k), dt);
  }
  return out;
}

function numericBase(b, what) {
  if (typeof b !== 'number') throw new RangeError(`bvalue: ${what} op without a numeric baseline`);
  return b;
}

function decodeOp(r, depth, b, dt) {
  const tag = r.u8();
  switch (tag) {
    case OP.s:
      return ['s', decodeValue(r, depth)];
    case OP.u:
      return ['s', numericBase(b, 'u') + dt];
    case OP.w:
      return ['s', numericBase(b, 'w') - dt];
    case OP.D: {
      const d = r.vari();
      return ['s', numericBase(b, 'D') + d];
    }
    case OP.d:
      return ['d'];
    case OP.o:
      return ['o', decodePatch(r, depth, isPlainObj(b) ? b : undefined, dt)];
    case OP.as: {
      // base.slice(k) patched by the list = the new array; handed back as
      // the plain JSON op diff(base, new) (the same op the host diffed).
      if (!Array.isArray(b)) throw new RangeError('bvalue: as op against a missing base array');
      const k = r.varu();
      if (k < 1 || k > b.length) throw new RangeError('bvalue: as shift out of range');
      const shifted = b.slice(k);
      const newLen = r.varu();
      const n = r.varu();
      if (n > r.remaining || newLen > SHIFT_LEN_MAX) throw new RangeError('bvalue: as op larger than the frame');
      const list = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = r.varu();
        list[i] = [idx, decodeOp(r, depth + 1, idx < shifted.length ? shifted[idx] : undefined, dt)];
      }
      const next = applyOp(plainClone(shifted), ['a', newLen, list]);
      return diffValue(b, next) || ['a', b.length, []];
    }
    case OP.a: {
      const newLen = r.varu();
      const n = r.varu();
      if (n > r.remaining) throw new RangeError('bvalue: a op larger than the frame');
      const list = new Array(n);
      const arr = Array.isArray(b) ? b : null;
      for (let i = 0; i < n; i++) {
        const idx = r.varu();
        list[i] = [idx, decodeOp(r, depth + 1, arr && idx < arr.length ? arr[idx] : undefined, dt)];
      }
      return ['a', newLen, list];
    }
    case OP.k:
    case OP.kb: {
      const kind = r.u8();
      const idKey = (kind & 1) === 0 ? 'id' : 0;
      let order;
      if (tag === OP.k) {
        const n = r.varu();
        if (n > r.remaining) throw new RangeError('bvalue: k order larger than the frame');
        order = new Array(n);
        for (let i = 0; i < n; i++) order[i] = decodeValue(r, depth);
      } else {
        const mode = kind >> 1;
        if (!Array.isArray(b) || (mode !== 1 && mode !== 2)) throw new RangeError('bvalue: k op against a missing base array');
        const baseIds = b.map((e) => kIdOf(e, idKey));
        if (baseIds.some((id) => id === undefined)) throw new RangeError('bvalue: k base element without an id');
        if (mode === 1) order = baseIds;
        else {
          const nDrop = r.varu();
          if (nDrop > baseIds.length) throw new RangeError('bvalue: k drops more than the base holds');
          const drop = new Set();
          let prev = -1;
          for (let i = 0; i < nDrop; i++) {
            prev += r.varu() + 1;
            if (prev >= baseIds.length) throw new RangeError('bvalue: k drop index out of range');
            drop.add(prev);
          }
          order = baseIds.filter((_, i) => !drop.has(i));
          const nAdd = r.varu();
          if (nAdd > r.remaining) throw new RangeError('bvalue: k adds larger than the frame');
          for (let i = 0; i < nAdd; i++) order.push(decodeValue(r, depth));
        }
      }
      const baseByKey = Array.isArray(b) ? new Map(b.map((e) => [String(kIdOf(e, idKey)), e])) : null;
      const m = r.varu();
      if (m > r.remaining) throw new RangeError('bvalue: k ops larger than the frame');
      const ops = {};
      for (let i = 0; i < m; i++) {
        const key = String(decodeValue(r, depth));
        if (key === '__proto__') throw new RangeError('bvalue: __proto__ id');
        ops[key] = decodeOp(r, depth + 1, baseByKey ? baseByKey.get(key) : undefined, dt);
      }
      return ['k', idKey, order, ops];
    }
    default:
      throw new RangeError(`bvalue: unknown op tag ${tag}`);
  }
}

// Object keys through KEY_DICT (codec.js event shapes write keys without the
// value tag an object member would carry).
export { writeKey as encodeKey, readKey as decodeKey };
