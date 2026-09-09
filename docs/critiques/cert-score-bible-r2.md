STATUS: COMPLETE
VERDICT: REJECT - camp 19/20 PASS, combat 14/20 FAIL, shop 19/20 PASS, boss 20/20 PASS; no zeros. Combat fails on danger-band misuse (amber telegraph), no cool ambient (cool 8.0%), and traceless projectiles/kills.

# Cert Score - ART-BIBLE ENFORCER - Round 2 (certA2 frame set)

Critic: independent art-bible enforcer, fresh context. Build under test v0.4.43.
Started: probe log below is appended as measurements are taken.

## Tools I built (read-only, certA2-bible- prefix)

- `tools/certA2-bible-crop.mjs` — crop+nearest-upscale a box so I can eyeball detail.
- `tools/certA2-bible-px.mjs` — `mean` (box mean/min/max luma + mean rgb) and `prof` (row/col luma profile).
- `tools/certA2-bible-boxdiff.mjs` — mean |luma| delta and %px >8 / >40 inside a box between two PNGs.

Nothing under `src/**`, `docs/BUILD_BRIEF.md`, `docs/REFERENCE_BAR.md` or another critique was touched.

## Reference boxes I measured first (the yardstick, docs/reference/pass-the-fear.png 1920x1080)

| Ref box | What it is | >160 | >200 | buckets | FLAT | HUES |
|---|---|---|---|---|---|---|
| 1100,400,420,260 | brick floor right of the player | 4.583% | 1.647% | 15/16 | 3.61% | danger 16059 / amber 3357 |
| 0,200,500,400 | violet void, left third | 1.334% | 0.000% | 12/16 | **24.19%** | violet 899 |
| 1360,290,130,150 | torch tower + lit lantern | 3.692% | 1.826% | 16/16 | 4.51% | amber 427 / danger 139 |
| 1290,540,240,170 | AoE telegraph (scorched core + red rim) | 4.868% | 1.189% | 14/16 | 0.48% | **danger 12804** |
| whole frame | — | 3.418% | 1.427% | 16/16 | 16.68% | danger 89724 / heal 446 / violet 13339 / amber 56031 |

---

# FRAME 1 — CAMP (`captures/certA2-camp.png`, boot frame, v0.4.43, tick 1582)

Whole frame: >160 **2.038%** / >200 **0.652%** / **16/16** buckets / FLAT **1.85%** / SAT 0.603 /
HUEMIX warm 23.5 · foliage 2.1 · cool 74.4 / HUES danger 125 · heal 1936 · violet 7744 · amber 60672.
(Reference: 3.418 / 1.427 / 16 / 16.68 / 0.582 / 22.5·1.1·76.4.) Verified by me, matches the technician.

My own box measurements:

| Box | What | Numbers |
|---|---|---|
| 950,600,420,260 | ground right of the party | FLAT **0.48%**, >160 0.077%, hist 22\|47\|25\|5\|0… , heal/violet/danger 0 |
| 430,590,340,190 | ground below the hearth | FLAT **0.00%**, >160 0.000%, hist 18\|69\|13\|0… , amber 292 |
| 620,290,180,160 | hearth fire | >160 **41.500%**, >200 **15.406%**, 14/16 buckets, amber 11827, danger 0, violet 0 |
| 580,0,260,120 | portal ring | violet **5607**, amber 0, danger 0, cool 99.2%, FLAT 0.00% |
| 500,15,95,140 / 855,25,95,140 | lantern poles | >160 2.684 / 3.406%, FLAT 0.00 / 0.00%, amber 46 / 169 |
| 60,600,240,180 | forge / anvil glow | >160 2.178%, amber 1687, FLAT 0.91% |
| 745,430,110,60 | healer base disc | heal **1276** px = 66% of the frame's whole green band |
| 0,450,1600,450 (lower half) | — | violet **0**, danger 87 |
| 1000,0,600,450 (upper right) | — | violet **0**, danger 4, >160 **0.227%**, 72% of px in the bottom 2 buckets |
| 1000,500,140,140 vs 1440,760,140,140 | vignette pair, same blue ground | mean luma **40.7 vs 20.7** (-49%); BL 40,760 = 33.6; upper-interior 1000,120 = 58.2 |
| col x=800, y440-530 | under the healer | disc rim 207/193 → **33 at y=500** vs 76/69 at x=790/810 and 99 on open ground x=620 → contact shadow ~2.2x |
| col x=1065, y215-300 | under the right tent | body 100-143 → **13-25 at y=265-285** → 73-87 at y=290-300 → strong contact shadow |
| col x=930, y250-320 | under the mid-right bench | top 77-80 → **18-22 at y=280-300** vs 34-40 at y=315-320 |
| 1370,292,50,14 vs 1300 / 1450 | under the cart wheel | **9.9 vs 10.9 / 7.6 — no shadow** |
| 1495,222,50,12 vs 1440 | under the sacks | 21.3 vs 26.9 — 5-luma dip, marginal |
| campseq_00 vs _05 | idle motion | healer box 740,330,120,160 >8 **12.01%** (max 173); fox 820,330,110,110 >8 **17.58%**; hearth 620,280,200,180 >8 7.50%; whole frame >8 2.58% |

---

# FRAME 2 — COMBAT (`captures/certA2-combat.png`, ?seed=4242, room 1, tick 721, 4 live enemies, 1 live telegraph 21 ticks from resolve)

Whole frame: >160 **3.153%** / >200 **0.632%** / **15/16** buckets / FLAT **1.59%** / SAT 0.468 /
HUEMIX warm 40.0 · foliage 52.0 · **cool 8.0%** / HUES danger **124** · heal 6316 · violet 2495 · amber 197354.

My own box measurements (main frame unless stated):

| Box | What | Numbers |
|---|---|---|
| 900,600,420,260 | ground right/below the party | FLAT **1.02%**, >160 0.085%, hist 43\|22\|18\|11\|5\|1, HUEMIX warm 28.2 · foliage 62.2 · **cool 9.6** |
| 1050,80,400,220 | ground upper right | FLAT **0.15%**, >160 2.090%, 15/16 buckets, violet 1357, heal 752 |
| 1040,185,95,115 | brazier / torch | >160 **18.307%**, >200 **7.963%**, amber 6428, FLAT 0.65% (ref torch tower: 3.692 / 1.826) |
| 1385,385,100,115 | second torch | >160 14.565%, amber 6610, FLAT 0.00% |
| 930,380,130,70 | two skill bolts | >160 **20.209%**, >200 **11.033%**, buckets 14/16 incl. the top 4, **amber 1, danger 0** — white core + white bloom, no coloured glow |
| 1300,540,175,120 | the boar | >160 **0.100%**, >200 **0.000%**, **danger 0** — no rim light, no threat accent |
| 300,830,180,70 | the live telegraph's visible arc (rest is off the bottom edge) | **danger 0**, amber 4129, >160 **0.000%** |
| z50 150,405,120,60 | the same telegraph, whole (certA2-combat-z50) | danger **172**, amber 600, >160 **0.000%**, FLAT 19.05% — density 2.4% danger vs the reference telegraph's **31.4%** (12804 px / 40800 px), and never breaks luma 160 |
| combatseq_04 1110,545,170,150 | the Ember attack-telegraph ring | **danger 0 · amber 15944**, >160 15.482%, >200 0.035% |
| combatseq_04→07 700,485,140,120 | the kill burst and what it leaves | danger **6730 → 4621 → 222 → 0**; >160 0.024 → 0.143 → 0.000 → 0.000% — **no persistent decal**, matches `vfx.arena.decals 0 / scorch 0` |
| violet band map | whole frame | 5108 px, **4947 (97%) inside x1300-1400 · y0-200** = the rune monolith only |
| heal band map | whole frame | 7862 px, **5732 (73%) inside x700-900 · y300-500** = the live heal (mint disc + "+14" + "+HP"); ~1030 px is bright lime grass at x1200-1400 |
| danger band map | whole frame | **198 px**, biggest cluster 101 px in x600-700 · y500-600 (three 8-px sparks by the party) |
| col x=985, y380-460 | under a skill bolt | 137→192→**248**→159→95→75, monotonic — **no contact shadow under any projectile** |
| col x=1400, y560-680 | under the boar | body 114-46 → **29-44 at y630-640** → 47-55 at y660-680 → contact shadow present |
| 700,150 vs 60,150 / 1450,150 / 700,760 / 60,60 | vignette | mean luma 52.9 vs 48.6 / 48.1 / 48.5 / **27.7** — only bites in the extreme corners (camp's pair was 40.7 → 20.7) |
| combatseq_00 vs _04 | motion | party box 500,400,400,300 >8 **49.50%** (>40 25.86%, max 238); whole frame >8 13.38% |

---

# FRAME 3 — SHOP (`captures/certA2-shop.png`, ?seed=4242, room 7, `runUi().screen === 'shop'`, wallet 72)

Whole frame: >160 **2.681%** / >200 **0.649%** / **16/16** buckets / FLAT **1.70%** / SAT 0.389 /
HUEMIX warm 59.8 · foliage 34.5 · cool 5.7 / HUES danger **26** · heal 689 · violet 2209 · amber 249894.

The technician shot no zoom and no sequence for this frame, so I made my own:
`captures/certA2-bible-shop-half.png` (my 50% downscale of the same PNG, for check 3) and
**my own 6-frame sequence** `captures/certA2-bible-shopseq_00..05.png`
(`tools/certA2-bible-gen.mjs` → `tools/actions/certA2-bible-shopseq.json`, `?seed=4242`,
startRun → skipToRoom 7 → poll to `screen === 'shop'`, exit 0, 0 PAGEERROR;
`[EVAL] {"ok":true,"screen":"shop","wallet":72,"cards":3,"tick":556}`, capture eval
`{"tick":663,"fps":82.6,"cards":["Bounce","Detonate","Ascend"],"emitters":17,"embers":144,"enemies":0}`).

| Box | What | Numbers |
|---|---|---|
| 345,455,910,350 | the whole shelf panel | **FLAT 0.00%** of 4859 blocks, **16/16** buckets, >160 7.255%, >200 1.934%, amber 77458 (round 1 measured this screen at FLAT **52.9%**) |
| 365 / 660 / 960,520,280,170 | the three cards | FLAT **0.00%** each; 14 / 14 / 13 buckets; >200 1.111 / 1.376 / 1.046% |
| 1025,700,150,40 | the 35-GLINT plaque | >160 **10.717%**, >200 **4.683%**, amber 4203 |
| 650,748,300,45 | "Advance to the Hollow Stag" | >160 **38.933%**, >200 **8.800%**, 15/16 buckets, amber 10894 |
| 100,290,200,150 | peddler's striped stall (new prop) | FLAT **8.00%** — the highest FLAT box I found anywhere in this build, still far under the 20% bar |
| 1050,185,95,115 | arena torch still burning behind the UI | >160 **11.314%**, >200 3.908%, amber 6422 |
| 560,240,460,220 | the four critters above the panel | >160 1.292%, **>200 0.000%**, heal 370 (healer disc), FLAT 0.65% |
| 1330,20,110,90 | rune monolith | violet **1921** |
| violet band map | whole frame | 6191 px, **bbox 1298,0-1424,126** — 100% of the frame's violet is the monolith, zero elsewhere |
| 700,150 vs 60,150 / 1450,150 / corners | vignette | 53.2 vs 46.9 / 46.2, corners **33.4 / 36.6** |
| 660,595,4,20 | RARE card border, no hover (certA2-shop) vs hover at (800,600) (my shopseq_02) | rgb(68,131,171) luma **120.4** → rgb(198,193,183) luma **193.1**; the un-hovered COMMON border at 365,595 is 34.8 in both — a real, card-local hover highlight |
| my shopseq consecutive diffs | is the screen alive? | whole frame >8 **10.93 / 3.08 / 1.71 / 1.54 / 5.29%**; party box 560,240,460,220 >8 **20.70 / 9.39 / 7.18 / 8.07 / 9.69%**; arena right 1000,150,400,350 >8 up to **13.66%**; the panel's own art is static (rail bead 700,460,220,40 meanDelta **0.00**) |

---

# FRAME 4 — BOSS (`captures/certA2-boss.png`, ?seed=4242, room 8, tick 1238, quake live 11 ticks in / 31 from landing, 3 adds off-frame)

Whole frame: >160 **2.792%** / >200 **1.287%** / **16/16** buckets (incl. bucket 15) / FLAT **1.22%** /
SAT 0.459 / HUEMIX warm 43.2 · foliage 31.8 · **cool 25.0** / HUES danger 14081 · heal 1242 · violet 17702 · amber 132033.

| Box | What | Numbers |
|---|---|---|
| 665,295,310,255 | Antler-Quake telegraph | danger **11375**, >160 **7.669%**, >200 **2.334%**, **16/16** buckets, FLAT 2.63% — brighter and wider-ranged than the **reference's own telegraph box** (4.868 / 1.189 / 14 buckets); density 14.4% danger vs the reference's 31.4% |
| 755,165,190,150 | Stag crown / antler burst | >160 **40.902%**, >200 **14.523%**, violet **3945**, amber 0, cool 99.1% — the frame's brightest emitter, and it is god-violet |
| 1300,120,130,140 | rune monolith | violet **8036**, danger 0, amber 0 |
| 1010,355,90,90 | torch | >160 **21.185%**, >200 **10.111%**, FLAT 0.00%, warm 100% |
| 530,10,540,70 | boss plate | >160 22.026%, >200 9.963%, violet **1568** (the fill bar), FLAT 11.38% |
| 1150,450,420,260 | ground right of the Stag | FLAT **0.00%**, but >160 **0.000%**, 9/16 buckets |
| 150,450,400,260 | ground left | FLAT **0.00%**, >160 **0.000%**, **5/16 buckets**, hist 32\|35\|26\|5\|1 — the murkiest region in the set (ref floor box: 15/16, >160 4.583%) |
| violet band map | whole frame | 21832 px, bbox 524,6-1472,558; **every grid cell below y600 and left of x500 is 0** — boss + antlers + boss bar + monolith only |
| danger band map | whole frame | 14369 px; ~13000 in x600-1100 · y300-600 (the quake ring); the rest is torch flame (104 px at x900-1000·y100-200, 140 px at x1400-1600·y600-700) |
| col x=835, y500-600 | under the Stag | body 67-70 → **25-46 across y520-575** → 40-66 at y580-600 — a 55-px contact shadow |
| col x=1055, y400-480 | under the torch | flame 222-239 → **17-29 at y460-480** |
| wall band 20 / 400 / 740 / 1100 / 1460 (,100,120,55) | vignette on uniform content | 18.7 / **42.2** / 37.2 / 22.7 / 21.5 → **-56% / -49%** centre-to-edge (the same probe on combat's band: 28.0 / 27.1 / 25.8 = **-8%**) |
| bossseq_00→07, box 700,560,240,120 | quake pulse under the Stag | danger 2103 → 900 → 7378 → 3402 → 8726 |
| bossseq consecutive | motion | whole-frame >8 **14.61-63.14%** (>40 2.75-15.24%); seq04 = full white hit-flash blowout on the Stag with "26" on it; seq06 = Stag mid-lunge, red rim-flash on a critter, red incoming-attack chevron on the ground at (655-710,690-720) |
| 870,405,45,35 | the one airborne VFX puff | pure white, no coloured glow, no contact shadow |

Console (my own grep over all 10 certA2 console files): **0 PAGEERROR, 0 [error]**; only the two
pre-existing shader warnings per boot.

---

# SCORECARDS

## CAMP — 19/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.85%** whole frame; ground right of the party (950,600,420,260) FLAT **0.48%**, ground below the hearth (430,590,340,190) FLAT **0.00%** — grass tufts, rock silhouettes, road hue variation and dust-grain noise everywhere. Reference is FLAT 16.68%. Exceeds. |
| 2 | Layered light | 2 | Cool indigo ambient at cool **74.4%** (ref 76.4%) plus 6+ warm pools: hearth (620,290,180,160) >160 **41.500%** / >200 **15.406%** / amber 11827; forge (60,600,240,180) amber 1687; four pole lanterns each with a ground pool; portal (580,0,260,120) violet 5607. Every emitter I boxed carries a halo. Gap vs reference: the upper-right quadrant (1000,0,600,450) sits at >160 **0.227%** with 72% of its pixels in the bottom 2 buckets — the cart and sacks there stand outside every pool, which the reference never allows. |
| 3 | Silhouette read @50% | 2 | certA2-camp-z50 top-left quadrant: rabbit by long ears (250,90), fox by ear tufts + pink disc (440,180), healer by staff + mint disc (398,205), bear by round mass + navy disc (250,190). Thick navy outline stroke on every body and every base disc (certA2-bible-camp-crit-shadow.png at 4x). |
| 4 | Prop density | 2 | 14+ distinct types visible: 2 tents, bedrolls, 4 benches, 4 lantern poles, woodpile (375-450,490-540), forge+anvil+rack (0-260,610-760), market stall (1210-1430,420-620), cart (1307-1457,190-287), sacks/crates (1490-1580,150-230), boulders, hearth ring, portal, banner poles, flowers (400-470,90-130), grass. Bar is 12. |
| 5 | VFX layering | 2 | Hearth = white-hot core (>200 15.406%) + amber halo + ember motes + stone ring; portal = violet ring + light column + rising motes (violet 5607); fireflies across the frame. 3+ layers on both emitters. |
| 6 | Colour discipline | 2 | Exactly 3 families (indigo cool 74.4 / amber warm 23.5 / portal violet). **Violet 0 px** in the lower-half, upper-left and upper-right boxes — 100% confined to the portal. Danger **125 px** (bar <500 on a no-threat frame). Leak worth naming: 1276 of the frame's 1936 heal-band pixels are the healer's *permanent* mint base disc + staff crystal at (745,430,110,60) — reserved heal green spent on idle party identity. |
| 7 | Post stack | 2 | Bloom: hearth core falls off over ~90 px at >200 15.406%. Vignette: identical blue ground at (1000,500,140,140) mean luma **40.7** vs (1440,760,140,140) **20.7** = **-49%**. Grade: warm 23.5 / cool 74.4 vs the reference's 22.5 / 76.4 — the closest palette match in the set. |
| 8 | Grounding | **1** | Present on most entities — healer (col x=800: **33 at y500** vs 76/69 flanking and 99 on open ground), right tent (**13-25 at y265-285** vs 73-87 beyond), mid-right bench (**18-22** vs 34-40), boulder (12 vs 14-20). **The cart at (1307-1457,190-287) has none** (below the wheel 9.9 vs flanks 10.9 / 7.6) and the sacks at (1490-1580,150-230) only a 5-luma dip (21.3 vs 26.9); the stall footprint (1250-1400,600-640) sits on ground at luma 7-13 where no shadow can read. The reference grounds every prop on the bridge. |
| 9 | UI polish | 2 | Command bar (495,805,620,85): drawn portraits with per-member colour rims (green/tan/pink/olive), F-key caps, HP bars, skill slots 1-2 with vector glyphs, empty slots 3-4 as dashed sockets, SPC chevron, ribbed panel with corner diamonds and bracket ornaments. Plus location plate (0,10,400,70), GLINT with coin icon, v0.4.43 at (18,880), fps. Zero browser-default text. |
| 10 | Motion (sequence) | 2 | campseq_00 vs _05: healer box (740,330,120,160) **12.01%** of px changed >8 (max 173), fox box (820,330,110,110) **17.58%**, hearth (620,280,200,180) 7.50%, whole frame 2.58%; consecutive whole-frame deltas 4.9-6.6%. Fireflies, embers, flame flicker and a real idle bob — not a still. |

## COMBAT — 14/20 **FAIL** (below the 16 bar; no zeros)

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.59%** whole; ground right/below the party (900,600,420,260) FLAT **1.02%**, upper-right (1050,80,400,220) FLAT **0.15%**. Tufts, road hue bands, rocks, fences. Gap: zero decals or scorch anywhere (vfx.arena.decals 0 / scorch 0) where the reference floor carries cracks, moss and accumulated scorch. |
| 2 | Layered light | **1** | The pools are excellent — torch (1040,185,95,115) >160 **18.307%** / >200 **7.963%** / amber 6428, second torch >160 14.565%, four in frame, each with a ground pool and halo; that half beats the reference torch box (3.692 / 1.826). The other half of the check fails outright: **there is no cool ambient**. HUEMIX cool **8.0%** vs the reference's 76.4%, and even the darkest ground box reads warm 28.2 / foliage 62.2 / cool 9.6. The warm-vs-cool attention funnel every reference screenshot is built on does not exist here. |
| 3 | Silhouette read @50% | **1** | At 50% (certA2-combat-z50 and my certA2-bible-combat-half.png) the two mantises at (25-60,290-310) and (75-105,150-170) are undifferentiated blue lumps and the boar at (655-720,275-320) reads as a blue blob; tank+swordsman+fox fuse into one grey mass at (300-390,255-350). Outline treatment is inconsistent: party critters get a thick navy stroke plus a coloured base disc, enemies only a ~2-px dark edge (col x=190: ground 125 → **54** → body 92). At 1:1 the boar and mantis do read (certA2-bible-combat-boar/mantis.png) — the failure is specifically at the bar's stated 50%. |
| 4 | Prop density | 2 | 10+ distinct types: 4 braziers, 4-5 wooden fences/barricades, 8+ rocks, 2 crates, stone plinth (620-700,60-120), rune monolith (1290-1390,40-110), ruined hut (660-720,40-110), flower cluster (1290-1350,250-300), grass, road. Concentrated at the edges; the centre third stays open. Bar is 8. |
| 5 | VFX layering | **1** | Skill bolts (930,380,130,70): >200 **11.033%** but **amber 1, danger 0** — a white pill plus a white bloom and nothing else. No trail (smearGhosts 0), no particles, no coloured glow, against the reference's white-hot core + orange glow + flame trail on every one of dozens of shots. Kills leave nothing: the kill-burst box (700,485,140,120) across combatseq_04→07 reads danger **6730 → 4621 → 222 → 0** and ends as plain grass — "kills leave persistent decals" is not met. The telegraph never breaks luma 160 (both telegraph boxes >160 **0.000%**). Damage numerals do pop ("30" at (285,725), "+14"/"+HP" at (795,335)). |
| 6 | Colour discipline | **1** | Two bands are exemplary — violet 5108 px with **97% inside x1300-1400 · y0-200** (the rune monolith), heal 7862 px with **73% on the live heal** at x700-900 · y300-500. The danger band is the failure: the enemy attack-telegraph ring measured in combatseq_04 at (1110,545,170,150) is **danger 0 · amber 15944** — the threat is painted in exactly the hue the torches (amber 6428) and the dirt road (amber 10666) already own. The only red-orange in the marker family is the small spawn disc (z50 box 150,405,120,60: danger **172** vs amber 600, >160 0.000%). Whole-frame danger is **124-198 px** with four live enemies and a telegraph 350 ms from landing; the reference's single telegraph box alone is danger **12804**. |
| 7 | Post stack | **1** | Bloom is real (bolt box >200 11.033%, buckets to 16). Vignette is the weakest measured anywhere in this build: centre (700,150,140,120) **52.9** vs mid-edges 48.6 / 48.1 / 48.5 = **-8%**, and on the uniform top band 28.0 / 27.1 / 25.8 = -8% (the boss frame's same probe: **-56%**); only the extreme corner (60,60) reaches 27.7. Grade: 15/16 buckets with the top four empty and >200 **0.632%** against the reference's 1.427%. |
| 8 | Grounding | **1** | Party discs and the boar are grounded (col x=1400: body → **29-44 at y630-640** vs 47-55 beyond). **None of the six live skill bolts casts anything**: col x=985 through a bolt runs 137→192→**248**→159→95→75, monotonic, no dark dip — and the bar says "including projectiles". |
| 9 | UI polish | 2 | Banner "WAVE 1/2 · 3 LEFT" with wave pips (660,10,290,45), location plate, GLINT, the same styled portrait/skill bar as camp, off-screen threat pointer (visible in z50 at (14,300)), version + fps. Framed and geometric, matching the reference's HUD register. |
| 10 | Motion (sequence) | 2 | combatseq_00 vs _04: party box (500,400,400,300) **49.50%** of px changed >8 (>40 25.86%, max 238); whole frame 13.38%. seq04 shows a red kill-burst at (705-830,490-600), white hit-flash heads on the tank and rabbit and a "10" numeral; seq07 shows a white blowout hit with a "30" numeral (frame >200 jumps to **1.835%**). Consecutive whole-frame deltas 7.5-32.3%. |

## SHOP — 19/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | 2 | The round-1 defect is gone: the shelf panel (345,455,910,350) is **FLAT 0.00% of 4859 blocks** with **16/16** buckets (round 1 measured this screen at FLAT 52.9% as a charcoal modal over a blurred veil). Whole frame FLAT 1.70%. The busiest box I found anywhere is the new striped stall at (100,290,200,150) at FLAT 8.00% — still under half the bar. |
| 2 | Layered light | **1** | Warm pools are there and the arena keeps burning behind the UI — torch (1050,185,95,115) >160 **11.314%** / >200 3.908%, the gold Advance button >160 **38.933%**, plaques >200 4.683%, monolith violet halo. But cool ambient is **5.7%**, the lowest of the four frames, against the reference's 76.4%; the frame is 59.8% warm with no cool anchor anywhere. Same one-clause failure as combat. |
| 3 | Silhouette read @50% | 2 | No z50 was shot for this frame, so I made my own 50% reduction (captures/certA2-bible-shop-half.png). All four read: rabbit + bow (385,130), tank + navy disc (315,175), fox + pink disc (475,175), healer + staff + mint disc (400,205); card names, rarity chips and prices stay legible at half size. |
| 4 | Prop density | 2 | Arena dressing survives behind the UI (4 braziers, fences, rocks, crates, monolith, ruined hut, grass) plus two shop-only props — the striped peddler's stall (110-290,300-430) and barrels (60-140,420-490). 9+ types. |
| 5 | Shop's own effects | 2 | Rarity-tinted borders (grey / blue / amber) with icon tiles; amber price plaques (1025,700,150,40) >160 **10.717%** / >200 **4.683%**; a glowing gold "Advance to the Hollow Stag" (650,748,300,45) >160 **38.933%** / >200 8.800% over 15/16 buckets; lit rail bead + diamond ornament + gold corner brackets; and a genuine per-card hover response — the RARE border goes rgb(68,131,171) luma **120.4** → rgb(198,193,183) luma **193.1** under the cursor while the un-hovered COMMON border stays 34.8. The live arena renders behind instead of a blur. Missing vs a full pass: no coin glitter or particle life (particles 0). |
| 6 | Colour discipline | 2 | Violet 6191 px with **bbox 1298,0-1424,126** — literally zero violet outside the monolith. Danger **26 px** (bar <500, no threat on screen). Heal 689, all the healer's disc. Three families (amber UI, green arena, arcane violet). Caveat: amber is 249894 px = **17.4% of the frame**, so the accent is spread thin rather than reserved. |
| 7 | Post stack | 2 | Bloom on the button and plaques (>200 8.800% / 4.683%); whole frame **16/16** buckets at >200 0.649%; vignette 53.2 centre → 46.2-46.9 mid-edge → **33.4 / 36.6** corners. Grade is warm-only, which is the note, not the failure. |
| 8 | Grounding | 2 | Critter discs carry shadows (col x=770 through the rabbit: disc rim 158-164 → **19-40 at y333-348**); torch bases and rock bases are dark. No projectiles on this screen. Note: the shelf panel casts nothing onto the arena above it (col x=400: 81-104 straight into the panel's own 31-border). |
| 9 | UI polish | 2 | The strongest chrome in the set: bracketed gold frame, "THE PEDDLER'S SHELF" header with a lit rail, wallet echo "72 GLINT · ROOM 7 OF 8", three rarity-framed cards with vector icon tiles and body copy, coin-glyph plaques at 25/30/35, a primary gold button, and two hint lines ("click a card to buy" / "Enter advance (one-way)"). Comparable in density and framing to the reference's weapon-card cluster. |
| 10 | Motion (my own sequence) | 2 | captures/certA2-bible-shopseq_00..05.png (my capture, exit 0): consecutive whole-frame deltas >8 = **10.93 / 3.08 / 1.71 / 1.54 / 5.29%**; the party box (560,240,460,220) **20.70 / 9.39 / 7.18 / 8.07 / 9.69%**; arena right (1000,150,400,350) up to 13.66%. The world keeps simulating under the shelf. Caveat: every moving pixel is borrowed from the arena — the panel's own art is frozen (rail bead box 700,460,220,40 meanDelta **0.00**). |

## BOSS — 20/20 PASS

| # | Check | Score | Note |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.22%** whole frame — the lowest in the set; ground right of the Stag (1150,450,420,260) and ground left (150,450,400,260) both FLAT **0.00%**. Tufts, moss blotches, road bands, rubble. Two notes: persistent decals are still near-absent (scorch 1, decals 0), and the left ground box uses only **5/16** buckets (hist 32/35/26/5/1) against the reference floor box's 15/16 — textured but unlit. |
| 2 | Layered light | 2 | cool **25.0%** ambient (best of the three run frames) plus five-plus warm pools, each with a core and a ground halo: torch (1010,355,90,90) >160 **21.185%** / >200 **10.111%** / FLAT 0.00%; the Stag's crown (755,165,190,150) >160 **40.902%** / >200 **14.523%** is the room's brightest emitter; the monolith (1300,120,130,140) violet **8036** with a halo; the quake ring throws its own red glow. Every emitter has a halo. |
| 3 | Silhouette read @50% | 2 | At 50% (certA2-boss-z50 and my certA2-bible-boss-half.png) the Stag reads by its antler-V + violet crown + surrounding red ring; the tank reads as an eared bear and the swordsman as an armed critter (certA2-bible-boss-half-scrum.png at 6x); the healer reads by mint disc + white staff. Note: the Stag's body is a smooth navy slab — the read is carried by the emissive crown rather than geometry, and the sanctioned z50 catches it mid hit-flash as a white blob. |
| 4 | Prop density | 2 | Stone wall band across the top, broken pillars (480-620,170-220 / 960-1030,165-215), plinths, barrels (1330-1380,430-470 / 1450-1500,290-330 / 60-120,660-700), 5 torches, fences, rocks, rune monolith, mushroom clusters (110-210,790-840), grass. 10+ types, ringing the edges, the centre kept open for the fight. |
| 5 | VFX layering | 2 | Antler-Quake (665,295,310,255) = scorched maroon core + red-orange rim band + radial tick spokes + outer amber ellipse + glow: danger **11375**, >160 **7.669%**, >200 **2.334%**, **16/16** buckets — brighter and wider-ranged than the reference's own telegraph box (4.868 / 1.189 / 14). Crown = white star core + two white antler beams + violet tines + violet halo. Nine numerals plus a green "+HP"; particles 48, shakes 3. Gap vs reference: a hit is a flat white body blowout with no smoke chunks or debris, and the ground keeps almost no memory (scorch 1, decals 0). |
| 6 | Colour discipline | 2 | Violet 21832 px, bbox 524,6-1472,558, **every grid cell below y600 and left of x500 is zero** — boss body, antlers, boss-bar fill and the monolith, nothing else. Danger 14369 px, ~13000 of it the quake ring, the remainder torch flame (104 px at x900-1000·y100-200, 140 px at x1400-1600·y600-700). Heal 1242 = the "+HP". Three families (violet-navy cool, amber warm, green foliage). The cleanest reserved-accent frame in the build — stricter than the reference, whose violet is a whole background hue family. |
| 7 | Post stack | 2 | Bloom: crown >200 **14.523%**; whole frame **16/16** buckets with bucket 15 populated and >200 **1.287%** — the closest of the four to the reference's 1.427%. Vignette on uniform content (the top wall band): 42.2 mid → **18.7 / 21.5** at the edges = **-56% / -49%**. Grade warm 43.2 / cool 25.0. |
| 8 | Grounding | 2 | Stag: a 55-px contact shadow (col x=835, body 67-70 → **25-46 across y520-575** → 40-66 beyond). Torch: flame 239 → **17-29 at y460-480**. Party critters on shadowed discs. The three adds are off-frame. The one ungrounded element is the white impact puff at (870-910,405-440) — a transient VFX, not an entity. |
| 9 | UI polish | 2 | The closest match to the reference's HUD anatomy anywhere in this build: ornate boss plate (530,10,540,70) >160 **22.026%** / >200 9.963% with a stag medallion, a violet fill bar (violet 1568) and "1089/1800"; location plate top-left; GLINT top-right; a "x3" off-screen threat pointer with chevron at (505-550,750-790); the styled portrait/skill bar; version + fps. |
| 10 | Motion (sequence) | 2 | bossseq consecutive whole-frame deltas >8 span **14.61-63.14%** (>40 2.75-15.24%). seq04 catches a full white hit-flash blowout on the Stag with "26" on it (frame >200 1.319%); seq06 catches the Stag mid-lunge with a red rim-flash on a critter and a red incoming-attack chevron on the ground at (655-710,690-720); the quake pulses in the ground box (700,560,240,120) at danger 2103 → 900 → 7378 → 3402 → 8726. |

---

# DIRECT COMPARISON vs docs/reference/pass-the-fear.png

**Density.** Prop counts are at or above the reference on every frame (camp 14+ types, combat 10+, shop 9+, boss 10+ against the reference's ~12 on the bridge), and FLAT is dramatically better everywhere (1.22-1.85% whole-frame vs the reference's 16.68%; the reference's own void box is FLAT 24.19%). Where the reference is denser is **event** density, not prop density: it shows ~40 simultaneous projectiles each with a trail, lingering ground fire where shots land, and accumulated scorch/blood decals. Echoes shows 6 untrailed bolts (combat) or 2 (boss), and `decals 0` on every frame with `scorch 1` at most. Nothing in this build's floors remembers that a fight happened.

**Cohesion.** Reserved-accent discipline is the build's strongest suit and in two frames it beats the reference. Violet is 100% confined to arcane objects in every single frame (camp: 0 px outside the portal box; combat: 97% on the monolith; shop: bbox 1298,0-1424,126; boss: zero in every grid cell below y600 or left of x500). Heal green is on the actual heal in combat (73%) and boss. The two cohesion failures are (a) the run frames have no cool half to the palette — cool 8.0% (combat) and 5.7% (shop) against the reference's 76.4%, so the warm-vs-cool funnel that carries the eye in all four reference screenshots does not exist; and (b) the danger band is **not** spent on the mob threat: the Ember attack telegraph is amber 15944 / danger 0, sharing its hue with the torches and the road, while the reference telegraph is danger 12804 at 31.4% density with a bright rim (>160 4.868%). Only the boss's Antler Quake gets this right, and it gets it right emphatically.

**Polish.** Glow halos: every emitter I boxed in all four frames has one, and the brightest (camp hearth >200 15.406%, boss crown >200 14.523%, boss torch >200 10.111%) exceed the reference torch tower's >200 1.826%. Contact shadows: present under critters, tents, benches, boulders, torches and the Stag (measured luma dips of 2-4x), missing under the camp cart/sacks and under **every projectile** in combat. HUD framing: the boss plate, the peddler's shelf and the portrait/skill bar match the reference's register (framed, geometric, icon-bearing) with no browser-default text anywhere. Value range is the remaining shortfall: >160 2.038 / 3.153 / 2.681 / 2.792% and >200 0.652 / 0.632 / 0.649 / 1.287% against the reference's 3.418 / 1.427 — only the boss frame gets within 10% of the reference's highlight share.

# VERDICT

| Frame | Total | Zeros | Result |
|---|---|---|---|
| camp | **19/20** | none | PASS |
| combat | **14/20** | none | **FAIL** (checks 2, 3, 5, 6, 7, 8 at 1) |
| shop | **19/20** | none | PASS |
| boss | **20/20** | none | PASS |

**Overall: REJECT on the combat frame.** Three of four frames clear the bar comfortably and the boss frame is reference-grade. The combat arena is the one that does not, and its six one-point cells are all the same three root causes:

1. **The mob threat is not painted in the reserved danger colour.** combatseq_04 (1110,545,170,150): danger **0**, amber **15944**. Give the Ember telegraph a red-orange rim with a scorched core and a rim luma above 160 (the boss's own quake ring at 665,295,310,255 — danger 11375, >160 7.669% — is the in-build template; copy it down to mob scale). Today the single most urgent object in the frame wears the same hue as the campfire.
2. **The arena has no cool half.** cool **8.0%** whole-frame; the darkest ground box (900,600,420,260) is still warm 28.2 / foliage 62.2 / cool 9.6, and the vignette measures **-8%** centre-to-edge (camp -49%, boss -56%). Push a cool ambient/shadow tint and a real vignette into the woodland arena so the torch pools have something to be warm *against*, and so the party and enemies stop competing with a fully-lit floor.
3. **Projectiles and kills leave no trace.** Six live bolts, each a white pill plus white bloom (amber 1 / danger 0 in 930,380,130,70), zero trails, and **zero contact shadows** (col x=985: 137→248→75, monotonic). The kill burst decays to danger 0 within four sequence frames and leaves plain grass behind (700,485,140,120 across combatseq_04→07: 6730 → 4621 → 222 → 0). Add a coloured glow + trail to bolts, a blob shadow under them, and a persistent splat/scorch decal on death.

Fixing those three would also lift check 3, since a cool floor plus a rim on enemies is what makes the blue mantises separate from the grass at 50%.
