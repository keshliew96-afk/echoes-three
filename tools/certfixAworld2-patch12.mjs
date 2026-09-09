// A-world r2, step 5 (checks 2 + 4): a lit TOWER on the picture's bottom edge.
// The round-1 frame-edge ring dressed the bottom band with silhouettes only
// (barricade / crate / stump / bush) — the emitters all sit at z <= 2.2, so on
// the night floor the lower sixth of every run frame is dark ground with a few
// unlit shapes on it. Reference D dresses its bridge with TORCH TOWERS along
// the near edge; `tower` already carries a lantern emitter (env/props.js), so
// one per variant on each side of the bottom band buys a prop silhouette and a
// warm pool in the same object. Positions stay inside the frame's bottom x
// range (+-6 to +-7 at z 4.0-4.3), clear of the beaten tracks and of the
// existing bottom clusters; env/props.js rejects any that would land on a path
// or inside another footprint.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/variants.js', [
  [
`      [3.6, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
    ],`,
`      [3.6, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
      // Fix round 2 (checks 2 + 4): the picture's bottom edge gets a lit
      // tower on each side, not just silhouettes.
      [5.6, 4.1, 0.55, 'tower barricade'],
      [-6.3, 3.8, 0.55, 'banner boulder'],
    ],`,
  ],
  [
`      [3.4, 4.4, 0.7, 'bush cairn barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
    ],`,
`      [3.4, 4.4, 0.7, 'bush cairn barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.6, 0.6, 'tower barricade'],
      // Fix round 2 (checks 2 + 4): see variant 1.
      [5.8, 4.2, 0.55, 'tower barricade'],
      [-6.4, 3.9, 0.55, 'banner cairn'],
    ],`,
  ],
  [
`      [3.4, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.4, 0.6, 'tower barricade'],
    ],`,
`      [3.4, 4.4, 0.7, 'bush stump barricade'],
      [7.8, 2.2, 0.6, 'tower slab'],
      [9.6, -4.4, 0.6, 'tower barricade'],
      // Fix round 2 (checks 2 + 4): see variant 1.
      [5.6, 4.2, 0.55, 'tower barricade'],
      [-6.4, 3.9, 0.55, 'banner boulder'],
    ],`,
  ],
]);
