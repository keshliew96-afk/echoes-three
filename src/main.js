// Echoes — boot: stage creation, scene registry + URL-param swap, fixed-tick
// accumulator loop (60 Hz sim clock; render frames interpolate and never
// mutate sim state), resize wiring, debug API (window.__echoes).
//
// URL params:
//   ?scene=rendertest         scene select (rendertest is the temporary default
//                             until the camp/game scenes land)
//   ?bloom=0 ?vignette=0 ?grade=0 ?outline=0   post/outline toggles for
//                             comparison captures (default on)
import { VERSION } from './version.js';
import { TICK_MS, MAX_FRAME_MS } from './core/constants.js';
import { createStage } from './render/stage.js';
import { createRenderTestScene } from './scenes/rendertest.js';
import { createDebugOverlay } from './ui/debug.js';

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

// Scene registry — later blocks add camp/combat and flip the default to the game.
const SCENES = {
  rendertest: createRenderTestScene,
};
const DEFAULT_SCENE = 'rendertest';
const sceneKey = params.get('scene') ?? DEFAULT_SCENE;
const buildScene = SCENES[sceneKey] ?? SCENES[DEFAULT_SCENE];
const activeScene = buildScene(stage, toggles);

const overlay = createDebugOverlay(VERSION);

window.addEventListener('resize', () => stage.resize());

// --- Fixed-tick accumulator loop (§1: 60 Hz, integer ticks, clamped catch-up).
let tick = 0;
let accumulator = 0;
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
  const frameMs = Math.min(now - last, MAX_FRAME_MS);
  last = now;

  accumulator += frameMs;
  while (accumulator >= TICK_MS) {
    tick += 1; // sim systems hook in here (sim core block)
    accumulator -= TICK_MS;
  }

  // Cosmetic per-frame updates + render (read-only over sim state).
  activeScene.update?.(now / 1000);
  stage.render();

  frameTimes.push(frameMs);
  if (frameTimes.length > FRAME_WINDOW) frameTimes.shift();
  fpsMeterClock += frameMs;
  if (fpsMeterClock >= 250) {
    fpsMeterClock = 0;
    fps = computeFps();
    overlay.setFps(fps);
  }
});

// --- Debug API (docs/TESTING.md). Sim members grow with the sim core block.
window.__echoes = {
  version: VERSION,
  get tick() {
    return tick;
  },
  get fps() {
    return Math.round(computeFps() * 10) / 10;
  },
  entityCount: 0,
  seed: null,
  events: [],
  state: () => ({ scene: activeScene.name, toggles }),
  cmd: (name) => {
    console.warn(`__echoes.cmd('${name}') not implemented yet (sim core block)`);
  },
};
