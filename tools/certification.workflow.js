export const meta = {
  name: 'echoes-final-certification',
  description: 'Block 14: certify Echoes against REFERENCE_BAR with adversarial critics, fix rejections, re-verify with full regression',
  phases: [
    { title: 'Certify', detail: 'capture + 3-lens scoring of camp/combat/shop/boss; probe critics for loop, responsiveness, perf, camp roads' },
    { title: 'Verify', detail: 'adjudicate scorer disputes; two refuters per failure; completeness check on every PASS' },
    { title: 'Fix', detail: 'one builder per rejected block, sequential, commits with version bump' },
    { title: 'Adjudicate', detail: 'synthesize docs/critiques/certification.md' },
  ],
}

const ROOT = 'C:\\Users\\keshl\\OneDrive\\Desktop\\游戏制作\\echoes-three'
const POSIX = '/c/Users/keshl/OneDrive/Desktop/游戏制作/echoes-three'
const MAX_ROUNDS = 3
const BLOCKS = ['A', 'B', 'C', 'D', 'E']
const FRAMES = ['camp', 'combat', 'shop', 'boss']
const CHECK_TITLES = ['No dead ground', 'Layered light', 'Silhouette read', 'Prop density', 'VFX layering', 'Color discipline', 'Post stack', 'Grounding', 'UI polish', 'Motion juice']

// Concurrency gate: the account usage window is small; run few agents at a time so each one COMPLETES (and is cached / checkpointed) before the window closes.
const CONCURRENCY = 2
function limiter(n) {
  let active = 0
  const q = []
  const next = () => {
    while (active < n && q.length) {
      active++
      const j = q.shift()
      Promise.resolve().then(j.fn).then(j.res, j.rej).finally(() => { active--; next() })
    }
  }
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); next() })
}
const gate = limiter(CONCURRENCY)
const ag = async (p, o) => {
  const r = await gate(() => agent(p, o))
  if (r) return r
  log('retrying ' + ((o && o.label) || 'agent') + ': no structured result')
  return gate(() => agent(p + '\n\nNOTE: a previous instance of you ended WITHOUT returning the structured output. Resume from your checkpoint report and existing captures and RETURN THE STRUCTURED RESULT via the StructuredOutput tool.', o))
}
const ORDER = ['E', 'A', 'B', 'C', 'D']

// ---------------- schemas ----------------
const FAILURE = {
  type: 'object', required: ['id', 'title', 'evidence', 'mustFix', 'reproduce', 'suspectFiles'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, evidence: { type: 'string' },
    mustFix: { type: 'boolean' }, reproduce: { type: 'string' },
    suspectFiles: { type: 'array', items: { type: 'string' } },
  },
}
const VERDICT = {
  type: 'object', required: ['verdict', 'summary', 'failures', 'advisories', 'probesRun', 'reportPath'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, summary: { type: 'string' },
    failures: { type: 'array', items: FAILURE },
    advisories: { type: 'array', items: { type: 'object', required: ['title', 'evidence'], properties: { title: { type: 'string' }, evidence: { type: 'string' } } } },
    probesRun: { type: 'array', items: { type: 'string' } },
    reportPath: { type: 'string' },
  },
}
const CAPTURE = {
  type: 'object', required: ['frames', 'notes'],
  properties: {
    frames: {
      type: 'array', items: {
        type: 'object', required: ['name', 'png', 'zoomPng', 'seqPngs', 'consoleTxt', 'conditionsMet', 'stateSummary', 'analyzer'],
        properties: {
          name: { type: 'string', enum: FRAMES }, png: { type: 'string' }, zoomPng: { type: 'string' },
          seqPngs: { type: 'array', items: { type: 'string' } }, consoleTxt: { type: 'string' },
          conditionsMet: { type: 'boolean' }, stateSummary: { type: 'string' }, analyzer: { type: 'string' },
        },
      },
    },
    notes: { type: 'string' },
  },
}
const SCORE = {
  type: 'object', required: ['frames', 'overall'],
  properties: {
    frames: {
      type: 'array', items: {
        type: 'object', required: ['frame', 'checks'],
        properties: {
          frame: { type: 'string', enum: FRAMES },
          checks: { type: 'array', minItems: 10, maxItems: 10, items: { type: 'object', required: ['id', 'score', 'note'], properties: { id: { type: 'integer' }, score: { type: 'integer', enum: [0, 1, 2] }, note: { type: 'string' } } } },
        },
      },
    },
    overall: { type: 'string' },
  },
}
const ADJ = { type: 'object', required: ['score', 'reasoning', 'evidence'], properties: { score: { type: 'integer', enum: [0, 1, 2] }, reasoning: { type: 'string' }, evidence: { type: 'string' } } }
const REFUTE = { type: 'object', required: ['refuted', 'confidence', 'reasoning', 'evidence', 'mustFix'], properties: { refuted: { type: 'boolean' }, confidence: { type: 'string', enum: ['low', 'medium', 'high'] }, reasoning: { type: 'string' }, evidence: { type: 'string' }, mustFix: { type: 'boolean' } } }
const COMPLETE = { type: 'object', required: ['thorough', 'gaps'], properties: { thorough: { type: 'boolean' }, gaps: { type: 'array', items: { type: 'object', required: ['title', 'why', 'mustRerun'], properties: { title: { type: 'string' }, why: { type: 'string' }, mustRerun: { type: 'boolean' } } } } } }
const BUILD = { type: 'object', required: ['done', 'summary', 'filesChanged', 'commit', 'version', 'selfChecks'], properties: { done: { type: 'boolean' }, summary: { type: 'string' }, filesChanged: { type: 'array', items: { type: 'string' } }, commit: { type: 'string' }, version: { type: 'string' }, selfChecks: { type: 'string' } } }

// Round-1 results (extracted from the completed certification round; see docs/critiques/round1-results.json).
// Used when the workflow is launched with args {useRound1Preset:true} so the fix phase starts without re-running round 1.
const ROUND1_PRESET = {"E":{"block":"E","pass":true,"report":"docs\\critiques\\certification-E-r1.md","failures":[],"advisories":[{"title":"A1 Cart collider intrudes 0.16-0.40 u into the north quarter of the drawn east-road band","evidence":"certE1-cart console: walking north from z -0.3 the body stops at (8.43,-0.98)/(8.75,-1.12)/(9.03,-1.25) -> collider face z -1.28/-1.42/-1.55 vs band north edge -1.53/-1.58/-1.63; E4 leg (11.5,-1.2 heading A) deflected 0.44 u south to z -0.76, E5 0.24 u. Centreline leg E3 passed with z unchanged (-0. ...[full note in the scorecards / report]"},{"title":"A2 Woodpile grazes the camp road band's south edge","evidence":"certE1-roadsW W5 leg (z 1.3 heading D) slid 0.15 u north at x ~ -3.0: the woodpile at (-2.65,1.95) reaches ~z 1.45 while the band edge there is 1.72 (0.27 u inside the band; centreline clear by ~0.5 u)."},{"title":"A3 campState.roadViolations is a count, not a list","evidence":"Every certE1 roadWarn eval: roadViolations 0 with roadViolationsType \"number\" (x30+ across all consoles incl. certE1-b-tents b-start tick 1239 / b-end tick 3287). A list of offending prop ids would make the next regression self-describing."},{"title":"A4 Boot-frame danger-band pixels 971 (> 500 bar) from non-Ember sources","evidence":"tools/analyze.mjs certE1-boot.png: danger 971 px = Swordsman #6B2E3A identity ring + forge coals, no enemy threat; certE1-portalA/B 80/127 px. If the gate is literal, the Swordsman ring hue should sit outside the analyzer's danger band."}],"nonBlocking":[]},"A":{"block":"A","pass":false,"report":"docs/critiques/cert-score-{ref,bible,player}-r1.md","failures":[{"id":"A-combat-c2","title":"combat frame: check 2 Layered light scored 1/2","evidence":"[ref -> 1] Torch pools exist (box 960,190,240,170 >160 36.7% vs 1.3% in ground box 1200,190,240,170), monolith/staff/bolt halos — but no cool ambient: bucket 0 = 0.0%, buckets 0-2 = 7% vs the reference's 48%; cool 14.9% (teal pockets only). Reads as flat daylight; the reference's deep-shadow-vs-fire funnel is absent. | [bible -> 1] Warm pools present: torchL 240,470,160,160 >160 68.2% />200 7.5%, torchR 1000,170,160, ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c3","title":"combat frame: check 3 Silhouette read scored 1/2","evidence":"[ref -> 1] Healer and boar read. Mantis at (140,320) (certA1-ref-combat-mantis @3x) is a blue capsule with violet nubs and four sticks, no head/limbs; at 50% (certA1-combat-z50 (60-90,145-165)) a dash. Tank/swordsman/archer overlap at (520-690,520-740) into one bloom-blown white mass at 50% ((255-340,290-360) in z50). | [bible -> 1] certA1-combat-z50.png: healer (400,210) and boar (740,320) read; tank/swordsman/arche ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c4","title":"combat frame: check 4 Prop density scored 1/2","evidence":"[ref -> 2] vfx.arena propTypes 12 (crates, barrels, fence, planter, bush, stones, monolith, 2 torches, flowers) along the top wall; centre open; road navigable. y>540 holds only one torch — the reference dresses every edge (towers, banners, barricades). | [bible -> 2] Arena propTypes 12; pixels: fence (150,50), stumps, barrels (680,60), crates, bush (930,70), stone slab (640,100), ground torches x2, wall torches x2,  ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c5","title":"combat frame: check 5 VFX layering scored 1/2","evidence":"[ref -> 1] Telegraph = one thin red-orange arc mostly hidden behind the party (box 480,540,240,220 danger 734 px) with no scorched core and no embers vs reference telegraph box 1280,520,300,200 danger 13884 px core+rim+embers. Volley bolts (400-500,700-760) = white capsule + bloom, no trail. vfx particles 0. '+14' pops; kill splat appears in combatseq_03 and persists to _05. | [bible -> 1] Bolts 380,680,200,100: satu ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c6","title":"combat frame: check 6 Color discipline scored 1/2","evidence":"[ref -> 1] Five families compete: foliage lime 65%, amber, indigo/blue enemies, violet, red-orange. Violet on a regular boar's spikes (box 1400,570,200,130 violet 713 px) breaks 'god-stuff only'; heal green sits on green grass (heal band 260952 px whole frame; '+14' box 760,330,90,45 is 88% foliage hue) so the reserved heal colour is not reserved. | [bible -> 1] Danger correctly confined to threats (telegraph 221 + o ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c7","title":"combat frame: check 7 Post stack scored 1/2","evidence":"[ref -> 2] Bloom on torches, staff, bolts, archer flash (>200 3.307%); faint edge vignette (0.16); saturated grade. Bloom is the only strong post cue. | [bible -> 1] Bloom OK (bolts, torches). Vignette absent: bottom corners BL 116.5 / BR 119.3 brighter than centre 106.4; rings 97.6->117.3 (+20%), edge R inverted 127.5->82.9 (ref rings 27.4->53.7, 2x). No visible grade - raw saturated green, no cool wash. | [player - ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c8","title":"combat frame: check 8 Grounding scored 1/2","evidence":"[ref -> 2] Ring discs under all party members; boar belly shadow (certA1-ref-combat-boar); torches cast hard shadows at (330,600); propShadows 40. Bolts unshadowed — same as the reference's fireballs. | [bible -> 1] Party blobs OK; boar OK (1420,665,150,12 luma 58 vs 1420,700 luma 92). Mantis faint at best (under-body 150.8/159.6 vs below 166 vs right 180). Projectiles: ground under the bolt 372,707,14,25 luma 211 vs ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c9","title":"combat frame: check 9 UI polish scored 1/2","evidence":"[ref -> 1] Bar + 'WAVE 1/2 ●○ 4 LEFT' pill (655-945,14-49) + pointer chips at (25,610)/(400,875) (black disc, white triangle). Clean, but text abbreviations for skills, numeric cooldowns ('0.9'/'0.1' in combatseq_02) instead of radials; no location label / currency counters like the reference. | [bible -> 2] Wave plate 650,14,300,36 'WAVE 1/2 . 4 LEFT' with pips; threat pointer chip 370,830,90,70 (red triangle in dar ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-combat-c10","title":"combat frame: check 10 Motion juice scored 1/2","evidence":"[ref -> 2] certA1-combatseq: bow-draw (_00), swordsman lunge with blade (_07), healer cast; hit flash + spark streaks on the mantis at (270,350) in _01; numerals '30'/'12'/'26'; red lunge chevrons at (650,560) in _02; kill decal; 4->1 LEFT; wave-2 spawn rings at (490,85)/(1120,85) in _04. Torch centroid stable +-2 px (shake not resolvable at ~65-tick cadence). | [bible -> 2] combatseq_00..07 (~0.75 s apart): boar hit ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the combat frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-combat.json: arm E.on listene ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c1","title":"shop frame: check 1 No dead ground scored 1/2","evidence":"[ref -> 1] certA1-shop.png FLAT 52.85% (gate <20%): flat charcoal modal box 378,168,844,468 = 61.94% flat over a blurred backdrop (columns 0,0,370,800 / 1230,0,370,800 = 47.5% flat, 3-4 buckets). The arena's texture survives only as blur; the reference has no flat region. | [bible -> 1] certA1-shop.png FLAT 52.89% whole; modal 378,168,844,468 FLAT 61.9%; cards 57.5-61.2%; veil-dimmed arena arenaL 39.8% / arenaR 44.5% ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c2","title":"shop frame: check 2 Layered light scored 1/2","evidence":"[ref -> 1] Backdrop torch at (320,540) is a dim amber smear; monolith at (1360,80) desaturated (violet 0 px). The modal has no glow on cards, plaques, coin or button. >160 1.26% (below the 1.5% gate). | [bible -> 1] Behind the veil the torch 270,480,140,130 is an amber smudge (>160 0.10%, mean 51) and the monolith 1290,10,140,150 glow is gone (>160 0.00%, violet 0). The modal has no light pools; only the wallet coin  ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c3","title":"shop frame: check 3 Silhouette read scored 1/2","evidence":"[ref -> 1] No characters or enemies in view (party idle behind the veil); only the four HUD portrait busts (517-745,820-870) and glyphs. The reference keeps the player in view. | [bible -> 1] No world entity visible (party parked under the modal); HUD portraits read; the card glyph tiles at (438,332)/(711,332)/(983,342) are 40 px unicode symbols - Detonate and Ascend are both stars, told apart only by rim colour. | [ ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c4","title":"shop frame: check 4 Prop density scored 1/2","evidence":"[ref -> 1] No in-world peddler, shelf or wares — the 'shelf' is a DOM panel; arena props are veiled behind it. | [bible -> 2] >=8 props identifiable through the veil (fence, stumps, torch 320,540, crates, barrels, bush, slab, monolith 1340,80, rocks). Advisory: 'THE PEDDLER'S SHELF' has no peddler/stall prop in the world. | [player -> 1] Arena props survive only as blurred blobs (urn (200-270,40-100), barrels, slab,  ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c5","title":"shop frame: check 5 VFX layering scored 1/2","evidence":"[ref -> 1] Shop's own effects absent: plaques/cards are flat 2 px rims, coin a flat disc, no glitter; buying (certA1-ref-shop-buy1a) only dims the card to opacity 0.28 + 'SOLD' stamp (16.1% of card box changed). Only the dimmed torch bloom behind the veil keeps this off zero. | [bible -> 1] Plaques 468/740/1012,497,120,42 flat (mean 50-51, amber ~690 each, no glow spread); cards flat charcoal with 2 px rims (Ascend b ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c6","title":"shop frame: check 6 Color discipline scored 1/2","evidence":"[ref -> 2] Charcoal/bone + amber (wallet, prices, CTA, 'fits your kit' = amber 428 px in box 415,432,90,22) + one sky-blue rarity rim; violet 0, danger 4. Most disciplined frame of the four. | [bible -> 1] Charcoal + bone + amber, violet 0, danger 4 - disciplined - but the Detonate rarity rim is blue 200-210 deg (86% of its 3169 saturated px in 674,292,252,196): a fourth accent outside indigo/amber/violet. | [player  ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c7","title":"shop frame: check 7 Post stack scored 1/2","evidence":"[ref -> 1] Veil = blur + dim, not the post stack: bloom only as the torch smear at (320,540), no vignette gradient distinguishable, modal unaffected. | [bible -> 1] No vignette (rings 41.4|46.1|45.6|43.2|43.2|44.3|44.6, edge L 41->50 inverted), no bloom (>200 0.426% whole, all title/text), grade = uniform darkening veil. Borderline 0; kept at 1 because the veil is a deliberate visible treatment. | [player -> 2] Backd ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c8","title":"shop frame: check 8 Grounding scored 1/2","evidence":"[ref -> 1] Soft drop shadow at the modal border only; cards, plaques and button have none; no entities to ground. | [bible -> 1] No entities to ground; the cards' DOM drop shadow (0 12px 30px rgba(0,0,0,.67)) is unmeasurable on the 40-luma veil (card surround mean 44.6, no dark rim). | [player -> 1] Plate (378-1222,168-640) floats with only a faint halo; cards/plaques/button cast no drop shadow; only the blurred prop ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c9","title":"shop frame: check 9 UI polish scored 1/2","evidence":"[ref -> 1] Cleanest chrome of the set (letter-spaced title, wallet pill, rarity rims, glyph badges, plaques, amber CTA, hint, SOLD/owned states). Defects: 'Ascend' header wraps so its name sits at y~366 vs 345 on the other cards and orphans 'only.'; no hover feedback (Bounce card box 402,292,252,196: 0.00% change after 250 ms hover in certA1-ref-shop-hover); no unaffordable state on the 35-GLINT Ascend card at wallet ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-shop-c10","title":"shop frame: check 10 Motion juice scored 1/2","evidence":"[ref -> 1] Nothing moves; buy = instant dim + stamp; the denied-purchase shake reported by state (plaque shaking:true at tick 644) left plaque box 1005,495,135,50 byte-identical across certA1-ref-shop-buy2/deny1/deny2 (0.00%). No coin-fly, no card flip. | [bible -> 1] Static modal: Ascend shimmer 31.03%/70 ticks; Bounce hover 0.00%; world behind the veil frozen - backdrop 0,0,1600,160 changes 0.01% over 70 ticks (no  ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the shop frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-shop.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c3","title":"boss frame: check 3 Silhouette read scored 1/2","evidence":"[ref -> 1] Stag body is a featureless navy hexagonal slab (box 780,300,110,230); identity only from the V antler beam + crown; at 50% (certA1-boss-z50 (380-440,120-270)) a white slab with a V. Tank/swordsman overlap its left flank at (700-780,400-520). Reference boss is a legible phoenix. | [bible -> 2] certA1-boss-z50.png: Stag (dark diamond + violet antlers + white crown) unmistakable at (400,180); healer (365,310) ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c4","title":"boss frame: check 4 Prop density scored 1/2","evidence":"[ref -> 2] Same 12-type arena; props ring the top wall; centre kept readable around the Stag. | [bible -> 2] Same arena props at the top edge (fence 40,180, stumps, barrels 640,160, crates, bush 920,180, slab 580,220, torches, monolith 1360,180, rocks); centre navigable. | [player -> 1] Identical clearing to room 1 (propTypes 12, top edge only: wall, torches, monolith, slab, barrels, urns); no boss-arena dressing. Re ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c5","title":"boss frame: check 5 VFX layering scored 1/2","evidence":"[ref -> 1] Quake ring = red-orange rim with ticks + amber gradient fill + outer glow (box 690,320,300,250 danger 10301) — a real 3-layer telegraph; crown core+glow. But hits are flash + numeral only: vfx particles 0 after 53 hits, no debris/smoke. Kill splat at (700,680) persists bossseq_03-_07. Numerals on every hit. | [bible -> 1] Quake ring 690,320,300,250: coral rim + tick marks + amber fill (danger 9452, amber 1 ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c6","title":"boss frame: check 6 Color discipline scored 1/2","evidence":"[ref -> 1] Violet correctly on Stag + monolith, danger only on the ring (danger 11018 = ring). But '+22' heal green over green grass (heal band 208067 px), and violet spikes on boar adds in bossseq_05/_07 at (1100,490)/(1450,680). Foliage + amber + violet + indigo + red-orange exceeds three families. | [bible -> 1] Danger confined to the quake ring (9452 of 10295) + torchR fire spill 424 OK; violet only on Stag/monol ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c7","title":"boss frame: check 7 Post stack scored 1/2","evidence":"[ref -> 2] Bloom on crown/torches/flash (>200 2.646%), vignette at all four corners, cooler night grade. Closest of the four to the reference value range (hist 1|10|19|18|13|11|9|6|4|3|2|1|1|1|1|0). | [bible -> 2] Vignette rings 53.1->88.8 (1.67x; ref 2x) with cool corners; bloom on crown/torches/bolt; whole >160 5.12% />200 2.03% / 16/16 >= reference. Advisory: crown 760,150,160,140 >200 47.7% with only 203 saturate ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c8","title":"boss frame: check 8 Grounding scored 1/2","evidence":"[ref -> 1] Party ring discs and torch shadows present; the Stag has no readable contact shadow: ground luma under the body (box 800,518,60,22) 150 vs 158 and 171 beside it — a 5-12% dip swallowed by the quake fill. Reference player has a hard drop-shadow ellipse. | [bible -> 1] Party blobs OK (healer 660,560,170,170 row profile 145->80 under the body). Stag has no contact shadow: ground directly under the body 800,52 ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c9","title":"boss frame: check 9 UI polish scored 1/2","evidence":"[ref -> 1] Plate (395-1205,14-50): violet-rimmed pill, bold bone name, lilac fill, '1117/1800' — clean, legible. Lacks the reference bar's icon medallion, name tag and ornamental caps (certA1-ref-ref-bossbar); bottom bar still text-abbreviated; threat chip '×3' at (525,775). | [bible -> 2] Boss plate 392,14,816,35: rounded charcoal, violet bar 250-260 deg, bold bone 'THE HOLLOW STAG 1117/1800' (>200 11.9%); dodge chi ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]},{"id":"A-boss-c10","title":"boss frame: check 10 Motion juice scored 1/2","evidence":"[ref -> 2] certA1-bossseq: ring live _00 (danger 14952) -> resolved _01 (1563); Stag hit-flash white in _02/_05/_06/_07; numerals cascade 8->45; trample chevrons at (940,640) in _06; kill splat from _03; healer hurt pose with '15' in _03; camera follows (torch centroid (324,133)->(394,92)). | [bible -> 2] bossseq_00..07: Stag hit-flash (_00/_01), quake ring appears/resolves (danger 13173 -> 1595 -> 25280), HP 1081->4 ...[full note in the scorecards / report]","mustFix":true,"reproduce":"Capture technician conditions for the boss frame (seed 4242): URL http://127.0.0.1:5199/?seed=4242, actions tools/actions/certA1-boss.json: arm -> E.cmd('startR ...[full note in the scorecards / report]","suspectFiles":[]}],"advisories":[{"title":"camp frame: check 6 Color discipline scored 1/2","evidence":"[ref -> 2] Exactly Reference A's families: indigo night, amber fire, violet arcane; class rings the only accents. Advisory: danger band 700 px (>500 gate) with no enemies — grid cells (0,450)+(0,675) hold 479 px from the forge lamp glow at (150,680), 177 px in cell (400,0); not Ember hue. | [bible - ...[full note in the scorecards / report]"},{"title":"camp frame: check 9 UI polish scored 1/2","evidence":"[ref -> 1] Bar crop 495,805,610,85: portraits F1-F4 with class rims + HP bars, slots 1-4, SPC chip, 'v0.4.16' at (10,881), fps chip — clean geometric frames. But skill slots are text abbreviations ('MB','SM') and dashed placeholders with no icons; nothing like the reference's illustrated weapon card ...[full note in the scorecards / report]"},{"title":"camp frame: check 10 Motion juice scored 1/2","evidence":"[ref -> 2] certA1-campseq_00..05: fireflies/embers drift (4.40% of pixels change per frame), hearth flicker (box 560,270: 17.1% change), critters idle-animate (boxes 434,335 / 750,370 / 839,314 / 456,155 change 14.4-23.9% vs 1.9% in control box 1300,600,200,120). Seated poses, not statues. | [bible  ...[full note in the scorecards / report]"}],"nonBlocking":[]},"B":{"block":"B","pass":true,"report":"docs\\critiques\\certification-B-r1.md","failures":[],"advisories":[{"title":"?seed=777 is the boot seed, not the first run's seed (first run is deterministic: 2947974146 on every boot on record)","evidence":"certB1-fl-main.console.txt: snap boot seed 777/777; run_start wait seed 2947974146 (before 777, boot 777); victory card 'RUN SEED 2947974146' (certB1-fl-r1-end.png). Same first-run seed 2947974146 in the 09-04 certB1-main / certB1-mainB and 09-05 certB1-r1 logs on the same build; runs 2/3 fresh each ...[full note in the scorecards / report]"},{"title":"runUi().screen reported 'draft' >=1.3 s after draft_taken while the socket overlay was open (room 4)","evidence":"certB1-fl-main.console.txt line 726: pick Take rect (662,541,132,42) click (728,562); 700 ms later screen still 'draft' -> harness pressed a redundant Enter; afterDraft {screen 'draft', draftEvents [node_granted@6627, draft_taken@6627, path_offer@6627], socketOpen true}. Rooms 3/5/6 reported 'path'/ ...[full note in the scorecards / report]"},{"title":"Camp frames exceed the Ember-danger budget with no enemy present (hearth/torch hues)","evidence":"tools/analyze.mjs: certB1-fl-boot.png danger 952 px, certB1-fl-r1-camp-after.png 768 px, certB1-fl-r2-camp-after.png 810 px vs the <500 px bar; >160 1.81-1.99%, >200 0.52-0.57%, 16/16 buckets, FLAT 13.1-14.1% otherwise pass. Same as critic E's boot-frame note."},{"title":"Same-tick bus ordering: reward_offer before room_cleared; run_end/run_wiped before room_cleared in room 8","evidence":"Run-1 order list: 'reward_offer@1485 room_cleared@1485' in every combat room, and 'run_end(victory)@12601 director_stop@12601 run_wiped@12601 room_cleared@12601' at the boss clear. Ticks are monotonic so the integrity checker passes; a listener assuming room_cleared arrives first would misread it."},{"title":"state().room is stale in the boss room","evidence":"snap r8-enter (tick 11587): run.mode 'boss', hud.roomLive false, but state().room = {mode 'defend', cleared true, waveIndex 3, wavesTotal 4, waveSizes [4,3,3,4]} carried over from room 6."},{"title":"One X3595/X4000 shader info-log warning per boot (pre-existing)","evidence":"certB1-fl-main.console.txt: 1 x 'THREE.WebGLProgram: Program Info Log: (198,12-86): warning X3595: gradient instruction used in a loop... X4000 uninitialized f_ApplyFXAA' alongside 576 allowed MeshToon flatShading warnings; 0 errors."}],"nonBlocking":[]},"C":{"block":"C","pass":false,"report":"docs\\critiques\\certification-C-r1.md","failures":[{"id":"F1","title":"Room-clearing kill has no damage numeral (room-clear wipes the numeral pool on the kill tick)","evidence":"captures/certC1-lastkill2.console.txt: room 1 death mantis 42 = room_cleared t1432 (hit archer_basic 12): no .dmg-num in [1430,1440], state().vfx.numerals 0 at 1431/1432; room 3 death 191 = room_cleared t4868 (piercing_shot 30): no \"30\" ever, vfx.numerals 1 -> 0 on t4868 and stays 0 through t4874 (the in-flight \"12\" from t4867 at (554,171) was wiped too), frame gap only 22 ms so not a stall. Control: defend room last ...[full note in the scorecards / report]","mustFix":true,"reproduce":"cd echoes-three; node tools/cert-capture.mjs shot certC1-lastkill2 --url \"http://127.0.0.1:5199/?seed=555\" --actions tools/actions/certC1-lastkill2.json --timeo ...[full note in the scorecards / report]","suspectFiles":["src/render/numbers.js","src/sim/run.js","src/sim/waves.js","src/main.js"]}],"advisories":[{"title":"A1 Frame stall of ~200-240 ms on the room-1 clear tick and at startRun arena build","evidence":"certC1-lastkill2: 232 ms frame at t1432 (room-1 clear -> draft), 238/146/121/134 ms at ticks 405-429 during startRun before any enemy, one 101 ms gap at t1083 mid-wave; certC1-hits: 195 ms wall time on the room-clearing kill tick t1899. Room 3's clear (-> path screen) had no stall (22 ms). Perf-bar  ...[full note in the scorecards / report]"},{"title":"A2 Antler Quake resolve does not shake the camera with the player outside the ring","evidence":"certC1-boss.console.txt: quake resolves t1175/t1457 camera jerk 0.021 / 0.000 vs baseline p95 0.015 and kill shake 0.066 (death t1521); player at screen (800,782), ~3 u outside the ring box 622-937 x 457-734. Consistent with BUILD_BRIEF section 9 'player-adjacent explosions and kills'; a quake landi ...[full note in the scorecards / report]"},{"title":"A3 cmd('hitOnce', id) returns null on live boars/mantises","evidence":"certC1-lastkill.console.txt: hitOnce on boar 4 (hp set to 1) and mantis 42 returned null with no hit event; hitOnce lands on dummies (certC1-flash trial 1 {amount:8}) and the player (C2). Natural hits were used instead; note for future critics."},{"title":"A4 One kill screenshake diluted by sampler load","evidence":"certC1-pxgrab: first kill t472 jerk 0.0046 while six crops were being encoded per frame (3-5-tick frame gaps); 50/51 kills across certC1-hits (20/20), certC1-pxflash (17/17) and certC1-pxgrab (13/14) shook the camera 0.014-0.154 u/tick^2 vs baseline p95 <= 0.0001."},{"title":"A5 Headless screenshots cannot catch 3-tick effects; use per-frame canvas sampling","evidence":"page.screenshot costs ~0.9 s and stalls rendering ~4 ticks (pxflash trial 2: frames at t761 and t765 straddle the hit, nothing rendered inside the 3-tick flash); the previous instance's certC1-hitseq_00..07 frames are ~50 ticks apart, not 100 ms. certC1-flash1-hit.png shows no flash (dummy body >200 ...[full note in the scorecards / report]"}],"nonBlocking":[]},"D":{"block":"D","pass":true,"report":"docs\\critiques\\certification-D-r1.md","failures":[],"advisories":[{"title":"A1 first-draft / path-screen first frame 103-176 ms (once 212 ms) on the quiet machine","evidence":"certD1-b-wave2a 163.7 @t1841 (+12 after room_cleared t1829), certD1-b-wave2b 175.8 @t3034 (+13), certD1-q-wave2 163.6 @t1810 - reproducible to 0.1 ms for the first draft opened on a page; certD1-b-draftdiag room-1 draft 121.1 @+119 ms, later common/rare drafts 0 ms extra; path screen first frame 109 ...[full note in the scorecards / report]"},{"title":"A2 wave-start first draw and ally-downed frame ~140-200 ms (prior quiet run, unchanged)","evidence":"certD1-q-defend6 199.9 ms @t1780 (wave_start + 3 spawn_telegraph, tm 22.4) and certD1-q-boss 139.5 ms @t1579 (14 ticks after downed/ally#2, tm 11.5); single frames, never 3 in a 15 s window."},{"title":"A3 2560x1440 shop: three price plaques at three heights","evidence":"certD1-layout-2560-shop.png / RECTS eval: cards h 299.9 / 367.8 / 320.9, plaques y 762 / 829.9 / 783 (1600x900 and 1024x576 all at one y). No overlap, all inside the viewport."},{"title":"A4 MeshToonMaterial flatShading warning floods the console (1223 of 1229 warn lines today)","evidence":"6 certD1-b consoles: warn 1229 = 1223 x \"THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial\" + 6 x X3595 gradient-in-loop (one per boot); ~70 per room entered. Pure noise but it hides real warnings. PAGEERROR 0, error 0, HARNESS-ERROR 0."},{"title":"Headless renderer on this machine is GPU-backed (AMD iGPU via ANGLE D3D11), not SwiftShader - numbers are iGPU numbers","evidence":"certD1-q-gpu.console.txt: renderer \"ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)\", WebGL 2.0, 165 Hz quantised frames (E.fps 163.9 / 82.6 / 55.2). The orchestrator's GPU-Chrome pass should specifically watch the legendary draft frame (F2)."},{"title":"Observation: SOCKETS bench overlay dims the whole HUD including the version label (not a defect)","evidence":"certD1-b-draftdiag.png (room-7 shop, bench open): label box (0,860,80,40) LUMA >160 0.000 % vs 2.969 % on certD1-b-clear2.png / certD1-b-wave2b.png; fps meter \"161 fps\" and command bar equally scrimmed, still legible at (10,870)."}],"nonBlocking":[{"id":"F2","title":"Legendary draft card: two-stage rAF stall (115 + 212-236 ms alone, 310-424 ms contended) under the rn-shimmer animation","evidence":"certD1-q-clear.console.txt gaps 127.3 @t3574 + 236.2 @t3604 (+8/+38 ticks after room_cleared t3566, reward_offer#ascend, timerMaxGap 7.1); certD1-b-clear2.console.txt gaps 115.1 @t3862 + 224.1 @t3891 (+7/+36 after t3855, tm 16.1/16.6, heap 62.6->63.0, geometries 1042); certD1-b-draftdiag.console.txt drafts[2]: room 3 Ascend legendary, gaps 115.3 @+97 ms and 212.1 @+576 ms after open (t5617), 134 frames in 1.5 s vs 15 ...[full note in the scorecards / report]","mustFix":false,"reproduce":"cd echoes-three && node tools/cert-capture.mjs shot certD1-b-draftdiag --url \"http://127.0.0.1:5199/?seed=999\" --settle 3000 --actions tools/actions/certD1-b-dr ...[full note in the scorecards / report]","suspectFiles":["src/ui/run-screen (the .rn-card.rn-legendary rn-shimmer keyframe animation and its CSS)","src/main.js (rAF loop / render while #run-screen overlay is open)"]},{"id":"F1","title":"renderer.info.memory.geometries never decrements (~+115 per run, ~3 per enemy rig + 1 per decal)","evidence":"certD1-q-leak3: 402 -> 840 -> 952 -> 1074 after runs 1-3 with scene graph flat (objs 1119 / meshes 892 / uniqGeo 687) and E.entityCount 4 at every camp snapshot; certD1-q-geoleak 697 -> 801 across 20 cmd-spawned enemies + 33 decals while scene uniqGeo returned to 686; today certD1-b-clear1 (35 spawns) ends at 1150 vs 1042 for the 31-spawn branch. Heap does not track it (44.9 -> 53.7 MB, inside the 42-77 MB GC sawtoot ...[full note in the scorecards / report]","mustFix":false,"reproduce":"node tools/cert-capture.mjs shot x --url \"http://127.0.0.1:5199/?seed=999\" --settle 3000 --actions tools/actions/certD1-q-geoleak.json --timeout 180000 and read ...[full note in the scorecards / report]","suspectFiles":["src/ (enemy rig / decal removal paths that drop meshes without geometry.dispose())"]}]}}

// ---------------- prompt pieces ----------------
function preamble(pfx) {
  return [
    'PROJECT: the Three.js roguelike "Echoes" at ' + ROOT + ' (Bash path: ' + POSIX + '). Run EVERY command from that directory (Bash: cd "' + POSIX + '" && ...).',
    'The vite dev server is ALREADY running on http://127.0.0.1:5199. Never start another one, never run npm run dev, never kill node processes.',
    'Read first: docs/TESTING.md, docs/REFERENCE_BAR.md, the top "Resume point" of PROGRESS.md and its latest log rows, and docs/critiques/run-roundD3.md + docs/critiques/hud-roundD3.md (how previous critics probed; copy their rigor).',
    'HARNESS: node tools/cert-capture.mjs shot|seq <name> [--url u] [--settle ms] [--actions file.json] [--w --h --zoom] [--timeout ms]. It is a superset of tools/capture.mjs (same pixels/console contract) plus --timeout for navigation and extra actions {type:"loop",cond,maxMs,body:[...]}, {type:"if",cond,then:[...]}, {type:"shot",name} for intermediate screenshots. ALWAYS pass --timeout 180000: up to five headless browsers share the dev server and the camp boot alone takes ~35 s to reach network-idle. A navigation-timeout / [HARNESS-ERROR] is NOT a game defect: retry that capture up to 3 times before concluding anything. Output: captures/<name>.png (+ _00.. for seq) and captures/<name>.console.txt; exit 1 means an uncaught page error (that IS a defect).',
    'Write action JSON files programmatically (a small node generator script using JSON.stringify), never hand-escaped. Every eval step shares ONE page scope: wrap code in IIFEs; use async IIFEs that poll window.__echoes every ~8 ms to wait for conditions and RETURN the observed state so it lands in console.txt as [EVAL]. tools/cert-gen.mjs is a good template (arm/snap/waitFor/leg helpers) — copy what you need into your own generator tools/' + pfx + 'gen.mjs. Do NOT edit tools/cert-gen.mjs, tools/cert-capture.mjs, tools/capture.mjs or tools/analyze.mjs.',
    'PREFIX: every capture name, action file and generator you create starts with "' + pfx + '" (e.g. captures/' + pfx + 'combat.png, tools/actions/' + pfx + 'combat.json) so concurrent agents never collide.',
    'DEBUG API window.__echoes: version, tick, fps, entityCount, seed, bootSeed, events (ring buffer), state() (scene, run, room, party, enemies, eshots, zones, azones, skillBolts, skills, build, vfx counts, toggles), runUi() (screen/text/buttons/cards/doors/wallet), hud.combat()/hud.banner()/hud.threat(), on(type, fn) to subscribe to sim events, cmd(name, ...args). cmds: startRun, skipToRoom(n), endRun, returnToCamp, runState, wallet, killAllEnemies, killBoss (returns null before the Stag has spawned), bossHp(FRACTION 0..1 of max — NOT absolute), draftTake/draftDecline/pathChoose/shopBuy/shopAdvance, spawn(type,x,z), teleport(x,z), setHp(id,pct), hitOnce, iframe, heal, startRoom, startWave, clearRoom, giveSkill, grantNode, socket, campState, campSeats, allyState, downAll, mark, rally. There is NO cmd("win") or cmd("lose"). ?seed=N on the URL forces the run seed; ?room=N boots straight into a room (harness-only).',
    'Analyzer: node tools/analyze.mjs [--box x,y,w,h] [--ref] <png...> prints LUMA >160/>200 + 16 buckets, HUEMIX, FLAT %, SAT, and HUES (danger/heal/violet/amber pixel counts). Reference benchmark (docs/reference/pass-the-fear.png): >160 3.418%, >200 1.427%, 16/16 buckets. Gameplay gates: >160 >= 1.5%, >200 >= 0.4%, >= 13/16 buckets, FLAT < 20%, Ember-danger band < 500 px on frames with no enemy threat.',
    'HARD RULES: you are a CRITIC. Never modify anything under src/**, docs/BUILD_BRIEF.md, docs/REFERENCE_BAR.md, or another agent\'s critique file. Judge only captured pixels (view PNGs with the Read tool), console logs and debug-API state — never code you read. Do not use any mcp__Claude_Browser__* or mcp__claude-in-chrome__* tools (the live pane is reserved for the orchestrator). Do not git commit. Every claim cites a capture name + pixel coordinates / analyzer numbers / event ticks. Vague praise and vague rejection are both failures of the critic. Your final message is machine-read: return only the structured output.',
  ].join('\n')
}

function checkpoint(report, pfx) {
  return 'CHECKPOINT / RESUME (usage limits kill agents mid-run; your report file is the checkpoint). FIRST check whether ' + report + ' already exists. If it exists and its first line is "STATUS: COMPLETE", a previous instance of you finished: read it, confirm the captures it cites exist under captures/ (spot-check two PNGs with Read), and return the structured result from that report WITHOUT re-running the probes. If it exists with "STATUS: PARTIAL" (or no STATUS line at all), continue from the last completed probe recorded in it, reusing its existing captures/' + pfx + '* files and console logs, instead of starting over. If it does not exist, create it immediately with "STATUS: PARTIAL" as the first line and append each probe\x27s measurements to it as soon as they are taken (never wait for the end). When everything is done, rewrite the first line to "STATUS: COMPLETE" and put the final verdict on the second line.'
}

function capturePrompt(pfx, round) {
  return [
    'You are the CAPTURE TECHNICIAN for round ' + round + ' of the final certification of "Echoes". You produce the exact frame set that three independent scorers will judge, under the exact conditions below, and return the file list with PROOF (poll return values) that each condition was met. You do not score anything.',
    preamble(pfx),
    'All frames 1600x900 unless stated. Use the URL http://127.0.0.1:5199/?seed=4242 for every run frame so adjudicators can reproduce.',
    '1. camp: boot frame, plain URL http://127.0.0.1:5199 (no ?room), no input: shot ' + pfx + 'camp --settle 4500. Then ' + pfx + 'camp-z50 with --zoom 0.5 (silhouette check), and seq ' + pfx + 'campseq 6 250 (fireflies/critter motion). With an actions file, record E.cmd("campState") (propTypes/campPropTypes count, emitters + kinds, propShadows, fireflies, embers, vignette, colliders, roadViolations, seats) and E.state().vfx into stateSummary.',
    '2. combat: Act-1 room mid-wave. Actions: arm E.on listeners (telegraph_start/hit/death/enemy_spawn/flash/knockback/screenshake), E.cmd("startRun"), mousemove to the arena centre, async-poll until state().enemies.length >= 3 AND some telegraph_start event has resolveTick - E.tick >= 28 (live telegraph), then mousedown right (basic attack), key Digit1 60 ms, key Digit2 60 ms, wait 120 ms, capture. Print the poll return (enemies with kinds/positions/hp, live telegraphs with ticks). Also a --zoom 0.5 variant (' + pfx + 'combat-z50) of the same setup, and seq ' + pfx + 'combatseq 8 150 starting from the same moment (for check 10: hit flash, numerals, knockback). stateSummary must include: enemies, telegraphs, skillBolts, azones, vfx counts (numerals/decals/particles/emitters/propTypes/propShadows/grass), hud.banner().text, fps, version.',
    '3. shop: E.cmd("startRun"); E.cmd("skipToRoom",7); wait 1800 ms; capture ' + pfx + 'shop; stateSummary must show runUi().screen (must be the shop), wallet, cards/plaques, the pages visible, vfx counts. No zoom variant needed; seqPngs may be an empty array.',
    '4. boss: E.cmd("startRun"); E.cmd("skipToRoom",8); mousemove to the arena; async-poll until >= 2 boss_quake_start AND >= 1 boss_adds events have fired and the latest quake started <= 6 ticks ago; mousedown right, key Digit1, wait 150 ms, capture ' + pfx + 'boss. Also seq ' + pfx + 'bossseq 8 150 across a quake resolve (boss_quake_resolve). stateSummary: boss hp/maxHp/adds, quakes list, adds list, enemies, vfx counts, banner text. A --zoom 0.5 variant ' + pfx + 'boss-z50 too.',
    'For every main PNG run: node tools/analyze.mjs --ref captures/<png> and paste the complete output (including the reference line) into analyzer. View every main PNG and zoom PNG ONCE with the Read tool: if a frame is black, blank, mid-load, or the condition poll returned ok:false, recapture (up to 3 tries) and set conditionsMet accordingly. consoleTxt = the console.txt path; note the exit code and any [PAGEERROR] lines in notes. Return the structured result with absolute-from-repo paths like captures/' + pfx + 'combat.png.',
  ].join('\n\n')
}

const LENSES = [
  { key: 'ref', desc: 'REFERENCE MATCHER: judge density, cohesion and polish strictly side-by-side with docs/reference/pass-the-fear.png and the four reference descriptions in REFERENCE_BAR.md. The reference is the floor, not the ceiling: a 2 means this frame would not look out of place next to it; a 1 means the element exists but the reference clearly does it better; a 0 means absent or broken.' },
  { key: 'bible', desc: 'ART-BIBLE ENFORCER: colour discipline (<= 3 hue families; danger red-orange only on enemy threats, heal green only on heals, violet only on corruption/god-stuff), value range (LUMA buckets, murk, blown-out regions), a glow halo on EVERY emitter, a contact shadow under EVERY entity including projectiles, post stack (bloom/vignette/grade). Measure with node tools/analyze.mjs including --box regions around specific entities, torches, telegraphs, the frame edges (vignette) and the ground; quote the numbers.' },
  { key: 'player', desc: 'PLAYER\'S-EYE: silhouette read at the 50%-zoom frames (can you tell tank/swordsman/archer/healer and each enemy apart by outline alone?), HUD polish (geometric frames, readable numerals, cooldown radials, boss plate, no browser-default text), motion juice across the sequence frames (hit flash, knockback, squash-stretch, screenshake, numerals popping), and the blunt question: does this read as a finished commercial game frame or as a tech demo?' },
]

function scorerPrompt(lens, cap, pfx, round) {
  return [
    'You are an independent, harsh ART CRITIC scoring round ' + round + ' of the final certification frames of "Echoes" against docs/REFERENCE_BAR.md. Fresh context: you have never seen this game. Your lens: ' + lens.desc,
    preamble(pfx + lens.key + '-'),
    'Read docs/REFERENCE_BAR.md in full and VIEW docs/reference/pass-the-fear.png with the Read tool before looking at any game frame. Then view every frame below with Read: the main PNG, the 50%-zoom PNG (check 3), and the sequence PNGs (check 10). Run node tools/analyze.mjs yourself on any frame or --box region you need; the technician\'s analyzer output is provided but verify it.',
    'FRAME SET (JSON from the capture technician):\n' + JSON.stringify(cap, null, 1),
    'Score all 10 checks for each of the 4 frames (camp, combat, shop, boss): 0, 1 or 2, each with a note that names pixel coordinates / boxes / analyzer numbers. 2 = meets or exceeds the reference; 1 = present but clearly below the reference; 0 = absent or broken. Score what the frame CAN show: on the shop frame, check 5 is about the shop\'s own effects (glowing plaques/cards, coin glitter, the arena behind); check 10 on a static frame uses the sequence PNGs; check 9 in camp covers the camp HUD/prompt chrome and the version label. Never average away a failure: if the ground right of the player is flat, say the box you measured and the FLAT % there.',
    'Direct comparison is mandatory: is the visual density (props per screen, decals, light pools), cohesion (palette discipline, outline consistency, one lighting story) and polish (glows, shadows, HUD framing) at or above pass-the-fear.png? Where below, the note must say what the reference has that this frame lacks.',
    'If a frame is unusable (conditionsMet false, black, mid-load), recapture it yourself with prefix ' + pfx + lens.key + '- using the technician\'s conditions and ?seed=4242, and say so in the note.',
    'Write your full scorecard to docs/critiques/cert-score-' + lens.key + '-r' + round + '.md (a table per frame + notes + the reference comparison). Then return the structured scores (exactly 10 checks per frame, ids 1..10).',
    checkpoint('docs/critiques/cert-score-' + lens.key + '-r' + round + '.md', pfx + lens.key + '-'),
  ].join('\n\n')
}

function adjudicatePrompt(d, cap, pfx, n) {
  const fr = cap.frames.find((f) => f.name === d.frame) || {}
  return [
    'You are the ADJUDICATOR for ONE disputed rubric check in the final certification of "Echoes": check ' + d.check + ' "' + CHECK_TITLES[d.check - 1] + '" on the ' + d.frame + ' frame. Independent scorers gave: ' + JSON.stringify(d.scores) + '. Their notes:\n' + d.notes.join('\n'),
    preamble(pfx + 'adj' + n + '-'),
    'Decide the final score (0/1/2) by re-examining PIXELS: read the check\'s definition and the relevant reference description in docs/REFERENCE_BAR.md, view docs/reference/pass-the-fear.png, then view ' + fr.png + ' (zoom: ' + fr.zoomPng + '; sequence: ' + JSON.stringify(fr.seqPngs || []) + ') with the Read tool, and measure the specific disputed claim with node tools/analyze.mjs --box. If the claim depends on a moment (motion, telegraph, flash), recapture with your prefix using ?seed=4242 and the technician\'s conditions (stateSummary: ' + (fr.stateSummary || '') + ').',
    'Rule: the lowest score the pixels support is correct; a 2 requires meeting the reference. Return score + reasoning + evidence with capture names, coordinates and numbers.',
  ].join('\n\n')
}

const BLOCK_BRIEF = {
  B: (pfx, round) => [
    'You are the FULL-LOOP CERTIFICATION CRITIC (block B, round ' + round + ') for "Echoes". Prove by REAL INPUT that the whole game loop plays end to end with zero page errors. Fresh context.',
    preamble(pfx),
    'Required probes (long cert-capture runs with --timeout 180000; use loop/if/shot actions or async eval polls; keep an intermediate {type:"shot"} at every screen and room boundary):',
    'B1 Camp -> portal by WASD: boot http://127.0.0.1:5199/?seed=777 (no ?room). Read E.cmd("campState") for the player and portal positions and the prompt/interaction key, walk to the portal with real keydown/keyup, confirm the prompt becomes visible (campState.promptVisible / DOM), press the interaction key it names, confirm run_start fires and room 1 loads (E.cmd("runState")).',
    'B2 Rooms 1-8 by real play: move with WASD, hold right mouse for the basic attack, use Digit1-Digit4 as skills come off cooldown, dodge with the dash key (find it in docs/BUILD_BRIEF.md controls or the HUD command bar), let the allies fight. Each room must clear within 4 minutes of real play (allies deal the damage; the healer heals). Handle EVERY run screen with real input: reward draft (click a card or press its key), path choice (click a door), the room-7 shop (buy one item if the wallet allows, by real click; advance by real input), the room-8 Hollow Stag (fight to the FELLED plate, mop up the adds, victory screen), then return to camp by real input. Snapshot E.state()/E.cmd("runState")/E.runUi() at every boundary, capture a shot at each, record wall time per room. Never use killAllEnemies/killBoss/skipToRoom/endRun on THIS run: if you cannot progress after 4 minutes on a room, that is a FAIL (mustFix) with a shot and state proving what blocked it.',
    'B3 Defeat loop: from camp, start a second run through the portal by real input. In room 1 hasten a wipe (E.cmd("setHp", id, pct) on party members or E.cmd("downAll") is permitted ONLY to hasten); the defeat screen -> return to camp must be real input. Confirm run_wiped/return_to_camp events, camp scene active, party alive and seated, and ZERO leaks in E.state(): no stray enemies/eshots/zones/azones/skillBolts/numerals, hud.banner() cleared, threat markers 0.',
    'B4 Third run: start it through the portal by real input; confirm a fresh seed (E.seed differs from run 2; note the known advisory that the FIRST run after boot reuses bootSeed — runs 2 and 3 must differ), full party HP, skill slots per the brief, room 1 fresh (enemy count, wallet reset per the brief).',
    'B5 Event integrity: arm E.on for run_start/room_enter/room_start/room_cleared/reward/draft_taken/path_chosen/shop_buy/boss_spawn/boss_death/victory/defeat/run_end/run_wiped/return_to_camp and print the ordered list at the end of each run; it must be coherent (no room_cleared before room_start, exactly one boss_spawn per full run, victory before run_end, etc.).',
    'B6 Console: every console.txt has zero [PAGEERROR] and zero [error] lines (the three THREE.Material flatShading warnings are known and allowed; any other warning is an advisory). All exit codes 0.',
    'Gates: B1-B6 all met -> PASS. Any blocked progression, page error, leak, or non-fresh seed -> FAIL with mustFix failures whose reproduce field gives the exact action file and step. Write docs/critiques/certification-B-r' + round + '.md (probe table: room, wall time, screens handled, snapshot deltas, shot names, event list). Return the structured verdict.',
  ].join('\n\n'),
  C: (pfx, round) => [
    'You are the RESPONSIVENESS CERTIFICATION CRITIC (block C, round ' + round + ') for "Echoes". Measure the "Responsiveness bar" of docs/REFERENCE_BAR.md with real synthetic input and event ticks. Fresh context.',
    preamble(pfx),
    'Use http://127.0.0.1:5199/?seed=555 and start runs with E.cmd("startRun") (cmd use is fine here; the loop itself is certified by another critic). Required probes:',
    'C1 Movement latency: record E.tick and the player position at keydown of KeyD, then poll every frame; report ticks until the position changes (must be <= 2) over 5 trials, and the same for KeyA/KeyW/KeyS. Then alternate KeyA/KeyD 10x at 100 ms and confirm each direction flip registers within <= 2 ticks (no input queuing).',
    'C2 Dash/dodge: identify the dash key (docs/BUILD_BRIEF.md controls / HUD command bar / the dash or dodge event name). Measure ticks from keydown to the dash event (0-1 tick). During the dash, land an attack on the player (E.cmd("hitOnce", ...) or a spawned adjacent enemy): expect hit_immune and unchanged HP; the same attack after the dash must land (hit event + HP drop). Report both with ticks.',
    'C3 Telegraphs: over >= 60 s of Act-1 waves, list every telegraph_start -> telegraph_resolve pair; the gap must be >= 42 ticks (0.7 s) for every one. Capture a frame mid-telegraph and measure the danger band with analyze.mjs --box around the telegraph (project world->screen via the debug API if exposed, else locate it in the PNG) — Ember Danger red-orange must be visible; then a frame with no live telegraph and no enemies must have danger < 500 px (known ~485 px heal-over-tunic advisory).',
    'C4 Hit feedback: for >= 20 enemy hits, verify within 2 ticks of each hit: flash + numeral (state().vfx.numerals increments) + knockback + sound events; hitstop on heavy hits; screenshake on kills/boss stomps. Capture seq 8 frames at 100 ms across a hit and confirm the victim flash and numeral in PIXELS (frame name + coordinates).',
    'C5 Camera: hold KeyD 4 s then KeyW 4 s in an arena; sample the player\'s screen position every 250 ms (project via the debug API if exposed, else use shots and locate the player); the player must stay inside the central 60% of the frame and the camera must move smoothly (no jump > 25% of the width between samples).',
    'C6 Threat pointers: with enemies off-screen, E.hud.threat() must report markersDrawn >= 1 and the DOM markers must be visible in a shot (point at them).',
    'Gates: all six met -> PASS; any latency > 2 ticks, missing i-frames, telegraph < 42 ticks, a hit missing any feedback element, camera loss, or missing pointers -> FAIL with mustFix. Write docs/critiques/certification-C-r' + round + '.md with the measurement tables. Return the structured verdict.',
  ].join('\n\n'),
  D: (pfx, round) => [
    'You are the PERFORMANCE & CHROME CERTIFICATION CRITIC (block D, round ' + round + ') for "Echoes". Fresh context.',
    preamble(pfx),
    'The headless harness renders with SwiftShader (CPU). Report headless numbers honestly; the orchestrator separately measures on a GPU-backed Chrome. Headless steady-state gates: mean fps >= 55 -> PASS; 45-55 -> PASS-conditional (say so; not a failure); < 45, or >= 3 frame gaps > 100 ms in any 15 s steady-state window, or any single gap > 250 ms after warm-up -> FAIL (mustFix) with the timeline. If a number is borderline, re-run that probe ALONE later (other agents share the server) before concluding.',
    'Use http://127.0.0.1:5199/?seed=999 and --timeout 180000. Probes:',
    'D1 Worst-case wave: E.cmd("startRun"); reach the room with the most simultaneous enemies (read docs/BUILD_BRIEF.md rooms/waves; defend rooms; E.cmd("skipToRoom", n)); sample requestAnimationFrame deltas for 20 s via an async eval returning mean fps, p95 and max frame time, and every gap > 100 ms with its timestamp; also E.fps, E.entityCount and the enemy count at 1 s intervals. Separate the first 3 s (warm-up / shader compile) from steady state.',
    'D2 Boss: E.cmd("skipToRoom", 8); after the Stag and first adds are up, sample 20 s the same way across quakes (boss_quake_start events).',
    'D3 Camp idle baseline: 10 s sample at camp boot (fireflies, critters).',
    'D4 Page errors: across every capture you run, zero [PAGEERROR] and zero [error] lines (flatShading warnings allowed). Count console lines by level; list any unexpected warning as an advisory.',
    'D5 Version label: read the VERSION constant in src/version.js (reading that one file is allowed) and confirm the bottom-left label in a camp frame and a combat frame renders exactly that string (view the PNG; use analyze.mjs --box on the corner to prove it is drawn) and that E.version matches.',
    'D6 Layout: capture the camp, a combat frame and the shop at --w 1024 --h 576 and at --w 2560 --h 1440: every HUD element (portraits, HP, command bar, banner, boss plate, version label, run screens) must be fully inside the viewport, not overlapping another element, and readable (view the PNGs; measure DOM rects via an eval over the HUD roots with getBoundingClientRect and report any rect outside the viewport or intersecting another).',
    'D7 Leak proxy: E.entityCount and state().vfx counts after two cmd-driven runs (startRun -> killAllEnemies loops through the rooms -> skipToRoom(8) -> killBoss -> the victory/return path -> camp) must return to the camp baseline (no monotonic growth); report the three numbers.',
    'Write docs/critiques/certification-D-r' + round + '.md with frame-time tables and layout rects. Return the structured verdict.',
  ].join('\n\n'),
  E: (pfx, round) => [
    'You are the CAMP TRAVERSAL CERTIFICATION CRITIC (block E, round ' + round + ') for "Echoes". Fresh context.',
    preamble(pfx),
    'Camp boot (plain URL, no ?room), --timeout 180000. E.cmd("teleport", x, z) only to position the START of a leg; every leg is real keydown/keyup. Template legs live in tools/cert-gen.mjs (cert-camp-roads / cert-camp-stops / cert-camp-anvil / cert-camp-seats): regenerate them into your own prefixed files.',
    'E1 Roads: for every path in src/env/camp/spec.js (reading spec.js for road coordinates is allowed; nothing else), sweep the road by WASD in 2.2 s legs from both ends; each leg must travel >= 4.4 u at ~2.2 u/s (report moved and uPerSec per leg); no leg may stop early on a collider. The west road specifically: from (-4.0, 1.3) heading west and from (-7.0, 2.2) heading west.',
    'E2 campRoadsClear: E.cmd("campState").roadViolations must be an empty array; print the collider count and any "road" warnings from the console.',
    'E3 Interactables reachable by walking: hearth, every tent, stall, cart, anvil/forge, portal — report the final distance to each target (within its prompt radius from campState.prompt) and that the prompt becomes visible where the brief says it should (portal at minimum).',
    'E4 Cart off road: prove the cart collider does not intersect the east road (E1 legs + roadViolations).',
    'E5 Seats: party members stay seated (seatDrift ~ 0 over 5 s) and are not displaced when the player walks past them.',
    'E6 Visual: capture the camp at boot and after walking to the portal; view both PNGs; confirm props are stable (no pop/flicker between the two), the player has a contact shadow, and the version label is visible.',
    'Gates: all legs clear, zero violations, all targets reachable -> PASS; else FAIL (mustFix) with the leg table. Write docs/critiques/certification-E-r' + round + '.md. Return the structured verdict.',
  ].join('\n\n'),
}

for (const k of Object.keys(BLOCK_BRIEF)) {
  const orig = BLOCK_BRIEF[k]
  BLOCK_BRIEF[k] = (pfx, round) => orig(pfx, round) + '\n\n' + checkpoint('docs/critiques/certification-' + k + '-r' + round + '.md', pfx)
}

const REFUTE_LENSES = [
  { key: 'harness', desc: 'HARNESS-ARTIFACT HUNTER: navigation timeouts, concurrency contention (up to five headless browsers shared the server — re-run alone if the finding is fps/hitch/timing related), shared eval scope, wrong cmd argument semantics (bossHp takes a fraction), a capture taken before settle or across an HMR reload, a poll that returned ok:false and was misread, a keyboard event that never reached the canvas.' },
  { key: 'bar', desc: 'BAR LAWYER: does docs/REFERENCE_BAR.md or docs/BUILD_BRIEF.md actually require what the critic demanded, and was the right thing measured? Quote the rule. Decide mustFix (blocking for certification) vs advisory with the quoted rule.' },
]

function refutePrompt(block, f, lens, pfx) {
  return [
    'You are a REFUTER in the final certification of "Echoes". The block-' + block + ' critic reported this failure:\n' + JSON.stringify(f, null, 1),
    'Your lens: ' + lens.desc,
    preamble(pfx),
    'Try to REFUTE it: reproduce it yourself with fresh captures following its reproduce field exactly (read the critic\'s report named in the failure if it points to one; captures/ files of the critic are readable), then vary the conditions that could make it an artifact. Return refuted=true ONLY with evidence (your own capture names, numbers, event ticks) that the finding is an artifact or does not violate the bar; if it reproduces and violates the bar, refuted=false. mustFix=true if the bar or brief makes it blocking, false if advisory — quote the rule you relied on in reasoning.',
  ].join('\n\n')
}

function completenessPrompt(block, v, brief, pfx) {
  return [
    'You are the COMPLETENESS CRITIC. Block ' + block + ' of the final certification of "Echoes" returned PASS:\n' + JSON.stringify(v, null, 1),
    preamble(pfx),
    'Verify that every required probe in the block brief below was actually run WITH EVIDENCE: the capture files exist under captures/, the console.txt files show the polls/measurements, numbers are present rather than asserted, and each gate was applied as written (not more leniently). Read the report at ' + v.reportPath + ' and the console.txt files it names; spot-check at least two capture PNGs with Read. Gaps: a required probe with no evidence, a claim without a number, a gate softened, a probe that silently used a cmd where real input was required. mustRerun=true for any gap that could hide a failure.',
    'BLOCK BRIEF:\n' + brief,
  ].join('\n\n')
}

const OWNERSHIP = {
  A: 'src/render/**, src/env/**, src/vfx/** (or wherever particles/decals live), src/ui/hud/** for check 9, src/scenes/** for scene composition',
  B: 'src/sim/run.js, src/sim/world.js, src/scenes/**, src/ui/run/**, src/core/input.js, src/env/camp/** for the portal',
  C: 'src/sim/** (movement, combat, telegraphs, dash), src/render/** (flash/knockback visuals), src/ui/hud/** (threat pointers)',
  D: 'profiling-driven: src/render/**, src/sim/**, src/ui/** (layout), src/version.js',
  E: 'src/env/camp/**, src/scenes/camp.js, src/sim/movement.js (static colliders)',
}

function builderPrompt(r, round) {
  const pfx = 'certfix' + r.block + round + '-'
  return [
    'You are the FIX BUILDER for block ' + r.block + ' of the final certification of "Echoes" at ' + ROOT + ' (Bash path ' + POSIX + '; run every command from there). The vite dev server is ALREADY running on http://127.0.0.1:5199 — do not start another, do not kill node processes. Do not use mcp__Claude_Browser__* or mcp__claude-in-chrome__* tools.',
    'Read docs/TESTING.md, docs/REFERENCE_BAR.md, the relevant sections of docs/BUILD_BRIEF.md, the top of PROGRESS.md, and the critic report(s): ' + r.report + ' plus any docs/critiques/cert-score-*-r' + round + '.md for visual failures.',
    'CONFIRMED FAILURES TO FIX (all must-fix):\n' + JSON.stringify(r.failures, null, 1),
    'Capture harness: node tools/cert-capture.mjs (see docs/TESTING.md; pass --timeout 180000; prefix every capture/action file with "' + pfx + '"; write action JSON programmatically; IIFE-wrap evals). Analyzer: node tools/analyze.mjs [--box x,y,w,h] [--ref].',
    'Procedure per failure: (1) REPRODUCE it first with the critic\'s own probe (reproduce field / report) before changing anything and record the numbers; (2) find the root cause in src/** — primary ownership for this block: ' + OWNERSHIP[r.block] + '; touch other files only when the root cause lives there and say so; (3) fix it properly: no edits to docs/REFERENCE_BAR.md, tools/analyze.mjs, tools/capture.mjs, tools/cert-capture.mjs, no gate softening, no hiding a symptom (e.g. never disable a feature to pass a hue-band count); if a brief number must be tuned, add a dated tuning note to docs/BUILD_BRIEF.md section 11 like the Round D2 note; (4) re-run the same probe and analyzer and show BEFORE/AFTER numbers; (5) node tools/cert-capture.mjs shot ' + pfx + 'smoke --timeout 180000 must exit 0 with zero [PAGEERROR].',
    'Regression duty: re-run at least one probe of every other area you might have affected (a lighting/material change -> camp + combat analyzer numbers and the Ember band on a no-enemy frame; a sim change -> a quick startRun -> room clear -> banner check; a HUD change -> 1024x576 and 2560x1440 layout shots).',
    'RESUME: if git status shows uncommitted src changes left by a previous builder instance that was killed, read git diff, keep what is correct, and continue from there rather than starting over.',
    'Exit criteria (docs/TESTING.md): bump the patch version in src/version.js; git add -A && git commit -m "fix(<area>): <what> (vX.Y.Z)". Return done=true only with the commit hash, the new version, and the before/after numbers in selfChecks. If a failure cannot be fixed without a design decision, fix everything else, set done=false and explain in summary.',
  ].join('\n\n')
}

const VISUAL_JOBS = [
  { key: 'A-world',
    theme: 'WORLD LIGHTING, VALUE RANGE, COLOUR STORY, GROUND AND PROP DRESSING (rubric checks 1, 2, 4, 7 and the world half of 6). Give every run arena the deep-shadow-versus-fire funnel of the reference: a cool indigo/teal ambient with a real black point (darkest LUMA bucket populated; buckets 0-2 far above the current 7%), warm torch and monolith pools that read as pools against it, a vignette that measurably darkens corners versus centre, and a visible grade (no raw saturated green). Move the Act-1 grass out of the reserved heal band (hue away from 110-150 deg while keeping sat 0.55-0.65 per the art bible) so heal numerals and heal rings own green. Ring EVERY arena edge (left, right, bottom, not only the top wall) with props - fences, rocks, stumps, barricades, torch towers, banners - while keeping >= 60% of the floor navigable. Give the boss room its own dressing (pillar/statue/vase ring per Reference B). Add the in-world peddler stall with a lantern for the room-7 shop variant and keep fireflies and torch flicker alive while the shop is open. Fix the camp forge flame hue out of the danger band (amber 30-40 deg like the hearth). The camp frame must keep or beat its round-1 scores.',
    ownership: 'src/env/** (ground, foliage, colors, flame, props, walls, variants, layout, camp), src/render/stage.js (lights, exposure, bloom/vignette/grade post stack), and src/render/toon.js + src/render/glow.js only for global outline/halo parameters. Do NOT edit creature rigs, skill/tech VFX, numbers, src/ui/**, or src/sim/**.' },
  { key: 'A-hud',
    theme: 'UI POLISH AND THE SHOP SCREEN (rubric check 9 on every frame; shop frame checks 1, 2, 5, 7, 8, 9, 10). Skill slots get drawn icons instead of text abbreviations plus a radial cooldown sweep; add a location label top-left and a Glint currency counter top-right like Reference D; the boss plate gets an icon medallion, phase pips and ornamental caps. The shop must stop veiling the world: remove the full-screen charcoal modal and the backdrop blur so the lit arena and the party stay fully visible (at most a light 10-15% dim), and present the Peddler shelf as a compact ornate textured panel (parchment/wood grain, glow on plaques and on the Advance button, drawn card icons instead of unicode glyphs, no header wrap on Ascend, hover feedback) with real buy feedback (card flip or coin-fly plus stamp slam animated over >= 15 frames) and the existing deny shake kept. Rarity rims must be palette colours (Bone / Signal Blue / Hearth Amber are all art-bible colours - keep them). Every HUD element must still fit 1024x576 and 2560x1440 without overlap.',
    ownership: 'src/ui/** (hud, run, socket, bookends) and their CSS; src/render/numbers.js only if numeral styling is needed. Do NOT edit src/env/**, src/render/** rigs or VFX, or src/sim/**.' },
  { key: 'A-vfx',
    theme: 'CREATURE READ, VFX LAYERING, GROUNDING AND MOTION JUICE (rubric checks 3, 5, 8, 10 and the creature half of 6). The mantis needs a real creature silhouette (head, limbs, body mass) readable at 50% zoom; the party must not fuse into one bloom-blown blob under a cast (clamp or threshold the cast bloom, keep dark outlines); the Hollow Stag idle pose must read as a stag (head, muzzle, legs, antlers) rather than an obelisk, its crown glow must keep a visible source shape under bloom, and it needs a real contact shadow; regular enemies lose violet accents (indigo/blue instead - violet is god-stuff only). Every projectile = coloured core + coloured glow + trail + particles with a ground shadow; telegraphs = dark scorched core + bright Ember rim + ember particles; quakes leave lingering scorch decals; hits spawn debris/smoke particles so state().vfx.particles is > 0 during combat. Knockback must be visible (>= 0.3 u of travel over several ticks) and kills / boss stomps must emit screenshake events that move the camera.',
    ownership: 'src/render/enemies/**, src/render/boss/**, src/render/allies/**, src/render/critters/**, src/render/skillfx/**, src/render/techfx/**, src/render/vfx/**, src/render/numbers.js, src/render/camera.js for shake; in src/sim/** ONLY the knockback magnitude/duration and the screenshake/hitstop event emission. Another builder owns the room-clear numeral bug in src/sim/run.js + src/sim/world.js - do not touch that code path. Do NOT edit src/env/**, src/render/stage.js, or src/ui/**.' },
]
const JOB_OWNERSHIP = {
  C: 'src/sim/run.js, src/sim/world.js, src/scenes/** (the room_cleared transient sweep that wipes the numeral pool on the kill tick). Do NOT edit src/render/** or src/ui/** - other builders own them concurrently.',
  B: OWNERSHIP.B, E: OWNERSHIP.E, D: OWNERSHIP.D,
}
const SHOULDFIX_THEME = {
  D: 'PERFORMANCE HYGIENE. (1) Dispose geometries/materials when enemies, decals and transient VFX despawn so renderer.info.memory.geometries returns to the camp baseline after every run (currently +115 per run). (2) Remove the two-stage rAF stall (115 + 212-236 ms) of the legendary draft card: replace the expensive rn-shimmer / backdrop-filter animation with a cheap transform/opacity or canvas effect. (3) Eliminate the in-wave single-frame hitches of 140-200 ms (first-use shader/material compilation or particle allocation): precompile materials (renderer.compile) or warm-up spawn at room load, pool particles, so that no frame gap > 100 ms occurs after the first 3 s of a room. Verify each with the D critic probes (captures/certD1-* action files are reusable) alone on a quiet server.',
}
function jobPrompt(j, round) {
  const pfx = 'certfix' + j.key.replace(/[^A-Za-z0-9]/g, '') + round + '-'
  return [
    'You are the FIX BUILDER "' + j.key + '" (round ' + round + ') for the final certification of "Echoes" at ' + ROOT + ' (Bash path ' + POSIX + '; run every command from there). The vite dev server is ALREADY running on http://127.0.0.1:5199 - do not start another, do not kill node processes. Do not use mcp__Claude_Browser__* or mcp__claude-in-chrome__* tools.',
    'YOUR THEME: ' + j.theme,
    'FILE OWNERSHIP (hard rule): ' + j.ownership + (j.alone ? ' You run ALONE after the other builders finished.' : ' Other builders (' + j.others + ') are editing OTHER files in the SAME working tree right now: never edit outside your ownership; vite HMR reloads triggered by their edits can abort your captures (a navigation timeout or a [vite] reload mid-capture is not a defect - retry); src/version.js and the git log will move under you.'),
    'Read docs/TESTING.md, docs/REFERENCE_BAR.md (and VIEW docs/reference/pass-the-fear.png with the Read tool), the relevant docs/BUILD_BRIEF.md sections (the art-bible palette is binding), the top of PROGRESS.md, and the critic reports: ' + j.reports + '.',
    'MUST-FIX items with the pixel-anchored notes of three independent scorers per rubric cell (every cell in your theme must reach a clear 2, not a marginal 1, because each frame needs >= 16/20 under the MINIMUM of the three scorers):\n' + JSON.stringify(j.failures, null, 1),
    j.shouldFix.length ? 'SHOULD-FIX items (non-blocking, but real defects - fix the ones in your theme in this pass):\n' + JSON.stringify(j.shouldFix, null, 1) : 'No should-fix items.',
    'Harness: node tools/cert-capture.mjs shot|seq <name> [--url] [--settle] [--actions file.json] [--w --h --zoom] [--timeout 180000] (see docs/TESTING.md; prefix every capture, action file and generator with "' + pfx + '"; write action JSON programmatically; wrap evals in IIFEs; the technician generator tools/certA1-gen.mjs shows the exact certification frame conditions: seed 4242, camp boot / Act-1 mid-wave with >= 3 enemies and a live telegraph / skipToRoom 7 shop / skipToRoom 8 boss during quake 2+ with adds). Analyzer: node tools/analyze.mjs [--box x,y,w,h] [--ref] <png>. Self-score your frames against every listed cell with the analyzer numbers the scorers used (LUMA buckets, HUEMIX, FLAT, HUES bands, --box regions) AND by viewing the PNGs at 100% and with --zoom 0.5, side by side with docs/reference/pass-the-fear.png.',
    'Procedure per item: (1) reproduce with the capture conditions and record BEFORE numbers; (2) root-cause inside your files; (3) fix properly - no edits to docs/REFERENCE_BAR.md, tools/analyze.mjs, tools/capture.mjs, tools/cert-capture.mjs, tools/cert-gen.mjs, tools/certA1-gen.mjs; no gate softening; never disable a feature to pass a count; if a brief number must be tuned add a dated tuning note in docs/BUILD_BRIEF.md section 11; (4) AFTER numbers + viewed frames; (5) node tools/cert-capture.mjs shot ' + pfx + 'smoke --timeout 180000 must exit 0 with zero [PAGEERROR]; (6) regression duty: the camp frame keeps or beats its round-1 numbers (analyzer gates, Ember band), a run still plays (startRun -> a room clears -> banner), the HUD fits 1024x576 and 2560x1440 (HUD builder), fps stays >= 55 on the headless harness (measure with a 10 s rAF sample).',
    'COMMIT AS YOU GO: one git commit per coherent fix, each bumping the PATCH version in src/version.js (re-read it immediately before editing - other builders bump it too; if git reports index.lock, wait 5 s and retry). Message: fix(<area>): <what> (vX.Y.Z). RESUME: first run git log --oneline -40 and git status; if commits already address some of your items (a previous instance of you was killed) or uncommitted work exists in your files, verify with the probe and continue from there instead of redoing it.',
    'Return done=true only when every item in your theme is addressed, with the commit hashes, the final version, and BEFORE/AFTER numbers per item in selfChecks. If an item needs a design decision, fix everything else, set done=false and explain in summary.',
  ].join('\n\n')
}

function synthPrompt(history, certified) {
  return [
    'You are the CERTIFICATION SYNTHESIZER for "Echoes" at ' + ROOT + ' (Bash path ' + POSIX + '). Write docs/critiques/certification.md from the round data below (do not run the game; do not modify src/**; do not git commit).',
    'Overall verdict: ' + (certified ? 'CERTIFIED' : 'REJECTED') + ' (computed by the orchestrator: CERTIFIED means every block passed in the final round).',
    'ROUND DATA (JSON):\n' + JSON.stringify(history, null, 1),
    'Structure: 1) Verdict line with version (read src/version.js) and the git HEAD hash (git log -1 --format=%h). 2) Visual rubric table: for each of camp/combat/shop/boss the final 10 check scores, totals and the adjudicated cells, with the strongest pixel-anchored notes. 3) One section per probe block (B loop, C responsiveness, D performance/chrome, E camp traversal): gates, measured numbers, verdict. 4) Fix rounds: what was rejected, what was fixed, commit hashes. 5) Remaining advisories (non-blocking), consolidated and deduplicated. 6) Comparison paragraph against the reference screenshots: where the game matches/exceeds them and where it still falls short. Cite capture names and the per-block reports docs/critiques/certification-*-r*.md and cert-score-*-r*.md. Return a 10-line plain-text summary of the verdict.',
  ].join('\n\n')
}

// ---------------- block runners ----------------
async function runVisualBlock(round) {
  const pfx = 'certA' + round + '-'
  const cap = await ag(capturePrompt(pfx, round), { label: 'capture:frames r' + round, phase: 'Certify', schema: CAPTURE })
  if (!cap || !cap.frames || !cap.frames.length) throw new Error('dead: capture technician r' + round)
  const scorers = (await parallel(LENSES.map((lens) => () =>
    ag(scorerPrompt(lens, cap, pfx, round), { label: 'score:' + lens.key + ' r' + round, phase: 'Certify', schema: SCORE })
      .then((r) => (r ? Object.assign({}, r, { lens: lens.key }) : null))))).filter(Boolean)
  log('A r' + round + ': ' + scorers.length + '/3 scorers returned')
  if (scorers.length < LENSES.length) throw new Error('dead: ' + (LENSES.length - scorers.length) + ' scorer(s) r' + round)
  const table = {}
  for (const f of FRAMES) { table[f] = {}; for (let c = 1; c <= 10; c++) table[f][c] = { scores: [], notes: [] } }
  for (const s of scorers) for (const fr of s.frames || []) for (const ch of fr.checks || []) {
    const cell = table[fr.frame] && table[fr.frame][ch.id]
    if (!cell) continue
    cell.scores.push(ch.score)
    cell.notes.push('[' + s.lens + ' -> ' + ch.score + '] ' + ch.note)
  }
  const disputes = []
  for (const f of FRAMES) for (let c = 1; c <= 10; c++) {
    const cell = table[f][c]
    if (!cell.scores.length) continue
    const mn = Math.min(...cell.scores), mx = Math.max(...cell.scores)
    if (mn === 0 || mx - mn >= 2) disputes.push({ frame: f, check: c, scores: cell.scores, notes: cell.notes })
  }
  log('A r' + round + ': ' + disputes.length + ' disputed cells to adjudicate')
  const adj = await parallel(disputes.map((d, i) => () =>
    ag(adjudicatePrompt(d, cap, pfx, i + 1), { label: 'adjudicate:' + d.frame + '#' + d.check + ' r' + round, phase: 'Verify', schema: ADJ })))
  if (adj.some((a) => !a)) throw new Error('dead: adjudicator r' + round)
  const finalScores = {}
  const frameResults = []
  const failures = []
  const advisories = []
  FRAMES.forEach((f) => {
    finalScores[f] = {}
    let total = 0, zeros = 0, scored = 0
    for (let c = 1; c <= 10; c++) {
      const cell = table[f][c]
      if (!cell.scores.length) continue
      scored++
      const di = disputes.findIndex((d) => d.frame === f && d.check === c)
      const a = di >= 0 ? adj[di] : null
      const score = a ? a.score : Math.min(...cell.scores)
      const evidence = cell.notes.join(' | ') + (a ? ' || ADJUDICATED ' + a.score + ': ' + a.evidence : '')
      finalScores[f][c] = { score, evidence, adjudicated: !!a }
      total += score
      if (score === 0) zeros++
    }
    const pass = scored === 10 && total >= 16 && zeros === 0
    frameResults.push({ frame: f, total, zeros, scored, pass })
    for (let c = 1; c <= 10; c++) {
      const cell = finalScores[f][c]
      if (!cell) continue
      const item = { id: 'A-' + f + '-c' + c, title: f + ' frame: check ' + c + ' ' + CHECK_TITLES[c - 1] + ' scored ' + cell.score + '/2', evidence: cell.evidence, mustFix: !pass, reproduce: 'Capture technician conditions for the ' + f + ' frame (seed 4242): ' + ((cap.frames.find((x) => x.name === f) || {}).stateSummary || ''), suspectFiles: [] }
      if (cell.score <= 1 && !pass) failures.push(item)
      else if (cell.score === 1) advisories.push({ title: item.title, evidence: cell.evidence })
    }
  })
  const pass = frameResults.every((r) => r.pass)
  log('A r' + round + ': ' + frameResults.map((r) => r.frame + ' ' + r.total + '/20' + (r.zeros ? ' (' + r.zeros + ' zero)' : '')).join(', ') + ' -> ' + (pass ? 'PASS' : 'FAIL'))
  return { block: 'A', pass, report: 'docs/critiques/cert-score-{ref,bible,player}-r' + round + '.md', failures, advisories, detail: { frameResults, finalScores, capture: cap } }
}

async function runProbeBlock(block, round) {
  const pfx = 'cert' + block + round + '-'
  const brief = BLOCK_BRIEF[block](pfx, round)
  let v = await ag(brief, { label: 'critic:' + block + ' r' + round, phase: 'Certify', schema: VERDICT })
  if (!v) throw new Error('dead: critic ' + block + ' r' + round)
  let completeness = null
  if (v.verdict === 'PASS') {
    completeness = await ag(completenessPrompt(block, v, brief, pfx + 'cc-'), { label: 'completeness:' + block + ' r' + round, phase: 'Verify', schema: COMPLETE })
    if (!completeness) throw new Error('dead: completeness ' + block + ' r' + round)
    const gaps = completeness ? completeness.gaps.filter((g) => g.mustRerun) : []
    if (gaps.length) {
      log(block + ' r' + round + ': PASS had ' + gaps.length + ' must-rerun gaps -> re-running critic')
      const v2 = await ag(brief + '\n\nA completeness audit of a previous PASS found these gaps — you MUST cover them with evidence this time (use prefix ' + pfx + 'b-):\n' + JSON.stringify(gaps, null, 1), { label: 'critic:' + block + ' r' + round + ' (rerun)', phase: 'Certify', schema: VERDICT })
      if (!v2) throw new Error('dead: critic rerun ' + block + ' r' + round)
      v = v2
    }
  }
  const confirmed = []
  const refutations = []
  for (const f of v.failures.filter((x) => x.mustFix)) {
    const votes = await parallel(REFUTE_LENSES.map((lens, i) => () =>
      ag(refutePrompt(block, Object.assign({}, f, { report: v.reportPath }), lens, pfx + 'ref' + i + '-'), { label: 'refute:' + lens.key + ' ' + f.id, phase: 'Verify', schema: REFUTE })))
    const valid = votes.filter(Boolean)
    if (valid.length < REFUTE_LENSES.length) throw new Error('dead: refuter for ' + f.id)
    const refutedAll = valid.length === REFUTE_LENSES.length && valid.every((x) => x.refuted)
    const lawyer = votes[1]
    const mustFix = !refutedAll && (lawyer ? lawyer.mustFix : true)
    refutations.push({ id: f.id, votes: valid.map((x, i) => ({ lens: REFUTE_LENSES[i] ? REFUTE_LENSES[i].key : i, refuted: x.refuted, confidence: x.confidence, mustFix: x.mustFix, reasoning: x.reasoning })), refutedAll, mustFix })
    if (mustFix) confirmed.push(Object.assign({}, f, { refutation: valid.map((x) => x.evidence).join(' || ') }))
    else v.advisories.push({ title: (refutedAll ? '[refuted] ' : '[downgraded] ') + f.title, evidence: f.evidence + ' || ' + valid.map((x) => x.reasoning).join(' || ') })
  }
  const pass = confirmed.length === 0
  log(block + ' r' + round + ': critic ' + v.verdict + ', ' + v.failures.length + ' reported, ' + confirmed.length + ' confirmed must-fix -> ' + (pass ? 'PASS' : 'FAIL'))
  return { block, pass, report: v.reportPath, failures: confirmed, advisories: v.advisories, detail: { verdict: v, completeness, refutations } }
}

function runBlock(block, round) {
  return block === 'A' ? runVisualBlock(round) : runProbeBlock(block, round)
}

// ---------------- main loop ----------------
const history = []
let pending = ORDER.slice()
let round = (typeof args === 'object' && args && args.roundBase) ? args.roundBase : 1
const FIRST_ROUND = round
const LAST_ROUND = round + MAX_ROUNDS - 1
let certified = false
let aborted = false
const preset = (typeof args === 'object' && args && args.round1) ? args.round1 : ((typeof args === 'object' && args && args.useRound1Preset) ? ROUND1_PRESET : null)
const summarize = (r) => ({ block: r.block, pass: r.pass, report: r.report, failures: r.failures, advisories: r.advisories, detail: r.detail })
while (round <= LAST_ROUND) {
  let results = []
  let dead = []
  if (preset && round === FIRST_ROUND) {
    results = Object.values(preset).map((r) => ({ block: r.block, pass: r.pass, report: r.report, failures: r.failures || [], advisories: r.advisories || [], detail: { verdict: { failures: r.nonBlocking || [] } } }))
    log('Round ' + round + ' results loaded from args: ' + results.map((r) => r.block + ':' + (r.pass ? 'PASS' : 'FAIL')).join(', '))
  } else {
    log('Round ' + round + ': certifying blocks ' + pending.join(', '))
    const raw = await parallel(pending.map((b) => () => runBlock(b, round)))
    dead = pending.filter((b, i) => !raw[i])
    results = raw.filter(Boolean)
  }
  const failed = results.filter((r) => !r.pass)
  const entry = { round, blocks: pending.slice(), results: results.map(summarize), dead, fixes: [] }
  history.push(entry)
  if (dead.length) { log('ABORT round ' + round + ': ag(s) died for block(s) ' + dead.join(', ') + ' (usage limit?) - resume this workflow to continue'); aborted = true; break }
  log('Round ' + round + ': ' + (results.length - failed.length) + ' pass / ' + failed.length + ' fail')
  if (!failed.length) { certified = true; break }
  if (round === LAST_ROUND) break
  const jobs = []
  const late = []
  for (const r of results) {
    const nonBlocking = (r.detail && r.detail.verdict && r.detail.verdict.failures) ? r.detail.verdict.failures.filter((f) => !f.mustFix) : []
    if (r.block === 'A' && !r.pass) {
      for (const vj of VISUAL_JOBS) jobs.push({ key: vj.key, block: 'A', theme: vj.theme, ownership: vj.ownership, failures: r.failures, shouldFix: r.advisories.map((a) => ({ id: 'A-advisory', title: a.title, evidence: a.evidence })), reports: r.report, others: VISUAL_JOBS.filter((x) => x.key !== vj.key).map((x) => x.key).concat(['C']).join(', '), alone: false })
    } else if (!r.pass && r.failures.length) {
      jobs.push({ key: r.block, block: r.block, theme: 'Fix the confirmed must-fix failures of block ' + r.block + ' at their root cause.', ownership: JOB_OWNERSHIP[r.block] || OWNERSHIP[r.block], failures: r.failures, shouldFix: nonBlocking, reports: r.report, others: 'A-world, A-hud, A-vfx', alone: false })
    } else if (r.pass && nonBlocking.length) {
      late.push({ key: r.block + '-shouldfix', block: r.block, theme: SHOULDFIX_THEME[r.block] || ('Fix the non-blocking defects reported by block ' + r.block + '.'), ownership: OWNERSHIP[r.block] + ' - you run alone, so any file is open when the root cause lives there.', failures: [], shouldFix: nonBlocking.concat(r.advisories.map((a) => ({ id: r.block + '-advisory', title: a.title, evidence: a.evidence }))), reports: r.report, others: '', alone: true })
    }
  }
  log('Fix phase r' + round + ': ' + jobs.map((j) => j.key).join(', ') + (late.length ? ' then alone: ' + late.map((j) => j.key).join(', ') : ''))
  await parallel(jobs.map((j) => () => ag(jobPrompt(j, round), { label: 'fix:' + j.key + ' r' + round, phase: 'Fix', schema: BUILD }).then((b) => {
    entry.fixes.push({ job: j.key, result: b })
    if (!b) { log('ABORT: fix builder ' + j.key + ' died - resume this workflow to continue'); aborted = true }
    else log('Fix ' + j.key + ' r' + round + ': ' + (b.done ? 'done ' + b.commit + ' ' + b.version : 'INCOMPLETE: ' + b.summary))
    return b
  })))
  if (!aborted) for (const j of late) {
    const b = await ag(jobPrompt(j, round), { label: 'fix:' + j.key + ' r' + round, phase: 'Fix', schema: BUILD })
    entry.fixes.push({ job: j.key, result: b })
    if (!b) { log('ABORT: fix builder ' + j.key + ' died - resume this workflow to continue'); aborted = true; break }
    log('Fix ' + j.key + ' r' + round + ': ' + (b.done ? 'done ' + b.commit + ' ' + b.version : 'INCOMPLETE: ' + b.summary))
  }
  if (aborted) break
  pending = ORDER.slice()
  round++
}
if (aborted) return { certified: false, aborted: true, rounds: history.length, history }
log('Certification loop finished: ' + (certified ? 'CERTIFIED' : 'NOT certified') + ' after ' + history.length + ' round(s)')
const synth = await ag(synthPrompt(history, certified), { label: 'synthesize:certification.md', phase: 'Adjudicate' })
return { certified, rounds: history.length, summary: synth, history }
