// §1 RNG — two streams, never crossed:
//   (a) gameplay stream: one seeded PRNG (mulberry32) created at run start,
//       consumed ONLY by gameplay-affecting rolls (crits, wave rolls, draft
//       draws, room frame). Tracks a draw index for the debug overlay and
//       determinism audits.
//   (b) cosmetic stream: unseeded Math.random for VFX jitter, foliage
//       placement, particle spread. Same interface so call sites read alike,
//       but it can never influence sim state.

// Both streams share this interface; `chance` implements the brief's strict
// `roll < chance` rule (§7).
function makeApi(next) {
  return {
    float: next, // [0, 1)
    range: (a, b) => a + next() * (b - a),
    int: (n) => Math.floor(next() * n), // 0..n-1
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

export function createGameplayRng(seed) {
  let s = seed >>> 0;
  let draws = 0;
  // mulberry32
  const next = () => {
    draws += 1;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    stream: 'gameplay',
    seed: seed >>> 0,
    get drawIndex() {
      return draws;
    },
    ...makeApi(next),
  };
}

export function createCosmeticRng() {
  return {
    stream: 'cosmetic',
    seed: null,
    get drawIndex() {
      return -1; // unseeded, untracked — asking is a smell
    },
    ...makeApi(Math.random),
  };
}
