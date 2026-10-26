// SHRIEK OWL, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic owl
// of enemies/woodmill.js (docs/WOOD_MILL_ENEMIES.md, campaign-only from room
// 3 of the Hollow Wood) with the sample video's technique laid ON TOP of its
// chibi ink look: the same soft pale barn owl gliding 1.5 u up on broad
// wings with three bold dark bands on each wingtip, the slate back, the clean
// cream heart-shaped face with no ink on it, the ear tufts, the hooked beak,
// the talons hung below, and the one indigo tell (the pupils and their glow).
// What it gains, all of it sitting IN the surface so the bird reads calm at
// play zoom:
//
//   * faceted masses: the body, mantle, skull, disc and the lofted wing panels
//     are cut into flat planes, each with its own value step; the pale breast
//     against the slate back is the value break;
//   * detail by repetition, BAKED per kind (render/facet/foe.js), so a room of
//     owls shares one buffer per material: breast feathers sunk into the
//     chest with the barn owl's dark drop spots laid flat on it, scapulars and
//     pearl spots over the mantle, a crown of small feathers, layered ear
//     tufts, a slate ruff framing the heart-shaped disc and a keel down its
//     middle, a hooked two-piece beak (hornGeometry), a tail fan of blunt
//     feathers, feathered legs with curved talons;
//   * WINGS AS THE MOVING PARTS: each wing is an arm and a hand on a wrist,
//     each panel lofted along its span so the classic's three bands are strips
//     OF the hand's surface (flush, never boxes hung off it); flat coverts sunk
//     into the arm, blunt secondaries and fingered primaries at the trailing
//     edge, and the full silhouette ink round the whole wing. The beat has a
//     real stroke: the hand folds and lags on the upstroke and the leading
//     edge dips on the downstroke; the glide holds its wings out between
//     bursts of beats; the hang treads fast and shallow. A flier has no feet
//     to lock (Kesh's self-check, rule 2, has nothing touching the floor);
//     rule 1 is the body BANKING into its measured travel: it rolls into a
//     sideways drift and into a turn, noses down into a forward glide and
//     leans back on a backpedal, sweeping its wings forward and beating
//     harder; the talons and the tail trail the travel with a lag;
//   * THE SHRIEK on the sim's own clock (sim/enemies/owl.js). The sim hangs
//     the owl still and holds a cone telegraph (`kind: 'cone'`, 54 ticks,
//     `e.mode = 'hang'`), resolves it on `resolveTick` (`e.shriekTick`, the
//     `owl_shriek` event), cooldown 230 ticks. The model samples its gather
//     from the telegraph on the SHOWN tick (the layer's interpolated tick + 1:
//     the telegraph is the state's own): it rises into the hang, then draws
//     its head back, throws its wings wide, up and back, flares the facial
//     disc, swells the chest, dilates the indigo pupils and draws the talons
//     up (rule 3: the body coils before it strikes). The strike takes the
//     telegraph's last 3 frames, so its CONTACT lands on the resolve tick: the
//     wings drive down and forward, the head snaps out and down at the cone
//     with the beak wide, the body pitches into it with the contact squash,
//     the talons rake forward. The release holds the scream (the head
//     trembles), the recoil kicks the body back on a braking upstroke with a
//     stretch, and the settle lands in the glide with one overshoot. A stun
//     (the telegraph cancelled, or a release the sim never confirmed with
//     `shriekTick`) never strikes: the gather settles back to the glide;
//   * the spawn-in grow (B7), named points (B8: the beak tip, the talons, the
//     gape, each following its part), and the hit and death tuning the
//     shared envelope reads.
//
// Not a repeating melee attack (one shriek, then a 230-tick cooldown), so no
// 3-hit chain: the shriek has its own timeline (Kesh's template, the ranged
// or telegraphed case).
//
// Faces +Z. Same contract as buildOwl (group, mats, setYaw, pose) plus lab,
// body, react, death, points. Render only: the sim, its timing and damage
// untouched.
import { BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared, sharedGeo } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, lerpFields, namedPoint, scaleGeometry, settle, spawnScale } from '../../facet/foe.js';

// The sim's owl (sim/enemies/owl.js S): glides 1.5 u up at 2.4 u/s, hangs
// and shrieks a cone telegraphed for 54 ticks.
const TICK_HZ = 60;
const HOVER = 1.5;
const SPEED = 2.4;
export const SHRIEK_TICKS = 54;
const GATHER_SEC = SHRIEK_TICKS / TICK_HZ;
// Inside the telegraph (ticks): the rise into the hang, then the gather, and
// the strike's last 3 frames (6 ticks) so its contact lands on resolveTick.
const RISE_T = 12;
const STRIKE_T = 3 * FRAME * TICK_HZ;
// After the release (s): the held scream, the recoil, the settle.
const CONTACT_SEC = 4 * FRAME;
const RECOIL_SEC = 3 * FRAME;
const SETTLE_SEC = 12 * FRAME;
const POST_SEC = CONTACT_SEC + RECOIL_SEC + SETTLE_SEC;
const ABORT_SEC = 10 * FRAME;
// The wingbeat (rad/s, rad): the glide's slow beat, the hang's fast tread.
const BEAT_GLIDE = 5.2;
const BEAT_TREAD = 13;
const GLIDE_AMP = 0.5;
const TREAD_AMP = 0.3;
// The strike's curve: near even steps with a little acceleration into the
// contact (at 30 fps its in-betweens show about 24% and 58% of the way).
const strikeEase = (k) => k * (0.6 + 0.4 * k);

// --- Key poses. lift: up from the hover (u); push: shove along +z (u);
// pitch: nose down (+) or rearing (-); sx/sy/sz: the body's squash (a chest
// swell is wide and deep); hz/hy/hp: the head forward, up and its dip (+);
// disc: the facial disc's flare; beak: the lower beak open (rad); flap: the
// wings up (+); sweep: the wings back (+); fold: the hand folded back at the
// wrist (+); twist: the leading edge up (+); amp: the wingbeat's size; tread:
// 0 the glide's beat .. 1 the hang's tread; talon: the talons back (+) or
// raked forward (-); tail: the tail fan's spread; tailP: the tail up (+);
// pupil: the indigo pupils' size; glow: the tell glow added.
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, sx: 1, sy: 1, sz: 1, hz: 0, hy: 0, hp: 0, disc: 1, beak: 0.1, flap: 0.18, sweep: 0, fold: 0, twist: 0, amp: 1, tread: 0, talon: 0, tail: 0, tailP: 0, pupil: 1, glow: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// The hang: risen, rearing a touch, wings up and back treading, tail down as
// a brake, the disc and pupils opening.
const HANG = K({ lift: 0.12, pitch: -0.22, sx: 1.03, sy: 1.03, sz: 1.04, hz: -0.02, hp: -0.1, disc: 1.12, beak: 0.18, flap: 0.55, sweep: 0.35, fold: -0.1, twist: 0.15, amp: 0.8, tread: 1, talon: 0.25, tail: 0.7, tailP: -0.25, pupil: 1.5, glow: 0.2 });
// The coil at the strike's start: head drawn right back, chest swelled, the
// wings thrown widest up and back, the disc flared, the talons drawn up.
const COIL = K({ lift: 0.16, pitch: -0.38, sx: 1.08, sy: 1.07, sz: 1.12, hz: -0.06, hy: 0.02, hp: -0.32, disc: 1.3, beak: 0.3, flap: 0.85, sweep: 0.6, fold: -0.2, twist: 0.3, amp: 0.3, tread: 1, talon: 0.5, tail: 1, tailP: -0.32, pupil: 1.8, glow: 0.4 });
// The shriek (contact, on resolveTick): the wings driven down and forward,
// the head out and down at the cone with the beak wide, the body pitched into
// it with the contact squash (+19% wide, -9% tall), the talons raking.
const SHRIEK = K({ lift: 0.08, push: 0.06, pitch: 0.32, sx: 1.19, sy: 0.91, sz: 1, hz: 0.1, hy: -0.02, hp: 0.3, disc: 1.38, beak: 0.95, flap: -0.4, sweep: -0.3, fold: 0.1, twist: -0.25, amp: 0, tread: 1, talon: -0.55, tail: 0.8, tailP: 0.2, pupil: 1.5, glow: 0.7 });
// The recoil: kicked back on a braking upstroke, stretched a touch tall.
const RECOIL = K({ lift: 0.13, push: -0.07, pitch: -0.14, sx: 0.95, sy: 1.06, sz: 1, hz: -0.02, hp: -0.1, disc: 1.15, beak: 0.35, flap: 0.45, sweep: 0.1, fold: 0.3, twist: 0.2, amp: 0, tread: 0.6, talon: 0.1, tail: 0.5, tailP: -0.1, pupil: 1.2, glow: 0.3 });
const FIELDS = Object.keys(REST);
export const OWL_REST = REST;
export const OWL_KEYS = Object.freeze({ HANG, COIL, SHRIEK, RECOIL });

// Pure: the gather at tt ticks into a telegraph of span ticks (the rise from
// `from`, then the gather, then the strike). Returns the phase id.
export function owlGatherPose(tt, span, out, from = REST) {
  const rise = Math.min(RISE_T, span * 0.25);
  const strikeT = Math.min(STRIKE_T, span * 0.2);
  const s0 = span - strikeT;
  if (tt < rise) {
    lerpFields(out, from, HANG, ease.out(Math.max(0, tt) / rise), FIELDS);
    return 'rise';
  }
  if (tt < s0) {
    lerpFields(out, HANG, COIL, ease.inOut((tt - rise) / Math.max(1e-6, s0 - rise)), FIELDS);
    return 'gather';
  }
  // the strike: 3 frames from the coil into the contact on the resolve tick
  lerpFields(out, COIL, SHRIEK, strikeEase(Math.min(1, (tt - s0) / strikeT)), FIELDS);
  return 'strike';
}
// Pure: pt seconds after the release (the contact's first frame).
export function owlPostPose(pt, out) {
  if (pt < CONTACT_SEC) {
    lerpFields(out, SHRIEK, SHRIEK, 0, FIELDS);
    // the scream shakes the head and the disc through the held contact
    const fade = 1 - 0.5 * (pt / CONTACT_SEC);
    out.hp += 0.04 * Math.sin(pt * 95) * fade;
    out.disc *= 1 + 0.03 * Math.sin(pt * 77 + 1) * fade;
    return 'contact';
  }
  pt -= CONTACT_SEC;
  if (pt < RECOIL_SEC) {
    lerpFields(out, SHRIEK, RECOIL, ease.out(pt / RECOIL_SEC), FIELDS);
    return 'recoil';
  }
  pt -= RECOIL_SEC;
  // into the glide with one small overshoot past it (B5)
  lerpFields(out, REST, RECOIL, settle(Math.min(1, pt / SETTLE_SEC)), FIELDS);
  return pt < SETTLE_SEC ? 'settle' : 'rest';
}

// The lab's shriek: the sim's 54-tick telegraph, then the release (pure in t).
const SHRIEK_TL = createTimeline('shriek', 'Shriek', [
  { id: 'rise', label: 'rise into the hang', dur: RISE_T / TICK_HZ },
  { id: 'gather', label: 'gather: head back, disc and wings flare, chest swells', dur: (SHRIEK_TICKS - RISE_T - STRIKE_T) / TICK_HZ },
  { id: 'strike', label: 'strike: wings drive down, head snaps out', dur: STRIKE_T / TICK_HZ },
  { id: 'contact', label: 'shriek: beak wide (contact on the resolve tick)', dur: CONTACT_SEC },
  { id: 'recoil', label: 'recoil: braking upstroke', dur: RECOIL_SEC },
  { id: 'settle', label: 'settle into the glide', dur: SETTLE_SEC },
]);
export function owlShriekPose(t, out) {
  return t < GATHER_SEC ? owlGatherPose(t * TICK_HZ, SHRIEK_TICKS, out) : owlPostPose(t - GATHER_SEC, out);
}
export const OWL_SHRIEK = Object.freeze({
  id: 'shriek',
  label: 'Shriek',
  duration: GATHER_SEC + POST_SEC,
  timeline: SHRIEK_TL,
  at(t) {
    const s = SHRIEK_TL.sample(t);
    return { phase: s.id, label: `Shriek: ${s.label}`, k: s.k };
  },
  // the contact lands where the sim resolves the telegraph (the lab's cue)
  strikes: [GATHER_SEC],
  // the classic twin's stand-in inputs: hanging through the telegraph, its
  // shriek clip on the release
  classicAt(t) {
    const hang = t < GATHER_SEC;
    return { telegraphK: hang ? 1 : 0, lungeK: 0, fireK: 0, e: { mode: hang ? 'hang' : 'glide', shriekTick: hang ? -1 : 1 } };
  },
});
export const OWL_ABILITIES = Object.freeze({ shriek: OWL_SHRIEK });

// --- Colours: the classic's own hides (enemies/woodmill.js C.owl*), derived
// the same way from the palette.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const OWL_C = Object.freeze({
  body: new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.18).multiplyScalar(0.86),
  back: slate(0.22, 0.42),
  band: slate(0.3, 0.22),
  face: new Color(PALETTE.bone).lerp(new Color(PALETTE.parchment), 0.4).multiplyScalar(0.95),
  beak: new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.5).multiplyScalar(0.75),
});
// A tint that turns one material's colour into another's inside a baked row.
const tintOf = (target, base, k = 1) => new Color((target.r / base.r) * k, (target.g / base.g) * k, (target.b / base.b) * k);

// --- Geometry (built once for the session, shared by every owl) -------------
// Body space: the origin is the owl's middle at the hover height.
const TORSO = new Vector3(0.209, 0.231, 0.253); // the classic's ico 0.22 x (0.95, 1.05, 1.15)
const MANTLE_C = new Vector3(0, 0.06, -0.06);
const MANTLE = new Vector3(0.21, 0.15, 0.23);
const SKULL_R = 0.15;
const HEAD_AT = new Vector3(0, 0.2, 0.12);
const DISC_AT = new Vector3(0, -0.01, 0.1);
const SHOULDER = new Vector3(0.15, 0.08, -0.02);
const L_ARM = 0.36;
const WRIST = new Vector3(L_ARM, 0, 0);
const HIPS = [new Vector3(-0.07, -0.19, 0.04), new Vector3(0.07, -0.19, 0.04)];
const TAIL_AT = new Vector3(0, -0.05, -0.2);
// The beak horn's tip in its own frame (hornGeometry len 1, bend 1.1, seg 2).
const BEAK_TIP = (() => {
  const v = new Vector3();
  for (let i = 0; i < 2; i++) {
    const a = (1.1 * (i + 0.5)) / 2;
    v.y += Math.cos(a) * 0.5;
    v.z += Math.sin(a) * 0.5;
  }
  return v;
})();
// The wing panels, lofted along the span: stations { x, zl (leading edge),
// zt (trailing edge), t (half thickness), band (a dark band strip starts) }.
const ARM_ST = [
  { x: -0.04, zl: 0.09, zt: -0.11, t: 0.03 },
  { x: 0.08, zl: 0.125, zt: -0.165, t: 0.034 },
  { x: 0.22, zl: 0.125, zt: -0.17, t: 0.03 },
  { x: 0.4, zl: 0.11, zt: -0.15, t: 0.026 },
];
// The hand: the classic's three bands (0.05 wide on the wing's outer half,
// the classic's own spacing), flush strips of the panel.
const HAND_X = [-0.06, 0.04, 0.105, 0.155, 0.22, 0.27, 0.335, 0.385, 0.43];
const HAND_BAND = new Set([2, 4, 6]);
const handSt = (x) => {
  const u = (x - HAND_X[0]) / (HAND_X[HAND_X.length - 1] - HAND_X[0]);
  return { x, zl: 0.11 - 0.08 * u ** 2.2, zt: -0.15 + 0.12 * u ** 1.6, t: 0.024 * (1 - 0.55 * u) };
};
const HAND_ST = HAND_X.map((x, i) => ({ ...handSt(x), band: HAND_BAND.has(i) }));

// A point on an ellipsoid (centre c, radii r) and its outward normal: theta
// from the top (0) down, phi round from the front (+z, 0) toward +x.
function onEllipsoid(c, r, theta, phi, lift, out, nrm) {
  const x = r.x * Math.sin(theta) * Math.sin(phi);
  const y = r.y * Math.cos(theta);
  const z = r.z * Math.sin(theta) * Math.cos(phi);
  out.set(c.x + x * lift, c.y + y * lift, c.z + z * lift);
  if (nrm) nrm.set(x / (r.x * r.x), y / (r.y * r.y), z / (r.z * r.z)).normalize();
  return out;
}
// The same spot cast onto a FACETED surface (local helper): the ray from the
// centre c toward the ellipsoid point, against the faceted mesh `soup` (a
// position attribute in the same space). out is the hit pushed `depth` along
// the facet's own normal (negative sinks it), nrm that normal, so a part laid
// there sits on the plane it covers instead of floating over a facet's sag.
const castA = new Vector3();
const castB = new Vector3();
const castC = new Vector3();
const castE1 = new Vector3();
const castE2 = new Vector3();
const castP = new Vector3();
const castQ = new Vector3();
const castS = new Vector3();
const castD = new Vector3();
function onFacets(soup, c, r, theta, phi, depth, out, nrm) {
  onEllipsoid(c, r, theta, phi, 1, out, nrm);
  castD.subVectors(out, c).normalize();
  let best = Infinity;
  for (let i = 0; i + 2 < soup.count; i += 3) {
    castA.fromBufferAttribute(soup, i);
    castB.fromBufferAttribute(soup, i + 1);
    castC.fromBufferAttribute(soup, i + 2);
    castE1.subVectors(castB, castA);
    castE2.subVectors(castC, castA);
    castP.crossVectors(castD, castE2);
    const det = castE1.dot(castP);
    if (Math.abs(det) < 1e-12) continue;
    castS.subVectors(c, castA);
    const u = castS.dot(castP) / det;
    if (u < 0 || u > 1) continue;
    castQ.crossVectors(castS, castE1);
    const v = castD.dot(castQ) / det;
    if (v < 0 || u + v > 1) continue;
    const t = castE2.dot(castQ) / det;
    if (t > 0 && t < best) {
      best = t;
      nrm.crossVectors(castE1, castE2).normalize();
      if (nrm.dot(castD) < 0) nrm.negate();
    }
  }
  if (best < Infinity) out.copy(c).addScaledVector(castD, best).addScaledVector(nrm, depth);
  return out;
}
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// Tip Y toward Z by angle a (a negative a lifts the part's +Z end: a
// feather's trailing edge stands off the body).
function tip(X, Y, Z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const yx = Y.x * c + Z.x * s, yy = Y.y * c + Z.y * s, yz = Y.z * c + Z.z * s;
  Z.set(Z.x * c - Y.x * s, Z.y * c - Y.y * s, Z.z * c - Y.z * s);
  Y.set(yx, yy, yz);
  X.crossVectors(Y, Z).normalize();
}
// Wind each triangle of a flat position list to face away from centre(i)
// (local helper, as the kit's convex parts do).
function windOut(pos, centre) {
  const c = [0, 0, 0];
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3;
    const my = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3;
    const mz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
    centre(mx, my, mz, c);
    if (nx * (mx - c[0]) + ny * (my - c[1]) + nz * (mz - c[2]) < 0) {
      for (let k = 0; k < 3; k++) {
        const t = pos[i + 3 + k];
        pos[i + 3 + k] = pos[i + 6 + k];
        pos[i + 6 + k] = t;
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
// A feather (local helper): a flat blunt paddle, base at y 0, its square-cut
// tip at y 1, x across (half width 0.5), a low ridge on both faces (z ±0.16),
// so it reads as a soft feather, never a thorn.
function featherGeometry() {
  return sharedGeo('facet:owl:feather', () => {
    const O = [
      [0, 0],
      [0.5, 0.32],
      [0.36, 1],
      [-0.36, 1],
      [-0.5, 0.32],
    ];
    const pos = [];
    for (let i = 0; i < 5; i++) {
      const a = O[i];
      const b = O[(i + 1) % 5];
      pos.push(a[0], a[1], 0, b[0], b[1], 0, 0, 0.55, 0.16);
      pos.push(a[0], a[1], 0, b[0], b[1], 0, 0, 0.55, -0.16);
    }
    return fz(
      windOut(pos, (x, y, z, c) => {
        c[0] = 0;
        c[1] = 0.5;
        c[2] = 0;
      }),
      0.1,
      229
    );
  });
}
// A lofted panel (local helper): strips between stations, each with a
// diamond section (leading edge, upper ridge, trailing edge, lower ridge) and
// end caps, every strip its own faceted part so a band strip takes its tint.
function loftParts(stations, seed, bandTint) {
  const sec = (s) => {
    const zr = s.zl - 0.35 * (s.zl - s.zt);
    return [
      [s.x, 0, s.zl],
      [s.x, s.t, zr],
      [s.x, 0, s.zt],
      [s.x, -0.6 * s.t, zr],
    ];
  };
  const axisAt = (x, c) => {
    let i = 0;
    while (i < stations.length - 2 && x > stations[i + 1].x) i++;
    const a = stations[i];
    const b = stations[i + 1];
    const k = clamp((x - a.x) / (b.x - a.x), 0, 1);
    const zl = a.zl + (b.zl - a.zl) * k;
    const zt = a.zt + (b.zt - a.zt) * k;
    c[0] = x;
    c[1] = 0;
    c[2] = zl - 0.35 * (zl - zt);
  };
  const out = [];
  for (let i = 0; i + 1 < stations.length; i++) {
    const A = sec(stations[i]);
    const B = sec(stations[i + 1]);
    const pos = [];
    for (let j = 0; j < 4; j++) {
      const a0 = A[j], a1 = A[(j + 1) % 4], b0 = B[j], b1 = B[(j + 1) % 4];
      pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    }
    out.push({ geo: fz(windOut(pos, (x, y, z, c) => axisAt(x, c)), 0.1, seed + i), m: null, tint: stations[i].band ? bandTint : null });
  }
  for (const [S, dir] of [
    [sec(stations[0]), -1],
    [sec(stations[stations.length - 1]), 1],
  ]) {
    const pos = [...S[0], ...S[1], ...S[2], ...S[0], ...S[2], ...S[3]];
    const x = S[0][0];
    out.push({ geo: fz(windOut(pos, (px, py, pz, c) => axisAt(x - dir * 0.05, c)), 0.1, seed + 40 + dir), m: null });
  }
  return out;
}
// A baked row's mirror image across x = 0 (the left wing), its winding put
// back so its faces still face out. (Local helper: an instanced mirror would
// flip the winding per instance, which three cannot cull right.)
function mirrorX(src) {
  const g = src.clone();
  g.scale(-1, 1, 1);
  for (const name of ['position', 'color']) {
    const a = g.attributes[name];
    if (!a) continue;
    const n = a.itemSize;
    const arr = a.array;
    for (let i = 0; i + 2 < a.count; i += 3) {
      for (let c = 0; c < n; c++) {
        const t = arr[(i + 1) * n + c];
        arr[(i + 1) * n + c] = arr[(i + 2) * n + c];
        arr[(i + 2) * n + c] = t;
      }
    }
  }
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  g.userData.faceted = true;
  return g;
}
// The mirror of a +x wing's matrix, for the -x wing built from mirrorX
// geometry: Mx * M * Mx (a proper rotation, so the winding holds).
function mirrorConj(m) {
  const e = m.elements;
  e[1] = -e[1];
  e[2] = -e[2];
  e[3] = -e[3];
  e[4] = -e[4];
  e[8] = -e[8];
  e[12] = -e[12];
  return m;
}

let SET = null;
function geos() {
  if (SET) return SET;
  const P = new Vector3();
  const N = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const H = new Vector3();
  const m = new Matrix4();
  const wedge = wedgeGeometry();
  const feather = featherGeometry();
  const scale = scaleGeometry({ sides: 5, seed: 211 });
  const at = (pos, up, fwd, sx, sy, sz) => {
    basis(H.copy(up), fwd, X, Y, Z);
    return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
  };
  // a flat part lying in a surface: its tip along `dir`, its thin side along
  // the surface normal `nrm`
  const flat = (pos, dir, nrm, w, len, thick) => {
    Y.copy(dir).normalize();
    Z.copy(nrm).addScaledVector(Y, -nrm.dot(Y)).normalize();
    X.crossVectors(Y, Z).normalize();
    return setTRS(m, pos, X, Y, Z, w, len, thick).clone();
  };
  const set = {};
  const spotTint = tintOf(OWL_C.band, OWL_C.body, 1.1);
  const pearlTint = tintOf(OWL_C.body, OWL_C.back, 1.05);
  const bandTint = tintOf(OWL_C.band, OWL_C.back);
  const up = new Vector3(0, 1, 0);

  // Torso: the pale egg, faceted (the silhouette, full ink).
  set.torso = fz(new SphereGeometry(1, 9, 6).scale(TORSO.x, TORSO.y, TORSO.z), 0.12, 201);
  const torsoSoup = set.torso.attributes.position;
  const O0 = new Vector3();
  // Breast: three rows of feathers sunk into the chest (only their low
  // ridges break the surface: value steps, no outline), the barn owl's dark
  // drop spots laid flat on it as dots.
  set.breast = bakeParts('owl:breast', () => {
    const out = [];
    const ROWS = [
      [1.3, [-0.45, 0, 0.45]],
      [1.7, [-0.85, -0.3, 0.3, 0.85]],
      [2.1, [-0.45, 0, 0.45]],
    ];
    ROWS.forEach(([th, phis], r) => {
      phis.forEach((ph, j) => {
        onFacets(torsoSoup, O0, TORSO, th, ph, -0.006, P, N);
        basis(N, H.set(0, -1, 0), X, Y, Z);
        const s = 1 - 0.1 * r;
        setTRS(m, P, X, Y, Z, 0.1 * s, 0.018, 0.11 * s);
        out.push({ geo: scale, m: m.clone(), tone: 0.95 + 0.04 * ((j + r) % 3) });
      });
    });
    for (const [th, ph] of [[1.5, -0.24], [1.5, 0.24], [1.9, -0.6], [1.9, 0], [1.9, 0.6]]) {
      onFacets(torsoSoup, O0, TORSO, th, ph, 0.001, P, N);
      H.set(0, -1, 0).addScaledVector(N, -N.y);
      out.push({ geo: wedge, m: flat(P, H, N, 0.026, 0.03, 0.03), tint: spotTint });
    }
    return out;
  });
  // Back: the slate mantle, scapulars sunk over the shoulders and down the
  // spine (alternating values: a hint of the barring), pale pearl dots.
  set.back = bakeParts('owl:back', () => {
    const out = [];
    const mantle = fz(new SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.12, 203);
    const mantleM = new Matrix4().compose(MANTLE_C, new Quaternion(), MANTLE);
    out.push({ geo: mantle, m: mantleM });
    const mantleSoup = mantle.clone().applyMatrix4(mantleM).attributes.position;
    const SC = [
      [0.72, 1.2, 0.11],
      [1.02, 1.72, 0.12],
      [0.82, 2.35, 0.11],
    ];
    SC.forEach(([th, ph, w], j) => {
      for (const side of [-1, 1]) {
        onFacets(mantleSoup, MANTLE_C, MANTLE, th, side * ph, -0.006, P, N);
        basis(N, H.set(0, 0, -1), X, Y, Z);
        tip(X, Y, Z, -0.12);
        setTRS(m, P, X, Y, Z, w, 0.024, w * 1.15);
        out.push({ geo: scale, m: m.clone(), tone: j % 2 ? 0.88 : 1.04 });
      }
    });
    onFacets(mantleSoup, MANTLE_C, MANTLE, 0.5, Math.PI, -0.006, P, N);
    basis(N, H.set(0, 0, -1), X, Y, Z);
    tip(X, Y, Z, -0.12);
    out.push({ geo: scale, m: setTRS(m, P, X, Y, Z, 0.12, 0.024, 0.13).clone(), tone: 0.9 });
    for (const [th, ph] of [[0.55, -0.9], [0.55, 0.9], [1.05, -2.05], [1.05, 2.05]]) {
      onFacets(mantleSoup, MANTLE_C, MANTLE, th, ph, 0.001, P, N);
      H.set(0, 0, -1).addScaledVector(N, -N.z);
      out.push({ geo: wedge, m: flat(P, H, N, 0.03, 0.032, 0.03), tint: pearlTint });
    }
    return out;
  });
  // Tail: a fan of five blunt feathers raked back and a touch down, light and
  // dark in turn (it steers on its own pivot).
  set.tail = bakeParts('owl:tail', () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.03;
      const len = 0.21 - 0.015 * Math.abs(i - 2);
      out.push({ geo: feather, m: flat(P.set(x, 0, 0.03), H.set(x * 1.7, -0.14, -1), up, 0.085, len, 0.1), tone: i % 2 ? 0.84 : 1 });
    }
    return out;
  });
  // Skull: the slate head, a crown of small feathers sunk in it, the layered
  // ear tufts (two blades each, the tall one darker).
  set.skull = bakeParts('owl:skull', () => {
    const out = [];
    const skull = fz(new SphereGeometry(SKULL_R, 7, 5), 0.12, 207);
    const skullM = new Matrix4().makeScale(1, 0.95, 0.95);
    out.push({ geo: skull, m: skullM });
    const skullSoup = skull.clone().applyMatrix4(skullM).attributes.position;
    const SK = new Vector3(SKULL_R, SKULL_R * 0.95, SKULL_R * 0.95);
    for (const [th, ph] of [[0.42, Math.PI - 0.55], [0.42, Math.PI + 0.55], [0.75, Math.PI]]) {
      onFacets(skullSoup, O0, SK, th, ph, -0.005, P, N);
      basis(N, H.set(0, 0, -1), X, Y, Z);
      tip(X, Y, Z, -0.12);
      out.push({ geo: scale, m: setTRS(m, P, X, Y, Z, 0.08, 0.02, 0.09).clone(), tone: 0.92 });
    }
    for (const side of [-1, 1]) {
      out.push({ geo: wedge, m: at(P.set(side * 0.085, 0.115, -0.01), H.set(side * 0.5, 1, -0.3), new Vector3(0, 0, 1), 0.065, 0.125, 0.22), tone: 0.84 });
      out.push({ geo: wedge, m: at(P.set(side * 0.07, 0.11, -0.05), H.set(side * 0.45, 0.8, -0.6), new Vector3(0, 0, 1), 0.06, 0.09, 0.2), tone: 1.0 });
    }
    return out;
  });
  // Facial disc (no ink, as on the classic): two faceted lobes in a clean
  // cream heart, framed by a slate ruff of blunt feathers tucked behind its
  // rim, a soft keel down its middle to the beak.
  set.disc = bakeParts('owl:disc', () => {
    const out = [];
    const lobe = fz(new SphereGeometry(0.09, 7, 4), 0.08, 209);
    for (const side of [-1, 1]) {
      out.push({ geo: lobe, m: new Matrix4().compose(P.set(side * 0.06, 0, 0), new Quaternion().setFromAxisAngle(Z.set(0, 0, 1), side * -0.25), H.set(1, 1.15, 0.32)) });
    }
    const ruffTint = tintOf(OWL_C.back, OWL_C.face, 0.85);
    const nz = new Vector3(0, 0, 1);
    const RUFF = 10;
    for (let i = 0; i < RUFF; i++) {
      const a = ((i + 0.5) / RUFF) * Math.PI * 2;
      const dx = Math.sin(a);
      const dy = Math.cos(a);
      // a heart: notched at the top, pointed at the chin
      const r = Math.hypot(0.15 * dx, 0.115 * dy) * (1 - 0.18 * Math.max(0, dy) ** 4) * (1 + 0.1 * Math.max(0, -dy) ** 2);
      out.push({ geo: feather, m: flat(P.set(dx * r * 0.82, dy * r * 0.82, -0.02), H.set(dx, dy, 0), nz, 0.075, 0.06, 0.1), tint: ruffTint, tone: i % 2 ? 0.92 : 1 });
    }
    out.push({ geo: wedge, m: flat(P.set(0, 0.055, 0.024), H.set(0, -1, 0.15), nz, 0.03, 0.075, 0.08), tone: 0.92 });
    return out;
  });
  // Eye sockets: angular charcoal (never round, never warm), slanted.
  set.sockets = bakeParts('owl:sockets', () => {
    const out = [];
    const sock = fz(new IcosahedronGeometry(0.036, 0), 0, 1);
    for (const side of [-1, 1]) {
      out.push({ geo: sock, m: new Matrix4().compose(P.set(side * 0.055, 0.02, 0.026), new Quaternion().setFromAxisAngle(Z.set(0, 0, 1), side * 0.32), H.set(1.2, 0.85, 0.5)) });
    }
    return out;
  });
  // The indigo pupils (the tell): one small faceted gem each.
  set.pupil = markShared(fz(new OctahedronGeometry(0.016, 0), 0, 1));
  // The beak: one hooked, tapering horn (the upper and the lower mandible).
  set.beak = hornGeometry({ len: 1, r: 0.28, bend: 1.1, seg: 2, sides: 4, jitter: 0.1, seed: 213 });
  // A leg: the feathered trouser (pale), the bare shin (beak tone), three
  // curved talons (near charcoal).
  set.leg = bakeParts('owl:leg', () => {
    const out = [];
    const shinTint = tintOf(OWL_C.beak, OWL_C.body);
    const clawTint = tintOf(OWL_C.band, OWL_C.body, 0.45);
    out.push({ geo: fz(new CylinderGeometry(0.032, 0.046, 0.09, 4, 1, true).translate(0, -0.045, 0), 0.12, 215), m: null, tone: 0.97 });
    out.push({ geo: fz(new CylinderGeometry(0.014, 0.018, 0.07, 4, 1, true).translate(0, -0.12, 0), 0.08, 217), m: null, tint: shinTint });
    const claw = hornGeometry({ len: 1, r: 0.22, bend: 1.5, seg: 2, sides: 3, jitter: 0.08, seed: 219 });
    for (const a of [-0.55, 0, 0.55]) {
      const dir = new Vector3(Math.sin(a) * 0.7, -0.35, Math.cos(a)).normalize();
      out.push({ geo: claw, m: at(P.set(Math.sin(a) * 0.012, -0.152, Math.cos(a) * 0.012), dir, new Vector3(0, -1, 0), 0.06, 0.06, 0.06), tint: clawTint });
    }
    return out;
  });
  // The wing's arm (shoulder to wrist): the lofted panel, three greater
  // coverts laid flat into its rear slope (only a low ridge breaks the
  // surface), four blunt secondaries scalloping the trailing edge.
  set.armR = bakeParts('owl:armR', () => {
    const out = loftParts(ARM_ST, 231, bandTint);
    for (let i = 0; i < 3; i++) {
      const s = sectionAt(ARM_ST, 0.06 + i * 0.11);
      const zr = s.zl - 0.35 * (s.zl - s.zt);
      // the rear slope, from the ridge down to the trailing edge
      H.set(0, -s.t, s.zt - zr);
      N.set(0, zr - s.zt, -s.t).normalize();
      out.push({ geo: feather, m: flat(P.set(s.x, s.t - 0.004, zr - 0.006), H, N, 0.12, Math.hypot(s.t, zr - s.zt) * 0.85, 0.04), tone: i % 2 ? 0.88 : 1.05 });
    }
    for (let i = 0; i < 4; i++) {
      const x = 0.05 + i * 0.095;
      const s = sectionAt(ARM_ST, x);
      out.push({ geo: feather, m: flat(P.set(x, 0, s.zt + 0.035), H.set(0.1 + 0.05 * i, 0, -1), up, 0.11, 0.11, 0.1), tone: i % 2 ? 0.86 : 1 });
    }
    return out;
  });
  // The hand (wrist to tip): the lofted panel with the three bands as strips
  // of its own surface, a fan of five fingered primaries at its edge.
  set.handR = bakeParts('owl:handR', () => {
    const out = loftParts(HAND_ST, 241, bandTint);
    const PR = [
      [0.38, 0.22, 0.14, 0.075],
      [0.32, 0.52, 0.14, 0.08],
      [0.25, 0.82, 0.13, 0.085],
      [0.18, 1.1, 0.12, 0.085],
      [0.11, 1.34, 0.11, 0.085],
    ];
    PR.forEach(([x, a, len, w], i) => {
      const s = handSt(x);
      // set in from the edge it leaves, so only its blunt end shows
      const bx = x - Math.cos(a) * 0.03;
      const bz = s.zt + 0.03 + (s.zl - s.zt) * 0.15 * Math.max(0, 1 - a);
      out.push({ geo: feather, m: flat(P.set(bx, 0, bz), H.set(Math.cos(a), 0, -Math.sin(a)), up, w, len, 0.1), tone: i % 2 ? 0.86 : 1.02 });
    });
    return out;
  });
  set.armL = sharedGeo('facet:bake:owl:armL', () => mirrorX(set.armR));
  set.handL = sharedGeo('facet:bake:owl:handL', () => mirrorX(set.handR));
  // one buffer per part for the whole game (never disposed, geocache.js)
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}
// A lofted panel's section at x (linear between its stations).
function sectionAt(stations, x) {
  let i = 0;
  while (i < stations.length - 2 && x > stations[i + 1].x) i++;
  const a = stations[i];
  const b = stations[i + 1];
  const k = clamp((x - a.x) / (b.x - a.x), 0, 1);
  return { x, zl: a.zl + (b.zl - a.zl) * k, zt: a.zt + (b.zt - a.zt) * k, t: a.t + (b.t - a.t) * k };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
const smooth01 = (x) => {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};
// The glide: bursts of beats with the wings held out between them.
const glideHold = (t) => 0.2 + 0.8 * smooth01((Math.sin(t * 0.8) + 0.3) / 0.8);
const beatFreq = (tread) => BEAT_GLIDE + (BEAT_TREAD - BEAT_GLIDE) * clamp(tread, 0, 1);

export function buildOwlFacet() {
  const G = geos();
  const F = createFoeFrame('owl');
  const { body, track } = F;
  const bodyMat = track(foeMaterial(OWL_C.body));
  const backMat = track(foeMaterial(OWL_C.back));
  const faceMat = track(foeMaterial(OWL_C.face));
  const beakMat = track(foeMaterial(OWL_C.beak));
  const inkMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false, vertexColors: true });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });

  // The body: torso, breast rows, mantle (the frame's body group carries the
  // hover, the bank and the squash; its origin is the owl's middle).
  body.add(foePart(G.torso, bodyMat, 'full', 'owl-torso'));
  body.add(foePart(G.breast, bodyMat, false, 'owl-breast'));
  body.add(foePart(G.back, backMat, 'part', 'owl-back'));
  const tail = new Group();
  tail.name = 'owl-tail';
  tail.position.copy(TAIL_AT);
  body.add(tail);
  tail.add(foePart(G.tail, backMat, 'part', 'owl-tail-fan'));
  // The head: the skull and tufts, the disc group (it flares) with the
  // sockets, the indigo pupils, their glow and the beak.
  const head = new Group();
  head.name = 'owl-head';
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.skull, backMat, 'full', 'owl-skull'));
  const disc = new Group();
  disc.name = 'owl-disc';
  disc.position.copy(DISC_AT);
  head.add(disc);
  disc.add(foePart(G.disc, faceMat, false, 'owl-face'));
  disc.add(foePart(G.sockets, inkMat, false, 'owl-sockets'));
  const pupils = [-1, 1].map((side) => {
    const p = new Mesh(G.pupil, tellMat);
    p.name = 'owl-pupil';
    p.position.set(side * 0.055, 0.022, 0.048);
    disc.add(p);
    return p;
  });
  const eyeGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.32, opacity: 0.18 });
  eyeGlow.material.toneMapped = false;
  eyeGlow.material.color.copy(TELL_INDIGO_GLOW);
  eyeGlow.position.set(0, 0.02, 0.08);
  disc.add(eyeGlow);
  // The beak: the upper hook and the lower mandible, no ink (as the classic),
  // posed by matrix every frame.
  const beaks = ['owl-beak', 'owl-beak-low'].map((name) => {
    const b = foePart(G.beak, beakMat, false, name);
    b.matrixAutoUpdate = false;
    disc.add(b);
    return b;
  });
  // The wings: arm and hand each side, posed by matrix every frame (the -x
  // side is the mirror geometry, so its detail stays on top), each with the
  // full silhouette ink.
  const wingMesh = (geo, name) => {
    const w = foePart(geo, backMat, 'full', name);
    w.matrixAutoUpdate = false;
    body.add(w);
    return w;
  };
  const armR = wingMesh(G.armR, 'owl-wing-arm');
  const handR = wingMesh(G.handR, 'owl-wing-hand');
  const armL = wingMesh(G.armL, 'owl-wing-arm');
  const handL = wingMesh(G.handL, 'owl-wing-hand');
  // The legs hang below (a flier: nothing locks to the floor); they swing.
  const legs = instancedPart(G.leg, bodyMat, 2, { name: 'owl-legs', moving: true, inkPx: PART_INK_PX });
  body.add(legs);
  // The contact shadow belongs to the floor (the group, not the yaw).
  const shadow = groundShadow(0.3, 0.42);
  F.group.add(shadow);

  // Named points (B8): the beak tip (the weapon: the shriek leaves it), the
  // talons (the hand), the gape (the mouth); each follows its part.
  const tipPt = namedPoint(disc, 'owl-tip', 0, -0.085, 0.105);
  const mouth = namedPoint(disc, 'owl-mouth', 0, -0.055, 0.085);
  const talonPt = namedPoint(body, 'owl-talons', 0.07, -0.37, 0.07);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const cur = { ...REST };
  const scratch = { ...REST };
  const windFrom = { ...REST };
  const abortFrom = { ...REST };
  const m = new Matrix4();
  const mo = new Matrix4();
  const q = new Quaternion();
  const eul = new Euler(0, 0, 0, 'ZYX');
  const ONE = new Vector3(1, 1, 1);
  const legPos = new Vector3();
  const legQ = new Quaternion();
  const legE = new Euler(0, 0, 0, 'XYZ');
  const beakPos = new Vector3();
  const beakX = new Vector3(1, 0, 0);
  const beakY = new Vector3();
  const beakZ = new Vector3();
  const lowTip = new Vector3();
  let age = -1;
  let id = 0;
  let wingPhase = 0;
  // the live clip: 'idle' | 'gather' | 'post' | 'abort'
  let mode = 'idle';
  let postT0 = 0;
  let abortT0 = 0;
  let struck = false; // this telegraph's strike has started
  let lastShriekTick = null;
  // travel (yaw space, smoothed) for the bank, the lean and the trailing
  let lastX = null;
  let lastZ = null;
  let lastYaw = 0;
  let yawNow = 0;
  let lvx = 0;
  let lvz = 0;
  let yawRate = 0;
  let swingF = 0;
  let swingS = 0;
  // two records the probe reads, swapped so a cancel can put the last back
  const strikes = [
    { id: 'shriek', tick: 0 },
    { id: 'shriek', tick: 0 },
  ];
  let prevStrike = null;

  const lab = {
    abilities: OWL_ABILITIES,
    override: null, // { id: 'shriek', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live strike's contact lands on
    pose: () => ({ ...cur }),
    parts: { body, head, disc, tail, wings: [armR, handR, armL, handL], legs, beak: beaks },
  };

  function recordStrike(contactTick) {
    prevStrike = lab.lastStrike;
    const s = strikes[0] === prevStrike ? strikes[1] : strikes[0];
    s.tick = contactTick;
    lab.lastStrike = s;
  }
  // No shriek: the strike (if it began) is taken back and the gather settles
  // back to the glide.
  function abort(now) {
    if (struck) lab.lastStrike = prevStrike;
    struck = false;
    Object.assign(abortFrom, cur);
    mode = 'abort';
    abortT0 = now;
  }

  // The lab's wingbeat phase at ability time t: the integral of the beat's
  // frequency over the timeline (pure in t, so a scrub never runs it back).
  function labPhase(t) {
    const n = 24;
    let sum = 0;
    let prev = beatFreq(0);
    for (let i = 1; i <= n; i++) {
      owlShriekPose((t * i) / n, scratch);
      const f = beatFreq(scratch.tread);
      sum += ((prev + f) / 2) * (t / n);
      prev = f;
    }
    return sum;
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const e = P.e || null;
    const tick = P.tick ?? 0;
    const turntable = !!P.turntable;
    if (e && e.id != null) id = e.id;
    // B7: grow from the floor (not on the Journal's turntable, nor in the lab)
    if (age < 0) {
      age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
      wingPhase = id * 1.3;
    } else age += dt;
    F.spawn.scale.setScalar(spawnScale(age));

    // --- the shriek: the lab's pure override, or the live telegraph
    let phaseT; // the wingbeat phase this frame
    let holdT; // the glide-hold clock
    if (lab.override) {
      const t = Math.max(0, Math.min(OWL_SHRIEK.duration, lab.override.t));
      owlShriekPose(t, cur);
      phaseT = labPhase(t);
      holdT = t;
      mode = 'idle';
      watch.reset();
    } else {
      // the telegraph the watch holds, before this frame's beat clears it
      const watchedR = watch.telegraph ? watch.telegraph.resolveTick : null;
      const beat = watch.update(P);
      const tel = e && e.telegraph;
      if (beat && beat.type === 'wind') {
        // a telegraph replaced by a new one with no release between never
        // shrieked: take its strike back
        if (struck) lab.lastStrike = prevStrike;
        Object.assign(windFrom, cur);
        struck = false;
      }
      if (beat && beat.type === 'release') {
        // the sim confirms a shriek with its tick; a telegraph that ended
        // without one (a stun on the tick before the resolve, seen late) is
        // no shriek
        const R = watchedR ?? tick;
        const sim = e && typeof e.shriekTick === 'number' ? e.shriekTick : null;
        if (sim !== null && sim < R - 1) abort(now);
        else {
          // the contact holds from here (the strike already ran in the
          // telegraph's last frames; a frame that skipped them strikes now)
          if (!struck) recordStrike(R);
          mode = 'post';
          postT0 = now;
          struck = false;
          if (sim !== null) lastShriekTick = sim;
        }
      } else if (beat && beat.type === 'cancel') abort(now);
      // a shriek seen only by its tick (no telegraph reached this rig)
      if (e && typeof e.shriekTick === 'number' && e.shriekTick >= 0 && lastShriekTick !== null && e.shriekTick !== lastShriekTick && !tel) {
        lastShriekTick = e.shriekTick;
        if (mode !== 'post' || now - postT0 > 2 * FRAME) {
          recordStrike(e.shriekTick);
          mode = 'post';
          postT0 = now;
        }
      }
      if (lastShriekTick === null) lastShriekTick = e && typeof e.shriekTick === 'number' ? e.shriekTick : -1;

      if (tel && watch.telegraph) {
        const span = Math.max(1, (tel.resolveTick ?? tick) - (tel.startTick ?? tick));
        // the SHOWN tick: the layer interpolates tick - 1 + alpha, but the
        // telegraph is the state's own, so the strike's last tick shows too;
        // held half a tick short of the contact while the telegraph lives, so
        // the contact itself only ever shows on the release (whichever way a
        // caller counts its ticks)
        const tt = clamp(tick + 1 - (tel.startTick ?? tick), 0, span - 0.5);
        const ph = owlGatherPose(tt, span, cur, windFrom);
        mode = 'gather';
        if (ph === 'strike' && !struck) {
          // the strike starts: its contact lands on the resolve tick
          struck = true;
          recordStrike(tel.resolveTick ?? tick + 1);
        }
      } else if (mode === 'gather') {
        mode = 'idle';
      }
      if (mode === 'post') {
        const ph = owlPostPose(now - postT0, cur);
        if (ph === 'rest') mode = 'idle';
      } else if (mode === 'abort') {
        const k = (now - abortT0) / ABORT_SEC;
        lerpFields(cur, REST, abortFrom, settle(Math.min(1, k)), FIELDS);
        if (k >= 1) mode = 'idle';
      }
      if (mode === 'idle') Object.assign(cur, REST);
      wingPhase += dt * beatFreq(cur.tread);
      phaseT = wingPhase;
      holdT = now + id * 1.7;
    }

    // --- the travel, measured from the layer's own placement (yaw space)
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null || Math.hypot(gx - lastX, gz - lastZ) > 1.5 || turntable) {
      lastX = gx;
      lastZ = gz;
      lastYaw = yawNow;
    }
    if (dt > 0) {
      const vx = (gx - lastX) / dt;
      const vz = (gz - lastZ) / dt;
      const c = Math.cos(yawNow);
      const s = Math.sin(yawNow);
      const k = 1 - Math.exp(-8 * dt);
      lvx += (vx * c - vz * s - lvx) * k;
      lvz += (vx * s + vz * c - lvz) * k;
      let dy = yawNow - lastYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      yawRate += (dy / dt - yawRate) * k;
    }
    lastX = gx;
    lastZ = gz;
    lastYaw = yawNow;
    const fwd = clamp(lvz / SPEED, -1, 1);
    const side = clamp(lvx / SPEED, -1, 1);
    const speed = Math.min(1, Math.hypot(lvx, lvz) / SPEED);
    // bank into a sideways drift and into a turn (the wing on the travel side
    // dips), nose down into a forward glide, lean back on a backpedal
    const roll = clamp(-0.34 * side - 0.07 * clamp(yawRate, -3, 3) * Math.max(0.3, Math.abs(fwd)), -0.5, 0.5);
    const lean = fwd >= 0 ? 0.13 * fwd : 0.24 * fwd;
    // the talons and the tail trail the travel with a lag
    const ks = 1 - Math.exp(-5 * dt);
    swingF += (0.45 * fwd - swingF) * ks;
    swingS += (-0.35 * side - swingS) * ks;

    // --- the wingbeat: the glide's bursts or the hang's tread, harder with
    // the travel (a backpedal works hardest); the stroke tilts forward on a
    // backpedal (the wings push the air ahead)
    const tread = clamp(cur.tread, 0, 1);
    const effort = 1 + 0.35 * speed + 0.3 * Math.max(0, -fwd);
    const A = Math.max(0, cur.amp) * (GLIDE_AMP * glideHold(holdT) * (1 - tread) + TREAD_AMP * tread) * effort;
    const sn = Math.sin(phaseT);
    const cs = Math.cos(phaseT);
    const wFlap = cur.flap + A * sn;
    const wSweep = cur.sweep + 0.12 * Math.max(0, fwd) + 0.32 * Math.min(0, fwd);
    const wTwist = cur.twist + 0.3 * A * cs; // leading edge dips on the downstroke
    const wFold = cur.fold + 0.55 * A * Math.max(0, cs); // the hand folds on the upstroke
    const wOut = -0.55 * A * cs; // and lags the arm
    for (let s = 0; s < 2; s++) {
      eul.set(-wTwist, wSweep, wFlap, 'ZYX');
      q.setFromEuler(eul);
      m.compose(SHOULDER, q, ONE);
      eul.set(0, wFold, wOut, 'ZYX');
      q.setFromEuler(eul);
      mo.compose(WRIST, q, ONE).premultiply(m);
      const arm = s === 0 ? armR : armL;
      const hand = s === 0 ? handR : handL;
      if (s === 1) {
        mirrorConj(m);
        mirrorConj(mo);
      }
      arm.matrix.copy(m);
      hand.matrix.copy(mo);
      arm.matrixWorldNeedsUpdate = true;
      hand.matrixWorldNeedsUpdate = true;
    }

    // --- the body: the hover and its bob (the downstroke lifts it), the
    // bank, the lean, the squash and a slow breath
    const breath = Math.sin(now * 2.1 + id);
    const bob = 0.06 * Math.sin((P.t ?? 0) * 2.1 + id) * (1 - 0.7 * tread) + 0.02 * A * Math.cos(phaseT - 0.6);
    body.position.set(0, HOVER + cur.lift + bob, cur.push);
    body.rotation.set(cur.pitch + lean, 0, roll);
    body.scale.set(cur.sx, cur.sy * (1 + 0.012 * breath), cur.sz);
    // the head: a slow look round in the glide, locked on the target once it
    // hangs (the tell reads straight at you)
    const look = 1 - Math.min(1, tread * 1.5);
    head.position.set(HEAD_AT.x, HEAD_AT.y + cur.hy, HEAD_AT.z + cur.hz);
    head.rotation.set(cur.hp + 0.04 * Math.sin(now * 1.1 + id) * look, 0.28 * Math.sin(now * 0.53 + id) * look, 0.06 * Math.sin(now * 0.37 + id * 2) * look);
    disc.scale.setScalar(cur.disc);
    for (const p of pupils) p.scale.setScalar(cur.pupil);
    eyeGlow.material.opacity = clamp(0.16 + cur.glow + 0.03 * Math.sin((P.t ?? 0) * 2.6), 0, 1);
    // the beak: the upper hook lifts a touch, the lower mandible drops open
    for (let b = 0; b < 2; b++) {
      // a: the mandible's angle below the face's forward (negative = down);
      // the upper hook curls down and back, the lower curls up toward it
      const a = b === 0 ? -0.5 + 0.25 * cur.beak : -0.62 - 0.9 * cur.beak;
      beakY.set(0, Math.sin(a), Math.cos(a));
      beakZ.set(0, b === 0 ? -Math.cos(a) : Math.cos(a), b === 0 ? Math.sin(a) : -Math.sin(a));
      beakX.crossVectors(beakY, beakZ).normalize();
      beakPos.set(0, b === 0 ? -0.022 : -0.04, b === 0 ? 0.05 : 0.044);
      const L = b === 0 ? 0.085 : 0.055;
      const bm = beaks[b];
      setTRS(bm.matrix, beakPos, beakX, beakY, beakZ, L, L, L);
      bm.matrixWorldNeedsUpdate = true;
    }
    // B8: the tip at the hook's point, the mouth in the gape between the two
    tipPt.position.copy(BEAK_TIP).applyMatrix4(beaks[0].matrix);
    lowTip.copy(BEAK_TIP).applyMatrix4(beaks[1].matrix);
    mouth.position.copy(tipPt.position).add(lowTip).multiplyScalar(0.5);
    // the tail steers against the bank, brakes down in the hang, and fans and
    // lifts in a backpedal's airflow
    tail.rotation.set(cur.tailP - 0.25 * Math.min(0, fwd), -0.5 * roll + 0.12 * Math.sin(now * 1.3 + id), 0.3 * roll);
    tail.scale.set(1 + 0.35 * (cur.tail + 0.5 * Math.max(0, -fwd)), 1, 1);
    // the legs: drawn up, raked forward, trailing the travel
    for (let i = 0; i < 2; i++) {
      legE.set(cur.talon + swingF + 0.06 * Math.sin(now * 3 + i * 2 + id), 0, swingS);
      legQ.setFromEuler(legE);
      legs.setMatrixAt(i, m.compose(HIPS[i], legQ, ONE));
    }
    legs.instanceMatrix.needsUpdate = true;
    legPos.set(0, -0.18, 0.03).applyQuaternion(legQ).add(HIPS[1]);
    talonPt.position.copy(legPos);
    // the shadow tightens a touch as the owl rises into the hang
    shadow.scale.set(1 - 0.5 * cur.lift, 1 - 0.5 * cur.lift, 1);
  }

  return {
    group: F.group,
    // the node the shared hit envelope wraps: everything that moves
    body: F.yaw,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand: talonPt, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a light hovering body
    // squashes less and flinches and is knocked more; the bulge sits at its
    // middle, 1.5 u up.
    react: { squash: 0.75, flinch: 1.15, knock: 1.25, axis: 'y', midY: HOVER },
    // K2 to K4: a light bird swells less and is thrown further.
    death: { swell: 0.8, throw: 1.3 },
  };
}
