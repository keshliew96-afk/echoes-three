# Code health (v0.5.325)

The "Code health" slice from the code review (`/mnt/project-files/review/CODE_REVIEW.md`, finding 13,
"Structure and dead code", and the movement finding in the test safety net notes). No gameplay,
text or save change. Probe: `node tools/code-health-probe.mjs [--dist dist]` (in `npm test`).

## Movement state per world

`src/sim/movement.js` used to keep its static colliders, dynamic (entity-owned) colliders and slip
patches in module-level variables, so two sim worlds stepped in turn in one process (headless probes,
the net round-trip harness) read and wrote each other's lists and drifted.

- The three lists now live in a movement state object (`createMovementState()`).
- `createWorld` makes one per world and binds it (`useMovementState`) when it is built and at the start
  of every `step`, `cmd` and `loadState`. Every helper (`walkStep`, `sweptStep`, `slipAt`, ...) reads
  the bound state, so no call site changed.
- `world.movementState()` hands out the world's own state. `serializeMovement(state)`,
  `restoreMovement(data, state)` and `setStaticColliders(list, state)` take it, and the save layer
  (`src/save/capture.js`), the co-op replica (`src/net/session.js`) and the camp scene pass it.
- A page runs one world, so the binding is the same object every tick. The nine goldens are identical.

The probe steps a world alone and the same world in turn with a second one (each with its own wet
patch): the hashes match. On gauntlet 66d7bbb they differ.

## Bundle split

- `vite.config.js`: `build.rolldownOptions.output.codeSplitting` replaces the deprecated
  `advancedChunks` (same `three` chunk); the build now prints only the chunk-size warning.
- `src/main.js` loads the four test scenes (`graybox`, `simtest`, `rendertest`, `chartest`) with
  `import()` only when `?scene=` names one. A player build never reads `?scene=`, so players never
  fetch them.
- The co-op session (`src/net/session.js`: host driver, replica, prediction, the net HUD) is its own
  chunk, fetched with `import()` at boot in parallel with the rest of the boot. The net client is idle
  until a player opens Multiplayer, so nothing needs the session before it lands. `net.session` is
  unset until then (every reader already checked for it); `net.sessionReady()` returns the load promise.
  Two things that used to run at boot run when the chunk lands instead: the "Rejoin?" offer (run at
  once when the title is already up) and the update prompt (offers a newer build the net client
  already heard of).

### Combat art (Kesh's "Lazy combat art first" pick)

- The enemy and boss render layers (`src/render/enemies/`, `src/render/boss/`: every enemy, champion
  and boss rig, telegraph and the boss light) are the combat art chunk. `src/main.js` fetches it with
  `import()` once the title (or play) is up, on a `run_start` or `state_restored` that comes first,
  or 4 s after boot at the latest; a scene that boots straight into a fight (`?scene=arena`, `graybox`)
  fetches it at once. The layers are built as it lands, so their warm-up parking is still paid in
  camp, not in a fight.
- Both layers draw from `world.entities()` every frame, so one built after a run or a loaded save
  began picks up every live body. Until then `enemyfx` and `bossfx` are null; every caller already
  used `?.`. Probe surface: `__echoes.content.combatArt()` -> `{ requested, ready }`.
- The Journal model viewer's rig builders moved to `src/ui/story/viewerrigs.js`, which
  `src/ui/story/viewer.js` loads with `import()` when a viewer is made. Until it lands, `show()` keeps
  the pick and draws it on arrival, `thumb()` answers null and `viewer.ready` is false, and the
  Journal holds its tile stills until then.
- The class-signature director (`src/render/vfx/signature.js`) stays in the boot: it draws the heroes'
  swings and the camera kick in camp too.

### What the player downloads

| | gauntlet 66d7bbb | this slice |
|---|---|---|
| entry chunk | 3,672 kB | 2,380 kB |
| everything the boot loads (entry plus its static chunks, `three` included) | 4,223 kB | 3,769 kB |
| co-op session, fetched in parallel at boot | in the entry | 106 kB |
| combat art, fetched at the title | in the entry | about 360 kB |

The probe's `--dist` check walks the boot graph and fails if session or combat art code is in it.
Rolldown also moves code shared by the lazy chunks into small shared chunks the entry imports, so
the boot is 24 files instead of 4 (HTTP/2 fetches them together).

## Dead code

Removed: `src/ui/run/expedition.js` (never imported, the old three-roads screen) and 46 exports that
nothing in `src/`, `tools/` or `server/` reads (the review's `truly_dead.txt` list less the eleven
still read: `STEER_OFF_POOLS`, `STEER_OFF_SLOW_POOLS`, `DEFAULT_TEAM`, `seatCritter`, `DEFAULT_COND`,
`DROP_KEYS`, `BOSS_KINDS`, `seatControlText`, `fromUtf8`, `SPIRE_PAGES`, `KILN_PAGES` stay), plus three
imports left unused by them. The nine strings only the expedition screen used are gone from
`catalog.json` and the nine language tables; the 32 older unused entries are untouched.
Probe-only code that ships (`campaign.census()`, `glTrack()`) stays: probes call it.

## npm audit

`npm audit fix` moved the two dev-only packages with high alerts: `sharp` 0.35.3 to 0.35.5 (libheif,
librsvg) and `source-map-js` 1.2.1 to 1.2.2 (via vite's postcss). Neither ships to players or runs
on the server (`npm audit --omit=dev` was already clean). `npm audit` now reports 0.
