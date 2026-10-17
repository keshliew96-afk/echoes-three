// THE DUSKWING's beats (docs/DUSKWING.md): Sable the bat, made visible. Dusk
// Rose carries the cut of every effect, Pale Moon its bright edge, Wing
// Leather the grit, and Night Ink the dark itself (drawn as smoke, never as
// light, so the darkness reads as darkness). The class's generic shape
// recipes in signature.js still play under these (his slashes and nova);
// this layer adds what only a diving bat has:
//   - Dusk Dive: a wake of torn shadow and rose streaks down the dash, then
//     a drop out of the dark where he lands: a falling rose star, a shock
//     ring, a burst of ink and the camera kicked;
//   - Bloodbite: two fang cuts crossing on the target, and a thread of rose
//     motes drawn back from each enemy bitten into him;
//   - Nightfall: a dome of night thrown off his wings, ink rolling out over
//     the floor, a pale moon ring at the edge, and over every blinded enemy
//     a small dark cloud with two rose eyes shut in it while the blind holds;
//   - Night Hunger: each sip of stolen life rises off him as rose motes.
// His whole kit (content plan 5, slice 5) adds:
//   - Echo Screech: three pale sound fronts rolling out down the cone, and
//     a ring of echo over each enemy it finds;
//   - Talon Rake: three claw cuts fanning across the arc, leather grit;
//   - Bat Swarm: a cloud of small bats darting round the spot for as long as
//     it holds, a nip of rose on everything they bite;
//   - Shadow Veil: the wings wrapping shut round him, a dark shell, the
//     cloak's edge cutting a ring;
//   - Flit: a flick of wing streaks off the line and a puff of night hanging
//     where he was;
//   - Blood Scent: a red wisp curling off each marked enemy;
//   - Blood Moon: a red moon rising over him, a falling sheet of dark, two
//     shock rings and threads of life pulled back from every enemy;
//   - his nodes' beats: Frenzy (a rose rush off his heels), Eclipse (a dark
//     disc bursting where an enemy fell), Vampire (a rose shell gathering).
//
// createDuskFx(h) takes the signature director's helpers (its kit, spray
// with the particle budget, flare/shock/after, the camera) plus the world,
// and returns { frame(dt, entities) } for its per-frame loop. Listen only:
// event payloads in, particles out.
import { PALETTE, VFX_SIGNATURE } from '../../data/palette.js';

const ROSE = VFX_SIGNATURE.duskwing.glow;
const MOON = VFX_SIGNATURE.duskwing.second;
const LEATHER = VFX_SIGNATURE.duskwing.debris;
const NIGHT = '#1B1426'; // Night Ink: the dark smoke of his darkness
const PARCH = PALETTE.parchment;
const INK = PALETTE.voidCharcoal;
const TAU = Math.PI * 2;

export function createDuskFx({ kit, bus, byId, spray, flare, shock, after, camfx, N, rnd, mark, world }) {
  // Live clouds (Bat Swarm, Flit's puff): zone id -> { x, z, r, left, kind }.
  const clouds = new Map();
  const sparks = (x, y, z, n, o = {}) =>
    spray('spark', x, y, z, n, { color: o.color ?? ROSE, speed: o.speed ?? [1.2, 2.8], up: o.up ?? [0.4, 1.4], size: o.size ?? [0.04, 0.08], life: o.life ?? [0.25, 0.5], gravity: o.gravity ?? 3, drag: 1.4, jitter: o.jitter ?? 0.1, dir: o.dir, dirBias: o.dirBias ?? 0 });
  // The dark: slow, heavy ink smoke that hangs low and spreads.
  const ink = (x, y, z, n, o = {}) =>
    spray('smoke', x, y, z, n, { color: o.color ?? NIGHT, speed: o.speed ?? [0.4, 1.2], up: o.up ?? [0.02, 0.2], size: o.size ?? [0.4, 0.62], grow: o.grow ?? 1.6, life: o.life ?? [0.7, 1.1], opacity: o.opacity ?? 0.5, gravity: 0, drag: 2.2, jitter: o.jitter ?? 0.3 });
  const motes = (x, y, z, n, o = {}) =>
    spray('spark', x, y, z, n, { color: o.color ?? ROSE, speed: [0.05, 0.3], up: [0.5, 1.1], size: [0.04, 0.07], life: o.life ?? [0.5, 0.8], gravity: -0.4, drag: 1.6, jitter: o.jitter ?? 0.25, opacity: 0.85 });

  // ------------------------------------------------------------ the dive --
  bus.on('ally_dash', (ev) => {
    if (ev.skill !== 'dusk_dive' || ev.x0 == null) return;
    mark('dusk:dive');
    const dx = ev.x1 - ev.x0;
    const dz = ev.z1 - ev.z0;
    const len = Math.hypot(dx, dz);
    if (!(len > 0.05)) return;
    const ux = dx / len;
    const uz = dz / len;
    const sec = Math.max(0.08, (ev.ticks ?? 12) / 60);
    // Two wing-tip streaks either side of the line, and the core between.
    for (const side of [-1, 1]) {
      const ox = -uz * 0.22 * side;
      const oz = ux * 0.22 * side;
      kit.streak({ a: { x: ev.x0 + ox, y: 0.75, z: ev.z0 + oz }, b: { x: ev.x1 + ox * 0.4, y: 0.45, z: ev.z1 + oz * 0.4 }, width: 0.07, tailW: 0.16, core: MOON, glow: ROSE, life: sec + 0.22, fall: 1.6, opacity: 0.8 });
    }
    kit.streak({ a: { x: ev.x0, y: 0.6, z: ev.z0 }, b: { x: ev.x1, y: 0.45, z: ev.z1 }, width: 0.26, tailW: 0.08, core: ROSE, glow: ROSE, life: sec + 0.3, fall: 1.4, opacity: 0.4 });
    // Torn shadow left hanging down the lane.
    const steps = Math.min(6, Math.max(2, Math.round(len / 0.6)));
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      after(k * sec, () => ink(ev.x0 + dx * k, 0.45, ev.z0 + dz * k, N(2), { speed: [0.1, 0.4], size: [0.3, 0.45], life: [0.5, 0.8], opacity: 0.42 }));
    }
    // A gather of dark at the start: he folds his wings and drops.
    ink(ev.x0, 0.6, ev.z0, N(4), { speed: [0.6, 1.4], opacity: 0.45 });
    sparks(ev.x0, 0.7, ev.z0, N(5), { color: MOON, dir: { x: -ux, z: -uz }, dirBias: 0.6 });
  });

  // ------------------------------------------------------------- casts --
  bus.on('ally_cast', (ev) => {
    if (ev.classId !== 'duskwing' || ev.x == null) return;
    const dx = ev.dx ?? 0;
    const dz = ev.dz ?? 1;
    const ang = Math.atan2(dz, dx);
    if (ev.skill === 'dusk_dive') {
      mark('dusk:land');
      const R = ev.radius ?? 1.2;
      // He drops out of the dark: a rose star falling onto the spot.
      kit.streak({ a: { x: ev.x, y: 2.2, z: ev.z }, b: { x: ev.x, y: 0.3, z: ev.z }, width: 0.18, tailW: 0, core: PARCH, glow: ROSE, life: 0.16, fall: 2, opacity: 0.9 });
      after(0.04, () => {
        flare(ev.x, 0.45, ev.z, ROSE, 1.3, { kind: 'star', life: 0.24, core: PARCH });
        shock(ev.x, ev.z, R * 1.15, ROSE, { life: 0.3, width: 0.12, core: MOON });
        shock(ev.x, ev.z, R * 1.5, LEATHER, { life: 0.45, width: 0.06, core: ROSE, delay: 0.06 });
        kit.light({ x: ev.x, z: ev.z, radius: R * 1.4, color: ROSE, opacity: 0.45, life: 0.24, attack: 0.02 });
        kit.mark({ x: ev.x, z: ev.z, radius: R * 0.85, kind: 'gouge', angle: ang, stretch: 1.3, stain: INK, glow: ROSE, cool: 0.8, life: 2.0, opacity: 0.4 });
        for (let k = 0; k < N(10); k++) {
          const a = (k / 10) * TAU + rnd(-0.2, 0.2);
          sparks(ev.x + Math.cos(a) * 0.15, 0.35, ev.z + Math.sin(a) * 0.15, 1, { speed: [2.2, 3.6], up: [0.3, 0.9], color: k % 3 === 0 ? MOON : ROSE });
        }
        ink(ev.x, 0.3, ev.z, N(6), { speed: [1.0, 2.0], opacity: 0.5 });
        camfx.kick(dx, dz, 0.045, 0.12);
      });
      return;
    }
    if (ev.skill === 'blood_bite') {
      mark('dusk:bite');
      const reach = ev.reach ?? 0.95;
      const fx = ev.x + dx * reach * 0.7;
      const fz = ev.z + dz * reach * 0.7;
      // Two fang cuts that cross on the bite.
      for (const side of [-1, 1]) {
        kit.slash({ x: ev.x, z: ev.z, angle: ang + side * 0.28, radius: reach * 0.8, width: 0.11, span: 0.9, sweep: 0.03, life: 0.2, core: PARCH, glow: ROSE, soft: 0.2, y: 0.55 + side * 0.08, lift: 0.1, reverse: side < 0, gain: 1.25, tail: 1 });
      }
      flare(fx, 0.55, fz, ROSE, 0.7, { kind: 'star', life: 0.16, core: MOON, angle: ang + Math.PI / 4 });
      // Each enemy bitten gives up a thread of life, drawn back into him.
      const ids = Array.isArray(ev.targets) ? ev.targets : [];
      ids.forEach((id, i) => {
        const t = byId(id);
        if (!t) return;
        after(0.06 + i * 0.04, () => {
          kit.streak({ a: { x: t.x, y: 0.6, z: t.z }, b: { x: ev.x, y: 0.75, z: ev.z }, width: 0.05, tailW: 0.1, core: MOON, glow: ROSE, life: 0.28, fall: 1.5, opacity: 0.85 });
          sparks(t.x, 0.6, t.z, N(5), { color: ROSE, dir: { x: ev.x - t.x, z: ev.z - t.z }, dirBias: 0.7, speed: [1.4, 2.4], gravity: 1 });
        });
      });
      camfx.kick(dx, dz, 0.02, 0.07);
      return;
    }
    if (ev.skill === 'nightfall') {
      mark('dusk:nightfall');
      const R = ev.radius ?? 2.0;
      // Wings thrown wide: a burst of dark off him that rolls to the edge.
      kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: MOON, size: 0.5, life: 0.1 });
      for (let k = 0; k < N(12); k++) {
        const a = (k / 12) * TAU + rnd(-0.15, 0.15);
        const r = R * rnd(0.35, 0.8);
        after(rnd(0, 0.08), () => ink(ev.x + Math.cos(a) * r, 0.35, ev.z + Math.sin(a) * r, 1, { speed: [0.6, 1.3], size: [0.55, 0.85], life: [1.1, 1.6], opacity: 0.55 }));
      }
      ink(ev.x, 0.9, ev.z, N(6), { speed: [1.2, 2.2], up: [0.1, 0.5], size: [0.5, 0.8], opacity: 0.5 });
      kit.mark({ x: ev.x, z: ev.z, radius: R * 0.95, kind: 'sigil', stain: NIGHT, glow: ROSE, glowOpacity: 0.25, cool: 1.2, life: 2.2, opacity: 0.5 });
      shock(ev.x, ev.z, R, MOON, { life: 0.5, width: 0.07, core: MOON, delay: 0.05 });
      shock(ev.x, ev.z, R * 0.7, ROSE, { life: 0.4, width: 0.1, core: PARCH });
      kit.light({ x: ev.x, z: ev.z, radius: R * 1.2, color: ROSE, opacity: 0.25, life: 0.3 });
      camfx.kick(0, 0, 0.03, 0.1);
      return;
    }
    if (ev.skill === 'echo_screech') {
      mark('dusk:screech');
      const reach = ev.reach ?? 2.6;
      const span = ((ev.halfAngle ?? 35) * 2 * Math.PI) / 180;
      // His mouth opens: a pale flash, then three fronts of sound down the cone.
      kit.flash({ x: ev.x + dx * 0.25, y: 0.75, z: ev.z + dz * 0.25, color: MOON, size: 0.3, life: 0.08 });
      for (let k = 0; k < 3; k++) {
        kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: reach * (0.4 + k * 0.3), width: 0.07 - k * 0.012, span, sweep: 0.01, life: 0.26, core: MOON, glow: ROSE, soft: 0.55, y: 0.6, lift: 0.04, gain: 1.1, tail: 1, delay: k * 0.06, opacity: 0.85 - k * 0.15 });
      }
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: reach * 0.95, width: 0.03, span: span * 1.05, sweep: 0.01, life: 0.34, core: PARCH, glow: MOON, soft: 0.3, y: 0.08, lift: 0, tail: 1, delay: 0.14, opacity: 0.5 });
      const ids = Array.isArray(ev.targets) ? ev.targets : [];
      ids.forEach((id, i) => {
        const t = byId(id);
        if (!t) return;
        after(0.08 + i * 0.03, () => {
          kit.ring({ x: t.x, z: t.z, r0: 0.5, r1: 0.18, width: 0.05, life: 0.32, core: PARCH, glow: ROSE, soft: 0.4, y: 0.9, opacity: 0.8 });
          flare(t.x, 0.9, t.z, ROSE, 0.4, { kind: 'star', life: 0.14, core: MOON });
        });
      });
      camfx.kick(dx, dz, 0.012, 0.06);
      return;
    }
    if (ev.skill === 'talon_rake') {
      mark('dusk:rake');
      const reach = ev.reach ?? 1.2;
      const span = ((ev.halfAngle ?? 75) * 2 * Math.PI) / 180;
      // Three claw cuts, fanned and staggered, the middle one longest.
      [-0.12, 0, 0.12].forEach((off, k) => {
        kit.slash({ x: ev.x, z: ev.z, angle: ang + off, radius: reach * (k === 1 ? 0.95 : 0.8), width: 0.06, span: span * 0.92, sweep: 0.05, life: 0.2, core: PARCH, glow: ROSE, soft: 0.2, y: 0.5 + off, lift: 0.08, reverse: k % 2 === 1, gain: 1.3, tail: 0.9, delay: k * 0.035, jag: 0.25 });
      });
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: reach * 0.7, width: 0.24, span, sweep: 0.06, life: 0.24, core: ROSE, glow: LEATHER, soft: 0.8, y: 0.45, lift: 0.04, tail: 0.8, opacity: 0.45 });
      for (let k = 0; k < N(8); k++) {
        const a = ang + rnd(-span / 2, span / 2);
        sparks(ev.x + Math.cos(a) * reach * 0.7, 0.45, ev.z + Math.sin(a) * reach * 0.7, 1, { color: k % 2 ? LEATHER : ROSE, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.7, speed: [1.6, 3] });
      }
      camfx.kick(dx, dz, 0.025, 0.08);
      return;
    }
    if (ev.skill === 'shadow_veil') {
      mark('dusk:veil');
      const R = ev.radius ?? 1.2;
      // The wings wrap shut: two dark arcs closing round him, a moonlit shell.
      for (const side of [-1, 1]) {
        kit.slash({ x: ev.x, z: ev.z, angle: ang + side * Math.PI * 0.5, radius: 0.55, width: 0.22, span: Math.PI * 0.95, sweep: 0.12, life: 0.36, core: LEATHER, glow: NIGHT, soft: 0.8, y: 0.7, lift: 0.3, reverse: side < 0, tail: 1, opacity: 0.85 });
      }
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.45, height: 1.3, color: NIGHT, life: 0.5, opacity: 0.45 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.7, r1: 0.42, width: 0.06, life: 0.4, core: MOON, glow: ROSE, soft: 0.4, y: 0.75, opacity: 0.8, delay: 0.08 });
      // The cloak's edge cuts outward.
      after(0.1, () => {
        kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: R * 0.9, width: 0.08, span: TAU, sweep: 0.08, life: 0.28, core: MOON, glow: ROSE, soft: 0.3, y: 0.4, lift: 0.05, tail: 0.7 });
        ink(ev.x, 0.6, ev.z, N(6), { speed: [0.8, 1.6], size: [0.35, 0.55], life: [0.5, 0.8], opacity: 0.5 });
      });
      kit.light({ x: ev.x, z: ev.z, radius: 1.1, color: ROSE, opacity: 0.2, life: 0.3 });
      return;
    }
    if (ev.skill === 'blood_moon') {
      mark('dusk:moon');
      const R = ev.radius ?? 2.4;
      // The moon turns red over him: a rose-red disc rising behind his head.
      flare(ev.x, 2.2, ev.z, ROSE, 2.0, { kind: 'burst', life: 0.7, core: MOON });
      kit.flash({ x: ev.x, y: 2.2, z: ev.z, color: ROSE, size: 1.2, life: 0.2 });
      kit.light({ x: ev.x, z: ev.z, radius: R * 1.5, color: ROSE, opacity: 0.55, life: 0.6, attack: 0.08 });
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.35, height: 2.4, color: ROSE, life: 0.4, opacity: 0.35 });
      // A sheet of dark falls out of it onto the floor.
      after(0.12, () => {
        kit.mark({ x: ev.x, z: ev.z, radius: R, kind: 'sigil', stain: NIGHT, glow: ROSE, glowOpacity: 0.45, cool: 1.6, life: 2.6, opacity: 0.6 });
        shock(ev.x, ev.z, R, ROSE, { life: 0.5, width: 0.14, core: PARCH });
        shock(ev.x, ev.z, R * 1.2, NIGHT, { life: 0.7, width: 0.1, core: ROSE, delay: 0.1 });
        for (let k = 0; k < N(16); k++) {
          const a = (k / 16) * TAU + rnd(-0.12, 0.12);
          const r = R * rnd(0.3, 0.9);
          ink(ev.x + Math.cos(a) * r, 0.4, ev.z + Math.sin(a) * r, 1, { speed: [0.5, 1.4], size: [0.55, 0.9], life: [1.2, 1.8], opacity: 0.55 });
        }
        camfx.kick(0, 0, 0.06, 0.16);
      });
      // Threads of life pulled back off every enemy it struck.
      const ids = Array.isArray(ev.targets) ? ev.targets : [];
      ids.forEach((id, i) => {
        const t = byId(id);
        if (!t) return;
        after(0.22 + i * 0.03, () => {
          kit.streak({ a: { x: t.x, y: 0.7, z: t.z }, b: { x: ev.x, y: 1.0, z: ev.z }, width: 0.05, tailW: 0.12, core: MOON, glow: ROSE, life: 0.34, fall: 1.4, opacity: 0.85 });
          flare(t.x, 0.6, t.z, ROSE, 0.5, { kind: 'star', life: 0.18, core: PARCH });
        });
      });
      return;
    }
  });

  // ---------------------------------------------------- Flit, the way out --
  bus.on('ally_dash', (ev) => {
    if (ev.skill !== 'flit' || ev.x0 == null) return;
    mark('dusk:flit');
    const sec = Math.max(0.08, (ev.ticks ?? 12) / 60);
    for (const side of [-1, 1]) {
      const ox = -(ev.z1 - ev.z0) * 0.08 * side;
      const oz = (ev.x1 - ev.x0) * 0.08 * side;
      kit.streak({ a: { x: ev.x0 + ox, y: 0.7, z: ev.z0 + oz }, b: { x: ev.x1, y: 0.8, z: ev.z1 }, width: 0.05, tailW: 0.12, core: MOON, glow: ROSE, life: sec + 0.18, fall: 1.8, opacity: 0.75 });
    }
    ink(ev.x0, 0.6, ev.z0, N(6), { speed: [0.6, 1.4], size: [0.45, 0.7], opacity: 0.55 });
    sparks(ev.x0, 0.7, ev.z0, N(6), { color: ROSE, speed: [1.2, 2.4] });
  });

  // -------------------------------------------- his clouds: swarm and puff --
  bus.on('azone_spawn', (ev) => {
    if (ev.classId !== 'duskwing' || ev.x == null) return;
    if (ev.skill !== 'bat_swarm' && ev.skill !== 'flit') return;
    const swarm = ev.skill === 'bat_swarm';
    mark(swarm ? 'dusk:swarm' : 'dusk:puff');
    const r = ev.radius ?? 1.2;
    clouds.set(ev.id, { x: ev.x, z: ev.z, r, left: (ev.totalTicks ?? 2) + 0.4, kind: ev.skill, t: 0 });
    if (swarm) {
      // They pour out of the dark: a burst of wing streaks spiralling in.
      for (let k = 0; k < N(10); k++) {
        const a = (k / 10) * TAU;
        kit.streak({ a: { x: ev.x + Math.cos(a) * r * 1.4, y: 1.5, z: ev.z + Math.sin(a) * r * 1.4 }, b: { x: ev.x + Math.cos(a + 0.9) * r * 0.5, y: 0.8, z: ev.z + Math.sin(a + 0.9) * r * 0.5 }, width: 0.05, tailW: 0.1, core: LEATHER, glow: ROSE, life: 0.3, fall: 1.4, opacity: 0.75 });
      }
      kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'sigil', stain: NIGHT, glow: ROSE, glowOpacity: 0.2, cool: 1.0, life: (ev.totalTicks ?? 4) + 0.5, opacity: 0.35 });
    } else {
      ink(ev.x, 0.5, ev.z, N(8), { speed: [0.3, 0.9], size: [0.5, 0.8], life: [1.0, 1.5], opacity: 0.6 });
    }
  });
  bus.on('azone_tick', (ev) => {
    const c = clouds.get(ev.id);
    if (!c) return;
    for (const id of ev.hit || []) {
      const t = byId(id);
      if (!t) continue;
      if (c.kind === 'bat_swarm') {
        flare(t.x, 0.65, t.z, ROSE, 0.35, { kind: 'star', life: 0.12, core: MOON });
        sparks(t.x, 0.65, t.z, N(3), { color: ROSE, speed: [0.6, 1.4], gravity: 1 });
      } else {
        ink(t.x, 0.9, t.z, N(2), { speed: [0.1, 0.4], size: [0.3, 0.45], life: [0.5, 0.7], opacity: 0.5 });
      }
    }
  });
  bus.on('azone_expire', (ev) => {
    const c = clouds.get(ev.id);
    if (!c) return;
    clouds.delete(ev.id);
    // The cloud lifts: the bats scatter up and out.
    if (c.kind === 'bat_swarm') for (let k = 0; k < N(6); k++) {
      const a = rnd(0, TAU);
      kit.streak({ a: { x: c.x + Math.cos(a) * 0.3, y: 0.8, z: c.z + Math.sin(a) * 0.3 }, b: { x: c.x + Math.cos(a) * 1.8, y: 2.2, z: c.z + Math.sin(a) * 1.8 }, width: 0.04, tailW: 0.08, core: LEATHER, glow: ROSE, life: 0.3, fall: 1.2, opacity: 0.6 });
    }
  });

  // ------------------------------------------------------ Blood Scent --
  bus.on('aura_pulse', (ev) => {
    if (ev.skill !== 'blood_scent' || !Array.isArray(ev.hit)) return;
    for (const id of ev.hit) {
      const t = byId(id);
      if (!t) continue;
      spray('smoke', t.x, 0.8, t.z, N(2), { color: ROSE, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.12, 0.2], grow: 1.8, life: [0.6, 0.9], opacity: 0.4, gravity: -0.2, drag: 1.2, jitter: 0.15 });
      sparks(t.x, 0.9, t.z, 1, { color: MOON, speed: [0, 0.1], up: [0.3, 0.6], life: [0.4, 0.6], gravity: -0.3 });
    }
  });

  // ---------------------------------------------------- his nodes' beats --
  bus.on('dusk_frenzy', (ev) => {
    const b = byId(ev.id);
    if (!b) return;
    mark('dusk:frenzy');
    kit.ring({ x: b.x, z: b.z, r0: 0.25, r1: 0.9, width: 0.05, life: 0.3, core: MOON, glow: ROSE, soft: 0.4, y: 0.1, opacity: 0.75 });
    for (let k = 0; k < N(6); k++) sparks(b.x, 0.3, b.z, 1, { color: ROSE, speed: [1.6, 2.6], up: [0.1, 0.3], life: [0.2, 0.35] });
  });
  bus.on('dusk_eclipse', (ev) => {
    if (ev.x == null) return;
    mark('dusk:eclipse');
    // A dark disc swallows a pale one where the enemy fell, then bursts.
    flare(ev.x, 0.8, ev.z, MOON, 1.1, { kind: 'burst', life: 0.18, core: PARCH });
    after(0.06, () => {
      kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: NIGHT, size: 0.9, life: 0.2 });
      shock(ev.x, ev.z, 1.4, NIGHT, { life: 0.45, width: 0.12, core: ROSE });
      ink(ev.x, 0.6, ev.z, N(8), { speed: [1.0, 2.0], size: [0.45, 0.7], opacity: 0.55 });
    });
  });
  bus.on('dusk_vampire', (ev) => {
    const b = byId(ev.id);
    if (!b) return;
    // A rose shell gathering round him, one bead of it per feed.
    spray('spark', b.x, 0.6, b.z, 1, { color: ROSE, speed: [0.3, 0.6], up: [0.1, 0.3], size: [0.05, 0.08], life: [0.35, 0.5], gravity: 0, drag: 3, jitter: 0.35, opacity: 0.8 });
  });

  // Night Hunger: a sip of stolen life rising off him.
  bus.on('heal', (ev) => {
    if (ev.source !== 'night_hunger') return;
    const b = byId(ev.target);
    const x = b ? b.x : ev.x;
    const z = b ? b.z : ev.z;
    if (x == null) return;
    motes(x, 0.5, z, N(ev.applied >= 6 ? 6 : 3));
  });

  // ------------------------------------------------------------- blind --
  // Over every blinded enemy, a small dark cloud with two shut rose eyes,
  // kept up while the blind holds (a puff every beat, never a held mesh, so
  // there is nothing to clean up when the enemy dies).
  const puffAt = new Map(); // entity id -> seconds to its next puff
  function cloudFrame(dt) {
    for (const [id, c] of clouds) {
      c.left -= dt;
      if (c.left <= 0) {
        clouds.delete(id);
        continue;
      }
      c.t -= dt;
      if (c.t > 0) continue;
      if (c.kind === 'bat_swarm') {
        // Small bats darting round the spot: short wing streaks on the circle.
        c.t = 0.07;
        for (let k = 0; k < 2; k++) {
          const a = rnd(0, TAU);
          const r = c.r * rnd(0.25, 0.95);
          const y = rnd(0.45, 1.25);
          const step = rnd(0.45, 0.8) * (k % 2 ? 1 : -1);
          kit.streak({ a: { x: c.x + Math.cos(a) * r, y, z: c.z + Math.sin(a) * r }, b: { x: c.x + Math.cos(a + step) * r, y: y + rnd(-0.15, 0.15), z: c.z + Math.sin(a + step) * r }, width: 0.045, tailW: 0.09, core: LEATHER, glow: ROSE, life: 0.18, fall: 1.2, opacity: 0.8 });
        }
        if (rnd(0, 1) < 0.35) ink(c.x + rnd(-c.r, c.r) * 0.6, 0.5, c.z + rnd(-c.r, c.r) * 0.6, 1, { speed: [0.05, 0.3], size: [0.4, 0.6], life: [0.6, 0.9], opacity: 0.3 });
      } else {
        // Flit's puff of night: it hangs, rolling slowly.
        c.t = 0.16;
        ink(c.x + rnd(-0.4, 0.4) * c.r, 0.45, c.z + rnd(-0.4, 0.4) * c.r, 1, { speed: [0.05, 0.25], size: [0.5, 0.75], life: [0.7, 1.0], opacity: 0.45 });
      }
    }
  }
  function frame(dt, entities) {
    cloudFrame(dt);
    const tick = world && Number.isFinite(world.tick) ? world.tick : 0;
    const seen = new Set();
    for (const e of entities || []) {
      const b = e.status && e.status.blind;
      if (!b || !(b.untilTick > tick) || !(e.hp > 0)) continue;
      seen.add(e.id);
      const left = (puffAt.get(e.id) ?? 0) - dt;
      if (left > 0) {
        puffAt.set(e.id, left);
        continue;
      }
      puffAt.set(e.id, 0.22);
      const s = e.radius ? Math.max(0.8, e.radius / 0.3) : 1;
      const y = 1.05 * s;
      ink(e.x, y, e.z, 1, { speed: [0.05, 0.2], up: [-0.02, 0.06], size: [0.32 * s, 0.44 * s], grow: 1.2, life: [0.4, 0.55], opacity: 0.55, jitter: 0.12 * s });
      for (const side of [-1, 1]) {
        spray('spark', e.x + side * 0.09 * s, y, e.z + 0.05, 1, { color: ROSE, speed: [0, 0.02], up: [0, 0.02], size: [0.05, 0.06], life: [0.24, 0.26], gravity: 0, drag: 4, jitter: 0, opacity: 0.8 });
      }
    }
    for (const id of puffAt.keys()) if (!seen.has(id)) puffAt.delete(id);
  }

  return { frame };
}
