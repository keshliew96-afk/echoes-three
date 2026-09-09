STATUS: COMPLETE
VERDICT: PASS on all four frames — camp 20/20, combat 18/20, shop 19/20, boss 19/20, no zeros. v0.4.59 reads as a finished commercial indie frame, not a tech demo. Three real deductions: the delivered combat + boss stills frame ZERO enemies on camera (check 3), combat kills leave no persistent decal and projectiles carry no particle trail (check 5), and the room named after the Peddler contains no peddler (check 4, shop).

# Cert Score — PLAYER'S-EYE lens — round 3 (v0.4.59)

Critic: fresh context, harsh, pixels/probes only. Lens: silhouette read at 50 %, HUD polish,
motion juice across sequences, and the blunt finished-game-vs-tech-demo question.

My own tools (nothing under `src/**`, `docs/BUILD_BRIEF.md`, `docs/REFERENCE_BAR.md`,
`tools/cert-*.mjs`, `tools/capture.mjs`, `tools/analyze.mjs` or another critic's file was touched):

- `tools/certA3-player-crop.mjs` — sharp crop + nearest resample (also used at scale 0.5 to build a
  **true** 50 % downscale, which is a fairer silhouette test than `--zoom 0.5`; see the technician's
  note that `--zoom` only sets `document.body.style.zoom` and leaves 75 % of the PNG empty).
- `tools/certA3-player-diff.mjs` — pixel diff, changed-px %, max/mean delta, 8x6 change map.
- `tools/certA3-player-gen.mjs` — action generator (JSON.stringify, IIFE-wrapped evals, 8 ms async polls).

My own captures (all `certA3-player-` prefixed, all exit 0, zero PAGEERROR):
`certA3-player-combat2` (combat with enemies framed), `certA3-player-combat2seq` (8 @130 ms),
`certA3-player-shop` (shop + card hover), `certA3-player-shopseq` (6 @200 ms),
`certA3-player-roster` (boar + mantis side by side), `certA3-player-decal` (post-kill decal probe).
All at `?seed=4242` per the technician's conditions.

---

## Reference baseline — my own reads of docs/reference/pass-the-fear.png

| Probe | Reference | Note |
|---|---|---|
| Full frame | >160 3.418 %, >200 1.427 %, 16/16, FLAT **16.68 %**, danger 89724, violet 13339 | |
| Floor box (950,560,500,300) | 15/16 buckets, FLAT 14.56 % | hand-painted brick |
| SE floor box (1500,750,250,180) | 16/16 buckets, >160 3.300 %, >200 1.704 %, FLAT 7.62 % | |
| Dark void box (80,300,300,200) | 12/16, FLAT **11.68 %**, **>160 2.687 %** | the ref's dark third is FLATTER than any Echoes region I measured, but it carries bright swirl strokes |
| Player crop (850,450,220,180 @5x) → `certA3-player-REF-knight5x.png` | chibi knight ~44x36 native px | a helmet blob; separation comes from a thick dark outline + a warm amber ground halo, **not** from body form. This is the fair bar for Echoes' 50 % test. |
| Player body (920,510,40,40) vs ground (1000,520,40,40) | body buckets 10–12, ground buckets 3–5 | **6–7 bucket figure/ground separation** |
| Numerals (1120,130,220,90 @6x) → `certA3-player-REFnum6x.png` | pale-cyan, stroked, dense overlapping cluster at mixed sizes/alphas | |
| HUD | ornate boss plate + icon; hex HP gem bottom-left; cyan-bracket weapon cards + ammo bottom-right; currency top-right; plain black location plate top-left. **No cooldown radials anywhere.** | |

---

## FRAME 1 — CAMP · `captures/certA3-camp.png` (z50 `certA3-camp-z50.png`, 6 seq) — **20/20 PASS**

| # | Check | Score | Evidence (verified, not quoted from the technician) |
|---|---|---|---|
| 1 | No dead ground | 2 | Whole frame FLAT **1.83 %** vs ref 16.68 %. Every ground box I sampled has **zero** flat 8x8 blocks: (1000,600,320,200) FLAT 0.00 %, (150,300,300,180) FLAT 0.00 %, (1350,650,250,180) FLAT 0.00 %. Roads with hue variation cross the frame diagonally; 560 grass + 46 flowers. The only flat surface in the frame is a **prop**, not floor — see the advisory below. |
| 2 | Layered light | 2 | 17 emitters / 12 named kinds, each with a halo: hearth pool (690,350), forge pool (155,680), lantern-pole halos (540,60) and (890,70), violet portal ring (700,10)–(830,110). Cool indigo ambient. HUEMIX warm 18.9 / cool 79.8 vs ref 22.5 / 76.4 — same warm-vs-cool funnel. |
| 3 | Silhouette read @50 % | 2 | `certA3-player-camp-z50-party6x.png` (z50 crop 215,70,260,180 @6x): archer = long ears + a tan **bow arc**; swordsman = pointed dark-tipped fox ears + a pale **blade**; healer = green robe + a **cyan glowing staff tip**; tank = the one bulky rounded mass. All four nameable. Separation is by class seat-ring (a hard dark ellipse + coloured rim) — the check permits "dark outline **or** strong rim separation". **Ref gap, measured:** tank body (470,360,40,40) sits in buckets 10–11 while the lit road beside it (560,400,40,40) sits in bucket 9 = **1–2 buckets of figure/ground separation, vs the reference's 6–7**. Echoes leans on the ring; the reference leans on value. |
| 4 | Prop density | 2 | 16 named kinds (`campState.campPropTypes`), visually confirmed: 2 tents (330,180)(1060,180), 3 benches (430,250)(930,270)(830,550), woodpile (400,510), cart (1380,230), stall+banner (1300,520), forge/anvil (150,690), 4 lantern poles, portal, tripod, bedroll, sack, rocks. ≥12 met. Reference A also dresses its camp with seated characters at the fire — Echoes matches that (4 critters seated at the hearth). |
| 5 | VFX layering (ambient — camp has no attacks) | 2 | Hearth = white-hot core (690,345) + amber pool + stone ring + rising ember sparks + 130 embers + 150 fireflies. Portal = violet torus + upward beam streaks (700,10)–(760,60) + inner glow. ≥3 layers on both. |
| 6 | Colour discipline | 2 | Exactly 3 families. HUES danger **37 px** (no false red anywhere — the <500 no-threat band passes 13x over), heal 1405 (healer seat ring only), violet 6639 (portal only), amber 32926. |
| 7 | Post stack | 2 | Vignette 0.26 visible at all four corners; bloom bleeding off the hearth core and the portal ring; exposure 1.24 with a warm/cool grade. 16/16 buckets. |
| 8 | Grounding | 2 | Every critter on a rimmed lit disc; propShadows 70; soft contact shadows visible under the bench (830,555), tents and cart. |
| 9 | UI polish (camp chrome + version label) | 2 | `certA3-player-camp-hud4x.png`: bracketed portrait bar with diamond dividers, F1–F4 key badges, **real rendered portraits** (each critter's head/torso in class colour), class-tinted HP strips, selection rims, skill slots 1–2 with **vector glyphs**, slots 3–4 dashed-empty with placeholder circles, SPC chevron, subtle ribbed plate texture. `certA3-player-camp-plate3x.png`: location plate with a lantern glyph, condensed bold title + letter-spaced grey subtitle — **cleaner chrome than the reference's plain black "Gate Bridge" box**. `v0.4.59` bottom-left, `164 fps` bottom-right. Zero browser-default text. |
| 10 | Motion juice (ambient/idle) | 2 | Measured, not assumed. Tank box (434,335,119,80): **14.82 %** of pixels changed f00→f03, **16.37 %** f00→f05, maxDelta 163–196. Healer box (750,370,99,79): **26.65 %** f00→f03. Whole frame f00→f02 **3.30 %** changed, concentrated in the top band (portal/lanterns/tents) and the hearth cell (20.6 % of that cell). These are animated critters and animated emitters, not statues. |

**Camp advisories (do not change the scores, but they are the frame's real weaknesses):**

- **The market stall canopy is the flattest surface in the build.** `certA3-player-camp-rack3x.png`, box (1245,438,150,110): **FLAT 50.43 %** of its 8x8 blocks, SAT 0.274, 9/16 buckets — a 150x110 px pale-grey slab with four darker rectangles and **no light on it at all**. Reference A specifies "market stall with cloth canopy" and "weapon racks with **GLOWING item displays**"; this prop has neither stripes nor a glowing display, and no emitter within 300 px. Compare the shop room's peddler stall (`certA3-player-shop-stall4x.png`), which *does* have a green-and-white striped canopy and a lamp — the camp got the plainer asset.
- **The SE quadrant is tonally dead.** Box (1350,650,250,180): **3/16 buckets, 99 % of pixels in the two darkest buckets, 0.000 % >160.** It is not flat (FLAT 0.00 %) — it is unlit. The reference's own dark third (80,300,300,200) is 12/16 buckets with **2.687 % >160** because it carries bright swirl strokes inside the dark. Echoes' dark corners have no bright accent at all.

---

## FRAME 2 — COMBAT · `captures/certA3-combat.png` (z50, 8 seq) — **18/20 PASS**

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.83 %**. Boxes: (900,600,400,220) FLAT 0.00 %, (700,150,300,150) FLAT 0.15 %, (1050,650,300,200) FLAT **0.43 %** vs the reference's dark void at FLAT 11.68 %. grass 640 + flowers 70, a warm road with hue variation crossing the frame, live decal rings. |
| 2 | Layered light | 2 | 18 emitters. Torch/brazier pools with flame sprites at (300,540), (150,620), (1080,230), (1440,440); violet rune glow (1300,40)–(1400,110). Cool indigo field vs warm road — HUEMIX warm 43.0 / cool 42.7. Every emitter carries a ground pool and a halo. |
| 3 | Silhouette read | **1** | **The delivered hero frame contains zero enemies.** `hud.combat().threatNodes` = 4 and all four are off-camera (boar 7.04,2.62; mantis −7.83,2.20; −7.93,−1.82; −3.57,5.12); the only antagonist cue on screen is one off-frame pointer chip at (30,600). The check's enemy clause is untestable on this frame. The party clause is also degraded: `certA3-player-combat-party4x.png` (box 330,490,420,400 @4x) shows a **3-deep overlap** inside (520,520)–(680,700) where the archer's torso is occluded by the tank and the green-hooded figure at (580,572)–(612,610) cannot be assigned to a class. **This is a camera/framing failure of the still, not an art failure** — my own same-seed recapture `certA3-player-combat2.png` proves the art reads: `certA3-player-combat2-classes4x.png` shows archer (long ears + bow + a 3-fletch quiver at (732,295)), swordsman (fox ears + raised white blade at (852,268)), healer (green robe + white-hot staff crystal at (800,375)), tank (bulk + navy ring), and `certA3-player-mantis6x.png` shows the mantis as a steel-blue insect with a pale carapace, two violet eye dots and two pale scythe forelimbs. It survives a **true** 50 % downscale (`certA3-player-combat2-half6x.png`): party-vs-enemy is unambiguous and 3 of 4 classes stay nameable. Scored 1 on the frame that was delivered. |
| 4 | Prop density | 2 | propTypes 15 ≥ 8. Broken fences (60,270)(200,780)(1490,270), crate (1530,320), stumps/rocks (110,455)(1520,520), tarps (140,290)(1500,620), torch posts, grass 640 + flowers 70. All at the edges; the centre lane is open — well over 60 % of the floor is navigable. |
| 5 | VFX layering | **1** | *Bolts* (`certA3-player-bolt8x.png`, box 360,690,200,110 @8x): amber body + white-hot core streak + ~2 px near-black outline + soft ground glow + a red-orange trail wash = 4 layers, **but zero discrete particles/sparks** — the reference's fireballs each carry individual flame licks and ember chunks. *Telegraph* (560,590)–(680,700): hot rim + spokes + spiked edge, but the interior is only lightly washed — the reference's AoE at (1300,560)–(1520,700) has a genuinely **dark scorched core** inside the hot rim. *Numerals*: **absent on the delivered still** (`vfx.arena.numerals` 0); present in the sequence — `certA3-combatseq_05.png` "12" (395,297) and "30" (462,289); my `certA3-player-combat2seq_05.png` has "12" (1080,400), "26" (1195,410) and a fading "12" (460,690) at ~35 % alpha. *Persistent kill decals — measured and absent*: `certA3-player-decal.png` probe — boar id8 died at t586 at world (2.42,−3.1); **94 ticks (1.57 s) later `scorch` = 0** and the death site (`certA3-player-deathsite5x.png`, box 900,100,280,190 @5x) carries only an amber aim/landing ring — no blood splat, no scorch, no corpse. Reference C: "enemy deaths leave red splat decals that persist." |
| 6 | Colour discipline | 2 | danger 9516 px, all of it on the live telegraph (resolveTick 466 vs tick 439). heal 5311 on the healer's ring + "+14" + heal blob (1020,410). violet 2166 on the rune + enemy dorsal crests (a corruption read, consistent). amber 172437 on torches/road/bolts. One measured leak: a no-heal grass box (700,150,300,150) puts **112 px** in the reserved heal band — small (0.25 % of that box) but real. |
| 7 | Post stack | 2 | Vignette at all four corners, bloom on torch cores and white bolt cores, warm road vs cool field grade. 16/16 buckets, >160 4.350 % (above ref 3.418 %). >200 0.798 % is **56 % of the reference's 1.427 %** highlight share — the one metric where this frame trails. |
| 8 | Grounding | 2 | Party on class discs. Enemy contact shadow measured on lit ground: under the right boar (866,232,48,14) buckets 1–4, 0 % >160; beside it (936,232,48,14) 11/16 buckets, 13.10 % >160 — a real cast shadow. On unlit ground the shadow is invisible because the ground is already darker (left boar under (572,228,44,12) vs beside (520,228,44,12) 100 % bucket 1) — physics, not a defect. propShadows 75. **Check-text miss:** projectiles cast no shadow (`certA3-player-bolt8x.png`, three bolts over the lit tan road, ground unmodified) — but the reference frame shows no discrete projectile shadow either, so this is not below the reference and does not cost the point. |
| 9 | UI polish | 2 | Location plate (12,14,470,58) with lantern glyph + two-tier type; wave banner (655,14,290,40) "WAVE 1/2 ● ○ 4 LEFT" with **filled/empty wave pips**; GLINT pill top-right; portrait bar as camp; **working cooldown radials** — `certA3-player-slots8x.png` (box 765,808,250,70 @8x) shows slot 1 with a white arc sweeping ~12→4 o'clock and slot 2 with a shorter ~12→2 o'clock arc over dimmed icons, i.e. two different remaining cooldowns; off-frame threat chip with arrow at (30,600). **The reference has no cooldown radial anywhere** — Echoes exceeds it here. Zero browser-default text in any frame. |
| 10 | Motion juice | 2 | The whole impact chain lands on **one tick**: `certA3-player-combat2seq.console.txt` t756 — `hit {amount 20, kb 0.72, dirX −0.34, dirZ 0.94}` + `hitstop` + `death` + `screenshake` simultaneously. Screenshake proven **in pixels**: a far-corner static box (1400,240,190,140) changes 0.83 / 1.09 / 0.93 → **14.18 → 14.44** → 0.83 % across consecutive frames — an impulse-and-settle, not a camera-follow drift. Impact reads as an event: `certA3-player-combat2seq_05.png` has a white-hot burst with radiating streaks at (1030,505)–(1180,560). Numerals stack with staged alpha. Anim states are live (`healerAnim 'cast'`, allies 'cast'/'walk'). Per-frame danger px across the supplied seq 6381 → 33 → 1260 → 87 → 11821 → 13875 → 10250 → 9648 = telegraphs firing and resolving. |

---

## FRAME 3 — SHOP · `captures/certA3-shop.png` (+ my `certA3-player-shop.png` / `-shopseq`) — **19/20 PASS**

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.93 %**. The panel does **not** veil the world: arena box (60,120,300,200) FLAT 0.86 %, 8/16 buckets, road + grass + torch pools all readable behind a translucent panel. |
| 2 | Layered light | 2 | Torch pools at (300,600), (1080,230), (1440,440), (1500,660) + the stall lamp at (142,400); the panel's own lantern glyph glow at (810,485). Plaques carry a real gold glow — computed `box-shadow: rgba(217,184,114,0.333) 0 0 20px`. The hovered card gains a cyan rim. |
| 3 | Silhouette read @50 % | 2 | `certA3-player-shop-half6x.png` (true 50 % downscale, crop 290,110,220,130 @6x): all four nameable — tank with a grey **shield slab** on its back + navy ring, archer with long ears + bow + olive ring, healer with green robe + a **cyan staff orb** + mint ring, swordsman with fox ears + blade + pink ring. Best silhouette frame in the set. |
| 4 | Prop density | **1** | The count bar is met (propTypes 15 ≥ 8; striped peddler stall (150,290)–(280,400), barrel, crate, fences (30,250)(1440,280)(140,760), torch posts, rocks, grass 640). **But the room named "THE PEDDLER'S CLEARING · THE PEDDLER" contains no peddler.** `entityCount` = 4 and `state().party` = 4 — the only entities in the room are the player's own party; `certA3-player-shop-stall4x.png` (box 60,240,320,240 @4x) shows the canopy, counter, barrel and lamp with **nobody behind it**. Reference A dresses its camp/market with characters (seated figures at the campfire, staffed stalls); an unstaffed shop reads as a vending machine, and it is the single strongest "tech demo" tell in the whole set. Present but clearly below the reference. |
| 5 | VFX layering (shop's own effects) | 2 | Measured across `certA3-player-shopseq`: the **LEGENDARY** card box (960,524,280,167) changes **51.60 %** f00→f03 (meanDelta 12.41, maxDelta 40) = an animated shimmer sweep; the **COMMON** card box (360,524,280,167) changes **0.000 %** = deliberate rarity tiering; the glint plaque (1027,698,147,44) changes **7.70 %** with maxDelta 166 = discrete sparkle glints — Reference C's "coins glitter", delivered. Card hover is a real state: `rn-hover` lifts the card **8 px** (box y 524→516) and deepens its shadow from `0px 1` to `0px 20`. Arena behind is alive (whole frame **4.735 %** changed over 600 ms). |
| 6 | Colour discipline | 2 | HUES danger **6 px** — the combat banner is correctly gated off this page even though `hud.banner().text` still holds the stale "WAVE 1/2" string. heal 513, violet 1731, amber 137849. Rarity coding is a coherent 3-step (COMMON grey-white / RARE cyan / LEGENDARY amber); cyan is a UI rarity code, not a world hue, so the 3-family world palette is intact. |
| 7 | Post stack | 2 | Vignette, bloom on torches, grade all present; 16/16 buckets, >160 3.699 % (above ref 3.418 %). >200 0.699 % is **49 % of the reference's** highlight share — this frame has no blown-out emissive, which is the honest reference gap. |
| 8 | Grounding | 2 | All four party on class discs with dark inner rims; propShadows 75; the stall, crate and barrel all carry soft contact shadows on the lit ground. |
| 9 | UI polish | 2 | Corner-bracket gold frame at (345,462)/(1255,462)/(345,795)/(1255,795); title "THE PEDDLER'S SHELF" with lantern glyph; framed "◎ 72 GLINT · ROOM 7 OF 8" readout; three cards each with an icon tile, a rarity pill, a meta line, body copy and an amber "fits your kit" tag; three gold coin plaques; amber CTA + "Enter advance (one-way)" key hint; a translucent panel that lets the world through. Exactly one page visible (`rn-page rn-shop`). This is at or above the reference's card cluster. |
| 10 | Motion juice (via my own `certA3-player-shopseq`, none was supplied) | 2 | 4.735 % of the frame changes over 600 ms, with the change map concentrated on the torch cells (13.6 %, 17.7 %) and the legendary card cell (24.3 %). A menu that breathes. |

---

## FRAME 4 — BOSS · `captures/certA3-boss.png` (z50, 8 seq) — **19/20 PASS**

| # | Check | Score | Evidence |
|---|---|---|---|
| 1 | No dead ground | 2 | FLAT **1.25 %** — the best of the four. Box (100,650,300,200) FLAT 0.65 %, 7/16 buckets. Sand pools, warm road, grass 640 + flowers 70, `scorch` 1. |
| 2 | Layered light | 2 | Braziers at (330,140), (990,150), (1070,410), (1550,190), (1490,660); a bright violet runestone at (1330,150)–(1420,240); and the Stag itself is the room's brightest emitter — white-hot crown burst at (838,205). Cool indigo ambient. Every emitter haloed. |
| 3 | Silhouette read @50 % | **1** | The Stag passes: `certA3-player-bossz50-6x.png` reads as an antlered mass with a white crown and violet tines at 50 %. Two failures on the same frame. (a) **All three adds are off-camera** — the only cue is a "×3" pointer chip at (515,770) plus two more pointers at (742,772) and (630,790) in the seq (`certA3-player-boss-adds4x.png`); the frame's enemy roster cannot be read at all. (b) **The party is back-lit to near-black**: `certA3-player-boss4x.png` (box 660,270,340,290 @4x) shows three critters at (700,440)–(920,510) as charcoal blobs with no class cue except the seat-ring colours, and at 50 % they are unresolvable. In the game's climactic frame you cannot see your own party — the reference always keeps its player lit and haloed. |
| 4 | Prop density | 2 | Stone parapet along the top edge; gravestones/tablets (600,190)(985,205)(1390,600); 5 braziers; barrels (1350,435)(1310,800); crates (600,150); broken fences (60,600)(1445,540); violet runestone; rocks; grass 640. propTypes 15 ≥ 8, ringed at the edges, centre kept open. |
| 5 | VFX layering | 2 | The Antler Quake is the strongest VFX in the build: bright red-orange rim + radial spokes + spiked outer edge + a darkened interior + a warm ground wash (`certA3-player-boss4x.png`, native (690,300)–(960,540)) — this **is** the reference's "dark scorched core + glowing red rim". The Stag's crown = white-hot core + violet halo + beam tines + spike shards + rising motes. Impact burst with amber ember motes at (680,637)–(785,760) in `certA3-bossseq_06`. Numerals cluster properly: 10 live plus a crit "39" at (1325,367) rendered at ~3x glyph size, all **dark-outlined** (verified at 4x — my earlier read of a plain drop-shadow was wrong; the stroke is there), with staged alpha fade. `scorch` = 1 → persistent decals do exist here. |
| 6 | Colour discipline | 2 | danger 21400 on the live quake ring; violet 14498 on the crown/antlers/runestone (**the reference itself measures violet 13339** — same order); heal 2240 on the healer aura/blob; amber 93070. Reserved bands used exactly as the bible specifies. |
| 7 | Post stack | 2 | The closest frame to the reference's value range: >160 **2.832 %** / >200 **1.198 %** vs ref 3.418 / 1.427; 16/16 buckets and the only Echoes frame with a populated bucket 14 (hist `27|32|19|8|4|2|2|1|1|1|1|1|1|0|1|0`). Vignette, bloom and grade all visible. |
| 8 | Grounding | 2 | Party on discs; propShadows 75. Boss shadow measured: ground under its feet (810,510,60,25) sits in buckets 1–3, ground beside it at the same screen row (960,510,60,25) sits in buckets 5–7 — **~4 buckets darker**, i.e. a real broad contact darkening, though a soft pool rather than the crisp rimmed disc every other entity gets. The reference's own airborne boss has no shadow at all. |
| 9 | UI polish | 2 | Boss plate (525,15)–(1075,68): bracketed frame + a **stag-head medallion** at (560,40) + name + a violet fill bar with an arrow cap at (1045,58) + **diamond phase ticks** at (710,42) and (925,42) + "1106/1800". That is the reference's ornate plate construction plus phase markers the reference does not have. Threat chip carries an "×3" count badge. `certA3-bossseq_04` shows slot 1 with a live cooldown **countdown "0.9"** under the radial. **Nit:** the same frame prints a fractional damage numeral **"16.5"** at (1068,323) — commercial HUDs round; this is the one detail in the whole set that reads as a debug value leaking on screen. |
| 10 | Motion juice | 2 | Event tape at the shot: hit 54, hitstop 19, screenshake 3, telegraph_start 2 / resolve 1, boss_trample 2, boss_quake 2/1. Camera motion measured in pixels on a far-corner static box (1150,600,300,220), consecutive frames: 0.51 → **44.88 → 27.30** → 4.07 → **32.37 → 59.62** → 13.84 % changed (meanDelta up to 22.15); whole frame f01→f04 **28.77 %** changed. The quake resolve is legible frame-by-frame: danger px 21111 → 24035 → 12353 → 11562 → 9894 with violet peaking 21416 at the resolve flash, then the next telegraph rebuilding 16235 → 25491 → 25227. |

---

## Direct comparison vs pass-the-fear.png

**Visual density** — at or above. Echoes: 15–26 prop types per frame, grass 560–640, flowers 46–70, 17–18 emitters, decal rings, threat chips. Measured flatness beats the reference everywhere: FLAT 1.25–1.93 % vs the reference's 16.68 % whole-frame and 11.68 % in its own dark third. Where Echoes trails is **prop fidelity, not prop count**: its assets are untextured low-poly slabs (camp stall canopy FLAT **50.43 %**, SAT 0.274) where the reference's are hand-painted brick, tiled roofs and chained banners.

**Cohesion** — at or above. Three hue families held in every frame with reserved accents measured, not asserted (camp danger 37 px; shop danger 6 px; combat danger 9516 px all on a live telegraph; boss violet 14498 vs the reference's own 13339). One lighting story per scene. Outline consistency is real but thin — a ~2 px near-black stroke on rigs and bolts, versus the reference's heavy ink line.

**Polish** — HUD is **above** the reference: bracketed geometric frames, real rendered portraits, class-tinted HP strips, vector skill glyphs, working cooldown radials with countdown numerals (the reference has none), a medallion boss plate with phase ticks, wave pips, threat chips with count badges, zero browser-default text. Glows and grounding are present on every entity. Where Echoes is **below**: (1) no discrete particles on projectile trails; (2) no persistent kill decals in the combat room (`scorch` 0 at +94 ticks after a death); (3) highlight share — >200 runs 0.699–1.198 % against the reference's 1.427 %, because nothing in Echoes blows out the way the reference's fire does; (4) the reference paints bright accent strokes inside its dark regions (2.687 % >160 in a pure void box) where Echoes' dark corners measure 0.000–0.060 % >160.

**Finished game or tech demo?** Finished. Three of the four frames would sit unremarked on a store page. The tells that remain are the empty peddler stall, the fractional "16.5" numeral, and the fact that the two certification action stills frame their enemies off-camera.

## Totals

| Frame | Score | Verdict |
|---|---|---|
| camp | **20/20** | PASS |
| combat | **18/20** | PASS |
| shop | **19/20** | PASS |
| boss | **19/20** | PASS |

No zeros. All four ≥ 16.

## Highest-value fixes for the builder

1. **Frame the enemies.** Both action stills (combat, boss) have every antagonist off-camera. Widen the arena camera or bias it toward the threat centroid so an action screenshot contains what the party is fighting.
2. **Light the party in the boss room.** Add a fill or rim light on party rigs so they do not sink to charcoal under the Stag's key light (measured: charcoal blobs at (700,440)–(920,510), unresolvable at 50 %).
3. **Persistent kill decals.** A death at world (2.42,−3.1) left `scorch` 0 and no splat 1.57 s later. Reference C accumulates them.
4. **Particles on projectile trails.** Bolts are core + glow + trail wash with zero discrete sparks.
5. **Put a peddler at the peddler's stall** (`entityCount` 4 = the party only) and give the camp stall canopy stripes + a lamp (FLAT 50.43 %, unlit).
6. Round damage numerals — "16.5" at (1068,323) in `certA3-bossseq_04`.
