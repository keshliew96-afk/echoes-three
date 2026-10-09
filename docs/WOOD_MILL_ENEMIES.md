# New enemies: the Wood and the Mill

Content plan 3, slice 3. Two new enemies join the Hollow Wood (Level I) and two
join the Sunken Mill (Level II). Each has its own attack, a warning shape
(the Ember telegraph: a lane, ring or cone), its own rig, VFX recipe and sound.

## Where they appear

Campaign only: the campaign, Endless Descent and Daily Descent (the run's
`poolsGrown()` gate in `src/sim/run.js`). The legacy run and the tutorial never
meet them, so the nine goldens stay byte-identical.

- `src/data/levels.js`: Level I and Level II carry `campaignRoster` (weights)
  and `campaignIntroduce` (first room, 3 for all four). `campaignLevel(lv)`
  merges them into the level's `roster` and `introduce`; the run's
  `roomLevel()` uses it when the pools are grown, and `endlessLevel()` uses it
  for the home land and its guests.
- The Journal lists them by their campaign lands (`landsOf` in
  `src/data/journal.js`): 37 bestiary entries.

## The four

| Kind | Name | Land | HP | Attack | Warning | Hit |
|---|---|---|---|---|---|---|
| `owl` | Shriek Owl | Wood | 18 | Hovers 3.2 to 5.2 u away, hangs still, shrieks | cone r 3.8, 30° half-angle, 54 ticks | 8 and slow 35% for 1.5 s |
| `lasher` | Vine Lasher | Wood | 30 | Rooted pod, whip-vine lash, then yanks the struck 1.8 u toward itself (stops 0.9 u short) | lane 5.4 × 0.7, 48 ticks | 9 |
| `leech` | Mire Leech | Mill | 22 | Leaps at 11 u/s and latches on: bite 5, then drains 3 every 0.5 s and heals itself, host slowed 25%, up to 2.5 s | lane 3.2 × 0.6, 42 ticks | 5, then 3 per drain |
| `miller` | Drowned Miller | Mill | 48 | Close: whirls his millstone. At 3 to 6.5 u: throws a flour sack that leaves a slowing paste slick | ring r 2.2 round himself, 60 ticks; the sack uses the glob ring (r 1.1) | 13 sweep; 10 sack, slick 1.2 u for 5 s, slow 40% |

The leech lets go when its host dodges (i-frames), when it is hit by anyone,
when it is stunned, when its host is lost, or when the drain runs out; it
then flops for 0.75 s, open to hits.

Threat (`src/data/difficulty.js`): owl 1.4, lasher 1.4, leech 1.3, miller 2.4.
Every telegraph goes through the §11 governor (two player-targeted at once,
starts 72 ticks apart).

Affix exclusions (`src/sim/affixes.js`): Frozen and Vampiric skip the leech
(it already slows and heals); Blinking skips the leech and the rooted lasher.
None of the four summons or splits, so the Splitting and Broodling caps are
untouched.

## Files

- Sim: `src/sim/enemies/owl.js`, `lasher.js`, `leech.js`, `miller.js`;
  `src/sim/enemies.js` (archetypes, the `sack` glob flag).
- Rigs: `src/render/enemies/woodmill.js` (crown heights in `archetypes.js`);
  the sack in flight and the flour slick in `extras.js`.
- VFX: `src/render/vfx/signature.js` (recipes `owl_shriek`, `lasher_lash`,
  `lasher_yank`, `leech_leap`, `leech_latch`, `leech_drain`, `leech_shed`,
  `leech_miss`, `miller_sweep`, `miller_toss`, `miller_sack_land` and the four
  deaths); `src/data/vfx.js` rows; `VFX_MATTER` owlfeather, leech, flour.
- Sound: `src/audio/woodmillcues.js` (`wm_*`), calibrated with
  `node tools/smallfixes2-cuecal.mjs --only woodmillcues --write`.
- Lab: `?vfxlab=1` rows "Wood, new" and "Mill, new".
- Text: the Journal rows in `src/data/journal.js`, in all ten languages.

## Probes

- `node tools/woodmill-probe.mjs`: headless sim checks (wiring, the gate,
  each attack, the leech's sheds, the governor, campaign spawns, save and
  snapshot).
- `node tools/woodmill-browser.mjs [--lang de]`: the real game against
  `npm run dev`; screenshots of each tell and beat and the Journal pages.
- `node tools/gntM2-goldens.mjs`: the nine goldens, unchanged.
