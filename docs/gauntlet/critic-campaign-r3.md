STATUS: COMPLETE
VERDICT: FAIL (1 must-fix) — GC.7 auto transition exceeds 4.0 s kill->control when an enemy shot is in flight at the killing blow (4012 ms natural, 4787 ms reproduced, production build); every other GC gate PASS except GC.12 PARTIAL (band only at the 2/5 floor for Level-2/3 starts, no boss time spike); benchmark 22/27 met, 5 partial, 0 not met.
# Critic — Campaign (gauntlet round 3)

Critic: gntccampaign3 (fresh context). Branch gauntlet. Started 2026-09-26.

## Steps log
- [step 0] checkpoint created
- [step 1] blind benchmark checklist (section 1 below) written (27 items) before any capture was opened

## 1. Blind benchmark checklist (written BEFORE any Echoes capture was opened)

How shipped games / engines handle level-to-level flow, as concrete testable items.
Scoring later: MET / PARTIAL / NOT MET, each with a capture/log name + numbers.

| # | Item (source systems) | Testable form used here |
|---|---|---|
| B1 | Run start from the hub always drops you into the first stage, no intermediate picker (Hades: the Styx window starts at Tartarus; Gungeon: the Breach elevator starts at Keep of the Lead Lord unless a shortcut is chosen; RoR2: stage 1 always) | E at the portal -> Level 1 room 1 on every unlock state |
| B2 | Clearing a stage never returns you to the hub; the next stage follows (Hades, StS, RoR2, Gungeon) | no camp frame between the clear and the next level; level index +1 exactly once |
| B3 | The stage-clear -> next-stage hand-off is short: Gungeon elevator ride ~2-4 s, Dead Cells passage door fade < 1 s, StS act banner ~2 s, Hades exit door ~1-2 s | killing blow -> first controllable frame of the next stage <= ~4 s, skippable part <= ~1.5 s |
| B4 | A clear trigger fires exactly once even with simultaneous deaths (boss + adds same frame) and a simultaneous party wipe resolves to ONE outcome (RoR2 teleporter + death, Hades boss + death: death wins) | event counts per edge case |
| B5 | The transition shows art/colour, never a black void longer than a fade (Hades title card, Gungeon elevator shaft, D3 act loading art, Dead Cells passage) | 0 near-black frames (mean luma < 24/255) across every transition, 50-100 ms sampling |
| B6 | Level streaming without hitches (Dead Cells passage preloads the next biome; Unreal level streaming) | longest rAF gap during the transition <= 250 ms on the dev server and a production build |
| B7 | Loading can never loop or stall; a hard timeout exists (any shipped console title: TRC/TCR loading rules) | the card always ends; index never repeats or goes back |
| B8 | New-stage identity: the next stage announces its name on arrival (Hades "ASPHODEL", Gungeon "Chapter 2 - Gungeon Proper", StS "Act 2 - The City", Dead Cells biome title) | card / arrival names the cleared + next level |
| B9 | Build carries: boons/relics/deck/guns/currency (Hades boons + obols, StS deck + relics + gold, Gungeon guns + items + casings, RoR2 items) | skills, sockets, bench, Glint identical before/after each transition |
| B10 | Respite at the hand-off (StS heals at the act boss; RoR2 respawns dead allies and restores HP on the next stage; Dead Cells refills flasks in the passage) | party HP full, downed revived, statuses cleared, cooldowns ready on arrival |
| B11 | Nothing of the old stage survives (RoR2/D3: no monster, projectile, ground effect or corpse leaks into the next stage) | 0 enemies / projectiles / zones / hazards / interactables / decals / particles / numerals / telegraphs on the card and the first level frame |
| B12 | Memory returns to baseline after a stage unload (Unity SceneManager.UnloadSceneAsync + Resources.UnloadUnusedAssets + GC.Collect; Unreal streaming GC purge) | GL geometries / textures / programs, heap after forced GC, DOM, listeners, pools flat across >= 3 back-to-back campaigns (no monotonic growth) |
| B13 | The previous stage's audio stops and the new stage's theme crossfades in; no voice stacking (Hades biome music swap, Dead Cells biome themes) | live voices on the card << combat; theme changes per level; voice count not growing per transition |
| B14 | Pause works during a transition and cannot break it (all shipped titles; pausing on a loading/elevator screen resumes it intact) | Esc on the card freezes it; resume continues; no double advance |
| B15 | Skip / confirm inputs are debounced; spamming skip cannot skip a whole stage (StS "Proceed" once; Hades door) | Enter x N on the card = one advance |
| B16 | Input pressed during the transition does not leak into gameplay on the first frame (every console title) | Enter skip does not cast/interact in the new level's first frames |
| B17 | Alt-tab / minimise / hidden window during loading does not hang or fast-forward badly (PC ports: D3, RoR2) | hidden tab across the card -> the card completes once, the level starts, index +1 once |
| B18 | Final victory -> victory/credits screen -> automatic (or single-confirm) return to hub (Hades surface ending returns to the House; Gungeon Lich -> Breach; RoR2 victory report -> lobby) | CAMPAIGN COMPLETE card, auto return to camp within a stated time |
| B19 | Death ends the run and returns to the hub after a death screen (Hades "pool of Styx", Gungeon "Game Over" -> Breach, RoR2 run report) | defeat card -> camp |
| B20 | Explicit, confirmed "abandon run" from the pause menu returns to hub cleanly (Hades "Give Up", Gungeon "Quit to Breach", StS "Abandon Run") | pause -> Quit to Lobby -> confirm -> camp, nothing leaks, recorded as abandoned |
| B21 | Sequential unlocks: later start points are locked until earned, visibly locked with the unlock condition, and cannot be started (StS Ascension levels, Dead Cells Boss Cells, Gungeon Tinker shortcuts) | locked cards unselectable by keyboard / mouse / gamepad / API / save / network; condition text shown |
| B22 | Unlocks persist across sessions (all of the above) | unlock survives a full reload |
| B23 | A later-stage start is compensated so it is fair (Gungeon shortcuts, Hades Heat is the opposite knob) | Level-N start shows a starter grant and is playable |
| B24 | Save points at transitions (Gungeon saves at the start of each floor; StS saves every room; Dead Cells at biome passages) and Continue resumes exactly there | autosave at each transition; reload + Continue = same level + build |
| B25 | Co-op: all players transition together, the stage waits for slow loaders, dead players come back at the next stage (RoR2) and the host can end the session to lobby | 2-client L1 -> L2 in sync, host Quit to Lobby -> both camp |
| B26 | Minimum-spec robustness: slower CPU = longer load, never a broken state (every PC port's min-spec certification) | 4x CPU throttle transition completes once, no black frame |
| B27 | Records / stats track run depth and completions (Hades run history "cleared/ended in", StS run history "died on floor N", RoR2 run report) | Records show campaign completions, furthest level, abandoned, level clears |
- [step 2] exploration (captures/gntccampaign3-explore*.json, -x-*.png): v0.5.94; title -> "Press any key" -> title (New Game focused) -> New Game -> camp (app playing, tick 390). Portal prompt reads "E Begin Run · Level 1 · The Hollow Wood | L Levels" (x-portal.png). E at the portal -> campaign level 1 index 1 room 1 combat, app stack [] (no picker). L -> Level Select: 3 cards, L1 focusable, L2/L3 aria-disabled "Clear The Hollow Wood to unlock" / "Clear The Sunken Mill to unlock" (x-levels.png). Pause menu: Resume, Settings, Save Game, Load Game, Quit to Lobby ("Abandon this campaign — back to camp"), Save & Quit to Title, Quit to Title (x-pause.png). Rules table via __echoes.campaign.rules(): all 15 CARRY_RULES flags true; transit clear 180 / depart 120 / minSkip 30 / hard 600 ticks, readyTimeout 6000 ms, victoryReturn 600 ticks; grants L2 {2 skills, 18 nodes, 1 legendary, 34 Glint}, L3 {2, 30, 2, 60}.
- [step 3] FLOW probe (tools/gntccampaign3-flow.mjs; captures/gntccampaign3-flow-{dev,dev3,devA,devB}.json + -t*-card/arrive/darkest.jpg, -victory.png, -quitconfirm.png, -afterquit.png). Path: plain URL ?fresh=1 -> any key -> title -> Enter (New Game) -> camp -> hold W to the portal -> E. cmd used ONLY to reach the Stag fast: skipToRoom(7) (seed a build in the shop room: giveSkill x2, grantNode x8, socket x5), skipToRoom(8), bossHp(0.02); the Stag and its adds then die in play (right mouse held on the Stag / nearest add, allies fighting). Results:
  - Begin Run = Level 1 on a fresh profile AND with all 3 levels unlocked: app stack stayed [] (no picker), level 1 index 1 room 1 combat within 222-365 ms of E. Prompt text "E Begin Run · Level 1 · The Hollow Wood L Levels".
  - Kill -> first controllable frame of next level (rAF log, clearing blow = last hostile death): auto L1->L2 = 2988 / 2964 / 3018 / 3873 ms (the 3873 run: last add died at tick 736, clear fired at 783 — 47 ticks waiting for an enemy shot in flight — then the 180-tick card); Enter at 0.5 s L2->L3 = 849 / 970 / 618 ms. cardTicks 180 auto, 36-67 with Enter (Enter pressed at card tick >= 32; start follows when the next level is ready).
  - Frame gaps: without screencast (devA/devB) max rAF gap 61 / 79 / 127 / 55 ms. WITH the CDP screencast running (800 px JPEG every frame) a hitch right after arrival in Level 2: 261 ms (dev3, 54 ms after the first controllable frame) and 394 ms (first run, 30 ms after it; that json was overwritten by the re-run — console line kept in this log), dev run 2 79 ms. Screencast frames: 0 near-black (luma<24) in every transition; min mean luma 35.1 / 40.7 / 42.7.
  - Level index advanced exactly once per clear (idxSeq [1,2], [2,3]); level_clear / level_transit / level_start once each per level; 0 camp-mode frames between clear and next level (modes ["run"]).
  - Carry (dev run 2): skills mending_bolt,swift_mend,nova_bloom,sanctuary carried; 5 socketed nodes carried (card shows "SOCKETS FILLED 5 / 32"); bench [keen,linger,bounce] carried; Glint 72 -> 84 (+12 room-clear stipend at the Stag clear) carried; HP 71/100 59/150 0/95(downed) 64/80 -> card 100/100 150/150 95/95 80/80 (downed swordsman revived); statuses slow x2 (statusOf) -> none on the card; cooldowns [155,76,368,0] -> [0,0,0,0]; dodge/basic ready. Heal override set by F2 before the kill: pre 1 -> card null (cleared by the pre-existing room-clear rule, BUILD_BRIEF §13 step 4 — so it never actually carries).
  - Reset on the card: enemies/eshots/projectiles/zones/azones/skillBolts/boss/hazards/interactables/markers all 0; pools decals 0 scorches 0 particles 0 numerals 0 (capacity 12 kept). Dressings on the card [3,4] -> arrival [4,5,6] (L2) and [6,7] -> [7,8,9] (L3).
  - Music: L1->L2 auto: card wood/victory -> arrival mill/combat. L2->L3 with Enter skip: arrival sample still "mill/victory" (dev run 2) — followed up below.
  - Final clear: "CAMPAIGN COMPLETE ... Returning to camp in 10 s · Enter return now"; run_end victory @3105 -> return_to_camp @3705 (600 ticks), 0 near-black, max rAF gap 327 ms over that window (card + camp rebuild).
  - Quit to Lobby from pause (keys only): Esc -> ArrowDown to "Quit to Lobby" -> Enter -> confirm dialog, default focus "Keep Playing" -> Arrow to "Quit to Lobby" -> Enter -> camp in 1757 ms; events run_end{result:abandoned} + run_wiped + return_to_camp{reason:quit}; 0 end-card frames; records abandoned 0 -> 1.
  - Records after campaign 1: campaigns 1, campaignsCompleted 1, furthestLevel 3, levelClears {1:1,2:1,3:1}, fastestCampaignSec 47; unlocks.acts [1,2,3].
  - Two harness-weakened runs (party at 30-55 % + a downed ally at the Stag) WIPED in L3 / L2: defeat -> "THE CAMPAIGN ENDS" card whose subtitle reads "The gods applaud." (flow-dev-victory.png) -> Enter -> camp.
- [own process] vite preview :4332 (Windows PID 85240, dist-gntccampaign3 built from 027850e v0.5.94) — to kill before return
- [step 4] PRODUCTION build (npx vite build --outDir dist-gntccampaign3; vite preview :4332) — same flow probe (captures/gntccampaign3-flow-{prod,prodA,prodV,prod4x}.json):
  | run | L1->L2 auto kill->ctrl | cardTicks | max rAF gap | L2->L3 Enter@0.5s kill->ctrl | cardTicks | max gap | near-black | final |
  |---|---|---|---|---|---|---|---|---|
  | prod (screencast) | 3812 ms (last kill t731, clear t775: 44 ticks shot-in-flight) | 180 | 206 ms (teardown frame) | 812 ms | 50 | 79 | 0 / min luma 35.0 | L3 wipe (no assist) |
  | prodA (no screencast) | 2982 | 180 | 67 | 576 | 34 | 48 | n/a | L3 wipe (no assist) |
  | prodV (screencast, L3 keep-alive assist) | **4012 ms** (last kill t798, clear t852: 54 ticks) | 180 | 109 | 758 | 46 | 79 | 0 / 37.0 | CAMPAIGN COMPLETE -> camp (return_to_camp 600 ticks after run_end), max gap 273, 0 near-black |
  | prod4x (4x CPU throttle) | 5988 (card held to the 6 s wall cap while preloading) | 295 | 642 (teardown frame) | 2388 | 149 | 230 | 0 / 36.6 | CAMPAIGN COMPLETE -> camp, max gap 740 |
  - Exactly-once held in every run (idxSeq [1,2] / [2,3], one level_clear / level_transit / level_start per level, 0 page errors).
  - Music after the Enter skip into L3 (prodV L3_music, 250 ms samples from +1.1 s): "mill/victory" for 5 samples (~2.4 s into Level 3 combat), then "barrow/combat" crossfading. Auto transition L1->L2 arrives on "mill/combat".
  - Across dev+prod auto transitions: 2964, 2988, 3018, 3873, 2982, 3812, 4012 ms kill->controllable (7 samples, 1 over the GC.7 4.0 s bound — every over-3.1 s case is a clear that waited 44-54 ticks for an enemy shot in flight after the last kill).
- [step 5] EDGE cases (tools/gntccampaign3-edge.mjs -> captures/gntccampaign3-edge-dev.json + -wipetick.png, -esc-paused.png, -save-on-card.png, -hidden-after.png). Each case in a fresh browser context, ?level=1&seed=11&fresh=1 (harness start), cmd skipToRoom(8) to reach the Stag; the clear itself by cmd killBoss + killAllEnemies (the same-tick cases cannot be produced by hand):
  | case | result | evidence |
  |---|---|---|
  | Stag + last add die on ONE tick (spawned boar, sim frozen, both kills queued, stepN(1)) | PASS | exactly 1 level_clear@113, 1 level_transit, 1 level_start (@713 reason "timeout" = the sim's 600-tick hard bound, because stepN(700) drew no frames); level 2 index 2 |
  | party wipe on the clear tick (killBoss + killAllEnemies + setHp 0 x4, one tick) | PASS | run_end defeat + defeat(all_downed) @131, 0 level_clear, phase defeat |
  | Esc on the card for 7 s (> 3 s card, > 6 s wall cap) | PASS | tick frozen 148 -> 148 over 7 s (pause stack), resume -> Level 2 after 2388 ms, 1 level_start, index 2 |
  | Enter x12 at 45 ms from card tick 8 | PASS (exactly once) | 1 level_start; but the skip itself was not honoured — reason "auto" at card tick 181 (see Enter matrix) |
  | E / Space / 1 / 2 / right-click on the card | PASS | 0 skill_cast/basic_fire/dash/interact events before level_start; card not advanced by them |
  | Quit to Lobby on the card (keys) | PASS | run_end abandoned + return_to_camp quit @149, 0 level_start, camp idle; Level 2 stays unlocked [1,2]; records abandoned 1, levelClears {1:1} |
  | Save Game on the card (pause -> Save Game -> Slot 1 -> Enter) | PASS | manual-1 meta {level 1, phase transit, room 8, campaign index 1}, caption "Level I cleared — on the road to the next level"; auto-1/auto-2 written at level_transit; 1 level_start after closing the menus, Level 2 index 2 |
  | REAL hidden tab (browser without anti-backgrounding flags; another tab brought to front for 5 s) | PASS | visibilityState hidden, sim tick frozen at 75 while hidden (card does not advance nor fast-forward); visible again -> Level 2 in 2717 ms, exactly 1 level_start |
  | 4x CPU throttle (flow prod4x) | PASS (exactly once) | idxSeq [1,2] / [2,3]; card held to the 6 s wall cap; 0 near-black |
- [step 5b] Enter-skip matrix (tools/gntccampaign3-enter.mjs; captures/gntccampaign3-enter-{dev,dev-dwell,dev-dwell-4x}.json; 7 press patterns, card ticks from clear to level_start):
  - realistic (10 s in the boss room first, dev): single@35 -> 50 (skip), mash from tick 5 -> 65, mash from 35 -> 67, press@10+press@45 -> 71, press@10+press@90 -> 92, slow mash -> 33; all "skip_enter". Mouse click on the card -> ignored (auto 180): the card has no clickable "set out" control.
  - boss reached within 0.6 s of level start (next level not preloaded): single@35 -> 133 (skip honoured once ready), but mash from 35 -> auto 200, press@10+@45 -> auto 185 (presses made while "Preparing…" are sometimes dropped, sometimes queued).
  - 4x CPU throttle + 10 s dwell: every pattern ended "auto" at 181-290 ticks (4.0-6.0 s wall): Enter cannot beat the preload on a slow CPU; the card waits for ready or the 6 s cap.
- [step 6] MEMORY, 4 back-to-back FULL campaigns on dev (tools/gntccampaign3-memory.mjs --campaigns 4; captures/gntccampaign3-memory-dev.json/.out.txt). Every campaign started by walking to the portal + E; every room of L1-L3 played by the autopilot (sim stepped in 30-tick chunks with a rendered frame between chunks; party keep-alive assist setHp 1 below 40 %, so every campaign reaches L3); samples at the first controllable frame of each level (sim frozen, 3 frames, CDP HeapProfiler.collectGarbage x2 + Runtime.getHeapUsage), in camp after each campaign once the camp preload reports ready, and after a Quit to Lobby from L1 room 3. glHook = my own WebGL create/delete hook (live GL objects at the driver API), independent of the game's renderer.info.
  | sample | geometries | textures | programs | GL buffers (hook) | GL textures (hook) | heap MB | entities | bus listeners | numeral cap | DOM | voices | dressings |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | boot camp | 645 | 59 | 90 | 2993 | 77 | 41.8 | 4 | 250 | 0 | 631 | 0 | [1,2,3] |
  | c1 L1 / L2 / L3 | 927 / 1206 / 1114 | 68 / 75 / 79 | 90 / 91 / 91 | 4118 / 5315 / 4875 | 86 / 93 / 97 | 43.0 / 49.6 / 51.0 | 10 / 14 / 13 | 250 | 0 / 12 / 12 | 654 / 1025 / 1084 | 4 / 1 / 3 | [1,2,3] / [4,5,6] / [7,8] |
  | c1 camp | 888 | 81 | 92 | 3887 | 99 | 53.0 | 4 | 250 | 12 | 1062 | 0 | [1,2,3] |
  | c2 L1 / L2 / L3 | 1032 / 1137 / 1136 | 83 / 81 / 81 | 93 / 91 / 91 | 4516 / 4974 / 4961 | 101 / 99 / 99 | 53.8 / 54.2 / 53.8 | 10 / 14 / 13 | 250 | 12 | 1096 / 1066 / 1104 | 3 / 0 / 3 | [1,2,3] / [4,6] / [7,8] |
  | c2 camp | 905 | 81 | 93 | 3955 | 99 | 54.0 | 4 | 250 | 12 | 1045 | 0 | [1,2,3] |
  | c3 L1 / L2 / L3 | 1048 / 1160 / 1149 | 83 / 81 / 81 | 93 / 91 / 91 | 4580 / 5073 / 5013 | 101 / 99 / 99 | 54.8 / 54.8 / 55.2 | 10 / 13 / 13 | 250 | 12 | 1080 / 1062 / 1096 | 3 / 1 / 2 | [1,2,3] / [4,5] / [7,8] |
  | c3 camp | 916 | 81 | 92 | 3999 | 99 | 56.2 | 4 | 250 | 12 | 1044 | 0 | [1,2,3] |
  | c4 L1 / L2 / L3 | 1063 / 1171 / 1150 | 83 / 80 / 81 | 93 / 91 / 91 | 4643 / 5117 / 5017 | 101 / 98 / 99 | 56.9 / 56.8 / 57.1 | 10 / 13 / 13 | 250 | 12 | 1079 / 1078 / 1141 | 3 / 3 / 1 | [1,2,3] / [4,5] / [7,8] |
  | c4 camp | 916 | 81 | 92 | 3999 | 99 | 57.1 | 4 | 250 | 12 | 1071 | 0 | [1,2,3] |
  | quit (L1 room 3) -> camp | 1212 | 84 | 93 | 5288 | 102 | 58.0 | 4 | 250 | 12 | 1120 | 0 | [1,2,3] |
  - GL: textures/programs flat from c2 (81 / 91-93); camp geometries 888 -> 905 -> 916 -> 916 and GL buffers 3887 -> 3955 -> 3999 -> 3999 = first-use growth that stops at c3. Level samples vary with the layout rolled (L1 layouts 2/3/3/1, L2 6/6/5/5, L3 7/8/8/8).
  - Bus listeners 250 at every sample; entities per level identical; particles/decals/scorches 0 at every first frame; numeral capacity 12 fixed; resident dressings only ever the current level's layouts (no Level-N object resident in Level N+1).
  - HEAP after forced GC grows every campaign: camp 53.0 -> 54.0 -> 56.2 -> 57.1 (-> 58.0 after the quit); L1 53.8 -> 54.8 -> 56.9; L3 53.8 -> 55.2 -> 57.1 (c2..c4, i.e. after the warm-up campaign: +3.1 / +2.6 / +3.3 / +3.1 MB over two campaigns). Within GC.6's +-8 MB of the post-warm-up campaign, but monotonic — attribution run (8 campaigns + debug-buffer sizes) below.
- [step 7] LOCKS (tools/gntccampaign3-locks.mjs; captures/gntccampaign3-locks-dev-A.json, -devBC.json, -devB2.json, -devC.json; -table.png, -select-fresh.png, -click-locked.png, -select-after-L1.png, -depart-L2.png, -load-locked.png):
  - Fresh profile: unlocked [1], profile unlocks.acts [1]. Walked to the map table (W then A, real keys): prompt "E Choose a level" -> E -> Level Select (stack [levels]); L2 card aria-disabled "Clear The Hollow Wood to unlock", L3 "Clear The Sunken Mill to unlock".
  - Keyboard ArrowRight x3, Tab x2, ArrowDown, ArrowLeft x2, D, End: focus never left "Level 1, The Hollow Wood.". Mouse click on L2 + double-click on L3: no run, stack still [levels]. Mocked standard gamepad (navigator.getGamepads override, app reports connected 1): d-pad right x3 -> focus stays Level 1; positive control: pad A starts Level 1 (harness false). __echoes.campaign.choose(2|3) and cmd('campChoose', 2|3) -> {ok:false, reason:'locked', line:'Clear … to unlock'}.
  - Clearing L1 in a portal campaign writes unlocks.acts [1,2] at the clear (still in L2). goto ?menu=0 (same profile, no fresh) -> unlocked [1,2]; Level Select: L1 "Cleared ×1", L2 focusable, L3 locked (ArrowRight x3 stops on L2).
  - Chose Level 2 (keys) -> "SETTING OUT · LEVEL II · THE SUNKEN MILL … STARTER SKILLS +2, STARTER NODES 19, SOCKETS FILLED 19 / 32, GLINT 34" (depart card 120 ticks, harness false) -> L2 -> L3 (unlocked [1,2,3] once L2 cleared) -> "CAMPAIGN COMPLETE … LEVELS CLEARED 2 / 2" -> camp.
  - Save file: a mid-L2 manual save (pause -> Save Game -> Slot 1) exported (schema 3, 11531 bytes) and imported into a FRESH profile: __echoes.save.load -> {ok:false, error:'locked', reason:"That save is in a level you haven't unlocked yet…"}; UI pause -> Load Game -> Slot 1 "Level II · The Sunken Mill" -> confirm "Load" -> refused with the error toast "That save is in a level you haven't unlocked yet — Clear The Hollow Wood to unlock", no run started.
- [step 8] SAVE / CONTINUE / MIGRATION (tools/gntccampaign3-save.mjs; captures/gntccampaign3-save-dev.json, -title-midL2.png, -title-card.png, -continue-card.png). Title session, portal campaign, build seeded in the L1 shop room by cmd (4 skills, 3 socketed, bench 2):
  - Autosave at the level transit: auto-2 {level 1, phase transit, room 8} written at the L1 clear (unthrottled); auto-1 at L1 room 1.
  - Manual save in L2 room 1 (pause -> Save Game -> Slot 1). Reload (plain URL) -> title focuses "Continue — Slot 1 · Level II · The Sunken Mill · Room 1" -> Enter -> Level 2 room 1, index 2, startLevel 1, harness false, skills/sockets/bench/Glint 84 identical to the save. (A cmd skipToRoom(4) after the save was NOT autosaved — room_enter autosave skipped by the 'throttle' rule 2.5 s after the previous one — so Continue went back to room 1; cmd-induced, not a player-speed case.)
  - pause -> Load Game -> Slot 1 -> confirm Load -> identical build (equalToSaved true).
  - Reload while ON the L2->L3 card -> title "Continue — Autosave · Level II cleared" -> resumes ON the card (phase transit 2->3, 87 ticks left, Glint 168, full HP) -> exactly 1 level_start (L3, "auto"), index 3, carried build intact.
  - Migration: the Slot-1 file re-encoded by the game's own codec as a schema-2 act-run save (state.v 2, no systems.run.campaign, no meta.level/levelName/campaign, hashState recomputed) -> importText ok (stored as schema 3) -> load ok -> campaign mode, level 2, index 1, startLevel 2, harness false, build unchanged (no starter grant added).
- [own process] net server :7910 (Windows PID 80828) — to kill before return
- [step 6b] MEMORY attribution (captures/gntccampaign3-memory-devq6.json/.out.txt: 6 back-to-back campaigns, quick mode = each level entered at room 1, then cmd skipToRoom(8), the Stag fought by the autopilot; heap snapshots after c2 and c6 = captures/gntccampaign3-heap-devq6-c2/c6.heapsnapshot; tools/gntccampaign3-heapdiff.mjs + gntccampaign3-heapretain.mjs):
  - camp after c1..c6: geometries 819 / 826 / 827 / 827 / 829 / 829, textures 70 x6, programs 92-93, GL buffers 3623 / 3648 / 3652 / 3652 / 3659 / 3659, DOM 664 x6, listeners 250 x6, heap 48.1 / 49.0 / 49.6 / 50.5 / 50.4 / 50.6 MB (plateau from c4). L1 first frame heap 49.1 -> 51.2 (c2..c6), L2 49.9 -> 52.0, L3 49.9 -> 51.5.
  - Snapshot diff c2 -> c6 (+1.8 MB self): +855 KB JIT code, +11 113 small Arrays retained by the audio meter's `acc.hist` (src/audio/meter.js, capped at HISTORY_MAX 12 000 windows = 20 min, so bounded), three.js uniform matrices of first-met materials, Blink text-shaping caches, Performance timeline entries (browser-capped). Debug rings measured per sample (events 200, cueLog 600, autosaveLog 20, audio history 50, campaign.transitions() +3 rows/campaign ~700 B each) — all bounded. Verdict: no unbounded per-campaign growth attributable to the level flow.
  - Quit to Lobby vs finished campaign (captures/gntccampaign3-quitleak-dev.json): the scene graph is identical (census: sceneGeometries 1205-1213, the same groups; one arena root + camp); after a quit from L1 room 3 the renderer keeps ~450 more GL geometries / ~2000 more GL buffers uploaded (1242 vs 790) because Level 1's resident dressing was already uploaded while playing it — +10 geometries per repeated quit (1242 -> 1253 -> 1263), back to 815 after the next finished campaign, 1112 after a 4th quit. Not monotonic across the session; no Level-N object outside the resident set.
- [step 9] NETWORK (own server node server/index.mjs --port 7910; tools/gntccampaign3-net.mjs; captures/gntccampaign3-net-{dev,devcond}.json, -guest-pause.png, -guest-L2.png, -guest-after-quit.png). Host ?nethost=1, guest ?netjoin=CODE, guest net.setReady(true) + host net.start() (API; lobby UI not under test here):
  - Guest run mutators: cmd('startCampaign') -> false (not applied), campChoose(3)/choose(2) -> locked, abandonRun / campaignAdvance -> null; host state unchanged.
  - Guest pause menu = Resume, Settings, Leave Session ("Back to the title") — no Quit to Lobby / Save. Host pause = Resume, Settings, Save Game, Quit to Lobby, Leave Session.
  - Host Begin Run (E) -> both in L1 layout 2. Host clear (cmd) -> guest shows the card 156 ms after the host (220 ms under lat60/jit10/loss2), guest in L2 combat 172 ms after the host (331 ms conditioned); guest never in camp (0 of 104/111 samples), guest index seq [1,2]; end state level 2 / phase combat / layout 4 equal on both; desyncs 0, hashChecks 56/57, replayedOnce true.
  - Host pause -> Quit to Lobby -> confirm: both camp (phase idle), inSession true on both (session stays up).
- [step 10] RECORDS + LEGACY (tools/gntccampaign3-legacy.mjs; captures/gntccampaign3-legacy-dev.json, -records.png; smoke + core loop via tools/cert-capture.mjs):
  - Records screen after 1 complete + 1 abandoned campaign: "2 runs · 1 won"; rows "10,810 · I → III · Campaign · Campaign complete · 24 rooms" and "0 · I · The Hollow Wood · Abandoned"; Lifetime: Campaigns completed 1 of 2, Abandoned 1, Furthest level III, Fastest campaign 0:13, Level I/II/III cleared ×1, Levels open I · II · III, score formula text.
  - ?run=1 -> mode single (harness) -> Stag -> "VICTORY" card -> Enter -> camp (level_clear, run_end victory, return_to_camp). cmd('startRun',{act:2}) -> single level 2 with the starter grant (4 skills, 19 socketed). ?scene=arena&room=kill_all -> legacy arena, no run. ?level=3 -> campaign level 3 (harness) on the setting-out card. ?menu=0&act=2 -> portal E starts a campaign at Level 2 although the prompt reads "Begin Run · Level 1 · The Hollow Wood" (harness-only path).
  - smoke (cert-capture shot, plain URL) exit 0, 0 PAGEERROR; core loop (?seed=7&menu=0 + tools/actions/gnt-arch-coreloop.json) run_start@787 -> room_cleared@898 -> reward_offer@898, phase reward, 0 PAGEERROR. Node goldens (tools/gntM2-goldens.mjs, run read-only): 9/9 match.

## 2. Benchmark scoring (the blind checklist of section 1, scored against the running game)

| # | Verdict | Evidence |
|---|---|---|
| B1 Begin Run -> first stage, no picker | MET | flow-dev/prod: E at portal -> level 1 index 1 room 1, app stack [] on a fresh profile AND with [1,2,3] unlocked (222-365 ms); mouse click on the "Begin Run" chip -> L1 room 1 (chips-dev.json) |
| B2 no hub return between stages | MET | 0 camp-mode frames between clear and next level in all 9 measured transitions (modes ["run"]); idxSeq [1,2] / [2,3] |
| B3 short hand-off | PARTIAL | auto kill->controllable 2964 / 2988 / 3018 / 3873 / 2982 / 3812 ms, but 4012 ms (prodV) and 4787 ms (inflight-prod seed 20) when an enemy shot is in flight at the killing blow; Enter@0.5 s 576-970 ms |
| B4 exactly-once incl. simultaneous deaths / wipe | MET | edge-dev sametick: 1 level_clear; wipetick: defeat, 0 level_clear |
| B5 never a black void | MET | 0 near-black frames (mean luma < 24) in 9 screencast transitions + 3 final-clear windows, dev + prod + 4x; min mean luma 35.0 |
| B6 streaming without hitches | PARTIAL | max rAF gap 55-127 ms without capture (devA/devB/prodA); with CDP screencast 261 ms (dev3) and 394 ms (first dev run) right after the Level-2 arrival; 4x CPU: 642 ms at the teardown frame (prod4x) |
| B7 never loops / stalls | MET | index never repeated or regressed; 6 s wall cap seen under 4x (card 295 ticks, 5988 ms); 600-tick sim bound seen (level_start reason "timeout" when stepped with no frames) |
| B8 next stage announced | MET | card "LEVEL I CLEARED · THE HOLLOW WOOD · NEXT Level II · The Sunken Mill" (t1-card.jpg); arrival plate "THE SUNKEN MILL · ROOM 1 OF 8" (arrive-dev-0.png); card DOM gone on the first Level-2 combat frame |
| B9 build carries | MET | 4 skills, 5 socketed nodes, bench [keen,linger,bounce], Glint identical pre-clear -> card -> arrival (flow-dev L1->L2, L2->L3) |
| B10 respite | MET | HP 71/100 59/150 0/95(downed) 64/80 -> 100/100 150/150 95/95 80/80; slow x2 -> none; cooldowns [155,76,368,0] -> [0,0,0,0] |
| B11 nothing leaks | MET | on every card: enemies/eshots/projectiles/zones/azones/skillBolts/boss/hazards/interactables/markers 0; decals/scorches/particles/numerals 0 |
| B12 memory back to baseline | MET | GL textures/programs/buffers, listeners 250, DOM, pools flat after the first campaign across 4 full + 6 quick campaigns; heap plateau c4-c6 (50.5 / 50.4 / 50.6 MB), residual growth = bounded audio-meter history + JIT code (heap diff) |
| B13 audio hand-off | PARTIAL | auto: card wood/victory -> arrival mill/combat; Enter-skip: Level 2 "mill/victory" music keeps playing about 2.4 s into Level 3 combat before "barrow/combat" (prodV L3_music) |
| B14 pause during transition | MET | edge esc: tick frozen 148 -> 148 for 7 s (past the 6 s wall cap), resume -> exactly one advance |
| B15 skip debounced | MET | Enter x12 -> 1 level_start (presses made while the next level is "Preparing..." are sometimes dropped — advisory) |
| B16 no input leak | MET | E / Space / 1 / 2 / right-click on the card: 0 skill_cast / basic_fire / dash / interact events |
| B17 hidden window | MET | real hidden tab (no anti-backgrounding flags): sim frozen at tick 75 while hidden, visible -> L2 in 2717 ms, 1 level_start |
| B18 final victory -> auto hub | MET | "CAMPAIGN COMPLETE ... Returning to camp in 10 s · Enter return now"; return_to_camp exactly 600 ticks after run_end victory (dev + prod + 4x) |
| B19 death -> hub | MET (copy advisory) | defeat card -> Enter -> camp (flow-prod/devA/devB); card reads "THE CAMPAIGN ENDS · The gods applaud." on a wipe |
| B20 confirmed abandon | MET | pause -> Quit to Lobby -> confirm (default focus "Keep Playing") -> camp in 1686-1757 ms, run_end abandoned, 0 end-card frames, records abandoned +1 |
| B21 sequential locks, every path | MET | keyboard / mouse / mocked pad / choose / campChoose / imported save / network guest all refused; locked click shows "The Sunken Mill is locked — Clear The Hollow Wood to unlock." |
| B22 unlock persists | MET | unlocks.acts [1,2] written at the L1 clear; after a new navigation on the same profile unlocked [1,2], L2 focusable, L3 locked |
| B23 later start compensated | PARTIAL | setting-out card "STARTER SKILLS +2, STARTER NODES 19, SOCKETS 19/32, GLINT 34"; Level-2 start clears L2 5/5 but L3 only 2/5; Level-3 start 2/5 — exactly the §4.2 floor (builder claimed 4/5 and 3/5) |
| B24 save at transitions + Continue | MET | auto slot at every level_transit; Continue onto the card (87 ticks left) -> 1 level_start; Slot-1 load build-identical; schema-2 act-run file migrates to a campaign |
| B25 co-op transitions together | MET | guest card +156 ms (+220 ms conditioned), guest L2 +172 ms (+331 ms), 0 desyncs, host Quit to Lobby -> both camp, session up |
| B26 min-spec robustness | PARTIAL | 4x CPU: exactly once, 0 near-black, but a 642 ms freeze at the clear frame and a 5.99 s card (preload bound by the 6 s cap) |
| B27 records | MET | Records: campaigns completed 1 of 2, abandoned 1, furthest level III, fastest campaign, per-level clears, levels open |

**Score: 22 / 27 met, 5 partial, 0 not met.**

## 3. PLAN §12 gates, literally

| Gate | Result | Evidence |
|---|---|---|
| GC.1 Begin Run = Level 1 | PASS | B1 |
| GC.2 automatic transition | PASS | app mode "run" on every sampled frame from clear to the next level; index 1->2->3 once; level_clear / level_start once per level |
| GC.3 exactly-once edge cases | PASS | edge-dev 8/8 cases (same tick, wipe tick, Esc, Enter x12, Quit to Lobby, save, real hidden tab, gameplay keys) + 4x CPU |
| GC.4 campaign end | PASS | CAMPAIGN COMPLETE -> camp at +600 ticks; defeat card -> camp; Quit to Lobby from combat (flow), from room 3 (memory), from the card (edge) with no end card |
| GC.5 carry / restore / reset | PASS (1 inert rule) | B9-B11; the heal override set by F2 is cleared by the Stag's own room clear (BUILD_BRIEF §13 step 4), so `carryHealOverride` can never be observed |
| GC.6 memory flat | PASS | step 6 / 6b tables; after the warm-up campaign camp geometries 826-829, listeners 250, pools fixed, dressings only the current level's; heap +3.1 MB over c2..c4 (< 8 MB) and plateaued c4..c6 |
| GC.7 no black / no loop / timing | **FAIL** | 0 near-black and no loop: pass. Auto kill -> first controllable frame <= 4.0 s: **4012 ms** on the production build in natural play (prodV L1->L2: last add died t798, clear fired t852 after a 54-tick wait for an enemy shot in flight, then the full 180-tick card) and **4787 ms** (inflight-prod seed 20: kill t489, clear t593, 104-tick wait); 3861-3892 ms in the other 4 in-flight trials. Enter@0.5 s <= 1.5 s: pass (576-970 ms). Gap <= 250 ms: pass without capture (<= 127 ms); 261 / 394 ms under CDP screencast |
| GC.8 locking | PASS | B21, B22; Level-2 start played 2 -> 3 -> CAMPAIGN COMPLETE |
| GC.9 save | PASS | B24 |
| GC.10 records | PASS | B27 (legacy-dev-records.png) |
| GC.11 multiplayer | PASS | B25 |
| GC.12 difficulty band | PARTIAL | seeds 1-5, default-build autopilot, no assists (captures/gntccampaign3-band-dev-from{1,2,3}.json): carried campaign clears L1 5/5, L2 5/5, L3 5/5; rho time/damage L1 .943/.943, L2 .829/1.0, L3 .829/.886; defend spikes 9/9, 9/10, 7/10; max combat-room median 45 / 61 / 79 s. Level-2 start: L2 5/5 (rho .943/.943), L3 2/5; Level-3 start 2/5 (rho 1/1). Boss above rooms 5-6: never on time-to-clear (carried L2 boss 39.5 s vs rooms 5/6 61.2/55.2 s); on damage per seed 4/4, 3/5, 3/5 (carried), 4/4, 3/3 (from 2), 1/3 (from 3). Act time medians not rising at rooms 1 and 3 (L3 22.7 < L2 25.5 s; 43.5 < 45.0 s); damage medians rise at every room |
| GC.13 legacy flows | PASS | smoke exit 0 / 0 PAGEERROR; core loop run_start@787 -> room_cleared@898 -> reward_offer@898; ?room=kill_all, ?run=1 (VICTORY -> camp), cmd startRun act 2, ?level=3; Node goldens 9/9 |

Builder checkpoint claims re-measured: GC.7 "auto 3030/3046 ms" holds only when no enemy shot is in flight at the killing blow (the clock was started at the clear, not the blow); GC.12 "from L2 5/5 · 4/5, from L3 3/5" did not reproduce (2/5 and 2/5 in the page with ?level=N); memory "flat after warm-up" confirmed.

- [step 11] extra probes: in-flight kill (tools/gntccampaign3-inflight.mjs, captures/gntccampaign3-inflight-prod.json, production build, ?level=1 seeds 20-24, one quillback spawned, Stag at 50 %, cmd kill while 1 enemy shot in flight): wait 104 / 51 / 49 / 50 / 49 ticks before level_clear, kill -> controllable 4787 / 3891 / 3861 / 3892 / 3872 ms. Arrival check (gntccampaign3-arrive.mjs): card element removed on the first Level-2 combat frame, veil 0. Chips (gntccampaign3-chips.mjs): mouse click on "Begin Run" -> L1 room 1; click on "Levels" -> Level Select; mocked pad A at the portal -> nothing (gameplay input is keyboard + mouse by design). Band (gntccampaign3-band.mjs + -bandreport.mjs) as in GC.12.

## 4. Verdict

FAIL — one must-fix: GC.7's auto-transition bound (killing blow -> first controllable frame <= 4.0 s) is exceeded on the production build whenever an enemy shot is still in flight at the killing blow (4012 ms natural, 4787 ms reproduced): the level-clear trigger waits for the shot to land and the card then still runs its full 180 ticks. Everything else in the linear-campaign refactor holds up under measurement: Begin Run = Level 1, automatic card -> next level with no camp frame and exactly-once triggers in every edge case, carry/restore/reset table, no black frames, flat GL/listener/pool/DOM memory across 10 campaigns, locks on every input path, save/Continue/migration, records, 2-client sync.

Advisories (not must-fix): Enter-skip leaves the previous level's victory music about 2.4 s into the next level; a 261-394 ms hitch at the Level-2 arrival under CDP screencast load and a 642 ms teardown freeze at 4x CPU; the heal-override carry rule is inert; the defeat card says "The gods applaud."; Level-2/3 starts clear only at the band floor (2/5) and the boss never out-lasts rooms 5-6 on time; Enter presses made while the card says "Preparing..." are sometimes dropped and a mouse click cannot skip the card; ?menu=0&act=2 prompt reads Level 1 but starts Level 2 (harness only); gamepad A cannot Begin Run at the portal (gameplay is keyboard + mouse by design).

## 5. Own processes

vite preview :4332 (PID 85240) and net server :7910 (PID 80828) started by this critic — both killed (taskkill, ports verified free). Dev server :5199 untouched. dist-gntccampaign3/ and captures/ are gitignored. Nothing committed.
