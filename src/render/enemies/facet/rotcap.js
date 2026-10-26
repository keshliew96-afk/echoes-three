// ROTCAP, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic Rotcap
// of enemies/archetypes.js (buildRotcap: a fat toadstool on a stubby stalk,
// "a toadstool that learned to walk") with the sample video's technique laid
// ON TOP of its chibi ink look: the same fat slate dome on a short pale stalk,
// the dark gills, the charcoal slit eyes under the brim and the one indigo
// tell (the cap spots, with their faint glow). What it gains:
//
//   * faceted masses: a lathed dome with a lobed, drooping rim lip and a
//     lathed stalk swelling into a bulb, each cut into flat planes with their
//     own value step, its rim round and level at the classic's height so the
//     pale stalk and its bulb show under it at play zoom; the cap's underside
//     carries the gill tone in the same mesh (one draw call where the
//     classic's gill disc took its own);
//   * detail by repetition, BAKED per kind (render/facet/foe.js) so a room of
//     Rotcaps shares one buffer per part and the draw calls stay under the
//     classic's 16: low six-sided crown scales half sunk in the dome and
//     flat warts between the spots, a fringe of radial gill blades showing under
//     the rim, a ragged veil ring (annulus) under the cap, a torn volva cup
//     hugging the bulb, the indigo spots as raised warty domes (bright and
//     dim in one unlit call), angry brow notches over the slit eyes;
//   * WORLD-LOCKED FEET (render/facet/legs.js): a slow, rolling shamble
//     (about 1.6 to 1.9 rocks a second at the sim's speeds, the classic's
//     1.4) on two root feet tucked under the bulb (one instanced row: a root
//     leg out of the bulb, a flat nub and three root toes each), each pinned
//     to the floor, heading and all, while it carries weight; the body rolls
//     onto the planted foot and leans along its real travel (a backpedal
//     leans back, a sidestep leans aside). The bulb
//     never touches the floor: a lean that would sink its rim rocks the body
//     up on that edge instead (rule 2);
//   * a 3-HIT CAP COMBO on its repeating contact bite (Kesh's combo
//     template): a cap hook from its right across to its left, a reverse
//     swipe back across with the cap whirling on its stalk, then the biggest:
//     the held rear-up (stalk tall, cap thrown back, gills bared) snapping
//     into a cap SLAM that drives the front rim nearly to the floor with the
//     deepest squash. Each strike's lead foot steps in, timed to plant by
//     the contact, and back out as the snap settles into the next hit's
//     wind-up (§6.1 B9: pull back, the lunge, the lean and the contact
//     squash). A bite the per-target cooldown predicts starts its strike
//     early so the contact lands ON the bite tick, but never while the sim
//     holds it (a stun, a blind) or while it walks off (then a held wind-up
//     recovers); an unannounced bite strikes on its event (contact 2.5 to 3.5
//     frames after it);
//   * the other things the sim does, each with a beat: the retreat (e.mode
//     'retreat': a startled shiver, then a hurried waddle with the cap tucked
//     down), the death burst (the `death` tuning: a big swell, no throw, so
//     the pop stays over the burst ring; the lab's 'burst' timeline plays it
//     to the ring's 48-tick landing). The spores are the VFX slice's: this
//     rig draws no motes and no puff;
//   * the spawn-in grow (B7, a toadstool sprouting), named points (B8), and
//     the hit and death tuning the shared envelope reads (§6.1 items 9, 10).
//
// Faces +Z. Same contract as buildRotcap (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, Group, IcosahedronGeometry, LatheGeometry, Matrix4, MeshBasicMaterial, Quaternion, Vector2, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, hash01 } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, PULL_IN, SPAWN_SEC, bakeParts, heldBy, scaleGeometry, createAttackWatch, createChain, createFoeClock, createFoeFrame, foeMaterial, foePart, hitPose, hitTimelines, namedPoint, placeBody, pullBack, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, segmentMatrix } from '../../facet/legs.js';

// The sim's Rotcap (sim/enemies/rotcap.js): a contact bite every 60 ticks per
// target, no telegraph; 1.1 u/s; on death a burst ring that lands 48 ticks on.
export const BITE_SEC = 60 / 60;
const RUN_SPEED = 1.1;
const BURST_SEC = 48 / 60;
// A bite inside this window of the last one is the next hit of the combo.
export const CHOMP_WINDOW = 1.4;
// The kit's chain: a hit's strike starts 1 frame into its timeline, its
// contact 3.5 frames in (render/facet/foe.js hitTimelines).
const STRIKE_IN = FRAME;
const CONTACT_IN = 3.5 * FRAME;

// --- Key poses. push: the body's shove along +z (u); pitch: the body's lean,
// forward (+), rad; twist: its turn (+ toward its left, +x); bank: its lean
// sideways (+ toward its left); cp: the cap's nod on the stalk (+ forward,
// the classic's bite nod); ctilt: the cap's tilt (+ its left rim down); cy:
// the cap's spin on the stalk; cs: the cap's swell; sx / sy: the body's
// squash (wide, tall); step: the lunge step (0..1); lead: which foot leads
// it (+1 its left, -1 its right; the gait steps that foot 0.16 u in, timed
// to plant by the contact: armLunge); hop: the body's lift (u). The lean toward the target is the body's pitch
// plus the cap's nod (about 23 degrees at the cap on a hook).
const REST = Object.freeze({ push: 0, pitch: 0, twist: 0, bank: 0, cp: 0, ctilt: 0, cy: 0, cs: 1, sx: 1, sy: 1, step: 0, lead: 0, hop: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// Each strike's lead foot steps in as it starts (a fresh hook on its bite, a
// predicted hit as its pull-back begins) and plants by the contact, so the
// body drives forward over it (rule 3); it steps back out as the snap
// settles.
// Hit 1, CAP HOOK: the cap cocked to its right (its right rim down, the body
// turned and leaning back onto its right foot, the left foot in), hooked
// across to its left.
const A1 = K({ push: -0.03, pitch: -0.03, twist: -0.26, bank: -0.07, cp: -0.1, ctilt: -0.22, cs: 1.03, sx: 0.97, sy: 1.04, step: 1, lead: 1 });
const P1 = K({ push: -0.07, pitch: -0.05, twist: -0.34, bank: -0.09, cp: -0.2, ctilt: -0.3, cs: 1.05, sx: 0.96, sy: 1.05, step: 1, lead: 1 });
const S1 = K({ push: 0.15, pitch: 0.14, twist: 0.22, bank: 0.07, cp: 0.26, ctilt: 0.32, cs: 1.1, sx: 1.19, sy: 0.91, step: 1, lead: 1 });
const O1 = K({ push: 0.12, pitch: 0.11, twist: 0.32, bank: 0.09, cp: 0.17, ctilt: 0.4, cs: 1.06, sx: 1.06, sy: 0.97, step: 1, lead: 1 });
// Hit 2, REVERSE SWIPE: hit 1's momentum carries the cap round (it is still
// spun and tilted to its left) while the right foot steps in, then it rakes
// back across to its right, a touch lower, whirling on its stalk.
const A2 = K({ push: -0.03, pitch: -0.02, twist: 0.28, bank: 0.07, cp: -0.06, ctilt: 0.26, cy: 0.35, cs: 1.03, sx: 0.97, sy: 1.04, step: 1, lead: -1 });
const P2 = K({ push: -0.07, pitch: -0.04, twist: 0.36, bank: 0.09, cp: -0.14, ctilt: 0.34, cy: 0.45, cs: 1.05, sx: 0.96, sy: 1.05, step: 1, lead: -1 });
const S2 = K({ push: 0.15, pitch: 0.15, twist: -0.24, bank: -0.07, cp: 0.32, ctilt: -0.36, cy: -0.5, cs: 1.1, sx: 1.19, sy: 0.91, step: 1, lead: -1 });
const O2 = K({ push: 0.12, pitch: 0.12, twist: -0.34, bank: -0.09, cp: 0.2, ctilt: -0.44, cy: -0.62, cs: 1.06, sx: 1.06, sy: 0.97, step: 1, lead: -1 });
// Hit 3, CAP SLAM: the held wind-up is a rear (stalk tall, leaning back on
// its heels, the cap thrown back so the gills bare, the left foot in); the
// pull-back rises on its toes with a hop; the strike slams the cap down
// square, the front rim nearly to the floor, the deepest squash and the
// biggest swell (§6.1 B6).
const A3 = K({ push: -0.02, pitch: -0.06, cp: -0.32, cs: 1.06, sx: 0.94, sy: 1.1, step: 1, lead: 1 });
const P3 = K({ push: -0.07, pitch: -0.1, cp: -0.42, cs: 1.08, sx: 0.91, sy: 1.14, step: 1, lead: 1, hop: 0.04 });
const S3 = K({ push: 0.16, pitch: 0.24, cp: 0.5, cs: 1.14, sx: 1.24, sy: 0.86, step: 1, lead: 1 });
const O3 = K({ push: 0.14, pitch: 0.2, cp: 0.42, cs: 1.1, sx: 1.16, sy: 0.9, step: 1, lead: 1 });
// pull: the NEXT hit's pull-back from this hit's held wind-up
const HITS = [
  { label: 'cap hook', from: A1, pull: P2, strike: S1, over: O1, next: A2 },
  { label: 'reverse cap swipe', from: A2, pull: P3, strike: S2, over: O2, next: A3 },
  { label: 'cap slam', from: A3, pull: P1, strike: S3, over: O3, next: A1 },
].map((h) => Object.freeze(h));
const HIT_TL = hitTimelines(HITS, CHOMP_WINDOW, createTimeline);
export const ROTCAP_REST = REST;
export const ROTCAP_HITS = Object.freeze(HITS.map((h, i) => Object.freeze({ ...h, timeline: HIT_TL[i] })));
// Pure: combo hit n at t (the probe and the lab).
export function rotcapHitPose(n, t, from, fresh, pull, out = { ...REST }) {
  return hitPose(HITS, HIT_TL, REST, n, t, from, fresh, pull, out, ease);
}

// The model lab's combo, exactly as a live chain plays three bites at the
// sim's 1.0 s cadence on one target: the first unannounced (contact 3.5
// frames after its event), the second and third predicted by the cooldown,
// so each pulls back over the four frames before its strike starts (2.5
// frames before the bite) and its contact lands ON the bite. Pure in t, so
// it rewinds.
const T0 = [0, BITE_SEC - CONTACT_IN, 2 * BITE_SEC - CONTACT_IN]; // each hit's timeline zero
const SWITCH = [BITE_SEC - (CONTACT_IN - STRIKE_IN), 2 * BITE_SEC - (CONTACT_IN - STRIKE_IN)];
// the pose a chained hit strikes from: the last hit's held wind-up, pulled
// back (the kit's pullBack: over the 4 frames before the strike starts) as
// far as it got when the chain started the strike
const FROM = [REST];
FROM.push(Object.freeze(rotcapHitPose(0, SWITCH[0] - T0[0], REST, true, pullBack(CONTACT_IN - STRIKE_IN))));
FROM.push(Object.freeze(rotcapHitPose(1, SWITCH[1] - T0[1], FROM[1], false, pullBack(CONTACT_IN - STRIKE_IN))));
const CONTACTS = [CONTACT_IN, BITE_SEC, 2 * BITE_SEC];
export const ROTCAP_CHOMP = Object.freeze({
  id: 'chomp',
  label: 'Cap combo',
  duration: T0[2] + HIT_TL[2].duration,
  at(t) {
    const n = t < SWITCH[0] ? 0 : t < SWITCH[1] ? 1 : 2;
    const tt = t - T0[n];
    const due = n < 2 ? CONTACTS[n + 1] - t : null;
    const s = HIT_TL[n].sample(tt);
    const pull = s.id === 'ready' && due !== null ? pullBack(due) : 0;
    return { n, t: tt, fresh: n === 0, pull, from: FROM[n], phase: s.id, label: `${HIT_TL[n].label}: ${s.label}` };
  },
  // seconds into the combo where each strike's contact lands (the lab's cues:
  // the game plays 'bite' on each)
  strikes: CONTACTS.slice(),
  // the classic twin: its bite clip keys on a new biteTick (the sim's bite
  // events at 0, 1.0 and 2.0 s), plus the layer's lunge pulse
  classicAt(t) {
    const ev = t < BITE_SEC ? 0 : t < 2 * BITE_SEC ? 1 : 2;
    const since = t - ev * BITE_SEC;
    return { telegraphK: 0, lungeK: since >= 0 && since < 0.18 ? Math.sin((since / 0.18) * Math.PI) : 0, fireK: 0, e: { biteTick: ev * 60 } };
  },
});

// The death burst, for the model lab (the rig never sees its own death in
// game: the layer drops it on 'death' and runs the kill pop, the burst glob
// carries the ring). The cap swells (the `death.swell` beat), the body pops
// (the layer's 0.09 s stretch and 0.17 s collapse), the spore ring counts its
// 48 ticks to the landing, then the lab regrows it for the loop.
const BURST_TL = createTimeline(
  'burst',
  'Spore burst (death)',
  [
    { id: 'swell', label: 'the cap swells (death swell)', dur: 0.09 },
    { id: 'pop', label: 'pop (the kill pop)', dur: 0.17 },
    { id: 'ring', label: 'spore ring', dur: BURST_SEC - 0.26 },
    { id: 'regrow', label: 'regrow (lab loop)', dur: SPAWN_SEC },
    { id: 'rest', label: 'rest', dur: 0.3 },
  ],
  { cues: [{ at: 0.001, id: 'burst' }, { at: BURST_SEC, id: 'land' }] }
);
export const ROTCAP_BURST = Object.freeze({
  id: 'burst',
  label: BURST_TL.label,
  duration: BURST_TL.duration,
  phases: BURST_TL.phases,
  // the game's sounds: 'kill' on the death, 'telegraph_hit' on the landing
  cues: BURST_TL.cues,
  sample: (t) => BURST_TL.sample(t),
  readout(t) {
    const s = BURST_TL.sample(t);
    if (s.id === 'ring') return `${s.t.toFixed(1)}s · ${BURST_TL.label}: spore ring, lands in ${Math.max(0, Math.ceil((BURST_SEC - s.t) * 60))} ticks`;
    return `${s.t.toFixed(1)}s · ${BURST_TL.label}: ${s.label}`;
  },
  classicAt: () => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: null }),
});
export const ROTCAP_ABILITIES = Object.freeze({ chomp: ROTCAP_CHOMP, burst: ROTCAP_BURST });

// Pure: the burst's pose at t. Writes the body fields into out and returns
// the spawn group's scale (x/z, y).
const burstOut = { sxz: 1, sy: 1 };
const burstS = { t: 0, index: 0, id: '', label: '', k: 0 };
function burstPose(t, out) {
  Object.assign(out, REST);
  const s = BURST_TL.sample(t, burstS);
  burstOut.sxz = 1;
  burstOut.sy = 1;
  if (s.id === 'swell') {
    const k = ease.out(s.k);
    out.cs = 1 + 0.32 * k;
    out.sy = 1 + 0.1 * k;
    out.sx = 1 - 0.05 * k;
    out.cp = -0.12 * k; // the rim lifts, the gills flare
  } else if (s.id === 'pop') {
    const k = s.k;
    out.cs = 1.32 + 0.12 * k;
    out.sy = 1.1;
    out.sx = 0.95;
    out.cp = -0.12;
    burstOut.sxz = 1 + 0.6 * k;
    burstOut.sy = Math.max(0.001, (1 - k) * (1 - k));
  } else if (s.id === 'ring') {
    burstOut.sxz = 0.001;
    burstOut.sy = 0.001;
  } else if (s.id === 'regrow') {
    const g = spawnScale(t - BURST_SEC);
    burstOut.sxz = g;
    burstOut.sy = g;
  }
  return burstOut;
}

// --- Geometry (built once for the session, shared by every Rotcap) ---------
// The cap: a dome (cap-pivot space, the pivot 0.40 up the stalk, so the rim
// stands level at 0.39 over a stalk as tall in view as the classic's), radius
// R, height H, a point at
// angle a from the crown (0) toward the rim (pi/2) and phi round from the
// front (+z), as LatheGeometry lays it out.
const CAP_R = 0.35;
const CAP_H = 0.235;
const CAP_Y = 0.4;
function capPt(phi, a, lift, out, nrm) {
  const r = CAP_R * Math.sin(a);
  const y = CAP_H * Math.cos(a);
  let nr = Math.sin(a) / CAP_R;
  let ny = Math.cos(a) / CAP_H;
  const l = Math.hypot(nr, ny);
  nr /= l;
  ny /= l;
  nrm.set(nr * Math.sin(phi), ny, nr * Math.cos(phi));
  return out.set(r * Math.sin(phi), y, r * Math.cos(phi)).addScaledVector(nrm, lift);
}
// The stalk's profile (radius by height, body space): a bulb swelling out
// just over the floor (widest low, as the classic's stalk flares to the
// floor, so its foot shows under the brim) narrowing up the stalk and into
// the cap.
const STALK = [
  [0.0, 0.016],
  [0.13, 0.018],
  [0.185, 0.034],
  [0.205, 0.062],
  [0.198, 0.1],
  [0.172, 0.15],
  [0.158, 0.2],
  [0.15, 0.26],
  [0.15, 0.33],
  [0.145, 0.4],
  [0.0, 0.48],
];
function stalkR(y) {
  for (let i = 1; i < STALK.length; i++) {
    const [r1, y1] = STALK[i];
    const [r0, y0] = STALK[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return 0;
}
// The lowest rings of the body (y, r): the floor check keeps them clear.
const BASE_RINGS = [
  [0.018, 0.13],
  [0.034, 0.185],
  [0.062, 0.205],
];
const FLOOR_CLEAR = 0.012;

const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// Tip Y toward Z by angle a (a scale's trailing edge lifts).
function tip(X, Y, Z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const yx = Y.x * c + Z.x * s, yy = Y.y * c + Z.y * s, yz = Y.z * c + Z.z * s;
  Z.set(Z.x * c - Y.x * s, Z.y * c - Y.y * s, Z.z * c - Y.z * s);
  Y.set(yx, yy, yz);
  X.crossVectors(Y, Z).normalize();
}
// A lathe (profile [[r, y]], segs round), non-indexed, with its degenerate
// pole triangles dropped and an optional vertex warp, then faceted.
function lathe(profile, segs, { jitter, seed, warp = null }) {
  const g = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), segs).toNonIndexed();
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const p = g.attributes.position;
  const v = new Vector3();
  if (warp) {
    for (let i = 0; i < p.count; i++) {
      warp(v.fromBufferAttribute(p, i));
      p.setXYZ(i, v.x, v.y, v.z);
    }
  }
  const keep = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1).sub(a);
    c.fromBufferAttribute(p, i + 2).sub(a);
    if (b.cross(c).lengthSq() > 1e-12) for (let j = 0; j < 3; j++) keep.push(p.getX(i + j), p.getY(i + j), p.getZ(i + j));
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(keep, 3));
  g.dispose();
  return fz(out, jitter, seed);
}
// Multiply the per-plane steps of every face matching `test(normal, centroid)`
// by a colour (per channel) or a tone.
function tintFaces(g, test, r, gg = r, b = r) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const col = g.attributes.color;
  const n = new Vector3();
  const c = new Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    n.fromBufferAttribute(nor, i);
    c.set((pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
    if (!test(n, c)) continue;
    for (let j = 0; j < 3; j++) col.setXYZ(i + j, col.getX(i + j) * r, col.getY(i + j) * gg, col.getZ(i + j) * b);
  }
  return g;
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
  const scale = scaleGeometry({ seed: 133 });
  const wart = scaleGeometry({ seed: 131 });
  const at = (pos, up, fwd, sx, sy, sz) => {
    basis(H.copy(up), fwd, X, Y, Z);
    return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
  };
  // the gill tone as a multiplier on the cap's (per channel): the underside
  // and the gill blades ride the cap's material and its flash
  const gill = new Color(HIDE.rotGill.r / HIDE.rotCap.r, HIDE.rotGill.g / HIDE.rotCap.g, HIDE.rotGill.b / HIDE.rotCap.b);
  const set = {};

  // Stalk: the lathed stalk swelling into its bulb, the bulb a slight,
  // earthier value step darker (one inked silhouette; it stays pale, so the
  // stalk reads as one pale mass under the cap).
  set.stalk = tintFaces(
    lathe(STALK, 9, { jitter: 0.12, seed: 121 }),
    (n, c) => c.y < 0.11,
    0.95
  );
  // Stalk detail (stalk tone): a ragged veil ring hanging under the cap and
  // a torn volva cup hugging the bulb.
  set.stalkd = bakeParts('rotcap:stalkd', () => {
    const out = [];
    const RING = 11;
    for (let i = 0; i < RING; i++) {
      const phi = ((i + 0.3 * hash01(i, 3, 1)) / RING) * Math.PI * 2;
      const r = stalkR(CAP_Y - 0.02) - 0.004;
      P.set(r * Math.sin(phi), CAP_Y - 0.015, r * Math.cos(phi));
      const out1 = H.set(Math.sin(phi), 0, Math.cos(phi));
      // hangs down and out, its flat facing outward
      const down = new Vector3().copy(out1).multiplyScalar(0.5).add(new Vector3(0, -1, 0));
      basis(down, out1, X, Y, Z);
      const len = 0.04 + 0.025 * hash01(i, 5, 2);
      setTRS(m, P, X, Y, Z, 0.085, len, 0.05);
      out.push({ geo: wedge, m: m.clone(), tone: i % 2 ? 0.96 : 1.06 });
    }
    const CUP = 7;
    for (let i = 0; i < CUP; i++) {
      const phi = ((i + 0.35 * hash01(i, 7, 3)) / CUP) * Math.PI * 2;
      const r = stalkR(0.034) + 0.002;
      P.set(r * Math.sin(phi), 0.034, r * Math.cos(phi));
      const o = new Vector3(Math.sin(phi), 0, Math.cos(phi));
      // up the bulb's flank, lying on it (over its widest ring)
      const up = new Vector3().copy(o).multiplyScalar(0.22 + 0.06 * hash01(i, 9, 4)).add(new Vector3(0, 1, 0));
      out.push({ geo: wedge, m: at(P, up, o, 0.1, 0.06 + 0.016 * hash01(i, 11, 5), 0.05), tone: 0.9 + 0.06 * (i % 2) });
    }
    return out;
  });
  // Cap: the lathed dome with a short rim lip turning under, its underside
  // (the gills' backing) carrying the gill tone. The rim stays round (a
  // faint six-lobe ripple, under 2% of its radius) and level.
  const capProfile = [];
  for (const u of [0, 0.2, 0.38, 0.55, 0.7, 0.83, 0.93]) {
    const a = (u * Math.PI) / 2;
    capProfile.push([CAP_R * Math.sin(a), CAP_H * Math.cos(a)]);
  }
  capProfile.push([0.353, 0.004], [0.343, -0.009], [0.29, -0.013], [0.2, -0.005], [0.12, 0.02], [0, 0.04]);
  capProfile.reverse(); // a lathe faces outward when its profile climbs
  set.cap = tintFaces(
    lathe(capProfile, 14, {
      jitter: 0.12,
      seed: 123,
      warp(v) {
        const r = Math.hypot(v.x, v.z);
        if (r < 0.29 || v.y > 0.09) return;
        const w = Math.min(1, (r - 0.29) / 0.05);
        const f = Math.cos(6 * Math.atan2(v.x, v.z));
        const k = 1 + 0.018 * w * f;
        v.x *= k;
        v.z *= k;
        v.y -= 0.004 * w * (0.5 + 0.5 * f);
      },
    }),
    (n) => n.y < -0.2,
    gill.r,
    gill.g,
    gill.b
  );
  // The indigo spots: the classic's five, where they sat on its cap, plus
  // three small dim ones (raised warty domes, bright and dim in one call).
  const SPOTS = [
    [0.12, 0.1, 0.05, 1],
    [-0.15, 0.04, 0.048, 1],
    [0.02, -0.12, 0.052, 1],
    [-0.05, 0.2, 0.044, 1],
    [0.2, -0.08, 0.046, 1],
    [-0.2, -0.13, 0.032, 0],
    [0.24, 0.13, 0.03, 0],
    [-0.08, -0.25, 0.028, 0],
  ].map(([x, z, r, bright]) => ({ phi: Math.atan2(x, z), a: Math.asin(Math.min(0.95, Math.hypot(x, z) / CAP_R)), r, bright }));
  const spotPts = SPOTS.map((s) => capPt(s.phi, s.a, 0, new Vector3(), new Vector3()));
  set.spots = bakeParts('rotcap:spots', () => {
    const out = [];
    const ico = fz(new IcosahedronGeometry(1, 0), 0.1, 125);
    const bright = new Color(TELL_INDIGO);
    const dim = new Color(TELL_INDIGO_DIM);
    for (const s of SPOTS) {
      capPt(s.phi, s.a, -0.28 * s.r, P, N);
      out.push({ geo: ico, m: at(P, N, new Vector3(0, 0, 1), s.r, 0.6 * s.r, s.r), tint: s.bright ? bright : dim });
    }
    return out;
  });
  // Cap detail (cap tone): low six-sided crown scales half sunk in the dome
  // (as the boar's hide plates, a value step above the cap, their trailing
  // edge just lifting), flat warts between the spots (none breaks the cap's
  // outline), and the gill blades fringing the underside (gill tone), long
  // and short in turn.
  const clear = (p, d) => spotPts.every((q) => q.distanceTo(p) > d);
  set.capd = bakeParts('rotcap:capd', () => {
    const out = [];
    // scales: golden-angle placement on the upper dome, clear of the spots
    let placed = 0;
    for (let i = 0; i < 40 && placed < 7; i++) {
      const phi = i * 2.39996 + 0.4;
      const a = 0.32 + 0.62 * ((i * 0.618) % 1);
      capPt(phi, a, -0.012, P, N);
      if (!clear(P, 0.085)) continue;
      basis(N, new Vector3(Math.sin(phi), -1, Math.cos(phi)), X, Y, Z); // Z down the slope
      tip(X, Y, Z, -0.12);
      const w = 0.085 + 0.02 * hash01(i, 13, 6);
      setTRS(m, P, X, Y, Z, w, 0.024, w * 0.9);
      out.push({ geo: scale, m: m.clone(), tone: placed % 2 ? 1.05 : 1.1 });
      placed++;
    }
    let warts = 0;
    for (let i = 0; i < 60 && warts < 10; i++) {
      const phi = i * 2.39996 + 1.9;
      const a = 0.18 + 0.95 * ((i * 0.381) % 1);
      capPt(phi, a, -0.004, P, N);
      if (!clear(P, 0.065)) continue;
      const s = 0.026 + 0.012 * hash01(i, 15, 7);
      out.push({ geo: wart, m: at(P, N, new Vector3(0, 0, 1), s, s * 0.45, s), tone: 1.15 });
      warts++;
    }
    const GILLS = 22;
    for (let i = 0; i < GILLS; i++) {
      const phi = ((i + 0.5) / GILLS) * Math.PI * 2;
      const long = i % 2 === 0;
      // each blade is deepest at the rim (where the camera sees it) and runs
      // in under the cap, tapering toward the stalk
      const r0 = 0.31;
      const y0 = -0.034;
      const r1 = long ? 0.13 : 0.21;
      const y1 = (long ? 0.006 : -0.014) - 0.002;
      const o = new Vector3(Math.sin(phi), 0, Math.cos(phi));
      P.set(r0 * o.x, y0, r0 * o.z);
      const dir = new Vector3((r1 - r0) * o.x, y1 - y0, (r1 - r0) * o.z);
      const len = dir.length();
      // Y in along the underside, X hanging down (the blade's depth), Z round
      // the cap (its thinness)
      basis(dir, new Vector3(-o.z, 0, o.x), X, Y, Z);
      setTRS(m, P, X, Y, Z, long ? 0.045 : 0.038, len, 0.035);
      out.push({ geo: wedge, m: m.clone(), tint: gill, tone: 0.92 + 0.12 * hash01(i, 17, 8) });
    }
    return out;
  });
  // Eyes: the classic's angular charcoal slits on the stalk under the brim
  // (low enough that the Journal's camera sees them under the rim), with an
  // angry brow notch over each (unlit, never round, never warm).
  set.eyes = bakeParts('rotcap:eyes', () => {
    const out = [];
    const bar = fz(new BoxGeometry(0.078, 0.024, 0.022), 0, 1);
    const brow = fz(new BoxGeometry(0.06, 0.014, 0.018), 0, 1);
    for (const side of [-1, 1]) {
      const zr = Math.sqrt(Math.max(0, stalkR(0.23) ** 2 - 0.07 * 0.07)) + 0.006;
      out.push({ geo: bar, m: new Matrix4().compose(new Vector3(side * 0.07, 0.23, zr), new Quaternion().setFromEuler(new Euler(0, side * -0.3, side * 0.35)), new Vector3(1, 1, 1)) });
      const zb = Math.sqrt(Math.max(0, stalkR(0.268) ** 2 - 0.06 * 0.06)) + 0.006;
      out.push({ geo: brow, m: new Matrix4().compose(new Vector3(side * 0.06, 0.268, zb), new Quaternion().setFromEuler(new Euler(0, side * -0.3, side * -0.45)), new Vector3(1, 1, 1)) });
    }
    return out;
  });
  // A root piece: a faceted four-sided tapered unit segment (y 0..1, radius 1
  // at its base, 0.75 at its end). The feet are built of it every frame: a
  // root leg out of the bulb, a flat nub on the floor, three root toes.
  set.root = fz(new CylinderGeometry(0.75, 1, 1, 4).translate(0, 0.5, 0), 0.12, 127);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Foot homes (yaw-space floor, tucked under the bulb), the root legs' hips
// (body space, inside the bulb), the body pivot.
const HOMES = [new Vector3(-0.08, 0, 0.04), new Vector3(0.08, 0, 0.04)];
const HIPS = [new Vector3(-0.06, 0.075, 0.02), new Vector3(0.06, 0.075, 0.02)];
const ROOT_PARTS = 5; // per foot: the leg, the nub, three toes
const ROOT_L = 0.17; // a root leg reaches 2 x this (clampReach's two halves)
const LIFT = 0.04;
// The shamble. Walking, a waddle phase drives the steps (gait.release): one
// step a side per roll, the roll at waddleHz (1.65 Hz at the sim's 1.1 u/s,
// 1.9 at the retreat's 1.54; the classic sways at 1.43), each foot SWING of
// the cycle in the air, landing `lead` swing-lengths ahead along the travel
// (0.7: a planted foot rolls from as far ahead of its home to as far
// behind). Standing, a foot REST_STEP off its home (a turn, the lunge's step
// back) steps on its own. The planner's own trigger and reach stay wide: the
// backstop for a body that outruns the phase (a knockback).
const GAIT = Object.freeze({ trigger: 0.6, reach: 0.34, durMin: 0.12, durMax: 0.17, lead: 0.7 });
const SWING = 0.42;
const REST_STEP = 0.085;
const REST_DUR = 0.15;
const WALK_ON = 0.2; // u/s
const WALK_OFF = 0.12;
const CATCH_UP = 0.27; // a planted foot this far off its home while walking steps at once
const ROCK = 0.075; // rad: the roll onto the planted foot at the sim's walk
const BOB = 0.022; // u
const waddleHz = (v) => Math.min(2.8, 1 + (0.65 * v) / RUN_SPEED);
// The lunge step: from its arming (the fresh strike, or a predicted one's
// pull-back) to its settle, the lead foot stands 0.16 u in (a touch out to
// its side), the other 0.03 (the push-off).
const LUNGE_HOLD = 9.5 * FRAME;
const PIVOT = new Vector3(0, 0.12, 0);
const YAXIS = new Vector3(0, 1, 0);
const wrapAngle = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

export function buildRotcapFacet() {
  const G = geos();
  const F = createFoeFrame('rotcap');
  const { body, spawn, track } = F;
  const stalkMat = track(foeMaterial(HIDE.rotStalk));
  const capMat = track(foeMaterial(HIDE.rotCap));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const spotMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  body.add(foePart(G.stalk, stalkMat, 'full', 'rotcap-stalk'));
  body.add(foePart(G.stalkd, stalkMat, 'part', 'rotcap-stalk-detail'));
  body.add(foePart(G.eyes, eyeMat, false, 'rotcap-eyes'));
  const cap = new Group();
  cap.name = 'rotcap-cap';
  cap.position.set(0, CAP_Y, 0);
  cap.rotation.order = 'XZY'; // spin on its own axis, then tilt, then nod
  body.add(cap);
  cap.add(foePart(G.cap, capMat, 'full', 'rotcap-cap-dome'));
  cap.add(foePart(G.capd, capMat, 'part', 'rotcap-cap-detail'));
  cap.add(foePart(G.spots, spotMat, false, 'rotcap-spots'));
  const tellGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.7, opacity: 0.18 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  tellGlow.position.set(0, 0.3, 0);
  cap.add(tellGlow);

  // Feet: two root feet (a root leg out of the bulb, a flat nub, three root
  // toes each) on one instanced row, placed by the gait every frame; the
  // roots an earthier step darker than the nubs.
  const feet = instancedPart(G.root, stalkMat, 2 * ROOT_PARTS, { name: 'rotcap-feet', moving: true, inkPx: PART_INK_PX });
  const earth = new Color();
  for (let i = 0; i < 2 * ROOT_PARTS; i++) feet.setColorAt(i, earth.setScalar(i % ROOT_PARTS === 1 ? 0.95 : 0.8));
  feet.instanceColor.needsUpdate = true;
  spawn.add(feet);
  // The contact shadow belongs to the floor (the group, not the yaw).
  F.group.add(groundShadow(0.42, 0.8));

  // Named points (B8): the cap's front rim (the weapon), the stalk face under
  // the brim (the mouth), the crown, the gills, the burst's centre.
  const tipPt = namedPoint(cap, 'rotcap-tip', 0, 0.0, 0.36);
  const mouth = namedPoint(body, 'rotcap-mouth', 0, 0.21, 0.16);
  const crown = namedPoint(cap, 'rotcap-crown', 0, 0.25, 0);
  const gillsPt = namedPoint(cap, 'rotcap-gills', 0, -0.03, 0);
  const burstPt = namedPoint(cap, 'rotcap-burst', 0, 0.12, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: GAIT.trigger, reach: GAIT.reach, lift: LIFT, durMin: GAIT.durMin, durMax: GAIT.durMax, lead: GAIT.lead });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const chain = createChain({ hits: HITS, tls: HIT_TL, rest: REST, window: CHOMP_WINDOW, ease });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hw = { x: 0, z: 0 };
  const strike = { id: '', tick: 0 };
  const footP = new Vector3();
  const hipW = new Vector3();
  const ankle = new Vector3();
  const fdir = new Vector3();
  const tdir = new Vector3();
  const fa = new Vector3();
  const BX = new Vector3();
  const BY = new Vector3();
  const BZ = new Vector3();
  const m = new Matrix4();
  // each foot: where it stood last frame (world), whether it was in the air,
  // its heading (world yaw, held while it is planted), its error off its home
  // (u), where it is drawn (yaw space, after the reach clamp)
  const plantW = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
  const wasUp = [false, false];
  const footHead = [0, 0];
  const err = [0, 0];
  const drawn = [new Vector3(), new Vector3()];
  // a step released this frame (the lunge's wins over the shamble's), or the
  // last (its swing starts at height 0: it is in the air all the same)
  const sent = [false, false];
  const sentLast = [false, false];
  let age = -1;
  let lastBiteAt = -99;
  let seenContact = null;
  let walking = false;
  let wph = 0; // the waddle's phase (0..1): foot 0 lifts at 0, foot 1 at 0.5
  let rockAmp = 0;
  let lastOv = null;
  let armedFor = null; // the contact the lunge step was timed for
  let armLead = 0; // its lead foot (+1 its left, -1 its right), 0: none
  let standUntil = -99;
  let retreatK = 0;
  let retreatAt = -99;
  let wasRetreat = false;
  let yawNow = 0;

  // The model lab drives the abilities instead of the live events (pure in t).
  const lab = {
    abilities: ROTCAP_ABILITIES,
    override: null, // { id: 'chomp' | 'burst', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live strike's contact lands on
    feet: () => gait.feet().map((q, i) => ({ ...q, drawnX: drawn[i].x, drawnZ: drawn[i].z, drawnY: drawn[i].y, heading: footHead[i] })),
    pose: () => ({ ...cur, retreatK }),
    get hit() {
      return chain.current;
    },
    parts: { body, cap, feet },
  };

  // The lunge step (the planner's home shift): the armed strike's lead foot
  // 0.16 u in, the other 0.03.
  function stepShift(i, o) {
    if (!armLead) return o;
    const side = i === 0 ? -1 : 1;
    const w = armLead === side ? 1 : 0;
    o.z += 0.03 + 0.13 * w;
    o.x += 0.02 * side * w;
    return o;
  }
  // Time hit n's lead foot to plant by its contact (whatever the shamble has
  // in the air), and stand it in until the strike settles.
  function armLunge(contactAt, now, n) {
    if (armedFor !== null && Math.abs(armedFor - contactAt) < FRAME) return;
    armedFor = contactAt;
    armLead = HITS[n].strike.lead;
    standUntil = contactAt + LUNGE_HOLD;
    step(armLead > 0 ? 1 : 0, Math.max(2.5 * FRAME, Math.min(0.16, contactAt - now - FRAME)));
  }
  function step(i, dur) {
    sent[i] = true;
    gait.release(i, dur);
  }
  // The lab's combo arms the same steps, pure in its t (a still frame stands
  // the feet on the shifted homes; a playing one steps them).
  function labLunge(t, now, dt) {
    armLead = 0;
    for (let k = 0; k < 3; k++) {
      const c = CONTACTS[k];
      if (t < (k === 0 ? 0 : c - PULL_IN) || t >= c + LUNGE_HOLD) continue;
      if (dt > 0) armLunge(now + c - t, now, k);
      armLead = HITS[k].strike.lead;
    }
  }
  // The shamble's steps (before the planner's update): walking, the waddle
  // phase releases each foot in turn; standing, a foot off its home steps.
  function shamble(dt) {
    const v = gait.speed / fr.s;
    const c = Math.cos(fr.yaw);
    const s = Math.sin(fr.yaw);
    let flying = false;
    for (let i = 0; i < 2; i++) {
      err[i] = 0;
      if (gait.out[i].y > 1e-6 || sentLast[i]) {
        flying = true;
        continue;
      }
      hw.x = HOMES[i].x;
      hw.z = HOMES[i].z;
      stepShift(i, hw);
      const wx = fr.x + (c * hw.x + s * hw.z) * fr.s;
      const wz = fr.z + (-s * hw.x + c * hw.z) * fr.s;
      err[i] = Math.hypot(plantW[i].x - wx, plantW[i].z - wz) / fr.s;
    }
    const far = err[1] > err[0] ? 1 : 0;
    const hz = waddleHz(v);
    // a swing: SWING of the cycle, landing at most 0.22 u ahead (a shove)
    const swing = Math.min(SWING / hz, 0.22 / (GAIT.lead * Math.max(0.1, v)));
    if (walking ? v < WALK_OFF : v > WALK_ON) {
      walking = !walking;
      // setting off: the foot furthest off its home steps now, short, and
      // the other follows a quarter cycle on
      if (walking) {
        if (!flying && !sent[far]) step(far, Math.min(swing, 0.12));
        wph = 0.5 * far + 0.25;
        return;
      }
    }
    if (walking) {
      const before = Math.floor(wph * 2);
      wph += dt * hz;
      const after = Math.floor(wph * 2);
      if (after !== before) {
        const i = ((after % 2) + 2) % 2;
        if (gait.out[i].y <= 1e-6 && !sentLast[i] && !sent[i]) step(i, swing);
      } else if (!flying && !sent[far] && err[far] > CATCH_UP) {
        // the body outran the phase: that foot steps now, the phase re-syncs
        step(far, swing);
        wph = 0.5 * far;
      }
      wph -= Math.floor(wph);
    } else if (!flying && !sent[0] && !sent[1] && err[far] > REST_STEP) step(far, REST_DUR);
  }

  function pose(P) {
    const dt = clock.step(P);
    for (let i = 0; i < 2; i++) {
      sentLast[i] = sent[i];
      sent[i] = false;
    }
    const now = clock.now;
    const e = P.e || null;
    // the sim tick, held through a hitstop (never the raw saw-tooth)
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const tt = P.t ?? 0;
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    let sxz = spawnScale(age);
    let sy = sxz;

    // --- the combo: the lab's pure override, or the live bites
    let active;
    const ov = lab.override;
    if (ov && ov.id === 'burst') {
      const b = burstPose(ov.t, cur);
      sxz = b.sxz;
      sy = b.sy;
      active = true;
      armLead = 0;
    } else if (ov) {
      const h = ROTCAP_CHOMP.at(ov.t);
      rotcapHitPose(h.n, h.t, h.from, h.fresh, h.pull, cur);
      active = true;
      labLunge(ov.t, now, dt);
    } else {
      const beat = watch.update(P);
      if (beat && beat.type === 'bite') {
        chain.hit(now);
        lastBiteAt = now;
      }
      // the next bite is due when this target's cooldown lapses (the sim's
      // per-target clock), while the Rotcap stays pressed against it: not
      // while it moves off (its own last step), nor while the sim holds it (a
      // stun or a blind: no bite comes)
      const moving = e && Number.isFinite(e.px) ? Math.hypot(e.x - e.px, e.z - e.pz) > 0.01 : (P.moveK ?? 0) > 0.35;
      let due = null;
      if (e && e.cdByTarget && e.targetId != null && now - lastBiteAt < CHOMP_WINDOW && !moving && !heldBy(e, tick)) {
        const next = e.cdByTarget[e.targetId];
        // (a cooldown already lapsed says nothing: it is out of reach)
        if (next != null && next > tick) due = (next - tick) / 60;
      }
      // it walks off: a held wind-up recovers instead of riding along
      if (moving && (P.moveK ?? 0) > 0.5) chain.recover(now);
      active = chain.pose(now, cur, due);
      if (!active) Object.assign(cur, REST);
      // the lunge step: on a fresh strike at once, on a predicted one as its
      // pull-back begins
      const c = chain.contactAt;
      if (active && c !== null && c > now) armLunge(c, now, chain.current);
      else if (active && due !== null && due <= PULL_IN) armLunge(now + due, now, (chain.current + 1) % 3);
      if (!active) armedFor = null;
      if (!active || now >= standUntil) armLead = 0;
      // a new strike (on the bite, or started early on the predicted bite):
      // the tick its contact lands, for the probe (a recover moves the
      // chain's clock back: its contactAt is then in the past, no strike)
      if (c !== null && c !== seenContact && c >= now - 1e-6) {
        seenContact = c;
        strike.id = `chomp:${chain.current + 1}`;
        strike.tick = tick + (c - now) * 60;
        lab.lastStrike = strike;
      }
    }
    spawn.scale.set(sxz, sy, sxz);

    // --- the retreat: a startled shiver, then the cap tucked down
    const retreating = !ov && !!e && e.mode === 'retreat';
    if (retreating && !wasRetreat) retreatAt = now;
    wasRetreat = retreating;
    retreatK += ((retreating ? 1 : 0) - retreatK) * (1 - Math.exp(-8 * dt));
    const startle = now - retreatAt < 0.3 ? Math.sin((now - retreatAt) * 70) * (1 - (now - retreatAt) / 0.3) : 0;

    // --- feet: locked to the floor, stepped by the shamble
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    // a lab scrub (no time passing) stands the feet on their homes: a still
    // frame has no step history to show; so does a switch into or out of a
    // lab ability (a cut)
    const burstHidden = ov && ov.id === 'burst' && sy < 0.5;
    const ovKey = ov ? ov.id : null;
    const cut = ovKey !== lastOv;
    lastOv = ovKey;
    const locked = !turntable && age >= SPAWN_SEC && !burstHidden && !(dt <= 0 && ov) && !cut;
    if (locked && dt > 0) shamble(dt);
    if (!locked) walking = false;
    gait.update(dt, fr, { locked, shift: stepShift });
    gait.localVelocity(fr, lv);
    const v = gait.speed / fr.s;
    const fwd = Math.max(-1, Math.min(1, lv.z / RUN_SPEED));
    const side = Math.max(-1, Math.min(1, lv.x / RUN_SPEED));
    // the shamble's roll onto the planted foot, on the waddle's phase (the
    // foot in the air at its peak), its size with the travel; standing, an
    // odd step rocks the body a little on its own
    const want = walking ? ROCK * Math.min(1.25, v / RUN_SPEED) : 0;
    rockAmp = (dt <= 0 && ov) || cut ? 0 : rockAmp + (want - rockAmp) * (1 - Math.exp(-6 * Math.max(0, dt)));
    const hR = Math.min(1, gait.out[0].y / LIFT);
    const hL = Math.min(1, gait.out[1].y / LIFT);
    const restK = Math.max(0, 1 - rockAmp / (0.5 * ROCK));
    const rock = rockAmp * Math.sin(2 * Math.PI * (wph + 0.25 - SWING / 2)) + restK * 0.05 * (hR - hL);
    const bob = gait.bob;
    const bobU = BOB * bob * (0.35 + 0.65 * Math.min(1.2, rockAmp / ROCK));

    // --- the body: the attack's pose, the shamble's roll and bob, the lean
    // along the travel (a walk leans in, a backpedal leans back), a breath
    const breath = Math.sin(tt * 2.6);
    const idle = active ? 0 : 1;
    const bank = cur.bank + rock + 0.06 * side + idle * 0.02 * Math.sin(tt * 1.3);
    body.rotation.set(cur.pitch + 0.08 * fwd + 0.1 * retreatK, cur.twist, -bank);
    body.scale.set(cur.sx, cur.sy * (1 + 0.01 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.hop + bobU);
    // the bulb never sinks into the floor: a lean that would dip its rim
    // rocks the body up on that edge instead
    body.updateMatrix();
    const el = body.matrix.elements;
    const spread = Math.sqrt(el[1] * el[1] + el[9] * el[9]);
    let low = Infinity;
    for (const [y, r] of BASE_RINGS) low = Math.min(low, el[5] * y + el[13] - r * spread);
    if (low < FLOOR_CLEAR) {
      body.position.y += FLOOR_CLEAR - low;
      body.updateMatrix();
    }

    // the cap: the attack's nod, tilt and spin, the retreat's tuck, a lag on
    // the steps, the classic's breath (+-5% at 2.6 rad/s) on top of the swell
    cap.rotation.set(cur.cp + 0.24 * retreatK + idle * 0.03 * Math.sin(tt * 1.7) - 0.03 * bob, cur.cy, -(cur.ctilt + 0.06 * startle - 0.4 * rock));
    cap.scale.setScalar(cur.cs * (1 + 0.05 * breath));
    tellGlow.material.opacity = 0.14 + 0.06 * breath;

    // --- feet: each nub where the gait put it, toes turned out, the toe
    // tipping up while it swings; its root leg reaches out of the bulb to it.
    // A planted foot keeps the heading it landed with (world-locked, toes
    // and all); one in the air turns to the body's.
    const cy = Math.cos(yawNow);
    const sn = Math.sin(yawNow);
    for (let i = 0; i < 2; i++) {
      const o = gait.out[i];
      const k = i * ROOT_PARTS;
      const up = o.y > 1e-6;
      const wx = fr.x + (cy * o.x + sn * o.z) * fr.s;
      const wz = fr.z + (-sn * o.x + cy * o.z) * fr.s;
      if (!locked) footHead[i] = yawNow;
      else if (up) footHead[i] += wrapAngle(yawNow - footHead[i]) * (dt > 0 ? 1 - Math.exp(-18 * dt) : 1);
      // (a planted foot the planner stood afresh: a blink, a scrub)
      else if (!wasUp[i] && Math.hypot(wx - plantW[i].x, wz - plantW[i].z) > 1e-3) footHead[i] = yawNow;
      // a step the shamble did not send (the planner's reach, the root's
      // reach clamp): the waddle's phase follows it
      if (walking && up && !wasUp[i] && !sentLast[i] && !sent[i]) wph = 0.5 * i;
      wasUp[i] = up;
      plantW[i].x = wx;
      plantW[i].z = wz;
      const h = Math.min(1, o.y / LIFT);
      const turn = (i === 0 ? -0.28 : 0.28) + wrapAngle(footHead[i] - yawNow);
      const tilt = 0.45 * h;
      fdir.set(Math.sin(turn) * Math.cos(tilt), Math.sin(tilt), Math.cos(turn) * Math.cos(tilt));
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      ankle.set(o.x, o.y + 0.03, o.z);
      // a planted foot drawn past the root's reach (a fast turn, a shove) is
      // pulled in along the floor and steps, quick and short: no stretched
      // root (one in the air is only drawn in)
      if (clampReach(hipW, ankle, ROOT_L, ROOT_L) > 1e-4 && locked && !up && !sent[i] && !sentLast[i]) step(i, Math.min(0.12, 0.22 / (GAIT.lead * Math.max(0.1, v))));
      footP.set(ankle.x, ankle.y - 0.03, ankle.z);
      drawn[i].copy(footP);
      feet.setMatrixAt(k, segmentMatrix(m, hipW, ankle, 0.04, 0.04, 0.015));
      // the nub: a flat lozenge along the foot (heel wide, toe narrower)
      basis(fdir, YAXIS, BX, BY, BZ);
      fa.copy(footP).addScaledVector(BY, -0.065);
      fa.y += 0.033;
      feet.setMatrixAt(k + 1, setTRS(m, fa, BX, BY, BZ, 0.055, 0.13, 0.034));
      // three root toes splaying from its front onto the floor
      for (let j = 0; j < 3; j++) {
        const a = turn + (j - 1) * 0.55;
        const dn = tilt - 0.12;
        tdir.set(Math.sin(a) * Math.cos(dn), Math.sin(dn), Math.cos(a) * Math.cos(dn));
        basis(tdir, YAXIS, BX, BY, BZ);
        fa.copy(footP).addScaledVector(fdir, 0.04);
        fa.y += 0.014;
        feet.setMatrixAt(k + 2 + j, setTRS(m, fa, BX, BY, BZ, 0.02, j === 1 ? 0.06 : 0.05, 0.014));
      }
    }
    feet.instanceMatrix.needsUpdate = true;
  }

  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    // the moving rig (spawn > body, the feet) under the yaw: the shared hit
    // envelope wraps it; the shadow stays on the group, on the floor
    body: F.yaw,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand: tipPt, mouth, crown, gills: gillsPt, burst: burstPt },
    // The shared hit envelope's tuning (§6.1 item 9): a soft, spongy toadstool
    // takes a touch more squash and a lighter flinch and shove; it squashes
    // along its upright stalk, bulging at the stalk and cap joint.
    react: { squash: 1.1, flinch: 0.8, knock: 0.8, axis: 'y', midY: 0.38 },
    // §6.1 item 10: the cap swells hard before it bursts (the burst's centre
    // sits in the cap, y 0.45 to 0.55); no throw, so the pop stays over the
    // burst ring the corpse leaves.
    death: { swell: 1.5, throw: 0 },
  };
}
