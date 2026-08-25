// Act-1 arena layout pool (§13: hand-built layouts, 3 variants; prop
// arrangement + palette story differ so variants read apart at a glance).
// Playfield is the graybox sim rect: x in [-12, 12], z in [-8, 8] (z- = north,
// the top of the screen). Props hug the walls (§19.3: props ring the arena
// edges, >=60% of the floor stays open; sim collision is the wall rect only).
//
// ground: HSL authored in DISPLAY space for the canvas painter, inside the
//   §19.3 green band (hue 70-110). `l` is the LIT value; the painter derives a
//   cool blue-green shade end from `shadeH`/`shadeL` so unlit floor comes out
//   blue-dominant and the amber pools have something to be warm against.
//   `coolLift` (default 30) is the blue channel of the additive indigo lift
//   applied to the whole floor — the knob that keeps unlit ground blue-dominant.
//   dirtH/dirtL tune the beaten track; mossN/leafN/crackN the scatter decals.
// paths: polylines in world units + width (dirt, painted into the ground).
// clusters: [x, z, spread, 'recipe'] — props are placed in CLUSTERS of 2-4 with
//   0.6-1.4x scale jitter and deliberate gaps, never an even single-file ring
//   (the reference sheets cluster props and let them break the silhouette).
//   Recipe tokens name prop builders: slab stump fence crate barrel log bush
//   boulder cairn.
// torches/lanterns: [x, z, yaw?] placements. lightIdx: which torches carry a
//   real PointLight (2 per variant).
// sunPools: [x, z, r] warm canopy-dapple light pools (§19.3 warm:cool 70:30 —
//   mid-field so >=2 warm pools sit in ANY gameplay frame, not just at walls).
// monolith: [x, z, yaw] — the act's single violet corruption tell, kept inside
//   the spawn camera rect so the act tell is present in the opening frame.
//
// Variant identity (must survive a side-by-side glance):
//   1 spring clearing  — warm mid green, ONE diagonal cart track, TIMBER
//                        dressing (fences/stumps/crates/logs), monolith NE.
//   2 dry crossroads   — pale yellow-green, TWO crossing tracks, STONE
//                        dressing (slabs/boulders/cairns), monolith NW.
//   3 mossy hollow     — deep cool green, ONE curved track, UNDERGROWTH
//                        (bushes/logs/stumps/barrels), monolith N-mid.
export const VARIANTS = {
  // ---- 1 · "Beaten Clearing"
  1: {
    id: 1,
    name: 'clearing',
    // Mid-morning clearing: balanced key, generous canopy dapple.
    mood: { key: 1.0, fill: 1.0, dapple: 0.78, warmth: 0.0 },
    ground: {
      h: 90, s: 0.5, l: 0.39, shadeH: 172, shadeS: 0.16, shadeL: 0.135,
      dirtH: 38, dirtL: 0.255, mossN: 16, leafN: 200, crackN: 6, pebbleN: 90,
    },
    paths: [{ pts: [[-12.6, -5.2], [-7, -3.8], [-1, -0.6], [4.5, 2.6], [12.6, 4.6]], w: 1.5 }],
    grass: 640,
    flowers: 70,
    torches: [[-5.6, -7.2], [5.2, 7.2], [11.2, -3.0], [-11.2, 3.2]],
    lightIdx: [0, 2],
    lanterns: [[3.0, -7.3, -1.5708], [-3.4, 7.3, 1.5708]],
    clusters: [
      // north tree line (timber yard feel)
      [-9.4, -7.2, 0.85, 'fence fence stump'],
      [-1.9, -7.3, 0.75, 'crate crate barrel slab'],
      [2.4, -7.4, 0.6, 'log bush'],
      [8.9, -7.3, 0.8, 'stump stump bush'],
      // south
      [-6.0, 7.3, 0.8, 'log stump bush'],
      [-0.4, 7.4, 0.7, 'slab boulder bush'],
      [6.4, 7.3, 0.9, 'fence fence crate'],
      [10.6, 7.2, 0.7, 'barrel barrel crate'],
      // west
      [-11.2, -6.4, 0.7, 'boulder boulder bush'],
      [-11.3, -1.4, 0.8, 'barrel barrel crate'],
      [-11.2, 5.6, 0.75, 'stump log bush'],
      // east
      [11.2, -6.2, 0.7, 'slab boulder'],
      [11.3, 1.9, 0.85, 'crate crate crate barrel'],
      [11.2, 6.2, 0.7, 'stump slab bush'],
    ],
    sunPools: [
      [-4.5, 1.8, 1.25], [3.2, -2.4, 1.05], [0.5, 4.6, 0.9], [7.6, 0.4, 0.85],
      [-8.6, -2.6, 1.0], [9.4, 4.2, 0.8], [-2.0, -4.4, 0.9], [5.6, 5.2, 0.95],
    ],
    monolith: [8.2, -6.6, 0.45],
  },

  // ---- 2 · "Old Crossroads"
  2: {
    id: 2,
    name: 'crossroads',
    // Dry crossroads at high sun: hardest key, least fill, small tight dapples.
    mood: { key: 1.18, fill: 0.78, dapple: 0.85, warmth: 0.12 },
    ground: {
      h: 86, s: 0.46, l: 0.42, shadeH: 178, shadeS: 0.18, shadeL: 0.125,
      dirtH: 40, dirtL: 0.30, mossN: 8, leafN: 150, crackN: 12, pebbleN: 160,
    },
    paths: [
      { pts: [[-12.6, 0.6], [-4, 0.1], [3, -0.3], [12.6, -0.7]], w: 2.1 },
      { pts: [[0.5, -8.6], [0.1, -2], [-0.4, 3], [-0.2, 8.6]], w: 1.55 },
    ],
    grass: 520,
    flowers: 82,
    torches: [[-11.2, -1.9], [11.2, 1.2], [-1.9, -7.2], [2.2, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[-6.4, -7.3, -1.5708], [6.8, 7.3, 1.5708]],
    clusters: [
      // north — dry-stone country
      [-9.6, -7.3, 0.9, 'slab slab boulder'],
      [-4.2, -7.4, 0.7, 'cairn boulder'],
      [4.6, -7.3, 0.85, 'slab slab cairn boulder'],
      [9.2, -7.2, 0.7, 'stump slab'],
      // south
      [-7.6, 7.3, 0.8, 'boulder boulder slab'],
      [-2.4, 7.4, 0.7, 'cairn bush'],
      [4.4, 7.3, 0.9, 'slab boulder boulder'],
      [9.8, 7.2, 0.75, 'crate barrel slab'],
      // west
      [-11.3, -5.6, 0.8, 'boulder boulder cairn'],
      [-11.2, 4.8, 0.85, 'crate crate barrel slab'],
      // east
      [11.3, -5.8, 0.75, 'slab boulder bush'],
      [11.2, 4.4, 0.8, 'fence fence boulder'],
      [11.3, 7.0, 0.6, 'cairn slab'],
      [-11.2, 0.4, 0.6, 'stump boulder'],
    ],
    sunPools: [
      [-3.8, -3.0, 1.45], [4.4, 2.2, 1.55], [-0.6, 5.0, 1.05], [-7.4, 3.0, 1.15],
      [7.8, -3.4, 1.3], [1.6, -5.4, 0.95],
    ],
    monolith: [-8.4, -6.6, -0.4],
  },

  // ---- 3 · "Mossy Hollow"
  3: {
    id: 3,
    name: 'hollow',
    // Shaded hollow: dimmest key, coolest fill, but big soft shafts punching
    // through the canopy — the fire pools do most of the lighting here.
    mood: { key: 0.96, fill: 1.12, dapple: 0.9, warmth: 0.0 },
    ground: {
      h: 88, s: 0.52, l: 0.355, shadeH: 180, shadeS: 0.2, shadeL: 0.12,
      dirtH: 38, dirtL: 0.235, mossN: 30, leafN: 220, crackN: 4, pebbleN: 70,
    },
    paths: [{ pts: [[-12.6, 5.8], [-7.4, 4.4], [-2.6, 1.2], [0.4, -2.6], [4.8, -5.6], [12.6, -6.2]], w: 0.85 }],
    grass: 720,
    flowers: 46,
    torches: [[-11.2, 4.9], [11.2, -5.0], [-4.6, -7.2], [4.0, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[1.2, -7.3, -1.5708], [-8.7, 7.3, 1.5708]],
    clusters: [
      // north — overgrown hollow rim
      [-9.8, -7.3, 0.9, 'bush bush stump log'],
      [-1.6, -7.4, 0.8, 'bush bush boulder'],
      [6.2, -7.3, 0.85, 'stump stump bush'],
      [10.2, -7.2, 0.7, 'log bush'],
      // south
      [-8.0, 7.3, 0.85, 'bush bush log'],
      [-2.2, 7.4, 0.75, 'stump bush boulder'],
      [5.8, 7.3, 0.9, 'crate barrel bush'],
      [10.4, 7.2, 0.7, 'bush bush'],
      // west
      [-11.2, -5.4, 0.8, 'stump stump bush'],
      [-11.2, 1.2, 0.7, 'boulder bush'],
      [-11.3, 6.8, 0.7, 'bush bush slab'],
      // east
      [11.2, -1.8, 0.9, 'barrel barrel barrel crate'],
      [11.3, 2.6, 0.7, 'bush boulder'],
      [11.2, 6.6, 0.75, 'log bush stump'],
    ],
    sunPools: [
      [-2.8, 2.6, 1.15], [4.8, -3.4, 1.05], [-6.5, -2.0, 0.9], [8.2, 3.4, 0.8],
      [0.9, -1.1, 1.0], [-9.0, 4.4, 0.8], [6.0, 5.6, 0.8], [2.4, 6.4, 0.75],
      [-4.4, -5.2, 0.8], [-1.4, -6.6, 0.6],
    ],
    monolith: [-10.1, -2.4, 1.15],
  },
};

// Shortest distance from (x, z) to the centerline of any path, minus that
// path's half width => negative means ON the dirt. Foliage placement uses it
// so tufts/flowers never grow out of the beaten track.
export function pathClearance(spec, x, z) {
  let best = Infinity;
  for (const path of spec.paths) {
    const pts = path.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2)) : 0;
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      best = Math.min(best, d - path.w / 2);
    }
  }
  return best;
}
