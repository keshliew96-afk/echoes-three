# The Tidecaller (Rill)

v0.5.262 (slice 2), v0.5.264 (slice 4). The new-character plan
(`/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md`). Rill is an otter and
a ranged control caster. She soaks enemies, drags them together, then
crashes a wave into the soaked. Slice 2 made her playable with her base kit.
Slice 3 adds her other seven skills, her eight class nodes, the full VFX
beats and sounds. Slice 4 (below, "Rill in the world") adds the Level II
unlock, her story, kit and tints, two deeds, two relics, the Journal and tips.

## Who gets her

- She is **locked** on a fresh profile (`TIDECALLER_FREE` is false in
  `src/data/lineup.js`). The first Level II clear on this player's profile
  frees the Verse of Water and Rill with it (see "Unlock").
- Campaigns only (Endless and Daily included). The tutorial, the legacy
  single-level run and `?room=` stay the default four.
- Four seats, five classes: the player chooses who joins the team
  (docs/LINEUP.md). The Healer always does, the class you play always does,
  and the rest is your pick, today's party by default. Picking her on the
  class picker opens "Who joins the team?" with her in the Archer's place.
- Co-op: each player picks a character in the lobby, then the host picks who
  joins as AI for the empty seats. Each player's own profile decides whether
  they can pick her; a lineup that already holds her (the host's run seen by
  a guest who has not freed her, a save) always stays valid.

## Unlock

- The feat `tidecaller` in the profile's `meta.feats` (`FEATS` in
  `src/data/unlocks.js`). `featsOf(meta, records)` also counts it as held when
  the records already prove it: a Level II clear (`records.levelClears[2]`),
  or the Drowned Heron or the Millwheel felled (`meta.bosses`). The boot sync
  (`grantFreeUnlocks`) stores it, so a save from before this build frees her
  on load, and a Records reset (which keeps `meta`) never locks her again.
- Mid-run: the save service hears `level_clear` for Level II and calls
  `noteFeat('tidecaller')`. The first time, a toast says "The Tidecaller joins
  the party. Rill waits at the hearth." A network guest hears the host's clear
  and frees her on its own profile.
- `src/main.js` sets `setTidecallerUnlocked()` from the profile at boot and on
  every profile change (another tab included). `?rill=1` opens her on a
  harness boot (`forceTidecaller`), for probes.
- The flag gates choosing her only: the class picker shows her card locked,
  with what frees her; the team view, the camp's Team chip, the lobby roster
  and the `gameplay.playClass` / `gameplay.team` settings leave her out.
  `normalizeLineup` never reads it, so the sim never depends on a profile.

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

## Rill in the world (slice 4)

- **Camp.** Locked, she is not at the fire. Freed, she sits on the sluice side
  (`CAMP_SPOTS.tidecaller`); walk up while she is at her spot and her bubble
  shows a line by the verses held (`RILL_LINES`, `src/data/story.js`); E moves
  on a line and counts a meeting. Wick gains a line about her.
- **Story.** The Level II clear card adds a line: freed by this clear, or
  singing along when she is in the party (`RILL_CLEAR`). The first time she
  stands in a Mill boss room the Hollow Voice speaks to her (`RILL_VOICE`,
  after its boss line). The Journal's People list shows her once freed.
- **Unlocks (Embers).** Kit *Millrace* (80, needs her): Riverbolt, Undertow,
  Torrent, Bubble Ward (a kit only carries skills that exist, so Torrent and
  Bubble Ward join it with slice 3). Tint *Brine* (30, needs her). Tint *Heron
  Rain* (free): fell the Drowned Heron with her in the party (feat
  `rill_heron`). Loadouts carry a Tidecaller kit and tint slot.
- **Deeds.** *Rill's Return* (25): clear a level with her in the party (the
  run's builds). *High Water* (30): crash 5 soaked enemies with one cast (the
  save service counts `crash` events sharing a tick, seat and skill).
- **Relics** (class relics, offered only while she is in the party, so never
  to the default four; never the Daily omen). *Otter's Pearl* (common): each
  crash heals her for 2. *Millrace Charm* (rare): every fourth party hit on a
  soaked enemy spreads the soak to another enemy within 1.5 u. The plan said a
  25% chance; a count keeps the relic stream untouched. Icons, proc VFX and
  cues like the other class relics.
- **Tips.** `lineup` the first time the team view opens (after the class
  tip), `soaked` mid-fight the first time a soaked enemy is crashed, and the
  `classes` tip names five heroes once she is freed.
- **Daily.** The board's class pip carries her colour and a class name tip;
  the server accepts `tidecaller` as a class.

## Checks

- `node tools/tidecaller-probe.mjs` (headless, 43 checks): data, the soaked
  rules, Rill fighting in seat 3, Undertow pulling, Crash +60% and spending
  the soak, the Dive puddle, the shop shelf and a save round trip.
- `node tools/tidecaller-world-probe.mjs` (headless, 41 checks): the unlock
  (fresh, feat once, old saves, the Heron or the Millwheel, a Records reset),
  the kit, tints and loadouts, both deeds, both relics in a real fight and a
  save round trip, the story data.
- `node tools/tidecaller-world-browser.mjs` (dev server): the locked card,
  the team view without her, freeing her, her camp bubble and talk, the open
  card, the Unlocks screen and the Journal. Screenshots under
  `/mnt/project-files/tidecaller-world/`.
- `node tools/lineup-probe.mjs` 33/33, `node tools/gntM2-goldens.mjs` 9/9.
