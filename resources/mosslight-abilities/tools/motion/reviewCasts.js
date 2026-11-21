// REVIEW-ONLY (never committed): Mosslight's per-skill cast moves (motion pass, Kesh 18 Nov 08:47 UTC).
// The moves are built offline with the rig thread's own clip pipeline and read here as JSON tracks.
import { AnimationClip, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';

let P = null;
export const loadCasts = () => (P ??= fetch('/review/casts.json?v=' + Date.now()).then((r) => r.json()).then((j) => {
  const out = {};
  for (const [name, c] of Object.entries(j)) {
    const tracks = [];
    for (const [bone, arr] of Object.entries(c.rot)) tracks.push(new QuaternionKeyframeTrack(`${bone}.quaternion`, c.times, arr));
    for (const [bone, arr] of Object.entries(c.pos)) tracks.push(new VectorKeyframeTrack(`${bone}.position`, c.times, arr));
    out[name] = { clip: new AnimationClip(name, c.T, tracks), ct: c.ct, loop: c.loop, twirl: c.twirl, T: c.T };
  }
  return out;
}).catch(() => ({})));

// A staff twirl: the staff turns about its grip point while the paw holds it. keys: [[t, degrees], ...].
const GRIP = new Vector3(0, 0.44, 0);
const q = new Quaternion(), ax = new Vector3(), gp = new Vector3(), m1 = new Matrix4(), m2 = new Matrix4(), m3 = new Matrix4();
export function twirlMatrix(tw, t, out) {
  out.identity();
  if (!tw || !tw.keys || !tw.keys.length) return out;
  const K = tw.keys;
  let a = K[0][1];
  if (t >= K[K.length - 1][0]) a = K[K.length - 1][1];
  else for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t <= K[i + 1][0]) {
    let u = (t - K[i][0]) / Math.max(1e-6, K[i + 1][0] - K[i][0]);
    const e = K[i + 1][2];
    u = e === 'in' ? u * u : e === 'out' ? 1 - (1 - u) * (1 - u) : e === 'lin' ? u : u * u * (3 - 2 * u);
    a = K[i][1] + (K[i + 1][1] - K[i][1]) * u;
    break;
  }
  if (Math.abs(a) < 1e-4) return out;
  const A = tw.axis || [1, 0, 0];
  const g = tw.grip ? gp.set(...tw.grip) : GRIP;
  m1.makeTranslation(g.x, g.y, g.z);
  m3.makeTranslation(-g.x, -g.y, -g.z);
  m2.makeRotationFromQuaternion(q.setFromAxisAngle(ax.set(A[0], A[1], A[2]).normalize(), (a * Math.PI) / 180));
  return out.copy(m1).multiply(m2).multiply(m3);
}
