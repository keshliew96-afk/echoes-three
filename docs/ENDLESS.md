# The Endless Descent

The mode that keeps the game playable after Act III. Roadmap item 4, "something to play for after Act III".

## What it is

An endless descent is a campaign from Level 1 that does not stop at the Hollow Heart. Clearing Depth 4 wins the campaign (the profile records it) and the road turns back into the Hollow Wood as Depth 5. The four biomes cycle (Wood, Mill, Barrow, Heart, Wood, ...; three until Act IV, docs/ACT_IV.md) and every depth past the campaign is harder, until the party falls. The run then ends on **THE DESCENT ENDS** card with the depth reached and the profile's depth record.

- **Entry.** The Level Select has a card after the levels, *The Endless Descent*. It opens once the game is won (any campaign completed, or the Ashen Barrow cleared once). `?menu=0&endless=1` boots straight into one at the portal and unlocks the card (harness); `__echoes.cmd('startCampaign', { endless: true })` starts one from a probe.
- **Depths 1-4 are the campaign.** Same difficulty numbers, rosters, bosses, relics, shop and carry rules, number for number; elites carry the campaign's power count too, and two powers from Depth 5 on (docs/ELITE_AFFIXES.md). A plain campaign is untouched: its record, view and events carry no endless key, the 9 goldens match, and plain campaigns over seeds 1-16 replay bit-identically against gauntlet.
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

## Measured with four lands (v0.5.246, headless autopilot, seeds 1-32, standard challenge)

Small fixes 2 re-measured the curve on gauntlet 0070586 (Act IV, elite affixes, class skills and the third relic batch all in). The rules in `src/data/endless.js` were already re-keyed for four lands when Act IV landed: `CYCLE` is read from `ENDLESS_ACTS` (4), `k = depth - 5`, `BOSS_HOME_DMG` covers acts 1 to 4, mixing starts at Depth 5. No constant changed.

`node tools/endless-run.mjs --seeds 1-32 --max-depth 15 --jobs 3` and, for the plain campaign beside it, `node tools/endless-run.mjs --campaign 1 --seeds 1-32 --jobs 4`:

| depth | biome | reached | cleared | plain campaign (reached / cleared) |
| --- | --- | --- | --- | --- |
| 1 | Wood | 32 | 18 | 32 / 24 |
| 2 | Mill | 18 | 15 | 24 / 20 |
| 3 | Barrow | 15 | 9 | 20 / 13 |
| 4 | Heart | 9 | 4 | 13 / 2 |
| 5 | Wood | 4 | 4 | |
| 6 | Mill | 4 | 3 | |
| 7 | Barrow | 3 | 3 | |
| 8 | Heart | 3 | 2 | |
| 9 | Wood | 2 | 2 | |
| 10 | Mill | 2 | 1 | |
| 11 | Barrow | 1 | 1 | |
| 12 | Heart | 1 | 0 | |

Median depths cleared: 1 (plain campaign: 2 levels); deepest: 11 (seed 32). One run (seed 1) was cut as stuck at Depth 2: the Millwheel fight ran past the runner's 180 s limit with 43 downs and revives, an autopilot stall, not a soft lock.

This curve was measured while elite affixes still gave elites **two** powers at every Endless depth, where the campaign gives one on Level I and in Level II's first three rooms; that is why Depth 1 cleared 18 of 32 against the campaign's 24. Kesh chose to start the second power at Depth 5, so Depths 1-4 now roll the campaign's count and should track the plain campaign column; past Depth 4 nothing changed.

The autopilot is a much weaker player than it was when PR #10 measured 16 of 16 through Level I: elite affixes, the Act IV numbers and the class skills all landed since, and it plays none of them well. Read the table as the shape of the curve (it falls a step at a time, with no cliff past the campaign), not as how far a person gets.

Share of party downs by seat (Healer / Tank / Swordsman / Archer): depths 1-4 9 / 24 / 48 / 18 %, Depth 5 on 6 / 21 / 39 / 33 % (66 downs over 4 runs), Depth 4 on 8 / 22 / 37 / 33 % (129 downs over 9 runs).

**Balance pass (v0.5.224, docs/BALANCE_PASS.md).** The Archer's share came from standing still under Mire Toad globs. The ranged AI seat now steps out of glob rings and backs off close enemies, and the depth step went to HP 0.21 / damage 0.12 to keep the curve. Seeds 1-32 then: depths 4+ share 6 / 12 / 49 / 33 % (was 4 / 9 / 38 / 49 %), median depths cleared 6. The four-land measurement above keeps the Archer at 33 % past Depth 3, so the AI was left as it is.

### The three-land curve (PR #10, seeds 1-16, before Act IV)

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

## Verification

- `node tools/endless-probe.mjs` (headless, 20 checks): data rules, plain campaign untouched, a real descent into Depth 4 (non-final Barrow clear, `campaign_won`, card and view depth, room numbers, the alternate boss), same-seed replay hash, a Depth-4 save continuing bit-identically in a fresh world, profile records.
- `node tools/endless-browser.mjs` against `npm run dev` (captures `captures/endless-1..4-*.png`): the Level Select card, the Depth 3 -> 4 card, the depth on the HUD, the end card and the profile record.
- `node tools/endless-run.mjs --campaign 1 --seeds 1-16 [--root <gauntlet checkout>]`: plain campaigns (the runner prints down shares for depths 1-3, 4+, 1-4 and 5+), compared by event hash against gauntlet (16 of 16 identical).
