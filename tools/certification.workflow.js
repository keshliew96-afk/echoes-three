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
  B: 'src/sim/run.js, src/sim/world.js, src/scenes/**, src/ui/run/**, src/env/camp/** for the portal',
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
let round = 1
let certified = false
let aborted = false
const preset = (typeof args === 'object' && args && args.round1) ? args.round1 : null
const summarize = (r) => ({ block: r.block, pass: r.pass, report: r.report, failures: r.failures, advisories: r.advisories, detail: r.detail })
while (round <= MAX_ROUNDS) {
  let results = []
  let dead = []
  if (preset && round === 1) {
    results = Object.values(preset).map((r) => ({ block: r.block, pass: r.pass, report: r.report, failures: r.failures || [], advisories: r.advisories || [], detail: { verdict: { failures: r.nonBlocking || [] } } }))
    log('Round 1 results loaded from args: ' + results.map((r) => r.block + ':' + (r.pass ? 'PASS' : 'FAIL')).join(', '))
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
  if (round === MAX_ROUNDS) break
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
