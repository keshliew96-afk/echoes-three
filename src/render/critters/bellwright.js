// Bellwright — chibi bell beetle, Tolly (docs/BELLWRIGHT.md).
// Class accent CLASS_ACCENTS.bellwright (bell bronze).
//
// Silhouette contract: a ROUND DOMED SHELL split down the back, two long
// curling ANTENNAE, and a little BELFRY on her back with a bell hanging over
// her head. The party's other shapes are a tall thin column with ear spikes
// (the hare), a wide block (the badger), a pointed pair of ears (the fox), a
// round cloak (the mouse) and a long low body with a tall staff (the otter);
// the beetle is the only one whose prop rides ABOVE her head, and the only
// one with feelers.
//
// A dark chitin beetle with bronze wing cases, a pale belly plate, a tuning
// fork at her belt, and a short bell mallet in her right hand. Cast = the mallet rises and strikes down; the belfry bell
// swings on the walk and rocks hard when she rings it.
import { CapsuleGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, mix, part, faceDecal, mitten, makeArm, aimArm } from './common.js';

const HIP = 0.15;
const HEM = 0.022;
const HEAD_C = 0.6;
const HEAD_R = 0.22;
const SX = 1.06, SY = 0.92, SZ = 1.0;
const BELFRY_Y = 1.14; // the belfry crossbar, clear above her head
const MALLET_X = 0.24;

export function buildBellwright(rig, trackAccent) {
  const accent = CLASS_ACCENTS.bellwright;
  const chitin = mix(PALETTE.voidCharcoal, accent, 0.35);
  const chitinHex = chitin.getHex();
  const chitinDark = mix(chitin, PALETTE.voidCharcoal, 0.4).getHex();
  const belly = mix(PALETTE.bone, PALETTE.paleGold, 0.25).getHex();
  const brass = mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.15).getHex();
  const wood = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.35).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Round body: a short, wide bell (the beetle's plump underside).
  const coat = part(
    bell([
      [0, HEM],
      [0.17, HEM],
      [0.215, 0.06],
      [0.235, 0.16],
      [0.228, 0.27],
      [0.2, 0.37],
      [0.15, 0.44],
      [0.09, 0.48],
      [0, 0.495],
    ]),
    chitinHex
  );
  coat.scale.set(1.04, 1, 1.02);
  body.add(coat);

  // Pale segmented belly plate on the front.
  const plate = bodyPanel(
    [
      [0.232, 0.1],
      [0.236, 0.2],
      [0.222, 0.3],
      [0.19, 0.38],
    ],
    { color: belly, phiLength: 1.15, grow: 1.075 }
  );
  body.add(plate);

  // --- The wing cases: two bronze half-domes over the back with a dark seam
  // down the middle (the class accent), a little proud of the body.
  // Each case is half a dome (a sphere cap split down its axis), the dome's
  // axis pointing back and a little up, so the pair reads as a carapace.
  const caseMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.paleGold, 0.22).getHex() }));
  const cases = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(0, 0.25, -0.06);
    pivot.rotation.x = -Math.PI / 2 + 0.32;
    body.add(pivot);
    // SphereGeometry phi runs round +Y from -X; [0, PI] is the +Z half, which
    // the pivot turns to the right-hand side; the other half is [PI, 2PI].
    const half = part(new SphereGeometry(0.265, 18, 12, side > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI * 0.5), accent, { mat: caseMat });
    half.scale.set(1.0, 0.62, 1.12);
    half.rotation.y = Math.PI / 2;
    half.position.x = side * 0.006;
    pivot.add(half);
    cases.push(half);
  }
  const ridge = part(new TorusGeometry(0.2, 0.011, 4, 18, Math.PI * 0.62), chitinDark, { ink: false });
  ridge.rotation.set(0, Math.PI / 2, 0);
  ridge.position.set(0, 0.2, -0.04);
  body.add(ridge);

  // A tuning fork tucked at her belt.
  const fork = new Group();
  fork.position.set(0.07, 0.19, 0.235);
  for (const dx of [-0.012, 0.012]) {
    const tine = new Mesh(new CylinderGeometry(0.006, 0.006, 0.07, 5), toonMaterial({ color: PALETTE.bone }));
    tine.position.set(dx, 0.04, 0);
    fork.add(tine);
  }
  const stem = new Mesh(new CylinderGeometry(0.007, 0.007, 0.05, 5), toonMaterial({ color: PALETTE.bone }));
  fork.add(stem);
  fork.rotation.z = -0.25;
  body.add(fork);

  // --- Head: round, dark, with big eyes and two curling antennae.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const headHex = mix(accent, PALETTE.paleGold, 0.3).getHex();
  const skull = part(new SphereGeometry(HEAD_R, 26, 20), headHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.1, eyeH: 0.12, spread: 0.2, drop: 0.5 }));
  // Small mandibles, cream, under the eyes.
  for (const side of [-1, 1]) {
    const m = part(new SphereGeometry(0.022, 10, 8), mix(belly, accent, 0.35).getHex());
    m.scale.set(1, 0.7, 1.2);
    m.position.set(side * 0.06, -0.12, SZ * HEAD_R * 0.82);
    head.add(m);
  }

  // Antennae: three thin segments each, curling forward, ending in a bead.
  const antennae = [];
  for (const side of [-1, 1]) {
    const root = new Group();
    root.position.set(side * 0.09, 0.15, 0.08);
    head.add(root);
    let parent = root;
    const segs = [];
    for (const [len, tilt] of [[0.12, 0.35], [0.1, 0.5], [0.08, 0.6]]) {
      const pivot = new Group();
      parent.add(pivot);
      pivot.rotation.set(-tilt * 0.6, 0, side * tilt * 0.45);
      const seg = part(new CylinderGeometry(0.009, 0.011, len, 6), chitinDark, { ink: false });
      seg.position.y = len / 2;
      pivot.add(seg);
      const next = new Group();
      next.position.y = len;
      pivot.add(next);
      segs.push(pivot);
      parent = next;
    }
    const bead = part(new SphereGeometry(0.024, 10, 8), brass);
    parent.add(bead);
    antennae.push(segs);
  }

  // --- The belfry: two posts from the shell, a crossbar over her head, and
  // a brass bell hanging from it. Her signature mass.
  const belfry = new Group();
  belfry.position.set(0, 0.3, -0.14);
  body.add(belfry);
  for (const side of [-1, 1]) {
    const post = part(new CylinderGeometry(0.014, 0.017, BELFRY_Y - 0.3, 6), wood);
    post.position.set(side * 0.13, (BELFRY_Y - 0.3) / 2, 0);
    post.rotation.z = -side * 0.08;
    belfry.add(post);
  }
  const bar = part(new CylinderGeometry(0.016, 0.016, 0.32, 6), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = BELFRY_Y - 0.3;
  belfry.add(bar);
  const swing = new Group();
  swing.position.y = BELFRY_Y - 0.3 - 0.015;
  belfry.add(swing);
  const bellMat = trackAccent(toonMaterial({ color: brass }));
  const backBell = part(
    // Lathe points run bottom to top so the faces point outward.
    bell([
      [0.0, -0.168],
      [0.122, -0.168],
      [0.098, -0.145],
      [0.08, -0.1],
      [0.072, -0.045],
      [0.05, -0.008],
      [0.0, 0.0],
    ], 20),
    brass,
    { mat: bellMat }
  );
  swing.add(backBell);
  const tongue = part(new SphereGeometry(0.02, 8, 6), chitinDark, { ink: false });
  tongue.position.y = -0.16;
  swing.add(tongue);

  // --- The mallet in her right hand: a wooden handle and a bronze head.
  const mallet = new Group();
  mallet.position.set(MALLET_X, 0.3, 0.1);
  body.add(mallet);
  const handle = part(new CylinderGeometry(0.012, 0.014, 0.26, 6), wood);
  handle.position.y = 0.11;
  mallet.add(handle);
  const mhead = part(new CapsuleGeometry(0.035, 0.05, 4, 10), brass, { mat: bellMat });
  mhead.rotation.z = Math.PI / 2;
  mhead.position.y = 0.25;
  mallet.add(mhead);
  const gripPaw = mitten(chitinHex, 0.048);
  gripPaw.position.set(0, 0.04, 0.02);
  mallet.add(gripPaw);
  const gripLocal = new Vector3(0, 0.04, 0.0);
  const gripWorld = new Vector3();

  // --- Arms and stubby feet.
  const armL = makeArm(chitinHex, 0.045, 0.18);
  armL.position.set(-0.2, 0.34, 0.07);
  body.add(armL);
  const armR = makeArm(chitinHex, 0.045, 0.18);
  armR.position.set(0.2, 0.34, 0.07);
  body.add(armR);
  const freePaw = mitten(chitinHex, 0.046);
  body.add(freePaw);

  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(chitinDark, 0.06);
    foot.position.set(side * 0.12, 0.044, 0.15);
    foot.scale.multiply(new Vector3(1.1, 0.7, 1.25));
    rig.add(foot);
    feet.push(foot);
  }

  function apply(P, t = 0, fallSign = 1) {
    // Antennae bob with the idle sway (P.ear) and the stride, the tips last.
    antennae.forEach((segs, k) => {
      const side = k === 0 ? -1 : 1;
      segs.forEach((s, i) => {
        s.rotation.x = -(0.21 + i * 0.09) + 0.18 * P.ear * (1 + i * 0.5) - 0.06 * Math.abs(P.stride) * i - P.collapse * 0.3;
        s.rotation.z = side * (0.16 + i * 0.07) + 0.05 * Math.sin(t * 3.1 + i + k);
      });
    });

    // Cast = the mallet rises and strikes down toward the aim; the free paw
    // lifts as if holding the note.
    const lift = Math.max(0, P.prop);
    const wind = Math.min(0, P.prop);
    mallet.rotation.x = -1.1 * lift + 0.55 * wind - 0.15;
    mallet.rotation.z = -0.25 - 0.15 * lift + P.collapse * fallSign * 0.6;
    mallet.position.y = 0.3 + 0.06 * lift;
    freePaw.position.set(-0.19 + 0.03 * lift, 0.33 + 0.08 * lift, 0.11 + 0.08 * lift);

    // The belfry bell swings with the walk and rocks hard on a cast.
    swing.rotation.x = 0.22 * P.stride + 0.5 * lift * Math.sin(t * 18) + 0.06 * Math.sin(t * 1.7) * (1 - lift);
    swing.rotation.z = 0.08 * P.tail;
    tongue.position.z = -swing.rotation.x * 0.04;

    // Wing cases breathe a hair apart while she walks.
    cases[0].rotation.z = -0.03 * Math.abs(P.stride);
    cases[1].rotation.z = 0.03 * Math.abs(P.stride);

    feet[0].position.z = 0.15 + 0.08 * P.stride;
    feet[1].position.z = 0.15 - 0.08 * P.stride;
    feet[0].position.y = 0.044 + 0.04 * Math.max(0, P.stride);
    feet[1].position.y = 0.044 + 0.04 * Math.max(0, -P.stride);

    mallet.updateMatrix();
    aimArm(armR, gripWorld.copy(gripLocal).applyMatrix4(mallet.matrix));
    aimArm(armL, freePaw.position);
  }

  return {
    apply,
    torso,
    head,
    basePitch: 0.02,
    metrics: {
      standHeight: 0.3 + BELFRY_Y - 0.3 + 0.04,
      earTopY: HEAD_C + 0.3,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.26,
      ringRadius: 0.48,
      hipY: HIP,
    },
  };
}
