// A-world r2, step 2b: the vignette's cool tint stops touching the fire.
// The tint was weighted by the same shadow-protected `ve` as the darkening,
// so a torch pool sitting near a frame edge got the full indigo multiply — and
// a dark corner, whose `ve` is small by design, got almost none of it. That is
// backwards for check 2: the corners are exactly where the reference's cool
// void lives. The tint now rides the vignette's RADIUS but fades out with
// luminance, so shaded corner ground goes blue-dominant while anything above
// display ~140 keeps its colour.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/render/stage.js', [
  [
`        float vlm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float ve = v * mix(0.30, 1.0, smoothstep(0.02, 0.40, vlm));
        c = mix(c, c * vec3(0.78, 0.86, 1.06), min(1.0, ve * 1.2));
        c *= 1.0 - ve;`,
`        float vlm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float ve = v * mix(0.30, 1.0, smoothstep(0.02, 0.40, vlm));
        float tintW = min(1.0, v * 1.35) * (1.0 - smoothstep(0.10, 0.55, vlm));
        c = mix(c, c * vec3(0.66, 0.85, 1.20), tintW);
        c *= 1.0 - ve;`,
  ],
]);
