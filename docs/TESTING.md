# Testing & Verification Contract

Binding for every builder and critic agent on this project.

## The one rule

**Nobody judges code by reading it.** Visual and gameplay claims are verified
against real rendered pixels and real console output, captured with the harness:

```bash
node tools/capture.mjs shot my-check --settle 3000
node tools/capture.mjs seq combat 8 250 --actions tools/actions/fight.json
```

- Output lands in `captures/` (gitignored): PNG frames + `<name>.console.txt`.
- Exit code 1 = an uncaught page error occurred. A builder may NOT return while
  the smoke capture exits 1.
- The dev server must be running on 127.0.0.1:5199 (`npm run dev`); do not spawn
  extra vite instances — reuse the port and leave the server up for others.
- Read the PNGs with the Read tool to actually look at them.

## Builder exit criteria (every block, every fix round)

1. `node tools/capture.mjs shot smoke` exits 0 (zero console/page errors).
2. The block's own acceptance criteria are self-checked against captured frames
   (or debug-API output) — not assumed from code.
3. `git add -A && git commit` with a conventional message; bump the version
   string in `src/version.js` (patch per block, displayed in the bottom-left
   corner of the screen like the Magicraft reference).

## Debug API (window.__echoes)

Implemented in the sim core block and extended as systems land. Minimum surface:

| Member | Meaning |
|---|---|
| `version` | current version string (same as bottom-left label) |
| `tick` | current sim tick (advances at 60 Hz) |
| `fps` | smoothed render fps |
| `entityCount` | live sim entities |
| `seed` | active run seed (`?seed=123` URL param forces it) |
| `events` | ring buffer (last 200) of sim events `{tick, type, ...}` — spawns, hits, deaths, drafts, denials |
| `state()` | JSON snapshot: room index, party HP/positions, enemies, wallet |
| `cmd(name, ...args)` | test commands: `spawn(type,x,z)`, `teleport(x,z)`, `setHp(id,pct)`, `giveSkill(id)`, `grantNode(id)`, `socket(skillId,nodeId)`, `skipToRoom(n)`, `killAllEnemies()`, `win()`, `lose()` |

Critics drive scenarios through `cmd` + real synthetic input (capture actions),
then judge frames. Determinism checks: load twice with the same `?seed=`, diff
`events`.

## Where things live

- Rubric: `docs/REFERENCE_BAR.md` (+ `docs/reference/pass-the-fear.png`)
- Design truth: `docs/BUILD_BRIEF.md`
- Progress log: `PROGRESS.md` (update after every round)

## Frame analyzer (mandatory for visual blocks)

`node tools/analyze.mjs [--box x,y,w,h] [--ref] <png...>` turns "does it look
right" into the same numbers the critics measure:

| Metric | Meaning | Bar |
|---|---|---|
| `LUMA >160 / >200` | value range — is there any light in the frame? | gameplay frames: **>160 ≥ 1.5%**, **>200 ≥ 0.4%**, **≥13/16 buckets** |
| `FLAT` | % of 8x8 blocks that are one flat colour | **< 20%** (REFERENCE_BAR check 1) |
| `HUEMIX` | warm / foliage / cool split | Act-1 needs visible warm pools, cool only in shadow pockets |
| `SAT` | mean saturation of coloured pixels | Act-1 grass 0.55–0.65 |
| `HUES` | pixel counts in reserved bands | violet only on corruption; danger only on enemy threats; heal only on healing |

`--ref` appends `docs/reference/pass-the-fear.png` for side-by-side comparison.
It measures **>160 3.418%, >200 1.427%, 16/16 buckets** — that is the benchmark.
A frame whose whole histogram sits below bucket 8 is murk, no matter how much
content it contains: fix lighting/exposure, not content.

## Gauntlet Loop harness rules (v0.5.0+, revised v0.5.1, binding — details in docs/gauntlet/PLAN.md §6)

**Boot params.** A plain URL (tools/cert-capture.mjs's default) now shows the
TITLE SCREEN once M1 lands, with the sim paused. Regression captures that must
boot straight into camp use **`?menu=0`** — or any legacy harness param
(`?scene=`, `?room=`, `?run=1`, `?seed=`, `?variant=`), which all keep their
v0.4.63 behaviour and skip the title — including the portal: a menu-skip boot
never opens the expedition picker, so E at the portal starts Act I as before
(PLAN §4.1). `?layout=N` (M4b) also skips the title: layout N's dressing PLUS
its hazards/interactables in the `?room=` harness, while `?variant=N` stays
dressing-only (legacy golden traces unchanged). `?menu=1` forces the title
even with legacy params (e.g. a seeded journey: `?seed=5&menu=1`). Other params:
`?freeze=1` (sim frozen at tick 0 until `__echoes.sim.thaw()`), `?fresh=1`
(wipe all `echoes.*` localStorage first — a clean profile), `?act=1..3`,
`?slot=<id>`, `?audio=0`, `?fps=1`, `?net=…`, `?nethost=1`, `?netjoin=CODE`,
`?netquick=1`, `?netname=`, `?netseat=`, `?netcond=lat75,jit10,loss10`,
`?netrate=`. Never use `?room=` for a network room code (it is the legacy wave
room param) — use `?netjoin=`.

**Loopback workaround (2026-09-22 ~22:30, this machine).** Headless Chrome for
Testing 152 stopped reaching loopback ports (`net::ERR_CONNECTION_TIMED_OUT`
to 127.0.0.1 after 21 s, while curl / node fetch reach the same server): its
Windows AppContainer network-service sandbox refuses loopback.
`--disable-features=NetworkServiceSandbox` restores it with no system
change. When a harness shows that error, use the flag: tools/gntM4c-certcapture.mjs
is tools/cert-capture.mjs + that flag (same CLI, same output),
tools/gntM4c-actrun.mjs is the act runner + the flag, and
`launchEchoes({ extraArgs: ['--disable-features=NetworkServiceSandbox'] })`
fixes any harness built on tools/gnt-arch-browser.mjs.

**Smoke + core loop (every builder commit).**
`node tools/cert-capture.mjs shot <pfx>smoke --settle 4000 --timeout 180000`
must exit 0 with zero `[PAGEERROR]`. Core loop:
`node tools/cert-capture.mjs shot <pfx>core --url "http://127.0.0.1:5199/?seed=7&menu=0" --actions tools/actions/gnt-arch-coreloop.json --timeout 180000`
(hold W to the portal → E → room 1 → killAllEnemies → phase `reward`;
re-verified at v0.5.1). A key that must change this recipe writes
`tools/actions/gnt-<KEY>-coreloop.json` and updates this pointer in the same
commit; ARCH files are never edited by builders.

**Esc = pause everywhere (v0.5.1).** Once INT lands, Esc opens the pause menu
from combat and from every run page (draft, path, shop, end cards); an open
socket screen closes on the first Esc. Esc never declines a draft — decline is
**X** or the Decline button. Action files that used Esc to decline must press
X instead.

**Named harnesses (v0.5.1, PLAN §6.7).** Import `tools/gnt-arch-browser.mjs`
(read-only): `launchEchoes({ gpu, headful, background, autoplay })`,
`openEchoes`, `waitReady`, `measureRaf`. *GPU harness* = headless + ANGLE/D3D11
(every fps gate). *Display harness* = the same headful (V-Sync / frame-limit
cadence; run `node tools/gnt-arch-browser.mjs rafhz --headful` first — this
machine measured ~161 Hz rAF headful AND headless at v0.5.1, a ~165 Hz panel).
*Multi-page* = `background: true` (default: `--disable-renderer-backgrounding
--disable-background-timer-throttling --disable-backgrounding-occluded-windows`)
— mandatory for any harness with more than one page or an unfocused page.
*Audio* = `autoplay: true`. The network multi-client harness is
`tools/gnt-M5a-netbench.mjs` (fixed CLI + `echoes-netbench/1` schema, PLAN §6.7)
and the act runner is `tools/gnt-M4a-actrun.mjs` once those keys land.

**Capture point (v0.5.1).** Save captures/applies and net snapshots run only
at `clock.onTickEnd` (after a world step returns) or between frames — never
inside a bus listener. Probes that save from an event must set a flag and
capture at the tick end.

**Deterministic content setups.** Build scenarios with the PLAN §6.4 commands
(`spawn(etype, x, z, { elite })`, `spawnHazard`, `spawnInteractable`,
`hazardPhase`, `armKeg`, `setLayout`, `burrow`, `setStatus`, `clearStatus`,
`startRun({ act, challenge })`, `autopilot`, `echoArm`, `resonance`) as their
owners land them — never by waiting for RNG.

**File prefixes.** Every tool / action / capture an agent creates starts with
its prefix (`gnt<KEY>-`, fix builders `gntfix<KEY><round>-`, critics
`gntc<key><round>-`, refuters `gntr…`, architect `gnt-arch-`). Never edit
tools/cert-capture.mjs, tools/capture.mjs, tools/analyze.mjs, tools/cert-gen.mjs
or another agent's prefixed files.

**Ports.** vite dev 5199 is shared — never start another dev server, never kill
it. Your own net server (`npm run net -- --port P`) and production preview
(`npx vite build --outDir dist-<key>` then
`npx vite preview --outDir dist-<key> --port P --strictPort`) use ONLY the ports
PLAN.md §6.3 assigns your key; kill exactly those PIDs before returning.

**Debug API additions** (`window.__echoes`): `sim` (freeze / thaw / stepN /
trace / hash / script — ARCH), `app` (state, overlay, stack, open, back, press,
focus, responses, frameStats, display — M1), `settings` (get / set / reset /
dump / keys / persist / storageKey / loadReport), `audio` (buses, busGain,
meter, meterReset, testTone, cueLog, music, voices — M3), `save` (list / save /
load / remove / capture / hash / roundTrip / corrupt / simulateQuota /
simulateTornWrite / profile / usage — M2), `net` (state, role, room, seat,
peers, stats, conditioner, connect / host / join / quickMatch / leave /
setReady / start / drop / log — M5a/M5b), `content` (levels, unlockedActs,
difficultyTable, roomPlan, probes + M4b's hazards / interactables / layout —
committed service, M4a/M4b fill it), `busCounters` (emitted / replayed /
simCalls / presentationCalls / refusedEmits / replica — the replica-bus gate).
A namespace is `null` until its module provides the service.

**Determinism.** `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend|run
--ticks 3600 [--seed 7 --script 3] [--root <checkout>] [--record f | --golden f]`
runs the sim headless in Node exactly as main.js builds it. In page:
`?seed=7&scene=arena&room=kill_all&freeze=1` then `__echoes.sim.trace(600, 3)`.
Both exclude `sound` events (audio is not sim state). v0.5.0 references:
Node kill_all 3600 ticks `d1eff38b03f581aa` / `bca6aa1051309b21` (identical to
v0.4.63); in-page trace `8e8d6fd519dca899` / `817f1e9940c91d76`. v0.5.1
re-verified all nine Node traces (kill_all / defend / run × seeds 1, 2, 7) and
the in-page trace identical. Goldens for W3/W4 are recorded from the W2-end
build by M2 before its first edit and re-checked by M5b (PLAN §6.5).

**Audio probes.** Launch your own puppeteer with
`--autoplay-policy=no-user-gesture-required` (`launchEchoes({ autoplay: true })`);
measure only through `__echoes.audio.meter()` / `testTone()` (headless Chrome
renders Web Audio to a null sink; analyser taps work). Clipping is measured at
the `prelimit` tap (clipper input), never after the tanh ceiling. The
locked-state probe runs WITHOUT the flag: no AudioContext may exist before the
first trusted key/click, which reaches `audio.unlock` through the app gesture
hook even while a blocking menu swallows the key.

**Network probes.** Start your own server instance; drive 2–4 clients with your
own harness (puppeteer pages and/or Node WebSocket bots using
src/net/protocol/*); shape links with the server's `--latency --jitter --loss
--dup --reorder --burst` flags or `POST /admin/conditioner` (server started with
`--admin`), and drop links with `POST /admin/drop`. Report every net gate at
the four PLAN §7 conditions N1 (150 ms ± 20, 10% loss), N2 (250 ms ± 40, 20%),
N3 (burst loss) and N4 (dup + reorder). Multi-page runs use the multi-page
launch profile. `npm run net -- --host 0.0.0.0` exposes the server on the LAN
(default bind 127.0.0.1). A guest must show `busCounters.simCalls` frozen and
`refusedEmits === 0` for the whole session (replica bus).

**Gamepad probes.** The menu polls `navigator.getGamepads()` every frame and
does not require `gamepadconnected`, so a mock installed by an `eval`
(override `navigator.getGamepads` to return a standard-mapping pad whose
`buttons[i].pressed` you toggle) drives the menus.

### M1 — app shell, title, settings, display (Gauntlet W1, owner M1)

**Boot.** Plain URL → `loading` splash (sim frozen at tick 0 while the boot
warm-up drains; then "Press any key or click" only while the audio engine is
`locked`) → `title` over the live camp (sim paused, `__echoes.app.titleCam()`
reports the backdrop framing). `?menu=0` / any legacy harness param =
`app.state === 'playing'` from the first frame, exactly v0.4.63 (no splash,
no title, no auto-pause on blur, FPS meter shown). A title boot never ticks
until New Game (so `gnt-arch-browser.mjs waitReady()` — which waits for
tick ≥ 240 — needs `?menu=0` or a New Game press first).

**Driving menus.** Real input works everywhere (the window capture-phase gate
turns keys into nav actions while a blocking screen is open — no game listener
sees them). Scripted: `__echoes.app.press('down'|'up'|'left'|'right'|'confirm'|
'back'|'tabPrev'|'tabNext')`, `open(id, params)` (e.g. `open('settings', { tab:
'display' })`), `back()`. Wrap calls that return a promise (`confirm`,
`keepDisplay`, `newGame`) in an eval that returns `true`, or the capture waits
for the dialog to resolve. Element ids are stable: `ap-title-{new,load,
settings,exit,continue,multiplayer,records}`, `ap-tab-<id>`, `ap-display-
{renderScale,mode,vsync,frameLimit,showFps}`, `ap-gameplay-{screenshake,
autoPause}`, `ap-settings-{reset,back}`, `ap-confirm-{ok,cancel}`,
`ap-keep-{keep,revert}`, `ap-farewell-return`. `window.close` really closes a
puppeteer tab with one history entry — `history.pushState` first (or stub it)
to reach the farewell card.

**`__echoes.app` (M1).** `state`, `overlay`, `mode`, `stack()`, `screens()`,
`focus()` → `{ screen, id, label, rect, ring }`, `focusables()`,
`ringCount()` (must be 1 while a screen is open), `responses()` /
`clearResponses()` (last 50 `{ action, source, screen, inputTs, paintTs, ms }`),
`frameStats()` (`renderedFps, rafHz, displayHz, source, vsync, limit,
frameMsP50/P95, workMsP50/P95, frames, uncappedFps`), `display()` (render scale,
drawing buffer, css, dpr, clamp, fullscreen / browser-F11 / keyboard-lock,
vsync, limit), `displayLog()`, `simPaused()`, `pauseReason()`, `lastSource()`,
`gamepad()`, `toasts()`, `titleCam()`, `confirm(o)`, `keepDisplay(o)`,
`toast(t,o)`, `requestPause(src)`, `newGame()`, `exit()`, `quitToTitle(o)`,
`provide(name, impl)` / `service(name)` (probe seam — e.g. a recording audio
stub for the gesture-hook gate), `freshWorld`, `frameCount`, `prebuildMs`.

**Display facts a probe can rely on.** Render scale = `renderer` pixel ratio
`min(dpr, 2) × s`, drawing buffer ≤ 3840×2160 (`display().clamped`), applied
synchronously (the next rendered frame). V-Sync off = rAF-anchored uncapped
loop (extra frames between refreshes, none once refreshes are being missed);
`displayHz` is the vsync-period estimate (10th-percentile rAF interval) — use it,
not `rafHz`, as the display rate when the page is GPU-bound. Frame limits pace
rendered frames only; the sim stays 60 ticks/s. Fullscreen is session-only and
must be entered from a trusted key/click (puppeteer `keyboard.press` counts);
Keep/Revert opens when the Display tab is left or Settings closes.

**M1 probes** (`node tools/gntM1-drive.mjs tools/gntM1-sc-<name>.mjs [--url U]
[--w W --h H] [--gpu 1] [--headful 1]`, GPU harness by default; output
`captures/gntM1-sc-<name>.json`): `layout` (G1.1, run at 1024×576 / 1600×900 /
2560×1440), `nav` (G1.2), `response` (G1.3), `scale` (G1.4, `?menu=0`),
`keeprevert` (G1.5 + G1.9), `pacing` / `pacing-half` (G1.6 + G1.7, `?menu=0`),
`persist` (G1.8, `?menu=0`), `exit` (G1.10), `journey` (G1.11), `palette` then
`node tools/gntM1-palette-check.mjs` (G1.12), `gesture` (G1.13), `shake`
(screen-shake scaling, `?menu=0`), `misc` (FPS meter toggle, auto-pause,
overlay pause).

### M3 — audio engine and mixer (Gauntlet W1, owner M3)

**Locked until a gesture.** No AudioContext exists before the first
user-activation gesture: `__echoes.audio.state === 'locked'` and
`gestureNeeded === true` on a normal boot; the app gesture hook's first
trusted key (not Esc) / click / touch creates it synchronously
(`autoplay().unlockedVia`, `unlockedAtMs`, `runningAtMs`). Puppeteer's
`page.evaluate` counts as a user gesture — a locked-state probe must read the
page through a CDP session with `Runtime.evaluate({ userGesture: false })`
(see `tools/gntM3-gates.mjs autoplay`). With
`--autoplay-policy=no-user-gesture-required` (`launchEchoes({ autoplay: true
})`) a silent media-element trial unlocks the engine right after main.js
finishes evaluating (~4 s into a headless boot) — wait for `state ===
'running'` before measuring. `?audio=0` builds the engine with Master
force-muted for the visit (unmuting Master in the Audio tab ends it).

**Measuring (never by ear).** `__echoes.audio.meter(tap)` for taps
`master | prelimit | music | sfx | ambient | ui` (AudioWorklet accumulators on
the audio thread: integrated `rmsDb / lRmsDb / rRmsDb / peakDb`, `peakHoldDb`,
`shortRmsDb`, `overMinus1Pct`, `clipCount`, 400 ms window median / p10 / p90,
`longestBelowMinus50Ms`, `centroidHz` once any meter call armed it);
`meterReset()`; `history(tap, n)` (100 ms windows). Bus taps sit AFTER the
Master send, so every tap moves with Master; `prelimit` is the limiter output
= the ceiling clipper's input. `testTone(bus, { freq, dbfs, ms, x, z })`
plays a sine whose RMS is `dbfs` pre-fader and returns `expectedTapRmsDb`
(x/z = spatial through a panner). Silence the score first with `quiet()`
(pins music `silence` + no bed) and note that an HMR reload restarts it.
`busGain(name)` = the live AudioParam values (a −180 dBFS keep-alive keeps
every chain rendering, so values are live even in silence); `buses()` = the
settings view with `gainDb / effectiveDb`; `limiter()` = reduction now / max,
`pctWindowsUnder6dB`, `excursionsOver10dB`, `makeupCompDb`; `voices()`,
`cueLog(n)`, `cost()` / `costReset()` (engine main-thread ms per frame),
`music()` (state, theme, bpm, intensity, `fight`, transitions with
`crossfadeMs`), `setMusic(state, { theme, bed, crossfadeSec, intensity })` /
`releaseMusic()`, `play(cue, opts)`, `cues()`, `eventTypes()`,
`listener()`, `spatialModel()`, `predictPan(x, z)`, `autoplay()`.

**Sound events.** Every cue request is still a `sound` event on the sim bus
(`{ slot, cue, voice?, dropped? }`; legacy slots `shoot / hit / kill / heal`),
including requests merged by the 30 ms same-cue cooldown (`dropped:
'cooldown'`) and requests while locked (`dropped: 'locked'`). Traces exclude
`sound`.

**Mixer facts.** Slider curves are src/audio/mixmath.js (log: −20 / −10 /
−4.15 dB at 25 / 50 / 75 %; linear: −12.04 / −6.02 / −2.50). Switching a
channel's curve moves its level to the same dB (not on reset). Basic attack in
probes = RIGHT mouse button. Default mix (combat): music ≈ −24 dBFS RMS at the
master tap, beds ≈ −28, SFX peaks ≈ −8, UI peaks ≈ −20.

**M3 probes** (`node tools/gntM3-gates.mjs <gate>` → `captures/gntM3-gate-
<gate>.json`): `curves` (G3.1), `decouple` (G3.2), `clip` (G3.3, boss fight
at 100 %), `balance` (G3.4), `music` (G3.5, title → camp → combat → boss →
victory → camp → combat → defeat → camp by the real flow), `spatial` (G3.6),
`coverage` (G3.7), `autoplay` (G3.8, no flag, key / click / touch + with-flag
check), `persist` + `tab` (G3.9: reload, mute on blur / hidden, the Audio tab
by keyboard, mouse and a mocked pad), `cost` (G3.10, a whole run).
`node tools/gntM3-calibrate.mjs [--only cues|music|post|beds]` re-measures
the cue peaks / music trims / bed trims after a sound-design change.

**Adding sounds for new content (W2+).** From your own module (never
src/audio/**): `service('audio').registerCue(id, { bus: 'sfx', levelDb,
priority, maxVoices, cooldownMs, voice(ctx, t, dest, p) { … return endTime } })`
(`p.kit` = the src/audio/voices.js primitives: tone / noise / bell / pluck /
pad) and `service('audio').registerEventCue(eventType, (ev, h) => [{ cue, x,
z, gainDb, pitch }] | null)` — handlers run before the built-in map, a non-null
result replaces the built-in cues for that event instance; `h.pos(id)` /
`h.player()` give world positions. Themes / beds: `registerMusicTheme(id,
params)` / `registerAmbientBed(id, builder)`; the run's act (from `run_start`
/ `layout_enter` `act`) picks theme wood / mill / barrow. New cues are
measured in page with `await __echoes.audio.measureCue(id)` →
`designPeakDb`; pass it as `calDb` to registerCue so the cue peaks exactly at
its `levelDb` (built-in cues: `node tools/gntM3-calibrate.mjs --only cues`).

### M4a — eight slots, skills, nodes, expeditions, difficulty curve (Gauntlet W2, owner M4a)

> **Superseded in part by the M4c user correction (next section):** the
> player has at most **4** skill slots (keys 1–4) and **8 node sockets per
> skill** with no rarity caps. The 8-slot / 2-socket / `capped` lines below
> describe the W2 build; M4a's probes that assert them (gntM4a-simprobe
> `slots` + the Resonance cap checks, gntM4a-drive `hud` / `socket` /
> `nudges` on tiles 5–8, gntM4a-realrun's two-click socketing) are
> superseded by the gntM4c-* probes. Everything else in this section stands.

**Eight slots (W2 — superseded).** `SKILL_SLOTS = 8` (src/core/constants.js) drove every slot
array: `state().skills` had 8 entries (`null` = empty), keys Digit1–8,
`cmd('restoreSkillState', { slots: [8 × { id, remaining } | null], override:
null })` loads a kit, `cmd('grantNode', id)` benches a node,
`cmd('buildVerdict', skillId, nodeId)` / `cmd('kitVerdict', nodeId)` = the
§23.4 cell state (`live | grey | inert | capped`) and its copy.
`__echoes.hud.slots()` → per tile `{ key, cooling, wipeDeg, iconDrawn, nudge:
{ frame, slot, flash } }`. Legacy 4-slot traces:
`node tools/gntM4a-legacytrace.mjs --slots 4` (eventsHash must stay the v0.5.0
goldens `d1eff38b03f581aa` kill_all / `554cd9c41db19975` defend).

**Statuses.** `cmd('setStatus', id, kind, mag, ticks)` → the stored record or
`{ refused }` (party-only haste/shield/ward/inspired, hostile-only
stun/exposed, the Stag immune to slow/stun, 120-tick stun immunity);
`cmd('clearStatus', id, kind?)`, `cmd('statusOf', id)`. Events:
`status_apply` (announced at the end of the tick the record landed),
`status_expire`, `shield_absorb`, `hit_blocked` (a Ram's guard). Training
dummies have 20 HP — one Bell Toll kills them and a corpse is never stunned,
so prove stun on `cmd('spawn', 'boar', x, z, { hpMul: 6 })`. Number probes
park the allies and make targets non-knockbackable (their lunges otherwise
move the targets out of an area mid-measure).

**Expeditions + curve.** `cmd('startRun', { act, challenge })` (bypasses act
locks), `cmd('skipToRoom', n[, { act, challenge }])`, `cmd('roomPlan')`;
`__echoes.content`: `levels()`, `level(act)`, `unlockedActs()`,
`lastActInfo()` → `{ act, reason: 'last' | 'newest' }`, `curve(act,
challenge)`, `difficultyTable(challenge)`, `roomPlan()`, `sessionWins()`,
`unlock([1, 2])` (probe override for the ≥ 2-acts portal branch; `null`
restores the truthful rule), `fx()` (live skill/status VFX element counts),
plus M4b's probes (`hazards()`, `interactables()`, …). URL `?act=2|3` starts
that act from the portal / `?run=1`. The Challenge setting is
`gameplay.challenge` (relaxed / standard / harrowing), read at the portal
press — it changes the NEXT run only. Portal rule: `?menu=0` → Act I
directly (the ARCH core-loop check is unchanged); a title session with only
Act I unlocked → Act I directly; ≥ 2 unlocked → the `expedition` picker (sim
paused, E confirms, Esc backs out).

**Autopilot + act runner.** `cmd('autopilot', cfg | false)` plays the run
inside the sim (drafts, door 0, cheapest shop card, auto-socket).
`node tools/gnt-M4a-actrun.mjs --act all --seeds 1-5` (in page by default:
`?menu=0`, sim frozen, `__echoes.sim.stepN` chunks; `--node 1` = the
identical headless sim; `--url` for another server) → per room ticksToClear,
party damage, downs, enemies by type, elites, boss adds, plus the §4.2 band
verdict (Spearman ρ ≥ 0.6, wins ≥ 3/3/2 of 5, no room live 180 s, defend and
boss spikes, per-room damage medians I < II < III). Constants retuned
2026-09-22 (BUILD_BRIEF §23.2 note): act tier 1.00 / 1.15 / 1.60, slope 0.12,
defend × 1.25, Stag 2400·T — and retuned again by M4c for the corrected build:
act tier 1.00 / 1.15 / 1.75, slope 0.16, Stag damage slope 0.7.

**Real input.** `__echoes.content.advise()` = what the autopilot would press
this tick (never applied); `__echoes.content.project(x, z)` = world → CSS
pixels. `node tools/gntM4a-realrun.mjs --act 1|2|3 --seed S [--url U]` plays a
whole act with puppeteer keys and mouse only (retries an HMR reload up to 3
times); `node tools/gntM4a-fpscmp.mjs --url U --tag T` = the fixed scripted
fight for build-to-build fps comparison (production builds on 4304).

**M4a probes.** `node tools/gntM4a-simprobe.mjs` (Node; every §23.3 number,
statuses, the 238-cell §23.4 matrix, node behaviours, Keen crit rate, curve
table, rolled plans). `node tools/gntM4a-drive.mjs <scenario> [--url U] [--w W
--h H]` (GPU harness; `captures/gntM4a-drive-<scenario>.json`): `skills`
(G4a.2, all 9 cast by keys 3–8 + VFX frames), `hud` (G4a.1, 1024×576 /
1600×900 / 2560×1440), `socket` (8 rows, scroll, Esc consumed), `nudges`
(denial + cooldown grammar on tiles 3–8), `grey` (§15.5 display for the new
nodes), `acts` (G4a.4: layouts / hazards / interactables / music theme / boss
adds per act), `picker` (G4a.11), `challenge`, `pages` (G4a.12).

### M4c — content correction: 4 skills, 8 sockets per skill, no rarity caps (Gauntlet W3.5, owner M4c)

**The truth (user correction 2026-09-22).** `SKILL_SLOTS = 4` (keys Digit1–4;
5–8 unbound; `state().skills` has 4 entries), `SOCKETS_PER_SKILL = 8` on every
skill, the passives included, and any node of any rarity fits any socket.
`cmd('buildView')` → `{ combatActive, socketCount: 8, bench[], skills: [{ id,
sockets: [8 × { node, verdict } | null], filled, live, resolved, resonance,
… }] }`; `cmd('socket', skillId, nodeId, slot?)` (slot 0–7; omitted = first
vacant) → `{ skill, node, slot, verdict }` or `{ denied: 'limit' | 'full' |
'no_such_slot' | 'combat_active' | 'not_on_bench' | 'skill_not_owned' }` (no
`cap` reason exists); `cmd('unsocket', skillId, slot)`; `cmd('autoFill')` =
the one auto-socket policy (live placements only, within limits, spread to
the skill with the fewest filled sockets; the autopilot and the socket
screen's F call it). `cmd('buildVerdict', …)` states are `live | grey |
inert` (Resonance on a passive = `live`, reason `pulse`). Legendaries on
passives: Ascend ×2 pulse power, Resonance every 3rd pulse ×2
(`resonance_proc { pulse: true }`).

**Node supply.** Every combat-room clear drops 2 spoils on the bench
(`spoils_drop { room, nodes, total }`, provenance `spoils`; forfeited on a
defend soft-fail; `state().run.spoils`); the shop shelf is 4 cards (2
common + 1 rare + 1 legendary) at 15 / 20 / 25 — 72 Glint buys any three,
never four; the autopilot buys cheapest-first while the wallet lasts.

**Screens.** Socket screen: `__echoes.content.socketUi()` → `{ open, scale,
rows, cells[4][8] { state: vacant|ghost|filled, grey, inert, fits, limited,
focus }, bench [{ node, count }], focus { zone: cells|bench, r, c, i }, held,
detail, rects { page, rows, cells, chips, detail, auto }, pad }`. Keys while
open: arrows/WASD, Enter/Space pick · place · move, X/Delete remove, F
auto-fill, 1–4 rows, Tab bench ⇄ sockets, Esc/B close (consumed). Pad
(standard mapping, polled per frame; a mock `navigator.getGamepads` works):
View (8) opens between rooms, D-pad/stick, A, B (drop hand / close), X, Y,
LB/RB. HUD: `hud.slots()[i].sockets` = `{ filled, live, grey, of: 8 }` and an
8-segment `.hud-slot-pips` strip under each of the 4 skill tiles. Draft page:
`.rn-spoils` line. Shop: 4 `.rn-item` cards.

**Saves.** Schema 2 / StateTree `v: 2`; a schema-1 file migrates on load
(first 4 skills kept, dropped skills' nodes to the bench, rows padded to 8, a
stale skill reward → the empty offer). Goldens: the 9 references
`captures/gnt-M2-golden-*.json` were re-recorded at the M4c-end build (W2-end
originals: `captures/gntM4c-w2end-golden-*.json`; copies
`captures/gntM4c-golden-*.json`); `node tools/gntM2-goldens.mjs` is 9/9 on
the M4c build.

**M4c probes.** `node tools/gntM4c-simprobe.mjs` (Node, 72 checks: slots,
sockets incl. the 2312-operation any-rarity sweep, passive legendaries, the
corrected matrix on sockets 1/4/8, auto-fill, supply, the curve table, a
GENUINE v1 save from `git archive ebd0609` migrated and applied, determinism;
it exports that v1 build to `captures/gntM4c-v1root` on first use).
`node tools/gntM4c-drive.mjs socket|sizes|hud|pages` (GPU harness, loopback
flag built in; JSON `captures/gntM4c-drive-<scenario>.json`).
`node tools/gnt-M4a-actrun.mjs --act all --seeds 1-5 --node 1` (Node) /
`node tools/gntM4c-actrun.mjs --act all --seeds 1-5` (in page) → the §4.2
band; `node tools/gntM4c-band.mjs <actrun.json>` → kill_all-only per-room
medians + ρ (the gate's per-room medians mix the randomly placed 45 s defend
rooms). `node tools/gntM4c-realrun.mjs --act 1|2|3 --seed 1` = a whole act by
real keyboard + mouse (the socket screen by its own keys: Enter places a
drafted node, B·F·Esc auto-fills the spoils on every page).

### M4b — enemies, hazards, interactables, layouts, biomes (Gauntlet W2, owner M4b)

**Deterministic setups (PLAN §6.4).** `cmd('spawn', etype, x, z, { elite,
hpMul })` for every archetype (boar, mantis, quillback, toad, moth, ram, mole);
`cmd('burrow', id, bool)`; `cmd('spawnHazard', htype, params)` /
`cmd('spawnInteractable', itype, params)`; `cmd('hazardPhase', id,
'idle' | 'telegraph' | 'active' | 'cooldown')`; `cmd('armKeg', id)`;
`cmd('interactPress', partyIndex)`; `cmd('setLayout', n)` / `cmd('clearLayout')`
(placements of data/layouts.js layout n); `cmd('contentState')`. Probes on
`__echoes.content`: `hazards()`, `interactables()`, `layout()`, `render()`
(hazard / asset layer counts + prompt + cue count), `prompt()`, `enemyfx()`
(archetype telegraphs, globs, slicks, wake). In the camp scene
`cmd('arenaLayout')` → the dressing builder (`layoutId, biome, built, queued,
building, syncBuilds, slices, maxSliceMs, worker, failed`) and
`cmd('applyLayout', n)`; in `?scene=arena` the same via
`__arenaProbe.layoutState()` / `applyLayout(n)`.

**URLs.** `?layout=N` (1–9) = layout N's dressing AND its placements in the
`?room=` harness / `?scene=arena`; `?variant=N` = dressing only (no
placements, legacy goldens unchanged). `?act=2|3` with `?menu=0` also makes
the camp pre-build that act's dressings first.

**Dressings.** One per layout (env/biomes/{wood,mill,barrow}.js), swapped on
the run's `layout_enter` under the room fade. Floors paint off-thread in
env/biomes/paint-worker.js (byte-identical to a main-thread paint:
`node tools/gntM4b-groundhash.mjs 1,2,3 [--worker]` must print the Act-I
hashes `2fe56349e8ca1052/9a63967c8cf4e1eb`, `fc901236d5b9c5ea/57c079ffdd7eb997`,
`5cdb746f53462607/19cb00393d941294`, `streamInSync: true`). Outside a run the
builder pre-builds every layout; inside a run only the run's act; never in
live combat.

**M4b probes.** `node tools/gntM4b-simprobe.mjs` (Node; every §23.5–23.7
number, governor, spacing, assets, blockers, canonicalJSON mid-wave in
layouts 1/4/7; 85 checks). `node tools/gntM4b-layoutcheck.mjs` (placement
rules vs spawns / Waystone / party spots / dressing anchors).
`node tools/gntM4b-drive.mjs <scenario>` (GPU harness, captures/gntM4b-*):
`zoo`, `sheet` (silhouettes + elites), `tele` / `shapedbg` (Ember shapes),
`layout --layout N` (placements idle + forced telegraphs), `biome --variant N
[--at x,z] [--hide pools|glows|lights]` (dressing frame + draw calls),
`run --act N [--seed S] [--at x,z] [--top kinds] [--cold]` (real run: camp
pre-build, startRun, wave with a new archetype, a hazard forced into its
telegraph during a live enemy telegraph, RMB + 1 + 2, shot — the G4b.7 frame).
`node tools/gntM4b-perf.mjs --acts 1,2,3 --secs 64` (G4b.5: autopilot real
time; combat fps, frames > 100 ms after warm-up, worst frame per room swap,
Long-Animation-Frame list); `node tools/gntM4b-prof.mjs --act N --from s --to s`
(CPU profile attributed per long frame). `node tools/gntM4b-cuecal.mjs
[--write] [--verify]` (content cue calDb; verify = 17 cues within 2 dB of
levelDb, none above −6 dBFS). Helpers: `gntM4b-buildcost.mjs`,
`gntM4b-slices.mjs`, `gntM4b-groundpng.mjs`, `gntM4b-crop.mjs`.

### M2 — save / load, slots, autosave, records (Gauntlet W3, owner M2)

**What a save is.** `__echoes.save.capture()` = the complete StateTree v1
(src/save/capture.js): `clock` (tick, hitstop, grants), `rng` (the LIVE
stream: seed, mulberry32 word, draws), `registry` (every entity, ascending
id, `nextOrdinal`), `world` (tick, stats, harness flags), `systems` (combat,
skills, build, enemies, waves, allies, boss, run incl. autopilot, layout incl.
hazards + interactables, movement colliders, shapes counter — each system's
`saveState()` / `loadState()`; skills / nodes keep their older
`serialize()/restore()` for the run block's relative persistence), `scene`
(camp|run + the room layout), `app` (playtime ticks, the run's kill base).
`apply(tree)` validates, snapshots a rollback, re-enters the scene mode
(colliders + camp seat hold, dressing via `restoreScene`; never seatParty),
then clock → rng → registry (patched IN PLACE, rebuilt ascending) → every
system → module state, and emits one `state_restored` (every render / UI /
audio layer resyncs on it). Capture points: `clock.onTickEnd` or between
frames only — a capture from inside a sim step throws `CapturePointError`;
`requestCapture()` defers it (tick end for in-step events, a microtask for
events a command emitted between frames — either way captureTick ===
eventTick). The file is `{ format:'echoes-save', schema:2 (M4c; schema-1 files migrate on load), game, slot,
createdAt, savedAt, meta, state, hash }`, hash = hashState(state) (FNV-1a 64
over canonical JSON), body written in insertion key order (so a loaded object
iterates like the saved one); `MIGRATIONS` chain runs after the hash check of
the stored tree; a newer schema is refused and never modified.

**Storage.** `echoes.save.v1.<slot>` (+ `.bak` = the previous good file,
`.tmp` only mid-write, `.thumb` 256×144 JPEG data URL), `echoes.save.v1.index`
(a cache — rebuilt by scanning), `echoes.profile.v1` (+ `.bak`). Slots:
`manual-1…8`, `auto-1/auto-2` (alternating), `quick` (F5 / F9 in play). Atomic
write: tmp → bak → main → drop tmp; a newer valid tmp is promoted at boot, an
invalid one dropped (`__echoes.save.recovery()`). Blocked site data (the
`localStorage` getter throws) → the game still boots and saves live in memory
("Saves last for this visit only"). A camp save is ~4 KB, a mid-combat Act III
save ~13 KB.

**`__echoes.save`** (the debug surface): `list() save(slot,{name}) load(slot)`
(through app.loadSlot: enters play) `loadRaw(slot) remove rename capture()
apply(tree) order() hash() roundTrip({ticks=600, scriptSeed=1, every=60,
restore=true})` → `{hashBefore, hashAfterApply, equal, continuationEqual,
firstDivergence, events, eventsHash, hashes[]}` (freezes the realtime loop,
restores the moment afterwards) · `continuation({ticks, scriptSeed, every,
restore})` (the reload leg: save → continuation → reload → loadRaw →
continuation, compare) · `corrupt(slot, 'truncate'|'schema'|'keys'|'hash'|'newer')
simulateQuota(on) simulateTornWrite(slot,{valid}) usage() profile()
profileReport() recovery() autosaveLog() autosave(reason)
autosaveEnabled(on) resetAutosaveThrottle() captureLog() requestCapture(r)
captureOnEvent(type)` (G2.12 probe) `lastLoad() lastRecord() bootHash()
bootTree() freshHash(seed) freshTree(seed) tracker() thumb(slot) lastThumb()
exportText(slot) importText(text, slot?) restoreBackup(slot) resetToFresh({seed})
canSave() errors`. `__echoes.sim.hash()` is now the complete-capture hash
(the in-page `sim.trace` stateHash therefore differs from the v0.5.0
reference; its eventsHash does not).

**Menus.** Title: Continue (newest valid save, focused), Load Game (enabled
when any slot exists), Records. `app.open('saves', { mode: 'load'|'save' })`
— INT's pause menu opens the Save tab in W5; until then saving in play is F5
+ autosave. Stable ids: `sv-slot-<id>`, `sv-act-{load,save,rename,export,
delete,restore}`, `sv-import` (+ hidden `sv-import-file`), `sv-back`,
`sv-mode-{save,load}`, `sv-rename-{input,ok,cancel}`, `sv-records-back`.
Keys: Enter/A = the primary action, Delete/X = delete (confirm, Cancel
focused), F2/Y = rename, Q/E LB/RB = Save⇄Load (in play), Esc/B back; ←/→
hop between a row and its action buttons. Autosave safe points:
`room_enter`, `shop_open`, `run_end` (unthrottled), `return_to_camp`, quit
(`autosave('quit')`, unthrottled); ≥ 20 s between the others; never while a
probe drives the sim, never outside `playing`, never as a net guest. Score
(profile, end card "SCORE … · New best!", Records) = PLAN §3.4 formula; kills
= `world.stats.kills` since `run_start`.

**M2 probes** (`node tools/gntM2-drive.mjs tools/gntM2-sc-<name>.mjs [--w --h]`,
GPU harness, retries HMR reloads; JSON in `captures/gntM2-sc-<name>.json`):
`roundtrip` (G2.1/G2.2: 8 moments, in page + after reload;
`GNTM2_MOMENTS=camp,combat,…` picks some; moment builders in
tools/gntM2-moments.mjs), `slots` (G2.3, real keyboard + mouse, layout audit
— run at 1024x576 / 1600x900 / 2560x1440), `integrity` (G2.4 corruption +
quota, G2.5 torn writes across a reload, G2.6 export → real download → real
file-chooser import), `autosave` (G2.7 safe points, captureTick, throttle,
per-piece main-thread cost, autosave-OFF control) + `autosave-steady` (G2.7
frames: 8 autosaves in live combat vs 8 idle windows), `gates` (G2.8 scores +
end cards + Records, G2.9 New Game == fresh boot, G2.11 interleaved-id
registry, G2.12 capture point), `records` (Records layout, 3 sizes), `misc`
(?slot= boots, Continue, gamepad-only slots/records), `private` (blocked
storage). Node: `node tools/gntM2-nodetrip.mjs` (9 headless round trips incl.
a FRESH world through the file codec), `node tools/gntM2-goldens.mjs` (G2.10:
the 9 goldens `captures/gnt-M2-golden-{kill_all,defend,run}-{1,2,3}.json`,
recorded from `git archive 9246562` before M2's first edit and re-recorded at
the M4c-end build by the user's skill/socket correction — M5b re-checks
them). Layout audit helper: tools/gntM2-audit.mjs.

### M5a — network core: server, lobby, protocol, conditioner, netbench (Gauntlet W3, owner M5a)

**Session server** (zero npm dependencies — node:http / crypto / os only):
`npm run net -- --port P [--host 0.0.0.0] [--admin] [--log]` prints the
URLs and a machine-readable `[echoes-net] ready {…}` line (~150 ms). Default
bind 127.0.0.1; `--host 0.0.0.0` prints every LAN `ws://…/echoes` URL (also in
`welcome.lanUrls`). Conditioner on EVERY link: `--latency ms --jitter ms
--loss f --dup f --reorder f --burst pGB,pBG,lossInBad --bw kbit/s --seed n`
(fractions 0–1 or `10%`) or `--cond lat75,jit10,loss10,dup1,reo2,burst0.05:0.3:0.8,bw256,out5000:3000,seed7`
(compact form: loss/dup/reo in PERCENT, one-way ms — lat75 on both
directions = 150 ms RTT). Admin API (only with `--admin`, loopback callers
only): `GET /stats` · `POST /admin/conditioner {target:'all'|peerId|roomCode, up, down}`
(`"off"` clears) · `POST /admin/drop {peerId, mode:'close'|'blackhole', forMs}`
(close: socket closed and the identity refused for forMs; blackhole: the link
goes silent — > 5 s silence drops a guest, > 3 s an in-game host) ·
`POST /admin/kill-host {code}` (host closed + barred → 10 s grace → migration).
`GET /health` is always on. **Restart your server after editing server/** or
src/net/protocol/** — a running Node process keeps the old code.**

**Link model** (src/net/protocol/conditioner.js, same on server links, the
browser `?netcond=` and Node bots): unreliable = SNAP, INPUT and the ping/pong
heartbeat (loss / burst / dup / reorder +20–60 ms / latency + normal jitter /
bandwidth tail-drop past a 300 ms queue); reliable = every other control
message, EVENTS, CMD, KEYFRAME — in order PER STREAM, never dropped, each
simulated loss = +max(200 ms, 2 × base RTT). Node timers on Windows wake on a
15.6 ms tick; server links and Node bots use a precise pump (~0.1 ms; costs up
to one CPU core only while shaped traffic is queued; unshaped = synchronous
pass-through).

**Protocol** (src/net/protocol/*): relay envelope `u8 channel · u8 seat` on
every binary frame; SNAP = baseline/ack delta (Quake 3) — HOT entity table
quantised (pos 1/256 u, hp 0.01, yaw 256 steps via a 1/4096-rounded table,
aim 1/64 u, 16 flag bits, linear movers dead-reckoned from an anchor) + COLD
null-safe tagged tree diff, both carried by a binary canonical-value codec
(bvalue.js); a u64 quantised-tree hash every ≥ 30 ticks. INPUT = up to 6
unacked frames delta-coded (steady state 28 B/packet). `__echoes.net` (the
`net` service, idle in single-player): `state role room code seat peerId
serverState serverUrl lanUrls inSession() connect(url) probe(url) host({visibility})
join(code, seat?) quickMatch() cancelMatch() leave() setReady(b) selectSeat(s)
start(seed?) rejoin() rejoinInfo() drop(ms) disconnect() stats() peers() log(n)
conditioner.{set,get,clear,stats} on(type, fn) setSessionDriver(d) extendStats(fn)`.
`?nethost=1 / ?netjoin=CODE / ?netquick=1 / ?netname= / ?netseat= / ?netcond= /
?netrate=` act at lobby level. Until M5b registers a session driver, a started
room runs the **probe stream** (host: save.capture() at every 3rd tick end →
per-guest delta snapshots + EVENTS + a KEYFRAME every 120 ticks; guests decode,
hash-check, ack at 60 Hz) — transport measurement only, nothing is written
into the guest's world.

**Probes.** `node tools/gntM5a-protocol.mjs` (tree-diff law corpus + 10 000
fuzz pairs on the JSON and binary forms, codec round trips, conditioner
accuracy — 72 checks) · `node tools/gntM5a-corpus.mjs` (G5a.3: the REAL sim
headless, acts 1–3 + boss, M2's StateTree v1, 3 guests at 20 % snapshot +
20 % ack loss + reorder + dup; exactness, hashes, delta ratio, bytes) ·
`node tools/gntM5a-lobby.mjs [--trials 50] [--quick]` (G5a.1/2/4: in-process
server on 7811 + a child server on 7812; RFC 6455 conformance, every lobby
path and rejection reason, last-seat race, relay, reconnect, blackhole,
admin drop, host grace, kill-host migration, 8 Node clients, server kill,
unreachable probe — 28 checks) · **`node tools/gnt-M5a-netbench.mjs --server
ws://127.0.0.1:<port>/echoes`** (PLAN §6.7 CLI + `echoes-netbench/1`; start the
server with `--admin` for per-guest-link shaping and drops; `--pages N --bots M
--seconds S --mode lobby|combat|boss --cond … --drop guest:MS@Ts|host:close@Ts
--out f`, plus `--w/--h` (default 1600×900), `--seed`, `--rate`, `--settle`).
**Every page opens in its own browser window**: tabs of one window are
`hidden` and stop requestAnimationFrame even with the multi-page flags (use
`openEchoesWindow` from tools/gntM5a-botlib.mjs in any multi-client harness).
All pages boot and finish their warm-up before any of them connects (then host /
join through `__echoes.net`). The netbench retries a run (≤ 3) when a dev-server
reload hits a page, and its bots speak the pages' build — but while other
builders commit, long multi-page runs are only stable against a production
preview: `npx vite build --outDir dist-<key>` + `npx vite preview --outDir
dist-<key> --port <your preview port> --strictPort` and `--url
http://127.0.0.1:<port>/`. Baseline for fps comparisons:
`node tools/gntM5a-fpsbase.mjs --pages 2 --w 960 --h 540` (N single-player
windows, no network: 2 windows ≈ 51 fps here). Dev aid:
`node tools/gntM5a-pagedebug.mjs ws://…` (host + guest windows, dumps net logs).
