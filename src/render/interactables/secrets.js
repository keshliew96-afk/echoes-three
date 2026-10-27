// SECRET ROOMS (docs/SECRET_ROOMS.md): the bodies of the secret-room slice,
// drawn by the interactable layer (./index.js) for these entity kinds:
//   secret_wall     a patch of older masonry set into the room's edge: big
//                   fitted blocks in the land's own stone, a jagged seam that
//                   leaks a cold silver light, a fan of that light on the
//                   floor in front and a thin draught of dust blowing out of
//                   the crack, so a careful eye finds it without a guide. A
//                   light knock flares the seam; broken open it becomes a
//                   breach: a black opening in torn masonry, a rubble spill
//                   and the chamber's light breathing out of it.
//   secret_chamber  the hidden chamber itself, laid over the clearing while
//                   the party is inside: a ring of old flagstones under a
//                   shaft of moonlight, four candle stubs, rubble at the rim,
//                   dust turning in the light, and the dark closing in round
//                   it (a screen-space vignette centred on the chamber).
//   secret_pile     a small Glint pile (the hoard's; the vault's pile rig)
//   secret_body     what the chamber holds: a reliquary (a stone casket under
//                   a turning silver relic-light), a cache (a lidded crate with
//                   two tonic vials glowing through the slats) or a lectern
//                   (an open book and a page of lore turning above it)
// Colours keep the §19.1 rules: SECRET_COLORS (moonlit silver) is the found
// light; Pale Gold stays the hoard's own. The breaking, the entry and the
// opening beats are the VFX director's (render/vfx/secretfx.js). Render-only.
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { PALETTE, SECRET_COLORS, SHRINE_COLORS, TONIC_COLORS } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { attachChestBeat, nearestHero } from './chestbeat.js';
import { addInk, groundShadow, mix } from '../critters/common.js';
import { hslColor } from '../../env/colors.js';
import { buildPile } from './vaults.js';

export const SECRET_KINDS = Object.freeze(['secret_wall', 'secret_chamber', 'secret_pile', 'secret_body']);

const GLOW = SECRET_COLORS.glow;
const CORE = SECRET_COLORS.core;
const DEEP = SECRET_COLORS.deep;
const PARCH = PALETTE.parchment;
const AMBER = PALETTE.hearthAmber;
const DUST = '#BDB6C8';

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
// The land's stone (the shrines' table), a little darker for old masonry.
const stoneOf = (biome) => (SHRINE_COLORS[biome] ?? SHRINE_COLORS.wood).stone;
// Small deterministic jitter per block (no cosmetic stream needed).
const jit = (i, k) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
};

// ------------------------------------------------------------------ wall --
// Local frame: x along the room's edge, +z into the room, the slab's back
// flush with the boundary wall (the entity stands 0.34 u inside it).
export function buildSecretWall(e) {
  const g = new Group();
  const base = stoneOf(e.biome);
  const stone = toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.12) });
  const stoneLit = toonMaterial({ color: mix(base, PALETTE.bone, 0.18) });
  const stoneDark = toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.42) });
  // The masonry patch: three courses of fitted blocks, taller than the
  // boundary so it reads as something built into it.
  const slab = new Group();
  g.add(slab);
  const COURSES = [
    { y: 0.0, h: 0.34, blocks: [0.62, 0.5, 0.58] },
    { y: 0.34, h: 0.3, blocks: [0.44, 0.66, 0.6] },
    { y: 0.64, h: 0.3, blocks: [0.7, 0.46, 0.54] },
  ];
  const blocks = [];
  let n = 0;
  for (const c of COURSES) {
    const total = c.blocks.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    for (const w of c.blocks) {
      const mat = n % 3 === 1 ? stoneLit : n % 3 === 2 ? stoneDark : stone;
      const geo = sharedGeo(`sw-block-${w}-${c.h}`, () => new BoxGeometry(w - 0.035, c.h - 0.03, 0.4));
      const b = add(slab, new Mesh(geo, mat), { x: x + w / 2, y: c.y + c.h / 2, z: 0.02 * jit(n, 1) });
      b.rotation.set(0.03 * jit(n, 2), 0.05 * jit(n, 3), 0.04 * jit(n, 4));
      blocks.push({ b, home: b.position.clone(), rot: b.rotation.clone(), i: n });
      x += w;
      n += 1;
    }
  }
  // A capstone lintel across the top, slightly proud.
  const lintel = add(slab, new Mesh(sharedGeo('sw-lintel', () => new BoxGeometry(1.86, 0.1, 0.48)), stoneDark), { y: 0.99 });
  // The seam: a jagged line of cold light down the face, and its branches.
  const seamMat = new MeshBasicMaterial({ color: new Color(CORE), transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  const seamGlowMat = flatGlow(GLOW, 0.55);
  const SEAM = [[-0.08, 0.94], [0.04, 0.78], [-0.06, 0.62], [0.1, 0.44], [0.0, 0.3], [0.14, 0.14], [0.06, 0.02]];
  const BRANCH = [[[0.04, 0.78], [0.3, 0.7]], [[0.1, 0.44], [-0.22, 0.38]], [[0.0, 0.3], [0.32, 0.22]], [[-0.06, 0.62], [-0.34, 0.66]]];
  const seam = new Group();
  seam.position.z = 0.215;
  slab.add(seam);
  const seg = (a, b, w, mat, key) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const m = new Mesh(sharedGeo(key, () => new PlaneGeometry(1, 1)), mat);
    m.scale.set(w, len + w * 0.6, 1);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0);
    m.rotation.z = Math.atan2(-dx, dy);
    seam.add(m);
    return m;
  };
  for (let i = 0; i < SEAM.length - 1; i++) {
    seg(SEAM[i], SEAM[i + 1], 0.12, seamGlowMat, 'sw-seam');
    seg(SEAM[i], SEAM[i + 1], 0.03, seamMat, 'sw-seam');
  }
  for (const [a, b] of BRANCH) {
    seg(a, b, 0.07, seamGlowMat, 'sw-seam');
    seg(a, b, 0.018, seamMat, 'sw-seam');
  }
  // The light behind the crack, and the fan it throws on the floor.
  const leak = sprite(GLOW, 1.2, 0.35);
  leak.position.set(0.02, 0.5, 0.3);
  slab.add(leak);
  const fanMat = poolMat(GLOW, 0.3);
  const fan = flat(new Mesh(sharedGeo('sw-fan', () => new CircleGeometry(1, 28, 0, Math.PI)), fanMat), 0.02);
  fan.rotation.z = Math.PI; // the half-disc opens into the room (+z)
  fan.scale.set(1.0, 1.25, 1);
  fan.position.z = 0.22;
  fan.renderOrder = 2;
  g.add(fan);
  // Rubble and grit at its foot (the draught's spoil).
  const pebbleGeo = sharedGeo('sw-pebble', () => new DodecahedronGeometry(0.07, 0));
  const rubble = new Group();
  g.add(rubble);
  for (let i = 0; i < 9; i++) {
    const p = add(rubble, new Mesh(pebbleGeo, i % 2 ? stoneLit : stone), { x: jit(i, 5) * 1.7, y: 0.04, z: 0.3 + Math.abs(jit(i, 6)) * 0.5, ink: i < 4 });
    p.scale.setScalar(0.6 + Math.abs(jit(i, 7)) * 1.1);
    p.rotation.set(jit(i, 8) * 3, jit(i, 9) * 3, 0);
  }
  // The draught: dust blowing out of the seam and settling in front.
  const dust = [];
  for (let i = 0; i < 14; i++) {
    const d = sprite(i % 3 ? DUST : CORE, i % 3 ? 0.11 : 0.07, 0);
    g.add(d);
    dust.push({ d, ph: (i * 0.618) % 1, y0: 0.12 + (i % 7) * 0.12, side: jit(i, 10) * 0.9 });
  }
  // --- The breach (shown once open): black opening, torn edges, spill.
  const breach = new Group();
  breach.visible = false;
  g.add(breach);
  const holeMat = new MeshBasicMaterial({ color: new Color(SECRET_COLORS.dark), toneMapped: false });
  add(breach, new Mesh(sharedGeo('sw-hole', () => new BoxGeometry(1.1, 0.86, 0.06)), holeMat), { y: 0.43, z: -0.12, ink: false });
  for (const [x, y, w, h, i] of [[-0.74, 0.42, 0.32, 0.84, 0], [0.74, 0.4, 0.3, 0.8, 1], [-0.52, 0.86, 0.34, 0.2, 2], [0.5, 0.88, 0.4, 0.18, 3], [-0.6, 0.12, 0.28, 0.24, 4], [0.62, 0.14, 0.28, 0.28, 5]]) {
    const b = add(breach, new Mesh(sharedGeo(`sw-edge-${i}`, () => new BoxGeometry(w, h, 0.42)), i % 2 ? stoneDark : stone), { x, y, z: 0 });
    b.rotation.set(0.06 * jit(i, 11), 0.1 * jit(i, 12), 0.18 * jit(i, 13));
  }
  add(breach, new Mesh(sharedGeo('sw-lintel-broken', () => new BoxGeometry(1.86, 0.1, 0.48)), stoneDark), { y: 0.99 });
  const spill = new Group();
  breach.add(spill);
  const chunkGeo = sharedGeo('sw-chunk', () => new DodecahedronGeometry(0.13, 0));
  for (let i = 0; i < 12; i++) {
    const c = add(spill, new Mesh(chunkGeo, i % 3 === 0 ? stoneLit : i % 3 === 1 ? stone : stoneDark), { x: jit(i, 14) * 1.5, y: 0.06, z: 0.35 + Math.abs(jit(i, 15)) * 0.8, ink: i < 6 });
    c.scale.setScalar(0.6 + Math.abs(jit(i, 16)) * 1.0);
    c.rotation.set(jit(i, 17) * 3, jit(i, 18) * 3, jit(i, 19) * 3);
  }
  const mouth = sprite(GLOW, 1.6, 0);
  mouth.position.set(0, 0.45, 0.1);
  breach.add(mouth);
  const mouthCore = sprite(CORE, 0.7, 0);
  mouthCore.position.set(0, 0.42, 0.05);
  breach.add(mouthCore);
  const breathMat = poolMat(GLOW, 0);
  const breath = flat(new Mesh(sharedGeo('sw-breath', () => new CircleGeometry(1, 28, 0, Math.PI)), breathMat), 0.022);
  breath.rotation.z = Math.PI;
  breath.scale.set(1.5, 2.0, 1);
  breath.position.z = 0.2;
  breath.renderOrder = 2;
  breach.add(breath);
  g.add(groundShadow(0.95, 0.3));

  let flareAge = 9;
  let open = false;
  let openAge = 9;
  let lastT = null;
  return {
    group: g,
    update(ent, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      flareAge += dt;
      if (ent && ent.shut === false && !open) {
        open = true;
        openAge = 9; // a restored (already open) wall skips the burst
      }
      openAge += dt;
      slab.visible = !open;
      fan.visible = !open;
      rubble.visible = !open;
      breach.visible = open;
      if (!open) {
        // The seam breathes slowly (a careful eye catches it), and flares
        // for a moment when a light blow lands.
        const breathe = 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(tSec * 1.3)), 2);
        const kick = flareAge < 0.45 ? 1 - flareAge / 0.45 : 0;
        seamMat.opacity = Math.min(1, 0.55 + 0.3 * breathe + 0.6 * kick);
        seamGlowMat.opacity = 0.32 + 0.3 * breathe + 0.5 * kick;
        leak.material.opacity = 0.18 + 0.2 * breathe + 0.5 * kick;
        fanMat.opacity = 0.14 + 0.12 * breathe + 0.25 * kick;
        // A knock nudges the blocks.
        for (const k of blocks) {
          const s = kick * 0.025 * Math.sin(tSec * 60 + k.i);
          k.b.position.set(k.home.x + s, k.home.y, k.home.z + s * 0.5);
        }
        for (const p of dust) {
          const u = (tSec * 0.28 + p.ph) % 1;
          // Out of the seam, drifting into the room and sinking.
          p.d.position.set(0.04 + p.side * u, p.y0 * (1 - u) + 0.05, 0.25 + u * 1.5);
          p.d.material.opacity = 0.55 * Math.sin(Math.PI * u) * (0.6 + 0.4 * breathe);
        }
        lintel.visible = true;
      } else {
        const burst = openAge < 1.2 ? 1 - openAge / 1.2 : 0;
        const b = 0.75 + 0.25 * Math.sin(tSec * 1.7);
        mouth.material.opacity = 0.32 * b + 0.6 * burst;
        mouthCore.material.opacity = 0.35 * b + 0.5 * burst;
        breathMat.opacity = 0.2 * b + 0.3 * burst;
        for (const p of dust) {
          const u = (tSec * 0.22 + p.ph) % 1;
          p.d.position.set(p.side * 1.2 * u, 0.2 + p.y0 * 0.8 + u * 0.4, 0.15 + u * 1.8);
          p.d.material.opacity = 0.5 * Math.sin(Math.PI * u) * b;
        }
      }
    },
    onEvent(type) {
      if (type === 'knock') flareAge = 0;
      if (type === 'open') {
        open = true;
        openAge = 0;
      }
    },
  };
}

// --------------------------------------------------------------- chamber --
// The dark round the chamber: a camera-facing quad just past the near plane
// whose alpha rises with screen distance from the chamber's centre.
const DARK_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DARK_FRAG = `uniform vec2 uCentre; uniform float uAspect; uniform float uR0; uniform float uR1; uniform float uDark; uniform vec3 uColor; varying vec2 vUv;
void main() { vec2 d = vUv - uCentre; d.x *= uAspect; float r = length(d); float a = smoothstep(uR0, uR1, r) * uDark; gl_FragColor = vec4(uColor, a); }`;

export function buildSecretChamber(e, { stage = null } = {}) {
  const g = new Group();
  const base = stoneOf(e.biome);
  // The old floor: a ring of flagstones, a carved border and its inlay.
  const floor = new Group();
  g.add(floor);
  floor.add(flat(new Mesh(sharedGeo('sc-floor', () => new CircleGeometry(3.5, 40)), toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.55) })), 0.012));
  const flagMatA = toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.3) });
  const flagMatB = toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.4) });
  for (let ring = 0; ring < 3; ring++) {
    const r0 = 0.5 + ring * 1.0;
    const count = 6 + ring * 6;
    for (let i = 0; i < count; i++) {
      const a0 = (i / count) * Math.PI * 2 + ring * 0.3;
      const t = flat(new Mesh(sharedGeo(`sc-flag-${ring}`, () => new RingGeometry(r0 + 0.04, r0 + 0.96, 6, 1, 0, (Math.PI * 2) / count - 0.05)), (i + ring) % 2 ? flagMatA : flagMatB), 0.016);
      t.rotation.z = a0;
      floor.add(t);
    }
  }
  floor.add(flat(new Mesh(sharedGeo('sc-centre', () => new CircleGeometry(0.46, 20)), flagMatA), 0.017));
  const inlayMat = flatGlow(GLOW, 0.35);
  floor.add(flat(new Mesh(sharedGeo('sc-inlay', () => new RingGeometry(3.36, 3.44, 64)), inlayMat), 0.02));
  // Moonlight from a crack far above: a pool, two shafts, motes.
  const poolM = poolMat(GLOW, 0.4);
  const pool = flat(new Mesh(sharedGeo('sc-pool', () => new CircleGeometry(3.2, 32)), poolM), 0.022);
  pool.renderOrder = 2;
  g.add(pool);
  const shafts = [];
  for (const [x, z, w, rot] of [[-0.5, -0.6, 1.2, 0.12], [0.7, -0.9, 0.8, -0.08]]) {
    const s = sprite(GLOW, 1, 0.12);
    s.scale.set(w, 7.5, 1);
    s.position.set(x, 3.6, z);
    s.material.rotation = rot;
    g.add(s);
    shafts.push(s);
  }
  const motes = [];
  for (let i = 0; i < 30; i++) {
    const d = sprite(i % 4 ? DUST : CORE, i % 4 ? 0.07 : 0.05, 0);
    g.add(d);
    motes.push({ d, a: i * 2.4, r: 0.4 + ((i * 0.37) % 1) * 2.6, ph: (i * 0.618) % 1, sp: 0.05 + (i % 5) * 0.012 });
  }
  // Four candle stubs at the rim, warm against the cold light.
  const wax = toonMaterial({ color: mix(PALETTE.bone, PALETTE.parchment, 0.4) });
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const cx = Math.cos(a) * 2.9;
    const cz = Math.sin(a) * 2.9;
    for (const [dx, dz, h] of [[0, 0, 0.32], [0.12, 0.08, 0.2], [-0.1, 0.1, 0.14]]) add(g, new Mesh(sharedGeo(`sc-candle-${h}`, () => new CylinderGeometry(0.05, 0.06, h, 8)), wax), { x: cx + dx, y: h / 2, z: cz + dz });
    const f = sprite(AMBER, 0.32, 0.9);
    f.position.set(cx, 0.42, cz);
    g.add(f);
    const halo = sprite(AMBER, 1.3, 0.14);
    halo.position.set(cx, 0.4, cz);
    g.add(halo);
    flames.push({ f, halo, ph: i * 1.9 });
  }
  // Rubble at the chamber's rim.
  const chunkGeo = sharedGeo('sc-rubble', () => new DodecahedronGeometry(0.16, 0));
  const rubbleMat = toonMaterial({ color: mix(base, PALETTE.voidCharcoal, 0.25) });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + jit(i, 20) * 0.3;
    const r = 3.55 + Math.abs(jit(i, 21)) * 0.4;
    const c = add(g, new Mesh(chunkGeo, rubbleMat), { x: Math.cos(a) * r, y: 0.08, z: Math.sin(a) * r, ink: i % 2 === 0 });
    c.scale.setScalar(0.6 + Math.abs(jit(i, 22)) * 1.2);
    c.rotation.set(jit(i, 23) * 3, jit(i, 24) * 3, 0);
  }
  // The dark.
  let dark = null;
  const darkU = {
    uCentre: { value: { x: 0.5, y: 0.5 } },
    uAspect: { value: 1 },
    uR0: { value: 0.2 },
    uR1: { value: 0.4 },
    uDark: { value: 0 },
    uColor: { value: new Color(SECRET_COLORS.dark) },
  };
  if (stage && stage.camera) {
    const mat = new ShaderMaterial({ uniforms: darkU, vertexShader: DARK_VERT, fragmentShader: DARK_FRAG, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    dark = new Mesh(sharedGeo('sc-dark', () => new PlaneGeometry(1, 1)), mat);
    dark.frustumCulled = false;
    dark.renderOrder = 990;
    g.add(dark);
  }
  const v = new Vector3();
  const fwd = new Vector3();
  const edge = new Vector3();
  let age = 0;
  let lastT = null;
  return {
    group: g,
    update(_e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      age += dt;
      const come = Math.min(1, age / 0.8);
      const breathe = 0.85 + 0.15 * Math.sin(tSec * 1.1);
      poolM.opacity = 0.34 * breathe * come;
      inlayMat.opacity = (0.25 + 0.15 * Math.max(0, Math.sin(tSec * 2.1))) * come;
      for (const s of shafts) s.material.opacity = (0.09 + 0.03 * Math.sin(tSec * 0.6 + s.position.x)) * come;
      for (const m of motes) {
        const u = (tSec * m.sp + m.ph) % 1;
        const a = m.a + tSec * 0.15;
        m.d.position.set(Math.cos(a) * m.r, 0.2 + u * 3.4, Math.sin(a) * m.r);
        m.d.material.opacity = 0.6 * Math.sin(Math.PI * u) * come;
      }
      for (const fl of flames) {
        const s = 0.3 + 0.05 * Math.sin(tSec * 9 + fl.ph) + 0.03 * Math.sin(tSec * 23 + fl.ph);
        fl.f.scale.set(s, s * 1.5, 1);
        fl.halo.material.opacity = (0.12 + 0.04 * Math.sin(tSec * 7 + fl.ph)) * come;
      }
      if (dark && stage && stage.camera) {
        const cam = stage.camera;
        const p = g.position;
        // The quad sits just past the near plane, filling the view.
        const dist = (cam.near ?? 0.1) * 1.6;
        cam.getWorldDirection(fwd);
        const h = 2 * dist * Math.tan(((cam.fov ?? 50) * Math.PI) / 360);
        const asp = cam.aspect ?? 1;
        dark.position.copy(cam.position).addScaledVector(fwd, dist).sub(p);
        dark.quaternion.copy(cam.quaternion);
        dark.scale.set(h * asp * 1.02, h * 1.02, 1);
        // The chamber's centre and radius on screen.
        v.set(p.x, 0.3, p.z).project(cam);
        edge.set(p.x + 3.9, 0.3, p.z).project(cam);
        const cx = (v.x + 1) / 2;
        const cy = (v.y + 1) / 2;
        const rr = Math.hypot(((edge.x - v.x) / 2) * asp, (edge.y - v.y) / 2);
        darkU.uCentre.value = { x: cx, y: cy };
        darkU.uAspect.value = asp;
        darkU.uR0.value = rr * 0.72;
        darkU.uR1.value = rr * 1.3;
        darkU.uDark.value = 0.88 * come;
      }
    },
  };
}

// ----------------------------------------------------------------- bodies --
function buildReliquary() {
  const g = new Group();
  const stone = toonMaterial({ color: hslColor(220, 0.06, 0.36) });
  const stoneDark = toonMaterial({ color: hslColor(222, 0.08, 0.22) });
  const silver = toonMaterial({ color: mix(GLOW, PALETTE.warmGrey, 0.3), emissive: GLOW, emissiveIntensity: 0.25 });
  const body = new Group(); // the casket the chest beat rocks (chestbeat.js)
  g.add(body);
  add(body, new Mesh(sharedGeo('sr-plinth', () => new BoxGeometry(1.0, 0.22, 0.7)), stoneDark), { y: 0.11 });
  add(body, new Mesh(sharedGeo('sr-casket', () => new BoxGeometry(0.78, 0.4, 0.5)), stone), { y: 0.42 });
  for (const x of [-0.3, 0.3]) add(body, new Mesh(sharedGeo('sr-band', () => new BoxGeometry(0.05, 0.42, 0.52)), silver), { x, y: 0.42 });
  const lid = new Group();
  lid.position.set(0, 0.62, 0);
  body.add(lid);
  add(lid, new Mesh(sharedGeo('sr-lid', () => new BoxGeometry(0.84, 0.08, 0.56)), stoneDark), { y: 0.04 });
  add(lid, new Mesh(sharedGeo('sr-ridge', () => new BoxGeometry(0.84, 0.06, 0.14)), stone), { y: 0.11 });
  add(lid, new Mesh(sharedGeo('sr-sigil', () => new TorusGeometry(0.09, 0.018, 6, 18)), silver), { y: 0.1, z: 0.29 });
  // The relic-light turning over the lid.
  const relic = new Group();
  relic.position.y = 1.15;
  g.add(relic);
  const gem = add(relic, new Mesh(sharedGeo('sr-gem', () => new OctahedronGeometry(0.13, 0).scale(1, 1.4, 1)), toonMaterial({ color: CORE, emissive: GLOW, emissiveIntensity: 0.8 })));
  const halo = sprite(GLOW, 1.2, 0.5);
  relic.add(halo);
  const core = sprite(CORE, 0.45, 0.8);
  relic.add(core);
  const ringMat = flatGlow(GLOW, 0.5);
  const ring = flat(new Mesh(sharedGeo('sr-ring', () => new RingGeometry(0.62, 0.68, 40)), ringMat), 0.03);
  g.add(ring);
  g.add(groundShadow(0.7, 0.4));
  return { group: g, body, beat: { w: 0.78, d: 0.5, rim: 0.62, hasp: { y: 0.44, z: 0.25 } }, parts: { lid, relic, gem, halo, core, ringMat }, kind: 'relic' };
}
function buildCache() {
  const g = new Group();
  const wood = toonMaterial({ color: hslColor(28, 0.32, 0.3) });
  const woodDark = toonMaterial({ color: hslColor(26, 0.3, 0.19) });
  const iron = toonMaterial({ color: hslColor(220, 0.08, 0.2) });
  const body = new Group(); // the crate the chest beat rocks (chestbeat.js)
  g.add(body);
  add(body, new Mesh(sharedGeo('st-box', () => new BoxGeometry(0.86, 0.46, 0.56)), woodDark), { y: 0.23 });
  for (const y of [0.1, 0.24, 0.38]) add(body, new Mesh(sharedGeo('st-slat', () => new BoxGeometry(0.88, 0.09, 0.58)), wood), { y });
  for (const x of [-0.4, 0.4]) add(body, new Mesh(sharedGeo('st-corner', () => new BoxGeometry(0.07, 0.48, 0.6)), iron), { x, y: 0.24 });
  const lid = new Group();
  lid.position.set(0, 0.47, -0.28);
  body.add(lid);
  add(lid, new Mesh(sharedGeo('st-lid', () => new BoxGeometry(0.9, 0.07, 0.6)), wood), { y: 0.035, z: 0.28 });
  // Two vials glowing through, a third lying beside it.
  const vials = [];
  const VIAL = [['mend_tonic', -0.18, 0.08], ['frost_bomb', 0.18, -0.05]];
  for (const [id, x, z] of VIAL) {
    const c = TONIC_COLORS[id];
    const glass = toonMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 0.5 });
    const v = new Group();
    v.position.set(x, 0.42, z);
    body.add(v);
    add(v, new Mesh(sharedGeo('st-vial', () => new SphereGeometry(0.1, 10, 8)), glass), { y: 0.12 });
    add(v, new Mesh(sharedGeo('st-neck', () => new CylinderGeometry(0.035, 0.04, 0.12, 8)), glass), { y: 0.24 });
    add(v, new Mesh(sharedGeo('st-cork', () => new CylinderGeometry(0.04, 0.035, 0.05, 8)), wood), { y: 0.32 });
    const s = sprite(c.glow, 0.7, 0.4);
    s.position.y = 0.14;
    v.add(s);
    vials.push({ v, s, x });
  }
  g.add(groundShadow(0.6, 0.38));
  return { group: g, body, beat: { w: 0.86, d: 0.56, rim: 0.47, hasp: { y: 0.36, z: 0.29 } }, parts: { lid, vials }, kind: 'tonics' };
}
function buildLectern() {
  const g = new Group();
  const stone = toonMaterial({ color: hslColor(30, 0.06, 0.34) });
  const stoneDark = toonMaterial({ color: hslColor(30, 0.08, 0.2) });
  add(g, new Mesh(sharedGeo('sl-foot', () => new CylinderGeometry(0.3, 0.38, 0.12, 8)), stoneDark), { y: 0.06 });
  add(g, new Mesh(sharedGeo('sl-stem', () => new CylinderGeometry(0.1, 0.14, 0.62, 8)), stone), { y: 0.43 });
  const top = new Group();
  top.position.y = 0.78;
  top.rotation.x = -0.5;
  g.add(top);
  add(top, new Mesh(sharedGeo('sl-board', () => new BoxGeometry(0.62, 0.06, 0.46)), stoneDark));
  const paper = toonMaterial({ color: PARCH, emissive: PARCH, emissiveIntensity: 0.15 });
  const cover = toonMaterial({ color: hslColor(8, 0.35, 0.26) });
  add(top, new Mesh(sharedGeo('sl-cover', () => new BoxGeometry(0.58, 0.03, 0.4)), cover), { y: 0.045 });
  for (const x of [-0.14, 0.14]) {
    const p = add(top, new Mesh(sharedGeo('sl-leaf', () => new BoxGeometry(0.27, 0.025, 0.36)), paper), { x, y: 0.07 });
    p.rotation.z = x > 0 ? -0.08 : 0.08;
  }
  // The loose page turning in the light above the book.
  const page = new Group();
  page.position.set(0, 1.35, 0.05);
  g.add(page);
  const leaf = add(page, new Mesh(sharedGeo('sl-page', () => new PlaneGeometry(0.34, 0.44)), new MeshBasicMaterial({ color: new Color(PARCH), side: DoubleSide, toneMapped: false })), { ink: false });
  const lines = new MeshBasicMaterial({ color: new Color('#6B6157'), side: DoubleSide, toneMapped: false });
  for (let i = 0; i < 5; i++) {
    const l = new Mesh(sharedGeo('sl-line', () => new PlaneGeometry(0.24, 0.018)), lines);
    l.position.set(0, 0.13 - i * 0.065, 0.002);
    l.scale.x = i === 4 ? 0.6 : 1;
    page.add(l);
  }
  const halo = sprite(PARCH, 1.0, 0.35);
  page.add(halo);
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const m = sprite(PARCH, 0.06, 0);
    g.add(m);
    motes.push({ m, a: i * 1.05, ph: i / 6 });
  }
  g.add(groundShadow(0.45, 0.38));
  return { group: g, parts: { page, leaf, halo, motes }, kind: 'lore' };
}

export function buildSecretBody(e) {
  const r = e.content === 'relic' ? buildReliquary() : e.content === 'tonics' ? buildCache() : buildLectern();
  const P = r.parts;
  // The reliquary and the cache open on the chest beat (chestbeat.js): a
  // wobble as a hero nears, the press on the Take, the snap inside the
  // 1.2 s reveal. The lectern is not a chest: it keeps its own opening.
  const beat = r.body ? attachChestBeat(r.group, r.body, r.beat) : null;
  let opened = false;
  let openAge = 9;
  let open = 0;
  let lid = 0;
  let spentFor = 0;
  let lastT = null;
  return {
    group: r.group,
    beat,
    update(ent, tSec, ctx) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      // Built already open (a restored save, a joining guest): no burst. Spent
      // on the sim but no Take heard: open on the beat a moment later.
      if (ent && ent.uses === 0 && !opened && (!beat || beat.state().mode === 'idle')) {
        if (!beat || dt === 0) {
          opened = true;
          openAge = 9;
          if (beat) beat.restore();
        } else if ((spentFor += dt) > 0.3) beat.press();
      }
      if (beat) {
        const wp = r.group.position;
        const pose = beat.update(dt, opened ? Infinity : nearestHero(ctx && ctx.party, wp.x, wp.z), wp.x, wp.z);
        lid = pose.lid;
        if (!opened && beat.state().mode === 'open') {
          opened = true;
          openAge = 0;
        }
      }
      openAge += dt;
      open += ((opened ? 1 : 0) - open) * (1 - Math.exp(-6 * dt));
      if (!beat) lid = open;
      const burst = openAge < 1.2 ? 1 - openAge / 1.2 : 0;
      if (r.kind === 'relic') {
        P.relic.rotation.y = tSec * 1.1;
        P.relic.position.y = 1.15 + 0.08 * Math.sin(tSec * 1.8) + 0.5 * open;
        P.lid.position.x = 0.5 * lid;
        P.lid.rotation.z = -0.35 * lid;
        P.halo.material.opacity = 0.4 + 0.12 * Math.sin(tSec * 2.6) + 0.5 * burst;
        P.core.material.opacity = (0.75 + 0.2 * Math.sin(tSec * 3.1)) * (1 - 0.7 * open) + 0.4 * burst;
        P.gem.visible = open < 0.95;
        P.ringMat.opacity = (0.45 + 0.15 * Math.sin(tSec * 2)) * (1 - 0.6 * open);
      } else if (r.kind === 'tonics') {
        P.lid.rotation.x = -1.9 * lid;
        for (const vv of P.vials) {
          vv.v.position.y = 0.42 + 0.5 * open + 0.03 * Math.sin(tSec * 2 + vv.x * 9);
          vv.s.material.opacity = 0.32 + 0.12 * Math.sin(tSec * 3 + vv.x * 7) + 0.5 * burst;
        }
      } else {
        P.page.rotation.y = Math.sin(tSec * 0.7) * 0.6 + open * tSec * 2.2;
        P.page.position.y = 1.35 + 0.06 * Math.sin(tSec * 1.4) + 0.6 * open;
        P.halo.material.opacity = 0.3 + 0.1 * Math.sin(tSec * 2.2) + 0.5 * burst;
        for (const mo of P.motes) {
          const u = (tSec * 0.4 + mo.ph) % 1;
          mo.m.position.set(Math.cos(mo.a + tSec * 0.6) * 0.3, 1.0 + u * 1.1 + 0.6 * open, Math.sin(mo.a + tSec * 0.6) * 0.3 + 0.05);
          mo.m.material.opacity = 0.7 * Math.sin(Math.PI * u);
        }
      }
    },
    onEvent(type) {
      if (type === 'take') {
        if (beat) beat.press();
        else {
          opened = true;
          openAge = 0;
        }
      }
    },
  };
}

export function buildSecretRig(e, opts = {}) {
  switch (e.kind) {
    case 'secret_wall':
      return buildSecretWall(e);
    case 'secret_chamber':
      return buildSecretChamber(e, opts);
    case 'secret_pile':
      return buildPile(e);
    case 'secret_body':
      return buildSecretBody(e);
    default:
      return null;
  }
}
