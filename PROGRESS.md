# Echoes Web — Live Progress Log

Goal: fully playable, responsive top-down party roguelike ("Echoes" design from
GameStudio) in Three.js, judged against commercial reference screenshots
(docs/REFERENCE_BAR.md). Builder/critic loops per block; critics review rendered
pixels and running gameplay only.

## Status: ▶ Round D2 rejections fixed directly (v0.4.15); D3 critics (run/boss, HUD) verifying; then FINAL certification

### Resume point — do this first
1. Start the dev server (`npm run dev`, port 5199) if it is not up.
2. Round D critic verdicts (fresh-context, own captures, prefixes xrn-/xcp-/xhd-/xfx-):
   - **HUD — PASS** (docs/critiques/hud-roundD.md). Advisories only: two downed
     portraits look identical (keep F-chip / class accent on the downed tile),
     banner fade-out 293 ms is tight, world-space revive ring is oversized.
   - **Camp — FAIL** (docs/critiques/camp-roundD.md): F1 combat leaks into camp
     after run end (wave director keeps spawning; boars bite the party at the
     forge); F2 stale WAVE banner + threat pointers on Victory/Defeat and into
     camp; F3 no prop collision in camp (Healer walks into the hearth / through
     tents). Static camp frame scored 18/20. Note `cmd('win'/'lose')` don't
     exist — use `endRun`.
   - **Run structure — FAIL** (docs/critiques/run-roundD.md): same run-end leak
     (enemy_spawn x4 fires 48 ticks after run_end); Stag not the brightest
     emitter (boss box >200 = 0.45% vs torches 7.8–10.9%); antlers read azure
     (195–244°) not violet (~259°); un-specced "Hollow Seal" immunity absorbs
     damage with no HUD tell. Path/draft/shop/persistence all PASS.
   - **Carried fixes — PASS** (docs/critiques/fixes-roundD.md): Ember band
     41/65 px (bar <500, was 628–1408); all four rings 0.1–7.4° off accent on
     both arcs with 3.8–6.1 px dark rims; Bond ribbons + Sanctuary read over
     bunched bodies; heal bolt core 127–128° (spec 129, was 101); LUMA holds on
     3 variants; fps 163 idle / 83 fight. Advisories: heal glow over the
     Swordsman's wine tunic sums into Ember (up to 485 px, 97% of bar) — make
     body-touching heal layers non-additive; Restorative Wave crest faint;
     telegraph loses ~40% Ember over a bright ring band.
3. NEXT: launch 3 fix builders in parallel, then fresh critics on each:
   - Builder A (owns sim/run.js, sim/waves.js, sim/boss.js, render/boss/**):
     run_end must clear the wave schedule, pending telegraphs, enemies, eshots,
     zones and no-op spawning while `run.active === false`; boss room = Stag
     its own brightest emitter + torches a stop down; rack/halo re-hued to
     violet with white veins; remove the Hollow Seal or give it a lock glyph
     + plate text and suppress numerals on absorbed hits.
   - Builder B (owns scenes/camp.js, env/camp/**, ui/bookends/**, plus a
     collider list handed to sim/movement.js): camp prop colliders for the
     hearth/tents/stall/cart, allies hold their seats, Begin-Run prompt not
     over the Tank, Victory wash less opaque (FLAT 59.7% → camp legible).
   - Builder C (owns ui/hud/**): Zone-2 banner + threat pointers keyed to
     run phase `combat` only, hidden on run_end/return_to_camp; downed-tile
     identity advisory.
4. Then the FINAL block 14: reference-bar certification — score all 10 checks on
   camp/combat/shop/boss frames, prove camp→8 rooms→victory and a defeat loop
   end-to-end at 60fps with zero console errors, fix what it rejects.

### Measured state at pause (v0.4.13) — camp scene vs the binding reference

| Metric | Camp (captures/pause3-boot.png) | Reference frame | Gate |
|---|---|---|---|
| LUMA >160 | 1.944% | 3.418% | >=1.5% PASS |
| LUMA >200 | 0.537% | 1.427% | >=0.4% PASS |
| Buckets | 15/16 | 16/16 | >=13 PASS |
| FLAT | 11.37% | 16.68% | <20% PASS |
| HUEMIX | warm 28.8 / cool 67.6 | warm 22.5 / cool 76.4 | funnel matches |
| Ember band | 374 px | — | <500 PASS |

The game BOOTS INTO CAMP: night camp with the Hearth-Fire, all four critters
idling around it, tents, benches, lanterns, market stall, cart, violet portal,
fireflies, at 83 fps. The warm-vs-cool attention funnel now matches the
reference structure, and the reserved Ember band is finally under its bar.

### Resume point — do this first
1. Start the dev server (`npm run dev`, port 5199) if it is not up.
2. Round B is done (arena + critters critic-passed, integration committed at
   v0.3.0). Next: score the 10-check reference-bar baseline on the integrated
   default scene, then Round C: blocks 7-10 — enemies/waves, ally AI +
   downed/revive, healer skill kit, node build system. Blocks 11-14 (run
   structure/draft/shop/boss, HUD, camp hub, final polish) follow.

### Measured state at pause (v0.2.6)
Arena lighting fix WORKED — `captures/pause2-arena.png` vs the reference frame:

| Metric | Before fix | After fix | Reference | Gate |
|---|---|---|---|---|
| LUMA >160 | 0.041% | **3.238%** | 3.418% | >=1.5% PASS |
| LUMA >200 | 0.008% | **0.494%** | 1.427% | >=0.4% PASS |
| Buckets used | 9/16 | **14/16** | 16/16 | >=13 PASS |
| FLAT | 1.19% | **1.68%** | 16.68% | <20% PASS |

Critters (`captures/pause2-chartest.png`) now read as storybook plush: all four
identity rings legible INCLUDING the Tank (fixed after 3 failed rounds), eyes are
large dark beans with small glints, staff gem glows Bright Heal green, faces
visible (lean corrected). 164fps, zero errors.

### My own visual notes for the next critic round (not yet agent-verified)
- Arena: the warm light pools now read as ~8 amber ellipses floating in open grass
  with no visible emitter casting them — in the reference every pool has a source.
  Tie each pool to a torch/lantern/fire, or cut the sourceless ones.
- Arena: props are clustered almost entirely along the north wall; the south half
  of the play space is undressed grass. Distribute edge dressing around all four
  edges.
- Critters: the Tank ring now reads near-white rather than Stone Umber #6B6157 with
  a Bone rim — legible, but check it against the spec hue.
- Critters: rings render as hard flat discs; the brief calls for a soft-edged
  ground ellipse. Archer's bow still reads as a closed 'D', fox tail as a pale
  flipper.

## Round A all-PASS; Round B complete (integration landed)

| # | Time (session) | Event |
|---|----------------|-------|
| 28 | T20 | **Round D2 critics** (fresh, prefixes yrn-/ycp-/yhd-): CAMP REJECT with ONE must-fix — the collision fix made the west road a dead end (tent 3 + bedroll + forge on `paths[1]`, 0.18u gap for a 0.60u body; static camp frame scored a perfect 20/20). RUN REJECT — the Hollow Seal removal left a brief-verbatim 200-HP Stag against brief-verbatim kits doing ~220 burst / ~120 dps: dead in 0.95 s, all three add phases inside 31 ticks. HUD REJECT — banner printed "0/200" over the whole add mop-up (same root cause) + the sanctioned `?room=` harness boot drew no combat chrome (`readCombat` required an active run). **All fixed directly** (v0.4.15): tent 3/bedroll moved north off the road, forge to the south verge, cart off the east-road centreline, plus a `campRoadsClear()` sweep (body-radius circle along every path centreline vs the built colliders, hearth/portal exempt as authored termini) wired into camp.js so a prop can never land on a road silently — critic's own probe: all 4 roads 2.18–2.22 u/s, west road 5.52u (gate ≥4.4). Stag HP 200→1800 with add phases spaced ≥1 quake cycle (240 ticks), recorded as a tuning deviation in BUILD_BRIEF §11 (no hidden immunity, numerals = HP deltas) — probe: 838/1800 at 521 ticks in, phasesFired 2, ~18 s fight. Banner gets a FELLED state ("CLEAR THE ADDS" / "N ADDS REMAIN") instead of 0/HP. `readCombat` mirrors run.js `combatAllowed` (now exported): harness boot shows banner + 3 threat nodes; camp gate still closed after run_end. |
| 26 | T18 | **Combat HUD + camera legibility built (v0.4.3).** `src/ui/hud/**` replaces `ui/protohud.js`: Zone-1 command bar (4 model-rendered class portraits on a Void Charcoal panel, class-accent HP bars, the full §17 portrait state machine, 4 skill slots + dodge on one clockwise-from-12 cooldown grammar), Zone-2 contextual banner (kill_all wave pips / defend Waystone HP+countdown / room-8 boss plate, 240 ms fades), and a real-pixel off-screen THREAT POINTER layer that closes the Round-C camera gap. Sizing rebuilt: geometry AND type are one virtual-1080p design scaled by a single number, §17 min() clamped below at 0.6867 so the >=16 px / >=20 px floors survive 1024x640 (measured 16.48 / 20.60 real px there, 32 / 40 at 2560x1440); zones 12.2% of height at 1600x900 and 14.16% at 1024x640. Glyph collision is now structural (key-chip band vs glyph band, abbrev hidden while the countdown numeral shows) — hd-boxes measures 0 overlapping rectangles at 1024x640 / 1600x900 / 2560x1440. HUD ink vs plate contrast 10.55-11.31:1 with an IDENTICAL plate luminance (0.01399 = #221F1B) on a dark frame, a brazier-pool frame and the boss room — the overlay provably never tints. Threat audit: 5 of the 8 §11 edge spawn points project off-frame, uncued 0 in every probe (plain / spawn-telegraph / Ember-telegraph variants), 83.3 fps floor with markers live; interleaved HUD-on/off A/B under 12 entities reads 68.8 vs 65.5 fps (floor 55.2 either way) so the overlay costs nothing measurable. |
| 26 | T18 | Round D wave 2 (10/16 agents): the **full 8-room run plays end to end** — seed 777 gives kill_all,defend,kill_all,kill_all,defend,kill_all -> shop -> boss -> victory at tick 827, room 1 always a forced Skill draft across 5 seeds, and a room clears NATURALLY with zero cmd help. Path doors verified at exactly 2 with glyph lists ['⛨','✦']/['⛨','◈'] and fresh-press proven 3 ways (held Enter, autoRepeat, synthetic repeat:false — phase stayed 'path' on all). Shop wallet exactly 72 on 5 seeds, prices 25/30/35 (sum 90 > 72 so never all three; worst pair 65 so any two), denial shakes the plaque 8.14px while the card holds opacity 1. Persistence: HP/wallet/sockets/cooldowns survive boundaries (cooldown 198→176→125 uncut), mark/override/rally clear, run end wipes all. Game now BOOTS INTO CAMP (v0.5.0 scene work). REJECTED on the boss: the Stag and half its Antler Quake ring vanished into a bloom blowout (boss box 59.9% >200; ring Ember span 345px→68px; violet veins 0 px). **I fixed it directly** (843d8fc, v0.4.11): the flash was a re-armable latch and boss hits land every ~3 ticks against a 3-tick flash, so a 2.2x body sat at peak emissive forever — now a 5-tick decay envelope, peak capped 0.5, 8-tick refractory; rack halo 2.2/0.72 → 1.35/0.34 so the veins survive. After: whole-frame >200 1.2-2.1% (was 7.0-7.6% mid-fight), 16/16 buckets, ring 13283 Ember px / 272px span, violet 7000+ px. |
| 25 | T17 | **Round C COMPLETE** (18/18 agents). PASS: enemies/waves, build system (nodes+sockets+reinterpretation). REJECTED on narrow defects, verdicts saved to docs/critiques/: allies (ally-incoming numerals used the OUTGOING Parchment colour — all 6 AI criteria passed: focus-fire fraction 1.000 over 450 samples, leash max 3.40u exact, hysteresis re-engage 2.70u vs 2.72 spec, Tab retarget in 1 tick), skills (sub-1s cooldown numeral drawn ON TOP of the skill abbrev — both illegible), polish (Ember danger band 628-1408px on no-enemy frames when the party stands in a brazier pool vs the <500 bar; Swordsman ring drifts 17-24° off #6B2E3A on its pool-facing arc and loses both legibility fallbacks). **I fixed the two narrow ones directly** (e820d48, v0.3.18): party-wide Bruise Umber incoming numerals + HUD glyph steps aside for the countdown; both pixel-verified from the live DOM (ally and player now both rgb(78,70,63)=#4E463F; "0.6" renders clean where "MB" used to fuse). Extended `hitOnce` to allies so the numeral grammar is testable. Hero frame captures/hero-combat_02.png at 161fps — and it exposed a real gap: enemies spawn outside the ~15u camera view of a 24u arena, so waves can arrive unseen. Folded into Round D's HUD block as a threat-legibility requirement. |
| 24 | T16 | Round C wave 4: 13/16 agents completed. Committed: ally AI kits + leash + Tab mark + rally + downed/revive (a9f1d46 v0.3.7), baseline polish — sourced fire pools, cool counterweight, on-hex identity rings (63831f6 v0.3.8), node build system with cap/limit-aware socket previews (c6d09d4 v0.3.9), revive-ring post-bloom ink fix (c47fe8e v0.3.10), plus critic verification suites (nd-*, crx-*, qw-*, al-*). Enemies + skills re-confirmed PASS by second independent critics (telegraph 42 ticks exact, governor 72-tick gaps, seed-1234 byte-identical streams, Sanctuary 4 ticks at +60/120/180/240, bolt 5.172 u/s). Ally-AI critic r2 + polish r2 hit the session limit — resumed. |
| 23 | T15 | Round C critics: ENEMIES PASS (telegraph exactly 42 ticks, governor min-gap exactly 72 ticks / max 1 concurrent, seed-777 waves byte-identical, defend soft-fail conversion + timer-clear at tick 2700 exact, enemy bodies 0 danger px — Ember lives on telegraphs only, 55-80fps) and SKILLS PASS (all 8 skills exact to BUILD_BRIEF, heal numerals exactly #5fe873, override state machine event-proven, cooldown serialize/restore round-trips). Ally AI + build system + polish hit limits x3 — resumed from cache each time. Advisories logged: mantis locked shots never hit strafing players (boars carry all pressure), spawn shimmers can be off-camera, MeshToonMaterial flatShading warnings. |
| 22 | T14 | **Enemies, waves & room win conditions built (v0.3.4).** Sim: `sim/enemies.js` (Thorn Boar 20 HP / 2.0 u/s / contact 8 per-target 0.8 s cd; Spitting Mantis 15 HP / 1.6 u/s / telegraphed 0.7 s shot 10 at 4.0 u/s, engage 3.5) + `sim/waves.js` (seeded kill_all 2–3 waves of 3–5 at 60/40, 0.8 s violet spawn telegraphs, defend = 150 HP Waystone + 45 s timer + waves at 0/12/24/36 s, soft-fail conversion) riding the §4 total order in world.js. Render: `render/enemies/**` (cool slate/teal flat-shaded rigs — angular slit eyes on the boar, violet-glint eyes on the mantis, exactly one violet tell each, ink + contact shadows, NO identity rings; Ember decal+chevron attack telegraphs at 2 Hz; violet spawn shimmers; white-core/Ember-glow/trail shots; amber-rune Waystone with HP-dimming glow + crumble; kill pop / retreat shrink-out). Verified with captures + events: dodge-through i-frame proof (telegraph 42 ticks before fire, impact 72 ticks after start, `hit_immune`, HP 100 — en-dodge); governor probe 6 mantises → 10 starts / 9 resolves, min gap exactly 72 ticks, max 1 concurrent (en-swarm); seed 777 twice → byte-identical wave composition, seed 1234 differs (en-det-a/b/c); kill_all clears only after last of 10 deaths (cleared tick 423 vs last death 422 — en-killall); forced clear → 3 survivors retreat + despawn at +66 ticks, 0 instances after clear (en-retreatev; fixed: eshots in flight now despawn on clear); defend: contested enemies target nearest party member, uncontested (allies downed, player far) all target Waystone 150→14 HP, Waystone death → `room_soft_fail` + kill-all-remaining conversion → cleared softFailed:true, timer-clear lands at tick 2700 exactly (en-defend/softfail/defclear); enemy bodies measure danger 0 px in analyze boxes (Ember belongs to telegraphs), violet tell 31–411 px; kill flash white-hot on the dark body + persistent splat decal + "8" numerals in frame (en-killpop/en-juice); hits carry kb 0.12 + kill hitstop 3 (en-juiceev); fps with 6 live enemies 69.0, sustained 57.5–78.7 through the fight (bar >=55); smoke exit 0; qa6-kill + qc5-iframe regressions green (juice-hit's diagonal (1000,350) aim point misses in BOTH scenes — legacy screen-coord fragility, level-aim files hit fine). |
| 21 | T13 | **v0.3.0 integration committed.** Dressed arena (?variant=1|2|3) is now the DEFAULT scene (graybox stays at ?scene=graybox for regression; proto HUD rides both). Player capsule replaced by the chibi mouse Healer wired to sim state: walk clip while moving, cast clip re-triggered AT the release pop on every bolt fire, hurt clip on damage taken (incoming numerals now Bruise Umber per §17), downed clip at 0 HP (new sim rule: party HP<=0 = `downed` event + floor at 0, never despawn — §10), smooth yaw-to-aim, dash smear intact (frame-verified mid-dash D5 with trail). Bolts spawn visually FROM the staff-gem tip and converge onto the sim path over 1.1 u (graybox `setBoltOrigin` hook; inert without a provider). Badger Tank / fox Swordsman / hare Archer idle near spawn (non-colliding per §12/A6, idle clips, own rings). Verified: int-smoke 4.52%>160 / 0.77%>200 / 14 buckets / FLAT 1.66% (v2: 9.13/2.30, v3: 6.58/2.40); kill juice (3 hits→kill, numerals+decal+burst+pop in frame); hurt/downed/revive evals green; fps 84 in combat, 156-164 idle (bar >=55); seeded simtest event windows byte-identical twice; qa*/qc* regression files all exit 0. |
| 1 | T0 | Recon: found GameStudio "Echoes" concept + art bible (approved). Node v24, npm 11 available. |
| 2 | T0 | Wrote docs/REFERENCE_BAR.md — 10-point pixel rubric + responsiveness bar distilled from the 4 reference screenshots. |
| 3 | T0 | Launching design-digest workflow over GameStudio GDDs → BUILD_BRIEF.md. |
| 4 | T1 | 4/4 digest agents done (488k tokens); synthesis hit session limit once, resumed from cache. |
| 5 | T1 | Converted Pass the Fear AVIF → docs/reference/pass-the-fear.png (1920x1080); added as Reference D to rubric. |
| 6 | T1 | Scaffold live: Vite+three on port 5199, launch.json wired, WebGL frame captured in Browser pane — critic pixel-pipeline proven. |
| 7 | T2 | BUILD_BRIEF.md synthesized (51KB, full stat tables + module architecture) + 14-block decomposition received. |
| 8 | T2 | Git repo initialized; puppeteer headless capture harness (tools/capture.mjs) built, tested, committed — agents can capture real frames + console logs in parallel. |
| 9 | T2 | Round A workflow launched: blocks 1-4 sequential, builder ⇄ fresh-critic loop, max 3 rounds each. |
| 10 | T3 | Renderer/post-stack block built (v0.2.0): stage + toon/outline/glow factories, EffectComposer (bloom/OutputPass/grade), ?scene=rendertest + post toggles, fps meter + version label, debug API stub. Outline technique hardened to smoothed-normal displacement (center-scale hulls gap on hard edges — verified in crops); FXAA default AA after SwiftShader fps profiling (MSAA2 ~73fps vs FXAA ~164fps headless). |
| 11 | T4 | Sim core block built (v0.2.1): clock (60Hz accumulator + hitstop budget + interpolation alpha), seeded/cosmetic RNG streams w/ draw index, spawn-ordinal registry, event ring (200), closed intent vocabulary + DOM-free sim (input controller layer is the only DOM reader), §4 total-order discrete phase skeleton, deterministic wisp harness, ?debug=1 overlay, full window.__echoes (seed/events/state/cmd). Verified: tickRate 60.00 @ 164fps render; two ?seed=424242 runs byte-identical event windows; 1.5s key hold = exactly 1 intent; empty_slot/priority_suppressed/on_cooldown/duplicate_in_tick denial paths live. |
| 12 | T5 | Healer graybox controller + camera built (v0.2.2): ?scene=graybox is the new DEFAULT — walled 24x16 arena, playable Healer capsule (WASD instant 8-dir, mouse ground-plane aim, RMB hold-to-repeat bolt 5.2u/s / 30-tick interval / 5.0u expiry, Space dodge 1.8u/15 ticks/72-tick cd), sim/movement.js (walk-slide + swept no-slide wall collision), sim/projectiles.js (registry bolts, swept, impact-beats-expiry), §22 follow camera (exp smoothing 6/s + aim lookahead cap 0.8u), dash smear ghosts (hard-cleared at dash end), proto command bar (dodge radial wipe + §17 skip-pulse/wipe nudges). Verified via captures: speed 2.4 from first tick, diagonal magnitude == cardinal (0.04/tick), dash exactly 1.8u / wall-stop at 11.7 / flush = zero travel + cd spent, 4 fires in 1.6s at exact 30-tick spacing all expiring traveled=5, mid-dash repeat + fresh press both denied priority_suppressed with x advancing throughout, player on-frame across full dodge-chain crossing, smear + nudge frames captured. simtest/rendertest regression captures clean; wisp harness now simtest-only. |

| 13 | T6 | Round A critics: renderer/post PASS (5/5 criteria, pixel-anchored; 2 advisory notes: shader warnings, outline ink warms under bloom overlap) and sim core PASS (4/4; byte-identical seeded runs, denial codes verified). Block 3 critic + block 4 hit session limit → stalled 9 days. |
| 14 | T7 | Session resumed 2026-08-24: dev server relaunched, graybox smoke capture clean (65fps, v0.2.2). Round A resumed from cache — block 3 critic + block 4 builder/critic running live. |
| 21 | T13 | ROUND B COMPLETE. Both remediations PASS with measured gates (arena: LUMA >160 4.2-9.5% across variants/combat, contact shadows 25-64% darker, ink proven by pixel profile; critters: Tank ring 2.05-2.21x ground luma at 4 cameras, blade visible every cast frame with 19-23x displacement vs idle, glints 2.6-5.6% of bean, gem hue 132-134 vs spec 133). INTEGRATION v0.3.0 committed (a096ffa): dressed arena is DEFAULT, chibi Healer rides the sim (walk/cast/hurt/downed, bolts from staff tip, smear intact), 3 idle allies near spawn. BASELINE: 16/20, no zeros, criteria 1-3 hold, 84fps combat. Gaps map to unbuilt blocks (HUD, enemies) + polish list saved to docs/critiques/baseline-v030-advisories.md. Hero frame: captures/v030-hero.png. |
| 20 | T12 | Round B ran to completion: BOTH blocks REJECTED after 3 rounds — verdicts saved to docs/critiques/. Arena: content density excellent (FLAT 1.19% vs <20% bar, 10-11 prop types, walls correctly darker, violet confined to monolith, gameplay intact) but the frame has NO LIGHT — LUMA >160 = 0.041% vs reference 3.418%, 9/16 buckets; plus zero prop contact shadows and no ink on props. Critters: silhouettes/head-ratios/ring-hexes/downed/warmth pass, but Tank ring invisible for the 3rd time, glints oversized (reads as enemy slit-eyes), lean 35-45° vs 8° spec, sword vanishes mid-attack, staff gem off-palette with no glow. Built tools/analyze.mjs (luma/flat/hue metrics) so builders self-verify with the critic's own numbers; added to TESTING.md as a mandatory gate. Remediation workflow launched with numeric exit gates. |
| 19 | T11 | Round B r2 builder fixes committed — env (2fdc480): walls now darker than floor, drifting motes + flame flicker, contact blob shadows; critters (09d06a3): Tank ring legible, bow gripped, fox brush visible. PAUSED by user before the r2 critics ran. Pause frame: captures/pause-arena.png (156fps, 0 errors). |
| 18 | T10 | Round B r1 landed both blocks + both critic verdicts (credits died in r2, resumed on opus-5). Arena committed ac08c73 (3 variants, canvas hue-noise ground, 9 instanced prop types, violet monolith, 340-440 grass tufts/variant) — critic REJECT: walls render lighter than floor (lum 86 vs 58), environment frozen (0.16% pixel change over 2s — motes/flames static), no contact blob shadows. Critters committed 4e10b3b — critic REJECT 5.5/6: silhouettes/heads(43.4-44.3%)/anims/downed/warmth all pass, only Tank identity ring illegible (within 10% value of its own shadow). Fix rounds running. |
| 17 | T9 | Usage limit killed all 12 Round B agents mid-flight; reset + resumed. Partial work on disk survived: all 4 chibi critters already render in ?scene=chartest (verified frame, 164fps, 0 errors) + src/env/ arena WIP. Round B re-running live. |
| 16 | T8 | Round A COMPLETE — 4/4 blocks PASS (healer controller critic: dash exactly 1.8u/15 ticks, wall clamp verified, ±73px aim lookahead measured; combat juice critic: knockback via body-centroid scans, 6% crit over 200 hits, decal cap 40, i-frame zero-instance). Round B launched: arena env + chibi party parallel loops → integration → baseline reference-bar scoring. |
| 15 | T7 | Combat juice core built (v0.2.3): §9 instance pipeline (sim/combat.js — one seeded crit roll 5%/1.5x, HP, death, heals w/ clamp + full_heal, i-frame targets = zero instance/zero draw + hit_immune), projectile↔entity swept collision resolving as §4 ① deferred maturations, training dummy (`cmd('spawn','dummy',x,z)`), knockback 0.12u basic/0.30u skill over 5 ticks swept vs walls, kill hitstop 3 ticks via clock budget, 3-tick white emissive hit flash, pooled DOM damage numerals (Parchment/BrightHeal/BruiseUmber grammar, 2px outline, tabular, cap 12 oldest-recycled, crit x1.4 larger), kill squash-stretch pop + 12-sprite burst + dark splat decals (~20s, cap 40, cosmetic rot/scale), kill screenshake 0.06u/120ms, WebAudio synth slots shoot/hit/kill/heal emitting `sound` events into the ring. Debug API grew: `stats`, `on()`, `state().vfx`, cmds iframe/hitOnce/critTest/heal. Verified via captures: hit frame w/ flash+numbers+trail; kb drift 2.5→2.98 over 4 hits in events; 200-hit critTest = 12 crits (6%, band 3-8%); crit "12" visibly larger than "8"s in frame; warm-run tick trace froze exactly 3 ticks at death then resumed 60Hz; 45 kills → decals capped 40, visible at 14s, gone by 21s; i-framed dummy took 3 bolts → 3 hit_immune, 0 draws, 0 numerals, hp 20; heal crit 90 clamped to 29 + full_heal + green +90; simtest seed-424242 double-run event window byte-identical; smoke + rendertest exit 0. |

## Block board (builder ⇄ critic state)

| Block | Builder | Critic verdict | Round |
|-------|---------|----------------|-------|
| Design brief | done | — | 1 |
| Scaffold + renderer/post stack | built (v0.2.0) | PASS | 1 |
| Sim core, RNG & input abstraction | built (v0.2.1) | PASS | 1 |
| Arena/environment generation | built (v0.2.6) | PASS (after fix rounds) | 4 |
| Chibi party critters | built (v0.2.7) | PASS (after fix rounds) | 4 |
| Player controller + camera | built (v0.2.2) | PASS | 1 |
| Chibi party characters | built (v0.2.7) | PASS (r4) | 4 |
| Integration (party in arena) | v0.3.0 | PASS 16/20 baseline | 1 |
| Combat core (hit/hurt, numbers, juice) | built (v0.2.3) | PASS | 1 |
| Integration: arena + party as default scene | built (v0.3.0) | self-verified (captures + analyze.mjs + qa/qc regression) | 1 |
| Enemies + AI + waves | built (v0.3.4) | self-verified (captures + analyze.mjs + events; awaiting critic) | 1 |
| Party AI allies | pending (idle placeholders in arena since v0.3.0) | — | — |
| VFX/particles | pending | — | — |
| HUD/UI (combat HUD + threat pointers) | built (v0.4.12) | self-verified fix round 4 (hd-r4-* captures + analyze.mjs + hd-contrast + threat audit) | 4 |
| Run structure (rooms, draft, shop, boss) | pending | — | — |
| Camp hub scene | pending | — | — |
| Audio | pending | — | — |
| Final polish vs reference bar | pending | — | — |
| Healer skill kit & delivery shapes | built (v0.3.3) | self-verified (sk-* captures + analyze.mjs + qa/qc regression) | 1 |
