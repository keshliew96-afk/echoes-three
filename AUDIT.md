# Echoes audit (feature freeze, 2026-11-10)

Audit only: nothing in the game was changed to write this. Measured on `gauntlet` d8546aa (v0.5.350).
Each problem has an id (D1, X2, ...) so a cleanup can be approved item by item.

Size of the codebase: 470 JavaScript files under `src/` (about 220,000 lines), 11 server files
(3,600 lines), 930 probe scripts and 2,250 recorded action files under `tools/`.

## 1. Systems and where they live

| System | Files |
|---|---|
| Boot and wiring | `src/main.js` (boot, scene registry, render loop, the whole `window.__echoes` debug API), `index.html`, `vite.config.js` |
| App shell and screens | `src/app/app.js` (title / camp / run / pause state machine), `screens.js`, `nav.js`, `loop.js` (frame pacing), `display.js`, `settings.js`, `style.js`, `toast.js`, `widgets.js`, `titlecam.js`, `harness.js` and `params.js` (URL params, player-build gating), `registry.js` (services), `events.js` + `emitter.js` (app events) |
| Sim core | `src/core/clock.js` (60 Hz fixed tick, hitstop), `rng.js` (gameplay and cosmetic streams), `registry.js` (entities, spawn order), `events.js` (sim event bus), `hash.js`, `canonical.js`, `constants.js` |
| Input and controls | `src/core/input.js`, `intents.js`, `bindings.js`; `src/app/controls.js`, `gamepad.js`; `src/ui/menu/tabs/controls.js` |
| Movement and collision | `src/sim/movement.js`, `src/sim/world.js` (dash, steering), `src/env/camp/colliders.js`, `src/sim/remote.js` (human seats in co-op) |
| Combat | `src/sim/combat.js`, `projectiles.js`, `status.js`, `shapes.js`; hit reaction `src/render/react.js`; numbers `src/render/numbers.js`; hit feedback `src/render/vfx/hitfeedback.js`, `src/audio/hitcues.js`, setting row `src/ui/run/hitfeedback.js` |
| Skills (Healer, seat 0) | `src/sim/skills.js` (the SKILLS table for every class, Healer casting, cooldowns), `src/sim/nodes.js` (sockets, techniques), `src/sim/draft.js` |
| Skills (seats 1 to 3) | `src/sim/party.js` (seat builds), `allycast.js` (ally cast pipeline), `partytech.js` (node techniques), `partypage.js` (party cards), `duskwing.js` |
| Heroes and lineup | `src/data/classes.js`, `lineup.js`, `src/app/playclass.js`, `src/ui/run/classpick.js` |
| AI | `src/sim/allies.js` (ally AI, revive, rally), `partyai.js`, `autopilot.js` (test bot) |
| Enemies | `src/sim/enemies.js` (archetype contract, boar, mantis), `src/sim/enemies/*.js` (41 kinds), `src/sim/affixes.js` (elite powers) |
| Champions | `src/sim/champions.js` (crown door), `src/sim/enemies/champions.js` (the champions) |
| Bosses | `src/sim/boss.js` (Hollow Stag), `src/sim/bosses/*.js` (16 more) |
| Runs and campaign | `src/sim/run.js` (rooms, rewards, shop, campaign, Endless, Daily, Boss Rush, debug commands), `waves.js`, `objectives.js`, `encounters.js`, `secrets.js`, `src/campaign/manager.js`, `maptable.js` |
| Room extras | `src/sim/hazards.js`, `shrines.js`, `vaults.js`, `consumables.js`, `relics.js`, `interactables.js` |
| Content data | `src/data/levels.js`, `layouts.js`, `campaign.js`, `difficulty.js`, `endless.js`, `daily.js`, `rush.js`, `vows.js`, `unlocks.js`, `journal.js`, `story.js`, `palette.js`, `vfx.js`, `content.js` |
| Map and dressing | `src/scenes/arena.js` (rooms), `src/scenes/camp.js` + `campnpcs.js` (camp), `src/env/*.js` (ground, props, walls, foliage, treeline), `src/env/biomes/*.js` (one per land, paint worker), `src/env/camp/*.js` |
| Hero models | `src/render/critters/*.js` (classic rigs and `*facet.js` model-standard rigs), `src/render/facet/*.js` (shared model-standard kit), `src/render/allies/index.js` |
| Enemy and boss models | `src/render/enemies/*.js` (classic), `src/render/enemies/facet/*.js`, `champfacet/*.js` (model standard), `src/render/boss/*.js` (both kinds), telegraphs `src/render/enemies/telegraphs.js`, `shapes.js` |
| VFX | `src/render/vfx/signature.js` (class, enemy and boss looks), `templates.js` + `tplkit.js` (Kesh's three templates), `kit.js` (pooled primitives), `particles.js`, `decals.js`, `foefx.js`, `boltfx.js`, `tidefx.js`, `bellfx.js`, `duskfx.js`, `camerafx.js`, `animefx.js`, `flipbook.js`, the room-extra fx files; skill shapes `src/render/skillfx/*.js`, `src/render/techfx/index.js`; post `src/render/stage.js` |
| HUD | `src/ui/hud/*.js` (command bar, portraits, banner, threat pointers), `src/render/hpbars.js` + `src/ui/run/hpbars.js` |
| Menus and run pages | `src/ui/menu/*.js` (title, settings, saves, lobby, pause), `src/ui/run/*.js` (draft, shop, path, cards, relics, end screens), `src/ui/socket/*.js` (sockets), `src/ui/story/*.js` (Journal), `src/ui/tutorial/index.js` |
| Audio | `src/audio/engine.js`, `music.js`, `ambient.js`, `cues.js`, `voices.js`, `spatial.js`, `sampler.js`, and one cue file per content area |
| Saves and meta | `src/save/*.js` (slots, autosave, profile, deeds, cloud client) |
| Co-op | `src/net/*.js` and `src/net/protocol/*.js`, `server/*.mjs` |
| Daily board | `src/daily/client.js`, `server/daily.mjs` |
| Text | `src/i18n/index.js`, `src/i18n/locales/*.json`, `catalog.json` |
| Labs and test scenes | `src/ui/vfxlab.js`, `src/ui/modellab.js`, `src/scenes/modellab*.js`, `graybox.js`, `simtest.js`, `rendertest.js`, `chartest.js`, `src/ui/debug.js` |

## 2. The known issue: two circles on a skill cast (X1)

Kesh's report: a cast shows a magic pattern circle that disappears after about one second, then the
old plain coloured AOE circle remains. It is confirmed in the code. Two layers draw every lasting
area skill, and they were built at different times.

**The new layer, the template circle.** `src/render/vfx/templates.js` plays an arcane circle
(`face: 'arcane'`, magic) or a flame circle (`face: 'sun'`, blade) through `tk.circle` in
`src/render/vfx/tplkit.js`. It is a one-shot with a fixed life:

| Recipe | Life | Radius drawn |
|---|---|---|
| `magicZone` (placed spell) | 1.2 s | the zone radius clamped to 0.7 to 3.0 u |
| `magicCast` / `magicNova` | 0.7 or 1.05 s | 0.9 x radius, clamped to 0.75 to 2.6 u |
| `magicTick` (every other zone tick) | 0.55 s at 45% opacity | radius capped at 2.6 u |
| `bladeZone` | 0.8 s | the zone radius |

**The old layer, the plain disc.** Three render layers draw a flat filled disc plus a rim ring for
the zone's whole life, from the sim's zone entity:
- `src/render/skillfx/index.js`, `makeZoneRig` and the zone sync loop: the Healer's Sanctuary
  (kind `zone`), Bright Heal fill, inner disc, rim and wall.
- `src/render/skillfx/content.js`, `makeRootRig`: damage zones (Rootsnare), amber rim and fill.
- `src/render/allies/index.js`, `makeZoneRig` and the "ally kit zones" loop: every ally zone (kind
  `azone`): for example Ground Crack, Caltrops, Detonating Charge, Rain of Arrows, the
  Tidecaller's Whirlpool, Rain Squall and Deluge puddles, the Bellwright's hung bells and the
  Duskwing's Bat Swarm. Amber fill, parchment inner disc, amber rim.

So the magic circle appears for at most 1.2 s, and the plain disc carries on for the full 3 to 5 s
of the zone. The template circle's radius is also clamped, so it does not always match the AOE.

Related layers that also draw inside zones and would need to follow the circle:
`src/render/vfx/tidefx.js` (Tidecaller spirals and rain), `src/render/skillfx/class/index.js`
(Rain of Arrows streaks), `src/render/vfx/bellfx.js` (hung bells), `src/render/vfx/duskfx.js`.

Fix path (for the cleanup step, not done): a zone-bound template circle that follows the sim zone
entity from spawn to expire at its exact radius, and the three plain disc rigs deleted. The heal
colour rule still applies: a healing zone keeps Bright Heal in its circle (`healTone`).

## 3. Duplicate or conflicting implementations

- **D1. Two model sets for every faceted creature.** `src/render/facet/flags.js` turns on the
  model-standard rig for 7 heroes, 11 bosses, 4 champions and 36 foes. The classic rig for each one
  stays in the code beside it (`src/render/critters/healer.js` beside `healerfacet.js`, and so on),
  reachable only through the harness param `?facet=0`, the model lab's "classic" toggle, and
  `src/ui/story/viewerrigs.js`. Not yet faceted, so their classic rig is the only one: Level V,
  Spire and Kiln creatures, and the Level III and IV champions and Level IV bosses whose drafts
  (#130, #133, #135) are still open.
- **D2. Two skill-cast pipelines.** The Healer (seat 0) casts through `src/sim/skills.js` and
  `src/sim/nodes.js`. Seats 1 to 3 cast through `src/sim/allycast.js`, `party.js` and
  `partytech.js`. They emit different events (`skill_cast` vs `ally_cast`), spawn different zone
  kinds (`zone` vs `azone`), and every listener handles both (templates, audio, tutorial, net
  shapes). The sim goldens run the Healer path, so merging them moves the goldens.
- **D3. Two copies of the ally skill table.** `ALLY_KITS_V150` in `src/sim/allies.js` repeats, row by
  row, the ally rows of `SKILLS` in `src/sim/skills.js`. The comment says it is reference only; only
  the probe `tools/gntPARTY-sim.mjs` reads it.
- **D4. The same pooled helpers written five times.** `spawnMotes`, `spawnFlash` and `spawnRing`
  each exist in `src/render/skillfx/index.js`, `skillfx/content.js`, `skillfx/class/index.js`,
  `src/render/allies/index.js` and `src/render/techfx/index.js`, each with its own pool, beside the
  shared kits (`src/render/vfx/kit.js`, `tplkit.js`, `particles.js`).
- **D5. Two VFX directors on the same events.** `src/render/vfx/signature.js` (the class layer) and
  `src/render/vfx/templates.js` (Kesh's templates) both listen to `ally_cast`, `skill_cast`, `hit`
  and dashes and both play on the same cast. This is by design (the class shape underneath, the
  template finish on top), but it is the source of X1 and of most of the glow stacking.
- **D6. Many hand-rolled listener lists.** `src/core/events.js` (sim bus) and
  `src/app/emitter.js` (app bus) are the two intended buses. On top of them about ten modules keep
  their own listener set with their own "listener threw" guard: `src/net/transport.js`,
  `lobbyClient.js`, `session.js`, `predict.js`, `metronome.js`, `src/save/index.js`,
  `src/core/bindings.js`, `src/app/controls.js`, `src/app/nav.js`, `src/app/settings.js`.
- **D7. Two run starters.** `startRun` (the legacy one-level expedition) and `startCampaign` in
  `src/sim/run.js`. Players only reach the campaign. `startRun` stays because the nine goldens,
  `?run=1`, the VFX lab and many probes use it; it cannot go without re-recording the goldens.
- **D8. Two healer-style zone renderers for one sim kind.** `src/render/skillfx/index.js` skips
  damage zones (`e.damage`) and `skillfx/content.js` draws only `rootsnare`; a damage zone that is
  not Rootsnare would be drawn by neither. Today none exists, but the split is fragile.

## 4. Dead and unused code

- **U1. Unused exports.** 77 exported names are referenced nowhere in `src/` or `tools/`. Almost all
  are the model-standard pose tables (`*_REST`, `*_HITS`, `*_SLAMS` ...) in
  `src/render/critters/*facet.js` and `src/render/enemies/facet/*.js`. Others:
  `serviceNames` (`src/app/registry.js`), `SPIRE_PAGES` and `KILN_PAGES` (`src/data/journal.js`),
  `languageName` (`src/i18n/index.js`), `HOST_GRACE_MS` and `MAX_ROOMS`
  (`src/net/protocol/constants.js`), `CLASS_BY_SEAT` and `encodeMessage`
  (`src/net/protocol/messages.js`), `quillbackCoatLayout`, `lungePose` (`src/render/facet/foe.js`),
  `staticColliders` (`src/sim/movement.js`). A further 25 exports are used only by probes.
- **U2. Unused files in `src/`: none.** Every module is reached from `src/main.js` (the paint worker
  through `new Worker`).
- **U3. Probes that no longer run.** `tools/` holds 930 probe scripts; `npm test` runs 44. Most of
  the rest belong to finished rounds (`cert*`, `gntfix*`, `gntM*`, `certfix*`). `tools/actions/` holds 2,250 recorded action files
  used by 104 of those probes. Nobody has run most of them since October.
- **U4. Harness-only test scenes.** `src/scenes/graybox.js` (the arena wraps it, so it stays),
  `simtest.js`, `rendertest.js`, `chartest.js`. They load only on `?scene=`, so players never fetch
  them. `simtest` feeds the determinism checks.
- **U5. Historical docs.** `PROGRESS.md`, `docs/CONTENT_PLAN.md`, `docs/gauntlet/` (3.2 MB),
  `docs/critiques/` (1.3 MB) are marked historical in CLAUDE.md. `docs/MEMORY.md` describes memory
  use of v0.5.252.

## 5. Placeholders and stale comments

- **P1. No real placeholders.** No TODO, FIXME or "not implemented" anywhere in `src/`. The word
  "placeholder" appears only for input hints, the graybox capsule (harness only) and translation
  slots.
- **P2. Default sounds that the hero files override.** `src/audio/cues.js` keeps "placeholder"
  default sounds for the Tidecaller and Duskwing, which `tidecues.js` and `duskcues.js` replace at
  run time (their own headers say so). The defaults still play when a hero file returns nothing.
- **P3. Stale header comments.** `src/app/playclass.js` says "which of the four classes", with
  seats fixed as Healer, Tank, Swordsman, Archer (there are seven heroes now). `src/scenes/arena.js`
  calls itself the "Act-1 combat arena" but dresses all five lands. Many headers still cite
  `docs/gauntlet/PLAN.md` sections and round owners (M1, M4a ...) of the historical plan.
- **P4. The simtest wisps** (`src/core/constants.js`) are labelled placeholder actors; they exist
  for determinism tests only.

## 6. Console errors

- **C1. `GET /cloud/info` 502** on every title boot in `npm run dev` when the session server is not
  running. `src/ui/menu/cloud.js` asks for the cloud store's info; `vite.config.js` proxies
  `/cloud/` to `npm run net`. With `npm run net` running there are no console errors in the play
  check. In the player build the same process serves both, so players do not see it.
- **C2. One warning:** `KHR_parallel_shader_compile extension not supported` from three.js under the
  cloud's software WebGL. It is the driver, not the game.
- **C3. Logged error paths (not errors today):** 44 `console.warn` / `console.error` calls guard
  listeners, chunk loads, saves and settings rows. One `console.log` is left in
  `src/env/camp/colliders.js`.

## 7. Hardcoded numbers and colours

- **N1. Gameplay tuning is in tables, but in many of them.** Damage, radius, cooldown and speed
  live in frozen tables at the top of: `src/core/constants.js`, `src/sim/skills.js` (SKILLS,
  PARTY_ALLIES), `src/sim/allies.js` (ALLY_CLASSES, LEASH, REVIVE, RALLY), each of the 41
  `src/sim/enemies/*.js` and 17 boss files, `src/sim/relics.js`, `hazards.js`, `affixes.js`,
  `src/data/difficulty.js`, `levels.js`, `endless.js`, `rush.js`. Inline literals are left in sim
  code too (for example 280 in `relics.js`, 225 in `allies.js`, 111 in `run.js`).
- **N2. Render numbers are almost all inline.** `src/render/vfx/signature.js` alone holds about
  18,000 numeric literals (sizes, lives, offsets per recipe); `src/env/props.js` about 4,400,
  `src/render/hazards/index.js` about 1,700. Model rigs are built from inline coordinates.
- **N3. Colours.** `src/data/palette.js` is the palette, but 658 hex colours are written inline
  across 121 other files. The reserved Ember `#FF5A36` appears inline 6 times.
- Moving every number to one config file is not practical for render code (N2): it would mean tens
  of thousands of named constants. A workable scope is the gameplay tables (N1) and the colours
  (N3).

## 8. Oversized files doing several jobs

| File | Lines | Jobs in it |
|---|---|---|
| `src/render/vfx/signature.js` | 7,746 | every class's look, every enemy's and boss's look, camera kicks, event wiring |
| `src/sim/run.js` | 4,200 | room flow, rewards, shop, campaign, the road fork, Endless, Daily, Boss Rush, relic and vault hooks, about 60 debug commands |
| `src/env/props.js` | 3,745 | every land's prop builders |
| `src/sim/allies.js` | 2,585 | ally AI, the party verbs, downed and revive, class stats, ally zones |
| `src/net/session.js` | 2,439 | host driver, replica, prediction glue, net HUD |
| `src/render/hazards/index.js` | 2,217 | every hazard's look |
| `src/scenes/arena.js` | 2,013 | room dressing, residency, paint, camera, scene commands |
| `src/sim/nodes.js` | 1,954 | sockets, the resolver, techniques, Echo queue |
| `src/audio/engine.js` | 1,883 | engine, mixer, cue registry, voices |
| `src/save/index.js` | 1,878 | save service, slots, autosave, cloud glue, thumbnails |
| `src/ui/socket/index.js` | 1,742 | the socket screen |
| `src/sim/relics.js` | 1,722 | 63 relics and 20 curses |
| `src/render/enemies/champions2.js`, `spire.js`, `kiln.js` | 1,560 to 1,690 | several creatures' rigs each |
| `src/sim/world.js` | 1,561 | the sim root and its command switch |
| `src/scenes/camp.js` | 1,559 | camp scene, NPC hooks, roads |
| `src/main.js` | 1,381 | boot plus a 400-line debug API |

## 9. Risks for the cleanup step

- **Goldens.** `startRun`, the Healer cast path (D2, D7), `src/sim/*` numbers and the event order
  feed the nine goldens. Moving sim code must keep `node tools/gntM2-goldens.mjs` at 9/9.
- **Open drafts.** #129 (VFX extras), #130 (Level IV bosses), #133 (Level IV champions) and #135
  (Level III champions) edit `src/render/vfx/`, `src/render/boss/`, `src/render/enemies/` and
  `src/render/facet/flags.js`. Deleting classic rigs (D1), splitting `signature.js` or moving
  colours would conflict with all four. Merging or closing them first keeps the cleanup simple.
- **Probes.** Many probes import exact module paths. Splitting a file breaks them unless the old
  path re-exports, which the "replace, never duplicate" rule forbids, so each split also updates its
  probes.
- **Co-op.** `src/net/protocol/evshapes.js` lists every event's fields by name; renaming an event
  (for example merging `zone` and `azone`) needs a protocol version bump.

## 10. Suggested order for the cleanup (when approved)

1. X1, the skill circle: one zone-bound circle at the true radius for the zone's whole life; the
   three plain disc rigs deleted.
2. D3 and U1: delete `ALLY_KITS_V150` (and its probe check) and the unused exports.
3. C1 and C3: quiet the dev-only cloud 502 and remove the stray `console.log`.
4. D4: one shared mote, flash and ring pool for the skill layers.
5. N1 and N3: gameplay tables and colours into one config module, values unchanged.
6. Oversized files (section 8), one per commit, starting with `run.js` and `signature.js`.
7. D1, after #130, #133 and #135 land: delete the classic rigs that have a faceted twin.
8. U3: retire the probes that cannot run, after Kesh agrees which to keep.
9. CLAUDE.md file structure updated at the end.

D2, D5, D6 and D7 change structure the goldens or co-op depend on; they need Kesh's call before
anyone touches them.

## 11. Cleanup status (branch `claude/project-thread-zd4d09`, PRs #136 and #137)

| Id | Status | Commit |
|---|---|---|
| X1 | Done: the template circle is the AOE indicator for every zone, sized to the zone radius, for the zone's whole life; the plain zone discs are deleted. | b7265aa |
| D8 | Resolved by X1: one zone renderer draws every zone kind. | b7265aa |
| C1 | Done: the play check starts the session server, so the dev proxy no longer logs a 502. | 8f485ff |
| C3 | Wrong in the audit: the `console.log` in `src/env/camp/colliders.js` is inside a comment. Nothing to remove. | none |
| D3 | Done: `ALLY_KITS_V150` deleted. | 89012df |
| U1 | Done: unused exports, imports and top-level locals deleted. | cb890a0 |
| D4 | Done: one mote, flash and ring pool, `src/render/fxpool.js`. | c6286e2 |
| N3 | Done for colours written as JS values (they read `PALETTE`). Hexes inside CSS strings were left. | ce2afc5 |
| N1, N2 | Not moved. Gameplay tuning already sits in frozen tables (palette.js, core/constants.js, each system's table); moving tens of thousands of render literals is not a small change. | none |
| Split | `main.js`: the debug API moved to `src/app/debugapi.js` (PR #136). PR #137: `run.js` split into a 1,696-line core and 11 parts under `src/sim/run/`; `signature.js` into a 697-line director and 13 parts under `src/render/vfx/sig/` (docs/CODE_HEALTH.md). | 68dbb58; e8e3413 to 0a9f258; 4f9ebec to 4db6d84 |
| D1 | Done for every model with a faceted rig: classic heroes, bosses, champions and Level I to IV foes deleted, the lab's Classic beside, `render/facet/flags.js` and `?facet=` gone. | 097e6fd to beb1868 |
| Dead code | Done: two never-called ally cast paths in `sim/allies.js` (about 220 lines) and unused locals in 14 files. | d26b1c3 |
| D2 | PR #137: one zone system (`src/sim/zones.js`, kind `zone` for every kit) and one cast event (`skill_cast`, a hero kit's with its `classId`); net protocol v5; goldens re-recorded (state hash of all nine, event hash of run-1 to run-3, every event otherwise identical). The two delivery functions stay (docs/CODE_HEALTH.md). | 0b9f4af, c722d5c |
| D5 | PR #137: one VFX director: every layer registers on the director's dispatch, one bus subscription per event, handlers in the bus's own order. | cc698cc |
| D6, D7 | Not touched: they change structure the goldens or co-op depend on (Kesh's call). | none |
| U3 | Not touched: retiring probes waits on Kesh's list. The `tools/model-standard-*-shots.mjs` tools still ask for `?facet=0` or the lab's classic twin and now shoot the faceted rig in both places. | none |
