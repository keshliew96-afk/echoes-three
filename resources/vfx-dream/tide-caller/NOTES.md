# Tide Caller VFX dream loop, by element (page only, game frozen)

Kesh 20 Nov 01:46 UTC: for Tide Caller, repaint each water ELEMENT once (stream, tsunami, bubble, rain...), then swap
that look into every skill that uses the element. One shot + one full prompt per element.

- Page engine: tidecaller-abilities/tools (tc.js, page v13 passed). Every effect is drawn by one FX.* function in tc.js,
  so an element's new look is one change there and reaches every card that calls it.
- Shots: play camera (FOV 45, distance 12, 52 deg), 2x crop rendered direct (fov 23.3) at 1920x1080, captions hidden.
  tools-vfx/tc.js has the `globalThis.__playCam` hook; tools-vfx/shootel.cjs + j1.json (serve tools' parent on :8123).

| # | Element | FX | Shot from | Used by (cards) |
|---|---|---|---|---|
| 01 | Water stream | stream | B 3.1 s | 18: basic, Jet stream forms, Floodgate, Home Waters |
| 02 | Tsunami / wave | wave | B 6.35 s | 24: basic tsunami, Crashing Wave, Tidal Wall fall, Wave Rider, Clapping Waves, Surge forms |
| 03 | Ring wave | ringwave | F9 0.88 s | 14: Breaker, Maelstrom, Tidal Dome fall, Depth Charge, Whale breach |
| 04 | Water jet | jet | F2 0.92 s | 8: Torrent, Meeting point, Water rocket, Tidepool |
| 05 | Water bolt / orb | bolt, orb | F1 0.8 s | 30: Riverbolt, Tide Orb, Depth Charge, Torpedo, Answer jets |
| 06 | Crash splash | splash, ring, drops | F2 1.2 s | 52: every Crash, Slam, surfacing |
| 07 | Bubble | bubble | F18 1.4 s | 29: Bubble Ward, Water Prison, every Bubble form |
| 08 | Rain | rain | F19 1.8 s | 8: Rain Squall and forms, combos |
| 09 | Whirlpool / pool | pool, disc | F12 1.9 s | 15: Whirlpool, Maelstrom, Geyser vent, Raft |
| 10 | Wet floor | strip, puddle, wake | D 1.5 s | 27: dash wet path, Ripple Step puddles, Wave Rider wake, Home Waters |
| 11 | Geyser column | column | F20 1.62 s | 20: Geyser, Maelstrom, Otter Dive, Spouts, Whale breach |
| 12 | Water wall | wall | F13 1.5 s | 5: Tidal Wall and forms |
| 13 | Dome | dome | F24 2.0 s | 5: Tidal Dome and forms |
| 14 | Water whip / rope | rope, trail | F3 1.05 s | 21: Water Whip, Tide Orb, River's Gift, Tow |
| 15 | Soaked foe | status/soak tint | F1 1.95 s | every skill |

Rules: copy only each element's LOOK from the repaint; never add an effect that only appears in a painting; the look
lasts as long as the skill. Fable judge per element, Opus builds, aim 9; Kesh judges when stuck.

## Pass 5 (20 Nov, on the page as v14)
- Page https://claude.ai/artifact/DKPsEdrofPCkk2FJ2naMx1 v14: tc.js swapped for the element rebuild; every card uses it. The passed v13 engine is kept as tidecaller-abilities/tools/tc.v13-before-vfx.js.
- Sheets (repaint left, page right): pass5/*.jpg. Fable judge, round 4: stream, bubble, dome about 7; ring wave, rain, wet floor, geyser, Soaked about 6.5; splash, jet, whirlpool, wall, whip about 6; bolt 5.5; tsunami 5 to 6.
- Root bugs fixed on the way: wall shading used view-space normals (now F_WALL with object normals); the wet strip's UVs were swapped (foam sat on the short ends); the Soaked puddle drew as a whirl (fxMat's u1 defaults to 1); the jet still was frozen mid-flight by hit-stop (shoot F2 at t 1.0).
- Not done: whip hook round the foe, tsunami back-face froth, bubble swirl arcs. All 119 cards build and step with no errors (tools-vfx/patch/checkall.cjs).
- Tools: tools-vfx/tc.pass5.js (= page tc.js), patch/p1..p16.py, jobs.py (element -> card + time), cmp.py, shootel.cjs.

## Pass 6 (20 Nov, fountain)
Kesh: the geyser target was a 水柱, he wants a 喷泉. FX.column now draws a jet, a white head, an umbrella of falling strands (F_UMB, umbGeo) and a wide foam ring (pool froth 1.2). Page v15. New shot 11b-fountain.png, prompt in PROMPTS.md 11b, sent to him for a repaint. Engine tools-vfx/tc.pass6.js (patch p17).

## Passed (20 Nov 03:54 UTC, page v23)
Kesh passed: fountain (geyser), water stream, bubble. Open: tsunami, ring wave, jet, bolt, splash, rain, whirlpool, wet floor, wall, dome, whip, soaked.
Also passed 03:57 UTC: whirlpool, tsunami, wet floor, dome, whip, soaked (some cards have motion issues; elements pass). Open: ring wave, jet, bolt, splash, rain, wall.

## 20 Nov 04:00-04:15 UTC (page v24)
- Passed: ring wave, jet, splash (with the 9 earlier). Open: bolt, rain.
- Wall removed: FX.waterfall (sky to floor, foaming pool, splashes) on Tidal Wall F13, C6, Bubble F13 Return, Jet F13 Ram, Surge F13 Sea fall
  (it topples forward as the tsunami). FX.sheet = old slab, kept only for Jet F2 Sever's blade. Page text updated (zh/en).
- Floodgate base F8 + Surge F8 Flood crest use FX.jet.
- Surge F7 (Depth Charge): small whirlpool gathers the pack, then a waterfall drops on the knot (Slam 20, 29 soaked as before).
- Surge F10 Crashing Wave: FX.curlwave follows his growth strip (ripple, tongue, barrel with white head, head curls over her, pours).
- FX.wave bends along its path when steered (Wave Rider base F14, Bubble F14, Surge F18; straight rides unchanged).
- Sheets in pass8/.

- 06:20 UTC v34: stream/jet miss rule (his 06:12). FX.stream checks the end each frame; empty air (no foe within 0.6 u, no block()) droops the last half to the floor and spills a puddle with drops; foe or wall ends unchanged; o.fall:false opts out. Patch p48. Sheet pass8/stream-miss-falls.jpg.

## Trial passed (Kesh 20 Nov 06:19 UTC, page v35)
"mark pass": all elements passed. Method written up for the other heroes in ../METHOD.md.
