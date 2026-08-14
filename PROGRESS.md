# Echoes Web — Live Progress Log

Goal: fully playable, responsive top-down party roguelike ("Echoes" design from
GameStudio) in Three.js, judged against commercial reference screenshots
(docs/REFERENCE_BAR.md). Builder/critic loops per block; critics review rendered
pixels and running gameplay only.

## Status: PHASE 2 — Round A foundations (blocks 1-4) building

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

## Block board (builder ⇄ critic state)

| Block | Builder | Critic verdict | Round |
|-------|---------|----------------|-------|
| Design brief | running | — | 1 |
| Scaffold + renderer/post stack | built (v0.2.0) | awaiting critic | 1 |
| Arena/environment generation | pending | — | — |
| Player controller + camera | pending | — | — |
| Combat core (hit/hurt, numbers, juice) | pending | — | — |
| Enemies + AI + waves | pending | — | — |
| Party AI allies | pending | — | — |
| VFX/particles | pending | — | — |
| HUD/UI | pending | — | — |
| Run structure (rooms, draft, shop, boss) | pending | — | — |
| Camp hub scene | pending | — | — |
| Audio | pending | — | — |
| Final polish vs reference bar | pending | — | — |
