# The Endless Descent

The mode that keeps the game playable after Act III. Roadmap item 4, "something to play for after Act III".

## What it is

An endless descent is a campaign from Level 1 that does not stop at the Hollow Heart. Clearing Depth 4 wins the campaign (the profile records it) and the road turns back into the Hollow Wood as Depth 5. The four biomes cycle (Wood, Mill, Barrow, Heart, Wood, ...; three until Act IV, docs/ACT_IV.md) and every depth past the campaign is harder, until the party falls. The run then ends on **THE DESCENT ENDS** card with the depth reached and the profile's depth record.

- **Entry.** The Level Select has a card after the levels, *The Endless Descent*. It opens once the game is won (any campaign completed, or the Ashen Barrow cleared once). `?menu=0&endless=1` boots straight into one at the portal and unlocks the card (harness); `__echoes.cmd('startCampaign', { endless: true })` starts one from a probe.
- **Depths 1-4 are the campaign.** Same difficulty numbers, rosters, bosses, relics, shop and carry rules, number for number. A plain campaign is untouched: its record, view and events carry no endless key, the 9 goldens match, and plain campaigns over seeds 1-16 replay bit-identically against gauntlet.
- **Past Depth 4** (`src/data/endless.js`):
  - every depth is built on the Act IV numbers (`difficulty(4, room)`), so Depth 5's woodland is never easier than the Heart just left;
  - each depth past 4 multiplies enemy, boss and add HP by `1 + 0.21 k`, damage by `1 + 0.12 k` (0.18 / 0.10 before the balance pass, docs/BALANCE_PASS.md), wave budget by `1 + 0.06 k`, and adds `0.03 k` elite chance (capped at 55 %), with `k = depth - 5`;
  - rosters mix: the home biome's roster plus every other act's creatures at 35 % of their own weight, one room later than at home;
  - the boss alternates: each cycle meets the act's other boss from the one the seed met before, so both bosses of every act appear. An Act I or Act II boss met on the Act IV numbers hits at 70 % / 90 % of them (`BOSS_HOME_DMG`), because its kit was tuned for its own act's multiplier.
- **Determinism.** Everything is a pure function of (depth, room, seed): no extra RNG draw and nothing saved beyond the campaign record (`campaign.endless`, `campaign.won`). Saves and network snapshots carry it with the run.

## Save data (for the cross-run unlocks work)

Profile `records` gain three keys:

| key | meaning |
| --- | --- |
| `gameWon` | true once any campaign is completed, an endless descent's Depth 4 included (also true for an older profile with `campaignsCompleted > 0`) |
| `endlessRuns` | endless descents finished (fallen or abandoned) |
| `endlessBestDepth` | the deepest depth any descent reached |

An endless high-score entry carries `depth`. The run summary's `campaign` carries `endless`, `depth`, `depthsCleared` and `won`, and `recordRun` returns `endless: { depth, prevBestDepth, newDepthRecord }`. The sim emits `campaign_won` when a descent clears Depth 4; `level_clear`, `level_transit` and `level_start` carry `depth` on a descent. Levels played past Depth 4 score at act multiplier 2.5 + 0.5 per depth beyond 4 and stay out of the per-level records (deepest room, fastest clear).

## Measured before Act IV (headless autopilot, seeds 1-16, standard challenge)

This table is the three-biome curve from PR #10. Act IV moved every depth past 3 one place down the cycle; it has not been re-measured.

`node tools/endless-run.mjs --seeds 1-16 --max-depth 15`

| depth | biome | reached | cleared |
| --- | --- | --- | --- |
| 1 | Wood | 16 | 16 |
| 2 | Mill | 16 | 15 |
| 3 | Barrow | 15 | 9 |
| 4 | Wood | 9 | 9 |
| 5 | Mill | 9 | 7 |
| 6 | Barrow | 7 | 5 |
| 7 | Wood | 5 | 5 |
| 8 | Mill | 5 | 3 |
| 9 | Barrow | 3 | 1 |
| 10 | Wood | 1 | 1 |
| 11 | Mill | 1 | 0 |

Depths 1-3 match the plain campaign exactly (gauntlet: 16, 15, 9 of 16). Median depth cleared: 4; deepest: 10; no stuck rooms. The tuning went through three passes: the first (Depth 4 already one step up, Act I bosses on full Act III damage) dropped from 9 runs to 4 at Depth 4, mostly at the Stag and the Thornmother; the second (Depth 4 = the Act III numbers, home-act boss damage) halved at Depth 6; the third (smaller steps) is the curve above.

Share of party downs by seat (Healer / Tank / Swordsman / Archer): depths 1-3 6 / 14 / 46 / 34 %, depths 4+ 4 / 11 / 35 / 50 %. The Archer, the lightest body, takes a larger share as damage rises.

**Balance pass (v0.5.224, docs/BALANCE_PASS.md).** The Archer's share came from standing still under Mire Toad globs. The ranged AI seat now steps out of glob rings and backs off close enemies, and the depth step went to HP 0.21 / damage 0.12 to keep the curve. Seeds 1-32: depths 4+ share 6 / 12 / 49 / 33 % (was 4 / 9 / 38 / 49 %), median depths cleared 6 (was 6). The table above is the PR #10 curve.

## Verification

- `node tools/endless-probe.mjs` (headless, 20 checks): data rules, plain campaign untouched, a real descent into Depth 4 (non-final Barrow clear, `campaign_won`, card and view depth, room numbers, the alternate boss), same-seed replay hash, a Depth-4 save continuing bit-identically in a fresh world, profile records.
- `node tools/endless-browser.mjs` against `npm run dev` (captures `captures/endless-1..4-*.png`): the Level Select card, the Depth 3 -> 4 card, the depth on the HUD, the end card and the profile record.
- `node tools/endless-run.mjs --campaign 1 --seeds 1-16 [--root <gauntlet checkout>]`: plain campaigns, compared by event hash against gauntlet (16 of 16 identical).
