// The enemy hit reaction envelope (docs/HIT_FEEDBACK.md "The hit and the
// kill", VFX_HIT_RULES R2 to R5, §6.2 a). Every foe, champion and boss rig
// reacts to a hit with:
//
//   R2  a squash on contact (wider, shorter, the base on the floor), a
//       stretch back, then rest; rapid hits keep it squashed instead of
//       bouncing it once per hit;
//   R3  a flinch away from the hit: the body widens along the hit with its
//       near edge anchored, so its far side bulges away (no lean, no travel);
//   R4  the knockback's shape over the sim's own slide: a hop, a tilt back
//       and a tip forward, an air stretch and a landing squash, all sized to
//       the distance the sim really moves the body (`kb` x the body's
//       kbScale), so no push means no hop;
//   R5  bosses and champions at half the squash and flinch; champions keep a
//       small hop at their small push; bosses are never pushed.
//
// Everything counts in sim ticks, so it holds through hitstop exactly like
// the hit flash (the world's tick freezes). The overlay rides one wrapper
// node the layer inserts between the rig's group and its body (yaw) node:
// the shadow, the elite crown and ring, the mole's mound and every floor
// piece stay on the group, on the floor. Render only: it reads the hit event
// and the body's fields and writes nothing back. Pure (three's math only), so
// Node probes import it as is; never import rig code here (code-health split).
import { Group, Matrix4, Vector3, Quaternion } from 'three';

// Tunables, in ticks (60 Hz) and fractions of the body.
export const REACT = Object.freeze({
  // R2 profiles: hold (ticks at full squash), period (ticks of the spring
  // after the hold), tau (ticks of its decay), amp (width gain), hK (height
  // loss per width gain).
  light: Object.freeze({ hold: 2.5, period: 6, tau: 4.3, amp: 0.12, hK: 1.0 }), // a melee or basic hit (v1, v3, v4)
  shot: Object.freeze({ hold: 2.5, period: 6, tau: 4.3, amp: 0.13, hK: 0.5 }), // a basic shot: wider, less short (v4)
  heavy: Object.freeze({ hold: 4, period: 16, tau: 8, amp: 0.2, hK: 0.6 }), // a skill, a spell, a bomb (v6)
  land: Object.freeze({ hold: 2, period: 5, tau: 3, amp: 0.15, hK: 0.87 }), // R4's landing squash (+15% wide, -13% tall)
  critMul: 1.2,
  softMul: 0.35, // auras, burns, thorns and hazards: a twitch, not a blow
  bigMul: 0.5, // R5: bosses and champions
  maxAmp: 0.26,
  flinch: 0.5, // R3: along-hit gain per squash, near edge anchored (0.12 -> far edge +6% bw)
  // R4, for the video's ~0.55 u push (v2). The world lift is ~0.4 u (0.6 u on
  // a finisher); the timings count from the launch.
  pushRef: 0.55, // u
  hopMul: 1.3, // most of the reference look a push may take
  hopU: 0.4, // u of world lift at the reference push
  hopTicks: 14, // lands at about +7 frames
  hopPeak: 0.43, // highest at +3 frames
  shotHop: 0.12, // a shot's hop, as a fraction of the body's height (v4)
  shotTicks: 11, // peaks at +2..3 frames, lands at +5..6
  shotRef: 0.34, // u: a basic shot's push
  tiltBack: (10 * Math.PI) / 180, // 7-12 deg, most at +1..2 frames
  tiltFwd: (4 * Math.PI) / 180, // 3-5 deg just before landing
  airTall: 0.1, // in the air: 10% taller...
  airThin: 0.12, // ...and 12% narrower, clearest at +5..6 frames
  minPush: 0.03, // u: below this no hop plays
  maxLiftU: 0.75, // u: the cap on any hop (a relic-stacked skill pushes ~3 u)
});

// Hits that are a status tick, not a blow.
const SOFT_SHAPES = new Set(['aura', 'burn', 'molten', 'thorns', 'kindle', 'sear', 'hazard']);
// Rigs whose body the generic overlay must not bend: ropes rise out of sight
// (the Gallows Hanger, the Bell Abbess), so they squash on X/Z only and never
// tilt or hop; coiled and legless bodies (the Bog Lamprey, the Leech, the
// Barrow Wyrm) squash on Y only, since their coil is laid on the floor and a
// widen would slide its tail. Each model slice tunes its own body (§6.1).
const ROPE_KINDS = new Set(['hanger', 'bell_abbess']);
const COIL_KINDS = new Set(['lamprey', 'leech', 'wyrm']);

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// A bump: 0 at a, 1 at b, 0 at c.
function bump(u, a, b, c) {
  if (u <= a || u >= c) return 0;
  return u < b ? smooth((u - a) / (b - a)) : 1 - smooth((u - b) / (c - b));
}

// R2: the squash amount (width gain; > 0 squashed, < 0 stretched) `a` ticks
// after contact. Pure in its inputs: a hard cut to full squash, held, then a
// damped spring through a stretch back to rest.
export function squashCurve(a, p = REACT.light) {
  if (!(a >= 0)) return 0;
  if (a < p.hold) return 1;
  const s = a - p.hold;
  const k = Math.exp(-s / p.tau) * Math.cos((Math.PI * 2 * s) / p.period);
  return Math.abs(k) < 0.002 && s > p.period ? 0 : k;
}

// R4: lift (0..1 of the hop), tilt (-1..1: + back along the push, - forward)
// and air (0..1 of the air stretch) at u = 0..1 of the hop.
export function hopCurves(u) {
  if (!(u > 0) || u >= 1) return { lift: 0, tilt: 0, air: 0 };
  const lift = Math.sin(Math.PI * Math.pow(u, Math.log(0.5) / Math.log(REACT.hopPeak)));
  const tilt = bump(u, 0, 0.2, 0.6) - (REACT.tiltFwd / REACT.tiltBack) * bump(u, 0.6, 0.85, 1);
  const air = bump(u, 0.45, 0.75, 0.98);
  return { lift, tilt, air };
}

// The hit's squash profile and amplitude.
export function hitProfile(ev, { big = false } = {}) {
  const basic = ev.delivery === 'basic';
  const shot = basic && ev.shape === 'projectile';
  const p = shot ? REACT.shot : basic ? REACT.light : REACT.heavy;
  let amp = p.amp;
  if (ev.crit) amp *= REACT.critMul;
  if (SOFT_SHAPES.has(ev.shape)) amp *= REACT.softMul;
  if (big) amp *= REACT.bigMul;
  return { p, amp: Math.min(REACT.maxAmp, amp), shot };
}

// One monotonic envelope clock per layer, in ticks: tick - 1 + alpha, the
// moment the interpolated bodies show. It never runs backwards, so the
// alpha that keeps cycling while a hitstop holds the tick cannot saw-tooth
// the envelopes (they hold instead); a new run or a restore (the tick drops)
// starts it over.
export function createEnvClock() {
  let now = null;
  return {
    step(tick, alpha) {
      const t = tick - 1 + Math.max(0, Math.min(1, alpha || 0));
      if (now === null || t < now - 2) now = t;
      else if (t > now) now = Math.min(t, tick);
      return now;
    },
    get now() {
      return now ?? 0;
    },
  };
}

// --- the wrapper node -------------------------------------------------------
// Inserted once between the rig's group and its body (a model-standard rig's
// `body`, else group.children[0]: the yaw node every rig builds first, or the
// Gallows Vane's hop node above it). The rig's own pose never writes it.
export function hitNode(build) {
  if (build.hitNode) return build.hitNode;
  const g = build.group;
  const body = build.body && build.body.parent === g ? build.body : g.children[0];
  const node = new Group();
  node.name = 'hit-react';
  node.matrixAutoUpdate = false;
  if (body) {
    const i = g.children.indexOf(body);
    g.remove(body);
    node.add(body);
    g.add(node);
    // Keep the body's slot first: rigs and lab tools read children[0].
    g.children.splice(g.children.indexOf(node), 1);
    g.children.splice(Math.max(0, i), 0, node);
  } else g.add(node);
  build.hitNode = node;
  return node;
}

export function resetNode(node) {
  if (!node) return;
  node.matrix.identity();
  node.matrixWorldNeedsUpdate = true;
}

// The body's height and pivot, measured once per kind in the rig's rest pose
// (meshes only; shadows and sprites skipped). A floating body (its lowest
// mesh well off the floor: moths, wisps, censers, kites, the Choir) squashes
// about its middle so it does not drop; a standing body keeps its base down.
const measured = new Map();
const _m = new Matrix4();
const _v = new Vector3();
export function measureBody(kind, node) {
  const hit = measured.get(kind);
  if (hit) return hit;
  let minY = Infinity;
  let maxY = -Infinity;
  const walk = (o, parentM) => {
    if (o.visible === false) return;
    const m = new Matrix4().multiplyMatrices(parentM, _m.compose(o.position, o.quaternion, o.scale));
    const nm = (o.name || '').toLowerCase();
    if (o.isMesh && !o.isInstancedMesh && o.geometry && !nm.includes('shadow')) {
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox;
      if (b && Number.isFinite(b.min.y)) {
        for (const x of [b.min.x, b.max.x])
          for (const y of [b.min.y, b.max.y])
            for (const z of [b.min.z, b.max.z]) {
              _v.set(x, y, z).applyMatrix4(m);
              if (_v.y < minY) minY = _v.y;
              if (_v.y > maxY) maxY = _v.y;
            }
      }
    }
    for (const c of o.children) walk(c, m);
  };
  walk(node, new Matrix4());
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = 0;
    maxY = 1;
  }
  const floats = minY > 0.2;
  const rec = Object.freeze({ minY, maxY, floats, pivot: floats ? (minY + maxY) / 2 : 0, height: Math.max(0.2, maxY - (floats ? minY : 0)) });
  measured.set(kind, rec);
  return rec;
}

// --- per rig state ------------------------------------------------------------
export function createReaction(kind, { boss = false, champion = false } = {}) {
  return {
    kind,
    big: boss || champion,
    boss,
    rope: ROPE_KINDS.has(kind),
    coil: COIL_KINDS.has(kind),
    hitTick: null, // last contact
    p: REACT.light,
    amp: 0,
    dirX: 0,
    dirZ: 0,
    radius: 0.4,
    hop: null, // { tick, dist, sign, dirX, dirZ, shot, ticks }
    hits: 0,
  };
}

// Arm on a `hit` that landed on this rig. `e` is the live body (read only)
// or null.
export function armReaction(st, ev, e) {
  const { p, amp, shot } = hitProfile(ev, { big: st.big });
  const dl = Math.hypot(ev.dirX || 0, ev.dirZ || 0);
  st.hitTick = ev.tick;
  st.p = p;
  st.amp = amp;
  st.hits += 1;
  if (dl > 1e-4) {
    st.dirX = ev.dirX / dl;
    st.dirZ = ev.dirZ / dl;
  } else st.dirX = st.dirZ = 0;
  if (e && Number.isFinite(e.radius)) st.radius = e.radius;
  // R4: a push. A boss, a Lamprey rising or lunging and a zero-knockback
  // skill carry kb 0: no hop. The body's own kbScale is read once the push
  // starts (settleReaction), so the hit that wakes a stone Gargoyle hops at
  // its waking scale, as the sim moves it.
  const kb = Math.abs(ev.kb || 0);
  if (!st.boss && !st.rope && dl > 1e-4 && kb >= REACT.minPush) {
    st.hop = { tick: ev.tick, kb, dist: null, sign: (ev.kb || 0) < 0 ? -1 : 1, dirX: st.dirX, dirZ: st.dirZ, shot, ticks: shot ? REACT.shotTicks : REACT.hopTicks };
  }
}

// Size the pending push from the body's kbScale on the first tick it moves
// (the sim scales the impulse there): a champion takes 0.1-0.15, a Ram 0.3, a
// stone Gargoyle or a rooted Bloom 0 (no hop).
export function settleReaction(st, e, tick) {
  const hop = st.hop;
  if (!hop || hop.dist !== null || !(tick > hop.tick)) return;
  const kbScale = e && Number.isFinite(e.kbScale) ? e.kbScale : 1;
  hop.dist = hop.kb * Math.max(0, kbScale);
  if (hop.dist < REACT.minPush) st.hop = null;
}

// Evaluate at envelope time `now` (createEnvClock ticks) into `out`.
export function evalReaction(st, now, out = {}) {
  let q = 0;
  if (st.hitTick !== null) q = st.amp * squashCurve(now - (st.hitTick - 1), st.p);
  let lift = 0;
  let tilt = 0;
  let air = 0;
  let qLand = 0;
  let tdx = 0;
  let tdz = 0;
  const hop = st.hop && st.hop.dist !== null ? st.hop : null;
  if (hop) {
    const a = now - hop.tick;
    const m = Math.min(REACT.hopMul, hop.dist / (hop.shot ? REACT.shotRef : REACT.pushRef));
    if (a >= hop.ticks + REACT.land.hold + REACT.land.period * 3) st.hop = null;
    else if (a > 0) {
      if (a < hop.ticks) {
        const c = hopCurves(a / hop.ticks);
        lift = c.lift * m;
        tilt = c.tilt * Math.min(1, m);
        air = c.air * Math.min(1, m);
      } else qLand = REACT.land.amp * Math.min(1, m) * squashCurve(a - hop.ticks, REACT.land);
      tdx = hop.dirX * hop.sign;
      tdz = hop.dirZ * hop.sign;
    }
    out.hopShot = !!hop.shot;
  } else out.hopShot = false;
  out.q = q;
  out.qLand = qLand;
  out.lift = lift;
  out.tilt = tilt;
  out.air = air;
  out.tdx = tdx;
  out.tdz = tdz;
  out.dirX = st.dirX;
  out.dirZ = st.dirZ;
  out.hK = st.p.hK;
  out.live = q !== 0 || lift !== 0 || tilt !== 0 || air !== 0 || qLand !== 0;
  return out;
}

// Compose the overlay onto the wrapper node. body: measureBody(); base: the
// group's own scale (elite 1.2, splitling 0.78), so world amounts come out in
// world units; hopLift: world lift of a full hop (u).
const _q = new Quaternion();
const _axis = new Vector3();
const _S = new Matrix4();
const _R = new Matrix4();
const _T = new Matrix4();
export function writeReaction(node, st, o, body, base = 1) {
  if (!o.live) {
    if (!node.userData.rest) {
      resetNode(node);
      node.userData.rest = true;
    }
    return;
  }
  node.userData.rest = false;
  const b = base > 1e-3 ? base : 1;
  const qPos = Math.max(0, o.q);
  // Widths: across the hit and along it (R3's near-edge-anchored flinch).
  let perp = 1 + o.q + o.qLand - REACT.airThin * o.air;
  let along = 1 + REACT.flinch * qPos + o.qLand - REACT.airThin * o.air;
  let ys = 1 - o.q * o.hK - o.qLand * REACT.land.hK + REACT.airTall * o.air;
  let dx = o.dirX;
  let dz = o.dirZ;
  if (Math.hypot(dx, dz) < 1e-4) {
    // No direction: an even squash, no flinch.
    dx = 1;
    dz = 0;
    along = perp = 1 + 0.75 * o.q + o.qLand - REACT.airThin * o.air;
  }
  if (st.rope) ys = 1;
  if (st.coil) perp = along = 1;
  // S along (dx, dz) by `along`, across it by `perp`, Y by `ys`.
  const ax = along - perp;
  _S.set(perp + ax * dx * dx, 0, ax * dx * dz, 0, 0, ys, 0, 0, ax * dx * dz, 0, perp + ax * dz * dz, 0, 0, 0, 0, 1);
  // Pivot: the floor for a standing body, its middle for a floating one.
  const py = body.pivot;
  // R4 tilt about the floor-level axis across the push (top along the push).
  const tilt = st.rope || st.coil ? 0 : o.tilt * REACT.tiltBack;
  if (tilt !== 0 && Math.hypot(o.tdx, o.tdz) > 1e-4) {
    _axis.set(o.tdz, 0, -o.tdx).normalize();
    _R.makeRotationFromQuaternion(_q.setFromAxisAngle(_axis, tilt));
  } else _R.identity();
  // Lift (u, world) and the flinch's near-edge anchor (half a body width
  // times the along-hit gain), both back in the group's own units.
  const liftU = st.rope ? 0 : Math.min(REACT.maxLiftU, o.hopShot ? o.lift * REACT.shotHop * body.height : o.lift * REACT.hopU);
  const shift = (st.coil || Math.hypot(o.dirX, o.dirZ) < 1e-4 ? 0 : st.radius * REACT.flinch * qPos) / b;
  const m = node.matrix;
  m.makeTranslation(0, -py, 0);
  m.premultiply(_S);
  m.premultiply(_R);
  m.premultiply(_T.makeTranslation(dx * shift, py + liftU / b, dz * shift));
  node.matrixWorldNeedsUpdate = true;
}
