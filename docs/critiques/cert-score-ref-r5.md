STATUS: PARTIAL
VERDICT: pending

# Cert score — REFERENCE MATCHER lens — round 5 (r5)

Critic: reference-matcher (fresh context). Build under test: v0.4.63. Frames: certA5-{camp,combat,shop,boss}.

## Probe log (appended as taken)

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
