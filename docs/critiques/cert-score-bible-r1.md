STATUS: COMPLETE
VERDICT: REJECT - camp 19/20 PASS, boss 17/20 PASS, combat 14/20 FAIL, shop 11/20 FAIL (no zeros; 2 of 4 certification frames below the 16/20 bar). Lens: art-bible enforcer (colour discipline, value range, halos, contact shadows, post stack).

# Cert score - ART-BIBLE ENFORCER - round 1 (certA1 frames, v0.4.16)

Critic: fresh context, pixels + console + debug-API only. Frames judged: the technician's `captures/certA1-{camp,combat,shop,boss}.png`, the `-z50` variants (canvas box 0,0,800,450) and the `campseq`/`combatseq`/`bossseq` bursts (all mtime 2026-09-06 22:20-22:29, version label v0.4.16 in every frame, 0 PAGEERROR / 0 [error] / 0 HARNESS-ERROR in all 10 consoles). Reference viewed first: `docs/reference/pass-the-fear.png` (>160 3.418 %, >200 1.427 %, 16/16, FLAT 16.68 %, vignette rings 27.4->53.7). Every number below was re-measured by me on the current PNGs with `node tools/analyze.mjs --box` and the helpers `tools/certA1-bible-{hue,vig,diff,crop}.mjs` (raw logs `captures/certA1-bible-probe-r3*.txt`, appendix at the end). Nothing under src/**, docs/BUILD_BRIEF.md or docs/REFERENCE_BAR.md was touched; no git commit; no browser-pane tools. Note: a previous instance's P0-P3 probes (kept in the appendix) were taken on older captures that the technician has since overwritten - they are superseded by the P1'-P4' probes.

## Scorecard

Score key: 2 = meets/exceeds the reference, 1 = present but clearly below it, 0 = absent/broken.

### CAMP - `captures/certA1-camp.png` - 19/20 PASS

| # | Check | Score | Evidence (capture + box / numbers) |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole FLAT 13.87 % (<20 %). Roads carry hue/pebble noise: roadE 900,330,300,120 FLAT 6.49 % buckets 11/16 amber 2189; roadW 200,430,250,100 FLAT 0.81 %; groundSE 950,560,300,200 FLAT 8.11 % but only 4/16 buckets, >160 0 %, 0 saturated px - a dark indigo wash carried by grass tufts (560) and flowers (46), no decals. Corners TR/BR FLAT 29.6/26.1 % are the treeline void (luma 13-17), same role as the reference's left void (edge L 11.6). |
| 2 | Layered light | 2 | Cool indigo ambient (HUEMIX cool 70.2 %, ref 76.4 %) + hearth pool 600,280,180,160 >160 37.1 % / >200 13.7 %, three tent glows, pole lanterns NW/NE (box mean 76/75, halos ~20 px - pinpricks next to the reference's lantern towers), stall lantern E 1370,330,70,80 amber 2261 (~60 px halo), forge 100,640,120,100 >160 6.6 %, SW lantern 120,660,60,40 mean 126, portal 580,0,260,140 violet 7829 px. Every emitter inspected at 3x has a halo. |
| 3 | Silhouette read | 2 | `certA1-camp-z50.png` canvas: rabbit healer (400,210), bear tank (250,200), cat swordsman (440,190), rabbit archer (255,110) each identifiable; 3x crops show a ~2 px ink outline on all four plus a class ring. |
| 4 | Prop density | 2 | campState 16 prop types; >=14 read in pixels: hearth ring, benches x4, tents x2, bedrolls x3, cart (1220,400), stall+canopy (1250-1430,430-600), lantern poles x2, portal dais, woodpile (410,510), banners x2, forge+anvil (60-200,620-720), sacks (1560,190), tripod (560,270), rocks (1200,630). Missing vs reference A: cabin, glowing item racks, fences, crates. |
| 5 | VFX layering | 2 | Hearth crop 590,270,200,180 @2x: white-yellow core + amber glow + rising ember sparks = 3 layers; portal 570,0,280,150: violet ring + two beams + gate motes; 150 fireflies. (No attack VFX possible in camp.) |
| 6 | Colour discipline | 1 | **Danger band 937 px on a frame with no enemy threat (gate <500).** Localised with a 50 px grid: forge flame 100,640,120,100 = 569 px (48 % of its saturated px sit at 20-30 deg, i.e. the danger orange, not the hearth's 30-40 deg amber which is 0 danger), hearth-lit road N 640,180,80,60 = 233 px, lanterns NW/NE 59/53, SW lantern 127. Class rings add two accents outside indigo/amber/violet: swordsman maroon 340-350 deg (20 % of its box's saturated px), archer olive 70-80 deg (33 %). |
| 7 | Post stack | 2 | Bloom on hearth/portal (>200 13.7 % in the hearth box); vignette measurable: rings 32.2->52.3 edge->interior, edge R 14.9->31.6, edge T 44.8->60.5 (ref 27.4->53.7); indigo night grade. Whole >160 1.845 % / >200 0.524 % / 15/16 - darker than the reference but inside the gates. |
| 8 | Grounding | 2 | Dark blob under every critter inside its ring: healer 720,340,160,140 row profile falls 134->92 under the body; tank/swordsman/archer crops show the dark ellipse; propShadows 70 - cart/bench/lantern poles cast soft shadows (cart crop 1220,400,240,220). |
| 9 | UI polish | 2 | HUD bar 500,805,600,80: four rendered portraits with class rims + HP bars, slots `1 MB / 2 SM / 3 / 4 / SPC` in charcoal tiles; version pill `v0.4.16` at 0,865,80,35; fps chip. Clean geometric; advisory: skill slots are 2-letter text, not icons (reference has painted skill cards). |
| 10 | Motion juice | 2 | `certA1-campseq_00..05`: hearth flicker 1.9-5.1 % of 600,280,180,160 per frame; fireflies drift (whole 1.15-1.77 %); healer idle sway 6.0-10.6 % of 720,340,160,140. Not statues. |

### COMBAT - `captures/certA1-combat.png` (room 1, seed 4242, tick ~556, live mantis telegraph 24-26 ticks before resolve) - 14/20 FAIL

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole FLAT 2.04 %; grassR 900,350,300,150 FLAT 0.00 % (10/16 buckets), roadR 1000,560,300,140 FLAT 0.00 % with pebble/hue noise (amber 23367); decals 0 in this frame but `combatseq_02..07` accumulate a boar corpse on the road (1180,600) and a dark splat (230,600) that persists. |
| 2 | Layered light | 1 | Warm pools exist - torchL 240,470,160,160 >160 68.2 % / >200 7.5 %, torchR 1000,170,160,160 >160 27.4 %, wall torches (370,0 mean 177), monolith 1280,10,140,150 violet 3399 px, bolt/archer blooms - but there is **no cool ambient**: HUEMIX cool 15.1 % (ref 76.4 %), corner luma 75-119, darkest bucket empty (hist 0|2|5...), >160 15.2 % (4.5x the reference). Torches burn in a bright green field; torchL box mean 165 vs grassR 122 = 1.35x pool contrast, versus the reference lantern against a dark bridge. |
| 3 | Silhouette read | 1 | `certA1-combat-z50.png`: healer (400,210) and boar (740,320) read; tank/swordsman/archer fuse into one blob under the archer's cast bloom (260-340,270-370); mantis is a blue stick - blue-px column scan of 100,290,80,80 shows 80-px lines 4 px apart, ~20 px at 50 %, not identifiable as a creature. 3x crop 60,250,160,140: capsule head + stick legs, no ink weight on the legs. |
| 4 | Prop density | 2 | Arena propTypes 12; pixels: fence (150,50), stumps, barrels (680,60), crates, bush (930,70), stone slab (640,100), ground torches x2, wall torches x2, monolith, flowers, tripod (130,300) - concentrated at the top edge, centre navigable. |
| 5 | VFX layering | 1 | Bolts 380,680,200,100: saturated px **0/20000**, >200 77.3 %, mean 214 - white capsule + white bloom, no coloured glow, no trail (ref fireball crop: orange core + yellow-hot dots + flame trail). Telegraph 500,530,220,220: thin red-orange arc, danger 234 px, no dark scorched core (ref telegraph crop: dark core + bright rim + fire blobs). vfx.particles 0. Kills do leave decals (`_02` corpse + amber detonating-charge ring at (1190,620); `_04..07` splat) and numerals pop (`+14`, 12/26, 30). |
| 6 | Colour discipline | 1 | Danger confined to threats OK (telegraph 221 + off-screen threat pointer chip 520 = 765 of 765). Violet on monolith (god) and boar spines 711 px (corruption) OK. But "party warm vs world cool" is broken - the world is 65.2 % foliage green - and the heal reserve is diluted: heal band 265,165 px whole-frame of which the actual heal (`+14` 1219 + healer ring ~2200) is <2 %; grass hue 80-120 deg overlaps the 110-150 deg heal band (grassR 12 % at 110-120 deg). |
| 7 | Post stack | 1 | Bloom OK (bolts, torches). Vignette missing: bottom corners BL 116.5 / BR 119.3 are brighter than the centre 106.4; rings 97.6->117.3 (+20 %), edge R inverted 127.5->82.9 (ref rings 27.4->53.7, 2x). No visible grade - raw saturated green, no cool wash. |
| 8 | Grounding | 1 | Party blobs OK (healer crop). Boar OK: 1420,665,150,12 luma 58 vs 1420,700 luma 92. Mantis faint at best: under-body 150.8/159.6 vs below 166 vs right 180. Projectiles missing: ground under the bolt 372,707,14,25 luma 211 vs 189/187 beside it (brighter); only a faint offset grey blob at (452,704) luma 125 vs ~150 ambient, buried under the bloom. The reference knight has a clear drop shadow. |
| 9 | UI polish | 2 | Wave plate 650,14,300,36 `WAVE 1/2 . 4 LEFT` with pips; threat pointer chip 370,830,90,70 (red triangle in a dark disc); HUD bar; cooldown numerals 1.0/0.1 in `_02`; version pill. |
| 10 | Motion juice | 2 | `combatseq_00..07` (~0.75 s apart): boar hit-flash white at (960,190) in `_06`; numerals 12/26 (`_02`), 30 (`_03`,`_06`); corpse + charge ring (`_02`); violet spawn rings (`_04`); decals persist; whole-frame change 6.4-19.0 %/frame. Main frame poses mid-cast (healer staff raised, archer bloom). |

### SHOP - `captures/certA1-shop.png` (room 7, wallet 72, three cards) - 11/20 FAIL

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | Whole FLAT 52.89 %; modal 378,168,844,468 FLAT 61.9 %; cards 57.5-61.2 %; veil-dimmed arena arenaL 39.8 % / arenaR 44.5 % (3/16 buckets) / arenaBelow 68.0 %; cornerBR 1400,780,200,120 FLAT 90.4 %. Reference: 16.68 % with painted texture under every HUD element. |
| 2 | Layered light | 1 | Behind the veil the torch 270,480,140,130 is an amber smudge (>160 0.10 %, mean 51) and the monolith 1290,10,140,150 glow is gone (>160 0.00 %, violet 0). The modal has no light pools; only the wallet coin 655,243 carries a faint halo. |
| 3 | Silhouette read | 1 | No world entity is visible (party parked under the modal); the HUD portraits read; the card glyph tiles at (438,332)/(711,332)/(983,342) are 40 px unicode symbols - Detonate and Ascend are both stars, told apart only by rim colour. |
| 4 | Prop density | 2 | Same arena, >=8 props identifiable through the veil (fence, stumps, torch, crates, barrels, bush, slab, monolith, rocks). Advisory: "THE PEDDLER'S SHELF" has no peddler/stall prop in the world. |
| 5 | VFX layering | 1 | Shop's own effects: plaques 468/740/1012,497,120,42 flat (mean 50-51, amber ~690 each, no glow spread); cards flat charcoal with 2 px rims (Ascend box >200 1.0 %); Advance 640,540,320,60 >200 0.0 % (DOM boxShadow 18 px @0.27 alpha invisible in pixels); no coin glitter; the only effect is the legendary shimmer (Ascend box 31.03 % change s0->s1 with no mouse). Arena behind: no bloom. |
| 6 | Colour discipline | 1 | Charcoal + bone + amber, violet 0, danger 4 - but the rarity rim on Detonate is blue 200-210 deg (86 % of its 3169 saturated px): a fourth accent outside indigo/amber/violet. |
| 7 | Post stack | 1 | No vignette (rings 41.4|46.1|45.6|43.2|43.2|44.3|44.6, edge L 41->50 inverted), no bloom (>200 0.426 % whole, all title/text), grade = a uniform darkening veil. Borderline 0; kept at 1 because the veil is a deliberate visible treatment. |
| 8 | Grounding | 1 | No entities to ground; the cards' DOM drop shadow (0 12px 30px rgba(0,0,0,.67)) is unmeasurable on a 40-luma veil (card surround mean 44.6, no dark rim). |
| 9 | UI polish | 1 | Styled and clean (rounded plate, title, wallet chip with coin icon, rarity rims, plaques, amber button, hint line) but flat: no texture, ornament or icon art; plaques/button without glow; Bounce card hover = **0.00 %** pixel change (no hover feedback). Reference: ornate painted cards with icons and glow. |
| 10 | Motion juice | 1 | Static modal: Ascend shimmer 31.03 %/70 ticks; Bounce hover 0.00 %; world behind the veil frozen - backdrop 0,0,1600,160 changes 0.01 % over 70 ticks (no firefly drift, no torch flicker). |

### BOSS - `captures/certA1-boss.png` (room 8, Stag 1117/1800, quake ring live 20-22 ticks before resolve) - 17/20 PASS

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole FLAT 5.58 %; grassR 1100,450,300,200 FLAT 2.38 %, roadR 1000,600,300,150 1.20 %, grassSE 1200,650,300,150 1.95 %; cornerTL 38.1 % is the dark wall void (luma 29.9). |
| 2 | Layered light | 2 | Cool ambient (corners TL 29.9 / TR 31.5, hue 220-230 deg, HUEMIX cool 24.1 %) + pools: torchTL 270,80,110,110 >160 18.0 %, torchR 1000,360,120,120 >160 14.2 % / >200 7.3 % with a vertical beam halo, torchBL 90,770,140,120 >160 14.3 %, monolith violet 5723 px, Stag crown, healer bolt. Every emitter has a halo. |
| 3 | Silhouette read | 2 | `certA1-boss-z50.png`: Stag (dark diamond + violet antlers + white crown) unmistakable at (400,180); healer (365,310) reads; tank/swordsman distinguishable at (340-400,190-260) though inside the ring. Stag body has value separation (navy vs amber) but no ink outline. |
| 4 | Prop density | 2 | Same arena props at the top edge (fence, stumps, barrels, crates, bush, slab, torches, monolith, rocks); centre navigable. |
| 5 | VFX layering | 1 | Quake ring 690,320,300,250: coral rim + tick marks + amber fill (danger 9452, amber 16616, >200 2.4 %) - no dark scorched core, no particles (vfx.particles 0, decals 0 in this frame). Stag hit-flash (bossseq `_00/_01` body fully white) + 10 numerals + dodge chip; healer bolt = green core + glow (2 layers); crown = a blown white disc. `_04..07` show a dark trample decal at (720,700). Reference: multi-layer fireballs with trails. |
| 6 | Colour discipline | 1 | Danger confined to the quake ring (9452 of 10295) + torchR fire spill 424 OK; violet only on Stag/monolith/plate OK; heal green on bolt/ring/`+22` OK. **But the room's grass sits squarely in the reserved heal band**: grassR hue bins 120-130 21 % / 110-120 17 % / 130-140 13 % / 140-150 11 %; heal band 214,085 px whole-frame of which actual heal effects are <5000. |
| 7 | Post stack | 2 | Vignette rings 53.1->88.8 (1.67x; ref 2x) with cool corners; bloom on crown/torches/bolt; whole >160 5.12 % / >200 2.03 % / 16/16 >= reference. Advisory: crown 760,150,160,140 >200 47.7 % with only 203 saturated px - a featureless ~120 px white disc rather than the reference's textured blown-out wings. |
| 8 | Grounding | 1 | Party blobs OK (healer 660,560,170,170 row profile 145->80 under the body). **Stag has no contact shadow**: ground directly under the body 800,528,70,12 luma 179.5 is brighter than flanks 720/900,528 (128/151) and lower 800,565 (154) - the ring fill lights the ground; stagbase crop @4x shows the slab sitting on amber with no dark contact; in `bossseq_02/_03` the base is occluded by the party. Bolts: no shadow. |
| 9 | UI polish | 2 | Boss plate 392,14,816,35: rounded charcoal, violet bar (250-260 deg), bold bone `THE HOLLOW STAG 1117/1800` (>200 11.9 %); dodge chip `x3` 490,750; outlined numerals; HUD bar; version pill. Below the reference's ornate plate + icon, but clean. |
| 10 | Motion juice | 2 | `bossseq_00..07`: Stag hit-flash (`_00/_01`), quake ring appears/resolves (danger 13173 -> 1595 -> 25280), HP 1081->451, numerals cluster, dodge chips, whole-frame change 7.9-59.7 %/frame, Stag box 690,150,300,420 22.7-82.2 %/frame; trample decal persists `_04->_07`. |

## Direct comparison with `docs/reference/pass-the-fear.png`

- **Density**: camp is at the reference's prop count (16 types) but at low-poly, untextured fidelity (cart/stall crops are flat-shaded slabs). Combat/boss arena density sits only along the top wall; the reference dresses every edge (towers, banners, chains, barricades) and paints the floor (cracks, moss, scorch). Echoes floors are noise + tufts; decals only accumulate mid-fight.
- **Cohesion**: camp tells one story (indigo night + amber fire + violet portal) and matches reference A closely. Combat (room 1) does not: lit torches inside an overexposed green field (>160 15.2 % vs 3.4 %, darkest bucket empty, corners brighter than centre). Boss (room 8) recovers the night story (cool corners, 16/16 buckets, rings 53->89). The palette rule is broken on every frame somewhere: forge flame in the danger band (camp), grass in the heal band (combat, boss), blue rarity rim (shop).
- **Polish**: halos exist on every emitter in camp/combat/boss (none survive the shop veil). Contact shadows are present under critters and the boar but absent under projectiles and the Stag. VFX are 2-layer (white core + white bloom) with no particles/trails, and telegraphs lack the dark scorched core. HUD is clean geometric but text-labelled and unornamented next to the reference's painted cards.

## Notes / advisories (not scored)

- Shop world is frozen behind the veil (0.01 % change) - keeping fireflies/flicker alive and a lighter veil would lift checks 1/2/7/10 together.
- Combat frame value range: hist 0|2|5|9|13... - no pixels in the darkest bucket; the room-1 exposure/ambient is the single biggest gap to the reference (the boss room already shows the fix works).
- Camp danger gate (937 > 500) is entirely fire-sourced: shift the forge flame from 20-30 deg to the hearth's 30-40 deg amber and it clears.
- `hud.banner().text` concatenates DOM strings ('WAVE 1/24 LEFT'); pixels are correct.

---

## Appendix - probe logs (chronological; P0-P3 from a prior instance on older captures, P1'-P4' re-measured on the current files)

# Cert score — ART-BIBLE ENFORCER — round 1 (certA1 frames, v0.4.16)

Checkpoint created 2026-09-06 00:13:20. Prior instance left tools/certA1-bible-{crop,hue,diff,gen}.mjs + captures/certA1-bible-c-*.png crops but no report; re-measuring from scratch, reusing those crops only after re-verification.

## Probe log

### P0 whole-frame analyzer (re-run by me, matches technician byte-for-byte)
| frame | >160 | >200 | buckets | hist | FLAT | HUEMIX warm/foliage/cool | SAT | HUES danger/heal/violet/amber |
|---|---|---|---|---|---|---|---|---|
| certA1-camp.png | 1.873% | 0.551% | 16/16 | 21,35,15,8,5,4,3,3,2,1,1,1,0,0,0,0 | 13.94% | 25.5/4.1/70.5 | 0.594 | 700/2011/8600/75568 |
| certA1-combat.png | 15.919% | 3.307% | 15/16 (bucket0 empty) | 0,2,5,9,13,13,12,11,10,9,6,5,3,1,1,0 | 2.10% | 20.0/65.1/14.9 | 0.441 | 1141/260952/4307/132322 |
| certA1-shop.png | 1.260% | 0.426% | 14/16 | 0,15,63,18,1,0... | 52.85% | 48.7/50.0/1.3 | 0.262 | 4/386/0/34398 |
| certA1-boss.png | 6.547% | 2.646% | 16/16 | 1,10,19,18,13,11,9,6,4,3,2,1,1,1,1,0 | 5.46% | 25.0/50.9/24.0 | 0.453 | 11018/208067/10612/144716 |
| REF pass-the-fear.png | 3.418% | 1.427% | 16/16 | 27,21,13,13,9,7,2,2,1,1,1,1,1,1,0,0 | 16.68% | 22.5/1.1/76.4 | 0.582 | 89724/446/13339/56031 |

### P1 region probes (node tools/analyze.mjs --box + tools/certA1-bible-hue.mjs; all verified by me)
CAMP certA1-camp.png
- danger 700 px located (50px grid, >20 px cells): forge fire cells (100-150,600-700) = 479 px; cells (650-700,200) = 147 px (fire-lit road N of hearth); (900,50) 22. Forge box 100,640,120,100: danger 475, amber 2658, hue bins 30-40 46% / 20-30 44%. Hearth box 600,280,180,160: danger 2 (clean amber 30-40 86%), >160 40.5%, >200 14.8%.
- emitters: hearth mean luma 151; lanternNW 510,30,70,90 mean 72 amber 61 (violet 670 from portal spill); lanternNE 860,40,70,90 mean 64 amber 117; lanternE 1370,330,70,80 mean 56 amber 2012; portal 580,0,260,140 violet 7613 >160 1.47%; forge >160 8.4%.
- ground: roadS 660,560,100,240 FLAT 6.67% buckets 6/16 mean luma 25; roadE 900,330,300,120 FLAT 7.21%; roadW 200,430,250,100 FLAT 0.81%; groundSE 950,560,300,200 FLAT 7.89%; cornerTR FLAT 30.4%, cornerBR 26.7% (dark wall/void).
- vignette proxy: corner mean luma TL 42.9 / TR 13.1 / BL 32.3 / BR 17.2 vs centre 700,400,200,120 = 96.0.
- entities: healer 750,370,100,80 heal 1252 (ring); tank 434,335,119,80 amber 508; swordsman 839,314,98,81 hue 340-350 18% (maroon ring); archer 456,155,102,83 hue 70-80 33% (olive ring).
COMBAT certA1-combat.png
- danger 1141 px located: telegraph cells (600-650,550) 548 + (500,650) 134; threat pointer chip cells (350-400,850) 403 px (UI pointer, off-screen enemy).
- teleBox 480,540,240,220: danger 734, >160 61.1%, >200 28.2% (tank flash + bolt bloom), heal 4170.
- torchR 1000,170,160,160 >160 34.4% >200 4.1% amber 2520; torchL 240,470,160,160 >160 71.0% >200 8.3%; wall torches 370,0,80,80 mean 182 / 970,15,70,70 amber 1001; monolith 1280,10,140,150 violet 3452 >160 7.9%.
- bolts 370,670,150,110: mean luma 217.7, >200 83.6%, SATURATED PX 0 -> white core + white bloom only, no coloured glow/trail.
- ground: grassR 900,350,300,150 FLAT 0.00% buckets 10/16; roadR 1000,560,300,140 FLAT 0.00%; grassTL FLAT n/a; whole 2.10%.
- vignette proxy: corners TL 76.4 / TR 78.5 / BL 118.2 / BR 118.1 vs centre 106.6 -> bottom corners BRIGHTER than centre.
- enemies: boar 1400,570,180,120 hue 200-210 27% (slate), violet 713, danger 0; mantis 90,260,110,110 violet 52, danger 0.
- heal band: whole frame 260952 px = grass (grassR 8741/45000); '+14' numeral box 760,335,90,40 heal 1253 hue 120-150; healer ring heal 2702.
BOSS certA1-boss.png
- stagBox 700,180,280,380: >160 46.9% >200 19.8%, danger 10254, violet 848, amber 9536; crown 760,150,160,140 >200 52.8% violet 154 (250-270 deg).
- ringBox 690,320,300,250: danger 10301 amber 12962 >200 9.2%; whole-frame danger 11018 of which torchR 1000,360,120,120 = 561 (ring spill / fire), healer 89, tank 671 (inside ring).
- torches: TL 270,80,110,110 >160 22% amber 667; R >160 11.5% >200 5.8%; BL 90,770,140,120 >160 18.2% amber 11528; monolith 1290,120,140,160 violet 6234 >200 2.8%.
- ground: grassR 1100,450,300,200 FLAT 2.38% buckets 7/16 mean 59.9 heal 21710/60000; roadR 1000,600,300,150 FLAT 0.90% heal 22623; cornerTL FLAT 38.4% (wall shadow), cornerTR 20.3%.
- vignette proxy: corners TL 31.1 / TR 32.2 / BL 102.9 (torch) / BR 49.5 vs centre 146.
- numerals: '39' box 1080,300,120,80 heal 466 hue 90-110 (white numeral over grass); '+22' 420,350,100,50 heal 2095 hue 120-130; plate 392,14,816,35 violet 254.
SHOP certA1-shop.png
- modal 378,168,844,468 FLAT 61.9%; cards FLAT 57.5/59.3/61.2%; plaques 468/740/1012,497,120,42 mean luma 50-51, amber ~690 each, no glow spread; advance 640,540,320,60 amber 6953 >160 5.1% >200 0.
- behind veil: torch 270,480,140,130 >160 0.10% amber 2085; monolith 1290,10,140,150 >160 0.00% violet 0; arenaL FLAT 33.7%, arenaR 46.2%, arenaBelow 72.8%, cornerBR 90.1%.
- Detonate card rim hue 200-210 (blue, 86% of its saturated px) = a 4th accent outside indigo/amber/violet.

### P2 console hygiene / vignette rings / sequence diffs
- Console: 0 PAGEERROR, 0 [error], 0 HARNESS-ERROR in certA1-{camp,camp-z50,campseq,combat,combat-z50,combatseq,shop,boss,boss-z50,bossseq}.console.txt.
- Vignette (tools/certA1-bible-vig.mjs, mean luma of 30-px rings edge->interior, 7 values): camp 32.0|38.8|36.7|30.0|34.3|38.7|52.7 (edge R 15.5->31.5, edge T 44->59, edge L 54->45 inverted by forge/lantern); combat 99.0|101.8|105.0|108.6|109.2|113.0|117.9 (edge L 96->130, B 85->124, R inverted 128->83); shop 41.7|46.4|45.9|43.4|43.4|44.4|44.5 (no gradient, veil uniform); boss 54.5|60.6|60.7|68.3|69.3|80.5|94.5; REFERENCE 27.4|34.3|34.5|40.3|43.1|49.5|53.7 (2x edge->interior).
- Sequence diffs (tools/certA1-bible-diff.mjs, % px with channel delta >24, frames ~1.1 s apart): campseq whole 1.50/1.37/1.68/1.73/2.09 %, hearth box 600,280,180,160 6.6/8.6/3.8/4.1/5.1 %, healer box 720,340,160,140 11.9/12.3/11.3/9.4/8.8 %; combatseq whole 20.9/7.1/9.2/8.4/11.3/6.9/7.0 %; bossseq whole 40.0/19.8/63.4/11.0/44.4/39.1/32.8 %, stag box 690,150,300,420 87/40/81/33/79/90/75 %.

### P3 crops viewed (captures/certA1-bible-c-*.png) + shadow/halo/hover probes
- Camp critters (healer 720,340,160,140 / tank 420,320,150,120 / swordsman 820,300,130,120 / archer 440,140,150,180 @3x): ~2 px ink outline on every body, class ring, darker blob inside the ring under each body. Camp z50 canvas (certA1-bible-c-camp-z50canvas.png): rabbit/bear/cat/mouse each identifiable by silhouette at 50%.
- Camp lantern halos (mean >160 in 40x40 flame box / 80x80 halo box / 80x80 far ground): NW 6.25/2.42/0.00 %, NE 6.38/1.59/0.09 %, E 2.06/0.55/0.00 %, forge 51.2/15.7/0.00 %, hearth box 40.5 %. Pole-lantern halos exist but are pinpricks vs the reference's torch-tower lanterns.
- Combat bolts (360,660,180,120 @3x; single bolt 375,690,80,60 @6x): white capsule + white bloom, saturated px 0, min luma 197 in the box; blob left of bolt (372,707,14,25) mean 216 vs ground L (345,707) 192.6 / ground B (372,745) 199.0 -> NO contact shadow under projectiles.
- Combat boar (1420,590,160,110 @4x): ink outline, slate body, violet spines; row 1420,665,150,12 luma 46-64 vs row 1420,700 luma 64-108 -> contact shadow present. Mantis: under-body rows 120,322/340 mean 148/149 vs 120,365 = 172 and 180,322 = 184 but 60,322 = 109 (left-edge falloff) -> at best a faint shadow.
- Combat telegraph (500,530,220,220 @2x): thin red-orange arc, mostly occluded by the tank/swordsman/archer stack; reference telegraph is an unoccluded dark core + bright rim ~220 px.
- Combat z50 canvas: healer + boar read; tank/swordsman/archer fuse into one blob under the archer's cast bloom; mantis ~30 px blue sliver.
- Boss Stag (690,150,300,420 @2x): flat navy slab body, soft outline, 2 white-violet beams + violet tine cones, white-violet crown bloom; ground directly under the body bottom (800,528,70,12) luma 183.5 vs flanking (900,528) 151.8 / (720,528) 151.2 / lower (800,565) 158.2 -> NO contact shadow under the Stag. Quake ring (690,480,300,110 @3x): solid coral rim with tick marks + amber fill, no dark scorched core.
- Boss healer/tank crops: ring + blob + outline present; tank mid hit-flash (white). Plate (390,10,820,45): rounded charcoal, violet bar, bold bone text. Chip x3: styled. Numerals: white with dark outline; '+22' green; '+HP' green micro-label at (765,395).
- Shop: Ascend card @2x = flat charcoal card, 2 px amber rim, glyph tile, no texture/glow; plaques flat; Advance button amber rim + text, glow barely visible (>200 0 %). Behind the veil the brazier at (320,540) is a dim smudge (>160 0.10 %), monolith glow gone (violet 0). Hover diffs: Bounce card box s1->hover 0.00 % (no hover feedback); Ascend box s0->s1 31.03 % with no mouse (legendary shimmer animates); backdrop top strip s0->s1 0.01 % (world behind the veil static).
- HUD bar (500,805,600,80 @2x): 4 model portraits with class rims + HP bars, slots 1 MB / 2 SM / 3 / 4 / SPC, clean charcoal tiles; version chip 'v0.4.16' styled pill.
- Camp seq (6 frames, viewed): flames flicker, fireflies drift, critters idle-sway (healer box 9-12 %/frame); nothing else moves.
- Combat seq (8 frames, viewed): _00 4 LEFT telegraph under party; _01 3 LEFT; _02 2 LEFT boar dead on road at (1180,600), amber detonating-charge ring, numerals 12/26 (1220-1310,470), red chevron telegraph at (650,560), cooldown numerals 0.9/0.1; _03 1 LEFT numerals 30/12 (400,290); _04 WAVE 2/2 violet spawn rings (490,90)(1100,80)(1140,100), dark splat decal (400,420) persists through _07, decal on road (1180,620); _05 two boars spawned; _06 boar hit-flash white (960,190) + '30'; _07 chevron telegraph on swordsman (830,290), amber azone (950,215).

### RESUME 2 (2026-09-06 23:02:54): new instance resumed at P3 complete; scoring phase pending. Re-viewing frames + reference before scoring.

### RESUME 3 (2026-09-08 19:42:00): new instance resumed; P0-P3 complete in file. Plan: re-read REFERENCE_BAR, view reference + all frames/z50/seq, spot-verify analyzer numbers, then score.
NOTE (resume 3): whole-frame analyzer on the CURRENT captures (mtime 09-06 22:20-22:29) matches the technician exactly (camp 1.845/0.524 15/16; combat 15.227/3.226; shop 1.260/0.426 14/16; boss 5.120/2.034 16/16). The P0-P3 numbers above were measured on older, since-overwritten captures -> re-measuring region probes below as P1' on the current files.

### P1' region probes on CURRENT captures (resume 3; raw log captures/certA1-bible-probe-r3.txt)
```
##### CAMP captures/certA1-camp.png
grid 50: boxes with danger>20: (500,50) danger 28 | (550,50) danger 31 | (850,50) danger 40 | (650,200) danger 123 | (700,200) danger 87 | (100,600) danger 31 | (150,600) danger 49 | (100,650) danger 178 | (150,650) danger 230 | (100,700) danger 65
forge: mean luma 75.6  sat px 4779/12000  danger 569 heal 0 violet 0 amber 2490  top hue bins 20-30:48% 30-40:42% 40-50:10% 10-20:0% 50-60:0%
hearth: mean luma 148.2  sat px 12544/28800  danger 0 heal 175 violet 0 amber 12278  top hue bins 30-40:85% 40-50:13% 110-120:1% 20-30:1% 100-110:0% 120-130:0%
lanternNW: mean luma 76.0  sat px 1558/6300  danger 59 heal 0 violet 691 amber 28  top hue bins 220-230:25% 250-260:23% 260-270:14% 240-250:12% 210-220:9% 230-240:8%
lanternNE: mean luma 74.8  sat px 771/6300  danger 53 heal 0 violet 26 amber 242  top hue bins 30-40:27% 230-240:25% 20-30:21% 240-250:21% 40-50:4% 10-20:1%
lanternE: mean luma 60.1  sat px 2349/5600  danger 3 heal 0 violet 0 amber 2261  top hue bins 30-40:95% 20-30:3% 40-50:1% 220-230:1%
portal: mean luma 74.0  sat px 22794/36400  danger 0 heal 0 violet 7829 amber 0  top hue bins 230-240:50% 250-260:22% 240-250:20% 220-230:5% 260-270:3% 210-220:0%
healer: mean luma 119.9  sat px 4145/8000  danger 0 heal 1232 violet 0 amber 2836  top hue bins 30-40:68% 120-130:12% 130-140:11% 110-120:5% 340-350:1% 40-50:1%
tank: mean luma 108.7  sat px 564/9520  danger 0 heal 0 violet 0 amber 456  top hue bins 30-40:81% 220-230:10% 230-240:7% 20-30:1% 190-200:1% 210-220:0%
swordsman: mean luma 86.5  sat px 2160/7938  danger 8 heal 0 violet 0 amber 1154  top hue bins 30-40:52% 340-350:20% 330-340:14% 220-230:9% 320-330:2% 40-50:1%
archer: mean luma 83.7  sat px 972/8466  danger 0 heal 0 violet 0 amber 71  top hue bins 70-80:33% 220-230:21% 60-70:18% 230-240:18% 30-40:7% 80-90:1%
centre: mean luma 94.1  sat px 11281/24000  danger 1 heal 1653 violet 0 amber 8758  top hue bins 30-40:78% 120-130:7% 130-140:5% 340-350:4% 110-120:2% 210-220:2%
cornerTL: mean luma 41.4  sat px 118/24000  danger 0 heal 0 violet 0 amber 106  top hue bins 30-40:90% 230-240:7% 220-230:3% 20-30:1%
cornerTR: mean luma 13.1  sat px 0/24000  danger 0 heal 0 violet 0 amber 0  top hue bins 
cornerBL: mean luma 33.1  sat px 193/24000  danger 0 heal 0 violet 0 amber 0  top hue bins 210-220:75% 220-230:25%
cornerBR: mean luma 17.2  sat px 0/24000  danger 0 heal 0 violet 0 amber 0  top hue bins 
lanternSW: mean luma 126.2  sat px 1586/2400  danger 127 heal 0 violet 0 amber 736  top hue bins 20-30:53% 30-40:46% 10-20:0%
roadNdanger: mean luma 54.2  sat px 2807/4800  danger 233 heal 0 violet 0 amber 1409  top hue bins 30-40:50% 20-30:50% 40-50:0%
roadS box 660,560,100,240: LUMA >160 0.000% >200 0.000% buckets used 6/16; hist 26|53|14|7|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 5.00% of 360 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 2221;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
roadE box 900,330,300,120: LUMA >160 0.197% >200 0.011% buckets used 11/16; hist 39|42|13|4|1|1|0|0|1|0|0|0|0|0|0|0;FLAT 6.49% of 555 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 2189;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
roadW box 200,430,250,100: LUMA >160 0.076% >200 0.004% buckets used 7/16; hist 22|53|8|4|3|8|0|0|0|0|0|0|0|0|0|0;FLAT 0.81% of 372 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 1430;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
groundSE box 950,560,300,200: LUMA >160 0.000% >200 0.000% buckets used 4/16; hist 13|34|36|17|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 8.11% of 925 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerTR box 1400,0,200,120: LUMA >160 0.408% >200 0.333% buckets used 9/16; hist 85|7|8|0|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 29.60% of 375 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerBR box 1400,780,200,120: LUMA >160 0.000% >200 0.000% buckets used 2/16; hist 18|82|0|0|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 26.13% of 375 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
hearth box 600,280,180,160: LUMA >160 37.128% >200 13.722% buckets used 15/16; hist 0|0|1|2|6|8|7|6|13|19|4|16|6|6|3|2;FLAT 2.05% of 440 8x8 blocks;HUES danger 0 heal 175 violet 0 amber 12278;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
forge box 100,640,120,100: LUMA >160 6.617% >200 1.575% buckets used 13/16; hist 0|4|27|22|15|9|5|4|4|3|2|2|1|1|0|0;FLAT 2.22% of 180 8x8 blocks;HUES danger 569 heal 0 violet 0 amber 2490;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
portal box 580,0,260,140: LUMA >160 1.788% >200 0.544% buckets used 13/16; hist 0|6|24|19|18|6|7|12|5|2|1|0|0|0|0|0;FLAT 0.55% of 544 8x8 blocks;HUES danger 0 heal 0 violet 7829 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
groundNE box 1100,150,300,150: LUMA >160 0.036% >200 0.000% buckets used 8/16; hist 20|46|21|7|4|1|1|0|0|0|0|0|0|0|0|0;FLAT 7.36% of 666 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-camp.png: rings(30px from edge -> interior) 32.2 | 38.9 | 37.1 | 30.4 | 34.5 | 38.8 | 52.3
   edge L: 54.8 > 54.5 > 53.7 > 50.0 > 48.2 > 45.4
   edge R: 14.9 > 15.5 > 16.0 > 16.1 > 20.1 > 31.6
   edge T: 44.8 > 44.2 > 46.4 > 47.3 > 57.9 > 60.5
   edge B: 29.5 > 51.9 > 44.6 > 21.8 > 22.3 > 24.2
##### COMBAT captures/certA1-combat.png
grid 50: boxes with danger>20: (600,550) danger 221 | (350,850) danger 197 | (400,850) danger 323
teleBox: mean luma 171.4  sat px 12022/52800  danger 234 heal 4145 violet 0 amber 55  top hue bins 90-100:23% 100-110:20% 110-120:15% 130-140:8% 340-350:7% 120-130:6%
torchR: mean luma 136.9  sat px 11510/25600  danger 0 heal 1940 violet 0 amber 2444  top hue bins 90-100:25% 80-90:18% 30-40:14% 100-110:7% 40-50:7% 70-80:7%
torchL: mean luma 164.9  sat px 8787/25600  danger 0 heal 201 violet 0 amber 2201  top hue bins 80-90:53% 40-50:14% 70-80:12% 30-40:11% 90-100:4% 60-70:2%
wallTorchL: mean luma 176.6  sat px 295/6400  danger 0 heal 0 violet 0 amber 209  top hue bins 40-50:38% 30-40:33% 70-80:16% 60-70:10% 50-60:3% 80-90:0%
wallTorchR: mean luma 97.0  sat px 508/4900  danger 7 heal 0 violet 0 amber 336  top hue bins 30-40:50% 40-50:16% 80-90:11% 70-80:8% 20-30:6% 90-100:5%
monolith: mean luma 106.7  sat px 9417/21000  danger 0 heal 1950 violet 3399 amber 0  top hue bins 250-260:30% 110-120:8% 100-110:8% 210-220:6% 240-250:6% 120-130:4%
bolts: mean luma 214.5  sat px 0/20000  danger 0 heal 0 violet 0 amber 0  top hue bins 
grassR: mean luma 121.7  sat px 39705/45000  danger 0 heal 9297 violet 0 amber 2437  top hue bins 90-100:23% 100-110:18% 80-90:16% 110-120:12% 70-80:7% 120-130:5%
roadR: mean luma 78.3  sat px 37635/42000  danger 0 heal 2801 violet 0 amber 23367  top hue bins 40-50:49% 30-40:14% 160-170:9% 50-60:5% 170-180:4% 130-140:3%
boar: mean luma 91.8  sat px 19619/21600  danger 0 heal 2415 violet 711 amber 4022  top hue bins 200-210:27% 40-50:12% 90-100:11% 80-90:9% 30-40:8% 100-110:5%
mantis: mean luma 137.3  sat px 11574/12100  danger 0 heal 1525 violet 53 amber 0  top hue bins 80-90:27% 90-100:18% 70-80:14% 100-110:10% 150-160:5% 140-150:5%
healer: mean luma 139.2  sat px 4684/12100  danger 0 heal 2161 violet 0 amber 510  top hue bins 120-130:29% 70-80:14% 60-70:12% 40-50:11% 140-150:8% 80-90:6%
numeral: mean luma 136.0  sat px 1275/3600  danger 0 heal 1219 violet 0 amber 0  top hue bins 120-130:45% 140-150:35% 130-140:9% 110-120:5% 100-110:2% 150-160:2%
cornerTL: mean luma 75.4  sat px 11433/24000  danger 0 heal 3491 violet 0 amber 948  top hue bins 100-110:24% 90-100:14% 110-120:13% 80-90:9% 150-160:8% 140-150:7%
cornerTR: mean luma 78.6  sat px 7325/24000  danger 0 heal 4967 violet 63 amber 0  top hue bins 120-130:28% 110-120:19% 130-140:14% 100-110:14% 90-100:7% 140-150:6%
cornerBL: mean luma 116.5  sat px 18305/24000  danger 0 heal 7740 violet 0 amber 0  top hue bins 90-100:19% 80-90:17% 120-130:12% 130-140:11% 140-150:10% 100-110:9%
cornerBR: mean luma 119.3  sat px 8276/24000  danger 0 heal 221 violet 0 amber 1750  top hue bins 70-80:33% 60-70:18% 40-50:14% 80-90:11% 50-60:9% 30-40:7%
centre: mean luma 106.4  sat px 14702/24000  danger 0 heal 2388 violet 0 amber 6188  top hue bins 40-50:39% 50-60:10% 120-130:9% 60-70:8% 160-170:6% 70-80:6%
healerBoltTop: mean luma 170.6  sat px 1132/2000  danger 0 heal 169 violet 0 amber 0  top hue bins 80-90:55% 70-80:18% 90-100:10% 120-130:8% 110-120:7% 60-70:2%
boltUnder: mean luma 211.4  sat px 0/350  danger 0 heal 0 violet 0 amber 0  top hue bins 
boltGroundL: mean luma 188.9  sat px 0/350  danger 0 heal 0 violet 0 amber 0  top hue bins 
boltGroundB: mean luma 186.6  sat px 0/350  danger 0 heal 0 violet 0 amber 0  top hue bins 
boarUnder: mean luma 58.0  sat px 1579/1800  danger 0 heal 54 violet 0 amber 986  top hue bins 40-50:31% 30-40:31% 200-210:14% 100-110:4% 60-70:4% 50-60:3%
boarBelow: mean luma 92.0  sat px 1800/1800  danger 0 heal 0 violet 0 amber 1800  top hue bins 40-50:93% 30-40:7%
mantisU1: mean luma 150.8  sat px 405/480  danger 0 heal 9 violet 0 amber 0  top hue bins 80-90:34% 90-100:21% 100-110:17% 70-80:14% 190-200:8% 160-170:2%
mantisU2: mean luma 159.6  sat px 480/480  danger 0 heal 14 violet 0 amber 0  top hue bins 80-90:47% 90-100:22% 70-80:21% 190-200:3% 140-150:2% 100-110:1%
mantisBelow: mean luma 166.2  sat px 480/480  danger 0 heal 0 violet 0 amber 0  top hue bins 80-90:75% 100-110:12% 90-100:11% 70-80:2%
mantisR: mean luma 180.5  sat px 480/480  danger 0 heal 0 violet 0 amber 0  top hue bins 70-80:99% 80-90:1% 90-100:0%
mantisL: mean luma 100.5  sat px 480/480  danger 0 heal 371 violet 0 amber 0  top hue bins 140-150:36% 130-140:18% 150-160:17% 120-130:14% 110-120:9% 100-110:4%
grassR box 900,350,300,150: LUMA >160 10.949% >200 0.018% buckets used 10/16; hist 0|0|0|4|9|8|17|16|19|17|11|0|0|0|0|0;FLAT 0.00% of 666 8x8 blocks;HUES danger 0 heal 9297 violet 0 amber 2437;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
roadR box 1000,560,300,140: LUMA >160 0.010% >200 0.000% buckets used 8/16; hist 0|0|12|21|27|11|16|12|2|0|0|0|0|0|0|0;FLAT 0.00% of 629 8x8 blocks;HUES danger 0 heal 2801 violet 0 amber 23367;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
bolts box 380,680,200,100: LUMA >160 97.580% >200 77.330% buckets used 8/16; hist 0|0|0|0|0|0|0|0|0|2|4|8|21|30|19|15;FLAT 7.00% of 300 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torchR box 1000,170,160,160: LUMA >160 27.449% >200 3.273% buckets used 14/16; hist 0|0|4|2|2|5|8|10|15|25|18|5|2|1|1|0;FLAT 3.50% of 400 8x8 blocks;HUES danger 0 heal 1940 violet 0 amber 2444;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torchL box 240,470,160,160: LUMA >160 68.242% >200 7.539% buckets used 12/16; hist 0|0|0|0|1|7|3|2|2|17|27|28|8|3|2|0;FLAT 7.75% of 400 8x8 blocks;HUES danger 0 heal 201 violet 0 amber 2201;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
teleBox box 480,540,240,220: LUMA >160 61.112% >200 29.439% buckets used 12/16; hist 0|0|0|0|1|4|5|5|12|12|11|15|11|16|5|3;FLAT 6.30% of 810 8x8 blocks;HUES danger 234 heal 4145 violet 0 amber 55;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
monolith box 1280,10,140,150: LUMA >160 9.138% >200 1.243% buckets used 13/16; hist 0|0|4|7|14|18|15|14|11|7|4|4|1|1|0|0;FLAT 0.00% of 306 8x8 blocks;HUES danger 0 heal 1950 violet 3399 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
boar box 1400,570,180,120: LUMA >160 1.727% >200 0.130% buckets used 12/16; hist 0|0|9|26|14|11|6|6|17|10|1|0|0|0|0|0;FLAT 7.27% of 330 8x8 blocks;HUES danger 0 heal 2415 violet 711 amber 4022;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
grassNE box 1100,100,300,150: LUMA >160 19.869% >200 0.096% buckets used 12/16; hist 0|0|3|3|9|16|18|13|9|9|10|9|1|0|0|0;FLAT 0.00% of 666 8x8 blocks;HUES danger 0 heal 10662 violet 1708 amber 2;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerTL box 0,0,200,120: LUMA >160 0.067% >200 0.000% buckets used 11/16; hist 0|3|11|21|28|15|9|6|4|2|0|0|0|0|0|0;FLAT 6.13% of 375 8x8 blocks;HUES danger 0 heal 3491 violet 0 amber 948;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerBR box 1400,780,200,120: LUMA >160 0.338% >200 0.000% buckets used 9/16; hist 0|0|1|1|10|16|10|14|24|25|0|0|0|0|0|0;FLAT 2.67% of 375 8x8 blocks;HUES danger 0 heal 221 violet 0 amber 1750;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-combat.png: rings(30px from edge -> interior) 97.6 | 100.5 | 104.1 | 107.7 | 108.3 | 112.2 | 117.3
   edge L: 96.0 > 102.6 > 105.2 > 112.1 > 119.3 > 129.2
   edge R: 127.5 > 117.7 > 110.9 > 106.6 > 87.9 > 82.9
   edge T: 94.6 > 99.3 > 118.9 > 118.9 > 110.9 > 107.4
   edge B: 83.4 > 86.7 > 82.4 > 107.5 > 117.1 > 124.1
##### BOSS captures/certA1-boss.png
grid 50: boxes with danger>20: (950,150) danger 37 | (700,350) danger 760 | (750,350) danger 620 | (850,350) danger 143 | (900,350) danger 735 | (1000,350) danger 27 | (700,400) danger 288 | (850,400) danger 156 | (900,400) danger 1525 | (950,400) danger 612 | (1000,400) danger 295 | (1050,400) danger 69 | (650,450) danger 131 | (850,450) danger 100 | (900,450) danger 532 | (950,450) danger 482 | (1050,450) danger 31 | (650,500) danger 114 | (700,500) danger 383 | (750,500) danger 749 | (800,500) danger 588 | (850,500) danger 696 | (900,500) danger 739 | (800,550) danger 204 | (750,600) danger 68 | (750,650) danger 114
stagBox: mean luma 145.5  sat px 39936/106400  danger 9348 heal 707 violet 1227 amber 12735  top hue bins 30-40:22% 20-30:15% 10-20:13% 40-50:9% 230-240:9% 220-230:6%
crown: mean luma 192.3  sat px 203/22400  danger 0 heal 0 violet 203 amber 0  top hue bins 250-260:79% 260-270:20% 240-250:1%
ringBox: mean luma 134.7  sat px 38709/75000  danger 9452 heal 734 violet 201 amber 16616  top hue bins 30-40:30% 20-30:16% 40-50:13% 10-20:13% 0-10:5% 230-240:5%
torchR: mean luma 118.5  sat px 5622/14400  danger 424 heal 19 violet 0 amber 4513  top hue bins 30-40:46% 40-50:34% 20-30:14% 100-110:3% 10-20:2% 90-100:0%
torchTL: mean luma 135.2  sat px 1869/12100  danger 0 heal 0 violet 0 amber 958  top hue bins 30-40:40% 80-90:23% 90-100:16% 40-50:11% 70-80:7% 60-70:1%
torchBL: mean luma 111.4  sat px 14407/16800  danger 0 heal 0 violet 0 amber 9749  top hue bins 30-40:37% 40-50:30% 50-60:21% 60-70:9% 70-80:1% 80-90:1%
monolith: mean luma 86.5  sat px 13345/22400  danger 0 heal 1276 violet 5723 amber 0  top hue bins 250-260:32% 240-250:12% 220-230:11% 210-220:8% 230-240:8% 200-210:5%
grassR: mean luma 59.1  sat px 35696/60000  danger 0 heal 21885 violet 0 amber 216  top hue bins 120-130:21% 110-120:17% 130-140:13% 140-150:11% 100-110:7% 90-100:6%
roadR: mean luma 66.5  sat px 41276/45000  danger 0 heal 22704 violet 0 amber 130  top hue bins 120-130:16% 110-120:15% 80-90:12% 130-140:12% 90-100:12% 100-110:11%
cornerTL: mean luma 29.9  sat px 4/24000  danger 0 heal 0 violet 0 amber 0  top hue bins 220-230:50% 90-100:25% 100-110:25%
cornerTR: mean luma 31.5  sat px 163/24000  danger 0 heal 0 violet 21 amber 0  top hue bins 220-230:82% 240-250:13% 230-240:6%
cornerBL: mean luma 95.5  sat px 20834/24000  danger 0 heal 0 violet 0 amber 11326  top hue bins 40-50:30% 30-40:24% 50-60:11% 70-80:10% 80-90:10% 60-70:7%
cornerBR: mean luma 48.9  sat px 13806/24000  danger 0 heal 7734 violet 0 amber 0  top hue bins 100-110:20% 90-100:18% 130-140:17% 110-120:15% 140-150:13% 120-130:11%
centre: mean luma 118.8  sat px 6726/24000  danger 939 heal 538 violet 60 amber 2142  top hue bins 30-40:27% 20-30:20% 230-240:17% 130-140:8% 10-20:7% 50-60:6%
healer: mean luma 118.0  sat px 10869/19500  danger 182 heal 2814 violet 0 amber 5900  top hue bins 30-40:44% 130-140:22% 20-30:11% 40-50:10% 50-60:4% 140-150:4%
tank: mean luma 140.9  sat px 3729/10800  danger 754 heal 534 violet 30 amber 989  top hue bins 30-40:17% 20-30:16% 50-60:16% 130-140:14% 10-20:13% 40-50:9%
numeral39: mean luma 121.6  sat px 3751/9600  danger 0 heal 650 violet 0 amber 0  top hue bins 90-100:33% 100-110:26% 160-170:9% 110-120:7% 120-130:6% 170-180:6%
plate: mean luma 90.0  sat px 222/28560  danger 0 heal 0 violet 222 amber 0  top hue bins 250-260:92% 260-270:8%
chip: mean luma 62.8  sat px 221/3000  danger 0 heal 5 violet 0 amber 0  top hue bins 90-100:94% 80-90:1% 100-110:1% 110-120:1% 70-80:1% 120-130:1%
stagUnder: mean luma 179.5  sat px 806/840  danger 143 heal 0 violet 0 amber 601  top hue bins 30-40:75% 20-30:24% 350-360:0% 0-10:0% 10-20:0% 330-340:0%
stagFlankR: mean luma 150.7  sat px 840/840  danger 88 heal 0 violet 0 amber 658  top hue bins 40-50:53% 30-40:25% 10-20:8% 80-90:6% 20-30:3% 50-60:2%
stagFlankL: mean luma 128.2  sat px 802/840  danger 235 heal 43 violet 0 amber 412  top hue bins 30-40:51% 10-20:20% 20-30:12% 150-160:11% 140-150:5% 40-50:1%
stagLower: mean luma 153.6  sat px 840/840  danger 0 heal 0 violet 0 amber 704  top hue bins 30-40:82% 80-90:12% 70-80:2% 40-50:2% 60-70:2% 50-60:0%
tankHit: mean luma 129.7  sat px 9195/13500  danger 1845 heal 672 violet 25 amber 4434  top hue bins 30-40:45% 20-30:16% 230-240:10% 10-20:9% 50-60:7% 130-140:6%
stagBox box 700,180,280,380: LUMA >160 37.276% >200 13.961% buckets used 14/16; hist 0|0|1|2|6|12|8|8|10|17|12|7|7|6|2|3;FLAT 6.26% of 1645 8x8 blocks;HUES danger 9348 heal 707 violet 1227 amber 12735;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
crown box 760,150,160,140: LUMA >160 76.210% >200 47.701% buckets used 12/16; hist 0|0|0|0|0|1|2|4|7|10|11|10|15|16|10|14;FLAT 3.82% of 340 8x8 blocks;HUES danger 0 heal 0 violet 203 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
ringBox box 690,320,300,250: LUMA >160 27.711% >200 2.431% buckets used 14/16; hist 0|0|1|3|6|14|7|7|13|22|15|8|4|1|0|0;FLAT 7.93% of 1147 8x8 blocks;HUES danger 9452 heal 734 violet 201 amber 16616;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torchR box 1000,360,120,120: LUMA >160 14.160% >200 7.278% buckets used 15/16; hist 0|1|8|4|5|10|17|20|18|4|3|3|2|2|4|0;FLAT 4.89% of 225 8x8 blocks;HUES danger 424 heal 19 violet 0 amber 4513;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torchTL box 270,80,110,110: LUMA >160 18.033% >200 4.256% buckets used 13/16; hist 0|0|0|2|2|8|13|16|22|19|7|5|4|1|1|0;FLAT 0.00% of 169 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 958;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torchBL box 90,770,140,120: LUMA >160 14.310% >200 3.179% buckets used 13/16; hist 0|5|8|3|5|10|19|15|13|8|7|4|2|2|0|0;FLAT 1.96% of 255 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 9749;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
monolith box 1290,120,140,160: LUMA >160 7.723% >200 2.022% buckets used 14/16; hist 0|3|10|23|22|13|7|6|5|4|3|3|1|1|1|0;FLAT 0.29% of 340 8x8 blocks;HUES danger 0 heal 1276 violet 5723 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
grassR box 1100,450,300,200: LUMA >160 0.022% >200 0.000% buckets used 7/16; hist 0|1|33|36|15|8|6|1|0|0|0|0|0|0|0|0;FLAT 2.38% of 925 8x8 blocks;HUES danger 0 heal 21885 violet 0 amber 216;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
roadR box 1000,600,300,150: LUMA >160 0.000% >200 0.000% buckets used 8/16; hist 0|1|21|31|20|13|12|2|0|0|0|0|0|0|0|0;FLAT 1.20% of 666 8x8 blocks;HUES danger 0 heal 22704 violet 0 amber 130;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerTL box 0,0,200,120: LUMA >160 0.000% >200 0.000% buckets used 6/16; hist 31|37|9|12|11|1|0|0|0|0|0|0|0|0|0|0;FLAT 38.13% of 375 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerTR box 1400,0,200,120: LUMA >160 0.450% >200 0.375% buckets used 13/16; hist 18|48|15|12|7|0|0|0|0|0|0|0|0|0|0|0;FLAT 20.00% of 375 8x8 blocks;HUES danger 0 heal 0 violet 21 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
plate box 392,14,816,35: LUMA >160 27.532% >200 11.894% buckets used 14/16; hist 0|36|23|2|0|1|3|0|2|6|10|4|4|1|9|0;FLAT 7.35% of 408 8x8 blocks;HUES danger 0 heal 0 violet 222 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
grassSE box 1200,650,300,150: LUMA >160 0.000% >200 0.000% buckets used 7/16; hist 0|1|58|32|5|3|1|0|0|0|0|0|0|0|0|0;FLAT 1.95% of 666 8x8 blocks;HUES danger 0 heal 33498 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-boss.png: rings(30px from edge -> interior) 53.1 | 59.2 | 59.0 | 65.8 | 66.3 | 76.8 | 88.8
   edge L: 77.0 > 79.4 > 78.4 > 77.4 > 80.6 > 78.3
   edge R: 60.0 > 57.8 > 58.5 > 47.9 > 51.8 > 57.4
   edge T: 57.0 > 65.6 > 49.6 > 73.6 > 73.7 > 107.5
   edge B: 50.5 > 62.9 > 55.9 > 52.0 > 51.3 > 51.1
##### SHOP captures/certA1-shop.png
modal: mean luma 44.6  sat px 17088/394992  danger 0 heal 0 violet 0 amber 14346  top hue bins 30-40:69% 200-210:16% 40-50:15% 190-200:0% 60-70:0%
cardBounce: mean luma 53.0  sat px 428/49392  danger 0 heal 0 violet 0 amber 428  top hue bins 30-40:100%
cardDetonate: mean luma 50.8  sat px 3169/49392  danger 0 heal 0 violet 0 amber 428  top hue bins 200-210:86% 30-40:14% 190-200:0%
cardAscend: mean luma 50.4  sat px 3230/49392  danger 0 heal 0 violet 0 amber 3230  top hue bins 30-40:100%
plaque1: mean luma 50.5  sat px 690/5040  danger 0 heal 0 violet 0 amber 690  top hue bins 40-50:73% 30-40:27%
plaque2: mean luma 51.5  sat px 728/5040  danger 0 heal 0 violet 0 amber 728  top hue bins 40-50:66% 30-40:34%
plaque3: mean luma 50.2  sat px 686/5040  danger 0 heal 0 violet 0 amber 686  top hue bins 40-50:72% 30-40:28%
advance: mean luma 51.0  sat px 6953/19200  danger 0 heal 0 violet 0 amber 6953  top hue bins 30-40:100%
torch: mean luma 51.2  sat px 4152/18200  danger 0 heal 0 violet 0 amber 2723  top hue bins 40-50:36% 30-40:30% 70-80:19% 60-70:9% 50-60:4% 80-90:3%
monolith: mean luma 42.7  sat px 588/21000  danger 0 heal 0 violet 0 amber 0  top hue bins 70-80:43% 80-90:41% 60-70:15% 90-100:1%
arenaL: mean luma 48.7  sat px 87171/185000  danger 0 heal 12 violet 0 amber 11319  top hue bins 80-90:40% 70-80:36% 40-50:8% 90-100:7% 30-40:5% 60-70:4%
arenaR: mean luma 43.3  sat px 41257/185000  danger 0 heal 12 violet 0 amber 972  top hue bins 80-90:42% 70-80:27% 90-100:19% 60-70:5% 100-110:4% 40-50:2%
arenaBelow: mean luma 38.7  sat px 19019/134400  danger 0 heal 1 violet 0 amber 0  top hue bins 90-100:45% 80-90:33% 100-110:13% 70-80:8% 60-70:1% 110-120:0%
cornerBR: mean luma 43.5  sat px 367/24000  danger 0 heal 0 violet 0 amber 220  top hue bins 40-50:40% 70-80:33% 30-40:20% 80-90:6% 50-60:1%
walletChip: mean luma 46.5  sat px 555/11600  danger 0 heal 0 violet 0 amber 555  top hue bins 40-50:96% 30-40:4%
modal box 378,168,844,468: LUMA >160 3.669% >200 1.091% buckets used 14/16; hist 0|38|51|1|1|1|1|1|1|1|1|1|1|0|1|0;FLAT 61.94% of 6090 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 14346;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cardBounce box 402,292,252,196: LUMA >160 8.404% >200 1.071% buckets used 13/16; hist 0|30|56|1|1|0|1|1|1|1|1|2|5|0|1|0;FLAT 57.53% of 744 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 428;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cardDetonate box 674,292,252,196: LUMA >160 3.432% >200 1.326% buckets used 13/16; hist 0|30|56|1|1|0|1|1|2|5|1|1|0|0|1|0;FLAT 59.27% of 744 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 428;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cardAscend box 946,292,252,196: LUMA >160 7.738% >200 1.004% buckets used 13/16; hist 0|28|58|1|1|0|1|1|1|1|6|0|0|0|1|0;FLAT 61.16% of 744 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 3230;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
advance box 640,540,320,60: LUMA >160 5.078% >200 0.000% buckets used 10/16; hist 0|49|32|4|0|0|1|8|0|1|5|0|0|0|0|0;FLAT 9.64% of 280 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 6953;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
torch box 270,480,140,130: LUMA >160 0.099% >200 0.000% buckets used 6/16; hist 0|28|14|35|22|1|0|0|0|0|0|0|0|0|0|0;FLAT 31.99% of 272 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 2723;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
monolith box 1290,10,140,150: LUMA >160 0.000% >200 0.000% buckets used 3/16; hist 0|2|78|20|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 12.42% of 306 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
arenaL box 0,150,370,500: LUMA >160 0.000% >200 0.000% buckets used 4/16; hist 0|2|47|46|5|0|0|0|0|0|0|0|0|0|0|0;FLAT 39.80% of 2852 8x8 blocks;HUES danger 0 heal 12 violet 0 amber 11319;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
arenaR box 1230,150,370,500: LUMA >160 0.000% >200 0.000% buckets used 3/16; hist 0|2|78|20|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 44.53% of 2852 8x8 blocks;HUES danger 0 heal 12 violet 0 amber 972;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
arenaBelow box 380,640,840,160: LUMA >160 0.000% >200 0.000% buckets used 4/16; hist 0|18|71|11|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 68.00% of 2100 8x8 blocks;HUES danger 0 heal 1 violet 0 amber 0;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
cornerBR box 1400,780,200,120: LUMA >160 0.000% >200 0.000% buckets used 3/16; hist 0|0|99|1|0|0|0|0|0|0|0|0|0|0|0|0;FLAT 90.40% of 375 8x8 blocks;HUES danger 0 heal 0 violet 0 amber 220;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-shop.png: rings(30px from edge -> interior) 41.4 | 46.1 | 45.6 | 43.2 | 43.2 | 44.3 | 44.6
   edge L: 41.4 > 43.0 > 43.3 > 44.9 > 47.4 > 49.7
   edge R: 47.2 > 45.8 > 44.6 > 44.2 > 42.0 > 41.0
   edge T: 41.7 > 44.8 > 47.5 > 48.0 > 45.4 > 45.7
   edge B: 41.0 > 58.5 > 51.8 > 39.9 > 40.1 > 41.7
docs/reference/pass-the-fear.png: rings(30px from edge -> interior) 27.4 | 34.3 | 34.5 | 40.3 | 43.1 | 49.5 | 53.7
   edge L: 11.6 > 21.7 > 19.1 > 18.4 > 19.3 > 21.5
   edge R: 41.0 > 31.0 > 35.2 > 47.9 > 48.5 > 72.2
   edge T: 66.1 > 63.1 > 60.8 > 71.4 > 66.5 > 69.2
   edge B: 11.8 > 15.1 > 17.0 > 22.6 > 28.4 > 35.8
```

### P2' console / diffs / crops on CURRENT captures (resume 3; raw log captures/certA1-bible-probe-r3b.txt)
```
##### CONSOLE HYGIENE (current consoles)
camp: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 10 lines 22
camp-z50: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 10 lines 22
campseq: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 10 lines 22
combat: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 38 lines 51
combat-z50: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 38 lines 51
combatseq: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 59 lines 72
shop: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 10 lines 24
boss: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 31 lines 44
boss-z50: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 31 lines 44
bossseq: PAGEERROR 0 HARNESS-ERROR 0 [error] 0 REQFAIL 0 warn 52 lines 65
##### SEQUENCE DIFFS (current)
certA1-campseq_00.png -> certA1-campseq_01.png: changed 1.34%  bbox 0,0-1599,899
certA1-campseq_01.png -> certA1-campseq_02.png: changed 1.77%  bbox 0,0-1599,890
certA1-campseq_02.png -> certA1-campseq_03.png: changed 1.16%  bbox 1,0-1588,890
certA1-campseq_03.png -> certA1-campseq_04.png: changed 1.15%  bbox 1,0-1578,899
certA1-campseq_04.png -> certA1-campseq_05.png: changed 1.72%  bbox 0,0-1562,899
hearth certA1-campseq_00.png -> certA1-campseq_01.png: changed 3.37%  bbox 5,2-179,159
hearth certA1-campseq_01.png -> certA1-campseq_02.png: changed 2.76%  bbox 9,3-179,159
hearth certA1-campseq_02.png -> certA1-campseq_03.png: changed 3.27%  bbox 44,0-179,159
hearth certA1-campseq_03.png -> certA1-campseq_04.png: changed 1.91%  bbox 9,0-179,159
hearth certA1-campseq_04.png -> certA1-campseq_05.png: changed 5.05%  bbox 9,0-179,159
healer certA1-campseq_00.png -> certA1-campseq_01.png: changed 9.75%  bbox 30,0-159,129
healer certA1-campseq_01.png -> certA1-campseq_02.png: changed 10.64%  bbox 30,0-159,129
healer certA1-campseq_02.png -> certA1-campseq_03.png: changed 7.17%  bbox 2,0-159,129
healer certA1-campseq_03.png -> certA1-campseq_04.png: changed 8.17%  bbox 0,0-159,129
healer certA1-campseq_04.png -> certA1-campseq_05.png: changed 6.00%  bbox 0,0-159,129
certA1-combatseq_00.png -> certA1-combatseq_01.png: changed 18.99%  bbox 0,0-1599,899
certA1-combatseq_01.png -> certA1-combatseq_02.png: changed 7.25%  bbox 5,13-1591,899
certA1-combatseq_02.png -> certA1-combatseq_03.png: changed 11.40%  bbox 1,0-1599,899
certA1-combatseq_03.png -> certA1-combatseq_04.png: changed 9.28%  bbox 1,0-1599,899
certA1-combatseq_04.png -> certA1-combatseq_05.png: changed 12.15%  bbox 3,0-1599,899
certA1-combatseq_05.png -> certA1-combatseq_06.png: changed 6.44%  bbox 6,0-1591,896
certA1-combatseq_06.png -> certA1-combatseq_07.png: changed 9.78%  bbox 0,0-1599,899
certA1-bossseq_00.png -> certA1-bossseq_01.png: changed 48.55%  bbox 0,0-1599,899
certA1-bossseq_01.png -> certA1-bossseq_02.png: changed 34.78%  bbox 0,0-1599,899
certA1-bossseq_02.png -> certA1-bossseq_03.png: changed 7.87%  bbox 0,0-1599,899
certA1-bossseq_03.png -> certA1-bossseq_04.png: changed 42.69%  bbox 0,0-1599,899
certA1-bossseq_04.png -> certA1-bossseq_05.png: changed 59.70%  bbox 0,0-1599,899
certA1-bossseq_05.png -> certA1-bossseq_06.png: changed 9.01%  bbox 0,0-1599,899
certA1-bossseq_06.png -> certA1-bossseq_07.png: changed 11.64%  bbox 9,11-1584,899
stag certA1-bossseq_00.png -> certA1-bossseq_01.png: changed 82.15%  bbox 0,0-299,419
stag certA1-bossseq_01.png -> certA1-bossseq_02.png: changed 67.32%  bbox 0,0-299,419
stag certA1-bossseq_02.png -> certA1-bossseq_03.png: changed 22.69%  bbox 0,3-299,419
stag certA1-bossseq_03.png -> certA1-bossseq_04.png: changed 68.15%  bbox 0,0-299,419
stag certA1-bossseq_04.png -> certA1-bossseq_05.png: changed 76.00%  bbox 0,0-299,419
stag certA1-bossseq_05.png -> certA1-bossseq_06.png: changed 26.89%  bbox 0,2-299,419
stag certA1-bossseq_06.png -> certA1-bossseq_07.png: changed 37.05%  bbox 0,0-279,419
##### SEQ analyzer (current)
captures/certA1-combatseq_01.png: LUMA >160 9.803% >200 1.202% buckets used 15/16;FLAT 1.71% of 22400 8x8 blocks;HUES danger 4 heal 322284 violet 4192 amber 128974;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-combatseq_02.png: LUMA >160 11.107% >200 1.466% buckets used 15/16;FLAT 1.63% of 22400 8x8 blocks;HUES danger 15 heal 308640 violet 3541 amber 127207;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-combatseq_04.png: LUMA >160 13.404% >200 3.386% buckets used 15/16;FLAT 1.55% of 22400 8x8 blocks;HUES danger 6 heal 297663 violet 3909 amber 134795;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-combatseq_05.png: LUMA >160 9.778% >200 1.594% buckets used 14/16;FLAT 1.58% of 22400 8x8 blocks;HUES danger 42 heal 335823 violet 3926 amber 151432;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-combatseq_06.png: LUMA >160 11.367% >200 2.267% buckets used 15/16;FLAT 1.49% of 22400 8x8 blocks;HUES danger 4 heal 313157 violet 4127 amber 149289;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-bossseq_01.png: LUMA >160 6.774% >200 2.955% buckets used 16/16;FLAT 6.90% of 22400 8x8 blocks;HUES danger 3114 heal 198745 violet 9909 amber 119417;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-bossseq_03.png: LUMA >160 4.455% >200 1.731% buckets used 16/16;FLAT 6.80% of 22400 8x8 blocks;HUES danger 3697 heal 207035 violet 7287 amber 103447;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-bossseq_05.png: LUMA >160 5.703% >200 3.550% buckets used 16/16;FLAT 6.01% of 22400 8x8 blocks;HUES danger 2931 heal 203417 violet 7346 amber 131681;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
captures/certA1-bossseq_06.png: LUMA >160 4.255% >200 2.206% buckets used 16/16;FLAT 5.65% of 22400 8x8 blocks;HUES danger 5196 heal 204064 violet 8856 amber 129677;Benchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.;
##### CROPS
combat-bolts: box 380,680,200,100  luma mean 214.5  min 129  max 250
combat-bolts: cols(mean luma every 8px): 200 208 216 220 222 221 219 217 221 227 231 233 232 229 225 218 212 212 211 215 215 210 193 186 179
combat-bolts: rows(mean luma every 4px): 199 199 205 207 207 211 213 215 216 219 220 219 221 223 222 220 220 219 218 219 218 216 215 212 209
combat-bolts: wrote captures/certA1-bible-r3-combat-bolts.png (800x400)
combat-tele: box 500,530,220,220  luma mean 166.4  min 69  max 253
combat-tele: wrote captures/certA1-bible-r3-combat-tele.png (440x440)
combat-healer: box 730,360,120,130  luma mean 140.7  min 31  max 252
combat-healer: wrote captures/certA1-bible-r3-combat-healer.png (360x390)
combat-boar: box 1400,570,180,120  luma mean 91.8  min 30  max 209
combat-boar: cols(mean luma every 7px): 78 80 67 68 63 62 62 63 65 71 72 84 98 104 102 109 114 117 117 120 117 116 106 108 108 110
combat-boar: rows(mean luma every 5px): 117 119 114 115 111 110 101 98 109 103 97 100 94 88 89 92 92 85 75 64 58 57 62 69
combat-boar: wrote captures/certA1-bible-r3-combat-boar.png (540x360)
combat-mantis: box 60,250,160,140  luma mean 134.1  min 37  max 231
combat-mantis: cols(mean luma every 6px): 97 99 101 102 100 104 116 122 123 128 124 128 123 126 131 145 145 138 145 152 154 157 166 170 170 169 170
combat-mantis: rows(mean luma every 5px): 63 67 76 90 101 111 121 130 130 122 120 119 122 128 139 149 146 136 145 143 151 164 171 175 178 176 171 167
combat-mantis: wrote captures/certA1-bible-r3-combat-mantis.png (480x420)
combat-torchR: box 1000,170,160,160  luma mean 136.9  min 25  max 239
combat-torchR: wrote captures/certA1-bible-r3-combat-torchR.png (320x320)
combat-pointer: box 370,830,90,70  luma mean 181.0  min 53  max 231
combat-pointer: wrote captures/certA1-bible-r3-combat-pointer.png (360x280)
boss-stag: box 690,150,300,420  luma mean 142.5  min 30  max 254
boss-stag: wrote captures/certA1-bible-r3-boss-stag.png (600x840)
boss-stagbase: box 720,500,220,80  luma mean 146.6  min 35  max 239
boss-stagbase: cols(mean luma every 9px): 157 153 127 151 145 118 141 170 126 137 142 144 147 144 139 124 139 171 168 164 160 150 151 149 149
boss-stagbase: rows(mean luma every 3px): 126 140 140 138 133 129 127 124 133 155 158 159 151 146 145 150 155 161 162 160 158 157 154 149 146 144 147
boss-stagbase: wrote captures/certA1-bible-r3-boss-stagbase.png (880x320)
boss-ring: box 680,320,320,250  luma mean 134.2  min 30  max 245
boss-ring: wrote captures/certA1-bible-r3-boss-ring.png (640x500)
boss-healer: box 660,560,170,170  luma mean 111.4  min 29  max 250
boss-healer: cols(mean luma every 7px): 79 84 89 104 124 129 164 143 119 115 114 112 106 103 100 101 114 134 107 106 101 102 103 103 103
boss-healer: rows(mean luma every 7px): 145 151 157 160 159 158 152 145 135 122 117 102 80 82 82 81 82 84 86 97 106 108 66 62 55
boss-healer: wrote captures/certA1-bible-r3-boss-healer.png (510x510)
boss-torchR: box 1000,360,120,120  luma mean 118.5  min 28  max 241
boss-torchR: wrote captures/certA1-bible-r3-boss-torchR.png (360x360)
boss-plate: box 390,10,820,45  luma mean 80.1  min 10  max 239
boss-plate: wrote captures/certA1-bible-r3-boss-plate.png (1640x90)
boss-chip: box 490,750,70,60  luma mean 55.5  min 15  max 239
boss-chip: wrote captures/certA1-bible-r3-boss-chip.png (280x240)
boss-num39: box 1060,290,160,100  luma mean 109.8  min 21  max 239
boss-num39: wrote captures/certA1-bible-r3-boss-num39.png (480x300)
camp-lanternNW: box 500,20,100,110  luma mean 73.4  min 21  max 218
camp-lanternNW: wrote captures/certA1-bible-r3-camp-lanternNW.png (300x330)
camp-lanternE: box 1350,320,110,100  luma mean 49.5  min 6  max 230
camp-lanternE: wrote captures/certA1-bible-r3-camp-lanternE.png (330x300)
camp-forge: box 90,620,150,130  luma mean 62.5  min 18  max 221
camp-forge: wrote captures/certA1-bible-r3-camp-forge.png (450x390)
camp-hearth: box 590,270,200,180  luma mean 143.6  min 27  max 251
camp-hearth: wrote captures/certA1-bible-r3-camp-hearth.png (400x360)
camp-portal: box 570,0,280,150  luma mean 72.5  min 20  max 212
camp-portal: wrote captures/certA1-bible-r3-camp-portal.png (560x300)
camp-healer: box 720,340,160,140  luma mean 119.3  min 16  max 219
camp-healer: cols(mean luma every 6px): 149 141 138 136 120 120 116 122 128 121 120 125 125 124 121 132 128 137 139 130 97 86 96 97 113 100 100
camp-healer: rows(mean luma every 5px): 134 136 139 147 152 146 135 127 120 124 135 133 128 126 118 118 111 110 101 97 92 103 103 98 93 96 110 118
camp-healer: wrote captures/certA1-bible-r3-camp-healer.png (480x420)
camp-tank: box 420,320,150,120  luma mean 100.4  min 4  max 221
camp-tank: cols(mean luma every 6px): 35 38 40 42 46 58 53 85 88 94 120 122 138 138 142 139 136 122 119 117 111 132 127 118 118
camp-tank: rows(mean luma every 5px): 63 64 65 67 68 76 95 105 105 109 112 103 102 105 114 118 121 120 122 121 118 112 108 103
camp-tank: wrote captures/certA1-bible-r3-camp-tank.png (450x360)
camp-swordsman: box 820,300,130,120  luma mean 84.8  min 16  max 217
camp-swordsman: wrote captures/certA1-bible-r3-camp-swordsman.png (390x360)
camp-archer: box 440,140,150,180  luma mean 71.9  min 3  max 210
camp-archer: wrote captures/certA1-bible-r3-camp-archer.png (450x540)
camp-hud: box 500,805,600,80  luma mean 58.7  min 8  max 239
camp-hud: wrote captures/certA1-bible-r3-camp-hud.png (1200x160)
camp-version: box 0,865,80,35  luma mean 41.6  min 21  max 208
camp-version: wrote captures/certA1-bible-r3-camp-version.png (320x140)
camp-cart: box 1220,400,240,220  luma mean 65.7  min 5  max 136
camp-cart: wrote captures/certA1-bible-r3-camp-cart.png (480x440)
shop-ascend: box 946,292,252,196  luma mean 50.4  min 20  max 239
shop-ascend: wrote captures/certA1-bible-r3-shop-ascend.png (504x392)
shop-plaque: box 740,495,120,45  luma mean 51.7  min 18  max 180
shop-plaque: wrote captures/certA1-bible-r3-shop-plaque.png (480x180)
shop-advance: box 640,540,320,60  luma mean 51.0  min 31  max 170
shop-advance: wrote captures/certA1-bible-r3-shop-advance.png (960x180)
shop-torch: box 260,470,160,150  luma mean 50.7  min 18  max 194
shop-torch: wrote captures/certA1-bible-r3-shop-torch.png (480x450)
shop-wallet: box 655,243,290,40  luma mean 46.5  min 31  max 239
shop-wallet: wrote captures/certA1-bible-r3-shop-wallet.png (870x120)
ref-tele: box 1290,520,270,180  luma mean 84.4  min 10  max 243
ref-tele: wrote captures/certA1-bible-r3-ref-tele.png (540x360)
ref-player: box 890,480,120,120  luma mean 82.6  min 8  max 253
ref-player: cols(mean luma every 5px): 45 45 45 47 52 62 63 81 100 100 95 89 106 83 102 103 118 119 102 90 88 79 77 76
ref-player: rows(mean luma every 5px): 66 79 80 87 92 117 129 117 113 108 97 77 75 77 86 92 84 66 72 79 70 54 46 44
ref-player: wrote captures/certA1-bible-r3-ref-player.png (480x480)
ref-fireball: box 780,220,100,120  luma mean 74.6  min 11  max 240
ref-fireball: wrote captures/certA1-bible-r3-ref-fireball.png (400x480)
ref-torch: box 1350,290,120,160  luma mean 78.2  min 2  max 247
ref-torch: wrote captures/certA1-bible-r3-ref-torch.png (360x480)
ref-hud: box 1440,830,460,240  luma mean 48.4  min 0  max 255
ref-hud: wrote captures/certA1-bible-r3-ref-hud.png (920x480)
```

### P3' extra probes (resume 3; raw captures/certA1-bible-probe-r3c.txt)
```
##### earlier shop motion captures
963370 09-04_19:57 captures/certA1-bible-shop-hover.png
942545 09-04_19:57 captures/certA1-bible-shop-hoverAscend.png
941597 09-04_19:57 captures/certA1-bible-shop-s0.png
966559 09-04_19:57 captures/certA1-bible-shop-s1.png
Binary file captures/certA1-bible-shop.console.txt matches
##### bossseq_02 (no quake ring) stag ground contact
s2under: mean luma 121.6  sat px 236/800  danger 3 heal 0 violet 0 amber 0  top hue bins 310-320:83% 180-190:11% 170-180:2% 190-200:2% 20-30:1% 320-330:1%
s2flankL: mean luma 158.6  sat px 2/600  danger 2 heal 0 violet 0 amber 0  top hue bins 10-20:100%
s2flankR: mean luma 142.8  sat px 588/600  danger 0 heal 0 violet 0 amber 585  top hue bins 30-40:68% 40-50:32% 20-30:1%
s2lower: mean luma 159.3  sat px 336/600  danger 275 heal 0 violet 0 amber 0  top hue bins 10-20:53% 0-10:44% 20-30:3%
s2stagBox: mean luma 158.9  sat px 15149/72000  danger 303 heal 51 violet 602 amber 8832  top hue bins 40-50:36% 30-40:23% 50-60:16% 60-70:5% 260-270:3% 320-330:3%
box 700,300,300,240  luma mean 158.9  min 31  max 254
cols(mean luma every 12px): 129 147 141 162 170 184 190 183 185 183 178 174 183 174 181 178 167 157 148 137 134 119 113 127 121
rows(mean luma every 10px): 138 149 173 181 185 172 175 172 172 172 173 170 165 158 155 154 146 136 141 152 147 140 135 129
wrote captures/certA1-bible-r3-bossseq02-stag.png (600x480)
##### bossseq_03 stag contact (ring absent, HP 844)
s3under: mean luma 156.7  sat px 131/800  danger 3 heal 0 violet 0 amber 39  top hue bins 180-190:46% 30-40:27% 170-180:11% 190-200:5% 20-30:4% 310-320:3%
s3flankL: mean luma 156.0  sat px 25/600  danger 25 heal 0 violet 0 amber 0  top hue bins 10-20:88% 20-30:12%
s3flankR: mean luma 148.0  sat px 592/600  danger 0 heal 0 violet 0 amber 564  top hue bins 40-50:58% 30-40:37% 50-60:3% 180-190:1% 20-30:0%
s3lower: mean luma 106.2  sat px 456/600  danger 222 heal 0 violet 0 amber 0  top hue bins 320-330:36% 0-10:25% 20-30:14% 10-20:13% 310-320:11% 330-340:1%
##### combat mantis silhouette width: saturated-blue px per column in box 100,290,80,80
blue px total 1600 cols 0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80
##### HUD skill-slot text vs icons: slots box 770,815,320,65
slots: mean luma 48.8  sat px 0/20800  danger 0 heal 0 violet 0 amber 0  top hue bins 
portraits: mean luma 78.5  sat px 1572/16575  danger 4 heal 364 violet 0 amber 47  top hue bins 340-350:21% 70-80:21% 130-140:15% 350-360:15% 60-70:15% 120-130:8%
banner: mean luma 68.3  sat px 377/10800  danger 0 heal 32 violet 0 amber 210  top hue bins 30-40:36% 100-110:20% 40-50:19% 90-100:16% 110-120:8% 130-140:1%
```

### P4' shop motion + bolt-ground probes (resume 3; raw captures/certA1-bible-probe-r3d.txt)
```
##### earlier bible-shop captures: version + evals
      1 v0.4.16
[EVAL] "armed 464 seed 4242 v0.4.16"
[EVAL] {"tick":464,"room":7,"phase":"shop","mode":"shop"}
[EVAL] {"tag":"s0","tick":530,"fps":33.1,"ui":"shop","cards":[["Bounce",1,402,292],["Detonate",1,674,292],["Ascend",1,946,292]]}
[EVAL] {"tag":"s1","tick":601}
[EVAL] {"tag":"hoverBounce","tick":671,"cls":"rn-card","box":[402,292,252,196],"transform":"none","boxShadow":"rgb(34, 31, 27) 0px 0px 0px 2px, rgba(0, 0, 0, 0.667) 0px 12px 30px 0px","border":"rgb(201, 194, 179)","filter":"none","bg":"rgba(0, 0, 0, 0)","outli
[EVAL] {"tag":"hoverAscend","tick":743,"cls":"rn-card rn-legendary","box":[946,292,252,196],"transform":"none","boxShadow":"rgb(34, 31, 27) 0px 0px 0px 2px, rgba(0, 0, 0, 0.667) 0px 12px 30px 0px","border":"rgb(232, 162, 61)","filter":"none","bg":"rgba(0, 0, 0
[EVAL] {"tag":"hoverAdvance","tick":818,"cls":"rn-btn rn-advance rn-primary rn-focus","box":[650,547,300,42],"transform":"matrix(1, 0, 0, 1, 0, -2)","boxShadow":"rgba(232, 162, 61, 0.267) 0px 0px 18px 0px","border":"rgba(232, 162, 61, 0.667)","filter":"none","
[EVAL] {"tag":"end","tick":818,"fps":33,"ui":"shop","wallet":72}
##### shop motion diffs (my re-run)
whole certA1-bible-shop-s0.png -> certA1-bible-shop-s1.png: changed 1.09%  bbox 105,19-1526,803
whole certA1-bible-shop-s1.png -> certA1-bible-shop-hover.png: changed 0.68%  bbox 61,37-1491,875
whole certA1-bible-shop-hover.png -> certA1-bible-shop-hoverAscend.png: changed 2.04%  bbox 95,39-1434,808
BounceBox certA1-bible-shop-s0.png -> certA1-bible-shop-s1.png: changed 0.00%  bbox 252,196-0,0
BounceBox certA1-bible-shop-s1.png -> certA1-bible-shop-hover.png: changed 0.00%  bbox 252,196-0,0
AscendBox certA1-bible-shop-s0.png -> certA1-bible-shop-s1.png: changed 31.03%  bbox 53,3-225,192
AscendBox certA1-bible-shop-s1.png -> certA1-bible-shop-hoverAscend.png: changed 31.03%  bbox 53,3-225,192
backdropTop certA1-bible-shop-s0.png -> certA1-bible-shop-s1.png: changed 0.01%  bbox 650,19-867,127
AdvanceBox(s1->hoverAscend, mouse not on it) certA1-bible-shop-s1.png -> certA1-bible-shop-hoverAscend.png: changed 0.00%  bbox 320,60-0,0
##### combat bolt ground: any dip below ambient near bolts? 4x4 min-mean scan in 380,680,200,100 excluding luma>205
darkest 4x4 cells: 125@380,692 125@384,684 125@384,680 126@456,708 126@384,688 126@452,704 126@380,688 127@380,696
ambient ground cells (380-420,760-780) mean 149.6
```
