# The Tidecaller (Rill)

v0.5.261. Slice 2 of the new-character plan
(`/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md`). Rill is an otter and
a ranged control caster. She soaks enemies, drags them together, then
crashes a wave into the soaked. This slice makes her playable with her base
kit. Slice 3 adds her other seven skills, her eight class nodes, the full VFX
beats and sounds. Slice 4 adds the Level II unlock, story, deeds, relics and
the Journal.

## Who gets her

- `TIDECALLER_FREE` (`src/data/lineup.js`) is true for now, so she is open
  from the start. Slice 4 swaps it for the Level II boss unlock.
- Campaigns only (Endless and Daily included). The tutorial, the legacy
  single-level run and `?room=` stay the default four.
- Four seats, five classes: one of Tank, Swordsman and Archer stays at camp
  and Rill takes that seat (docs/LINEUP.md). Picking her on the class picker
  opens "Who stays at camp?"; with nothing chosen the Archer stays.

## Kit

| | what | numbers |
|---|---|---|
| Spit (basic) | a water bolt | 6 damage, 0.35 s, range 4.5 |
| Dive (dodge) | the usual dodge, plus a puddle where she lands | soaks enemies in 0.7 u for 1 s |
| Riverbolt | projectile | 14, cd 2.5, range 5, soaks |
| Undertow | ground zone, 4 s | 6 per second, cd 8, area 1.0, soaks, drags 0.25 u per pulse toward its centre (not bosses) |
| Breaker | nova around her, **Crash** | 22 to up to 5, cd 8, area 1.4, knockback 1.0 |
| Tidepool | passive aura | every second, 5 to the 2 nearest within 2.5, soaks |

Body: 85 HP, move speed 2.5. Numbers are first guesses
(`src/sim/skills.js`, `src/sim/allies.js`, `CLASS_TECH.tidecaller` in
`src/data/classes.js`).

## Soaked and Crash

- **Soaked** is a hostile-only status (`src/sim/status.js`): 15% slower for
  4 s (`soakMag`, `soakTicks`). Bosses are capped at 5%. Frozen elites
  refuse it. Re-soaking refreshes it.
- **Crash**: a hit from a skill marked `crash` (Breaker for now) on a soaked
  enemy does +60% (`crashMul 1.6`) and spends the soak. It emits a `crash`
  event, which the render answers with a cobalt flash and the audio with a
  crash cue.

## Her AI (`src/sim/partyai.js`)

- Riverbolt prefers a dry target, so soaks spread.
- Undertow goes on the densest pack, with a bonus near the Tank or the
  Waystone.
- Breaker waits for two or more soaked enemies in reach, or one soaked elite,
  champion or boss, or an enemy rushing her.
- Tidepool is passive.

## Where it lives

- Data: `src/data/classes.js` (class rows, campaign-only skills, shared
  nodes), `src/data/lineup.js`, `src/sim/skills.js`.
- Sim: `src/sim/allycast.js` (crash, drag), `src/sim/allies.js` (body,
  Dive puddle, drag zones), `src/sim/party.js` (aura status), `src/sim/world.js`
  (`campLineup`).
- Render: `src/render/critters/tidecaller.js` (otter rig), soaked and crash
  in `src/render/skillfx/content.js`, palette and `CLASS_VFX.tidecaller`.
- UI: `src/ui/run/classpick.js` (five cards and the bench view),
  `src/scenes/camp.js` (Lineup chip, camp spot), icons, cards, portraits.

## Checks

- `node tools/tidecaller-probe.mjs` (headless, 39 checks): data, the soaked
  rules, Rill fighting in seat 3, Undertow pulling, Crash +60% and spending
  the soak, the Dive puddle, the shop shelf and a save round trip.
- `node tools/lineup-probe.mjs` 33/33, `node tools/gntM2-goldens.mjs` 9/9.
