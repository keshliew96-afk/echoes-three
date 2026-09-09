STATUS: COMPLETE
VERDICT: PASS — all six responsiveness probes met on v0.4.59 (seed 555). Round 2b's only must-fix (F1-r2b, no 2-tick hitstop on melee-arc connects) is FIXED: the kill-free boss-room repeat of round 2b's own scenario now reads 75 of 90 arc connects pausing the sim (hitstop causes 2:melee_arc x69) with an independent per-tick wall dwell of 47.3 ms median against a 13.1 ms baseline, versus 0 of 52 and 16.8 ms in round 2b; reproduced in two Act-1 captures for 165 arc-caused hitstops in total. C1 corrected latency 1 tick on 60/60 keydowns (20/20 A/D flips at 100 ms raw 1 at 83 fps); C2 dodge fires on t0+1 in 7/7 and i-frames hold against both cmd hits and a natural biter (0 of 19 bites land inside a dash, 2 that arrived inside read hit_immune iframe); C3 telegraphs 64 of 64 pairs at exactly 42 ticks with mid-telegraph Ember 6732-13320 danger px and clean frames at 8/17/4 px; C4 213 hits carry all four elements plus flash and numeral in real harness pixels; C5 player inside the central 60% on 31/31 samples with a worst 43 px inter-sample jump; C6 markersDrawn 3 natural / 6 forced with uncued 0 and chips located in pixels. 0 PAGEERROR across 22 consoles. No mustFix.

# Certification C round 3 — Responsiveness bar

Critic: block C r3, fresh context. Build read from `[DEBUG-API]` on every capture.
Boot `http://127.0.0.1:5199/?seed=555`, run started with `E.cmd('startRun')`.
Harness `node tools/cert-capture.mjs ... --timeout 180000`; generator `tools/certC3-gen.mjs`.
Capture prefix `certC3-`.

Round-2b left exactly one must-fix open: **F1-r2b — no 2-tick hitstop on melee-arc
connects** (0 of 52 kill-free arc connects). Round 3 re-measures all six probes on
the current build.

## Probe log (appended as measured)

## C1 Movement latency — MET

`captures/certC3-move.console.txt` / `certC3-move.png` (v0.4.59, seed 555, fps 55.2,
0 PAGEERROR, exit 0). Setup: `startRun`, wait for >=2 live enemies, `teleport(-3,2)`,
`iframe(0,7200)` on the player and on every enemy plus two extra boars spawned at
(9,-6)/(-9,-6) so **room 1 never clears during the probe** (`room_cleared 0`,
`hitsOnPlayer 0` over the whole capture — nothing but the keyboard moves the player).
Method: a per-rendered-frame sampler writes one row per NEW sim tick
`[tick, x, z, dashTicksLeft, hp, wallMs]`; a capture-phase `keydown` listener stamps
`E.tick` at the DOM event (t0). Latency = first sampled row whose displacement along
the pressed axis, in the pressed direction, is >= 0.02 u (walk speed is 0.04 u/tick).

| key | 5 trials — raw / corrected ticks | worst raw | worst corrected |
|---|---|---|---|
| KeyD | 1/1, 2/1, 2/1, 1/1, 2/1 | 2 | **1** |
| KeyA | 1/1, 1/1, 2/1, 1/1, 1/1 | 2 | **1** |
| KeyW | 2/1, 1/1, 3/1, 2/1, 1/1 | 3 | **1** |
| KeyS | 2/1, 2/1, 1/1, 1/1, 1/1 | 2 | **1** |

`n 40, worstRaw 3, worstCorrected 1` (20 single-key trials + 20 alternation flips).
Every raw value > 1 is arithmetically a skipped RENDER frame, not a delayed sim
response: the row's displacement equals `span x 0.04 u` exactly. The single raw-3
trial is KeyW t0 812 -> row 815 with `span 3, d 0.12` = 3 ticks of travel already in
that row, so movement began at 813 = **t0+1**. Same for every span-2 row (`d 0.08`).
Gate <= 2 ticks: **met** (raw <= 2 on 39/40, corrected 1 on 40/40).

**Alternation, 10x KeyD/KeyA at 100 ms (20 flips, keyup-old + keydown-new back to
back, no wait between).** `flips 20, worstRaw 2, worstCorrected 1` — every flip
registers on t0+1. Per-tick x-velocity sign trace shows no queued direction and no
overshoot past the flip:
```
1163+ 1164+ 1165+ 1166+ 1167+ 1168+ 1170- 1171- 1172- 1174- 1175+ 1176+ 1178+ 1179+
1181+ 1182+ 1183- 1185- 1186- 1187- 1188- 1189- 1190+ 1191+ 1193+ 1195+ 1196+ 1197-
```
(KeyD down t0 1161 -> `+` from 1163 with span 2; KeyA down t0 1168 -> `-` at 1170;
KeyD 1174 -> `+` 1175; KeyA 1182 -> `-` 1183; ... KeyA 1292 -> `-` 1293.) The sign
flips on the very next sampled tick after each keydown, 20 times out of 20.

## C2 Dash / dodge — MET

Dash key **Space** (docs/BUILD_BRIEF.md §3 line 96 "Space | Dodge roll (i-frames)");
the sim emits `intent{kind:'dodge'}` then `dash_end{cause}`, and `party[0].dashTicksLeft`
counts 15 -> 0. Captures `certC3-dash`, `certC3-dash2`, `certC3-dash4` (all v0.4.59,
seed 555, exit 0, 0 PAGEERROR).

**Latency — keydown to dash event, 7 valid trials, all 1 tick.** Keydown ticks are
stamped by a capture-phase DOM listener, not by the harness.

| capture | Space keydown tick | `intent dodge` tick | latency | `dash_end` | duration | travel |
|---|---|---|---|---|---|---|
| `certC3-dash2` | 349 | 350 | **1** | 365 complete | 15 | — |
| `certC3-dash2` | 465 | 466 | **1** | 481 complete | 15 | **1.800 u** |
| `certC3-dash2` | 536 | — | (denied) | — | — | — |
| `certC3-dash2` | 635 | 636 | **1** | 651 complete | 15 | **1.800 u** |
| `certC3-dash2` | 732 | 733 | **1** | 748 complete | 15 | **1.800 u** |
| `certC3-dash` | 370 | 371 | **1** | 386 complete | 15 | — |
| `certC3-dash` | 493 | 494 | **1** | 509 complete | 15 | — |
| `certC3-dash` | 616 | 617 | **1** | 632 complete | 15 | — |

Gate 0-1 tick: **met on 7/7**. The one press with no dash (`certC3-dash2` t536) is the
72-tick dodge cooldown of BUILD_BRIEF §5 firing correctly — the previous dodge started
at t466, 70 ticks earlier; `certC3-dash` shows the same at t432 (62 ticks after t371)
and t554 (60 after t494). Every dash is 15 ticks / 1.800 u, matching §5.

**I-frames, `cmd('hitOnce',0)` — 3/3 immune inside, 3/3 land after** (`certC3-dash2`,
global i-frame explicitly cleared first with `cmd('iframe',0,0)`):

| trial | dash seen (dashTicksLeft) | mid-dash `hitOnce` | HP | dash over | post-dash `hitOnce` | HP |
|---|---|---|---|---|---|---|
| 1 | t853 (15) | `{immune:true}`, `hit_immune t853 reason iframe` | 100 -> **100** | t868 | t874 `{amount:8}` | 100 -> **92** |
| 2 | t958 (14) | `{immune:true}`, `hit_immune t958 iframe` | 92 -> **92** | t972 | t978 `{amount:8}` | 92 -> **84** |
| 3 | t1062 (15) | `{immune:true}`, `hit_immune t1062 iframe` | 84 -> **84** | t1078 | t1085 `{amount:8}` | 84 -> **76** |

**I-frames against a NATURAL attacker — `captures/certC3-dash4.console.txt`** (fps 41.3):
a Thorn Boar parked 0.7 u from the player bites for ~17 s while the player dodges 12
times, alternating KeyD+Space / KeyA+Space so the dash direction alternates and the
player never pins against a wall. All 12 dashes are `complete`, 15 ticks, travel
1.80-1.84 u: `[367,382] [445,460] [519,534] [602,617] [685,700] [767,782] [849,864]
[931,946] [1014,1029] [1096,1111] [1180,1195] [1262,1277]`.

| measure | result |
|---|---|
| natural `hit` events on the player | **19** (t317, 365, 662, 1121, 1143, 1169, **1172, 1179**, 1227, 1229, 1236, 1240, 1254, 1286, 1302, 1321, 1334, 1340, 1350) |
| of those, landing INSIDE a dash window | **0** (`hitsInsideFullDash []`) |
| natural attacks that arrived inside a dash | **2**, both `hit_immune reason iframe`: **t614** inside [602,617] and **t1192** inside [1180,1195] |
| control | the bite at **t1179** (1 tick before the dash starts at 1180) lands for 8, and the next bite at **t1227** (32 ticks after that dash ends) lands for 8 |

(Design note for anyone re-running this: an earlier take, `certC3-dash3`, dodged 21
times with no movement key held. Direction then defaults to aim, the player walks
1.8 u the same way every dash and pins against the east wall from dash 9 on, after
which `dash_end` fires 1 tick after `intent` — wall contact terminating the dash per
§5, not an i-frame defect. `certC3-dash4` removes that confound.)

## C3 Telegraphs — MET

### C3a events, natural Act-1 play — `captures/certC3-tele.console.txt`
`startRun` then **4010 ticks = 66.8 s** of unattended Act-1 play (rooms 1 -> 2 ->3,
8 waves, 28 spawns, 26 deaths), fps 82.6, 0 PAGEERROR. A background driver only
declines drafts / picks door 0 / re-i-frames and heals the player — **no command ever
touched an enemy or a telegraph**.

| id | start | planned resolve | planned gap | observed resolve | observed gap | `enemy_fire` | caster death |
|---|---|---|---|---|---|---|---|
| 6 | 506 | 548 | 42 | **548** | **42** | 548 | 563 |
| 31 | 836 | 878 | 42 | — | — | — | **870** (died in wind-up) |
| 47 | 1052 | 1094 | 42 | **1094** | **42** | 1094 | 1261 |
| 47 | 1244 | 1286 | 42 | — | — | — | **1261** |
| 86 | 2299 | 2341 | 42 | — | — | — | **2324** |
| 104 | 2827 | 2869 | 42 | — | — | — | **2869** (died on the resolve tick) |
| 103 | 2958 | 3000 | 42 | **3000** | **42** | 3000 | 3127 |
| 129 | 3615 | 3657 | 42 | **3657** | **42** | 3657 | 3697 |
| 151 | 4159 | 4201 | 42 | — | — | — | **4196** |

`starts 9, minPlanned 42, maxPlanned 42, resolved 4, minGap 42, maxGap 42,
fireAtResolve 4/4`. **No telegraph resolved in fewer than 42 ticks**; each of the 5
unresolved ones has its caster's `death` at or before the planned resolve tick.
Gate >= 42 ticks (0.7 s): **met, exactly 42 on every pair**.

### C3b pixels — Ember mid-telegraph — MET
Two independent pixel sources agree.

**(i) Real harness screenshots.** A `{type:'loop'}` polls for a live telegraph with
>= 30 ticks left and fires `{type:'shot'}` the moment it goes true
(`captures/certC3-telepx.console.txt`):

| shot | pre-shot tick / ticks left / telegraph screen pos | box measured | HUES danger | heal | violet |
|---|---|---|---|---|---|
| `certC3-teleshot1.png` | t3253, 33 left, telegraph id 103 at **(810,438)** | (630,298,360,280) | **8119** | 279 | 0 |
| `certC3-teleshot2.png` | t3908, 35 left, telegraph id 129 at **(751,676)** | (571,536,360,280) | **6732** | 0 | 0 |

Viewed `captures/certC3-teleshot1-crop.png` (2x of box (630,298,360,280)): a bright
red-orange Ember **shot lane** runs from full-frame **(630,298)** down to the party
cluster at **~(795,423)**, ending in a glowing ring around the targeted ally at
full-frame **~(775,383)-(865,463)**. `certC3-teleshot2-crop.png` (2x of
(571,536,360,280)) shows the ring arc around the targeted critter at full-frame
**~(731,606)-(841,706)** with the lane leaving to the lower right.

**(ii) Per-rendered-frame canvas readback** (the screenshot path costs ~50 ticks, so it
cannot be guaranteed to land inside a 42-tick window). A rAF sampler copies a 360x280
region of the live WebGL canvas centred on `proj(telegraph.x, 0.02, telegraph.z)` on
every rendered frame and keeps the peak-danger frame per telegraph. 2340 frames, 6
telegraphs captured; decoded by `tools/certC3-decode.mjs`:

| crop | telegraph | shot tick / ticks left | full-frame box | `analyze.mjs` danger | heal | violet |
|---|---|---|---|---|---|---|
| `certC3-telepx-png0.png` | id 47, 1525->1567 | 1542 / 25 | (894,478,360,280) | **13320** | 0 | 0 |
| `certC3-telepx-png1.png` | id 47, 1333->1375 | 1369 / 6 | (932,374,360,280) | **11281** | 0 | 5 |
| `certC3-telepx-png2.png` | id 86, 2585->2627 | 2585 / 42 | (696,351,360,280) | **10608** | 164 | 0 |

The in-page detector and `tools/analyze.mjs` agree to the pixel (13320/13320,
11281/11281, 10608/10608), so the readback is the same measurement the analyzer makes.
Viewed `certC3-telepx-png0.png`: a red-orange spoked telegraph disc at in-crop
(150-300, 0-70) = full-frame **(1044,478)-(1194,548)** with the Ember lane running to
in-crop (230-360,170-230) = full-frame **(1124,648)-(1254,708)**, the Healer standing
inside it. `certC3-telepx-png2.png`: the lane runs from the targeted critter at
full-frame **~(856,441)** to **~(1056,591)** with the ring under its feet.
Ember red-orange is unmistakably present mid-telegraph.

### C3c high-N confirmation — `captures/certC3-tele2.console.txt`
Six Spitting Mantises kept alive around the player for 65 s (fps 83.3):
**55 `telegraph_start`, 54 resolved, `minPlanned 42 / maxPlanned 42`,
`minGap 42 / maxGap 42`, `belowGate 0`, `fireAtResolve 54/54`,
`minInterStart 72`** (the §11 governor's 72-tick minimum spacing). Sample stream:
`4@446->488, 5@518->560, 6@590->632, 4@662->704, 5@734->776, 6@806->848 ...
5@4262->4304, 6@4334->(4376, still winding up at capture end)`. Every wind-up in
64 pairs across two captures is exactly 42 ticks = 0.700 s. Gate 42: **met**.

### C3d clean frames (no live telegraph, no enemies) — MET
Whole-frame `analyze.mjs` HUES danger, gate < 500 px:

| frame | proven state | danger px | >160 / >200 / buckets / FLAT |
|---|---|---|---|
| `certC3-clean-arena.png` | `?scene=arena&seed=555`, no run; enemies 0 / eshots 0 / telegraph events 0 at t363 **and** t407 (the shot sits between) | **8** | 3.832% / 0.528% / 15 / 1.51% |
| `certC3-clean-between.png` | room 1 after `killAllEnemies`; before the shot t401 enemies 0 / eshots 0 / azones 0 / liveTele 0 / ui none (wave 2 lands at ~t444, after) | **17** | 3.765% / 0.570% / 15 / 1.73% |
| `certC3-clean-cleared.png` | `killAllEnemies` + `clearRoom`; enemies 0 / eshots 0 / liveTele 0 at t354 and t398 | **4** | 1.008% / 0.483% / 15 / 61.8% (draft overlay up) |

8 / 17 / 4 px against a 500 px gate, and far under the ~485 px heal-over-tunic
advisory. Ember is reserved for threats: the identical analyzer reads
**6732-13320** danger px in a 360x280 box on the five mid-telegraph frames above.

## C4 Hit feedback — MET (round-2b must-fix F1-r2b is FIXED)

Method: a per-rendered-frame sampler takes ONE 400x225 downscale of the live WebGL
canvas and scores each enemy's projected 64x88 body box inside it
(`W` = share with luma > 230 and sat < 0.18 = "white"); a per-frame walk of
`#dmg-num-layer` records every invisible->visible / text-change transition of a
`.dmg-num` node **keyed by the element** (pool nodes are recycled and re-appended, so
index keying under-counts); knockback = the victim's displacement over t..t+10
projected on the hit's own `dirX/dirZ` plus `kbTicks`; sound = `sound` events on
t..t+2; hitstop = `hitstop` events on t..t+2 **plus an independent per-tick wall-dwell
detector** (wall ms between the first frame showing tick T and the first showing T+1).

### C4a the four per-hit elements — `captures/certC3-hits4.console.txt`
v0.4.59, seed 555, fps 41.2, 1658 frames, 0 PAGEERROR. Room 1 held open with 3 boars
respawned beside the Tank/Swordsman, every enemy re-pinned to full HP every 16 ms and
every party member healed, so victims survive their hits and the melee allies keep
swinging (`downed 0`, `room_cleared 0`).

| measure | result |
|---|---|
| enemy hits analysed | **364** (262 non-killing, 102 kills) |
| **sound** slot on t..t+2 | **364 / 364 (100 %)** |
| **damage numeral** carrying the exact amount | **333 / 364** (141 caught as a fresh pool transition, 192 as a visible numeral with that exact text inside t..t+8) |
| `state().vfx.arena.numerals` pool count steps up within 2 ticks | 93 / 364 — the pool is capped at 12 and recycles oldest-first, so at 364 hits in 2400 ticks the count is usually flat; the DOM numeral is the load-bearing evidence |
| **knockback** along the hit vector | **221 / 262** non-kill hits, `kbTicks` 9-10 |
| **white flash** on the victim (W >= 0.15 at t..t+4) | **250 / 262** non-kill hits |
| **all four on the same hit** | **213 / 262** (bar: >= 20) |

Sample rows (tick, source, shape, amount, numeral@x,y, poolStep, sound, kb u, kbTicks,
flash W, flash W in the 8 ticks before):

```
441 archer_basic    projectile 12 "12"@245,185  0 1 0.644  0 0.151 0.077
445 swordsman_basic melee_arc  11 "11"@439,339  0 1 0.386 10 0.835 0
466 swordsman_basic melee_arc  11 "11"@1273,373 0 1 0.346 10 0.938 0
487 swordsman_basic melee_arc  11 "11"@146,381  0 1 0.344 10 0.898 0
496 ground_crack    ground_aoe 10 "10"@790,181  2 1 0.720 10 0.750 0
530 archer_basic    projectile 12 "12"@1047,152 0 1 0.580  9 0.497 0
587 archer_basic    projectile 12 "12"@16,263   1 1 0.527  0 0.815 0
610 tank_basic      melee_arc   9 "9"@882,292   0 1 0.286 10 0.815 0
631 brutal_cleave   melee_arc  16 "16"@14,298   1 1 0.225 10 0.963 0.472
649 tank_basic      melee_arc   9 "9"@51,350    2 1 0.337  0 0.903 0
```

Eleven of those twelve rows are a clean dark -> white transition (flashPre 0,
flashPost 0.15-0.96). The 49 residual failures are dominated by measurement gaps in a
deliberately crowded scenario (NOKBnull = no sampled row at t+10 because the victim
died or the frame skipped; NOFL0 = the victim's crop is occluded by a neighbouring
body), and every element is independently proven at N >= 221.

### C4b flash + numeral in REAL harness pixels
The required sequence: `node tools/cert-capture.mjs seq certC3-hitseq 8 100` (8 frames,
`captures/certC3-hitseq_00.png` .. `_07.png`, spanning t409 -> t750; a headless
`page.screenshot` costs ~700 ms here so the delivered frames are ~43 ticks apart, not
100 ms — a harness limit logged in round 1 and round 2, not a game defect).

- **`certC3-hitseq_05.png` carries the flash AND the numeral in the same frame.**
  Box **(496,304,176,176)** measures **LUMA >160 76.15 % / >200 52.34 %**; the identical
  box in `certC3-hitseq_04.png` measures **0.63 % / 0.52 %**. Viewed
  `captures/certC3-hitseq05-flash.png` (3x crop of (460,270,280,250)): the Thorn Boar is
  blown to solid white at full-frame **(507,383)-(603,457)** with the Tank standing over
  it at ~(615,355)-(680,450), and the Heavy Slam numeral **"34"** sits directly above at
  full-frame **(578,300)-(658,348)**.
- **`certC3-hitseq_02.png`**: the numeral **"12"** at full-frame **(960,208)-(992,224)**
  above a Thorn Boar at ~(960,240)-(1040,330) with the hit spark burst at ~(925,290)
  (`tools/certC3-findnum.mjs` locates the Parchment-cream ink; the frame is viewed).
  `certC3-hitseq_04.png` carries a second numeral blob at **(976,192)-(1024,224)**.
- **Per-frame canvas triptych** (`certC3-hits2`, decoded by `tools/certC3-decode.mjs`):
  `captures/certC3-trip-png1.png` is the 480x360 region **(861,247,480,360)** on the
  hit tick **t374** (`swordsman_basic 11` on boar id 20, which **survived**) — the victim
  is blown to white at full-frame **(1011,377)-(1161,507)**;
  `captures/certC3-trip-png2.png` is the same region **3 ticks later at t377** and the
  same Thorn Boar renders in its normal blue-slate hide with violet spines at
  **(1069,401)-(1159,481)** beside the fox Swordsman. Flash on, flash off, 3 ticks.

### C4c hitstop — the 2-tick melee-arc pause now fires (round-2b F1-r2b closed)
The decisive re-test repeats round 2b's method exactly:
`captures/certC3-boss3.console.txt` (`skipToRoom(8)`, the Stag re-pinned to 1800/1800
every 16 ms, fps 82.6, 4376 frames, **deaths 2** — both adds, the boss never dies), so
the §9 cap cannot be masked behind kill pauses.

| measure | round 2b (v0.4.43) | **round 3 (v0.4.59)** |
|---|---|---|
| melee-arc connects on a surviving target | 52 | **90** (`swordsman_basic` 44, `tank_basic` 25, `flurry` 6, `lunge_strike` 5, `brutal_cleave` 5, `heavy_slam` 4, +1 on a boar) |
| of those, a `hitstop` within t..t+2 | **0 / 52** | **75 / 90** |
| `hitstop` causes over the capture | `{}` (0 total) | **2:melee_arc 69, 1:melee_arc 1, 3:kill 1** |
| per-tick wall dwell on arc connects | median 16.8 ms, max 37.3, over-40 **0** | median **47.3 ms**, max **77.7**, over-40 **43 / 65** |
| baseline tick dwell, same capture | median 16.2 / p99 26.2 | median **13.1** / p99 41.1 |

The independent dwell detector agrees with the event: an arc connect now costs ~3.6x a
baseline tick, which is what a 2-tick pause on a 13 ms tick looks like. Heavy hits are
explicit: `478 lunge_strike 26 -> 2:melee_arc`, `504 heavy_slam 34 -> 2:melee_arc`,
`505 brutal_cleave 16 -> 2:melee_arc`, `958 lunge_strike 26 (dwell 57.6) -> 2:melee_arc`,
`985 brutal_cleave 16 (53.1) -> 2:melee_arc`, `1022 flurry 11 (72.1) -> 2:melee_arc`.
Reproduced in the Act-1 room: `certC3-hits4` **150 non-killing arc connects, 123 with a
hitstop**, causes `2:melee_arc 121, 1:melee_arc 5, 2:kill 21, 3:kill 5, 1:kill 2`, arc
dwell median **48.7 ms** vs baseline **24.0 ms** (97 of 134 arcs over 40 ms); and
`certC3-hits3` (`2:melee_arc 16, 1:melee_arc 1`, arc dwell median 47.9 vs baseline 15.4).
Three independent captures, 165 arc-caused hitstops.

The 15 boss-room arcs with no `hitstop` are the authored §9 cap ("no stacking above 4
ticks per 20-tick window") firing when two arcs land inside one window — e.g.
`t504 heavy_slam 34` and `t504 swordsman_basic 11` each report `2:melee_arc,2:melee_arc`
(4 ticks spent in that window) and `t505 brutal_cleave` / `t507 tank_basic` then read
`none`; `t826 heavy_slam` is reduced to `1:melee_arc` and `t828 tank_basic` to `none`.
Every "none" in the tables sits within 20 ticks of a granted pause.

### C4d kill hitstop + screenshake
`certC3-hits4`: **73 deaths, 73 `screenshake` events, all cause `kill`, amp 0.06,
durationSec 0.12**; kill hitstops `3:kill 5, 2:kill 21, 1:kill 2` (the remainder reduced
by the same §9 cap under 73 kills in 2400 ticks). `certC3-hits3`: 11 deaths / 11 kill
shakes. Boss stomps — `certC3-boss3`, 14 Antler Quakes over 60 s: **40 `screenshake`
events = `boss_quake` 13 + `boss_trample` 25 + `kill` 2**, every one amp 0.06,
quake/trample durationSec 0.18. The camera second-difference confirms it against a
built-in control, since `boss_quake_start` emits no shake and the resolve does:

| event | ticks | max camera jerk in the next 12 ticks |
|---|---|---|
| `boss_quake_start` (control, no shake event) | 434, 716, 998, 1280, 1562, 1850, 2132, 2426, 2708, 3002, 3284, 3578, 3860, 4154 | **0 - 0.0250** |
| `boss_quake_resolve` | 476, 758, 1040, 1322, 1604, 1892, 2174, 2468, 2750, 3044, 3326, 3620, 3902 | **0.0517 - 0.1878** |
| `boss_trample` | 477, 627, 777, 927, 1077 ... 4125 (25 of them) | **0.0838 - 0.1686** |

All 14 quakes telegraph **exactly 42 ticks** (434->476, 716->758, 998->1040, 1280->1322,
1562->1604, 1850->1892, 2132->2174, 2426->2468, 2708->2750, 3002->3044, 3284->3326,
3578->3620, 3860->3902, 4154->4196) — a third, independent C3 dataset.

## C5 Camera — MET
`captures/certC3-cam.console.txt` + `captures/certC3-cam-end.png` (fps 82.6,
0 PAGEERROR). `startRun`, player i-framed, teleported to (-5,4); the player's world
position is projected to screen through `__arenaProbe.stage.camera` every 250 ms while
a key is held. Central 60 % of a 1600x900 frame = x 320..1280, y 180..720.

| leg | samples | player screen x | player screen y | max jump between samples | inside central 60 % |
|---|---|---|---|---|---|
| **KeyD held 4 s** (world x -4.64 -> 4.72) | 16 | **817 - 839** | **418 - 419** | **17 px = 1.06 % of width** (t358 -> t374) | **16 / 16, `outside []`** |
| **KeyW held 4 s** (world z 3.64 -> -4.96) | 15 | **800 - 800** | **352 - 402** | **43 px = 2.69 %** (t838 -> t854) | **15 / 15, `outside []`** |

Gate "no jump > 25 % of the width" = 400 px: worst observed **43 px**. Smoothing: the
camera's own step sampled every 16 ms has median **0.0437 u**, p99 0.458 u, max 0.936 u
(that maximum is the catch-up right after the `teleport` that set the probe up, before
either leg starts). Raw KeyD trace (tick, world x, screen x,y):
`358 -4.64 -> 817,419 | 374 -4.00 -> 834,418 | 404 -2.80 -> 837,418 |
449 -1.00 -> 836,418 | 496 0.88 -> 839,418 | 544 2.80 -> 838,418 | 592 4.72 -> 838,418`
— the camera holds the player inside a 22 px window across 9.4 world units of travel.

## C6 Threat pointers — MET
`captures/certC3-threat.console.txt` + `certC3-threat-natural.png` /
`certC3-threat-forced.png`.

| case | `hud.threat()` |
|---|---|
| natural (room 1 wave 1, t325; 3 of 4 enemies off-frame at sx -5 / 1921 / sy 1244) | `gated false, offFrame 3, markersDrawn 3, domMarkers 3, covered 3, uncued 0` |
| forced (player teleported to (-9,6); mantis at (10,-6), boars at (10,6) and (-10,-6)) | `gated false, offFrame 6, markersDrawn 6, domMarkers 6, covered 6, uncued 0` |

`#hud-threat` is a live DIV at (0,0,1600,900), `display block, opacity 1, visibility
visible`. DOM marker transforms — natural: `translate(446.8, 876)` and
`translate(1576, 577.5)` (a third pooled node parked at `display:none`); forced:
`(759,67) (1425.9,75.3) (1576,407.2) (1576,285.6) (1576,75.3)`.

**In pixels.** `captures/certC3-threat-nat-m1.png` (6x crop of box (400,830,120,70) of
`certC3-threat-natural.png`) shows the marker chip at full-frame
**(434,856)-(468,890)**: a dark circular plate with a pale grey rim and a cream
arrowhead pointing toward the off-screen boar.
`captures/certC3-threat-forced-tr.png` (4x crop of (1380,30,220,120) of
`certC3-threat-forced.png`) shows two chips flanking the Glint counter at full-frame
**(1405,58)-(1440,93)** and **(1558,58)-(1593,93)**, both arrowheads pointing down.
`markersDrawn >= 1` in every sample (3 natural, 6 forced), `uncued 0` in both.

### C1 solo re-runs (the raw-latency ceiling is render quantisation, not sim latency)
The dev server is shared by up to five headless browsers, so the RAW figure is inflated
by skipped render frames. Same action file, three captures:

| capture | fps | single-key trials raw <= 2 | worst raw | worst corrected | alternation flips |
|---|---|---|---|---|---|
| `certC3-move` | 55.2 | 19 / 20 | 3 (span 3, d 0.12) | **1** | 20/20, worst raw 2 |
| `certC3-move2` | 41.7 | 19 / 20 | 3 | **1** | 20/20, worst raw 3 |
| `certC3-move3` | 83.3 | **19 / 20** | 4 (first trial only, span 4, d 0.16) | **1** | **20/20 raw 1, no correction applied** |

At 83 fps every one of the 20 A/D flips at 100 ms registers on t0+1 with `raw 1,
corrected 1, span 1`, and 18 of 20 single-key trials read raw 1. Every raw > 1 value in
all three captures carries `d = span x 0.04 u`, i.e. the row already holds `span` ticks
of travel, so the first moving tick is always t0+1.

### C4e numeral coverage at NATURAL hit density — `captures/certC3-numaudit.console.txt`
The 91 % coverage above is a crowding artefact of a 9-hits-per-second stress scenario
against a 12-slot oldest-recycled numeral pool (§17). Re-measured on an unattended
natural run — rooms 1 -> 3, 4200 ticks / 70 s, **fps 161.3** (this capture had the dev
server to itself), no HP pinning, no extra spawns, no command touching an enemy:

**42 enemy hits, 42 with the exact-amount numeral, `missing []`, sound 42/42**, numeral
ink `rgb(244, 239, 230)` = Parchment on every one, `vfx.numerals` pool count steps up on
37/42. Sample: `461 piercing_shot 30 -> "30"@1087,72 | 548 whirling_guard 20 ->
"20"@575,541 | 617 heavy_slam 34 -> "34"@446,258 | 824 piercing_shot 30 -> "30"@1281,700
| 1243 whirling_guard 20 -> "20"@1252,247 | 1680 archer_basic 18 -> "18"@1213,491`.
**The room-clearing kill still draws its numeral** (round-1 must-fix F1 stays fixed):
room 1 `room_cleared` at **t1402**, clearing kill `archer_basic 12` at t1402, numeral
**"12" at (1483,717)**.

## Summary — Responsiveness bar (v0.4.59, seed 555)

| probe | verdict | key numbers |
|---|---|---|
| **C1 movement latency** | **MET** | 60 keydowns across 3 captures; corrected latency **1 tick on 60/60**; at 83 fps 39/40 raw <= 2 and **20/20 A/D flips at 100 ms raw 1 with no correction**; velocity-sign trace shows no queued direction. Gate <= 2: met |
| **C2 dash / i-frames** | **MET** | Space -> `intent dodge` on **t0+1 in 7/7** valid trials (the 3 presses with no dash are the §5 72-tick cooldown, 60-70 ticks after the previous dodge); every dash 15 ticks / 1.800 u. `hitOnce` mid-dash -> `{immune:true}` + `hit_immune reason iframe`, HP unchanged 3/3; the same call after `dash_end` lands 8 damage 3/3. NATURAL attacker: 12 full dashes under a biting boar -> **0 of 19 hits land inside a dash**, the 2 bites that arrived inside one both read `hit_immune iframe` (t614, t1192), with bites at t1179 and t1227 either side landing for 8 |
| **C3 telegraphs** | **MET** | 66.8 s of natural Act-1 play: 9 `telegraph_start`, planned gap **42 on all 9**, 4 resolved at **exactly 42**, `enemy_fire` on 4/4 resolve ticks, the other 5 casters died at or before their resolve tick. High-N confirmation: **55 starts / 54 resolves, minGap = maxGap = 42, belowGate 0**. Boss: 14 Antler Quakes, all 42. Mid-telegraph Ember **6732-13320 danger px** in 360x280 boxes across 5 frames (2 of them real harness screenshots), ring/lane located in pixels. Clean frames **8 / 17 / 4** danger px vs the 500 gate |
| **C4 hit feedback** | **MET** | 364 enemy hits: sound **364/364**, numeral **333/364** under stress and **42/42 at natural density (`missing []`)**, knockback **221/262** non-kill (0.23-0.72 u along the hit vector, kbTicks 9-10), flash **250/262**, **all four on 213 hits** (bar >= 20). Flash + numeral proven in real harness pixels (`certC3-hitseq_05.png`, box (496,304,176,176) >200 **52.34 %** vs **0.52 %** in frame 04; "34" at (578,300)-(658,348)) and in a 3-tick canvas pair (t374 white -> t377 normal). **Round-2b F1-r2b FIXED**: 75/90 kill-free melee-arc connects now pause the sim (`2:melee_arc` x69), arc dwell median **47.3 ms vs 13.1 ms baseline**, vs **0/52** in round 2b. Kill shake 73/73; boss stomps 40 `screenshake` events (quake 13 / trample 25 / kill 2) with a clean quake-START control at jerk 0-0.025 vs 0.052-0.188 on resolve |
| **C5 camera** | **MET** | KeyD 4 s: player screen x 817-839 / y 418-419, max inter-sample jump **17 px = 1.06 % of width**, 16/16 inside the central 60 %. KeyW 4 s: x 800 / y 352-402, max jump **43 px = 2.69 %**, 15/15 inside. `outside []` on both legs. Camera step median 0.0437 u / p99 0.458 u |
| **C6 threat pointers** | **MET** | natural `offFrame 3, markersDrawn 3, domMarkers 3, uncued 0`; forced `6/6/6, uncued 0`. Chips in pixels at full-frame **(434,856)-(468,890)**, **(1405,58)-(1440,93)**, **(1558,58)-(1593,93)** |

Console hygiene: **0 PAGEERROR, 0 `[error]`, 0 `[warning]`, 0 HARNESS-ERROR across all
22 `certC3-*` consoles**; every `[DEBUG-API]` line reads `"version":"0.4.59"`.

## Failures
**None.** All six probes met. Round 2b's single must-fix (**F1-r2b — no 2-tick hitstop
on melee-arc connects**) is verified fixed on three independent captures, including a
repeat of the exact kill-free boss-room scenario that produced 0/52 in round 2b and now
produces 75/90. Round 1's F1 (no numeral on the room-clearing kill) also stays fixed.

## Advisories (not blocking)

- **A1 Raw keydown latency reads 3-4 ticks on the first trial of a capture.** Always a
  skipped render frame: the row carries `span x 0.04 u` of travel so the sim moved on
  t0+1 (`certC3-move3` t614: span 4, d 0.16). Anyone re-measuring should run the probe
  with the dev server to itself (161 fps solo vs 41-83 fps shared) and report the
  corrected number alongside the raw one.
- **A2 Round-2's knockback advisory (A1) is resolved, not carried forward.** Projected
  on the hit's own direction the impulse lands on the §9 numbers: melee basics
  `tank_basic`/`swordsman_basic` **0.29-0.39 u** (spec 0.34), `brutal_cleave` 0.225,
  projectile/skill hits **0.50-0.72 u** (spec 0.72), `kbTicks` 9-10 (spec 10 ticks).
- **A3 Numeral coverage falls to ~91 % under artificial crowding.** 333/364 in
  `certC3-hits4` (9 hits/s against a 12-slot oldest-recycled pool) vs **42/42 at natural
  density**. Authored §17 behaviour, recorded so a future critic does not read the
  stress number as a regression.
- **A4 `hitstop` is reduced or dropped by the §9 cap under load.** `certC3-boss3`
  15 of 90 arcs read `none` and one reads `1:melee_arc`; `certC3-hits4` 5 of 126 arc
  stops are 1 tick and 27 of 102 kills lose theirs. Every case sits within 20 ticks of a
  granted pause — the authored "no stacking above 4 ticks per 20-tick window" — and the
  kill-free boss capture shows the un-capped behaviour cleanly.
- **A5 A wall-terminated dash gives almost no i-frames.** In `certC3-dash3` the player
  dodges into the east wall from dash 9 on and `dash_end` fires **1 tick after
  `intent`** (spans [1045,1046], [1125,1126], ...); a bite at t1357 landed on the
  `dash_end` tick of such a dash. That is §5-consistent ("wall contact terminates the
  dash", i-frames last "the full travel window"), but a player who dodges into geometry
  gets a ~17 ms invulnerability window instead of 250 ms. Worth a design look, not a
  responsiveness failure — `certC3-dash4` shows 12/12 clean dashes are fully covered.
- **A6 The player has no melee arc, so arc hitstop is only reachable through allies.**
  `cmd('giveSkill','heavy_slam')` still returns `{"error":"unknown skill 'heavy_slam'"}`
  and the Healer basic is a projectile (§7); every arc measurement above therefore comes
  from Tank/Swordsman swings. Unchanged from round 2.
- **A7 Harness limits (same as round 1 A5 / round 2 A4).** A headless `page.screenshot`
  costs ~700 ms / ~43 sim ticks, so `seq <n> 100` delivers frames ~43 ticks apart
  (`certC3-hitseq` spans t409 -> t750 over 8 frames) and a `shot` cannot be guaranteed to
  land inside a 42-tick telegraph — both telegraph screenshots straddled their resolve
  tick even though both still caught live Ember. Per-rendered-frame canvas readback is
  what resolves a 3-tick flash; the in-page detector was validated against
  `tools/analyze.mjs` to the exact pixel (13320/13320, 11281/11281, 10608/10608).
- **A8 One render hitch over 100 ms in 70 s of natural play.** `certC3-numaudit`:
  frame gaps median 18.1 ms, p99 53.5 ms, **max 183.2 ms, over-100 count 1 of 3579**.
  Block-D territory; the REFERENCE_BAR line "no >100 ms hitches during waves" is only
  just held.
- **A9 One shader warning per boot** (`X3595 gradient instruction used in a loop` +
  `X4000 potentially uninitialized variable f_ApplyFXAA`), logged as `[warn]`, not an
  error. Known since round B.

## Captures and tools (all under `captures/`, prefix `certC3-`)
recon, move, move2, move3, dash, dash2, dash3, dash4, tele, tele2, telepx (+ teleshot1/2,
telepx-png0..2, teleshot1/2-crop), hits, hits2 (+ trip-png1/2), hits3, hits4
(+ trip4-png0..2), hitseq_00..07 (+ hitseq04-num, hitseq05-flash), boss3, numaudit, cam
(+ cam-end), threat (+ threat-natural, threat-forced, threat-nat-m1, threat-forced-tr),
clean (+ clean-arena), clean-run (+ clean-cleared), between (+ clean-between).
Generators: `tools/certC3-gen.mjs`, `-gen2..-gen11.mjs`; helpers
`tools/certC3-decode.mjs` (dataURL -> PNG), `tools/certC3-crop.mjs`,
`tools/certC3-findnum.mjs`. Nothing under `src/**` or another agent's file was touched.
