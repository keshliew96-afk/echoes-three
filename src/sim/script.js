// Scripted input generator (docs/gauntlet/PLAN.md §3.4 / §6): a PURE function
// (scriptSeed, tick) -> intent snapshot, used by every determinism probe —
// the save round-trip gate ("the next 600 ticks after load are bit-identical
// to an unsaved continuation with the same inputs"), the single-player golden
// trace the network build must not change, and headless Node sim runs.
//
// It never touches the gameplay RNG stream (that would change what it is
// measuring) and never reads the world: the same (seed, tick) always yields
// the same snapshot, so "the same inputs" is a property of two numbers.
//
// Shape: the closed §4 vocabulary from core/intents.js — move held in 20-59
// tick segments over the 9 directions (incl. standing still), aim swept on a
// slow circle, basic attack held on alternating segments, and discrete presses
// on co-prime cadences (dodge, skills 1..slots, the odd target cycle / rally).
import { emptySnapshot } from '../core/intents.js';

// splitmix32 finaliser: a well-mixed 32-bit hash of an integer.
function mix32(x) {
  x = (x + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
const h2 = (a, b) => mix32(mix32(a >>> 0) ^ (b >>> 0));

const DIRS = [
  [0, 0],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

// Segment containing `tick`: segments are 20..59 ticks long, laid end to end
// from tick 0, lengths drawn from the seed — O(tick/20) walk, cached per seed.
const segCache = new Map();
function segmentOf(seed, tick) {
  let c = segCache.get(seed);
  if (!c) {
    c = { starts: [0], ends: [] };
    segCache.set(seed, c);
    if (segCache.size > 16) segCache.delete(segCache.keys().next().value);
  }
  while (c.ends.length === 0 || c.ends[c.ends.length - 1] <= tick) {
    const i = c.ends.length;
    const len = 20 + (h2(seed, 0x51ed0000 + i) % 40);
    const start = c.starts[i];
    c.ends.push(start + len);
    c.starts.push(start + len);
  }
  // binary search for the segment index
  let lo = 0;
  let hi = c.ends.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (c.ends[mid] <= tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// scriptedInput(scriptSeed, tick, { skillSlots = 4, aimRadius = 3.2, cx = 0, cz = 0 })
// -> a fresh intent snapshot (same shape as core/input.js sample()).
export function scriptedInput(scriptSeed, tick, { skillSlots = 4, aimRadius = 3.2, cx = 0, cz = 0 } = {}) {
  const seed = scriptSeed >>> 0;
  const snap = emptySnapshot();
  const seg = segmentOf(seed, tick);
  const [dx, dz] = DIRS[h2(seed, seg) % DIRS.length];
  const len = Math.hypot(dx, dz);
  if (len > 0) snap.move = { x: dx / len, z: dz / len };
  const ang = (tick / 90) * Math.PI * 2 * 0.25 + (h2(seed, 7) % 628) / 100;
  snap.aim = { x: cx + Math.cos(ang) * aimRadius, z: cz + Math.sin(ang) * aimRadius };
  snap.basicAttackHeld = (h2(seed ^ 0xa5a5, seg) & 3) !== 0;
  snap.reviveHeld = (h2(seed ^ 0x3c3c, seg) % 11) === 0;
  const presses = [];
  if (tick % 97 === (h2(seed, 1) % 97)) presses.push({ kind: 'dodge' });
  for (let s = 0; s < skillSlots; s++) {
    const period = 61 + s * 13;
    if (tick % period === (h2(seed, 100 + s) % period)) presses.push({ kind: `skill_${s + 1}`, slot: s });
  }
  if (tick % 293 === (h2(seed, 2) % 293)) presses.push({ kind: 'target_cycle' });
  if (tick % 419 === (h2(seed, 3) % 419)) presses.push({ kind: 'rally' });
  snap.presses = presses;
  return snap;
}
