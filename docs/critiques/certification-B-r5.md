STATUS: PARTIAL
VERDICT: pending

# Certification B round 5 — full-loop by real input

Started: 2026-09-11T20:02:31+08:00

## Probe log (appended as taken)

### Setup
- Code under test: `src/version.js` **v0.4.63**, HEAD `2d05688` (settle-window fix v0.4.60 in tree). Dev server 127.0.0.1:5199 reused (curl 200).
- Generator: `tools/certB5-gen.mjs` -> `tools/actions/certB5-full.json` (304 actions, every eval/cond syntax-checked with `new Function`).
- Probe `certB5-full` = ONE page scope: boot `?seed=777` (no ?room) -> run 1 (B1 portal walk + B2 rooms 1-8 by real play, victory, Return to Camp) -> run 2 (B3 defeat, hastened with setHp 0.02 only, Return to Camp by click) -> run 3 (B4 freshness + a few seconds of real play). Events armed for B5 on every run (`window.__b5.ev`, stashed per run).
- Launched: `node tools/cert-capture.mjs shot certB5-full --url "http://127.0.0.1:5199/?seed=777" --settle 4000 --actions tools/actions/certB5-full.json --timeout 180000` (log captures/certB5-full.run.log)

### certB5-full — exit 0, 46 intermediate shots, console: 0 PAGEERROR / 0 [error] / 1 [warn] (X3595 shader, known). GOTO 16465 ms.
**B1 PASS** (`certB5-run1-prompt.png`): boot v0.4.63 seed 777, campState player (1.35,1.00), portal (0,-6.9) r1.9, `#camp-prompt` text "E Begin Run · the wood is waiting" display:none at boot. 6 real KeyW presses (400 ms held each, 3416 ms, 205 ticks) -> player (1.35,-5.20), distToPortal 2.17 (< 1.9 + body), inPortal true, promptVisible true, DOM display:flex rect [474,67,404,54]. KeyE at t840 -> run_start@852 {seed 2947974146}, room_enter@852 {index 1, kill_all}, room_start@852; runState active room 1/8 (12 ticks after the press). campMode "run".
**B2 PASS** (run 1, no killAllEnemies/killBoss/skipToRoom/endRun): rooms 1-8 wall s = 11.8 / 45.5 / 14.4 / 14.7 / 11.1 / 45.6 / 1.3 (shop transit) / 102.0 (boss incl. solo mop-up); all < 240 s. fpsMin/med per room 69/74, 72/79, 65/74, 61/72, 59/72, 60/79, -, 46/73.
- Drafts 6/6 taken by Enter after a 1.5 s quiet settle: nova_bloom@1853 slot2, warding_aura@5064 slot3, ascend@6404, sharpen@7894, multiply@9198, quicken@12523; declines 0. Focus on arrival "Take" every time (Take rect 662,498-515,132,42). The fight body's D tap landed on the draft at 211/218/228/291 ms after open and was DROPPED (settle window) — focus stayed Take.
- Socket overlay chained after each node draft (r3/r4/r5/r6), closed with real Escape each time (socketClosed open:false).
- Path 5/5 by real click (703,399) inside door-1 rect (623,289,160,220): path_chosen@2075/5288/6746/8247/9544 side 0. Rooms 6->7 and 7->8 fixed (no path page).
- Shop (room 7, `certB5-run1-r6-shop.png` / `-shop-bought.png`): wallet 72 on entry (0 + 6x12). Real click (500,607) inside card 1 rect (360,499,280,192) -> shop_purchase@12877 {bounce, price 25, wallet 47}, node_granted bounce, bench gains {bounce, purchased}, owned "you own 1 · on the bench". Real click (800,769) inside Advance rect (650,748,300,42) -> room_enter@13072 {index 8, boss}.
- Boss: boss_spawn@13072 {id 563}; boss_adds@13263 (0.75, 3) / @13503 (0.5, 3) / @13743 (0.25, 2); 4 quakes. Banner timeline: "THE HOLLOW STAG 1280/1800" -> "THE HOLLOW STAG · FELLED / 6 ADDS REMAIN"@13999 (`certB5-run1-felled.png`, boss hp 0, 6 adds) -> "1 ADD REMAIN"@15885 -> cleared@19208. All three allies downed @13810/13976/14061; healer mopped 6 adds solo by real input until room_cleared@19208 (86 s).
- Victory (`certB5-run1-end.png`): text "VICTORY … ROOMS CLEARED 8/8 GLINT EARNED 59 SKILLS CARRIED 4 NODES HELD 5 RUN SEED 2947974146 RUN LENGTH 306 s"; summary result victory rooms 8 combatRooms 7. Return to Camp rect (708,511,185,42); real click (800,532) -> return_to_camp@19459; camp arrival t19703.
- Camp after victory (`certB5-run1-backcamp.png`): campMode camp, runs 1, party 100/100 150/150 95/95 80/80 none downed, seats exact seatDrift {0,0,0}, rigs idle, enemies/eshots/zones/azones/bolts/projectiles 0, entityCount 4, visibleNumerals 0 (12 pooled), banner "", threat markers 0, skills reset [mending_bolt, swift_mend, null, null], bench [], wallet 0, socket closed, runUi none. +300 ticks identical; newEventsSinceArrival 0.
**B5 run 1**: 88 events, coherent: run_start first; every room room_enter->room_start (same tick)->wave_start(s)->room_cleared; no room_cleared before its room_start; 6 draft_taken each paired with same-tick skill_equip/node_granted; 5 path_chosen; exactly ONE boss_spawn; run_end{victory}@19208 -> director_stop -> run_wiped -> room_cleared{boss} -> return_to_camp@19459 last. Same-tick order warts as in r3 (reward_offer listed before room_cleared; room_cleared{boss} after run_end; boss_spawn before room_start) — advisory only. No `victory`/`boss_death`/`reward`/`shop_buy` names on the bus (shop_purchase / reward_offer are the real names).
**Run 2/3 in this capture are NOT valid B3/B4 evidence (harness gap, not a game defect)**: my hasten loop kept feeding real fight input (Space dodges + heal skills) while pinning HP at 2 %, so the party out-healed/out-dodged the wipe and cleared rooms 1-3 at 2 % HP (run2-events: downed x5, revive at each clear, no run_end). The "defeat" click then landed between Take/Decline and the run stayed at the room-3 draft. Re-running B3/B4 as `certB5-b34` with a no-input pin.
