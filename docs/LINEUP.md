# Party lineup

v0.5.258. Slice 1 of the new-character plan (the Tidecaller,
`/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md`). This slice has no new
class and nothing new on screen. It builds the groundwork for a fifth class:
there are still four seats, and a run's **lineup** says which class holds each one.

## Rules

- Seat 0 is always the Healer: the bell-carrier, the leader bot and the
  story's centre.
- Seats 1 to 3 hold three different classes from `LINEUP_CLASSES`
  (`src/data/lineup.js`; for now Tank, Swordsman and Archer).
- The default lineup is Healer, Tank, Swordsman, Archer, which is exactly
  the old `CLASS_OF_SEAT`. Anything invalid normalises to the default.
- Only a campaign takes a lineup: `startCampaign({ lineup })`, which covers
  Endless and Daily. The legacy single-level run, the `?room=` harness and
  the tutorial are always the default four. A campaign started without a
  lineup goes back to the default.

Since a run that never names a lineup gets the default, it is byte-for-byte
the run it always was. The nine goldens, the replays and every older save
are unchanged.

## Where it lives

- `src/data/lineup.js`: `DEFAULT_LINEUP`, `LINEUP_CLASSES`,
  `normalizeLineup`, and the active lineup with `classOfSeat(i)` and
  `seatOfClass(cls)` for the presentation and network code.
- `src/sim/party.js`: `setLineup(lineup)` owns it. It is called by
  `sim/run.js` `openRun` before the per-run reset. A seat whose class changes
  gets a fresh build system and an empty loadout. Its body takes that
  class's §7 row: `classId`, max HP and full health. Setting the same lineup
  again does nothing (no event, no draw). `party.lineup()` reads it.
- Sim readers use the party's own lineup, not the module-level one:
  - Menace (`sim/world.js`)
  - the Tank's Brace, Aegis, Bulwark and Retaliate
  - the Swordsman's combo memory (`sim/partytech.js`, `ctx.seatOfClass`)
  - the AI shop buys (`sim/run.js`)

  Class relics (`sim/relics.js`) read the body's `classId`.
- Saves: every saved party seat already names its `classId`.
  `party.loadState` takes the lineup from it, and a save from before this
  version reads as the default. The save reconciler (`save/content.js`)
  checks each seat against its saved class.
- Network guests mirror the lineup from the replicated ally bodies
  (`net/replica.js` `syncLineupFromBodies`) and from the replicated party
  state. The own-seat predictors (`net/reconcile.js`, `net/predict.js`)
  re-read the seat's class before each use.
- Presentation: the command bar portraits (`ui/hud/commandbar.js`) and the
  overhead HP bars (`render/hpbars.js`) re-dress a seat when its class
  changes. Seat labels and critters (`net/seats.js` `seatLabel`,
  `seatCritter`, `seatClass`), the lobby, the draft, the shop, the socket
  screen, the party strip, the end cards and the camp all go through
  `classOfSeat`.
- Class select (`app/playclass.js`): the chosen class plays the seat it
  holds in the run's lineup. A class that stayed at camp falls back to the
  Healer's seat.

## Slice 2 (v0.5.262, docs/TIDECALLER.md): who joins the team

- `LINEUP_CLASSES` now holds the Tidecaller too. Four seats, five classes,
  and more to come, so the player chooses who JOINS rather than who stays.
- Solo: the `gameplay.team` setting (up to three of `LINEUP_CLASSES`) is
  made on the class picker's "Who joins the team?" view or from the camp's
  Team chip. `lineupFromSettings` (`app/playclass.js`) turns it into a
  lineup with `plannedLineup` (`data/lineup.js`): the Healer always joins on
  seat 0, the class you play always joins (in place of the last pick when
  the team is full), a short team is filled from today's party, and the
  joiners sit in `LINEUP_CLASSES` order. An unchosen team is the default
  four, so the goldens do not move.
- Solo in camp, the camp (`scenes/camp.js` `syncCampLineup`) sends the
  `campLineup` command so the rigs at the fire match the plan. Whoever stays
  behind idles at their own camp spot. The command is refused during a run.
- Co-op (`server/lobby.mjs`, `ui/menu/lobby.js`): the room carries a lineup.
  Each player picks a character from the whole roster (`select_class`): one
  in the team is its seat; one that is not takes an AI seat's place (their
  own seat first). Once every guest is ready, the host picks who joins as AI
  for the empty seats (`set_team`); every human keeps their character and
  follows it to its seat. The host's camp and run take the room's lineup;
  guests mirror the bodies as before. The team is fixed once the game starts.

## Checks

- `node tools/lineup-probe.mjs` (headless, 33 checks):
  - the normalising rules
  - the default seats
  - a shuffled lineup (Healer, Archer, Tank, Swordsman): each seat's class,
    body, max HP, draft pool, AI casts and basic attacks, the refusal of a
    foreign skill, and Menace following the Tank to seat 2
  - only campaigns taking a lineup
  - a mid-fight save of the shuffled party continuing bit-identically in a
    fresh world
- `node tools/lineup-browser.mjs` (needs Vite on 5199): the played Tank
  moves to its lineup seat, the bodies, portraits and HP bars follow, and a
  plain campaign afterwards is the default four.
- `node tools/team-lobbyunit.mjs` (unit, no I/O): the co-op character and
  team picks.
- `node tools/gntM2-goldens.mjs` stays 9/9.
