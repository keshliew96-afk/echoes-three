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
//   Gauntlet params (?menu= ?act= ?fresh= ?slot= ?audio= ?net* ...): see
//   src/app/params.js and docs/gauntlet/PLAN.md §6.
//
// GAUNTLET OWNERSHIP ANCHORS (docs/gauntlet/PLAN.md §2.2): every region is a
// `@gnt:<NAME> begin` ... `@gnt:<NAME> end` comment pair; a key edits ONLY
// between its own markers — APP-BOOT / APP-ATTACH / LOOP (M1), AUDIO (M3),
// RNG-WRAPPER / SAVE (M2), M4a WORLD-LAYERS + M4a RENDER-TICK (M4a),
// M4b WORLD-LAYERS + M4b RENDER-TICK (M4b), NET (M5a W3, M5b W4),
// INT-WIRING (INT), DEBUG-API (service-backed; normally untouched). Regions
// nested inside another key's region (RENDER-TICK inside LOOP) belong to the
// inner key; the outer owner keeps them verbatim. Re-read immediately before
// editing; never reformat outside your region.
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { VERSION } from './version.js';
import { createStage } from './render/stage.js';
import { createRenderTestScene } from './scenes/rendertest.js';
import { createSimTestScene } from './scenes/simtest.js';
import { createGrayboxScene } from './scenes/graybox.js';
import { createCharTestScene } from './scenes/chartest.js';
import { createArenaScene } from './scenes/arena.js';
import { createCampScene } from './scenes/camp.js';
import { createDebugOverlay } from './ui/debug.js';
import { createHud } from './ui/hud/index.js';
import { createClock } from './core/clock.js';
import { createGameplayRng, createCosmeticRng } from './core/rng.js';
import { createRegistry } from './core/registry.js';
import { createEventBus } from './core/events.js';
import { createInputController } from './core/input.js';
import { createWorld } from './sim/world.js';
import { createSkillFx } from './render/skillfx/index.js';
import { createEnemyLayer } from './render/enemies/index.js';
import { createAllyLayer } from './render/allies/index.js';
import { createSocketScreen } from './ui/socket/index.js';
import { createTechFx } from './render/techfx/index.js';
import { createSiphonFizzleCue } from './ui/socket/fizzle.js';
import { createBossLayer } from './render/boss/index.js';
import { createRunUi } from './ui/run/index.js';
import { updateNumberPools, flushNumberPools, prewarmNumberPools } from './render/numbers.js';
import { warmupUpdate, warmupPending, warmupRetained } from './render/warmup.js';
import { parseBootParams, wipeEchoesStorage } from './app/params.js';
import { createApp } from './app/app.js';
import { service, provide } from './app/registry.js';
import { createContentService } from './data/content.js';
import { createFrameScheduler } from './app/loop.js';
import { SKILL_SLOTS } from './core/constants.js';
import { emptySnapshot } from './core/intents.js';
import { scriptedInput } from './sim/script.js';
import { hashState, fnv1a64Hex } from './core/hash.js';
import { canonicalJSON } from './core/canonical.js';

// @gnt:INT-FIRST-PAINT begin (INT, gauntlet r3 J3-F2) — let the page paint
// index.html's boot splash BEFORE the boot builds the world. Everything below
// runs as one long main-thread stretch (stage, scenes, shader warm-up); on a
// cold browser it used to start before the compositor had drawn anything, so
// a player saw a blank page for 4-6 s. One animation frame (+ the task after
// it, so the frame is committed) is all this costs; a hidden tab has nothing
// to show and never waits, a compositor that is slow to start is waited on
// for at most 1.5 s.
await new Promise((resolve) => {
  if (typeof document === 'undefined' || document.hidden || typeof requestAnimationFrame !== 'function') {
    resolve();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    resolve();
  };
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 1500);
});
// @gnt:INT-FIRST-PAINT end

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

// @gnt:APP-BOOT begin (M1) — the app shell exists BEFORE any game listener:
// M1's window capture-phase input gate must run ahead of core/input.js and
// ui/run/index.js (which also listens in the capture phase).
const bootParams = parseBootParams();
if (bootParams.fresh) wipeEchoesStorage();
const app = createApp({ params: bootParams });
// @gnt:APP-BOOT end

const stage = createStage({ container: document.getElementById('app'), toggles });

// --- Sim core (§1). Seed: ?seed= forces the gameplay stream; otherwise a
// fresh random seed per load (drawn outside the gameplay stream — the seed
// CREATES that stream). Cosmetic stream is unseeded by design.
const seedParam = params.get('seed');
const seed =
  seedParam !== null
    ? Number(seedParam) >>> 0
    : Math.floor(Math.random() * 0x100000000) >>> 0;
// The gameplay stream is REBUILT at each Begin Run (camp block, §2 "all run
// state is wiped at run end"): this thin handle keeps one identity for every
// consumer while `reseed` swaps the stream underneath. `?seed=` still forces
// the FIRST stream, and every later run seed is a draw off the previous one,
// so a seeded session stays deterministic end to end.
// @gnt:M2 RNG-WRAPPER begin — M2 adds getState()/setState() here (delegating
// to rng.js's mulberry32 getState/setState, incl. seed + draw count) so a
// save captures and restores the LIVE stream (PLAN §3.4).
let rngImpl = createGameplayRng(seed);
const rng = {
  stream: 'gameplay',
  get seed() {
    return rngImpl.seed;
  },
  get drawIndex() {
    return rngImpl.drawIndex;
  },
  float: () => rngImpl.float(),
  range: (a, b) => rngImpl.range(a, b),
  int: (n) => rngImpl.int(n),
  chance: (p) => rngImpl.chance(p),
  pick: (a) => rngImpl.pick(a),
  reseed: (s) => {
    rngImpl = createGameplayRng(s >>> 0);
    return rngImpl.seed;
  },
  // The LIVE stream (camp.js reseeds per run, so only this handle reaches it).
  getState: () => rngImpl.getState(),
  setState: (st) => {
    rngImpl = createGameplayRng(st.seed >>> 0);
    return rngImpl.setState(st);
  },
};
// @gnt:M2 RNG-WRAPPER end
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
  camp: createCampScene,
};
// v0.5.0: the game BOOTS INTO CAMP (§2 "the camp hub scene bookends runs").
// The camp scene wraps the arena and swaps between them on run start/end, so
// ?scene=arena still boots straight into the combat arena for regressions.
const DEFAULT_SCENE = 'camp';
const sceneKey = SCENES[params.get('scene')] ? params.get('scene') : DEFAULT_SCENE;
// Scenes that carry the full game stack (sim FX layers + HUD + meta screens).
const PLAYABLE =
  sceneKey === 'graybox' || sceneKey === 'arena' || sceneKey === 'camp';

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

// @gnt:AUDIO begin (M3) — the audio engine (src/audio/engine.js, PLAN §3.5):
// bus graph + limiter, procedural music / ambient beds, spatial SFX for every
// sim event (it still emits `sound` events into the ring — the observable
// contract in headless captures), the Settings ▸ Audio tab. No AudioContext
// exists until the app gesture hook calls engine.unlock(e); per-frame work
// runs from app.update(now) -> service('audio').update(now).
import { createAudioEngine } from './audio/engine.js';
import { registerAudioTab } from './ui/menu/tabs/audio.js';
provide(
  'audio',
  createAudioEngine({ bus, settings: app.settings, stage, app, world, registry, params: bootParams })
);
registerAudioTab();
// @gnt:AUDIO end

const buildScene = SCENES[sceneKey];
const activeScene = buildScene(stage, toggles, { world, cosmetic, bus, rng });

// --- Run-block wiring (append-only; see src/sim/run.js + src/render/numbers.js).
// 1. A RUN ALWAYS SWAPS THE SCENE. camp.js already mirrors `run_end` ->
//    setMode('camp'); without the other half, `?run=1` and a scripted
//    __echoes.cmd('startRun') started room 1 while the camp dressing was still
//    on screen (measured: runState().room === 1 with vfx.mode 'camp' and
//    vfx.arena null), so every capture-driven review judged the wrong
//    environment. Registered BEFORE createRunUi so its `?run=1` autostart is
//    covered too. setMode short-circuits on an unchanged mode, so the portal
//    press (which swaps first, then starts) is unaffected.
bus.on('run_start', () => activeScene.cmd?.('campMode', ['run']));
// 2. The damage-numeral pool is swept when the WORLD A NUMERAL IS ANCHORED TO
//    goes away: `run_start` (camp -> arena), `room_enter` (the party is
//    re-seated in the next room, §13 step 7), `run_end` (camp.js swaps the
//    scene back to the camp on that event) and `return_to_camp`. A numeral is
//    a world-anchored div; leaving one alive across any of those would
//    re-project it into a world it never belonged to — that is the leak that
//    put stale numbers on the Victory card and rode them into Camp.
//    NOT on `room_cleared` (certification fix C-r1, failure F1). The clear is
//    a state transition INSIDE the room that stays on screen for the whole
//    reward/path sequence, and it fires on the SAME TICK as the killing blow
//    — so flushing there deleted that kill's own damage number (plus anything
//    still in flight) before it had drawn a single frame. Measured: 4 of 4
//    room-clearing kills landed with no number at all, against 81 of 81 for
//    every other kill, breaking §9 juice contract #2 ("a damage number pops on
//    EVERY hit"). Nothing rides into the next room: `room_enter` sweeps.
for (const evt of ['run_start', 'room_enter', 'run_end', 'return_to_camp'])
  bus.on(evt, () => flushNumberPools());

// Skill-delivery VFX layer (skills block): heal bursts/+HP glyphs, skill
// bolts, Sanctuary zones, Warding Aura field, override reticle — rides the
// playable scenes alongside the proto HUD.
const skillfx =
  PLAYABLE
    ? createSkillFx({ stage, world, bus, cosmetic })
    : null;

// Enemy render layer (enemies block): boar/mantis rigs, Ember attack
// telegraphs, violet spawn shimmers, enemy shots, the defend-room Waystone.
const enemyfx =
  PLAYABLE
    ? createEnemyLayer({ stage, world, bus, cosmetic })
    : null;

// Ally render layer (ally block): the three party critters ride their sim AI
// bodies, plus the §17 Signal Blue mark reticle, the §10 revive rings and the
// ally kit ground_aoe zones / swipe VFX. It adopts the arena's party critters
// when the scene exposes them, so a character is never built twice.
const allyfx =
  PLAYABLE
    ? createAllyLayer({ stage, world, bus, cosmetic, scene: activeScene })
    : null;

// Combat HUD (§17): Zone-1 command bar (4 model-rendered party portraits with
// the full state machine + 4 skill slots + dodge, one cooldown grammar, §17
// denial nudges), Zone-2 contextual room banner, and the world-anchored
// off-screen threat pointers. Rides with the playable scenes only, so
// simtest/rendertest/chartest captures stay unchanged.
const hud =
  PLAYABLE
    ? createHud({ bus, world, stage, cosmetic, scene: sceneKey })
    : null;

// Socket screen (nodes block, §15/§16): the between-rooms build workbench
// (B key / cmd('openSocket')) + the §17 Siphon "nobody near" fizzle cue.
const socketScreen =
  PLAYABLE ? createSocketScreen({ bus, world }) : null;
// Technique VFX layer (nodes block, §15.3 x §19.4): Bounce arcs, Siphon
// tethers, Detonate shock rings, Echo ghost pulses — core + glow + particles on
// every reinterpretation primitive, so a technique reads without the numbers.
const techfx =
  PLAYABLE ? createTechFx({ stage, bus, cosmetic }) : null;
const fizzleCue =
  PLAYABLE
    ? createSiphonFizzleCue({ bus, camera: stage.camera })
    : null;
// Boss render layer (run block, §11 Hollow Stag): the Stag rig, its
// feverish warm boss-light (the room's brightest emitter, room dimmed a stop),
// and the Antler Quake Ember ring telegraph.
const bossfx =
  PLAYABLE
    ? createBossLayer({ stage, world, bus, cosmetic })
    : null;
// Run meta screens (run block, §16/§18): draft, path doors, shop shelf,
// victory/defeat pages + the §13 transition fade. `?run=1` boots into room 1
// (the camp hub that normally starts a run is its own block).
const runUi =
  PLAYABLE
    ? createRunUi({ bus, world, socket: socketScreen, autostart: params.get('run') === '1' })
    : null;

// New render layers for content are created in the two WORLD-LAYERS blocks
// (PLAYABLE only) and ticked in the matching RENDER-TICK blocks of frame().
// @gnt:M4a WORLD-LAYERS begin — skill/technique VFX, expedition picker, the
// `content` service (src/data/content.js; M4b adds probes with
// registerContentProbe from its own files, never here).
import { registerScreen } from './app/registry.js';
import { registerChallengeSetting } from './ui/run/challenge.js';
import { createContentFx } from './render/skillfx/content.js';
import { registerContentCues } from './render/skillfx/cues.js';
provide('content', createContentService({ world, bus, service }));
// The Gameplay tab's Challenge row (gameplay.challenge, read at the portal
// press). (The §4.1 expedition picker is superseded by the CAMPAIGN block's
// Level Select — PLAN §12.7.)
registerChallengeSetting(app.settings);
// @gnt:PARTY SETTINGS begin — Settings ▸ Gameplay ▸ Ally builds / Socket my
// new nodes (PLAN §16.4), `?party=` (this boot) and `?partygrant=` (every
// ally built at the next run start — harness, marks the run).
import { registerPartySettings } from './ui/run/partysettings.js';
registerPartySettings(app.settings, { world, params: bootParams });
if (bootParams.partyGrant !== null && world.runSystem() && typeof world.runSystem().setHarnessGrant === 'function') world.runSystem().setHarnessGrant(bootParams.partyGrant);
// @gnt:PARTY SETTINGS end
registerContentCues(service('audio'), world);
// The deterministic default-build autopilot (src/sim/autopilot.js, PLAN §6.7)
// replaces the tick's intent snapshot while it is on — for BOTH the realtime
// loop and __echoes.sim.stepN, which each call world.step through this one
// property. Off (the default) it is a pass-through.
{
  const autopilot = world.runSystem().autopilot;
  const rawStep = world.step;
  world.step = (tick, snap, ...rest) =>
    rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
}
// Gauntlet skill / status / technique VFX (render/skillfx/content.js).
const contentfx = PLAYABLE ? createContentFx({ stage, world, bus, cosmetic }) : null;
// PARTY (BUILD_BRIEF §25.2): the class skills', class passives' and taunts' VFX.
import { createClassFx } from './render/skillfx/class/index.js';
const classfx = PLAYABLE ? createClassFx({ stage, world, bus, cosmetic }) : null;
if (classfx) service('content').classFx = () => classfx.debugCounts();
// Probe surface: __echoes.content.fx() -> the layer's live element counts.
if (contentfx) service('content').fx = () => contentfx.debugCounts();
// Real-input harness surface (tools/gntM4a-realrun.mjs): the autopilot's
// advice for this tick (never applied by the game) and a world -> screen
// projection, so a script can play with real keys and a real mouse.
{
  const c = service('content');
  const pv = new Vector3();
  c.advise = () => world.runSystem().autopilot.advise(world.tick);
  // M4c probe surface: the socket screen's rows / cells / bench / cursor /
  // hand / on-screen rects (4 skills × 8 sockets).
  c.socketUi = () => (socketScreen ? socketScreen.debug() : null);
  c.project = (x, z, y = 0.45) => {
    pv.set(x, y, z).project(stage.camera);
    return { x: Math.round((pv.x + 1) * 0.5 * window.innerWidth), y: Math.round((1 - pv.y) * 0.5 * window.innerHeight), behind: pv.z > 1 };
  };
}
// @gnt:M4a WORLD-LAYERS end
// @gnt:M4b WORLD-LAYERS begin — hazard / interactable / biome layers, prompts.
// The world-content presentation bundle (src/render/hazards/layers.js): hazard
// + interactable layers, `ix-` prompts, content audio cues, the render probe
// (__echoes.content.render()) and the ?layout=N harness setup (PLAN §6.1).
import { createWorldContentLayers } from './render/hazards/layers.js';
const m4bLayers = PLAYABLE
  ? createWorldContentLayers({ stage, world, bus, cosmetic, runUi, scene: activeScene, params: bootParams, sceneKey })
  : null;
// @gnt:M4b WORLD-LAYERS end
// @gnt:CAMPAIGN WORLD-LAYERS begin — the linear campaign's presentation
// (docs/gauntlet/PLAN.md §12): the lobby's Level Select screen and the LEVEL
// MANAGER (teardown / preload / advance / probes, src/campaign/manager.js),
// provided as the `campaign` service (the transition card asks it to skip).
import { createLevelsScreen } from './ui/run/levels.js';
import { createCampaignManager } from './campaign/manager.js';
registerScreen('levels', createLevelsScreen);
const campaignMgr = PLAYABLE
  ? createCampaignManager({ world, bus, scene: activeScene, stage, app, registry, service, runUi, isFrozen: () => simFrozen, params: bootParams })
  : null;
if (campaignMgr) provide('campaign', campaignMgr);
// @gnt:CAMPAIGN WORLD-LAYERS end

// @gnt:SAVE begin (M2) — createSaveSystem({ clock, rng, registry, world, bus,
// scene: activeScene, stage, app }) + provide('save', ...) (PLAN §3.4);
// captures/applies only at clock.onTickEnd or between frames (§3.4).
// The service snapshots the boot state here (tick 0, before app.boot()) —
// New Game / Quit to Title rebuild the camp from it with a fresh seed.
import { createSaveSystem } from './save/index.js';
import { registerSaveScreens } from './ui/menu/saves.js';
const saveSystem = createSaveSystem({
  clock,
  rng,
  registry,
  world,
  bus,
  scene: activeScene,
  stage,
  app,
  params: bootParams,
  service,
  // The round-trip probe freezes the realtime loop (simFrozen: LOOP region).
  sim: {
    freeze: () => {
      const was = simFrozen;
      simFrozen = true;
      return was;
    },
    restore: (was) => {
      simFrozen = !!was;
    },
  },
  // Presentation resync after every apply (layers handle `state_restored`
  // themselves): world-anchored numerals belong to the world that left, and
  // a key held through the load belongs to the menu that did it.
  onRestored: () => {
    flushNumberPools();
    if (typeof input.releaseAll === 'function') input.releaseAll();
  },
});
provide('save', saveSystem);
registerSaveScreens();
// ?slot=<id> on a menu-skip boot loads between frames once the page is up
// (a title boot loads it at the end of the loading screen — app.finishBoot).
if (bootParams.slot && bootParams.menuSkip) {
  setTimeout(() => {
    saveSystem.load(bootParams.slot).then((r) => {
      if (!r.ok) app.toast(`Couldn't load save "${bootParams.slot}"`, { tone: 'warn' });
    });
  }, 0);
}
// @gnt:SAVE end

// @gnt:NET begin (M5a W3: provide('net', client) only; M5b W4: the session
// driver) — `simStep` is THE seam the frame loop calls once per sim tick.
// M5b swaps it for the host/guest driver (host: world.step(tick, snap,
// seatInputs); guest: no world step — replica apply + own-seat prediction).
// Single-player keeps exactly this function (PLAN §3.7, gate G5b.8).
let simStep = (tick) => world.step(tick, sampleIntents());
// M5a (W3): the network client service (src/net/lobbyClient.js) — server
// probe, lobby, matchmaking, transport, reconnect, conditioner. Idle until
// something calls connect()/host()/join()/quickMatch() (or a ?nethost /
// ?netjoin / ?netquick harness param): no socket, no timer, no tick hook, so
// single-player is untouched. The state tree it streams is the save system's
// complete capture (a private copy, taken at clock.onTickEnd only).
import { createNetClient } from './net/lobbyClient.js';
provide(
  'net',
  createNetClient({
    params: bootParams,
    version: VERSION,
    storage: (() => {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    })(),
    clock,
    bus,
    settings: app.settings,
    captureIsPrivate: true,
    capture: () => {
      const s = service('save');
      if (s && typeof s.capture === 'function') return s.capture();
      return structuredClone({
        v: 0,
        clock: { tick: clock.tick },
        rng: { seed: rng.seed, draws: rng.drawIndex },
        registry: { nextOrdinal: registry.nextOrdinal, entities: registry.all() },
        world: world.snapshotState(),
      });
    },
  })
);
// M5b (W4): the network PLAY session (src/net/session.js) — idle until a
// room goes in_game. Then the host swaps `simStep` for its authoritative
// driver (world.step(tick, snapshot, seatInputs)) and a guest for its
// replica driver (no world step: input frames + own-seat prediction; the
// replica is written by snapshots). Leaving the session restores exactly
// the single-player step above. The multiplayer screens + Network tab
// register here (the title shows Multiplayer once 'mp-menu' exists).
import { createNetSession } from './net/session.js';
import { registerMultiplayerScreens } from './ui/menu/mpmenu.js';
import { registerNetworkTab } from './ui/menu/tabs/network.js';
{
  const spStep = simStep;
  createNetSession({
    net: service('net'),
    world,
    clock,
    bus,
    registry,
    rng,
    scene: activeScene,
    stage,
    app,
    input,
    sampleIntents: () => sampleIntents(),
    setSimStep: (fn) => {
      simStep = typeof fn === 'function' ? fn : spStep;
    },
    service,
  });
  registerMultiplayerScreens();
  registerNetworkTab();
}
// @gnt:NET end

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
// @gnt:LOOP begin (M1) — the scheduler (src/app/loop.js) owns frame pacing
// (V-Sync / frame limit); the sim gate is app.simPaused() (title, pause,
// farewell) + the debug freeze (__echoes.sim). Render never stops. The sim
// step is `simStep` (NET seam) — M1 never inlines world.step here. Per-frame
// work of other keys runs through app.update(now) (audio listener: M3 via
// service('audio').update) or their own RENDER-TICK block below.
let simFrozen = bootParams.freeze; // ?freeze=1: tick 0 until __echoes.sim.thaw()
let lastAlpha = 0;
let last = performance.now();
let fpsMeterClock = 0;
// Boot warm-up of the damage-numeral layer (certification fix D-r3 S1): one
// numeral of every kind is drawn at 2/1000 opacity for a few frames alongside
// the HUD's own warm-up (ui/hud/index.js), so the first number of a fight is
// rasterised on warm text pipelines.
let numeralWarmWait = 18;

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

function frame(now) {
  const frameMs = now - last;
  last = now;

  let alpha = lastAlpha;
  if (!simFrozen && !app.simPaused()) {
    alpha = clock.advance(frameMs, (tick) => simStep(tick));
    lastAlpha = alpha;
  }

  // Render side: read-only over sim state, interpolated by alpha.
  activeScene.update?.(now / 1000, alpha);
  skillfx?.update(now / 1000, alpha);
  enemyfx?.update(now / 1000, alpha);
  allyfx?.update(now / 1000, alpha);
  techfx?.update(now / 1000);
  bossfx?.update(now / 1000, alpha);
  fizzleCue?.update(now / 1000);
  // @gnt:M4a RENDER-TICK begin
  contentfx?.update(now / 1000, alpha);
  classfx?.update(now / 1000, alpha);
  // @gnt:M4a RENDER-TICK end
  // @gnt:M4b RENDER-TICK begin
  m4bLayers?.update(now / 1000, alpha);
  // @gnt:M4b RENDER-TICK end
  // @gnt:CAMPAIGN RENDER-TICK begin — advance a due level-transition card
  // BEFORE this frame renders (the new room is on screen the same frame).
  campaignMgr?.update(now);
  // @gnt:CAMPAIGN RENDER-TICK end
  // Damage numerals age HERE, in the one loop that never stops, after the
  // scenes have settled their cameras (world->screen projection needs the
  // final camera of this frame). No scene swap can freeze the pool.
  if (numeralWarmWait > 0 && --numeralWarmWait === 0) prewarmNumberPools(6);
  updateNumberPools(Math.min(0.1, Math.max(0, frameMs / 1000)));
  // Title backdrop framing (src/app/titlecam.js): after every layer placed
  // the camera, before it draws.
  app.beforeRender(now);
  stage.render();
  // Boot warm-up: the render layers park one of every transient rig in the
  // scene for a few frames so the driver pays for its first draw here, in
  // camp, instead of on the frame a wave starts (see render/warmup.js).
  warmupUpdate();
  overlay.update();
  runUi?.update();
  hud?.update(now);

  app.update(now);

  frameTimes.push(frameMs);
  if (frameTimes.length > FRAME_WINDOW) frameTimes.shift();
  fpsMeterClock += frameMs;
  if (fpsMeterClock >= 250) {
    fpsMeterClock = 0;
    fps = computeFps();
    overlay.setFps(fps);
  }
}

const scheduler = createFrameScheduler({ renderer: stage.renderer, frame });
// @gnt:LOOP end

// @gnt:APP-ATTACH begin (M1) — hand the app shell every layer it drives,
// then decide title vs menu-skip (PLAN §1.2 / §6.1): a plain URL boots the
// loading splash -> title with the sim paused at tick 0; ?menu=0 and every
// legacy harness param boot straight into camp exactly like v0.4.63.
app.attach({
  stage,
  world,
  clock,
  bus,
  rng,
  registry,
  input,
  scene: activeScene,
  runUi,
  socket: socketScreen,
  hud,
  overlay,
  scheduler,
  warmupPending,
});
app.boot();
// @gnt:APP-ATTACH end
// @gnt:INT-WIRING begin (INT, W5) — pause menu registration, cross-module
// wiring; Esc-to-pause listener registered LAST, bubble phase (PLAN §1.5).
import { registerPauseScreen } from './ui/menu/pause.js';
registerPauseScreen({
  getRun: () => {
    const rs = world.runSystem();
    return rs ? rs.view() : null;
  },
  getPage: () => (runUi && typeof runUi.screen === 'function' ? runUi.screen() : null),
  // CAMPAIGN (PLAN §12.6): the pause menu's Quit to Lobby.
  abandon: (reason = 'quit') => {
    const rs = world.runSystem();
    return rs && typeof rs.abandonRun === 'function' ? rs.abandonRun(reason) : null;
  },
});
// Esc / P open the pause menu from EVERY page (PLAN §1.2 / §1.5, gate GI.2).
// This is the LAST window keydown listener on the page and it listens in the
// BUBBLE phase, so:
//   • a blocking app screen is already open -> M1's capture gate swallowed the
//     key (stopImmediatePropagation) and this never runs;
//   • the socket screen is open -> it closes itself and calls preventDefault()
//     on that Esc, so `defaultPrevented` keeps the pause menu shut;
//   • a run page (draft / path / shop / end card) is up -> it never consumes
//     Escape (its decline is X), so the pause opens OVER the page, which keeps
//     its DOM, its focus and its settle window.
// An Esc that ended element fullscreen must not also open a menu (PLAN §1.5).
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.repeat) return;
  if (!PAUSE_KEYS.has(e.code)) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (app.state !== 'playing' || app.screens.isOpen()) return;
  const disp = app.display;
  if (e.code === 'Escape' && disp && typeof disp.recentFullscreenChange === 'function' && disp.recentFullscreenChange(150)) return;
  e.preventDefault();
  app.requestPause('keyboard');
});
// Boot splash hand-over (gauntlet r3 J3-F2). index.html paints a static
// splash with the page's first frame; it stays on top until the app's own
// loading screen is fully opaque beneath it (title boots: a pixel-identical
// cut, only the bar turns from a sweep into the measured fill) or the first
// world frames are drawn (menu-skip / harness boots: a short fade). The scene
// is never shown raw before the loading screen covers it.
(function releaseBootSplash() {
  const bs = window.__echoesBootSplash;
  if (!bs || typeof bs.release !== 'function') return;
  const titleBoot = app.state === 'boot';
  const loadingEl = titleBoot ? document.querySelector('[data-screen="loading"]') : null;
  const t0 = performance.now();
  let done = false;
  let timer = 0;
  const check = () => {
    if (done) return;
    let ready;
    if (loadingEl) {
      const cs = getComputedStyle(loadingEl);
      ready = loadingEl.classList.contains('ap-in') && cs.display !== 'none' && parseFloat(cs.opacity) >= 0.99;
    } else ready = app.frameCount >= 2;
    // Never hold a working app behind the splash: 8 s is the loading screen's own cap.
    if (ready || performance.now() - t0 > 8000) {
      done = true;
      clearInterval(timer);
      bs.release({ fade: loadingEl ? 0 : 180 });
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
  timer = setInterval(check, 100); // rAF-less (hidden) tabs still hand over
})();
// First-fight paint warm-up on a TITLE boot (gauntlet r4 J4-F1). The HUD's own
// boot warm-up (ui/hud/index.js: cooling / counting / denied slots, banners,
// portraits, six threat pointers at 2/1000 opacity) runs ~18 frames after
// load — which on a title boot is under the `ap-hide-game` rule (visibility:
// hidden, app/style.js), so the compositor never rasterised it. Measured on
// the production build in a fresh GPU-harness browser: the first cooldown wipe
// (a conic-gradient) and the first slot flash + numeral of Level 1 room 1 each
// stalled the GPU process 242-267 ms (raster pipelines compiled on first use;
// a warm browser: none). So while the loading card is up (translucent, so the
// layers beneath it are still rasterised), the same warm paint runs with the
// HUD layers paintable (at 2/1000 opacity, invisible under the card) and
// hidden again on the frame it ends; it holds warmupPending() so the card's
// "Ready" waits for it — the one-time compile lands in the loading bar, never
// in the title or the first fight. A menu-skip boot (?menu=0) warms in play.
import { warmupHold } from './render/warmup.js';
(function firstFightPaintWarmup() {
  if (!hud || typeof hud.rewarm !== 'function') return;
  const css = document.createElement('style');
  css.id = 'pz-uiwarm-style';
  css.textContent =
    'body.ap-hide-game.pz-uiwarm #hud, body.ap-hide-game.pz-uiwarm #hud-threat, body.ap-hide-game.pz-uiwarm #dmg-num-layer { visibility: visible; }';
  document.head.appendChild(css);
  const warmupLog = { armed: true, on: null, startedAt: null, ms: null };
  window.__echoesUiWarm = warmupLog;
  let started = false;
  const start = (on) => {
    started = true;
    const t0 = performance.now();
    const release = warmupHold();
    // the HUD root goes to 2/1000 opacity BEFORE its layer is made visible
    // (the warm paint keeps it there; the HUD restores it when the warm ends)
    hud.el.style.opacity = '0.002';
    document.body.classList.add('pz-uiwarm');
    prewarmNumberPools(6);
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      document.body.classList.remove('pz-uiwarm');
      release();
      warmupLog.ms = Math.round(performance.now() - t0);
    };
    hud.rewarm({ onEnd: end });
    setTimeout(end, 3000); // no frames (a hidden tab): the layers hide and the card goes on anyway
    warmupLog.on = on;
    warmupLog.startedAt = Math.round(t0);
  };
  const WAIT_FRAMES = 18; // the HUD's own boot warm-up delay: the bar and portraits exist by then
  const poll = () => {
    if (started) return;
    if (app.state === 'playing') return; // menu-skip boot: the boot warm-up painted in play
    const loading = app.screens.has('loading');
    if ((loading && app.frameCount >= WAIT_FRAMES) || (app.state === 'title' && !loading)) {
      start(loading ? 'loading' : 'title');
      return;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
})();
// A host's Quit to Lobby, told to the guests (gauntlet r4 J4-F3). The host
// confirms "Quit to the lobby?" and the whole session goes back to camp
// (run.js abandonRun: run_end 'abandoned' + return_to_camp { reason }); a
// guest used to be pulled out of its fight into the camp with nothing on
// screen saying why — it read as a crash or a desync. The guest's replica
// replays the host's return_to_camp WITH its reason (a normal return after
// an end card carries none), so the guest gets one toast naming the host,
// the quit and where the party is now. The host chose it (no notice); a
// single-player Quit to Lobby has nobody to tell.
bus.on('return_to_camp', (ev) => {
  if (!ev || typeof ev.reason !== 'string') return;
  const net = service('net');
  if (!net || typeof net.isGuest !== 'function' || !net.isGuest()) return;
  const room = net.room;
  const hostSeat = room && Array.isArray(room.seats) && Number.isFinite(room.hostSeat) ? room.seats.find((s) => s && s.index === room.hostSeat) : null;
  const who = hostSeat && hostSeat.name ? `${hostSeat.name} (host)` : 'The host';
  app.toast(`${who} quit to the lobby — the campaign ended and the party is back at camp`, { tone: 'info', ms: 6500 });
});
// @gnt:INT-WIRING end
scheduler.start();

// --- __echoes.sim (ARCH, PLAN §6.4): deterministic stepping for probes. The
// realtime loop is frozen while a probe steps; stepping uses the scripted
// input generator (src/sim/script.js) or idle input, never the keyboard.
const simInput = (scriptSeed, t) =>
  scriptSeed === null || scriptSeed === undefined
    ? emptySnapshot()
    : scriptedInput(scriptSeed, t, { skillSlots: SKILL_SLOTS });
const safeHash = (v) => {
  try {
    return hashState(v);
  } catch {
    return fnv1a64Hex(JSON.stringify(v));
  }
};
function stepN(n, scriptSeed = null) {
  const was = simFrozen;
  simFrozen = true;
  let stepped = 0;
  let guard = 0;
  while (stepped < n && guard < n * 8 + 64) {
    guard += 1;
    if (clock.stepOnce((t) => world.step(t, simInput(scriptSeed, t)))) stepped += 1;
  }
  simFrozen = was;
  return { stepped, tick: clock.tick };
}
const simDebug = {
  get frozen() {
    return simFrozen;
  },
  freeze() {
    simFrozen = true;
    return clock.tick;
  },
  thaw() {
    simFrozen = false;
    return clock.tick;
  },
  script: (seed, t) => simInput(seed, t),
  stepN,
  // State hash over the observable snapshot. M2 swaps in the COMPLETE state
  // capture (save schema v1) via service('save').hash when it lands.
  hash: () => {
    const save = service('save');
    return save && typeof save.hash === 'function' ? save.hash() : safeHash(world.snapshotState());
  },
  // trace(n, scriptSeed): step n ticks with scripted input and digest every
  // sim event except `sound` (audio is not sim state). DESTRUCTIVE to the
  // session (the party moves) — a probe, not gameplay.
  trace(n = 600, scriptSeed = 1) {
    const fromTick = clock.tick;
    const evs = [];
    const byType = {};
    const off = bus.on('*', (ev) => {
      if (ev.type === 'sound') return;
      evs.push(ev);
      byType[ev.type] = (byType[ev.type] || 0) + 1;
    });
    let r;
    try {
      r = stepN(n, scriptSeed);
    } finally {
      off();
    }
    let eventsHash;
    try {
      eventsHash = fnv1a64Hex(canonicalJSON(evs));
    } catch {
      eventsHash = fnv1a64Hex(JSON.stringify(evs));
    }
    return {
      fromTick,
      toTick: r.tick,
      stepped: r.stepped,
      stateHash: simDebug.hash(),
      eventsHash,
      eventCount: evs.length,
      byType,
    };
  },
};

// --- Debug API (docs/TESTING.md). cmd surface grows as systems land.
window.__echoes = {
  version: VERSION,
  // @gnt:DEBUG-API begin — Gauntlet namespaces (PLAN §6.4). Each resolves its
  // module's service lazily, so owners never edit this file for their probes:
  // provide('<name>', impl) with impl.debug = { ... }.
  app: app.debug,
  get content() {
    const c = service('content');
    return c ? c.debug ?? c : null;
  },
  // Bus counters (PLAN §3.7 replica bus): simCalls must not grow on a guest,
  // refusedEmits must stay 0.
  get busCounters() {
    return { ...bus.counters, replica: bus.replica, listeners: bus.listenerCount() };
  },
  // CAMPAIGN (GC.6): live subscribers per event type (a leak names itself).
  get busListeners() {
    return bus.listenerCounts();
  },
  // CAMPAIGN (PLAN §12.11): the level manager's probe surface.
  get campaign() {
    const c = service('campaign');
    return c ? c.debug ?? c : null;
  },
  // PARTY (PLAN §16.11): the per-character build probe surface — read-only
  // views of the ally seats (1-3; the Healer's build stays content / cmd)
  // plus the party* commands by name (party r5 / r6 minor: was undefined).
  get party() {
    const P = typeof world.partySystem === 'function' ? world.partySystem() : null;
    if (!P) return null;
    return {
      state: () => P.state(),
      view: (seat) => P.view(Number(seat)),
      pools: (seat) => P.pools(Number(seat)),
      verdict: (seat, skill, node) => {
        const b = P.build(Number(seat));
        return b ? b.verdictFor(skill, node) : null;
      },
      arranged: (seat) => P.arranged(Number(seat)),
      aiOrder: (seat) => P.aiOrder(Number(seat)),
      aiLog: () => world.cmd('partyAiLog'),
      oracle: () => ({ pools: P.partyPools(), verdicts: P.partyVerdicts() }),
      cmd: (name, ...args) => {
        const n = String(name);
        return window.__echoes.cmd(n.startsWith('party') ? n : `party${n.charAt(0).toUpperCase()}${n.slice(1)}`, ...args);
      },
    };
  },
  get settings() {
    const s = service('settings');
    return s
      ? {
          get: (k) => s.get(k),
          set: (k, v) => s.set(k, v, { source: 'api' }),
          reset: (prefix) => s.reset(prefix),
          dump: () => s.snapshot(),
          keys: () => s.keys(),
          persist: () => s.persist(),
          storageKey: s.storageKey,
          loadReport: s.loadReport,
        }
      : null;
  },
  get audio() {
    const a = service('audio');
    return a ? a.debug ?? a : null;
  },
  get save() {
    const v = service('save');
    return v ? v.debug ?? v : null;
  },
  get net() {
    const n = service('net');
    return n ? n.debug ?? n : null;
  },
  sim: simDebug,
  // @gnt:DEBUG-API end
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
  get seed() {
    return rng.seed;
  },
  bootSeed: seed,
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
    // GL residency (certification block D): three's program / geometry /
    // texture counters plus the warm-up bay, so a leak or a mid-wave compile
    // is a number a probe can read instead of a guess.
    gl: {
      programs: stage.renderer.info.programs ? stage.renderer.info.programs.length : null,
      geometries: stage.renderer.info.memory.geometries,
      textures: stage.renderer.info.memory.textures,
      calls: stage.renderer.info.render.calls,
      triangles: stage.renderer.info.render.triangles,
      warmupPending: warmupPending(),
      warmupRetained: warmupRetained(),
    },
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
    // Camp-hub commands (camp block): the same entry points the portal press
    // and the run-end handler drive.
    if (activeScene.cmd) {
      const r = activeScene.cmd(name, args);
      if (r !== undefined) return r;
    }
    return world.cmd(name, ...args);
  },
};
