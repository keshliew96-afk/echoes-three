// A-world r2, step 2: the grade's shadow split-tone actually reaches the
// shadows. Measured on captures/certfixAworld2-t3-combat.png: the ref lens's
// own darkest-region probe (box 1100,700,500,200) still read warm 55.0 / cool
// 28.0 at mean luma 26.9 — "brown-olive shadow" — because the split-tone
// ramp closed at display luma ~107 (smoothstep 0.03..0.42) and, at a display
// value of 27, contributed a 1% blue lift. Opening the ramp to 0.02..0.55 and
// deepening the multiplier lands that same box blue-dominant while leaving
// anything above display ~140 (the fire pools, the party, every emitter core)
// untouched: at lm 0.588 the mix factor is 0.99, i.e. multiplier (0.997,
// 0.999, 1.002).
import { edit } from './certfixAworld2-patch.mjs';
edit('src/render/stage.js', [
  [
`        float lm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(vec3(0.84, 0.90, 1.10), vec3(1.0), smoothstep(0.03, 0.42, lm));`,
`        float lm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(vec3(0.76, 0.88, 1.18), vec3(1.0), smoothstep(0.02, 0.55, lm));`,
  ],
]);
edit('src/env/variants.js', [
  [`      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.34, shadeL: 0.068, coolLift: 22,`,
   `      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.38, shadeL: 0.068, coolLift: 22,`],
  [`      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.34, shadeL: 0.072, coolLift: 22,`,
   `      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.38, shadeL: 0.072, coolLift: 22,`],
  [`      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.34, shadeL: 0.065, coolLift: 22,`,
   `      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.38, shadeL: 0.065, coolLift: 22,`],
]);
