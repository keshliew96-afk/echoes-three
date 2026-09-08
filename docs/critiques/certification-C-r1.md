STATUS: COMPLETE
VERDICT: FAIL — 5 of 6 probes met (C1 movement latency, C2 dash i-frames, C3 telegraphs, C5 camera, C6 threat pointers); C4 hit feedback fails on ONE reproducible element: the kill that clears a kill_all room gets no damage numeral (4 of 4 same-tick room-clearing kills across 3 runs; the room-clear wipes the numeral pool on that tick). Every other C4 element (flash in pixels, numerals on 81 of 81 other kills and 15 of 15 non-kill hits, knockback, sound, hitstop, kill shake) is met.

# Certification C round 1 - Responsiveness bar

Critic: block C r1. Started 2026-09-06T00:13:17+08:00. Prior instance left captures/certC1-* (Sep 4-5) without a report; re-measuring against current build.

## Probe log

### C1 Movement latency — MET (captures/certC1-move.console.txt, certC1-move.png)
Method: `tools/actions/certC1-move.json` (generator `tools/certC1-gen.mjs`). Boot `?seed=555`, `cmd('startRun')`, wait for live combat (tick 854, 4 enemies), player i-framed + teleported to (-3,2). A capture-phase `keydown` listener records `t0 = E.tick` (last completed tick) and the player position at the DOM keydown; a per-rAF sampler records one row per NEW sim tick (`px,pz`). Latency = first row whose position moved along the pressed axis; when a render frame spans several ticks the row already contains N ticks of travel (0.04 u/tick at 2.4 u/s), so `corrected = raw - (N-1)` names the tick movement began. fps 82.6, missed ticks 31/698 (max gap 8).

| key | trials (corrected/raw ticks) | worst |
|---|---|---|
| KeyD | 1/1, 1/1, 1/1, 1/1, 1/1 | 1 |
| KeyA | 1/1, 1/1, 1/2, 1/1, 1/1 | 1 (raw 2: t0 1089 → row 1091 already at -0.08 u = 2 ticks of travel, i.e. moved at 1090) |
| KeyW | 1/1 ×5 | 1 |
| KeyS | 1/1 ×5 | 1 |

Raw traces (tick:x,z): KeyD t0 876 → `876:-3.00,2.00 877:-2.96,2.00`; KeyA t0 905 → `905:-2.40 906:-2.44 907:-2.48`; KeyW t0 928 → `928:z2.00 929:z1.96 930:z1.92`; KeyS t0 952 → `952:z1.64 953:z1.68 954:z1.72`. Every one of 20 keydowns moved the player on t0+1 (≤ 2 gate met with margin).

Alternation (i-frames off, natural fight, teleport (0,2), 10× KeyD/KeyA at 100 ms = 20 flips, keyup old + keydown new back-to-back): all 20 flips `rawLatency 1, correctedLatency 1, span 1` (t0 1353→flip 1354, 1360→1361, 1367→1368 … 1481→1482). Velocity-sign trace: `1354+ … 1360+ 1361- … 1367- 1368+ …` — every sign change lands exactly one tick after its keydown; no queued/stale direction persisted (the 3 "stale rows" the analyzer flagged at flips 9 and 15 are the NEXT key's legitimate flip falling inside the 6-tick window — trace `1417+ 1418- 1419- 1420- 1421- 1422- 1423+` with KeyD down at t0 1422). One enemy hit landed on the player at tick 1396 (i-frames off) without disturbing the flip at 1396.

### C2 Dash / dodge — MET (captures/certC1-dash.console.txt, certC1-dash.png)
Dash key: **Space** (BUILD_BRIEF §3 "Dodge roll (i-frames)"; sim emits `intent{kind:'dodge'}` then `dash_end{cause}`; `party[0].dashTicksLeft` counts 15→0). Same arm/sampler as C1; `keydownTick` = last completed tick at the DOM keydown.

| trial | keydown tick | `intent dodge` tick | latency (ticks) | first row with dashTicksLeft>0 | dash_end | duration | travel |
|---|---|---|---|---|---|---|---|
| 1 | 869 | 870 | **1** | 870 (15) | 885 complete | 15 | 1.800 u |
| 2 | 971 | 972 | **1** | 972 (15) | 987 complete | 15 | 1.800 u |
| 3 | 1069 | 1070 | **1** | 1070 (15) | 1085 complete | 15 | 1.800 u |
| 4 | 1168 | 1169 | **1** | 1169 (15) | 1184 complete | 15 | 1.800 u |
| 5 | 1267 | 1268 | **1** | 1268 (15) | 1283 complete | 15 | 1.800 u |

Dash fires on the first tick after keydown (0–1 gate met), lasts exactly 15 ticks = 0.25 s and travels 1.8 u (brief §5 defaults).

I-frames — `cmd('hitOnce',0)` (8 dmg) issued mid-dash, then again after `dash_end`:

| trial | Space keydown | intent | hitOnce mid-dash (tick, dashTicksLeft) | result | HP | dash_end | hitOnce after | result | HP |
|---|---|---|---|---|---|---|---|---|---|
| i1 | 1366 | 1367 | 1367 (15) | `{immune:true}`, event `hit_immune t1367 target0 reason iframe` | 100→100 | 1382 | 1386 | `{amount:8}`, events `sound hit` + `hit t1386 target0 amount8` | 100→92 |
| i2 (double) | 1477 | 1478 | 1479 (14) + 1481 | `hit_immune t1479`, `hit_immune t1481` | 100→100 | 1493 | 1497 | `hit t1497 amount 8` | 100→92 |
| i3 | 1586 | 1587 | 1587 (15) | `hit_immune t1587` | 100→100 | 1602 | 1605 | `hit t1605 amount 8` | 100→92 |

Natural attack through the dash (bite trial 1): Thorn Boar id 46 spawned 0.55 u east of the player (boar i-framed so allies can't kill it), first bite t1714 → `hit 8`, HP 100→92. 41 ticks later (boar per-target cd 48) KeyD+Space: intent t1757, dash span [1757,1772]. Boar bite **t1762 inside the dash → `hit_immune reason iframe`, HP stayed 92** (hp trace `1757:92d … 1771:92d 1772:92`). Next bites t1810 and t1858 (after dash_end) → `hit 8` each, HP 92→84→76. Summary over the whole capture: `hitsOnPlayerDuringDash: []`, hitsOnPlayerTotal 7, `immuneOnPlayer` at 1367/1479/1481/1587/1762 (all `iframe`), 118 dash ticks sampled. `intent_denied: []`. Bite trial 2 could not spawn (`spawn_blocked` t1899 — room already cleared, `ui: path`); trial 1 is the evidence. 0 PAGEERROR.

### C6 Threat pointers — DOM/state (captures/certC1-threat.console.txt; pixels checked below)
Natural (room 1 wave 1, player at screen 800,427, shot `certC1-threat-natural.png` at tick ~430–480): `hud.threat()` `offFrame 2, markersDrawn 2, domMarkers 2, uncued 0, gated false`; `#hud-threat` DIV 0,0,1600,900 opacity 1 visible; `.tm` nodes: `translate(444.6px,876px)` head rect (421,859,41,41) [e7 boar at sx 355, sy 984 — below the frame], `translate(1576px,564.6px)` head rect (1564,549,33,33) [e6 mantis at sx 1737 — right of frame]; a third `.tm` is `display:none` (pooled).
Forced (player teleported to (-9,6), mantis spawned at (10,-6) + boar at (10,6), shot `certC1-threat-forced.png` tick 574, DOM read tick 612): `offFrame 4, markersDrawn 4, domMarkers 4, covered 4, uncued 0`; heads at (1565,377,31,31), (1354,1,41,41), (1566,408,30,30), (1560,11,39,39) for e16/e14/e18/e17 (sx 1745 / 1441,sy -29 / 2145 / 1723,sy -47).
C6 pixels — MET. `certC1-threat-forced.png` (viewed; 3× crop `certC1-threat-forced-crop3x.png` of box 1300,0,300,460): pointer chips (dark plate, bone arrow head, rim) at ≈(1383,22) pointing up-right, ≈(1573,37) at the right edge pointing up, and a merged chip with a "×2" badge at ≈(1560,432) pointing right (two of the 4 drawn markers merged — e16+e18 both east). Crop luma>160 = 1698 px, maxLuma 239 (the bone heads) vs surrounding grass. `certC1-threat-natural.png` (viewed; 5× crops `-cropR5x` box 1500,520,100,90 and `-cropB5x` box 380,820,140,80): chips at ≈(1576,590) right edge (arrow pointing right, toward the mantis at sx 1737), ≈(447,876) bottom edge (arrow pointing down-left, toward the boar at sy 984), and ≈(20,237) left edge beside the boar entering frame. Markers exist as `#hud-threat .tm` DIVs positioned via `transform: translate(x,y)`; `markersDrawn ≥ 1` in every off-screen sample (2 natural, 4 forced).

### C3 Telegraphs — events MET (captures/certC1-tele.console.txt; pixels below)
`certC1-tele.json`: startRun, then a driver loop for 79.6 s of real Act-1 play (rooms 1→4, drafts declined / first door chosen via cmd, no command touched enemies or the boss), bus listeners on `telegraph_start` / `telegraph_resolve` / `enemy_fire` / `enemy_bite` / `hit` / `death`. Span 4778 ticks; **20 `telegraph_start`, every one planned `resolveTick - tick = 42`** (min 42 / max 42). 10 resolved: gap **42 / 42 / 42 / 42 / 42 / 42 / 42 / 42 / 42 / 42** (ids 6 @819→861, 42 @1358→1400, 69 @1814→1856, 89 @2506→2548, 87 @2650→2692, 110 @3261→3303, 109 @3333→3375, 141 @3981→4023, 169 @4421→4463, 199 @5037→5079); each resolve tick carries the matching `enemy_fire` (`fireAtResolveTick 10/10`). The other 10 never resolved because the caster died inside its wind-up (death tick < resolveTick in all 10: id 27 start 1135 / resolve 1177 / death **1176**; 42 @1550/1592/1573; 68 @1893/1935/1910; 86 @2578/2620/2604; 112 @3169/3211/3197; 109 @3525/3567/3536; 142 @3889/3931/3906; 141 @4173/4215/4210; 198 @4944/4986/4961; 196 @5124/5166/5154) — no telegraph resolved early, none resolved < 42 ticks. All 5 party hits in the span were `delivery: shot` from resolved telegraphs; `enemy_bite` 0 (no boar reached contact in this seed's first four rooms). 0 PAGEERROR, fps 83.3.
C3 pixels — MET (mid-telegraph). `certC1-tele-mid2.png` (viewed): shot taken while telegraph id 27 (target 1 = Tank, world -1.02,0.66, projected 704,498 via `__arenaProbe.stage.camera`) was live — `afterShotTick 1176`, `resolveTick 1177`, `left 1`. analyze `--box 642,453,120,95` (the projected ±0.6 u footprint): **danger 540 px**, HUEMIX warm 79.6%, >200 23.5%; 4× crop `certC1-tele-mid2-crop4x.png` (box 600,420,220,160) shows the Ember red-orange ring under the Tank's feet at ≈(650–755, 465–537) and a red `>>` chevron at ≈(605,515) on the Mantis→target line (danger 827 px in the crop). Whole frame danger 1006 px (ring + chevron + the mantis at 305,515); no other red-orange in frame. `certC1-tele-mid.png` (id 6, target 3 Archer, projected 829,434; `afterShotTick 865` vs resolve 861 so the shot straddles the resolve): `--box 774,393,112,85` danger **289 px**; crop `certC1-tele-mid-crop4x.png` (720,360,220,160) shows the ring arc under the Archer at ≈(830–870, 410–465) and a `<<` chevron at ≈(920,450) (crop danger 654). Both decals are the only red-orange in their frames (Ember reserved for telegraphs, per REFERENCE_BAR check 6). Clean-frame (< 500 px) check: see below.

### C4 Hit feedback — event/state level (captures/certC1-hits.console.txt; pixels below)
`certC1-hits.json`: startRun, player i-framed, natural fight until 30 enemy hits (tick 893→3514, rooms 1–2, fps 55.9 with the tracer on). Per hit (`hit` with target ≥ 4): numeral = `#dmg-num-layer` MutationObserver row whose text equals the hit amount within 2 ticks, plus `state().vfx.numerals` before/after; knockback = victim displacement over the next 8 ticks + `kbTicks`; sound = `sound` events on ticks t..t+2; hitstop = `hitstop` events; shake = camera-position second difference (`__arenaProbe.stage.camera`) vs a baseline taken outside kill windows.

| element | result | detail |
|---|---|---|
| numeral | **29/30** | DOM `.dmg-num` with the exact amount ("30", "20", "12", "34", "26", "8", "18", "14"…) on tick t or t+1 for every hit except the room-clearing kill at t1899 (see advisory A1); `vfx.numerals` 0→1 on the hit tick (e.g. t964 `[0,1,1,1]`, t2261 `[1,2,2,2]`) |
| knockback | **10/10 non-kill enemy hits** | displacement 0.262–0.345 u within 1 tick of the hit (spec kb 0.3), `kbTicks` 3–5 (t1098 0.275 u, 1174 0.308, 1717 0.262, 1842 0.345, 2146 0.301, 2261 0.287, 2852 0.301, 2898 0.300, 2985 0.292); the 20 kills remove the body on the hit tick (no displacement to measure); the one `kb:false` row is t2272 — the Waystone (kind `waystone`, kb spec 0) struck by an enemy shot, i.e. not an enemy hit |
| sound | **30/30** | `sound slot hit` on every hit tick; kills add `sound slot kill` on the same tick |
| hitstop | **20/20 kills** | `hitstop ticks 3 cause kill` on the kill tick (t1741: 1 tick, 6 ticks after the previous kill's freeze); measured wall time of the frame on the hitstop tick 43–79 ms vs 17 ms median tick gap = the 3-tick freeze is real |
| screenshake | **20/20 kills** | camera jerk max 0.035–0.154 u/tick² in the 12 ticks after each death vs baseline median 0 / p95 0 (threshold 0.012); no shake outside kill windows except one 1.68 u camera snap at run start (arena entry) |
| flash | tracer blind | the emissive tracer found no enemy mesh (`flashBase null` on 26/30; the run is hosted in the camp scene root, not `__arenaProbe.root`) — verified in pixels instead (C4 pixels, below) |

Hit-seq (8 frames, ~100 ms apart, `certC1-hitseq_00..07.png`) and dummy sequence: the dummy was killed by the AI party before `hitOnce` could land (r:null, `dummies: []`), so a dedicated probe `certC1-flash` re-does the pixel test (below).

### C5 Camera — MET (captures/certC1-cam.console.txt, certC1-cam-{d,w}-{mid,end}.png, certC1-cam-{w-wall,a-4s,a-wall,s-4s,s-wall}.png)
`certC1-cam.json`: startRun, player i-framed, teleported to (-5,4); hold KeyD 4 s then KeyW 4 s, sampling the player's projected screen position (`__arenaProbe.stage.camera` + `Vector3.project`, 1600×900) and the camera position every 250 ms (17 samples per leg; one ~0.9 s gap where the mid-leg screenshot ran). Central 60% = x 320..1280, y 180..720.

| leg | samples | player sx range | player sy range | max screen jump between samples | camera step / sample | inside central 60% |
|---|---|---|---|---|---|---|
| KeyD 4 s (x -4.92 → 8.6) | 17 | **799–848** | **427–432** | 40.2 px (2.5% of width) | 0.57–0.69 u (2.23 u across the 0.9 s shot gap) | all 17 |
| KeyW 4 s (z 3.96 → -7.7) | 17 | **931–952** | **424 → 232** | 44.3 px (2.8%) | 0.51–0.68 u until the camera clamps at cz 3.388 (north bound, sample 12), then 0 | all 17 |

Wall/corner shots: `w-end`/`w-wall` player (8.64,-7.7) at screen **(928,204)**; `a-wall` (-9.92,-7.7) → **(573,204)**; `s-4s` → (388,461); `s-wall` (-11.32,7.7) → **(332,654)** (camera clamped at cx -7 / cz 12.388). The player never leaves the central 60% — the tightest margin is the SW corner (x 332 vs bound 320; head at 309). Smoothing: per-tick camera step median 0.028 u, p99 0.145 u; the only large steps are the arena-entry snap at run start (1.68 u, tick 1297, before the legs) and the ease-in after the teleport at tick 1348 (0.87 / 0.50 / 0.41 / 0.36 u over ticks 1349–1354 — exponential catch-up, no cut). No inter-sample jump exceeded 25% of the width (max 2.8%).

### C3 clean frames (no live telegraph, no enemies) — MET (2nd instance, 2026-09-06 22:40)
Three frames, whole-frame `analyze.mjs` HUES danger band (gate < 500 px):

| frame | state at shot | danger px | >160 / >200 / buckets / FLAT |
|---|---|---|---|
| `certC1-clean-between.png` | room 1 after `killAllEnemies` t1245: shot at t1253, post-shot eval t1290 still `enemies 0, pending 3 (next wave), liveTele 0, eshots 0, numerals 0, ui none` | **14** | 9.96% / 0.75% / 14 / 1.50% |
| `certC1-clean-arena.png` | `?scene=arena&seed=555`, no run, enemies 0, telegraphs 0 | **14** | 8.60% / 0.64% / 14 / 1.66% |
| `certC1-clean-prespawn.png` | run start, shot t1192 with enemies 0 / 4 pending (spawn telegraphs = violet shimmer, the 4 enemies land at t1225) | **39** | 8.38% / 0.65% / 14 / 1.44% |

Ember is absent from every no-threat frame (14–39 px is noise, well under the ~485 px advisory the brief allows), while the mid-telegraph frames above carry 540 px in a 120×95 box and the boss-quake frame `certC1-boss-quake.png` (Antler Quake ring live, resolveTick 1175, shot t1151–1190) carries **32,733** danger px whole-frame — red-orange is reserved for telegraphs as REFERENCE_BAR check 6 demands. 0 PAGEERROR in all three consoles.

### C4b boss stomps (captures/certC1-boss.console.txt, certC1-boss-quake.png)
`skipToRoom 8` → Stag 1800 HP; two Antler Quakes `boss_quake_start` t1133 / t1415, both resolved at exactly **+42 ticks** (1175 / 1457); tramples t1176 / 1326 / 1476 (untelegraphed secondary per brief §11). Camera second-difference (baseline p95 0.015 u/tick², probe threshold 0.045): quake resolves **0.021 / 0.000**, tramples 0.021 / **0.127** / 0.025, boss-room kill (death t1521) **0.066** with `hitstop 3 kill`. Player was at screen (800,782), ~3 u outside both quake rings (centre (765,583), r 1.6 u = box 622–937 × 457–734), `hitsOnPlayer []`. Kill shake fires in the boss room; the quake resolve itself did not move the camera above baseline with the player outside the ring (see advisory A2).

### C4d hitOnce on live enemies — probe note
`certC1-lastkill`: `cmd('hitOnce', <boar 4>)` and `cmd('hitOnce', <mantis 42>)` both returned **null** and emitted no `hit` (numeral counter flat 0 for 30 ticks, `events []`), although `hitOnce` landed on the dummy (trial 1: `{amount:8}`) and on the player (C2). hitOnce evidently only targets dummies/party; the room-clearing-kill numeral is re-measured on NATURAL last kills in `certC1-lastkill2` (below).

### C4 pixels — per-frame canvas sampler (2nd instance; captures/certC1-pxflash.console.txt, tools/certC1-pxgen.mjs, tools/certC1-pxtable.mjs)
Why: a `shot` here costs ~0.9 s wall time and stalls rendering (frames 4 ticks apart around the shot), so a 3-tick flash cannot be caught by screenshots — `certC1-flash1-hit.png` (previous instance) shows the dummy body box (958,392,36,58) at >200 = 99.3% / buckets 12–13 vs the UNHIT dummy in `certC1-dummy-base.png` (932,412,36,58) at >200 = 97.5% / buckets 12–14: the dummy is cream-white by default and that shot holds no flash. Instead the new sampler copies, on every rendered frame (after the game's own rAF), a 64-px-wide box (head y=1.1 u → feet, +10 px margins) of the live WebGL canvas around every enemy into a 2D canvas and records mean luma L, mean saturation S, white fraction W (luma>230 & sat<0.18), >200 fraction B and max luma; baseline = frames with tick in [t-6, t-1], peak = frames with tick in [t, t+3]. Canvas 1600×900, 41 fps with the sampler on (2946 frames / 2515 ticks seen).

Natural fight (rooms 1→3, seed 555, player i-framed, no command touched an enemy): **26 hits on enemies**

| element | result |
|---|---|
| flash (pixels) | **9/9 non-kill hits** — W 0.000–0.024 → **0.179–0.992** and B 0.00–0.07 → 0.58–1.00, mean luma +53…+125 at tick **+0 or +1** (e.g. t1359 boar 33 `archer_basic 12`: W 0→0.789, L 143→241, peak +1; t2798 boar 66: W 0→0.992, L 147→250, peak +1; t3527 mantis 84: W 0.001→0.376, L 106→216, +1; t4155 mantis 109: W 0.024→0.409, +0). **15/15 on-screen kills** peak W 0.197–0.998 (death pop) on the kill tick; 2 kills (t1950 mantis 49, t3361 boar 85) were off-screen (box all zeros) — n/a, not misses |
| numeral | **26/26**, DOM `.dmg-num` with the exact amount at +0 (23) or +1 (3) ticks |
| knockback | **7/9** non-kill hits measured 0.18–0.304 u within 3–5 ticks (t1414 0.304, t2053 0.208, t2743 0.18, t2798 0.24, t3527 0.301, t3604 0.238, t4155 0.301); the other 2 (t1359, t3971) had no sampled frame at t-1/t (41 fps vs 60 Hz — 864 of 3099 ticks unrendered) so the sampler could not anchor a pre-position — a sampler gap, and the previous instance's per-tick run measured 10/10 (0.262–0.345 u) |
| sound | **26/26** `sound slot hit` on the hit tick (+ `kill` on kills) |
| hitstop | **17/17 kills** `hitstop 3 kill` |
| screenshake | **17/17 kills** camera jerk 0.014–0.097 u/tick² vs baseline p95 **0.0001** |

Dummy `hitOnce` trials: trial 2 (dummy 26, `hitOnce` 8 at t761, hp 20→12) — the only frames rendered around the hit were t761 (before the cmd ran) and t765 (after the 3-tick window) because the `shot` right after the cmd stalled rendering; the same dummy's ally kill at t783 rendered **W 1.000 / B 1.000 / L 251.6** on the kill tick and W 0.99 / 0.66 / 0.57 over the next 3 frames (crops on disk: `certC1-pxflash2-g00-t756-pre.png` … `-g07-t783-post.png`, sheet `certC1-pxflash2-sheet.png`: frames 0–6 cream capsule at ≈(937–1013, 374–460), frame 7 solid white). Trials 1 and 3: allies killed the dummy before `hitOnce` ran (lunge_strike 26 at t604 / heavy_slam 34 at t916; numerals "26" at (945,328,59,51) and "34" at (937,325,75,65) within +0). 0 PAGEERROR.

### C4d room-clearing kills — NOT MET (captures/certC1-lastkill2.console.txt, tools/actions/certC1-lastkill2.json)
Natural run, seed 555, rooms 1→3 (kill_all / defend / kill_all), player i-framed, no command touched an enemy; DOM observer on `#dmg-num-layer` + per-frame `state().vfx.numerals` counter + per-frame wall-clock. **34 kills, 32 with a same-amount numeral within 2 ticks; the 2 misses are exactly the kills whose tick equals `room_cleared`:**

| room | clearing event | last kill | numeral | evidence |
|---|---|---|---|---|
| 1 (kill_all) | `room_cleared` **t1432** | `hit archer_basic 12` → `death` mantis 42 **t1432** | **NONE** | no `.dmg-num` in [t-2, t+8]; `vfx.numerals` 0 at 1431 and 1432; `hitstop 3 kill` + `sound hit,kill` present; frame on that tick took **232 ms** |
| 2 (defend) | `room_cleared` t4167 (timer) | `hit archer_basic 12` → `death` 141 **t4077** (90 ticks before the clear) | **yes, +0** at (219,361) | `vfx.numerals` 1→2 on 4077; frame gap 14 ms — the last kill gets its number when it is NOT the clearing event |
| 3 (kill_all) | `room_cleared` **t4868** | `hit piercing_shot 30` → `death` 191 **t4868** | **NONE** | only DOM numeral near is the earlier "12" at t4867 (554,171); `vfx.numerals` **1 → 0 on t4868** and stays 0 through t4874 — the clear wiped the pool (cutting the in-flight "12" short) and the "30" never spawned; frame gap only 22 ms, so not a stall artefact |

Same pattern in the previous instance's natural run (`certC1-hits`: room-1 clearing kill t1899 `numDomHit false`, wall 195 ms on that tick). 3/3 same-tick room-clearing kills across two independent runs have no damage number; every other kill (49/49 across both runs) has one. Also observed: frame gaps > 100 ms at ticks 405/418/422/429 (238/146/121/134 ms — arena build during `startRun`, before any enemy), 1083 (101 ms, mid-wave, once) and 1432 (232 ms, the room-1 clear tick). 0 PAGEERROR, fps 83.3.

### C4 pixels — natural hits with per-frame crops on disk (captures/certC1-pxgrab.console.txt, tools/certC1-grabgen.mjs → tools/actions/certC1-pxgrab.json, decoder tools/certC1-pxsheet.mjs)
Same sampler, but a rolling 3-frame crop buffer is kept for EVERY live enemy and frozen on each natural `hit` (victim's 3 pre-frames + next 6 rendered frames, ghost box after a death). No screenshot was taken during the fight (a `shot` stalls rendering ~4 ticks). Seed 555, room 1 → room 2 (defend), 82.6 fps, 1430 frames / 1088 ticks, 0 PAGEERROR.

**20 natural hits**: flash **6/6 non-kill** + **14/14 kills** (pixels), numerals **19/20** (the miss is t1407 — the last kill of room 1 before room 2's ids appear: the same-tick room-clear case again, 4th instance), `sound hit` **20/20**, `hitstop 3 kill` **14/14**, kill shake 13/14 (t472, the run's first kill, jerk 0.0046 — that frame span had 3–5-tick gaps while six crops were being encoded; kill shake across all three runs is **50/51**), knockback 5/6 non-kill (the 6th, t1775, is the hit the loop stopped on — 1 tick of data).

Crop sets (4× nearest zoom, boxes in full-frame 1600×900 coordinates; white = luma>230 & sat<0.18 share of the box):

| set | victim / hit | frames (tick: white %) | on disk | what the sheet shows |
|---|---|---|---|---|
| 3 | boar 5, `archer_basic 12`, **survived** (20→8) | pre 599 / 602 / 604: **0 / 0 / 0 %** (maxLuma 161–215) → **606: 73.2 %**, **607: 72.0 %**, **607: 72.6 %** → 609 / 609 / 610: **0 %** | `certC1-pxgrab3-sheet.png`, crops `certC1-pxgrab3-g00-t599-pre.png` … `-g08-t610-post.png`, box (421,322,64,87) | frames 0–2 blue-grey hide + violet spines; frames 3–5 the whole body bloomed to cream-white; frame 6 back to normal. Box x 424 → 421 → 416 → 406 → 401 over 604→610 = knockback 23 px west (0.235 u in sim) |
| 5 | mantis 6, `archer_basic 12`, **survived** | pre 676 / 678 / 680: 0 / 0 / 0 % → **682: 44.7 %**, **684: 38.5 %** → 686–692: **0 %** | `certC1-pxgrab5-sheet.png`, box (1153,421,64,85) → (1166,423) → (1178,426) | frames 3–4 white body at ≈(1153–1230, 421–506); box drifts 25 px east across the hit = knockback 0.247 u |
| 2 | boar 7, `whirling_guard 20`, **killed** | pre 548/552/555: 0 % (maxLuma 190) → **559: 97.6 %, 559: 93.6 %, 562: 77.1 %** → 565/568/571: 14–28 % | `certC1-pxgrab2-sheet.png`, box (577,590,64,78) | death flash then the burst/pop fading |
| 4 | boar 5, `heavy_slam 34`, killed | 617–619: 0 % → **620: 76.7 / 77.6 %, 622: 81.7 %**, 624: 65 %, 627: 58 %, 630: 12.5 % | `certC1-pxgrab4-sheet.png`, box (418,327,64,87) | kill flash + pop |
| 1 | boar 4, `piercing_shot 30`, killed (first kill of the run) | 461–468: 0 % → **472: 69.0 %**, 475: 41.6 %, 479–491: 10–23 % | `certC1-pxgrab1-sheet.png`, box (1081,119,64,89) | kill flash + burst |
| 6 | mantis 6, `archer_basic 12`, killed | 698–702: ≤0.8 % → **703: 47.6 / 49.4 %**, 705: 42.3 %, 707: 23 %, 709: 10 %, 711: 0 % | `certC1-pxgrab6-sheet.png`, box (1177,419,64,85) | kill flash + pop |

Flash duration on the two non-kill sets is exactly the 3-tick window the brief specifies (606–608, 682–684); the white share drops back to 0 % on the first frame after it. Numeral evidence in full-frame PNGs (previous instance + this one): `certC1-hitseq_00.png` "30" at (1310,701,52,45) beside the kill burst; `certC1-flash1-hit.png` "8" at ≈(978,355) over the dummy; `certC1-pxflash1-hit.png` "26" at (945,328,59,51); `certC1-boss-quake.png` "12 14 30 14 14" cluster at ≈(660–940, 300–345).

## Summary — Responsiveness bar

| probe | result | key numbers |
|---|---|---|
| C1 movement latency | **MET** | 20/20 keydowns (KeyD/A/W/S ×5) move the player on t0+1 (corrected latency 1, worst raw 2 = one render frame spanning two ticks); 20/20 A/D flips at 100 ms register on the next tick, velocity-sign trace shows no queued direction |
| C2 dash / i-frames | **MET** | Space → `intent dodge` on t0+1 in 5/5 trials, 15 ticks / 1.8 u every time; `hitOnce` mid-dash → `hit_immune reason iframe`, HP 100→100 ×4; same call after `dash_end` → `hit 8`, HP 100→92 ×3; natural boar bite inside the dash (t1762) immune, next bites (t1810/1858) land |
| C3 telegraphs | **MET** | 20 `telegraph_start` over 79.6 s, all planned 42 ticks; 10/10 resolved at exactly 42 with `enemy_fire` on the resolve tick, the other 10 casters died inside the wind-up; Ember ring + chevron visible mid-telegraph (540 danger px in the 120×95 box, `certC1-tele-mid2.png`); clean frames 14 / 14 / 39 danger px (< 500) |
| C4 hit feedback | **NOT MET (one element)** | flash 6/6 + 9/9 non-kill and 29/29 on-screen kills in per-frame pixels (crops on disk); numerals 26/26 + 19/20 + 32/34 + 29/30 — every miss is the same-tick room-clearing kill; knockback 10/10 + 7/9 + 5/6 (rest = sampler gaps); sound 30/30 + 26/26 + 20/20; hitstop 3 ticks on 20/20 + 17/17 + 14/14 kills; kill shake 50/51 |
| C5 camera | **MET** | player sx 799–848 / 931–952, sy 424→232 across 4 s holds; max inter-sample jump 44 px (2.8 % of width); corners (332,654) / (573,204) / (928,204) all inside the central 60 % (320–1280 × 180–720); per-tick camera step p99 0.145 u, only the arena-entry snap larger |
| C6 threat pointers | **MET** | natural: `offFrame 2, markersDrawn 2, domMarkers 2`, chips at (1576,590) and (447,876); forced: 4/4/4, chips at ≈(1383,22), (1573,37) and a "×2" merge at ≈(1560,432) (`certC1-threat-forced-crop3x.png`) |

Console: **0 PAGEERROR / 0 [error]** across all 20 certC1 consoles (13 previous-instance + clean-prespawn/between/arena, lastkill, lastkill2, boss, pxflash, pxgrab). v0.4.16 on every snapshot.

## Failures

### F1 (mustFix) — the kill that clears a kill_all room gets no damage numeral
- Evidence: `certC1-lastkill2` room 1 `death` mantis 42 = `room_cleared` **t1432**: no `.dmg-num` in [1430,1440], `vfx.numerals` 0 → 0; room 3 `death` 191 = `room_cleared` **t4868** (`piercing_shot 30`): no "30" ever, and `vfx.numerals` **1 → 0 on t4868** (the in-flight "12" from t4867 at (554,171) was wiped too) with only a 22 ms frame gap, so not a stall artefact. Control: the defend room's last kill (t4077, cleared by timer 90 ticks later) got its "12" at +0 (219,361). Previous instance `certC1-hits` t1899 (room-1 clearing kill, `numDomHit false`); `certC1-pxgrab` t1407 (last room-1 kill, `NO []`). **4/4** same-tick room-clearing kills lack the numeral; **81/81** other kills and **15/15** non-kill hits have one. Every other feedback element (kill flash W 0.4–1.0, `hitstop 3 kill`, `sound hit+kill`, shake) fires on those same kills.
- Bar: REFERENCE_BAR check 5 "damage numbers pop on every hit" and Responsiveness bar "Hits register with … damage number"; this block's gate "a hit missing any feedback element → FAIL".
- Reproduce: `node tools/cert-capture.mjs shot certC1-lastkill2 --url "http://127.0.0.1:5199/?seed=555" --actions tools/actions/certC1-lastkill2.json --timeout 180000` then `node tools/certC1-pxtable.mjs captures/certC1-lastkill2.console.txt` → the `room clears` line lists `killsMissingNumeral` = the deaths whose tick equals `room_cleared`. Expected after the fix: `killsMissingNumeral []` and the clear-tick numeral count not dropping to 0.
- Files that mention the numeral layer / room clear (located by identifier only, not read): `src/render/numbers.js` (`dmg-num`, `room_cleared`, `numerals`), `src/sim/run.js`, `src/sim/waves.js`, `src/main.js`.

## Advisories (not blocking)
- A1 Frame stall on the room-1 clear tick: **232 ms** at t1432 (`certC1-lastkill2`), **195 ms** at t1899 (`certC1-hits`) — the reward/draft build lands on the kill's hitstop tick; room 3's clear (→ path screen) had no stall (22 ms). Also 238/146/121/134 ms gaps at ticks 405–429 during `startRun` arena build (before any enemy) and one 101 ms gap at t1083 mid-wave. Perf-bar territory (block D); not a steady-state wave hitch.
- A2 Antler Quake resolve did not shake the camera (jerk 0.021 / 0.000 vs baseline p95 0.015; kill shake 0.066) with the player ~3 u outside the ring — consistent with brief §9 "player-adjacent explosions and kills"; a quake landing on the player was not tested.
- A3 `cmd('hitOnce', id)` returns null on live boars/mantises (lands only on dummies and party) — debug-API scope note for future critics; natural hits were used instead.
- A4 Kill screenshake read 0.0046 on the first kill of `certC1-pxgrab` (t472) while six crops were being encoded per frame (3–5-tick frame gaps) — sampler dilution; 50/51 kills across three runs shook the camera 0.014–0.154 u/tick².
- A5 Headless `page.screenshot` costs ~0.9 s and stalls rendering ~4 ticks, so `seq … 100` cannot deliver 100 ms spacing here (the previous `certC1-hitseq_00..07` frames are ~50 ticks apart); per-frame canvas sampling (`tools/certC1-pxgen.mjs`, `tools/certC1-grabgen.mjs`) is the reliable way to catch 3-tick effects.
