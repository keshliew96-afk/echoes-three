STATUS: PARTIAL
(verdict pending)

# Critic — MENU module — round 2

Role: harsh critic, fresh context. Judged only the running game (captures, console logs, debug API, storage, DOM rects). No src/** read for judgement.

## Step 0 — BLIND BENCHMARK CHECKLIST (written before any Echoes capture was viewed)

Reference systems: Hades (Supergiant), Celeste, Hollow Knight, Slay the Spire, Unreal/Unity shipped-game settings conventions.

### A. Title screen layout & feel
- A1. Hades: title has a single vertical column of options (Play/Continue, Options, Credits, Quit) with a large logo above; selected row has a distinct highlight (brighter text + ornament/arrow), unselected rows are dimmed but readable. Nothing overlaps the logo at any 16:9 resolution. Background is animated (parallax/particles) so the screen never looks frozen.
- A2. Celeste: menu column is centred, letter-spaced; the selected item is scaled up and coloured; there is an audible tick on every cursor move and a distinct "confirm" and "back" sound. A short hold-to-confirm on destructive actions (Delete Save).
- A3. Hollow Knight: options are large serif labels, cursor is an ornamental "fleur" on both sides of the selected item; items animate in on first show (fade/slide ~0.3 s); the whole menu scales with resolution so at 1024x576 and 2560x1440 it occupies the same relative area (no tiny text at 1440p, no clipped text at 576p).
- A4. Slay the Spire: "Continue" only appears when a save exists; "Play" is the first/default item; disabled items (no save) are greyed AND non-focusable or show a reason.
- A5. All four: every item is reachable by keyboard (Up/Down/W/S), by mouse hover+click, and by gamepad d-pad/left-stick; hover moves focus (mouse and keyboard focus are the same cursor, not two competing highlights).
- A6. All four: the version string is visible in a corner of the title screen.
- A7. Focus is always visible: exactly one focused item at a time, with a contrast ratio well above 3:1 vs unfocused; focus wraps (Down from last goes to first) or stops with a clear end — never disappears.
- A8. Responding to input within one frame; menu actions (cursor move) produce a visible change within <= 50 ms (Hades and Celeste feel instantaneous; >= 100 ms is what players call "laggy").

### B. Navigation & back consistency
- B1. Esc / B / Circle always goes one level up (Settings -> Title). Esc on the title root does nothing or opens the Exit confirm — never closes/breaks the page.
- B2. Gamepad: d-pad and left-stick both navigate; A/Cross confirms; B/Circle backs; repeated input has debounce/repeat-delay (~250 ms initial, ~80 ms repeat in Hades/Celeste) so holding the stick does not fly through the list.
- B3. No focus traps: from any submenu, a finite number of Back presses returns to the title root; Tab (browser) does not escape into browser chrome in ways that break the game.
- B4. Mouse-only: every action, including Back, has a clickable control (Back button/X) — a mouse-only user never needs the keyboard.
- B5. Sub-menus open in place (Hades) or slide in (Celeste) with the first item pre-focused; returning restores the previously focused parent item (Hollow Knight/Hades restore cursor position on back).
- B6. Input device switch is seamless: pressing a gamepad button after mouse use hides the mouse cursor / switches prompt glyphs (Hades, Celeste); not required for a browser game but the focus must not get "lost" on device switch.

### C. Display settings (Unreal/Unity conventions + the four games)
- C1. Resolution / render scale: changing it visibly changes sharpness (pixel detail) immediately (instant preview) or on Apply; the drawing buffer size actually changes; UI text stays at CSS size (not downscaled with the 3D buffer) — Unity URP "Render Scale" and Unreal "r.ScreenPercentage" behaviour.
- C2. Fullscreen / windowed: a toggle that actually enters fullscreen; Esc (browser exits fullscreen) is synced back to the UI state — the toggle never shows "Fullscreen" while the page is windowed; the canvas resizes to the new viewport without letterbox artefacts; the aspect ratio is preserved (no stretched picture).
- C3. Fullscreen requires a user gesture in browsers — the UI must handle rejection (promise reject) gracefully, reverting the toggle and showing a message rather than silently lying.
- C4. V-Sync: on desktop, a real V-Sync toggle changes tearing/present cadence. In a browser this cannot be done (rAF is always V-Synced); an honest implementation labels it as such ("Browser presents on display refresh; V-Sync cannot be disabled") and/or maps it to something measurable (e.g. "Frame pacing: display-synced vs timer-driven"). A fake toggle that changes nothing is a failure.
- C5. Frame limit: 30 / 60 / 120 / Unlimited; measured rendered fps within +-5% of the cap (on a 60 Hz display, 120 and Unlimited both show ~60 because rAF caps at refresh — the UI must say so honestly, e.g. "(display 60 Hz)"). The fixed-tick simulation must remain at 60 Hz regardless of the render cap (Celeste/Hades sims are frame-rate independent).
- C6. Apply/Revert: resolution/fullscreen changes that could leave the screen unusable have a "Keep these settings? (15 s)" revert timer (Unreal/Unity/Hades convention) OR are instantly reversible with Esc. At minimum: a change never leaves the player stuck.
- C7. Settings persist: closing the tab / reload restores every setting; the values shown in the UI after reload equal the stored ones; the effect (render scale, cap) is re-applied on boot, not just displayed.
- C8. Corrupt storage: garbage / truncated / wrong-type JSON in the settings key -> defaults load, no crash, no page error, the key is rewritten clean.
- C9. "Reset to defaults" exists and works with one action.
- C10. Every control shows its current value (not just a button) and updates immediately when changed via any input device; sliders have keyboard Left/Right steps; toggles show ON/OFF state text, not only colour.
- C11. Focus handling: when the tab loses focus (blur/visibilitychange), audio ducks or pauses and the sim pauses (Hades, Celeste pause on focus loss); on return nothing has "exploded" (no giant delta-time jump).

### D. Exit flow
- D1. Hades/Celeste/HK: Quit asks "Are you sure?" then quits to desktop. A browser cannot close a tab it did not open (window.close() is a no-op for user-opened tabs). Honest browser equivalent: "Exit" -> confirm -> show a "You can now close this tab" end screen / return to title with state saved — labelled honestly, never a button that does nothing.
- D2. Exiting mid-run from the pause menu saves (Hades auto-saves on quit; StS saves every action) — no data loss on Exit.

### E. Core loop safety
- E1. New Game from the title starts a run, the sim ticks (tick counter increases), the HUD is present, no page errors; the debug state matches the in-run state.
- E2. Returning to title from a run and starting again does not double-register listeners (no double input, no double audio).

### F. Polish items a player would notice
- F1. Text readable: min ~14 px CSS at 1024x576, and no text below ~11 px anywhere.
- F2. No element overlaps another (DOM rects of interactive items do not intersect).
- F3. Consistent language: same verbs ("Back" vs "Return"), same casing.
- F4. Hover/click sounds and transitions; a selection pulse; no jarring pop-in.
- F5. Settings sub-menu is organised (Display / Audio / Controls tabs or sections) with headers.

Scoring: each item met / partial / not met with evidence. Total items: 8 + 6 + 11 + 2 + 2 + 5 = 34.

## Steps completed
- [x] Step 0: blind checklist written (this section) — before reading any capture.

## Step 1 — build under test + smoke (DONE)
- HEAD b21aac1 (v0.5.87), branch gauntlet. Dev server 5199 up. Smoke: `node tools/cert-capture.mjs shot gntcmenu2-title-1600 --actions tools/actions/gntcmenu2-title.json` exit 0, 0 PAGEERROR, GOTO 12.1 s; loading card -> KeyZ -> title (stack ["title"], tick 0, simPaused true, ring 1, focus ap-title-new). Title rows: New Game, Load Game (disabled "No saved games yet"), Multiplayer, Settings, Records, Exit. captures/gntcmenu2-title-1600.png, gntcmenu2-loading-1600.png.

## Step 2 — G1.1 layout at 1024x576 / 1600x900 / 2560x1440 (DONE)
Tool tools/gntcmenu2-layout.mjs (GPU harness, items scoped to the TOP screen's `[data-screen]` root; per item: viewport containment, pairwise overlap, min font, hit target, elementFromPoint hit-test; ring count). Log captures/gntcmenu2-layout.log, rects captures/gntcmenu2-layout-<w>-<screen>.json, pixels captures/gntcmenu2-layout-<w>-<screen>.png.
| size | screen | items | issues | min font px | min hit px | ring |
|---|---|---|---|---|---|---|
| 1024x576 | title / display / audio / gameplay / controls / network / confirm / farewell | 6 / 12 / 28 (15 visible, 9 below the fold + scroll) / 10 / 7 / 11 / 2 / 1 | 0 on every screen | 16.5 | 42 (title 43.5) | 1 |
| 1600x900 | same 8 screens | 6 / 12 / 28 / 10 / 7 / 11 / 2 / 1 | 0 | 18.33 | 46.7 (title 53.3) | 1 |
| 2560x1440 | same 8 screens | 6 / 12 / 28 / 10 / 7 / 11 / 2 / 1 | 0 | 29.33 | 74.7 (title 85.3) | 1 |
- 0 page errors at every size. Pixels inspected: 1024 title (logo, 6 rows, hint bar + v0.5.87, nothing clipped, party visible right of the column), 1024 Display tab (info panel hidden below 1180 px wide, 5 rows + measured line + footer, all readable), 1024 Audio tab (scroll box, rows 6-12 below the fold), 2560 title and Display (scaled 1.5x, still one column, nothing tiny), 1600 Display.
- Observation A (advisory, checked further in Step 5): the Display tab's "display ~N Hz" estimate is the render rate when the page is GPU-bound: headless 2560x1440 read "Display ~33 Hz · rendering 21 fps" and the frame-limit row "Your display caps this at ~33 fps"; 1600x900 read "~84 Hz" — on a ~165 Hz panel.
- Observation B (checked in Step 3): the Audio tab's ArrowDown cycle wraps from the last row to `au-master-level` and at 1024x576 and 2560x1440 that row was outside the scroll box's visible area 260 ms after the press (at 1600x900 it was in view).

## Step 3 — G1.2 navigation: keyboard / mouse / mocked gamepad / random / pause (DONE)
Tools tools/gntcmenu2-nav.mjs (captures/gntcmenu2-nav.log) and tools/gntcmenu2-nav2.mjs (captures/gntcmenu2-nav2.log; my net server on 7840 for the Multiplayer legs). GPU harness 1600x900, real puppeteer keys/mouse, mocked `navigator.getGamepads`.
- Keyboard: ArrowDown from New Game visits new > multiplayer > settings > records > exit > new (Load Game disabled + skipped); W/S move; Enter opens Settings with the first row focused; E/Q/PageDown switch tabs; Esc from Settings -> title with the focus restored on the Settings row; Esc at the root = no-op (stack + focus unchanged); Backspace = back; Multiplayer / Records / Settings / Exit: Enter opens (mp-menu / records / settings / confirm), Esc returns exactly one level with the focus back on the row; a render-scale touch then Esc -> keep-display (default Keep), Esc there = Revert (scale back to 1.0) one level; browser Tab key: ring stays 1; 6x Enter on Settings -> exactly one settings screen (scale unchanged), 6x Esc -> title. Ring == 1 on every sample.
- Audio tab (M3 rows in the M1 frame): ArrowDown cycle of 12 ids, every focused row inside the scroll box incl. after the wrap (300 ms settle; Step 2's out-of-view reading was a 260 ms race on a loaded run). Mouse wheel scrolls the list (scrollTop 0 -> 400).
- Mouse only: a first stationary pointer event after keyboard use does not steal the focus; real movement does (Records, Exit); click opens Settings; tab click switches; hover on a settings row focuses it; right-click = back; Back button clickable (Settings, mp-menu "Back", records "Back"); Exit click -> confirm with clickable Cancel/OK; Cancel -> title.
- Gamepad only: d-pad 13/12 move; left stick = exactly one step; stick held 1.3 s -> first repeat 405 ms then 86-124 ms (10 steps); A opens Settings; RB/LB = Audio/Display; d-pad left/right on Resolution scale 1.00 -> 0.95 (buffer 1600x900 -> 1520x855) -> 1.00; left stick left/right likewise; B = back with focus restored; B at the root = no-op; Exit -> confirm default Cancel, B cancels; pad press after a mouse hover continues from the hovered row (one cursor); Start opens pause in play, A on Settings -> pause>settings, B -> pause (focus on Settings), B -> play; P opens pause.
- Multiplayer (server 7840 online): mp-menu rows Host / Host Public / Join by Code / Quick Match / Back enabled, default focus Host; Join -> mp-join (code field focused), Esc -> mp-menu, Esc -> title; typing ABCD then 2x Esc -> title; Host -> lobby, Esc -> "Leave / Stay" confirm, Leave -> title in 2 steps. (Without a server the four rows are disabled and Back is the only focusable item — honest.)
- 50 random actions (keys + pad): screens visited confirm/title/mp-menu/records, ring violations 0, 0 Esc needed to get home (already on the title). Pause in play: Esc opens (tick 144 -> 144 while open), Esc closes (ticks resume 176 -> 207 in 0.5 s).
- 0 page errors in both tools.
- FINDING MENU-R2-F1 (cursor order in Settings, keyboard AND pad): on the Display tab ArrowDown from the first row runs renderScale > mode > vsync > frameLimit > showFps > Reset > **ap-tab-network** (the LAST tab, while the Display tab is selected) > **vsync** > frameLimit > showFps > Reset > ap-tab-network > vsync ... — rows 1-2 (Resolution scale, Display mode) and the Back button are never reached again going down; ArrowUp from the first row lands on **ap-tab-gameplay** (not the selected tab). Pixels: captures/gntcmenu2-tabland-6down.png (ring on "Network" in the tab strip while the Display content is shown), -7down.png (ring on V-Sync). Reproduced 3/3 (nav.log A7b, nav2.log 3c, tabland capture). Back IS reachable with ArrowRight from Reset (2-D footer) and by Esc, so this is not a trap — it is a cursor-order defect a pad/keyboard player feels every time they overshoot the bottom of a tab (Hades / Celeste / HK wrap to the first row; none put the cursor on an unselected tab).

## Step 4 — G1.3 input -> visual response (DONE)
Tool tools/gntcmenu2-resp.mjs (captures/gntcmenu2-resp.log): 3 fresh pages, GPU harness 1600x900; independent instrument = input event timestamp -> first rAF after the first DOM mutation (installed before game scripts), plus `app.responses()`. Machine shared with other agents (fps 47-66 in run 1, 99-119 in runs 2-3).
| source / window | n | independent p50 / p95 / max | app.responses p50 / p95 / max | gate p95<=50, max<=100 |
|---|---|---|---|---|
| keyboard EARLY +0.7..+5.1 s after the title, run 1 / 2 / 3 | 20 each | 15.6/34.3/44.3 · 17.0/30.1/30.5 · 15.7/18.2/20.5 | 28.4/43.7/47.1 · 28.7/38.3/54.9 · 24.8/28.7/28.8 | PASS x3 (r1 must-fix F1 was p95 86-120 / max 131-206 — fixed) |
| keyboard settled, run 1 / 2 / 3 | 20 each | 23.7/29.3/35.5 · 19.4/25.1/27.2 · 17.7/21.4/22.2 | 38.2/50.1/51.3 · 28.4/40.2/50.5 · 28.2/34.6/38.3 | PASS (run 1 app p95 50.1 at 54 fps under load, independent 29.3) |
| gamepad (mock d-pad), settled | 20 | 33.6/44.3/46.2 | 33.8/40.3/40.3 | PASS |
| mouse hover (real movement between two rows) | 20 | 45.6/56.3/57.1 | not recorded by app.responses (n 0) | p95 6 ms over on a 56 fps loaded run (max 57 < 100); re-measured in Step 4b |
| mouse click (Settings open / Back) | 20 | 26.7/44.3/46.0 | 30.3/49.8/50.0 | PASS |
Early-window long tasks are the boot's own (2.9 s / 1.2 s / 0.9 s at +8..+13 s of page life, before the first press); none > 100 ms during the press windows in runs 2-3. 0 page errors.

## Step 5 — G1.4 / G1.5 / G1.8 / G1.9 / G1.10 state probe (DONE; follow-ups in Step 5b)
Tool tools/gntcmenu2-state.mjs (captures/gntcmenu2-state.log), GPU harness 1600x900 dpr 1, real puppeteer keys.
| gate | measured | result |
|---|---|---|
| G1.4 buffer = round(css x min(dpr,2) x s) | s 0.5 -> 800x450, 0.75 -> 1200x675, 1.0 -> 1600x900, 1.25 -> 2000x1125, 1.5 -> 2400x1350; each applied in 1 frame | PASS |
| G1.4 HUD rects +-1 px | 40 HUD leaves, max delta 0 px at every scale | PASS |
| G1.4 pixel detail | Laplacian variance 0.5: 20.8 < 0.75: 68.1 < 1.0: 307.4 (captures/gntcmenu2-scale-0p5.png .. -1p5.png) | PASS |
| G1.4 fps(0.5) >= fps(1.0) | 129.7 vs 90.8 (1.5: 56.0) | PASS |
| G1.5 enter | trusted ArrowRight on Display mode -> fullscreenElement in 13.1 ms, setting true, row "Fullscreen (browser)", canvas 1600x900 = inner | PASS |
| G1.5 browser exit | exitFullscreen -> setting false + row "Windowed" after 1 fullscreenchange, no dialog | PASS |
| G1.9 fullscreen | keep-display (default Keep, "Reverting in 10 s"); timeout closed after 9123 ms with fsEl null; Revert -> null; Keep -> stays; leaving via UI = no dialog; Alt+Enter toggles and mirrors | PASS |
| gamepad fullscreen | pad right on Display mode -> stays Windowed + warn toast "Press Enter or click — browsers don't let a gamepad button switch to fullscreen" (captures/gntcmenu2-fs-padnote.png) | PASS (honest) |
| G1.8 persist | 27 keys (22 non-default + display) -> reload -> 0 diffs; loadReport ok; effects re-applied at boot: buffer 1280x720 (0.8), source uncapped (V-Sync off), limit 30, fps meter visible "30 fps"; fullscreen reads false after reload | PASS |
| G1.8 corrupt | corrupt-json / truncated / wrong-type -> defaults + toast "Settings were reset — the saved file was unreadable" + corrupt copy kept; hostile-values -> per-key defaults; newer-version (v99) -> defaults + toast, blob kept until a change; every case 0 page errors and next change writes clean v1 JSON | PASS |
| G1.8 throwing storage | storage "memory", footer note present, live change 1520x855 works, 0 errors (captures/gntcmenu2-throwing-storage.png) | PASS |
| G1.9 render scale | dialog names "Resolution scale 85% — render resolution 1360 × 765", countdown 9 -> 7; Revert -> 1.0 / 1600x900; Keep -> 0.85 / 1360x765; timeout (9598 ms) -> reverts to previous kept 0.85; tab switch also arms it; V-Sync/limit apply instantly without a dialog | PASS |
| G1.10 exit | confirm default Cancel, copy "Exit Echoes? Your progress and settings are saved."; OK -> window.close called once -> farewell in 322 ms, honest copy, music state "silence", sim paused, ring 1 (captures/gntcmenu2-farewell.png) | PASS |
| 0 page errors | every section | PASS |
Probe FAILs that need a discriminating re-run (probe-side suspicion): S5/P6 (slider readout read "" — probe read the wrong element; buffer values themselves were right 0.9 -> 1440x810), R1/R2 (Reset pressed via keyboard landed on the Audio tab's au-muteonblur — probe navigation, not yet a verdict), X4 (Return from farewell focuses New Game, not Exit — farewell replaces the stack, so restore-focus is not strictly implied; judged in 5b), M2/M3 (auto-pause probe blurred while the pause overlay was already open — invalid; re-run from live play in 5b).

## Step 5b — discriminating re-runs of the Step 5 probe FAILs (DONE)
Tools tools/gntcmenu2-state2.mjs (captures/gntcmenu2-state2.log) and tools/gntcmenu2-state3.mjs (captures/gntcmenu2-state3.log). All Step-5 FAILs were probe defects; the game passes each leg:
- S5/P6 readout: the slider row reads "Render resolution 1440 × 810 (90%) · sharper UI, softer 3D, faster" after two ArrowLeft steps, buffer 1440x810 (state2 S5r PASS). After a reload (no ?fresh — that param wipes storage, which caused the first P6r miss) the Display tab reads "100% · 1600 × 900 · native", "Windowed" + "Fullscreen lasts for this visit — browsers leave it when the page reloads.", V-Sync "On · Frames paced to your display (~170 Hz)", "60 fps · Rendering 58 fps", FPS "Off" with frameLimit 60 restored (state3; the FAIL line is my `\bOn\b` regex on concatenated text "V-SyncOnFrames"). captures/gntcmenu2-state3-limit60.png.
- Mouse-only Display tab: V-Sync switch click -> Off + source uncapped; frame-limit ">" chevron (46.7x46.7 px buttons) steps Unlimited -> 30 -> 60 -> 120 -> 144 -> Unlimited -> 30, "<" steps back; limit 60 by mouse renders 58.4-59 fps with the row "Rendering 59 fps"; Display-mode ">" enters fullscreen, "<" leaves (state3 L1-L4 PASS).
- Reset to defaults (mouse): confirm "Reset Display settings? Every setting on this tab goes back to its default." default focus Cancel; Cancel keeps 0.9 / V-Sync off (R1b's FAIL was only the limit that the probe never changed); OK -> 1.0 / V-Sync on / Unlimited, buffer 1600x900, source raf, toast "Display settings reset to defaults"; per-tab scope (audio.master 0.33 untouched). captures/gntcmenu2-reset-confirm.png, -reset-done.png.
- Auto-pause (from live play, not from an open pause menu): blur -> pause menu opens, 0 ticks in 1 s, ring 1; focus back -> menu stays (explicit resume), Esc resumes 61 ticks/s; autoPause off -> blur keeps 60 ticks/s, nothing opens; ?menu=0 boot never auto-pauses (57 ticks in 1 s). captures/gntcmenu2-autopause.png.
- X4: Return from farewell -> ["title"] with focus on New Game (the farewell replaces the stack; the plan does not require the Exit row) — advisory only (Hades returns the cursor to the row you left from).
- Copy advisory: with V-Sync Off the info panel repeats the Off paragraph twice (white general text + orange current-state text) — captures/gntcmenu2-state2-changed.png.
- 0 page errors in state2 and state3.

## Step 6 — G1.6 V-Sync / G1.7 frame limit on the DISPLAY harness (in progress: runs 1-2 recorded)
Tool tools/gntcmenu2-pace.mjs (headful, ANGLE D3D11 "AMD Radeon(TM) Graphics", window 1600x900 -> css 1586x806, dpr 1.5, screen 1707x960). Independent frame counter installed before game scripts (JS tasks that drew to the default framebuffer) = glFps; it matched the game's frameCount rate to 0.1 fps in all 42 samples. Panel refresh measured on a blank page in the same browser: 165.5 / 161.3 (run 1), 160.5 / 155.5 / 156.2 (run 2). `rafhz --headful` on the camp read 82.6 Hz (frame p50 12.1 ms: GPU-bound, so it reads half the panel). Machine heavily shared (other agents' Chrome instances): samples with sim < 59 ticks/s are marked contention.
Logs: captures/gntcmenu2-pace-run1.log (scales 1.0 + 0.5), captures/gntcmenu2-pace2.log (scale 0.5 repeats + copy legs).
| scale | vsync | limit | run 1 fps (glFps / ticks) | run 2 fps | note |
|---|---|---|---|---|---|
| 1.0 (buf 2379x1209) | on / off | 30 | 29.6 / 30.0 (60.15 / 59.93) | - | PASS |
| 1.0 | on / off | 60 | 46.3 / 47.9 (work 12.7-14.7 ms) | - | device-bound below 60 at native buffer on this iGPU |
| 0.5 (buf 1189x604) | on / off | 30 | 30.0 / 30.0 | 30.0 (on) | PASS |
| 0.5 | on / off | 60 | 59.0 / 59.7 | 60.0 (on) | PASS (+-5%) |
| 0.5 | on | 120 | 90.0 (ticks 48.3 = contention) | 42.8 / 77.1 / 63.4 (ticks 39.3) | needs a clean re-measure |
| 0.5 | off | 120 | 115.1 (own uncapped cap 110) | 63.0 / 48.3 / 78.7 | run 1 PASS vs min(120, cap) |
| 0.5 | on / off | 144 | 134.3 (93% of 144, Unlimited-on 145.8 next) / 138.6 | 92.1 / 67.8 | on: marginal, re-measure |
| 0.5 | on / off | Unlimited | 145.8 (rafHz 153.9) / 147.1 | 93.6-76.6 / 58.6-81.7 | source raf / uncapped |
- G1.6 On: source "raf" in every On sample; rendered <= panel Hz x 1.02 in every sample. Off: source "uncapped", honest row "Your device renders about N fps here — uncapped can't go faster than your GPU" with N vs renderedFps read in the same evaluate: 58/57.6, 64/66.7, 66/66.2, 17/16.8, 18/18.3, 11/10.8, 10/10.1 (all within 10%); work p50 5.7-16 ms >= 0.8 x 1000/panelHz (4.8-5.1 ms) -> case (b) applies; sim 59.9-60.4 ticks/s. The limit row adds "your device renders about N fps here, below the limit" when the GPU binds (144 at 35-38 fps, 120 at 17-19 fps).
- Probe incident (not a game defect): run 1's copy leg hung the page because MY in-page loop `while (stack.length) back()` spins forever — back() is animated and does not shrink the stack synchronously. tools/gntcmenu2-hang.mjs re-ran Settings-over-play with V-Sync Off/On at scales 0.5/1.0: every evaluate returned in 1-14 ms, sim paused while Settings open (tick frozen), resumed after back; 0 page errors (captures/gntcmenu2-hang.log).
- ADVISORY MENU-R2-A1 (honesty of the measured copy under GPU load): when frames take longer than one refresh, the "display" figure halves or worse: at scale 1.5 the Display tab says "Frames paced to your display (~84 Hz)", "Display ~83 Hz" and "Your display caps this at ~84 fps" while the blank-page panel measured 155-161 Hz and the game rendered 10-11 fps (pace2.log copy on-unl-s15; captures/gntcmenu2-pace-on-unl-s15.png); headless 2560x1440 read "Display ~33 Hz" (Step 2). The rendered-fps numbers are right; the display-Hz claim is wrong exactly when a player is looking at why the game is slow.
- Run 3 (tools/gntcmenu2-pace3.mjs, captures/gntcmenu2-pace3-1600-0.5.log; 4 interleaved rounds, 4 s samples, panel 165.8 Hz at start): V-Sync On 60 = 60.2 / 60.0 / 60.0 / 60.0; V-Sync Off 120 = 118.0 / 119.5 / 119.4 (+1 contention sample at 50.7 ticks/s); V-Sync On 120 = 117.8 (98% of 120) in the quiet round where Unlimited-On reached 133.7, and >= the adjacent Unlimited-On cap in rounds 0 and 3 (96.2 vs 87.7, 79.9 vs 74.6); round 2 108.5 vs Unlimited-On 117 (93%, the cap itself drifted 74-134 between samples). V-Sync On 144 = 135.7 vs Unlimited-On 133.7 (cap-bound, PASS). Sim 59.8-60.7 ticks/s in all 23 valid samples. 0 page errors.
- G1.6 verdict: MET (case b: work p50 6.0-12.4 ms >= 0.8 x 1000/165.8 = 4.8 ms; On = raf and never above the panel; Off = uncapped with the measured, honest copy). G1.7 verdict: MET (30/60 within 1%; 120/144 within 5% of min(limit, cap) whenever the machine was quiet; the gate cannot be separated from other agents' load on the noisy rounds).

## Step 4b — G1.3 re-measure: every source in every run + steady-60 fps (DONE)
Tools tools/gntcmenu2-resp2.mjs (captures/gntcmenu2-resp2.log; = resp.mjs with pad/hover/click in all 3 runs) and tools/gntcmenu2-resp60.mjs (captures/gntcmenu2-resp60-run1.log, gntcmenu2-resp60.log; frame limit 60 vs Unlimited interleaved x3, settled title).
| window | independent p50/p95/max | app.responses p50/p95/max | fps |
|---|---|---|---|
| keyboard EARLY r1 / r2 / r3 | 19.3/29.0/31.7 · 19.8/40.2/43.0 · 19.1/26.3/29.3 | 30.5/42.5/42.8 · 33.9/**53.6**/62.1 · 31.5/41.2/41.2 | 91 / 68 / 88 |
| keyboard settled r1 / r2 / r3 | 20.0/29.5/30.5 · 24.9/34.9/36.6 · 18.1/28.3/36.1 | 35.7/**56.3**/62.9 · 35.9/**53.2**/56.0 · 29.2/41.0/53.7 | 59 / 55 / 81 |
| gamepad r1 / r2 / r3 | 33.2/41.8/44.0 · 31.1/48.2/48.2 · 19.7/26.0/31.1 | 29.3/42.4/43.8 · 29.2/44.6/44.6 · 22.4/33.6/35.9 | 58 / 60 / 99 |
| mouse hover r1 / r2 / r3 | 37.6/50.2/59.5 · 37.5/48.1/54.7 · 30.6/35.3/40.4 | n 0 (hover not recorded by the game's instrument) | 60 / 54 / 102 |
| mouse click r1 / r2 / r3 | 25.1/36.2/46.3 · 33.8/45.0/50.2 · 24.8/34.1/42.3 | 28.1/39.0/49.2 · 36.4/49.7/53.6 · 26.0/35.9/43.4 | 55 / 49 / 72 |
| keyboard, limit 60 (steady 60.0 fps), 6 windows | p95 13.1-27.9, max 13.8-79 | p95 19.1-43.8, max 20.7-93.7 | 60 |
| keyboard, Unlimited, 6 windows | p95 23-29.4 (+1 window 84.0/108.2) | p95 34.9-48.6 (+1 window **120.2/143**) | 76-103 |
- Reading: every max <= 100 ms except ONE window (resp60 run 1, round 0 Unlimited: presses 1-5 at 143/120/120/88/94 ms, then 24-52 ms) that did not recur in the 5 other Unlimited windows nor in a full re-run; the app's own p95 lands 53-56 ms in 3 of 12 keyboard windows, all of them while the page ran at 55-68 fps because other agents' Chrome instances shared this iGPU (the same windows' independent p95 is 29-40 ms). Quiet windows pass with margin. G1.3 judged MET-with-noise (not a must-fix: r1's defect was a reproducible 4/4 boot-window hitch; today's excursions are 1-in-18 and load-correlated). A steady 60 fps cap (what a 60 Hz monitor gives) is the FASTEST case (p50 8-15 ms): the DOM menu is composited independently of the capped 3D canvas.
- ADVISORY MENU-R2-A2 (instrument gap, carried from r1): app.responses() still records 0 mouse-hover samples, so the game cannot self-report the source whose independent p95 is the highest (48-50 ms at 54-60 fps).

## Step 7 — G1.11 journey, core-loop regression, leak after a run, legacy boots (DONE)
Tool tools/gntcmenu2-journey.mjs (captures/gntcmenu2-journey.log, -camp.png, -reward.png, -backtitle.png), GPU harness 1600x900, autoplay.
- J1 fresh profile, title default focus New Game; Enter -> app 'playing' and the player moving under held W at **256.7 ms** (gate <= 1000 ms) — PASS; music 'camp', stack [].
- J2 real input: hold W -> inPortal at tick 239, E -> combat room 1 act 1 at tick 252 (no picker on a fresh profile), then right-click held + 1-4 + A/D: **room 1 cleared by real input in 13.1 s** (phase 'reward' at tick 1017) — PASS without killAllEnemies.
- Pause menu: Resume / Settings / Save Game / Load Game / Save & Quit to Title / Quit to Title "Without saving"; Quit -> confirm "Quit to the title? Anything since the last save is lost." default focus Keep Playing; Quit -> ["title"], tick 0, rows Continue ("Autosave · The Hollow Wood · Room 1 · just now") + New Game + Load Game + Multiplayer + Settings + Records + Exit, default focus **Continue** (StS convention). captures/gntcmenu2-journey-backtitle.png.
- J4 leak check on the title after a run: frames/s 51.3 = rAF/s 51.3 (one render loop), 1 music player ("menu"), one ArrowDown = exactly one step (continue -> new) — PASS.
- J5 New Game again: starts at once (24 ms to 'playing'); fresh world: run inactive, wallet 0, party 100/100/100/100 %; one Esc = ["pause"], next Esc = [] — PASS. Advisory (carried from r1, save domain): New Game with an autosave present starts without an "overwrite/abandon?" prompt.
- J6 second core loop after returning to the title: portal 234 -> combat 251 -> reward 696 — PASS. J7 0 page errors.
- J8 legacy boots (6 s after load, then +500 ms): ?menu=0&seed=7, ?seed=5, ?room=kill_all, ?room=defend, ?run=1, ?scene=arena, ?variant=2, ?layout=4&room=kill_all -> app 'playing', no title, +29..35 ticks in 500 ms (60/s); ?seed=5&menu=1 -> title, tick 0; 0 page errors each — PASS.
- J9 ?seed=7&menu=0 core loop: portal 202 -> combat 217 -> reward 569, no picker, 0 errors — PASS.
