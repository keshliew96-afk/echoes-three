# Content plan 5: the next slices

Written 2026-10-16 from gauntlet at 20cb091 (v0.5.289). This is a research pass with no code changes. It reads the game as it is now, `docs/BUILD_BRIEF.md` (rulings A11, A15 to A18), `docs/STORY.md`, `docs/BOSS_RUSH.md`, `docs/BELLWRIGHT.md`, `/mnt/project-files/plan/CONTENT_PLAN_4.md` (all 11 slices plus floating slices 12 and 14 shipped as PRs #60 to #74), `/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md` and the per-slice notes.

## What the game has at v0.5.289

Counted from the code at 20cb091 (the data tables, not the docs):

| Area | Count | Where it lives |
|---|---|---|
| Heroes | 6: Healer (17 skills), Tank, Swordsman, Archer, Tidecaller, Bellwright (11 skills and 8 class nodes each); 4 seats | `src/data/classes.js`, `lineup.js` |
| Campaign levels | 5 (Wood, Mill, Barrow, Heart, Spire), 8 rooms each, 40 in all | `src/data/levels.js` (`CAMPAIGN_ACTS = 5`) |
| Layouts | 34: 7 each for Acts I to IV, **6 for the Spire** | `src/data/layouts.js` |
| Bosses | 14: 3 each for Acts I to IV, **2 for the Spire** (the Hush, the Skyhorn) | `src/sim/bosses/` |
| Champions | 9: 2 each for Acts I to IV, **1 for the Spire** (the Gale Herald) | `src/sim/champions.js` |
| Enemy types | 35 (Wood 8, Mill 7, Barrow 8, Heart 6, Spire 6) | `src/sim/enemies/`, Journal 44 rows plus 14 bosses |
| Events | 16 (10 shared, 6 land events: one per land, two in the Spire) | `src/sim/encounters.js` |
| Objective rooms | 4 (hunt, purge, escort, hold) plus defend and kill-all | `src/sim/objectives.js` |
| Elite affixes | 8 (unchanged since plan 2) | `src/sim/affixes.js` |
| Relics and curses | 51 relics (8 class relics), 17 curses (10 minor, 7 major) | `src/sim/relics.js` |
| Consumables | 6 tonics and bombs, one carry slot per hero | `src/sim/consumables.js` |
| Hazards, shrines, interactables | 8 hazard types, 5 shrines (one per land), 6 interactable types | `hazards.js`, `shrines.js`, `interactables.js` |
| Modes | Campaign, Endless (five-land cycle), Daily (40 rooms, board), Boss Rush (10 fights, solo and co-op bests) | `src/data/endless.js`, `daily.js`, `rush.js` |
| Vows | 8 vows in 3 ranks, Vow level up to 24, a best per mode | `src/data/vows.js` |
| Meta | 55 deeds, 99 unlocks (12 kits, 51 heirlooms, 25 tints, 8 vows, 3 purses) | `src/data/unlocks.js` |
| Story | 5 of 7 verses, 9 NPCs, 15 rumours, 15 boss voices | `src/data/story.js` |
| Languages | 10 | `src/i18n/` |

## Where the run loop is thin now

Plan 4 added a whole land, a hero and the systems around them. What stays thin:

- **The Spire is a level behind.** It has two bosses, one champion and six layouts where every other land has three, two and seven. Plan 4 left its third boss "for a later plan", and a Level V crown door is always the Gale Herald.
- **Nothing hidden.** Every room shows all it has the moment you enter. Gauntlet and its heirs (Isaac, Hades' secret chambers) reward looking around: a wall that cracks, a chamber behind it. The bombs from plan 4 have one job (hurt a crowd) and could have a second.
- **Six heroes, two of them casters, and no fast melee.** Tidecaller and Bellwright both play from range with zones. Nobody dives in and out. The shortlist has waited since plan 3, and the lineup picker already takes a seventh hero at the cost of three slices.
- **Two verses unwritten.** `docs/STORY.md` holds seven verses and the game frees five. "Adding an Act" is still a short checklist, but a 48-room campaign is long for one run, so how a sixth land joins is Kesh's call (see Questions).
- **The elite affixes have not grown since plan 2.** Eight affixes across five lands, so a Spire elite rolls the same Molten or Blinking a Wood elite does.
- **Relics have not caught up with what is coming.** Batch five reacted to plan 4's content. Secrets, a new hero and a sixth land each want a few relics.

## Slices, ordered by how much they add

Each slice is one thread and one draft PR into gauntlet from its current head. Versions run from 0.5.290, every slice ships its text in all ten languages and adds one probe, the nine goldens stay byte-identical, `npx vite build` passes, and screenshots go under `/mnt/project-files/<slice>/`. Nothing merges before Kesh says go. The goldens never see the campaign, so new content is campaign-only (Endless, Daily and Boss Rush start through `startCampaign`) or enters from room 4 on: skills and nodes through `CAMPAIGN_ONLY_*` and `gatedPool()` in `src/data/classes.js`, relics through the campaign gate in `src/sim/relics.js`, rosters and layouts through the campaign tables in `src/data/levels.js` (never `legacyLayouts`), objectives through `objectivesOn()`, consumables and their kin through `championsOn()`.

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 1 | **Spire third boss** | Give the Spire a third boss like the other lands: gated until a Spire boss falls, its own arena layout (35), model, three moves, medal, sting, groove, rumour and Hollow Voice line, a Journal page, and a place on Boss Rush lap two and in Endless. | `src/sim/bosses/`, `src/render/boss/`, `levels.js` bosses row, `layouts.js`, `story.js`, journal, `rush.js` lap two | Low: campaign tables only; `act5-bossbench` and Endless seeds shift |
| 2 | **Spire second champion** | Give the Spire a second champion, picked by seed at the crown door like Acts I to IV, with two moves, rage, plate, sting and chest; the Journal row grows to ten and the Five Crowns deed counts either Spire champion. | `src/sim/enemies/champions.js`, `champions.js`, rig, cues, journal, `unlocks.js` | Low: campaign-only, room 4+ |
| 3 | **Secret rooms** | Hide a cracked wall in some rooms from room 4 on (hash roll, about one in four campaign rooms); a bomb or a heavy hit opens it into a small chamber with treasure, a rare event or a lore page, and the end card counts the secrets found. | `layouts.js` wall slots, `src/sim/vaults.js` chamber, `consumables.js` bomb hit, biome dressings, VFX, cues, journal | Low: campaign-only, room 4+, hash roll like keys |
| 4 | **Duskwing playable** | Add the seventh hero, a bat from the Barrow: a fast melee diver who darts in, steals life and blinds packs with darkness. Model, picker card, base kit of four skills and `docs/DUSKWING.md`; free from the start in this slice. | `classes.js`, `lineup.js`, `src/render/` rig, `classpick.js`, `skills.js` | None: default lineup unchanged |
| 5 | **Duskwing kit, VFX and sounds** | Fill the kit to eleven skills and eight class nodes, with its own VFX file, cue set and vfxlab reels, and teach the AI seat when to dive and when to pull out. | `classes.js`, `nodes.js`, `partytech.js`, `allycast.js`, `src/render/vfx/`, `src/audio/` | None: campaign-only skills and nodes |
| 6 | **Duskwing in the world** | Lock the Duskwing until the first Level IV clear, then give it camp talk, story lines, a kit and two tints, two deeds, two class relics, a Journal page and tips. | `unlocks.js`, `story.js`, `campnpcs.js`, `relics.js`, journal | None: profile and campaign-only relics |
| 7 | **Sixth land: world and roster** | Build the sixth land, *The Ember Kiln* (where the gods fired the first bells; working title): biome `kiln`, five layouts plus an arena, dressing, music, ambience, its own hazard (cinder vents) and four new enemies. It plays only behind `?act6=1`. | `src/env/biomes/kiln.js`, `levels.js`, `layouts.js`, enemies, `music.js`, `ambient.js`, `hazards.js`, journal | Low: behind a flag, campaign tables only |
| 8 | **Sixth land: bosses and opening it** | Give the Kiln two bosses (a warden and an alternate), each with a model, three moves, medal, sting, groove, rumour and Hollow Voice line, the sixth verse, a chapter and an ending; then open it the way Kesh picks (see Questions), with Endless cycling six lands and Boss Rush and the Daily following. | `src/sim/bosses/`, `src/render/boss/`, `levels.js`, `story.js`, `rush.js`, `server/daily.mjs`, `endless.js`, docs | Low: the campaign switch only; bossbench and Endless seeds shift |
| 9 | **Sixth land: champions, events and deeds** | Fill the Kiln to match: two champions behind its crown door, two more enemies (six of its own), a land event, a shrine, Kiln tints, a relic pair and deeds for the sixth verse. | `champions.js`, `encounters.js`, `shrines.js`, enemies, `unlocks.js`, journal | Low: campaign-only, room 3+ |
| 10 | **Elite affixes, second batch** | Add four elite affixes that use the newer lands (a Gusting elite that shoves, a Crystal elite that leaves spurs, a Tolling elite that rings a slow, a Cinder elite that trails fire), rolled only from room 4 on in the campaign. | `src/sim/affixes.js`, `src/render/` affix looks, cues, journal, `docs/ELITE_AFFIXES.md` | Low: campaign-only gate, room 4+ |
| 11 | **Relics and curses, sixth batch** | Add eight relics that react to the new content (secret rooms, the Duskwing's dives, the sixth land, the new affixes, Spire bosses) and three curses, one major. Give each its heirloom. | `src/sim/relics.js`, `docs/RELICS.md`, unlocks catalogue | Low: campaign-only gate |

### Floating (each can run alongside any slice above)

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 12 | **Small fixes 6** | Clear what plan 4 left: the Spire's rime and barricades not reskinned, the Spire cue levels measured instead of estimated, the Ash Raven's missing 'toll' instrument, and the stale probe reds (new-enemies Endless guest weight, Boss Rush Vein Weaver lap, the hazards probe's `autoAdvance` call). | `src/env/biomes/spire.js`, `src/audio/`, `tools/` | None to low |
| 13 | **Tuning after play** | Once Kesh has played, retune from his notes: the Stormglass 8 s beat, vow rank numbers and Ember pay, the champion hit flash, the Spire bosses and champions, prices. This one waits on him. | numbers across `src/sim/`, `src/data/` | Low: numbers only |

### Why this order

- **The Spire comes first** because it is the newest land and the only one behind the others. Both slices reuse machinery that is already proven (third bosses in plan 3, second champions in plan 4), so they are the cheapest content left on the table, and Boss Rush and Endless gain a fight from slice 1.
- **Secret rooms come next** because they change every campaign run from Level I and give the bombs a second use. They also give slice 11 something new to react to.
- **The Duskwing follows** because it fills the one role no hero plays (fast melee). The Thornwarden would be a second Tank and the Delver's burrowing minions overlap the Bellwright's bells, which already count against the summon caps. The three Duskwing slices can run in parallel with slice 3 (they touch different files), and its unlock on Level IV continues the pattern (Rill on Level II, Tolly on Level III).
- **The sixth land is split like Act V was**, so nothing half-built reaches the live game: slice 7 builds it behind a flag, slice 8 opens it only once its bosses exist, slice 9 fills it in. Slice 8 is shaped so either answer to the question below works.
- **Affixes and relics come last.** They react to everything above, and the affixes use the hazards the Spire and the Kiln bring.
- **Small fixes 6 floats** like the earlier fix rounds. **Tuning after play** waits on Kesh's notes.

## Notes per slice

1. **Spire third boss.** A suggestion: *The Weathercock*, a great iron vane-bird that turns the room's wind (gust lanes rotate with its facing), dives from the rafters and calls a squall of loose shingles. Gate it like the other thirds (opens after a Hush or Skyhorn kill, about one in three open Level V seeds). Its arena is layout 35, so the Spire reaches seven layouts.
2. **Spire second champion.** A suggestion: *The Bell Abbess*, a heron nun on a rope who swings across the room and rings a cone that silences skills for a beat. The pick is a hash of the seed, so each seed still meets one champion per level; FIVE_CROWN_ACTS already counts either champion of a land.
3. **Secret rooms.** A cracked wall shows a faint seam and a draught of dust, so it is findable without a guide. A chamber is a short side room using the vault code (no new currency, nothing carried past the run); it holds one of: a treasure pile, a relic pick, a tonic pair, a lore page for the Journal, or a rare event. Never in a boss, vault, shop or objective room. AI seats do not open walls; the autopilot does, so probes can reach them. The Daily gets the same walls for everyone.
4 to 6. **Duskwing.** Seven heroes, four seats: the Healer stays seat 0 and the player picks three of six to join. The standing rule holds: the picker chooses who joins the team, never who stays at camp, and in co-op each human picks their own hero first, then the host fills the empty seats with AI. Darkness is a blind status (shots miss more, enemies lose their target for a beat), so it needs one new status kind beside the nine.
7 to 9. **The sixth land.** The name, biome and verse are a working title; the thread can choose better ones. A fire land reads apart from the other five (wood, water, stone, crystal, sky), and kilns fit the bell story. Suggested enemies: an Ember Newt, a Slag Golem, a Bellows Imp and a Cinder Moth swarm. Memory: a sixth biome must stay inside the residency budget (`tools/memory-probe.mjs`, dressing cap five on small devices).
8. **Opening the sixth land.** **Settled 2026-10-17 by Kesh's tap: fork at Level V.** The Level IV clear card offers two roads: the Still Spire or the Ember Kiln. Each ends the run with its own ending and frees its own verse, so a profile needs both to hold six verses. The run stays 40 rooms, the Daily's depth check stays 40 and the seed picks its road, Endless cycles six lands, and Boss Rush picks one of the two Level V lands per lap. `CAMPAIGN_ACTS` stays 5.
10. **Affixes.** Each new affix gets an elite plate tag, a look and a Journal line. They are rolled from the campaign stream only after room 4, like the second champions, so earlier rooms roll exactly as before.
11. **Relics.** Suggestions: a Lantern that marks cracked walls on room entry, a Wing Bone that adds a dive to the hero's dodge, a Kiln Coal that sets bombed enemies alight, a Crown Shard that pays Glint for each affix on a felled elite. Curses: a Sealed Door (one secret per level stays shut), a Dimmed Lantern, and a major one that gives elites a second affix.

## Questions for Kesh

- **How the sixth land joins: settled 2026-10-17.** Kesh picked the fork at Level V: after Level IV the party picks the Spire or the Kiln, each road with its own ending and verse, and the run stays 40 rooms.
- **Which hero.** The plan picks the Duskwing bat (fast melee diver, the one role nobody plays). The others on the shortlist are the Thornwarden hedgehog (a second frontline) and the Delver mole (a burrowing summoner).
- **Still out of scope:** Echoes and Seals currencies, talent trees and camp facilities. Nothing above needs them. Secret chambers hold run loot only and add no currency.
