// REVIEW-ONLY (never committed): Mosslight's own cast move for every skill (motion pass, Kesh 18 Nov 08:47 UTC).
// Same clip language as the rig thread's clips.mjs: Euler degrees added to BASE, +x her left, +y up, +z forward.
// `ct` is the frame the effect belongs to; the page starts each clip 0.1 s before it, so every move is a short
// wind-up, the blow on `ct`, and then a long follow-through that belongs to that skill alone.
const S = (t, T, ph = 0) => Math.sin(2 * Math.PI * (t / T - ph));
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const tailSway = (t, T, amp, lag = 0.12) => { const o = {}; for (let i = 1; i <= 5; i++) o['tail' + i] = [0, amp * S(t, T, lag * i) * (0.6 + 0.15 * i), 0]; return o; };
const tailUp = (a) => ({ tail1: [a, 0, 0], tail2: [a * 0.8, 0, 0], tail3: [a * 0.6, 0, 0] });
const ears = (a, b = 0) => ({ earL: [a, 0, b], earR: [a, 0, -b] });
const tip = (a) => ({ footL: [a, 0, 0], footR: [a, 0, 0] });
const wide = (a) => ({ legL: [0, 0, a], legR: [0, 0, -a] });
// a circle of staff directions about a centre direction c, in the plane of u and v (for stirring and conducting)
const stirP = (t0, t1, n, p, rp, c, r, turns = 1, ph = 0, u = [1, 0, 0], v = [0, 0, 1]) => stir(t0, t1, n, p, c, r, turns, ph, u, v).map((k, i) => { const a = 2 * Math.PI * (turns * i / n + ph); return { ...k, p: [p[0] + rp * Math.cos(a) * u[0] + rp * Math.sin(a) * v[0], p[1] + rp * Math.cos(a) * u[1] + rp * Math.sin(a) * v[1], p[2] + rp * Math.cos(a) * u[2] + rp * Math.sin(a) * v[2]] }; });
const stir = (t0, t1, n, p, c, r, turns = 1, ph = 0, u = [1, 0, 0], v = [0, 0, 1]) => { const k = []; for (let i = 0; i <= n; i++) { const w = i / n, a = 2 * Math.PI * (turns * w + ph), ca = r * Math.cos(a), sa = r * Math.sin(a); k.push({ t: +(t0 + (t1 - t0) * w).toFixed(3), p, d: [c[0] + ca * u[0] + sa * v[0], c[1] + ca * u[1] + sa * v[1], c[2] + ca * u[2] + sa * v[2]] }); } return k; };

// The off paw on a two-handed staff: the grip solver works from where the arm already is, so each key first brings
// the arm near the staff (like the passed Plant clip does), sized by how high the staff is held at that moment.
const staffY = (c, t) => { const K = c.staffPose.keys; let i = K.length - 2; for (let k = 0; k < K.length - 1; k++) if (t >= K[k].t && t <= K[k + 1].t) { i = k; break; } const u = Math.min(1, Math.max(0, (t - K[i].t) / Math.max(1e-6, K[i + 1].t - K[i].t))); return K[i].p[1] + (K[i + 1].p[1] - K[i].p[1]) * u; };
const lerpA = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
function autoL(c, lo = [-70, 0, -26], hi = [-130, 0, -26], flo = -12, fhi = -22) {
  for (const k of c.keys) {
    if (k.t < c.twoHand.from || k.t > c.twoHand.to) continue;
    const u = Math.min(1, Math.max(0, (staffY(c, k.t) - 0.42) / 0.38));
    const ua = lerpA(lo, hi, u), fa = flo + (fhi - flo) * u;
    k.p = { ...k.p, upperarmL: k.p.upperarmL ? k.p.upperarmL.map((v, i) => v + ua[i]) : ua, forearmL: [fa + (k.p.forearmL ? k.p.forearmL[0] : 0), 0, 0] };
  }
  return c;
}
export const CLIPS = {
  // ---------------- quick heals ----------------
  // S10 Swiftleaf: a hop and a full turn on her toes; the three leaves fly off the staff as it comes round.
  c_swift_mend: { T: 1.0, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { hips: [0, -38, 0], spine: [8, -10, 0], head: [4, 26, 0], _hips: [0, -0.06, 0], upperarmR: [10, 0, -20], upperarmL: [-20, 0, 30], forearmL: [-40, 0, 0], ...ears(14), ...wide(5) } },
    { t: 0.16, ease: 'out', p: { hips: [0, 70, 0], spine: [-4, 14, 0], chest: [0, 10, 0], head: [-6, 20, 0], _hips: [0, 0.05, 0], upperarmR: [-10, 0, -66], forearmR: [-8, 0, 0], upperarmL: [-10, 0, 78], forearmL: [-10, 0, 0], legL: [-6, 0, 6], legR: [14, 0, -4], ...tip(26), ...ears(-18, 8) } },
    { t: 0.30, p: { hips: [0, 205, 0], spine: [-6, 8, 0], chest: [0, 6, 0], head: [-8, 22, 0], _hips: [0, 0.13, 0], upperarmR: [-14, 0, -74], forearmR: [-6, 0, 0], upperarmL: [-14, 0, 86], legL: [-22, 0, 8], legR: [16, 0, -4], ...tip(34), ...ears(-22, 10), ...tailUp(14) } },
    { t: 0.44, p: { hips: [0, 335, 0], spine: [-2, 4, 0], head: [-4, 14, 0], _hips: [0, 0.05, 0], upperarmR: [-10, 0, -56], upperarmL: [-10, 0, 62], legL: [-10, 0, 6], legR: [6, 0, -4], ...tip(22), ...ears(-14, 6) } },
    { t: 0.53, ease: 'in', p: { hips: [0, 372, 0], spine: [10, -6, 0], head: [2, -8, 0], _hips: [0, -0.06, 0], upperarmR: [-4, 0, -24], upperarmL: [-24, 0, 40], forearmL: [-30, 0, 0], ...wide(8), ...ears(20, 4) } },
    { t: 0.68, p: { hips: [0, 358, 0], spine: [2, 0, 0], head: [-6, 0, 4], _hips: [0, 0.012, 0], upperarmL: [-40, 0, 24], forearmL: [-50, 0, 0], handL: [-20, 0, 0], ...tip(10), ...ears(-6) } },
    { t: 1.0, p: { hips: [0, 360, 0] } },
  ], fn: (t) => tailSway(t, 0.5, 10 * bump(t, 0.7, 0.2)) },
  // S10: a leaf comes home. She catches it in her free paw and the staff turns once in her fingers.
  c_catch: { T: 0.6, ct: 0.1, twirl: { axis: [1, 0, 0], keys: [[0.08, 0], [0.42, 360, 'out']] }, keys: [
    { t: 0, p: {} },
    { t: 0.10, ease: 'in', p: { chest: [-4, 12, 0], head: [-8, 10, 0], _hips: [0, 0.03, 0], upperarmL: [-96, 0, 20], forearmL: [-30, 0, 0], handL: [-30, 0, 0], upperarmR: [-30, 0, -20], forearmR: [-30, 0, 0], ...tip(18), ...ears(-12, 6) } },
    { t: 0.22, p: { chest: [4, 6, 0], head: [6, 6, 0], _hips: [0, -0.025, 0], upperarmL: [-50, 0, -10], forearmL: [-80, 0, 0], upperarmR: [-36, 0, -24], forearmR: [-36, 0, 0], ...ears(10) } },
    { t: 0.42, p: { head: [-2, 0, 0], upperarmL: [-20, 0, -14], forearmL: [-40, 0, 0], upperarmR: [-14, 0, -8], forearmR: [-12, 0, 0] } },
    { t: 0.6, p: {} },
  ] },
  // S11 Seed Bolt: she tosses the pod up off her free paw and bats it up the line with a big underhand swing, her whole body
  // twisting through it onto one toe; the staff finishes high over her left shoulder and she watches the shot go.
  c_mending_bolt: { T: 0.95, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.86, fade: 0.1, keys: [
      { t: 0.00, p: [-0.14, 0.44, 0.24], d: [0, 0.8, -0.5] },
      { t: 0.06, p: [-0.20, 0.40, 0.04], d: [-0.35, 0.05, -0.94] },
      { t: 0.16, ease: 'in', p: [-0.06, 0.40, 0.44], d: [0.15, 0.1, 1] },
      { t: 0.26, p: [0.0, 0.54, 0.34], d: [0.6, 0.76, 0.24] },
      { t: 0.40, p: [0.02, 0.58, 0.26], d: [0.7, 0.66, -0.28] },
      { t: 0.62, p: [-0.14, 0.50, 0.28], d: [-0.12, 0.96, 0.1] },
      { t: 0.95, p: [-0.12, 0.44, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [8, -40, 0], spine: [8, -16, 0], hips: [0, -14, 0], head: [6, 34, 0], _hips: [0, -0.07, -0.04], upperarmL: [-150, 0, 14], forearmL: [-10, 0, 0], handL: [-40, 0, 0], legR: [16, 0, -6], legL: [-10, 0, 4], ...ears(16, 4), tail1: [0, 20, 0], tail2: [0, 16, 0] } },
    { t: 0.16, ease: 'in', p: { chest: [12, 28, 0], spine: [8, 12, 0], hips: [0, 12, 0], head: [-8, -22, 0], _hips: [0, -0.04, 0.08], upperarmL: [16, 0, 34], forearmL: [-10, 0, 0], legL: [-28, 0, 0], legR: [22, 0, 0], footR: [24, 0, 0], ...ears(-24, 4), tail1: [0, -24, 0], tail2: [0, -18, 0] } },
    { t: 0.28, p: { chest: [-6, 40, 0], spine: [-4, 16, 0], hips: [0, 16, 0], head: [-16, -30, 0], _hips: [0, 0.04, 0.07], upperarmL: [30, 0, 52], legL: [-24, 0, 0], legR: [18, 0, 0], ...tip(28), ...ears(-18, 8), tail1: [0, -28, 0], tail2: [0, -20, 0] } },
    { t: 0.44, p: { chest: [-8, 32, 0], spine: [-4, 12, 0], hips: [0, 12, 0], head: [-18, -24, 0], _hips: [0, 0.05, 0.05], upperarmL: [18, 0, 46], legL: [-18, 0, 0], legR: [14, 0, 0], ...tip(30), ...tailUp(12) } },
    { t: 0.66, p: { chest: [-2, 10, 0], head: [-8, -8, 0], _hips: [0, -0.02, 0.02], upperarmL: [0, 0, 16], ...ears(10) } },
    { t: 0.95, p: {} },
  ] },
  // S12 Dew Wave: the staff laid flat in both paws, gathered in low at her knees in a deep crouch, then driven forward at
  // chest height in a long lunge, up onto her toes; she lifts it on over her head as the wave rolls out, and lowers it.
  c_mending_tide: { T: 1.05, ct: 0.16, nolag: true, twoHand: { from: 0.0, to: 0.62, fade: 0.12, y: 0.2 },
    staffPose: { from: 0.0, to: 0.9, fade: 0.1, keys: [
      { t: 0.00, p: [-0.14, 0.42, 0.28], d: [-0.5, 0.8, 0.2] },
      { t: 0.06, p: [-0.16, 0.30, 0.22], d: [-0.98, 0.05, -0.1] },
      { t: 0.16, ease: 'in', p: [-0.16, 0.44, 0.50], d: [-0.98, 0.08, 0.12] },
      { t: 0.30, p: [-0.16, 0.56, 0.46], d: [-0.96, 0.22, 0.05] },
      { t: 0.50, p: [-0.16, 0.70, 0.36], d: [-0.9, 0.42, 0] },
      { t: 0.76, p: [-0.14, 0.50, 0.32], d: [-0.4, 0.88, 0.1] },
      { t: 1.05, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [24, 0, 0], chest: [12, 0, 0], head: [-16, 0, 0], _hips: [0, -0.12, -0.05], ...wide(14), ...ears(20, 8), ...tailUp(-6) } },
    { t: 0.16, ease: 'in', p: { spine: [18, 0, 0], chest: [6, 0, 0], head: [-18, 0, 0], _hips: [0, -0.06, 0.11], legL: [-34, 0, 12], legR: [26, 0, -12], footR: [28, 0, 0], ...ears(-28, 8), ...tailUp(16) } },
    { t: 0.30, p: { spine: [2, 0, 0], chest: [-2, 0, 0], head: [-14, 0, 0], _hips: [0, 0.03, 0.09], legL: [-26, 0, 10], legR: [20, 0, -10], ...tip(24), ...ears(-18, 4), ...tailUp(20) } },
    { t: 0.50, p: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-16, 0, 0], _hips: [0, 0.06, 0.06], legL: [-16, 0, 8], legR: [12, 0, -8], ...tip(34), ...tailUp(24) } },
    { t: 0.76, p: { spine: [4, 0, 0], head: [2, 0, 0], _hips: [0, -0.02, 0.02], ...wide(5), ...ears(10) } },
    { t: 1.05, p: {} },
  ] },
  // S13 Heartbloom: she cups the bud at her chest, lifts it off her paw like a small bird, and bows as it opens.
  c_nova_bloom: { T: 1.1, ct: 0.18, keys: [
    { t: 0, p: {} },
    { t: 0.07, p: { spine: [10, 0, 0], chest: [6, -8, 0], head: [14, -4, 0], _hips: [0, -0.04, 0], upperarmL: [-36, 0, -26], forearmL: [-78, 0, 0], handL: [-20, 0, 0], upperarmR: [-10, 0, 10], forearmR: [-30, 0, 0], ...wide(3), ...ears(16, 6) } },
    { t: 0.18, ease: 'in', p: { spine: [-8, 0, 0], chest: [-8, 6, 0], head: [-22, 0, 0], _hips: [0, 0.045, 0.02], upperarmL: [-118, 0, 4], forearmL: [-8, 0, 0], handL: [-34, 0, 0], upperarmR: [16, 0, -30], forearmR: [-8, 0, 0], ...tip(30), ...ears(-22, 8), ...tailUp(16) } },
    { t: 0.34, p: { spine: [-10, 0, 0], chest: [-8, 4, 0], head: [-26, 0, 4], _hips: [0, 0.055, 0.02], upperarmL: [-126, 0, 16], forearmL: [-4, 0, 0], handL: [-20, 0, 12], upperarmR: [18, 0, -40], ...tip(34), ...ears(-16, 10), ...tailUp(20) } },
    { t: 0.56, p: { spine: [-4, 0, 0], chest: [-4, 0, 0], head: [-18, 0, 6], _hips: [0, 0.03, 0.01], upperarmL: [-96, 0, 50], forearmL: [-10, 0, 0], handL: [-10, 0, 0], upperarmR: [10, 0, -44], ...tip(20), ...tailUp(12) } },
    { t: 0.78, p: { spine: [14, 0, 0], chest: [8, 0, 0], head: [10, 0, 0], _hips: [0, -0.03, 0], upperarmL: [-30, 0, 34], forearmL: [-20, 0, 0], upperarmR: [4, 0, -30], ...ears(14, 6) } },
    { t: 1.1, p: {} },
  ], fn: (t) => ({ handL: [0, 0, 8 * bump(t, 0.42, 0.14) * Math.sin(2 * Math.PI * t / 0.22)], ...tailSway(t, 1.1, 7) }) },
  // S14 Pollen Gust: a wide, low fan of the staff at hip height from her right to her left with a big step in and a hard
  // twist, the gem kept clear of her face; the staff coasts back on the wind.
  c_hearthsong: { T: 1.05, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.95, fade: 0.1, keys: [
      { t: 0.00, p: [-0.14, 0.44, 0.26], d: [-0.3, 0.8, 0.3] },
      { t: 0.06, p: [-0.26, 0.42, 0.10], d: [-0.9, 0.2, -0.38] },
      { t: 0.16, ease: 'in', p: [-0.10, 0.40, 0.46], d: [-0.15, 0.12, 0.98] },
      { t: 0.26, p: [0.06, 0.42, 0.40], d: [0.8, 0.14, 0.58] },
      { t: 0.38, p: [0.10, 0.46, 0.30], d: [0.96, 0.22, 0.1] },
      { t: 0.62, p: [-0.10, 0.46, 0.34], d: [-0.42, 0.6, 0.68] },
      { t: 0.82, p: [-0.14, 0.46, 0.32], d: [-0.1, 0.9, 0.4] },
      { t: 1.05, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [6, -40, 0], spine: [6, -16, 0], hips: [0, -14, 0], head: [2, 34, 0], _hips: [-0.02, -0.07, -0.03], legR: [10, 0, -8], legL: [-4, 0, 4], upperarmL: [-20, 0, 40], ...ears(14), tail1: [0, 22, 0], tail2: [0, 16, 0] } },
    { t: 0.16, ease: 'in', p: { chest: [12, 8, 0], spine: [10, 2, 0], hips: [0, 4, 0], head: [-8, -6, 0], _hips: [0, -0.07, 0.10], legL: [-34, 0, 8], legR: [24, 0, -6], footR: [24, 0, 0], upperarmL: [10, 0, 50], ...ears(-28, 6) } },
    { t: 0.26, p: { chest: [10, 40, 0], spine: [8, 16, 0], hips: [0, 14, 0], head: [-6, -32, 0], _hips: [0.02, -0.06, 0.10], legL: [-32, 0, 8], legR: [24, 0, -6], footR: [26, 0, 0], upperarmL: [20, 0, 60], ...ears(-24, 8), tail1: [0, -26, 0], tail2: [0, -20, 0] } },
    { t: 0.40, p: { chest: [6, 46, 0], spine: [4, 18, 0], hips: [0, 16, 0], head: [-6, -38, 0], _hips: [0.02, -0.04, 0.09], legL: [-26, 0, 8], legR: [20, 0, -6], footR: [18, 0, 0], upperarmL: [10, 0, 56], ...ears(-14, 6) } },
    { t: 0.64, p: { chest: [-2, 14, 0], spine: [0, 4, 0], head: [-8, -10, 0], _hips: [0, 0.015, 0.04], legL: [-12, 0, 4], legR: [10, 0, -2], ...tip(10) } },
    { t: 0.84, p: { chest: [2, -4, 0], head: [2, 4, 0], _hips: [0, -0.012, 0.01], ...ears(8) } },
    { t: 1.05, p: {} },
  ] },
  // S57 Nectar Burst: a sharp flick of the gem straight up, then she stirs the falling nectar round like a honey dipper.
  c_nectar_burst: { T: 1.05, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.94, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.10, 0.38, 0.30], d: [0, 0.8, 0.6] },
      { t: 0.16, ease: 'in', p: [-0.14, 0.86, 0.26], d: [-0.12, 1, 0.06] },
      ...stirP(0.26, 0.74, 10, [-0.16, 0.74, 0.28], 0.07, [-0.3, 0.7, 0.1], 0.6, 2, 0.25),
      { t: 0.86, p: [-0.10, 0.52, 0.30], d: [0, 0.97, 0.2] },
      { t: 1.05, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [10, 0, 0], head: [8, 0, 0], _hips: [0, -0.055, 0], upperarmL: [-10, 0, 20], forearmL: [-30, 0, 0], ...wide(5), ...ears(14) } },
    { t: 0.16, ease: 'in', p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-24, 0, 0], _hips: [0, 0.07, 0], upperarmL: [-10, 0, 70], forearmL: [-10, 0, 0], ...wide(4), ...tip(32), ...ears(-24, 8), ...tailUp(18) } },
    { t: 0.30, p: { spine: [-6, 0, 0], chest: [-5, 0, 0], head: [-26, 0, 0], _hips: [0, 0.04, 0], upperarmL: [-30, 0, 60], forearmL: [-40, 0, 0], handL: [-30, 0, 0], ...wide(4), ...tip(26), ...ears(-14, 6) } },
    { t: 0.74, p: { spine: [-5, 0, 0], chest: [-4, 0, 0], head: [-24, 0, 0], _hips: [0, 0.035, 0], upperarmL: [-36, 0, 54], forearmL: [-46, 0, 0], handL: [-30, 0, 0], ...wide(4), ...tip(24) } },
    { t: 0.88, p: { spine: [4, 0, 0], head: [2, 0, 0], _hips: [0, -0.02, 0], upperarmL: [-10, 0, 20], ...ears(10) } },
    { t: 1.05, p: {} },
  ], fn: (t) => { const e = bump(t, 0.5, 0.2), a = 2 * Math.PI * (2 * (t - 0.26) / 0.48 + 0.25); return { hips: [0, 9 * e * Math.sin(a), 7 * e * Math.cos(a)], spine: [0, 0, -6 * e * Math.cos(a)], chest: [3 * e * Math.sin(a), 0, -3 * e * Math.cos(a)], head: [5 * e * Math.sin(a + 0.5), 10 * e * Math.cos(a + 0.5), 5 * e * Math.cos(a + 0.4)], ...tailSway(t, 0.24, 16 * e) }; } },
  // ---------------- lasting ----------------
  // S15 Mossgrowth: she strokes a pawful of moss off the staff, flicks it at her friend and blows the last of it off her paw.
  c_kindred_shield: { T: 1.0, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.86, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.12, 0.44, 0.34], d: [-0.12, 0.9, 0.42] },
      { t: 0.16, ease: 'in', p: [-0.16, 0.46, 0.38], d: [-0.3, 0.72, 0.62] },
      { t: 0.24, p: [-0.18, 0.46, 0.30], d: [-0.4, 0.9, 0.16] },
      { t: 0.60, p: [-0.16, 0.44, 0.28], d: [-0.2, 0.97, 0.1] },
      { t: 1.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [10, -26, 0], spine: [6, -10, 0], hips: [0, -8, 0], head: [14, -16, 0], _hips: [0, -0.06, -0.03], upperarmL: [-56, 0, -30], forearmL: [-40, 60, 0], handL: [14, 0, 0], legR: [10, 0, 0], ...ears(18, 6), tail1: [0, 16, 0] } },
    { t: 0.16, ease: 'in', p: { chest: [-6, 34, 0], spine: [-2, 14, 0], hips: [0, 10, 0], head: [-14, -16, 0], _hips: [0, 0.0, 0.13], upperarmL: [-122, 0, 22], forearmL: [-2, 0, 0], handL: [-50, 0, 0], fingersL: [-20, 0, 0], legL: [-34, 0, 0], legR: [26, 0, 0], footR: [32, 0, 0], ...ears(-30, 8), tail1: [0, -26, 0], tail2: [0, -18, 0] } },
    { t: 0.30, p: { chest: [4, 6, 0], spine: [2, 2, 0], head: [12, 0, 0], _hips: [0, -0.01, 0.05], upperarmL: [-66, 0, -22], forearmL: [-84, 34, 0], handL: [-34, 0, 0], legL: [-16, 0, 0], legR: [14, 0, 0], ...ears(20, 6) } },
    { t: 0.42, ease: 'in', p: { chest: [12, 6, 0], spine: [8, 2, 0], head: [-4, 0, 0], _hips: [0, -0.025, 0.07], upperarmL: [-82, 0, -8], forearmL: [-40, 14, 0], handL: [-56, 0, 0], legL: [-18, 0, 0], legR: [14, 0, 0], ...ears(-20, 4), ...tailUp(14) } },
    { t: 0.66, p: { chest: [2, 2, 0], head: [-4, 0, 6], _hips: [0, 0.01, 0.02], upperarmL: [-40, 0, 10], forearmL: [-30, 0, 0], handL: [-20, 0, 0], ...tip(8) } },
    { t: 1.0, p: {} },
  ], fn: (t) => tailSway(t, 1.0, 8) },
  // S16 Firefly Swarm: the gem thrust out at her friend, then she conducts the swarm with two small rings of the staff.
  c_lantern_ward: { T: 1.05, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.92, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.12, 0.46, 0.22], d: [0, 0.9, 0.2] },
      { t: 0.16, ease: 'in', p: [-0.08, 0.54, 0.42], d: [0, 0.5, 0.86] },
      ...stirP(0.26, 0.76, 10, [-0.18, 0.54, 0.38], 0.08, [-0.55, 0.45, 0.7], 0.48, 2, 0.25, [1, 0, 0], [0, 1, 0]),
      { t: 0.88, p: [-0.10, 0.48, 0.32], d: [0, 0.9, 0.4] },
      { t: 1.05, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [2, -18, 0], spine: [2, -8, 0], head: [0, 14, 0], _hips: [0, -0.03, -0.03], upperarmL: [-10, 0, 14], ...ears(10) } },
    { t: 0.16, ease: 'in', p: { chest: [6, 16, 0], spine: [4, 6, 0], head: [-8, -10, 0], _hips: [0, -0.02, 0.06], upperarmL: [24, 0, 30], forearmL: [-20, 0, 0], legL: [-18, 0, 0], legR: [14, 0, 0], footR: [16, 0, 0], ...ears(-18) } },
    { t: 0.30, p: { chest: [0, 12, 0], spine: [0, 4, 0], head: [-12, -8, 0], _hips: [0, 0.03, 0.05], upperarmL: [10, 0, 46], forearmL: [-30, 0, 0], legL: [-14, 0, 0], legR: [12, 0, 0], ...tip(20), ...tailUp(12) } },
    { t: 0.76, p: { chest: [0, 10, 0], spine: [0, 4, 0], head: [-12, -6, 0], _hips: [0, 0.03, 0.05], upperarmL: [10, 0, 46], forearmL: [-30, 0, 0], legL: [-14, 0, 0], legR: [12, 0, 0], ...tip(20), ...tailUp(12) } },
    { t: 0.9, p: { head: [2, 0, 0], _hips: [0, -0.012, 0.01], ...ears(8) } },
    { t: 1.05, p: {} },
  ], fn: (t) => { const e = bump(t, 0.51, 0.2), a = 2 * Math.PI * (t - 0.26) / 0.25; return { head: [9 * e * Math.sin(a), 14 * e * Math.cos(a), 0], chest: [0, 8 * e * Math.cos(a), 0], hips: [0, 6 * e * Math.cos(a), 5 * e * Math.cos(a)], upperarmL: [16 * e * Math.sin(a), 0, 12 * e * Math.cos(a)], handL: [0, 0, 24 * e * Math.sin(a)], ...tailSway(t, 0.25, 14 * e) }; } },
  // S17 Dewfall: the gem goes up, she stirs the sky once round, then brings the staff down to point where the dew falls and holds out a paw for the first drops.
  c_dewfall: { T: 1.2, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 1.06, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.10, 0.40, 0.30], d: [0, 0.9, 0.44] },
      { t: 0.16, ease: 'in', p: [-0.06, 0.80, 0.26], d: [0, 1, 0.1] },
      ...stir(0.22, 0.52, 6, [-0.06, 0.80, 0.26], [0, 0.86, 0.05], 0.55, 1, 0.25),
      { t: 0.64, ease: 'in', p: [-0.10, 0.50, 0.40], d: [-0.12, -0.4, 0.91] },
      { t: 0.74, p: [-0.10, 0.51, 0.39], d: [-0.12, -0.3, 0.95] },
      { t: 0.92, p: [-0.10, 0.50, 0.36], d: [0, 0.6, 0.8] },
      { t: 1.20, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [8, 0, 0], head: [6, 0, 0], _hips: [0, -0.05, 0], ...wide(4), ...ears(12) } },
    { t: 0.16, ease: 'in', p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-22, 0, 0], _hips: [0, 0.055, 0], upperarmL: [-6, 0, 50], ...tip(30), ...ears(-22, 8) } },
    { t: 0.52, p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-24, 0, 0], _hips: [0, 0.05, 0], upperarmL: [-6, 0, 56], ...tip(28), ...ears(-12, 6) } },
    { t: 0.64, ease: 'in', p: { spine: [14, 0, 0], chest: [8, 6, 0], head: [-10, 0, 0], _hips: [0, -0.05, 0.05], upperarmL: [10, 0, 30], legL: [-18, 0, 4], legR: [14, 0, -4], ...ears(20, 4) } },
    { t: 0.80, p: { spine: [6, 0, 0], chest: [2, 4, 0], head: [-20, 0, 6], _hips: [0, -0.02, 0.04], upperarmL: [-56, 0, 30], forearmL: [-24, 0, 0], handL: [-44, 0, 0], legL: [-12, 0, 4], legR: [10, 0, -4], ...ears(-8, 6), ...tailUp(10) } },
    { t: 1.0, p: { spine: [2, 0, 0], head: [-14, 0, 6], _hips: [0, 0, 0.02], upperarmL: [-50, 0, 30], forearmL: [-28, 0, 0], handL: [-44, 0, 0] } },
    { t: 1.2, p: {} },
  ], fn: (t) => { const e = bump(t, 0.37, 0.14), a = 2 * Math.PI * (t - 0.22) / 0.3; return { hips: [0, 0, 4 * e * Math.cos(a)], spine: [3 * e * Math.sin(a), 0, -3 * e * Math.cos(a)], ...tailSway(t, 0.6, 9) }; } },
  // S18 Mending Sapling: she kneels, touches the earth, and draws the sapling up after her paw until she is on her toes; then a pat.
  c_sanctuary: { T: 1.2, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [14, 0, 0], head: [6, 0, 0], _hips: [0, -0.07, 0], upperarmL: [-30, 0, -6], forearmL: [-30, 0, 0], ...wide(6), ...ears(12) } },
    { t: 0.16, ease: 'in', p: { spine: [32, 0, 0], chest: [12, 6, 0], head: [-16, 0, 0], _hips: [0, -0.15, 0.03], upperarmL: [-50, 0, -4], forearmL: [6, 0, 0], handL: [26, 0, 0], upperarmR: [-6, 0, -22], ...wide(14), ...ears(22, 6) } },
    { t: 0.28, p: { spine: [26, 0, 0], chest: [10, 6, 0], head: [-14, 0, 0], _hips: [0, -0.13, 0.03], upperarmL: [-56, 0, -4], forearmL: [-6, 0, 0], handL: [-10, 0, 0], upperarmR: [-6, 0, -22], ...wide(14), ...ears(10, 6) } },
    { t: 0.42, p: { spine: [10, 0, 0], chest: [2, 4, 0], head: [-16, 0, 0], _hips: [0, -0.05, 0.02], upperarmL: [-88, 0, 0], forearmL: [-14, 0, 0], handL: [-40, 0, 0], upperarmR: [-4, 0, -18], ...wide(10), ...ears(-10, 4) } },
    { t: 0.58, p: { spine: [-8, 0, 0], chest: [-8, 0, 0], head: [-26, 0, 0], _hips: [0, 0.05, 0], upperarmL: [-132, 0, 8], forearmL: [-6, 0, 0], handL: [-36, 0, 0], ...wide(5), ...tip(32), ...ears(-20, 8), ...tailUp(18) } },
    { t: 0.74, p: { spine: [-4, 0, 0], chest: [-4, 0, 0], head: [-20, 0, 6], _hips: [0, 0.03, 0], upperarmL: [-112, 0, 14], forearmL: [-16, 0, 0], handL: [-20, 0, 0], ...tip(22), ...tailUp(12) } },
    { t: 0.92, p: { spine: [6, 0, 0], head: [2, 0, 8], _hips: [0, -0.01, 0.02], upperarmL: [-72, 0, 0], forearmL: [-22, 0, 0], handL: [10, 0, 0], ...ears(8) } },
    { t: 1.2, p: {} },
  ], fn: (t) => { const e = bump(t, 0.94, 0.1); return { handL: [16 * e * Math.sin(2 * Math.PI * t / 0.14), 0, 0], forearmL: [-6 * e * Math.sin(2 * Math.PI * t / 0.14), 0, 0], ...tailSway(t, 1.2, 8) }; } },
  // S50 Elder Oak: a jump, the staff driven into the floor in both paws, a shaking hold while the oak pushes up, then she leans back to look up its trunk.
  c_guardian_bond: { T: 1.3, ct: 0.16, nolag: true, twoHand: { from: 0.0, to: 1.02, fade: 0.12, y: 0.53 },
    staffPose: { from: 0.0, to: 1.16, fade: 0.1, keys: [
      { t: 0.00, p: [-0.10, 0.60, 0.28], d: [0, 0.95, -0.1] },
      { t: 0.06, p: [-0.10, 0.88, 0.19], d: [0, 0.9, -0.44] },
      { t: 0.16, ease: 'in', p: [-0.10, 0.335, 0.45], d: [0, 0.995, 0.10] },
      { t: 0.24, p: [-0.10, 0.352, 0.445], d: [0, 0.998, 0.06] },
      { t: 0.54, p: [-0.10, 0.335, 0.45], d: [0, 0.995, 0.10] },
      { t: 0.78, p: [-0.10, 0.47, 0.36], d: [0, 0.97, -0.22] },
      { t: 1.00, p: [-0.10, 0.44, 0.34], d: [0, 0.97, 0.1] },
      { t: 1.30, p: [-0.10, 0.42, 0.33], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-12, 0, 0], chest: [-10, 0, 0], head: [-18, 0, 0], _hips: [0, 0.12, -0.02], legL: [-16, 0, 10], legR: [-10, 0, -10], ...tip(30), ...ears(-22, 6), ...tailUp(16) } },
    { t: 0.16, ease: 'in', p: { spine: [26, 0, 0], chest: [12, 0, 0], head: [-24, 0, 0], _hips: [0, -0.10, 0.03], ...wide(22), ...ears(28, 6) } },
    { t: 0.24, p: { spine: [20, 0, 0], chest: [9, 0, 0], head: [-18, 0, 0], _hips: [0, -0.07, 0.025], ...wide(20) } },
    { t: 0.54, p: { spine: [23, 0, 0], chest: [11, 0, 0], head: [-26, 0, 0], _hips: [0, -0.085, 0.03], ...wide(21), ...ears(6, 4) } },
    { t: 0.78, p: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-34, 0, 0], _hips: [0, 0.0, -0.035], ...wide(12), ...ears(-14, 8), ...tailUp(12) } },
    { t: 1.0, p: { spine: [-2, 0, 0], head: [-18, 0, 4], _hips: [0, -0.01, -0.01], ...wide(6) } },
    { t: 1.3, p: {} },
  ], fn: (t) => { const e = bump(t, 0.38, 0.14), a = 2 * Math.PI * t / 0.07; return { _hips: [0.004 * e * Math.sin(a), 0, 0], chest: [0, 0, 1.6 * e * Math.sin(a)], head: [0, 0, -1.6 * e * Math.sin(a)], earL: [3 * e * Math.sin(a * 0.7), 0, 0], earR: [-3 * e * Math.sin(a * 0.7), 0, 0] }; } },
  // S58 Rain Cloud: the gem jabbed at the sky, shaken side to side like a rain stick, then a paw out for the rain and a shake of wet ears.
  c_rain_cloud: { T: 1.25, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 1.1, fade: 0.1, keys: [
      { t: 0.00, p: [-0.21, 0.42, 0.30], d: [-0.15, 0.95, 0.3] },
      { t: 0.06, p: [-0.19, 0.40, 0.28], d: [-0.15, 0.98, 0.2] },
      { t: 0.16, ease: 'in', p: [-0.15, 0.86, 0.24], d: [-0.15, 1, 0.1] },
      { t: 0.25, p: [-0.06, 0.84, 0.24], d: [0.57, 0.68, 0.1] },
      { t: 0.33, p: [-0.24, 0.84, 0.24], d: [-0.87, 0.68, 0.1] },
      { t: 0.41, p: [-0.07, 0.84, 0.24], d: [0.49, 0.76, 0.1] },
      { t: 0.49, p: [-0.23, 0.84, 0.24], d: [-0.75, 0.79, 0.1] },
      { t: 0.57, p: [-0.09, 0.83, 0.24], d: [0.25, 0.91, 0.1] },
      { t: 0.66, p: [-0.15, 0.80, 0.24], d: [-0.15, 1, 0.1] },
      { t: 0.84, p: [-0.19, 0.56, 0.30], d: [-0.15, 0.97, 0.2] },
      { t: 1.25, p: [-0.21, 0.42, 0.30], d: [-0.15, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [8, 0, 0], head: [6, 0, 0], _hips: [0, -0.05, 0], ...wide(4), ...ears(12) } },
    { t: 0.16, ease: 'in', p: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-26, 0, 0], _hips: [0, 0.07, 0], upperarmL: [-4, 0, 40], ...tip(34), ...ears(-24, 8), ...tailUp(14) } },
    { t: 0.62, p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-26, 0, 0], _hips: [0, 0.05, 0], upperarmL: [-4, 0, 40], ...tip(28), ...ears(-12, 6), ...tailUp(10) } },
    { t: 0.84, p: { spine: [2, 0, 0], chest: [0, 6, 0], head: [-22, 0, 6], _hips: [0, -0.02, 0.01], upperarmL: [-58, 0, 34], forearmL: [-26, 0, 0], handL: [-46, 0, 0], ...ears(10, 4) } },
    { t: 1.06, p: { spine: [2, 0, 0], head: [-6, 0, 0], _hips: [0, -0.01, 0], upperarmL: [-40, 0, 26], forearmL: [-30, 0, 0], handL: [-30, 0, 0] } },
    { t: 1.25, p: {} },
  ], fn: (t) => { const e = bump(t, 0.41, 0.16), a = 2 * Math.PI * (t - 0.25) / 0.16, w = bump(t, 1.0, 0.07), b = 2 * Math.PI * t / 0.075; return { hips: [0, 4 * e * Math.cos(a), -8 * e * Math.cos(a)], _hips: [0.03 * e * Math.cos(a), 0, 0], spine: [0, 0, 7 * e * Math.cos(a)], chest: [0, 0, 3 * e * Math.cos(a)], head: [0, 9 * w * Math.sin(b), -4 * e * Math.cos(a)], earL: [0, 0, 22 * w * Math.sin(b)], earR: [0, 0, 22 * w * Math.sin(b + 1)], ...tailSway(t, 0.32, 10 * e) }; } },
  // S59 Creeping Moss: she bowls a ball of moss along the floor from a low lunge, follows through high, then shades her eyes to watch it roll.
  c_creeping_moss: { T: 1.1, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [10, -14, 0], chest: [4, -18, 0], head: [-4, 26, 0], _hips: [0, -0.06, -0.03], upperarmL: [48, 0, -4], forearmL: [-8, 0, 0], upperarmR: [-10, 0, -10], legR: [-10, 0, -2], legL: [8, 0, 2], ...ears(12) } },
    { t: 0.16, ease: 'in', p: { spine: [30, 6, 0], chest: [8, 14, 0], head: [-28, -10, 0], _hips: [0, -0.12, 0.08], upperarmL: [-50, 0, -4], forearmL: [4, 0, 0], handL: [-30, 0, 0], upperarmR: [28, 0, -52], legR: [-30, 0, -4], legL: [24, 0, 4], footL: [30, 0, 0], ...ears(-22, 6) } },
    { t: 0.30, p: { spine: [22, 6, 0], chest: [4, 12, 0], head: [-22, -8, 0], _hips: [0, -0.09, 0.09], upperarmL: [-114, 0, 0], forearmL: [-4, 0, 0], handL: [-50, 0, 0], upperarmR: [24, 0, -54], legR: [-28, 0, -4], legL: [22, 0, 4], footL: [30, 0, 0], ...ears(-14, 6), ...tailUp(16) } },
    { t: 0.52, p: { spine: [8, 2, 0], chest: [2, 4, 0], head: [-10, 0, 8], _hips: [0, -0.03, 0.05], upperarmL: [-76, 0, 8], forearmL: [-20, 0, 0], upperarmR: [8, 0, -20], legR: [-14, 0, -2], legL: [10, 0, 2], ...tailUp(8) } },
    { t: 0.72, p: { spine: [4, 0, 0], head: [-6, 0, 8], _hips: [0, 0.025, 0.02], upperarmL: [-84, 0, -8], forearmL: [-96, 30, 0], handL: [-10, 0, 0], ...tip(18), ...ears(-8, 4), ...tailUp(12) } },
    { t: 0.9, p: { spine: [3, 0, 0], head: [-4, 0, 6], _hips: [0, 0.02, 0.015], upperarmL: [-80, 0, -8], forearmL: [-92, 30, 0], handL: [-10, 0, 0], ...tip(14) } },
    { t: 1.1, p: {} },
  ], fn: (t) => tailSway(t, 0.55, 8 * bump(t, 0.8, 0.2)) },
  // S61 Leaf Gale: the staff spun like a propeller in front of her; she braces against her own wind, ears and tail streaming.
  c_wind_wall: { T: 1.2, ct: 0.16, nolag: true, twirl: { axis: [0, 0, 1], keys: [[0.08, 0], [0.16, 150, 'in'], [0.78, 1440, 'out']] },
    staffPose: { from: 0.0, to: 1.06, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.08, p: [-0.08, 0.54, 0.34], d: [0, 1, 0.04] },
      { t: 0.16, ease: 'in', p: [-0.06, 0.58, 0.44], d: [0, 1, 0] },
      { t: 0.78, p: [-0.06, 0.58, 0.43], d: [0, 1, 0] },
      { t: 0.92, p: [-0.10, 0.46, 0.34], d: [0, 0.98, 0.16] },
      { t: 1.20, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [8, 0, 0], head: [4, 0, 0], _hips: [0, -0.04, 0], ...wide(6), ...ears(10) } },
    { t: 0.16, ease: 'in', p: { spine: [-10, 0, 0], chest: [-4, 0, 0], head: [-2, 0, 0], _hips: [0, -0.06, -0.025], upperarmL: [26, 0, 44], forearmL: [-20, 0, 0], legL: [-14, 0, 14], legR: [18, 0, -14], footR: [14, 0, 0], ...ears(-30, 8), ...tailUp(22) } },
    { t: 0.78, p: { spine: [-12, 0, 0], chest: [-5, 0, 0], head: [0, 0, 0], _hips: [0, -0.065, -0.035], upperarmL: [30, 0, 48], forearmL: [-20, 0, 0], legL: [-14, 0, 14], legR: [18, 0, -14], footR: [14, 0, 0], ...ears(-30, 8), ...tailUp(24) } },
    { t: 0.92, p: { spine: [8, 0, 0], head: [6, 0, 0], _hips: [0, -0.03, 0.02], upperarmL: [0, 0, 20], ...wide(8), ...ears(18, 4) } },
    { t: 1.2, p: {} },
  ], fn: (t) => { const e = Math.min(1, Math.max(0, (t - 0.16) / 0.1)) * Math.min(1, Math.max(0, (0.82 - t) / 0.1)), a = 2 * Math.PI * t / 0.085; return { earL: [6 * e * Math.sin(a), 0, 4 * e * Math.cos(a)], earR: [6 * e * Math.sin(a + 1.3), 0, -4 * e * Math.cos(a + 1.3)], chest: [1.2 * e * Math.sin(a * 0.5), 0, 0], tail3: [0, 10 * e * Math.sin(a * 0.6), 0], tail4: [0, 14 * e * Math.sin(a * 0.6 - 0.8), 0], tail5: [0, 18 * e * Math.sin(a * 0.6 - 1.6), 0] }; } },
  // S72 Lure Lily: she sets it down with a low paw, leans in for two sniffs, straightens with her tail up, and wafts the scent at the foes.
  c_lure_lily: { T: 1.2, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [10, 0, 0], head: [4, 0, 0], _hips: [0, -0.05, 0], upperarmL: [-30, 0, -10], forearmL: [-50, 0, 0], ...ears(10) } },
    { t: 0.16, ease: 'in', p: { spine: [26, 0, 0], chest: [8, 6, 0], head: [-16, 0, 0], _hips: [0, -0.11, 0.04], upperarmL: [-60, 0, -4], forearmL: [6, 0, 0], handL: [24, 0, 0], ...wide(9), ...ears(18, 4) } },
    { t: 0.30, p: { spine: [20, 0, 0], chest: [8, 0, 0], head: [0, 0, 0], _hips: [0, -0.06, 0.05], upperarmL: [-28, 0, 12], forearmL: [-40, 0, 0], ...wide(7), ...ears(20, 0) } },
    { t: 0.56, p: { spine: [20, 0, 0], chest: [8, 0, 0], head: [2, 0, 0], _hips: [0, -0.06, 0.05], upperarmL: [-28, 0, 12], forearmL: [-40, 0, 0], ...wide(7), ...ears(20, 0) } },
    { t: 0.68, p: { spine: [-6, 0, 0], chest: [-4, 0, 0], head: [-16, 0, 8], _hips: [0, 0.035, 0], upperarmL: [-72, 0, 18], forearmL: [-34, 0, 0], handL: [-20, 0, 0], ...tip(24), ...ears(-12, 6), ...tailUp(28) } },
    { t: 0.98, p: { spine: [-4, 0, 0], chest: [-3, 0, 0], head: [-12, 0, 8], _hips: [0, 0.025, 0], upperarmL: [-72, 0, 18], forearmL: [-34, 0, 0], handL: [-20, 0, 0], ...tip(18), ...tailUp(24) } },
    { t: 1.2, p: {} },
  ], fn: (t) => { const s1 = bump(t, 0.38, 0.035) + bump(t, 0.5, 0.035), w = bump(t, 0.84, 0.13), a = 2 * Math.PI * t / 0.2; return { head: [9 * s1, 0, 0], chest: [3 * s1, 0, 0], _hips: [0, 0, 0.008 * s1], earL: [8 * s1, 0, 0], earR: [8 * s1, 0, 0], handL: [0, 0, 30 * w * Math.sin(a)], forearmL: [0, 18 * w * Math.sin(a), 0], ...tailSway(t, 0.4, 12 * w) }; } },
  // ---------------- damage ----------------
  // S20 Scatter Seeds: a sower's throw. A pawful from the pouch at her hip, flung out in a wide arc, then she dusts her paw on her tabard.
  c_lantern_flurry: { T: 1.0, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 0.86, fade: 0.12, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.16, 0.44, 0.26], d: [-0.22, 0.95, 0.2] },
      { t: 0.28, p: [-0.20, 0.46, 0.18], d: [-0.4, 0.9, -0.1] },
      { t: 0.46, p: [-0.20, 0.46, 0.16], d: [-0.42, 0.88, -0.14] },
      { t: 0.68, p: [-0.15, 0.43, 0.26], d: [-0.15, 0.96, 0.2] },
      { t: 1.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [6, -26, 0], spine: [4, -10, 0], head: [4, 20, 0], _hips: [0, -0.04, -0.02], upperarmL: [-24, 0, -34], forearmL: [-50, 56, 0], ...ears(10) } },
    { t: 0.16, ease: 'in', p: { chest: [4, 10, 0], spine: [3, 4, 0], head: [-8, -6, 0], _hips: [0, -0.03, 0.06], upperarmL: [-72, 0, 10], forearmL: [-6, 0, 0], handL: [-30, 0, 0], legL: [-22, 0, 0], legR: [14, 0, 0], footR: [16, 0, 0], ...ears(-18) } },
    { t: 0.28, p: { chest: [0, 36, 0], spine: [0, 14, 0], head: [-8, -26, 0], _hips: [0, 0.01, 0.06], upperarmL: [-50, 0, 80], forearmL: [0, -10, 0], handL: [-40, 0, 20],  legL: [-20, 0, 0], legR: [12, 0, 0], ...tip(14), ...ears(-14, 6), tail1: [0, -18, 0], tail2: [0, -14, 0] } },
    { t: 0.46, p: { chest: [-2, 40, 0], spine: [0, 16, 0], head: [-8, -30, 0], _hips: [0, 0.02, 0.05], upperarmL: [-20, 0, 96], handL: [-30, 0, 20],  legL: [-16, 0, 0], legR: [10, 0, 0], ...tip(12) } },
    { t: 0.68, p: { chest: [4, 4, 0], spine: [2, 0, 0], head: [10, 0, 0], _hips: [0, -0.01, 0.01], upperarmL: [-30, 0, -14], forearmL: [-70, 40, 0], ...ears(8) } },
    { t: 0.84, p: { chest: [4, 2, 0], head: [8, 0, 0], upperarmL: [-28, 0, -14], forearmL: [-66, 40, 0] } },
    { t: 1.0, p: {} },
  ], fn: (t) => { const e = bump(t, 0.76, 0.09); return { handL: [22 * e * Math.sin(2 * Math.PI * t / 0.12), 0, 0], forearmL: [-8 * e * Math.sin(2 * Math.PI * t / 0.12), 0, 0] }; } },
  // S21 Rootspear: the staff stabbed down at a slant in both paws, then levered forward over its foot so the roots rip up the line; a yank frees it.
  c_pale_lance: { T: 1.05, ct: 0.16, nolag: true, twoHand: { from: 0.0, to: 0.9, fade: 0.1, y: 0.56 },
    staffPose: { from: 0.0, to: 0.9, fade: 0.1, keys: [
      { t: 0.00, p: [-0.10, 0.50, 0.28], d: [-0.2, 0.95, -0.1] },
      { t: 0.06, p: [-0.10, 0.72, 0.20], d: [-0.2, 0.88, -0.48] },
      { t: 0.16, ease: 'in', p: [-0.10, 0.40, 0.30], d: [-0.2, 0.9, -0.43] },
      { t: 0.22, p: [-0.10, 0.41, 0.31], d: [-0.2, 0.92, -0.38] },
      { t: 0.36, ease: 'in', p: [-0.10, 0.435, 0.50], d: [-0.2, 0.98, 0.2] },
      { t: 0.56, p: [-0.10, 0.43, 0.49], d: [-0.2, 0.985, 0.16] },
      { t: 0.72, ease: 'out', p: [-0.10, 0.64, 0.32], d: [-0.2, 0.95, -0.3] },
      { t: 1.05, p: [-0.10, 0.44, 0.32], d: [-0.2, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-12, 0, 0], _hips: [0, 0.05, -0.02], ...wide(8), ...tip(24), ...ears(-16) } },
    { t: 0.16, ease: 'in', p: { spine: [18, 0, 0], chest: [8, 0, 0], head: [-18, 0, 0], _hips: [0, -0.08, 0.02], ...wide(16), ...ears(24, 4) } },
    { t: 0.22, p: { spine: [14, 0, 0], chest: [6, 0, 0], head: [-14, 0, 0], _hips: [0, -0.065, 0.02], ...wide(15) } },
    { t: 0.36, ease: 'in', p: { spine: [28, 0, 0], chest: [10, 0, 0], head: [-28, 0, 0], _hips: [0, -0.06, 0.10], legL: [-26, 0, 10], legR: [22, 0, -10], footR: [24, 0, 0], ...ears(-22, 6), ...tailUp(14) } },
    { t: 0.56, p: { spine: [26, 0, 0], chest: [9, 0, 0], head: [-26, 0, 0], _hips: [0, -0.055, 0.095], legL: [-26, 0, 10], legR: [22, 0, -10], footR: [22, 0, 0], ...tailUp(10) } },
    { t: 0.72, ease: 'out', p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-10, 0, 0], _hips: [0, 0.025, -0.02], legL: [-8, 0, 8], legR: [6, 0, -8], ...tip(16), ...ears(-18, 4) } },
    { t: 0.88, p: { spine: [4, 0, 0], head: [2, 0, 0], _hips: [0, -0.02, 0], ...wide(5), ...ears(10) } },
    { t: 1.05, p: {} },
  ] },
  // S22 Wispfall: she lifts the staff over her head in both paws and holds it there for as long as the wisps fall.
  c_bell_toll: { T: 0.6, ct: 0.16, nolag: true, twoHand: { from: 0.0, to: 99, fade: 0.1, y: 0.38 },
    staffPose: { from: 0.0, to: 99, fade: 0.1, keys: [
      { t: 0.00, p: [-0.03, 0.46, 0.40], d: [0, 1, 0.05] },
      { t: 0.06, p: [-0.03, 0.42, 0.42], d: [0, 1, 0.08] },
      { t: 0.16, ease: 'in', p: [-0.15, 0.78, 0.22], d: [-0.22, 0.97, -0.04] },
      { t: 0.30, p: [-0.15, 0.70, 0.23], d: [-0.2, 0.98, 0.0] },
      { t: 0.60, p: [-0.15, 0.72, 0.22], d: [-0.2, 0.98, 0.0] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [10, 0, 0], head: [8, 0, 0], _hips: [0, -0.05, 0], ...wide(5), ...ears(14) } },
    { t: 0.16, ease: 'in', p: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-24, 0, 0], _hips: [0, 0.07, 0], ...wide(7), ...tip(32), ...ears(-24, 8), ...tailUp(16) } },
    { t: 0.30, p: { spine: [-5, 0, 0], chest: [-5, 0, 0], head: [-18, 0, 0], _hips: [0, 0.025, 0], ...wide(7), ...tip(18), ...ears(-6, 6), ...tailUp(8) } },
    { t: 0.60, p: { spine: [-6, 0, 0], chest: [-5, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, 0], ...wide(7), ...tip(20), ...ears(-8, 6), ...tailUp(10) } },
  ] },
  c_bell_loop: { T: 1.2, loop: true, nolag: true, twoHand: { from: -1, to: 99, fade: 0.1, y: 0.38 },
    staffPose: { from: -1, to: 99, fade: 0.1, keys: stir(0, 1.2, 12, [-0.15, 0.72, 0.22], [-0.2, 0.98, 0.0], 0.1, 1, 0) },
    keys: [
    { t: 0, p: { spine: [-6, 0, 0], chest: [-5, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, 0], ...wide(7), ...tip(20), ...ears(-8, 6), ...tailUp(10) } },
    { t: 1.2, p: { spine: [-6, 0, 0], chest: [-5, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, 0], ...wide(7), ...tip(20), ...ears(-8, 6), ...tailUp(10) } },
  ], fn: (t) => { const a = 2 * Math.PI * t / 1.2, b = Math.sin(2 * a); return { _hips: [0.006 * Math.cos(a), 0.01 * b, 0], hips: [0, 0, 2.5 * Math.cos(a)], spine: [1.5 * b, 0, -2.5 * Math.cos(a)], head: [-3 * b, 0, 3 * Math.sin(a)], footL: [3 * b, 0, 0], footR: [3 * b, 0, 0], earL: [4 * Math.sin(2 * a - 0.6), 0, 0], earR: [4 * Math.sin(2 * a - 0.9), 0, 0], ...tailSway(t, 1.2, 12) }; } },
  c_bell_end: { T: 0.75, nolag: true, twoHand: { from: -1, to: 0.5, fade: 0.2, y: 0.38 },
    staffPose: { from: -1, to: 0.56, fade: 0.2, keys: [
      { t: 0.00, p: [-0.15, 0.72, 0.22], d: [-0.2, 0.98, 0.0] },
      { t: 0.24, p: [-0.08, 0.50, 0.36], d: [-0.08, 1, 0.08] },
      { t: 0.75, p: [-0.03, 0.44, 0.36], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: { spine: [-6, 0, 0], chest: [-5, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, 0], ...wide(7), ...tip(20), ...ears(-8, 6), ...tailUp(10) } },
    { t: 0.24, p: { spine: [12, 0, 0], chest: [6, 0, 0], head: [12, 0, 0], _hips: [0, -0.045, 0], ...wide(6), ...ears(20, 8) } },
    { t: 0.46, p: { spine: [6, 0, 0], head: [4, 0, 0], _hips: [0, -0.02, 0], ...wide(3), ...ears(10, 4) } },
    { t: 0.75, p: {} },
  ] },
  // S23 Rootsnare: a high paw slapped flat on the floor from a kneel; her fingers spread as the roots run out.
  c_rootsnare: { T: 1.0, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-6, 0, 0], head: [-10, 0, 0], _hips: [0, 0.04, 0], upperarmL: [-132, 0, 10], forearmL: [-20, 0, 0], ...tip(20), ...ears(-14) } },
    { t: 0.16, ease: 'in', p: { spine: [34, 0, 0], chest: [12, 8, 0], head: [-24, 0, 0], _hips: [0, -0.155, 0.04], upperarmL: [-54, 0, -4], forearmL: [4, 0, 0], handL: [34, 0, 0], upperarmR: [8, 0, -32], ...wide(15), ...ears(26, 6) } },
    { t: 0.24, p: { spine: [28, 0, 0], chest: [10, 8, 0], head: [-20, 0, 0], _hips: [0, -0.125, 0.04], upperarmL: [-56, 0, -4], forearmL: [0, 0, 0], handL: [26, 0, 0], upperarmR: [6, 0, -28], ...wide(14) } },
    { t: 0.56, p: { spine: [31, 0, 0], chest: [11, 8, 0], head: [-26, 0, 0], _hips: [0, -0.14, 0.04], upperarmL: [-54, 0, -4], forearmL: [4, 0, 0], handL: [32, 0, 0], fingersL: [-24, 0, 0],  ...wide(15), ...ears(6, 4) } },
    { t: 0.78, p: { spine: [10, 0, 0], chest: [2, 2, 0], head: [-10, 0, 0], _hips: [0, -0.04, 0.02], upperarmL: [-40, 0, 6], forearmL: [-20, 0, 0], ...wide(8), ...ears(-8) } },
    { t: 1.0, p: {} },
  ], fn: (t) => { const e = bump(t, 0.4, 0.12), a = 2 * Math.PI * t / 0.08; return { handL: [0, 0, 3 * e * Math.sin(a)], chest: [0, 0, 1.2 * e * Math.sin(a)] }; } },
  // S23, three seconds on: the roots clench. She makes a fist and hauls it back to her shoulder.
  c_yank: { T: 0.6, ct: 0.12, keys: [
    { t: 0, p: {} },
    { t: 0.04, p: { chest: [4, 12, 0], spine: [4, 4, 0], _hips: [0, -0.02, 0.03], upperarmL: [-76, 0, 0], forearmL: [-4, 0, 0], handL: [-30, 0, 0], ...ears(8) } },
    { t: 0.12, ease: 'in', p: { chest: [-6, -26, 0], spine: [-8, -10, 0], head: [4, 18, 0], _hips: [0, -0.04, -0.05], upperarmL: [14, 0, -6], forearmL: [-116, 0, 0], handL: [40, 0, 0], fingersL: [50, 0, 0], legL: [-16, 0, 4], legR: [10, 0, -4], ...ears(-22, 4), ...tailUp(14) } },
    { t: 0.20, p: { chest: [-4, -20, 0], spine: [-5, -8, 0], head: [2, 14, 0], _hips: [0, -0.03, -0.04], upperarmL: [8, 0, -6], forearmL: [-108, 0, 0], handL: [36, 0, 0], fingersL: [50, 0, 0], legL: [-14, 0, 4], legR: [9, 0, -4] } },
    { t: 0.38, p: { chest: [-4, -20, 0], spine: [-5, -8, 0], head: [2, 14, 0], _hips: [0, -0.03, -0.04], upperarmL: [10, 0, -6], forearmL: [-110, 0, 0], handL: [38, 0, 0], fingersL: [50, 0, 0], legL: [-14, 0, 4], legR: [9, 0, -4] } },
    { t: 0.6, p: {} },
  ] },
  // S24 Puffcap: an underhand lob with a hop, then she pinches her nose and turns her face from the spores.
  c_dawn_brand: { T: 1.1, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [12, -8, 0], chest: [4, -8, 0], head: [-2, 10, 0], _hips: [0, -0.07, 0], upperarmL: [50, 0, 0], forearmL: [-10, 0, 0], ...wide(5), ...ears(14) } },
    { t: 0.16, ease: 'in', p: { spine: [-10, 0, 0], chest: [-8, 6, 0], head: [-20, 0, 0], _hips: [0, 0.09, 0.03], upperarmL: [-104, 0, 0], forearmL: [-8, 0, 0], handL: [-44, 0, 0], upperarmR: [10, 0, -26], legL: [-18, 0, 6], legR: [8, 0, -6], ...tip(34), ...ears(-24, 8), ...tailUp(20) } },
    { t: 0.28, p: { spine: [-8, 0, 0], chest: [-8, 6, 0], head: [-24, 0, 0], _hips: [0, 0.11, 0.035], upperarmL: [-140, 0, 6], forearmL: [-4, 0, 0], handL: [-30, 0, 0], upperarmR: [12, 0, -30], legL: [-12, 0, 6], legR: [4, 0, -6], ...tip(34), ...ears(-18, 8), ...tailUp(22) } },
    { t: 0.42, ease: 'in', p: { spine: [10, 0, 0], chest: [4, 0, 0], head: [-6, 0, 0], _hips: [0, -0.055, 0.03], upperarmL: [-80, 0, 10], forearmL: [-30, 0, 0], ...wide(8), ...ears(22, 4) } },
    { t: 0.58, p: { spine: [4, -4, 0], chest: [0, -12, 0], head: [6, -30, -6], _hips: [0, -0.02, -0.02], upperarmL: [-60, 0, -22], forearmL: [-116, 22, 0], handL: [20, 0, 0], ...wide(4), ...ears(22, 8) } },
    { t: 0.86, p: { spine: [4, -4, 0], chest: [0, -12, 0], head: [8, -32, -6], _hips: [0, -0.02, -0.02], upperarmL: [-60, 0, -22], forearmL: [-116, 22, 0], handL: [20, 0, 0], ...wide(4), ...ears(24, 8) } },
    { t: 1.1, p: {} },
  ] },
  // S71 Snapjaw: her paw is the jaws. She rears back with it raised open like a striking head, then lunges low and snaps it
  // shut twice, her whole body biting with it; ears pinned, tail lashing. The staff swings back for balance.
  c_snapjaw: { T: 1.0, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-14, 0, 0], chest: [-8, -18, 0], head: [-12, 10, 0], _hips: [0, 0.03, -0.06], upperarmL: [-128, 0, -4], forearmL: [-40, 0, 0], handL: [-60, 0, 0], fingersL: [-30, 0, 0], legR: [16, 0, 0], ...ears(-6, 8), tail1: [10, 18, 0], tail2: [8, 14, 0] } },
    { t: 0.16, ease: 'in', p: { spine: [26, 0, 0], chest: [12, 20, 0], head: [-10, -10, 0], _hips: [0, -0.09, 0.13], upperarmL: [-80, 0, -6], forearmL: [-2, 0, 0], handL: [44, 0, 0], fingersL: [60, 0, 0], legL: [-36, 0, 0], legR: [26, 0, 0], footR: [30, 0, 0], ...ears(-34, 6), tail1: [-10, -22, 0], tail2: [-8, -16, 0] } },
    { t: 0.25, p: { spine: [14, 0, 0], chest: [4, 8, 0], head: [-12, 0, 0], _hips: [0, -0.06, 0.09], upperarmL: [-74, 0, -2], forearmL: [-56, 0, 0], handL: [-60, 0, 0], fingersL: [-30, 0, 0], legL: [-28, 0, 0], legR: [20, 0, 0], footR: [20, 0, 0], ...ears(-4, 6) } },
    { t: 0.34, ease: 'in', p: { spine: [30, 0, 0], chest: [14, 24, 0], head: [-6, -12, 0], _hips: [0, -0.10, 0.15], upperarmL: [-74, 0, -6], forearmL: [0, 0, 0], handL: [48, 0, 0], fingersL: [64, 0, 0], legL: [-38, 0, 0], legR: [28, 0, 0], footR: [32, 0, 0], ...ears(-36, 6), tail1: [-12, -24, 0], tail2: [-10, -18, 0] } },
    { t: 0.46, p: { spine: [24, 0, 0], chest: [10, 20, 0], head: [-10, -10, 8], _hips: [0, -0.085, 0.13], upperarmL: [-76, 0, -6], forearmL: [-4, 0, 0], handL: [42, 0, 0], fingersL: [60, 0, 0], legL: [-34, 0, 0], legR: [26, 0, 0], footR: [26, 0, 0], ...tailUp(16) } },
    { t: 0.70, p: { spine: [10, 0, 0], chest: [4, 8, 0], head: [-10, -4, 8], _hips: [0, -0.03, 0.06], upperarmL: [-60, 0, -2], forearmL: [-14, 0, 0], handL: [24, 0, 0], fingersL: [30, 0, 0], legL: [-16, 0, 0], legR: [12, 0, 0], ...ears(10, 4), ...tailUp(18) } },
    { t: 1.0, p: {} },
  ], fn: (t) => { const e = bump(t, 0.4, 0.1), a = 2 * Math.PI * t / 0.07; return { chest: [0, 0, 1.6 * e * Math.sin(a)], handL: [0, 0, 4 * e * Math.sin(a)], ...tailSway(t, 0.2, 18 * bump(t, 0.5, 0.25)) }; } },
  // S51 Oakling: two hard knocks of the staff's foot on the floor, a real hop off her toes with each, then she bends low and
  // beckons it up with her paw, rising with it.
  c_restorative_wave: { T: 1.25, ct: 0.16, nolag: true,
    staffPose: { from: 0.0, to: 1.1, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.44, 0.30], d: [0, 0.97, 0.2] },
      { t: 0.07, p: [-0.12, 0.66, 0.36], d: [0, 1, 0.03] },
      { t: 0.16, ease: 'in', p: [-0.12, 0.40, 0.36], d: [0, 1, 0.03] },
      { t: 0.25, p: [-0.12, 0.64, 0.36], d: [0, 1, 0.0] },
      { t: 0.34, ease: 'in', p: [-0.12, 0.40, 0.36], d: [0, 1, 0.03] },
      { t: 0.42, p: [-0.12, 0.45, 0.34], d: [0, 1, 0.04] },
      { t: 0.54, p: [-0.14, 0.40, 0.30], d: [-0.12, 0.98, 0.12] },
      { t: 0.94, p: [-0.13, 0.48, 0.32], d: [-0.08, 0.99, 0.1] },
      { t: 1.25, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.07, p: { spine: [-8, 0, 0], chest: [-4, 0, 0], head: [-10, 0, 0], _hips: [0, 0.08, 0.01], legL: [-12, 0, 0], legR: [8, 0, 0], ...tip(36), ...ears(-18, 6), ...tailUp(14) } },
    { t: 0.16, ease: 'in', p: { spine: [14, 0, 0], chest: [6, 0, 0], head: [10, 0, 0], _hips: [0, -0.08, 0.01], ...wide(9), ...ears(26, 8), ...tailUp(-8) } },
    { t: 0.25, p: { spine: [-6, 0, 0], chest: [-4, 0, 0], head: [-8, 0, 0], _hips: [0, 0.075, 0.01], legL: [-12, 0, 0], legR: [8, 0, 0], ...tip(34), ...ears(-18, 6), ...tailUp(14) } },
    { t: 0.34, ease: 'in', p: { spine: [16, 0, 0], chest: [7, 0, 0], head: [12, 0, 0], _hips: [0, -0.09, 0.01], ...wide(10), ...ears(28, 8), ...tailUp(-8) } },
    { t: 0.54, p: { spine: [28, 0, 0], chest: [12, 10, 0], head: [-6, -6, 10], _hips: [0, -0.10, 0.04], upperarmL: [-50, 0, 10], forearmL: [-16, 0, 0], handL: [-40, 0, 0], ...wide(12), ...ears(14, 4) } },
    { t: 0.94, p: { spine: [6, 0, 0], chest: [2, 6, 0], head: [-14, -4, 8], _hips: [0, 0.0, 0.03], upperarmL: [-96, 0, 14], forearmL: [-20, 0, 0], handL: [-40, 0, 0], ...wide(6), ...tip(12), ...ears(-8, 4), ...tailUp(18) } },
    { t: 1.25, p: {} },
  ], fn: (t) => { const e = bump(t, 0.74, 0.17), c = Math.max(0, Math.sin(2 * Math.PI * (t - 0.56) / 0.17)); return { forearmL: [-60 * e * c, 0, 0], handL: [-30 * e * c, 0, 0], fingersL: [50 * e * c, 0, 0], head: [3 * e * c, 0, 0], ...tailSway(t, 0.4, 12 * e) }; } },
  // S62 Wild Thicket: a jump with the staff flat over her head, slammed down across the floor in both paws; the thorns come up as she heaves it back up.
  c_wild_thicket: { T: 1.15, ct: 0.16, nolag: true, twoHand: { from: 0.0, to: 0.9, fade: 0.1, y: 0.2 },
    staffPose: { from: 0.0, to: 1.0, fade: 0.1, keys: [
      { t: 0.00, p: [-0.14, 0.50, 0.28], d: [-0.6, 0.78, 0.1] },
      { t: 0.06, p: [-0.16, 0.86, 0.22], d: [-0.98, 0.16, 0] },
      { t: 0.16, ease: 'in', p: [-0.16, 0.30, 0.40], d: [-0.995, 0.03, 0.05] },
      { t: 0.24, p: [-0.16, 0.34, 0.40], d: [-0.99, 0.06, 0.05] },
      { t: 0.44, p: [-0.16, 0.31, 0.40], d: [-0.995, 0.03, 0.05] },
      { t: 0.64, p: [-0.16, 0.68, 0.34], d: [-0.9, 0.42, 0] },
      { t: 0.88, p: [-0.14, 0.50, 0.32], d: [-0.3, 0.92, 0.2] },
      { t: 1.15, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-14, 0, 0], _hips: [0, 0.13, 0], legL: [-20, 0, 12], legR: [-14, 0, -12], ...tip(30), ...ears(-24, 8), ...tailUp(18) } },
    { t: 0.16, ease: 'in', p: { spine: [30, 0, 0], chest: [12, 0, 0], head: [-26, 0, 0], _hips: [0, -0.13, 0.03], ...wide(24), ...ears(28, 6) } },
    { t: 0.24, p: { spine: [24, 0, 0], chest: [10, 0, 0], head: [-20, 0, 0], _hips: [0, -0.10, 0.03], ...wide(22) } },
    { t: 0.44, p: { spine: [27, 0, 0], chest: [11, 0, 0], head: [-24, 0, 0], _hips: [0, -0.115, 0.03], ...wide(23), ...ears(8, 4) } },
    { t: 0.64, p: { spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, 0], ...wide(14), ...tip(18), ...ears(-18, 6), ...tailUp(14) } },
    { t: 0.88, p: { spine: [2, 0, 0], head: [-4, 0, 0], _hips: [0, -0.015, 0], ...wide(6), ...ears(8) } },
    { t: 1.15, p: {} },
  ], fn: (t) => { const e = bump(t, 0.34, 0.1), a = 2 * Math.PI * t / 0.07; return { _hips: [0.004 * e * Math.sin(a), 0, 0], chest: [0, 0, 1.5 * e * Math.sin(a)], head: [0, 0, -1.5 * e * Math.sin(a)] }; } },
  // S73 Petal Twister: a whip of the staff sends it off, then she keeps it turning: the staff wheels at her side like a mill, her hips circling with it.
  c_petal_twister: { T: 1.2, ct: 0.16, nolag: true, twirl: { axis: [1, 0, 0], keys: [[0.30, 0], [0.92, 1080, 'out']] },
    staffPose: { from: 0.0, to: 1.08, fade: 0.1, keys: [
      { t: 0.00, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] },
      { t: 0.06, p: [-0.14, 0.60, 0.16], d: [-0.2, 0.7, -0.68] },
      { t: 0.16, ease: 'in', p: [-0.06, 0.58, 0.44], d: [0, 0.3, 0.95] },
      { t: 0.30, p: [-0.23, 0.62, 0.22], d: [0, 1, 0] },
      { t: 0.92, p: [-0.23, 0.62, 0.22], d: [0, 1, 0] },
      { t: 1.02, p: [-0.10, 0.52, 0.30], d: [0, 0.97, 0.2] },
      { t: 1.20, p: [-0.12, 0.42, 0.30], d: [0, 0.95, 0.3] }] },
    keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { chest: [-4, -24, 0], spine: [-2, -10, 0], head: [0, 20, 0], _hips: [0, -0.03, -0.03], ...ears(10) } },
    { t: 0.16, ease: 'in', p: { chest: [10, 18, 0], spine: [8, 8, 0], head: [-10, -12, 0], _hips: [0, -0.04, 0.07], upperarmL: [26, 0, 34], legL: [-24, 0, 0], legR: [18, 0, 0], footR: [18, 0, 0], ...ears(-22) } },
    { t: 0.30, p: { chest: [-6, 0, 0], spine: [-6, 0, 0], head: [-20, 0, 0], _hips: [0, 0.04, 0.02], upperarmL: [-10, 0, 60], legL: [-8, 0, 6], legR: [6, 0, -6], ...tip(26), ...ears(-14, 8) } },
    { t: 0.90, p: { chest: [-6, 0, 0], spine: [-6, 0, 0], head: [-20, 0, 0], _hips: [0, 0.035, 0.02], upperarmL: [-10, 0, 60], legL: [-8, 0, 6], legR: [6, 0, -6], ...tip(24), ...ears(-10, 8) } },
    { t: 1.02, p: { spine: [6, 0, 0], head: [4, 0, 0], _hips: [0, -0.025, 0], upperarmL: [0, 0, 16], ...ears(12) } },
    { t: 1.2, p: {} },
  ], fn: (t) => { const e = Math.min(1, Math.max(0, (t - 0.3) / 0.12)) * Math.min(1, Math.max(0, (0.92 - t) / 0.12)), a = 2 * Math.PI * (t - 0.3) / 0.3; return { _hips: [0.012 * e * Math.cos(a), 0, 0.012 * e * Math.sin(a)], hips: [3 * e * Math.sin(a), 0, 4 * e * Math.cos(a)], spine: [-3 * e * Math.sin(a), 0, -4 * e * Math.cos(a)], head: [2 * e * Math.sin(a), 0, 3 * e * Math.cos(a)], ...tailSway(t, 0.3, 14 * e) }; } },
  // S65 Drowsy Spores: a puff blown off her flat palm; then the spores get to her too. A huge yawn, a nod, and she shakes herself awake.
  c_drowsy_spores: { T: 1.4, ct: 0.16, keys: [
    { t: 0, p: {} },
    { t: 0.06, p: { spine: [-6, 0, 0], chest: [-6, 0, 0], head: [6, 0, 0], _hips: [0, 0.02, -0.01], upperarmL: [-64, 0, -12], forearmL: [-84, 20, 0], handL: [-40, 0, 0], ...tip(12), ...ears(-8) } },
    { t: 0.16, ease: 'in', p: { spine: [8, 0, 0], chest: [10, 0, 0], head: [8, 0, 0], _hips: [0, -0.02, 0.03], upperarmL: [-76, 0, -4], forearmL: [-30, 0, 0], handL: [-60, 0, 0], ...ears(-16, 4) } },
    { t: 0.34, p: { spine: [4, 0, 0], chest: [4, 0, 0], head: [-4, 0, 4], _hips: [0, -0.01, 0.02], upperarmL: [-70, 0, -2], forearmL: [-34, 0, 0], handL: [-56, 0, 0] } },
    { t: 0.52, p: { spine: [-12, 0, 0], chest: [-10, 0, 0], head: [-30, 0, 6], _hips: [0, 0.03, -0.01], upperarmL: [-60, 0, -16], forearmL: [-112, 24, 0], handL: [10, 0, 0], upperarmR: [-30, 0, -50], forearmR: [-20, 0, 0], ...tip(24), ...ears(24, 10) } },
    { t: 0.74, p: { spine: [-14, 0, 0], chest: [-12, 0, 0], head: [-34, 0, 8], _hips: [0, 0.04, -0.01], upperarmL: [-60, 0, -16], forearmL: [-114, 24, 0], handL: [10, 0, 0], upperarmR: [-40, 0, -60], forearmR: [-14, 0, 0], ...tip(28), ...ears(26, 12) } },
    { t: 0.92, p: { spine: [12, 0, 0], chest: [6, 0, 0], head: [24, 0, -8], _hips: [0, -0.035, 0], upperarmL: [-10, 0, 4], ...ears(30, 12) } },
    { t: 1.06, p: { spine: [14, 0, 0], chest: [8, 0, 0], head: [34, 0, -10], _hips: [0, -0.045, 0.01], ...ears(32, 14) } },
    { t: 1.14, ease: 'out', p: { spine: [-4, 0, 0], head: [-12, 0, 0], _hips: [0, 0.025, 0], ...tip(14), ...ears(-22, 4) } },
    { t: 1.4, p: {} },
  ], fn: (t) => { const w = bump(t, 1.22, 0.07), b = 2 * Math.PI * t / 0.08; return { head: [0, 10 * w * Math.sin(b), 0], earL: [0, 0, 18 * w * Math.sin(b)], earR: [0, 0, 18 * w * Math.sin(b + 1)], ...tailSway(t, 1.4, 6) }; } },
};
for (const n of ['c_guardian_bond', 'c_pale_lance']) autoL(CLIPS[n]);
