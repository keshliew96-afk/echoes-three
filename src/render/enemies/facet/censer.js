// HEART CENSER, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic censer of enemies/heart.js (a floating bone censer on a chain
// that hangs from nothing, violet coals inside its rib cage, a rose-violet
// halo round it; it gathers, the coals flaring and the chain swinging wild,
// then mends its kin) with the sample video's technique laid ON TOP of its
// chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     bone bowl cut into planes with its rim of dark flesh, the rib cage over
//     the coals meeting at a knob, the drip spike under it, three bone
//     pendants hung off the rim, the chain of alternating links on its own
//     hull; the coals unlit and driven, the rose halo;
//   * a PENDULUM'S LEAN from the real travel (rule 1, a legless form): the
//     pot trails behind an advance, swings ahead on a backpedal and out on
//     a strafe, on top of its lazy drift; the shadow stays on the floor;
//   * the GATHER on the sim's 48-tick gather (sim/enemies/censer.js, mode
//     'gather' until `gatherUntil`; render/facet/foestrike.js on beats the
//     rig makes from that mode). The gather is the coil: the coals flare,
//     the halo widens and brightens, the pot spins up and the chain swings
//     wild. The last 2.5 frames are the flare, sampled on the shown sim
//     tick, so the MEND lands on the tick the sim mends (confirmed by
//     `mendTick`): the halo bursts wide and the pot dips, held 3 frames,
//     then the halo blinks dark and the pot settles into its drift (B5). A
//     stun that spills the gather is a cancel: the coals gutter, the pot
//     drops and swings, and everything eases back to rest;
//   * the spawn-in grow (B7), named points (B8: the coals, the halo, the
//     chain's top), and the hit and death tuning.
//
// Faces +Z. Same contract as buildCenser (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing untouched.
import { ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry } from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { createTimeline } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { HEART } from '../style.js';
import { M, TINT, clamp1, heartGlow, qa, rodM, veinColor, veinMat } from './heartfoe.js';

// The sim's censer (sim/enemies/censer.js S): 2.0 u/s, a flier; gathers
// for 48 ticks, then mends.
const TICK_HZ = 60;
const DRIFT_SPEED = 2.0;
export const GATHER_TICKS = 48;
export const GATHER_SEC = GATHER_TICKS / TICK_HZ;
// The classic's heights: the chain hangs from nothing at CHAIN_TOP, the pot
// at CENSER_Y.
export const CHAIN_TOP = 2.35;
export const CENSER_Y = 1.25;
const SNAP = 3 / 30;
const SETTLE = 10 / 30;

// --- Key poses. coal: the coals' heat (0..1, the tell); halo: the halo's
// size; haloA: its opacity; spin: the pot's spin (rad/s); amp: the chain's
// swing (0..1 of its wild gather swing); drop: the pot lowered (u, + down);
// sx / sy: the pot's squash.
const REST = Object.freeze({ coal: 0, halo: 1, haloA: 0.6, spin: 0.5, amp: 0.3, drop: 0, sx: 1, sy: 1 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// The gather's coil: the coals flare, the halo widens and brightens, the pot
// spins up and rises a touch; the flare: the halo bursts, the pot dips; the
// overshoot: the halo blinks dark, the pot a touch tall.
const GATHER = Object.freeze({
  label: 'the mend',
  coil: K({ coal: 1, halo: 1.45, haloA: 0.92, spin: 3.0, amp: 1, drop: -0.05, sx: 0.96, sy: 1.04 }),
  strike: K({ coal: 1, halo: 1.85, haloA: 1, spin: 4.0, amp: 0.6, drop: 0.07, sx: 1.14, sy: 0.9 }),
  over: K({ coal: 0.55, halo: 1.25, haloA: 0.15, spin: 2.0, amp: 0.45, drop: -0.02, sx: 0.98, sy: 1.03 }),
});
const GATHER_TL = strikeTimeline('gather', 'Gather and mend', {
  tel: GATHER_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.35,
  labels: { coil: 'the gather: coals flare, the halo widens, the chain swings', strike: 'the flare', hold: 'the mend: the halo bursts', snap: 'the halo blinks dark', settle: 'settle into the drift' },
});
const GATHER_CONTACT = GATHER_TL.startOf('hold');
export function censerGatherPose(t, out = { ...REST }) {
  return strikePoseAt(GATHER_TL, GATHER, REST, FIELDS, t, out);
}
export const CENSER_GATHER = Object.freeze({ ...strikeAbility({ id: 'gather', label: 'Gather and mend', tl: GATHER_TL, variants: [GATHER] }), cues: [{ at: 0, id: 'gather' }, { at: GATHER_CONTACT, id: 'strike' }] });
// The spill: a gather cut by a stun at 0.4 s, the coals guttering, the pot
// dropping and swinging, then easing back to rest (pure in t).
const SPILL_AT = 0.4;
const SPILL_TL = createTimeline('spill', 'Spill (a stun in the gather)', [
  { id: 'coil', label: 'the gather', dur: SPILL_AT },
  { id: 'spill', label: 'spilled: the coals gutter, the pot drops', dur: 4 / 30 },
  { id: 'settle', label: 'ease back to rest', dur: 0.45 },
  { id: 'rest', label: 'rest', dur: 0.2 },
], { cues: [{ at: 0, id: 'gather' }, { at: SPILL_AT, id: 'spill' }] });
const SPILLED = K({ coal: -0.6, halo: 0.7, haloA: 0.2, spin: 0.2, amp: 1, drop: 0.14, sx: 1.08, sy: 0.94 });
export function censerSpillPose(t, out = { ...REST }) {
  const s = SPILL_TL.sample(t);
  if (s.id === 'coil') return censerGatherPose(t, out);
  const from = censerGatherPose(SPILL_AT, { ...REST });
  if (s.id === 'spill') {
    const k = 1 - (1 - s.k) * (1 - s.k);
    for (const f of FIELDS) out[f] = from[f] + (SPILLED[f] - from[f]) * k;
    return out;
  }
  if (s.id === 'settle') {
    const k = s.k * s.k * (3 - 2 * s.k);
    for (const f of FIELDS) out[f] = SPILLED[f] + (REST[f] - SPILLED[f]) * k;
    return out;
  }
  return Object.assign(out, REST);
}
export const CENSER_SPILL = Object.freeze({
  id: 'spill',
  label: 'Spill',
  duration: SPILL_TL.duration,
  sample: (t) => SPILL_TL.sample(t),
  readout: (t) => SPILL_TL.readout(t),
  cues: SPILL_TL.cues,
});
export const CENSER_ABILITIES = Object.freeze({ gather: CENSER_GATHER, spill: CENSER_SPILL });

// --- Geometry (built once for the session, shared by every censer) ---------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const TWO_PI = Math.PI * 2;
const POT_S = 1.35;
const CHAIN_LEN = CHAIN_TOP - CENSER_Y - 0.36;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  const rod = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  // The chain (about the pivot, hanging -y): alternating links.
  set.chain = bakeParts('censer:chain', () => {
    const out = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      out.push({ geo: fz(new TorusGeometry(0.05, 0.013, 4, 8), 0.06, 1701 + i), m: M(0, -(i + 0.5) * (CHAIN_LEN / n), 0, 1, 1.5, 1, qa(0, 1, 0, i % 2 ? Math.PI / 2 : 0)), tint: TINT.fleshDark, tone: 0.9 + 0.15 * (i % 2) });
    }
    return out;
  });
  // The pot (at the classic's size): the bone bowl, the rim, the rib cage,
  // its knob, the drip spike, the pendants.
  set.pot = bakeParts('censer:pot', () => {
    const s = POT_S;
    const out = [
      { geo: fz(new SphereGeometry(0.21, 7, 4, 0, TWO_PI, Math.PI / 2, Math.PI / 2), 0.1, 1711), m: M(0, 0, 0, s, s * 0.9, s), tint: TINT.bone },
      { geo: fz(new TorusGeometry(0.21, 0.025, 4, 12), 0.08, 1713), m: M(0, 0, 0, s, s, s, qa(1, 0, 0, Math.PI / 2)), tint: TINT.fleshDark },
      { geo: fz(new ConeGeometry(0.05, 0.12, 5), 0.1, 1715), m: M(0, 0.3 * s, 0, s, s, s), tint: TINT.bone },
      { geo: fz(new ConeGeometry(0.04, 0.16, 4), 0.1, 1717), m: M(0, -0.26 * s, 0, s, s, s, qa(1, 0, 0, Math.PI)), tint: TINT.bone, tone: 0.9 },
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TWO_PI;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      out.push({ geo: rod, m: rodM([c * 0.2 * s, 0, sn * 0.2 * s], [c * 0.17 * s, 0.13 * s, sn * 0.17 * s], 0.016 * s), tint: TINT.bone });
      out.push({ geo: rod, m: rodM([c * 0.17 * s, 0.13 * s, sn * 0.17 * s], [c * 0.04 * s, 0.26 * s, sn * 0.04 * s], 0.014 * s), tint: TINT.bone });
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TWO_PI + 0.5;
      out.push({ geo: rod, m: rodM([Math.cos(a) * 0.22 * s, -0.01, Math.sin(a) * 0.22 * s], [Math.cos(a) * 0.24 * s, -0.09 * s, Math.sin(a) * 0.24 * s], 0.008), tint: TINT.fleshDark });
      out.push({ geo: fz(new ConeGeometry(0.03, 0.08, 4), 0.1, 1721 + i), m: M(Math.cos(a) * 0.24 * s, -0.13 * s, Math.sin(a) * 0.24 * s, s, s, s, qa(1, 0, 0, Math.PI)), tint: TINT.bone, tone: 0.92 });
    }
    return out;
  });
  // The coals (unlit, driven).
  set.coals = bakeParts('censer:coals', () => [
    { geo: fz(new IcosahedronGeometry(0.075, 0), 0.1, 1731), m: M(0.04 * POT_S, 0.03 * POT_S, 0, POT_S, POT_S, POT_S) },
    { geo: fz(new IcosahedronGeometry(0.06, 0), 0.1, 1733), m: M(-0.06 * POT_S, 0.02 * POT_S, 0.03 * POT_S, POT_S, POT_S, POT_S) },
    { geo: fz(new IcosahedronGeometry(0.055, 0), 0.1, 1735), m: M(0, 0.06 * POT_S, -0.05 * POT_S, POT_S, POT_S, POT_S) },
  ]);
  set.halo = new TorusGeometry(0.38, 0.014, 3, 36);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

export function buildCenserFacet() {
  const G = geos();
  const F = createFoeFrame('censer');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const coals = veinMat(HEART.veinHot);
  // the pendulum's pivot is the body node, hung at the chain's top
  body.add(foePart(G.chain, mat, 'part', 'censer-chain'));
  const pot = new Group();
  pot.name = 'censer-pot';
  pot.position.y = -(CHAIN_TOP - CENSER_Y);
  body.add(pot);
  pot.add(foePart(G.pot, mat, 'full', 'censer-bowl'));
  const coalMesh = new Mesh(G.coals, coals);
  coalMesh.name = 'censer-coals';
  pot.add(coalMesh);
  const glow = heartGlow(0.8, 0.4);
  glow.name = 'censer-coal-glow';
  glow.position.y = 0.1;
  pot.add(glow);
  const haloMat = new MeshBasicMaterial({ color: HEART.rose.clone(), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
  const haloTilt = new Group();
  haloTilt.rotation.x = Math.PI / 2 - 0.5;
  haloTilt.position.y = 0.12;
  pot.add(haloTilt);
  const halo = new Mesh(G.halo, haloMat);
  halo.name = 'censer-halo';
  haloTilt.add(halo);
  const shadow = groundShadow(0.26, 0.5);
  F.group.add(shadow);

  // Named points (B8): the coals, the halo, the chain's top.
  const coalPt = namedPoint(pot, 'censer-coals-point', 0, 0.06, 0);
  const haloPt = namedPoint(pot, 'censer-halo-point', 0, 0.12, 0);
  const top = namedPoint(body, 'censer-chain-top', 0, 0, 0);

  const clock = createFoeClock();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const cur = { ...REST };
  let age = -1;
  let yawNow = 0;
  let lastX = null;
  let lastZ = 0;
  let vx = 0;
  let vz = 0;
  let swingX = 0;
  let swingZ = 0;
  let spinA = 0;
  let gathering = false;
  let telStart = 0;
  let telEnd = 0;
  let lastMend = null;
  let spillK = 0;
  let leanW = 1;
  const tel = { startTick: 0, resolveTick: 0 };

  const lab = {
    abilities: CENSER_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => [],
    pose: () => ({ ...cur, spill: spillK }),
    get hit() {
      return clip.state === 'rest' ? -1 : 0;
    },
    parts: { body, pot, coals: coalMesh, halo, glow },
  };

  // The beats the sim's gather makes (it has no telegraph object): a wind
  // when the mode becomes 'gather' (its window ending on gatherUntil), a
  // release when it ends on a mend (a new mendTick, or on time), a cancel
  // when it ends early (a stun spilled it).
  function gatherBeat(e, tick) {
    let fired = false;
    if (e) {
      const mt = Number.isFinite(e.mendTick) ? e.mendTick : -1;
      if (lastMend === null) lastMend = mt;
      else if (mt !== lastMend) {
        fired = mt >= 0;
        lastMend = mt;
      }
    }
    const now = !!(e && e.mode === 'gather');
    let beat = null;
    if (now && !gathering) {
      telEnd = Number.isFinite(e.gatherUntil) ? e.gatherUntil : tick + GATHER_TICKS;
      telStart = telEnd - GATHER_TICKS;
      tel.startTick = telStart;
      tel.resolveTick = telEnd;
      beat = { type: 'wind', kind: 'gather', span: GATHER_SEC };
    } else if (!now && gathering) {
      const onTime = fired || tick >= telEnd - 1.01;
      beat = { type: onTime ? 'release' : 'cancel', kind: 'gather' };
      if (!onTime) spillK = 1;
    }
    gathering = now;
    return { beat, fired };
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

    // --- the gather: the lab's pure override, or the sim's mode
    if (lab.override) {
      if (lab.override.id === 'spill') censerSpillPose(lab.override.t, cur);
      else censerGatherPose(CENSER_GATHER.at(lab.override.t).t, cur);
      spillK = 0;
      gathering = false;
      clip.reset();
    } else {
      const { beat, fired } = gatherBeat(e, tick);
      clip.update({ beat, tel, now, tick, fired, pick: () => GATHER, name: () => 'mend', out: cur });
      lab.lastStrike = clip.lastStrike;
      // a spill: the coals gutter and the pot drops on top of the abort's ease
      spillK = Math.max(0, spillK - dt / 0.45);
      if (spillK > 0) {
        const k = spillK * spillK;
        cur.coal -= 0.6 * k;
        cur.drop += 0.14 * k;
        cur.amp += 0.7 * k;
        cur.haloA *= 1 - 0.6 * k;
      }
    }

    // --- the travel, measured off the layer's own position: the pendulum
    // trails behind it (rule 1), on top of its lazy drift and the gather's
    // wild swing
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null) {
      lastX = gx;
      lastZ = gz;
    }
    if (dt > 0) {
      let ix = (gx - lastX) / dt;
      let iz = (gz - lastZ) / dt;
      if (ix * ix + iz * iz > 400) ix = iz = 0;
      const a = 1 - Math.exp(-10 * dt);
      vx += (ix - vx) * a;
      vz += (iz - vz) * a;
    }
    lastX = gx;
    lastZ = gz;
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 8);
    let fwd = 0;
    let side = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      fwd = clamp1((vx * sy + vz * cy) / DRIFT_SPEED);
      side = clamp1((vx * cy - vz * sy) / DRIFT_SPEED);
    }
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const ph = id * 1.7;
    const amp = 0.07 + 0.16 * cur.amp;
    const sp = 1.4 + 2.6 * cur.amp;
    const tx = 0.28 * fwd * leanW + amp * Math.sin(tt * sp + ph);
    const tz = -0.26 * side * leanW + amp * 0.7 * Math.sin(tt * sp * 0.77 + ph + 1);
    const k5 = 1 - Math.exp(-5 * dt);
    swingX += (tx - swingX) * k5;
    swingZ += (tz - swingZ) * k5;
    body.rotation.set(swingX, 0, swingZ);
    // the pivot rides the spawn node: a censer grows in where it hangs (and
    // the hit layer, measuring it on its first frame, finds it floating)
    spawn.position.y = CHAIN_TOP;
    body.position.set(0, 0.06 * Math.sin(tt * 1.8 + ph), 0);

    // --- the pot: its spin, its dip, its squash; the coals' heat; the halo
    spinA += dt * cur.spin;
    pot.rotation.y = spinA;
    pot.position.y = -(CHAIN_TOP - CENSER_Y) - cur.drop;
    pot.scale.set(cur.sx, cur.sy, cur.sx);
    const heat = Math.min(1, Math.max(0, 0.5 + 0.1 * Math.sin(tt * 2.5 + ph) + 0.5 * cur.coal * (0.8 + 0.2 * Math.sin(tt * 16))));
    veinColor(coals.color, heat);
    glow.material.opacity = Math.max(0, 0.3 + 0.45 * cur.coal);
    glow.scale.setScalar(0.8 * (1 + 0.6 * Math.max(0, cur.coal)));
    halo.rotation.z = tt * (0.6 + 3.0 * Math.max(0, cur.coal));
    halo.scale.setScalar(cur.halo);
    haloMat.opacity = Math.max(0, Math.min(1, cur.haloA + 0.15 * Math.sin(tt * 3 + ph) * (1 - Math.max(0, cur.coal))));
    const h = CENSER_Y - cur.drop;
    const ss = 0.85 + 0.3 * (1 - (h - 0.9) / 0.5);
    shadow.scale.set(ss, 1, ss);
    shadow.material.opacity = 0.45 + 0.06 * Math.sin(tt * 1.8 + ph);
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
    points: { coals: coalPt, halo: haloPt, top },
    // §6.1 item 9: a hung pot: a soft squash, a big swing on the flinch and
    // the knock; the flinch bulges at the pot.
    react: { squash: 0.7, flinch: 1.2, knock: 1.3, axis: 'y', midY: CENSER_Y },
    death: { swell: 0.8, throw: 1.2 },
  };
}
