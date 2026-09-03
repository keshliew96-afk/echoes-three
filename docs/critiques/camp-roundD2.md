# Camp hub & run bookends — Round D re-check verdict (ycp-, v0.4.14 @ 04b015c)

**VERDICT: REJECT** (1 must-fix failure, 6 advisories). Every Round D defect —
F1 combat leak, F2 stale HUD, F3 no collision — and advisories A1 (prompt on the
Tank), A2 (allies off their seats), A3 (opaque Victory wash) is measurably fixed.
The reject is a regression introduced BY the collision fix: the authored west
camp road (hearth -> smithy) is now a dead end, because tent 3, its bedroll and
the forge sit on the road and their new colliders close it. Everything below is
from my own captures (`captures/ycp-*`), `tools/analyze.mjs`, and `__echoes`
probes (`tools/actions/ycp-*.json`). 22/22 captures exit 0 with zero
`[PAGEERROR]`/`[error]`; the only console noise is the known `flatShading`
MeshToonMaterial warning (513x) and a shader `X3595` gradient warning (22x).
src/** untouched.

## Summary (key measurements)

| Check | Result | Evidence |
|---|---|---|
| 1 Combat leaks into camp | **PASS** | 4 returns to camp monitored 391–398 ticks each: the only event after `return_to_camp` is `return_to_camp` itself; enemies `[]`; HP 100/150/95/80 unchanged |
| 2 Stale HUD on bookends / camp | **PASS** | banner `gated:true, show:false, opacity 0`, threat DOM 0 on Victory, Defeat, camp; banner box >200 luma 0.93% / 0.00% / 1.1% vs 7.9–8.1% in live combat; pointer boxes >160 0.000% vs 6.5–10.8% in the control |
| 3 Prop collision | **PASS on solids, FAIL on paths** | hearth stop dist 1.20 u (ring 0.9 + body 0.3); tent stop z −2.04 (was −4.14, through); stall/cart stop exactly 0.30 u off the face; allies drift 0.00 over 331 idle ticks; **west road wedges at (−6.36, 1.80)** |
| 4 Begin-Run prompt placement | **PASS** | prompt (474,67,404,54) top-centre; Tank box (289,840,177,52); `overlaps: []` |
| 5 Victory wash legibility / loop hygiene | **PASS** | Victory FLAT 42.49% (was 59.7%), LUMA >160 4.04%; Defeat violet 190,958 px, "The gods applaud."; 2 cycles: seeds 4057807446 -> 2741985237, wallet 112->0 / 40->0, drafted skill + bench node wiped |
| 6 Static camp frame | **PASS** | LUMA >160 1.916%, >200 0.557%, 16/16 buckets, FLAT 13.05%; reference-bar **20/20**; fps uncontended mean 89 (min 54.9); smoke exit 0 |

Reference-bar score (captures/ycp-boot.png): 1 dead ground 2 · 2 layered light 2 ·
3 silhouette 2 · 4 prop density 2 · 5 VFX layering 2 · 6 colour 2 · 7 post 2 ·
8 grounding 2 (was 1: bodies no longer pass through props) · 9 UI 2 (was 1: no
stale banner/pointer, prompt off the Tank) · 10 motion 2 = **20/20**, no zero.

## Per-item evidence

### 1. No combat leaks into camp — PASS
Event subscriptions (`__ycp.log`, 32 sim types incl. enemy_spawn, spawn_telegraph,
telegraph_start/resolve, enemy_fire, enemy_bite, hit, death, ally_cast, ally_basic,
hitstop, room_cleared, zone/projectile spawns) armed before each run; `since(tick)`
summarises everything after the `return_to_camp` tick.

| Scenario | run_end / wiped | return_to_camp | last probe (ticks after return) | events since return | enemies | party HP |
|---|---|---|---|---|---|---|
| Real boss victory (`ycp-vic-camp.json`: startRun -> skipToRoom 8, 7 adds live, bossHp 0.05 + kill) | 816 | 856 | 1250 (+394) | `return_to_camp` x1 only | `[]` at 913 and 1250 | 100/150/95/80 = max at 913 and 1250 |
| Real defeat (`ycp-def-camp.json`: real W 3300 ms + real E at tick 589, 3 boars alive, setHp 0 x4 at 661) | 662 (`enemy_despawn` x3 @662) | 728 | 1119 (+391) | `return_to_camp` x1 only | `[]` | max, unchanged |
| cmd path, the Round-D leak case (`ycp-vic-cmd.json`: endRun('victory') 700 ms into wave 1 with spawns pending) | 351 | 422 | 820 (+398) | `return_to_camp` x1 only | `[]` | max, unchanged |
| Two-cycle loop, cycle 2 (`ycp-loop2.json`) | 1176 | 1242 | 1640 (+398) | `return_to_camp` x1 only | `[]` | max |

No `enemy_spawn`, `spawn_telegraph`, `telegraph_*`, `enemy_fire`, `hit`, `ally_cast`,
`death`, `hitstop` or `room_cleared` fired after any return (Round D: spawn count
rose 5 -> 8 after `run_wiped`, Archer 80 -> 70, `room_cleared` in camp). No attacks
at the forge/hearth; `captures/ycp-vic-camp.png`, `ycp-def-camp.png`, `ycp-vic-cmd.png`
are clean night-camp frames with the four critters seated. `runState` after every
return: `phase idle, active false, combatActive false, mode camp`.

### 2. No stale combat HUD on the bookends or in camp — PASS
Control frame `captures/ycp-combat2.png` (`ycp-combat2.json`: startRun + 5 far
spawns at the arena corners): banner `WAVE 1/2 · 9 LEFT` at box (653,14,295,35);
threat audit `off 4, drawn 4, dom 4`, pointer SVGs at (0,601,49,50), (0,795,52,56),
(1548,795,52,56), (779,770,42,42) — visible as the chevron chips in the frame.

DOM on the end cards and in camp (all three scenarios + loop2):
`hud.banner()` = `{mode:'none', gated:true, show:false, text:'', opacity:0}`;
`hud.threat()` = `{gated:true, domMarkers:0}`; `hud.combat()` all false.

Pixels, `analyze.mjs --box`:

| Box | combat control | Victory card | Defeat card | camp after victory | camp after defeat | camp after cmd | boot |
|---|---|---|---|---|---|---|---|
| BANNER 644,14,312,35 — LUMA >200 | **8.10%** (+ 68% of px in dark buckets 1–2 = plate) | 0.93% (7/16 buckets, no plate) | 0.00% | 1.14% | 2.23% | 1.14% | 1.14% |
| PTR-LEFT 0,601,49,50 — >160 | **7.84%** | 0.000% | 0.000% | 5.35% | 0.000% | 4.33% | 4.86% |
| PTR-BL 0,795,52,56 — >160 | **6.49%** | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| PTR-BR 1548,795,52,56 — >160 | **8.17%** | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| PTR-BAR 779,770,42,42 — >160 | **10.77%** | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| LEFT strip 0,0,60,900 — >160 | 2.33% | 0.17% | 0.24% | 0.43% | 0.37% | 0.37% | 0.39% |
| BARRIM 503,762,595,48 — >160 | 0.81% | 0.00% | 0.00% | 0.00% | 0.07% | 0.00% | 0.00% |

The camp-after frames equal the boot frame in every box (the PTR-LEFT 4–5% is the
forge lantern pool, present at boot; the banner-box violet 2.3–3.7k px is the portal
ring behind it, boot 3.7k). Round D's `WAVE 1/2 ● 5 LEFT` over the Victory card and
the left-edge pointer are gone.

### 3. Camp prop collision — PASS on solids / FAIL on the west road (F1)
Real `keydown` holds, `campState().player` after `keyup`:

| Probe | Start (teleport) | Input | Stop | Clamp |
|---|---|---|---|---|
| hearth (`ycp-hearth`) | (0.00, 1.90) | W 1500 ms | (0.00, **1.00**) | 1.20 u from the hearth centre = ring 0.9 + body 0.3 (Round D: 0.29 u, inside the fire). `ycp-hearthzoom.png`: feet and ring outside the stones, flame sprite above her head, not over her body |
| tent (`ycp-tent`) | (−4.95, −1.50) | W 1200 ms | (−4.76, **−2.04**) | 1.31 u from the tent centre; slid 0.19 u along the yawed canvas (Round D: −4.14, through the tent). `ycp-tent.png`: stands at the flap beside the bedroll |
| stall (`ycp-stall`) | (6.35, 0.30) | S 1500 ms | (7.48, 1.87) | in the stall's local frame (yaw −0.38): lz = −1.00 = hz 0.70 + 0.30, lx 0.82 < hx 0.90 -> on the north face, slid east |
| cart (`ycp-cart`) | (8.35, 1.20) | W 1500 ms | (9.32, −0.83) | local (yaw 0.42): lz = 0.92 = hz 0.62 + 0.30, lx 0.65 < hx 0.80 -> on the south face |

Free walking (`ycp-paths.json`, `ycp-walk.json`; speed = distance / sim ticks):

| Leg | Start | Input | Stop | Distance / speed |
|---|---|---|---|---|
| gate road south | (0.30, 1.60) | S 164 ticks | (0.30, 7.60) | 6.00 u @ 2.20 u/s, reaches the south wall |
| east road | (2.60, 0.30) | D 164 ticks | (8.68, 0.30) | 6.08 u @ 2.22 u/s |
| gate road north from the seat | (1.35, 1.00) | W 176 ticks | (1.35, −5.48) | 6.48 u @ 2.21 u/s, inside the portal disc |
| seat -> portal, real 2700 ms W | (1.35, 1.00) | W 188 ticks | (1.35, −5.88) | `inPortal true, promptVisible true` |
| **west road** | (−4.00, 1.30) | A 158 ticks | **(−6.36, 1.80)** | **2.41 u @ 0.92 u/s — wedged**; repeat (−6.35, 1.75) |

The west road wedge: tent 3 (spec `['tent', -7.5, 1.5, 1.42, 0.92]`) yields a
collider spanning x −8.46..−6.54, z 0.77..2.23; the bedroll (−6.5, 2.7, yaw 1.5)
spans z 2.41..2.99 and the forge (−6.75, 3.05, yaw 0.36) z 2.46..3.64. The road
(`paths[1]` through (−7.4, 2.4), w 1.6 -> z 1.6..3.2) is covered end to end: the
free gap between tent and bedroll is 0.18 u against a 0.60 u body.
`captures/ycp-westroad.png`: the Healer pinned on the tent's east wall at
~(795,470) with the lit forge ON the dirt track directly south of her; the road
visibly runs into that corner. A W+A diagonal escapes north of the tent to
(−7.05, −1.75), so the camp is not sealed — but the drawn road to the smithy is a
dead end, and Round D had no colliders, so this is a regression introduced by the
F3 fix.

Allies hold their seats (`ycp-seats.json`): `seatDrift {tank 0, swordsman 0,
archer 0}` at tick 351, 682 (331 idle ticks) and 874 (Healer standing in the
portal); sim positions equal the rig positions (−1.95,0.5) / (2.3,0.2) /
(−2.3,−2.5) throughout. Every end-card and camp probe after a run shows drift 0 —
the seats are re-taken on run end (Round D: Archer at (−1.33,−0.43), Tank on the
woodpile). Idle motion is intact: frame diff over `ycp-idle_00..02` (300 ms) —
archer 26.8/8.3%, tank 7.5/9.7%, healer 12.8/10.0%, swordsman 13.7/7.9% pixels
changed vs static bench 0.8/0.8%, ground 0/0%.

### 4. Begin-Run prompt placement — PASS
`ycp-walk.json` (real W 2700 ms): `prompt.visible true, box (473.96, 67, 404.08, 54)`;
critter screen boxes healer (754.8, 257.9, 90.5, 81.8), tank (289.2, 840.3, 176.8,
51.6), swordsman (852.6, 800.5, 137.9, 54.9), archer (345.9, 509, 141.7, 73.9);
`overlaps: []`. `captures/ycp-walk.png` / `ycp-promptzoom.png`: the plate sits over
the treeline above the gate with nothing beneath it; the Tank is 770 px away at the
bottom-left. (Round D: plate at bottom 21% on the Tank and the fire.) Advisory A1
below on the Swordsman under the command bar.

### 5. Victory wash legibility; Defeat tone; two-cycle hygiene — PASS
| Frame | FLAT | LUMA >160 / >200 / buckets | HUEMIX warm/cool | violet px |
|---|---|---|---|---|
| `ycp-vic-card.png` | **42.49%** (Round D 59.7%) | 4.04% / 0.215% / 14 | 98.5 / 0.0 | 0 |
| `ycp-def-card.png` | 23.44% | 1.82% / 0.280% / 13 | 11.8 / 88.1 | 190,958 |
| `ycp-boot.png` | 13.05% | 1.92% / 0.557% / 16 | 26.3 / 70.0 | 8,979 (portal) |

Scene-only (outside the 410x410 card, which is itself a dark flat plate): Victory
left FLAT 39.7% / right 45.6%, luma SD 21.1 / 19.8, textured 8x8 blocks 13.7% /
10.1%; boot 10.4% / 19.7%, SD 35.4 / 28.8, textured 26.5% / 22.3%. Side-by-side
`captures/ycp-vic-vs-boot.png` (250,130,350x350): under the wash the tent, bedroll,
bench, Archer, Tank and their rings all read — legible at roughly half the
contrast. Victory card: headline `VICTORY`, flavour "The Hollow Stag falls. The
wood breathes out.", `washOn true, vignetteOn false`, HP restored to max, allies
re-seated. Defeat: `THE RUN ENDS`, flavour "The gods applaud.", `washOn true,
vignetteOn true` (inset 12%, fade 520 ms), danger 4 px (no red), histogram peak
buckets 5–8 (soft, no crush).

Two full cycles (`ycp-loop2.json`): cycle 1 cmd victory with `giveSkill nova_bloom`,
`wallet 40`, `grantNode sharpen` mid-run (wallet 112, slots
[mending_bolt, swift_mend, nova_bloom], bench [sharpen]) -> after return: wallet 0,
slots [mending_bolt, swift_mend, null, null], bench [], phase idle, enemies [].
Cycle 2 real W walk + real E at tick 1095 (`run_start`, seed **2741985237** vs cycle
1 **4057807446**), wallet 40 + nova_bloom mid-run, real defeat at 1176, return
1242 -> wallet 0, skills wiped, phase idle, enemies [], HP max at 1339 and 1640.

### 6. Static camp frame — PASS
`captures/ycp-boot.png` (no URL params, 1600x900): LUMA >160 **1.916%** (bar 1.5),
>200 **0.557%** (bar 0.4), **16/16** buckets, FLAT **13.05%** (bar <20), HUEMIX warm
26.3 / foliage 3.7 / cool 70.0, SAT 0.592. Hue audit: violet 8,979 px all inside
bbox x 541–934, y 0–145 (the portal ring) — 0 elsewhere; heal-green 3,216 px =
the Healer's Sage identity ring (class accent per §19.1), a bedroll and the F1 HP
bar; danger 935 px = forge glow + tripod wood. Prop types 26 (16 camp + 10 edge).
`ycp-boot50.png` (50%): all four critters identifiable by silhouette + ring.
`ycp-firezoom.png`: two flame tongues + bloomed core + ground pool + rising embers.
`ycp-hudzoom.png`: styled command bar with portraits, HP bars, cooldown slots.

fps (`ycp-fps.json`, 32 samples @250 ms in camp): uncontended **mean 89.0, min 54.9
(one sample), max 161** ; second run mean 61.9, min 41.2 (other critics' Chrome
count rose 8 -> 19 mid-sample); a run concurrent with three of my own captures:
mean 39.0, min 27.4. Headless SwiftShader is CPU-bound and shared; the
uncontended figure meets the >=55 bar. `node tools/capture.mjs shot ycp-smoke`
exit 0.

## Failures

1. **F1 (must-fix, regression from the Round-D F3 fix) — the west camp road is a
   dead end.** Evidence: `ycp-paths.json` / `ycp-westroad.json` westRoad leg from
   (−4.0, 1.3) holding A: 2.41 u in 158 ticks (0.92 u/s vs 2.2 on every other road),
   wedged at (−6.36, 1.80) and (−6.35, 1.75) on repeat; `captures/ycp-westroad.png`
   shows the Healer pinned on tent 3's east wall with the forge on the dirt track
   south of her. Cause: `env/camp/spec.js` places `tent (−7.5,1.5, yaw 1.42)`,
   `bedroll (−6.5,2.7)` and `forge (−6.75,3.05)` on `paths[1]` (through (−7.4,2.4),
   w 1.6); `env/camp/colliders.js` footprints leave a 0.18 u gap on a 1.6 u road.
   Fix direction (either): (a) move tent 3 and its bedroll off the road — e.g. tent
   to z ≈ −0.3 (collider z −1.0..0.5, still south of tent 1's −2.23) and the
   bedroll beside it at (−6.5, −0.6) — so the road's z 1.6..3.2 band is clear
   west of the woodpile, and keep the forge/anvil on the road's SOUTH verge only
   (forge z ≥ 3.35 + 0.3 body); or (b) re-route `paths[1]` to pass north of tent
   3. In both cases add a road-clearance assertion next to `campBoundsOk()` that
   sweeps a 0.6 u circle along each path centreline against
   `buildCampColliders()` so a future prop cannot land on a road again.
   Re-verify with `ycp-paths.json`: westRoad must reach ≥ 4.4 u at ~2.2 u/s from
   (−4.0, 1.3), and the smithy (anvil at (−5.5, 3.7)) must be reachable along the
   drawn road.

## Advisories (not blocking)
- A1 With the camera at the gate, the Swordsman's body (853–991 x 800–855) sits
  under the command bar (503–1098 x 809–900) and the Tank is cut by the frame
  bottom (`captures/ycp-walk.png`). Fade the bar to ~40% when a party body is
  behind it, or bias the follow camera south when the Healer is in the portal disc.
- A2 Victory wash: legible, but scene contrast is halved (luma SD 21 vs 35,
  textured blocks 13.7% vs 26.5%). A small further alpha drop (~0.45 -> ~0.38)
  would keep the warm read and bring more of the hearth ring back.
- A3 fps under concurrent headless load is 27–41; uncontended 82–161. Measure on
  the real GPU path before quoting a number.
- A4 (carried) The hearth is still one bloomed blob with faint tongues
  (`ycp-firezoom.png`); the reference fire shows a distinct white core per emitter.
- A5 The first `cmd('startRun')` after boot reuses the boot seed (loop2: boot
  4057807446 = run 1 4057807446); only run 2 rolled fresh. Fine if intentional
  (`?seed=` forcing), otherwise reroll on every `run_start`.
- A6 Out of camp scope, for the boss critic: 1.5 s after `skipToRoom 8` the banner
  reads `THE HOLLOW STAG 0/200` before any damage, and `cmd('killBoss')` returned
  `null` (no boss entity) in all three boss-room probes while victory still
  arrived 4.4–7.1 s later.

## Capture index
ycp-smoke, ycp-boot, ycp-boot50, ycp-combat, ycp-combat2, ycp-vic-card,
ycp-def-card, ycp-vic-camp, ycp-def-camp, ycp-vic-cmd, ycp-loop2, ycp-hearth,
ycp-hearthzoom, ycp-tent, ycp-stall, ycp-cart, ycp-walk, ycp-promptzoom, ycp-road,
ycp-paths, ycp-westroad, ycp-seats, ycp-idle_00..02, ycp-fps, ycp-fps2,
ycp-viccrop / ycp-bootcrop / ycp-vic-vs-boot, ycp-firezoom, ycp-partyzoom,
ycp-hudzoom (all under captures/; action files under tools/actions/ycp-*.json).
