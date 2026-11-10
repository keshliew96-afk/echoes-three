// THE DROWNED HERON AND BARROW WYRM LOOKS: their attacks and deaths.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxBossStyle } from '../../../data/vfx.js';
import { EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';

export function createSigFirstBosses(ctx) {
  const { SF, CINDER, EARTH, N, SILT, WATER, bus, camfx, kit, mark, rnd, spray, unit2 } = ctx;

  // ------------------------------------------------- the Drowned Heron --
  // "The mill's drowned spear." Style: cold water over violet rot. Shapes:
  // long straight wakes (the spear), feather gusts (the wings), rings and a
  // geyser (the millrace). Light: violet at the bill and core, never warm.
  // Debris: foam droplets and silt. Camera: a kick along the spear when it
  // connects, a dolly on the surfacing.
  const HERON = vfxBossStyle('heron');
  bus.on('boss_spear', (ev) => {
    mark('heron_spear');
    const b = SF.byId(ev.id);
    const d = b ? unit2(b.dashVx ?? b.faceX ?? 0, b.dashVz ?? b.faceZ ?? 1) : { x: 0, z: 1 };
    const len = ev.len ?? 6;
    const { x, z } = ev;
    // The lane's floor foams white behind the drive, laid down at the dash's
    // own speed (11 u/s) so it reads as the bird ploughing the water.
    const sweep = len / 11;
    kit.streak({ a: { x, y: 0.08, z }, b: { x: x + d.x * len, y: 0.08, z: z + d.z * len }, width: HERON.spear.wakeW, tailW: 0.4, core: WATER, glow: WATER, life: sweep + 0.6, fall: 0.8, opacity: 0.55 });
    // The bill itself: a violet-edged spearhead running down the lane.
    kit.streak({ a: { x, y: 0.75, z }, b: { x: x + d.x * 0.9, y: 0.75, z: z + d.z * 0.9 }, width: 0.08, tailW: 0.6, core: PARCH, glow: HERON.corruption, life: sweep, travel: { x: d.x * 11, y: 0, z: d.z * 11 }, fall: 0.4 });
    kit.flash({ x: x + d.x * 0.6, y: 0.75, z: z + d.z * 0.6, color: HERON.peak, size: 0.6, life: 0.16 });
    SF.flare(x + d.x * 0.6, 0.75, z + d.z * 0.6, HERON.corruption, 1.4, { life: 0.22, core: HERON.peak, angle: Math.atan2(d.z, d.x) });
    // Wet stains laid down the lane as the drive passes over them.
    for (let i = 1; i <= 3; i++) kit.mark({ x: x + d.x * len * (i / 3.5), z: z + d.z * len * (i / 3.5), radius: 1.3, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.35, cool: 0.6, life: 2.8, opacity: 0.4, delay: (len * (i / 3.5)) / 11 });
    spray('shard', x, 0.2, z, 8, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.4, 2.4], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: { x: -d.x, z: -d.z }, dirBias: 0.4 });
  });
  bus.on('boss_spear_hit', (ev) => {
    mark('heron_spear_hit');
    const t = SF.byId(ev.target);
    const b = SF.byId(ev.id);
    if (!t) return;
    const d = b ? unit2(b.dashVx ?? 0, b.dashVz ?? 0) : { x: 0, z: 1 };
    spray('shard', t.x, 0.45, t.z, 7, { color: WATER, tile: SHARD_TILE.drop, speed: [1.2, 2.6], up: [1.0, 2.0], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: d, dirBias: 0.6 });
    kit.flash({ x: t.x, y: 0.55, z: t.z, color: HERON.corruption, size: 0.7, life: 0.16 });
    SF.flare(t.x, 0.55, t.z, HERON.corruption, 1.5, { kind: 'burst', life: 0.24, core: HERON.peak });
    camfx.kick(d.x, d.z, HERON.camera.kick, 0.14);
  });
  bus.on('boss_wingbeat', (ev) => {
    mark('heron_wingbeat');
    const { x, z } = ev;
    const r = ev.radius ?? 2.2;
    const w = HERON.wing;
    for (let i = 0; i < N(w.gusts); i++) {
      const a = (i / w.gusts) * TAU + rnd(-0.12, 0.12);
      kit.streak({ a: { x: x + Math.cos(a) * 0.5, y: 0.45, z: z + Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * r * rnd(0.9, 1.1), y: 0.3, z: z + Math.sin(a) * r * rnd(0.9, 1.1) }, width: 0.06, tailW: 0, core: PARCH, glow: WATER, life: 0.3, delay: rnd(0, 0.05), fall: 1.6 });
    }
    kit.ring({ x, z, r0: 0.5, r1: r * 1.1, width: 0.14, life: 0.45, core: HERON.peak, glow: HERON.corruption, soft: 0.5, y: 0.06 });
    SF.flare(x, 1.2, z, HERON.corruption, 1.8, { kind: 'burst', life: 0.26, core: HERON.peak });
    kit.mark({ x, z, radius: r * 1.6, kind: 'splash', stain: SILT, glow: null, life: 3, opacity: 0.35 });
    spray('shard', x, 1.2, z, w.feathers, { color: WATER, tile: SHARD_TILE.feather, speed: [1.2, 2.4], up: [0.4, 1.0], size: [0.13, 0.18], life: [1.0, 1.5], gravity: 0.7, drag: 1.6, spin: [-4, 4], flutter: 0.55 });
    spray('shard', x, 0.2, z, w.spray, { color: WATER, tile: SHARD_TILE.drop, speed: [1.8, 3.0], up: [0.8, 1.6], size: [0.1, 0.14], life: [0.4, 0.6], gravity: 7, drag: 0.5, spin: [-2, 2], jitter: r * 0.4 });
    kit.light({ x, z, radius: r * 1.2, color: HERON.corruption, opacity: 0.4, life: 0.4 });
  });
  function ripples(x, z, n, r1, delay0 = 0) {
    for (let i = 0; i < n; i++) kit.ring({ x, z, r0: 0.3, r1: r1 * (1 + i * 0.25), width: 0.06, life: 1.1, core: WATER, glow: WATER, soft: 0.7, y: 0.03, delay: delay0 + i * 0.22, opacity: 0.5, gain: 0.5 });
  }
  bus.on('boss_submerge', (ev) => {
    mark('heron_submerge');
    const { x, z } = ev;
    kit.ring({ x, z, r0: 0.3, r1: 1.8, width: 0.22, life: 0.5, core: WATER, glow: WATER, soft: 0.8, y: 0.05, opacity: 0.7 });
    ripples(x, z, 3, 2.0, 0.15);
    spray('shard', x, 0.3, z, 16, { color: WATER, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [2.0, 3.4], size: [0.1, 0.16], life: [0.6, 0.9], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.4 });
    spray('smoke', x, 0.15, z, 5, { color: SILT, speed: [0.4, 1.0], up: [0.05, 0.2], size: [0.45, 0.62], grow: 1.5, life: [1.2, 1.7], opacity: 0.4, gravity: 0, drag: 2.4, jitter: 0.5 });
    kit.flash({ x, y: 0.4, z, color: HERON.corruption, size: 1.0, life: 0.3 });
    kit.mark({ x, z, radius: 2.4, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.3, cool: 0.8, life: 4, opacity: 0.45 });
  });
  bus.on('boss_surface', (ev) => {
    mark('heron_surface');
    const { x, z } = ev;
    const g = HERON.geyser;
    kit.pillar({ x, z, radius: 0.7, height: g.height, color: WATER, life: 0.8, opacity: 0.55 });
    kit.pillar({ x, z, radius: 0.3, height: g.height * 1.1, color: HERON.corruption, life: 0.7, opacity: 0.6 });
    kit.flash({ x, y: 1.6, z, color: HERON.peak, size: 1.4, life: 0.32, hold: 0.08 });
    SF.flare(x, 1.2, z, HERON.corruption, 2.4, { kind: 'burst', life: 0.32, core: HERON.peak });
    kit.mark({ x, z, radius: 2.6, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.35, cool: 1.0, life: 4, opacity: 0.45 });
    ripples(x, z, g.ripples, (ev.radius ?? 1.8) * 1.2);
    spray('shard', x, 1.2, z, g.drops, { color: WATER, tile: SHARD_TILE.drop, speed: [0.6, 1.8], up: [3.0, 5.0], size: [0.11, 0.17], life: [0.8, 1.2], gravity: 7, drag: 0.2, spin: [-2, 2], jitter: 0.4 });
    spray('chunk', x, 0.2, z, 6, { color: SILT, speed: [0.8, 1.8], up: [1.6, 2.8], size: [0.06, 0.12], life: [0.5, 0.8] });
    kit.light({ x, z, radius: 3, color: HERON.corruption, opacity: 0.5, life: 0.8, attack: 0.04 });
    camfx.dolly(x, z, HERON.camera.dolly, 0.3);
  });
  function heronDeath(x, z) {
    // It falls into the millrace: the largest splash of the act, violet
    // draining out of it, feathers left on the water.
    mark('heron_death');
    kit.pillar({ x, z, radius: 0.9, height: 3.6, color: HERON.corruption, life: 1.3, opacity: 0.65 });
    SF.flare(x, 1.0, z, HERON.corruption, 3.2, { kind: 'burst', life: 0.45, core: HERON.peak, spin: 0.8 });
    kit.mark({ x, z, radius: 3.4, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.4, cool: 1.5, life: 6, opacity: 0.5 });
    kit.ring({ x, z, r0: 0.5, r1: 3.6, width: 0.32, life: 0.9, core: HERON.peak, glow: HERON.corruption, soft: 0.5, y: 0.06 });
    ripples(x, z, 4, 3.0, 0.1);
    spray('shard', x, 0.6, z, 28, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.6], up: [2.4, 4.4], size: [0.11, 0.17], life: [0.8, 1.2], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.7 });
    spray('shard', x, 1.4, z, 14, { color: WATER, tile: SHARD_TILE.feather, speed: [0.6, 1.6], up: [0.6, 1.4], size: [0.14, 0.2], life: [1.6, 2.2], gravity: 0.5, drag: 1.8, spin: [-3, 3], flutter: 0.6 });
    spray('smoke', x, 0.2, z, 8, { color: SILT, speed: [0.5, 1.3], up: [0.05, 0.25], size: [0.5, 0.7], grow: 1.6, life: [1.4, 2.0], opacity: 0.4, drag: 2.4, jitter: 0.8 });
    spray('spark', x, 0.4, z, 24, { color: HERON.corruption, speed: [0.3, 1.0], up: [0.8, 2.0], size: [0.06, 0.12], life: [1.2, 2.0], gravity: -0.3, drag: 1.2, jitter: 0.8 });
    kit.light({ x, z, radius: 4, color: HERON.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, HERON.camera.dolly, 0.5);
  }

  // ------------------------------------------------- the Barrow Wyrm --
  // "Ash breath, then the ground opens." Style: a furnace under the grave —
  // ash and cinders over violet cracks. Shapes: a fan of streaking cinders
  // that fills the cone, jagged earth rings, a violet pillar out of the
  // mound. Light: Ember down the breath (it is the attack), violet from
  // the cracks. Debris: ash smoke, earth chunks, hanging cinders. Camera:
  // a kick down the breath, a dolly on the eruption.
  const WYRM = vfxBossStyle('wyrm');
  bus.on('boss_breath', (ev) => {
    mark('wyrm_breath');
    const b = SF.byId(ev.id);
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const base = Math.atan2(d.z, d.x);
    const R = b?.telegraph?.radius ?? 4.2;
    const half = ((b?.telegraph?.halfAngleDeg ?? 32) * Math.PI) / 180;
    const { x, z } = ev;
    const br = WYRM.breath;
    // Throat flare (violet) and the front of the breath sweeping to the cone's rim.
    kit.flash({ x: x + d.x * 0.4, y: 0.6, z: z + d.z * 0.4, color: WYRM.peak, size: 0.9, life: 0.2 });
    kit.slash({ x, z, angle: base, radius: R * 0.92, width: 0.32, span: half * 2, sweep: 0.12, life: 0.45, core: PARCH, glow: EMBER, soft: 0.6, jag: 0.35, lift: 0.04, y: 0.25, gain: 0.9, grow: 0.15 });
    for (let i = 0; i < N(br.streaks); i++) {
      const a = base + rnd(-half, half) * 0.9;
      const r1 = R * rnd(0.55, 1.0);
      kit.streak({ a: { x: x + Math.cos(a) * 0.5, y: 0.45, z: z + Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * r1, y: 0.3, z: z + Math.sin(a) * r1 }, width: 0.06, tailW: 0.15, core: PARCH, glow: EMBER, life: 0.3, delay: rnd(0, 0.12), fall: 1.6 });
    }
    for (let i = 0; i < N(br.smoke); i++) {
      const a = base + rnd(-half, half) * 0.8;
      const r = R * rnd(0.25, 0.8);
      spray('smoke', x + Math.cos(a) * r, 0.35, z + Math.sin(a) * r, 1, { color: CINDER, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.45, 0.65], grow: 1.6, life: [1.0, 1.5], opacity: 0.4, gravity: -0.15, drag: 2.2, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.8 });
    }
    spray('spark', x + d.x * 0.6, 0.45, z + d.z * 0.6, br.cinders, { color: EMBER, speed: [2.0, 4.2], up: [0.2, 1.0], size: [0.04, 0.09], life: [0.5, 0.9], gravity: -0.2, drag: 1.0, dir: d, dirBias: 0.85 });
    kit.light({ x: x + d.x * R * 0.5, z: z + d.z * R * 0.5, radius: R * 0.8, color: EMBER, opacity: 0.4, life: 0.45, attack: 0.04 });
    SF.flare(x + d.x * 0.5, 0.6, z + d.z * 0.5, EMBER, 1.6, { kind: 'burst', life: 0.24, core: WYRM.peak });
    // The breath scorches the cone: burns that cool from Ember to ash.
    for (let i = 0; i < 4; i++) {
      const a = base + (i - 1.5) * half * 0.45;
      const r = R * (i % 2 ? 0.45 : 0.72);
      kit.mark({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, radius: 1.5, kind: 'scorch', stain: INK, glow: EMBER, cool: 1.1, life: 3.6, opacity: 0.55, delay: 0.04 + i * 0.03 });
    }
    camfx.kick(d.x, d.z, WYRM.camera.kick * 0.6, 0.16);
  });
  function moundBurst(x, z, big) {
    const e = WYRM.erupt;
    SF.flare(x, 0.4, z, big ? EMBER : WYRM.corruption, big ? 2.2 : 1.2, { kind: 'burst', life: big ? 0.3 : 0.22, core: WYRM.peak });
    kit.mark({ x, z, radius: big ? 3 : 1.8, kind: 'crater', stain: EARTH, glow: big ? EMBER : WYRM.corruption, cool: big ? 1.3 : 0.8, life: big ? 4.5 : 3, opacity: 0.6 });
    kit.crack({ x, z, radius: big ? 2.0 : 1.2, glow: WYRM.corruption, life: big ? 2.2 : 1.4, cool: big ? 0.8 : 0.4 });
    kit.ring({ x, z, r0: 0.2, r1: big ? 2.1 : 1.3, width: big ? 0.32 : 0.2, life: 0.5, core: EARTH, glow: big ? EMBER : WYRM.corruption, soft: 0.4, jag: 0.9, y: 0.05, opacity: 0.8 });
    spray('chunk', x, 0.2, z, big ? e.chunk : 8, { color: EARTH, speed: [0.8, 2.4], up: [2.4, 4.4], size: [0.08, 0.17], life: [0.7, 1.1], jitter: 0.4 });
    for (let i = 0; i < N(big ? e.dust : 4); i++) {
      const a = (i / (big ? e.dust : 4)) * TAU + rnd(-0.2, 0.2);
      spray('smoke', x + Math.cos(a) * 0.5, 0.2, z + Math.sin(a) * 0.5, 1, { color: CINDER, speed: big ? 2.6 : 1.4, up: [0.1, 0.4], size: [0.45, 0.65], grow: 1.5, life: [0.9, 1.3], opacity: 0.38, gravity: -0.12, drag: 2.6, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
    }
  }
  bus.on('boss_burrow', (ev) => {
    mark('wyrm_burrow');
    moundBurst(ev.x, ev.z, false);
  });
  bus.on('boss_emerge', (ev) => {
    mark('wyrm_emerge');
    const { x, z } = ev;
    const e = WYRM.erupt;
    moundBurst(x, z, true);
    kit.pillar({ x, z, radius: (ev.radius ?? 1.9) * 0.4, height: e.pillarH, color: WYRM.corruption, life: 0.85, opacity: 0.6 });
    kit.flash({ x, y: 0.7, z, color: WYRM.peak, size: 1.5, life: 0.3, hold: 0.08 });
    spray('spark', x, 0.2, z, e.cinders, { color: EMBER, speed: [0.2, 0.8], up: [1.2, 2.4], size: [0.05, 0.1], life: [0.9, 1.4], gravity: -0.3, drag: 1.3, jitter: 0.8 });
    spray('spark', x, 0.2, z, 10, { color: WYRM.corruption, speed: [0.1, 0.5], up: [0.6, 1.4], size: [0.06, 0.12], life: [1.2, 1.8], gravity: -0.35, drag: 1.4, jitter: 1.0, opacity: 0.85 });
    kit.light({ x, z, radius: 3.2, color: WYRM.corruption, opacity: 0.55, life: 0.9, attack: 0.04 });
    camfx.dolly(x, z, WYRM.camera.dolly, 0.32);
  });
  bus.on('boss_enrage', (ev) => {
    if (SF.byId(ev.id)?.kind === 'lichram') return SF.lichEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'colossus') return SF.colossusEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'gloamwolf') return SF.wolfEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'mireking') return SF.mirekingEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'ashraven') return SF.ravenEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'veinweaver') return SF.weaverEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'skyhorn') return SF.skyhornEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'hourwarden') return SF.hourwardenEnrage(ev);
    if (SF.byId(ev.id)?.kind === 'cinderback') return SF.cinderbackEnrage(ev);
    mark('wyrm_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.5, height: 2.6, color: WYRM.corruption, life: 0.7, opacity: 0.5 });
    kit.ring({ x, z, r0: 0.5, r1: 3.0, width: 0.18, life: 0.7, core: WYRM.peak, glow: WYRM.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 1.6, glow: WYRM.corruption, life: 2.0, cool: 0.8 });
    spray('spark', x, 0.3, z, 20, { color: WYRM.corruption, speed: [0.2, 0.7], up: [1.0, 2.0], size: [0.06, 0.11], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: 0.9 });
    kit.light({ x, z, radius: 3, color: WYRM.corruption, opacity: 0.45, life: 0.8 });
  });
  function wyrmDeath(x, z) {
    // It crumbles to ash: the body's cinders rise, the cracks go cold.
    mark('wyrm_death');
    kit.pillar({ x, z, radius: 1.0, height: 3.8, color: WYRM.corruption, life: 1.4, opacity: 0.65 });
    SF.flare(x, 1.0, z, WYRM.corruption, 3.2, { kind: 'burst', life: 0.45, core: WYRM.peak, spin: 0.8 });
    kit.mark({ x, z, radius: 3.4, kind: 'crater', stain: INK, glow: WYRM.corruption, cool: 2.0, life: 6, opacity: 0.6 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: WYRM.peak, glow: WYRM.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.4, glow: WYRM.corruption, life: 3, cool: 1.2 });
    spray('smoke', x, 0.4, z, 14, { color: CINDER, speed: [0.3, 1.0], up: [0.5, 1.2], size: [0.5, 0.72], grow: 1.6, life: [1.6, 2.2], opacity: 0.42, gravity: -0.3, drag: 2.0, jitter: 1.2 });
    spray('chunk', x, 0.4, z, 16, { color: EARTH, speed: [1.0, 2.6], up: [1.8, 3.6], size: [0.08, 0.17], life: [0.8, 1.2], jitter: 0.8 });
    spray('spark', x, 0.4, z, 30, { color: WYRM.corruption, speed: [0.3, 1.2], up: [0.8, 2.0], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('spark', x, 0.3, z, 16, { color: EMBER, speed: [0.2, 0.8], up: [1.0, 2.2], size: [0.04, 0.08], life: [0.8, 1.3], gravity: -0.25, drag: 1.3, jitter: 1.0 });
    kit.light({ x, z, radius: 4, color: WYRM.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, WYRM.camera.dolly, 0.5);
  }

  return { HERON, ripples, heronDeath, WYRM, moundBurst, wyrmDeath };
}
