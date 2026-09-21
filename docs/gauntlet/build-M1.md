STATUS: PARTIAL
M1 builder checkpoint (main menu, screen manager, settings framework, Display tab).

## Steps
- [start] checkpoint created; reading PLAN.md
- [x] 0 read PLAN §0-§10 (M1 rows), TESTING Gauntlet rules, BUILD_BRIEF §17/§19.1/§22/A13-A14, stubs in src/app/*, main.js anchors, stage/input/graybox/camp anchors. Baseline smoke gntM1-base exit 0 (v0.5.1, tick 509, 161 fps).

## Decisions where PLAN is silent (recorded per PLAN preamble)
- D1 Tool/capture prefix: `gntM1-` (TESTING.md "gnt<KEY>-" + the task text; PLAN §2.1 writes tools/gnt-M1-*, same owner).
- D2 Load Game is ALWAYS on the title (user spec lists it); disabled with its reason ("No saved games yet") until service('save') + screen 'saves' exist and a save exists. Continue / Records appear only with the save service (PLAN §1.3).
- D3 autoPause applies only to title-booted sessions (menu-skip/legacy boots keep v0.4.63 behaviour: never paused on blur).
- D4 FPS meter: visible iff display.showFps OR ?fps=1 OR ?debug=1 OR a menu-skip/legacy harness boot (v0.4.63 captures keep it); the Display tab notes when the URL forces it.
- D5 Row focus: full-width settings rows get the amber ring + plate lift + 1% scale (a 3% scale of a full-width row would cross the panel edge); menu buttons/tabs/dialog buttons get the full 3%.
- D6 quitToTitle / newGame without M2's save.resetToFresh: navigate to a fresh boot (plain URL -> title; New Game -> ?menu=0) — the only truthful "fresh camp" before M2 lands.
- D7 Farewell copy says "Your progress is saved." only when service('save') exists, else "Your settings are saved." (platform honesty).
- D8 Loading screen advances on any non-Esc key / click / touch once warm (or at once when audio is not locked / absent); the advancing gesture is swallowed so it never also activates a title item.
- D9 Title backdrop: live camp render, sim paused, camera translated ~2.4 u west + slow drift (<=0.35 u) so the hearth composes right of the left menu column; eases back to the gameplay camera on New Game.
- [x] 1 app shell + menus + display (commit feat(app) v0.5.2): src/app/{app,screens,nav,gamepad,widgets,style,toast,loop,display,titlecam}.js, src/ui/menu/{index,title,loading,settings,confirm,keepdisplay,farewell,hints}.js + tabs/{display,gameplay,controls}.js, anchors: main.js LOOP (app.beforeRender) + APP-ATTACH (warmupPending), stage.js RENDER-SCALE/RESIZE/STAGE-API (+ return line), input.js INPUT-GATE (+ return line), graybox.js SHAKE-SCALE (+ registry import), camp.js CAMP-CMD titleCam, ui/debug.js setFpsVisible.
  Evidence: smoke gntM1-smoke2/3 exit 0, 0 PAGEERROR (title boot, tick 0, sim paused); core loop gntM1-core1 (?seed=7&menu=0) portal tick 513 -> combat room 1 tick 540 -> reward tick 760; journey gntM1-sc-journey: loading -> Enter -> title -> Enter New Game -> Healer moved 164 ms after the press -> portal -> combat -> reward, 0 page errors; tour screenshots captures/gntM1-tour-1600-*.png (title, settings Display/Audio(M3)/Gameplay/Controls, confirm).
  Note: main.js staged as HEAD + M1 hunks only (M3's uncommitted AUDIO block left in the working tree).
