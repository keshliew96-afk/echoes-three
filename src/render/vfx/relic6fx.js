// RELICS batch 6 beats (docs/RELICS.md "Batch 6", content plan 5 slice 11).
//
//   delvers_lantern  mark: the lantern finds the cracked wall. A warm beam
//                    runs from the party to the seam, a lantern light blooms
//                    on the face and a pillar of amber stands over it; while
//                    the wall stays shut, amber motes keep rising off the
//                    seam and a soft ring breathes at its foot
//   kiln_coal        alight: a Kiln Gold catch-flare with a white-hot core on
//                    the enemy; while it burns, flame licks and sparks climb
//                    off it and dark smoke curls away (a puff every beat,
//                    nothing held); each burn tick a small hot flare. Kiln
//                    Gold, never Ember
//   pumice_soles     a floor patch refused: a grey puff of pumice grit and a
//                    pale stone ring at the hero's feet
//   wing_bone        the dodge's dive: two dusk-rose wing sweeps fold down
//                    onto the landing, a white-hot star, a shock ring the
//                    size of the dive, dust thrown out low, a flash on every
//                    enemy it struck and a short kick
//   crown_shard      a felled elite's crown: a gold crown, one spike for
//                    each power it carried, rises where it fell, each spike
//                    flares and breaks into coins that arc to the party
//   dusk_lens        a crit blinds: a rose lens ring focuses down onto the
//                    enemy's head, a glint crosses it, the dark falls (the
//                    blind's own cloud is duskfx.js's)
//   nightfall_veil   a first blow crits: a violet crescent cuts across the
//                    enemy with a pale-moon core, a star and falling motes
//   rekindled_heart  the big one: the light drains into the fallen hero,
//                    then a Kiln Gold fire column, wings of flame rising on
//                    both sides, a jagged shock ring, a heal wash, embers, a
//                    scorch and the camera's punch
//   sealed_door      seal: violet chains cross over the party as the seal is
//                    set; refuse: the seal on the wall flares and a violet
//                    cross snaps over the seam. While the level's wall is
//                    sealed it wears violet chains and a slow violet pulse
//   dimmed_lantern   the room goes dark round the party's lanterns: a dark
//                    veil over the view with a pool of light round every
//                    standing hero (4.5 u, flickering like a lantern); the
//                    lanterns gutter as the room opens
//   heavy_crowns     a crown of violet spikes closes over the party
//
// createRelic6Fx(h) takes the signature director's helpers.
import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { PALETTE, VFX_MATTER, VFX_SIGNATURE } from '../../data/palette.js';
import { CURSES } from '../../sim/relics.js';

const PARCH = PALETTE.parchment;
const AMBER = PALETTE.hearthAmber;
const LAMP = '#FFD58A';
const GOLD = PALETTE.paleGold;
const KGOLD = VFX_MATTER.kilngold;
const KHEAT = VFX_MATTER.kilnheat;
const SOOT = '#2A2420';
const VIOLET = PALETTE.godstuffViolet;
const VIOLET_PEAK = PALETTE.godstuffVioletPeak;
const ROSE = VFX_SIGNATURE.duskwing.glow;
const MOON = VFX_SIGNATURE.duskwing.second;
const NIGHT = '#6A4FD0';
const PUMICE = '#B9B2A6';
const TAU = Math.PI * 2;
const HZ = 60;

// The Dimmed Lantern's dark: a camera-facing quad just past the near plane,
// its alpha the darkest of up to four holes of light (one per hero).
const DARK_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DARK_FRAG = `uniform vec3 uHoles[4]; uniform float uAspect; uniform float uDark; uniform vec3 uColor; uniform vec3 uWarm; varying vec2 vUv;
void main() {
  float a = 1.0; float rim = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 h = uHoles[i];
    if (h.z <= 0.0) continue;
    vec2 d = vUv - h.xy; d.x *= uAspect;
    float r = length(d) / h.z;
    float k = smoothstep(0.62, 1.12, r);
    a = min(a, k);
    rim = max(rim, (1.0 - smoothstep(0.0, 0.3, abs(r - 0.8))) * (1.0 - k));
  }
  gl_FragColor = vec4(mix(uColor, uWarm, rim * 0.6), a * uDark + rim * 0.08 * uDark);
}`;

export function createRelic6Fx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark, player, world, stage }) {
  const tickNow = () => (world && Number.isFinite(world.tick) ? world.tick : 0);
  // The wall's face, a step into the room.
  const face = (w, k = 0.35) => {
    const yaw = w.yaw ?? 0;
    return { x: w.x + Math.sin(yaw) * k, z: w.z + Math.cos(yaw) * k, dx: Math.sin(yaw), dz: Math.cos(yaw), yaw };
  };

  // ------------------------------------------------- Delver's Lantern --
  const marked = new Map(); // wall id -> seconds to its next mote
  bus.on('relic_proc', (ev) => {
    if (ev.relic !== 'delvers_lantern') return;
    mark('relic_delvers_lantern');
    const w = byId(ev.wall) ?? ev;
    const f = face(w, 0.35);
    const p = player();
    const px = p ? p.x : ev.px ?? f.x;
    const pz = p ? p.z : ev.pz ?? f.z + 3;
    // The beam: three warm rays from the hero's lantern to the seam.
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.12;
      kit.streak({ a: { x: px, y: 1.25 + off, z: pz }, b: { x: f.x, y: 0.7 + off, z: f.z }, width: 0.07 - i * 0.015, tailW: 0.02, core: PARCH, glow: LAMP, life: 0.45, delay: i * 0.04, fall: 0.3, opacity: 0.85 });
    }
    flare(px, 1.3, pz, LAMP, 0.7, { kind: 'star', life: 0.25 });
    after(0.12, () => {
      flare(f.x, 0.7, f.z, AMBER, 1.5, { kind: 'star', life: 0.4, spin: 3 });
      kit.flash({ x: f.x, y: 0.8, z: f.z, color: LAMP, size: 1.4, life: 0.5, hold: 0.12 });
      kit.pillar({ x: w.x, z: w.z, radius: 0.45, height: 5, color: AMBER, life: 1.6, opacity: 0.4 });
      kit.pillar({ x: w.x, z: w.z, radius: 0.12, height: 6, color: LAMP, life: 1.1, opacity: 0.8 });
      kit.light({ x: f.x, z: f.z, radius: 3.4, color: AMBER, opacity: 0.6, life: 1.8, attack: 0.05 });
      kit.ring({ x: f.x, z: f.z, r0: 0.3, r1: 1.8, width: 0.1, life: 0.7, core: PARCH, glow: AMBER, soft: 0.5, y: 0.05 });
      spray('spark', f.x, 0.5, f.z, N(14), { color: LAMP, speed: [0.1, 0.5], up: [0.8, 1.8], size: [0.04, 0.08], life: [0.9, 1.5], gravity: -0.2, drag: 1.3, jitter: 0.6, opacity: 0.95 });
    });
    if (ev.wall != null) marked.set(ev.wall, 0.5);
  });
  function lanternFrame(dt) {
    for (const [id, left] of marked) {
      const w = byId(id);
      if (!w || !w.shut) {
        marked.delete(id);
        continue;
      }
      const t = left - dt;
      if (t > 0) {
        marked.set(id, t);
        continue;
      }
      marked.set(id, 0.45);
      const f = face(w, 0.3);
      const along = rnd(-0.6, 0.6);
      spray('spark', f.x - f.dz * along, 0.25, f.z + f.dx * along, N(2), { color: LAMP, speed: [0.02, 0.1], up: [0.5, 0.9], size: [0.04, 0.07], life: [1.0, 1.4], gravity: -0.1, drag: 1.4, jitter: 0.05, opacity: 0.9 });
      if (rnd(0, 1) < 0.3) kit.ring({ x: f.x, z: f.z, r0: 0.9, r1: 1.3, width: 0.05, life: 0.9, core: LAMP, glow: AMBER, soft: 0.7, y: 0.04, opacity: 0.45 });
      kit.light({ x: f.x, z: f.z, radius: 1.8, color: AMBER, opacity: 0.22, life: 0.6 });
    }
  }

  // ------------------------------------------------------- Kiln Coal --
  const burning = new Map(); // enemy id -> { until (s left), t (s to the next lick) }
  function catchFlare(x, z, big = 1) {
    flare(x, 0.75, z, KGOLD, 0.9 * big, { kind: 'burst', life: 0.24, core: KHEAT });
    kit.ring({ x, z, r0: 0.15, r1: 0.9 * big, width: 0.08, life: 0.35, core: KHEAT, glow: KGOLD, soft: 0.5, y: 0.06 });
    spray('spark', x, 0.6, z, N(8), { color: KGOLD, speed: [0.3, 0.9], up: [1.0, 2.0], size: [0.03, 0.06], life: [0.4, 0.7], gravity: -0.3, drag: 1.2, jitter: 0.2, opacity: 1 });
  }
  bus.on('relic_proc', (ev) => {
    if (ev.relic !== 'kiln_coal') return;
    const b = byId(ev.target);
    const x = b ? b.x : ev.x ?? 0;
    const z = b ? b.z : ev.z ?? 0;
    if (ev.stage === 'alight') {
      mark('relic_kiln_coal');
      catchFlare(x, z);
      kit.light({ x, z, radius: 1.6, color: KGOLD, opacity: 0.45, life: 0.5 });
      const left = Math.max(0.3, ((ev.resolveTick ?? 0) - (ev.tick ?? tickNow())) / HZ || 4);
      if (ev.target != null) burning.set(ev.target, { until: left, t: 0 });
    } else {
      // A burn tick: a small hot flare where it lands.
      flare(x, 0.9, z, KHEAT, 0.45, { kind: 'star', life: 0.16 });
      spray('spark', x, 0.8, z, N(3), { color: KGOLD, speed: [0.2, 0.6], up: [0.8, 1.4], size: [0.03, 0.05], life: [0.3, 0.5], gravity: -0.2, drag: 1.2, jitter: 0.15, opacity: 1 });
    }
  });
  function burnFrame(dt) {
    for (const [id, b] of burning) {
      const e = byId(id);
      b.until -= dt;
      if (!e || !(e.hp > 0) || b.until <= 0) {
        burning.delete(id);
        continue;
      }
      b.t -= dt;
      if (b.t > 0) continue;
      b.t = 0.07;
      const s = e.radius ? Math.max(0.8, Math.min(2.2, e.radius / 0.35)) : 1;
      // Flame licks: short rising streaks, gold with a white-hot root.
      const a = rnd(0, TAU);
      const r = 0.18 * s * rnd(0.3, 1);
      const fx = e.x + Math.cos(a) * r;
      const fz = e.z + Math.sin(a) * r;
      const y0 = rnd(0.25, 0.7) * s;
      kit.streak({ a: { x: fx, y: y0, z: fz }, b: { x: fx + rnd(-0.06, 0.06), y: y0 + rnd(0.35, 0.6) * s, z: fz + rnd(-0.06, 0.06) }, width: 0.09 * s, tailW: 0, core: KHEAT, glow: KGOLD, life: 0.2, fall: -0.4, opacity: 0.9 });
      spray('spark', fx, y0 + 0.2, fz, N(1), { color: rnd(0, 1) < 0.3 ? KHEAT : KGOLD, speed: [0.05, 0.25], up: [0.9, 1.6], size: [0.03, 0.05], life: [0.4, 0.7], gravity: -0.4, drag: 1.2, jitter: 0.1, opacity: 1 });
      if (rnd(0, 1) < 0.25) spray('smoke', e.x, 0.9 * s, e.z, 1, { color: SOOT, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.25 * s, 0.4 * s], grow: 1.6, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.0, jitter: 0.15 });
      if (rnd(0, 1) < 0.3) kit.light({ x: e.x, z: e.z, radius: 1.1 * s, color: KGOLD, opacity: 0.3, life: 0.18 });
    }
  }

  // ----------------------------------------------- the small beats --
  bus.on('relic_proc', (ev) => {
    switch (ev.relic) {
      case 'pumice_soles': {
        mark('relic_pumice_soles');
        const b = byId(ev.target);
        const x = b ? b.x : ev.x ?? 0;
        const z = b ? b.z : ev.z ?? 0;
        kit.ring({ x, z, r0: 0.2, r1: 0.8, width: 0.07, life: 0.35, core: PARCH, glow: PUMICE, soft: 0.5, y: 0.05 });
        spray('chunk', x, 0.1, z, N(5), { color: PUMICE, speed: [0.4, 0.9], up: [0.5, 1.0], size: [0.03, 0.05], life: [0.3, 0.5], jitter: 0.2 });
        spray('smoke', x, 0.1, z, N(2), { color: PUMICE, speed: [0.2, 0.5], up: [0.05, 0.2], size: [0.25, 0.35], grow: 1.4, life: [0.4, 0.6], opacity: 0.3, drag: 2.6, jitter: 0.2 });
        break;
      }
      case 'wing_bone': {
        mark('relic_wing_bone');
        const b = byId(ev.target);
        const x = b ? b.x : ev.x ?? 0;
        const z = b ? b.z : ev.z ?? 0;
        const r = ev.radius ?? 1.4;
        // Two wings fold down onto the landing, three ribs a side.
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const a = side * (0.6 + k * 0.45);
            const tipX = x + Math.sin(a) * (1.6 - k * 0.2);
            const tipZ = z + Math.cos(a) * 0.4;
            kit.streak({ a: { x: tipX, y: 2.4 - k * 0.3, z: tipZ }, b: { x, y: 0.3, z }, width: 0.08 - k * 0.015, tailW: 0.1, core: MOON, glow: ROSE, life: 0.18, delay: k * 0.02, fall: 1.4, opacity: 0.9 });
          }
        }
        after(0.08, () => {
          flare(x, 0.4, z, ROSE, 1.2, { kind: 'star', life: 0.22, core: MOON });
          shock(x, z, r, ROSE, { life: 0.3, width: 0.12, core: MOON, jag: 0.3 });
          kit.ring({ x, z, r0: 0.2, r1: r * 0.7, width: 0.06, life: 0.4, core: MOON, glow: ROSE, soft: 0.5, y: 0.05, delay: 0.05 });
          kit.light({ x, z, radius: r + 0.8, color: ROSE, opacity: 0.45, life: 0.35 });
          spray('smoke', x, 0.15, z, N(5), { color: VFX_MATTER.dust, speed: [0.8, 1.6], up: [0.05, 0.2], size: [0.3, 0.45], grow: 1.5, life: [0.45, 0.7], opacity: 0.3, drag: 2.6, jitter: 0.2 });
          spray('spark', x, 0.3, z, N(8), { color: ROSE, speed: [0.8, 1.8], up: [0.3, 0.9], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 1.4, drag: 1.0, jitter: 0.2, opacity: 1 });
          kit.mark({ x, z, radius: r * 0.8, kind: 'crater', stain: PALETTE.voidCharcoal, glow: ROSE, cool: 0.8, life: 2.0, opacity: 0.3 });
          for (const id of ev.hit ?? []) {
            const e = byId(id);
            if (e) kit.flash({ x: e.x, y: 0.8, z: e.z, color: ROSE, size: 0.7, life: 0.18, hold: 0.04 });
          }
          if ((ev.hit ?? []).length) camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
        });
        break;
      }
      case 'crown_shard': {
        mark('relic_crown_shard');
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        const y = 1.4;
        const n = Math.max(1, Math.min(4, ev.powers ?? 1));
        kit.ring({ x, z, r0: 0.55, r1: 0.45, width: 0.08, life: 0.7, core: PARCH, glow: GOLD, soft: 0.4, y });
        const p = player();
        for (let i = 0; i < 2 * n + 3; i++) {
          const a = (i / (2 * n + 3)) * TAU;
          const tall = i % 2 === 0 && i / 2 < n;
          const cx = x + Math.cos(a) * 0.48;
          const cz = z + Math.sin(a) * 0.48;
          kit.streak({ a: { x: cx, y, z: cz }, b: { x: cx, y: y + (tall ? 0.5 : 0.2), z: cz }, width: tall ? 0.08 : 0.05, tailW: 0, core: PARCH, glow: GOLD, life: 0.6, delay: 0.03 * i, fall: 0, opacity: 0.95 });
          if (!tall) continue;
          // Each power's spike flares, then breaks into coins for the party.
          after(0.3 + 0.06 * i, () => {
            flare(cx, y + 0.55, cz, AMBER, 0.5, { kind: 'star', life: 0.3 });
            spray('spark', cx, y + 0.5, cz, N(5), { color: GOLD, speed: [0.3, 0.9], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.5, 0.8], gravity: 2.4, drag: 0.6, jitter: 0.2, opacity: 1 });
            if (!p) return;
            const mx = (cx + p.x) / 2;
            const mz = (cz + p.z) / 2;
            kit.streak({ a: { x: cx, y: y + 0.55, z: cz }, b: { x: mx, y: y + 1.0, z: mz }, width: 0.05, tailW: 0, core: PARCH, glow: GOLD, life: 0.2, delay: 0.05, fall: 1.0 });
            kit.streak({ a: { x: mx, y: y + 1.0, z: mz }, b: { x: p.x, y: 1.0, z: p.z }, width: 0.05, tailW: 0, core: PARCH, glow: GOLD, life: 0.2, delay: 0.13, fall: 1.0 });
          });
        }
        flare(x, y + 0.2, z, GOLD, 0.9, { kind: 'burst', life: 0.3 });
        kit.light({ x, z, radius: 1.6, color: GOLD, opacity: 0.35, life: 0.8 });
        break;
      }
      case 'dusk_lens': {
        mark('relic_dusk_lens');
        const b = byId(ev.target);
        const x = b ? b.x : ev.x ?? 0;
        const z = b ? b.z : ev.z ?? 0;
        const y = 1.35;
        // The lens focuses down onto the head; a glint crosses the glass.
        kit.ring({ x, z, r0: 1.1, r1: 0.3, width: 0.07, life: 0.3, core: MOON, glow: ROSE, soft: 0.4, y });
        kit.ring({ x, z, r0: 0.8, r1: 0.25, width: 0.04, life: 0.3, core: PARCH, glow: MOON, soft: 0.5, y: y + 0.05, delay: 0.05 });
        kit.streak({ a: { x: x - 0.55, y: y + 0.25, z }, b: { x: x + 0.55, y: y - 0.2, z }, width: 0.05, tailW: 0, core: PARCH, glow: MOON, life: 0.16, delay: 0.12, fall: 0 });
        after(0.25, () => {
          flare(x, y, z, ROSE, 0.8, { kind: 'star', life: 0.25, core: MOON });
          spray('smoke', x, y, z, N(2), { color: PALETTE.voidCharcoal, speed: [0.05, 0.2], up: [-0.1, 0.05], size: [0.35, 0.5], grow: 1.3, life: [0.5, 0.7], opacity: 0.5, drag: 2.0, jitter: 0.1 });
          spray('spark', x, y, z, N(5), { color: ROSE, speed: [0.1, 0.4], up: [-0.6, 0.0], size: [0.03, 0.05], life: [0.4, 0.6], gravity: 1.2, drag: 1.2, jitter: 0.2, opacity: 0.9 });
        });
        break;
      }
      case 'nightfall_veil': {
        mark('relic_nightfall_veil');
        const b = byId(ev.target);
        const x = b ? b.x : ev.x ?? 0;
        const z = b ? b.z : ev.z ?? 0;
        // A crescent cut: five short segments on an arc across the body.
        const a0 = rnd(0, TAU);
        const R = 0.7;
        let prev = null;
        for (let i = 0; i <= 5; i++) {
          const a = a0 + (i / 5) * 2.2;
          const pt = { x: x + Math.cos(a) * R, y: 0.6 + Math.sin((i / 5) * Math.PI) * 0.7, z: z + Math.sin(a) * R };
          if (prev) kit.streak({ a: prev, b: pt, width: 0.09 * Math.sin((i / 5) * Math.PI + 0.3), tailW: 0.02, core: VIOLET_PEAK, glow: NIGHT, life: 0.24, delay: i * 0.012, fall: 0.6 });
          prev = pt;
        }
        flare(x, 0.95, z, NIGHT, 1.0, { kind: 'star', life: 0.22, core: VIOLET_PEAK });
        kit.light({ x, z, radius: 1.5, color: NIGHT, opacity: 0.4, life: 0.3 });
        spray('spark', x, 1.0, z, N(6), { color: VIOLET_PEAK, speed: [0.1, 0.5], up: [-0.3, 0.3], size: [0.03, 0.05], life: [0.5, 0.8], gravity: 0.8, drag: 1.4, jitter: 0.3, opacity: 0.9 });
        break;
      }
      case 'rekindled_heart': {
        mark('relic_rekindled_heart');
        const b = byId(ev.target);
        const x = b ? b.x : ev.x ?? 0;
        const z = b ? b.z : ev.z ?? 0;
        const r = ev.radius ?? 2.5;
        // Anticipation: the heat drains into the fallen hero.
        anticipate(x, z, r, KGOLD, { y: 0.6, lines: 10, core: KHEAT });
        after(0.08, () => {
          flare(x, 1.0, z, KGOLD, 2.4, { kind: 'burst', life: 0.35, core: KHEAT });
          kit.flash({ x, y: 1.1, z, color: KHEAT, size: 2.4, life: 0.5, hold: 0.12 });
          kit.pillar({ x, z, radius: 0.7, height: 6.5, color: KGOLD, life: 1.2, opacity: 0.55 });
          kit.pillar({ x, z, radius: 0.22, height: 7.5, color: KHEAT, life: 0.8, opacity: 0.9 });
          kit.light({ x, z, radius: r + 2.5, color: KGOLD, opacity: 0.8, life: 1.4, attack: 0.02 });
          shock(x, z, r, KGOLD, { life: 0.45, width: 0.2, core: KHEAT, jag: 0.5 });
          kit.ring({ x, z, r0: 0.3, r1: r * 0.8, width: 0.1, life: 0.6, core: KHEAT, glow: KGOLD, soft: 0.5, y: 0.06, delay: 0.08 });
          // Wings of flame rise on both sides.
          for (const side of [-1, 1]) {
            for (let k = 0; k < 4; k++) {
              const ox = side * (0.4 + k * 0.45);
              kit.streak({ a: { x: x + ox * 0.3, y: 0.6, z }, b: { x: x + ox, y: 1.6 + k * 0.35 - (k > 2 ? 0.4 : 0), z: z + rnd(-0.1, 0.1) }, width: 0.12 - k * 0.02, tailW: 0.04, core: KHEAT, glow: KGOLD, life: 0.55, delay: 0.04 * k, fall: -0.5, opacity: 0.9 });
            }
          }
          spray('spark', x, 0.6, z, N(30), { color: KGOLD, speed: [0.6, 2.2], up: [1.2, 3.0], size: [0.04, 0.09], life: [0.7, 1.3], gravity: -0.15, drag: 1.0, jitter: 0.5, opacity: 1 });
          spray('smoke', x, 0.4, z, N(6), { color: SOOT, speed: [0.6, 1.4], up: [0.3, 0.8], size: [0.5, 0.8], grow: 1.8, life: [0.9, 1.3], opacity: 0.35, gravity: -0.15, drag: 2.0, jitter: 0.6 });
          kit.ring({ x, z, r0: 0.2, r1: 1.2, width: 0.12, life: 0.6, core: PARCH, glow: PALETTE.brightHeal, soft: 0.6, y: 0.07, delay: 0.25 });
          kit.mark({ x, z, radius: r * 0.75, kind: 'scorch', stain: PALETTE.voidCharcoal, glow: KGOLD, cool: 1.6, life: 4.0, opacity: 0.4 });
          embersUp(x, z, KGOLD, N(12), { radius: r * 0.6 });
          camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.14, 0.22);
        });
        break;
      }
      default:
        break;
    }
  });

  // ---------------------------------------------------- the curses --
  function violetCross(x, y, z, yaw, size = 0.8, life = 0.4) {
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    for (const sgn of [-1, 1]) {
      kit.streak({ a: { x: x - ux * size, y: y + sgn * size * 0.6, z: z - uz * size }, b: { x: x + ux * size, y: y - sgn * size * 0.6, z: z + uz * size }, width: 0.07, tailW: 0.07, core: VIOLET_PEAK, glow: VIOLET, life, fall: 0, opacity: 0.9 });
    }
  }
  bus.on('curse_proc', (ev) => {
    if (ev.curse !== 'sealed_door') return;
    if (ev.stage === 'seal') {
      mark('curse_sealed_door');
      const p = player();
      const x = p ? p.x : ev.x ?? 0;
      const z = p ? p.z : ev.z ?? 0;
      // Four chains drop across the party and a lock-ring snaps shut.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        kit.streak({ a: { x: x + Math.cos(a) * 2.6, y: 2.4, z: z + Math.sin(a) * 2.6 }, b: { x: x - Math.cos(a) * 2.6, y: 0.4, z: z - Math.sin(a) * 2.6 }, width: 0.06, tailW: 0.06, core: VIOLET_PEAK, glow: VIOLET, life: 0.6, delay: 0.05 * i, fall: 0.4 });
      }
      kit.ring({ x, z, r0: 2.2, r1: 0.6, width: 0.14, life: 0.55, core: VIOLET_PEAK, glow: VIOLET, soft: 0.4, y: 1.2, delay: 0.2 });
      after(0.45, () => flare(x, 1.2, z, VIOLET, 1.1, { kind: 'burst', life: 0.3 }));
      kit.light({ x, z, radius: 3, color: VIOLET, opacity: 0.4, life: 0.8 });
      return;
    }
    mark('curse_sealed_door_refuse');
    const w = byId(ev.wall) ?? ev;
    const f = face(w, 0.3);
    flare(f.x, 0.6, f.z, VIOLET, 1.1, { kind: 'burst', life: 0.25, core: VIOLET_PEAK });
    violetCross(f.x, 0.6, f.z, f.yaw, 0.7, 0.45);
    kit.ring({ x: f.x, z: f.z, r0: 0.3, r1: 1.4, width: 0.08, life: 0.35, core: VIOLET_PEAK, glow: VIOLET, soft: 0.5, y: 0.05 });
    kit.light({ x: f.x, z: f.z, radius: 2.0, color: VIOLET, opacity: 0.45, life: 0.4 });
    spray('spark', f.x, 0.6, f.z, N(8), { color: VIOLET, dir: { x: f.dx, z: f.dz }, dirBias: 0.6, speed: [0.4, 1.0], up: [0.3, 0.9], size: [0.03, 0.05], life: [0.3, 0.5], gravity: 1.2, drag: 1.0, jitter: 0.2, opacity: 1 });
  });
  bus.on('curse_apply', (ev) => {
    const p = player();
    const x = p ? p.x : ev.x ?? 0;
    const z = p ? p.z : ev.z ?? 0;
    if (ev.curse === 'dimmed_lantern') {
      // The lanterns gutter: six warm flames round the party shrink and go
      // out in soot as the dark comes down.
      mark('curse_dimmed_lantern');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.2;
        const lx = x + Math.cos(a) * 3.2;
        const lz = z + Math.sin(a) * 3.2;
        flare(lx, 0.6, lz, LAMP, 0.7, { kind: 'star', life: 0.5, delay: 0.05 * i });
        after(0.35 + 0.05 * i, () => spray('smoke', lx, 0.6, lz, N(2), { color: SOOT, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.25, 0.4], grow: 1.6, life: [0.8, 1.1], opacity: 0.4, drag: 2.0, jitter: 0.1 }));
      }
      dimFade = 0;
    } else if (ev.curse === 'heavy_crowns') {
      // A crown of violet spikes closes over the party.
      mark('curse_heavy_crowns');
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const cx = x + Math.cos(a) * 1.1;
        const cz = z + Math.sin(a) * 1.1;
        kit.streak({ a: { x: cx, y: 2.2, z: cz }, b: { x: cx, y: 2.2 + (i % 3 === 0 ? 0.8 : 0.4), z: cz }, width: 0.08, tailW: 0, core: VIOLET_PEAK, glow: VIOLET, life: 0.9, delay: 0.3 + 0.03 * i, fall: 0 });
      }
      kit.ring({ x, z, r0: 1.3, r1: 1.05, width: 0.1, life: 0.9, core: GOLD, glow: VIOLET, soft: 0.4, y: 2.2, delay: 0.3 });
      after(0.7, () => flare(x, 2.6, z, VIOLET, 1.2, { kind: 'burst', life: 0.35 }));
    }
  });

  // -------------------------------------- the sealed wall's chains --
  // While the level's wall is sealed it wears violet chains: a slow pulse
  // and a cross over its seam every beat (read off the run view a few times
  // a second, never every frame).
  let sealedNow = false;
  let dimNow = 0;
  let viewClock = 0;
  let sealClock = 0;
  function readView(dt) {
    viewClock -= dt;
    if (viewClock > 0) return;
    viewClock = 0.2;
    try {
      const r = world.runSystem?.()?.view?.()?.relics;
      sealedNow = !!(r && r.sealed);
      dimNow = r && r.dim ? r.dim : 0;
    } catch {
      sealedNow = false;
      dimNow = 0;
    }
  }
  function sealFrame(dt, entities) {
    if (!sealedNow) return;
    sealClock -= dt;
    if (sealClock > 0) return;
    sealClock = 1.1;
    for (const e of entities) {
      if (e.kind !== 'secret_wall' || !e.shut) continue;
      const f = face(e, 0.28);
      violetCross(f.x, 0.62, f.z, f.yaw, 0.6, 1.0);
      kit.light({ x: f.x, z: f.z, radius: 1.5, color: VIOLET, opacity: 0.3, life: 1.0 });
      spray('spark', f.x, 0.3, f.z, N(2), { color: VIOLET, speed: [0.02, 0.1], up: [0.3, 0.6], size: [0.04, 0.06], life: [0.8, 1.1], gravity: -0.1, drag: 1.5, jitter: 0.5, opacity: 0.8 });
    }
  }

  // ------------------------------------------ the Dimmed Lantern's dark --
  let dark = null;
  const darkU = {
    uHoles: { value: [new Vector3(), new Vector3(), new Vector3(), new Vector3()] },
    uAspect: { value: 1 },
    uDark: { value: 0 },
    uColor: { value: new Color('#06040B') },
    uWarm: { value: new Color(LAMP) },
  };
  if (stage && stage.scene && stage.camera) {
    const mat = new ShaderMaterial({ uniforms: darkU, vertexShader: DARK_VERT, fragmentShader: DARK_FRAG, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    dark = new Mesh(new PlaneGeometry(1, 1), mat);
    dark.frustumCulled = false;
    dark.renderOrder = 985;
    dark.visible = false;
    stage.scene.add(dark);
  }
  let dimFade = 0;
  let clock = 0;
  const v = new Vector3();
  const edge = new Vector3();
  const fwd = new Vector3();
  function darkFrame(dt, entities) {
    if (!dark) return;
    clock += dt;
    dimFade = dimNow > 0 ? Math.min(1, dimFade + dt / 0.9) : Math.max(0, dimFade - dt / 0.5);
    dark.visible = dimFade > 0.001;
    if (!dark.visible) return;
    const cam = stage.camera;
    const dist = (cam.near ?? 0.1) * 1.6;
    cam.getWorldDirection(fwd);
    const h = 2 * dist * Math.tan(((cam.fov ?? 50) * Math.PI) / 360);
    const asp = cam.aspect ?? 1;
    dark.position.copy(cam.position).addScaledVector(fwd, dist);
    dark.quaternion.copy(cam.quaternion);
    dark.scale.set(h * asp * 1.02, h * 1.02, 1);
    const R = dimNow > 0 ? dimNow : CURSES.dimmed_lantern.dim.radius;
    let k = 0;
    for (const e of entities) {
      if (k >= 4) break;
      if (e.partyIndex === undefined || !(e.hp > 0)) continue;
      // A lantern flickers: the pool breathes a little.
      const flick = 1 + 0.03 * Math.sin(clock * 9 + k * 1.7) + 0.02 * Math.sin(clock * 23 + k);
      v.set(e.x, 0.3, e.z).project(cam);
      edge.set(e.x + R * flick, 0.3, e.z).project(cam);
      const rr = Math.hypot(((edge.x - v.x) / 2) * asp, (edge.y - v.y) / 2);
      darkU.uHoles.value[k].set((v.x + 1) / 2, (v.y + 1) / 2, rr);
      k += 1;
    }
    for (; k < 4; k++) darkU.uHoles.value[k].set(0, 0, 0);
    darkU.uAspect.value = asp;
    darkU.uDark.value = 0.72 * dimFade;
  }

  function frame(dt, entities) {
    readView(dt);
    lanternFrame(dt);
    burnFrame(dt);
    sealFrame(dt, entities || []);
    darkFrame(dt, entities || []);
  }
  function teardown() {
    marked.clear();
    burning.clear();
    dimFade = 0;
    dimNow = 0;
    sealedNow = false;
    if (dark) dark.visible = false;
  }
  return { frame, teardown };
}
