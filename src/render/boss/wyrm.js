// THE BARROW WYRM — Act III boss rig (docs/CONTENT_PLAN.md §2.3).
//
// A long, LOW silhouette — the opposite of the Heron's stilts: a wedge head
// with a hinged jaw on a coil of seven ash-grey segments that trail behind it
// in a travelling sine. Ink on every segment; violet God-stuff runs as glowing
// cracks along the spine and in the throat (the throat brightens through an
// Ash Breath wind-up). Burrowed, the body sinks and only a churning earth
// mound with a violet seam is left; enraged, the cracks burn hotter.
//
// Faces +Z. Same interface as render/boss/stag.js.
import {
  Color,
  ConeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';

const ASH = HIDE.ramBody.clone().lerp(new Color(PALETTE.warmGrey), 0.4).multiplyScalar(0.62);
const ASH_DARK = HIDE.moleBody.clone().lerp(new Color(PALETTE.warmGrey), 0.25).multiplyScalar(0.9);
const FANG = new Color(PALETTE.bone).multiplyScalar(0.85);
const EARTH = HIDE.moleBody.clone().lerp(new Color(PALETTE.warmGrey), 0.5).multiplyScalar(0.7);
const flashable = (c) => toonMaterial({ color: c, emissive: '#FFFFFF', emissiveIntensity: 0 });

function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}

const SEGMENTS = 7;
const SEG_GAP = 0.52;

export function buildWyrm() {
  const group = new Group();
  group.name = 'boss-wyrm';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // sinks while burrowed
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const ashMat = track(flashable(ASH));
  const darkMat = track(flashable(ASH_DARK));
  const fangMat = track(flashable(FANG));
  const crackMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });

  // Body coil: segments shrinking toward the tail, each with a spine plate and
  // a violet crack.
  const segs = [];
  const segG = new IcosahedronGeometry(0.5, 1);
  const plateG = new ConeGeometry(0.16, 0.34, 4);
  const crackG = new SphereGeometry(0.07, 6, 4);
  for (let i = 0; i < SEGMENTS; i++) {
    const k = 1 - i / (SEGMENTS + 2);
    const seg = new Group();
    seg.position.set(0, 0, -0.35 - i * SEG_GAP);
    rig.add(seg);
    const m = new Mesh(segG, i % 2 ? darkMat : ashMat);
    m.scale.set(0.95 * k, 0.78 * k, 0.75 * k);
    m.position.y = 0.42 * k;
    addInk(m);
    seg.add(m);
    const plate = new Mesh(plateG, darkMat);
    plate.position.set(0, 0.8 * k, 0);
    plate.rotation.x = -0.4;
    plate.scale.setScalar(k);
    seg.add(plate);
    const crack = new Mesh(crackG, crackMat);
    crack.scale.set(1.6 * k, 0.5, 1.2 * k);
    crack.position.set(0, 0.7 * k, 0.18 * k);
    seg.add(crack);
    segs.push({ seg, k });
  }

  // Head: a wedge skull, a hinged lower jaw, fangs, slit-glow eyes, and the
  // throat glow that swells through the breath wind-up.
  const head = new Group();
  head.position.set(0, 0.55, 0.25);
  rig.add(head);
  const skull = new Mesh(new IcosahedronGeometry(0.5, 1), ashMat);
  skull.scale.set(1.05, 0.62, 1.35);
  addInk(skull);
  head.add(skull);
  const brow = new Mesh(new ConeGeometry(0.2, 0.7, 4), darkMat);
  brow.rotation.x = -Math.PI / 2 - 0.3;
  brow.position.set(0, 0.28, -0.25);
  head.add(brow);
  const jaw = new Group();
  jaw.position.set(0, -0.12, -0.2);
  head.add(jaw);
  const jawM = new Mesh(new IcosahedronGeometry(0.38, 0), darkMat);
  jawM.scale.set(1.05, 0.38, 1.45);
  jawM.position.set(0, -0.06, 0.42);
  addInk(jawM);
  jaw.add(jawM);
  const fangG = new ConeGeometry(0.05, 0.22, 4);
  for (const x of [-0.26, -0.1, 0.1, 0.26]) {
    const f = new Mesh(fangG, fangMat);
    f.rotation.x = Math.PI;
    f.position.set(x, -0.15, 0.55 + (Math.abs(x) < 0.2 ? 0.05 : 0));
    head.add(f);
  }
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = glow(0.32, 0.6);
    e.position.set(side * 0.3, 0.16, 0.32);
    head.add(e);
    eyes.push(e);
  }
  const throat = glow(1.1, 0.0);
  throat.position.set(0, -0.08, 0.55);
  head.add(throat);
  const spineGlow = glow(2.6, 0.22);
  spineGlow.position.set(0, 0.7, -1.4);
  rig.add(spineGlow);

  // Ground: a long contact shadow; the burrow mound + its seam glow.
  const shadow = groundShadow(1.0, 0.42, { forward: -1.1, wide: 1.0, deep: 2.6 });
  group.add(shadow);
  const mound = new Mesh(new SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), track(flashable(EARTH)));
  mound.scale.set(1, 0.35, 1.3);
  mound.visible = false;
  addInk(mound);
  group.add(mound);
  const seam = glow(1.4, 0);
  seam.position.y = 0.3;
  group.add(seam);

  let sinkK = 0;
  let lastT = null;
  let crawl = 0;
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
    pose({ t, walkPhase, moveK, telegraphK = 0, hpFrac = 1, e = null }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const attack = e && e.telegraph ? e.telegraph.attack : null;
      const breathK = attack === 'breath' ? telegraphK : 0;
      const emergeK = attack === 'emerge' ? telegraphK : 0;
      const under = !!(e && e.burrowed);
      sinkK += ((under ? 1 : 0) - sinkK) * (1 - Math.exp(-7 * dt));
      rig.position.y = -1.7 * sinkK;
      rig.visible = sinkK < 0.96;
      shadow.visible = sinkK < 0.5;
      mound.visible = sinkK > 0.05;
      const churn = Math.sin(t * 9) * 0.05 * (moveK + emergeK * 2);
      mound.scale.set(1 + churn, (0.35 + 0.35 * emergeK) * Math.min(1, sinkK * 1.5), 1.3 - churn);
      seam.material.opacity = sinkK * (0.25 + 0.45 * emergeK + 0.08 * Math.sin(t * 5));
      // Slither: a travelling sine down the coil (faster while it moves).
      crawl += dt * (1.2 + 4 * moveK);
      for (let i = 0; i < segs.length; i++) {
        const { seg, k } = segs[i];
        seg.position.x = Math.sin(crawl - i * 0.8) * 0.22 * (0.4 + i / segs.length);
        seg.position.y = Math.max(0, Math.sin(crawl * 0.5 - i * 0.6)) * 0.05;
        seg.rotation.y = Math.cos(crawl - i * 0.8) * 0.25;
        void k;
      }
      // Breath wind-up: the head rears back and the jaw drops; the throat burns.
      head.rotation.x = -0.35 * breathK + 0.03 * Math.sin(t * 1.9);
      head.position.y = 0.55 + 0.25 * breathK;
      jaw.rotation.x = 0.55 * breathK + 0.05 * Math.sin(t * 2.4);
      throat.material.opacity = Math.min(0.85, 0.85 * breathK);
      const enraged = !!(e && e.enraged);
      const fever = 0.65 + 0.15 * Math.sin(t * 2.2) + 0.4 * breathK + (1 - hpFrac) * 0.25 + (enraged ? 0.35 : 0);
      for (const g of eyes) g.material.opacity = Math.min(0.95, 0.55 * fever);
      spineGlow.material.opacity = Math.min(0.5, 0.2 * fever);
      void walkPhase;
    },
  };
}
