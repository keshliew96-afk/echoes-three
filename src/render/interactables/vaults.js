// KEYS AND VAULTS (docs/VAULTS.md): the bodies of the vault slice, drawn by
// the interactable layer (./index.js) for these entity kinds:
//   vault_key      a gold key turning over the floor inside a tall loot beam,
//                  a breathing ground ring and motes climbing the beam, so a
//                  dropped key reads from across the room
//   vault_pile     a mound of Glint: a gold heap, scattered coins and a few
//                  cut gems that twinkle in turn
//   vault_platter  a hammered platter heaped with bread, cheese, fruit and a
//                  roast, its steam rising in the warm light
//   vault_chest    the vault itself: a black iron-and-gold chest with a lit
//                  keyhole on a carved sanctum disc (two turning rune rings, a
//                  gold pool, four candle braziers, light shafts and dust motes
//                  drifting through the whole room). Opening it throws the lid
//                  back and a column of gold out of it.
// Colours keep the §19.1 rules: Pale Gold is the currency's, so it carries
// the key, the hoard and the vault; Hearth Amber is the warmth of fire and
// food; Bright Heal only rises off the platter as it is eaten (it heals).
// The pick-up, the opening and the key's drop and flight are the VFX
// director's beats (render/vfx/signature.js). Render-only.
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
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
import { addInk, groundShadow, mix } from '../critters/common.js';
import { hslColor } from '../../env/colors.js';

export const VAULT_KINDS = Object.freeze(['vault_key', 'vault_pile', 'vault_platter', 'vault_chest']);

const GOLD = PALETTE.paleGold;
const GOLD_HOT = '#F7E7C0';
const AMBER = PALETTE.hearthAmber;
const PARCH = PALETTE.parchment;
const IRON = hslColor(220, 0.08, 0.16);
const IRON_LIT = hslColor(222, 0.1, 0.2);
const STONE = hslColor(36, 0.08, 0.34);
const STONE_DARK = hslColor(36, 0.1, 0.2);

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
const goldMetal = (k = 0.35) => toonMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: k });
const flat = (mesh, y) => {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
};

// The gold key itself (bow, shaft, bit), about 0.7 u long.
function keyMesh() {
  const g = new Group();
  const m = goldMetal(0.55);
  add(g, new Mesh(sharedGeo('vk-bow', () => new TorusGeometry(0.15, 0.045, 8, 20)), m), { y: 0.26 });
  add(g, new Mesh(sharedGeo('vk-bow-gem', () => new OctahedronGeometry(0.06, 0)), toonMaterial({ color: GOLD_HOT, emissive: GOLD_HOT, emissiveIntensity: 0.8 })), { y: 0.26 });
  add(g, new Mesh(sharedGeo('vk-collar', () => new CylinderGeometry(0.055, 0.055, 0.06, 10)), m), { y: 0.08 });
  add(g, new Mesh(sharedGeo('vk-shaft', () => new CylinderGeometry(0.035, 0.035, 0.5, 8)), m), { y: -0.17 });
  add(g, new Mesh(sharedGeo('vk-bit1', () => new BoxGeometry(0.14, 0.05, 0.035)), m), { x: 0.07, y: -0.33 });
  add(g, new Mesh(sharedGeo('vk-bit2', () => new BoxGeometry(0.1, 0.045, 0.035)), m), { x: 0.05, y: -0.24 });
  return g;
}

// ------------------------------------------------------------------- key --
export function buildKey() {
  const g = new Group();
  const k = keyMesh();
  k.position.y = 1.0;
  k.scale.setScalar(1.25);
  g.add(k);
  const halo = sprite(GOLD, 1.3, 0.55);
  halo.position.y = 1.0;
  g.add(halo);
  const beam = sprite(GOLD, 1, 0.3);
  beam.scale.set(0.9, 7, 1);
  beam.position.y = 3.2;
  g.add(beam);
  const core = sprite(GOLD_HOT, 1, 0.45);
  core.scale.set(0.22, 7.4, 1);
  core.position.y = 3.4;
  g.add(core);
  const ringMat = flatGlow(GOLD, 0.6);
  const ring = flat(new Mesh(sharedGeo('vk-ring', () => new RingGeometry(0.62, 0.7, 48)), ringMat), 0.03);
  ring.renderOrder = 3;
  g.add(ring);
  const tickMat = flatGlow(GOLD_HOT, 0.6);
  const ticks = new Group();
  for (let i = 0; i < 4; i++) {
    const t = flat(new Mesh(sharedGeo('vk-tick', () => new RingGeometry(0.78, 0.86, 8, 1, 0, 0.5)), tickMat), 0.031);
    t.rotation.z = (i / 4) * Math.PI * 2;
    t.renderOrder = 3;
    ticks.add(t);
  }
  g.add(ticks);
  const pMat = poolMat(GOLD, 0.35);
  const pool = flat(new Mesh(sharedGeo('vk-pool', () => new CircleGeometry(1.1, 28)), pMat), 0.02);
  pool.renderOrder = 2;
  g.add(pool);
  const motes = [];
  for (let i = 0; i < 8; i++) {
    const m = sprite(GOLD_HOT, 0.09, 0.8);
    g.add(m);
    motes.push({ m, a: i * 0.785, ph: i / 8 });
  }
  g.add(groundShadow(0.35, 0.3));
  let age = 0;
  let lastT = null;
  return {
    group: g,
    update(e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      age += dt;
      // It drops in from above and settles into its turn.
      const land = Math.min(1, age / 0.45);
      const drop = (1 - land) * (1 - land) * 3;
      k.position.y = 1.0 + 0.12 * Math.sin(tSec * 2.2) + drop;
      k.rotation.y = tSec * 1.8;
      k.rotation.z = 0.25 * Math.sin(tSec * 1.1);
      halo.position.y = k.position.y;
      const breathe = 0.82 + 0.18 * Math.sin(tSec * 3);
      halo.material.opacity = 0.45 * breathe + (age < 0.6 ? 0.6 * (1 - age / 0.6) : 0);
      beam.material.opacity = 0.24 * breathe;
      core.material.opacity = 0.32 * breathe;
      ringMat.opacity = 0.55 * breathe;
      tickMat.opacity = 0.6 * breathe;
      ticks.rotation.y = -tSec * 0.8;
      pMat.opacity = 0.3 * breathe;
      for (const mo of motes) {
        const u = (tSec * 0.45 + mo.ph) % 1;
        const a = mo.a + tSec * 1.2;
        const r = 0.35 * (1 - 0.6 * u);
        mo.m.position.set(Math.cos(a) * r, 0.1 + u * 3.2, Math.sin(a) * r);
        mo.m.material.opacity = 0.85 * Math.sin(Math.PI * u);
      }
    },
  };
}

// ------------------------------------------------------------------ pile --
export function buildPile(e) {
  const g = new Group();
  g.rotation.y = e.yaw ?? 0;
  const gold = goldMetal(0.3);
  const dark = toonMaterial({ color: mix(GOLD, PALETTE.bruiseUmber, 0.18), emissive: GOLD, emissiveIntensity: 0.22 });
  const heapProf = [[0, 0.38], [0.18, 0.34], [0.36, 0.22], [0.5, 0.08], [0.56, 0]].map(([x, y]) => new Vector2(x, y));
  add(g, new Mesh(sharedGeo('vp-heap', () => new LatheGeometry(heapProf, 14)), dark));
  // Coins piled on the heap and spilled round it.
  const coinGeo = sharedGeo('vp-coin', () => new CylinderGeometry(0.095, 0.095, 0.025, 12));
  const SPOTS = [[0, 0.39, 0], [0.12, 0.35, 0.05], [-0.1, 0.34, 0.08], [0.05, 0.33, -0.13], [-0.18, 0.27, -0.06], [0.25, 0.24, -0.1], [0.3, 0.16, 0.16], [-0.32, 0.14, 0.12], [-0.05, 0.25, 0.24], [0.55, 0.01, 0.2], [-0.58, 0.01, -0.12], [0.18, 0.01, -0.58], [-0.4, 0.01, 0.44], [0.62, 0.01, -0.3]];
  SPOTS.forEach(([x, y, z], i) => {
    const c = add(g, new Mesh(coinGeo, gold), { x, y, z, ink: i < 9 });
    c.rotation.set(0.5 * Math.sin(i * 2.3), i, 0.45 * Math.cos(i * 1.7));
  });
  // A few cut gems on top (Glint is gold and glass).
  const gems = [];
  const gemMat = toonMaterial({ color: GOLD_HOT, emissive: GOLD_HOT, emissiveIntensity: 0.6 });
  for (const [x, y, z, s] of [[0.02, 0.46, 0.02, 1], [-0.2, 0.33, 0.15, 0.7], [0.22, 0.3, -0.05, 0.75]]) {
    const gm = add(g, new Mesh(sharedGeo('vp-gem', () => new OctahedronGeometry(0.07, 0).scale(0.8, 1.4, 0.8)), gemMat), { x, y, z });
    gm.scale.setScalar(s);
    const tw = sprite(GOLD_HOT, 0.4, 0);
    tw.position.set(x, y + 0.05, z);
    g.add(tw);
    gems.push({ gm, tw });
  }
  const glow = sprite(GOLD, 1.5, 0.3);
  glow.position.y = 0.35;
  g.add(glow);
  const pMat = poolMat(GOLD, 0.28);
  const pool = flat(new Mesh(sharedGeo('vp-pool', () => new CircleGeometry(0.95, 24)), pMat), 0.015);
  pool.renderOrder = 2;
  g.add(pool);
  g.add(groundShadow(0.6, 0.35));
  return {
    group: g,
    update(_e, tSec) {
      gems.forEach((x, i) => {
        x.gm.rotation.y = tSec * 0.8 + i;
        const p = Math.max(0, Math.sin(tSec * 1.9 + i * 2.1));
        x.tw.material.opacity = 0.85 * Math.pow(p, 8);
        const s = 0.25 + 0.3 * Math.pow(p, 8);
        x.tw.scale.set(s, s, 1);
      });
      glow.material.opacity = 0.24 + 0.08 * Math.sin(tSec * 2.1);
      pMat.opacity = 0.22 + 0.06 * Math.sin(tSec * 2.1);
    },
  };
}

// --------------------------------------------------------------- platter --
export function buildPlatter(e) {
  const g = new Group();
  g.rotation.y = e.yaw ?? 0;
  const brass = toonMaterial({ color: mix(GOLD, PALETTE.warmGrey, 0.35) });
  // A low stone table under the platter so it sits at a feast's height.
  const stone = toonMaterial({ color: STONE });
  add(g, new Mesh(sharedGeo('vf-table', () => new CylinderGeometry(0.62, 0.7, 0.36, 10)), stone), { y: 0.18 });
  add(g, new Mesh(sharedGeo('vf-plate', () => new CylinderGeometry(0.58, 0.52, 0.05, 24)), brass), { y: 0.385 });
  add(g, new Mesh(sharedGeo('vf-rim', () => new TorusGeometry(0.57, 0.025, 6, 28).rotateX(Math.PI / 2)), brass), { y: 0.41 });
  const top = 0.41;
  // Bread, cheese, a roast, apples, grapes.
  add(g, new Mesh(sharedGeo('vf-loaf', () => new SphereGeometry(0.16, 12, 8).scale(1.5, 0.75, 0.95)), toonMaterial({ color: hslColor(32, 0.55, 0.45) })), { x: -0.2, y: top + 0.1, z: -0.12 });
  const cheese = add(g, new Mesh(sharedGeo('vf-cheese', () => new CylinderGeometry(0.16, 0.16, 0.12, 14, 1, false, 0, Math.PI * 1.6)), toonMaterial({ color: hslColor(46, 0.7, 0.62) })), { x: 0.22, y: top + 0.06, z: -0.16 });
  cheese.rotation.y = 0.6;
  const roast = new Group();
  roast.position.set(0.08, top + 0.1, 0.2);
  roast.rotation.y = -0.5;
  add(roast, new Mesh(sharedGeo('vf-roast', () => new SphereGeometry(0.15, 12, 9).scale(1.3, 0.85, 1)), toonMaterial({ color: hslColor(18, 0.5, 0.33) })));
  add(roast, new Mesh(sharedGeo('vf-bone', () => new CylinderGeometry(0.025, 0.03, 0.22, 6).rotateZ(Math.PI / 2)), toonMaterial({ color: PALETTE.bone })), { x: 0.24 });
  g.add(roast);
  const appleMat = toonMaterial({ color: hslColor(2, 0.62, 0.42) });
  for (const [x, z] of [[-0.3, 0.2], [-0.18, 0.3], [-0.36, 0.06]]) add(g, new Mesh(sharedGeo('vf-apple', () => new SphereGeometry(0.065, 10, 8)), appleMat), { x, y: top + 0.065, z });
  const grapeMat = toonMaterial({ color: hslColor(290, 0.3, 0.32) });
  for (let i = 0; i < 7; i++) add(g, new Mesh(sharedGeo('vf-grape', () => new SphereGeometry(0.04, 8, 6)), grapeMat), { x: 0.3 + (i % 3) * 0.05 - 0.05, y: top + 0.04 + Math.floor(i / 3) * 0.05, z: 0.08 + (i % 2) * 0.05, ink: false });
  // Steam off the roast and a warm candle-light glow.
  const steam = [];
  for (let i = 0; i < 5; i++) {
    const s = sprite(PARCH, 0.3, 0);
    g.add(s);
    steam.push({ s, ph: i / 5 });
  }
  const warm = sprite(AMBER, 1.8, 0.28);
  warm.position.y = 0.6;
  g.add(warm);
  const pMat = poolMat(AMBER, 0.2);
  const pool = flat(new Mesh(sharedGeo('vf-pool', () => new CircleGeometry(1.0, 24)), pMat), 0.015);
  pool.renderOrder = 2;
  g.add(pool);
  g.add(groundShadow(0.72, 0.4));
  return {
    group: g,
    update(_e, tSec) {
      for (const st of steam) {
        const u = (tSec * 0.35 + st.ph) % 1;
        st.s.position.set(0.08 + 0.08 * Math.sin(u * 6 + st.ph * 9), top + 0.2 + u * 1.1, 0.2 + 0.05 * Math.cos(u * 5));
        st.s.material.opacity = 0.22 * Math.sin(Math.PI * u);
        const sc = 0.2 + 0.4 * u;
        st.s.scale.set(sc, sc, 1);
      }
      warm.material.opacity = 0.24 + 0.05 * Math.sin(tSec * 5.3) + 0.03 * Math.sin(tSec * 13);
    },
  };
}

// ----------------------------------------------------------------- chest --
// The vault: a sanctum disc round the chest, braziers, light and dust.
export function buildVaultChest() {
  const g = new Group();
  // The sanctum: a carved stone disc with gold inlay, two turning rune rings.
  const sanct = new Group();
  g.add(sanct);
  const disc = flat(new Mesh(sharedGeo('vc-disc', () => new CircleGeometry(2.6, 48)), toonMaterial({ color: STONE_DARK })), 0.012);
  sanct.add(disc);
  const inlayMat = flatGlow(GOLD, 0.6);
  sanct.add(flat(new Mesh(sharedGeo('vc-inlay-out', () => new RingGeometry(2.42, 2.56, 72)), inlayMat), 0.02));
  sanct.add(flat(new Mesh(sharedGeo('vc-inlay-in', () => new RingGeometry(1.36, 1.42, 64)), inlayMat), 0.02));
  const runeMat = flatGlow(GOLD_HOT, 0.65);
  const runesOut = new Group();
  runesOut.position.y = 0.022;
  for (let i = 0; i < 12; i++) {
    const r = flat(new Mesh(sharedGeo('vc-rune', () => new RingGeometry(1.86, 2.1, 6, 1, 0, 0.32)), runeMat), 0);
    r.rotation.z = (i / 12) * Math.PI * 2;
    r.renderOrder = 3;
    runesOut.add(r);
  }
  sanct.add(runesOut);
  const spokeMat = flatGlow(GOLD, 0.35);
  const spokes = new Group();
  spokes.position.y = 0.021;
  for (let i = 0; i < 8; i++) {
    const s = flat(new Mesh(sharedGeo('vc-spoke', () => new BoxGeometry(0.05, 0.9, 0.001).translate(0, 1.9, 0)), spokeMat), 0);
    s.rotation.z = (i / 8) * Math.PI * 2 + Math.PI / 8;
    spokes.add(s);
  }
  sanct.add(spokes);
  const sPool = poolMat(GOLD, 0.3);
  const pool = flat(new Mesh(sharedGeo('vc-pool', () => new CircleGeometry(3.4, 32)), sPool), 0.016);
  pool.renderOrder = 2;
  sanct.add(pool);
  // Four candle braziers at the disc's diagonals.
  const flames = [];
  const bronze = toonMaterial({ color: mix(GOLD, PALETTE.bruiseUmber, 0.45) });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const bx = Math.cos(a) * 2.25;
    const bz = Math.sin(a) * 2.25;
    add(g, new Mesh(sharedGeo('vc-braz-foot', () => new CylinderGeometry(0.18, 0.24, 0.1, 8)), bronze), { x: bx, y: 0.05, z: bz });
    add(g, new Mesh(sharedGeo('vc-braz-stem', () => new CylinderGeometry(0.04, 0.05, 0.9, 6)), bronze), { x: bx, y: 0.5, z: bz });
    add(g, new Mesh(sharedGeo('vc-braz-bowl', () => new CylinderGeometry(0.2, 0.08, 0.14, 10, 1, true)), toonMaterial({ color: mix(GOLD, PALETTE.bruiseUmber, 0.45), side: DoubleSide })), { x: bx, y: 1.0, z: bz });
    const f = sprite(AMBER, 0.55, 0.9);
    f.position.set(bx, 1.18, bz);
    g.add(f);
    const fc = sprite(GOLD_HOT, 0.25, 0.9);
    fc.position.set(bx, 1.14, bz);
    g.add(fc);
    const halo = sprite(AMBER, 2.2, 0.16);
    halo.position.set(bx, 1.1, bz);
    g.add(halo);
    flames.push({ f, fc, halo, ph: i * 1.7 });
  }
  // The chest: black iron, gold bands and filigree, a domed lid, a keyhole.
  const body = new Group();
  g.add(body);
  const iron = toonMaterial({ color: IRON });
  const ironLit = toonMaterial({ color: IRON_LIT });
  const gold = goldMetal(0.4);
  add(body, new Mesh(sharedGeo('vc-plinth', () => new BoxGeometry(1.3, 0.16, 0.9)), toonMaterial({ color: STONE })), { y: 0.08 });
  add(body, new Mesh(sharedGeo('vc-box', () => new BoxGeometry(1.04, 0.56, 0.68)), iron), { y: 0.44 });
  for (const x of [-0.44, -0.15, 0.15, 0.44]) add(body, new Mesh(sharedGeo('vc-band', () => new BoxGeometry(0.06, 0.58, 0.7)), gold), { x, y: 0.44 });
  add(body, new Mesh(sharedGeo('vc-trim', () => new BoxGeometry(1.08, 0.05, 0.72)), gold), { y: 0.18 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(body, new Mesh(sharedGeo('vc-foot', () => new SphereGeometry(0.07, 8, 6)), gold), { x: sx * 0.5, y: 0.2, z: sz * 0.32 });
  const hinge = new Group();
  hinge.position.set(0, 0.72, -0.34);
  body.add(hinge);
  const lid = new Mesh(sharedGeo('vc-lid', () => new CylinderGeometry(0.34, 0.34, 1.04, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0, 0.34)), ironLit);
  addInk(lid);
  hinge.add(lid);
  for (const x of [-0.44, 0.44]) {
    const b = new Mesh(sharedGeo('vc-lidband', () => new TorusGeometry(0.345, 0.03, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(0, 0, 0.34)), gold);
    b.position.x = x;
    hinge.add(b);
  }
  const gem = new Mesh(sharedGeo('vc-lidgem', () => new OctahedronGeometry(0.09, 0).scale(1, 1.3, 0.6)), toonMaterial({ color: GOLD_HOT, emissive: GOLD_HOT, emissiveIntensity: 0.7 }));
  gem.position.set(0, 0.3, 0.42);
  hinge.add(gem);
  add(body, new Mesh(sharedGeo('vc-lockplate', () => new BoxGeometry(0.2, 0.22, 0.04)), gold), { y: 0.6, z: 0.35 });
  const holeMat = new MeshBasicMaterial({ color: new Color(GOLD_HOT), transparent: true, opacity: 0.9, toneMapped: false });
  add(body, new Mesh(sharedGeo('vc-keyhole', () => new CircleGeometry(0.035, 10)), holeMat), { y: 0.63, z: 0.372, ink: false });
  add(body, new Mesh(sharedGeo('vc-keyslot', () => new BoxGeometry(0.03, 0.07, 0.002)), holeMat), { y: 0.585, z: 0.372, ink: false });
  const holeGlow = sprite(GOLD_HOT, 0.5, 0.6);
  holeGlow.position.set(0, 0.61, 0.4);
  body.add(holeGlow);
  const seamMat = new MeshBasicMaterial({ color: new Color(GOLD_HOT), transparent: true, opacity: 0, toneMapped: false, blending: AdditiveBlending, depthWrite: false });
  add(body, new Mesh(sharedGeo('vc-seam', () => new BoxGeometry(1.06, 0.03, 0.7)), seamMat), { y: 0.72, ink: false });
  const inside = sprite(GOLD_HOT, 1.6, 0);
  inside.position.y = 1.0;
  body.add(inside);
  const geyser = sprite(GOLD, 1, 0);
  geyser.scale.set(1.2, 7, 1);
  geyser.position.y = 3.6;
  body.add(geyser);
  const geyserCore = sprite(GOLD_HOT, 1, 0);
  geyserCore.scale.set(0.35, 7.5, 1);
  geyserCore.position.y = 3.8;
  body.add(geyserCore);
  // Light shafts slanting down beside the chest (kept off it: from above a
  // shaft is a long stripe, and over the chest it washes the iron out), and
  // dust in the air.
  const shafts = [];
  for (const [x, z, w, rot] of [[-1.75, 0.5, 0.75, 0.18], [1.8, -0.1, 0.65, -0.12]]) {
    const s = sprite(GOLD_HOT, 1, 0.1);
    s.scale.set(w, 6.5, 1);
    s.position.set(x, 3.2, z);
    s.material.rotation = rot;
    g.add(s);
    shafts.push(s);
  }
  const dust = [];
  for (let i = 0; i < 26; i++) {
    const d = sprite(GOLD_HOT, 0.07, 0.6);
    g.add(d);
    dust.push({ d, x0: Math.sin(i * 12.9898) * 4.2, z0: Math.cos(i * 78.233) * 3.2 + 1.2, ph: (i * 0.618) % 1, sp: 0.06 + (i % 5) * 0.015 });
  }
  g.add(groundShadow(0.8, 0.45));
  let open = 0;
  let opening = false;
  let openAge = 9;
  let lastT = null;
  return {
    group: g,
    update(e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      if (e && e.uses === 0 && !opening) {
        opening = true;
        openAge = 9; // a restored (already open) vault skips the burst
      }
      openAge += dt;
      open += ((opening ? 1 : 0) - open) * (1 - Math.exp(-7 * dt));
      const breathe = 0.82 + 0.18 * Math.sin(tSec * 2);
      runesOut.rotation.y = tSec * 0.12;
      spokes.rotation.y = -tSec * 0.05;
      inlayMat.opacity = (0.5 + 0.2 * open) * breathe;
      runeMat.opacity = (0.55 + 0.25 * Math.max(0, Math.sin(tSec * 2.6))) * (1 + 0.4 * open);
      spokeMat.opacity = 0.3 * breathe;
      sPool.opacity = (0.22 + 0.25 * open) * breathe;
      for (const fl of flames) {
        const s = 0.5 + 0.08 * Math.sin(tSec * 9 + fl.ph) + 0.05 * Math.sin(tSec * 21 + fl.ph * 3);
        fl.f.scale.set(s, s * 1.5, 1);
        fl.fc.scale.set(s * 0.45, s * 0.7, 1);
        fl.halo.material.opacity = 0.13 + 0.04 * Math.sin(tSec * 7 + fl.ph);
      }
      hinge.rotation.x = -1.95 * open;
      gem.rotation.y = tSec * 1.2;
      holeMat.opacity = opening ? 0.3 : 0.7 + 0.3 * Math.max(0, Math.sin(tSec * 3.4));
      holeGlow.material.opacity = opening ? 0.1 : 0.4 + 0.3 * Math.max(0, Math.sin(tSec * 3.4));
      // (the seam burns only while the lid lifts: shut, it read as a pale slab
      // from the camera's height)
      seamMat.opacity = opening ? 0.9 * (1 - open) : 0;
      inside.material.opacity = 0.75 * open + 0.1 * Math.sin(tSec * 4) * open;
      const burst = openAge < 2.4 ? 1 - openAge / 2.4 : 0;
      geyser.material.opacity = 0.45 * burst + 0.12 * open;
      geyserCore.material.opacity = 0.7 * burst + 0.1 * open;
      geyser.scale.set(1.2 + 1.2 * burst, 7, 1);
      for (const s of shafts) s.material.opacity = (0.06 + 0.02 * Math.sin(tSec * 0.7 + s.position.x)) * (1 + open * 0.6);
      for (const p of dust) {
        const u = (tSec * p.sp + p.ph) % 1;
        p.d.position.set(p.x0 + 0.4 * Math.sin(tSec * 0.3 + p.ph * 7), 0.3 + u * 3.6, p.z0 + 0.3 * Math.cos(tSec * 0.25 + p.ph * 5));
        p.d.material.opacity = 0.6 * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.max(0, Math.sin(tSec * 1.3 + p.ph * 11)));
      }
    },
    onEvent(type) {
      if (type === 'vault_open') {
        opening = true;
        openAge = 0;
      }
    },
  };
}

export function buildVaultRig(e) {
  switch (e.kind) {
    case 'vault_key':
      return buildKey(e);
    case 'vault_pile':
      return buildPile(e);
    case 'vault_platter':
      return buildPlatter(e);
    case 'vault_chest':
      return buildVaultChest(e);
    default:
      return null;
  }
}
