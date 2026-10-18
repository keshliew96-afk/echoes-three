// The Ember Kiln's boss rigs (docs/KILN_BOSSES.md, content plan 5 slice 8):
// the Bellfounder and the Cinderback. Same grammar and interface as
// render/boss/spire.js — { group, mats, setYaw, setFlash, pose } — faces +Z,
// world-unit sizes, ink on the big masses, a contact shadow. The Kiln's light
// rules hold (render/enemies/kiln.js): their heat is KILN GOLD over banked
// COAL crimson, never Ember (Ember is the telegraphs' alone); the bodies are
// low-chroma brick, slag and hide lifted to read off the dark floor; the glow
// parts are unlit (never in `mats`, so the hit flash cannot wash them out);
// the hollow song is the bosses' violet, one small tell each.
//
//   founder     the gods' bell-founder: a hunched giant built like a bottle
//               kiln, courses of smoke-dark fire brick with gold seams between
//               them, on two stumps of brick. A cast-bronze mask for a face,
//               shaped like a bell with its mouth down and two violet slits
//               for eyes. In its chest an arched kiln door; behind it the
//               fire. Its slag arms hold a bronze crucible brimming with molten
//               bronze, and a small cracked bell hangs at its hip. It tips the
//               crucible for the Molten Pour, lifts it overhead for the Bell
//               Drop, throws its chest doors open and spreads its arms for the
//               Firing (the fire inside goes white), then stands quenched: the
//               seams grey, the doors hanging, the crucible dark.
//   cinderback  the Kiln's warden: a great fire salamander, long and low,
//               sooty hide with live coals down its back in two rows, a
//               broad flat head with six gill stalks behind it that burn gold
//               at the tips, a heavy tail and four splayed legs. One violet
//               scale on its brow. It swims with a lizard's S; it noses down
//               and sinks into the floor for the Magma Dive (only the coals
//               of its back show as it goes under) and bursts up; spent, its
//               coals go dull and its gills hang; it curls round to whip its
//               tail for the Tail Lash; it rears up on its forelegs and its
//               throat glows white for the Ember Spit.
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';

const flashable = (c) => toonMaterial({ color: c, emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}
function rigShell(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  return { group, yaw, rig, mats, track };
}
const iface = (s, pose) => ({
  group: s.group,
  mats: s.mats,
  setYaw: (r) => {
    s.yaw.rotation.y = r;
  },
  setFlash(k) {
    const v = k < 0 ? 0 : k > 1 ? 1 : k;
    for (const m of s.mats) m.emissiveIntensity = v;
  },
  pose,
});
const ease = (cur, want, rate, dt) => cur + (want - cur) * (1 - Math.exp(-rate * dt));
// The hollow song in them: the bosses' godstuff violet (every boss's).
const SONG = new Color(PALETTE.godstuffViolet);
const tellGlow = (size, opacity) => glow(SONG, size, opacity);

// The Kiln's ramp: banked coal -> kiln gold -> white heat.
const GOLD = new Color(VFX_MATTER.kilngold);
const HEAT = new Color(VFX_MATTER.kilnheat);
const COAL = new Color(VFX_MATTER.coal);
const ASHGREY = new Color(VFX_MATTER.mothash).multiplyScalar(0.55);
// Lifted brick and slag (a step toward slate, so they read off the floor).
const BRICK = new Color(VFX_MATTER.kilnbrick).lerp(new Color('#7E7470'), 0.3);
const BRICK_DARK = BRICK.clone().lerp(new Color(PALETTE.voidCharcoal), 0.5);
const SLAG = new Color(VFX_MATTER.slag).lerp(new Color('#6A6560'), 0.35);
const BRONZE = new Color(VFX_MATTER.bellbronze);
const BRONZE_DARK = BRONZE.clone().lerp(new Color(PALETTE.voidCharcoal), 0.5);
// Heat colour for k in 0..1 (0 cold ash, 0.5 coal-gold, 1 white heat).
const _heat = new Color();
function heatColor(k, out = _heat) {
  if (k <= 0.5) return out.copy(ASHGREY).lerp(COAL, k * 2).lerp(GOLD, Math.max(0, k * 2 - 0.4));
  return out.copy(GOLD).lerp(HEAT, (k - 0.5) * 2);
}

// A bell's half-profile (mouth at y 0, crown at y h), for a LatheGeometry.
function bellProfile(r, h) {
  return [
    new Vector2(r * 1.0, 0),
    new Vector2(r * 1.05, h * 0.06),
    new Vector2(r * 0.86, h * 0.2),
    new Vector2(r * 0.74, h * 0.5),
    new Vector2(r * 0.66, h * 0.82),
    new Vector2(r * 0.42, h * 0.98),
    new Vector2(0.001, h),
  ];
}
// A bottle kiln's half-profile: a broad belly narrowing to the shoulders.
function kilnProfile() {
  return [
    new Vector2(0.62, 0),
    new Vector2(0.86, 0.3),
    new Vector2(0.94, 0.7),
    new Vector2(0.86, 1.1),
    new Vector2(0.66, 1.42),
    new Vector2(0.44, 1.62),
    new Vector2(0.3, 1.7),
  ];
}

// ---------------------------------------------------------- BELLFOUNDER --
export function buildFounder() {
  const s = rigShell('boss-founder');
  const { rig, track } = s;
  const brick = track(flashable(BRICK));
  const brickDark = track(flashable(BRICK_DARK));
  const slag = track(flashable(SLAG));
  const bronze = track(flashable(BRONZE));
  const bronzeDark = track(flashable(BRONZE_DARK));
  const seamMat = lit(GOLD);
  const fireMat = lit(GOLD);
  const moltenMat = lit(HEAT);
  const tellMat = new MeshBasicMaterial({ color: SONG.clone(), toneMapped: false });
  // Everything above the stumps hangs off `body` (it sways and sags).
  const body = new Group();
  rig.add(body);
  // Two brick stumps.
  const stumps = [];
  const stumpG = new CylinderGeometry(0.26, 0.32, 0.7, 7).translate(0, -0.35, 0);
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.42, 0.7, 0);
    rig.add(hip);
    const st = new Mesh(stumpG, brickDark);
    addInk(st);
    hip.add(st);
    stumps.push({ hip, side });
  }
  // The kiln body: a lathe of brick, banded with gold-seamed courses.
  const trunk = new Mesh(new LatheGeometry(kilnProfile(), 14), brick);
  trunk.position.y = 0.62;
  trunk.scale.set(1, 1.05, 0.86);
  addInk(trunk);
  body.add(trunk);
  const seams = [];
  for (let k = 0; k < 5; k++) {
    const y = 0.25 + k * 0.28;
    const r = [0.84, 0.93, 0.92, 0.84, 0.68][k];
    const band = new Mesh(new TorusGeometry(r, 0.022, 4, 22), seamMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.62 + y * 1.05;
    band.scale.set(1, 0.86, 1);
    body.add(band);
    seams.push(band);
  }
  // The chest door: an arched opening, the fire inside, two iron leaves.
  const doorPivot = new Group();
  doorPivot.position.set(0, 1.42, 0.78);
  body.add(doorPivot);
  const hearth = new Mesh(new CylinderGeometry(0.34, 0.34, 0.06, 14, 1, false, -Math.PI / 2, Math.PI), fireMat);
  hearth.rotation.x = Math.PI / 2;
  hearth.scale.set(1, 1, 1.4);
  hearth.position.set(0, -0.08, 0);
  doorPivot.add(hearth);
  const arch = new Mesh(new TorusGeometry(0.36, 0.06, 5, 14, Math.PI), brickDark);
  arch.position.set(0, 0.1, 0.03);
  doorPivot.add(arch);
  const leaves = [];
  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.position.set(side * 0.34, -0.06, 0.06);
    doorPivot.add(hinge);
    const leaf = new Mesh(new BoxGeometry(0.34, 0.62, 0.05).translate(-side * 0.17, 0, 0), slag);
    hinge.add(leaf);
    const rivet = new Mesh(new SphereGeometry(0.03, 5, 4), bronze);
    rivet.position.set(-side * 0.26, 0.12, 0.03);
    hinge.add(rivet);
    leaves.push({ hinge, side });
  }
  const fireGlow = glow(GOLD, 1.8, 0.35);
  fireGlow.position.set(0, 1.4, 0.95);
  body.add(fireGlow);
  // Shoulders and the mask: a bronze bell mouth-down, two violet eye slits.
  const shoulders = new Mesh(new SphereGeometry(0.5, 12, 8), brickDark);
  shoulders.scale.set(1.5, 0.55, 1.0);
  shoulders.position.y = 2.38;
  addInk(shoulders);
  body.add(shoulders);
  const head = new Group();
  head.position.set(0, 2.5, 0.18);
  body.add(head);
  const mask = new Mesh(new LatheGeometry(bellProfile(0.34, 0.62), 12), bronze);
  mask.position.y = 0.02;
  addInk(mask);
  head.add(mask);
  const lip = new Mesh(new TorusGeometry(0.35, 0.035, 4, 16), bronzeDark);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.03;
  head.add(lip);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new BoxGeometry(0.11, 0.028, 0.02), tellMat);
    eye.position.set(side * 0.12, 0.3, 0.28);
    eye.rotation.set(0, side * 0.35, side * 0.18);
    head.add(eye);
  }
  const eyeGlow = tellGlow(0.7, 0.25);
  eyeGlow.position.set(0, 0.3, 0.32);
  head.add(eyeGlow);
  // A chimney stub of brick on its back, smoking (the VFX frame).
  const flue = new Mesh(new CylinderGeometry(0.16, 0.2, 0.6, 8), brickDark);
  flue.position.set(0.28, 2.6, -0.42);
  flue.rotation.x = -0.25;
  body.add(flue);
  const flueGlow = glow(GOLD, 0.5, 0.25);
  flueGlow.position.set(0.28, 2.92, -0.5);
  body.add(flueGlow);
  // Arms: slag, from the shoulders to the crucible's handles.
  const arms = [];
  const upperG = new CylinderGeometry(0.17, 0.14, 0.78, 7).translate(0, -0.39, 0);
  const foreG = new CylinderGeometry(0.14, 0.18, 0.7, 7).translate(0, -0.35, 0);
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.78, 2.28, 0.05);
    body.add(sh);
    const up = new Mesh(upperG, slag);
    addInk(up);
    sh.add(up);
    const el = new Group();
    el.position.y = -0.76;
    sh.add(el);
    const fo = new Mesh(foreG, slag);
    el.add(fo);
    const fist = new Mesh(new SphereGeometry(0.2, 7, 6), slag);
    fist.position.y = -0.72;
    el.add(fist);
    arms.push({ sh, el, side });
  }
  // The crucible: a bronze cup on a yoke the arms carry in front.
  const crucible = new Group();
  crucible.position.set(0, 1.2, 1.05);
  body.add(crucible);
  const cup = new Mesh(new LatheGeometry([new Vector2(0.12, 0), new Vector2(0.34, 0.06), new Vector2(0.42, 0.32), new Vector2(0.46, 0.5), new Vector2(0.4, 0.5)], 14), bronzeDark);
  cup.position.y = -0.25;
  addInk(cup);
  crucible.add(cup);
  const molten = new Mesh(new CylinderGeometry(0.38, 0.38, 0.02, 16), moltenMat);
  molten.position.y = 0.2;
  crucible.add(molten);
  const spout = new Mesh(new ConeGeometry(0.08, 0.22, 6), bronzeDark);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0.2, 0.46);
  crucible.add(spout);
  const crucibleGlow = glow(HEAT, 1.2, 0.3);
  crucibleGlow.position.y = 0.4;
  crucible.add(crucibleGlow);
  // A small cracked bell at its hip, the violet crack its corruption tell.
  const hipBell = new Group();
  hipBell.position.set(-0.86, 1.25, 0.2);
  body.add(hipBell);
  const hb = new Mesh(new LatheGeometry(bellProfile(0.14, 0.26), 10), bronze);
  hb.position.y = -0.3;
  hipBell.add(hb);
  const crack = new Mesh(new BoxGeometry(0.015, 0.16, 0.012), tellMat);
  crack.position.set(0, -0.2, 0.13);
  crack.rotation.z = 0.3;
  hipBell.add(crack);
  const pool = glow(GOLD, 3.2, 0.1);
  pool.position.set(0, 0.06, 0.4);
  rig.add(pool);
  const shadow = groundShadow(1.25, 0.45, { deep: 1.3 });
  s.group.add(shadow);
  let lastT = null;
  let pourK = 0;
  let liftK = 0;
  let fireK = 0;
  let quenchK = 0;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const mode = e ? e.mode : 'tend';
    pourK = ease(pourK, attack === 'pour' ? telegraphK : 0, 9, dt);
    liftK = ease(liftK, attack === 'bell' ? telegraphK : 0, 9, dt);
    fireK = ease(fireK, mode === 'stoke' ? Math.max(0.2, telegraphK) : 0, 7, dt);
    quenchK = ease(quenchK, mode === 'quenched' ? 1 : 0, mode === 'quenched' ? 6 : 2.5, dt);
    // A heavy plod: the stumps rock and the kiln sways over them.
    const gait = walkPhase * 1.2;
    for (const st of stumps) st.hip.rotation.x = Math.sin(gait + (st.side > 0 ? Math.PI : 0)) * 0.35 * moveK;
    body.position.y = 0.04 * Math.abs(Math.sin(gait)) * moveK - 0.12 * quenchK;
    body.rotation.z = 0.05 * Math.sin(gait) * moveK;
    body.rotation.x = 0.16 * pourK - 0.14 * liftK - 0.08 * fireK + 0.12 * quenchK;
    // Arms: carry the crucible; tip it forward; heave it overhead; spread
    // wide for the Firing; hang slack quenched.
    for (const a of arms) {
      a.sh.rotation.x = -0.9 - 0.5 * pourK - 2.1 * liftK + 0.5 * fireK + 0.5 * quenchK;
      a.sh.rotation.z = a.side * (0.12 + 1.2 * fireK + 0.1 * quenchK);
      a.el.rotation.x = -0.5 + 0.3 * pourK + 0.2 * liftK + 0.4 * fireK + 0.3 * quenchK;
    }
    crucible.visible = fireK < 0.6; // set down at its feet while it fires (the VFX shows the heat)
    crucible.position.set(0, 1.2 + 1.5 * liftK - 0.25 * quenchK, 1.05 + 0.15 * pourK - 0.45 * liftK);
    crucible.rotation.x = 1.1 * pourK;
    // The chest doors: open for the Firing; ajar and hanging quenched.
    for (const l of leaves) l.hinge.rotation.y = l.side * (1.7 * fireK + 0.4 * quenchK);
    // Heat: the seams, the hearth and the crucible breathe on a slow beat,
    // go white for the Firing and grey quenched; it burns hotter as it weakens.
    const beat = Math.pow(Math.max(0, Math.sin(t * 1.4 * Math.PI)), 3);
    const heat = Math.max(0, Math.min(1, 0.55 + 0.12 * beat + 0.15 * (1 - hpFrac) + 0.45 * fireK + 0.2 * pourK - 0.6 * quenchK));
    heatColor(heat, seamMat.color);
    heatColor(Math.min(1, heat + 0.15), fireMat.color);
    heatColor(Math.max(0, Math.min(1, 0.85 - 0.7 * quenchK + 0.15 * pourK)), moltenMat.color);
    fireGlow.material.opacity = 0.18 + 0.25 * beat * (1 - quenchK) + 0.7 * fireK;
    fireGlow.scale.setScalar(1.8 + 2.4 * fireK);
    crucibleGlow.material.opacity = (0.22 + 0.3 * pourK) * (1 - 0.8 * quenchK);
    flueGlow.material.opacity = (0.15 + 0.2 * beat) * (1 - quenchK);
    eyeGlow.material.opacity = 0.2 + 0.35 * Math.max(pourK, liftK, fireK) * (1 - 0.6 * quenchK);
    pool.material.opacity = 0.06 + 0.1 * heat;
    head.rotation.x = -0.2 * liftK + 0.25 * quenchK;
    hipBell.rotation.x = 0.25 * Math.sin(t * 2.6) * Math.max(moveK, 0.3);
  });
}

// ----------------------------------------------------------- CINDERBACK --
const HIDE = new Color(VFX_MATTER.salamander).lerp(new Color('#8A7E76'), 0.4);
const HIDE_DARK = HIDE.clone().lerp(new Color(PALETTE.voidCharcoal), 0.5);
const BELLY = new Color(VFX_MATTER.coal).lerp(HIDE, 0.45);

export function buildCinderback() {
  const s = rigShell('boss-cinderback');
  const { rig, track } = s;
  const hide = track(flashable(HIDE));
  const hideDark = track(flashable(HIDE_DARK));
  const belly = track(flashable(BELLY));
  const coalMat = lit(GOLD);
  const gillMat = lit(GOLD);
  const throatMat = lit(GOLD);
  const tellMat = new MeshBasicMaterial({ color: SONG.clone(), toneMapped: false });
  // `body` carries the whole beast (it sinks for the dive, rears to spit).
  const body = new Group();
  rig.add(body);
  // The spine: a chain of segment pivots from the shoulders back to the tail
  // tip, each one turning a little more for the swim and the lash.
  const SEG = [
    // [length, radius, kind]
    [0.42, 0.46, 'torso'],
    [0.42, 0.44, 'torso'],
    [0.4, 0.38, 'torso'],
    [0.36, 0.3, 'tail'],
    [0.34, 0.24, 'tail'],
    [0.32, 0.18, 'tail'],
    [0.3, 0.13, 'tail'],
    [0.28, 0.08, 'tail'],
  ];
  const spine = [];
  const coals = [];
  let parent = body;
  let z0 = 0.3;
  const root = new Group();
  root.position.set(0, 0.62, z0);
  body.add(root);
  parent = root;
  for (let i = 0; i < SEG.length; i++) {
    const [len, r] = SEG[i];
    const piv = new Group();
    piv.position.z = i === 0 ? 0 : -SEG[i - 1][0];
    parent.add(piv);
    const m = new Mesh(new SphereGeometry(r, 10, 7), i < 3 ? hide : hideDark);
    m.scale.set(1.1, 0.72, (len / r) * 0.95);
    m.position.z = -len / 2;
    if (i < 4) addInk(m);
    piv.add(m);
    if (i < 3) {
      const bm = new Mesh(new SphereGeometry(r * 0.9, 9, 6), belly);
      bm.scale.set(1.05, 0.4, (len / r) * 0.85);
      bm.position.set(0, -r * 0.3, -len / 2);
      piv.add(bm);
    }
    // Two rows of live coals down the back, then one down the tail.
    const rows = i < 3 ? [-1, 1] : i < 6 ? [0] : [];
    for (const side of rows) {
      const c = new Mesh(new SphereGeometry(0.07 + 0.04 * (r / 0.46), 6, 5), coalMat);
      c.position.set(side * r * 0.42, r * 0.62, -len * 0.5);
      piv.add(c);
      coals.push(c);
    }
    spine.push(piv);
    parent = piv;
  }
  const tailGlow = glow(GOLD, 0.7, 0.3);
  tailGlow.position.z = -0.28;
  spine[spine.length - 1].add(tailGlow);
  const backGlow = glow(GOLD, 2.4, 0.18);
  backGlow.position.set(0, 0.4, -0.4);
  spine[1].add(backGlow);
  // Neck and head ahead of the shoulders.
  const neck = new Group();
  neck.position.set(0, 0.04, 0.12);
  root.add(neck);
  const neckM = new Mesh(new SphereGeometry(0.34, 9, 7), hide);
  neckM.scale.set(1.1, 0.75, 1.0);
  neckM.position.z = 0.16;
  neck.add(neckM);
  const throat = new Mesh(new SphereGeometry(0.26, 8, 6), throatMat);
  throat.scale.set(1.0, 0.45, 1.0);
  throat.position.set(0, -0.18, 0.26);
  neck.add(throat);
  const head = new Group();
  head.position.set(0, 0.06, 0.48);
  neck.add(head);
  const skull = new Mesh(new SphereGeometry(0.4, 12, 8), hide);
  skull.scale.set(1.25, 0.5, 1.0);
  skull.position.z = 0.18;
  addInk(skull);
  head.add(skull);
  const jaw = new Group();
  jaw.position.set(0, -0.1, 0.0);
  head.add(jaw);
  const jawM = new Mesh(new SphereGeometry(0.38, 10, 6), belly);
  jawM.scale.set(1.2, 0.3, 1.0);
  jawM.position.z = 0.18;
  jaw.add(jawM);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.06, 6, 5), coalMat);
    eye.position.set(side * 0.32, 0.12, 0.3);
    head.add(eye);
  }
  // The violet brow scale (the hollow song's tell).
  const tell = new Mesh(new BoxGeometry(0.1, 0.03, 0.1), tellMat);
  tell.position.set(0, 0.2, 0.22);
  tell.rotation.y = Math.PI / 4;
  head.add(tell);
  const tellG = tellGlow(0.45, 0.25);
  tellG.position.set(0, 0.24, 0.22);
  head.add(tellG);
  // Six gill stalks behind the head, burning gold at the tips.
  const gills = [];
  const stalkG = new ConeGeometry(0.05, 0.5, 5).translate(0, 0.25, 0);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const g = new Group();
      g.position.set(side * 0.38, 0.06 + k * 0.04, -0.02 - k * 0.06);
      head.add(g);
      const st = new Mesh(stalkG, hideDark);
      g.add(st);
      const tip = new Mesh(new SphereGeometry(0.06, 5, 4), gillMat);
      tip.position.y = 0.5;
      g.add(tip);
      g.rotation.set(-0.6 - k * 0.25, 0, side * (1.0 + k * 0.2));
      gills.push({ g, side, k });
    }
  }
  // Four splayed legs, two at the shoulders and two at the hips.
  const legs = [];
  const legG = new CylinderGeometry(0.11, 0.08, 0.5, 6).translate(0, -0.25, 0);
  const footG = new SphereGeometry(0.12, 6, 4);
  for (const [seg, front] of [[0, true], [2, false]]) {
    for (const side of [-1, 1]) {
      const hip = new Group();
      hip.position.set(side * SEG[seg][1] * 0.95, -0.05, -SEG[seg][0] * 0.5);
      spine[seg].add(hip);
      const up = new Mesh(legG, hide);
      hip.add(up);
      const foot = new Mesh(footG, hideDark);
      foot.scale.set(1.3, 0.4, 1.3);
      foot.position.y = -0.52;
      hip.add(foot);
      hip.rotation.z = side * 0.9;
      legs.push({ hip, side, front });
    }
  }
  const pool = glow(GOLD, 3.4, 0.1);
  pool.position.set(0, 0.06, -0.4);
  rig.add(pool);
  const shadow = groundShadow(1.4, 0.5, { deep: 1.2 });
  s.group.add(shadow);
  let lastT = null;
  let noseK = 0;
  let underK = 0;
  let spentK = 0;
  let lashK = 0;
  let rearK = 0;
  let rageK = 0;
  let lashSide = 1;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const mode = e ? e.mode : 'prowl';
    noseK = ease(noseK, mode === 'nose' ? 1 : 0, 6, dt);
    underK = ease(underK, mode === 'under' ? 1 : 0, mode === 'under' ? 5 : 14, dt);
    spentK = ease(spentK, mode === 'spent' ? 1 : 0, mode === 'spent' ? 8 : 3, dt);
    lashK = ease(lashK, attack === 'lash' ? telegraphK : 0, attack === 'lash' ? 7 : 16, dt);
    rearK = ease(rearK, mode === 'rear' ? 1 : 0, 10, dt);
    rageK = ease(rageK, e && e.enraged ? 1 : 0, 3, dt);
    if (attack === 'lash' && e && e.telegraph) {
      // It winds its tail round the far side from its target.
      const tx = e.telegraph.dirX ?? 0;
      const tz = e.telegraph.dirZ ?? 1;
      lashSide = tx * (e.faceZ ?? 1) - tz * (e.faceX ?? 0) >= 0 ? -1 : 1;
    }
    // The swim: a travelling S down the spine, faster as it moves; the lash
    // curls the whole tail to one side.
    const swim = walkPhase * 1.4;
    const swing = 0.08 + 0.22 * moveK;
    for (let i = 0; i < spine.length; i++) {
      const w = Math.sin(swim - i * 0.75) * swing * (0.4 + i * 0.12);
      spine[i].rotation.y = w + lashSide * lashK * (i < 3 ? 0.18 : 0.42) - lashSide * 0.0;
      spine[i].rotation.x = i >= 3 ? -0.04 * (i - 2) * (1 - rearK) + 0.06 * spentK : 0;
    }
    // Legs: a splayed lizard walk, tucked under the dive, sprawled spent.
    for (const l of legs) {
      const ph = swim + (l.front ? 0 : Math.PI) + (l.side > 0 ? 0 : Math.PI);
      l.hip.rotation.x = Math.sin(ph) * 0.6 * moveK - (l.front ? 0.7 * rearK : 0) + 0.5 * noseK;
      l.hip.rotation.z = l.side * (0.9 + 0.5 * spentK - 0.5 * underK);
    }
    // The dive: it noses down, then the whole beast sinks under the floor;
    // rearing, its shoulders lift on its forelegs.
    body.position.y = -0.28 * noseK - 1.5 * underK - 0.1 * spentK + 0.5 * rearK;
    root.rotation.x = 0.35 * noseK - 0.6 * rearK;
    neck.rotation.x = 0.4 * noseK + 0.15 * spentK + 0.35 * rearK;
    neck.rotation.y = -lashSide * 0.35 * lashK;
    jaw.rotation.x = 0.45 * rearK + 0.1 * Math.max(0, Math.sin(t * 2.2)) * (1 - spentK);
    // Heat: the coals, the gills and the throat breathe; white in the throat
    // before the spit; dull spent; hotter enraged and as it weakens.
    const beat = Math.pow(Math.max(0, Math.sin(t * (1.8 + rageK) * Math.PI)), 3);
    const heat = Math.max(0, Math.min(1, 0.55 + 0.15 * beat + 0.15 * (1 - hpFrac) + 0.2 * rageK + 0.2 * noseK - 0.55 * spentK));
    heatColor(heat, coalMat.color);
    heatColor(Math.min(1, heat + 0.1), gillMat.color);
    heatColor(Math.min(1, 0.35 + 0.65 * rearK + 0.1 * beat - 0.3 * spentK), throatMat.color);
    for (const g of gills) {
      g.g.rotation.x = -0.6 - g.k * 0.25 + 0.5 * spentK - 0.3 * rearK + 0.08 * Math.sin(t * 3 + g.k);
    }
    backGlow.material.opacity = (0.12 + 0.18 * beat + 0.1 * rageK) * (1 - 0.7 * spentK);
    tailGlow.material.opacity = 0.2 + 0.3 * lashK + 0.15 * beat;
    tellG.material.opacity = 0.18 + 0.3 * Math.max(noseK, rearK, rageK);
    pool.material.opacity = (0.06 + 0.1 * heat) * (1 - 0.7 * underK);
    shadow.scale.setScalar(1 - 0.9 * underK);
  });
}
