# Run structure critique — Round D3 (re-check of round D2, v0.4.15, commit b136898)

Critic: fresh-context, pixels + probes only. All probes are `tools/actions/zrn-*.json` (generated
programmatically, IIFE-wrapped evals), all captures `captures/zrn-*` (1600x900, headless SwiftShader,
`node tools/capture.mjs`). Measurement helper added: `tools/zrn-emit.mjs` (boss-box vs emitter-box LUMA
with the boss box and the HUD band excluded from the emitter boxes, whole-frame LUMA, rack hue histogram,
rack hue-mask PNGs). Nothing under src/** was touched. Another critic was capturing concurrently: three
of my captures hit the harness's 30 s navigation timeout on the first attempt and passed on the re-run
with no page error (`zrn-ttk`, `zrn-fight1`, `zrn-banner-clear`).

## VERDICT: PASS

The D2 failure (Stag dead in 0.95 s, three add phases inside 31 ticks) is fixed and measured as fixed in a
natural room-8 fight with no command touching the boss: **1013 ticks from first hit to death**, three
`boss_adds` beats at t1764 / t2047 / t2287 (gaps 283 / 240, spread 523), four Antler Quake cycles
survived, hit sum 1803.5 vs 1800 max (3.5 overkill on the final 11), zero HP plateaus while hits
landed. The felled plate, the brightest-emitter property, the violet rack, the run-end leak fix and every
listed regression item hold. Two advisories (not failures) are recorded at the end.

## Summary — key measurements

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Boss durability + cadence | **PASS** | `zrn-ttk`: first hit t1578 → `death id4` t2591 = **1013 ticks** (16.9 s); 139 hits, 4 crits, max 34; `boss_adds` t1764 (pct 0.75, 3 spawned) / t2047 (0.5, 3) / t2287 (0.25, 3) — gaps **283 / 240**, spread **523**; `boss_quake_start` t1565 / 1847 / 2129 / 2444 (4 cycles before death), resolves +42 ticks each; 7 tramples; hit sum **1803.5** vs HP 1800 → 0 (overkill 3.5 = last hit 11 on 7.5 HP); plateau samples while hit **0** over 1013 ticks of 25 ms HP samples |
| 1b | Numerals = HP deltas | **PASS** | `zrn-numerals` (MutationObserver on `#dmg-num-layer`): 56 boss hits, hit sum **778 = HP delta 778** exactly (1800 → 1022); 52/56 hits have a same-value `.dmg-num` within 6 ticks; the 4 remainder are the first burst's numerals landing 9 ticks after the t601 hit and two identical "14"s on one tick collapsed by my dedupe — no hit without a numeral, no numeral without an HP drop |
| 2 | Banner truth | **PASS** | `zrn-banner`: 62/62 plate samples while the Stag lived read `<ceil(hp)>/1800` matching a sim sample from the last 300 ms (denominator 1800 every sample; label only `THE HOLLOW STAG`); after `bossHp 0.24` → `bossHp 0` (death t528, 3 adds alive) all 29 samples read **`THE HOLLOW STAG · FELLED`** / **`CLEAR THE ADDS`**, phase stayed `combat` in room 8 for 84+ ticks while adds lived (`captures/zrn-banner.png`); `zrn-banner-clear`: boss death t721, party killed one add t780, `killAllEnemies` t806 → `room_cleared` + `run_end` **t844**, victory card; natural fight: last add death t2902 → `room_cleared` t2984 |
| 3 | Stag brightest emitter, no blowout | **PASS** | boss-box LUMA >200 share vs best torch/brazier box of the same size (boss box + HUD band excluded): idle **7.38% vs 1.27%**, fight1 **12.44% vs 1.04%**, fight2 **5.14% vs 0.60%**, fight3 **12.49% vs 0.87%**; brightest 24-px block inside the boss box **251–253** in every frame vs emitter peaks 206–229; whole-frame >200 **1.28%** idle / **1.73–2.12%** mid-fight (reference 1.43%, old blowout 7%+), >160 3.3–5.3%, **16/16** buckets all frames |
| 3b | Rack violet, not azure | **PASS** (advisory below) | tight rack box, saturated px: idle **255–260°** dominant, violet 49.7% / blue 1.0%, analyzer-gate violet **848** / blue **0**; fight3 **260–265°**, 53.8% / 3.1%, gate 518 / 25; fight2 **245–250°**, 62.3% / 33.1% (the 33% is the crown-lit top of the navy body at 238–243°, bbox 783,241–879,368 — tines/beam/halo violet); fight1 (mid hit-flash) **230–235°** dominant with the blue mass on the flash-lit right beam glow (bbox 799,281–948,368), tine cones still violet |
| 4 | Run-end leak | **PASS** (3 paths) | `zrn-leak-boss` (`endRun('victory')` from room 8 at 1043/1800 with 3 adds active, 2 quakes done): `run_end` + `director_stop` + `run_wiped` t739; end screen 331 ticks later **0 events**, enemies 0, banner hidden; camp 681 ticks: 0 events, HP identical at arrival and +312 ticks. `zrn-leak-defeat` (all four `setHp 0`, Enter on the card, 4 spawn telegraphs pending): 330 / 685 ticks, 0 events. `zrn-leak-cmd` (`endRun('defeat')`, 5 telegraphs pending): 331 / 686 ticks, 0 events. All: `zones:0 azones:0 skillBolts:0 projectiles:0 enemies:0 eshots:0` |
| 5 | Regressions | **PASS** | doors exactly 2, glyph lists `[⛨,✦]/[⛨,◈]`, 160x220 boxes, `SKILL SLOTS FREE 1 · NEXT ROOM 2 OF 8`, floors 16/20; held Enter: `draftTaken [497]`, `pathChosen []`, `held:[Enter] stale:[Enter]`, fresh press → `combat, room 2, pathChosen [637]`; single card (1 visible `.rn-card`), `promised skill → node multiply, substituted:true`, subline `rn-note rn-subline` 16 px rgb(201,194,179) at (651,478,298,29); shop wallet **72**, siphon 25 / multiply 30 / ascend 35, two buys → 17, third → `currency_denied {ascend,35,17}`, plaque shake 3.65 px for 311 ms, card opacity 1; persistence HP `[40,90,95,80]`, wallet 31 → 43, cooldown 159 → 133 → 78 uncut, bench `[sharpen,bounce]` kept across clear → reward → room 2, wiped at `endRun`; victory card on the natural kill (`zrn-ttk.png`: ROOMS CLEARED 8/8, GLINT 84, "The Hollow Stag falls."); `zrn-smoke` (camp boot) and `zrn-smoke-arena` (`?scene=arena&seed=777`) exit **0**; boss-room fps `zrn-fps-boss` min **82.0** / median 82.6 / max 82.6 with 9–14 entities and the Stag alive (1505 → 783 HP) |

Console: **0 `PAGEERROR`, 0 `[error]`** across all 19 zrn captures. Warnings only: the pre-existing
`THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial` spam and the X3595
gradient-in-loop shader warning.

---

## 1. Boss durability + cadence — PASS

`tools/actions/zrn-ttk.json` (`startRun` → `skipToRoom 8`, listeners on the bus, 25 ms HP samples,
400 ms fps samples, 30 s window, no command touches the boss). Timeline (ticks):

```
1564  skip lands: wave_start/room_cleared (room-1 forced clear) + boss_spawn id4, HP 1800
1565  boss_quake_start #1        1607 resolve      1608 trample
1578  FIRST HIT (Archer piercing_shot 30)
1758  trample
1764  boss_adds pct0.75 (3 spawned) — HP 1351 → adds 3
1847  boss_quake_start #2        1889 resolve      1908 trample
2047  boss_adds pct0.5 (3)        gap 283
2058  trample
2129  boss_quake_start #3        2171 resolve      2208 trample
2287  boss_adds pct0.25 (3)       gap 240
2358  trample
2444  boss_quake_start #4        2458 Archer downed   2486 resolve   2508 trample
2591  death id4 — 1013 ticks after the first hit; last hit swordsman_basic 11 on 7.5 HP
2856  Swordsman downed
2902  last add death             2984 room_cleared + run_end + run_wiped (victory)
```

HP every second: 1770, 1540, 1462, 1351, 1257, 1098, 1043, 1000, 887, 663, 550, 488, 382, 238, 130,
30, 18, 0. Damage by source: Archer 758 (basic 414, volley 168, piercing 120, nova 32, charge 24),
Swordsman 653 (basic 412, lunge 104, flurry 55, storm 42, caltrops 40), Tank 392 (basic 180, slam 68,
cleave 64, guard 40, crack 40) — ~107 dps sustained, matching the D2 estimate. The three phases each
spawned 3 (cap never bound; peak adds alive 6). fps while the Stag lived: 43 samples min 82 / median
161 / max 164 (8–15 entities).

## 2. Banner truth — PASS

`zrn-banner`: plate DOM `hud-banner boss show` / `.hud-bn-label` / `.hud-bn-num`. Live tracking window
t312–494 (party chewing 1756 → 1345): every one of 62 samples matched a sim value from the preceding
six 50 ms samples; max instantaneous gap 61 HP (one burst inside the HUD's poll interval), typical 10–20.
`bossHp 0.24` → 432 (phase 1 already fired naturally at t492; the 0.5 / 0.25 phases are gated by the
240-tick spacing and did not fire before the kill). `bossHp 0` at t528 → `death id4` t528 with adds 3;
t612: `THE HOLLOW STAG · FELLED` / `CLEAR THE ADDS`, bar empty, `phase combat room 8 adds 1`, one
mantis still active at far left (`captures/zrn-banner.png`). `zrn-banner-clear` continues: party kills
one add (t780), `killAllEnemies` t806 → `room_cleared` t844 → victory card, plate hidden. In the natural
fight the clear came 82 ticks after the last add's `death` (2902 → 2984), in the driven one 38 ticks
(806 → 844) — the retreat/despawn tail, not a live add.

## 3. Brightest emitter + violet rack — PASS

Frames: `zrn-idle` (party parked 8 u away, adds killed, 3.4 s, HP 1704), `zrn-fight1/2/3` (natural fight,
no boss command, 4 / 8 / 12 s after entry, HP 1301 / 960 / 444, adds 3 / 2 / 7). Boss box = live
`bossfx.screenBox`; emitter boxes = same size centred on each `__arenaProbe.emitters` projection, with the
boss box and the HUD band (y < 64, the plate's white numerals) excluded.

| frame | boss box | boss >200 | best emitter box (excluded px) | boss block24 / emitter peak | frame >200 / >160 / buckets |
|---|---|---|---|---|---|
| `zrn-idle.png` | 621,97,357,414 | **7.38%** | lantern 1.27% (38.9k), brazier 0.63% | 252.9 @781,257 / 225 | 1.282% / 3.34% / 16 |
| `zrn-fight1.png` | 654,161,384,435 | **12.44%** | brazier 1.04% (69.5k), flame 0.79% | 252.9 @846,217 / 218 | 2.098% / 5.26% / 16 |
| `zrn-fight2.png` | 607,151,379,432 | **5.14%** | brazier 0.60%, flame 0.55% | 251.0 @711,287 / 217 | 1.727% / 5.09% / 16 |
| `zrn-fight3.png` | 556,158,382,434 | **12.49%** | brazier 0.87%, monolith 0.71% | 253.4 @772,326 / 229 | 2.123% / 5.12% / 16 |

Rack (tight box = projected antler cone/beam bounds, `tools/zrn-emit.mjs`, saturated px s>0.2 v>0.15;
"tines" = bright AND saturated v≥0.5 s≥0.35 so the dark body and the low-sat halo drop out):

| frame | tight box | dominant cool 5° bin | violet 244–285 / blue 195–244 | gate violet / blue | tines: violet / blue px |
|---|---|---|---|---|---|
| idle | 693,240,204,164 | **255–260** | 49.7% / 1.0% | 848 / 0 | 798 / **0** |
| fight3 | 657,290,211,185 | **260–265** | 53.8% / 3.1% | 518 / 25 | 515 / 0 |
| fight2 | 669,241,211,171 | **245–250** | 62.3% / 33.1% | 3586 / 4890 | 3681 / 2131 |
| fight1 (mid-flash) | 743,281,206,169 | 230–235 | 14.9% / 29.8% | 318 / 1250 | 315 / 1236 |

Hue masks (`captures/zrn-fight1-rackmask.png`, `zrn-fight2-rackmask.png`, red = 195–244°, green =
244–285°): in fight2 the red is the crown-lit top surface of the navy body (238–243°, bbox 783,241–879,368
— D2 measured the same body warm-lit at 0.8% blue); tines, beam and halo are green. In fight1 the body is
flash-grey and the red is the bloom around the flash-lit right beam (sampled beam pixels 241° / 233° /
260° / 265°); the tine cones inside it are green. Round D measured 62–67% blue and 0–1 violet px on the
antler material itself — that is gone in every frame (idle: 0 blue px at either gate). No render file
changed in this commit (boss.js / run.js / banner.js / hud/index.js only), so the flash-time drift is the
same renderer D2 passed; see advisory A.

## 4. Run-end leak — PASS

Three end paths (`zrn-leak-boss`, `zrn-leak-defeat`, `zrn-leak-cmd`), each ended from a live room with
enemies active and spawns pending, each sampled 330 ticks later on the end screen and ~685 ticks later in
camp: `eventsAfterEnd 0` (every spawn / telegraph / wave / hit / zone / boss type on the listener list),
`enemies 0`, `activeEnemies 0`, banner hidden, `return_to_camp enemies=0`, party HP byte-identical at camp
arrival and +5 s, state arrays all zero. The boss-room path is new this round: ended at 1043/1800 with 3
adds fighting and `skillBolts:3` in flight — nothing survived the wipe.

## 5. Regressions — PASS

Listed in the summary table; every number reproduces the D2 values within noise (plaque shake 3.65 px vs
4.99, subline y 478 vs 521 because the substituted card sits higher this seed; everything else identical).
Camp-boot smoke reads 55.2 fps at tick 440 (shader warm-up; D2 saw 24) and the arena smoke 81.3.

---

## Failures

(none)

## Advisories (not failures — recorded for the builder)

A. **Flash-time rack halo drifts to 230–241°.** The Stag is hit every ~7 ticks and the hit flash is a 5-tick
   envelope, so roughly a third of fight frames look like `zrn-fight1.png`: the tine cones stay violet but
   the beam glow / bloom halo over green grass reads periwinkle (dominant 230–235°, 1236 bright-saturated
   blue px vs 315 violet). Over the dirt path or the dark body it stays 245–265°. Fix direction if wanted:
   tint the flash toward the violet peak `#F1ECFA` instead of pure white, or damp the beam/halo emissive
   during the flash so the additive bloom over foliage cannot pull the hue below 245°.

B. **`N ADDS REMAIN` is unreachable.** `src/ui/hud/index.js:160` builds `runBoss = { name, hp, maxHp }`
   from `snap.run.boss`, dropping `adds`, so `banner.js:123` always falls through to `CLEAR THE ADDS`
   (observed with 3, 2 and 1 adds alive). The acceptance line is met either way; pass `adds: b.adds`
   through if the count is meant to show.

C. Observations: the victory card is drawn over the camp scene ~6 s after `run_end` (`zrn-ttk.png`); the
   boss-room clear fires 38–82 ticks after the last add's `death` (despawn tail); the natural fight left
   the AI party at 65 / 10 / 28 / 14 HP with two Downed (no player healing input in the harness).
