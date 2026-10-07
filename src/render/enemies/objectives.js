// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): the hunt's quarry marks and the
// purge's corruption nests. Mounted by the enemy layer (./index.js), which
// draws the quarry's own rig; this file adds what makes it THE quarry, and
// draws the nests whole. Render-only: it reads sim entities and events and
// never writes the sim.
//
// THE QUARRY (Signal Blue — the mark colour, BUILD_BRIEF §19.1):
//   - a turning reticle on the ground under it (four notched arcs, an inner
//     band and a soft pool), a tall light pillar that reads across the room,
//     and a diamond marker bobbing over its head
//   - a spoor of glowing prints behind it as it runs (pooled, fading)
//   - WINDED (its rest beat, the party's window): the reticle tightens and
//     flares bright, breath puffs rise off it
//   - its escape nears: the pillar and reticle blink faster through the last
//     ten seconds
//   - breaking cover: a ground shockwave and a flash; escaping: the pillar
//     collapses into a puff of dust; killed: a bright burst and a ring of
//     Pale Gold sparks (the bounty)
// THE NESTS (Godstuff Violet — corruption only):
//   - a dark pustule of lumps over a ring of roots, a violet core glowing
//     through it on a heartbeat, a corruption stain on the ground, motes
//   - each spawn: the nest swells, a violet shockwave rolls out and motes
//     stream to the spot the enemy rises from
//   - wounded: the core burns brighter, the heartbeat quickens, the body
//     shrinks and shudders; hits flash it white
//   - rooted (the purge failed): the roots surge outward
//   - destroyed: a violet burst, a shockwave to 3 u, flying chunks; the
//     stain greys out and fades
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { HITFLASH, TICK_HZ } from '../../core/constants.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo, releaseTree } from '../geocache.js';
import { addInk, groundShadow, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { OBJECTIVE_RULES } from '../../sim/objectives.js';

const BLUE = PALETTE.signalBlue;
const BLUE_HOT = mix(PALETTE.signalBlue, PALETTE.parchment, 0.55);
const VIOLET = PALETTE.godstuffViolet;
const VIOLET_HOT = PALETTE.godstuffVioletPeak;
const NEST_SKIN = '#3A2C3F';
const NEST_SKIN_DARK = '#251C29';
const PRINTS = 28;

const flat = (color, opacity) =>
  new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
const soft = (color, opacity) =>
  new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const onGround = (mesh, y) => {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 3;
  return mesh;
};

// A ground shockwave ring that expands and fades (shared by both objectives).
function makeWave(parent, color) {
  const mat = flat(color, 0);
  const mesh = onGround(new Mesh(sharedGeo('obj-wave', () => new RingGeometry(0.86, 1.0, 64)), mat), 0.05);
  mesh.renderOrder = 4;
  parent.add(mesh);
  let age = 9;
  let dur = 0.5;
  let reach = 2.4;
  return {
    fire(r = 2.4, d = 0.5) {
      age = 0;
      reach = r;
      dur = d;
    },
    update(dt) {
      age += dt;
      const w = Math.min(1, age / dur);
      const s = 0.3 + reach * (1 - (1 - w) * (1 - w));
      mesh.scale.set(s, s, 1);
      mat.opacity = age < dur ? 0.9 * (1 - w) : 0;
      mesh.visible = age < dur;
    },
  };
}

// ---------------------------------------------------------------- quarry --
function buildQuarryMark() {
  const g = new Group();
  const ringMat = flat(BLUE, 0.7);
  const arcs = new Group();
  for (let i = 0; i < 4; i++) {
    const arc = onGround(new Mesh(sharedGeo('q-arc', () => new RingGeometry(0.78, 0.9, 20, 1, 0.18, Math.PI / 2 - 0.36)), ringMat), 0.03);
    arc.rotation.z = (i * Math.PI) / 2;
    arcs.add(arc);
  }
  g.add(arcs);
  // Notch ticks pointing in (the reticle read).
  const tickMat = flat(BLUE_HOT, 0.8);
  const ticks = new Group();
  for (let i = 0; i < 4; i++) {
    const tk = onGround(new Mesh(sharedGeo('q-tick', () => new RingGeometry(0.6, 0.98, 2, 1, -0.05, 0.1)), tickMat), 0.031);
    tk.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    ticks.add(tk);
  }
  g.add(ticks);
  const innerMat = flat(BLUE, 0.4);
  const inner = onGround(new Mesh(sharedGeo('q-inner', () => new RingGeometry(0.5, 0.55, 48)), innerMat), 0.029);
  g.add(inner);
  const poolMat = soft(BLUE, 0.28);
  const pool = onGround(new Mesh(sharedGeo('q-pool', () => new CircleGeometry(1.2, 28)), poolMat), 0.02);
  pool.renderOrder = 2;
  g.add(pool);
  // The pillar: two stacked stretched glows (a wide soft one, a thin hot core).
  const pillar = makeGlowSprite({ color: BLUE, size: 1, opacity: 0.3 });
  pillar.material.toneMapped = false;
  pillar.scale.set(1.2, 7.5, 1);
  pillar.position.y = 3.4;
  g.add(pillar);
  const core = makeGlowSprite({ color: BLUE_HOT, size: 1, opacity: 0.35 });
  core.material.toneMapped = false;
  core.scale.set(0.32, 6.2, 1);
  core.position.y = 3.0;
  g.add(core);
  // The diamond over its head.
  const gemMat = new MeshBasicMaterial({ color: new Color(BLUE_HOT), toneMapped: false });
  const gem = new Mesh(sharedGeo('q-gem', () => new OctahedronGeometry(0.17, 0)), gemMat);
  gem.scale.set(1, 1.6, 1);
  addInk(gem);
  g.add(gem);
  const gemGlow = makeGlowSprite({ color: BLUE, size: 0.9, opacity: 0.7 });
  gemGlow.material.toneMapped = false;
  g.add(gemGlow);
  return { g, arcs, ticks, inner, ringMat, tickMat, innerMat, poolMat, pillar, core, gem, gemGlow };
}

// ------------------------------------------------------------------ nest --
function buildNest(radius) {
  const g = new Group();
  const body = new Group();
  g.add(body);
  const skin = toonMaterial({ color: NEST_SKIN });
  const skinDark = toonMaterial({ color: NEST_SKIN_DARK });
  const mats = [skin, skinDark];
  for (const m of mats) m.emissive = new Color(PALETTE.parchment);
  // Lumps: a squat base, a swollen sac, three smaller blisters.
  const lumps = [
    [0, 0.26, 0, 0.62, 0.42, skinDark],
    [0, 0.6, 0, 0.5, 0.55, skin],
    [0.36, 0.34, 0.18, 0.3, 0.3, skin],
    [-0.3, 0.3, 0.26, 0.26, 0.26, skin],
    [0.05, 0.3, -0.38, 0.28, 0.24, skinDark],
  ];
  for (const [x, y, z, r, sy, m] of lumps) {
    const l = new Mesh(sharedGeo('nest-lump', () => new IcosahedronGeometry(1, 1)), m);
    l.scale.set(r * (radius / 0.62), sy * (radius / 0.62), r * (radius / 0.62));
    l.position.set(x, y, z);
    addInk(l);
    body.add(l);
  }
  // The core shows through slits in the sac (glowing beads + a glow).
  const coreMat = new MeshBasicMaterial({ color: new Color(VIOLET), toneMapped: false });
  const slits = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const s = new Mesh(sharedGeo('nest-slit', () => new SphereGeometry(1, 10, 8)), coreMat);
    s.scale.set(0.07, 0.2, 0.07);
    s.position.set(Math.cos(a) * 0.43, 0.64 + (i % 2) * 0.12, Math.sin(a) * 0.43);
    s.lookAt(Math.cos(a) * 2, 0.64, Math.sin(a) * 2);
    body.add(s);
    slits.push(s);
  }
  const crown = new Mesh(sharedGeo('nest-crown', () => new SphereGeometry(1, 14, 10)), coreMat);
  crown.scale.set(0.16, 0.1, 0.16);
  crown.position.y = 1.12;
  body.add(crown);
  const glow = makeGlowSprite({ color: VIOLET, size: 2.6, opacity: 0.6 });
  glow.material.toneMapped = false;
  glow.position.y = 0.7;
  g.add(glow);
  const hot = makeGlowSprite({ color: VIOLET_HOT, size: 0.95, opacity: 0.6 });
  hot.material.toneMapped = false;
  hot.position.y = 1.14;
  g.add(hot);
  // Roots: cones lying flat, radiating.
  const roots = new Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    const len = 0.8 + (i % 3) * 0.25;
    const r = new Mesh(sharedGeo('nest-root', () => new ConeGeometry(0.11, 1, 6)), skinDark);
    r.scale.set(1, len, 1);
    r.rotation.z = Math.PI / 2;
    const pivot = new Group();
    pivot.rotation.y = -a;
    r.position.set(radius * 0.7 + len * 0.5, 0.06, 0);
    pivot.add(r);
    roots.add(pivot);
  }
  g.add(roots);
  // Stain: a dark disc (normal blend) under a violet rim glow.
  const stainMat = new MeshBasicMaterial({ map: getRadialTexture(), color: new Color('#1A1220'), transparent: true, opacity: 0.75, depthWrite: false });
  const stain = onGround(new Mesh(sharedGeo('nest-stain', () => new CircleGeometry(1, 28)), stainMat), 0.012);
  stain.scale.set(radius * 3.4, radius * 3.4, 1);
  stain.renderOrder = 1;
  g.add(stain);
  const rimMat = flat(VIOLET, 0.35);
  const rim = onGround(new Mesh(sharedGeo('nest-rim', () => new RingGeometry(0.92, 1.0, 56)), rimMat), 0.02);
  rim.scale.set(radius * 1.9, radius * 1.9, 1);
  g.add(rim);
  g.add(groundShadow(0.7, 0.4));
  const motes = [];
  for (let i = 0; i < 8; i++) {
    const m = makeGlowSprite({ color: mix(VIOLET, VIOLET_HOT, 0.4), size: 0.12, opacity: 0.8 });
    m.material.toneMapped = false;
    g.add(m);
    motes.push({ m, a: i * 0.785, ph: i / 8, r: 0.5 + (i % 3) * 0.2 });
  }
  return { g, body, mats, coreMat, slits, crown, glow, hot, roots, stainMat, rimMat, motes };
}

export function createObjectiveFx({ root, world, bus, cosmetic }) {
  const fxRoot = new Group();
  fxRoot.name = 'objectivefx';
  root.add(fxRoot);

  // --- quarry state
  let mark = null; // { id, build, wave, lastX, lastZ, breath }
  const prints = [];
  for (let i = 0; i < PRINTS; i++) {
    const m = onGround(new Mesh(sharedGeo('q-print', () => new CircleGeometry(0.11, 10)), flat(BLUE, 0)), 0.018);
    m.scale.set(1, 1.5, 1);
    m.visible = false;
    fxRoot.add(m);
    prints.push({ m, age: 9 });
  }
  let printNext = 0;
  let printSide = 1;

  // --- nests
  const nests = new Map(); // id -> { build, wave, swell, flashUntilTick, lastHp }
  const dyingNests = []; // { build, age }
  const streams = []; // { sprite, from, to, age }
  const waves = []; // free-standing shockwaves at a point { w, group }

  function freeWave(x, z, color, reach, dur) {
    const group = new Group();
    group.position.set(x, 0, z);
    fxRoot.add(group);
    const w = makeWave(group, color);
    w.fire(reach, dur);
    waves.push({ w, group, age: 0, dur });
  }

  function dropMark() {
    if (!mark) return;
    fxRoot.remove(mark.build.g);
    releaseTree(mark.build.g);
    fxRoot.remove(mark.waveGroup);
    releaseTree(mark.waveGroup);
    mark = null;
  }

  bus.on('quarry_spawn', (ev) => {
    freeWave(ev.x, ev.z, BLUE_HOT, 2.8, 0.6);
    impactFx.spray('spark', ev.x, 0.5, ev.z, 14, { color: BLUE_HOT, speed: [2, 4], up: [1.5, 3.5], life: [0.4, 0.8], size: [0.08, 0.16] });
    impactFx.spray('smoke', ev.x, 0.3, ev.z, 6, { color: PALETTE.bone, speed: [0.6, 1.4], up: [0.3, 0.8], life: [0.6, 1.0], size: [0.4, 0.7], opacity: 0.4 });
  });
  bus.on('quarry_escape', (ev) => {
    impactFx.spray('smoke', ev.x, 0.3, ev.z, 10, { color: PALETTE.bone, speed: [0.8, 2], up: [0.4, 1.2], life: [0.6, 1.2], size: [0.4, 0.8], opacity: 0.45 });
    freeWave(ev.x, ev.z, BLUE, 1.6, 0.4);
    if (mark) mark.escaping = 0;
  });
  bus.on('death', (ev) => {
    if (mark && ev.id === mark.id) {
      freeWave(ev.x, ev.z, BLUE_HOT, 3.4, 0.6);
      impactFx.spray('spark', ev.x, 0.6, ev.z, 26, { color: PALETTE.paleGold, speed: [2.5, 5], up: [2, 4.5], life: [0.5, 1.0], size: [0.08, 0.18] });
      impactFx.spray('spark', ev.x, 0.6, ev.z, 14, { color: BLUE_HOT, speed: [1.5, 3], up: [2.5, 5], life: [0.5, 0.9], size: [0.1, 0.2] });
      dropMark();
      return;
    }
    const n = nests.get(ev.id);
    if (n) killNest(ev.id, n, ev.x, ev.z);
  });
  bus.on('enemy_despawn', (ev) => {
    if (mark && ev.id === mark.id) dropMark();
    const n = nests.get(ev.id);
    if (n) {
      nests.delete(ev.id);
      fxRoot.remove(n.build.g);
      releaseTree(n.build.g);
    }
  });
  bus.on('hit', (ev) => {
    const n = nests.get(ev.target);
    if (n) {
      n.flashUntilTick = ev.tick + HITFLASH.ticks;
      n.shudder = 0.18;
    }
  });
  bus.on('nest_pulse', (ev) => {
    const n = nests.get(ev.id);
    if (!n) return;
    n.swell = 0;
    n.wave.fire(2.0, 0.55);
  });
  bus.on('spawn_telegraph', (ev) => {
    if (ev.nest === undefined) return;
    const n = nests.get(ev.nest);
    const from = n ? { x: n.build.g.position.x, z: n.build.g.position.z } : null;
    if (!from) return;
    for (let i = 0; i < 5; i++) {
      const sp = makeGlowSprite({ color: mix(VIOLET, VIOLET_HOT, 0.5), size: 0.2, opacity: 0.9 });
      sp.material.toneMapped = false;
      fxRoot.add(sp);
      streams.push({ sprite: sp, from, to: { x: ev.x, z: ev.z }, age: -i * 0.06 });
    }
  });
  bus.on('purge_rooted', () => {
    for (const n of nests.values()) {
      n.rooted = true;
      n.wave.fire(3.2, 0.8);
    }
  });

  function killNest(id, n, x, z) {
    nests.delete(id);
    freeWave(x, z, VIOLET_HOT, 3.0, 0.65);
    impactFx.spray('chunk', x, 0.6, z, 16, { color: NEST_SKIN, speed: [2, 4.5], up: [2, 4], life: [0.6, 1.1], size: [0.1, 0.2] });
    impactFx.spray('spark', x, 0.7, z, 22, { color: VIOLET, speed: [1.5, 4], up: [2, 5], life: [0.5, 1.0], size: [0.1, 0.22] });
    impactFx.spray('smoke', x, 0.4, z, 8, { color: '#4A3A55', speed: [0.5, 1.4], up: [0.4, 1.0], life: [0.8, 1.4], size: [0.5, 0.9], opacity: 0.5 });
    impactFx.scorch(x, z, 1.1);
    dyingNests.push({ n, age: 0 });
  }

  function update(tSec, dt, alpha, rigs) {
    const tick = world.tick;
    // ------------------------------------------------------------ quarry
    let qe = null;
    for (const e of world.entities()) {
      if (e.quarry && e.state !== undefined) {
        qe = e;
        break;
      }
    }
    if (qe && (!mark || mark.id !== qe.id)) {
      dropMark();
      const build = buildQuarryMark();
      fxRoot.add(build.g);
      const waveGroup = new Group();
      fxRoot.add(waveGroup);
      mark = { id: qe.id, build, waveGroup, wave: makeWave(waveGroup, BLUE_HOT), lastX: qe.x, lastZ: qe.z, breath: 0, escaping: null, tight: 1 };
    }
    if (mark && qe) {
      const b = mark.build;
      const ix = qe.px + (qe.x - qe.px) * alpha;
      const iz = qe.pz + (qe.z - qe.pz) * alpha;
      b.g.position.set(ix, 0, iz);
      mark.waveGroup.position.set(ix, 0, iz);
      const winded = !!(qe.quarry && qe.quarry.winded) && qe.state === 'active';
      const left = qe.quarry ? (qe.quarry.escapeTick - tick) / TICK_HZ : 99;
      const warn = left < OBJECTIVE_RULES.hunt.warnTicks / TICK_HZ && qe.state === 'active';
      const blinkHz = warn ? 2 + (1 - Math.max(0, left) / 10) * 5 : 0;
      const blink = warn ? 0.55 + 0.45 * Math.max(0, Math.sin(tSec * Math.PI * 2 * blinkHz)) : 1;
      const tightTo = winded ? 0.72 : 1;
      mark.tight += (tightTo - mark.tight) * (1 - Math.exp(-10 * dt));
      const lit = winded ? 1.5 : 1;
      const sc = (qe.radius ?? 0.5) / 0.5;
      b.arcs.scale.setScalar(mark.tight * sc);
      b.ticks.scale.setScalar(mark.tight * sc);
      b.inner.scale.setScalar(mark.tight * sc);
      b.arcs.rotation.y = tSec * (winded ? 2.4 : 0.9);
      b.ticks.rotation.y = -tSec * 0.5;
      b.ringMat.opacity = Math.min(1, 0.7 * lit * blink);
      b.tickMat.opacity = Math.min(1, 0.8 * lit * blink);
      b.innerMat.opacity = 0.4 * lit * blink;
      b.poolMat.opacity = (winded ? 0.45 : 0.26) * blink;
      const fade = qe.state === 'active' ? 1 : Math.max(0, 1 - (mark.escaping = (mark.escaping ?? 0) + dt) / 0.4);
      b.pillar.material.opacity = 0.28 * blink * fade * (winded ? 1.4 : 1);
      b.core.material.opacity = 0.34 * blink * fade;
      b.pillar.scale.y = 7.5 * fade + 0.01;
      b.core.scale.y = 6.2 * fade + 0.01;
      const headY = 1.25 * sc + 0.45 + 0.1 * Math.sin(tSec * 3.2);
      b.gem.position.y = headY;
      b.gem.rotation.y = tSec * 2.2;
      b.gemGlow.position.y = headY;
      b.gemGlow.material.opacity = 0.7 * blink * fade;
      b.gem.visible = fade > 0.05;
      mark.wave.update(dt);
      // Spoor: a print every 0.32 u of travel, alternating sides.
      const moved = Math.hypot(qe.x - mark.lastX, qe.z - mark.lastZ);
      if (moved >= 0.32 && qe.state === 'active') {
        const dx = (qe.x - mark.lastX) / moved;
        const dz = (qe.z - mark.lastZ) / moved;
        mark.lastX = qe.x;
        mark.lastZ = qe.z;
        const p = prints[printNext];
        printNext = (printNext + 1) % PRINTS;
        printSide = -printSide;
        p.m.position.set(qe.x - dz * 0.14 * printSide, 0.018, qe.z + dx * 0.14 * printSide);
        p.m.rotation.z = Math.atan2(dx, dz);
        p.age = 0;
        p.m.visible = true;
      }
      // Winded: breath puffs.
      if (winded) {
        mark.breath -= dt;
        if (mark.breath <= 0) {
          mark.breath = 0.28;
          const fx = qe.faceX ?? 0;
          const fz = qe.faceZ ?? 1;
          impactFx.spray('smoke', qe.x + fx * 0.45 * sc, 0.55 * sc, qe.z + fz * 0.45 * sc, 1, { color: PALETTE.parchment, speed: 0.4, up: [0.5, 0.9], life: [0.5, 0.8], size: [0.18, 0.3], opacity: 0.5, gravity: 0 });
        }
        if (!mark.wasWinded) mark.wave.fire(1.4, 0.35);
      }
      mark.wasWinded = winded;
    } else if (mark && !qe) dropMark();
    for (const p of prints) {
      if (!p.m.visible) continue;
      p.age += dt;
      const k = 1 - p.age / 2.6;
      if (k <= 0) p.m.visible = false;
      else p.m.material.opacity = 0.55 * k;
    }

    // ------------------------------------------------------------- nests
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'nest' || !(e.hp > 0)) continue;
      seen.add(e.id);
      let n = nests.get(e.id);
      if (!n) {
        const build = buildNest(e.radius ?? 0.62);
        build.g.position.set(e.x, 0, e.z);
        build.g.rotation.y = cosmetic.range(0, Math.PI * 2);
        fxRoot.add(build.g);
        n = { build, wave: makeWave(build.g, VIOLET), swell: 9, flashUntilTick: 0, shudder: 0, rooted: false, rootK: 1, phase: cosmetic.range(0, 6) };
        n.wave.fire(2.4, 0.6);
        nests.set(e.id, n);
      }
      const b = n.build;
      const frac = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 1;
      const wounded = frac < 0.5;
      const bpm = wounded ? 2.4 : 1.4;
      const beat = Math.pow(Math.max(0, Math.sin((tSec + n.phase) * Math.PI * bpm)), 6);
      n.swell += dt;
      const sw = n.swell < 0.45 ? Math.sin((n.swell / 0.45) * Math.PI) : 0;
      const size = 0.82 + 0.18 * frac;
      const s = size * (1 + 0.05 * beat + 0.22 * sw);
      b.body.scale.set(s, s * (1 - 0.06 * beat), s);
      n.shudder = Math.max(0, n.shudder - dt);
      const sh = n.shudder > 0 ? (n.shudder / 0.18) * 0.06 : 0;
      b.body.position.set(Math.sin(tSec * 90) * sh + (wounded ? Math.sin(tSec * 37) * 0.012 : 0), 0, Math.cos(tSec * 83) * sh);
      const burn = 1 + (1 - frac) * 1.2;
      b.glow.material.opacity = Math.min(0.95, (0.5 + 0.3 * beat + 0.35 * sw) * burn);
      b.glow.scale.setScalar(2.4 + 0.7 * beat + 1.2 * sw);
      b.hot.material.opacity = Math.min(1, (0.4 + 0.5 * beat) * burn);
      for (const sl of b.slits) sl.scale.set(0.07, 0.2 * (0.8 + 0.5 * beat + (1 - frac) * 0.6), 0.07);
      b.rimMat.opacity = (0.28 + 0.2 * beat) * (n.rooted ? 1.6 : 1);
      n.rootK += ((n.rooted ? 1.55 : 1) - n.rootK) * (1 - Math.exp(-4 * dt));
      b.roots.scale.set(n.rootK, 1, n.rootK);
      b.roots.rotation.y = Math.sin(tSec * 0.7 + n.phase) * 0.04;
      const lit = tick < n.flashUntilTick ? HITFLASH.intensity : 0;
      for (const m of b.mats) m.emissiveIntensity = lit;
      for (const mo of b.motes) {
        const u = (tSec * 0.35 + mo.ph) % 1;
        const a = mo.a + tSec * 0.6;
        mo.m.position.set(Math.cos(a) * mo.r * (1 - 0.4 * u), 0.3 + u * 2.0, Math.sin(a) * mo.r * (1 - 0.4 * u));
        mo.m.material.opacity = 0.8 * Math.sin(Math.PI * u);
      }
      n.wave.update(dt);
    }
    for (const [id, n] of nests) {
      if (!seen.has(id)) {
        // Gone without a death event reaching us (a load, a reset).
        nests.delete(id);
        fxRoot.remove(n.build.g);
        releaseTree(n.build.g);
      }
    }
    for (let i = dyingNests.length - 1; i >= 0; i--) {
      const d = dyingNests[i];
      d.age += dt;
      const b = d.n.build;
      const T = 0.5;
      if (d.age >= 2.2) {
        fxRoot.remove(b.g);
        releaseTree(b.g);
        dyingNests.splice(i, 1);
        continue;
      }
      const k = Math.min(1, d.age / T);
      b.body.scale.set(1 + 0.5 * k, Math.max(0.02, 1 - k), 1 + 0.5 * k);
      b.body.visible = k < 1;
      b.glow.material.opacity = 0.9 * (1 - k);
      b.hot.material.opacity = 0;
      b.rimMat.opacity = 0.4 * (1 - k);
      b.stainMat.color.lerp(new Color('#2A2A2A'), 0.05);
      b.stainMat.opacity = 0.75 * Math.max(0, 1 - Math.max(0, d.age - 0.6) / 1.6);
      b.roots.scale.set(1 - 0.3 * k, Math.max(0.05, 1 - 0.8 * k), 1 - 0.3 * k);
      for (const mo of b.motes) mo.m.visible = false;
      d.n.wave.update(dt);
    }
    // Spawn streams: motes arc from the nest to the spawn point.
    for (let i = streams.length - 1; i >= 0; i--) {
      const st = streams[i];
      st.age += dt;
      const u = st.age / 0.45;
      if (u >= 1) {
        fxRoot.remove(st.sprite);
        releaseTree(st.sprite);
        streams.splice(i, 1);
        continue;
      }
      const v = Math.max(0, u);
      st.sprite.visible = u >= 0;
      st.sprite.position.set(st.from.x + (st.to.x - st.from.x) * v, 0.9 + Math.sin(v * Math.PI) * 0.9 - v * 0.5, st.from.z + (st.to.z - st.from.z) * v);
      st.sprite.material.opacity = 0.9 * (1 - v * 0.6);
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age += dt;
      w.w.update(dt);
      if (w.age > w.dur + 0.05) {
        fxRoot.remove(w.group);
        releaseTree(w.group);
        waves.splice(i, 1);
      }
    }
  }

  function clearAll() {
    dropMark();
    for (const n of nests.values()) {
      fxRoot.remove(n.build.g);
      releaseTree(n.build.g);
    }
    nests.clear();
    for (const d of dyingNests.splice(0)) {
      fxRoot.remove(d.n.build.g);
      releaseTree(d.n.build.g);
    }
    for (const st of streams.splice(0)) {
      fxRoot.remove(st.sprite);
      releaseTree(st.sprite);
    }
    for (const p of prints) p.m.visible = false;
  }
  bus.on('state_restored', clearAll);
  bus.on('run_end', clearAll);

  // Draw a nest and a quarry mark once at boot (first-draw warm-up, like the
  // enemy rigs), parked far below the floor.
  function prewarm(warmPark) {
    warmPark(fxRoot, buildNest(0.62).g);
    warmPark(fxRoot, buildQuarryMark().g);
  }

  function debugState() {
    return { quarryMark: mark ? mark.id : null, nests: nests.size, prints: prints.filter((p) => p.m.visible).length };
  }

  return { update, prewarm, debugState };
}
