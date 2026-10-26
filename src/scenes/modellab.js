// MODEL LAB (?modellab=1 or ?scene=modellab; harness builds only) — the
// review stage for the model standard (docs/MODEL_STANDARD.md), built after
// the page in Kesh's sample video: one model on a pedestal under the game's
// own lights, ink and post, with a toolbar of model tabs, Idle / Move /
// Ability / Still, the ability picker, Rewind and a live phase readout.
//
//   Barrow Wyrm   Idle; Move (it swims a loop, the coil following its path);
//                 Ash Breath and Burrow Strike on their timelines
//   Tank          Idle; Move (a loop that turns into a sidestep and a back-
//                 pedal, so the locked feet step every way); the 3-hit basic
//                 combo at its real 0.65 s cadence; Heavy Slam; Brace
//   Effect kit    the parts kit on its own: scales round a moving spine with
//                 bands, a spike row with tips, a crest fan, teeth, rivets
//
// Showcase frames the model close on a turntable; Play zoom is the game's
// own camera (fov 45, 12 u, 52°), so a look can be judged at the size the
// player sees it. Classic beside puts the classic model next to the new one.
// Rewind plays the ability backward to its start (the video's "Time Stop:
// rewind"); the scrub bar holds any moment Still. A cue (the breath, the
// slam's impact, each combo strike) fires the game's own sound for it and a
// small VFX kit beat.
//
// Probe surface: debugState() and cmd('lab', {patch}) through the debug API.
import { Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, Vector3 } from 'three';
import { CAMERA } from '../core/constants.js';
import { PALETTE, VFX_SIGNATURE } from '../data/palette.js';
import { toonMaterial } from '../render/toon.js';
import { createCritter, setInkViewport } from '../render/critters/index.js';
import { buildWyrm } from '../render/boss/wyrm.js';
import { buildWyrmFacet, WYRM_ABILITIES } from '../render/boss/wyrmfacet.js';
import { COMBO_LAB, TANK_ABILITIES } from '../render/critters/tankfacet.js';
import { createVfxKit } from '../render/vfx/kit.js';
import { createSpine, createPlateTube, createSpineRow, placeRow, plateGeometry, setTRS, wedgeGeometry } from '../render/facet/kit.js';
import { facetize, facetMaterial } from '../render/facet/material.js';
import { createPlayhead } from '../render/facet/timeline.js';
import { service } from '../app/registry.js';
import { pageQuery } from '../app/harness.js';
import { mountModelLab } from '../ui/modellab.js';
import { IcosahedronGeometry } from 'three';
// The roster slices' tabs (docs/MODEL_STANDARD.md): the Level I foes.
import { LAB_ENTRIES as FOE_ENTRIES } from './modellab-foes.js';

const MODELS = [
  ['wyrm', 'Barrow Wyrm'],
  ['tank', 'Tank'],
  ['kit', 'Effect kit'],
];
const MODES = [
  ['idle', 'Idle'],
  ['move', 'Move'],
  ['ability', 'Ability'],
  ['still', 'Still'],
];
const ABILITIES = {
  wyrm: [
    ['breath', 'Ash Breath'],
    ['burrow', 'Burrow Strike'],
  ],
  tank: [
    ['combo', 'Basic combo'],
    ['slam', 'Heavy Slam'],
    ['brace', 'Brace'],
  ],
  kit: [['wave', 'Wave']],
};
const REST_GAP = 0.7; // s of rest between ability loops
// Each model's showcase framing: look-at height, distance, and its game speed.
const FRAME = {
  wyrm: { y: 0.55, z: -1.2, dist: 8.6, speed: 1.5, loop: 3.4, side: 3.6 },
  tank: { y: 0.5, z: 0, dist: 3.6, speed: 2.1, loop: 2.2, side: 1.5 },
  kit: { y: 0.6, z: 0, dist: 7.5, speed: 0, loop: 0, side: 0 },
};
// LAB ENTRIES: each roster slice brings its own tabs as entries
// { id, label, abilities, frame, build(ctx) } (scenes/modellab-foes.js), set
// before the Effect kit tab.
const ENTRIES = [...FOE_ENTRIES];
MODELS.splice(MODELS.length - 1, 0, ...ENTRIES.map((e) => [e.id, e.label]));
for (const e of ENTRIES) {
  ABILITIES[e.id] = e.abilities;
  FRAME[e.id] = e.frame;
}
const SHOW_FOV = 30;
const SHOW_ELEV = (24 * Math.PI) / 180;

export function createModelLabScene(stage, toggles, { cosmetic }) {
  const params = pageQuery();
  const root = new Group();
  root.name = 'modellab';
  stage.scene.add(root);

  // --- Floor: the gallery's neutral ground and a pedestal of rings (the
  // video's swirl disc, in the game's own ground values).
  const groundColor = new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.84).multiply(new Color().setRGB(0.86, 0.97, 1.18));
  const ground = new Mesh(new PlaneGeometry(300, 300), toonMaterial({ color: groundColor }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  const pedestal = new Group();
  root.add(pedestal);
  for (let i = 0; i < 6; i++) {
    const r0 = 0.6 + i * 0.62;
    const ring = new Mesh(
      new RingGeometry(r0, r0 + (i % 2 ? 0.1 : 0.3), 64),
      new MeshBasicMaterial({ color: new Color(PALETTE.bone).lerp(groundColor, i % 2 ? 0.55 : 0.8), transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004 + i * 0.0005;
    pedestal.add(ring);
  }

  // --- The models (built once; the tabs show one at a time).
  const wyrm = buildWyrmFacet();
  const wyrmClassic = buildWyrm();
  const tank = createCritter('tank', { cosmetic, facet: true });
  const tankClassic = createCritter('tank', { cosmetic, facet: false });
  for (const g of [wyrm.group, wyrmClassic.group, tank.group, tankClassic.group]) root.add(g);
  const kit = buildKitShowcase();
  root.add(kit.group);

  // --- VFX beats and sounds for the cues.
  const vfx = createVfxKit({ stage, cosmetic });
  const audio = () => service('audio');
  const play = (cue, o = {}) => {
    const a = audio();
    if (a && a.play) a.play(cue, o);
  };
  const tankSig = VFX_SIGNATURE.tank;
  // The entries' models (each with its classic twin), built once.
  const built = new Map();
  for (const e of ENTRIES) {
    const inst = e.build({ cosmetic, vfx, play });
    built.set(e.id, inst);
    root.add(inst.group);
    if (inst.classic) root.add(inst.classic);
  }
  function onCue(model, id, at) {
    const x = at.x;
    const z = at.z;
    if (model === 'wyrm') {
      if (id === 'breath') {
        play('bx_wyrm_breath');
        vfx.flash({ x, y: 0.6, z: z + 1.1, size: 1.1, color: PALETTE.godstuffViolet, life: 0.3 });
        vfx.slash({ x, z: z + 0.6, angle: Math.PI / 2, radius: 2.2, span: 1.1, width: 0.5, life: 0.45, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
      } else if (id === 'burrow') {
        play('bx_wyrm_burrow');
        vfx.crack({ x, z, radius: 1.4, glow: PALETTE.godstuffViolet });
      } else if (id === 'emerge') {
        play('bx_wyrm_emerge');
        vfx.ring({ x, z, r0: 0.3, r1: 1.9, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        vfx.pillar({ x, z, radius: 0.7, height: 2.6, color: PALETTE.godstuffViolet, life: 0.6 });
      }
    } else if (model === 'tank') {
      const fx = x + Math.sin(at.yaw) * 0.7;
      const fz = z + Math.cos(at.yaw) * 0.7;
      if (id === 'strike') {
        play('swing', { pitch: 0.8 });
        vfx.flash({ x: fx, y: 0.45, z: fz, size: 0.45, color: tankSig.glow, life: 0.18 });
      } else if (id === 'impact') {
        play('impact', { pitch: 0.7 });
        vfx.crack({ x: fx, z: fz, radius: 1.0, glow: tankSig.glow });
        vfx.ring({ x: fx, z: fz, r0: 0.2, r1: 1.1, width: 0.22, life: 0.4, core: PALETTE.parchment, glow: tankSig.glow });
      } else if (id === 'plant') {
        play('tank_shield');
        vfx.ring({ x, z, r0: 0.3, r1: 1.4, width: 0.18, life: 0.5, core: PALETTE.parchment, glow: tankSig.glow });
      }
    }
  }

  // --- Lab state.
  const state = {
    model: MODELS.some(([id]) => id === params.get('model')) ? params.get('model') : 'wyrm',
    mode: MODES.some(([id]) => id === params.get('mode')) ? params.get('mode') : 'idle',
    ability: null,
    t: 0,
    rate: 1,
    view: params.get('view') === 'play' ? 'play' : 'showcase',
    turntable: params.get('turn') !== '0',
    classic: params.get('classic') === '1',
    duration: 0,
    readout: '',
    azimuth: 0.6,
    movePhase: 0,
  };
  state.ability = params.get('ability') || ABILITIES[state.model][0][0];

  function timelineFor(model, ability) {
    if (built.has(model)) return built.get(model).timeline(ability);
    if (model === 'wyrm') return WYRM_ABILITIES[ability] || WYRM_ABILITIES.breath;
    if (model === 'tank') {
      if (ability === 'combo') return COMBO_LAB;
      return TANK_ABILITIES[ability] || TANK_ABILITIES.slam;
    }
    return { label: 'Wave', duration: 4, sample: () => ({ label: 'wave' }) };
  }
  function cuesFor(model, ability) {
    if (model === 'tank' && ability === 'combo') return COMBO_LAB.strikes.map((at) => ({ at, id: 'strike' }));
    if (built.has(model)) return built.get(model).cues(ability);
    const tl = timelineFor(model, ability);
    return tl.cues || [];
  }

  function set(patch) {
    if (patch.model && patch.model !== state.model) {
      state.model = patch.model;
      state.ability = ABILITIES[state.model][0][0];
      state.t = 0;
      state.rate = 1;
      state.movePhase = 0;
      wyrm.lab.reset();
      resetModels();
    }
    for (const k of ['mode', 'ability', 'view', 'turntable', 'classic', 'rate', 'azimuth']) if (k in patch) state[k] = patch[k];
    if ('t' in patch) state.t = Math.max(0, patch.t);
    if (patch.ability) state.t = patch.t ?? 0;
    if (patch.mode === 'move') state.movePhase = 0;
    if (patch.mode && patch.mode !== 'move') resetModels();
    ui?.refresh();
  }
  function resetModels() {
    for (const g of [wyrm.group, wyrmClassic.group, tank.group, tankClassic.group]) g.position.set(0, 0, 0);
    wyrm.setYaw(0);
    wyrmClassic.setYaw(0);
    tank.setYaw(0);
    tankClassic.setYaw(0);
    wyrm.lab.reset();
    for (const inst of built.values()) {
      inst.group.position.set(0, 0, 0);
      if (inst.classic) inst.classic.position.set(0, 0, 0);
    }
  }

  const ui = typeof document !== 'undefined' ? mountModelLab({ models: MODELS, modes: MODES, abilities: (m) => ABILITIES[m], get: () => state, set }) : null;

  // --- Per-frame drive.
  const tmp = new Vector3();
  let lastElapsed = null;
  let idleT = 0;
  let classicTel = 0;

  function update(elapsedSec) {
    const rawDt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;
    setInkViewport(window.innerWidth, window.innerHeight);
    const still = state.mode === 'still';
    const dt = still ? 0 : rawDt;
    idleT += dt;
    const F = FRAME[state.model];
    const tl = timelineFor(state.model, state.ability);
    state.duration = tl.duration;

    // Ability playhead: loops with a rest; Rewind runs it back to 0.
    if (state.mode === 'ability') {
      const before = state.t;
      state.t += rawDt * state.rate;
      if (state.rate < 0 && state.t <= 0) {
        state.t = 0;
        state.rate = 1;
      }
      if (state.t > tl.duration + REST_GAP) state.t = 0;
      if (state.rate > 0) for (const c of cuesFor(state.model, state.ability)) if (before < c.at && state.t >= c.at) cueAt(c.id);
    }
    const abT = Math.min(state.t, tl.duration);

    // Move: a loop at the model's game speed.
    const moving = state.mode === 'move';
    if (moving) state.movePhase += (dt * F.speed) / Math.max(0.1, F.loop);

    // Show the current model (and its classic twin beside it).
    const showW = state.model === 'wyrm';
    const showT = state.model === 'tank';
    wyrm.group.visible = showW;
    wyrmClassic.group.visible = showW && state.classic;
    tank.group.visible = showT;
    tankClassic.group.visible = showT && state.classic;
    kit.group.visible = state.model === 'kit';
    const sideX = state.classic ? F.side : 0;

    if (showW) {
      let x = 0;
      let z = 0;
      let yaw = 0;
      if (moving) {
        const a = state.movePhase;
        x = Math.sin(a) * F.loop;
        z = -Math.cos(a) * F.loop + F.loop * 0.4;
        yaw = Math.atan2(Math.cos(a), Math.sin(a));
      }
      wyrm.group.position.set(x + sideX, 0, z);
      wyrm.setYaw(yaw);
      root.updateMatrixWorld(true);
      wyrm.lab.pose({ dt, ability: state.mode === 'ability' || (still && state.t > 0) ? state.ability : null, abT, moveK: moving ? 1 : 0, rigid: !moving });
      // classic twin: the old rig, fed a stand-in entity
      wyrmClassic.group.position.set(-sideX + x, 0, z);
      wyrmClassic.setYaw(yaw);
      const s = state.mode === 'ability' ? tl.sample(abT) : null;
      const ab = state.ability;
      const tel = s && ((ab === 'breath' && s.id === 'draw') || (ab === 'burrow' && s.id === 'rise')) ? { attack: ab === 'breath' ? 'breath' : 'emerge' } : null;
      classicTel += ((tel ? 1 : 0) - classicTel) * (1 - Math.exp(-12 * dt));
      const burrowed = !!(s && ab === 'burrow' && ['dive', 'tunnel', 'rise'].includes(s.id) && (s.id !== 'dive' || s.k > 0.6));
      wyrmClassic.pose({ t: idleT, walkPhase: 0, moveK: moving ? 1 : 0, telegraphK: classicTel, hpFrac: 1, e: { telegraph: tel, burrowed, enraged: false } });
    }

    if (showT) {
      let x = 0;
      let z = 0;
      let yaw = 0;
      let clip = 'idle';
      if (moving) {
        // a loop: forward for half, then a sidestep and a backpedal while
        // facing the middle (the locked feet must step every way)
        const a = state.movePhase;
        x = Math.sin(a) * F.loop;
        z = -Math.cos(a) * F.loop;
        const travel = Math.atan2(Math.cos(a), Math.sin(a));
        const lap = (a / (Math.PI * 2)) % 1;
        const toMid = Math.atan2(-x, -z);
        yaw = lap < 0.5 ? travel : toMid + (lap < 0.75 ? 0 : Math.PI / 2);
        clip = 'walk';
      }
      tank.group.position.set(x + sideX, 0, z);
      tank.setYaw(yaw);
      tankClassic.group.position.set(x - sideX, 0, z);
      tankClassic.setYaw(yaw);
      if (state.mode === 'ability' || (still && state.t > 0)) {
        if (state.ability === 'combo') {
          const h = COMBO_LAB.at(abT);
          tank.lab.override = { kind: 'hit', n: h.n, t: h.t, fresh: h.fresh };
        } else tank.lab.override = { kind: 'ability', id: state.ability, t: abT };
        clip = 'cast';
      } else tank.lab.override = null;
      tank.setAnim(clip);
      // classic twin: its single cast pose, re-triggered on each strike
      tankClassic.setAnim(clip);
      tank.update(dt);
      tankClassic.update(dt);
    }

    if (state.model === 'kit') kit.update(idleT);
    for (const [id, inst] of built) {
      const on = state.model === id;
      inst.group.visible = on;
      if (inst.classic) inst.classic.visible = on && state.classic;
      if (on) inst.update(state, dt, abT);
    }

    // Readout.
    if (state.model === 'tank' && state.ability === 'combo') state.readout = `${abT.toFixed(1)}s · ${COMBO_LAB.at(abT).label}`;
    else if (state.model === 'kit') state.readout = 'parts kit: scales and bands round a moving spine, spikes with tips, a crest fan, teeth, rivets';
    else if (built.has(state.model) && tl.readout) state.readout = tl.readout(abT);
    else state.readout = `${abT.toFixed(1)}s · ${tl.label}: ${tl.sample(abT).label}`;
    if (state.mode === 'ability' && state.rate < 0) state.readout += ' · rewind';
    if (state.mode !== 'ability' && state.mode !== 'still') state.readout = `${state.mode} · ${state.readout.replace(/^[\d.]+s · /, '')}`;

    // Camera.
    placeCamera(rawDt);
    vfx.update(rawDt);
    ui?.refresh();
  }

  function cueAt(id) {
    if (built.has(state.model)) {
      const g = built.get(state.model).group;
      built.get(state.model).onCue(id, { x: g.position.x, z: g.position.z, yaw: 0 });
      return;
    }
    const g = state.model === 'wyrm' ? wyrm.group : tank.group;
    onCue(state.model, id, { x: g.position.x, z: g.position.z, yaw: state.model === 'tank' ? 0 : 0 });
  }

  const look = new Vector3();
  function placeCamera(dt) {
    const F = FRAME[state.model];
    const cam = stage.camera;
    const g = built.has(state.model) ? built.get(state.model).group : state.model === 'wyrm' ? wyrm.group : state.model === 'tank' ? tank.group : kit.group;
    if (state.view === 'play') {
      cam.fov = CAMERA.fov;
      cam.updateProjectionMatrix();
      const e = (CAMERA.elevationDeg * Math.PI) / 180;
      const fx = state.classic ? 0 : g.position.x;
      const fz = state.classic ? 0 : g.position.z;
      cam.position.set(fx, CAMERA.distance * Math.sin(e), fz + CAMERA.distance * Math.cos(e));
      cam.lookAt(fx, 0, fz);
      return;
    }
    if (state.turntable && state.mode !== 'still') state.azimuth += dt * 0.22;
    cam.fov = SHOW_FOV;
    cam.updateProjectionMatrix();
    const dist = F.dist * (state.classic ? 1.75 : 1) + (state.mode === 'move' ? F.loop * 1.6 : 0);
    const cx = state.classic || state.mode === 'move' ? 0 : g.position.x;
    const cz = (state.classic || state.mode === 'move' ? 0 : g.position.z) + F.z;
    look.set(cx, F.y, cz);
    cam.position.set(cx + Math.sin(state.azimuth) * Math.cos(SHOW_ELEV) * dist, F.y + Math.sin(SHOW_ELEV) * dist, cz + Math.cos(state.azimuth) * Math.cos(SHOW_ELEV) * dist);
    cam.lookAt(look);
  }

  // --- Probe surface.
  function debugState() {
    const g = built.has(state.model) ? built.get(state.model).group : state.model === 'wyrm' ? wyrm.group : tank.group;
    g.getWorldPosition(tmp);
    return {
      lab: 'modellab',
      model: state.model,
      mode: state.mode,
      ability: state.ability,
      t: Math.round(state.t * 1000) / 1000,
      rate: state.rate,
      view: state.view,
      classic: state.classic,
      readout: state.readout,
      duration: state.duration,
      pos: [Math.round(tmp.x * 100) / 100, Math.round(tmp.z * 100) / 100],
      tankFeet: tank.lab && tank.lab.feet ? tank.lab.feet() : null,
      ...(built.has(state.model) ? { [state.model]: built.get(state.model).debug() } : {}),
    };
  }
  function cmd(name, args) {
    if (name !== 'lab') return undefined;
    set(args && args[0] ? args[0] : {});
    return debugState();
  }

  resetModels();
  update(0);
  return { name: 'modellab', root, update, debugState, cmd };
}

// The Effect kit tab: the parts on their own (render/facet/kit.js).
function buildKitShowcase() {
  const group = new Group();
  group.name = 'modellab-kit';
  const stone = facetMaterial(new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.signalBlue), 0.25).multiplyScalar(0.8));
  const dark = facetMaterial(new Color(PALETTE.bruiseUmber).lerp(new Color(PALETTE.signalBlue), 0.2));
  const brass = facetMaterial(new Color(PALETTE.paleGold).lerp(new Color(PALETTE.warmGrey), 0.65));
  const bone = facetMaterial(PALETTE.bone);
  const spine = createSpine(8);
  const radius = (u) => 0.42 * (1 - u * 0.75) + 0.06;
  const tube = createPlateTube({ spine, rings: 20, around: 7, radius, plateMat: stone, bandMat: brass, bandEvery: 5, bandAround: 9, name: 'kit-scales' });
  const coreGeo = facetize(new IcosahedronGeometry(1, 1), { jitter: 0.08, seed: 21 });
  group.add(tube.plates);
  if (tube.bands) group.add(tube.bands);
  const spikes = createSpineRow({ spine, count: 12, u0: 0.05, u1: 0.9, height: (u) => 0.4 * (1 - u) + 0.1, radius, mat: dark, tip: { mat: brass, frac: 0.36 }, name: 'kit-spikes' });
  group.add(spikes.mesh);
  if (spikes.tips) group.add(spikes.tips);
  const cores = [];
  for (let i = 0; i < 8; i++) {
    const m = new Mesh(coreGeo, dark);
    group.add(m);
    cores.push(m);
  }
  const wedge = wedgeGeometry();
  const P = new Vector3();
  const X = new Vector3(1, 0, 0);
  const Y = new Vector3();
  const Z = new Vector3();
  const fan = placeRow(wedge, dark, 9, (i, m) => {
    const a = -1.1 + (2.2 * i) / 8;
    Y.set(Math.sin(a), Math.cos(a), 0);
    Z.set(0, 0, 1);
    X.crossVectors(Y, Z);
    setTRS(m, P.set(-3.2 + Math.sin(a) * 0.1, 0.3, 1.8), X, Y, Z, 0.24, 1.0 - 0.3 * Math.abs(a), 0.1);
  }, { name: 'kit-fan' });
  group.add(fan);
  const teeth = placeRow(wedge, bone, 10, (i, m) => {
    Y.set(0, -1, 0);
    Z.set(0, 0, 1);
    X.set(1, 0, 0);
    setTRS(m, P.set(2.4 + i * 0.16, 0.5, 1.8), X, Y, Z, 0.1, i % 3 === 1 ? 0.32 : 0.2, 0.07);
  }, { name: 'kit-teeth' });
  group.add(teeth);
  const plates = placeRow(plateGeometry(), stone, 12, (i, m) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    Y.set(0, Math.cos(0.5), Math.sin(0.5));
    Z.set(0, -Math.sin(0.5), Math.cos(0.5));
    X.set(1, 0, 0);
    setTRS(m, P.set(-0.5 + col * 0.36 + (row % 2) * 0.18, 0.2 + row * 0.22, 2.4 - row * 0.12), X, Y, Z, 0.34, 0.16, 0.3);
  }, { name: 'kit-mail' });
  group.add(plates);
  const C = new Vector3();
  const T = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  function update(t) {
    for (let i = 0; i < spine.pts.length; i++) {
      const u = i / (spine.pts.length - 1);
      spine.pts[i].set(Math.sin(t * 1.4 - u * 5) * 0.55, 0.42 + 0.25 * Math.max(0, 1 - u * 3) * (1 + Math.sin(t)), 1.6 - u * 5.4);
    }
    for (let i = 0; i < cores.length; i++) {
      const u = 0.03 + (0.95 * i) / (cores.length - 1);
      spine.frame(u, C, T, N, B);
      const r = radius(u);
      cores[i].position.copy(C);
      cores[i].scale.set(r * 0.95, r * 0.8, r * 1.1);
      cores[i].lookAt(C.x + T.x, C.y + T.y, C.z + T.z);
    }
    tube.update();
    spikes.update();
  }
  update(0);
  return { group, update };
}
