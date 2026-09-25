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
