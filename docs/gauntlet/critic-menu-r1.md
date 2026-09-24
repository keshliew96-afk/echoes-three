STATUS: COMPLETE
VERDICT: FAIL - 2 must-fix (G1.3 early-window menu hitches p95 86-120 / max 131-206 ms in 4/4 runs; G1.1 Network tab hit targets 36 px at 1024x576), 11/13 M1 gates met, benchmark 31/37 met + 6 partial, 0 page errors, no core-loop regression.

# Critic report — MENU & SCREEN SETTINGS, gauntlet round 1

Started. Steps will be appended as completed.

## STEP 1 — BLIND BENCHMARK CHECKLIST (written before any Echoes capture was inspected)

Written purely from knowledge of the named shipped systems: Hades (Supergiant), Celeste,
Hollow Knight, Slay the Spire, and Unreal/Unity shipped-game settings conventions.
Timestamp: start of run, before the first capture was taken or read.

### A. Title screen layout & presentation (Hades, Hollow Knight, Celeste)
- A1. Title screen shows a game logo/wordmark plus a vertical (or clearly grouped) list of
      primary actions. Hades: Begin/Continue, Settings, Extras, Quit. Hollow Knight:
      Start Game, Options, Achievements, Quit. Celeste: Climb, Options, Quit.
- A2. The list is short (4-6 entries). Secondary/rare options are nested, never crowding the root.
- A3. The default/most likely action is pre-focused on arrival (Hades pre-selects Continue when
      a save exists; Hollow Knight pre-selects Continue). "New Game" is NOT pre-selected when a
      save exists, because it is the destructive choice.
- A4. Unavailable entries (Load Game with no saves) are visibly disabled/greyed, not missing and
      not silently dead — Slay the Spire greys "Continue" when no run is in progress.
- A5. A build/version string is visible somewhere on the title (all four shipped games show one).
- A6. Layout survives 16:9 at low (1024x576) and high (2560x1440) resolutions: no clipping, no
      overlap, type stays legible (≥ ~14 CSS px equivalent at the smallest size), safe margins kept.
- A7. Title screen has living presentation (animated background / music), not a static flat card.

### B. Navigation model (all four + Unreal/Unity conventions)
- B1. Keyboard alone can reach and activate every entry: Up/Down (and/or W/S) move, Enter/Space
      activates, Esc/Backspace goes back one level.
- B2. Mouse alone can do the same: hover highlights the row (and moves the logical selection, so
      the two input models never disagree), click activates.
- B3. Gamepad alone can do the same: D-pad/left-stick move, A/Cross activates, B/Circle backs out.
      Stick input is treated as discrete steps with a repeat delay, not one step per frame.
- B4. Exactly one visible focus indicator at all times; it never disappears, never duplicates,
      and is visible without relying on colour alone (Hades: pointer + scale; Celeste: highlight
      bar; HK: ornament). Switching input device moves the single indicator rather than adding one.
- B5. No focus trap: Esc/B from any sub-screen returns to the parent, and repeated Esc eventually
      lands back on the title. No screen can only be left by mouse.
- B6. Wrap-around or hard-stop at list ends is consistent across every menu (pick one, keep it).
- B7. Opening a submenu focuses its first/last-used row; returning to a parent restores the row
      you came from (all four do this; it is the single most-felt navigation polish item).
- B8. Input-to-visual latency on a menu press is ≤ ~100 ms (2 frames of audio+visual response;
      Hades/Celeste respond on the same frame with a click sound).
- B9. Menu actions have audio feedback: a move sound distinct from a confirm sound, and a
      back/cancel sound (all four).

### C. Display settings behaviour (Unreal/Unity shipped conventions + the four games)
- C1. Resolution / render-scale control exists and measurably changes the rendered pixel count —
      not just a label. Unity/Unreal ship a "Resolution Scale" slider (e.g. 50-100%+) that changes
      the render target; the UI stays crisp while the 3D image softens.
- C2. Windowed / Fullscreen / (Borderless) toggle actually changes the window/display mode, and
      the game re-lays-out correctly at the new size within a frame or two (no stretched or
      letterboxed-forever state).
- C3. Fullscreen state stays in sync when the OS/browser leaves fullscreen by itself (Esc, alt-tab,
      window manager). The menu must re-read the true state, never show a stale "On".
- C4. V-Sync toggle exists, and the presented frame cadence measurably changes (locked to refresh
      vs free-running). If the platform cannot honour it, shipped titles grey it out and say why.
- C5. Frame-rate limit with discrete options (e.g. 30 / 60 / 120 / Unlimited) that measurably caps
      rendered fps within a few percent, and that is independent of V-Sync.
- C6. Changes preview instantly (Unreal/Unity modern convention) OR are applied with an explicit
      Apply; if a mode change can black-screen the user, a revert timer ("Keep these settings?
      Reverting in 15s") protects them. Either model is acceptable, but it must be stated in the UI.
- C7. Every setting persists across a full restart and is re-applied on boot before the first
      visible frame (no flash of the wrong mode).
- C8. Corrupt/absent settings data falls back to defaults and still boots — never a crash, never a
      wiped profile.
- C9. Settings show their current value as text/number, not just a slider position.
- C10. "Reset to defaults" exists per tab or globally (Unreal/Unity standard).
- C11. A setting that the platform cannot truthfully deliver is labelled honestly rather than
      shipped as a placebo toggle. (Binding project rule; also what a shipped game does when a
      GPU feature is unsupported.)
- C12. Changing display settings from inside a run does not break or desync the run.

### D. State transitions / lifecycle (Hades, Slay the Spire, Celeste)
- D1. New Game from the title starts an actual run with no leftover state from a previous session.
- D2. Load/Continue is distinct from New Game and never silently overwrites a save.
- D3. Quit/Exit is honest about what it can do on the platform. On PC it exits the process; a
      platform that cannot exit must say what it will do instead and confirm destructive loss.
- D4. Quitting/starting a run asks for confirmation when unsaved progress would be lost.
- D5. Losing window focus while in a menu does not strand input (no stuck keys / runaway repeat).
- D6. Returning from a run to the title leaves the title fully functional again (no dead menu,
      no doubled audio, no leaked render loop).

### E. Robustness
- E1. No uncaught page/engine error in any menu flow.
- E2. Rapid input (mash confirm, mash Esc) does not open two screens or leave an orphan overlay.
- E3. Resizing the window while a menu is open re-lays out without clipping.

## STEP 2 — layout probe (G1.1) — DONE
Tool tools/gntcmenu1-layout.mjs; captures/gntcmenu1-layout-{1024,1600,2560}-{title,settings-tab0..4,confirm}.png
- Title at all 3 sizes: 6 items, 0 issues, rings=1, minFont 22.5/25.0/40.0 px, minHit 352x43 / 391x53 / 626x85. 0 page errors.
- Settings Display/Gameplay/Controls tabs: 0 issues at all 3 sizes (minFont 18/20/32 px).
- Audio tab: scroll container; my raw-rect test flagged rows below the fold, verified as scrolled-out, not clipped (see STEP 3 tabwalk in-view).
- Network tab @1024x576: hit targets 390x36, 305.8x36, "Check" 85x36 -> below the G1.1 40 px floor (ok at 1600/2560: 91.7x40 / 146.7x64).
- The only <14 px font found is an empty-text <input type=range> (13.33 px default), no readable type below floor.

## STEP 3 — navigation probe (G1.2) — DONE
Tools tools/gntcmenu1-nav.mjs + gntcmenu1-nav2.mjs; captures/gntcmenu1-nav.log, gntcmenu1-nav2.log
- Keyboard only: title walk, Enter opens settings, Q/E tabs, Esc back, Esc at root = no-op, Backspace = back. rings=1 on all 12 samples.
- Mouse only: hover moves logical focus, click opens, right-click = back, Back button exits. rings=1 on all 5 samples.
- Mocked gamepad only (navigator.getGamepads stub, standard mapping): stick down = 1 discrete step, d-pad 12/13 move, A opens, B backs, LB/RB switch tabs. rings=1 on all 9 samples.
- Esc from settings/saves/records/mp-menu/confirm/keep-display/farewell/expedition -> exactly one level (stack back to ["title"]). lobby: Esc opens a leave-confirm instead (MP screen, defensible) and app.back() then loops lobby<->confirm forever - noted, not this module.
- Every settings tab's ArrowDown cycle reaches every row and wraps: Display 7, Audio 12, Gameplay 5, Controls 3, Network 4 unique ids; focused row always inside the scroll box (in-view true).
- Focus restore on return: before/after = ap-title-settings (ok).
- Mash 6x Enter -> exactly one settings screen; mash 6x Esc -> title. 50 random nav actions: 0 ring violations, 0 traps, 0 page errors. 8x Esc at root: stays on title.
- Oddity: the ArrowDown cycle enters the tab strip at ap-tab-network (the LAST tab) rather than the selected tab, on every tab; "Back" is not in the vertical cycle on 4 of 5 tabs (Esc and mouse still work).

## RESUME NOTE (instance 2, 2026-09-23 21:20)
Previous instance stopped at 05:08 after running (unrecorded) display/pacing/state probes. `git log`: only
PROGRESS.md changed since (b6f8778, f257007 docs-only; `git diff HEAD -- src server` empty), so those logs
are still evidence for the current build v0.5.62. Audit of the unrecorded probes:
- captures/gntcmenu1-display.log (headless GPU harness) + gntcmenu1-pacing-headful.log + gntcmenu1-pacing2.log
  (display harness, dpr 1.5, machine was loaded by other agents then) — valid, recorded in STEP 4.
- captures/gntcmenu1-state.log — PROBE BUGS, not game bugs: (1) it booted `?fresh=1` and then `page.reload()`
  re-used `?fresh=1`, which wipes storage, so its "afterReload = all defaults" and "corrupt = no notice" rows
  are INVALID; (2) its Exit leg pressed Enter on the confirm dialog whose default focus is Cancel, so
  "farewellMs null" is INVALID. Keep/Revert rows are valid. Re-run as tools/gntcmenu1-state2.mjs (STEP 5).

## STEP 4a — display settings, evidence from instance 1 (valid) — DONE
Render scale (G1.4), headless GPU harness 1600x900 dpr1, captures/gntcmenu1-display.log:
| s | expected buffer | canvas.width x height | api drawingBuffer | ok |
|---|---|---|---|---|
| 0.5 | 800x450 | 800x450 | 800x450 | yes |
| 0.75 | 1200x675 | 1200x675 | 1200x675 | yes |
| 1.0 | 1600x900 | 1600x900 | 1600x900 | yes |
| 1.25 | 2000x1125 | 2000x1125 | 2000x1125 | yes |
| 1.5 | 2400x1350 | 2400x1350 | 2400x1350 | yes |
HUD/menu rects before vs after scale change: 7 vs 7 items, maxDelta 0 px. Slider by keyboard (ArrowLeft on
ap-display-renderScale): 1.0 -> 0.9, buffer 1600x900 -> 1440x810 (live preview, no Apply needed).
fps(0.5) vs fps(1.0), in camp, display harness, 3 interleaved 5 s samples (gntcmenu1-pacing2.log scaleFpsSummary):
0.5 = [102, 77.2, 64.3] med 77.2; 1.0 = [54.9, 44.2, 37.8] med 44.2 -> fps(0.5) >= fps(1.0) PASS (+75%).
Pixel detail: captures/gntcmenu1-scale-{0p5,0p75,1,1p25,1p5}.png (to be inspected in STEP 4b).
Fullscreen (headless, gntcmenu1-display.log fullscreenEnter/BrowserExit): enter -> fullscreenElement=HTML in
58 ms, setting=true; document.exitFullscreen() by the browser -> setting=false, fsEl=null, stack unchanged.
(Headless cannot show a window-size change; re-probed headful in STEP 4b.)
Frame limit, first pass in camp (pacing2, display harness, scale 0.5, median of 3 x 5 s, sim ticks/s median):
| vsync | limit | rendered fps | target | within 5%? | ticks/s |
|---|---|---|---|---|---|
| on | 30 | 30.0 | 30 | yes | 59.99 |
| off | 30 | 30.0 | 30 | yes | 59.98 (one run 19.4 fps / 41.4 ticks: load spike) |
| on | 60 | 59.8 | 60 | yes | 59.99 |
| off | 60 | 58.8 | 60 | yes (-2%) | 60.11 |
| on | 120 | 103.5 | min(120,cap) | cap unclear (unlimited run gave 63.9) | 59.97 |
| off | 120 | 86.3 | min(120,cap) | cap unclear | 59.99 |
| on | 0 (unl.) | 63.9 | cap | - | 59.95 |
| off | 0 (unl.) | 63.8 | cap | - | 60.09 |
Machine was shared with other agents at 05:00 (rAF only ~60-140 Hz on a ~165 Hz panel), so the 120/unlimited
rows are re-measured on a quiet machine in STEP 4b.
Copy observed (pacing2 'copy' rows): V-Sync Off -> "Your device renders about 52 fps here — uncapped can't go
faster than your GPU" while frameStats().renderedFps = 68.9 read ~1.5 s earlier (not same instant; re-measured
in STEP 4b with tools/gntcmenu1-copy.mjs). V-Sync On + Unlimited -> "Rendering 53 fps · Your display caps this
at ~167 fps" (the cap note shows though the display is not what binds — misleading, advisory).

## STEP 5 — persistence / corrupt / throwing storage / keep-revert / exit (G1.8, G1.9, G1.10) — DONE
Tool tools/gntcmenu1-state2.mjs (GPU harness, autoplay), log captures/gntcmenu1-state2.log; keep/revert rows
from instance 1 captures/gntcmenu1-state.log (valid).
- Store: 27 keys under localStorage `echoes.settings`. Changed through the REAL UI by keyboard: render scale
  1.0 -> 0.8 (4x ArrowLeft), V-Sync On -> Off, limit Unlimited -> 30, Show FPS Off -> On; Esc from Settings
  opened `keep-display` (stack title,settings,keep-display), Enter = Keep (default focus) -> stack [title].
  The other 23 keys set to non-default values through the store.
- Reload through a PLAIN url: **0 of 27 keys differ** (diffs = []); loadReport {status ok, storage
  localStorage}; effects re-applied on boot: canvas 1280x720 (= 1600x900 x 0.8), frameStats vsync=false,
  limit=30, source 'uncapped'; fullscreen reads false with fullscreenElement null. PASS.
- Corrupt JSON `{"broken":,,,` -> all keys = defaults, loadReport {status recovered, error "parse: Unexpected
  token"}, backup key `echoes.settings.corrupt` written, toast "Settings were reset — the saved file was
  unreadable" (captures/gntcmenu1-corrupt2.png) and the same note in the Settings footer, 0 page errors. PASS.
- Valid JSON with hostile values -> recovered to defaults ("bad shape"), canvas 1600x900, 0 page errors. PASS.
- localStorage getter that throws SecurityError -> boots to title, storage 'memory', footer note "Settings can't
  be saved in this browser mode", live change still works (0.5 -> canvas 800x450), 0 page errors. PASS.
- Keep/Revert (instance 1): render scale 1.0 -> 0.85 (1360x765) then leave Settings -> `keep-display`, default
  focus Keep. Revert -> 1.0 and canvas 1600x900; Keep -> 0.85 and 1360x765; no input -> dialog gone after
  0.9 + 9.2 = ~10.1 s, 1.0 and 1600x900. PASS for render scale (fullscreen leg: STEP 4b).
- Exit: title Exit -> confirm "Exit Echoes? Your progress and settings are saved." default focus **Cancel**
  (safe default, benchmark D4), Left -> Exit, Enter -> farewell card in **323 ms** (<= 500 ms), text "Thanks for
  playing Echoes. Your browser keeps this tab open — close it whenever you like. Your progress is saved."
  (captures/gntcmenu1-farewell2.png), music state menu -> silence (2 s crossfade; music tap still -24 dB RMS
  1.5 s later, mid-fade). Esc on the farewell -> title (stack [title]), focus restored to Exit, render scale
  0.75 + canvas 1200x675 intact, music back to menu. 0 page errors. PASS.

## STEP 4b — fullscreen on the display harness (headful, dpr 1.5, window 1586x806, screen 1707x960) — DONE
Tools tools/gntcmenu1-fs3.mjs, gntcmenu1-fs4.mjs, gntcmenu1-fs5.mjs; logs captures/gntcmenu1-fs{3,4,5}.log.
(tools/gntcmenu1-disp2.mjs --part=fs was a first attempt with a flawed sequence; its log is superseded.)
| check | measured | gate | result |
|---|---|---|---|
| ArrowRight on Display mode -> fullscreenchange (in-page, from keydown) | 240.8 / 21.7 / 20.3 ms (3 runs) | <= 500 ms | PASS |
| canvas after enter | css 1707x960 = screen, buffer 2560x1440 (expected 2561x1440, +-1) | canvas = window | PASS |
| browser leaves (document.exitFullscreen outside the UI) | setting false, row "Windowed", no dialog, stack unchanged, canvas 1586x806 / 2379x1209 | flip to Windowed | PASS |
| enter then leave Settings -> keep-display | "Keep these display settings? • Fullscreen — Reverting in 10 s [Keep][Revert]", default focus Keep (captures/gntcmenu1-fs4-dialog-keep.png) | 10 s countdown | PASS |
| timeout | dialog closed after 10.02 s, fullscreenElement null 19 ms later, setting false, canvas back to window | restores | PASS |
| Revert | fullscreenElement null 16 ms after confirm | restores | PASS |
| Esc/back on dialog | = Revert, fullscreenElement null 153 ms later | - | PASS |
| Keep | stays fullscreen 2560x1440, stack [title] | keeps | PASS |
| leave via UI (ArrowLeft -> Windowed) | fullscreenchange 156 ms after key, then Back -> stack [title], NO dialog | no dialog | PASS |
| Alt+Enter on title / again | enter (21 ms), exit (157 ms); in play keyboardLock true | toggles | PASS |
Harness artifact (not charged to the game): in headful fullscreen, only 1 of 6 CDP key presses reached a window
capture listener installed before any game script (gntcmenu1-fs5.log deliveryInFs) — the transition drops
synthetic input at the browser layer; after exit 4/4 were delivered. Every leg above was re-run driving
non-gesture steps with __echoes.app.press.

## STEP 6 — input -> visual response (G1.3) — DONE
Tools tools/gntcmenu1-resp.mjs (logs captures/gntcmenu1-resp.log = run 1, gntcmenu1-resp2.log = run 2 with
listeners installed before game scripts) and tools/gntcmenu1-hover.mjs (captures/gntcmenu1-hover.log).
GPU harness 1600x900, title screen, 20 presses per source.
| source / window | instrument | n | p50 | p95 | max | gate p95<=50 / max<=100 |
|---|---|---|---|---|---|---|
| keyboard, first 0.2-4.7 s after the title is interactive (run 3, hover.log) | rAF poll of app.focus() from keydown | 20 | 43.6 | 104.4 | **195.1** | **FAIL** |
| keyboard, first ~5 s after title (run 2, resp2 keyboardEarly) | app.responses() | 20 | 33.0 | 103.4 | **163.4** | **FAIL** |
| keyboard, first ~5 s after title (run 1, resp.log) | app.responses() | 20 | 54.2 | 120.1 | **206.0** | **FAIL** |
| keyboard, after 5 s idle on the title (run 2) | app.responses() | 20 | 27.8 | 32.1 | 33.2 | PASS |
| keyboard, after 5 s idle (run 2) | keydown -> first rAF after DOM mutation | 20 | 17.5 | 21.6 | 22.7 | PASS |
| gamepad (mock, d-pad 12/13) | app.responses() | 20 | 25.8 | 30.0 | 30.7 | PASS |
| gamepad | independent | 20 | 20.8 | 23.9 | 25.8 | PASS |
| mouse hover, title | mousemove -> frame where app.focus() changed | 19 | 25.6 | 50.2 | 50.2 | PASS (edge) |
| mouse hover, Settings rows | same | 11 | 23.7 | 56.9 | 56.9 | p95 edge |
| mouse click Settings -> settings screen | mousedown -> frame with stack 'settings' | 6 | 31.4 | 60.3 | 60.3 | PASS |
Early-window long tasks (PerformanceObserver): 57 ms at +0.59 s and 66 ms at +2.57 s after the title became
interactive; the slow presses sit at +0.23 s (75 ms), +0.96 s (89), +1.52 s (195), +3.29 s (104).
Finding: the first ~4 s on the title — exactly when a player starts pressing keys — have 100-200 ms menu
hitches, reproduced 3/3 runs; steady state is ~30 ms. app.responses() never records mouse HOVER (only click
confirm, source 'mouse' 28-49 ms): 'responsesSources' = {keyboard: 20} after 31 hovers, so the gate's own
instrument cannot show the mouse source for movement; measured independently above instead.
Builder claim (build-M1.md: "keyboard p95 48.5 max 48.5") holds only for the settled title.

## STEP 7 — journey, core loop, legacy params (G1.11, benchmark D) — DONE
Tools tools/gntcmenu1-journey.mjs (captures/gntcmenu1-journey.log, -camp.png, -reward.png, -backtitle.png) and
tools/gntcmenu1-newgame-save.mjs (captures/gntcmenu1-newgame-save.log, gntcmenu1-title-with-save*.png).
- Fresh profile: title default focus New Game (no save; Load Game greyed "No saved games yet"). Enter ->
  app.state 'playing' in **188.5 ms**, player moving under held W at **188.5 ms** (p0 z 1.00 -> 0.56) — gate
  <= 1.0 s PASS; music 'camp'; stack [].
- Real input core loop from that session: hold W -> inPortal at tick 222, E -> combat room 1 act 1 at tick 238
  (fresh profile: no picker, PLAN §4.1 rule 2), killAllEnemies -> phase 'reward' at tick 400. PASS.
- Esc -> pause [Resume, Settings, Save Game, Load Game, Save & Quit to Title, Quit to Title "Without saving"];
  Quit -> confirm "Quit to the title? Anything since the last save is lost." default focus **Keep Playing**;
  Quit -> title, stack [title], tick 0, Continue row "Autosave · The Hollow Wood · Room 1 · just now".
  On the title after the run: app frames/s 45.7 = rAF/s 45.7 (one render loop), music players 1 (no doubled
  audio). New Game again -> fresh world: wallet 0, runs 0, run inactive, party at full HP; second core loop
  portal 196 -> combat 210 -> reward 432. PASS (D1, D6).
- Fresh boot WITH a save: default focus **Continue** (benchmark A3 met). Title after quitting a run focuses the
  row you came from (New Game) — acceptable (B7).
- New Game while an autosave exists: starts immediately, no "abandon/overwrite?" prompt; the autosave is still
  listed unchanged right after New Game and after the new run enters room 1 (save module's domain — advisory).
- Legacy boots, 6 s after load: ?menu=0&seed=7, ?seed=5, ?room=kill_all, ?room=defend, ?variant=2 -> playing,
  camp, no title, ticking; ?run=1 -> run active combat room 1; ?scene=arena -> arena-v1;
  ?scene=arena&room=kill_all / defend -> wave room (waves [4,5,4] / defend waystone 150 HP);
  ?seed=7&scene=arena&room=kill_all&freeze=1 -> tick 0 frozen; ?seed=5&menu=1 -> title, tick 0. 0 page errors.
- ?seed=7&menu=0 core loop by real input: portal 178 -> combat 190 -> reward 351. PASS.

## STEP 4c — frame limit / V-Sync re-measure at render scale 0.5 (instance 2, display harness; recorded by instance 3)
Tools tools/gntcmenu1-pace4.mjs (interleaved) + the pace3 run; logs captures/gntcmenu1-pace3-s05.log, gntcmenu1-pace4-s05.log.
Display harness = headful Chrome, dpr 1.5, buffer 1189x604 at scale 0.5, panel rafHz 164-170 (frameStats displayHz 163.9-169.5).
The machine was shared with other agents throughout: frame work p50 swung 3.1-11.7 ms between conditions, so the device cap moved.
| vsync | limit | rendered fps (median of 3 x 5 s) | rafHz at sample | ticks/s | verdict vs G1.7 |
|---|---|---|---|---|---|
| on | 30 | 30.0 (30/30/30) | 158-162 | 59.96 | PASS |
| off | 30 | 30.0 (30/30/30) | 158-165 | 59.99 | PASS |
| on | 60 | 60.0 (60/60/52.3 load spike) | 165 | 59.97 | PASS |
| off | 60 | 60.0 (60/60/60) | 165 | 59.98 | PASS |
| on | 120 | 120.0 (120/120/120), work 5.4 ms, device could do 165 | 165 | 60.10 | PASS (cap honoured with headroom) |
| off | 120 | 103.3 (106/103/94), work 9-10 ms = device-bound ~100 | 84-101 | 60.07 | PASS vs min(120, cap); copy "your device renders about 107 fps here, below the limit" (pace4 copy) |
| on | 144 | 75.6 (pace3, work 10 ms) / 138.2 (pace4, rafHz 150.9) | 76 / 151 | 60.0 | PASS vs min(144, cap): 138.2 = 96% of 144 |
| off | 144 | 77.3 / 136.9 (pace4, rafHz 139.8) | 72-78 / 140 | 60.14 | PASS vs cap |
| on | 0 | 73.7 / 94.2 / 129 (= rafHz 73.6 / 89.6 / 139.4 within +-5%) | | 59.99 | source raf |
| off | 0 | 73.1 / 98.4 / 90 (rafHz 75 / 99.9 / 116.1) | | 60.08 | source uncapped |
G1.6 reading: On -> source raf, fps tracks rafHz (94.2 vs 89.6 is a 5% window mismatch under load, all other pairs <= 2%). Off -> source uncapped
and the honest row "Your device renders about N fps here — uncapped can't go faster than your GPU" with N within 2% of frameStats().renderedFps read in
the SAME evaluate (98.9 -> "about 100", 78.7 -> "about 80", 81.6 -> "about 81"; pace4 copy rows) — case (b) of the gate. Case (a) (>= 1.3 x rafHz) was
never reachable: even at scale 0.5 frame work p50 stayed 6.5-11 ms >= 0.8 x (1000/167) = 4.8 ms on this shared machine, so Off never rendered faster
than On; the copy says so instead of pretending. Sim 59.8-60.2 ticks/s in every row except two concurrent-load spikes (52.3, 41.4 in one 5 s sample each).
Copy oddity kept as advisory: V-Sync On + Unlimited shows "Rendering 95 fps · Your display caps this at ~170 fps" while the GPU (not the display) is what binds.

## STEP 8 — instance 3 sweep (2026-09-24, v0.5.62, src/server unchanged since instance 1: git diff HEAD -- src server is empty)
- Fresh smoke: captures/gntcmenu1-title-now.png (cert-capture, plain URL, 1600x900): loading card "Ready · Press any key or click", tick 0, version 0.5.62, errors false.
- Render-scale pixel detail (G1.4 "pixel detail"): tools/gntcmenu1-sharp.mjs, Laplacian variance of the camp backdrop box 500,250,700,450 in captures/gntcmenu1-scale-*.png:
  0.5 = 68.0, 0.75 = 101.7, 1.0 = 276.3, 1.25 = 172.0, 1.5 = 201.2 (unique colours 45.3k / 47.5k / 47.6k / 46.5k / 46.1k). Detail rises monotonically to native; 1.25/1.5 are
  smoother than 1.0 (supersampling removes aliasing), i.e. every step measurably changes the image, matching the "sharper UI, softer 3D" / "supersampled" copy.
- Response re-run (G1.3), tools/gntcmenu1-resp.mjs -> captures/gntcmenu1-resp3.log: keyboard in the first ~5 s after the title: p50 36.9 / p95 86.0 / max 130.9 ms
  (values 61.6, 130.9, 24.5, 51.2, 86.0, ...) = 4th consecutive run failing p95 <= 50 / max <= 100. Settled title: keyboard p50 33.8 / p95 40.2 / max 41.9, gamepad
  25.2 / 27.9 / 28.7 (app.responses()), independent keyboard 21.0 / 25.8 / 27.4, gamepad 20.3 / 22.7 / 22.8; Enter -> settings screen 40-57.5 ms (5 opens).
  (The resp.mjs "independent mouse" 270 ms figure is an instrument artifact — it pairs a mousemove with the NEXT hover's mutation; the direct hover measure in
  captures/gntcmenu1-hover.log, p50 25.6 / p95 50.2 ms on the title, 23.7 / 56.9 in Settings, is the cited mouse number.)
- Layout re-run (G1.1), tools/gntcmenu1-layout.mjs -> captures/gntcmenu1-layout2.log: title 0 issues at 1024/1600/2560 (minFont 22.5/25.0/40.0, minHit 352x43.5 /
  391.6x53.3 / 626.6x85.3); Display/Gameplay/Controls/confirm 0 issues at all sizes; Audio "issues" = rows below the fold of its scroll box (verified scrolled-out in
  STEP 3), Display's one "issue" = the empty-text input type=range at 13.33 px; **Network tab @1024x576: HIT 390x36, 305.8x36, "Check" 85x36 < 40** (1600: 91.7x40,
  2560: 146.7x64 ok). Reproduced twice (04:33 and today).
- Final sweep tools/gntcmenu1-final.mjs -> captures/gntcmenu1-final.log + gntcmenu1-final-{loading,title,settings-title,confirm,farewell,pause,settings-pause}.png,
  gntcmenu1-final-rects.json (GPU harness, no autoplay flag):
  - G1.13 gesture hook: service('audio').unlock patched to count. Key as the first gesture on the loading card -> 1 call, audio locked -> running; click on the title
    -> +1, touch on the title -> +1; fresh pages with click / touch as the FIRST gesture -> unlock called (2 / 3 calls), audio running, title reached. 0 missed. PASS.
  - Key held through a window blur (ArrowDown down, blur, focus, 1.6 s of samples): focus stayed on "Multiplayer" (1 distinct value), no runaway repeat. PASS (D5).
  - Resize with Settings open 1600x900 -> 1024x576 -> 2560x1440 -> 1600x900: 18/18 nav items inside the viewport each time, rings 1, canvas css = buffer = window
    (1024x576 / 2560x1440 / 1600x900 at scale 1), stack unchanged, focus kept on "Resolution scale"; captures/gntcmenu1-final-settings-resized-1024.png. PASS (E3).
  - Exit via the real Exit row click: confirm default focus Cancel; Left + confirm -> farewell in 344 ms; Return -> stack [title], focus restored to the row held before. PASS.
  - Settings from the pause menu in play (?menu=0&seed=7, Esc -> [pause] -> settings): sim paused (tick 275 -> 275), render scale 0.75 applied while paused
    (buffer 1600x900 -> 1200x675); back to play -> stack [], 62 ticks in the next second, buffer still 1200x675. 0 page errors on every page. PASS (C12).
- G1.12 palette, tools/gntcmenu1-palette.mjs (every .ap-plate / [data-nav] rect -> tools/analyze.mjs --box) -> captures/gntcmenu1-palette.log:
  | screen | rects | Ember (5-25 deg) | heal | violet | whole frame Ember |
  |---|---|---|---|---|---|
  | loading | 1 | 0 | 0 | 0 | 0 |
  | title | 6 | 0 | 0 | 0 | 23 (allowance <= 1047) |
  | settings (from title) | 19 | 0 | 0 | 0 | 0 |
  | confirm | 9 | 0 | 0 | 0 | 0 |
  | farewell | 2 | 0 | 0 | 0 | 0 |
  | pause (INT) | 7 | 0 | 0 | 0 | 10 |
  | settings (from pause) | 20 | 0 | 0 | 0 | 0 |
  PASS. Note: the harness-only path that opens Settings directly over UNPAUSED play (captures/gntcmenu1-pace4-copy-off-0.png) lets the monolith ring bleed
  through the translucent panel: 34 violet px in the panel box. A player reaches Settings through Pause, which dims the backdrop (0 px). Advisory.
- Menu audio feedback (benchmark B9), tools/gntcmenu1-cues.mjs -> captures/gntcmenu1-cues.log: __echoes.audio.cueLog after scripted and real presses on the title:
  down/up -> ui_move (-16 dB, bus ui), confirm -> ui_confirm (-12), tab -> ui_tab (-14), back -> ui_back (-14); music state menu (theme wood, 3 layers, 1 player).
  Esc at the title root (a no-op) still plays ui_back — advisory.
- Reset to defaults (benchmark C10), tools/gntcmenu1-reset.mjs -> captures/gntcmenu1-reset.log + gntcmenu1-reset-confirm.png: scale 0.8 / limit 30 / FPS on ->
  Reset opens a confirm (stack [title,settings,confirm], default focus Cancel); Cancel keeps 0.8/30/on and buffer 1280x720; OK -> 1.0 / Unlimited / off, buffer
  1600x900, toast "Display settings reset to defaults". PASS.

## BENCHMARK SCORECARD (checklist of STEP 1, scored after inspection)
| item | result | evidence |
|---|---|---|
| A1 logo + grouped primary actions | met | gntcmenu1-layout-{1024,1600,2560}-title.png |
| A2 short root list (4-6) | partially | 6 rows without a save, 7 with one (Continue · New Game · Load · Multiplayer · Settings · Records · Exit) |
| A3 safe default focus with a save | partially | fresh boot with a save: Continue focused (newgame-save.log titleReloadWithSave); after Quit to Title: New Game focused (title-with-save.png) |
| A4 unavailable entries greyed with reason | met | "Load Game — No saved games yet", aria-disabled, skipped by the cursor |
| A5 version string visible | met | "v0.5.62" in the hint bar at all three sizes |
| A6 16:9 low/high resolution layout | met | layout2.log: title 0 issues, minFont 22.5 px at 1024x576 |
| A7 living presentation | met | live camp backdrop (fire, fireflies), music state menu with 3 layers (cues.log meta) |
| B1 keyboard-only | met | nav.log; Esc/Backspace back, Esc at root no-op |
| B2 mouse-only, hover = logical focus | met | nav2.log, hover.log (focus follows hover in 25.6 ms p50); right-click = back |
| B3 gamepad-only, discrete stick | met | nav2.log: stick down = 1 step, d-pad, A/B, LB/RB tabs (mocked navigator.getGamepads) |
| B4 exactly one focus indicator | met | rings = 1 on all 26 samples + 50 random actions; amber ring + diamond pointer + plate lift |
| B5 no focus trap, Esc always one level | met | nav2.log (8 screens); lobby loop belongs to the MP module |
| B6 consistent wrap | met | every settings tab cycle wraps (Display 7, Audio 12, Gameplay 5, Controls 3, Network 4) |
| B7 focus restore on return | met | final.log afterSettingsBack / afterFarewell, state2.log Exit leg |
| B8 <= 100 ms input-to-visual | partially | settled 30-42 ms; first ~4 s on the title 86-206 ms max, 4/4 runs (resp/resp2/hover/resp3) |
| B9 move / confirm / back sounds | met | cues.log: ui_move, ui_confirm, ui_tab, ui_back distinct |
| C1 render scale changes pixels | met | display.log buffers exact 0.5-1.5; sharp lapVar 68 -> 276; HUD rects delta 0 |
| C2 fullscreen really changes the window | met | fs3-5.log: enter 20-241 ms, canvas = screen 2560x1440 |
| C3 fullscreen stays truthful on external exit | met | fs3.log browser exit -> Windowed, no dialog |
| C4 V-Sync measurably changes cadence / honest if not | partially | source raf -> uncapped, honest GPU-bound copy; presented cadence not different on this machine (browser never tears) |
| C5 frame limit 30/60/120/unlimited within % | met | STEP 4c table; sim 60 ticks/s |
| C6 instant preview + protected mode change | met | live preview; keep-display 10 s countdown, default Keep, fs4-dialog-keep.png |
| C7 persistence, applied before first frame | met | state2.log: 27/27 keys, canvas 1280x720 on boot, limit 30 uncapped |
| C8 corrupt/absent data -> defaults, no crash | met | corrupt JSON, hostile JSON, throwing storage: 0 errors, toast + footer + backup key |
| C9 current value shown as text | met | 100%, "1600 x 900", Windowed, On, Unlimited, "Rendering 64 fps" |
| C10 reset to defaults | met | reset.log (behind confirm, Cancel default) |
| C11 platform-honest labels | met | "Fullscreen (browser)", "lasts for this visit", V-Sync GPU-bound copy, farewell card |
| C12 in-run settings do not break the run | met | final.log settingsInPlay / afterBackToPlay |
| D1 New Game = clean state | met | journey.log: wallet 0, runs 0, full HP, second core loop |
| D2 Continue distinct, no silent overwrite | partially | Continue row with metadata; New Game over an autosave starts with no prompt (autosave still listed) |
| D3 honest Exit | met | confirm -> window.close attempt -> farewell 323-344 ms with truthful copy |
| D4 confirm before losing progress | partially | Quit to Title and Exit confirm (Cancel / Keep Playing default); New Game over an autosave does not |
| D5 focus loss does not strand input | met | final.log blurHeldKey |
| D6 title fully functional after a run | met | journey.log: one render loop (45.7 = rAF), 1 music player, menus work |
| E1 no page errors | met | 0 in every probe (14 logs) |
| E2 mash-safe | met | nav2.log 6x Enter -> one settings, 6x Esc -> title |
| E3 resize with a menu open | met | final.log resizeOpen x3 |
Score: 31 met / 6 partially / 0 not met of 37.

## PLAN.md M1 GATES (literal)
| gate | result | numbers |
|---|---|---|
| G1.1 layout | **NOT MET** | Network tab @1024x576 hit targets 390x36 / 305.8x36 / 85x36 < 40 px (layout2.log); everything else 0 issues at all three sizes |
| G1.2 navigation | met | STEP 3 |
| G1.3 response | **NOT MET** | first ~4-5 s on the title: keyboard p95 86-120 / max 131-206 ms in 4 runs (gate p95 <= 50, max <= 100); settled p95 40.2 / max 41.9 |
| G1.4 render scale | met | buffers exact at 0.5/0.75/1/1.25/1.5, HUD delta 0, fps(0.5) 77.2 >= fps(1.0) 44.2, lapVar 68 -> 276 |
| G1.5 fullscreen | met | 20-241 ms, browser exit -> Windowed, canvas = window each time |
| G1.6 V-Sync | met (case b) | rafHz 164-170 headful; On raf fps <= rafHz x 1.05; Off uncapped + honest copy within 2% of renderedFps |
| G1.7 frame limit | met | 30/60 exact, 120 exact with headroom, 144/unlimited at the cap with the "below the limit" note; 60 ticks/s |
| G1.8 persistence | met | 27/27 keys, fullscreen session-only, corrupt -> recovered + toast, throwing storage -> memory |
| G1.9 keep/revert | met | scale and fullscreen: timeout 10.0-10.1 s, Revert, Keep, Esc = Revert; leaving FS no dialog |
| G1.10 exit | met | farewell 323 / 344 ms, Return -> title with settings intact, music -> silence |
| G1.11 journey | met | controllable 188.5 ms; portal 222 -> combat 238 -> reward 400; 11 legacy boots |
| G1.12 palette / errors | met | 0 reserved-band px in 64 plate rects over 7 screens; title backdrop Ember 23 px; 0 page errors |
| G1.13 gesture hook | met | key / click / touch each reach unlock, 0 missed |

## BUILDER CLAIM AUDIT (docs/gauntlet/build-M1.md)
- "G1.1 0 issues at 1024x576 / 1600x900 / 2560x1440" — true for M1's own tabs; false for the Settings screen as shipped: the M5b Network tab has 36 px controls at 1024x576.
- "G1.3 keyboard p50 25 / p95 48.5 / max 48.5" — holds only on a settled title; the first seconds a player actually presses keys fail the gate in 4/4 critic runs.
- "G1.6 case (b) on this iGPU with honest copy", "G1.7 30/60 exact, 120/144 at GPU cap" — re-measured, hold (120 also exact when headroom existed).
- G1.4/5/8/9/10/11/12/13 claims — re-measured, hold.

## VERDICT: FAIL (2 must-fix, 8 advisories)
Must-fix:
1. G1.3 / benchmark B8 — 100-206 ms menu hitches in the first ~4 s after the title becomes interactive (long tasks 57 + 66 ms at +0.6 s / +2.6 s), reproduced
   in 4 runs; steady state is 30-42 ms. Repro: tools/gntcmenu1-resp.mjs or gntcmenu1-hover.mjs (keyboardEarly / keyboardEarlyAged rows).
2. G1.1 — Network tab controls 36 px tall at 1024x576 (player-name field 390x36, server field 305.8x36, Check 85x36) vs the 40 px floor. Repro:
   tools/gntcmenu1-layout.mjs, 1024 section. Owner by PLAN section 2.1: M5b (src/ui/menu/tabs/network.js) inside the M1 settings frame.
Advisories: A2/A3 root list and post-run New Game focus; D2/D4 New Game over an autosave without a prompt (save module); V-Sync On + Unlimited "display caps"
copy when the GPU binds; vertical cycle enters the tab strip at the LAST tab and skips "Back" on 4/5 tabs; ui_back plays on a root-level Esc that does nothing;
harness-only unpaused in-play Settings shows 34 violet px through the panel; app.responses() never records mouse hover (only clicks); lobby Esc <-> confirm loop (MP).
