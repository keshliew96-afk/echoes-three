# Boss Rush

Content plan 3, slice 12. The seventh Level Select card: the bosses back to
back, with no rooms or doors between them.

## How a rush plays

- **Eight fights in two laps.** Lap one meets one boss per land in campaign
  order (the Wood, the Mill, the Barrow, the Heart). Lap two goes around
  again and meets each land's other boss on harder numbers.
- **The line is seeded.** Lap one meets the boss the run's seed rolls for each
  land (`bossFor`). Lap two meets the next boss in that land's list
  (`endlessBossIndex` at Endless depths 5 to 8). The setting-out card lists
  all eight before the first fight.
- **Third bosses follow the save.** A locked third boss never appears. Once the
  save has felled a land's other two bosses, its third can come up, as in a
  campaign. The Vein Weaver is Endless-only, so it appears only on lap two,
  and only once the save has opened it. The Daily is unchanged.
- **Kit.** The rush sets out with the Level II starter grant plus a first war
  chest.
- **Between fights.** Each boss pays the clear stipend plus a bounty of 40
  Glint for every seat. Then come the war chest (skills, nodes, legendaries
  and ally skill draws, `RUSH_RULES.supply`) and the fight's draft (a Skill
  after odd fights, a node after even ones). Fights 1, 3, 5 and 7 also give a
  relic pick. The level-clear card follows ("FIGHT n OF 8 WON"), and the next
  fight opens at the Peddler (room 7) before walking into the boss room
  (room 8). The last fight ends the run won, with no draft.
- **Numbers.** Lap one plays each land's own boss-room numbers (`difficulty(act,
  6)`, the same as room 8 of that level). Lap two multiplies boss and add HP by
  1.8 and their damage by 1.4 (`RUSH_RULES.lap2`).
- **Single player only,** like the Daily, until co-op has been tried. The card
  is locked in a network session.
- **Unlock.** The card opens with Endless, once the campaign has been won.
  `?rush=1` opens it for probes, and `?menu=0&rush=1` sets out at once.

## Records, deeds and Embers

- The profile keeps `rushRuns`, `rushMostFelled` and `rushBestSec` (the fastest
  full rush). A rush never counts as a level clear, never unlocks a level,
  never wins the game and never goes on the campaign score table. Its bosses
  do count as felled: they pay their boss deeds and count toward the third-boss
  unlocks.
- Embers: 15 for each boss felled and 60 for a won rush.
- Deeds: **Once Around** (fell the first four, 30), **Back to Back** (win a
  rush, 60) and **Against the Clock** (win one in under 10 minutes, 80).
- There is no server board for the rush. Its time stays in the profile.

## Code

- `src/data/rush.js`: the rules, the line, the numbers, the war chest and the
  unlock rule.
- `src/sim/run.js`: `startCampaign({ rush: true })`; `campaign.rush = { seed,
  line, fights }`; `rushCleared` and `applyRushSupply`; the `rush_felled` and
  `rush_supply` events; the `rushJump` and `rushRules` commands.
- UI: the card in `src/ui/run/levels.js`, the HUD plate, the transit card and
  the end card. Camp entry is in `src/scenes/camp.js`, and the records are in
  `src/save/profile.js`. The deeds and Embers are in `src/data/unlocks.js`.
- The goldens never start a rush, so the nine traces are unchanged.

## Measured (autopilot, `node tools/endless-run.mjs --rush 1 --seeds 1-48 --max-depth 8`)

| fight | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| reached | 48 | 44 | 42 | 27 | 23 | 23 | 21 | 16 |
| won | 44 | 42 | 27 | 23 | 23 | 21 | 16 | 6 |

The Barrow (fight 3) is the wall, as it is in the campaign. Six of 48 runs win
all eight. A full autopilot rush takes about seven to nine minutes. All
numbers are first guesses until the rush has been played.

## Checks

- `node tools/boss-rush-probe.mjs` (37 checks, headless).
- `node tools/boss-rush-browser.mjs [--lang de]` against `npm run dev`.
