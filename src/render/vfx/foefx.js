// Foe templates (VFX rework PR 2; docs/gauntlet/design-VFX.md §11): Kesh's
// three templates on the enemies, champions and bosses. Every enemy attack
// already has its telegraph (the Ember shape on the floor) and its own
// matter beats in signature.js; this layer adds the template's finish on top
// at the moments that matter:
//
//   the wind-up    a small template gather on the body (the floor shape
//                  stays the enemy layer's and unchanged)
//   the strike     when the telegraph resolves, its shape fills with the
//                  template: a ring bursts, a cone slashes, a lane streaks
//   the shot       a shot leaving a body flashes, and sheds as it flies
//   the hit        an enemy blow landing on the party
//   the fall       a champion's fall and a boss's death end in a big burst
//
// Colours: data/vfx.js vfxFoeTone (palette.js VFX_FOE): Foe Crimson fire and
// spell light (Ember stays the floor shapes'), Violet for corrupted casters,
// magenta-first neon for machines; never Bright Heal. Size scales by weight:
// a champion plays half again as big, a boss twice (vfxFoeWeight).
//
// Render-only: reads sim entities and events, never writes either; all
// randomness from the COSMETIC stream.
import { vfxFoeTone, vfxFoeWeight, FOE_TEMPLATE } from '../../data/vfx.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export function createFoeFx({ kit, tk, bus, byId, spray, after, camfx, rnd, mark, ink, player }) {
  // Beats played per foe kind (probes: __echoes.content.vfx().foe).
  const byKind = new Map();
  let cur = null; // the kind whose beat is playing
  const fire = (name) => {
    mark(`tpl:foe_${name}`);
    if (!cur) return;
    const row = byKind.get(cur) ?? {};
    const beat = name.replace(/^(blade|magic|scifi)_/, '');
    row[beat] = (row[beat] ?? 0) + 1;
    byKind.set(cur, row);
  };
  const as = (kind, fn) => {
    cur = kind;
    try {
      fn();
    } finally {
      cur = null;
    }
  };
  // The live telegraph of each body, captured as it starts (the sim clears
  // it before the resolve event fires).
  const tells = new Map();
  const shotKind = new Map(); // glob entity id -> its thrower's kind (its landing is the thrower's strike)
  const kindOf = (e) => (e ? (e.telegraph && e.telegraph.champion) || e.kind : null);
  const isFoe = (k) => k != null && Object.prototype.hasOwnProperty.call(FOE_TEMPLATE, k);

  // ----------------------------------------------------------- wind-up --
  function gather(tp, e, w) {
    fire('gather');
    const y = 0.5 * w;
    if (tp.id === 'blade') {
      tk.sparks(e.x, y, e.z, Math.round(5 * w), { color: tp.a, color2: tp.core, radius: 0.9 * w, speed: [-3, -1.5], up: [0, 0.4], life: [0.16, 0.28], gravity: 0, len: 0.04 });
    } else if (tp.id === 'scifi') {
      tk.dust(e.x, y, e.z, Math.round(6 * w), { tex: 'square', color: tp.a, color2: tp.b, radius: 0.9 * w, speed: [-2.4, -1.2], up: [0, 0.3], size: [0.04, 0.07], life: [0.2, 0.3], gravity: 0, drag: 0, twinkle: 40 });
    } else {
      tk.dust(e.x, y, e.z, Math.round(7 * w), { color: tp.b, color2: tp.a, radius: 1.0 * w, speed: [-2.6, -1.4], up: [0.1, 0.5], size: [0.04, 0.08], life: [0.18, 0.28], gravity: 0, drag: 0, twinkle: 30 });
      if (w > 1) tk.circle({ x: e.x, z: e.z, radius: 0.7 * w, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.6, spin: -1.6, opacity: 0.55 });
    }
  }

  // ------------------------------------------------------------ strikes --
  // A ring (a slam, a stomp, a burst round a spot).
  function strikeRing(tp, x, z, r, w) {
    fire(`${tp.id}_ring`);
    if (tp.id === 'blade') {
      tk.blaze({ x, z, ring: true, radius: r, width: 0.26 * w, life: 0.4, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.12, lift: 0.22, gain: 1.25 });
      tk.blast({ x, y: 0.5, z, size: (0.7 + r * 0.45) * Math.sqrt(w), mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.4 });
      tk.sparks(x, 0.4, z, Math.round(8 * w), { color: tp.a, color2: tp.core, radius: r * 0.4, speed: [2, 5], up: [1, 3], life: [0.22, 0.42], len: 0.045 });
      if (w > 1) tk.blaze({ x, z, ring: true, radius: r * 1.1, width: 0.2, life: 0.55, grow: 0.4, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.08, lift: 0.06, delay: 0.05 });
    } else if (tp.id === 'scifi') {
      tk.circle({ x, z, radius: r, face: 'hex', outer: tp.a, inner: tp.b, life: 0.55, spin: 1.8, opacity: 0.85 });
      tk.blast({ x, y: 0.5, z, size: (0.8 + r * 0.4) * Math.sqrt(w), mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.35 });
      tk.dust(x, 0.2, z, Math.round(10 * w), { tex: 'square', color: tp.a, color2: tp.b, radius: r * 0.8, speed: [0, 0.2], up: [0.6, 1.4], size: [0.05, 0.08], life: [0.5, 0.9], gravity: 0, drag: 0.6, twinkle: 40 });
    } else {
      tk.circle({ x, z, radius: r, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.6, spin: -1.8, opacity: 0.85 });
      tk.blast({ x, y: 0.5, z, size: (0.8 + r * 0.4) * Math.sqrt(w), mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.36 });
      if (w > 1) tk.beam({ x, z, height: 2.6 * w, width: 0.4 * w, core: tp.core, glow: tp.a, life: 0.45 });
      tk.dust(x, 0.2, z, Math.round(10 * w), { color: tp.b, color2: tp.a, radius: r * 0.8, speed: [0.2, 0.8], up: [0.6, 1.5], size: [0.04, 0.09], life: [0.6, 1.1], gravity: -0.1, drag: 1.4 });
    }
    kit.light({ x, z, radius: r * 1.6, color: tp.a, opacity: 0.4, life: 0.35, attack: 0.03 });
    if (w >= 2) camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.02, 0.1);
  }
  // A cone (a swipe, a breath, a bite, a screech).
  function strikeCone(tp, x, z, angle, reach, half, w) {
    fire(`${tp.id}_cone`);
    const tipX = x + Math.cos(angle) * reach * 0.8;
    const tipZ = z + Math.sin(angle) * reach * 0.8;
    if (tp.id === 'blade') {
      tk.blaze({ x, z, angle, radius: reach * 0.9, width: 0.45 * w, span: half * 2.05, sweep: 0.07, life: 0.34, reverse: rnd(0, 1) < 0.5, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.45, lift: 0.2, tail: 0.95, gain: 1.3 });
      tk.blaze({ x, z, angle, radius: reach * 0.75, width: 0.3 * w, span: half * 1.8, sweep: 0.03, life: 0.42, grow: 0.9, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.4, lift: 0.06, taper: 0.9, tail: 1, delay: 0.05, opacity: 0.7 });
      tk.sparks(tipX, 0.5, tipZ, Math.round(7 * w), { color: tp.a, color2: tp.core, dir: { x: Math.cos(angle), z: Math.sin(angle) }, dirBias: 0.7, spread: 0.8, speed: [2.5, 5.5], up: [0.5, 2], life: [0.18, 0.34], len: 0.05 });
      tk.blast({ x: tipX, y: 0.5, z: tipZ, size: 0.6 * Math.sqrt(w), mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.26, delay: 0.05 });
    } else if (tp.id === 'scifi') {
      for (const k of [-0.7, 0, 0.7]) {
        const a = angle + k * half;
        laser(tp, x, z, x + Math.cos(a) * reach, z + Math.sin(a) * reach, { y: 0.5, width: 0.07 * w, mute: k !== 0 });
      }
    } else {
      tk.blaze({ x, z, angle, radius: reach * 0.85, width: 0.5 * w, span: half * 2, sweep: 0.05, life: 0.42, grow: 0.5, mode: 'wave', core: tp.core, a: tp.a, b: tp.b, y: 0.42, lift: 0.08, tail: 1, gain: 1.3 });
      tk.dust(x, 0.45, z, Math.round(12 * w), { color: tp.b, color2: tp.a, radius: 0.2, speed: [1.2, reach * 2], up: [0, 0.5], size: [0.04, 0.08], life: [0.35, 0.6], gravity: 0, drag: 1.6, dir: { x: Math.cos(angle), z: Math.sin(angle) }, dirBias: 0.85 });
      tk.blast({ x: tipX, y: 0.5, z: tipZ, size: 0.7 * Math.sqrt(w), mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.28, delay: 0.06 });
    }
    kit.light({ x: tipX, z: tipZ, radius: reach * 1.2, color: tp.a, opacity: 0.35, life: 0.3 });
  }
  // A lane (a charge, a lunge, a lance, a sweep down a line).
  function strikeLane(tp, x0, z0, x1, z1, width, w) {
    fire(`${tp.id}_lane`);
    if (tp.id === 'scifi') {
      laser(tp, x0, z0, x1, z1, { y: 0.5, width: 0.09 * w });
      return;
    }
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    if (tp.id === 'blade') {
      kit.streak({ a: { x: x0, y: 0.35, z: z0 }, b: { x: x1, y: 0.4, z: z1 }, width: Math.max(0.3, width * 0.6) * Math.sqrt(w), tailW: 0.3, core: tp.core, glow: tp.a, life: 0.34, fall: 1.1, opacity: 0.8 });
      const n = Math.min(8, Math.ceil(L * 1.6));
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        tk.sparks(x0 + dx * k, 0.25, z0 + dz * k, 2, { color: tp.a, color2: tp.core, speed: [1, 3], up: [0.8, 2], life: [0.2, 0.36], delay: k * 0.12, len: 0.04 });
      }
      tk.blast({ x: x1, y: 0.5, z: z1, size: 0.8 * Math.sqrt(w), mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.32, delay: 0.06 });
    } else {
      kit.streak({ a: { x: x0, y: 0.45, z: z0 }, b: { x: x1, y: 0.45, z: z1 }, width: Math.max(0.25, width * 0.5) * Math.sqrt(w), tailW: 1, core: tp.core, glow: tp.a, life: 0.36, fall: 0.3, opacity: 0.85 });
      const n = Math.max(2, Math.min(4, Math.round(L / 1.6)));
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        tk.beam({ x: x0 + dx * k, z: z0 + dz * k, height: 1.6 * w, width: 0.28 * w, core: tp.core, glow: tp.a, life: 0.36, delay: k * 0.1, opacity: 0.7 });
      }
      tk.dust(x1, 0.4, z1, Math.round(8 * w), { color: tp.b, color2: tp.a, radius: 0.3, speed: [0.3, 1], up: [0.5, 1.3], size: [0.04, 0.08], life: [0.5, 0.9], gravity: -0.1, drag: 1.5 });
    }
    kit.light({ x: x1, z: z1, radius: 1.4 * w, color: tp.a, opacity: 0.35, life: 0.3 });
  }
  function laser(tp, x0, z0, x1, z1, { y = 0.55, width = 0.09, mute = false } = {}) {
    if (!mute) fire('scifi_laser');
    kit.streak({ a: { x: x0, y, z: z0 }, b: { x: x1, y, z: z1 }, width, tailW: 1, core: tp.core, glow: tp.a, life: 0.3, fall: 0.2, opacity: 1 });
    kit.streak({ a: { x: x0, y, z: z0 }, b: { x: x1, y, z: z1 }, width: width * 3.2, tailW: 1, core: tp.a, glow: tp.b, life: 0.36, fall: 0.2, opacity: 0.5 });
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 3; i++) {
      const k0 = rnd(0, 0.7);
      const k1 = Math.min(1, k0 + rnd(0.1, 0.3));
      const o = rnd(-0.12, 0.12);
      kit.streak({ a: { x: x0 + dx * k0 - (dz / L) * o, y, z: z0 + dz * k0 + (dx / L) * o }, b: { x: x0 + dx * k1 - (dz / L) * o, y, z: z0 + dz * k1 + (dx / L) * o }, width: 0.04, tailW: 1, core: tp.core, glow: i % 2 ? tp.a : tp.b, life: 0.1, delay: rnd(0, 0.18), fall: 0.1 });
    }
    if (!mute) tk.blast({ x: x1, y, z: z1, size: 0.9, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.3 });
  }
  function strike(e, rec) {
    const kind = rec.foe;
    const tp = vfxFoeTone(kind);
    const w = vfxFoeWeight(kind);
    const shape = rec.kind ?? rec.shape ?? 'ring';
    const ox = rec.fromX ?? e?.x ?? rec.x;
    const oz = rec.fromZ ?? e?.z ?? rec.z;
    if (shape === 'cone') {
      const dx = rec.dirX ?? rec.x - ox;
      const dz = rec.dirZ ?? rec.z - oz;
      const reach = rec.length ?? rec.radius ?? (Math.hypot(rec.x - ox, rec.z - oz) || 1.6);
      strikeCone(tp, ox, oz, Math.atan2(dz, dx), reach, (rec.halfAngleDeg ?? 45) * DEG, w);
    } else if (shape === 'lane') {
      const dl = Math.hypot(rec.dirX ?? 0, rec.dirZ ?? 0);
      let x1 = rec.x;
      let z1 = rec.z;
      if (rec.length && dl > 1e-4) {
        x1 = ox + (rec.dirX / dl) * rec.length;
        z1 = oz + (rec.dirZ / dl) * rec.length;
      }
      strikeLane(tp, ox, oz, x1, z1, rec.width ?? 0.8, w);
    } else {
      strikeRing(tp, rec.x, rec.z, Math.min(4, rec.radius ?? 1.1 * w), w);
    }
  }

  // ----------------------------------------------------- shots and hits --
  function shot(tp, x, z, dx, dz, w) {
    fire(`${tp.id}_shot`);
    const l = Math.hypot(dx, dz) || 1;
    const mx = x + (dx / l) * 0.35;
    const mz = z + (dz / l) * 0.35;
    const mode = tp.id === 'blade' ? 'fire' : tp.id === 'scifi' ? 'holo' : 'celestial';
    tk.blast({ x: mx, y: 0.55, z: mz, size: 0.55 * Math.sqrt(w), mode, core: tp.core, a: tp.a, b: tp.id === 'blade' ? tp.deep : tp.b, life: 0.2 });
    if (tp.id === 'magic') tk.circle({ x: mx, y: 0.55, z: mz, radius: 0.38 * Math.sqrt(w), face: 'arcane', outer: tp.a, inner: tp.b, life: 0.3, spin: 3, stand: Math.atan2(dz, dx), opacity: 0.8 });
    else tk.sparks(mx, 0.55, mz, 4, { color: tp.a, color2: tp.core, dir: { x: dx / l, z: dz / l }, dirBias: 0.9, spread: 0.3, speed: [3, 6], up: [-0.2, 0.4], life: [0.1, 0.2], len: 0.05 });
  }
  function hitParty(tp, x, z, dx, dz, w) {
    fire(`${tp.id}_hit`);
    const dir = Math.hypot(dx, dz) > 1e-4 ? { x: dx, z: dz } : null;
    if (tp.id === 'blade') {
      tk.sparks(x, 0.5, z, Math.round(5 * w), { color: tp.a, color2: tp.core, dir, dirBias: dir ? 0.7 : 0, spread: 0.8, speed: [2, 4.5], up: [0.5, 1.8], life: [0.14, 0.3], len: 0.045 });
      tk.blast({ x, y: 0.5, z, size: 0.45 * Math.sqrt(w), mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.22 });
    } else if (tp.id === 'scifi') {
      tk.blast({ x, y: 0.5, z, size: 0.55 * Math.sqrt(w), mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.24 });
    } else {
      tk.blast({ x, y: 0.5, z, size: 0.5 * Math.sqrt(w), mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.22 });
      tk.dust(x, 0.5, z, 4, { color: tp.b, color2: tp.a, radius: 0.12, speed: [0.4, 1.1], up: [0.2, 0.9], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 0.2, drag: 1.8 });
    }
  }
  // A champion's fall or a boss's death: its template's biggest burst.
  function fall(tp, x, z, w) {
    fire(`${tp.id}_fall`);
    const r = 1.4 * w;
    if (tp.id === 'blade') {
      tk.circle({ x, z, radius: r, face: 'sun', outer: tp.b, inner: tp.core, life: 1.0, spin: 2, opacity: 0.8 });
      tk.blast({ x, y: 0.7, z, size: 1.6 * w, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.6 });
      tk.blaze({ x, z, ring: true, radius: r, width: 0.4, life: 0.6, grow: 0.6, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.1, lift: 0.06, delay: 0.05 });
      tk.sparks(x, 0.6, z, 30, { color: tp.a, color2: tp.core, speed: [3, 7], up: [1.5, 4], life: [0.3, 0.6], len: 0.05 });
      spray('smoke', x, 0.4, z, 4, { color: tp.smoke ?? ink, speed: [0.4, 1], up: [0.4, 1], size: [0.5, 0.8], grow: 1.6, life: [0.9, 1.4], opacity: 0.35, gravity: -0.3, drag: 2.2 });
    } else if (tp.id === 'scifi') {
      tk.circle({ x, z, radius: r, face: 'hex', outer: tp.a, inner: tp.b, life: 1.0, spin: 1.2 });
      tk.blast({ x, y: 0.7, z, size: 1.8 * w, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.6 });
      tk.beam({ x, z, height: 5, width: 0.7, core: tp.core, glow: tp.a, life: 0.7 });
      tk.dust(x, 0.3, z, 40, { tex: 'square', color: tp.a, color2: tp.b, radius: r * 0.8, speed: [0, 0.3], up: [0.8, 2], size: [0.05, 0.1], life: [0.9, 1.6], gravity: 0, drag: 0.5, twinkle: 40 });
    } else {
      tk.circle({ x, z, radius: r, face: 'arcane', outer: tp.a, inner: tp.b, life: 1.2, spin: -1.2 });
      tk.blast({ x, y: 0.7, z, size: 1.8 * w, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.6 });
      tk.beam({ x, z, height: 6, width: 0.9, core: tp.core, glow: tp.a, life: 0.8 });
      tk.dust(x, 0.3, z, 44, { color: tp.b, color2: tp.a, radius: r * 0.6, speed: [0.2, 0.8], up: [1, 2.4], size: [0.05, 0.11], life: [1, 1.8], gravity: -0.3, drag: 1.2, swirl: 2.4 });
    }
    kit.light({ x, z, radius: r * 2, color: tp.a, opacity: 0.6, life: 0.7, attack: 0.04 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.03, 0.14);
  }

  // A support's work (a mend, a ward, a tether): not a blow, but still the
  // enemy's magic, so it wears the foe tone (never Bright Heal).
  function ward(tp, x, z, r, w) {
    fire(`${tp.id}_ward`);
    tk.circle({ x, z, radius: r, face: tp.id === 'scifi' ? 'hex' : 'arcane', outer: tp.a, inner: tp.b, life: 0.8, spin: 1.2, opacity: 0.7 });
    tk.dust(x, 0.2, z, Math.round(10 * w), { tex: tp.id === 'scifi' ? 'square' : 'star', color: tp.b, color2: tp.a, radius: r * 0.8, speed: [0.05, 0.3], up: [0.6, 1.4], size: [0.04, 0.08], life: [0.6, 1.1], gravity: -0.1, drag: 1.4 });
    kit.light({ x, z, radius: r * 1.4, color: tp.a, opacity: 0.3, life: 0.5 });
  }
  function tether(tp, a, b) {
    fire(`${tp.id}_tether`);
    kit.streak({ a: { x: a.x, y: 0.6, z: a.z }, b: { x: b.x, y: 0.6, z: b.z }, width: 0.08, tailW: 1, core: tp.core, glow: tp.a, life: 0.4, fall: 0.2, opacity: 0.85 });
    tk.dust(b.x, 0.5, b.z, 6, { color: tp.b, color2: tp.a, radius: 0.2, speed: [0.1, 0.4], up: [0.3, 0.8], size: [0.04, 0.07], life: [0.5, 0.8], gravity: -0.1, drag: 1.5 });
  }
  const support = (ev, fn) => {
    const kind = kindOf(byId(ev.id));
    if (!isFoe(kind) || ev.x == null) return;
    as(kind, () => fn(vfxFoeTone(kind), vfxFoeWeight(kind)));
  };
  bus.on('snail_mend', (ev) => support(ev, (tp, w) => ward(tp, ev.x, ev.z, Math.min(3, ev.radius ?? 1.5), w)));
  bus.on('censer_mend', (ev) => support(ev, (tp, w) => ward(tp, ev.x, ev.z, Math.min(3, ev.radius ?? 1.5), w)));
  bus.on('sexton_bury', (ev) => support(ev, (tp, w) => ward(tp, ev.x, ev.z, Math.min(2, ev.radius ?? 0.9), w)));
  bus.on('sexton_snare_snap', (ev) => support(ev, (tp, w) => strikeRing(tp, ev.x, ev.z, Math.min(2, ev.radius ?? 0.9), w)));
  bus.on('wisp_tether', (ev) => {
    const e = byId(ev.id);
    support(ev, (tp) => e && tether(tp, e, ev));
  });

  // ----------------------------------------------------------- wiring --
  bus.on('telegraph_start', (ev) => {
    const e = byId(ev.id);
    if (!e) return;
    // A foe's own wind-up, or a lobbed glob's landing (its thrower's kind);
    // hazards and wards are not foes.
    const thrower = e.kind === 'eglob' && !e.affix ? kindOf(byId(e.ownerId)) ?? e.ownerKind : null;
    const kind = isFoe(kindOf(e)) ? kindOf(e) : shotKind.get(ev.id) ?? thrower;
    if (!isFoe(kind)) return;
    const rec = e.telegraph ? { ...e.telegraph } : { kind: ev.shape, x: ev.x, z: ev.z };
    // A shooter's aim (no shape): the shot it fires is its strike.
    rec.kind ??= ev.shape;
    if (rec.hush) return; // the Sacristan's hush is a ward, not a threat
    rec.foe = kind;
    if (rec.x == null) {
      rec.x = ev.x;
      rec.z = ev.z;
    }
    tells.set(ev.id, rec);
    if (kind === kindOf(e)) as(kind, () => gather(vfxFoeTone(kind), e, vfxFoeWeight(kind)));
  });
  bus.on('telegraph_cancel', (ev) => tells.delete(ev.id));
  bus.on('telegraph_resolve', (ev) => {
    const rec = tells.get(ev.id);
    tells.delete(ev.id);
    if (!rec || rec.x == null || !rec.kind) return;
    as(rec.foe, () => strike(byId(ev.id), rec));
  });
  // Shots: the muzzle (the flight itself is boltfx.js).
  bus.on('enemy_fire', (ev) => {
    const kind = kindOf(byId(ev.id));
    if (!isFoe(kind)) return;
    as(kind, () => shot(vfxFoeTone(kind), ev.x, ev.z, ev.dx ?? 1, ev.dz ?? 0, vfxFoeWeight(kind)));
  });
  bus.on('enemy_lob', (ev) => {
    const kind = kindOf(byId(ev.id));
    if (!isFoe(kind)) return;
    if (ev.glob != null) {
      if (shotKind.size > 64) shotKind.clear();
      shotKind.set(ev.glob, kind);
    }
    as(kind, () => shot(vfxFoeTone(kind), ev.x, ev.z, (ev.tx ?? ev.x + 1) - ev.x, (ev.tz ?? ev.z) - ev.z, vfxFoeWeight(kind)));
  });
  bus.on('hit', (ev) => {
    if (ev.x == null) return;
    const atk = byId(ev.attacker);
    if (!atk || atk.faction !== 'hostile') return;
    if (!(ev.kind === 'player' || ev.kind === 'ally')) return;
    const kind = kindOf(atk);
    if (!isFoe(kind)) return;
    as(kind, () => hitParty(vfxFoeTone(kind), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, vfxFoeWeight(kind)));
  });
  bus.on('champion_fall', (ev) => {
    if (ev.x == null) return;
    as(ev.champion, () => fall(vfxFoeTone(ev.champion), ev.x, ev.z, vfxFoeWeight(ev.champion)));
  });
  bus.on('death', (ev) => {
    if (ev.x == null || vfxFoeWeight(ev.kind) < 2) return;
    as(ev.kind, () => fall(vfxFoeTone(ev.kind), ev.x, ev.z, 2));
  });

  function teardown() {
    tells.clear();
    shotKind.clear();
  }
  // The lab: one strike of each shape for one foe kind, 0.8 s apart.
  function showcase(kind, at) {
    const tp = vfxFoeTone(kind);
    const w = vfxFoeWeight(kind);
    const p = player();
    const x = at?.x ?? (p ? p.x : 0);
    const z = at?.z ?? (p ? p.z - 2.6 : -2.6);
    strikeRing(tp, x, z - 1.5, 1.2, w);
    after(0.8, () => strikeCone(tp, x - 1.5, z, -Math.PI / 2, 2.2, Math.PI / 4, w));
    after(1.6, () => strikeLane(tp, x - 2, z + 1.2, x + 2, z + 1.2, 0.8, w));
    after(2.4, () => shot(tp, x, z, 1, 0, w));
    after(3.0, () => fall(tp, x, z - 1, w));
    return 5;
  }
  const counts = () => Object.fromEntries([...byKind].map(([k, v]) => [k, { ...v }]));
  return { teardown, showcase, counts };
}
