// Healer — chibi mouse (BUILD_BRIEF §19.2): the softest CLOSED bell cloak in
// Sage #33513C, small round ears, short snout, staff with a Bright Heal gem
// that brightens on cast.
//
// Silhouette contract: a wide-based BELL. The base flare (0.335) is more than
// twice the shoulder radius (0.155), so in greyscale at 50% zoom she is a
// smooth triangle — the one shape in the party that widens all the way down.
// (The rejected build gave her an egg the same mass as the fox's, and the two
// were indistinguishable in the silhouette test.)
//
// The staff is held OUT TO THE SIDE and slightly forward, with a small gem
// glow: at head height and centred it erased her right eye at gallery framing
// and turned her face into a white-green blob on the cast clip.
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  QuadraticBezierCurve3,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite } from '../glow.js';
import { bell, bodyPanel, mix, exactColor, exactColorNearest, part, faceDecal, mitten, makeArm, aimArm } from './common.js';
import { FALL_ANGLE } from './index.js';

// Proportion note: the acceptance measures head mass (dome -> chin) over total
// standing height INCLUDING ears, read off a straight-on capture. Geometry is
// authored ~41% so the pixel reading — which puts the chin at the visible neck
// pinch, a little below the skull's bottom pole — lands inside 42-44%. The body
// therefore ends in a NARROW neck (0.105 u) with the shoulders well below it:
// a wide cowl at chin height reads as part of the head and pushed the measured
// figure past 50%.
const HIP = 0.2;
// Garment hems sit clear of the floor: the clip-space ink hull on a hem at
// exactly y=0 expands BELOW the ground plane, where the floor and the identity
// ring clip it (round-3 F10 — the healer's hem ink stopped a third of the way
// along and dashed hull pixels poked through the ring).
const HEM = 0.022;
const HEAD_C = 0.784;
const HEAD_R = 0.235;
const SX = 1.02, SY = 0.96, SZ = 0.99;
const EAR_TOP = 1.1;

export function buildHealer(rig, trackAccent) {
  const accent = CLASS_ACCENTS.healer;
  // §19.1/19.2: Warm Grey #9C9186 is the shared PARTY BASE on all four; only
  // the garment carries the class accent. (Every critter being a single-accent
  // monochrome egg is what made the party read as four coloured eggs rather
  // than one family with class trim.)
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.14);
  const furHex = fur.getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group(); // authored in feet-origin coordinates
  body.position.y = -HIP;
  torso.add(body);

  // --- Closed bell cloak: base flares far wider than the shoulders.
  const cloakMat = trackAccent(toonMaterial({ color: accent }));
  const cloak = part(
    bell([
      [0, HEM],
      [0.21, HEM],
      [0.31, 0.055],
      [0.34, 0.14],
      [0.33, 0.25],
      [0.3, 0.35],
      [0.255, 0.44],
      [0.19, 0.51],
      [0.13, 0.556],
      [0.105, 0.585],
      [0, 0.6],
    ]),
    accent,
    { mat: cloakMat }
  );
  body.add(cloak);

  // Bone belly panel (storybook trim) + warm-grey cowl. The cowl also welds the
  // head to the shoulders: an open neck joint is what left a black wedge under
  // the head whenever the walk lean fired.
  const belly = bodyPanel(
    [
      [0.325, 0.16],
      [0.33, 0.25],
      [0.3, 0.35],
      [0.255, 0.44],
      [0.2, 0.5],
    ],
    { color: PALETTE.bone, phiLength: 1.15 }
  );
  body.add(belly);

  // Narrow accent collar AT the chin: it separates fur from garment and puts
  // the silhouette's neck pinch exactly where the head measurement wants it.
  const collar = part(new CylinderGeometry(0.115, 0.15, 0.075, 20), mix(accent, PALETTE.voidCharcoal, 0.2).getHex());
  collar.position.y = 0.565;
  body.add(collar);
  // Warm Grey #9C9186 sash — the shared party base, visible on every class.
  const sash = part(new CylinderGeometry(0.285, 0.3, 0.055, 24), mix(PALETTE.warmGrey, PALETTE.bone, 0.2).getHex());
  sash.position.y = 0.3;
  body.add(sash);

  // --- Head
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 28, 22), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);

  // Small round mouse ears + inner blush.
  const earGeo = new SphereGeometry(0.105, 16, 12);
  const innerMat = toonMaterial({ color: mix(PALETTE.bone, PALETTE.bruiseUmber, 0.35).getHex() });
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.15, 0.15, -0.025);
    const ear = part(earGeo, furHex);
    ear.scale.set(1, 1, 0.42);
    ear.position.y = 0.088;
    pivot.add(ear);
    const inner = new Mesh(new SphereGeometry(0.055, 12, 10), innerMat);
    inner.scale.set(1, 1, 0.3);
    inner.position.set(0, 0.075, 0.045);
    pivot.add(inner);
    pivot.rotation.z = side * -0.26;
    head.add(pivot);
    ears.push(pivot);
  }

  // Short snout + ink nose.
  const snout = part(new SphereGeometry(0.078, 16, 12), PALETTE.bone);
  snout.scale.set(0.9, 0.62, 0.95);
  snout.position.set(0, -0.082, SZ * HEAD_R * 0.82);
  head.add(snout);
  const nose = part(new SphereGeometry(0.019, 10, 8), PALETTE.voidCharcoal, { ink: false });
  nose.position.set(0, -0.062, SZ * HEAD_R * 0.82 + 0.062);
  head.add(nose);

  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, drop: 0.575 }));

  // --- Thin curled mouse tail (inked like every other mass — a bare tan
  // rectangle with flat-cut ends read as a splinter stuck to the cloak).
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.2, -0.27);
  const tailCurve = new QuadraticBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0.1, -0.08, -0.13),
    new Vector3(0.25, 0.02, -0.2)
  );
  const tail = part(new TubeGeometry(tailCurve, 14, 0.022, 7), furHex);
  tailPivot.add(tail);
  body.add(tailPivot);

  // --- Staff: vertical, held out to the side, gem well clear of the face.
  const staff = new Group();
  staff.position.set(0.4, 0, 0.2);
  body.add(staff);
  const shaft = part(
    new CylinderGeometry(0.024, 0.029, 0.81, 10),
    mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.3).getHex()
  );
  shaft.position.y = 0.455;
  staff.add(shaft);
  // --- THE GEM (round-3 F6). It measured #C0EEA0 — a pale chartreuse 38 hue
  // degrees off Bright Heal — with a hard ink border and zero halo, i.e. the
  // party's only light emitter emitted nothing. Three changes:
  //   * unlit MeshBasicMaterial on the post-chain-compensated Bright Heal, so
  //     the core lands on EXACTLY #5FE873 in the final frame instead of being
  //     dragged pale by the toon ramp and the warm key light;
  //   * no ink hull — a Void Charcoal outline around a light source is what
  //     made it read as a painted chip;
  //   * a two-layer additive halo (§19.4 "core + glow + particles"): the core
  //     is authored well above the bloom threshold so UnrealBloomPass bleeds it
  //     into the surrounding pixels, and both halo layers ramp with the cast.
  const GEM_Y = 0.93;
  const gemMat = new MeshBasicMaterial({ color: exactColorNearest(PALETTE.brightHeal) });
  const gem = new Mesh(new OctahedronGeometry(0.052), gemMat);
  gem.position.y = GEM_Y;
  gem.renderOrder = 2;
  staff.add(gem);
  const GLOW_BASE = 0.26;
  // The halo is the layer that carries the bloom: authored ~3x the in-gamut
  // gem value, it clears the composer's bloom threshold and bleeds into the
  // surrounding pixels (REFERENCE_BAR check 2: every emitter has a glow halo).
  const glow = makeGlowSprite({
    color: exactColorNearest(PALETTE.brightHeal).multiplyScalar(3.1),
    size: GLOW_BASE,
    opacity: 0.6,
  });
  glow.position.y = GEM_Y;
  staff.add(glow);
  // Tight inner flare: keeps a hot core inside the wide halo so the emitter
  // reads as a point of light rather than a green smudge.
  const flare = makeGlowSprite({ color: exactColor(PALETTE.parchment).multiplyScalar(1.6), size: GLOW_BASE * 0.4, opacity: 0.55 });
  flare.position.y = GEM_Y;
  staff.add(flare);

  const gripPaw = mitten(furHex, 0.058);
  gripPaw.position.set(0, 0.5, 0.014);
  staff.add(gripPaw);
  const wrap = part(new CylinderGeometry(0.032, 0.032, 0.09, 10), mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.35).getHex());
  wrap.position.y = 0.36;
  staff.add(wrap);

  // --- Arms: stubby, re-aimed every frame so the grip can never float.
  const armR = makeArm(furHex, 0.056, 0.22);
  armR.position.set(0.25, 0.44, 0.08);
  body.add(armR);
  const armL = makeArm(furHex, 0.056, 0.22);
  armL.position.set(-0.25, 0.44, 0.08);
  body.add(armL);

  const freePaw = mitten(furHex, 0.058);
  freePaw.position.set(-0.31, 0.33, 0.21);
  body.add(freePaw);

  const gripWorld = new Vector3();
  const gripLocal = new Vector3(0, 0.5, 0.014);
  const gemBase = exactColorNearest(PALETTE.brightHeal);
  const gemDown = exactColor(mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.45).getHex());

  function apply(P, t, fallSign = 1) {
    ears[0].rotation.z = -0.26 - P.ear - P.collapse * 0.5;
    ears[1].rotation.z = 0.26 + P.ear * 0.8 + P.collapse * 0.5;
    tailPivot.rotation.y = P.tail * 0.8;
    tailPivot.rotation.z = 0.2 * P.tail;

    // Cast: staff lifts and cants forward, gem flares.
    // Downed (round-3 F8): the staff is never hidden — it swings DOWN to lie
    // flat on the ground beside the body, so the third mass stays on screen at
    // the exact moment the player needs to identify who went down.
    // The collapse rotates the whole rig about Z by fallSign * FALL_ANGLE, so a
    // fixed downed angle lands differently depending on which way the body
    // fell. Counter-rotating by that exact amount puts the staff FLAT on the
    // ground in world space whichever side the healer drops on, and +Z keeps it
    // in front of the body rather than under it.
    const lay = P.collapse;
    const flat = -fallSign * (Math.PI / 2 + FALL_ANGLE);
    staff.position.y = (0.26 * Math.max(0, P.prop) + 0.05 * Math.min(0, P.prop)) * (1 - lay) - 0.1 * lay;
    staff.position.x = 0.4 * (1 - lay) + 0.02 * lay;
    staff.position.z = 0.19 * (1 - lay) + 0.34 * lay;
    staff.rotation.x = -0.2 * Math.max(0, P.prop) * (1 - lay);
    staff.rotation.z = (0.12 * P.prop) * (1 - lay) + flat * lay;

    staff.updateMatrix();
    aimArm(armR, gripWorld.copy(gripLocal).applyMatrix4(staff.matrix));
    aimArm(armL, freePaw.position);

    // Emitter heat: the CORE hex never moves (it is the reserved Bright Heal
    // hex and must measure as such in every frame) — the cast is carried by the
    // halo, which roughly triples in area and doubles in opacity on release.
    const heat = P.gem * (1 - P.desat);
    gemMat.color.copy(gemBase).lerp(gemDown, P.desat);
    const gs = GLOW_BASE * (1 + 1.15 * heat);
    glow.scale.set(gs, gs, 1);
    glow.material.opacity = (0.34 + 0.62 * heat) * (1 - P.desat);
    const fs = GLOW_BASE * 0.42 * (1 + 0.9 * heat);
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = (0.3 + 0.6 * heat) * (1 - P.desat);
    gem.scale.setScalar(1 + 0.22 * heat);
    gem.rotation.y = t * 1.1;
  }

  return {
    apply,
    torso,
    head,
    basePitch: 0,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.34,
      hipY: HIP,
    },
  };
}
