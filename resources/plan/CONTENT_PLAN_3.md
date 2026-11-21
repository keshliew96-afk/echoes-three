# Content plan 3: the next slices

Written 2026-10-09 from gauntlet at b72ecdf (v0.5.253). This is a research pass with no code changes. It reads the game as it is now, `docs/BUILD_BRIEF.md` (rulings A8, A11 and A18), `/mnt/project-files/plan/CONTENT_PLAN_2.md` (all nine slices shipped as PRs #23 to #35) and the per-slice notes.

## Where the run loop is thin now

Plan 2 widened the rooms. A door can now lead to an event, and a combat room can be kill_all, defend, Hunt or Purge. Elites roll affixes, and Act IV is in. The game has 4 classes, 4 levels, 8 bosses, 21 enemy types, 20 layouts, 8 events, 8 affixes, 27 relics, 10 curses, Endless and Daily.

What stays thin:

- **Each act has only five or six enemies of its own.** Act IV has four. By Level III a player has seen the whole roster, and Endless only remixes it.
- **Nothing between an elite and the boss.** Rooms 1 to 6 build up to room 8 with no named fight in the middle, and nothing drops that carries from room to room inside a level.
- **The Gauntlet half of the loop is missing.** Gauntlet's own hooks are keys, locked treasure rooms, food and greed against danger. The game has Glint and the shop but no keys and no treasure rooms.
- **Two bosses per act** means a player sees every boss in about four campaigns.
- **Modes**: there are Campaign, Endless and Daily. There is no short mode that only fights bosses.
- **Replay hooks**: there are 18 deeds and 48 unlocks, and none of the deeds rewards events, objectives, affixes or Daily.

## Slices, ordered by how much they add

Each slice is one thread and one draft PR into gauntlet from its current head. Versions run from 0.5.254, every slice ships its text in all ten languages and adds one probe, and screenshots go under `/mnt/project-files/<slice>/`. Nothing merges before Kesh says go. The nine goldens (six `?room=` traces and three legacy `run` traces, `node tools/gntM2-goldens.mjs`) never see the campaign, so all new content is campaign-only (and Endless and Daily, which start through `startCampaign`). Skills and nodes go through `CAMPAIGN_ONLY_*` and `gatedPool()` in `src/data/classes.js`, and relics and curses through the campaign-only gate in `src/sim/relics.js`. Rosters and layouts are gated the same way, or added from room 4 on.

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 1 | **Champion rooms** | Put one named champion in every level, behind a marked door in room 4 or 5. Each act gets its own, four in all, and each is a mini-boss with two moves, a name plate, a sting and a relic chest. | new `src/sim/champions.js`, `levels.js`, run frame in `run.js`, door glyph, rigs, cues, journal | Low: campaign-only, room 4+ |
| 2 | **Keys and vaults** | Elites and champions drop a key that lasts the level. A locked vault door then appears on a later path screen and leads to a treasure room with Glint piles, a food platter and a relic or skill chest. AI seats and autopilot take the vault when they hold a key. | `run.js` path roll, `interactables.js`, a vault arena, HUD key pip, co-op host rule | Low: campaign-only |
| 3 | **New enemies: Wood and Mill** | Add two new enemies to the Hollow Wood and two to the Sunken Mill. Each has its own attack, Ember telegraph, rig and sound, and enters the act roster from room 3 on. | `src/sim/enemies/`, `src/render/enemies/`, `levels.js` rosters, `affixes.js` `not` lists, journal | Medium: rosters drive budget draws, so they must be gated off the legacy run |
| 4 | **New enemies: Barrow and Heart** | The same for the Ashen Barrow (two) and The Hollow Heart (two, which brings Act IV up to six of its own). Endless mixes them in as guests. | same as 3, plus `endless.js` guest weights | Medium, as 3 |
| 5 | **Autopilot and Endless curve** | Make the carried autopilot strong enough to bench new content again (Level I from 24/32 back to about 30/32, Level IV better than 2/13). Then re-run the Endless curve after the Depth 5 affix change and update `docs/ENDLESS.md`. | `src/sim/autopilot.js`, `partyai.js`, `tools/endless-run.mjs`, docs | None: autopilot is probe-only, and the AI seats change only if needed (re-record per the §16.9 proof) |
| 6 | **More event rooms** | Add six encounters, each tied to an act's land: a Mill sluice gamble, a Barrow ossuary, a Wood fey ring, a Heart crystal that grows curses into relics, a traveling smith who reforges a relic, and a gambler's dice. That brings the total to 14. | `src/sim/encounters.js`, event cards, `encountercues.js`, journal page | Low: events are campaign-only |
| 7 | **New objectives: Escort and Hold** | Add two combat objectives. In Escort a lost pilgrim walks across the room and must survive. In Hold the party keeps a sigil ring lit while waves come for a set time. Each gets a door glyph, a HUD banner, a bounty and autopilot support. | `src/sim/objectives.js`, `run.js` `assignObjectives`, HUD | Low: objectives are campaign-only |
| 8 | **New layouts** | Add two rooms to each act (20 to 28), each with its own hazards and dressing, including one large arena per act sized for Hold and champion fights. | `src/data/layouts.js`, biome dressings, arena paint | Low if the layouts go into the campaign tables only. Memory: five dressings stay resident, so check `tools/memory-probe.mjs` |
| 9 | **Relics and curses, fourth batch** | Add ten relics that react to the new content (champions, keys, vaults, Escort, Hold, the new events) and four new curses, including two major ones. Give each its heirloom. | `src/sim/relics.js`, `docs/RELICS.md`, unlocks catalogue | Low: campaign-only gate |
| 10 | **Third bosses: Wood and Mill** | Give the Hollow Wood and the Sunken Mill a third boss each, rolled by seed like the others. Each gets its own model, three-move kit, medal, sting, boss groove and deed. | `src/sim/bosses/`, `src/render/boss/`, `levels.js` `bosses`, `bosscues.js`, unlocks | Low: campaign boss tables only. The legacy run keeps the Stag |
| 11 | **Third bosses: Barrow and Heart** | The same for the Ashen Barrow and an alternate Hollow Heart boss. The Hollow Cantor stays the campaign's final boss, and the new one is rolled in Endless only. | same as 10 | Low, as 10 |
| 12 | **Boss Rush** | Add a seventh Level Select card that fights a seeded line of bosses back to back, one per act and then a second lap. A draft and a short shop come between fights. Record the best time and add deeds. | `startCampaign` option like Daily, `src/data/`, Level Select card, end card | None: its own entry point |
| 13 | **Deeds and unlocks, round two** | Add about fifteen deeds for the new content (every event seen, each affix felled, Hunt and Purge, champions, vaults, Daily streaks, Boss Rush). Add new Ember sinks to match: a kit per class from the 11-skill pools, Act IV tints, and two new vows. | `src/data/unlocks.js`, `docs/UNLOCKS.md`, profile save, unlocks screen | None: profile only |

### Loose ends (floating: each can run alongside any slice above)

| # | Slice | One-line brief | Touches | Golden risk |
|---|---|---|---|---|
| 14 | **Shop and Daily fixes** | Fit the shop into a 1024x640 window when relics are for sale. Allow one counted Daily attempt per day, with practice runs after that. Add server-side score checks to the Daily board: version, seed, day, and plausible time and depth per room. | `ui/run/shop.js`, `src/ui/run/daily.js`, `src/daily/client.js`, `server/daily.mjs` | None |
| 15 | **Tuning after play** | Once Kesh has played, retune and re-voice the bosses, the class skills and the synergy relics from his notes. This one waits on him. | numbers in `src/sim/bosses/`, `classes.js`, `relics.js`, cues | Low: numbers only, AI-seat traces checked |

### Why this order

- **Champions and vaults change every run from Level I on.** They also add the Gauntlet half of the loop (keys, treasure, greed against danger) that Kesh's goal names. Champions come first because they give keys something to drop from.
- **Enemies before layouts and events.** New enemies make every room of every act feel new. Layouts and events are seen less often.
- **The autopilot comes fifth** because every later slice tunes its numbers on the carried bench. That bench is weak now (Level I 24/32, Level IV 2/13), so slices 6 to 12 would be tuned against a bot that dies too much. Placing it after the new enemies means the Endless curve gets measured once, with them in.
- **The third bosses come late.** Each pair is a big PR, and a player meets the existing eight for a while yet.
- **Boss Rush and the deeds come last.** They reuse everything above, and the deed list covers all of it only once it exists.
- **Loose ends float.** Slice 14 is a small fix PR like Small fixes 1 and 2. Slice 15 needs Kesh's play notes before it can start.

## Notes per slice

1. **Champions.** A champion is an elite-class enemy with a boss-style plate and two telegraphed moves under the §11 governor. Champions are not bosses: no phase cards, no music change, just a sting. The door is a crown glyph, rolled on the run frame for room 4 or 5, at most one per level, and never on both doors of one choice. Endless gives each depth its land's champion. Suggested champions: the Briar Knight (Wood), the Sluice Warden (Mill), the Bone Reeve (Barrow) and the Hollow Choir (Heart).
2. **Keys.** A key drop is a relic-stream roll (elite 25 percent, champion 100 percent), so other streams stay untouched. Holding a key never forces the vault: the vault door replaces one door of a later choice. Keys reset at the level's end. In co-op the key belongs to the party and the host decides, like the doors.
3 and 4. **Enemies.** Every enemy needs its `not` entries in `affixes.js`, a journal row with lore in ten languages, and a `?vfxlab=1` row. Enemies with a summon or a split must respect the Splitting and Broodling caps.
5. **Autopilot.** "Weak" was measured in small-fixes-2: the autopilot lost ground after affixes and Act IV landed. The fix is in the bot's dodging of telegraphs and its target choice, and it should not touch the player-facing AI seats unless the measurements call for it.
7. **Escort** reuses the lost pilgrim model and the Hunt steering. **Hold** reuses Purge's spawn timer and the defend waystone's soft-fail.
10 and 11. **Third bosses.** Each one replaces or joins the `LEVELS[n].bosses` list. The by-seed pick (`levels.js`) becomes three-way, which moves which boss a given seed meets in campaign runs. That is fine for the goldens but changes `act4-bossbench` seeds.
12. **Boss Rush.** It is single player first, like Daily, and is locked in a net session until co-op is tried.
14. **Daily checks.** Full server replay of a run is out of reach for one slice. The checks are plausibility only, and the board stays best effort until Upstash is set on Render.

## Questions for Kesh (only if the brief should change)

- **Champions and keys.** Do they fit the brief? They add no new currency (keys are not Echoes or Seals and last only one level) and no camp facility.
- **Third bosses.** Does a third boss per act sound right, or should those two slices go to more acts instead? A fifth act would change the campaign length again, as Act IV did under ruling A18.
- **Still out of scope:** Echoes and Seals currencies, talent trees, camp facilities and classes beyond four. Nothing above needs them.
