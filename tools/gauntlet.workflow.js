export const meta = {
  name: 'echoes-gauntlet-loop',
  description: 'Gauntlet Loop: architect -> 8 module builders in dependency waves -> harsh fresh critics + refuters -> targeted fixes, looped until menu, save, audio, content, netcode and the core loop all pass',
  phases: [
    { title: 'Plan', detail: 'architect writes contracts + ownership + measurable gates; adversarial plan review; revision' },
    { title: 'Build', detail: 'W1 menu||audio, W2 systems||world content, W3 save||net-core, W4 net-play, W5 integration' },
    { title: 'Critique', detail: 'six fresh critics with blind benchmark checklists; completeness audits on every PASS' },
    { title: 'Verify', detail: 'two refuters per must-fix failure (harness-artifact hunter + spec lawyer)' },
    { title: 'Fix', detail: 'module-owned fix builders, two at a time, then the journey fixer alone' },
    { title: 'Report', detail: 'synthesize docs/gauntlet/REPORT.md' },
  ],
}

const ROOT = 'C:\\Users\\keshl\\OneDrive\\Desktop\\游戏制作\\echoes-three'
const POSIX = '/c/Users/keshl/OneDrive/Desktop/游戏制作/echoes-three'
const MAX_ROUNDS = 4
const CONCURRENCY = 2

// ---------------- concurrency gate + retry ----------------
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
  return gate(() => agent(p + '\n\nNOTE: a previous instance of you ended WITHOUT returning the structured output. Resume from your checkpoint file and existing work, then RETURN THE STRUCTURED RESULT via the StructuredOutput tool.', o))
}

// ---------------- the user's module specifications (verbatim) ----------------
const SPEC = {
  menu: 'MAIN MENU & SCREEN SETTINGS: Build a polished, modular title screen layout (New Game, Load Game, Settings, Exit). Include fully functional display setting sub-menus (Resolution scaling, Windowed/Fullscreen toggle, V-Sync, and Frame-rate limits) that dynamically alter the game window rendering context.',
  save: 'PERSISTENT SAVE/LOAD SYSTEM: Implement a robust state management system that serializes the complete game state (player position, inventory, world variables, high scores) into a local file structure (JSON/local storage). Create a user-facing save-slot management menu.',
  audio: 'AUDIO ENGINE & MIXER SETTINGS: Build an audio manager handling background ambient music and spatial SFX triggers. Provide a configuration UI with decoupled linear/logarithmic volume sliders for Master, Music, and Sound Effects channels.',
  content: 'CONTENT EXTENSION: Expand the core gameplay loop by introducing distinct level configurations, escalating difficulty curves, varied enemy/obstacle types, expand skill slot to 8 slot, design more skill and node, and interactive environmental assets.',
  net: 'MULTIPLAYER ARCHITECTURE: Implement a synchronization framework (e.g., peer-to-peer or client-server architecture) to support real-time network play. The network sub-agent must establish socket connections, handle player matchmaking/lobby rooms, implement delta compression for player state synchronization (position, orientation, actions), and build a predictive lag-compensation mechanism. The critic agent must stress-test packet loss simulation, race conditions, and connection drop-offs to ensure seamless network replication without breaking local gameplay loops.',
  overall: 'Take our existing core game code and transform this from a prototype into a fully featured, production-ready title, benchmarked against current UX standards. Loop and refine until the interface navigation, persistent state transitions, and audio balancing are completely seamless and robust. Every module must function perfectly without breaking the existing core gameplay loops.',
}

// ---------------- schemas ----------------
const FAILURE = {
  type: 'object', required: ['id', 'title', 'evidence', 'mustFix', 'reproduce', 'suspectFiles'],
  properties: { id: { type: 'string' }, title: { type: 'string' }, evidence: { type: 'string' }, mustFix: { type: 'boolean' }, reproduce: { type: 'string' }, suspectFiles: { type: 'array', items: { type: 'string' } } },
}
const VERDICT = {
  type: 'object', required: ['verdict', 'summary', 'failures', 'advisories', 'probesRun', 'reportPath', 'benchmark'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, summary: { type: 'string' },
    failures: { type: 'array', items: FAILURE },
    advisories: { type: 'array', items: { type: 'object', required: ['title', 'evidence'], properties: { title: { type: 'string' }, evidence: { type: 'string' } } } },
    probesRun: { type: 'array', items: { type: 'string' } }, reportPath: { type: 'string' },
    benchmark: { type: 'string', description: 'the real-world systems compared against and the checklist score (met / total)' },
  },
}
const BUILD = { type: 'object', required: ['done', 'summary', 'filesChanged', 'commits', 'version', 'selfChecks', 'checkpoint'], properties: { done: { type: 'boolean' }, summary: { type: 'string' }, filesChanged: { type: 'array', items: { type: 'string' } }, commits: { type: 'array', items: { type: 'string' } }, version: { type: 'string' }, selfChecks: { type: 'string' }, checkpoint: { type: 'string' } } }
const REVIEW = { type: 'object', required: ['sound', 'gaps'], properties: { sound: { type: 'boolean' }, gaps: { type: 'array', items: { type: 'object', required: ['title', 'why', 'mustFix'], properties: { title: { type: 'string' }, why: { type: 'string' }, mustFix: { type: 'boolean' } } } } } }
const REFUTE = { type: 'object', required: ['refuted', 'confidence', 'reasoning', 'evidence', 'mustFix'], properties: { refuted: { type: 'boolean' }, confidence: { type: 'string', enum: ['low', 'medium', 'high'] }, reasoning: { type: 'string' }, evidence: { type: 'string' }, mustFix: { type: 'boolean' } } }
const COMPLETE = { type: 'object', required: ['thorough', 'gaps'], properties: { thorough: { type: 'boolean' }, gaps: { type: 'array', items: { type: 'object', required: ['title', 'why', 'mustRerun'], properties: { title: { type: 'string' }, why: { type: 'string' }, mustRerun: { type: 'boolean' } } } } } }

// ---------------- shared prompt pieces ----------------
function context(pfx, role) {
  return [
    'PROJECT: "Echoes", a Three.js top-down party roguelike (Vite + three ^0.185, vanilla ESM, deterministic 60 Hz fixed-tick sim with seeded RNG) at ' + ROOT + ' (Bash path: ' + POSIX + '). Run every command from that directory. Git branch: gauntlet (never switch branches, never touch master, never push).',
    'THIS ITERATION ("Gauntlet Loop") turns the certified v0.4.63 prototype into a production-ready title. Overall goal (user, verbatim): ' + SPEC.overall,
    'Read first: docs/gauntlet/PLAN.md (the binding architecture, file-ownership map, contracts and measurable acceptance gates for this iteration — once it exists), docs/TESTING.md (harness contract), docs/BUILD_BRIEF.md (design truth + the locked "Storybook Against the Void" art bible palette), docs/REFERENCE_BAR.md (visual rubric), the top of PROGRESS.md.',
    'DEV SERVER: vite is ALREADY running on http://127.0.0.1:5199 (HMR on). Never start another vite DEV server and never kill node processes you did not start. You MAY start your own short-lived processes on YOUR ports only (see PLAN.md port scheme: e.g. the network server `node server/index.mjs --port <yours>` or `npx vite preview --port <yours>` for production-build checks) with Bash run_in_background, and you MUST kill exactly those PIDs before you return. Other agents edit src/** concurrently: an HMR reload or navigation timeout mid-capture is not a defect — retry up to 3 times.',
    'HARNESS: node tools/cert-capture.mjs shot|seq <name> [--url u] [--settle ms] [--actions file.json] [--w --h --zoom] [--timeout 180000] (captures/<name>.png + <name>.console.txt; exit 1 = uncaught page error; extra action types loop/if/shot). node tools/analyze.mjs [--box x,y,w,h] [--ref] <png>. Write action JSON programmatically; wrap evals in IIFEs; async IIFEs poll window.__echoes and RETURN state so it lands in console.txt. You may write NEW tools (prefixed with ' + pfx + ') e.g. multi-page puppeteer harnesses, audio probes launched with --autoplay-policy=no-user-gesture-required, network conditioners; NEVER edit tools/cert-capture.mjs, tools/capture.mjs, tools/analyze.mjs, tools/cert-gen.mjs or another agent\'s prefixed tools. Every capture/action/tool file you create starts with "' + pfx + '".',
    'DEBUG API window.__echoes: version, tick, fps, seed, events, state(), runUi(), hud.*, on(type,fn), cmd(name,...args) incl. startRun, skipToRoom(n), killAllEnemies, bossHp(FRACTION), campState, teleport, spawn, setHp, giveSkill, grantNode — plus the new namespaces this iteration adds (see PLAN.md: e.g. __echoes.app, .settings, .save, .audio, .net).',
    'PLATFORM HONESTY (binding): this is a browser game. Features the platform cannot do must be implemented as their truthful browser equivalent and labelled honestly in the UI — never a fake toggle that changes nothing. Every setting must measurably change something a critic can observe.',
    role,
    'Your final message is machine-read: return only the structured output.',
  ].join('\n\n')
}

function checkpoint(file, pfx) {
  return 'CHECKPOINT / RESUME (usage limits kill agents mid-run; your checkpoint file is the resume point). FIRST check whether ' + file + ' exists. If its first line is "STATUS: COMPLETE", a previous instance finished: verify its claims still hold (git log, spot-check two captures or run the smoke), and return the structured result from it WITHOUT redoing the work. If it says "STATUS: PARTIAL" (or has no STATUS line), continue from the last completed step recorded there, reusing existing commits and ' + pfx + '* files. If it does not exist, create it immediately with "STATUS: PARTIAL" as line 1 and append each completed step (with evidence) as soon as it is done. When finished, rewrite line 1 to "STATUS: COMPLETE" and put the verdict/summary on line 2.'
}

const BUILDER_ROLE = [
  'ROLE: BUILDER. Build production-quality code, not a demo. Verify everything you claim against the RUNNING game (captured pixels, console, debug-API state) — never assume from code.',
  'COMMIT AS YOU GO: one git commit per coherent step on branch gauntlet, each bumping the PATCH of src/version.js (re-read it immediately before editing; other builders bump it too). Message: feat|fix(<area>): <what> (vX.Y.Z), ending with the line "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>". If git reports index.lock, wait 5 s and retry. Never commit a state whose smoke capture exits 1.',
  'SMOKE (before every commit): node tools/cert-capture.mjs shot <pfx>smoke --settle 4000 --timeout 180000 must exit 0 with zero [PAGEERROR]; the existing core loop must still boot and play (camp -> portal -> a room clears) — the harness boot params documented in PLAN.md/TESTING.md must keep working.',
  'OWNERSHIP (hard rule): edit only the files PLAN.md assigns to your key; for the shared files PLAN.md lists, make small anchored edits and re-read immediately before editing. If a root cause lives in another owner\'s file, make the minimal edit and say so in selfChecks.',
  'RESUME: start with git log --oneline -40 and git status; if commits already cover some of your steps or uncommitted work exists in your files (a previous instance was killed), verify it and continue from there.',
].join('\n')

const CRITIC_ROLE = [
  'ROLE: HARSH CRITIC with completely fresh context. Never modify src/**, server/**, docs/gauntlet/PLAN.md, docs/BUILD_BRIEF.md or another agent\'s report; never commit. Judge ONLY the running game: captured pixels (view PNGs with the Read tool), console logs, debug-API state, files written to storage, network traffic you measure — never code you read. Every claim cites a capture/log name plus numbers.',
  'BLIND BENCHMARK PROTOCOL: BEFORE you look at any Echoes capture, write into your report a benchmark checklist of how the named real-world systems behave (concrete, testable items from your own knowledge of those shipped games/engines). Only then inspect Echoes and score it item by item (met / partially / not met, with evidence). A must-fix failure is: a spec requirement not met, a PLAN.md gate not met, a crash/page error, data loss, a broken existing core loop, or a benchmark item whose absence a player would feel as broken or unpolished. Vague praise and vague rejection are both failures of the critic.',
].join('\n')

// ---------------- plan phase ----------------
function architectPrompt(revision) {
  const pfx = 'gnt-arch-'
  return [
    'You are the LEAD ARCHITECT for the Gauntlet Loop iteration. Your output is the binding blueprint that eight builder agents will implement concurrently (two at a time, same working tree) and six fresh critics will judge. It must prevent file conflicts, define contracts precisely, and turn every requirement into a MEASURABLE gate.',
    context(pfx, BUILDER_ROLE),
    'THE FIVE MODULE SPECIFICATIONS (verbatim from the user):\n1. ' + SPEC.menu + '\n2. ' + SPEC.save + '\n3. ' + SPEC.audio + '\n4. ' + SPEC.content + '\n5. ' + SPEC.net,
    'BUILDER KEYS AND WAVES (fixed): W1 = M1 (app shell, title screen, settings framework, display settings) || M3 (audio engine, music, spatial SFX, mixer tab); W2 = M4a (systems content: 8 skill slots end-to-end incl. keys 5-8 and HUD, new skills and nodes, level configurations, difficulty curves, draft/shop pools) || M4b (world content: new enemy and obstacle/hazard types with rigs and telegraphs, interactive environmental assets, level/biome dressing); W3 = M2 (save/load: complete-state serialize/restore across every sim system, storage backends, save-slot menu, autosave, high scores) || M5a (network core: WebSocket server + protocol + transport, lobby/matchmaking server logic, delta-compressed snapshots, network conditioner, multi-client headless harness — NO src/sim edits in W3); W4 = M5b (network play: sim integration of remote-controlled party members, client prediction + reconciliation, entity interpolation, server-side lag-compensated hit rewind, lobby/matchmaking UI, reconnect UX); W5 = INT (integration: pause menu, full player journey title->settings->new game->camp->run->save->quit->load->multiplayer, cross-module wiring such as audio for new content and save/net interplay, production build).',
    'READ the codebase enough to map it: src/main.js (boot + render loop + URL params), src/render/stage.js (renderer, composer, pixel ratio), src/core/* (clock, input, events, rng, intents), src/sim/world.js and every src/sim/*.js (which systems hold state; skills.js and nodes.js already have serialize()), src/audio/synth.js (current procedural SFX, constant master volume), src/ui/hud/*, src/ui/run/*, src/ui/socket/*, src/scenes/camp.js + arena.js, src/env/*, src/render/enemies/*, docs/BUILD_BRIEF.md.',
    'WRITE docs/gauntlet/PLAN.md with these sections: (1) Architecture overview + app state machine (boot -> title -> camp <-> run; pause overlay; settings overlay; lobby; how the existing scenes are hosted). (2) FILE OWNERSHIP MAP per key (M1, M3, M4a, M4b, M2, M5a, M5b, INT) — disjoint wherever possible; list the unavoidable SHARED files (e.g. src/main.js, src/sim/world.js, src/core/constants.js, src/core/input.js) with the anchored regions each key may touch. (3) CONTRACTS as exported function signatures with semantics: settings store (get/set/subscribe/persist, versioned key), settings-tab registry, screen/menu manager + focus/navigation model (keyboard, mouse, gamepad), save API + schema v1 (top-level layout, per-system serialize()/restore() contract every sim module must implement, state-hash function, migration strategy, atomic write + corruption recovery, slot metadata incl. thumbnail/playtime/room/date), audio engine API (bus graph Master > Music/SFX/UI/Ambient, slider mapping math for BOTH the linear and the logarithmic/dB-perceptual modes, spatial panner model relative to the camera/listener, music state machine with crossfades, sim-event -> SFX mapping), content data formats (level config, difficulty curve formula, enemy/obstacle archetype, skill/node definitions consistent with the existing reinterpretation system), network protocol (message types, tick and snapshot rates, baseline/ack-based delta compression, quantization, input-seq prediction + reconciliation, interpolation delay, lag-compensation rewind window, conditioner parameters, lobby/matchmaking states, reconnect + host-drop policy, bandwidth budget per client). (4) CONTENT DESIGN: >= 3 distinct level configurations (acts/biomes with their own room tables, palettes within the art bible, hazards); a difficulty curve that escalates across rooms and acts with the formula and the numbers; >= 4 new enemy types and >= 3 obstacle/hazard types with distinct silhouettes and telegraphs; skill slots 4 -> 8 end to end; >= 8 new skills and >= 8 new nodes with their reinterpretations; >= 4 interactive environmental asset types (e.g. destructible cover, traps, shrines, levers/gates) — all within the art bible (Ember danger, Heal green, God-stuff violet reserved). Add the design as a dated extension section in docs/BUILD_BRIEF.md so builders and critics share one design truth. (5) PLATFORM-HONEST DISPLAY SETTINGS: resolution scaling = internal render scale of the drawing buffer; windowed/fullscreen = Fullscreen API with state sync on Esc/F11; V-Sync on = presentation paced by requestAnimationFrame, off = an explicitly labelled uncapped scheduler (state what is and is not possible in a browser compositor); frame-rate limits (30/60/120/144/unlimited) measured by rendered frames; Exit = confirm -> window.close() attempt -> honest farewell screen with Return. (6) HARNESS CONTRACT: the existing boot params (?scene=, ?room=, ?run=1, ?seed=) MUST keep working for the regression suite; define a menu-skip param and document it; the PORT SCHEME for each agent key\'s own network server / vite preview instances; the new debug-API namespaces (__echoes.app, .settings, .save, .audio, .net) with the probe functions critics need (e.g. save round-trip + state hash, audio bus RMS taps, net stats: rtt, loss, bytes/s, prediction error). (7) MEASURABLE ACCEPTANCE GATES per module with numbers (e.g. menu input-to-visual response < 100 ms; settings persist across reload; save round-trip state hash equal and the next 600 ticks after load bit-identical to an unsaved continuation; corrupted save is detected and never crashes; audio slider 50% = -X dB in log mode; no clipping above 0 dBFS; net: playable at 150 ms RTT + 10% loss, snapshot bytes with delta <= 30% of full, reconnect within N s, zero desyncs over M minutes, single-player unchanged). (8) BENCHMARK SYSTEMS per module that critics will compare against blind (name real shipped games/engines and why).',
    'THEN commit contract stubs so both W1 builders code against the same interfaces: minimal, compiling, behaviour-neutral modules (e.g. src/app/settings.js, src/app/screens.js, src/app/registry.js) and a server/ folder skeleton with package scripts (e.g. "net": "node server/index.mjs") as PLAN.md defines. Update docs/TESTING.md with the new harness rules. Bump src/version.js to 0.5.0. Smoke must exit 0 and the camp must still boot with the documented params.',
    revision ? 'REVISION PASS: a plan reviewer found these gaps; fix every mustFix gap in PLAN.md (and stubs if affected), commit, and list what you changed in summary:\n' + JSON.stringify(revision, null, 1) : '',
    checkpoint('docs/gauntlet/build-ARCH' + (revision ? '-rev' : '') + '.md', pfx),
    'Return the BUILD structured result (done=true only when PLAN.md, the BUILD_BRIEF extension, the stubs and TESTING.md are committed and the smoke passes).',
  ].filter(Boolean).join('\n\n')
}

function planReviewPrompt() {
  return [
    'You are the PLAN REVIEWER: an adversarial senior engineer with fresh context. Review docs/gauntlet/PLAN.md (and the design extension in docs/BUILD_BRIEF.md, the stubs it committed, docs/TESTING.md) BEFORE eight builders implement it.',
    context('gnt-planrev-', 'ROLE: REVIEWER. Do not modify any file. Read code only to check the plan fits the real codebase.'),
    'THE FIVE MODULE SPECIFICATIONS (verbatim):\n1. ' + SPEC.menu + '\n2. ' + SPEC.save + '\n3. ' + SPEC.audio + '\n4. ' + SPEC.content + '\n5. ' + SPEC.net,
    'Find gaps with mustFix=true for: any spec requirement not covered; any gate that is not measurable or is too lenient against current UX standards; a file-ownership conflict between keys scheduled in the same wave (W1 M1||M3, W2 M4a||M4b, W3 M2||M5a); a contract too vague for two independent builders to meet; a save design that cannot reach complete state or deterministic continuation; a network design that does not deliver socket connections, lobby/matchmaking, delta compression of position/orientation/actions, predictive lag compensation, or that could break single-player; a dishonest platform claim; missing harness support critics will need (debug probes, ports, boot params). mustFix=false for improvements. sound=true only if there are no mustFix gaps.',
  ].join('\n\n')
}

// ---------------- build phase ----------------
const BUILDERS = {
  M1: { spec: SPEC.menu, focus: 'App shell and screen manager, title screen (New Game, Load Game, Settings, Exit) with a live scene backdrop, settings framework with tabs, the Display tab (render-scale resolution scaling, windowed/fullscreen, V-Sync, frame-rate limit) applied live to the renderer and loop, settings persistence, keyboard/mouse/gamepad navigation with visible focus, confirm dialogs, apply/revert behaviour, and the harness menu-skip param. Load Game and the Audio tab are mounted through the contracts (M2 and M3 fill them).' },
  M3: { spec: SPEC.audio, focus: 'Audio engine replacing the constant-volume synth: bus graph (Master > Music / SFX / Ambient / UI) with a final limiter, procedural ambient music per state (camp, combat, boss, menu) with crossfades and intensity layers, spatial SFX for every existing sim event through panners relative to the camera listener, the Audio settings tab with Master/Music/SFX sliders each switchable between linear and logarithmic (dB-perceptual) mapping, mute, persistence, autoplay unlock, and debug-API taps for bus RMS/peak so critics can measure balance headless.' },
  M4a: { spec: SPEC.content, focus: 'SYSTEMS half of the content extension: skill slots 4 -> 8 end to end (sim, input keys 5-8, HUD command bar fitting 1024x576 to 2560x1440, draft/shop/socket UI), >= 8 new skills and >= 8 new nodes with reinterpretations and skill VFX, the level configurations (acts/biomes room tables) and the escalating difficulty curve wired into the run and wave director.' },
  M4b: { spec: SPEC.content, focus: 'WORLD half of the content extension: >= 4 new enemy types and >= 3 obstacle/hazard types (sim AI, rigs with readable silhouettes, Ember telegraphs), >= 4 interactive environmental asset types (sim + render + interaction prompts), and the per-level/biome arena dressing and palettes that make each level configuration visually distinct.' },
  M2: { spec: SPEC.save, focus: 'Complete-state serialize()/restore() for every sim system (world, run, rooms, party, enemies, projectiles, zones, skills, nodes, build, RNG streams, content added in W2), schema v1 with versioning + migration, atomic localStorage writes with backup + corruption detection, JSON file export/import, the save-slot management menu (slots with metadata/thumbnail, save/overwrite/delete with confirmation, Load Game from the title), autosave at safe points, persistent high scores/records, and the round-trip determinism probe in the debug API.' },
  M5a: { spec: SPEC.net, focus: 'Network CORE with no src/sim edits: Node WebSocket server (server/**) with lobby rooms, matchmaking (quick match + room codes), the protocol and transport, snapshot delta compression against acked baselines with quantization, a configurable network conditioner (latency, jitter, loss, duplication, reordering, disconnects) usable by critics, and a multi-client headless harness. Client-side transport module in src/net/**.' },
  M5b: { spec: SPEC.net, focus: 'Network PLAY: remote humans control party members (AI fills empty seats) through the sim input layer, host-authoritative simulation, client-side prediction with input-sequence reconciliation, entity interpolation, server-side lag-compensated hit rewind, desync detection via state hashes, lobby/matchmaking UI in the menu, reconnect and host-drop UX — single-player must stay bit-identical to before.' },
  INT: { spec: SPEC.overall, focus: 'INTEGRATION: in-game pause menu (resume, settings, save, quit to title), the full player journey across all modules without dead ends, cross-module wiring (audio for new enemies/skills/interactables, save disabled or host-only in network play, settings applied on boot), removal of dev-only chrome from player builds (fps meter etc. behind a debug flag), `npm run build` production bundle that boots and plays under `vite preview`, and a regression pass on the original core loop.' },
}
const WAVES = [['M1', 'M3'], ['M4a', 'M4b'], ['M2', 'M5a'], ['M5b'], ['INT']]

function builderPrompt(key, fixItems, round) {
  const b = BUILDERS[key]
  const pfx = fixItems ? 'gntfix' + key + round + '-' : 'gnt' + key + '-'
  const ck = fixItems ? 'docs/gauntlet/fix-' + key + '-r' + round + '.md' : 'docs/gauntlet/build-' + key + '.md'
  return [
    (fixItems ? 'You are the FIX BUILDER for module ' + key + ' (gauntlet round ' + round + ').' : 'You are BUILDER ' + key + ' of the Gauntlet Loop.') + ' Module specification (user, verbatim): ' + b.spec,
    'YOUR SCOPE: ' + b.focus,
    context(pfx, BUILDER_ROLE),
    'Implement exactly what docs/gauntlet/PLAN.md specifies for ' + key + ' (contracts, ownership, gates). Where PLAN.md is silent, choose what a best-in-class shipped game does and record the decision in your checkpoint file.',
    fixItems ? 'CONFIRMED MUST-FIX FAILURES from fresh critics (each reproduced by two refuters). Reproduce each FIRST with the critic\'s probe (reproduce field / report), fix the root cause, re-run the probe, and record BEFORE/AFTER numbers:\n' + JSON.stringify(fixItems, null, 1) : 'SELF-VERIFY every PLAN.md gate for ' + key + ' against the running game before returning, with the numbers in selfChecks.',
    'REGRESSION DUTY: after your last commit, re-run a core-loop check (boot with the documented params -> camp -> portal -> room 1 clears -> reward screen) and any other module\'s probe your files could affect.',
    checkpoint(ck, pfx),
    'Return the BUILD structured result (done=true only when every item in scope is committed and verified; if something needs a user decision, finish everything else and explain).',
  ].join('\n\n')
}

// ---------------- critique phase ----------------
const CRITICS = {
  menu: {
    owners: ['M1'], spec: SPEC.menu,
    bench: 'Hades (Supergiant), Celeste, Hollow Knight, Slay the Spire, and Unreal/Unity shipped-game settings conventions (apply/revert timers, instant preview, persistence, focus handling).',
    probes: 'Title layout at 1024x576, 1600x900, 2560x1440 (pixels + DOM rects: nothing clipped/overlapping, readable type, visible focus); navigation by keyboard only, mouse only, and emulated gamepad (mock navigator.getGamepads) with Esc/back consistency and no focus traps; each display setting measured in effect: render scale -> drawing-buffer size and pixel detail, fullscreen -> document.fullscreenElement + resize handling + Esc sync, V-Sync -> measured present cadence difference and honest labelling, frame limit 30/60/120/unlimited -> rendered frames per second within 5%; settings persist across reload and survive corrupt storage; Exit flow honest; input-to-visual latency on menu actions; no core-loop regression when starting New Game.',
  },
  audio: {
    owners: ['M3'], spec: SPEC.audio,
    bench: 'Wwise/FMOD-style bus mixing as used in Hades and Dead Cells, the dB-perceptual volume standard of shipped PC games, and HTML5 games with proper autoplay handling.',
    probes: 'Launch your own puppeteer with --autoplay-policy=no-user-gesture-required; measure bus RMS/peak through the debug taps (and an OfflineAudioContext or analyser where possible): each slider in linear AND logarithmic mode at 0/25/50/75/100% with the measured gain curve vs the PLAN.md math; channel decoupling (moving Music never changes SFX level and vice versa); master mute; no clipping above 0 dBFS during a boss fight; music exists in menu, camp, combat, boss with crossfades (no hard cuts, no silence gaps > 1 s at transitions); SFX coverage of sim events (hit, kill, heal, skill casts, telegraph, boss quake, UI) and spatial panning measured left vs right of the listener; balance: dialogue-free mix where SFX peaks sit above music by a sane margin; settings persist; the audio tab is usable with keyboard and mouse.',
  },
  content: {
    owners: ['M4a', 'M4b'], spec: SPEC.content,
    bench: 'Hades (biome identity, escalating encounters, boon/slot build variety), Dead Cells (biome variety, hazard design), Enter the Gungeon (enemy readability and telegraphs), Slay the Spire (difficulty curve across acts).',
    probes: 'Play through each level configuration (cmd use allowed to reach them) and capture a representative frame of each: distinct biome identity in pixels (analyzer HUEMIX / palette per biome, prop sets) within the art bible; measure the difficulty curve (enemy counts, HP, damage, spawn cadence per room and act) and plot the numbers — it must escalate monotonically with sensible spikes at boss/defend rooms; every new enemy and hazard: silhouette read at 50% zoom, telegraph >= 0.7 s in Ember, behaviour distinct from existing enemies; all 8 skill slots bindable and usable with keys 1-8, the HUD command bar fits at 1024x576 and 2560x1440 without overlap; every new skill and node functions (cast it, verify its sim effect and VFX) and its reinterpretation works; every interactable responds to interaction with feedback; the original 8-room loop still plays by real input.',
  },
  save: {
    owners: ['M2'], spec: SPEC.save,
    bench: 'Hades and Slay the Spire (autosave at safe points, crash-safe atomic saves, resume exactly where you left), Stardew Valley and the Elder Scrolls games (save-slot menus with metadata, overwrite/delete confirmation), and robust save engineering practice (versioned schema, migration, backup, checksum).',
    probes: 'Round trip at several moments (camp, mid-combat with projectiles and zones in flight, reward screen, shop, boss with adds): the state hash before save equals after load AND the next 600 ticks after load are bit-identical to an unsaved continuation with the same inputs; player position, inventory (skills, nodes, bench, wallet), world variables (seed, room, RNG streams, flags), high scores all restored; save-slot menu: create, overwrite with confirmation, delete with confirmation, metadata correct, Load Game from the title restores the right slot; reload the page and load; corrupt a slot (truncate JSON, wrong version, missing keys, quota exceeded) — detected, backup offered or clean error, never a crash; export to a JSON file and re-import; autosave fires at safe points only; high scores persist across runs and reloads.',
  },
  net: {
    owners: ['M5a', 'M5b'], spec: SPEC.net,
    bench: 'The Source engine / Valve multiplayer networking model (snapshots, interpolation, client prediction, lag compensation), Quake 3 delta compression against acknowledged baselines, Overwatch netcode, and co-op roguelikes with lobbies (Risk of Rain 2, Gunfire Reborn).',
    probes: 'Start your OWN server instance on your ports; open 2-4 headless clients with your own multi-page harness (you may also use the builder harness but must confirm its numbers independently). Measure: socket connect, lobby create/join by code, quick match, seat assignment, start; replication of position, orientation and actions; bytes per snapshot with delta vs full (report the ratio) and bandwidth per client; prediction error and correction smoothness at 50/150/250 ms RTT with jitter; packet loss 5/10/20% and duplication/reordering; hit registration under lag with the rewind (hits that looked valid on the client register); RACE CONDITIONS: two clients joining the last seat simultaneously, simultaneous draft picks, simultaneous interaction with one object, host and guest pausing at once; CONNECTION DROP-OFFS: guest drop + reconnect mid-room (state restored), host drop (policy per PLAN.md), server kill; desync detection over >= 3 minutes of play; and that single-player with no server is bit-identical to before (same seed -> same event sequence).',
  },
  journey: {
    owners: ['INT'], spec: SPEC.overall,
    bench: 'The first-hour flow of shipped roguelikes (Hades, Dead Cells, Slay the Spire): boot -> title -> settings -> new game -> play -> pause -> save -> quit -> continue, with no dead ends, no lost state, consistent input handling and audio throughout.',
    probes: 'Full journey by REAL input only: boot -> title -> change a display and an audio setting -> New Game -> camp -> portal -> clear rooms -> pause -> save to a slot -> quit to title -> Load Game -> continue in the same room with the same build -> finish or die -> high score recorded -> host a multiplayer lobby and start with one headless guest -> leave -> title. Plus the original regression suite at the new build: full 8-room loop by real input with drafts taken, responsiveness (keydown-to-move <= 2 ticks, dodge i-frames, telegraphs >= 0.7 s), one frame each of camp/combat/boss scored on docs/REFERENCE_BAR.md (each >= 16/20, no zero), fps on the GPU-backed harness (no > 100 ms hitch after warm-up), zero page errors, and the production build (`npm run build` then `npx vite preview --port <yours>`) boots and plays.',
  },
}
const CRITIC_ORDER = ['menu', 'audio', 'save', 'content', 'net', 'journey']

function criticPrompt(key, round) {
  const c = CRITICS[key]
  const pfx = 'gntc' + key + round + '-'
  return [
    'You are the ' + key.toUpperCase() + ' CRITIC for gauntlet round ' + round + '. Module specification (user, verbatim): ' + c.spec,
    context(pfx, CRITIC_ROLE),
    'BENCHMARK SYSTEMS for your blind checklist: ' + c.bench,
    'REQUIRED PROBES (all, with numbers): ' + c.probes,
    'Also check every PLAN.md gate for your module literally, and the relevant builder checkpoint files (docs/gauntlet/build-*.md, fix-*-r*.md) claims — re-measure, never trust them.',
    'Write docs/gauntlet/critic-' + key + '-r' + round + '.md (benchmark checklist, probe tables, verdict).',
    checkpoint('docs/gauntlet/critic-' + key + '-r' + round + '.md', pfx),
    'Return the VERDICT structured result.',
  ].join('\n\n')
}

const REFUTE_LENSES = [
  { key: 'harness', desc: 'HARNESS-ARTIFACT HUNTER: HMR reloads from concurrent builders, navigation timeouts, contention from several headless browsers, shared eval scope, misread polls, synthetic input that never reached the page, audio blocked by autoplay policy, a network conditioner or server instance misconfigured by the critic, measuring the wrong port. Re-run alone and vary conditions.' },
  { key: 'spec', desc: 'SPEC LAWYER: does the user specification, docs/gauntlet/PLAN.md or a real current UX standard actually require what the critic demanded, and was the right thing measured? Quote the rule. Decide mustFix (blocking) vs advisory.' },
]
function refutePrompt(key, f, lens, round) {
  return [
    'You are a REFUTER (gauntlet round ' + round + '). The ' + key + ' critic reported this must-fix failure:\n' + JSON.stringify(f, null, 1),
    'Your lens: ' + lens.desc,
    context('gntr' + key + round + lens.key + '-', CRITIC_ROLE),
    'Reproduce it yourself with fresh captures following the reproduce field (the critic\'s captures and report are readable), then try to show it is an artifact or not a real requirement. refuted=true ONLY with your own evidence; if it reproduces and violates the spec/plan/standard, refuted=false. mustFix per the quoted rule.',
  ].join('\n\n')
}
function completenessPrompt(key, v, round) {
  return [
    'You are the COMPLETENESS AUDITOR. The ' + key + ' critic (gauntlet round ' + round + ') returned PASS:\n' + JSON.stringify(v, null, 1),
    context('gntcc' + key + round + '-', CRITIC_ROLE),
    'REQUIRED PROBES for that critic were: ' + CRITICS[key].probes,
    'Verify each required probe was actually run WITH evidence (captures and console files exist and contain the numbers; gates applied as written, not softened; real input used where required; the blind benchmark checklist was written before inspection). Read the report ' + v.reportPath + ' and spot-check at least two captures. mustRerun=true for any gap that could hide a failure.',
  ].join('\n\n')
}

function synthPrompt(history, passed) {
  return [
    'You are the GAUNTLET REPORT SYNTHESIZER. Write docs/gauntlet/REPORT.md from the data below (read the critic reports it cites; do not modify src/**; do not commit).',
    'Overall verdict: ' + (passed ? 'ALL MODULES PASS' : 'NOT YET PASSING — list what remains') + '.',
    'ROUND DATA (JSON):\n' + JSON.stringify(history, null, 1),
    'Structure: verdict line with version (src/version.js) and git HEAD; one section per module (menu, audio, save, content, net, journey/regression) with the benchmark checklist score, the measured numbers that matter, what was fixed across rounds (commits), and remaining advisories; a short "what a player notices" paragraph; open risks. Return a 10-line plain-text summary.',
  ].join('\n\n')
}

// ---------------- runners ----------------
async function runCritic(key, round) {
  let v = await ag(criticPrompt(key, round), { label: 'critic:' + key + ' r' + round, phase: 'Critique', schema: VERDICT })
  if (!v) throw new Error('dead: critic ' + key + ' r' + round)
  if (v.verdict === 'PASS') {
    const cc = await ag(completenessPrompt(key, v, round), { label: 'audit:' + key + ' r' + round, phase: 'Critique', schema: COMPLETE })
    if (!cc) throw new Error('dead: audit ' + key + ' r' + round)
    const gaps = cc.gaps.filter((g) => g.mustRerun)
    if (gaps.length) {
      log(key + ' r' + round + ': PASS had ' + gaps.length + ' must-rerun gaps -> critic re-run')
      const v2 = await ag(criticPrompt(key, round) + '\n\nA completeness audit of your previous PASS found these gaps — cover each with evidence now, then update your report and verdict:\n' + JSON.stringify(gaps, null, 1), { label: 'critic:' + key + ' r' + round + ' (rerun)', phase: 'Critique', schema: VERDICT })
      if (!v2) throw new Error('dead: critic rerun ' + key + ' r' + round)
      v = v2
    }
  }
  const confirmed = []
  const downgraded = []
  for (const f of v.failures.filter((x) => x.mustFix)) {
    const votes = await parallel(REFUTE_LENSES.map((lens) => () => ag(refutePrompt(key, Object.assign({}, f, { report: v.reportPath }), lens, round), { label: 'refute:' + key + ':' + lens.key + ' ' + f.id, phase: 'Verify', schema: REFUTE })))
    const valid = votes.filter(Boolean)
    if (valid.length < REFUTE_LENSES.length) throw new Error('dead: refuter for ' + key + ' ' + f.id)
    const refutedAll = valid.every((x) => x.refuted)
    const mustFix = !refutedAll && valid[1].mustFix
    if (mustFix) confirmed.push(Object.assign({}, f, { refuters: valid.map((x) => x.reasoning.slice(0, 600)) }))
    else downgraded.push({ title: (refutedAll ? '[refuted] ' : '[advisory] ') + f.title, evidence: valid.map((x) => x.reasoning.slice(0, 400)).join(' || ') })
  }
  const pass = confirmed.length === 0
  log(key + ' r' + round + ': critic ' + v.verdict + ', ' + v.failures.length + ' reported, ' + confirmed.length + ' confirmed must-fix -> ' + (pass ? 'PASS' : 'FAIL'))
  return { key, pass, report: v.reportPath, benchmark: v.benchmark, summary: v.summary, failures: confirmed, advisories: v.advisories.concat(downgraded) }
}

// ---------------- main ----------------
const history = { plan: null, builds: [], rounds: [] }
const startRound = (typeof args === 'object' && args && args.roundBase) ? args.roundBase : 1
const skipBuild = !!(typeof args === 'object' && args && args.skipBuild)

if (!skipBuild) {
  phase('Plan')
  const arch = await ag(architectPrompt(null), { label: 'architect', phase: 'Plan', schema: BUILD })
  if (!arch || !arch.done) return { aborted: true, stage: 'architect', arch }
  const review = await ag(planReviewPrompt(), { label: 'plan-review', phase: 'Plan', schema: REVIEW })
  if (!review) return { aborted: true, stage: 'plan-review' }
  const planGaps = review.gaps.filter((g) => g.mustFix)
  let rev = null
  if (planGaps.length) {
    log('plan review: ' + planGaps.length + ' must-fix gaps -> architect revision')
    rev = await ag(architectPrompt(planGaps), { label: 'architect (revision)', phase: 'Plan', schema: BUILD })
    if (!rev || !rev.done) return { aborted: true, stage: 'architect-revision', rev }
  }
  history.plan = { arch: arch.summary, reviewGaps: review.gaps, revision: rev && rev.summary }

  phase('Build')
  for (const wave of WAVES) {
    log('Build wave: ' + wave.join(' || '))
    const res = await parallel(wave.map((k) => () => ag(builderPrompt(k, null, 0), { label: 'build:' + k, phase: 'Build', schema: BUILD })))
    wave.forEach((k, i) => history.builds.push({ key: k, result: res[i] }))
    const dead = wave.filter((k, i) => !res[i])
    if (dead.length) return { aborted: true, stage: 'build ' + dead.join(','), history }
    for (let i = 0; i < wave.length; i++) log('build ' + wave[i] + ': ' + (res[i].done ? 'done ' + res[i].version : 'INCOMPLETE: ' + res[i].summary.slice(0, 200)))
  }
}

let passed = false
for (let round = startRound; round < startRound + MAX_ROUNDS; round++) {
  phase('Critique')
  log('Gauntlet round ' + round + ': critics ' + CRITIC_ORDER.join(', '))
  const raw = await parallel(CRITIC_ORDER.map((k) => () => runCritic(k, round)))
  const dead = CRITIC_ORDER.filter((k, i) => !raw[i])
  const results = raw.filter(Boolean)
  const entry = { round, results, dead, fixes: [] }
  history.rounds.push(entry)
  if (dead.length) return { aborted: true, stage: 'critics r' + round + ': ' + dead.join(','), history }
  const failed = results.filter((r) => !r.pass)
  log('Round ' + round + ': ' + (results.length - failed.length) + ' pass / ' + failed.length + ' fail (' + failed.map((r) => r.key).join(', ') + ')')
  if (!failed.length) { passed = true; break }
  if (round === startRound + MAX_ROUNDS - 1) break

  phase('Fix')
  const jobs = []
  for (const r of failed) {
    const owners = CRITICS[r.key].owners
    if (owners.length === 1) jobs.push({ key: owners[0], items: r.failures })
    else {
      // split by suspect files: world-ish files -> second owner, everything else -> first
      const worldRe = /enem|hazard|interact|env\/|biome|render\/enemies|obstacle|server\/|sim\/(net|remote)|net\/(predict|interp|reconcile|lag)/i
      const second = r.failures.filter((f) => (f.suspectFiles || []).some((p) => worldRe.test(p)))
      const first = r.failures.filter((f) => second.indexOf(f) < 0)
      if (first.length) jobs.push({ key: owners[0], items: first })
      if (second.length) jobs.push({ key: owners[1], items: second })
    }
  }
  const early = jobs.filter((j) => j.key !== 'INT')
  const late = jobs.filter((j) => j.key === 'INT')
  log('Fix jobs r' + round + ': ' + early.map((j) => j.key + '(' + j.items.length + ')').join(', ') + (late.length ? ' then INT(' + late[0].items.length + ')' : ''))
  const fixed = await parallel(early.map((j) => () => ag(builderPrompt(j.key, j.items, round), { label: 'fix:' + j.key + ' r' + round, phase: 'Fix', schema: BUILD })))
  early.forEach((j, i) => entry.fixes.push({ key: j.key, result: fixed[i] }))
  if (fixed.some((x) => !x)) return { aborted: true, stage: 'fix r' + round, history }
  for (const j of late) {
    const b = await ag(builderPrompt('INT', j.items, round), { label: 'fix:INT r' + round, phase: 'Fix', schema: BUILD })
    entry.fixes.push({ key: 'INT', result: b })
    if (!b) return { aborted: true, stage: 'fix INT r' + round, history }
  }
}

phase('Report')
const summary = await ag(synthPrompt(history, passed), { label: 'report', phase: 'Report' })
return { passed, rounds: history.rounds.length, summary, history }
