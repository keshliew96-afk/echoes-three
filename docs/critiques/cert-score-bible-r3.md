STATUS: COMPLETE
verdict: PASS — camp 19/20, combat 18/20, shop 19/20, boss 18/20; no zero on any check. Four docked points: no contact shadow on enemies or projectiles (combat 8, boss 8), party pile-up kills the 50% silhouette read (combat 3, boss 3), shop cards/plaques emit nothing and there is no coin glitter (shop 5), camp outer thirds are value-dead at 3-5 of 16 luma buckets (camp 1).

# Cert score — ART-BIBLE ENFORCER — round 3 (v0.4.59)

Critic: independent, fresh context, pixels + analyzer + debug-API only. Nothing under
`src/**`, `docs/BUILD_BRIEF.md`, `docs/REFERENCE_BAR.md`, `tools/analyze.mjs`,
`tools/cert-*.mjs`, `tools/capture.mjs` or another agent's critique was touched. No commit.

Lens: colour discipline (<=3 hue families; danger red-orange only on enemy threat, heal
green only on heals, violet only on corruption/god-stuff), value range (LUMA buckets,
murk, blown-out regions), a glow halo on EVERY emitter, a contact shadow under EVERY
entity including projectiles, and the post stack (bloom / vignette / grade).

All numbers below are my own `node tools/analyze.mjs` runs — I re-ran the technician's
whole-frame numbers and they reproduce exactly. Helper tools I wrote (prefix-safe):
`tools/certA3-bible-crop.mjs` (region crop + nearest-neighbour upscale, so I can LOOK at
pixels the 1600x900 view hides) and `tools/certA3-bible-diff.mjs` (frame-to-frame luma
delta for the motion check). Crops land in `captures/certA3-bible-*.png`.

## Reference calibration (docs/reference/pass-the-fear.png — viewed first)

Whole frame: >160 3.418% / >200 1.427% / 16/16 buckets / FLAT 16.68% /
warm 22.5 foliage 1.1 cool 76.4 / SAT 0.582 / danger 89724 heal 446 violet 13339 amber 56031.

Yardstick regions I measured on the reference and use below:

- quiet floor `--box 850,700,400,300`: >160 0.000%, buckets 7/16, hist 11|24|25|16|18|7,
  FLAT 15.35%. The reference's *quiet* floor is flat-blocked but spans six value buckets
  and is covered in painted brick, mortar lines, chips and worn earth
  (crop `captures/certA3-bible-REF-floor.png`).
- dark violet void `--box 60,250,420,320`: buckets 12/16, violet 302, FLAT 17.21%.
- HUD `captures/certA3-bible-REF-hud.png`: painted faceted gem + gold filigree + medallions.

---

# FRAME 1 — CAMP (`captures/certA3-camp.png`, v0.4.59, bootSeed 3104315463)

Whole frame (my run): >160 2.616% | >200 0.915% | 16/16 buckets | FLAT 1.83% |
warm 18.9 / foliage 1.3 / cool 79.8 | SAT 0.617 | danger 37 heal 1405 violet 6639 amber 32926.

| # | Check | Score | Measurement |
|---|---|---|---|
| 1 | No dead ground | 1 | FLAT 1.83% (bar <20%, ref 16.68%) and the ground is mottled with 560 grass tufts / 46 flowers / 90 rocks / a warm road band (`--box 180,455,220,60` warm 70.5% against the navy field's cool 99%), so nothing is literally flat. But the outer thirds are dead by value: `--box 1040,600,320,200` = **4/16 buckets**, hist 28\|39\|29\|4, >160 0.000%; `--box 200,650,300,120` = 5/16 buckets, 91% of px in buckets 1-2, zero props, zero decals; right edge `--box 1560,300,40,300` = 3/16 buckets. Crop `certA3-bible-camp-deadground.png` shows why — out there the only breakups are near-black tuft silhouettes with no rim light. The reference's quiet floor box spans 6 buckets with drawn brick, mortar and chips. Below the bar, not broken. |
| 2 | Layered light | 2 | Cool indigo ambient (cool 79.8%) + 6 or more warm pools. Hearth core `--box 630,300,130,110`: >160 **80.965%**, >200 **53.287%**, warm 100%, histogram reaching bucket 15, amber 1632 — white-hot core with amber falloff. Every emitter carries a halo: crop `certA3-bible-camp-portal-lanterns.png` shows both lantern poles as core + soft halo + a discrete amber ground pool; `certA3-bible-camp-forge.png` shows the forge ember with core + halo + pool; fireflies render as dot + halo (e.g. (930,565)); the healer's staff bead at (810,355) has its own teal halo. Portal `--box 600,20,220,120`: violet 3928, danger 0, amber 0. emitters 17 across 12 kinds. |
| 3 | Silhouette read @50% | 2 | `certA3-camp-z50.png` (world renders in the top-left 800x450 quadrant): all four rigs separate cleanly against the hearth pool — archer's tall ears (255,95), tank's mass (245,185), healer + glowing staff bead (395,215), swordsman + blade on the rose disc (440,180). Thick dark navy outlines on every rig (4.5x crop `certA3-bible-camp-healerfeet.png`). Caveat vs the reference: tank and healer share the same egg body-mass — the appendage and disc colour carry the ID, not the body — and props are NOT outlined (bench crop `certA3-bible-camp-benchshadow.png` is a bare grey slab) where the reference line-arts everything. |
| 4 | Prop density | 2 | campState propTypes 26 / 16 named kinds; I count ~15 distinct kinds actually in frame: 2 tents (320,180)(1060,180), bedrolls, 4 benches, woodpile (410,505), cart (1400,240), stall/hut (1300,540), forge + weapon rack (150,690), anvil, 4 lantern poles, 2 banner poles (410,830)(1170,790), 2 runestones (520,45)(890,45), portal (700,60), hearth + stone ring (690,360), rocks (1200,630). Bar for camp is >=12; the reference frame dresses its bridge with about 6 kinds. Floor stays fully navigable, roadViolations 0. |
| 5 | VFX layering | 2 | Camp's own effects are 3-layer: hearth = white core (bucket 15) + amber mid + stone ring + rising spark particles (crop `certA3-bible-camp-hearthparty.png`); portal = bright violet ground ring + violet wash + two vertical light beams + 34 gate motes; 150 fireflies + 130 embers drifting. No damage numerals or kill decals are possible on a camp frame — this is the ceiling the frame can show, and it is layered. |
| 6 | Colour discipline | 2 | Three families only: indigo night (cool 79.8%), amber fire (warm 18.9%), violet arcane (6639 px, and `--box 600,20,220,120` proves it is confined to the portal + runestones). danger = **37 px** on a no-threat frame (gate <500) — exemplary. Two nitpicks, neither fatal: reserved heal-green is used as a permanent identity disc under the healer (`--box 750,430,120,60` heal **913** px) instead of only on heals, and the swordsman's disc is a rose/pink (`--box 830,370,110,50`: warm 74.0%, amber 983, violet 45) that the analyzer files as warm but reads as a fourth accent hue by eye. |
| 7 | Post stack | 2 | Bloom: the hearth halo bleeds past the stone ring, core box >200 53.287%. Vignette (reported 0.26) measured: right edge `--box 1560,300,40,300` puts 74% of px in bucket 0 against 58% for the inner strip `--box 1480,300,40,300` — a real falloff. Grade: warm 18.9 / cool 79.8 against the reference's 22.5 / 76.4 — the same warm-vs-cool funnel. Deficit: whole-frame >200 0.915% is 64% of the reference's 1.427%, >160 2.616% is 77% of 3.418% — about a stop murkier than the bar. |
| 8 | Grounding | 2 | Contact darkening measured at the same y, prop strip vs clear ground: healer `--box 770,482,70,10` spans buckets 2-7 against `--box 640,482,70,10` at 99% bucket 7 (~40 luma delta); bench `--box 820,596,80,10` 93% bucket 1 against `--box 950,596,80,10` buckets 2-3 (~25); rocks `--box 1180,668,60,8` 56% bucket 0 against `--box 1080,668,60,8` 95% bucket 2 (~25); woodpile `--box 382,546,66,8` 81% bucket 1 against `--box 472,546,66,8` 72% bucket 3 (~30). propShadows 70. Caveat: on navy ground these read as soft darkening rather than the reference's hard drop shadow — crop `certA3-bible-camp-woodpile.png` looks ungrounded to the eye even though the strip measures 30 luma down. |
| 9 | UI polish | 2 | Crop `certA3-bible-camp-hud.png`: brass-rimmed ribbed panel with diamond studs, four portrait tiles F1-F4 in class-coloured frames each with its own HP bar, four skill slots (1 and 2 filled with glyph icons, 3 and 4 empty dashed), SPC slot. Plus the 'THE HEARTH CAMP / NIGHT · BEFORE THE ROAD' plate (12,18)-(372,62), GLINT counter (1440,18), version label v0.4.59 at (14,880) and fps at (1560,880) — the same chrome map as the reference (location plate top-left, currency top-right, version in the corner). Below the reference only in material richness: painted metal and faceted gem there, clean flat geometry here. |
| 10 | Motion juice (seq) | 2 | `certA3-bible-diff.mjs`: campseq_00 vs _01 (250 ms apart) = 5.084% of the frame changed, 0.543% strongly, meanAbsdL 1.72; party box `--box 420,300,540,220` between _00 and _03 = **17.606% changed, 2.500% strong, meanAbsdL 6.31**. Crops `certA3-bible-campA.png` / `certA3-bible-campB.png` show the swordsman's pose actually changing (blade held flat across the body, then raised upright with the torso rotated) and the healer bobbing with the staff bead resizing. Not statues. |

**CAMP TOTAL 19/20, no zero.**

---

# FRAME 2 — COMBAT (`captures/certA3-combat.png`, ?seed=4242, room 1, tick 439, live telegraph resolveTick 466)

Whole frame (my run): >160 4.350% (above the reference's 3.418%) | >200 0.798% | 16/16 buckets |
FLAT 1.83% | warm 43.0 / foliage 14.4 / cool 42.7 | SAT 0.418 | danger 9516 heal 5311 violet 2166 amber 172437.

Extra probe I ran myself to settle check 5 (kills → persistent decals), because none of the
supplied frames contains a kill site: `tools/certA3-bible-gen.mjs` →
`tools/actions/certA3-bible-decals.json` and a second hand-generated
`tools/actions/certA3-bible-decals2.json`; captures `certA3-bible-decals.png` /
`certA3-bible-decals2.png` (both exit 0, zero PAGEERROR).

| # | Check | Score | Measurement |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT 1.83% against the bar's 20% and the reference's 16.68%. Ground carries a grass field (foliage **14.4%** against the reference's 1.1%), a warm road band running (0,470)→(1300,880), 5 torch pools, rocks, stumps, fences and bushes. The darkest hole, `--box 850,600,240,160` (right of the party), is 93% in luma bucket 0 with 4/16 buckets — but the reference's own dead corner `--box 250,880,300,190` is 78% bucket 0 **and FLAT 35.02%**, so this is not below the bar. Crop `certA3-bible-cbt-darkmid.png` shows the hole still carries dither, two tufts and two motes. |
| 2 | Layered light | 2 | Cool night ground + five discrete warm torch pools. Right torch `--box 1350,380,160,150`: amber 11157, >160 9.563%, >200 3.104%, 13/16 buckets, warm 88.6% — flame core, halo and a bounded ground pool. Every emitter is haloed: single volley bolt `--box 368,696,62,46` = >160 36.781%, >200 7.504%, amber 1422, **danger 0**; the heal ring, the arcane rune `--box 1300,30,150,130` (violet 2078) and the telegraph all carry their own glow. arena emitters 18, embers 153. |
| 3 | Silhouette read @50% | 1 | `certA3-combat-z50.png`, crop `certA3-bible-cbt-z50party.png` (4x on the 50% render): the four party rigs are stacked inside one ~60x50 px pile at z50 (270,270)-(330,320); the tank's mass swallows one member entirely and the archer/swordsman overlap — at 50% you can tell *something* is there, not *who*. The healer, standing alone at z50 (400,205), reads perfectly. Worse: **no enemy is in the certification still at all** (all four are off-camera; only an off-frame pointer chip at (30,600)), so the hero frame cannot demonstrate the enemy half of this check. The sequence carries it: `certA3-combatseq_05.png` has a blue mantis at (400,545) whose insectoid silhouette reads cleanly against the cream torch pool (crop `certA3-bible-cbt-mantis.png`). Correction to my own first read: at 5x on my own `captures/certA3-bible-enemy-mantis.png` the mantis clearly DOES carry the same thick dark outline as the party rigs, so the outline language is consistent across allies, enemies and projectiles. The failure here is the party pile-up, not the enemy art. |
| 4 | Prop density | 2 | Bar is >=8 for an arena, edge-concentrated, >=60% navigable. In frame: 3 fence/barricade runs (30,265)(200,760)(1500,265), crates (1520,320)(1490,90), 5 torch braziers, rocks (1180,500)(1240,830), stumps/logs (100,430)(1520,505), bushes, a hut ruin (700,60), a violet arcane rune (1350,90), a fallen blue beast prop (1450,610, crop `certA3-bible-cbt-blueprop.png`), grass and flower clumps. arena propTypes 15, grass 640, flowers 70. The centre lane the party fights in is clear. |
| 5 | VFX layering | 2 | Bolt = dark outline + amber body + white-hot core stripe + ground glow, 4 layers at 6x (`certA3-bible-cbt-bolt.png`). Telegraph = dark red interior + bright red-orange rim + spike ring + amber landing ring with a red triangle; `--box 340,520,340,360` holds danger 9171 of the frame's 9516. Heal = green ring under the healer (heal 1203) + '+14' numeral (heal 659) + a green ground blob at (1020,410). Damage numerals do pop: `certA3-combatseq_05.png` '12'/'30' at (395,297)/(462,289), `--box 370,270,130,45` >200 17.880%. **Kills do leave persistent decals** — I proved it rather than assuming: `certA3-bible-decals.console.txt` shows `decals` 0 → 4 at +1400 ms after four deaths and 7 after seven total kills with `scorch` 0 → 1; `certA3-bible-decals2` killed three enemies at world (1.62,1.62)/(-1.92,2.37)/(0,1.27) beside the party and `decals` went 0 → 3, rendering as the gold-rimmed speckled ground discs at (720-880,505-680) and (880-1050,505-660) with glitter motes (`--box 720,500,330,180` amber 33838, >160 26.005%, crop `certA3-bible-cbt-killdecal.png`). That is the reference's "coins glitter / deaths leave decals" behaviour, in amber rather than the reference's red splat. |
| 6 | Colour discipline | 2 | Reserved bands are clean to the pixel. Danger red-orange: 9171 of 9516 danger px (96.4%) sit inside the enemy telegraph box `--box 340,520,340,360`; the player's own volley bolt measures **danger 0 / amber 1422**; on `certA3-combatseq_07.png` the pinwheel telegraph `--box 685,475,175,145` is danger 9532 / amber 169 / violet 0. Heal green: confined to the heal ring, the '+14' numeral and the heal blob — a clean 220x130 grass box `--box 1150,140,220,130` returns heal 126 px, so the green grass field does NOT bleed into the reserved heal band (it lives in the foliage bucket, 15.7%). Violet: 2078 of 2166 px (96%) inside the single arcane rune box; on seq_07 the spawn rings `--box 1080,40,240,80` are violet 1579 / danger 0 / amber 10. Families = cool night + warm torch/party + world foliage green, with violet reserved. |
| 7 | Post stack | 2 | Bloom: bolt box >200 7.504%, impact flash on seq_07 `--box 150,420,320,240` >200 40.526% with 15/16 buckets and only 2% of px in the top bucket (hot, not clipped). Vignette (run mode 0.82): left edge `--box 0,300,40,300` = 52% bucket 1 against the inner strip `--box 70,300,40,300` = 42% bucket 2; right edge `--box 1560,300,40,300` = 7/16 buckets against `--box 1490,300,40,300` = 8/16 with 29% of px in buckets 6-7. Grade present. Deficit vs the reference: warm 43.0 / cool 42.7 against 22.5 / 76.4 — because torch pools are spread across the whole floor, the reference's cool-surround-vs-warm-action attention funnel is muted here; and >200 0.798% is 56% of the reference's 1.427%. |
| 8 | Grounding | 1 | Party rigs are grounded (dark navy blob ellipse under the tank at (538-676,627-740), crop `certA3-bible-cbt-party.png`). Everything else is not. **Enemy:** the mantis in `certA3-combatseq_05.png` — the strip under its feet `--box 372,566,44,10` measures >200 **56.364%** against the torch pool 60 px to the right `--box 432,566,44,10` at >200 **51.818%**; the ground under the enemy is, if anything, *brighter* than the ground beside it, i.e. there is no contact shadow at all (crop `certA3-bible-cbt-mantis.png`). **Projectiles:** at 6x (`certA3-bible-cbt-bolt.png`) the volley capsules at (355-475,680-770) put a warm glow on the road and nothing dark — the capsule's own outline stroke is the only dark pixel. **Props:** the blue beast at (1400-1580,560-680) meets the tan ground with no shadow. The bar says "under every entity, including projectiles". |
| 9 | UI polish | 2 | Location plate 'UNEASY WOODLAND / ROOM 1 OF 8 · CLEAR THE CLEARING' (12,18)-(482,62); centred wave banner 'WAVE 1/2 ● ○ 4 LEFT' (655,15)-(945,48) with pip dots; GLINT counter (1440,18); the same brass portrait/skill bar (500,808)-(1110,886) with live per-member HP bars; an off-frame threat pointer chip at (30,600) (hud.combat().threatNodes 4); floating '+14' heal numeral. Richer than camp and structurally at the reference's level (boss/wave plate top-centre, location top-left, currency top-right, version bottom-left, fps bottom-right). |
| 10 | Motion juice (seq) | 2 | `certA3-bible-diff.mjs` on the 150 ms sequence: seq_06→_07 = **34.854% of the frame changed, 8.250% strongly, meanAbsdL 12.92**; seq_00→_01 = 17.541% / 5.367%; seq_04→_05 = 11.556% / 4.729%. Screenshake is provable, not assumed: between seq_06 and _07 a static world prop 1300 px from the action (`--box 1300,30,150,130`, the arcane rune) changes 13.564% while the DOM HUD bar (`--box 500,810,610,80`) changes **0.223%** — the world moved under a fixed HUD. Impact/hit-flash: seq_07 whole-frame jumps to >160 7.445% / >200 2.862% (both above the reference) with a 320x240 flash at >200 40.5%. Telegraph resolve is visible across f00→f01 (danger 6381 → 33). Knockback: the mantis in f05 sits inside a fresh shock ring. |

**COMBAT TOTAL 18/20, no zero.**

---

# FRAME 3 — SHOP (`captures/certA3-shop.png`, ?seed=4242, room 7, runUi().screen 'shop', wallet 72)

Whole frame (my run): >160 3.699% | >200 0.699% | 16/16 buckets | FLAT 1.93% |
warm 44.5 / foliage 6.9 / cool 48.6 | SAT 0.375 | danger 6 heal 513 violet 1731 amber 137849.

The technician supplied no `zoomPng` and no `seqPngs` for this frame, so I shot my own with
the same conditions: `tools/actions/certA3-bible-shop.json` (startRun → skipToRoom 7 → poll
until `runUi().screen === 'shop'`, which returned `{"ok":true,"tick":622,"screen":"shop","wallet":72,"cards":3}`)
→ `captures/certA3-bible-shopz50.png` (--zoom 0.5) and `captures/certA3-bible-shopseq_00..05.png`
(6 frames @ 250 ms). Both exit 0. My reproduction measures >160 3.449% / >200 0.689% /
16/16 / FLAT 1.91% — the technician's frame reproduces.

| # | Check | Score | Measurement |
|---|---|---|---|
| 1 | No dead ground | 2 | Frame FLAT 1.93%. The shop plate covers (340,455)-(1260,800) = 22% of the frame, and it is not a flat fill either: `--box 340,455,920,345` = 15/16 buckets, FLAT **0.06%** of 4945 blocks (dot-weave texture + gradient + a diagonal sheen). Visible ground: left third is a lit pool `--box 60,560,260,180` at 11/16 buckets, >160 13.795%, warm 99.4%; the upper bands are darker but alive — `--box 1180,140,280,150` 8/16 buckets, foliage 10.9% (grass tufts), FLAT 0.00%; `--box 420,120,300,150` 7/16 buckets, foliage 9.3%. Road hue band, rocks, fences and stumps all present. |
| 2 | Layered light | 2 | Four torch pools in frame ((170,220), (300,510), (1075,230), (1430,430)), the peddler stall's hanging lantern with core + amber halo + ground pool (crop `certA3-bible-shop-stall.png`, glow at (130-157,407-433)), the violet arcane rune at (1350,60) (violet 1731 frame-wide), party discs, and the panel's own lit lantern emblem `--box 782,468,48,48` = >160 30.556%, >200 5.816%, amber 2240, 100% warm against a panel fill 90 px away sitting at buckets 4-5 — a genuine emissive with falloff. arena emitters 18, embers 153, propShadows 75. |
| 3 | Silhouette read @50% | 2 | My own `captures/certA3-bible-shopz50.png`: all four rigs separate at 50% — archer's ears (388,133), tank (315,175), healer on the green disc (395,205), swordsman on the rose disc (478,175) — plus the striped stall canopy (95,175), crates, fences and four torch pools. The shop plate itself stays legible at 50%: title, three card names, rarity chips, all three prices and the button all read. |
| 4 | Prop density | 2 | In frame: peddler stall with striped canopy + counter (130,305)-(270,410), barrel (200,260), crates (100,430)(1490,90)(1520,320), 4 torch braziers, 3 fence runs (30,265)(200,760)(1500,265), rocks (1180,500)(240,430), stumps/logs, hut ruin (640,60), arcane rune (1350,60), grass 640 / flowers 70. Comfortably over the arena bar of 8, edge-concentrated, centre lane clear. |
| 5 | Shop's own effects | 1 | The arena behind is fully dressed and lit (see check 2) and the panel's lantern emblem glows, but the shop's *own* merchandising VFX are missing. Measured: the band immediately outside the LEGENDARY card frame `--box 948,555,10,95` is 94% in bucket 2 against 89% bucket 2 for the panel fill 30 px further out (`--box 925,555,10,95`) — a one-bucket lift, i.e. **no glow halo**; the RARE cyan frame is the same (`--box 648,555,10,95` 92% bucket 2). The price plaques are flat gold gradient pills — `--box 425,698,150,45` reaches >200 3.911% only on the coin glyph and the numeral, with no bleed onto the panel (crop `certA3-bible-shop-plaque.png`). **No coin glitter at all**: `state().vfx.arena.particles` = 0 on my own shop probe, and the 6-frame sequence shows no sparkle anywhere on the plate. The reference puts a glowing cyan bracket around its weapon cards and painted glowing gems on its currency counters; a currency screen with 72 GLINT and three price tags that emit nothing is below that bar. |
| 6 | Colour discipline | 2 | danger **6 px** on a no-threat page (gate <500) — the banner is correctly not drawn here, so no stray red. Violet 1731, essentially all of it in the single arcane rune. heal 513 = grass tufts + the healer's disc. Everything else is the gold/amber UI family (amber 137849) over cool night. The RARE card's cyan frame is a fourth accent, but cyan is inside the cool family and the reference itself brackets its weapon cards in cyan and prints a blue "Freeze" status, so it is reference-sanctioned rather than a violation. |
| 7 | Post stack | 2 | Vignette measured on the world, not assumed: left edge `--box 0,300,40,300` = **5/16** buckets with 47% in bucket 2 against the inner strip `--box 70,300,40,300` = **9/16** buckets with 54% in buckets 4-5; right edge `--box 1560,300,40,300` 6/16 against `--box 1490,300,40,300` 7/16. Bloom on the torch cores and the panel emblem. Grade warm 44.5 / cool 48.6. Deficit vs the reference: >200 0.699% is 49% of the reference's 1.427% — the dimmest of the four frames in highlights, because the plate covers the brightest part of the arena. |
| 8 | Grounding | 2 | Party rigs on discs with dark rims; the stall's canopy and counter darken the ground beneath (crop `certA3-bible-shop-stall.png`). The UI plate itself is grounded: the 12 px band at its top edge `--box 600,440,300,12` is 52% in bucket 1 against `--box 600,400,300,12` forty px higher at 10% bucket 1 with 24% up in bucket 8 — a real drop shadow under the plate. No projectiles or enemies exist on this page, so the check-8 failures I logged on the combat frame cannot show here. |
| 9 | UI polish | 2 | The strongest UI in the build. Plate (340,455)-(1260,800) with gold corner brackets, a hairline rule, a lit lantern emblem, 'THE PEDDLER'S SHELF' title and a '72 GLINT · ROOM 7 OF 8' pill; three cards at (360,524)/(660,524)/(960,524) each with an icon tile, a rarity-coded frame (COMMON grey, RARE cyan, LEGENDARY gold), a rarity chip, a grey meta line, a white body line and an amber 'fits your kit' note, over a dot-weave fill with a diagonal sheen (crop `certA3-bible-shop-card.png`); three gold price plaques; an amber primary button plus 'click a card to buy' / 'Enter advance (one-way)' hints; and the persistent location plate, GLINT counter, portrait bar, v0.4.59 and fps. Information design equals or beats the reference's card rail; only the painted-metal material of `certA3-bible-REF-hud.png` is richer. |
| 10 | Motion juice (seq) | 2 | My own `certA3-bible-shopseq`: whole frame 2.984% changed / 0.709% strong between adjacent 250 ms frames; the world band above the plate `--box 560,200,520,250` changes **6.525% with 2.022% strong** across 1.25 s (party idle animation + torch flicker + embers), while the plate `--box 340,455,920,345` changes 4.201% with only 0.112% strong (a soft shimmer, no hard motion). The page is alive behind a deliberately still menu — appropriate, and the party are not statues. |

**SHOP TOTAL 19/20, no zero.**

---

# FRAME 4 — BOSS (`captures/certA3-boss.png`, ?seed=4242, room 8, tick 826, Antler Quake live, resolveTick 849)

Whole frame (my run): >160 2.832% | >200 **1.198%** (84% of the reference's 1.427% — the closest of
the four) | 16/16 buckets | FLAT **1.25%** | warm 38.5 / foliage 8.2 / cool 53.3 | SAT 0.424 |
danger 21400 heal 2240 violet 14498 amber 93070.

| # | Check | Score | Measurement |
|---|---|---|---|
| 1 | No dead ground | 2 | Lowest FLAT of the four at 1.25%. Ground sampled away from the fight: `--box 60,600,300,200` = 6/16 buckets, FLAT 0.86%, foliage 21.4%, amber 15030 (road band + grass + torch spill); `--box 1150,450,300,200` = 6/16 buckets, FLAT **0.00%**, amber 1225. The arena edge is dressed the way Reference B asks: a stone wall band runs (0,90)-(1600,140), with pillars/ruins at (505,180)(985,175)(1390,600), barrels (1355,430)(1320,700), fences (30,120)(1490,420), gravestones and the violet monolith (1290-1420,140-250). Quake scorch stains the floor under the ring (arena scorch 1). |
| 2 | Layered light | 2 | The Stag is the room's brightest emitter and I measured it on equal 110x110 boxes: crown `--box 790,165,110,110` = >160 **56.901%** / >200 **17.752%**, against the best torch pool `--box 1020,375,110,110` = >160 14.405% / >200 8.702% and a second at `--box 1400,630,110,110` = >160 0.000%. The crown core `--box 800,175,90,80` is >160 76.458% / >200 25.250%, 100% cool, violet 616, FLAT 0.91% — white-hot but not clipped. Every emitter is haloed (crop `certA3-bible-boss-stag.png`): crown star-flare + violet halo + motes, two white antler beams with violet bloom, the violet monolith `--box 1270,120,180,150` (violet 5406, 98.5% cool), five torch pools, the healer's staff burst, the green heal blob. |
| 3 | Silhouette read @50% | 1 | The Stag itself is the best silhouette in the build — at 50% (`certA3-boss-z50.png`) the crown burst + antler V + tall dark body inside the red ring reads instantly at (400,120). The party and the three adds do not: at z50 they are one undifferentiated pile of small grey blobs at (350-450,190-250). At full resolution the problem is worse than a pile-up — crop `certA3-bible-boss-adds.png` (4x on (660,370)-(900,540)) shows a boar add and the party's archer as near-identical rounded grey chibi mammals with the same dark outline; the ONLY cue that one is an enemy is that the ally stands on a coloured class disc and the add does not. Ally/enemy read is carried by a UI decal, not by silhouette or palette, and it is exactly the cue that gets occluded in a melee pile. |
| 4 | Prop density | 2 | Well over the arena bar of 8, edge-concentrated: the wall band, 5 torch posts, 3 pillar/ruin clusters, 3 barrels, 2 fence runs, gravestones, the violet monolith, crates (600,140), rocks, grass and flowers. arena propTypes 15, grass 640, flowers 70, propShadows 75. The centre of the arena stays clear for the quake ring. |
| 5 | VFX layering | 2 | The best VFX frame in the set. Boss crown = white core + 4-point star flare + violet halo + 6 violet tines + drifting motes. Antlers = white-hot beam + violet bloom. Antler Quake telegraph = dark scorched interior + bright red-orange spiked rim + radial spokes + an inner amber arc, `--box 655,260,350,320` danger 14251 / amber 8164 / 16/16 buckets. Ten damage numerals in frame plus a crit '39' at `--box 1250,320,140,80` (>200 20.116%, 19% of px in bucket 14, 15/16 buckets). arena particles 52, numerals 10, scorch 1, shakes 3, hitstop 19 events. On `certA3-bossseq_04.png` the resolve flash pushes violet to 21416 with the danger ring collapsing to 9894 — a single attack reads as an event, which is exactly the reference's standard. |
| 6 | Colour discipline | 2 | The strongest colour result in the build, measured by exclusion rather than assertion. Danger red-orange, 21400 px total: `--box 0,0,650,900` (everything left of the telegraph) = **85 px**; `--box 1010,0,590,900` (everything right) = **178 px**; `--box 650,0,360,260` (above) = **105 px** — i.e. **368 px, 1.7%, outside the Antler Quake zone**; the remaining 6636 px in `--box 650,580,360,120` are the quake's own scorch wash on the ground (crop `certA3-bible-boss-foot.png`). Violet, 14498 px: boss crown/antlers `--box 690,180,290,380` 5915, monolith 5406, boss plate `--box 525,10,560,60` 1240 — god-stuff and corruption only, zero violet anywhere on the party or the floor. Heal green 2240 on the healer's disc and the mending blob. Three families (cool night, warm torch, foliage) plus the two reserved accents, held exactly. |
| 7 | Post stack | 2 | Bloom on both emissive classes (crown >200 25.250%; crit numeral >200 20.116%). Vignette measured on a single continuous material — the top stone wall band: `--box 0,80,140,70` = 86% of px in bucket 0, 2/16 buckets, and `--box 1460,80,140,70` = 57% bucket 0, 3/16, against the same wall 400 px in (`--box 400,80,140,70`) = 1% bucket 0, 52% bucket 1, 5/16. Corners are roughly two buckets (~32 luma) down on identical geometry. Grade warm 38.5 / cool 53.3. Value range is the best of the four frames: 16/16 buckets with the boss box `--box 690,180,290,380` alone spanning **16/16 buckets** in a single 290x380 entity — the reference's "deep shadow to blown-out" range, achieved. |
| 8 | Grounding | 1 | The Stag is properly grounded: the strip under its base `--box 800,548,80,12` is **98% in bucket 1 / 2 of 16 buckets**, against the same quake floor 120 px left (`--box 690,548,80,12`, 9/16 buckets spanning L32-160) and 100 px right (`--box 900,548,80,12`, 5/16) — a 20-60 luma contact shadow. Party rigs carry discs with dark rims. The three adds do not, and neither does the live skillBolt. I proved the rule on my own frame rather than inferring it: `captures/certA3-bible-enemy.png` (spawned a mantis at world (4.66,0.25) beside the swordsman) and its 5x crop `certA3-bible-enemy-mantis.png` show the mantis at (1160-1350,370-500) meeting a smooth tan road with **zero darkening of any kind** — the body's outline stroke is the only dark pixel, and the creature reads as hovering. Same result measured on `certA3-combatseq_05.png`: under the feet >200 56.364% vs the pool beside it 51.818%. "Contact shadow under every entity, including projectiles" is half-implemented: heroes yes, boss yes, enemies and projectiles no. |
| 9 | UI polish | 2 | The boss plate (crop `certA3-bible-boss-plate.png`, `--box 525,10,560,60` = >160 23.164% / >200 11.068% / 15/16 buckets / violet 1240) is a violet-outlined pill with corner diamond studs, a circular medallion carrying a white stag-skull glyph in a 4-node violet ring, wide-tracked display type, arrow-capped violet HP bar, a white position marker and '1106/1800' — plus **two diamond phase markers at the 1/3 and 2/3 thresholds**, which is one better than the reference's plain bar. Add-count chip 'x3' at (515,770), off-screen threat pointers, the location plate, GLINT, the portrait/skill bar with a live cooldown readout ('0.9' in slot 1 on `certA3-bossseq_04.png`), v0.4.59 and fps. Matches the reference's boss-fight chrome map item for item. |
| 10 | Motion juice (seq) | 2 | `certA3-bible-diff.mjs` across the resolve: bossseq_03→_04 = 14.390% changed / 3.893% strong; bossseq_04→_05 = **36.283% changed / 7.847% strong / meanAbsdL 12.91**. Screenshake proven the same way as on combat: between _04 and _05 the static violet monolith 1300 px from the boss (`--box 1270,120,180,150`) changes **46.607% with 10.148% strong**, while the DOM HUD bar (`--box 500,810,610,80`) changes **0.914%** — the world lurches under a fixed HUD (arena shakes 3, 19 hitstop events, 3 screenshake events). The telegraph cycle is legible frame to frame (danger 21111→24035→12353→11562→9894 as the quake charges and resolves, violet peaking 21416 on the resolve flash), and the Stag is caught mid-lunge on _04, not standing still. |

**BOSS TOTAL 18/20, no zero.**

---

# Direct comparison against `docs/reference/pass-the-fear.png`

**Visual density — at the bar, and above it on props.** The reference dresses its bridge with
roughly six prop kinds (torch towers, banners, chains, spike barricades, brick, gravestone
silhouettes). Camp fields ~15 kinds in frame, the arena 8-12 plus 640 grass and 70 flowers,
the boss arena adds a walled edge with pillars, barrels and a monolith. Where the reference
still wins is *surface* density: its floor is hand-painted brick with mortar, cracks, moss and
scorch (crop `certA3-bible-REF-floor.png`), spanning six luma buckets even in the quiet corner
`--box 850,700,400,300`. Echoes' quiet ground is a smooth mottled gradient — the camp boxes
`--box 1040,600,320,200` (4/16 buckets) and `--box 200,650,300,120` (5/16) carry tufts and hue
noise but no drawn surface. FLAT is not the problem (1.25-1.93% against the reference's 16.68%);
value compression in the unlit thirds is.

**Cohesion — above the bar.** This is where Echoes beats the reference outright. The reserved
bands are held to the pixel: 96.4% of danger red-orange inside the telegraph on the combat
frame, 98.3% on the boss frame, danger 37 px in camp and 6 px on the shop page (gate <500);
violet exclusively on portal, runestones, the Stag's crown/antlers, the monolith and the boss
plate; heal green exclusively on heal rings, heal numerals and heal blobs, with the grass field
proven not to bleed into the band (`--box 1150,140,220,130` heal 126 px). The player's own
projectile measures danger 0 / amber 1422 — an easy place to cheat, not cheated. One lighting
story per scene, one outline language across allies, enemies and projectiles (props excepted).
The only smudges are reserved heal-green doubling as the healer's permanent class disc and a
rose/pink fourth accent on the swordsman's.

**Polish — mixed.** Glow halos: every emitter I boxed has core + halo + falloff, and the Stag
is measurably the room's brightest thing (>160 56.9% vs the best torch's 14.4% on equal boxes).
Post stack: bloom, a vignette I measured on identical geometry in three frames, and the
reference's warm/cool grade. HUD: structurally item-for-item with the reference and in one
place better (phase markers on the boss bar), materially flatter — the reference's painted gem
and gold filigree (`certA3-bible-REF-hud.png`) against clean vector geometry. Highlights still
trail: >200 0.699-1.198% against the reference's 1.427% on three of four frames.
**Grounding is the one place Echoes is plainly below the bar**: the reference's chibi knight
carries a drop shadow, and here enemies and projectiles carry none at all — measured twice, on
two different frames, with a 5x crop.

---

# Totals and verdict

| Frame | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| camp | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **19/20** |
| combat | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | **18/20** |
| shop | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | **19/20** |
| boss | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | **18/20** |

All four frames clear the >=16/20 bar with no zero. **PASS.**

## The four things that cost points, ranked, with the fix each needs

1. **No contact shadow under enemies or projectiles** (combat 8, boss 8). Proven twice:
   `certA3-combatseq_05.png` mantis, strip under the feet `--box 372,566,44,10` >200 56.364%
   against the pool 60 px right `--box 432,566,44,10` >200 51.818%; and my own
   `captures/certA3-bible-enemy-mantis.png` at 5x, where the mantis at (1160-1350,370-500)
   meets a smooth tan road with zero darkening. Volley capsules the same
   (`certA3-bible-cbt-bolt.png`). Heroes, props and the Stag are all grounded, so the blob-shadow
   system exists — it just is not attached to enemies or bolts.
2. **The party pile-up destroys the 50% silhouette read** (combat 3, boss 3). Four rigs stack
   into one ~60x50 px mass at 50% (`certA3-bible-cbt-z50party.png`), and on the boss frame a boar
   add and the party's archer are near-identical grey chibi mammals whose only distinguishing
   cue is the ally's class disc (`certA3-bible-boss-adds.png`) — a cue that is occluded in exactly
   the melee pile where it matters. Enemies need a silhouette or palette tell of their own.
3. **The shop's merchandising does not emit** (shop 5). Measured: the band outside the LEGENDARY
   frame `--box 948,555,10,95` is 94% bucket 2 against 89% bucket 2 thirty px out — a one-bucket
   lift, no glow; the RARE cyan frame the same; price plaques are flat gradient pills with no
   bleed; `vfx.arena.particles` 0, so no coin glitter anywhere on a currency screen showing
   72 GLINT and three price tags. The reference glows its card brackets and currency gems.
4. **Camp's outer thirds are value-dead** (camp 1). `--box 1040,600,320,200` 4/16 buckets,
   `--box 200,650,300,120` 5/16 with zero props, right edge 3/16 — no decals and no drawn surface,
   against the reference's quiet floor at 6 buckets of painted brick. Needs either a lift in the
   ambient floor or ground detail that survives being unlit.

Two smaller colour notes for the builder, neither scored as a failure: reserved heal-green is
also the healer's permanent class disc (camp `--box 750,430,120,60` heal 913 px), and the
swordsman's rose/pink disc is a fourth accent hue the bible does not list.

## Process notes

- Frames judged: the four supplied stills, the three supplied 50% frames, all 22 supplied
  sequence frames, plus five captures of my own (`certA3-bible-decals`, `certA3-bible-decals2`,
  `certA3-bible-shopz50`, `certA3-bible-shopseq_00..05`, `certA3-bible-enemy`) — the shop had no
  zoom or sequence frames supplied, and the decal and enemy-grounding questions could not be
  settled from the supplied set. All exit 0, zero PAGEERROR.
- Files I created, all prefix-safe: `tools/certA3-bible-crop.mjs`, `tools/certA3-bible-diff.mjs`,
  `tools/certA3-bible-gen.mjs`, `tools/actions/certA3-bible-{decals,decals2,shop,enemy}.json`,
  `captures/certA3-bible-*`. Nothing under `src/**`, no doc I was told not to touch, no commit.
- One correction against my own earlier read, kept in the record: at low zoom I judged the mantis
  to have no dark outline; at 5x it plainly does. The outline language is consistent across
  allies, enemies and projectiles — props are the exception.
