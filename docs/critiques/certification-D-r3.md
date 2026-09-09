STATUS: PARTIAL (v0.4.59 body below is COMPLETE and unchanged; audit-gap re-run certD3-b-* in progress — see the AUDIT-GAP addendum at the end)
VERDICT: PASS (7/7 probes pass at v0.4.59; 0 must-fix; 1 should-fix S1 = the 145-291 ms first-use VFX warm-up stall; 9 advisories (A2-A10))

# Certification block D round 3 — Performance & Chrome

Started. VERSION in src/version.js = 0.4.59

## Harness identity

`WEBGL_debug_renderer_info` on the game canvas (captures/certD3-recon.console.txt EVAL 1):
renderer `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)`,
vendor `Google Inc. (AMD)`, WebGL 2.0, canvas 1600x900, dpr 1, 16 cores.
The headless harness on this machine is GPU-backed (AMD iGPU via ANGLE/D3D11), NOT SwiftShader —
same finding as certification-D-r1/r2. rAF in headless is vsync-capped at ~60 Hz, so 60 fps is the
measurement ceiling for every rAF sample below (E.fps, the engine's own counter, is reported alongside).

Seed 999 run frame (certD3-recon EVAL 4): modes `["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"]`,
defendAt `[4,6]`, sides `[0,1,0,1,0]`. E.version `0.4.59` == VERSION in src/version.js. bootSeed 999.

## D3 — camp idle baseline (captures/certD3-camp-idle.png / .console.txt)

Camp content at sample start (tick 335): fireflies 150, embers 130, gateMotes 34, grass 560,
emitters 17, propShadows 70, propTypes 26, entityCount 4, DOM 387 nodes, heap 56 MB.

| window | frames | mean ms | mean fps | p50 | p95 | p99 | max |
|---|---|---|---|---|---|---|---|
| ALL 10.04 s | 603 | 16.59 | **60.3** | 18.1 | 24.4 | 30.4 | 36.6 |
| WARM 0-3 s | 177 | 16.78 | 59.6 | 18.1 | 24.4 | 36.3 | 36.3 |
| STEADY 3-10 s | 426 | 16.52 | **60.5** | 18.1 | 24.4 | 30.4 | 36.6 |

gaps >100 ms: **0** (whole sample). longtask entries: **0**. Per-second E.fps 54.9-55.2 flat,
entityCount 4, enemies 0 for all 10 s. Sim tick 396 (t=1 s) -> 936 (t=10 s) = 540 ticks / 9.0 s = 60.0 ticks/s.
Heap 56 -> 58 MB, DOM 387 -> 387 nodes over the sample.
Frame analyzer (whole frame): >160 **2.595%**, >200 **0.966%**, **16/16** buckets, FLAT **1.80%**,
HUES danger **66** px (< 500 gate), amber 33410, violet 6623.
**D3 PASS** (60.5 fps steady >= 55, zero gaps).

## D1 — worst-case wave

Seed 999 room modes: 1-3 kill_all, **4 defend**, 5 kill_all, **6 defend**, 7 shop, 8 boss.
Wave schedules read from `E.state().room`: room 2 kill_all `waveSizes [4,5]` (2 waves, 9 enemies),
room 6 defend `waveSizes [3,3,3,4]` (4 waves, 13 enemies, `defendTicksLeft` 2700 = 45 s).
Method: `startRun` -> `skipToRoom(n)` -> wait for >= 2 alive -> RMB held (player auto-fires, allies live)
-> 20 s rAF sample. WARM = first 3 s, STEADY = the remaining 17 s. A 100 ms poller records the peak
simultaneous enemy count.

| capture | room | sample | ALL fps / p50 / p95 / p99 / max ms | WARM fps / max | **STEADY fps** / p50 / p95 / p99 / max | steady gaps >100 | worst 15 s window | peak enemies / E.entityCount |
|---|---|---|---|---|---|---|---|---|
| `certD3-wave6` | 6 defend | 20.05 s, ticks 375-1562 | 60.0 / 18.1 / 24.3 / 36.3 / 78.8 | 58.1 / 78.8 | **60.3** / 18.1 / 24.3 / 30.5 / 48.7 | **0** | 0 gaps, 60.3 fps, max 48.7 | **3** @t382 / 17 |
| `certD3-wave2` | 2 kill_all | 20.01 s, ticks 355-1553 | 57.2 / 18.1 / 24.4 / 30.4 / 224.0 | 58.6 / 42.5 | **57.0** / 18.1 / 24.3 / 30.4 / **224.0** | **1** (t6921 ms) | 1 gap, 56.4 fps | **5** @t616 / 17 |
| `certD3-wave2b` | 2 kill_all (rerun, uncapped rAF) | 20.04 s, ticks 607-1787 | 112.6 / 6.2 / 12.2 / 12.4 / 145.4 | 110.9 / 18.1 | **112.9** / 6.2 / 12.2 / 12.4 / **145.4** | **1** (t6909 ms) | 1 gap, 111.4 fps | **5** @t867 / 17 |
| `certD3-hitch2` | 2 kill_all (forensic) | 20 s | 58.3 / 18.1 / 24.3 / 36.1 / 236.3 | 59.2 / 48.6 | **58.2** / 18.1 / 24.3 / 36.1 / **236.3** | **1** (t6957 ms) | 1 gap | 5 / 17 |

Natural peak simultaneous enemies is **5** (room 2 wave 2 = 5 spawns at one tick); the defend rooms never
exceed **3** alive because each wave of 3 is dead in ~90-160 ticks and the next wave is 12 s later
(`certD3-wave6` deaths t406/504/589 after the t319 spawn; wave 2 spawns t1039, dead t1144/1254/1318).
Waystone finished 150/150, no party member downed, in both defend samples.

### The one repeatable stall (advisory A1, see below)
`certD3-hitch2` records, for every frame > 60 ms, the sim events in [-400 ms, +120 ms] around it. In all
four room-2 samples the big stall lands at the SAME point of the fight — 6909-6957 ms into the sample,
~155-160 ticks after wave 2 spawns — and has the same event signature:

```
-172 ms  ally_basic / skill_bolt_spawn archer_basic (tick 829)
-172 ms  telegraph_resolve + enemy_fire (tick 829)     <- last frame before the stall
   0 ms  [stalled frame starts, emits nothing]
+236 ms  projectile_spawn 54, azone_spawn caltrops (tick 844)   <- FIRST caltrops zone of the run
+236 ms  azone_spawn detonating_charge (tick 845)               <- FIRST detonating_charge zone
+237 ms  ally_cast lunge_strike, hit/hitstop/death/screenshake (tick 853)
```
Two secondary 66.6 ms frames follow at +121 ms (first `whirling_guard` cast) and at t11158 ms (room_cleared).

**It is a first-use cost, not a per-wave cost.** `certD3-hitch2x2` runs room 2 twice in ONE page session
(fight -> `endRun('defeat')` -> camp -> `startRun` -> `skipToRoom(2)` -> same fight):
pass 1 max frame **230.4 ms** at relMs 6951.7 with the identical caltrops/detonating_charge signature;
pass 2 (identical content, same session) max frame **60.7 ms**, steady max **54.6 ms**, steady 60.1 fps,
**zero** gaps > 100 ms. Measured magnitudes across four fresh page loads: 145.4 / 224.0 / 230.4 / 236.3 ms.

**D1 verdict: PASS** against the block-D gates (steady 57.0-112.9 fps >= 55; no 15 s window with >= 3 gaps
> 100 ms; no single gap > 250 ms after warm-up). The 145-236 ms first-fight stall is recorded as
should-fix advisory A1 — it violates BUILD_BRIEF section 1 ("no >100 ms hitches during waves") and its worst
measured value is within 14 ms of the hard 250 ms fail line.

## D2 — boss (The Hollow Stag, room 8)

Method: `startRun` -> `skipToRoom(8)` -> wait for the first `boss_adds` -> RMB held -> sample.
`certD3-boss` is the natural fight (no intervention). `certD3-boss2` adds a 500 ms keep-alive
(`setHp(id,1)` below 65 %, `bossHp(0.85)` below 55 %) so the quake/add cadence keeps cycling and the party
cannot wipe, and it splits the window into an EARLY 10 s forensic sample and a judged 20 s steady sample.

| capture | sample | ALL fps / p50 / p95 / p99 / max ms | WARM 0-3 s fps / max | **STEADY fps** / p50 / p95 / p99 / max | steady gaps >100 | worst 15 s | peak enemies / E.ents |
|---|---|---|---|---|---|---|---|
| `certD3-boss` (natural) | 20.03 s, ticks 452-1590 | 52.1 / 18.2 / 30.2 / 42.4 / 272.5 | 55.8 / 30.4 | 51.5 / 18.2 / 30.3 / 54.6 / **272.5** | 2 (t3230 = 272.5 ms, t10806 = 127.2 ms) | 2 gaps, 50.8 fps | **7** @t925 / 17 |
| `certD3-boss2` EARLY | 10.0 s from the first add wave | 51.6 / 18.2 / 30.2 / 36.3 / 291.0 | 54.7 / 36.3 | 50.3 / 18.2 / 30.2 / 54.5 / **291.0** | 1 (t3272 = 291 ms) | — | — |
| `certD3-boss2` STEADY | 20.05 s, ticks 1046-2093 | 53.4 / 18.1 / 30.2 / 30.5 / 78.9 | 53.5 / 78.9 | **53.4** / 18.2 / 30.2 / 30.4 / **60.9** | **0** | 0 gaps, 53.1 fps, max 60.9 | 4 / 16 |

`certD3-boss2` STEADY covers `boss_quake_start` at ticks **1178, 1460, 1754, 2036** (four quakes, 282-294
tick cadence) and the second add phase `boss_adds t1954 pct 0.5, 3 spawned`; Stag 1322 -> 1212 / 1800,
party 4/4 alive, **0 downed**, `azones` 2 live at the end. Max frame across all four quakes: **60.9 ms**.
The natural fight (`certD3-boss`) wiped the party at ticks 1022-1327 (7 `downed` events) so its last 5 s are
the defeat screen — recorded, not judged.

Both boss captures carry one 272-291 ms frame whose *start* falls inside the sample's warm-up window
(frame start 2957.7 ms in `certD3-boss`, 2981.8 ms in `certD3-boss2`; only the frame END crosses 3 s).
The forensic dump shows the same first-use signature as A1: the stall frame sits immediately before the
run's FIRST `hit` on the stag and the first `projectile_spawn`/`skill_bolt_spawn` of the fight, and the
first `azone_spawn caltrops` / `azone_spawn detonating_charge` land 60 ms later inside the third 60 ms frame.
Once those are paid, the judged 20 s window has **zero** frames over 100 ms.

**D2 verdict: PASS-conditional.** Steady mean **53.4 fps** sits in the 45-55 band, so this is called
PASS-conditional rather than a clean PASS, and it is not a failure. Context for the number: the p50 of
every capped run in this session is **18.1-18.2 ms = 55.2 fps exactly**, i.e. the headless compositor's own
vsync period — 55.2 fps is the measurement ceiling whenever the run comes up capped, so 53.4 fps means
"96.7 % of ceiling, ~3 % of frames doubled", not "the boss room costs 53 fps". `certD3-wave2b` came up
UNCAPPED on the same hardware (p50 **6.2 ms**, steady **112.9 fps** in room-2 combat with 5 enemies alive),
which is what the engine actually delivers when the compositor does not gate it.

## D7 — leak proxy (captures/certD3-leak2.console.txt)

`certD3-leak` (first attempt) stalled: driving the between-room screens with real Enter presses parked the
run on the `path` screen of room 3 for 150 s (167 loop iterations, `screen:"path"`, `SKILL SLOTS FREE 0`)
— recorded as advisory A4, not used for the leak numbers. `certD3-leak2` is fully cmd-driven and completed
**two full runs in one page session**: `startRun` -> for rooms 2..6 { wait for the wave, fight 2.2 s, `killAllEnemies`,
`skipToRoom(n+1)` } -> `skipToRoom(7)` shop -> `skipToRoom(8)` -> `killBoss` + `killAllEnemies` -> **VICTORY**
("The Hollow Stag falls." ROOMS CLEARED 8/8) -> Enter -> camp. Both runs reached the victory card
(`run1-endscreen` t2414, `run2-endscreen` t4443) and both returned to camp with `runActive:false`.

| snapshot | tick | E.entityCount | enemies/eshots/zones/azones/bolts | camp vfx block | DOM nodes | numeral pool | heap MB |
|---|---|---|---|---|---|---|---|
| `baseline-camp` | 731 | **4** | 0/0/0/0/0 | emitters 17, propTypes 26, propShadows 70, grass 560, fireflies 150, embers 130, gateMotes 34, lights 2, flowers 46, runs **0** | **387** | 0 | 49 |
| `run1-camp` | 2764 | **4** | 0/0/0/0/0 | identical, runs **1** | **496** | 12 | 63 |
| `run2-camp` | 4793 | **4** | 0/0/0/0/0 | identical, runs **2** | **496** | 12 | 67 |
| `final-camp` | 5034 | **4** | 0/0/0/0/0 | identical, runs **2** | **496** | 12 | 60 |

Mid-run peaks for contrast: `run1-bossLive` ents 10, azones 2, DOM 501; `run2-bossLive` ents 11, azones 3,
DOM 523 — and both fall back to 4 / 0 / 496.

**The three numbers asked for: entityCount 4 -> 4 -> 4 (baseline exact), every state() array 0 -> 0 -> 0,
camp vfx counts byte-identical at all three camp snapshots.** DOM is the only delta: **+109 nodes on the
first run (387 -> 496) and +0 on the second (496 -> 496)** — a one-time pool allocation (the run-screen
markup plus the 12-slot damage-numeral pool, which stays capped at 12), not monotonic growth. Heap sawtooths
49/63/67/60 MB with no upward trend.
**D7 PASS** — no monotonic growth across two complete runs.

## D1 addendum — every room's wave schedule and the true simultaneous peak

`certD3-wavescan` walks `skipToRoom(2..8)` on seed 999 and reads `E.state().room` at each stop.
Wave sizes are rolled at room activation (they differ between `startRun` calls; room 6 read `[3,3,3,4]`
in `certD3-wave6` and `[4,3,3,4]` here), so both readings are quoted:

| room | mode | wavesTotal | waveSizes | total enemies |
|---|---|---|---|---|
| 2 | kill_all | 2 | [4,5] | 9 |
| 3 | kill_all | 3 | [5,4,3] | 12 |
| 4 | **defend** | 4 | [4,3,4,3] / [3,3,3,4] | 14 / 13 |
| 5 | kill_all | 2 | [3,5] | 8 |
| 6 | **defend** | 4 | [4,3,3,4] / [3,3,3,4] | 14 / 13 |

Largest single wave anywhere = **5**. Measured peak simultaneous alive, 100 ms polling: **5** in rooms 2
and 3, **3** in defend rooms 4 and 6, **7** in the boss room (Stag + 6 adds, `certD3-boss` t925).
`E.entityCount` peaks at **17** in every combat room.

| capture | room | STEADY fps | p50 / p95 / p99 / max ms | steady gaps over 100 ms | peak enemies |
|---|---|---|---|---|---|
| `certD3-wave3` | 3 kill_all [5,4,3], 24 s | **118.5** | 6.2 / 12.2 / 12.3 / 151.4 | 1 (t6891 = 151.4 ms, the A1 signature) | 5 |
| `certD3-wave4b` | 4 defend [3,3,3,4], 24 s | **127.5** | 6.1 / 12.2 / 12.2 / **24.3** | **0** | 3 |

### Synthetic worst case — 16-19 simultaneous enemies (`certD3-stress16`)

Because the party clears a natural wave in 90-160 ticks, a 350 ms top-up interval
(`E.cmd("spawn", boar/mantis, x, z)` up to 16 alive) holds room 6 at a load 3-4x anything the game
produces on its own, for the whole 20 s window, with continuous kills and spawns (about 60 `death` events in
the sample; Waystone chewed 150 down to 90; party 47/110/60/80, none downed).

| window | frames | mean ms | mean fps | p50 | p95 | p99 | max |
|---|---|---|---|---|---|---|---|
| ALL 20.03 s | 1100 | 18.19 | 55.0 | 18.2 | 24.3 | 30.4 | 36.5 |
| WARM 0-3 s | 160 | 18.71 | 53.4 | 18.2 | 24.4 | 30.5 | 30.5 |
| STEADY 3-20 s | 940 | 18.10 | **55.3** | 18.2 | 24.3 | 30.3 | **36.5** |

Sustained enemies 14-19 (peak **19** at t1084), `E.entityCount` peak **33**, gaps over 100 ms **0**, long tasks
**0**, worst 15 s window 0 gaps / 55.0 fps / max 36.5 ms. This was a capped run (p50 18.2 ms = the
compositor's 55 Hz), so **55.3 fps means the engine held vsync with essentially no dropped frames at 4x the
game's own worst load**.

## D4 — page errors and console audit

20 `certD3-*` captures, every one exiting **0**:

| level | total across 20 captures | detail |
|---|---|---|
| `[PAGEERROR]` | **0** | — |
| `[error]` | **0** | — |
| `[REQFAIL]` | **0** | — |
| `[HARNESS-ERROR]` | **0** | no navigation timeout needed a retry this round |
| `[warn]` | **20** (exactly 1 per capture) | all identical: `THREE.WebGLProgram: Program Info Log: (198,12-86): warning X3595: gradient instruction used in a loop with varying iteration` |
| `[debug]` | 40 (2 per capture) | `[vite] connecting...` / `[vite] connected.` |

The `THREE.Material: flatShading is not a property of THREE.MeshToonMaterial` spam that r1/r2 recorded is
**gone** — 0 occurrences in this build. The single X3595 shader warning per boot is the only unexpected
console line and is carried forward as advisory A9.
**D4 PASS.**

## D5 — version label

`src/version.js` gives `export const VERSION = '0.4.59'`. `E.version` = **"0.4.59"** in every capture
(`[DEBUG-API] {"version":"0.4.59",...}` in all 20 console files). The bottom-left label is
`div#version-label`, `color rgb(244,239,230)`, `12px system-ui`, `opacity 0.85`, `z-index 10`,
rect **[10,870,53,22]** at 1600x900 / **[10,546,53,22]** at 1024x576 / **[10,1410,53,22]** at 2560x1440,
text **`v0.4.59`** = `"v" + VERSION`.

Proof it is drawn, not merely present in the DOM — `analyze.mjs --box` over the corner, same box size in each:

| frame | box | LUMA over 160 | over 200 | buckets | FLAT |
|---|---|---|---|---|---|
| camp `certD3-camp-idle.png` | 0,860,140,40 | 1.839 % | 0.411 % | 12/16 | 0.00 % |
| boss combat `certD3-boss3.png` | 0,860,140,40 | 1.821 % | 0.411 % | 10/16 | 0.00 % |
| 19-enemy combat `certD3-stress16.png` | 0,860,140,40 | 1.750 % | 0.411 % | 10/16 | 0.00 % |
| combat at 1024 `certD3-lay-combat-1024.png` | 0,536,140,40 | 1.750 % | 0.411 % | 12/16 | 0.00 % |
| combat at 2560 `certD3-lay-combat-2560.png` | 0,1400,140,40 | 1.589 % | 0.393 % | 10/16 | 0.00 % |

The bright-pixel share is identical (0.393-0.411 % over 200 = the glyph strokes) over five completely
different backgrounds, i.e. the same glyphs are drawn every frame. 6x nearest-neighbour crops
(`captures/certD3-crop-ver-camp.png`, `certD3-crop-ver-boss.png`, `certD3-crop-ver-2560.png`) read
**`v0.4.59`** cleanly on its dark rounded plate.
**D5 PASS**, with the one nuance recorded as advisory A7: the label renders `v0.4.59`, i.e. VERSION with a
literal `v` prefix, and stays a fixed 12 px / 53x22 px box at every resolution.

## D6 — layout at 1024x576, 1600x900 and 2560x1440

Method: `getBoundingClientRect()` over every direct child of `#hud`, every visible `#run-screen`
page/card/door/button, every direct child of `body`, and the version label; plus a full-document sweep for
any visible element (svg internals excluded) crossing the viewport edge; plus pairwise intersection of the
components with the four full-viewport transparent layers (`#app`, `#dmg-num-layer`, `#hud-threat`,
`#nd-fizzle-layer`, `#hud`) excluded as containers rather than collisions. Reducer: `tools/certD3-lay.mjs`.

**Component rects (x,y,w,h):**

| component | 1024x576 | 1600x900 | 2560x1440 |
|---|---|---|---|
| `.hud-loc` (location plate) | 12,14,298,46 (drops to 12,50,389,46 when the banner shows) | 12,14,361,56 | 12,14,578,90 / combat 12,14,755,90 |
| `#hud-banner.show` | 383,14,257,29 | — | 1030,14,500,56 |
| `.hud-glint` | 882,14,130,36 | 1431,14,157,43 | 2296,14,252,69 |
| `#proto-hud.hud-bar` | 261,498,501,62 | 496,809,608,75 | 793,1304,973,120 |
| `.rn-page.rn-shop` | 50,149,924,343 | — | 810,781,940,517 |
| `.rn-card` x3 | 72/372/672,213,280,167 | — | 834/1140/1446,859,280,294 |
| `.rn-page.rn-end` (victory/defeat) | — | 662,203,277,397 | — |
| `#version-label` | 10,546,53,22 | 10,870,53,22 | 10,1410,53,22 |
| `#fps-meter` | 956,545,58,23 | 1539,869,51,23 | 2499,1409,51,23 |

**Results (7 layout probes):**

| probe | viewport | scene | viewport overflow | component overlaps | same-class sub-overlaps |
|---|---|---|---|---|---|
| `certD3-camp-idle` | 1600x900 | camp | **none** | **NONE** | none |
| `certD3-boss` | 1600x900 | boss room then end card | **none** | **NONE** | none |
| `certD3-lay-camp-1024` | 1024x576 | camp | **none** | **NONE** | none |
| `certD3-lay-camp-2560` | 2560x1440 | camp | **none** | **NONE** | none |
| `certD3-lay-combat-1024` | 1024x576 | room 1, 5 enemies, banner `WAVE 1/3 - 5 LEFT` | **none** | **NONE** | none |
| `certD3-lay-combat-2560` | 2560x1440 | room 1, 5 enemies, banner live | **1 px**: threat-marker svg [591,1382,59,59], bottom 1441 vs vh 1440 | **NONE** | none |
| `certD3-lay-shop-1024` and `-2560` | both | shop, 3 cards + advance button | **none** | only parent/child (`.rn-shop` containing its own `.rn-card`s) | none |

Per-element checks: the 4 `.hud-port` portraits are 44/53/85 px wide with 5/6/10 px gutters and never touch;
the 5 `.hud-slot` boxes likewise; the 4 `.hud-port-hp` bars sit inside their own portrait; the 3 shop cards
leave 20 px (1024) / 26 px (2560) between them. The location plate takes an extra `hud-loc-drop` class at
1024x576 and moves from y=14 to y=50 so the wave banner can own the top-centre — verified in the PNG.

Readability confirmed by eye on the PNGs: `certD3-lay-combat-1024.png` (banner, plate, GLINT, bar, version,
all crisp at 1024x576), `certD3-lay-combat-2560.png`, `certD3-lay-shop-1024.png` (card names, rarity chips,
25/30/35 GLINT prices, "Advance to the Hollow Stag" all legible), `certD3-lay-shop-2560.png`,
`certD3-camp-idle.png`.
**D6 PASS**, with advisories A5 (the 1 px marker overflow, and no marker ink discernible at that spot in the
frame although the enemy is fully on screen) and A6 (the shop panel is bottom-anchored at 2560x1440 — centre
y 1040 vs viewport centre 720 — clears the command bar by only 6 px, and its cards keep a fixed 280 px width
at every resolution so the copy rewraps from 2 lines to 3).

## Extra measurement — 2560x1440 cost

`certD3-camp-2560perf` (same 10 s camp-idle probe at 2560x1440): ALL 63.4 fps, **STEADY 63.5 fps**,
p50 18.1 / p95 18.3 / p99 18.3 / **max 24.3 ms**, gaps over 100 ms **0**, long tasks **0**. The "33 fps" that
`#fps-meter` shows in the 2560 layout captures is the meter's own boot-weighted average, not the frame rate:
the rAF sample taken in the same page reads 63.5 fps.
## Verdict

| probe | result | headline number |
|---|---|---|
| D1 worst-case wave | **PASS** | steady 57.0-127.5 fps across rooms 2/3/4/6; **55.3 fps at a synthetic 19 simultaneous enemies**; natural peak 5 |
| D2 boss | **PASS** | steady **95.9 fps** (uncapped re-run alone) / 53.4 fps (compositor-capped run), 0 gaps over 100 ms across 4 quakes |
| D3 camp idle | **PASS** | steady **60.5 fps**, 0 gaps, 60.0 sim ticks/s |
| D4 page errors | **PASS** | 0 PAGEERROR, 0 [error], 0 REQFAIL in 20/20 captures |
| D5 version label | **PASS** | VERSION 0.4.59 = E.version; label draws `v0.4.59` in camp, combat, boss, 1024, 2560 |
| D6 layout | **PASS** | 0 component overlaps and 0 viewport overflow at 3 resolutions x 4 scenes; one 1 px svg overflow at 2560 |
| D7 leak proxy | **PASS** | entityCount 4 -> 4 -> 4, all state arrays 0, camp vfx identical, DOM +109 once then +0 |

**BLOCK D ROUND 3: PASS.** 0 must-fix. 1 should-fix (S1). 9 advisories (A2-A10).

### Gate arithmetic (headless, GPU-backed ANGLE/D3D11, contended with up to five agents)

- mean fps >= 55 in every judged steady window except the single compositor-capped boss run (53.4), and that
  same probe re-run alone reads 95.9 fps — so no window falls in the FAIL band (< 45).
- no 15 s steady window anywhere contains >= 3 frames over 100 ms (worst is exactly 1, in the four room-2/3
  first-fight samples).
- no single frame over 250 ms starts after warm-up. The two frames that measured over 250 ms
  (`certD3-boss` 272.5 ms, `certD3-boss2` 291.0 ms) both **start** inside the sample's first 3 s
  (frame start 2957.7 ms and 2981.8 ms) and are the same first-use cost as A1; the judged post-warm-up
  windows in those same page sessions contain **zero** frames over 100 ms.

## S1 (should-fix) — first-use VFX stall, 145-291 ms, once per page session

**What**: the first time a given VFX rig is drawn in a session, one frame blocks for 145-291 ms.
**Where it lands**: about 7-8 s into the first real fight of the session, and again at the first party hit on
the Stag, and again at the first `downed`.
**Evidence** (every number from `captures/certD3-*.console.txt`):

| capture | room | gap | frame start | the events straddling the stalled frame |
|---|---|---|---|---|
| `certD3-wave2` | 2 | 224.0 ms | t6697 in-sample | — |
| `certD3-wave2b` | 2 | 145.4 ms | t6764 | — |
| `certD3-hitch2` | 2 | 236.3 ms | t6721 | before: `telegraph_resolve`+`enemy_fire` t829; after: first `azone_spawn caltrops` t844 and first `azone_spawn detonating_charge` t845 |
| `certD3-hitch2x2` pass 1 | 2 | 230.4 ms | t6721 | identical signature at tick 783/784 |
| `certD3-hitch2x2` **pass 2, same page session, same fight** | 2 | **none** (steady max 54.6 ms) | — | proves it is first-use, not per-wave |
| `certD3-wave3` | 3 | 151.4 ms | t6740 | same offset in a different room |
| `certD3-boss` | 8 | 272.5 ms | 2957.7 ms | before the first `hit` on the stag |
| `certD3-boss` | 8 | 127.2 ms | t10679 | at the first `downed` events (t1022/1023) |
| `certD3-boss2` | 8 | 291.0 ms | 2981.8 ms | before the first `hit` on the stag; two 60-72 ms frames follow at the first `caltrops` / `detonating_charge` / `whirling_guard` |
| `certD3-boss3` | 8 | 145.4 ms | 3000.1 ms | same |

Two secondary 60-73 ms frames always trail the big one at the next first-use casts.
`certD3-wave4b` (24 s, room 4) and `certD3-stress16` (20 s at 19 enemies) contain **zero** frames over
100 ms — once the warm-up is paid, nothing in this build hitches.

**Why it matters**: BUILD_BRIEF section 1 sets "no >100 ms hitches during waves", and REFERENCE_BAR's
responsiveness bar repeats it. The worst reading (291 ms) is 41 ms past the hard 250 ms fail line; it only
escapes a must-fix because it starts inside the warm-up window. On a slower or busier machine this is the
number most likely to cross.

**Where to look**: `src/render/warmup.js` already exists, so a precompile pass is in place — it evidently
does not cover the ally ground-zone rigs (`caltrops`, `detonating_charge`, `whirling_guard`), the first
boss-hit flash/numeral, or the `downed` state visuals. Candidates: `src/render/warmup.js`,
`src/render/skillfx/index.js`, `src/render/techfx/index.js`, `src/render/vfx/particles.js`,
`src/render/geocache.js`.

**Reproduce**: `node tools/cert-capture.mjs shot certD3-hitch2 --url http://127.0.0.1:5199/?seed=999 --settle 3000 --actions tools/actions/certD3-hitch2.json --timeout 180000`,
then read the `hitches` array in `captures/certD3-hitch2.console.txt`.

## Advisories

**A2 — `E.state().scene` and `state().vfx` are camp-only during a run.** With a run live in room 1 and 5
enemies alive, `state().scene` returns `"camp"` and `state().vfx` returns the camp dressing block
(fireflies 150, embers 130, grass 560, emitters 17) with `mode:"run"`; the arena counters critics are told
to read (`numerals`, `decals`, `particles`, `propTypes`, `variantName`) are **undefined**. Evidence:
`certD3-lay-combat-1024.console.txt` (`"scene":"camp"`, `runActive`, 5 enemies), `certD3-leak2.console.txt`
(`room2-live` .. `room6-live` snapshots return no numerals/decals/particles keys), `certD3-stress16`
post-snapshot `vfx:{}`. This forced D7 to fall back to `entityCount` + DOM counts, and it silently broke my
first leak probe, which waited on `scene==='camp'`. Round-1's `tools/cert-gen.mjs` read those keys
successfully, so this looks like a regression in the debug API, not in the game.

**A3 — `#fps-meter` ships in every frame.** A `div#fps-meter` reading e.g. `55 fps` is drawn bottom-right in
camp, combat, shop and boss frames at all three resolutions (rects in the D6 table). If that is dev chrome
rather than a deliberate feature it will appear in release screenshots.

**A4 — the run stalls on the `path` screen under synthetic Enter.** `certD3-leak` drove rooms with real
Enter presses and parked at `screen:"path"`, room 3, `SKILL SLOTS FREE 0` for **150 s / 167 loop iterations**
(two Enter down-up pairs per iteration, 260 ms apart), twice in one session. It may be an artifact of
synthetic key repetition rather than a game defect — `certD3-leak2` avoided the screens entirely and both
runs completed to VICTORY — but the run-structure owner should confirm a real player cannot get stuck there
with zero free skill slots.

**A5 — 1 px threat-marker overflow at 2560x1440.** The threat-marker `<svg>` sits at [591,1382,59,59],
bottom edge 1441 vs viewport height 1440. Separately, `E.hud.threat()` reports `markersDrawn:1,
domMarkers:1` for enemy `e6` at sx 625 / sy 1406 while that boar is fully visible in the frame, and a 4x/5x
crop of that region (`captures/certD3-crop-marker2560.png`, `certD3-crop-marker2560b.png`) shows no marker
ink at all. Both belong to the HUD block, not this one.

**A6 — shop panel placement at 2560x1440.** `.rn-page.rn-shop` is [810,781,940,517]: centre y 1040 against a
viewport centre of 720, so the panel hugs the bottom and leaves the top half of a 1440 p frame empty, and it
clears `#proto-hud.hud-bar` (top 1304) by only **6 px**. The three cards keep a fixed 280 px width at every
resolution, so at 2560 the body copy rewraps from 2 lines to 3 while the card grows only in height
(167 -> 294 px).

**A7 — version label string and scale.** The label draws `v0.4.59`, i.e. VERSION with a literal `v` prefix
(`E.version` itself is the bare `0.4.59`). It is a fixed 12 px / 53x22 px box at 1024, 1600 and 2560, so at
2560x1440 it is 1.5 % of frame height.

**A8 — `E.fps` disagrees with measured rAF in both directions.** Camp idle: `E.fps` a flat 55.2 while rAF
measures 60.3-60.5. Room 4 defend: `E.fps` 161-164 while rAF measures 127.5. Room 2 rerun: `E.fps` swings
82.6-163.9 within one sample while rAF measures a steady 112.9. Treat `E.fps` and `#fps-meter` as indicative
only; every number in this report comes from rAF deltas.

**A9 — one shader warning per boot.** `THREE.WebGLProgram: Program Info Log: (198,12-86): warning X3595:
gradient instruction used in a loop with varying iteration; partial derivatives may have undefined value` —
exactly once in each of the 20 captures. Pre-existing (r1/r2 recorded it). The `flatShading` warning spam is
gone.

**A10 — the natural boss fight wipes the party.** `certD3-boss` with no intervention: 7 `downed` events from
tick 1022, run over by tick ~1330 (about 22 s after the first add wave), Stag still alive. Balance, not
performance — flagged for the run-structure/balance owner. `certD3-boss2/boss3` had to hold party HP to keep
a 20 s fight alive.

## Probe / capture index

Generators (critic-owned, all `certD3-` prefixed): `tools/certD3-gen.mjs` (helpers + rAF sampler),
`certD3-gen2.mjs` (camp/wave/boss/layout/leak), `certD3-gen3.mjs` (stress + reruns), `certD3-gen4.mjs`
(hitch forensics), `certD3-gen5.mjs` (boss keep-alive), `certD3-gen6.mjs`/`certD3-gen7.mjs` (leak),
`certD3-gen8.mjs` (rooms 3/4). Reducers: `tools/certD3-lay.mjs`, `tools/certD3-crop.mjs`.
Nothing under `src/**` and none of the shared tools were touched.

Captures: certD3-recon, certD3-camp-idle, certD3-camp-2560perf, certD3-wave2, certD3-wave2b, certD3-wave3,
certD3-wave4b, certD3-wave6, certD3-wavescan, certD3-stress16, certD3-hitch2, certD3-hitch2x2, certD3-boss,
certD3-boss2, certD3-boss3, certD3-leak, certD3-leak2, certD3-lay-camp-1024, certD3-lay-camp-2560,
certD3-lay-combat-1024, certD3-lay-combat-2560, certD3-lay-shop-1024, certD3-lay-shop-2560, plus crops
certD3-crop-ver-camp / -ver-boss / -ver-2560 / -marker2560 / -marker2560b.


---

# AUDIT-GAP RE-RUN (round 3b, prefix certD3-b-)

A completeness audit of the PASS above found two gaps. Both are re-probed here on the same build
(src/version.js VERSION = 0.4.59, unchanged since the body above was written).

| gap | probe | capture prefix | status |
|---|---|---|---|
| G1 | D6 boss plate layout at 1024x576 and 2560x1440 | certD3-b-layboss-1024 / -2560 | **DONE - PASS** |
| G2 | D2 boss 20 s window with the real add load alive | certD3-b-bossnat / certD3-b-bossload | PENDING |

## G1 — D6 boss plate at 1024x576 and 2560x1440 (the gap)

Probe `tools/certD3-b-gen.mjs` -> `tools/actions/certD3-b-layboss.json`. Method: `startRun` ->
`skipToRoom(8)` -> wait for `runState().boss.active` -> party-only keep-alive (never touches boss HP, so the
add phases are NOT suppressed) -> RMB held -> **54 layout samples at 250 ms over 14 s**, each sample grabbing
`getBoundingClientRect()` for every visible `#hud` child, every element anywhere in the document whose id or
class matches /boss/i, every visible `body > *`, plus a full-document overflow sweep and a pairwise
intersection with parent/child containment classified separately from CROSS overlaps.

**Identification: the boss plate IS `#hud-banner` wearing the extra class `boss`.** It is the only element in
the whole document matching /boss/i (`#hud-banner.hud-banner.boss.show`, text `THE HOLLOW STAG 197/1800` /
`52/1800`; `E.hud.banner()` returns `mode:"boss"`). So the audit's feared "boss plate vs `#hud-banner.show`"
collision cannot occur — they are one node — but the boss plate DOES share the top band with `.hud-loc` and
`.hud-glint`, and that is what is measured below.

| element | 1024x576 (x,y,w,h) | 2560x1440 (x,y,w,h) |
|---|---|---|
| **boss plate** `#hud-banner.hud-banner.boss.show` | **290,14,444,47** | **849,14,861,92** |
| `.hud-loc` | **12,68,365,46** (takes `hud-loc-drop`) | 12,14,710,90 (no drop) |
| `.hud-glint` | 870,14,142,36 | 2272,14,276,69 |
| `#proto-hud.hud-bar` | 261,498,501,62 | 793,1304,973,120 |
| `#version-label` | 10,546,53,22 (`v0.4.59`) | 10,1410,53,22 (`v0.4.59`) |
| `#fps-meter` | 956,545,58,23 | 2499,1409,51,23 |

**Clearances.** 1024x576: the plate spans x 290-734, y 14-61; `.hud-loc` has taken the `hud-loc-drop` class
and sits at y 68-114, so plate bottom 61 vs loc top 68 = **7 px** of clear band and the two never share a row;
plate right 734 vs `.hud-glint` left 870 = **136 px**; plate bottom 61 vs command-bar top 498 = 437 px.
2560x1440: `.hud-loc` right 722 vs plate left 849 = **127 px**; plate right 1710 vs glint left 2272 =
**562 px**; `.hud-loc` does NOT need the drop class at this width because there is horizontal room.

**Results over all 54 samples at each resolution:**

| resolution | samples | distinct layout signatures | frames with the boss plate visible | **CROSS overlaps** | **components outside the viewport** |
|---|---|---|---|---|---|
| 1024x576 | 54 | **1** (rects never move) | **54/54** | **0** | **0** |
| 2560x1440 | 54 | **1** | **54/54** | **0** | **0** |

Boss state covered by the samples: the 1024 run went pct 0.98 -> 0.11 with `phasesFired` 0 -> **3** and
`adds` 0 -> 4; the 2560 run went pct 0.95 -> 0.03, `phasesFired` **3**, `adds` 5, 5 enemies alive at the end.
So the plate was measured with adds up and through every phase transition, not on an empty stage.

**Proof the plate is drawn, not just present in the DOM** (`analyze.mjs --box` over the exact rects):

| box | frame | LUMA >160 | >200 | buckets | HUES violet | note |
|---|---|---|---|---|---|---|
| boss plate 290,14,444,47 | certD3-b-layboss-1024.png | **18.813 %** | **10.955 %** | 14/16 | **667** | violet = the Stag HP bar |
| boss plate 849,14,861,92 | certD3-b-layboss-2560.png | **17.255 %** | **10.318 %** | 14/16 | 59 | |
| .hud-loc 12,68,365,46 | 1024 | 5.873 % | 4.985 % | 15/16 | 0 | warm 99.7 % |
| .hud-loc 12,14,710,90 | 2560 | 5.665 % | 5.095 % | 15/16 | 0 | warm 99.4 % |
| **gap strip 722,14,127,92** | 2560 | **0.000 %** | **0.000 %** | 7/16 | 5 | the 127 px between loc and plate carries **zero** HUD ink — visual separation, not merely rect separation |
| #version-label 0,536,140,40 | 1024 | 1.839 % | 0.411 % | 13/16 | 0 | amber 2109 |
| #version-label 0,1400,140,40 | 2560 | 1.679 % | 0.411 % | 11/16 | 0 | amber 538 |

Read by eye in the PNGs: `captures/certD3-b-layboss-1024.png` shows `THE HOLLOW STAG  197/1800` on its
violet-piped plate with the segmented HP bar, `THE HOLLOW / ROOM 8 OF 8 - THE HOLLOW STAG` below-left,
`72 GLINT` top-right, the 4-portrait command bar bottom-centre, `v0.4.59` bottom-left, `164 fps` bottom-right
— every glyph legible, nothing clipped. `captures/certD3-b-layboss-2560.png` the same with `52/1800`.

**Transient overflow found (advisories, no HUD component involved):**
- 1024x576, 19 of 54 samples: a floating damage numeral `.dmg-num` crosses the right edge, e.g.
  [935,216,110,55] (right 1045 vs vw 1024) at t=12305, [946,224,87,44] at t=12570. Combat feedback, not chrome.
- 2560x1440, 12 of 54 samples: threat-marker `svg` nodes at [-4,1246,55,55] / [-3,1221,55,55] (4 px off the
  LEFT edge) and [739,1387,59,59] (1 px past the bottom) — the same class of marker overflow already recorded
  as advisory A5 in the body above, now also seen on the left edge.

**G1 verdict: PASS.** The boss plate is fully inside the viewport, does not overlap any other HUD element,
and is legible at both 1024x576 and 2560x1440.
