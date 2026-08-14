// Echoes — boot: stage creation, sim-core wiring (clock, RNG streams, entity
// registry, event bus, input controller, world), scene registry + URL-param
// swap, fixed-tick accumulator loop (60 Hz sim; render frames interpolate and
// never mutate sim state), resize wiring, debug API (window.__echoes).
//
// URL params:
//   ?scene=simtest|rendertest  scene select (simtest is the default until the
//                              camp/game scenes land; rendertest stays for
//                              renderer comparison captures)
//   ?seed=123                  force the gameplay RNG seed (determinism tests)
//   ?debug=1                   sim debug overlay (tick / entities / RNG draws)
//   ?bloom=0 ?vignette=0 ?grade=0 ?outline=0   post/outline toggles (default on)
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { VERSION } from './version.js';
import { createStage } from './render/stage.js';
import { createRenderTestScene } from './scenes/rendertest.js';
import { createSimTestScene } from './scenes/simtest.js';
import { createDebugOverlay } from './ui/debug.js';
import { createClock } from './core/clock.js';
import { createGameplayRng, createCosmeticRng } from './core/rng.js';
import { createRegistry } from './core/registry.js';
import { createEventBus } from './core/events.js';
import { createInputController } from './core/input.js';
import { createWorld } from './sim/world.js';

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
const world = createWorld({ rng, registry, events: bus });

// Scene registry — later blocks add camp/combat and flip the default to the game.
const SCENES = {
  simtest: createSimTestScene,
  rendertest: createRenderTestScene,
};
const DEFAULT_SCENE = 'simtest';
const sceneKey = params.get('scene') ?? DEFAULT_SCENE;
const buildScene = SCENES[sceneKey] ?? SCENES[DEFAULT_SCENE];
const activeScene = buildScene(stage, toggles, { world, cosmetic });

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

stage.renderer.setAnimationLoop((now) => {
  const frameMs = now - last;
  last = now;

  const alpha = clock.advance(frameMs, (tick) => {
    world.step(tick, input.sample());
  });

  // Render side: read-only over sim state, interpolated by alpha.
  activeScene.update?.(now / 1000, alpha);
  stage.render();
  overlay.update();

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
  state: () => ({
    scene: activeScene.name,
    toggles,
    ...world.snapshotState(),
  }),
  cmd: (name, ...args) => world.cmd(name, ...args),
};
