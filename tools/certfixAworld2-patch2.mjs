// A-world r2, step 1c: the lit dapple stops being an acid-green light pool.
// Measured on captures/certfixAworld2-t1-fastarena.png: the stamps painted at
// s0.82 / l+0.10 over the new indigo base rotated into the reserved heal band
// (h110-150) — 1470 of the frame's 3502 heal px sat in one stamp at
// (448,160)-(576,256) — and read as sourceless daylight on a night floor.
import { edit } from './certfixAworld2-patch.mjs';

edit('src/env/ground.js', [
  [
`    plateauBlob(ctx, x, y, r(190, 300), hsl(g.h - 6, g.s + 0.24, g.l + 0.10, 0.86), 0.34)`,
`    blob(ctx, x, y, r(200, 310), hsl(g.h - 12, g.s + 0.04, g.l + 0.02, 0.82))`,
  ],
  [
`        : hsl(g.h + r(-9, 9), g.s + r(0.0, 0.16), g.l + r(-0.05, 0.06), 0.5);`,
`        : hsl(g.h + r(-9, 7), g.s + r(-0.08, 0.06), g.l + r(-0.05, 0.05), 0.5);`,
  ],
  [
`      hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.10, shL + 0.055, 0.62),`,
`      hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.10, shL + 0.05, 0.68),`,
  ],
]);
