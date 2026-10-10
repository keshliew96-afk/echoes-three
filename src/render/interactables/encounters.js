// EVENT ROOMS (docs/EVENT_ROOMS.md): the fourteen encounter bodies, drawn by the
// interactable layer (./index.js) for entities of kind 'encounter'.
//
// Every encounter shares one readable frame so a player knows at a glance
// "this is the thing to walk up to": a slowly turning rune circle on the
// ground in the encounter's colour, a soft light shaft over it, and motes
// spiralling up. The prop on top is its own silhouette (a blood-dark bowl
// on a plinth, a roofed well, an iron-bound chest, a cloaked pilgrim with a
// lantern, a slab altar under a floating violet shard, a pale spirit, a
// tarp over crates and coin, a ring of stones round bright water). More
// event rooms (slice 6) adds a mushroom ring with wisps, a millrace sluice, a
// skull niche, a rose geode fed by violet threads, a smith's handcart with
// a working hammer and a gambler's table with two real dice.
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
// ambush sparks (an enemy threat). The Heart Crystal's threads are violet
// because they are the party's curses feeding it (corruption). Render-only;
// nothing here touches the sim.
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
  // More event rooms (slice 6).
  fey_ring: '#D6E88C',
  sluice_gate: '#6FB7C9',
  barrow_ossuary: '#CFC3A0',
  heart_crystal: '#E07FB0',
  traveling_smith: '#D97B3F',
  gamblers_dice: '#EDE3C8',
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

// ------------------------------------------------- more event rooms --
// Slice 6. Each `take(x, z, ev)` reads the sim's result where the beat
// differs (the sluice's flood, the dice's faces).
function propFey(g) {
  const fey = '#D6E88C';
  const stemMat = toonMaterial({ color: PALETTE.bone });
  const capMat = toonMaterial({ color: hslColor(70, 0.32, 0.72), emissive: fey, emissiveIntensity: 0.25 });
  const shrooms = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    const r = 0.72 + (i % 2) * 0.08;
    const m = new Group();
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = 0.16 + (i % 3) * 0.06;
    add(m, new Mesh(sharedGeo('ev-fey-stem', () => new CylinderGeometry(0.035, 0.05, 1, 6)), stemMat), { y: h / 2 }).scale.set(1, h, 1);
    const cap = add(m, new Mesh(sharedGeo('ev-fey-cap', () => new SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), capMat), { y: h });
    cap.scale.setScalar(0.8 + (i % 3) * 0.25);
    const spot = makeGlowSprite({ color: fey, size: 0.26, opacity: 0.6 });
    spot.material.toneMapped = false;
    spot.position.y = h + 0.06;
    m.add(spot);
    g.add(m);
    shrooms.push({ m, spot, ph: i * 0.9 });
  }
  const wisps = [];
  for (let i = 0; i < 5; i++) {
    const w = makeGlowSprite({ color: mix(fey, PALETTE.parchment, 0.4), size: 0.2, opacity: 0.9 });
    w.material.toneMapped = false;
    const tail = makeGlowSprite({ color: fey, size: 0.12, opacity: 0.5 });
    tail.material.toneMapped = false;
    g.add(w, tail);
    wisps.push({ w, tail, a: i * 1.26, r: 0.3 + (i % 3) * 0.12, h: 0.5 + (i % 2) * 0.35, sp: 0.9 + i * 0.13 });
  }
  let rise = 9;
  let hop = 9;
  return {
    update(t, k, dt) {
      rise += dt;
      hop += dt;
      const up = rise < 9 ? Math.min(1, rise / 1.4) : 0;
      for (const s of shrooms) {
        const b = hop < 0.6 ? Math.sin((hop / 0.6) * Math.PI) * 0.35 : 0;
        s.m.scale.set(1 + b * 0.3, 1 + b, 1 + b * 0.3);
        s.spot.material.opacity = (0.35 + 0.3 * Math.max(0, Math.sin(t * 2.3 + s.ph))) * Math.max(0.3, Math.min(1.4, k));
      }
      for (const o of wisps) {
        const a = o.a + t * o.sp * (1 + 3 * up);
        const r = o.r * (1 + 1.5 * up);
        const y = o.h + 0.12 * Math.sin(t * 2 + o.a) + up * 2.2;
        o.w.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        o.tail.position.set(Math.cos(a - 0.35) * r, y - 0.03, Math.sin(a - 0.35) * r);
        const fade = up > 0 ? 1 - up : 1;
        o.w.material.opacity = (0.65 + 0.3 * Math.sin(t * 7 + o.a)) * fade * Math.max(0.35, Math.min(1, k + up));
        o.tail.material.opacity = 0.4 * fade;
      }
    },
    take(x, z) {
      rise = 0;
      hop = 0;
      impactFx.embers(x, z, { color: '#D6E88C', n: 24, radius: 0.8, tall: 2.6 });
      impactFx.embers(x, z, { color: PALETTE.paleGold, n: 10, radius: 0.5, tall: 1.8 });
    },
    restore(taken) {
      if (taken) rise = 1.4;
    },
  };
}

function propSluice(g) {
  const stone = toonMaterial({ color: STONE });
  const wood = toonMaterial({ color: WOOD });
  const iron = toonMaterial({ color: IRON });
  const blue = '#6FB7C9';
  for (const sx of [-0.58, 0.58]) add(g, new Mesh(sharedGeo('ev-slu-post', () => new BoxGeometry(0.22, 1.4, 0.26)), stone), { x: sx, y: 0.7 });
  add(g, new Mesh(sharedGeo('ev-slu-lintel', () => new BoxGeometry(1.42, 0.16, 0.3)), stone), { y: 1.42 });
  const gate = new Group();
  g.add(gate);
  add(gate, new Mesh(sharedGeo('ev-slu-gate', () => new BoxGeometry(0.94, 0.78, 0.09)), wood), { y: 0.42 });
  for (const yy of [0.18, 0.66]) add(gate, new Mesh(sharedGeo('ev-slu-band', () => new BoxGeometry(0.98, 0.07, 0.11)), iron), { y: yy });
  const wheel = new Mesh(sharedGeo('ev-slu-wheel', () => new TorusGeometry(0.2, 0.035, 6, 14)), iron);
  add(g, wheel, { x: 0.58, y: 1.62, z: 0.02 });
  const spokes = new Mesh(sharedGeo('ev-slu-spokes', () => new BoxGeometry(0.4, 0.03, 0.03)), iron);
  add(g, spokes, { ink: false, x: 0.58, y: 1.62, z: 0.02 });
  // The held water behind the gate and the trickle under it.
  const poolMat = new MeshBasicMaterial({ color: new Color(mix(blue, PALETTE.voidCharcoal, 0.45)), toneMapped: false });
  const back = new Mesh(sharedGeo('ev-slu-water', () => new BoxGeometry(1.0, 0.7, 0.04)), poolMat);
  add(g, back, { ink: false, y: 0.4, z: -0.12 });
  const sheen = makeGlowSprite({ color: blue, size: 0.9, opacity: 0.35 });
  sheen.material.toneMapped = false;
  sheen.position.set(0, 0.55, -0.1);
  g.add(sheen);
  const trickle = makeGlowSprite({ color: mix(blue, PALETTE.parchment, 0.4), size: 1, opacity: 0.45 });
  trickle.material.toneMapped = false;
  g.add(trickle);
  const jet = makeGlowSprite({ color: mix(blue, PALETTE.parchment, 0.25), size: 1, opacity: 0 });
  jet.material.toneMapped = false;
  g.add(jet);
  const foam = [];
  for (let i = 0; i < 6; i++) {
    const f = makeGlowSprite({ color: PALETTE.parchment, size: 0.1, opacity: 0.6 });
    f.material.toneMapped = false;
    g.add(f);
    foam.push({ f, ph: i / 6, x: (i - 2.5) * 0.15 });
  }
  let lift = 0;
  let open = false;
  let surge = 9;
  let flood = false;
  return {
    update(t, k, dt) {
      lift += ((open ? 1 : 0) - lift) * (1 - Math.exp(-4 * dt));
      gate.position.y = 0.72 * lift;
      wheel.rotation.z = -lift * 9;
      spokes.rotation.z = wheel.rotation.z;
      surge += dt;
      const s = surge < 1.6 ? Math.sin((surge / 1.6) * Math.PI) : 0;
      const big = flood ? 1.8 : 1;
      jet.scale.set(1.0 + 0.6 * s * big, 0.4 + 0.5 * s * big, 1);
      jet.position.set(0, 0.25, 0.2 + 1.1 * s * big);
      jet.material.opacity = 0.75 * s;
      trickle.scale.set(0.8, 0.14 + 0.03 * Math.sin(t * 9), 1);
      trickle.position.set(0, 0.06, 0.12);
      trickle.material.opacity = (0.3 + 0.1 * Math.sin(t * 6)) * (1 - 0.6 * lift) * Math.max(0.3, Math.min(1, k));
      sheen.material.opacity = (0.22 + 0.08 * Math.sin(t * 1.8)) * (1 - 0.7 * lift);
      for (const o of foam) {
        const u = (t * 0.8 + o.ph) % 1;
        o.f.position.set(o.x + 0.05 * Math.sin(t * 3 + o.ph * 9), 0.04 + 0.08 * Math.sin(Math.PI * u), 0.12 + u * (0.5 + 1.2 * lift));
        o.f.material.opacity = 0.55 * Math.sin(Math.PI * u) * Math.max(0.2, Math.min(1, k));
      }
    },
    take(x, z, ev) {
      open = true;
      surge = 0;
      flood = !!(ev && ev.flood);
      impactFx.embers(x, z + 0.4, { color: '#6FB7C9', n: flood ? 34 : 18, radius: flood ? 1.1 : 0.6, tall: flood ? 2.2 : 1.4 });
      if (flood) impactFx.impact(x, z + 0.6, { color: PALETTE.parchment, n: 18 });
      else impactFx.embers(x, z + 0.5, { color: PALETTE.paleGold, n: 16, radius: 0.5, tall: 1.6 });
    },
    restore(taken) {
      open = !!taken;
    },
  };
}

function propOssuary(g) {
  const stone = toonMaterial({ color: STONE_DARK });
  const boneMat = toonMaterial({ color: hslColor(42, 0.22, 0.74) });
  const bone = '#CFC3A0';
  add(g, new Mesh(sharedGeo('ev-oss-wall', () => new BoxGeometry(1.3, 1.25, 0.3)), stone), { y: 0.62, z: -0.2 });
  add(g, new Mesh(sharedGeo('ev-oss-arch', () => new TorusGeometry(0.65, 0.1, 6, 16, Math.PI)), stone), { y: 1.25, z: -0.12 });
  for (const yy of [0.32, 0.72]) add(g, new Mesh(sharedGeo('ev-oss-shelf', () => new BoxGeometry(1.2, 0.06, 0.3)), stone), { y: yy, z: -0.02 });
  const eyeMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal) });
  const skulls = [];
  const rows = [[0.09, 4], [0.48, 4], [0.88, 3]];
  for (const [yy, n] of rows) {
    for (let i = 0; i < n; i++) {
      const sk = new Group();
      sk.position.set((i - (n - 1) / 2) * 0.27, yy + 0.1, 0.04);
      sk.rotation.y = ((i * 7 + n) % 5 - 2) * 0.12;
      add(sk, new Mesh(sharedGeo('ev-oss-skull', () => new SphereGeometry(0.1, 10, 8)), boneMat)).scale.set(1, 0.92, 1);
      add(sk, new Mesh(sharedGeo('ev-oss-jaw', () => new BoxGeometry(0.11, 0.05, 0.08)), boneMat), { y: -0.08, z: 0.03 });
      for (const ex of [-0.035, 0.035]) add(sk, new Mesh(sharedGeo('ev-oss-eye', () => new SphereGeometry(0.026, 6, 5)), eyeMat), { ink: false, x: ex, y: 0.01, z: 0.085 });
      const glow = makeGlowSprite({ color: bone, size: 0.16, opacity: 0 });
      glow.material.toneMapped = false;
      glow.position.set(0, 0.01, 0.11);
      sk.add(glow);
      g.add(sk);
      skulls.push({ sk, glow, ph: skulls.length * 0.77, y0: sk.position.y });
    }
  }
  const candles = [];
  const wax = toonMaterial({ color: PALETTE.bone });
  for (const sx of [-0.78, 0.78]) {
    add(g, new Mesh(sharedGeo('ev-oss-candle', () => new CylinderGeometry(0.045, 0.05, 0.3, 6)), wax), { x: sx, y: 0.15, z: 0.15 });
    const fl = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.24, opacity: 0.9 });
    fl.material.toneMapped = false;
    fl.position.set(sx, 0.36, 0.15);
    g.add(fl);
    candles.push(fl);
  }
  const dust = [];
  for (let i = 0; i < 6; i++) {
    const d = makeGlowSprite({ color: bone, size: 0.07, opacity: 0.5 });
    d.material.toneMapped = false;
    g.add(d);
    dust.push({ d, ph: i / 6, x: (i - 2.5) * 0.2 });
  }
  let wake = 9;
  return {
    update(t, k, dt) {
      wake += dt;
      const w = wake < 9 ? Math.max(0, 1 - wake / 3) : 0;
      const look = Math.max(0, k - 1) / 0.5; // the card is up: the dead watch
      for (const s of skulls) {
        const jit = w > 0.4 ? 0.012 * Math.sin(t * 40 + s.ph * 5) : 0;
        s.sk.position.y = s.y0 + jit;
        s.glow.material.opacity = Math.min(1, 0.85 * w + 0.35 * look * (0.6 + 0.4 * Math.sin(t * 3 + s.ph)));
      }
      candles.forEach((c, i) => {
        const s = 0.22 + 0.04 * Math.sin(t * 9 + i * 2.1);
        c.scale.set(s, s * 1.3, 1);
      });
      for (const o of dust) {
        const u = (t * 0.18 + o.ph) % 1;
        o.d.position.set(o.x + 0.06 * Math.sin(t + o.ph * 7), 1.3 - u * 1.2, 0.25);
        o.d.material.opacity = 0.4 * Math.sin(Math.PI * u) * Math.max(0.3, Math.min(1, k));
      }
    },
    take(x, z) {
      wake = 0;
      impactFx.embers(x, z, { color: '#CFC3A0', n: 22, radius: 0.7, tall: 2.0 });
      impactFx.embers(x, z, { color: PALETTE.parchment, n: 10, radius: 0.4, tall: 2.4 });
    },
  };
}

function propCrystal(g) {
  const rose = '#E07FB0';
  const vio = PALETTE.godstuffViolet;
  add(g, new Mesh(sharedGeo('ev-cry-rock', () => new IcosahedronGeometry(0.5, 0).scale(1.2, 0.45, 1)), toonMaterial({ color: STONE_DARK })), { y: 0.14 });
  const cMat = toonMaterial({ color: mix(rose, PALETTE.voidCharcoal, 0.2), emissive: rose, emissiveIntensity: 0.45, transparent: true, opacity: 0.92 });
  const cluster = new Group();
  cluster.position.y = 0.25;
  g.add(cluster);
  const big = new Mesh(sharedGeo('ev-cry-big', () => new OctahedronGeometry(0.26, 0).scale(1, 3.2, 1)), cMat);
  add(cluster, big, { y: 0.75 });
  const parts = [[-0.32, 0.3, 0.1, 0.5, 0.35], [0.3, 0.32, 0.05, -0.45, 0.42], [0.08, 0.22, 0.3, 0.2, 0.3], [-0.12, 0.2, -0.28, -0.25, 0.28], [0.34, 0.18, -0.2, -0.6, 0.24]];
  for (const [px, py, pz, tilt, sc] of parts) {
    const m = new Mesh(sharedGeo('ev-cry-small', () => new OctahedronGeometry(0.2, 0).scale(1, 2.6, 1)), cMat);
    m.scale.setScalar(sc / 0.3);
    m.rotation.z = tilt;
    m.rotation.x = pz * 0.8;
    add(cluster, m, { x: px, y: py, z: pz });
  }
  const core = makeGlowSprite({ color: rose, size: 1.5, opacity: 0.45 });
  core.material.toneMapped = false;
  core.position.y = 1.0;
  g.add(core);
  // The curses feeding it: violet threads from the ground into the stone.
  const threads = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    // A thin strand from the ground at 1.0 u up into the crystal's foot.
    const fx = Math.cos(a) * 1.0;
    const fz = Math.sin(a) * 1.0;
    const line = new Mesh(sharedGeo('ev-cry-thread', () => new BoxGeometry(0.025, 0.012, 1)), flatGlow(vio, 0.55));
    line.position.set(fx / 2, 0.03 + 0.39, fz / 2);
    line.scale.z = Math.hypot(1.0, 0.75);
    line.lookAt(0, 0.78, 0);
    const bead = makeGlowSprite({ color: mix(vio, PALETTE.parchment, 0.4), size: 0.13, opacity: 0.9 });
    bead.material.toneMapped = false;
    g.add(line, bead);
    threads.push({ line, bead, from: [Math.cos(a) * 1.0, 0.03, Math.sin(a) * 1.0], ph: i / 4 });
  }
  let grow = 9;
  return {
    update(t, k, dt) {
      grow += dt;
      const gw = grow < 9 ? Math.min(1, grow / 0.7) : 0;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
      cluster.scale.setScalar(1 + 0.3 * gw);
      cluster.rotation.y = 0.15 * Math.sin(t * 0.5);
      cMat.emissiveIntensity = 0.35 + 0.3 * pulse * Math.min(1.3, k) + 0.8 * (grow < 0.6 ? 1 - grow / 0.6 : 0);
      core.material.opacity = (0.3 + 0.18 * pulse) * Math.max(0.3, Math.min(1.3, k)) + 0.4 * (grow < 0.6 ? 1 - grow / 0.6 : 0);
      core.scale.setScalar(1.4 + 0.5 * gw);
      for (const o of threads) {
        const u = (t * 0.6 + o.ph) % 1;
        const fx = o.from[0] * (1 - u);
        const fz = o.from[2] * (1 - u);
        o.bead.position.set(fx, 0.03 + u * 0.75, fz);
        o.bead.material.opacity = 0.9 * Math.sin(Math.PI * u) * Math.max(0.25, Math.min(1, k));
        o.line.material.opacity = 0.35 + 0.25 * Math.sin(t * 3 + o.ph * 6);
      }
    },
    take(x, z) {
      grow = 0;
      impactFx.embers(x, z, { color: '#E07FB0', n: 26, radius: 0.7, tall: 2.6 });
      impactFx.embers(x, z, { color: PALETTE.godstuffViolet, n: 10, radius: 1.0, tall: 1.2 });
      impactFx.impact(x, z, { color: '#E07FB0', n: 12 });
    },
    restore(taken) {
      if (taken) grow = 0.7;
    },
  };
}

function propSmith(g) {
  const wood = toonMaterial({ color: WOOD });
  const iron = toonMaterial({ color: hslColor(215, 0.06, 0.22) });
  const copper = '#D97B3F';
  add(g, new Mesh(sharedGeo('ev-smi-bed', () => new BoxGeometry(1.2, 0.12, 0.7)), wood), { y: 0.36 });
  for (const sz of [-0.38, 0.38]) {
    const wh = new Mesh(sharedGeo('ev-smi-wheel', () => new TorusGeometry(0.22, 0.04, 6, 14)), toonMaterial({ color: WOOD_DARK }));
    add(g, wh, { x: -0.25, y: 0.24, z: sz });
  }
  add(g, new Mesh(sharedGeo('ev-smi-shaft', () => new BoxGeometry(0.7, 0.05, 0.05)), wood), { x: 0.9, y: 0.32, z: 0.22 }).rotation.z = 0.2;
  add(g, new Mesh(sharedGeo('ev-smi-shaft', () => new BoxGeometry(0.7, 0.05, 0.05)), wood), { x: 0.9, y: 0.32, z: -0.22 }).rotation.z = 0.2;
  // The anvil.
  add(g, new Mesh(sharedGeo('ev-smi-foot', () => new BoxGeometry(0.3, 0.12, 0.24)), iron), { x: 0.05, y: 0.48 });
  add(g, new Mesh(sharedGeo('ev-smi-waist', () => new BoxGeometry(0.16, 0.14, 0.16)), iron), { x: 0.05, y: 0.6 });
  add(g, new Mesh(sharedGeo('ev-smi-face', () => new BoxGeometry(0.46, 0.1, 0.22)), iron), { x: 0.05, y: 0.72 });
  const horn = new Mesh(sharedGeo('ev-smi-horn', () => new ConeGeometry(0.08, 0.26, 8).rotateZ(-Math.PI / 2)), iron);
  add(g, horn, { x: 0.4, y: 0.73 });
  // The coal pan, glowing.
  add(g, new Mesh(sharedGeo('ev-smi-pan', () => new CylinderGeometry(0.17, 0.12, 0.1, 10)), iron), { x: -0.38, y: 0.47, z: 0.05 });
  const coalMat = toonMaterial({ color: hslColor(20, 0.6, 0.3), emissive: copper, emissiveIntensity: 0.8 });
  add(g, new Mesh(sharedGeo('ev-smi-coal', () => new IcosahedronGeometry(0.12, 0).scale(1, 0.4, 1)), coalMat), { ink: false, x: -0.38, y: 0.53, z: 0.05 });
  const coal = makeGlowSprite({ color: copper, size: 0.6, opacity: 0.6 });
  coal.material.toneMapped = false;
  coal.position.set(-0.38, 0.62, 0.05);
  g.add(coal);
  // The hammer, pivoting at its grip.
  const hammer = new Group();
  hammer.position.set(-0.2, 0.95, 0);
  add(hammer, new Mesh(sharedGeo('ev-smi-handle', () => new CylinderGeometry(0.02, 0.025, 0.42, 6).rotateZ(Math.PI / 2).translate(0.21, 0, 0)), wood));
  add(hammer, new Mesh(sharedGeo('ev-smi-head', () => new BoxGeometry(0.1, 0.16, 0.1)), iron), { x: 0.4 });
  g.add(hammer);
  const sparks = [];
  for (let i = 0; i < 8; i++) {
    const sp = makeGlowSprite({ color: mix(copper, PALETTE.parchment, 0.45), size: 0.07, opacity: 0 });
    sp.material.toneMapped = false;
    g.add(sp);
    sparks.push({ sp, vx: Math.cos(i * 0.8) * (0.6 + (i % 3) * 0.3), vz: Math.sin(i * 0.8) * (0.5 + (i % 2) * 0.3), vy: 1.2 + (i % 4) * 0.35 });
  }
  let strikeT = 9;
  let fast = 0; // take: strikes left in the quick burst
  let cycle = 0;
  const strike = () => {
    strikeT = 0;
  };
  return {
    update(t, k, dt) {
      cycle += dt * (fast > 0 ? 3.2 : 1);
      if (cycle >= 1.7) {
        cycle -= 1.7;
        if (k > 0.5 || fast > 0) strike();
        if (fast > 0) fast -= 1;
      }
      // Wind-up then down: the hammer's angle over one cycle.
      const c = cycle / 1.7;
      const raise = c < 0.75 ? Math.sin((c / 0.75) * Math.PI * 0.5) : 1 - (c - 0.75) / 0.25;
      hammer.rotation.z = -0.38 + 1.3 * raise * Math.max(0.3, Math.min(1, k + fast));
      strikeT += dt;
      for (const o of sparks) {
        const u = strikeT;
        const on = u < 0.5;
        o.sp.material.opacity = on ? 0.95 * (1 - u / 0.5) : 0;
        o.sp.position.set(0.2 + o.vx * u, 0.78 + o.vy * u - 4.5 * u * u, o.vz * u);
      }
      coalMat.emissiveIntensity = 0.65 + 0.25 * Math.sin(t * 4.1) + 0.12 * Math.sin(t * 11);
      coal.material.opacity = (0.45 + 0.15 * Math.sin(t * 4.1)) * Math.max(0.4, Math.min(1, k));
    },
    take(x, z) {
      fast = 3;
      cycle = 1.3;
      impactFx.embers(x + 0.2, z, { color: '#D97B3F', n: 26, radius: 0.5, tall: 2.0 });
      impactFx.impact(x + 0.2, z, { color: PALETTE.hearthAmber, n: 12 });
    },
  };
}

// A die's faces: value -> the outward normal (opposite faces sum to 7) and
// the rotation that turns that face up.
const DIE_FACE = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [1, 0, 0], 5: [-1, 0, 0], 3: [0, 0, 1], 4: [0, 0, -1] };
const DIE_UP = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function buildDie(size) {
  const outer = new Group();
  const inner = new Group();
  outer.add(inner);
  add(inner, new Mesh(sharedGeo('ev-dice-cube', () => new BoxGeometry(size, size, size)), toonMaterial({ color: hslColor(44, 0.3, 0.86) })));
  const pipMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal) });
  const h = size / 2 + 0.002;
  const step = size * 0.27;
  for (const [v, n] of Object.entries(DIE_FACE)) {
    for (const [a, b] of PIPS[v]) {
      const pip = new Mesh(sharedGeo('ev-dice-pip', () => new CircleGeometry(size * 0.085, 8)), pipMat);
      // Face axes: two directions perpendicular to the normal.
      const [nx, ny, nz] = n;
      const ux = ny !== 0 ? [1, 0, 0] : [0, 1, 0];
      const vx = [ny * ux[2] - nz * ux[1], nz * ux[0] - nx * ux[2], nx * ux[1] - ny * ux[0]];
      pip.position.set(nx * h + (ux[0] * a + vx[0] * b) * step, ny * h + (ux[1] * a + vx[1] * b) * step, nz * h + (ux[2] * a + vx[2] * b) * step);
      pip.lookAt(pip.position.x + nx, pip.position.y + ny, pip.position.z + nz);
      inner.add(pip);
    }
  }
  return {
    group: outer,
    show(v) {
      const r = DIE_UP[v] ?? DIE_UP[1];
      inner.rotation.set(r[0], r[1], r[2]);
    },
    inner,
  };
}

function propDice(g) {
  const wood = toonMaterial({ color: WOOD_DARK });
  add(g, new Mesh(sharedGeo('ev-dice-top', () => new CylinderGeometry(0.55, 0.55, 0.07, 18)), wood), { y: 0.62 });
  add(g, new Mesh(sharedGeo('ev-dice-leg', () => new CylinderGeometry(0.07, 0.12, 0.6, 8)), wood), { y: 0.3 });
  const felt = new Mesh(sharedGeo('ev-dice-felt', () => new CircleGeometry(0.47, 24)), toonMaterial({ color: hslColor(350, 0.42, 0.28) }));
  felt.rotation.x = -Math.PI / 2;
  add(g, felt, { ink: false, y: 0.657 });
  const cup = new Group();
  cup.position.set(-0.28, 0.66, -0.12);
  add(cup, new Mesh(sharedGeo('ev-dice-cup', () => new CylinderGeometry(0.12, 0.09, 0.26, 12, 1, true)), toonMaterial({ color: CLOTH, side: DoubleSide })), { y: 0.13 });
  g.add(cup);
  const size = 0.14;
  const dice = [buildDie(size), buildDie(size)];
  const rest = [[0.08, 0.06], [0.26, -0.05]];
  dice.forEach((d, i) => {
    d.group.position.set(rest[i][0], 0.66 + size / 2, rest[i][1]);
    d.group.rotation.y = i * 0.7 + 0.3;
    d.show(i === 0 ? 3 : 5);
    g.add(d.group);
  });
  const glint = makeGlowSprite({ color: '#EDE3C8', size: 0.6, opacity: 0 });
  glint.material.toneMapped = false;
  glint.position.set(0.17, 0.85, 0);
  g.add(glint);
  let roll = 9;
  let faces = [3, 5];
  let won = false;
  return {
    update(t, k, dt) {
      roll += dt;
      cup.rotation.z = roll < 0.5 ? 0.6 * Math.sin((roll / 0.5) * Math.PI * 4) * (1 - roll / 0.5) : 0.04 * Math.sin(t * 1.4);
      dice.forEach((d, i) => {
        if (roll < 1.0) {
          // Tumbling: an arc out of the cup to the rest spot, two bounces.
          const u = roll / 1.0;
          const x0 = -0.28;
          d.group.position.x = x0 + (rest[i][0] - x0) * Math.min(1, u * 1.4);
          d.group.position.z = -0.12 + (rest[i][1] + 0.12) * Math.min(1, u * 1.4);
          const bounce = Math.abs(Math.sin(u * Math.PI * 2.5)) * 0.35 * (1 - u);
          d.group.position.y = 0.66 + size / 2 + bounce;
          d.inner.rotation.set(t * (9 + i * 3), t * (7 - i * 2), t * (11 + i));
        } else if (roll < 9) {
          d.group.position.set(rest[i][0], 0.66 + size / 2, rest[i][1]);
          d.show(faces[i]);
        }
      });
      const w = roll >= 1.0 && roll < 2.2 && won ? 1 - (roll - 1.0) / 1.2 : 0;
      glint.material.opacity = 0.8 * w + 0.08 * Math.max(0, Math.sin(t * 2)) * Math.min(1, k);
      glint.scale.setScalar(0.6 + 0.6 * w);
    },
    take(x, z, ev) {
      roll = 0;
      if (ev && Array.isArray(ev.dice)) faces = [ev.dice[0], ev.dice[1]];
      won = !!(ev && (ev.relic || ev.glint));
      impactFx.embers(x, z, { color: '#EDE3C8', n: 12, radius: 0.4, tall: 1.4 });
      if (won) impactFx.embers(x, z, { color: PALETTE.paleGold, n: 18, radius: 0.5, tall: 1.8 });
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
  fey_ring: propFey,
  sluice_gate: propSluice,
  barrow_ossuary: propOssuary,
  heart_crystal: propCrystal,
  traveling_smith: propSmith,
  gamblers_dice: propDice,
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
        prop.take(x, z, ev);
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
