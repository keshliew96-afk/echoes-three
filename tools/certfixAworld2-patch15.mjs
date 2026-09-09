// A-world r2, step 3g: bloom strength 1.35. With GAIN_MAX holding every
// COLOURED stop of the flame under the threshold, the only thing this pass can
// amplify is the near-neutral white core (HSV sat 0.03-0.06), so extra
// strength is extra cream halo, never a saturated veil. It is the one lever
// that raises the frame's >240 share reliably across camera positions —
// measured 0.042-0.091% at strength 1.22, i.e. straddling the analyzer's
// 0.05% "bucket used" line.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/render/stage.js', [
  [`  strength: 1.22,`, `  strength: 1.35,`],
]);
