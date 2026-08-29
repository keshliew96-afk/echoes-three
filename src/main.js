// Echoes — boot: stage creation, sim-core wiring (clock, RNG streams, entity
// registry, event bus, input controller, world), scene registry + URL-param
// swap, fixed-tick accumulator loop (60 Hz sim; render frames interpolate and
// never mutate sim state), resize wiring, debug API (window.__echoes).
//
// URL params:
//   ?scene=arena|graybox|simtest|rendertest|chartest  scene select (arena —
//                              the dressed Act-1 woodland with the chibi party
//                              — is the default; graybox stays reachable for
//                              controller regression captures; simtest keeps
//                              the wisp harness for determinism captures,
//                              rendertest for renderer comparisons, chartest
//                              is the critter gallery)
//   ?variant=1|2|3             arena layout variant (arena scene only)
//   ?seed=123                  force the gameplay RNG seed (determinism tests)
//   ?debug=1                   sim debug overlay (tick / entities / RNG draws)
//   ?bloom=0 ?vignette=0 ?grade=0 ?outline=0   post/outline toggles (default on)
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { VERSION } from './version.js';
import { createStage } from './render/stage.js';
import { createRenderTestScene } from './scenes/rendertest.js';
import { createSimTestScene } from './scenes/simtest.js';
import { createGrayboxScene } from './scenes/graybox.js';
import { createCharTestScene } from './scenes/chartest.js';
import { createArenaScene } from './scenes/arena.js';
import { createDebugOverlay } from './ui/debug.js';
import { createHud } from './ui/hud/index.js';
import { createClock } from './core/clock.js';
import { createGameplayRng, createCosmeticRng } from './core/rng.js';
import { createRegistry } from './core/registry.js';
import { createEventBus } from './core/events.js';
import { createInputController } from './core/input.js';
import { createWorld } from './sim/world.js';
import { createSynth } from './audio/synth.js';
import { createSkillFx } from './render/skillfx/index.js';
import { createEnemyLayer } from './render/enemies/index.js';
import { createAllyLayer } from './render/allies/index.js';
import { createSocketScreen } from './ui/socket/index.js';
import { createTechFx } from './render/techfx/index.js';
import { createSiphonFizzleCue } from './ui/socket/fizzle.js';
import { createBossLayer } from './render/boss/index.js';
import { createRunUi } from './ui/run/index.js';

const params = new URLSearchParams(window.location.search);
const flag = (name, def = true) => {
  const v = params.get(name);
  return v === null ? def : v !== '0' && v !== 'false';
};
const toggles = {
  bloom: flag('bloom'),
  vignette: flag('vignette'),
  grade: flag('grade'),
  outline: flag('outline'),
  // Default 0 = FXAA path: measured ~2x the fps of MSAA2 on software GL (the
  // capture harness) with near-identical ink lines; ?msaa=2/4 remain as
  // quality knobs on real GPUs.
  msaa: params.has('msaa') ? parseInt(params.get('msaa'), 10) || 0 : 0,
};

const stage = createStage({ container: document.getElementById('app'), toggles });

// --- Sim core (§1). Seed: ?seed= forces the gameplay stream; otherwise a
// fresh random seed per load (drawn outside the gameplay stream — the seed
// CREATES that stream). Cosmetic stream is unseeded by design.
const seedParam = params.get('seed');
const seed =
  seedParam !== null
    ? Number(seedParam) >>> 0
    : Math.floor(Math.random() * 0x100000000) >>> 0;
const rng = createGameplayRng(seed);
const cosmetic = createCosmeticRng();

const registry = createRegistry();
const bus = createEventBus();
const clock = createClock();

// Mouse aim = raycast from camera through cursor to the y=0 plane (§1).
// Injected into the input controller so the controller stays render-agnostic.
const raycaster = new Raycaster();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
const ndc = new Vector2();
const hitPoint = new Vector3();
function screenToWorld(sx, sy) {
  ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, stage.camera);
  return raycaster.ray.intersectPlane(groundPlane, hitPoint)
    ? { x: hitPoint.x, z: hitPoint.z }
    : null;
}

const input = createInputController({ screenToWorld });

// Scene registry — later blocks add camp/combat rooms on top of graybox.
const SCENES = {
  graybox: createGrayboxScene,
  simtest: createSimTestScene,
  rendertest: createRenderTestScene,
  chartest: createCharTestScene,
  arena: createArenaScene,
};
const DEFAULT_SCENE = 'arena'; // v0.3.0: the dressed arena is the game scene
const sceneKey = SCENES[params.get('scene')] ? params.get('scene') : DEFAULT_SCENE;

// The deterministic wisp harness belongs to the simtest proving ground only;
// the game scenes get a clean world (enemies land with their own block).
// requestHitstop bridges the §9 juice contract (kill/melee hitstop) into the
// clock, which owns the 4-per-20-tick budget cap.
const world = createWorld({
  rng,
  registry,
  events: bus,
  harness: sceneKey === 'simtest',
  requestHitstop: clock.requestHitstop,
  // ?room=kill_all|defend (enemies block, §11): start a wave room at boot.
  room: params.get('room'),
});

// §21/§9 sound slots: synth subscribes to sim events, emits `sound` events
// back into the ring (the observable contract in headless captures).
createSynth(bus);

const buildScene = SCENES[sceneKey];
const activeScene = buildScene(stage, toggles, { world, cosmetic, bus });

// Skill-delivery VFX layer (skills block): heal bursts/+HP glyphs, skill
// bolts, Sanctuary zones, Warding Aura field, override reticle — rides the
// playable scenes alongside the proto HUD.
const skillfx =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createSkillFx({ stage, world, bus, cosmetic })
    : null;

// Enemy render layer (enemies block): boar/mantis rigs, Ember attack
// telegraphs, violet spawn shimmers, enemy shots, the defend-room Waystone.
const enemyfx =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createEnemyLayer({ stage, world, bus, cosmetic })
    : null;

// Ally render layer (ally block): the three party critters ride their sim AI
// bodies, plus the §17 Signal Blue mark reticle, the §10 revive rings and the
// ally kit ground_aoe zones / swipe VFX. It adopts the arena's party critters
// when the scene exposes them, so a character is never built twice.
const allyfx =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createAllyLayer({ stage, world, bus, cosmetic, scene: activeScene })
    : null;

// Combat HUD (§17): Zone-1 command bar (4 model-rendered party portraits with
// the full state machine + 4 skill slots + dodge, one cooldown grammar, §17
// denial nudges), Zone-2 contextual room banner, and the world-anchored
// off-screen threat pointers. Rides with the playable scenes only, so
// simtest/rendertest/chartest captures stay unchanged.
const hud =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createHud({ bus, world, stage, cosmetic })
    : null;

// Socket screen (nodes block, §15/§16): the between-rooms build workbench
// (B key / cmd('openSocket')) + the §17 Siphon "nobody near" fizzle cue.
const socketScreen =
  sceneKey === 'graybox' || sceneKey === 'arena' ? createSocketScreen({ bus, world }) : null;
// Technique VFX layer (nodes block, §15.3 x §19.4): Bounce arcs, Siphon
// tethers, Detonate shock rings, Echo ghost pulses — core + glow + particles on
// every reinterpretation primitive, so a technique reads without the numbers.
const techfx =
  sceneKey === 'graybox' || sceneKey === 'arena' ? createTechFx({ stage, bus, cosmetic }) : null;
const fizzleCue =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createSiphonFizzleCue({ bus, camera: stage.camera })
    : null;
// Boss render layer (run block, §11 Hollow Stag): the Stag rig, its
// feverish warm boss-light (the room's brightest emitter, room dimmed a stop),
// and the Antler Quake Ember ring telegraph.
const bossfx =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createBossLayer({ stage, world, bus, cosmetic })
    : null;
// Run meta screens (run block, §16/§18): draft, path doors, shop shelf,
// victory/defeat pages + the §13 transition fade. `?run=1` boots into room 1
// (the camp hub that normally starts a run is its own block).
const runUi =
  sceneKey === 'graybox' || sceneKey === 'arena'
    ? createRunUi({ bus, world, socket: socketScreen, autostart: params.get('run') === '1' })
    : null;

const overlay = createDebugOverlay(VERSION, {
  debug: flag('debug', false),
  providers: {
    tick: () => clock.tick,
    entities: () => registry.count,
    draws: () => rng.drawIndex,
    seed,
  },
});

window.addEventListener('resize', () => stage.resize());

// --- Frame loop: clock.advance steps the sim 0..N whole ticks (each tick
// samples intents once), returns the interpolation alpha for rendering.
let last = performance.now();
let fpsMeterClock = 0;

// Robust fps: median frame time over the last ~1.5 s. A median ignores the
// occasional scheduler/GC hiccup that would drag an instantaneous or EMA
// reading well below the true steady rate.
const FRAME_WINDOW = 90;
const frameTimes = [];
let fps = 60;

function computeFps() {
  if (frameTimes.length === 0) return fps;
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median > 0 ? 1000 / median : fps;
}

// §16: the socket screen is a modal meta screen — while it is open the sim
// still ticks (cooldowns, auras, allies) but the Healer takes no orders.
// Browsing the bench must never burn a cooldown or walk the player behind the
// panel, so gameplay intents are swallowed at the controller seam; `aim` rides
// through untouched (it mutates nothing).
function sampleIntents() {
  const snap = input.sample();
  // The run's meta screens (draft / path / shop / end) are modal for the same
  // reason (§16 "Zero build interaction mid-combat" and its mirror: zero
  // gameplay input while a between-rooms page is up).
  if (!socketScreen?.isOpen() && !runUi?.isOpen()) return snap;
  snap.move.x = 0;
  snap.move.z = 0;
  snap.basicAttackHeld = false;
  snap.reviveHeld = false;
  snap.presses.length = 0;
  return snap;
}

stage.renderer.setAnimationLoop((now) => {
  const frameMs = now - last;
  last = now;

  const alpha = clock.advance(frameMs, (tick) => {
    world.step(tick, sampleIntents());
  });

  // Render side: read-only over sim state, interpolated by alpha.
  activeScene.update?.(now / 1000, alpha);
  skillfx?.update(now / 1000, alpha);
  enemyfx?.update(now / 1000, alpha);
  allyfx?.update(now / 1000, alpha);
  techfx?.update(now / 1000);
  bossfx?.update(now / 1000, alpha);
  fizzleCue?.update(now / 1000);
  stage.render();
  overlay.update();
  runUi?.update();
  hud?.update(now);

  frameTimes.push(frameMs);
  if (frameTimes.length > FRAME_WINDOW) frameTimes.shift();
  fpsMeterClock += frameMs;
  if (fpsMeterClock >= 250) {
    fpsMeterClock = 0;
    fps = computeFps();
    overlay.setFps(fps);
  }
});

// --- Debug API (docs/TESTING.md). cmd surface grows as systems land.
window.__echoes = {
  version: VERSION,
  // HUD probe surface (§17 block): portrait states, cooldown boxes, zone
  // metrics, banner mode and the off-screen threat audit.
  hud: hud ? hud.debug : null,
  // Run meta-screen probe surface (run block): active screen, door glyphs,
  // card/plaque boxes, fresh-press key sets.
  runUi: runUi ? runUi.debug : null,
  get tick() {
    return clock.tick;
  },
  get fps() {
    return Math.round(computeFps() * 10) / 10;
  },
  get entityCount() {
    return registry.count;
  },
  seed,
  get rngDraws() {
    return rng.drawIndex;
  },
  get events() {
    return bus.buffer();
  },
  // Cumulative §9 pipeline counters (hits/crits/immune/heals/kills) — survive
  // the 200-event ring, for long scripted audits like the 200-hit crit test.
  get stats() {
    return { ...world.stats };
  },
  // Subscribe to live sim events from test scripts (e.g. await the exact hit
  // moment before capturing). Returns the unsubscribe function.
  on: (type, fn) => bus.on(type, fn),
  state: () => ({
    scene: activeScene.name,
    toggles,
    ...world.snapshotState(),
    ...(activeScene.debugState ? { vfx: activeScene.debugState() } : {}),
    ...(skillfx ? { skillfx: skillfx.debugCounts() } : {}),
    ...(allyfx ? { allyfx: allyfx.debugCounts() } : {}),
    ...(techfx ? { techfx: techfx.debugCounts() } : {}),
    ...(bossfx ? { bossfx: bossfx.debugCounts() } : {}),
  }),
  cmd: (name, ...args) => {
    // UI-level commands route to the socket screen (docs/TESTING.md).
    if (socketScreen && (name === 'openSocket' || name === 'closeSocket'))
      return socketScreen.cmd(name);
    return world.cmd(name, ...args);
  },
};
