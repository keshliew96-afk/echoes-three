STATUS: PARTIAL
(verdict pending)

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
