// GRAVE MOLE, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III foes").
// The classic mole of enemies/archetypes.js (a near-black velvet body, a pale
// snout with a charcoal nose, oversized bone digging claws whose indigo tips
// are its one tell, and the earth mound that rides the sim body while it
// tunnels) with the sample video's technique laid ON TOP of its chibi ink
// look. What it gains:
//
//   * a faceted hide cut into planes, with BAKED detail (render/facet/foe.js,
//     one draw call for the crowd): the velvet in dark ribbed rows down the
//     back, a pale belly, the snout with its nose and whisker nubs, two
//     tiny ears, charcoal slit eyes (never round, never warm);
//   * the two DIGGING CLAWS as arms of their own: a short upper arm and
//     forearm to the paw by two-bone IK, the paw with its three bone claws
//     baked and the indigo tips on a row of their own, unlit;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): the fore paws and two
//     short hind feet pinned to the floor while they carry weight (a
//     surfaced mole stands and blinks: the sim's punish window; a knockback
//     that slides it steps its feet, never drags them);
//   * the MOUND: a faceted earth hump with its clods, a floor piece on the
//     layer's group (never under the hit envelope), that churns with the
//     tunnelling and QUAKES through the emergence telegraph;
//   * the EMERGENCE on the sim's 60-tick ring telegraph (sim/enemies/
//     mole.js, mode 'emerging', still burrowed): the telegraph is the coil
//     (the mound heaves and quakes; the mole is under the floor), the
//     strike takes its last 2.5 frames, sampled on the shown sim tick, so
//     the BURST lands on the resolve tick: the body thrown up out of the
//     earth with its claws spread, the contact squash (§6.1 B9); held 3
//     frames, then the settle onto its feet with one overshoot (B5) into
//     the surfaced stand. Repeat emergences cycle Kesh's 3-hit flow: the
//     burst with the left claw raking up, the right claw, then the finisher,
//     both claws thrown high off a leap (B6). A stun before the resolve
//     cancels it: the mound settles and the mole stays under;
//   * the DIG back in (the sim's `enemy_burrow` cycle): nose down, the
//     claws raking in turn, the body sinking under as the mound rises;
//   * the spawn-in grow (B7), named points (B8: the claws' tips, the snout),
//     and the hit and death tuning.
//
// Faces +Z. Same contract as buildMole (group, mats, setYaw, pose, mound)
// plus lab, react, death, points. Render only: the sim, its timing, damage
// and burrow untouched.
import { BoxGeometry, ConeGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, lerpFields, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's mole (sim/enemies/mole.js S): tunnels 2.2 u/s burrowed; the ring
// telegraph is 60 ticks; surfaced 120 ticks, then it digs back in.
const TICK_HZ = 60;
const TUNNEL_SPEED = 2.2;
export const EMERGE_TEL_SEC = 60 / TICK_HZ;
// The sink under the floor while it is burrowed (the classic's 0.35 u).
const SINK_Y = 0.36;

// --- Key poses. rise (0 under the floor, 1 stood on it), push (u, +z),
// pitch (nose down +), roll, twist, sx / sy (squash), pawL / pawR (0..1 the
// claw raised and spread), snout (rad, + tips the nose up).
const REST = Object.freeze({ rise: 1, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, pawL: 0, pawR: 0, snout: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Under the floor (the coil of every burst): the mole waits below.
const UNDER = K({ rise: 0, pitch: -0.3, sx: 0.9, sy: 1.1, pawL: 0.6, pawR: 0.6, snout: 0.5 });
// Burst 1, THE LEFT CLAW: thrown up out of the earth turned to its right,
// the left claw raking up high across the front.
const S1 = K({ rise: 1.12, push: 0.08, pitch: -0.2, roll: -0.08, twist: -0.3, sx: 1.19, sy: 0.91, pawL: 1, pawR: 0.2, snout: 0.45 });
const O1 = K({ rise: 1.05, push: 0.05, pitch: -0.1, twist: -0.22, sx: 1.05, sy: 0.97, pawL: 0.6, pawR: 0.1, snout: 0.25 });
// Burst 2, THE RIGHT CLAW: the mirror.
const S2 = K({ rise: 1.12, push: 0.08, pitch: -0.2, roll: 0.08, twist: 0.3, sx: 1.19, sy: 0.91, pawL: 0.2, pawR: 1, snout: 0.45 });
const O2 = K({ rise: 1.05, push: 0.05, pitch: -0.1, twist: 0.22, sx: 1.05, sy: 0.97, pawL: 0.1, pawR: 0.6, snout: 0.25 });
// Burst 3, BOTH CLAWS (the biggest, §6.1 B6): a leap clear of the earth
// with both claws thrown high and wide, the nose up, a stretch.
const S3 = K({ rise: 1.2, push: 0.1, pitch: -0.3, sx: 1.12, sy: 0.96, pawL: 1, pawR: 1, snout: 0.6 });
const O3 = K({ rise: 1.06, push: 0.06, pitch: -0.14, sx: 1.04, sy: 0.98, pawL: 0.5, pawR: 0.5, snout: 0.3 });
const BURSTS = [
  { label: 'the left claw rakes up', coil: UNDER, strike: S1, over: O1 },
  { label: 'the right claw rakes up', coil: UNDER, strike: S2, over: O2 },
  { label: 'both claws, a leap', coil: UNDER, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

const BURST_TL = strikeTimeline('emerge', 'Emergence', {
  tel: EMERGE_TEL_SEC,
  rest: 0.3,
  labels: { coil: 'coil (the ring telegraph): the mound quakes, the mole under', strike: 'the burst', hold: 'contact: up out of the earth, claws spread', snap: 'lands on its feet', settle: 'settle, surfaced' },
});
export function moleBurstPose(v, t, out = { ...REST }) {
  return strikePoseAt(BURST_TL, BURSTS[v] || BURSTS[0], REST, FIELDS, t, out);
}
export const MOLE_EMERGE = strikeAbility({ id: 'emerge', label: 'Emergence', tl: BURST_TL, variants: BURSTS });
export const MOLE_EMERGES = strikeAbility({ id: 'emerges', label: 'Emergence string', tl: BURST_TL, variants: BURSTS, n: 3, gap: BURST_TL.duration });
// The dig back in: nose down, the claws rake in turn, the body sinks.
const DIG_TL = createTimeline('dig', 'Dig in', [
  { id: 'nose', label: 'nose down', dur: 0.15 },
  { id: 'rake', label: 'the claws rake', dur: 0.4 },
  { id: 'sink', label: 'under', dur: 0.25 },
  { id: 'rest', label: 'tunnelling', dur: 0.3 },
]);
const DIG_NOSE = K({ pitch: 0.35, pawL: 0.5, pawR: 0.5, snout: -0.2, sx: 0.97, sy: 1.03 });
const DIG_UNDER = K({ rise: 0, pitch: 0.4, pawL: 0.3, pawR: 0.3, snout: -0.2 });
export function moleDigPose(t, out = { ...REST }) {
  const s = DIG_TL.sample(t);
  if (s.id === 'nose') return lerpFields(out, REST, DIG_NOSE, ease.inOut(s.k), FIELDS);
  if (s.id === 'rake') {
    lerpFields(out, DIG_NOSE, DIG_UNDER, ease.in(s.k) * 0.6, FIELDS);
    // the claws rake in turn, three strokes each
    const w = Math.sin(s.k * Math.PI * 3);
    out.pawL = 0.5 + 0.45 * w;
    out.pawR = 0.5 - 0.45 * w;
    return out;
  }
  if (s.id === 'sink') return lerpFields(out, { ...DIG_UNDER, rise: 0.4 }, DIG_UNDER, ease.out(s.k), FIELDS);
  return Object.assign(out, DIG_UNDER);
}
export const MOLE_DIG = Object.freeze({
  id: 'dig',
  label: 'Dig in',
  duration: DIG_TL.duration,
  at(t) {
    const s = DIG_TL.sample(t);
    return { t: s.t, phase: s.id, label: `Dig in: ${s.label}` };
  },
  cues: [{ at: DIG_TL.startOf('rake'), id: 'dig' }],
});
export const MOLE_ABILITIES = Object.freeze({ emerge: MOLE_EMERGE, emerges: MOLE_EMERGES, dig: MOLE_DIG });

// --- Geometry (built once for the session, shared by every mole) ------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const TWO_PI = Math.PI * 2;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The body: the classic's low egg, cut into planes; the velvet in ribbed
  // rows down the back; a pale belly; the snout, its nose and whisker nubs;
  // the ears.
  set.body = bakeParts('mole:body', () => {
    const out = [
      { geo: fz(new IcosahedronGeometry(0.27, 1), 0.14, 901), m: M(0, 0.2, -0.04, 1.0, 0.62, 1.3) },
      { geo: fz(new SphereGeometry(0.22, 8, 3, 0, TWO_PI, Math.PI * 0.55, Math.PI * 0.45), 0.1, 903), m: M(0, 0.19, -0.02, 1.0, 0.5, 1.3), tone: 1.6 },
    ];
    const rib = fz(new BoxGeometry(0.4, 0.03, 0.05), 0.12, 905);
    for (let i = 0; i < 5; i++) out.push({ geo: rib, m: M(0, 0.345 - i * 0.012, 0.16 - i * 0.1, 1 - i * 0.08, 1, 1, qa(1, 0, 0, 0.1 * (i - 2))), tone: 0.72 });
    const ear = fz(new SphereGeometry(0.03, 5, 4), 0.1, 907);
    for (const s of [-1, 1]) out.push({ geo: ear, m: M(s * 0.14, 0.32, 0.18, 1, 0.8, 0.6), tone: 0.8 });
    return out;
  });
  set.snout = bakeParts('mole:snout', () => {
    const out = [{ geo: fz(new ConeGeometry(0.12, 0.34, 6), 0.12, 911), m: M(0, 0.2, 0.36, 1, 1, 1, qa(1, 0, 0, Math.PI / 2 + 0.18)) }];
    const nub = fz(new SphereGeometry(0.015, 4, 3), 0.1, 913);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) out.push({ geo: nub, m: M(s * 0.07, 0.17 - i * 0.03, 0.46 + i * 0.03), tone: 0.8 });
    return out;
  });
  // The nose and the eyes: unlit charcoal.
  set.dark = bakeParts('mole:dark', () => {
    const out = [{ geo: fz(new IcosahedronGeometry(0.04, 0), 0.1, 921), m: M(0, 0.17, 0.54) }];
    const bar = fz(new BoxGeometry(0.05, 0.016, 0.016), 0, 1);
    for (const s of [-1, 1]) out.push({ geo: bar, m: M(s * 0.09, 0.3, 0.22, 1, 1, 1, qa(0, 0, 1, s * 0.2)) });
    return out;
  });
  // A limb bone (y 0..1); the paw with its three bone claws (about its
  // wrist, the claws along +z); the indigo tips; a hind foot.
  set.bone = fz(new SphereGeometry(1, 6, 4).translate(0, 1, 0).scale(1, 0.5, 1), 0.1, 931);
  set.paw = bakeParts('mole:paw', () => {
    const out = [{ geo: fz(new BoxGeometry(0.2, 0.05, 0.16), 0.1, 933), m: M(0, 0, 0.04) }];
    const claw = hornGeometry({ len: 1, r: 0.3, bend: 0.5, seg: 3, sides: 4, seed: 935 });
    for (const x of [-0.07, 0, 0.07]) out.push({ geo: claw, m: M(x, 0, 0.12, 0.09, 0.16, 0.09, qa(1, 0, 0, Math.PI / 2 - 0.2)), tone: 1.1 });
    return out;
  });
  set.tips = bakeParts('mole:tips', () => {
    const tip = fz(new ConeGeometry(0.018, 0.06, 4), 0, 1);
    return [-0.07, 0, 0.07].map((x) => ({ geo: tip, m: M(x, -0.01, 0.26, 1, 1, 1, qa(1, 0, 0, Math.PI / 2 - 0.2)) }));
  });
  set.foot = bakeParts('mole:foot', () => [{ geo: fz(new BoxGeometry(0.08, 0.04, 0.1), 0.1, 937), m: M(0, 0.02, 0.02) }]);
  // The mound: the earth hump and its clods (floor pieces).
  set.hump = fz(new SphereGeometry(0.3, 9, 5, 0, TWO_PI, 0, Math.PI / 2).scale(1, 0.42, 1.25), 0.14, 941);
  set.clods = bakeParts('mole:clods', () => {
    const clod = fz(new IcosahedronGeometry(0.07, 0), 0.2, 943);
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TWO_PI;
      out.push({ geo: clod, m: M(Math.cos(a) * 0.27, 0.03, Math.sin(a) * 0.3, 1, 0.8, 1, qa(1, 1, 0, a)), tone: 0.9 + 0.2 * (i % 2) });
    }
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 fore left (+x), 1 fore right, 2 hind left, 3 hind right. The
// shoulders and hips in body space; paw and foot homes on the floor (yaw
// space); the elbow's pole (out and back), the knee's (forward).
const HIPS = [new Vector3(0.2, 0.17, 0.16), new Vector3(-0.2, 0.17, 0.16), new Vector3(0.12, 0.14, -0.22), new Vector3(-0.12, 0.14, -0.22)];
const HOMES = [new Vector3(0.28, 0, 0.26), new Vector3(-0.28, 0, 0.26), new Vector3(0.15, 0, -0.26), new Vector3(-0.15, 0, -0.26)];
const BEND = [new Vector3(0.8, 0.4, -0.5).normalize(), new Vector3(-0.8, 0.4, -0.5).normalize(), new Vector3(0.2, 0.2, 1).normalize(), new Vector3(-0.2, 0.2, 1).normalize()];
const LEN = [[0.12, 0.13], [0.12, 0.13], [0.09, 0.09], [0.09, 0.09]];
const THICK = [[0.05, 0.04], [0.03, 0.025]];
const PIVOT = new Vector3(0, 0.18, 0);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildMoleFacet() {
  const G = geos();
  const F = createFoeFrame('mole');
  const { body, spawn, track } = F;
  const furMat = track(foeMaterial(HIDE.moleBody));
  const snoutMat = track(foeMaterial(HIDE.moleSnout));
  const clawMat = track(foeMaterial(HIDE.moleClaw));
  const earthMat = foeMaterial(HIDE.earth);
  const earthDark = foeMaterial(HIDE.earthDark);
  const darkMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });

  body.add(foePart(G.body, furMat, 'full', 'mole-body'));
  body.add(foePart(G.snout, snoutMat, 'full', 'mole-snout'));
  body.add(foePart(G.dark, darkMat, false, 'mole-dark'));
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.5, opacity: 0.2 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = 'mole-glow';
  glow.position.set(0, 0.2, 0.34);
  body.add(glow);
  // the limbs (8 bones), the two paws, their indigo tips, the hind feet
  const bones = instancedPart(G.bone, furMat, 8, { name: 'mole-bones', moving: true, inkPx: 1.6 });
  const paws = instancedPart(G.paw, clawMat, 2, { name: 'mole-paws', moving: true, inkPx: 1.6 });
  const tips = instancedPart(G.tips, tellMat, 2, { name: 'mole-tips', moving: true, ink: false });
  const feet = instancedPart(G.foot, furMat, 2, { name: 'mole-feet', moving: true, inkPx: 1.4 });
  for (const o of [bones, paws, tips, feet]) spawn.add(o);
  const shadow = groundShadow(0.42, 0.84, { forward: 0.24, wide: 1.1, deep: 1.0 });
  F.group.add(shadow);
  // the mound: a floor piece on the group (the hit envelope never bends it)
  const moundGroup = foePart(G.hump, earthMat, 'full', 'mole-floor-hump');
  const clods = foePart(G.clods, earthDark, 'part', 'mole-floor-clods');
  moundGroup.add(clods);
  const moundShadow = groundShadow(0.36, 0.5, { forward: 0.1, wide: 1.1, deep: 1.1 });
  moundShadow.name = 'mole-floor-mound-shadow';
  moundGroup.add(moundShadow);
  F.group.add(moundGroup);

  // Named points (B8): the claw tips (the weapon), the snout (the mouth).
  const tipPts = [namedPoint(spawn, 'mole-tip', 0.28, 0, 0.5), namedPoint(spawn, 'mole-hand', -0.28, 0, 0.5)];
  const mouth = namedPoint(body, 'mole-mouth', 0, 0.17, 0.5);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.07, reach: 0.16, lift: 0.05, durMin: 0.08, durMax: 0.15 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const m = new Matrix4();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const q = new Quaternion();
  let age = -1;
  let yawNow = 0;
  let bursts = 0;
  let sink = 0; // 1 under the floor (eased from the sim's burrowed flag)
  let sinkInit = false;
  let quake = 0;
  let digK = 0; // the dig back in (eased on the cycle)
  let wasUnder = null;
  let digAt = null;
  let leanW = 1;
  const lifted = [0, 0, 0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: MOLE_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur, sink, quake }),
    get hit() {
      return clip.state === 'rest' ? -1 : (bursts - 1) % 3;
    },
    get sink() {
      return sink;
    },
    parts: { body, bones, paws, tips, mound: moundGroup, shadow },
  };

  function liveBurst(P, now, tick, e) {
    const beat = watch.update(P);
    // the sim's own word: surfaced (burrowed off) is the burst's release
    const under = !!(e && e.burrowed);
    const fired = wasUnder === true && !under && e && e.mode === 'surfaced';
    const st = clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      fired,
      pick: () => BURSTS[bursts++ % 3],
      name: () => `burst:${((bursts - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
    // the dig back in: the sim went under from the surface (never the
    // emergence's own under)
    if (wasUnder === false && under && st === 'rest') digAt = now;
    wasUnder = e ? under : null;
    const busy = st === 'coil' || st === 'strike' || st === 'held' || st === 'snapin';
    const wantQ = st === 'coil' ? 1 : 0;
    quake += (wantQ - quake) * Math.min(1, dt0 * (wantQ ? 10 : 6));
    return busy;
  }
  let dt0 = 0;

  function pose(P) {
    const dt = clock.step(P);
    dt0 = dt;
    const now = clock.now;
    const tt = P.t ?? 0;
    const e = P.e || null;
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the burst and the dig: the lab's pure override, or the sim's
    let shown; // 0 under the floor .. 1 stood on it (over 1: thrown up)
    if (lab.override) {
      const ab = MOLE_ABILITIES[lab.override.id] || MOLE_EMERGE;
      const h = ab.at(lab.override.t);
      if (ab === MOLE_DIG) {
        moleDigPose(h.t, cur);
        quake = 0;
      } else {
        moleBurstPose(h.v, h.t, cur);
        quake = h.phase === 'coil' ? ease.inOut(Math.min(1, h.t / 0.25)) : h.phase === 'strike' ? 1 : 0;
      }
      shown = cur.rise;
      sink = 1 - Math.min(1, shown);
      sinkInit = true;
      watch.reset();
      clip.reset();
      digAt = null;
      digK = 0;
    } else {
      const busy = liveBurst(P, now, tick, e);
      const wantSink = e && e.burrowed ? 1 : 0;
      if (!sinkInit) {
        sink = wantSink;
        sinkInit = true;
      }
      sink += (wantSink - sink) * (1 - Math.exp(-(wantSink ? 9 : 14) * dt));
      if (turntable) sink = 0;
      // the dig in plays over the sink
      if (digAt !== null) {
        const td = now - digAt;
        if (td < DIG_TL.duration - 0.3) {
          moleDigPose(td, cur);
          cur.rise = 1;
          digK = 1;
        } else {
          digAt = null;
          digK = 0;
        }
      }
      shown = busy || clip.state === 'pull' ? cur.rise : 1 - sink;
      if (digAt !== null) shown = Math.min(shown, 1 - sink);
    }
    const up = Math.min(1, shown);
    body.visible = shown > 0.03;
    shadow.visible = shown > 0.3;
    moundGroup.visible = shown < 0.96 || quake > 0.02;

    // --- feet: locked to the floor (stood on it); under it they ride along
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override) && up > 0.5;
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / TUNNEL_SPEED);
    const side = clamp1(lv.x / TUNNEL_SPEED);

    // --- the body: the burst's pose, the rise out of the earth, a blink of
    // a breath while it stands
    const breath = Math.sin(tt * 2.6);
    leanW += ((clip.state === 'rest' && !lab.override && !digK ? 1 : 0) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + 0.06 * fwd * leanW, cur.twist, cur.roll - 0.05 * side * leanW);
    body.scale.set(cur.sx, cur.sy * (1 + 0.015 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, -SINK_Y * (1 - up) + 0.06 * Math.max(0, shown - 1) + 0.015 * bob);
    body.updateMatrix();
    glow.material.opacity = (0.16 + 0.06 * Math.sin(tt * 3)) * up;

    // --- the mound: churns with the tunnelling, quakes through the telegraph
    const churn = Math.sin((P.walkPhase ?? 0) * 1.4) * 0.06 * (P.moveK ?? 0) * (1 - up);
    const qk = Math.sin(tt * 46) * 0.05 * quake;
    moundGroup.scale.set(1 + churn + qk, 1 + 0.4 * quake + 0.3 * digK, 1 - churn + qk);
    moundGroup.position.y = 0;

    // --- the limbs: the shoulders and hips ride the body; a raised claw
    // lifts its paw off the floor and spreads it
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      const [l1, l2] = LEN[i];
      const raise = i === 0 ? cur.pawL : i === 1 ? cur.pawR : 0;
      if (raise > 0) {
        // the claw comes up and out, the paw turned to show its claws
        foot.x += (i === 0 ? 0.08 : -0.08) * raise;
        foot.y += 0.2 * raise;
        foot.z += 0.06 * raise;
      }
      // under the floor the feet hang off the body
      if (up < 1) foot.y -= SINK_Y * (1 - up);
      lifted[i] = liftToReach(hipW, foot, l1, l2) + 0.2 * raise;
      if (clampReach(hipW, foot, l1, l2) > 1e-4 && raise === 0 && up >= 1) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, l1, l2, BEND[i], knee);
      const [r1, r2] = THICK[i < 2 ? 0 : 1];
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, r1, r1, 0.015));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, r2, r2, 0.01));
      if (i < 2) {
        // the paw: flat on the floor, turned out; raised, it pitches up to
        // show the claws
        const s = i === 0 ? 1 : -1;
        const yawP = s * (0.35 + 0.3 * raise);
        q.setFromAxisAngle(UP, yawP);
        Z.set(0, 0, 1).applyQuaternion(q);
        X.crossVectors(UP, Z).normalize();
        Y.copy(UP);
        if (raise > 0) {
          // pitch the paw up about its X by up to 70°
          const qp = new Quaternion().setFromAxisAngle(X, -1.2 * raise);
          Z.applyQuaternion(qp);
          Y.applyQuaternion(qp);
        }
        setTRS(m, foot, X, Y, Z, 1, 1, 1);
        paws.setMatrixAt(i, m);
        tips.setMatrixAt(i, m);
        tipPts[i].position.copy(foot).addScaledVector(Z, 0.28);
      } else {
        Z.set(0, 0, 1);
        X.set(1, 0, 0);
        Y.copy(UP);
        setTRS(m, foot, X, Y, Z, 1, 1, 1);
        feet.setMatrixAt(i - 2, m);
      }
    }
    bones.instanceMatrix.needsUpdate = true;
    paws.instanceMatrix.needsUpdate = true;
    tips.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
  }
  return {
    group: F.group,
    mats: F.mats,
    mound: moundGroup,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    body: F.yaw,
    points: { tip: tipPts[0], hand: tipPts[1], mouth },
    // §6.1 item 9: a small soft body: the full squash along its height, a
    // big knock; the flinch bulges at the back.
    react: { squash: 1.1, flinch: 0.9, knock: 1.1, axis: 'y', midY: 0.2 },
    death: { swell: 1.1, throw: 1 },
  };
}
