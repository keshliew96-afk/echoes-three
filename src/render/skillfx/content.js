// Gauntlet skill + status VFX (BUILD_BRIEF §23.3 / §23.8, docs/gauntlet/PLAN.md
// §4.4; owner M4a). The render side of the nine new Healer skills, the
// technique pulses of the new nodes, and every status a body can carry —
// on the §19.4 layering contract: every effect is >= 3 layers (a hard core,
// a soft glow, particles), and it reads by SHAPE as well as colour.
//
// Colour law (§19.1 / §23.3, binding): damage = parchment-white core + Hearth
// Amber glow; heal output = Bright Heal; stun = a Bone ring glyph; slow = a
// Signal Blue ink ring (a glyph, never a fill); shield = a Parchment hex rim
// and a pale shell on the body; haste = amber speed streaks; ward = a soft
// Bone dome; exposed = a Bone cracked ring; inspired = an amber chevron.
// Never Ember (enemy threats only), never violet (corruption only).
//
// Render-only: reads sim entities read-only, subscribes to the event bus,
// draws with the COSMETIC stream only. Nothing here changes a sim number.
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { SKILLS } from '../../sim/skills.js';
import { makeGlowSprite } from '../glow.js';
import { releaseTree, sharedGeo } from '../geocache.js';
import { warmPark } from '../warmup.js';

const HEAL = PALETTE.brightHeal;
const AMBER = PALETTE.hearthAmber;
const PARCH = PALETTE.parchment;
const BONE = PALETTE.bone;
const BLUE = PALETTE.signalBlue;
const INK = PALETTE.voidCharcoal;
const MOTE_CAP = 220;
const NUM_CAP = 10;

// Skills whose cast this layer draws in full (skillfx/index.js skips its
// generic heal-shape reads for them — a damage nova must never flash green).
export const CONTENT_CAST_SKILLS = Object.freeze(new Set(['bell_toll', 'mending_tide']));
// Skills whose zones this layer owns (damage zones: never a green disc).
export const CONTENT_ZONE_SKILLS = Object.freeze(new Set(['rootsnare']));

function additive(color, opacity, { side = null, depthTest = true } = {}) {
  const m = new MeshBasicMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest,
  });
  if (side) m.side = side;
  return m;
}
// fix-M4a-r5 (F4): the shield's "pale shell on the body" is a RIM, not a fill.
// A fresnel term keeps the shell clear where it faces the camera (the body
// behind it keeps its own colours, class accents and identity ring) and lights
// only its silhouette edge — a Parchment outline around the character, the way
// barrier bubbles read in shipped action games. Additive, front faces only (the
// old DoubleSide fill added twice), no depth write. One program for every
// shell (the source is constant; uniforms carry colour / strength), warmed with
// the status rig at boot like every other part.
function rimShell(color, opacity) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uOpacity: { value: opacity } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vN = normalize( normalMatrix * normal );
        vV = normalize( -mv.xyz );
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) );
        float a = smoothstep( 0.5, 0.92, f ) * uOpacity;
        gl_FragColor = vec4( uColor, a );
      }
    `,
  });
}
function flat(color, opacity, { side = null, depthTest = true } = {}) {
  const m = new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, depthWrite: false, depthTest });
  if (side) m.side = side;
  return m;
}

// ------------------------------------------------------------ glyph atlas --
// Small canvas glyphs (drawn once): stun ring, chevrons, bell, hex rim.
const glyphCache = new Map();
function glyphTexture(id) {
  if (glyphCache.has(id)) return glyphCache.get(id);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const stroke = (col, w) => {
    g.strokeStyle = INK;
    g.lineWidth = w + 7;
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  };
  if (id === 'stun') {
    // Bone ring with three orbiting diamonds (§23.3: stun = Bone ring glyph).
    g.beginPath();
    g.ellipse(64, 64, 44, 20, 0, 0, Math.PI * 2);
    stroke(BONE, 6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = 64 + Math.cos(a) * 44;
      const y = 64 + Math.sin(a) * 20;
      g.beginPath();
      g.moveTo(x, y - 12);
      g.lineTo(x + 9, y);
      g.lineTo(x, y + 12);
      g.lineTo(x - 9, y);
      g.closePath();
      g.fillStyle = INK;
      g.fill();
      g.save();
      g.translate(x, y);
      g.scale(0.72, 0.72);
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(9, 0);
      g.lineTo(0, 12);
      g.lineTo(-9, 0);
      g.closePath();
      g.fillStyle = BONE;
      g.fill();
      g.restore();
    }
  } else if (id === 'up' || id === 'down') {
    // Chevron: amber up = inspired; Bone down = exposed.
    const col = id === 'up' ? AMBER : BONE;
    const d = id === 'up' ? -1 : 1;
    for (const off of [-16, 12]) {
      g.beginPath();
      g.moveTo(34, 64 - d * 18 + off);
      g.lineTo(64, 64 + d * 10 + off);
      g.lineTo(94, 64 - d * 18 + off);
      stroke(col, 9);
    }
  } else if (id === 'hex') {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = 64 + Math.cos(a) * 50;
      const y = 64 + Math.sin(a) * 50;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    stroke(PARCH, 6);
  } else if (id === 'bell') {
    g.beginPath();
    g.moveTo(40, 90);
    g.quadraticCurveTo(42, 40, 64, 34);
    g.quadraticCurveTo(86, 40, 88, 90);
    g.closePath();
    g.fillStyle = INK;
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = AMBER;
    g.stroke();
    g.beginPath();
    g.arc(64, 96, 7, 0, Math.PI * 2);
    g.fillStyle = PARCH;
    g.fill();
    g.beginPath();
    g.moveTo(30, 90);
    g.lineTo(98, 90);
    stroke(PARCH, 5);
  } else if (id === 'res') {
    // Resonance: three concentric arcs (×2 on the 3rd cast).
    for (const r of [18, 32, 46]) {
      g.beginPath();
      g.arc(64, 64, r, -Math.PI * 0.8, -Math.PI * 0.2);
      stroke(AMBER, 6);
      g.beginPath();
      g.arc(64, 64, r, Math.PI * 0.2, Math.PI * 0.8);
      stroke(PARCH, 6);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  glyphCache.set(id, t);
  return t;
}
function glyphSprite(id, size) {
  const s = new Sprite(new SpriteMaterial({ map: glyphTexture(id), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 22;
  return s;
}

export function createContentFx({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'skillfx-content';
  stage.scene.add(root);
  const player = () => world.player;
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const lerpPos = (e, alpha) => ({
    x: e.px !== undefined ? e.px + (e.x - e.px) * alpha : e.x,
    z: e.pz !== undefined ? e.pz + (e.z - e.pz) * alpha : e.z,
  });

  // ------------------------------------------------------------- particles --
  const motes = [];
  const motePool = [];
  function spawnMotes(x, z, { color = PARCH, count = 6, y = 0.25, spread = 0.3, vyMin = 0.5, vyMax = 1.2, life = [0.4, 0.8], size = [0.06, 0.14], fall = false } = {}) {
    for (let i = 0; i < count; i++) {
      if (motes.length >= MOTE_CAP) break;
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      const sz = cosmetic.range(size[0], size[1]);
      s.scale.set(sz, sz, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y + cosmetic.range(0, 0.2), z + Math.sin(a) * r);
      root.add(s);
      const vy = cosmetic.range(vyMin, vyMax);
      motes.push({ s, age: 0, life: cosmetic.range(life[0], life[1]), vy: fall ? -vy : vy, vx: cosmetic.range(-0.15, 0.15), vz: cosmetic.range(-0.15, 0.15), sz });
    }
  }
  const flashes = [];
  const flashPool = [];
  function spawnFlash(x, y, z, { color = PARCH, size = 0.5, opacity = 0.9, life = 0.3, grow = 0.4 } = {}) {
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity });
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life, size, grow, opacity });
  }
  // Expanding ground rings (a core line + an optional wide soft band).
  const rings = [];
  const ringPool = new Map(); // key -> [mesh]
  function spawnRing(x, z, { color = PARCH, from = 0.3, to = 1.4, life = 0.4, opacity = 0.8, width = 0.14, hold = 0.25, y = 0.035 } = {}) {
    const key = String(width);
    const pool = ringPool.get(key) ?? [];
    ringPool.set(key, pool);
    let m = pool.pop();
    if (!m) {
      m = new Mesh(sharedGeo(`cfx-ring:${width}`, () => new RingGeometry(1 - width, 1, 56)), additive(color, opacity));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = -3;
      m.userData.key = key;
    }
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.position.set(x, y, z);
    m.scale.set(from, from, 1);
    root.add(m);
    rings.push({ m, age: 0, life, from, to, opacity, hold });
  }
  // Rising glyph sprites (resonance, bell, chevrons on application).
  const glyphs = [];
  function spawnGlyph(id, x, z, { size = 0.5, y = 1.3, life = 0.8, rise = 0.5 } = {}) {
    const s = glyphSprite(id, size);
    s.position.set(x, y, z);
    root.add(s);
    glyphs.push({ s, age: 0, life, rise });
  }

  // ------------------------------------------------ absorbed "(n)" numerals --
  // §23.8: the shield's share shows as a small Bone "(n)" beside the HP
  // numeral (numerals still equal HP deltas).
  const nums = [];
  const numPool = [];
  function spawnAbsorb(x, z, n) {
    let rec = numPool.pop();
    if (!rec) {
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 72;
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
      s.renderOrder = 24;
      rec = { c, tex, s };
    }
    if (nums.length >= NUM_CAP) {
      const old = nums.shift();
      root.remove(old.rec.s);
      numPool.push(old.rec);
    }
    const g = rec.c.getContext('2d');
    g.clearRect(0, 0, 160, 72);
    g.font = '800 46px system-ui, "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 10;
    g.strokeStyle = INK;
    const txt = `(${Math.round(n)})`;
    g.strokeText(txt, 80, 38);
    g.fillStyle = BONE;
    g.fillText(txt, 80, 38);
    rec.tex.needsUpdate = true;
    rec.s.scale.set(0.62, 0.28, 1);
    rec.s.position.set(x + 0.42, 1.25, z);
    rec.s.material.opacity = 1;
    root.add(rec.s);
    nums.push({ rec, age: 0, life: 0.9 });
  }

  // ------------------------------------------------------------ status rigs --
  // One rig per body that carries a status, synced from `e.status` each frame.
  const statusRigs = new Map(); // id -> { g, parts }
  const slowGeo = sharedGeo('cfx-slow-ring', () => new RingGeometry(0.9, 1.0, 40));
  const crackGeo = sharedGeo('cfx-crack-ring', () => new RingGeometry(0.86, 1.0, 12, 1, 0, Math.PI * 1.7));
  const shellGeo = sharedGeo('cfx-shell', () => new SphereGeometry(1, 24, 16));
  const hexFloorGeo = sharedGeo('cfx-hexfloor', () => new PlaneGeometry(1, 1));
  const domeGeo = sharedGeo('cfx-dome', () => new SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const streakGeo = sharedGeo('cfx-streak', () => new PlaneGeometry(1, 1));
  function makeStatusRig() {
    const g = new Group();
    // slow: Signal Blue ink ring (outline, never a fill) + a thin ink under-ring.
    const slowInk = new Mesh(slowGeo, flat(INK, 0.55));
    slowInk.rotation.x = -Math.PI / 2;
    slowInk.position.y = 0.02;
    slowInk.scale.set(0.62, 0.62, 1);
    const slow = new Mesh(slowGeo, flat(BLUE, 0.95));
    slow.rotation.x = -Math.PI / 2;
    slow.position.y = 0.026;
    slow.scale.set(0.56, 0.56, 1);
    slow.renderOrder = 1;
    const slowGlow = makeGlowSprite({ color: BLUE, size: 0.9, opacity: 0.18 });
    slowGlow.position.y = 0.08;
    // exposed: Bone cracked ring.
    const exposed = new Mesh(crackGeo, flat(BONE, 0.9));
    exposed.rotation.x = -Math.PI / 2;
    exposed.position.y = 0.03;
    exposed.scale.set(0.72, 0.72, 1);
    const exposedGlyph = glyphSprite('down', 0.34);
    exposedGlyph.position.y = 1.55;
    // stun: Bone ring glyph over the head + glow.
    const stun = glyphSprite('stun', 0.62);
    stun.position.y = 1.35;
    const stunGlow = makeGlowSprite({ color: BONE, size: 0.7, opacity: 0.3 });
    stunGlow.position.y = 1.35;
    // shield (fix-M4a-r5 F4 — the body stays readable): a pale Parchment RIM
    // shell (fresnel, clear in the middle, just outside the body's silhouette),
    // the Parchment hex drawn FLAT on the ground around the feet outside the
    // identity ring (the shape channel — it never crosses the body, which the
    // old always-on-top hex sprite did), and a faint glow at the feet that
    // the body occludes. Magnitude reads from the rim's strength.
    const shell = new Mesh(shellGeo, rimShell(PARCH, 0.25));
    shell.scale.set(0.52, 0.66, 0.52);
    shell.position.y = 0.5;
    shell.renderOrder = 2;
    const hex = new Mesh(hexFloorGeo, new MeshBasicMaterial({ map: glyphTexture('hex'), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
    hex.rotation.x = -Math.PI / 2;
    hex.position.y = 0.034;
    hex.scale.set(1.7, 1.7, 1);
    hex.renderOrder = 1;
    const shieldGlow = makeGlowSprite({ color: PARCH, size: 1.1, opacity: 0.05 });
    shieldGlow.position.y = 0.05;
    // ward: soft Bone dome — drawn as a rim like the shield shell (fix-M4a-r5
    // F4: Quiet Hearth keeps a ward up on the whole party, and the old
    // double-sided fill greyed every body under it).
    const ward = new Mesh(domeGeo, rimShell(BONE, 0.2));
    ward.scale.set(0.58, 0.74, 0.58);
    const wardRim = new Mesh(slowGeo, additive(BONE, 0.4));
    wardRim.rotation.x = -Math.PI / 2;
    wardRim.position.y = 0.022;
    wardRim.scale.set(0.6, 0.6, 1);
    // inspired: amber chevron + glow.
    const inspired = glyphSprite('up', 0.36);
    inspired.position.y = 1.5;
    const inspiredGlow = makeGlowSprite({ color: AMBER, size: 0.5, opacity: 0.25 });
    inspiredGlow.position.y = 1.5;
    // haste: two amber streak planes that trail the move direction.
    const haste = new Group();
    for (let i = 0; i < 3; i++) {
      const st = new Mesh(streakGeo, additive(AMBER, 0.55, { side: DoubleSide }));
      st.scale.set(0.5, 0.05, 1);
      st.position.set(-0.3, 0.3 + i * 0.22, (i - 1) * 0.12);
      haste.add(st);
    }
    const parts = { slowInk, slow, slowGlow, exposed, exposedGlyph, stun, stunGlow, shell, hex, shieldGlow, ward, wardRim, inspired, inspiredGlow, haste };
    for (const p of Object.values(parts)) {
      p.visible = false;
      g.add(p);
    }
    return { g, parts, lastX: null, lastZ: null, dirX: 1, dirZ: 0 };
  }
  // fix-CAMPAIGN-r6 (CR6-F2, GC.6): status rigs are POOLED. A rig's shield
  // shell and ward dome are ShaderMaterials, and three keeps every DRAWN
  // ShaderMaterial in WebGLPrograms' shader cache (a strong Map keyed by the
  // material) until material.dispose() — the old `root.remove(rig.g)` left
  // ~190 of them (and the rest of the rig) alive per campaign. A rig that
  // leaves goes back to the pool hidden; beyond the cap its materials are
  // disposed (the boot anchor in prewarm() keeps their programs linked —
  // warmup.js), so the heap holds at most RIG_POOL_CAP idle rigs, ever.
  const RIG_POOL_CAP = 16;
  const rigPool = [];
  function acquireStatusRig() {
    const rig = rigPool.pop() ?? makeStatusRig();
    rig.lastX = null;
    rig.lastZ = null;
    rig.dirX = 1;
    rig.dirZ = 0;
    rig.moving = undefined;
    return rig;
  }
  function releaseStatusRig(rig) {
    root.remove(rig.g);
    for (const p of Object.values(rig.parts)) p.visible = false;
    if (rigPool.length < RIG_POOL_CAP) rigPool.push(rig);
    else releaseTree(rig.g); // shared geometry and glyph textures are kept
  }
  const liveStatus = (e, k, tick) => {
    const s = e.status && e.status[k];
    return s && s.untilTick > tick && (k !== 'shield' || s.mag > 1e-6) ? s : null;
  };

  // ------------------------------------------------------------ Quiet Hearth --
  const QH = SKILLS.quiet_hearth;
  const qhGroup = new Group();
  const qhRing = new Mesh(sharedGeo('cfx-qh-ring', () => new RingGeometry(QH.area * 0.94, QH.area, 56)), additive(BONE, 0.32));
  qhRing.rotation.x = -Math.PI / 2;
  qhRing.position.y = 0.03;
  const qhDome = new Mesh(domeGeo, additive(BONE, 0.05, { side: DoubleSide }));
  qhDome.scale.set(QH.area, QH.area * 0.55, QH.area);
  const qhHeal = new Mesh(sharedGeo('cfx-qh-disc', () => new CircleGeometry(QH.area, 40)), additive(HEAL, 0.05));
  qhHeal.rotation.x = -Math.PI / 2;
  qhHeal.position.y = 0.024;
  qhGroup.add(qhRing, qhDome, qhHeal);
  qhGroup.visible = false;
  root.add(qhGroup);
  let qhPulse = 0;
  let qhMote = 0;

  // -------------------------------------------------------- Rootsnare zones --
  const zoneRigs = new Map();
  function makeRootRig(radius) {
    const g = new Group();
    // fix-CAMPAIGN-r6 (GC.6): UNIT shapes scaled to the zone's radius — a
    // radius-keyed cache minted 3 new GL geometries for every new Rootsnare
    // radius a build reached (Reach stacks), so memory grew with the builds.
    const ink = new Mesh(sharedGeo('cfx-root-ink:unit', () => new RingGeometry(0.9, 1.03, 48)), flat(INK, 0.6));
    ink.rotation.x = -Math.PI / 2;
    ink.position.y = 0.012;
    ink.scale.set(radius, radius, 1);
    const rim = new Mesh(sharedGeo('cfx-root-rim:unit', () => new RingGeometry(0.93, 1, 48)), flat(BLUE, 0.85));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.016;
    rim.scale.set(radius, radius, 1);
    rim.name = 'rim';
    const fill = new Mesh(sharedGeo('cfx-root-fill:unit', () => new CircleGeometry(1, 40)), additive(AMBER, 0.06));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.01;
    fill.scale.set(radius, radius, 1);
    fill.name = 'fill';
    g.add(ink, rim, fill);
    // Root strands: dark tendrils with a parchment edge, radial from the centre.
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + cosmetic.range(-0.2, 0.2);
      const len = radius * cosmetic.range(0.55, 0.95);
      const strand = new Mesh(streakGeo, flat(INK, 0.75, { side: DoubleSide }));
      strand.scale.set(len, 0.07, 1);
      strand.rotation.x = -Math.PI / 2;
      strand.rotation.z = -a;
      strand.position.set(Math.cos(a) * len * 0.5, 0.018, Math.sin(a) * len * 0.5);
      const edge = new Mesh(streakGeo, additive(PARCH, 0.3, { side: DoubleSide }));
      edge.scale.set(len * 0.9, 0.025, 1);
      edge.rotation.x = -Math.PI / 2;
      edge.rotation.z = -a;
      edge.position.set(Math.cos(a) * len * 0.5, 0.021, Math.sin(a) * len * 0.5);
      g.add(strand, edge);
    }
    return { g, radius, pulse: 0, mote: 0 };
  }

  // -------------------------------------------------------- Mending Tide wedge --
  const MT = SKILLS.mending_tide;
  const tideHalf = (MT.area * Math.PI) / 180;
  const wedges = [];
  const wedgePool = [];
  function spawnTide(x, z, dirX, dirZ) {
    let g = wedgePool.pop();
    if (!g) {
      g = new Group();
      // fix-CAMPAIGN-r6 (GC.6): the wedge's shapes are constants — shared, so
      // a pool that reaches a new high-water mark adds no GL geometry.
      const fill = new Mesh(sharedGeo('cfx-tide-fill', () => new CircleGeometry(MT.range, 30, -tideHalf, tideHalf * 2)), additive(HEAL, 0.28));
      fill.rotation.x = -Math.PI / 2;
      fill.name = 'fill';
      const rim = new Mesh(sharedGeo('cfx-tide-rim', () => new RingGeometry(MT.range * 0.9, MT.range, 30, 1, -tideHalf, tideHalf * 2)), additive(HEAL, 0.8));
      rim.rotation.x = -Math.PI / 2;
      rim.name = 'rim';
      const crest = new Mesh(sharedGeo('cfx-tide-crest', () => new CylinderGeometry(MT.range, MT.range, 0.5, 30, 1, true, -tideHalf, tideHalf * 2)), additive(HEAL, 0.35, { side: DoubleSide }));
      crest.position.y = 0.25;
      crest.name = 'crest';
      g.add(fill, rim, crest);
    }
    const yaw = Math.atan2(dirZ, dirX);
    g.position.set(x, 0.03, z);
    g.getObjectByName('fill').rotation.z = -yaw;
    g.getObjectByName('rim').rotation.z = -yaw;
    g.getObjectByName('crest').rotation.y = Math.PI / 2 - yaw;
    root.add(g);
    wedges.push({ g, age: 0, life: 0.4 });
    for (let i = 0; i < 10; i++) {
      const a = yaw + cosmetic.range(-tideHalf, tideHalf);
      const r = cosmetic.range(0.3, MT.range);
      spawnMotes(x + Math.cos(a) * r, z + Math.sin(a) * r, { color: HEAL, count: 1, spread: 0.05 });
    }
  }

  // ---------------------------------------------------------- Pale Lance --
  const lances = new Map(); // bolt id -> { g }
  function makeLance() {
    const g = new Group();
    const core = new Mesh(streakGeo, additive(PARCH, 0.9, { side: DoubleSide, depthTest: false }));
    core.scale.set(1.0, 0.07, 1);
    core.rotation.x = -Math.PI / 2;
    core.position.set(-0.5, 0.55, 0);
    core.renderOrder = 7;
    const glow = new Mesh(streakGeo, additive(AMBER, 0.35, { side: DoubleSide, depthTest: false }));
    glow.scale.set(1.3, 0.24, 1);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(-0.65, 0.54, 0);
    glow.renderOrder = 6;
    g.add(glow, core);
    return { g };
  }

  // ----------------------------------------------------------- bus wiring --
  bus.on('skill_cast', (ev) => {
    const p = player();
    if (!p) return;
    const def = SKILLS[ev.skill];
    if (!def) return;
    if (ev.skill === 'bell_toll') {
      // Core: a hard Bone shockwave; glow: amber flash; particles: parchment
      // sparks thrown out to the rim; plus the bell glyph over the caster.
      spawnRing(p.x, p.z, { color: BONE, from: 0.2, to: def.area, life: 0.45, opacity: 0.95, width: 0.12 });
      spawnRing(p.x, p.z, { color: AMBER, from: 0.3, to: def.area * 1.1, life: 0.6, opacity: 0.45, width: 0.4 });
      spawnFlash(p.x, 0.6, p.z, { color: AMBER, size: 0.9, opacity: 0.75, life: 0.3, grow: 0.8 });
      spawnFlash(p.x, 0.6, p.z, { color: PARCH, size: 0.4, opacity: 0.95, life: 0.18, grow: 0.3 });
      spawnGlyph('bell', p.x, p.z, { size: 0.55, y: 1.45, life: 0.7 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        spawnMotes(p.x + Math.cos(a) * def.area * 0.8, p.z + Math.sin(a) * def.area * 0.8, { color: PARCH, count: 1, spread: 0.05, vyMin: 0.2, vyMax: 0.6 });
      }
    } else if (ev.skill === 'mending_tide') {
      spawnTide(p.x, p.z, ev.dx ?? 1, ev.dz ?? 0);
      spawnFlash(p.x, 0.45, p.z, { color: HEAL, size: 0.45, opacity: 0.8, life: 0.22, grow: 0.3 });
    } else if (ev.skill === 'hearthsong') {
      // (skillfx draws the green nova ring) — the haste half: amber streaks
      // bursting outward + an amber glow.
      spawnRing(p.x, p.z, { color: AMBER, from: 0.4, to: def.area, life: 0.5, opacity: 0.5, width: 0.08 });
      spawnFlash(p.x, 0.7, p.z, { color: AMBER, size: 0.7, opacity: 0.5, life: 0.3, grow: 0.6 });
      spawnMotes(p.x, p.z, { color: AMBER, count: 12, spread: def.area * 0.6, vyMin: 0.8, vyMax: 1.6 });
    } else if (ev.skill === 'lantern_flurry') {
      spawnFlash(p.x, 0.55, p.z, { color: AMBER, size: 0.6, opacity: 0.7, life: 0.2, grow: 0.5 });
      spawnMotes(p.x, p.z, { color: AMBER, count: 6, spread: 0.2, vyMin: 0.4, vyMax: 0.9 });
    } else if (ev.skill === 'pale_lance') {
      spawnFlash(p.x, 0.55, p.z, { color: PARCH, size: 0.55, opacity: 0.85, life: 0.18, grow: 0.4 });
    } else if (ev.skill === 'kindred_shield') {
      for (const id of ev.targets ?? []) {
        const t = byId(id);
        if (!t) continue;
        spawnGlyph('hex', t.x, t.z, { size: 0.9, y: 0.65, life: 0.55, rise: 0.15 });
        spawnMotes(t.x, t.z, { color: PARCH, count: 8, spread: 0.3 });
      }
    }
    if (ev.resonance) {
      spawnGlyph('res', p.x, p.z, { size: 0.7, y: 1.5, life: 0.8 });
      spawnRing(p.x, p.z, { color: AMBER, from: 0.3, to: 1.0, life: 0.45, opacity: 0.7, width: 0.1 });
    }
  });
  bus.on('skill_bolt_pierce', (ev) => {
    spawnFlash(ev.x, 0.55, ev.z, { color: PARCH, size: 0.35, opacity: 0.95, life: 0.16, grow: 0.3 });
    spawnFlash(ev.x, 0.55, ev.z, { color: AMBER, size: 0.7, opacity: 0.6, life: 0.26, grow: 0.5 });
    spawnMotes(ev.x, ev.z, { color: AMBER, count: 5, y: 0.45, vyMin: 0.3, vyMax: 0.7, life: [0.25, 0.45] });
  });
  bus.on('zone_tick', (ev) => {
    const rig = zoneRigs.get(ev.id);
    if (rig) {
      rig.pulse = 0.35;
      spawnRing(rig.g.position.x, rig.g.position.z, { color: BLUE, from: 0.3, to: rig.radius, life: 0.35, opacity: 0.6, width: 0.08 });
      spawnMotes(rig.g.position.x, rig.g.position.z, { color: AMBER, count: 5, spread: rig.radius * 0.8, vyMin: 0.2, vyMax: 0.5 });
      return;
    }
    if (ev.skill === 'dewfall') {
      // Dewfall's third layer: drops falling INTO the green zone.
      const z = byId(ev.id);
      if (z) spawnMotes(z.x, z.z, { color: HEAL, count: 10, y: 1.4, spread: z.radius * 0.85, vyMin: 1.2, vyMax: 2.0, fall: true, life: [0.5, 0.7] });
    }
  });
  bus.on('aura_pulse', (ev) => {
    if (ev.skill !== 'quiet_hearth') return;
    qhPulse = 0.45;
    const p = player();
    if (p) spawnRing(p.x, p.z, { color: BONE, from: 0.3, to: QH.area, life: 0.45, opacity: 0.55, width: 0.08 });
  });
  bus.on('split_shard', (ev) => {
    const col = ev.mode === 'heal' ? HEAL : AMBER;
    spawnFlash(ev.x, 0.55, ev.z, { color: col, size: 0.5, opacity: 0.8, life: 0.22, grow: 0.5 });
    spawnMotes(ev.x, ev.z, { color: col, count: 6, y: 0.45, spread: 0.2, vyMin: 0.3, vyMax: 0.8 });
    if (ev.mode === 'heal') {
      for (const id of ev.targets ?? []) {
        const t = byId(id);
        if (t) spawnRing(t.x, t.z, { color: HEAL, from: 0.2, to: 0.6, life: 0.3, opacity: 0.6, width: 0.12 });
      }
    }
  });
  bus.on('technique_pulse', (ev) => {
    const col = ev.node === 'snare' ? BLUE : ev.node === 'bulwark' ? PARCH : AMBER;
    for (const id of ev.targets ?? []) {
      const t = byId(id);
      if (t) spawnFlash(t.x, 0.6, t.z, { color: col, size: 0.45, opacity: 0.55, life: 0.25, grow: 0.4 });
    }
  });
  bus.on('shield_absorb', (ev) => {
    spawnAbsorb(ev.x, ev.z, ev.absorbed);
    spawnFlash(ev.x, 0.6, ev.z, { color: PARCH, size: 0.7, opacity: 0.5, life: 0.2, grow: 0.3 });
  });
  bus.on('status_apply', (ev) => {
    if (ev.status === 'stun') {
      spawnRing(ev.x, ev.z, { color: BONE, from: 0.2, to: 0.7, life: 0.3, opacity: 0.8, width: 0.16 });
    } else if (ev.status === 'haste') {
      spawnMotes(ev.x, ev.z, { color: AMBER, count: 5, spread: 0.25, vyMin: 0.5, vyMax: 1.0 });
    } else if (ev.status === 'slow') {
      spawnRing(ev.x, ev.z, { color: BLUE, from: 0.9, to: 0.45, life: 0.3, opacity: 0.7, width: 0.12 });
    }
  });

  // ---------------------------------------------------------------- warm-up --
  let warmFrames = 0;
  let warmed = false;
  function prewarm() {
    warmed = true;
    const rig = makeStatusRig();
    for (const p of Object.values(rig.parts)) p.visible = true;
    warmPark(root, rig.g);
    warmPark(root, makeRootRig(SKILLS.rootsnare.area).g);
    warmPark(root, makeLance().g);
    warmPark(root, glyphSprite('bell', 0.5));
    warmPark(root, glyphSprite('res', 0.5));
  }

  // ----------------------------------------------------------------- update --
  let lastT = null;
  function update(tSec, alpha = 1) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;
    if (!warmed && ++warmFrames > 14) prewarm();
    const tick = world.tick ?? 0;
    const p = player();

    // Status rigs.
    const seen = new Set();
    for (const e of world.entities()) {
      if (!e.status || !(e.hp > 0)) continue;
      const kinds = ['slow', 'stun', 'shield', 'haste', 'ward', 'exposed', 'inspired'];
      let any = false;
      for (const k of kinds) if (liveStatus(e, k, tick)) any = true;
      if (!any) continue;
      seen.add(e.id);
      let rig = statusRigs.get(e.id);
      if (!rig) {
        rig = acquireStatusRig();
        statusRigs.set(e.id, rig);
        root.add(rig.g);
      }
      const pos = lerpPos(e, alpha);
      if (rig.lastX !== null) {
        const mx = pos.x - rig.lastX;
        const mz = pos.z - rig.lastZ;
        const l = Math.hypot(mx, mz);
        if (l > 1e-4) {
          rig.dirX = mx / l;
          rig.dirZ = mz / l;
        }
        rig.moving = l > 1e-4;
      }
      rig.lastX = pos.x;
      rig.lastZ = pos.z;
      rig.g.position.set(pos.x, 0, pos.z);
      const scale = e.kind === 'stag' || e.boss === true ? 2.2 : e.radius ? Math.max(0.8, e.radius / 0.3) : 1;
      const P = rig.parts;
      const slow = !!liveStatus(e, 'slow', tick);
      P.slow.visible = P.slowInk.visible = P.slowGlow.visible = slow;
      if (slow) {
        const r = 0.56 * scale + 0.03 * Math.sin(tSec * 5 + e.id);
        P.slow.scale.set(r, r, 1);
        P.slowInk.scale.set(r * 1.1, r * 1.1, 1);
      }
      const exposed = !!liveStatus(e, 'exposed', tick);
      P.exposed.visible = P.exposedGlyph.visible = exposed;
      if (exposed) P.exposed.rotation.z = tSec * 0.8;
      const stun = !!liveStatus(e, 'stun', tick);
      P.stun.visible = P.stunGlow.visible = stun;
      if (stun) {
        P.stun.position.y = 1.2 * scale + 0.05 * Math.sin(tSec * 7);
        P.stun.material.rotation = tSec * 3.2;
        P.stunGlow.position.y = P.stun.position.y;
      }
      const sh = liveStatus(e, 'shield', tick);
      P.shell.visible = P.hex.visible = P.shieldGlow.visible = !!sh;
      if (sh) {
        const k = Math.min(1, sh.mag / 20);
        // below the bloom threshold even where two shells overlap
        P.shell.material.uniforms.uOpacity.value = 0.16 + 0.18 * k + 0.03 * Math.sin(tSec * 4 + e.id);
        P.shell.scale.set(0.52 * scale, 0.66 * scale, 0.52 * scale);
        P.shell.position.y = 0.5 * scale;
        P.hex.material.opacity = 0.3 + 0.25 * k;
        P.hex.rotation.z = tSec * 0.6;
        P.hex.scale.set(1.7 * scale, 1.7 * scale, 1);
      }
      const ward = !!liveStatus(e, 'ward', tick);
      P.ward.visible = P.wardRim.visible = ward;
      if (ward) P.ward.material.uniforms.uOpacity.value = 0.17 + 0.05 * Math.sin(tSec * 2.4 + e.id);
      const insp = !!liveStatus(e, 'inspired', tick);
      P.inspired.visible = P.inspiredGlow.visible = insp;
      if (insp) P.inspired.position.y = 1.45 + 0.06 * Math.sin(tSec * 4 + e.id);
      const haste = !!liveStatus(e, 'haste', tick);
      P.haste.visible = haste && rig.moving !== false;
      if (haste) {
        P.haste.rotation.y = Math.atan2(-rig.dirZ, rig.dirX);
        const k = 0.5 + 0.5 * Math.sin(tSec * 14 + e.id);
        for (const st of P.haste.children) st.material.opacity = 0.35 + 0.35 * k;
        if (rig.moving && cosmetic.float() < 0.25) spawnMotes(pos.x - rig.dirX * 0.3, pos.z - rig.dirZ * 0.3, { color: AMBER, count: 1, spread: 0.1, vyMin: 0.1, vyMax: 0.3, life: [0.2, 0.35] });
      }
    }
    for (const [id, rig] of statusRigs) {
      if (!seen.has(id)) {
        releaseStatusRig(rig);
        statusRigs.delete(id);
      }
    }

    // Quiet Hearth field rides the Healer while it is owned.
    const owned = world.skillSlots().some((s) => s && s.id === 'quiet_hearth');
    qhGroup.visible = owned && !!p;
    if (qhGroup.visible) {
      const pos = lerpPos(p, alpha);
      qhGroup.position.set(pos.x, 0, pos.z);
      qhPulse = Math.max(0, qhPulse - dt);
      const f = qhPulse / 0.45;
      qhRing.material.opacity = 0.26 + 0.4 * f + 0.05 * Math.sin(tSec * 2.2);
      qhDome.material.opacity = 0.04 + 0.08 * f;
      qhHeal.material.opacity = 0.04 + 0.08 * f;
      qhMote += dt;
      if (qhMote > 0.45) {
        qhMote = 0;
        spawnMotes(pos.x, pos.z, { color: BONE, count: 1, spread: QH.area * 0.8, vyMin: 0.2, vyMax: 0.5 });
      }
    }

    // Rootsnare zones (damage zones).
    const zseen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'zone' || !CONTENT_ZONE_SKILLS.has(e.skill)) continue;
      zseen.add(e.id);
      let rig = zoneRigs.get(e.id);
      if (!rig) {
        rig = makeRootRig(e.radius);
        rig.g.position.set(e.x, 0, e.z);
        zoneRigs.set(e.id, rig);
        root.add(rig.g);
      }
      rig.pulse = Math.max(0, rig.pulse - dt);
      const rim = rig.g.getObjectByName('rim');
      rim.material.opacity = 0.7 + 0.25 * (rig.pulse / 0.35) + 0.05 * Math.sin(tSec * 3 + e.id);
      rig.g.getObjectByName('fill').material.opacity = 0.05 + 0.08 * (rig.pulse / 0.35);
      rig.mote += dt;
      if (rig.mote > 0.3) {
        rig.mote = 0;
        spawnMotes(e.x + cosmetic.range(-rig.radius * 0.7, rig.radius * 0.7), e.z + cosmetic.range(-rig.radius * 0.7, rig.radius * 0.7), { color: AMBER, count: 1, spread: 0.05, vyMin: 0.15, vyMax: 0.4 });
      }
    }
    for (const [id, rig] of zoneRigs) {
      if (!zseen.has(id)) {
        root.remove(rig.g);
        releaseTree(rig.g); // fix-CAMPAIGN-r6: its materials are its own (geometry is shared)
        zoneRigs.delete(id);
      }
    }

    // Pale Lance streaks ride their bolts.
    const lseen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'skillbolt' || e.skill !== 'pale_lance' || e.tech) continue;
      lseen.add(e.id);
      let rig = lances.get(e.id);
      if (!rig) {
        rig = makeLance();
        lances.set(e.id, rig);
        root.add(rig.g);
      }
      const pos = lerpPos(e, alpha);
      rig.g.position.set(pos.x, 0, pos.z);
      rig.g.rotation.y = Math.atan2(-e.vz, e.vx);
    }
    for (const [id, rig] of lances) {
      if (!lseen.has(id)) {
        root.remove(rig.g);
        releaseTree(rig.g); // fix-CAMPAIGN-r6: its materials are its own (geometry is shared)
        lances.delete(id);
      }
    }

    // Pools.
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      if (m.age >= m.life || m.s.position.y < 0.02) {
        root.remove(m.s);
        motePool.push(m.s);
        motes.splice(i, 1);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.y += m.vy * dt;
      m.s.position.z += m.vz * dt;
      m.s.material.opacity = 0.9 * (1 - m.age / m.life);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age >= f.life) {
        root.remove(f.s);
        flashPool.push(f.s);
        flashes.splice(i, 1);
        continue;
      }
      const t = f.age / f.life;
      const sz = f.size * (1 + f.grow * t);
      f.s.scale.set(sz, sz, 1);
      f.s.material.opacity = f.opacity * (1 - t);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        root.remove(r.m);
        ringPool.get(r.m.userData.key)?.push(r.m);
        rings.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      const s = r.from + (r.to - r.from) * (1 - (1 - t) * (1 - t));
      r.m.scale.set(s, s, 1);
      const tail = t <= r.hold ? 1 : 1 - (t - r.hold) / (1 - r.hold);
      r.m.material.opacity = r.opacity * tail;
    }
    for (let i = glyphs.length - 1; i >= 0; i--) {
      const g = glyphs[i];
      g.age += dt;
      if (g.age >= g.life) {
        root.remove(g.s);
        g.s.material.dispose();
        glyphs.splice(i, 1);
        continue;
      }
      const t = g.age / g.life;
      g.s.position.y += g.rise * dt;
      g.s.material.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.age += dt;
      if (n.age >= n.life) {
        root.remove(n.rec.s);
        numPool.push(n.rec);
        nums.splice(i, 1);
        continue;
      }
      const t = n.age / n.life;
      n.rec.s.position.y += 0.45 * dt;
      n.rec.s.material.opacity = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    }
    for (let i = wedges.length - 1; i >= 0; i--) {
      const w = wedges[i];
      w.age += dt;
      if (w.age >= w.life) {
        root.remove(w.g);
        wedgePool.push(w.g);
        wedges.splice(i, 1);
        continue;
      }
      const t = w.age / w.life;
      const tail = t <= 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      w.g.getObjectByName('fill').material.opacity = 0.28 * tail;
      w.g.getObjectByName('rim').material.opacity = 0.8 * tail;
      const cr = w.g.getObjectByName('crest');
      cr.material.opacity = 0.35 * Math.pow(tail, 1.3);
      cr.scale.y = 0.6 + 0.8 * t;
      const s = 1 + 0.15 * t;
      w.g.scale.set(s, 1, s);
    }
  }

  function debugCounts() {
    const status = {};
    for (const [id, rig] of statusRigs) {
      status[id] = Object.entries(rig.parts)
        .filter(([, p]) => p.visible)
        .map(([k]) => k);
    }
    return {
      motes: motes.length,
      flashes: flashes.length,
      rings: rings.length,
      glyphs: glyphs.length,
      absorbNumerals: nums.length,
      wedges: wedges.length,
      rootZones: zoneRigs.size,
      lances: lances.size,
      quietHearth: qhGroup.visible,
      statusRigs: statusRigs.size,
      status,
      // fix-CAMPAIGN-r6: idle pooled objects (bounded) — the GC.6 probe reads them
      pooled: { statusRigs: rigPool.length, motes: motePool.length, flashes: flashPool.length, numerals: numPool.length, wedges: wedgePool.length },
    };
  }

  // @gnt:M2 RESTORE-RESYNC begin — a load replaces the registry: the status
  // shells, damage-zone rigs and lance streaks are keyed by entity id, so
  // they are dropped (exactly as the reconcile drops an unseen id) and
  // update() rebuilds what the restored sim holds.
  function dropEntityRigs() {
    for (const rig of statusRigs.values()) releaseStatusRig(rig);
    statusRigs.clear();
    for (const rig of zoneRigs.values()) {
      root.remove(rig.g);
      releaseTree(rig.g);
    }
    zoneRigs.clear();
    for (const rig of lances.values()) {
      root.remove(rig.g);
      releaseTree(rig.g);
    }
    lances.clear();
  }
  bus.on('state_restored', dropEntityRigs);
  // @gnt:M2 RESTORE-RESYNC end
  // fix-CAMPAIGN-r6 (CR6-F2, PLAN §12.5 teardown): a level boundary returns
  // everything this layer holds for the level — entity rigs, in-flight motes /
  // flashes / rings / glyphs / numerals / tide wedges back to their pools — and
  // the pooled "(n)" numerals give their canvas textures back to the GPU (the
  // record is kept; three re-uploads it on its next use), so the GL texture
  // count at a level's first frame never carries the last level's high-water.
  function levelTeardown() {
    dropEntityRigs();
    for (const m of motes.splice(0)) {
      root.remove(m.s);
      motePool.push(m.s);
    }
    for (const f of flashes.splice(0)) {
      root.remove(f.s);
      flashPool.push(f.s);
    }
    for (const r of rings.splice(0)) {
      root.remove(r.m);
      ringPool.get(r.m.userData.key)?.push(r.m);
    }
    for (const g of glyphs.splice(0)) {
      root.remove(g.s);
      g.s.material.dispose();
    }
    for (const n of nums.splice(0)) {
      root.remove(n.rec.s);
      numPool.push(n.rec);
    }
    for (const rec of numPool) rec.tex.dispose();
    for (const w of wedges.splice(0)) {
      root.remove(w.g);
      wedgePool.push(w.g);
    }
    qhPulse = 0;
  }
  bus.on('level_transit', levelTeardown);
  bus.on('run_end', levelTeardown);
  bus.on('return_to_camp', levelTeardown);
  return { update, debugCounts };
}
