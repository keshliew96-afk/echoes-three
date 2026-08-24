// Act-1 arena layout pool (§13: hand-built layouts, 3 variants; prop
// arrangement + palette story differ so variants read apart at a glance).
// Playfield is the graybox sim rect: x in [-12, 12], z in [-8, 8] (z- = north,
// the top of the screen). Props hug the walls (§19.3: props ring the arena
// edges, >=60% of the floor stays open; sim collision is the wall rect only).
//
// ground: HSL base for the canvas painter (inside the §19.3 green band —
//   hue 70-110ish, the same derivation family as data/palette.js ACT1_GROUND
//   which is hsl(100, 43%, 38%)). mossN/leafN/crackN tune the scatter decals.
// paths: polylines in world units + width (dirt, painted into the ground).
// torches/lanterns/fences/...: [x, z, yaw?] placements.
// lightIdx: which torches carry a real PointLight (2 per variant).
// sunPools: [x, z, r] warm canopy-dapple light pools (§19.3 warm:cool 70:30 —
//   mid-field so >=2 warm pools sit in ANY gameplay frame, not just at walls).
// monolith: [x, z, yaw] — the act's single violet corruption tell.
export const VARIANTS = {
  // ---- 1 · "Beaten Clearing": fresh spring green, one diagonal cart path,
  // timber-heavy dressing (stumps + fences), monolith on the NE tree line.
  1: {
    id: 1,
    name: 'clearing',
    ground: { h: 100, s: 0.48, l: 0.3, mossN: 14, leafN: 210, crackN: 6, pebbleN: 90 },
    paths: [{ pts: [[-12.6, -5.2], [-7, -3.8], [-1, -0.6], [4.5, 2.6], [12.6, 4.6]], w: 1.35 }],
    grass: 400,
    flowers: 90,
    torches: [[-5.6, -7.35], [5.2, 7.35], [11.3, -3.0], [-11.3, 3.2]],
    lightIdx: [0, 2],
    lanterns: [[3.0, -7.4, -1.5708], [-3.4, 7.4, 1.5708]],
    fences: [
      [-8.4, -7.55, 0], [-7.35, -7.55, 0], [-6.3, -7.55, 0],
      [7.0, 7.55, 0], [8.05, 7.55, 0], [9.1, 7.55, 0],
    ],
    stumps: [[-10.9, -6.6], [-9.9, -7.3], [10.8, 6.5], [0.8, -7.5], [-11.3, 6.9]],
    crates: [[11.15, 2.0, 0.3], [10.6, 2.75, -0.2], [11.3, 3.4, 0.15], [-1.9, -7.6, 0.4]],
    barrels: [[-11.2, -2.4], [-10.7, -1.7], [6.9, -7.5], [11.1, -5.8]],
    slabs: [
      [-10.9, -4.6, 0.3], [10.7, 4.1, -0.25], [-0.5, -7.7, 0.1],
      [-5.2, 7.6, 0.35], [11.5, -7.2, 0.2],
    ],
    boulders: [
      [-11.5, 4.8], [-6.9, 7.35], [2.9, 7.5],
      [11.5, -6.9], [-11.6, -7.2], [4.6, -7.55],
    ],
    sunPools: [[-4.5, 1.8, 2.8], [3.2, -2.4, 2.4], [0.5, 4.6, 2.0]],
    monolith: [7.9, -6.8, 0.45],
  },

  // ---- 2 · "Old Crossroads": drier yellow-green, two crossing paths, stone
  // dressing (slabs + boulders) with a crate depot in the SW corner, monolith
  // on the NW tree line.
  2: {
    id: 2,
    name: 'crossroads',
    ground: { h: 84, s: 0.44, l: 0.32, mossN: 9, leafN: 300, crackN: 9, pebbleN: 140 },
    paths: [
      { pts: [[-12.6, 0.6], [-4, 0.1], [3, -0.3], [12.6, -0.7]], w: 1.3 },
      { pts: [[0.5, -8.6], [0.1, -2], [-0.4, 3], [-0.2, 8.6]], w: 1.15 },
    ],
    grass: 340,
    flowers: 120,
    torches: [[-11.35, -1.9], [11.35, 1.2], [-1.9, -7.35], [2.2, 7.35]],
    lightIdx: [2, 1],
    lanterns: [[-6.4, -7.4, -1.5708], [6.8, 7.4, 1.5708]],
    fences: [
      [11.55, -5.2, 1.5708], [11.55, -4.15, 1.5708],
      [-11.55, 4.4, 1.5708], [-11.55, 5.45, 1.5708],
    ],
    stumps: [[8.8, -7.35], [-8.5, 7.4]],
    crates: [[-10.9, 5.9, 0.2], [-10.3, 6.6, -0.3], [-11.25, 6.75, 0.5], [-1.2, -7.6, 0.3]],
    barrels: [[-9.7, 7.2], [-11.4, 5.0], [9.9, 7.3], [1.8, -7.55]],
    slabs: [
      [3.6, -7.65, 0.2], [-3.9, -7.6, -0.15], [4.2, 7.6, 0.3],
      [10.8, -6.9, 0.1], [-10.9, -4.9, 0.4],
    ],
    boulders: [
      [-11.45, -5.6], [-6.3, -7.5], [6.6, -7.45],
      [11.35, 6.3], [-11.6, 2.2], [11.5, 3.9],
    ],
    sunPools: [[-3.8, -3.0, 2.5], [4.4, 2.2, 2.8], [-0.6, 5.0, 1.9]],
    monolith: [-8.2, -6.8, -0.4],
  },

  // ---- 3 · "Mossy Hollow": deep cool moss green, one curved path, heavy
  // moss/leaf dressing, barrel stacks on the east wall, monolith mid-east.
  3: {
    id: 3,
    name: 'hollow',
    ground: { h: 116, s: 0.42, l: 0.26, mossN: 26, leafN: 260, crackN: 5, pebbleN: 70 },
    paths: [{ pts: [[-12.6, 5.8], [-7.4, 4.4], [-2.6, 1.2], [0.4, -2.6], [4.8, -5.6], [12.6, -6.2]], w: 1.25 }],
    grass: 440,
    flowers: 60,
    torches: [[-11.35, 4.9], [11.3, -5.0], [-4.6, -7.35], [4.0, 7.35]],
    lightIdx: [2, 1],
    lanterns: [[1.2, -7.4, -1.5708], [-8.7, 7.4, 1.5708]],
    fences: [
      [-2.7, -7.55, 0], [-1.65, -7.55, 0], [-0.6, -7.55, 0],
      [-11.55, 0.9, 1.5708],
    ],
    stumps: [[-11.0, -3.6], [-10.15, -2.8], [-11.35, -2.0], [7.6, -7.4]],
    crates: [[10.95, -3.3, 0.25], [11.35, -2.55, -0.2], [5.9, 7.55, 0.4]],
    barrels: [[11.15, 0.6], [10.6, 1.35], [11.25, 2.0], [-6.2, -7.5]],
    slabs: [[-10.9, 5.4, 0.3], [9.7, -7.1, 0.15], [0.3, 7.65, 0.2], [-7.4, -7.6, 0.1]],
    boulders: [
      [-6.7, 7.4], [1.7, 7.5], [11.5, 4.3],
      [-11.55, -6.8], [3.4, -7.55], [-11.5, 7.0],
    ],
    sunPools: [[-2.8, 2.6, 2.6], [4.8, -3.4, 2.3], [-6.5, -2.0, 1.9]],
    monolith: [11.0, -1.2, -0.35],
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
