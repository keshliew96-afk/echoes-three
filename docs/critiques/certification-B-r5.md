STATUS: COMPLETE
VERDICT: PASS - B1-B6 met on v0.4.63 (certB5-full + certB5-b34), 0 failures, 8 advisories

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

### Resumed 2026-09-11T22:06+08:00 (second instance, same v0.4.63 / server 200)
- Reused: `certB5-full` evidence for B1, B2, B5(run 1), B6(run 1). Runs 2/3 of that capture are discarded as evidence (harness gap explained above: seed run2 3046184652 was already != run1, but no wipe occurred).
- New generator `tools/certB5-b34-gen.mjs` -> `tools/actions/certB5-b34.json` (220 top-level actions, 100 eval/cond snippets parsed by `new Function`). ONE page scope, boot `?seed=777` (no ?room): run 1 hastened defeat, run 2 hastened defeat (= B3 evidence), run 3 fresh check (= B4) + 6 fight bodies of real play. Hasten = `setHp(id,0.02)` re-pinned every 500 ms with NO fight input (no held mouse, no keys) so enemies deal every killing blow; `downAll` fallback only if 75 s of pinning fails to wipe (logged as `downAllUsed`). Defeat card -> Return to Camp by real click (800,532), verified against the button rect from the DOM. Camp leak dumps at arrival and +360 ticks.
- Launch: `node tools/cert-capture.mjs shot certB5-b34 --url "http://127.0.0.1:5199/?seed=777" --settle 4000 --actions tools/actions/certB5-b34.json --timeout 180000`

### certB5-b34 — exit 0, 15 intermediate shots, console: 0 PAGEERROR / 0 [error] / 1 [warn] (X3595 shader, known). GOTO 11623 ms. Log `captures/certB5-b34.console.txt`, run log `captures/certB5-b34.run.log`.
One page scope, boot `?seed=777` (no ?room), v0.4.63, bootSeed 777, camp at boot: party 100/150/95/80 seated, skills [mending_bolt, swift_mend, null, null], wallet 0, runs 0.

**Run 1 (hastened defeat; seed 2947974146 = the known first-run derivation of bootSeed 777)** — `certB5-b34-run1-{prompt,r1-enter,lowhp,defeat,backcamp,backcamp-plus6s}.png`
- Portal by real input: 6 KeyW (400 ms each, 3255 ms, 214 ticks) from (1.35,1.00) to (1.35,-5.44), distToPortal 1.99 (r 1.9 + body), inPortal true, `#camp-prompt` "E Begin Run · the wood is waiting" display:flex rect [474,67,404,54]; KeyE@605 -> run_start@617 {seed 2947974146}, room_enter@617 {index 1, kill_all, wallet 0}, room_start@617; runState active room 1/8 twelve ticks after the press.
- Hasten @950: `setHp(id,0.02)` x4 (party 2/3/2/2), then NO input at all (no held mouse, no keys). The pinned party still cleared room 1 (allies fight on: room_cleared@1344) — draft taken by real Enter (`draft_taken@1466 nova_bloom slot 2`), door by real click (703,399) (`path_chosen@1645 side 0`), room 2 (defend) entered @1663. Wipe in room 2: `downed 3@3359, 2@3448, 1@3652, player 0@3859`; every downed tick has a matching enemy `hit {target=that id, amount 10, delivery shot, shape projectile}` at the same tick — all four killing blows enemy-dealt. Chain: run_end{defeat}@3859 -> director_stop -> revive x4 {pct 0.3} -> run_wiped{wallet 0} -> defeat{all_downed}. pins 4 (initial only; no re-pin ever needed), downAllUsed false, pin loop 72 iterations / 48.3 s.
- Defeat card (`certB5-b34-run1-defeat.png`): "THE RUN ENDS · The gods applaud. ROOMS CLEARED 1/8 GLINT EARNED 12 SKILLS CARRIED 3 NODES HELD 0 RUN SEED 2947974146 RUN LENGTH 54 s · Mending Bolt · Swift Mend · Nova Bloom · Return to Camp · Enter return to camp"; focus "Return to Camp"; button rect (708,511,185,42); real click (800,532) verified inside -> return_to_camp@4027 (campState mode camp @4133, runs 1).
- Camp arrival t4283 and +362 ticks t4645 byte-identical: campMode camp, runActive false, phase idle, party 100/100 150/150 95/95 80/80 none downed at (1.35,1)/(-1.95,0.5)/(2.3,0.2)/(-2.3,-2.5), seatDrift {0,0,0}, rigs idle, enemies/eshots/zones/azones/bolts/projectiles 0, entityCount 4, visibleNumerals 0 (4 pooled), banner "", threat 0/0, skills reset, bench [], wallet 0, socket closed, runUi none, reviveDom 0. Quiescence: newEventsSinceArrival 0. 33 events, coherent (list in console tag `b34-run1-events`).

**B3 PASS — run 2 = the session's second run (`certB5-b34-run2-*`)**
| Step | Evidence |
|---|---|
| Portal by real input | preportal player (1.35,1.00), promptVisible false, prompt DOM display:none; 6 KeyW (3173 ms) -> (1.35,-5.04), prompt display:flex [474,67,404,54] (`certB5-b34-run2-prompt.png`: plate top-centre, healer inside the violet ring ~800,360); KeyE -> run_start@4987 {seed **3848396823**} (differs from run 1's 2947974146), room_enter@4987 {index 1, kill_all, wallet 0}, room_start@4987, wave_start@4987 |
| Room 1 fresh | `certB5-b34-run2-r1-enter.png` t5095: 4 enemies [mantis, mantis, boar, boar], banner "WAVE 1/3 4 LEFT", party full, wallet 0, threat markers 2 |
| Hasten | @5297 `setHp(id,0.02)` x4 -> 2/3/2/2, 1 enemy alive (wave 1 tail), then NO input. `certB5-b34-run2-lowhp.png`: portraits read 2/3/2/2 with critical rims, party clustered ~(800-980,380-520) inside a red telegraph, mantis at ~(560,700) firing a red lane, numerals 12/12/10, "WAVE 1/3 · 1 LEFT" |
| Wipe (enemy-dealt) | wave_start@5314 {index 1}; `downed 3@5341` (hit target 3 amount 10 shot @5341), `player 0@5709` (hit target 0 amount 10 @5709), `1@5766` (hit target 1 @5766), `2@5830` (hit target 2 @5830) -> run_end{defeat}@5830 -> director_stop -> revive x4 {0.3} -> run_wiped{wallet 0} -> defeat{all_downed}@5830. pins 4, re-pins 0, downAllUsed **false**, pin loop 14 iterations / 8.5 s; runUi screen end / phase defeat within the same tick |
| Defeat screen | `certB5-b34-run2-defeat.png`: "THE RUN ENDS ◆◆◆ The gods applaud. ROOMS CLEARED 0/8 GLINT EARNED 0 SKILLS CARRIED 2 NODES HELD 0 RUN SEED 3848396823 RUN LENGTH 14 s · Mending Bolt · Swift Mend · Return to Camp · Enter return to camp"; sinceOpenMs 3107, settled true, held/stale []; focused "Return to Camp"; one button, rect (708,511,185,42); banner "" gated, threat 0/0, hudCombat combat false; leak dump on the card already all-zero (enemies/eshots/zones/azones/bolts/projectiles 0, entityCount 4) |
| Return by real input | click (800,532) -> `insideReturnRect true` -> `return_to_camp@6020`; campState mode camp, runs 2 @6123 |
| Camp after defeat | `certB5-b34-run2-backcamp.png` t6278 (four critters seated round the hearth ~(510,395)/(795,415)/(880,370)/(520,215), no banner, no revive rings, no pointers, 4 full portraits, 0 GLINT): campMode camp, runActive false, phase idle, party **100/100 150/150 95/95 80/80 none downed**, seats exact, seatDrift {0,0,0}, rigs idle, **enemies 0 eshots 0 zones 0 azones 0 skillBolts 0 projectiles 0**, entityCount 4, visibleNumerals 0 (4 pooled), banner "" / threat markersDrawn 0 domMarkers 0, skills [mending_bolt, swift_mend, null, null], bench [], wallet 0, socket closed, runUi none, reviveDom 0 |
| Quiescence | +244 ticks (t6522, `certB5-b34-run2-backcamp-plus6s.png`) byte-identical leak dump; newEventsSinceArrival **0** |
| Events (21) | run_start@4987, room_enter, room_start, wave_start@4987, wave_start@5314, downed x7 (4 downs, 3 double-fired on consecutive ticks), run_end{defeat}@5830, director_stop, revive x4, run_wiped, defeat, return_to_camp@6020 — run_start first, return_to_camp last, no room_cleared, no boss_spawn (correct for a room-1 wipe) |

**B4 PASS — run 3 (`certB5-b34-run3-*`)**
| Check | Value |
|---|---|
| Portal by real input | 6 KeyW (3502 ms, 210 ticks) -> (1.35,-5.04), prompt flex [474,67,404,54] (`certB5-b34-run3-prompt.png`); KeyE@6845 -> run_start@6857 (12 ticks) |
| Seeds | run 1 **2947974146**, run 2 **3848396823**, run 3 **1223378348**; `differsFromRun2 true`, `differsFromRun1 true`, `allDistinct true`; bootSeed 777 (known advisory: run 1 is a fixed derivation of it — runs 2 and 3 are not) |
| Room | room 1, rooms 8, mode kill_all, clearedRooms 0, roomsDone 0; frame modes [kill_all, defend, kill_all, defend, kill_all, kill_all, shop, boss] (defendAt [2,4]) vs run 1's [kill_all, defend, kill_all, kill_all, kill_all, defend, shop, boss] — a different frame |
| Wallet | 0 (brief section 14 starting_glint 0); room_enter {index 1, wallet 0} |
| Party | 100/100 150/150 95/95 80/80, none downed |
| Skill slots | skillSlotCount 4, [mending_bolt, swift_mend, null, null], freeSkillSlots 2 (brief section 5: 4 slots), cooldowns all null, bench [] |
| Room 1 fresh | `certB5-b34-run3-r1-enter.png`: 5 enemies [mantis, boar, boar, boar, mantis] at t7007 (4 at t7008 after a kill), banner "WAVE 1/3 5 LEFT", pointers at ~(1575,325)/(1275,875), "ROOM 1 OF 8 · CLEAR THE CLEARING" |
| Events since run start | exactly run_start@6857, room_enter@6857 {index 1, wallet 0}, room_start@6857, wave_start@6857 {index 0} |
| Real play | right mouse held + 6 fight bodies (Space dodge, Digit1-4, A/D strafes): `certB5-b34-run3-r1-fight.png` t7396 "WAVE 2/3 · 3 LEFT", healer relocated to ~(800,370) from the spawn cluster, slot 2 on a 0.1 s cooldown, counts hit 10 / heal 2 / skill_cast 4 / death 5, tank 140/150; wave_start@7291 {index 1} |

**B5 PASS (all three runs of certB5-b34 + run 1 of certB5-full)** — run 1 (victory, 88 events) recorded above; run 1/2 defeat chains and run 3's opening are ordered `run_start -> room_enter -> room_start -> wave_start ... -> downed x4 -> run_end{defeat} -> director_stop -> revive x4 -> run_wiped -> defeat -> return_to_camp`; no room_cleared before its room_start anywhere; exactly one boss_spawn in the full run and none in the wiped runs; run_end{victory} precedes return_to_camp; `defeat` IS emitted on the bus (`victory`/`boss_death`/`reward`/`shop_buy` are not — advisory A4).

**B6 PASS** — `certB5-full.console.txt`: 0 PAGEERROR, 0 [error], 1 [warn] (X3595 gradient-in-loop shader, known), exit 0, 46 shots. `certB5-b34.console.txt`: 0 PAGEERROR, 0 [error], 1 [warn] (the same X3595), exit 0, 15 shots. No [REQFAIL], no [HARNESS-ERROR]; no navigation retries were needed (GOTO 16465 / 11623 ms).

### Analyzer (node tools/analyze.mjs)
| Frame | >160 | >200 | buckets | FLAT | danger px | gate |
|---|---|---|---|---|---|---|
| certB5-b34-run2-lowhp.png (room 1, telegraph live) | 4.116% | 1.068% | 16/16 | 1.72% | 14458 (threat present) | PASS |
| certB5-b34-run3-r1-fight.png | 3.084% | 0.889% | 16/16 | 1.26% | 1582 (threat present) | PASS |
| certB5-b34-run3-r1-enter.png | 3.953% | 0.605% | 16/16 | 1.79% | 2108 (threat present) | PASS |
| certB5-b34-run2-backcamp.png (camp, no threat) | 2.440% | 0.882% | 16/16 | 1.75% | **114** (< 500) | PASS |
| certB5-b34-run2-defeat.png (modal veil, not a gameplay frame) | 1.894% | 0.382% | 13/16 | 9.10% | 4 | info (A6) |

### Probe table (rooms of the certified victory run, certB5-full; and the b34 runs)
| Run/room | mode | wall s | screens handled (real input) | snapshot deltas | shots |
|---|---|---|---|---|---|
| 1/1 | kill_all | 11.8 | draft Enter (nova_bloom slot 2), door click | wallet 0->12, skills +1 | certB5-run1-r1-{enter,cleared,draft,path} |
| 1/2 | defend | 45.5 | draft Enter (warding_aura slot 3), door click | wallet 12->24 | certB5-run1-r2-* |
| 1/3 | kill_all | 14.4 | draft Enter (node ascend) -> socket overlay Escape, door click | bench +ascend, wallet 24->36 | certB5-run1-r3-{enter,cleared,draft,socket,path} |
| 1/4 | kill_all | 14.7 | draft (node sharpen), socket Esc, door click | bench +sharpen, 36->48 | certB5-run1-r4-* |
| 1/5 | kill_all | 11.1 | draft (node multiply), socket Esc, door click | bench +multiply, 48->60 | certB5-run1-r5-* |
| 1/6 | defend | 45.6 | draft (node quicken), socket Esc, shop: click card 1 (bounce, 25) + click Advance | wallet 60->72->47, bench +quicken,+bounce | certB5-run1-r6-{enter,cleared,draft,socket,shop,shop-bought} |
| 1/7 | shop | 1.3 (transit) | (handled at the r6 boundary) | — | certB5-run1-r7-{enter,cleared} |
| 1/8 | boss | 102.0 | FELLED plate, solo add mop-up, Victory card, Return to Camp click | boss 1800->0, adds 6->0, wallet 47->59 | certB5-run1-{r8-enter,bossmid,felled,r8-cleared,end,backcamp} |
| b34 run 1 | defeat (room 2) | 54 s run | draft Enter, door click, Defeat card Return click | seed 2947974146; camp clean | certB5-b34-run1-{prompt,r1-enter,lowhp,defeat,backcamp,backcamp-plus6s} |
| b34 run 2 | defeat (room 1) | 14 s run | Defeat card Return click | seed 3848396823; camp clean | certB5-b34-run2-{prompt,r1-enter,lowhp,defeat,backcamp,backcamp-plus6s} |
| b34 run 3 | fresh check | ~9 s play | — | seed 1223378348; wallet 0, slots 4 (2 free), party full | certB5-b34-run3-{prompt,r1-enter,r1-fight} |

## Failures
(none)

## Advisories (not failures)
A1. First run after boot is a fixed derivation of bootSeed: run 1 seed 2947974146 in both certB5-full and certB5-b34 (both booted `?seed=777`); runs 2/3 are 3046184652 / 3848396823 / 1223378348 — the gate (run 3 differs from run 2) is met.
A2. `downed` double-fires on consecutive ticks for allies (b34 run 2: 3@5341+5342, 0@5709+5710, 1@5766+5767; run 1: 3@3359+3360, 2@3448+3449, 1@3652+3653) — 7 events for 4 downs; ordering/duplication only.
A3. Same-tick bus order warts in the victory run: reward_offer listed before room_cleared, room_cleared{boss} after run_end, boss_spawn before room_start (certB5-full tag run1-events).
A4. Bus vocabulary: `victory`, `boss_death`, `reward`, `shop_buy` are never emitted (run_end{result}, reward_offer, shop_purchase are the real names); `defeat` is emitted.
A5. End cards summarise the pre-wipe build while the HUD command bar beneath already shows the wiped state: b34 run 1 defeat card "SKILLS CARRIED 3 · Mending Bolt · Swift Mend · Nova Bloom" over slots [mending_bolt, swift_mend, null, null]; victory card (certB5-run1-end.png) "GLINT EARNED 59 / SKILLS CARRIED 4" over a HUD reading 0 GLINT with slots 3/4 empty. Cosmetic.
A6. The defeat-card frame (certB5-b34-run2-defeat.png) measures >200 0.382% / 13 buckets / FLAT 9.1% under the violet veil (398k violet px) — below the gameplay gate; it is a modal, recorded for the visual scorers, not a loop defect.
A7. Enemy projectile hits on the party carry `attacker:null, source:null` in the `hit` event, so killing blows had to be attributed by target+tick match rather than attacker id — debug-API completeness only.
A8. Headless fps in certB5-b34 sampled 44-61 (DEBUG-API 55.9) vs 59-79 in certB5-full on the same build — environment variance under SwiftShader; block D owns fps.

## Verdict
B1-B6 all met on v0.4.63 by real input in two page scopes (certB5-full: camp -> portal -> rooms 1-8 -> victory -> camp; certB5-b34: two enemy-dealt defeat loops -> camp, third run fresh with a distinct seed). Zero page errors, zero leaks, zero blocked progression. **PASS.**
