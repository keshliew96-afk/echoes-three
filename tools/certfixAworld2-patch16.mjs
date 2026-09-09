// A-world r2, step 6: give the black point back what the brighter pools took.
// The reference puts 27% of its pixels in LUMA bucket 0 and 48% in the two
// darkest; the certified combat frame sits at 10% / 41% once the pools are
// bright enough to carry check 7's top end. Value range is a two-ended
// measurement, and the two ends are independently reachable here: the pools
// and the emitter cores are ADDITIVE, so darkening the painted floor lowers
// the low end without touching >160 / >200 at all. The shade end of each
// variant's ramp drops ~0.015 (the base fill is shadeL + 0.055) and the
// canopy pockets go with it.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/variants.js', [
  [`      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.38, shadeL: 0.068, coolLift: 22,`,
   `      h: 82, s: 0.58, l: 0.285, shadeH: 202, shadeS: 0.38, shadeL: 0.052, coolLift: 22,`],
  [`      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.38, shadeL: 0.072, coolLift: 22,`,
   `      h: 80, s: 0.54, l: 0.31, shadeH: 202, shadeS: 0.38, shadeL: 0.056, coolLift: 22,`],
  [`      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.38, shadeL: 0.065, coolLift: 22,`,
   `      h: 78, s: 0.60, l: 0.26, shadeH: 203, shadeS: 0.38, shadeL: 0.05, coolLift: 22,`],
]);
