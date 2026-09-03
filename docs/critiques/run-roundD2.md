# Run structure critique — Round D2 (re-check of round D, v0.4.14, commit 04b015c)

Critic: fresh-context, pixels + probes only. All probes are `tools/actions/yrn-*.json`, all captures
`captures/yrn-*` (1600x900, headless SwiftShader, `node tools/capture.mjs`). Measurement helpers added:
`tools/yrn-hue.mjs` (5-degree hue histogram per box), `tools/yrn-diag-nav.mjs` (harness load diagnostic).
Nothing under src/** was touched.

## VERDICT: REJECT

Four of the five round-D failures are fixed and measured as fixed (run-end leak, Stag brightest emitter,
violet antlers, Hollow Seal removed). No listed regression (doors, draft, shop, persistence, victory
screen, smoke, fps). The reject is a regression the seal removal exposed: **the Hollow Stag now dies in
0.95 s of contact** — in every natural room-8 fight I ran the boss was dead before the 2.5 s mark, all
three add phases fired inside 31 ticks, and the boss bar reads 0/200 for the remaining ~5 s of the room
while the party mops up adds. The "boss fight" that round D verified (two quakes, three tramples, add
phases 360 ticks apart) no longer exists in the running game.

## Summary — key measurements

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Run-end leak | **PASS** (3 paths) | `yrn-leak-victory/defeat/defeatcmd`: `run_end` + `director_stop` + `run_wiped` on the same tick with 4–5 spawn telegraphs pending; **0 events** of any kind for 319–333 ticks (end screen) and 677–709 ticks (into camp); enemies 0, `return_to_camp enemies=0`, banner hidden, party HP byte-identical at camp arrival vs +5 s |
| 2 | Stag brightest emitter | **PASS** | idle clean frame `yrn-idle3`: boss box >200 **6.50%** vs best torch/brazier box **1.04%**; mid-fight `yrn-fightk1-3`: **14.0/14.4/14.7%** vs torches ≤1.62%; brightest 24-px block of the play area inside the boss box in all 5 frames (mean 250–253 vs torch peak 239–247). Whole-frame >200: idle **0.91–1.12%** (reference 1.43%), mid-fight **2.39–3.07%** (previous blowout 7%+), 16/16 buckets |
| 3 | Antlers violet | **PASS** | tight rack box dominant cool bin **255–260°** (idle1/2/3, fightk1) and **260–265°** (fightk2/3); violet 244–285° vs blue 195–244° share of saturated px: 71.7/1.9, 62.2/0.0, 46.3/1.7, 37.7/0.0, 97.9/1.0 (antler-tip box), 47.8/43.7 (fightk3, add body in box); analyzer-gate violet px in the rack box 35 / 564 / 1145 / 99 / 624 / 876 (round D: 0–1) |
| 4 | Hollow Seal | **PASS (removed)** | `yrn-seal`: 0 `boss_absorb`/seal events; `runState().boss` no longer has `sealed/hpFloor/absorbed`; HP trace 156→93→50→0 straight through 150/100/50 with 0 plateau samples; every boss hit (12,26,14,11,11,12,20,34,11,16) has a matching numeral within 0–2 ticks; sum of hits 167 vs HP delta 156 (= 11 overkill on the last 16 hit); plate classes `label/pips/bar/num` only |
| 5 | Regressions | **PASS** on the listed items | doors exactly 2, glyph-only, one skill + one node, `SKILL SLOTS FREE 1`, held Enter never commits (`yrn-path/held/held-release`); single card + substitution line 16 px Bone at (651,521,298,29) (`yrn-subst`); wallet 72, 25/30/35, deny shake 4.99 px / 296 ms, card stays opacity 1 (`yrn-shop-deny`); HP 40/90, wallet 31→43, cooldowns 169→144→87, bench kept across room 1→reward→room 2, wiped at run end (`yrn-persist`); Victory veil + card + "Return to Camp" (`yrn-victory.png`); `yrn-smoke` + `yrn-smoke-arena` exit 0; boss room fps **min 80 / median 82 / max 82.6** with 9–17 entities (`yrn-fps-boss2`) |
| — | Boss durability | **FAIL** | `yrn-ttk`: first hit t360, dead t417 = **57 ticks (0.95 s)**; 13 hits, 220 dmg; adds at t364/t388/t395; `yrn-fight1/2/3` (natural fight, no boss cmd): boss dead at 2.5 s / 4.5 s / 6.5 s captures, `bossfx.boss=false`, bar "0/200" (`yrn-fight1.png`) |

Console: zero `[error]`/`PAGEERROR` in all 30 captures. Only warnings: `THREE.Material: 'flatShading' is
not a property of THREE.MeshToonMaterial` (1009 lines across the set — noisy, pre-existing) and the
X3595 gradient-in-loop shader warning (25). Five captures hit the harness's 30 s navigation timeout with
other critics on the server; every one passed on re-run with no page error.

---

## 1. Run-end leak — PASS

Three end paths, each with the director mid-wave AND a forced next wave (`cmd('startWave')`) 16 ticks
before the end so spawn telegraphs were pending:

- **`endRun('victory')` + `cmd('returnToCamp')`** (`yrn-leak-victory`): pre-end t1088 room 1 `WAVE 2/3 · 6 LEFT`,
  2 active enemies, 4 `spawn_telegraph` in the last 40 ticks. `run_end t1088`, `director_stop t1088`,
  `run_wiped t1088`. End screen at t1421 (**333 ticks later**): events after end **0**, enemies 0,
  banner hidden. `return_to_camp t1432 enemies=0`. Camp at t1797 (709 ticks after end): events 0, hits on
  party 0, HP `[100,150,95,80]` identical at arrival (t1483) and +314 ticks.
- **Natural defeat** (all four `setHp 0`, then Enter on the defeat card) (`yrn-leak-defeat`): `run_end t471`
  with 5 pending telegraphs; end screen t790 (319 ticks): 0 events; camp t1148 (677 ticks): 0 events, HP unchanged.
- **`endRun('defeat')` + Enter** (`yrn-leak-defeatcmd`): `run_end t497` with 4 pending telegraphs; 332 / 687
  ticks later: 0 events, 0 enemies, banner "" (hidden), HP unchanged. `captures/yrn-leak-defeatcmd.png` is a
  clean night camp — no banner, no numerals, no boar.

State arrays at camp in all three: `zones:0 azones:0 skillBolts:0 projectiles:0 enemies:0 eshots:0`.
Round-D F6 is fixed.

## 2. The Stag is the room's brightest emitter — PASS

Idle (party parked 8 u away via `teleport`/`placeAlly` every 80 ms, adds killed):

| frame | boss box | boss >200 | best torch/brazier box (same size) | brightest 24-px block | whole frame >200 |
|---|---|---|---|---|---|
| `yrn-idle2.png` (2.4 s) | 644,0,313,376 | **6.92%** | 1.25% (@1062,168) | 250 @ (784,116) inside boss box | 1.009% |
| `yrn-idle3.png` (3.4 s, clean, body navy — no flash) | 626,75,348,406 | **6.50%** | 1.04% (@1062,168); others 0.23–0.65% | 252 @ (796,216) inside boss box | 1.116% |
| `yrn-idle1.png` (1.3 s — mid hit-flash, excluded from the claim) | 659,0,281,348 | 7.20% | — | — | 0.913% |

Mid-fight (boss HP clamped ≥ 60% by an interval so it survives — see the failure below for why that
was necessary; party fighting with 4–6 adds, 12 numerals on screen):

| frame | boss box | boss >200 | best torch box | whole frame >200 | >160 | buckets |
|---|---|---|---|---|---|---|
| `yrn-fightk1.png` | 587,206,403,450 | **13.95%** | 1.06% | 3.069% | 7.64% | 16/16 |
| `yrn-fightk2.png` | 609,171,388,438 | **14.41%** | 1.62% | 2.587% | 5.58% | 16/16 |
| `yrn-fightk3.png` | 585,195,398,446 | **14.68%** | 1.36% | 2.393% | 4.53% | 16/16 |

Torch/brazier screen positions came from `__arenaProbe.emitters` projected through the live camera, boxes
the size of the boss box centred on each (fa-bright method). The Stag wins by 5–14x in every frame. Whole
frame is not blown out: idle sits under the reference's 1.43%; mid-fight 2.4–3.1% is above the reference
but well under the 7% blowout, with all 16 luma buckets populated and FLAT 6–7%.

Advisory (not a failure): the crown core saturates to a pure white disc (peak 254) about 60 px across;
in fight frames with the hit-flash on top the head/face is lost in it (`yrn-fightk2.png` at 780,360). The
brief asks for a *warm* feverish boss-light — the ground pool is Hearth Amber but the core reads white.

## 3. Antlers are violet — PASS

Rack boxes are the projected screen bounds of the antler cones/beams (top 45% of the stag's mesh height)
from the live scene, padded 48 px (`rackBox`) or unpadded (`tightRack`). `tools/yrn-hue.mjs`, saturated px (s>0.2, v>0.15):

| frame | tight rack box | dominant cool 5° bin | violet 244–285° | blue 195–244° | analyzer-gate violet / blue |
|---|---|---|---|---|---|
| `yrn-idle1.png` | 721,9,165,133 | **255–260°** | 71.7% | 1.9% | 35 / 0 |
| `yrn-idle2.png` | 712,106,182,145 | **255–260°** | 62.2% | 0.0% | 564 / 0 |
| `yrn-idle3.png` | 706,204,200,162 | **255–260°** | 46.3% | 1.7% | 1145 / 3 |
| `yrn-fightk1.png` | 637,397,233,189 | **255–260°** | 37.7% | 0.0% | 99 / 0 |
| `yrn-fightk2.png` antler tips 690,290,220,110 | — | **260–265°** | 97.9% | 1.0% | 132 / 0 |
| `yrn-fightk3.png` | 667,302,193,190 | **260–265°** | 55.5% | 28.8% (mantis body inside the box) | 876 / 337 |

God-stuff Violet #B79CF0 is 259°; the rack lands on it in every frame. Round D measured 62–67% blue and
0–1 analyzer violet px in the same region. The monolith in the same frames measures 250–255° dominant
(`yrn-idle3.png` box 1270,0,130,100) — the rack is now at least as violet as the corruption prop.
`captures/yrn-idle3-rackcrop.png` (2x crop): violet tines, white vein lines, dark violet-navy body
(body box 740,300,130,150: violet 27.6%, blue 0.8%, warm 71.6% from the boss-light pool).

## 4. Hollow Seal — PASS (removed)

`yrn-seal` (room 8, `bossHp 0.78` at t862, party fights):
- `runState().boss` keys are now `active,cleared,name,id,hp,maxHp,pct,x,z,phasesFired,adds,quake,lunging`
  — `sealed/sealPct/hpFloor/absorbed` are gone. Listeners for `boss_absorb`, `boss_seal_*` fired **0** times
  over 325 HP samples.
- HP samples (25 ms) 156 → 93 → 50 → 0 across t862–t911: zero samples resting at 150/100/50 while a hit landed.
- Boss hits `[12,26,14,11,11,12,20,34,11,16]` (sum 167) vs HP 156 → 0 — the 11 difference is overkill on the
  final 16. Numerals observed in `#dmg-num-layer`: `12@881 26@884 14@887 11@888 11@890 12@899 20@902 34@911
  11@911 16@911` — one numeral per hit, same values, 0–2 ticks later. No numeral without an HP drop.
- `boss_adds` still at pct 0.75 / 0.5 / 0.25 (t856 / t888 / t901, 3+3+1 under cap 7). Plate DOM:
  `hud-banner boss show | hud-bn-label | hud-bn-pips | hud-bn-bar | hud-bn-num` — nothing seal-related, correctly.

## 5. Regressions of previously-passing items — PASS

- **Path** (`yrn-path`, `yrn-held`, `yrn-held-release`): `doors` = exactly 2, glyphs `[win, reward]` only, one
  `skill` + one `node` (sides pre-rolled), boxes 160x220 at (623,295)/(817,289), `SKILL SLOTS FREE 1 · NEXT
  ROOM 2 OF 8`, floors 16/20 px. Held Enter from the draft: `draftTaken [393]`, `pathChosen []`,
  `held:[Enter] stale:[Enter]`; after keyup + fresh press: `phase combat, room 2, chosen [537]`.
- **Draft** (`yrn-subst`): one card, buttons `Take/Decline`, with 4 skills `promised skill -> node:siphon,
  substituted:true`, subline "no slot free — offering a Node instead" as `.rn-note.rn-subline` 16 px
  rgb(201,194,179) at (651,521,298,29).
- **Shop** (`yrn-shop-deny`): wallet 72; siphon 25 / multiply 30 / ascend 35, all `affordable:true`; two buys
  → 17, `shop_purchase` x2, bench `[siphon,siphon,multiply]`; third → `currency_denied {ascend,35,17}`, plaque
  |dx| max 4.99 px, `rn-deny` for 296 ms, Ascend card `opacity 1, filter none`; owned lines "you own 2 · on the bench".
- **Persistence** (`yrn-persist`): room 1 → clear tick (mark/rally/override → null, projectiles 2 → 0, wallet
  31 → 43) → reward → room 2: HP `[40,90,95,80]` kept, cooldowns 169/211 → 144/186 → 87/129 uncut, bench
  `[sharpen,bounce]` kept, dodgeReady 1112 kept; `endRun` → wallet 0, starters only, bench [], HP full.
- **Victory screen on the kill** (`yrn-victory.png`): `veil rn-open rn-victory`, "The Hollow Stag falls.",
  ROOMS CLEARED 8/8, GLINT 84, "Return to Camp"; `run_end` + `run_wiped` + `room_cleared` same tick, enemies 0.
- **Smoke**: `yrn-smoke` (camp boot) exit 0, `yrn-smoke-arena` (`?scene=arena&seed=777`) exit 0.
- **fps** (`yrn-fps-boss2`, boss alive + 4–6 adds, 9–17 entities, right-mouse held): 16 samples min **80.0** /
  median **82.0** / max 82.6. (A first run, `yrn-fps-boss`, read 41.5–55.2 — taken while my own second
  capture chain and other critics were loading the box, and with the boss already dead at 4 entities; the
  quiet re-run is the number.) Fresh camp boot reads 24 fps at tick 348 in `yrn-smoke` (shader warm-up;
  82–84 after a run) — advisory only, the bar is the boss room.
- Round-D minor "floating amber ring above the Stag": explained, not a bug — it is a party ground zone left at
  the boss spawn point (`azones: ground_crack (0,-4.2) r0.9 + caltrops (0,-4.2) r0.7` in `yrn-fightk1`;
  the Tank/Swordsman cast on the Stag in the first 80 ms before my park-interval moved them). Its Hearth
  Amber ring is the party-zone colour. Identical win glyph on both doors is unchanged (advisory, spec-consistent).

---

## Failures

1. **Boss durability regression — the Hollow Stag dies in under one second of contact.** `yrn-ttk` (room 8 via
   `skipToRoom`, no command touches the boss): `boss_quake_start t347`; first hit t360 (Archer `piercing_shot`
   30); HP 200 → 109 by t368 (8 ticks: piercing 30 + volley 14/21c/14 + basic 12); `boss_adds t364 pct0.75`,
   `t388 pct0.5`, `t395 pct0.25` — **all three phases inside 31 ticks** (third wave spawns 1 add because the
   cap is already at 7); `boss_quake_resolve t389`; `death t417 id4` — **57 ticks (0.95 s) from first hit**,
   13 hits, max 34 (`heavy_slam`), one crit. Damage by attacker: Archer 115, Tank 54, Swordsman 62. Every
   natural fight capture agrees: `yrn-fight1.png` (2.5 s after room entry) shows `THE HOLLOW STAG 0/200`,
   no Stag in the scene, `bossfx.boss=false`, room un-dimmed, six adds roaming and the party fighting boars;
   `yrn-fight2/3` likewise (`boss.hp 0` at 4.5 s, `boss null` at 6.5 s, `run_end t706` = victory 6 s after
   entering the room). `yrn-seal` independently shows 200 → 101 in the 23 ticks before my `bossHp` call.
   In round D (v0.4.13, `xrn-boss`) the same fight had the Stag at 100/200 at t768 with two quakes and three
   tramples sequenced — that durability *was* the seal (723 absorbed). Removing it with no replacement leaves a
   200-HP boss against a party whose measured opening burst is ~220 damage in 57 ticks and whose sustained
   output is ~120/s. Consequences: the mid-fight boss frames for item 2 could only be captured by clamping
   HP from the debug API; the boss bar spends ~85% of room 8 reading 0/200; the "boss and adds all dead"
   clear is really "kill 7 adds". Fix direction (pick one, keep numerals honest): (a) give the Stag real HP
   for the kits it faces — at the measured ~120 dps sustained + 220 burst, ≥1500–2000 HP buys the 15–20 s
   needed for two quake cycles and spaced add phases; or (b) a boss-only damage-taken multiplier (~0.12)
   applied *before* the hit event so the numeral still equals the HP delta; or (c) reinstate the seal as a
   fully legible mechanic per round-D F5c (lock glyph on the bar segment + "SEALED — clear the adds" plate
   text, shield glyph instead of a damage numeral, no hit flash on absorbed hits). In every case also enforce
   a minimum gap between add phases (§11 cadence: ≥ one quake cycle, ~4–8 s) so three waves cannot fire in
   half a second. Verify with `yrn-ttk` (`tools/actions/yrn-ttk.json`): `ttkTicksFromFirstHit` must be ≥ 900
   and the three `boss_adds` ticks spread over ≥ 500 ticks with no cmd on the boss.
