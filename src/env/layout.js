// Per-variant LAYOUT stream.
//
// §1 names two RNG streams: a seeded GAMEPLAY stream and an unseeded COSMETIC
// stream for "VFX jitter, foliage placement, particle spread". Room DRESSING
// was being drawn from the cosmetic one, and the fix-round-2 critique measured
// what that costs: the same variant's frame metrics swung load to load (cool
// share 6.8%-30.7%, reserved-band count 59-760 px) purely because the floor's
// shade stamps, the grass and the prop jitter landed somewhere else each time.
// A quality gate you can only pass on a lucky draw is not a passed gate.
//
// So the parts of the dressing that decide the ROOM — where the canopy shade
// pockets fall, where the grass grows, how the prop clusters scatter — come
// from this stream instead: a mulberry32 seeded from the variant id, i.e. a
// constant of the layout. Variant 2 looks the same on every load, and its
// measured numbers are reproducible for anyone re-checking them.
//
// This is NOT the gameplay stream (it never touches sim state and is never
// seeded from the run seed) and it is NOT the cosmetic stream (which keeps
// everything that must be alive frame to frame: flame flicker, ember drift,
// firefly motes, particle spread, idle-pose sway). Same `range/chance/int/pick`
// interface as core/rng.js so call sites read identically.
export function createLayoutRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    stream: 'layout',
    seed: seed >>> 0,
    float: next,
    range: (a, b) => a + next() * (b - a),
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // Advance n draws in O(1) (mulberry32's state is a Weyl sequence): the
    // dressing paint worker reports how many draws a room's floor consumed.
    skip: (n) => {
      s = (s + Math.imul(n | 0, 0x6d2b79f5)) | 0;
    },
  };
}

// Stable per-variant seeds. Distinct large odd offsets so two variants never
// share a stamp layout.
export function variantLayoutRng(variantId, salt = 0) {
  return createLayoutRng(0x9e3779b9 ^ (((variantId | 0) + 1) * 0x85ebca6b) ^ (salt * 0xc2b2ae35));
}
