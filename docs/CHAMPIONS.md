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

Each act (land) has a first champion here; Acts I to IV also have a second (see "Second champions" below). Each has two telegraphed moves, which
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

## Keys and vaults

A falling champion drops a vault key at the `champion_fall {id, champion, x,
z}` spot (src/sim/vaults.js, wired in src/sim/run.js). See docs/VAULTS.md.

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

## The Gale Herald (Act V)

Plan 4 slice 7 gave the Still Spire its own champion, so Level V's crown door
no longer holds the Hollow Choir. Its kit, look and sound are in
`docs/ACT_V.md`, "Slice 7".

## Second champions (Acts I to IV)

Plan 4 slice 8 (v0.5.283) gave each of the first four lands a second
champion. The crown door now rolls one of the land's two: a hash of the
level's frame seed and index (`championPick` in `src/sim/champions.js`,
`${seed}:${index}:CHAMPION`), apart from `crownFor`'s hash, so where the
crown door sits is unchanged and nothing draws from the run's random stream.
Level V had only the Gale Herald until content plan 5 slice 2 (below). Endless and the Daily use the same pick.

| Land | Champion | Move 1 | Move 2 |
|---|---|---|---|
| Wood | The Moss Hart | Antler Toss: a cone (r 3.0, 55°) hits for 15 and throws 2 u | Hart's Leap: a ring (r 2.0) under the farthest hero; it bounds over and lands for 15, leaving moss that slows 30% |
| Mill | The Lockkeeper | Chain Hook: a lane (7.5 × 0.9); the key hits for 10 and drags the hero to his feet | Lock Turn: a ring round him (r 2.5) for 16 and a 50% slow |
| Barrow | The Gravebell Ringer | Death Knell: a ring round it (r 3.6) for 11 and a 45% slow | Grave Call: a ring (r 1.8) under a hero bursts for 14 and leaves ash that slows |
| Heart | The Vein Matron | Vein Lash: a lane (7 × 1.0) for 13; she heals 3% of her max health per hero cut, 6% at most | Heart Pulse: a ring round her (r 2.8) for 14, then eight crystal shards, 7 each |

Each has the frame's rage below half health, its own plate, sting, death
burst and the usual relic chest. The Journal's champion row had nine
entries (ten since the Bell Abbess). Four Crowns and Five Crowns count a land as crowned when either of
its champions has been felled, the second as well as the first
(`crownLands`, `FOUR_CROWN_ACTS`, `FIVE_CROWN_ACTS` in `src/sim/champions.js`;
small fixes 5), and the new champions add no deed.

## The Bell Abbess (the Still Spire's second)

Content plan 5 slice 2 (v0.5.291) gave the Still Spire its second champion,
so every land now has two (`SECOND_CHAMPIONS[5]` in `src/sim/champions.js`).
Level V's crown door rolls the Gale Herald or the Bell Abbess by the same
`championPick` hash; seeds 1 to 60 split 29 to 31. Old Level V seeds whose hash
lands on her now meet her at the crown door; nothing else about their rooms
changes.

She is the abbess of the gods' belfry: tall and still in a pale habit and a
winged wimple, a porcelain face with shut eyes, a bronze hand-bell in one hand
and the great bell's rope in the other, rising out of sight. The rope's sally
(its woven grip) is her indigo tell.

| Move | Shape | What it does |
|---|---|---|
| Rope Swing | a lane (width 1.2) at its target, or else the farthest hero, 2.4 to 7.5 u off, running 1.2 u past them; 66 ticks, cooldown 170 | She stands through the first half, then rides the rope down the lane (a flier, over barricades and hazards) and drops at its end. Every hero in the lane takes 14 and is knocked 1.6 u aside, out of it. |
| Vesper Peal | a cone r 4.4, half-angle 36°; 60 ticks, cooldown 160 | The hand-bell rings for 11, and every hero in the cone is slowed 55 % for 1.2 s. |

She keeps 2.2 to 4.4 u off, moves at 1.1, and has the frame's rage, plate,
sting, chest and HP. Look: `buildBellAbbess` in
`src/render/enemies/champions2.js` (with `abbessLift`, which the presence layer
shares, and a pale wake of cut air while she rides). VFX: `rope_swing` and
`vesper_peal` in `src/render/vfx/signature.js`. On Rope Swing the great bell
tolls far overhead and a ribbon of cut air hangs along her arc. On Vesper Peal
bronze arcs of sound roll down the cone and leave drained lavender motes
hanging. Her death has the rope falling, the bell's last tolls and the wimple
breaking into linen. Sound: `ch_bell_abbess_sting`, a plainchant in F lydian
over the great bell; `ch_rope_grip` on the swing's wind-up; `ch_rope_swing`;
and `ch_vesper_peal`, in `src/audio/championcues.js`. Lab: `?vfxlab=1`,
Champions, Bell Abbess.

Deeds: **Windfall** now takes either Spire champion ("Fell a champion of the
Still Spire, the Gale Herald or the Bell Abbess.") and **Five Crowns** lost its
"the Gale Herald included" clause. She adds no relic, tint, deed or story line
of her own, as with the other second champions.

## Debug and probes

- `cmd('crownDoor'[, side])`: the next path screen carries the crown door.
- `cmd('championRoom', n)`: room n of this level becomes the champion's room.
- `cmd('crownOf')`: shows where this level's crown was rolled.
- `cmd('championPick'[, id])`: shows this level's champion, or forces it.
- `node tools/champions-probe.mjs`: the headless checks, 49 of them. They
  cover the crown roll, the door rules, every champion's moves at Levels
  I–V, the rage, the chest's greater pick, Endless, replay determinism and a
  mid-fight save.
- `node tools/champions-browser.mjs [--shots dir]`: walks the real pages and
  takes the screenshots.
- `node tools/second-champions-probe.mjs`: the slice 8 checks (the pick, each
  new kit, the common frame, the deeds and a mid-leap save).
- `node tools/second-champions-browser.mjs [--only kind]`: the second
  champions' fights and Journal rows on the real pages.
- `node tools/spire-second-champion-probe.mjs`: the Bell Abbess (the Spire's
  pick, both moves, the frame, a mid-swing save, the deeds and her text).
- `node tools/spire-second-champion-browser.mjs`: her fight and her Journal
  page on the real pages.
