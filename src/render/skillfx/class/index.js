// Class-skill VFX (BUILD_BRIEF §25.2 / §25.3, PLAN §16.11). Owner: PARTY.
// The render side of the 12 new class skills, the class passives, the class
// techniques and the taunt status, on the §19.4 layering contract: every
// effect is >= 3 layers (a hard core, a soft glow, particles) and reads by
// SHAPE as well as colour.
//
// Colour law (§19.1 / §25.2, binding): player-side damage = parchment-white
// core + Hearth Amber glow; stun = Bone ring (skillfx/content.js draws the
// status glyphs); slow = Signal Blue ink ring (content.js); shield = the
// Parchment hex rim + pale shell (content.js) — THIS layer adds the flying
// Warm Grey plate glyph of Shield Wall and the Iron Stance hex field; a
// class's accent appears only as a thin trim or ring, never a fill. Never
// Ember (enemy threats only), never violet, never Bright Heal (no ally skill
// heals).
//
// Pieces (all event- or state-driven, render-only):
//   taunt        "!" plate above every enemy with a live taunt + a 0.3 s
//                parchment tether to the taunter when applied
//   roar         parchment shockwave ring + a thin Tank-accent inner band
//   shield wall  a Warm Grey plate glyph flies Tank → each recipient (0.25 s)
//   iron stance  a faint Warm Grey hex ring at 1.3 u riding the Tank while
//                equipped; a pulse flickers it
//   dash / vault / hop  a Bone dust / parchment speed-line trail along the path
//   crescent     1-3 parchment bands by combo stack; combo pips over the fox
//   riposte      a crossed-blades glyph over the fox while its parry is open;
//                a spark + the counter arc on a block
//   razor wake   3 parchment blade glints orbiting the fox at 0.9 u
//   pinning      a Bone stake glyph on the pinned target
//   rain         falling parchment streaks inside the zone's translucent blob
//   kestrel      a small kestrel glyph circling the hare; a streak per pulse
//   techniques   Provoke / Brace / Tremor / Anchor / Retaliate / Aegis / Flow /
//                Scatter pulses: a small glyph flash at the body they touched
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE, CLASS_ACCENTS } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { warmPark } from '../../warmup.js';

const AMBER = PALETTE.hearthAmber;
const PARCH = PALETTE.parchment;
const BONE = PALETTE.bone;
const GREY = PALETTE.warmGrey;
const INK = PALETTE.voidCharcoal;
const MOTE_CAP = 200;

function add(color, opacity) {
  return new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
}
function flat(color, opacity) {
  return new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, depthWrite: false });
}

// ------------------------------------------------------------ glyph atlas --
const glyphs = new Map();
function glyphTexture(id) {
  if (glyphs.has(id)) return glyphs.get(id);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const inked = (col, w) => {
    g.strokeStyle = INK;
    g.lineWidth = w + 8;
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  };
  if (id === 'taunt') {
    // A Parchment "!" plate (shape channel — never Ember).
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(34, 14, 60, 100, 16);
    g.fill();
    g.strokeStyle = PARCH;
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = PARCH;
    g.fillRect(56, 30, 16, 50);
    g.beginPath();
    g.arc(64, 96, 9, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'plate') {
    // Shield Wall's Warm Grey plate.
    g.beginPath();
    g.moveTo(30, 22);
    g.lineTo(98, 22);
    g.lineTo(98, 72);
    g.quadraticCurveTo(98, 100, 64, 112);
    g.quadraticCurveTo(30, 100, 30, 72);
    g.closePath();
    g.fillStyle = GREY;
    g.fill();
    inked(PARCH, 5);
  } else if (id === 'blades') {
    // Riposte: crossed blades.
    g.beginPath();
    g.moveTo(26, 102);
    g.lineTo(102, 26);
    inked(PARCH, 8);
    g.beginPath();
    g.moveTo(26, 26);
    g.lineTo(102, 102);
    inked(PARCH, 8);
    g.beginPath();
    g.moveTo(16, 88);
    g.lineTo(40, 112);
    inked(BONE, 6);
    g.beginPath();
    g.moveTo(88, 112);
    g.lineTo(112, 88);
    inked(BONE, 6);
  } else if (id === 'stake') {
    // Pinning Arrow: a Bone stake.
    g.beginPath();
    g.moveTo(64, 14);
    g.lineTo(64, 96);
    inked(BONE, 9);
    g.beginPath();
    g.moveTo(44, 96);
    g.lineTo(64, 118);
    g.lineTo(84, 96);
    g.closePath();
    g.fillStyle = BONE;
    g.fill();
    g.beginPath();
    g.moveTo(50, 26);
    g.lineTo(64, 14);
    g.lineTo(78, 26);
    inked(PARCH, 5);
  } else if (id === 'kestrel') {
    // A small kestrel silhouette (Parchment body, Bone wing tips).
    g.beginPath();
    g.moveTo(12, 64);
    g.quadraticCurveTo(40, 44, 58, 58);
    g.lineTo(64, 40);
    g.lineTo(70, 58);
    g.quadraticCurveTo(88, 44, 116, 64);
    g.quadraticCurveTo(88, 62, 72, 70);
    g.lineTo(64, 100);
    g.lineTo(56, 70);
    g.quadraticCurveTo(40, 62, 12, 64);
    g.closePath();
    g.fillStyle = PARCH;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.stroke();
  } else if (id === 'pip') {
    g.beginPath();
    g.moveTo(64, 20);
    g.lineTo(100, 64);
    g.lineTo(64, 108);
    g.lineTo(28, 64);
    g.closePath();
    g.fillStyle = PARCH;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.stroke();
  } else if (id === 'hexring') {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = 64 + Math.cos(a) * 56;
      const y = 64 + Math.sin(a) * 56;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokeStyle = GREY;
    g.lineWidth = 5;
    g.stroke();
  } else if (id === 'streak') {
    const grd = g.createLinearGradient(64, 0, 64, 128);
    grd.addColorStop(0, 'rgba(244,239,230,0)');
    grd.addColorStop(1, 'rgba(244,239,230,1)');
    g.fillStyle = grd;
    g.fillRect(58, 0, 12, 128);
  } else if (id === 'spark') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12);
      g.lineTo(64 + Math.cos(a) * (i % 2 ? 40 : 58), 64 + Math.sin(a) * (i % 2 ? 40 : 58));
      g.strokeStyle = PARCH;
      g.lineWidth = 7;
      g.stroke();
    }
  } else {
    // A generic technique rune: a ringed dot.
    g.beginPath();
    g.arc(64, 64, 40, 0, Math.PI * 2);
    inked(PARCH, 6);
    g.beginPath();
    g.arc(64, 64, 12, 0, Math.PI * 2);
    g.fillStyle = AMBER;
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  glyphs.set(id, t);
  return t;
}
function glyphSprite(id, size, opacity = 1) {
  const s = new Sprite(new SpriteMaterial({ map: glyphTexture(id), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity }));
  s.scale.set(size, size, 1);
  s.renderOrder = 23;
  return s;
}

export function createClassFx({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'skillfx-class';
  stage.scene.add(root);
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const seatBody = (seat) => {
    for (const e of world.entities()) if (e.kind === 'ally' && e.partyIndex === seat) return e;
    return null;
  };
  const lerp = (e, a) => ({ x: e.px !== undefined ? e.px + (e.x - e.px) * a : e.x, z: e.pz !== undefined ? e.pz + (e.z - e.pz) * a : e.z });
  const P = () => (typeof world.partySystem === 'function' ? world.partySystem() : null);
  const owns = (seat, id) => {
    const p = P();
    const s = p ? p.slots(seat) : null;
    return !!(s && s.includes(id));
  };

  // ----------------------------------------------------------- primitives --
  const live = []; // { obj, age, life, step(k, obj), done() }
  function track(obj, life, step) {
    root.add(obj);
    live.push({ obj, age: 0, life, step });
  }
  const motes = [];
  const motePool = [];
  function spawnMotes(x, z, { color = PARCH, count = 6, y = 0.3, spread = 0.35, vy = [0.4, 1.1], life = [0.35, 0.7], size = [0.05, 0.12], dir = null } = {}) {
    for (let i = 0; i < count; i++) {
      if (motes.length >= MOTE_CAP) break;
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      const sz = cosmetic.range(size[0], size[1]);
      s.scale.set(sz, sz, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y + cosmetic.range(0, 0.15), z + Math.sin(a) * r);
      root.add(s);
      const d = dir ?? { x: cosmetic.range(-0.2, 0.2), z: cosmetic.range(-0.2, 0.2) };
      motes.push({ s, age: 0, life: cosmetic.range(life[0], life[1]), vy: cosmetic.range(vy[0], vy[1]), vx: d.x, vz: d.z, sz });
    }
  }
  function flash(x, y, z, { color = PARCH, size = 0.5, opacity = 0.9, life = 0.28, grow = 0.5 } = {}) {
    const s = makeGlowSprite({ color, size, opacity });
    s.position.set(x, y, z);
    track(s, life, (k, o) => {
      o.material.opacity = opacity * (1 - k);
      const sc = size * (1 + grow * k);
      o.scale.set(sc, sc, 1);
    });
  }
  function ring(x, z, { from = 0.2, to = 1.2, life = 0.36, opacity = 0.8, color = PARCH, width = 0.07 } = {}) {
    const m = new Mesh(new RingGeometry(0.8, 1, 48), add(color, opacity));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.05, z);
    track(m, life, (k, o) => {
      const r = from + (to - from) * (1 - (1 - k) * (1 - k));
      o.scale.set(r, r, 1);
      o.material.opacity = opacity * (1 - k);
      void width;
    });
  }
  function glyphPop(id, x, y, z, { size = 0.5, life = 0.5, rise = 0.25 } = {}) {
    const s = glyphSprite(id, size);
    s.position.set(x, y, z);
    track(s, life, (k, o) => {
      o.position.y = y + rise * k;
      o.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    });
  }
  function line(x0, z0, x1, z1, { color = PARCH, width = 0.06, life = 0.3, opacity = 0.9, y = 0.5 } = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 1e-3) return;
    const m = new Mesh(new PlaneGeometry(1, 1), add(color, opacity));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.scale.set(len, width, 1);
    track(m, life, (k, o) => {
      o.material.opacity = opacity * (1 - k);
    });
  }

  // ---------------------------------------------------------- persistent --
  // Taunt plates (one per taunted enemy), the Iron Stance hex field, the
  // Razor Wake glints, the Kestrel glyph, the parry blades, combo pips.
  const tauntPlates = new Map(); // enemy id -> sprite
  const stanceMesh = new Mesh(new CircleGeometry(1.3, 36), flat(GREY, 0.06));
  stanceMesh.rotation.x = -Math.PI / 2;
  const stance = new Group();
  stance.add(stanceMesh);
  const stanceRim = new Mesh(new RingGeometry(1.24, 1.3, 6), add(GREY, 0.5));
  stanceRim.rotation.x = -Math.PI / 2;
  stanceRim.rotation.z = Math.PI / 6;
  stance.add(stanceRim);
  stance.visible = false;
  root.add(stance);
  let stanceFlick = 0;
  const glints = [0, 1, 2].map(() => {
    const s = makeGlowSprite({ color: PARCH, size: 0.14, opacity: 0.95 });
    s.visible = false;
    root.add(s);
    return s;
  });
  const glintCores = [0, 1, 2].map(() => {
    const m = new Mesh(new PlaneGeometry(0.16, 0.05), add(PARCH, 0.9));
    m.visible = false;
    root.add(m);
    return m;
  });
  const kestrel = glyphSprite('kestrel', 0.34);
  kestrel.visible = false;
  root.add(kestrel);
  const blades = glyphSprite('blades', 0.46);
  blades.visible = false;
  root.add(blades);
  const pips = [0, 1].map(() => {
    const s = glyphSprite('pip', 0.16);
    s.visible = false;
    root.add(s);
    return s;
  });

  // ------------------------------------------------------------ bus wiring --
  bus.on('ally_cast', (ev) => {
    const acc = CLASS_ACCENTS[ev.classId] ?? GREY;
    switch (ev.skill) {
      case 'taunting_roar': {
        ring(ev.x, ev.z, { from: 0.3, to: ev.radius ?? 2, life: 0.45, opacity: 0.9, color: PARCH });
        ring(ev.x, ev.z, { from: 0.2, to: (ev.radius ?? 2) * 0.8, life: 0.4, opacity: 0.6, color: acc });
        flash(ev.x, 0.6, ev.z, { color: AMBER, size: 0.9, opacity: 0.5, life: 0.35 });
        spawnMotes(ev.x, ev.z, { count: 12, spread: 1.2, color: BONE });
        break;
      }
      case 'shield_wall': {
        const a = byId(ev.id);
        for (const tid of ev.targets || []) {
          const t = byId(tid);
          if (!a || !t) continue;
          const s = glyphSprite('plate', 0.36);
          const x0 = a.x;
          const z0 = a.z;
          track(s, 0.3, (k, o) => {
            const tt = byId(tid) || t;
            o.position.set(x0 + (tt.x - x0) * k, 0.9 + Math.sin(k * Math.PI) * 0.4, z0 + (tt.z - z0) * k);
            o.material.opacity = k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15;
          });
          flash(t.x, 0.6, t.z, { color: PARCH, size: 0.6, opacity: 0.55, life: 0.4 });
          spawnMotes(t.x, t.z, { count: 6, spread: 0.3, color: BONE });
        }
        break;
      }
      case 'crescent_finisher': {
        const bands = 1 + Math.min(2, ev.combo || 0);
        for (let b = 0; b < bands; b++) {
          const m = new Mesh(new RingGeometry(0.55 + b * 0.18, 0.62 + b * 0.18, 32, 1, -((ev.halfAngle ?? 70) * Math.PI) / 180, ((ev.halfAngle ?? 70) * Math.PI * 2) / 180), add(PARCH, 0.85 - b * 0.15));
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = -Math.atan2(ev.dz, ev.dx);
          m.position.set(ev.x, 0.4 + b * 0.02, ev.z);
          track(m, 0.32 + b * 0.05, (k, o) => {
            o.material.opacity = (0.85 - b * 0.15) * (1 - k);
            const sc = 1 + 0.5 * k;
            o.scale.set(sc, sc, 1);
          });
        }
        flash(ev.x + ev.dx * 0.6, 0.5, ev.z + ev.dz * 0.6, { color: AMBER, size: 0.7, opacity: 0.5 });
        spawnMotes(ev.x + ev.dx * 0.6, ev.z + ev.dz * 0.6, { count: 8, spread: 0.5 });
        break;
      }
      case 'vault_shot':
      case 'pinning_arrow': {
        flash(ev.x, 0.55, ev.z, { color: PARCH, size: 0.5, opacity: 0.7, life: 0.22 });
        spawnMotes(ev.x, ev.z, { count: 6, spread: 0.2, color: BONE, dir: { x: -ev.dx * 0.6, z: -ev.dz * 0.6 } });
        break;
      }
      case 'rain_of_arrows': {
        ring(ev.zx ?? ev.x, ev.zz ?? ev.z, { from: 0.4, to: ev.radius ?? 1.4, life: 0.4, opacity: 0.7, color: BONE });
        break;
      }
      default:
        break;
    }
    if (ev.dash || ev.vault) spawnMotes(ev.x, ev.z, { count: 8, spread: 0.3, color: PARCH });
  });
  bus.on('ally_dash', (ev) => {
    const col = ev.cause === 'vault' || ev.cause === 'disengage' ? BONE : PARCH;
    line(ev.x0, ev.z0, ev.x1, ev.z1, { color: col, width: 0.12, life: 0.35, opacity: 0.75, y: 0.3 });
    line(ev.x0, ev.z0, ev.x1, ev.z1, { color: AMBER, width: 0.3, life: 0.3, opacity: 0.25, y: 0.29 });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      spawnMotes(ev.x0 + (ev.x1 - ev.x0) * k, ev.z0 + (ev.z1 - ev.z0) * k, { count: 2, spread: 0.12, color: ev.cause === 'dash' ? BONE : PARCH, y: 0.12, vy: [0.2, 0.6] });
    }
    if (ev.cause === 'vault' || ev.cause === 'disengage') spawnMotes(ev.x0, ev.z0, { count: 8, spread: 0.25, color: BONE, vy: [0.8, 1.4] });
  });
  bus.on('parry_counter', (ev) => {
    const a = byId(ev.id);
    const t = byId(ev.attackerId);
    const x = a ? a.x : ev.x;
    const z = a ? a.z : ev.z;
    glyphPop('spark', x + (ev.dx ?? 0) * 0.4, 0.7, z + (ev.dz ?? 0) * 0.4, { size: 0.55, life: 0.3, rise: 0.05 });
    flash(x, 0.7, z, { color: AMBER, size: 0.7, opacity: 0.6, life: 0.3 });
    if (t) line(x, z, t.x, t.z, { color: PARCH, width: 0.08, life: 0.25, opacity: 0.9, y: 0.5 });
  });
  bus.on('hit_blocked', (ev) => {
    if (!ev.parry) return;
    const t = byId(ev.targetId);
    if (t) spawnMotes(t.x, t.z, { count: 10, spread: 0.25, color: PARCH, y: 0.6 });
  });
  bus.on('aura_pulse', (ev) => {
    if (ev.seat === undefined) return;
    if (ev.skill === 'iron_stance') {
      stanceFlick = 0.4;
      for (const id of ev.shielded || []) {
        const m = byId(id);
        if (m) flash(m.x, 0.6, m.z, { color: PARCH, size: 0.4, opacity: 0.4, life: 0.3 });
      }
      spawnMotes(ev.x, ev.z, { count: 5, spread: 1.1, color: GREY });
    } else if (ev.skill === 'razor_wake') {
      for (const id of ev.hit || []) {
        const e = byId(id);
        if (e) {
          glyphPop('spark', e.x, 0.55, e.z, { size: 0.36, life: 0.22, rise: 0 });
          spawnMotes(e.x, e.z, { count: 3, spread: 0.1 });
        }
      }
    } else if (ev.skill === 'kestrel_watch') {
      for (const id of ev.hit || []) {
        const e = byId(id);
        if (e) {
          line(ev.x, ev.z, e.x, e.z, { color: PARCH, width: 0.05, life: 0.22, opacity: 0.95, y: 1.1 });
          flash(e.x, 0.6, e.z, { color: AMBER, size: 0.45, opacity: 0.55, life: 0.22 });
          spawnMotes(e.x, e.z, { count: 4, spread: 0.12 });
        }
      }
    }
  });
  bus.on('status_apply', (ev) => {
    if (ev.status !== 'taunt') return;
    const e = byId(ev.id);
    const src = ev.src != null ? byId(ev.src) : null;
    if (e && src) line(src.x, src.z, e.x, e.z, { color: PARCH, width: 0.04, life: 0.3, opacity: 0.85, y: 0.8 });
  });
  bus.on('technique_pulse', (ev) => {
    if (ev.seat === undefined) return;
    const glyph = { provoke: 'taunt', tremor: 'spark', retaliate: 'spark', aegis: 'hexring', brace: 'plate', flow: 'pip' }[ev.node];
    if (!glyph) return;
    for (const id of ev.targets || []) {
      const e = byId(id);
      if (e) glyphPop(glyph, e.x, 1.0, e.z, { size: 0.3, life: 0.4, rise: 0.2 });
    }
    if (ev.node === 'flow') {
      const a = seatBody(ev.seat);
      if (a) spawnMotes(a.x, a.z, { count: 6, spread: 0.25, color: AMBER });
    }
  });
  bus.on('scatter_burst', (ev) => {
    flash(ev.x, 0.5, ev.z, { color: AMBER, size: 0.5, opacity: 0.6, life: 0.25 });
    spawnMotes(ev.x, ev.z, { count: 6, spread: 0.2 });
  });
  bus.on('skill_bolt_despawn', (ev) => {
    if (ev.skill !== 'pinning_arrow' || ev.cause !== 'impact') return;
    glyphPop('stake', ev.x, 0.8, ev.z, { size: 0.42, life: 0.6, rise: -0.15 });
  });

  // ---------------------------------------------------------------- frame --
  let last = null;
  function update(tSec, alpha = 1) {
    const dt = last === null ? 1 / 60 : Math.max(0, Math.min(0.1, tSec - last));
    last = tSec;
    // One-shots.
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i];
      f.age += dt;
      const k = Math.min(1, f.age / f.life);
      f.step(k, f.obj);
      if (k >= 1) {
        root.remove(f.obj);
        if (f.obj.geometry) f.obj.geometry.dispose();
        if (f.obj.material) f.obj.material.dispose();
        live.splice(i, 1);
      }
    }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      const k = m.age / m.life;
      if (k >= 1) {
        root.remove(m.s);
        motePool.push(m.s);
        motes.splice(i, 1);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.z += m.vz * dt;
      m.s.position.y += m.vy * dt;
      m.s.material.opacity = 0.9 * (1 - k);
    }
    // Taunt plates follow every live taunt.
    const seen = new Set();
    const tick = world.tick;
    for (const e of world.entities()) {
      const t = e.status && e.status.taunt;
      if (!t || !(t.untilTick > tick) || !(e.hp > 0)) continue;
      seen.add(e.id);
      let s = tauntPlates.get(e.id);
      if (!s) {
        s = glyphSprite('taunt', 0.3);
        root.add(s);
        tauntPlates.set(e.id, s);
      }
      const p = lerp(e, alpha);
      s.position.set(p.x, 1.25 + Math.sin(tSec * 6) * 0.03, p.z);
    }
    for (const [id, s] of tauntPlates) {
      if (seen.has(id)) continue;
      root.remove(s);
      s.material.dispose();
      tauntPlates.delete(id);
    }
    // Iron Stance: riding the Tank while equipped.
    const tank = seatBody(1);
    const hasStance = !!(tank && tank.hp > 0 && owns(1, 'iron_stance'));
    stance.visible = hasStance;
    if (hasStance) {
      const p = lerp(tank, alpha);
      stance.position.set(p.x, 0.035, p.z);
      stanceFlick = Math.max(0, stanceFlick - dt);
      stanceRim.material.opacity = 0.35 + 0.5 * (stanceFlick / 0.4);
      stanceMesh.material.opacity = 0.05 + 0.08 * (stanceFlick / 0.4);
    }
    // Razor Wake: 3 glints orbiting the fox.
    const fox = seatBody(2);
    const hasWake = !!(fox && fox.hp > 0 && owns(2, 'razor_wake'));
    for (let i = 0; i < 3; i++) {
      glints[i].visible = hasWake;
      glintCores[i].visible = hasWake;
      if (!hasWake) continue;
      const p = lerp(fox, alpha);
      const a = tSec * 3.2 + (i * Math.PI * 2) / 3;
      glints[i].position.set(p.x + Math.cos(a) * 0.9, 0.45, p.z + Math.sin(a) * 0.9);
      glintCores[i].position.copy(glints[i].position);
      glintCores[i].rotation.set(-Math.PI / 2, 0, -a);
    }
    // Riposte / Parry node: crossed blades while the fox's parry is open.
    const parryOpen = !!(fox && fox.guard && fox.guard.parry && fox.guard.active && fox.guard.untilTick > tick);
    blades.visible = parryOpen;
    if (parryOpen) {
      const p = lerp(fox, alpha);
      blades.position.set(p.x, 1.2 + Math.sin(tSec * 10) * 0.03, p.z);
    }
    // Combo pips while a combo window is open (the fox holds the finisher).
    let combo = 0;
    const P2 = P();
    const st = P2 ? P2.seatState(2) : null;
    if (fox && st && st.combo && owns(2, 'crescent_finisher')) {
      for (const [sid, t] of Object.entries(st.combo)) if (sid !== 'crescent_finisher' && tick - t <= 120) combo += 1;
    }
    combo = Math.min(2, combo);
    for (let i = 0; i < 2; i++) {
      pips[i].visible = !!fox && i < combo;
      if (pips[i].visible) {
        const p = lerp(fox, alpha);
        pips[i].position.set(p.x - 0.1 + i * 0.2, 1.05, p.z);
      }
    }
    // Kestrel Watch: a small kestrel circling the hare.
    const hare = seatBody(3);
    const hasKestrel = !!(hare && hare.hp > 0 && owns(3, 'kestrel_watch'));
    kestrel.visible = hasKestrel;
    if (hasKestrel) {
      const p = lerp(hare, alpha);
      const a = tSec * 1.6;
      kestrel.position.set(p.x + Math.cos(a) * 0.7, 1.45 + Math.sin(tSec * 3) * 0.06, p.z + Math.sin(a) * 0.7);
    }
    // Rain of Arrows: falling parchment streaks inside each live zone.
    for (const z of world.entities()) {
      if (z.kind !== 'azone' || z.skill !== 'rain_of_arrows') continue;
      if (cosmetic.float() < dt * 26) {
        const a = cosmetic.range(0, Math.PI * 2);
        const r = Math.sqrt(cosmetic.float()) * z.radius;
        const s = glyphSprite('streak', 0.5, 0.9);
        s.material.depthTest = true;
        const x = z.x + Math.cos(a) * r;
        const zz = z.z + Math.sin(a) * r;
        s.position.set(x, 1.8, zz);
        track(s, 0.3, (k, o) => {
          o.position.y = 1.8 - 1.6 * k;
          o.material.opacity = 0.9 * (1 - k * 0.5);
        });
      }
    }
  }

  // Program warm-up: park one of each material under the loading card so the
  // first cast of a class skill links nothing mid-fight (GI.6).
  for (const id of ['taunt', 'plate', 'blades', 'stake', 'kestrel', 'pip', 'hexring', 'streak', 'spark']) warmPark(root, glyphSprite(id, 0.1));
  warmPark(root, new Mesh(new RingGeometry(0.8, 1, 48), add(PARCH, 0.5)));
  warmPark(root, new Mesh(new PlaneGeometry(1, 1), add(PARCH, 0.5)));

  function debugCounts() {
    return { live: live.length, motes: motes.length, taunts: tauntPlates.size, stance: stance.visible, wake: glints[0].visible, kestrel: kestrel.visible, parry: blades.visible };
  }
  return { update, debugCounts };
}
