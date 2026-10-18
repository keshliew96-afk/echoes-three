# The Ember Kiln

Content plan 5, slice 7 (the plan lives in the project files as CONTENT_PLAN_5.md). The Ember Kiln is the gods' kiln, where the first bells were fired, and the fire never went out. It is the sixth land: a second Level V on its own road. This slice built its world behind a flag: biome, dressings, six layouts, a new hazard, four new enemies, music, ambience and cues, four Journal pages and the scaffold of its verse. Its bosses and the fork itself come in slice 8, its champion, events and deeds in slice 9.

## Behind the flag

Since slice 8 (docs/KILN_BOSSES.md) the Kiln plays for everyone: the party picks the Spire or the Kiln on the Level IV clear card, and `?act6=1` (`ACT6_PREVIEW`) no longer changes anything. The Daily stays on the Spire road; Endless and Boss Rush keep their five lands.

With the flag on:

- The Kiln is **act 6 in data and Level V in play** (`level: 5`, `road: 'kiln'`). `CAMPAIGN_ACTS` stays 5.
- **Roads.** `ROADS` in levels.js maps each Level V road to its act (`spire: 5`, `kiln: 6`). `roadLevels(road)` in src/data/campaign.js is the campaign on that road: every played act that is not another road's Level V. `DEFAULT_ROAD` is the Kiln under the flag, so a new campaign runs Levels I to IV and then the Kiln (`CAMPAIGN_LEVELS` 1, 2, 3, 4, 6). A run started at the Spire still ends there.
- `nextLevel(level, road)` takes the run's road; `nextLevels(level)` is every level a clear opens on any road, so a Level IV clear unlocks both Level Vs. `ALL_LEVELS` holds both, and the profile keeps records and unlocks for both.
- **Daily** stays on the Spire road (sim/run.js passes `'spire'` for a Daily), so the board never meets the Kiln. **Boss Rush** stays on the five campaign acts. **Endless** cycles six lands under the flag.
- The Ringwalker deed does not count the Kiln Mouth (`ARENA_IDS` leaves act 6 out), so no deed widens.
- The map table forks after mark IV: the Spire at the top right, the Kiln at the bottom right with a small flame.

**The fork (slice 8).** The party's pick at the Level IV clear sets the run's road (`pickRoad` in sim/run.js), and `nextOf()` passes it to `nextLevel()`; `roadOfAct()` gives the road of a Level V act.

## The level

| | |
| --- | --- |
| Name | The Ember Kiln |
| Biome | `kiln`: dark brick in courses, soot and cinders, hot cracks breathing gold from the vents and kiln mouths, bottle kilns and chimneys past a brick yard wall |
| Layouts | 36 Stoke Hall, 37 Clay Pits, 38 Glaze Gallery, 39 Firing Floor (boss room), 40 Slag Run, 41 Kiln Mouth (arena) |
| Hazards | cinder vents (new), rockfall, gravefire |
| Interactables | dewfont, barricade (brick skin), keg, bell |
| Roster | newt 20 %, cindermoth 16 %, bellows 14 %, slag 13 %, plus husks, lancers, crows and knights from the acts below |
| Difficulty | the Spire's numbers (difficulty.js index 6 copies index 5) |
| Boss room | the Firing Floor meets the Bellfounder or the Cinderback (slice 8, docs/KILN_BOSSES.md) |
| Starter kit (starting there) | the Spire's: +2 skills, 48 nodes, 4 legendaries, 96 Glint |
| Other | a Hunt room's quarry is a husk; the champion room meets the Kiln's own two (slice 9, docs/CHAMPIONS.md); Embers per clear 100, score multiplier 3.0 |

## Enemies

All four are plain entity data with no RNG of their own, so saves, co-op snapshots and replays carry them unchanged. Every player-targeted attack goes through the §11 telegraph governor (at most two live, starts at least 72 ticks apart).

| Enemy | Role | What it does |
| --- | --- | --- |
| **Ember Newt** (`newt`) | skitterer | A fire lizard (16 hp) that weaves in to 2-3 u. It crouches behind a 0.7 u lane up to 3.6 u long for 42 ticks, then lunges down it at 13 u/s, biting each hero it crosses once for 7, and rests 40 ticks where it stops. Every 190 ticks. AI seats step out of its lane (`lance: true`). |
| **Slag Golem** (`slag`) | brute | A slag heap round a molten core (64 hp), crusted: x0.6 damage taken and x0.3 knockback. In close it slams a ring r 1.4 in front of itself (56 ticks, 14 damage) and leaves a slag pool (r 1.3, 30 % slow, 4 s). The slam cracks the crust: for 2 s it takes x1.4. Every 210 ticks. |
| **Bellows Imp** (`bellows`) | stoker | Keeps 2.6-3.8 u off and pumps its bellows behind a cone r 3.4, half-angle 30°, for 60 ticks, then fans sparks down it for 8. It backs off from a hero up close, and a stun mid-pump chokes the fan. hp 26, every 260 ticks. |
| **Cinder Moth** (`cindermoth`) | kindler | A flier (12 hp) that flutters straight in, kindles a ring r 1.2 round itself for 48 ticks and flares for 6. The flare burns it out: 2.5 s spent, drifting away at x2 damage taken, then it relights. |

Slice 9 (v0.5.299) added two more, from room 3 on (campaign only, like the four):

| Enemy | Role | What it does |
| --- | --- | --- |
| **Coal Hurler** (`hurler`) | mortar | A soot imp (22 hp) with a sack of coals that keeps 3.6-5.2 u off and lobs it at a hero 2.4-6.8 u away: a ring r 1.3 on their spot for 66 ticks, then 9 and an ash patch (r 1.0, 30 % slow, 2.5 s). Every 240 ticks. A stun mid-heave makes it drop the sack. |
| **Ash Wraith** (`ashwraith`) | stalker | A shape of ash (24 hp) that scatters (untouchable, no knockback) and opens a ring r 1.3 1.4 u behind a hero for 60 ticks, then reforms there and rakes for 11. Then it is spent for 1.5 s: half speed and x1.3 damage taken. Every 260 ticks. |

## The Kiln's event, shrine and relics (slice 9)

- **Molten Bell** (event, Kiln only): pour Glint into a half-cast bell, 40 for each relic, up to three (docs/EVENT_ROOMS.md).
- **Forge Shrine**: melts the party's newest common relic for Tempered, +25 % damage and 20 % less damage taken for 60 s (docs/SHRINES.md).
- **Slag Greaves** and **Founder's Ingot** (docs/RELICS.md).
- Deeds **Through the Fire**, **Kiln Crowns** and **Quench the Founder**, and the tints **Quench Steam** and **Cinderwing** (docs/UNLOCKS.md).

## Cinder vents

A new hazard, `vent` in src/sim/hazards.js: a grate over the fire. Every 420 ticks it shows a 60-tick Ember ring (r 1.2), then erupts for 12 to every body inside, fliers too, never bosses. It leaves a bed of cinders for 150 ticks that slows ground bodies 30 %, then cools. Eruptions take a slot on the shared hazard clock. Each layout has two vents, set half a cycle apart or near it.

## Look and sound

- **Biome.** `src/env/biomes/kiln.js` with a kiln pass in `src/env/ground.js` (`paintKilnSteps`, its own random streams): dark brick, soot, a scorched halo round every vent, flagstone walks, clay, slag crusts and glaze chips per layout, cinders, and a hot crack network breathing gold. Cinder tufts for low cover; the edge (`src/env/treeline.js` `'kiln'`) is a brick yard wall with buttresses and small glowing mouths, bottle kilns, heaps and up to twelve smoking chimneys. Landmarks (`src/env/props.js`): kiln mouths, flues and a cast bronze bell with an indigo crack (the corruption tell), the great bell in its casting pit on the Firing Floor. Fire is kiln gold and crimson coal; Ember stays on telegraphs only.
- **Cinder vent.** `src/render/hazards/index.js`: a brick kerb with an iron grate over a breathing coal bed; the shared Ember ring for the telegraph; a gold column of flame with sparks and smoke for the eruption; a bed of ash with embers cooling from gold to crimson.
- **Barricade.** A low-chroma brick skin (`skin: 'brick'`).
- **Enemies.** `src/render/enemies/kiln.js`: a sooty newt with a gold belly and live coals down its spine; a slag heap whose crust plates lift off a white-gold core after a slam; a pot-bellied imp with bellows on its back that pump and puff sparks; an ash moth with fire in its wings that greys out when spent. Each carries one indigo tell. Event VFX in `src/render/vfx/signature.js` (the Kiln block), the slag pool in `src/render/enemies/extras.js`, a Kiln row in the lab (`?vfxlab=1`).
- **Music.** A `kiln` theme in src/audio/music.js: B-flat phrygian dominant (a new `phrygdom` scale) at 100 BPM, an anvil on every beat, a forge-string ostinato, a bellows breath twice a bar and a bronze bell lead; the boss state goes to B-flat harmonic minor at 122 BPM with a great cast bell. Trims combat -8.9 and boss -9.5, set against the Spire and the Wood in one session (`node tools/gntM3-calibrate.mjs --keys combat:kiln,boss:kiln,kiln` confirms them on a quiet machine).
- **Ambience.** A furnace roar with a fire body, dense crackle and a low B-flat hum; every 4-8 s a far hammer on an anvil or a cooling bell's tick (src/audio/ambient.js, trim -4.7).
- **Cues.** `src/audio/kilncues.js`: 16 cues for the newt's crouch, lunge and stop, the golem's rear, slam and crust, the imp's pump, fan and choke, the moth's kindle, flare, snuff and relight, and the vent's rumble, eruption and cooling. Levels measured live with the engine's `measureCue`.

## Verification

- `node tools/act6-probe.mjs` (headless): 41 checks over the wiring, the roads, the four enemies, the vent, the governor, Kiln runs and the campaign won there, the Daily on the Spire road, and save and snapshot round trips.
- `node tools/gntM4b-layoutcheck.mjs`: the six layouts' placements are clear.
- `node tools/kiln-champions-events-probe.mjs` (headless): slice 9's champions, enemies, event, shrine, relics, deeds and tints.
- The nine goldens (`node tools/gntM2-goldens.mjs`) match: nothing outside the flag changed.
