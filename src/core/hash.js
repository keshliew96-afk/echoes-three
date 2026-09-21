// State hash (docs/gauntlet/PLAN.md §3.4): 64-bit FNV-1a over the UTF-8 bytes
// of canonical JSON, computed as two independent 32-bit FNV-1a lanes (the
// standard offset basis and a second basis) so no BigInt is needed and a
// 100 KB state hashes in well under a millisecond. Output: 16 lowercase hex
// chars. Used by the save system (file integrity + round-trip gate), the
// network layer (desync detection) and __echoes.sim.trace (golden traces).
//
// Pure module: browser, Node tools and the server share it.
import { canonicalJSON } from './canonical.js';

const OFFSET_A = 0x811c9dc5;
const OFFSET_B = 0x050c5d1f; // second lane basis (arbitrary odd constant)
const PRIME = 0x01000193;

// fnv1a64Hex(string) -> 16-hex-char digest of the string's UTF-8 bytes.
export function fnv1a64Hex(str) {
  let a = OFFSET_A;
  let b = OFFSET_B;
  const step = (byte) => {
    a = Math.imul(a ^ byte, PRIME) >>> 0;
    b = Math.imul(b ^ byte ^ 0x5b, PRIME) >>> 0;
  };
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      step(c);
    } else if (c < 0x800) {
      step(0xc0 | (c >> 6));
      step(0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        const cp = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i += 1;
        step(0xf0 | (cp >> 18));
        step(0x80 | ((cp >> 12) & 0x3f));
        step(0x80 | ((cp >> 6) & 0x3f));
        step(0x80 | (cp & 0x3f));
        continue;
      }
      step(0xe0 | (c >> 12));
      step(0x80 | ((c >> 6) & 0x3f));
      step(0x80 | (c & 0x3f));
    } else {
      step(0xe0 | (c >> 12));
      step(0x80 | ((c >> 6) & 0x3f));
      step(0x80 | (c & 0x3f));
    }
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

// hashState(tree) -> 16-hex digest of canonicalJSON(tree).
export function hashState(tree) {
  return fnv1a64Hex(canonicalJSON(tree));
}
