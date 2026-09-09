// A-world r2, step 1e: the beaten track stops being the frame's light source.
// On the night floor the dirt path was the brightest large surface in the
// combat frame (a warm river with no emitter over it) — check 2 asks for
// warm POOLS against a cool ambient, and a lit road competes with them.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/variants.js', [
  [`      dirtH: 46, dirtL: 0.255, mossN: 16,`, `      dirtH: 46, dirtL: 0.20, mossN: 16,`],
  [`      dirtH: 48, dirtL: 0.30, mossN: 8,`, `      dirtH: 48, dirtL: 0.235, mossN: 8,`],
  [`      dirtH: 50, dirtL: 0.285, mossN: 30,`, `      dirtH: 50, dirtL: 0.225, mossN: 30,`],
]);
