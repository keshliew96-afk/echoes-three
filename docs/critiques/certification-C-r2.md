STATUS: COMPLETE
VERDICT: FAIL (round 2b audit re-run) — C4 hit feedback is missing one binding element: BUILD_BRIEF section 9 item 4 requires a 2-tick sim pause on melee-arc connects and it never fires (0 of 52 kill-free arc connects in captures/certC2-b-boss2, 581 arc connects across five captures produce no non-kill hitstop event and no sim pause; independent tick-dwell detector max 39.2 ms vs a calibrated 60-70 ms for the 3-tick kill pause) -> mustFix F1-r2b. The second audit gap is CLOSED: 208 non-killing enemy hits carry all four elements (numeral 227/227, sound 227/227, knockback 219/227, flash 213/227), 103 of them melee-arc connects, with non-killing MELEE knockback measured for the first time (N=81, median 0.340 u along the hit vector, kbTicks 9-10, on-spec 0.34/0.72) and the white flash proven in real harness pixels (certC2-b-fl6.png, boar at (1187,393)-(1277,497), LUMA >200 48.52% in box (1191,374,104,128) vs 0.00-3.10% in the six non-flash shots) plus three non-killing melee triptychs. C1/C2/C3/C5/C6 stand as measured in round 2 (same build v0.4.43).

## AUDIT RE-RUN (round 2b) — in flight

A completeness audit of the PASS below flagged two C4 gaps as mustRerun:
Resume state: G1 DONE, G2 DONE. Round 2b complete. Captures use prefix certC2-b-.
G2 flash proven on only 6 hits / knockback on only 10, no non-killing MELEE knockback.
C1/C2/C3/C5/C6 are NOT re-run (their measurements below stand, same build v0.4.43).
Resume state: G1 DONE (see below). G2 in flight. New captures use prefix certC2-b-.
### G1 RESULT — hitstop on non-killing melee-arc connects: **ABSENT, 0/52** (mustFix F1-r2b)

`captures/certC2-b-boss2.console.txt` (v0.4.43, seed 555, `skipToRoom(8)`, fps 163.9, 0 PAGEERROR).
The Stag is held at full HP by `cmd(bossHp,1)` every 150 ms, so **nothing dies for 4210 ticks**
(deaths 0) and the §9 cap (no stacking above 4 ticks per 20-tick window) cannot mask an arc
hitstop behind kill hitstops. The melee allies engage it continuously:
`allyBasicFired {archer|projectile 24, swordsman|melee_arc 29, tank|melee_arc 5}`,
`allyCastFired` incl. `swordsman|lunge_strike|melee_arc 6, swordsman|flurry|melee_arc 6,`
`tank|heavy_slam|melee_arc 3, tank|brutal_cleave|melee_arc 3`.

| measure | melee-arc non-kill hits | ranged non-kill hits | control: kill blows |
|---|---|---|---|
| N | **52** | 84 | 36 (certC2-b-arc) / 7 (certC2-b-pin) |
| `hitstop` event within t..t+2 | **0 / 52** | 0 / 84 | **36 / 36** (`kill:3`) |
| per-tick wall dwell median | **16.8 ms** | 15.9 ms | **62.8 ms** |
| dwell max / over 40 ms | 37.3 ms / **0** | 25.9 ms / 0 | 70.4 ms / 36 |
| baseline tick dwell (same capture) | median 16.2, p99 26.2, max 52.4 | | |

`hitstopTotal 0, causes {}` over the entire 136-hit boss capture. The dwell column is an
INDEPENDENT detector calibrated on this build: a 3-tick pause reads 60-70 ms against a 16 ms
baseline (`certC2-b-arc` control: 11/11 kills 60.0-70.4 ms; `certC2-b-pin`: 7/7 kills),
so a 2-tick pause would read ~50 ms. No arc connect exceeded 37.3 ms.

Per-hit table (first 30 of 52; tick, source, attacker, damage, tick dwell ms, hitstop):
```
691 lunge_strike atk2 26 37.3 none | 699 flurry atk2 11 22.2 none | 700 swordsman_basic 11 13.7 none
721 swordsman_basic 11 12.9 none | 792 swordsman_basic 11 7.8 none | 813 swordsman_basic 11 17.5 none
816 heavy_slam atk1 34 8.2 none | 817 brutal_cleave atk1 16 23.4 none | 820 tank_basic atk1 9 6.9 none
834 swordsman_basic 11 18.6 none | 926 flurry 11 10.3 none | 927 swordsman_basic 11 17.4 none
931 lunge_strike 26 12.6 none | 948 swordsman_basic 11 9.0 none | 969 swordsman_basic 11 17.3 none
973 tank_basic 9 23.4 none | 1056/1077/1098 swordsman_basic 11 8.5/16.5/16.8 none
1183 lunge_strike 26 16.4 none | 1191 flurry 11 22.3 none | 1193/1214 swordsman_basic 11 21.1/17.0 none
1314 heavy_slam 34 15.7 none | 1315 brutal_cleave 16 24.4 none | 1316 swordsman_basic 16.5 9.3 none
1317 tank_basic 9 15.4 none | 1337 swordsman_basic 11 15.5 none | 1429 flurry 11 10.4 none
1430 lunge_strike 26 19.6 none
```

Heavy hits are included and unambiguous: **Heavy Slam 34 x3, Lunge Strike 26 x3, Brutal Cleave 16 x2**
inside the first 30 rows all land with no pause. BUILD_BRIEF §9 item 4 (binding) requires 2 ticks
on melee-arc connects; only the 3-tick kill pause exists.

A **player** melee-arc connect is not producible in this build: the Healer basic is a projectile
(§7) and `cmd(giveSkill,heavy_slam)` / `(giveSkill,flurry)` both return
`{"error":"unknown skill"}` (`certC2-b-arc.console.txt`) — only Healer skills are grantable, and the
only Healer melee_arc is the heal Restorative Wave. So hitstop is not merely "wired to the player arc":
there is no arc in the game that produces it.

### G2 RESULT — flash + numeral + knockback + sound on non-killing hits: **MET at N=208** (incl. 103 melee)

Method (`tools/certC2-b-gen11.mjs` / `-gen13.mjs` -> `captures/certC2-b-elems2` and
`certC2-b-verify`, v0.4.43, seed 555, fps 82 / 55.6, 0 PAGEERROR): the player is
i-framed, every enemy is pinned to full HP every 20 ms and 2-3 boars are kept spawned
beside the Tank and the Swordsman, so the melee allies swing their arcs (Tank arc
0.90/50 deg, Swordsman 0.75/40 deg) at victims that **survive** the hit. Per hit the
four elements are read from four independent sources:
flash = per-rendered-frame readback of a 64x88 box of the live WebGL canvas around the
victim (`W` = share of the box with luma > 230 and sat < 0.18);
numeral = per-frame scan of `#dmg-num-layer` counting invisible->visible transitions
(pool nodes are REUSED, so a MutationObserver keyed on text alone under-counts),
greedily assigned 1:1 to hits;
knockback = victim displacement over t..t+10 projected on the hit's own `dirX/dirZ`,
plus `kbTicks` from `state()`;
sound = `sound` events on t..t+2.

| capture | non-kill ENEMY hits | numeral | sound | knockback | flash | **all four** |
|---|---|---|---|---|---|---|
| `certC2-b-elems2` | 239 | 239 | 239 | 218 | 217 (7 no-crop) | **199** |
| `certC2-b-verify` | 227 | 227 | 227 | 219 | 213 (4 no-crop) | **208** |
| `certC2-b-verify` melee-arc only | **115** | 115 | 115 | 111 | 107 | **103** |
| `certC2-b-elems2` melee-arc only | 125 | 125 | 125 | 114 | 113 | **104** |

Brief asks for >= 20; measured 208 in one capture and 199 in an independent one, of
which 103 / 104 are melee-arc connects. Sound and numeral are 100 % (466/466 across
both captures). Sample melee rows (`certC2-b-verify`, tick, source, dmg, numeral,
sound, knockback u, kb starts at t+, kbTicks, flash W):
```
890  tank_basic      9  "9"@788,332  hit   0.345 t+2  9  W0    (flash miss, see A8)
902  swordsman_basic 11 "11"@1151,392 hit  0.309 t+2  9  W0.880
923  swordsman_basic 11 "11"@1297,343 hit  0.246 t+2 10  W0.668
929  tank_basic      9  "9"@873,340  hit   0.587 t+2  9  W0.829
995  swordsman_basic 11 "11"@475,333 hit+hit 0.340 t+2 9 W0.853
1016 swordsman_basic 11 "11"@982,358 hit+hit 0.721 t+1 9 W0.899
1037 swordsman_basic 11 "11"@823,380 hit+hit 0.683 t+2 10 W0.902
1038 flurry          11 "11"@1101,353 hit   0.727 t+1  9 W0.902
1051 tank_basic      9  "9"@474,341  hit   0.367 t+2  9  W0.827
```

**Non-killing MELEE knockback — the audit's missing measurement.** `certC2-b-elems`
isolates it: **81 non-killing melee-arc hits**, displacement median **0.340 u**, max
0.727 u, `kbTicks` 9-10, first movement on **t+1..t+3**, and the along-hit-direction
component equals the total displacement to 3 decimals (e.g. 0.335/0.334, 0.339/0.338,
0.341/0.343) — the victim travels along the hit vector, so this is knockback, not the
boar's own locomotion. The two magnitudes cluster exactly on the BUILD_BRIEF §9
tuned numbers: **basics (tank_basic 9, swordsman_basic 11) = 0.33-0.35 u**, **skills
(flurry) = 0.72-0.73 u** over 9-10 ticks, vs the authored "0.34 u / 0.72 u over 10
ticks". (Round 2's advisory A1 — "knockback 0.461-0.649 u exceeds spec" — was a
measurement artefact of a t..t+8 window that included ranged victims still walking;
projected on the hit direction the impulse is exactly on spec.)

**Flash in real harness PNG pixels.** Eight screenshots were fired through a
`{type:"loop"}` that polls an in-page `flashNow` flag (any enemy crop over W 0.25) and
shoots the moment it goes true. Same 104x128 box (1191,374) in all eight:

| frame | LUMA >200 in box | state |
|---|---|---|
| `certC2-b-fl5.png` | **34.976 %** | flash |
| `certC2-b-fl6.png` | **48.520 %** | flash |
| fl0 / fl1 / fl2 / fl3 / fl4 / fl7 | 0.841 / 0.391 / 3.102 / 0.796 / 0.000 / 0.413 % | no flash |

Viewed: `captures/certC2-b-fl6-flash.png` (3x crop of box (1120,330,220,200) of
`certC2-b-fl6.png`) shows the Thorn Boar's whole body blown to white at full-frame
**(1187,393)-(1277,497)**, beside an un-flashed second boar, with the damage numerals
"34" and "11" in the same frame. `captures/certC2-b-fl7-normal.png` is the identical
box one shot later: the same boar renders in its normal blue-slate hide with the
violet spines. Flash victim = boar id 223, hit at t3064 (`archer_basic 12`), its
projected box (1213,400,64,88) inside the bright region.

**Flash on a non-killing MELEE connect, in pixels.** Three 480x360 canvas-region
triptychs (`tools/certC2-b-sheet.mjs` decoding `certC2-b-shots.console.txt`):

| set | hit | pre frame (W) | flash frames (W) |
|---|---|---|---|
| 0 | t2070 `swordsman_basic 11` on boar 111, **survived** | `certC2-b-trip0-pre-t2068.png` box (980,194,480,360) W **0** | `certC2-b-trip0-post-t2070.png` W **0.735**, `-t2072` W **0.697** |
| 1 | t2113 `swordsman_basic 11` on boar 112, survived | `certC2-b-trip1-pre-t2111.png` W 0 | `-post-t2113` W **0.708**, `-t2115` W **0.743** |
| 2 | t2134 `swordsman_basic 11` on boar 112, survived | `certC2-b-trip2-pre-t2132.png` W 0 | `-post-t2134` W **0.314**, `-t2136` W **0.386** |

Viewed set 0: the pre frame shows the blue Thorn Boar at in-crop (225-275, 165-215) =
full-frame **(1205,359)-(1255,409)** next to the fox Swordsman; the post frame two
ticks later has that same boar blown to white at full-frame **(1160,334)-(1280,424)**
with the sword arc sweeping through it. W returns to 0 by t2074 — a ~3-tick flash.
`analyze.mjs --box 225,165,80,70` on the two decoded crops confirms it independently:
**pre t2068 LUMA >160 0.000 % / >200 0.000 %; post t2070 >160 98.196 % / >200 78.054 %**
(box = the boar body inside the 480x360 region, i.e. full-frame (1205,359,80,70)).

### Round-2b verdict change

| gap | round-2 filing | round-2b measurement | new filing |
|---|---|---|---|
| G1 hitstop on melee-arc connects | advisory A3 (N=1 arc hit, confounded by kills) | **0 of 52** kill-free arc connects fire a `hitstop`; **0 of 581** arc connects across five captures; independent tick-dwell detector (calibrated: 3-tick kill pause = 60-70 ms vs 16 ms baseline) reads **max 39.2 ms, over-40 count 0** on 284 measured arc connects | **mustFix F1-r2b, block C now FAILS** |
| G2 flash/knockback coverage | flash 6 hits, knockback 10 (all ranged) | **208 non-kill enemy hits with all four elements** (numeral 227/227, sound 227/227, kb 219/227, flash 213/227), **103 of them melee-arc**; melee-only knockback N=81 median 0.340 u along the hit vector; flash proven in a real harness PNG and in three melee triptychs | **MET** |

Every other C4 element re-confirmed on this build in the same captures: sound slot on
100 % of hits (466/466), damage numeral on 100 % (466/466), kill hitstop `kill:3`
(79/88 and 97/110 kills — the misses are the §9 cap "no stacking above 4 ticks per
20-tick window" firing in a mass-kill stress scenario, not absent feedback; natural
play measured 22/22 in round 2), kill screenshake `{cause:kill, amp:0.06,
durationSec:0.12}` 84 events / 84 deaths in `certC2-b-verify`, boss stomps
`{boss_quake|boss_trample, amp 0.06, 0.18 s}` 43 events in `certC2-b-boss2`.

## Failures (round 2b)

**F1-r2b (mustFix) — no hitstop on melee-arc connects; only kill blows pause the sim.**
BUILD_BRIEF §9 item 4 (binding, "every hit must land with ALL of"): *"Hitstop: global
sim pause 2 ticks on melee-arc connects, 3 ticks on kill blows"*, and the block-C brief
lists hitstop among C4's per-hit elements and gates on "a hit missing any feedback
element -> FAIL with mustFix".
Evidence: `captures/certC2-b-boss2.console.txt` — the Stag pinned at 1800 HP for 4210
ticks (`deaths 0`), 136 hits of which **52 are melee-arc connects** (`swordsman_basic`
29, `lunge_strike` 6, `flurry` 6, `tank_basic` 5, `heavy_slam` 3, `brutal_cleave` 3):
`hitstopTotal 0, causes {}`. Because nothing died, the §9 4-ticks-per-20 cap cannot be
the explanation. Independent detector: per-tick wall dwell (first frame showing tick T
to first frame showing T+1) — arc connects median **16.8 ms**, max **37.3 ms**,
`over40 0`; baseline median 16.2 / p99 26.2; the same detector reads **60.0-70.4 ms on
11/11 kill blows** in `certC2-b-arc` and 62-70 ms on 7/7 in `certC2-b-pin`, so a 2-tick
pause (~50 ms) would be resolved with ~20 ms of margin. Heavy hits are included and
unmissable: Heavy Slam **34** (t816 dwell 8.2, t1314 dwell 15.7), Lunge Strike **26**
(t691 37.3, t931 12.6, t1183 16.4, t1430 19.6), Brutal Cleave **16** (t817 23.4,
t1315 24.4) — every one `hitstop: none`.
Reproduced in three further captures: `certC2-b-elems` 83 arc non-kill / 0 uncontaminated
stops; `certC2-b-elems2` 125 arc non-kill, `arcDwell median 14.5 max 35.1 over40 0`;
`certC2-b-verify` 115 arc non-kill, `arcDwell median 14.5 max 39.2 over40 0`. The five
or six "stops" those runs report are kill hitstops from a *different* simultaneous hit
landing inside the same 2-tick window (those captures contain 84-110 deaths); the
kill-free boss capture has none at all.
Not a player-input scoping issue: the Healer's basic is a projectile (§7) and
`cmd('giveSkill','heavy_slam')` / `('giveSkill','flurry')` both return
`{"error":"unknown skill ..."}` (`certC2-b-arc.console.txt`), so no player melee arc
exists to test — hitstop-on-arc is absent from the game, not merely from ally arcs.
Repro: `node tools/certC2-b-gen5.mjs && node tools/cert-capture.mjs shot certC2-b-boss2
--url "http://127.0.0.1:5199/?seed=555" --settle 3000 --actions
tools/actions/certC2-b-boss2.json --timeout 180000`, then read `hitstopTotal` / `causes`
/ `arcDwell` in `captures/certC2-b-boss2.console.txt`.
Fix shape: emit the 2-tick pause on melee-arc connects (the `hit` event already carries
`source` and the caster's shape is `melee_arc` in `ally_cast`/`ally_basic`), honouring
the §9 cap.

## Advisories added in round 2b

- **A7 `hitstop` is dropped on ~10 % of kill blows under heavy load.** `certC2-b-verify`
  88 deaths / 79 kill hitstops; `certC2-b-elems2` 110 / 97. This is the §9 cap
  ("no stacking above 4 ticks per 20-tick window") behaving as authored in a stress
  scenario with pinned HP and mass kills; natural-density play measured 22/22 and 36/36
  (`certC2-b-arc`). Recorded so a future critic does not read it as a regression.
- **A8 ~4 % of non-killing hits show no white flash and ~2 % no knockback in the crowd
  stress test.** `certC2-b-verify` residual failures 19/227, reasons
  `{noFlash 9, noKB 5, noKB+noFlash 1, kbNoRow+flashNoFrames 2, flashNoFrames 2}` —
  i.e. 4 are measurement gaps (the victim's 64x88 crop went out of canvas bounds or the
  sampler had no row on the hit tick) and 15 are genuine misses out of 227, in a
  scenario with up to 5 boars pinned at full HP shoulder-to-shoulder against arena walls
  (§9 knockback is "swept vs. walls", which can legitimately yield 0 displacement, and an
  occluded victim can hide the flash from a fixed crop box). Every element is proven
  present at N >= 103 per element, so this is a tail, not a missing feature — but a
  builder chasing polish could check flash/knockback on wall-pinned victims.
- **A9 Melee allies never engage in an ordinary Act-1 room.** `certC2-b-pin`: 20 s of
  room-1 combat produced `allyBasicFired {archer|projectile 37}` — **zero Tank or
  Swordsman basics** — because the Archer kills spawns at range before the melee pair
  closes; `certC2-b-arc` logged exactly 1 melee-arc hit in 5500 ticks of natural play.
  Melee arcs only appear once a target survives long enough (boss room: 34 melee basics
  in 70 s). Out of block-C scope, but it is why round 2 could not find arc connects, and
  it means two of the four party silhouettes rarely animate their signature attack.


---

(The round-2 sections below are unchanged; C1/C2/C3/C5/C6 were not re-run in 2b.)




# Certification C round 2 — Responsiveness bar

Critic: block C r2, fresh context, build **v0.4.43** (round 1 measured v0.4.16).
Boot `http://127.0.0.1:5199/?seed=555`, run started with `E.cmd('startRun')`.
Harness `tools/cert-capture.mjs ... --timeout 180000`; generators
`tools/certC2-gen.mjs` + `tools/certC2-gen2.mjs`; parsers `tools/certC2-parse.mjs`,
`tools/certC2-hitreport.mjs`, `tools/certC2-sheet.mjs`, `tools/certC2-telesheet.mjs`.
Method note: a per-rAF sampler writes one row per NEW sim tick (tick, player x/z,
dashTicksLeft, hp, camera, per-enemy x/z/hp/kbTicks, vfx.numerals) and a
MutationObserver on `#dmg-num-layer` records every visible `.dmg-num` with its
tick and screen rect. Latency = ticks from the DOM keydown's `E.tick` (t0, the
last COMPLETED tick) to the first sampled row that shows the effect; when a
render frame spans N ticks the row already contains N ticks of travel, so
`corrected = raw - (N-1)` names the tick the effect actually began.

## C1 Movement latency — MET
`captures/certC2-move.png` / `certC2-move.console.txt` (v0.4.43, fps 33.6 — two
headless browsers shared the dev server for this pass; see re-run below).
Setup: startRun, wait for live combat, `iframe(0,3600)` + `teleport(-3,2)`.

| key | 5 trials (corrected/raw ticks) | worst corrected |
|---|---|---|
| KeyD | 1/1, 1/1, 1/2, 1/1, 1/3 | **1** |
| KeyA | 1/1, 1/2, 1/1, 1/2, 1/2 | **1** |
| KeyW | 1/2, 1/1, 1/1, 1/2, 1/1 | **1** |
| KeyS | 1/2, 1/2, 1/3, 1/1, 1/2 | **1** |

`worstCorrected 1, worstRaw 3, n 20`. Raw traces (tick:x,z) prove the correction:
KeyD t0 509 -> `508:-3.00,2.00 509:-3.00,2.00 510:-2.96,2.00` (raw 1);
KeyW t0 558 -> `558:-3.36,2.00 560:-3.36,1.92` (row 560 already holds 0.08 u =
2 ticks of travel at 0.04 u/tick, so movement began at 559 = t0+1, tick 559 was
simply never rendered); KeyS t0 582 -> `582:z1.60 584:z1.68` (same). Every raw
value >1 is a skipped render frame, never a delayed sim response.

Alternation (i-frames OFF, natural fight, teleport (0,2), 10x KeyD/KeyA at
100 ms = 20 flips, keyup old + keydown new back to back): **20/20 flips
correctedLatency 1** (raw 1-3, span 1-3). Velocity-sign trace shows no queued
direction — e.g. `1009:0 1011- 1012- 1013- 1015- 1016+ 1017+` with KeyD down at
t0 1015 and KeyA down at t0 1009. One enemy hit landed on the player at t1037
without disturbing the flip. Gate <= 2 ticks: **met (1)**.

### C1 solo re-run — `captures/certC2-move2.console.txt` (headline numbers)
The pass above shared the dev server with a second headless browser (fps 33.6),
which inflates the RAW figure through skipped render frames. Re-run alone at
**fps 68.5**, same action file:

| key | 5 trials (corrected/raw) |
|---|---|
| KeyD | 1/15*, 1/1, 1/1, 1/1, 1/1 |
| KeyA | 1/1, 1/1, 1/1, 1/1, 1/1 |
| KeyW | 1/1, 1/1, 1/1, 1/1, 1/1 |
| KeyS | 1/1, 1/1, 1/2, 1/1, 1/1 |

**18 of 20 trials raw latency 1, one raw 2, one raw 15.** The raw-15 outlier is
the very first trial (KeyD t0 511): the trace holds rows `509 / 510 / 511` and
then nothing until 526 — a single ~250 ms render stall right after the
`teleport` (see advisory A2); `along` at row 526 already contains 15 ticks of
travel, so movement began at 512 = t0+1.
Alternation in the solo run is unambiguous: **20/20 flips `rawLatency 1,
correctedLatency 1, span 1`** with no correction applied at all
(t0 1004 -> flip 1005, 1012 -> 1013, 1021 -> 1022, 1030 -> 1031, 1035 -> 1036,
1042 -> 1043, 1049 -> 1050, 1056 -> 1057, 1062 -> 1063, 1069 -> 1070,
1075 -> 1076, 1082 -> 1083, 1089 -> 1090, 1096 -> 1097, 1099 -> 1100,
1105 -> 1106, 1112 -> 1113, 1118 -> 1119, 1125 -> 1126, 1132 -> 1133).
Every direction flip at 100 ms registers on the very next sim tick; nothing queues.

## C2 Dash / dodge — MET
Dash key **Space** (docs/BUILD_BRIEF.md §3 "Space | Dodge roll (i-frames)"; sim
emits `intent{kind:'dodge'}` then `dash_end{cause}`; `party[0].dashTicksLeft`
counts 15 -> 0). `captures/certC2-dash.console.txt`, fps 69, 0 PAGEERROR.

| trial | Space keydown tick | `intent dodge` tick | latency | dash_end | duration | travel |
|---|---|---|---|---|---|---|
| 1 | 333 | 334 | **1** | 349 complete | 15 | 1.800 u |
| 2 | 427 | 428 | **1** | 443 complete | 15 | 1.800 u |
| 3 | 527 | 528 | **1** | 543 complete | 15 | 1.800 u |
| 4 | 627 | 628 | **1** | 643 complete | 15 | 1.800 u |
| 5 | 709 | 710 | **1** | 725 complete | 15 | 1.800 u |

0-1 tick gate met on 5/5; 15 ticks = 0.25 s and 1.8 u match BUILD_BRIEF §5.

I-frames — `cmd('hitOnce',0)` (8 dmg) issued mid-dash, then again after `dash_end`:

| trial | keydown | intent | mid-dash hit (tick, dashTicksLeft) | result | HP | dash_end | after-dash hit | result | HP |
|---|---|---|---|---|---|---|---|---|---|
| i1 | 807 | 808 | 810 (13) | `{immune:true}`, `hit_immune t810 target0 reason iframe` | 100->100 | 823 | 828 | `{amount:8}`, `sound hit` + `hit t828 target0 amount 8` | 100->92 |
| i2 (double) | 916 | 917 | 918 (14) + 920 | `hit_immune t918`, `hit_immune t920` | 100->100 | 932 | 937 | `hit t937 amount 8` | 100->92 |
| i3 | 1029 | 1030 | 1031 (14) | `hit_immune t1031` | 100->100 | 1045 | 1050 | `hit t1050 amount 8` | 100->92 |

Natural attack through the dash (bite trial 1): a Thorn Boar spawned 0.55 u east
of the player (boar i-framed so allies cannot kill it mid-probe). Bites at
**t1160 -> `hit 8`, HP 100->92**; KeyD+Space at t1204/1205 -> `intent` t1206,
dash span [1206,1221]; **bite t1208 INSIDE the dash -> `hit_immune reason iframe`,
HP stayed 92** (hp trace `1206:92d 1207:92d 1209:92d ... 1220:92d 1222:92`);
bites **t1256 and t1304 after dash_end -> `hit 8` each, HP 92->84->76**.
Whole-capture summary: `hitsOnPlayerDuringDash []`, `immuneOnPlayer` at
810/918/920/1031/1208 (all `iframe`), `intent_denied []`. Bite trial 2 could not
spawn its boar (same as round 1; trial 1 is the evidence).

## C3 Telegraphs — MET (events)
`captures/certC2-tele.console.txt` — startRun then a driver loop of **85.9 s /
5154 ticks** of real Act-1 play (rooms 1->4; drafts declined, first door chosen,
shop advanced — no command ever touched an enemy or a telegraph), fps 78.7,
0 PAGEERROR. Bus listeners on `telegraph_start` / `telegraph_resolve` /
`enemy_fire` / `death`.

**13 `telegraph_start`, every one planned `resolveTick - tick = 42` (minPlanned
42 / maxPlanned 42). 7 resolved, gap 42 / 42 / 42 / 42 / 42 / 42 / 42
(minGap 42, maxGap 42)** — ids 6 @737->779, 47 @1283->1325, 101 @3178->3220,
127 @3835->3877, 149 @4480->4522, 172 @4788->4830, 194 @5241->5283 — and every
resolve tick carries the matching `enemy_fire` (`fireAtResolveTick 7/7`).
The other 6 never resolved because the caster died inside its wind-up, never
early: id 31 start 1067 / resolve 1109 / **death 1101**; 47 @1475/1517/**1492**;
84 @2519/2561/**2544**; 102 @3047/3089/**death 3089** (died on the resolve tick,
no fire); 150 @4552/4594/**4572**; 149 @4672/4714/**4675**.
No telegraph resolved in fewer than 42 ticks. Gate >= 42 ticks: **met, exactly 42**.

### C3 pixels — Ember mid-telegraph — MET
A headless `page.screenshot` costs ~50 sim ticks here, so it cannot land inside a
42-tick window (both `certC2-tele-mid1.png` / `-mid2.png` came back with
`live []`, afterShotTick 803 vs resolve 779 and 1153 vs 1109 — a harness
limitation, not a game defect). Measured instead with `tools/certC2-gen2.mjs`:
a per-rendered-frame copy of a 360x280 region of the live WebGL canvas centred on
`proj(telegraph.x, 0.02, telegraph.z)`, scored with the SAME band rule as
`tools/analyze.mjs` (hue 5-25 deg, sat > 0.35, luma > 40), peak frame kept and
decoded by `tools/certC2-telesheet.mjs`. `captures/certC2-telepx.console.txt`,
fps 63.7, 0 PAGEERROR.

| crop | telegraph | shot tick / ticks left | full-frame box | danger px | violet | heal |
|---|---|---|---|---|---|---|
| `certC2-telepx-0.png` | id 6, 996->1038 | 1000 / 38 | (638,293,360,280) | **1192** | 0 | 311 |
| `certC2-telepx-1.png` | id 31, 1326->1368 | 1350 / 18 | (538,342,360,280) | **2979** | 0 | 569 |
| `certC2-telepx-2.png` | id 47, 1542->1584 | 1560 / 24 | (932,374,360,280) | **3219** | 0 | 0 |
| `certC2-telepx-3.png` | id 47, 1734->1776 | 1734 / 42 | (892,476,360,280) | **2107** | 0 | 0 |

Viewed: `certC2-telepx-2.png` shows the Ember red-orange concentric telegraph
ring under the targeted party member at in-crop (135-235, 120-180) =
**full-frame (1067,494)-(1167,554)**, plus a red `>>` chevron on the caster->target
line at in-crop (~320,175) = full-frame (~1252,549).
`certC2-telepx-1.png` shows the ring at in-crop (130-215, 130-185) =
**full-frame (668,472)-(753,527)** with an Ember chevron at in-crop (5-45,165-185)
= full-frame (543,507)-(583,527). `analyze.mjs` on the crops:
telepx-1 `HUES danger 2979 heal 569 violet 0`, >160 4.357% / >200 1.802% /
14/16 buckets / FLAT 1.14%; telepx-2 `HUES danger 3219 heal 0 violet 0`,
>160 1.883% / >200 0.523% / 14/16 / FLAT 0.32%. Ember is unmistakably present.

## C4 Hit feedback — events/state (captures/certC2-hits.console.txt)
startRun, player i-framed, natural fight (rooms 1-3, ticks 402->3647, fps 32.7
with the tracer on; drafts/paths/shop advanced by cmd, no command touched an
enemy). Per hit within 2 ticks: numeral = `#dmg-num-layer` MutationObserver row
whose text equals the hit amount, cross-checked against `state().vfx.numerals`
before/after; knockback = victim displacement over the next 8 ticks + `kbTicks`;
sound = `sound` events on t..t+2; hitstop = `hitstop` events + the measured wall
time of the frame on that tick; shake = camera second difference vs a baseline
taken outside kill windows.

**32 hits analysed, tally `{num:32, kb:32, snd:32, all:32}`, `failsCount 0`.**

| element | result | detail |
|---|---|---|
| numeral | **32/32** | a `.dmg-num` carrying the exact amount at t..t+2 for every hit, e.g. t402 "30" at (1091,71,65,57) rgb(244,239,230); t1343 "12" at (1483,717,34,30); t3647 "30" at (378,702,50,43). `vfx.numerals` steps 0->1 on the hit tick on every row |
| knockback | **10/10 non-kill enemy hits** | displacement 0.461 / 0.474 / 0.540 / 0.604 / 0.614 / 0.620 / 0.624 / 0.646 / 0.648 / 0.649 u starting on tick t+0..t+2, `kbTicks` 8-10. The 22 kills remove the body on the hit tick so there is nothing left to displace |
| sound | **32/32** | `sound slot hit` on every hit tick; the 22 kills add `sound slot kill` on the same tick |
| hitstop | **22/22 kills** | `hitstop ticks 3 cause kill` on every kill tick (`causes {"kill:3":22}`); measured wall time of the frame carrying the hitstop 26-102 ms vs a 29 ms median tick gap = the 3-tick freeze is real. No hitstop on the 10 non-kill ranged hits (BUILD_BRIEF §14: 2 ticks on melee-arc connects, 3 on kill blows — the 10 non-kill hits in this window were all ranged `archer_basic`/`detonating_charge`) |
| screenshake | **22/22 kills** | camera jerk 0.0357-0.1088 u/tick^2 in the 12 ticks after each death vs baseline median 0 / p95 **0.0001** (threshold 0.012); 1-5 ticks over threshold per kill |

### C4d room-clearing kill — round-1 must-fix F1 is FIXED
Round 1 rejected on exactly one element: the kill whose tick equals
`room_cleared` drew no damage numeral (4/4 instances). Re-measured on v0.4.43,
`captures/certC2-lastkill.console.txt` (fps 81.3, natural run seed 555, rooms
1-3, player i-framed, no command touched an enemy):

| room clear tick | clearing kill | numeral | evidence |
|---|---|---|---|
| **t2568** | `hit archer_basic 12` -> `death` id 47 at **t2568** = `room_cleared` t2568 | **YES, +0** | `.dmg-num` "12" at **(1478,716,35,31)**; `vfx.numerals` trace `2567:0 2568:1 2569:1 2571:1 2572:1` (the pool is no longer wiped on the clear tick); frame gap on that tick 31 ms |

`clears [2568, 5290, 6007]`, `deaths 32`, `clearingWithNumeral 1/1`,
`otherWithNumeral 31/31`, **`killsMissingNumeral []`**.
Independently reproduced in the `certC2-hits` run: t1343 `hit archer_basic 12` ->
`death` id 47 with `clearsRoom = CLR` and its numeral "12" at (1483,717,34,30).
2/2 same-tick room-clearing kills across two independent runs now carry a numeral,
versus 0/4 in round 1.

## C6 Threat pointers — MET (captures/certC2-threat.console.txt + PNGs)
Natural (room 1 wave 1, tick 650, player at screen (800,427)):
`hud.threat()` -> `gated false, offFrame 2, markersDrawn 2, domMarkers 2,
covered 2, uncued 0`; `#hud-threat` DIV rect (0,0,1600,900), opacity 1,
display block, visibility visible. `.tm` nodes: `translate(444.3px, 876px)` head
rect **(421,859,41,41)** and `translate(1576px, 563.1px)` head rect
**(1564,547,33,33)**; a third `.tm` is pooled at `display:none`.
Forced (player teleported to (-9,6); mantis at (10,-6), boars at (10,6) and
(-10,-6); tick 789): `offFrame 5, markersDrawn 5, domMarkers 5, covered 5,
uncued 0`; head rects **(729,46,32,32), (1565,370,31,31), (1331,1,41,41),
(1565,405,30,30), (1560,54,39,39)**.
Pixels — MET. `captures/certC2-threat-natural-head1.png` (6x crop of the exact
DOM head rect (421,859,41,41) of `certC2-threat-natural.png`) shows the marker
chip: a dark circular plate with a cream/bone arrowhead pointing down-left toward
the off-screen boar. `captures/certC2-threat-forced-cropTR.png` (3x crop of box
(1290,0,310,130) of `certC2-threat-forced.png`) shows two chips — one at
full-frame ~(1365-1400, 8-42) pointing down-left and one at ~(1557-1587, 58-90)
pointing down-right — flanking the Glint counter. `markersDrawn >= 1` in every
sample (2 natural, 5 forced), `uncued 0` in both.

### C4 pixels — per-frame canvas crops around the victim — MET
A headless `page.screenshot` costs ~50 sim ticks and stalls rendering, so a
3-tick flash cannot be caught by screenshots. Measured with `certC2-pxgrab`:
on EVERY rendered frame a 64x88 box of the live WebGL canvas around each enemy
(`proj(e.x, 0.55, e.z)`) is copied into a 2D canvas; a rolling 3-frame buffer per
enemy is frozen on each natural `hit` together with the next 7 rendered frames,
and decoded to PNG by `tools/certC2-sheet.mjs`. Seed 555, room 1, player
i-framed, 0 PAGEERROR. W = share of the box with luma > 230 and sat < 0.18
(white), L = mean luma.

| set | victim / hit | pre-frames (tick: W/L) | flash frames | post | on disk |
|---|---|---|---|---|---|
| 2 | boar id 5, `archer_basic 12`, **survived** | 522: 0/58.2, 525: 0/58.0, 529: 0/56.4 | **533: W 0.702 / L 236.0 / max 254** | 538: 0/55.5, 543: 0/53.9 | `certC2-pxgrab2-sheet.png`, box **(405,311,64,88)** |
| 4 | mantis id 6, `archer_basic 12`, **survived** | 607: 0/54.9, 611: 0/55.0, 615: 0/55.5 | **619: W 0.509 / L 224.9 / max 253** | 623: 0/65.0, 627: 0/73.2 | `certC2-pxgrab4-sheet.png`, box **(1134,418,64,88)** |
| 0 | boar id 4, `piercing_shot 30`, killed | 391/395/397: 0 / L 90-95 | **399: W 0.318 / L 210.5** (and 0.229, 0.197, 0.181 over the next 3) | 406-409: 0 / L 130-141 | `certC2-pxgrab0-sheet.png`, box (1087,115,64,88) |
| 1 | boar id 7, `whirling_guard 20`, killed | 473/478/483: 0 / L 76-85 | **486: W 0.890 / L 245.6 / max 254** | 491: 0.132, 495: 0 | `certC2-pxgrab1-sheet.png`, box (560,612,64,88) |
| 3 | boar id 5, `heavy_slam 34`, killed | 538/543/549: 0 | **555: W 0.701 / L 235.5** | 560: 0.001, 563: 0 | `certC2-pxgrab3-sheet.png`, box (390,317,64,88) |
| 5 | mantis id 6, `archer_basic 12`, killed | 632: 0.002, 636: 0, 641: 0 | **642: W 0.650 / L 231.9** | 647: 0.414, 650: 0.02, 653: 0 | `certC2-pxgrab5-sheet.png`, box (1192,428,64,88) |

**Flash 6/6 (2 non-kill + 4 kills).** Viewed `certC2-pxgrab2-sheet.png` (10 tiles,
3x nearest zoom, full-frame box (405,311,64,88)): tiles 0-2 (t522/525/529) show
the blue-slate Thorn Boar hide with violet spines; **tile 3 (t533, the hit tick)
is the whole body blown to white**; tiles 4-6 (t538/543/549) are back to the
normal blue; tile 7 (t555, the killing `heavy_slam 34`) is white again; tiles 8-9
show the burst fading. The flash occupies exactly one sampled frame (the 3-tick
window the brief specifies) and returns to 0 % white on the next frame.

### C4 pixels — numerals in a real frame + the required 8-frame sequence
`node tools/cert-capture.mjs shot certC2-hitseq --actions tools/actions/certC2-hitseq.json`
takes 8 full-frame shots with a 100 ms wait between them. **Harness note:** each
`page.screenshot` costs ~870 ms / ~52 sim ticks here, so the delivered frames are
t482 / 534 / 588 / 650 / 700 / 757 / 812 — NOT 100 ms apart. This is a harness
limit (round 1 logged the same as advisory A5), not a game defect; the per-frame
canvas sampler above is what resolves the 3-tick flash.
Numerals in PIXELS: `captures/certC2-hitseq_04.png` (shot spans t657-700; hits at
t588 `20`, t635 `12`, t657 `34`) — crop `captures/certC2-hitseq04-num.png`
(4x of box (380,180,200,130)) shows **two cream damage numerals with dark
outlines: "12" at full-frame ~(412,254)-(442,280) and "34" at ~(447,266)-(510,305)**,
floating over the arena floor south-west of the victim. The live DOM read right
after that shot reports `.dmg-num` "34" at (428,209,59,51) — the numeral drifts
upward over its lifetime, which is why the DOM y is above the pixel y.
Other frames carry numerals too: frame 1 "30" (1108,25,54,47), frame 2 "20"
(579,536,51,44), frame 3 "12" (415,268,36,31), frame 5 two "12"s at
(1284,348,36,31) and (1189,337,36,31), frame 6 "10" (871,379,33,29).

### C4b boss stomps — round-1 advisory A2 is also fixed
`captures/certC2-boss.console.txt` (`skipToRoom 8`, Stag 1800 HP, player i-framed,
0 PAGEERROR). Antler Quakes telegraph **exactly 42 ticks**: start 495 -> resolve
537, start 777 -> resolve 819 (planned 42, observed 42, both). Camera second
difference vs a baseline p95 of 0.01726 (threshold 0.0518):

| event | tick | max jerk (u/tick^2) | ticks over threshold |
|---|---|---|---|
| `boss_quake_resolve` | 537 | **0.0807** | 1 |
| `boss_quake_resolve` | 819 | **0.1106** | 4 |
| `boss_trample` | 538 | 0.0807 | 1 |
| `boss_trample` | 688 | **0.1292** | 2 |
| `boss_trample` | 838 | **0.1132** | 6 |
| `death` (add) | 883 | 0.0954 | 2 (with `hitstop 3 kill`) |

Round 1 measured 0.021 / 0.000 on quake resolves ("did not shake the camera",
advisory A2). On v0.4.43 every quake resolve, every trample and the kill shake
the camera above threshold.

### C3 clean frames (no live telegraph, no enemies) — MET
Whole-frame `analyze.mjs` HUES danger band, gate < 500 px:

| frame | state | danger px | >160 / >200 / buckets / FLAT |
|---|---|---|---|
| `certC2-clean-arena.png` | `?scene=arena&seed=555`, no run, **enemies 0 at t320 AND t384** (the shot sits between), 0 telegraph events ever | **45** | 2.591% / 0.408% / 15 / 1.28% |
| `certC2-clean-between.png` | room 1 after `killAllEnemies`, shot fired at t532 with enemies 0 / liveTele 0 (wave 2 spawned at ~t570, after the shot) | **100** | 3.187% / 0.504% / 15 / 1.33% |
| `certC2-clean-cleared.png` | `killAllEnemies` + `clearRoom`, enemies 0 / eshots 0 / teleLive 0 / spawnsSinceClear 0 both before (t540) and after (t598) the shot | **4** | 1.009% / 0.483% / 15 / 56.75% (draft overlay up) |

45 / 100 / 4 px are far under the 500 px gate and under the ~485 px
heal-over-tunic advisory. Ember is reserved for threats: the same analyzer reads
1192-3219 danger px in a 360x280 box on the four mid-telegraph crops.

## C5 Camera — MET (captures/certC2-cam.console.txt + certC2-cam-*.png)
startRun, player i-framed, teleported to (-5,4); hold KeyD 4 s then KeyW 4 s,
sampling the player's projected screen position (`__arenaProbe.stage.camera` +
`Vector3.project`, 1600x900) and the camera position every 250 ms (17 samples per
leg). Central 60% = x 320..1280, y 180..720. fps 54.6, 0 PAGEERROR.

| leg | samples | player sx range | player sy range | max screen jump between samples | inside central 60% |
|---|---|---|---|---|---|
| **KeyD 4 s** (x -4.92 -> 9.72) | 17 | **769-844** | **427-448** | **65.3 px = 4.08 % of width** | **17/17, `outside []`** |
| **KeyW 4 s** (z 4 -> -7.7) | 17 | **1017-1057** | **215-427** | **40.6 px = 2.54 %** | **17/17, `outside []`** |

Gate "no jump > 25 % of the width" (400 px): worst observed 65.3 px.
Smoothing: per-tick camera step median **0.0281 u**, p99 **0.1006 u**; the only
larger step in the whole capture is the arena-entry snap at run start
(1.68 u at t490, before the legs). Extra wall/corner shots (beyond the required
probe): `w-end` player (9.76,-7.7) -> screen **(1015,204)**; `a-wall`
(-9.04,-7.7) -> **(641,204)**; `s-4s` (-11.36,1.82) -> **(385,460)**; `s-wall`
(-11.36,7.7) -> **(327,654)** with the camera clamped at cx -7 / cz 12.388.
`certC2-cam-s-wall.png` viewed: the Healer is fully drawn at the arena's
south-west corner around (285-345, 585-665) with the stone wall and the HUD
command bar both legible — the camera never loses the player.

### C4d numeral audit — wide window, two seeds (round-1 F1 closed)
`tools/certC2-gen4.mjs` -> `certC2-numaudit`: same natural run, but for EVERY
death it dumps the DOM-numeral window **[t-4, t+12]**, the victim's projected
screen position, the render-frame wall gap on that tick and the `vfx.numerals`
trace, so an observer/window artefact can be told apart from a real miss.

| capture | seed | deaths | with exact-amount numeral | missing | room-clearing kills |
|---|---|---|---|---|---|
| `certC2-lastkill.console.txt` | 555 | 32 | 32 | **[]** | t2568 "12" @ (1478,716,35,31) |
| `certC2-hits.console.txt` | 555 | 22 kills of 32 hits | 32/32 hits | **0** | t1343 "12" @ (1483,717,34,30) |
| `certC2-lastkill777.console.txt` | 777 | 35 | 34 (narrow [t-1,t+3] window) | 1 at t3087 — see below | t1394 "12" @ (623,112,44,38), t4765 "18" @ (1056,80,86,75) |
| `certC2-numaudit777.console.txt` | 777 | 35 | **35** | **[]** | t1339 "12" @ (619,112,44,39) onScreen, t4708 "18" @ (1060,82,84,73) onScreen |

The one apparent miss (t3087, `archer_basic 12`, a NON-clearing kill) does not
reproduce: the same seed re-run with the wide window reports `missing []` for all
35 deaths. That run also recorded a **352 ms render stall at tick 3027**, 60
ticks earlier — the MutationObserver stamps `E.tick` when its callback runs, so a
stall pushes the recorded tick outside a 5-tick window. Window artefact, not a
lost numeral.

**Round-1 must-fix F1 is closed: 4 distinct same-tick room-clearing kills across
2 seeds and 4 independent runs all carry their damage numeral (round 1: 0 of 4),
and `vfx.numerals` no longer drops to 0 on the clear tick.**

`certC2-numaudit555.console.txt` (seed 555, wide window): **32/32 deaths with the
exact-amount numeral, `missing []`**; room-clearing kill t1358 "12" at
(1473,716,35,30), victim at world (5.41,4.24) -> screen (1451,818), `onScreen true`,
frame gap on that tick 25 ms. Frame pacing in that capture: median 19 ms,
p99 62 ms, max 89 ms, **0 gaps over 100 ms across 3464 frames**.

`state().vfx.numerals` increments: 30 of 32 hits in `certC2-hits` step the pool
count up within 2 ticks (e.g. t402 `[0,1,1]`, t558 `[1,2,2,2]`, t765 `[0,1,1,1]`).
The 2 exceptions (t1163 `[1,1]`, t1206 `[2,2,2]`) are ticks where an older numeral
expired as the new one spawned so the count stayed flat — both still carry a
`.dmg-num` with the exact amount at (1291,310,43,37) and (1187,265,44,38) in
rgb(244,239,230). Numeral coverage in DOM pixels is 32/32.

## Summary — Responsiveness bar (v0.4.43)

| probe | result | key numbers |
|---|---|---|
| C1 movement latency | **MET** | 20/20 keydowns (KeyD/A/W/S x5) move the player on t0+1 (corrected latency 1; solo re-run 18/20 raw 1, worst raw 2 apart from one 250 ms render stall). 20/20 A/D flips at 100 ms register on t0+1 with **raw latency 1 and no correction needed** in the solo run; velocity-sign trace shows no queued direction |
| C2 dash / i-frames | **MET** | Space -> `intent dodge` on t0+1 in 5/5 trials, 15 ticks / 1.800 u every time; `hitOnce` mid-dash -> `hit_immune reason iframe`, HP 100->100 x4 across 3 trials; the same call after `dash_end` -> `hit 8`, HP 100->92 x3; natural boar bite inside the dash (t1208) immune while bites at t1160 / t1256 / t1304 outside it all land 8 |
| C3 telegraphs | **MET** | 13 `telegraph_start` over 85.9 s, planned gap 42 on all 13; 7/7 resolved at **exactly 42** ticks with `enemy_fire` on the resolve tick; the other 6 casters died inside the wind-up (death tick <= resolveTick), none resolved early. Boss: both Antler Quakes 42 ticks (495->537, 777->819). Ember mid-telegraph 1192-3219 danger px in a 360x280 crop, ring pixel-located at full-frame (1067,494)-(1167,554) and (668,472)-(753,527). Clean frames 45 / 100 / 4 danger px (gate < 500) |
| C4 hit feedback | **MET** | 32/32 hits carry numeral + sound; knockback on 10/10 non-kill hits (0.461-0.649 u, kbTicks 8-10), the 22 kills despawn on the hit tick; `hitstop 3 kill` on 22/22 kills (frame wall time 26-102 ms vs 29 ms median); kill shake 22/22 (jerk 0.0357-0.1088 vs baseline p95 0.0001); flash proven in canvas pixels on 6/6 hits (W 0 -> 0.318-0.890 on the hit tick, back to 0 the next frame). **Round-1 F1 fixed**: 4 distinct room-clearing kills across 2 seeds all draw their numeral; wide-window audits on both seeds report `missing []` over 67 deaths. Boss stomps now shake the camera (round-1 advisory A2 fixed): quake resolves 0.0807 / 0.1106, tramples 0.0807 / 0.1292 / 0.1132, plus 6 first-class `screenshake` events |
| C5 camera | **MET** | KeyD 4 s: player sx 769-844 / sy 427-448, max inter-sample jump **65.3 px = 4.08 % of width**, 17/17 inside the central 60 %. KeyW 4 s: sx 1017-1057 / sy 215-427, max jump **40.6 px = 2.54 %**, 17/17 inside. Per-tick camera step median 0.0281 u / p99 0.1006 u; the only larger step is the arena-entry snap (1.68 u at t490). Corners (327,654) / (641,204) / (1015,204) / (385,460) all inside 320-1280 x 180-720 |
| C6 threat pointers | **MET** | natural `gated false, offFrame 2, markersDrawn 2, domMarkers 2, uncued 0`; forced 5/5/5 with `uncued 0`. Chips drawn in pixels: `certC2-threat-natural-head1.png` is a 6x crop of the exact DOM rect (421,859,41,41) and shows the dark plate + cream arrowhead; `certC2-threat-forced-cropTR.png` shows chips at ~(1365-1400, 8-42) and ~(1557-1587, 58-90) |

Console: **0 PAGEERROR / 0 [error] / 0 [warning] across all 18 certC2 consoles**
(move, move2, dash, tele, telepx, clean, clean-arena, clean-cleared, hits,
hitseq, pxgrab, lastkill, lastkill777, numaudit555, numaudit777, cam, boss,
threat). `version` reads **0.4.43** on every `[DEBUG-API]` line.

## Failures
**None.** All six probes met. Round 1's single must-fix (F1, no numeral on the
room-clearing kill) is verified fixed, and round 1's advisory A2 (no camera shake
on the Antler Quake resolve) is fixed as well.

## Advisories (not blocking)
- **A1 Knockback magnitude exceeds the §14 numbers.** Non-kill enemy hits displace
  the victim **0.461-0.649 u** with `kbTicks` 8-10 (`certC2-hits`), against
  BUILD_BRIEF §14 "0.12 u over 80 ms on basic hits, 0.30 u on skill hits". Round 1
  measured 0.262-0.345 u over `kbTicks` 3-5, so the impulse was lengthened between
  v0.4.16 and v0.4.43. The measurement window is t..t+8 so it includes the enemy's
  own locomotion and is an upper bound; knockback reads clearly either way (the
  crop box in `certC2-pxgrab2-sheet.png` drifts west across the hit). Flagging the
  spec drift, not a responsiveness failure.
- **A2 Two render stalls > 100 ms in one of two seeds.** `certC2-numaudit777`:
  **579 ms at t293** (startRun arena build) and **352 ms at t3027** (mid-run) out
  of 3398 frames; `certC2-move2` shows a ~250 ms stall right after `teleport`
  (rows 509/510/511 then 526). The same probe on seed 555 has **0 gaps > 100 ms**
  in 3464 frames (median 19 / p99 62 / max 89 ms). Block-D territory. The t3027
  stall is also what made one numeral's observer timestamp fall outside a 5-tick
  window in `certC2-lastkill777`.
- **A3 No 2-tick hitstop on non-killing melee-arc connects.** The boss-room capture
  logs **71 `hit` events (43 `ally_basic` + 22 `ally_cast`, Tank `whirling_guard`
  and Swordsman `heavy_slam` included) and exactly 1 `hitstop`, cause `kill`**
  (`certC2-boss` counts). BUILD_BRIEF §14 item 4 asks for a 2-tick global pause on
  melee-arc connects; only the 3-tick kill pause exists. Kill blows are covered
  (22/22 + the boss add), and hitstop is not one of the four per-hit elements the
  REFERENCE_BAR responsiveness line names, so this is advisory.
- **A4 Harness limits (same as round 1's A5).** A headless `page.screenshot` costs
  ~870 ms / ~52 sim ticks here, so `seq <n> 100` delivers frames ~52 ticks apart
  (t482/534/588/650/700/757/812 in `certC2-hitseq`) and a `shot` can never land
  inside a 42-tick telegraph (`certC2-tele-mid1/2.png` both came back with
  `live []`). Per-frame canvas sampling (`tools/certC2-gen2.mjs`, the `grabArm`
  block of `tools/certC2-gen.mjs`) is the reliable way to resolve 3-tick effects.
- **A5 Camera margin at the extreme SW corner.** With the camera clamped at
  cx -7 / cz 12.388 and the player flush in the corner, the body anchor projects to
  **x 327** against the 320 bound of the central-60 % box (7 px of margin) and the
  head to 304, just outside. `certC2-cam-s-wall.png` shows the Healer fully drawn
  and legible at ~(285-345, 585-665); the two required 4 s legs never come close
  (sx 769-1057). Round 1 logged the same corner at 332.
- **A6 `cmd('spawn', ...)` returns null in a room that has just cleared.** Bite
  trial 2 of `certC2-dash` got `spawn: null` at t1350 with the room in transition,
  so only trial 1 produced natural-bite evidence (it is conclusive on its own).
  Identical to round 1.
