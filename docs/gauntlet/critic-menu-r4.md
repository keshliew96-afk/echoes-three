STATUS: COMPLETE
VERDICT: FAIL - 1 must-fix (MENU-R4-F1: Esc inside a Settings > Network text field commits the half-typed value and closes Settings - "ws://12" saved as "ws://0.0.0.12", breaking Multiplayer). All 3 r3 must-fix confirmed fixed (dev + prod). M1 gates 12/13 PASS, G1.3 PARTIAL (load-bound, A/B vs the r3 build identical); benchmark 23 met / 4 partial / 1 not met of 28; 0 page errors; core loop + 10 legacy boots pass.
# Critic — MENU (Main Menu & Screen Settings) — Gauntlet round 4

Started 2026-09-26. Build under test: HEAD 9e7913c (branch gauntlet).

## Steps log
- [step 0] checkpoint file created.
- [step 1] context read (PLAN §0-§1.6, §3.1-§3.3, §5, §6.1-§6.7, §7 M1 + INT, §8; TESTING M1; critic-menu-r3 verdict FAIL F1/F2/F3; fix-M1-r3 claims all three fixed v0.5.95-v0.5.100). No Echoes capture viewed yet.

## 1. Blind benchmark checklist (written BEFORE inspecting any Echoes capture)

Reference systems: Hades (Supergiant), Celeste, Hollow Knight, Slay the Spire, and shipped Unreal (UGameUserSettings) / Unity (Screen + QualitySettings) settings conventions. Each item is concrete and testable; where a native feature cannot exist in a browser the truthful browser equivalent is the test.

| # | Benchmark behaviour (source) | Test on Echoes |
|---|---|---|
| B1 | Arrival: one item is focused with no mouse; with a save the first/focused item is Continue (Hades, StS "Continue", HK profile select) | cold load, fresh and with a save: DOM focus + pixels |
| B2 | No dead buttons: Load/Continue hidden or disabled with a reason when nothing is saved (StS greys "Continue") | empty profile |
| B3 | Keyboard parity: arrows + WASD, Enter/Space confirm, Esc/Backspace back; lists wrap; Left/Right change a value in place (Celeste options) | real key presses on every screen |
| B4 | Gamepad parity: D-pad + stick (deadzone, ~400 ms initial repeat then ~80-100 ms), A confirm, B back, LB/RB tabs, Start pause (Hades, Celeste, HK) | mocked navigator.getGamepads |
| B5 | Mouse parity: hover focuses (one highlight, no keyboard/mouse double highlight), click activates, right-click/Back button returns, wheel scrolls long lists | real mouse events |
| B6 | Back is always exactly one level; title root Back is a no-op (HK, Celeste) | Esc/B/right-click from every depth |
| B7 | Returning from a sub-menu restores focus on the item that opened it (Celeste, HK) | focus id after back |
| B8 | Exactly one visible focus indicator at all times, also after the mouse leaves every item (Hades) | ring count samples |
| B9 | The vertical cursor walks rows in reading order, never lands on hidden/unselected content, and gets back to the top (Celeste options, Unreal settings) | Down/Up cycles per settings tab |
| B10 | Display changes preview instantly (Unreal/Unity apply live) | drawing buffer / fullscreenElement right after the change |
| B11 | Keep/Revert confirmation with a countdown (Windows/Unreal ~10-15 s) for resolution-like changes; timeout and Revert restore both value and effect; Keep keeps | keep-display dialog timing + effects |
| B12 | Resolution scale shows the resulting render resolution, lowers 3D detail only (UI stays crisp), and raises fps when lowered (Unreal ScreenPercentage) | buffer size, Laplacian detail in a 3D box, HUD rects, fps |
| B13 | Windowed/Fullscreen reflects the real state; an external exit (Esc/F11) re-syncs the menu; resizes never stretch the canvas | fullscreenElement, fullscreenchange, canvas vs window |
| B14 | V-Sync On never presents above refresh; Off is uncapped; the label says what the platform really does | scheduler source + cadence + copy |
| B15 | Frame limit 30/60/120/144/Unlimited caps rendered fps within a few %; game speed unaffected | rendered fps (independent counter) + sim ticks/s |
| B16 | Settings persist across restart; a corrupt/missing config regenerates defaults without a crash and tells the player (Unreal .ini regen, Unity PlayerPrefs) | reload, corrupt JSON, throwing storage |
| B17 | Reset to defaults per section behind a confirmation | Reset button |
| B18 | Exit asks for confirmation, then quits (browser: honest equivalent, no fake quit) | Exit flow |
| B19 | Menu input answers within 1-3 frames (<= 50 ms) | input -> paint latency |
| B20 | Layout holds from 720p-class to 4K: text scales, nothing clipped or overlapping, readable minimum type | DOM rects + pixels at 1024x576 / 1600x900 / 2560x1440 |
| B21 | Every option has a description/help line (Hades, Unreal-based games) | sub-lines per display row |
| B22 | Focus loss auto-pauses single-player (Celeste, HK) | blur/hidden during play |
| B23 | Button-prompt glyphs follow the last-used device on every screen (Hades, Celeste) | hints after pad vs key input |
| B24 | Title -> gameplay is a short fade, controllable within ~1 s, no hitch (Hades, Celeste) | New Game -> movement latency |
| B25 | Settings reachable from the in-game pause menu with the same values; changes apply to the running game (all four) | pause -> Settings |
| B26 | Esc/Start pauses from gameplay; Resume returns to exactly the same state (StS, Hades) | pause/resume |
| B27 | Leaving Settings with a pending display change never silently commits it (Unreal "keep changes?") | leave tab / close Settings |
| B28 | Text fields (player name / server address) take typing, Enter commits, Esc cancels/backs, and the menu cursor never gets stuck inside them | Network tab |
- [step 2] smoke: `node tools/cert-capture.mjs shot gntcmenu4-smoke --settle 4000 --timeout 180000` exit 0, 0 PAGEERROR, version 0.5.124, console only ANGLE X3595/X4000; captures/gntcmenu4-smoke.png = loading card "ECHOES / Ready / Press any key or click". Probe tools: copies of the r3 critic probes renamed tools/gntcmenu4-*.mjs (outputs gntcmenu4-*), plus new ones below.
- [step 3] G1.1 layout, fresh profile, 3 sizes x 15 screens (tools/gntcmenu4-layout.mjs -> captures/gntcmenu4-layout.log, gntcmenu4-layout-<w>-<screen>.png/.json; GPU harness):
  | size | screens | rect issues (outside / overlap / hit<40 / not hit-testable / ring!=1) | min item text | min hit | notes |
  |---|---|---|---|---|---|
  | 1024x576 | 15 | 0 on 14 screens; levels: 3 "font 13.3" = UA font of the card `<button>` wrappers (visible text min 13.5 "Begins with the starting kit") | 16.5 (title/settings/pause) | 42 | levels sub-lines 13.5-14.25 px < 14 floor (CAMPAIGN screen) |
  | 1600x900 | 15 | same | 18.33 | 46.7 | levels min text 15.0 < 18 floor |
  | 2560x1440 | 15 | same | 29.33 | 74.7 | levels min text 24.0 |
  Pixels viewed: 1024 title (logo, tagline, 6 rows, hints bottom-right, nothing clipped), 1024 Display tab (5 rows + measured line), 1024 Network tab, 1024 levels. `__echoes.app.focus()` returns null on the levels screen although the Level I card visibly carries the ring (debug-API gap, advisory). The Settings Back button carries a permanent 1 px amber border (captures/gntcmenu4-zoom-back.png) next to the 2 px focus ring - distinguishable (thinner, no glow/lift), advisory. The script's "keep-display" snap did not open the dialog: after Q/E tab switches the cursor now sits on the tab stop (new r3-fix ring), so ArrowLeft changed tab instead of the scale - probe artifact; Keep/Revert measured separately in step 6.
- [step 4] r3 must-fix re-measure (layout): 
  - MENU-R3-F3 (title with a save) tools/gntcmenu4-titlesave.mjs (rewritten: 2-D overlap of every title text box vs every row, viewport containment, lower-edge hit test per row) -> captures/gntcmenu4-titlesave.log + -titlesave-<w>.png at 1024x576 / 1152x648 / 1280x720 / 1600x900 / 2560x1440: 0 issues at every size; 1024: Continue 145.1-234.7 ... Exit 471.9-513.9 (x 90-442.5), hints at x 734-988 y 526.8 (bottom-right), logo top 14.6, focus Continue, ring 1, 0 page errors. Pixels (1024) confirm: nothing overlaps. FIXED.
  - MENU-R3-F1 (run pause rows) tools/gntcmenu4-clip.mjs -> captures/gntcmenu4-clip.log, -clip-<w>-pause-run.png: 1024x576 7 rows one-line (42 px), text over 0, cut 0, list scrollH 339 = clientH 339; 1280 / 1366 / 1600: 0 clipped rows; after 6x Down focus pz-quit with 0 cut. FIXED. Cosmetic: at 1024x576 the Resume focus ring's outer top line is 1 px thinner than its sides (scroll-box top y 137 = ring top; captures/gntcmenu4-zoom-pause-top.png) - advisory.
- [step 5] G1.2 navigation (tools/gntcmenu4-nav.mjs -> captures/gntcmenu4-nav.log, -nav-pad-title.png, -nav-pad-settings.png; GPU harness 1600x900 + autoplay; real puppeteer keys/mouse; mocked navigator.getGamepads). 52 checks, **0 FAIL**:
  - Keyboard: title default New Game (ring 1); Down/Up wrap, disabled Load skipped; W/S; Enter -> Settings on Resolution scale; **MENU-R3-F2 re-measured**: Down cycles per tab - Display renderScale>mode>vsync>frameLimit>showFps>Reset>Back>tab-display>renderScale (9), Audio 15, Gameplay 7, Controls 3, Network 7 - every cycle returns to its start and the only tab id ever focused is the SELECTED tab (A3b x5 PASS); Up from the first row = the selected tab. FIXED. Esc from Settings/Records/Multiplayer/Exit-confirm = one level, focus restored on the opener; Esc/Backspace at root no-op; Tab x12 stays in the title (ring 1); New Game -> playing; Esc in camp -> pause (Resume); pause > Settings > Esc -> pause (focus Settings) > Esc -> play; levels: Level I focused, Right x2 stays on Level I (locked II/III skipped), mouse click on locked Level II starts nothing and shows "... to unlock", Esc -> camp; in a run pause > Quit to Lobby -> confirm (default "Keep Playing"), Esc -> pause with focus on Quit to Lobby; ui_move/ui_confirm/ui_back cues on the ui bus.
  - Mouse: hover focuses (ring 1), click Settings, every tab by click, Back button, right-click = back, Exit -> confirm -> Cancel, pointer on the backdrop keeps ring 1.
  - Gamepad: hints switch "↑↓ Select Enter Choose" -> "D-pad Select A Choose" on the title AND Settings now shows "D-pad Select ◀▶ Change LB RB Tabs B Back" (captures/gntcmenu4-nav-pad-settings.png; r3 advisory fixed); d-pad wraps; stick tap = 1 step; held stick first repeat 399 ms then 88-104 ms; A opens Settings; d-pad Right/Left on Resolution scale 1.00 -> 1.05 (buffer 1600x900 -> 1680x945) -> 1.00; RB/LB tabs; B = back with focus restored; B at root no-op; Start opens pause, B resumes; levels by pad (locked skipped, B back, no run started).
  - Random 50 actions (keys + pad): 0 ring violations, home in 0 Esc. 0 page errors in all four parts.
  - Display mode row with the pad shows "Press Enter or click — browsers don't let a gamepad button switch to fullscreen" (honest).
- [step 6] G1.3 response. (a) tools/gntcmenu4-resp.mjs x3 fresh pages (captures/gntcmenu4-resp.log; independent instrument = keydown/pointerdown timeStamp -> first #app-ui mutation -> next rAF, installed before game scripts; page ran 46-53 fps on the shared machine):
  | window | independent p50/p95/max (runs 1/2/3) | app.responses p50/p95/max (runs 1/2/3) |
  |---|---|---|
  | key early (title +0.7 s) | 13.5/**57.4/178.9** · 8.4/28.6/29.2 · 8.9/23.3/30.8 | 33.6/**134.6/330.4** · 37.2/**56.9**/84.3 · 38.5/**59.7**/67.1 |
  | key settled (+5 s) | 6.1/23.4/29.2 · 8.4/24.4/25.8 · 10.5/25.4/31.7 | 34.8/46.2/47.6 · 31.1/45.2/49.7 · 31.3/47.2/47.3 |
  | pad d-pad | 11.7/16.9/21.2 · 20.1/33.7/37.3 · 23.2/33.8/35.4 | 26/34.7/39.5 · 29/40.2/41.6 · 28.8/45.8/49 |
  | mouse hover | 7.5/10.8/11 · 5.9/9.8/11.2 · 6.6/9.8/13.2 | not self-recorded (n 0) |
  | mouse click | (instrument 1/20) | 28.5/**53.3**/53.9 · 29.3/38.8/49.2 · 34/44.5/63.2 |
  (b) tools/gntcmenu4-early.mjs x5 (captures/gntcmenu4-early.log; + long-task observer + rAF gaps > 50 ms): independent p95 8.9-24.0 / max <= 26.9; app p95 39.2 / 46.4 / 49.3 / **51.5** / 38.8, max 50.5-75.4; 0 long tasks, rAF gaps 0-1 x 55 ms; page 44-95 fps. The run-1 early spike (app max 330 ms, independent 179 ms) did not reproduce in 5 more early windows with long-task tracing.
- [step 7] G1.4 / G1.5 / G1.9 (tools/gntcmenu4-state.mjs -> captures/gntcmenu4-state.log; GPU harness 1600x900 dpr 1; independent frame counter = tasks that drew to the default framebuffer, injected before game scripts; tools/gntcmenu4-sharp.mjs Laplacian variance of luma in the 3D-only box 500,250,600,350):
  | gate | measured | result |
  |---|---|---|
  | G1.4 real slider | 5x ArrowLeft on Resolution scale: 1.00 -> 0.75, canvas 1600x900 -> 1200x675 two rAFs after the last press; row reads "Render resolution 1200 × 675 (75%) · sharper UI, softer 3D, faster" (pixels, captures/gntcmenu4-state-keep-scale.png; the probe's text check read the slider input's empty text = probe artifact) | PASS |
  | G1.4 buffers 2 frames after set, s = 1 / 0.5 / 0.75 / 1.25 / 1 | 1600x900 / 800x450 / 1200x675 / 2000x1125 / 1600x900 = round(css x s) exactly | PASS |
  | G1.4 HUD rects | 80 HUD leaves, max delta 0 px at every scale | PASS |
  | G1.4 fps independent/app | 1.0: 56.5/58.2 (repeat 92.6/89.1) · 0.5: 79.6/68.1 · 0.75: 121.5/130.3 · 1.25: 80.5/83; sim 60.0-60.2 ticks/s (shared machine, noisy) | PASS fps(0.5) >= fps(1.0) first pair; noisy |
  | G1.4 pixel detail | Laplacian var 0.5: 27.2 < 0.75: 93.0 < 1.0: 409.7; 1.25 (supersampled, smoothed) 254.4; captures/gntcmenu4-state-scale-0p5.png visibly softer 3D, HUD crisp | PASS |
  | G1.5 enter | trusted ArrowRight on Display mode -> fullscreenElement HTML in 66.5 ms, row "Fullscreen (browser)", canvas 1600x900 = window | PASS |
  | G1.5 browser exit | document.exitFullscreen -> exactly 1 fullscreenchange, setting false in 233 ms, row "Windowed", no dialog, canvas = window | PASS |
  | G1.9 scale | leaving Settings after 1.00 -> 0.75: "Keep these display settings? • Resolution scale 75% — render resolution 1200 × 675 · Reverting in 10 s", default focus Keep, Esc = Revert; timeout 10.09 s -> 1.0 + 1600x900; Revert -> 1.0/1600x900; Keep -> 0.90/1440x810 | PASS |
  | G1.9 fullscreen | enter then leave the tab -> keep-display "Fullscreen · Reverting in 10 s"; timeout at 9.13 s after open -> fullscreenElement null, setting false, stack back to pause | PASS |
  0 page errors.
- [step 8] G1.8 persistence / corruption / throwing storage, Reset, G1.10 Exit (tools/gntcmenu4-persist.mjs -> captures/gntcmenu4-persist.log, -persist-corrupt-*.png; GPU harness + autoplay):
  | leg | measured | result |
  |---|---|---|
  | 17 non-default keys (display, gameplay, audio incl. mode-before-level, net incl. the DEPLOY `net.serverUrl` override) -> reload | 17/17 identical | PASS |
  | effects re-applied at boot | canvas 1280x720 (0.8), scheduler "uncapped", limit 30, fps meter "25 fps", fullscreen false; Display tab "Render resolution 1280 × 720 (80%)", "V-Sync Off · Your device renders about 23 fps here — uncapped can't go faster…", "Windowed" + "Fullscreen lasts for this visit" | PASS |
  | change then reload inside the 150 ms debounce | 0.65 survives | PASS |
  | Reset (Display tab) | confirm "Reset Display settings? Every setting on this tab goes back to its default." default Cancel; OK -> 1.0 / V-Sync On / Unlimited / FPS off, canvas 1600x900, source raf; audio master 0.33 untouched | PASS |
  | corrupt: garbage JSON / truncated / `null` / array | defaults, loadReport "recovered", `echoes.settings.corrupt` kept, toast "Settings were reset — the saved file was unreadable" (captures/gntcmenu4-persist-corrupt-garbage-json.png), 0 page errors, next change writes clean v1 JSON | PASS |
  | wrong types (scale "abc", limit 999, vsync "yes", challenge "godmode", master 7) | per-key repair 1.0 / 0 / true / standard, master clamped to 1.0 (probe expected 0.8 - clamp is a valid repair), valid showFps kept, loadReport lists 4 invalid keys, no toast | PASS (advisory: silent) |
  | newer version (v 99) | defaults + toast "Your settings were saved by a newer version of Echoes — using defaults for now" | PASS |
  | localStorage throws | boots, storage "memory", footer "Settings can't be saved in this browser mode", live change 1520x855, 0 errors | PASS |
  | G1.10 Exit | confirm "Exit Echoes? Your progress and settings are saved." default Cancel; OK -> window.close called once (stubbed) -> farewell in 361 ms ("Thanks for playing Echoes. Your browser keeps this tab open — close it whenever you like. Your progress is saved."), ring 1, sim paused, music menu -> silence, settings flushed (0.85); Return -> title, 0.85 intact, music back to "menu" | PASS |
- [step 9] G1.6 V-Sync / G1.7 frame limit.
  - Display harness (headful ANGLE D3D11 "AMD Radeon(TM) Graphics", css 1586x806, dpr 1.5; panel rAF on a blank page 163.9 Hz; `node tools/gnt-arch-browser.mjs rafhz --headful` on the camp = 33 Hz under the current machine load (p50 30.3 ms) - the shared machine is far busier than in r3). tools/gntcmenu4-pace.mjs at render scale 0.5, 2 rounds x (On/Off x 30/60/120/144/Unlimited), 4 s windows (captures/gntcmenu4-pace-s05.log, -pace-s05-copy-*.png):
    | limit | V-Sync On independent fps (r0 / r1) | V-Sync Off (r0 / r1) | source | sim ticks/s |
    |---|---|---|---|---|
    | 30 | 30.2 / 30.0 | 30.0 / 30.0 | raf / uncapped | 59.9-60.4 |
    | 60 | 60.1 / 60.0 | 60.0 / 60.0 | raf / uncapped | 60.0-60.1 |
    | 120 | 69.2 / 73.0 | 63.2 / 72.3 | cap-bound (Unlimited 61-71) | 60.0 / **56.6** / 60.0 / 60.0 |
    | 144 | 66.2 / 58.5 | 70.9 / 66.2 | cap-bound | 60.0 / **55.8** / 59.9 / 60.0 |
    | Unlimited | 66.3 / 62.3 | 65.7 / 70.6 | cap | 59.9-60.1 |
    workMsP50 7.1-13.8 ms >= 0.8 x 1000/163.9 = 4.9 ms -> G1.6 case (b) (GPU/CPU-bound): Display tab reads "V-Sync Off · Your device renders about 52 fps here — uncapped can't go faster than your GPU" with stats().renderedFps 51.6 in the same read (within 1%); On reads "Frames paced to your display (~170 Hz)" (panel 163.9, +3.7%); limit above the cap reads "Rendering 55 fps · your device renders about 55 fps here, below the limit". On never above panel x 1.02 (max 73). Honest labelling PASS; a V-Sync On/Off cadence difference is not observable on this machine (GPU-bound, as in r3).
  - GPU harness (headless), tools/gntcmenu4-ticks.mjs (captures/gntcmenu4-ticks.log; ?menu=0 camp, scale 0.5, 5 s windows, per-window max present interval + ticks lost): 30 -> 30.0 x4, 60 -> 60.0 x3 (one window lost to a counter-buffer artifact), 120 / 144 / Unlimited cap-bound 87.6-107.4 (Unlimited 89.1-107.1); sim 59.88-60.2 ticks/s in 22/23 windows; the exception (V-Sync Off 144: 39.9 ticks/s) contains ONE 1919.9 ms present gap.
  - Stall attribution (tools/gntcmenu4-stall.mjs -> captures/gntcmenu4-stall.log: 60 (vsync, limit) changes in 90 s, independent rAF loop + 10 ms heartbeat): the only GL present gap after a change (2482 ms, 829 ms after V-Sync On/144) had the independent rAF loop stopped too with the heartbeat alive = a browser/GPU-process stall (shared GPU), not the game's scheduler; the other 14 gaps (151-3036 ms) were before the first change (boot warm-up, several with the main thread blocked). The 56.6/55.8 ticks/s windows above are of the same kind. Verdict G1.7: 30/60 within 1% (PASS); 120/144 within 5% of min(limit, measured cap) in every window where the cap is stable, a binding 120/144 limit not isolatable on this loaded machine (r3 measured 119.5 at a 124 cap).
  - Hitch probe on the player path (tools/gntcmenu4-hitch.mjs -> captures/gntcmenu4-hitch.log; title settled 6 s -> Enter on New Game -> 45 s in camp): run 2 = 0 rAF gaps > 100 ms, 0 heartbeat gaps, 0 long tasks after the press, 2704 ticks in 45 s (60.1/s); run 1 happened while the machine was saturated (the title took 177 s to appear after navigation vs 42.5 s in run 2): 5.2 s rAF gap spanning the press, then 100-400 ms hitches for 6 s, 56 ticks/s. Contention, not reproducible in run 2.
- [step 10] Fullscreen on the display harness + resize + Alt+Enter + reload (tools/gntcmenu4-fs.mjs -> captures/gntcmenu4-fs.log, -fs-on.png; tools/gntcmenu4-altenter.mjs -> -altenter.log; tools/gntcmenu4-fsreload.mjs -> -fsreload.log; tools/gntcmenu4-pending.mjs -> -pending.log):
  - Headful, trusted ArrowRight on Display mode: fullscreenElement set, row "Fullscreen (browser)", inner 1386x726 -> 1707x960 = canvas css, buffer 2432x1367 = 1707 x 1.5 x 0.95 (exp 2432x1368, +-1) PASS. Leaving (exitFullscreen): setting false, "Windowed", canvas 1386x726, buffer 1975x1034, scale 0.95 kept PASS.
  - Window resize via CDP 1100x700 / 1600x900 / 900x600: canvas css = inner each time (1086x606, 1586x806, 886x506), buffer = css x 1.5 x 0.95 within 1 px, ring 1 PASS.
  - Alt+Enter (GPU harness): title on/off, Settings on/off, in play on/off - setting mirrors each time PASS. Headful: after the first fullscreen episode no CDP key reaches the page (same harness limitation r3 documented), so headful Esc / Alt+Enter legs are unmeasurable; keyboardLock false (not engaged) -> Esc in fullscreen is the browser's.
  - Fullscreen then reload (headful): before fsEl true; after reload fsEl false, setting false, row "Windowed", "Fullscreen lasts for this visit" note, scale 0.95 kept PASS.
  - Unconfirmed change + reload: (b) reload while the Keep/Revert countdown is showing (0.60) -> boots at 1.00 / 1600x900 = reverted PASS; (a) reload while still ON the Display tab after raising to 150% -> boots at 150% (2400x1350) with no prompt - the keep dialog only arms when the tab is left (advisory: a player who reloads out of a slideshow keeps it).
- [step 11] G1.11 journey / core loop / legacy boots / focus loss (tools/gntcmenu4-journey.mjs -> captures/gntcmenu4-journey.log, -journey-afterfight.png, -backtitle.png; tools/gntcmenu4-newgame.mjs -> captures/gntcmenu4-newgame.log, -newgame-confirm.png; GPU harness + autoplay):
  - Fresh profile: Enter on New Game -> app "playing" at 217 ms, player moving under held W at **217 ms** (gate <= 1000) PASS.
  - Real input: hold W -> inPortal, E at tick 163 -> combat room 1 at tick 176 (no picker); right mouse held + 1-4 + A/D -> **room 1 cleared by real input in 18.7 s** -> phase reward PASS.
  - Pause > Quit to Title -> confirm (default "Keep Playing") -> title with 7 rows, default focus Continue ("Level I · The Hollow Wood · Room 1 · just now · Autosave"); title after a run: rAF 48/s = rendered 47.9 fps (one loop), 1 music player ("menu"), one ArrowDown = one step PASS.
  - New Game with a run in progress (tools/gntcmenu4-newgame.mjs): Save & Quit (confirm "Save and quit to the title? Your run is written to the autosave slot first.", default Keep Playing) -> title in 1.29 s; New Game -> dialog "Start a new game? Your run in progress stays in Load Game: Level I · The Hollow Wood · Room 1 · just now · Autosave. The new game autosaves to its own slot." default "Start New Game" (non-destructive, so acceptable); Esc -> title with focus on New Game; confirm -> playing in 77 ms, fresh camp (run inactive, new seed), both autosaves listed (auto-2, auto-1); second core loop portal -> combat room 1 -> reward PASS. (The r3 journey script's J7 "fail" = it did not answer this new dialog - probe artifact.)
  - Legacy/menu-skip boots (6 s after load, +500 ms): ?menu=0&seed=7, ?seed=5, ?room=kill_all, ?room=defend, ?run=1 (combat), ?scene=arena, ?variant=2, ?layout=4&room=kill_all, ?level=2 (campaign, phase transit = the Level-2 "setting out" card) -> playing, no title, +29..33 ticks; ?seed=5&menu=1 -> title, tick frozen 0; 0 page errors each PASS.
  - B22 focus loss in SP play (blur + hidden): pause opens, 0 ticks elapse in 1 s, master bus -999 dB; focus back: menu stays, focus Resume, ring 1; Esc -> 60-63 ticks/s PASS.
- [step 12] B28 text fields in Settings > Network (tools/gntcmenu4-textin.mjs, -textin2.mjs, -textesc.mjs, -textesc2.mjs -> captures/gntcmenu4-textin*.log, -textesc*.log, -textesc-after-halftyped.png, -textesc2-mp.png; 1280x720):
  - PASS: Down from the tab stop lands in Player name with the caret (INPUT focused, ring 1); typing "Wasd Qe" goes into the field (no nav, no tab switch); Enter commits (net.playerName "Wasd Qe"); Down moves to Server address; "http://example.com" + Enter refused in the row ("Server addresses start with ws:// or wss://"), nothing saved; "ws://127.0.0.1:7841/echoes" + Enter saved, cursor stays; Down reaches "Reset to automatic", Enter resets to '' (focus then jumps to Player name, not the neighbouring row - minor); Esc on a button backs to the title.
  - **FINDING MENU-R4-F1 (Esc inside a text field commits the uncommitted edit and closes Settings):** with the caret in Server address, typing `ws://12` then ONE Esc closes Settings (stack title,settings -> title) and SAVES the half-typed text, normalised to `ws://0.0.0.12` (settings + localStorage `echoes.settings` data["net.serverUrl"] = "ws://0.0.0.12", no toast, no message) - captures/gntcmenu4-textesc.log case "half-typed address"; the same for a complete but uncommitted address (saved) and for Player name ("Zed" saved). Reopening Settings shows "Custom address … ws://0.0.0.12" (captures/gntcmenu4-textesc-after-halftyped.png). Consequence on a later visit: Multiplayer opens on "Can't reach the Echoes server at ws://0.0.0.12. That is the custom address saved in Settings ▸ Network…" with Retry focused (captures/gntcmenu4-textesc2.log, -textesc2-mp.png) - recoverable via "Use this site's server", but the player's cancel became a broken multiplayer setting. Only an invalid scheme (`http://oops`) + Esc is not saved. PLAN §3.3 ("Esc blurs/backs, Enter confirms") gives Esc no commit role; every benchmark text field (and the game's own Keep/Revert and confirm dialogs, where Esc = Revert/Cancel) treats Esc as cancel.
- [step 13] G1.13 gesture hook (tools/gntcmenu4-gesture.mjs -> captures/gntcmenu4-gesture.log; NO autoplay flag; unlock wrapped on the live audio service before the press): Esc -> unlock called, audio stays "locked" (Esc grants no activation - honest); one KeyZ -> "running"; one click -> pointerdown+mousedown -> "running"; one touch tap -> pointerdown/touchend/mousedown -> "running"; 0 page errors. CDP DOMDebugger.getEventListeners(window): the FIRST capture listener for keydown, pointerdown, mousedown and touchend is the same passive function (script 37, line 53) = one shared gesture hook registered first (the probe's URL resolver returned "" so its automated check printed FAIL - resolver artifact; evidence identical to r3). PASS.
  G1.12 palette (tools/gntcmenu4-palette.mjs -> captures/gntcmenu4-palette.log, -palette-<screen>.png; analyze.mjs --box per plate): 87 plate rects over loading / title / 5 settings tabs / confirm / farewell / keep-display: Ember(danger) 0, Heal 0, violet 0 px. Backdrop full-frame Ember 40 (title) / 62 (keep-display) <= 952 x 1.1 = 1047. PASS.
- prod preview: npx vite preview --outDir dist-gntcmenu4 --port 4320 (background), listening PID 64444 — kill before returning
- A/B server: node server/index.mjs --static <scratchpad>/r3build/dist-r3 --port 7840 (v0.5.94 build) — kill before returning
- [step 14] Production build + G1.3 attribution. `npx vite build --outDir dist-gntcmenu4`; `npx vite preview --outDir dist-gntcmenu4 --port 4320 --strictPort` (my PID 64444).
  - Prod smoke `cert-capture shot gntcmenu4-prod-smoke --url http://127.0.0.1:4320/` exit 0, 0 PAGEERROR.
  - Prod nav (tools/gntcmenu4-nav.mjs with ECHOES_URL=:4320 -> captures/gntcmenu4-prod-nav.log; NOTE captures/gntcmenu4-nav.log was overwritten by this prod run - the dev numbers are those quoted in step 5): TOTAL FAILS 0 (same 52 checks).
  - Prod title with a save (captures/gntcmenu4-prod-titlesave.log) 1024x576 + 2560x1440: 0 issues; prod pause clip (captures/gntcmenu4-prod-clip.log) 1024/1280/1366/1600: 0 clipped rows; prod New Game over a run (captures/gntcmenu4-prod-newgame.log): identical to dev (dialog, Esc, confirm, fresh camp, 2nd core loop to reward, 0 errors).
  - Prod MENU-R4-F1 (captures/gntcmenu4-prod-textesc.log): identical - `ws://12` + Esc -> Settings closed, "ws://0.0.0.12" stored; valid uncommitted address and "Zed" also committed by Esc.
  - Prod G1.3: tools/gntcmenu4-early.mjs x5 (captures/gntcmenu4-prod-early.log): independent p95 12.3-21.8, max <= 29.9; app p95 56.2 / 50.5 / 48.4 / 60.5 / 61.0, max 52.6-77.6 at page 45-57 fps. tools/gntcmenu4-resp.mjs x3 (captures/gntcmenu4-prod-resp.log): run 1 (first page of a fresh browser) key-early independent max 212.4 / app p95 95.2 max 229.8, click app max 154.6; runs 2-3 PASS except click app p95 56.2. Cold-browser per run with a pad mock (tools/gntcmenu4-early2.mjs -> captures/gntcmenu4-prod-early2.log): first 1-2 presses 69-129 ms independent / 81-142 ms app in 2 of 4 runs, coinciding with 115-285 ms rAF gaps in the title's first second (tools/gntcmenu4-coldgl.mjs -> captures/gntcmenu4-coldgl.log: 158-497 ms rAF gaps at +0.2..+0.8 s after the title with NO program links / texture uploads / long tasks in that window).
  - **A/B attribution** (tools/gntcmenu4-ab.mjs -> captures/gntcmenu4-ab.log): the r3 build v0.5.94 (`git archive 027850e`, built in the scratchpad, served by `node server/index.mjs --static … --port 7840`, my PID 72332, killed) vs the current build, cold browser per run, alternating order, same probe: first-1.5 s max rAF gap current 334/139/146/158/266 ms vs r3 218/152/145/157/139 ms; early presses current independent max 4.8-10.7, app p95 31.7-46.8 / r3 5.1-11.9, 29.4-44.4 (page 75-108 fps). Same cold-start stall on both builds, and with the machine less loaded both builds PASS G1.3 in 10/10 cold windows -> the >100 ms outliers are load-bound (page at 45-57 fps), not a regression. G1.3 verdict: PARTIAL (load-bound), as in r3.
- [step 15] Extra honesty / regression checks.
  - Render-scale clamp (tools/gntcmenu4-clamp.mjs -> captures/gntcmenu4-clamp.log, -clamp-150.png; 1920x1080 css at dpr 2): 0.5 -> 1920x1080; 1.0 -> 3840x2160 "native"; 1.25 / 1.5 -> buffer 3840x2160, display().clamped true, row "Render resolution 3840 × 2160 (125%) · supersampled — slower · limited to 3840 × 2160". Honest PASS.
  - Boot on the player URL, production (tools/gntcmenu4-boot.mjs -> captures/gntcmenu4-prod-boot.log; CDP screencast + app-state timeline, cold browser x2): first painted frame = the ECHOES splash at 896 / 1177 ms (FCP 888 / 1164), loading card at 3.3 / 4.0 s, title at 8.7 / 11.1 s (includes the "press any key" gate); 0 blue raw-scene frames before the title in 289 + 224 frames. fix-INT-r3's claim (splash 0.8-1.2 s cold, no raw-scene frames) holds.
  - Populated profile (tools/gntcmenu4-layout2.mjs -> captures/gntcmenu4-layout2.log, -layout2-<w>-<screen>.png) at 1024x576 / 1280x720 / 2560x1440, 11 screens each: 0 rect issues on title-with-save, records, 5 settings tabs, mp-menu, pause-after-continue; the saves list "issues" are the 13.3 px UA font of the slot button wrappers (visible text >= 16.5 px) and its "48.6 px over" row is the ellipsised caption's full range rect - pixels (captures/gntcmenu4-layout2-1024-saves-load.png) show "Level I · The Hollow Wood · Room 1 of 8 · Hunt…" cleanly truncated with the full line in the detail panel (M2's screen, acceptable).
  - Own processes: vite preview PID 64444 (:4320) and the A/B static server PID 72332 (:7840) killed; ports free; no process with dist-gntcmenu4 / r3build / --port 7840 in its command line remains. No other server started. Nothing committed; no src/** edited.

## 2. Benchmark scoring (blind checklist of section 1 vs Echoes v0.5.124)

| # | Result | Evidence |
|---|---|---|
| B1 | MET | fresh: New Game focused, ring 1 (nav A0); with a save: Continue focused (titlesave, journey J4) |
| B2 | MET | Load disabled with "No saved games yet" (layout-1024-title.png) |
| B3 | MET | arrows/WASD/Enter/Esc/Backspace; title wraps; every Settings tab's Down cycle returns home (9/15/7/3/7 stops) |
| B4 | MET | d-pad, stick tap, held repeat 399 ms then 88-104 ms, A/B/LB/RB/Start (nav C1-C10) |
| B5 | PARTIAL | menus fully mouse-drivable (hover = focus, click, right-click back, Back buttons); in play there is still no clickable pause/menu affordance (nav B8: 0 candidates) |
| B6 | MET | Esc/B/right-click one level from every depth; root no-op (A4-A7, C7-C8, B5) |
| B7 | MET | focus restored on Settings/Records/Multiplayer/Exit/pause Settings/Quit to Lobby |
| B8 | MET | ring 1 on every sample incl. 50 random actions and after the pointer leaves the items |
| B9 | MET | Settings ring in reading order, only the SELECTED tab is ever a stop (A3b x5); r3 F2 fixed |
| B10 | MET | buffer changes 2 rAFs after the key; fullscreen 66-78 ms |
| B11 | MET | 10 s Keep/Revert for scale and entering fullscreen; timeout 10.09 s / Revert / Keep all restore value + effect; Esc = Revert |
| B12 | MET | readout "Render resolution 1200 × 675 (75%)", buffers exact, HUD 0 px drift, Laplacian 27 -> 93 -> 410, clamp note at 4K |
| B13 | MET | fullscreenElement mirrors, one fullscreenchange syncs Windowed, canvas = window at 3 window sizes, reload -> Windowed + note |
| B14 | PARTIAL | truthful raf vs uncapped with measured copy ("renders about 52 fps here — uncapped can't go faster than your GPU" at renderedFps 51.6); no visible cadence difference on this GPU-bound machine |
| B15 | MET | 30 -> 30.0-30.2, 60 -> 59.9-60.1 (+-1%); above the cap = the cap; sim 60 +-1 except windows with browser-wide stalls |
| B16 | MET | 17 keys survive reload with effects; 6 corrupt variants handled with a notice; throwing storage -> memory + footer note |
| B17 | MET | per-tab Reset behind a confirm (default Cancel), other tabs untouched |
| B18 | MET | Exit confirm -> window.close attempt -> honest farewell in 361 ms, music -> silence, Return works |
| B19 | PARTIAL | independent input->paint p95 <= 35 ms in quiet windows; the game's own metric p95 > 50 in loaded windows, cold first-second outliers up to 230-330 ms under load (same on the r3 build, A/B) |
| B20 | MET | title/settings/pause/dialogs 0 issues at 1024/1600/2560 (+ 1152/1280/1366 for title and pause); levels-screen sub-lines 13.5 / 15.0 px (advisory) |
| B21 | MET | every display row has a sub-line + an info panel ("Renders the 3D scene at a fraction…") |
| B22 | MET | blur/hidden -> pause, 0 ticks in 1 s, master -999 dB; explicit resume |
| B23 | MET | pad glyphs on the title AND in Settings ("D-pad Select ◀▶ Change LB RB Tabs B Back") - r3 advisory fixed |
| B24 | MET | splash first paint 0.9-1.2 s cold, 0 raw frames; New Game -> moving in 217 ms |
| B25 | MET | pause > Settings; fullscreen / scale applied to the running game (state G1.5 from pause) |
| B26 | MET | Esc/Start pause from camp and run; Resume returns (A10-A15, C9) |
| B27 | PARTIAL | leaving the tab / closing Settings arms Keep/Revert and a reload during the countdown reverts; a reload while still on the Display tab keeps an unconfirmed 150% with no prompt |
| B28 | NOT MET | typing + Enter / invalid scheme OK, but Esc inside a field commits the uncommitted text and closes Settings ("ws://12" saved as "ws://0.0.0.12") - MENU-R4-F1 |

Score: **23 met / 4 partial / 1 not met of 28**.

## 3. PLAN §7 M1 gates (re-measured on v0.5.124, dev + production)

| Gate | Result | Key numbers |
|---|---|---|
| G1.1 Layout | PASS | 15 fresh + 11 populated screens x 3 sizes: 0 rect issues on title/settings/pause/dialogs; title-with-save 5 sizes 0 overlaps (logo top 14.6 at 1024); pause 7 rows 0 clipped at 1024-1600 (r3 F1/F3 fixed); min item text 16.5 / 18.3 / 29.3 px; min hit 42 / 46.7 / 74.7 px |
| G1.2 Navigation | PASS | 52 checks 0 FAIL dev + prod: keyboard, mouse, mocked pad; back = one level; ring 1; focus restored; 50 random 0 violations; Settings ring fixed (r3 F2) |
| G1.3 Response | PARTIAL (load-bound) | independent p95 5-35 ms in 30+ windows; app p95 31.7-61 (> 50 in loaded windows at 45-57 fps), cold outliers app max 142-330 ms under load; A/B vs the r3 build: identical first-second stall on both, 10/10 cold windows PASS when the machine is quieter |
| G1.4 Render scale | PASS | exact buffers 2 frames after set, HUD 0 px, Laplacian 27/93/410, fps(0.5) 79.6-83.2 >= fps(1.0) 52.5-56.5 |
| G1.5 Fullscreen | PASS | 66-78 ms enter, 1 fullscreenchange exit sync (227-233 ms), canvas = window incl. headful and 3 window sizes |
| G1.6 V-Sync | PASS (case b) | On source raf <= panel 163.9 Hz; Off uncapped, workMsP50 7.1-13.8 >= 4.9 ms, copy "about 52 fps" = renderedFps 51.6 |
| G1.7 Frame limit | PASS | 30: 30.0-30.2; 60: 59.9-60.1; 120/144/Unlimited = cap (61-108); sim 59.9-60.2 in every window without a browser-wide stall |
| G1.8 Persistence | PASS | 17 keys, effects re-applied, 6 corrupt variants + newer version + throwing storage handled, 0 page errors |
| G1.9 Keep/Revert | PASS | timeout 10.09 / 10.11 s revert, Revert, Keep, fullscreen revert 9.13 / 9.22 s |
| G1.10 Exit | PASS | farewell 361 ms, silence, Return with settings intact |
| G1.11 Journey | PASS | moving 217 ms after New Game, room 1 by real input 18.7 s, New-Game-over-a-run dialog + fresh camp + 2nd loop, 10 legacy boots |
| G1.12 Palette | PASS | 87 plates 0/0/0; backdrop Ember 40-62 <= 1047 |
| G1.13 Gesture hook | PASS | key/click/touch each unlock synchronously; one shared passive hook is the first capture listener for all four types |

## 4. Builder-claim cross-check
- fix-M1-r3: F2 settings ring (v0.5.95), F1 pause rows (v0.5.98), F3 title with a save (v0.5.99), pad glyphs in Settings (v0.5.100) - all four CONFIRMED on dev + production (steps 4, 5, 14).
- build-DEPLOY 4748349 "Enter commits the address / name": CONFIRMED (textin T3/T7); not claimed and not handled: Esc inside the field commits too (F1).
- fix-INT-r3 J3-F2 "splash 0.8-1.2 s cold, raw-scene frames 0": CONFIRMED (0.90 / 1.18 s, 0 raw frames). J3-F3 "New Game over a run in progress asks": CONFIRMED (dialog names the kept run, both autosaves listed).

## VERDICT: FAIL — 1 must-fix

- **MENU-R4-F1** Esc inside a Settings > Network text field commits the uncommitted edit and closes Settings in one press: "ws://12" + Esc -> net.serverUrl "ws://0.0.0.12" persisted (no message); a later Multiplayer opens on "Can't reach the Echoes server at ws://0.0.0.12"; a full but unconfirmed address and a player name are committed the same way. Suspect src/ui/menu/tabs/network.js (commit on blur/change), src/app/nav.js (Esc -> back while a text input has the caret), src/net/address.js (accepts the numeric shorthand host). Repro: tools/gntcmenu4-textesc.mjs (dev, and ECHOES_URL=http://127.0.0.1:4320/ for a production preview).

Advisories: G1.3 load-bound outliers (cold first-second 139-334 ms rAF stall on both this and the r3 build); levels-screen sub-lines 13.5 px at 1024x576 / 15.0 px at 1600x900 (CAMPAIGN, carried from r3); reload while on the Display tab keeps an unconfirmed render scale; no clickable pause affordance for mouse-only players in play; cosmetic: Resume ring top edge 1 px thinner at 1024x576, Settings Back button's permanent amber border resembles the focus ring; __echoes.app.focus().id null on level cards; focus jumps to Player name after "Reset to automatic"; silent per-key repair of a hand-edited settings file; Keyboard Lock never engaged; V-Sync On/Off cadence indistinguishable on this GPU-bound machine (honestly labelled).
