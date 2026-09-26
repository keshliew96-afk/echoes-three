STATUS: COMPLETE
VERDICT: FAIL - 3 must-fix (F1 run pause menu rows clipped 5 px at 1024x576 after Quit to Lobby; F2 Settings cursor order lands on the unselected Network tab and never returns to the top rows, persisting from r2; F3 title-with-save at 1024x576: hint bar overlaps Exit 12.1 px, logo at y -0.1). M1 gates 10/13 PASS, G1.1 FAIL, G1.2/G1.3 partial; benchmark 18 met / 6 partial / 1 not met of 25; 0 page errors; core loop and 10 legacy boots pass on dev + production.

# Critic — Main Menu & Screen Settings — round 3

Role: harsh critic, fresh context. Judges only the running game (pixels, console, debug-API state, storage, network). Never modifies src/**, server/**, PLAN.md, BUILD_BRIEF.md or other agents' reports. All tool/capture files prefixed `gntcmenu3-`.

## Step log
- [x] S0 checkpoint file created

## 1. Blind benchmark checklist (written BEFORE inspecting any Echoes capture)

Reference systems: Hades (Supergiant), Celeste, Hollow Knight, Slay the Spire, and Unreal/Unity shipped-game settings conventions (UGameUserSettings / Unity QualitySettings+Screen: apply/revert timer, instant preview, persisted config, focus handling). Each item is concrete and testable; the browser-truthful equivalent is noted where the native feature cannot exist.

| # | Benchmark behaviour (source) | Test used on Echoes |
|---|---|---|
| B1 | Title shows a short vertical action list (Hades: Play/Settings/Quit; Celeste: Climb/Options/Credits/Exit; StS: Play/.../Settings/Quit); one item is focused on arrival with no mouse needed; default focus = Continue if a save exists, else New Game | DOM focus + pixels after cold load, with and without a save |
| B2 | Load/Continue is disabled or hidden (never a dead button) when there is no save; with saves it lists slots with metadata (Hades profile: time played, progress) | clear storage -> inspect Load entry; with save -> inspect list |
| B3 | Keyboard: Up/Down (and W/S) move, Enter/Space confirm, Esc back; list wraps top<->bottom (Celeste, Hollow Knight) | key-only traversal of every title item + every settings row |
| B4 | Mouse: hover moves the single focus highlight (never two highlighted items), click activates; no hover-only information | hover/click probes, count of highlighted items |
| B5 | Gamepad: D-pad and left stick navigate with an initial delay + repeat, A/Cross confirm, B/Circle back; prompts switch to pad glyphs (Hades, Celeste, HK) | mocked navigator.getGamepads |
| B6 | Back is consistent: Esc/B from any sub-menu goes up exactly one level; at the root it does nothing harmful (or opens the quit confirm) | Esc/B from every depth |
| B7 | Returning from a sub-menu restores focus to the item that opened it (HK, StS) | document.activeElement after back |
| B8 | No focus traps: focus never lands on an invisible/disabled element or leaves the menu (Tab cycling stays in the active panel) | Tab x N, activeElement visibility |
| B9 | Audible UI feedback on move/confirm/back (Hades, Celeste) | audio probe / event log |
| B10 | Display changes preview instantly; risky display-mode/resolution changes show "Keep these settings? Reverting in N s" and auto-revert if not confirmed (Unreal/Unity/Windows convention; HK video menu) | change render scale/fullscreen, wait, check revert |
| B11 | Resolution / render-scale option actually changes the 3D render resolution while UI text stays crisp (Unity renderScale, Unreal r.ScreenPercentage) | drawing-buffer size + pixel detail per step |
| B12 | Fullscreen toggle reflects real state; leaving fullscreen via the OS key (Esc/F11) updates the toggle, and the layout re-fits on resize | document.fullscreenElement, toggle text, canvas size |
| B13 | V-Sync toggle measurably changes frame presentation (tearing/cadence) — browser equivalent must be honest (browsers always compositor-sync rAF) | present-interval stats on vs off, UI label text |
| B14 | Frame-rate cap presets (30/60/120/unlimited, StS/HK style) hold the target within a few % | rendered frames/s per preset |
| B15 | Settings persist across restart; a corrupt/unknown config falls back to defaults without crashing (Unity PlayerPrefs / Unreal ini behaviour) | reload + garbage in storage |
| B16 | "Reset to defaults" exists and restores every value | activate, compare values |
| B17 | Quit asks for confirmation; exit is honest about what happens (Hades/HK "Are you sure?") — a browser tab cannot close itself, so it must say what it does | activate Exit, read UI text/state |
| B18 | Menu input reaches the screen within ~1-2 frames (<= ~50 ms) | input -> first changed frame |
| B19 | Layout scales across 16:9 sizes (720p-1440p): nothing clipped/overlapping, body text >= ~14 px at the smallest, title proportionate | 1024x576 / 1600x900 / 2560x1440 DOM rects + pixels |
| B20 | Each settings row shows its current value inline; Left/Right changes it without entering a sub-dialog (Celeste, HK, Hades) | keyboard Left/Right on each row |
| B21 | Each setting has a one-line description/help (HK, Unreal games) | DOM text |
| B22 | Focus loss handling: losing window focus pauses gameplay or mutes (Unity runInBackground=false convention; HK "pause on focus lost") and does not lock input on return | blur/visibility events |
| B23 | Contextual prompt bar (Select / Back glyphs) at the bottom of menus (Hades) | pixels/DOM |
| B24 | Title -> gameplay transition is a fade, no long frozen frame; the first gameplay frames are stable (no core-loop break) | New Game -> tick advance, events, page errors |
| B25 | Settings can be reached from the in-game pause menu too, with identical values (all four) | pause -> settings |
- [x] S1 build under test + smoke: HEAD 027850e (v0.5.94), branch gauntlet, dev server 5199 HTTP 200. `node tools/cert-capture.mjs shot gntcmenu3-smoke --settle 4000 --timeout 180000` exit 0, 0 PAGEERROR (captures/gntcmenu3-smoke.png = loading card "Ready / Press any key or click"; console only the two known ANGLE warnings X3595/X4000). Peek (tools/gntcmenu3-peek.mjs, captures/gntcmenu3-peek.log, -peek-title.png, fresh profile, 1600x900): title reached 5.5 s after load; rows New Game (focused, ring 1) / Load Game (disabled, "No saved games yet") / Multiplayer / Settings / Records / Exit; hint bar "↑↓ Select · Enter Choose · v0.5.94"; registered screens loading,title,settings,confirm,keep-display,farewell,levels,saves,sv-rename,records,mp-menu,mp-join,lobby,nt-server,pause; campaign.unlocked() = [1].
- [x] S2 G1.1 layout, 3 sizes x 15 screens (tools/gntcmenu3-layout.mjs, captures/gntcmenu3-layout.log, gntcmenu3-layout-<w>-<screen>.png/.json; GPU harness, fresh profile). Screens: title, settings display/audio/gameplay/controls/network, records, mp-menu, saves(load, empty), confirm-exit, farewell, pause-camp, levels, pause-run.
  | size | screens | rect issues (outside viewport / overlap / hit<40 / not hit-testable) | min item font | min hit px | ring count |
  |---|---|---|---|---|---|
  | 1024x576 | 15 | 0 | 16.5 (title/settings), levels card sub-line 13.5 | 42 | 1 on every screen |
  | 1600x900 | 15 | 0 | 18.33 | 46.7 | 1 |
  | 2560x1440 | 15 | 0 | 29.33 (UI scales x1.6) | 74.7 | 1 |
  Pixels viewed: 1024 title (logo + tagline + 6 rows + hint bar, nothing clipped), 1024 display tab (5 rows + measured line, readable), 2560 display tab (info panel, 29 px type), 1600/1024 pause, 1024 levels.
  - FINDING MENU-R3-F1 (clipping, 1024x576, pause menu in a run): the rect audit passes but the text does not fit its rows. tools/gntcmenu3-clip.mjs (captures/gntcmenu3-clip.log, gntcmenu3-clip-1024-pause-run-crop.png): with the campaign's 7th row "Quit to Lobby", the two-line rows are squashed from 65.5 px (natural, 1280x720+) to 43.5 px and the sub-lines overrun the row's inner box by 5.0 px on 4 rows (pz-settings "Display, audio, gameplay, controls", pz-lobby "Abandon this campaign — back to camp", pz-savequit "Autosave, then the title", pz-quit "Without saving"); pz-quit is additionally cut 3.6 px by the scroll box. Visible in the crop: descenders drawn across the row borders. 1280x720 / 1366x768 / 1600x900: 0 clipped rows. The camp pause (6 rows, no Quit to Lobby) fits at 1024x576 (gntcmenu3-layout-1024-pause-camp.png).
  - Advisory: levels screen (CAMPAIGN) sub-line "Begins with the starting kit" is 13.5 px at 1024x576 (< 14 floor of §3.2), "Night woodland" 14.25.
- [x] S3 G1.2 navigation (tools/gntcmenu3-nav.mjs -> captures/gntcmenu3-nav.log; tools/gntcmenu3-tabland.mjs -> captures/gntcmenu3-tabland.log; GPU harness 1600x900 + autoplay, real puppeteer keys/mouse, mocked navigator.getGamepads). 32 checks; PASS unless listed:
  - Keyboard: title default focus New Game (ring 1); ArrowDown/ArrowUp wrap (new>multiplayer>settings>records>exit>new; disabled Load skipped); W/S move; Enter opens Settings on Resolution scale; Esc from Settings/Records/Multiplayer/Exit-confirm returns exactly one level with focus restored on the opening row; Esc at root no-op; Backspace = back; browser Tab x12 stays inside the title rows (ring 1 every sample); New Game -> playing; Esc in camp -> pause (Resume focused), pause > Settings > Esc -> pause (focus Settings) > Esc -> play; levels screen: Level I focused, locked II/III skipped by Right and refused by mouse click (stack stays ["levels"], run idle), Enter on Level I -> combat in 301 ms; run pause cycle resume>settings>save>lobby>savequit>quit>resume; Quit to Lobby -> confirm "Quit to the lobby? This abandons the current campaign and returns you to camp. Unlocks and records are kept." default focus "Keep Playing"; Esc -> pause focus Quit to Lobby; OK -> camp (mode camp, run idle, stack [], 61 ticks/s after). UI cues ui_move / ui_confirm / ui_back present on the ui bus.
  - Mouse: hover focuses (single ring), click Settings, every tab clickable, Back button, right-click = back (records -> title), Exit -> confirm -> Cancel, pointer on the backdrop keeps ring 1.
  - Gamepad: title prompts switch "↑↓ Select Enter Choose" -> "D-pad Select A Choose" after pad input; d-pad wraps; stick tap = 1 step; held stick first repeat 402 ms then 83-103 ms; A opens Settings; d-pad right/left on Resolution scale 1.00 -> 1.05 (buffer 1600x900 -> 1680x945) -> 1.00; RB/LB switch tabs; B backs with focus restored; B at root no-op; Start opens pause, B resumes; levels by pad (A on Level I starts it).
  - Random 50 actions (keys + pad): ring violations 0, home in 0 Esc.
  - FINDING MENU-R3-F2 (cursor order in Settings — r2's MENU-R2-F1, still present at v0.5.94): Display tab ArrowDown x8 from Resolution scale = mode > vsync > frameLimit > showFps > Reset > **ap-tab-network** (the Network tab, while Display is the selected tab) > vsync > frameLimit ...; Resolution scale and Display mode are never reached again going down (46-press cycle never returns to the start). ArrowUp from Resolution scale lands on **ap-tab-gameplay**. Enter on the mis-focused tab switches to the Network tab. Same on Gameplay (screenshake>autoPause>challenge>Reset>ap-tab-network>autoPause ...; Up from the first row goes DOWN to autoPause) and Controls (ap-settings-back <-> ap-tab-network ping-pong). Audio and Network tabs wrap correctly. Pixels: captures/gntcmenu3-tabland-kbd-6down.png (amber ring on "Network" with Display content and a "Network" info panel). Reproduced in 2 tools / 3 runs.
  - Advisory: in Settings opened with the pad, the hint bar keeps keyboard glyphs ("↑↓ Select ←→ Change Q E Tabs Esc Back", captures/gntcmenu3-nav-pad-settings.png) while the title switched to pad glyphs.
  - Advisory: no clickable pause/menu affordance in play (0 candidate buttons, gntcmenu3-nav.log B8) — mouse-only players cannot reach pause/Settings in-game (StS has a clickable gear). Gameplay itself needs keys, so not must-fix.
- [x] S4 G1.3 response (tools/gntcmenu3-resp.mjs -> captures/gntcmenu3-resp.log; 3 fresh pages, GPU harness 1600x900; independent instrument installed before game scripts = input timeStamp -> first #app-ui mutation -> next rAF; plus app.responses(); 20 presses per source per run; machine shared, page ran 43-45 fps in all 3 runs).
  | source | independent p50/p95/max (runs 1/2/3) | app.responses p50/p95/max (runs 1/2/3) | gate p95<=50, max<=100 |
  |---|---|---|---|
  | keyboard early (0-4 s after title) | 3.5/9.6/10.8 · 12.1/24.5/25.5 · 5.9/21.3/30.1 | 20.4/29.3/29.8 · 29.3/36.5/37.7 · 34.1/47.4/47.9 | PASS x3 |
  | keyboard settled | 4.1/9.0/12.0 · 11.4/34.9/35.8 · 11.7/17.3/17.5 | 23.5/30.7/33.0 · 32.9/**53.5**/60.5 · 28.6/37.7/48.9 | app p95 53.5 in run 2 (43 fps, independent 34.9) — see S4b |
  | gamepad d-pad | 12.1/23.8/28.5 · 29.9/43.2/49.5 · 23.2/35.0/42.4 | 25.9/44.8/48.6 · 36.7/44.7/63.8 · 30.8/44.1/46.7 | PASS x3 |
  | mouse hover | 10.9/19.9/27.3 · 7.7/15.6/22.2 · 8.0/15.8/17.9 | n 0 (not recorded by the game) | independent PASS |
  | mouse click | (instrument caught 1/20) | 22.4/45.5/47.1 · 26.5/47.9/54.3 · 27.9/43.2/50.7 | PASS x3 |
  0 page errors.
- [x] S5 G1.4 render scale / G1.5 fullscreen / G1.9 keep-revert (tools/gntcmenu3-state.mjs -> captures/gntcmenu3-state.log; GPU harness 1600x900 dpr 1; independent frame counter = tasks that drew to the default framebuffer, injected before game scripts; tools/gntcmenu3-sharp.mjs = Laplacian variance of luma in a 3D-only box 500,250,600,350).
  | gate | measured | result |
  |---|---|---|
  | G1.4 buffer via the real slider | 5 x ArrowLeft on Resolution scale: 1.00 -> 0.75, canvas 1600x900 -> 1200x675 two rAFs after the last press | PASS |
  | G1.4 buffer at s = 1.0 / 0.5 / 0.75 / 1.25 / 1.0 (2 frames after set) | 1600x900 / 800x450 / 1200x675 / 2000x1125 / 1600x900 = round(css x s) exactly | PASS |
  | G1.4 HUD rects | 80 HUD leaves, max delta 0 px at every scale | PASS |
  | G1.4 fps (independent / app) | 0.5: 132.3/130.2 · 0.75: 115.4/121.6 · 1.0: 87.6/85 (75.5 on the repeat) · 1.25: 59.1/60.2; sim 59.8-60.6 ticks/s | PASS fps(0.5) >= fps(1.0) |
  | G1.4 pixel detail | Laplacian var 0.5: 28.3 < 0.75: 96.7 < 1.0: 395.6; 1.25 (supersampled) 272.2; captures/gntcmenu3-state-scale-0p5.png visibly softer 3D, HUD crisp | PASS |
  | G1.5 enter | trusted ArrowRight on Display mode -> document.fullscreenElement = HTML in 59.8 ms, row "Fullscreen (browser)", canvas 1600x900 = window | PASS |
  | G1.5 browser exit | document.exitFullscreen (what Esc/F11 does) -> exactly 1 fullscreenchange, setting false, row "Windowed", no keep dialog, canvas = window | PASS |
  | G1.9 scale | leaving Settings after 1.00 -> 0.75: keep-display "Keep these display settings? Resolution scale 75% — render resolution 1200 × 675 · Reverting in 10 s", default focus Keep; timeout at 10.1 s -> scale 1.0 + buffer 1600x900; Revert button -> 1.0/1600x900; Keep -> 0.90/1440x810 | PASS |
  | G1.9 fullscreen | enter then leave the tab -> keep-display "Fullscreen · Reverting in 10 s"; timeout (9.2 s after open) -> fullscreenElement null, setting false, stack back to pause | PASS |
  0 page errors. keyboardLock false in headless (not available) — Esc/Keyboard-Lock path judged in the display harness step.
- [x] S6 G1.8 persistence / corrupt / throwing storage, Reset, G1.10 Exit (tools/gntcmenu3-persist.mjs -> captures/gntcmenu3-persist.log run 2; run 1 was invalid: page.reload() kept `?fresh=1`, which wipes storage — fixed by navigating to the plain URL; tools/gntcmenu3-remap.mjs -> captures/gntcmenu3-remap.log).
  | leg | measured | result |
  |---|---|---|
  | 16 non-default keys (display, gameplay, audio, net) -> reload | 15/16 identical; audio.master.level read 0.16 not 0.33 — discriminated: switching master to Linear re-maps 0.33 -> 0.16 BEFORE the reload (same loudness, remap.log), 0.16 then survives the reload | PASS (probe artifact) |
  | effects re-applied at boot | canvas 1280x720 (0.8), scheduler source "uncapped", limit 30, fps meter visible "26 fps", fullscreen false; Display tab reads "Render resolution 1280 × 720 (80%)", "V-Sync Off", "30 fps", "Windowed" + "Fullscreen lasts for this visit" | PASS |
  | change then immediate navigation (inside the 150 ms debounce) | 0.65 survives | PASS |
  | Reset to defaults (Display tab, mouse) | confirm "Reset Display settings? Every setting on this tab goes back to its default." default Cancel; OK -> 1.0 / V-Sync On / Unlimited / FPS off, canvas 1600x900, source raf; audio untouched (per-tab scope) | PASS |
  | corrupt: garbage JSON / truncated / `null` / array | defaults, loadReport "recovered", `echoes.settings.corrupt` copy kept, toast "Settings were reset — the saved file was unreadable" (captures/gntcmenu3-persist-corrupt-garbage-json.png), 0 page errors, next change writes clean v1 JSON | PASS |
  | wrong types (scale "abc", limit 999, vsync "yes", challenge "godmode", master 7) | per-key repair: 1.0 / 0 / true / standard, master clamped to 1.0; valid showFps kept; loadReport lists 4 invalid keys; no toast | PASS (advisory: silent repair) |
  | newer version (v 99) | defaults + toast "Your settings were saved by a newer version of Echoes — using defaults for now" | PASS |
  | localStorage getter throws | boots, storage "memory", Settings footer "Settings can't be saved in this browser mode", live change 1520x855, 0 errors (captures/gntcmenu3-persist-throwing.png) | PASS |
  | G1.10 Exit | confirm "Exit Echoes? Your progress and settings are saved." default Cancel; OK -> window.close() called once (stubbed as a tab that cannot close) -> farewell in 352 ms ("Thanks for playing Echoes. Your browser keeps this tab open — close it whenever you like. Your progress is saved."), ring 1, sim paused, music menu -> silence, settings blob flushed (0.85); Return -> title, scale 0.85 intact, music back to "menu" | PASS |
  0 page errors in every leg.
- [x] S7 G1.6 V-Sync / G1.7 frame limit (display harness = headful ANGLE D3D11 "AMD Radeon(TM) Graphics", window 1600x900 -> css 1586x806, dpr 1.5; panel measured on a blank page in the same browser = 163.9 Hz; `rafhz --headful` on the camp = 82.6 Hz (GPU-bound, frame p50 12.1 ms). Independent frame counter = tasks that drew to the default framebuffer. Tools: tools/gntcmenu3-pace.mjs (captures/gntcmenu3-pace-s05.log + -copy-*.png), tools/gntcmenu3-limit.mjs (per-second timelines, Unlimited bracketing: captures/gntcmenu3-limit-hf1600-s05.log, -hf1600-s05-b.log, -gpu-s05.log, -hf900-s05.log). Machine heavily shared: 20 chrome.exe of other agents; the Unlimited cap of the SAME page swung 56 -> 124 -> 64 fps between 5 s samples minutes apart.)
  | measurement | result |
  |---|---|
  | limit 30 (13 samples, on/off, 3 harness runs) | 29.8-30.4 fps, sim 59.7-60.9 ticks/s — PASS (+-1%) |
  | limit 60 (quiet samples) | 59.3-60.1 fps (hf1600 r1/r2, GPU harness 60.1/60.0); loaded samples 55.5-57.7 track min(60, cap) — PASS |
  | limit 120 / 144, V-Sync On, quiet window (bracket r0: Unlimited 123.2 / 123.9 / 121.2) | 120 -> 119.5 (ratio 0.996), 144 -> 126.0 (cap-bound, 1.017); GPU harness 120 -> 93.7 vs cap 90 (1.041), 144 -> 86.2 (0.958) — PASS |
  | limit 120 / 144, V-Sync Off | 0.59-1.00 of the preceding Unlimited sample, always inside the [before, after] Unlimited bracket except one (144 -> 58.1 vs 63.7/64.9); the cap never exceeded 120 with V-Sync Off during my runs, so a binding Off limit could not be isolated — not separable from load (r2 measured 118.0-119.5 for Off/120 on a quiet machine) |
  | first-run "limit 120 renders 57 while Unlimited renders 95" | discriminated: the rate ramps over 3-5 s after leaving a 30/60 limit (per-second 66 -> 64 -> 87 -> 93) — GPU clock ramp/contention, not the limiter; bracketed runs with 5-7 s settle do not reproduce it |
  | G1.6 On | source "raf" in every On sample; rendered <= 126 fps < panel 163.9 x 1.02 — PASS |
  | G1.6 Off | source "uncapped"; workMsP50 6.7-12.1 ms >= 0.8 x 1000/163.9 = 4.9 ms -> case (b) (GPU-bound); Display tab reads "V-Sync Off · Your device renders about 84 fps here — uncapped can't go faster than your GPU" with stats().renderedFps 84 in the same read (captures/gntcmenu3-pace-s05-copy-off-0.png) — PASS; On/Off present cadence identical on this device (p50 interval 9.3-10.2 ms both), honestly labelled |
  | copy honesty | "Frames paced to your display (~170 Hz)" / "Display ~167-170 Hz" vs panel 163.9 (+2-4%); limit above cap: "Rendering 94 fps · your device renders about 94 fps here, below the limit"; headless GPU harness reads "~42/~83/~164 Hz" depending on load (no real display — advisory only) |
  0 page errors in every run.
- [x] S8 fullscreen on the display harness + resize (tools/gntcmenu3-fs.mjs -> captures/gntcmenu3-fs.log, -fs-on.png; tools/gntcmenu3-altenter.mjs / -altenter-hf.mjs / -altenter2.mjs -> captures/gntcmenu3-altenter*.log).
  - Headful, real ArrowRight on Display mode: fullscreenElement set, row "Fullscreen (browser)", inner 1386x726 -> 1707x960 = canvas css, buffer 2432x1367 = 1707 x 1.5 x 0.95 (+-1) — PASS. Leaving (exitFullscreen): setting false, "Windowed", canvas back to 1386x726, buffer 1975x1034, scale 0.95 kept — PASS.
  - Window resize via CDP (1100x700 / 1600x900 / 900x600): canvas css = inner every time, buffer = css x dpr 1.5 x 0.95 within 1 px (1547x863, 2260x1148, 1262x721); ring stays 1 — PASS.
  - Fullscreen then reload: Windowed, fullscreenElement null, "Fullscreen lasts for this visit" note, scale 0.95 restored — PASS.
  - Alt+Enter (headless GPU harness): toggles on/off at the title, in Settings and in play, setting mirrors each time — PASS. Headful: the first Alt+Enter enters; after that NO CDP key event reaches the page at all (window capture listener installed before game scripts logged only the first Enter) — puppeteer/CDP input is not delivered to a headful fullscreen window, so headful Esc/Alt+Enter-in-fullscreen legs are unmeasurable (not a game defect). keyboardLock reported false in both harnesses (Keyboard Lock not engaged), so Esc in fullscreen is the browser's.
- [x] S9 G1.11 journey / core loop / legacy boots / focus loss (tools/gntcmenu3-journey.mjs -> captures/gntcmenu3-journey.log, -afterfight.png, -backtitle.png; GPU harness + autoplay). 0 FAIL.
  - Fresh profile: Enter on New Game -> app "playing" at 150 ms, player moving under held W at **348 ms** (gate <= 1000) — PASS.
  - Real input: hold W -> inPortal, E at tick 158 -> combat room 1 at tick 170 (no picker); right mouse held + 1-4 + A/D -> **room 1 cleared by real input in 14.3 s** -> phase reward — PASS (no killAllEnemies).
  - Pause > Quit to Title -> confirm (default "Keep Playing") -> title with 7 rows, default focus **Continue** ("Autosave · Level I · The Hollow Wood · Room 1 · just now"); title after a run: rAF 93/s = rendered 92.8 fps (one loop), 1 music player ("menu"), one ArrowDown = one step — PASS. New Game again: playing in 45 ms, fresh world (run inactive, wallet 0); second core loop portal -> combat -> reward — PASS.
  - Legacy/menu-skip boots (6 s after load, +500 ms): ?menu=0&seed=7, ?seed=5, ?room=kill_all, ?room=defend, ?run=1 (combat), ?scene=arena, ?variant=2, ?layout=4&room=kill_all, ?level=2 (campaign at Level 2, combat) -> playing, no title, +30..32 ticks; ?seed=5&menu=1 -> title, tick frozen 0; 0 page errors each — PASS.
  - Focus loss from live SP play (blur + hidden): pause menu opens, 1 tick elapsed in 1 s, master bus -999 dB (muted); focus back: menu stays with focus on Resume (explicit resume, ring 1); Esc -> 60 ticks/s — PASS.
- [x] S10 populated-profile layout + clipping audit (tools/gntcmenu3-layout2.mjs -> captures/gntcmenu3-layout2.log + -<w>-<screen>.png at 1024x576 / 1280x720 / 2560x1440; tools/gntcmenu3-titlesave.mjs -> captures/gntcmenu3-titlesave.log, -titlesave-<w>.png at 1024x576 / 1152x648 / 1280x720 / 1366x768 / 1600x900).
  - FINDING MENU-R3-F3 (title WITH a save at 1024x576 — the screen every returning player sees): the Continue row now carries a 2-line caption ("Autosave · Level I · The Hollow Wood · Room 1 · just now", 89.6 px tall) and the 7-row column no longer fits: the Exit row (y 495.1-538.6) is overlapped by the hint bar `.ap-hint` (y 526.5-550.5) by **12.1 px** — elementFromPoint at the Exit row's lower edge returns `ap-hint`, and pixels show "↑↓ Select Enter Choose v0.5.94" drawn across the Exit plate (captures/gntcmenu3-layout2-1024-title-with-save.png); the ECHOES logo touches the top edge (y = -0.1). 1152x648 and larger: 0 overlap (Exit bottom 574.6 vs hint top 598.5). The rect audit alone passes (the hint is not a [data-nav] item) — G1.1 "pairwise non-overlapping / nothing clipped" fails on pixels + hit-test.
  - MENU-R3-F1 re-reproduced on the populated profile (pause-after-continue at 1024x576: pz-settings / pz-lobby / pz-savequit / pz-quit text over the row box by 5.0 px); 1280x720 and 2560x1440: 0 clipped rows.
  - Every other screen on the populated profile (saves list, records, 5 settings tabs, mp-menu, saves-save) at 1024 / 1280 / 2560: 0 rect issues (13.33 px hits are the UA font of `<button>` wrappers; their visible text is >= 16.5 px), 0 clipped rows. Save-slot line "Level I · The Hollow Wood · Room 1 of 8 · Hunt…" is ellipsis-truncated in the list with the full text in the detail panel (captures/gntcmenu3-layout2-1024-saves-load.png) — acceptable (M2's screen).
- [x] S11 G1.12 palette (tools/gntcmenu3-palette.mjs -> captures/gntcmenu3-palette.log, -palette-<screen>.png; analyze.mjs --box per plate): 86 plate rects over loading / title / 5 settings tabs / confirm / farewell / keep-display: Ember(danger) 0, Heal 0, violet 0 px. Backdrop allowance: title full frame Ember 105, keep-display 867 (<= 952 x 1.1 = 1047) — PASS.
- [x] S12 G1.13 gesture hook (tools/gntcmenu3-gesture.mjs -> captures/gntcmenu3-gesture.log; no autoplay flag; unlock wrapped on the live audio service before the press): Esc -> unlock called but audio stays "locked" (Esc grants no activation — honest); one KeyZ -> "running"; one click -> unlock via pointerdown+mousedown -> "running"; one touch tap -> pointerdown/touchend/mousedown -> "running". CDP DOMDebugger.getEventListeners(window): the FIRST capture listener for keydown, pointerdown, mousedown and touchend is the same passive function (script 35, line 53) — one shared gesture hook registered first — PASS (script URL not resolved by my probe). One press on "Press any key or click" is never eaten: title 0.40-3.48 s after a single key/click/Enter (while still "Lighting the hearth…" the press is queued) (tools/gntcmenu3-anykey.mjs -> captures/gntcmenu3-anykey.log).
- [x] S13 production build (npx vite build --outDir dist-gntcmenu3; npx vite preview --port 4320 = my PID 84776, killed with taskkill after the legs; port 4320 free; parent 57336 gone). Smoke (cert-capture --url :4320) exit 0, 0 PAGEERROR. Nav A+C on prod (captures/gntcmenu3-nav.log run 2): identical to dev — MENU-R3-F2 reproduces (Display/Gameplay/Controls ArrowDown cycles 46 presses never home); everything else PASS. MENU-R3-F3 on prod: Exit row vs hint overlap 12.1 px, logo y -0.1 (captures/gntcmenu3-titlesave-prod.log). MENU-R3-F1 on prod: 4 pause rows 5.0 px over (captures/gntcmenu3-clip-prod.log). Journey on prod (captures/gntcmenu3-journey-prod.log): 0 FAIL — New Game -> moving 669 ms, portal -> combat, room 1 cleared by real input 14.3 s, title leak check, second loop, 10 legacy boots, focus loss.
- [x] S14 G1.3 re-measure (captures/gntcmenu3-resp.log = runs 4-6; first set kept as captures/gntcmenu3-resp-run1.log). Independent instrument PASS in 30/30 windows (p95 8.4-34.9 ms). app.responses(): keyEarly p95 50.9 / 57.6 / 36.9, keySettled 51.4 / 42.5 / 46.3, pad 44.0 / 41.3 / 29.8, click 39.6 / 45.5 / **59.9**; max <= 68 ms in every window (gate max <= 100 holds everywhere). Over both sets: 5 of 24 app windows exceed p95 50 by 0.9-9.9 ms, all while the page rendered 34-76 fps on a machine running ~20 other Chrome processes; the game's own metric sits ~20 ms above the first-rAF instrument (it closes one frame later). r1's reproducible boot hitch (max 131-206 ms) is gone. Judged PARTIAL (load-bound), advisory — not must-fix.
- [x] S15 builder-claim cross-check: fix-M1-r1 "keyboardEarly p95 39.9-40.2 / max 40.4-45.2" — holds on quiet windows only (my app p95 29.3-57.6, max <= 68); "Network tab 42 px at 1024x576" — confirmed (min hit 42 on every settings tab). build-CAMPAIGN D13 "Records fits 1024x576" — confirmed (0 issues). build-CAMPAIGN made no 1024x576 check of the pause menu after adding "Quit to Lobby" (src/ui/menu/pause.js last changed in 259ef77) nor of the title after the Continue caption gained "Level I ·" — both regressed (F1, F3).

## 2. Benchmark scoring (blind checklist of section 1 vs Echoes v0.5.94)

| # | Result | Evidence |
|---|---|---|
| B1 | MET | fresh: New Game focused (ring 1); with a save: Continue focused (journey J4, layout2) |
| B2 | MET | Load disabled + "No saved games yet"; with saves: list + detail panel (Where/Saved/Played/Party/Skills/Run/File) |
| B3 | PARTIAL | arrows/WASD/Enter/Space/Esc/Backspace all work, title wraps; Settings Display/Gameplay/Controls cursor never wraps home and lands on an unselected tab (F2) |
| B4 | MET | hover = focus, single ring, click, right-click = back, Back buttons (nav B1-B7) |
| B5 | PARTIAL | d-pad/stick/A/B/LB/RB/Start all work, repeat 402 ms then 83-103 ms; glyphs switch on the title but Settings keeps keyboard glyphs |
| B6 | MET | Esc/B one level from every depth; root no-op |
| B7 | MET | focus restored on Settings/Records/Multiplayer/Exit/pause Settings/Quit to Lobby |
| B8 | PARTIAL | Tab x12 stays in the menu, 50 random actions 0 ring violations; but F2 puts the cursor on a tab whose content is not shown |
| B9 | MET | ui_move / ui_confirm / ui_back cues on the ui bus |
| B10 | MET | instant preview + Keep/Revert 10 s for scale and entering fullscreen; timeout/Revert/Keep all correct |
| B11 | MET | buffer = css x s exactly, HUD 0 px drift, Laplacian 28 -> 97 -> 396, fps 132 vs 88 |
| B12 | MET | fullscreenElement in 60 ms, one fullscreenchange flips to Windowed, canvas = window, resize tracked |
| B13 | PARTIAL | truthful browser model (raf vs uncapped) with measured copy; on this GPU-bound device no visible cadence difference (the honest case-b copy says so) |
| B14 | MET | 30/60 within 1%; 120/144 within 5% of min(limit, cap) in quiet windows |
| B15 | MET | 16 keys + effects survive reload; 6 corrupt variants -> defaults/repair, 0 errors; throwing storage -> memory + note |
| B16 | MET | per-tab Reset behind a confirm (default Cancel) |
| B17 | MET | Exit confirm -> window.close attempt -> honest farewell in 352 ms, music silence, Return works |
| B18 | PARTIAL | independent p95 <= 35 ms; game metric p95 > 50 in 5/24 loaded windows (max 68) |
| B19 | NOT MET | 1024x576: title with a save — hint bar over the Exit row 12.1 px (F3); run pause menu rows clipped 5 px (F1) |
| B20 | MET | values inline, Left/Right/chevrons adjust, readouts update |
| B21 | MET | every Display row has a sub-line; info panel >= 1180 px wide |
| B22 | MET | blur/hidden -> pause, 0-1 ticks, master muted; explicit resume |
| B23 | PARTIAL | prompt bar on every screen; pad glyphs only on the title |
| B24 | MET (timing) | New Game -> playing 150 ms, moving 348 ms, no page errors (fade not inspected frame by frame) |
| B25 | MET | pause > Settings (same values; fullscreen/scale apply to the running game) |

Score: **18 met / 6 partial / 1 not met of 25**.

## 3. PLAN §7 M1 gates (re-measured)

| Gate | Result | Key numbers |
|---|---|---|
| G1.1 Layout | **FAIL** | rect audit 0 issues on 15 fresh + 11 populated screens x 3 sizes, BUT 1024x576 title-with-save: Exit row overlapped 12.1 px by the hint bar, logo y -0.1 (F3); run pause rows 5 px over (F1, INT/CAMPAIGN screen) |
| G1.2 Navigation | PARTIAL (letter met; F2) | all screens reachable/exitable by keys, mouse, pad; back = one level; ring 1 always; restore OK; 50 random 0 violations; Settings cursor-order defect F2 |
| G1.3 Response | PARTIAL (load-bound) | independent p95 8-35 ms; app p95 29.3-59.9, max <= 68; 5/24 windows > 50 at 34-76 fps |
| G1.4 Render scale | PASS | exact buffers, HUD 0 px, fps 132 vs 88 |
| G1.5 Fullscreen | PASS | 60 ms enter, 1 fullscreenchange exit sync, canvas = window |
| G1.6 V-Sync | PASS (case b) | On raf <= panel; Off uncapped, work 6.7-12.1 >= 4.9 ms, copy "about 84 fps" = renderedFps 84 |
| G1.7 Frame limit | PASS (noise noted) | 30: 29.8-30.4; 60: 59.3-60.1; 120 -> 119.5 at cap 124; 144 cap-bound 126 |
| G1.8 Persistence | PASS | 16 keys, effects re-applied, 6 corrupt variants, throwing storage |
| G1.9 Keep/Revert | PASS | 10.1 s timeout revert, Revert, Keep, fullscreen revert 9.2 s |
| G1.10 Exit | PASS | farewell 352 ms, silence, Return with settings intact |
| G1.11 Journey | PASS | moving 348 ms (prod 669), room 1 by real input 14.3 s, 10 legacy boots |
| G1.12 Palette | PASS | 86 plates 0/0/0; backdrop Ember 105-867 <= 1047 |
| G1.13 Gesture hook | PASS | key/click/touch each unlock; shared passive hook first capture listener |

## VERDICT: FAIL — 3 must-fix

- **MENU-R3-F1** pause menu in a run clipped at 1024x576 (4 rows' text 5.0 px over their plates, last row cut 3.6 px) since "Quit to Lobby" made it 7 rows — suspect src/ui/menu/pause.js, src/app/style.js. Repro: 1024x576, New Game, cmd startRun, Esc -> tools/gntcmenu3-clip.mjs.
- **MENU-R3-F2** Settings cursor order (persisting from the r2 finding MENU-R2-F1): ArrowDown/d-pad from the last row goes to the unselected "Network" tab, then skips Resolution scale + Display mode forever; ArrowUp from the first row lands on "Gameplay"; Enter there switches tabs. Display, Gameplay, Controls tabs; dev + production — suspect src/app/nav.js, src/app/screens.js, src/ui/menu/settings.js. Repro: tools/gntcmenu3-tabland.mjs.
- **MENU-R3-F3** title with a save at 1024x576: hint bar overlaps the Exit row by 12.1 px (hit-test at the Exit row returns `.ap-hint`), logo at y -0.1 — suspect src/ui/menu/title.js, src/ui/menu/hints.js, src/app/style.js. Repro: tools/gntcmenu3-titlesave.mjs.

Advisories: G1.3 game metric p95 > 50 in 5/24 loaded windows (max 68) and hover still not self-recorded; Settings hint bar keeps keyboard glyphs after pad input; no clickable pause affordance for mouse-only players in play; levels-screen sub-line 13.5 px at 1024x576 (CAMPAIGN); per-key repair of a hand-edited settings file is silent; V-Sync-Off binding limits not isolatable on this shared machine; Keyboard Lock never engaged (keyboardLock false), so Esc in fullscreen is the browser's.

Own processes: vite preview PID 84776 on :4320 killed (port free); no net server started. Nothing committed; no src/** edited.
