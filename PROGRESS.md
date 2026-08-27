# Echoes Web — Live Progress Log

Goal: fully playable, responsive top-down party roguelike ("Echoes" design from
GameStudio) in Three.js, judged against commercial reference screenshots
(docs/REFERENCE_BAR.md). Builder/critic loops per block; critics review rendered
pixels and running gameplay only.

## Status: ▶ RESUMED — Round B remediation continuing (critics re-verify fixes, then integration + baseline)

### Resume point — do this first
1. Start the dev server (`npm run dev`, port 5199) if it is not up.
2. Resume the remediation workflow: `Workflow({scriptPath: "C:\Users\keshl\.claude\projects\C--Users-keshl-OneDrive-Desktop------echoes-three\3d94cc26-ac5d-4ee9-8985-3b471cd8f4f1\workflows\scripts\echoes-round-b-fix-wf_1dfeccac-395.js", resumeFromRunId: "wf_1dfeccac-395"})` — the arena fix round replays from cache; the critter fixer restarts (its work was uncommitted mid-edit but IS functional on disk). Then critics re-verify, integration runs, and the 10-check baseline is scored.
3. Then Round C: blocks 7-10 — enemies/waves, ally AI + downed/revive, healer skill kit, node build system. Blocks 11-14 (run structure/draft/shop/boss, HUD, camp hub, final polish) follow.

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

## Round A all-PASS; Round B mid-loop

| # | Time (session) | Event |
|---|----------------|-------|
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
| Arena/environment generation | pending | — | — |
| Player controller + camera | built (v0.2.2) | PASS | 1 |
| Combat core (hit/hurt, numbers, juice) | built (v0.2.3) | PASS | 1 |
| Enemies + AI + waves | pending | — | — |
| Party AI allies | pending | — | — |
| VFX/particles | pending | — | — |
| HUD/UI | pending | — | — |
| Run structure (rooms, draft, shop, boss) | pending | — | — |
| Camp hub scene | pending | — | — |
| Audio | pending | — | — |
| Final polish vs reference bar | pending | — | — |
