// REVIEW-ONLY (never committed, never pushed): draws the passed Tripo Ashfang
// (fox swordsman) in place of the code-built Swordsman rig when the URL carries
// ?tripo=1, so his kit (ASHFANG_SKILL_KIT.md 1.4) can be recorded for his
// ability review page during the feature freeze. The sim review module
// (src/sim/reviewAshfang.js) tells this rig what to play through `review_af_*`
// events. The sword always rides the right paw (its grip read from the passed
// clips), so moves made here from the passed ones keep it in his hand.
import { ShaderMaterial, NormalBlending, CanvasTexture, Sprite, SpriteMaterial, AdditiveBlending, AnimationClip, AnimationMixer, BufferAttribute, BufferGeometry, Color, DoubleSide, Euler, Group, LoopOnce, LoopRepeat, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack, SphereGeometry, Vector3, VectorKeyframeTrack } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SKILL20_DEFS } from './tripoFoxSkills.js';

let gltfP = null;
const load = () => (gltfP ??= new GLTFLoader().loadAsync('/review/fox-tripo-rigged.glb'));
export const tripoOn = () => typeof location !== 'undefined' && /[?&]tripo=1\b/.test(location.search);

const D = Math.PI / 180;
const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// A clip with Euler deltas (degrees, XYZ, in the parent frame) laid over
// chosen bones, weight w(t) in 0..1. `_hips` adds a hips offset in u.
export function overlay(src, name, deltas, w = () => 1) {
  const c = src.clone();
  c.name = name;
  const e = new Euler(), q = new Quaternion(), q2 = new Quaternion();
  for (const tr of c.tracks) {
    const [bn, prop] = tr.name.split('.');
    if (prop === 'position' && bn === 'hips' && deltas._hips) {
      const v = tr.values;
      for (let i = 0; i < tr.times.length; i++) {
        const t = tr.times[i], k = w(t);
        const d = typeof deltas._hips === 'function' ? deltas._hips(t) : deltas._hips;
        v[i * 3] += d[0] * k;
        v[i * 3 + 1] += d[1] * k;
        v[i * 3 + 2] += d[2] * k;
      }
      continue;
    }
    if (prop !== 'quaternion' || !deltas[bn]) continue;
    const v = tr.values;
    for (let i = 0; i < tr.times.length; i++) {
      const t = tr.times[i];
      const d = typeof deltas[bn] === 'function' ? deltas[bn](t) : deltas[bn];
      const k = w(t);
      q.setFromEuler(e.set(d[0] * D * k, d[1] * D * k, d[2] * D * k, 'XYZ'));
      q2.set(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]);
      q.multiply(q2);
      v.set([q.x, q.y, q.z, q.w], i * 4);
    }
  }
  return c;
}
// A piece of a clip, re-timed: [a, b] of src played over (b - a) / speed.
function slice(src, name, a, b, speed = 1) {
  const c = new AnimationClip(name, (b - a) / speed, []);
  for (const tr of src.tracks) {
    const it = tr.createInterpolant();
    const n = Math.max(2, Math.round(((b - a) / speed) * 60) + 1);
    const times = new Float32Array(n), vals = new Float32Array(n * it.valueSize);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      times[i] = u * c.duration;
      vals.set(it.evaluate(a + u * (b - a)), i * it.valueSize);
    }
    c.tracks.push(new tr.constructor(tr.name, times, vals));
  }
  return c;
}
// Several pieces played one after another (each [clip, a, b, speed]).
function chain(name, parts) {
  const c = new AnimationClip(name, 0, []);
  const pieces = parts.map(([src, a, b, s]) => slice(src, 'p', a, b, s));
  const T = pieces.reduce((s, p) => s + p.duration, 0);
  c.duration = T;
  const names = new Set(pieces.flatMap((p) => p.tracks.map((t) => t.name)));
  for (const tn of names) {
    const times = [], vals = [];
    let off = 0, Ctor = null, size = 4;
    for (const p of pieces) {
      const tr = p.tracks.find((t) => t.name === tn);
      if (tr) {
        Ctor = tr.constructor;
        size = tr.getValueSize();
        for (let i = 0; i < tr.times.length; i++) {
          const t = off + tr.times[i];
          if (times.length && t <= times[times.length - 1] + 1e-5) continue;
          times.push(t);
          for (let j = 0; j < size; j++) vals.push(tr.values[i * size + j]);
        }
      }
      off += p.duration;
    }
    if (Ctor && times.length) c.tracks.push(new Ctor(tn, Float32Array.from(times), Float32Array.from(vals)));
  }
  return c;
}

// 1.5: a posed clip. Keys give the sword hand's spot (model space: +z ahead, +x his left), the
// blade's direction, and the trunk's turn (yaw, degrees, + turns him to his left) and lean (pitch,
// + forward). Between keys the targets ease (smoothstep); each sample is solved with a two-bone
// reach for the right arm and the paw turned so the blade points as asked. Other bones keep `base`.
// 1.5: Flowing Blade's three cuts from Kesh's ninja ref (24ioI3PQo): a vertical arc, a rising cut,
// a low crouched sweep; contacts at 0.12, 0.32 and 0.52 s
export const FLOW_KEYS = [
  { t: 0.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
  { t: 0.06, h: [-0.04, 0.86, 0.04], b: [0.0, 0.5, -0.85], pitch: -10 },
  { t: 0.12, h: [-0.02, 0.56, 0.32], b: [0.0, 0.2, 0.98], pitch: 10 },
  { t: 0.18, h: [0.0, 0.36, 0.28], b: [0.0, -0.8, 0.55], pitch: 20 },
  { t: 0.26, h: [0.12, 0.32, 0.18], b: [0.4, -0.8, 0.4], yaw: 20, pitch: 14 },
  { t: 0.32, h: [-0.04, 0.62, 0.28], b: [-0.2, 0.75, 0.6], yaw: -10, pitch: -4 },
  { t: 0.38, h: [-0.14, 0.84, 0.08], b: [-0.3, 0.85, -0.3], yaw: -25, pitch: -10 },
  { t: 0.45, h: [-0.26, 0.42, 0.0], b: [-0.7, -0.1, -0.7], yaw: -40, pitch: 20, drop: 0.06 },
  { t: 0.52, h: [0.0, 0.34, 0.36], b: [0.0, -0.15, 1.0], yaw: 0, pitch: 30, drop: 0.08 },
  { t: 0.6, h: [0.24, 0.36, 0.12], b: [0.95, -0.1, -0.2], yaw: 40, pitch: 26, drop: 0.08 },
  { t: 0.8, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
];
// 1.6: the four skills from Kesh's copy-all videos, one clip per skill (clip times match the sim)
export const SKILL16_KEYS = {
  // Blazing Cascade (5bsoG8vEr): sweep, back sweep, overhead slam, drawn back while the swirl
  // turns and the flame gathers, then the dash cut
  cascade: [
    { t: 0.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
    { t: 0.1, h: [-0.26, 0.6, -0.04], b: [-0.5, 0.15, -0.85], yaw: -45 },
    { t: 0.2, h: [0.06, 0.52, 0.3], b: [0.35, 0.0, 0.94], yaw: 10, pitch: 6 },
    { t: 0.28, h: [0.2, 0.52, 0.14], b: [0.95, 0.05, -0.2], yaw: 42, pitch: 4 },
    { t: 0.36, h: [0.2, 0.6, 0.12], b: [0.9, 0.2, 0.1], yaw: 40 },
    { t: 0.46, h: [-0.04, 0.55, 0.32], b: [-0.3, 0.05, 0.95], yaw: 0, pitch: 6 },
    { t: 0.54, h: [-0.26, 0.56, 0.0], b: [-0.95, 0.1, -0.2], yaw: -40, pitch: 4 },
    { t: 0.72, h: [-0.02, 0.88, 0.02], b: [0.0, 0.45, -0.9], pitch: -12 },
    { t: 0.8, h: [-0.02, 0.62, 0.3], b: [0.0, 0.6, 0.8], pitch: 4 },
    { t: 0.86, h: [-0.02, 0.36, 0.3], b: [0.0, -0.85, 0.5], pitch: 24, drop: 0.06 },
    { t: 1.0, h: [-0.02, 0.36, 0.28], b: [0.05, -0.85, 0.5], pitch: 22, drop: 0.06 },
    { t: 1.2, h: [-0.22, 0.42, -0.1], b: [-0.4, -0.3, -0.85], yaw: -30, pitch: 6, drop: 0.05 },
    { t: 1.55, h: [-0.22, 0.42, -0.12], b: [-0.4, -0.3, -0.86], yaw: -32, pitch: 8, drop: 0.06 },
    { t: 1.66, h: [0.05, 0.5, 0.35], b: [0.6, 0.0, 0.8], yaw: 30, pitch: 14, drop: 0.06 },
    { t: 1.8, h: [0.22, 0.5, 0.1], b: [0.95, 0.0, -0.2], yaw: 40, pitch: 10, drop: 0.04 },
    { t: 2.1, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
  ],
  // Skyblade Waltz (Pi4PRflgB): low skim cut, flat cut, flash dash, spin, sword raised while the
  // blades rise, rising cut, the point held on the spot where the beams fall
  waltz: [
    { t: 0.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
    { t: 0.06, h: [-0.2, 0.45, 0.0], b: [-0.6, -0.3, -0.7], yaw: -35, drop: 0.05 },
    { t: 0.15, h: [0.0, 0.32, 0.34], b: [0.2, -0.6, 0.8], pitch: 25, drop: 0.08 },
    { t: 0.25, h: [0.2, 0.35, 0.15], b: [0.9, -0.3, -0.2], yaw: 35, pitch: 18, drop: 0.06 },
    { t: 0.42, h: [0.2, 0.6, 0.1], b: [0.95, 0.2, -0.1], yaw: 45 },
    { t: 0.55, h: [-0.04, 0.55, 0.34], b: [-0.3, 0.05, 0.95], pitch: 6 },
    { t: 0.66, h: [-0.26, 0.56, 0.0], b: [-0.95, 0.1, -0.2], yaw: -45, pitch: 4 },
    { t: 0.86, h: [-0.22, 0.45, -0.1], b: [-0.4, -0.2, -0.9], yaw: -30, drop: 0.05 },
    { t: 0.98, h: [0.05, 0.5, 0.35], b: [0.5, 0.0, 0.86], pitch: 12, drop: 0.05 },
    { t: 1.1, h: [0.2, 0.5, 0.1], b: [0.95, 0.0, -0.2], yaw: 40, pitch: 6 },
    { t: 1.25, h: [0.2, 0.55, 0.0], b: [0.95, 0.0, -0.3], yaw: 60 },
    { t: 1.35, h: [-0.05, 0.55, 0.35], b: [-0.2, 0.0, 0.98], yaw: 0 },
    { t: 1.45, h: [-0.3, 0.55, -0.05], b: [-0.9, 0.0, -0.4], yaw: -60 },
    { t: 1.65, h: [-0.05, 0.75, 0.25], b: [0.0, 1.0, 0.1], pitch: -6 },
    { t: 1.92, h: [-0.05, 0.78, 0.24], b: [0.0, 1.0, 0.12], pitch: -8 },
    { t: 2.06, h: [0.1, 0.32, 0.2], b: [0.4, -0.85, 0.3], yaw: 15, pitch: 14, drop: 0.06 },
    { t: 2.2, h: [-0.05, 0.7, 0.3], b: [-0.1, 0.8, 0.6], pitch: -8 },
    { t: 2.3, h: [-0.15, 0.86, 0.06], b: [-0.3, 0.85, -0.4], yaw: -20, pitch: -10 },
    { t: 2.5, h: [-0.04, 0.6, 0.38], b: [0.0, 0.3, 0.95], pitch: 4 },
    { t: 2.9, h: [-0.04, 0.6, 0.38], b: [0.0, 0.28, 0.96], pitch: 4 },
    { t: 3.2, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
  ],
  // Inkstone Dive (2SnjhTKLD): rising slash, the X, cuts round him in the air, blade overhead,
  // then the dive with the point driven down
  inkdive: [
    { t: 0.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
    { t: 0.06, h: [0.1, 0.32, 0.16], b: [0.45, -0.85, 0.2], yaw: 12, pitch: 10, drop: 0.04 },
    { t: 0.2, h: [-0.05, 0.7, 0.3], b: [-0.1, 0.8, 0.6], pitch: -6 },
    { t: 0.3, h: [-0.16, 0.86, 0.06], b: [-0.3, 0.85, -0.4], yaw: -20, pitch: -10 },
    { t: 0.45, h: [-0.16, 0.84, 0.05], b: [-0.4, 0.6, -0.6], yaw: -25 },
    { t: 0.55, h: [0.12, 0.36, 0.2], b: [0.6, -0.6, 0.5], yaw: 25, pitch: 14 },
    { t: 0.61, h: [0.2, 0.8, 0.05], b: [0.4, 0.6, -0.6], yaw: 30, pitch: -8 },
    { t: 0.68, h: [-0.12, 0.36, 0.2], b: [-0.6, -0.6, 0.5], yaw: -25, pitch: 14 },
    { t: 0.85, h: [-0.1, 0.5, 0.1], b: [-0.3, 0.6, 0.7], pitch: -4 },
    { t: 0.95, h: [0.2, 0.6, 0.1], b: [0.9, 0.2, -0.3], yaw: 40 },
    { t: 1.08, h: [-0.05, 0.55, 0.35], b: [-0.2, -0.2, 0.95] },
    { t: 1.21, h: [-0.25, 0.6, 0.0], b: [-0.9, 0.2, -0.3], yaw: -40 },
    { t: 1.38, h: [-0.02, 0.9, 0.02], b: [0.0, 0.45, -0.9], pitch: -14 },
    { t: 1.75, h: [-0.02, 0.62, 0.3], b: [0.0, 0.6, 0.8], pitch: 2 },
    { t: 1.95, h: [-0.02, 0.34, 0.3], b: [0.0, -0.85, 0.5], pitch: 26, drop: 0.1 },
    { t: 2.15, h: [-0.02, 0.34, 0.28], b: [0.05, -0.85, 0.5], pitch: 24, drop: 0.1 },
    { t: 2.4, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
  ],
  // Riptide Form (24ioI3PQo): overhead arc, the leap with the point down, the rising cut, the low
  // crouched sweep
  riptide: [
    { t: 0.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
    { t: 0.08, h: [-0.04, 0.86, 0.04], b: [0.0, 0.5, -0.85], pitch: -10 },
    { t: 0.18, h: [-0.02, 0.5, 0.32], b: [0.0, 0.0, 1.0], pitch: 14 },
    { t: 0.26, h: [0.0, 0.34, 0.28], b: [0.0, -0.8, 0.55], pitch: 22, drop: 0.04 },
    { t: 0.42, h: [-0.04, 0.75, 0.2], b: [0.0, -0.3, 0.95], pitch: -6 },
    { t: 0.6, h: [-0.04, 0.8, 0.2], b: [0.0, -0.6, 0.8], pitch: -4 },
    { t: 0.76, h: [-0.02, 0.4, 0.3], b: [0.0, -0.95, 0.3], pitch: 28, drop: 0.1 },
    { t: 0.9, h: [0.0, 0.3, 0.25], b: [0.1, -0.9, 0.4], pitch: 20, drop: 0.08 },
    { t: 1.05, h: [-0.02, 0.66, 0.3], b: [0.0, 0.8, 0.6], pitch: -6 },
    { t: 1.15, h: [-0.04, 0.86, 0.06], b: [0.0, 0.9, -0.4], pitch: -10 },
    { t: 1.3, h: [0.26, 0.42, 0.0], b: [0.7, -0.1, -0.7], yaw: 40, pitch: 20, drop: 0.1 },
    { t: 1.45, h: [0.0, 0.3, 0.38], b: [0.0, -0.1, 1.0], pitch: 30, drop: 0.14 },
    { t: 1.6, h: [-0.28, 0.32, 0.1], b: [-0.95, -0.1, -0.2], yaw: -45, pitch: 26, drop: 0.14 },
    { t: 1.75, h: [-0.28, 0.32, 0.1], b: [-0.95, -0.1, -0.2], yaw: -45, pitch: 24, drop: 0.13 },
    { t: 2.0, h: [-0.12, 0.62, 0.1], b: [-0.2, 0.9, 0.2] },
  ],
};
const sm01 = (u) => u * u * (3 - 2 * u);
function posedClip(model, G, axis, base, name, keys) {
  const B = (n) => model.getObjectByName(n);
  const spine = B('spine'), chest = B('chest'), head = B('head'), hips = B('hips'), uR = B('upperarmR'), fR = B('forearmR'), hR = B('handR');
  const mx = new AnimationMixer(model);
  mx.clipAction(base).play();
  const T = keys[keys.length - 1].t, n = Math.round(T * 30) + 1;
  const bones = [spine, chest, head, uR, fR, hR];
  const out = bones.map(() => []), hipsP = [], times = [];
  const W = (o) => new Vector3().setFromMatrixPosition(o.matrixWorld);
  const e = new Euler(), q = new Quaternion(), pq = new Quaternion(), wq = new Quaternion();
  const Gq = new Quaternion();
  new Matrix4().copy(G).decompose(new Vector3(), Gq, new Vector3());
  const ax = new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
  const toW = (v) => model.localToWorld(v.clone());
  const aim = (bone, child, target) => {
    model.updateMatrixWorld(true);
    const P = W(bone), C = W(child);
    const dq = new Quaternion().setFromUnitVectors(C.sub(P).normalize(), target.clone().sub(P).normalize());
    bone.getWorldQuaternion(wq);
    bone.parent.getWorldQuaternion(pq);
    bone.quaternion.copy(pq.invert().multiply(dq.multiply(wq)));
    bone.updateMatrixWorld(true);
  };
  // every sample starts from the same idle pose: bones the idle leaves alone (the hips' position)
  // would otherwise keep the last sample's offset, and the drop piled up until he lay on the floor
  mx.setTime(0);
  const rest = [];
  model.traverse((o) => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone()]); });
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * T;
    for (const [o, p0, q0] of rest) { o.position.copy(p0); o.quaternion.copy(q0); }
    let k = 0;
    while (k < keys.length - 2 && keys[k + 1].t < t) k++;
    const a = keys[k], b = keys[k + 1];
    const u = sm01(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1))));
    const L = (x, y) => x + (y - x) * u;
    const hp = new Vector3(L(a.h[0], b.h[0]), L(a.h[1], b.h[1]), L(a.h[2], b.h[2]));
    const bd = new Vector3(L(a.b[0], b.b[0]), L(a.b[1], b.b[1]), L(a.b[2], b.b[2])).normalize();
    const yaw = L(a.yaw || 0, b.yaw || 0), pitch = L(a.pitch || 0, b.pitch || 0), drop = L(a.drop || 0, b.drop || 0);
    mx.setTime(0);
    // his legs are single bones with no knee, so a deep drop sinks the feet: keep 40% of it
    hips.position.y -= drop * 0.4;
    // the trunk: half the turn and lean in the spine, half in the chest
    for (const bn of [spine, chest]) {
      q.setFromEuler(e.set((pitch / 2) * D, (yaw / 2) * D, 0, 'XYZ'));
      bn.quaternion.premultiply(q);
    }
    // the head stays on the foe: it takes back most of the trunk's turn and lean
    head.quaternion.premultiply(q.setFromEuler(e.set(-pitch * 0.7 * D, -yaw * 0.8 * D, 0, 'XYZ')));
    model.updateMatrixWorld(true);
    // two-bone reach: the elbow out to his right and down
    const S = W(uR), lu = W(fR).distanceTo(S), lf = W(hR).distanceTo(W(fR));
    const H = toW(hp);
    const d = Math.min(H.distanceTo(S), (lu + lf) * 0.995);
    const dir = H.clone().sub(S).normalize();
    const Hc = S.clone().addScaledVector(dir, d);
    const pole = toW(new Vector3(-0.6, 0.2, -0.3)).sub(toW(new Vector3())).normalize();
    const along = (lu * lu - lf * lf + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, lu * lu - along * along));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const E2 = S.clone().addScaledVector(dir, along).addScaledVector(perp, hgt);
    aim(uR, fR, E2);
    aim(fR, hR, Hc);
    // the paw: turn it so the blade points along bd (world)
    model.updateMatrixWorld(true);
    hR.getWorldQuaternion(wq);
    const cur = ax.clone().applyQuaternion(Gq).applyQuaternion(wq).normalize();
    const want = toW(bd).sub(toW(new Vector3())).normalize();
    const dq = new Quaternion().setFromUnitVectors(cur, want);
    hR.parent.getWorldQuaternion(pq);
    hR.quaternion.copy(pq.invert().multiply(dq.multiply(wq)));
    times.push(t);
    bones.forEach((bn, j) => out[j].push(bn.quaternion.x, bn.quaternion.y, bn.quaternion.z, bn.quaternion.w));
    hipsP.push(hips.position.x, hips.position.y, hips.position.z);
  }
  mx.stopAllAction();
  mx.uncacheRoot(model);
  const c = slice(base, name, 0, Math.min(T, base.duration - 1e-3), Math.min(T, base.duration - 1e-3) / T);
  const mine = new Set(bones.map((bn) => bn.name + '.quaternion').concat(['hips.position']));
  c.tracks = c.tracks.filter((tr) => !mine.has(tr.name));
  bones.forEach((bn, j) => c.tracks.push(new QuaternionKeyframeTrack(bn.name + '.quaternion', times, out[j])));
  c.tracks.push(new VectorKeyframeTrack('hips.position', times, hipsP));
  c.duration = T;
  return c;
}

// 1.5: his idle and walk hold the empty left paw out, palm up, with the orbs above it
// (Kesh's pose ref, pin 5VkcvWW9o). Local quaternions for the left arm, solved from the idle.
const LPOSE = { upperarmL: [-0.2045, -0.0403, -0.0132, 0.9779], forearmL: [-0.65, -0.3913, -0.3024, 0.577], handL: [0.1819, 0.0857, -0.0383, 0.9788] };
const ELEM = { fire: '#FFB43C', earth: '#8F6B45', water: '#7FE0F2', wind: '#E7E3F0' };
// 2.0: a will mark is its glyph in its colour (剑意 gold, 不屈 bronze, 止水 pale aqua, 狂热 silver)
const MARKC = { fire: '#FFB43C', earth: '#C9A06E', water: '#7FE0F2', wind: '#E7E3F0' };
const MARKG = { fire: '剑', earth: '屈', water: '水', wind: '热' };
const glyphs = {};
function glyphTex(el) {
  if (glyphs[el]) return glyphs[el];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (el === 'glow') {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  } else {
    g.font = '700 92px "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 12;
    g.strokeStyle = 'rgba(20,16,14,0.85)';
    g.strokeText(MARKG[el], 64, 68);
    g.fillStyle = MARKC[el];
    g.fillText(MARKG[el], 64, 68);
  }
  return (glyphs[el] = new CanvasTexture(c));
}

// ---- 1.8: the basic combo as one continuous six-hit path (Kesh 23:26, "audit and review again
// basic attack, increase detail insanely"). The audit of the 1.5 posed clips found the blade
// snapping up to 177 degrees in one frame (30 fps samples of 100-degree turns, each bone eased on
// its own), a pose jump at every hand-off between hits (each clip started from the last one's END
// pose, but the next hit starts 75% of the way in), a 50 ms dip toward idle at every hand-off, a
// stop at every key (smoothstep), no footwork, the left paw, tail and ears left on idle, and the
// trunk twisting up to 51 degrees over still hips. Here: one timeline for all six hits on the
// sim's own hand-off times, monotone cubic curves through the keys (the hand carries its speed
// through a key unless the move turns there), 120 samples a second, the turn shared by hips,
// spine and chest, planted feet that step (the leg roots slide in the hips like the passed
// clips' do), the left paw on its own path or on the grip, the edge turned to lead the cut, the
// head leading the turn, and the tail and ears dragging behind. Each hit's clip is its piece of
// the timeline, plus its own settle back to idle for when the combo stops there.
// Model space: +z ahead, +x his left. yaw + turns him to his left, pitch + leans him forward,
// roll + leans him to his left. drop lowers the hips (u). fl, fr: the left and right ankle's
// spot on the floor [x, z]. lh: the left paw's spot; lg: 1 puts it on the grip.
export const CUT_S = [0, 0.292, 0.58, 0.882, 1.142, 1.43];
export const COMBO_KEYS = [
  // 1: the big diagonal down-cut, high right to low left; the right foot steps in on the hit
  { t: 0, idle: true },
  { t: 0.045, h: [-0.16, 0.68, 0.06], b: [-0.3, 0.9, -0.2], yaw: -12, pitch: -3, drop: 0.012, lh: [0.18, 0.46, 0.14] },
  { t: 0.095, h: [-0.17, 0.8, -0.01], b: [-0.3, 0.6, -0.75], yaw: -30, pitch: -6, roll: -3, hz: -0.012, drop: 0.01, lh: [0.15, 0.52, 0.22], ear: 0.4 },
  { t: 0.14, h: [-0.05, 0.65, 0.22], b: [0.12, 0.66, 0.74], yaw: -10, pitch: 3, roll: -1, hz: 0, drop: 0.02 },
  { t: 0.168, hit: 1, h: [-0.01, 0.55, 0.27], b: [0.12, 0.22, 0.97], yaw: 6, pitch: 9, roll: 1, hz: 0.02, drop: 0.035, fr: [-0.075, 0.19], lh: [0.2, 0.46, 0.04], ear: 1 },
  { t: 0.2, h: [0.12, 0.4, 0.22], b: [0.68, -0.45, 0.58], yaw: 22, pitch: 14, roll: 3, hz: 0.028, drop: 0.045 },
  { t: 0.228, h: [0.14, 0.37, 0.15], b: [0.62, -0.7, 0.2], yaw: 28, pitch: 12, roll: 2, hx: 0.008, hz: 0.026, drop: 0.04, lh: [0.23, 0.44, -0.1], ear: 0.5 },
  // 2: the flat sweep, right to left at chest height; the left foot opens out to his left
  { t: 0.262, h: [0.08, 0.47, 0.22], b: [0.55, 0.35, 0.75], yaw: 18, pitch: 8, roll: 1, hx: 0.004, hz: 0.024, drop: 0.035 },
  { t: 0.305, h: [-0.04, 0.58, 0.2], b: [-0.25, 0.95, 0.1], yaw: 0, pitch: 5, roll: 0, hx: 0, hz: 0.02, drop: 0.03, ear: 0.3 },
  { t: 0.385, h: [-0.26, 0.6, -0.04], b: [-0.5, 0.15, -0.85], yaw: -44, pitch: 0, roll: -3, hz: -0.008, drop: 0.03, fl: [0.085, -0.095], lh: [0.14, 0.5, 0.22], ear: 0.6 },
  { t: 0.432, h: [-0.12, 0.54, 0.25], b: [-0.6, 0.05, 0.8], yaw: -16, pitch: 4, roll: -1, hz: 0.01, drop: 0.04 },
  { t: 0.46, hit: 2, h: [0.0, 0.53, 0.31], b: [0.08, 0.02, 1.0], yaw: 14, pitch: 7, roll: 1, hz: 0.02, drop: 0.045, lh: [0.24, 0.46, -0.02], ear: 1 },
  { t: 0.5, h: [0.2, 0.52, 0.15], b: [0.95, 0.05, -0.2], yaw: 40, pitch: 5, roll: 3, hz: 0.02, drop: 0.045 },
  { t: 0.53, h: [0.16, 0.57, 0.08], b: [0.72, 0.4, -0.56], yaw: 38, pitch: 2, roll: 2, hx: 0.006, hz: 0.015, drop: 0.035, lh: [0.24, 0.48, -0.1], ear: 0.4 },
  // 3: both paws over the head, then a straight chop; the left foot comes up square
  { t: 0.615, h: [0.04, 0.75, 0.12], b: [0.2, 0.95, -0.2], yaw: 14, pitch: -4, roll: 1, hx: 0, hz: 0.0, drop: 0.015, lg: 0.6 },
  { t: 0.685, h: [-0.02, 0.86, 0.02], b: [0.0, 0.45, -0.9], yaw: 0, pitch: -12, roll: 0, hz: -0.018, drop: 0.0, lg: 1, fl: [0.07, -0.02], ear: 0.5 },
  { t: 0.735, h: [-0.02, 0.68, 0.26], b: [0.0, 0.72, 0.69], pitch: 4, hz: 0.0, drop: 0.03 },
  { t: 0.762, hit: 3, h: [-0.02, 0.48, 0.33], b: [0.0, -0.25, 0.97], pitch: 18, hz: 0.025, drop: 0.07, ear: 1 },
  { t: 0.8, h: [-0.02, 0.36, 0.28], b: [0.04, -0.82, 0.57], pitch: 24, hz: 0.03, drop: 0.085 },
  { t: 0.835, h: [0.04, 0.33, 0.22], b: [0.25, -0.9, 0.35], yaw: 6, pitch: 20, hz: 0.028, drop: 0.075, lg: 0.5, lh: [0.22, 0.42, 0.06], ear: 0.5 },
  // 4: the rising cut, low left up past the right shoulder; the weight rides back up
  { t: 0.925, h: [0.16, 0.3, 0.13], b: [0.5, -0.8, 0.3], yaw: 28, pitch: 14, roll: 2, hz: 0.022, drop: 0.07, lg: 0, lh: [0.2, 0.42, 0.12], fl: [0.06, -0.07] },
  { t: 0.997, h: [0.04, 0.44, 0.27], b: [0.2, -0.05, 0.98], yaw: 10, pitch: 6, roll: 0, hz: 0.012, drop: 0.045 },
  { t: 1.022, hit: 4, h: [-0.04, 0.56, 0.27], b: [-0.05, 0.5, 0.86], yaw: -4, pitch: 0, roll: -2, hz: 0.004, drop: 0.03, lh: [0.23, 0.4, 0.0], ear: 1 },
  { t: 1.057, h: [-0.13, 0.73, 0.19], b: [-0.3, 0.85, 0.42], yaw: -20, pitch: -8, roll: -4, hz: -0.008, drop: 0.012 },
  { t: 1.1, h: [-0.18, 0.82, 0.06], b: [-0.35, 0.78, -0.5], yaw: -28, pitch: -11, roll: -3, hz: -0.016, drop: 0.008, fr: [-0.07, 0.13], lh: [0.22, 0.44, 0.1], ear: 0.4 },
  // 5: the deep low lunge, the point driven ahead and down; the right foot lunges out
  { t: 1.17, h: [-0.22, 0.62, -0.06], b: [-0.85, 0.35, 0.1], yaw: -32, pitch: -4, roll: -2, hz: -0.02, drop: 0.015 },
  { t: 1.225, h: [-0.21, 0.5, -0.1], b: [-0.1, -0.05, 0.99], yaw: -35, pitch: 2, roll: -1, hz: -0.022, drop: 0.03, lh: [0.17, 0.5, 0.22], ear: 0.6 },
  { t: 1.282, h: [-0.08, 0.43, 0.3], b: [0.0, -0.28, 0.96], yaw: -8, pitch: 18, roll: 0, hz: 0.04, drop: 0.06, fr: [-0.075, 0.25] },
  { t: 1.31, hit: 5, h: [-0.05, 0.39, 0.4], b: [0.0, -0.33, 0.94], yaw: -2, pitch: 26, hz: 0.07, drop: 0.09, fr: [-0.075, 0.27], lh: [0.2, 0.48, -0.18], ear: 1 },
  { t: 1.352, h: [-0.04, 0.38, 0.43], b: [0.0, -0.35, 0.94], yaw: 0, pitch: 28, hz: 0.075, drop: 0.095 },
  { t: 1.39, h: [-0.07, 0.42, 0.34], b: [0.0, -0.25, 0.97], yaw: -4, pitch: 22, hz: 0.068, drop: 0.085, lh: [0.21, 0.47, -0.15], ear: 0.5 },
  // 6 (kit 2.1 K21): the sword stays low in the right paw; the open left paw draws back by the shoulder
  // and flicks forward, sending the newest ghost sword out; the left foot steps into the flick
  { t: 1.465, h: [-0.2, 0.55, 0.12], b: [-0.3, -0.2, 0.93], yaw: 8, pitch: 4, hz: 0.02, drop: 0.04, lh: [0.2, 0.55, 0.05], fr: [-0.07, 0.16] },
  { t: 1.545, h: [-0.22, 0.52, 0.06], b: [-0.4, -0.25, 0.88], yaw: 24, pitch: -4, roll: 2, hz: -0.015, drop: 0.02, lh: [0.24, 0.66, -0.12], fl: [0.05, -0.08], ear: 0.6 },
  { t: 1.6, h: [-0.22, 0.52, 0.08], b: [-0.4, -0.25, 0.88], yaw: 8, pitch: 2, roll: 0, hz: 0.0, drop: 0.025, lh: [0.18, 0.64, 0.12] },
  { t: 1.64, hit: 6, h: [-0.23, 0.5, 0.04], b: [-0.45, -0.3, 0.84], yaw: -18, pitch: 12, roll: -1, hz: 0.04, drop: 0.05, fl: [0.06, 0.07], lh: [0.08, 0.62, 0.46], ear: 1 },
  { t: 1.73, h: [-0.23, 0.5, 0.05], b: [-0.45, -0.3, 0.84], yaw: -22, pitch: 14, roll: -1, hz: 0.05, drop: 0.055, lh: [0.07, 0.6, 0.44] },
  { t: 1.93, h: [-0.12, 0.52, 0.18], b: [-0.1, 0.6, 0.8], yaw: -6, pitch: 6, roll: 0, hz: 0.02, drop: 0.025, fl: [0.045, -0.085], fr: [-0.069, 0.128], lh: [0.16, 0.5, 0.18], ear: 0.2 },
  { t: 2.13, idle: true },
];
// the sim's hand-off times (reviewAshfang.js K.basic: the next cut starts at max(at + 0.12, len - 0.1))
export const COMBO_HAND = [0.292, 0.58, 0.882, 1.142, 1.43, 2.13];
// 2.0: lift, spin, tumble and flip move his whole body (the rig plays them on the group that holds the
// model, about his hips; lift in model units, the turns in degrees: spin + to his left about the up,
// tumble + rolls him to his left about his forward, flip + pitches him forward); tuck raises both feet
const CH = { h: 3, b: 3, pe: 3, lh: 3, lg: 1, yaw: 1, pitch: 1, roll: 1, hx: 1, hz: 1, drop: 1, fl: 2, fr: 2, ear: 1, lift: 1, spin: 1, tumble: 1, flip: 1, tuck: 1 };
export const BODY_PIVOT = 0.34;
// monotone cubic (Fritsch and Carlson) through the keys: no overshoot, no stop at a key the value
// passes through
function mono(ts, vs) {
  const n = ts.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / Math.max(1e-6, ts[i + 1] - ts[i]));
  m[0] = d[0] ?? 0;
  m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-9) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (t) => {
    if (t <= ts[0]) return vs[0];
    if (t >= ts[n - 1]) return vs[n - 1];
    let i = 0;
    while (i < n - 2 && ts[i + 1] < t) i++;
    const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
function sampler(keys, idle) {
  const out = {};
  const filled = [];
  let last = null;
  for (const k of keys) {
    const f = { t: k.t };
    for (const c in CH) f[c] = k[c] !== undefined ? k[c] : k.idle ? idle[c] : last ? last[c] : idle[c];
    filled.push(f);
    last = f;
  }
  const ts = filled.map((f) => f.t);
  for (const c in CH) {
    const fns = [];
    for (let j = 0; j < CH[c]; j++) fns.push(mono(ts, filled.map((f) => (CH[c] === 1 ? f[c] : f[c][j]))));
    out[c] = CH[c] === 1 ? fns[0] : (t) => fns.map((fn) => fn(t));
  }
  // a foot that moves between two keys lifts on the way
  for (const side of ['fl', 'fr']) {
    const segs = [];
    for (let i = 0; i < filled.length - 1; i++) {
      const a = filled[i][side], b = filled[i + 1][side], dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (dd > 0.008) segs.push([filled[i].t, filled[i + 1].t, Math.min(0.045, 0.02 + dd * 0.35)]);
    }
    out[side + 'Lift'] = (t) => {
      for (const [a, b, L] of segs) if (t > a && t < b) return L * Math.sin(Math.PI * (t - a) / (b - a));
      return 0;
    };
  }
  out.t0 = ts[0];
  out.t1 = ts[ts.length - 1];
  return out;
}
// the six basic clips (af1 to af6) and their blade sweeps for the slash shapes
function rigSolver(model, G, axis, base) {
  const Bn = (n) => model.getObjectByName(n);
  const par = model.parent, saved = [model.position.clone(), model.quaternion.clone(), model.scale.clone()];
  if (par) par.remove(model);
  model.position.set(0, 0, 0);
  model.quaternion.identity();
  model.scale.set(1, 1, 1);
  const names = ['hips', 'spine', 'chest', 'head', 'earL', 'earR', 'upperarmR', 'forearmR', 'handR', 'upperarmL', 'forearmL', 'handL', 'legL', 'footL', 'legR', 'footR', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
  const bones = names.map(Bn);
  const [hips, spine, chest, head, earL, earR, uR, fR, hR, uL, fL, hL, legL, footL, legR, footR] = bones;
  const tails = bones.slice(16);
  const mx = new AnimationMixer(model);
  mx.clipAction(base).play();
  mx.setTime(0);
  model.updateMatrixWorld(true);
  const rest = [];
  model.traverse((o) => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone()]); });
  const reset = () => { for (const [o, p, q] of rest) { o.position.copy(p); o.quaternion.copy(q); } model.updateMatrixWorld(true); };
  const W = (o) => new Vector3().setFromMatrixPosition(o.matrixWorld);
  const WQ = (o) => o.getWorldQuaternion(new Quaternion());
  const setW = (o, q) => { o.quaternion.copy(WQ(o.parent).invert().multiply(q)); o.updateMatrixWorld(true); };
  const rotW = (o, R) => setW(o, R.clone().multiply(WQ(o)));
  const E = (p, y, r) => new Quaternion().setFromEuler(new Euler(p * D, y * D, -r * D, 'YXZ'));
  const Gq = new Quaternion(), Gp = new Vector3(), Gs = new Vector3();
  new Matrix4().copy(G).decompose(Gp, Gq, Gs);
  const ax = new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
  // the edge runs along the blade's wider cross axis (x for this sword: 0.17 wide, 0.08 thick)
  const edgeL = new Vector3(axis === 'x' ? 0 : 1, 0, 0);
  const tipL = ax.clone(), baseL = ax.clone().multiplyScalar(0.3);
  const bladeW = (q) => ax.clone().applyQuaternion(Gq).applyQuaternion(q).normalize();
  const wpn = () => new Matrix4().copy(hR.matrixWorld).multiply(G);
  // the rest values: the idle hand, blade and feet; the open left paw of the idle (LPOSE)
  const R0 = { hips: W(hips), hipsQ: WQ(hips), footLQ: WQ(footL), footRQ: WQ(footR), head: WQ(head), handQ: WQ(hR), handL0: hR.quaternion.clone(), torsoW: [W(hips), W(head)], chestQ: WQ(chest) };
  const Lleg = W(legL).distanceTo(W(footL)), Rleg = W(legR).distanceTo(W(footR));
  const ankL = W(footL), ankR = W(footR);
  const idle = { h: W(hR).toArray(), b: bladeW(WQ(hR)).toArray(), pe: [-0.6, 0.2, -0.3], lg: 0, yaw: 0, pitch: 0, roll: 0, hx: 0, hz: 0, drop: 0, fl: [ankL.x, ankL.z], fr: [ankR.x, ankR.z], ear: 0, lift: 0, spin: 0, tumble: 0, flip: 0, tuck: 0 };
  for (const b of [uL, fL, hL]) b.quaternion.fromArray(LPOSE[b.name]);
  model.updateMatrixWorld(true);
  idle.lh = W(hL).toArray();
  reset();
  const legRest = { L: legL.position.clone(), R: legR.position.clone() };
  const two = (S, E1, Hd, lu, lf, pole, up, lo) => {
    const H = Hd.clone();
    const d = Math.min(H.distanceTo(S), (lu + lf) * 0.995);
    const dir = H.clone().sub(S).normalize();
    const Hc = S.clone().addScaledVector(dir, d);
    const along = (lu * lu - lf * lf + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, lu * lu - along * along));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const El = S.clone().addScaledVector(dir, along).addScaledVector(perp, hgt);
    aim(up, E1, El);
    aim(lo, lo.children.find((c) => c.isBone) || lo, Hc);
  };
  function aim(bone, child, target) {
    model.updateMatrixWorld(true);
    const P = W(bone), C = W(child);
    const dq = new Quaternion().setFromUnitVectors(C.sub(P).normalize(), target.clone().sub(P).normalize());
    setW(bone, dq.multiply(WQ(bone)));
  }
  // one pose of the timeline; returns what the clip tracks and the audits need
  // the sword arm at the hand's spot H, the paw turned to pq. Returns the elbow swing used.
  const foreAx = hR.position.clone().normalize();
  {
    // the idle elbow's side of the shoulder-to-hand line
    const S0 = W(uR), H0 = W(hR), E0 = W(fR), dir = H0.clone().sub(S0).normalize();
    const v = E0.clone().sub(S0);
    R0.elbowPole = v.addScaledVector(dir, -v.dot(dir)).normalize();
  }
  const segD = (p, a, b) => { const ab = b.clone().sub(a), u = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, u)); };
  function place(S0, H, want, phi, lu, lf, base) {
    const d = Math.min(H.distanceTo(S0), (lu + lf) * 0.995);
    const dir = H.clone().sub(S0).normalize();
    const Hc = S0.clone().addScaledVector(dir, d);
    const along = (lu * lu - lf * lf + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, lu * lu - along * along));
    // swing 0 is the idle's own elbow side (turned with the chest)
    const pole = R0.elbowPole.clone().applyQuaternion(WQ(chest).multiply(R0.chestQ.clone().invert()));
    const perp = pole.addScaledVector(dir, -pole.dot(dir)).normalize().applyAxisAngle(dir, phi * D);
    const El = S0.clone().addScaledVector(dir, along).addScaledVector(perp, hgt);
    for (const [o2, q2] of base) o2.quaternion.copy(q2);
    uR.updateMatrixWorld(true);
    aimF(uR, fR, El);
    aimF(fR, hR, Hc);
    // the forearm rolls (pronation, up to 95 degrees) to bring the blade as near its aim as it can;
    // the wrist turns the rest
    const fa = W(hR).sub(W(fR)).normalize();
    const b0 = bladeW(WQ(hR));
    const bp = b0.clone().addScaledVector(fa, -b0.dot(fa)), wp = want.clone().addScaledVector(fa, -want.dot(fa));
    let tau = bp.lengthSq() > 1e-6 && wp.lengthSq() > 1e-6 ? Math.atan2(fa.dot(new Vector3().crossVectors(bp, wp)), bp.dot(wp)) : 0;
    const tc = Math.max(-95 * D, Math.min(95 * D, tau));
    const b1 = b0.clone().applyAxisAngle(fa, tc);
    const wrist = b1.angleTo(want);
    return { tc, wrist, El };
  }
  function aimF(bone, child, target) {
    const P = W(bone), C = W(child);
    const dq = new Quaternion().setFromUnitVectors(C.sub(P).normalize(), target.clone().sub(P).normalize());
    setW(bone, dq.multiply(WQ(bone)));
  }
  const armCost = (r, c, prev) => {
    // the wrist's bend, the forearm's roll, a jump from the last sample, an elbow in the body or
    // across to his left
    let cost = r.wrist / D + 0.15 * Math.abs(r.tc / D) + 0.3 * Math.abs(c - prev);
    if (segD(r.El, R0.torsoW[0], R0.torsoW[1]) < 0.075) cost += 80;
    if (r.El.x > 0.04) cost += 40 * (r.El.x - 0.04) / 0.05;
    return cost;
  };
  function armR(H, want, o) {
    const S0 = W(uR), lu = W(fR).distanceTo(S0), lf = W(hR).distanceTo(W(fR));
    const base = [[uR, uR.quaternion.clone()], [fR, fR.quaternion.clone()], [hR, hR.quaternion.clone()]];
    let phi = o.phi ?? 0;
    if (o.search) {
      let best = Infinity;
      const prev = o.prevPhi ?? 0;
      for (let c = prev - 180; c <= prev + 180; c += 10) {
        const k = armCost(place(S0, H, want, c, lu, lf, base), c, prev);
        if (k < best) { best = k; phi = c; }
      }
      for (let c = phi - 8; c <= phi + 8; c += 2) {
        const k = armCost(place(S0, H, want, c, lu, lf, base), c, prev);
        if (k < best) { best = k; phi = c; }
      }
    }
    const r = place(S0, H, want, phi, lu, lf, base);
    fR.quaternion.multiply(new Quaternion().setFromAxisAngle(foreAx, r.tc));
    fR.updateMatrixWorld(true);
    // the paw: the least turn from where the arm holds the blade to the aim
    const qn = WQ(hR);
    setW(hR, new Quaternion().setFromUnitVectors(bladeW(qn), want).multiply(qn));
    return { phi, wrist: r.wrist, tc: r.tc };
  }
  const FLOOR = 0.06;
  const BL = (() => { const M = wpn(); return tipL.clone().applyMatrix4(M).distanceTo(new Vector3().applyMatrix4(M)) + 0.03; })();
  function solve(S, t, o = {}) {
    reset();
    const g = (c) => S[c](t);
    const yaw = g('yaw'), pitch = g('pitch'), roll = g('roll'), drop = g('drop');
    // hips: the weight shift, the drop, a third of the turn
    hips.position.copy(hips.parent.worldToLocal(R0.hips.clone().add(new Vector3(g('hx'), -drop, g('hz')))));
    hips.updateMatrixWorld(true);
    rotW(hips, E(0, yaw * 0.3, roll * 0.2));
    // the legs: each ankle on its floor spot; the leg root slides along the hips' up to keep the leg's
    // length (as the passed clips' legL/legR positions do), the foot stays flat and turns a little
    const hipUp = new Vector3(0, 1, 0).applyQuaternion(WQ(hips));
    for (const [leg, foot, L, side, ank, fq] of [[legL, footL, Lleg, 'fl', ankL, R0.footLQ], [legR, footR, Rleg, 'fr', ankR, R0.footRQ]]) {
      const f = g(side), lift = S[side + 'Lift'](t);
      const T = new Vector3(f[0], ank.y + lift + Math.max(0, g('tuck')), f[1]);
      leg.position.copy(legRest[side === 'fl' ? 'L' : 'R']);
      model.updateMatrixWorld(true);
      const r0 = W(leg).sub(T), b = hipUp.dot(r0), c = r0.lengthSq() - L * L, disc = b * b - c;
      const r = Math.max(-0.03, Math.min(0.16, disc >= 0 ? -b + Math.sqrt(disc) : -b));
      leg.position.y += r;
      aim(leg, foot, T);
      setW(foot, E(0, yaw * 0.25, 0).multiply(fq));
    }
    // the trunk: the rest of the turn, the lean and the side bend in the spine and the chest
    rotW(spine, E(pitch * 0.45, yaw * 0.3, roll * 0.5));
    rotW(chest, E(pitch * 0.55, yaw * 0.4, roll * 0.5));
    // the head leads the turn a little and keeps on the foe
    const yawLead = S.yaw(Math.min(S.t1, t + 0.05));
    setW(head, E(pitch * 0.2, yawLead * 0.25, roll * 0.25).multiply(R0.head));
    // the sword: the blade's aim, lifted if its point would go into the floor; then the arm (the
    // elbow's swing about the shoulder-to-hand line is chosen so the wrist bends least: o.search)
    model.updateMatrixWorld(true);
    const H = new Vector3(...g('h'));
    let want = new Vector3(...g('b')).normalize();
    if (H.y + BL * want.y < FLOOR) {
      const y = Math.max(-0.98, (FLOOR - H.y) / BL), xz = Math.hypot(want.x, want.z) || 1, k = Math.sqrt(1 - y * y) / xz;
      want = new Vector3(want.x * k, y, want.z * k).normalize();
    }
    const arm = armR(H, want, o);
    const M = wpn();
    const tip = tipL.clone().applyMatrix4(M), bas = baseL.clone().applyMatrix4(M), grip = new Vector3().applyMatrix4(M);
    const edge = edgeL.clone().applyQuaternion(Gq).applyQuaternion(WQ(hR)).normalize();
    // the left paw: its own spot, or on the grip below the sword paw (lg 1)
    const lg = Math.max(0, Math.min(1, g('lg')));
    const gripL = grip.clone().addScaledVector(want, -0.035);
    const lt = new Vector3(...g('lh')).lerp(gripL, lg);
    two(W(uL), fL, lt, W(fL).distanceTo(W(uL)), W(hL).distanceTo(W(fL)), new Vector3(0.6, -0.1 - 0.5 * lg, -0.3 + 0.5 * lg).normalize(), uL, fL);
    // ears: back on the effort, and they drag behind the head's turn
    const ear = g('ear'), dYaw = (S.yaw(t) - S.yaw(Math.max(S.t0, t - 0.03))) / 0.03;
    const headQ = WQ(head);
    for (const [eb, s] of [[earL, 1], [earR, -1]]) {
      const back = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0).applyQuaternion(headQ), -ear * 22 * D);
      const drag = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.max(-18, Math.min(18, -dYaw * 0.05)) * D);
      rotW(eb, drag.multiply(back));
      void s;
    }
    // the tail drags behind the hips' turn and the weight shift, and rises on the hit
    const hy = (tt) => 0.3 * S.yaw(Math.max(S.t0, tt));
    const effort = ear;
    tails.forEach((tb, i) => {
      const lag = 0.035 * (i + 1);
      const dragY = -(hy(t) - hy(t - lag)) * 0.55 - 0.05 * yaw - g('hx') * 120;
      const lift = (-(drop * 40) + effort * 4) * (i < 3 ? 1 : 0.6);
      rotW(tb, new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), dragY * D).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0).applyQuaternion(WQ(hips)), lift * D)));
    });
    const qs = bones.map((bn) => bn.quaternion.clone());
    return { qs, hipsP: hips.position.clone(), legP: [legL.position.clone(), legR.position.clone()], tip, bas, grip, edge, want, phi: arm.phi, wrist: arm.wrist, tc: arm.tc };
  }
  // one pass on a timeline: the elbow swing that bends the wrist least, then smoothed (zero phase)
  function phiTrack(S, DT) {
    const N = Math.round((S.t1 - S.t0) / DT) + 1;
    const ph = new Float64Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) { ph[i] = solve(S, S.t0 + i * DT, { search: true, prevPhi: prev }).phi; prev = ph[i]; }
    for (let pass = 0; pass < 2; pass++) {
      const k = 1 - Math.exp(-DT / 0.015);
      for (let i = 1; i < N; i++) ph[i] = ph[i - 1] + (ph[i] - ph[i - 1]) * k;
      for (let i = N - 2; i >= 0; i--) ph[i] = ph[i + 1] + (ph[i] - ph[i + 1]) * k;
    }
    return (t) => { const x = Math.max(0, Math.min(N - 1, (t - S.t0) / DT)), i = Math.floor(x), f = x - i; return ph[i] * (1 - f) + ph[Math.min(N - 1, i + 1)] * f; };
  }
  // a clip from timeline samples: the solved bones, the hips and the leg roots; other tracks idle
  const mine = new Set(names.map((bn) => bn + '.quaternion').concat(['hips.position', 'legL.position', 'legR.position']));
  function bake(name, samples, T) {
    const times = [], out = bones.map(() => []), hipsP = [], legLP = [], legRP = [];
    for (const [t, P] of samples) {
      times.push(t);
      P.qs.forEach((q, j) => out[j].push(q.x, q.y, q.z, q.w));
      hipsP.push(P.hipsP.x, P.hipsP.y, P.hipsP.z);
      legLP.push(P.legP[0].x, P.legP[0].y, P.legP[0].z);
      legRP.push(P.legP[1].x, P.legP[1].y, P.legP[1].z);
    }
    const clip = slice(base, name, 0, Math.min(T, base.duration - 1e-3), Math.min(T, base.duration - 1e-3) / T);
    clip.tracks = clip.tracks.filter((tr) => !mine.has(tr.name));
    names.forEach((bn, j) => clip.tracks.push(new QuaternionKeyframeTrack(bn + '.quaternion', times, out[j])));
    clip.tracks.push(new VectorKeyframeTrack('hips.position', times, hipsP));
    clip.tracks.push(new VectorKeyframeTrack('legL.position', times, legLP));
    clip.tracks.push(new VectorKeyframeTrack('legR.position', times, legRP));
    clip.duration = T;
    return clip;
  }
  function finish() {
    mx.stopAllAction();
    mx.uncacheRoot(model);
    reset();
    model.position.copy(saved[0]);
    model.quaternion.copy(saved[1]);
    model.scale.copy(saved[2]);
    if (par) par.add(model);
  }
  return { solve, idle, phiTrack, bake, finish, E };
}
// the whole-body move at a time of a timeline, as a matrix in model space (about the hips)
function bodyM(S, t, E) {
  const pc = new Vector3(0, BODY_PIVOT, 0);
  const q = E(S.flip(t), S.spin(t), S.tumble(t));
  return new Matrix4().makeTranslation(0, S.lift(t), 0).multiply(new Matrix4().makeTranslation(pc.x, pc.y, pc.z)).multiply(new Matrix4().makeRotationFromQuaternion(q)).multiply(new Matrix4().makeTranslation(-pc.x, -pc.y, -pc.z));
}
// 2.0: one clip per skill from its keys (absolute times from the press, idle at both ends). Returns
// the clips, the blade's sweeps (guard and tip, whole-body move included) and the whole-body curves
// [lift, spin, tumble, flip] at 120 a second for the rig to play.
export function skillClips(model, G, axis, base, defs) {
  const { solve, idle, phiTrack, bake, finish, E } = rigSolver(model, G, axis, base);
  const clips = {}, sweeps = {}, body = {};
  const DT = 1 / 120;
  for (const name in defs) {
    const S = sampler(defs[name].keys.slice().sort((a, b) => a.t - b.t), idle);
    const phAt = phiTrack(S, DT);
    const T = S.t1, n = Math.round(T / DT);
    // the paw eases back to its rest turn over the last 0.15 s
    const pe = phAt(T - 0.15), pw = pe - 360 * Math.round(pe / 360);
    const samples = [], sw = [], bd = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * T;
      const phi = t < T - 0.15 ? phAt(t) - (pe - pw) * sm(T - 0.6, T - 0.15, t) : pw * (1 - sm(T - 0.15, T, t));
      const P = solve(S, t, { phi });
      samples.push([t, P]);
      const M = bodyM(S, t, E);
      const b = P.bas.clone().applyMatrix4(M), tp = P.tip.clone().applyMatrix4(M);
      sw.push([b.x, b.y, b.z, tp.x, tp.y, tp.z]);
      bd.push([S.lift(t), S.spin(t), S.tumble(t), S.flip(t)]);
    }
    clips[name] = bake(name, samples, T);
    sweeps[name] = { dt: T / n, pts: sw };
    body[name] = { dt: T / n, v: bd };
  }
  finish();
  return { clips, sweeps, body };
}
export function comboClips(model, G, axis, base) {
  const { solve, idle, phiTrack, bake, finish } = rigSolver(model, G, axis, base);
  const cont = sampler(COMBO_KEYS, idle);
  const DT = 1 / 120;
  const phAt = phiTrack(cont, DT);
  const clips = {}, sweeps = {}, audit = {};
  const settle = 0.3;
  for (let c = 0; c < 6; c++) {
    const s0 = CUT_S[c], h1 = COMBO_HAND[c];
    let S = cont, tEnd = h1;
    if (c < 5) {
      // the settle when the combo stops after this hit: the hand-off pose, a guard, then idle
      const ks = COMBO_KEYS.filter((k) => k.t < h1 - 1e-6);
      const mid = { t: h1 + 0.13 };
      const f = 0.4;
      const hoF = {};
      for (const ch in CH) hoF[ch] = cont[ch](h1);
      for (const ch in CH) mid[ch] = CH[ch] === 1 ? hoF[ch] * f + idle[ch] * (1 - f) : hoF[ch].map((v, j) => v * f + idle[ch][j] * (1 - f));
      mid.fl = idle.fl;
      mid.fr = idle.fr;
      const rk = sampler([...ks, { t: h1, ...hoF }, mid, { t: h1 + settle, idle: true }], idle);
      const both = {};
      for (const ch in rk) both[ch] = typeof rk[ch] === 'function' ? (t) => (t <= h1 ? cont[ch](t) : rk[ch](t)) : rk[ch];
      both.t0 = 0;
      both.t1 = h1 + settle;
      S = both;
      tEnd = h1 + settle;
    }
    const T = tEnd - s0, n1 = Math.max(1, Math.round((h1 - s0) / DT)), n2 = c < 5 ? Math.round(settle / DT) : 0;
    const samples = [], sw = [];
    // the clip's own samples: exactly on its start and its hand-off, then the settle
    const phH = phAt(h1), phW = phH - 360 * Math.round(phH / 360);
    for (let i = 0; i <= n1 + n2; i++) {
      const t = i <= n1 ? s0 + (i / n1) * (h1 - s0) : h1 + ((i - n1) / n2) * settle;
      // up to the hand-off the clip is the timeline's own; after it the paw eases back to its rest turn
      const on = t <= h1 + 1e-6;
      const P = on
        ? solve(S, t, { phi: phAt(t) })
        : solve(S, t, { phi: phW * (1 - sm(h1, h1 + settle * 0.9, t)) });
      samples.push([t - s0, P]);
      sw.push([P.bas.x, P.bas.y, P.bas.z, P.tip.x, P.tip.y, P.tip.z]);
    }
    const name = 'af' + (c + 1);
    clips[name] = bake(name, samples, T);
    sweeps[name] = { dt: DT, pts: sw };
  }
  finish();
  return { clips, sweeps, audit };
}

// 2.0: the kit 2.0 skill motions (tripoFoxSkills.js); each { keys, cues: [[t, kind, ev]] }
export const SKILL20 = SKILL20_DEFS;

export function attachTripoFox({ yawGroup, rig, group }) {
  const st = { model: null, mixer: null, A: {}, act: null, actT: 0, actEnd: 0, loco: 0, run: 0, last: null, flip: 0, flipWant: 0 };
  rig.visible = false;
  if (typeof window !== 'undefined') { window.__tripoFox = st; (window.__tripoFoxSts ||= []).push(st); }
  const inner = new Group(); // lifts for the hops
  yawGroup.add(inner);
  const orbMeshes = [];
  let edge = null; // the blade's element glow
  let bodyMats = [], swordMats = [];

  load().then((g) => {
    const m = skClone(g.scene);
    m.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.castShadow = true;
      }
    });
    inner.add(m);
    st.model = m;
    st.mixer = new AnimationMixer(m);
    const clips = {};
    // the sword never takes the clips' own tracks: it rides the paw (G below)
    for (const c of g.animations) {
      const k = c.clone();
      k.tracks = k.tracks.filter((t) => !t.name.startsWith('weapon.'));
      clips[c.name] = k;
    }
    st.weapon = m.getObjectByName('weapon');
    st.handR = m.getObjectByName('handR');
    st.handL = m.getObjectByName('handL');
    st.fingersL = m.getObjectByName('fingersL');
    st.lArm = ['upperarmL', 'forearmL', 'handL'].map((n) => m.getObjectByName(n));
    st.lp = 0;
    // the grip: read from the idle clip's first frame (sword in paw)
    {
      const idle = g.animations.find((c) => c.name === 'idle');
      const mx = new AnimationMixer(m);
      mx.clipAction(idle).play();
      mx.update(0);
      m.updateMatrixWorld(true);
      st.G = new Matrix4().copy(st.handR.matrixWorld).invert().multiply(st.weapon.matrixWorld);
      mx.stopAllAction();
      mx.uncacheRoot(m);
      // the blade's long axis and tip, in the sword's own space
      st.weapon.geometry ??= st.weapon.children.find((o) => o.isMesh)?.geometry;
      const geo = st.weapon.isMesh ? st.weapon.geometry : st.weapon.children.find((o) => o.isMesh)?.geometry;
      geo.computeBoundingBox();
      const bb = geo.boundingBox, ext = new Vector3().subVectors(bb.max, bb.min);
      const ax = ext.x > ext.y && ext.x > ext.z ? 'x' : ext.y > ext.z ? 'y' : 'z';
      // the tip is the end farther from the grip (the sword's origin sits at the grip)
      const tipEnd = Math.abs(bb.max[ax]) > Math.abs(bb.min[ax]) ? bb.max[ax] : bb.min[ax];
      st.tipL = new Vector3();
      st.tipL[ax] = tipEnd;
      st.baseL = new Vector3();
      st.baseL[ax] = tipEnd * 0.4;
      st.guardL = new Vector3();
      st.guardL[ax] = tipEnd * 0.3;
      st.axis = ax;
      st.pommelL = new Vector3();
      st.pommelL[ax] = Math.abs(bb.max[ax]) > Math.abs(bb.min[ax]) ? bb.min[ax] : bb.max[ax];
    }
    addClips(clips);
    st.clips = clips;
    for (const name in clips) st.A[name] = st.mixer.clipAction(clips[name]);
    for (const n of ['idle', 'walk', 'walkBack', 'walkLeft', 'walkRight', 'run', 'runBack', 'runLeft', 'runRight']) {
      const a = st.A[n];
      if (!a) continue;
      a.setLoop(LoopRepeat, Infinity).play();
      a.setEffectiveWeight(0);
    }
    m.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive) {
        o.material = o.material.clone();
        const rec = { m: o.material, e: o.material.emissive.clone(), c: o.material.color.clone(), op: o.material.opacity };
        if (o === st.weapon || o.parent === st.weapon) swordMats.push(rec);
        else bodyMats.push(rec);
      }
    });
    // kit 2.1 (K19): the will marks are ghost swords at his shoulders (ghosts below), nothing at the left paw
    trail.init(m.parent);
  });

  // ---- the new moves, built from the passed ones (kit S8)
  function addClips(C) {
    // wave throw: the passed crescent cut, drawn quicker (every crescent)
    C.waveThrow = slice(C.castSweep, 'waveThrow', 0.1, 0.86, 1.25);
    // pommel bash (Hilt Bash): the lunge's short drive, the sword turned in the paw so the pommel leads
    C.pommel = slice(C.castPoint, 'pommel', 0.04, 0.8, 1.3);
    // floor drag (Ground Wave): low on the free-side foot like the caltrops throw, the point down at the floor, then up and out
    C.floorDrag = chain('floorDrag', [[C.castPlant, 0.0, 0.3, 1.0], [C.combo2, 0.0, 0.44, 1.0], [C.combo2, 0.44, 0.44, 1]]);
    C.floorDrag = overlay(C.floorDrag, 'floorDrag', { spine: (t) => [18 * sm(0.1, 0.25, t) * (1 - sm(0.45, 0.7, t)), 0, 0], _hips: (t) => [0, -0.05 * sm(0.1, 0.25, t) * (1 - sm(0.45, 0.7, t)), 0] });
    // upward flick (Blade Rain): the edge draw's blade to the sky, sharp
    C.flick = slice(C.castBloom, 'flick', 0.14, 1.1, 1.5);
    // hop with a throw (Tide Crescent): the crescent cut in the air (the hop is the body lift)
    C.hopThrow = overlay(slice(C.castSweep, 'hopThrow', 0.12, 0.86, 1.2), 'hopThrow', { legL: (t) => [-30 * Math.sin(Math.PI * Math.min(1, t / 0.36)), 0, 0], legR: (t) => [-20 * Math.sin(Math.PI * Math.min(1, t / 0.36)), 0, 0] });
    // three-wave draw (Triple Crescent): the salute draw, then three cuts a quarter second apart
    C.tripleDraw = chain('tripleDraw', [[C.castBloom, 0.0, 0.24, 0.62], [C.castSweep, 0.2, 0.34, 1.0], [C.combo2, 0.02, 0.2, 1.0], [C.castSweep, 0.22, 0.86, 1.0]]);
    // Flurry: four fast cuts in 0.4 s (forehand and backhand by turns)
    C.flurry = chain('flurry', [[C.combo1, 0.12, 0.3, 1.8], [C.combo2, 0.0, 0.18, 1.8], [C.combo1, 0.12, 0.3, 1.8], [C.combo2, 0.0, 0.44, 1.8]]);
    // the blur's cut (Thousand Cuts): a quick forehand or backhand
    C.blurA = slice(C.combo1, 'blurA', 0.14, 0.34, 1.6);
    C.blurB = slice(C.combo2, 'blurB', 0.0, 0.2, 1.6);
    // a rising cut (Crescent Finisher)
    C.rising = slice(C.combo2, 'rising', 0.0, 0.44, 0.8);
    // 1.5: the new basic combo, posed from Kesh's reel (S12)
    // 1.8: the six hits as one continuous path (comboClips); st.sweeps feeds the slash shapes
    { const cc = comboClips(st.model, st.G, st.axis, C.idle); Object.assign(C, cc.clips); st.sweeps = cc.sweeps; }
    if (Object.keys(SKILL20).length) {
      const sc = skillClips(st.model, st.G, st.axis, C.idle, SKILL20);
      Object.assign(C, sc.clips);
      Object.assign(st.sweeps, sc.sweeps);
      st.body = sc.body;
    }
    C.flowing = posedClip(st.model, st.G, st.axis, C.idle, 'flowing', FLOW_KEYS);
    for (const k in SKILL16_KEYS) C[k] = posedClip(st.model, st.G, st.axis, C.idle, k, SKILL16_KEYS[k]);
    // 1.5 Earthsplitter: the blade raised to the sky and held while it charges (up to 1.5 s), then the slam
    C.chargeHold = chain('chargeHold', [[C.castBloom, 0.14, 0.55, 1.2], [C.castBloom, 0.55, 0.57, 0.0125]]);
    C.slam = overlay(slice(C.combo1, 'slam', 0.04, 0.54, 1.15), 'slam', {
      spine: (t) => [30 * sm(0.1, 0.2, t) * (1 - sm(0.32, 0.44, t)), 0, 0],
      _hips: (t) => [0, -0.07 * sm(0.1, 0.2, t) * (1 - sm(0.32, 0.44, t)), 0],
    });
  }

  function start(name, { from = 0, speed = 1, end = null, flip = false } = {}) {
    const a = st.A[name];
    if (!a) return;
    // 1.8: a basic hit that follows a basic hit starts where the last one is (the clips share one
    // path), so there is no ramp from idle; the last one holds and fades out over 35 ms to cover
    // the tick the sim's hand-off can be off by
    const chain = st.act && st.act !== a && /^af\d$/.test(st.actName || '') && /^af\d$/.test(name) && st.actT > 0.03;
    if (st.prev) { st.prev.a.stop(); st.prev = null; }
    if (chain) { st.prev = { a: st.act, w: 1 }; st.act.paused = true; }
    else if (st.act && st.act !== a) st.act.stop();
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = speed;
    a.time = from;
    a.play();
    st.act = a;
    st.actName = name;
    st.actT = chain ? 1 : 0;
    st.actEnd = end ?? a.getClip().duration;
    st.flipWant = flip ? 1 : 0;
    // 2.0: the clip's own cues (the sword tossed, ...), fired as the clip passes their times
    st.cueList = ((SKILL20[name] && SKILL20[name].cues) || []).map(([t, k, ev]) => ({ t, k, ev: ev || {}, done: t < from - 1e-4 }));
  }

  let dashT = -1, dashFace = null, dashLen = 1.0;
  const hop = { t: -1, secs: 0.4, h: 0.5, y: 0 };
  let blur = 0, blurWant = 0, faceYaw = null, faceUntil = 0;
  // 1.5: the sword grows (Earthsplitter), spins in the paw (剑花) and is thrown (the last basic hit)
  const sw = { s: 1, from: 1, to: 1, t: 1, secs: 1, spin: false, spinA: 0, thrown: null };
  const tv = new Vector3(), tv2 = new Vector3();
  function cue(kind, ev) {
    if (!st.model) return;
    if (kind === 'play') start(ev.clip, ev);
    else if (kind === 'dash') {
      start(!ev.el && st.A.dash20 ? 'dash20' : 'dash', { from: ev.from || 0, speed: ev.speed || 1 });
      dashFace = Math.atan2(ev.dx, ev.dz);
      dashT = 0;
      dashLen = ev.len || 1.0;
    } else if (kind === 'hop') {
      hop.t = 0;
      hop.secs = ev.secs || 0.4;
      hop.h = ev.h ?? 0.45;
    } else if (kind === 'blur') blurWant = ev.on ? 1 : 0;
    else if (kind === 'face') {
      faceYaw = Math.atan2(ev.dx, ev.dz);
      faceUntil = ev.secs || 0.3;
    } else if (kind === 'orbs') ghostCue(ev);
    else if (kind === 'ghostAway') {
      for (const g of ghosts) if (!g.dying && ev.slots.includes(g.slot)) g.awayUntil = now() + ev.secs;
    } else if (kind === 'ghostsTo') {
      for (const g of ghosts) if (g.spend && !g.spend.to) { g.spend.to = new Vector3(ev.x, ev.y ?? 0.9, ev.z); g.spend.t = 0; g.spend.secs = ev.secs || 0.25; g.spend.p0 = g.pivot.position.clone(); }
    } else if (kind === 'ghostFlick') {
      for (const g of ghosts) if (!g.dying && ev.slots.includes(g.slot)) g.flick = 0.001;
    } else if (kind === 'edge') edge = ev.el ? { c: new Color(ELEM[ev.el] || ev.el), k: 0, until: ev.secs ?? 0.6, t: 0 } : null;
    else if (kind === 'trail') trail.color(ev.color, ev.on !== false);
    else if (kind === 'swordScale') { sw.from = sw.s; sw.to = ev.to; sw.t = 0; sw.secs = ev.secs || 0.3; }
    else if (kind === 'flower') sw.spin = !!ev.on;
    else if (kind === 'toss') {
      // 2.0: the sword leaves the paw, turns end over end on an arc and comes back to the paw
      if (st.free) st.free.obj.parent?.remove(st.free.obj);
      const obj = st.weapon.clone();
      let top = group;
      while (top.parent) top = top.parent;
      const ws = new Vector3(), wp = new Vector3(), wq = new Quaternion();
      st.weapon.matrixWorld.decompose(wp, wq, ws);
      obj.scale.copy(ws);
      // pivot at the blade's middle
      const mid = st.tipL.clone().multiplyScalar(0.5);
      obj.position.copy(mid).multiply(ws).negate();
      const pivot = new Group();
      pivot.add(obj);
      pivot.position.copy(mid.clone().multiply(ws).applyQuaternion(wq).add(wp));
      pivot.quaternion.copy(wq);
      top.add(pivot);
      const side = new Vector3(1, 0, 0).applyQuaternion(st.model.getWorldQuaternion(new Quaternion()));
      st.free = { obj: pivot, t: 0, secs: ev.secs || 0.6, h: ev.h ?? 0.9, turns: ev.turns ?? 2, from: pivot.position.clone(), q0: wq.clone(), side };
      st.weapon.visible = false;
    } else if (kind === 'throwOut') {
      // kit 2.1 (K21): the newest ghost sword leaves his shoulder; with no mark a plain Moon Silver one
      if (sw.thrown) { sw.thrown.gs.pivot.parent?.remove(sw.thrown.gs.pivot); sw.thrown = null; }
      if (!drawn()) return;
      const owner = ev.plain ? null : ghosts.find((g) => !g.dying && !g.spend && g.slot === 1) || null;
      const gs = ghostSword(ev.plain ? 'plain' : ev.el, 0.85);
      gs.pivot.scale.setScalar(GHOST_S);
      if (owner) owner.thrown = true;
      sw.thrown = { gs, t: 0, ev, owner };
    }
  }
  // ---- the blade's trail: a ribbon between the blade's base and tip over the last frames
  const trail = (() => {
    const N = 14;
    let mesh = null, geo = null, pts = [], on = false, col = new Color('#E8577A'), parent = null;
    const ta = new Vector3(), tb = new Vector3();
    return {
      init(p) {
        parent = p;
        geo = new BufferGeometry();
        geo.setAttribute('position', new BufferAttribute(new Float32Array(N * 2 * 3), 3));
        geo.setAttribute('alpha', new BufferAttribute(new Float32Array(N * 2), 1));
        const idx = [];
        for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        geo.setIndex(idx);
        const mat = new MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false, blending: AdditiveBlending, vertexColors: false });
        mat.onBeforeCompile = (s) => {
          s.vertexShader = s.vertexShader.replace('void main() {', 'attribute float alpha; varying float vA; void main() { vA = alpha;');
          s.fragmentShader = s.fragmentShader.replace('void main() {', 'varying float vA; void main() {').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vA );');
        };
        mesh = new Mesh(geo, mat);
        mesh.frustumCulled = false;
        mesh.renderOrder = 5;
      },
      color(c, o) {
        if (c) col.set(c);
        if (mesh) mesh.material.color.copy(col);
        on = o;
      },
      sample(world) {
        if (!mesh || !st.weapon) return;
        if (!mesh.parent && world) world.add(mesh);
        ta.copy(st.baseL).applyMatrix4(st.weapon.matrixWorld);
        tb.copy(st.tipL).applyMatrix4(st.weapon.matrixWorld);
        pts.unshift([ta.clone(), tb.clone()]);
        if (pts.length > N) pts.length = N;
        const P = geo.attributes.position.array, A = geo.attributes.alpha.array;
        // only a fast blade leaves a trail
        let speed = 0;
        if (pts.length > 1) speed = pts[0][1].distanceTo(pts[1][1]) / Math.max(1 / 120, st.lastDt || 1 / 60);
        const vis = on && st.act ? Math.min(1, Math.max(0, (speed - 2.2) / 4)) : 0;
        mesh.userData.vis = (mesh.userData.vis || 0) * 0.6 + vis * 0.4;
        for (let i = 0; i < N; i++) {
          const p = pts[Math.min(i, pts.length - 1)];
          P.set([p[0].x, p[0].y, p[0].z, p[1].x, p[1].y, p[1].z], i * 6);
          const a = (1 - i / (N - 1)) ** 1.4 * mesh.userData.vis;
          A[i * 2] = a * 0.35;
          A[i * 2 + 1] = a;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.alpha.needsUpdate = true;
      },
    };
  })();
  st.trail = trail;
  // 2.0: where he stands without the whole-body move (the sweeps are baked with it)
  st.restMatrix = () => { yawGroup.updateMatrixWorld(true); st.model.updateMatrix(); return yawGroup.matrixWorld.clone().multiply(new Matrix4().makeTranslation(0, hop.t >= 0 ? hop.y : 0, 0)).multiply(st.model.matrix); };

  // a still copy of him in this frame's pose (Mirror Image, the blur's afterimages)
  st.snapshot = (mat) => {
    if (!st.model) return null;
    const c = skClone(st.model);
    const src = {}, dst = {};
    st.model.traverse((o) => { if (o.isBone || o.name) src[o.name] = o; });
    c.traverse((o) => {
      const s = src[o.name];
      if (s && o !== c) {
        o.position.copy(s.position);
        o.quaternion.copy(s.quaternion);
        o.scale.copy(s.scale);
      }
      if (o.isMesh) {
        o.material = mat;
        o.frustumCulled = false;
        o.castShadow = false;
      }
      dst[o.name] = o;
    });
    const w = new Group();
    w.add(c);
    st.model.updateMatrixWorld(true);
    st.model.matrixWorld.decompose(w.position, w.quaternion, w.scale);
    c.position.set(0, 0, 0);
    c.quaternion.identity();
    c.scale.set(1, 1, 1);
    return w;
  };


  // 2.1 (MOTIONS M26): a sword spirit, a large image of him in the colours of a special's two
  // wills (body in the first, edge in the second); it plays his clips on its own, so his hands stay free
  const ghostMat = (cA, cB, op) => new ShaderMaterial({
    uniforms: { cA: { value: new Color(cA) }, cB: { value: new Color(cB) }, op: { value: op } },
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vN; varying vec3 vV;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vN = normalMatrix * objectNormal;
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 cA; uniform vec3 cB; uniform float op;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float l = max(1e-4, length(vN) * length(vV));
        float f = pow(clamp(1.0 - abs(dot(vN, vV)) / l, 0.0, 1.0), 1.5);
        vec3 c = clamp(mix(cA * 0.9, cB * 1.15 + 0.08, f), 0.0, 1.0);
        gl_FragColor = vec4(c, clamp(op * (0.38 + 0.62 * f), 0.0, 1.0));
      }`,
    transparent: true, depthWrite: false, blending: NormalBlending,
  });
  st.spirit = ({ colA, colB = colA, scale = 1.5, op = 0.6, swordA = '#FFFFFF', swordB = colB, swordL = null } = {}) => {
    if (!st.model || !st.clips) return null;
    const c = skClone(st.model);
    const drop = [];
    c.traverse((o) => { if (o.isSprite) drop.push(o); });
    drop.forEach((o) => o.parent && o.parent.remove(o));
    const body = ghostMat(colA, colB, op), blade = ghostMat(swordA, swordB, Math.min(1, op * 1.3));
    const wpn = c.getObjectByName('weapon'), hand = c.getObjectByName('handR');
    c.traverse((o) => {
      if (!o.isMesh) return;
      let w = false;
      for (let p = o; p; p = p.parent) if (p === wpn) { w = true; break; }
      o.material = w ? blade : body;
      o.frustumCulled = false;
      o.castShadow = false;
      o.renderOrder = 3;
    });
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    const root = new Group(), mid = new Group();
    mid.add(c);
    root.add(mid);
    const wsc = new Vector3();
    st.model.getWorldScale(wsc);
    root.scale.setScalar(scale * wsc.y);
    c.scale.set(1, 1, 1);
    const mixer = new AnimationMixer(c);
    // K23: the second ghost sword in its left paw, along the forearm and up
    let wL = null, bladeL = null;
    const handL2 = c.getObjectByName('handL'), foreL2 = c.getObjectByName('forearmL');
    if (swordL) {
      bladeL = ghostMat(swordL, swordL, Math.min(1, op * 1.3));
      wL = wpn.clone();
      wL.traverse((o) => { if (o.isMesh) { o.material = bladeL; o.frustumCulled = false; o.renderOrder = 3; } });
      wpn.parent.add(wL);
    }
    const S = { root, mixer, act: null, name: null, wScale: 1, wTo: 1, wT: 1, wSecs: 0.2, dead: false, mats: [body, blade], fade: 1, flipped: false };
    S.play = (name, { speed = 1, from = 0, hold = true } = {}) => {
      const clip = st.clips[name];
      if (!clip) return;
      const a = mixer.clipAction(clip);
      if (S.act && S.act !== a) S.act.stop();
      a.reset();
      a.setLoop(LoopOnce, 1);
      a.clampWhenFinished = hold;
      a.timeScale = speed;
      a.time = from;
      a.play();
      S.act = a;
      S.name = name;
    };
    S.freeze = () => { if (S.act) S.act.timeScale = 0; };
    S.sword = (to, secs = 0.2) => { S.wFrom = S.wScale; S.wTo = to; S.wT = 0; S.wSecs = secs; };
    S.opacity = (k) => { S.fade = k; body.uniforms.op.value = op * k; blade.uniforms.op.value = Math.min(1, op * 1.3) * k; if (bladeL) bladeL.uniforms.op.value = Math.min(1, op * 1.3) * k; };
    S.dispose = () => { S.dead = true; mixer.stopAllAction(); root.parent && root.parent.remove(root); };
    const M = new Matrix4();
    S.tick = (dt) => {
      if (!root.parent) { S.dead = true; mixer.stopAllAction(); return; }
      mixer.update(dt);
      const B = S.act && st.body && st.body[S.name];
      if (B) {
        const x = Math.max(0, Math.min(B.v.length - 1, S.act.time / B.dt)), i = Math.floor(x), f = x - i;
        const a0 = B.v[i], a1 = B.v[Math.min(B.v.length - 1, i + 1)], v = a0.map((q, j) => q + (a1[j] - q) * f);
        const bq = new Quaternion().setFromEuler(new Euler(v[3] * D, v[1] * D, -v[2] * D, 'YXZ'));
        const pc = new Vector3(0, BODY_PIVOT, 0);
        mid.quaternion.copy(bq);
        mid.position.copy(pc).sub(pc.clone().applyQuaternion(bq));
        mid.position.y += v[0];
      } else { mid.quaternion.identity(); mid.position.set(0, 0, 0); }
      if (S.wT < 1) { S.wT = Math.min(1, S.wT + dt / S.wSecs); S.wScale = S.wFrom + (S.wTo - S.wFrom) * sm(0, 1, S.wT); }
      c.updateMatrixWorld(true);
      M.copy(wpn.parent.matrixWorld).invert().multiply(hand.matrixWorld).multiply(st.G);
      if (S.flipped) {
        const axis = new Vector3(st.axis === 'x' ? 0 : 1, 0, st.axis === 'x' ? 1 : 0);
        M.multiply(new Matrix4().makeRotationAxis(axis, Math.PI));
      }
      if (Math.abs(S.wScale - 1) > 0.001) {
        // a great sword grows mostly in length; its width and thickness grow by a third as much
        const w = 1 + (S.wScale - 1) * 0.33, v = new Vector3(w, w, w);
        v[st.axis] = S.wScale;
        M.multiply(new Matrix4().makeScale(v.x, v.y, v.z));
      }
      M.decompose(wpn.position, wpn.quaternion, wpn.scale);
      if (wL) {
        const ph = new Vector3().setFromMatrixPosition(handL2.matrixWorld), pf = new Vector3().setFromMatrixPosition(foreL2.matrixWorld);
        const up = new Vector3(0, 1, 0), d = ph.clone().sub(pf).normalize().addScaledVector(up, 0.9).normalize();
        const ws = new Vector3();
        wpn.getWorldScale(ws);
        const q = new Quaternion().setFromUnitVectors(st.tipL.clone().normalize(), d);
        const W = new Matrix4().compose(ph, q, ws);
        new Matrix4().copy(wL.parent.matrixWorld).invert().multiply(W).decompose(wL.position, wL.quaternion, wL.scale);
      }
    };
    return S; // the review effects tick it (S.tick) each frame
  };
  const lq = new Quaternion();
  const tmpM = new Matrix4(), flipM = new Matrix4(), pq = new Quaternion(), pp = new Vector3(), ps = new Vector3();
  // ---- kit 2.1 (K19): the will marks are small ghost swords, half his blade's length, floating point-down
  // behind his shoulders in the will colours; the newest is on the right. A new one draws itself out of his
  // blade on the press; the one pushed out fades once the cast's copies are done (K20).
  const GHOSTC = { fire: '#FFB43C', earth: '#C9A06E', water: '#7FE0F2', wind: '#E7E3F0', plain: '#E7E3F0' };
  const GHOST_S = 0.6;
  const UP = new Vector3(0, 1, 0);
  const ghosts = [];
  const now = () => performance.now() / 1000;
  const topOf = () => { let t = group; while (t.parent) t = t.parent; return t; };
  const LAY = () => new Quaternion().setFromUnitVectors(st.tipL.clone().normalize(), new Vector3(1, 0, 0));
  const DOWN = () => new Quaternion().setFromUnitVectors(st.tipL.clone().normalize(), new Vector3(0, -1, 0));
  function ghostSword(el, op = 0.8) {
    const c = GHOSTC[el] || GHOSTC.plain;
    const mat = ghostMat(c, c, op);
    const obj = st.weapon.clone();
    obj.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.frustumCulled = false; o.renderOrder = 3; } });
    obj.quaternion.identity();
    obj.scale.copy(st.weapon.getWorldScale(new Vector3()));
    obj.position.copy(st.tipL).multiplyScalar(-0.5).multiply(obj.scale);
    obj.visible = true;
    const pivot = new Group();
    pivot.add(obj);
    topOf().add(pivot);
    return { pivot, obj, mat, op };
  }
  // the float spot in world space: off the shoulders' midpoint, back and up, by the blade's length
  const SLOT = { 1: [-0.27, 0.2, -0.26], 0: [0.27, 0.2, -0.26], "-1": [0.46, 0.1, -0.38] };
  function slotPos(slot, out = new Vector3()) {
    const uR = st.uR || (st.uR = st.model.getObjectByName('upperarmR'));
    const c = new Vector3().setFromMatrixPosition(st.lArm[0].matrixWorld).add(new Vector3().setFromMatrixPosition(uR.matrixWorld)).multiplyScalar(0.5);
    const L = st.tipL.length() * st.weapon.getWorldScale(new Vector3())[st.axis];
    const q = st.model.getWorldQuaternion(new Quaternion());
    const o = SLOT[slot] || SLOT[1], k = (window.__ghostK || 1) * L;
    const off = new Vector3(o[0] * k, o[1] * k, o[2] * k).applyQuaternion(q);
    c.y = Math.max(c.y, 0);
    return out.copy(c).add(off);
  }
  function addGhost(el, slot, draw) {
    const gs = ghostSword(el, 0.9);
    const g = { ...gs, el, slot, k: draw ? 1 : 0, born: now(), draw: draw ? 0 : -1, dying: false, fadeAt: 0, awayUntil: 0, thrown: false, spend: null, flick: 0, seen: 1 };
    if (draw) {
      // it starts as a full-size copy of his blade, where his blade is, and shrinks as it flies to its shoulder
      st.weapon.updateMatrixWorld(true);
      g.p0 = st.tipL.clone().multiplyScalar(0.5).applyMatrix4(st.weapon.matrixWorld);
      g.q0 = st.weapon.getWorldQuaternion(new Quaternion());
    }
    ghosts.push(g);
    return g;
  }
  function dropGhost(g) { g.pivot.parent?.remove(g.pivot); const i = ghosts.indexOf(g); if (i >= 0) ghosts.splice(i, 1); }
  const drawn = () => !!st.lastUp && performance.now() - st.lastUp < 600;
  function ghostCue(ev) {
    const list = ev.list || [];
    if (!st.weapon) return;
    if (!drawn()) { for (const g of ghosts.slice()) dropGhost(g); return; }
    if (ev.spent) {
      // K23: both fly to the sword spirit (the effects say where with ghostsTo)
      for (const g of ghosts) if (!g.dying) g.spend = { t: 0, to: null, wait: 0 };
      return;
    }
    if (ev.added) {
      const live = ghosts.filter((g) => !g.dying && !g.spend);
      for (const g of live) {
        if (g.slot === 1 && list.length >= 2) g.slot = 0;
        else if (g.slot === 0 && ev.out) { g.slot = -1; g.dying = true; g.fadeAt = now() + (ev.fadeAfter || 0.3); }
      }
      addGhost(ev.added, 1, true);
      return;
    }
    // set or reset: no draw
    for (const g of ghosts.slice()) dropGhost(g);
    list.forEach((el, i) => addGhost(el, list.length === 1 ? 1 : i, false));
  }
  const gq = new Quaternion(), gv = new Vector3();
  function updateGhosts(dt) {
    if (!st.model || !st.weapon) return;
    const T = now();
    const yawQ = st.model.getWorldQuaternion(new Quaternion());
    for (const g of ghosts.slice()) {
      const P = g.pivot;
      const home = slotPos(g.slot, gv);
      home.y += Math.sin(T * 2.2 + g.slot * 1.7) * 0.015;
      const want = DOWN().premultiply(yawQ);
      // the will's colour breathes a little
      let op = g.op * (0.85 + 0.15 * Math.sin(T * 3 + g.slot));
      if (g.spend) {
        const S = g.spend;
        S.t += dt;
        if (!S.to) {
          S.wait += dt;
          if (S.wait > 0.2) S.to = home.clone().add(new Vector3(0, 0.6, 0)), S.p0 = P.position.clone(), S.secs = 0.25, S.t = 0;
        } else {
          const u = Math.min(1, S.t / S.secs);
          P.position.copy(S.p0).lerp(S.to, sm(0, 1, u));
          P.scale.setScalar(GHOST_S * (1 + 0.5 * u));
          g.mat.uniforms.op.value = op * (1 - sm(0.7, 1, u));
          if (u >= 1) dropGhost(g);
        }
        continue;
      }
      if (g.draw >= 0) {
        g.draw += dt;
        const u = Math.min(1, g.draw / 0.38), e = sm(0, 1, u);
        P.position.copy(g.p0).lerp(home, e);
        P.position.y += Math.sin(Math.PI * u) * 0.12;
        P.quaternion.copy(g.q0).slerp(want, e);
        P.scale.setScalar(1 - (1 - GHOST_S) * e);
        g.mat.uniforms.op.value = op * (0.5 + 0.5 * e) * (1 + 0.4 * (1 - e));
        if (u >= 1) g.draw = -1;
        continue;
      }
      // follow the shoulder; a copy away or a throw hides it
      const away = g.thrown || g.awayUntil > T;
      g.seen += ((away ? 0 : 1) - g.seen) * Math.min(1, dt * (away ? 40 : 12));
      P.position.lerp(home, Math.min(1, dt * 18));
      P.quaternion.slerp(want, Math.min(1, dt * 12));
      let sc = GHOST_S;
      // a flick: it dips its point forward as it throws its 剑气 (Crescent copies)
      if (g.flick > 0) {
        g.flick += dt;
        const u = Math.min(1, g.flick / 0.3), f = Math.sin(Math.PI * u);
        const fwd = new Vector3(0, 0, 1).applyQuaternion(yawQ);
        P.quaternion.copy(want).premultiply(new Quaternion().setFromAxisAngle(new Vector3().crossVectors(UP, fwd).normalize(), 1.2 * f));
        P.position.addScaledVector(fwd, 0.1 * f);
        sc *= 1 + 0.25 * f;
        if (u >= 1) g.flick = 0;
      }
      P.scale.setScalar(sc);
      if (g.dying) {
        const u = sm(g.fadeAt, g.fadeAt + 0.35, T);
        op *= 1 - u;
        if (u >= 1) { dropGhost(g); continue; }
      }
      g.mat.uniforms.op.value = op * g.seen;
      P.visible = g.seen > 0.02;
    }
  }
  st.ghostSword = ghostSword;
  st.slotPos = slotPos;
  st.ghosts = ghosts;

  function update(dt) {
    st.lastDt = dt;
    st.lastUp = performance.now();
    const p = group.position;
    let vx = 0, vz = 0;
    if (st.last && dt > 0) {
      vx = (p.x - st.last.x) / dt;
      vz = (p.z - st.last.z) / dt;
    }
    st.last = { x: p.x, z: p.z };
    if (!st.model) return;
    // dash facing (as on the model page: he turns to face where he dashes); a cast can face him too
    let wantYaw = 0;
    if (dashT >= 0) {
      dashT += dt;
      if (dashT < dashLen && dashFace != null) {
        const dy = dashFace - yawGroup.rotation.y;
        wantYaw = Math.atan2(Math.sin(dy), Math.cos(dy));
      }
      if (dashT > dashLen + 0.3) dashT = -1;
    } else if (faceYaw != null && faceUntil > 0) {
      faceUntil -= dt;
      const dy = faceYaw - yawGroup.rotation.y;
      wantYaw = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (faceUntil <= 0) faceYaw = null;
    }
    st.model.rotation.y += (wantYaw - st.model.rotation.y) * Math.min(1, dt * (wantYaw ? 30 : 12));
    // hop: a parabola under the clip
    if (hop.t >= 0) {
      hop.t += dt;
      const u = Math.min(1, Math.max(0, hop.t / hop.secs));
      hop.y = hop.h * 4 * u * (1 - u);
      inner.position.y = hop.y;
      if (hop.t > hop.secs) {
        hop.t = -1;
        inner.position.y = 0;
      }
    }
    // locomotion weights: walk or run by the heading against the facing
    const speed = Math.hypot(vx, vz);
    const yaw = yawGroup.rotation.y + st.model.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const fwd = (vx * fx + vz * fz) / (speed || 1), side = (vx * fz - vz * fx) / (speed || 1);
    const moving = speed > 0.35 && dashT < 0;
    st.loco += ((moving ? 1 : 0) - st.loco) * Math.min(1, dt * 10);
    st.run += ((speed > 2.6 ? 1 : 0) - st.run) * Math.min(1, dt * 6);
    let aw = 0;
    if (st.act) {
      st.actT += dt;
      const left = (st.actEnd - st.act.time) / Math.max(0.1, st.act.timeScale);
      aw = Math.min(1, st.actT / 0.05) * Math.min(1, left / 0.14);
      if (left <= 0.001) {
        st.act.stop();
        st.act = null;
        st.actName = null;
        st.flipWant = 0;
        aw = 0;
      } else st.act.setEffectiveWeight(aw);
    }
    if (st.prev) {
      st.prev.w -= dt / 0.035;
      if (st.prev.w <= 0 || !st.act) { st.prev.a.stop(); st.prev = null; }
      else {
        st.prev.a.setEffectiveWeight(aw * st.prev.w);
        st.act.setEffectiveWeight(aw * (1 - st.prev.w));
      }
    }
    const dirW = { '': Math.max(0, fwd), Back: Math.max(0, -fwd), Left: Math.max(0, side), Right: Math.max(0, -side) };
    const sum = dirW[''] + dirW.Back + dirW.Left + dirW.Right || 1;
    const idle = st.A.idle;
    if (idle) idle.setEffectiveWeight((1 - st.loco) * (1 - aw));
    for (const d of ['', 'Back', 'Left', 'Right']) {
      const k = st.loco * (1 - aw) * (dirW[d] / sum);
      const wa = st.A['walk' + d], ra = st.A['run' + d];
      if (wa) wa.setEffectiveWeight(k * (1 - st.run));
      if (ra) ra.setEffectiveWeight(k * st.run);
    }
    st.mixer.update(dt);
    // 2.0: the clip's cues and its whole-body move (lift, spin, tumble, flip about his hips)
    let bq = null, blift = 0;
    if (st.act && st.cueList) for (const c of st.cueList) if (!c.done && st.act.time >= c.t) { c.done = true; cue(c.k, c.ev); }
    const B = st.act && st.body && st.body[st.actName];
    if (B) {
      const x = Math.max(0, Math.min(B.v.length - 1, st.act.time / B.dt)), i = Math.floor(x), f = x - i;
      const a0 = B.v[i], a1 = B.v[Math.min(B.v.length - 1, i + 1)], v = a0.map((q, j) => (q + (a1[j] - q) * f) * aw);
      blift = v[0];
      bq = new Quaternion().setFromEuler(new Euler(v[3] * D, v[1] * D, -v[2] * D, 'YXZ'));
    }
    {
      const s0 = st.model.scale.y, pc = new Vector3(st.model.position.x, st.model.position.y + BODY_PIVOT * s0, st.model.position.z);
      if (bq) {
        const rf = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), st.model.rotation.y);
        inner.quaternion.copy(rf).multiply(bq).multiply(rf.clone().invert());
        inner.position.copy(pc).sub(pc.clone().applyQuaternion(inner.quaternion));
        inner.position.y += blift * s0 + (hop.t >= 0 ? hop.y : 0);
      } else if (st.bodyOn) {
        inner.quaternion.identity();
        inner.position.set(0, hop.t >= 0 ? hop.y : 0, 0);
      }
      st.bodyOn = !!bq;
    }
    // the open left paw (1.5): over idle, walk and run, not over a one-shot move
    {
      const want = (1 - aw) * (1 - 0.4 * st.run * st.loco);
      st.lp += (want - st.lp) * Math.min(1, dt * 12);
      const lp = (typeof window !== 'undefined' && window.__foxLPose) || LPOSE;
      if (st.lp > 0.01) st.lArm.forEach((b) => { lq.fromArray(lp[b.name]); b.quaternion.slerp(lq, st.lp); });
    }
    // the sword rides the right paw; for the pommel bash it is turned so the pommel leads
    st.flip += (st.flipWant - st.flip) * Math.min(1, dt * 30);
    st.model.updateMatrixWorld(true);
    tmpM.copy(st.weapon.parent.matrixWorld).invert().multiply(st.handR.matrixWorld).multiply(st.G);
    if (st.flip > 0.01) {
      const axis = new Vector3(st.axis === 'x' ? 0 : 1, 0, st.axis === 'x' ? 1 : 0);
      const gy = 0.2;
      const off = new Vector3(0, 0, 0);
      off[st.axis] = gy;
      flipM.makeTranslation(off.x, off.y, off.z).multiply(new Matrix4().makeRotationAxis(axis, Math.PI * st.flip)).multiply(new Matrix4().makeTranslation(-off.x, -off.y, -off.z));
      tmpM.multiply(flipM);
    }
    // 剑花 (Tide Ring): the blade wheels round the grip
    if (sw.spin || sw.spinA % (Math.PI * 2) > 0.05) {
      sw.spinA += dt * (sw.spin ? 8 : 10);
      if (!sw.spin && sw.spinA % (Math.PI * 2) < 0.3) sw.spinA = 0;
      const axis = new Vector3(st.axis === 'x' ? 0 : 1, 0, st.axis === 'x' ? 1 : 0);
      tmpM.multiply(new Matrix4().makeRotationAxis(axis, sw.spinA));
    }
    // the blade grows from the grip (Earthsplitter's charge)
    sw.t += dt;
    sw.s = sw.from + (sw.to - sw.from) * sm(0, 1, Math.min(1, sw.t / sw.secs));
    if (Math.abs(sw.s - 1) > 0.001) tmpM.multiply(new Matrix4().makeScale(sw.s, sw.s, sw.s));
    tmpM.decompose(st.weapon.position, st.weapon.quaternion, st.weapon.scale);
    st.weapon.updateMatrixWorld(true);
    // the blur (Thousand Cuts): he fades to a streak
    blur += (blurWant - blur) * Math.min(1, dt * 18);
    for (const r of bodyMats.concat(swordMats)) {
      r.m.transparent = blur > 0.01;
      r.m.opacity = 1 - 0.75 * blur;
      r.m.depthWrite = blur < 0.5;
    }
    // the blade's element glow after a cast
    if (edge) {
      edge.t += dt;
      edge.k = Math.min(1, edge.t / 0.06) * (1 - sm(edge.until - 0.25, edge.until, edge.t));
      for (const r of swordMats) r.m.emissive.copy(r.e).lerp(edge.c, 0.75 * edge.k);
      if (edge.t >= edge.until) {
        for (const r of swordMats) r.m.emissive.copy(r.e);
        edge = null;
      }
    }
    updateGhosts(dt);
    // the thrown sword: out like a disc, whirls on the spot, flies back to the paw (1.5, S11)
    if (sw.thrown) {
      const T = sw.thrown, ev = T.ev, P = T.gs.pivot;
      T.t += dt;
      const paw = tv.setFromMatrixPosition(st.handL.matrixWorld);
      const ex = ev.x + ev.dx * ev.len, ez = ev.z + ev.dz * ev.len, y = 0.5;
      const t1 = ev.out, t2 = ev.out + ev.hold, t3 = t2 + ev.back;
      if (T.t < t1) { const u = T.t / t1; P.position.set(paw.x + (ex - paw.x) * u, paw.y + (y - paw.y) * u, paw.z + (ez - paw.z) * u); }
      else if (T.t < t2) P.position.set(ex, y, ez);
      else if (T.owner) { const u = Math.min(1, (T.t - t2) / ev.back), home = slotPos(1, tv2); P.position.set(ex + (home.x - ex) * u, y + (home.y - y) * u, ez + (home.z - ez) * u); }
      // flat spin: the blade lies level and turns about the vertical, like a disc
      P.quaternion.setFromAxisAngle(UP, T.t * 22).multiply(LAY());
      // it grows as it leaves the paw so the spin reads, and shrinks back on its way home
      P.scale.setScalar(GHOST_S + 0.3 * sm(0, 0.12, T.t) * (1 - sm(t2, t3, T.t)));
      // a plain one fades after its burst
      if (!T.owner) T.gs.mat.uniforms.op.value = T.gs.op * (1 - sm(t2 - 0.02, t2 + 0.15, T.t));
      const end = T.owner ? t3 : t2 + 0.16;
      if (T.t >= end) { P.parent?.remove(P); if (T.owner) T.owner.thrown = false; sw.thrown = null; }
    }
    // 2.0: the tossed sword
    if (st.free) {
      const F = st.free;
      F.t += dt;
      const u = Math.min(1, F.t / F.secs);
      const hand = new Vector3().setFromMatrixPosition(st.handR.matrixWorld);
      F.obj.position.copy(F.from).lerp(hand, sm(0.55, 1, u)).add(new Vector3(0, F.h * 4 * u * (1 - u), 0));
      F.obj.quaternion.copy(new Quaternion().setFromAxisAngle(F.side, -u * F.turns * Math.PI * 2)).multiply(F.q0);
      if (u >= 1) { F.obj.parent?.remove(F.obj); st.free = null; st.weapon.visible = true; }
    }
    // the world for the trail is the arena root (the group's parent chain top)
    let top = group;
    while (top.parent) top = top.parent;
    trail.sample(top);
  }

  return { cue, update, ready: () => !!st.model };
}
