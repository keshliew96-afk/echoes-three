STATUS: COMPLETE
VERDICT: PASS (all 7 probes pass on the quiet machine; 0 must-fix; 6 advisories, A1 the boss-room 207-218 ms first-use frame is the only should-fix)

# Certification D r2 — Performance & Chrome (headless SwiftShader)

VERSION under test: 0.4.43 (src/version.js)
Harness: node tools/cert-capture.mjs, --timeout 180000, url http://127.0.0.1:5199/?seed=999
All capture/action/generator names prefixed certD2-.

## Probe log

### Harness / renderer identity (certD2-recon, certD2-camp-idle)

`WEBGL_debug_renderer_info` on the game canvas: renderer `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11
vs_5_0 ps_5_0, D3D11)`, vendor `Google Inc. (AMD)`, WebGL 2.0, canvas 1600x900, devicePixelRatio 1, 16 cores.
**The headless harness on this machine is GPU-backed (AMD iGPU via ANGLE/D3D11), not SwiftShader** — same finding as
certification-D-r1. Numbers below are therefore real-GPU headless numbers, taken while other certification agents were
sharing the machine (camp idle read 83 fps here vs 122.9 fps in r1 when measured alone — contention is visible but every
sample stays far above the 55 fps gate).

Seed 999 run frame (certD2-recon EVAL 4): `modes ["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"]`,
`defendAt [4,6]`, `sides [0,1,0,1,0]`. E.version "0.4.43", bootSeed 999.

### D3 — camp idle baseline (captures/certD2-camp-idle.png / .console.txt)

Camp content at sample start (tick 423): fireflies 150, embers 130, gateMotes 34, grass 560, emitters 17, propShadows 70,
critters 4, entityCount 4.

| window | frames | mean ms | mean fps | p50 | p95 | p99 | max |
|---|---|---|---|---|---|---|---|
| ALL 10.0 s | 831 | 12.00 | **83.3** | 11.8 | 16.2 | 17.9 | 19.9 |
| WARM (0-3 s) | 249 | 11.89 | 84.1 | 11.9 | 16.4 | 19.3 | 19.9 |
| STEADY (3-10 s) | 582 | 12.05 | **83.0** | 11.7 | 16.1 | 17.9 | 19.0 |

steady gaps >100 ms: **0**; gaps >250 ms: **0**; long tasks: **0**; 4 ms-timer max gap 24.4 ms.
Per-second `E.fps` / entityCount / enemies: 94.3/4/0, 84.7/4/0, 78.1/4/0, 79.4/4/0, 82.0/4/0, 85.5/4/0, 82.6/4/0,
77.5/4/0, 83.3/4/0, 88.5/4/0. Sim tick advanced 484 (t=1003 ms) -> 1024 (t=10001 ms) = 540 ticks / 8.998 s = **60.01 ticks/s**, clock nominal.
**D3 PASS** (83.0 fps >= 55).

### Contention control (mandatory context for every fps number below)

Up to five certification agents share this machine and this dev server, and the effect is larger than any
in-game cost. Two probes establish it:

1. **certD2-decay-camp** — five *identical* 8 s rAF samples at camp with nothing happening (no run, ents 4,
   domNodes 365 throughout): mean fps **38.6, 40.5, 76.0, 76.6, 76.4** (p50 25.1, 24.5, 12.7, 12.6, 12.6 ms).
   The frame time *halved* mid-capture when another agent's browser exited. **There is no progressive decay in the
   page** (DOM nodes flat at 365, heap sawtooth 55.9 / 48.9 / 55.6 / 57.7 / 59.3 / 48.0 MB) — the variance is the
   machine.
2. Because of that, every judged probe from here on begins with a **5 s camp-idle calibration sample in the same
   page session** (`tag:"CALIB-camp-idle"`), and a sample is only judged when its calibration shows a quiet
   machine. Today's quiet camp ceiling is **76-83 fps** (certD2-camp-idle 83.0, certD2-decay-camp 76.0-76.6);
   certification-D-r1 measured 122.9 fps for the same scene on 09-08, so today's whole machine is ~1.5x slower
   than r1's baseline even when quiet. `tools/certD2-run.mjs` re-runs a probe until calibration >= 70 fps.

### Contended samples (recorded, NOT judged)

| capture | scene | CALIB camp | STEADY fps | p95 | max ms | gaps >100 |
|---|---|---|---|---|---|---|
| certD2-defend6 | room 6 defend, waves [3,3,3,4] | (none taken) | 72.9 | 26.4 | 68.9 | **0** |
| certD2-wave2 | room 2 kill_all, waves [4,5] | (none taken) | 41.5 | 41.4 | 109.6 | 1 |
| certD2-pair A/B/C | camp -> room 2 -> draft, one session | 59.5 | 40.8 / 37.6 | 46.5 / 39.2 | 113 / 57.5 | 1 / 0 |
| certD2-c-wave2 | room 2 kill_all | **43.3** (contended) | 39.1 | 44.1 | 116.5 | 1 |

`certD2-pair` is the clearest read on scene cost *inside one session* (same contention for all three): camp idle
59.5 fps -> room-2 combat 40.8 fps -> post-clear draft screen with 0 enemies **37.6 fps**. Combat is ~1.46x the
frame cost of camp idle here; the draft screen is not cheaper than combat (the run arena keeps rendering behind it).

### D1 — worst-case wave (quiet machine, calibration-gated)

Method: `E.cmd('startRun')` -> `E.cmd('skipToRoom',n)` -> wait for the first spawn -> RMB held (player auto-fires,
allies live) -> rAF sample. Retry driver `tools/certD2-run.mjs <name> <actions> 70 N` re-runs until the in-session
CALIB camp sample >= 70 fps. WARM = first 3 s of the sample, STEADY = the rest.

| capture | room | CALIB | sample | ALL fps / p50 / p95 / p99 / max ms | WARM fps / max | **STEADY fps** / p50 / p95 / p99 / max | gaps >100 (steady) | worst 15 s window | peak alive / E.ents |
|---|---|---|---|---|---|---|---|---|---|
| `certD2-q-wave2-a3` | 2 kill_all, waves [4,5] | 76.2 | 20.0 s, ticks 1049-2263 | 80.9 / 11.5 / 19.3 / 24.2 / 49.9 | 77.5 / 29.5 | **81.5** / 11.4 / 19.2 / 24.2 / 49.9 | **0** | 0 gaps, 80.6-82.2 fps | 5 @ t1405 / 16 |
| `certD2-q-defend6-a1` | 6 defend, waves [3,3,3,4] | 136.3 | 26.0 s, ticks 935-2508 | 123.4 / 7.9 / 10.5 / 12.7 / 25.2 | 120.4 / 25.2 | **123.8** / 7.9 / 10.5 / 12.7 / 22.9 | **0** | 9 windows, all 0 gaps, 122.2-124.4 fps | 3 / 15 |

- `certD2-q-wave2-a3` per-second `E.fps`/ents/enemies: 82.0/15/3, 82.0/13/3, 82.6/12/2, 82.0/11/1, 82.6/8/0,
  82.0/12/**5**, 82.6/16/4, 82.6/14/3, 82.6/12/2, 82.6/13/2, 82.0/10/1, then draft screen 82.0-83.3/4/0 x9.
  Events: waves t1049 (4 spawns) and t1314 (5 spawns), 9 deaths, `room_cleared` t1748. Peak simultaneous
  enemies **5**, `E.entityCount` peak 16. Long tasks 0, 4 ms-timer max gap 63.3 ms.
- `certD2-q-defend6-a1` per-second `E.fps`: 161.3-163.9 for 25 of 26 s; the only dips are **84.0 at s14 and 83.3 at
  s26**, exactly the two wave-start seconds (`wave_start` t1607 and t2327, 3 `enemy_spawn` each) — a one-quantum
  drop, not an rAF gap (steady max frame 22.9 ms). Waves at t935 / 1607 / 2327 (12 s cadence), 8 deaths,
  Waystone **150/150 untouched**, party 100/150/95/80, all four alive, `defendTicksLeft` 1079.

**Regression note vs r1:** the room-clear -> reward/path first-frame stall that r1 recorded as advisory A1 and the
legendary-card stall F2 (109-236 ms) **did not reproduce here**: `certD2-q-wave2-a3` runs 9 s of draft screen after
`room_cleared` t1748 with steady max frame **49.9 ms** and zero gaps over 100 ms.

### D2 — boss (Hollow Stag, room 8), quiet machine

Method: `skipToRoom(8)` -> wait for the first `boss_adds` event -> RMB held -> 20 s rAF sample across the quake cycles.
Two variants: the natural fight (Stag dies mid-sample) and one where the Stag's HP is held (`E.cmd('bossHp',0.72)`
whenever it drops below 0.62) so the quake/add cadence keeps cycling for the whole window.

| capture | CALIB | sample | ALL fps / p50 / p95 / p99 / max ms | WARM fps / max | **STEADY fps** / p50 / p95 / p99 / max | steady gaps >100 | worst 15 s window | peak alive |
|---|---|---|---|---|---|---|---|---|
| `certD2-q-boss-a1` (natural) | 136.9 | 20.0 s, ticks 1164-2371 | 93.5 / 10.3 / 13.6 / 16.8 / **217.9** | 82.9 / **217.9** | **95.4** / 10.2 / 13.5 / 16.6 / 56.9 | **0** | 3 windows, 0 gaps, 93.4-95.9 fps | **7** (Stag + 6 adds) @ s8 |
| `certD2-q-bossheld-a1` (HP held 0.61-0.71) | 130.0 | 20.0 s, ticks 1053-2223 | 93.4 / 10.4 / 13.4 / 15.8 / **207.5** | 84.6 / **207.5** | **95.0** / 10.3 / 13.2 / 15.6 / 78.3 | **0** | 3 windows, 0 gaps, 94.2-95.1 fps | 3 adds |

Natural-fight timeline (event ring): `boss_spawn` t961; `boss_quake_start` t962 / 1244 / 1526 (each `boss_quake_resolve`
+42 ticks); `boss_trample` t1005/1155/1305/1455/1605/1755; `boss_adds` t1158 (pct 0.75, 3 spawns) / t1398 (0.5, 3) /
t1638 (0.25, 3); Stag `hp` 1800 -> 0 by s11; allies downed t1928/1929 and t2365/2366; end banner
`"THE HOLLOW STAG · FELLED / 1 ADD REMAIN"`, party [57, 35, downed, downed]. Per-second `E.fps` is **82.6-84.0 for all
20 s** — no quantum drop at any quake or add wave. Per-second live enemies: 3,3,3,5,5,5,4,**7**,5,5,5,4,2,2,1,1,1,1,1,1.
Held fight: 5 quake cycles inside the window (t827/1109/1391/1700/1982), boss hp held 1109-1280 of 1800, steady max
frame **78.3 ms**, 1 long task 54 ms.

**The only frame over 100 ms in either boss sample is the first `boss_adds` wave** (217.9 ms natural, 207.5 ms held),
which lands in the first 3 s of the sample = the warm-up window, and is below the 250 ms gate. The 2nd and 3rd add
waves, which spawn the *same* enemy kinds later in the same session, cost at most 56.9 ms — see advisory A1.
**D2 PASS.**

Two more rooms, same method (all quiet, all zero gaps):

| capture | room | CALIB | sample | **STEADY fps** / p50 / p95 / p99 / max ms | gaps >100 | 15 s windows | peak alive / E.ents |
|---|---|---|---|---|---|---|---|
| `certD2-q-wave3-a1` | 3 kill_all | 130.9 | 20.0 s | **112.8** / 8.6 / 11.9 / 14.1 / 31.6 | **0** | 3, all 0 gaps, 112.3-112.7 fps | 5 @ s6-7 / 17 |
| `certD2-q-defend4-a1` | 4 defend, waves [3,3,3,4] | 133.5 | 26.0 s | **120.7** / 8.0 / 11.1 / 13.1 / 18.5 | **0** | 9, all 0 gaps, 119.3-121.8 fps | 3 / 15 |

`certD2-q-wave3-a1` shows the same one-quantum `E.fps` dip on the spawn second only (163.9 -> 83.3 at s7 with 5 alive
and `E.entityCount` 17), with the rAF stream unaffected (steady max 31.6 ms). `certD2-q-defend4-a1` Waystone
150/150, `defendTicksLeft` 1080.

**D1 verdict: PASS.** Every quiet-machine room sample is 81.5-123.8 fps steady with **zero** frames over 100 ms after
warm-up, so neither the ">=3 gaps >100 ms in a 15 s window" nor the ">250 ms single gap" clause is approached.

### A1 (advisory / should-fix) — one ~210-218 ms frame per boss-room session

Every boss capture contains exactly one frame in the 207-218 ms band and nothing else over 100 ms:

| capture | gap ms | at | tick | in warm window? | nearest sim events (+-12 ticks) | timer max gap | long tasks |
|---|---|---|---|---|---|---|---|
| `certD2-q-boss-a1` | **217.9** | 0-3 s of the sample (starts at `boss_adds` #1, t1164) | ~1164-1344 | yes | first `boss_adds` t1158 | 52.0 ms | 0 |
| `certD2-q-bossheld-a1` | **207.5** | 0-3 s of the sample (starts at `boss_adds` #1, t1053) | ~1053-1230 | yes | first `boss_adds` t1023 | 69.0 ms | 1 x 54 ms |
| `certD2-q-bossearly-a1` (sample starts at `boss_spawn`) | **217.6** | **14251 ms** | **1828** | **no — steady state** | **none within +-12 ticks** (nearest: `downed` t1857, +29) | 64.1 ms | 1 x 60 ms |

The third capture is the informative one: with the sample started at `boss_spawn` instead of at the first add wave,
the same ~218 ms frame moves to 14.25 s into the sample, in full steady state, with an **empty event ring** — so it is
not the add-wave spawn cost. The 4 ms timer kept firing throughout (max gap 52-69 ms, far below 218), so the main
thread was not blocked for the length of the gap; the rAF was starved, the same signature r1 recorded.
**Gate impact: none.** 217.9 < 250 ms, and the worst 15 s window contains **1** such gap (fail needs 3).
Boss steady fps with the gap included is 90.1-95.4. Recorded as should-fix, not must-fix; the orchestrator's
GPU-Chrome pass should look specifically at the boss room around 12-16 s after `boss_spawn`.

**A1 root-cause narrowing — it is a once-per-session first-use cost, not a recurring hitch.**
`certD2-q-bosstwice-a1` enters the boss room, plays until two `boss_adds` waves have fired, calls `endRun`, then
enters the boss room a **second time in the same page session** and samples 20 s: **allGapsOver100 = [] (empty)**,
steady max frame **57.3 ms**, steady 90.0 fps, worst 15 s window 0 gaps. The warm boss room never produces the stall.
So the ~218 ms frame is paid exactly once per page load when the boss room's pipeline/VFX first appear; a player
who dies and replays does not pay it twice, and it does not recur inside a fight.

### D1 addendum — synthetic 40-enemy stress (advisory, not a shipped room)

`certD2-q-stress40-a1` (calib 132.0): room 1 with 36 `cmd('spawn')` boars/mantises plus a top-up interval holding
>= 38 alive. For 11 s the sim ran **31-43 live enemies / `E.entityCount` 36-47** (per-second: 34, 35, 33, 31, 31, 35,
37, 38, 38, **43**, 42) with `E.fps` pinned at 82.0-83.3 the whole time. rAF: **STEADY 99.1 fps**, p95 14.4,
max **71.9 ms**, **zero gaps over 100 ms**, 3 windows all 0. Party survived (100/150/95/80). Roughly 9x the natural
peak (5) at 99 fps leaves a large headroom margin.

### D4 — console hygiene (all 29 `captures/certD2-*.console.txt`)

| level | count |
|---|---|
| PAGEERROR | **0** |
| error | **0** |
| HARNESS-ERROR | **0** |
| warn | 29 (exactly one per capture) |
| debug | 58 (2 per capture: vite connecting / connected) |
| GOTO / EVAL / SHOT / DEBUG-API | 29 / 212 / 27 / 29 |

Every capture exited 0 (`errors: false`). The single warning per page load is the shader-compile block:
`THREE.WebGLProgram: Program Info Log: (198,12-86): warning X3595: gradient instruction used in a loop with varying
iteration ... (419,1): warning X4000: use of potentially uninitialized variable (f_ApplyFXAA)` — one message,
emitted once per boot. **The 4410 `flatShading is not a property of MeshToonMaterial` warnings that r1 counted are
gone in v0.4.43** (0 occurrences in 29 logs); r1's advisory A4 is fixed. **D4 PASS**, one advisory (A2) for the
X3595/X4000 shader warning.

### D5 — version label

- `src/version.js`: `export const VERSION = '0.4.43';`
- `E.version` = `"0.4.43"` in every capture (`DEBUG-API {"version":"0.4.43",...}` line of all 29 logs).
- DOM `#version-label`: text **"v0.4.43"**, font-size 12 px, rect `(10, 546, 52.8, 22)` at 1024x576 and
  `(10, 1410, 52.8, 22)` at 2560x1440 — bottom edge exactly 8 px above the viewport edge at both sizes.
- Pixels, `node tools/analyze.mjs --box 0,860,80,40` on the 1600x900 frames:
  camp `certD2-camp-idle.png` LUMA >160 **3.125 %**, >200 0.594 %, 12/16 buckets;
  combat `certD2-c-wave2-frame.png` LUMA >160 **3.125 %**, >200 0.594 %.
  Control box immediately to the right, `--box 80,860,80,40`: **0.000 %** >160 on both frames.
- 9x nearest-neighbour crops of `(0,858,110,34)` — `captures/certD2-ver-camp-zoom.png` and
  `captures/certD2-ver-combat-zoom.png` — were viewed and both read **"v0.4.43"** on the dark rounded plate.
  The string on screen equals the VERSION constant exactly. **D5 PASS.**

### D6 — layout sweep, 1024x576 and 2560x1440

Method (`tools/certD2-gen10.mjs` -> `certD2-l2-*`): for each screen, every visible element matching a curated HUD /
run-screen component list is measured with `getBoundingClientRect`; `outside` = any rect crossing the viewport edge,
`overlaps` = any intersecting pair >1 px in both axes that is not an ancestor/descendant pair. A separate pass
measures every visible **leaf** element (no element children) the same way, and the full-viewport container layers
are checked for transparency.

| capture | screen | viewport | components | leaves | outside | leaves outside | overlaps | extremes (minX, minY, maxRight, maxBottom) |
|---|---|---|---|---|---|---|---|
| `certD2-l2-camp-1024` | camp | 1024x576 | 18 | 71 | **0** | 0 | **0** | 10, 14, 1014/1024, 568/576 |
| `certD2-l2-camp-1024` | camp + portal prompt | 1024x576 | 19 | 73 | **0** | 0 | **0** | 10, 14, 1014, 568 |
| `certD2-l2-combat-1024` | combat r1 (3 enemies, banner live) | 1024x576 | 19 | 78 | **0** | 0 | **0** | 10, 14, 1014, 568 |
| `certD2-l2-shop-1024` | shop r7 | 1024x576 | 29 | 143 | **0** | 0 | **0** | 10, 14, 1014, 568 |
| `certD2-l2-boss-1024` | boss r8 (plate live) | 1024x576 | 19 | 100 | **0** | **1** (see A3) | **0** | 10, 14, 1014, 568 |
| `certD2-l2-draft-1024` | draft/reward | 1024x576 | 22 | 100 | **0** | 0 | **1** (see A4) | 10, 14, 1014, 568 |
| `certD2-l2-camp-2560` | camp | 2560x1440 | 18 | 71 | **0** | 0 | **0** | 10, 14, 2550/2560, 1432/1440 |
| `certD2-l2-camp-2560` | camp + portal prompt | 2560x1440 | 19 | 73 | **0** | 0 | **0** | 10, 14, 2550, 1432 |
| `certD2-l2-combat-2560` | combat r1 | 2560x1440 | 19 | 74 | **0** | 0 | **0** | 10, 14, 2550, 1432 |
| `certD2-l2-shop-2560` | shop r7 | 2560x1440 | 29 | 143 | **0** | 0 | **0** | 10, 14, 2550, 1432 |
| `certD2-l2-boss-2560` | boss r8 | 2560x1440 | 19 | 99 | **0** | 0 | **0** | 10, 14, 2550, 1432 |
| `certD2-l2-draft-2560` | draft/reward | 2560x1440 | 22 | 100 | **0** | 0 | **0** | 10, 14, 2550, 1432 |

Representative rects (1024x576 combat / 2560x1440 shop):

| element | 1024x576 | 2560x1440 |
|---|---|---|
| `.hud-loc` room plaque | (12, 14, 388.9, 46.3) "UNEASY WOODLAND / ROOM 1 OF 8 · CLEAR" | (12, 14, 609.6, 90) |
| `#hud-banner` | (390.4, 14, 243.2, 28.8) "WAVE 1/2 ●○ 4 LEFT" | (1030.2, 14, 499.5, 56) |
| `.hud-glint` wallet | (882.4, 14, 129.6, 35.7) | (2272.4, 14, 275.6, 69.3) |
| `#proto-hud` command bar | (261.4, 498.2, 501.3, 61.8) | (793.3, 1304, 973.3, 120) |
| 4x `.hud-port` portraits | 43.9x52.2 @ y503, HP bars 43.9x6.9 @ y548.3 | 85.3x101.3 @ y1313, HP bars 85.3x13.3 |
| 5x `.hud-slot` (1,2,3,4,SPC) | 43.9x43.9 @ y503 | 85.3x85.3 |
| `#version-label` | (10, 546, 52.8, 22) fs12 | (10, 1410, 52.8, 22) fs12 |
| `#fps-meter` | (963.2, 545, 50.8, 23) fs13 | (2499.2, 1409, 50.8, 23) |
| `.rn-page` shop | (90, 11.5, 844, 468.9) | (810, 781.1, 940, 516.9) |
| 3x `.rn-card` shop | 252x195.9 @ y136.5 | **280x293.9 @ y859.1 (all three identical)** |
| 3x `.rn-plaque` prices | y 409 (all three) | **y 1163.0 (all three)** |

**r1's advisory A3 is fixed:** at 2560x1440 the three shop cards are now the same height (293.9) and the three price
plaques share one baseline (y = 1163.0); r1 measured 299.9 / 367.8 / 320.9 and y 762 / 829.9 / 783.
The 2560 shop panel's bottom edge (y = 1298.0) clears the command-bar top (y = 1304.0) by 6.0 px — deliberately
placed above the bar so the party stays visible; verified in `certD2-l2-shop-2560.png`.
Frames viewed: `certD2-l2-draft-1024.png`, `certD2-l2-shop-2560.png`, `certD2-lay-combat-2560.png`,
`certD2-c-defend6-frame.png`, `_shop.png` — banner, room plaque, wallet, boss plate, command bar (4 portraits with
class-accent HP bars, 4 skill chips + SPC), threat pointers, version label and fps meter are all inside and legible
at both sizes. **D6 PASS**, with advisories A3 and A4.

**Container note (not a defect):** the HUD root `#hud` reports a bounding box of `(-147.2, -82.8, 1318.4, 741.6)` at
1024x576 because it is a fixed-size layout scaled by `matrix(0.686667, ...)`. Its computed
`background-color: rgba(0,0,0,0)` and `pointer-events: none`, and every one of its children measures inside the
viewport, so nothing is drawn or clickable outside. At 2560x1440 the root fits inside the viewport.

Boss-plate detail (D6): at 1024x576 the plate is `#hud-banner.hud-banner.boss` `(290.2, 14, 443.6, 47.4)` reading
"THE HOLLOW STAG 1132/1800", and the room plaque gains the `hud-loc-drop` class and moves to y = 68.2 so the two do
not collide; at 2560x1440 the plate is `(849.3, 14, 861.3, 92)` and the room plaque stays at y = 14 with its right
edge at 721.5, clear of the plate's left edge 849.3. Plate right edge 733.8 (1024) / 1710.6 (2560) is clear of the
fps meter at 963.2 / 2499.2.

### A3 (advisory) — a floating damage numeral can clip 1.1 px at the right viewport edge (1024x576)

`certD2-l2-boss-1024`, leaf pass: `.dmg-num` with text "13.5" at `(955, 185.3, 70.1, 35.1)`, font-size 45 px —
right edge 1025.1 vs viewport width 1024, so the last ~1 px of the numeral is cut. It is a world-anchored floating
numeral over an enemy near the right wall, transient (~1 s), and no HUD chrome element is affected (`outside` = 0
for every component on every screen). Only occurrence in 12 layout measurements.

### A4 (advisory) — room plaque grazes the draft page by 3 px at 1024x576

`certD2-l2-draft-1024`: `.hud-loc` `(12, 14, 388.9, 46.3)` (bottom edge y = 60.3) intersects `.rn-page.rn-draft`
`(317.3, 57.3, 389.4, 377.5)` (top edge y = 57.3) over **83.6 x 3.0 px**. Viewed in
`captures/certD2-l2-draft-1024.png`: the plaque's lower-right rounded corner touches the page's top border; no text
of either element is obscured and both remain fully readable. Does not occur at 2560x1440 (overlaps = 0), and no
other screen at either size has any overlap.

### D7 — leak proxy

**Debug-API gap (advisory A5):** v0.4.43 exposes **no three.js renderer handle**. `certD2-leak2` scanned every
`window` own-property for an object with `.info.memory` / `.info.render` (`hits: []`), checked `__echoes` (keys are
`version, hud, runUi, tick, fps, entityCount, seed, bootSeed, rngDraws, events, stats, on, state, cmd` — no
`renderer`) and `window.__THREE_DEVTOOLS__` (absent). So `renderer.info.memory.geometries`, the counter that
certification-D-r1 used to raise its F1 "+115 geometries per run" finding, **cannot be read from the page in this
build**, and F1 can be neither confirmed nor cleared through that route. It was measured instead by instrumenting
the WebGL context directly (below).

**Run 1 / run 2 with real waves** (`certD2-leak2`; `killAllEnemies` only after each wave has actually spawned, so
enemy rigs are really created and destroyed): run 1 = 12 waves / **50 enemy rigs**, run 2 = 13 waves / **56 rigs**,
`E.stats.kills` 0 -> 51 -> 108.

| snapshot | tick | `E.entityCount` | sim arrays (enemies/eshots/bolts/zones/azones) | camp vfx (fireflies/embers/gateMotes/grass/emitters/propShadows/propTypes/flowers/colliders) | DOM nodes / svg / #dmg-num-layer children | heap used / total MB |
|---|---|---|---|---|---|---|
| baseline camp | 423 | **4** | 0/0/0/0/0 | 150/130/34/560/17/70/26/46/31 | 365 / 22 / 0 | 56.6 / 84.9 |
| after run 1 | 2624 | **4** | 0/0/0/0/0 | **identical** | 591 / 28 / 12 | 59.3 / 114.9 |
| after run 2 | 4882 | **4** | 0/0/0/0/0 | **identical** | 575 / 28 / 12 | 74.5 / 120.9 |
| after run 2 + 10 s | 5483 | **4** | 0/0/0/0/0 | **identical** | 575 / 28 / 12 | 68.0 / 120.9 |

`E.entityCount` returns to the camp baseline of 4 after both runs, every sim array is empty, and **every camp VFX
count is byte-identical at all four snapshots**. The DOM grows once (+226 nodes for the run-screen layer on the
first run) and then *shrinks* slightly (591 -> 575), so it is not monotonic; the pooled damage-numeral layer holds
12 nodes = the pool cap, not a growing list. Used heap is a sawtooth (56.6 / 59.3 / 74.5 / 68.0) — +11.4 MB over
baseline after 2 runs and 106 kills, with V8's total heap envelope grown to 120.9 MB and not returned, which is
normal V8 behaviour rather than evidence of a leak on its own.

**Direct GPU-object churn** (`certD2-leak3`): the live `WebGL2RenderingContext.prototype` and
`WebGLRenderingContext.prototype` `create*`/`delete*` methods were wrapped with counters (14 methods patched,
2 prototypes), then **three** full runs were driven with real waves and the counters read at camp between them.
Counters start at 0 at the patch point (post-boot), so each row is that run's churn.

| snapshot | run's waves / rigs | live buffers | live VAOs | live textures | live programs | **delta vs previous run** | heap MB |
|---|---|---|---|---|---|---|---|
| baseline camp (t757) | — | 0 | 0 | 0 | 0 | — | 97.5 |
| after run 1 (t2947) | 12 / 50 | 1545 | 441 | 15 | 4 | +1545 buf, +441 vao | 53.2 |
| after run 2 (t5207) | 13 / 53 | 1557 | 447 | 15 | 4 | **+12 buf, +6 vao, +0 tex, +0 prog** | 49.3 |
| after run 3 (t7463) | 13 / 56 | 1557 | 447 | 15 | 4 | **+0 / +0 / +0 / +0** | 50.5 |
| after run 3 + 10 s | — | 1557 | 447 | 15 | 4 | +0 | 65.3 |

Creation is front-loaded on the first run and then **converges to zero**: run 2 adds 12 buffers and 6 VAOs, run 3
adds nothing at all, while spawning *more* rigs (56) than run 1 (50). `E.entityCount` is 4 at every camp snapshot.
`deleteBuffer` / `deleteTexture` / `deleteVertexArray` are never called, so the run layer is **retained** rather than
freed — but because allocation stops, the retained set is a bounded cache, not a per-run leak.
**r1's F1 ("+112 to +122 geometries every run, never decrementing") does not reproduce at the WebGL level in
v0.4.43.** **D7 PASS**, with advisory A5 (no renderer handle in the debug API).

---

## Verdict summary

| Probe | Result | Key evidence |
|---|---|---|
| D1 worst-case wave | **PASS** | quiet, calibration-gated: room 2 kill_all [4,5] peak 5 alive **81.5 fps** 0 gaps; room 3 **112.8**; defend 4 **120.7**; defend 6 [3,3,3,4] **123.8**, all with **0** frames >100 ms after warm-up; synthetic 43-enemy stress **99.1 fps**, 0 gaps |
| D2 boss | **PASS** | natural fight **95.4 fps** / held fight **95.0 fps**, peak 7 alive (Stag + 6 adds), 3 quakes + 3 add phases per sample, 0 steady gaps in 2 of 3 boss samples; one 207-218 ms frame per boss session (A1) |
| D3 camp idle | **PASS** | 10 s, **83.0 fps** steady, p95 16.1, max 19.0, 0 gaps, 0 long tasks, tick rate 60.01 Hz |
| D4 page errors | **PASS** | 37 certD2 console logs: **0 PAGEERROR, 0 error, 0 HARNESS-ERROR**; 37 warn = 1 shader-compile message per boot (A2); r1's 4410 flatShading warnings are gone |
| D5 version label | **PASS** | `VERSION '0.4.43'` = `E.version` = DOM "v0.4.43" = pixels: corner box >160 **3.125 %** vs control **0.000 %**, crops read "v0.4.43" |
| D6 layout | **PASS** | 12 screen x viewport measurements: `outside` **0** everywhere, `overlaps` 0 everywhere except one 83.6x3 px graze on the 1024 draft (A4); r1's 2560 shop-plaque misalignment is fixed |
| D7 leak proxy | **PASS** | entityCount 4/4/4/4, camp vfx byte-identical, DOM non-monotonic; WebGL churn +1545 buf (run 1) -> **+12** (run 2) -> **+0** (run 3) |

## Advisories (none blocking)

- **A1 (should-fix)** — one ~207-218 ms rAF frame per *page session* in the boss room, main thread free
  (timer max gap 52-69 ms), no sim event within +-12 ticks; absent on a second boss visit in the same session.
  Under the 250 ms gate and never 3-in-a-window, but the largest single frame anywhere in this pass.
- **A2** — one shader-compile warning per boot (X3595 gradient-in-loop x2 + X4000 uninitialized `f_ApplyFXAA`).
- **A3** — a floating `.dmg-num` can clip ~1.1 px at the right viewport edge at 1024x576 (`certD2-l2-boss-1024`).
- **A4** — room plaque grazes the draft page by 83.6 x 3.0 px at 1024x576 only; nothing obscured.
- **A5 (debug-API gap)** — no three.js renderer handle is exposed, so `renderer.info.memory.*` cannot be read;
  D7 had to instrument the WebGL context instead. Exposing `__echoes.renderer` (or `renderer.info` under
  `E.stats`) would make future leak audits one eval instead of a monkey-patch.
- **A6 (measurement environment)** — the harness browser is GPU-backed (ANGLE / AMD Radeon / D3D11), not
  SwiftShader; and machine contention from concurrent agents moves camp idle between 38.6 and 83.0 fps, so any
  fps number taken without the in-session CALIB control is meaningless. All judged numbers here carry one.

## Capture index

Perf (calibration-gated, quiet): `certD2-q-wave2-a3`, `certD2-q-wave3-a1`, `certD2-q-defend4-a1`,
`certD2-q-defend6-a1`, `certD2-q-boss-a1`, `certD2-q-bossheld-a1`, `certD2-q-bossearly-a1`,
`certD2-q-bosstwice-a1`, `certD2-q-stress40-a1`, `certD2-camp-idle`.
Contention control: `certD2-decay-camp`, `certD2-pair`, `certD2-c-wave2`, `certD2-defend6`, `certD2-wave2`.
Layout: `certD2-l2-{camp,combat,shop,boss,draft}-{1024,2560}`, `certD2-lay-{camp,combat,shop}-{1024,2560}`.
Leak: `certD2-leak`, `certD2-leak2`, `certD2-leak3`. Version crops: `certD2-ver-{camp,combat}-zoom`.
Generators (mine, none of the shared tools touched): `tools/certD2-gen.mjs`, `-gen2`, `-gen3`, `-gen4`, `-gen5`,
`-gen6`, `-gen7`, `-gen8`, `-gen9`, `-gen10`, `-gen11`, `-gen12`, `tools/certD2-run.mjs`, `tools/certD2-crop.mjs`.
