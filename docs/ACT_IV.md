# Act IV: The Hollow Heart

Content plan 2, slice 4 (docs/CONTENT_PLAN.md is older; the plan lives in the project files as CONTENT_PLAN_2.md). Level IV sits under the Ashen Barrow, where the violet corruption first took root. It has its own biome, music, ambience, five room layouts and four new enemies. Ruling A18 in docs/BUILD_BRIEF.md makes the campaign four levels long.

## Four levels, or three

`CAMPAIGN_ACTS` in `src/data/levels.js` is the switch.

- **4 (shipped).** The campaign runs Wood, Mill, Barrow, Heart. Clearing Level IV wins it. The Level Select shows five cards (four levels plus Endless). Level IV unlocks after Level III is cleared, like every other level.
- **3.** The campaign stops at the Barrow as before, and `ENDLESS_ACTS` still holds all four acts, so the Hollow Heart plays only inside the Endless Descent (Depth 4 of every cycle). Nothing else needs to change.

Every place that used to say "three" reads `ACT_IDS`, `CYCLE` (src/data/endless.js) or `beyondCampaign(depth)` instead of a literal: run.js, the transit card, the end card, the Level Select, records, unlocks and the profile's score table.

## The level

| | |
| --- | --- |
| Name | The Hollow Heart |
| Biome | `heart`: violet crystal veins in black rock, glass floors, a pulsing heart light |
| Layouts | 16 Root Gate, 17 Vein Gallery, 18 Heart Chamber (boss room), 19 Geode Hall, 20 Weeping Wells |
| Hazards | rockfall, gravefire in a `vein` skin, slip patches in a `glass` skin (grip 0.08, slicker than ice) |
| Interactables | dewfont, barricade in a `crystal` skin, keg |
| Roster | husk 26 %, lancer 14 %, geode 12 %, censer 8 %, plus moths, brood, gravewisps, knights and crows from the acts above |
| Difficulty | tier 3.6 (Act III is 3.1), elite chance 24 % rising 3 % a room |
| Starter kit (starting at Level IV) | +2 skills, 40 nodes, 3 legendaries, 80 Glint (allies: 4 swaps, 26 nodes, 3 legendaries, 56 Glint) |

The plan suggested a tier near 2.15. The code's Act III tier is already 3.1, so Act IV uses 3.6. On carried campaigns from Level I (headless autopilot, seeds 1-16) 8 parties reached Level IV and 4 cleared it, against about 57 % for Level III. Tier 3.1 let 3 of 4 through, which was too easy.

## Enemies

All four are plain entity data with no RNG of their own, so saves, co-op snapshots and replays carry them unchanged. Every player-targeted attack goes through the §11 telegraph governor (at most two live, starts at least 72 ticks apart).

| Enemy | Role | What it does |
| --- | --- | --- |
| **Hollow Husk** (`husk`) | swarm rusher | Walks in step with the heart. Every 180 ticks the whole room's husks surge together for 42 ticks at 2.2× speed, with a 30-tick warning pulse. Bites on contact like the boar. hp 22. |
| **Vein Lancer** (`lancer`) | ranged lane | Keeps 3.4-5.6 u away, then charges a 7 u by 0.8 u lane for 54 ticks and fires a crystal lance down it, hitting everyone in the lane. hp 16, 10 damage, every 240 ticks. |
| **Geode Brute** (`geode`) | heavy | Slams a 1.5 u ring in front of itself (60-tick telegraph), then throws three crystal shards (ahead and ±70°, 2.4 u out) that leave a crystal slick slowing by 35 % for 3 s. Takes 35 % knockback. hp 64. |
| **Heart Censer** (`censer`) | support flier | Never attacks. Hangs behind its kin and every 300 ticks gathers for 48 ticks, then mends every non-boss hostile within 4.2 u by 15 % of max HP. Stunning it mid-gather spills the mend. hp 14. |

AI allies: seats step sideways out of any lance lane that covers them (`laneGoal` in src/sim/allies.js) and treat geode shards like affix globs. Elite affixes apply to Act IV elites (two powers from the first affix room, as on Level III); the censer is excluded from the powers that make no sense on a healer (Frozen, Vampiric, Blinking, Splitting, Thorned). A Hunt room's quarry on Level IV is a husk.

## Boss room

Level IV's boss room, the Heart Chamber, meets **the Hollow Cantor** (the campaign's final boss) or, on some seeds, **the Geode Colossus**, rolled by seed like any act (seeds 1 to 40: 22 Cantor, 18 Colossus). Their kits, adds, tuning and sound are in docs/ACT_IV_BOSSES.md. `STAG_DMG_LEVEL[4] = 0.85` stays as it was.

## Endless Descent

The descent now cycles four biomes: Wood, Mill, Barrow, Heart. Depths 1-4 play each act on its own numbers, Depth 4 is the Hollow Heart and clearing it wins the campaign. From Depth 5 every depth uses the Act IV numbers multiplied by `DEPTH_STEP` (k = depth − 5) and mixes in guest creatures from the other three biomes. docs/ENDLESS.md has the details.

## Look and sound

- **Music.** A `heart` theme in C♯ harmonic minor at 86 BPM, with a heartbeat kick on the off-beats, a glass ostinato and a choir lead; the boss state uses the phrygian scale and adds a heavier heartbeat layer. Mix trims are estimates, not measured.
- **Ambience.** A low brown-noise throb, a crystal shimmer band, a C♯/G drone and a heartbeat every 4-7 s.
- **Cues.** `src/audio/heartcues.js`: husk surge, lance, slam, shard shatter, censer gather, mend and spill.
- **Visuals.** Biome dressing in `src/env/biomes/heart.js`; enemy rigs in `src/render/enemies/heart.js`; telegraphs and impact effects on the AAA bar, with a vfx lab row for the four enemies (`?vfxlab=1`).

## Verification

- `node tools/act4-probe.mjs` (headless): the four enemies' behaviours, governor holds, AI lane evasion, Level IV wiring, the campaign won after Level IV, Endless depth 5 on Act IV numbers, save and snapshot round trip.
- `node tools/endless-probe.mjs`: updated for the four-biome cycle.
- The nine goldens (`node tools/gntM2-goldens.mjs`) match: nothing in Acts I-III changed.
