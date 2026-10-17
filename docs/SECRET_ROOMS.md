# Secret rooms

Content plan 5, slice 3 (v0.5.292). From room 4 on, a fight can hide a
**cracked wall**. A bomb or a heavy skill hit breaks it open, and once the
room is clear the party walks through it into a **hidden chamber**. The
chamber holds a hoard, a relic pick, a pair of tonics, a lore page for the
Journal, or a rare event.

## Where they appear

- Only in campaign runs, which include Endless Descent and the Daily Descent.
  Never in the tutorial, the legacy single-level run or a Boss Rush fight, so
  the nine goldens never see a wall.
- Rooms 4 to 6 of a level, and only plain fights (`kill_all` and `defend`).
  Objective rooms, "?" rooms, champion rooms, vaults, the shop and boss arenas
  never hide one.
- Each such room rolls 75% (`SECRET_RULES.chance`) until the level's one wall
  has shown (`maxPerLevel: 1`). The roll, the wall's spot and what the
  chamber holds all hash the level's frame seed and index and the room
  (`wallRolls`, `wallPref`, `chamberContent` in `src/sim/secrets.js`), so
  they never draw from the run's random stream.

## The wall

- It stands flush with the room's far wall or the upper half of a side wall,
  on the first of six spots whose face is clear of props, hazards, the shrine
  and the spawn points. A slab of the land's own stone with a jagged seam
  that leaks cold light and a draught of dust. It blocks movement and bolts.
- **Breaking it.** It opens to a bomb burst within the bomb's radius plus
  0.9 u, or to a single skill hit of base damage 12 or more
  (`heavyMin`), from a hero a person plays (seat 0 always counts, so the
  autopilot can too). Basic hits, light skills and AI seats only knock dust
  from it, at most every 12 ticks, with a hollow knock.
- It can open only while the fight is live. A wall still shut when the last
  foe falls stays shut, and a toast says so.
- A first-time floor tip ("The cracked wall") explains it the first time one
  shows in a live fight.

## The chamber

- It follows the room's reward page and its relic pick. The party then
  stands in a dark ring of flagstones lit by one shaft of cold light; the
  screen darkens round it. The HUD plate reads **A HIDDEN CHAMBER**.
- What it holds, by weight (`SECRET_RULES.contents`):
  - **Hoard** (30): three Glint piles of 10 taken by walking over them, and
    5 to each ally purse per pile. The doors come once the last pile is
    taken.
  - **Relic** (20): a reliquary (E · Open) opens into a relic pick of its
    own, **THE HIDDEN RELIQUARY**.
  - **Tonics** (20): a cache (E · Open) gives two tonics to empty slots; a
    tonic no slot can hold pays 12 Glint instead.
  - **Lore** (15): a lectern (E · Read) gives 15 Glint and one of the land's
    two lore pages, which the Journal keeps.
  - **Event** (15): one of the land's encounters stands in the dark, played
    as a "?" room's would be. Never the trapped chest, which is a fight.
- After the body opens (1.2 s), the doors come as after any room.

## The Journal and the end card

- The ten lore pages, two per land, sit under **Lore pages** on the Journal's
  Events page (profile `journal.seen.lore`, written on `secret_take`). An
  unread page shows as a dark leaf: "It lies in a hidden chamber in ...".
- The end card's **SECRETS FOUND** row shows walls opened over walls shown,
  once a wall has shown in the run (`summary.secrets`).

## Code map

- Sim: `src/sim/secrets.js` (rules, hashes, pages, state), `src/sim/run.js`
  (`placeWall`, `openWall`, `enterSecret`, `openSecret`, `stepSecret`; the
  `wall_blow` and `tonic_burst` listeners), `src/sim/combat.js` (a blow on a
  wall emits `wall_blow` and does no damage), `src/sim/encounters.js`
  (`armHidden`), `src/sim/autopilot.js` (walks to a wall with a bomb or a
  heavy bolt and opens the chamber).
- Render: `src/render/interactables/secrets.js` (wall, breach, chamber,
  bodies), `src/render/vfx/secretfx.js`; audio `src/audio/secretcues.js`.
- UI: toasts in `src/ui/run/index.js`, the plate in `src/ui/hud/index.js`,
  the tip in `src/ui/tutorial/index.js`, the end card in
  `src/ui/run/endscreens.js`, the Journal in `src/ui/story/journal.js`.
- Probe: `node tools/secret-rooms-probe.mjs`. Debug commands:
  `run.cmd('secretWall', [room, holds])`, `secretOpen`, `secretTake`,
  `secretState`.
