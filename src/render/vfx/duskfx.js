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
// First pass (content plan 5, slice 4): slice 5 brings his whole kit and
// its finished beats.
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
  function frame(dt, entities) {
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
