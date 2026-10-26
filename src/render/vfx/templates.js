// VFX templates (docs/gauntlet/design-VFX.md §11) — Kesh's 2026-10-19 VFX
// direction, played on top of every hero's class look:
//
//   MAGIC  "Magical spell VFX, celestial energy burst, glowing runes and
//          arcane circles, vibrant purple and gold particles, floating
//          stardust, ethereal light beams."
//   BLADE  "Epic sword slash VFX, blazing fiery trail, golden light energy
//          waves, sharp particle effects, motion blur, impactful explosion."
//   SCI-FI "Sci-fi laser beam VFX, holographic matrix particles, neon cyan
//          and magenta energy, digital glitch effects, sharp lines."
//
// Which template an effect plays is data (data/vfx.js CLASS_TEMPLATE and
// SKILL_TEMPLATE); the class layers in signature.js, tidefx.js, bellfx.js and
// duskfx.js still draw each hero's own shapes underneath (the Tank's cracks,
// the Tidecaller's water, the Bellwright's bells, the Duskwing's dark), so a
// hero is still told apart by shape first while every beat reaches the
// template's finish: a gather, a white-hot burst, light, particles that hang.
//
// Gameplay signals keep their own colours: enemy warnings stay Ember (the
// enemies' own template layer is foefx.js, in foe tones), heals keep Bright Heal (a magic heal
// swaps the purple for green and keeps the gold), and damage numbers are a
// separate layer drawn on top (render/numbers.js).
//
// Render-only: reads sim entities and events, never writes either; all
// randomness from the COSMETIC stream.
import { PALETTE } from '../../data/palette.js';
import { vfxTemplate, vfxTemplateFor, vfxSkillClass, VFX_HEAL_SKILLS } from '../../data/vfx.js';

const TAU = Math.PI * 2;
const HEAL = PALETTE.brightHeal;
const INK = PALETTE.voidCharcoal;
// Hero skills that restore (their magic plays green and gold).
const HEALS = VFX_HEAL_SKILLS;
// A magic hit's exit (VFX_HIT_RULES P1, v3), in u (1 bw ≈ 0.65 u): streaks
// from the far edge (0.5 bw past the centre), 0.45 to 0.65 bw long (speed ×
// len), living about 5 frames, within ±25° of the hit.
const MAGIC_EXIT = Object.freeze({ edge: 0.33, y: 0.55, out: 6, back: 3, speed: [4.5, 6.5], up: [-0.2, 0.4], life: [0.07, 0.1], len: 0.065, width: [0.03, 0.05], spread: 0.44 });

export function createTemplateFx({ kit, tk, bus, byId, spray, after, camfx, rnd, mark, player, classOf, area }) {
  const tpl = (classId, skill) => vfxTemplate(vfxTemplateFor(classId, skill));
  // A magic heal: Bright Heal takes the purple's place, the gold stays.
  const healTone = (tp) => ({ ...tp, a: HEAL, deep: '#2E7A45', heal: true });
  const toneFor = (classId, skill) => {
    const tp = tpl(classId, skill);
    return tp.id === 'magic' && HEALS.has(skill) ? healTone(tp) : tp;
  };
  const fire = (name) => mark(`tpl:${name}`);

  // ============================================================== MAGIC ==
  // The gather: stardust drawn in to the caster, a circle opening under it.
  function magicGather(tp, x, z, r) {
    tk.dust(x, 0.5, z, 10, { color: tp.b, color2: tp.a, radius: r * 1.4 + 0.4, speed: [-2.6, -1.6], up: [0.2, 0.6], size: [0.05, 0.09], life: [0.14, 0.22], gravity: 0, drag: 0, twinkle: 30 });
  }
  // A spell leaves the hand or lands around the caster: the arcane circle,
  // a celestial burst, a beam of light, stardust rising and swirling.
  function magicCast(tp, x, z, r, { big = true, beam = true } = {}) {
    fire('magic_cast');
    const R = Math.min(2.6, Math.max(0.75, r * 0.9));
    magicGather(tp, x, z, R);
    tk.circle({ x, z, radius: R, face: 'arcane', outer: tp.a, inner: tp.b, life: big ? 1.05 : 0.7, spin: 1.6, opacity: 0.95 });
    after(0.06, () => {
      tk.blast({ x, y: 0.75, z, size: 1.5 + R * 0.6, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.42 });
      if (beam) tk.beam({ x, z, height: 3.6, width: 0.55 + R * 0.2, core: tp.core, glow: tp.a, life: 0.55 });
      tk.dust(x, 0.35, z, big ? tp.dust.cast : 12, { color: tp.b, color2: tp.a, mix: 0.45, radius: R * 0.8, speed: [0.2, 0.9], up: [0.6, 1.6], size: [0.05, 0.11], life: [0.9, 1.6], gravity: -0.15, drag: 1.2, swirl: 2.2 });
      kit.ring({ x, z, r0: 0.2, r1: R * 1.25, width: 0.07, life: 0.4, core: tp.core, glow: tp.b, soft: 0.3, y: 0.06 });
      kit.light({ x, z, radius: R * 1.7, color: tp.a, opacity: 0.5, life: 0.55, attack: 0.05 });
    });
  }
  // A nova: the same, wider, with a second ring and beams round its edge.
  function magicNova(tp, x, z, r) {
    fire('magic_nova');
    magicCast(tp, x, z, r, { big: true });
    after(0.1, () => {
      kit.ring({ x, z, r0: 0.3, r1: r * 1.1, width: 0.12, life: 0.5, core: tp.core, glow: tp.a, soft: 0.4, y: 0.07 });
      const n = 4;
      const a0 = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU;
        tk.beam({ x: x + Math.cos(a) * r * 0.8, z: z + Math.sin(a) * r * 0.8, height: 2.4, width: 0.3, core: tp.core, glow: tp.b, life: 0.45, delay: i * 0.04, opacity: 0.7 });
      }
      tk.dust(x, 0.2, z, 18, { color: tp.b, color2: tp.a, radius: r, speed: [0.1, 0.5], up: [0.3, 1.0], size: [0.04, 0.09], life: [0.8, 1.4], gravity: -0.1, drag: 1.4 });
      camfx.dolly(x, z, 0.03, 0.25);
    });
  }
  // A spell placed at a spot: a beam strikes down out of the sky onto a
  // circle that opens there, a burst and a stardust fountain.
  function magicZone(tp, x, z, r) {
    fire('magic_zone');
    const R = Math.min(3, Math.max(0.7, r));
    tk.circle({ x, z, radius: R, face: 'arcane', outer: tp.a, inner: tp.b, life: 1.2, spin: 1.2, opacity: 0.9 });
    magicGather(tp, x, z, R * 0.8);
    tk.beam({ x, z, height: 5.5, width: 0.9 + R * 0.25, core: tp.core, glow: tp.a, life: 0.6 });
    after(0.07, () => {
      tk.blast({ x, y: 0.45, z, size: 1.4 + R * 0.7, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.45 });
      tk.dust(x, 0.2, z, tp.dust.cast, { color: tp.b, color2: tp.a, radius: R * 0.7, speed: [0.3, 1.2], up: [1.0, 2.2], size: [0.05, 0.11], life: [0.8, 1.4], gravity: 0.4, drag: 1.0 });
      kit.ring({ x, z, r0: 0.2, r1: R * 1.15, width: 0.1, life: 0.45, core: tp.core, glow: tp.b, soft: 0.3, y: 0.06 });
      kit.light({ x, z, radius: R * 1.8, color: tp.a, opacity: 0.55, life: 0.6, attack: 0.05 });
    });
  }
  // A spell leaves the hand: a small circle stands up in front of the
  // caster, a burst at its heart, stardust thrown down the aim.
  function magicRelease(tp, x, z, dx, dz, { count = 1, big = false } = {}) {
    fire('magic_release');
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l;
    const uz = dz / l;
    const mx = x + ux * 0.45;
    const mz = z + uz * 0.45;
    tk.circle({ x: mx, y: 0.6, z: mz, radius: big || count > 1 ? 0.62 : 0.46, face: 'arcane', outer: tp.a, inner: tp.b, life: big ? 0.5 : 0.36, spin: 3, stand: Math.atan2(uz, ux), opacity: 0.9 });
    tk.blast({ x: mx, y: 0.6, z: mz, size: big ? 1.2 : 0.8, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.26 });
    tk.dust(mx, 0.6, mz, big ? 10 : 5, { color: tp.b, color2: tp.a, radius: 0.12, speed: [0.6, 1.8], up: [-0.1, 0.4], size: [0.04, 0.08], life: [0.4, 0.8], gravity: 0, drag: 2.2, dir: { x: ux, z: uz }, dirBias: 0.7 });
  }
  // A magic hit lands: a celestial star, a puff of stardust; a crit adds a
  // flash of runes under the target and a short beam. (dx, dz) is the hit's
  // direction; with one, the spell leaves through the far side (P1, v3):
  // about 6 gold streaks out past the target's far edge within ±25°, 3 back
  // toward the caster, then the stardust leans along the hit.
  function magicImpact(tp, x, z, dx, dz, { crit = false, big = false } = {}) {
    fire('magic_hit');
    const l = Math.hypot(dx, dz);
    const dir = l > 1e-4 ? { x: dx / l, z: dz / l } : null;
    tk.blast({ x, y: 0.55, z, size: (big ? 1.15 : 0.85) * (crit ? 1.55 : 1), mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: crit ? 0.34 : 0.24 });
    if (dir) {
      const F = MAGIC_EXIT;
      const fx = x + dir.x * F.edge;
      const fz = z + dir.z * F.edge;
      tk.sparks(fx, F.y, fz, F.out + (crit ? 2 : 0), { color: tp.core, color2: tp.b, speed: F.speed, up: F.up, life: F.life, len: F.len, width: F.width, gravity: 1, drag: 2, dir, dirBias: 1, spread: F.spread, radius: 0.06 });
      tk.sparks(x - dir.x * F.edge * 0.6, F.y, z - dir.z * F.edge * 0.6, F.back, { color: tp.core, color2: tp.b, speed: F.speed, up: F.up, life: F.life, len: F.len, width: F.width, gravity: 1, drag: 2, dir: { x: -dir.x, z: -dir.z }, dirBias: 1, spread: F.spread, radius: 0.06 });
    }
    tk.dust(dir ? x + dir.x * MAGIC_EXIT.edge : x, 0.55, dir ? z + dir.z * MAGIC_EXIT.edge : z, tp.dust.hit + (crit ? 6 : 0), { color: tp.b, color2: tp.a, radius: 0.15, speed: [0.4, 1.3], up: [0.3, 1.1], size: [0.04, 0.08], life: [0.5, 0.9], gravity: 0.2, drag: 1.8, dir, dirBias: dir ? 0.6 : 0 });
    if (crit) {
      tk.circle({ x, z, radius: 0.7, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.5, spin: 3, opacity: 0.8 });
      tk.beam({ x, z, height: 2.2, width: 0.35, core: tp.core, glow: tp.a, life: 0.32 });
    }
  }
  // A spell's travel (dash, blink, hop): stardust laid down the path and a
  // circle where it ends.
  function magicDash(tp, x0, z0, x1, z1) {
    fire('magic_dash');
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      tk.dust(x0 + (x1 - x0) * k, 0.45, z0 + (z1 - z0) * k, 2, { color: tp.b, color2: tp.a, radius: 0.15, speed: [0.05, 0.3], up: [0.1, 0.6], size: [0.05, 0.1], life: [0.6, 1.1], gravity: -0.2, drag: 1.4, delay: k * 0.08 });
    }
    kit.streak({ a: { x: x0, y: 0.45, z: z0 }, b: { x: x1, y: 0.45, z: z1 }, width: 0.2, tailW: 0.3, core: tp.core, glow: tp.a, life: 0.32, fall: 1.2, opacity: 0.7 });
    tk.circle({ x: x1, z: z1, radius: 0.85, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.6, spin: 2.4 });
    tk.blast({ x: x1, y: 0.5, z: z1, size: 1.1, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.3 });
  }
  // A ward or a blessing on each body: a circle under them and light
  // pouring down onto them.
  function magicGuard(tp, ids) {
    fire('magic_guard');
    ids.forEach((id, i) => {
      const t = byId(id);
      if (!t) return;
      tk.circle({ x: t.x, z: t.z, radius: 0.7, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.8, spin: 2, delay: 0.05 + i * 0.04 });
      tk.beam({ x: t.x, z: t.z, height: 3.4, width: 0.5, core: tp.core, glow: tp.a, life: 0.5, delay: 0.05 + i * 0.04 });
      tk.dust(t.x, 0.3, t.z, 8, { color: tp.b, color2: tp.a, radius: 0.35, speed: [0.05, 0.3], up: [0.5, 1.2], size: [0.04, 0.09], life: [0.8, 1.3], gravity: -0.2, drag: 1.4, swirl: 3, delay: 0.05 + i * 0.04 });
    });
  }
  // A magic wave (a spell that sweeps a cone): a crescent of light rolling
  // out, a circle at the caster, stardust riding the front.
  function magicWave(tp, x, z, angle, reach, half) {
    fire('magic_wave');
    tk.circle({ x, z, radius: 0.8, face: 'arcane', outer: tp.a, inner: tp.b, life: 0.6, spin: 2.4 });
    tk.blaze({ x, z, angle, radius: reach * 0.55, width: 0.6, span: half * 2, mode: 'wave', ring: false, sweep: 0.02, life: 0.5, grow: 0.9, core: tp.core, a: tp.a, b: tp.b, y: 0.4, lift: 0.1, taper: 0.8, tail: 1, gain: 1.3 });
    tk.blaze({ x, z, angle, radius: reach * 0.4, width: 0.25, span: half * 1.8, mode: 'wave', sweep: 0.02, life: 0.45, grow: 1.0, core: tp.core, a: tp.b, b: tp.b, y: 0.42, lift: 0.1, taper: 0.8, tail: 1, delay: 0.05, opacity: 0.7 });
    for (let i = 0; i < 8; i++) {
      const a = angle + rnd(-half, half);
      const r = reach * rnd(0.4, 0.9);
      tk.dust(x + Math.cos(a) * r, 0.5, z + Math.sin(a) * r, 2, { color: tp.b, color2: tp.a, radius: 0.1, speed: [0.3, 0.8], up: [0.2, 0.7], size: [0.04, 0.09], life: [0.5, 1.0], gravity: -0.1, drag: 1.5, dir: { x: Math.cos(angle), z: Math.sin(angle) }, dirBias: 0.8, delay: (r / reach) * 0.2 });
    }
  }
  // A zone pulse: the circle breathes and a little stardust lifts off it.
  function magicTick(tp, x, z, r) {
    tk.circle({ x, z, radius: Math.min(2.6, r), face: 'arcane', outer: tp.a, inner: tp.b, life: 0.55, spin: 1.2, opacity: 0.45, grow: 0.12 });
    tk.dust(x, 0.15, z, 5, { color: tp.b, color2: tp.a, radius: r * 0.7, speed: [0.02, 0.15], up: [0.4, 1.0], size: [0.04, 0.08], life: [0.7, 1.2], gravity: -0.15, drag: 1.2 });
  }
  // A kill by a spell: the light goes up out of it.
  function magicKill(tp, x, z) {
    fire('magic_kill');
    tk.beam({ x, z, height: 3.0, width: 0.5, core: tp.core, glow: tp.a, life: 0.5 });
    tk.dust(x, 0.4, z, 12, { color: tp.b, color2: tp.a, radius: 0.3, speed: [0.1, 0.5], up: [0.8, 1.8], size: [0.05, 0.1], life: [0.8, 1.4], gravity: -0.3, drag: 1.2, swirl: 2.5 });
  }

  // ============================================================== BLADE ==
  // The blazing slash: a fire ribbon along the blade's path, motion-blur
  // afterimages behind it, sharp sparks flung off the edge; a skill adds a
  // golden energy wave rolling on past the reach and an explosion at the tip.
  const side = new Map();
  function bladeSwing(tp, id, x, z, angle, reach, half, { big = false, strokes = 1, scale = 1 } = {}) {
    fire(big ? 'blade_skill' : 'blade_swing');
    const rev = !side.get(id);
    side.set(id, rev);
    const R = reach * 0.95;
    const W = (big ? 0.75 : 0.52) * scale;
    const sweep = big ? 0.09 : 0.075;
    const sign = rev ? -1 : 1;
    for (let i = 0; i < strokes; i++) {
      const d = i * 0.06;
      const ri = rev !== (i % 2 === 1);
      tk.blaze({ x, z, angle: angle + (i % 2 ? 0.1 : -0.06) * (strokes > 1 ? 1 : 0), radius: R * (1 - i * 0.08), width: W, span: half * 2.1, sweep, life: big ? 0.44 : 0.32, reverse: ri, delay: d, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.46, lift: 0.22, tail: 0.95, gain: 1.35 });
      // Motion blur: two fading afterimages a beat behind, slightly back
      // along the swing.
      for (let j = 1; j <= 2; j++) {
        tk.blaze({ x, z, angle: angle - sign * 0.14 * j, radius: R * (1 - 0.05 * j), width: W * (0.7 - 0.15 * j), span: half * 2, sweep: sweep * 1.2, life: 0.26, reverse: ri, delay: d + j * 0.025, mode: 'wave', core: tp.core, a: tp.b, b: tp.b, y: 0.44, lift: 0.18, tail: 0.6, opacity: 0.5 - 0.15 * j, gain: 1.1 });
      }
    }
    const tipX = x + Math.cos(angle) * reach * 0.85;
    const tipZ = z + Math.sin(angle) * reach * 0.85;
    // Sharp sparks off the leading edge, tangent to the cut.
    const ta = angle + sign * half * 0.9;
    const tx = x + Math.cos(ta) * R;
    const tz = z + Math.sin(ta) * R;
    const tan = { x: Math.cos(ta + sign * Math.PI / 2), z: Math.sin(ta + sign * Math.PI / 2) };
    tk.sparks(tx, 0.55, tz, big ? 16 : 8, { color: tp.a, color2: tp.core, dir: { x: (tan.x + Math.cos(angle)) * 0.5, z: (tan.z + Math.sin(angle)) * 0.5 }, dirBias: 0.85, spread: 0.7, speed: [3, 6.5], up: [0.6, 2.4], life: [0.18, 0.38], delay: sweep * 0.8, len: 0.05 });
    if (big) {
      // The golden energy wave: a clean crescent that keeps travelling.
      tk.blaze({ x, z, angle, radius: reach * 0.75, width: 0.6 * scale, span: half * 1.7, sweep: 0.03, life: 0.5, grow: 1.5, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.4, lift: 0.08, taper: 0.9, tail: 1, delay: 0.06, gain: 1.35 });
      after(0.08, () => bladeBlast(tp, tipX, tipZ, (0.9 + reach * 0.35) * scale, { dir: { x: Math.cos(angle), z: Math.sin(angle) } }));
    } else {
      tk.blast({ x: tipX, y: 0.5, z: tipZ, size: 0.6 * scale, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.24, delay: sweep * 0.7 });
    }
    kit.light({ x: tipX, z: tipZ, radius: reach * (big ? 1.6 : 1.1), color: tp.a, opacity: big ? 0.5 : 0.3, life: big ? 0.4 : 0.22 });
  }
  // The impactful explosion: a turbulent fireball, a golden shock ring, a
  // spray of sharp sparks and dark smoke, a hot light pool, a kick.
  function bladeBlast(tp, x, z, size, { dir = null, kick = 0.025 } = {}) {
    fire('blade_blast');
    tk.blast({ x, y: 0.55, z, size: size * 1.6, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.5 });
    tk.blast({ x, y: 0.6, z, size: size * 1.1, mode: 'celestial', core: tp.core, a: tp.b, b: tp.a, life: 0.22 });
    tk.blaze({ x, z, ring: true, radius: size * 1.2, width: 0.22, life: 0.42, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.08, lift: 0.05, gain: 1.2 });
    tk.sparks(x, 0.5, z, Math.round(10 + size * 8), { color: tp.a, color2: tp.core, dir, dirBias: dir ? 0.5 : 0, speed: [2.5, 6], up: [1.0, 3.5], life: [0.25, 0.5], len: 0.045 });
    spray('smoke', x, 0.35, z, 2, { color: tp.smoke ?? INK, speed: [0.3, 0.8], up: [0.4, 0.9], size: [0.42, 0.6], grow: 1.5, life: [0.7, 1.1], opacity: 0.35, gravity: -0.3, drag: 2.2 });
    kit.light({ x, z, radius: size * 2.2, color: tp.a, opacity: 0.6, life: 0.45, attack: 0.03 });
    kit.mark({ x, z, radius: size * 1.3, kind: 'scorch', stain: INK, glow: tp.deep, cool: 0.8, life: 2.4, opacity: 0.4 });
    if (kick && dir) camfx.kick(dir.x, dir.z, kick, 0.1);
  }
  // A blade nova (a spin, a roar, a dive landing): a full fire ring, the
  // wave rolling out, an explosion at the centre, sparks in every direction.
  function bladeNova(tp, x, z, r) {
    fire('blade_nova');
    tk.circle({ x, z, radius: r * 0.9, face: 'sun', outer: tp.b, inner: tp.core, life: 0.7, spin: 2.6, opacity: 0.8 });
    tk.blaze({ x, z, ring: true, radius: r * 0.95, width: 0.5, life: 0.42, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.3, lift: 0.3, gain: 1.35 });
    tk.blaze({ x, z, ring: true, radius: r * 1.1, width: 0.3, life: 0.55, grow: 0.5, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.12, lift: 0.08, delay: 0.05, gain: 1.3 });
    after(0.04, () => bladeBlast(tp, x, z, 0.6 + r * 0.25, { kick: 0 }));
    tk.sparks(x, 0.5, z, 22, { color: tp.a, color2: tp.core, speed: [3, 7], up: [0.5, 2.5], life: [0.25, 0.45], radius: r * 0.3, len: 0.05 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.02, 0.1);
  }
  // A blade skill placed at a spot (a crack, caltrops, a charge, arrows
  // raining): it lands as an explosion with a fire ring.
  function bladeZone(tp, x, z, r, { rain = false } = {}) {
    fire('blade_zone');
    tk.circle({ x, z, radius: r, face: 'sun', outer: tp.b, inner: tp.core, life: 0.8, spin: 2, opacity: 0.7 });
    after(0.06, () => bladeBlast(tp, x, z, 0.6 + r * 0.35, { kick: 0.02, dir: { x: 0, z: 1 } }));
    tk.blaze({ x, z, ring: true, radius: r, width: 0.36, life: 0.5, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.12, lift: 0.25, delay: 0.06, gain: 1.3 });
    if (rain) {
      // Flaming shafts falling into the ring, each lands in a small burst.
      for (let i = 0; i < 7; i++) {
        const a = rnd(0, TAU);
        const rr = rnd(0, r * 0.85);
        const px = x + Math.cos(a) * rr;
        const pz = z + Math.sin(a) * rr;
        const d = 0.08 + i * 0.06;
        kit.streak({ a: { x: px, y: 3.4, z: pz }, b: { x: px, y: 2.6, z: pz }, width: 0.08, tailW: 0.25, core: tp.core, glow: tp.a, life: 0.3, delay: d, travel: { x: 0, y: -9, z: 0 }, fall: 1.2 });
        tk.blast({ x: px, y: 0.3, z: pz, size: 0.7, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.3, delay: d + 0.28 });
        tk.sparks(px, 0.25, pz, 4, { color: tp.a, color2: tp.core, speed: [1.5, 3.5], up: [1, 2.5], life: [0.2, 0.35], delay: d + 0.28 });
      }
    }
  }
  // A shot leaves the bow (or the hand): a muzzle flash of fire, a small
  // golden wave thrown forward, sparks down the line.
  function bladeRelease(tp, x, z, dx, dz, { count = 1, big = false } = {}) {
    fire('blade_release');
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l;
    const uz = dz / l;
    const mx = x + ux * 0.4;
    const mz = z + uz * 0.4;
    const ang = Math.atan2(uz, ux);
    tk.blast({ x: mx, y: 0.6, z: mz, size: big || count > 1 ? 0.95 : 0.65, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.22 });
    tk.blaze({ x: mx - ux * 0.25, z: mz - uz * 0.25, angle: ang, radius: 0.45, width: 0.18, span: count > 1 ? 1.8 : 1.2, sweep: 0.02, life: 0.3, grow: big ? 1.6 : 1.0, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.6, lift: 0.04, taper: 0.9, tail: 1, gain: 1.3 });
    tk.sparks(mx, 0.6, mz, big ? 10 : 6, { color: tp.a, color2: tp.core, dir: { x: ux, z: uz }, dirBias: 0.9, spread: count > 1 ? 0.5 : 0.25, speed: [4, 8], up: [-0.2, 0.6], life: [0.12, 0.26], gravity: 1, len: 0.06 });
    // Speed lines: the motion blur of the draw.
    for (const s of [-1, 1]) {
      const ox = -uz * 0.14 * s;
      const oz = ux * 0.14 * s;
      kit.streak({ a: { x: mx + ox - ux * 0.6, y: 0.58, z: mz + oz - uz * 0.6 }, b: { x: mx + ox + ux * 0.5, y: 0.6, z: mz + oz + uz * 0.5 }, width: 0.04, tailW: 0, core: tp.core, glow: tp.a, life: 0.16, fall: 1.4 });
    }
  }
  // A blade hit lands: sharp sparks flung through the target, a small burst;
  // a crit adds the explosion and a golden wave ring.
  function bladeImpact(tp, x, z, dx, dz, { crit = false, big = false } = {}) {
    fire('blade_hit');
    const dir = Math.hypot(dx, dz) > 1e-4 ? { x: dx, z: dz } : null;
    tk.sparks(x, 0.5, z, (big ? 9 : 6) + (crit ? 8 : 0), { color: tp.a, color2: tp.core, dir, dirBias: dir ? 0.75 : 0, spread: 0.8, speed: [2.5, 5.5], up: [0.6, 2.2], life: [0.16, 0.34], len: 0.05 });
    tk.blast({ x, y: 0.5, z, size: (big ? 0.75 : 0.55) * (crit ? 1.5 : 1), mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.26 });
    if (crit) {
      tk.blaze({ x, z, ring: true, radius: 1.0, width: 0.16, life: 0.32, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.1, lift: 0.04 });
      tk.blast({ x, y: 0.55, z, size: 1.1, mode: 'celestial', core: tp.core, a: tp.b, b: tp.a, life: 0.2 });
    }
  }
  // A blade dash (charge, lunge, step, dive): a fire wake down the path,
  // afterimage lines, sparks off the heels, a burst on arrival.
  function bladeDash(tp, x0, z0, x1, z1) {
    fire('blade_dash');
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    kit.streak({ a: { x: x0, y: 0.35, z: z0 }, b: { x: x1, y: 0.4, z: z1 }, width: 0.42, tailW: 0.3, core: tp.core, glow: tp.a, life: 0.34, fall: 1.1, opacity: 0.8 });
    for (let j = 1; j <= 3; j++) {
      const o = (j - 2) * 0.18;
      kit.streak({ a: { x: x0 - (dz / L) * o, y: 0.3 + j * 0.12, z: z0 + (dx / L) * o }, b: { x: x1 - (dz / L) * o, y: 0.3 + j * 0.12, z: z1 + (dx / L) * o }, width: 0.05, tailW: 0, core: tp.core, glow: tp.b, life: 0.24, delay: j * 0.02, fall: 1.4 });
    }
    const n = Math.min(8, Math.ceil(L * 2));
    for (let i = 0; i < n; i++) {
      const k = i / n;
      tk.sparks(x0 + dx * k, 0.2, z0 + dz * k, 2, { color: tp.a, color2: tp.core, dir: { x: -dx / L, z: -dz / L }, dirBias: 0.7, speed: [1, 3], up: [0.5, 1.8], life: [0.2, 0.4], delay: k * 0.1 });
    }
    tk.blast({ x: x1, y: 0.5, z: z1, size: 1.0, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.32, delay: 0.05 });
  }
  // A blade zone pulse: embers and a flicker of flame.
  function bladeTick(tp, x, z, r) {
    tk.sparks(x, 0.15, z, 5, { color: tp.a, color2: tp.core, radius: r * 0.6, speed: [0.3, 1.2], up: [1.2, 2.6], life: [0.25, 0.45], gravity: 3 });
    tk.blast({ x: x + rnd(-r, r) * 0.4, y: 0.25, z: z + rnd(-r, r) * 0.4, size: 0.6, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.26 });
  }
  function bladeKill(tp, x, z) {
    fire('blade_kill');
    tk.blast({ x, y: 0.5, z, size: 1.3, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.4 });
    tk.sparks(x, 0.5, z, 10, { color: tp.a, color2: tp.core, speed: [2, 5], up: [1, 3], life: [0.25, 0.45] });
  }

  // ============================================================= SCI-FI ==
  // No hero carries a technological weapon; these wait for the enemy pass
  // and play in the VFX lab (showcase('scifi')).
  function laser(tp, x0, z0, x1, z1, { y = 0.55 } = {}) {
    fire('scifi_laser');
    kit.streak({ a: { x: x0, y, z: z0 }, b: { x: x1, y, z: z1 }, width: 0.09, tailW: 1, core: tp.core, glow: tp.a, life: 0.3, fall: 0.2, opacity: 1 });
    kit.streak({ a: { x: x0, y, z: z0 }, b: { x: x1, y, z: z1 }, width: 0.3, tailW: 1, core: tp.a, glow: tp.b, life: 0.36, fall: 0.2, opacity: 0.55 });
    // Glitch: torn copies of the beam that flicker beside it.
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 4; i++) {
      const k0 = rnd(0, 0.7);
      const k1 = Math.min(1, k0 + rnd(0.1, 0.3));
      const o = rnd(-0.12, 0.12);
      kit.streak({ a: { x: x0 + dx * k0 - (dz / L) * o, y: y + rnd(-0.05, 0.05), z: z0 + dz * k0 + (dx / L) * o }, b: { x: x0 + dx * k1 - (dz / L) * o, y, z: z0 + dz * k1 + (dx / L) * o }, width: 0.05, tailW: 1, core: tp.core, glow: i % 2 ? tp.a : tp.b, life: 0.1, delay: rnd(0, 0.2), fall: 0.1 });
    }
    tk.blast({ x: x0, y, z: z0, size: 0.8, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.25 });
    scifiImpact(tp, x1, z1);
  }
  function scifiImpact(tp, x, z) {
    fire('scifi_hit');
    tk.blast({ x, y: 0.55, z, size: 1.3, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.35 });
    tk.circle({ x, z, radius: 0.8, face: 'hex', outer: tp.a, inner: tp.b, life: 0.5, spin: 1.5 });
    tk.dust(x, 0.4, z, tp.dust.hit, { tex: 'square', color: tp.a, color2: tp.b, radius: 0.3, speed: [0.05, 0.3], up: [0.4, 1.2], size: [0.05, 0.08], life: [0.5, 1.0], gravity: -0.2, drag: 1.8, twinkle: 40 });
    tk.sparks(x, 0.5, z, 8, { color: tp.a, color2: tp.b, speed: [3, 6], up: [0, 1], life: [0.1, 0.2], gravity: 0, len: 0.03 });
  }
  function scifiCast(tp, x, z, r) {
    fire('scifi_cast');
    tk.circle({ x, z, radius: r, face: 'hex', outer: tp.a, inner: tp.b, life: 1.0, spin: 0.9 });
    tk.beam({ x, z, height: 3.6, width: 0.4, core: tp.core, glow: tp.a, life: 0.5 });
    tk.dust(x, 0.2, z, tp.dust.cast, { tex: 'square', color: tp.a, color2: tp.b, radius: r * 0.8, speed: [0, 0.1], up: [0.6, 1.6], size: [0.05, 0.09], life: [0.8, 1.4], gravity: 0, drag: 0.5, twinkle: 40 });
    tk.blast({ x, y: 0.6, z, size: 1.6, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.4, delay: 0.05 });
  }

  // ------------------------------------------------------------ dispatch --
  // One effect, by its template.
  function playSwing(tp, id, x, z, angle, reach, half, opts) {
    if (tp.id === 'blade') bladeSwing(tp, id, x, z, angle, reach, half, opts);
    else if (tp.id === 'scifi') laser(tp, x, z, x + Math.cos(angle) * reach, z + Math.sin(angle) * reach);
    else magicWave(tp, x, z, angle, reach, half);
  }
  function playNova(tp, x, z, r) {
    if (tp.id === 'blade') bladeNova(tp, x, z, r);
    else if (tp.id === 'scifi') scifiCast(tp, x, z, r);
    else magicNova(tp, x, z, r);
  }
  function playRelease(tp, x, z, dx, dz, opts) {
    if (tp.id === 'blade') bladeRelease(tp, x, z, dx, dz, opts);
    else if (tp.id === 'scifi') laser(tp, x, z, x + dx * 3, z + dz * 3);
    else magicRelease(tp, x, z, dx, dz, opts);
  }
  function playZone(tp, x, z, r, opts) {
    if (tp.id === 'blade') bladeZone(tp, x, z, r, opts);
    else if (tp.id === 'scifi') scifiCast(tp, x, z, r);
    else magicZone(tp, x, z, r);
  }
  function playImpact(tp, x, z, dx, dz, opts) {
    if (tp.id === 'blade') bladeImpact(tp, x, z, dx, dz, opts);
    else if (tp.id === 'scifi') scifiImpact(tp, x, z);
    else magicImpact(tp, x, z, dx, dz, opts);
  }
  function playDash(tp, x0, z0, x1, z1) {
    if (tp.id === 'blade') bladeDash(tp, x0, z0, x1, z1);
    else magicDash(tp, x0, z0, x1, z1);
  }

  // Skills whose melee shape is a strike stack (more strokes in the slash).
  const STROKES = { flurry: 3, crescent_finisher: 2, blade_dance: 3, talon_rake: 3, brutal_cleave: 2 };
  // Skills that rain from the sky.
  const RAIN = new Set(['rain_of_arrows', 'rain_squall']);

  // ------------------------------------------------------------- wiring --
  bus.on('ally_basic', (ev) => {
    const a = byId(ev.id);
    const x = ev.x ?? a?.x;
    const z = ev.z ?? a?.z;
    if (x == null) return;
    const tp = tpl(ev.classId, `${ev.classId}_basic`);
    if (ev.shape === 'melee_arc') playSwing(tp, ev.id, x, z, Math.atan2(ev.dz ?? 0, ev.dx ?? 1), ev.reach ?? 0.9, ((ev.halfAngle ?? 50) * Math.PI) / 180, { big: false });
    else playRelease(tp, x, z, ev.dx ?? 0, ev.dz ?? 1);
  });

  bus.on('ally_cast', (ev) => {
    const x = ev.x;
    const z = ev.z;
    if (x == null) return;
    const tp = toneFor(ev.classId, ev.skill);
    const angle = Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
    if (ev.shape === 'melee_arc') {
      playSwing(tp, ev.id, x, z, angle, ev.reach ?? 1, ((ev.halfAngle ?? 50) * Math.PI) / 180, { big: true, strokes: STROKES[ev.skill] ?? 1 });
    } else if (ev.shape === 'nova') {
      playNova(tp, x, z, ev.radius ?? area(ev.skill) ?? 1.3);
    } else if (ev.shape === 'projectile') {
      playRelease(tp, x, z, ev.dx ?? 0, ev.dz ?? 1, { count: ev.count ?? 1, big: true });
    } else if (ev.shape === 'ground_aoe') {
      playZone(tp, ev.zx ?? x, ev.zz ?? z, ev.radius ?? 1, { rain: RAIN.has(ev.skill) });
    } else if (ev.shape === 'direct') {
      const ids = Array.isArray(ev.targets) && ev.targets.length ? ev.targets : [ev.id];
      if (tp.id === 'blade') {
        // A war cry or a shield call: golden waves out of the caster.
        bladeNova(tp, x, z, 1.6);
        for (const id of ids) {
          const t = byId(id);
          if (t) tk.blaze({ x: t.x, z: t.z, ring: true, radius: 0.7, width: 0.16, life: 0.4, mode: 'wave', core: tp.core, a: tp.b, b: tp.a, y: 0.7, lift: 0.02, delay: 0.2 });
        }
      } else magicGuard(tp, ids);
    }
  });

  // The Healer's own casts (and any seat that casts through the skill bar).
  bus.on('skill_cast', (ev) => {
    const p = player();
    if (!p || ev.skill == null) return;
    const cls = classOf(p) ?? vfxSkillClass(ev.skill);
    const tp = toneFor(cls, ev.skill);
    const d = p.lastAimDir ?? { x: 1, z: 0 };
    if (ev.shape === 'projectile') playRelease(tp, p.x, p.z, d.x ?? 1, d.z ?? 0, { count: ev.count ?? 1, big: true });
    else if (ev.shape === 'nova') playNova(tp, p.x, p.z, area(ev.skill) ?? 1.4);
    else if (ev.shape === 'melee_arc') playSwing(tp, p.id, p.x, p.z, Math.atan2(d.z ?? 0, d.x ?? 1), 1.4, Math.PI / 3, { big: true });
    else if (ev.shape === 'ground_aoe' && ev.x != null) playZone(tp, ev.x, ev.z, area(ev.skill) ?? 1.3, { rain: RAIN.has(ev.skill) });
    else if (ev.shape === 'direct' && Array.isArray(ev.targets)) magicGuard(tp, ev.targets);
  });
  // The Healer's basic bolt (a plain party 'bolt' leaving the hand).
  bus.on('projectile_spawn', (ev) => {
    const e = byId(ev.id);
    if (!e || e.kind !== 'bolt' || e.faction === 'hostile') return;
    const p = player();
    const tp = tpl(classOf(p) ?? 'healer', 'healer_basic');
    playRelease(tp, ev.x, ev.z, ev.dx ?? 1, ev.dz ?? 0);
  });

  const lastHit = new Map(); // victim id -> template id of the party's last hit on it
  bus.on('hit', (ev) => {
    const atk = byId(ev.attacker);
    const victimParty = ev.kind === 'player' || ev.kind === 'ally' || atk?.faction === 'hostile';
    if (victimParty) return; // enemy hits keep their own Ember grammar
    if (ev.x == null) return;
    const cls = classOf(atk) ?? vfxSkillClass(ev.source) ?? 'healer';
    const tp = toneFor(cls, ev.source && !/_basic$/.test(ev.source) ? ev.source : `${cls}_basic`);
    if (tp.heal) return;
    lastHit.set(ev.target, tp.id);
    playImpact(tp, ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit, big: ev.delivery !== 'basic' });
  });
  bus.on('death', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    const id = lastHit.get(ev.id);
    lastHit.delete(ev.id);
    if (!id || ev.x == null) return;
    const tp = vfxTemplate(id);
    if (id === 'blade') bladeKill(tp, ev.x, ev.z);
    else magicKill(tp, ev.x, ev.z);
  });

  bus.on('ally_dash', (ev) => {
    if (ev.x0 == null) return;
    const a = byId(ev.id);
    const tp = tpl(classOf(a) ?? vfxSkillClass(ev.skill), ev.skill);
    playDash(tp, ev.x0, ev.z0, ev.x1, ev.z1);
  });

  // A parry's counter (Riposte): an X of fire across the attacker.
  bus.on('parry_counter', (ev) => {
    const a = byId(ev.id);
    const tp = tpl(classOf(a) ?? 'swordsman', 'riposte');
    const t = byId(ev.attackerId);
    const x = t ? t.x : ev.x + (ev.dx ?? 0) * 0.6;
    const z = t ? t.z : ev.z + (ev.dz ?? 0) * 0.6;
    if (x == null) return;
    for (const s of [-1, 1]) tk.blaze({ x, z, angle: Math.atan2(ev.dz ?? 0, ev.dx ?? 1) + (Math.PI / 4) * s, radius: 0.5, width: 0.22, span: 2.2, sweep: 0.05, life: 0.3, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, y: 0.55, lift: 0.1, delay: s > 0 ? 0.05 : 0 });
    after(0.06, () => bladeBlast(tp, x, z, 0.9, { dir: { x: ev.dx ?? 0, z: ev.dz ?? 0 } }));
  });

  // Zone pulses: the template's breath on every tick, once in a while.
  const tickClock = new Map();
  bus.on('azone_tick', (ev) => {
    const zEnt = byId(ev.id);
    if (!zEnt) return;
    const now = (tickClock.get(ev.id) ?? 0) + 1;
    tickClock.set(ev.id, now);
    if (now % 2 === 0) return; // every other tick: a zone stays readable
    const cls = zEnt.classId ?? vfxSkillClass(ev.skill);
    const tp = toneFor(cls, ev.skill);
    const r = zEnt.radius ?? 0.9;
    if (tp.id === 'blade') bladeTick(tp, zEnt.x, zEnt.z, r);
    else magicTick(tp, zEnt.x, zEnt.z, r);
  });
  bus.on('azone_expire', (ev) => tickClock.delete(ev.id));

  // Passives that pulse on the enemies they touch.
  bus.on('aura_pulse', (ev) => {
    if (ev.seat === undefined || !ev.skill) return;
    const body = byId(ev.id) ?? null;
    const tp = toneFor(classOf(body) ?? vfxSkillClass(ev.skill), ev.skill);
    for (const id of (ev.hit || []).slice(0, 4)) {
      const e = byId(id);
      if (!e) continue;
      if (tp.id === 'blade') tk.sparks(e.x, 0.55, e.z, 4, { color: tp.a, color2: tp.core, speed: [1.5, 3.5], up: [0.4, 1.6], life: [0.15, 0.3] });
      else tk.dust(e.x, 0.55, e.z, 4, { color: tp.b, color2: tp.a, radius: 0.2, speed: [0.2, 0.6], up: [0.3, 0.9], size: [0.04, 0.08], life: [0.5, 0.8] });
    }
  });

  // The template a party shot plays in flight (boltfx.js draws it): a heal
  // bolt is green and gold, the Healer's plain bolt her basic's.
  const boltTone = (e) => (e.heal ? healTone(vfxTemplate('magic')) : toneFor(e.kind === 'bolt' ? 'healer' : null, e.kind === 'bolt' ? 'healer_basic' : e.skill));

  // ------------------------------------------------------------ the lab --
  // showcase('magic' | 'blade' | 'scifi', { x, z }): every beat of one
  // template played in front of the party, one after another.
  function showcase(id, at) {
    const tp = vfxTemplate(id);
    const p = player();
    const x = at?.x ?? (p ? p.x : 0);
    const z = at?.z ?? (p ? p.z - 2.2 : -2.2);
    const steps = [];
    if (id === 'blade') {
      steps.push(() => bladeSwing(tp, 'lab', x, z + 1.2, -Math.PI / 2, 1.4, Math.PI / 3));
      steps.push(() => bladeSwing(tp, 'lab', x, z + 1.2, -Math.PI / 2, 1.6, Math.PI / 3, { big: true, strokes: 2 }));
      steps.push(() => bladeNova(tp, x, z, 1.6));
      steps.push(() => bladeZone(tp, x, z, 1.4, { rain: true }));
      steps.push(() => bladeRelease(tp, x, z + 1.6, 0, -1, { big: true }));
      steps.push(() => bladeDash(tp, x - 1.6, z + 0.6, x + 1.6, z - 0.4));
      steps.push(() => bladeImpact(tp, x, z, 0, -1, { crit: true, big: true }));
    } else if (id === 'scifi') {
      steps.push(() => laser(tp, x - 2, z + 1.2, x + 1.5, z - 0.6));
      steps.push(() => scifiCast(tp, x, z, 1.4));
      steps.push(() => scifiImpact(tp, x, z));
    } else {
      steps.push(() => magicRelease(tp, x, z + 1.5, 0, -1, { big: true }));
      steps.push(() => magicCast(tp, x, z, 1.4));
      steps.push(() => magicNova(tp, x, z, 1.8));
      steps.push(() => magicZone(tp, x, z, 1.4));
      steps.push(() => magicWave(tp, x, z + 1.4, -Math.PI / 2, 2.2, Math.PI / 4));
      steps.push(() => magicGuard(tp, p ? [p.id] : []));
      steps.push(() => magicImpact(tp, x, z, 0, -1, { crit: true, big: true }));
    }
    steps.forEach((fn, i) => after(i * 0.9, fn));
    return steps.length;
  }

  function teardown() {
    side.clear();
    lastHit.clear();
    tickClock.clear();
  }

  return { boltTone, showcase, teardown, recipes: { magicCast, magicNova, magicZone, bladeSwing, bladeBlast, bladeNova, laser } };
}

