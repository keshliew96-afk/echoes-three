# Boss Rush

Content plan 3, slice 12. The seventh Level Select card: the bosses back to
back, with no rooms or doors between them.

## How a rush plays

- **Ten fights in two laps** (eight before Act V opened). Lap one meets one
  boss per land in campaign order (the Wood, the Mill, the Barrow, the Heart,
  the Spire). Lap two goes around
  again and meets each land's other boss on harder numbers.
- **The line is seeded.** Lap one meets the boss the run's seed rolls for each
  land (`bossFor`). Lap two meets the next boss in that land's list
  (`endlessBossIndex` at Endless depths 5 to 8). The setting-out card lists
  all ten before the first fight.
- **Third bosses follow the save.** A locked third boss never appears. Once the
  save has felled a land's other two bosses, its third can come up, as in a
  campaign, the Vein Weaver included (it was Endless-only, lap two, until
  Small fixes 3). The Daily is unchanged.
- **Kit.** The rush sets out with the Level II starter grant plus a first war
  chest.
- **Between fights.** Each boss pays the clear stipend plus a bounty of 40
  Glint for every seat. Then come the war chest (skills, nodes, legendaries
  and ally skill draws, `RUSH_RULES.supply`) and the fight's draft (a Skill
  after odd fights, a node after even ones). Fights 1, 3, 5, 7 and 9 also give a
  relic pick. The level-clear card follows ("FIGHT n OF 10 WON"), and the next
  fight opens at the Peddler (room 7) before walking into the boss room
  (room 8). The last fight ends the run won, with no draft.
- **Numbers.** Lap one plays each land's own boss-room numbers (`difficulty(act,
  6)`, the same as room 8 of that level). Lap two multiplies boss and add HP by
  1.8 and their damage by 1.4 (`RUSH_RULES.lap2`).
- **Co-op.** A co-op lobby plays the rush too (see "Co-op" below). The Daily
  stays single player for its board.
- **Unlock.** The card opens with Endless, once the campaign has been won.
  `?rush=1` opens it for probes, and `?menu=0&rush=1` sets out at once.

## Co-op

Content plan 4, floating slice 14 (v0.5.288). The rush runs on the same host
and guest code as a co-op campaign or Endless descent, so the slice opens the
card and leaves the rules alone.

- **Who sets out.** In a lobby the host's Level Select shows the card open,
  with a "The whole party sets out together" chip. A guest never opens the
  Level Select and a guest's choose is refused, as with every level. The seats
  are the lobby's: each human plays the character they picked, and the host's
  lineup fills the empty seats with AI (the lineup rule of 10-09).
- **What the guest sees.** The setting-out card with the same seeded line and
  its follow line ("The Healer leads on…"), the HUD plate's fight count, the
  card after each fight and the end card all read from the replicated run, so
  they match the host's.
- **Between fights.** Every seat gets the bounty in its own purse. The war
  chest gives the host's seat its main share and every other seat, human or
  AI, the ally share, with the same auto-fill as the Level II starter grant in
  co-op (a human re-sockets on their own build page). Each human takes
  their own draft card on their own page; the relic pick is the host's, as in
  every co-op room. At the Peddler each human shops from their own purse and
  the host's Advance waits on their Done (or the 15 s countdown).
- **Numbers.** The party is four seats in solo and in co-op, so the rush's
  numbers do not change with the number of humans.
- **Records.** Each player records the rush on their own profile (runs, most
  felled, best time, deeds and Embers), as a guest does for a co-op campaign.
  A co-op rush keeps its own best time (`rushCoopBestSec`, with its fight
  count), apart from the solo best: the co-op end card reads CO-OP BEST, the
  Level Select card in a lobby shows "Co-op best", and a solo rush never sets
  or shows it (Kesh's pick at merge time). Most felled is kept apart the same
  way (`rushCoopMostFelled`, small fixes 5): the lobby card's skulls and its
  "Co-op most felled" line read it. The rush count stays shared.
- **Host migration.** If the host's page stalls and the host moves to a
  guest, the rush goes on from the new host's last snapshot (seen once on the
  probe machine's software renderer, where the line and fight were kept).
- **Untried:** a real two-machine game. The probe runs two pages on one
  machine over the relay; WebRTC, a slow link and a second human at a draft
  page with a real hand on the controls are for a real game.

## Records, deeds and Embers

- The profile keeps `rushRuns`, `rushMostFelled`, `rushBestSec` (the fastest
  full rush) and `rushBestFights` (how many fights that best had: an
  eight-fight best from before Act V stays but is never compared with a
  ten-fight time, and the Level Select shows no best until a ten-fight one). A rush never counts as a level clear, never unlocks a level,
  never wins the game and never goes on the campaign score table. Its bosses
  do count as felled: they pay their boss deeds and count toward the third-boss
  unlocks.
- Embers: 15 for each boss felled and 60 for a won rush.
- Deeds: **Once Around** (fell the first five, 30), **Back to Back** (win a
  rush, 60) and **Against the Clock** (win one in under 12 minutes, 80).
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

## Measured before Act V (eight fights; autopilot, `node tools/endless-run.mjs --rush 1 --seeds 1-48 --max-depth 8`)

| fight | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| reached | 48 | 44 | 42 | 27 | 23 | 23 | 21 | 16 |
| won | 44 | 42 | 27 | 23 | 23 | 21 | 16 | 6 |

The Barrow (fight 3) is the wall, as it is in the campaign. Six of 48 runs win
all eight. A full autopilot rush takes about seven to nine minutes. All
numbers are first guesses until the rush has been played.

## Checks

- `node tools/boss-rush-probe.mjs` (38 checks, headless).
- `node tools/boss-rush-browser.mjs [--lang de]` against `npm run dev`.
- `node tools/coop-boss-rush-probe.mjs [--lang de] [--shots dir]` against
  `npm run dev`: a host and a guest page on their own server (port 7930), from
  the lobby card through fight 1, its draft, the Peddler and a fall in fight 2
  (15 checks).
