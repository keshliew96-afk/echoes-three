STATUS: COMPLETE
VERDICT: PASS (re-confirmed 2026-09-08 by the 5th instance: the borderline 236.2 ms room-clear stall was re-sampled ALONE 3x + wave2 2x + a draft-screen diagnostic, prefix certD1-b-; max 224.1 ms, gt250 = 0, no window with 3 gaps; legendary-card shimmer stall recorded as should-fix F2 — see "Audit gap re-run" at the end)

# Certification D round 1 — Performance & Chrome (certD1)

Build: v0.4.16 (src/** newest mtime 2026-09-03 20:57; src/version.js VERSION = '0.4.16'). Dev server 127.0.0.1:5199 reused,
never restarted. Completed 2026-09-06 23:10 (+08:00) by the 4th instance of this critic (three earlier instances were
usage-limit-killed on 09-04 19:56, 09-05 17:29 and 09-06 00:28; their captures are all v0.4.16 and are reused where noted).

## Method / harness truth

- Harness: `node tools/cert-capture.mjs shot <name> --url "http://127.0.0.1:5199/?seed=999" --settle 3000 --actions <file> --timeout 180000`,
  1600x900 unless stated. Action files are programmatic: the previous instance's `tools/certD1-gen2.mjs` ->
  `tools/actions/certD1-n-*.json` (reused byte-for-byte), plus mine: `tools/certD1-q-gen.mjs` (renderer identity),
  `tools/certD1-q-gen2.mjs` (per-enemy geometry retention), `tools/certD1-q-digest.mjs` (console digest / checkpoint).
  Every eval is an IIFE; the rAF sampler (`window.__D.sample`) records every frame delta, a 4 ms timer beside it
  (`timerMaxGap` inside a rAF gap: small = main thread free / rAF starved, large = main thread blocked), a longtask
  PerformanceObserver, `E.fps` / `E.entityCount` / `E.state()` once per second, and the sim event ring around each gap.
- **Renderer identity (captures/certD1-q-gpu.console.txt):** `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11
  vs_5_0 ps_5_0, D3D11)`, vendor `Google Inc. (AMD)`, WebGL 2.0, canvas 1600x900, pixelRatio 1. The headless browser on this
  machine is **GPU-backed on the AMD iGPU, not SwiftShader** — the same device as the orchestrator's row-34 numbers. Frame
  times are quantized to the 165 Hz compositor (6.06 ms): `E.fps` reads 163.9 / 82.6 / 55.2 / 41.3 = 1, 2, 3, 4 quanta.
- **Contention history:** the previous instance's numbers (prefix `certD1-n-`, 00:20-00:28) were taken while the B critic's
  full-loop browser was running: camp boot `E.fps 40.8-54.9`, boss steady **28.7 fps with a 399.9 ms gap**, clear-screen
  stalls 310-424 ms. The same action files re-run ALONE (CPU 5 %, 7.2 GB free, 0 other headless browsers; prefix
  `certD1-q-`, 22:38-22:58) read 3-4x faster with no gap over 250 ms. Only the quiet numbers are judged; contended ones
  are kept in the raw log for the record.

## Verdict summary

| Probe | Result | Key evidence (quiet machine, alone) |
|---|---|---|
| D1 worst-case wave | **PASS** | room 2 kill_all (waves [4,5], peak 5 alive): steady **123.0 fps**, p95 12.2 ms, in-wave gaps >100 ms **0**; defend 6 (waves [3,3,3,4], Waystone 150->140): steady **77.6 fps**, p95 24.2; natural peak simultaneous enemies is the boss room (Stag + 6 adds = 7 alive at t1049): steady **67.9 fps** |
| D2 boss | **PASS** | natural fight `certD1-q-boss`: 3 quakes (t383/665/947) + 3 add phases (t569/809/1049), Stag dead t1298, steady **67.9 fps**, p95 30.1, p99 36.3, 1 gap 139.5 ms; held-HP fight `certD1-q-boss-steady`: 5 quake cycles (t499/781/1063/1375/1657), 11 HP resets, steady **67.2 fps**, p95 30.1, max 91.0, **0 gaps >100** |
| D3 camp idle | **PASS** | `certD1-q-camp-idle`: 10 s from tick 1018, fireflies 150 / embers 130 / gateMotes 34 / grass 560 / critters 4: steady **122.9 fps**, p95 12.2, max 14.9, 0 gaps, 0 long tasks |
| D4 page errors | **PASS** | 35 certD1* console logs (3 instances + mine): **0 `[PAGEERROR]`, 0 `[error]`, 0 `[HARNESS-ERROR]`**; 4445 `[warn]` = 4410 MeshToonMaterial `flatShading` + 35 X3595 gradient-in-loop shader warnings, nothing else |
| D5 version label | **PASS** | `src/version.js` '0.4.16' = `E.version` "0.4.16" = DOM `#version-label` text "v0.4.16" at (10,870,52.8x22) 1600x900 / (10,546) 1024x576 / (10,1410) 2560x1440; corner box (0,860,80,40) LUMA >160 2.97 % camp / 3.03 % boss vs **0.000 %** in the adjacent control box; zoom crops read "v0.4.16" |
| D6 layout 1024x576 & 2560x1440 | **PASS** | 7 screens x 3 viewports (`certD1-layout-*`): `outside=[]` and `overlaps=[]` on all 21 RECTS evals (16-26 rects each) + camp portal prompt at both sizes; HUD text 17.85/16.48/20.6 real px at 1024 (floors 16/20), 34.67/32/40 at 2560; frames viewed |
| D7 leak proxy | **PASS** (F1 should-fix) | baseline -> run1 -> run2 -> run3 -> +14 s: `E.entityCount` **4/4/4/4/4**, camp vfx **identical** (fireflies 150, embers 130, gateMotes 34, shadows 70, emitters 17), scene graph flat from run 1 (objs 1119, meshes 892, uniqGeo 687); `renderer.info.memory.geometries` **402 -> 840 -> 952 -> 1074** never decrements (see F1) |

Hitches >100 ms after warm-up on the quiet machine (all single frames, none >250 ms, never 3 in one 15 s window): wave-start
first draw 199.9 ms (defend 6, t1780), ally-downed moment 139.5 ms (boss, t1579), and the room-clear -> reward/path screen
first frame 109-236 ms on 5 of 6 clears — recorded as advisories A1-A2 with timelines below.
**UPDATE 2026-09-08 (audit gap):** the 236.2 ms sample was re-run alone (certD1-b-clear1/2/3, wave2a/b, draftdiag): 212.0 / 224.1 / 115.0 / 163.7 / 175.8 / 212.1 ms max, gt250 = 0 everywhere; the stall is the legendary card's `rn-shimmer` animation -> F2 should-fix. See the last section.

---

## D1 — worst-case wave (seed 999 frame: kill_all, kill_all, kill_all, defend, kill_all, defend, shop, boss)

Direct `skipToRoom` after `startRun`, RMB held (player auto-fires), allies live. "warm" = first 3 s of the sample.

| capture | room | sample | ALL mean fps / p50 / p95 / p99 / max ms | WARM mean / max | STEADY mean fps / p50 / p95 / p99 / max | gaps >100 (steady) | peak alive / E.ents |
|---|---|---|---|---|---|---|---|
| `certD1-q-wave2` | 2 kill_all [4,5] | 25.0 s, ticks 1143-2625 | 122.2 / 6.2 / 12.2 / 12.3 / 163.6 | 115.8 / 97.1 | **123.0** / 6.2 / 12.2 / 12.3 / 163.6 | 1 (163.6 @ t1810, reward screen) | 5 @ t1448 / 18 |
| `certD1-q-defend6` | 6 defend [3,3,3,4] | 47.0 s, ticks 1083-3872 | 76.2 / 12.1 / 24.2 / 30.4 / 199.9 | 54.9 / 133.6 | **77.6** / 12.1 / 24.2 / 30.4 / 199.9 | 2 (199.9 @ t1780 wave-2 start; 182.0 @ t3773 reward) | 4 @ t3268 / 18 |
| `certD1-q-clear` | 1 -> 3, 3 natural clears | 43.9 s, ticks 1258-3831 | 105.1 / 6.2 / 18.2 / 24.3 / 236.2 | 118.2 / 109.0 | 104.2 / 6.2 / 18.2 / 24.3 / 236.2 | 3 (109 @ t2221 path; 127.3 @ t3574 + 236.2 @ t3604 draft) | 5 @ t1298 / 19 |
| `certD1-q-stress40` (synthetic, advisory) | 1 + 35 cmd spawns, topped up to 40 | 19.9 s | 104.9 / 12.0 / 12.2 / 18.2 / 66.5 | 85.2 / 24.2 | 108.3 / 6.3 / 12.2 / 18.2 / 66.5 | **0** | 40 @ t2128 / 51 |

15 s steady-state windows (gt100 / max ms / mean fps): wave2 [3-18] 1/163.6/121.7, [8-23] 1/163.6/123.2 (both contain the reward
screen at 11.4 s); defend6 [3-18] 1/199.9/77.2, [8-23] 1/199.9/75.6, [13-28] 0/54.5/73.0, [18-33] 0/36.3/80.9, [23-38] 0/36.3/74.4,
[28-43] 0/36.2/81.0; clear [3-18] 1/109/127.7, [8-23] 1/109/120.6, [13-28] 1/109/112.0, [18-33] 0/42.7/92.6, [23-38] 0/42.7/84.2,
[28-43] 2/236.2/80.4.

Per-second `E.fps` / `E.entityCount` / live enemies:
- wave2: 163.9/5/0, 161.3/11/4, 163.9/13/3, 163.9/10/2, 163.9/12/1, 163.9/8/0, 163.9/12/5, 161.3/17/4, 161.3/13/2, 163.9/9/2,
  163.9/13/2, 161.3/11/0, then draft screen 161.3/4/0 x14. Events: waves [1140 #0 x4, 1400 #1 x5], 9 spawns / 9 deaths, room_cleared t1798.
- defend6: 55.2/6/0, 54.9/10/3, 54.9/15/2, 54.9/13/2, 80.6/12/1, 82.6/12/0, 82.6/9/0, 83.3/8/0, ... (wave 2 @ s13-15: 54.9/10/3,
  41.3/16/3, 41.5/11/2; wave 3 @ s25-27: 55.6/9/3, 55.2/15/2, 55.2/14/1; wave 4 @ s37-39: 55.2/11/4, 55.2/11/4, 55.6/16/3)
  ... 82/5/0 draft. Waves at t1060/1780/2500/3220 (12 s cadence), 13 spawns / 13 deaths, Waystone 150 -> 140, party 90/150/85/80,
  room_cleared t3760. During spawn bursts frames sit at 3 quanta (18 ms, "55 fps"), between waves at 2 (12 ms, "82 fps").
- stress40: 82.6 `E.fps` with 37-40 live enemies / 42-50 entities for 8 s (rAF p95 12.2 ms, max 66.5) until the party wiped
  (`run_end` t2519, all four downed t2370-2519); the remaining 11 s are the defeat card at 161 fps. 67 spawns, 27 topped-up.

Gap anatomy (steady state, quiet machine):

| capture | gap ms | tick | screen / phase | timerMaxGap | heap MB | geometries | ring around it |
|---|---|---|---|---|---|---|---|
| defend6 | 133.6 (warm-up) | 1132 | none / combat | 11.3 | 54.9->55.9 | 703 | `1108 enemy_spawn #7 #8 #9` (first wave rigs) |
| defend6 | **199.9** | 1780 | none / combat | 22.4 | 53.2->54.0 | 773 | `1780 wave_start + 3x spawn_telegraph` |
| defend6 | 182.0 | 3773 | draft / reward | 48.5 | 59.8->60.2 | 945 | `3760 room_cleared -> reward_offer#guardian_bond` |
| wave2 | 163.6 | 1810 | draft / reward | 27.2 | 64.8->52.6 | 813 | `1798 room_cleared -> reward_offer#restorative_wave` |
| clear | 109.0 (warm-up) | 1402 | none / combat | 14.1 | 48.7->50.2 | 720 | `1396 hitstop, death/boar#8` (first kill VFX) |
| clear | 109.0 | 2221 | path / path | 27.0 | 57.6->44.4 | 847 | `2216 reward_offer, draft_taken, path_offer` |
| clear | 127.3 + **236.2** | 3574 / 3604 | draft / reward | 24.0 / 7.1 | 65.8->66.4 / 69.1->69.7 | 1042 | `3566 room_cleared -> reward_offer#ascend` |
| boss | 139.5 | 1579 | none / combat | 11.5 | 57.9->59.0 | 930 | `1564/1565 downed/ally#2` 14 ticks earlier |

In every case the 4 ms timer kept firing (timerMaxGap 7-49 ms), so the main thread was NOT blocked for the length of the gap:
the rAF was starved by compositor/raster work on the first frame of new content (new rigs / telegraph geometry, the run-screen
overlay, a downed portrait restyle). Long tasks in the same samples: 56 ms (defend6), 80 ms (boss), 114 + 62 ms (clear).

## D2 — boss (skipToRoom 8, RMB held, sampled after `boss_adds` #1)

| capture | sample | ALL | WARM | STEADY | gaps >100 | 15 s window |
|---|---|---|---|---|---|---|
| `certD1-q-boss` (natural) | 20.0 s, ticks 573-1754, 1392 frames | 69.7 / p50 12.2 / p95 24.3 / p99 36.3 / max 139.5 | 80.0 / max 24.1 | **67.9** / 12.2 / 30.1 / 36.3 / 139.5 | 1 (139.5 @ t1579) | [3-18] 1 / 139.5 / 65.8 |
| `certD1-q-boss-steady` (HP held >= 0.62) | 20.0 s, ticks 685-1883, 1325 frames | 66.4 / 12.2 / 30.2 / 36.4 / 91.0 | 61.8 / max 48.5 | **67.2** / 12.2 / 30.1 / 36.4 / 91.0 | **0** | [3-18] 0 / 91.0 / 67.9 |

Natural fight timeline: `boss_quake_start` t383 / 665 / 947 (resolve +42), tramples t426/576/726/876/1026/1176, `boss_adds`
t569 (0.75, 3) / t809 (0.5, 3) / t1049 (0.25, 3), Stag death t1298 (`bossHp 0`, FELLED plate in `certD1-q-boss.png` reads
"THE HOLLOW STAG · FELLED / 1 ADD REMAIN"), allies downed t989/1281/1564, revive t1296. Per-second `E.fps`/ents/enemies/bossHp:
82/11/3/1315, 82/11/3/1182, 82.6/9/3/996, 82/10/3/853, 82.6/14/6/733, 82/15/4/641, 82/12/4/432, 82.6/11/4/275, 82.6/16/7/225,
82.6/18/7/201, 82.6/11/5/173, 81.3/13/5/91, 54.9/13/5/45, 54.9/11/4/0, 54.9/12/3/0, 55.2/11/3/0, 54.9/11/3/0, 54.9/10/3/0,
54.9/9/2/0, 82.6/8/1/0, 82.6/7/1/0 — the 3-quanta stretch (s12-18) is the FELLED mop-up with 2 allies down and revive rings live.
Held fight: quakes t499/781/1063/1375/1657 (5 cycles inside the window), `E.fps` 82.6 -> 55.2 during quake telegraphs+adds,
back to 82.6 between; heap 51-66 MB sawtooth; 1 long task 71 ms; stateCost 1.5 ms mean.

## D3 — camp idle baseline (`certD1-q-camp-idle`, boot ?seed=999, settle 3 s, 10 s from tick 1018)

ALL 1249 frames / 10006 ms: mean **124.7 fps** (8.02 ms), p50 6.1, p95 12.2, p99 12.3, max 14.9, 0 >50 ms. WARM 128.9 / max 12.4;
STEADY 122.9 / max 14.9. `E.fps` 161.3-163.9 every second, ents 4, heap 42-53 MB sawtooth, timer maxGap 27.3, 0 long tasks.
Camp content: fireflies 150, embers 130, gateMotes 34, grass 560, emitters 17, propShadows 70, critters 4; renderer programs 54,
geometries 402, textures 29; scene graph objs 1067 / meshes 852 / sprites 61 / lights 6 / uniqGeo 686 / uniqMat 430.
(Contended reference: the same file read 47.4-50.0 fps on 09-05/09-06 with other browsers up.)

## D4 — console hygiene

All 35 `captures/certD1*.console.txt` (instances 09-04, 09-05, 09-06 00:xx and mine): levels {debug 70, warn 4445, GOTO 35, EVAL 264,
DEBUG-API 35, SHOT 21}; **PAGEERROR 0, error 0, HARNESS-ERROR 0**. Warn kinds: `THREE.Material: 'flatShading' is not a property of
THREE.MeshToonMaterial.` x4410 and `THREE.WebGLProgram: Program Info Log: warning X3595: gradient instruction used in a loop` x35
(one per boot). My 10 quiet captures: warn 1889 (1880 + 9), 0 errors, every run `errors: false` / exit 0. (One `[HARNESS-ERROR]
Unexpected token ')'` occurred on my first `certD1-q-geoleak` attempt — a syntax slip in my own generator, not the page; the
fixed re-run overwrote that log and exits 0.) Advisory A4: the flatShading warning fires once per MeshToonMaterial created,
i.e. ~70 per room entered and 884 in a 3-run session — pure log noise but it hides real warnings.

## D5 — version label

- `src/version.js`: `export const VERSION = '0.4.16';` `E.version` = "0.4.16" in every capture (`lib 0.4.16` first EVAL line).
- DOM `#version-label`: text "v0.4.16", 12 px, rgb(244,239,230) @ opacity 0.85, display block, visible;
  rect (10,870,52.8,22) at 1600x900 [camp `certD1-q-camp-idle`, combat `certD1-q-boss`, `certD1-q-wave2`],
  (10,546,52.8,22) at 1024x576, (10,1410,52.8,22) at 2560x1440 — bottom edge 8 px above the viewport edge in all three.
- Pixels: `analyze.mjs --box 0,860,80,40`: camp LUMA >160 **2.969 %**, >200 0.469 %, 12/16 buckets; boss frame >160 **3.031 %**,
  >200 1.094 %; wave2 2.969 %. Control box (80,860,80,40) right beside it: **0.000 %** >160 in both frames. 6x crops
  `certD1-q-ver-{camp,boss,1024,2560}-zoom.png` (luma>160 95 / 97 / 267 / 95 px, max luma 208-224) all read "v0.4.16" on the
  dark rounded plate (viewed).

## D6 — layout sweep (reused instance-A captures, all v0.4.16, `outside` / `overlaps` from live `getBoundingClientRect`)

Elements measured per screen: #hud-banner, #proto-hud bar, 4 .hud-port, 5 .hud-slot, 4 HP boxes (hud.portraits), #version-label,
#fps-meter, #camp-prompt, threat markers, run-screen page/cards/doors/buttons/title/hint/wallet/plaques. Overlap test skips
parent/child pairs, hpbar-in-portrait and the page container.

| viewport | screen | n rects | outside | overlaps | banner box | bar box | version | page / notable |
|---|---|---|---|---|---|---|---|---|
| 1024x576 | camp | 16 | [] | [] | none | (266.9,498.2,490.3,61.8) | (10,546,52.8,22) | portraits 43.9x52.2 @ y503, slots 43.9x43.9, HP bars 43.9x6.9 @ y548.3 |
| 1024x576 | combat r1 | 17 | [] | [] | "WAVE 1/3 · 5 LEFT" (383.4,14,257.3,28.8) | same | same | fps meter (963.2,8,50.8,23) |
| 1024x576 | draft | 22 | [] | [] | hidden | same | same | page (317.3,38.8,389.4,414.5), card (342,158.8,340,197.5), Take (374,364.2,132,42) fs18, Decline (518,366.2) |
| 1024x576 | path | 21 | [] | [] | hidden | same | same | page (291.4,17.5,441.2,457), doors (335,133.5,160,220) / (529,139.5,160,220) |
| 1024x576 | shop r7 | 26 | [] | [] | hidden | same | same | page (90,11.5,844,468.9) fit 0.9893, cards 252x195.9 @ y136.5, plaques 25/30/35 @ y339.5, Advance (362.2,391.5,299.6,42) |
| 1024x576 | boss r8 | 17 | [] | [] | "THE HOLLOW STAG 1548/1800" (175.8,14,672.4,28.8) | same | same | plate right edge 848 < fps meter 963 |
| 1024x576 | victory | 22 | [] | [] | hidden | same | same | page (301.9,47.4,420.2,397.2), Return to Camp (419.7,355.6,184.6,42) |
| 1024x576 | camp prompt | 17 | [] | [] | none | same | same | #camp-prompt "E Begin Run" (364.5,39.1,290.9,38.9) fs19 |
| 2560x1440 | camp | 16 | [] | [] | none | (804,1304,952,120) | (10,1410,52.8,22) | portraits 85.3x101.3 @ y1313.3, slots 85.3, HP bars 85.3x13.3 @ y1401.3 |
| 2560x1440 | combat r1 | 17 | [] | [] | "WAVE 1/3 · 5 LEFT" (1030.2,14,499.5,56) | same | same | fps meter (2499.2,8,50.8,23) |
| 2560x1440 | draft | 22 | [] | [] | hidden | same | same | page (1041.2,364.5,477.5,568.9), Take (1124,817.5,148,50) fs19 |
| 2560x1440 | path | 21 | [] | [] | hidden | same | same | page (1030.5,385.5,499,527), doors 160x220 @ (1097,542.5) / (1303,548.5) |
| 2560x1440 | shop r7 | 26 | [] | [] | hidden | same | same | page (888,286.1,784,725.8), cards h 299.9 / **367.8** / 320.9, plaques y 762 / **829.9** / 783 (A3) |
| 2560x1440 | boss r8 | 17 | [] | [] | "THE HOLLOW STAG 1597/1800" (627.6,14,1304.8,56) | same | same | plate right edge 1932 < fps meter 2499 |
| 2560x1440 | victory | 22 | [] | [] | hidden | same | same | page (1053.8,398.5,452.4,501), Return to Camp (1179.6,783.5,200.9,50) |
| 2560x1440 | camp prompt | 17 | [] | [] | none | same | same | #camp-prompt (1074,140,404.1,54) fs19 |
| 1600x900 (reference) | all 7 | 16-26 | [] | [] | boss plate (392.3,14,815.5,35) | (502.5,809,595,75) | (10,870,52.8,22) | shop plaques all @ y495 |

HUD metrics: 1024x576 scale 0.6867 (clamped), zones 10.73 % idle / 15.74 % combat of height, real text 17.85 / key 16.48 /
numeral 20.6 px (floors 16 / 20 met); 2560x1440 scale 1.3333, zones 8.33 / 12.22 %, text 34.67 / 32 / 40 px. Run-screen floors
minText 16 / minNumeral 20 (1024) and 16 / 22 (2560). Extremes over every rect: minX 10, minY 8, maxRight 1014 of 1024 /
2550 of 2560, maxBottom 568 of 576 / 1432 of 1440. Smallest text anywhere is the 12 px version label (by design).
Frames viewed: `certD1-layout-1024-{combat,shop,boss}.png`, `certD1-layout-2560-{combat,shop}.png`, `certD1-q-camp-idle.png`,
`certD1-q-boss.png` — banner, boss plate, command bar (4 portraits with class-accent HP bars, 4 skill chips, SPC dodge), threat
pointer chips, fps meter and version label are all fully inside and legible at both sizes; the 2560 shop's three price plaques
sit at three different heights (A3).

## D7 — leak proxy (`certD1-q-leak3`: camp baseline -> 3 cmd-driven full runs -> camp; instance A's `certD1-leak` = 2 runs)

Each run: `startRun` -> killAllEnemies / clearRoom(defend) loops through rooms 1-6 (drafts taken, doors chosen by cmd) -> shop ->
`skipToRoom 8` -> `killBoss` -> victory card -> Enter -> `return_to_camp` (all three via Enter; `run_end` t2029 / 3526 / 5078,
`return_to_camp` t2039 / 3538 / 5090; 41 / 39 / 45 spawns, 15.5 / 15.5 / 16.5 s of page time per run).

| snapshot | E.entityCount | enemies/eshots/bolts/zones/azones | camp vfx (fireflies/embers/motes/shadows/emitters) | DOM nodes | numeral / threat nodes | heap MB | renderer programs / **geometries** / textures | scene objs / meshes / sprites / uniqGeo / uniqMat |
|---|---|---|---|---|---|---|---|---|
| baseline (t1153) | 4 | 0/0/0/0/0 | 150/130/34/70/17 | 274 | 0 / 0 | 44.9 | 54 / **402** / 29 | 1067 / 852 / 61 / 686 / 430 |
| after run 1 (t2648) | 4 | 0/0/0/0/0 | 150/130/34/70/17 | 456 | 5 / 0 | 54.3 | 57 / **840** / 45 | 1119 / 892 / 73 / 687 / 482 |
| after run 2 (t4146) | 4 | 0/0/0/0/0 | 150/130/34/70/17 | 447 | 5 / 0 | 49.7 | 57 / **952** / 45 | 1119 / 892 / 73 / 687 / 482 |
| after run 3 (t5697) | 4 | 0/0/0/0/0 | 150/130/34/70/17 | 456 | 5 / 0 | 53.7 | 57 / **1074** / 45 | 1119 / 892 / 73 / 687 / 482 |
| +6 s / +14 s | 4 / 4 | zeros | identical | 456 | 5 / 0 | 70.5 / 67.3 | 57 / 1074 / 45 | identical |
| instance A, 2 runs (`certD1-leak`) | 4/4/4 | zeros | identical | 274/451/447 | 0/0/5 | 48.7/51.5/70.3 -> 72.5 | 54/56/57 / **402/805/933** / 29/43/45 | — |

Camp after 3 runs (`camp-after-3-runs`, 8 s): 136.6 fps, p95 12.1, max 12.4, 0 gaps — no fps decay. The gate's proxies return
exactly to baseline (entityCount 4, every camp vfx count identical, zero live sim arrays, DOM +182 nodes once for the run-screen
then flat, pooled numerals 5 <= cap 12). The one monotonic series is three.js `renderer.info.memory.geometries`: +438 on the
first run (includes the resident run layer: +52 objects / +40 meshes / +12 sprites / +52 materials that stay in the scene graph)
then **+112 and +122 per run with the scene graph byte-identical** — see F1 and the per-enemy probe:

`certD1-q-geoleak` (room 1 live, cmd spawn 10 boars -> killAll -> 10 mantises -> killAll, then 22 s for decals to expire):

| step | ents | enemies | renderer geometries | scene uniqGeo | scene meshes | decals |
|---|---|---|---|---|---|---|
| room live | 9 | 5 | 697 | 710 | 962 | 0 |
| natural wave killed | 8 | 2 | 718 | 716 | 905 | 6 |
| +10 boars spawned | 18 | 12 | 749 (+31) | 746 (+30) | 1125 | 6 |
| boars killed | 11 | 4 | 777 (+28) | 727 (-19) | 984 | 19 |
| +10 mantises spawned | 20 | 14 | 798 (+21) | 763 (+36) | 1149 | 19 |
| mantises killed (room cleared t2040) | 4 | 0 | 801 | 687 | 885 | 33 |
| +22 s, decals expired | 4 | 0 | **801** | **686** | **852** | 0 |

The scene graph returns to the camp baseline (686 / 852) while the renderer counter never decrements: ~3 geometries per spawned
rig plus one per decal are removed from the scene without `.dispose()`. JS heap does not track it (44.9 -> 53.7 MB after three
runs, inside the 42-77 MB GC sawtooth seen everywhere), so this is bookkeeping/GPU-buffer retention, not a heap leak.

---

## Failures

**F1 (should-fix, not must-fix) — renderer geometries are never disposed: `renderer.info.memory.geometries` grows ~+115 per run
and never decrements.** Evidence: `certD1-q-leak3` 402 -> 840 -> 952 -> 1074 with the scene graph flat at objs 1119 / meshes 892 /
uniqGeo 687 from run 1 on and `E.entityCount` 4 at every camp snapshot; `certD1-leak` (instance A) 402 -> 805 -> 933;
`certD1-q-geoleak` 697 -> 801 across 20 cmd-spawned enemies + 33 decals while scene uniqGeo returned to 686. Rate ~3 per enemy
rig (+31 for 10 boars, +21 for 10 mantises) plus ~1 per splat decal. Not must-fix because the gate's named proxies (entityCount,
vfx counts) return to baseline, camp fps after 3 runs is 136 fps with 0 gaps, and heap shows no growth; but it is unbounded over
a session (every enemy ever spawned). Reproduce: `node tools/cert-capture.mjs shot x --url "http://127.0.0.1:5199/?seed=999"
--settle 3000 --actions tools/actions/certD1-q-geoleak.json --timeout 180000` and read the `rows` EVAL.

## Advisories

- **A1 room-clear -> reward/path screen first-frame stall (109-236 ms quiet, 310-424 ms contended), 5 of 6 clears.** Quiet:
  wave2 163.6 ms @ t1810 (12 ticks after `room_cleared` t1798), defend6 182.0 @ t3773 (13 after t3760), clear 109 @ t2221 (5 after
  t2216, on the path screen), 127.3 + 236.2 @ t3574/3604 (8 / 38 after t3566); clear #2 (t2810) produced none. Contended
  (`certD1-n-*`, `certD1-clear-diag`): 194/163/230, 363, 310, 424 ms. Signature every time: `timerMaxGap` 7-49 ms (main thread
  free), heap flat or GC'd, run-screen has no filter / backdrop-filter / blend (`certD1-q-clear` overlay census: only
  `transition: opacity 0.22s`), geometries +129..+314 across the clear (next room built). The sim is frozen for the duration; the
  0.22 s fade masks part of it. Outside the bar's "during waves" letter and under the 250 ms gate, but it is the most visible
  hitch in the game — worth a GPU-Chrome check of exactly this transition (row-34 measured only steady scenes).
- **A2 in-wave single-frame hitches 100-200 ms at first-draw moments (GPU-backed headless):** defend6 199.9 ms at `wave_start`
  #2 t1780 (3 spawn telegraphs; wave 1/3/4 starts in the same run were <55 ms), boss 139.5 ms @ t1579 fourteen ticks after
  `downed/ally#2` (the same ally-downed signature at 115/139 ms in `certD1-downed-diag` and 175.6 ms in `certD1-boss-diag`),
  warm-up 133.6 / 109 ms on the first rigs / first kill VFX. All with timerMaxGap <= 22 ms (rAF starved, not JS). The bar says
  no >100 ms hitches during waves; the orchestrator's GPU run saw the same class at 97 ms. Candidate causes to verify on
  GPU Chrome: first upload of per-instance rig/telegraph geometry, the downed-portrait grayscale restyle.
- **A3 2560x1440 shop: price plaques ragged.** Card heights 299.9 / 367.8 / 320.9 push the 25 / 30 / 35 GLINT plaques to y 762 /
  829.9 / 783 (`certD1-layout-2560-shop.png`, rects text#1-3) because the rare card's description wraps to 4 lines at that
  width; at 1024 and 1600 all three sit on one row (y 339.5 / 495). No overlap, everything inside — cosmetic.
- **A4 console noise:** `THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial` fires once per material
  created — 4410 lines across 35 captures, 884 in one 3-run session, ~70 per room. Strip the property from the toon material
  params so real warnings are visible.
- **A5 measurement note for the orchestrator:** this harness is GPU-backed (ANGLE D3D11, AMD Radeon 0x1638) with a 165 Hz frame
  quantum; "SwiftShader" numbers do not exist on this machine. Contended vs quiet readings differ 3-4x (camp 47 vs 123 fps,
  boss 28.7 vs 67.9), so any perf number taken while another headless browser is up should be discarded.

## Files

- Generators: `tools/certD1-q-gen.mjs`, `tools/certD1-q-gen2.mjs`, digest `tools/certD1-q-digest.mjs`; reused
  `tools/certD1-gen2.mjs` -> `tools/actions/certD1-n-{camp-idle,wave2,defend6,boss,boss-steady,clear,stress40,leak3}.json`;
  new `tools/actions/certD1-q-{gpu,geoleak}.json`.
- Quiet captures (all exit 0): `captures/certD1-q-{camp-idle,wave2,defend6,boss,boss-steady,clear,leak3,gpu,stress40,geoleak}.png`
  + `.console.txt`; crops `certD1-q-ver-{camp,boss,1024,2560,1024shop}-zoom.png`.
- Reused: `certD1-layout-{1024,1600,2560}*` (7 shots + RECTS each), `certD1-prompt-{1024,2560}`, `certD1-leak`,
  `certD1-{clear,downed,boss}-diag`, `certD1-n-*` (contended, record only).

---

## Raw probe log (checkpoints, in capture order; contended `certD1-n-*` rows kept for the record)


# Certification D round 1 — Performance & Chrome

Critic: certD1 (fresh context). Started 2026-09-06T00:11:05+08:00.
URL: http://127.0.0.1:5199/?seed=999 --timeout 180000

## Probe log

### D3 camp idle baseline — DONE (captures/certD1-n-camp-idle.png / .console.txt, exit 0)
Boot ?seed=999, settle 3 s, 10 s rAF sample from tick 486 (GOTO 15.1 s, 107 requests). Camp content: fireflies 150,
embers 130, gateMotes 34, grass 560, emitters 17, propShadows 70, critters 4, ents 4.
- ALL 500 frames / 9982 ms: mean 50.0 fps (20.0 ms), p50 18.2, p95 30.4, p99 36.4, max 36.6 ms, >50 ms 0, >100 ms 0
- WARM (0-3 s): 152 frames, mean 51.0 fps, max 36.4 ms | STEADY (3-10 s): 348 frames, mean 49.7 fps, p95 30.4, max 36.6 ms
- E.fps 53.5-54.9 every second; heap 42-50 MB sawtooth; long tasks none; page errors 0
- VERDICT D3: PASS-conditional (headless SwiftShader 45-55 band), zero hitches.
- API recon: __arenaProbe {stage{renderer,scene,camera,composer,bloomPass,gradePass},root,emitters,...}; E.hud {portraits,metrics,banner,threat,...}

### D1 worst-case wave — room 2 kill_all and room 6 defend DONE (exit 0 both)
Seed 999 frame: modes [kill_all,kill_all,kill_all,defend,kill_all,defend,shop,boss]; direct skipToRoom(2) -> waves [4,5]; skipToRoom(6) -> defend waves [3,3,3,4] at t=0/12/24/36 s. RMB held (player auto-fires), allies live.
captures/certD1-n-wave2 (25 s from tick 548): ALL 1364 fr mean 55.0 fps p95 30.1 max 230.2; WARM(0-3 s) 35.5 fps max 169.5 (t585 = wave-1 spawn #6-9, timerMaxGap 175.9 => main thread blocked, first enemy rigs); STEADY 57.5 fps p50 18.1 p95 24.4 p99 30.8 max 230.2; peakAlive 5 enemies @t834, peakEnt 18.
  gaps>100 after warm-up: 194.1 ms @t1150 (screen draft, timerMaxGap 56.8), 163.5 ms @t1160 (draft, timer 14.1 => rAF starved, main thread free), 230.2 ms @t1178 (draft) — ALL on the reward screen right after room_cleared t1135 -> reward_offer#sanctuary. In-wave: zero gaps >100 ms. Long tasks 166/87/66/50 ms.
captures/certD1-n-defend6 (47 s from tick 902): ALL 3107 fr mean 66.1; WARM 55.5 max 181.7 (t956 wave-1 spawn, timerMaxGap 26.1, heap 55.7->45.2 GC); STEADY 66.8 fps p50 12.2 p95 24.4 p99 36.4; 15 s windows [3-18] gt100 0 max 30.7 mean 75.6 | [8-23] 0/30.5/79.6 | [13-28] 0/30.3/78.5 | [18-33] 0/48.3/74.1 | [23-38] 0/48.6/68.2 | [28-43] 0/60.4/58.6; peakAlive 4 @t3092 (allies kill each 3-4 wave inside its 12 s), Waystone 150->140, party 90/150/85/80, 13 spawns 13 deaths.
  one post-warm-up gap: 363.2 ms @t3603 on screen draft, 19 ticks after room_cleared t3584 -> reward_offer#guardian_bond (timerMaxGap 88, heap flat 66.5->66.9, renderer geometries 945 unchanged).
=> the wave steady state passes; the ROOM-CLEAR -> REWARD-SCREEN transition stalls 163-363 ms every time (4 of 4 clears seen so far incl. the dead instance's 254/424 ms). Dedicated probe certD1-n-clear next.

### RESUME 2026-09-06 22:35 (+08:00) — 4th instance
- Build unchanged: src/** newest mtime 2026-09-03 20:57 (src/version.js = '0.4.16'); every certD1* capture on disk (09-04, 09-05, 09-06) is v0.4.16.
- Previous instance died after certD1-n-boss / certD1-n-boss-steady (00:27-00:28, never written up). Its perf numbers were CONTENDED:
  certD1-n-boss booted at camp E.fps 40.8 and read steady 28.7 fps / max 399.9 ms; certD1-n-boss-steady 50 s later booted at E.fps 82 and read 69.3 fps / 0 gaps >100 / max 72.6 (same sampler). certD1-n-clear + certD1-n-camp-idle also booted at E.fps 40.8-54.9 — the B critic's full-loop browser was running until 00:27.
- Machine now quiet (CPU 5 %, 7.2 GB free, 0 headless chrome). Re-running every perf probe ALONE with the previous instance's programmatic action files (tools/actions/certD1-n-*.json, unchanged) under capture prefix certD1-q-*. Contended numbers above are kept for the record only.

#### digest certD1-q-camp-idle  levels={"debug":2,"warn":10,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 18143 ms, 107 requests, last request at 2134 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":9}
E0: "lib 0.4.16 t1016 vw1600x900 poErr=none"
E1: {"tick":1016,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:38:05.043Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"164 fps","x":1532.1875,"y":8,"w":57.8125,"h":23},"apiVersion":"0.4.16"}
E3: {"probeKeys":["stage","root","emitters","setGuard","guardInfo","pick"],"stageKeys":["renderer","scene","camera","composer","bloomPass","gradePass","resize","render"],"hudKeys":["freeze","unfreeze","hover","grey","portraits","slots","overrideIndex","nudges","animations","forceNudge","pinAnimations","clearNudges","combat","banner","boss","threat","markers","threatHits","zones","relayout","setEnabled","metrics","chrome"],"cmdOk":"function"}
E4 SAMPLE tick 1018->1619 (601 sim ticks) tag=
  ALL {"frames":1249,"spanMs":10006,"meanFps":124.7,"meanMs":8.02,"p50":6.1,"p95":12.2,"p99":12.3,"max":14.9,"gt50":0,"gt100":0,"gt250":0}
  WARM {"frames":387,"spanMs":2994,"meanFps":128.9,"meanMs":7.76,"p50":6.1,"p95":12.1,"p99":12.2,"max":12.4,"gt50":0,"gt100":0,"gt250":0}
  STEADY {"frames":862,"spanMs":7006,"meanFps":122.9,"meanMs":8.14,"p50":6.1,"p95":12.2,"p99":12.3,"max":14.9,"gt50":0,"gt100":0,"gt250":0}
  windows15s []
  peakEnt 4 peakAlive {"n":0,"tick":1018} timer {"samples":1107,"maxGap":27.3,"gt50":0,"gt100":0} stateCostMs {"max":1.5,"mean":1.05} longTasks n=0 top=[]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:163.9/4/0/0/0/0/0/-/43.4/none 1:163.9/4/0/0/0/0/0/-/45.4/none 2:163.9/4/0/0/0/0/0/-/48.4/none 3:163.9/4/0/0/0/0/0/-/50.4/none 4:161.3/4/0/0/0/0/0/-/52.6/none 5:163.9/4/0/0/0/0/0/-/42.3/none 6:163.9/4/0/0/0/0/0/-/43.6/none 7:163.9/4/0/0/0/0/0/-/45.4/none 8:163.9/4/0/0/0/0/0/-/47.2/none 9:161.3/4/0/0/0/0/0/-/48.5/none 10:161.3/4/0/0/0/0/0/-/49.6/none
  campState {"fireflies":150,"embers":130,"gateMotes":34,"grass":560,"emitters":17,"propShadows":70,"critters":4}
  firstSpawn null
E5 VFX {"tick":1620,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":258,"numeralNodes":0,"threatNodes":0,"fizzleNodes":0,"domNodes":274,"heapMB":49.6,"renderer":{"programs":54,"geometries":402,"textures":29,"calls":1,"tris":1},"sceneGraph":{"objs":1067,"meshes":852,"pts":6,"sprites":61,"lights":6,"uniqGeo":686,"uniqMat":430},"tag":"camp-idle"}

#### digest certD1-q-wave2  levels={"debug":2,"warn":73,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 20089 ms, 107 requests, last request at 2231 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":72}
E0: "lib 0.4.16 t1121 vw1600x900 poErr=none"
E1: {"tick":1121,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:39:51.246Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"modes":["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"],"room":1}
E3: {"skip":{"room":2,"phase":"combat","mode":"kill_all"},"roomState":{"mode":"kill_all","cleared":false,"softFailed":false,"waveIndex":0,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":4,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null},"tick":1140,"party":[[0,100,0,0],[1,150,-1.9,-1],[2,95,1.8,-1.3],[3,80,-0.3,-2.2]]}
E4 SAMPLE tick 1143->2625 (1482 sim ticks) tag=
  ALL {"frames":3055,"spanMs":24994,"meanFps":122.2,"meanMs":8.18,"p50":6.2,"p95":12.2,"p99":12.3,"max":163.6,"gt50":3,"gt100":1,"gt250":0}
  WARM {"frames":347,"spanMs":2988,"meanFps":115.8,"meanMs":8.64,"p50":6.1,"p95":12.2,"p99":18.3,"max":97.1,"gt50":2,"gt100":0,"gt250":0}
  STEADY {"frames":2708,"spanMs":22000,"meanFps":123,"meanMs":8.13,"p50":6.2,"p95":12.2,"p99":12.3,"max":163.6,"gt50":1,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":163.6,"meanFps":121.7},{"from":8000,"to":23000,"gt100":1,"max":163.6,"meanFps":123.2}]
  peakEnt 18 peakAlive {"n":5,"tick":1448} timer {"samples":2914,"maxGap":51.1,"gt50":1,"gt100":0} stateCostMs {"max":2,"mean":0.91} longTasks n=0 top=[]
  GAP 163.6 ms @11421 ms tick 1810 screen draft phase reward timerMaxGap 27.2 ents 4 alive 0 heap 64.8->52.6 geo 813 ring[-3..] ["1798:projectile_despawn#68","1798:heal_override","1798:glint_gain","1798:reward_offer#restorative_wave"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:163.9/5/0/0/0/0/0/-/53.8/none 1:161.3/11/4/4/0/1/0/-/54.3/none 2:163.9/13/3/3/0/3/1/-/51.4/none 3:163.9/10/2/2/1/1/1/-/56.6/none 4:163.9/12/1/1/1/2/2/-/53.5/none 5:163.9/8/0/0/0/1/1/-/52.1/none 6:163.9/12/5/5/0/0/1/-/57.4/none 7:161.3/17/4/4/0/5/2/-/55.2/none 8:161.3/13/2/2/1/2/2/-/61.7/none 9:163.9/9/2/2/0/0/1/-/60.5/none 10:163.9/13/2/2/1/2/2/-/58.7/none 11:161.3/11/0/0/1/2/2/-/56.9/none 12:161.3/4/0/0/0/0/0/-/61/draft 13:161.3/4/0/0/0/0/0/-/64/draft 14:161.3/4/0/0/0/0/0/-/55/draft 15:161.3/4/0/0/0/0/0/-/57.5/draft 16:161.3/4/0/0/0/0/0/-/59.4/draft 17:161.3/4/0/0/0/0/0/-/62.4/draft 18:163.9/4/0/0/0/0/0/-/65.2/draft 19:161.3/4/0/0/0/0/0/-/54/draft 20:161.3/4/0/0/0/0/0/-/56.7/draft 21:161.3/4/0/0/0/0/0/-/59.3/draft 22:161.3/4/0/0/0/0/0/-/61.2/draft 23:161.3/4/0/0/0/0/0/-/63.4/draft 24:161.3/4/0/0/0/0/0/-/65.7/draft 25:161.3/4/0/0/0/0/0/-/55.6/draft
  events {"waves":[[1122,0,5],[1140,0,4],[1400,1,5]],"spawns":9,"deaths":9,"despawns":0,"hitstops":9,"cleared":[1140,1798],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,140,false],[2,95,false],[3,70,false]]
  phase "reward"
  roomState {"mode":"kill_all","cleared":true,"softFailed":false,"waveIndex":1,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":0,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null}
  firstSpawn "{\"tick\":1188,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"mantis\",\"x\":5.66,\"z\":-6.1,\"wave\":0}"
E5: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"161 fps","x":1532.1875,"y":8,"w":57.8125,"h":23},"apiVersion":"0.4.16"}
E6 VFX {"tick":2626,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":5,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":4,"threatNodes":0,"fizzleNodes":0,"domNodes":297,"heapMB":55.6,"renderer":{"programs":58,"geometries":813,"textures":44,"calls":1,"tris":1},"sceneGraph":{"objs":1072,"meshes":857,"pts":6,"sprites":61,"lights":6,"uniqGeo":687,"uniqMat":435},"tag":"after-certD1-n-wave2"}

#### digest certD1-q-defend6  levels={"debug":2,"warn":101,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 18655 ms, 107 requests, last request at 2079 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":100}
E0: "lib 0.4.16 t1046 vw1600x900 poErr=none"
E1: {"tick":1047,"fps":55.2,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:41:04.691Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"modes":["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"],"room":1}
E3: {"skip":{"room":6,"phase":"combat","mode":"defend"},"roomState":{"mode":"defend","cleared":false,"softFailed":false,"waveIndex":0,"wavesTotal":4,"waveSizes":[3,3,3,4],"pendingSpawns":3,"aliveEnemies":0,"defendTicksLeft":2700,"waystone":{"id":4,"hp":150,"maxHp":150}},"tick":1060,"party":[[0,100,0,0],[1,150,-1.9,-1],[2,95,1.8,-1.3],[3,80,-0.3,-2.2]]}
E4 SAMPLE tick 1083->3872 (2789 sim ticks) tag=
  ALL {"frames":3581,"spanMs":46988,"meanFps":76.2,"meanMs":13.13,"p50":12.1,"p95":24.2,"p99":30.4,"max":199.9,"gt50":6,"gt100":3,"gt250":0}
  WARM {"frames":164,"spanMs":2970,"meanFps":54.9,"meanMs":18.22,"p50":18.2,"p95":30.4,"p99":54.5,"max":133.6,"gt50":2,"gt100":1,"gt250":0}
  STEADY {"frames":3417,"spanMs":44001,"meanFps":77.6,"meanMs":12.88,"p50":12.1,"p95":24.2,"p99":30.4,"max":199.9,"gt50":4,"gt100":2,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":199.9,"meanFps":77.2},{"from":8000,"to":23000,"gt100":1,"max":199.9,"meanFps":75.6},{"from":13000,"to":28000,"gt100":0,"max":54.5,"meanFps":73},{"from":18000,"to":33000,"gt100":0,"max":36.3,"meanFps":80.9},{"from":23000,"to":38000,"gt100":0,"max":36.3,"meanFps":74.4},{"from":28000,"to":43000,"gt100":0,"max":36.2,"meanFps":81}]
  peakEnt 18 peakAlive {"n":4,"tick":3268} timer {"samples":5746,"maxGap":72.6,"gt50":1,"gt100":0} stateCostMs {"max":1.9,"mean":1.16} longTasks n=1 top=[{"at":33577,"dur":56}]
  GAP 133.6 ms @692 ms tick 1132 screen none phase combat timerMaxGap 11.3 ents 10 alive 3 heap 54.9->55.9 geo 703 ring[-3..] ["1105:sound","1108:enemy_spawn#7","1108:enemy_spawn#8","1108:enemy_spawn#9"]
  GAP 199.9 ms @11638 ms tick 1780 screen none phase combat timerMaxGap 22.4 ents 7 alive 0 heap 53.2->54 geo 773 ring[-3..] ["1780:wave_start","1780:spawn_telegraph","1780:spawn_telegraph","1780:spawn_telegraph"]
  GAP 182 ms @45353 ms tick 3773 screen draft phase reward timerMaxGap 48.5 ents 5 alive 0 heap 59.8->60.2 geo 945 ring[-3..] ["3760:projectile_despawn#169","3760:heal_override","3760:glint_gain","3760:reward_offer#guardian_bond"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:55.2/6/0/0/0/0/0/-/56/none 1:54.9/10/3/3/0/0/0/-/48.4/none 2:54.9/15/2/2/0/4/2/-/55.7/none 3:54.9/13/2/2/0/2/2/-/46.5/none 4:80.6/12/1/1/0/1/3/-/54/none 5:82.6/12/0/0/1/2/2/-/45.6/none 6:82.6/9/0/0/1/0/1/-/53.4/none 7:83.3/8/0/0/0/0/1/-/45.8/none 8:82.6/8/0/0/0/0/1/-/49/none 9:82.6/7/0/0/0/0/0/-/46.8/none 10:82.6/7/0/0/0/0/0/-/47.2/none 11:83.3/7/0/0/0/0/0/-/47.9/none 12:82.6/7/0/0/0/0/0/-/56.5/none 13:54.9/10/3/3/0/0/0/-/53.7/none 14:41.3/16/3/3/0/5/1/-/49.2/none 15:41.5/11/2/2/0/1/1/-/46.6/none 16:82/11/1/1/0/0/3/-/61.6/none 17:82.6/13/1/1/0/3/2/-/50.6/none 18:83.3/8/0/0/0/0/2/-/56.6/none 19:158.7/8/0/0/0/0/2/-/51.6/none 20:83.3/8/0/0/0/0/2/-/58/none 21:83.3/6/0/0/0/0/0/-/60.4/none 22:81.3/6/0/0/0/0/0/-/57.9/none 23:81.3/6/0/0/0/0/0/-/54.1/none 24:55.6/6/0/0/0/0/0/-/51/none 25:55.6/9/3/3/0/0/0/-/49.4/none 26:55.2/15/2/2/0/5/1/-/48.9/none 27:55.2/14/1/1/1/2/3/-/49.5/none 28:82.6/11/0/0/0/1/3/-/53/none 29:83.3/9/0/0/0/0/2/-/52.2/none 30:83.3/9/0/0/0/0/2/-/46.7/none 31:158.7/8/0/0/0/0/1/-/53.2/none 32:82.6/7/0/0/0/0/0/-/55.2/none 33:82/7/0/0/0/0/0/-/53.4/none 34:80.6/7/0/0/0/0/0/-/49.9/none 35:55.6/7/0/0/0/0/0/-/46.4/none 36:55.2/7/0/0/0/0/0/-/54.6/none 37:55.2/11/4/4/0/0/0/-/55.3/none 38:55.2/11/4/4/0/0/0/-/51.4/none 39:55.6/16/3/3/0/5/1/-/65.7/none 40:82.6/14/3/3/1/2/1/-/55.1/none 41:82.6/13/2/2/0/1/3/-/51.6/none 42:82.6/13/1/1/1/2/2/-/48.3/none 43:83.3/10/0/0/0/1/2/-/47.2/none 44:83.3/9/0/0/0/0/2/-/66.9/none 45:82.6/8/0/0/0/0/1/-/58/none 46:82/5/0/0/0/0/0/-/65.6/draft 47:55.2/5/0/0/0/0/0/-/48.2/draft
  events {"waves":[[1047,0,5],[1060,0,3],[1780,1,3],[2500,2,3],[3220,3,4]],"spawns":13,"deaths":13,"despawns":0,"hitstops":13,"cleared":[1060,3760],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,90,false],[1,150,false],[2,85,false],[3,80,false]]
  phase "reward"
  roomState {"mode":"defend","cleared":true,"softFailed":false,"waveIndex":3,"wavesTotal":4,"waveSizes":[3,3,3,4],"pendingSpawns":0,"aliveEnemies":0,"defendTicksLeft":null,"waystone":{"id":4,"hp":140,"maxHp":150}}
  firstSpawn "{\"tick\":1108,\"type\":\"enemy_spawn\",\"id\":7,\"etype\":\"mantis\",\"x\":10.04,\"z\":3.53,\"wave\":0}"
E5: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"55 fps","x":1539.1875,"y":8,"w":50.8125,"h":23},"apiVersion":"0.4.16"}
E6 VFX {"tick":3873,"scene":"camp","phase":"reward","ents":5,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":5,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":3,"threatNodes":0,"fizzleNodes":0,"domNodes":295,"heapMB":54,"renderer":{"programs":58,"geometries":945,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1085,"meshes":868,"pts":6,"sprites":62,"lights":6,"uniqGeo":698,"uniqMat":442},"tag":"after-certD1-n-defend6"}

#### digest certD1-q-boss  levels={"debug":2,"warn":73,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 11422 ms, 107 requests, last request at 4974 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":72}
E0: "lib 0.4.16 t381 vw1600x900 poErr=none"
E1: {"tick":381,"fps":82.6,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:42:09.815Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":8,"boss":{"hp":1800,"max":1800},"tick":382}
E3: {"ok":true,"tick":573,"waitedTicks":171,"ms":2813,"adds":[[569,0.75,3]],"quakes":[383],"bossHp":1314.5,"enemies":3}
E4 SAMPLE tick 573->1754 (1181 sim ticks) tag=
  ALL {"frames":1392,"spanMs":19952,"meanFps":69.7,"meanMs":14.34,"p50":12.2,"p95":24.3,"p99":36.3,"max":139.5,"gt50":3,"gt100":1,"gt250":0}
  WARM {"frames":236,"spanMs":2939,"meanFps":80,"meanMs":12.51,"p50":12.1,"p95":18.2,"p99":18.4,"max":24.1,"gt50":0,"gt100":0,"gt250":0}
  STEADY {"frames":1156,"spanMs":17000,"meanFps":67.9,"meanMs":14.72,"p50":12.2,"p95":30.1,"p99":36.3,"max":139.5,"gt50":3,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":139.5,"meanFps":65.8}]
  peakEnt 19 peakAlive {"n":7,"tick":1049} timer {"samples":1667,"maxGap":95,"gt50":2,"gt100":0} stateCostMs {"max":3,"mean":1.66} longTasks n=1 top=[{"at":24655,"dur":80}]
  GAP 139.5 ms @16995 ms tick 1579 screen none phase combat timerMaxGap 11.5 ents 10 alive 3 heap 57.9->59 geo 930 ring[-3..] ["1567:projectile_despawn#121","1569:projectile_spawn#124","1569:basic_fire","1569:sound"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:82/11/3/3/0/0/2/1315/52/none 1:82/11/3/3/0/0/2/1182/50.2/none 2:82.6/9/3/3/0/0/1/996/60.7/none 3:82/10/3/3/0/1/0/853/49/none 4:82.6/14/6/6/0/0/2/733/59.7/none 5:82/15/4/4/1/2/2/641/56.1/none 6:82/12/4/4/0/0/3/432/52.8/none 7:82.6/11/4/4/0/0/2/275/55.9/none 8:82.6/16/7/7/1/0/2/225/54.7/none 9:82.6/18/7/7/1/3/1/201/59.4/none 10:82.6/11/5/5/0/0/0/173/58.9/none 11:81.3/13/5/5/0/1/1/91/62.9/none 12:54.9/13/5/5/0/1/1/45/56.9/none 13:54.9/11/4/4/0/0/1/0/55.3/none 14:54.9/12/3/3/1/0/2/0/61.2/none 15:55.2/11/3/3/1/0/1/0/67.3/none 16:54.9/11/3/3/1/0/1/0/57/none 17:54.9/10/3/3/0/0/1/0/59/none 18:54.9/9/2/2/1/0/0/0/62.8/none 19:82.6/8/1/1/1/0/0/0/68.4/none 20:82.6/7/1/1/0/0/0/0/64.3/none
  events {"waves":[[382,0,5]],"spawns":9,"deaths":9,"despawns":0,"hitstops":9,"cleared":[382],"downed":[[989,2],[990,2],[1281,3],[1282,3],[1564,2],[1565,2]],"revive":[[1296,null]],"quakeStart":[383,665,947],"quakeResolve":[425,707,989],"tramples":[426,576,726,876,1026,1176],"adds":[[569,0.75,3],[809,0.5,3],[1049,0.25,3]],"bossDeath":[1298],"runEnd":[]}
  party [[0,84,false],[1,9,false],[2,0,true],[3,0,true]]
  boss {"active":true,"cleared":false,"name":"THE HOLLOW STAG","id":4,"hp":0,"maxHp":1800,"pct":0,"x":0,"z":0,"phasesFired":3,"adds":1,"quake":null,"lunging":false}
  phase "combat"
  firstSpawn "{\"tick\":569,\"type\":\"enemy_spawn\",\"id\":27,\"etype\":\"boar\",\"x\":10.2,\"z\":-3,\"wave\":101}"
E5: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"83 fps","x":1539.1875,"y":8,"w":50.8125,"h":23},"apiVersion":"0.4.16"}
E6 VFX {"tick":1756,"scene":"camp","phase":"combat","ents":7,"enemies":1,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":9,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":267,"numeralNodes":12,"threatNodes":24,"fizzleNodes":0,"domNodes":313,"heapMB":64.3,"renderer":{"programs":62,"geometries":941,"textures":48,"calls":1,"tris":1},"sceneGraph":{"objs":1142,"meshes":886,"pts":6,"sprites":89,"lights":6,"uniqGeo":704,"uniqMat":481},"tag":"after-boss"}

#### digest certD1-q-boss-steady  levels={"debug":2,"warn":31,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 13667 ms, 107 requests, last request at 5523 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":30}
E0: "lib 0.4.16 t498 vw1600x900 poErr=none"
E1: {"tick":498,"fps":83.3,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:42:52.309Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":8,"tick":498}
E3: {"ok":true,"tick":685,"waitedTicks":167,"ms":2760,"adds":[[685,0.75,3]]}
E4 SAMPLE tick 685->1883 (1198 sim ticks) tag=
  ALL {"frames":1325,"spanMs":19952,"meanFps":66.4,"meanMs":15.07,"p50":12.2,"p95":30.2,"p99":36.4,"max":91,"gt50":2,"gt100":0,"gt250":0}
  WARM {"frames":183,"spanMs":2945,"meanFps":61.8,"meanMs":16.18,"p50":18,"p95":30.3,"p99":36.5,"max":48.5,"gt50":0,"gt100":0,"gt250":0}
  STEADY {"frames":1142,"spanMs":16982,"meanFps":67.2,"meanMs":14.88,"p50":12.2,"p95":30.1,"p99":36.4,"max":91,"gt50":2,"gt100":0,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":0,"max":91,"meanFps":67.9}]
  peakEnt 14 peakAlive {"n":3,"tick":685} timer {"samples":2362,"maxGap":74.6,"gt50":1,"gt100":0} stateCostMs {"max":2.9,"mean":1.53} longTasks n=1 top=[{"at":26870,"dur":71}]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:82.6/11/3/3/0/0/2/1324/52.4/none 1:82/13/3/3/0/1/2/1202/54.9/none 2:55.6/9/3/3/0/0/1/1175/60.7/none 3:54.9/11/3/3/0/2/0/1249/51/none 4:55.2/11/3/3/0/0/2/1240/53.5/none 5:55.2/12/1/1/1/2/2/1158/61.8/none 6:55.2/13/1/1/0/3/3/1150/59.3/none 7:55.2/10/1/1/0/1/2/1163/53/none 8:82.6/10/1/1/1/0/2/1240/55.1/none 9:82.6/10/1/1/0/2/1/1192/59.9/none 10:82.6/7/1/1/0/0/0/1110/55.5/none 11:82.6/9/1/1/0/1/1/1162/64.7/none 12:82.6/8/1/1/0/0/1/1053/63.3/none 13:82/9/1/1/0/0/2/1240/63.8/none 14:81.3/9/1/1/0/0/2/1193/61.8/none 15:55.2/9/1/1/0/0/2/1116/55.9/none 16:55.2/8/1/1/0/0/2/1215/62.1/none 17:55.2/8/1/1/0/0/2/1157/57.4/none 18:55.2/7/1/1/1/0/0/1141/66/none 19:55.2/7/1/1/1/0/0/1125/62.7/none 20:55.9/6/1/1/0/0/0/1260/58.5/none
  events {"waves":[[498,0,5]],"spawns":3,"deaths":2,"despawns":0,"hitstops":2,"cleared":[498],"downed":[[1105,2],[1106,2],[1417,3],[1418,3],[1581,2],[1582,2],[1699,1],[1700,1]],"revive":[[1412,null]],"quakeStart":[499,781,1063,1375,1657],"quakeResolve":[541,823,1105,1417,1699],"tramples":[542,692,842,992,1142,1292,1442,1592,1742],"adds":[[685,0.75,3]],"bossDeath":[],"runEnd":[]}
  party [[0,88,false],[1,0,true],[2,0,true],[3,0,true]]
  boss {"active":true,"cleared":false,"name":"THE HOLLOW STAG","id":4,"hp":1260,"maxHp":1800,"pct":0.7,"x":0,"z":-0.03,"phasesFired":1,"adds":1,"quake":null,"lunging":false}
  phase "combat"
  hpResets 11
  firstSpawn "{\"tick\":685,\"type\":\"enemy_spawn\",\"id\":27,\"etype\":\"boar\",\"x\":10.2,\"z\":-3,\"wave\":101}"
E5 VFX {"tick":1884,"scene":"camp","phase":"combat","ents":6,"enemies":1,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":1,"decals":2,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":267,"numeralNodes":12,"threatNodes":16,"fizzleNodes":0,"domNodes":305,"heapMB":58.5,"renderer":{"programs":62,"geometries":920,"textures":48,"calls":1,"tris":1},"sceneGraph":{"objs":1190,"meshes":941,"pts":6,"sprites":72,"lights":6,"uniqGeo":725,"uniqMat":473},"tag":"after-boss-steady"}

#### digest certD1-q-clear  levels={"debug":2,"warn":227,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 22025 ms, 107 requests, last request at 2175 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":226}
E0: "lib 0.4.16 t1249 vw1600x900 poErr=none"
E1: {"tick":1249,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:45:03.782Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":1,"tick":1250}
E3 SAMPLE tick 1258->3831 (2573 sim ticks) tag=
  ALL {"frames":4617,"spanMs":43916,"meanFps":105.1,"meanMs":9.51,"p50":6.2,"p95":18.2,"p99":24.3,"max":236.2,"gt50":4,"gt100":4,"gt250":0}
  WARM {"frames":345,"spanMs":2909,"meanFps":118.2,"meanMs":8.46,"p50":6.1,"p95":12.2,"p99":36.2,"max":109,"gt50":1,"gt100":1,"gt250":0}
  STEADY {"frames":4272,"spanMs":41000,"meanFps":104.2,"meanMs":9.6,"p50":6.2,"p95":18.2,"p99":24.3,"max":236.2,"gt50":3,"gt100":3,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":109,"meanFps":127.7},{"from":8000,"to":23000,"gt100":1,"max":109,"meanFps":120.6},{"from":13000,"to":28000,"gt100":1,"max":109,"meanFps":112},{"from":18000,"to":33000,"gt100":0,"max":42.7,"meanFps":92.6},{"from":23000,"to":38000,"gt100":0,"max":42.7,"meanFps":84.2},{"from":28000,"to":43000,"gt100":2,"max":236.2,"meanFps":80.4}]
  peakEnt 19 peakAlive {"n":5,"tick":1298} timer {"samples":4344,"maxGap":66,"gt50":1,"gt100":0} stateCostMs {"max":1.7,"mean":0.94} longTasks n=2 top=[{"at":25061,"dur":114},{"at":25182,"dur":62}]
  GAP 109 ms @2379 ms tick 1402 screen none phase combat timerMaxGap 14.1 ents 17 alive 4 heap 48.7->50.2 geo 720 ring[-3..] ["1396:sound","1396:hitstop","1396:death/boar#8","1396:sound"]
  GAP 109 ms @16464 ms tick 2221 screen path phase path timerMaxGap 27 ents 4 alive 0 heap 57.6->44.4 geo 847 ring[-3..] ["2216:reward_offer#sanctuary","2216:skill_equip","2216:draft_taken#sanctuary","2216:path_offer"]
  GAP 127.3 ms @39725 ms tick 3574 screen draft phase reward timerMaxGap 24 ents 4 alive 0 heap 65.8->66.4 geo 1042 ring[-3..] ["3566:projectile_despawn#216","3566:heal_override","3566:glint_gain","3566:reward_offer#ascend"]
  GAP 236.2 ms @40222 ms tick 3604 screen draft phase reward timerMaxGap 7.1 ents 4 alive 0 heap 69.1->69.7 geo 1042 ring[-3..] ["3566:projectile_despawn#216","3566:heal_override","3566:glint_gain","3566:reward_offer#ascend"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:163.9/5/0/0/0/0/0/-/54.9/none 1:163.9/11/5/5/0/0/0/-/46.8/none 2:163.9/18/5/5/0/5/2/-/52.2/none 3:163.9/14/4/4/0/2/2/-/60.2/none 4:163.9/14/3/3/0/2/3/-/57/none 5:163.9/12/2/2/0/2/2/-/47.1/none 6:163.9/8/0/0/0/0/2/-/49.9/none 7:163.9/14/3/3/0/4/1/-/49/none 8:163.9/10/2/2/0/1/1/-/46.8/none 9:84/9/1/1/0/2/0/-/52.5/none 10:163.9/9/0/0/1/1/1/-/57.2/none 11:163.9/12/5/5/0/0/1/-/61.7/none 12:163.9/17/5/5/0/5/1/-/58/none 13:163.9/11/4/4/0/1/0/-/55.4/none 14:163.9/14/4/4/1/2/1/-/49.9/none 15:163.9/12/3/3/0/2/1/-/64.6/none 16:163.9/10/1/1/0/2/1/-/62/none 17:163.9/5/0/0/0/0/0/-/51.4/none 18:163.9/11/5/5/0/0/0/-/47.6/none 19:163.9/12/5/5/0/1/0/-/61.1/none 20:163.9/14/3/3/1/4/0/-/58.4/none 21:161.3/10/3/3/1/0/0/-/46.8/none 22:82.6/8/1/1/0/1/0/-/63.8/none 23:82.6/10/4/4/0/0/0/-/51.4/none 24:83.3/16/4/4/0/5/1/-/70.4/none 25:83.3/11/1/1/0/1/3/-/66.5/none 26:163.9/10/1/1/0/0/3/-/63.7/none 27:158.7/4/0/0/0/0/0/-/54.6/path 28:83.3/6/0/0/0/0/0/-/67.6/none 29:82.6/15/4/4/0/5/0/-/58/none 30:55.2/10/3/3/0/1/0/-/69.9/none 31:55.6/12/3/3/0/2/1/-/56.8/none 32:55.2/12/2/2/1/2/1/-/70.6/none 33:55.6/10/1/1/0/2/1/-/58.7/none 34:55.6/14/1/1/0/5/2/-/73.8/none 35:55.2/7/0/0/0/0/1/-/63.4/none 36:82.6/12/5/5/0/0/1/-/57.7/none 37:158.7/13/4/4/0/2/1/-/53.6/none 38:83.3/12/3/3/0/2/1/-/74.9/none 39:158.7/15/2/2/0/6/2/-/50.4/none 40:83.3/4/0/0/0/0/0/-/69.7/draft 41:84/4/0/0/0/0/0/-/54.1/draft 42:83.3/4/0/0/0/0/0/-/66/draft 43:82.6/4/0/0/0/0/0/-/75.7/draft 44:161.3/4/0/0/0/0/0/-/62.6/draft
  events {"waves":[[1250,0,5],[1572,1,3],[1834,2,5],[2259,0,5],[2549,1,4],[2863,0,4],[3261,1,5]],"spawns":31,"deaths":31,"despawns":0,"hitstops":28,"cleared":[2216,2810,3566],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,140,false],[2,85,false],[3,70,false]]
  phase "reward"
  room 3
  screen "draft"
  driver ["draftTake t2216","pathChoose t2241","draftTake t2821","pathChoose t2845"]
  clearsSeen 3
  firstSpawn "{\"tick\":1298,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"boar\",\"x\":-9.89,\"z\":-4.06,\"wave\":0}"
E4: {"screen":"draft","phase":"reward","n":2,"rs":[{"l":"canvas#0","tag":"CANVAS","id":"","cls":"","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"all","willChange":"auto"},{"l":"run-screen","tag":"DIV","id":"run-screen","cls":"rn-compact rn-open","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"opacity 0.22s","willChange":"auto"}]}
E5 VFX {"tick":3833,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":13,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":6,"threatNodes":0,"fizzleNodes":0,"domNodes":295,"heapMB":69.8,"renderer":{"programs":58,"geometries":1042,"textures":44,"calls":1,"tris":1},"sceneGraph":{"objs":1080,"meshes":865,"pts":6,"sprites":61,"lights":6,"uniqGeo":687,"uniqMat":443},"tag":"after-clear"}

#### digest certD1-q-leak3  levels={"debug":2,"warn":885,"GOTO":1,"EVAL":15,"DEBUG-API":1}
[GOTO] 18700 ms, 107 requests, last request at 1968 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":884}
E0: "lib 0.4.16 t1062 vw1600x900 poErr=none"
E1: {"tick":1062,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:47:37.360Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2 VFX {"tick":1153,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":258,"numeralNodes":0,"threatNodes":0,"fizzleNodes":0,"domNodes":274,"heapMB":44.9,"renderer":{"programs":54,"geometries":402,"textures":29,"calls":1,"tris":1},"sceneGraph":{"objs":1067,"meshes":852,"pts":6,"sprites":61,"lights":6,"uniqGeo":686,"uniqMat":430},"tag":"baseline","events":[]}
E3: {"log":["startRun r1 t1154","combat/1/none t1154","reward/1/draft t1333","draftTake {\"type\":\"skill\",\"id\":\"restorative_wave\"}","path/1/path t1362","pathChoose {\"nextRoom\":2,\"reward\":\"skill\",\"win\":\"kill_all\"}","combat/2/none t1384","reward/2/draft t1556","draftTake {\"type\":\"skill\",\"id\":\"sanctuary\"}","path/2/path t1577","pathChoose {\"nextRoom\":3,\"reward\":\"node\",\"win\":\"kill_all\"}","combat/3/none t1599","reward/3/draft t1713","draftTake {\"type\":\"node\",\"id\":\"quicken\"}","path/3/path t1734","pathChoose {\"nextRoom\":4,\"reward\":\"skill\",\"win\":\"defend\"}","combat/4/none t1756","clearRoom(defend r4) true t1756","reward/4/draft t1771","draftTake {\"type\
E4: {"viaEnter":true,"tick":2286}
E5 VFX {"tick":2648,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":1,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":267,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":456,"heapMB":54.3,"renderer":{"programs":57,"geometries":840,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1119,"meshes":892,"pts":6,"sprites":73,"lights":6,"uniqGeo":687,"uniqMat":482},"tag":"after-run-1","events":["run_end t2029","return_to_camp t2039"]}
E6: {"log":["startRun r1 t2648","combat/1/none t2648","reward/1/draft t2835","draftTake {\"type\":\"skill\",\"id\":\"warding_aura\"}","path/1/path t2857","pathChoose {\"nextRoom\":2,\"reward\":\"node\",\"win\":\"defend\"}","combat/2/none t2878","clearRoom(defend r2) true t2878","reward/2/draft t2894","draftTake {\"type\":\"node\",\"id\":\"echo\"}","path/2/path t2915","pathChoose {\"nextRoom\":3,\"reward\":\"skill\",\"win\":\"kill_all\"}","combat/3/none t2937","reward/3/draft t3052","draftTake {\"type\":\"skill\",\"id\":\"restorative_wave\"}","path/3/path t3073","pathChoose {\"nextRoom\":4,\"reward\":\"node\",\"win\":\"defend\"}","combat/4/none t3094","clearRoom(defend r4) true t3094","reward/4/d
E7: {"viaEnter":true,"tick":3784}
E8 VFX {"tick":4146,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":2,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":267,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":447,"heapMB":49.7,"renderer":{"programs":57,"geometries":952,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1119,"meshes":892,"pts":6,"sprites":73,"lights":6,"uniqGeo":687,"uniqMat":482},"tag":"after-run-2","events":["run_end t2029","return_to_camp t2039","run_end t3526","return_to_camp t3538"]}
E9: {"log":["startRun r1 t4146","combat/1/none t4146","reward/1/draft t4334","draftTake {\"type\":\"skill\",\"id\":\"sanctuary\"}","path/1/path t4355","pathChoose {\"nextRoom\":2,\"reward\":\"node\",\"win\":\"defend\"}","combat/2/none t4376","clearRoom(defend r2) true t4376","reward/2/draft t4392","draftTake {\"type\":\"node\",\"id\":\"ascend\"}","path/2/path t4413","pathChoose {\"nextRoom\":3,\"reward\":\"skill\",\"win\":\"defend\"}","combat/3/none t4434","clearRoom(defend r3) true t4434","reward/3/draft t4450","draftTake {\"type\":\"skill\",\"id\":\"guardian_bond\"}","path/3/path t4471","pathChoose {\"nextRoom\":4,\"reward\":\"skill\",\"win\":\"kill_all\"}","combat/4/none t4492","reward/4/draf
E10: {"viaEnter":true,"tick":5336}
E11 VFX {"tick":5697,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":3,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":267,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":456,"heapMB":53.7,"renderer":{"programs":57,"geometries":1074,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1119,"meshes":892,"pts":6,"sprites":73,"lights":6,"uniqGeo":687,"uniqMat":482},"tag":"after-run-3","events":["run_end t2029","return_to_camp t2039","run_end t3526","return_to_camp t3538","run_end t5078","return_to_camp t5090"]}
E12 VFX {"tick":6058,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":3,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":267,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":456,"heapMB":70.5,"renderer":{"programs":57,"geometries":1074,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1119,"meshes":892,"pts":6,"sprites":73,"lights":6,"uniqGeo":687,"uniqMat":482},"tag":"after-run-3+6s","events":["run_end t2029","return_to_camp t2039","run_end t3526","return_to_camp t3538","run_end t5078","return_to_camp t5090"]}
E13 SAMPLE tick undefined->undefined (undefined sim ticks) tag=camp-after-3-runs
  ALL {"frames":1094,"spanMs":8000,"meanFps":136.6,"meanMs":7.32,"p50":6.1,"p95":12.1,"p99":12.2,"max":12.4,"gt50":0,"gt100":0,"gt250":0}
  WARM undefined
  STEADY {"frames":682,"spanMs":4994,"meanFps":136.4,"meanMs":7.33,"p50":6.1,"p95":12.1,"p99":12.2,"max":12.4,"gt50":0,"gt100":0,"gt250":0}
  windows15s undefined
  peakEnt 4 peakAlive undefined timer {"samples":962,"maxGap":23.9,"gt50":0,"gt100":0} stateCostMs undefined longTasks n=0 top=[]
E14 VFX {"tick":6540,"scene":"camp","phase":"idle","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":3,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":267,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":456,"heapMB":67.3,"renderer":{"programs":57,"geometries":1074,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1119,"meshes":892,"pts":6,"sprites":73,"lights":6,"uniqGeo":687,"uniqMat":482},"tag":"after-run-3+14s","events":["run_end t2029","return_to_camp t2039","run_end t3526","return_to_camp t3538","run_end t5078","return_to_camp t5090"]}

#### digest certD1-q-gpu  levels={"debug":2,"warn":10,"GOTO":1,"EVAL":4,"DEBUG-API":1}
[GOTO] 23507 ms, 107 requests, last request at 3927 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":9}
E0: "lib 0.4.16 t1227 vw1600x900 poErr=none"
E1: {"tick":1228,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:49:39.250Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"renderer":"ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)","vendor":"Google Inc. (AMD)","version":"WebGL 2.0 (OpenGL ES 3.0 Chromium)","canvas":[1600,900],"dpr":1,"maxTex":16384,"threeRenderer":{"isWebGL2":true,"precision":"highp","maxSamples":8},"pixelRatio":1,"rendererSize":[1600,900],"tick":1228,"fps":163.9,"ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessC"}
E3: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"164 fps","x":1532.1875,"y":8,"w":57.8125,"h":23},"apiVersion":"0.4.16"}

#### digest certD1-q-stress40  levels={"debug":2,"warn":479,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 36062 ms, 107 requests, last request at 4199 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":478}
E0: "lib 0.4.16 t1967 vw1600x900 poErr=none"
E1: {"tick":1967,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-06T14:50:20.164Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":1}
E3: {"ok":true,"tick":2017,"waitedTicks":49,"ms":681}
E4: {"before":5,"spawned":35,"after":40,"tick":2017}
E5 SAMPLE tick 2064->3228 (1164 sim ticks) tag=
  ALL {"frames":2093,"spanMs":19940,"meanFps":104.9,"meanMs":9.53,"p50":12,"p95":12.2,"p99":18.2,"max":66.5,"gt50":2,"gt100":0,"gt250":0}
  WARM {"frames":251,"spanMs":2933,"meanFps":85.2,"meanMs":11.73,"p50":12.1,"p95":18,"p99":24,"max":24.2,"gt50":0,"gt100":0,"gt250":0}
  STEADY {"frames":1842,"spanMs":16994,"meanFps":108.3,"meanMs":9.23,"p50":6.3,"p95":12.2,"p99":18.2,"max":66.5,"gt50":2,"gt100":0,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":0,"max":66.5,"meanFps":106.5}]
  peakEnt 51 peakAlive {"n":40,"tick":2128} timer {"samples":1600,"maxGap":48.2,"gt50":0,"gt100":0} stateCostMs {"max":2.2,"mean":1.08} longTasks n=0 top=[]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:82.6/50/39/39/0/5/1/-/58.2/none 1:82.6/47/38/38/0/1/2/-/58.6/none 2:82.6/49/38/38/1/2/3/-/62.9/none 3:82.6/49/40/40/1/1/2/-/60.8/none 4:82.6/47/37/37/1/1/2/-/69.4/none 5:82.6/48/39/39/1/0/2/-/66.7/none 6:82.6/46/39/39/1/0/1/-/75.4/none 7:82.6/42/37/37/1/0/0/-/48.6/none 8:82.6/43/38/38/1/0/0/-/77.9/none 9:158.7/4/0/0/0/0/0/-/54.5/end 10:163.9/4/0/0/0/0/0/-/71.6/end 11:161.3/4/0/0/0/0/0/-/63.5/end 12:161.3/4/0/0/0/0/0/-/54.4/end 13:163.9/4/0/0/0/0/0/-/69.9/end 14:163.9/4/0/0/0/0/0/-/61.7/end 15:161.3/4/0/0/0/0/0/-/51.2/end 16:161.3/4/0/0/0/0/0/-/67.1/end 17:163.9/4/0/0/0/0/0/-/59.1/end 18:161.3/4/0/0/0/0/0/-/75.6/end 19:163.9/4/0/0/0/0/0/-/66.7/end 20:163.9/4/0/0/0/0/0/-/58.2/end
  events {"waves":[[1967,0,5]],"spawns":67,"deaths":27,"despawns":40,"hitstops":22,"cleared":[],"downed":[[2370,3],[2371,3],[2438,2],[2439,2],[2491,0],[2492,0],[2519,1]],"revive":[[2519,null],[2519,null],[2519,null],[2519,null]],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[2519]}
  party [[0,100,false],[1,150,false],[2,95,false],[3,80,false]]
  phase "defeat"
  topUps 27
  firstSpawn "{\"tick\":2015,\"type\":\"enemy_spawn\",\"id\":4,\"etype\":\"boar\",\"x\":-9.89,\"z\":-4.06,\"wave\":0}"
E6 VFX {"tick":3229,"scene":"camp","phase":"defeat","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"camp","runs":1,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{},"bandGuardMaterials":258,"numeralNodes":12,"threatNodes":0,"fizzleNodes":0,"domNodes":299,"heapMB":58.2,"renderer":{"programs":62,"geometries":1002,"textures":46,"calls":1,"tris":1},"sceneGraph":{"objs":1100,"meshes":879,"pts":6,"sprites":67,"lights":6,"uniqGeo":687,"uniqMat":463},"tag":"after-stress40"}
#### digest certD1-q-geoleak (per-enemy geometry retention)
{"tag":"room-live","tick":1688,"ents":9,"enemies":5,"geo":697,"tex":41,"prog":56,"sgObjs":1222,"sgMeshes":962,"sgSprites":66,"uniqGeo":710,"uniqMat":490,"decals":0,"particles":0,"numerals":0,"heap":48.8}
{"tag":"after-natural-kill","tick":1833,"ents":8,"enemies":2,"geo":718,"tex":42,"prog":57,"sgObjs":1168,"sgMeshes":905,"sgSprites":89,"uniqGeo":716,"uniqMat":490,"decals":6,"particles":0,"numerals":1,"heap":50}
{"tag":"batch0-boar-spawned(10)","tick":1864,"ents":18,"enemies":12,"geo":749,"tex":42,"prog":57,"sgObjs":1478,"sgMeshes":1125,"sgSprites":99,"uniqGeo":746,"uniqMat":610,"decals":6,"particles":0,"numerals":0,"heap":57.9}
{"tag":"batch0-boar-killed","tick":2008,"ents":11,"enemies":4,"geo":777,"tex":42,"prog":57,"sgObjs":1316,"sgMeshes":984,"sgSprites":131,"uniqGeo":727,"uniqMat":579,"decals":19,"particles":12,"numerals":1,"heap":54.7}
{"tag":"batch1-mantis-spawned(10)","tick":2039,"ents":20,"enemies":14,"geo":798,"tex":42,"prog":57,"sgObjs":1550,"sgMeshes":1149,"sgSprites":109,"uniqGeo":763,"uniqMat":633,"decals":19,"particles":0,"numerals":1,"heap":48.7}
{"tag":"batch1-mantis-killed","tick":2186,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1100,"sgMeshes":885,"sgSprites":61,"uniqGeo":687,"uniqMat":463,"decals":33,"particles":0,"numerals":0,"heap":55}
{"tag":"batch2-boar-spawned(0)","tick":2216,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1100,"sgMeshes":885,"sgSprites":61,"uniqGeo":687,"uniqMat":463,"decals":33,"particles":0,"numerals":0,"heap":50.8}
{"tag":"batch2-boar-killed","tick":2366,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1100,"sgMeshes":885,"sgSprites":61,"uniqGeo":687,"uniqMat":463,"decals":33,"particles":0,"numerals":0,"heap":54}
{"tag":"batch3-mantis-spawned(0)","tick":2396,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1100,"sgMeshes":885,"sgSprites":61,"uniqGeo":687,"uniqMat":463,"decals":33,"particles":0,"numerals":0,"heap":50}
{"tag":"batch3-mantis-killed","tick":2547,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1100,"sgMeshes":885,"sgSprites":61,"uniqGeo":687,"uniqMat":463,"decals":33,"particles":0,"numerals":0,"heap":53.9}
{"tag":"+22s-decals-expired","tick":3867,"ents":4,"enemies":0,"geo":801,"tex":42,"prog":57,"sgObjs":1067,"sgMeshes":852,"sgSprites":61,"uniqGeo":686,"uniqMat":430,"decals":0,"particles":0,"numerals":0,"heap":64.8}
{"phase":"reward","screen":"draft","spawns":33,"deaths":33,"despawns":0,"cleared":[2040]}


---

## Audit gap re-run (5th instance, 2026-09-08, prefix certD1-b-)

Gap: the 236.2 ms room-clear -> reward-screen first frame in certD1-q-clear was sampled once and never re-run alone. Plan: re-run tools/actions/certD1-n-clear.json twice and certD1-n-wave2.json twice, each ALONE (contention check before each), apply the 250 ms gate to the reward/path first frame.

### Machine state before re-run

(see "Re-run conditions" below; the per-run digests follow, then the tables)

#### digest certD1-b-clear1  levels={"debug":2,"warn":255,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 13878 ms, 107 requests, last request at 3823 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":254}
E0: "lib 0.4.16 t518 vw1600x900 poErr=none"
E1: {"tick":518,"fps":55.6,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-08T12:10:42.359Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":1,"tick":520}
E3 SAMPLE tick 535->3867 (3332 sim ticks) tag=
  ALL {"frames":4709,"spanMs":56813,"meanFps":82.9,"meanMs":12.07,"p50":12.1,"p95":24.1,"p99":30.4,"max":212,"gt50":12,"gt100":2,"gt250":0}
  WARM {"frames":140,"spanMs":2794,"meanFps":49.8,"meanMs":20.1,"p50":18.1,"p95":42.3,"p99":72.8,"max":163.7,"gt50":5,"gt100":1,"gt250":0}
  STEADY {"frames":4569,"spanMs":53994,"meanFps":84.6,"meanMs":11.82,"p50":12.1,"p95":18.5,"p99":30.3,"max":212,"gt50":7,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":212,"meanFps":55.1},{"from":8000,"to":23000,"gt100":1,"max":212,"meanFps":70},{"from":13000,"to":28000,"gt100":1,"max":212,"meanFps":82.6},{"from":18000,"to":33000,"gt100":0,"max":24.4,"meanFps":96.5},{"from":23000,"to":38000,"gt100":0,"max":42.3,"meanFps":94},{"from":28000,"to":43000,"gt100":0,"max":42.3,"meanFps":95.7},{"from":33000,"to":48000,"gt100":0,"max":42.3,"meanFps":96},{"from":38000,"to":53000,"gt100":0,"max":30.3,"meanFps":97.6}]
  peakEnt 19 peakAlive {"n":5,"tick":568} timer {"samples":4519,"maxGap":72.4,"gt50":5,"gt100":0} stateCostMs {"max":2.8,"mean":1.23} longTasks n=4 top=[{"at":16910,"dur":229},{"at":17156,"dur":127},{"at":17709,"dur":67},{"at":33845,"dur":57}]
  GAP 163.7 ms @2340 ms tick 680 screen none phase combat timerMaxGap 25.8 ents 17 alive 4 heap 60->48.2 geo 720 ring[-3..] ["666:sound","666:hitstop","666:death/boar#8","666:sound"]
  GAP 212 ms @16837 ms tick 1521 screen path phase path timerMaxGap 70.6 ents 4 alive 0 heap 45.3->45.9 geo 849 ring[-3..] ["1507:reward_offer#guardian_bond","1508:skill_equip","1508:draft_taken#guardian_bond","1508:path_offer"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:55.6/5/0/0/0/0/0/-/46.1/none 1:55.2/11/5/5/0/0/0/-/49.8/none 2:55.2/18/5/5/0/5/2/-/55.7/none 3:55.2/13/4/4/0/1/2/-/60.2/none 4:54.9/14/3/3/0/2/3/-/51.9/none 5:54.9/10/1/1/0/1/2/-/53.3/none 6:54.9/10/3/3/0/0/1/-/57.8/none 7:54.9/14/3/3/0/4/1/-/57.8/none 8:55.2/10/2/2/0/1/1/-/58.8/none 9:55.2/11/1/1/0/3/1/-/57.6/none 10:55.2/10/0/0/1/2/1/-/62.8/none 11:55.2/12/5/5/0/0/1/-/53.3/none 12:54.9/13/5/5/0/1/1/-/53.8/none 13:54.9/11/4/4/0/1/0/-/54.1/none 14:54.9/11/4/4/0/1/0/-/44.2/none 15:55.2/14/4/4/1/2/1/-/45.5/none 16:81.3/11/1/1/0/2/2/-/49.3/none 17:55.2/4/0/0/0/0/0/-/46.7/path 18:54.9/6/0/0/0/0/0/-/53.8/none 19:82.6/15/4/4/0/5/0/-/56.7/none 20:84/10/3/3/0/1/0/-/47.5/none 21:82.6/11/3/3/0/2/0/-/50.1/none 22:83.3/11/2/2/0/3/0/-/55.9/none 23:83.3/11/2/2/1/1/1/-/45.8/none 24:83.3/15/1/1/1/5/2/-/70.4/none 25:83.3/9/0/0/0/1/2/-/69/none 26:82.6/14/4/4/0/2/2/-/62.2/none 27:82.6/10/3/3/0/1/0/-/54.1/none 28:82.6/10/2/2/0/1/1/-/73.1/none 29:82.6/14/2/2/0/5/1/-/61.5/none 30:82.6/9/1/1/0/1/1/-/48.3/none 31:82.6/10/3/3/0/0/1/-/66.7/none 32:82.6/13/3/3/0/2/2/-/55.7/none 33:85.5/9/2/2/0/0/1/-/51.8/none 34:161.3/13/2/2/0/4/1/-/74.1/none 35:82.6/12/1/1/0/3/2/-/66.4/none 36:82.6/5/0/0/0/0/0/-/54.3/none 37:82.6/10/4/4/0/0/0/-/72.9/none 38:82.6/11/3/3/0/2/0/-/66.7/none 39:83.3/10/1/1/0/3/0/-/61.5/none 40:83.3/10/1/1/0/2/1/-/56.9/none 41:83.3/9/0/0/1/1/1/-/52.4/none 42:83.3/13/3/3/1/2/1/-/76.3/none 43:83.3/9/2/2/0/1/0/-/71.4/none 44:83.3/12/1/1/0/4/1/-/69.7/none 45:82.6/10/1/1/0/2/1/-/63.2/none 46:82.6/8/0/0/0/1/1/-/60.8/none 47:83.3/11/4/4/0/0/1/-/59.1/none 48:82.6/15/3/3/0/5/1/-/56.1/none 49:82.6/11/3/3/0/1/1/-/79/none 50:83.3/12/2/2/1/1/2/-/77/none 51:83.3/13/2/2/1/3/1/-/47.6/none 52:83.3/11/1/1/1/2/1/-/71.5/none 53:82.6/4/0/0/0/0/0/-/47.8/draft 54:82.6/4/0/0/0/0/0/-/61.7/draft 55:82.6/4/0/0/0/0/0/-/50.2/draft 56:82.6/4/0/0/0/0/0/-/64.4/draft 57:82.6/4/0/0/0/0/0/-/53.2/draft
  events {"waves":[[520,0,5],[842,1,3],[1125,2,5],[1560,0,4],[1965,1,4],[2293,2,3],[2631,0,4],[2899,1,3],[3183,2,4]],"spawns":35,"deaths":35,"despawns":0,"hitstops":34,"cleared":[1507,2589,3616],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,90,false],[1,150,false],[2,88,false],[3,76,false]]
  phase "reward"
  room 3
  screen "draft"
  driver ["draftTake t1508","pathChoose t1542","draftTake t2589","pathChoose t2613"]
  clearsSeen 3
  firstSpawn "{\"tick\":568,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"boar\",\"x\":-9.89,\"z\":-4.06,\"wave\":0}"
E4: {"screen":"draft","phase":"reward","n":2,"rs":[{"l":"canvas#0","tag":"CANVAS","id":"","cls":"","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"all","willChange":"auto"},{"l":"run-screen","tag":"DIV","id":"run-screen","cls":"rn-compact rn-open","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"opacity 0.22s","willChange":"auto"}]}
E5 VFX {"tick":3869,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":1,"decals":11,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":296,"heapMB":61.4,"renderer":{"programs":58,"geometries":1150,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1094,"meshes":864,"pts":6,"sprites":76,"lights":6,"uniqGeo":688,"uniqMat":457},"tag":"after-clear"}

#### digest certD1-b-clear2  levels={"debug":2,"warn":227,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 27617 ms, 107 requests, last request at 2635 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":226}
E0: "lib 0.4.16 t1535 vw1600x900 poErr=none"
E1: {"tick":1536,"fps":83.3,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-08T12:12:37.970Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":1,"tick":1537}
E3 SAMPLE tick 1546->4120 (2574 sim ticks) tag=
  ALL {"frames":4654,"spanMs":43898,"meanFps":106,"meanMs":9.43,"p50":6.3,"p95":12.3,"p99":18.3,"max":224.1,"gt50":5,"gt100":4,"gt250":0}
  WARM {"frames":238,"spanMs":2885,"meanFps":82.1,"meanMs":12.17,"p50":12.1,"p95":18.3,"p99":48.5,"max":109,"gt50":2,"gt100":1,"gt250":0}
  STEADY {"frames":4416,"spanMs":41000,"meanFps":107.7,"meanMs":9.29,"p50":6.3,"p95":12.3,"p99":18.3,"max":224.1,"gt50":3,"gt100":3,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":103.1,"meanFps":94.3},{"from":8000,"to":23000,"gt100":1,"max":103.1,"meanFps":101.9},{"from":13000,"to":28000,"gt100":1,"max":103.1,"meanFps":111.5},{"from":18000,"to":33000,"gt100":0,"max":30.4,"meanFps":118},{"from":23000,"to":38000,"gt100":0,"max":30.4,"meanFps":120.1},{"from":28000,"to":43000,"gt100":2,"max":224.1,"meanFps":116.4}]
  peakEnt 19 peakAlive {"n":5,"tick":1585} timer {"samples":3227,"maxGap":60.6,"gt50":2,"gt100":0} stateCostMs {"max":2.1,"mean":1.04} longTasks n=3 top=[{"at":30656,"dur":140},{"at":30812,"dur":66},{"at":31440,"dur":50}]
  GAP 109 ms @2341 ms tick 1689 screen none phase combat timerMaxGap 17.5 ents 17 alive 4 heap 52.2->54 geo 720 ring[-3..] ["1683:sound","1683:hitstop","1683:death/boar#8","1683:sound"]
  GAP 103.1 ms @16432 ms tick 2508 screen path phase path timerMaxGap 16.2 ents 4 alive 0 heap 53.9->54.5 geo 847 ring[-3..] ["2503:reward_offer#sanctuary","2503:skill_equip","2503:draft_taken#sanctuary","2503:path_offer"]
  GAP 115.1 ms @39711 ms tick 3862 screen draft phase reward timerMaxGap 16.1 ents 4 alive 0 heap 58.7->59.2 geo 1042 ring[-3..] ["3855:projectile_despawn#213","3855:heal_override","3855:glint_gain","3855:reward_offer#ascend"]
  GAP 224.1 ms @40202 ms tick 3891 screen draft phase reward timerMaxGap 16.6 ents 4 alive 0 heap 62.6->63 geo 1042 ring[-3..] ["3855:projectile_despawn#213","3855:heal_override","3855:glint_gain","3855:reward_offer#ascend"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:83.3/5/0/0/0/0/0/-/50.7/none 1:82.6/11/5/5/0/0/0/-/48.1/none 2:82.6/18/5/5/0/5/2/-/59.3/none 3:82.6/14/4/4/0/2/2/-/58.6/none 4:82.6/13/3/3/0/2/3/-/59.1/none 5:82.6/12/2/2/0/2/2/-/58.7/none 6:82.6/8/0/0/0/0/2/-/53.2/none 7:82.6/14/3/3/0/4/1/-/61.8/none 8:82.6/10/2/2/0/1/1/-/56.7/none 9:82.6/9/1/1/0/2/0/-/62/none 10:82.6/9/0/0/1/1/1/-/57.1/none 11:82.6/12/5/5/0/0/1/-/65.2/none 12:82.6/17/5/5/0/5/1/-/55.5/none 13:82.6/11/4/4/0/1/0/-/62.3/none 14:84/14/4/4/1/2/1/-/66.4/none 15:161.3/12/3/3/0/2/1/-/66/none 16:161.3/10/1/1/0/2/1/-/61/none 17:161.3/5/0/0/0/0/0/-/60.6/none 18:83.3/11/5/5/0/0/0/-/64.5/none 19:163.9/12/5/5/0/1/0/-/54.8/none 20:83.3/16/4/4/1/5/0/-/78.4/none 21:163.9/10/3/3/1/0/0/-/73.4/none 22:161.3/8/1/1/0/1/0/-/63.4/none 23:163.9/10/4/4/0/0/0/-/86.7/none 24:163.9/16/4/4/0/5/1/-/77.8/none 25:161.3/11/1/1/0/1/3/-/49.1/none 26:83.3/10/1/1/0/0/3/-/74.1/none 27:161.3/4/0/0/0/0/0/-/67.6/path 28:163.9/6/0/0/0/0/0/-/58.5/none 29:163.9/15/4/4/0/5/0/-/53.7/none 30:163.9/10/3/3/0/1/0/-/47.1/none 31:163.9/12/3/3/0/2/1/-/70.7/none 32:163.9/12/2/2/1/2/1/-/68.7/none 33:91.7/10/1/1/0/2/1/-/60.8/none 34:82.6/14/1/1/0/5/2/-/54.1/none 35:163.9/7/0/0/0/0/1/-/49.7/none 36:163.9/12/5/5/0/0/1/-/77.9/none 37:163.9/13/4/4/0/2/1/-/74.5/none 38:163.9/11/3/3/0/2/1/-/72.1/none 39:161.3/15/2/2/0/6/2/-/72.8/none 40:161.3/4/0/0/0/0/0/-/63/draft 41:158.7/4/0/0/0/0/0/-/73.7/draft 42:83.3/4/0/0/0/0/0/-/61.2/draft 43:156.2/4/0/0/0/0/0/-/74.3/draft 44:161.3/4/0/0/0/0/0/-/62.6/draft
  events {"waves":[[1537,0,5],[1859,1,3],[2121,2,5],[2548,0,5],[2838,1,4],[3152,0,4],[3550,1,5]],"spawns":31,"deaths":31,"despawns":0,"hitstops":28,"cleared":[2503,3099,3855],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,140,false],[2,85,false],[3,70,false]]
  phase "reward"
  room 3
  screen "draft"
  driver ["draftTake t2503","pathChoose t2530","draftTake t3110","pathChoose t3134"]
  clearsSeen 3
  firstSpawn "{\"tick\":1585,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"boar\",\"x\":-9.89,\"z\":-4.06,\"wave\":0}"
E4: {"screen":"draft","phase":"reward","n":2,"rs":[{"l":"canvas#0","tag":"CANVAS","id":"","cls":"","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"all","willChange":"auto"},{"l":"run-screen","tag":"DIV","id":"run-screen","cls":"rn-compact rn-open","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"opacity 0.22s","willChange":"auto"}]}
E5 VFX {"tick":4122,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":13,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":6,"threatNodes":0,"fizzleNodes":0,"domNodes":295,"heapMB":69.6,"renderer":{"programs":58,"geometries":1042,"textures":44,"calls":1,"tris":1},"sceneGraph":{"objs":1080,"meshes":865,"pts":6,"sprites":61,"lights":6,"uniqGeo":687,"uniqMat":443},"tag":"after-clear"}

#### digest certD1-b-wave2a  levels={"debug":2,"warn":73,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 20759 ms, 107 requests, last request at 2253 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":72}
E0: "lib 0.4.16 t1151 vw1600x900 poErr=none"
E1: {"tick":1151,"fps":163.9,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-08T12:14:41.748Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"modes":["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"],"room":1}
E3: {"skip":{"room":2,"phase":"combat","mode":"kill_all"},"roomState":{"mode":"kill_all","cleared":false,"softFailed":false,"waveIndex":0,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":4,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null},"tick":1171,"party":[[0,100,0,0],[1,150,-1.9,-1],[2,95,1.8,-1.3],[3,80,-0.3,-2.2]]}
E4 SAMPLE tick 1174->2654 (1480 sim ticks) tag=
  ALL {"frames":2980,"spanMs":25000,"meanFps":119.2,"meanMs":8.39,"p50":6.2,"p95":12.2,"p99":12.4,"max":163.7,"gt50":2,"gt100":1,"gt250":0}
  WARM {"frames":343,"spanMs":2994,"meanFps":114.2,"meanMs":8.75,"p50":6.1,"p95":12.2,"p99":30.3,"max":97,"gt50":1,"gt100":0,"gt250":0}
  STEADY {"frames":2637,"spanMs":22000,"meanFps":119.8,"meanMs":8.35,"p50":6.2,"p95":12.2,"p99":12.4,"max":163.7,"gt50":1,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":163.7,"meanFps":118.7},{"from":8000,"to":23000,"gt100":1,"max":163.7,"meanFps":120.3}]
  peakEnt 18 peakAlive {"n":5,"tick":1479} timer {"samples":2364,"maxGap":42.2,"gt50":0,"gt100":0} stateCostMs {"max":3.3,"mean":1.14} longTasks n=0 top=[]
  GAP 163.7 ms @11453 ms tick 1841 screen draft phase reward timerMaxGap 16.1 ents 4 alive 0 heap 54->55 geo 813 ring[-3..] ["1829:projectile_despawn#68","1829:heal_override","1829:glint_gain","1829:reward_offer#restorative_wave"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:161.3/5/0/0/0/0/0/-/52.5/none 1:161.3/11/4/4/0/1/0/-/54.4/none 2:161.3/14/3/3/0/4/1/-/48.4/none 3:163.9/10/2/2/1/1/1/-/52.2/none 4:163.9/11/1/1/1/2/1/-/49.1/none 5:163.9/9/0/0/0/2/1/-/52.8/none 6:83.3/12/5/5/0/0/1/-/51/none 7:161.3/18/5/5/0/5/2/-/49.5/none 8:161.3/13/2/2/1/2/2/-/52.4/none 9:163.9/9/2/2/0/0/1/-/48.2/none 10:163.9/11/2/2/0/1/2/-/47/none 11:163.9/11/0/0/1/2/2/-/61.5/none 12:163.9/4/0/0/0/0/0/-/50.9/draft 13:161.3/4/0/0/0/0/0/-/52.9/draft 14:84/4/0/0/0/0/0/-/53.4/draft 15:163.9/4/0/0/0/0/0/-/56/draft 16:161.3/4/0/0/0/0/0/-/59.4/draft 17:163.9/4/0/0/0/0/0/-/48.7/draft 18:158.7/4/0/0/0/0/0/-/50/draft 19:163.9/4/0/0/0/0/0/-/52/draft 20:163.9/4/0/0/0/0/0/-/48.9/draft 21:161.3/4/0/0/0/0/0/-/50.6/draft 22:84/4/0/0/0/0/0/-/50.2/draft 23:163.9/4/0/0/0/0/0/-/53.2/draft 24:161.3/4/0/0/0/0/0/-/55.4/draft 25:161.3/4/0/0/0/0/0/-/45.3/draft
  events {"waves":[[1152,0,5],[1171,0,4],[1431,1,5]],"spawns":9,"deaths":9,"despawns":0,"hitstops":9,"cleared":[1171,1829],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,140,false],[2,95,false],[3,70,false]]
  phase "reward"
  roomState {"mode":"kill_all","cleared":true,"softFailed":false,"waveIndex":1,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":0,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null}
  firstSpawn "{\"tick\":1219,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"mantis\",\"x\":5.66,\"z\":-6.1,\"wave\":0}"
E5: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"161 fps","x":1532.1875,"y":8,"w":57.8125,"h":23},"apiVersion":"0.4.16"}
E6 VFX {"tick":2656,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":5,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":3,"threatNodes":0,"fizzleNodes":0,"domNodes":296,"heapMB":45.3,"renderer":{"programs":58,"geometries":813,"textures":44,"calls":1,"tris":1},"sceneGraph":{"objs":1072,"meshes":857,"pts":6,"sprites":61,"lights":6,"uniqGeo":687,"uniqMat":435},"tag":"after-certD1-n-wave2"}

#### digest certD1-b-clear3  levels={"debug":2,"warn":255,"GOTO":1,"EVAL":6,"DEBUG-API":1}
[GOTO] 33965 ms, 107 requests, last request at 2561 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":254}
E0: "lib 0.4.16 t1910 vw1600x900 poErr=none"
E1: {"tick":1910,"fps":161.3,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-08T12:16:35.699Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"room":1,"tick":1910}
E3 SAMPLE tick 1920->5249 (3329 sim ticks) tag=
  ALL {"frames":6137,"spanMs":56898,"meanFps":107.8,"meanMs":9.27,"p50":6.3,"p95":12.5,"p99":18.5,"max":115,"gt50":3,"gt100":2,"gt250":0}
  WARM {"frames":275,"spanMs":2885,"meanFps":95,"meanMs":10.53,"p50":11.9,"p95":18.3,"p99":42.7,"max":103.5,"gt50":2,"gt100":1,"gt250":0}
  STEADY {"frames":5862,"spanMs":54001,"meanFps":108.5,"meanMs":9.21,"p50":6.3,"p95":12.5,"p99":18.5,"max":115,"gt50":1,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":115,"meanFps":108.2},{"from":8000,"to":23000,"gt100":1,"max":115,"meanFps":106.5},{"from":13000,"to":28000,"gt100":1,"max":115,"meanFps":100.5},{"from":18000,"to":33000,"gt100":0,"max":30.1,"meanFps":99.3},{"from":23000,"to":38000,"gt100":0,"max":42.5,"meanFps":101.1},{"from":28000,"to":43000,"gt100":0,"max":42.5,"meanFps":110.6},{"from":33000,"to":48000,"gt100":0,"max":42.5,"meanFps":114.7},{"from":38000,"to":53000,"gt100":0,"max":30.7,"meanFps":115.9}]
  peakEnt 19 peakAlive {"n":5,"tick":1958} timer {"samples":3831,"maxGap":58.6,"gt50":2,"gt100":0} stateCostMs {"max":2.4,"mean":0.99} longTasks n=1 top=[{"at":37152,"dur":64}]
  GAP 103.5 ms @2390 ms tick 2065 screen none phase combat timerMaxGap 19 ents 17 alive 4 heap 51.2->52.9 geo 720 ring[-3..] ["2056:sound","2056:hitstop","2056:death/boar#8","2056:sound"]
  GAP 115 ms @16832 ms tick 2903 screen path phase path timerMaxGap 18.2 ents 4 alive 0 heap 66.9->54.7 geo 849 ring[-3..] ["2897:reward_offer#guardian_bond","2897:skill_equip","2897:draft_taken#guardian_bond","2897:path_offer"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:161.3/5/0/0/0/0/0/-/45.9/none 1:84.7/11/5/5/0/0/0/-/57.8/none 2:84.7/18/5/5/0/5/2/-/55.7/none 3:83.3/14/4/4/0/2/2/-/56.5/none 4:83.3/13/3/3/0/2/3/-/58/none 5:161.3/12/2/2/0/2/2/-/60.7/none 6:161.3/8/0/0/0/0/2/-/59.9/none 7:161.3/14/3/3/0/4/1/-/55.1/none 8:161.3/10/2/2/0/1/1/-/64.3/none 9:163.9/9/1/1/0/2/0/-/56.9/none 10:161.3/11/1/1/1/2/1/-/53.8/none 11:161.3/12/5/5/0/0/1/-/64.9/none 12:83.3/12/5/5/0/0/1/-/53.1/none 13:85.5/15/4/4/0/5/0/-/61.3/none 14:163.9/12/4/4/0/2/0/-/54.8/none 15:161.3/14/4/4/1/2/1/-/63.7/none 16:85.5/12/1/1/0/3/2/-/61/none 17:161.3/4/0/0/0/0/0/-/55.8/path 18:156.2/6/0/0/0/0/0/-/56.4/none 19:86.2/15/4/4/0/5/0/-/60.9/none 20:83.3/10/3/3/0/1/0/-/66.2/none 21:84.7/11/3/3/0/2/0/-/67.7/none 22:84.7/11/2/2/0/3/0/-/56/none 23:87.7/11/2/2/1/1/1/-/61.8/none 24:84.7/15/1/1/1/5/2/-/70.2/none 25:83.3/9/0/0/0/1/2/-/48/none 26:83.3/14/4/4/0/2/2/-/47.5/none 27:82.6/10/3/3/0/1/0/-/65.1/none 28:82.6/9/2/2/0/1/1/-/53.7/none 29:161.3/13/2/2/0/5/1/-/47.9/none 30:84/9/1/1/0/1/1/-/71/none 31:83.3/7/0/0/0/0/1/-/60.8/none 32:83.3/13/3/3/0/2/2/-/56.9/none 33:161.3/10/2/2/0/1/1/-/56.8/none 34:163.9/13/2/2/0/4/1/-/78.9/none 35:161.3/13/1/1/0/3/3/-/76.6/none 36:83.3/4/0/0/0/0/0/-/62.6/none 37:163.9/5/0/0/0/0/0/-/55.6/none 38:158.7/12/4/4/0/3/0/-/55.2/none 39:163.9/11/2/2/0/3/0/-/52.5/none 40:163.9/9/1/1/0/1/1/-/51.8/none 41:163.9/8/0/0/0/1/1/-/54.9/none 42:163.9/12/3/3/0/2/1/-/55.4/none 43:161.3/9/2/2/0/1/0/-/52/none 44:158.7/12/1/1/0/4/1/-/75.1/none 45:163.9/9/1/1/0/1/1/-/69/none 46:161.3/8/0/0/0/1/1/-/65.2/none 47:161.3/11/4/4/0/0/1/-/61.8/none 48:163.9/16/4/4/0/5/1/-/63.2/none 49:161.3/11/3/3/0/1/1/-/60.3/none 50:163.9/12/2/2/1/1/2/-/60.9/none 51:163.9/11/2/2/1/1/1/-/57.6/none 52:83.3/8/0/0/1/1/1/-/51.2/none 53:161.3/4/0/0/0/0/0/-/68.5/draft 54:161.3/4/0/0/0/0/0/-/59.7/draft 55:142.9/4/0/0/0/0/0/-/50.4/draft 56:161.3/4/0/0/0/0/0/-/67.9/draft 57:161.3/4/0/0/0/0/0/-/58.9/draft
  events {"waves":[[1910,0,5],[2232,1,3],[2515,2,5],[2943,0,4],[3355,1,4],[3683,2,3],[4038,0,4],[4296,1,3],[4576,2,4]],"spawns":35,"deaths":35,"despawns":0,"hitstops":34,"cleared":[2897,3978,4954],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,150,false],[2,81,false],[3,76,false]]
  phase "reward"
  room 3
  screen "draft"
  driver ["draftTake t2897","pathChoose t2925","draftTake t3996","pathChoose t4020"]
  clearsSeen 3
  firstSpawn "{\"tick\":1958,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"boar\",\"x\":-9.89,\"z\":-4.06,\"wave\":0}"
E4: {"screen":"draft","phase":"reward","n":2,"rs":[{"l":"canvas#0","tag":"CANVAS","id":"","cls":"","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"all","willChange":"auto"},{"l":"run-screen","tag":"DIV","id":"run-screen","cls":"rn-compact rn-open","x":0,"y":0,"w":1600,"h":900,"filter":"none","backdrop":"none","blend":"normal","shadow":"none","opacity":"1","transition":"opacity 0.22s","willChange":"auto"}]}
E5 VFX {"tick":5252,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":11,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":5,"threatNodes":0,"fizzleNodes":0,"domNodes":295,"heapMB":69.1,"renderer":{"programs":58,"geometries":1135,"textures":45,"calls":1,"tris":1},"sceneGraph":{"objs":1081,"meshes":863,"pts":6,"sprites":64,"lights":6,"uniqGeo":687,"uniqMat":444},"tag":"after-clear"}

#### digest certD1-b-wave2b  levels={"debug":2,"warn":73,"GOTO":1,"EVAL":7,"DEBUG-API":1}
[GOTO] 41132 ms, 107 requests, last request at 2422 ms
warn kinds: {"THREE.WebGLProgram: Program Info Log: (#,#-#): warning X#: gradien":1,"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial":72}
E0: "lib 0.4.16 t2343 vw1600x900 poErr=none"
E1: {"tick":2343,"fps":161.3,"ents":4,"scene":"camp","hwConcurrency":16,"now":"2026-09-08T12:18:45.301Z","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
E2: {"seed":999,"modes":["kill_all","kill_all","kill_all","defend","kill_all","defend","shop","boss"],"room":1}
E3: {"skip":{"room":2,"phase":"combat","mode":"kill_all"},"roomState":{"mode":"kill_all","cleared":false,"softFailed":false,"waveIndex":0,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":4,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null},"tick":2363,"party":[[0,100,0,0],[1,150,-1.9,-1],[2,95,1.8,-1.3],[3,80,-0.3,-2.2]]}
E4 SAMPLE tick 2365->3845 (1480 sim ticks) tag=
  ALL {"frames":2679,"spanMs":25007,"meanFps":107.1,"meanMs":9.34,"p50":6.3,"p95":12.4,"p99":18.5,"max":175.8,"gt50":4,"gt100":2,"gt250":0}
  WARM {"frames":294,"spanMs":2994,"meanFps":97.9,"meanMs":10.22,"p50":11.8,"p95":18.2,"p99":42.3,"max":109.1,"gt50":2,"gt100":1,"gt250":0}
  STEADY {"frames":2385,"spanMs":22000,"meanFps":108.4,"meanMs":9.23,"p50":6.3,"p95":12.4,"p99":18.4,"max":175.8,"gt50":2,"gt100":1,"gt250":0}
  windows15s [{"from":3000,"to":18000,"gt100":1,"max":175.8,"meanFps":108.2},{"from":8000,"to":23000,"gt100":1,"max":175.8,"meanFps":108.7}]
  peakEnt 18 peakAlive {"n":5,"tick":2671} timer {"samples":1934,"maxGap":51.4,"gt50":1,"gt100":0} stateCostMs {"max":1.6,"mean":0.98} longTasks n=0 top=[]
  GAP 109.1 ms @119 ms tick 2377 screen none phase combat timerMaxGap 16.4 ents 5 alive 0 heap 54.2->55.4 geo 682 ring[-3..] ["2363:spawn_telegraph","2365:projectile_spawn#4","2365:basic_fire","2365:sound"]
  GAP 175.8 ms @11495 ms tick 3034 screen draft phase reward timerMaxGap 16 ents 4 alive 0 heap 54.6->55.1 geo 813 ring[-3..] ["3021:projectile_despawn#68","3021:heal_override","3021:glint_gain","3021:reward_offer#restorative_wave"]
  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: 0:161.3/5/0/0/0/0/0/-/54.2/none 1:161.3/11/4/4/0/1/0/-/51.4/none 2:84/14/3/3/0/4/1/-/55.4/none 3:84/10/2/2/1/1/1/-/55.8/none 4:161.3/11/1/1/1/2/1/-/49.6/none 5:156.2/9/0/0/0/2/1/-/55.9/none 6:158.7/12/5/5/0/0/1/-/50.5/none 7:84/18/5/5/0/5/2/-/45.5/none 8:84/13/2/2/1/2/2/-/60/none 9:161.3/9/2/2/0/0/1/-/55.7/none 10:84.7/11/2/2/0/1/2/-/50/none 11:84/11/0/0/1/2/2/-/62.4/none 12:158.7/4/0/0/0/0/0/-/60.3/draft 13:158.7/4/0/0/0/0/0/-/48.6/draft 14:161.3/4/0/0/0/0/0/-/48.7/draft 15:158.7/4/0/0/0/0/0/-/49.5/draft 16:163.9/4/0/0/0/0/0/-/49.1/draft 17:158.7/4/0/0/0/0/0/-/50/draft 18:85.5/4/0/0/0/0/0/-/50.4/draft 19:84/4/0/0/0/0/0/-/50.3/draft 20:85.5/4/0/0/0/0/0/-/50/draft 21:158.7/4/0/0/0/0/0/-/50.2/draft 22:158.7/4/0/0/0/0/0/-/51.4/draft 23:158.7/4/0/0/0/0/0/-/52/draft 24:158.7/4/0/0/0/0/0/-/52.8/draft 25:158.7/4/0/0/0/0/0/-/51.5/draft
  events {"waves":[[2344,0,5],[2363,0,4],[2623,1,5]],"spawns":9,"deaths":9,"despawns":0,"hitstops":9,"cleared":[2363,3021],"downed":[],"revive":[],"quakeStart":[],"quakeResolve":[],"tramples":[],"adds":[],"bossDeath":[],"runEnd":[]}
  party [[0,100,false],[1,140,false],[2,95,false],[3,70,false]]
  phase "reward"
  roomState {"mode":"kill_all","cleared":true,"softFailed":false,"waveIndex":1,"wavesTotal":2,"waveSizes":[4,5],"pendingSpawns":0,"aliveEnemies":0,"defendTicksLeft":null,"waystone":null}
  firstSpawn "{\"tick\":2411,\"type\":\"enemy_spawn\",\"id\":6,\"etype\":\"mantis\",\"x\":5.66,\"z\":-6.1,\"wave\":0}"
E5: {"version":"0.4.16","text":"v0.4.16","x":10,"y":870,"w":52.8,"h":22,"right":62.8,"bottom":892,"fs":"12px","color":"rgb(244, 239, 230)","opacity":"0.85","display":"block","vis":"visible","vw":1600,"vh":900,"fpsMeter":{"text":"159 fps","x":1532.1875,"y":8,"w":57.8125,"h":23},"apiVersion":"0.4.16"}
E6 VFX {"tick":3847,"scene":"camp","phase":"reward","ents":4,"enemies":0,"eshots":0,"bolts":0,"zones":0,"azones":0,"vfxMode":"run","runs":0,"campEmitters":17,"campEmbers":130,"fireflies":150,"gateMotes":34,"campShadows":70,"arena":{"numerals":0,"decals":5,"particles":0,"dummies":0,"emitters":10,"embers":81,"propShadows":40,"smearGhosts":0},"bandGuardMaterials":258,"numeralNodes":3,"threatNodes":0,"fizzleNodes":0,"domNodes":296,"heapMB":55.6,"renderer":{"programs":58,"geometries":813,"textures":44,"calls":1,"tris":1},"sceneGraph":{"objs":1072,"meshes":857,"pts":6,"sprites":61,"lights":6,"uniqGeo":687,"uniqMat":435},"tag":"after-certD1-n-wave2"}

### Re-run conditions

Build unchanged: `src/version.js` VERSION '0.4.16', newest `src/**` mtime 2026-09-03 20:57 (same as the certified build). Dev server
127.0.0.1:5199 reused. Same renderer as before (ANGLE D3D11 on the AMD Radeon iGPU, 165 Hz quantised frames, `E.fps` 163.9 / 82.6 / 55.2).
Every capture below ran ALONE, sequentially, with a contention probe taken between runs (Get-Counter 3 x 1 s):

| taken | CPU avg | free RAM | chrome/msedge procs | node procs | preceded |
|---|---|---|---|---|---|
| 20:08 | 17.3 % | 6.08 GB | 0 | 2 (vite + shell) | certD1-b-clear1 |
| 20:12:04 | 8.8 % | 5.60 GB | 0 | 2 | certD1-b-clear2 |
| 20:14:15 | 11.5 % | 5.32 GB | 0 | 2 | certD1-b-wave2a, certD1-b-clear3 |
| 20:17:58 | 13.8 % | 5.39 GB | 0 | 2 | certD1-b-wave2b, certD1-b-draftdiag |

(The contended `certD1-n-*` series that read 310-424 ms was taken with 31 browser processes and 0.68 GB free; none of that applies here.)
Action files: `tools/actions/certD1-n-clear.json` and `certD1-n-wave2.json` reused byte-for-byte (three and two runs respectively);
`tools/certD1-b-gen.mjs` -> `tools/actions/certD1-b-draftdiag.json` reuses the same sampler library / startRun / RMB steps and swaps
the driver for a draft-screen diagnostic. All six runs: exit 0, `errors: false`. Console digests are checkpointed above
(`#### digest certD1-b-*`).

### Table A — room-clear transition, quiet machine, alone (seed 999, RMB held, rooms 1 -> 3 natural clears, 1600x900)

"+n" = sim ticks after the `room_cleared` event; tm = 4 ms-timer max gap inside the rAF gap (small = main thread free).

| capture | when | GOTO | sample (steady = after 3 s) | STEADY mean fps / p50 / p95 / p99 / max ms | steady gaps >100 ms | 15 s windows: max gt100 | gt250 |
|---|---|---|---|---|---|---|---|
| `certD1-q-clear` (prior, 09-06 22:45) | CPU 5 %, 7.2 GB | 22.0 s | 43.9 s, t1258-3831 | 104.2 / 6.2 / 18.2 / 24.3 / **236.2** | 109 @t2221 path +5 tm27; 127.3 @t3574 draft(legendary Ascend) +8 tm24; **236.2 @t3604 draft +38 tm7.1** | 2 ([28-43]) | 0 |
| `certD1-b-clear1` (09-08 20:10) | 17.3 %, 6.08 GB | 13.9 s | 56.8 s, t535-3867 | 84.6 / 12.1 / 18.5 / 30.3 / **212.0** | **212.0 @t1521 path +14 tm70.6** (branch B: guardian_bond taken t1508, path chosen +34; room 3 = Siphon/common -> no gap; 3rd clear t3616 window [38-53] max 30.3) | 1 | 0 |
| `certD1-b-clear2` (20:12) | 8.8 %, 5.60 GB | 27.6 s | 43.9 s, t1546-4120 | 107.7 / 6.3 / 12.3 / 18.3 / **224.1** | 103.1 @t2508 path +5 tm16.2; 115.1 @t3862 draft(legendary Ascend) +7 tm16.1; **224.1 @t3891 draft +36 tm16.6** | 2 ([28-43]) | 0 |
| `certD1-b-clear3` (20:16) | 11.5 %, 5.32 GB | 34.0 s | 56.9 s, t1920-5249 | 108.5 / 6.3 / 12.5 / 18.5 / **115.0** | 115.0 @t2903 path +6 tm18.2 (branch B; room 3 = Echo/rare -> no gap; 3rd clear t4954 window [38-53] max 30.7) | 1 | 0 |
| `certD1-b-draftdiag` (20:21, per-frame recorder, 6 drafts) | 13.8 %, 5.39 GB | — | 58.8 s, t3102-6561, 6555 frames | (no D.sample) | 121.1 @t4066 draft r1 +6 (first draft of the page); 115.3 @t5624 draft r3 legendary +7; **212.1 @t5653 +36** | — | 0 |

Warm-up gaps (first 3 s, excluded by the brief, all the first boar kill's hitstop/death VFX at 2.34-2.39 s): 109 (q, t1402), 163.7
(b1, t680), 109 (b2, t1689), 103.5 (b3, t2065), 102.8 (diag, t3249). Long tasks aligned to sample start (`ltOffsetMs`): every
long task >= 100 ms sits BEFORE the sample (room-1 build during `startRun`: 229+127 ms in b1, 140+66 in b2, 114+62 in q); inside
the samples the largest is 67 ms (b1 @+0.4 s) / 64 ms (b3) / 57 ms (b1 @+16.6 s, the path-screen frame). Heap 45-70 MB sawtooth
in all runs; `E.entityCount` peak 19, peak alive 5.

Branching note: seed 999 offered `sanctuary` at room 1 in q/b2 (path chosen +25/+27 ticks, room 3 offers legendary `ascend`)
and `guardian_bond` in b1/b3 (path chosen +34/+28, room 3 offers a common/rare node). The 09-06 stall therefore reproduces only
on the `ascend` branch — and there it reproduced twice more today at 224.1 and 212.1 ms.

### Table B — room-2 reward first frame (`certD1-n-wave2.json`: startRun -> skipToRoom 2 [4,5] -> first draft of the page)

| capture | STEADY mean fps / p50 / p95 / p99 / max | steady gaps >100 | gt250 |
|---|---|---|---|
| `certD1-q-wave2` (prior 09-06) | 123.0 / 6.2 / 12.2 / 12.3 / 163.6 | 163.6 @t1810 draft +12 | 0 |
| `certD1-b-wave2a` (09-08 20:14) | 119.8 / 6.2 / 12.2 / 12.4 / 163.7 | 163.7 @t1841 draft +12 tm16.1 (long tasks 0) | 0 |
| `certD1-b-wave2b` (20:18) | 108.4 / 6.3 / 12.4 / 18.4 / 175.8 | 175.8 @t3034 draft +13 tm16.0 (warm-up: 109.1 @t2377, first sampled frame) | 0 |

### Table C — draft-screen diagnostic (`certD1-b-draftdiag`, one page, six consecutive drafts, 1.5 s observed each)

Per draft: per-frame dt tagged by screen, MutationObserver on `#run-screen` (class/style/childList/subtree), `document.getAnimations()`,
and every visible run-screen element with an animation, filter, backdrop-filter, or shadow+gradient.

| room | card | rarity | frames in 1.5 s | max dt | gaps >50 (ms after open) | DOM mutations | running animations |
|---|---|---|---|---|---|---|---|
| 1 | Sanctuary (skill) | — (first draft of page) | 159 | 121.1 | 121.1 @+119 | 0 | none |
| 2 | Guardian Bond (skill) | — | 161 | 18.6 | — | 0 | none |
| **3** | **Ascend (node)** | **legendary** | **134** | **212.1** | **115.3 @+97, 212.1 @+576** | 0 | **`rn-shimmer` on `.rn-card.rn-legendary` rect (630,336,340,154): duration 3200 ms, iterations infinite, currentTime 1527 @+1500** |
| 4 | Quicken (node) | common | 180 | 18.4 | — | 0 | none |
| 5 | Multiply (node) | rare | 164 | 23.9 | — | 0 | none |
| 6 | Sharpen (node) | common | 181 | 18.5 | — | 0 | none |

Path screens: r1 48.5, r2 35.5, r3 78.6 @+90 (the one after the legendary draft), r4 23.7, r5 30.3 ms max. Styled elements are the
same on every draft — `.rn-page.rn-draft` (605,213,389,377) and `.rn-card` (630,333,340,160) with box-shadow + linear-gradient,
zero-size hidden `.rn-door` x2 / `.rn-coin`; no filter or backdrop-filter anywhere (also confirmed by the E4 probe of every clear
run: only `canvas#0` and `#run-screen`, `filter none`, `backdrop none`, `transition opacity 0.22s`). Final frame `certD1-b-draftdiag.png`
= the SOCKETS bench in the room-7 shop (screen "shop", geometries 1122, heap 56.9 MB, ents 5).

### Gate application (headless, quiet, alone)

- "any single gap > 250 ms after warm-up -> FAIL": largest steady gap over 8 alone samples of the clear transition = **236.2 ms**
  (09-06), then **224.1 / 212.1 / 212.0 / 175.8 / 163.7 / 115.0 / 163.6** today+prior. `gt250` = 0 in every sample. **Not tripped**
  (margin 5.5 % on the worst sample, 10-15 % on today's).
- ">= 3 gaps > 100 ms in any 15 s steady window -> FAIL": max is **2** (the [28-43 s] window that contains the legendary draft's
  two-stage stall, q-clear and b-clear2); all other windows 0-1. **Not tripped.**
- "mean fps >= 55": steady means 84.6 - 123.0. **PASS.**
- The re-sampled number is not a fluke in either direction: it is a deterministic two-stage stall (first frame ~115-127 ms, then
  ~212-236 ms about 0.5-0.6 s later) that appears only under the legendary card's `rn-shimmer` keyframe animation, with the main
  thread free (tm 7-17 ms), zero DOM mutations, and the sim idle (0 enemies, reward phase). It is recorded as **F2 (should-fix)**
  below; on a loaded machine the same frame read 310-424 ms (`certD1-n-clear`, `certD1-n-defend6`, `certD1-clear-diag`).

### D4 / D5 refresh on today's captures

- Console: 6 `certD1-b-*` logs, levels {debug 12, warn 1229, GOTO 6, EVAL 37, DEBUG-API 6}; **PAGEERROR 0, error 0, HARNESS-ERROR 0**;
  warn = 1223 x MeshToonMaterial `flatShading` + 6 x X3595 gradient-in-loop (one per boot). Nothing new.
- Version label: `E.version` "0.4.16" in every `lib` line; DOM `#version-label` "v0.4.16" rect (10,870,52.8,22), 12 px, opacity 0.85
  (wave2a/b E5); pixels `--box 0,860,80,40` LUMA >160 **2.969 %** on `certD1-b-wave2b.png` and `certD1-b-clear2.png` vs **0.000 %** in
  the control box (80,860,80,40); the label reads "v0.4.16" in all five viewed frames (`certD1-b-clear1/2/3`, `certD1-b-wave2a`,
  `certD1-b-draftdiag`). Observation only: on the SOCKETS bench overlay (`certD1-b-draftdiag.png`) the modal scrim dims the whole
  HUD — label box 0.000 % >160, fps meter "161 fps" and the command bar equally dimmed, still legible.

### F2 (should-fix, not must-fix) — legendary draft card: two-stage rAF stall under `rn-shimmer`

**Evidence:** `certD1-q-clear` 127.3 @t3574 + 236.2 @t3604 (+8/+38 ticks after `room_cleared` t3566, reward_offer#ascend);
`certD1-b-clear2` 115.1 @t3862 + 224.1 @t3891 (+7/+36 after t3855); `certD1-b-draftdiag` 115.3 @+97 ms + 212.1 @+576 ms after the
Ascend draft opened (t5617), the only draft of six with a running animation (`rn-shimmer`, 3200 ms, infinite, `.rn-card.rn-legendary`
630,336,340,154) and the only one to lose frames (134 vs 159-181 in 1.5 s). Common/rare cards on the same page: max 18.4-23.9 ms.
Main thread free during the stall (timer max gap 7.1-16.6 ms), 0 DOM mutations, no filters/backdrops, sim idle. **Why not must-fix:**
alone it stays under the 250 ms gate in all three samples (85-94 % of it) and never produces 3 gaps in a 15 s window; the sim is
paused on a reading screen so no gameplay input is lost. **Why should-fix:** it is deterministic, 4x the 55 ms budget, and on a
contended machine the same frame measured 310-424 ms (over the gate); the orchestrator's GPU-Chrome run should look at this frame
specifically. Repro: `node tools/cert-capture.mjs shot x --url "http://127.0.0.1:5199/?seed=999" --settle 3000 --actions
tools/actions/certD1-b-draftdiag.json --timeout 180000`, read `drafts[]` in the EVAL (the `ascend` branch appears when room 1 offers
`sanctuary`; otherwise re-run).

Advisory A1 (room-clear -> reward/path first frame 103-176 ms) stands as an advisory: first draft of a page 121-176 ms
(`certD1-b-wave2a/b`, diag r1), path first frame 103-115 ms (212 ms once, `certD1-b-clear1` t1521 with tm 70.6), later common/rare
drafts 0 ms extra.

### Audit-gap verdict

The borderline 236.2 ms sample was re-run alone twice with the identical action file (plus a third run, two wave2 runs and one
diagnostic): every sample is under 250 ms, none of the 15 s windows reaches 3 gaps, steady fps 84.6-123. **Block D stays PASS**;
the legendary-draft stall is promoted from advisory to should-fix F2 with a repro and an anatomy.
