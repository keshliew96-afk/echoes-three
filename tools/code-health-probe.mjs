#!/usr/bin/env node
// CODE HEALTH (docs/CODE_HEALTH.md), headless, no browser, no dev server.
//   worlds    two sim worlds in one process each keep their own colliders and
//             slip patches (sim/movement.js state per world): a world stepped
//             in turn with a second one ends bit-identical to the same world
//             stepped alone, and neither sees the other's patch
//   save      capture/restore reads and writes the world's own movement state
//   split     vite.config.js uses codeSplitting (no deprecated advancedChunks);
//             main.js loads the four test scenes and the co-op session lazily
//   dead      the removed dead exports and src/ui/run/expedition.js are gone
//   audit     package-lock.json pins sharp >= 0.35.5 and source-map-js >= 1.2.2
//   build     with --dist DIR (a built dist): the entry chunk holds no session
//             code and a session chunk exists
//   node tools/code-health-probe.mjs [--dist dist]   exit 1 on any failure
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const read = (p) => readFileSync(join(here, p), 'utf8');
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { fnv1a64Hex } = await import(u('src/core/hash.js'));
const MOVE = await import(u('src/sim/movement.js'));

const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${got !== null ? ` ${JSON.stringify(got)}` : ''}`);
  if (!ok) fails.push(what);
}

function makeWorld(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const W = { world, run, registry, bus, clock, rng };
  W.step = (s = emptySnapshot()) => W.clock.stepOnce((t) => W.world.step(t, s));
  return W;
}

// An Act II campaign room in combat, layout cleared, one wet patch at (px, 0).
function room(seed, px) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 2, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('clearLayout');
  W.world.cmd('killAllEnemies');
  W.world.cmd('spawnHazard', 'slip', px, 0, { r: 2.5, skin: 'wet' });
  W.step();
  for (const [i, x, z] of [[1, -9, -5], [2, -9, 5], [3, -10, 0]]) W.world.cmd('placeAlly', i, x, z);
  return W;
}
const walk = (x) => ({ ...emptySnapshot(), move: { x, z: 0 }, aim: { x: 20, z: 0 } });
// The Healer walks right for 50 ticks, then lets go for 40: on a patch it
// slides on, on dry floor it stops dead.
const SCRIPT = [...Array(50).fill(1), ...Array(40).fill(0)];
const hashOf = (W) =>
  fnv1a64Hex(canonicalJSON({ reg: W.registry.serialize(), sys: W.world.saveState().systems, move: MOVE.serializeMovement(W.world.movementState()), draws: W.rng.drawIndex }));

// ---------------------------------------------------------------- worlds --
{
  // A: patch under the Healer's path (x 4). B: patch far to the left (x -6).
  const alone = room(3, 4);
  for (const m of SCRIPT) alone.step(walk(m));
  const soloHash = hashOf(alone);
  const soloX = alone.world.player.x;

  const A = room(3, 4);
  const B = room(5, -6);
  for (const m of SCRIPT) {
    A.step(walk(m));
    B.step(walk(m));
  }
  const pairHash = hashOf(A);
  check('worlds: a world stepped in turn with a second world ends bit-identical to the same world alone', pairHash === soloHash, { soloHash, pairHash, soloX, pairX: A.world.player.x });
  const aPatches = A.world.movementState().slips.map((p) => p.x);
  const bPatches = B.world.movementState().slips.map((p) => p.x);
  check('worlds: each world keeps only its own slip patch', aPatches.length === 1 && aPatches[0] === 4 && bPatches.length === 1 && bPatches[0] === -6, { aPatches, bPatches });
  check('worlds: the two movement states are separate objects', A.world.movementState() !== B.world.movementState());
  // B's Healer walked from the left over dry floor at x>0: it never slipped
  // on A's patch.
  check('worlds: the second world never slips on the first world\'s patch', B.world.player.slipVx === undefined, { slipVx: B.world.player.slipVx ?? null });

  // A dynamic collider installed while A is bound stays A's alone.
  A.world.cmd('killAllEnemies');
  MOVE.setDynamicColliders([{ id: 999, x: 0, z: 0, r: 1 }]);
  const aDyn = A.world.movementState().dynamics.length;
  B.world.cmd('killAllEnemies');
  check('worlds: a collider set while one world is bound does not reach the other', aDyn === 1 && B.world.movementState().dynamics.every((c) => c.id !== 999), { aDyn, bDyn: B.world.movementState().dynamics.length });

  // ------------------------------------------------------------------ save --
  const before = MOVE.serializeMovement(A.world.movementState());
  B.world.cmd('killAllEnemies'); // bind B
  const viaA = MOVE.serializeMovement(A.world.movementState());
  check('save: serializeMovement(state) reads that world, whichever is bound', canonicalJSON(viaA) === canonicalJSON(before) && MOVE.movementState() === B.world.movementState());
  MOVE.restoreMovement({ dynamics: [], slips: [{ id: 7, x: 1, z: 1, r: 1, grip: 0.1 }] }, A.world.movementState());
  check('save: restoreMovement(data, state) writes that world only', A.world.movementState().slips.length === 1 && A.world.movementState().slips[0].id === 7 && B.world.movementState().slips[0].x === -6);
}

// ----------------------------------------------------------------- split --
{
  const cfg = read('vite.config.js');
  check('split: vite.config.js uses codeSplitting, not the deprecated advancedChunks', /codeSplitting\s*:/.test(cfg) && !/advancedChunks\s*:/.test(cfg) && /rolldownOptions/.test(cfg));
  const main = read('src/main.js');
  const statics = [...main.matchAll(/^import\s.*from\s+'([^']+)'/gm)].map((m) => m[1]);
  const lazy = ['./scenes/rendertest.js', './scenes/simtest.js', './scenes/graybox.js', './scenes/chartest.js', './net/session.js'];
  const bad = lazy.filter((p) => statics.includes(p));
  const dyn = lazy.filter((p) => main.includes(`import('${p}')`));
  check('split: main.js imports the test scenes and the co-op session only dynamically', bad.length === 0 && dyn.length === lazy.length, { bad, dyn: dyn.length });
}

// ------------------------------------------------------------------ dead --
{
  check('dead: src/ui/run/expedition.js is gone', !existsSync(join(here, 'src/ui/run/expedition.js')));
  const gone = [
    ['src/app/app.js', 'APP_STATES'], ['src/app/screens.js', 'NAV_ACTIONS'], ['src/audio/ambient.js', 'bedIds'],
    ['src/audio/mixmath.js', 'referenceTable'], ['src/audio/music.js', 'themeIds'], ['src/audio/music.js', 'musicNoteStats'],
    ['src/core/intents.js', 'CONTINUOUS_INTENTS'], ['src/data/difficulty.js', 'ELITE_MUL'], ['src/data/journal.js', 'JOURNAL_LANDS'],
    ['src/data/journal.js', 'BESTIARY_IDS'], ['src/data/layouts.js', 'layoutFor'], ['src/data/layouts.js', 'BIOME_OF_ACT'],
    ['src/data/rush.js', 'isRushFight'], ['src/data/story.js', 'VERSE_LINE'], ['src/env/camp/spec.js', 'campBoundsOk'],
    ['src/env/ground.js', 'buildGroundMesh'], ['src/env/walls.js', 'toneHex'], ['src/net/lobbyClient.js', 'SESSION_KEY'],
    ['src/net/mesh.js', 'meshSupported'], ['src/net/protocol/codec.js', 'writeHash'], ['src/net/protocol/codec.js', 'readHash'],
    ['src/net/protocol/constants.js', 'INTERP_DELAY_MIN_MS'], ['src/net/protocol/constants.js', 'INTERP_DELAY_MAX_MS'],
    ['src/net/protocol/delta.js', 'decodeHotBytes'], ['src/net/protocol/messages.js', 'isRoomCode'], ['src/net/protocol/messages.js', 'CLIENT_TYPES'],
    ['src/net/protocol/messages.js', 'decodeServerMessage'], ['src/net/protocol/quantize.js', 'sameChannels'], ['src/net/protocol/snapshot.js', 'quantisedView'],
    ['src/render/critters/common.js', 'liftAccent'], ['src/render/enemies/style.js', 'TELL_VIOLET_DIM'], ['src/render/geocache.js', 'sharedGeoCount'],
    ['src/render/hazards/cues.js', 'M4B_CUE_IDS'], ['src/render/hazards/cues.js', 'M4B_EVENT_CUE_TYPES'], ['src/render/npcs/index.js', 'NPC_IDS'],
    ['src/sim/draft.js', 'RARITY_ORDER'], ['src/sim/netseats.js', 'SEAT_REASONS'], ['src/sim/shrines.js', 'SHRINE_IDS'],
    ['src/sim/skills.js', 'classOfSkill'], ['src/sim/skills.js', 'isPassiveSkill'], ['src/ui/hud/icons.js', 'ICON_IDS'],
    ['src/ui/run/cards.js', 'rarityOf'], ['src/ui/run/shop.js', '_shopPalette'], ['src/ui/run/style.js', 'virtualScale'],
    ['src/ui/story/viewer.js', 'VIEWER_KINDS'], ['src/ui/tutorial/index.js', 'TIP_IDS'],
  ];
  const left = gone.filter(([f, n]) => new RegExp(`export\\s+(?:const|function|let)\\s+${n}\\b|as\\s+${n}\\b`).test(read(f))).map(([f, n]) => `${f}:${n}`);
  check(`dead: the ${gone.length} removed dead exports stay removed`, left.length === 0, left.length ? left : null);
}

// ----------------------------------------------------------------- audit --
{
  const lock = JSON.parse(read('package-lock.json'));
  const ver = (p) => (lock.packages[p] ? lock.packages[p].version : null);
  const atLeast = (v, min) => {
    if (!v) return false;
    const a = v.split(/[.-]/).map(Number);
    const b = min.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i];
    return true;
  };
  const sharp = ver('node_modules/sharp');
  const smj = ver('node_modules/source-map-js');
  check('audit: sharp >= 0.35.5 and source-map-js >= 1.2.2 (npm audit\'s two high alerts)', atLeast(sharp, '0.35.5') && atLeast(smj, '1.2.2'), { sharp, 'source-map-js': smj });
}

// ----------------------------------------------------------------- build --
{
  const i = process.argv.indexOf('--dist');
  if (i > 0) {
    const dir = join(here, process.argv[i + 1] || 'dist', 'assets');
    const files = existsSync(dir) ? readdirSync(dir) : [];
    const entry = files.find((f) => /^index-.*\.js$/.test(f));
    const session = files.find((f) => /^session-.*\.js$/.test(f));
    const src = entry ? readFileSync(join(dir, entry), 'utf8') : '';
    // A string only session.js carries (its lost-host toast).
    const marker = 'rejoin_offer_skipped';
    check('build: a session chunk exists and the entry chunk holds no session code', !!session && !!entry && !src.includes(marker), { entry, session: session || null, entryKb: Math.round(src.length / 1024) });
  }
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
