// A-world r2, step 1b: the night floor reaches the per-variant ground specs
// and the grass tufts.
import { edit } from './certfixAworld2-patch.mjs';

edit('src/env/variants.js', [
  [
`      h: 80, s: 0.56, l: 0.39, shadeH: 196, shadeS: 0.26, shadeL: 0.075, coolLift: 6,`,
`      // FIX ROUND 2 (checks 2/6/7): the lit value drops 0.39 -> 0.30 and the
      // shade end goes deeper, bluer and more saturated (196/0.26 -> 202/0.34).
      // The floor is now painted night-first (env/ground.js pass 1), so `+'`l`'+` is
      // the value of the LIT dapple openings rather than of the whole field —
      // at 0.39 those openings read as noon and the torch pools had nothing to
      // be brighter than.
      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.34, shadeL: 0.068, coolLift: 16,`,
  ],
  [
`      h: 78, s: 0.52, l: 0.42, shadeH: 196, shadeS: 0.26, shadeL: 0.08, coolLift: 6,`,
`      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.34, shadeL: 0.072, coolLift: 16,`,
  ],
  [
`      h: 76, s: 0.58, l: 0.355, shadeH: 197, shadeS: 0.26, shadeL: 0.075, coolLift: 6,`,
`      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.34, shadeL: 0.065, coolLift: 16,`,
  ],
]);

edit('src/env/foliage.js', [
  [
`    const cool = cosmetic.chance(0.28);`,
`    // FIX ROUND 2: 0.38, not 0.28. With the floor painted night-first the
    // shade blades are the ones that sit on the majority of the field, and a
    // tuft lit like noon on an indigo floor reads as a decal.
    const cool = cosmetic.chance(0.38);`,
  ],
]);
