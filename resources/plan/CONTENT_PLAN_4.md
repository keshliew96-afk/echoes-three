# Content plan 4: the next slices

Written 2026-10-11 from gauntlet at c5457d0 (v0.5.274). This is a research pass with no code changes. It reads the game as it is now, `docs/BUILD_BRIEF.md` (rulings A8, A11 and A18), `docs/STORY.md`, `docs/UNLOCKS.md`, `docs/BOSS_RUSH.md`, `/mnt/project-files/plan/CONTENT_PLAN_3.md` (all 13 slices plus loose end 14 shipped as PRs #41 to #59), `/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md` and the per-slice notes.

## Where the run loop is thin now

Plan 3 widened everything inside a level. The game now has 5 classes, 4 levels, 12 bosses (a third per act), 4 champions, 29 enemy types, 28 layouts with an arena per act, 14 events, 4 objective rooms (plus defend and kill_all), 8 affixes, 39 relics, 14 curses, keys and vaults, Campaign, Endless, Daily and Boss Rush, and 44 deeds with 78 unlocks (11 kits, 39 heirlooms, 19 tints, 6 vows, 3 purses).

What stays thin:

- **The campaign is four levels and the story says seven.** `docs/STORY.md` leaves three verses unwritten on purpose, and "Adding an Act" is already a short checklist. The Endless walls (Heart at Depth 8, Barrow at 11) mean a strong party runs out of new places fast.
- **Nothing the player carries and spends.** Gauntlet's own hooks are keys, treasure, food and the potion you save for a bad moment. The game has keys, vaults and food, but every drop is used on the spot. There is no item a player holds and decides when to use.
- **One champion per act.** Every Level I run meets the Briar Knight in room 4 or 5, so the crown door is a known fight by the third run.
- **Act IV has no ground of its own.** The Heart borrows the Barrow's hazards (rockfall, gravefire, slip) and has only the three shared interactables. No act has a shrine or anything to stop and use mid-room besides the dewfont.
- **Vows are on or off.** There are six, each a flat switch. There is no stacked difficulty with a record to beat, which is what keeps a won save coming back (Hades' Heat).
- **Five characters, and the shortlist is waiting.** The lineup picker already chooses who joins the team, so a sixth character costs three slices, not four.

## Slices, ordered by how much they add

Each slice is one thread and one draft PR into gauntlet from its current head. Versions run from 0.5.275, every slice ships its text in all ten languages and adds one probe, and screenshots go under `/mnt/project-files/<slice>/`. Nothing merges before Kesh says go. The nine goldens never see the campaign, so all new content is campaign-only (and Endless, Daily and Boss Rush, which start through `startCampaign`) or enters from room 4 on: skills and nodes through `CAMPAIGN_ONLY_*` and `gatedPool()` in `src/data/classes.js`, relics and curses through the campaign-only gate in `src/sim/relics.js`, rosters and layouts through the campaign tables in `src/data/levels.js` (never `legacyLayouts`), objectives through `objectivesOn()`.

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 1 | **Tonics and bombs** | Give every hero one carry slot for a consumable, Gauntlet's potion. Six kinds (a heal tonic, a haste draught, a ward flask, a fire bomb, a frost bomb and a bell charm that clears enemy shots), found in vaults, champion chests and elite drops, and sold in the shop. Use is one rebindable key and a pad button, AI seats and the autopilot use theirs, and the HUD shows the slot. | new `src/sim/consumables.js`, `run.js` drops, `shop.js`, HUD slot, `bindings.js`, `allies.js`, `autopilot.js`, VFX, cues | Low: campaign-only, drops by hash roll like keys (no run-stream draw) |
| 2 | **Act V world and roster** | Build Level V, *The Still Spire* (the gods' high belfry where they sat down to watch): biome `spire`, five layouts plus an arena, dressing, music, ambience, its own hazard (gust vents that shove) and four new enemies. It plays only behind `?act5=1` while `CAMPAIGN_ACTS` stays 4. | `src/env/biomes/spire.js`, `levels.js`, `layouts.js`, `src/sim/enemies/`, `src/render/enemies/`, `music.js`, `ambient.js`, `hazards.js`, journal | Low: behind a flag, campaign tables only |
| 3 | **Act V bosses** | Give the Spire two bosses, a final boss (*The Hush*, the silence that stopped the gods) and an alternate, each with a model, three moves, medal, sting, groove, rumour and Hollow Voice line. Then set `CAMPAIGN_ACTS` to 5: the Sky verse, a chapter, a warden and a new ending; Endless cycles five biomes; Boss Rush becomes ten fights; the Daily board's depth check follows. | `src/sim/bosses/`, `src/render/boss/`, `levels.js`, `story.js`, `rush.js`, `server/daily.mjs`, `endless.js`, docs | Low: the campaign switch only; `act4-bossbench` and the Endless seeds shift, as they did for Act IV |
| 4 | **Bellwright playable** | Add the sixth character, a beetle bell-ringer from the Barrow: a zone caster who hangs bells that toll on a beat and rings them all at once. Model, picker card, base kit of four skills and a design section in `docs/BELLWRIGHT.md`; free from the start in this slice. | `src/data/classes.js`, `lineup.js`, `src/render/` rig, `classpick.js`, `skills.js` | None: default lineup unchanged |
| 5 | **Bellwright kit, VFX and sounds** | Fill the kit to eleven skills and eight class nodes, with its own VFX file and cue set, and vfxlab reels. | `classes.js`, `nodes.js`, `partytech.js`, `allycast.js`, `src/render/vfx/`, `src/audio/` | None: campaign-only skills and nodes |
| 6 | **Bellwright in the world** | Lock her until the first Level III clear, then give her camp talk, story lines, a kit and two tints, two deeds, two class relics, a Journal page and tips. | `unlocks.js`, `story.js`, `campnpcs.js`, `relics.js`, journal | None: profile and campaign-only relics |
| 7 | **Act V champion, events and deeds** | Fill the Spire to match the other acts: a champion behind its crown door, two more enemies (six of its own), two land events, Spire tints and an heirloom-ready relic pair, and deeds for the Sky verse and the Hush. | `champions.js`, `encounters.js`, enemies, `unlocks.js`, journal | Low: campaign-only, room 3+ |
| 8 | **Second champions** | Give Acts I to IV a second champion each, picked by seed at the crown door, with its own two moves, rage, plate, sting and chest. The Journal row grows to nine. | `src/sim/enemies/champions.js`, `champions.js` crownFor, rigs, cues, journal | Low: campaign-only, room 4+ |
| 9 | **Hazards and shrines** | Give the Heart its own hazard (crystal spurs that rise under a hero's last spot) and add a shrine per act: a room interactable that trades something (HP, Glint, a curse) for a 60 s blessing. Every act then has at least one thing to stop and use besides the dewfont. | `hazards.js`, `interactables.js`, `levels.js` act lists, biome dressings, VFX, cues | Low: placed only in campaign tables, room 4+ |
| 10 | **Vow ranks** | Turn the six vows into ranked vows (up to three ranks each, Spire vows added once Act V is in). The ranks add up to a Vow level shown at Set out, which raises Ember pay and is recorded as a best per mode, with deeds at 5, 10 and 15. | `unlocks.js`, `run.js` vow hooks, camp Set out page, `profile.js`, end card | None: vows only change a run when picked |
| 11 | **Relics and curses, fifth batch** | Add eight relics that react to the new content (consumables, shrines, second champions, the Spire, the Bellwright's bells) and three curses, one major. Give each its heirloom. | `src/sim/relics.js`, `docs/RELICS.md`, unlocks catalogue | Low: campaign-only gate |

### Loose ends (floating: each can run alongside any slice above)

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 12 | **Small fixes 3** | Fix what plan 3 left: the Vein Weaver's splayed legs and how rarely it appears, the AI leaving Heart Censers alive after the Colossus, the Daily's 4 s a room floor checked against real play, and the option to cap resident dressings at five (GPU 276 MB). | `render/boss/`, `allies.js`, `server/daily.mjs`, `arena.js` | Low: AI seat changes re-checked against the goldens |
| 13 | **Tuning after play** | Once Kesh has played, retune the third bosses, champions, Escort and Hold, Boss Rush, deed levels and prices from his notes. This one waits on him. | numbers across `src/sim/`, `src/data/` | Low: numbers only |
| 14 | **Co-op Boss Rush** | Open Boss Rush to a co-op party once a cross-network co-op game has been tried; the Daily stays single player for the board. | `levels.js` card gate, `rush.js`, `src/net/` | None |

### Why this order

- **Tonics and bombs come first** because they change every run from Level I and add the last Gauntlet hook the goal names: something you carry and save for a bad moment. They also give slice 11 something to react to.
- **The fifth act is split so nothing half-built reaches the live game.** Slice 2 builds the Spire behind a flag; slice 3 opens it only when its bosses exist. Act IV shipped with borrowed bosses, and plan 3 then spent four slices filling it in.
- **The Bellwright follows the act** so the two can run as parallel threads (they touch different files), and Kesh merges one at a time. Her unlock sits on Level III, so she does not wait on Act V.
- **Act V's champion and events come after the character** because they reuse the champion and event machinery, and slice 8 (second champions) is easier once a fifth champion shows the pattern again.
- **Vow ranks and the relic batch come last.** Vow ranks need the Spire to rank against, and the relics react to everything above.
- **Loose ends float.** Slice 12 is a small fix PR like Small fixes 1 and 2. Slice 13 needs Kesh's play notes. Slice 14 needs a real co-op try first.

## Notes per slice

1. **Consumables.** One slot per hero, so a second find replaces or is left on the floor (walk over to swap). Drop rolls hash the seed and room like `eliteDropsKey`, so other streams stay untouched. Shop price around 25 to 40 Glint. In co-op each human owns their slot; AI seats use theirs on simple rules (tonic under 35% HP, bomb into a crowd of four). The Daily gets them too, the same for everyone. Not a currency: nothing carries past the run.
2. **The Spire.** Suggested enemies: a Gust Kite (flier that dives in a lane), a Chime Wraith (rings a slowing pulse), a Gargoyle (stone until a hero comes close) and a Rope Hanger (swings across the room). Gust vents push heroes along a line on a beat, like slip but readable. Memory: a fifth biome means its dressings must stay inside the residency budget (`tools/memory-probe.mjs`).
3. **Opening Level V.** The Hollow Cantor stops being the last fight; the Heart ending becomes a level-clear line and the Spire gets the victory ending. The campaign grows to 40 rooms, and a won Daily needs Depth 40 (the server check reads `8 * CAMPAIGN_ACTS`). Boss Rush records per fight count, so ten-fight bests do not compare against old eight-fight times. Third bosses for the Spire are left for a later plan.
4 to 6. **Bellwright.** Six characters, four seats: the Healer stays seat 0 and the player picks three of five to join. The standing rule holds: the picker chooses who joins the team, never who stays at camp, and in co-op each human picks their own character first, then the host fills the empty seats with AI. Her bells are bodies with a cap of three, so they count against the summon caps.
8. **Second champions.** Suggested: the Moss Hart (Wood), the Lockkeeper (Mill), the Gravebell Ringer (Barrow) and the Vein Matron (Heart). The pick is a hash of the seed, so each seed still meets one champion per level.
9. **Shrines.** A shrine is used once per room with E, never placed in the boss room or the vault, and the AI seats leave it alone. Each act's shrine has its own trade (Wood: HP for haste, Mill: Glint for a ward, Barrow: a minor curse for damage, Heart: a key for a relic pick).
10. **Vow ranks.** Today's vows are rank 1, so old saves keep what they picked. The Daily stays vow-free. Boss Rush and Endless each keep their own best Vow level.

## Questions for Kesh (only if the brief should change)

- **Fifth act.** Should Level V join the campaign (40 rooms, as Act IV did), or open only after the four-level campaign is won? The plan assumes it joins the campaign, and the Daily follows it.
- **Which character.** The plan picks the Bellwright beetle (a bell zone caster, which no class plays like, and the bell is the story's own symbol). The others on the shortlist are the Thornwarden hedgehog, the Delver mole and the Duskwing bat.
- **Tonics and bombs.** Do they fit the brief? They are not a currency, last only the run, and need no camp facility.
- **Still out of scope:** Echoes and Seals currencies, talent trees and camp facilities. Nothing above needs them.
