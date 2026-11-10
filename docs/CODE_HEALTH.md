# Code health (v0.5.325; split and one-path sections v0.5.356)

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

## The two biggest files, split (v0.5.356, PR #137)

`src/sim/run.js` (4,199 lines) and `src/render/vfx/signature.js` (7,750) are now a core
plus parts. Nothing they do changed: the nine goldens matched after every step.

- **Run** (`src/sim/run.js`, about 1,700 lines, plus `src/sim/run/`). The closure's mutable state is
  one object `rs`; the closure functions the parts call sit on one table `RF`. Each part is a
  `createX(ctx)` factory installed with `Object.assign(RF, createX({ rs, RF, ... }))`: `rules.js`
  (the frozen run rules and glyphs), `shop.js`, `shrines.js`, `vaultroom.js`, `secretroom.js`,
  `eventroom.js`, `cmds.js` (the debug and harness commands), `save.js`, `view.js`, `levels.js`
  (the level director) and `reward.js` (rewards and the path doors).
- **Signature director** (`src/render/vfx/signature.js`, about 700 lines, plus
  `src/render/vfx/sig/`). State object `sv`, function table `SF`, shared values in `sig/common.js`.
  Each part is a contiguous range moved whole and installed at the same place, so every listener
  keeps its registration order: `party.js` (hero casts, swings, hits and the template layer),
  `foes.js`, `foes2.js`, `foes3.js`, `foes4.js` (enemy looks by land), `firstbosses.js`,
  `bosses.js`, `thirdbosses.js`, `latebosses.js`, `champions.js`, `affixes.js`, `vaults.js`,
  `relics.js`.

Probes that read the director's source read `signature.js` plus `sig/*.js` (`sigSource()`).

## One cast path (AUDIT D2, PR #137)

The Healer's kit (`sim/skills.js`, `sim/nodes.js`) and the hero kits (`sim/allycast.js`,
`party.js`, `partytech.js`) still pick their own targets, but what they put into the world is one
thing:

- **One zone system**, `src/sim/zones.js`. Every lasting `ground_aoe` zone is a body of kind `zone`;
  a hero kit's zone carries its `classId`, the Healer's none. All zones tick in one phase at world
  slot 4 (zone spawn order, the 1 s cadence), puddles soak there, and `zones.expire()` and
  `zones.sweep()` end them (the run's sweep ends every zone, the ally boundary ends the hero kits').
  Each kit keeps its hit rule: a Healer zone heals the seats inside or hits by body reach; a hero
  zone hits hostiles by centre, with its count, drag and the cast pipeline's `zoneHit`.
- **One set of events**: `zone_spawn`, `zone_tick`, `zone_expire` and `skill_cast` for every kit.
  A hero kit's carry its `classId` (and a cast its seat); listeners tell the kits apart by it.
  The `azone` kind, the `azone_*` events, `ally_cast` and the view's `azones` list are gone.
- **Net protocol v5**: the event shapes were renamed in place and the old strings left the
  dictionaries (`src/net/protocol/constants.js`).

Goldens: step 1 moved only the state hash of all nine (the snapshot lost its empty `azones` list;
run-2's Healer zone row gained `totalTicks`); step 2 moved only the event hash of run-1, run-2 and
run-3 (3, 5 and 6 ally casts renamed `skill_cast`). Every event, the RNG draws and every other hash
are unchanged. Probe: `node tools/one-cast-path-probe.mjs` (in `npm test`).

Still two: the delivery code itself (the Healer's heal targeting and override in `skills.js`
`deliver`, the hero kits' AI targets, techniques and class twists in `allycast.js` `deliver`).

## One VFX director (AUDIT D5, PR #137)

The class layer (`signature.js` and `sig/`) and the template layer (`templates.js`, with the bell,
dusk, tide, tonic, shrine, secret, relic, foe and bolt layers) no longer subscribe to the sim bus on
their own. The director builds one dispatch (`sig/common.js` `createVfxDispatch`) and hands it to
every layer as `bus`; it holds one bus subscription per event type and runs that type's handlers in
registration order, the order the bus kept, so every look plays as before. The counts read
`signaturefx.debugCounts().dispatch`. Probe: `node tools/one-vfx-director-probe.mjs` (in `npm test`).
