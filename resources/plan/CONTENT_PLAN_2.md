# Content plan 2: the next slices

Written 2026-10-07 from gauntlet at 5eb30ff (v0.5.232). This is a research pass with no code changes. It reads the game as it is now, `docs/BUILD_BRIEF.md`, `docs/CONTENT_PLAN.md`, `docs/RELICS.md`, `docs/ENDLESS.md` and `docs/UNLOCKS.md`.

## Where the run loop is thin now

Each level is still the same eight-room skeleton (`src/sim/run.js`): rooms 1 to 6 are combat, room 7 is the shop and room 8 is the boss. A combat room has only two objectives, `kill_all` and `defend` (the waystone). Every door between rooms leads to a fight, and the only choice the party makes there is the reward type plus, sometimes, a curse.

The content around that skeleton is already wide: 17 enemy types, 6 bosses, 15 layouts, 17 relics and 10 curses. The skeleton itself has not changed since the original brief. So the biggest gains now come from giving the rooms themselves more variety (what a door can lead to, what a room asks of the party, what an elite can do). After that comes more world, in the form of Act IV.

Skill pools have not grown since the per-character builds work: the Healer has 17 skills, the other three classes 8 each, and there are about 36 nodes.

## Slices, ordered by how much they add

Each slice is about one thread and one PR of roughly 1000 to 2000 lines. Each one keeps the nine goldens identical by making the new content campaign-only or introducing it from room 4 on, the way layouts 10 to 15 and the slice-2 enemies did. Each one also ships its text in all ten languages, a `?vfxlab=1` row and a headless probe.

| # | Slice | One-line brief |
|---|---|---|
| 1 | **Event rooms** | Add a third kind of door, an event marked "?", that leads to a small non-combat room with one of eight seeded encounters (blood shrine, wishing well, trapped chest ambush, lost pilgrim, corrupted altar, wandering spirit, forgotten cache, healing spring), each a trade of HP, Glint, curse or skill for a reward. |
| 2 | **New room objectives** | Add two combat objectives next to kill_all and defend, Hunt (a marked quarry flees through the room and the party must kill it before it escapes) and Purge (destroy three corruption nests that keep spawning), each with its own door glyph, HUD banner and autopilot support. |
| 3 | **Elite affixes** | Give elites one or two named affixes from a set of eight (Molten, Frozen, Vampiric, Warded, Blinking, Splitting, Hasted, Thorned), each with an Ember telegraph, a name plate and AAA VFX, and let deeper levels and Endless roll two. |
| 4 | **Act IV: The Hollow Heart (world and roster)** | Add a fourth level under the Barrow where the violet corruption begins, with its own biome, music theme, five layouts and four new enemies; extend the campaign to four levels and the Endless cycle to four biomes. |
| 5 | **Act IV bosses** | Give Act IV two bosses rolled by seed. One is the campaign's final boss (the corruption's heart, three phases using all three acts' adds), the other is an alternate. Both get medals, stings and boss grooves, plus the matching deeds and unlocks. |
| 6 | **More class skills** | Grow the Tank, Swordsman and Archer pools from 8 to 11 skills each and add two Healer skills and six nodes, so a build has more to find across a campaign. |
| 7 | **Relics, third batch** | Add ten relics built around synergies: one per class (for example a Tank relic that makes taunts heal), pairs that combine, and relics that react to events, objectives or affixes. Add their heirlooms too. |
| 8 | **Daily Descent** | Add a daily seed that everyone plays with the same fixed relic and curse, and a small leaderboard on the existing server ranking depth and time, entered from the Level Select. |
| 9 | **Bestiary and journal** | Add a camp journal (key J) that records every enemy, boss, relic, curse, event and deed seen, with a rotating model, a lore line and kill counts, so a player can see what is still undiscovered. |

### Why this order

- **1 to 3 change every run, from Level 1 on.** The player Kesh plays most (Level 1) sees them at once. Slices 4 and 5 are only reached by a party that clears Act III.
- **Event rooms come first** because a door that does not always mean a fight is the largest change in how a run feels. It also gives later relics (slice 7) something to react to.
- **Objectives come before affixes**, because they vary the room rather than the enemy. Affixes then make the existing 17 enemies feel new in every act and in Endless.
- **Act IV is two slices**: the world and roster first, then the bosses. One PR holding a biome, layouts, enemies and two bosses would be well over 2000 lines. Until slice 5 lands, Act IV can borrow the Act III bosses on its own numbers, as Endless already does.
- **Skills and relics come after the room work.** The draft and relic systems already have breadth, so more entries there add less than new room types do.
- **Daily Descent and the journal add reasons to come back.** They add little new play, so they come last.

## Notes per slice

1. **Event rooms.** Event doors are rolled on the run frame for rooms 2 to 5, at most two per level, and never both doors of one choice. The event room uses the shop-sized arena. An encounter is an interactable plus a choice card (take or leave). The chest ambush is the one encounter that becomes a short fight. Events are campaign-only, so the legacy run and goldens never see them. The AI seats and autopilot take the safe option. In co-op the host decides, like the doors.
2. **Objectives.** Hunt reuses the steering and fleeing logic already used by kiting enemies, and the quarry is one of the act's own enemies made elite. Purge nests are hazards with HP that spawn from the act's roster on a timer. A room-clear soft-fail works like a defend loss: the reward is forfeited.
3. **Affixes.** Every affix must keep to the §11 governor (two player-targeted telegraphs at most, at least 1.2 s apart). Warded reuses the Grave Wisp's `hit_immune` and Splitting reuses the Broodling split, which keeps the code small.
4. **Act IV.** This changes ruling A11 ("three expeditions"), see the question below. The difficulty tier would be about T 2.15, and Endless past Depth 4 rebases on Act IV numbers. Deeds and Embers move: Level IV cleared, and The Long Road then needs four levels.
5. **Final boss.** It is a violet God-stuff figure, the only boss besides the Stag allowed the violet palette. The CAMPAIGN COMPLETE card moves after it.
8. **Daily Descent.** The server already persists cloud saves (Render disk, or Upstash when it is set), and the leaderboard can use the same store. Without Upstash, scores reset on each redeploy, the same as cloud saves.

## Small follow-ups (each a short PR, not a slice)

- **Slide sound**: a procedural WebAudio slide sound for the wet-stone and frost floors (`src/audio/`).
- **German Controls labels**: fix the two truncated labels in Settings ▸ Controls.
- **Co-op ping**: the connection chip should show the ping to the other player over the direct link, not to the server.
- **Archer in deep Endless**: the Archer's share of downs rises again past Depth 3, so give the ranged AI seat more spacing at high damage steps.

## Questions for Kesh (only if the brief should change)

- **Act IV.** Ruling A11 fixes the campaign at three expeditions. Slices 4 and 5 assume a fourth level is welcome. The other option is to put Act IV in the Endless Descent only (Depth 4 onward), which keeps the campaign length as it is.
- **Still out of scope**: Echoes and Seals currencies, talent trees, camp facilities and classes beyond four. Nothing above needs them. The journal (slice 9) is a screen, not a camp facility.
