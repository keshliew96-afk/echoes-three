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
// braziers: [x, z] mid-field fire bowls (baseline-v030 F1: every warm pool
//   needs an attributable emitter — the old sourceless canopy "sunPools" are
//   replaced by these, so >=2 warm pools sit in ANY gameplay frame and each
//   pool visibly comes from a fire). Positions reuse old dapple spots, which
//   were already authored clear of the paths and the fight lanes.
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
    // Mid-morning clearing: balanced key, fires carrying the mid-field warmth.
    mood: { key: 1.0, fill: 1.0, warmth: 0.0 },
    ground: {
      // shadeS 0.25/shadeH 196 (were 0.3/200): a heavy shade roll was landing
      // the spawn frame at cool > warm; the pockets stay measurably cool
      // (h>=160) while warm keeps the §19.3 upper hand.
      // dirtH 52 (was 57): right at the 60-degree warm/olive boundary half the
      // lit track was measuring as foliage — 52 keeps the whole beaten track
      // in the warm family (and far above the h25 danger ceiling).
      // coolLift 24 (v1 used to inherit the 14 default): measured, variant 1's
      // spawn frame sat at 1.0-1.7% cool against the >=8% counterweight the
      // advisory asks for — it is the brightest, warmest of the three and
      // needs the most indigo under its shade. Grass saturation +0.06 pays
      // for the extra blue so the floor keeps the §19.3 55-65% green.
      // shadeS 0.31 / shadeL 0.115 (were 0.25/0.135): variant 1 is the
      // brightest, greenest of the three and its cool share measured 3-6%
      // against the >=8% counterweight the advisory asks for. Deeper, more
      // saturated blue-green shade pockets are the fix that does not touch
      // the lit story (its siblings already measure 12-17%).
      h: 90, s: 0.56, l: 0.39, shadeH: 180, shadeS: 0.31, shadeL: 0.115, coolLift: 15,
      dirtH: 52, dirtL: 0.255, mossN: 16, leafN: 200, crackN: 6, pebbleN: 90,
    },
    // Track widened 1.5 -> 1.8: variant 1 has ONE path (its siblings have two
    // or three warm braziers nearer the spawn camera) and needed the extra
    // warm floor area to hold the 70:30 warm:cool story in the spawn frame.
    paths: [{ pts: [[-12.6, -5.2], [-7, -3.8], [-1, -0.6], [4.5, 2.6], [12.6, 4.6]], w: 1.8 }],
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
      // Pulled east of the monolith: a tan stump inside the violet halo blends
      // to rose — the h5-25 band reserved for enemy threats.
      [9.7, -7.3, 0.8, 'stump stump bush'],
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
    braziers: [[-4.5, 1.8], [3.2, -2.4], [5.6, 5.2]],
    monolith: [7.9, -6.35, 0.45],
  },

  // ---- 2 · "Old Crossroads"
  2: {
    id: 2,
    name: 'crossroads',
    // Dry crossroads at high sun: hardest key. `warmth` trimmed 0.12 -> 0.05
    // and fill raised 0.78 -> 1.02: the amber-heavy, fill-starved rig was
    // pushing lit timber/stone into the reserved h5-25 band AND starving the
    // frame of its cool counterweight (baseline-v030 F1/F2).
    mood: { key: 1.1, fill: 1.02, warmth: 0.05 },
    ground: {
      // shadeS 0.27 / coolLift 20 (were 0.32/24): measured warm 37.4% vs cool
      // 37.4% — a dead tie, and §19.3 keeps Act-1 warm-DOMINANT. This trims the
      // cool side back under warm while the pockets stay a visible >=8% share.
      h: 86, s: 0.52, l: 0.42, shadeH: 182, shadeS: 0.30, shadeL: 0.125, coolLift: 14,
      dirtH: 57, dirtL: 0.30, mossN: 8, leafN: 150, crackN: 12, pebbleN: 160,
    },
    paths: [
      { pts: [[-12.6, 0.6], [-4, 0.1], [3, -0.3], [12.6, -0.7]], w: 2.1 },
      { pts: [[0.5, -8.6], [0.1, -2], [-0.4, 3], [-0.2, 8.6]], w: 1.55 },
    ],
    grass: 520,
    flowers: 82,
    torches: [[-11.2, -1.9], [11.2, 1.2], [-1.9, -7.2], [2.2, 7.2]],
    lightIdx: [2, 1],
    // First lantern moved to the SOUTH wall's clear stretch: on the north run
    // its warm pool either feathered across the monolith's violet halo
    // (-6.4: ~450 px danger-band murk seam) or washed the cairn cluster's
    // beige stone into h25/s0.37 (-5.0: ~490 px). At [-5.0, 7.3] the nearest
    // props sit 1.8 u away on both sides — outside the pool's tinting range.
    lanterns: [[-5.0, 7.3, 1.5708], [6.8, 7.3, 1.5708]],
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
    braziers: [[-3.8, -3.0], [4.4, 2.2], [-7.4, 3.0]],
    monolith: [-8.4, -6.6, -0.4],
  },

  // ---- 3 · "Mossy Hollow"
  3: {
    id: 3,
    name: 'hollow',
    // Shaded hollow: dimmest key, coolest fill — the fire bowls do most of the
    // lighting here. Fill 1.16 (was 1.12; a 1.28 try flipped the frame
    // cool-dominant): a touch more indigo floor under the dim warm faces,
    // with `keyWhite` below carrying the danger-band fix.
    // poolR 0.9: 0.82 cut the warm share so hard the hollow flipped
    // cool-dominant (warm 29.8% vs cool 32.9%) — 0.9 keeps the tighter
    // feather with §19.3 warm-dominance intact.
    // keyWhite 0.3: the dim hollow red-lifts every key-warmed bark/dirt face
    // into the h22-25 / s>0.35 gate (see tuneActOneLighting) — bleaching the
    // key here keeps prop surfaces neutral while the fire bowls carry §19.3's
    // warm side.
    mood: { key: 0.96, fill: 1.16, warmth: 0.0, poolR: 0.95, keyWhite: 0.3 },
    ground: {
      // shadeS 0.26 / shadeH 200 (were 0.34/204): the hollow is the coolest
      // room by design, but a heavy shade roll flipped whole frames
      // cool-dominant — this keeps the pockets while warm stays on top.
      // dirtH 61 / dirtL 0.26 (were 57/0.235): the hollow's dim light + the
      // grade's red-lift landed the darker track sections at h24-24.6 /
      // s0.35-0.43 — a hair inside the reserved Ember band. Painted gold-er
      // and a step lighter, the rendered track sits above h26 at every dim
      // stretch while still reading as the same beaten dirt.
      h: 88, s: 0.58, l: 0.355, shadeH: 181, shadeS: 0.32, shadeL: 0.118, coolLift: 16,
      dirtH: 65, dirtL: 0.285, mossN: 30, leafN: 220, crackN: 4, pebbleN: 70,
    },
    paths: [{ pts: [[-12.6, 5.8], [-7.4, 4.4], [-2.6, 1.2], [0.4, -2.6], [4.8, -5.6], [12.6, -6.2]], w: 1.6 }],
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
    // Braziers pulled well clear of the curved track: an additive warm pool
    // over v3's dark dirt is what lit the path into the danger band. The third
    // bowl slid to [-6.2,-1.2] (was [-6.5,-2.0]): at 3.6 u its pool's warm
    // feather overlapped the monolith's violet pool and the amber+violet
    // additive overlap measured ~185 px of h9-13 rose-brown (the reserved
    // Ember band) along the stone's silhouette. At 4.1 u the warm feather
    // (2.5 r) dies before the violet pool (1.2 r); still ~4 u clear of the
    // track. (A first try at [-5.2,-0.6] put the pool over the hollow's dark
    // mid-field ground and measured ~1.0k px of h18-25 murk — the bowl needs
    // to stay near the wall band where the shade stamps are thin.)
    braziers: [[-3.4, 4.6], [5.8, -2.2], [-6.2, -1.2]],
    // Monolith moved to the north-mid wall (was [-10.1,-2.4] — W-mid, and 95%
    // OUT of the spawn frame: the act's violet tell measured 0-53 px while the
    // sliver that did show sat in the vignette corner and painted a fixed
    // ~450 px maroon patch every roll it caught light). At [3.9,-6.8] the
    // whole prop is in the opening frame (variant identity note: "monolith
    // N-mid"), clear of the lantern pool at [1.2,-7.3] (2.7 u) and the stump
    // cluster at [6.2,-7.3] (2.3 u).
    monolith: [3.9, -6.8, 1.15],
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
