STATUS: COMPLETE
Verdict: ALL FOUR FRAMES PASS the reference bar — camp 19/20, combat 17/20, shop 19/20, boss 18/20, no zeros. Reference gap on every frame: the floor carries no painted structure and arena decals stay 0.

# Cert score — REFERENCE MATCHER lens — round 3 (v0.4.59)

Critic: independent art critic, fresh context. Lens: strict side-by-side against
docs/reference/pass-the-fear.png + the four reference descriptions in docs/REFERENCE_BAR.md.
Scoring: 2 = would not look out of place next to the reference; 1 = element exists but the
reference clearly does it better; 0 = absent or broken.

Progress log:
- [ ] reference viewed
- [ ] camp scored
- [ ] combat scored
- [ ] shop scored
- [ ] boss scored

## Reference read (docs/reference/pass-the-fear.png, viewed 1920x1080)
Painted stone bridge, ~40 fireballs each = white core + orange glow + flame trail;
one AoE telegraph at (1400,620) = dark scorched core + bright red rim; lingering ground
fire at (1200,660) and (800,970); brick floor with mortar lines, chips, moss/dirt patches,
straw pile and a blood/scorch smear (crop captures/certA3-ref-REF-floor.png, ref box
800,600,500,360); violet/magenta void left of x=660 with swirl strokes; torch tower with
lit green lantern (1400,380); banner (500,800); spike barricades (1100,1050); ornate boss
bar + name "Ella" + medallion (440,130); location plate "Gate Bridge" (80,42); currency
X10/X13 top-right (1880,40/95); hex HP gem "100" bottom-left (120,930); weapon cards with
2/10 and 0/3 ammo bottom-right (1750,900/1040). Analyzer: >160 3.418, >200 1.427, 16/16,
FLAT 16.68, warm 22.5/cool 76.4, danger 89724 / heal 446 / violet 13339 / amber 56031.

## CAMP — captures/certA3-camp.png (verified my own analyzer numbers, they match the technician's)
Whole frame: >160 2.616% / >200 0.915% / 16/16 buckets / FLAT 1.83% / warm 18.9 cool 79.8 /
danger 37 heal 1405 violet 6639 amber 32926. Hist 18|37|17|8|5|4|3|3|2|1|1|1|0|0|0|0 —
buckets 12-15 effectively empty vs the reference's 1% in buckets 12-13.
My own box probes:
- (1000,620,220,170) lower-right ground: 4/16 buckets, hist 6|42|47|5, warm 0.0% cool 100.0%,
  amber 0 violet 0, FLAT 0.00%. Zero decals, zero path detail — only ~3 tuft silhouettes.
- (400,560,200,220): 7/16 buckets, hist 1|64|28|6, cool 99.8%, amber 0.
- (950,600,300,200): 5/16 buckets, >160 0.027%, cool 99.9%.
- (0,420,260,240) forge corner: 12/16 buckets, amber 1159, FLAT 0.63% — this corner IS dressed.
- (760,420,110,60) healer ring: heal 1047 px of the frame's 1405 — the green is the healer's
  identity ring, NOT grass leaking into the heal band. Colour discipline is clean.
Crops: captures/certA3-ref-camp-party.png (430,320,520,200 @3x) — thick navy outlines,
blob shadow ring under all 4 rigs, mint/pink/navy identity rims, stone hearth ring.
captures/certA3-ref-camp-deadground.png (400,540,420,300 @3x) — dither grain + soft radial
glow + ~8 tuft silhouettes and 2 fireflies over ~200x220 px; no decal, no path edge, no hue
break. FLAT reads 0.00% only because of per-pixel dither.

## CAMP motion (sequence, my own diffs, tools/certA3-ref-diff.mjs)
campseq_00 vs _03 (750 ms): party box (430,300,520,220) changed 11.52% of px, meanDelta 6.43,
maxDelta 200 at (851,354) = the swordsman rig, i.e. real skeletal idle not a statue.
Hearth box (600,280,220,180) changed 22.41%, meanDelta 8.62 — fire flicker is live.
Whole frame 3.24% changed. Seq LUMA >160 2.191-2.577%, danger band 31-61 px.

## COMBAT — captures/certA3-combat.png
Whole frame: >160 4.350% (ABOVE ref 3.418) / >200 0.798% (BELOW ref 1.427) / 16/16 /
FLAT 1.83 / warm 43.0 foliage 14.4 cool 42.7 (ref 22.5/1.1/76.4) / danger 9516 (ref 89724)
heal 5311 violet 2166 amber 172437 (ref 56031). Hist 14|29|20|11|7|4|3|2|2|3|2|1|1|0|0|0.
My own box probes:
- (900,600,220,180) mid-frame shadow: 6/16 buckets, hist 90|8|1, amber 45, danger 0, heal 0
  -> the green grass does NOT leak into the reserved heal band. Colour discipline clean.
- (1150,180,260,200): 9/16 buckets, amber 1454, heal 48.
Crops:
- captures/certA3-ref-cbt-action.png (330,500,420,400 @3x): volley bolts at frame (390,710)/
  (465,745)/(525,770) are amber capsule + WHITE-HOT core stripe + soft warm halo + orange
  trail ribbon back to the caster = 4 layers, at reference construction. Party rigs carry
  thick navy outlines + navy blob shadow rings. Telegraph = bright orange rim ribbon + arc
  ring + translucent salmon interior wash; landing decal at (390,867) = dark ring + red disc
  + spike glyph.
- captures/certA3-ref-cbt-dark.png (860,560,300,240 @3x): ~7 grass tufts + ~6 motes + dither
  grain over 300x240 px. ZERO decals, zero ground-texture structure, smooth gradient only.
  The reference's equivalent 300x200 floor box carries mortar lines, brick chips, moss/dirt
  patches, a straw pile and a blood smear (crop captures/certA3-ref-REF-floor.png).
- captures/certA3-ref-cbt-blueprop.png (1380,560,200,140 @5x): an ENEMY IS in frame — a blue
  mantis wedge at (1380,560)-(1580,700), dark outline + white mandibles + blue back fins, but
  no legs/head separation and no readable insect silhouette; reads as a fish or a blue rock.
  No visible blob shadow under it.
- captures/certA3-ref-cbt-ptr.png (0,540,120,160 @5x): one off-frame threat chip at (30,600),
  white arrow on a dark disc with a light rim ring. Only ONE chip visible in the frame though
  hud.combat().threatNodes = 4.
- certA3-combat-z50.png: at 50% the party CLUMP at z50 (300,310) merges into one grey mass —
  tank/swordsman/archer cannot be separated. The healer at (400,205) reads cleanly.

## Instruments I built (critic-only, certA3-ref- prefix, nothing under src/** touched)
- tools/certA3-ref-crop.mjs — crop/nearest-magnify a box out of any PNG.
- tools/certA3-ref-diff.mjs — |dLuma| pixel diff of two frames inside a box (motion / shake).
- tools/certA3-ref-luma.mjs — mean luma of arbitrary boxes (vignette, contact shadows).
- tools/certA3-ref-gen.mjs -> tools/actions/certA3-ref-shopz.json, certA3-ref-shopseq.json.
- MY OWN CAPTURES (the technician shipped no zoom and no sequence for shop):
  captures/certA3-ref-shopz.png (--zoom 0.5) and certA3-ref-shopseq_00..05.png (6 @ 250 ms),
  both ?seed=4242 --timeout 180000, exit 0, zero PAGEERROR. My probe reproduces the
  technician's shop state exactly: screen "shop", wallet 72, cards 3, plaques 25/30/35,
  arena {particles 0, decals 0, scorch 0, numerals 0, propTypes 15, propShadows 75,
  grass 640, flowers 70, variantName "clearing"}.

## Cross-frame instrument readings

VIGNETTE (meanLuma, 140x120 corner boxes vs a 140x120 centre box)
| frame | TL | TR | BL | BR | centre |
|---|---|---|---|---|---|
| REFERENCE | 21.8 | 55.0 | 19.3 | 35.9 | 81.5 |
| camp | 43.7 | 24.6 | 33.9 | 21.7 | 108.6 |
| combat | 40.3 | 32.3 | 25.7 | 37.3 | 57.0 |
| shop | 40.3 | 32.7 | 25.2 | 34.6 | 83.3 |
| boss | 35.3 | 26.4 | 34.1 | 21.8 | 83.1 |
Boss and camp corner/centre ratios (0.26-0.42, 0.20-0.40) match or beat the reference's
0.24-0.67. Post stack is real, not claimed.

EMISSIVE CORES (bloom proof)
- camp hearth (640,300,120,110): >200 54.758%, hist reaches bucket 15 at 15%, warm 100.0%,
  danger 0, amber 1600 — a blown, value-graded fire core, reference-class.
- camp portal (600,10,220,110): cool 99.9%, violet 3374, danger 0, amber 0, FLAT 0.00%.
- combat torch (280,510,80,70): >200 53.893%, hist 0|0|0|0|2|2|4|6|6|4|3|8|24|18|14|9.
- boss crown (760,180,180,140): >200 13.798%, 14/16 buckets incl. bucket 15, violet 1955,
  warm 1.3% — the frame's brightest emitter and it is pure violet-white.
- combat torch surround (1020,180,130,120): danger 0, amber 5373 — torches do NOT leak into
  the reserved danger band, so combat's danger 9516 is entirely the live telegraph.

CONTACT SHADOWS (meanLuma under vs 130 px beside)
- combat tank: ring 97.7 at (540,690,110,26) vs 30.8 at (540,740,110,26) — hard rimmed ring.
- boss Stag (bossseq_01): 31.7 under (780,520,110,30) vs 54.5 beside (640,520,110,30) = a
  23-luma bounded ellipse. Round 1's "Stag has no contact shadow" is FIXED.
- combat mantis (1420,650,120,30) 34.2 vs (1290,650,100,30) 51.2 — grounded, but a soft
  17-luma darkening, far weaker than the party's rimmed rings.

MOTION (tools/certA3-ref-diff.mjs, whole frame, thr 12)
- combat seq f00->f07 consecutive: 12.30 / 9.44 / 8.90 / 9.80 / 9.61 / 10.38 / 25.02 %
  changed, maxDelta 205-239 every step; the 25.02% step (meanDelta 12.92) is the impact
  flash that also takes f07's >200 to 2.862%.
- boss seq STATIC-CORNER box (0,100,300,250) — only fixed props, far from every effect —
  changes 0.32 / 27.04 / 21.83 / 3.02 / 17.88 / 46.80 / 11.16 % between consecutive frames,
  meanDelta up to 16.54. A background that translates like that is CAMERA SHAKE, matching
  screenshake 3 / hitstop 19 / hit 54 in the boss event tape.
- shop seq (mine) f00 vs f03: whole frame 1.81%, panel box (340,455,920,350) 3.48%
  (maxDelta 211 at 519,737 = the 25-GLINT plaque), party box (560,180,520,300) 4.96%
  (maxDelta 156) — the party keeps idling behind the panel.

---

# SCORECARDS

## CAMP — captures/certA3-camp.png (+ -z50, campseq_00..05) — 19/20 PASS

| # | Check | Score | Note (pixel box / analyzer number) |
|---|---|---|---|
| 1 | No dead ground | **1** | Whole-frame FLAT 1.83% only because of per-pixel dither. Box (1000,620,220,170) = 4/16 buckets, hist 6-42-47-5, cool 100.0%, amber 0, violet 0, ZERO decals, ~3 tuft silhouettes; (950,600,300,200) 5/16 buckets, >160 0.027%; (400,560,200,220) 7/16. Crop certA3-ref-camp-deadground.png (400,540,420,300 @3x): ~8 tufts + 2 fireflies + a smooth radial glow over 200x220 px. The reference's 300x200 floor box (crop certA3-ref-REF-floor.png) carries mortar lines, brick chips, moss/dirt patches, a straw pile and a blood smear — painted surface structure the camp ground has none of. |
| 2 | Layered light | **2** | Cool indigo ambient (HUEMIX cool 79.8 vs ref 76.4) + hearth pool (690,350), 4 lantern-pole pools (530,90)/(890,105)/(160,690), 2 tent glows (330,220)/(1060,215), forge (150,690), violet portal (700,60) = 17 emitters, every one with a soft halo. Hearth core box (640,300,120,110) >200 54.758% into bucket 15 = a real blown core, not a flat disc. |
| 3 | Silhouette read @50% | **2** | certA3-camp-z50.png: the four rigs at z50 (250,180)/(255,95)/(395,205)/(440,180) separate cleanly on distinct rings; tents, cart, stall mast, benches, lantern poles all read. Crop certA3-ref-camp-party.png @3x: thick navy outlines on every rig, ear/hat shapes distinct. |
| 4 | Prop density | **2** | 16 named camp kinds / 26 propTypes vs the >=12 bar, and they are Reference A's own list: stall (1310,540), forge+anvil (150,690), rack (130,340), cart (1370,240), 4 lantern poles, campfire with seated characters, portal (700,60), 2 tents, bedrolls, 5 benches, woodpile (410,510), banners (410,820)/(1160,790), sacks, runestone. Edge-concentrated, centre navigable per the bible. Only Reference A items missing: the cabin and the glowing weapon-rack displays. |
| 5 | VFX layering | **2** | Hearth = white-hot core (>200 54.8%) + amber pool + 130 embers + stone-ring occlusion; portal = violet ring + halo + 34 gate motes (portal box 600,10,220,110: violet 3374, danger 0, amber 0, FLAT 0.00%). >=3 layers on both. No attack VFX or numerals are available in camp. Noted in prose, not scored: zero ground decals anywhere in camp. |
| 6 | Colour discipline | **2** | Three families exactly: indigo (cool 79.8%), amber (warm 18.9%, ref 22.5%), violet (6639 px, portal only). danger 37 px on a no-threat frame (gate <500). heal 1405 px, of which 1047 measured inside the healer's own identity ring (760,420,110,60) — the green is character identity, NOT grass leaking into the reserved band. Round 1's "grass sits in the heal band" is fixed. |
| 7 | Post stack | **2** | Bloom: hearth and portal both blow past 200. Vignette: corners 43.7/24.6/33.9/21.7 vs centre 108.6 = 0.20-0.40 ratio, at or better than the reference's 0.24-0.67. Grade: exposure 1.24, warm/cool split holds. |
| 8 | Grounding | **2** | 4/4 rigs on rimmed blob rings (crop certA3-ref-camp-party.png: navy rim + white/mint/pink fill). propShadows 70; cart (1370,270), bench (830,570), poles and tents all sit on soft dark ellipses. |
| 9 | UI polish | **2** | Location plate (12,15)-(378,68) with diamond glyph + caps title + small-caps subtitle; GLINT pill (1435,15)-(1585,55) with coin glyph; portrait bar (500,808)-(1100,875) = 4 portraits with F1-F4 caps, HP bars, class-coloured rims + 4 numbered skill slots (2 iconed, 2 dashed-empty) + SPC; v0.4.59 (18,880); 164 fps (1560,880). Framed geometric chrome throughout — matches the reference's plate/currency/card set and beats it on type consistency. |
| 10 | Motion juice | **2** | campseq_00 vs _03 (750 ms): party box (430,300,520,220) 11.52% changed, maxDelta 200 at (851,354) = the swordsman rig itself, so real skeletal idle. Hearth box (600,280,220,180) 22.41% changed, meanDelta 8.62. Amber 32349->35182 and violet 6492->6822 across the six frames = live ember/firefly/portal drift. |

**Camp reference verdict:** density and cohesion sit at the reference; the single gap is the floor. Everything the reference paints INTO its ground (mortar, chips, moss, scorch, blood) the camp replaces with a smooth gradient plus scattered tuft silhouettes.

## COMBAT — captures/certA3-combat.png (+ -z50, combatseq_00..07) — 17/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | **1** | Box (900,600,220,180) = 6/16 buckets, hist 90-8-1, amber 45, danger 0, heal 0, zero decals. Crop certA3-ref-cbt-dark.png (860,560,300,240 @3x): ~7 grass tufts + ~6 motes + dither grain over a 300x240 region — no ground texture, no decal, no path edge. arena decals 0 and scorch 0 on EVERY combat frame including all 8 sequence frames. The reference's floor is hand-painted brick everywhere with cracks, moss and accumulated scorch/blood. |
| 2 | Layered light | **2** | 5 brazier emitters at (300,540)/(170,620)/(1080,230)/(1435,430)/(990,50), each flame + halo + ground pool; core box (280,510,80,70) >200 53.893% with the histogram spanning buckets 4-15. Cool ambient present (box 900,600 = 88.5% cool). Whole-frame >160 4.350% BEATS the reference's 3.418%. |
| 3 | Silhouette read @50% | **1** | certA3-combat-z50.png: the tank/swordsman/archer at z50 (300,310) merge into a single grey mass — three characters cannot be counted, let alone identified. The healer at (400,205) does read. The one in-frame enemy (blue mantis, frame box 1380,560-1580,700; crop certA3-ref-cbt-blueprop.png @5x) is a flat blue wedge with white mandibles and back fins but no legs, no head separation and one eye dot — it reads as a fish or a blue rock, not an insect. The reference's chibi knight is tiny but unambiguous. |
| 4 | Prop density | **2** | arena propTypes 15 vs the >=8 bar. In frame: fences (0,270)/(50,760)/(1490,270), ladder-rack (1490,270), crates (1500,320)/(1490,795), boulders (95,455)/(1520,505)/(1400,790), stump (600,845), log (10,485), tarp (10,650), 5 braziers, grass 640 + flowers 70. Edge-concentrated, centre lane clear — exactly Reference C's decorated-edge / readable-centre rule. |
| 5 | VFX layering | **1** | Layers ARE there: crop certA3-ref-cbt-action.png shows each volley bolt as amber capsule + white-hot core stripe + warm halo + orange trail ribbon (4 layers), the telegraph as bright orange rim ribbon + arc ring + salmon interior, and a landing decal at (390,867) = dark ring + red disc + spike glyph; combatseq_05 adds outlined size-scaled numerals "12" (395,297) / "30" (462,289), an amber mark ring (300,490)-(500,660) around the mantis, a red spiked disc with radial spokes (720,490)-(860,620) and an amber landing ring (1120,565)-(1265,675). What the reference has and this does not: black smoke chunks + debris on every hit, and LINGERING ground fire / persistent decals — arena decals 0 and scorch 0 across all 8 sequence frames, so nothing accumulates on the floor. The main still also carries zero damage numerals (arena.numerals 0). |
| 6 | Colour discipline | **2** | danger 9516 px is entirely the live telegraph: a torch-only box (1020,180,130,120) reads danger 0 / amber 5373, and a mid-ground box (900,600,220,180) reads danger 0 / heal 0 — so the green grass does NOT leak into the reserved heal band (round 1's finding fixed) and the orange fires do not leak into danger. heal 5311 = heal numeral + heal zone + healer ring. violet 2166 confined to the arcane patch (1370,60). Foliage green is a fourth family but Reference C explicitly sanctions the saturated-green arena. |
| 7 | Post stack | **2** | Bloom proven by the torch core (>200 53.9%, bucket 15). Vignette corners 40.3/32.3/25.7/37.3 average 33.9 vs the reference's four-corner average 33.0. Grade: warm 43.0 / cool 42.7 with warm road bands cutting the cool ground. |
| 8 | Grounding | **2** | Party ring measured: 97.7 at (540,690,110,26) vs 30.8 at (540,740,110,26). Props on shadow ellipses (propShadows 75). The in-frame mantis darkens its base to 34.2 at (1420,650,120,30) vs 51.2 at (1290,650,100,30) — grounded, though with a soft 17-luma smudge rather than the party's hard rimmed ring. Projectiles cast no shadow; neither do the reference's fireballs, so no deduction. |
| 9 | UI polish | **2** | Location plate (12,15)-(485,68) "UNEASY WOODLAND / ROOM 1 OF 8 - CLEAR THE CLEARING"; wave banner (655,15)-(945,50) "WAVE 1/2 (pips) 4 LEFT"; GLINT pill; portrait+skill bar (500,808)-(1100,875); off-frame threat chip at (30,600) = white arrow on a dark disc with a light rim (crop certA3-ref-cbt-ptr.png). Reference-class chrome. |
| 10 | Motion juice | **2** | Consecutive sequence frames change 12.30 / 9.44 / 8.90 / 9.80 / 9.61 / 10.38 / 25.02 % of the whole frame with maxDelta 205-239 every step; the 25.02% step (meanDelta 12.92) takes >200 to 2.862% = an impact flash. Danger px 6381 -> 33 -> 1260 -> 87 -> 11821 -> 13875 -> 10250 -> 9648 across the telegraph resolve and rebuild. combatseq_05 shows a displaced/smeared tank pose and a white flash on the struck rig. |

**Combat reference verdict:** projectile construction now matches the reference's core+glow+trail and the value range exceeds it (>160 4.350 vs 3.418). Below the reference on three counts: the floor carries no painted structure or accumulating decals; the party cluster loses its read at 50%; and the one in-frame enemy has no creature silhouette. HUEMIX warm 43.0 vs the reference's 22.5 also weakens the warm-action-on-cool-ground funnel — the game's large pale cream light pools are themselves the brightest ground, so the fire accents pop less.

## SHOP — captures/certA3-shop.png (+ my certA3-ref-shopz.png, certA3-ref-shopseq_00..05) — 19/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | **2** | Every visible ground box beats the reference's own worst floor box (7/16 buckets, FLAT 15.57%): world strip (0,90,340,760) = 12/16 buckets, FLAT 3.43%, amber 28967; upper band (340,90,920,340) = 15/16, FLAT 0.64%, amber 22988; right-of-panel (1270,470,320,330) = 10/16 buckets, FLAT 3.11%, warm 88.8%, amber 12433. The arena's contentless middle is occluded by the panel (340,455)-(1260,805). |
| 2 | Layered light | **2** | Torches at (300,510)/(1080,230)/(1435,430)/(85,220)/(1520,690) with flame + halo + pool; violet patch (1370,60); the panel adds its own amber lantern-glyph burst at (808,490) and per-card rarity glows (RARE card box 655,518,290,180 = 14/16 buckets, >200 1.255%, FLAT 0.00%). Cool road shadows carry the ambient. |
| 3 | Silhouette read @50% | **2** | MY capture certA3-ref-shopz.png: the four rigs at z50 (310,175)/(385,125)/(400,205)/(475,175) separate cleanly on distinct rings — no clumping, unlike the combat frame. Stall canopy (85,175), crates, torches and fences all read at 50%. |
| 4 | Prop density | **2** | arena propTypes 15 plus the peddler stall with a green-and-white striped canopy (130,320)-(280,420), crates/barrels (100,440)/(200,270), fences, 5 torches, grass 640 / flowers 70. Edge-concentrated. |
| 5 | VFX layering | **1** | The shop's own effects exist: cyan rim glow on the RARE frame (660,524)-(940,691), amber rim glow on the LEGENDARY frame (960,524)-(1240,691), the lantern medallion burst (808,490), glowing price plaques (427,698)/(727,698)/(1027,698), and the arena behind keeps torch flames and drifting motes. But they are single flat rims: arena particles 0, decals 0, scorch 0 in my own probe as well as the technician's, and there is no coin glitter anywhere — Reference C names glittering coins as a shop-tier effect, and Reference D's card panel carries layered corner brackets plus live fire behind it. |
| 6 | Colour discipline | **2** | danger 6 px — the combat gate is genuinely shut on this page (the D3 HUD finding holds) even though hud.banner() still holds a stale "WAVE 1/2" string. violet 1731, heal 513, amber 137849. Panel is navy + amber with cyan/amber/white used strictly as rarity codes. |
| 7 | Post stack | **2** | Vignette corners 40.3/32.7/25.2/34.6 vs centre 83.3 = 0.30-0.48, inside the reference's band. Bloom on torches and on the card rims. Panel interior (360,600,880,180) = 15/16 buckets, FLAT 0.33% — a graded translucent plate, not the round-1 charcoal modal at FLAT 52.9%. |
| 8 | Grounding | **2** | All four rigs on rimmed blob rings at (770,270)/(630,360)/(800,410)/(950,340); stall, crates and torches on shadow ellipses (propShadows 75); the panel itself carries a soft drop shadow along (340,800)-(1260,808). |
| 9 | UI polish | **2** | The strongest chrome in the build: corner brackets at all four panel corners, title with a rule, lantern medallion, wallet pill "72 GLINT - ROOM 7 OF 8" (955,475)-(1240,510), three rarity-framed cards each with icon box + name + rarity chip + meta line + body + amber "fits your kit" tag, three coin plaques, an amber primary button (655,750)-(945,790) and two hint labels. Exceeds the reference's own weapon-card frames on hierarchy. |
| 10 | Motion juice | **2** | My own certA3-ref-shopseq f00 vs f03 (750 ms): panel box (340,455,920,350) 3.48% changed with maxDelta 211 at (519,737) = the price plaque pulsing; world/party box (560,180,520,300) 4.96% changed, maxDelta 156 = the party keeps idling behind the panel; whole frame 1.81%. A shop screen with a living world behind it, not a freeze-frame. |

**Shop reference verdict:** at or above the reference on framing, hierarchy and the world behind. Below it only on effect richness — the shop scene runs with particles 0 / decals 0, so nothing glitters, sparks or accumulates.

## BOSS — captures/certA3-boss.png (+ -z50, bossseq_00..07) — 18/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | **1** | Whole frame is the best of the four (16/16 buckets, FLAT 1.25% vs the reference's 16.68%, hist bucket-0 27% matching the reference exactly), but the ground still carries no decals: box (1120,700,280,170) = 5/16 buckets, hist 35-36-18-7-4, FLAT 0.00%, amber 3734, ZERO decals; (60,660,300,200) = 7/16 buckets, warm 82.3%, amber 25965, again decal-free. arena decals 0 (scorch 1, and that 1 is the live telegraph's own core). The reference's floor has accumulated scorch, blood and lingering fire patches. |
| 2 | Layered light | **2** | Crown box (760,180,180,140): >160 44.321%, >200 13.798%, 14/16 buckets reaching bucket 15, violet 1955, cool 98.7% — the Stag is the brightest emitter in the room and it is pure violet-white. Plus 5-6 braziers at (310,140)/(985,155)/(1070,410)/(1530,270)/(1455,675), a glowing violet monolith (1370,180) and the quake ring's own glow. Whole-frame >200 1.198% is the closest of the four to the reference's 1.427%. |
| 3 | Silhouette read @50% | **1** | certA3-boss-z50.png: at 50% the Stag at z50 (415,145) is an abstract pale-blue chevron with a white burst — no antler geometry survives (the antlers are light beams, not modelled tines), and it does not read as a stag or as any animal. The party at z50 (350,215) merge into a dark blob under the telegraph ring. At full res (crop certA3-ref-boss-stag.png @3x) the body does resolve into torso / chest plate / arms / legs / head, so this is a 50%-zoom failure, not an absence. |
| 4 | Prop density | **2** | Stone wall band (0,90)-(1600,145), gravestones/obelisks (55,620)/(1390,600)/(500,190)/(985,200), barrels (1350,440)/(1310,810)/(620,170)/(1240,800), fences (30,175)/(1450,590), 5-6 braziers, a violet monolith (1370,180), rocks, grass 640, flowers 70. propTypes 15, propShadows 75. Round 1's "boss room undressed" is fixed; this is Reference B's "props ring the arena edge, centre stays readable". |
| 5 | VFX layering | **2** | The Antler Quake telegraph is the reference's exact construction: dark scorched core + concentric red bands + bright red rim + outer spike teeth + radial spokes — box (690,300,280,250) danger 11410, 15/16 buckets, FLAT 3.32%, warm 42.5 / cool 52.2. The crown is white-hot star core + violet glow + rays + motes. Numerals: 10 in frame, white with a dark outline and size-scaled ("11" ~28 px at (335,383) vs the crit "39" ~90 px at (1325,367), crop certA3-ref-boss-numR.png); bossseq_01 adds a GREEN "+22" heal numeral at (565,312), a "+HP" tag at (760,375) and an alpha-faded "12" at (533,340) — damage/heal colour coding matches the reference's damage-type coding (its numerals are ice-blue with a violet "Freeze" tag, crop certA3-ref-REF-num.png). arena particles 52. Still short of the reference on smoke chunks / debris and persistent decals. |
| 6 | Colour discipline | **2** | violet 14498 vs the reference's 13339 — near-identical, and confined to the crown / antlers / monolith (crown box warm 1.3%). danger 21400 entirely on the live quake (11410 of it inside the ring box alone); heal 2240 on the healer ring and heal burst; amber on torches and road bands. Exactly three families plus the bible's reserved accents. |
| 7 | Post stack | **2** | Vignette corners 35.3/26.4/34.1/21.8 vs centre 83.1 = 0.26-0.42, matching the reference's 0.24-0.44 on three of four corners. Bloom blows the crown into bucket 15. Grade warm 38.5 / foliage 8.2 / cool 53.3. |
| 8 | Grounding | **2** | The Stag's contact shadow measured: 31.7 under (780,520,110,30) vs 54.5 beside (640,520,110,30) and 42.0 below (780,575,110,30) = a bounded 23-luma ellipse, visible in crop certA3-ref-boss-foot.png as a dark pool under all four legs inside the red telegraph fill. Round 1's "Stag idles as a navy obelisk with no contact shadow" is FIXED. Party rigs on rimmed rings; propShadows 75 across the arena. |
| 9 | UI polish | **2** | Ornate boss plate (525,15)-(1075,68): stag-head medallion at (560,37) inside a double ring, name in caps, violet fill bar (600,52)-(870,68) with a chevron end cap at (1043,58), live "1106/1800" (and 1042/1800 one frame later — it tracks). That is the reference's ornate name-plate + boss-icon bar, matched element for element. Plus the location plate, GLINT pill, portrait/skill bar and an adds chip "x3" at (515,770) with a double-arrow. |
| 10 | Motion juice | **2** | Hardest evidence in the whole set: the STATIC-PROP corner box (0,100,300,250), containing nothing but a fence, a torch and the wall, changes 27.04 / 21.83 / 17.88 / 46.80 / 11.16 % between consecutive sequence frames with meanDelta up to 16.54 — the background itself is translating, i.e. real camera shake, corroborated by screenshake 3 / hitstop 19 / hit 54 in the tape. Whole-frame change 8.61-25.07%. Danger px 21111 -> 24035 -> 12353 -> 11562 -> 9894 -> 16235 -> 25491 -> 25227 across the quake resolve, violet peaking 21416 on the resolve flash. |

**Boss reference verdict:** the only frame in the set that would sit next to pass-the-fear.png without apology on value range, telegraph construction, boss-plate chrome and shake. Two gaps: the Stag has no creature silhouette at 50% (its antlers are light, not geometry), and the floor still accumulates nothing.

---

# THE DIRECT COMPARISON, STATED PLAINLY

**Density.** Prop COUNT is at or above the reference on all four frames (camp 16 named kinds / 26 propTypes; arena 15 + 640 grass + 70 flowers, edge-concentrated). Prop density is not the problem. FLOOR density is: the reference's every 300x200 floor box carries mortar lines, brick chips, moss patches, straw and a blood/scorch smear; the game's floors carry a smooth gradient, dither grain and scattered tuft silhouettes, and `arena.decals` is **0** on every gameplay frame I probed (combat, shop, boss, and all 16 sequence frames). The analyzer's FLAT metric (1.25-1.93% vs the reference's 16.68%) flatters the game because per-pixel dither defeats the 8x8 flat-block test — it is not evidence of painted content. That single deficiency is what costs check 1 on three of four frames.

**Cohesion.** Palette discipline is now *better* than the reference's: three families plus reserved accents, verified by band-isolating boxes — torches carry danger 0, mid-ground grass carries heal 0, the portal and crown carry amber 0 / danger 0. Outlines are consistent (thick navy on every rig and prop). One lighting story holds in camp and boss. It weakens in combat and shop, where HUEMIX warm runs 43-45% against the reference's 22.5%: the big pale cream ground pools become the brightest ground in the frame, so the warm-action-on-cool-ground funnel that all four references use is muted.

**Polish.** Glows, shadows and HUD framing are at the reference. Every emitter blows past 200 (hearth 54.8%, torch 53.9%, crown 13.8% of a 180x140 box). Vignette ratios match the reference's on camp, shop and boss. Contact shadows are on every entity, and the two round-1 grounding failures (the Stag, the party bloom-blob) are measurably fixed. The boss plate, location plate, currency pill, portrait/skill bar and shop card frames are cleaner and more typographically consistent than the reference's own chrome.

**Where the reference still wins, concretely:**
1. Painted floor structure + accumulating scorch/blood decals (all four frames).
2. Dozens of simultaneous multi-layer projectiles with smoke chunks and debris; the game peaks at 6 bolts and its effects are clean vector shapes with no particulate (`danger 9516` vs the reference's `89724`).
3. Enemy and boss silhouettes: the mantis is an unreadable blue wedge, and the Stag's antlers are light beams that vanish at 50% zoom.
4. Highlight tail: the camp's histogram is empty above bucket 11 while the reference populates 13; only the boss frame spans shadow-to-blowout the way the reference does.
