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
// Her whole kit (content plan 4, slice 5) adds:
//   - the Great Bell: a bigger bell that lands like a weight, and Wing Hop's
//     little handbell, left behind as her wing cases flick her away;
//   - the Knell: a struck note rolling down its line as a train of arcs;
//   - Bell Swing: the belfry bell itself swung through the arc on a chain;
//   - Vesper Chime and Tuning Fork: a chime bell over each ward, the fork's
//     standing wave round her and haste lines on every ally it reaches;
//   - the Carillon: every bell at once, joined by a brass chord of light,
//     then each bell's ring drawn again as its time starts over;
//   - Sympathy's answering toll and Aftertone's extra time.
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
const MAX_BELLS = 16; // render cap (up to four per Bellwright with Belfry, four seats)

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
  const bells = new Map(); // azone id -> { x, z, r, size, g, swing, tongue, t, swingV, drop, leave }
  // Bells that only live for a beat: Bell Swing's swung bell and the chime
  // bells over Vesper Chime's wards ({ g, swing, t, life, step(o, k) }).
  const flying = [];

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
    const size = ev.bellSize ?? 1;
    const great = size > 1.1;
    const hand = size < 0.9;
    parts.g.position.set(ev.x, 2.2, ev.z);
    parts.g.rotation.y = rnd(0, TAU);
    parts.g.scale.setScalar(size);
    root.add(parts.g);
    const b = { x: ev.x, z: ev.z, r: ev.radius ?? 1.3, size, ...parts, t: 0, swingV: 0, angle: 0.5, drop: hand ? DROP_SEC * 0.5 : DROP_SEC, drop0: hand ? DROP_SEC * 0.5 : DROP_SEC, leave: -1 };
    bells.set(ev.id, b);
    if (!hand) anticipate(ev.x, ev.z, 0.5 * size, BRASS, { core: PARCH, lines: great ? 10 : 6 });
    // The ring on the ground she hangs it over, drawn as it lands (it lasts
    // as long as the bell tolls).
    const life = (ev.totalTicks ?? 8) + 0.5;
    after(b.drop0, () => {
      if (!bells.has(ev.id)) return;
      sigil(b, life);
      dust(b.x, b.z, N(great ? 9 : hand ? 3 : 5));
      shock(b.x, b.z, 0.7 * size, BRONZE, { life: 0.25, width: 0.06 * size, core: VERDI });
      soundRing(b.x, b.z, b.r, { gain: great ? 1.2 : 0.8 });
      b.swingV = 3.5;
      camfx.kick(rnd(-1, 1), rnd(-1, 1), great ? 0.035 : hand ? 0.006 : 0.012, great ? 0.12 : 0.08);
      if (great) {
        // The weight of it: a crack of bronze grit and a second, slower ring.
        kit.crack({ x: b.x, z: b.z, radius: b.r * 0.55, glow: BRASS, life: 1.4, cool: 0.4 });
        shock(b.x, b.z, b.r * 1.15, BRASS, { life: 0.45, width: 0.1, core: PARCH, delay: 0.06 });
        sparks(b.x, 0.25, b.z, N(10), { color: BRONZE, speed: [1.6, 3.2], up: [0.8, 1.6] });
      }
    });
  });
  bus.on('azone_tick', (ev) => {
    const b = bells.get(ev.id);
    if (!b) return;
    mark('bell:toll');
    // A toll: the bell rocks, a ring of sound rolls out to the edge of its
    // ring, and every enemy it shook gets a little brass shiver.
    b.swingV += (b.size > 1.1 ? 3.2 : 4.2) * (ev.n % 2 === 0 ? 1 : -1);
    strike(b, 0.8 * b.size);
    soundRing(b.x, b.z, b.r, { gain: b.size > 1.1 ? 1.25 : b.size < 0.9 ? 0.7 : 1 });
    if (b.size > 1.1) soundRing(b.x, b.z, b.r * 1.08, { delay: 0.12, gain: 0.6 });
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
  // The bell's ring on the floor, for as long as it tolls.
  function sigil(b, life) {
    kit.mark({ x: b.x, z: b.z, radius: b.r, kind: 'sigil', stain: INK, glow: BRASS, glowOpacity: 0.3, cool: 1.4, life, opacity: 0.22 });
  }
  // A brass bell that lives for a beat (Bell Swing, Vesper Chime).
  function flyBell(size, life, step) {
    const parts = buildBell();
    parts.g.children.slice(0, 3).forEach((m) => (m.visible = false)); // no frame: just the bell
    parts.g.scale.setScalar(size);
    root.add(parts.g);
    const f = { ...parts, size, t: 0, life, step };
    step(f, 0);
    flying.push(f);
    return f;
  }

  // Sympathy: a ring hit makes the bell answer at once.
  bus.on('bell_sympathy', (ev) => {
    const b = bells.get(ev.id);
    if (!b) return;
    mark('bell:sympathy');
    b.swingV += 5;
    strike(b, 1.1);
    soundRing(b.x, b.z, b.r, { gain: 1.1 });
    kit.pillar({ x: b.x, z: b.z, radius: 0.18, height: 1.6, color: VERDI, life: 0.25, opacity: 0.35 });
  });
  // The Carillon and Aftertone: the bell's time starts over (or runs on), so
  // its ring is drawn again with what is left, and a glint climbs the frame.
  bus.on('bell_rehang', (ev) => {
    const b = bells.get(ev.id);
    if (!b) return;
    mark('bell:rehang');
    after(0.18, () => {
      if (!bells.has(ev.id)) return;
      sigil(b, (ev.left ?? 1) + 0.5);
      kit.ring({ x: b.x, z: b.z, r0: b.r, r1: b.r * 0.85, width: 0.07, life: 0.5, core: PARCH, glow: VERDI, soft: 0.4, y: 0.04, opacity: 0.7 });
      sparks(b.x, 0.3, b.z, N(6), { color: VERDI, speed: [0.2, 0.6], up: [2.2, 3.2], life: [0.5, 0.8] });
    });
  });

  // ------------------------------------------------------------ casts --
  bus.on('ally_cast', (ev) => {
    if (ev.classId !== 'bellwright' || ev.x == null) return;
    if (ev.skill === 'peal' || ev.skill === 'carillon') {
      mark(`bell:${ev.skill}`);
      // The Carillon is the Peal at full weight: every column taller, the
      // shock rings wider, and the bells joined by a brass chord of light.
      const big = ev.skill === 'carillon';
      const g = big ? 1.35 : 1;
      const centres = Array.isArray(ev.bells) && ev.bells.length ? ev.bells : [{ id: null, x: ev.x, z: ev.z }];
      const R = ev.radius ?? 1.5;
      centres.forEach((c, i) => {
        const delay = i * (big ? 0.07 : 0.04);
        const b = c.id != null ? bells.get(c.id) : null;
        if (b) b.swingV += big ? 12 : 9;
        after(delay, () => {
          const at = b ?? { x: c.x, z: c.z };
          strike(at, 1.6 * g);
          shock(c.x, c.z, R * 1.1, BRASS, { life: 0.34, width: 0.13 * g, core: PARCH });
          shock(c.x, c.z, R * 1.5, VERDI, { life: 0.5, width: 0.08 * g, core: VERDI, delay: 0.07 });
          if (big) shock(c.x, c.z, R * 1.9, BRASS, { life: 0.62, width: 0.06, core: PARCH, delay: 0.16 });
          kit.pillar({ x: c.x, z: c.z, radius: 0.32 * g, height: 2.6 * g, color: BRASS, life: 0.4 * g, opacity: 0.45 });
          kit.light({ x: c.x, z: c.z, radius: R * 1.4, color: BRASS, opacity: 0.55, life: 0.35 * g, attack: 0.02 });
          kit.mark({ x: c.x, z: c.z, radius: R * 0.9, kind: 'sigil', stain: INK, glow: BRASS, glowOpacity: 0.4, cool: 1.0, life: 1.6, opacity: 0.3 });
          const n = big ? 14 : 10;
          for (let k = 0; k < N(n); k++) {
            const a = (k / n) * TAU + rnd(-0.15, 0.15);
            sparks(c.x + Math.cos(a) * 0.2, 0.4, c.z + Math.sin(a) * 0.2, 1, { speed: [2.0 * g, 3.4 * g], up: [0.4, 1.0 * g], color: k % 3 === 0 ? VERDI : BRASS });
          }
        });
      });
      if (big && centres.length > 1) {
        // The chord: each bell joined to the next by a line of struck light.
        const ring = [...centres].sort((p, q) => Math.atan2(p.z - ev.z, p.x - ev.x) - Math.atan2(q.z - ev.z, q.x - ev.x));
        ring.forEach((c, i) => {
          const d = ring[(i + 1) % ring.length];
          if (ring.length === 2 && i === 1) return;
          kit.streak({ a: { x: c.x, y: BELL_Y - 0.2, z: c.z }, b: { x: d.x, y: BELL_Y - 0.2, z: d.z }, width: 0.12, tailW: 0.12, core: PARCH, glow: BRASS, life: 0.45, fall: 1.4, opacity: 0.75, delay: 0.05 + i * 0.07 });
        });
      }
      for (const id of ev.targets || []) {
        const t = byId(id);
        if (t) after(0.05, () => flare(t.x, 0.95, t.z, BRASS, 0.7 * g, { kind: 'star', life: 0.32, core: PARCH, spin: 2.5 }));
      }
      camfx.kick(rnd(-1, 1), rnd(-1, 1), (big ? 0.06 : 0.04) + 0.01 * Math.min(3, centres.length), big ? 0.2 : 0.14);
    } else if (CAST[ev.skill]) {
      CAST[ev.skill](ev);
    } else if (ev.skill === 'clapper') {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      kit.ring({ x: ev.x + dx * 0.35, z: ev.z + dz * 0.35, r0: 0.06, r1: 0.32, width: 0.05, life: 0.16, core: PARCH, glow: BRASS, soft: 0.3, y: 0.55 });
    }
  });
  // Her whole kit's own beats (slice 5).
  const CAST = {
    // The Knell: the note leaves her mallet as a hard brass ring, then rolls
    // down its line as a train of arcs bowed forward, each arriving with the
    // bolt, a faint wake of verdigris under them.
    knell(ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const ang = Math.atan2(dz, dx);
      const reach = 5.5;
      const speed = 7.0;
      const mx = ev.x + dx * 0.4;
      const mz = ev.z + dz * 0.4;
      shock(mx, mz, 0.7, BRASS, { life: 0.2, width: 0.08, core: PARCH, y: 0.55 });
      flare(mx, 0.55, mz, BRASS, 1.1, { kind: 'burst', life: 0.2, core: PARCH, angle: ang });
      for (let i = 1; i <= 6; i++) {
        const d = (i / 6) * reach;
        kit.slash({ x: ev.x + dx * (d - 0.5), z: ev.z + dz * (d - 0.5), angle: ang, radius: 0.5 + i * 0.05, width: 0.09, span: Math.PI * 0.55, sweep: 0.02, life: 0.22, delay: d / speed, core: PARCH, glow: i % 2 ? BRASS : VERDI, soft: 0.35, y: 0.5, lift: 0, tail: 1, gain: 1.1, opacity: 0.85 });
      }
      kit.streak({ a: { x: mx, y: 0.08, z: mz }, b: { x: ev.x + dx * reach, y: 0.08, z: ev.z + dz * reach }, width: 0.3, tailW: 0.1, core: VERDI, glow: VERDI, life: reach / speed + 0.3, fall: 1.6, opacity: 0.25 });
      camfx.kick(-dx, -dz, 0.015, 0.06);
    },
    // Bell Swing: the belfry bell itself, swung through the arc on its
    // chain, a brass wake behind it and a clang where it bottoms out.
    bell_swing(ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const ang = Math.atan2(dz, dx);
      const reach = ev.reach ?? 1.9;
      const half = ((ev.halfAngle ?? 60) * Math.PI) / 180;
      const side = rnd(0, 1) < 0.5 ? 1 : -1;
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: reach * 0.85, width: 0.32, span: half * 2, sweep: 0.2, life: 0.38, core: PARCH, glow: BRASS, soft: 0.3, lift: 0.18, y: 0.55, reverse: side < 0, gain: 1.15, tail: 0.9 });
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: reach * 0.6, width: 0.16, span: half * 1.8, sweep: 0.24, life: 0.4, core: VERDI, glow: VERDI, soft: 0.7, y: 0.3, reverse: side < 0, gain: 0.6, opacity: 0.55 });
      flyBell(1.05, 0.42, (f, k) => {
        const a = ang - side * half + side * 2 * half * Math.min(1, k / 0.6);
        const r = reach * 0.78;
        f.g.position.set(ev.x + Math.cos(a) * r, 0.05 + 0.25 * Math.sin(Math.min(1, k / 0.6) * Math.PI), ev.z + Math.sin(a) * r);
        f.g.rotation.y = -a;
        f.swing.rotation.x = side * (0.9 - 1.8 * Math.min(1, k / 0.6));
        f.g.scale.setScalar(f.size * (k > 0.75 ? 1 - (k - 0.75) * 3.6 : 1));
      });
      after(0.17, () => {
        const cx = ev.x + dx * reach * 0.75;
        const cz = ev.z + dz * reach * 0.75;
        flare(cx, 0.5, cz, BRASS, 1.2, { kind: 'burst', life: 0.2, core: PARCH, angle: ang });
        shock(cx, cz, 0.8, BRASS, { life: 0.24, width: 0.08, core: PARCH, y: 0.3 });
        sparks(cx, 0.45, cz, N(8), { speed: [1.8, 3.0] });
        camfx.kick(dx, dz, 0.03, 0.09);
      });
    },
    // Wing Hop: the wing cases flick open where she stood (two bronze arcs and
    // a puff), and a line of verdigris follows her to where she lands.
    wing_hop(ev) {
      const ox = Number.isFinite(ev.zx) ? ev.zx : ev.x;
      const oz = Number.isFinite(ev.zz) ? ev.zz : ev.z;
      const ang = Math.atan2(ev.z - oz, ev.x - ox);
      for (const sd of [-1, 1]) kit.slash({ x: ox, z: oz, angle: ang + Math.PI + sd * 0.9, radius: 0.5, width: 0.14, span: 1.1, sweep: 0.05, life: 0.3, core: PARCH, glow: BRONZE, soft: 0.4, y: 0.6, lift: 0.2, reverse: sd < 0, gain: 0.9 });
      dust(ox, oz, N(5), { color: BRONZE });
      kit.streak({ a: { x: ox, y: 0.5, z: oz }, b: { x: ev.x, y: 0.5, z: ev.z }, width: 0.16, tailW: 0, core: PARCH, glow: VERDI, life: 0.35, fall: 1.8, opacity: 0.6 });
      sparks(ev.x, 0.2, ev.z, N(5), { color: VERDI, speed: [0.6, 1.4], up: [0.3, 0.9] });
    },
    // Vesper Chime: a little chime bell over each ward, swaying in, struck
    // once, and a verdigris shell closing round the ally.
    vesper_chime(ev) {
      (ev.targets || []).forEach((id, i) => {
        const t = byId(id);
        if (!t) return;
        after(i * 0.08, () => {
          flyBell(0.55, 0.75, (f, k) => {
            const m = byId(id) ?? t;
            f.g.position.set(m.x, 1.45 + 0.25 * (1 - Math.min(1, k * 5)), m.z);
            f.swing.rotation.x = Math.sin(k * 18) * 0.5 * (1 - k);
            f.g.scale.setScalar(f.size * (k > 0.8 ? 1 - (k - 0.8) * 5 : Math.min(1, k * 8)));
          });
          after(0.12, () => {
            const m = byId(id) ?? t;
            kit.flash({ x: m.x, y: 1.2, z: m.z, color: PARCH, size: 0.3, life: 0.12 });
            kit.ring({ x: m.x, z: m.z, r0: 0.9, r1: 0.45, width: 0.07, life: 0.32, core: PARCH, glow: VERDI, soft: 0.4, y: 0.55, opacity: 0.8 });
            kit.ring({ x: m.x, z: m.z, r0: 0.2, r1: 0.7, width: 0.05, life: 0.45, core: VERDI, glow: BRASS, soft: 0.6, y: 0.05, opacity: 0.6 });
            kit.light({ x: m.x, z: m.z, radius: 0.8, color: VERDI, opacity: 0.35, life: 0.3 });
          });
        });
      });
    },
    // Tuning Fork: the fork is struck — a standing wave of thin rings round
    // her out to its reach, and a rush of brass haste lines on each ally.
    tuning_fork(ev) {
      kit.flash({ x: ev.x, y: 1.0, z: ev.z, color: PARCH, size: 0.4, life: 0.12 });
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.12, height: 1.8, color: VERDI, life: 0.3, opacity: 0.5 });
      for (let i = 0; i < 3; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: 3.0, width: 0.05, life: 0.6, core: PARCH, glow: i % 2 ? VERDI : BRASS, soft: 0.5, y: 0.06, delay: i * 0.1, opacity: 0.6, gain: 0.8 });
      for (const id of ev.targets || []) {
        const m = byId(id);
        if (!m) continue;
        after(0.08, () => {
          for (let k = 0; k < 3; k++) {
            const a = rnd(0, TAU);
            const ox = Math.cos(a) * 0.25;
            const oz = Math.sin(a) * 0.25;
            kit.streak({ a: { x: m.x + ox, y: 0.15, z: m.z + oz }, b: { x: m.x + ox, y: 1.1, z: m.z + oz }, width: 0.05, tailW: 0, core: PARCH, glow: BRASS, life: 0.32, fall: 1.6, opacity: 0.7, delay: k * 0.05 });
          }
          kit.ring({ x: m.x, z: m.z, r0: 0.15, r1: 0.6, width: 0.05, life: 0.3, core: PARCH, glow: VERDI, soft: 0.4, y: 0.05 });
        });
      }
    },
  };
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
        const k = 1 - b.drop / (b.drop0 ?? DROP_SEC);
        b.g.position.y = 2.2 * (1 - k * k);
      }
      // A damped pendulum: struck, it rocks and settles.
      b.swingV += -b.angle * 38 * dt - b.swingV * 2.6 * dt;
      b.angle += b.swingV * dt;
      b.swing.rotation.x = Math.max(-0.7, Math.min(0.7, b.angle));
      b.tongue.position.z = -b.angle * 0.05;
    }
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.step(f, k);
      if (k >= 1) {
        root.remove(f.g);
        flying.splice(i, 1);
      }
    }
    for (let i = leaving.length - 1; i >= 0; i--) {
      const b = leaving[i];
      b.leave -= dt;
      const k = Math.max(0, b.leave / 0.25);
      b.g.scale.setScalar((0.3 + 0.7 * k) * (b.size ?? 1));
      b.g.position.y = (1 - k) * 0.6;
      if (b.leave <= 0) {
        root.remove(b.g);
        leaving.splice(i, 1);
      }
    }
  }

  return { frame, count: () => bells.size };
}
