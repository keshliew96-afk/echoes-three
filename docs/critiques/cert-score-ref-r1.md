STATUS: COMPLETE
VERDICT: REJECT (round 1) — Camp 19/20 PASS; Combat 15/20 FAIL; Boss 15/20 FAIL; Shop 11/20 FAIL; no zeros.

# Certification scorecard — REFERENCE MATCHER lens, round 1 (v0.4.16, certA1 frame set)

Critic: fresh-context, pixels + console + debug-API only. Lens: strict side-by-side with
`docs/reference/pass-the-fear.png` and the four REFERENCE_BAR descriptions. Scale: 2 = would not look
out of place next to the reference; 1 = present but the reference clearly does it better; 0 = absent
or broken. Pass needs >= 16/20 and no zero.

Frames judged (technician set): `captures/certA1-camp.png` (+`-z50`, `campseq_00..05`),
`certA1-combat.png` (+`-z50`, `combatseq_00..07`), `certA1-shop.png`, `certA1-boss.png` (+`-z50`,
`bossseq_00..07`). All 13 technician captures exit 0, 0 PAGEERROR / 0 HARNESS-ERROR / 0 [error] /
0 [warning] (verified with `grep -a` on every certA1-*.console.txt). Analyzer numbers re-run by me;
they match the technician's. Own evidence added with prefix `certA1-ref-`:

- `tools/certA1-ref-crop.mjs` (crop/upscale, brightest-pixel locate, box diff — sharp) ->
  `captures/certA1-ref-*.png` crops of every region cited below plus reference crops
  (`certA1-ref-ref-player/-telegraph/-hud-bl/-bossbar/-tower`).
- `tools/certA1-ref-gen.mjs` -> `tools/actions/certA1-ref-shop.json`; capture `certA1-ref-shop`
  (exit 0, 0 page errors): hover -> buy Bounce -> buy Detonate -> denied Ascend, with intermediate
  shots `certA1-ref-shop-hover/-buy1a/-buy1b/-buy2/-deny1/-deny2.png`.

Sequence caveat (technician latency probe, confirmed by my torch-locate): seq frames are ~65-70 ticks
apart, so hitstop (3 ticks) and kill screenshake (120 ms) cannot be resolved; check 10 is judged on
flash, poses, numerals, decals, telegraph life-cycle and environment motion.

## Reference, measured (docs/reference/pass-the-fear.png)

LUMA >160 3.418%, >200 1.427%, 16/16 buckets, hist 27|21|13|13|9|7|2|2|1|1|1|1|1|1|0|0 (48% of pixels in
the two darkest buckets), FLAT 16.68%, HUEMIX warm 22.5 / cool 76.4, SAT 0.582, danger 89724 px.
Void box 0,150,620,650: FLAT 31.27%. Floor right of the player 1000,300,600,350: FLAT 6.26%, 16/16.
Telegraph box 1280,520,300,200: danger 13884 px = scorched core + bright rim + embers. Player box
880,470,130,130: hard drop-shadow ellipse + halo + thick outline. Boss bar: icon medallion + name tag +
ornate caps. HUD bottom-left: hex HP gem, shield number, boon medallions, illustrated weapon cards.

---

## CAMP — captures/certA1-camp.png — 19/20 PASS

Analyzer: >160 1.873% | >200 0.551% | 16/16 | FLAT 13.94% | warm 25.5 / cool 70.5 | SAT 0.594 |
danger 700 / violet 8600 / amber 75568.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT 13.94% (reference 16.68%), 16/16. Road hue noise, 560 tufts, scrub. Darkest quadrant box 1100,560,450,240 = 34.05% flat / 7 buckets vs the reference void box 31.27% / 12 — comparable. Painted brick still richer than the noise plane. |
| 2 | Layered light | 2 | Indigo ambient (cool 70.5%) + hearth pool (box 560,270,260,200: >160 25.7%, >200 8.9%), 4 pole-lantern pools, 3 tent glows, forge lamp (150,680), violet portal beams + ring (box 560,0,300,150 violet 8523). Every emitter has a halo. |
| 3 | Silhouette read | 2 | Four seated critters (500,390)/(795,420)/(880,380)/(510,215) distinct at 50% (`certA1-ref-camp-z50q`): bunny ears healer/archer, cat ears swordsman, round tank; thin dark outlines + cream/mint/pink/yellow-green rings. Outlines thinner than the reference knight's. |
| 4 | Prop density | 2 | >=14 visible types: hearth, tripod, 4 benches, woodpile, 3 tents, bedrolls, forge, cart, stall, 4 pole lanterns, 2 banners, portal, boulders, sacks (campState propTypes 16). Missing vs Reference A: cabin, glowing rack displays, fences; stall (crop 1200,400) is a plain white sheet. |
| 5 | VFX layering | 2 | Hearth = white core + amber glow + rising ember sparks (`certA1-ref-camp-hearth`, 3 layers); portal = 2 beams + violet ring + motes (gateMotes 34); fireflies 150. No attacks to judge in camp. |
| 6 | Color discipline | 2 | Exactly Reference A's families: indigo night, amber fire, violet arcane; rings are the only accents. Advisory: danger band 700 px (>500 gate) with no enemies — grid cells (0,450)+(0,675) = 479 px from the forge lamp glow at (150,680), 177 px in cell (400,0). |
| 7 | Post stack | 2 | Bloom on hearth/portal/lanterns (>200 0.551%), vignette 0.26 visible (top-right cell 1100,20,480,300 sits in buckets 0-2), teal-indigo grade. Exposure below reference (>160 1.87% vs 3.42%) but above gate. |
| 8 | Grounding | 2 | Ring discs under all four critters; cast shadows under benches, woodpile, tripod (hearth crop); propShadows 70. |
| 9 | UI polish | 1 | Bar crop 495,805,610,85: portraits F1-F4 with class rims + HP bars, slots 1-4, SPC chip, 'v0.4.16' at (10,881), fps chip — clean geometric frames. But skill slots are text abbreviations ('MB','SM') and dashed placeholders, no icons; nothing like the reference's illustrated cards, hex HP gem, currency medallions (`certA1-ref-ref-hud-bl`). |
| 10 | Motion juice | 2 | campseq: fireflies/embers drift (4.40% of pixels change per frame), hearth flicker (box 560,270: 17.1%), critters idle-animate (boxes 434,335 / 750,370 / 839,314 / 456,155 change 14.4-23.9% vs 1.9% in control box 1300,600,200,120). Seated poses, not statues. |

## COMBAT — captures/certA1-combat.png — 15/20 FAIL

Analyzer: >160 15.919% | >200 3.307% | 15/16 (bucket 0 empty) | FLAT 2.10% | warm 20.0 / foliage 65.1 /
cool 14.9 | SAT 0.441 | danger 1141 / heal 260952 / violet 4307 / amber 132322. Telegraph live
(tick 630->672, frame ~tick 650), 4 enemies, 6 bolts.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT 2.10%; road with hue noise + pebbles, 640 tufts, 70 flowers, grass patches; box 900,250,500,300 right of the healer FLAT 0.74%, 13/16. |
| 2 | Layered light | 1 | Torch pools exist (box 960,190,240,170 >160 36.7% vs 1.3% in ground box 1200,190,240,170), monolith/staff/bolt halos — but no cool ambient: bucket 0 = 0.0%, buckets 0-2 = 7% vs the reference's 48%; cool 14.9% (teal pockets only). Reads as flat daylight; the deep-shadow-vs-fire funnel is absent. |
| 3 | Silhouette read | 1 | Healer and boar read. Mantis at (140,320) (`certA1-ref-combat-mantis` @3x) is a blue capsule with violet nubs and four sticks, no head/limbs; at 50% (`-combat-z50q` (60-90,145-165)) a dash. Tank/swordsman/archer overlap at (520-690,520-740) into one bloom-blown white mass at 50% ((290,320) in z50q). |
| 4 | Prop density | 2 | vfx.arena propTypes 12 (crates, barrels, fence, planter, bush, stones, monolith, 2 torches, flowers) along the top wall; centre open; road navigable. Note: y>540 holds only one torch — the reference dresses every edge (towers, banners, barricades). |
| 5 | VFX layering | 1 | Telegraph = one thin red-orange arc mostly hidden behind the party (box 480,540,240,220 danger 734 px), no scorched core, no embers (`certA1-ref-ref-telegraph`: 13884 px, core+rim+embers). Volley bolts (400-500,700-760) = white capsule + bloom, no trail. vfx particles 0. '+14' pops; kill splat appears in combatseq_03 (`-combatseq3-smudge`) and persists to _05. |
| 6 | Color discipline | 1 | Five families compete: foliage lime 65%, amber, indigo/blue enemies, violet, red-orange. Violet on a regular boar's spikes (box 1400,570,200,130 violet 713 px) breaks 'god-stuff only'; heal green sits on green grass (heal band 260952 px whole frame; '+14' box 760,330,90,45 is 88% foliage hue) so the reserved heal colour is not reserved. |
| 7 | Post stack | 2 | Bloom on torches, staff, bolts, archer flash; faint edge vignette (0.16); saturated grade. Bloom is the only strong post cue. |
| 8 | Grounding | 2 | Ring discs under all party members; boar belly shadow (`-combat-boar`); torches cast hard shadows (330,600); propShadows 40. Bolts unshadowed — same as the reference's fireballs. |
| 9 | UI polish | 1 | Bar + 'WAVE 1/2 ●○ 4 LEFT' pill (655-945,14-49) + pointer chips at (25,610)/(400,875) (`-combat-pointer`: black disc, white triangle). Clean, but text abbreviations for skills, numeric cooldowns ('0.9'/'0.1' in combatseq_02) instead of radials; no location label / currency counters like the reference. |
| 10 | Motion juice | 2 | combatseq: bow-draw (_00), swordsman lunge with blade (_07), healer cast; hit flash + spark streaks on the mantis (270,350) in _01; numerals '30'/'12'/'26'; red lunge chevrons (650,560) _02; kill decal; 4->1 LEFT; wave-2 spawn rings (490,85)/(1120,85) in _04. Torch centroid stable +-2 px (shake not resolvable at this cadence). |

## SHOP — captures/certA1-shop.png — 11/20 FAIL

Analyzer: >160 1.260% | >200 0.426% | 14/16 | FLAT 52.85% | warm 48.7 / foliage 50.0 / cool 1.3 |
SAT 0.262 | danger 4 / heal 386 / violet 0 / amber 34398. Modal box 378,168,844,468: FLAT 61.94%;
backdrop columns 0,0,370,800 / 1230,0,370,800: FLAT 47.5%, 3-4 buckets.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 1 | FLAT 52.85% (gate <20%): flat charcoal modal (61.94% flat) over a blurred backdrop (47.5%). The arena's texture survives only as blur; the reference has no flat region. |
| 2 | Layered light | 1 | Backdrop torch (320,540) is a dim amber smear; monolith (1360,80) desaturated (violet 0 px). The modal has no glow on cards, plaques, coin or button. >160 1.26% (<1.5 gate). |
| 3 | Silhouette read | 1 | No characters/enemies in view (party idle behind the veil); only the four HUD portrait busts (517-745,820-870) and glyphs ⇄ ✶ ★. Reference keeps the player in view. |
| 4 | Prop density | 1 | No in-world peddler, shelf or wares — the 'shelf' is a DOM panel; arena props veiled behind it. |
| 5 | VFX layering | 1 | Shop's own effects absent: plaques/cards are flat 2 px rims, coin a flat disc, no glitter; buying (`certA1-ref-shop-buy1a`) only dims the card to opacity 0.28 + 'SOLD' stamp (16.1% of card box changed). Only the dimmed torch bloom behind the veil keeps this off zero. |
| 6 | Color discipline | 2 | Charcoal/bone + amber (wallet, prices, CTA, 'fits your kit' = amber 428 px in box 415,432,90,22) + one sky-blue rarity rim; violet 0, danger 4. Most disciplined frame of the four. |
| 7 | Post stack | 1 | Veil = blur + dim, not the post stack: bloom only as the torch smear, no vignette gradient distinguishable, modal unaffected. |
| 8 | Grounding | 1 | Soft drop shadow at the modal border; cards, plaques, button have none; no entities to ground. |
| 9 | UI polish | 1 | Cleanest chrome of the set (letter-spaced title, wallet pill, rarity rims, glyph badges, plaques, amber CTA, hint, SOLD/owned states). Defects: 'Ascend' header wraps so its name sits at y~366 vs 345 on the other cards and orphans 'only.'; no hover feedback (Bounce card box 402,292,252,196: 0.00% change after 250 ms hover in `certA1-ref-shop-hover`). Flat web idiom vs the reference's painted frames. |
| 10 | Motion juice | 1 | Nothing moves; buy = instant dim + stamp; the denied-purchase shake reported by state (plaque shaking:true at tick 644) left plaque box 1005,495,135,50 byte-identical across buy2/deny1/deny2 (0.00%). No coin-fly, no card flip. |

## BOSS — captures/certA1-boss.png — 15/20 FAIL

Analyzer: >160 6.547% | >200 2.646% | 16/16 | FLAT 5.46% | warm 25.0 / foliage 50.9 / cool 24.0 |
SAT 0.453 | danger 11018 / heal 208067 / violet 10612 / amber 144716. Quake #2 live (813->855, frame
~tick 835), Stag 1117/1800 (plate 1073), 3 adds off-frame, 53 hits so far, vfx particles 0, decals 0.

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT 5.46%, 16/16; box 1050,450,500,300 right of the healer FLAT 2.35%; road, tufts, patches. |
| 2 | Layered light | 2 | Three torch pools with halos (320,130)/(1050,410)/(150,830), monolith halo, Stag crown core + violet bloom (box 760,150,180,140 >200 46.9%), teal shadow pockets (cool 24.0%, bucket 0 populated). Brightest emitter is the boss. |
| 3 | Silhouette read | 1 | Stag body is a featureless navy hexagonal slab (box 780,300,110,230); identity only from the V antler beam + crown; at 50% (`-boss-z50q`, flash frame) a white slab with a V. Tank/swordsman overlap its left flank (700-780,400-520). Reference boss is a legible phoenix. |
| 4 | Prop density | 2 | Same 12-type arena; props ring the top wall; centre kept readable around the Stag. |
| 5 | VFX layering | 1 | Quake ring = red-orange rim with ticks + amber gradient fill + outer glow (box 690,320,300,250 danger 10301) — a real 3-layer telegraph; crown core+glow. But hits are flash + numeral only: particles 0 after 53 hits, no debris/smoke. Kill splat (700,680) persists bossseq_03-_07 (`-bossseq3-decal`). Numerals on every hit. |
| 6 | Color discipline | 1 | Violet correctly on Stag + monolith, danger only on the ring (danger 11018 = ring). But '+22' heal green over green grass (heal band 208067 px), and violet spikes on boar adds in bossseq_05/_07 at (1100,490)/(1450,680). Foliage + amber + violet + indigo + red-orange > three families. |
| 7 | Post stack | 2 | Bloom on crown/torches/flash (>200 2.646%), vignette at all four corners, cooler night grade. Closest of the four to the reference value range (hist 1|10|19|18|13|11|9|6|4|3|2|1|1|1|1|0). |
| 8 | Grounding | 1 | Party ring discs, torch shadows present; the Stag has no readable contact shadow: ground luma under the body (box 800,518,60,22) 150 vs 158 and 171 beside it — a 5-12% dip swallowed by the quake fill. Reference player: hard drop-shadow ellipse. |
| 9 | UI polish | 1 | Plate (`-boss-plate`): violet-rimmed pill, bold bone name, lilac fill, '1073/1800' — clean, legible. Lacks the reference bar's icon medallion, name tag and ornamental caps (`-ref-bossbar`); bottom bar still text-abbreviated; threat chip '×3' at (525,775). |
| 10 | Motion juice | 2 | bossseq: ring live _00 (danger 14952) -> resolved _01 (1563); Stag hit-flash white in _02/_05/_06/_07; numerals cascade 8->45; trample chevrons (940,640) _06; kill splat from _03; healer hurt pose with '15' in _03; camera follows (torch centroid (324,133)->(394,92)). |

---

## Reference comparison — what pass-the-fear has that these frames lack

- **Value range.** Reference: 48% of pixels in the two darkest buckets AND 1.4% above 200. Combat:
  0% in bucket 0 (flat daylight); camp: right shape but half the highlight share (>200 0.55%). Boss is
  the only gameplay frame with the reference's shadow-to-blowout span.
- **Character read.** Reference knight: thick ink outline + hard drop shadow + halo, legible at
  ~40 px. Echoes: thin outlines, colour rings instead of shadows, and the mantis / Stag body are
  abstract shapes; allies pile up into one bloom mass in melee.
- **VFX depth.** Reference: every projectile core+glow+trail, telegraph core+rim+embers, hits spawn
  debris. Echoes: bolts core+glow, telegraph a thin arc (combat) or a good 3-layer ring (boss), hits
  flash+numeral with particles 0 in both fight frames.
- **Colour story.** Reference: three families, fire = danger everywhere. Echoes Act-1: five families
  with the reserved heal green sitting on a green world and violet leaking onto ordinary boars.
- **HUD idiom.** Reference: painted, illustrated (hex gem, medallions, weapon cards, boss icon).
  Echoes: flat typographic chips with letter abbreviations — clean but plain; shop has no hover state
  and a misaligned third card header.
- **Camp** is the one frame that sits beside Reference A without embarrassment: same night/fire/
  arcane story, dense props, layered hearth, idle-animated critters.

## Verdict

REJECT (round 1): Camp 19/20 PASS; Combat 15/20, Boss 15/20, Shop 11/20 below the 16/20 bar. No zeros.

Highest-leverage fixes (each flips a 1 to a 2 on two frames): (a) hit particles/debris + a bolt trail
(check 5, combat+boss); (b) drop the violet from boar spikes and move the heal accent off foliage hue —
e.g. mint/white-green numerals with a dark plate, or de-saturate Act-1 grass toward olive (check 6);
(c) skill icons in the bar and an icon medallion on the boss plate (check 9, all frames); (d) a
contact-shadow ellipse under the Stag and a head/limb read for the mantis (checks 3/8); (e) shop:
hover state, aligned card headers, glow on plaques/CTA, a coin burst on buy, and keep the party visible
beside the panel.


---

## Resume verification (second critic instance, same lens)

The first instance wrote every table and the verdict but was cut off before stamping STATUS. Before
stamping COMPLETE I re-verified rather than re-scored:

- Files: all 66 `captures/certA1-ref-*` evidence files, `tools/certA1-ref-crop.mjs`,
  `tools/certA1-ref-gen.mjs`, `tools/actions/certA1-ref-shop.json` exist; every certA1-*.console.txt
  (21 files) has 0 PAGEERROR / HARNESS-ERROR / [error] / [warning] lines.
- Analyzer re-run: whole-frame numbers for camp / combat / shop / boss and every cited box reproduce
  exactly (shop modal 378,168,844,468 FLAT 61.94%; combat telegraph box 480,540,240,220 danger 734;
  combat ground 900,250,500,300 FLAT 0.74% 13/16; boss ring 690,320,300,250 danger 10301; boss ground
  1050,450,500,300 FLAT 2.35%; camp dark quadrant 1100,560,450,240 FLAT 34.05% 7/16; reference telegraph
  1280,520,300,200 danger 13884; combat boar box 1400,570,200,130 violet 713).
- Viewed with Read: reference, all four main PNGs, all three -z50 PNGs, combatseq_01, bossseq_01,
  certA1-ref-shop-buy1a. The z50 reads match: combat party cluster is one bloom-white mass at
  (255-340,290-360) of the 800x450 canvas; boss-z50 Stag is a white slab with a V at (380-440,120-270);
  camp-z50 critters (255,105)/(250,200)/(400,215)/(440,190) still read as four distinct animals.
- Shop hover: technician frame vs `certA1-ref-shop-hover` in the Bounce card box 402,292,252,196 =
  0.00% changed (the DOM is deterministic, so this is a valid no-hover-state proof). Denied purchase:
  plaque box 1005,495,135,50 = 0.00% across buy2/deny1/deny2 while state reported shaking:true at tick 644.
- New detail (check 9, shop): with wallet 17 the 35-GLINT Ascend card shows NO unaffordable state — crops
  `certA1-ref-ascend-buy2` vs `certA1-ref-ascend-deny1` (box 946,292,252,260 @2x) are visually identical
  (3.87% sub-threshold anti-aliasing change in 946,352,252,140, meanAbsDiff 1.32; 0.00% in the header and
  rim). Price plaque stays gold, "fits your kit" stays lit. Does not change the score (already 1).

All 40 scores stand as written above.
