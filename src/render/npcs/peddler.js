// BRAMBLE, THE PEDDLER — an old tortoise on four stubby legs, carrying her
// whole shop on her back.
//
// Silhouette contract (52-degree camera): from above the read is a striped
// AWNING roof over a domed shell, a head poking out at the front, and a small
// lantern hanging off the awning's front corner. The awning is the one
// rectangular, striped mass in the camp's cast — it is what says "shop" at a
// glance. The awning is pitched back (high at the rear, low at the front) and
// stops short of the head, so the face, the front ledge and the wares stay in
// view from the camera's side.
//
// The lantern is a WARM point of colour but NOT a light: its core is unlit at
// a value clamped under the bloom threshold and its halo is a faint sprite.
//
// Faces +Z. Origin on the ground between the feet.
import {
  BoxGeometry,
  CapsuleGeometry,
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
import { PALETTE } from '../../data/palette.js';
import { mix } from '../critters/common.js';
import { canvasTexture, npcFace, pulse, schedule, seeded, softSprite, unlitUnderBloom } from './common.js';

const SKIN = '#8C8E6E'; // dusty sage-olive (h65, low sat — far off Bright Heal)
const SKIN_DARK = '#6E7258';
const SHELL = '#6E5A3E'; // walnut shell
const SHELL_LIGHT = '#A88C5E';
const SHELL_GROOVE = '#3E3226';
const WOOD = '#7A5E40';
const WOOD_DARK = '#5A4430';
const CANVAS_A = '#E4D8BE'; // awning stripes: cream / muted teal
const CANVAS_B = '#4E7774';
const SCARF = '#7B3F4F'; // faded wine kerchief (h345)
const IRON = '#3A3D44';
const BURLAP = '#A99772';

const SHELL_R = 0.55;
const SHELL_BASE = 0.2;
const SHELL_TOP = 0.7;

export function buildPeddler(rig, kit) {
  const { part, mat } = kit;
  const rand = seeded('peddler');

  const body = new Group();
  rig.add(body);

  // --- Legs: four stubby elephant columns with pale toenails.
  const legGeo = new CapsuleGeometry(0.095, 0.12, 2, 8);
  const legs = [];
  for (const [x, z] of [[-0.36, 0.26], [0.36, 0.26], [-0.34, -0.26], [0.34, -0.26]]) {
    const leg = part(legGeo, SKIN);
    leg.position.set(x, 0.155, z);
    leg.rotation.z = Math.sign(x) * 0.18;
    body.add(leg);
    legs.push(leg);
  }

  // --- Shell: a lathe dome wearing a painted scute pattern.
  const shellTex = canvasTexture(256, (ctx, w, h) => {
    // Lathe UV: u around (0..1 = full turn), v up the profile (rim at v=0).
    ctx.fillStyle = SHELL_GROOVE;
    ctx.fillRect(0, 0, w, h);
    const rows = [
      // [v0, v1, cells, colour]
      [0.0, 0.2, 12, SHELL_LIGHT], // marginal scutes (rim band)
      [0.22, 0.58, 8, SHELL],
      [0.6, 0.86, 5, SHELL],
      [0.88, 1.0, 1, mix(SHELL, SHELL_LIGHT, 0.3).getStyle()],
    ];
    for (const [v0, v1, n, col] of rows) {
      const y0 = h * (1 - v1);
      const y1 = h * (1 - v0);
      for (let i = 0; i < n; i++) {
        const x0 = (w * i) / n;
        const x1 = (w * (i + 1)) / n;
        const pad = 4;
        ctx.fillStyle = col;
        const r = Math.min(14, (x1 - x0) / 3);
        roundRect(ctx, x0 + pad, y0 + pad, x1 - x0 - pad * 2, y1 - y0 - pad * 2, r);
        ctx.fill();
        // a lighter growth-ring centre on every plate
        if (n > 1 && n < 12) {
          ctx.fillStyle = mix(col, SHELL_LIGHT, 0.45).getStyle();
          roundRect(ctx, x0 + pad * 4, y0 + pad * 4, x1 - x0 - pad * 8, y1 - y0 - pad * 8, r * 0.6);
          ctx.fill();
        }
      }
    }
  });
  const shellProfile = [
    [0, SHELL_BASE - 0.02],
    [SHELL_R * 0.92, SHELL_BASE - 0.02],
    [SHELL_R, SHELL_BASE + 0.04],
    [SHELL_R * 0.98, SHELL_BASE + 0.14],
    [SHELL_R * 0.88, SHELL_BASE + 0.29],
    [SHELL_R * 0.68, SHELL_BASE + 0.42],
    [SHELL_R * 0.4, SHELL_TOP - 0.02],
    [0, SHELL_TOP],
  ];
  const shell = part(
    new LatheGeometry(shellProfile.map(([x, y]) => new Vector2(x, y)), 24),
    '#FFFFFF',
    { name: 'shell', map: shellTex }
  );
  shell.scale.set(1, 1, 0.9);
  body.add(shell);
  // Plastron underside: a flat pale disc so the shell has a lip from above.
  const plastron = part(new CylinderGeometry(SHELL_R * 0.86, SHELL_R * 0.8, 0.07, 22), mix(SHELL_LIGHT, SKIN, 0.4).getHex());
  plastron.position.y = SHELL_BASE - 0.03;
  plastron.scale.z = 0.88;
  body.add(plastron);
  // Stubby tail.
  const tail = part(new ConeGeometry(0.05, 0.14, 8), SKIN);
  tail.rotation.x = -Math.PI / 2 - 0.3;
  tail.position.set(0, 0.19, -0.5);
  body.add(tail);

  // --- Head + neck: slides in and out of the shell's front opening.
  const neckPivot = new Group();
  neckPivot.position.set(0, 0.3, 0.38);
  body.add(neckPivot);
  const neck = part(new CapsuleGeometry(0.085, 0.16, 2, 8), SKIN);
  neck.rotation.x = Math.PI / 2 - 0.55;
  neck.position.set(0, 0.04, 0.08);
  neckPivot.add(neck);
  const head = new Group();
  head.position.set(0, 0.13, 0.2);
  neckPivot.add(head);
  const HR = 0.15;
  const skull = part(new SphereGeometry(HR, 14, 10), SKIN, { name: 'skull' });
  skull.scale.set(1, 0.92, 1.1);
  head.add(skull);
  // Beaky tortoise snout.
  const snout = part(new SphereGeometry(0.07, 10, 7), mix(SKIN, CANVAS_A, 0.25).getHex());
  snout.scale.set(1.2, 0.8, 1);
  snout.position.set(0, -0.045, HR * 0.95);
  head.add(snout);
  const jaw = new Group();
  jaw.position.set(0, -0.07, HR * 0.6);
  head.add(jaw);
  const jawM = part(new SphereGeometry(0.06, 8, 6), SKIN_DARK, { ink: false });
  jawM.scale.set(1.3, 0.45, 1.1);
  jawM.position.set(0, -0.005, 0.07);
  jaw.add(jawM);
  head.add(npcFace({ R: HR, sx: 1, sy: 0.92, sz: 1.1, drop: 0.52, spread: 0.22, eyeW: 0.1, eyeH: 0.12 }));
  // Kerchief: a cap over the crown with a knot at the back.
  const scarf = part(new SphereGeometry(HR * 1.06, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.36), SCARF, { name: 'scarf' });
  scarf.scale.set(1, 0.95, 1.12);
  scarf.rotation.x = -0.95; // worn on the back of the crown: the face stays open to the camera
  head.add(scarf);
  const knot = part(new SphereGeometry(0.035, 8, 6), SCARF);
  knot.position.set(0, -0.02, -HR * 1.02);
  head.add(knot);
  for (const side of [-1, 1]) {
    const flap = part(new ConeGeometry(0.03, 0.09, 6), SCARF, { ink: false });
    flap.position.set(side * 0.03, -0.06, -HR * 1.12);
    flap.rotation.set(-2.2, 0, side * 0.5);
    head.add(flap);
  }

  // --- The shop on her back.
  const shop = new Group();
  shop.position.y = SHELL_TOP - 0.06;
  body.add(shop);
  const deck = part(new BoxGeometry(0.66, 0.05, 0.52), WOOD, { name: 'deck' });
  deck.position.set(0, 0.0, -0.02);
  shop.add(deck);
  // Posts: tall at the back, short at the front (the awning's pitch).
  const postGeo = new CylinderGeometry(0.018, 0.022, 1, 6);
  const BACK_H = 0.56;
  const FRONT_H = 0.42;
  const BACK_Z = -0.28;
  const FRONT_Z = -0.02;
  for (const [x, z, hgt] of [[-0.3, BACK_Z, BACK_H], [0.3, BACK_Z, BACK_H], [-0.3, FRONT_Z, FRONT_H], [0.3, FRONT_Z, FRONT_H]]) {
    const p = part(postGeo, WOOD_DARK);
    p.scale.y = hgt;
    p.position.set(x, hgt / 2, z);
    shop.add(p);
  }
  // Awning: striped canvas slab pitched toward the front, with a scalloped
  // valance along its front edge.
  const stripes = canvasTexture(64, (ctx, w, h) => {
    const n = 7;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 === 0 ? CANVAS_A : CANVAS_B;
      ctx.fillRect((w * i) / n, 0, w / n + 1, h);
    }
  }, 128);
  const awning = new Group();
  const dz = FRONT_Z - BACK_Z; // back->front run
  const dy = BACK_H - FRONT_H;
  const pitch = Math.atan2(dy, dz);
  awning.position.set(0, (BACK_H + FRONT_H) / 2 + 0.02, (BACK_Z + FRONT_Z) / 2);
  awning.rotation.x = pitch;
  shop.add(awning);
  const roof = part(new BoxGeometry(0.8, 0.03, Math.hypot(dy, dz) + 0.16), '#FFFFFF', { name: 'awning', map: stripes });
  awning.add(roof);
  const scallopGeo = new SphereGeometry(0.058, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const front = Math.hypot(dy, dz) / 2 + 0.08;
  for (let i = 0; i < 7; i++) {
    const s = part(scallopGeo, i % 2 === 0 ? CANVAS_A : CANVAS_B, { ink: false });
    s.scale.set(1, 0.9, 0.35);
    s.position.set(-0.342 + i * 0.114, -0.01, front);
    awning.add(s);
  }
  // Wares on the deck: two crates, a sack, a rolled bundle.
  const crateGeo = new BoxGeometry(1, 1, 1);
  const crateA = part(crateGeo, WOOD);
  crateA.scale.set(0.2, 0.15, 0.17);
  crateA.position.set(-0.17, 0.1, 0.1);
  crateA.rotation.y = 0.2;
  shop.add(crateA);
  const crateB = part(crateGeo, mix(WOOD, CANVAS_A, 0.2).getHex());
  crateB.scale.set(0.15, 0.12, 0.14);
  crateB.position.set(-0.15, 0.235, 0.08);
  crateB.rotation.y = -0.25;
  shop.add(crateB);
  const sack = part(new SphereGeometry(0.11, 10, 7), BURLAP);
  sack.scale.set(1, 0.95, 0.9);
  sack.position.set(0.15, 0.11, 0.1);
  shop.add(sack);
  const tie = part(new CylinderGeometry(0.03, 0.05, 0.06, 8), mix(BURLAP, WOOD_DARK, 0.4).getHex(), { ink: false });
  tie.position.set(0.15, 0.22, 0.1);
  shop.add(tie);
  // Bedroll lashed across the shell's back.
  const roll = part(new CylinderGeometry(0.075, 0.075, 0.62, 12), CANVAS_B);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, -0.02, -0.33);
  shop.add(roll);
  for (const x of [-0.18, 0.18]) {
    const strap = new Mesh(new TorusGeometry(0.078, 0.012, 4, 12), mat(WOOD_DARK));
    strap.rotation.y = Math.PI / 2;
    strap.position.set(x, -0.02, -0.33);
    shop.add(strap);
  }

  // Hanging pots along the awning's front edge (cord + pot), swaying.
  const hangers = [];
  const cordMat = mat(WOOD_DARK);
  const potGeo = new SphereGeometry(0.055, 8, 6);
  // [x, z, colour, cord drop] — hung off the side eaves, clear of the wares
  const potDefs = [
    [-0.37, -0.24, IRON, 0.14],
    [-0.37, -0.08, mix(PALETTE.paleGold, WOOD, 0.35).getHex(), 0.1],
    [0.37, -0.22, IRON, 0.12],
  ];
  const eaveY = (z) => BACK_H + (FRONT_H - BACK_H) * ((z - BACK_Z) / dz) + 0.02;
  for (const [x, z, col, drop] of potDefs) {
    const h = new Group();
    h.position.set(x, eaveY(z) - 0.01, z);
    shop.add(h);
    const cord = new Mesh(new CylinderGeometry(0.004, 0.004, drop, 4), cordMat);
    cord.position.y = -drop / 2;
    h.add(cord);
    const pot = part(potGeo, col);
    pot.scale.set(1, 0.8, 1);
    pot.position.y = -drop - 0.04;
    h.add(pot);
    const lip = new Mesh(new TorusGeometry(0.045, 0.01, 4, 10), mat(mix(col, '#000000', 0.2).getHex()));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -drop - 0.005;
    h.add(lip);
    hangers.push(h);
  }

  // Lantern: hangs from a bracket at the awning's front-right corner.
  const bracket = part(new BoxGeometry(0.16, 0.02, 0.02), WOOD_DARK, { ink: false });
  bracket.position.set(0.38, FRONT_H + 0.02, FRONT_Z + 0.06);
  shop.add(bracket);
  const lantern = new Group();
  lantern.position.set(0.45, FRONT_H + 0.01, FRONT_Z + 0.06);
  lantern.scale.setScalar(1.35);
  shop.add(lantern);
  const lcord = new Mesh(new CylinderGeometry(0.004, 0.004, 0.06, 4), cordMat);
  lcord.position.y = -0.03;
  lantern.add(lcord);
  const cap = part(new ConeGeometry(0.055, 0.05, 6), IRON);
  cap.position.y = -0.075;
  lantern.add(cap);
  // Warm core: unlit amber clamped UNDER the bloom threshold — a lit window,
  // not a light source.
  const coreMat = new MeshBasicMaterial({ color: unlitUnderBloom(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.4).getHex(), 0.82) });
  const core = new Mesh(new CylinderGeometry(0.035, 0.035, 0.07, 8), coreMat);
  core.position.y = -0.135;
  lantern.add(core);
  // Open frame: four iron posts round the core (a closed cage would hide it).
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bar = new Mesh(new BoxGeometry(0.012, 0.08, 0.012), mat(IRON));
    bar.position.set(Math.cos(a) * 0.042, -0.135, Math.sin(a) * 0.042);
    lantern.add(bar);
  }
  const base = part(new CylinderGeometry(0.048, 0.04, 0.02, 8), IRON, { ink: false });
  base.position.y = -0.18;
  lantern.add(base);
  const halo = softSprite(0.32, mix(PALETTE.hearthAmber, PALETTE.parchment, 0.35).getHex(), 0.34, 0.55);
  halo.position.y = -0.135;
  lantern.add(halo);

  // --- Idle
  const peeks = schedule(rand, 5, 9);
  const blinks = schedule(rand, 3, 6);
  const faceMesh = head.children.find((c) => c.name === 'face');

  function update(_dt, t, talk) {
    const br = Math.sin(t * 1.0);
    body.scale.set(1 + 0.008 * br, 1 + 0.012 * br, 1 + 0.008 * br);
    // Head bob: a slow out-and-in of the neck, plus a "peek" further out now
    // and then.
    const P = peeks.at(t);
    const pk = pulse(P.since, 2.8, 0.5);
    const out = 0.5 + 0.5 * Math.sin(t * 0.8);
    neckPivot.position.z = 0.36 + 0.035 * out + 0.06 * pk;
    neckPivot.rotation.x = -0.05 * out - 0.12 * pk + 0.1 * talk * Math.max(0, Math.sin(t * 6));
    neckPivot.rotation.y = (P.r - 0.5) * 0.6 * pk;
    head.rotation.z = (P.r - 0.5) * 0.3 * pk;
    head.rotation.x = -0.42 - 0.08 * pk; // chin up: presents the face to the 52-degree camera
    jaw.rotation.x = 0.4 * talk * Math.max(0, Math.sin(t * 11));
    // Blink: squash the painted face decal for a moment.
    const bl = pulse(blinks.at(t).since, 0.2, 0.3);
    if (faceMesh) faceMesh.visible = bl < 0.5;
    // Lantern + pots sway (the shell rocks a hair with the breath).
    lantern.rotation.z = 0.16 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 3.1);
    lantern.rotation.x = 0.08 * Math.sin(t * 0.9 + 1.2);
    halo.material.opacity = 0.5 + 0.06 * Math.sin(t * 5.3) + 0.04 * Math.sin(t * 8.1);
    for (let i = 0; i < hangers.length; i++) {
      hangers[i].rotation.z = 0.1 * Math.sin(t * 1.3 + 0.7 * (i + 1));
      hangers[i].rotation.x = 0.06 * Math.sin(t * 1.1 + i);
    }
  }

  return { update, head, metrics: { height: SHELL_TOP - 0.06 + BACK_H + 0.05, radius: 0.6 } };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
