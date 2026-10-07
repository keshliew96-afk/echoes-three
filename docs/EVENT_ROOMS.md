# Event rooms

Content plan 2, slice 1 (v0.5.233). Some doors on the path screen are marked
**"?"**. They lead to a small room with no fight that holds one of eight
encounters. Walk up to it, press **E · Inspect**, and a card offers a trade:
**Take** or **Leave**.

## Where "?" doors appear

- Campaign runs only (relics on), Endless descents included. Never the
  tutorial and never the legacy single-level run, so the nine goldens never
  see one.
- Rolled on the path screens leading to rooms 2 to 5, 40% each, at most two a
  level. Only one door of a choice can be "?", and never the cursed door: when
  a curse is offered, the "?" goes on the other side.
- No encounter repeats in a run until all eight have been met. The roll skips
  encounters that cannot be taken right now (Glint ones the wallet cannot
  pay, the altar when no major curse is left, the spirit with no relic).
- The "?" door replaces the next combat room, so the party gives up that
  room's stipend, clear spoils and draft. That is the price of the free
  encounters.

The numbers live in `EVENT_RULES` in `src/sim/encounters.js`.

## The eight encounters

| Encounter | Cost | Reward | AI takes it |
|---|---|---|---|
| Blood Shrine | every hero loses 25% of max HP (never below 1) | choose one of three relics | no |
| Wishing Well | 15 Glint | 50%: a relic; otherwise 35 Glint back | yes |
| Trapped Chest | a two-wave elite ambush (0.7 budget, +35% elite chance) | 25 Glint and a relic pick | no |
| Lost Pilgrim | 20 Glint | a Skill draft for the whole party | yes |
| Corrupted Altar | a random free major curse for the rest of the run | a legendary relic pick (rare if none are left) | no |
| Wandering Spirit | your newest relic | a rare or legendary pick, never the one given up | no |
| Forgotten Cache | free | 30 Glint for the party purse, 15 for each ally | yes |
| Healing Spring | free | the whole party heals to full | yes |

Leave always goes straight on to the doors. When Take is refused (not enough
Glint, say) the card opens on Leave and says why.

## Co-op, AI and autopilot

- The host decides, like the doors. Guests see the card and their pick is
  shown to the party; `openEncounter`, `focusEncounter` and
  `chooseEncounter` are host-only run mutators.
- AI seats and the autopilot take the safe ones (well, pilgrim, cache,
  spring) and leave the rest. Autopilot `events: 'leave'` always leaves and
  `events: 'avoid'` steers away from "?" doors.

## Code

- `src/sim/encounters.js`: rules, the eight encounters, the door roll and
  the encounter state machine. Its own seeded stream (salted `EVNT`), saved
  with the run.
- `src/sim/run.js`: phases `event` (walking up) and `encounter` (card open),
  the door on the path screen, Take effects, the chest ambush.
- `src/sim/relics.js`: `owe` with the new sources `altar` and `spirit`,
  `grantRandom`, `loseNewest`, `freeMajors`, `takeMajor`.
- `src/ui/run/encounter.js`: the card, the sigils and the walk-up plate.
- `src/render/interactables/encounters.js`: the eight props on a shared rune
  circle with a light shaft and motes; each reacts to Inspect and Take.
- First "?" door tip in `src/ui/tutorial/index.js`.
- Text in all ten languages (docs/I18N.md).

## Probes

- `node tools/eventrooms-probe.mjs`: headless sim checks (door rules over 40
  seeds, legacy run, all eight encounters via a real E, Leave, refusal,
  save/load mid-card, determinism).
- `node tools/eventrooms-browser.mjs [--only id,id] [--lang de]`: the real
  page against `npm run dev`; screenshots into `captures/event-*.png`.
