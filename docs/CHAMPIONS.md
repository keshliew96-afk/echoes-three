# Champion rooms

Content plan 3, slice 1 (v0.5.254). Every level has one named champion, a
mini-boss behind a **crown door** (♛) on the path screen before room 4 or
room 5. Beating it opens a relic chest with a greater pick.

## Where they appear

- Only in campaign runs, which include Endless Descent and the Daily Descent.
  Never in the tutorial or the legacy single-level run, so the nine goldens
  never meet one.
- Each level has exactly one crown door. It sits on the path screen that leads
  into room 4 or room 5. A hash of the level's frame seed and index
  (`crownFor` in `src/sim/champions.js`) picks the screen and the preferred
  side. It never draws from the run's random stream, so every other roll stays
  the same.
- The crown door never takes the cursed side. If the other door holds a "?"
  event, the crown goes opposite it, so a screen can show a crown door and an
  event door together. If the other side is cursed and the preferred side
  holds the event, the crown replaces the event, so the level still gets its
  champion.
- The door keeps its reward glyph: the room's skill or node draft still
  follows. The other door keeps its own room.
- Endless gives each depth its land's champion. The Daily uses the same rules
  on its seed.

## The champions

There is one champion per act (land). Each has two telegraphed moves, which
alternate. Every move goes through the §11 governor: at most two
player-targeted telegraphs at once, with starts at least 72 ticks apart. A
move the governor holds back for 210 ticks goes anyway.

| Act | Champion | Move 1 | Move 2 |
|---|---|---|---|
| I, the Hollow Wood | The Briar Knight | **Bramble Charge**: a lane at the farthest hero within 2.2–8 u, 60 ticks. He then runs it at 9 u/s and strikes each body once for 16. | **Thorn Ring**: a ring of r 2.8 for 72 ticks, 14 damage. It leaves a thorn thicket (slow 0.35, 5 s). |
| II, the Sunken Mill | The Sluice Warden | **Floodgate**: a cone of r 3.4 and 42° for 66 ticks, 18 damage. | **Undertow**: a ring of r 1.9 at a hero's feet for 78 ticks, 12 damage. It leaves slick water (6 s). |
| III, the Ashen Barrow | The Bone Reeve | **Reaping Sweep**: a wide cone of r 2.7 and 75° for 54 ticks, 16 damage. | **Grave Lance**: an 8 × 1.1 lane for 66 ticks, 14 damage. |
| IV, the Hollow Heart | The Hollow Choir | **Shard Hymn**: a narrow cone of r 6 and 28° for 60 ticks, then five crystal shards at 9 each. | **Discord**: a ring of r 3.2 for 72 ticks, 15 damage. It keeps its distance. |

- **HP**: 560 × the room's HP multiplier. It gets no elite bump and no
  affixes.
- **Entrance**: it stands for 96 ticks before its first move.
- **Rage**: once, below 50% HP. Its cooldowns drop to 70% and it moves 15%
  faster.
- **Room**: two light waves of the act's roster at 65% of a kill_all wave's
  budget. The champion leads the first wave. The room clears when the
  champion and both waves are down.
- **Not a boss**: no phase cards, no adds, no music change. Its sting plays
  over the act's track.

These numbers live in `CHAMPION_RULES` (`src/sim/champions.js`) and in the
kits (`src/sim/enemies/champions.js`). They were tuned on the autopilot bench
at Level I. With these numbers the champion rooms were won 8/8 against 5/8
for kill_all rooms, and Level II matched kill_all. At Levels III and IV the
autopilot loses kill_all rooms too, so the numbers there are first guesses
until someone plays them.

## The chest

- The champion falls where it stood. A chest rises there (`champion_fall`).
- Clearing the room opens the chest (`champion_chest`). After the room's
  draft, it pays a **greater relic pick**: rare or legendary, titled "The
  Champion's Chest" (`relics.owe(room, 'champion')`).
- No new currency.

## Keys and vaults (the next slice)

The key drop should hang off `champion_fall {id, champion, x, z}`, where `x`
and `z` are the chest spot. Nothing in this slice drops a key.

## What the player sees and hears

- **Doors**: a gold crown door with a breathing crown glyph. A gold note names
  the champion and the chest. A first-time tip ("The crown door") appears.
- **HUD**: the champion's name over a Pale Gold HP bar. Below half health the
  bar reads "· ENRAGED" and turns ember. After it falls, the bar shows
  "· FELLED" and how many enemies are left. The location line reads "Fell the
  champion".
- **In the room**:
  - a gold crown floats over it and a gold sigil turns under it;
  - a rage aura appears below half health;
  - an entrance pillar marks its arrival;
  - each move has its own landing VFX, with camera kicks on the heavy ones;
  - a gold death column and the chest's rise mark its fall.
  The render code is in `src/render/enemies/champions.js` and the
  `champion_*` recipes in `src/render/vfx/signature.js`.
- **Sound** (`src/audio/championcues.js`, calibrated):
  - a sting per champion in its act's key on the music bus;
  - a rage phrase;
  - a gold wind-up for every move, which replaces the common telegraph tick;
  - a landing sound for each move;
  - a fall phrase, the chest's peal, and a bell when the crown door is taken.
- **Journal**: a Champions row in the Bestiary, between the lands and the
  bosses, with gold rims, lore, and moves.
- **VFX lab** (`?vfxlab=1`): spawn each champion in its land, and play every
  champion sound.

## Debug and probes

- `cmd('crownDoor'[, side])`: the next path screen carries the crown door.
- `cmd('championRoom', n)`: room n of this level becomes the champion's room.
- `cmd('crownOf')`: shows where this level's crown was rolled.
- `node tools/champions-probe.mjs`: the headless checks, 43 of them. They
  cover the crown roll, the door rules, every champion's moves at Levels
  I–IV, the rage, the chest's greater pick, Endless, replay determinism and a
  mid-fight save.
- `node tools/champions-browser.mjs [--shots dir]`: walks the real pages and
  takes the screenshots.
