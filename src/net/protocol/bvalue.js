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
// Keys: varu code < KEY_DICT.length -> dictionary key; otherwise an inline
// utf8 key of (code - KEY_DICT.length) bytes follows.
// Patch: varu nKeys, nKeys × (key, op). Op tags (u8):
//   0 's' value · 1 'd' · 2 'o' patch · 3 'a' varu newLen · varu n · n × (varu i, op)
//   4 'k' u8 idKind (0 = 'id', 1 = pair index 0) · varu n · n × id value ·
//         varu m · m × (id value, op)
// The dictionaries are part of the protocol (both sides run the same build —
// the server refuses mismatched builds); unknown keys / strings still work,
// they are just written inline. Order = measured frequency in the sim (the
// first 128 entries cost one byte).
// Self-contained (no import from codec.js, which imports THIS module): the
// writer / reader are codec.js ByteWriter / ByteReader instances passed in.
const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });
const utf8 = (s) => te.encode(s);
const fromUtf8 = (b) => td.decode(b);

export const KEY_DICT = Object.freeze([
  'id', 'x', 'z', 'kind', 'hp', 'maxHp', 'radius', 'partyIndex', 'downed', 'classId', 'faction',
  'state', 'tick', 'hittable', 'knockbackable', 'target', 'type', 'power', 'targetId', 'range',
  'graceUntilTick', 'cds', 'moving', 'skill', 'cd', 'count', 'area', 'nextBasicTick', 'faceX',
  'faceZ', 'shape', 'totalTicks', 'reviving', 'downedTick', 'resonance', 'mode', 'skills',
  'lastHitTick', 'reviveTargetId', 'kbTicks', 'aiState', 'leashOut', 'moveSpeed', 'castLeftTicks',
  'reviveTarget', 'anchorDist', 'heal', 'traveled', 'durationSec', 'name', 'room', 'phase',
  'passive', 'abbrev', 'remainingTicks', 'archetype', 'caps', 'sockets', 'base', 'resolved',
  'critBonus', 'statusTicks', 'yaw', 'bench', 'wallet', 'dx', 'dz', 'iframeUntilTick', 'aim',
  'dashTicksLeft', 'dodgeReadyTick', 'combatActive', 'telegraph', 'itype', 'act', 'lifecycle',
  'seed', 'wave', 'status', 'kbVx', 'kbVz', 'elite', 'phaseUntilTick', 'nextAttackTick',
  'cdByTarget', 'dmgMul', 'scale', 'iframed', 'sourceId', 'cause', 'ticksDone', 'dirX', 'dirZ',
  'resolveTick', 'htype', 'hits', 'delivery', 'active', 'challenge', 'actName', 'rooms', 'party',
  'source', 'amount', 'crit', 'reward', 'untilTick', 'vx', 'vz', 'freeSkillSlots', 'facing',
  'lastAimDir', 'dashVel', 'rngDraws', 'run', 'layout', 'clearedRooms', 'roomsDone', 'frame',
  'rewardFor', 'path', 'shop', 'boss', 'summary', 'fadeTicksLeft', 'stats', 'crits', 'immune',
  'heals', 'healCrits', 'kills', 'party_ai', 'mark', 'rallyPoint', 'anchor', 'leash', 'defeated',
  'repeats', 'channels', 'allies', 'build', 'healOverride', 'zones', 'azones', 'skillBolts',
  'projectiles', 'enemies', 'eshots', 'assignments', 'auraEcho', 'cleared', 'attacker', 'kb',
  'index', 'collider', 'blocksMovement', 'blocksProjectiles', 'softFailed', 'waveIndex',
  'wavesTotal', 'waveSizes', 'pendingSpawns', 'aliveEnemies', 'defendTicksLeft', 'waystone',
  'nextTickTick', 'boltOwner', 'mag', 'src', 'hx', 'hz', 'skin', 'blastRadius',
  'telegraphStartTick', 'layoutId', 'startTick', 'biome', 'bursts', 'interactable',
  'interactRadius', 'verb', 'spentLabel', 'uses', 'cooldownUntilTick', 'activeUntilTick',
  'usedTick', 'usedBy', 'modes', 'defendAt', 'sides', 'ticks', 'playerTargeted', 'slow', 'slot',
  'etype', 'targets', 'total', 'n', 'hit', 'reach', 'halfAngle', 'throwTick', 'surfaceUntilTick',
  'burrowStartTick', 'burrowed', 'result', 'glint', 'nodes', 'victory', 'combatRooms', 'lastRoom',
  'socketed', 'flier', 'swoopTicksLeft', 'swoopVx', 'swoopVz', 'swoopHits', 'pct', 'blocked',
  'amp', 'adds', 'ownerId', 'phasesFired', 'quake', 'lunging', 'node', 'chargeTicksLeft',
  'chargeVx', 'chargeVz', 'chargeHits', 'staggerUntilTick', 'kbScale', 'guard', 'halfArcDeg', 'v',
  'clock', 'rng', 'registry', 'entities', 'nextOrdinal', 'world', 'systems', 'scene', 'app',
  'draws', 'grants', 'hitstopRemaining', 'playtimeSec', 'atTick', 'seat', 'inputSeq', 'predicted',
  'predId', 'controller', 'reason', 'ready',
]);

export const STR_DICT = Object.freeze([
  'engage', 'ally', 'party', 'mending_bolt', 'swift_mend', 'archer', 'swordsman', 'active', 'tank',
  'neutral', 'kill_all', 'heal', 'rare', 'legendary', 'projectile', 'player', 'defend',
  'archer_basic', 'skill', 'break', 'hostile', 'barricade', 'direct', 'hazard', 'idle', 'standard',
  'MB', 'SM', 'Mending Bolt', 'Swift Mend', 'keg', 'hit', 'volley', 'boss', 'caltrops', 'boar',
  'skillbolt', 'ally_kits', 'melee_arc', 'azone', 'mantis', 'detonating_charge',
  'skill_bolt_spawn', 'skill_bolt_despawn', 'slow', 'puffcap', 'status_apply', 'dewfont',
  'warding_aura', 'ground_crack', 'The Hollow Wood', 'toad', 'ally_basic', 'mole', 'stag', 'moth',
  'shop', 'combat', 'basic', 'piercing_shot', 'quillback', 'guardian_bond', 'kindred_shield',
  'impact', 'sanctuary', 'ram', 'waystone', 'dewfall', 'ally_cast', 'expired', 'ground_aoe',
  'azone_tick', 'timber', 'The Sunken Mill', 'The Ashen Barrow', 'victory', 'hitstop', 'Drink',
  'Dry', 'bramble', 'sluice', 'bell', 'kill', 'cairn', 'hold', 'bolt', 'ring', 'mill', 'orbit',
  'barrow', 'rockfall', 'crates', 'gravefire', 'telegraph', 'wood', 'screenshake',
  'THE HOLLOW STAG', 'millrace', 'split', 'projectile_spawn', 'basic_fire', 'projectile_despawn',
  'advance', 'rubble', 'burrowed', 'telegraph_start', 'cooldown', 'defeat', 'enemy_spawn', 'WA',
  'Warding Aura', 'passive', 'aura', 'Pull', 'Closed', 'Ring', 'Rung', 'approach', 'slick',
  'death', 'telegraph_resolve', 'spawn_telegraph', 'contact', 'KS', 'Kindred Shield', 'node',
  'swordsman_basic', 'GB', 'Guardian Bond', 'azone_spawn', 'azone_expire', 'DF', 'Dewfall', 'nova',
  'skill_cast', 'lane', 'hazard_telegraph', 'revive', 'SA', 'Sanctuary', 'hazard_resolve', 'live',
  'drafted', 'tank_basic', 'room_exit', 'eglob', 'return', 'aura_pulse', 'lunge_strike',
  'interactable_spawn', 'shot', 'blocked', 'surfaced', 'boss_trample', 'heavy_slam', 'cycle',
  'flurry', 'interactable_despawn', 'intent', 'dodge',
]);

const KEY_INDEX = new Map(KEY_DICT.map((k, i) => [k, i]));
const STR_INDEX = new Map(STR_DICT.map((s, i) => [s, i]));
const T = Object.freeze({ NULL: 0, FALSE: 1, TRUE: 2, INT: 3, F64: 4, DEC2: 5, Q256: 6, STR: 7, SDICT: 8, ARR: 9, OBJ: 10, NAN: 11, PINF: 12, NINF: 13, NZERO: 14 });

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
  if (Number.isSafeInteger(v)) {
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
    default:
      throw new RangeError(`bvalue: unknown tag ${tag}`);
  }
}

// ------------------------------------------------------------ patches --
const OP = Object.freeze({ s: 0, d: 1, o: 2, a: 3, k: 4 });

export function encodePatch(w, patch) {
  const keys = Object.keys(patch);
  w.varu(keys.length);
  for (const k of keys) {
    writeKey(w, k);
    encodeOp(w, patch[k]);
  }
}

function encodeOp(w, op) {
  switch (op[0]) {
    case 's':
      w.u8(OP.s);
      encodeValue(w, op[1]);
      return;
    case 'd':
      w.u8(OP.d);
      return;
    case 'o':
      w.u8(OP.o);
      encodePatch(w, op[1]);
      return;
    case 'a': {
      w.u8(OP.a);
      w.varu(op[1]);
      const list = op[2];
      w.varu(list.length);
      for (const [i, sub] of list) {
        w.varu(i);
        encodeOp(w, sub);
      }
      return;
    }
    case 'k': {
      w.u8(OP.k);
      w.u8(op[1] === 'id' ? 0 : 1);
      const order = op[2];
      w.varu(order.length);
      for (const id of order) encodeValue(w, id);
      // The ops map is keyed by String(id); recover the typed id from order.
      const byKey = new Map(order.map((id) => [String(id), id]));
      const opKeys = Object.keys(op[3]);
      w.varu(opKeys.length);
      for (const key of opKeys) {
        encodeValue(w, byKey.has(key) ? byKey.get(key) : key);
        encodeOp(w, op[3][key]);
      }
      return;
    }
    default:
      throw new TypeError(`bvalue: unknown op ${op[0]}`);
  }
}

export function decodePatch(r, depth = 0) {
  if (depth > 64) throw new RangeError('bvalue: patch nesting too deep');
  const n = r.varu();
  if (n > r.remaining) throw new RangeError('bvalue: patch larger than the frame');
  const out = {};
  for (let i = 0; i < n; i++) {
    const k = readKey(r);
    if (k === '__proto__') throw new RangeError('bvalue: __proto__ key in a patch');
    out[k] = decodeOp(r, depth + 1);
  }
  return out;
}

function decodeOp(r, depth) {
  const tag = r.u8();
  switch (tag) {
    case OP.s:
      return ['s', decodeValue(r, depth)];
    case OP.d:
      return ['d'];
    case OP.o:
      return ['o', decodePatch(r, depth)];
    case OP.a: {
      const newLen = r.varu();
      const n = r.varu();
      if (n > r.remaining) throw new RangeError('bvalue: a op larger than the frame');
      const list = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = r.varu();
        list[i] = [idx, decodeOp(r, depth + 1)];
      }
      return ['a', newLen, list];
    }
    case OP.k: {
      const idKey = r.u8() === 0 ? 'id' : 0;
      const n = r.varu();
      if (n > r.remaining) throw new RangeError('bvalue: k order larger than the frame');
      const order = new Array(n);
      for (let i = 0; i < n; i++) order[i] = decodeValue(r, depth);
      const m = r.varu();
      if (m > r.remaining) throw new RangeError('bvalue: k ops larger than the frame');
      const ops = {};
      for (let i = 0; i < m; i++) {
        const key = String(decodeValue(r, depth));
        if (key === '__proto__') throw new RangeError('bvalue: __proto__ id');
        ops[key] = decodeOp(r, depth + 1);
      }
      return ['k', idKey, order, ops];
    }
    default:
      throw new RangeError(`bvalue: unknown op tag ${tag}`);
  }
}
