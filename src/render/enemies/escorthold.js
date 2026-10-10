// ESCORT AND HOLD (docs/ROOM_OBJECTIVES.md, content plan 3 slice 7): the
// Escort's walking pilgrim and its road, and the Hold's sigil ring and rifts.
// Mounted by the enemy layer (./index.js) beside the hunt and purge marks.
// Render-only: it reads sim entities, the room view and events, and never
// writes the sim.
//
// THE ESCORT (Hearth Amber — the pilgrim's lantern):
//   - the event room's lost pilgrim (interactables/encounters.js propPilgrim),
//     now walking: a step bob and sway, the staff planted on each step, the
//     lantern swinging; a warm diamond over its head so it reads in a crowd
//   - its lantern pool on the ground, and a dashed ring at the reach the
//     party must keep (the pilgrim walks only while someone is inside it)
//   - the road ahead: lantern motes drifting along the rest of the route to
//     a waypost of light at the far end (a turning rune circle and a pillar)
//     that brightens as the pilgrim nears it
//   - WAITING (left alone): the ring brightens and pulses, the lantern is
//     raised and swung, a call wave rolls out every second
//   - a blow: the figure flashes white and flinches, the lantern gutters
//   - ARRIVES: the waypost flares, an amber shockwave and an ember geyser,
//     the pilgrim bows and fades into the light
//   - FALLS: the lantern shatters in sparks and smoke, the figure topples
// THE HOLD (Pale Gold — the sigil; violet stays the corruption's):
//   - a sigil ring on the floor: an outer and inner band, eight turning rune
//     arcs, a six-point star at the heart, a soft fill, a column of light and
//     motes rising round the rim; sixty notches round the rim fill as the
//     hold's clock runs (the time left reads in the world, not just the HUD)
//   - manned: the fill glows warmer; EMPTY: the light gutters, flickers and
//     cools toward ember, the arcs slow, a warning ripple runs inward
//   - the SURGE (the last stretch): a heartbeat pulse and outward waves
//   - OUT: the ring snuffs, a smoke ring, the stone greys and fades
//   - SEALED (held to the end): the column flares to the sky, a shockwave to
//     6 u, gold sparks; the ring fades out bright
//   - the RIFTS: a tall torn slit of violet light at each of three points on
//     the room's edge, with a dark core, swirling motes and a ground stain;
//     each spawn flares it and streams motes to where the beast rises
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { HITFLASH, TICK_HZ } from '../../core/constants.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo, releaseTree } from '../geocache.js';
import { addInk, groundShadow, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { propPilgrim } from '../interactables/encounters.js';
import { OBJECTIVE_RULES } from '../../sim/objectives.js';

const AMBER = PALETTE.hearthAmber;
const AMBER_HOT = mix(PALETTE.hearthAmber, PALETTE.parchment, 0.55);
const GOLD = PALETTE.paleGold;
const GOLD_HOT = mix(PALETTE.paleGold, PALETTE.parchment, 0.6);
const EMBER = PALETTE.emberDanger;
const VIOLET = PALETTE.godstuffViolet;
const VIOLET_HOT = PALETTE.godstuffVioletPeak;
const NOTCHES = 60;
const ROAD_MOTES = 26;

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
const glow = (color, size, opacity) => {
  const s = makeGlowSprite({ color, size, opacity });
  s.material.toneMapped = false;
  return s;
};

// A ground shockwave that expands and fades.
function makeWave(parent, color) {
  const mat = flat(color, 0);
  const mesh = onGround(new Mesh(sharedGeo('eh-wave', () => new RingGeometry(0.88, 1.0, 72)), mat), 0.05);
  mesh.renderOrder = 4;
  mesh.visible = false;
  parent.add(mesh);
  let age = 9;
  let dur = 0.5;
  let reach = 2.4;
  let from = 0.3;
  return {
    mat,
    fire(r = 2.4, d = 0.5, start = 0.3) {
      age = 0;
      reach = r;
      dur = d;
      from = start;
    },
    update(dt) {
      age += dt;
      const w = Math.min(1, age / dur);
      const s = from + (reach - from) * (1 - (1 - w) * (1 - w));
      mesh.scale.set(s, s, 1);
      mat.opacity = age < dur ? 0.9 * (1 - w) : 0;
      mesh.visible = age < dur;
    },
  };
}

// ---------------------------------------------------------------- escort --
function buildPilgrim() {
  const g = new Group();
  const fig = new Group();
  fig.scale.setScalar(1.18); // a touch larger than the event room's, to read in a fight
  g.add(fig);
  const prop = propPilgrim(fig);
  for (const m of prop.mats) {
    m.emissive = new Color(PALETTE.parchment);
    m.emissiveIntensity = 0;
  }
  g.add(groundShadow(0.42, 0.42));
  // The lantern's pool on the ground.
  const poolMat = soft(AMBER, 0.32);
  const pool = onGround(new Mesh(sharedGeo('eh-pool', () => new CircleGeometry(1, 32)), poolMat), 0.02);
  pool.scale.set(1.9, 1.9, 1);
  pool.renderOrder = 2;
  g.add(pool);
  // The reach ring: dashes at the escort distance.
  const reach = new Group();
  const dashMat = flat(AMBER, 0.22);
  const R = OBJECTIVE_RULES.escort.nearU;
  for (let i = 0; i < 36; i++) {
    const d = onGround(new Mesh(sharedGeo('eh-dash', () => new RingGeometry(R - 0.05, R + 0.05, 3, 1, 0, ((Math.PI * 2) / 36) * 0.55)), dashMat), 0.025);
    d.rotation.z = (i / 36) * Math.PI * 2;
    reach.add(d);
  }
  g.add(reach);
  // The diamond over its head.
  const gemMat = new MeshBasicMaterial({ color: new Color(AMBER_HOT), toneMapped: false });
  const gem = new Mesh(sharedGeo('eh-gem', () => new OctahedronGeometry(0.14, 0)), gemMat);
  gem.scale.set(1, 1.6, 1);
  addInk(gem);
  g.add(gem);
  const gemGlow = glow(AMBER, 0.8, 0.7);
  g.add(gemGlow);
  const wave = makeWave(g, AMBER_HOT);
  return { g, fig, prop, poolMat, pool, reach, dashMat, gem, gemGlow, wave };
}

// The waypost at the road's end: a turning rune circle and a pillar.
function buildWaypost() {
  const g = new Group();
  const bandMat = flat(AMBER, 0.5);
  g.add(onGround(new Mesh(sharedGeo('eh-wp-band', () => new RingGeometry(0.95, 1.05, 56)), bandMat), 0.03));
  const runes = new Group();
  const runeMat = flat(AMBER_HOT, 0.6);
  for (let i = 0; i < 6; i++) {
    const r = onGround(new Mesh(sharedGeo('eh-wp-rune', () => new RingGeometry(0.66, 0.8, 10, 1, 0.12, Math.PI / 3 - 0.24)), runeMat), 0.031);
    r.rotation.z = (i * Math.PI) / 3;
    runes.add(r);
  }
  g.add(runes);
  const fillMat = soft(AMBER, 0.3);
  const fill = onGround(new Mesh(sharedGeo('eh-wp-fill', () => new CircleGeometry(1.2, 32)), fillMat), 0.02);
  fill.renderOrder = 2;
  g.add(fill);
  const pillar = glow(AMBER, 1, 0.26);
  pillar.scale.set(1.1, 6.5, 1);
  pillar.position.y = 3;
  g.add(pillar);
  const core = glow(AMBER_HOT, 1, 0.3);
  core.scale.set(0.28, 5.4, 1);
  core.position.y = 2.6;
  g.add(core);
  const wave = makeWave(g, AMBER_HOT);
  return { g, bandMat, runes, runeMat, fillMat, pillar, core, wave };
}

// ------------------------------------------------------------------ hold --
function buildSigil(radius) {
  const g = new Group();
  const k = radius;
  const bandMat = flat(GOLD, 0.7);
  const outer = onGround(new Mesh(sharedGeo('eh-sg-outer', () => new RingGeometry(0.95, 1.0, 96)), bandMat), 0.03);
  outer.scale.set(k, k, 1);
  g.add(outer);
  const innerMat = flat(GOLD, 0.45);
  const inner = onGround(new Mesh(sharedGeo('eh-sg-inner', () => new RingGeometry(0.8, 0.83, 80)), innerMat), 0.03);
  inner.scale.set(k, k, 1);
  g.add(inner);
  // Eight rune arcs between the bands (turning).
  const arcs = new Group();
  const arcMat = flat(GOLD_HOT, 0.65);
  for (let i = 0; i < 8; i++) {
    const a = onGround(new Mesh(sharedGeo('eh-sg-arc', () => new RingGeometry(0.85, 0.92, 12, 1, 0.08, Math.PI / 4 - 0.3)), arcMat), 0.032);
    a.rotation.z = (i * Math.PI) / 4;
    arcs.add(a);
  }
  arcs.scale.set(k, k, 1);
  g.add(arcs);
  // The star at the heart: two triangles (three-segment ring outlines).
  const star = new Group();
  const starMat = flat(GOLD_HOT, 0.55);
  for (let i = 0; i < 2; i++) {
    const tri = onGround(new Mesh(sharedGeo('eh-sg-tri', () => new RingGeometry(0.42, 0.46, 3, 1)), starMat), 0.033);
    tri.rotation.z = i * Math.PI + Math.PI / 2;
    star.add(tri);
  }
  const hub = onGround(new Mesh(sharedGeo('eh-sg-hub', () => new RingGeometry(0.12, 0.15, 32)), starMat), 0.033);
  star.add(hub);
  star.scale.set(k, k, 1);
  g.add(star);
  // The clock: sixty notches round the rim, lit as the hold runs.
  const notchMat = flat(GOLD_HOT, 0.85);
  const notchDim = flat(GOLD, 0.12);
  const notches = [];
  for (let i = 0; i < NOTCHES; i++) {
    const n = onGround(new Mesh(sharedGeo('eh-sg-notch', () => new RingGeometry(1.03, 1.12, 2, 1, -0.022, 0.044)), notchDim), 0.034);
    n.rotation.z = Math.PI / 2 - (i / NOTCHES) * Math.PI * 2;
    n.scale.set(k, k, 1);
    g.add(n);
    notches.push(n);
  }
  const fillMat = soft(GOLD, 0.26);
  const fill = onGround(new Mesh(sharedGeo('eh-sg-fill', () => new CircleGeometry(1, 40)), fillMat), 0.02);
  fill.scale.set(k * 1.05, k * 1.05, 1);
  fill.renderOrder = 2;
  g.add(fill);
  const column = glow(GOLD, 1, 0.22);
  column.scale.set(k * 0.9, 7, 1);
  column.position.y = 3.2;
  g.add(column);
  const core = glow(GOLD_HOT, 1, 0.24);
  core.scale.set(0.35, 6, 1);
  core.position.y = 2.8;
  g.add(core);
  const motes = [];
  for (let i = 0; i < 14; i++) {
    const m = glow(mix(GOLD, PALETTE.parchment, 0.4), 0.13, 0.8);
    g.add(m);
    motes.push({ m, a: (i / 14) * Math.PI * 2, ph: (i * 0.37) % 1 });
  }
  const wave = makeWave(g, GOLD_HOT);
  const inWave = makeWave(g, EMBER);
  return { g, bandMat, innerMat, arcs, arcMat, star, starMat, notches, notchMat, notchDim, fillMat, column, core, motes, wave, inWave, radius: k };
}

function buildRift() {
  const g = new Group();
  const slitMat = new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(VIOLET), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
  const slit = new Mesh(sharedGeo('eh-rift-slit', () => new PlaneGeometry(1, 1)), slitMat);
  slit.scale.set(0.7, 2.2, 1);
  slit.position.y = 1.1;
  g.add(slit);
  const darkMat = new MeshBasicMaterial({ color: new Color('#120A18'), transparent: true, opacity: 0.85, depthWrite: false, side: DoubleSide });
  const dark = new Mesh(sharedGeo('eh-rift-dark', () => new PlaneGeometry(1, 1)), darkMat);
  dark.scale.set(0.16, 1.6, 1);
  dark.position.y = 1.0;
  dark.renderOrder = 5;
  g.add(dark);
  const hot = glow(VIOLET_HOT, 1, 0.5);
  hot.scale.set(0.5, 1.9, 1);
  hot.position.y = 1.05;
  g.add(hot);
  const halo = glow(VIOLET, 2.4, 0.35);
  halo.position.y = 1.0;
  g.add(halo);
  const stainMat = new MeshBasicMaterial({ map: getRadialTexture(), color: new Color('#1A1220'), transparent: true, opacity: 0.7, depthWrite: false });
  const stain = onGround(new Mesh(sharedGeo('eh-rift-stain', () => new CircleGeometry(1, 28)), stainMat), 0.012);
  stain.scale.set(1.4, 1.4, 1);
  stain.renderOrder = 1;
  g.add(stain);
  const rimMat = flat(VIOLET, 0.3);
  const rim = onGround(new Mesh(sharedGeo('eh-rift-rim', () => new RingGeometry(0.9, 1.0, 48)), rimMat), 0.02);
  rim.scale.set(1.1, 1.1, 1);
  g.add(rim);
  const motes = [];
  for (let i = 0; i < 7; i++) {
    const m = glow(mix(VIOLET, VIOLET_HOT, 0.4), 0.12, 0.8);
    g.add(m);
    motes.push({ m, a: i * 0.9, ph: i / 7 });
  }
  const wave = makeWave(g, VIOLET_HOT);
  return { g, slit, slitMat, dark, darkMat, hot, halo, stainMat, rimMat, motes, wave, flare: 9 };
}

export function createEscortHoldFx({ root, world, bus, cosmetic }) {
  const fxRoot = new Group();
  fxRoot.name = 'escortholdfx';
  root.add(fxRoot);

  // --- escort
  let pil = null; // { id, build, flashUntilTick, flinch, step, lastX, lastZ, call, state, age }
  let post = null; // { build, x, z }
  let road = null; // [[x, z], ...]
  let roadLen = 0;
  // The road ahead: a lantern mote over a warm print on the ground, pooled.
  const motes = [];
  for (let i = 0; i < ROAD_MOTES; i++) {
    const m = glow(mix(AMBER, PALETTE.parchment, 0.3), 0.3, 0);
    m.visible = false;
    const disc = onGround(new Mesh(sharedGeo('eh-road', () => new CircleGeometry(0.16, 14)), flat(AMBER, 0)), 0.022);
    m.userData.disc = disc;
    disc.visible = false;
    fxRoot.add(m);
    fxRoot.add(disc);
    motes.push(m);
  }
  // --- hold
  let sig = null; // { build, x, z, light, out, sealed, age, surge, beat }
  const rifts = []; // { build, x, z }
  const streams = []; // { sprite, from, to, age }
  const loose = []; // free-standing waves { w, group, age, dur }

  function freeWave(x, z, color, reach, dur) {
    const group = new Group();
    group.position.set(x, 0, z);
    fxRoot.add(group);
    const w = makeWave(group, color);
    w.fire(reach, dur);
    loose.push({ w, group, age: 0, dur });
  }
  function drop(obj) {
    if (!obj) return;
    fxRoot.remove(obj);
    releaseTree(obj);
  }
  function dropEscort() {
    if (pil) drop(pil.build.g);
    pil = null;
    if (post) drop(post.build.g);
    post = null;
    road = null;
    for (const m of motes) m.visible = m.userData.disc.visible = false;
  }
  function dropHold() {
    if (sig) drop(sig.build.g);
    sig = null;
    for (const r of rifts.splice(0)) drop(r.build.g);
    for (const st of streams.splice(0)) drop(st.sprite);
  }

  function setRoad(route) {
    road = route.map((p) => [p[0], p[1]]);
    roadLen = 0;
    for (let i = 1; i < road.length; i++) roadLen += Math.hypot(road[i][0] - road[i - 1][0], road[i][1] - road[i - 1][1]);
    const [ex, ez] = road[road.length - 1];
    if (post) drop(post.build.g);
    const build = buildWaypost();
    build.g.position.set(ex, 0, ez);
    fxRoot.add(build.g);
    build.wave.fire(2.2, 0.6);
    post = { build, x: ex, z: ez, flare: 0 };
  }
  // A point `s` u along the road from its start.
  function along(s) {
    let left = s;
    for (let i = 1; i < road.length; i++) {
      const [ax, az] = road[i - 1];
      const [bx, bz] = road[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (left <= L) {
        const u = L > 0 ? left / L : 0;
        return [ax + (bx - ax) * u, az + (bz - az) * u];
      }
      left -= L;
    }
    return road[road.length - 1];
  }

  bus.on('pilgrim_spawn', (ev) => {
    if (Array.isArray(ev.route) && ev.route.length > 1) setRoad(ev.route);
    impactFx.embers(ev.x, ev.z, { color: AMBER, n: 16, radius: 0.5, tall: 1.8 });
    freeWave(ev.x, ev.z, AMBER_HOT, 2.4, 0.6);
  });
  bus.on('pilgrim_wait', () => {
    if (pil) pil.call = 0;
  });
  bus.on('pilgrim_walk', (ev) => {
    freeWave(ev.x, ev.z, AMBER, 1.6, 0.4);
  });
  bus.on('pilgrim_arrive', (ev) => {
    freeWave(ev.x, ev.z, AMBER_HOT, 5.2, 0.9);
    impactFx.embers(ev.x, ev.z, { color: AMBER_HOT, n: 40, radius: 0.9, tall: 3.4 });
    impactFx.spray('spark', ev.x, 0.8, ev.z, 26, { color: PALETTE.paleGold, speed: [2, 4.5], up: [2.5, 5], life: [0.6, 1.1], size: [0.08, 0.18] });
    if (post) {
      post.flare = 1;
      post.build.wave.fire(4, 0.8);
    }
    if (pil) pil.state = 'arrived';
  });
  bus.on('pilgrim_lost', (ev) => {
    const x = pil ? pil.build.g.position.x : ev.x;
    const z = pil ? pil.build.g.position.z : ev.z;
    impactFx.spray('shard', x + 0.4, 1.3, z, 18, { color: AMBER_HOT, speed: [1.5, 3.5], up: [1, 3], life: [0.4, 0.8], size: [0.05, 0.12] });
    impactFx.spray('spark', x + 0.4, 1.3, z, 16, { color: AMBER, speed: [1, 3], up: [1, 3], life: [0.4, 0.9], size: [0.06, 0.14] });
    impactFx.spray('smoke', x, 0.5, z, 10, { color: '#5A4E44', speed: [0.5, 1.4], up: [0.4, 1.1], life: [0.8, 1.4], size: [0.4, 0.8], opacity: 0.5 });
    impactFx.scorch(x, z, 0.8);
    freeWave(x, z, AMBER, 2.2, 0.5);
    if (pil) pil.state = 'fallen';
    if (post) post.dim = true;
  });
  bus.on('hit', (ev) => {
    if (pil && ev.target === pil.id) {
      pil.flashUntilTick = ev.tick + HITFLASH.ticks;
      pil.flinch = 0.22;
    }
  });

  bus.on('hold_start', (ev) => {
    dropHold();
    const build = buildSigil(ev.radius ?? OBJECTIVE_RULES.hold.radius);
    build.g.position.set(ev.x, 0, ev.z);
    fxRoot.add(build.g);
    build.wave.fire(ev.radius * 1.6, 0.8);
    impactFx.embers(ev.x, ev.z, { color: GOLD_HOT, n: 30, radius: ev.radius * 0.8, tall: 2.6 });
    sig = { build, x: ev.x, z: ev.z, light: 1, out: false, sealed: false, age: 0, surge: false, beat: 0, endTick: ev.endTick, startTick: ev.tick, ripple: 0 };
    for (const r of ev.rifts ?? []) {
      const b = buildRift();
      b.g.position.set(r.x, 0, r.z);
      b.g.rotation.y = Math.atan2(-r.x, -r.z);
      b.wave.fire(2.2, 0.6);
      fxRoot.add(b.g);
      rifts.push({ build: b, x: r.x, z: r.z, open: 0 });
    }
  });
  bus.on('sigil_relit', () => {
    if (sig) sig.build.wave.fire(sig.build.radius * 1.15, 0.35, sig.build.radius * 0.5);
  });
  bus.on('hold_surge', () => {
    if (sig) {
      sig.surge = true;
      sig.build.wave.fire(sig.build.radius * 2.4, 0.7);
    }
  });
  bus.on('sigil_out', (ev) => {
    if (!sig) return;
    sig.out = true;
    sig.age = 0;
    impactFx.spray('smoke', ev.x, 0.3, ev.z, 16, { color: '#57524C', speed: [1.2, 2.6], up: [0.2, 0.7], life: [0.8, 1.4], size: [0.5, 0.9], opacity: 0.5 });
    freeWave(ev.x, ev.z, PALETTE.bone, sig.build.radius * 1.3, 0.6);
  });
  bus.on('sigil_sealed', (ev) => {
    if (!sig) return;
    sig.sealed = true;
    sig.age = 0;
    freeWave(ev.x, ev.z, GOLD_HOT, 6, 0.9);
    impactFx.spray('spark', ev.x, 0.6, ev.z, 34, { color: PALETTE.paleGold, speed: [2.5, 5.5], up: [2.5, 6], life: [0.6, 1.2], size: [0.08, 0.2] });
    impactFx.embers(ev.x, ev.z, { color: GOLD_HOT, n: 40, radius: 1.6, tall: 4 });
    for (const r of rifts) r.closing = 0;
  });
  bus.on('rift_pulse', (ev) => {
    const r = rifts[ev.rift];
    if (r) {
      r.build.flare = 0;
      r.build.wave.fire(1.8, 0.45);
    }
  });
  bus.on('spawn_telegraph', (ev) => {
    if (ev.rift === undefined) return;
    const r = rifts[ev.rift];
    if (!r) return;
    for (let i = 0; i < 5; i++) {
      const sp = glow(mix(VIOLET, VIOLET_HOT, 0.5), 0.2, 0.9);
      fxRoot.add(sp);
      streams.push({ sprite: sp, from: { x: r.x, z: r.z }, to: { x: ev.x, z: ev.z }, age: -i * 0.06 });
    }
  });
  bus.on('room_cleared', (ev) => {
    if (ev.mode === 'hold') for (const r of rifts) if (r.closing === undefined) r.closing = 0;
  });
  function clearAll() {
    dropEscort();
    dropHold();
  }
  bus.on('state_restored', clearAll);
  bus.on('run_end', clearAll);
  bus.on('room_enter', clearAll);

  function updateEscort(tSec, dt, alpha, tick) {
    let pe = null;
    for (const e of world.entities()) {
      if (e.kind === 'pilgrim') {
        pe = e;
        break;
      }
    }
    if (pe && (!pil || pil.id !== pe.id)) {
      if (pil) drop(pil.build.g);
      const build = buildPilgrim();
      fxRoot.add(build.g);
      pil = { id: pe.id, build, flashUntilTick: 0, flinch: 0, step: 0, call: 9, state: 'walk', age: 0, lastX: pe.x, lastZ: pe.z, fx: pe.faceX ?? 1, fz: pe.faceZ ?? 0, lean: 0 };
      if (!road && pe.escort && Array.isArray(pe.escort.route)) setRoad(pe.escort.route);
    }
    if (pil) {
      const b = pil.build;
      pil.age += dt;
      if (pe) {
        const ix = pe.px + (pe.x - pe.px) * alpha;
        const iz = pe.pz + (pe.z - pe.pz) * alpha;
        b.g.position.set(ix, 0, iz);
        pil.fx = pe.faceX ?? pil.fx;
        pil.fz = pe.faceZ ?? pil.fz;
      }
      const st = pe && pe.escort;
      const waiting = !!(st && st.waiting && !st.arrived) && pil.state === 'walk';
      const moved = pe ? Math.hypot(pe.x - pil.lastX, pe.z - pil.lastZ) : 0;
      if (pe) {
        pil.lastX = pe.x;
        pil.lastZ = pe.z;
      }
      const walking = moved > 1e-4 && pil.state === 'walk';
      if (walking) pil.step += moved * 3.4;
      // Face the way it walks (eased).
      const want = Math.atan2(pil.fx, pil.fz);
      let cur = b.fig.rotation.y;
      let dA = want - cur;
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      b.fig.rotation.y = cur + dA * (1 - Math.exp(-8 * dt));
      const bob = walking ? Math.abs(Math.sin(pil.step * Math.PI)) * 0.07 : 0;
      pil.lean += ((walking ? 0.1 : 0) - pil.lean) * (1 - Math.exp(-6 * dt));
      pil.flinch = Math.max(0, pil.flinch - dt);
      const fl = pil.flinch > 0 ? Math.sin((pil.flinch / 0.22) * Math.PI) : 0;
      b.prop.update(tSec, 1, dt);
      b.prop.body.position.y = bob;
      b.prop.body.rotation.x = pil.lean - 0.25 * fl;
      b.prop.body.rotation.z = (walking ? Math.sin(pil.step * Math.PI) * 0.06 : 0.03 * Math.sin(tSec * 1.1)) + 0.08 * fl * Math.sin(tSec * 60);
      // The lantern: swung on the walk, raised and rung while it waits.
      const swing = waiting ? Math.sin(tSec * 7) * 0.35 : walking ? Math.sin(pil.step * Math.PI) * 0.12 : 0;
      b.prop.lantern.position.y = 1.38 + (waiting ? 0.22 : 0);
      b.prop.light.position.y = b.prop.lantern.position.y;
      b.prop.lantern.rotation.z = swing;
      b.prop.staff.rotation.z = waiting ? -0.3 : walking ? Math.sin(pil.step * Math.PI) * 0.08 : 0;
      const gutter = pil.flinch > 0 ? 0.4 : 1;
      const flick = 0.85 + 0.15 * Math.sin(tSec * 17) * Math.sin(tSec * 5.3);
      const s = (waiting ? 1.25 : 1) * flick * gutter;
      b.prop.light.scale.set(s, s, 1);
      const lit = tick < pil.flashUntilTick ? HITFLASH.intensity : 0;
      for (const m of b.prop.mats) m.emissiveIntensity = lit;
      // Pool + reach ring.
      const hpFrac = pe && pe.maxHp > 0 ? Math.max(0, pe.hp / pe.maxHp) : 0;
      b.poolMat.opacity = (0.22 + 0.1 * flick) * gutter * (pil.state === 'walk' ? 1 : 0.5);
      b.reach.rotation.y = tSec * 0.12;
      pil.call += dt;
      if (waiting && pil.call >= 1.0) {
        pil.call = 0;
        b.wave.fire(OBJECTIVE_RULES.escort.nearU, 0.9, 0.6);
      }
      b.dashMat.opacity = pil.state !== 'walk' ? 0 : waiting ? 0.45 + 0.3 * Math.max(0, Math.sin(tSec * 6)) : 0.16;
      b.dashMat.color.set(waiting ? AMBER_HOT : AMBER);
      b.wave.update(dt);
      // The head diamond (dims as it is hurt, ember-tinged under a third).
      const hy = 1.75 + 0.08 * Math.sin(tSec * 3);
      b.gem.position.y = hy;
      b.gem.rotation.y = tSec * 2;
      b.gemGlow.position.y = hy;
      b.gem.material.color.set(hpFrac < 0.34 ? mix(AMBER_HOT, EMBER, 0.6) : AMBER_HOT);
      b.gemGlow.material.opacity = (0.5 + 0.3 * Math.sin(tSec * (hpFrac < 0.34 ? 9 : 3))) * (pil.state === 'walk' ? 1 : 0);
      b.gem.visible = pil.state === 'walk';
      // The end: bow and fade into the light, or topple.
      if (pil.state === 'arrived' || pil.state === 'fallen') {
        pil.end = (pil.end ?? 0) + dt;
        const k = Math.min(1, pil.end / (pil.state === 'arrived' ? 1.6 : 0.6));
        if (pil.state === 'arrived') {
          b.prop.body.rotation.x = 0.35 * Math.sin(Math.min(1, pil.end / 0.8) * Math.PI);
          b.fig.position.y = k * 0.25;
          const fade = 1 - Math.max(0, (pil.end - 0.8) / 0.8);
          b.fig.visible = fade > 0.02;
          b.fig.scale.setScalar(Math.max(0.02, fade));
          if (fade > 0 && cosmetic.range(0, 1) < dt * 20) impactFx.embers(b.g.position.x, b.g.position.z, { color: AMBER_HOT, n: 2, radius: 0.4, tall: 2.4 });
        } else {
          b.fig.rotation.x = -k * 1.4;
          b.fig.position.y = -k * 0.05;
          b.prop.light.visible = false;
          if (pil.end > 1.6) b.fig.visible = false;
        }
      }
      if (!pe && pil.state === 'walk') {
        drop(pil.build.g);
        pil = null;
      }
    }
    // The road: motes drifting forward along what is left of it.
    if (road && pil && pe && pe.escort && pil.state === 'walk') {
      const done = pe.escort.walked ?? 0;
      const left = Math.max(0, roadLen - done);
      const gap = 0.75;
      const shift = (tSec * 0.9) % gap;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const s = done + 0.9 + i * gap + shift;
        const disc = m.userData.disc;
        if (s > roadLen - 0.2) {
          m.visible = disc.visible = false;
          continue;
        }
        const [x, z] = along(s);
        m.visible = disc.visible = true;
        m.position.set(x, 0.22 + 0.06 * Math.sin(tSec * 3 + i), z);
        disc.position.set(x, 0.022, z);
        const near = Math.min(1, (s - done) / 1.5);
        const far = Math.max(0, 1 - (s - done) / Math.max(4, Math.min(left, 18)));
        // A slow pulse runs down the road toward the waypost.
        const pulse = 0.6 + 0.4 * Math.max(0, Math.sin((s - tSec * 2.4) * 1.3));
        m.material.opacity = 0.85 * near * (0.35 + 0.65 * far) * pulse;
        disc.material.opacity = 0.5 * near * (0.3 + 0.7 * far) * pulse;
        const sc = 0.3 + 0.08 * Math.sin(tSec * 4 + i * 1.3);
        m.scale.set(sc, sc, 1);
      }
    } else for (const m of motes) m.visible = m.userData.disc.visible = false;
    // The waypost.
    if (post) {
      const b = post.build;
      const d = pil && pe ? Math.hypot(pe.x - post.x, pe.z - post.z) : 20;
      const nearK = Math.max(0, 1 - d / 8);
      post.flare = Math.max(0, post.flare - dt * 0.7);
      const dim = post.dim ? 0.25 : 1;
      b.runes.rotation.y = tSec * (0.5 + nearK);
      b.bandMat.opacity = (0.4 + 0.3 * nearK + 0.5 * post.flare) * dim;
      b.runeMat.opacity = (0.45 + 0.35 * nearK + 0.5 * post.flare) * dim * (0.85 + 0.15 * Math.sin(tSec * 4));
      b.fillMat.opacity = (0.2 + 0.2 * nearK + 0.5 * post.flare) * dim;
      b.pillar.material.opacity = (0.2 + 0.15 * nearK + 0.6 * post.flare) * dim;
      b.pillar.scale.set(1.1 + 1.2 * post.flare, 6.5 + 4 * post.flare, 1);
      b.core.material.opacity = (0.24 + 0.2 * nearK + 0.6 * post.flare) * dim;
      b.wave.update(dt);
    }
  }

  function updateHold(tSec, dt, tick) {
    if (sig) {
      const b = sig.build;
      sig.age += dt;
      const room = world.roomState ? world.roomState() : null;
      const sg = room && room.sigil ? room.sigil : null;
      const fade = sg ? sg.fade : sig.out ? 1 : 0;
      const empty = !!(sg && sg.empty);
      const light = sig.out ? 0 : 1 - fade;
      // The clock.
      const total = OBJECTIVE_RULES.hold.timerTicks;
      const run = sig.endTick ? Math.min(1, Math.max(0, 1 - (sig.endTick - tick) / total)) : 0;
      const lit = sig.sealed ? NOTCHES : Math.floor(run * NOTCHES);
      for (let i = 0; i < NOTCHES; i++) b.notches[i].material = i < lit ? b.notchMat : b.notchDim;
      const warmCol = empty ? mix(GOLD, EMBER, Math.min(1, fade * 1.4)) : GOLD;
      const flick = empty ? 0.6 + 0.4 * Math.abs(Math.sin(tSec * (9 + fade * 14))) : 1;
      sig.beat = sig.surge && !sig.sealed && !sig.out ? Math.pow(Math.max(0, Math.sin(tSec * Math.PI * 2.2)), 8) : 0;
      if (sig.surge && !sig.sealed && !sig.out) {
        sig.ripple += dt;
        if (sig.ripple >= 0.9) {
          sig.ripple = 0;
          b.wave.fire(b.radius * 1.8, 0.6, b.radius);
        }
      }
      if (empty && !sig.out) {
        sig.inRipple = (sig.inRipple ?? 0) + dt;
        if (sig.inRipple >= 0.5) {
          sig.inRipple = 0;
          b.inWave.fire(b.radius * 0.35, 0.5, b.radius);
        }
      }
      let k = light * flick;
      let gone = 1;
      if (sig.out) {
        gone = Math.max(0, 1 - sig.age / 1.4);
        k = 0.25 * gone;
      }
      if (sig.sealed) {
        gone = Math.max(0, 1 - Math.max(0, sig.age - 0.6) / 1.6);
        k = (1 + 1.5 * Math.max(0, 1 - sig.age / 0.6)) * gone;
      }
      const grey = sig.out ? '#77716A' : null;
      b.bandMat.color.set(grey ?? warmCol);
      b.arcMat.color.set(grey ?? (empty ? mix(GOLD_HOT, EMBER, fade) : GOLD_HOT));
      b.starMat.color.set(grey ?? (empty ? mix(GOLD_HOT, EMBER, fade) : GOLD_HOT));
      b.fillMat.color.set(grey ?? warmCol);
      b.bandMat.opacity = Math.min(1, 0.7 * k + 0.25 * sig.beat);
      b.innerMat.opacity = 0.45 * k;
      b.arcMat.opacity = Math.min(1, 0.65 * k + 0.3 * sig.beat);
      b.starMat.opacity = 0.55 * k * (0.85 + 0.15 * Math.sin(tSec * 2));
      b.notchMat.opacity = 0.85 * Math.max(0.3, k) * gone;
      b.notchDim.opacity = 0.12 * gone;
      b.fillMat.opacity = (empty ? 0.12 : 0.24) * k + 0.18 * sig.beat;
      b.arcs.rotation.y = tSec * (empty ? 0.15 : sig.surge ? 1.1 : 0.45);
      b.star.rotation.y = -tSec * 0.2;
      b.column.material.opacity = (0.2 * k + 0.2 * sig.beat) * (sig.out ? 0 : 1);
      b.core.material.opacity = 0.24 * k * (sig.out ? 0 : 1);
      const flareK = sig.sealed ? Math.max(0, 1 - sig.age / 1.2) : 0;
      b.column.scale.set(b.radius * (0.9 + 1.2 * flareK), 7 + 8 * flareK, 1);
      for (const mo of b.motes) {
        const u = (tSec * 0.3 + mo.ph) % 1;
        const a = mo.a + tSec * 0.25;
        const r = b.radius * (0.98 - 0.15 * u);
        mo.m.position.set(Math.cos(a) * r, 0.2 + u * 2.4 * (1 + flareK), Math.sin(a) * r);
        mo.m.material.opacity = 0.8 * Math.sin(Math.PI * u) * k;
        mo.m.material.color.set(grey ?? (empty ? mix(GOLD, EMBER, fade) : mix(GOLD, PALETTE.parchment, 0.4)));
      }
      b.wave.update(dt);
      b.inWave.update(dt);
      if ((sig.out || sig.sealed) && sig.age > 2.6) {
        drop(b.g);
        sig = null;
      }
    }
    for (let i = rifts.length - 1; i >= 0; i--) {
      const r = rifts[i];
      const b = r.build;
      r.open = Math.min(1, r.open + dt / 0.6);
      b.flare += dt;
      const fl = b.flare < 0.5 ? Math.sin((b.flare / 0.5) * Math.PI) : 0;
      let k = r.open;
      if (r.closing !== undefined) {
        r.closing += dt;
        k *= Math.max(0, 1 - r.closing / 0.8);
        if (r.closing > 1.0) {
          drop(b.g);
          rifts.splice(i, 1);
          continue;
        }
      }
      const w = 0.7 * (0.9 + 0.1 * Math.sin(tSec * 7 + i)) * (1 + 0.5 * fl);
      b.slit.scale.set(w * k, 2.2 * (0.4 + 0.6 * k), 1);
      b.slitMat.opacity = 0.85 * k;
      b.dark.scale.set(0.16 * k * (1 + 0.6 * fl), 1.6 * (0.4 + 0.6 * k), 1);
      b.darkMat.opacity = 0.85 * k;
      b.hot.material.opacity = (0.45 + 0.4 * fl) * k;
      b.halo.material.opacity = (0.3 + 0.35 * fl) * k;
      b.halo.scale.setScalar(2.2 + 1.2 * fl);
      b.rimMat.opacity = (0.25 + 0.3 * fl) * k;
      b.stainMat.opacity = 0.7 * k;
      for (const mo of b.motes) {
        const u = (tSec * 0.5 + mo.ph) % 1;
        const a = mo.a + tSec * 2.2;
        const rr = 0.55 * (1 - u);
        mo.m.position.set(Math.cos(a) * rr, 0.3 + u * 1.9, Math.sin(a) * rr * 0.4);
        mo.m.material.opacity = 0.8 * Math.sin(Math.PI * u) * k;
      }
      b.wave.update(dt);
    }
    for (let i = streams.length - 1; i >= 0; i--) {
      const st = streams[i];
      st.age += dt;
      const u = st.age / 0.45;
      if (u >= 1) {
        drop(st.sprite);
        streams.splice(i, 1);
        continue;
      }
      const v = Math.max(0, u);
      st.sprite.visible = u >= 0;
      st.sprite.position.set(st.from.x + (st.to.x - st.from.x) * v, 1.0 + Math.sin(v * Math.PI) * 0.7 - v * 0.6, st.from.z + (st.to.z - st.from.z) * v);
      st.sprite.material.opacity = 0.9 * (1 - v * 0.6);
    }
  }

  function update(tSec, dt, alpha) {
    const tick = world.tick;
    updateEscort(tSec, dt, alpha, tick);
    updateHold(tSec, dt, tick);
    for (let i = loose.length - 1; i >= 0; i--) {
      const w = loose[i];
      w.age += dt;
      w.w.update(dt);
      if (w.age > w.dur + 0.05) {
        drop(w.group);
        loose.splice(i, 1);
      }
    }
  }

  // First-draw warm-up (like the enemy rigs), parked far below the floor.
  function prewarm(warmPark) {
    warmPark(fxRoot, buildPilgrim().g);
    warmPark(fxRoot, buildWaypost().g);
    warmPark(fxRoot, buildSigil(OBJECTIVE_RULES.hold.radius).g);
    warmPark(fxRoot, buildRift().g);
  }

  function debugState() {
    return {
      pilgrim: pil ? { id: pil.id, state: pil.state } : null,
      road: road ? road.length : 0,
      roadMotes: motes.filter((m) => m.visible).length,
      waypost: !!post,
      sigil: sig ? { out: sig.out, sealed: sig.sealed, surge: sig.surge } : null,
      rifts: rifts.length,
    };
  }

  return { update, prewarm, debugState };
}
