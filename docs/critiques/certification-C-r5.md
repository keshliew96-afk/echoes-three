STATUS: COMPLETE
VERDICT: PASS — all six responsiveness probes met on v0.4.63 (seed 555). C1 corrected latency 1 tick on 39/39 keydowns + 20/20 A/D flips; C2 dodge fires at t0+1 on 17/17, i-frames hold (0 of 20 natural bites land inside a dash, 8 read hit_immune, cmd hits 3/3 immune mid-dash and 3/3 land after); C3 58/58 telegraph pairs at exactly 42 ticks plus 3 boss quakes at 42, Ember 6732-9739 danger px mid-telegraph vs 11 px clean; C4 49/49 hits carry flash + numeral + knockback + sound (233/280 in the crowded run, residuals accounted), arc hitstop 15/15, 64/64 kill shakes, 3/3 quake + 6/6 trample shakes, flash and numeral proven in harness pixels; C5 player inside the central 60 % on 33/33 samples, worst jump 42 px; C6 markersDrawn 2/3/1/4 with uncued 0 and chips located in pixels. 0 PAGEERROR on every cited capture. No mustFix; 6 advisories.

# Certification C round 5 - Responsiveness bar

Critic: certification-C-r5 (fresh context). Harness: tools/cert-capture.mjs, seed 555, dev server http://127.0.0.1:5199.
All captures prefixed certC5-.

## Probe log

## C1 Movement latency — MET

`captures/certC5-move.console.txt` / `certC5-move.png` (v0.4.63, seed 555, fps 40.3 shared server, 0 PAGEERROR, exit 0).
Setup: `startRun`, wait for >=2 live enemies (t190, 4 enemies), `teleport(-3,2)`, `iframe(0,7200)` on the player and every
enemy, two extra boars at (9,-6)/(-9,-6) so room 1 never clears (`room_cleared 0`, `hitsOnPlayer 0`, 9 enemies alive at end).
Method: rAF sampler writes one row per NEW sim tick `[tick,x,z,dashTicksLeft,hp,wallMs]`; a capture-phase DOM `keydown`
listener stamps `E.tick` (t0). Latency = first row whose displacement along the pressed axis >= 0.02 u (walk speed 0.04 u/tick).
`corrected = raw - (span-1)` where span = ticks elapsed since the previous rendered row (every raw>1 row carries exactly
`span x 0.04 u`, i.e. the sim moved on every tick since t0+1 and the render frame skipped).

| key | 5 trials raw/corrected (t0 -> moveTick) | worst raw | worst corrected |
|---|---|---|---|
| KeyD | no-ref (t227 = sampler-arm tick), 2/1 (371->373), 2/1 (501->503), 2/1 (636->638), 1/1 (769->770) | 2 | **1** |
| KeyA | 1/1 (273->274), 2/1 (403->405), 2/1 (536->538), 2/1 (669->671), 2/1 (802->804) | 2 | **1** |
| KeyW | 5/1 (305->310, d 0.20 = 5x0.04), 2/1 (436->438), 2/1 (569->571), 1/1 (703->704), 1/1 (836->837) | 5 | **1** |
| KeyS | 2/1 (338->340), 2/1 (468->470), 2/1 (602->604), 3/1 (737->740, d 0.12), 2/1 (869->871) | 3 | **1** |

`n 40 (39 valid), worstRaw 5, worstCorrected 1, rawOver2 5` — every raw>2 row is render quantisation (d = span x 0.04 exactly).

**Alternation 10x KeyD/KeyA at 100 ms (20 flips):** `flips 20, worstRaw 4, worstCorrected 1`; every flip registers on the
next sampled tick after its keydown (spans 1-4, d = span x 0.04). x-velocity sign trace (tick+sign) from `mark2 920`:
```
9220 924+ 926+ 928+ 930- 931- 933- 934- 937+ 939+ 940+ 942+ 944- 946- 948- 952+ 953+ 955+ 956+ 958- 960- 961- 963- 964+
967+ 970+ 973- 974- 976- 9770 979+ 981+ 983+ 984+ 986- 988- 989- 991- 992+ 994+ 995+ 997+ 998+ 999- 1000- 1003- 1005- 1006+
```
(KeyD t0 922 -> + at 924; KeyA 928 -> - at 930; KeyD 934 -> + at 937; KeyA 942 -> - at 944; ... KeyA 1055 -> - at 1056.)
No queued direction, no overshoot after a flip. Gate <= 2 ticks: **met** (corrected 1 on 39/39 + 20/20 flips).

## C2 Dash / dodge — part 1 (latency + cmd i-frames) — MET

Dash key **Space** (docs/BUILD_BRIEF.md section 3 line 96 "Space | Dodge roll (i-frames)"); the sim emits
`intent{kind:'dodge'}` then `dash_end{cause}`; `party[0].dashTicksLeft` counts 15 -> 0.
`captures/certC5-dash.console.txt` / `certC5-dash.png` (v0.4.63, seed 555, fps 42, 0 PAGEERROR, exit 0). Same hold-open
setup as C1; each dash paired with a held KeyD/KeyA (alternating) so the player never pins on a wall.

| trial | Space keydown tick (DOM) | `intent dodge` | latency | `dash_end` | duration | travel |
|---|---|---|---|---|---|---|
| 1 | 197 | 198 | **1** | 213 complete | 15 | 1.84 u |
| 2 | 301 | 302 | **1** | 317 complete | 15 | 1.84 u |
| 3 | 403 | 404 | **1** | 419 complete | 15 | 1.84 u |
| 4 | 504 | 505 | **1** | 520 complete | 15 | 1.84 u |
| 5 | 603 | 604 | **1** | 619 complete | 15 | 1.84 u |

Gate 0-1 tick: **met 5/5**.

**I-frames vs `cmd('hitOnce',0)`** (global player i-frame cleared with `iframe(0,0)` first; enemies stay i-framed but
active, so natural bites also land between trials — hits at 792/831/833/881/886/907/929/934/935):

| trial | dash seen (dashTicksLeft) | mid-dash `hitOnce` | HP | dash over | post-dash `hitOnce` | HP |
|---|---|---|---|---|---|---|
| 1 | t727 (15) | `{immune:true}`, `hit_immune t727 iframe` | 100 -> **100** | t743 | t750 `{amount:8}` (+`hit t750 8`) | 100 -> **92** |
| 2 | t835 (14) | `{immune:true}`, `hit_immune t835 iframe` | 68 -> **68** | t849 | t855 `{amount:8}` (+`hit t855 8`) | 68 -> **60** |
| 3 | t942 (13) | `{immune:true}`, `hit_immune t942 iframe` | 12 -> **12** | t955 | t961 `{amount:8}` (+`hit t961 8`) | landed (a natural 12 hit shares t961) |

Bonus: a NATURAL bite at **t838** (inside dash 834-849) reads `hit_immune iframe`; the bites at t831/t833 (1-3 ticks before
that dash) landed for 8 each. `hit_immune` ticks on the player: 537, 606 (inside dashes 505-520 / 604-619), 727, 835, 838, 942.
Note: no `sound` event carries a dodge/whoosh slot (`soundDodge []`) — recorded as an advisory, the bar's sound-slot
requirement is on hits.

## C2 Dash / dodge — part 2 (NATURAL attacker) — MET

`captures/certC5-dash-nat.console.txt` (v0.4.63, fps 80.6, 0 PAGEERROR, exit 0). A Thorn Boar (id 8) spawned 0.7 u from the
player at (-3,2.7), every other enemy i-framed; the player dodges 12x alternating KeyD+Space / KeyA+Space at 1.2 s spacing,
auto-healed above 70 HP between dashes (never during one).

| measure | result |
|---|---|
| dashes | **12 / 12 complete**, 15 ticks each, travel 1.80-1.84 u: `[237,252] [319,334] [405,420] [488,503] [572,587] [656,671] [739,754] [824,839] [907,922] [992,1007] [1076,1091] [1158,1173]` |
| Space keydown -> `intent dodge` | **1 tick on 12/12** (236->237, 318->319, 404->405, 487->488, 571->572, 655->656, 738->739, 823->824, 906->907, 991->992, 1075->1076, 1157->1158) |
| natural `hit` events on the player | **20** (t186, 234, 571, 711, 879, 1027, 1044, 1075, 1075, 1111, 1123, 1128, 1150, 1153, 1198, 1207, 1219, 1234, 1246, 1255) |
| of those, landing INSIDE a dash window | **0** (`hitsInsideFullDash []`) |
| natural attacks that arrived inside a dash | **8**, all `hit_immune reason iframe`: t497 in [488,503], t578 in [572,587], t663 in [656,671], t831 in [824,839], t996 in [992,1007], t1080 in [1076,1091], t1159 + t1171 in [1158,1173] |
| controls | bite at **t571** (1 tick before dash 572) lands for 8; bites at **t1075** (1 tick before dash 1076) land for 8+8; the bite at t1198 (25 ticks after dash 1173 ends) lands for 8 |

Gate (dodge has i-frames; fires on keydown): **met** on both the cmd and the natural attacker.

## C3a Telegraph events, natural Act-1 play — MET

`captures/certC5-tele.console.txt` (v0.4.63, seed 555, fps 83.3, 0 PAGEERROR, exit 0). `startRun` at t258 then **4123 ticks =
68.7 s** unattended (rooms 1 -> 2 -> 3, `room_enter` t258 kill_all / t1357 defend / t4099 kill_all, 8 waves, 27 deaths). A
background driver only declines drafts / picks door 0 / re-i-frames + heals the player — no command touched an enemy or telegraph.

| id | start | planned resolve | planned gap | observed resolve | observed gap | `enemy_fire` | caster death |
|---|---|---|---|---|---|---|---|
| 6 | 567 | 609 | 42 | **609** | **42** | 609 | 624 |
| 31 | 897 | 939 | 42 | — | — | — | **931** (died in wind-up) |
| 47 | 1113 | 1155 | 42 | **1155** | **42** | 1155 | 1322 |
| 47 | 1305 | 1347 | 42 | — | — | — | **1322** |
| 85 | 2357 | 2399 | 42 | — | — | — | **2382** |
| 103 | 2885 | 2927 | 42 | — | — | — | **2927** (died on the resolve tick) |
| 102 | 3016 | 3058 | 42 | **3058** | **42** | 3058 | 3186 |
| 128 | 3678 | 3720 | 42 | **3720** | **42** | 3720 | 3738 |
| 149 | 4375 | 4417 | 42 | — (capture ended t4381, still winding up) | — | — | — |

`starts 9, minPlanned 42, maxPlanned 42, resolved 4, minGap 42, maxGap 42, belowGate 0, fireAtResolve 4/4,
unresolvedWithoutDeath 0, minInterStart 131`. Gate >= 42 ticks (0.7 s): **met, exactly 42 on every pair**.

## C3c High-N telegraph confirmation — MET

`captures/certC5-tele2.console.txt` (v0.4.63, seed 555, fps 90.9, 0 PAGEERROR). Six Spitting Mantises kept alive around the
i-framed player for 65 s (t224 -> t4125): **55 `telegraph_start`, 54 resolved, `minPlanned 42 / maxPlanned 42`,
`minGap 42 / maxGap 42`, `belowGate 0`, `fireAtResolve 54/54`, `unresolvedWithoutDeath 0`, `minInterStart 72`** (the
governor's 72-tick spacing). Stream: `4@225->267, 5@297->339, 6@369->411, 4@441->483, 5@513->555, 6@585->627 ...
5@4041->4083, 6@4113->(4155, still winding up at capture end t4125)`. Every wind-up in 58 pairs across two captures
(C3a 4 + C3c 54) is exactly 42 ticks = 0.700 s. Gate >= 42: **met**.

## C4e Numeral coverage at NATURAL hit density (no pinning) — MET

`captures/certC5-numaudit.console.txt` (v0.4.63, seed 555, fps 82.6, 7614 rendered frames, 0 PAGEERROR). `startRun` +
background driver (declines drafts / picks door 0 / i-frames + heals the player), rooms 1 kill_all t188 -> 2 defend t1287 ->
3 kill_all t4025, `room_cleared` at t1252 and t3987. A rAF tracker watches `#dmg-num-layer .dmg-num` bboxes + text each frame.

| measure | result |
|---|---|
| enemy `hit` events | **37** (25 of them kills) |
| numeral with the same value appearing within t-1..t+2 of the hit | **37 / 37** (`numeralFresh2 37`, `missing []`) |
| `sound` event within t..t+2 | **37 / 37** |
| `state().vfx.arena.numerals` pool stepped up across the hit | 35 / 37 (the 2 others are same-tick recycles at pool cap, `[1,1]`, the numeral itself is in the DOM: `12@1288,312` t1072) |
| kills with `screenshake` within t..t+2 | **25 / 25** |
| kills with `hitstop` within t..t+2 | **25 / 25** (`3:kill`) |
| the ROOM-CLEARING kill (round-1 must-fix) | t1252 `archer_basic 12` on the last enemy -> numeral **`12@1478,716`** drawn (`clearingKills` shows it, not missing) |
| render frame gaps | n 3811, median 16.9 ms, p99 29 ms, max 93.6 ms, **over 100 ms: 0** |

Numeral colour on every enemy hit `rgb(244, 239, 230)` (Parchment). Sample rows (tick, source, amount, numeral@x,y):
`311 piercing_shot 30 -> 30@1089,72 | 398 whirling_guard 20 -> 20@582,536 | 445 archer_basic 12 -> 12@421,294 |
467 heavy_slam 34 -> 34@446,258 | 1115 volley 14 -> 14@1186,267 | 1189 detonating_charge 12 -> 12@1495,635`.

## C3b Telegraph pixels — Ember mid-telegraph — MET

`captures/certC5-telepx.console.txt` (v0.4.63, seed 555, fps 82, 0 PAGEERROR). A `{type:'loop'}` polls the event ring for a
live `telegraph_start` whose `resolveTick` is still >= 32 ticks away, stamps `__proj(x,0.02,z)` through
`__arenaProbe.stage.camera`, then fires a real harness `{type:'shot'}`; a post-shot eval confirms the same telegraph.
Boxes are 360x280 centred on the projected telegraph position, measured with `node tools/analyze.mjs --box`.

| shot | pre-shot tick / ticks left / id / target | projected telegraph (x,y) | box | HUES danger | heal | violet | post-shot |
|---|---|---|---|---|---|---|---|
| `certC5-teleshot1.png` | t821 / 39 left / id 6 (mantis at 1166,462) / ally 3 | **(818,433)** | (638,293,360,280) | **6732** | 260 | 6 | t864, telegraph resolved (fired t860) |
| `certC5-teleshot2.png` | t1150 / 40 left / id 31 (mantis at 351,523) / ally 2 | **(718,482)** | (538,342,360,280) | **6780** | 165 | 0 | t1224, resolved |
| `certC5-teleshot3.png` | t1366 / 40 left / id 47 (mantis at 1516,608) / ally 3 | **(1112,514)** | (932,374,360,280) | **9739** | 0 | 4 | t1407, resolved |

Whole-frame danger 14058 / 11575 / 16342 px on the same three frames (each has a live lane; whole-frame >160 4.85 / 4.72 /
3.83 %, 16/16 buckets, FLAT 1.6-1.8 %).
Viewed `certC5-teleshot1.png`: a bright red-orange **chevroned shot lane** runs from the targeted Healer's ring at full-frame
**~(850,430)** rightward to **~(1090,490)**, pointing at the Spitting Mantis standing at ~(1166,462); the HUD reads
WAVE 1/3 1 LEFT. Viewed `certC5-teleshot3.png`: the Tank stands inside a glowing orange ring at **~(1075,480)-(1165,540)**
with the Ember lane leaving it to the lower right as far as **~(1420,620)** toward the mantis at ~(1516,608); WAVE 3/3
3 LEFT, two Thorn Boars top-right at ~(1250,300)-(1390,400). Ember red-orange is unmistakably present mid-telegraph on all
three real screenshots taken with 39-40 ticks of wind-up left.

## C3d Clean frames (no live telegraph, no enemies) — MET

`captures/certC5-clean.console.txt` (v0.4.63, fps 82, 0 PAGEERROR, exit 0). Room 1 after `iframe(0,60000)` +
`killAllEnemies` at t408. Pre-shot eval t433: `enemies 0, eshots 0, azones 0, zones 0, liveTele 0, ui none`; the harness
screenshot lands inside the ~50-tick window before wave 2 (post-shot t483 reads `enemies 3, eshots 0, liveTele 0`).

| frame | state | HUES danger (whole frame) | heal | >160 / >200 / buckets / FLAT |
|---|---|---|---|---|
| `certC5-clean-between.png` | no enemy in frame, no telegraph event, wave-2 portal glowing violet at ~(1180,100) | **11 px** | 1060 | 4.738 % / 0.720 % / 16 / 1.75 % |
| `certC5-clean.png` (final frame t526) | wave 2 alive but no telegraph | **36 px** | 949 | 3.904 % / 0.613 % / 15 / 1.70 % |

11 px against the 500 px gate (and far under the ~485 px heal-over-tunic advisory); the same analyzer reads 6732-9739 px in a
360x280 box on the three mid-telegraph frames of C3b. Ember is reserved for threats. Gate: **met**.

## C5 Camera — MET

`captures/certC5-cam.console.txt` + `certC5-cam-end.png` (v0.4.63, fps 82.6, 0 PAGEERROR, exit 0). `startRun`, player and
enemies i-framed, `teleport(-5,4)`; the player's world position is projected through `__arenaProbe.stage.camera` every
250 ms while a key is held; the camera's own step is sampled every 16 ms. Central 60 % of 1600x900 = x 320..1280, y 180..720.

| leg | samples | player screen x | player screen y | max jump between samples | inside central 60 % |
|---|---|---|---|---|---|
| **KeyD held 4 s** (world x -4.36 -> 4.60) | 16 | **830 - 840** | **418 - 418** | **7 px = 0.44 % of width** (t373 -> t387) | **16 / 16, `outside []`** |
| **KeyW held 4 s** (world z 3.76 -> -5.68) | 17 | **800 - 817** | **307 - 405** | **42 px = 2.63 %** (t821 -> t837) | **17 / 17, `outside []`** |

Gate "no jump > 25 % of the width" = 400 px: worst **42 px**. Camera step every 16 ms: median **0.0566 u**, p99 0.1023 u,
max 0.1178 u — no snap. KeyD trace (tick, world x -> screen x,y): `373 -4.36 -> 830,418 | 401 -3.24 -> 839,418 |
477 -0.20 -> 839,418 | 537 2.20 -> 838,418 | 597 4.60 -> 838,418` — a 10 px window across 9 world units. The KeyW leg
shows the camera clamp at the arena's north bound: `cam.z` stops at 3.39 from t821 while the player walks on to z -5.68, so
the player's screen y rises 376 -> 334 -> 307 over the last three samples (still 127 px inside the central band); end frame
`certC5-cam-end.png` places the player at **(800,307)** = world (4.88,-5.68). Gate: **met**.

## C6 Threat pointers — MET (DOM + `hud.threat()`)

`captures/certC5-threat.console.txt` + `certC5-threat-natural.png` / `certC5-threat-forced.png` (v0.4.63, fps 82.6,
0 PAGEERROR, exit 0).

| case | `hud.threat()` | off-frame threats (sx,sy) | DOM marker chips (x,y,w,h) |
|---|---|---|---|
| natural (room 1 wave 1, t283, player i-framed) | `gated false, offFrame 2, markersDrawn 2, domMarkers 2, covered 2, uncued 0` | mantis e6 (1851,632), boar e7 (234,1139) | **(420,846,59,59)** rot matrix(-0.63,0.77,..), **(1552,560,49,49)** |
| natural-post (t324, after the shot) | same counts, `uncued 0` | e6 (1719,580), e7 (374,959) | (414,846,59,59), (1552,536,47,47) |
| forced (player at (-9,6); mantis (10,-6), boars (10,6) / (-10,-6); t396) | `gated false, offFrame 3, markersDrawn 3, domMarkers 3, covered 3, uncued 0` | e14 (1730,-53), e15 (2184,390), e16 (736,-40) | **(721,43,47,47)**, **(1554,394,44,44)**, **(1548,47,57,57)** |
| forced-post (t436) | same counts, `uncued 0` | e14 (1690,-37), e15 (2037,350), e16 (793,-9) | (772,46,43,43), (1553,365,45,45), (1547,47,57,57) |

`#hud-threat` computed style `display block, opacity 1, visibility visible` in every sample.

## C4 Hit feedback — MET

Method (both hit captures): a rAF sampler takes one 400x225 downscale of the live WebGL canvas per rendered frame and scores
each enemy's projected 64x88 body box (`fl` = share of pixels with luma > 230 and saturation < 0.18 = "white"); a per-frame
walk of `#dmg-num-layer .dmg-num` records every invisible->visible / text-change transition keyed by element; knockback =
the victim's displacement over t..t+10 projected on the hit's own `dirX/dirZ` (plus `kbTicks` from `state()`); sound =
`sound` events on t..t+2; hitstop = `hitstop` events on t..t+2 plus an independent per-tick wall-dwell detector.

### C4a the four per-hit elements, clean scenario — `captures/certC5-hits2.console.txt`
v0.4.63, seed 555, fps 38.2 (shared server), 1088 rendered frames over sim ticks 441-2209 (1067 ticks sampled),
0 PAGEERROR, exit 0. All four party members i-framed (600-tick refresh every 16 ms) so no contact damage lands and no heal
numeral spawns (`hitsOnParty 0`, `healNumerals 0`); room-1 wave killed, two Thorn Boars spawned 0.55 u beside the Swordsman
and the Tank and re-pinned to 100 % HP every 16 ms (7 respawns after double-hit kills), later wave spawns i-framed,
`room_cleared 0`, `downed 0`.

| measure | result |
|---|---|
| enemy hits analysed | **52** (49 non-killing, 3 kills) |
| damage numeral carrying the exact amount (`#dmg-num-layer`) | **49 / 49** (39 first-visible within 2 ticks; the rest 3-6 ticks = one 38-fps render frame) |
| `state().vfx.arena.numerals` pool steps up across the hit | **48 / 49** (the one flat read, t545 `4>4`, is a same-tick recycle whose numeral `11@983,469` is in the DOM) |
| `sound` slot `hit` on t..t+2 | **49 / 49** (`soundSlots hit 66, kill 11`) |
| knockback along the hit vector over t..t+10 | **48 / 49** >= 0.05 u, median **0.685 u** (melee basics 0.31-0.48 u, ranged / aoe 0.58-0.79 u); `kbTicks` 7-9 on **49 / 49** (the dir-null row t854 lost its victim to a respawn before t+10 and still reads kbTicks 8) |
| white flash on the victim within t..t+2 | **49 / 49**, peak white share 0.418-1.000; pre-hit white 0 on 44/49 (the 5 with pre-hit white >= 0.15 are back-to-back hits 1-8 ticks apart: t782 after 775, 838 after 834, 939 after 931, 2063 x2 after 2062) |
| **all four on the same hit** | **49 / 49**, `fails []` (bar: >= 20) |
| melee-arc connects with a `hitstop` | **15 / 15** (`2:melee_arc 18, 1:melee_arc 1`); arc-tick wall dwell median **52.8 ms** vs baseline 25.7 ms (p99 37.4), 9/15 over 40 ms |
| kills with `hitstop` / `screenshake` | **3 / 3** and **3 / 3**; `deaths 11 = shakes 11`, every shake `cause kill, amp 0.06, 0.12 s` |

Sample rows (tick, victim, source, shape, amount, numeral@x,y(ticks after hit), pool, sound, kb u, kb ticks, flash, pre-flash, body box, hitstop):
```
447 23 archer_basic    projectile 12 12@1015,335(2) 4>5 hit 0.593 7 0.835 0     1079,403 -
461 19 swordsman_basic melee_arc  11 11@1171,422(0) 4>5 hit 0.341 9 0.949 0     1010,458 2:melee_arc
529 23 tank_basic      melee_arc   9 9@1276,381(1)  3>4 hit 0.340 9 0.418 0.068 1104,408 2:melee_arc
558 19 flurry          melee_arc  11 11@1046,473(0) 4>5 hit 0.699 9 0.983 0     1085,534 2:melee_arc
673 19 volley          projectile 14 14@978,417(1)  2>3 hit 0.661 8 0.972 0     1015,487 -
684 23 caltrops        ground_aoe  8 8@965,272(0)   3>4 hit 0.734 8 0.773 0      986,320 -
922 54 ground_crack    ground_aoe 10 10@943,371(3)  4>5 hit 0.669 9 0.901 0     1045,414 -
1223 53 blade_storm    nova       14 14@838,425(0)  0>2 hit 0.695 8 0.997 0.009  821,469 -
1701 54 detonating_charge ground_aoe 18 18@765,385(0) 0>1 hit 0.693 7 0.960 0   775,443 -
```
The only hit >= 16 in this capture (t1701 `detonating_charge 18`, ground_aoe) carries no hitstop — BUILD_BRIEF section 9
item 4 defines hitstop as "2 ticks on melee-arc connects, 3 ticks on kill", so heavy ranged / aoe hits are not owed one.

### C4a' crowded scenario (first pass) — `captures/certC5-hits.console.txt`
Same sampler, three pinned boars, party healed instead of i-framed (133 `+100` heal numerals in the 12-slot pool), fps 41.2,
2153 frames, 0 PAGEERROR, exit 0. **362 enemy hits** (280 non-kill, 82 kills): sound **362/362**, numeral 327/362, flash
273/280, knockback 242/280, all four **233/280**. The 47 residual rows are measurement gaps in a deliberately saturated scene:
6 hits at t218-257 before the sampler armed at t276; 28 `NOKBnull` (the victim was killed by the next hit inside the 10-tick
window, so no t+10 row exists); 10 numeral-text misses while the pool cycled heal numerals; 2 tiny kb (-0.007 / 0.035 u,
opposing hits inside the window); 1 occluded flash (t1865 `sundering_nova`). Hitstop: melee-arc non-kill connects **127/154**
(`2:melee_arc 123, 1:melee_arc 8`), arc dwell median **48.9 ms** vs baseline 17.9 ms (96/145 over 40 ms); heavy (>= 16)
15/24 — the 9 without are 2 `sundering_nova` (nova), 4 `archer_basic 18` (projectile) and 3 `brutal_cleave` arcs that sit
inside the brief's 4-ticks-per-20 stacking cap. Kills: **64 deaths -> 64 `screenshake`**, all `cause kill amp 0.06 0.12 s`;
82/82 killing hits shook, 53/82 got a kill hitstop (the same cap under 64 kills in 2400 ticks).

### C4b flash + numeral in REAL harness pixels — `captures/certC5-hitseq-s0..s7.png`
`node tools/cert-capture.mjs shot certC5-hitseq` with eight `{type:'shot'}` actions 100 ms apart, each preceded by a DOM
stamp (tick, visible numeral boxes, projected enemy boxes, hits in the last 8 ticks). Delivered frames span t276 -> t605
(~47 ticks apart: a headless `page.screenshot` costs ~780 ms here — a harness limit, not a game defect).

| frame | evidence | box | `analyze.mjs` LUMA >160 / >200 |
|---|---|---|---|
| **`certC5-hitseq-s1.png`** | Thorn Boar body **blown to white** | (825,395,90,115) | **95.08 % / 78.98 %** |
| `certC5-hitseq-s2.png` (next frame) | same boar, same box, normal blue-slate hide | (825,395,90,115) | 9.75 % / 1.41 % |
| `certC5-hitseq-s3.png` | same box two frames on | (825,395,90,115) | 33.8 % / 11.0 % |
| `certC5-hitseq-s1.png` | numeral **"11"** (stamp t330: `11@816,374` 35x30) | (816,366,38,28) | 48.4 % / 22.8 % |
| **`certC5-hitseq-s5.png`** | boar id 34 (projected 820,287) **white** under the numeral | (760,265,110,80) | **99.78 % / 91.25 %** |
| `certC5-hitseq-s5.png` | numeral **"12"** (stamp t509: `12@801,229` 40x35) | (800,215,45,30) | 41.9 % / 20.3 % |
| `certC5-hitseq-s6.png` | boar 34 still being hit | (760,265,110,80) | 99.72 % / 90.28 % |
| `certC5-hitseq-s7.png` | boar 34 gone (t605 enemies 42/47/48) | (760,265,110,80) | 14.8 % / 4.5 % |

Viewed `captures/certC5-hitseq-s1-flash.png` (3x of (790,350,150,180)): the Thorn Boar is a solid white silhouette at
full-frame **~(825,395)-(910,510)** with only its blue spine tips showing top-right, the Parchment numeral **"11"** with a
2 px outline sits at **(816,366)-(854,394)** directly above it beside a green "+HP" tick, and the Tank's shield edge is at
the left. `captures/certC5-hitseq-s2-off.png` (same box, next frame): the same boar in its blue-slate hide with violet-blue
spines at ~(835,395)-(950,540) next to the fox Swordsman. `captures/certC5-hitseq-s5-num.png` (3x of (740,200,150,160)):
the numeral **"12"** at **(803,220)-(840,243)** floating above a white-blown body at **~(760,263)-(850,327)** with the
Archer's ear at the top left. The DOM stamps show the same "12" rising from y 229 (t509) to y 188 (t559) — the brief's
rise-and-fade. Flash and numeral are both present in real pixels, on the victim, in the same frame.

### C4d kill hitstop, kill shake and boss stomps — `captures/certC5-boss.console.txt`
v0.4.63, seed 555, fps 40.5, 0 PAGEERROR, exit 0. `startRun` -> `skipToRoom(8)` at t413, player i-framed, party healed,
no command touched the Stag (the `bossHp` pin never fired, see the caveat). Antler Quakes `boss_quake_start` **414 / 696 /
978** -> `boss_quake_resolve` **456 / 738 / 1020** (exactly **42 ticks** each — a third independent C3 dataset); tramples at
457 / 607 / 757 / 907 / 1057 / 1207 (every 150 ticks); three `boss_adds` phases; `runUi().screen` = `end` at t1625 (victory).
`screenshake` **19**: `boss_quake` **3** (each on its resolve tick 456 / 738 / 1020, amp 0.06, 0.18 s), `boss_trample` **6**
(each on its trample tick, amp 0.06, 0.18 s), `kill` **10** (amp 0.06, 0.12 s). `shakeWithin2OfResolve 3/3`,
`shakeWithin2OfTrample 6/6`. Caveat (advisory): in this boot path (camp boot `?seed=555` -> `startRun` -> `skipToRoom 8`)
`E.state()` returned `room null`, `enemies []` and `vfx.arena null` for the whole boss room while the events above prove the
fight ran, so the camera second-difference cross-check got `camSamples 0`; my first attempt's 1927 PAGEERRORs were my own
sampler dereferencing that null and are gone in the re-run.

### C6 pixels + pointer geometry — `captures/certC5-threat3.console.txt`, `certC5-threat2-one.png`, `certC5-threat2-four.png`
Chip crops from the C6 shots (5x nearest-neighbour, viewed): `certC5-threat-nat-m1.png` (box 400,810,120,90) shows the
natural chip at full-frame **(430,858)-(466,892)** — a dark circular plate, pale grey rim and cream arrowhead pointing
down-left at the boar at (234,1139); `certC5-threat-nat-m2.png` (1500,530,100,90) the chip at **(1558,566)-(1594,602)**
pointing right at the mantis at (1851,632); `certC5-threat-forced-top.png` (700,20,140,90) the chip at **(734,50)-(768,86)**
under the WAVE banner pointing straight up at the boar at (736,-40); `certC5-threat-forced-r.png` (1500,370,100,90) the chip
at **(1557,410)-(1592,445)** pointing right; `certC5-threat-forced-tr8.png` (8x of 1530,40,70,70) the chip at
**(1557,59)-(1593,95)** just under the Glint counter. Every DOM marker box of the C6 table is a rendered chip in the PNG.

Direction probe (`certC5-threat3`, v0.4.63, fps 82, 0 PAGEERROR, exit 0; player i-framed at world (-9,6)): each chip is one
`<svg class="tm-rot" viewBox="0 0 42 42" style="transform: rotate(Ndeg)">` holding `circle.tm-plate r17`, `circle.tm-ring
r14.6` and the arrowhead `path.tm-head d="M40 21 L11 6.5 L17 21 L11 35.5 Z"` (tip at +x). DOM rotation vs the bearing from the
player's screen position (~800,450) to the threat:

| sample | threat (sx,sy) | chip centre | rotate() | bearing player -> threat | bearing chip -> threat |
|---|---|---|---|---|---|
| one t318 | mantis (1720,-42) off-frame | (1576,75) | **-28.1** | -28.1 | -39.1 |
| one-post t379 | mantis (1661,-14) | (1576,75) | **-28.4** | -28.4 | -46.3 |
| four t471 | boar e9 (2141,463) off-frame | (1576,458) | **0.6** | 0.6 | 0.5 |
| four t471 | boar e11 (1049,-40) off-frame | (1017,24) | **-63.1** | -63.1 | -63.4 |
| four t471 | boar e10 (671,13) on-frame, above the safe frame | (675,67) | **-106.4** | -106.4 | -94.2 |
| four t471 | mantis e8 (1565,31) on-frame, above the safe frame | (1565,75) | **-28.7** | -28.7 | -90.0 |

`markersDrawn 1 / 1 / 4 / 4`, `uncued 0` in all four samples. The arrow encodes the player-to-threat bearing (matches to 0.1
degree on 6/6 rows); the chip itself sits on the safe-frame edge. Viewed `certC5-threat3-four-top.png` (2x of 600,0,1000,120):
chips at full-frame **(647,50)-(682,85)** (tip up), **(995,5)-(1027,40)** (tip up-right) and **(1530,60)-(1565,95)**;
`certC5-threat3-four-r.png` (4x of 1480,380,120,140): chip at **(1557,440)-(1592,475)** tip right;
`certC5-threat3-one-tr.png` (4x of 1400,0,200,160): the single chip at **(1557,59)-(1595,95)** under the Glint plate. At
-28 degrees the arrowhead's two barbs form a near-horizontal top edge so the glyph reads as a downward triangle at 1x — see
advisory A5. Gate (`markersDrawn >= 1`, markers visible in a shot): **met**.

## Summary — Responsiveness bar (v0.4.63, seed 555)

| probe | gate | measured | verdict |
|---|---|---|---|
| C1 movement latency | <= 2 ticks keydown -> movement, no queuing | corrected **1 tick on 39/39** single presses (raw <= 2 on 34/39, every raw > 2 row carries exactly span x 0.04 u of travel = a skipped render frame) and **1 tick on 20/20** A/D flips at 100 ms; sign trace flips on the next sampled tick, no overshoot | **MET** |
| C2 dash / i-frames | fires on keydown (0-1 tick); immune during, vulnerable after | `intent dodge` at **t0+1 on 17/17** dashes (15 ticks, 1.80-1.84 u); `hitOnce` mid-dash `{immune:true}` + `hit_immune iframe` 3/3 with HP unchanged, post-dash lands 3/3 (-8 HP); natural biter: **0 of 20 bites landed inside a dash**, 8 arriving inside read `hit_immune iframe`, bites 1 tick before a dash land | **MET** |
| C3 telegraphs | every start -> resolve >= 42 ticks; Ember visible mid-telegraph; < 500 danger px with no threat | **58/58 pairs at exactly 42 ticks** (4 natural + 54 high-N) + 3 boss quakes at 42; mid-telegraph danger **6732 / 6780 / 9739 px** in 360x280 boxes on real shots with 39-40 ticks of wind-up left; clean frame **11 px** | **MET** |
| C4 hit feedback | flash + numeral + knockback + sound within 2 ticks on >= 20 hits; hitstop on heavy; shake on kills / boss stomps; pixels | clean run **49/49** all four (numeral 49, pool 48, sound 49, kb 48 dir + 49 kbTicks, flash 49); crowded run 233/280 with residuals accounted; arc hitstop **15/15** (dwell 52.8 vs 25.7 ms) and 127/154; kills **64/64** shaken; boss **3/3** quake + **6/6** trample shakes; pixels: boar box 95 % / 79 % white on `hitseq-s1` vs 9.7 % / 1.4 % next frame, numerals "11" (816,366) and "12" (803,220) over white victims | **MET** |
| C5 camera | player inside central 60 %, no jump > 25 % width | **33/33** samples inside (x 800-840, y 307-418), worst inter-sample jump **42 px = 2.63 %**, camera step median 0.057 u | **MET** |
| C6 threat pointers | `markersDrawn >= 1`, DOM markers visible in a shot | markersDrawn **2 / 3 / 1 / 4**, `uncued 0`; nine chips located in pixels at their DOM boxes | **MET** |

Console: **0 PAGEERROR** on every cited capture (`recon, move, dash, dash-nat, tele, tele2, telepx, clean, hits, hits2,
hitseq, cam, threat, threat2, threat3, boss`); the only warnings are the pre-existing X3595 / X4000 shader warnings. FPS on
solo captures 80-91 (shared-server captures ran at 38-42 with up to five headless browsers on the dev server).

## Failures
None. No mustFix.

## Advisories (not blocking)
- **A1 Heal numerals dwarf damage numerals.** `certC5-hitseq` DOM stamps: `+100` at 209x86 to 268x110 px and `+150` at
  **528x217 px** (t421, x 1158) versus damage numerals 12x21 to 62x54 px (the crit "26"); `certC5-hitseq-s3.png` shows the
  green "+150" filling the top-right quarter, `s4.png` a "+100" at (80,110)-(400,210). 6-10x the linear size of a damage
  numeral; two of them sit at x -80 / -70 (off-screen left). Visual hierarchy, for the art critics.
- **A2 Aged numerals collect at the frame edges.** In every hitseq stamp 4-6 numerals sit within 60 px of the left/right
  edge (`"8"@1560,304 12x21`, `"9"@28,243 13x22`, `"11"@1553,227`, `"12"@1552,270`) at reduced size while every entity is
  within x 800-940, whereas first-visible positions recorded by the tracker are all central (hits2: x 659-1276) — the
  rise-and-fade drift appears to carry old numerals to the edges.
- **A3 No dodge sound slot.** `soundDodge []` across 17 dashes (`certC5-dash`, `-dash-nat`); the bar's sound requirement is
  on hits, which pass 49/49 + 362/362.
- **A4 `E.state()` is blind in the boss room on the camp-boot path.** After `?seed=555` -> `startRun` -> `skipToRoom(8)`,
  `state()` returned `room null`, `enemies []`, `vfx.arena null` for the whole fight while `boss_quake_*`, `boss_trample`,
  `boss_adds` x3, 10 deaths and the victory `end` screen all fired (`certC5-boss`). Debug-API only; the camera-jerk cross
  check could not be sampled.
- **A5 Pointer arrow = player bearing, chip = edge position.** For a threat on-screen just above the HUD band the chip sits
  44 px directly under it but its arrow points up-right (-28.7 vs -90 degrees from the chip, `certC5-threat3` four t471
  e8); at that angle the arrowhead's barbs form a near-horizontal top edge and the glyph reads as a downward triangle at 1x
  (`certC5-threat-forced-tr8.png`). Off-frame threats are unaffected (6/6 rotations match the player bearing to 0.1 degree).
- **A6 Harness cadence.** `page.screenshot` costs ~780 ms on this box, so `seq`/`shot` frames land ~47 ticks apart and a
  3-tick flash can only be caught by luck (it was, twice); shared-server captures ran at 38-42 fps so the per-frame sampler
  skipped 1-2 ticks per frame — accounted for in every latency and numeral window above.

## Captures and tools (all under `captures/`, prefix `certC5-`)
recon, move, dash, dash-nat, tele, tele2, telepx (+ teleshot1-3), clean (+ clean-between), hits, hits2, hitseq (+ s0-s7,
c0-c7, s1-flash, s2-off, s5-num, s4-blob), cam (+ cam-end), threat (+ threat-natural / -forced + chip crops nat-m1, nat-m2,
nat-m2-8, forced-top, forced-tr, forced-tr8, forced-r), threat2 (+ threat2-one / -four + crops), threat3 (+ threat3-* crops),
boss. Generators `tools/certC5-gen.mjs`, `-gen2.mjs`, `-gen3.mjs`, `-gen4.mjs`; crop helper `tools/certC5-crop.mjs`; action
files `tools/actions/certC5-*.json`. Nothing under `src/**` touched.
