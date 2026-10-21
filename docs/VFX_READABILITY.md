# VFX readability: hearts capped and budgeted

Kesh (2026-10-21): "for some time the light effect too bright, player cannot see
clearly", with a v0.5.329 shot of Uneasy Woodland room 1: a cream-white blob
about 200 px wide over the party, the hero invisible inside it. Shipped in
v0.5.331. Render only: the sim, the goldens and every data table are untouched.

## What it was

Not a light pool and not a skill. Every template piece (`src/render/vfx/tplkit.js`:
the beams, blazes, blasts and bolt heads of the three templates in
`docs/gauntlet/design-VFX.md` §11) carries a hot core, its heart: the core
colour times the piece's gain, mixed in over its hottest texels. The core is
authored through `exactColor`, which solves the hex through ACES, so Star White
`#FFF3C4` is already 1.23 linear; times the blast gain 1.3 it was 1.60 linear,
2.4 times the bloom threshold (0.68). One heart alone displayed at 255/247.

A Tank or Swordsman basic at contact range lands a swing-tip blast, an impact
blast and, on a kill, a 1.3 u kill blast at one point in one tick
(`templates.js` bladeSwing, bladeImpact, bladeKill), plus the swing's three
blaze arcs. They add: about 4 linear before the bloom, and UnrealBloom at
strength 1.35 spread that over 150-360 px, which is the hero standing beside
the corpse. The crowd dimming (`crowd()`, each new piece fainter, floor 40%)
slowed the growth but never bounded the sum; the floor light pools are held
under the threshold and sit under the bodies, so they were not the cause; and
Settings ▸ Effects ▸ Reduced does not touch blasts. In a melee fight the hearts
recur every half second, so the party was unreadable for about a third of it.

Measured headlessly (seed 21, room 1, the party on auto with a pack, the
virtual clock, 50 shots at 1600x900; `tools/vfx-readability-browser.mjs`):

| v0.5.329 | |
|---|---|
| Shots with a near-white blob over 5,000 px | 15 of 50 |
| Shots with one over 3,000 px | 28 of 50 |
| Largest blob | about 44,000 px (210 px across), the whole party inside |

## The two rules (`src/render/vfx/heart.js`)

1. **A heart is capped** at `HEART_MAX` 1.0 linear luminance. The gain is folded
   into the core colour and the colour scaled down to the cap. Every template
   core at every gain the kit uses still clears the bloom threshold on its own
   (the probe checks all 49 pairs), so one piece keeps its hot core and still
   blooms, just not at 2.4 times the threshold.
2. **The hearts within 2 u share a budget** of `HEART_BUDGET` 1.25
   heart-luminance. A piece landing where hearts already glow gets only the
   share that is left, never under `HEART_FLOOR` 0.2. The share scales the
   shader's mix toward the core (`uHeart`), so a late piece's core dims toward
   its own body colour, never toward black: the piece keeps its shape and
   tone, it just stops adding white. The first piece at a point always keeps
   its whole heart. The crowd dimming of the whole piece is unchanged and
   stacks with this.

A melee kill's stack (three swing arcs, the tip, the impact and the kill blast)
now sums to 1.92 heart-luminance against 7.76 before.

What it is not: no change to the torches, the emitter cores, the floor light
pools, the identity rings or the enemy hit flash and kill pop (the white pop
on a chibi enemy, §9 juice, is Kesh's standing pick). The hero-readability
rule (no heart within 0.8 u of a party body above the threshold) is not built:
it is an open choice, since it would also take the hot core off every melee
kill beside the hero.

## After

| v0.5.331 | |
|---|---|
| Shots with a near-white blob over 5,000 px | AFTER_5000 of 50 |
| Shots with one over 3,000 px | AFTER_3000 of 50 |
| Largest blob | AFTER_MAX px |

Shots: `docs/reference/vfx-readability/` (the worst shot before and after,
software GL at play zoom).

## Checks

- `node tools/vfx-readability-probe.mjs` (in `npm test`): the cap on every
  template core at every gain, each still above the threshold; the kill stack
  under 2.0; the wiring (every heart piece through `setHeart()`, every core
  mix scaled by `uHeart`, no raw gain left).
- `node tools/vfx-readability-browser.mjs` (needs `npm run dev`): the room-1
  fight above, the bars at the top of the file, the worst and median shots.
- The nine goldens are identical; `npx vite build` is clean.
