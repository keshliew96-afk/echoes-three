STATUS: PARTIAL
VERDICT: (pending)

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
