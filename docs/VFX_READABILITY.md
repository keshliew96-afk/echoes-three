# VFX readability: the hero stays visible in a melee

Kesh (2026-10-21): "for some time the light effect too bright, player cannot see
clearly", with a v0.5.329 shot of Uneasy Woodland room 1: a cream-white blob
about 200 px wide over the party, the hero invisible inside it. Shipped in
v0.5.331. Render only: the sim, the goldens and every data table are untouched.

## How it was measured

`tools/vfx-readability-browser.mjs`: the first campaign room with the party on
auto and a pack on top (seed 21), stepped on the virtual clock the way
`tools/vfx-rework.mjs` reels are, 50 shots at 1600x900 over 6.7 s of the fight.
Each shot is measured for its largest connected near-white blob inside the
play area (the HUD bands excluded); a blob over about 3,000 px covers a hero.
The same seed plays the same fight, so builds compare shot for shot.

| Build | Largest blob | Shots over 5,000 px | Shots over 3,000 px | Mean blob |
|---|---|---|---|---|
| v0.5.329 | 18,560 px (44,000 in another run, the whole party inside) | 15 of 50 | 28 of 50 | 4,417 px |
| hearts capped and budgeted only | 16,704 px | 9 of 50 | 19 of 50 | 3,267 px |
| plus the hit flash at 0.4 (v0.5.331) | 7,024 px | 2 of 50 | 10 of 50 | 2,257 px |

Shots: `docs/reference/vfx-readability/` (the worst shot of each row, software
GL at play zoom). The residual bright shots in the last row sit under the top
torch where the pale moth is fought, not on the party.

## What it was

Two things, and the second was the big one.

1. **The template hearts summed without bound.** Every template piece
   (`src/render/vfx/tplkit.js`: beams, blazes, blasts, bolt heads) and every
   class-layer piece with a core (`src/render/vfx/kit.js`: slashes, rings,
   streaks, pillars) carries a hot core, its heart, authored above the bloom
   threshold on purpose (`docs/gauntlet/design-VFX.md` §11). A core goes
   through `exactColor`, which solves the hex through ACES, so Star White
   `#FFF3C4` is 1.23 linear and parchment 1.05; the blast gain 1.3 took the
   template heart to 1.6, 2.4 times the 0.68 threshold. A melee basic that
   kills lands a swing tip, an impact and a kill blast at one point in one tick,
   about 4 linear before the bloom. The crowd dimming (`crowd()`) slowed the
   growth but never bounded the sum. Measured share: about 15% of the blob.
2. **The enemy's own hit flash and kill pop.** `HITFLASH.intensity` 1.0
   (`src/core/constants.js`, §9 juice contract #1) drove a white emissive over
   the whole chibi body for three ticks on every hit and for the 0.26 s
   stretched kill pop. A body at lit albedo plus 1.0 sits far above the
   threshold, so every hit and every kill in a melee bloomed a hero-sized blob
   exactly where the hero stands. Measured share: the rest. At 0.4 the kill
   shots fall 5 to 10 times (f8 6,208 to 768 px; f28 6,928 to 912; f120 16,704
   to 4,368; f172 8,080 to 1,872).

Not the cause: the floor light pools (held under the threshold by `soft()` and
hidden under the bodies), the torches, the emitter cores, Settings ▸ Effects ▸
Reduced (it does not touch blasts or the flash).

## What changed

**Hearts (`src/render/vfx/heart.js`).**
1. A heart is capped at `HEART_MAX` 1.0 linear: the gain is folded into the
   core colour and the colour scaled down to the cap. Every template core at
   every gain the kit uses still clears the threshold on its own (the probe
   checks all 49 pairs), so one piece keeps its hot core and still blooms.
2. The hearts within 2 u share a budget of `HEART_BUDGET` 1.25. A piece landing
   where hearts already glow gets only the share that is left, never under
   `HEART_FLOOR` 0.2. The share scales the shader's mix toward the core
   (`uHeart`), so a late piece's core dims toward its own body colour, never
   toward black: the piece keeps its shape and tone. The first piece at a
   point keeps its whole heart. The two kits share one budget (`signature.js`
   hands each kit the other's `heartLoad`). A melee kill's stack now sums to
   1.92 heart-luminance against 7.76 before. The crowd dimming is unchanged
   and stacks with this.

**The hit flash (`HITFLASH.intensity` 1.0 to 0.4).** Lit albedo plus 0.4 still
reads as a white flash; it just stops blooming. Champions and bosses keep
their own `flashScale`. This changes a look Kesh chose (§9 juice contract #1,
with champions and bosses softened earlier for the same reason), so it is in
its own commit: dropping it leaves the hearts and the first two rows of the
table. An untried middle: keep the three-tick hit flash at 1.0 and soften only
the kill pop.

Not built, an open choice: a hero-readability rule (no heart within 0.8 u of a
party body above the threshold); it would also take the hot core off every
melee kill beside the hero.

## Checks

- `node tools/vfx-readability-probe.mjs` (in `npm test`): the cap on every
  template core at every gain, each still above the threshold; the kill stack
  under 2.0; the wiring in both kits (every heart piece through the cap and
  the budget, every core mix scaled by `uHeart`, no raw gain left, the kits
  sharing one budget).
- `node tools/vfx-readability-browser.mjs` (needs `npm run dev`): the fight
  above, the bars at the top of the file (no blob over 9,000 px, at most 12 of
  50 shots over 3,000 px), the worst and median shots, and the recipes and
  events behind each shot.
- The nine goldens are identical; `npx vite build` is clean.
