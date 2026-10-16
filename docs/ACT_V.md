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

## Slice 7: the Spire's champion, two more creatures, events and deeds

Content plan 4 slice 7 (v0.5.282) fills Level V to match Acts I to IV. Every
number below is a first guess until the Spire has been played.

### The Gale Herald (champion)

The Spire's crown door no longer borrows the Hollow Choir. The Gale Herald
(`gale_herald`, `src/sim/enemies/champions.js`) is the gods' own crier: a
winged stone herald carved to stand on the belfry roof with a long bronze horn.
It keeps 2.4 to 4.6 u from its target and alternates two moves under the
governor, like every champion:

| Move | Warning | What it does |
|---|---|---|
| Gale Call | a cone r 5.2, half-angle 34°, 60 ticks | the horn blasts for 12 and throws every hero it hits 2.4 u away from the horn over 12 ticks (heroes ignore knockback, so the throw is its own, like the Rope Hanger's) |
| Stoop | a ring r 2.1 under a hero 1.6 to 7.5 u away, 72 ticks | it takes wing (a flier, over barricades and hazards) and glides to the mark over the first 80% of the warning, then hangs over it and lands on it for 17 |

A stun mid-stoop drops it where it is. Below half health it rages like the
others (cooldowns x0.7, speed x1.15). The champion frame gained a `pre` hook
for the throw and the flight; the other four champions do not use it. The AI
seats count it as a champion (`src/sim/partyai.js`).

Its hit flash is a quarter of the usual (`flashScale: 0.25` on the build in
`src/render/enemies/champions.js`, read by `src/render/enemies/index.js`).
The full white flash on that pale, wide-winged body crossed the bloom
threshold across the whole wingspan, and in the pale Spire room every hit
spread a white haze over the top of the screen (Small fixes 4,
`tools/small-fixes-4-browser.mjs`: about 60000 blown pixels round it on a hit
frame before, about 5000 after). Every other champion flashes at 0.4
(`CHAMPION_FLASH`) for the same reason; ordinary enemies and bosses keep the
full flash.

### Two more creatures (six of its own)

Both join Level V's roster from room 3, campaign rooms only
(`CAMPAIGN_ONLY_ENEMIES`), so the legacy single-level run never plans them.

- **Vane Cock** (`vane`, `src/sim/enemies/vane.js`, 24 HP, threat 1.5): a brass
  weathercock on its spindle. It keeps 4 to 7 u away and, with a clear line,
  marks a lane 0.9 u wide through a hero for 48 ticks, then looses three gust
  darts down it, 9 ticks apart, 7 each. Step out of the lane and all three
  miss. A stun mid-aim cancels the volley. Cooldown 230 ticks.
- **Bell Sacristan** (`sacristan`, `src/sim/enemies/sacristan.js`, 34 HP,
  threat 1.6): a stone acolyte with a hand bell. When two or more kin stand
  within 3.6 u it rings a Vesper Hush (a pale ring, 54 ticks, not an attack, so
  the governor never holds it): every other enemy inside, never a boss or a
  champion, is hushed for 300 ticks and takes 40% less damage (`hushUntil` /
  `hushMul` on the body, read in `src/sim/combat.js`). A stun mid-ring chokes
  it. Alone it walks in and raps a hero: a cone r 1.6, half-angle 60°, 36
  ticks, 7. Hush cooldown 380 ticks, rap 150.

### Spire events

Two land-bound encounters (`land: 'spire'`, `src/sim/encounters.js`):

- **Gods' Seat** (`gods_seat`): give up your two newest relics for a
  legendary pick (rare when none are left). Refused with fewer than two
  relics. The AI leaves it.
- **Silent Bell** (`silent_bell`): every hero gives 15% of max HP and the bell
  lifts your newest major curse for the rest of the run (`relics.liftMajor`,
  event `curse_lifted`). Refused with no major curse. The AI takes it.

### Relics, tints and deeds

- **Relics** (heirlooms like any relic): Weathercock Plume (common, dodges
  recover 15% faster, party knockback +30%) and the Hushbell (rare, +25%
  party damage on an enemy while its attack warning is up).
- **Tints**: Still Air for the Swordsman (40 Embers, Level V cleared) and Gale
  Bronze for the Bellwright (free with Windfall).
- **Deeds**: Skyward (clear Level V, 60), Windfall (fell the Gale Herald, 25),
  Five Crowns (fell a champion in each of the five lands, 80) and Break the
  Hush (fell the Hush on Harrowing, 80). Four Crowns means a champion in each
  of the first four lands; since small fixes 5 either of a land's champions
  counts (`crownLands` in `src/sim/champions.js`).
- **Journal**: the Gale Herald joins the Champions row; the Vane Cock and the
  Bell Sacristan join the Spire's pages.

### Verification

- `node tools/act5-champion-probe.mjs` (headless, 28 checks): the Herald's
  throw and stoop and a mid-stoop save, the vane's volley, the sacristan's
  hush (40% less on a real blow, never on a champion) and rap, the roster
  gate, the Hushbell, the deeds, tints and Journal rows.
- `tools/champions-probe.mjs` now covers Level V too; `tools/eventrooms-probe.mjs`
  covers both Spire events and the Spire's land filter.
