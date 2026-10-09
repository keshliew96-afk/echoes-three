# The Journal (content plan 2, slice 9)

The camp journal (**J**, or Quill's bubble at the map table) is one book with
five pages. **Q / E** (LB / RB on a gamepad) turn the page; the tabs can be
clicked too. Each tab shows how much of it the player has found.

| Page | What it lists |
|---|---|
| Story | The Hearth Song page from the story slice (docs/STORY.md), unchanged: verses, chapters, people. The book opens here. |
| Bestiary | The 21 enemies by land (the land they first appear in), the 4 champions (docs/CHAMPIONS.md) and the 8 bosses. Each entry: a turning model of the game's own rig, its role, the lands it lives in, a lore line, its attacks and the tells that warn of them, and how many the player has felled. |
| Relics | The 27 relics (icon in its rarity rim, rarity, class for class relics, effect, times taken) and the 10 curses (room or major, effect, times borne). |
| Events | The 8 event rooms: their line, what taking costs and gives, what leaving does, times visited. |
| Deeds | Every deed from Unlocks (docs/UNLOCKS.md), done or not, with its Ember reward. Deeds are goals, so none is hidden. |

An entry the player has not met yet is a dark silhouette with **???** for a
name. Enemies say which land to look in; event rooms say to look behind a
"?" door.

## Records

The profile gains a `journal` block (`src/save/profile.js`):

```js
journal: { seen: { enemy: { boar: 12 }, boss: { stag: 1 }, relic: { whetstone: 1 }, curse: {}, event: { healing_spring: 1 } } }
```

Each id maps to a count: enemies and bosses felled, relics taken, curses
borne, event rooms entered. A 0 means met but never counted (a relic seen on
a card or a shelf but not taken, an enemy that got away). A records reset
keeps the journal, like the Embers and the story.

`src/save/index.js` listens on the bus (a presentation listener, so the sim
and the nine goldens are untouched) and gathers a batch: `enemy_spawn` and
`boss_spawn` (met), `death` (felled; a Broodling counts on the Brood
Spider's page), `relic_offer` / `relic_shelf` (seen), `relic_gain` (taken),
`curse_taken`, `event_enter`. The batch is written in one atomic profile
write on `room_cleared`, `level_clear`, `run_end` and page hide.

Only campaign runs record: the campaign, Endless Descent and the Daily
Descent. The tutorial room and a developer's plain run (`?act=`) do not. A
network guest records from the host's replayed events onto its own profile.

The page also reads what the profile already kept before the journal
existed, so a returning player's book is not empty: bosses felled
(`meta.bosses`), relics found (`meta.relicsSeen`), and the rosters of every
level the profile has cleared (`records.levelClears`) count as met. Kill
counts start with this version.

## Code

- `src/data/journal.js`: the bestiary rows (name, role, lore, attacks and
  tells), lands from the level rosters.
- `src/ui/story/journal.js`: `journalInfo(profile)` and the four pages.
- `src/ui/story/viewer.js`: one offscreen WebGLRenderer, alive only while the
  journal is open, draws the enemy and boss rigs (`render/enemies`,
  `render/boss`) under the portrait light rig: the turning model of the
  picked entry, and one still per tile (cached for the session). Rigs are
  removed, not disposed, on close, because their geometry and materials are
  shared with the live game's rigs; losing the context frees what it
  uploaded.
- `src/ui/story/page.js`: the `story` screen is now the Journal; the Story
  page keeps its classes, so the story probe is unchanged.

## Probe

`node tools/journal-browser.mjs [--lang de] [--shots dir]` against
`npm run dev`: the empty book on a fresh profile, a Level I run (a room, an
event room, a relic, the Stag), then each page.
