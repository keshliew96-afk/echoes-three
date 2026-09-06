STATUS: PARTIAL
(verdict pending)

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
