# ECHOES — GAUNTLET LOOP PLAN (binding) · v0.5.0 · 2026-09-21

Lead architect's blueprint for turning the certified v0.4.63 prototype into a
production-ready title. Eight builders implement it two at a time in one
working tree; six fresh critics judge it. **Precedence:** the user's five module
specifications (quoted in §0) > this PLAN > docs/BUILD_BRIEF.md (design truth,
incl. the new §23 content extension) > code comments. Where this PLAN is silent,
do what a best-in-class shipped game does and record the decision in your
checkpoint file.

Contents: §0 scope · §1 architecture + state machine · §2 file ownership ·
§3 contracts (app, settings, screens/nav/loop, save, audio, content, network) ·
§4 content design · §5 platform-honest display settings · §6 harness contract ·
§7 acceptance gates · §8 benchmark systems · §9 waves, dependencies, risks.

---

## 0. Scope (user, verbatim) and the definition of "production-ready"

1. MAIN MENU & SCREEN SETTINGS: polished, modular title (New Game, Load Game,
   Settings, Exit); display sub-menus (Resolution scaling, Windowed/Fullscreen,
   V-Sync, Frame-rate limits) that dynamically alter the rendering context.
2. PERSISTENT SAVE/LOAD: serialize the complete game state (player position,
   inventory, world variables, high scores) into local storage / JSON files;
   user-facing save-slot management menu.
3. AUDIO ENGINE & MIXER: ambient music + spatial SFX; configuration UI with
   decoupled linear/logarithmic sliders for Master, Music, SFX.
4. CONTENT EXTENSION: distinct level configurations, escalating difficulty,
   varied enemy/obstacle types, skill slots 4 → 8, more skills and nodes,
   interactive environmental assets.
5. MULTIPLAYER: real-time network play with socket connections, matchmaking /
   lobby rooms, delta-compressed player state sync (position, orientation,
   actions), predictive lag compensation; must survive packet loss, races and
   drop-offs without breaking local play.

**Production-ready means, for every module:** zero uncaught page errors; no
console errors other than the two known ANGLE shader warnings (X3595, X4000);
no dead ends in navigation; every setting measurably changes something (§5
platform honesty); state is never silently lost; the v0.4.63 core loop (camp →
portal → 8 rooms → victory/defeat → camp) still plays by real input at 60 fps
with the §22 responsiveness bar.

---

## 1. Architecture overview + app state machine

### 1.1 Layers

```
index.html
 └─ src/main.js  (boot order is binding — see §1.5)
     ├─ app shell  src/app/*            state machine, screens, settings, services, frame scheduler   [M1]
     │    └─ #app-ui (DOM, z 1000-1599) title / settings / saves / lobby / pause / dialogs / toasts
     ├─ stage      src/render/stage.js  renderer + composer (render scale lives here)                [M1 anchored]
     ├─ sim core   clock · rng · registry · bus · world(src/sim/*)   deterministic 60 Hz, plain data
     │    └─ content systems  status · hazards · interactables · levels · difficulty                  [M4a/M4b]
     ├─ scene      src/scenes/camp.js hosting arena.js (camp ⇄ run swap, unchanged)                  [shared]
     ├─ render layers  skillfx · enemies · allies · techfx · boss · hazards · interactables
     ├─ game UI    hud · run pages · socket · interaction prompts · expedition picker
     ├─ audio      src/audio/* engine (buses, music, spatial SFX), listens to the sim bus + app events [M3]
     ├─ save       src/save/* capture/apply, slots, profile, autosave                                 [M2]
     └─ net        src/net/* transport, protocol, session (host/guest driver), prediction, interp     [M5a/M5b]
server/  zero-dependency Node session server: WS, lobby, matchmaking, relay, conditioner, admin     [M5a]
```

Rules that stay binding from BUILD_BRIEF §20: sim never imports render/DOM;
sim state is plain data; render reads sim state read-only; the cosmetic RNG
never touches sim state. New: **the sim never reads app state** — pausing is
done by not stepping the clock, never by a flag inside the sim.

### 1.2 App state machine (`app.state`)

| State | Entered from | Sim clock | Input owner | Screen stack |
|---|---|---|---|---|
| `boot` | page load | ticking only on menu-skip boots; otherwise frozen at tick 0 | none | `loading` splash (until `warmupPending()===0` and 30 frames, max 8 s) |
| `title` | boot (default), Quit to Title, farewell → Return | **paused** | app (menus) | `title` + pushed screens |
| `playing` | New Game / Continue / Load / menu-skip / session start | ticking (unless an SP blocking overlay is open) | game; app when an overlay is open | empty or overlays |
| `farewell` | Exit → confirm → `window.close()` did not close the tab | paused; music → `silence` | app | `farewell` |

`app.mode` = `'camp' | 'run'` (derived from `world.runSystem().isActive()`).
Network sub-state lives in `service('net').debug.state` (`offline | connecting |
lobby | host | guest | reconnecting | migrating`).

Transitions (all animated ≤ 300 ms fades; no transition may leave a frame
without a focused item or a visible explanation):

```
boot ─► title ──New Game──────────────► playing(camp)       fresh world (boot snapshot, new seed)
  │       ├─Continue / Load Game─────► playing(camp|run)    save.load(slot) → state applied, mode from save
  │       ├─Multiplayer─► mp screens ─► playing(net)        host or guest session (§3.7)
  │       ├─Settings / Records ──────► (overlay, back returns)
  │       └─Exit ─confirm─► window.close() ─(still open after 300 ms)─► farewell ─Return─► title
  └─ menu-skip (?menu=0 or any legacy harness param) ─► playing(camp)   == v0.4.63 boot
playing ─Esc/P/Start (no game page consuming Esc)─► pause overlay
pause ─► Resume | Settings | Save | Load | Save & Quit to Title | Quit to Title (confirm) | Leave Session (MP)
playing(run) ─run_end─► playing(camp)   (existing camp.js behaviour, untouched)
```

### 1.3 Screen ids (registered with `registerScreen`, pushed by id)

| id | Owner | Blocking | Purpose |
|---|---|---|---|
| `loading` | M1 | yes | boot splash with progress; "Press any key" only while audio is autoplay-locked (§3.5) |
| `title` | M1 | yes | Continue* · New Game · Load Game · Multiplayer* · Settings · Records* · Exit (*shown when the owning service exists; Continue only with a save) |
| `settings` | M1 | yes | tab chrome; tabs from `settingsTabs()` |
| `keep-display` | M1 | yes | "Keep these display settings? Reverting in 10 s" |
| `confirm` | M1 | yes | generic dialog behind `app.confirm()` |
| `farewell` | M1 | yes | honest exit card |
| `saves` | M2 | yes | slot list, params `{ mode: 'load' \| 'save' }` |
| `records` | M2 | yes | high scores + records |
| `expedition` | M4a | yes | act picker at the camp portal |
| `mp-menu`, `lobby`, `mp-join` | M5b | yes | host / join-by-code / quick match / lobby room |
| `pause` | INT | yes (SP pauses sim; MP never) | pause menu |

### 1.4 How the existing scenes are hosted

Nothing in the camp/arena scene model changes: `camp.js` still wraps
`arena.js`, swaps on `run_start` / `run_end` / `return_to_camp`, and owns camp
colliders + `seatParty()`. The title screen is a DOM overlay over the LIVE camp
render (the 20/20 camp frame is the title backdrop; the sim is paused, render
keeps animating fire, critters, fireflies). M1 may add a `titleCam` case to
camp.js `cmd()` (anchored) for a slow camera drift; otherwise the gameplay
camera is used as is. Arena content (biomes, hazards, interactables) lives in
arena.js / env / new render layers (M4b). Guests in network play render the
same scenes from a replica world (§3.7).

### 1.5 Boot order and input routing (binding)

1. `parseBootParams()`; `?fresh=1` wipes `echoes.*` storage.
2. `createApp({ params })` — **before** `createInputController`. M1 installs a
   **window capture-phase keydown gate** here. Because it is registered first it
   runs before `ui/run/index.js` (which also listens in capture) and before
   core/input.js.
3. stage, sim core, scene, layers, HUD, run UI … (unchanged order).
4. `app.attach({...})`, `app.boot()`, `scheduler.start()`.

Gate rules while `screens.isBlocking()`:
- **keydown**: translated to a nav action (§3.3), `preventDefault()` (except
  F5/F11/F12, Ctrl/Meta combos and typing into a focused text input) and
  `stopImmediatePropagation()` — no game listener ever sees it.
- **keyup / mouseup / blur**: always pass through (they only clear held state;
  swallowing them leaves stuck keys).
- **mouse/pointer/wheel/contextmenu inside `#app-ui`**: reach their target; the
  `#app-ui` root stops propagation in the bubble phase so window-level game
  listeners never see them.
- On every transition to blocking: `input.releaseAll()` (M1 adds it to
  core/input.js: clears held keys, basicHeld, pending presses).

Esc priority when NO app overlay is open: game pages first — the run UI
(draft Esc = decline, path/shop Esc inert, end cards), then the socket screen
(Esc closes) — and only an Esc nobody consumed (`!e.defaultPrevented`, run UI
and socket both closed) opens `pause`. INT registers that listener in the
BUBBLE phase on window, last. An Esc that ends element fullscreen must not also
open/close a menu (ignore Esc within 150 ms of a `fullscreenchange`).

### 1.6 Sim pause rules (`app.simPaused()`)

`true` iff `state ∈ {title, farewell}` or `state === 'boot' && !menuSkip`, or a
blocking screen is open in **single-player**, or `gameplay.autoPause` and the
page is hidden/blurred in single-player. **Never** true in a network session
(host or guest): the shared sim cannot pause for one player — the pause menu
opens as a local overlay, that player's inputs are zeroed, and the menu says
"Online — the game keeps running". Pausing never touches sim state, so a pause
is invisible to determinism (0 ticks elapse).

---

## 2. File ownership map

Ownership transfers at the start of each wave. An owner may create any NEW
file under its directories. Everything not listed is frozen for the Gauntlet
builders except via the shared-file anchors in §2.2. Fix builders (gauntlet
rounds) own whatever their confirmed failures cite (minimal edits, reported in
selfChecks); two fix builders running together must not edit the same file —
the workflow routes content failures whose suspect files match
`enem|hazard|interact|env/|biome|render/enemies|obstacle` to M4b-fix and net
failures matching `server/|sim/(net|remote)|net/(predict|interp|reconcile|lag)`
to M5b-fix; everything else goes to M4a-fix / M5a-fix. File names below are
chosen so that routing lands on the right owner.

### 2.1 Owned files per key

| Key (wave) | Owns (edit freely) | Creates (expected new files) |
|---|---|---|
| **ARCH** (W0, done) | docs/gauntlet/PLAN.md, build-ARCH.md, the §23 extension in docs/BUILD_BRIEF.md, docs/TESTING.md Gauntlet section | the stubs listed in §9.1, tools/gnt-arch-* |
| **M1** (W1) | src/app/** · src/ui/menu/** except the files other keys own below · src/ui/debug.js | src/app/{nav,gamepad,display,style,toast}.js · src/ui/menu/{title,settings,confirm,farewell,loading,keepdisplay}.js · src/ui/menu/tabs/{display,gameplay,controls}.js · tools/gnt-M1-* |
| **M3** (W1) | src/audio/** (incl. replacing synth.js) · src/ui/menu/tabs/audio.js | src/audio/{engine,voices,cues,music,ambient,spatial,meter}.js · tools/gnt-M3-* |
| **M4a** (W2) | src/sim/{skills,nodes,draft,run,waves,status,combat,shapes}.js · src/data/{levels,difficulty}.js · src/core/intents.js · src/ui/hud/** · src/ui/run/** · src/ui/socket/** · src/render/skillfx/** · src/render/techfx/** | src/ui/run/expedition.js · src/render/skillfx/<skill>.js · tools/gnt-M4a-* |
| **M4b** (W2) | src/sim/{enemies,hazards,interactables,movement,boss,projectiles}.js · src/sim/enemies/** · src/data/layouts.js · src/render/enemies/** · src/render/hazards/** · src/render/interactables/** · src/render/boss/** · src/env/** · src/scenes/arena.js · src/ui/interact/** | src/sim/enemies/{quillback,toad,moth,ram,mole}.js · src/sim/hazards.js · src/sim/interactables.js · src/env/biomes/{wood,mill,barrow}.js · tools/gnt-M4b-* |
| **M2** (W3) | src/save/** · src/core/rng.js · src/core/clock.js · src/core/registry.js · src/ui/menu/{saves,records}.js | src/save/{index,capture,codec,storage,slots,profile,autosave,thumbnail}.js · tools/gnt-M2-* |
| **M5a** (W3) | server/** · src/net/protocol/** · src/net/{transport,lobbyClient}.js | server/{ws,lobby,matchmaking,relay,admin,keyframes}.mjs · src/net/protocol/{messages,codec,quantize,delta,snapshot,conditioner}.js · tools/gnt-M5a-* — **no src/sim edits in W3** |
| **M5b** (W4) | src/net/{session,driver,replica,predict,reconcile,interp,lagcomp,seats}.js · src/sim/{remote,netseats,leaderbot}.js · src/sim/allies.js · src/ui/menu/{mpmenu,lobby,mpjoin}.js · src/ui/menu/tabs/network.js · src/ui/net/** | tools/gnt-M5b-* (server/** and src/net/protocol/** transfer to M5b in W4 for fixes it needs) |
| **INT** (W5) | src/ui/menu/pause.js · vite.config.js · package.json scripts · index.html · everything else only via anchors | tools/gnt-INT-* |

### 2.2 Shared files and anchored regions

Every anchor is a literal comment `@gnt:<NAME>` already committed at v0.5.0.
Edit only inside your region; re-read the file immediately before editing;
never reformat outside it.

| File | Region (anchor) | Who | What |
|---|---|---|---|
| src/main.js | `APP-BOOT` / `APP-ATTACH` / `LOOP` | M1 | app creation, attach ctx, frame scheduler + sim gate + gamepad poll |
| src/main.js | `AUDIO` | M3 | replace `createSynth(bus)` by the engine; listener update in the frame |
| src/main.js | `WORLD-LAYERS` + the render block of `frame()` (one line per layer) | M4a, M4b | create/tick new render layers |
| src/main.js | `SAVE` | M2 | createSaveSystem + provide('save') + `?slot=` |
| src/main.js | `NET` + `sampleIntents()` seam | M5a (W3: provide('net') client only), M5b (driver swap) | |
| src/main.js | `DEBUG-API` | each owner, one line | namespaces are service-backed; normally no edit needed |
| src/render/stage.js | createStage options + `resize()` + new `setRenderScale()/drawingBufferSize()` | M1 | render scale |
| src/render/stage.js | `render()` — one `onNextRender` hook line | M2 | thumbnail capture right after composer.render() |
| src/core/input.js | `INPUT-KEYS` | M4a (skill keys via SKILL_SLOTS), M4b (interact — already bound) | |
| src/core/input.js | new `releaseAll()`, `setEnabled()` at the end | M1 | input gate |
| src/core/constants.js | `SKILL_SLOTS` | M4a (4 → 8) | + new frozen tables for content by M4a/M4b in their own blocks at the end |
| src/sim/world.js | `SKILL-SLOTS` | M4a | slot loop, status ticking hook |
| src/sim/world.js | `CONTENT-SYSTEMS` / `CONTENT-CONTINUOUS` / `CONTENT-DISCRETE` / `HOSTILE-KINDS` + `cmd()` cases | M4b | hazards/interactables creation + phase hooks; faction-based hostile filters |
| src/sim/world.js | `WORLD-STATE` | M2 | serialize()/restore() |
| src/sim/world.js | `SEAT-INPUTS` + resolvePlayer seat routing | M5b | step(tick, snapshot, seatInputs) |
| src/sim/allies.js | hostile filter lines | M4b (W2) | new enemy kinds targetable |
| src/sim/shapes.js | bolt sweep — one blocker-test call | M4b (W2) | barricades stop skill bolts |
| src/sim/combat.js | kill() `lifecycle: 'break'` (committed) | M4a owns; M4b relies on it | |
| src/scenes/camp.js | `beginRun` → open `expedition` screen; `cmd()` cases | M4a; M1 (`titleCam`); M2 (restore mode); M5b (host-only portal) | |
| src/scenes/graybox.js | screenshake amplitude × `gameplay.screenshake` (one line); follow target = local seat (M5b) | M1, M5b | |
| src/ui/run/endscreens.js | "New best" line on the end cards | M2 | |
| src/ui/hud/commandbar.js | `setViewSeat(partyIndex)` for guests | M5b | |
| src/ui/run/index.js, src/ui/socket/index.js | guest read-only guard ("The Healer is choosing…") | M5b (W4) | |
| every render layer + hud/run/socket | one `state_restored` resync handler each | M2 (W3) | rebuild views from the restored registry |
| src/sim/*.js not owned by M2 | `serialize()` / `restore()` members only | M2 (W3) | where a W1/W0 system lacks them (enemies, waves, allies, boss, run, draft, combat, shapes, movement) |
| docs/TESTING.md | the module's own subsection | each key | |
| PROGRESS.md | append one table row per completed build | each key | |

### 2.3 Namespaces (collision-proof by construction)

- **CSS prefixes**: `ap-` M1 · `au-` M3 · `sv-` M2 · `ex-` M4a · `ix-` M4b ·
  `nt-` M5b · `pz-` INT (existing: `rn-` run pages, `nd-` socket, `cp-` camp,
  HUD ids). No global selectors (`button {}`), no `!important` outside your prefix.
- **z-index bands**: game UI 0–99 (existing ≤ 30; M4b prompts 40–49; M5b
  in-game net HUD 60–79) · app screens 1000 · overlays 1100 · dialogs 1200 ·
  toasts 1300 · loading 1400 · farewell 1500.
- **localStorage keys** (all under `echoes.`): `echoes.settings` (+`.corrupt`),
  `echoes.save.v1.<slot>` (+`.bak`, `.tmp`, `.thumb`), `echoes.save.v1.index`,
  `echoes.profile.v1` (+`.bak`), `echoes.net.identity`, `echoes.net.session`.
- **Sim bus events**: existing names are frozen. New: M4a `status_apply`,
  `status_expire`, `shield_absorb`, `resonance_proc`, `split_shard` …; M4b
  `hazard_spawn`, `hazard_telegraph`, `hazard_resolve`, `interact`,
  `interact_denied`, `broken` (committed), `keg_ignite`, `keg_blast`,
  `sluice_toggle`, `bell_ring`, `elite_spawn`; M2 `state_restored`; M5b
  `seat_control` (`{ partyIndex, controller: 'human'|'ai' }`). The payload key
  `type` is forbidden (it would overwrite the event's own type — see run.js).
- **App events** (`appEvents`, src/app/events.js — never on the sim bus):
  `app_state`, `overlay`, `sim_pause`, `nav`, `service`, `settings_tabs`,
  `settings_rows`, `screens`.

### 2.4 Commit etiquette

One commit per coherent step, message `feat|fix(<area>): <what> (vX.Y.Z)`
ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`; bump the
PATCH of src/version.js each commit (re-read first — the concurrent builder
bumps too; on a conflict take max+1). `git add` only your own paths (never
`git add -A`: other agents' work-in-progress and the paused certification's
docs/critiques/*.md are in the tree). index.lock → wait 5 s, retry. Never
commit while the smoke capture exits 1.

---

## 3. Contracts

Signatures below are binding; implementations may add members, never remove
or change these. Stubs for §3.1–3.3 and the pure modules of §3.4–3.7 are
committed at v0.5.0 (§9.1).

### 3.1 App shell — `src/app/app.js` (M1)

```js
createApp({ params }) -> app
app.state                  // 'boot'|'title'|'playing'|'farewell'
app.mode                   // 'camp'|'run'
app.params                 // parseBootParams() result (frozen)
app.settings               // settings store (§3.2)
app.screens                // screen manager (§3.3)
app.events                 // appEvents emitter
app.attach(ctx)            // ctx: { stage, world, clock, bus, rng, registry, input, scene, runUi, socket, hud, overlay, scheduler }
app.boot()                 // -> state; title vs menu-skip (§6.1)
app.simPaused() -> bool    // §1.6
app.inputBlocked() -> bool // a blocking screen is open
app.update(nowMs)          // per rendered frame: gamepad poll, latency probe, focus audit
app.newGame({ seed? })     // fresh camp: save.resetToFresh() when the save service exists; the boot state otherwise
app.quitToTitle({ save = false }) -> Promise   // optional save, fade, fresh camp behind the title
app.confirm({ title, body, confirmLabel='Confirm', cancelLabel='Cancel', danger=false,
              defaultFocus='cancel', timeoutMs=0, timeoutResult=false }) -> Promise<boolean>
app.toast(text, { tone='info'|'good'|'warn'|'error', ms=2600 })
app.debug                  // window.__echoes.app (§6.4)
```

App events payloads: `app_state {state, prev, mode, overlay}` · `overlay
{top, stack, blocking}` · `sim_pause {paused, reason}` · `nav {action, source,
screen}` · `service {name}`.

### 3.2 Settings store, keys, tab/row registry, widgets, services

**Store** — `src/app/settings.js` (committed, M1 owns):

```js
createSettingsStore({ storage, key='echoes.settings', specs=CORE_SETTINGS })
store.register(path, { default, validate(v)->v|undefined, persist=true }) -> current value
store.get(path) · store.set(path, value, { persist=true, source='api'|'ui'|'system'|'revert'|'reset' }) -> stored|undefined
store.subscribe('<path>'|'<prefix>'|'*', fn(value, path, prev, source)) -> unsubscribe
store.reset(prefix?) · store.snapshot() · store.persist() · store.keys() · store.loadReport · store.storageKey
V.num(min,max,step) · V.int · V.bool · V.oneOf(list) · V.str(maxLen)
```

Payload `{ v: 1, savedAt, data: { '<path>': value } }`; debounced write 150 ms,
flushed on `pagehide`/hidden. Corrupt → defaults + `.corrupt` copy +
`loadReport.status='recovered'` + a toast ("Settings were reset — the saved
file was unreadable"). Newer version → defaults, the newer blob is not
overwritten until the user changes something. Storage unavailable → in-memory
+ a Settings footer note "Settings can't be saved in this browser mode".

**Keys** (path · default · values · owner · what it measurably changes):

| Path | Default | Values | Owner | Observable effect |
|---|---|---|---|---|
| display.renderScale | 1.0 | 0.50–1.50 step 0.05 | M1 | drawing-buffer size (§5) |
| display.fullscreen | false | bool | M1 | `document.fullscreenElement` (synced from the browser) |
| display.vsync | true | bool | M1 | scheduler source `raf` vs `uncapped` |
| display.frameLimit | 0 | 0 (unlimited) · 30 · 60 · 120 · 144 | M1 | measured rendered fps |
| display.showFps | false | bool | M1 | fps meter visibility (INT hides it by default in player builds) |
| gameplay.screenshake | 1 | 0 · 0.5 · 1 | M1 | camera shake amplitude multiplier |
| gameplay.autoPause | true | bool | M1 | SP pause on blur/hidden |
| gameplay.challenge | 'standard' | relaxed · standard · harrowing | M4a | difficulty multipliers captured at run start (§4.2) |
| audio.{master,music,sfx,ambient,ui}.level | 0.8 / 0.6 / 0.8 / 0.6 / 0.7 | 0–1 step 0.01 | M3 | bus gain (§3.5) |
| audio.{master,music,sfx,ambient,ui}.mode | 'log' | log · linear | M3 | slider mapping (§3.5) |
| audio.{master,music,sfx,ambient,ui}.muted | false | bool | M3 | bus gain 0 |
| audio.muteOnBlur | true | bool | M3 | master ramps to 0 while hidden |
| net.playerName | 'Mouse' + 3 digits | str ≤ 16 | M5b | lobby name plate |
| net.serverUrl | `ws://127.0.0.1:7800/echoes` | str | M5b | connect target |

**Settings tabs** — `registerSettingsTab({ id, label, order, build(ctx) → { el,
onShow?, onHide?, hasPendingChanges?, revert?, confirm?, destroy? }, available?
})`; orders: Display 10, Audio 20, Gameplay 30, Controls 40, Network 50.
`ctx = { settings, widgets, app, services: { service }, toast, close }`.
**Rows** into another key's tab: `registerSettingsRow(tabId, { id, order,
build(ctx) → HTMLElement })` (M4a's Challenge row → `gameplay`). Controls tab is
a complete read-only reference (keyboard, mouse, gamepad-in-menus) that reads
the live bindings (1–8 after M4a, E interact); rebinding is out of scope this
iteration and the tab says so.

**Widgets** — `src/app/widgets.js`: `slider`, `toggle`, `select`, `button`,
`section`, `note`; every control returns `{ el, get(), set(v,{silent}),
focus(), setDisabled(on, reason), setNote? }`, focusable node carries
`[data-nav]`; adjustable nodes expose `__navAdjust(dir)` for left/right.
M1 styles them (storybook HUD grammar: Void Charcoal plates, Parchment ink,
Hearth Amber focus/selection, Warm Grey chrome; no Ember, no violet, no Heal
green in menus). Type floors: ≥ 14 CSS px at 1024×576, ≥ 18 CSS px at
1600×900, scaling with `min(innerWidth/1920, innerHeight/1080)` clamped to
[0.75, 1.5] (never HUD-tiny, never 4K-tiny). Hit targets ≥ 40×40 CSS px at
1024×576.

**Services** — `src/app/registry.js`: `provide(name, impl)`, `service(name)`
(null when absent — every consumer degrades honestly), `whenService(name)`.
Names: `app`, `settings`, `display` (M1), `audio` (M3), `save` (M2), `net`
(M5a client → M5b session), `content` (M4a: `levels()`, `unlockedActs()`,
`difficultyTable()`). Each impl exposes `debug` for `window.__echoes.<name>`.

### 3.3 Screen manager, navigation model, frame scheduler, display API

**Screens** — `src/app/screens.js` (stub committed; M1 completes internals):

```js
createScreenManager({ root, ctx }) -> { push(id, params), pop(), replace(id, params), popTo(id), clear(),
  top(), stack(), isOpen(), isBlocking(), nav(action, source), focused(), on('change'|'nav', fn) }
factory(ctx) -> { el, blocking=true, onOpen?(params), onClose?(), onFocus?(), onBlur?(),
                  onNav?(action, source)->bool, back?()->bool, defaultFocus?: selector }
```

**Nav actions**: `up down left right confirm back tabPrev tabNext secondary tertiary`.

| Source | Mapping |
|---|---|
| Keyboard | ↑↓←→ and W/A/S/D; Enter/NumpadEnter/Space = confirm; Esc/Backspace = back; Q/E and PageUp/PageDown = tabPrev/tabNext; Delete = secondary; F2 = tertiary |
| Mouse | hover focuses (no scroll-jump); click = confirm on that item; wheel scrolls lists; right-click on a menu = back |
| Gamepad (standard mapping, polled every frame via `navigator.getGamepads()` — never cache the function, never require `gamepadconnected`, so a mocked pad works) | D-pad / left stick (deadzone 0.5, repeat after 400 ms then every 90 ms) = directions; A(0) confirm; B(1) back; X(2) secondary; Y(3) tertiary; LB(4)/RB(5) tabs; Start(9) = pause / back on the pause menu |

Focus model: each screen's `[data-nav]` items; up/down moves between rows,
left/right adjusts the focused control (`__navAdjust`) or moves between columns
(`[data-nav-col]`); disabled items are skipped but stay visible with their
reason. Opening a screen focuses its primary (`[data-nav-default]`); returning
to a screen restores its last focus. The focus ring (2 px Hearth Amber
`#E8A23D` outline + 3% scale + plate lift) is always visible on exactly one
item while any screen is open, including after mouse use. No focus traps:
every screen except the title root has a back path. Text inputs (room code,
slot name, player name) take typing; Esc blurs/backs, Enter confirms. UI sounds:
the audio engine subscribes to `nav` app events (M3), never the other way round.

**Frame scheduler** — `src/app/loop.js` (stub committed; M1 implements pacing):
`createFrameScheduler({ renderer, frame }) → { start(), stop(), configure({
vsync, limit }), stats() }`, `stats() = { renderedFps, rafHz, source:
'raf'|'uncapped', vsync, limit, applied, frameMsP50, frameMsP95, running }`
measured over a sliding 2 s window. The sim advances by the wall time between
rendered frames, so every limit keeps 60 ticks/s. The uncapped scheduler stops
while the page is hidden.

**Display** — `src/app/display.js` (M1), `provide('display', …)`:
`setRenderScale(s)`, `setFullscreen(on)` (must be called from a user gesture —
Enter/Space/click count; gamepad buttons do NOT count as user activation in
browsers, the UI says so), `setVsync(on)`, `setFrameLimit(n)`, `state() → {
renderScale, drawingBuffer: {w, h}, css: {w, h}, dpr, fullscreen,
browserFullscreen (F11), keyboardLock, vsync, limit, rafHz }`. Stage gains
`stage.setRenderScale(s)` / `stage.renderScale` / `stage.drawingBufferSize()`;
`resize()` keeps the scale. Alt+Enter toggles fullscreen anywhere (user gesture).

### 3.4 Save system (M2) — API, schema v1, per-system contract

**Service** `provide('save', api)`:

```js
api.capture() -> StateTree                 // complete sim + scene state, plain data
api.apply(tree) -> { ok, error? }          // restores INTO the live objects; emits `state_restored`
api.hash(tree = api.capture()) -> hex16    // hashState(tree) (src/core/hash.js)
api.list() -> SlotMeta[]                   // index, newest first
api.hasAny() · api.latest() -> SlotMeta|null
api.canSave() -> { ok, reason? }           // false: guest in a net session, boot, a transition fade, farewell
api.save(slotId, { name?, kind='manual' }) -> Promise<{ ok, meta, bytes, ms } | { ok:false, error:'quota'|'unavailable'|'not_allowed'|'busy' }>
api.load(slotId) -> Promise<{ ok, meta } | { ok:false, error:'missing'|'corrupt'|'version'|'hash', backup?: SlotMeta }>
api.restoreBackup(slotId) · api.remove(slotId) · api.rename(slotId, name)
api.exportSlot(slotId)                     // downloads echoes-<slot>-<date>.json (Blob + <a download>)
api.importFile(File, slotId?) -> Promise<{ ok, slotId } | { ok:false, error }>
api.autosave(reason) -> Promise           // safe points only (below)
api.resetToFresh({ seed }) -> { ok }       // New Game / Quit to Title: the boot snapshot with a new seed
api.profile() -> Profile · api.recordRun(summary) -> { rank, newBest }
api.debug                                  // window.__echoes.save (§6.4)
```

**Slots**: `manual-1`…`manual-8`, `auto-1`/`auto-2` (autosave rotates between
them so a torn write never costs the only autosave), `quick` (F5 save / F9 load,
single-player only, confirm-free, toast feedback). Storage keys §2.3.

**File layout (schema v1)**:

```jsonc
{
  "format": "echoes-save", "schema": 1, "game": "0.5.x",
  "slot": { "id": "manual-3", "kind": "manual", "name": "Before the Stag" },
  "createdAt": "ISO", "savedAt": "ISO",
  "meta": { "playtimeSec": 1234, "mode": "run", "act": 1, "actName": "The Hollow Wood",
            "room": 5, "roomMode": "defend", "phase": "combat", "seed": 123, "wallet": 48,
            "party": [{ "classId": "healer", "hp": 71, "maxHp": 100 }, …],
            "skills": ["mending_bolt", …], "tick": 18234, "network": false, "bytes": 51234 },
  "state": StateTree,
  "hash": "<hashState(state)>"
}
StateTree = {
  "v": 1,
  "clock":    { "tick", "hitstopRemaining", "grants": [...] },
  "rng":      { "seed", "s", "draws" },                   // mulberry32 internal state (rng.js gains getState/setState)
  "registry": { "nextOrdinal", "entities": [ …plain entity objects, ascending id… ] },
  "world":    { "stats", "maintainPopulation", "harness", … },
  "systems":  { "skills", "build", "enemies", "waves", "allies", "boss", "run", "draft", "combat",
                "shapes", "status", "hazards", "interactables", … every system, by name },
  "scene":    { "mode": "camp"|"run", "layout": { "act", "layoutId" } },
  "app":      { "playtimeSec", "challenge" }
}
```

**Per-system contract (binding for EVERY sim module, including every new W2
module at the moment it is written):**
1. `serialize() -> JSON-able` — the module's complete private state (closure
   `let`s, Maps → arrays of pairs, Sets → sorted arrays). Entity references are
   stored as ids. No functions anywhere; at a tick boundary every pending action
   is DATA (e.g. Echo recasts are `{ due, skillId, aim, targetId, scale }`, not
   closures). `-Infinity`/`NaN`/`-0` are allowed (canonical JSON tags them).
2. `restore(data) -> void` — replaces that state exactly; draws no RNG; emits no
   gameplay events (M2 emits one `state_restored` after the whole apply);
   idempotent; `restore(serialize())` is a no-op for the continuation.
3. Registry restore patches entity objects **in place** by id (clear own keys,
   assign saved keys) so references held elsewhere (world.player, allies'
   player ref) stay valid; entities absent from the save are despawned; new ids
   are created; `nextOrdinal` restored.
4. Module-level state (movement.js statics, shapes.js `nextBoltOwnerSeq`) is
   captured too; static colliders are restored by re-entering the saved scene
   mode (`scene.cmd('campMode', [mode])`), never by storing geometry.
5. Render/UI layers resync on `state_restored` (rebuild rigs from the registry,
   close meta pages or re-open the one `run.view()` implies). M2 makes the
   minimal edits needed in each layer and lists them.

**State hash**: `hashState(tree)` = FNV-1a 64 (two 32-bit lanes) over
`canonicalJSON(tree)` (sorted keys, tagged non-finite numbers and -0; throws on
functions / non-plain objects). Used for file integrity, the round-trip gate,
desync detection and golden traces.

**Integrity + atomic write**: `save()` = capture → canonical encode → verify
(`parseCanonical` + re-hash equal) → write `<key>.tmp` → copy current main to
`<key>.bak` → write main → remove tmp → update index (index is derivable by
scanning keys; a missing/corrupt index is rebuilt silently). Load verifies
format, schema, required keys and hash; on failure it offers the `.bak` ("Restore
the backup from <date>?") or marks the slot "Damaged — export raw / delete". A
leftover valid `.tmp` newer than main is promoted on boot. QuotaExceededError
leaves main untouched and shows "Not enough browser storage — delete a slot or
export saves to files". Nothing on this path may throw to the page.

**Migration**: `MIGRATIONS = { 1: s => s /* v1 -> v2 */ }` chain applied
before hash verification of the migrated tree; a save with `schema` newer than
the build is refused ("made by a newer version of Echoes") and never modified.

**Thumbnail**: 256×144 JPEG (quality 0.7, ≤ 20 KB) captured by an
`onNextRender` hook in stage.js immediately after `composer.render()` (no
`preserveDrawingBuffer`), stored under `.thumb`.

**Playtime**: seconds of unpaused sim ticks (`ticks / 60`), accumulated into the
save and the profile.

**Autosave** safe points: `room_enter` (first tick of each room), `shop_open`,
the camp after `run_end`/`return_to_camp`, and Save & Quit. Never during a
transition fade, never as a net guest (host saves with `meta.network: true`;
loading such a save starts single-player with AI in every seat). Throttle ≥ 20 s
between autosaves except run end. Work is split across frames (capture in the
safe tick, encode + write in `requestIdleCallback`/next frames) so no frame
exceeds 50 ms.

**Profile** `echoes.profile.v1`: `{ v:1, highScores: [top 10 { score, act,
victory, roomsCleared, kills, timeSec, seed, challenge, date }], records: {
runs, victories, defeats, bestScore, fastestVictorySec: {1,2,3}, mostKills,
deepestRoom: {1,2,3} }, unlocks: { acts: [1] }, playtimeSec }` — atomic like a
slot (+`.bak`). **Score** = `round((100 × roomsCleared + 5 × kills + 1000 ×
victory) × actMul × challengeMul) + (victory ? max(0, 900 − timeSec) : 0)`,
actMul 1.0/1.5/2.0, challengeMul relaxed 0.75 / standard 1 / harrowing 1.5.

**Round-trip probe** (`save.debug.roundTrip`): freeze the realtime loop;
`A = capture()`; run `ticks` (default 600) with `scriptedInput(scriptSeed, t)`
recording `hash(capture())` every 60 ticks and every sim event except `sound`;
`apply(A)`; assert `hash(capture()) === hash(A)`; re-run the same script;
compare the per-60-tick hashes and the event lists; report the first divergent
tick/event; thaw. Uses `clock.stepOnce` (committed).

### 3.5 Audio engine (M3)

**Service** `provide('audio', engine)`; created in the `AUDIO` anchor with `{
bus, settings, stage, app }`; `?audio=0` builds it muted.

```js
engine.state                         // 'locked' | 'running' | 'suspended'
engine.unlock()                      // resume on the first user gesture (pointerdown / keydown)
engine.play(cueId, { x?, z?, gainDb=0, pitch=1, bus? }) -> voiceId|null   // x/z => spatial
engine.stop(voiceId)
engine.setListener(x, z)             // camera ground focus, called once per frame
engine.music.setState('menu'|'camp'|'combat'|'boss'|'victory'|'defeat'|'lobby'|'silence', { crossfadeSec=2 })
engine.music.setIntensity(0..1)      // combat layers
engine.music.setTheme(themeId)       // 'wood'|'mill'|'barrow' (registerMusicTheme(id, params))
engine.ambient.setBed(bedId)         // 'camp'|'wood'|'mill'|'barrow'|null (registerAmbientBed)
engine.registerEventCue(eventType, (ev) => [{ cue, x?, z?, gainDb?, pitch? }] | null)
engine.registerCue(cueId, { bus, voice(ctx, t, dest, params), maxVoices=6, cooldownMs=30, priority=1 })
engine.debug                         // window.__echoes.audio (§6.4)
```

**Bus graph** (Web Audio):

```
voices ─► SFX bus ──┐        each bus: level gain ─► mute gain ─► meter tap ─► master
music layers ─► MUSIC bus ─┤
beds ─► AMBIENT bus ─┤─► MASTER level ─► mute ─► limiter (DynamicsCompressor: threshold −6 dBFS,
UI clicks ─► UI bus ─┘      knee 6, ratio 12, attack 3 ms, release 150 ms) ─► ceiling clipper
                            (WaveShaper tanh soft-knee, output |x| < 1.0, oversample '4x') ─► master tap ─► destination
```

**Slider math** (src/audio/mixmath.js, committed): LINEAR `gain = s`; LOG
(dB-perceptual) `dB = 10·log2(s)` ⇔ `gain = s^(log2(10)/2) = s^1.66096`, s <
0.001 → 0. Reference values:

| s | 0 | 0.25 | 0.50 | 0.75 | 1.00 |
|---|---|---|---|---|---|
| linear dB | −∞ | −12.04 | −6.02 | −2.50 | 0 |
| log dB | −∞ | −20.00 | −10.00 | −4.15 | 0 |

Channel effective gain = `sliderToGain(channel) × sliderToGain(master)`
(channels never multiply each other). Mode is per channel; switching mode
keeps the loudness (the slider moves to `dbToSlider(currentDb, newMode)`). Gain
changes ramp with `setTargetAtTime(target, now, 0.03)` (no zipper noise). The
Audio tab shows each slider's live dB readout, a Linear/Log switch per channel,
mute per channel, Mute on focus loss, and a "Test" button per channel.

**Gain staging**: music layers normalised to −18 dBFS RMS pre-bus, SFX voices
peak ≤ −6 dBFS pre-bus, UI ≤ −12 dBFS, ambient beds −24 dBFS RMS.
Voice cap 48; per-cue cap (default 6, oldest stolen) and a 30 ms same-cue
cooldown (a 6-target cleave plays one layered hit, not six phased copies);
priority boss > telegraph > kill > hit > ambience.

**Spatial model**: `PannerNode` (panningModel 'equalpower', distanceModel
'inverse', refDistance 4 u, rolloffFactor 1, maxDistance 40 u) per spatial
voice. Listener = camera ground focus (camera.position.x, camera.position.z −
CAMERA.distance·cos(elevation)), forward (0,0,−1) = screen-up, up (0,1,0); so
world +x = right ear. Sources at (x, 0, z). Music/UI/ambient are non-spatial.

**Music state machine** (procedural; no audio files): inputs = app state
(`title|loading → menu`, `farewell → silence`), MP screens (`lobby`), scene mode
(`camp`), run phase (`combat` in wave rooms incl. reward/path/shop at low
intensity, `boss` in room 8), `run_end` (`victory`/`defeat` stinger 3–4 s then
`camp`). Crossfade: equal-power, 2.0 s default (1.0 s into combat, 2.5 s out of
a stinger), optionally bar-quantised; intensity = f(live hostiles, boss HP,
party HP) drives percussion/pulse layers. Themes per act (`wood`, `mill`,
`barrow`): different key/mode/tempo/timbre, same state set.

**Sim-event → cue map** (M3 covers every existing event; M4a/M4b register cues
for their new events with `registerEventCue` in their own files; INT audits):

| Events | Cue family |
|---|---|
| basic_fire (Healer) · ally_basic (by class) · enemy_fire | shoot / swing / bow / spit |
| hit (by shape, attacker faction, crit adds an accent layer) · hit_immune | impact / hurt (party target) / whiff |
| death (boss → boss_death) · screenshake (none) · hitstop (none) | kill pop |
| heal · full_heal · aura_pulse · zone_tick · azone_tick | heal chime (crit: brighter) / sparkle / soft pulses |
| skill_cast · ally_cast · skill_bolt_spawn · zone_spawn · azone_spawn · echo_recast · bounce_hop · siphon_* · detonate | per skill family (heal / damage / zone / nova / technique) |
| intent (dodge) · dash_end · intent_denied | whoosh / soft blip (on_cooldown quieter than empty_slot) |
| telegraph_start · telegraph_resolve · boss_quake_start/resolve · boss_trample · boss_adds · boss_spawn · spawn_telegraph | warning tick / impact / rumble / horn / roar / violet shimmer |
| downed · revive_start · revive · revive_break · rally · mark | thud / hum / chime / snap / horn / tick |
| room_start · wave_start · room_cleared · reward_offer · draft_taken/declined · path_chosen · shop_open · shop_purchase · currency_denied · glint_gain · node_socketed · socket_denied · run_start · run_end · return_to_camp | UI / progression cues (UI bus) |
| app `nav` (move/confirm/back/tab) · slider ticks · toggles | UI bus |

The engine KEEPS emitting `sound` events (`{ slot }` for the four legacy
slots shoot/hit/kill/heal, `{ slot, cue }` for everything else) into the sim
bus — the observable contract in headless captures. `sound` events are
excluded from every determinism comparison.

**Autoplay**: the AudioContext is created at boot (suspended); `unlock()` on
the first pointerdown/keydown resumes it within 100 ms; the `loading` screen
shows "Press any key" only while the context is locked (a headless browser
launched with `--autoplay-policy=no-user-gesture-required` never sees it).
No errors or warnings while locked; cues are dropped (still logged) while
locked.

### 3.6 Content data formats (M4a / M4b)

- **Level** (src/data/levels.js, committed skeleton): `{ id, act, name, blurb,
  tier, biome, layouts[], bossLayout, music, roster{etype:weight},
  introduce{etype:room}, hazards[], interactables[], bossAdds[[etype,n]],
  unlock }`.
- **Layout** (src/data/layouts.js, M4b, pure data read by sim AND env):
  `{ id, act, name, spawnPoints?[[x,z]], hazards: [{ type, x, z, ...params }],
  interactables: [{ type, x, z, yaw?, ...params }], blockers?: [...] }`. Layouts
  1–3 = the existing Act-I variants (placements added), 4–9 new.
- **Difficulty** (src/data/difficulty.js, committed): `difficulty(act, room,
  challenge)` → `{ hpMul, dmgMul, budget, defendBudget, eliteChance,
  waveIntervalTicks, waystoneHp, bossHp, bossDmgMul, … }` (§4.2).
- **Enemy archetype** (src/sim/enemies/<id>.js, M4b): `export default { id,
  threat, stats: { hp, moveSpeed, damage, attackCdTicks, radius, … },
  telegraph: { kind: 'lane'|'ring'|'cone', ticks ≥ 42 }, spawn(ctx, e),
  continuous(ctx, e, tick), resolve(ctx, e, tick), onHit?(ctx, e, hit),
  view(e) }` with `ctx = { registry, events, combat, rng, getTick, queueImpact,
  governor, movement, status }`; enemies.js dispatches; every player-targeted
  telegraph goes through the §11 governor; `spawnScaled(etype, x, z, { hpMul,
  dmgMul, elite })` applies difficulty.
- **Hazard** (src/sim/hazards.js): entity `{ kind: 'hazard', htype, faction:
  'neutral', phase: 'idle'|'telegraph'|'active'|'cooldown', phaseUntilTick,
  radius | lane{x0,z0,x1,z1,w}, … }`; per-type table `{ telegraphTicks ≥ 42,
  cycleTicks, damage, affects: 'all'|'party'|'hostile', effect }`. Hazard
  telegraphs are Ember, are NOT player-targeted (no governor slot), and are
  phase-offset per layout so no two resolve inside 0.6 s of each other.
- **Interactable** (src/sim/interactables.js): entity `{ kind, faction:
  'neutral', interactRadius: 1.1, uses, cooldownUntilTick, hp?, lifecycle?:
  'break', blocksMovement?, blocksProjectiles?, collider?: { hx, hz } |
  { r } }`; used by the `interact` press (resolved after revive arbitration,
  ascending party index then spawn ordinal — a same-tick double use activates
  once and emits `interact_denied { reason: 'used' }` for the other).
- **Skill** (src/sim/skills.js SKILLS): the §7 row shape plus optional
  `status: { kind, mag, ticks }`, `pierce`, `durationSec`, `cadenceSec`.
- **Node** (src/sim/nodes.js NODES): the §15 row shape plus a reinterpretation
  matrix `{ damage, heal, passive }` whose cells are `live` (with the effect
  descriptor) or `grey`, and the shape-capability rule that makes a cell live —
  the §15.5 display contract (grey / saturation-inert / verdict) applies
  unchanged to every new node.
- **Status** (src/sim/status.js, committed read side): plain data on the
  entity, kinds `slow stun haste shield ward exposed inspired`.

### 3.7 Network (M5a core, M5b play)

**Topology — listen server + session server.** The HOST browser runs the one
authoritative sim (it is seat 0, the Healer). Guests (seats 1–3: Tank,
Swordsman, Archer) run a replica world. The Node session server (server/**)
terminates WebSockets, runs lobbies and matchmaking, relays host ⇄ guest
traffic, applies the per-link network conditioner, caches host keyframes, and
drives host migration. "Server-side lag compensation" means the authoritative
side = the host sim (Source listen-server terminology); the UI and docs say
"host" honestly. Empty seats and dropped guests are played by the §12 ally AI;
seat 0 without a human (after migration) is played by a leader bot
(src/sim/leaderbot.js: follow the party centroid at 1.5 u, cast ready heals on
the smart target below 70% HP, basic-attack the nearest enemy in range —
deterministic, state-only inputs).

**Transport.** WebSocket (RFC 6455, zero-dependency server on node:http +
node:crypto; Node's built-in WebSocket client for bots). Binary frames carry a
1-byte channel header (`BIN` in src/net/protocol/constants.js); JSON text frames
carry control messages `{ t, ...payload }`. TCP never loses packets, so the
protocol defines two CLASSES and the conditioner models UDP semantics on top:
**unreliable** (SNAP, INPUT — latest-wins; the conditioner may drop, duplicate,
reorder them; the protocol must tolerate it via acked-baseline deltas and input
redundancy) and **reliable** (control, EVENTS, CMD, KEYFRAME — in order; a
simulated loss becomes a retransmit delay of max(200 ms, 2×RTT), exactly what a
reliable-over-UDP layer would do). The UI never claims UDP.

**Control messages** (JSON):

| C → S | payload | S → C | payload |
|---|---|---|---|
| hello | { v, build, name, token? } | welcome | { peerId, token, serverTime, protocol } |
| create_room | { visibility:'public'\|'private', name? } | room_state | { room: { code, state, hostPeerId, seats[4]: { peerId, name, classId, ready, connected, rttMs } } } |
| join_room | { code, seat? } | join_rejected | { reason: full\|not_found\|in_progress_locked\|version_mismatch\|bad_request\|server_full } |
| quick_match | {} | match_status | { queued, waitedMs, openRooms } |
| cancel_match / leave_room | {} | match_found | { code } |
| select_seat | { seat } | peer_joined / peer_left | { peerId, seat } |
| set_ready | { ready } | peer_dropped / peer_restored | { peerId, seat, holdMs } |
| start_game (host) | { seed } | game_starting | { countdownMs: 1500, seats } |
| reconnect | { token, code } | host_lost / host_changed / become_host | { graceMs } / { hostPeerId } / { keyframe, seats } |
| ping | { t } | pong | { t, serverTime } |

**Lobby / matchmaking states.** Room: `lobby → starting → in_game → closed`
(+ `migrating`). Codes: 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Seat
assignment is atomic in the server's single-threaded loop: two joins for the
last seat → exactly one `room_state` with the seat, one `join_rejected{full}`
(quick match then routes the loser to another room). Quick match: join the
oldest public `lobby` room with a free seat and the same protocol/build, else
create one and wait; after 15 s alone the UI offers "Start now — AI fills the
empty seats". Drop-in: joining an `in_game` room takes an AI-held seat (host
sends a full snapshot). Start: host only, enabled when every connected human is
ready. Build decisions (draft, path, shop, socket, expedition) belong to the
**host**; guests see the pages read-only with "The Healer is choosing…"
(guest attempts return `command_rejected`), and may "ping" a door/card (a
highlight broadcast as CMD).

**Rates.** Sim 60 Hz; snapshots 20 Hz (every 3 ticks; `?netrate=` 10–60 for
tests); input packets every client tick (60 Hz) carrying the last ≤ 6 unacked
input frames; host keyframe to the server every 120 ticks; ping 1 Hz.

**Snapshots — baseline/ack delta compression (Quake 3 model).** A snapshot is
the host's `save.capture()` tree split into HOT and COLD parts:
- HOT = the registry entity table, binary, quantised: position int16 at 1/256 u,
  orientation uint8 (256 steps) from aim/facing, HP varint at 0.01, `state`
  enum uint8, action/flag bits uint16 (dashing, downed, casting slot,
  basicHeld, telegraphing, stunned, elite, hitFlash), aim point int16 at
  1/64 u, other entity fields as a per-entity JSON diff. Per entity a u16 field
  mask vs the baseline entity; spawn and despawn lists. Linear movers (bolts,
  skill bolts, enemy shots) replicate spawn parameters once + despawn; the
  guest extrapolates them.
- COLD = everything else (systems, scene, app) as an RFC 7386 JSON merge patch
  against the baseline's cold tree, omitted when empty.
- Header: `u8 BIN.SNAP, u32 tick, u32 seq, u32 baselineSeq (0xFFFFFFFF = full),
  u32 lastInputSeqConsumed (for this guest), u8 flags, u16 inputBufferDepth`,
  and every 30 ticks `u64 hash` of the QUANTISED tree.
- The host keeps the last 32 snapshots per guest; a guest acks the newest seq it
  decoded in every input packet; the host deltas against the newest acked
  baseline; no usable baseline → full snapshot.
- EVENTS (reliable, batched per snapshot) carry every sim event since the last
  batch; the guest emits them on its local bus when its interpolation clock
  reaches their tick, **before** applying that tick's state (the replica is
  overwritten by every applied snapshot, so sim-side listeners on a guest can
  never drift it).

**Guest input, prediction, reconciliation.** Input frame = `{ seq, tick,
viewTick (the interpolated host tick on screen, 1/8-tick precision), move (4
bits: 8 dirs + none), aim int16×2 at 1/64 u, held bits (basic, revive), press
bits (dodge, skill_1..4 of the class kit, interact) }`. The guest predicts its
own seat's movement and dodge locally with sim/movement.js (`walkStep`,
`sweptStep`, class move speed, DODGE numbers — human-controlled allies get the
Healer's dodge rules). On each snapshot: rewind own entity to the authoritative
state at `lastInputSeqConsumed`, replay later inputs, and blend the visual error
out with τ = 100 ms (errors > 1.0 u snap). The host consumes one input per seat
per tick from a jitter buffer (target depth 2); missing → repeat the last held
state without presses; a late frame's presses are applied on the next tick (≤
250 ms late), never dropped; the guest nudges its tick rate ±2% to hold the
host's reported buffer depth at 2.

**Interpolation.** Remote entities render at `hostTime − interpDelay`,
`interpDelay = clamp(2 × snapshotInterval + 2 × jitterStd, 100, 250) ms`,
by writing `px/pz` (older snapshot) and `x/z` (newer) into the replica and
feeding the interpolation fraction as the frame alpha, so every existing
render layer interpolates unchanged. Missing snapshots → keep interpolating to
the next received one; extrapolate ≤ 100 ms, then hold.

**Lag compensation (host).** The host keeps a ring of hostile positions for the
last 20 ticks. A guest's instant shapes (melee_arc, nova, direct selection) and
its projectile *spawn aim* resolve against hostile positions rewound to the
input's `viewTick` (max rewind 15 ticks = 250 ms; beyond → clamped), then damage
applies to the live entities. Projectile flight itself is not rewound. The host
(seat 0) is never rewound. Single-player never enters this path.

**Desync detection.** Every 30 ticks the guest compares its reconstructed
quantised tree hash with the snapshot's hash; a mismatch increments `desyncs`,
requests a full snapshot and logs the first differing path.

**Reconnect + host drop.** Guest drop (socket close or 5 s silence): server
marks the seat `dropped`, AI plays it, others see "<name> reconnecting…"; the
guest client retries with backoff 0.25/0.5/1/2/4/5 s using the stored session
token (`echoes.net.session`, also after a page reload within 60 s → the title
offers "Rejoin ABCDE?"); on reattach the host sends a full snapshot; seat held
60 s. Host drop (close or 3 s silence): guests freeze their replica with "Host
connection lost — waiting (10 s)"; host back within the grace → resume (full
snapshots); else **migration**: the server picks the connected guest with the
lowest RTT, sends `become_host { keyframe (≤ 2 s old), seats }`; the new host
`save.apply()`s the keyframe and becomes authoritative, its own seat unchanged,
seat 0 → leader bot; other guests re-baseline. No guests left → room closes.
Server kill: every client returns to the title with "Connection to the server
was lost" and single-player intact.

**Conditioner** (src/net/protocol/conditioner.js, used by the server per link
and direction, and by the client for in-page tests): `{ latencyMs, jitterMs
(normal σ, clamped ≥ 0), loss (0–1, unreliable class), burstLoss { pGood→Bad,
pBad→Good, lossInBad }, dup, reorder (extra 20–60 ms), bandwidthKbps (token
bucket), outage { atMs, forMs } }`. Server CLI flags `--latency --jitter --loss
--dup --reorder --bw`; admin API (bound to 127.0.0.1, only with `--admin`):
`GET /health`, `GET /stats` (rooms, peers, per-link bytes/s up/down, rtt,
applied loss, drops, reorders), `POST /admin/conditioner { target: 'all'|peerId|
roomCode, up, down }`, `POST /admin/drop { peerId, mode: 'close'|'blackhole',
forMs }`, `POST /admin/kill-host { code }`.

**Bandwidth budget per guest**: downstream ≤ 12 KB/s average in combat and ≤
24 KB/s p95 (1 s windows, boss + adds); upstream ≤ 4 KB/s; host upstream ≤ 12
KB/s per guest + 6 KB/s keyframes.

**Single-player isolation.** No server, no session → the net modules are not
on the tick path at all: `world.step(tick, snapshot)` without `seatInputs`,
no rewind, no replica. Golden traces (§6.5) must be bit-identical to the
pre-M5b build.

---

## 4. Content design (summary — full numbers in docs/BUILD_BRIEF.md §23)

### 4.1 Three level configurations ("expeditions")

Each is a full 8-room run on the unchanged §2 skeleton (rooms 1–6 combat with
exactly 2 defend, 7 shop, 8 boss; §14 economy unchanged) with its own biome,
room table, roster, hazards, interactables and tier. The camp portal opens the
`expedition` picker (Act I preselected; locked acts show "Win <previous act>
to unlock"); New Game → Act I. `?act=N`, `cmd('startRun', { act })` bypass locks.

| Act | Expedition | Biome / palette (art bible) | Layouts | Roster (weights) | Hazards | Interactables | Boss adds |
|---|---|---|---|---|---|---|---|
| I | The Hollow Wood | night-graded woodland (certified v0.4.63 look) | 1 clearing · 2 crossroads · 3 hollow | boar .45 · mantis .30 · quillback .25 (room ≥ 2) | bramble, puffcap | dewfont, barricade, keg | 2 boar + 1 mantis |
| II | The Sunken Mill | wet slate + black-teal water, moss, rotten timber, amber lantern pools; violet only on the corrupted mill wheel | 4 millpond · 5 weir · 6 drowned granary | boar .15 · mantis .20 · quillback .15 · toad .25 · moth .25 (room ≥ 2) | millrace, puffcap | dewfont, barricade, keg, sluice | 1 toad + 2 moth |
| III | The Ashen Barrow | cold blue-grey ash, bone-stone cairns, ochre dead grass, brazier pools; violet veins on standing stones | 7 barrow gate · 8 ossuary row · 9 moonwell | mantis .15 · quillback .15 · moth .20 · ram .20 (room ≥ 2) · mole .30 | rockfall, gravefire | dewfont, barricade, keg, bell | 1 ram + 2 mole |

### 4.2 Difficulty curve (src/data/difficulty.js)

`T = 1.00 / 1.35 / 1.75` per act · `R = 1 + 0.08 × (room − 1)` · `hpMul = T·R`
· `dmgMul = 1 + 0.5·(T·R − 1)` · `budget = 4.0·T·R` threat points per wave
(defend × 0.8) · elite chance I: 0 (rooms 1–3) / 0.08, II: 0.12 + 0.02(r−1),
III: 0.20 + 0.03(r−1) · wave interval `480 × (1 − 0.04(r−1)) × [1, .95, .9]`
ticks · Stag HP `1800·T` · challenge multipliers relaxed ×0.75 HP / ×0.7 dmg,
harrowing ×1.25 / ×1.3.

| room | I hp/dmg/budget | II hp/dmg/budget | III hp/dmg/budget |
|---|---|---|---|
| 1 | 1.00 / 1.00 / 4.00 | 1.35 / 1.175 / 5.40 | 1.75 / 1.375 / 7.00 |
| 2 | 1.08 / 1.04 / 4.32 | 1.458 / 1.229 / 5.83 | 1.89 / 1.445 / 7.56 |
| 3 | 1.16 / 1.08 / 4.64 | 1.566 / 1.283 / 6.26 | 2.03 / 1.515 / 8.12 |
| 4 | 1.24 / 1.12 / 4.96 | 1.674 / 1.337 / 6.70 | 2.17 / 1.585 / 8.68 |
| 5 | 1.32 / 1.16 / 5.28 | 1.782 / 1.391 / 7.13 | 2.31 / 1.655 / 9.24 |
| 6 | 1.40 / 1.20 / 5.60 | 1.890 / 1.445 / 7.56 | 2.45 / 1.725 / 9.80 |
| boss | Stag 1800 | Stag 2430 | Stag 3150 |

Threat costs: boar 1.0 · mantis 1.2 · quillback 1.5 · toad 1.6 · moth 1.3 · ram
3.0 · mole 1.5 · elite × 1.8. Wave fill: seeded weighted draws from the act
roster (types introduced ≤ room) while cost ≤ remaining + 0.5, ≤ 8 per wave,
≤ 20 live per room. kill_all waves: 2 + int(2), +1 from room 4; defend: 4
waves at 0/12/24/36 s. The whole schedule is still rolled once at room start
(§11 discipline). The `?room=` harness (no run) keeps the legacy §11 roll
exactly (60/40 boar/mantis, 2–3 × 3–5).

### 4.3 Skill slots 4 → 8

`SKILL_SLOTS = 8` end to end: sim slot arrays + serialize/restore, keys
Digit1–Digit8 (input.js derives them), world slot loop, the §4 order (skills
ascending slot 0–7, then basic fire), HUD command bar (4 portraits · 8 skill
tiles · dodge; fits 1024×576 → 2560×1440), cooldown grammar/nudges on all 8,
draft `free_skill_slots = 8 − owned`, socket screen (8 rows × 2 sockets,
scrollable), run-UI carry keys 1–8, Controls tab. Ally kits stay 4.

### 4.4 New skills (9) and nodes (9) — full tables in BUILD_BRIEF §23.3–23.4

Skills: Lantern Flurry (dmg projectile ×3), Pale Lance (dmg piercing
projectile), Bell Toll (dmg nova + stun), Rootsnare (dmg zone + slow), Dewfall
(heal zone), Kindred Shield (heal direct + shield), Mending Tide (heal wide
arc), Hearthsong (heal nova + haste), Quiet Hearth (passive aura: heal + ward).
Nodes: Widen, Reach, Linger, Keen (stat) · Snare, Bulwark, Split, Resonance,
Galvanize (technique, each with damage/heal/passive reinterpretations). Pools:
15 draftable skills, 17 nodes; §14 prices and invariants unchanged.

### 4.5 New enemies (5) and hazards (5)

Quillback (rolling charge, Ember lane 0.8 s) · Mire Toad (lobbed glob, Ember
ring 1.0 s, slick) · Gloam Moth (flier, swoop lane 0.75 s) · Barrow Ram (front
horn-shield blocks party projectiles in ±55°, cone slam 1.0 s) · Grave Mole
(burrows, emerges under the target, ring 1.0 s) · Elite modifier (×1.8 HP, ×1.25
dmg, ×1.2 scale, indigo crown). Hazards: Bramble Snare (slow patch), Puffcap
(cyclic spore burst, ring 1.0 s, can be popped), Millrace (current lane +
surge 1.0 s), Rockfall (seeded ring 1.2 s + temporary rubble cover), Gravefire
Vents (sequenced vent line 0.9 s). Every avoidable damage ≥ 0.7 s Ember
telegraph; idle hazards never in the Ember band.

### 4.6 Interactive environmental assets (5)

Dewfont (E: party heals 25% max HP, once per room) · Barricade (destructible
cover, 60 HP, blocks movement and all projectiles) · Powder Keg (any damage →
1.0 s Ember fuse → 30 dmg blast r 1.6 to ALL factions) · Sluice Lever + Gate
(E: stops the millrace and its surges for 12 s, 20 s cooldown) · Warding Bell
(E: stuns non-boss enemies within 3 u for 1.0 s, once per room). Prompt ("E ·
Drink" etc., `ix-` prompt plate) within 1.1 u; used/cooldown state visible.

---

## 5. Platform-honest display settings (binding UI copy + behaviour)

| Setting | Truthful browser implementation | What the UI says |
|---|---|---|
| **Resolution scale** 50–150% (step 5) | `renderer.setPixelRatio(min(dpr, 2) × s)` + composer/bloom resize; drawing buffer clamped to ≤ 3840×2160 (the note shows when clamped); HUD/menus are DOM and stay crisp | "Render resolution 1200 × 675 (75%)" live readout; below 100%: "sharper UI, softer 3D, faster"; above: "supersampled — slower" |
| **Display mode** Windowed / Fullscreen | Fullscreen API on `document.documentElement` from a user gesture; `fullscreenchange` keeps the setting truthful when the player presses Esc/F11 or the browser exits; Keyboard Lock (`navigator.keyboard.lock(['Escape'])`, Chromium) when available so Esc opens the pause menu | "Fullscreen (browser)". With Keyboard Lock: "Hold Esc to leave fullscreen". Browser F11 fullscreen detected (window == screen, no fullscreenElement): "Browser fullscreen (F11) is on — press F11 to leave". Gamepad: "Press Enter or click — browsers don't let a gamepad button switch to fullscreen". |
| **V-Sync** On / Off | On: one render per `requestAnimationFrame` (paced by the display). Off: an uncapped MessageChannel loop renders as fast as the GPU allows (yielding to input between frames); stops while hidden | On: "Frames paced to your display (~<rafHz> Hz)". Off: "Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use." |
| **Frame-rate limit** 30 / 60 / 120 / 144 / Unlimited | Rendered-frame pacing inside the scheduler (rAF-aligned with V-Sync on; timer-paced with V-Sync off). The sim stays 60 Hz at every limit | Measured: "Rendering <n> fps"; a limit above the measured cap (e.g. 144 on a 60 Hz display with V-Sync on) shows "Your display caps this at ~60 fps". |
| **Exit** | confirm → flush settings/profile → `window.close()` → if the tab is still open after 300 ms, the farewell card | "Thanks for playing Echoes. Your browser keeps this tab open — close it whenever you like. Your progress is saved." [Return to Title] |

Apply/revert: every display change applies instantly as a live preview. Changing
Display mode or Resolution scale arms a Keep/Revert dialog (`keep-display`, 10 s
countdown, default focus Keep) when the player leaves the Display tab or closes
Settings; timeout or Revert restores the previous values. V-Sync and frame
limit apply instantly without a prompt. Each tab has "Reset to defaults" behind
`app.confirm`. Settings changed from the pause menu apply to the running game
immediately.

---

## 6. Harness contract

### 6.1 Boot params (src/app/params.js)

| Param | Meaning | Owner |
|---|---|---|
| `?scene=arena\|graybox\|simtest\|rendertest\|chartest\|camp` | legacy scene select — **skips the title** | existing |
| `?room=kill_all\|defend` | legacy wave room at boot — skips the title | existing |
| `?run=1` | legacy run autostart (room 1) — skips the title | existing |
| `?seed=N` | gameplay seed — skips the title | existing |
| `?variant=1..9` | arena layout (4–9 after M4b) — skips the title | existing/M4b |
| **`?menu=0`** | **menu-skip: boot straight into camp exactly like v0.4.63 (sim ticking from tick 1)** | M1 |
| `?menu=1` | force the title even with legacy params (e.g. `?seed=5&menu=1`) | M1 |
| `?freeze=1` | sim frozen at tick 0 until `__echoes.sim.thaw()` (golden traces) | ARCH |
| `?fresh=1` | wipe all `echoes.*` localStorage before boot (clean profile) | ARCH |
| `?act=1..3` | expedition for `?run=1` / the picker default | M4a |
| `?slot=<id>` | load that save slot at boot (skips the title) | M2 |
| `?audio=0` | engine built muted | M3 |
| `?debug=1` · `?fps=1` | sim panel · fps meter in player builds | existing / INT |
| `?net=ws://127.0.0.1:<port>/echoes` | server override | M5b |
| `?nethost=1` · `?netjoin=CODE` · `?netquick=1` · `?netname=` · `?netseat=` | auto-host / auto-join / quick match / name / seat (harness) | M5b |
| `?netcond=lat75,jit10,loss10,dup1,reo2` | client-side conditioner | M5a |
| `?netrate=10..60` | snapshot rate override | M5a |

Rule: title shown iff `?menu=1`, or no legacy param (scene, room, run, seed,
variant) and no `?menu=0`. A plain URL (what a player opens, and
tools/cert-capture.mjs's default) shows the title. Regression captures use
`?menu=0` or a legacy param. Every legacy param keeps its v0.4.63 behaviour.

### 6.2 Smoke and core-loop check (every builder, every commit)

`node tools/cert-capture.mjs shot <pfx>smoke --settle 4000 --timeout 180000`
→ exit 0, zero `[PAGEERROR]` (plain URL: after M1 this frame is the title).
Core loop: `--url "http://127.0.0.1:5199/?seed=7&menu=0"` + actions: hold KeyW
until `__echoes.cmd('campState').inPortal`, press E, wait for `state().run.phase
=== 'combat' && room === 1`, `killAllEnemies` until phase ≠ combat → phase
`reward` (reference: tools/actions/gnt-arch-coreloop.json).

### 6.3 Port scheme (own instances only; kill exactly your PIDs before returning)

| Key | Net server (`npm run net -- --port P`) | vite preview (`npx vite build --outDir dist-<key>` then `npx vite preview --outDir dist-<key> --port P --strictPort`) |
|---|---|---|
| shared dev server | — | **5199** (never start another, never kill) |
| player default | 7800 | — |
| ARCH / plan reviewer | 7801 / 7802 | 4300 |
| M1 · M2 · M3 · M4a · M4b | — | 4301 · 4302 · 4303 · 4304 · 4305 |
| M5a | 7810–7819 | 4306 |
| M5b | 7820–7829 | 4307 |
| INT | 7830–7839 | 4310–4312 |
| critics: menu · audio · save · content · net · journey | net 7840–7849, journey 7850–7859 | 4320 · 4322 · 4324 · 4326 · 4328 · 4330 |
| refuters | 7860–7889 | 4340–4359 |
| fix builders | 7890–7899 | 4360–4379 |

### 6.4 Debug API namespaces (`window.__echoes`)

Existing members are unchanged. New (service-backed, so owners add probes in
their own files through `impl.debug`):

- **`__echoes.sim`** (ARCH, committed): `frozen`, `freeze()`, `thaw()`,
  `stepN(n, scriptSeed|null)`, `script(seed, tick)`, `hash()` (M2's complete
  capture once `save` exists, else the observable snapshot), `trace(n,
  scriptSeed) → { fromTick, toTick, stepped, stateHash, eventsHash, eventCount,
  byType }` (excludes `sound`; destructive — a probe).
- **`__echoes.app`** (M1): `state`, `overlay`, `stack()`, `open(id, params)`,
  `back()`, `press(action)` (synthetic nav), `focus() → { screen, id, label,
  rect }`, `responses() → [{ action, source, inputTs, paintTs, ms }]` (last 50),
  `frameStats()`, `display()` (§3.3 state), `screens()` (registered ids).
- **`__echoes.settings`** (ARCH wrapper over M1's store, committed): `get`,
  `set`, `reset`, `dump`, `keys`, `persist`, `storageKey`, `loadReport`.
- **`__echoes.audio`** (M3): `state`, `unlock()`, `buses() → { name: { level,
  mode, muted, gainDb, effectiveDb } }`, `busGain(name) → { param, db }` (the
  live AudioParam value), `meter(tap) → { rmsDb, peakDb, peakHoldDb, lRmsDb,
  rRmsDb, clipCount }` for taps master|music|sfx|ambient|ui, `meterReset()`,
  `testTone(bus, { freq=440, dbfs=-18, ms=1000, x?, z? })`, `cueLog(n) → [{ t,
  cue, bus, x, z, pan, gainDb, voices }]`, `music() → { state, theme,
  intensity, crossfading, lastTransitionMs }`, `voices()`.
- **`__echoes.save`** (M2): `list()`, `save(slot)`, `load(slot)`,
  `remove(slot)`, `capture()`, `hash()`, `roundTrip({ ticks=600,
  scriptSeed=1, every=60 }) → { hashBefore, hashAfterApply, equal,
  continuationEqual, firstDivergence, events, ms }`, `corrupt(slot,
  'truncate'|'schema'|'keys'|'hash'|'newer')`, `simulateQuota(on)`,
  `simulateTornWrite(slot)`, `profile()`, `usage() → bytes per key`.
- **`__echoes.net`** (M5a/M5b): `state`, `role`, `room`, `seat`, `peers()`,
  `stats() → { rttMs, rttP95, jitterMs, lossPct, bytesInPerSec,
  bytesOutPerSec, snapshotBytesAvg, fullBytesAvg, deltaRatio, snapshotsPerSec,
  interpDelayMs, predErrP95, predErrMax, corrections, desyncs, reconnects,
  lastReconnectMs, inputBufferDepth, rewindTicksAvg, lagCompHits }`,
  `conditioner.{ set, get, clear }`, `connect(url)`, `host(opts)`, `join(code,
  seat?)`, `quickMatch()`, `leave()`, `setReady(b)`, `start()`, `drop(ms)`
  (force-close the socket for a drop test), `log(n)`.
- **`__echoes.content`** (M4a/M4b via `provide('content')`): `levels()`,
  `difficultyTable()`, `roomPlan()` (the rolled waves/costs of the live room),
  `hazards()`, `interactables()`.

### 6.5 Determinism tools

- `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend|run --ticks N
  --seed S --script K [--root <checkout>] [--record f | --golden f]` — headless
  Node sim trace (same construction as main.js). Measured at v0.5.0: kill_all
  3600 ticks `d1eff38b03f581aa / bca6aa1051309b21`, identical to v0.4.63.
- In page: `?seed=7&scene=arena&room=kill_all&freeze=1` then
  `__echoes.sim.trace(600, 3)` — identical across loads (`8e8d6fd519dca899 /
  817f1e9940c91d76` at v0.5.0).
- M5b records goldens BEFORE its first sim edit (seeds 1, 2, 3 × kill_all /
  defend / run, 3600 ticks) and must reproduce them at the end of W4.

### 6.6 Audio probing

Launch your own puppeteer with `--autoplay-policy=no-user-gesture-required`
(headless Chrome renders Web Audio to a null sink; AnalyserNode taps work).
All level measurements come from `__echoes.audio.meter()` / `testTone()`.

---

## 7. Measurable acceptance gates

A module passes only when every gate holds on the RUNNING game with numbers.
"All three sizes" = 1024×576, 1600×900, 2560×1440.

### M1 — title, settings framework, display
- **G1.1 Layout**: at all three sizes every title/settings item is fully inside
  the viewport, pairwise non-overlapping (DOM rects), type ≥ 14 / 18 CSS px
  (1024×576 / 1600×900), hit targets ≥ 40×40 px; nothing clipped.
- **G1.2 Navigation**: every screen reachable and exitable by keyboard only,
  mouse only and mocked gamepad only; Esc / B always goes back exactly one
  level (title root: no-op); exactly one visible focus ring whenever a screen
  is open; focus restored on return; no trap in 50 random nav actions.
- **G1.3 Response**: input → visual change p95 ≤ 50 ms, max ≤ 100 ms (20 presses
  per source, `app.responses()`).
- **G1.4 Render scale**: drawing buffer = round(css × min(dpr,2) × s) ± 1 px for
  s ∈ {0.5, 0.75, 1.0, 1.25} within 2 frames; HUD rects unchanged ± 1 px;
  fps(0.5) ≥ fps(1.0).
- **G1.5 Fullscreen**: toggle → `document.fullscreenElement` set within 500 ms;
  leaving fullscreen by the browser flips the setting to Windowed within one
  `fullscreenchange`; canvas = window size after each change.
- **G1.6 V-Sync**: on → `stats().source === 'raf'` and rendered fps ≤ rafHz × 1.02;
  off → `source === 'uncapped'`, rendered fps ≥ the V-Sync-on fps, honest label
  text present; sim 60 ± 1 ticks/s in both.
- **G1.7 Frame limit**: 30 and 60 → measured rendered fps (5 s) within ± 5%;
  120/144/unlimited within ± 5% of min(limit, measured cap) and the cap note
  shown when it binds; sim 60 ± 1 ticks/s at every limit.
- **G1.8 Persistence**: every setting survives reload; corrupt JSON → defaults +
  notice, 0 page errors; storage throwing → in-memory + footer note.
- **G1.9 Keep/Revert**: display-mode / render-scale change → 10 s countdown;
  timeout reverts both the setting and the observable effect.
- **G1.10 Exit**: confirm → farewell within 500 ms when the tab stays open;
  Return → title with settings intact; music → silence.
- **G1.11 Journey**: New Game → camp controllable within 1.0 s of the press;
  camp → portal → room 1 clears → reward by real input; `?menu=0` and every
  legacy param boot straight into camp with no title and the v0.4.63 behaviour.
- **G1.12**: 0 page errors in all M1 probes; title / loading / farewell frames
  pass the §19.1 palette discipline (no Ember, no violet, no Heal green).

### M3 — audio engine and mixer
- **G3.1 Curves**: for s ∈ {0, .25, .5, .75, 1} the live bus gain equals the
  §3.5 table within ± 0.1 dB (AudioParam) and ± 0.5 dB (testTone RMS on the tap),
  in both modes, for Master, Music and SFX.
- **G3.2 Decoupling**: Music 100 → 0 moves the sfx tap by ≤ 0.1 dB and vice
  versa; Master moves every tap by the same dB (± 0.2).
- **G3.3 No clipping**: master post-clipper sample peak < 0 dBFS, `clipCount = 0`
  across a boss fight with ≥ 6 adds at 100% sliders; limiter gain reduction ≤ 6
  dB in ≥ 95% of 100 ms windows.
- **G3.4 Balance** (defaults, combat): median master RMS (400 ms windows)
  between −24 and −14 dBFS; SFX-tap peaks ≥ 6 dB above the music-tap RMS; UI
  clicks ≥ 3 dB above the music RMS.
- **G3.5 Music**: states menu, camp, combat, boss, victory, defeat all audible
  and distinct (tempo or spectral centroid differ ≥ 15%); transitions crossfade
  1.5–2.5 s; the music tap never sits below −50 dBFS for > 1 s across any
  transition (except `silence`).
- **G3.6 Spatial**: testTone at listener + 6 u x → R − L ≥ 6 dB; at − 6 u → L − R
  ≥ 6 dB; at 0 → |L − R| ≤ 1 dB; 12 u is ≥ 6 dB quieter than 3 u.
- **G3.7 Coverage**: every row of the §3.5 cue table fires a cue (cueLog + sound
  events) in a scripted run.
- **G3.8 Autoplay**: 0 errors before a gesture; the first gesture resumes ≤ 100
  ms; with the autoplay flag no prompt ever shows.
- **G3.9 Persistence**: levels, modes, mutes persist across reload; mute-on-blur
  works; the Audio tab is fully operable by keyboard, mouse and pad.
- **G3.10 Cost**: engine main-thread ≤ 1 ms/frame p95; ≤ 48 voices; active
  voices ≤ 4 within 3 s of silence (no leak over a full run).

### M4a — systems content
- **G4a.1 Eight slots**: keys 1–8 fire slots 0–7 within 1 tick; the command bar
  shows 8 tiles + dodge + 4 portraits without overlap at all three sizes; the
  cooldown grammar and denial nudges work on all 8; draft `free_skill_slots = 8
  − owned`; socket screen lists all owned skills.
- **G4a.2 Skills**: each of the 9 new skills can be drafted, cast, and produces
  its authored numbers (BUILD_BRIEF §23.3) and a ≥ 3-layer VFX in its palette.
- **G4a.3 Nodes**: each of the 9 new nodes sockets, obeys caps/limits, and every
  live matrix cell is verified by a sim probe; grey / saturation-inert /
  verdict display per §15.5.
- **G4a.4 Expeditions**: the picker opens at the portal; locks honoured (bypass
  params work); each act uses its own layouts, roster, hazards, interactables,
  music theme and boss adds.
- **G4a.5 Curve**: measured hpMul / dmgMul / budget / elite chance per room match
  the §4.2 table ± 1%; strictly increasing across combat rooms within an act and
  across acts at equal room; spikes only at defend rooms and the boss.
- **G4a.6 Legacy**: `?room=kill_all` keeps the legacy composition (golden trace
  unchanged).
- **G4a.7**: statuses, Resonance counters etc. are plain entity/system data.
- **G4a.8**: the Act I 8-room run completes by real input; 0 page errors; fps
  within 10% of v0.5.0.

### M4b — world content
- **G4b.1 Enemies**: 5 new archetypes with distinct silhouettes (identifiable at
  50% zoom), every avoidable attack telegraphed ≥ 0.7 s in Ember, behaviour
  matches §23.5 numbers, full §9 juice, governor respected.
- **G4b.2 Hazards**: 5 types; telegraph ≥ 0.7 s in Ember before damage; idle
  state outside the Ember band; measured slow %, push speed and damage match.
- **G4b.3 Interactables**: 5 types; prompt within 1.1 u; E triggers with VFX +
  sound + state change; single-use/cooldown respected; barricade blocks
  movement and projectiles and breaks at 0 HP; same-tick double use activates
  once.
- **G4b.4 Biomes**: one combat frame per act passes the analyzer bars (>160 ≥
  1.5%, >200 ≥ 0.4%, ≥ 13/16 buckets, FLAT < 20%), reserved bands respected,
  ≥ 6 prop types per act with ≥ 3 unique to it, and a floor-box HUEMIX that
  differs from the other acts by ≥ 15 points in some channel.
- **G4b.5 Perf**: ≥ 60 fps in waves of every act on the GPU harness, no frame >
  100 ms after warm-up; a first-visit biome swap stays hidden under the
  transition fade (≤ 300 ms).
- **G4b.6**: every new entity is plain data (canonicalJSON succeeds on the
  registry mid-wave in every act).

### M2 — save / load
- **G2.1 Round trip** at camp, mid-combat with projectiles + zones in flight,
  reward screen, shop, boss with adds: `hashAfterApply === hashBefore` and the
  next 600 scripted ticks are identical (per-60-tick hashes + every non-sound
  event) to the unsaved continuation — 5 / 5 moments, and after a page reload.
- **G2.2 Completeness**: position, HP, cooldowns, skills, sockets, bench, wallet,
  act, room, phase, run frame, RNG, enemies, projectiles, zones, statuses,
  hazards, interactables restored (spot list in the report).
- **G2.3 Slot menu**: create / overwrite (confirm) / delete (confirm) / rename;
  metadata (date, playtime, act, room, party HP, thumbnail) correct; Load from
  the title restores the chosen slot in ≤ 1.5 s.
- **G2.4 Corruption**: truncated JSON, wrong schema, missing keys, bad hash,
  newer version, quota exceeded → each detected with a clear message; valid
  backup offered; 0 page errors; other slots unaffected.
- **G2.5 Atomicity**: a torn write (tmp written, main not) leaves the previous
  save loadable, and a newer valid tmp is promoted.
- **G2.6 Files**: export → import round trip keeps the hash.
- **G2.7 Autosave**: fires only at the listed safe points; no frame > 50 ms
  during an autosave.
- **G2.8 High scores**: recorded at run end with the §3.4 formula; persist
  across reload; shown on Records and the end cards ("New best").
- **G2.9**: Quit to Title → New Game yields a fresh camp (same hash as a fresh
  boot with the same seed).

### M5a — network core
- **G5a.1 Server**: `npm run net -- --port P` listening ≤ 1 s; `/health` ok;
  zero npm dependencies; 8 concurrent clients (Chrome + Node WebSocket).
- **G5a.2 Lobby**: create (public/private), join by code, quick match, seat
  select, ready, start; last-seat race → exactly 1 success in 50 trials; every
  rejection reason reachable and explicit.
- **G5a.3 Delta**: over a ≥ 60 s combat corpus mean delta bytes ≤ 30% of mean
  full bytes; decode(encode) exact (0 mismatches) with 20% random snapshot/ack
  loss.
- **G5a.4 Conditioner**: configured latency, jitter, loss, dup, reorder measured
  within ± 10% relative (10% loss → 9–11% over 10 000 packets); outage and drop
  work.
- **G5a.5 Harness**: the multi-client headless harness reports bytes/s, RTT,
  loss, delta ratio and desyncs.
- **G5a.6**: no src/sim edits; golden traces unchanged.

### M5b — network play
- **G5b.1**: 2–4 clients: every seat's position, orientation and actions
  replicate; guests control their seat; AI fills empty seats; drop-in works.
- **G5b.2 Lag** (150 ms RTT, ± 20 ms jitter, 10% loss): own movement responds in
  ≤ 1 frame; prediction error p95 ≤ 0.15 u; no correction > 0.1 u per frame
  below the snap threshold; remote motion without jumps > 0.3 u.
- **G5b.3 Lag compensation**: ≥ 95% of instant-shape hits valid on the guest's
  screen register at 150 ms RTT (and the same probe with rewind disabled shows
  the drop).
- **G5b.4 Bandwidth**: within the §3.7 budget; delta ratio ≤ 30%.
- **G5b.5 Desync**: 0 hash mismatches over ≥ 3 minutes at 10% loss.
- **G5b.6 Drop-offs**: guest drop + reconnect mid-room → full state and control
  within 3 s of link restoration; host drop → grace 10 s then migration ≤ 5 s,
  state age ≤ 2 s; server kill → title with a message, SP intact.
- **G5b.7 Races**: same-tick interaction → one activation; guest draft/path
  picks rejected cleanly while the host's apply; two joins for the last seat →
  one; simultaneous pause → the session never halts.
- **G5b.8 Isolation**: single-player golden traces bit-identical to the pre-M5b
  build (seeds 1–3 × 3 modes).

### INT — integration
- **GI.1** Full journey by real input with no dead end: title → Settings (one
  display + one audio change) → New Game → camp → portal → rooms → pause → save
  → quit to title → Load → same room, same build → finish or die → high score →
  Multiplayer host + 1 headless guest → leave → title.
- **GI.2** Pause menu: Resume / Settings / Save / Load / Save & Quit / Quit
  (confirm) all work; in MP it never pauses the session.
- **GI.3** Audio cues for all new content (G3.7 extended to W2 events).
- **GI.4** `npx vite build --outDir dist-int` + `vite preview` boots and plays
  the core loop with 0 page errors.
- **GI.5** No dev chrome in the player build (fps meter behind the setting /
  `?fps=1` / `?debug=1`; version label kept, small).
- **GI.6** Regression: 8-room loop by real input with drafts taken;
  keydown-to-move ≤ 2 ticks; dodge i-frames; telegraphs ≥ 0.7 s; camp, combat
  and boss frames each ≥ 16/20 on docs/REFERENCE_BAR.md with no zero; no
  frame > 100 ms after warm-up; 0 page errors.

---

## 8. Benchmark systems (critics compare blind)

| Module | Benchmarks | Why |
|---|---|---|
| Menu & display | Hades, Celeste, Hollow Knight, Slay the Spire; Unreal/Unity shipped-game settings conventions | instant-preview settings with Keep/Revert on display changes, full pad/keyboard parity with a visible focus, back always one level, settings that persist and survive bad files |
| Audio | Wwise/FMOD bus mixing in Hades and Dead Cells; dB-perceptual volume sliders of shipped PC games; well-behaved HTML5 games (CrossCode web, itch.io WebGL titles) | decoupled buses with a limiter, sliders that sound linear to the ear, music that crossfades by game state, spatial one-shots, clean autoplay unlock |
| Save | Hades and Slay the Spire (autosave at safe points, resume exactly), Stardew Valley and The Elder Scrolls (slot menus with metadata and confirmations), versioned/checksummed saves with backups (Factorio, Minecraft) | no lost progress, visible slot metadata, crash-safe writes, clear recovery |
| Content | Hades (biome identity, escalating encounters, build variety), Dead Cells (biome and hazard variety), Enter the Gungeon (enemy readability and telegraphs), Slay the Spire (act difficulty curve) | readable, escalating, varied rooms where every new threat is learnable |
| Network | Source engine networking model (snapshots, interpolation, prediction, lag compensation), Quake 3 delta compression against acked baselines, Overwatch netcode (GDC 2017), Risk of Rain 2 and Gunfire Reborn co-op lobbies | the reference designs for exactly the mechanisms the spec names, plus co-op lobby UX with drop-in and reconnect |
| Journey | first hour of Hades, Dead Cells, Slay the Spire | boot → title → settings → play → pause → save → quit → continue without a dead end or lost state |

---

## 9. Waves, dependencies, risks

### 9.1 What ARCH committed at v0.5.0 (the contract stubs)

- `src/app/`: `app.js` (createApp stub: state 'playing', boot/attach/simPaused/
  confirm/toast/debug), `registry.js` (services, settings tabs + rows, screen
  factories), `settings.js` (complete store with CORE_SETTINGS), `screens.js`
  (working stack + linear focus + `__navAdjust`), `widgets.js` (functional
  unstyled controls), `loop.js` (frame scheduler with v0.4.63 behaviour +
  stats), `params.js` (boot params + menu rule + storage wipe), `events.js`,
  `emitter.js`.
- `src/core/canonical.js`, `src/core/hash.js`, `src/sim/script.js` (scripted
  inputs), `src/audio/mixmath.js`, `src/data/levels.js`, `src/data/difficulty.js`,
  `src/sim/status.js` (read side), `src/net/protocol/constants.js`,
  `server/index.mjs` (+ `npm run net`), `tools/gnt-arch-simtrace.mjs`.
- Behaviour-neutral seams (golden traces unchanged): `SKILL_SLOTS = 4` +
  input keys derived from it, intents `skill_5..8` + `interact` (KeyE press,
  ignored by the world until M4b), `clock.stepOnce`, `combat.kill`
  `lifecycle: 'break'`, allies `ensureAllyFields` guard (fixes a latent crash
  when a run starts without camp seating), main.js anchors + app wiring +
  scheduler + `__echoes.sim` + service-backed namespaces, world.js anchors,
  `?freeze=1`, `.gitignore dist-*/`.

### 9.2 Dependencies between waves

W1 M1 ∥ M3 share only the settings store, tab registry, widgets and app events
(all committed). W2 needs W1's audio `registerEventCue` (for new cues) and
settings rows. M4a ∥ M4b share levels.js/difficulty.js (committed; M4a owns),
status.js (read side committed; M4a owns the write side), combat.js `break`
lifecycle (committed), the world.js anchors, input.js keys (committed). W3 M2
needs every W2 system's serialize/restore (W2 obligation). M5a ∥ M2 share
nothing but src/core/hash.js + canonical.js (committed): M5a builds the delta
codec against generic trees and `world.snapshotState()` corpora; M5b (W4)
plugs in `save.capture()/apply()`. INT (W5) needs everything.

### 9.3 Risks and mitigations

| Risk | Mitigation |
|---|---|
| Title on the plain URL breaks old action files | `?menu=0` / legacy params keep the v0.4.63 boot; documented in TESTING.md; the smoke only needs exit 0 |
| Capture-phase key handling conflicts (run UI also uses capture) | the app gate is registered first (APP-BOOT) and only intercepts while a blocking app screen is open; Esc priority rules §1.5 |
| Save misses private state (closures, module lets) | canonicalJSON throws on functions/non-plain data; round-trip probe with 600-tick continuation at 5 moments |
| Content changes RNG draw order vs v0.4.63 | expected for runs; the `?room=` harness keeps legacy rules; M5b's goldens are recorded at the start of W4 |
| Biome rebuilds hitch | swaps happen under the transition fade; boot warm-up covers the new materials (render/warmup.js pattern) |
| TCP hides packet loss | unreliable-class conditioner on the server + client; the UI never claims UDP |
| Host drop in a listen server | keyframes every 2 s to the server + migration with a leader bot for seat 0 |
| Fullscreen / autoplay / window.close are browser-gated | honest labels and fallbacks (§3.5, §5) |
| Two builders bump version.js at once | re-read before editing, take max+1 on conflict |

Out of scope this iteration (stated in the UI where relevant): key rebinding,
gameplay on gamepad (menus only), cloud saves, dedicated-server hosting beyond
LAN/localhost, new bosses per act (the Hollow Stag scales per act), WebRTC.
