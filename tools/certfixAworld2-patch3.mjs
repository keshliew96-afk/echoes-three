// A-world r2, step 1d: scope the night-floor flip to the Act-1 RUN arenas.
// src/env/camp/ground.js reuses this same painter with an already-indigo night
// spec, and the camp frame scored 20/20 in round 2 — it must keep its authored
// base, mottle mix and stamp sizing. `ground.nightBase` (set only by the three
// VARIANTS) selects the flipped polarity.
import { edit } from './certfixAworld2-patch.mjs';

edit('src/env/ground.js', [
  [
`// FIX ROUND 2 (certification, checks 2/6/7): 22, not 11. The run arenas now
// paint a NIGHT floor — the base fill is the shade end and the §19.3 green
// arrives as lit dapple — so this lift is no longer trying to flip a bright
// lawn across the blue-beats-green line one value at a time. On an already
// indigo base it is a cheap, stable widener of the cool pole.
const COOL_LIFT_B = 22;`,
`const COOL_LIFT_B = 11;`,
  ],
  [
`const COOL_COLS = 10;
const COOL_ROWS = 6;
const COOL_R0 = 168;
const COOL_R1 = 214;`,
`const COOL_COLS = 10;
const COOL_ROWS = 6;
const COOL_R0 = 130;
const COOL_R1 = 172;
// FIX ROUND 2 (certification checks 2/6/7): the same counterweight, sized for
// a NIGHT floor (`+'`ground.nightBase`'+`). On the flipped polarity the plateau stamps
// are the field itself rather than pockets on a lawn, so they run wider.
const NIGHT_COOL_R0 = 168;
const NIGHT_COOL_R1 = 214;`,
  ],
  [
`  const shS = g.shadeS ?? 0.26;
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);`,
`  const shS = g.shadeS ?? 0.26;
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);
  // NIGHT FLIP (fix round 2, certification checks 2/6/7). Set by the three
  // Act-1 VARIANTS only. The camp (env/camp/ground.js) drives this painter
  // with a spec that is ALREADY a night spec and scored 20/20 on the round-2
  // reference lens, so it keeps the authored polarity below.
  const night = !!g.nightBase;`,
  ],
  [
`  ctx.fillStyle = hsl(shH + COOL_STAMP_H, shS + 0.22, shL + 0.055);
  ctx.fillRect(0, 0, W, H);`,
`  ctx.fillStyle = night
    ? hsl(shH + COOL_STAMP_H, shS + 0.22, shL + 0.055)
    : hsl(g.h + 4, g.s * 0.86, g.l * 0.62 + shL * 0.38 + 0.05);
  ctx.fillRect(0, 0, W, H);`,
  ],
  [
`      // FIX ROUND 2: the mottle follows the base. On a night floor the cool
      // cells are the MAJORITY and the green cells are the openings — the
      // same two tones, swapped shares.
      const cool = cosmetic.chance(0.66);`,
`      // FIX ROUND 2: the mottle follows the base. On a night floor the cool
      // cells are the MAJORITY and the green cells are the openings — the
      // same two tones, swapped shares.
      const cool = cosmetic.chance(night ? 0.66 : 0.24);`,
  ],
  [
`  latticeStamps(ctx, W, H, 10, 6, cosmetic, (x, y) =>
    blob(ctx, x, y, r(200, 310), hsl(g.h - 12, g.s + 0.04, g.l + 0.02, 0.82))
  );`,
`  latticeStamps(ctx, W, H, 10, 6, cosmetic, (x, y) =>
    night
      ? blob(ctx, x, y, r(200, 310), hsl(g.h - 12, g.s + 0.04, g.l + 0.02, 0.82))
      : blob(ctx, x, y, r(190, 300), hsl(g.h - 8, g.s + 0.24, g.l + 0.07, 0.34))
  );`,
  ],
  [
`      r(COOL_R0, COOL_R1),`,
`      night ? r(NIGHT_COOL_R0, NIGHT_COOL_R1) : r(COOL_R0, COOL_R1),`,
  ],
  [
`      hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.10, shL + 0.05, 0.68),
      0.5`,
`      night
        ? hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.10, shL + 0.05, 0.68)
        : hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.02, shL + 0.075, 0.5),
      0.5`,
  ],
  [
`  for (let i = 0; i < 10; i++) {
    blob(ctx, r(0, W), r(0, H), r(70, 200), hsl(g.h - 14, 0.38, g.l + 0.045, 0.14));
  }`,
`  for (let i = 0; i < 10; i++) {
    blob(
      ctx,
      r(0, W),
      r(0, H),
      r(70, 200),
      night
        ? hsl(g.h - 14, 0.38, g.l + 0.045, 0.14)
        : hsl(g.h - 14, 0.38, g.l + 0.09, 0.24)
    );
  }`,
  ],
]);

edit('src/env/variants.js', [
  [
`      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.34, shadeL: 0.068, coolLift: 16,`,
`      nightBase: 1,
      h: 82, s: 0.58, l: 0.30, shadeH: 202, shadeS: 0.34, shadeL: 0.068, coolLift: 22,`,
  ],
  [
`      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.34, shadeL: 0.072, coolLift: 16,`,
`      nightBase: 1,
      h: 80, s: 0.54, l: 0.325, shadeH: 202, shadeS: 0.34, shadeL: 0.072, coolLift: 22,`,
  ],
  [
`      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.34, shadeL: 0.065, coolLift: 16,`,
`      nightBase: 1,
      h: 78, s: 0.60, l: 0.275, shadeH: 203, shadeS: 0.34, shadeL: 0.065, coolLift: 22,`,
  ],
]);

// The grass tufts follow the same flip, and only in the arenas: the camp's own
// tufts are authored against its indigo spec already.
edit('src/env/foliage.js', [
  [
`    // FIX ROUND 2: 0.38, not 0.28. With the floor painted night-first the
    // shade blades are the ones that sit on the majority of the field, and a
    // tuft lit like noon on an indigo floor reads as a decal.
    const cool = cosmetic.chance(0.38);`,
`    // FIX ROUND 2: 0.38 on the night-floor arenas (0.28 elsewhere). With the
    // floor painted night-first the shade blades are the ones that sit on the
    // majority of the field, and a tuft lit like noon on an indigo floor reads
    // as a decal.
    const cool = cosmetic.chance(g.nightBase ? 0.38 : 0.28);`,
  ],
]);
