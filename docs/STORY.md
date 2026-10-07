# The Hearth Song (story and NPCs)

Slice 22 (v0.5.238). The design is Kesh's "Echoes: Story and NPCs" doc
(https://claude.ai/code/artifact/19e7cf84-6246-495b-870c-636c66eba009); this
page says what the build does and where it lives. The story adds no new rule
to combat: every NPC helps through a system the game already has, and the only
new piece of information is the peddler's rumour of the boss ahead.

## The story in one breath

The gods sang the world, and the world sang back. One night they fell silent
and sat down to watch, and something under the Barrow (the Hollow Heart)
began to sing a hollow copy in their place; the beasts that hear it turn
violet. The party carries the last bell that rings the true note. Each
level's boss is a land's warden caught by the hollow song; felling it frees
one **verse**, and the bell carries it home to the Hearth-Fire.

There are **seven** verses. Levels I to III free Root, Water and Stone; the
Hollow Heart (Act IV) frees the fourth, Heart. The other three are left
unwritten on purpose: each future Act adds a chapter in `CHAPTERS`, a verse,
a warden and lines, and nothing else has to change.

## The people

| Who | Where | What they do for the player |
|---|---|---|
| **Wick**, the Hearth-Keeper (an owl) | camp, on the woodpile by the hearth | Tells the prologue. E near him: his next line, which follows the verses held. U near him points at the Offerings (the cross-run unlocks). |
| **Bramble**, the Peddler (a tortoise) | camp stall; the peddler's clearing in a run | In camp, E: her next line. On her shelf (room 7) she tells the **rumour**: the boss behind the next door, by name, with one hint on how it fights. |
| **Quill**, the Chronicler | camp, at the map table | J (or his chip) opens **The story so far**: verse pips, one card per chapter (locked until its level is cleared), and the people met. |
| **Sedge**, the Lost Pilgrim | the Lost Pilgrim event room | Speaks on the card; a new line each time she is met (four). |
| **The First Bell** | the Wandering Spirit event room | Speaks on the card; four lines across meetings. |
| **The Hollow Voice** | the corrupted altar; each boss's first meeting | A violet line under the screen title: once per boss per profile, and when the altar is taken or left. |
| **The Chorus** (the gods) | run end cards | The defeat card's flavour line: a boss-room line, an early-fall line, a cursed-run line, or one of five general lines (seeded). |
| **Freed wardens** | camp edge | The Stag, the Heron and the Wyrm stand at the camp's edge as pale spirits once their level's boss (either one) has been felled, each with one line. |

Level-clear cards add "The bell catches a verse: Root." (Water, Stone,
Heart), and the victory card adds the verse plus an ending line: the Barrow
ending while the campaign has three levels, the Heart ending once it has
four. The hearth itself burns a step brighter (5% per verse) for each verse
held.

## When things appear

- **Prologue**: once per profile. On a first New Game it comes before the
  tutorial question; otherwise the first time a player stands in camp with
  nothing open for 1.5 s. A network guest never gets it from the host's camp.
  "Read the prologue again" on the story page shows it any time.
- Harness boots (`?seed=`, `?menu=0`, `?room=` ...) keep the popups (prologue,
  Hollow Voice) off unless `?story=1`, like the one-time tips; `?story=0` turns
  them off on a player URL. The camp NPCs, the rumour, card lines and the
  Chorus are always there; none of them touches the sim, so the nine goldens
  are unchanged.
- Meetings count per profile (`profile.story.met`), seen beats in
  `profile.story.seen` (`prologue`, `voice:<boss>`). Reset Progress keeps both.

## Code map

| File | What |
|---|---|
| `src/data/story.js` | All story text and tables (English keys): chapters, prologue, NPCs, people, line sets, rumours, boss voices, Chorus, endings, wardens, `versesHeld()`. |
| `src/ui/story/page.js` | The `story` page and the `prologue` screen. |
| `src/ui/story/index.js` | `service('story')`: the prologue trigger, the Hollow Voice line. |
| `src/scenes/campnpcs.js` | Wick, Bramble, Quill and the wardens in camp: models, bubbles, E/U/J, colliders. |
| `src/render/npcs/` | The NPC and warden models (`createNpc(id)`). |
| `src/env/camp/hearth.js` | `setHearthBoost(verses)`. |
| `src/ui/run/shop.js`, `encounter.js`, `transit.js`, `endscreens.js` | The rumour, card lines, verse line, Chorus and endings. |
| `src/save/profile.js` | `story {seen, met}`, `noteStory()`, `meetNpc()`. |
| `src/core/bindings.js` | `story` binding (J, camp group, rebindable). |

## Adding an Act

1. Add a `CHAPTERS` row (level, verse, title, summary) and an `ENDING` line.
2. Add the new bosses to `RUMOURS`, `BOSS_VOICE` and a `WARDENS` row (a model
   in `src/render/npcs/`, `also` for an alternate boss).
3. Add a `KEEPER_LINES.byVerses` and `CHRONICLER_LINES.byVerses` line for the
   new verse count.
4. Run `node tools/i18n-extract.mjs` and translate the new lines (docs/I18N.md).

## Probe

`node tools/story-browser.mjs [--lang de] [--shots dir]` walks a fresh
profile through the prologue, the three camp NPCs, the story page, the
pilgrim card, the rumour, the Hollow Voice, the verse line, the camp after a
cleared level (verse count, brighter hearth, freed Stag) and the Chorus on a
defeat card (29 checks).
