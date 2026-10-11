# Act V: The Still Spire

Content plan 4, slice 2 (the plan lives in the project files as CONTENT_PLAN_4.md). The Still Spire is the gods' high belfry, where they sat down to watch and never rose. It is a fifth land with its own biome, music, ambience, six room layouts, a new hazard and four new enemies.

## Open to everyone

Slice 3 (docs/ACT_V_BOSSES.md) opened Level V for everyone: `CAMPAIGN_ACTS` is 5, `ACT5_PREVIEW` is kept only as a no-op, the Spire has its own bosses, the Daily runs five levels (40 rooms, and the server's depth check follows), Boss Rush runs two laps of five, and Endless cycles five lands. The Spire's own champion is still to come (slice 7); until then its champion room meets the Hollow Choir.

## The level

| | |
| --- | --- |
| Name | The Still Spire |
| Biome | `spire`: pale weathered stone, bell bronze, old kite cloth and hemp rope under a cold grey sky |
| Layouts | 29 Bell Stair, 30 Rope Walk, 31 Chime Gallery, 32 Belfry Crown (boss room), 33 Gargoyle Ledge, 34 Windward Court (arena) |
| Hazards | gust vents (new), rockfall, slip patches |
| Interactables | dewfont, barricade, keg, bell |
| Roster | kite 20 %, chime 14 %, gargoyle 14 %, hanger 14 %, plus husks, lancers, crows, moths and knights from the acts above |
| Difficulty | tier 4.1 (Act IV is 3.6), elite chance 26 % rising 3 % a room, two elite powers from the first affix room |
| Boss room | the Belfry Crown meets the Hush or the Skyhorn (docs/ACT_V_BOSSES.md) |
| Starter kit (starting at Level V) | +2 skills, 48 nodes, 4 legendaries, 96 Glint (allies: 4 swaps, 32 nodes, 4 legendaries, 68 Glint) |
| Other | a Hunt room's quarry is a husk; the champion room meets the Hollow Choir; Embers per clear 100, score multiplier 3.0 |

Tier 4.1 is a first guess, half a step above Act IV as Act IV was above Act III. A headless check with the autopilot carrying a fresh start at each level with its starter kit (seeds 1-8, 90000 ticks): from Level V the parties cleared 1-3 rooms before falling, from Level IV 0-4 rooms with one clear. So a cold start on the Spire is about as hard as one on the Heart. It needs tuning after real play.

## Enemies

All four are plain entity data with no RNG of their own, so saves, co-op snapshots and replays carry them unchanged. Every player-targeted attack goes through the §11 telegraph governor (at most two live, starts at least 72 ticks apart).

| Enemy | Role | What it does |
| --- | --- | --- |
| **Gust Kite** (`kite`) | diver | A flier that circles 3.6-5.6 u out. It marks a 0.8 u lane up to 6.2 u long through its target for 50 ticks, then drops down it at 12 u/s, striking each hero it crosses once for 9. It lands **grounded** for 80 ticks and takes 50 % more damage there (the punish window), then rises again. hp 14, every 250 ticks. |
| **Chime Wraith** (`chime`) | toller | A floater that drifts 1.4-2.4 u from its target. It marks a ring r 2.8 round itself for 60 ticks, then tolls for 6 and a 40 % slow for 2 s. A stun mid-swing chokes the toll. hp 22, every 300 ticks. |
| **Gargoyle** (`gargoyle`) | sleeper | Arrives as **stone**: it cannot move, attack or be knocked back. A hero within 2.6 u or any hit wakes it: it cracks for 48 ticks behind a ring r 1.7, then bursts free for 12. Awake it stalks and slams a ring r 1.3 in front of itself (54 ticks, 13 damage). With no hero within 5 u for 6 s it settles back into stone. Takes half knockback awake. hp 48. |
| **Rope Hanger** (`hanger`) | battering ram | Creeps 3-6 u from its target, then marks a 1.1 u lane up to 8.5 u long for 66 ticks and swings down it on its rope at 10 u/s, over barricades and hazards. Each hero it passes takes 8 and is thrown 2 u sideways out of the lane. It dangles for 45 ticks at the end. hp 30, every 280 ticks. |

AI allies step sideways out of the kite's and the hanger's lanes (both carry `lance: true`, read by `laneGoal` in src/sim/allies.js). Elite powers apply, except that a gargoyle is never Frozen and the kite, the gargoyle and the hanger never Blink.

## Gust vents

A new hazard, `gust` in src/sim/hazards.js. A grate in the floor blows along a 1.6 u lane from the vent. Every 420 ticks it shows a 60-tick Ember lane telegraph, then gusts for 36 ticks, pushing every body in the lane along it at 5.2 u/s: heroes, enemies and fliers alike, never bosses. It does no damage itself. It carries you into whatever lies down the lane. Gust resolutions take a slot on the shared hazard clock like every other hazard. Each of the six layouts has two vents, set half a cycle (or near it) apart.

## Look and sound

- **Biome.** `src/env/biomes/spire.js`: pale limestone flagstones with rime in the cracks, a slate-blue dusk, an open balustrade edge with clouds and lesser spires below, belfry ropes hanging from above, and firelight only from torches and braziers (`torchLightGain` 0.55 keeps the pale stone from blooming). Landmarks: a bell stair with its doorway arch, and the great bell in its frame with icicles and an indigo crack (centred in the Belfry Crown). The edge (src/env/treeline.js) has broken balustrade runs, gargoyles, bell cages and torn banners. The map table shows a fifth point, V.
- **Gust vent.** `src/render/hazards/index.js`: a stone and bronze grate breathing faint wisps when idle; the shared Ember lane with wisps drawn in during the telegraph; a white-blue blast with streaks, a pressure front, dust and tumbling feathers while it blows.
- **Enemies.** `src/render/enemies/spire.js`: a cane-and-sailcloth kite that folds, dives and lies splayed when grounded; a hooded shroud over a cracked bronze bell that rears and strikes; a limestone gargoyle that is flat statue grey as stone, glows through its cracks as it wakes and lumbers when awake; a dead bell-ringer on a rope rising out of frame that leans back and pendulums down the lane. Recipes in `src/render/vfx/signature.js` ("Act V, the Still Spire"); Ember only on the parts that hurt. The lab (`?vfxlab=1`) has an Act V row and a gust vent section.
- **Music.** A `spire` theme in src/audio/music.js: F lydian at 92 BPM with a bell ostinato, a high choir and a breath lead over low toms; the boss state goes to F aeolian at 112 BPM and adds a heavy bronze knell. Trims combat -9.5 and boss -9.7, from two noisy calibration runs against the other acts.
- **Ambience.** A high wind bed with uneven gusts, an open-fifth drone on F and a far bell every 5-9 s (src/audio/ambient.js, trim 3.0).
- **Cues.** `src/audio/spirecues.js`: 14 cues for the kite's dive, landing and rise, the chime's toll and choke, the gargoyle's crack, wake, slam and settle, the hanger's swing and landing, and the vent's intake, gust and calm. Their levels are offline estimates (the sandbox's live measurement mostly returned silence); `node tools/smallfixes2-cuecal.mjs --only spirecues --write` replaces them with live measurements.

## Verification

- `node tools/act5-probe.mjs` (headless; sets `ECHOES_ACT5=1` itself, and checks the flag-off state in a child process): the four enemies' behaviours, the gust push, governor holds, AI lane evasion, Level V wiring and runs, the campaign won after Level V, the Daily still four levels, Boss Rush still four acts, save and snapshot round trip.
- `node tools/gntM4b-layoutcheck.mjs`: the six layouts' placements are clear (the gust lane is checked as a segment).
- The nine goldens (`node tools/gntM2-goldens.mjs`) match: nothing in Acts I-IV changed.
