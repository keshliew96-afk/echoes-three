// Canonical JSON (docs/gauntlet/PLAN.md §3.4) — the ONE serialisation every
// state hash, save file and network desync check is computed over.
//
//   - object keys are emitted in sorted (code-unit) order at every depth, so
//     two trees with the same content always produce the same bytes;
//   - `undefined` members are dropped (exactly like JSON.stringify);
//   - numbers JSON cannot carry are TAGGED instead of silently corrupted:
//       -0 -> {"$n":"-0"}   NaN -> {"$n":"NaN"}
//       Infinity -> {"$n":"Inf"}   -Infinity -> {"$n":"-Inf"}
//     (JSON.stringify writes -0 as 0 and NaN/Infinity as null — either would
//     break the "600 ticks after load are bit-identical" gate: Math.atan2 and
//     1/x both see the sign of zero, and boss.js keeps `-Infinity` in state);
//   - functions, symbols and class instances other than plain Object/Array are
//     a CONTRACT VIOLATION (sim state must be plain data) and throw, so a
//     closure smuggled into sim state fails loudly in the save probe instead of
//     vanishing from a save.
//
// Pure module: no DOM, no three — importable by the browser, Node tools and
// the network server alike.

function encodeNumber(n) {
  if (Number.isNaN(n)) return '{"$n":"NaN"}';
  if (n === Infinity) return '{"$n":"Inf"}';
  if (n === -Infinity) return '{"$n":"-Inf"}';
  if (n === 0 && 1 / n < 0) return '{"$n":"-0"}';
  return JSON.stringify(n);
}

function enc(v, path) {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'number':
      return encodeNumber(v);
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return v ? 'true' : 'false';
    case 'undefined':
      return undefined;
    case 'bigint':
      throw new TypeError(`canonical: bigint at ${path}`);
    case 'function':
    case 'symbol':
      throw new TypeError(`canonical: ${typeof v} at ${path} (sim state must be plain data)`);
    default:
      break;
  }
  if (Array.isArray(v)) {
    const parts = new Array(v.length);
    for (let i = 0; i < v.length; i++) {
      const e = enc(v[i], `${path}[${i}]`);
      parts[i] = e === undefined ? 'null' : e; // JSON array semantics
    }
    return `[${parts.join(',')}]`;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) {
    const name = (v.constructor && v.constructor.name) || 'unknown';
    throw new TypeError(`canonical: non-plain ${name} at ${path} (use arrays/objects only)`);
  }
  const keys = Object.keys(v).sort();
  const parts = [];
  for (const k of keys) {
    const e = enc(v[k], `${path}.${k}`);
    if (e !== undefined) parts.push(`${JSON.stringify(k)}:${e}`);
  }
  return `{${parts.join(',')}}`;
}

// canonicalJSON(value) -> string. Throws TypeError on non-plain data.
export function canonicalJSON(value) {
  const out = enc(value, '$');
  return out === undefined ? 'null' : out;
}

// Inverse of the number tags. Use for every save/network payload that was
// written with canonicalJSON (plain JSON.parse would leave {"$n":...} objects).
export function parseCanonical(text) {
  return JSON.parse(text, (_k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length === 1 && keys[0] === '$n') {
        switch (v.$n) {
          case '-0':
            return -0;
          case 'NaN':
            return NaN;
          case 'Inf':
            return Infinity;
          case '-Inf':
            return -Infinity;
          default:
            return v;
        }
      }
    }
    return v;
  });
}

// Deep plain-data clone through the canonical codec (exact for every number,
// including -0 / NaN / +-Infinity).
export function cloneCanonical(value) {
  return parseCanonical(canonicalJSON(value));
}
