# Boss identity

Each of the six bosses has its own face in the HUD and its own voice in the
score (content plan slice 3, "per-boss HUD medal and music stings"). Nothing
here touches the simulation: the HUD and the audio only listen, and the nine
golden traces are unchanged.

## Medals

The boss banner's medallion draws the boss in the room, picked by its kind
(`BOSS_MEDAL` in `src/ui/hud/banner.js`, icons in `src/ui/hud/icons.js`). All
six share the Stag's grammar: one ink, a filled mass and a few bold strokes,
cut-outs done with evenodd, on the violet boss rim and studs.

| Boss | Act | Medal | Medal well |
|---|---|---|---|
| The Hollow Stag | I | antlers, hooded head, crown mote (unchanged) | violet (unchanged) |
| The Thornmother | I | a five-petal briar rose in a thorned ring | bramble moss |
| The Drowned Heron | II | crested head in profile, spear-bill, S-neck | millrace foam |
| The Millwheel | II | spoked water-wheel with paddles | oak and iron |
| The Barrow Wyrm | III | horned dragon head, jaws open, spined neck | cinder and earth |
| The Lich Ram | III | ram skull with curled horns and a grave-flame | grave mist and bone |

The run view's `boss.kind` (or `actBoss.kind`) names the boss; the Stag's view
has no kind and falls back to the Stag medal.

## Sound

All procedural (`src/audio/bosscues.js`, registered from `src/main.js`), in
each act's key and instruments so the score stays one piece:
wood is D phrygian with horn, lute and hand drum; mill is A phrygian with
reed, drips, clanks and frame drum; barrow is E harmonic minor with choir,
bells, tolls and taiko.

| Cue | When | Bus |
|---|---|---|
| `bx_<boss>_sting` | its banner lands (`boss_spawn`), with its own spawn voice | music |
| `bx_<boss>_phase` | each add phase (`boss_adds`), and the Wyrm's and Lich Ram's enrage | music |
| `bx_<boss>_fall` | its death, over the shared `boss_death` thud | music |
| `bx_<boss>_tell` | the five kit bosses' telegraphs, in place of the generic tick (pitch per attack) | sfx, spatial |
| beat cues | spear, pierce, wingbeat, submerge, surface; breath, burrow, emerge; charge, charge end, seed volley, thorn burst; crosscut, cut end, grind, cog shards; rush, horns stuck, grave call, grave raise | sfx, spatial |

The Stag keeps every cue it had (roar, quake, trample, horn, telegraph,
boss_death) and gains its sting, phase and fall. The five kit bosses used to
die to the plain enemy kill pop (their death event carries their own kind,
not `stag`); they now get `boss_death` and their fall sting.

Boss music: each act's first boss (Stag, Heron, Wyrm) keeps the act's boss
groove as it was. Each act's second boss (Thornmother, Millwheel, Lich Ram)
plays a variant of it (`BOSS_MUSIC` in `src/audio/music.js`): same key,
tempo, drone and pad, its own progression, ostinato figure, drum pattern and
lead (briar lute with a rustling shaker; mechanical bell ostinato and reed;
galloping drums and brass horn calls). The engine picks it from the run
view's boss from room 6 on, so the groove is prebaked before the boss room.

Levels are calibrated like the M4b cues: `node tools/boss-identity-cuecal.mjs
--write` measures each recipe's peak into `BOSS_CUE_CAL`; `--verify` checks
every cue within 2 dB of its level and no SFX over -6 dBFS.

## Auditioning

`?vfxlab=1` adds a "Sound" row per boss: Sting, Phase, Fall, and Groove (its
boss music at full intensity; Music > Release hands the score back). The
Rooms buttons jump into each boss's room to see the medal and hear the fight.

## Probe

`node tools/boss-identity.mjs` (against `npm run dev`): for each boss, its
room is live, the banner wears its medal, its sting fired on spawn, the boss
groove is its own, one of its beats played its own cue (and no generic
telegraph tick for the kit bosses), the add phase plays its phase sting and
its death plays `boss_death` and its fall. Screenshots go to
`/mnt/project-files/boss-identity/` (`--shots` to change).
