# ECHOES — GAUNTLET LOOP PLAN (binding) · v0.5.1 · 2026-09-21

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
§7 acceptance gates · §8 benchmark systems · §9 waves, dependencies, risks ·
§10 revision log (v0.5.1: the 19 plan-review fixes and where each landed).

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
   **USER CORRECTION (2026-09-22, binding — supersedes every "skill slots
   4 → 8" / "8 skill slots" / "keys 1–8" line in this PLAN, BUILD_BRIEF §23,
   TESTING.md and the W2 builds):** "skill remain maximum 4, but the node for
   each skill increase to 8" and "for the 8 sockets, no more split between
   rare and legendary control, any rarity of the node can insert into any
   socket". The player equips **at most 4 skills**; **every skill has 8 node
   sockets**; **no socket has a rarity cap**. Implemented by the M4c
   correction builder (§2.1, §4.3, §7 "M4c").
5. MULTIPLAYER: real-time network play with socket connections, matchmaking /
   lobby rooms, delta-compressed player state sync (position, orientation,
   actions), predictive lag compensation; must survive packet loss, races and
   drop-offs without breaking local play.
6. **LINEAR CAMPAIGN (user CRITICAL REFACTOR, 2026-09-25, binding)** — the
   open level-selection model becomes a linear campaign: Begin Run launches
   Level 1; clearing a level shows a brief victory transition card, loads the
   next level and starts it (Level 1 → 2 → 3) without returning to the lobby;
   the lobby returns only after the final level or a paused "Quit to Lobby";
   the lobby's level select offers only sequentially unlocked levels. Design,
   rules and gates: **§12** (owner CAMPAIGN). It supersedes BUILD_BRIEF A14,
   the §23.1 picker and §4.1 portal rule 3.

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
playing ─Esc/P/Start on ANY page (combat, draft, path, shop, end cards;
         an open socket screen closes first and consumes that Esc)─► pause overlay
pause ─► Resume | Settings | Save | Load | Quit to Lobby (confirm, in a run; SP + MP host) | Save & Quit to Title | Quit to Title (confirm) | Leave Session (MP)
playing(run) ─run_end─► playing(camp)   (existing camp.js behaviour, untouched)
```

**Campaign sub-states of `playing` (§12, CAMPAIGN 2026-09-25)** — driven by
the sim's run phase, not by `app.state`:

```
camp ─E portal─► level 1 (combat · reward · path · shop · fade · boss)
level N ─Stag + adds dead (level_clear, once)─► transit(clear) ─ready ∧ ≥ 3 s | Enter ≥ 0.5 s | 10 s sim cap─► level N+1
level final ─level_clear─► victory (CAMPAIGN COMPLETE) ─10 s sim | Enter─► camp
level N ─defeat─► defeat card ─Enter─► camp        any ─pause ▸ Quit to Lobby─► camp (abandoned)
camp ─Level Select ▸ unlocked N─► transit(depart, ~2 s) ─► level N
```

### 1.3 Screen ids (registered with `registerScreen`, pushed by id)

| id | Owner | Blocking | Purpose |
|---|---|---|---|
| `loading` | M1 | yes | boot splash with progress; "Press any key or click" only while audio is autoplay-locked (§3.5; Esc grants no user activation, so it is not advertised) |
| `title` | M1 | yes | Continue* · New Game · Load Game · Multiplayer* · Settings · Records* · Exit. *Continue / Load / Records: shown when `service('save')` exists (Continue only with a save). **Multiplayer: shown only when `screenFactory('mp-menu')` is registered** (M5b, W4) — never merely because M5a's `net` service exists (W3), so the title never offers a dead item (gate G5b.13) |
| `settings` | M1 | yes | tab chrome; tabs from `settingsTabs()` |
| `keep-display` | M1 | yes | "Keep these display settings? Reverting in 10 s" |
| `confirm` | M1 | yes | generic dialog behind `app.confirm()` |
| `farewell` | M1 | yes | honest exit card |
| `saves` | M2 | yes | slot list, params `{ mode: 'load' \| 'save' }` |
| `records` | M2 | yes | high scores + records |
| `expedition` | M4a | yes | *superseded by `levels` (§12, 2026-09-25): the portal never opens a picker* |
| `levels` | CAMPAIGN | yes | the lobby's Level Select (map table beside the portal / L at the portal prompt): unlocked levels startable, locked ones visible and unstartable (§12.7) |
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
same scenes from a replica world — the SAME world object switched into replica
mode (never stepped, written only by snapshots, host events delivered through
`bus.replay()` to presentation listeners only; §3.7 "Replica bus").

### 1.5 Boot order and input routing (binding)

1. `parseBootParams()`; `?fresh=1` wipes `echoes.*` storage.
2. `createApp({ params })` — **before** `createInputController`. It installs,
   in this order, (a) the **gesture hook** (committed at v0.5.1 in
   src/app/app.js: window capture-phase `pointerdown`/`mousedown`/`keydown`/
   `touchend`, passive, never stops anything) and (b) M1's **window
   capture-phase input gate**. Both are registered before `ui/run/index.js`
   (which also listens in capture) and before core/input.js.
3. stage, sim core, scene, layers, HUD, run UI … (unchanged order).
4. `app.attach({...})`, `app.boot()`, INT-WIRING, `scheduler.start()`.

**Gesture hook (binding for M1 and M3 — plan-review fix W1).** The hook calls
`service('audio')?.unlock(e)` **synchronously inside the gesture's own event
task**, then every `app.onGesture(fn)` subscriber. M1 must keep it as the first
listener (or call it at the very top of its gate) — the gate may then
`stopImmediatePropagation()` freely, because the unlock has already happened.
M3 adds **no** window gesture listeners of its own (a bubble-phase or later
capture-phase listener would never fire while a blocking screen is up, leaving
a keyboard-only player with a silent menu and a "Press any key" that never
clears). The AudioContext is created **lazily inside the first `unlock()`**,
never at boot (Chrome logs an autoplay warning for a context created before a
gesture). Escape grants no user activation (HTML spec), so any other key or a
click unlocks. Per-frame audio work (listener = camera ground focus, music
intensity, meters) runs from `app.update(now)` → `service('audio')?.update(now)`
(committed) — M3 never edits main.js's LOOP region.

Gate rules while `screens.isBlocking()`:
- **keydown**: translated to a nav action (§3.3), `preventDefault()` (except
  F5/F11/F12, Ctrl/Meta combos and typing into a focused text input) and
  `stopImmediatePropagation()` — no game listener ever sees it.
- **keyup / mouseup / blur**: always pass through (they only clear held state;
  swallowing them leaves stuck keys).
- **mouse/pointer/wheel/contextmenu inside `#app-ui`**: reach their target; the
  `#app-ui` root stops propagation in the bubble phase so window-level game
  listeners never see them (the gesture hook already ran in the capture phase).
- On every transition to blocking: `input.releaseAll()` (M1 adds it inside the
  committed `@gnt:M1 INPUT-GATE` block of core/input.js: clears held keys,
  basicHeld, pending presses).

**Esc = pause on every page (plan-review fix; BUILD_BRIEF ruling A13).** When
no app overlay is open: (1) an open **socket screen** is a sub-overlay — Esc
closes it (banking the candidate, §16) and the socket handler calls
`e.preventDefault()` (M4a adds that call in W2; today it does not); (2)
otherwise Esc opens `pause` from combat **and from every run page** — draft,
path, shop, victory/defeat — the page stays underneath and keeps its focus.
The run UI never consumes Escape (M4a, W2): the draft's decline moves to **X**
and the Decline button (settle-guarded like Enter, BUILD_BRIEF §16/§22 rule
(2)); Escape is removed from the draft's key handler and never enters the
settle-window key sets. INT registers the pause listener in the BUBBLE phase
on window, last (`@gnt:INT-WIRING`), and opens pause iff `!e.defaultPrevented`.
Resuming returns to the exact page with its focus and settle state; the Enter
that confirmed Resume never reaches the page (the gate swallowed its keydown).
An Esc that ends element fullscreen must not also open/close a menu (ignore
Esc within 150 ms of a `fullscreenchange`). Gate GI.2 opens pause from each
page type.

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
| **ARCH** (W0, done) | docs/gauntlet/PLAN.md, build-ARCH*.md, the §23 extension + rulings A11–A14 in docs/BUILD_BRIEF.md, docs/TESTING.md Gauntlet section | the stubs listed in §9.1, tools/gnt-arch-* (read-only for everyone else, incl. tools/gnt-arch-browser.mjs) |
| **M1** (W1) | src/app/** (keeping the committed gesture hook first and `app.update → service('audio').update`) · src/ui/menu/** except the files other keys own below · src/ui/debug.js | src/app/{nav,gamepad,display,style,toast}.js · src/ui/menu/{title,settings,confirm,farewell,loading,keepdisplay}.js · src/ui/menu/tabs/{display,gameplay,controls}.js · tools/gnt-M1-* |
| **M3** (W1) | src/audio/** (incl. replacing synth.js) · src/ui/menu/tabs/audio.js | src/audio/{engine,voices,cues,music,ambient,spatial,meter}.js · tools/gnt-M3-* |
| **M4a** (W2) | src/sim/{skills,nodes,draft,run,waves,status,combat,shapes,autopilot}.js · src/data/{levels,difficulty,content}.js · src/core/intents.js · src/ui/hud/** (incl. the threat.js faction rule, §3.6) · src/ui/run/** (incl. the draft X-decline, §1.5) · src/ui/socket/** (incl. Esc `preventDefault`) · src/render/skillfx/** · src/render/techfx/** | src/ui/run/expedition.js · src/render/skillfx/<skill>.js · src/sim/autopilot.js (deterministic default-build bot, §6.7) · tools/gnt-M4a-* (incl. tools/gnt-M4a-actrun.mjs, §6.7) |
| **M4c** (W3.5, alone — the user's correction, before M5b) | every M4a file and anchored region above (it inherits the M4a row) · minimal edits in src/save/codec.js + src/save/capture.js (schema 2 migration, M2's files) · docs: BUILD_BRIEF §14/§15/§16/§23, this PLAN (§0 note, §2.1, §4.3, §6.5, §7 M4c, §10), TESTING.md M4c section | tools/gntM4c-* (incl. tools/gntM4c-certcapture.mjs / gntM4c-actrun.mjs — flag-only copies of the ARCH / M4a harnesses, see TESTING.md) — preview port 4304 (M4a's) |
| **M4b** (W2) | src/sim/{enemies,hazards,interactables,movement,boss,projectiles}.js · src/sim/enemies/** · src/data/layouts.js · src/render/enemies/** · src/render/hazards/** · src/render/interactables/** · src/render/boss/** · src/env/** · src/scenes/arena.js · src/ui/interact/** | src/sim/enemies/{quillback,toad,moth,ram,mole}.js · src/sim/hazards.js · src/sim/interactables.js · src/env/biomes/{wood,mill,barrow}.js · tools/gnt-M4b-* — **never edits shapes.js, combat.js, status.js, run.js, content.js** (it calls their contracts, §3.6) |
| **M2** (W3) | src/save/** · src/core/rng.js · src/core/clock.js · src/core/registry.js · main.js `@gnt:M2 RNG-WRAPPER` + `@gnt:SAVE` · src/ui/menu/{saves,records}.js | src/save/{index,capture,codec,storage,slots,profile,autosave,thumbnail}.js · tools/gnt-M2-* |
| **M5a** (W3) | server/** · src/net/protocol/** · src/net/{transport,lobbyClient}.js | server/{ws,lobby,matchmaking,relay,admin,keyframes}.mjs · src/net/protocol/{messages,codec,quantize,treediff,delta,snapshot,conditioner}.js · tools/gnt-M5a-netbench.mjs (fixed CLI + schema, §6.7) · tools/gnt-M5a-* — **no src/sim edits in W3** |
| **M5b** (W4) | src/net/{session,driver,replica,predict,reconcile,interp,lagcomp,seats,metronome}.js · src/sim/{remote,netseats}.js · src/sim/allies.js · src/ui/menu/{mpmenu,lobby,mpjoin}.js · src/ui/menu/tabs/network.js · src/ui/net/** | tools/gnt-M5b-* (server/** and src/net/protocol/** transfer to M5b in W4 for fixes it needs; seat 0's leader bot = M4a's src/sim/autopilot.js, reused unchanged) |
| **INT** (W5) | src/ui/menu/pause.js · vite.config.js · package.json scripts · index.html · main.js `@gnt:INT-WIRING` · everything else only via anchors | tools/gnt-INT-* |
| **CAMPAIGN** (2026-09-25, alone — the user's linear-campaign refactor) | src/data/campaign.js · src/campaign/** · src/ui/run/{transit,levels}.js · the campaign state machine in src/sim/run.js · every other file where a campaign root cause lives (minimal anchored edits, listed in docs/gauntlet/build-CAMPAIGN.md): camp.js BEGIN-RUN, arena.js dressing lifecycle, save codec/profile/records, pause.js Quit to Lobby, autopilot transit, audio `stopLevelVoices`, net guards, docs §12 / BUILD_BRIEF A15 + §23.2 note / TESTING campaign section | tools/gntCAMPAIGN-* · tools/actions/gntCAMPAIGN-* — net 7900–7909, preview 4380 |

### 2.2 Shared files and anchored regions

Every region below is a **committed** comment pair `@gnt:<NAME> begin` …
`@gnt:<NAME> end` at v0.5.1 (verify: `grep -rn "@gnt" src`). Edit only between
your own markers; re-read the file immediately before editing; never reformat
outside your region. A region nested inside another key's region belongs to
the inner key (the outer owner keeps it verbatim). Where a file needs no
concurrent second writer, the plan names ONE owner and no anchor is needed —
in particular **src/sim/shapes.js is M4a-only in W2** (M4b's barricade/rubble
blocking reaches the skill-bolt sweep through `movement.sweptContact()`, which
M4b exports and M4a calls inside shapes.js — plan-review fix).

| File | Region (committed anchor) | Who | What |
|---|---|---|---|
| src/main.js | `APP-BOOT` · `APP-ATTACH` · `LOOP` | M1 | app creation, attach ctx, frame scheduler + sim gate + gamepad poll; the sim step stays the `simStep(tick)` call |
| src/main.js | `AUDIO` | M3 | replace `createSynth(bus)` by the engine; nothing per-frame here (engine.update runs via app.update) |
| src/main.js | `M2 RNG-WRAPPER` | M2 | `rng.getState()/setState()` on the live reseedable handle (§3.4) |
| src/main.js | `M4a WORLD-LAYERS` · `M4a RENDER-TICK` | M4a | skill/technique layers, expedition picker, `provide('content', …)` (committed) |
| src/main.js | `M4b WORLD-LAYERS` · `M4b RENDER-TICK` | M4b | hazard / interactable / biome layers + prompts; probes via `registerContentProbe` |
| src/main.js | `SAVE` | M2 | createSaveSystem + provide('save') + `?slot=` |
| src/main.js | `NET` (holds `let simStep = …`) | M5a W3 (provide('net') client only) · M5b W4 (driver swap) | the ONE sim-step seam |
| src/main.js | `INT-WIRING` | INT | pause registration, Esc listener (last, bubble), cross-module wiring |
| src/main.js | `DEBUG-API` | normally none | namespaces are service-backed (`content`, `busCounters` committed) |
| src/render/stage.js | `M1 RENDER-SCALE` · `M1 RESIZE` · `M1 STAGE-API` | M1 | render scale, resize keeping the scale, `setRenderScale / renderScale / drawingBufferSize` |
| src/render/stage.js | `M2 THUMBNAIL` (inside `render()`) | M2 | one `onNextRender` hook line after `composer.render()` |
| src/core/input.js | `M4a INPUT-KEYS` | M4a (M4c) | skill keys (derived from SKILL_SLOTS = 4: Digit1–4; KeyE `interact` is already bound — M4b needs no edit) |
| src/core/input.js | `M1 INPUT-GATE` | M1 | `releaseAll()`, `setEnabled()` |
| src/core/constants.js | `M4a SKILL-SLOTS` · `M4a CONSTANTS` | M4a (M4c) | `SKILL_SLOTS = 4` (M4c correction; was 4 → 8 at W2) · `SOCKETS_PER_SKILL = 8`; M4a's frozen tables |
| src/core/constants.js | `M4b CONSTANTS` | M4b | M4b's frozen tables |
| src/core/clock.js | `M2 CLOCK-STATE` | M2 | serialize/restore (M2 owns the file in W3; `onTickEnd` is committed) |
| src/sim/world.js | `M4a SKILL-SLOTS` · `M4a PLAYER-SPEED` · `M4a CMD` | M4a | slot loop + stun gate; player walk × `status.speedMul`; M4a debug commands |
| src/sim/world.js | `M4b CONTENT-SYSTEMS` · `M4b CONTENT-CONTINUOUS` · `M4b CONTENT-DISCRETE` · `M4b HOSTILE-KINDS` · `M4b HOSTILE-KINDS2` · `M4b CMD` | M4b | hazards/interactables creation + `runSys.setRoomHooks(...)` call + phase hooks; faction-based hostile filters; M4b debug commands |
| src/sim/world.js | `M2 WORLD-STATE` | M2 | serialize()/restore() members |
| src/sim/world.js | `M5b SEAT-INPUTS` · `M5b CMD` · `M5b REPLICA` | M5b | step(tick, snapshot, seatInputs); replica-mode refusal of mutating cmds; `setReplica()` |
| src/sim/allies.js | `M4a ALLY-SPEED` (in `moveToward`) | M4a (W2) | steering step × `status.speedMul`; separation pushes unscaled. Hostile targeting already tests `faction === 'hostile' && hittable` (allies.js:263/325) — M4b needs NO edit here |
| src/scenes/camp.js | `M4a BEGIN-RUN` | M4a (W2); M5b (W4, host-only portal inside the same block) | portal rule + `startRun({ act, challenge })` |
| src/scenes/camp.js | `M1 CAMP-CMD` · `M2 CAMP-CMD` · `M4b CAMP-CMD` · `M5b CAMP-CMD` | each | `titleCam` · `restoreScene` · `applyLayout` passthrough · `followSeat` |
| src/scenes/camp.js, graybox.js | `M5b FOLLOW-SEAT` | M5b | follow target = local seat |
| src/scenes/graybox.js | `M1 SHAKE-SCALE` | M1 | amplitude × `gameplay.screenshake` |
| src/ui/run/endscreens.js | `M2 NEW-BEST` | M2 | "New best" line + rank |
| src/ui/run/index.js, src/ui/socket/index.js | `M2 RESTORE-RESYNC` · `M5b GUEST-GUARD` | M2 (W3) · M5b (W4) | restore resync; guest read-only guard |
| src/ui/hud/commandbar.js | `M5b VIEW-SEAT` | M5b | `setViewSeat(partyIndex)` |
| every render layer index (render/{skillfx,enemies,allies,techfx,boss}/index.js, ui/hud/index.js) | an `@gnt:M2 RESTORE-RESYNC` block M2 creates just before the factory's `return` | M2 (W3) | one `state_restored` handler each (no other W3 key edits these files) |
| src/sim/*.js not owned by M2 | `serialize()` / `restore()` members only | M2 (W3) | where a W0/W2 system lacks them |
| docs/TESTING.md | the module's own subsection | each key | |
| PROGRESS.md | append one table row per completed build | each key | |

W2 concurrency check (M4a ∥ M4b): the only files both touch are main.js and
world.js and constants.js — each through its own committed region above.
M4a alone edits shapes.js, combat.js, status.js, run.js, content.js,
ui/hud/threat.js; M4b alone edits movement.js, projectiles.js, enemies*.js,
hazards.js, interactables.js, layouts.js, arena.js. Cross-builder behaviour is
fixed by the §3.6 contracts, not by editing each other's files.

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
  `status_expire`, `shield_absorb`, `resonance_proc`, `split_shard`,
  `hit_blocked` (emitted by combat.applyDamage, §3.6 guard), `layout_enter`
  (`{ room, act, layoutId, biome }`, emitted by run.js right before
  `room_enter`) …; M4b `hazard_spawn`, `hazard_telegraph`, `hazard_resolve`,
  `interact`, `interact_denied`, `broken` (committed), `keg_ignite`,
  `keg_blast`, `sluice_toggle`, `bell_ring`, `elite_spawn`; M2
  `state_restored`; M5b `seat_control` (`{ partyIndex, controller:
  'human'|'ai', reason: 'join'|'drop'|'away'|'return'|'migrate' }`). The payload
  key `type` is forbidden (it would overwrite the event's own type — see run.js).
- **View-only events** (delivered with `bus.replay()` on a guest, never emitted
  by the sim, never in a snapshot or a trace): `presentation_retract` (`{
  predId }`) and predicted copies of own-seat events carrying `{ predicted:
  true, predId }` (§3.7 own-action prediction). `sound` is emitted by the
  audio engine on the local bus of every client and is never replicated.
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
app.update(nowMs)          // per rendered frame: service('audio')?.update(nowMs) FIRST (committed), then gamepad poll, latency probe, focus audit
app.onGesture(fn) -> off   // fn(event) runs synchronously inside every user-activation gesture (committed gesture hook, §1.5)
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
| display.fullscreen | false | bool — **session-only, `persist: false` (committed)** | M1 | `document.fullscreenElement` (a live mirror synced from `fullscreenchange`; browsers exit fullscreen on navigation and `requestFullscreen` needs a gesture, so it is never stored or re-applied at boot — §5) |
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
(M5a client → M5b session), `content` (**committed stub src/data/content.js,
owned by M4a**: `levels()`, `unlockedActs()`, `difficultyTable()`,
`roomPlan()`, `probe(name)`, `probes()`; M4b adds members ONLY by calling
`registerContentProbe('hazards' | 'interactables' | 'layout' | …, fn)` from
its own modules — each probe appears as `__echoes.content.<name>()`). Each
impl exposes `debug` for `window.__echoes.<name>`.

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
'raf'|'uncapped', vsync, limit, applied, frameMsP50, frameMsP95, workMsP50,
workMsP95, running }` measured over a sliding 2 s window (`frameMs` = interval
between rendered frames; `workMs` = wall time spent inside `frame()` incl. the
render submission — M1 adds it; `rafHz` is sampled from rAF callbacks even
while V-Sync is off). The sim advances by the wall time between
rendered frames, so every limit keeps 60 ticks/s. The uncapped scheduler stops
while the page is hidden.

**Display** — `src/app/display.js` (M1), `provide('display', …)`:
`setRenderScale(s)`, `setFullscreen(on)` (entering must be called from a user
gesture — Enter/Space/click count, from the nav handler or `app.onGesture`;
gamepad buttons do NOT count as user activation in browsers, the UI says so;
leaving never needs one), `setVsync(on)`, `setFrameLimit(n)`, `state() → {
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
  "rng":      { "seed", "s", "draws" },                   // the LIVE gameplay stream: rng.js gains getState/setState on mulberry32, and the
                                                          // reseedable handle in main.js (@gnt:M2 RNG-WRAPPER, M2's) delegates to rngImpl —
                                                          // camp.js's rng.reseed() swaps rngImpl, so only the handle reaches the live stream
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
   are created; `nextOrdinal` restored. **The Map is then rebuilt in ascending
   id order** (clear, re-insert every surviving/patched/new object sorted by
   id): Map iteration = insertion order, so a new id 5 inserted after a
   patched id 9 would otherwise break the §1 "ascending spawn ordinal"
   iteration rule and every order-dependent resolution after a load (gate
   G2.11).
4. Module-level state (movement.js statics, shapes.js `nextBoltOwnerSeq`) is
   captured too; static colliders are restored by re-entering the saved scene
   mode (`scene.cmd('campMode', [mode])`), never by storing geometry.
5. Render/UI layers resync on `state_restored` (rebuild rigs from the registry,
   close meta pages or re-open the one `run.view()` implies). M2 makes the
   minimal edits needed in each layer and lists them.
6. **Capture point (binding for M2 AND M5b).** `capture()` and `apply()` run
   ONLY at a tick boundary: inside a `clock.onTickEnd(fn)` callback
   (committed v0.5.1 — fires after `world.step` has fully returned, in both
   `advance` and `stepOnce`) or between frames (title Load, pause-menu Save,
   host migration). Never inside a bus listener (a `room_enter` / `shop_open`
   listener runs MID-step while world.js's `deferred` and `continuations`
   queues still hold closures and later phases of that tick have not run).
   Pattern: the listener sets `pending = reason`; the tick-end hook captures.
   `world.serialize()` asserts both queues are empty and throws a named error
   listing any leftover (M2 turns such carry-over into data per rule 1). The
   same rule binds M5b's snapshots (every 3rd tick-end) and keyframes.

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
**Schema 2 (M4c, the user's skill/socket correction; StateTree `v: 2`):**
`MIGRATIONS[1]` (src/save/codec.js, pure, deterministic, draws no RNG) keeps
the first 4 owned skills in ascending slot order, returns a dropped skill's
socketed nodes to the bench (provenance kept) and drops its passive clock,
Resonance counter, pending Echo recasts and Reapply clock, pads every build
row to 8 sockets, turns a pending SKILL reward with no free slot left into the
§16 empty offer, recomputes `freeSkillSlots` (4 − owned) and trims
`meta.skills`. The stored tree's hash is verified BEFORE migrating; the
migrated body gets its own hash so rename / import / restore write a
self-consistent schema-2 file. Storage keys stay `echoes.save.v1.*`.

**Thumbnail**: 256×144 JPEG (quality 0.7, ≤ 20 KB) captured by an
`onNextRender` hook in stage.js immediately after `composer.render()` (no
`preserveDrawingBuffer`), stored under `.thumb`.

**Playtime**: seconds of unpaused sim ticks (`ticks / 60`), accumulated into the
save and the profile.

**Autosave** safe points: `room_enter` (first tick of each room), `shop_open`,
the camp after `run_end`/`return_to_camp`, and Save & Quit. Never during a
transition fade, never as a net guest (host saves with `meta.network: true`;
loading such a save starts single-player with AI in every seat). Throttle ≥ 20 s
between autosaves except run end. Work is split across frames (capture at the
`clock.onTickEnd` that follows the safe-point event — rule 6 — then encode +
write in `requestIdleCallback`/next frames) so no frame exceeds 50 ms. For
`room_enter` the captured tick is the room's first tick (its end), so a load
resumes on the room's second tick exactly as the unsaved continuation.

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
engine.state                         // 'locked' (no AudioContext yet) | 'running' | 'suspended'
engine.unlock(event)                 // called ONLY by the committed app gesture hook, synchronously inside the gesture;
                                     // first call creates the AudioContext + graph, later calls resume() if suspended
engine.update(nowMs)                 // called once per rendered frame by app.update (listener pose from stage.camera,
                                     // music intensity, meters) — M3 never edits main.js's LOOP
engine.play(cueId, { x?, z?, gainDb=0, pitch=1, bus? }) -> voiceId|null   // x/z => spatial
engine.stop(voiceId)
engine.setListener(x, z)             // camera ground focus (engine.update calls it; exposed for probes)
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
UI clicks ─► UI bus ─┘      knee 6, ratio 12, attack 3 ms, release 150 ms) ─► prelimit tap (= clipper input; G3.3
                            measures HERE) ─► ceiling clipper (WaveShaper tanh soft-knee, output |x| < 1.0 by
                            construction, oversample '4x') ─► master tap ─► destination
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
excluded from every determinism comparison, never replicated (§3.7), and on a
network guest (bus in replica mode) the committed events.js delivers them
presentation-only instead of refusing them. The engine subscribes with
`bus.on` (presentation listeners), so it plays replayed host events on a
guest exactly as live ones on the host.

**Autoplay (binding — plan-review fix W1)**: NO AudioContext exists before the
first user-activation gesture (creating one at boot makes Chrome log "The
AudioContext was not allowed to start"). The committed app gesture hook (§1.5)
calls `engine.unlock(e)` synchronously inside that gesture — it runs in the
window capture phase ahead of M1's input gate, so the loading/title screens
unlock for keyboard-only, mouse-only and touch players alike. First call:
create the context + bus graph and start the music state machine; the context
is `running` within 100 ms. Later calls `resume()` a suspended context. With
`--autoplay-policy=no-user-gesture-required` the engine may create the context
at boot (probe `navigator.userActivation`/a trial `resume()`), so the loading
screen never shows the prompt. The `loading` screen shows "Press any key or
click" only while `engine.state === 'locked'`. No errors or warnings while
locked; cues are dropped (still logged in `cueLog` with `dropped: 'locked'`
and still emitted as `sound` events) while locked. M3 adds no window
listeners for gestures.

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
  continuous(ctx, e, tick), resolve(ctx, e, tick), view(e) }` with `ctx = {
  registry, events, combat, rng, getTick, queueImpact, governor, movement,
  status }` (no `onHit` hook: blocking is the data-driven `guard` checked by
  combat.applyDamage, contract (c) below; reactions to damage read the `hit` /
  `hit_blocked` state the archetype sees next tick via `e.lastHitTick` set by
  combat — M4a adds that field); enemies.js dispatches; every player-targeted
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
- **Status** (src/sim/status.js, committed read side; M4a owns the write
  side): plain data on the entity, kinds `slow stun haste shield ward exposed
  inspired`. Committed signatures (every key calls these, nobody re-implements
  them): `apply(e, kind, mag, ticks, tick, srcId = null)`, `speedMul(e,
  tick)`, `isStunned(e, tick)`, `damageDealtMul(attacker, tick)`,
  `damageTakenMul(target, tick)`, `absorb(target, amount, tick)`,
  `clearAll(e)`, `prune(e, tick)`.

**W2 cross-builder contracts (binding — M4a and M4b build against these
independently; plan-review fix):**

(a) **Per-room layout.** M4a's run.js rolls `layoutId` at each room start from
`levelFor(act).layouts` (room 8 = `bossLayout`; never the same layout twice in
a row; rolled with the run RNG in the §11 room-start roll, after the wave
schedule) and stores `run.layout = { act, layoutId, biome }` in run state
(serialized with run). It exposes it as `runSys.view().layout` and delivers it
two ways: (1) **sim**: `runSys.setRoomHooks({ enter(layout, tick), exit(tick)
})` — M4a implements `setRoomHooks` in run.js and calls `enter` synchronously
at the room-enter point (same tick, before `room_enter` is emitted) and `exit`
at room exit and run end; M4b calls `runSys.setRoomHooks(...)` inside
`@gnt:M4b CONTENT-SYSTEMS` so hazards.js / interactables.js spawn the layout's
placements (from src/data/layouts.js, pure data) — sim systems never learn the
layout from a bus listener; (2) **presentation**: the sim event `layout_enter
{ room, act, layoutId, biome }` emitted right before `room_enter`, on which
arena.js (M4b) swaps dressing under the transition fade. **Colliders from a
layout (barricades, rubble, cairns) are sim-owned**: interactables.js /
hazards.js register them through `movement.setDynamicColliders(list)` (M4b's
movement.js) — never set by scene/render code — so the Node harness and a
network guest get identical collision. **Restore** (M2): after `apply()`, M2
calls `scene.cmd('restoreScene', [{ mode, layout }])` (M2's `CAMP-CMD`), which
calls the arena's `applyLayout(layout)` (M4b implements it in arena.js and the
`M4b CAMP-CMD` passthrough) — dressing only, no sim writes, no seatParty. The
`?room=` harness spawns placements only with `?layout=N` or
`cmd('setLayout', N)`; `?variant=N` stays dressing-only (§6.1).

(b) **Party haste/slow.** M4a applies `status.speedMul(e, tick)` to the
player walk (`@gnt:M4a PLAYER-SPEED`, world.js) and the ally steering step
(`@gnt:M4a ALLY-SPEED`, allies.js `moveToward`; separation pushes unscaled).
M4b applies it inside enemies.js / enemies/*.js / boss.js (boss immune to slow
per §23.8, stun non-boss only). Dodge rolls are never scaled (§5 DODGE numbers
are fixed; i-frames unchanged). Environmental push (millrace) is displacement,
not speed, and is M4b's. Stun: M4a gates party skills/basics in `@gnt:M4a
SKILL-SLOTS` and allies' kit starts; M4b gates enemy attack starts with
`status.isStunned`.

(c) **Guard / block hook (Barrow Ram horn guard).** One choke point:
`combat.applyDamage(target, power, opts)` (M4a, combat.js) — every party damage
path already ends there (projectiles.js basic bolts via world queueImpact,
shapes.js skill bolts, nodes.js echo bolts, allies.js kits). Contract: the
target carries plain data `guard = { active, dirX, dirZ, halfArcDeg, shapes:
['projectile'] }` (M4b sets/updates it on the ram every tick from its facing).
If `guard.active && guard.shapes.includes(opts.shape)` and the hit direction
`(opts.dirX, opts.dirZ)` satisfies `dot(-dir, guardDir) ≥ cos(halfArcDeg)`,
applyDamage **draws no RNG** (the guard check precedes the crit roll), deals 0,
emits `hit_blocked { targetId, attackerId?, shape, delivery, x, z }` and
returns `{ blocked: true, amount: 0 }`. Callers that pass no direction are
never blocked. M4b renders the Bone "blocked" numeral + tink from the event;
M4a guarantees every projectile path passes `dirX/dirZ` (normalised flight
direction).

(d) **Threat pointers and hostile filters are faction-based.**
`ui/hud/threat.js` (M4a) replaces the hard-coded `ENEMY_KINDS` with `e.faction
=== 'hostile' && e.hp > 0 && e.hittable !== false` (plus the legacy harness
kinds `wisp`, `dummy`); a burrowed mole (`hittable: false`) shows its pointer
as the dirt-ripple variant, a flier the normal one. world.js HOSTILE-KINDS
(M4b) switches to the same faction test. Every new enemy entity is `faction:
'hostile'`; hazards and interactables are `faction: 'neutral'`.

(e) **The shared `content` service** is committed (src/data/content.js,
provided in `@gnt:M4a WORLD-LAYERS`). M4a owns the file and fills
`unlockedActs()` / `roomPlan()`; M4b adds members ONLY via
`registerContentProbe(name, fn)` from its own files (e.g. its WORLD-LAYERS
block or its sim module factory).

(f) **Run start carries `{ act, challenge }`.** `runSys.startRun({ act = 1,
challenge = 'standard' } = {})` (M4a) stores both in run state (serialized;
`difficulty(act, room, run.challenge)` reads run state, never settings).
camp.js `startPending` (`@gnt:M4a BEGIN-RUN`) reads
`service('settings')?.get('gameplay.challenge')` AT THE PORTAL PRESS and passes
it in (the UI layer reads app state; the sim never does);
`cmd('startRun', { act, challenge })` and `?run=1&act=N` do the same.

(g) **Projectile blockers.** M4b exports from movement.js
`sweptContact(x, z, dx, dz, radius) -> { t, entityId | null }` (first contact
over walls, static colliders and dynamic colliders; `entityId` set when the
contact is an entity-owned dynamic collider). An entity with a `collider` is
never a circle-contact victim of a swept projectile. M4a calls `sweptContact`
in shapes.js (skill + echo bolts): contact with a blocker entity → despawn
`cause: 'blocked'` and, for damage bolts, `onImpact(tick, bolt, blocker)` (the
barricade takes the hit through the normal §9 pipeline); heal bolts are simply
absorbed. M4b does the same in projectiles.js (basic bolts, enemy shots). Area
damage (nova, zones, keg, hazards) treats a blocker as a circle of radius
max(hx, hz).

(h) **Portal rule** (fixes the core-loop check, §4.1 / §6.2): see §4.1.


### 3.7 Network (M5a core, M5b play)

**Topology — listen server + session server.** The HOST browser runs the one
authoritative sim (it is seat 0, the Healer). Guests (seats 1–3: Tank,
Swordsman, Archer) run a replica world. The Node session server (server/**)
terminates WebSockets, runs lobbies and matchmaking, relays host ⇄ guest
traffic, applies the per-link network conditioner, caches host keyframes, and
drives host migration. "Server-side lag compensation" means the authoritative
side = the host sim (Source listen-server terminology); the UI and docs say
"host" honestly. Empty seats and dropped guests are played by the §12 ally AI;
seat 0 without a human (after migration) is played by a leader bot = M4a's
**src/sim/autopilot.js** (W2; follow the party centroid at 1.5 u, dodge Ember
telegraphs that cover it, cast ready heals on the smart target below 70% HP,
cast ready damage skills at the nearest enemy, basic-attack the nearest enemy
in range; deterministic, state-only intent snapshots — the same bot drives
the act runner of §6.7). M5b reuses it unchanged.

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
the host's `save.capture()` tree — taken in a `clock.onTickEnd` callback on
every 3rd tick, never inside a bus listener (§3.4 rule 6; keyframes likewise)
— split into HOT and COLD parts:
- HOT = the registry entity table, binary, quantised: position int16 at 1/256 u,
  orientation uint8 (256 steps) from aim/facing, HP varint at 0.01, `state`
  enum uint8, action/flag bits uint16 (dashing, downed, casting slot,
  basicHeld, telegraphing, stunned, elite, hitFlash), aim point int16 at
  1/64 u, other entity fields as a per-entity JSON diff. Per entity a u16 field
  mask vs the baseline entity; spawn and despawn lists. Linear movers (bolts,
  skill bolts, enemy shots) replicate spawn parameters once + despawn; the
  guest extrapolates them.
- COLD = everything else (systems, scene, app) as a **null-safe tagged tree
  diff** (src/net/protocol/treediff.js, M5a) against the baseline's cold tree,
  omitted when empty. NOT RFC 7386 merge patch: there `null` means "delete",
  and the sim tree is full of fields that legitimately become `null` (allies
  `mark`/`rallyPoint`, boss `bossId`, run `reward`/`path`/`shop`/`frame`,
  skills `override`, waves `waystoneId`), and merge patch replaces arrays
  wholesale. Format (JSON; values use the canonicalJSON tags for NaN/±Infinity/-0):
  ```
  Patch := { [key]: Op }                     // only keys whose canonical value changed
  Op    := ['s', value]                      // set/replace (value may be null, [], {}, any type)
         | ['d']                             // delete the key (absent ≠ null)
         | ['o', Patch]                      // recurse: plain object on both sides
         | ['a', newLen, [[i, Op], …]]       // array by index: resize to newLen, then patch
                                             //   listed indices (indices ≥ old length use 's')
         | ['k', idKey, order[], { [id]: Op }]  // keyed array: every element on both sides is a
                                             //   plain object with a unique scalar id at idKey
                                             //   ('id' | 0 for [k, v] pair arrays = Map-as-pairs);
                                             //   order = new id sequence; new ids use 's'
  diff(a, b) picks 'k' when both arrays qualify (auto-detected, deterministic),
  else 'a' when both are arrays, 'o' when both are plain objects, else 's'.
  Law: canonicalJSON(apply(clone(a), diff(a, b))) === canonicalJSON(b)
       for every pair canonicalJSON accepts; diff(a, a) = {} .
  ```
  The G5a.3 corpus must include: value→null, null→value, key deletion vs
  null, nested object→scalar and back, array element change / insert / remove
  / truncate / grow, Map-as-pairs arrays (`waves.pending`, allies seats),
  arrays of entity-like objects with ids (`waves.schedule`, nodes
  `echoQueue`), NaN / ±Infinity / -0, empty containers, and 10 000 random
  fuzz pairs.
- Header: `u8 BIN.SNAP, u32 tick, u32 seq, u32 baselineSeq (0xFFFFFFFF = full),
  u32 lastInputSeqConsumed (for this guest), u8 flags, u16 inputBufferDepth`,
  and every 30 ticks `u64 hash` of the QUANTISED tree.
- The host keeps the last 32 snapshots per guest; a guest acks the newest seq it
  decoded in every input packet; the host deltas against the newest acked
  baseline; no usable baseline → full snapshot.
- EVENTS (reliable, batched per snapshot) carry every sim event since the last
  batch **except `sound`** (every client's own audio engine derives its sounds
  from the replayed events; host sounds are never sent).

**Replica bus (binding — plan-review fix).** A guest never runs sim listeners:
- The guest's world is the boot world switched into replica mode
  (`bus.setReplica(true)` — committed in src/core/events.js — plus M5b's
  `world.setReplica(true)`): it is **never stepped**; the replica registry and
  every system's state are written ONLY by snapshot application (per-system
  `restore()`, §3.4), which restores host ids verbatim and sets
  `nextOrdinal` from the host. No guest code path calls `registry.spawn`
  (predicted cosmetics are render-only objects), and in replica mode
  `world.cmd` refuses every mutating command (returns null, counted) — so the
  camp scene's `run_end → seatParty → world.cmd('teleport')` is inert on a
  guest while its scene swap (`setMode`, static colliders) still happens.
- Host events are delivered with **`bus.replay(ev)`** (committed): ring +
  PRESENTATION listeners only. Every listener a sim module registers is tagged
  SIM by the committed `bus.sim()` view that createWorld swaps in (world.js
  room_cleared/defeat/hit hooks, nodes.js `'*'`, boss.js `telegraph_start`),
  and replay skips them. So a replayed `room_cleared` cannot re-run
  `runSys.onRoomCleared` (no second `glint_gain`, `reward_offer`, draft roll on
  the guest RNG or `run_end`), `defeat` cannot re-run `onDefeat`, `hit` cannot
  re-run `allySys.onHit`, and the nodes continuation queue never grows (a
  guest never runs `discretePhase`). A sim-side `bus.emit` on a guest is
  refused and counted (`counters.refusedEmits`); `sound` alone is delivered
  like a replay (it is presentation-originated).
- **Ordering per host tick T** (the guest's interpolation clock reaching T):
  pass 1 — every T event of despawn/death class (`death`, `*_despawn`,
  `broken`, `downed`) **and** every T event whose payload references an entity
  id absent from T's state, in host order, emitted BEFORE T's state is
  applied (the entity still exists in the replica, so a handler that looks it
  up finds it); then T's state is applied; pass 2 — all remaining T events
  (spawn class `spawn`, `*_spawn`, `boss_spawn`, `elite_spawn`,
  `hazard_spawn`, `spawn_telegraph` and everything else), in host order, AFTER
  the apply (the new entity exists).
- Gate G5b.14: over a 3-minute session each host event (by `tick, type,
  ordinal-in-tick`) is replayed exactly once on every guest;
  `bus.counters.simCalls` does not change on a guest after the session
  starts; `refusedEmits` stays 0; guest `glint_gain` / `reward_offer` /
  `run_end` counts equal the host's.

**Guest input, prediction, reconciliation.** Input frame = `{ seq, tick,
viewTick (the interpolated host tick on screen, 1/8-tick precision), move (4
bits: 8 dirs + none), aim int16×2 at 1/64 u, held bits (basic, revive), press
bits (dodge, skill_1..4 of the class kit, interact), flag bits (away) }`. The
guest predicts its own seat's movement and dodge locally with sim/movement.js (`walkStep`,
`sweptStep`, class move speed, DODGE numbers — human-controlled allies get the
Healer's dodge rules). On each snapshot: rewind own entity to the authoritative
state at `lastInputSeqConsumed`, replay later inputs, and blend the visual error
out with τ = 100 ms (errors > 1.0 u snap). The host consumes one input per seat
per tick from a jitter buffer (target depth 2); a late frame's presses are
applied on the next tick (≤ 250 ms late), never dropped; the guest nudges its
tick rate ±2% to hold the host's reported buffer depth at 2.

**Stale input + hidden tabs (binding — plan-review fix).**
- Missing input for a seat → the host repeats the last HELD state (move,
  aim, basic/revive held bits; never presses) for at most **8 ticks** (133
  ms), then feeds **neutral** input (move 0, held bits clear) until a frame
  arrives. After 5 s of silence the seat drops (§ reconnect) and the AI plays
  it.
- `visibilitychange → hidden` on a **guest**: the guest immediately sends a
  neutral frame with `away: true`; the host hands the seat to the §12 AI
  (`seat_control { controller: 'ai', reason: 'away' }`) until the guest is
  visible again and sends a non-away frame (`reason: 'return'`, the guest
  re-baselines from a full snapshot). While hidden the guest's net loop
  (acks, pings, keep-alive, snapshot decode) runs on a **Worker metronome**
  (src/net/metronome.js: a dedicated Worker posting 20 Hz ticks — Worker
  timers are not subject to the 1 Hz background-timer clamp), render and
  prediction stop.
- `hidden` on the **host**: the shared sim must not stop for everyone. The
  host's sim driver switches from rAF to the Worker metronome at 60 Hz
  (`clock.advance(elapsedWallMs, simStep)` per message, snapshots and
  keyframes continue, render stops, audio follows `audio.muteOnBlur`); on
  `visible` it returns to rAF. The UI states it honestly: "Hosting keeps the
  game running while this tab is in the background. If the browser suspends
  the tab (memory saver, mobile), players see 'Host connection lost' and the
  session migrates." Single-player keeps `gameplay.autoPause`.
- Harnesses that run several pages in one browser MUST use the multi-page
  flags of §6.7 (otherwise background pages stop rAF and results are flaky).

**Own-action prediction (binding — plan-review fix; Source/Overwatch
model).** Beyond movement and dodge, the guest predicts **its own seat's
actions**: basic swing/shot, kit casts (skill_1..4 of the class kit),
interact. A local **action shadow** (src/net/predict.js) holds the seat's
cooldowns, casting state and dodge timer, re-seeded from every authoritative
snapshot. When a local press is accepted by the shadow (off cooldown, not
downed, not stunned, not dashing where §5 suppresses), the guest immediately
— on the same rendered frame — (1) plays the swing/cast animation on its rig,
(2) replays a **predicted copy** of the matching presentation event on the
view bus: `bus.replay({ tick, type: 'ally_basic' | 'ally_cast' | …, seat,
predicted: true, predId: '<inputSeq>:<kind>' })` → VFX, audio cue and a
**cosmetic projectile** (render-only object; no registry spawn) start at once,
(3) starts that HUD cooldown tile. The host tags every event produced while
resolving a human seat's input with `{ seat, inputSeq }` (payload fields
added only when `seatInputs` is present — single-player payloads unchanged,
G5b.8). Reconciliation: when the authoritative event with the same `seat` +
`inputSeq` + kind arrives, the guest suppresses its one-shot presentation
(no second sound or swing) and hands the cosmetic projectile over to the
replicated entity (fade over 60 ms when it appears within 0.3 u; snap
otherwise). If the host denies it (`intent_denied` carrying that `inputSeq`)
or a snapshot with `lastInputSeqConsumed ≥ seq` arrives without it, the guest
replays `presentation_retract { predId }`: the cosmetic projectile and VFX are
removed and the cooldown tile restored to the authoritative value **within
one snapshot**. Damage numerals, hit reactions and kills are NEVER predicted
(authoritative only).

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

**No server / unreachable / LAN (binding UI states — plan-review fix).**
Multiplayer needs the zero-dependency session server; the UI never pretends
otherwise and never spins forever.
- The title shows **Multiplayer** only when the `mp-menu` screen is
  registered (M5b, W4 — §1.3). M5a (W3) provides the `net` service for probes
  only.
- Opening `mp-menu` (and every Host / Join / Quick Match press) first probes
  `net.serverUrl` (WebSocket `hello` → `welcome`, **3 s timeout**; one retry
  with 0.5 s backoff). States: `checking` (≤ 3.5 s, a labelled progress line,
  Cancel) → `online` (menu enabled; shows the server address and its
  `welcome.lanUrls`) or `unreachable`.
- `unreachable` panel (Void Charcoal plate, no Ember): "Can't reach the Echoes
  server at ws://127.0.0.1:7800/echoes." + "Multiplayer runs through a small
  server on the host's computer. On that computer, in the game folder, run
  `npm run net` (for players on your network: `npm run net -- --host
  0.0.0.0`), then press Retry." Buttons: **Retry** (default focus) · **Change
  server** (text input, validated `ws://` or `wss://` URL, saved to
  `net.serverUrl`) · **Back**. Single-player is untouched.
- **LAN hosting**: `npm run net -- --host 0.0.0.0 [--port 7800]` binds all
  interfaces and prints every reachable URL (`ws://192.168.x.y:7800/echoes`);
  `welcome.lanUrls` carries them; the host's lobby shows "Friends on your
  network: server ws://192.168.1.20:7800/echoes · code ABCDE". Default bind
  stays 127.0.0.1 (nothing is exposed unless the host asks).
- **https builds**: a page served over https cannot open `ws://` (mixed
  content). The Change-server field then requires `wss://` and the panel says
  "This page is served over https, so the browser only allows secure (wss://)
  servers."
- Mid-session server loss → §reconnect "Server kill" path; a guest whose
  server is back within the 60 s seat hold sees "Rejoin ABCDE?" on the title.
- Gate G5b.13 covers every state above.

**Conditioner** (src/net/protocol/conditioner.js, used by the server per link
and direction, and by the client for in-page tests): `{ latencyMs, jitterMs
(normal σ, clamped ≥ 0), loss (0–1, unreliable class), burstLoss { pGood→Bad,
pBad→Good, lossInBad }, dup, reorder (extra 20–60 ms), bandwidthKbps (token
bucket), outage { atMs, forMs } }`. Server CLI flags `--port P` (default
7800) `--host H` (default 127.0.0.1; `0.0.0.0` for LAN, prints every URL)
`--latency --jitter --loss --burst pGB,pBG,lossInBad --dup --reorder --bw`; admin API (bound to 127.0.0.1, only with `--admin`):
`GET /health`, `GET /stats` (rooms, peers, per-link bytes/s up/down, rtt,
applied loss, drops, reorders), `POST /admin/conditioner { target: 'all'|peerId|
roomCode, up, down }`, `POST /admin/drop { peerId, mode: 'close'|'blackhole',
forMs }`, `POST /admin/kill-host { code }`.

**Bandwidth budget per guest**: downstream ≤ 12 KB/s average in combat and ≤
24 KB/s p95 (1 s windows, boss + adds); upstream ≤ 4 KB/s; host upstream ≤ 12
KB/s per guest + 6 KB/s keyframes.

**Single-player isolation.** No server, no session → the net modules are not
on the tick path at all: main.js's committed `simStep` stays `(tick) =>
world.step(tick, sampleIntents())`, no `seatInputs`, no rewind, no replica, the
bus never in replica mode. Golden traces (§6.5) must be bit-identical to the
W2-end build (G2.10 / G5b.8).

**Local-loop protection (host and guests — plan-review fix).** Net work is
budgeted per frame and measured: `net.debug.stats()` adds `hostNetMsP50/P95`
(capture + per-guest diff + encode + send per snapshot, split over tick-ends),
`frameOver50Net` (frames > 50 ms during which net work ran > 10 ms),
`ownActionFeedbackMs` (keydown → predicted visual, per action), `retractions`,
`staleRepeatTicksMax`. Snapshot work for 3 guests must fit: capture once per
snapshot tick (shared by all guests), one COLD diff per guest against its own
baseline, HOT encode per guest ≤ 1 ms p95 on the GPU harness machine; a full
keyframe every 2 s is encoded incrementally across ≤ 4 frames. The rewind ring
stores positions only (20 ticks × live hostiles).

---

## 4. Content design (summary — full numbers in docs/BUILD_BRIEF.md §23)

### 4.1 Three level configurations ("expeditions")

Each is a full 8-room run on the unchanged §2 skeleton (rooms 1–6 combat with
exactly 2 defend, 7 shop, 8 boss; §14 economy unchanged) with its own biome,
room table, roster, hazards, interactables and tier.

**SUPERSEDED 2026-09-25 by §12 (linear campaign):** E at the portal ALWAYS
starts a campaign at Level 1 (menu-skip boots with `?act=N` / `?level=N`
start at N, rule 1 below); rule 3's picker is gone — other unlocked levels
start from the lobby's Level Select (§12.7). Rules 1–2 keep the §6.2
core-loop check valid unchanged. Historical text:

**Portal rule (binding — keeps the §6.2 core-loop check and every legacy
portal action working; plan-review fix).** E at the portal:
1. **Menu-skip boots** (`?menu=0` or any legacy/harness param, i.e.
   `params.menuSkip`) never open the picker: E starts `?act=N` (default 1)
   directly, exactly like v0.4.63 (fade → room 1), regardless of unlocks.
2. **Title-booted sessions with only Act I unlocked** (every fresh profile):
   E starts Act I directly — no picker.
3. **Title-booted sessions with ≥ 2 acts unlocked**: E opens the `expedition`
   picker (blocking; pauses the SP sim) with the last-played act preselected
   (profile `lastAct`, else the highest unlocked). **E, Enter or Space
   confirms the preselected card**; A/D/←/→ move; Esc/B backs out to the
   camp. Locked acts show "Win <previous act> to unlock".
New Game → camp (the portal then follows rule 2/3). `?act=N` and
`cmd('startRun', { act })` bypass locks. The reference action file
tools/actions/gnt-arch-coreloop.json therefore stays valid unchanged; if a
later wave must change the core-loop recipe, that key writes
`tools/actions/gnt-<KEY>-coreloop.json`, updates the pointer in
docs/TESTING.md in the same commit, and the ARCH file stays as the v0.5.x
baseline (ARCH files are never edited by builders).

| Act | Expedition | Biome / palette (art bible) | Layouts | Roster (weights) | Hazards | Interactables | Boss adds |
|---|---|---|---|---|---|---|---|
| I | The Hollow Wood | night-graded woodland (certified v0.4.63 look) | 1 clearing · 2 crossroads · 3 hollow | boar .45 · mantis .30 · quillback .25 (room ≥ 2) | bramble, puffcap | dewfont, barricade, keg | 2 boar + 1 mantis |
| II | The Sunken Mill | wet slate + black-teal water, moss, rotten timber, amber lantern pools; violet only on the corrupted mill wheel | 4 millpond · 5 weir · 6 drowned granary | boar .15 · mantis .20 · quillback .15 · toad .25 · moth .25 (room ≥ 2) | millrace, puffcap | dewfont, barricade, keg, sluice | 1 toad + 2 moth |
| III | The Ashen Barrow | cold blue-grey ash, bone-stone cairns, ochre dead grass, brazier pools; violet veins on standing stones | 7 barrow gate · 8 ossuary row · 9 moonwell | mantis .15 · quillback .15 · moth .20 · ram .20 (room ≥ 2) · mole .30 | rockfall, gravefire | dewfont, barricade, keg, bell | 1 ram + 2 mole |

### 4.2 Difficulty curve (src/data/difficulty.js)

(v0.5.1 numbers below; the BINDING constants are the latest dated note in
BUILD_BRIEF §23.2 — at M4c: T 1.00 / 1.15 / 1.75, slope 0.16, defend × 1.25,
Stag 2400·T with damage 1 + 0.7(T − 1).)
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
waves at 0/12/24/36 s.

**Felt escalation + playability band (measured in play, gate G4a.10).** The
curve is judged by what the party experiences, not only by the table: with
the deterministic default-build autopilot (§6.7, standard challenge, drafts
always taken, first door, cheapest affordable shop item), per act over seeds
1–5, **time-to-clear** and **party damage taken per room** trend upward across
rooms 1–6 (Spearman ρ ≥ 0.6 for each act's per-room medians), defend rooms
and the boss sit above the neighbouring kill_all rooms, act medians rise I <
II < III at equal room, and the default build **clears** every act (victory in
≥ 3 of 5 seeds for Act I, ≥ 3 of 5 for Act II, ≥ 2 of 5 for Act III) with no
combat room median above 120 s. If the band fails, M4a retunes the §4.2
constants (documented in BUILD_BRIEF §23.2), never the formula's shape. The whole schedule is still rolled once at room start
(§11 discipline). The `?room=` harness (no run) keeps the legacy §11 roll
exactly (60/40 boar/mantis, 2–3 × 3–5).

### 4.3 Skill slots and node sockets (USER CORRECTION 2026-09-22 — M4c)

*Superseded at M4c: the W2 text read "`SKILL_SLOTS = 8` end to end … keys
Digit1–Digit8 … 8 skill tiles … socket screen (8 rows × 2 sockets)". The user
meant the opposite axis:*

- **At most 4 equipped skills** — `SKILL_SLOTS = 4` end to end: sim slot
  arrays + serialize/restore, keys Digit1–Digit4 (input.js derives them;
  Digit5–8 unbound; intents skill_5..8 stay reserved so the net press-bit
  tables keep their wire layout), world slot loop, the §4 order (skills
  ascending slot 0–3, then basic fire), HUD command bar (4 portraits · 4 skill
  tiles · dodge), cooldown grammar/nudges on all 4, draft `free_skill_slots =
  4 − owned` (a 5th skill is never offered — the §16 substitution line offers
  a node), run-UI carry keys 1–4, Controls tab. Ally kits stay 4.
- **8 node sockets on every skill** (`SOCKETS_PER_SKILL = 8`, the passives
  included) and **no rarity caps**: any node of any rarity fits any socket;
  hard blocks are only the per-skill repetition limit (kept), a full row,
  a bad socket index and live combat. Legendaries on passives: Ascend = ×2
  pulse power, Resonance = every 3rd pulse ×2 (BUILD_BRIEF §15.2). Grey /
  saturation-inert verdicts (§15.5), denial feedback and the Siphon card line
  work on all 8 sockets.
- **Socket screen** for 4 rows × 8 sockets on one page (no scrolling,
  1024×576 → 2560×1440), fast by keyboard, mouse and gamepad; one sim-side
  **auto-fill** policy shared with the autopilot; each command-bar skill tile
  shows its socket fill (8-segment strip).
- **Node supply for 32 sockets**: 2 clear spoils per combat room, the 4-card
  shelf at 15/20/25 (BUILD_BRIEF §14 M4c note); **difficulty retuned** for the
  corrected build (§4.2 constants, BUILD_BRIEF §23.2 M4c note); **saves**
  migrate schema 1 → 2 (§3.4).

### 4.4 New skills (9) and nodes (9) — full tables in BUILD_BRIEF §23.3–23.4

Skills: Lantern Flurry (dmg projectile ×3), Pale Lance (dmg piercing
projectile), Bell Toll (dmg nova + stun), Rootsnare (dmg zone + slow), Dewfall
(heal zone), Kindred Shield (heal direct + shield), Mending Tide (heal wide
arc), Hearthsong (heal nova + haste), Quiet Hearth (passive aura: heal + ward).
Nodes: Widen, Reach, Linger, Keen (stat) · Snare, Bulwark, Split, Resonance,
Galvanize (technique, each with damage/heal/passive reinterpretations). Pools:
15 draftable skills, 17 nodes; §14 prices and invariants as restated at M4c
(4-card shelf 15/15/20/25, 72 buys any three, never four; 2 clear spoils per
combat room).

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
| **Display mode** Windowed / Fullscreen | Fullscreen API on `document.documentElement` from a user gesture; `fullscreenchange` keeps the setting truthful when the player presses Esc/F11 or the browser exits; Keyboard Lock (`navigator.keyboard.lock(['Escape'])`, Chromium) when available so Esc opens the pause menu. **Session-only**: never persisted, never re-applied at boot (browsers exit fullscreen on every navigation and entering needs a gesture) | "Fullscreen (browser)" + the note "Fullscreen lasts for this visit — browsers leave it when the page reloads." With Keyboard Lock: "Hold Esc to leave fullscreen". Browser F11 fullscreen detected (window == screen, no fullscreenElement): "Browser fullscreen (F11) is on — press F11 to leave". Gamepad: "Press Enter or click — browsers don't let a gamepad button switch to fullscreen". |
| **V-Sync** On / Off | On: one render per `requestAnimationFrame` (paced by the display). Off: an uncapped MessageChannel loop renders as fast as the GPU allows (yielding to input between frames); stops while hidden | On: "Frames paced to your display (~<rafHz> Hz)". Off: "Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use." |
| **Frame-rate limit** 30 / 60 / 120 / 144 / Unlimited | Rendered-frame pacing inside the scheduler (rAF-aligned with V-Sync on; timer-paced with V-Sync off). The sim stays 60 Hz at every limit | Measured: "Rendering <n> fps"; a limit above the measured cap (e.g. 144 on a 60 Hz display with V-Sync on) shows "Your display caps this at ~60 fps". |
| **Exit** | confirm → flush settings/profile → `window.close()` → if the tab is still open after 300 ms, the farewell card | "Thanks for playing Echoes. Your browser keeps this tab open — close it whenever you like. Your progress is saved." [Return to Title] |

Apply/revert: every display change applies instantly as a live preview. A
Keep/Revert dialog (`keep-display`, 10 s countdown, default focus Keep) is
armed ONLY for changes that the timeout can truthfully undo without a user
gesture: **Resolution scale** (revert = restore the previous scale) and
**entering Fullscreen** (revert = `document.exitFullscreen()`, which needs no
gesture). It opens when the player leaves the Display tab or closes Settings;
timeout or Revert restores the previous value AND its observable effect.
**Leaving fullscreen** applies immediately with no dialog (re-entering from a
timeout would need a gesture the timer does not have — offering it would be a
fake). V-Sync and frame limit apply instantly without a prompt.

**V-Sync measurement environment (binding for G1.6/G1.7).** Present cadence is
only meaningful where rAF is locked to a real display: the **display
harness** of §6.7 (headful Chrome, ANGLE/D3D11, visible window;
`node tools/gnt-arch-browser.mjs rafhz --headful` prints the display's
`rafHz`). Measured on the build machine at v0.5.1: rAF ≈ 161 Hz (a ~165 Hz
panel) both headful and headless — so V-Sync On ≈ 161 fps there, and V-Sync
Off can only show a difference if the game renders faster than that. The
Display tab always shows the measured numbers: "Display ~<rafHz> Hz ·
rendering <renderedFps> fps · frame work <workMsP50> ms". With V-Sync Off and
`workMsP50 ≥ 0.8 × (1000 / rafHz)` (the device cannot render meaningfully
faster than the display) the Off row reads "Your device renders about <n> fps
here — uncapped can't go faster than your GPU" with n = the measured uncapped
fps; this is the honest GPU-bound case, not a pass-by-equality. Each tab has "Reset to defaults" behind
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
| `?variant=1..9` | arena layout DRESSING only (4–9 after M4b) — skips the title. No hazards/interactables are spawned (the v0.4.63 sim content, so `?room=` golden traces stay unchanged). For N ≥ 4 without `?act`, the biome palette, props, music theme and ambient bed follow the layout's act (4–6 → Act II, 7–9 → Act III); the **roster** is `?act=`'s when given, else the legacy §11 roll in `?room=` | existing/M4b |
| `?layout=1..9` | like `?variant=N` **plus** that layout's hazards and interactables spawned in the `?room=` harness (or the camp-less arena) — the content critic's deterministic setup; skips the title | M4b |
| **`?menu=0`** | **menu-skip: boot straight into camp exactly like v0.4.63 (sim ticking from tick 1)** | M1 |
| `?menu=1` | force the title even with legacy params (e.g. `?seed=5&menu=1`) | M1 |
| `?freeze=1` | sim frozen at tick 0 until `__echoes.sim.thaw()` (golden traces) | ARCH |
| `?fresh=1` | wipe all `echoes.*` localStorage before boot (clean profile) | ARCH |
| `?act=1..3` | expedition for `?run=1` (single-level harness run) / the level a menu-skip portal press starts | M4a / CAMPAIGN |
| `?level=1..3` | menu-skip boot, then a CAMPAIGN at that level starts on the first ticked frame (harness: bypasses locks, `campaign.harness`; §12.11) — skips the title | CAMPAIGN |
| `?slot=<id>` | load that save slot at boot (skips the title) | M2 |
| `?audio=0` | engine built muted | M3 |
| `?debug=1` · `?fps=1` | sim panel · fps meter in player builds | existing / INT |
| `?net=ws://127.0.0.1:<port>/echoes` | server override | M5b |
| `?nethost=1` · `?netjoin=CODE` · `?netquick=1` · `?netname=` · `?netseat=` | auto-host / auto-join / quick match / name / seat (harness) | M5b |
| `?netcond=lat75,jit10,loss10,dup1,reo2` | client-side conditioner | M5a |
| `?netrate=10..60` | snapshot rate override | M5a |

Rule: title shown iff `?menu=1`, or no harness param (scene, room, run, seed,
variant, layout — src/app/params.js `LEGACY_HARNESS_PARAMS`) and no `?menu=0`.
`params.menuSkip` is the flag the §4.1 portal rule reads. A plain URL (what a player opens, and
tools/cert-capture.mjs's default) shows the title. Regression captures use
`?menu=0` or a legacy param. Every legacy param keeps its v0.4.63 behaviour,
including the portal (§4.1 rule 1: no expedition picker in menu-skip boots).

### 6.2 Smoke and core-loop check (every builder, every commit)

`node tools/cert-capture.mjs shot <pfx>smoke --settle 4000 --timeout 180000`
→ exit 0, zero `[PAGEERROR]` (plain URL: after M1 this frame is the title).
Core loop: `--url "http://127.0.0.1:5199/?seed=7&menu=0"` + actions: hold KeyW
until `__echoes.cmd('campState').inPortal`, press E, wait for `state().run.phase
=== 'combat' && room === 1`, `killAllEnemies` until phase ≠ combat → phase
`reward` (reference: tools/actions/gnt-arch-coreloop.json — valid through
every wave because `?menu=0` never opens the expedition picker, §4.1 rule 1;
re-verified at v0.5.1: portal tick 459 → combat room 1 tick 480 → reward tick
669).

### 6.3 Port scheme (own instances only; kill exactly your PIDs before returning)

| Key | Net server (`npm run net -- --port P`) | vite preview (`npx vite build --outDir dist-<key>` then `npx vite preview --outDir dist-<key> --port P --strictPort`) |
|---|---|---|
| shared dev server | — | **5199** (never start another, never kill) |
| player default | 7800 | — |
| ARCH / plan reviewer | 7801 / 7802 | 4300 |
| M1 · M2 · M3 · M4a (and M4c) · M4b | — | 4301 · 4302 · 4303 · 4304 · 4305 |
| M5a | 7810–7819 | 4306 |
| M5b | 7820–7829 | 4307 |
| INT | 7830–7839 | 4310–4312 |
| critics: menu · audio · save · content · net · journey | net 7840–7849, journey 7850–7859 | 4320 · 4322 · 4324 · 4326 · 4328 · 4330 |
| refuters | 7860–7889 | 4340–4359 |
| fix builders | 7890–7899 | 4360–4379 |
| CAMPAIGN builder · campaign critic | 7900–7909 · 7910–7919 | 4380 · 4332 |

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
  rRmsDb, clipCount, overMinus1Pct }` for taps master|music|sfx|ambient|ui and
  `prelimit` (the limiter output = clipper input, G3.3), `limiter() → {
  reductionDb, excursionsOver10dB }`, `meterReset()`,
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
- **`__echoes.content`** (committed service; M4a fills, M4b adds probes):
  `levels()`, `unlockedActs()`, `difficultyTable(challenge)`, `roomPlan()`
  (the rolled waves/costs/layout of the live room), `probes()`, and M4b's
  `hazards()`, `interactables()`, `layout()`.
- **`__echoes.busCounters`** (ARCH, committed): `{ emitted, replayed,
  simCalls, presentationCalls, refusedEmits, replica }` (G5b.14); CAMPAIGN
  adds `listeners` (live subscriber count, the GC.6 leak probe).
- **`__echoes.campaign`** (CAMPAIGN, §12.11): `state()`, `unlocked()`,
  `choose(n)`, `rules()`, `memory()`, `snapshot(label)`, `snapshots()`,
  `transitions()`, `ready(level)`, `unlock(list|null)`.
- **Deterministic content setup commands** (`__echoes.cmd`, plan-review fix
  — every critic and refuter builds its scenario with these, never by
  waiting for RNG): M4b — `spawn(etype, x, z, { elite?, hpMul?, dmgMul? })`
  (extends the existing `spawn`; returns the id), `spawnHazard(htype, x, z,
  params?)`, `spawnInteractable(itype, x, z, params?)` (ids returned),
  `hazardPhase(id, 'idle'|'telegraph'|'active'|'cooldown')` (forces the phase
  on the next tick), `armKeg(id)` (starts the fuse), `setLayout(layoutId)`
  (spawns that layout's placements in the current room/harness), `burrow(id,
  on)` (mole); M4a — `setStatus(id, kind, mag, ticks)`, `clearStatus(id,
  kind?)`, `startRun({ act, challenge, seed? })`, `skipToRoom(n)` (per act),
  `autopilot(on | { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' })`,
  `echoArm(skillId)` (a pending Echo recast now), `resonance(id, n)`. All
  return plain data and act at a tick boundary.
- **`__echoes.net.stats()` additions** (M5a/M5b): `hostNetMsP50/P95`,
  `frameOver50Net`, `ownActionFeedbackMs { p50, p95, max }`, `retractions`,
  `mispredictRetractMs`, `staleRepeatTicksMax`, `awaySeats`, `replayedOnce`
  (bool, per-event exactly-once check), `serverState`
  (`checking|online|unreachable`).

### 6.5 Determinism tools

- `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend|run --ticks N
  --seed S --script K [--root <checkout>] [--record f | --golden f]` — headless
  Node sim trace (same construction as main.js). Measured at v0.5.0: kill_all
  3600 ticks `d1eff38b03f581aa / bca6aa1051309b21`, identical to v0.4.63.
- In page: `?seed=7&scene=arena&room=kill_all&freeze=1` then
  `__echoes.sim.trace(600, 3)` — identical across loads (`8e8d6fd519dca899 /
  817f1e9940c91d76` at v0.5.0).
- v0.5.1 re-verified: all 9 Node traces (kill_all / defend / run × seeds 1, 2,
  7) identical to v0.5.0 after the replica-bus, tick-end and anchor stubs.
- **Goldens across W3/W4 (plan-review fix).** The reference build for both
  M2 and M5b is the **W2-end build** (the last W2 commit). M2 records
  `captures/gnt-M2-golden-<mode>-<seed>.json` (seeds 1, 2, 3 × kill_all /
  defend / run, 3600 ticks) from that build BEFORE its first edit — its edits
  to rng.js, clock.js, registry.js and every system's serialize/restore must
  leave them identical (gate G2.10). M5b re-records at the start of W4, must
  find them identical to M2's (else it stops and reports the W3 drift), and
  reproduces them at the end of W4 (G5b.8).
- **M4c re-record (the user's correction changes the sim legitimately).**
  4 skill slots (the scripted input presses keys 1–4 only), 8-socket rows,
  clear spoils, the 4-card shop and the retuned curve change all 9 traces.
  M4c preserved the W2-end files as `captures/gntM4c-w2end-golden-*.json`,
  recorded the M4c-end build as `captures/gntM4c-golden-*.json` and wrote the
  same bytes over `captures/gnt-M2-golden-*.json` — **the reference build for
  G2.10 and G5b.8 is now the M4c-end build**; M5b's start-of-W4 check compares
  against these. The legacy seed-7 `?room=` traces are back on the v0.5.0
  goldens (`d1eff38b03f581aa` kill_all / `554cd9c41db19975` defend).

### 6.6 Audio probing

Launch your own puppeteer with `--autoplay-policy=no-user-gesture-required`
(`launchEchoes({ autoplay: true })`, §6.7; headless Chrome renders Web Audio
to a null sink; AnalyserNode taps work). All level measurements come from
`__echoes.audio.meter()` / `testTone()`. The G3.8 locked-state probe runs
WITHOUT the flag and presses a key through puppeteer (a trusted gesture).

### 6.7 Named harnesses (plan-review fix — gates cite these by name)

**Shared launcher** `tools/gnt-arch-browser.mjs` (committed; import, never
edit): `launchEchoes({ gpu, headful, background, autoplay, width, height,
extraArgs })`, `openEchoes(browser, url)` → `{ page, errors, consoleLines }`,
`waitReady(page)` (sim ≥ 240 ticks and the warm-up bay empty), `measureRaf(page,
ms)`, `FLAGS`. Profiles:

| Profile | Launch | Used by |
|---|---|---|
| **GPU harness** | `launchEchoes({ gpu: true })` = headless + `--use-angle=d3d11 --enable-gpu-rasterization --ignore-gpu-blocklist --enable-webgl`, 1600×900, dpr 1 (same flags as the orchestrator's tools/gpu-fps.mjs) | every fps / frame-time gate: G1.4, G1.7 (≥ 60 limits), G4a.8, G4b.5, G5b.9, G5b.10, GI.6 |
| **Display harness** | `launchEchoes({ gpu: true, headful: true })` (visible window, rAF locked to the panel) + `rafhz --headful` first | present-cadence gates: G1.6, G1.7 cap notes |
| **Multi-page** | ANY harness with more than one page per browser, or a page that is not the focused tab: `background: true` (default) = `--disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows` | M5a/M5b/net critic multi-client runs, INT journey + MP leg |
| **Audio** | `autoplay: true` = `--autoplay-policy=no-user-gesture-required` | M3, audio critic, GI.3 |

**M5a multi-client harness** — fixed path `tools/gnt-M5a-netbench.mjs`
(M5a writes it in W3; M5b, critics and refuters reuse it read-only):
```
node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:<port>/echoes
     [--pages 2] [--bots 0] [--seconds 60] [--url http://127.0.0.1:5199/]
     [--cond lat75,jit10,loss10,dup1,reo2,burst0.05:0.3:0.8] [--mode lobby|combat|boss]
     [--drop guest:3000@20s | host:close@30s] [--out captures/<prefix>netbench.json]
```
Pages are puppeteer pages (multi-page profile) that auto-host / auto-join with
`?nethost=1` / `?netjoin=CODE`; bots are Node WebSocket clients using
src/net/protocol/*. Output (one JSON object, schema `echoes-netbench/1`):
`{ schema, startedAt, server, cond, pages, bots, seconds, perClient: [{ role,
seat, rttMs: { p50, p95 }, lossPct, bytesInPerSec: { avg, p95 },
bytesOutPerSec, snapshotBytes: { avg, fullAvg, deltaRatio }, desyncs,
predErr: { p95, max }, ownActionFeedbackMs: { p95 }, reconnects,
lastReconnectMs, fps: { avg, p5 }, frameOver50, pageErrors }], server: {
rooms, peers, drops, reorders }, verdict: { gates: { 'G5a.3': bool, … } } }`.
Exit code 0 even when a gate fails (the verdict says so); exit 1 only for a
harness crash or page errors.

**M4a act runner** — `tools/gnt-M4a-actrun.mjs --act 1|2|3 --seed S
[--challenge standard] [--out f]` (M4a writes it in W2): boots `?menu=0&seed=S`,
`cmd('startRun', { act })`, turns on `cmd('autopilot', …)`, steps the run to
its end with `__echoes.sim.stepN` in chunks (fast, deterministic), and
reports per room `{ room, mode, layoutId, ticksToClear, partyDamageTaken,
downs, enemiesByType, elites }` + `{ outcome, pageErrors }`. G4a.9/G4a.10 and
the content critic use it; the real-input legs of G4a.8/G4a.9 are separate.

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
  fps(0.5) ≥ fps(1.0) on the GPU harness (§6.7).
- **G1.5 Fullscreen**: toggle → `document.fullscreenElement` set within 500 ms;
  leaving fullscreen by the browser flips the setting to Windowed within one
  `fullscreenchange`; canvas = window size after each change.
- **G1.6 V-Sync** (display harness, §6.7; `rafHz` from `rafhz --headful`
  reported with the result): on → `stats().source === 'raf'` and rendered fps ≤
  rafHz × 1.02. Off → `source === 'uncapped'` and the honest label present;
  then EITHER (a) `workMsP50 < 0.8 × (1000 / rafHz)` (the device has
  headroom) and V-Sync-off rendered fps **≥ 1.3 × rafHz** — a real, measurable
  difference; OR (b) `workMsP50 ≥ 0.8 × (1000 / rafHz)` (GPU/CPU-bound) and
  the Display tab shows the measured uncapped fps within ± 10% of
  `stats().renderedFps` with the "can't go faster than your GPU" copy. Equal
  on/off numbers with headroom FAIL. Sim 60 ± 1 ticks/s in both. (If the
  critic's display is ≥ 144 Hz and the camp frame is GPU-bound, it re-runs
  (a) at `display.renderScale` 0.5 or with `--disable-gpu-vsync` noted.)
- **G1.7 Frame limit**: 30 and 60 → measured rendered fps (5 s) within ± 5%;
  120/144/unlimited within ± 5% of min(limit, measured cap) and the cap note
  shown when it binds; sim 60 ± 1 ticks/s at every limit.
- **G1.8 Persistence**: every persisted setting survives reload (all keys
  except the session-only `display.fullscreen`, which after a reload reads
  Windowed — matching `document.fullscreenElement === null` — and shows the
  "lasts for this visit" note); corrupt JSON → defaults + notice, 0 page
  errors; storage throwing → in-memory + footer note.
- **G1.9 Keep/Revert**: a render-scale change or ENTERING fullscreen → 10 s
  countdown; timeout and Revert each restore the setting AND the observable
  effect (drawing-buffer size back ± 1 px; `document.fullscreenElement ===
  null`); Keep keeps both. Leaving fullscreen applies at once with no dialog.
- **G1.10 Exit**: confirm → farewell within 500 ms when the tab stays open;
  Return → title with settings intact; music → silence.
- **G1.11 Journey**: New Game → camp controllable within 1.0 s of the press;
  camp → portal → room 1 clears → reward by real input; `?menu=0` and every
  legacy param boot straight into camp with no title and the v0.4.63 behaviour.
- **G1.12**: 0 page errors in all M1 probes; palette discipline (§19.1) is
  measured **inside the menu plates' DOM rects** (`__echoes.app.focus().rect`
  and every `[data-nav]` / `.ap-plate` rect, fed to `tools/analyze.mjs --box`):
  0 px in the Ember, violet and Heal-green bands inside every title, loading,
  settings, confirm and farewell plate. The backdrop outside the plates is the
  certified live camp render and is exempt, with an allowance: its Ember-band
  count may not exceed the certified camp's (≤ 952 px at 1600×900 per the
  PROGRESS certification advisory) + 10%.
- **G1.13 Gesture hook**: with a blocking title/loading screen up and NO
  autoplay flag, a single keyboard press (not Esc), a single click, and a
  single touch each reach `service('audio').unlock` (probe: a stub audio
  service provided before the press records the call) — 0 missed; the
  hook stays the first window capture listener after M1's changes.

### M3 — audio engine and mixer
- **G3.1 Curves**: for s ∈ {0, .25, .5, .75, 1} the live bus gain equals the
  §3.5 table within ± 0.1 dB (AudioParam) and ± 0.5 dB (testTone RMS on the tap),
  in both modes, for Master, Music and SFX.
- **G3.2 Decoupling**: Music 100 → 0 moves the sfx tap by ≤ 0.1 dB and vice
  versa; Master moves every tap by the same dB (± 0.2).
- **G3.3 No clipping** — measured at the **clipper INPUT** (a meter tap on the
  limiter output, `meter('prelimit')` / `meter('limiter')`, M3 adds both), not
  after the tanh ceiling (whose output is |x| < 1 by construction and proves
  nothing): across a boss fight with ≥ 6 adds at 100% sliders, samples above
  −1 dBFS at the clipper input ≤ 0.1% of samples; limiter gain reduction ≤ 6
  dB in ≥ 95% of 100 ms windows and never > 10 dB for more than 50 ms
  (`DynamicsCompressorNode.reduction` sampled per frame, excursions counted);
  post-clipper peak < 0 dBFS as a sanity check only.
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
- **G3.8 Autoplay**: without the autoplay flag — no AudioContext exists before
  the first gesture (`engine.state === 'locked'`), 0 errors and 0 autoplay
  warnings in the console before it; the first keyboard press (not Esc) OR
  click OR touch on the loading/title screen — while M1's gate is swallowing
  it — reaches `unlock` through the app gesture hook and the context is
  `running` ≤ 100 ms later; "Press any key or click" clears; keyboard-only
  players hear the menu. With the autoplay flag no prompt ever shows.
- **G3.9 Persistence**: levels, modes, mutes persist across reload; mute-on-blur
  works; the Audio tab is fully operable by keyboard, mouse and pad.
- **G3.10 Cost**: engine main-thread ≤ 1 ms/frame p95; ≤ 48 voices; active
  voices ≤ 4 within 3 s of silence (no leak over a full run).

### M4a — systems content
- **G4a.1 Eight slots** — *superseded by the user's correction: see G4c.1
  (4 slots) and G4c.2 (8 sockets per skill).* (W2 text: keys 1–8 fire slots
  0–7 within 1 tick; the command bar shows 8 tiles + dodge + 4 portraits
  without overlap at all three sizes; the cooldown grammar and denial nudges
  work on all 8; draft `free_skill_slots = 8 − owned`; socket screen lists all
  owned skills.)
- **G4a.2 Skills**: each of the 9 new skills can be drafted, cast, and produces
  its authored numbers (BUILD_BRIEF §23.3) and a ≥ 3-layer VFX in its palette.
- **G4a.3 Nodes**: each of the 9 new nodes sockets, obeys its limit (M4c: no
  caps any more — G4c.2), and every live matrix cell is verified by a sim
  probe; grey / saturation-inert / verdict display per §15.5.
- **G4a.4 Expeditions**: *(picker half superseded 2026-09-25 — the Level
  Select of §12.7 / GC.8 replaces it)* locks honoured (bypass params work);
  each act uses its own layouts, roster, hazards, interactables, music theme
  and boss adds.
- **G4a.5 Curve**: measured hpMul / dmgMul / budget / elite chance per room match
  the §4.2 table ± 1%; strictly increasing across combat rooms within an act and
  across acts at equal room; spikes only at defend rooms and the boss.
- **G4a.6 Legacy**: `?room=kill_all` keeps the legacy composition (golden trace
  unchanged).
- **G4a.7**: statuses, Resonance counters etc. are plain entity/system data.
- **G4a.8**: the Act I 8-room run completes by real input; 0 page errors; fps
  within 10% of v0.5.0 on the GPU harness (§6.7).
- **G4a.9 Acts II and III end to end**: each completes all 8 rooms — shop and
  Stag included — (1) by real input once (keyboard + mouse through the
  capture harness, drafts taken) and (2) by `tools/gnt-M4a-actrun.mjs` over
  seeds 1–5; 0 page errors, no stuck phase (every room clears or the run ends
  in defeat within 180 s of room start), the act's own boss adds spawn.
- **G4a.10 Felt curve**: the §4.2 playability band holds on actrun data —
  per-act Spearman ρ ≥ 0.6 for time-to-clear and for party damage taken
  across rooms 1–6, defend rooms and the boss above neighbouring kill_all
  rooms, act medians I < II < III, default-build victory rates as listed.
- **G4a.11 Portal rule**: `?menu=0` (and `?seed=7` alone) → E at the portal
  starts Act I with no picker (tools/actions/gnt-arch-coreloop.json passes
  unchanged); title session with only Act I unlocked → no picker. *(The "Acts
  I–II unlocked → picker" half is superseded 2026-09-25: the portal always
  starts Level 1 — GC.1; other levels start from the Level Select — GC.8.)*
- **G4a.12 Run pages**: Esc on draft / path / shop / end cards is not consumed
  by the run UI (`defaultPrevented === false`) and never declines; X and the
  Decline button decline; socket Esc closes the socket with
  `defaultPrevented === true`.

### M4c — content correction (the user's 2026-09-22 correction; W3.5, alone)
Probes: tools/gntM4c-simprobe.mjs (Node), tools/gntM4c-drive.mjs
`socket|sizes|hud|pages` (GPU harness), tools/gnt-M4a-actrun.mjs /
tools/gntM4c-actrun.mjs (act runner), tools/gntM4c-realrun.mjs (real input),
tools/gntM4c-band.mjs (band analysis).
- **G4c.1 Four skill slots**: `SKILL_SLOTS = 4`; keys 1–4 fire slots 0–3 on
  the press tick, keys 5–8 produce nothing (no cast, no denial); the command
  bar shows 4 skill tiles + dodge + 4 portraits inside the window with 0
  overlaps at all three sizes; draft `free_skill_slots = 4 − owned`; with 4
  owned a skill reward substitutes a node with the §16 line; a 5th `giveSkill`
  is refused.
- **G4c.2 Eight sockets, no caps**: every skill (all 17, the passives
  included) exposes 8 sockets; every node of every rarity sockets into every
  socket of every skill (17 × 17 × 8 = 2312 operations, 0 denials); no
  `socket_denied` ever carries a rarity reason; the per-skill repetition
  limit holds for all 17 nodes (limit + 1 → `limit`); a 9th node on a full
  row → `full`; index 8 → `no_such_slot`; live combat → `combat_active`.
- **G4c.3 Legendaries on passives**: Ascend on Warding Aura heals 6 per pulse
  (3 × 2; crit 9); Resonance on a passive makes every 3rd pulse ×2 with
  `resonance_proc { pulse: true }`, the Echo Reapply pulse never advances the
  counter; previews name both effects (no cap copy anywhere).
- **G4c.4 Verdicts on all 8 sockets**: the corrected §23.4 matrix holds on
  sockets 1, 4 and 8 for all 17 skills; a technique fires from socket 8; the
  Siphon card line rides every Siphon preview; saturation-inert `+0` (never
  the strike) and grey strike display on any socket in the socket screen.
- **G4c.5 Socket screen**: 4 rows × 8 sockets + bench + detail on one page at
  1024×576 / 1600×900 / 2560×1440 — inside the window, 0 overlaps, no scroll,
  text ≥ 12 real px, cells ≥ 48 real px; by keyboard (pick → place, move a
  socketed node, remove, auto-fill, 1–4, Esc consumed), mouse (click,
  right-click remove) and gamepad (View opens, D-pad, A, B, X, Y); a limit
  denial shakes the cell; a node draft opens it with the node in hand.
- **G4c.6 Command-bar socket fill**: each skill tile's 8-segment strip equals
  the sim's filled / live / grey counts (`hud.slots()[i].sockets`).
- **G4c.7 Node supply**: 2 clear spoils per combat clear (commons + rares,
  forfeited on a soft-fail, drawn stipend → spoils → reward); the shelf is 4
  cards 15/15/20/25 inside the window at all three sizes, 72 buys any three
  and never four; the default-build autopilot reaches the Stag with ≥ 50% of
  its owned sockets filled (Act I seeds 1–3); auto-fill places only live
  nodes within limits, spreads, is deterministic, refuses in combat.
- **G4c.8 Difficulty on the corrected build**: the §4.2 band (G4a.10) holds by
  the act runner over seeds 1–5 in Node AND in page with the M4c constants,
  and G4a.8 / G4a.9's real-input legs (Acts I, II, III seed 1, keyboard +
  mouse, socket screen by its own keys) complete with 0 page errors.
- **G4c.9 Save migration**: a GENUINE schema-1 file written by the v0.5.39
  build (8 slots, 2-socket rows, 6 skills owned) parses, migrates to schema 2
  and applies: first 4 skills kept in slot order, the dropped skills' nodes on
  the bench, kept rows padded to 8 with nodes in place, a stale skill reward
  → the empty offer, 600 ticks after the load clean and bit-identical after a
  re-apply; malformed v1 trees never throw; the M2 probes stay green.
- **G4c.10 Determinism**: the 9 goldens re-recorded at the M4c-end build are
  reproduced by a second process (9/9); legacy seed-7 `?room=` traces = the
  v0.5.0 goldens; M2's Node round trips 9/9 and in-page round trips hold.
- **G4c.11 Net unaffected**: the M5a probes stay green (protocol, corpus,
  lobby, netbench); guest presses map to the 4-skill ally kits; single-player
  isolation unchanged.

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
- **G4b.5 Perf**: ≥ 60 fps in waves of every act on the GPU harness (§6.7), no
  frame > 100 ms after warm-up; a first-visit biome swap stays hidden under the
  transition fade (≤ 300 ms).
- **G4b.6**: every new entity is plain data (canonicalJSON succeeds on the
  registry mid-wave in every act).
- **G4b.7 Biome quality**: one combat frame per NEW biome (Sunken Mill, Ashen
  Barrow; wave with ≥ 4 enemies incl. a new type, a hazard mid-telegraph, the
  party in frame) scores **≥ 16/20 on docs/REFERENCE_BAR.md with no zero**,
  exactly as the Act I combat frame is certified.
- **G4b.8 Deterministic setups**: every §6.4 content command (`spawn` with
  elite, `spawnHazard`, `spawnInteractable`, `hazardPhase`, `armKeg`,
  `setLayout`, `burrow`) produces the stated state on the next tick, and
  `?layout=N` spawns layout N's placements while `?variant=N` spawns none
  (legacy golden trace unchanged).

### M2 — save / load
- **G2.1 Round trip** — `hashAfterApply === hashBefore` and the next 600
  scripted ticks are identical (per-60-tick hashes + every non-sound event) to
  the unsaved continuation, at EVERY moment below, and again after a page
  reload (load from storage). Act I: (1) camp; (2) mid-combat with
  projectiles + zones in flight; (3) reward screen; (4) shop; (5) boss with
  adds; (6) Bramble slow active on the Healer + a damaged barricade + a keg
  mid-fuse (`armKeg`). **Act II**: (7) a Puffcap swelling mid-telegraph + a
  millrace surge telegraph + the sluice on cooldown + a toad slick on the
  ground + a haste status active. **Act III**: (8) a burrowed mole mid-tunnel
  + a Rockfall telegraph with ≥ 1 rubble collider present + a Gravefire line
  mid-sequence + a pending Echo recast (`echoArm`) + non-zero Resonance
  counters + an elite alive. Each moment is built with the §6.4 setup
  commands, never by waiting for RNG. 8 / 8.
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
- **G2.10 Goldens unchanged**: the Node golden traces kill_all / defend / run
  × seeds 1–3 (3600 ticks) recorded from the W2-end build before M2's first
  edit are bit-identical at M2's last commit (M2's rng.js / clock.js /
  registry.js / serialize-restore edits change nothing about simulation).
  *M4c re-recorded the references at the M4c-end build (the user's correction
  changes the sim legitimately, §6.5); from then on G2.10 compares against
  those files — `node tools/gntM2-goldens.mjs` 9/9 at M4c's last commit.*
- **G2.11 Registry order**: after `apply()` of a tree whose ids interleave
  with the live registry's (e.g. saved [3, 5, 9], live [3, 9, 12]),
  `registry.all()` is in strictly ascending id order and a 600-tick
  continuation matches.
- **G2.12 Capture point**: a capture requested from inside a `room_enter`,
  `shop_open` or `run_end` listener is deferred to the next
  `clock.onTickEnd` (probe: the capture's tick equals the event's tick and
  `world.serialize()` reports empty `deferred` / `continuations`); no capture
  ever throws for a closure.

### M5a — network core
- **G5a.1 Server**: `npm run net -- --port P` listening ≤ 1 s; `/health` ok;
  zero npm dependencies; 8 concurrent clients (Chrome + Node WebSocket).
- **G5a.2 Lobby**: create (public/private), join by code, quick match, seat
  select, ready, start; last-seat race → exactly 1 success in 50 trials; every
  rejection reason reachable and explicit.
- **G5a.3 Delta**: over a ≥ 60 s combat corpus mean delta bytes ≤ 30% of mean
  full bytes; decode(encode) exact (0 mismatches, canonical-JSON equality) with
  20% random snapshot/ack loss; the §3.7 tree-diff law holds on the full
  corpus list (value→null, null→value, delete-vs-null, array element change /
  insert / remove / truncate / grow, Map-as-pairs, id-keyed arrays, NaN /
  ±Infinity / -0, empty containers) and 10 000 fuzz pairs, 0 failures; a
  cold tree with nulls never triggers a hash mismatch.
- **G5a.4 Conditioner**: configured latency, jitter, loss, dup, reorder measured
  within ± 10% relative (10% loss → 9–11% over 10 000 packets); outage and drop
  work.
- **G5a.5 Harness**: `tools/gnt-M5a-netbench.mjs` exists with the §6.7 CLI and
  emits the `echoes-netbench/1` schema (bytes/s, RTT, loss, delta ratio,
  desyncs, per-client fps) using the multi-page profile; a critic can run it
  unmodified against its own server port.
- **G5a.6**: no src/sim edits; golden traces unchanged.

### M5b — network play

Network conditions (conditioner, both directions, per guest link; results
reported per condition by `tools/gnt-M5a-netbench.mjs`):
**N1** 150 ms RTT ± 20 ms jitter, 10% loss · **N2** 250 ms RTT ± 40 ms, 20%
loss · **N3** burst loss (Gilbert–Elliott pGB 0.05, pBG 0.3, lossInBad 0.8 →
≈ 11% average, bursts of 3–10 packets) at 150 ms · **N4** 1% dup + 2% reorder
(20–60 ms) at 100 ms. "Pass" thresholds apply at N1; "degrade" thresholds at
N2–N4 (playable, bounded, never broken).

- **G5b.1**: 2–4 clients: every seat's position, orientation and actions
  replicate; guests control their seat; AI fills empty seats; drop-in works.
- **G5b.2 Lag**: own movement responds in ≤ 1 frame under every condition.
  N1 (pass): prediction error p95 ≤ 0.15 u; no correction > 0.1 u per frame
  below the snap threshold; remote motion without jumps > 0.3 u. N2 / N3
  (degrade): prediction error p95 ≤ 0.35 u, max ≤ 1.0 u (the snap threshold),
  remote jumps > 0.6 u in ≤ 1% of frames, extrapolation holds ≤ 100 ms then
  freezes (never runs away), no reconnect triggered, 0 desyncs. N4: 0 decode
  errors, 0 desyncs, no duplicated event presentation.
- **G5b.3 Lag compensation**: ≥ 95% of instant-shape hits valid on the guest's
  screen register at N1 and ≥ 85% at N2 (the rewind clamps at 250 ms); the
  same probe with rewind disabled shows the drop.
- **G5b.4 Bandwidth**: within the §3.7 budget at N1–N3; delta ratio ≤ 30%.
- **G5b.5 Desync**: 0 hash mismatches over ≥ 3 minutes at each of N1, N2, N3
  and N4.
- **G5b.6 Drop-offs**: guest drop + reconnect mid-room → full state and control
  within 3 s of link restoration; host drop → grace 10 s then migration ≤ 5 s,
  state age ≤ 2 s; server kill → title with a message, SP intact.
- **G5b.7 Races**: same-tick interaction → one activation; guest draft/path
  picks rejected cleanly while the host's apply; two joins for the last seat →
  one; simultaneous pause → the session never halts.
- **G5b.8 Isolation**: single-player golden traces bit-identical to the
  M4c-end build (seeds 1–3 × 3 modes; the same recordings as G2.10 — W2-end
  until the M4c correction re-recorded them, §6.5), and the SP core loop
  (§6.2) unchanged.
- **G5b.9 Host local loop** (GPU harness; host page + 3 guests, boss fight
  with adds, N1): host rendered fps ≥ 60 (same bar as SP GI.6), 0 frames > 50
  ms attributable to net work (`frameOver50Net === 0`), `hostNetMsP95 ≤ 2 ms`
  per frame, host keydown-to-move ≤ 2 ticks (§22 bar) — i.e. hosting never
  breaks the host's own game.
- **G5b.10 Guest local loop** (each guest page, GPU harness, N1 and N2):
  rendered fps ≥ 60; keydown-to-visible-move ≤ 1 frame (prediction);
  dodge i-frame window visible on the predicted body; the §22 responsiveness
  bar (camera, telegraph readability, HUD response) holds as in SP.
- **G5b.11 Stale input + hidden tabs**: with a guest's input stream cut for 1
  s, the host repeats held state for ≤ 8 ticks then neutral
  (`staleRepeatTicksMax ≤ 8`, the seat stops within 150 ms); hiding a guest
  tab hands its seat to the AI within 1 snapshot (`seat_control` away) and
  back on return; hiding the HOST tab for 20 s keeps the session ticking at 60
  ± 2 ticks/s for the guests (Worker metronome), 0 desyncs.
- **G5b.12 Own-action feedback**: at N1 and N2, a guest's own basic/cast/
  interact shows its swing/cast VFX, sound and cosmetic projectile ≤ 1
  rendered frame after the keydown (`ownActionFeedbackMs.p95 ≤ 17`), the
  cooldown tile starts on the same frame; a denied prediction (e.g. forced
  host-side stun via `setStatus`) is retracted within one snapshot interval
  (`mispredictRetractMs.p95 ≤ 1 snapshot + 1 frame`); no doubled sound/VFX on
  confirmation.
- **G5b.13 No server / unreachable / LAN**: before M5b's `mp-menu` is
  registered the title has no Multiplayer item; with no server running,
  Host, Join and Quick Match each reach the `unreachable` panel within 5 s
  (no endless spinner) with the `npm run net` copy, Retry succeeds within 5 s
  of the server starting, Change server validates ws:// / wss://, Back returns
  to the title; `--host 0.0.0.0` prints LAN URLs and the lobby shows them;
  under https only wss:// is accepted with the mixed-content copy; 0 page
  errors throughout.
- **G5b.14 Replica bus**: over a 3-minute session every host event is
  replayed exactly once per guest (by `tick, type, ordinal-in-tick`),
  `__echoes.busCounters.simCalls` does not change on a guest after the
  session starts, `refusedEmits === 0`, and guest counts of `glint_gain`,
  `reward_offer`, `run_end` equal the host's; ordering per tick follows the
  §3.7 two-pass rule (death/despawn before the apply, spawn after).

### INT — integration
- **GI.1** Full journey by real input with no dead end: title → Settings (one
  display + one audio change) → New Game → camp → portal → rooms → pause → save
  → quit to title → Load → same room, same build → finish or die → high score →
  Multiplayer host + 1 headless guest → leave → title.
- **GI.2** Pause menu: Resume / Settings / Save / Load / Save & Quit / Quit
  (confirm) all work; in MP it never pauses the session. Esc opens it from
  **each page type** — combat, draft, path, shop, victory card, defeat card —
  and from the socket screen after one Esc closes the socket; the page
  underneath keeps its focus and state on Resume; the draft candidate is
  still offered after a pause (never declined by Esc).
- **GI.3** Audio cues for all new content (G3.7 extended to W2 events).
- **GI.4** `npx vite build --outDir dist-int` + `vite preview` boots and plays
  the core loop with 0 page errors.
- **GI.5** No dev chrome in the player build (fps meter behind the setting /
  `?fps=1` / `?debug=1`; version label kept, small).
- **GI.6** Regression: 8-room loop by real input with drafts taken;
  keydown-to-move ≤ 2 ticks; dodge i-frames; telegraphs ≥ 0.7 s; camp, combat
  and boss frames each ≥ 16/20 on docs/REFERENCE_BAR.md with no zero; no
  frame > 100 ms after warm-up on the GPU harness (§6.7); 0 page errors.

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

### 9.1 What ARCH committed at v0.5.0 + v0.5.1 (the contract stubs)

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
- **v0.5.1 additions (plan-review revision, all behaviour-neutral — 9/9 Node
  goldens and the in-page trace identical to v0.5.0):** src/core/events.js
  replica bus (`bus.sim()` view tagging SIM listeners, `bus.replay()`,
  `bus.setReplica()`, `bus.counters`) + world.js swapping its `events` for the
  sim view; `clock.onTickEnd(fn)` tick-boundary hook; the app gesture hook +
  `app.update → service('audio').update` + `app.onGesture` (src/app/app.js);
  `display.fullscreen` session-only; `?layout=` + `?netrate=` params;
  src/data/content.js (content service + `registerContentProbe`) provided in
  main.js; main.js `simStep` seam; begin/end anchors in every shared file of
  §2.2; `__echoes.content` + `__echoes.busCounters`; tools/gnt-arch-browser.mjs
  (named harness profiles + `rafhz`).

### 9.2 Dependencies between waves

W1 M1 ∥ M3 share only the settings store, tab registry, widgets, app events
and the committed gesture hook / `app.update` audio call (M3 never touches
main.js's LOOP or window gesture listeners). W2 needs W1's audio
`registerEventCue` (for new cues) and settings rows. M4a ∥ M4b share
levels.js/difficulty.js (committed; M4a owns), status.js (committed
signatures; M4a owns the write side), combat.js (M4a; `break` lifecycle and
the §3.6(c) guard contract), run.js `setRoomHooks` (M4a implements, M4b
calls), movement.js `sweptContact` / `setDynamicColliders` (M4b implements,
M4a calls), the content service (committed; M4a owns, M4b registers probes),
and their own anchored regions in world.js / main.js / constants.js. Each
side codes against the §3.6 contract and stubs the other side's function
defensively (`runSys.setRoomHooks?.(…)`, `movement.sweptContact ??
fallback`) until it lands, so either can commit first. W3 M2 needs every W2
system's serialize/restore (W2 obligation) and records the W2-end goldens
first. M5a ∥ M2 share nothing but src/core/hash.js + canonical.js
(committed): M5a builds the tree diff and delta codec against generic trees
and `world.snapshotState()` corpora; M5b (W4) plugs in
`save.capture()/apply()` and reuses M4a's src/sim/autopilot.js as the seat-0
leader bot. INT (W5) needs everything.

### 9.3 Risks and mitigations

| Risk | Mitigation |
|---|---|
| Title on the plain URL breaks old action files | `?menu=0` / legacy params keep the v0.4.63 boot; documented in TESTING.md; the smoke only needs exit 0 |
| Expedition picker blocks the core-loop check | §4.1 portal rule: menu-skip boots and single-unlock profiles never open it; E/Enter confirm the preselection |
| Capture-phase key handling conflicts (run UI also uses capture) | the gesture hook then the app gate are registered first (APP-BOOT) and only intercept while a blocking app screen is open; Esc rules §1.5 |
| The input gate swallows the audio-unlock gesture | the committed gesture hook calls `audio.unlock` synchronously before the gate; context created lazily in that gesture (§1.5, §3.5, G1.13/G3.8) |
| Save misses private state (closures, module lets) | canonicalJSON throws on functions/non-plain data; tick-end capture point (§3.4 rule 6); round-trip probe with 600-tick continuation at 8 moments across all three acts |
| M2's core edits drift the sim silently | W2-end goldens recorded by M2 first, re-checked by M5b (G2.10, G5b.8) |
| Content changes RNG draw order vs v0.4.63 | expected for runs; the `?room=` harness keeps legacy rules; goldens reference the W2-end build |
| Guest replays re-run sim listeners | replica bus: `bus.replay` skips SIM-tagged listeners; replica world never stepped; `world.cmd` refused (G5b.14) |
| Tree diff cannot carry nulls | null-safe tagged diff instead of RFC 7386 (§3.7, G5a.3) |
| Biome rebuilds hitch | swaps happen under the transition fade; boot warm-up covers the new materials (render/warmup.js pattern) |
| TCP hides packet loss | unreliable-class conditioner on the server + client; the UI never claims UDP |
| Host drop in a listen server | keyframes every 2 s to the server + migration with a leader bot for seat 0 |
| Hidden tabs stall the session | host Worker metronome; guest away → AI seat; stale input ≤ 8 ticks (§3.7, G5b.11) |
| Background pages make harnesses flaky | multi-page launch profile is mandatory (§6.7) |
| Fullscreen / autoplay / window.close are browser-gated | honest labels and fallbacks (§3.5, §5); fullscreen session-only; Keep/Revert only where a timeout can undo |
| Two builders bump version.js at once | re-read before editing, take max+1 on conflict |

Out of scope this iteration (stated in the UI where relevant): key rebinding,
gameplay on gamepad (menus only), cloud saves, dedicated-server hosting beyond
LAN/localhost, new bosses per act (the Hollow Stag scales per act), WebRTC.

---

## 10. Revision log — v0.5.1 (plan review, 19 must-fix gaps)

| # | Gap | Fix (section · committed stub) |
|---|---|---|
| 1 | Guests replayed host events on the live sim bus (re-running world/nodes/boss listeners) | §3.7 "Replica bus": `bus.sim()` tags every sim listener, `bus.replay()` delivers to presentation listeners only, `bus.setReplica()` refuses sim emits, replica world never stepped + `world.cmd` refused, no guest `registry.spawn`, `sound` dropped from EVENTS, two-pass per-tick ordering; G5b.14 · src/core/events.js, world.js `events.sim()` swap, `__echoes.busCounters` |
| 2 | COLD deltas used RFC 7386 (no nulls, arrays wholesale) | §3.7 null-safe tagged tree diff (`s/d/o/a/k` ops, law, corpus); G5a.3 |
| 3 | M1's gate swallowed M3's unlock gesture; M3 in M1's LOOP; context at boot | §1.5 gesture hook, §3.5 lazy context + `engine.update` via `app.update`; G1.13, G3.8 · src/app/app.js gesture hook + audio update |
| 4 | Anchors claimed but absent; shapes.js double-edited in W2 | §2.2 rewritten against committed begin/end anchors; shapes.js M4a-only via `movement.sweptContact`; per-key CONSTANTS / WORLD-LAYERS / RENDER-TICK blocks · anchors in main.js, world.js, constants.js, input.js, stage.js, allies.js, camp.js, graybox.js, endscreens.js, run/index.js, socket/index.js, commandbar.js, clock.js |
| 5 | W2 cross-builder contracts unmeetable | §3.6 contracts (a) layout roll + `setRoomHooks` + `layout_enter` + sim-owned colliders + restore path, (b) speedMul owners + anchors, (c) guard in `combat.applyDamage` + `hit_blocked`, (d) faction rule for threat pointers/filters, (e) content service + probes, (f) `startRun({ act, challenge })`, (g) projectile blockers · src/data/content.js, PLAYER-SPEED / ALLY-SPEED / BEGIN-RUN anchors |
| 6 | Expedition picker broke the core-loop check | §4.1 portal rule (menu-skip + single-unlock → no picker; E/Enter confirm); ref action file ownership; G4a.11 |
| 7 | Live RNG out of M2's reach; ambiguous capture point | §2.1/§2.2 M2 owns `RNG-WRAPPER`; §3.4 rule 6 tick-end capture for save AND net · `clock.onTickEnd`, main.js RNG-WRAPPER anchor |
| 8 | Save gates missed W2 state and core regressions | G2.1 8 moments across all acts; G2.10 W2-end goldens; G2.11 ascending registry rebuild (§3.4 rule 3); G2.12 capture point |
| 9 | No net gate protected the local loop; one lag condition | §3.7 local-loop budget; N1–N4 conditions; G5b.2/3/5 pass+degrade thresholds, G5b.9 host, G5b.10 guests |
| 10 | No stale-input or hidden-tab policy | §3.7 ≤ 8-tick hold then neutral, guest away → AI, host Worker metronome; G5b.11 |
| 11 | Own actions not predicted | §3.7 own-action prediction (action shadow, predicted view events, handoff, retract); G5b.12 |
| 12 | G1.6 passed a V-Sync that changes nothing | §5 measurement environment (display harness, rafHz 161 Hz measured here), `workMs`; G1.6 (a)/(b) |
| 13 | Fullscreen persistence / Keep-Revert impossible | `display.fullscreen` session-only (committed), Keep/Revert only for render scale + entering fullscreen; G1.8, G1.9 |
| 14 | G3.3 clipping true by construction | measured at the clipper input (`prelimit` tap) + limiter excursions; G3.3 |
| 15 | Acts II/III lacked completion/playability gates | §4.2 felt-escalation band; G4a.9, G4a.10, G4b.7; act runner §6.7 |
| 16 | Pause unreachable on run pages; Esc declined drafts | §1.2/§1.5 Esc = pause everywhere, draft decline = X; BUILD_BRIEF A13; G4a.12, GI.2 |
| 17 | G1.12 palette gate failed on the camp backdrop | measured inside plate DOM rects + backdrop allowance; G1.12 |
| 18 | Multiplayer with no server unspecified | §3.7 no-server / unreachable / LAN / https states + title visibility rule; G5b.13 |
| 19 | Harness support missing | §6.7 named profiles (GPU / display / multi-page / audio) · tools/gnt-arch-browser.mjs; fixed netbench CLI + schema; act runner; §6.4 deterministic content commands; §6.1 `?variant` vs `?layout` · params.js `layout` |

## 11. Revision log — M4c (user correction, 2026-09-22)

| # | What changed | Where |
|---|---|---|
| 1 | At most 4 skills (keys 1–4, 4 tiles, free = 4 − owned); 8 node sockets on every skill; no rarity caps; legendary passive reinterpretations | §0 note, §2.1 M4c row, §2.2 constants/input rows, §4.3, BUILD_BRIEF §15.2 / §23.9 |
| 2 | Node supply for 32 sockets: 2 clear spoils per combat room, 4-card shelf at 15/20/25, one auto-fill policy | §4.3, §4.4, BUILD_BRIEF §14 note / §16 |
| 3 | Difficulty retuned for the corrected build: slope 0.16, Act III tier 1.75, Stag damage slope 0.7 | §4.2 pointer, BUILD_BRIEF §23.2 M4c note |
| 4 | Save schema 2 + deterministic migration of schema-1 saves | §3.4 |
| 5 | Goldens re-recorded at the M4c-end build (G2.10 / G5b.8 reference) | §6.5 |
| 6 | New gates G4c.1–G4c.11; G4a.1 superseded, G4a.3 caps clause removed | §7 |

---

## 12. Linear campaign (CAMPAIGN, 2026-09-25 — the user's CRITICAL REFACTOR)

**User (verbatim):** "Adjust the game progression flow from an open
level-selection model to a linear campaign progression model. … 1. CAMPAIGN
START: Clicking the main "Begin Run" button must automatically launch Level 1.
2. AUTOMATIC TRANSITION: Upon clearing a level, the game must NOT return to the
lobby. Instead, trigger a brief victory transition screen, automatically load
the assets for the NEXT sequential level (e.g., Level 1 -> Level 2 -> Level 3),
and immediately start it. 3. CAMPAIGN END: Returning to the lobby should only
happen automatically AFTER the final level of the game is cleared, or if the
player explicitly pauses and selects "Quit to Lobby." 4. LEVEL LOCKING: Update
the Lobby UI so that players can only select or play levels they have already
unlocked sequentially." Binding from 2026-09-25; it supersedes BUILD_BRIEF
ruling A14, the §23.1 expedition picker, §4.1's portal rule 3 and the picker
halves of gates G4a.4 / G4a.11. Owner: **CAMPAIGN** (runs alone; every file is
open to it where the root cause lives — §2.1).

### 12.1 Terms and the sequence

A **LEVEL** is one expedition — Level 1 The Hollow Wood, Level 2 The Sunken
Mill, Level 3 The Ashen Barrow — each still a full 8-room level (rooms 1–6
combat, 7 shop, 8 Hollow Stag). The **LOBBY** is the camp hub. A **CAMPAIGN**
is one continuous run from a starting level through the final level. The level
order is data (`src/data/campaign.js` `CAMPAIGN_LEVELS`, derived from
`data/levels.js` `ACT_IDS`), so a Level 4 is appended by adding a `LEVELS` row.

```
camp ─Begin Run (E at the portal)─► Level 1 ─clear─► [level-clear card ~3 s] ─► Level 2 ─clear─► [card] ─► Level 3
  ▲                                                                                                        │ clear
  │                                                              CAMPAIGN VICTORY card (10 s of sim time, Enter = now)
  ├──────────────────────────── automatic return ◄────────────────────────────────────────────────────────┘
  ├── Quit to Lobby (pause, confirmed) from any level, page or card — abandons the campaign, no end card
  └── Defeat (party wipe) in any level — the defeat card (unchanged), Enter returns to camp
camp ─Level Select (map table beside the portal, or L at the portal prompt)─► unlocked Level N ─► [setting-out card ~2 s] ─► Level N ─► … ─► final
```

### 12.2 Sim state machine (src/sim/run.js — the level director)

The campaign lives in the SIM (deterministic, saved, replicated): run state
gains `campaign = null | { mode: 'campaign'|'single', harness, startLevel,
level, index, levels[], startTick, levelStartTick, clearedAt, card, grant,
autoReturnTick }`. Phases (`runSys.view().phase`): `idle · combat · reward ·
path · shop · fade ·` **`transit`** `· victory · defeat`. `transit` is the
level-transition card: `campaign().card = { kind: 'clear'|'depart', from, to,
startTick, untilTick, minSkipTick, hardUntilTick, summary }`.

| API (run system — `world.cmd` name) | Effect |
|---|---|
| `startCampaign({ level = 1, challenge, depart = false, harness = false })` (`startCampaign`) | wipe → roll the run frame for `level` → `run_start` (act = level) → starter grant (§12.4) when level > 1 → `depart` ? phase `transit` (kind `depart`) : `enterRoom(1)` |
| `campaignAdvance()` (`campaignAdvance`) | in `transit` once `tick ≥ minSkipTick`: build the next level (below) → `level_start` → `enterRoom(1)`; otherwise `null` |
| `abandonRun(reason = 'quit')` (`abandonRun`) | an active run → `run_end { result: 'abandoned' }` → wipe → phase `idle` → `return_to_camp { reason }` (no end card) |
| `campaign()` / `campaignRules()` | read-only views (the `view()` shape is UNCHANGED — the Node goldens stay bit-identical) |
| `startRun({ act, challenge })` (`startRun`, `?run=1`, `skipToRoom` with no run) | UNCHANGED single-level harness run (`mode: 'single'`): the Stag clear → `run_end victory` → camp — the act runner, simtrace, M2 / M5 probes |

**Level-clear trigger (exactly once).** The boss room's `room_cleared` (the Stag
AND every add dead, no enemy shot in flight, a party member standing —
sim/boss.js) reaches `onRoomCleared`, which acts only while `phase ===
'combat'` and changes the phase in the same call; a per-level latch
(`campaign.clearedAt === index`) makes any second call a no-op. Defeat outranks
the clear on the same tick (the ally block's defeat rule runs before the boss
predicate, §4 order; `endRun('defeat')` deactivates the run, so the clear
predicate never evaluates). On the clear tick, in order:
1. `level_clear { level, name, next, final, index, campaign, ticks, rooms }`
   (every level clear, campaign or single — the unlock / records trigger);
2. the final level or a single run → `endRun('victory')` (a campaign
   victory's summary carries the campaign and `autoReturnTick = tick + 600`);
3. otherwise the RESET half of §12.3 runs in the sim (director stopped, boss +
   adds + every hostile despawned, party/ally transients swept, room hooks
   exit → hazards + interactables despawned, mark / rally cleared), then
   RESTORE, then phase `transit` (kind `clear`, `untilTick = tick + 180`,
   `minSkipTick = tick + 30`, `hardUntilTick = tick + 600`) and
   `level_transit { kind, from, to, untilTick, hardUntilTick }`.

The card never advances by itself before `hardUntilTick`: the HOST
presentation calls `campaignAdvance()` once `tick ≥ untilTick` and the next
level is ready (§12.5) — or on Enter once `tick ≥ minSkipTick` and ready; the
autopilot calls it at `untilTick`; at `hardUntilTick` the sim advances on its
own (hidden host tab, no UI, stuck preload), so it can never hang. A pause
freezes the card (0 ticks elapse). **Next level build**: act := next level; a
fresh run frame is rolled from the CARRIED run RNG stream (no reseed); the
per-level counters reset (room index, stipend counter, rooms done, reward
promises, spoils, shop, layout memory); `level_start { level, name, index,
from, campaign }`; `enterRoom(1)` (room 1's reward is a Skill draft as ever —
with 4 skills owned the §16 substitution offers a node).

### 12.3 Carry / restore / reset rules (one table — `src/data/campaign.js` `CARRY_RULES`)

| Rule (named constant) | Default | At every level transition inside one campaign |
|---|---|---|
| `carrySkills` | true | equipped skills (≤ 4) keep their slots (false → the starting kit) |
| `carrySockets` | true | every socketed node stays in its socket (false → unsocketed onto the bench when `carryBench`, else dropped) |
| `carryBench` | true | bench nodes stay (false → bench emptied) |
| `carryGlint` | true | the wallet carries (false → 0) |
| `carryHealOverride` | true | the F1–F4 heal-target override is not touched by the transition (§8 "room clear = clear" already cleared it at the Stag's own room clear) |
| `carrySeedStream` | true | the run RNG stream continues (false → reseeded from one draw) |
| `carryRecords` | true | campaign counters (levels, rooms, kills, time, Glint earned) accumulate |
| `restoreHp` | true | every party member to max HP |
| `reviveDowned` | true | downed members stand up |
| `clearStatuses` | true | every status on the party cleared |
| `resetCooldowns` | true | skill cooldowns ready; dodge and basic ready |
| `resetEntities` | true | enemies, adds, projectiles, skill bolts, zones, ally zones, hazards, interactables despawned |
| `resetDirector` | true | wave director stopped, boss state reset, room layout exited |
| `resetShop` | true | the level's shop stock dropped (the next level's shop rolls its own) |
| `resetPresentation` | true | decals, scorches, particles, damage numerals, telegraphs, threat markers, per-level VFX, live gameplay audio voices, the level's dressing (§12.5) |

Carry / restore flags are behaviour switches (tests flip them in Node);
the `reset*` flags complete the table and must stay `true` in a shipping build
(flipping one leaks by definition).

### 12.4 Level-N starts and the starter grant

Choosing unlocked Level N > 1 in the Level Select starts a campaign AT level N
(then N → N+1 → … → final) with the fresh default build plus
`STARTER_GRANT[N]` (src/data/campaign.js), applied at the start before any
combat and shown on the setting-out card: `skills` extra skill draws (the draft
system's live skill pool, run RNG, up to 4 owned), `nodes` node draws (the
clear-spoils rule: commons + rares of the usable pool, provenance `grant`),
`glint`, then the shared auto-fill policy (§4.3) sockets them — the player can
re-socket between rooms. Every start at level N > 1 — campaign or single-level
harness — gets the grant, so the act runner measures exactly "a Level-N start".
Numbers: §12.10.

### 12.5 Level manager (presentation — `src/campaign/manager.js` + the arena's dressing lifecycle)

- **Residency** — at any moment exactly ONE level's dressings are resident:
  the level being played or entered; Level 1's in the lobby (Begin Run). The
  background builder only builds the resident level's layouts (it used to
  build all nine and keep them).
- **Teardown** (on `level_transit`, `run_end`, `return_to_camp`, a restore
  into another level): every dressing of a non-resident level leaves the scene
  and is disposed — geometries, materials and textures that no other object in
  `stage.scene` references (a scene-wide reference sweep, so a shared cache is
  never freed under a live mesh), its paint canvases released, its build job /
  upload / compile / parked draw cancelled. Pooled VFX are returned (decals +
  scorches, particles, damage numerals flushed), the audio engine stops every
  live gameplay voice (`engine.stopLevelVoices()`, music and UI kept) and the
  level-clear stinger plays. Presentation listeners are registered once at
  boot, never per level; the probe shows the bus listener count unchanged
  across levels.
- **Preload** — under the card the builder runs at 12 ms/frame (8 in camp, 0
  in live combat) on the next level's layouts (paint in the worker, sliced
  main-thread steps, one texture upload per frame, `compileAsync` + a 3-frame
  parked draw) and the audio engine pre-bakes the next theme. `ready(level)` =
  every layout of that level built + uploaded + linked.
- **Hard timeouts** — the host advances at `untilTick` only when ready, else
  keeps the card ("Preparing The Sunken Mill… 2/3") until ready OR 6 s wall
  since the card appeared; the sim advances at 600 ticks regardless. A layout
  still missing at the advance is built synchronously under the card (a hitch,
  never a black frame, never a hang).
- **No black frames** — the card is a storybook plate over a warm veil (the
  Victory wash family; never a Void Charcoal full-screen); the new room is
  revealed by the veil's 220 ms fade-out. A *near-black frame* = mean display
  luma < 24 / 255 over the whole frame; the target is 0 in every transition.
- **Memory probe** — `__echoes.campaign.memory()` = `{ gl: { geometries,
  textures, programs }, heapMB, entities, busListeners, pools: { decals,
  scorches, particles, numerals }, dom, audio: { voices }, dressings }`.

### 12.6 Cards and exits

- **Level-clear card** (`src/ui/run/transit.js`, the run-UI page for phase
  `transit`): "THE HOLLOW WOOD — CLEARED", "Next · Level 2 · The Sunken
  Mill", the carried build (skills, sockets filled x / 32, bench, Glint,
  "party restored"), a progress bar, "Enter — set out now" (0.5 s settle,
  fresh-press rule), a readiness line. Network guests see "The Healer leads on…".
- **Setting-out card** (kind `depart`, a Level-N start): "Setting out · Level N
  · <name>", the starter grant, ~2 s.
- **Campaign victory** — the end card reads "CAMPAIGN COMPLETE" (levels 3 / 3,
  rooms, time, score); "Returning to camp in N s" counts down in sim time
  (pause-aware, net-synced); Enter returns now. Defeat keeps its card (Enter).
- **Quit to Lobby** — pause menu, single-player and network host, confirmed
  ("Abandon this campaign and return to camp? Unlocks and records are kept.")
  → `abandonRun` → camp with no end card; the level is torn down; records
  count an abandoned run.

### 12.7 Lobby level select and sequential locking

- **Unlock rule** — clearing Level N (its `level_clear`) permanently unlocks
  Level N+1 in the profile (`echoes.profile.v1` `unlocks.acts`, atomic write),
  campaign or single run, mid-campaign included (a Quit to Lobby after
  clearing Level 1 keeps Level 2 unlocked).
- **Level Select** — the `levels` app screen (`src/ui/run/levels.js`; replaces
  the `expedition` picker), opened by the **map table** beside the portal (E
  within its ring, prompt "E · Choose a level") or by **L** / a click on the
  "Levels" chip of the portal prompt. One card per level: unlocked cards
  focusable and startable (E / Enter / Space / click / pad A → a campaign AT
  that level); locked cards visible, `aria-disabled`, skipped by keyboard and
  pad navigation, and a click only shakes the card with "Clear <previous
  level> to unlock". Begin Run itself always starts Level 1.
- **Every other path refuses a locked level** — `__echoes.campaign.choose(n)`
  and `cmd('campChoose', n)` (player-facing mirrors) → `{ ok: false, reason:
  'locked' }`; a save whose run sits in a locked level is refused on load with
  that reason unless the run was started by a harness path (`campaign.harness`);
  a network guest can start or choose nothing (the host rejects every guest
  run mutator). Developer probes (`?level=N`, `cmd('startCampaign')`,
  `cmd('startRun')`) bypass locks and mark the run `harness: true`.

### 12.8 Save, autosave, records

- **Schema 3** (StateTree `v: 3`): `systems.run.campaign`; `meta` gains
  `level`, `levelName`, `campaign: { mode, startLevel, level, index }`.
  `MIGRATIONS[2]` (pure): an active schema-2 act run at act N becomes a
  campaign from level N (index 1, no grant — the build is already there);
  camp saves get `campaign: null`.
- **The card is state**: phase `transit` + its ticks are captured; a load
  mid-card shows the card with the remaining time and preloads the next level.
- **Autosave** safe point `level_transit` (unthrottled, like `run_end`).
  `canSave()` allows the card.
- **Records** (profile `v: 1` + new keys): `campaigns`, `campaignsCompleted`,
  `abandoned`, `furthestLevel`, `fastestCampaignSec`, `levelClears {1,2,3}`;
  high-score entries gain `levels`, `startLevel`, `campaign`. **Score**
  (generalises §3.4; identical for one level): `round(Σ_levels (100·rooms_L +
  5·kills_L + 1000·cleared_L)·actMul_L · challengeMul) + (complete ? max(0,
  900·levelsPlayed − timeSec) : 0)`.

### 12.9 Multiplayer

The host drives the campaign; guests replicate `systems.run` (phase, card,
campaign) and replay `level_clear` / `level_transit` / `level_start`, so every
card and level swap follows the host (the replica's `restoreScene` swaps the
dressing; the guest's level manager tears down and preloads on the same
events). Guests report `ready` for the next level over CMD; the host waits for
every connected guest's ready (or the same 6 s cap) before advancing. The host
pause menu gains "Quit to Lobby" (everyone returns to camp, the session stays
up); guests keep "Leave Session". `startCampaign`, `campaignAdvance` and
`abandonRun` are run mutators: a guest's call becomes a CMD the host rejects.

### 12.10 Difficulty with a carried build

A carried build meets Levels 2 and 3 far stronger than the fresh build M4c
tuned them for. The level tiers and the starter grant are retuned (constants
only — the §4.2 formula keeps its shape) so that BOTH (a) a carried
default-autopilot campaign from Level 1 and (b) a Level-N start with the
starter grant land every level inside the §4.2 band over seeds 1–5
(`tools/gntCAMPAIGN-camprun.mjs`). Binding numbers: the dated CAMPAIGN note in
BUILD_BRIEF §23.2.

### 12.11 Harness

- `?level=N` — menu-skip boot, then a campaign AT level N starts on the first
  ticked frame (bypasses locks, `campaign.harness = true`). `?menu=0&act=N`
  also makes the portal start a campaign at N (legacy rule 1); otherwise Begin
  Run is Level 1.
- `cmd('startCampaign', { level, challenge, depart })`, `cmd('campaignAdvance')`,
  `cmd('abandonRun')`, `cmd('campaignState')`, `cmd('campLevels')` (opens the
  select), `cmd('campChoose', n)` (player-facing, lock-checked).
- `__echoes.campaign`: `state()` (active, mode, level, startLevel, index,
  unlocked, transitionState `none|card|waiting|advancing`, card, ready),
  `unlocked()`, `choose(n)`, `rules()`, `memory()`, `snapshot(label)`,
  `snapshots()`, `transitions()` (per transition: clear tick, card wall ms,
  ready ms, advance tick, first-controllable wall ms, longest frame gap),
  `ready(level)`, `unlock(list | null)` (probe override, like `content.unlock`).
- Tools: `tools/gntCAMPAIGN-camprun.mjs` (campaign runner, Node or page, the
  per-level band), `tools/gntCAMPAIGN-probe.mjs` (memory, transition frames,
  locking, carry diff — GPU harness).

### CAMPAIGN gates (GC.*)

- **GC.1 Begin Run = Level 1**: E at the portal (title-booted session, any
  unlock state) starts a campaign at Level 1 with no picker; the Level Select
  is never pushed by the portal.
- **GC.2 Automatic transition**: clearing Levels 1 and 2 shows the level-clear
  card and starts the next level with no camp frame in between
  (`vfx.mode === 'run'` on every sampled frame from the clear to the next
  level's first controllable frame); the level index advances exactly once per
  clear (`campaign().index` 1 → 2 → 3; `level_clear` and `level_start` exactly
  once each per level).
- **GC.3 Exactly-once edge cases**: Stag + last add dying on one tick → one
  `level_clear`; the party wiping on the clear tick → defeat, no `level_clear`;
  Esc (pause) / Enter / Quit to Lobby / a save request / a hidden tab during
  the card → never a second transition, never a skipped level, never a hang.
- **GC.4 Campaign end**: the final clear → CAMPAIGN COMPLETE card → camp
  automatically within 600 ticks (Enter earlier); defeat → defeat card → camp;
  Quit to Lobby from combat, a run page and the card → camp with no end card.
- **GC.5 Carry / restore / reset**: a state diff at every transition matches
  §12.3 (skills + sockets + bench + wallet identical; every party member at
  max HP, standing, no statuses, cooldowns ready; 0 enemies, projectiles,
  zones, hazards, interactables, telegraphs, decals, particles, numerals).
- **GC.6 Memory flat**: at the first controllable frame of L1, L2, L3 in three
  back-to-back campaigns (and in camp after each): the same level has the
  same `gl.geometries` / `gl.textures` / `gl.programs` ± 2, `entities`,
  `busListeners`, pool sizes and `dressings` in every campaign; the JS heap
  after a forced GC within ± 8 MB of campaign 1; no object of level N resident
  in level N+1 (`dressings` holds only the current level's layouts); live
  audio voices ≤ the steady-state combat count.
- **GC.7 No black screen, no loading loop**: over every transition, 0
  near-black frames (§12.5), no frame gap > 250 ms after the teardown frame,
  the card never shown longer than `untilTick` + 6 s wall; from the killing
  blow to the first controllable frame of the next level ≤ 4.0 s (auto) and
  ≤ 1.5 s with an Enter skip at 0.5 s, on the dev server AND the production
  build.
- **GC.8 Locking**: a fresh profile lists Level 1 unlocked, 2–3 locked; locked
  cards cannot be started by keyboard, mouse, mocked gamepad,
  `campaign.choose`, `cmd('campChoose')`, a save file or a guest request;
  clearing Level N unlocks N+1 and it persists across a reload; a Level-N
  start plays N → final.
- **GC.9 Save**: save mid-level and on the card, reload, Continue → the same
  level, room / card and carried build; a schema-2 act-run save migrates to a
  campaign; autosave at every `level_transit`.
- **GC.10 Records**: campaign completion, furthest level, abandoned count and
  level clears recorded and shown on Records.
- **GC.11 Multiplayer**: a 2-client session follows L1 → card → L2 in sync
  (guest phase / level / layout equal to the host's within one snapshot of
  the advance, 0 desyncs); a host Quit to Lobby returns both to camp.
- **GC.12 Difficulty**: §12.10 band holds for the carried campaign and for
  Level-2 / Level-3 starts (seeds 1–5).
- **GC.13 Legacy flows**: the smoke, the §6.2 core loop, `?room=`, `?run=1`,
  `cmd('startRun')`, the act runner and the 9 Node goldens unchanged.

## 13. Revision log — CAMPAIGN (user CRITICAL REFACTOR, 2026-09-25)

| # | What changed | Where |
|---|---|---|
| 1 | Linear campaign: Begin Run = Level 1, automatic level-clear transition card, next level auto-loaded and started, lobby only after the final level / Quit to Lobby / defeat | §0 item 6, §1.2 sub-states, §12.1–12.2, §12.6 |
| 2 | One carry / restore / reset table (named constants) | §12.3, src/data/campaign.js |
| 3 | Level manager: one resident level, teardown with a scene-wide reference sweep, preload under the card, hard timeouts, near-black definition, memory probe | §12.5 |
| 4 | Lobby Level Select replaces the portal picker; sequential unlocks enforced on every path | §1.3 `levels`, §4.1 superseded note, §12.7 |
| 5 | Save schema 3 + migration, autosave at `level_transit`, campaign records and score | §12.8 |
| 6 | Multiplayer: host drives, guests follow + ready report, host Quit to Lobby | §12.9 |
| 7 | Difficulty retuned for carried builds + starter grant | §12.10, BUILD_BRIEF §23.2 |
| 8 | Harness: `?level=N`, campaign cmds, `__echoes.campaign`, ports; gates GC.1–GC.13; G4a.4 / G4a.11 picker halves superseded | §6.1, §6.3, §6.4, §7, §12.11 |
