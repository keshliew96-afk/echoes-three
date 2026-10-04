// THE DROWNED HERON — Act II boss rig (docs/CONTENT_PLAN.md §2.2).
//
// Read in the Stag's grammar: a 2.6 u flat-faceted silhouette against the
// party's 1.05 u chibis, a DESATURATED slate body (the boss is a shadow its
// corruption hangs in), ink on the big masses, and violet God-stuff as the
// one identity feature — here the spear-bill's veined edge and the weed that
// trails from its wings. Stilt legs + an S-neck + a long bill make it the only
// VERTICAL boss: it reads apart from the Stag's antlers and the Wyrm's coil at
// 50% zoom.
//
// Animation (pose): stalk-walk on the stilts; the neck coils back through a
// spear wind-up (telegraphK while the telegraph is a lane) and snaps forward
// during the dash; the wings flare through a wingbeat; while submerged the
// whole rig sinks under the floor and only a violet ripple ring is left.
//
// Faces +Z. Same interface as render/boss/stag.js: { group, mats, setYaw,
// setFlash, pose }.
import {
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';

const BODY = HIDE.mothWing.clone().lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(0.62);
const DARK = HIDE.boarDark.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.7);
const BILL = new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.85);
const flashable = (c) => toonMaterial({ color: c, emissive: '#FFFFFF', emissiveIntensity: 0 });
const tell = () => new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });

function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}

export function buildHeron() {
  const group = new Group();
  group.name = 'boss-heron';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // sinks while submerged
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bodyMat = track(flashable(BODY));
  const darkMat = track(flashable(DARK));
  const billMat = track(flashable(BILL));

  // Stilt legs, knees bent backward (heron), webbed feet.
  const legs = [];
  const legG = new CylinderGeometry(0.05, 0.04, 0.75, 5);
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.22, 1.45, -0.05);
    rig.add(hip);
    const thigh = new Mesh(legG, darkMat);
    thigh.position.y = -0.36;
    thigh.rotation.x = 0.25;
    hip.add(thigh);
    const knee = new Group();
    knee.position.set(0, -0.72, 0.1);
    hip.add(knee);
    const shin = new Mesh(legG, darkMat);
    shin.position.y = -0.36;
    shin.rotation.x = -0.25;
    knee.add(shin);
    const foot = new Mesh(new ConeGeometry(0.14, 0.32, 3), darkMat);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.72, 0.1);
    knee.add(foot);
    legs.push({ hip, knee });
  }

  // Body: a long tilted teardrop, ink on the mass.
  const body = new Mesh(new IcosahedronGeometry(0.42, 1), bodyMat);
  body.scale.set(0.9, 0.75, 1.45);
  body.position.set(0, 1.62, -0.1);
  body.rotation.x = -0.25;
  addInk(body);
  rig.add(body);
  const tail = new Mesh(new ConeGeometry(0.22, 0.6, 4), darkMat);
  tail.rotation.x = -Math.PI / 2 - 0.4;
  tail.position.set(0, 1.5, -0.72);
  rig.add(tail);

  // Folded wings (flare on wingbeat), trailing violet weed.
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.34, 1.78, 0.05);
    rig.add(pivot);
    const wing = new Mesh(new ConeGeometry(0.34, 1.25, 4), track(flashable(BODY.clone().multiplyScalar(0.85))));
    wing.scale.set(0.35, 1, 1);
    wing.rotation.x = -Math.PI / 2 + 0.2;
    wing.position.set(side * 0.05, -0.05, -0.45);
    addInk(wing);
    pivot.add(wing);
    const weed = new Mesh(new CylinderGeometry(0.018, 0.006, 0.7, 4), tell());
    weed.position.set(side * 0.08, -0.4, -0.75);
    weed.rotation.x = 0.35;
    pivot.add(weed);
    wings.push({ pivot, side });
  }

  // S-neck: three segments on a chain of pivots; the head + spear-bill.
  const neck = [];
  let parent = rig;
  const base = new Group();
  base.position.set(0, 1.9, 0.38);
  rig.add(base);
  parent = base;
  for (let i = 0; i < 3; i++) {
    const seg = new Group();
    seg.position.set(0, i === 0 ? 0 : 0.28, 0);
    parent.add(seg);
    const m = new Mesh(new CylinderGeometry(0.085, 0.1, 0.32, 6), bodyMat);
    m.position.y = 0.14;
    addInk(m);
    seg.add(m);
    neck.push(seg);
    parent = seg;
  }
  const head = new Group();
  head.position.set(0, 0.3, 0);
  parent.add(head);
  const skull = new Mesh(new IcosahedronGeometry(0.15, 0), bodyMat);
  skull.scale.set(0.9, 0.85, 1.25);
  addInk(skull);
  head.add(skull);
  const crest = new Mesh(new ConeGeometry(0.05, 0.4, 3), darkMat);
  crest.rotation.x = -Math.PI / 2 - 0.5;
  crest.position.set(0, 0.08, -0.2);
  head.add(crest);
  const bill = new Mesh(new ConeGeometry(0.075, 0.95, 4), billMat);
  bill.rotation.x = Math.PI / 2;
  bill.position.set(0, -0.02, 0.6);
  addInk(bill);
  head.add(bill);
  // The violet vein along the bill's ridge + the eye glints (the identity).
  const vein = new Mesh(new CylinderGeometry(0.012, 0.004, 0.86, 4), tell());
  vein.rotation.x = Math.PI / 2;
  vein.position.set(0, 0.045, 0.58);
  head.add(vein);
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = glow(0.24, 0.6);
    e.position.set(side * 0.1, 0.04, 0.08);
    head.add(e);
    eyes.push(e);
  }
  const tipGlow = glow(0.5, 0.4);
  tipGlow.position.set(0, -0.02, 1.08);
  head.add(tipGlow);
  const coreGlow = glow(1.6, 0.32);
  coreGlow.position.set(0, 1.62, 0);
  rig.add(coreGlow);

  // Ground: an oversized contact shadow, a violet pool, and the ripple ring
  // that is all that shows while it is under.
  const shadow = groundShadow(0.9, 0.42, { wide: 1.1, deep: 1.3 });
  group.add(shadow);
  const pool = new Mesh(new CircleGeometry(1.25, 32), new MeshBasicMaterial({ color: '#4B3A86', transparent: true, opacity: 0.32, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.012;
  group.add(pool);
  const ripple = new Mesh(new RingGeometry(0.85, 1.0, 40), new MeshBasicMaterial({ color: TELL_VIOLET, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.02;
  group.add(ripple);

  let sinkK = 0;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    // pose: { t, walkPhase, moveK, telegraphK, lungeK (dash), hpFrac, e }
    pose({ t, walkPhase, moveK, telegraphK = 0, lungeK = 0, hpFrac = 1, e = null }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const shape = e && e.telegraph ? e.telegraph.attack : null;
      const spearK = shape === 'spear' ? telegraphK : 0;
      const wingK = shape === 'wingbeat' ? telegraphK : 0;
      const under = !!(e && e.submerged);
      sinkK += ((under ? 1 : 0) - sinkK) * (1 - Math.exp(-6 * dt));
      rig.position.y = -2.4 * sinkK + 0.03 * Math.sin(t * 1.4);
      rig.visible = sinkK < 0.97;
      shadow.visible = sinkK < 0.5;
      // Stalk: alternate legs, a bob on each step.
      const s = Math.sin(walkPhase);
      legs[0].hip.rotation.x = s * 0.45 * moveK;
      legs[1].hip.rotation.x = -s * 0.45 * moveK;
      legs[0].knee.rotation.x = Math.max(0, -s) * 0.6 * moveK;
      legs[1].knee.rotation.x = Math.max(0, s) * 0.6 * moveK;
      rig.rotation.x = 0.18 * lungeK - 0.06 * spearK;
      // Neck: an S that coils back through the spear wind-up and snaps out on the dash.
      const coil = spearK - lungeK * 0.9;
      neck[0].rotation.x = 0.35 + 0.5 * coil;
      neck[1].rotation.x = -0.75 - 0.4 * coil;
      neck[2].rotation.x = 0.45 + 0.2 * coil - 0.6 * lungeK;
      head.rotation.x = -0.05 - 0.25 * coil + 0.4 * lungeK + 0.04 * Math.sin(t * 2.3);
      // Wings flare up and out through a wingbeat wind-up.
      for (const w of wings) {
        w.pivot.rotation.z = w.side * (0.1 + 1.2 * wingK + 0.04 * Math.sin(t * 1.8));
        w.pivot.rotation.x = -0.6 * wingK;
      }
      const fever = 0.7 + 0.15 * Math.sin(t * 2.6) + 0.5 * telegraphK + (1 - hpFrac) * 0.3;
      for (const g of eyes) g.material.opacity = Math.min(0.9, 0.5 * fever);
      tipGlow.material.opacity = Math.min(0.8, 0.25 + 0.55 * spearK + 0.3 * lungeK);
      coreGlow.material.opacity = Math.min(0.5, 0.24 * fever) * (1 - sinkK);
      pool.material.opacity = 0.28 + 0.06 * Math.sin(t * 1.7) + 0.12 * sinkK;
      ripple.material.opacity = sinkK * (0.45 + 0.25 * Math.sin(t * 4));
      const rs = 1 + 0.25 * ((t * 0.8) % 1);
      ripple.scale.set(rs, rs, 1);
    },
  };
}
