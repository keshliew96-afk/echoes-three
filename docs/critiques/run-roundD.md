# Run structure critique — Round D (v0.4.13, commit aa3b00a)

Critic: fresh-context, pixels + probes only. All probes are `tools/actions/xrn-*.json`,
all captures `captures/xrn-*` (1600x900, headless SwiftShader). Nothing in src/** was touched.

## VERDICT: FAIL (4 of 6 criteria pass; criteria 5 and 6 fail on measured evidence)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Full 8-room run, 4 kill_all + 2 defend, room 1 forced Skill draft, events per transition | PASS |
| 2 | Path: exactly 2 doors, glyph-only, one skill + one node, free_skill_slots, held-Enter never commits | PASS |
| 3 | Draft: one card, take/decline, no confirm/reroll, substitution line at 4 skills | PASS |
| 4 | Shop: 72 Glint, 25/30/35, any-2-never-3, denial shake, item never greyed, "you own N" | PASS |
| 5 | Boss: bar + plate, brightest thing, violet antlers, 0.7 s quake ring, adds 75/50/25, Victory | **FAIL** |
| 6 | Persistence across boundaries, targeting clears, run end wipes; smoke 0; fps >= 55 | **FAIL** (wipe) |

---

## 1. Full run — PASS
`xrn-fullrun` (seed 777, `captures/xrn-fullrun.console.txt`), driven by `cmd` only:
- `run_start t545 modes [kill_all,defend,kill_all,kill_all,defend,kill_all,shop,boss] defendAt [2,5]` — 4 kill_all + 2 defend, room 1 kill_all.
- Every boundary has `room_cleared` -> `reward_offer` -> `draft_taken` -> `path_offer` -> `path_chosen` -> `room_transition (18 ticks)` -> `room_enter` -> `room_start`. Rooms 1..6 all present; `shop_open t1534 wallet 72`; `boss_spawn t1553`; `boss_adds` at pct 0.75/0.5/0.25; `run_end t1831 victory`; `run_wiped t1831`.
- Room 1 reward is `promised: skill` on all five seeds probed (777, 1, 42, 9001 x2 — `xrn-seed*`); frames on seeds 1/42/9001 are all 4+2 with room 1 kill_all; seed 42 loaded twice gives byte-identical frame + shop stock (determinism).
- Wallet reads 0/12/24/36/48/60 at rooms 1-6 and exactly 72 at the shop, natural path and `skipToRoom` path both.
- Note (not a failure): `reward_offer` appears before `room_cleared` in my ring because run.js reacts inside the `room_cleared` handler; emission order is fine.

## 2. Path screen — PASS
`captures/xrn-path.png`, `captures/xrn-held.png`, `xrn-held-release`:
- `doors` = exactly 2, each `glyphs: [win, reward]` and nothing else; boxes 160x220 at (623,295)/(817,289). Pairings observed across the run: always one `skill` + one `node`, sides pre-rolled (`sides [0,0,1,0,0]`).
- `SKILL SLOTS FREE 1 · NEXT ROOM 2 OF 8` rendered at screen level; type floors minText 16 px / minNumeral 20 px real.
- Held Enter (keydown on the draft, never released, plus 2 extra keydowns): draft committed (`draftTaken [872]`), path stayed `phase: path`, `pathChosen: []`, `held:[Enter] stale:[Enter]` — `captures/xrn-held.png` is the key-held frame showing the doors still up. After keyup + fresh press: `phase: combat, room 2, chosen [921]`.
- Real input: Enter took the draft, D moved focus to door 1 (`focus:1`), Esc on the draft declined (`draft_declined` -> `path_offer`, skills unchanged).
- Advisory: both doors always carry the SAME win glyph (the next room's mode is fixed by the pre-rolled frame), so the win glyph never differentiates the choice. Spec-consistent (§2 "run frame immutable"), but the door reads as a reward pick only.

## 3. Draft — PASS
`captures/xrn-draft.png`, `captures/xrn-subst.png`, `xrn-decline`:
- Exactly one `.rn-card`, buttons `["Take","Decline"]`, no reroll/confirm text (`rerollOrConfirmText:false`). Hint line "A/D or ←/→ choose · Enter commit · Esc decline".
- With 4 skills (gave nova_bloom + sanctuary): `promised: skill -> node:sharpen, substituted:true`, subline "no slot free — offering a Node instead" as its own `.rn-note.rn-subline` at 16 px Bone (rgb 201,194,179), box (651,478,298,29) — visible in `xrn-subst.png` between the card and the buttons. The full run shows the same substitution at rooms 3, 4, 5.

## 4. Shop — PASS
`captures/xrn-shop.png`, `captures/xrn-shop-deny.png`, `xrn-shop-deny.console.txt`:
- Wallet 72 (Pale Gold rgb 217,184,114, 22 px numeral + coin glyph). Stock 25/30/35 on every seed; sum 90 > 72 (never all three), worst pair 65 <= 72 (any two). `affordable:true` on all three at 72.
- Bought 0 and 1 -> wallet 17, `shop_purchase` x2, bench `[siphon, sharpen, detonate]`, `.rn-owned` = "you own 1 · on the bench" x2.
- Third buy at 17 Glint: `currency_denied {node:ascend, price:35, wallet:17}`; plaque translate sampled per rAF: max |dx| 5.24 px, `rn-deny` class held 307 ms then cleared; the Ascend card stayed `opacity:1, filter:none`, same box. `xrn-shop-deny.png` shows the plaque lifted amber mid-shake, card fully legible.
- Sold cards drop to opacity 0.28 with a "SOLD" stamp — that is the departed-to-bench treatment, not a price grey; acceptable.

## 5. Boss room — FAIL
What passes:
- Ornate bar + plate: `.hud-banner.boss` with `hud-bn-label "THE HOLLOW STAG"` (26 px) and `hud-bn-num 150/200`; bar spans x 405-1195 (centre 800 on a 1600 frame) — top-centre. (`xrn-boss.png`, `xrn-bossring_00.png`)
- Antler Quake: `boss_quake_start t352 ... resolveTick 394` -> `boss_quake_resolve t394 telegraphTicks 42` = 0.70 s exactly; second quake t707->749. The Ember ring is on screen in `xrn-bossring_00.png` (danger 50803 px whole frame) and `xrn-boss.png` (14562 px), radius 1.6 u with hazard chevrons.
- Adds: `boss_adds` at pct 0.75/0.5/0.25, 2 boar + 1 mantis each, cap 7 (`xrn-boss`, `xrn-victory`, `xrn-fullrun`).
- Victory: `captures/xrn-victory.png` — warm high-key wash, HUEMIX warm 99.9%, amber 1,023,988 px, `veil rn-victory`, summary card (ROOMS CLEARED 8/8, GLINT 84, seed, length) + "Return to Camp".

What fails:
- **F5a — the Stag is not the brightest light in its room.** Clean frame `captures/xrn-bright.png` (party parked 8 u away, adds killed, no hit flash): boss box (628,64,343,403) LUMA >200 = **0.447%**, >160 = 8.36%; torch boxes measure >200 = **7.80%** (north torch 1020,120), **9.46%** (west torch 300,400), **10.86%** (SE torch 1460,720). Brightest 24-px block in the play area is the north torch at (1056,156) mean luma 205 vs the Stag's best block 191. The builders' "brightest" measurement was taken mid-fight where the hit-flash/heal bursts sit inside the boss box — in `xrn-boss.png` the top-10 blocks are the white burst at (888,432) on the Tank, not the Stag. Fix: give the Stag its own emitter that beats a torch — a chest/antler-rack glow sprite at >=1.3x torch peak, raise the rack's additive halo above the 1.35/0.34 post-fix values while keeping the body emissive envelope capped, and/or drop torch intensity a stop in the boss arena (the brief already asks for the room "a stop darker").
- **F5b — antlers read azure, not violet.** Antler box (700,190,300,140), sat>0.2 px: `xrn-boss.png` 67% in 195-244° (blue) vs 14% within 244-275° (God-stuff Violet #B79CF0 is 259°); `xrn-bossring_04` 62% vs 20%; `xrn-bossring_06` 46% vs 49%. The corrupted monolith in the same frames measures 72% violet / 26% blue — that is the target profile. The project's own analyzer scores violet = **1 px** in the fight-frame boss box and 0 px in the antler box; the "violet 7000+ px" in PROGRESS is whole-frame and comes from the monolith (~6.8k) + the violet HUD bar. In `xrn-bright.png` the Stag reads as a navy quadruped with pale blue-white antlers — Signal Blue territory. Fix: shift the rack material/halo to hue 255-265 (e.g. #B79CF0 core, #F1ECFA peak), keep the vein lines white, and re-measure with `--box` on the antlers until violet >= blue.
- **F5c — invisible immunity ("Hollow Seal").** boss.js clamps HP at each unplayed add threshold until that wave is dead; `xrn-seal`: 24 `boss_absorb` events, 329 damage absorbed in 2.5 s, and `hit` events (16, 13.5, 12, 11 ...) keep landing on the boss so Parchment numerals keep popping on a body that is not losing HP (`xrn-boss.png`: "11"/"12" on the Stag at 100/200 sealed). The banner has no seal marker (classes: label, pips, bar, num — nothing changes while `sealed:true`). This mechanic is not in BUILD_BRIEF §11 and, as shipped, breaks "never encode state by colour alone" in the worst way — it encodes it by nothing. Fix: either remove the seal (brief: adds spawn at thresholds, nothing else) or make it legible: lock glyph on the bar segment + "SEALED — clear the adds" plate text, absorbed hits show a shield glyph instead of a damage numeral, and no hit flash on absorbed instances.
- Minor: `xrn-bright.png` shows an amber ring floating at (795,150) above the Stag's head with the party 8 u away — an unexplained ground zone; check it is not the boss-light pool rendering as a flat disc at the wrong height.

## 6. Persistence / wipe / smoke / fps — FAIL (wipe)
Persistence PASS (`xrn-persist`, `xrn-sockpersist`): across room 1 -> reward -> room 2 HP 40/90 kept, wallet 31 -> 43 (+12 stipend), cooldowns tick uncut (mending_bolt 162 -> 137 -> 81; 196 -> 130 -> 87 -> 34 through reward/room2/shop/boss), bench and sockets (`mending_bolt:0:sharpen`, `swift_mend:0:quicken`) survive reward -> room 2 -> shop -> boss, dodgeReady tick preserved. At the clear tick mark 8 -> null, rally -> null, override 2 -> null, projectiles 2 -> 0. Run end: wallet 0, skills back to the 2 starters, bench [], sockets [], HP full.

**F6 — the wave director survives run end; enemies spawn into the Defeat screen and Camp.** `xrn-defeat-natural` (all four set to 0 HP = the only defeat rule): `run_end t1220`, then `enemy_spawn x4 at t1268` (48 ticks AFTER run_end, during the defeat card), `return_to_camp t1270`, then `hit` events at t1398-1476 in Camp. Camp state: `enemies [{id:18, hp:15, x:-6.4, z:-0.4}]`, HUD banner text **"WAVE 2/2 · 1 LEFT"** over the campfire. `captures/xrn-defeat-natural.png`: the Tank is swinging at a boar next to the camp tents with "14"/"11" numerals and a Ground Crack zone on the camp path. Same via `cmd('endRun','defeat')` (`xrn-defeatleak.png`: "WAVE 2/3 · 4 LEFT", four boars in camp, a "26" numeral, an amber zone ring). This violates §2 "all run state wiped at run end", §13 step 2, and §18 "Corruption never touches Camp". Fix: on `run_end` (both results) stop the director (clear the wave schedule + pending spawn telegraphs), despawn every enemy/eshot/zone, and reset the Zone-2 banner; make `returnToCamp` assert `enemies.length === 0` in debug.

Smoke: `xrn-smoke-arena` (?scene=arena) exit 0, `xrn-smoke-run` (?run=1) exit 0, `xrn-smoke-camp2` exit 0. Two runs (`xrn-bright` first attempt, `xrn-smoke-camp`) hit a 30 s navigation timeout with three critics on the server — harness contention, no PAGEERROR in any capture.
fps: wave room (2-9 entities, moving + firing) min 82.6 / median 158.7; boss room with 4 adds + seal (13 entities) min 82.6 / median 163.9 (`xrn-fps-wave`, `xrn-fps-boss`). Bar >= 55 holds.

## Holistic (REFERENCE_BAR)
- Meta screens (`xrn-draft/path/subst/shop/shop-deny.png`): calm charcoal plates, Parchment ink, no overlaps, all text >= 16 px real, numerals >= 20 px; Zone-1 bar persists beneath. Good.
- Boss frame `xrn-boss.png`: LUMA >160 7.47%, >200 1.91%, 16/16 buckets, FLAT 6.5% — passes the value-range bar, no murk. Ring, chevrons, decals present.
- `xrn-victory.png`: FLAT 60.6% and 13/16 buckets — acceptable for a wash screen, but the card's grey summary labels (Warm Grey on charcoal) are the least legible text in the block; consider Parchment for the numbers.
- Camp after a run (`xrn-defeat-natural.png`) would embarrass the reference: combat banner and enemies in the night camp.

## Failures list (fix directions)
1. F6 Run end does not stop the wave director — enemies spawn during the end screen and persist into Camp with a live WAVE banner. Kill schedule + telegraphs + entities on `run_end`; reset banner.
2. F5a Stag not the brightest emitter (boss box >200 0.45% vs torches 7.8-10.9%). Own emitter on the Stag, torches a stop down in room 8.
3. F5b Antlers measure blue (62-67% at 195-244°) not God-stuff Violet (14-20% at 244-275°); analyzer violet = 1 px in the boss box. Re-hue rack + halo to ~259°, white veins only.
4. F5c Hollow Seal immunity is invisible (no bar marker, numerals + flash still pop on absorbed hits). Remove or make legible per §15.5/§17.
5. Minor: floating amber ring above the Stag in the clean frame; identical win glyph on both doors (advisory).
