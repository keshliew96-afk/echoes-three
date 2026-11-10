// BROOD SPIDER AND BROODLING, MODEL STANDARD (docs/MODEL_STANDARD.md "The
// Level III foes"). The classic spider rig of enemies/archetypes.js (a
// bloated round abdomen on eight angular legs behind a small dark thorax;
// the indigo hourglass on the brood's back its one tell, a single indigo
// dot on the broodling's; the brood splits into two broodlings when it
// dies) with the sample video's technique laid ON TOP of its chibi ink
// look. One builder serves both, at the brood's size and at half of it.
// What they gain:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd of each kind): the abdomen cut into planes with a
//     bristle of short hairs round its rim and a pale underside, the thorax
//     with its cluster of charcoal slit eyes (never round, never warm), two
//     fanged chelicerae and the pedipalps, the hourglass (or dot) baked
//     unlit on its own row;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): eight legs, each a femur
//     and a tibia laid by two-bone IK with the knee arched high and out,
//     onto tips pinned to the floor while they carry weight, stepping in
//     two alternating tetrapods (legs 1 and 3 of one side with 2 and 4 of
//     the other) along the real travel, so a strafe skitters sideways and a
//     turn shuffles round (rule 2); the body leans into the travel (rule 1);
//   * the BITE on contact (sim/enemies/brood.js: unwarned, a per-target
//     cooldown of 60 ticks, 45 for a broodling), on the foe kit's 3-hit
//     chain (Kesh's template, §6.1 B1, B2, B5, B6): a predicted bite's
//     contact lands on the sim's bite tick (the per-target cooldown says
//     when), an unwarned one strikes quick (`freshLead` 2.5 frames); the
//     front legs step in by the contact (rule 3). Bite 1 lunges in with the
//     fangs from its right, bite 2 from its left, bite 3 the pounce: it
//     rears up on its back legs with the front pair raised and comes down
//     on the target with a hop (B6). Each hit's overshoot settles into the
//     next hit's wind-up, held for the chain window;
//   * the spawn-in grow (B7), named points (B8: the fangs, the mouth), and
//     the hit and death tuning (the brood's death swells more: it bursts).
//
// Faces +Z. Same contract as buildBrood / buildBroodling (group, mats,
// setYaw, pose) plus lab, react, death, points. Render only: the sim, its
// timing, damage and the split untouched.
import { BoxGeometry, ConeGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createChain, createFoeClock, createFoeFrame, foeMaterial, foePart, freshWarp, heldBy, hitPose, hitTimelines, hornGeometry, namedPoint, placeBody, pullBack, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's spiders (sim/enemies/brood.js S and L): the brood skitters 1.7
// u/s and bites every 60 ticks per target; the broodling 2.8 u/s, 45 ticks.
const TICK_HZ = 60;
const SPIDERS = Object.freeze({
  brood: Object.freeze({ size: 1, hourglass: true, speed: 1.7, cd: 60 }),
  broodling: Object.freeze({ size: 0.5, hourglass: false, speed: 2.8, cd: 45 }),
});
// A bite inside this window of the last one is the next hit of the chain.
const CHAIN_WINDOW = 1.25;

// --- Key poses (at the brood's size; the broodling scales them). push (u,
// +z), lift (u), pitch (front down +), roll, twist (+ toward its left), sx /
// sy (squash), fangs (0..1 the chelicerae spread), rear (0..1 the front pair
// raised off the floor), abd (rad, the abdomen cocked up).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, fangs: 0.1, rear: 0, abd: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// Bite 1, THE RIGHT FANG: wound back and turned to its right, fangs spread;
// it lunges in and to its left and the fangs close.
const A1 = K({ push: -0.04, pitch: -0.06, twist: -0.2, roll: 0.04, sx: 0.97, sy: 1.04, fangs: 0.7 });
const P1 = K({ push: -0.07, pitch: -0.08, twist: -0.28, roll: 0.06, sx: 0.96, sy: 1.05, fangs: 0.9 });
const S1 = K({ push: 0.14, pitch: 0.16, twist: 0.18, roll: -0.05, sx: 1.19, sy: 0.91, fangs: 0 });
const O1 = K({ push: 0.1, pitch: 0.12, twist: 0.26, roll: -0.06, sx: 1.06, sy: 0.97, fangs: 0.15 });
// Bite 2, THE LEFT FANG: the mirror.
const A2 = K({ push: -0.04, pitch: -0.06, twist: 0.2, roll: -0.04, sx: 0.97, sy: 1.04, fangs: 0.7 });
const P2 = K({ push: -0.07, pitch: -0.08, twist: 0.28, roll: -0.06, sx: 0.96, sy: 1.05, fangs: 0.9 });
const S2 = K({ push: 0.14, pitch: 0.16, twist: -0.18, roll: 0.05, sx: 1.19, sy: 0.91, fangs: 0 });
const O2 = K({ push: 0.1, pitch: 0.12, twist: -0.26, roll: 0.06, sx: 1.06, sy: 0.97, fangs: 0.15 });
// Bite 3, THE POUNCE (the biggest, §6.1 B6): reared up on its back legs
// with the front pair raised and the fangs wide; it comes down on the
// target off a hop, the abdomen cocked up behind.
const A3 = K({ push: -0.03, pitch: -0.22, lift: 0.03, sx: 0.98, sy: 1.04, fangs: 0.8, rear: 0.8, abd: 0.1 });
const P3 = K({ push: -0.06, pitch: -0.3, lift: 0.05, sx: 0.96, sy: 1.06, fangs: 1, rear: 1, abd: 0.15 });
const S3 = K({ push: 0.16, pitch: 0.2, lift: 0.02, sx: 1.19, sy: 0.9, fangs: 0, rear: 0, abd: 0.35 });
const O3 = K({ push: 0.12, pitch: 0.14, sx: 1.06, sy: 0.96, fangs: 0.15, rear: 0, abd: 0.2 });
const HITS = [
  { label: 'the right fang', from: A1, pull: P2, strike: S1, over: O1, next: A2 },
  { label: 'the left fang', from: A2, pull: P3, strike: S2, over: O2, next: A3 },
  { label: 'the pounce', from: A3, pull: P1, strike: S3, over: O3, next: A1 },
].map((h) => Object.freeze(h));
const HIT_TL = hitTimelines(HITS, CHAIN_WINDOW, createTimeline);
export function broodHitPose(n, t, from, fresh, pull, out = { ...REST }) {
  return hitPose(HITS, HIT_TL, REST, n, t, from, fresh, pull, out, ease);
}
// An unwarned bite strikes quick (B1): wind-back and strike in 2.5 frames.
export const BROOD_FRESH_LEAD = 2.5 * FRAME;
const CONTACT_IN = 3.5 * FRAME;
// The lab's bite chain at a kind's own cadence: the first bite unwarned,
// the next two predicted from the per-target cooldown (pure in t).
function biteChain(kind) {
  const bite = SPIDERS[kind].cd / TICK_HZ;
  const CONTACTS = [BROOD_FRESH_LEAD, bite, 2 * bite];
  return Object.freeze({
    id: 'bites',
    label: 'Bite chain',
    duration: CONTACTS[2] - CONTACT_IN + HIT_TL[2].duration,
    at(t) {
      const n = t < CONTACTS[1] - (CONTACT_IN - FRAME) ? 0 : t < CONTACTS[2] - (CONTACT_IN - FRAME) ? 1 : 2;
      const tt = n === 0 ? freshWarp(t, BROOD_FRESH_LEAD) : t - (CONTACTS[n] - CONTACT_IN);
      const due = n < 2 ? CONTACTS[n + 1] - t : null;
      const s = HIT_TL[n].sample(tt);
      const pull = s.id === 'ready' ? pullBack(due) : 0;
      return { n, t: tt, fresh: n === 0, pull, from: n === 0 ? REST : HITS[n - 1].pull, phase: s.id, label: `${HIT_TL[n].label}: ${s.label}` };
    },
    strikes: CONTACTS,
  });
}
export const BROOD_ABILITIES = Object.freeze({ bites: biteChain('brood') });
export const BROODLING_ABILITIES = Object.freeze({ bites: biteChain('broodling') });

// --- Geometry (built once per kind for the session) ------------------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const TWO_PI = Math.PI * 2;
// The abdomen's hinge (body space, at the brood's size).
const ABD_AT = new Vector3(0, 0.3, -0.02);
const SETS = {};
function geos(kind) {
  if (SETS[kind]) return SETS[kind];
  const { size: z, hourglass } = SPIDERS[kind];
  const set = {};
  // The thorax (the body's root): a dark faceted knob with the eye cluster,
  // the pedipalps; the fangs ride their own row.
  set.thorax = bakeParts(`${kind}:thorax`, () => {
    const out = [{ geo: fz(new IcosahedronGeometry(0.16, 0), 0.14, 1101), m: M(0, 0.22 * z, 0.18 * z, z, z, z) }];
    const palp = fz(new ConeGeometry(0.03, 0.14, 4).translate(0, 0.07, 0), 0.1, 1103);
    for (const s of [-1, 1]) out.push({ geo: palp, m: M(s * 0.07 * z, 0.16 * z, 0.3 * z, z, z, z, qa(1, 0, 0, 1.2).multiply(qa(0, 0, 1, -s * 0.4))), tone: 0.85 });
    return out;
  });
  // The abdomen (about its hinge): the bloated egg cut into planes, a
  // bristle of hairs round its rim, a pale underside.
  set.abdomen = bakeParts(`${kind}:abdomen`, () => {
    const o = (x, y, zz) => [(x - ABD_AT.x) * z, (y - ABD_AT.y) * z, (zz - ABD_AT.z) * z];
    const out = [
      { geo: fz(new IcosahedronGeometry(0.3, 1), 0.14, 1111), m: M(...o(0, 0.34, -0.16), 1.05 * z, 0.85 * z, 1.15 * z) },
      { geo: fz(new SphereGeometry(0.26, 8, 3, 0, TWO_PI, Math.PI * 0.6, Math.PI * 0.4), 0.1, 1113), m: M(...o(0, 0.32, -0.16), 1.1 * z, 0.6 * z, 1.2 * z), tone: 1.45 },
    ];
    const hair = wedgeGeometry();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TWO_PI;
      const dir = new Vector3(Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9).normalize();
      const p = new Vector3(Math.cos(a) * 0.3 * z, 0.34 * z, (-0.16 + Math.sin(a) * 0.33) * z);
      out.push({ geo: hair, m: new Matrix4().compose(new Vector3(...o(p.x / z, p.y / z, p.z / z)), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.03 * z, 0.08 * z, 0.025 * z)), tone: 0.7 });
    }
    return out;
  });
  // The tell (unlit): the hourglass on the brood's back, a dot on the
  // broodling's.
  set.tell = bakeParts(`${kind}:tell`, () => {
    const o = (x, y, zz) => [(x - ABD_AT.x) * z, (y - ABD_AT.y) * z, (zz - ABD_AT.z) * z];
    if (hourglass) {
      const half = fz(new ConeGeometry(0.07, 0.12, 4), 0.1, 1121);
      const q = qa(1, 0, 0, -Math.PI / 2 + 0.35);
      return [
        { geo: half, m: new Matrix4().compose(new Vector3(...o(0, 0.6, -0.12)), q, new Vector3(1, 1, 1)).multiply(M(0, 0.06, 0)) },
        { geo: half, m: new Matrix4().compose(new Vector3(...o(0, 0.6, -0.12)), q, new Vector3(1, 1, 1)).multiply(M(0, -0.06, 0, 1, 1, 1, qa(1, 0, 0, Math.PI))) },
      ];
    }
    return [{ geo: fz(new IcosahedronGeometry(0.05, 0), 0.1, 1123), m: M(...o(0, 0.6, -0.12)) }];
  });
  // Eyes: a cluster of slit bars (unlit charcoal) on the thorax's front.
  set.eyes = bakeParts(`${kind}:eyes`, () => {
    const bar = fz(new BoxGeometry(0.045, 0.016, 0.016), 0, 1);
    const out = [];
    for (const [x, y, s] of [[-0.06, 0.26, 1], [0.06, 0.26, -1], [-0.03, 0.3, 1], [0.03, 0.3, -1]]) out.push({ geo: bar, m: M(x * z, y * z, 0.32 * z, z, z, z, qa(0, 0, 1, s * 0.5)) });
    return out;
  });
  // A leg bone (y 0..1, tapering); a fang (a curved horn, down and in).
  set.bone = fz(new ConeGeometry(0.7, 1, 4).translate(0, 0.5, 0), 0.1, 1131);
  set.fang = hornGeometry({ len: 1, r: 0.3, bend: 0.9, seg: 3, sides: 4, seed: 1133 });
  for (const g of Object.values(set)) markShared(g);
  SETS[kind] = set;
  return set;
}

// Legs: four each side, 0..3 its left (+x) front to back, 4..7 its right.
// Hips on the thorax in body space, tip homes on the floor (yaw space),
// the knee's pole (up and out). At the brood's size; scaled per kind.
function legsOf(z) {
  const HIPS = [];
  const HOMES = [];
  const BEND = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const a = 0.9 - i * 0.6; // the legs fan from forward to back
      HIPS.push(new Vector3(s * 0.1 * z, 0.24 * z, (0.26 - i * 0.12) * z));
      HOMES.push(new Vector3(s * Math.cos(a) * 0.46 * z + s * 0.04 * z, 0, (Math.sin(a) * 0.46 + 0.1) * z));
      BEND.push(new Vector3(s * Math.cos(a), 0.9, Math.sin(a)).normalize());
    }
  }
  return { HIPS, HOMES, BEND };
}
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

function spiderFacet(kind) {
  const { size: z, speed: SPEED, cd } = SPIDERS[kind];
  const BITE_SEC = cd / TICK_HZ;
  const G = geos(kind);
  const { HIPS, HOMES, BEND } = legsOf(z);
  const L1 = 0.3 * z;
  const L2 = 0.34 * z;
  const PIVOT = new Vector3(0, 0.22 * z, 0.1 * z);
  const ABILITIES = kind === 'brood' ? BROOD_ABILITIES : BROODLING_ABILITIES;
  const F = createFoeFrame(kind);
  const { body, spawn, track } = F;
  const bodyMat = track(foeMaterial(HIDE.broodBody));
  const darkMat = track(foeMaterial(HIDE.broodDark));
  const boneMat = track(foeMaterial(HIDE.bone));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });

  body.add(foePart(G.thorax, darkMat, 'full', `${kind}-thorax`));
  body.add(foePart(G.eyes, eyeMat, false, `${kind}-eyes`));
  const abd = foePart(G.abdomen, bodyMat, 'full', `${kind}-abdomen`);
  abd.position.copy(ABD_AT).multiplyScalar(z);
  body.add(abd);
  abd.add(foePart(G.tell, tellMat, false, `${kind}-tell`));
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.45 * z, opacity: 0.22 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = `${kind}-glow`;
  glow.position.set(0, (0.6 - ABD_AT.y) * z, (-0.12 - ABD_AT.z) * z);
  abd.add(glow);
  // the legs (16 bones) and the two fangs on rows
  const bones = instancedPart(G.bone, darkMat, 16, { name: `${kind}-bones`, moving: true, inkPx: 1.4 });
  const fangs = instancedPart(G.fang, boneMat, 2, { name: `${kind}-fangs`, moving: true, inkPx: 1.2 });
  spawn.add(bones);
  spawn.add(fangs);
  F.group.add(groundShadow(0.48 * z, 0.8));

  // Named points (B8): the fangs' tips, the mouth.
  const tip = namedPoint(body, `${kind}-tip`, 0, 0.14 * z, 0.4 * z);
  const mouth = namedPoint(body, `${kind}-mouth`, 0, 0.16 * z, 0.32 * z);

  // two tetrapods: legs 1 and 3 of a side with 2 and 4 of the other
  const gait = createLegs({ homes: HOMES, groups: [[0, 2, 5, 7], [1, 3, 4, 6]], trigger: 0.07 * z + 0.02, reach: 0.2 * z + 0.05, lift: 0.06 * z, durMin: 0.06, durMax: 0.12 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const chain = createChain({ hits: HITS, tls: HIT_TL, rest: REST, window: CHAIN_WINDOW, ease, freshLead: BROOD_FRESH_LEAD });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const m = new Matrix4();
  const A = new Vector3();
  const B = new Vector3();
  let age = -1;
  let yawNow = 0;
  let lastBiteAt = -99;
  let lunge = 0;
  let armedFor = null;
  let seenContact = null;
  const strike = { id: '', tick: 0 };
  let prevStrike = null;
  let leanW = 1;
  const lifted = new Array(8).fill(0);
  const gaitOpts = { locked: true, shift: null };
  const LUNGE_U = 0.12 * z;

  const lab = {
    abilities: ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((q, i) => ({ ...q, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return chain.current;
    },
    parts: { body, abd, bones, fangs },
  };
  // the lunge: the front pair steps in for each strike, timed to land by
  // its contact, and back out as the snap settles
  gaitOpts.shift = (i, o) => {
    if (i === 0 || i === 4) o.z += LUNGE_U * lunge;
    return o;
  };
  function armLunge(contactAt, now) {
    if (armedFor !== null && Math.abs(armedFor - contactAt) < FRAME) return;
    armedFor = contactAt;
    const dur = Math.max(1.5 * FRAME, contactAt - now - 0.25 * FRAME);
    gait.release(0, dur);
    gait.release(4, dur);
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const tt = P.t ?? 0;
    const e = P.e || null;
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the bites: the lab's pure chain, or the live bites
    let active;
    if (lab.override) {
      const h = ABILITIES.bites.at(lab.override.t);
      broodHitPose(h.n, h.t, h.from, h.fresh, h.pull, cur);
      active = true;
      lunge = h.phase === 'strike' || h.phase === 'contact' || h.phase === 'snap' ? 1 : 0;
    } else {
      const beat = watch.update(P);
      if (beat && beat.type === 'bite') {
        chain.hit(now);
        lastBiteAt = now;
      }
      const moving = e && Number.isFinite(e.px) ? Math.hypot(e.x - e.px, e.z - e.pz) > 0.01 : (P.moveK ?? 0) > 0.35;
      let due = null;
      if (e && e.cdByTarget && e.targetId != null && now - lastBiteAt < CHAIN_WINDOW && !moving && !heldBy(e, tick)) {
        const next = e.cdByTarget[e.targetId];
        if (next != null && next > tick) due = (next - tick) / TICK_HZ;
      }
      if (moving && (P.moveK ?? 0) > 0.5) chain.recover(now);
      if (e && heldBy(e, tick) && chain.abort(now)) lab.lastStrike = prevStrike;
      active = chain.pose(now, cur, due);
      if (!active) Object.assign(cur, REST);
      const c0 = chain.contactAt;
      if (active && c0 !== null && c0 > now && c0 - now <= 3.5 * FRAME + 1e-6) armLunge(c0, now);
      if (!active) armedFor = null;
      const was = lunge;
      lunge = armedFor !== null && now < armedFor + 4.5 * FRAME ? 1 : 0;
      if (was && !lunge) {
        gait.release(0, 4 * FRAME);
        gait.release(4, 4 * FRAME);
      }
      const c = chain.contactAt;
      if (c !== null && c !== seenContact && c >= now - 1e-6) {
        prevStrike = lab.lastStrike ? { ...lab.lastStrike } : null;
        seenContact = c;
        strike.id = `bite:${chain.current + 1}`;
        strike.tick = tick + (c - now) * TICK_HZ;
        lab.lastStrike = strike;
      }
    }
    void BITE_SEC;

    // --- feet: locked to the floor, two tetrapods along the travel
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / SPEED);
    const side = clamp1(lv.x / SPEED);

    // --- the body: the bite's pose, the skitter's bob and lean, the
    // abdomen's slow pulse
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const breath = Math.sin(tt * 2.2 + id);
    leanW += ((active ? 0 : 1) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + 0.07 * fwd * leanW, cur.twist, cur.roll - 0.08 * side * leanW);
    body.scale.set(cur.sx, cur.sy, 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push * z, (cur.lift + 0.015 * bob) * z);
    body.updateMatrix();
    abd.rotation.set(-cur.abd + 0.04 * Math.sin(tt * 1.6 + id), 0, 0);
    abd.scale.set(1, 1 + 0.04 * breath, 1);
    glow.material.opacity = 0.2 + 0.05 * Math.sin(tt * 2.6 + id) + 0.1 * cur.fangs;

    // --- legs: the hips ride the body, the tips stand where the gait put
    // them; the front pair rises with the rear
    for (let i = 0; i < 8; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      const front = i === 0 || i === 4;
      if (front && cur.rear > 0) {
        foot.y += 0.28 * z * cur.rear;
        foot.z += 0.08 * z * cur.rear;
      }
      lifted[i] = liftToReach(hipW, foot, L1, L2) + (front ? 0.28 * z * cur.rear : 0);
      if (clampReach(hipW, foot, L1, L2) > 1e-4 && !(front && cur.rear > 0)) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.024 * z, 0.024 * z, 0.01 * z));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.018 * z, 0.018 * z, 0.008 * z));
    }
    bones.instanceMatrix.needsUpdate = true;
    // --- the fangs: hung under the thorax's front, spread by the pose
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      A.set(s * (0.04 + 0.05 * cur.fangs) * z, 0.17 * z, 0.3 * z).applyMatrix4(body.matrix);
      B.set(s * (0.06 + 0.1 * cur.fangs) * z, (0.05 - 0.04 * cur.fangs) * z, (0.4 + 0.04 * cur.fangs) * z).applyMatrix4(body.matrix);
      segmentMatrix(m, A, B, 0.022 * z, 0.022 * z, 0);
      fangs.setMatrixAt(i, m);
    }
    fangs.instanceMatrix.needsUpdate = true;
    tip.position.set(0, (0.05 - 0.04 * cur.fangs) * z, 0.42 * z);
  }
  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    body: F.yaw,
    points: { tip, hand: tip, mouth },
    // §6.1 item 9: a bloated body on thin legs: the full squash and flinch,
    // a big knock for the small broodling; the flinch bulges at the abdomen.
    react: { squash: 1.1, flinch: 1, knock: kind === 'brood' ? 1 : 1.3, axis: 'y', midY: 0.3 * z },
    death: { swell: kind === 'brood' ? 1.3 : 1, throw: kind === 'brood' ? 0.8 : 1.2 },
  };
}
export const buildBroodFacet = () => spiderFacet('brood');
export const buildBroodlingFacet = () => spiderFacet('broodling');
