// TONICS AND BOMBS (docs/CONSUMABLES.md): the bodies of the slice, drawn by
// the interactable layer (./index.js) for these entity kinds:
//   tonic_item   a loose tonic, bomb or charm bobbing over the floor inside a
//                short loot beam in its own colour, with a breathing ring
//   tonic_bomb   a bomb in the air: it arcs from the hand to the aim, its fuse
//                spitting sparks (the trail is the VFX director's)
//   tonic_fire   a Fire Bomb's burning patch: an amber pool and a heat ring
//                that gutter out as it ends (the flames are the director's)
// Render-only.
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
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
import { addInk, groundShadow } from '../critters/common.js';
import { TONIC_FX } from '../vfx/tonicfx.js';
import { TICK_HZ } from '../../core/constants.js';

export const TONIC_KINDS = Object.freeze(['tonic_item', 'tonic_bomb', 'tonic_fire']);

const GLASS = '#DCE8EE';
const CORK = '#8A6440';
const IRON = '#2B2A2E';
const BRASS = PALETTE.paleGold;

const add = (g, mesh, { ink = true, y = 0, x = 0, z = 0 } = {}) => {
  mesh.position.set(x, y, z);
  if (ink) addInk(mesh);
  g.add(mesh);
  return mesh;
};
const flatGlow = (color, opacity = 0.9) =>
  new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
const poolMat = (color, opacity) =>
  new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const sprite = (color, size, opacity) => {
  const s = makeGlowSprite({ color, size, opacity });
  s.material.toneMapped = false;
  return s;
};
const flat = (mesh, y) => {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
};

// A round-bellied flask of liquid in the item's colour: glass, the glowing
// draught inside, a cork and a wax seal.
function flaskMesh(id) {
  const c = TONIC_FX[id] ?? TONIC_FX.mend_tonic;
  const g = new Group();
  const prof = [[0, -0.2], [0.13, -0.19], [0.19, -0.1], [0.2, 0], [0.17, 0.09], [0.07, 0.15], [0.055, 0.25], [0.065, 0.27]].map(([x, y]) => new Vector2(x, y));
  const glass = toonMaterial({ color: GLASS, emissive: c.glow, emissiveIntensity: 0.25 });
  glass.transparent = true;
  glass.opacity = 0.55;
  add(g, new Mesh(sharedGeo('tn-flask', () => new LatheGeometry(prof, 16)), glass));
  const liquid = toonMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 0.9 });
  add(g, new Mesh(sharedGeo('tn-liquid', () => new SphereGeometry(0.16, 14, 10)), liquid), { ink: false, y: -0.05 });
  add(g, new Mesh(sharedGeo('tn-cork', () => new CylinderGeometry(0.05, 0.045, 0.08, 10)), toonMaterial({ color: CORK })), { y: 0.3 });
  add(g, new Mesh(sharedGeo('tn-seal', () => new TorusGeometry(0.06, 0.018, 6, 14)), toonMaterial({ color: c.core, emissive: c.glow, emissiveIntensity: 0.4 })), { y: 0.25 });
  return g;
}
// An iron bomb with a brass band and a lit fuse (the band takes the colour).
function bombMesh(id) {
  const c = TONIC_FX[id] ?? TONIC_FX.fire_bomb;
  const g = new Group();
  add(g, new Mesh(sharedGeo('tn-bomb', () => new SphereGeometry(0.2, 16, 12)), toonMaterial({ color: IRON, emissive: c.glow, emissiveIntensity: 0.08 })));
  const band = add(g, new Mesh(sharedGeo('tn-band', () => new TorusGeometry(0.2, 0.025, 6, 20)), toonMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 0.6 })), { ink: false });
  band.rotation.x = Math.PI / 2;
  add(g, new Mesh(sharedGeo('tn-neck', () => new CylinderGeometry(0.06, 0.07, 0.07, 10)), toonMaterial({ color: BRASS, emissive: BRASS, emissiveIntensity: 0.3 })), { y: 0.21 });
  add(g, new Mesh(sharedGeo('tn-fuse', () => new CylinderGeometry(0.012, 0.012, 0.12, 6)), toonMaterial({ color: '#6B5844' })), { ink: false, y: 0.3 });
  const spark = sprite(c.core, 0.32, 0.95);
  spark.position.y = 0.37;
  g.add(spark);
  return { g, spark };
}
// A little bronze hand-bell on a ribbon: the Bell Charm.
function charmMesh() {
  const c = TONIC_FX.bell_charm;
  const g = new Group();
  const prof = [[0, 0.16], [0.06, 0.15], [0.1, 0.08], [0.13, -0.05], [0.18, -0.13], [0.17, -0.15]].map(([x, y]) => new Vector2(x, y));
  add(g, new Mesh(sharedGeo('tn-bell', () => new LatheGeometry(prof, 16)), toonMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 0.45 })));
  add(g, new Mesh(sharedGeo('tn-clapper', () => new SphereGeometry(0.045, 8, 6)), toonMaterial({ color: c.core, emissive: c.core, emissiveIntensity: 0.5 })), { y: -0.15 });
  add(g, new Mesh(sharedGeo('tn-loop', () => new TorusGeometry(0.05, 0.014, 6, 12)), toonMaterial({ color: BRASS })), { y: 0.2 });
  add(g, new Mesh(sharedGeo('tn-gem', () => new OctahedronGeometry(0.04, 0)), toonMaterial({ color: '#B23A48', emissive: '#B23A48', emissiveIntensity: 0.4 })), { ink: false, y: 0.02, z: 0.12 });
  return g;
}
export function tonicMesh(id) {
  if (id === 'fire_bomb' || id === 'frost_bomb') return bombMesh(id).g;
  if (id === 'bell_charm') return charmMesh();
  return flaskMesh(id);
}

// ----------------------------------------------------------- loose item --
export function buildTonicItem(e) {
  const c = TONIC_FX[e.item] ?? TONIC_FX.mend_tonic;
  const g = new Group();
  const body = tonicMesh(e.item);
  body.scale.setScalar(1.6);
  body.position.y = 0.8;
  g.add(body);
  const halo = sprite(c.glow, 1.1, 0.5);
  halo.position.y = 0.8;
  g.add(halo);
  const beam = sprite(c.glow, 1, 0.24);
  beam.scale.set(0.7, 4.6, 1);
  beam.position.y = 2.2;
  g.add(beam);
  const ringMat = flatGlow(c.glow, 0.55);
  const ring = flat(new Mesh(sharedGeo('tn-ring', () => new RingGeometry(0.5, 0.57, 40)), ringMat), 0.03);
  ring.renderOrder = 3;
  g.add(ring);
  const pMat = poolMat(c.glow, 0.3);
  const pool = flat(new Mesh(sharedGeo('tn-pool', () => new CircleGeometry(0.85, 24)), pMat), 0.02);
  pool.renderOrder = 2;
  g.add(pool);
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const m = sprite(c.core, 0.08, 0.8);
    g.add(m);
    motes.push({ m, a: i * 1.047, ph: i / 6 });
  }
  g.add(groundShadow(0.28, 0.3));
  let age = 0;
  let lastT = null;
  return {
    group: g,
    update(_e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      age += dt;
      const land = Math.min(1, age / 0.4);
      const drop = (1 - land) * (1 - land) * 2.4;
      body.position.y = 0.8 + 0.1 * Math.sin(tSec * 2.6) + drop;
      body.rotation.y = tSec * 1.5;
      body.rotation.z = 0.2 * Math.sin(tSec * 1.3);
      halo.position.y = body.position.y;
      const breathe = 0.8 + 0.2 * Math.sin(tSec * 3.2);
      halo.material.opacity = 0.4 * breathe + (age < 0.5 ? 0.6 * (1 - age / 0.5) : 0);
      beam.material.opacity = 0.22 * breathe;
      ringMat.opacity = 0.5 * breathe;
      pMat.opacity = 0.28 * breathe;
      for (const mo of motes) {
        const u = (tSec * 0.5 + mo.ph) % 1;
        const a = mo.a + tSec * 1.4;
        const r = 0.3 * (1 - 0.6 * u);
        mo.m.position.set(Math.cos(a) * r, 0.1 + u * 2.4, Math.sin(a) * r);
        mo.m.material.opacity = 0.85 * Math.sin(Math.PI * u);
      }
    },
  };
}

// ------------------------------------------------------------ the throw --
// The rig is placed at the bomb's sim position each frame by the layer; the
// arc's height comes from its flight clock.
export function buildTonicBomb(e) {
  const { g: body, spark } = bombMesh(e.item);
  const c = TONIC_FX[e.item] ?? TONIC_FX.fire_bomb;
  const g = new Group();
  body.scale.setScalar(1.3);
  g.add(body);
  const halo = sprite(c.glow, 0.9, 0.5);
  g.add(halo);
  const shadow = groundShadow(0.25, 0.35);
  g.add(shadow);
  return {
    group: g,
    follow: true,
    update(be, tSec, ctx) {
      const span = Math.max(1, (be.landTick ?? 1) - (be.launchTick ?? 0));
      const k = Math.min(1, Math.max(0, ((ctx ? ctx.tick : 0) - (be.launchTick ?? 0)) / span));
      const y = 1.1 + 2.2 * 4 * k * (1 - k) - 0.8 * k;
      body.position.y = y;
      halo.position.y = y;
      body.rotation.x = tSec * 9;
      body.rotation.z = tSec * 6;
      spark.material.opacity = 0.6 + 0.4 * Math.sin(tSec * 40);
      shadow.scale.setScalar(0.6 + 0.4 * (1 - Math.abs(2 * k - 1)));
    },
  };
}

// ----------------------------------------------------------- the fire --
export function buildTonicFire(e) {
  const c = TONIC_FX.fire_bomb;
  const g = new Group();
  const r = e.radius ?? 2.1;
  const pMat = poolMat(c.glow, 0.5);
  const pool = flat(new Mesh(sharedGeo('tn-firepool', () => new CircleGeometry(1, 32)), pMat), 0.025);
  pool.scale.set(r, r, 1);
  pool.renderOrder = 2;
  g.add(pool);
  const hMat = flatGlow(c.glow, 0.6);
  const heat = flat(new Mesh(sharedGeo('tn-heat', () => new RingGeometry(0.93, 1, 48)), hMat), 0.04);
  heat.scale.set(r, r, 1);
  heat.renderOrder = 3;
  g.add(heat);
  const tongues = [];
  for (let i = 0; i < 7; i++) {
    const m = new Mesh(sharedGeo('tn-tongue', () => new ConeGeometry(0.14, 0.6, 8)), flatGlow(i % 2 ? c.glow : c.core, 0.7));
    const a = (i / 7) * Math.PI * 2;
    const d = r * (0.25 + 0.5 * ((i * 37) % 7) / 7);
    m.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d);
    g.add(m);
    tongues.push({ m, ph: i * 0.9 });
  }
  return {
    group: g,
    update(fe, tSec, ctx) {
      const left = ((fe.untilTick ?? 0) - (ctx ? ctx.tick : 0)) / TICK_HZ;
      const fade = Math.max(0, Math.min(1, left / 0.6));
      const flick = 0.75 + 0.25 * Math.sin(tSec * 13) * Math.sin(tSec * 7.3);
      pMat.opacity = 0.5 * flick * fade;
      hMat.opacity = 0.55 * flick * fade;
      for (const t of tongues) {
        const s = 0.6 + 0.5 * Math.abs(Math.sin(tSec * 6 + t.ph));
        t.m.scale.set(1, s * fade, 1);
        t.m.position.y = 0.3 * s * fade;
        t.m.material.opacity = 0.7 * fade;
      }
    },
  };
}

export function buildTonicRig(e) {
  switch (e.kind) {
    case 'tonic_item':
      return buildTonicItem(e);
    case 'tonic_bomb':
      return buildTonicBomb(e);
    case 'tonic_fire':
      return buildTonicFire(e);
    default:
      return null;
  }
}
