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
The same seed plays the same sim fight whatever tick the freeze lands on (the
events and enemy counts match shot for shot across every run), so builds
compare shot for shot; the render side varies a little from run to run, which
is why the bars carry a margin over the measurement.

| Build | Largest blob | Shots over 5,000 px | Shots over 3,000 px | Mean blob |
|---|---|---|---|---|
| v0.5.329 | 18,560 px (44,320 in another run, the whole party inside) | 15 of 50 | 28 of 50 | 4,417 px |
| hearts capped and budgeted only | 16,704 px | 9 of 50 | 19 of 50 | 3,267 px |
| plus the plain enemy's flash at 0.4 (v0.5.331) | 7,024 px | 2 of 50 | 10 of 50 | 2,257 px |

Shots in `docs/reference/vfx-readability/`: `before-v0.5.329-worst.jpg` (the
18,560 px shot of the before row), `before-v0.5.329-other-run-44k.jpg` (the
44,320 px shot of the other run, the whole party inside),
`hearts-only-v0.5.331-worst.jpg` and `after-v0.5.331-worst.jpg`, software GL at
play zoom. Of the last row's ten shots over 3,000 px, five sit under the top
torch where the pale moth is fought (y 142-180) and five in the melee band
beside the heroes (the largest of those 5,024 px, against 16,704 before).

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
   kills lands the swing arcs, the class slash, a swing tip, an impact and a
   kill blast and the death ring at one point in one tick, about 8.8
   heart-luminance before the bloom. The crowd dimming (`crowd()`) slowed the
   growth but never bounded the sum. Measured share: the hearts alone took 10%
   off the worst blob and 26% off the mean.
2. **The enemy's own hit flash and kill pop.** `HITFLASH.intensity` 1.0
   (`src/core/constants.js`, §9 juice contract #1) drove a white emissive over
   the whole chibi body for three ticks on every hit and for the 0.26 s
   stretched kill pop. A body at lit albedo plus 1.0 sits far above the
   threshold, so every hit and every kill in a melee bloomed a hero-sized blob
   exactly where the hero stands. At 0.4 the worst kill shots fall 4 to 9
   times (f8 6,208 to 768 px; f120 16,704 to 4,368; f172 8,080 to 1,872) and
   the quieter ones 1 to 2 times.

Not the cause: the floor light pools (held under the threshold by `soft()` and
hidden under the bodies), the torches, the emitter cores, Settings ▸ Effects ▸
Reduced (it does not touch blasts or the flash).

## What changed

**Hearts (`src/render/vfx/heart.js`).**
1. A heart is capped at `HEART_MAX` 1.0 linear: the gain is folded into the
   core colour and the colour scaled down to the cap. Every template and foe
   core at every gain the kit uses still clears the threshold on its own (the
   probe checks all 49 pairs), so one piece keeps its hot core and still
   blooms.
2. The hearts within 2 u share a budget of `HEART_BUDGET` 1.25. A piece landing
   where hearts already glow gets only the share that is left, never under
   `HEART_FLOOR` 0.2. The share scales the shader's mix toward the core
   (`uHeart`), so a late piece's core dims toward its own body colour, never
   toward black: the piece keeps its shape and tone. The first piece at a
   point keeps its whole heart. A piece that moves (a bolt head, a held trail,
   a travelling streak) takes its share again every `HEART_REFRESH` 0.5 u, so
   a bolt leaves the release blast's shadow within a tenth of a second; a
   delayed piece takes its share when it shows. Pillars have no core to share,
   so they are capped and counted but keep their opacity. The two kits share
   one budget (`signature.js` hands each kit the other's `heartLoad`). The kill
   stack above now sums to 2.2 heart-luminance against 8.8. The crowd dimming
   is unchanged and stacks with this.

**The plain enemy's flash (`HITFLASH.plain` 0.4).** A plain enemy, one without a
`flashScale`, lights at 0.4 on a hit and on its kill pop (lit albedo plus 0.4
reads as a white flash under the Hollow Wood's light; it stops blooming). The
base `HITFLASH.intensity` stays 1.0, so the tuned scales are untouched:
champions 0.4, the Gale Herald 0.25, bosses 0.28; and the waystone, the
objective nodes, the escort pillars, the interactables and the training
dummies keep 1.0. This changes a look Kesh chose (§9 juice contract #1), so it
is in its own commit: dropping it leaves the hearts and the first two rows of
the table, and the browser probe reads the level and switches to the hearts-only
bars on its own. An untried middle: keep the three-tick hit flash at 1.0 and
soften only the kill pop.

Not built, an open choice: a hero-readability rule (no heart within 0.8 u of a
party body above the threshold); it would also take the hot core off every
melee kill beside the hero.

## Checks

- `node tools/vfx-readability-probe.mjs` (in `npm test`): the cap on every
  template and foe core at every gain, each still above the threshold; the
  authored kill stack under 2.3; the wiring in both kits (every heart piece
  through the cap and the budget, every core mix scaled by `uHeart`, the
  share written to the shader, a moving piece taking it again, a delayed one
  when it shows, no raw gain left, the kits sharing one budget); the plain
  flash under the threshold with the base unchanged.
- `node tools/vfx-readability-browser.mjs` (needs `npm run dev`): the fight
  above, the bars by the flash level (at 0.4: no blob over 10,000 px, at most
  14 of 50 shots over 3,000 px; at 1.0: 20,000 and 24), the worst and median
  shots, and the recipes and events behind each shot.
- The nine goldens are identical; `npx vite build` is clean.
