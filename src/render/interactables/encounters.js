// EVENT ROOMS (docs/EVENT_ROOMS.md): the eight encounter bodies, drawn by the
// interactable layer (./index.js) for entities of kind 'encounter'.
//
// Every encounter shares one readable frame so a player knows at a glance
// "this is the thing to walk up to": a slowly turning rune circle on the
// ground in the encounter's colour, a soft light shaft over it, and motes
// spiralling up. The prop on top is its own silhouette (a blood-dark bowl
// on a plinth, a roofed well, an iron-bound chest, a cloaked pilgrim with a
// lantern, a slab altar under a floating violet shard, a pale spirit, a
// tarp over crates and coin, a ring of stones round bright water).
//
// States (driven by the sim's events, one encounter per room):
//   idle   the circle breathes; the shaft and motes run
//   open   the card is up: the circle brightens and quickens
//   taken  a burst in the encounter's colour, a shockwave ring to 2.4 u,
//          then each prop's own beat (the chest lid flies open, the spirit
//          swirls out, the shard cracks, the spring surges); then spent
//   left   the circle and shaft fade out; the prop stays, dimmed
// Colours keep the §19.1 rules: violet only on the altar (corruption), Bright
// Heal only on the spring's water (it heals), Ember only on the chest's
// ambush sparks (an enemy threat). Render-only; nothing here touches the sim.
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { addInk, groundShadow, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { hslColor } from '../../env/colors.js';

// The render-side accents (the UI card uses the same: ui/run/encounter.js).
export const ENCOUNTER_ACCENT = Object.freeze({
  blood_shrine: '#C2505F',
  wishing_well: PALETTE.signalBlue,
  trapped_chest: PALETTE.paleGold,
  lost_pilgrim: PALETTE.hearthAmber,
  corrupted_altar: PALETTE.godstuffViolet,
  wandering_spirit: '#A8D2DC',
  forgotten_cache: PALETTE.paleGold,
  healing_spring: PALETTE.brightHeal,
});

const STONE = hslColor(30, 0.06, 0.4);
const STONE_DARK = hslColor(30, 0.08, 0.24);
const WOOD = hslColor(28, 0.38, 0.27);
const WOOD_DARK = hslColor(26, 0.4, 0.17);
const IRON = hslColor(215, 0.06, 0.3);
const CLOTH = hslColor(34, 0.3, 0.46);

const add = (g, mesh, { ink = true, y = 0, x = 0, z = 0 } = {}) => {
  mesh.position.set(x, y, z);
  if (ink) addInk(mesh);
  g.add(mesh);
  return mesh;
};
const glowMat = (color, opacity = 0.6) =>
  new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const flatGlow = (color, opacity = 0.9) => new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });

// ------------------------------------------------------------- the frame --
// The rune circle (an outer band, six turning arc runes, an inner band), the
// light shaft (a camera-facing glow stretched tall) and the motes.
function buildFrame(g, accent) {
  const frame = new Group();
  g.add(frame);
  const outerMat = flatGlow(accent, 0.55);
  const outer = new Mesh(sharedGeo('ev-ring-outer', () => new RingGeometry(1.02, 1.1, 72)), outerMat);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.02;
  outer.renderOrder = 3;
  frame.add(outer);
  const runeMat = flatGlow(accent, 0.7);
  const runes = new Group();
  runes.position.y = 0.022;
  for (let i = 0; i < 6; i++) {
    const arc = new Mesh(sharedGeo('ev-ring-rune', () => new RingGeometry(0.84, 0.94, 12, 1, 0, 0.62)), runeMat);
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = (i / 6) * Math.PI * 2;
    arc.renderOrder = 3;
    runes.add(arc);
  }
  frame.add(runes);
  const innerMat = flatGlow(accent, 0.35);
  const inner = new Mesh(sharedGeo('ev-ring-inner', () => new RingGeometry(0.7, 0.74, 60)), innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.021;
  inner.renderOrder = 3;
  frame.add(inner);
  const poolMat = glowMat(accent, 0.22);
  const pool = new Mesh(sharedGeo('ev-pool', () => new CircleGeometry(1.15, 32)), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  pool.renderOrder = 2;
  frame.add(pool);
  const shaft = makeGlowSprite({ color: accent, size: 1, opacity: 0.22 });
  shaft.material.toneMapped = false;
  shaft.scale.set(1.1, 3.6, 1);
  shaft.position.y = 1.7;
  frame.add(shaft);
  const motes = [];
  for (let i = 0; i < 10; i++) {
    const m = makeGlowSprite({ color: mix(accent, PALETTE.parchment, 0.35), size: 0.1, opacity: 0.8 });
    m.material.toneMapped = false;
    frame.add(m);
    motes.push({ m, a: i * 0.628, ph: i / 10, r: 0.55 + (i % 3) * 0.17 });
  }
  // The take shockwave.
  const waveMat = flatGlow(mix(accent, PALETTE.parchment, 0.4), 0);
  const wave = new Mesh(sharedGeo('ev-wave', () => new RingGeometry(0.9, 1.0, 64)), waveMat);
  wave.rotation.x = -Math.PI / 2;
  wave.position.y = 0.04;
  wave.renderOrder = 4;
  g.add(wave);
  const flash = makeGlowSprite({ color: mix(accent, PALETTE.parchment, 0.5), size: 1, opacity: 0 });
  flash.material.toneMapped = false;
  flash.position.y = 0.9;
  g.add(flash);
  let lit = 1; // 1 idle .. 1.6 open .. 0 spent
  let want = 1;
  let burst = 9;
  return {
    setWant(w) {
      want = w;
    },
    burst() {
      burst = 0;
    },
    update(t, dt) {
      lit += (want - lit) * (1 - Math.exp(-3 * dt));
      const breathe = 0.82 + 0.18 * Math.sin(t * 2.2);
      const k = Math.max(0, lit);
      outerMat.opacity = 0.5 * k * breathe;
      runeMat.opacity = 0.62 * k * (0.75 + 0.25 * Math.sin(t * 3.1));
      innerMat.opacity = 0.32 * k;
      poolMat.opacity = 0.2 * k * breathe;
      runes.rotation.y = t * (0.25 + 0.35 * Math.max(0, k - 1));
      inner.rotation.z = -t * 0.4;
      shaft.material.opacity = 0.2 * k * (0.85 + 0.15 * Math.sin(t * 1.3));
      for (const mo of motes) {
        const u = (t * 0.32 + mo.ph) % 1;
        const a = mo.a + t * 0.7;
        mo.m.visible = k > 0.05;
        mo.m.position.set(Math.cos(a) * mo.r * (1 - 0.5 * u), 0.15 + u * 2.4, Math.sin(a) * mo.r * (1 - 0.5 * u));
        mo.m.material.opacity = 0.85 * Math.sin(Math.PI * u) * Math.min(1, k);
      }
      burst += dt;
      const w = Math.min(1, burst / 0.55);
      const s = 0.4 + 2.2 * (1 - Math.pow(1 - w, 2));
      wave.scale.set(s, s, 1);
      waveMat.opacity = burst < 0.55 ? 0.95 * (1 - w) : 0;
      const f = burst < 0.35 ? 1 - burst / 0.35 : 0;
      flash.material.opacity = 0.9 * f;
      flash.scale.set(1.4 + 2.4 * (1 - f), 1.4 + 2.4 * (1 - f), 1);
    },
  };
}

// ---------------------------------------------------------------- props --
function propShrine(g) {
  const stone = toonMaterial({ color: STONE });
  add(g, new Mesh(sharedGeo('ev-shr-base', () => new CylinderGeometry(0.42, 0.5, 0.16, 8)), stone), { y: 0.08 });
  add(g, new Mesh(sharedGeo('ev-shr-stem', () => new CylinderGeometry(0.16, 0.24, 0.5, 8)), stone), { y: 0.4 });
  const prof = [[0.1, 0], [0.4, 0.05], [0.48, 0.2], [0.42, 0.22], [0.34, 0.1], [0, 0.1]].map(([x, y]) => new Vector2(x, y));
  add(g, new Mesh(sharedGeo('ev-shr-bowl', () => new LatheGeometry(prof, 12)), stone), { y: 0.64 });
  const blood = new MeshBasicMaterial({ color: new Color('#5E1622'), toneMapped: false });
  const pool = new Mesh(sharedGeo('ev-shr-blood', () => new CircleGeometry(0.36, 18)), blood);
  pool.rotation.x = -Math.PI / 2;
  add(g, pool, { ink: false, y: 0.8 });
  const sheen = makeGlowSprite({ color: '#C2505F', size: 0.7, opacity: 0.3 });
  sheen.position.y = 0.86;
  g.add(sheen);
  const candles = [];
  const wax = toonMaterial({ color: PALETTE.bone });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const c = new Mesh(sharedGeo('ev-shr-candle', () => new CylinderGeometry(0.04, 0.045, 0.18, 6)), wax);
    add(g, c, { x: Math.cos(a) * 0.62, z: Math.sin(a) * 0.62, y: 0.09 });
    const fl = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.22, opacity: 0.9 });
    fl.material.toneMapped = false;
    fl.position.set(Math.cos(a) * 0.62, 0.24, Math.sin(a) * 0.62);
    g.add(fl);
    candles.push(fl);
  }
  return {
    update(t, k) {
      sheen.material.opacity = 0.18 + 0.14 * k * (0.7 + 0.3 * Math.sin(t * 1.7));
      candles.forEach((c, i) => {
        const s = 0.2 + 0.04 * Math.sin(t * 9 + i * 2.1);
        c.scale.set(s, s * 1.3, 1);
      });
    },
    take(x, z) {
      impactFx.embers(x, z, { color: '#C2505F', n: 18, radius: 0.6, tall: 2.2 });
    },
  };
}

function propWell(g) {
  const stone = toonMaterial({ color: STONE });
  const wood = toonMaterial({ color: WOOD });
  add(g, new Mesh(sharedGeo('ev-well-wall', () => new CylinderGeometry(0.55, 0.6, 0.55, 12, 1, true)), toonMaterial({ color: STONE, side: DoubleSide })), { y: 0.27 });
  add(g, new Mesh(sharedGeo('ev-well-rim', () => new TorusGeometry(0.57, 0.07, 6, 18).rotateX(Math.PI / 2)), stone), { y: 0.56 });
  const water = new MeshBasicMaterial({ color: new Color(mix(PALETTE.signalBlue, PALETTE.voidCharcoal, 0.55)), toneMapped: false });
  const wd = new Mesh(sharedGeo('ev-well-water', () => new CircleGeometry(0.52, 18)), water);
  wd.rotation.x = -Math.PI / 2;
  add(g, wd, { ink: false, y: 0.4 });
  for (const sx of [-1, 1]) add(g, new Mesh(sharedGeo('ev-well-post', () => new BoxGeometry(0.08, 1.2, 0.08)), wood), { x: sx * 0.6, y: 0.6 });
  add(g, new Mesh(sharedGeo('ev-well-beam', () => new BoxGeometry(1.36, 0.08, 0.08)), wood), { y: 1.2 });
  add(g, new Mesh(sharedGeo('ev-well-roof', () => new ConeGeometry(0.95, 0.45, 4).rotateY(Math.PI / 4)), toonMaterial({ color: WOOD_DARK })), { y: 1.48 });
  const bucket = new Group();
  bucket.position.y = 1.0;
  add(bucket, new Mesh(sharedGeo('ev-well-bucket', () => new CylinderGeometry(0.1, 0.08, 0.16, 8)), wood));
  g.add(bucket);
  const glints = [];
  for (let i = 0; i < 3; i++) {
    const s = makeGlowSprite({ color: PALETTE.paleGold, size: 0.12, opacity: 0.8 });
    s.material.toneMapped = false;
    s.position.set((i - 1) * 0.2, 0.42, (i % 2) * 0.15 - 0.05);
    g.add(s);
    glints.push(s);
  }
  return {
    update(t, k) {
      bucket.rotation.z = 0.08 * Math.sin(t * 1.2);
      glints.forEach((s, i) => (s.material.opacity = 0.75 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 2)) * Math.max(0.3, Math.min(1, k))));
    },
    take(x, z) {
      impactFx.embers(x, z, { color: PALETTE.paleGold, n: 14, radius: 0.4, tall: 1.6 });
      impactFx.embers(x, z, { color: PALETTE.signalBlue, n: 10, radius: 0.5, tall: 1.2 });
    },
  };
}

function propChest(g) {
  const wood = toonMaterial({ color: WOOD });
  const iron = toonMaterial({ color: IRON });
  add(g, new Mesh(sharedGeo('ev-chest-body', () => new BoxGeometry(0.86, 0.46, 0.56)), wood), { y: 0.23 });
  for (const sx of [-0.3, 0.3]) add(g, new Mesh(sharedGeo('ev-chest-band', () => new BoxGeometry(0.07, 0.48, 0.58)), iron), { x: sx, y: 0.23 });
  const lid = new Group();
  lid.position.set(0, 0.46, -0.28); // hinge at the back
  const lidMesh = new Mesh(sharedGeo('ev-chest-lid', () => new CylinderGeometry(0.28, 0.28, 0.86, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2)), wood);
  lidMesh.position.set(0, 0, 0.28);
  addInk(lidMesh);
  lid.add(lidMesh);
  g.add(lid);
  const lockMat = toonMaterial({ color: PALETTE.paleGold, emissive: PALETTE.paleGold, emissiveIntensity: 0.3 });
  add(g, new Mesh(sharedGeo('ev-chest-lock', () => new BoxGeometry(0.14, 0.16, 0.05)), lockMat), { y: 0.4, z: 0.29 });
  const inside = makeGlowSprite({ color: PALETTE.paleGold, size: 1.0, opacity: 0 });
  inside.material.toneMapped = false;
  inside.position.y = 0.62;
  g.add(inside);
  let open = 0;
  let opening = false;
  return {
    update(t, k, dt) {
      open += ((opening ? 1 : 0) - open) * (1 - Math.exp(-6 * dt));
      // A trap is a lure: the lid twitches now and then while it waits.
      const twitch = !opening && Math.sin(t * 0.9) > 0.985 ? 0.08 : 0;
      lid.rotation.x = -1.7 * open - twitch;
      lockMat.emissiveIntensity = 0.25 + 0.25 * Math.max(0, Math.sin(t * 2.6)) * Math.min(1, k);
      inside.material.opacity = 0.7 * open;
    },
    take(x, z) {
      opening = true;
      // The ambush: Ember sparks spit from the lock (an enemy threat).
      impactFx.embers(x, z, { color: PALETTE.emberDanger, n: 16, radius: 0.5, tall: 1.4 });
    },
    restore(taken) {
      opening = !!taken;
    },
  };
}

function propPilgrim(g) {
  const cloth = toonMaterial({ color: CLOTH });
  const body = new Group();
  g.add(body);
  add(body, new Mesh(sharedGeo('ev-pil-robe', () => new ConeGeometry(0.34, 1.05, 10)), cloth), { y: 0.52 });
  add(body, new Mesh(sharedGeo('ev-pil-hood', () => new SphereGeometry(0.18, 12, 10)), toonMaterial({ color: hslColor(34, 0.26, 0.34) })), { y: 1.1 });
  const face = new Mesh(sharedGeo('ev-pil-face', () => new CircleGeometry(0.1, 12)), new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal) }));
  add(body, face, { ink: false, y: 1.08, z: 0.15 });
  const staff = new Mesh(sharedGeo('ev-pil-staff', () => new CylinderGeometry(0.025, 0.03, 1.5, 6)), toonMaterial({ color: WOOD }));
  add(body, staff, { x: 0.38, y: 0.75, z: 0.12 });
  const lantern = new Mesh(sharedGeo('ev-pil-lantern', () => new BoxGeometry(0.12, 0.16, 0.12)), toonMaterial({ color: PALETTE.hearthAmber, emissive: PALETTE.hearthAmber, emissiveIntensity: 0.6 }));
  add(body, lantern, { x: 0.46, y: 1.38, z: 0.12 });
  const light = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.9, opacity: 0.7 });
  light.material.toneMapped = false;
  light.position.set(0.46, 1.38, 0.12);
  body.add(light);
  let bow = 0;
  return {
    update(t, k, dt) {
      bow = Math.max(0, bow - dt * 0.9);
      body.rotation.z = 0.03 * Math.sin(t * 1.1);
      body.rotation.x = 0.35 * Math.sin(Math.min(1, bow) * Math.PI);
      const s = 0.8 + 0.12 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 13);
      light.scale.set(s, s, 1);
    },
    take(x, z) {
      bow = 1;
      impactFx.embers(x + 0.4, z, { color: PALETTE.hearthAmber, n: 14, radius: 0.4, tall: 1.8 });
    },
  };
}

function propAltar(g) {
  const stone = toonMaterial({ color: STONE_DARK });
  for (const sx of [-0.42, 0.42]) add(g, new Mesh(sharedGeo('ev-alt-leg', () => new BoxGeometry(0.26, 0.5, 0.44)), stone), { x: sx, y: 0.25 });
  add(g, new Mesh(sharedGeo('ev-alt-slab', () => new BoxGeometry(1.25, 0.14, 0.62)), stone), { y: 0.57 });
  const vio = PALETTE.godstuffViolet;
  const crack = new Mesh(sharedGeo('ev-alt-crack', () => new BoxGeometry(0.9, 0.012, 0.04).rotateY(0.25)), flatGlow(vio, 0.8));
  add(g, crack, { ink: false, y: 0.645 });
  const shardMat = toonMaterial({ color: mix(vio, PALETTE.voidCharcoal, 0.25), emissive: vio, emissiveIntensity: 0.55 });
  const shard = new Mesh(sharedGeo('ev-alt-shard', () => new OctahedronGeometry(0.22, 0).scale(0.75, 1.5, 0.75)), shardMat);
  add(g, shard, { y: 1.35 });
  const halo = makeGlowSprite({ color: vio, size: 1.3, opacity: 0.5 });
  halo.material.toneMapped = false;
  halo.position.y = 1.35;
  g.add(halo);
  let crackT = 9;
  return {
    update(t, k, dt) {
      crackT += dt;
      const gone = crackT < 9 ? Math.min(1, crackT / 0.5) : 0;
      shard.position.y = 1.35 + 0.1 * Math.sin(t * 1.4);
      shard.rotation.y = t * 0.9;
      shard.scale.setScalar(1 - 0.6 * gone);
      shardMat.emissiveIntensity = (0.45 + 0.3 * Math.max(0, Math.sin(t * 3.2))) * (1 - 0.7 * gone);
      halo.position.y = shard.position.y;
      halo.material.opacity = (0.35 + 0.15 * Math.sin(t * 3.2)) * Math.max(0.2, Math.min(1, k)) * (1 - 0.6 * gone);
    },
    take(x, z) {
      crackT = 0;
      impactFx.embers(x, z, { color: vio, n: 22, radius: 0.7, tall: 2.6 });
      impactFx.impact(x, z, { color: vio, n: 12 });
    },
  };
}

function propSpirit(g) {
  const pale = '#A8D2DC';
  const body = new Group();
  g.add(body);
  const prof = [[0, 1.1], [0.16, 1.08], [0.26, 0.95], [0.3, 0.7], [0.34, 0.4], [0.42, 0.18], [0.3, 0.2], [0.22, 0.08], [0, 0.16]].map(([x, y]) => new Vector2(x, y));
  const skin = new MeshBasicMaterial({ color: new Color(pale).multiplyScalar(0.85), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  const shape = new Mesh(sharedGeo('ev-spi-body', () => new LatheGeometry(prof, 16)), skin);
  body.add(shape);
  const eyeMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal) });
  for (const sx of [-0.08, 0.08]) {
    const eye = new Mesh(sharedGeo('ev-spi-eye', () => new SphereGeometry(0.035, 8, 6)), eyeMat);
    eye.position.set(sx, 0.92, 0.25);
    body.add(eye);
  }
  const core = makeGlowSprite({ color: pale, size: 0.7, opacity: 0.3 });
  core.material.toneMapped = false;
  core.position.y = 0.7;
  body.add(core);
  let swirl = 9;
  return {
    update(t, k, dt) {
      swirl += dt;
      const s = swirl < 9 ? Math.min(1, swirl / 0.9) : 0;
      body.position.y = 0.25 + 0.12 * Math.sin(t * 1.6) + 0.6 * s;
      body.rotation.y = 0.2 * Math.sin(t * 0.7) + s * 9;
      skin.opacity = (0.5 + 0.08 * Math.sin(t * 2.3)) * (1 - 0.75 * s);
      core.material.opacity = (0.22 + 0.06 * Math.sin(t * 2.3)) * (1 - 0.75 * s);
    },
    take(x, z) {
      swirl = 0;
      impactFx.embers(x, z, { color: pale, n: 20, radius: 0.6, tall: 2.4 });
    },
  };
}

function propCache(g) {
  const wood = toonMaterial({ color: WOOD });
  const dark = toonMaterial({ color: WOOD_DARK });
  add(g, new Mesh(sharedGeo('ev-cache-crate', () => new BoxGeometry(0.5, 0.42, 0.5)), wood), { x: -0.32, y: 0.21 });
  add(g, new Mesh(sharedGeo('ev-cache-crate2', () => new BoxGeometry(0.44, 0.36, 0.44)), dark), { x: 0.3, y: 0.18, z: 0.08 });
  add(g, new Mesh(sharedGeo('ev-cache-crate3', () => new BoxGeometry(0.38, 0.32, 0.38)), wood), { x: -0.28, y: 0.58, z: -0.02 });
  const tarp = new Mesh(sharedGeo('ev-cache-tarp', () => new BoxGeometry(0.9, 0.04, 0.7)), toonMaterial({ color: hslColor(90, 0.12, 0.26) }));
  tarp.rotation.z = 0.32;
  add(g, tarp, { x: -0.05, y: 0.62 });
  const coinMat = toonMaterial({ color: PALETTE.paleGold, emissive: PALETTE.paleGold, emissiveIntensity: 0.25 });
  const coins = new Group();
  coins.position.set(0.32, 0.38, 0.32);
  for (let i = 0; i < 5; i++) {
    const c = new Mesh(sharedGeo('ev-cache-coin', () => new CylinderGeometry(0.07, 0.07, 0.02, 10)), coinMat);
    c.position.set((i % 3) * 0.05 - 0.05, i * 0.022, (i % 2) * 0.04);
    coins.add(c);
  }
  g.add(coins);
  const glint = makeGlowSprite({ color: PALETTE.paleGold, size: 0.5, opacity: 0.6 });
  glint.material.toneMapped = false;
  glint.position.set(0.32, 0.5, 0.32);
  g.add(glint);
  let lift = 0;
  let lifting = false;
  return {
    update(t, k, dt) {
      lift += ((lifting ? 1 : 0) - lift) * (1 - Math.exp(-3 * dt));
      tarp.position.y = 0.62 + 0.9 * lift;
      tarp.rotation.z = 0.32 + 1.4 * lift;
      tarp.visible = lift < 0.95;
      glint.material.opacity = (0.4 + 0.3 * Math.max(0, Math.sin(t * 3))) * Math.max(0.3, Math.min(1, k));
    },
    take(x, z) {
      lifting = true;
      impactFx.embers(x + 0.3, z + 0.3, { color: PALETTE.paleGold, n: 18, radius: 0.5, tall: 1.6 });
    },
    restore(taken) {
      lifting = !!taken;
    },
  };
}

function propSpring(g) {
  const stone = toonMaterial({ color: STONE });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = new Mesh(sharedGeo('ev-spr-stone', () => new IcosahedronGeometry(0.15, 0)), stone);
    r.scale.set(1.2, 0.8 + (i % 3) * 0.2, 1);
    add(g, r, { x: Math.cos(a) * 0.62, z: Math.sin(a) * 0.62, y: 0.1 });
  }
  const heal = PALETTE.brightHeal;
  const waterMat = new MeshBasicMaterial({ color: new Color(heal), transparent: true, opacity: 0.85, toneMapped: false });
  const water = new Mesh(sharedGeo('ev-spr-water', () => new CircleGeometry(0.55, 24)), waterMat);
  water.rotation.x = -Math.PI / 2;
  add(g, water, { ink: false, y: 0.08 });
  const jet = makeGlowSprite({ color: heal, size: 1, opacity: 0.4 });
  jet.material.toneMapped = false;
  jet.scale.set(0.5, 1.2, 1);
  jet.position.y = 0.6;
  g.add(jet);
  let surge = 9;
  return {
    update(t, k, dt) {
      surge += dt;
      const s = surge < 1.2 ? Math.sin((surge / 1.2) * Math.PI) : 0;
      jet.scale.set(0.5 + 0.6 * s, 1.2 + 2.2 * s + 0.12 * Math.sin(t * 3.4), 1);
      jet.position.y = 0.6 + 1.0 * s;
      jet.material.opacity = (0.32 + 0.08 * Math.sin(t * 3.4)) * Math.max(0.35, Math.min(1, k)) + 0.4 * s;
      waterMat.opacity = 0.75 + 0.1 * Math.sin(t * 2);
    },
    take(x, z) {
      surge = 0;
      impactFx.embers(x, z, { color: heal, n: 22, radius: 0.6, tall: 2.6 });
    },
  };
}

const PROPS = {
  blood_shrine: propShrine,
  wishing_well: propWell,
  trapped_chest: propChest,
  lost_pilgrim: propPilgrim,
  corrupted_altar: propAltar,
  wandering_spirit: propSpirit,
  forgotten_cache: propCache,
  healing_spring: propSpring,
};
export const ENCOUNTER_KINDS = Object.freeze(Object.keys(PROPS));

// One encounter rig for the interactable layer. `bus` drives its states.
export function buildEncounter(e) {
  const id = PROPS[e.encounter] ? e.encounter : 'healing_spring';
  const accent = ENCOUNTER_ACCENT[id];
  const g = new Group();
  g.add(groundShadow(0.7, 0.55, { forward: 0.1 }));
  const frame = buildFrame(g, accent);
  const prop = PROPS[id](g);
  let lastT = null;
  let state = 'idle'; // a rebuilt rig is told by restore()
  return {
    group: g,
    update(ent, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      frame.update(tSec, dt);
      prop.update(tSec, state === 'spent' || state === 'left' ? 0.2 : state === 'open' ? 1.5 : 1, dt);
    },
    // The sim's encounter events (index.js routes them here).
    onEvent(type, ev, x, z) {
      if (type === 'event_open') {
        state = 'open';
        frame.setWant(1.6);
      } else if (type === 'event_take') {
        state = 'spent';
        frame.burst();
        frame.setWant(0);
        prop.take(x, z);
        impactFx.impact(x, z, { color: accent, n: 14 });
      } else if (type === 'event_leave') {
        state = 'left';
        frame.setWant(0);
      }
    },
    // A rig rebuilt after a load: show a spent encounter as spent.
    restore(spent) {
      if (!spent) return;
      state = 'spent';
      frame.setWant(0);
      if (prop.restore) prop.restore(true);
    },
  };
}
