// THE BELLWRIGHT's beats (docs/BELLWRIGHT.md): Tolly's bells made visible.
// Bell Brass carries the body of every effect, Verdigris its cool edge, Old
// Bronze the grit. The class's generic shape recipes in signature.js still
// play under these (her release and nova); this layer adds what only a bell
// caster has:
//   - a real bell in the room for every Hang Bell: it drops onto a little
//     timber frame with a thunk, swings and throws a ring of sound across
//     the floor on every toll, and lifts away in a last chime when it ends;
//   - the Peal: every bell she has hung rocks at once, each throwing a
//     double shock ring and a column of struck light, the camera kicked;
//   - the Clapper: a brass star where it lands inside a ring.
//
// createBellFx(h) takes the signature director's helpers (its kit, bus,
// spray with the particle budget, flare/shock/after/anticipate, the camera)
// plus the stage, and returns { frame(dt) } for its per-frame loop. Listen
// only: event payloads in, meshes and particles out.
import { ConeGeometry, CylinderGeometry, Group, LatheGeometry, Mesh, SphereGeometry, Vector2 } from 'three';
import { PALETTE, VFX_SIGNATURE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { mix } from '../critters/common.js';

const BRASS = VFX_SIGNATURE.bellwright.glow;
const VERDI = VFX_SIGNATURE.bellwright.second;
const BRONZE = VFX_SIGNATURE.bellwright.debris;
const PARCH = PALETTE.parchment;
const INK = PALETTE.voidCharcoal;
const TAU = Math.PI * 2;
const BELL_Y = 1.05; // the bell's crown, hung from the frame's beam
const DROP_SEC = 0.22;
const MAX_BELLS = 12; // render cap (three per Bellwright, four seats)

// Shared geometry and materials, built once.
let shared = null;
function sharedParts() {
  if (shared) return shared;
  // Bottom to top, so the lathe's faces point outward.
  const profile = [
    [0.0, -0.315],
    [0.19, -0.315],
    [0.19, -0.3],
    [0.15, -0.26],
    [0.12, -0.2],
    [0.11, -0.12],
    [0.1, -0.05],
    [0.06, -0.01],
    [0.0, 0.0],
  ].map(([x, y]) => new Vector2(x, y));
  shared = {
    bell: new LatheGeometry(profile, 24),
    lip: new CylinderGeometry(0.195, 0.195, 0.025, 24, 1, true),
    tongue: new SphereGeometry(0.045, 10, 8),
    post: new CylinderGeometry(0.022, 0.03, 1.2, 6),
    beam: new CylinderGeometry(0.026, 0.026, 0.62, 6),
    cap: new ConeGeometry(0.05, 0.06, 8),
    bellMat: toonMaterial({ color: mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.28).getHex() }),
    lipMat: toonMaterial({ color: mix(VERDI, PALETTE.voidCharcoal, 0.2).getHex() }),
    woodMat: toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.3).getHex() }),
    inkMat: toonMaterial({ color: INK }),
  };
  return shared;
}

function buildBell() {
  const S = sharedParts();
  const g = new Group();
  // An A-frame of two leaning posts and a beam.
  for (const side of [-1, 1]) {
    const post = new Mesh(S.post, S.woodMat);
    post.position.set(side * 0.27, 0.58, 0);
    post.rotation.z = side * 0.1;
    g.add(post);
  }
  const beam = new Mesh(S.beam, S.woodMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = BELL_Y + 0.13;
  g.add(beam);
  const swing = new Group();
  swing.position.y = BELL_Y + 0.1;
  g.add(swing);
  const cap = new Mesh(S.cap, S.woodMat);
  cap.position.y = -0.01;
  swing.add(cap);
  const bellMesh = new Mesh(S.bell, S.bellMat);
  bellMesh.position.y = -0.03;
  swing.add(bellMesh);
  const lip = new Mesh(S.lip, S.lipMat);
  lip.position.y = -0.33;
  swing.add(lip);
  const tongue = new Mesh(S.tongue, S.inkMat);
  tongue.position.y = -0.3;
  swing.add(tongue);
  return { g, swing, tongue };
}

export function createBellFx({ kit, bus, byId, spray, flare, shock, after, anticipate, camfx, N, rnd, mark, stage }) {
  const root = new Group();
  root.name = 'bellfx';
  if (stage && stage.scene) stage.scene.add(root);
  const bells = new Map(); // azone id -> { x, z, r, g, swing, tongue, t, swingV, drop, leave }

  const sparks = (x, y, z, n, o = {}) =>
    spray('spark', x, y, z, n, { color: o.color ?? BRASS, speed: o.speed ?? [1.2, 2.6], up: o.up ?? [0.6, 1.8], size: o.size ?? [0.05, 0.09], life: o.life ?? [0.3, 0.55], gravity: 4, drag: 1.2, jitter: o.jitter ?? 0.1 });
  const dust = (x, z, n, o = {}) =>
    spray('smoke', x, 0.12, z, n, { color: o.color ?? BRONZE, speed: [0.3, 0.9], up: [0.05, 0.25], size: [0.28, 0.42], grow: 1.5, life: [0.5, 0.9], opacity: 0.25, gravity: 0, drag: 2.4, jitter: o.jitter ?? 0.25 });
  // A ring of sound rolling across the floor: a bright brass band with a
  // verdigris edge, and a fainter echo behind it.
  function soundRing(x, z, r, { delay = 0, gain = 1, y = 0.05 } = {}) {
    kit.ring({ x, z, r0: 0.2, r1: r, width: 0.08 * gain, life: 0.42, core: PARCH, glow: BRASS, soft: 0.35, y, delay, opacity: 0.8 * Math.min(1, gain) });
    kit.ring({ x, z, r0: 0.15, r1: r * 0.8, width: 0.05, life: 0.5, core: VERDI, glow: VERDI, soft: 0.5, y, delay: delay + 0.08, opacity: 0.45 * Math.min(1, gain) });
  }
  // The bell's own voice drawn at its mouth: a flash, a burst and sparks.
  function strike(b, gain = 1) {
    const y = BELL_Y - 0.25;
    kit.flash({ x: b.x, y, z: b.z, color: PARCH, size: 0.35 * gain, life: 0.12 });
    flare(b.x, y, b.z, BRASS, 0.9 * gain, { kind: 'burst', life: 0.22, core: PARCH });
    kit.light({ x: b.x, z: b.z, radius: 0.9 * gain, color: BRASS, opacity: 0.35 * gain, life: 0.25 });
    if (gain > 1) sparks(b.x, y, b.z, N(8), { speed: [1.5, 3.0] });
  }

  // ------------------------------------------------------------ bells --
  bus.on('azone_spawn', (ev) => {
    if (!ev.bell || ev.x == null) return;
    mark('bell:hang');
    if (bells.size >= MAX_BELLS) drop(bells.keys().next().value, false);
    const parts = buildBell();
    parts.g.position.set(ev.x, 2.2, ev.z);
    parts.g.rotation.y = rnd(0, TAU);
    root.add(parts.g);
    const b = { x: ev.x, z: ev.z, r: ev.radius ?? 1.3, ...parts, t: 0, swingV: 0, angle: 0.5, drop: DROP_SEC, leave: -1 };
    bells.set(ev.id, b);
    anticipate(ev.x, ev.z, 0.5, BRASS, { core: PARCH, lines: 6 });
    // The ring on the ground she hangs it over, drawn as it lands.
    after(DROP_SEC, () => {
      if (!bells.has(ev.id)) return;
      kit.mark({ x: b.x, z: b.z, radius: b.r, kind: 'sigil', stain: INK, glow: BRASS, glowOpacity: 0.3, cool: 1.4, life: 8.5, opacity: 0.22 });
      dust(b.x, b.z, N(5));
      shock(b.x, b.z, 0.7, BRONZE, { life: 0.25, width: 0.06, core: VERDI });
      soundRing(b.x, b.z, b.r, { gain: 0.8 });
      b.swingV = 3.5;
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.012, 0.08);
    });
  });
  bus.on('azone_tick', (ev) => {
    const b = bells.get(ev.id);
    if (!b) return;
    mark('bell:toll');
    // A toll: the bell rocks, a ring of sound rolls out to the edge of its
    // ring, and every enemy it shook gets a little brass shiver.
    b.swingV += 4.2 * (ev.n % 2 === 0 ? 1 : -1);
    strike(b, 0.8);
    soundRing(b.x, b.z, b.r);
    for (const id of ev.hit || []) {
      const t = byId(id);
      if (t) flare(t.x, 0.55, t.z, BRASS, 0.45, { kind: 'star', life: 0.16, core: VERDI });
    }
  });
  bus.on('azone_expire', (ev) => {
    if (bells.has(ev.id)) drop(ev.id, !ev.replaced);
  });
  function drop(id, chime) {
    const b = bells.get(id);
    if (!b) return;
    bells.delete(id);
    if (chime) {
      strike(b, 0.6);
      soundRing(b.x, b.z, b.r * 0.7, { gain: 0.6 });
    }
    sparks(b.x, BELL_Y - 0.2, b.z, N(5), { color: VERDI, speed: [0.6, 1.4], up: [0.4, 1.2] });
    dust(b.x, b.z, N(3));
    b.leave = 0.25;
    leaving.push(b);
  }
  const leaving = [];

  // ------------------------------------------------------------ casts --
  bus.on('ally_cast', (ev) => {
    if (ev.classId !== 'bellwright' || ev.x == null) return;
    if (ev.skill === 'peal') {
      mark('bell:peal');
      const centres = Array.isArray(ev.bells) && ev.bells.length ? ev.bells : [{ id: null, x: ev.x, z: ev.z }];
      const R = ev.radius ?? 1.5;
      centres.forEach((c, i) => {
        const delay = i * 0.04;
        const b = c.id != null ? bells.get(c.id) : null;
        if (b) b.swingV += 9;
        after(delay, () => {
          const at = b ?? { x: c.x, z: c.z };
          strike(at, 1.6);
          shock(c.x, c.z, R * 1.1, BRASS, { life: 0.34, width: 0.13, core: PARCH });
          shock(c.x, c.z, R * 1.5, VERDI, { life: 0.5, width: 0.08, core: VERDI, delay: 0.07 });
          kit.pillar({ x: c.x, z: c.z, radius: 0.32, height: 2.6, color: BRASS, life: 0.4, opacity: 0.45 });
          kit.light({ x: c.x, z: c.z, radius: R * 1.4, color: BRASS, opacity: 0.55, life: 0.35, attack: 0.02 });
          kit.mark({ x: c.x, z: c.z, radius: R * 0.9, kind: 'sigil', stain: INK, glow: BRASS, glowOpacity: 0.4, cool: 1.0, life: 1.6, opacity: 0.3 });
          for (let k = 0; k < N(10); k++) {
            const a = (k / 10) * TAU + rnd(-0.15, 0.15);
            sparks(c.x + Math.cos(a) * 0.2, 0.4, c.z + Math.sin(a) * 0.2, 1, { speed: [2.0, 3.4], up: [0.4, 1.0], color: k % 3 === 0 ? VERDI : BRASS });
          }
        });
      });
      for (const id of ev.targets || []) {
        const t = byId(id);
        if (t) after(0.05, () => flare(t.x, 0.95, t.z, BRASS, 0.7, { kind: 'star', life: 0.32, core: PARCH, spin: 2.5 }));
      }
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.04 + 0.01 * Math.min(3, centres.length), 0.14);
    } else if (ev.skill === 'clapper') {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      kit.ring({ x: ev.x + dx * 0.35, z: ev.z + dz * 0.35, r0: 0.06, r1: 0.32, width: 0.05, life: 0.16, core: PARCH, glow: BRASS, soft: 0.3, y: 0.55 });
    }
  });
  bus.on('bell_ring_hit', (ev) => {
    if (!Number.isFinite(ev.x)) return;
    mark('bell:ring_hit');
    flare(ev.x, 0.6, ev.z, BRASS, 1.0, { kind: 'star', life: 0.24, core: PARCH, spin: 1.5 });
    shock(ev.x, ev.z, 0.6, VERDI, { life: 0.22, width: 0.06, core: PARCH, y: 0.3 });
    const b = bells.get(ev.bell);
    if (b) b.swingV += 2.5;
  });

  // ------------------------------------------------------------ frame --
  function frame(dt) {
    for (const b of bells.values()) {
      b.t += dt;
      if (b.drop > 0) {
        b.drop = Math.max(0, b.drop - dt);
        const k = 1 - b.drop / DROP_SEC;
        b.g.position.y = 2.2 * (1 - k * k);
      }
      // A damped pendulum: struck, it rocks and settles.
      b.swingV += -b.angle * 38 * dt - b.swingV * 2.6 * dt;
      b.angle += b.swingV * dt;
      b.swing.rotation.x = Math.max(-0.7, Math.min(0.7, b.angle));
      b.tongue.position.z = -b.angle * 0.05;
    }
    for (let i = leaving.length - 1; i >= 0; i--) {
      const b = leaving[i];
      b.leave -= dt;
      const k = Math.max(0, b.leave / 0.25);
      b.g.scale.setScalar(0.3 + 0.7 * k);
      b.g.position.y = (1 - k) * 0.6;
      if (b.leave <= 0) {
        root.remove(b.g);
        leaving.splice(i, 1);
      }
    }
  }

  return { frame, count: () => bells.size };
}
