STATUS: COMPLETE
VERDICT: REJECT — camp 20/20 PASS, combat 15/20 FAIL, shop 19/20 PASS, boss 19/20 PASS; no zeros. Combat is the only failing frame (checks 2,3,5,6,8 at 1).

# Cert Score - REFERENCE MATCHER lens - Round 2 (certA2 frame set)

Critic: independent reference-matcher. Build under test v0.4.43. Started scoring.

Frames judged: technician set `certA2-*` (v0.4.43). All 10 harness runs exit 0; `grep -l "PAGEERROR\|\[error\]" captures/certA2-*.console.txt` returns nothing — verified by me.
Analyzer numbers re-run by me with `node tools/analyze.mjs --ref` on all four main PNGs; they match the technician's to the last digit.
Own evidence, prefix `certA2-ref-`: `tools/certA2-ref-crop.mjs` (sharp crop + nearest upscale) -> `captures/certA2-ref-*.png`.

## Reference, measured (docs/reference/pass-the-fear.png, viewed)
LUMA >160 3.418% / >200 1.427% / 16 buckets, hist 27|21|13|13|9|7|2|2|1|1|1|1|1|1|0|0 (48% of pixels in the
two darkest buckets AND 1.4% blown out). FLAT 16.68%. HUEMIX warm 22.5 / foliage 1.1 / cool 76.4. SAT 0.582.
danger 89724 px. What it does: painted brick floor with cracks/moss/scorch; dozens of fireballs each = white-hot
core + orange glow + flame trail; AoE = dark scorched core + bright red rim; violet void left vs fire right;
ornate boss bar with icon medallion + name tag; hex HP gem, currency medallions, illustrated weapon cards with
ammo counts; torch towers, banners, chains, spike barricades dressing the bridge.

---

## CAMP — captures/certA2-camp.png — 20/20
Analyzer (mine): >160 2.038 | >200 0.652 | 16/16 | hist 19|37|17|7|5|4|3|3|2|1|1|1|0|0|0|0 | FLAT 1.85% |
warm 23.5 / foliage 2.1 / cool 74.4 | SAT 0.603 | danger 125 / heal 1936 / violet 7744 / amber 60672.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole-frame FLAT 1.85% vs reference 16.68%. Worst box I could find, the shadowed gap between stall and road, 1180,460,300,200 = FLAT 16.11% — still under the 20% gate and under the reference. Open ground right of the party 950,540,450,260 = FLAT 0.33%, foliage 2.3% (tufts), 8/16 buckets. Bottom-right corner 1380,600,220,260 is the weakest region: hist 56|42|2, zero px >160, only 2 rocks + 1 banner + tufts — dark but vignette-graded and noise-dithered, not a flat plate (FLAT 0.00%). Road hue variation runs diagonally through (0,470)-(1600,300). |
| 2 | Layered light | 2 | Same funnel as the reference (camp warm 23.5/cool 74.4 vs ref 22.5/76.4 — the closest HUEMIX match in the set). Cool indigo ambient + 6 warm pools: hearth box 580,280,240,200 = >160 28.05% / >200 10.68% / warm 92.8%; two pole lanterns at (543,62) and (900,62) each with a halo and a ground pool; forge lamp (152,682); stall torch (1395,350) with its own pool (crop certA2-ref-camp-right); 2 tent glows. Violet portal box 570,0,280,140 = violet 7011 px, ring + 2 beams + motes. Every emitter carries a halo sprite. |
| 3 | Silhouette read | 2 | `certA2-ref-camp-z50q` (z50 canvas 220,60,260,180 @4x): archer = bunny ears + green tunic + bow; tank = round bear, folded arms, small ears; healer = bunny ears + green robe + mint staff orb; swordsman = pointed cat ears + maroon tunic. All four separated by coloured ring discs (yellow-green/navy/mint/pink) and none overlap (campState prompt.overlaps []). Outlines are a thin dark rim, thinner than the reference knight's, but the reference knight is also a tiny chibi read mainly by its halo + drop shadow. |
| 4 | Prop density | 2 | 16 distinct types (campState: hearth, tripod, bench, woodpile, tent, bedroll, forge, anvil, rack, stall, sack, cart, lanternpole, banner, portal, runestone) over 26 instances vs the >=12 bar. Confirmed in pixels: stall is no longer a blank sheet — crop `certA2-ref-camp-right` shows a green-striped canopy, counter, yellow wares, legs and its own torch; cart at (1370,240) has wheel/handles/cargo; crates+barrels (1500,180)-(1590,260). Below the reference only in that there is no cabin and the weapon rack does not glow (Reference A has glowing item displays). |
| 5 | VFX layering | 2 | No attacks in camp, so judged on ambient FX: hearth = white-hot core + amber glow + flying spark quads + stone ring (box 580,280 hist runs 0|0|2|4|4|5|8|13|19|16|5|9|6|4|2|2 — a full core-to-glow ramp, 3+ layers); portal = ring + 2 beams + 34 gate motes; 150 fireflies and 130 embers drifting across the road. |
| 6 | Color discipline | 2 | Exactly Reference A's three families: indigo night (cool 74.4%), amber fire (amber 60672), violet arcane (violet 7744, all of it inside the portal box). danger 125 px, far under the 500 gate. Only bleed: heal band 1936 px, of which 1522 px sits inside the hearth box 580,280,240,200 — the fire core's yellow-green fringe reading as reserved heal green (reference 446 px). Cosmetic, 0.13% of the frame. |
| 7 | Post stack | 2 | Bloom on hearth/lanterns/portal (>200 0.652%); vignette 0.26 measurable — corner box 1380,600,220,260 crushes to hist 56|42|2 (4/16 buckets) against a frame that uses 16; teal-indigo grade (SAT 0.603 vs ref 0.582). Below the reference on top end only: >200 0.652% vs 1.427%, buckets 12-15 all round to 0. |
| 8 | Grounding | 2 | Ring discs under all four critters (visible at (500,410),(800,455),(880,395),(520,240)); propShadows 70; cart and stall canopy both cast soft contact shadows in `certA2-ref-camp-right`; benches at (830,560) and (420,265) have shadow ellipses. |
| 9 | UI polish | 2 | `certA2-ref-camp-hud` (495,805,610,85 @3x): ribbed dark panel with corner brackets and diamond separators; F1-F4 chips carry ILLUSTRATED critter busts with class-coloured rims (green/tan/pink/lime) and an HP bar under each; skill slots 1 and 2 now carry white glyph icons (round-1 text abbreviations are gone), 3/4 are dashed empty sockets, SPC chip with chevron. Location plate (14,14)-(370,68) with lantern glyph + letterspaced subtitle; GLINT coin medallion top-right (1430,18); 'v0.4.43' (18,881); '46 fps' (1560,881). Below the reference in ornament only (no hex HP gem, no illustrated weapon cards with ammo, no cooldown radial visible — nothing is on cooldown here). |
| 10 | Motion juice | 2 | campseq_00..05: 5.10/5.63/6.20/4.87/6.55% of pixels change frame-to-frame. Comparing _00, _01, _03, _05 by eye: firefly field completely redistributed (e.g. the cluster over the road at (300,460)-(700,540)), hearth flame silhouette differs every frame, archer's arms drop between _00 and _03, swordsman's head tilts. No combat poses to judge; the critters are seated-idle exactly as Reference A's campfire characters are. |

CAMP TOTAL 20/20 — PASS.

## COMBAT — captures/certA2-combat.png — 15/20
Analyzer (mine): >160 3.153 | >200 0.632 | 15/16 (bucket 15 empty) | hist 7|23|23|13|9|7|6|4|3|3|2|1|0|0|0|0 |
FLAT 1.59% | warm 40.0 / foliage 52.0 / cool 8.0 | SAT 0.468 | danger 124 / heal 6316 / violet 2495 / amber 197354.
State at capture: 4 enemies, 6 skillBolts, 1 azone, telegraph live (t700 -> t742, 21 ticks from resolve).

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole-frame FLAT 1.59% vs reference 16.68%. Open grass north of the road, box 400,120,500,220 = FLAT 0.00%, 13/16 buckets, hue-mottled (foliage 77.8%, 640 tufts + 70 flowers). Road box carries pebbles + hue variation. Darkest region 1100,700,500,200 = FLAT 0.00% but only 6/16 buckets — dark, not flat. Nothing in this frame is a single-colour plate. |
| 2 | Layered light | 1 | The emitter half is reference-grade: five torches at (1075,230),(1425,420),(310,530),(160,630),(1005,35) each with a flame sprite, a bloom halo and a ground pool (box 1250,520,300,180 = warm 70.5%, amber 24921); violet monolith halo (1350,80); every projectile bloomed. The AMBIENT half is not: whole-frame cool 8.0% vs the reference's 76.4%, and the darkest region 1100,700,500,200 measures warm 47.1 / cool 13.6 — the shadows are brown-olive, not cool. Bucket 0 is 7% vs the reference's 27%; the two darkest buckets hold 30% vs 48%. The reference's cool-void-vs-fire funnel (void box 0,150,620,650 = cool 95.2%) has no counterpart here. |
| 3 | Silhouette read | 1 | `certA2-ref-combat-z50q` (z50 canvas 180,240,320,220 @4x): tank + archer + swordsman occupy one 200x180 px screen mass at full-res (600,530)-(800,710) with three ring discs overlapping; the archer's body is entirely occluded by the tank and only its ears clear the outline. At true 50% that clump is one beige blob. The models themselves are good — `certA2-ref-combat-enemy` (5x) shows the boar with tusk, snout, bristles and a thick dark outline, and `certA2-ref-combatseq2-mantis` (6x) a mantis with two white scythes and glowing eye gems, both far past round 1's "blue stick". seq_02 proves the read when the party is spread (4 distinct critters at (795,410)/(790,520)/(860,590)/(990,530)). The judged frame is the fused one. |
| 4 | Prop density | 2 | vfx.arena propTypes 15 (>= the 8 bar) and now on ALL FOUR edges, not just the top wall: fences (0,250),(0,460),(1430,250),(1500,60); crates/boxes (1520,300),(640,80); platform (0,650); stone slab (650,95); rocks (110,455),(1550,490),(1290,830); torch bases x5; violet monolith (1350,80); bushes/flowers. The road and the centre 500x400 px stay navigable. |
| 5 | VFX layering | 1 | Bolts do 3 layers but no trail: `certA2-ref-combat-bolts` (930,370,340,110 @4x) shows the archer bolt at (985,417) as white-hot core + ~30 px bloom halo, and the mending bolt at (1212,417) as mint capsule + dark outline + white halo + contact ellipse — the reference's fireballs add a flame TRAIL to each, which nothing here has. The enemy telegraph is the failure: `tools/certA2-ref-locate.mjs` finds only 89 danger-band px in the whole frame, bbox 595,531-672,862, 58 of them in cell (600,450) — three ~6 px ember dots at (623,533),(596,553),(612,573) (`certA2-ref-combat-tele`, 8x) — while state reports a telegraph 21 ticks from resolving. Reference AoE box 1280,520,320,220 = 14134 danger px, scorched core + bright rim; this is a 160x gap on the same event. Sequence is better (combatseq_04 red radial burst at (770,545) = disc fill + spoke strokes + 4 ember dots + outer glow, danger 6730 px in box 690,480,200,150) but it is gone by combatseq_06 and vfx.arena decals 0 / scorch 0 — kills leave no persistent decal. Numerals do pop ('30' at (285,725), '+14/+HP' at (795,335), '10' on the tank in _04, '12'/'26' in _02). |
| 6 | Color discipline | 1 | Five families compete: foliage green 52.0% (world), amber 40.0% (torches/road/azone ring at (1190,610)), violet (monolith + the spawn rings at (1130,80),(1350,60) in combatseq_05), enemy blue (boar (1370,590), mantis (185,325)), red-orange (embers). The reference runs two — cool violet void + fire warm — plus stone grey. Reserved bands are mostly honoured now (danger 124 px = embers only; violet 2495 px = monolith), and the round-1 disaster of grass in the heal band is 40x better (heal 6316 px vs 260952), but grass still leaks: box 900,120,500,300 is pure grass + torch and still reads heal 1032 px, and the '+14' heal numeral is green-on-green. |
| 7 | Post stack | 2 | All three visible: bloom on the five torch flames, both bolts and the healer's staff (>200 0.632%); vignette measurable — corner box 1100,700,500,200 crushes to 6/16 buckets (hist 18|34|43|5|1) against a frame using 15; warm night grade (SAT 0.468). Top end still under the reference (>200 0.632 vs 1.427). |
| 8 | Grounding | 1 | Party: lit footprint discs under all four. Projectiles: contact ellipses under every bolt (visible under the mending pill at (1212,432) and under all three pills at z50 (85,455)/(215,510)/(330,580) of `certA2-ref-combat-z50q`) — this beats the reference, whose fireballs are unshadowed. Props: propShadows 73, hard shadows under each torch base. ENEMIES HAVE NONE: under the boar at 1330,645,90,22 mean luma 48.6 vs 59.9 at 1200,645 and 41.1 at 1490,645 — no dip, the gradient is just vignette; `certA2-ref-combat-enemy` shows the body floating on unbroken olive. The reference's tiny knight gets a hard drop-shadow ellipse. |
| 9 | UI polish | 2 | Location plate 'UNEASY WOODLAND / ROOM 1 OF 8 · CLEAR THE CLEARING' (14,14)-(480,68); wave banner pill (655,14)-(945,49) with dot pips '●○' and live count; GLINT medallion (1430,18); command bar as in camp with illustrated portraits, class-rimmed chips, HP bars, glyph skill icons; off-screen threat pointer chip at z50 (14,300); 'v0.4.43'/'43 fps'. Below the reference in two named ways: cooldown is a numeric readout plus a linear top-down grey wipe ('0.9'/'0.1' in `certA2-ref-combatseq2-hud`), not the radial the bar asks for, and there is no boon/build stack or ammo-carrying skill card like the reference's bottom-right weapon panels. |
| 10 | Motion juice | 2 | combatseq deltas 12.09/9.95/9.53/12.06/7.48/9.23/32.28% (>40 delta 4.92-7.38%). Hit flash: tank's head blown white with '10' over it at (555,520) in _04 and the swordsman at (650,455); spawn impact blowout at (1030,190) in _07 with an arc ring and '30'. Attack poses, not statues: swordsman arm raised at (990,530) in _02, healer mid-cast with a white staff flare at (790,405) in _07. Kill burst _04 -> lingering _05 -> cleared _06. Banner tracks 3->2->1 LEFT and WAVE 1/2 -> 2/2; camera pans (road crossing moves 60 px between _00 and _07). |

COMBAT TOTAL 15/20 — FAIL (< 16). No zero.

## SHOP — captures/certA2-shop.png — 19/20
Analyzer (mine): >160 2.681 | >200 0.649 | 16/16 | hist 3|23|29|13|9|7|5|3|3|2|1|1|0|0|0|0 | FLAT 1.70% |
warm 59.8 / foliage 34.5 / cool 5.7 | SAT 0.389 | danger 26 / heal 689 / violet 2209 / amber 249894.
No zoom or sequence was supplied for this frame, so I captured my own (exit 0, zero page errors):
`tools/certA2-ref-gen.mjs` -> `tools/actions/certA2-ref-shop.json` + `certA2-ref-shopseq.json`;
`captures/certA2-ref-shop-idle/-hover/-buy1a/-buy1b/-buy2/-deny1/-deny2.png` (real mouse clicks: wallet
72 -> 47 -> 17, then a denied 35-GLINT Ascend), `certA2-ref-shopseq_00..05` (6 frames @150 ms), and a
self-made 50% downscale `certA2-ref-shop-z50q` for check 3. Diffs via `tools/certA2-ref-diff.mjs`.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | The round-1 charcoal modal over a blurred veil is gone: whole frame FLAT 1.70% (was 52.85%), 16/16 buckets. The shelf panel itself, box 345,455,910,345, measures FLAT 0.00% / 16 buckets — it is translucent over a LIVE arena with a fine diagonal hatch (`certA2-ref-shop-legcard`), not a plate. Arena above the panel, box 400,100,800,340 = FLAT 0.74%, 14/16, foliage 63.9%. Ground bottom-left 0,600,340,300 = FLAT 1.80%. Only soft spot: card interiors (box 375,560,250,120) put 78% of their pixels in one luma bucket at SAT 0.173 — dark and low-contrast, though hatched. |
| 2 | Layered light | 1 | Emitters are all haloed — five torch flames with ground pools at (1075,230),(1425,420),(310,530),(160,630),(1005,35), the stall lantern at (185,405), the violet monolith (1350,80), the healer's mint staff orb (818,395), plus the panel's own amber rim glow. But there is no cool pole: cool 5.7% against the reference's 76.4%, warm 59.8%, and the darkest bucket holds only 3% of pixels (reference 27%) — the shallowest value floor of the four frames. The reference's cool-void-vs-fire funnel has no counterpart; here it is amber panel vs green field. |
| 3 | Silhouette read | 2 | All four critters sit ABOVE the panel and read cleanly: I downscaled the frame to 800x450 and re-upscaled the party band (`certA2-ref-shop-z50q`) — tank with shield + navy ring (640,355), archer with bow + lime ring (770,270), swordsman with sword + pink ring (955,340), healer with mint staff + mint ring (800,405), no overlap, each with a dark rim. This is the best character read of the set and beats the combat frame outright. |
| 4 | Prop density | 2 | vfx.arena propTypes 15 plus an in-world PEDDLER'S STALL at (130,320)-(300,435) — green-and-white striped canopy, counter, crates and its own lantern (round 1: "no in-world peddler, shelf or wares"). Fences (0,250),(1430,250),(1500,60), barrels (215,255), crates (1520,300),(640,80), five torch bases, rocks, monolith, platform (0,650). Centre navigable. |
| 5 | VFX layering | 2 | Judged on the shop's own effects. Cards: rarity-tinted glowing borders (grey/blue/amber), icon badges in rimmed squares, and a diagonal SHEEN sweep across the legendary card at (1180,600)-(1240,690) (`certA2-ref-shop-legcard` @3x). Plaques: amber lozenges with border glow and a glint sparkle on the 'L' of GLINT. Real coin glitter on purchase: `certA2-ref-shop-buy1a` shows gold coin particles arcing from the shelf to the counter at (940,318),(950,345),(960,375),(965,392) while the wallet is mid-tween (top-right reads 47 while the panel chip still reads 51). Buy = dim to opacity 0.62 + a rotated bordered SOLD stamp + 'you own 1 · on the bench'. Denial = white border flash on Ascend. Arena behind stays live (embers 144, torch flames), not a blurred veil. |
| 6 | Color discipline | 2 | Three families + reserved accents: amber panel/chrome (amber 249894), foliage world (34.5%), violet monolith (violet 2209 px, all of it at (1300,40)-(1400,120)). danger 26 px and heal 689 px — the tightest reserved-band discipline of the four frames. Rarity rims (grey/blue/amber) are the only added accent and they are semantically earned. |
| 7 | Post stack | 2 | Bloom on the torch flames, the CTA and the plaques (>200 0.649%); vignette measurable — corner box 1400,760,200,140 crushes to hist 0|51|48 / 9 buckets against box 700,150,200,140 at 11 buckets with content up to bucket 9; warm grade throughout. The translucent panel does not defeat the post stack the way round 1's opaque modal did. |
| 8 | Grounding | 2 | Ring discs under all four critters; propShadows 73 with visible shadows under the stall, crates, torch bases and rocks; the shelf panel itself carries a soft drop shadow along its (335,450)-(1265,805) border. No enemies to miss. |
| 9 | UI polish | 2 | The strongest chrome in the set: gold corner brackets on all four panel corners, title 'THE PEDDLER'S SHELF' with a rule and a diamond node at (805,492), a wallet chip '72 GLINT · ROOM 7 OF 8' with coin medallion, three rarity-framed cards with icon badges and outlined rarity pills, three price plaques with coin glyphs, an amber CTA 'Advance to the Hollow Stag' with a keycap hint, plus the location plate, GLINT counter, command bar, 'v0.4.43' and '83 fps'. Round 1's Ascend header wrap is fixed — all three card titles sit on one line at y=553. Still below the reference's painted, illustrated frames in ornament, but it is unambiguously designed chrome, not browser default. |
| 10 | Motion juice | 2 | Ambient: my `certA2-ref-shopseq` 6 frames @150 ms change 3.22 / 2.25 / 2.50 / 3.91 / 4.39% of pixels — torch flicker, embers, critter idle behind the panel. Interaction (round 1 measured 0.00% for both): hover LIFTS the Bounce card (title y 553 -> 545, border brightens; 91.11% of card box 360,524,280,167 changes at thr 6); buy fires the SOLD stamp + dim + coin-fly + wallet count tween; the denied Ascend click flashes the border white and SHIFTS the plaque — box 1027,700,146,42 changes 61.61% between buy2 and deny1 and a further 65.38% between deny1 and deny2 (120 ms / 160 ms apart), i.e. a live shake. |

SHOP TOTAL 19/20 — PASS.

## BOSS — captures/certA2-boss.png — 19/20
Analyzer (mine): >160 2.792 | >200 1.287 | 16/16 | hist 13|32|25|13|7|3|2|1|1|1|1|1|1|0|1|0 | FLAT 1.22% |
warm 43.2 / foliage 31.8 / cool 25.0 | SAT 0.459 | danger 14081 / heal 1242 / violet 17702 / amber 132033.
Frame sits 11 ticks into a 42-tick Antler-Quake (t1227 -> t1269), boss 1129/1800 (plate 1089), 3 adds off-camera.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT 1.22%, the lowest of the four and well under the reference's 16.68%; 16/16 buckets. Right of the boss, box 1050,450,500,300 = FLAT 0.57%, 9/16, with road hue variation, tufts, rubble and a torch pool. Bottom-left 0,600,400,280 = FLAT 0.06%. Darkest corner 1300,750,300,150 = FLAT 0.45% / 7 buckets (hist 3|60|30|7) — dark under the vignette but still carrying barrels at (1330,690),(1490,660) and tufts. |
| 2 | Layered light | 2 | This is the frame that matches the reference's lighting story. cool 25.0% and 45% of pixels in the two darkest buckets against the reference's 48%; six warm torch pools ((310,120),(985,155),(1055,400),(1460,660),(1560,290),(20,330)) each with a flame sprite and a halo; a violet monolith at (1370,190); and the Stag itself is the brightest emitter — box 670,280,320,280 measures >200 2.685% with warm 47.2 / cool 47.7, a white-hot crown star at (830,215) over a violet bloom, two beam antlers and six violet shards. The red quake ring adds a third coloured pool. Deep shadow to blown-out highlight in one frame, exactly the reference's span. |
| 3 | Silhouette read | 1 | The Stag is still a slab. `certA2-ref-boss-stag` (690,180,300,380 @3x) shows a slate-blue tapered torso block with a narrower neck block, one pale muzzle nub at (890,415) and a pale hoof spike at (825,520) — no legs, no head, no neck. `certA2-ref-boss-z50q` (z50 canvas 330,120,200,190 @5x, a hit-flash frame) reduces it to a white mass; only the antler V and crown star identify it. The reference's boss is an unmistakable winged phoenix at the same screen share. Tank and swordsman also overlap the Stag's left flank at (700,420)-(790,520), and all three adds are off-camera (state: (-2.61,3.45),(-3.72,4.92),(-3.26,4.30)) so nothing else is on screen to read. |
| 4 | Prop density | 2 | Best-dressed arena of the set: a stone wall with capstones runs the whole top edge (0,90)-(1600,170); ruined pillars/plinths at (490,180),(575,205),(1000,190),(1050,175),(1310,600),(1370,690),(60,600),(120,760); barrels at (640,150),(1470,405),(1330,690),(260,720),(1490,660); six torches; fences at (70,155),(1440,430),(1290,655); violet monolith (1370,190); rocks, tufts, flowers (propTypes 15, propShadows 73). All four edges dressed, centre kept clear for the Stag. Round 1's "boss room undressed" is gone. |
| 5 | VFX layering | 2 | The Antler-Quake is a genuine reference-class AoE: box 670,280,320,280 = danger 11494 px in a red rim ring with jagged tick spikes, a translucent red fill, an outer glow, floating ember dots at (700,335),(760,320) and a dark scorch smear under the body — 5 layers, and its danger mass (whole frame 14081 px) matches the reference's single AoE box (14134 px). The crown is white-hot core + violet bloom + 6 shards + 2 beams. Full-body white hit-flash in bossseq_04. Numerals on every hit with a size hierarchy — the '39' crit at (1130,335) is ~2.5x the height of the '14' at (485,335); nine numerals plus a '+HP' in one frame. Quake scorch rings persist across bossseq_04 -> _06 at (860,340)-(940,420). Short of the reference only in debris: 52 hits produced no smoke chunks or flying shards (vfx decals 0, scorch 1). |
| 6 | Color discipline | 2 | Three world families — indigo night (cool 25.0%), amber fire (132033), foliage green (31.8%) — plus the three reserved accents used exactly as the bible demands: danger 14081 px is the quake ring and nothing else, violet 17702 px is the Stag crown/antlers plus the monolith (god-stuff), heal 1242 px is the '+HP' at (762,392). No grass in the heal band, no violet on ordinary enemies. This is the cleanest reserved-band frame of the two gameplay screens. |
| 7 | Post stack | 2 | The closest frame to the reference's value range: >200 1.287% vs 1.427%, 16/16 buckets with content out to bucket 14, and 45% of pixels in the two darkest buckets vs the reference's 48%. Bloom on the crown, torches and the flash; vignette measurable — corner box 1300,750,300,150 collapses to 7/16 buckets (hist 3|60|30|7); cool night grade. |
| 8 | Grounding | 2 | Round 1's headline defect is fixed: the Stag now casts a readable contact shadow — mean luma 29.0 in box 800,542,60,18 directly under the body vs 66.6 at 700,542 and 63.2 at 900,542, a 56% drop (round 1 measured 150 vs 158/171, a 5-12% dip), and it extends to 33.1 at 820,560. Party ring discs under the healer (735,660) and the tank/swordsman pair; propShadows 73 with hard shadows under every torch base, pillar and barrel. |
| 9 | UI polish | 2 | `certA2-ref-boss-plate` (520,10,570,70 @3x): violet-rimmed frame with diamond studs at all four corners, a circular MEDALLION holding a glowing antlered stag head ringed by four diamond points, letterspaced bone name plate, '1089/1800', and a lilac fill bar with arrow caps at both ends, two violet phase pips at (705,42),(825,42) and a white diamond marker at the fill head. Round 1's "lacks icon medallion, name tag and ornamental caps" is answered — this reads next to the reference's ornate Ella bar without embarrassment. Plus location plate, GLINT counter, command bar and the '×3' off-screen threat chip at (525,770). |
| 10 | Motion juice | 2 | bossseq frame-to-frame delta 54.44/41.06/43.68/63.14/14.61/39.06/56.42% (>40 delta up to 15.24%) — by far the liveliest set. Full-body white hit-flash blowout in _04 with a '26' on the body; a real LUNGE pose in _06 (body slab tilted and displaced from its crown, crown at (830,180) while the torso sits at (760,280)-(870,400)) with red trample chevrons on the ground at (680,700); HP walks 1073 -> 694 -> 396 on the plate; numerals cascade to ten per frame; threat chip counts down ×3 -> ×2; state records shakes 3 and cam offset [0.5633,4.7786] (screenshake), quake live -> resolved inside the window. |

BOSS TOTAL 19/20 — PASS.

---

## Direct comparison with docs/reference/pass-the-fear.png

**Where round 2 now matches or beats the reference**
- *Ground.* Every frame is far under the reference's own FLAT 16.68% (1.22-1.85%); the worst box I could
  find anywhere is camp 1180,460,300,200 at 16.11%. Round 1's shop modal (FLAT 52.85%) is gone.
- *Boss value range.* certA2-boss hist 13|32|25|13|7|3|2|1|1|1|1|1|1|0|1|0 puts 45% of pixels in the two
  darkest buckets and 1.287% above 200 — the reference is 48% / 1.427%. That is a match.
- *Grounding of projectiles.* Every bolt carries a contact ellipse; the reference's fireballs do not.
- *Boss chrome.* The Hollow Stag plate (medallion + name tag + arrow caps + phase pips) is the equal of
  the reference's Ella bar. Round 1's gap here is closed.
- *Shop.* A translucent, bracketed shelf over a live arena with all four party members lit above it,
  coin-fly, wallet tween, hover lift, SOLD stamp and a denial shake — polished chrome, not a web modal.

**Where the reference is still clearly better**
1. **Cool ambient in the run arenas.** Reference HUEMIX cool 76.4% (its void box 0,150,620,650 is
   95.2% cool); certA2-combat is cool 8.0% and its darkest region 1100,700,500,200 measures warm 47.1 /
   cool 13.6 — the shadows are brown-olive. certA2-shop is cool 5.7% with only 3% of pixels in the
   darkest bucket. The reference's cool-surround-vs-warm-action funnel exists only in camp (74.4%) and,
   partly, in the boss room (25.0%).
2. **The enemy telegraph in certA2-combat does not render.** Whole-frame danger band 89-124 px, bbox
   595,531-672,862 — three ~6 px ember dots — while state reports a live telegraph 21 ticks from
   resolving. The reference's single AoE box 1280,520,320,220 carries 14134 danger px as a scorched core
   plus a bright rim ring. The system can do it (bossseq_01 draws a red rim ring with pips under the
   healer at (680,675)-(800,780), and the boss's quake ring is 14081 px) — it simply is not on screen in
   the certified combat frame.
3. **Projectile trails.** Reference: every fireball is core + glow + a flame trail. Echoes bolts are core
   + glow + shadow, no trail (`certA2-ref-combat-bolts`).
4. **Persistent decals and debris.** Reference floors accumulate scorch; here vfx.arena decals 0 on both
   gameplay frames, and combat's kill burst at (770,545) is gone by combatseq_06. Kills do throw white
   debris shards (combatseq_03 at (450,420)) and the boss leaves scorch rings, so this is partial.
5. **Character silhouettes.** The party fuses into one mass whenever it clusters (combat main frame,
   three critters in a 200x180 px box), and the Hollow Stag is still a slab with antlers rather than a
   readable animal. The reference's phoenix and knight both read at a glance.
6. **HUD ornament.** Cooldowns are numbers plus a linear wipe, not radials; there is no boon stack or
   ammo-carrying skill card to answer the reference's bottom-right weapon panels.

## Verdict

| Frame | Total | Result |
|---|---|---|
| camp | 20/20 | PASS |
| combat | 15/20 | **FAIL** (< 16) |
| shop | 19/20 | PASS |
| boss | 19/20 | PASS |

No zeros anywhere. **REJECT** on the combat frame alone. The four cells to fix, cheapest first:
combat check 8 (give enemies the contact shadow the party and projectiles already have — measured
absent under the boar at 1330,645,90,22), combat check 5 (make the enemy telegraph read: the boss's own
quake ring is the model), combat check 3 (the party clump), combat check 2/6 (a cool ambient pole and
the grass/heal-band overlap). Any two of those clear the 16-point bar.
