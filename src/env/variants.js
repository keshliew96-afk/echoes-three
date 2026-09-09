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
    // CERTIFICATION FIX ROUND 1 (A-world, checks 2/7): the run arenas move
    // from flat daylight to the deep-shadow-versus-fire funnel of the
    // reference (docs/BUILD_BRIEF.md §11 tuning note, 2026-09-09). Key at
    // 0.5x and fill at 0.65x of the ACT1_LIGHT rig lands the open floor near
    // display 70 with the torch/brazier pools 2-3x brighter than the ground
    // beside them; the painted shade pockets and the vignette supply the
    // black point. The boss layer's own 0.5x stop-down composes on top.
    mood: { key: 0.5, fill: 0.65, warmth: 0.0 },
    ground: {
      // shadeS 0.25/shadeH 196 (were 0.3/200): a heavy shade roll was landing
      // the spawn frame at cool > warm; the pockets stay measurably cool
      // (h>=160) while warm keeps the §19.3 upper hand.
      // dirtH 46 (was 52, before that 57). The track is the largest warm
      // SURFACE in the frame and its hue decides which bucket it counts in:
      // painted at 52-65 the rendered dirt was landing at 48-60, i.e. half of
      // it scored as foliage, and the Act-1 warm share came out under the cool
      // counterweight. The old high hues were bought to clear the h25 Ember
      // ceiling; with the flame bloom veil capped (env/flame.js GAIN_MAX) the
      // frame's whole reserved-band count is under 80 px, so 46 sits ~20
      // degrees clear of the ceiling AND lands the whole track in the warm
      // family. Variants 2/3 moved the same way (57 -> 48, 65 -> 50).
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
      // h 80 (was 90) / shadeH 196 / shadeS 0.26 / shadeL 0.075 / coolLift 6
      // (fix round 1): the lit green is authored OLIVE (red decisively over
      // blue) and the shade end DARK and only moderately saturated, so the
      // painted blend from grass to shade pocket crosses the reserved heal
      // band h110-150 only where the pixel is already under the analyzer's
      // L40 / s0.35 gates. Measured on the round-1 frame the old ramp put
      // 21-36% of every grass box inside the heal band.
      h: 80, s: 0.56, l: 0.39, shadeH: 196, shadeS: 0.26, shadeL: 0.075, coolLift: 6,
      dirtH: 46, dirtL: 0.255, mossN: 16, leafN: 200, crackN: 6, pebbleN: 90,
      // Certification fix round 1 (A-world): foliage hue offsets pulled DOWN
      // and the cool-shade blades sent to the shade hue, so no grass, moss
      // or bush renders inside the reserved h110-150 heal band; the second
      // canvas lift trimmed so the olive base keeps red > blue (the blend
      // toward the indigo shade pockets then crosses h110-150 only where it
      // is already under the analyzer's L40 / s0.35 gates).
      mossOff: 6, bushOff: 8, bushLitOff: 0, wallMossOff: 6, bladeCool: 'shade', lift2: 3,
    },
    propsAvoidPaths: true,
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
      // Fix round 1 — inner ring so EVERY frame edge is dressed (reference D:
      // towers, banners, barricades), clear of the spawn ring and the track.
      [-8.6, -2.6, 0.7, 'tower barricade'],
      [-8.4, 2.4, 0.8, 'stump fence banner'],
      [8.6, -2.2, 0.7, 'banner crate barricade'],
      [8.6, 1.2, 0.75, 'tower stump'],
      [-3.2, 5.8, 0.7, 'barricade stump'],
      [3.6, 5.9, 0.7, 'tower crate'],
      [-0.6, 6.1, 0.6, 'fence banner'],
      // CERTIFICATION FIX ROUND 1 (A-world, check 4) — the FRAME's edges, not
      // the arena's. Solved with the real 3/4 rig (fov 45, distance 12,
      // elevation 52, focus = the player): at 1600x900 the spawn frame shows
      // world z from -8 (top) down to only z ~= +4.6, and x narrows from +-12
      // at the top wall to +-6 at the bottom, so the round-1 south ring at
      // z 5.8-6.1 projects BELOW the frame and the scorers correctly measured
      // "y>540 holds only one torch". These clusters are aimed at the left,
      // bottom and right edges of the picture (screen 34-1596 x 184-867),
      // clear of the beaten track and of each other.
      [-9.4, -4.6, 0.6, 'tower banner'],
      [-8.0, 0.8, 0.7, 'barricade stump'],
      [-7.2, 2.9, 0.6, 'banner boulder'],
      [-4.9, 4.2, 0.6, 'barricade crate'],
      [-3.0, 4.5, 0.5, 'stump bush'],
      [3.6, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
    ],
    // Fix round 1 (check 2): two more fire pools INSIDE the spawn frame's
    // lower band (screen ~120,744 and ~1455,517). Round 1 showed only two
    // warm pools on frame; the reference funnels the eye with more.
    braziers: [[-4.5, 1.8], [3.2, -2.4], [5.6, 5.2], [-5.6, 2.6], [6.3, 0.6]],
    monolith: [7.9, -6.35, 0.45],
    // CERTIFICATION FIX ROUND 1 (A-world): per-room dressing, built hidden by
    // env/dressing.js and revealed by the run's `room_enter` events. Boss ring
    // per REFERENCE_BAR reference B (pillars / idols / urns on every edge,
    // centre open); shop room per §19.3 (the Peddler's stall + wares under the
    // Shopkeep's Lantern, in the LEFT third of the spawn frame so it stands
    // beside the shelf page rather than under it).
    rooms: {
      boss: {
        clusters: [
          [-9.0, -4.9, 0.6, 'pillar urn'],
          [9.0, -4.9, 0.6, 'pillar urn'],
          [-9.3, 0.4, 0.6, 'idol urn'],
          [9.3, 0.4, 0.6, 'idol urn'],
          [-8.8, 5.2, 0.6, 'pillar urn urn'],
          [8.8, 5.2, 0.6, 'pillar urn'],
          [-3.2, -6.7, 0.5, 'pillar'],
          [3.2, -6.7, 0.5, 'pillar'],
          [-6.6, 6.5, 0.5, 'urn pillar'],
          [6.6, 6.5, 0.5, 'pillar urn'],
          [-6.4, -2.2, 0.4, 'urn'],
          [6.4, -2.2, 0.4, 'urn'],
          // Fix round 1 (check 4): the boss camera focuses on the party at
          // z ~= -2.5, so the ring above at z >= 4 projects below the frame.
          // These four sit on the picture's left and right edges (screen
          // ~96-183 and ~1417-1504) with the centre lane left open.
          [-5.8, 0.4, 0.5, 'urn pillar'],
          [5.8, 0.4, 0.5, 'pillar urn'],
          [-6.1, 1.7, 0.45, 'urn'],
          [6.1, 1.7, 0.45, 'urn'],
          // The camera follows the PLAYER (render/camera.js), and the Healer
          // holds (0,0) through the fight, so the boss frame is framed on the
          // same focus as the spawn frame. These balance the left edge, whose
          // dirt track eats two of the ring spots above.
          [-7.6, -0.6, 0.5, 'idol urn'],
          [-7.0, 2.0, 0.45, 'pillar urn'],
        ],
      },
      shop: {
        // Fix round 1 (check 4): the stall moved in from x -7.7 to -6.4 —
        // at the spawn camera its canopy was half off the picture's left
        // edge. Its base now projects to screen ~(238,408) with the whole
        // silhouette, the counter wares and the Shopkeep's Lantern on frame,
        // still in the LEFT third so it stands beside the shelf page.
        stall: [-6.4, -0.6, 0.28],
        clusters: [
          [-6.9, 1.3, 0.55, 'crate sack sack'],
          [-7.2, -2.6, 0.6, 'barrel crate'],
          [-5.2, -2.9, 0.4, 'banner'],
          [-8.2, -0.4, 0.4, 'sack'],
        ],
      },
    },
  },

  // ---- 2 · "Old Crossroads"
  2: {
    id: 2,
    name: 'crossroads',
    // Dry crossroads at high sun: hardest key. `warmth` trimmed 0.12 -> 0.05
    // and fill raised 0.78 -> 1.02: the amber-heavy, fill-starved rig was
    // pushing lit timber/stone into the reserved h5-25 band AND starving the
    // frame of its cool counterweight (baseline-v030 F1/F2).
    mood: { key: 0.55, fill: 0.66, warmth: 0.05 },
    ground: {
      // shadeS 0.27 / coolLift 20 (were 0.32/24): measured warm 37.4% vs cool
      // 37.4% — a dead tie, and §19.3 keeps Act-1 warm-DOMINANT. This trims the
      // cool side back under warm while the pockets stay a visible >=8% share.
      h: 78, s: 0.52, l: 0.42, shadeH: 196, shadeS: 0.26, shadeL: 0.08, coolLift: 6,
      dirtH: 48, dirtL: 0.30, mossN: 8, leafN: 150, crackN: 12, pebbleN: 160,
      // Certification fix round 1 (A-world): foliage hue offsets pulled DOWN
      // and the cool-shade blades sent to the shade hue, so no grass, moss
      // or bush renders inside the reserved h110-150 heal band; the second
      // canvas lift trimmed so the olive base keeps red > blue (the blend
      // toward the indigo shade pockets then crosses h110-150 only where it
      // is already under the analyzer's L40 / s0.35 gates).
      mossOff: 6, bushOff: 8, bushLitOff: 0, wallMossOff: 6, bladeCool: 'shade', lift2: 3,
    },
    propsAvoidPaths: true,
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
      // Fix round 1 — inner ring (see variant 1).
      [-8.6, -2.8, 0.7, 'tower cairn barricade'],
      [-8.4, 2.6, 0.75, 'slab banner boulder'],
      [8.6, -2.6, 0.7, 'banner boulder barricade'],
      [8.5, 2.8, 0.7, 'tower slab'],
      [-3.4, 5.8, 0.7, 'barricade cairn'],
      [3.4, 5.9, 0.7, 'tower boulder'],
      [-6.6, 5.6, 0.6, 'banner slab'],
      // CERTIFICATION FIX ROUND 1 (A-world, check 4) — the FRAME's edges, not
      // the arena's. Solved with the real 3/4 rig (fov 45, distance 12,
      // elevation 52, focus = the player): at 1600x900 the spawn frame shows
      // world z from -8 (top) down to only z ~= +4.6, and x narrows from +-12
      // at the top wall to +-6 at the bottom, so the round-1 south ring at
      // z 5.8-6.1 projects BELOW the frame and the scorers correctly measured
      // "y>540 holds only one torch". These clusters are aimed at the left,
      // bottom and right edges of the picture (screen 34-1596 x 184-867),
      // clear of the beaten track and of each other.
      [-9.4, -4.6, 0.6, 'tower banner'],
      [-8.0, -2.6, 0.7, 'barricade cairn'],
      [-7.4, 2.8, 0.6, 'banner boulder'],
      [-4.9, 4.2, 0.6, 'barricade crate'],
      [-2.8, 4.5, 0.5, 'stump slab'],
      [3.4, 4.4, 0.7, 'bush cairn barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
    ],
    // Fix round 1 (check 2): see variant 1 — fire pools inside the spawn
    // frame's lower band, clear of both dirt tracks.
    braziers: [[-3.8, -3.0], [4.4, 2.2], [-7.4, 3.0], [-5.6, 2.6], [6.3, 1.4]],
    monolith: [-8.4, -6.6, -0.4],
    // CERTIFICATION FIX ROUND 1 (A-world): per-room dressing, built hidden by
    // env/dressing.js and revealed by the run's `room_enter` events. Boss ring
    // per REFERENCE_BAR reference B (pillars / idols / urns on every edge,
    // centre open); shop room per §19.3 (the Peddler's stall + wares under the
    // Shopkeep's Lantern, in the LEFT third of the spawn frame so it stands
    // beside the shelf page rather than under it).
    rooms: {
      boss: {
        clusters: [
          [-9.0, -4.9, 0.6, 'pillar urn'],
          [9.0, -4.9, 0.6, 'pillar urn'],
          [-8.6, 2.2, 0.6, 'idol urn'],
          [8.6, 2.2, 0.6, 'idol urn'],
          [-8.8, 5.4, 0.6, 'pillar urn urn'],
          [8.8, 5.4, 0.6, 'pillar urn'],
          [-3.2, -6.7, 0.5, 'pillar'],
          [3.2, -6.7, 0.5, 'pillar'],
          [-6.6, 6.5, 0.5, 'urn pillar'],
          [6.6, 6.5, 0.5, 'pillar urn'],
          [-6.4, -2.6, 0.4, 'urn'],
          [6.4, -2.6, 0.4, 'urn'],
          // Fix round 1 (check 4): the boss camera focuses on the party at
          // z ~= -2.5, so the ring above at z >= 4 projects below the frame.
          // These four sit on the picture's left and right edges (screen
          // ~96-183 and ~1417-1504) with the centre lane left open.
          [-5.8, 0.4, 0.5, 'urn pillar'],
          [5.8, 0.4, 0.5, 'pillar urn'],
          [-6.1, 1.7, 0.45, 'urn'],
          [6.1, 1.7, 0.45, 'urn'],
          // The camera follows the PLAYER (render/camera.js), and the Healer
          // holds (0,0) through the fight, so the boss frame is framed on the
          // same focus as the spawn frame. These balance the left edge, whose
          // dirt track eats two of the ring spots above.
          [-7.6, -0.6, 0.5, 'idol urn'],
          [-7.0, 2.0, 0.45, 'pillar urn'],
        ],
      },
      shop: {
        // Fix round 1 (check 4): the stall moved in from x -7.7 to -6.4 —
        // at the spawn camera its canopy was half off the picture's left
        // edge. Its base now projects to screen ~(238,408) with the whole
        // silhouette, the counter wares and the Shopkeep's Lantern on frame,
        // still in the LEFT third so it stands beside the shelf page.
        stall: [-6.4, -0.6, 0.28],
        clusters: [
          [-6.9, 1.3, 0.55, 'crate sack sack'],
          [-7.2, -2.6, 0.6, 'barrel crate'],
          [-5.2, -2.9, 0.4, 'banner'],
          [-8.2, -0.4, 0.4, 'sack'],
        ],
      },
    },
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
    // poolR 1.1 and fill 1.06 (fix round 2): the hollow is the room where the
    // fire bowls do the lighting, and with the flame bloom veil capped it was
    // the one variant whose warm share ran close to its cool counterweight
    // (21.4% vs 15.6%). Wider fire pools + a touch less indigo fill widen the
    // §19.3 warm-dominant margin without touching the pockets themselves.
    mood: { key: 0.48, fill: 0.68, warmth: 0.0, poolR: 1.1, keyWhite: 0.3 },
    ground: {
      // shadeS 0.26 / shadeH 200 (were 0.34/204): the hollow is the coolest
      // room by design, but a heavy shade roll flipped whole frames
      // cool-dominant — this keeps the pockets while warm stays on top.
      // dirtH 61 / dirtL 0.26 (were 57/0.235): the hollow's dim light + the
      // grade's red-lift landed the darker track sections at h24-24.6 /
      // s0.35-0.43 — a hair inside the reserved Ember band. Painted gold-er
      // and a step lighter, the rendered track sits above h26 at every dim
      // stretch while still reading as the same beaten dirt.
      // h 76 (was 82) and mossOff 4 (fix round 1, second pass): variant 3 is
      // the one room whose key is BLEACHED toward white (mood.keyWhite 0.3),
      // so the warm key does not rotate its green down the way it does in its
      // siblings — measured, the spawn frame put 8524 px inside the reserved
      // h110-150 heal band against 2324 (v2) and ~1400 (v1, and those are the
      // Healer's own staff and ring). Authoring the hollow's green six degrees
      // lower puts it back level with them.
      h: 76, s: 0.58, l: 0.355, shadeH: 197, shadeS: 0.26, shadeL: 0.075, coolLift: 6,
      dirtH: 50, dirtL: 0.285, mossN: 30, leafN: 220, crackN: 4, pebbleN: 70,
      // Certification fix round 1 (A-world): foliage hue offsets pulled DOWN
      // and the cool-shade blades sent to the shade hue, so no grass, moss
      // or bush renders inside the reserved h110-150 heal band; the second
      // canvas lift trimmed so the olive base keeps red > blue (the blend
      // toward the indigo shade pockets then crosses h110-150 only where it
      // is already under the analyzer's L40 / s0.35 gates).
      mossOff: 4, bushOff: 6, bushLitOff: 0, wallMossOff: 6, bladeCool: 'shade', lift2: 3,
    },
    propsAvoidPaths: true,
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
      // Fix round 1 — inner ring (see variant 1).
      [-8.6, -2.4, 0.75, 'tower stump barricade'],
      [-8.2, 1.0, 0.7, 'bush banner log'],
      [8.6, -2.0, 0.7, 'banner bush barricade'],
      [8.5, 3.2, 0.7, 'tower stump'],
      [-3.0, 5.9, 0.7, 'barricade bush'],
      [3.6, 5.8, 0.7, 'tower log'],
      [0.2, 6.1, 0.6, 'banner bush'],
      // CERTIFICATION FIX ROUND 1 (A-world, check 4) — the FRAME's edges, not
      // the arena's. Solved with the real 3/4 rig (fov 45, distance 12,
      // elevation 52, focus = the player): at 1600x900 the spawn frame shows
      // world z from -8 (top) down to only z ~= +4.6, and x narrows from +-12
      // at the top wall to +-6 at the bottom, so the round-1 south ring at
      // z 5.8-6.1 projects BELOW the frame and the scorers correctly measured
      // "y>540 holds only one torch". These clusters are aimed at the left,
      // bottom and right edges of the picture, clear of the curved track.
      [-9.4, -4.6, 0.6, 'tower banner'],
      [-8.2, -1.6, 0.7, 'barricade stump'],
      [-7.4, 2.6, 0.6, 'banner boulder'],
      [-4.6, 4.2, 0.6, 'barricade crate'],
      [-2.4, 4.6, 0.5, 'stump bush'],
      [3.4, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.4, 0.6, 'tower barricade'],
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
    // Fix round 1 (check 2): see variant 1 — two more fire pools inside the
    // spawn frame's lower band, both >= 1.7 u clear of the curved track.
    braziers: [[-3.4, 4.6], [5.8, -2.2], [-6.2, -1.2], [-5.8, 1.8], [6.4, 1.6]],
    // Monolith moved to the north-mid wall (was [-10.1,-2.4] — W-mid, and 95%
    // OUT of the spawn frame: the act's violet tell measured 0-53 px while the
    // sliver that did show sat in the vignette corner and painted a fixed
    // ~450 px maroon patch every roll it caught light). At [3.9,-6.8] the
    // whole prop is in the opening frame (variant identity note: "monolith
    // N-mid"), clear of the lantern pool at [1.2,-7.3] (2.7 u) and the stump
    // cluster at [6.2,-7.3] (2.3 u).
    monolith: [3.9, -6.8, 1.15],
    // CERTIFICATION FIX ROUND 1 (A-world): per-room dressing, built hidden by
    // env/dressing.js and revealed by the run's `room_enter` events. Boss ring
    // per REFERENCE_BAR reference B (pillars / idols / urns on every edge,
    // centre open); shop room per §19.3 (the Peddler's stall + wares under the
    // Shopkeep's Lantern, in the LEFT third of the spawn frame so it stands
    // beside the shelf page rather than under it).
    rooms: {
      boss: {
        clusters: [
          [-9.0, -4.9, 0.6, 'pillar urn'],
          [9.0, -3.9, 0.6, 'pillar urn'],
          [-9.3, 0.4, 0.6, 'idol urn'],
          [9.3, 0.4, 0.6, 'idol urn'],
          [-8.8, 5.2, 0.6, 'pillar urn urn'],
          [8.8, 5.2, 0.6, 'pillar urn'],
          [-3.2, -6.7, 0.5, 'pillar'],
          [2.4, -7.0, 0.5, 'pillar'],
          [-6.6, 6.5, 0.5, 'urn pillar'],
          [6.6, 6.5, 0.5, 'pillar urn'],
          [-6.4, -2.6, 0.4, 'urn'],
          [6.8, -0.4, 0.4, 'urn'],
          // Fix round 1 (check 4): the boss camera focuses on the party at
          // z ~= -2.5, so the ring above at z >= 4 projects below the frame.
          // These four sit on the picture's left and right edges (screen
          // ~96-183 and ~1417-1504) with the centre lane left open.
          [-5.8, 0.4, 0.5, 'urn pillar'],
          [5.8, 0.4, 0.5, 'pillar urn'],
          [-6.1, 1.7, 0.45, 'urn'],
          [6.1, 1.7, 0.45, 'urn'],
          // The camera follows the PLAYER (render/camera.js), and the Healer
          // holds (0,0) through the fight, so the boss frame is framed on the
          // same focus as the spawn frame. These balance the left edge, whose
          // dirt track eats two of the ring spots above.
          [-7.6, -0.6, 0.5, 'idol urn'],
          [-7.0, 2.0, 0.45, 'pillar urn'],
        ],
      },
      shop: {
        // Fix round 1 (check 4): the stall moved in from x -7.7 to -6.4 —
        // at the spawn camera its canopy was half off the picture's left
        // edge. Its base now projects to screen ~(238,408) with the whole
        // silhouette, the counter wares and the Shopkeep's Lantern on frame,
        // still in the LEFT third so it stands beside the shelf page.
        stall: [-6.4, -0.6, 0.28],
        clusters: [
          [-6.9, 1.3, 0.55, 'crate sack sack'],
          [-7.2, -2.6, 0.6, 'barrel crate'],
          [-5.2, -2.9, 0.4, 'banner'],
          [-8.2, -0.4, 0.4, 'sack'],
        ],
      },
    },
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
