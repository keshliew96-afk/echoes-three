STATUS: PARTIAL
(verdict pending)

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
