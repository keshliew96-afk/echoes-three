STATUS: COMPLETE
VERDICT: ALL FOUR FRAMES PASS the reference bar (no zeros) — camp 19/20, combat 16/20 (at the floor), shop 18/20, boss 18/20. Shared gap: unpainted ground (check 1 = 1 on every frame); combat also below ref on silhouettes-in-clump, VFX (sticker bolts, 5-luma mantis kill decal) and enemy/projectile grounding.

# Cert score — REFERENCE MATCHER lens — round 5 (r5)

Critic: reference-matcher (fresh context; resumed once from a PARTIAL checkpoint, the probe log below is cumulative).
Build under test: v0.4.63. Frames: certA5-{camp,combat,shop,boss} (+ z50 + seq), all conditionsMet true, all exit 0, 0 PAGEERROR.
Reference: docs/reference/pass-the-fear.png (viewed) + REFERENCE_BAR.md refs A-D. Technician analyzer numbers re-run by me: identical (Probe 1).
My own captures: certA5-ref-shopz / certA5-ref-shopseq_00..05 (shop had no zoom/seq) and certA5-ref-kill (+ -t0 / -t1500 shots) for the kill-decal question.

## Totals

| Frame | 1 ground | 2 light | 3 silh | 4 props | 5 VFX | 6 colour | 7 post | 8 ground'g | 9 UI | 10 motion | Total | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| camp   | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **19/20** | PASS |
| combat | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 2 | 2 | **16/20** | PASS (at the floor) |
| shop   | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | **18/20** | PASS |
| boss   | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **18/20** | PASS |

## CAMP — certA5-camp.png — 19/20

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | Whole-frame FLAT 1.81% only because of dither grain. Box (850,450,500,330) = 8/16 buckets, hist 19-39-29-6-3, >160 0.008%, amber 3 px; box (1000,620,220,170) = 5/16, cool 99.9%, FLAT 0.00%. Crop certA5-ref-camp-ground.png: smooth navy gradient + dark road band, ~8 tufts, 8 motes, no decals, cracks or tiles. Reference floor box (800,600,500,360) = 14/16 with brick + mortar + cracks + moss. The reference paints its surface; (200,480)-(450,800) and (950,600)-(1250,800) here are empty gradient. |
| 2 | Layered light | 2 | Cool ambient (cool 79.8% vs ref 76.4%). Hearth core (640,300,120,110) >200 47.1%, 13/16. Four lantern/pole pools (530,90)/(890,105)/(150,690)/(1400,370), two tent glows (330,220)/(1060,215), violet portal box (600,10,220,110) violet 3507. 17 emitters, each with a halo. |
| 3 | Silhouette @50% | 2 | certA5-camp-z50.png: the four rigs sit on separate rings at (250,200)/(255,100)/(400,210)/(440,185). Tents, cart, stall mast and benches all read. Charcoal ink outlines on every rig (certA5-ref-campseq-pair.png). |
| 4 | Prop density | 2 | campPropTypes 16 (26 incl. edge), above the 12 minimum. In frame: 2 tents, 3 benches, woodpile (410,510), cart (1380,230), stall (1320,510), 2 lantern poles, portal (710,60), 2 banners (430,820)/(1170,800), forge/anvil (30-260,620-720), 3 bedrolls, tripod (560,280), sacks (1550,210), boulders (1200-1450,620-660). Gap vs Ref A: sparser spacing; (950,600)-(1250,800) holds no prop. |
| 5 | VFX layering | 2 | Hearth = white-hot core + amber disc + 130 rising embers + stone ring (certA5-ref-camp-hearth.png). Portal = violet ring + beams + halo, danger 0. Gap: the flame is a bloom ball with no flame tongues; the reference paints its fire. |
| 6 | Colour discipline | 2 | Exactly indigo / amber / violet: warm 18.9% (ref 22.5%), violet 6812 on the portal only. Danger 23 px (< 500). Heal 1641 px, of which 1209 are inside the healer ring (740,400,110,60). |
| 7 | Post stack | 2 | Vignette corners TL/TR/BL/BR 43.9/24.6/33.7/22.1 vs centre 104.7 (ref 21.8/55.0/19.3/35.9 vs 81.5). Hearth blows into bucket 15. Exposure 1.24 grade. |
| 8 | Grounding | 2 | Tank ring 128.4 vs 62.5 below it; healer ring 141.5 vs 68.1. propShadows 70. Cart ellipse 11.7 vs 20.6. |
| 9 | UI polish | 2 | Location plate (12,15)-(372,68), GLINT pill (1432,15)-(1588,57), portrait + skill bar (497,810)-(1103,882): F1-F4 class-rimmed portraits with HP bars, skill glyphs, dashed empty slots, SPC dash. v0.4.63 label (18,881). Nits: the dev "161 fps" counter (1560,881) is still in frame; the 4 px HP bars are far quieter than the reference's hex HP gem. |
| 10 | Motion juice | 2 | campseq_00 vs _03: party box (430,300,520,220) 6.65% changed, maxDelta 187 at (852,354). _00 vs _05: 12.21%, maxDelta 174 at (518,367). Hearth box 8.38%. certA5-ref-campseq-pair.png shows the swordsman and tank turning their heads and the flame changing shape. Camp has no hits to show juice on. |

## COMBAT — certA5-combat.png — 16/20

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | Box (900,600,220,180) = 5/16, hist 90-8-1, cool 88.7%. Box (850,450,500,330) = 11/16 but 37% in bucket 0. Crop certA5-ref-cbt-dark.png: ~7 tufts over a navy gradient. state decals 0 / scorch 0 at the shot. Ref floor = bricks + cracks + scorch (14/16). |
| 2 | Layered light | 2 | Five brazier pools (300,540)/(170,620)/(1075,235)/(1440,440)/(1000,40). Torch core (280,510,80,70) >200 45.0%; torch surround (1020,180,130,120) amber 4535. Heal glow around the mend bolt (1068,418): 67.1 under vs 42.5 beside. Cool 40.9%. |
| 3 | Silhouette @50% | 1 | certA5-combat-z50.png: tank, swordsman and archer overlap into one mass at (270-350,250-370) under the telegraph, and only their ears separate (crop certA5-ref-cbtz50-party.png). Healer (400,210), boar (710-790,295-330; crop certA5-ref-cbtz50-boar.png: snout + tusks + spines) and mantis (60-90,140-160, white blades) do read. The reference knight is never lost in a clump. |
| 4 | Prop density | 2 | propTypes 15 (8 required), concentrated at the edges: fences (0-70,250-330)/(150-300,750-830)/(1420-1480,250-300), crates (600-690,60-120)/(1530-1600,300-350), sacks/barrels (660-720,20-90), boulders (95,440)/(1520,490), ladder rack (1490,270), bush (1180-1250,790-860), 5 braziers. Centre (700-1300,450-800) is navigable. |
| 5 | VFX layering | 1 | The layers exist: seq comets have a white core + amber glow + trail (certA5-ref-cbtseq05-trails.png, (1000-1170,300-360)); the telegraph lane has a bright rim; numerals '30' (300,725) and '+14' (800,328). But the main-frame volley bolts (340-560,620-800) are flat amber puffs with a charcoal outline and a white capsule: no soft halo and no particles (certA5-ref-cbt-capsules.png). 7 bolts vs the reference's ~40 fireballs. Probe 8 shows one kill decal per kill (decals 2 -> 3 -> 5). The mantis decal is only a 5-luma smudge, though (49.5 -> 44.4 at (420,410,45,30)), nothing like the reference's lingering ground fire (1150-1300,640-700). |
| 6 | Colour discipline | 2 | Follows the bible's Act-1 triad (green woodland / warm party / ember danger). Danger 7515 px = the live lane (mid-ground box 0). The grass box (520,60,440,160) has foliage 14.2% but only 45 heal px, so the grass stays out of the reserved heal band. Heal 3063 px inside the healer box (740,300,140,190). Violet 2456 stays on the monolith corner (1300-1400,30-120). Nit: the boar fill #246/#247 (sat ~0.67) is saturated cobalt, not the bible's "desaturated cool-tinted" enemy. |
| 7 | Post stack | 2 | Vignette 41.0/33.8/26.4/36.8 vs centre 63.7. Torch cores 45% >200. Exposure 1.04, vignette 0.82. |
| 8 | Grounding | 1 | Party rings are crisp: tank 82.3 vs 20.5, healer 106.6 vs 19.1. The enemies are not. The boar only darkens softly (36.3 under vs 51.3 beside) and mantis TL (120,320) shows no shadow (63.5 vs 54.3). None of the 7 skillBolts has a blob: under the mend bolt (1050,438,40,14) reads 67.1 vs 42.5 beside, which is glow, not shadow. The bible requires blobs under projectiles, and the reference knight has a crisp drop shadow. |
| 9 | UI polish | 2 | Plate (12,15)-(483,68), wave banner (655,15)-(945,50) with pips, GLINT pill, portrait/skill bar, left-edge threat pointer (35,600). Nit: '81 fps' dev counter. |
| 10 | Motion juice | 2 | Consecutive combatseq frames change 11.68/11.61/9.83/10.49/11.61/9.17/7.61%, maxDelta 217-233. >200 peaks at 1.551% on the f06/f07 impacts. The wave goes from 4 LEFT to 1 LEFT across the sequence, and the telegraph resolves at f01. certA5-ref-kill-t0.png: white shard death burst (1150-1280,530-650). |

## SHOP — certA5-shop.png — 18/20

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | Road band (350,120,250,150) = 7/16 with 64% of pixels in one bucket (hist 1-64-23). Box (1280,580,300,200) = 8/16. Same untextured ground as the run arena. The torch-lit strips score better ((0,90,340,760) 12/16; upper band 15/16), and the panel covers 22% of the frame. |
| 2 | Layered light | 2 | Torch pools (310,530)/(1075,240)/(1440,425)/(75,215)/(160,620). Lantern medallion glow (808,490). Card rim glows. Violet patch (1370,60). |
| 3 | Silhouette @50% | 2 | My certA5-ref-shopz.png: the four rigs sit on separate rings at (310,180)/(385,130)/(400,210)/(475,170). The stall canopy (100,180) reads. |
| 4 | Prop density | 2 | Striped stall (130,290)-(300,420), crates/barrels (640-720,15-110)/(100-200,440-520), fences, 5 torches, boulders, cart, all toward the edges. |
| 5 | VFX layering | 1 | RARE cyan rim (660,524)-(940,691): 14/16, >200 1.255%. LEGENDARY amber rim with a shimmer sweep (30% of the card box changes at f01/f04, but maxDelta is only 29-30, so it is faint). Plaque (427,698,147,44) >200 4.592% with 3-4 px sparkle dots, plus the lantern burst. There is no particle or coin-glitter layer: state particles 0, and the panel box (340,455,920,350) changes only 0.54% over 750 ms. Ref C: "coins glitter". |
| 6 | Colour discipline | 2 | Danger 6 px. Violet 1933 on the monolith corner only. Heal 506 on the healer ring. The panel is navy + amber, with Signal Blue only on the RARE frame (per the bible). |
| 7 | Post stack | 2 | Vignette 40.1/32.9/24.8/34.0 vs centre 80.7. Bloom on torches and card rims. Panel interior (360,600,880,180) = 15/16, FLAT 0.33%. |
| 8 | Grounding | 2 | Tank ring 98.7 vs 24.9; swordsman ring 60.1 vs 13.8. Panel drop shadow 49.0 vs 20.4. propShadows 75. |
| 9 | UI polish | 2 | Corner brackets, title with a rule, lantern medallion, wallet pill (955,475)-(1240,510), rarity-framed cards (icon + name + tag), amber price plaques, amber CTA (650,750)-(950,790), 'Enter advance (one-way)' hint. Nit: '41 fps' dev counter. |
| 10 | Motion juice | 2 | certA5-ref-shopseq_00 vs _03: party box (560,180,520,280) 7.33% changed, maxDelta 188; plaque sparkle maxDelta 214 at (526,747); legendary shimmer on 30% of the card at f01/f04. The party idles. A shop screen has no hits to show juice on. |

## BOSS — certA5-boss.png — 18/20

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | Box (250,400,250,200) = 3/16, hist 73-27, the flattest ground in the set. Box (1120,700,280,170) = 6/16, FLAT 0.14%; box (60,660,300,200) = 7/16. decals 0, scorch 1. The reference has bricks and cracks. |
| 2 | Layered light | 2 | Crown (750,140,180,140): >160 36.0%, >200 12.5%, violet 2565, so the boss is the brightest emitter (per the bible). Braziers (320,130)/(985,150)/(1060,410)/(1470,680)/(150,820)/(1570,280). Monolith (1300,110,150,140) violet 5712. Quake-ring glow. |
| 3 | Silhouette @50% | 1 | At 100% the Stag reads (certA5-ref-boss-stag.png: navy ink outline, pentagon head, 4 legs). Its antlers, though, are two straight light beams plus 4 violet spikes, and the body is one flat pale-grey slab. At z50 (345-480,100-270; certA5-ref-bossz50-stag.png) it reads as a white chevron/tombstone under a glow, and the grey tank + archer (340-400,190-260) overlap its left flank. The reference boss is an iconic, multi-colour silhouette. |
| 4 | Prop density | 2 | Stone wall band (0,80)-(1600,140), pillars/obelisks (500,190)/(985,200)/(1390,600)/(55,620), crates + barrels (580-680,110-210), barrels (1350,440)/(1310,700), fences (30-130,150-200)/(1440-1600,400-450), 6 braziers, violet monolith, rocks. Centre is navigable. |
| 5 | VFX layering | 2 | Quake ring (680,300,290,250): danger 11418, 15/16. It uses the reference AoE construction: dark core + concentric red bands + bright rim + spokes + teeth (compare ref (1300-1520,530-700)). Also: amber azone ring (695,305)-(810,390), crown bloom + violet crystals, 8 numerals including a 60 px '39' (990,345), and the bossseq_06 white impact burst (certA5-ref-bossseq06-impact.png). Gap: 1 skillBolt against ~40 fireballs, so it is layered but not dense. |
| 6 | Colour discipline | 2 | Violet 14426 (ref 13339) stays on the crown, antlers, monolith and plate, which is god-stuff only. Danger 20776 = the live quake (11418 inside the ring box). Heal 2552 = the healer ring + clover bolt (770,478). Amber is braziers. |
| 7 | Post stack | 2 | Vignette 35.3/26.2/34.3/21.5 vs centre 118.0. Crown in bucket 15. The room runs a stop darker (box (250,400) hist 73-27). |
| 8 | Grounding | 2 | Stag hind-leg pool (810,545,80,20) = 26.5 vs ring fill 79.3-113.4 (Probe 5). On 3 of 4 seq frames the area under the body is 25-60 luma darker than the ring fill. Party rings; propShadows 75. Gap: the single bolt sits over the Stag body, so it cannot be measured. |
| 9 | UI polish | 2 | Ornate plate (530,12)-(1070,72): stag medallion in a double ring, caps name, violet bar, phase diamonds at 25/50/75%, chevron end caps, live '1089/1800'. 'x3' threat chip (505,760)-(540,805). Defect to fix: the fired 75% diamond (927,45) collides with the '1' of '1089' (certA5-ref-boss-plate.png). Also the '55 fps' dev counter. |
| 10 | Motion juice | 2 | Static-corner box (0,100,300,250) changes 1.54/29.21/22.24/4.73/12.25/49.75/15.22% = screenshake. The Stag flashes white at f00 vs slate at f01/f03 (hit flash); f02 is a rotated lunge pose; f06 a white burst; f07 a red chevron lane. HP falls 1129 -> 603 over 8 frames, with numerals 8-45 on every frame. |

## Reference comparison (pass-the-fear.png side by side)

- **Density.** Prop counts meet or beat the reference: camp has 16 camp prop types, and the run arenas have 15 each with edge rings. Light pools meet or beat it too: 5-6 torch pools per run frame vs the reference's 2 torch towers. The frames fall short on painted **surface** density. The reference has zero flat regions (bricks, mortar, cracks, moss, scorch; floor box 14/16 buckets). Every Echoes frame has a smooth gradient ground with instanced tufts, so the best ground boxes reach 8-11/16 and the dark bands 3-7/16. This is the one gap shared by all four frames (check 1 = 1 everywhere). VFX density is the second gap: the reference runs ~40 simultaneous fireballs, each with a core, glow, flame trail and particles. Combat has 7 flat sticker-puff bolts, and boss has 1 bolt + 1 quake.
- **Cohesion.** Palette discipline is at or above the reference. The camp is indigo/amber/violet (warm 18.9 vs 22.5). Boss violet is 14426 vs 13339 and confined to god-stuff. The heal band stays out of the grass, and danger is 6-23 px on the no-threat frames. Outline consistency is good on the rigs (charcoal inverted hull) and on the mantis. The Stag's ink line is thin, and the boar is saturated cobalt. There is one lighting story per frame: cool base plus warm pools, and the boss is the brightest emitter.
- **Polish.** The HUD framing is at the reference's level on shop and boss: bracketed panel, rarity frames, ornate medallion plate. It is slightly below on camp and combat, where 4 px HP bars stand in for the reference's hex HP gem. A dev fps counter shows in every frame. The boss plate numeral collides with its phase diamond. Glows and bloom are at the reference's level. Grounding matches for party and Stag, but enemies and projectiles are weakly grounded in combat.

## What goes back to the builder (pixel-anchored)
1. Ground structure, all frames: (950,600)-(1250,800) camp, (900,600)-(1120,780) combat, (350,120)-(600,270) shop and (250,400)-(500,600) boss are untextured gradients with 3-8/16 buckets. They need painted surface structure (stone/dirt tiles, cracks, leaf litter, moss decals) at the reference's density.
2. Combat projectiles (340-560,620-800): the flat amber puffs need a soft additive halo plus a particle trail, as the seq comets already have, and a ground blob under each bolt (currently 67.1 under vs 42.5 beside = no shadow).
3. The mantis kill decal is a 5-luma smudge (420,410,45,30). It needs a readable persistent splat/scorch.
4. Enemy contact shadows: boar 15 luma, mantis none. Bring them up to the party's 60+ luma rimmed blobs.
5. Stag silhouette: model the antler tines. At z50 the beams read as a V of light, not antlers.
6. Boss plate: move the fired 75% phase diamond (927,45) off the HP numeral, and hide the dev fps counter in certification frames.

## Probe log (appended as taken; instance 1 + instance 2)

### Reference read (docs/reference/pass-the-fear.png, 1920x1080, viewed with Read)
Painted stone bridge; ~40 simultaneous fireballs each = white-hot core + orange glow + flame trail
(e.g. cluster (800-1000,220-420), stream (1300-1900,300-700)); one AoE telegraph at (1300-1520,530-700)
= dark scorched core + bright red rim; lingering ground fire at (1150-1300,640-700) and (330-520,650-700);
brick floor with mortar lines, chips, moss/dirt (800-1900,150-1080); violet void left of x=660 with
swirl strokes; torch tower with green lantern (1380-1440,300-450); banner (440-600,700-820); spikes
(1050-1200,940-1000); ornate boss bar + medallion + name "Ella" (420-1500,90-140); location plate
"Gate Bridge" (10-160,30-60); currency X10/X13 top-right (1800-1900,20-110); hex HP gem "100"
bottom-left (60-200,840-1000) with "19" shield; weapon cards 2/10 and 0/3 bottom-right (1580-1850,850-1080).
Analyzer: >160 3.418 / >200 1.427 / 16/16 / FLAT 16.68 / warm 22.5 cool 76.4 / danger 89724 heal 446
violet 13339 amber 56031.

### Probe 1 — analyzer verification (my own run, matches technician byte-for-byte)
camp >160 2.243 / >200 0.841 / 16/16 / FLAT 1.81 / warm 18.9 cool 79.8 / danger 23 heal 1641 violet 6812 amber 32445; hist 18|37|17|8|5|4|3|3|2|1|1|0|0|0|0|0
combat >160 4.952 / >200 0.832 / 16/16 / FLAT 1.85 / warm 45.1 foliage 14.0 cool 40.9 / danger 7515 heal 4892 violet 2456 amber 187031
shop >160 3.473 / >200 0.691 / 16/16 / FLAT 1.97 / warm 43.9 foliage 6.9 cool 49.2 / danger 6 heal 506 violet 1933 amber 131555
boss >160 3.002 / >200 1.192 / 16/16 / FLAT 1.70 / warm 37.2 foliage 8.3 cool 54.5 / danger 20776 heal 2552 violet 14426 amber 91191; hist 29|31|18|7|4|2|2|2|2|1|1|1|1|0|1|0
REF floor box (800,600,500,360): 14/16 buckets, FLAT 18.57, danger 3858 violet 1944 amber 1190, hist 3|16|25|16|20|17|1

### Probe 2 — box probes (analyzer --box)
CAMP: (1000,620,220,170) 5/16 buckets hist 7|41|47|6, cool 99.9, amber 0, FLAT 0.00 | (400,560,200,220) 4/16, hist 1|65|29|5, cool 100.0 | (950,600,300,200) 6/16, >160 0.017 | (200,480,200,160) 6/16 amber 27 | (900,150,200,160) 11/16 amber 224 FLAT 4.00 | hearth core (640,300,120,110) >160 75.576 >200 47.106 13/16 warm 99.9 amber 2189 | portal (600,10,220,110) violet 3507 danger 0 amber 0 FLAT 0.00 | healer ring (740,400,110,60) heal 1209 of frame 1641 | forge corner (0,420,260,240) 11/16 amber 341 | cart/stall corner (1200,420,260,200) 10/16 FLAT 19.13 (the stall roof plane)
COMBAT: (900,600,220,180) 5/16 hist 90|8|1 cool 88.7 heal 0 danger 0 | (720,560,250,220) right-of-party 5/16 hist 53|30|14|1|2 danger 0 heal 1 | (1150,180,260,200) 9/16 amber 1623 | torch core (280,510,80,70) >200 45.018 13/16 warm 100 | torch surround (1020,180,130,120) danger 0 amber 4535 15/16 | boar box (1380,560,200,140) 10/16 amber 8439 FLAT 2.12 | healer numeral (750,300,120,110) heal 583 >200 9.727 15/16 | action box (400,560,320,320) danger 6673 14/16 >200 1.486 | (1150,600,300,200) 8/16 amber 22357 FLAT 0.32
SHOP: world strip (0,90,340,760) 12/16 FLAT 3.66 amber 29298 | upper band (340,90,920,340) 15/16 FLAT 0.75 | right-of-panel (1270,470,320,330) 10/16 FLAT 2.99 warm 88.1 | RARE card (655,518,290,180) 14/16 >200 1.255 FLAT 0.00 | panel interior (360,600,880,180) 15/16 FLAT 0.33 | plaque (427,698,147,44) >200 4.592 15/16 | LEGENDARY card (960,524,280,167) 14/16 >200 1.063 | (1300,90,300,360) violet 767 amber 6049
BOSS: (1120,700,280,170) 6/16 hist 36|33|19|7|5 FLAT 0.14 amber 4135 | (60,660,300,200) 7/16 amber 25057 | (1000,560,300,180) 6/16 | crown (750,140,180,140) >160 36.028 >200 12.488 15/16 cool 100.0 violet 2565 amber 0 | quake ring (680,300,290,250) danger 11418 15/16 FLAT 10.66 | monolith (1300,110,150,140) violet 5712 12/16 | stag body (760,270,160,270) 16/16 FLAT 16.82 | (250,400,250,200) 3/16 hist 73|27 = darkest ground box in the set
VIGNETTE (meanLuma TL/TR/BL/BR/centre): REF 21.8/55.0/19.3/35.9/81.5 | camp 43.9/24.6/33.7/22.1/104.7 | combat 41.0/33.8/26.4/36.8/63.7 | shop 40.1/32.9/24.8/34.0/80.7 | boss 35.3/26.2/34.3/21.5/118.0
Crops written: captures/certA5-ref-{camp-party,camp-ground,camp-groundR,cbt-action,cbt-dark,cbt-boar,cbt-healer,shop-panel,shop-stall,boss-stag,boss-ground,boss-plate,REF-floor,REF-hud,REF-shots}.png

### Probe 3 — sequence diffs (tools/certA5-ref-diff.mjs, |dLuma|>12)
CAMP campseq_00 vs _03 (750 ms): party box (430,300,520,220) 6.65% changed meanDelta 7.23 maxDelta 187 at (852,354); hearth box (600,280,220,180) 8.38% meanDelta 9.03 maxDelta 156 at (819,417); whole frame 3.42%; _00 vs _05 party box 12.21% maxDelta 174 at (518,367). Seq LUMA >160 2.28-2.92%, >200 0.825-1.025%, danger 29-59 px, violet 6456-6732.
COMBAT combatseq consecutive whole-frame: 11.68 / 11.61 / 9.83 / 10.49 / 11.61 / 9.17 / 7.61 % changed, maxDelta 217-233 every step (peak at (915,424)/(917,422)/(923,423) = healer numeral region). Seq >160 4.508-5.154%, >200 0.883-1.551% (peak f06/f07 = impact flashes); danger 9104 / 47 / 1177 / 15 / 11842 / 10470 / 12409 / 7243 (telegraph resolves at f01, new telegraphs at f04-f07).
BOSS bossseq static-corner box (0,100,300,250): 1.54 / 29.21 / 22.24 / 4.73 / 12.25 / 49.75 / 15.22 % changed, meanDelta up to 17.17 = background translating (camera shake). Whole frame 9.93 / 36.65 / 25.38 / 9.99 / 20.57 / 54.59 / 40.01 %. Seq >200 1.022-1.932% (f06 1.932 = resolve flash), violet 11384-21630 (peak f04), danger 22117/26619/19016/14447/8986/14673/24140/27041.

### Probe 4 — contact shadows (meanLuma)
COMBAT tank ring bottom (545,725,110,20) 82.3 vs ground below (545,770,110,20) 20.5; healer ring (760,470,80,14) 106.6 vs (760,500,80,14) 19.1 = hard rimmed rings. Boar: under (1420,645,120,30) 36.3 vs beside (1290,645,100,30) 51.3 = soft 15-luma darkening, no rimmed ring.
CAMP tank ring (460,440,90,14) 128.4 vs (460,470,90,14) 62.5; healer ring (770,470,70,12) 141.5 vs (770,495,70,12) 68.1; stall base (1300,570,120,20) 46.2 vs (1300,610,120,20) 12.7; cart (1250,300,80,14) 11.7 vs (1250,330,80,14) 20.6 (a dark ellipse under the cart).
SHOP tank ring (600,395,80,14) 98.7 vs (600,425,80,14) 24.9; swordsman ring (740,325,70,12) 60.1 vs (740,355,70,12) 13.8; panel bottom edge (340,800,920,10) 49.0 vs (340,812,920,10) 20.4 = panel drop shadow.
BOSS Stag boxes inside the quake ring are confounded (main: 43.8 under vs 50.0 beside vs 44.2 below; seq f04-f07 swing 51-134 with the ring/impact flashes) — tighter probe below.

### Probe 5 — Stag contact shadow, tight boxes (meanLuma)
Main frame: under-body (810,505,80,25) 83.3 vs ring fill left (700,480,60,25) 79.3 vs ring fill right (920,470,50,25) 113.4; hind-leg base (810,545,80,20) 26.5 and (830,535,60,15) 28.2 = a dark pool under the hind legs, 50+ luma below the ring fill. bossseq_00: 113.0 / 89.3 / 116.9 / 29.0; _01: 38.8 / 76.0 / 124.5 / 31.9; _02: 63.8 / 122.7 / 101.9 / 58.4; _03: 88.4 / 125.0 / 98.1 / 56.7. Under-body is 25-60 luma darker than the ring fill on 3 of 4 seq frames — grounded.
Combat mantis TL: (120,320,60,14) 63.5 vs (120,345,60,14) 54.3 (no shadow read, 9 luma); left-edge (30,595,50,12) 87.9 vs (30,620,50,12) 43.3 (pointer chip, not a shadow).

### Probe 6 — MY shop captures (technician shipped no zoom / seq for shop)
tools/certA5-ref-gen.mjs -> tools/actions/certA5-ref-shop.json; ?seed=4242, startRun -> skipToRoom(7), wait 1800, 8 ms poll for runUi().screen==='shop'.
certA5-ref-shopz.png (--zoom 0.5): exit 0, ok:true t379, screen shop, wallet 72, cards Bounce/Detonate/Ascend at (580,623,140,83)/(730,623)/(880,623) opacity 1, plaques 25/30/35 none shaking, arena {particles 0, decals 0, scorch 0, numerals 0, emitters 18, embers 153, propTypes 15, propShadows 75, grass 640, flowers 70, fireflies 150, vignette 0.82, exposure 1.04}, hud.combat() combat:false bannerMode none threatNodes 0, party healer (0,0) tank (-1.9,-1) swordsman (1.8,-1.3) archer (-0.35,-2.2). 0 PAGEERROR.
certA5-ref-shopseq_00..05.png (6 x 250 ms): exit 0, ok:true t288, identical state (cards at 360,524,280x167 / 660,524 / 960,524), post-seq tick 718. 0 PAGEERROR.

### Resume (instance 2) — continuing after Probe 6; re-read REFERENCE_BAR.md, re-viewed pass-the-fear.png and certA5-camp.png. Remaining: view z50/seq frames, score, write tables.

### Probe 7 — contact sheets + large ground boxes (instance 2)
Contact sheets (tools/certA5-ref-sheet.mjs): captures/certA5-ref-sheet-{campA,campB,cbtA,cbtB,bossA,bossB,shopA}.png — all 22 technician seq frames + my shopseq viewed.
campseq pair crop captures/certA5-ref-campseq-pair.png (420,280,520,220) f00 vs f05: swordsman head turns (ears move ~12 px), tank head turns, hearth flame shape changes, embers rise — living idle, no event juice possible in camp.
combatseq: wave banner 4->3->3->2->2->1->1 LEFT then WAVE 2/2 3 LEFT at f07 (kills inside the seq); red spoked telegraph wheel (700-860,480-600) at f05-f07; archer capsules = white core + amber rim + orange trail ribbon (crop captures/certA5-ref-cbtseq05-action.png); amber ring zone (1120-1265,550-675) persists f03-f07 (crop certA5-ref-cbtseq05-disc.png) = party azone, NOT a death decal — kills leave no splat.
bossseq: Stag body pale-white on f00 (hit flash) vs dark slate f01/f03 (normal), f02 rotated lunge pose, f06 white burst (700-800,760-820 in full frame), f07 red chevron lane (1180-1230,650-900 sheet coords -> full (760-860,400-900)) = new telegraph; numerals 8-45 on every frame; plate HP 1129 -> 1050 -> 1010 -> 924 -> 869 -> 834 -> 752 -> 603 over 1.2 s.
Large ground boxes (analyze --box 850,450,500,330): camp 8/16 buckets hist 19|39|29|6|3|0|0|4 >160 0.008 amber 3 | combat 11/16 hist 37|23|19|9|4|2|1|1|1|2|2 amber 18637 | boss 10/16 hist 16|35|21|9|5|3|4|5|2 (danger 9020 = quake ring edge) | shop right strip (1260,440,340,360) 12/16 amber 11290 | REF floor (800,600,500,360) 14/16 hist 3|16|25|16|20|17|1, FLAT 18.57 (bricks+mortar+cracks).
Crops viewed: certA5-ref-camp-ground.png = smooth navy gradient + dark road band, ~8 tufts, 8 motes, zero decals/texture; certA5-ref-cbt-dark.png = same, ~7 tufts.
### Probe 8 — started: kill-decal persistence capture certA5-ref-kill (?seed=4242, startRun, wait 2 deaths, state+shot at +0/+1500/+4500 ms)
Probe 8 result (captures/certA5-ref-kill.console.txt, exit 0, 0 PAGEERROR): deaths t343 mantis (-3.57,5.12), t444 boar (4.16,1.97), t511 mantis (-3.96,-0.27), t613 mantis, t760 boar. vfx.decals 2 @t444 -> 3 @t570 (scorch 1) -> 5 @t781 = one decal per kill, persisting >=3.4 s. Pixels: certA5-ref-kill-t0.png shows the boar death as a white shard burst (1150-1280,530-650); certA5-ref-kill-t1500.png leaves an amber ring disc (1120-1265,550-675) with dark speckles (box 1120,550,150,125 amber 14261, danger 51). Mantis death at (-3.96,-0.27) leaves only a faint grey smudge ~(420-465,410-440): meanLuma 49.5 -> 44.4 (a 5-luma darkening) — invisible at play distance (crop captures/certA5-ref-kill-mantis-pair.png). Boar pair crop captures/certA5-ref-kill-boar-pair.png. Conclusion: kill decals EXIST (so no 0), but the mantis splat is far below the reference's persistent red splat / lingering fire patches.
