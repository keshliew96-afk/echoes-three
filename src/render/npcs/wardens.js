// THE WARDENS — the cleansed spirits of the three bosses (the Hollow Stag,
// the Drowned Heron, the Barrow Wyrm), resting at the camp's edge.
//
// They keep their boss silhouettes (render/boss/stag.js, heron.js, wyrm.js)
// so the player recognises who they were, but everything that made them
// threatening is gone: no violet, no glow eyes, no angular faceting. Each is a
// smooth translucent shape drawn in cool moonlight (common.js ghostMaterial —
// a fresnel rim on a faint pale-teal veil), eyes closed in two calm arcs, at
// 0.75 of the boss's size. They float a hand above the ground, breathe their
// opacity slowly, and shed a few faint motes. Nothing here can bloom: the
// veil is alpha-blended under the threshold and the motes/pool are additive at
// a tiny fixed value.
//
// The boss builders are NOT reused: they bake violet emitters, flat-shaded
// faceting (which a fresnel shader turns into a lattice of hard rims) and
// per-instance hit-flash materials into the rig. These are the same
// proportions rebuilt with smooth primitives.
//
// Faces +Z. Origin on the ground under the figure's centre.
import {
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { ghostMaterial, ghostUniforms, groundShadow, moonPool, seeded, softSprite, unlitUnderBloom } from './common.js';

const SCALE = 0.75; // of the boss rig
const LASH = '#3F6E78'; // closed-eye arcs: a deeper cool teal drawn on the veil

export function buildWarden(kind, rig) {
  const rand = seeded(`warden_${kind}`);
  const uniforms = ghostUniforms();
  const veil = ghostMaterial(uniforms);
  const lashMat = new MeshBasicMaterial({ color: unlitUnderBloom(LASH), transparent: true, depthWrite: false });

  const float = new Group(); // bob
  rig.add(float);
  const body = new Group(); // boss-unit space, scaled
  body.scale.setScalar(SCALE);
  float.add(body);

  // DEPTH PREPASS. A translucent body built from overlapping primitives
  // shows every primitive's own fresnel rim through the others — the first
  // capture read as a cluster of soap bubbles, not an animal. Each part
  // therefore carries an invisible twin (colorWrite off) drawn in the OPAQUE
  // pass, so only the frontmost surface of the whole figure survives the
  // veil's depth test: one silhouette, one rim. The veil itself never writes
  // depth (and is never an emitter).
  const depthOnly = new MeshBasicMaterial({ colorWrite: false });
  const g = (geo) => {
    const m = new Mesh(geo, veil);
    m.renderOrder = 1;
    const d = new Mesh(geo, depthOnly);
    d.name = 'ghost-depth';
    m.add(d);
    return m;
  };
  // Closed eye: a downward arc (‿), the universal "at peace".
  const arcGeo = new TorusGeometry(0.06, 0.012, 4, 10, Math.PI);
  const closedEye = (parent, x, y, z, yaw = 0, s = 1) => {
    const e = new Mesh(arcGeo, lashMat);
    e.rotation.set(0, yaw, Math.PI);
    e.scale.setScalar(s);
    e.position.set(x, y, z);
    e.renderOrder = 2;
    parent.add(e);
    return e;
  };

  const built = kind === 'stag' ? buildStag(body, g, closedEye) : kind === 'heron' ? buildHeron(body, g, closedEye) : buildWyrm(body, g, closedEye);

  // Ground: faint shadow + a cold moon pool, both on the floor (not on the
  // float), so the hover reads as a gap.
  const R = built.footR * SCALE;
  const shadow = groundShadow(R * 0.8, 0.2, { wide: built.footWide ?? 1, deep: built.footDeep ?? 1 });
  rig.add(shadow);
  const pool = new Mesh(new CircleGeometry(R * 1.35, 32), moonPool(0.075));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.014;
  pool.scale.set(built.footWide ?? 1, built.footDeep ?? 1, 1);
  pool.renderOrder = -1;
  rig.add(pool);

  // Motes: a few slow faint sparks orbiting the figure (deterministic).
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const s = softSprite(0.09, '#E2F1F3', 0.07 + rand() * 0.05, 0.9);
    s.renderOrder = 3;
    rig.add(s);
    motes.push({ s, a: rand() * Math.PI * 2, r: R * (0.7 + rand() * 0.6), h: 0.2 + rand() * built.topY * SCALE * 0.9, sp: 0.15 + rand() * 0.2, ph: rand() * 6.28 });
  }

  const phase = rand() * Math.PI * 2;
  function update(_dt, t) {
    const tt = t + phase;
    float.position.y = built.hover + 0.045 * Math.sin(tt * 0.75);
    // Slow fade-breathing of the veil (and the arcs drawn on it).
    const o = 0.66 + 0.16 * Math.sin(tt * 0.62);
    uniforms.uOpacity.value = o;
    lashMat.opacity = 0.55 * o;
    for (const m of motes) {
      const a = m.a + tt * m.sp;
      m.s.position.set(Math.cos(a) * m.r, m.h + 0.12 * Math.sin(tt * 0.5 + m.ph), Math.sin(a) * m.r);
      m.s.material.opacity = 0.55 + 0.35 * Math.sin(tt * 1.1 + m.ph);
    }
    built.update(tt);
  }

  return {
    ghost: true,
    update,
    metrics: { height: (built.topY + built.hover / SCALE) * SCALE, radius: R },
  };
}

// --- The Hollow Stag: standing tall, head raised, a wide calm rack. --------
function buildStag(body, g, closedEye) {
  const sph = new SphereGeometry(1, 16, 11);
  const barrel = g(sph);
  barrel.scale.set(0.34, 0.38, 0.8);
  barrel.position.set(0, 1.44, -0.22);
  body.add(barrel);
  const chest = g(sph);
  chest.scale.set(0.35, 0.42, 0.38);
  chest.position.set(0, 1.52, 0.32);
  body.add(chest);
  const rump = g(sph);
  rump.scale.set(0.31, 0.35, 0.32);
  rump.position.set(0, 1.48, -0.8);
  body.add(rump);
  // long legs: a stag is mostly leg in profile
  const legGeo = new CylinderGeometry(0.07, 0.045, 1.3, 10);
  for (const [x, z] of [[-0.2, 0.36], [0.2, 0.36], [-0.19, -0.8], [0.19, -0.8]]) {
    const l = g(legGeo);
    l.position.set(x, 0.67, z);
    body.add(l);
  }
  // neck rising steeply to a raised head (the calm "looking out" pose)
  const neck = g(new CylinderGeometry(0.11, 0.2, 0.9, 12));
  neck.position.set(0, 1.98, 0.5);
  neck.rotation.x = 0.36;
  body.add(neck);
  const head = new Group();
  head.position.set(0, 2.42, 0.68);
  body.add(head);
  const skull = g(new SphereGeometry(1, 16, 12));
  skull.scale.set(0.2, 0.21, 0.27);
  head.add(skull);
  const muzzle = g(new ConeGeometry(0.15, 0.56, 12));
  muzzle.rotation.x = Math.PI / 2 + 0.5;
  muzzle.position.set(0, -0.12, 0.32);
  head.add(muzzle);
  const earGeo = new ConeGeometry(0.065, 0.26, 8);
  for (const side of [-1, 1]) {
    const ear = g(earGeo);
    ear.position.set(side * 0.22, 0.04, -0.08);
    ear.rotation.set(-0.3, 0, side * -1.25);
    head.add(ear);
  }
  // The rack: each half is a two-piece beam (out-and-up, then curving back
  // in) carrying three FORWARD-pointing tines plus a crown tip — the classic
  // stag rack, readable in profile as a branched crown and from the front
  // as a wide lyre.
  const beamGeo = new CylinderGeometry(0.035, 0.05, 1, 8);
  const tineGeo = new ConeGeometry(0.036, 1, 7);
  const rack = new Group();
  rack.position.set(0, 0.15, -0.08);
  head.add(rack);
  const tine = (parent, y, len, rx, rz) => {
    const pv = new Group();
    pv.position.y = y;
    pv.rotation.set(rx, 0, rz);
    parent.add(pv);
    const c = g(tineGeo);
    c.scale.set(1, len, 1);
    c.position.y = len / 2;
    pv.add(c);
  };
  for (const side of [-1, 1]) {
    const lower = new Group();
    lower.rotation.set(-0.45, 0, side * -0.85);
    rack.add(lower);
    const b1 = g(beamGeo);
    b1.scale.y = 0.62;
    b1.position.y = 0.31;
    lower.add(b1);
    tine(lower, 0.1, 0.34, 1.35, side * 0.3); // brow tine, straight forward
    tine(lower, 0.42, 0.32, 1.0, side * 0.15);
    const upper = new Group();
    upper.position.y = 0.6;
    upper.rotation.set(-0.15, 0, side * 0.55);
    lower.add(upper);
    const b2 = g(beamGeo);
    b2.scale.set(0.8, 0.55, 0.8);
    b2.position.y = 0.27;
    upper.add(b2);
    tine(upper, 0.22, 0.28, 0.9, side * -0.2);
    tine(upper, 0.5, 0.26, 0.25, side * 0.35); // crown tips
    tine(upper, 0.5, 0.24, -0.35, side * -0.25);
  }
  const tail = g(new ConeGeometry(0.08, 0.24, 8));
  tail.rotation.x = -Math.PI / 2 - 0.9;
  tail.position.set(0, 1.62, -1.12);
  body.add(tail);
  for (const side of [-1, 1]) closedEye(head, side * 0.16, 0.03, 0.15, side * 0.6, 0.85);

  return {
    topY: 2.42 + 0.15 + 1.05,
    hover: 0.07,
    footR: 1.0,
    footWide: 0.8,
    footDeep: 1.35,
    update(t) {
      head.rotation.x = 0.05 * Math.sin(t * 0.4);
      head.rotation.y = 0.12 * Math.sin(t * 0.23);
      neck.rotation.x = 0.36 + 0.02 * Math.sin(t * 0.4);
      barrel.scale.y = 0.38 * (1 + 0.025 * Math.sin(t * 0.9));
    },
  };
}

// --- The Drowned Heron: on one leg, neck folded into an S, bill resting. ----
function buildHeron(body, g, closedEye) {
  const sph = new SphereGeometry(1, 16, 11);
  const torso = new Group();
  torso.position.set(0, 1.62, -0.1);
  torso.rotation.x = -0.32;
  body.add(torso);
  const trunk = g(sph);
  trunk.scale.set(0.36, 0.32, 0.6);
  torso.add(trunk);
  // folded wings, tips crossing over the tail
  for (const side of [-1, 1]) {
    const w = g(sph);
    w.scale.set(0.14, 0.27, 0.62);
    w.position.set(side * 0.27, 0.05, -0.12);
    w.rotation.set(0.05, side * 0.12, side * -0.15);
    torso.add(w);
  }
  const tail = g(new ConeGeometry(0.16, 0.5, 10));
  tail.rotation.x = -Math.PI / 2 - 0.2;
  tail.position.set(0, -0.04, -0.72);
  torso.add(tail);
  // standing leg (straight stilt) + foot
  const legGeo = new CylinderGeometry(0.045, 0.035, 1, 8);
  const stand = g(legGeo);
  stand.scale.y = 1.42;
  stand.position.set(0.06, 0.74, -0.05);
  body.add(stand);
  const toeGeo = new ConeGeometry(0.035, 0.32, 6);
  for (const a of [-0.5, 0, 0.5]) {
    const toe = g(toeGeo);
    toe.rotation.set(Math.PI / 2, 0, -a);
    toe.position.set(0.06 + Math.sin(a) * 0.14, 0.03, -0.05 + Math.cos(a) * 0.14);
    body.add(toe);
  }
  // tucked leg: thigh forward-up, shin folded back under the belly
  const tuck = new Group();
  tuck.position.set(-0.1, 1.42, 0.0);
  body.add(tuck);
  const thigh = g(legGeo);
  thigh.scale.y = 0.42;
  thigh.rotation.x = 0.9;
  thigh.position.set(0, -0.12, 0.15);
  tuck.add(thigh);
  const shin = g(legGeo);
  shin.scale.y = 0.48;
  shin.rotation.x = -1.2;
  shin.position.set(0, -0.2, 0.05);
  tuck.add(shin);
  // S-neck as a single smooth tube (folded back onto the shoulders: resting)
  const neckCurve = new CatmullRomCurve3([
    new Vector3(0, 1.82, 0.32),
    new Vector3(0, 2.02, 0.48),
    new Vector3(0, 2.14, 0.3),
    new Vector3(0, 2.28, 0.28),
    new Vector3(0, 2.42, 0.42),
  ]);
  const neck = g(new TubeGeometry(neckCurve, 24, 0.075, 10, false));
  body.add(neck);
  const head = new Group();
  head.position.set(0, 2.46, 0.48);
  body.add(head);
  const skull = g(sph);
  skull.scale.set(0.12, 0.12, 0.16);
  head.add(skull);
  const bill = g(new ConeGeometry(0.06, 0.78, 10));
  bill.rotation.x = Math.PI / 2 + 0.3;
  bill.position.set(0, -0.11, 0.44);
  head.add(bill);
  // trailing crest plumes — the heron's grace note
  const plumeGeo = new ConeGeometry(0.025, 0.6, 6);
  for (const side of [-1, 1]) {
    const p = g(plumeGeo);
    p.rotation.set(-Math.PI / 2 - 0.85, side * 0.12, 0);
    p.position.set(side * 0.03, -0.12, -0.32);
    head.add(p);
  }
  for (const side of [-1, 1]) closedEye(head, side * 0.1, 0.02, 0.07, side * 0.9, 0.6);

  return {
    topY: 2.46 + 0.14,
    hover: 0.05,
    footR: 0.75,
    footWide: 1,
    footDeep: 1.2,
    update(t) {
      head.rotation.x = 0.04 * Math.sin(t * 0.35);
      head.rotation.y = 0.1 * Math.sin(t * 0.21);
      torso.scale.y = 1 + 0.02 * Math.sin(t * 0.8);
      tuck.rotation.x = 0.04 * Math.sin(t * 0.5);
    },
  };
}

// --- The Barrow Wyrm: curled up asleep, chin resting on its own coil. -------
function buildWyrm(body, g, closedEye) {
  const sph = new SphereGeometry(1, 14, 9);
  // Coil: ONE smooth tapered tube (a chain of balls read as a caterpillar).
  // It leaves the back of the head and winds clockwise (seen from above)
  // round the figure for ~1.1 turns, tightening, so it passes under the
  // resting chin at the front and the tail tucks inside the ring.
  const TURN = Math.PI * 2 * 1.12;
  const TH0 = 0.75;
  const pts = [];
  const radAt = (u) => 0.36 * Math.pow(1 - u, 0.75) + 0.035;
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const th = TH0 - u * TURN;
    const r = 0.92 - 0.5 * u;
    pts.push(new Vector3(Math.cos(th) * r, radAt(u) * 0.8 + 0.02, Math.sin(th) * r));
  }
  const curve = new CatmullRomCurve3(pts);
  const TUB = 72;
  const RAD = 10;
  const tube = new TubeGeometry(curve, TUB, 1, RAD, false);
  {
    const pos = tube.attributes.position;
    const c = new Vector3();
    for (let i = 0; i <= TUB; i++) {
      const u = i / TUB;
      curve.getPointAt(u, c);
      const rr = radAt(u);
      for (let j = 0; j <= RAD; j++) {
        const idx = i * (RAD + 1) + j;
        pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * rr, c.y + (pos.getY(idx) - c.y) * rr * 0.82, c.z + (pos.getZ(idx) - c.z) * rr);
      }
    }
    pos.needsUpdate = true;
    tube.computeVertexNormals();
  }
  const coil = new Group();
  body.add(coil);
  coil.add(g(tube));
  // Rounded tail tip.
  const tipCap = g(sph);
  tipCap.scale.setScalar(radAt(1));
  curve.getPointAt(1, tipCap.position);
  coil.add(tipCap);
  // Spine plates riding the top of the coil (the Wyrm's ridge, softened).
  const plateGeo = new ConeGeometry(0.09, 0.22, 7);
  const tmp = new Vector3();
  for (let i = 0; i < 7; i++) {
    const u = 0.06 + i * 0.1;
    curve.getPointAt(u, tmp);
    const p = g(plateGeo);
    p.position.set(tmp.x, tmp.y + radAt(u) * 0.78, tmp.z);
    p.scale.setScalar(0.5 + radAt(u) * 1.6);
    p.rotation.x = -0.2;
    coil.add(p);
  }
  // Head: resting low on the floor at the front of the coil, chin down,
  // turned a little toward the camera.
  const head = new Group();
  head.position.set(0.32, 0.3, 1.02);
  head.rotation.y = -0.55;
  body.add(head);
  const skull = g(sph);
  skull.scale.set(0.42, 0.26, 0.56);
  head.add(skull);
  const snout = g(sph);
  snout.scale.set(0.28, 0.17, 0.3);
  snout.position.set(0, -0.06, 0.44);
  head.add(snout);
  const brow = g(new ConeGeometry(0.16, 0.6, 8));
  brow.rotation.x = -Math.PI / 2 - 0.35;
  brow.position.set(0, 0.2, -0.26);
  head.add(brow);
  for (const side of [-1, 1]) {
    const horn = g(new ConeGeometry(0.06, 0.4, 8));
    horn.rotation.set(-Math.PI / 2 - 0.5, 0, side * 0.35);
    horn.position.set(side * 0.24, 0.16, -0.32);
    head.add(horn);
  }
  for (const side of [-1, 1]) closedEye(head, side * 0.27, 0.1, 0.24, side * 0.7, 1.1);

  return {
    topY: 0.75,
    hover: 0.05,
    footR: 1.45,
    footWide: 1,
    footDeep: 1,
    update(t) {
      // sleeping breath: a slow swell travelling down the coil
      const b = Math.sin(t * 0.8);
      coil.scale.set(1 + 0.012 * b, 1 + 0.035 * b, 1 + 0.012 * b);
      head.rotation.x = 0.03 * Math.sin(t * 0.8);
      head.position.y = 0.3 + 0.015 * Math.sin(t * 0.8);
    },
  };
}
