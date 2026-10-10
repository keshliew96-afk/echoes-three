# New layouts (plan 3 slice 8)

Eight more combat rooms, two per act, taking the layout pool from 20 to 28.
Each act now rolls from seven layouts. One room of each pair is the act's
**arena**.

| Id | Act | Name | Hazards | Interactables | Notes |
|---|---|---|---|---|---|
| 21 | I | Thornwood Ring | 4 brambles in the corners, 4 puffcaps (from room 2) | dewfont, 2 kegs | **Arena.** Ring track round an open glade, ring of old stones, monolith on the north wall |
| 22 | I | Toadstool Dell | 6 puffcaps in a ring round the middle (bursts staggered), 2 flank brambles | 2 barricades, dewfont, keg | Darker hollow green |
| 23 | II | Millrace Basin | race along the south wall, 2 wet slick patches, 2 puffcaps | sluice, dewfont, keg | **Arena.** Drained basin, pond in the north-east corner |
| 24 | II | Tailrace Steps | 2 races from opposite walls flowing in opposite ways, 2 wet slick patches | 2 sluices (one per race), 2 barricades, dewfont, keg | Races spill into pools mid-room |
| 25 | III | Ash Amphitheatre | rockfall, 4 gravefire arcs in the corners a quarter cycle apart | 2 bells, dewfont, 2 kegs | **Arena.** Veined stones on the north wall behind the champion |
| 26 | III | Cairn Field | rockfall, gravefire line across the north, 2 frost patches | 8 cairn barricades, bell, dewfont, keg | Cover-heavy |
| 27 | IV | Hollow Nave | rockfall, vein vents up both side walls, 2 glass floors | dewfont, 2 kegs | **Arena.** Heart node on the north wall, geodes in the south corners |
| 28 | IV | Crystal Thicket | rockfall, vein line across the south, 3 glass floors | 6 crystal barricades in two chevrons, dewfont, 2 kegs | Crystal spires, shard-flecked floor |

## The arena

The playfield is the same 24 x 16 for every room, so an arena is "large" by
being open: no barricades, every hazard pushed to the walls or corners, and a
spawn ring spread to the edges (`spawns` in `src/data/layouts.js`). The middle,
where the Hold sigil ring and the champion's mark sit, is clear.

Champion rooms and Hold rooms stand in the act's arena (`arena: true`,
`arenaOf()` in `src/data/layouts.js`), unless the combat room just before
was already the arena (the room table never repeats a layout twice in a row).
The arena is also in the ordinary roll for every other combat room.
`sim/run.js rollLayout` still makes its draw before the override, so the RNG
stream keeps its length.

## Golden safety

The new ids are in the campaign `layouts` tables only (`src/data/levels.js`),
never in `legacyLayouts`, so the legacy single-level run and the nine golden
traces never roll them. Endless and the Daily use the campaign tables, so they
see the new rooms.

## Files

- `src/data/layouts.js`: placements, spawn rings, the `arena` flag, `arenaOf()`
- `src/data/levels.js`: the campaign tables
- `src/sim/run.js`: `rollLayout` prefers the arena for champion and Hold rooms
- `src/env/biomes/{wood,mill,barrow,heart}.js`: the dressings
- `src/i18n/`: the eight names in all ten languages

## Checks

- `node tools/gntM4b-layoutcheck.mjs`: placement audit (all 28 layouts)
- `node tools/slice2-layouts.mjs --ids 21,22,23,24,25,26,27,28 --seeds 24`:
  per layout in a real campaign room: spawn ring, four seats move, room clears,
  doors follow, reachability. A party wipe in the probed room tries the next
  seed (counted as `wipes`).
- `node tools/new-layouts-probe.mjs [--seeds 16]`: registration, nine
  languages, one arena per act, every champion and Hold room in the arena,
  every new layout rolled.
- `tools/slice2-layouts-shots.mjs --ids 21,...,28 --out <dir>`: one screenshot
  per layout against `npm run dev`.
