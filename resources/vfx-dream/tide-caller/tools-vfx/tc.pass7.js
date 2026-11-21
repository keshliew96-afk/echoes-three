// Tide Caller ability review page: one live three.js stage drawn into every visible card.
// Every clip is a pure function of its own time t, so cards loop, pause and slow down freely.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RCLIPS } from './poses.js';
import { addKnees, kneeSolver } from './knees.js';

export const C = { cobalt: '#3F7FE6', deep: '#1F4796', foam: '#E6F3F7', sky: '#9CC2F2', pebble: '#7C8A93', ink: '#0E1A2E',
  heal: '#5FE873', parch: '#F4EFE6', stun: '#F2E3A0', slow: '#7FB8F0', floorA: '#6A665F', floorB: '#625E58', line: '#4E4B46', bg: '#34322E',
  canvas: '#8F887B', wood: '#4A3B2C', rope: '#8C8472', bubble: '#DDF0FA', ally: '#6F93B8', foe: '#B8141F', gold: '#E8C766', soak: '#5B8FD8',
  // page aliases so shared helpers keep working
  rose: '#9CC2F2', moon: '#E6F3F7', blood: '#3F7FE6', core: '#1F4796', plum: '#1F4796', rim: '#E6F3F7', shield: '#DDF0FA' };
const S = 1.1;              // model units to world units: she stands about 1.1 u to the ear tips
const PIV = 0.42 * S;       // her middle: flips, rolls and spins turn about it
const G = 22;               // gravity for launched dummies, u/s²
const D2R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const EASE = { s: sm, lin: (x) => clamp(x), in: (x) => { x = clamp(x); return x * x * x; }, out: (x) => { x = 1 - clamp(x); return 1 - x * x * x; },
  in2: (x) => { x = clamp(x); return x * x; }, out2: (x) => { x = 1 - clamp(x); return 1 - x * x; }, io2: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  back: (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); } };
export const lerp = (a, b, u) => a + (b - a) * u;
export const rng = (seed) => () => { seed = (seed * 16807 + 11) % 2147483647; return (seed - 1) / 2147483646; };

// ---------------------------------------------------------------- stage
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
const cam = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 200);
let floorMat;
{
  // the floor: 1 u square tiles in two close greys with a thin dark joint, drawn in the shader so it never shimmers
  floorMat = new THREE.ShaderMaterial({ uniforms: { a: { value: new THREE.Color(C.floorA) }, b: { value: new THREE.Color(C.floorB) }, l: { value: new THREE.Color(C.line) } },
    vertexShader: `varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 a; uniform vec3 b; uniform vec3 l; varying vec2 vP; void main(){ vec2 c=floor(vP); float k=mod(c.x+c.y,2.0); vec3 col=mix(a,b,k);
      vec2 f=abs(fract(vP)-0.5); vec2 ln=smoothstep(vec2(0.47),vec2(0.49),f); float j=max(ln.x,ln.y); col=mix(col,l,j*0.9);
      float r=length(vP)/26.0; col*=1.0-0.25*smoothstep(0.4,1.0,r); gl_FragColor=vec4(col,1.0);
      #include <colorspace_fragment>
    }` });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 48, 48), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#55524C', 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF6E8', 1.9); sun.position.set(-5, 12, 9); scene.add(sun);
  const rim = new THREE.DirectionalLight('#DDE8F0', 0.7); rim.position.set(6, 6, -8); scene.add(rim);
}
// soft blob shadows (they also read height in a jump)
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function blob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = -2; return m; }
export const softTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 1, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

// ---------------------------------------------------------------- her: one rig drawn as herself, more as water copies (after-images, the decoy)
const BONES = ['hips', 'spine', 'chest', 'head', 'legL', 'footL', 'legR', 'footR', 'tail1', 'tail2', 'tail3', 'tail4', 'upperarmR', 'forearmR', 'handR', 'fingersR', 'upperarmL', 'forearmL', 'handL', 'fingersL'];
const LAGB = ['tail2', 'tail3', 'tail4', 'fingersL'];
const STAFF_OFF = { p: [-0.107, -0.376, -0.028], q: [0.069, 0.012, -0.121, 0.99] }; // the staff in her right paw at the blue wrap, as on every passed clip
const him = { ready: false, clips: {}, rest: {}, restQ: {} };
class Rig {
  constructor(model, ghost) {
    this.model = model; model.scale.setScalar(S);
    this.root = new THREE.Group(); this.lift = new THREE.Group(); this.piv = new THREE.Group();
    this.root.add(this.lift); this.lift.add(this.piv); this.piv.add(model); this.piv.position.y = -PIV; this.lift.position.y = PIV;
    scene.add(this.root); this.sh = blob(0.4); scene.add(this.sh);
    this.b = {}; for (const n of BONES) this.b[n] = model.getObjectByName(n);
    this.knees = kneeSolver(model);
    // the staff rides her right paw (the baked staff tracks are the same grip on every clip)
    const wpn = model.getObjectByName('weapon'); this.staff = wpn;
    if (wpn && wpn.parent !== this.b.handR) { this.b.handR.add(wpn); wpn.position.set(...STAFF_OFF.p); wpn.quaternion.set(...STAFF_OFF.q).normalize(); wpn.scale.setScalar(0.9); }
    this.mats = [];
    model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); o.material.roughness = 0.85; o.material.metalness = 0; this.mats.push(o.material); } } });
    this.base = this.mats.map((m) => m.color.clone());
    if (ghost) { this.mats.forEach((m) => { m.transparent = true; m.depthWrite = false; m.emissive = new THREE.Color(C.cobalt); }); }
    this.root.visible = !ghost;
  }
  look(op, tint, emis) { // op 1: solid, her own colours; less: see-through; tint: multiply colour; emis: glow
    this.mats.forEach((m, i) => { const solid = op >= 0.999; m.transparent = !solid; m.opacity = op; m.depthWrite = solid; m.color.copy(this.base[i]); if (tint) m.color.multiply(tint);
      if (emis) { m.emissive.copy(emis.c); m.emissiveIntensity = emis.k; } else m.emissiveIntensity = 0; });
  }
}
const ghosts = [];
const tmpE = new THREE.Euler(), qI = new THREE.Quaternion(), qD = new THREE.Quaternion();
// a pose: bone -> { q, p } (absolute local rotation and position)
const newPose = () => { const o = {}; for (const n of BONES) o[n] = { q: him.restQ[n].clone(), p: him.rest[n].clone() }; return o; };
const POOL = []; let poolI = 0; const takePose = () => { if (poolI >= POOL.length) POOL.push(newPose()); const p = POOL[poolI++]; for (const n of BONES) { p[n].q.copy(him.restQ[n]); p[n].p.copy(him.rest[n]); } p._staff = null; return p; };
function bakedInto(P, c, t) { for (const k of c.baked) { const v = k.it.evaluate(clamp(t, 0, c.T)); const o = P[k.node]; if (k.prop === 'quaternion') o.q.set(v[0], v[1], v[2], v[3]); else if (k.prop === 'position') o.p.set(v[0], v[1], v[2]); } return P; }
// a key's full pose: a baked frame (or rest), then its additive Euler degree deltas (post-multiplied, her bones' own axes), then hips and paw slides
function resolveKey(k, LEG) {
  const P = newPose();
  const src = Array.isArray(k.b) ? k.b : null;
  if (src) bakedInto(P, him.clips[src[0]], src[1]);
  if (k.l) { const L = newPose(); bakedInto(L, him.clips[k.l[0]], k.l[1]); for (const n of LEG) { P[n].q.copy(L[n].q); P[n].p.copy(L[n].p); } }
  for (const n in (k.a || {})) { if (!P[n]) continue; const d = k.a[n]; P[n].q.multiply(qD.setFromEuler(tmpE.set(d[0] * D2R, d[1] * D2R, d[2] * D2R, 'XYZ'))); }
  if (k.h) P.hips.p.add(new THREE.Vector3(k.h[0], k.h[1], k.h[2]));
  for (const n of ['legL', 'legR', 'handR', 'handL']) if (k['p' + n]) P[n].p.add(new THREE.Vector3(...k['p' + n]));
  return P;
}
export async function loadHim(src) {
  const gl = typeof src === 'string' ? await new GLTFLoader().loadAsync(src) : await new GLTFLoader().parseAsync(src, './');
  addKnees(gl.scene);
  for (const n of BONES) { const b = gl.scene.getObjectByName(n); him.rest[n] = b.position.clone(); him.restQ[n] = b.quaternion.clone(); }
  const main = new Rig(gl.scene, false); him.main = main;
  for (let k = 0; k < 6; k++) ghosts.push(new Rig(SkeletonUtils.clone(gl.scene), true));
  for (const c of gl.animations) {
    const tr = c.tracks.map((tk) => { const [node, prop] = tk.name.split('.'); return { node, prop, it: tk.createInterpolant() }; }).filter((x) => BONES.includes(x.node));
    him.clips[c.name] = { T: c.duration, baked: tr };
  }
  const LEG = ['legL', 'legR', 'footL', 'footR'];
  for (const [n, c] of Object.entries(RCLIPS)) { c.K = c.keys.map((k) => ({ t: k.t, e: k.e, P: resolveKey(k, LEG), staff: k.staff })); him.clips[n] = c; }
  him.ready = true; return him;
}
const PASSED = /^(idle|walk|run|dash|stream|tsunami)/;   // knees bend only in skill moves
function sample(name, t) {
  const c = him.clips[name] || him.clips.idle, P = takePose();
  P._kw = PASSED.test(him.clips[name] ? name : 'idle') ? 0 : 1;
  if (c.baked) return bakedInto(P, c, t);
  const tt = c.loop ? ((t % c.T) + c.T) % c.T : clamp(t, 0, c.T);
  const K = c.K; let a = K[0], b = K[K.length - 1], u = 0;
  if (tt <= K[0].t) { a = b = K[0]; } else if (tt >= K[K.length - 1].t) { a = b = K[K.length - 1]; } else for (let i = 0; i < K.length - 1; i++) if (tt >= K[i].t && tt <= K[i + 1].t) { a = K[i]; b = K[i + 1]; u = (tt - a.t) / (b.t - a.t || 1); break; }
  const e = EASE[b.e === 'in' ? 'in2' : b.e === 'out' ? 'out2' : b.e === 'lin' ? 'lin' : b.e === 'back' ? 'back' : 's'](u);
  for (const n of BONES) { P[n].q.slerpQuaternions(a.P[n].q, b.P[n].q, e); P[n].p.lerpVectors(a.P[n].p, b.P[n].p, e); }
  if (c.fn) { const f = c.fn(tt, c.T); for (const n in f) { const d = f[n]; if (n === '_hips') { P.hips.p.x += d[0]; P.hips.p.y += d[1]; P.hips.p.z += d[2]; continue; } if (!P[n]) continue; P[n].q.multiply(qD.setFromEuler(tmpE.set(d[0] * D2R, d[1] * D2R, d[2] * D2R, 'XYZ'))); } }
  // the tail lags a little behind the body (it is long and loose)
  if (c.K.length > 1) { const t2 = c.loop ? (((tt - 0.06) % c.T) + c.T) % c.T : Math.max(0, tt - 0.06); let a2 = K[0], b2 = K[K.length - 1], u2 = 0;
    if (t2 <= K[0].t) { a2 = b2 = K[0]; } else if (t2 >= K[K.length - 1].t) { a2 = b2 = K[K.length - 1]; } else for (let i = 0; i < K.length - 1; i++) if (t2 >= K[i].t && t2 <= K[i + 1].t) { a2 = K[i]; b2 = K[i + 1]; u2 = (t2 - a2.t) / (b2.t - a2.t || 1); break; }
    const e2 = sm(u2); for (const n of LAGB) { const q = new THREE.Quaternion().slerpQuaternions(a2.P[n].q, b2.P[n].q, e2); P[n].q.slerp(q, 0.6); } }
  return P;
}
function blendInto(A, B, w) { for (const n of BONES) { A[n].q.slerp(B[n].q, w); A[n].p.lerp(B[n].p, w); } A._kw = lerp(A._kw || 0, B._kw || 0, w); return A; }
function applyPose(rig, P) { for (const n of BONES) { const b = rig.b[n]; if (!b) continue; b.quaternion.copy(P[n].q); b.position.copy(P[n].p); } }
// her body at time t of a card's sequence: [t, clip, {speed, from, to, loop, until, hold, then, fade}], idle in the gaps, short crossfades
const clipT = (n) => (him.clips[n] || him.clips.idle).T;
function seqPose(seq, t) {
  poolI = 0; let cur = null, prev = null;
  for (let i = 0; i < seq.length; i++) if (seq[i][0] <= t) { prev = cur; cur = seq[i]; }
  const segT = (s, tt) => { const o = s[2] || {}; const sp = o.speed || 1, from = o.from || 0, to = o.to != null ? o.to : clipT(s[1]);
    if (o.loop) { const L = to - from, tu = Math.min(tt, o.until), loc = from + (((tu - s[0]) * sp) % L); return { loc, end: tt >= o.until, to: loc, endT: o.until }; }
    const loc = from + (tt - s[0]) * sp; return { loc, end: loc > to, to, endT: s[0] + (to - from) / sp }; };
  if (!cur) return sample('idle', t % clipT('idle'));
  const c = segT(cur, t), o = cur[2] || {};
  if (c.end && !o.hold) { const endT = c.endT, k = sm((t - endT) / (o.out != null ? o.out : 0.18)), after = o.then || 'idle';
    const A = sample(cur[1], c.to), B = sample(after, (t - endT) % clipT(after)); return k <= 0 ? A : blendInto(A, B, k); }
  const k = prev ? sm((t - cur[0]) / (o.fade != null ? o.fade : 0.1)) : 1;
  const B = sample(cur[1], Math.min(c.loc, c.to)); if (k >= 1 || !prev) return B;
  const p = segT(prev, t), A = sample(prev[1], Math.min(p.loc, p.to)); return blendInto(A, B, k);
}
// her root: start spot and facing, then keyed travel (fw forward, sd to her right), lift, spin, flip (pitch) and roll; a key with cut: true jumps there at once
function rootAt(card, t) {
  const R = card.rootK, h = card.her;
  let k = { fw: 0, sd: 0, y: 0, spin: 0, pitch: 0, roll: 0 };
  if (R.length) {
    if (t <= R[0].t) k = R[0]; else if (t >= R[R.length - 1].t) k = R[R.length - 1];
    else for (let i = 0; i < R.length - 1; i++) if (t >= R[i].t && t <= R[i + 1].t) {
      const a = R[i], b = R[i + 1]; if (b.cut) { k = t < b.t ? a : b; break; }
      const u = (t - a.t) / (b.t - a.t || 1), e = EASE[b.e || 's'](u), o = {};
      for (const c of ['fw', 'sd', 'spin', 'pitch', 'roll']) o[c] = lerp(a[c], b[c], e);
      o.y = b.jump ? lerp(a.y, b.y, u) + b.jump * 4 * u * (1 - u) : lerp(a.y, b.y, EASE[b.ye || b.e || 's'](u));
      k = o; break;
    }
  }
  const yaw = (h.face) * D2R, fx = Math.sin(yaw), fz = Math.cos(yaw);
  return { x: h.x + fx * k.fw - fz * k.sd, z: h.z + fz * k.fw + fx * k.sd, y: k.y, yaw: yaw + k.spin * D2R, pitch: k.pitch * D2R, roll: k.roll * D2R };
}
function placeRig(rig, r, P) {
  rig.root.position.set(r.x, 0, r.z); rig.root.rotation.set(0, r.yaw, 0);
  rig.lift.position.y = PIV + r.y; rig.lift.rotation.set(r.pitch, 0, r.roll, 'YXZ');
  rig.sh.position.set(r.x, 0.004, r.z); const sc = 1 / (1 + Math.max(0, r.y) * 0.8); rig.sh.scale.setScalar(sc); rig.sh.material.opacity = sc;
  applyPose(rig, P); rig.root.updateMatrixWorld(true);
  rig.knees.solve(globalThis.__noKnee ? 0 : (P._kw || 0)); rig.root.updateMatrixWorld(true);
}
function addBody(P, f) { for (const n in f) { const d = f[n]; if (!d) continue; if (n === '_hips') { P.hips.p.x += d[0]; P.hips.p.y += d[1]; P.hips.p.z += d[2]; continue; } if (!P[n]) continue; P[n].q.multiply(qD.setFromEuler(tmpE.set(d[0] * D2R, d[1] * D2R, d[2] * D2R, 'XYZ'))); } }
function placeHim(card, t) { const r = rootAt(card, t), P = seqPose(card.seq, t); if (card.def.body) addBody(P, card.def.body(t)); if (card.def.noKnee) P._kw = 0; placeRig(him.main, r, P); him.main.staff.visible = !card.staffOff(t); return r; }

// ---------------------------------------------------------------- training dummies
const DG = { post: new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8), body: new THREE.CylinderGeometry(0.24, 0.27, 0.56, 12), head: new THREE.SphereGeometry(0.17, 14, 10), arm: new THREE.CylinderGeometry(0.05, 0.05, 0.86, 8), band: new THREE.CylinderGeometry(0.255, 0.255, 0.05, 12), base: new THREE.CylinderGeometry(0.26, 0.3, 0.06, 12),
  nose: new THREE.ConeGeometry(0.05, 0.12, 8), crown: new THREE.CylinderGeometry(0.2, 0.17, 0.1, 6) };
const woodM = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 }), ropeM = new THREE.MeshStandardMaterial({ color: C.rope, roughness: 1 });
function makeDummy(o) {
  const g = new THREE.Group(), tilt = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: o.ally ? C.ally : C.canvas, roughness: 0.95, emissive: '#FFFFFF', emissiveIntensity: 0 });
  const base = new THREE.Mesh(DG.base, woodM); base.position.y = 0.03; tilt.add(base);
  const post = new THREE.Mesh(DG.post, woodM); post.position.y = 0.25; tilt.add(post);
  const body = new THREE.Mesh(DG.body, cm); body.position.y = 0.72; tilt.add(body);
  for (const y of [0.55, 0.88]) { const b = new THREE.Mesh(DG.band, ropeM); b.position.y = y; tilt.add(b); }
  const arm = new THREE.Mesh(DG.arm, woodM); arm.rotation.z = Math.PI / 2; arm.position.y = 0.84; tilt.add(arm);
  const head = new THREE.Mesh(DG.head, cm); head.position.y = 1.15; tilt.add(head);
  const nose = new THREE.Mesh(DG.nose, woodM); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.15, 0.19); tilt.add(nose); // a nose, so its facing reads
  if (o.boss || o.champ || o.elite) { const cr = new THREE.Mesh(DG.crown, new THREE.MeshStandardMaterial({ color: o.boss ? '#B89A4A' : o.champ ? '#8E9AA6' : '#7E6A52', roughness: 0.6 })); cr.position.y = 1.33; tilt.add(cr); }
  const face = new THREE.Group(); face.add(tilt); g.add(face); const s = o.boss ? 1.55 : o.champ ? 1.3 : o.big || o.elite ? 1.15 : 0.82; tilt.scale.setScalar(s);
  const sh = blob(0.36 * s / 0.78);
  // soaked look: a puddle at its foot and drips running off it (shown while soaked)
  const pud = new THREE.Mesh(ringGeo, fxMat(C.cobalt, F_POOL2)); pud.visible = false; pud.renderOrder = -1;
  const drips = []; for (let k = 0; k < 9; k++) { const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 2 ? C.sky : C.foam, transparent: true, depthWrite: false, opacity: 0 })); d.visible = false; drips.push(d); }
  return { g, face, tilt, cm, sh, s, pud, drips, h: 1.3 * s, base: new THREE.Color(o.ally ? C.ally : C.canvas) };
}

// ---------------------------------------------------------------- effect materials
function fxMat(color, frag, extra = {}) {
  return new THREE.ShaderMaterial({ uniforms: Object.assign({ col: { value: new THREE.Color(color) }, col2: { value: new THREE.Color(extra.col2 || C.foam) }, op: { value: 1 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 }, ln: { value: 1 } }, extra.uniforms || {}),
    vertexShader: extra.vs || `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: frag,
    transparent: true, depthWrite: false, depthTest: extra.noDepth ? false : true, side: THREE.DoubleSide, blending: extra.add ? THREE.AdditiveBlending : extra.normal === false ? THREE.AdditiveBlending : THREE.NormalBlending });
}
const F_STREAK = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ float x=abs(vUv.x-0.5)*2.0; float a=pow(vUv.y,1.3)*(1.0-x*x)*op; vec3 c=mix(col,vec3(1.0),0.35*(1.0-x)); gl_FragColor=vec4(c, a); }`;
const F_RIB = `uniform vec3 col; uniform float op; uniform float u0; uniform float u1; varying vec2 vUv; void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.08,vUv.x)*(1.0-smoothstep(u1-0.02,u1,vUv.x)); float h=smoothstep(u0,u1,vUv.x); float a=s*(1.0-x*x)*op*(0.35+0.65*h); gl_FragColor=vec4(col,a); }`;
const F_RING = `uniform vec3 col; uniform float op; uniform float u0; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float w=max(0.02,u0); float a=smoothstep(1.0-w,1.0-w*0.5,r)*(1.0-smoothstep(0.97,1.0,r))*op; gl_FragColor=vec4(col,a); }`;
const F_DISC = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=(1.0-smoothstep(0.2,1.0,r))*op; gl_FragColor=vec4(col,a); }`;
const F_DISCN = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=(1.0-smoothstep(0.15,1.0,r))*op; gl_FragColor=vec4(col,a); }`;
const F_FLAT = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ gl_FragColor=vec4(col,op); }`;
// flowing water along a strip (u along, v across): deep edges, a lighter middle, foam streaks running with the flow
const F_FLOW = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; 
  float h(float n){ return fract(sin(n)*43758.5453); }
  void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.04,vUv.x)*(1.0-smoothstep(u1-0.04,u1,vUv.x)); float edge=1.0-smoothstep(0.75,1.0,x);
    float st=0.0; for(int i=0;i<3;i++){ float fi=float(i); float lane=0.18+0.32*fi; float w=0.07; float l=1.0-smoothstep(0.0,w,abs(vUv.y-lane-0.08*sin(vUv.x*9.0+fi))); float m=step(0.55,fract(vUv.x*3.0-tm*(1.4+0.4*fi)+h(fi)*3.0)); st=max(st,l*m); }
    vec3 c=mix(col*0.7,col,1.0-x); c=mix(c,col2,0.75*st*edge); float a=s*edge*op*(0.62+0.3*(1.0-x)); gl_FragColor=vec4(c,a); }`;
// a water surface on the floor (pools, puddles): ripples and a foam rim; u1 > 0 turns it into a whirl
const F_POOL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv;
  void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); if(r>1.0) discard; float an=atan(p.y,p.x);
    float sp=sin(an*3.0 + r*u1*10.0 - tm*u1*4.0); float rip=sin(r*22.0 - tm*3.0)*0.5+0.5;
    float foam=smoothstep(0.86,0.97,r)*(1.0-smoothstep(0.97,1.0,r)); float arms=u1>0.0?smoothstep(0.55,0.95,sp)*(0.3+0.7*r):0.0;
    vec3 c=mix(col*mix(0.55,1.0,r),col*1.15,0.25*rip); c=mix(c,col2,max(foam,arms*0.75)); float a=op*(0.55+0.3*r)*(1.0-smoothstep(0.97,1.0,r)); a=max(a,foam*op); gl_FragColor=vec4(c,a); }`;
// a bubble, a dome or a wall of water: see-through middle, a thick rim, one Sea Foam light
const F_BUB = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; varying vec3 vN; varying vec3 vV; void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float a=op*(0.12+0.88*pow(f,2.2));
  float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),24.0); vec3 c=mix(col,col2,0.35*f+u0); c=mix(c,vec3(1.0),spec*0.8); gl_FragColor=vec4(c,max(a,spec*op)); }`;
const VS_BUB = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
// a column or a ring wall of water: v up the wall, darker low, foam at the top, streaks running up (or down)
const F_COL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec2 vUv; void main(){ float y=vUv.y; float st=step(0.62,fract(vUv.x*7.0+sin(vUv.x*31.0)*0.3))*step(0.5,fract(y*2.0-tm*u0)); vec3 c=mix(col*0.6,col,y); c=mix(c,col2,smoothstep(0.78,1.0,y)*0.9+0.4*st*(1.0-y)); float a=op*(0.55+0.4*y)*(1.0-smoothstep(0.96,1.0,y)*0.0); gl_FragColor=vec4(c,a); }`;

// ---- dream-loop water looks (Tide Caller VFX, 20 Nov): shared noise, caustics, foam
const GN = `float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float a=0.0, w=0.5; for(int i=0;i<4;i++){ a+=w*vn(p); p=p*2.03+vec2(1.7,9.2); w*=0.5; } return a; }
  float caus(vec2 p, float t){ p+=vec2(vn(p*0.7+t*0.2),vn(p*0.7-t*0.2+5.0))*0.6; vec2 g=floor(p), f=fract(p); float d1=8.0, d2=8.0; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(float(x),float(y)); vec2 h=vec2(hh(g+o),hh(g+o+17.3)); h=0.5+0.4*sin(t*0.8+6.283*h); float d=length(o+h-f); if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d; } return 1.0-smoothstep(0.0,0.09,d2-d1); }
  float spk(vec2 p, float t){ vec2 g=floor(p); float r=hh(g); float tw=0.5+0.5*sin(t*6.0+r*40.0); vec2 f=fract(p)-0.5; return step(0.94,r)*tw*(1.0-smoothstep(0.03,0.14,length(f))); }`;
// a stream, jet or rope (u along, v across): twisted strands of clear water, deep edges, foam glints running with the flow
const F_FLOW2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv; ${GN}
  void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.04,vUv.x)*(1.0-smoothstep(u1-0.04,u1,vUv.x));
    float n=fbm(vec2(vUv.x*16.0-tm*2.2, vUv.y*3.0)); float edge=1.0-smoothstep(0.6,1.0,x+0.4*(n-0.5));
    float str=0.0; for(int i=0;i<4;i++){ float fi=float(i); float lane=0.2+0.2*fi+0.04*sin(vUv.x*7.0-tm*1.1+fi*2.0); float dash=smoothstep(0.25,0.6,fbm(vec2(vUv.x*9.0-tm*2.6+fi*3.1,fi))); str=max(str,(1.0-smoothstep(0.0,0.06,abs(vUv.y-lane)))*dash); }
    vec3 c=mix(vec3(0.04,0.14,0.45),col*1.15,pow(1.0-x,0.8)); c=mix(c,vec3(0.8,0.92,1.0),0.85*str);
    float gl=smoothstep(0.68,0.9,n)*(1.0-x*0.8); c=mix(c,col2,clamp(gl*0.9+0.5*str*step(0.62,fract(vUv.x*5.0-tm*1.8+vUv.y)),0.0,1.0));
    float bu=ln*smoothstep(0.86,1.0,vUv.x); c=mix(c,col2,bu*0.75*smoothstep(0.3,0.6,n+0.3*(1.0-x))); float a=s*edge*op*(0.85+0.15*max(str,gl)); gl_FragColor=vec4(c,a); }`;
// a jet (the reference, 20 Nov): a deep blue core wrapped in a white foam sheath; the head bursts into ragged white spikes wider than the body
const F_JET = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.05,vUv.x)*(1.0-smoothstep(u1-0.015,u1,vUv.x));
    float n=fbm(vec2(vUv.x*12.0-tm*2.0, vUv.y*4.0)); float fine=fbm(vec2(vUv.x*38.0-tm*3.0, vUv.y*10.0));
    float hd=smoothstep(u1-0.2,u1-0.05,vUv.x); float spk=smoothstep(0.42,0.6,fbm(vec2(vUv.y*11.0, vUv.x*2.0-tm*0.5)));
    float edge=1.0-smoothstep(0.72,0.98,x+0.3*(n-0.5)); edge=mix(edge, edge*max(spk,1.0-smoothstep(0.2,0.5,x)), hd);
    float core=(1.0-smoothstep(0.18,0.42,x+0.3*(n-0.5)))*(1.0-hd*0.85)*smoothstep(u0,u0+0.12,vUv.x);
    vec3 blue=mix(vec3(0.07,0.25,0.75),col*1.1,smoothstep(0.35,0.7,fbm(vec2(vUv.x*18.0-tm*2.5,vUv.y*5.0)))); blue=mix(blue,vec3(0.55,0.8,1.0),smoothstep(0.6,0.72,fine)*0.45);
    float fo=smoothstep(0.35,0.55,fine+0.3*(1.0-x)); vec3 c=mix(mix(vec3(0.7,0.86,1.0),col2,fo),blue,core); float a=s*edge*op*mix(0.85,1.0,fo); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
const F_HALO = `uniform vec3 col; uniform float op; uniform float u0; uniform float u1; varying vec2 vUv; void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.06,vUv.x)*(1.0-smoothstep(u1-0.06,u1,vUv.x)); gl_FragColor=vec4(col, s*op*pow(1.0-x,2.0)); }`;
// floor water (the wet path, a wake, a current): glossy shallow water, caustic web, wavy foam edges, sparkle
const F_WET = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv; ${GN}
  void main(){ vec2 p=vec2(vUv.x*ln, vUv.y)*3.2; float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.03,vUv.x)*(1.0-smoothstep(u1-0.03,u1,vUv.x));
    float en=fbm(vec2(vUv.x*ln*5.0, vUv.y*2.0)+vec2(tm*0.15,0.0)); float xe=x+(en-0.5)*0.35; float body=1.0-smoothstep(0.82,0.98,xe);
    float cs=caus(p*1.3+vec2(-tm*0.3,0.0), tm); float fr=fbm(p*5.0+tm*0.2); float ends=smoothstep(0.0,0.3/max(ln,0.6),vUv.x+0.15*(en-0.5))*(1.0-smoothstep(0.75,1.0,vUv.x+0.12*(en-0.5)));
    float foam=min(1.0,1.6*smoothstep(0.7,0.86,xe)*body*smoothstep(0.4,0.65,fbm(p*9.0+tm*0.3)))*smoothstep(0.1,0.35,vUv.x)*(1.0-smoothstep(0.9,1.0,vUv.x)); vec3 c=mix(vec3(0.04,0.13,0.42),col*1.0,0.4+0.5*fbm(p*0.8)); float gl2=smoothstep(0.62,0.8,fbm(vec2(vUv.x*ln*1.5,vUv.y*9.0)+vec2(tm*0.2,0.0))); c=mix(c,vec3(0.55,0.78,1.0),cs*0.15+gl2*0.45); c=mix(c,col2,foam); c+=vec3(0.9,0.95,1.0)*(spk(p*4.0,tm)+spk(p*7.0+3.0,tm*1.3))*1.1;
    float a=op*s*body*mix(1.0,ends,0.85)*(0.88+0.05*cs+0.5*foam); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a water surface on the floor (pools, puddles): caustic web, ripples, a foam rim; u1 > 0: a whirl with foam arms to a dark eye
const F_POOL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float an=atan(p.y,p.x); float rn=r+(fbm(vec2(cos(an),sin(an))*2.0+tm*0.2)-0.5)*(u1>0.0? 0.04 : u1<0.0? 0.3 : 0.12); if(rn>1.0) discard; float glow=smoothstep(0.9,0.96,rn)*(1.0-smoothstep(0.96,1.0,rn));
    vec3 c; float a;
    if(u1>0.0){ float sw=an+r*u1*5.5-tm*u1*2.6; vec2 cw=vec2(cos(sw),sin(sw)); float arm=sin(sw*3.0+fbm(p*3.0)*2.0); float n=fbm(cw*1.5+vec2(r*6.0-tm*0.6,0.0));
      float fs=fbm(cw*4.0+vec2(0.0,r*14.0)); float foam=smoothstep(-0.2,0.5,arm)*smoothstep(0.12,0.4,r)*smoothstep(0.25,0.6,fs+0.25*n); float lines=smoothstep(0.62,0.85,fbm(cw*6.0+vec2(r*30.0,0.0)))*0.55*r*(1.0-foam);
      c=mix(vec3(0.01,0.03,0.16),mix(vec3(0.05,0.17,0.52),col*0.7,fbm(cw*2.0+vec2(r*5.0,0.0))),smoothstep(0.1,0.6,r)); c=mix(c,vec3(0.55,0.75,1.0),lines); c=mix(c,vec3(0.2,0.45,0.95),0.35*smoothstep(0.45,0.6,r)*(1.0-smoothstep(0.85,0.95,r))); float fz=smoothstep(0.3,0.7,fbm(cw*9.0+vec2(r*40.0,tm*0.3))); c=mix(c,col2,foam*(0.35+0.6*fz));
      c=mix(c,vec3(0.6,0.8,1.0),glow*0.8); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op*0.8);
      if(u0>1.1){ float rf=smoothstep(0.7,0.86,rn)*(1.0-smoothstep(0.95,1.0,rn))*smoothstep(0.44,0.58,fbm(p*24.0+vec2(tm*0.6,0.0))); c=mix(c,col2,rf); a=max(a,rf*min(1.0,op*2.2)); } }
    else { float cs=caus(p*3.2, tm); float rip=smoothstep(0.75,1.0,sin(r*26.0-tm*4.0))*(1.0-r*0.5)*0.45;
      float rm=u0>1.1? max(smoothstep(0.68,0.74,r)*(1.0-smoothstep(0.86,0.95,r)),smoothstep(0.3,0.34,r)*(1.0-smoothstep(0.42,0.5,r))) : u0<0.0? 0.0 : smoothstep(0.1,0.15,r)*(1.0-smoothstep(0.5,0.65,r+0.25*(fbm(p*5.0+tm)-0.5))); float fr=min(1.0,abs(u0))*rm*(u0>1.1? smoothstep(0.5,0.62,fbm(p*16.0+tm*0.5)) : smoothstep(0.42,0.55,fbm(p*18.0+tm*0.5)));
      c=mix(vec3(0.03,0.12,0.42),col*0.85,0.15+0.6*r*r); c=mix(c,vec3(0.6,0.8,1.0),0.35*rip); c=mix(c,vec3(0.55,0.75,1.0),cs*0.18*r); c=mix(c,vec3(0.4,0.7,1.0),glow); c=mix(c,col2,fr); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.8;
      if(u1<0.0){ float ff=smoothstep(0.48,0.6,fbm(p*14.0+tm*0.3))*smoothstep(0.55,0.75,rn)*(1.0-smoothstep(0.85,0.95,rn))*smoothstep(-0.1,-0.4,p.y); c=mix(vec3(0.05,0.16,0.5),vec3(0.15,0.38,0.85),cs*0.4); c=mix(c,col2,ff); a=op*0.8*(1.0-smoothstep(0.7,1.0,rn)); a=max(a,ff*op); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); return; }
      float r2=smoothstep(0.02,0.0,abs(rn-0.75))*u0*0.6; c=mix(c,vec3(0.55,0.8,1.0),r2); a=op*(0.55+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(max(max(a,glow*op),fr*0.95),r2*op); }
    gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a crown splash: an upright ring with a spiked, broken top, foam at the lip, streaks thrown up
const F_CROWN = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; uniform float ln; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y; float sx=vUv.x*8.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),2.5); float top=mix(0.25,0.4,ln)+mix(0.75,0.6,ln)*pk*(0.6+0.4*hh(vec2(floor(sx),3.0+u0)));
    float n=fbm(vec2(vUv.x*20.0,y*3.0-tm)); if(y>top+0.06*(n-0.5)) discard; float lip=smoothstep(top-0.12,top,y);
    vec3 c=mix(vec3(0.25,0.5,1.0),vec3(0.45,0.7,1.0),y); c=mix(c,col2,clamp(lip*0.9+smoothstep(0.7,0.88,n)*0.5,0.0,1.0)); float a=op*(0.5+0.3*y+0.5*lip); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a ring wall or column of water: deep low, streaks running (u0: speed, sign = up/down), a broken foam top
const F_COL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y; float n=fbm(vec2(vUv.x*u1*1.6, y*2.0-tm*u0*0.5)); float top=0.97+0.03*fbm(vec2(vUv.x*u1*1.2,tm*0.7)); if(y>top) discard;
    float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0+0.6*sin(y*5.0)+(ln<0.5? y*9.0-tm*4.0 : 0.0), y*0.4-tm*u0*0.6)))*(1.0-y*0.3); float lip=smoothstep(top-0.22,top-0.02,y)*(0.55+0.45*n);
    vec3 c=mix(vec3(0.05,0.18,0.55),vec3(0.25,0.55,1.0),smoothstep(0.0,0.75,y)); c=mix(c,vec3(0.82,0.93,1.0),st*0.75); c=mix(c,col2,lip*0.95);
    float br=smoothstep(0.25,0.5,fbm(vec2(vUv.x*u1*3.0, y*3.0-tm*u0*0.8))); float a=op*(0.35+0.3*y+0.45*st+0.3*lip)*(0.6+0.4*br)*smoothstep(0.0,0.06,y); if(ln<0.5){ a*=1.0-smoothstep(top-0.2,top,y); c=mix(c,col2,smoothstep(top-0.45,top-0.1,y)*0.6); } gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a comet tail (a bolt's trail, a stone's skim): fine streak lines that taper to the tail
const F_TAIL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float h=vUv.x; float v=(vUv.y-0.5)*2.0; float spk=smoothstep(0.35,0.75,fbm(vec2(v*7.0,h*3.0-tm*0.8))); float w=(0.05+0.95*pow(h,1.6))*(0.75+0.45*spk*(1.0-h*0.5)); if(abs(v)>w) discard; float vv=v/w;
    float n=fbm(vec2(h*10.0-tm*2.0,vv*3.0)); float core=(1.0-smoothstep(0.25,0.55,abs(vv)+0.3*(n-0.5)))*smoothstep(0.25,0.6,h);
    vec3 blue=mix(vec3(0.07,0.25,0.75),vec3(0.2,0.5,1.0),smoothstep(0.4,0.7,fbm(vec2(h*16.0,vv*4.0)-tm))); vec3 c=mix(col2,blue,core);
    float a=op*pow(h,0.7)*(1.0-smoothstep(0.75,1.0,abs(vv)))*mix(0.8,1.0,core); if(a<0.02) discard; gl_FragColor=vec4(c,a); }`;

// the breaking wave: vertex colours lit, foam streaks down the face, a frothy crest (uv: u across, v from back to foot)
const VS_WAVE = `attribute vec4 color; varying vec4 vC; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vC=color; vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
const F_WAVE = `uniform float op; uniform float tm; varying vec4 vC; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${GN}
  void main(){ float cap=step(1.5,vUv.y); vec2 uv=vec2(vUv.x,vUv.y-2.0*cap); vec3 n=normalize(vN), v=normalize(vV); if(cap>0.5 && dot(n,v)<0.0) discard; if(!gl_FrontFacing) n=-n; float l=0.55+0.45*max(0.0,dot(n,normalize(vec3(-0.3,0.8,0.5)))); float fr=pow(1.0-abs(dot(n,v)),2.0);
    float pv=uv.y*13.0; float crest=smoothstep(4.5,5.5,pv)*(1.0-smoothstep(9.0,9.8,pv)); float face=smoothstep(9.0,10.0,pv);
    float st=smoothstep(mix(0.5,0.72,cap),mix(0.78,0.85,cap),fbm(vec2(uv.x*22.0+sin(uv.y*9.0)*0.6, uv.y*4.0-tm*0.6)))*(0.55+0.45*face);
    float froth=crest*smoothstep(0.2,0.5,fbm(vec2(uv.x*30.0,uv.y*40.0)+tm*0.4))*(1.0-cap*smoothstep(0.88,0.7,uv.x));
    vec3 c=vC.rgb*l; c=mix(c,vec3(0.06,0.2,0.62),0.25*(1.0-crest)); c=mix(c,vec3(0.82,0.93,1.0),st*0.9); c=mix(c,vec3(0.95,0.98,1.0),froth); c+=vec3(0.25,0.4,0.6)*fr*0.5;
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),30.0); c+=vec3(spec*0.6);
    float side=mix(1.0-smoothstep(0.82,1.0,abs(uv.x*2.0-1.0)+0.25*(fbm(vec2(uv.y*8.0,tm))-0.5)),1.0,cap); float back=smoothstep(0.0,0.45,uv.y+0.15*fbm(vec2(uv.x*12.0,tm*0.5)));
    gl_FragColor=vec4(c, op*vC.a*side*mix(0.5,1.0,back)*(0.82+0.18*max(froth,st))); }`;
// a bubble: a thin blue rim, almost clear inside, soft white swirls in the skin, a sharp window light
const F_BUB2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float rim=pow(f,2.5); float ang=atan(vP.z,vP.x);
    float sw=smoothstep(0.46,0.66,fbm(vec2(ang*0.8+vP.y*1.2+tm*0.3, vP.y*5.0-tm*0.2)))*smoothstep(0.2,0.6,f);
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),12.0)*smoothstep(0.35,0.6,fract((vP.x-vP.y)*1.5+0.2))*(1.0-smoothstep(0.6,0.85,fract((vP.x-vP.y)*1.5+0.2))); vec3 c=mix(col,vec3(0.25,0.5,1.0),0.9*rim); c=mix(c,col2,min(1.0,sw*1.1+u0)); c=mix(c,vec3(1.0),spec);
    float a=op*(0.14+1.6*rim+0.9*sw); gl_FragColor=vec4(c,clamp(max(a,spec*op),0.0,1.0)); }`;
const VS_BUB2 = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
// a dome or a wall of water: clear skin with a moving caustic web, a bright band where it meets the floor, foam on top (u1: wall)
const VS_SKIN = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
const F_SKIN = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float y=vP.y;
    vec2 q=u1>0.5? vec2(vP.x*2.5+vP.z*2.5, y*2.5) : vP.xz*2.2+vec2(y*1.5); float cs=u1>0.5? caus(q*1.4+vec2(0.0,-tm*0.25), tm) : 0.0; float sh2=u1>0.5? 0.0 : smoothstep(0.62,0.8,fbm(q*1.3+vec2(tm*0.15,-tm*0.1)))*0.8+smoothstep(0.5,0.9,fbm(q*4.0-tm*0.2))*0.3;
    float cs2=u1>0.5? 0.0 : caus(vP.xz*2.0+vec2(y*2.0,-y*1.5), tm)*smoothstep(0.35,0.85,f); float base=u1>0.5? 0.0 : (1.0-smoothstep(0.0,0.06,y))*1.0; float top=u1>0.5? smoothstep(0.8,0.95,y)*smoothstep(0.25,0.55,fbm(vec2(vP.x*9.0+vP.z*9.0,y*6.0)+tm*0.5)) : 0.0;
    float hz=vP.x+vP.z; float run=u1>0.5? (smoothstep(0.035,0.0,abs(y-0.62-0.12*sin(hz*5.0+tm*1.5)-0.05*fbm(vec2(hz*8.0,tm))))+smoothstep(0.03,0.0,abs(y-0.32-0.1*sin(hz*4.0-tm*1.2+2.0)-0.05*fbm(vec2(hz*9.0,tm+3.0)))))*smoothstep(0.35,0.6,fbm(vec2(hz*10.0,y*4.0+tm))) : 0.0; float wb=u1>0.5? (1.0-smoothstep(0.0,0.1,y)) : 0.0; float wall=u1>0.5? (1.0-step(0.5,abs(n.y))) : 1.0;
    float ed=min(min(vUv.x,1.0-vUv.x)*4.0,min(vUv.y,1.0-vUv.y)*1.2); float tf=u1>0.5? step(0.5,n.y)*clamp(smoothstep(0.62,0.8,fbm(vec2(vP.x*5.0,vP.z*5.0)+tm*0.6))+smoothstep(0.35,0.0,ed)*smoothstep(0.3,0.6,fbm(vUv*20.0+tm)),0.0,1.0) : 0.0; float tcs=u1>0.5? step(0.5,n.y)*caus(vUv*vec2(2.0,8.0)+tm*0.1,tm) : 0.0; vec3 c=u1>0.5? mix(vec3(0.03,0.14,0.5),vec3(0.2,0.5,0.95),clamp(y,0.0,1.0)) : mix(vec3(0.08,0.25,0.7),col*1.25,clamp(y,0.0,1.0)); c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2*0.6)); if(u1<0.5){ c=mix(c,vec3(0.2,0.5,1.0),pow(f,2.0)); c=mix(c,vec3(0.5,0.75,1.0),cs2); } c=mix(c,vec3(0.6,0.85,1.0),wb*0.8); if(u1>0.5 && n.y>0.5){ c=mix(vec3(0.06,0.25,0.75),vec3(0.25,0.55,1.0),vUv.y); c=mix(c,vec3(0.7,0.88,1.0),tcs*0.6); } c=mix(c,vec3(0.7,0.88,1.0),base); c=mix(c,col2,clamp(max(max(top,run*0.9), u1>0.5? step(0.5,n.y)*tf : 0.0),0.0,1.0));
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),30.0);
    float a=op*(u1>0.5? (0.62+0.3*f+0.2*cs+0.5*run+0.6*top+0.5*wb)*wall + step(0.5,n.y)*(0.75+0.2*tf+0.2*tcs) : (0.04+0.8*pow(f,2.6)+1.0*cs2+0.25*sh2+base)); gl_FragColor=vec4(c+spec*0.5, clamp(a,0.0,1.0)); }`;

const streakGeo = (() => { const g = new THREE.BufferGeometry(); const P = [], U = [], I = [];
  const quad = (ax) => { const b = P.length / 3; for (const [s, v] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { P.push(ax === 0 ? s * 0.5 : 0, ax === 1 ? s * 0.5 : 0, v); U.push(s < 0 ? 0 : 1, v); } I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); };
  quad(0); quad(1); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; })();
const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
const quadGeo = new THREE.PlaneGeometry(2, 2);

// ---------------------------------------------------------------- the card runtime
export const V3 = (a) => a && a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]);
const tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), ZF = new THREE.Vector3(0, 0, 1);
// her tracks, read at 60 Hz: the staff's shell tip and butt, her paws, feet, head, the tail tip
const TRK = { footL: null, footR: null, handR: null, handL: [0.02, -0.03, 0.02], chest: null, head: null, hips: null, tail4: null,
  tip: ['weapon', [0, 0.87, 0]], butt: ['weapon', [0, 0.03, 0]], mid: ['weapon', [0, 0.5, 0]], mouth: ['head', [0, 0.05, 0.15]] };
const SOAKTINT = new THREE.Color('#2F62CC');

export class Card {
  constructor(def, canvas) { this.def = def; this.cv = canvas; this.ctx = canvas.getContext('2d'); this.t = 0; this.built = false; this.visible = false; }
  setDef(def) { if (this.grp) scene.remove(this.grp); this.def = def; this.built = false; this.t = 0; }
  staffOff(t) { for (const w of this.def.noStaff || []) if (t >= w[0] && t < w[1]) return true; return false; }
  build() {
    const d = this.def; this.T = d.T; this.her = d.her || { x: 0, z: 0, face: 90 }; this.seq = d.seq || [];
    // root keys: absolute spots (x, z, look) turn into her own frame; every channel filled forward
    const h = this.her, yaw = h.face * D2R, fx = Math.sin(yaw), fz = Math.cos(yaw);
    const R = (d.root || []).map((k) => ({ ...k })).sort((a, b) => a.t - b.t); let last = { fw: 0, sd: 0, y: 0, spin: 0, pitch: 0, roll: 0 };
    if (R.length && R[0].t > 0) R.unshift({ t: 0, ...last });
    for (const k of R) {
      if (k.x != null) { const dx = k.x - h.x, dz = k.z - h.z; k.fw = fx * dx + fz * dz; k.sd = -fz * dx + fx * dz; }
      if (k.look) { const px = k.x != null ? k.x : h.x + fx * (k.fw != null ? k.fw : last.fw) - fz * (k.sd != null ? k.sd : last.sd), pz = k.z != null ? k.z : h.z + fz * (k.fw != null ? k.fw : last.fw) + fx * (k.sd != null ? k.sd : last.sd);
        let s = Math.atan2(k.look[0] - px, k.look[1] - pz) / D2R - h.face; while (s - last.spin > 180) s -= 360; while (s - last.spin < -180) s += 360; k.spin = s + (k.addSpin || 0); }
      for (const c of ['fw', 'sd', 'y', 'spin', 'pitch', 'roll']) if (k[c] == null) k[c] = last[c]; last = k; }
    this.rootK = R;
    this.grp = new THREE.Group(); this.grp.visible = false; scene.add(this.grp);
    const n = Math.ceil(this.T * 60) + 2; this.trk = {}; for (const k in TRK) this.trk[k] = new Float32Array(n * 3); this.trk.root = new Float32Array(n * 4);
    for (let f = 0; f < n; f++) { const t = f / 60; const r = placeHim(this, Math.min(t, this.T)); const B = him.main.b;
      for (const k in TRK) { const s = TRK[k]; if (!s) B[k].getWorldPosition(tmpV); else if (typeof s[0] === 'number') tmpV.set(s[0], s[1], s[2]).applyMatrix4(B[k].matrixWorld); else tmpV.set(...s[1]).applyMatrix4((s[0] === 'weapon' ? him.main.staff : B[s[0]]).matrixWorld); tmpV.toArray(this.trk[k], f * 3); }
      this.trk.root[f * 4] = r.x; this.trk.root[f * 4 + 1] = r.z; this.trk.root[f * 4 + 2] = r.yaw; this.trk.root[f * 4 + 3] = r.y; }
    this.n = n;
    this.dum = (d.dum || []).map((p, i) => { const o = p[2] || {}; const m = makeDummy(o); this.grp.add(m.g); this.grp.add(m.sh); this.grp.add(m.pud); m.drips.forEach((d) => this.grp.add(d)); return { i, x: p[0], z: p[1], opt: o, m, hits: [], moves: [], launches: [], turns: [], holds: [], soaks: [], crashes: [] }; });
    this.fx = []; this.post = []; this.nums = []; this.caps = []; this.shakes = []; this.darks = []; this.ghostK = []; this.hud = []; this.tags = [];
    const api = this.api(); this.A = api;
    for (const dm of this.dum) if (dm.opt.soaked) api.soak(dm.i, 0, typeof dm.opt.soaked === 'number' ? dm.opt.soaked : 99, { quiet: true });
    for (const e of (d.ev || [])) (Array.isArray(e) ? e : [e]).forEach((x) => FX[x.k](api, x));
    if (d.fx) d.fx(api);
    for (const dm of this.dum) { dm.moves.sort((a, b) => a.t - b.t); dm.launches.sort((a, b) => a.t - b.t); }
    // hit-stop: a heavy hit (a Crash, a Slam, the biggest number) holds the whole scene a beat, then it catches up, so the card keeps its length
    let mx = 0, nmx = 0; for (const dm of this.dum) for (const h of dm.hits) if (typeof h.n === 'number') { if (h.n > mx) { mx = h.n; nmx = 1; } else if (h.n === mx) nmx++; } if (nmx > 2) mx = 1e9;
    const hs = []; if (!d.noStop) for (const dm of this.dum) for (const h of dm.hits) if (!h.noStop && (h.big || h.crash || (mx >= 14 && h.n === mx))) hs.push({ t: h.t, i: dm.i, hold: h.big || h.crash ? 0.08 : 0.06, big: h.big || h.crash, dir: h.dir });
    hs.sort((a, b) => a.t - b.t); this.stops = []; for (const s of hs) { const L = this.stops[this.stops.length - 1]; if (L && s.t - L.t < 0.24) { L.also = (L.also || []).concat([s]); continue; } if (s.t < 0.05 || s.t > this.T - 0.3) continue; this.stops.push(s); }
    // page-wide motion detail: water copies behind fast moves, splashes where she lands, wet skids behind a pushed foe, a splash and a stain on heavy hits
    if (!d.noAuto) {
      const fastAt = (t) => { const f = Math.floor(t * 60); if (f < 1 || f + 1 >= this.n) return false; const R = this.trk.root; const sp = Math.hypot(R[f * 4] - R[f * 4 - 4], R[f * 4 + 1] - R[f * 4 - 3]) * 60; return sp > 4.5 && sp < 30; };
      this.ghostK.push((t) => { const out = []; if (!this.vis(t).hide && fastAt(t)) for (const [lag, op] of [[0.04, 0.22], [0.08, 0.12]]) { const tt = t - lag; if (tt > 0 && !this.vis(tt).hide) out.push({ lag, op, glow: 0.25 }); } return out; });
      const RT = this.trk.root; for (let f = 2; f < this.n; f++) { const y0 = RT[f * 4 - 4 + 3], y1 = RT[f * 4 + 3]; if (y0 > 0.08 && y1 <= 0.012 && !this.vis(f / 60).hide) FX.splash(api, { t: f / 60, at: [RT[f * 4], 0.02, RT[f * 4 + 1]], r: 0.5, n: 7, h: 0.5 }); }
      for (const dm of this.dum) { for (const m of dm.moves) { const by = m.by0 || m.by; if (!by || m.dur > 0.9) continue; const L = Math.hypot(by[0], by[1]); if (L < 0.35) continue; FX.drops(api, { t: m.t + 0.03, at: { d: dm.i, y: 0.1 }, n: 5, sp: 0.6, up: 0.4, size: 0.035, seed: Math.floor(m.t * 97) }); }
        dm.launches.forEach((L, k) => { const nx = dm.launches[k + 1]; const y0 = k ? this.dumY(dm, L.t, k) : 0; let tl; if (L.h < 0) tl = L.t + y0 / 9; else { if (L.h < 0.2) return; const v = Math.sqrt(2 * G * L.h); tl = L.t + (v + Math.sqrt(v * v + 2 * G * y0)) / G; } if (nx && nx.t < tl) return; if (tl > this.T - 0.1) return; if (dm.holds.some((w) => tl > w.t0 - 0.05 && tl < w.t1 + 0.05)) return;
          FX.dust(api, { t: tl, at: { d: dm.i, y: 0.03 }, n: 7, sp: 1.0, dur: 0.45, seed: Math.floor(tl * 131) }); FX.ring(api, { t: tl, at: { d: dm.i, y: 0.03 }, r0: 0.2, r1: 0.8, dur: 0.3, col: C.parch, op: 0.35, w: 0.1 }); }); }
      // after her last hit, water drips off the shell tip while she settles
      { let tl = -1; for (const dm of this.dum) for (const h of dm.hits) if (typeof h.n === 'number' && h.t > tl) tl = h.t;
        if (tl > 0 && tl < this.T - 0.6) for (const dl of [0.18, 0.4, 0.66]) FX.drops(api, { t: tl + dl, at: (t) => api.at('tip', t), n: 2, sp: 0.06, up: -0.2, size: 0.028, dur: 0.5, spread: 0.08, seed: Math.floor((tl + dl) * 337) }); }
      for (const s of this.stops) for (const hh of [s].concat(s.also || [])) { const dm = this.dum[hh.i]; if (!dm) continue;
        FX.drops(api, { t: hh.t, at: { d: hh.i, y: 0.7 * dm.m.s / 0.82 }, n: hh.big ? 12 : 7, sp: 1.4, up: 1.0, size: 0.045, dur: 0.6 });
        const p = this.dumPos(dm, hh.t), r = rootAt(this, hh.t); let dx = hh.dir ? hh.dir[0] : p.x - r.x, dz = hh.dir ? hh.dir[1] : p.z - r.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        FX.disc(api, { t: hh.t + 0.1, at: [p.x + dx * 0.35, 0, p.z + dz * 0.35], y: 0.011, r0: 0.08, r1: hh.big ? 0.5 : 0.36, hold: true, dur: 1.6, col: C.deep, op: 0.4 }); }
    }
    this.built = true;
  }
  api() {
    const self = this;
    return {
      card: self, grp: self.grp, T: self.T, her: self.her,
      at(name, t) { const f = clamp(t, 0, self.T) * 60, i = Math.floor(f), u = f - i, A = self.trk[name], j = Math.min(self.n - 1, i + 1); return new THREE.Vector3(lerp(A[i * 3], A[j * 3], u), lerp(A[i * 3 + 1], A[j * 3 + 1], u), lerp(A[i * 3 + 2], A[j * 3 + 2], u)); },
      rootAt(t) { const f = Math.round(clamp(t, 0, self.T) * 60), R = self.trk.root; return { x: R[f * 4], z: R[f * 4 + 1], yaw: R[f * 4 + 2], y: R[f * 4 + 3] }; },
      body(t, y = 0.45) { const r = this.rootAt(t); return new THREE.Vector3(r.x, r.y + y, r.z); },
      fwd(t, deg = 0) { const r = this.rootAt(t); const y = r.yaw + deg * D2R; return new THREE.Vector3(Math.sin(y), 0, Math.cos(y)); },
      ahead(t, dist, y = 0.5, deg = 0) { const r = this.rootAt(t), f = this.fwd(t, deg); return new THREE.Vector3(r.x + f.x * dist, r.y + y, r.z + f.z * dist); },
      dpos(i, t) { return self.dumPos(self.dum[i], t); },
      dpt(i, t, y = 0.6) { const dm = self.dum[i], p = self.dumPos(dm, t); return new THREE.Vector3(p.x, p.y + y * dm.m.s / 0.82, p.z); },
      // a hit. o: crash (a Crash: 60% more, spends the soak), wet (more on a soaked foe), slam, knock, up, stun, slow, blind, big, col
      hit(i, t, n, o = {}) { const dm = self.dum[i]; if (!dm) return; dm.hits.push({ t, n, dir: o.dir || null, big: !!o.big, crash: !!o.crash, fell: !!o.fell, noStop: !!o.noStop });
        if (n != null) self.nums.push({ t, i, n, big: o.big || o.crash || o.slam, col: o.col || (o.crash ? C.foam : o.wet ? C.sky : null), tag: o.crash ? '拍' : o.slam ? 'slam' : o.wet ? '湿' : null });
        if (o.crash) this.crash(i, t, o.keep); if (o.soak) this.soak(i, t + 0.02, o.soak === true ? 4 : o.soak);
        if (o.knock) this.move(i, t, o.knock, o.kdur || 0.28, o.ke || 'out');
        if (o.up) this.launch(i, t, o.up); if (o.stun) this.status(i, t, 'stun', o.stun); if (o.slow) this.status(i, t, 'slow', o.slow);
        if (o.blind) this.status(i, t, 'blind', o.blind); if (o.root) this.status(i, t, 'root', o.root);
        if (o.fell) FX.fell(this, { d: i, t: t + 0.05 }); },
      // Soaked 浸湿: the foe darkens and drips, a drop shows over it; drench: a Crash does not spend it once
      soak(i, t, dur = 4, o = {}) { const dm = self.dum[i]; if (!dm) return; dm.soaks.push({ t0: t, t1: t + dur, drench: !!o.drench }); if (!o.quiet) { FX.drops(this, { t, at: { d: i, y: 1.0 }, n: 6, sp: 0.5, up: 0.5, size: 0.04 }); FX.ring(this, { t, at: { d: i, y: 0.03 }, r0: 0.2, r1: 0.6, dur: 0.35, col: C.cobalt, op: 0.6, w: 0.25 }); } },
      // a Crash spends the soak (a drenched foe keeps it once): a tall foam burst
      crash(i, t, keep) { const dm = self.dum[i]; if (!dm) return; dm.crashes.push(t); const s = self.soakAt(dm, t);
        if (s && !keep) { if (s.drench) s.drench = false; else s.t1 = Math.min(s.t1, t + 0.05); }
        FX.splash(this, { t, at: { d: i, y: 0.05 }, r: 0.7 * dm.m.s / 0.82, n: 12, h: 1.1 * dm.m.s / 0.82, crash: true }); },
      // held 浮空: the foe floats at height h from t0 to t1, bobbing (bubbles, the orb, the beam)
      hold(i, t0, t1, h = 0.6, o = {}) { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.holds.push({ t0, t1, h, spin: o.spin || 0, drop: o.drop !== false, at: o.at || null }); },
      heal(t, n, o = {}) { self.nums.push({ t, me: true, n: '+' + n, col: o.col || C.heal, big: o.big }); },
      say(t, s, o = {}) { self.nums.push({ t, me: true, n: s, col: o.col || C.foam, small: true }); },
      tag(i, t0, t1, s, col) { self.tags.push({ i, t0, t1, s, col: col || C.foam }); },
      move(i, t, by, dur = 0.3, e = 's') { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.moves.push({ t, by, dur, e }); },
      moveTo(i, t, to, dur = 0.3, e = 's') { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.moves.push({ t, to, dur, e }); },
      launch(i, t, h) { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.launches.push({ t, h }); },
      turn(i, t, deg, dur = 0.25) { self.dum[i].turns.push({ t, deg, dur }); },
      status(i, t, kind, dur, o) { FX.status(this, Object.assign({ i, t, kind, dur }, o || {})); },
      add(o) { self.grp.add(o); return o; },
      fx(upd) { self.fx.push(upd); },
      post(upd) { self.post.push(upd); },
      cap(t0, t1, zh, en) { self.caps.push({ t0, t1, zh, en }); },
      shake(t, a = 0.06, dur = 0.18) { self.shakes.push({ t, a, dur }); },
      dark(t0, t1, a = 0.5, fin = 0.25, fout = 0.3) { self.darks.push({ t0, t1, a, fin, fout }); },
      hud(fn) { self.hud.push(fn); },
      ghost(fn) { self.ghostK.push(fn); },
      mat: fxMat, F: { STREAK: F_STREAK, RIB: F_RIB, RING: F_RING, DISC: F_DISC, DISCN: F_DISCN, FLAT: F_FLAT, FLOW: F_FLOW, POOL: F_POOL, BUB: F_BUB, COL: F_COL }, VS_BUB, C, THREE, streakGeo, ringGeo, quadGeo, EASE, sm, clamp, lerp, rng, cam,
    };
  }
  soakAt(dm, t) { let s = null; for (const w of dm.soaks) if (t >= w.t0 && t < w.t1) s = w; return s; }
  dumPos(dm, t) {
    let x = dm.x, z = dm.z;
    for (const m of dm.moves) { if (t <= m.t) break; if (m.to && !m.by0) { const p = this.dumPosXZ(dm, m.t, m); m.by0 = [m.to[0] - p[0], m.to[1] - p[1]]; } const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; }
    let y = 0, spin = 0;
    for (let k = 0; k < dm.launches.length; k++) { const L = dm.launches[k]; if (t < L.t) break; const y0 = k ? this.dumY(dm, L.t, k) : 0; const v = Math.sqrt(2 * G * Math.max(0.001, L.h)); const tau = t - L.t; const yy = L.h < 0 ? y0 - 9 * tau : y0 + v * tau - 0.5 * G * tau * tau; const nx = dm.launches[k + 1]; if (!nx || t < nx.t) { y = Math.max(0, yy); spin = yy > 0 ? tau * 7 : 0; } }
    for (const w of dm.holds) { if (t < w.t0) continue; const up = EASE.out(clamp((t - w.t0) / 0.3)); if (t <= w.t1) { y = Math.max(y, w.h * up + 0.05 * Math.sin((t - w.t0) * 5)); spin = w.spin * (t - w.t0); if (w.at) { const p = w.at(t); x = p[0]; z = p[1]; } }
      else if (w.drop) { const a = t - w.t1, hy = w.h + 0.05 * Math.sin((w.t1 - w.t0) * 5) - 0.5 * G * a * a; if (hy > 0) { y = Math.max(y, hy); } if (w.at) { const p = w.at(w.t1); x = p[0] + (x - dm.x) * 0; z = p[1]; } } }
    let face = dm.opt.face != null ? dm.opt.face : -90; for (const r of dm.turns) if (t > r.t) face += r.deg * EASE.s((t - r.t) / r.dur);
    return { x, z, y, spin, face };
  }
  dumPosXZ(dm, t, upto) { let x = dm.x, z = dm.z; for (const m of dm.moves) { if (m === upto || t <= m.t) break; const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; } return [x, z]; }
  dumY(dm, t, k) { let y = 0; for (let j = 0; j < k; j++) { const L = dm.launches[j]; const y0 = j ? this.dumY(dm, L.t, j) : 0; const v = Math.sqrt(2 * G * Math.max(0.001, L.h)), tau = t - L.t; y = L.h < 0 ? Math.max(0, y0 - 9 * tau) : Math.max(0, y0 + v * tau - 0.5 * G * tau * tau); } return y; }
  vis(t) { // hidden (under the floor), see-through, or solid
    const d = this.def; let hide = false, ghost = 0;
    for (const w of d.hide || []) if (t >= w[0] && t < w[1]) hide = true;
    for (const w of d.unseen || []) if (t >= w[0] && t < w[1]) { const k = Math.min(1, (t - w[0]) / 0.12, (w[1] - t) / 0.12); ghost = Math.max(ghost, k); }
    return { hide, ghost };
  }
  warp(t) { if (this.def.noWarp) return t; let off = 0; for (const s of this.stops || []) { const a = t - s.t, c = s.hold * 2; if (a <= 0 || a >= s.hold + c) continue; off += a < s.hold ? a : s.hold * (1 - EASE.s((a - s.hold) / c)); } return t - off; }
  draw(t0, lang) {
    const t = this.warp(t0);
    const r = placeHim(this, t); const v = this.vis(t); const M = him.main;
    M.root.visible = !v.hide; M.sh.visible = !v.hide;
    if (v.ghost > 0) M.look(1 - 0.7 * v.ghost, new THREE.Color().setRGB(1 - 0.5 * v.ghost, 1 - 0.3 * v.ghost, 1), { c: new THREE.Color(C.cobalt), k: 0.4 * v.ghost }); else M.look(1);
    // water copies (after-images, the decoy)
    let gi = 0; for (const fn of this.ghostK) { const specs = fn(t) || []; for (const s of specs) { if (gi >= ghosts.length) break; const g = ghosts[gi++]; const tt = clamp(s.at != null ? s.at : t - (s.lag || 0), 0, this.T);
        poolI = 0; const P = s.clip ? sample(s.clip, s.ct || 0) : seqPose(this.seq, tt); if (!s.clip && this.def.body) addBody(P, this.def.body(tt)); if (this.def.noKnee) P._kw = 0; const rr = s.root || rootAt(this, tt); placeRig(g, rr, P); g.root.visible = true; g.sh.visible = !!s.shadow; g.staff.visible = s.staff !== false;
        g.look(s.op != null ? s.op : 0.35, new THREE.Color(s.tint || C.sky), { c: new THREE.Color(s.col || C.cobalt), k: s.glow != null ? s.glow : 0.5 }); } }
    for (let k = gi; k < ghosts.length; k++) { ghosts[k].root.visible = false; ghosts[k].sh.visible = false; }
    for (const dm of this.dum) {
      const p = this.dumPos(dm, t); dm.m.g.position.set(p.x, p.y, p.z); dm.m.face.rotation.y = (p.face + 90) * D2R; dm.m.sh.position.set(p.x, 0.004, p.z); const sc = 1 / (1 + p.y); dm.m.sh.scale.setScalar(sc);
      let fl = 0, rx = 0, rz = 0;
      for (const h of dm.hits) { const a = t - h.t; if (a < 0 || a > 0.6) continue; fl = Math.max(fl, 1 - a / 0.14); let dx = h.dir ? h.dir[0] : p.x - r.x, dz = h.dir ? h.dir[1] : p.z - r.z; const l = Math.hypot(dx, dz) || 1; const amp = (h.big || h.crash ? 0.4 : 0.26) * Math.exp(-a * 7) * Math.cos(a * 22); rx += (dz / l) * amp; rz += (-dx / l) * amp; }
      let q = 0, hf = 0; for (const h of dm.hits) { const a = t0 - h.t; if (a < 0 || a > 0.5) continue; const hv = h.big || h.crash; q += (hv ? 0.2 : 0.11) * Math.exp(-a * 14) * Math.cos(a * 30); if (hv && a < 0.09) hf = 1; }
      const s0 = dm.m.s; dm.m.tilt.scale.set(s0 * (1 + q * 0.7), s0 * (1 - q), s0 * (1 + q * 0.7));
      // soaked: the canvas darkens toward water blue
      const sk = this.soakAt(dm, t); let wet = 0; if (sk) wet = Math.min(1, (t - sk.t0) / 0.15, (sk.t1 - t) / 0.25); dm.m.cm.color.copy(dm.m.base).lerp(SOAKTINT, 0.8 * wet); dm.m.cm.roughness = 0.95 - 0.85 * wet;
      { const on = wet > 0 && dm.m.g.visible !== false && p.y < 0.05; const pu = dm.m.pud; pu.visible = on; if (on) { pu.position.set(p.x, 0.007, p.z + 0.1); { const ps = 0.38 * dm.m.s / 0.82 * (0.6 + 0.4 * Math.min(1, (t - sk.t0) / 0.4)); pu.scale.set(ps * 1.25, 1, ps * 0.9); } pu.material.uniforms.u1.value = -1; pu.material.uniforms.u0.value = 0.6; pu.material.uniforms.op.value = 0.75 * wet; pu.material.uniforms.u0.value = 1.0; pu.material.uniforms.tm.value = t; }
        dm.m.drips.forEach((d, k) => { const ph = ((t * 0.9 + k * 0.37) % 1); const an = Math.PI * (0.22 + 0.07 * k), rr = 0.3 * dm.m.s / 0.82; d.visible = wet > 0; if (!d.visible) return; const hy = (0.95 - 0.08 * (k % 3)) * dm.m.s / 0.82; const y = ph < 0.6 ? hy - ph * 0.25 : hy - 0.15 - (ph - 0.6) * (ph - 0.6) * 18; d.position.set(p.x + Math.cos(an) * rr * (ph < 0.6 ? 1 : 1.15), p.y + Math.max(0.02, y), p.z + Math.sin(an) * rr * (ph < 0.6 ? 1 : 1.15)); d.scale.set(0.05, ph < 0.6 ? 0.3 : 0.08, 1); d.material.color.set('#9CC8FF'); d.material.opacity = 1.0 * wet * (ph > 0.95 ? 0 : 1); }); }
      const fw = Math.max(0.09 * Math.max(0, fl), hf * 0.13); dm.m.cm.emissive.setRGB(1, 1, 1); dm.m.cm.emissiveIntensity = fw;
      if (dm.fellT != null && t > dm.fellT) { const a = t - dm.fellT; dm.m.g.visible = a < 0.9; rx += -1.4 * EASE.out(a / 0.35); dm.m.g.position.y -= Math.max(0, a - 0.35) * 1.2; dm.m.sh.visible = a < 0.9; } else { dm.m.g.visible = true; dm.m.sh.visible = true; }
      if (dm.opt.hideAt != null && (t < dm.opt.hideAt[0] || t > dm.opt.hideAt[1])) { dm.m.g.visible = false; dm.m.sh.visible = false; }
      for (const w of dm.opt.gone || []) if (t >= w[0] && t < w[1]) { dm.m.g.visible = false; dm.m.sh.visible = false; } // swallowed, under the floor
      let flat = 0; for (const w of dm.opt.flat || []) if (t >= w[0] && t < w[1]) flat = Math.min(1, (t - w[0]) / 0.18, (w[1] - t) / 0.25); // knocked flat
      dm.m.tilt.parent.parent.rotation.set(rx + (p.y > 0 ? Math.sin(p.spin) * 0.9 : 0) - flat * 1.45, 0, rz); dm.m.tilt.rotation.set(0, p.spin * 0.6, 0);
    }
    // camera: the game's view angle (52° down), framed on the card's spot; a small push and shake on heavy hits
    const cm = globalThis.__sideCam ? { x: r.x, z: r.z, w: globalThis.__sideCam, el: 8, y: 0.3 } : globalThis.__closeCam ? { x: r.x, z: r.z, w: globalThis.__closeCam } : (typeof this.def.cam === 'function' ? this.def.cam(t) : (this.def.cam || { x: 0, z: 0, w: 9 })); let pu = 0; for (const s of this.stops || []) { const a = t0 - s.t; if (a >= 0 && a < 0.28) pu = Math.max(pu, (s.big ? 1 : 0.7) * (a < 0.04 ? a / 0.04 : 1 - EASE.s((a - 0.04) / 0.24))); } const PC = globalThis.__playCam; const w = cm.w * (1 - 0.04 * pu), el = (PC ? 52 : (cm.el || 52)) * D2R, fov = PC ? PC.fov : 30; cam.fov = fov; cam.aspect = this.cv.width / this.cv.height; cam.updateProjectionMatrix();
    const dist = PC ? 12 * (1 - 0.04 * pu) : (w / cam.aspect) / (2 * Math.tan(fov * D2R / 2)) * 1.0 / Math.sin(el) * 0.92;
    let sx = 0, sz = 0; for (const s of this.shakes) { const a = t0 - s.t; if (a >= 0 && a < s.dur) { const k = s.a * (1 - a / s.dur); sx += Math.sin(a * 90) * k; sz += Math.cos(a * 77) * k; } }
    const fx0 = (PC && PC.x != null ? PC.x : cm.x) + sx, fz0 = (PC && PC.z != null ? PC.z : (cm.z || 0)) + sz, ly = PC ? 0 : (cm.y != null ? cm.y : 0.4);
    cam.position.set(fx0, ly + Math.sin(el) * dist, fz0 + Math.cos(el) * dist); cam.lookAt(fx0, ly, fz0); cam.updateMatrixWorld();
    for (const f of this.fx) f(t);
    this.grp.visible = true; renderer.render(scene, cam); this.grp.visible = false;
    const x = this.ctx, W = this.cv.width, H = this.cv.height; x.drawImage(renderer.domElement, 0, 0, W, H);
    const k = W / 640;
    let dk = 0; for (const d of this.darks) { if (t < d.t0 || t > d.t1 + d.fout) continue; const a = d.a * Math.min(1, (t - d.t0) / d.fin, t > d.t1 ? 1 - (t - d.t1) / d.fout : 1); if (a > dk) dk = a; }
    if (dk > 0) { x.fillStyle = `rgba(8,14,26,${dk})`; x.fillRect(0, 0, W, H); }
    for (const f of this.post) f(t, x, W, H, k, lang);
    // impact frame: on a held hit, spray spokes burst from the hit spot for a few frames (Deep Cobalt with a Sea Foam core)
    for (const s of this.stops || []) { const a = t0 - s.t; if (a < 0 || a > 0.13) continue; for (const hh of [s].concat(s.also || [])) { const dm = this.dum[hh.i]; if (!dm) continue; const p = this.dumPos(dm, hh.t); tmpV.set(p.x, p.y + dm.m.h * 0.6, p.z).project(cam);
        const cx = (tmpV.x + 1) / 2 * W, cy = (1 - tmpV.y) / 2 * H, u = a / 0.13, R = (hh.big ? 80 : 62) * k * (0.6 + 0.5 * EASE.out(u)), al = 1 - u; let sd = Math.floor(hh.t * 997) % 360;
        x.save(); x.globalAlpha = 0.85 * al;
        for (let j = 0; j < 10; j++) { const an = (sd + j * 36 + (j % 2) * 11) * D2R, ln = R * (j % 3 === 0 ? 1 : 0.6), wd = (j % 3 === 0 ? 8 : 5) * k * (1 - 0.5 * u);
          const r0 = R * (0.16 + 0.3 * u), bx = cx + Math.cos(an) * r0, by = cy + Math.sin(an) * r0, px = -Math.sin(an) * wd / 2, py = Math.cos(an) * wd / 2; x.beginPath(); x.moveTo(bx + px, by + py); x.lineTo(cx + Math.cos(an) * ln, cy + Math.sin(an) * ln); x.lineTo(bx - px, by - py); x.closePath(); x.fillStyle = j % 3 === 0 ? C.foam : C.cobalt; x.fill(); }
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.42); g.addColorStop(0, `rgba(240,248,252,${0.85 * al})`); g.addColorStop(0.4, `rgba(63,127,230,${0.45 * al})`); g.addColorStop(1, 'rgba(31,71,150,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.42, 0, 6.283); x.fill(); x.restore(); } }
    // over each soaked foe: a small water drop; drenched: two
    for (const dm of this.dum) { const sk = this.soakAt(dm, t); if (!sk || (dm.fellT != null && t > dm.fellT) || !dm.m.g.visible) continue; const p = this.dumPos(dm, t); tmpV.set(p.x, p.y + dm.m.h + 0.12, p.z).project(cam); const cx = (tmpV.x + 1) / 2 * W, cy = (1 - tmpV.y) / 2 * H;
      const al = Math.min(1, (t - sk.t0) / 0.12, (sk.t1 - t) / 0.2); x.globalAlpha = al; const dropI = (ox) => { const s = 7 * k; x.beginPath(); x.moveTo(cx + ox, cy - s * 1.5); x.bezierCurveTo(cx + ox + s, cy - s * 0.3, cx + ox + s, cy + s * 0.7, cx + ox, cy + s * 0.7); x.bezierCurveTo(cx + ox - s, cy + s * 0.7, cx + ox - s, cy - s * 0.3, cx + ox, cy - s * 1.5); x.closePath(); x.fillStyle = C.cobalt; x.fill(); x.lineWidth = 1.6 * k; x.strokeStyle = C.foam; x.stroke(); };
      if (sk.drench) { dropI(-6 * k); dropI(6 * k); } else dropI(0); x.globalAlpha = 1; }
    // tags over foes (held, Pinned, ally shields ...)
    for (const tg of this.tags) { if (t < tg.t0 || t > tg.t1) continue; const dm = this.dum[tg.i]; const p = this.dumPos(dm, t); tmpV.set(p.x, p.y + dm.m.h + 0.42, p.z).project(cam); const cx = (tmpV.x + 1) / 2 * W, cy = (1 - tmpV.y) / 2 * H; const s = typeof tg.s === 'function' ? tg.s(t, lang) : (lang === 'zh' ? tg.s[0] : tg.s[1]); if (!s) continue;
      x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'center'; const mw = x.measureText(s).width; x.fillStyle = 'rgba(14,20,30,0.78)'; x.fillRect(cx - mw / 2 - 5 * k, cy - 13 * k, mw + 10 * k, 18 * k); x.fillStyle = tg.col; x.fillText(s, cx, cy + 1 * k); }
    // damage numbers (a Crash in Sea Foam with 拍, a wet hit in sky blue)
    for (let ni = 0; ni < this.nums.length; ni++) { const nm = this.nums[ni]; const a = t0 - nm.t; if (a < 0 || a > 0.85) continue;
      if (nm.me) { const rr = rootAt(this, nm.t); tmpV.set(rr.x, rr.y + 1.35 + a * 0.5, rr.z).project(cam); }
      else { const p = this.dumPos(this.dum[nm.i], nm.t + Math.min(a, 0.1)); tmpV.set(p.x, p.y + this.dum[nm.i].m.h + 0.15 + a * 0.6, p.z).project(cam); }
      const jx = nm.me ? 0 : (((ni * 0.6180339) % 1) - 0.5) * 46 * k, jy = nm.me ? 0 : (((ni * 0.381966) % 1) - 0.5) * 14 * k;
      const sx2 = (tmpV.x + 1) / 2 * W + jx, sy2 = (1 - tmpV.y) / 2 * H + jy, al = a < 0.6 ? 1 : 1 - (a - 0.6) / 0.25, pop = 1 + 0.35 * Math.max(0, 1 - a / 0.12);
      x.globalAlpha = al; x.font = `700 ${Math.round((nm.big ? 22 : nm.small ? 14 : 17) * k * pop)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'center'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(14,20,30,0.85)';
      let s = String(lang === 'zh' && nm.n && nm.n.zh ? nm.n.zh : nm.n && nm.n.en ? nm.n.en : nm.n);
      if (nm.tag === '拍') s = (lang === 'zh' ? '拍 ' : 'Crash ') + s; else if (nm.tag === 'slam') s = (lang === 'zh' ? '撞 ' : 'Slam ') + s;
      x.strokeText(s, sx2, sy2); x.fillStyle = nm.col || C.parch; x.fillText(s, sx2, sy2); x.globalAlpha = 1; }
    const NC = globalThis.__playCam && globalThis.__playCam.nocap; if (!NC) for (const f of this.hud) f(t, x, W, H, k, lang);
    let cnow = null; if (!NC) for (const c of this.caps) if (t >= c.t0 && t <= c.t1 && (!cnow || c.t0 >= cnow.t0)) cnow = c;
    for (const c of cnow ? [cnow] : []) { const s = lang === 'zh' ? c.zh : c.en; x.font = `600 ${Math.round(15 * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'left';
      const m = x.measureText(s).width; x.fillStyle = 'rgba(12,16,24,0.82)'; x.fillRect(10 * k, 10 * k, m + 18 * k, 26 * k); x.fillStyle = C.parch; x.fillText(s, 19 * k, 28 * k); }
  }
}

// ---------------------------------------------------------------- the effect kit (water: Deep Cobalt, Sea Foam crests, River Pebble dust; glows dim)
export const FX = {};
const P3 = (A, at, t) => typeof at === 'function' ? V3(at(t)) : at && at.d != null ? A.dpt(at.d, t, at.y != null ? at.y : 0.6).add(new THREE.Vector3(at.dx || 0, 0, at.dz || 0)) : at === 'him' ? A.body(t, 0) : typeof at === 'string' ? A.at(at, t) : V3(at);
FX.P3 = P3;
const live = (t, t0, t1, fin = 0.12, fout = 0.25) => t < t0 || t > t1 ? 0 : Math.min(1, (t - t0) / fin, (t1 - t) / fout);
// a ring on the floor (or upright, facing dir) that grows and fades
FX.ring = (A, o) => {
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.foam, F_RING, { add: o.add }))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d;
    const at = P3(A, o.at, o.follow ? t : o.t);
    m.position.set(at.x, at.y + (o.y != null ? o.y : 0.02), at.z); if (o.dir) { const dv = typeof o.dir === 'function' ? o.dir(t) : V3(o.dir); m.quaternion.setFromUnitVectors(UP, dv.clone().normalize()); }
    const r = lerp(o.r0 != null ? o.r0 : 0.2, o.r1 || 1.5, EASE[o.e || 'out'](u)); m.scale.setScalar(r); m.material.uniforms.u0.value = o.w || 0.18; m.material.uniforms.op.value = (o.op || 0.8) * (1 - EASE.in(u)) * Math.min(1, a / 0.03); });
};
FX.disc = (A, o) => { // a soft filled disc on the floor (a flash, a stain)
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.cobalt, F_DISCN, { add: o.add }))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = P3(A, o.at, o.follow ? t : o.t); m.position.set(at.x, (o.y != null ? o.y : 0.025), at.z);
    m.scale.setScalar(o.hold ? lerp(o.r0 || 0.3, o.r1 || 1, EASE.out(clamp(a / 0.15))) : lerp(o.r0 || 0.3, o.r1 || 1, EASE.out(u))); m.material.uniforms.op.value = (o.op || 0.5) * (o.hold ? Math.min(1, (d - a) / 0.3) : 1 - u); });
};
// a ribbon that follows a moving point (the shell tip, a paw): the last `len` seconds of its path
FX.trail = (A, o) => {
  const N = 28; const g = new THREE.BufferGeometry(); const P = new Float32Array(N * 2 * 3), U = new Float32Array(N * 2 * 2), I = [];
  for (let i = 0; i < N; i++) { U[i * 4] = i / (N - 1); U[i * 4 + 1] = 0; U[i * 4 + 2] = i / (N - 1); U[i * 4 + 3] = 1; if (i < N - 1) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.sky, F_TAIL, { col2: C.foam }))); m.frustumCulled = false; m.visible = false;
  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), wid = o.w || 0.12, len = o.len || 0.14;
  A.fx((t) => { m.visible = t >= o.t0 && t <= o.t1 + len; if (!m.visible) return; const te = Math.min(t, o.t1);
    for (let i = 0; i < N; i++) { const tt = Math.max(o.t0, te - len * (1 - i / (N - 1))); const p = src(tt); const p2 = src(Math.max(o.t0, tt - 1 / 60)); const d = p.clone().sub(p2); const s = new THREE.Vector3().crossVectors(d, cam.position.clone().sub(p)); if (s.lengthSq() < 1e-8) s.set(1, 0, 0); s.normalize().multiplyScalar(wid * 0.5); const q = p.clone().add(s); p.sub(s);
      P[i * 6] = p.x; P[i * 6 + 1] = p.y; P[i * 6 + 2] = p.z; P[i * 6 + 3] = q.x; P[i * 6 + 4] = q.y; P[i * 6 + 5] = q.z; }
    g.attributes.position.needsUpdate = true; const fade = t > o.t1 ? 1 - (t - o.t1) / len : 1; m.material.uniforms.op.value = (o.op || 0.6) * fade; m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; });
};
export function flatRibbon(curve, w, seg, up) { const g = new THREE.BufferGeometry(); const P = [], U = [], I = []; const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const p = pts[i], q = pts[Math.min(seg, i + 1)], r = pts[Math.max(0, i - 1)]; const d = q.clone().sub(r).normalize(); const s = up ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3().crossVectors(d, UP).normalize(); const ww = typeof w === 'function' ? w(i / seg) : w;
    P.push(p.x - s.x * ww / 2, p.y - s.y * ww / 2, p.z - s.z * ww / 2, p.x + s.x * ww / 2, p.y + s.y * ww / 2, p.z + s.z * ww / 2); U.push(i / seg, 0, i / seg, 1); if (i < seg) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; }
FX.flatRibbon = flatRibbon;
// a tube or flat ribbon along a fixed curve, revealed from start to end and then fading
FX.tube = (A, o) => {
  const pts = o.pts(A); const curve = new THREE.CatmullRomCurve3(pts); const g = o.flat ? flatRibbon(curve, o.w || 0.2, o.seg || 64, o.up) : new THREE.TubeGeometry(curve, o.seg || 64, o.r || 0.03, 6, false); const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.foam, o.flow ? F_FLOW : F_RIB, { col2: o.col2 }))); m.frustumCulled = false; m.visible = false;
  A.fx((t) => { const a = t - o.t; const d = o.dur || 0.3, hold = o.hold || 0, out = o.out || 0.25; m.visible = a >= 0 && a <= d + hold + out; if (!m.visible) return;
    const u1 = clamp(a / d), u0 = o.chase ? clamp((a - (o.chase)) / d) : 0; m.material.uniforms.u1.value = EASE[o.e || 'out'](u1) * 1.02; m.material.uniforms.u0.value = u0; m.material.uniforms.tm.value = t;
    m.material.uniforms.op.value = (o.op || 0.8) * (a > d + hold ? 1 - (a - d - hold) / out : 1); if (o.move) o.move(m, t, a); });
};
// dust: soft River Pebble puffs kicked up off the floor
FX.dust = (A, o) => { const R = rng(o.seed || 7); const n = o.n || 6;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, sp = (o.sp || 1.2) * (0.5 + R()), m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || '#A9AFA9', F_DISCN))); m.visible = false; const dl = R() * 0.06;
    A.fx((t) => { const a = t - o.t - dl, d = o.dur || 0.5; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = P3(A, o.at, o.t); const dir = o.dir ? new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize().multiplyScalar(0.6).add(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(0.4)) : new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      m.position.set(at.x + dir.x * sp * EASE.out(u) * 0.6, 0.05 + u * 0.25 * (o.rise || 1), at.z + dir.z * sp * EASE.out(u) * 0.6); m.scale.setScalar((o.r || 0.18) * (0.6 + u)); m.material.uniforms.op.value = (o.op || 0.35) * (1 - u); }); } };
// mist: soft pale puffs that swell and drift up (spray hanging in the air)
FX.mist = (A, o) => { const R = rng(o.seed || 5); const n = o.n || 7;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, rr = (o.r || 0.25) * Math.sqrt(R()), hy = (o.h || 0.5) * R(), dl = R() * (o.spread || 0.06), sz = (o.size || 0.22) * (0.7 + 0.6 * R());
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 ? (o.col || C.foam) : (o.col2 || C.sky), transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; A.add(s);
    A.fx((t) => { const a = t - o.t - dl, d = o.dur || 0.6; s.visible = a >= 0 && a <= d; if (!s.visible) return; const u = a / d; const at = P3(A, o.at, o.follow ? t : o.t);
      s.position.set(at.x + Math.cos(ang) * rr * (1 + u * (o.out || 0.8)), at.y + hy + u * (o.rise || 0.3), at.z + Math.sin(ang) * rr * (1 + u * (o.out || 0.8))); s.scale.setScalar(sz * (0.6 + 1.2 * EASE.out(u))); s.material.opacity = (o.op || 0.45) * Math.min(1, a / 0.05) * (1 - EASE.in(u)); }); } };
FX.smoke = FX.mist;
// a short-lived bright spark at a point
FX.spark = (A, o) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: o.col || C.foam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; A.add(s);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.14; s.visible = a >= 0 && a <= d; if (!s.visible) return; const at = P3(A, o.at, o.follow ? t : o.t); s.position.copy(at); s.scale.setScalar((o.r || 0.4) * (0.6 + a / d)); s.material.opacity = (o.op || 0.6) * (1 - a / d); }); };
// status looks: stun stars, slow ring, blind (a beard of foam over its eyes), root (bubbles stuck at its feet)
FX.status = (A, o) => {
  const dm = A.card.dum[o.i]; if (!dm) return;
  if (o.kind === 'stun') { const g = A.add(new THREE.Group()); for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: C.stun })); g.add(s); } g.visible = false;
    A.fx((t) => { const a = t - o.t; g.visible = a >= 0 && a <= o.dur; if (!g.visible) return; const p = A.dpos(o.i, t); g.position.set(p.x, p.y + dm.m.h + 0.12, p.z); g.children.forEach((s, k) => { const an = a * 6 + k * 2.094; s.position.set(Math.cos(an) * 0.22, 0, Math.sin(an) * 0.22); }); }); }
  if (o.kind === 'slow') { const m = A.add(new THREE.Mesh(ringGeo, fxMat(C.slow, F_RING))); m.visible = false;
    A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = A.dpos(o.i, t); m.position.set(p.x, 0.03, p.z); m.scale.setScalar(0.42 + 0.03 * Math.sin(a * 8)); m.material.uniforms.u0.value = 0.2; m.material.uniforms.op.value = 0.6 * Math.min(1, (o.dur - a) / 0.2); }); }
  if (o.kind === 'blind') { const ss = []; for (let k = 0; k < 8; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 2 ? C.foam : '#FFFFFF', transparent: true, depthWrite: false, opacity: 0 })); A.add(s); ss.push(s); }
    A.fx((t) => { const a = t - o.t, on = a >= 0 && a <= o.dur; const p = A.dpos(o.i, t), sc = dm.m.s / 0.82, f = (p.face) * D2R; ss.forEach((s, k) => { s.visible = on; if (!on) return; const an = f + (k / 7 - 0.5) * 1.6; s.position.set(p.x + Math.cos(an) * 0.17 * sc, p.y + (1.12 - 0.08 * (k % 3)) * sc, p.z - Math.sin(an) * 0.17 * sc); s.scale.setScalar(0.12 * sc); s.material.opacity = 0.9 * Math.min(1, a / 0.1, (o.dur - a) / 0.25); }); }); }
  if (o.kind === 'root') { for (let k = 0; k < 5; k++) FX.bubble(A, { t0: o.t + k * 0.02, t1: o.t + o.dur, at: ((kk) => (t) => { const p = A.dpos(o.i, t), an = kk * 1.256; return [p.x + Math.cos(an) * 0.22, 0.09, p.z + Math.sin(an) * 0.22]; })(k), r: 0.09, pop: false }); }
};
FX.fell = (A, o) => { const dm = A.card.dum[o.d]; dm.fellT = o.t; };
FX.dim = (A, o) => { const m = A.add(new THREE.Mesh(ringGeo, fxMat('#000000', F_DISCN))); m.visible = false;
  A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = o.d != null ? A.dpos(o.d, t) : P3(A, o.at, t); m.position.set(p.x, 0.012, p.z); m.scale.setScalar(o.r || 1.4); m.material.uniforms.op.value = (o.op || 0.3) * Math.min(1, a / 0.12, (o.dur - a) / 0.15); }); };
// water drops: small beads that spray out and fall; with `to`, they hang a beat and then fly to it
FX.drops = (A, o) => { const R = rng(o.seed || Math.floor(o.t * 911 + 3)); const n = o.n || 6;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, sp = (o.sp || 1) * (0.4 + 0.8 * R()), up = (o.up || 0.6) * (0.4 + R()), dl = R() * (o.spread || 0.04), sz = (o.size || 0.04) * (0.7 + 0.6 * R());
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 === 2 ? (o.col2 || C.foam) : (o.col || C.sky), transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; A.add(s);
    const hang = o.hang || 0.25, fly = o.fly || 0.22; const dir = o.dir ? new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize() : null;
    A.fx((t) => { const a = t - o.t - dl, d = o.to ? hang + fly : (o.dur || 0.5); s.visible = a >= 0 && a <= d; if (!s.visible) return; const at = P3(A, o.at, o.follow ? t : o.t);
      if (o.to) { const h = Math.min(a, hang), drift = EASE.out(h / hang); const p0 = new THREE.Vector3(at.x + Math.cos(ang) * sp * 0.35 * drift, at.y + up * 0.3 * drift, at.z + Math.sin(ang) * sp * 0.35 * drift);
        if (a <= hang) s.position.copy(p0); else { const u = EASE.in2((a - hang) / fly); s.position.copy(p0).lerp(P3(A, o.to, t), u); } s.scale.setScalar(sz * 1.2); s.material.opacity = 0.9; return; }
      let vx = Math.cos(ang) * sp, vz = Math.sin(ang) * sp; if (dir) { vx = vx * 0.4 + dir.x * sp * 1.2; vz = vz * 0.4 + dir.z * sp * 1.2; }
      s.position.set(at.x + vx * a, Math.max(0.02, at.y + up * a - 5 * a * a), at.z + vz * a); s.scale.setScalar(sz); s.material.opacity = 0.9 * (1 - EASE.in(a / d)); }); } };
// a crown splash: an upright ring of water thrown up, a foam ring on the floor, drops; crash: taller, whiter, two rings
const crownGeo = new THREE.CylinderGeometry(0.8, 0.6, 1, 32, 1, true); crownGeo.translate(0, 0.5, 0);
FX.splash = (A, o) => {
  const m = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); m.visible = false; const sd = (o.t * 7.13) % 9;
  A.fx((t) => { const a = t - o.t, d = o.dur || (o.crash ? 0.5 : 0.4); m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = P3(A, o.at, o.t); m.position.set(at.x, 0, at.z);
    const r = (o.r || 0.5) * lerp(0.4, 1.2, EASE.out(u)), hh = (o.h || 0.6) * Math.min(1, u * 4) * (1 - EASE.in(u)) + 0.01; m.scale.set(r * (o.crash ? 0.7 : 0.8), hh * (o.crash ? 0.6 : 1.9), r * (o.crash ? 0.7 : 0.8)); m.material.uniforms.ln.value = o.crash ? 1 : 0; m.material.uniforms.op.value = (o.op || (o.crash ? 0.9 : 0.75)) * (1 - EASE.in(u)); m.material.uniforms.u0.value = sd; m.material.uniforms.tm.value = t; });
  FX.pool(A, { t0: o.t, t1: o.t + (o.crash ? 0.75 : 0.5), at: (tt) => { const p = P3(A, o.at, o.t); return [p.x, 0, p.z]; }, r: (o.r || 0.5) * (o.crash ? 1.25 : 1.0), op: o.crash ? 0.4 : 0.3, froth: 1, fin: 0.06, fout: 0.35 });
  FX.ring(A, { t: o.t, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.3, r1: (o.r || 0.5) * 1.6, dur: 0.45, col: C.sky, op: 0.9, w: 0.06 });
  if (o.crash) FX.ring(A, { t: o.t + 0.06, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.2, r1: (o.r || 0.5) * 1.3, dur: 0.4, col: C.cobalt, op: 0.6, w: 0.25 });
  FX.drops(A, { t: o.t, at: (tt) => { const p = P3(A, o.at, o.t); return [p.x, 0.1, p.z]; }, n: Math.round((o.n || 8) * (o.crash ? 3 : 2.2)), sp: (o.r || 0.5) * 2.4, up: (o.h || 0.6) * 3.4, size: 0.055, dur: 0.6, dir: o.dir });
};
// a stream of water from a moving point to another: a wobbling ribbon (two crossed sheets) with streaks flowing along, a foam core, spray where it lands
FX.stream = (A, o) => {
  const N = 26, mk = (col, op) => { const g = new THREE.BufferGeometry(); const P = new Float32Array(N * 4 * 3), U = new Float32Array(N * 4 * 2), I = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i < N; i++) { const b = (s * N + i) * 2; U[b * 2] = i / (N - 1); U[b * 2 + 1] = 0; U[b * 2 + 2] = i / (N - 1); U[b * 2 + 3] = 1; if (i < N - 1) I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I); const m = A.add(new THREE.Mesh(g, fxMat(col, F_FLOW2, { col2: o.col2 || C.foam }))); m.frustumCulled = false; m.visible = false; return { m, g, P, op }; };
  const halo = o.halo === false ? null : mk(C.cobalt, 0.2); if (halo) { halo.m.material = fxMat(C.cobalt, F_HALO, { add: true }); }
  const outer = mk(o.col || C.cobalt, 0.85); if (o.shader) outer.m.material = fxMat(o.col || C.cobalt, o.shader, { col2: o.col2 || C.foam }); const core = o.core === false ? null : mk(o.coreCol || C.foam, 0.5), core2 = o.core === false && !o.helix ? null : mk(o.coreCol || C.foam, 0.5);
  const from = (t) => P3(A, o.from || 'tip', t), to = (t) => P3(A, o.to, t);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), side = new THREE.Vector3(), nrm = new THREE.Vector3();
  const head = o.head || 0.12, tail = o.tail || 0.15;
  // a miss (Kesh, 20 Nov): when its end reaches empty air (no foe there), the water loses its force: the last stretch droops and falls to the
  // floor, spilling into a small puddle. o.fall: false where it ends on a wall or an object
  const DN = (A.card && A.card.dum) ? A.card.dum.length : 0, mc = { t: -1, k: 0 };
  const missAt = (t) => { const b = to(t); if (b.y < 0.1) return 0; for (const k of (A.blocks || [])) if (Math.abs(b.x - k.x) < k.hx + 0.5 && Math.abs(b.z - k.z) < k.hz + 0.5) return 0; for (let i = 0; i < DN; i++) { const p = A.dpos(i, t); if (Math.hypot(p.x - b.x, p.z - b.z) < 0.6) return 0; } return 1; };
  const miss = (t) => { if (o.fall === false || !DN) return 0; if (mc.t === t) return mc.k; const k = (missAt(t) + missAt(t - 0.06) + missAt(t - 0.12)) / 3 * clamp((t - o.t0) / head); mc.t = t; mc.k = k; return k; };
  const spillAt = (t) => { const a = from(t), b = to(t), d = b.clone().sub(a).setY(0); const L = d.length(); if (L > 1e-3) d.multiplyScalar(1 / L); return new THREE.Vector3(b.x + d.x * L * 0.08, 0.02, b.z + d.z * L * 0.08); };
  const draw = (L, w, t, hx) => { const a = from(t), b = to(t); const len = a.distanceTo(b); const dirv = b.clone().sub(a).normalize(); side.crossVectors(dirv, UP); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize(); nrm.crossVectors(side, dirv).normalize();
    const u0 = clamp((t - o.t1) / tail), u1 = clamp((t - o.t0) / head); const sag = o.sag != null ? o.sag : 0.12 * len / 4;
    const mk2 = miss(t); for (let i = 0; i < N; i++) { const v = lerp(u0, u1, i / (N - 1)); const p = tmpA.copy(a).lerp(b, v); p.y -= sag * 4 * v * (1 - v); if (o.bend) p.add(o.bend(v, t));
      if (mk2 > 0) { const f = sm((v - 0.5) / 0.5); p.addScaledVector(dirv, len * 0.08 * f * mk2); p.y -= mk2 * (b.y - 0.02) * Math.pow(f, 1.7); } const wob = (o.wob != null ? o.wob : 0.025) * Math.sin(v * 13 - t * 18) * v;
      p.addScaledVector(side, wob); if (hx) { const ph = v * len * 7 - t * 9 + hx[0]; p.addScaledVector(side, Math.cos(ph) * hx[1] * (0.4 + 0.6 * v)).addScaledVector(nrm, Math.sin(ph) * hx[1] * (0.4 + 0.6 * v)); } const ww = w * (o.wid ? o.wid(v, t) : (0.75 + 0.25 * v) * (o.spray === false ? 1 : 1 + 2.0 * Math.max(0, (v - 0.88) / 0.12) ** 2)) * (o.pulse ? 1 + 0.25 * Math.sin(v * 20 - t * 30) : 1);
      for (let s = 0; s < 2; s++) { const ax = s ? nrm : side; const bb = (s * N + i) * 2 * 3; L.P[bb] = p.x - ax.x * ww / 2; L.P[bb + 1] = p.y - ax.y * ww / 2; L.P[bb + 2] = p.z - ax.z * ww / 2; L.P[bb + 3] = p.x + ax.x * ww / 2; L.P[bb + 4] = p.y + ax.y * ww / 2; L.P[bb + 5] = p.z + ax.z * ww / 2; } }
    L.g.attributes.position.needsUpdate = true; L.m.material.uniforms.u0.value = 0; L.m.material.uniforms.u1.value = 1; L.m.material.uniforms.tm.value = t * (o.speed || 2.5) * Math.max(1, len / 2); };
  A.fx((t) => { const on = t >= o.t0 && t <= o.t1 + tail; outer.m.visible = on; if (core) core.m.visible = on; if (core2) core2.m.visible = on; if (halo) halo.m.visible = on; if (!on) return; const k = (o.op || 1);
    const W0 = (o.w || 0.16) * 1.35 * (o.spray === false ? 1 : 1.3); if (halo) { halo.m.visible = on; draw(halo, W0 * 2.6, t); halo.m.material.uniforms.op.value = 0.3 * k; } draw(outer, W0, t); outer.m.material.uniforms.op.value = (o.jop || 0.9) * k; outer.m.material.uniforms.ln.value = o.spray === false ? 0 : 1; if (core) core.m.visible = on; if (core2) core2.m.visible = on; const TW = o.twist === false ? 0 : (o.tw || 0.38); if (core) { draw(core, W0 * 0.4, t, [0, W0 * TW]); core.m.material.uniforms.op.value = 0.75 * k; } if (core2) { draw(core2, W0 * 0.26, t, [3.14, W0 * TW]); core2.m.material.uniforms.op.value = 0.7 * k; } });
  if (o.fall !== false) { FX.pool(A, { t0: o.t0 + head, t1: o.t1 + tail + 0.4, at: (tt) => spillAt(Math.min(tt, o.t1)), follow: true, r: (tt) => 0.42 * miss(Math.min(tt, o.t1)) + 0.001, grow: false, op: 0.4, froth: 1.1, fin: 0.1, fout: 0.4 });
    for (let ts = o.t0 + head; ts < o.t1; ts += 0.1) FX.drops(A, { t: ts, at: (tt) => { const q = spillAt(ts); return miss(ts) > 0.5 ? [q.x, 0.04, q.z] : [q.x, -60, q.z]; }, n: 5, sp: 0.5, up: 0.7, size: 0.035, dur: 0.35, seed: Math.floor(ts * 1000) + 11 }); }
  // drops peel off along it
  if (o.peel !== false && (o.t1 - o.t0) > 0.2) { const R2 = rng(Math.floor(o.t0 * 977 + 5)); for (let ts = o.t0 + head; ts < o.t1; ts += 0.07) { const vv = 0.15 + 0.8 * R2(); FX.drops(A, { t: ts, at: ((v0) => (tt) => from(tt).lerp(to(tt), v0))(vv), n: 1, sp: 0.35, up: 0.5, size: 0.03, dur: 0.35, seed: Math.floor(ts * 1000) }); } }
  // spray where it lands
  if (o.spray !== false) { const n = Math.floor((o.t1 - o.t0) / 0.12); for (let i = 0; i < n; i++) { const ts = o.t0 + head + i * 0.12; if (ts > o.t1) break; FX.drops(A, { t: ts, at: (tt) => miss(ts) > 0.5 ? spillAt(tt) : to(tt), n: 8, sp: 0.9, up: 0.9, size: 0.05, dur: 0.4, seed: i * 13 + 7, dir: o.sprayDir }); if (i % 2 === 0) FX.spark(A, { t: ts, at: (tt) => to(tt), r: (o.w || 0.16) * 2.2, col: C.foam, op: 0.35, dur: 0.16 }); } }
};
// a jet: a straight burst of water that shoots from a to b (head first), holds, and its tail follows
FX.jet = (A, o) => FX.stream(A, Object.assign({ t0: o.t, t1: o.t + (o.hold || 0.12), head: o.dur || 0.12, tail: o.tail || 0.14, sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false, jop: 0.95, core: false, halo: false, shader: F_JET,
  wid: (v) => (0.6 + 0.4 * Math.min(1, v / 0.2)) * (1 + 1.5 * Math.max(0, (v - 0.82) / 0.18) ** 1.5) }, o, { w: (o.w || 0.14) * 1.0 }));
// a water bolt's head (the reference, 20 Nov): white foam skin round a cracked deep blue core
const F_BOLTH = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float nz=fbm(vP.xy*5.0+vP.z*3.0+tm*1.5);
    float core=1.0-smoothstep(0.14,0.42,f+0.4*(nz-0.5)); float cr=smoothstep(0.03,0.0,abs(fbm(vP.xz*7.0-tm*0.8)-0.5))*core;
    vec3 blue=mix(vec3(0.06,0.22,0.72),vec3(0.2,0.5,1.0),smoothstep(0.3,0.7,nz)); blue=mix(blue,vec3(0.6,0.85,1.0),cr*0.8); vec3 c=mix(col2,blue,core);
    gl_FragColor=vec4(c,op*(0.85+0.15*f)); }`;
// a water bolt: a ball of water with a twisting foam trail along a path, a crown splash where it lands
FX.bolt = (A, o) => {
  const ball = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.95 }, u0: { value: 0.05 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BOLTH, transparent: true, depthWrite: false }))); ball.visible = false;
  const core = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#8FC0F8', transparent: true, opacity: 0.45, depthWrite: false }))); core.visible = false;
  const path = o.path || ((u, t) => { const a = P3(A, o.from || 'tip', o.t), b = P3(A, o.to, o.t + (o.dur || 0.3)); const p = a.clone().lerp(b, u); p.y += (o.arc || 0) * 4 * u * (1 - u); return p; });
  const pos = (t) => path(EASE[o.e || 'lin'](clamp((t - o.t) / (o.dur || 0.3))), t);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3; const on = a >= 0 && a <= d; ball.visible = core.visible = on; if (!on) return; const p = pos(t); ball.position.copy(p); core.position.copy(p); core.visible = false; const r = (o.r || 0.11) * 1.26, wob = 1 + 0.08 * Math.sin(a * 40); ball.lookAt(pos(Math.min(o.t + d, t + 0.02)).add(p.clone().sub(pos(Math.max(o.t, t - 0.02)))).sub(p).add(p)); ball.scale.set(r * wob, r * wob, r * 1.7); ball.material.uniforms.tm.value = t; });
  FX.trail(A, { of: (t) => pos(Math.min(t, o.t + (o.dur || 0.3))), t0: o.t, t1: o.t + (o.dur || 0.3), len: o.len || 0.2, w: (o.r || 0.11) * 2.0, op: 1.0, col: '#4F8EEA' });
  if (o.splash !== false) FX.splash(A, { t: o.t + (o.dur || 0.3), at: (tt) => pos(o.t + (o.dur || 0.3)), r: o.sr || 0.4, h: o.sh || 0.5, n: 7 });
};
// a bubble: clear with one Sea Foam rim light, wobbling; it follows at(t); hits make it ring; it pops at the end (a ring of drops)
const bubGeo = new THREE.SphereGeometry(1, 28, 18);
FX.bubble = (A, o) => {
  const m = A.add(new THREE.Mesh(bubGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.bubble) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BUB2, transparent: true, depthWrite: false }))); m.visible = false;
  const at = (t) => o.at === 'him' ? A.body(t, 0.5) : P3(A, o.at, t);
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = at(t); m.position.copy(c); let fl = 0; for (const h of o.hits || []) { const b = t - h; if (b >= 0 && b < 0.3) fl = Math.max(fl, (1 - b / 0.3)); }
    const grow = o.grow === false ? 1 : EASE.back(clamp(a / 0.25)); const r = (typeof o.r === 'function' ? o.r(t) : (o.r || 0.5)) * grow, w1 = 1 + 0.05 * Math.sin(a * 7) + 0.12 * fl * Math.sin((t - o.t0) * 40), w2 = 1 + 0.05 * Math.cos(a * 6);
    m.scale.set(r * w1, r * w2 * (o.tall || 1), r / w1); const dark = o.dark ? o.dark(t) : 0; m.material.uniforms.u0.value = dark; m.material.uniforms.col.value.set(dark > 0 ? C.cobalt : (o.col || C.bubble));
    m.material.uniforms.op.value = (o.op || 0.7) * (1 + 0.6 * fl) * (o.pop === false ? Math.min(1, (o.t1 - t) / 0.2) : 1); m.material.uniforms.tm.value = t; });
  if (o.pop !== false) { const pt = o.t1; FX.ring(A, { t: pt, at: (tt) => at(pt), r0: (o.r || 0.5) * 0.9, r1: (o.r || 0.5) * 2, dur: 0.25, col: C.foam, op: 0.8, w: 0.12, dir: [0, 0, 1], follow: false });
    FX.ring(A, { t: pt, at: (tt) => { const c = at(pt); return [c.x, 0.02, c.z]; }, r0: (o.r || 0.5) * 0.6, r1: (o.r || 0.5) * 1.8, dur: 0.35, col: C.cobalt, op: 0.5, w: 0.2 });
    FX.drops(A, { t: pt, at: (tt) => at(pt), n: 10, sp: 1.4 * (o.r || 0.5) * 2, up: 0.8, size: 0.035, dur: 0.45, col: C.foam, col2: C.sky }); FX.spark(A, { t: pt, at: (tt) => at(pt), r: (o.r || 0.5) * 1.4, col: C.foam, op: 0.5 }); }
};
// a water orb (Tide Orb, Depth Charge, the pressure cell): a filled ball with a turning foam band
FX.orb = (A, o) => FX.bubble(A, Object.assign({ col: C.cobalt, op: 0.85, dark: () => 0.25 }, o));
// a pool on the floor: ripples and a foam rim; whirl > 0 turns foam arms inward
FX.pool = (A, o) => {
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.cobalt, F_POOL2))); m.visible = false; m.renderOrder = -1;
  A.fx((t) => { const k = live(t, o.t0, o.t1, o.fin || 0.2, o.fout || 0.4); m.visible = k > 0; if (!m.visible) return; const c = P3(A, o.at, o.follow ? t : o.t0); m.position.set(c.x, (o.y || 0.008), c.z); const r = (typeof o.r === 'function' ? o.r(t) : (o.r || 1)) * (o.grow === false ? 1 : EASE.out(clamp((t - o.t0) / 0.25)));
    m.scale.set(r * (o.sx || 1), 1, r * (o.sz || 1)); if (o.yaw != null) m.rotation.y = typeof o.yaw === 'function' ? o.yaw(t) : o.yaw; m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.55) * (o.whirl ? 1.5 : 1.6)) * k; m.material.uniforms.u0.value = o.froth || 0; m.material.uniforms.u1.value = o.whirl || 0; m.material.uniforms.tm.value = t; });
};
FX.puddle = (A, o) => FX.pool(A, Object.assign({ op: 0.42, r: 0.6 }, o));
// a strip of water on the floor from a to b (the wet path, a current, a channel); flow > 0 runs streaks along it
FX.strip = (A, o) => {
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); // u along x before turn
    const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_WET, { col2: C.foam }))); m.visible = false; m.renderOrder = -1;
  A.fx((t) => { const k = live(t, o.t0, o.t1, o.fin || 0.15, o.fout || 0.4); m.visible = k > 0; if (!m.visible) return; const a = P3(A, o.from, o.follow ? t : o.t0), b = P3(A, o.to, o.follow ? t : o.t0); const grow = o.grow ? clamp((t - o.t0) / o.grow) : 1;
    const bb = a.clone().lerp(b, grow); const len = a.distanceTo(bb); m.position.set((a.x + bb.x) / 2, o.y || 0.009, (a.z + bb.z) / 2); m.rotation.set(0, Math.atan2(bb.x - a.x, bb.z - a.z), 0); m.scale.set(o.w || 1, 1, Math.max(0.01, len)); m.material.uniforms.ln.value = Math.max(0.2, len / (o.w || 1));
    m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.5) * 1.3) * k; m.material.uniforms.tm.value = (o.flow != null ? o.flow : 0.3) * t * 4; m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; });
};
// a breaking wave that rolls along the floor: a long back slope, a curling Sea Foam crest, foam at its foot (her passed tide)
const waveGeo = (() => { const PR = [[-1.55, 0], [-1.05, 0.06], [-0.6, 0.22], [-0.25, 0.5], [0.05, 0.85], [0.3, 1.15], [0.6, 1.35], [0.95, 1.3], [1.15, 1.05], [1.05, 0.82], [0.75, 0.75], [0.5, 0.45], [0.5, 0.15], [0.62, 0]];
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t), prof = (v) => { const f = v * (PR.length - 1), i = Math.min(PR.length - 2, Math.floor(f)), t = f - i, P = (k) => PR[Math.min(PR.length - 1, Math.max(0, k))]; return [cr(P(i - 1)[0], P(i)[0], P(i + 1)[0], P(i + 2)[0], t), Math.max(0, cr(P(i - 1)[1], P(i)[1], P(i + 1)[1], P(i + 2)[1], t))]; };
  const NU = 24, NV = 50, pos = [], col = [], idx = [], c0 = new THREE.Color(C.deep), c1 = new THREE.Color(C.cobalt), c2 = new THREE.Color(C.sky), c3 = new THREE.Color(C.foam), cc = new THREE.Color();
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const u = i / NU * 2 - 1, v = j / NV, [pz, py] = prof(v), hk = 1, y = py * hk / 1.35, pv = v * (PR.length - 1);
    pos.push(u * 0.5, y, (pz - 1.15) / 2.7);
    const crest = pv > 5.0 && pv < 8.6, face = pv >= 8.6 && pv < 12.4, foot = pv >= 12.4;
    if (crest) cc.copy(c2).lerp(c3, Math.min(1, 0.45 + 0.55 * Math.sin((pv - 5.3) / 3 * Math.PI))); else if (foot) cc.copy(c1).lerp(c3, 0.55 + 0.3 * Math.sin(u * 23 + pv * 9)); else if (face) cc.copy(c0).lerp(c1, 0.35 + 0.5 * y).lerp(c3, Math.sin(u * 17 + pv * 2.2) > 0.8 ? 0.55 : 0); else cc.copy(c0).lerp(c1, Math.min(1, y * 2)).lerp(c3, Math.sin(u * 13 - pv * 5) > 0.9 ? 0.35 : 0);
    col.push(cc.r, cc.g, cc.b, (j === 0 || i === 0 || i === NU) ? 0.3 : 1); }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b2 = a + NV + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }
  const UVw = []; for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) UVw.push(i / NU, j / NV);
  // a filled profile at each side (the curl seen in silhouette): the outline back -> crest -> lip -> under the face -> foot, closed along the floor
  for (const sd of [-1, 1]) { const outl = [], base = pos.length / 3; for (let j = 0; j <= NV; j++) { const v = j / NV, [pz, py] = prof(v), y = py / 1.35, z = (pz - 1.15) / 2.7; outl.push(new THREE.Vector2(z, y)); pos.push(sd * 0.5, y, z); cc.setRGB(0.03, 0.12, 0.45).lerp(new THREE.Color(0.15, 0.45, 0.95), Math.min(1, y * 1.15)).lerp(c3, Math.max(0, y - 0.88) * 6); col.push(cc.r, cc.g, cc.b, 0.92); UVw.push(0.3 + 0.4 * y, v + 2.0); }
    const tri = THREE.ShapeUtils.triangulateShape(outl, []); for (const t3 of tri) idx.push(base + t3[0], base + t3[1], base + t3[2]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UVw, 2)); geo.setIndex(idx); geo.computeVertexNormals(); { const nm = geo.attributes.normal, n0 = (NU + 1) * (NV + 1); for (let k = n0; k < nm.count; k++) nm.setXYZ(k, k < n0 + NV + 1 ? -1 : 1, 0, 0); } return geo; })();
// o: t, from, dir (deg or vector), dist, dur, w (width), h (height), len (depth), arc (deg: a curved front like Crashing Wave), at(t)/yaw(t) to steer it
FX.wave = (A, o) => {
  const m = A.add(new THREE.Mesh(waveGeo, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.9 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const dirAt = (t) => { if (o.yaw) return o.yaw(t); const dv = typeof o.dir === 'number' ? o.dir : null; if (dv != null) return dv * D2R; const v = V3(o.dir); return Math.atan2(v.x, v.z); };
  const posAt = (t) => { if (o.at) return P3(A, o.at, t); const a = P3(A, o.from, o.t), y = dirAt(t), u = EASE[o.e || 'lin'](clamp((t - o.t) / (o.dur || 0.6))); return new THREE.Vector3(a.x + Math.sin(y) * (o.dist || 3) * u, 0, a.z + Math.cos(y) * (o.dist || 3) * u); };
  // steered by a path (her rides): the wave's body bends along the way it came (Kesh, 20 Nov: it could not bend on a turn), each slice of it
  // sitting where the crest was that far back, so a turning ride drags a curved wave behind it
  const bend = typeof o.at === 'function' && o.bend !== false; let bg = null, B0 = null;
  if (bend) { bg = waveGeo.clone(); B0 = bg.attributes.position.array.slice(); m.geometry = bg; }
  const HK = 70, hx = new Float32Array(HK + 1), hz = new Float32Array(HK + 1), hd = new Float32Array(HK + 1);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.6, out = o.out || 0.25; m.visible = a >= 0 && a <= d + out; if (!m.visible) return; const tc = Math.min(t, o.t + d), p = posAt(tc), yw = dirAt(t);
    const rise = EASE.out(clamp(a / (o.rise || 0.15))), sink = a > d ? 1 - EASE.in((a - d) / out) : 1, hh = (o.h || 0.8) * 1.2 * rise * sink * (o.hFn ? o.hFn(a / d) : 1);
    const W = o.wFn ? o.wFn(a / d) : (o.w || 1.3), Lz = (o.len || 1.0) * 1.9 * (0.7 + 0.3 * rise);
    m.material.uniforms.op.value = 0.95 * Math.min(1, sink * 1.5); m.material.uniforms.tm.value = t;
    if (!bend) { m.position.set(p.x, 0, p.z); m.rotation.set(0, yw, 0); m.scale.set(W, Math.max(0.01, hh), Lz); return; }
    // the crest's track back in time, as distance along it
    for (let k = 0; k <= HK; k++) { const q = posAt(Math.max(o.t, tc - k * 0.02)); hx[k] = q.x; hz[k] = q.z; hd[k] = k ? hd[k - 1] + Math.hypot(q.x - hx[k - 1], q.z - hz[k - 1]) : 0; }
    const f0x = Math.sin(dirAt(o.t)), f0z = Math.cos(dirAt(o.t)), fx = Math.sin(yw), fz = Math.cos(yw), pa = bg.attributes.position;
    for (let v = 0; v < pa.count; v++) { const x = B0[v * 3] * W, y = Math.max(0.01, hh) * B0[v * 3 + 1], sz = B0[v * 3 + 2] * Lz; let cx, cz, tx, tz;
      if (sz >= 0) { cx = p.x + fx * sz; cz = p.z + fz * sz; tx = fx; tz = fz; }
      else { const ds = -sz; let k = 1; while (k < HK && hd[k] < ds) k++; const seg = hd[k] - hd[k - 1];
        if (hd[k] < ds || seg < 1e-4) { const back = ds - hd[k]; tx = k > 0 && seg > 1e-4 ? (hx[k - 1] - hx[k]) / seg : f0x; tz = k > 0 && seg > 1e-4 ? (hz[k - 1] - hz[k]) / seg : f0z; if (hd[HK] < 1e-3) { tx = fx; tz = fz; } cx = hx[k] - tx * back; cz = hz[k] - tz * back; }
        else { const f = (ds - hd[k - 1]) / seg; cx = hx[k - 1] + (hx[k] - hx[k - 1]) * f; cz = hz[k - 1] + (hz[k] - hz[k - 1]) * f; tx = (hx[k - 1] - hx[k]) / seg; tz = (hz[k - 1] - hz[k]) / seg; } }
      pa.setXYZ(v, cx + tz * x, y, cz - tx * x); }
    pa.needsUpdate = true; bg.computeVertexNormals(); bg.computeBoundingSphere(); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); });
  // foam spray off the crest while it runs, foam at its foot
  const n = Math.floor((o.dur || 0.6) / 0.07); for (let i = 0; i < n; i++) { const ts = o.t + 0.05 + i * 0.07; FX.drops(A, { t: ts, at: (tt) => { const p = posAt(ts), y = dirAt(ts); return [p.x + Math.sin(y) * 0.1 * (o.len || 1), (o.h || 0.8) * 1.4, p.z + Math.cos(y) * 0.1 * (o.len || 1)]; }, n: 5, sp: (o.w || 1.3) * 0.6, up: 1.0, size: 0.035, dur: 0.45, dir: [Math.sin(dirAt(ts)), Math.cos(dirAt(ts))], seed: i * 5 + 1 }); }
  if (o.wet !== false) FX.strip(A, { t0: o.t, t1: o.t + (o.dur || 0.6) + (o.wetFor || 1.2), from: (tt) => { const a = P3(A, o.from || [0, 0, 0], o.t); return a; }, to: (tt) => posAt(Math.min(tt, o.t + (o.dur || 0.6))), follow: true, w: (o.w || 1.3) * 0.9, op: 0.18, flow: 0 });
};
// the tsunami bent along an arc (Surge's Overhead): the wave's white crest leads along the path, its body stretches back to the source;
// o: t, dur (head from start to end), from, to, top (arc height), w (width across), hh (wave height), len (body length, 0..1 of the path), out
FX.bentwave = (A, o) => {
  const g = waveGeo.clone(), P0 = g.attributes.position.array.slice(), pa = g.attributes.position; g.deleteAttribute('normal'); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(P0.length), 3));
  const m = A.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.9 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const a0 = V3(o.from), a1 = V3(o.to), d = a1.clone().sub(a0), dn = d.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), top = o.top || 2.2, st = o.stand || 0; let Lf = o.floor || 1.5;
  // u < 0: the floor behind the source (where the wave stands as an ordinary tsunami); u 0..1: the arc over her
  const path = (u) => u < 0 ? new THREE.Vector3(a0.x + dn.x * u * Lf, 0, a0.z + dn.z * u * Lf) : new THREE.Vector3(a0.x + d.x * u, Math.sin(Math.PI * Math.min(1, u)) * top, a0.z + d.z * u);
  const tan = (u) => { const e = 0.002, p1 = path(u + e), p2 = path(u - e); return p1.sub(p2).normalize(); };
  A.fx((t) => { const a = t - o.t, du = o.dur || 0.9, out = o.out || 0.3; m.visible = a >= -st && a <= du + out; if (!m.visible) return;
    const gs = st > 0 ? clamp((a + st) / st) : 1, hd = a < 0 ? 0 : EASE.out(clamp(a / du)), tail = a > du ? -1 + 2 * EASE.s(clamp((a - du) / out)) : -1, hh = (o.hh || 0.6) * Math.max(0.04, Math.pow(sm(gs), 1.6)), W = (o.w || 1.3) * (0.55 + 0.45 * sm(gs)); Lf = (o.floor || 1.5) * (0.35 + 0.65 * sm(gs));
    for (let k = 0; k < pa.count; k++) { const x = P0[k * 3], y = P0[k * 3 + 1], z = P0[k * 3 + 2]; const u = hd + z * (hd - tail); const p = path(u), tg = tan(u), nv = new THREE.Vector3().crossVectors(tg, side).multiplyScalar(-1);
      if (nv.y < 0 && Math.abs(tg.y) < 0.99) nv.multiplyScalar(-1); pa.setXYZ(k, p.x + nv.x * y * hh + side.x * x * W, p.y + nv.y * y * hh, p.z + nv.z * y * hh + side.z * x * W); }
    g.setDrawRange(0, a > 0.03 ? 24 * 50 * 6 : Infinity); // the side profiles only while it stands: bent, their fill would span the arc's chord
    pa.needsUpdate = true; g.computeVertexNormals(); m.material.uniforms.op.value = 0.95 * (a > du ? 1 - EASE.in(clamp((a - du) / out)) : 1); m.material.uniforms.tm.value = t; });
  // spray off the leading crest
  const n = Math.floor((o.dur || 0.9) / 0.08); for (let i = 0; i < n; i++) { const ts = o.t + 0.05 + i * 0.08; FX.drops(A, { t: ts, at: (tt) => { const u = EASE.out(clamp((ts - o.t) / (o.dur || 0.9))), p = path(u); return [p.x, p.y + (o.hh || 0.6), p.z]; }, n: 4, sp: (o.w || 1.3) * 0.5, up: 0.6, size: 0.035, dur: 0.45, seed: i * 7 + 3 }); }
};
// one tsunami that grows and curls over (Surge's Overhead, Kesh's growth strip, 20 Nov): a thin ripple rises into a tongue leaning
// toward her, its top curls into a round barrel with a white foam head, and that white head keeps curling over her and comes down
// behind her; then the body pours over after it. The wave is a spine in its own plane (x along the throw, y up), swept across its
// width with a lens-shaped section: thin at the base, a full round head. o: t (the curl starts over), stand (the growing time
// before t), dur (head over to the landing), from (its base), to (where the head lands), w, out (the pour after landing)
const VS_CURL = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const F_CURL = `uniform float op; uniform float tm; uniform float u0; uniform float u1; varying vec2 vUv; varying vec3 vN; varying vec3 vW; ${GN}
  void main(){ float s=vUv.x, v=vUv.y; float inner=step(0.5,v); float n=fbm(vW.xz*2.5+vec2(s*5.0,tm*0.8)); if(s<u0+0.08*(n-0.5)) discard;
    vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; float lit=0.62+0.38*max(0.0,dot(N,normalize(vec3(0.3,1.0,0.45))));
    float st=smoothstep(0.55,0.75,fbm(vec2(s*16.0-tm*3.0, v*10.0))); float st2=smoothstep(0.62,0.8,fbm(vec2(s*30.0-tm*4.0+5.0, v*22.0)));
    vec3 deep=vec3(0.04,0.14,0.48), cob=vec3(0.13,0.42,0.92), sky=vec3(0.62,0.8,0.96), foam=vec3(0.9,0.95,0.97);
    vec3 c=mix(deep,cob,smoothstep(0.0,0.55,s)*(1.0-0.45*inner)); c=mix(c,sky,st*0.45); c=mix(c,foam,st2*0.35*smoothstep(0.2,0.6,s));
    float fm=smoothstep(u1-0.06,u1+0.1,s+0.22*(n-0.5)); fm*=1.0-0.45*inner; c=mix(c,foam,fm);
    float foot=1.0-smoothstep(0.0,0.07,s+0.05*(n-0.5)); c=mix(c,foam,foot*0.55);
    c*=lit; gl_FragColor=vec4(c,op*(0.86+0.14*fm)); }`;
FX.curlwave = (A, o) => {
  const NS = 72, NM = 28, g = new THREE.BufferGeometry(), P = new Float32Array((NS + 1) * (NM + 1) * 3), UV = new Float32Array((NS + 1) * (NM + 1) * 2), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NM; j++) { const k = i * (NM + 1) + j; UV[k * 2] = i / NS; UV[k * 2 + 1] = j / NM; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NM; j++) { const a = i * (NM + 1) + j, b = a + NM + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(idx);
  const m = A.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.92 }, tm: { value: 0 }, u0: { value: -1 }, u1: { value: 0.7 } }, vertexShader: VS_CURL, fragmentShader: F_CURL, transparent: true, depthWrite: true, side: THREE.DoubleSide }))); m.visible = false; m.renderOrder = 2;
  const a0 = V3(o.from), a1 = V3(o.to), dv = a1.clone().sub(a0), D = dv.length(), fw = dv.clone().normalize(), sd = new THREE.Vector3(-fw.z, 0, fw.x), Wf = o.w || 2.0;
  // the stages (Kesh's strip): ripple, tongue, leaning tongue tipping over, barrel with its white head, then the head curled over her
  //            L     thb   thm   curl  sc    th     W     foam
  const KEY = [[0.5,  4,    8,    0,    0.6,  0.06,  0.5,  0.8],
               [1.0,  10,   38,   0,    0.6,  0.16,  0.7,  0.86],
               [1.7,  18,   72,   70,   0.5,  0.32,  0.88, 0.84],
               [2.6,  30,   100,  235,  0.42, 0.5,   1.0,  0.72],
               [1.0,  72,   92,   205,  0.28, 0.55,  1.0,  0.7]];
  const key = (q) => { const i = Math.min(3, Math.floor(q)), f = sm(q - i); return KEY[i].map((v, c) => v + (KEY[i + 1][c] - v) * f); };
  const spine = (L, thb, thm, C, sc) => { const pts = [[0, 0]]; let x = 0, y = 0; for (let i = 1; i <= NS; i++) { const s = (i - 0.5) / NS, th = (thb + (thm - thb) * sm(Math.min(1, s / 0.35)) - C * Math.pow(Math.max(0, (s - sc) / (1 - sc)), 1.4)) * D2R; x += Math.cos(th) * L / NS; y += Math.sin(th) * L / NS; pts.push([x, y]); } return pts; };
  const FIN = spine(1, ...KEY[4].slice(1, 5))[NS], st = o.stand || 0.5, du = o.dur || 0.9, out = o.out || 0.45;
  A.fx((t) => { const a = t - o.t; m.visible = a >= -st && a <= du + out; if (!m.visible) return;
    const q = a < 0 ? 3 * clamp((a + st) / st) : 3 + EASE.io2(clamp(a / du)); const [L0, thb, thm, C, sc, th0, w0, fs] = key(q);
    let pts = spine(1, thb, thm, C, sc), L = L0, shear = 0; const kq = clamp(q - 3);
    let ysc = 1; if (kq > 0) { L = 2.6 + (D / FIN[0] - 2.6) * kq; shear = pts[NS][1] * kq * kq; let my = 0; for (const pp of pts) my = Math.max(my, pp[1]); my *= L; if (my > 2.4) ysc = 1 + (2.4 / my - 1) * kq; }
    const W = Wf * w0, H = (i) => { const s = i / NS; return th0 * (0.5 + 0.5 * s) * (1 + 0.7 * sm((s - 0.68) / 0.22)) * Math.sqrt(clamp((1 - s) / 0.07)) * (0.55 + 0.45 * Math.sqrt(clamp(s / 0.25))); };
    // normals of the spine in its plane, then the lens section across the width
    for (let i = 0; i <= NS; i++) { const p = pts[i], pn = pts[Math.min(NS, i + 1)], pp = pts[Math.max(0, i - 1)], tx = pn[0] - pp[0], ty = pn[1] - pp[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      const sx = p[0] * L, sy = (p[1] - shear * (p[0] / Math.max(1e-3, pts[NS][0]))) * L * ysc, h = H(i);
      for (let j = 0; j <= NM; j++) { const v = j / NM, side = v < 0.5 ? 1 : -1, z = v < 0.5 ? (v * 4 - 1) : (3 - v * 4), cz = Math.pow(Math.max(0, 1 - z * z), 0.22), hz = 0.8 + 0.2 * cz;
        const lx = sx * hz + nx * side * h * 0.5 * cz, ly = Math.max(0, sy * hz + ny * side * h * 0.5 * cz), lz = z * W * 0.5, k = (i * (NM + 1) + j) * 3;
        P[k] = a0.x + fw.x * lx + sd.x * lz; P[k + 1] = ly; P[k + 2] = a0.z + fw.z * lx + sd.z * lz; } }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    const U = m.material.uniforms; U.tm.value = t; U.u1.value = fs; U.u0.value = a > du ? -0.1 + 1.15 * EASE.in(clamp((a - du) / out)) : -1; U.op.value = 0.92 * (a > du + out * 0.7 ? 1 - (a - du - out * 0.7) / (out * 0.3) : 1); });
  // spray off the white head as it curls over
  for (let ts = o.t; ts < o.t + du; ts += 0.08) FX.drops(A, { t: ts, at: (tt) => { const u = EASE.io2(clamp((ts - o.t) / du)), x = D * u * 0.92 + 0.6 * (1 - u), y = Math.sin(Math.PI * u) * 2.0 + 0.9 * (1 - u); return [a0.x + fw.x * x, y, a0.z + fw.z * x]; }, n: 4, sp: Wf * 0.45, up: 0.5, size: 0.035, dur: 0.45, seed: Math.floor(ts * 100) + 3 });
};
// a ring wall of water that breaks outward from a point (Breaker): an open cylinder growing, foam on its top
const ringWallGeo = new THREE.LatheGeometry([[0.82, 0], [0.86, 0.25], [0.92, 0.55], [0.99, 0.8], [1.05, 0.92], [1.11, 0.84], [1.12, 0.62], [1.1, 0.38], [1.14, 0.1], [1.19, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 72);
const F_RW = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float v=vUv.y; float x=vUv.x; vec2 q=vec2(cos(x*6.2832),sin(x*6.2832)); float st=smoothstep(0.52,0.72,fbm(q*2.5+vec2(v*28.0,tm*u0*0.6)))*(0.4+0.6*smoothstep(0.1,0.5,v));
    float n=fbm(q*22.0+vec2(v*30.0,tm*0.8)); float crest=smoothstep(0.47,0.52,v)*(1.0-smoothstep(0.58,0.63,v))*smoothstep(0.38,0.55,n); float ends=smoothstep(0.0,0.12,v)*(1.0-smoothstep(0.85,1.0,v));
    vec3 c=mix(vec3(0.04,0.14,0.48),vec3(0.10,0.35,0.85),smoothstep(0.05,0.45,v)); c=mix(c,vec3(0.75,0.9,1.0),st*0.75); c=mix(c,col2,crest);
    float a=op*ends*(0.65+0.25*st+0.4*crest); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
FX.ringwave = (A, o) => {
  const m = A.add(new THREE.Mesh(ringWallGeo, fxMat(C.cobalt, F_RW, { col2: C.foam }))); m.material.side = THREE.DoubleSide; m.visible = false; m.material.uniforms.u1.value = 14;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.45; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d, c = P3(A, o.at, o.follow ? t : o.t); m.position.set(c.x, 0, c.z); const r = lerp(o.r0 || 0.3, o.r1 || 2, EASE.out(u)); m.scale.set(r, (o.h || 0.55) * 0.75 * Math.sin(Math.PI * Math.min(1, 0.15 + u)), r); m.material.uniforms.op.value = (o.op || 0.85) * (1 - EASE.in(u)); m.material.uniforms.u0.value = 1.5; m.material.uniforms.tm.value = t; });
  FX.ring(A, { t: o.t + 0.03, at: o.at, r0: o.r0 || 0.3, r1: (o.r1 || 2) * 1.05, dur: (o.dur || 0.45) * 1.1, col: C.sky, op: 0.7, w: 0.05, y: 0.02 });
  FX.drops(A, { t: o.t + 0.05, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, 0.3, c.z]; }, n: 24, sp: (o.r1 || 2) * 1.2, up: 1.2, size: 0.04, dur: 0.5 });
};
// a column of water out of the floor (Geyser, a spout): an open cylinder rising, a foam cap, spray
const colGeo = new THREE.CylinderGeometry(1, 0.7, 1, 32, 1, true);
const UMB_S = 64, UMB_P = 12; // the fountain head's lathe: 64 round, 12 along the sheet from the centre to the rim
const umbGeoNew = () => new THREE.LatheGeometry(Array.from({ length: UMB_P }, (_, j) => new THREE.Vector2(j / (UMB_P - 1), 0)), UMB_S);
// one stage k (0..1) of the head, in metres from the jet top: R the rim reach, th the rim's angle (up = a bud, down = curled over)
const umbProf = (k, rr) => { const e = sm(clamp(k / 0.85)), R = rr * (0.22 + 1.2 * e), th = k < 0.6 ? lerp(1.15, -1.05, sm(clamp(k / 0.6))) : lerp(-1.05, -0.7, clamp((k - 0.6) / 0.4)); const out = []; let x = 0, y = 0; const ds = R / (UMB_P - 1);
  for (let j = 0; j < UMB_P; j++) { out.push([x, y]); const ph = th * Math.pow((j + 0.5) / (UMB_P - 1), 1.4); x += ds * Math.cos(ph); y += ds * Math.sin(ph); } return out; };
const umbSet = (g, prof, y0) => { const pa = g.attributes.position; let k = 0; for (let i = 0; i <= UMB_S; i++) { const ph = i / UMB_S * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph); for (let j = 0; j < UMB_P; j++) { const [x, y] = prof[j]; pa.setXYZ(k++, x * sn, y0 + y, x * cs); } } pa.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); };
// a fountain's umbrella (u around, v from the top out and down): strands of water radiating and falling, white near the top, breaking into drops at the ends
// a fountain's head (u around, v from the top centre out over the rim and back under): solid water swirling out, a ragged white foam rim
// a fountain's head (u around, v from the centre to the rim; u0 the stage): light water swirling out, a ragged white foam rim that breaks into drops as it spreads
const F_UMB = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float v=vUv.y; vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*5.0+vec2(v*3.0-tm*1.2,0.0)); float fine=fbm(q*24.0+vec2(v*9.0-tm*2.0,3.0)); float lump=fbm(q*7.0+vec2(tm*0.4,1.0));
    float sw=smoothstep(0.5,0.7,fbm(vec2(vUv.x*28.0+v*7.0-tm*0.8,v*3.0)));
    vec3 c=mix(vec3(0.52,0.78,1.0),vec3(0.3,0.6,1.0),smoothstep(0.2,0.6,v)); c=mix(c,vec3(0.8,0.92,1.0),sw*0.3);
    float rim=smoothstep(0.55,0.62,v+0.18*(lump-0.5)+0.04*(fine-0.5)); float top=(1.0-smoothstep(0.0,0.12,v))*smoothstep(0.45,0.6,fine); c=mix(c,col2,max(rim,top));
    float brk=smoothstep(0.98-0.35*u0,1.0-0.2*u0,v+0.25*(fine-0.5)); if(brk>0.5 && fine<0.5+0.2*u0) discard;
    float a=op*mix(0.92,1.0,rim)*(1.0-smoothstep(0.9,1.0,v+0.1*(n-0.5))); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
const F_FOAMT = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*3.0+vec2(vUv.y*5.0,tm*0.8)); float m=smoothstep(0.4,0.6,n); float ed=abs(vUv.y-0.5)*2.0; if(fbm(q*6.0+vec2(vUv.y*8.0,tm))<0.3+0.5*ed*ed) discard; vec3 c=mix(vec3(0.92,0.96,1.0),col2,m); gl_FragColor=vec4(c,op*(0.8+0.2*m)); }`;
const torGeo = new THREE.TorusGeometry(0.9, 0.22, 10, 48); torGeo.rotateX(Math.PI / 2); colGeo.translate(0, 0.5, 0);
FX.column = (A, o) => {
  const m = A.add(new THREE.Mesh(colGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); m.visible = false; m.material.uniforms.u1.value = 10;
  const cap = A.add(new THREE.Mesh(torGeo, fxMat(C.foam, F_FOAMT, { col2: C.foam }))); cap.visible = false; const ft = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); ft.visible = false; ft.material.uniforms.u0.value = 4.1;
  const um = o.umbrella === false ? null : A.add(new THREE.Mesh(umbGeoNew(), fxMat(C.cobalt, F_UMB, { col2: C.foam }))); if (um) um.frustumCulled = false;
  const sp = o.umbrella === false ? null : A.add(new THREE.Mesh(colGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); if (sp) { sp.visible = false; sp.material.uniforms.u1.value = 6; sp.material.uniforms.ln.value = 0; sp.renderOrder = 4; } if (um) { um.visible = false; um.renderOrder = 3; um.material.depthWrite = true; } // the head is solid water: it draws over the jet it caps, its top hides its own underside
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.7; const on = a >= 0 && a <= d; m.visible = cap.visible = ft.visible = on; if (um) { um.visible = on; cap.visible = false; ft.visible = false; } if (sp && !on) sp.visible = false; if (!on) return; const c = P3(A, o.at, o.follow ? t : o.t); const up = EASE.out(clamp(a / (o.rise || 0.15))), down = a > d - 0.25 ? (d - a) / 0.25 : 1; const h = (typeof o.h === 'function' ? o.h(t) : (o.h || 1.6)) * up, r = (o.r || 0.35) * (0.6 + 0.4 * down);
    m.position.set(c.x, 0, c.z); const jr = um ? r * 0.95 : r; m.scale.set(jr, Math.max(0.01, h * (o.fall ? down : 1)), jr); m.material.uniforms.op.value = (um ? 1.0 : 0.9) * Math.min(1, down * 1.5); m.material.uniforms.ln.value = um ? 0 : 1; m.material.uniforms.u0.value = -2.5; m.material.uniforms.tm.value = t;
    cap.position.set(c.x, h * (o.fall ? down : 1) * 0.97, c.z); cap.scale.set(r * 0.8, r * 0.9, r * 0.8);
    if (um) { const hh2 = Math.max(0.01, h * (o.fall ? down : 1)), op2 = clamp((a - 0.04) / 0.1), k = clamp((a - 0.06) / (d * 0.8)); um.position.set(c.x, 0, c.z); umbSet(um.geometry, umbProf(k, (o.r || 0.35) * 1.75), hh2 * 0.97);
      um.material.uniforms.op.value = 0.95 * op2 * down; um.material.uniforms.u0.value = k; um.material.uniforms.tm.value = t;
      // the little spout that rises out of the opened head (stage 4 on), white at its tip
      const spk = sm(clamp((k - 0.45) / 0.3)); sp.visible = spk > 0.01; sp.position.set(c.x, hh2 * 0.95, c.z); sp.scale.set(r * 0.2, Math.max(0.01, h * 0.22 * spk * (1 - 0.4 * clamp((k - 0.85) / 0.15))), r * 0.2); sp.material.uniforms.op.value = 0.95 * down; sp.material.uniforms.u0.value = -3.0; sp.material.uniforms.tm.value = t; } ft.visible = !um; ft.position.set(c.x, 0, c.z); const fr = um ? r * 2.1 : r * 1.3; ft.scale.set(fr, (um ? 0.14 : 0.3) * up, fr); ft.material.uniforms.op.value = (um ? 0.8 : 0.95) * down; if (um) ft.material.uniforms.col.value.set(C.sky); ft.material.uniforms.tm.value = t; cap.material.uniforms.op.value = 0.95 * down; cap.material.uniforms.tm.value = t; });
  FX.pool(A, { t0: o.t, t1: o.t + (o.dur || 0.7) + 0.2, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, 0, c.z]; }, r: (o.r || 0.35) * 2.2, op: o.umbrella === false ? 0.2 : 0.32, froth: 1.2, whirl: o.umbrella === false ? 0 : 0.45, fin: 0.08, fout: 0.3 });
  for (let i = 0; i < Math.floor((o.dur || 0.7) / 0.1); i++) FX.drops(A, { t: o.t + 0.08 + i * 0.1, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, (typeof o.h === 'function' ? o.h(tt) : (o.h || 1.6)) * 0.95, c.z]; }, n: o.umbrella === false ? 7 : 12, sp: (o.r || 0.35) * (o.umbrella === false ? 3.2 : 4.4), up: o.umbrella === false ? 0.9 : 1.2, size: 0.04, dur: 0.6, seed: i * 31 });
  FX.ring(A, { t: o.t, at: o.at, r0: 0.2, r1: (o.r || 0.35) * 3.5, dur: 0.4, col: C.foam, op: 0.7, w: 0.14 });
};
// a waterspout 水龙卷 (Kesh's three refs, 20 Nov): a twisting funnel, thin at the floor and wide at the top, spiral streaks and white foam
// ribbons racing up and round it, a looser outer skin turning faster, spray thrown off its lip, a small whirl at its foot.
// o: t, dur, at (follow), h, r (top radius), rise
const F_SPOUT = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y, x=vUv.x; vec2 q=vec2(cos(x*6.2832),sin(x*6.2832)); float sp=x*u1+y*3.2-tm*2.6*u1/3.0;
    float n=fbm(q*2.0+vec2(y*5.0-tm*1.5, sp*0.3)); float st=smoothstep(0.5,0.72,fbm(vec2(sp*4.0, y*2.0)+q*0.7)); float rb=smoothstep(0.4,0.47,abs(fract(sp*0.5+0.15*(n-0.5))-0.5));
    vec3 c=mix(vec3(0.03,0.12,0.45),vec3(0.12,0.42,0.95),0.35+0.55*y+0.2*(n-0.5)); c=mix(c,vec3(0.55,0.78,0.98),st*0.35); c=mix(c,col2,rb*(0.5+0.4*y));
    float a=op*smoothstep(0.0,0.06,y)*(1.0-smoothstep(0.86,1.0,y+0.08*(n-0.5)))*(u0+(1.0-u0)*max(st,rb)); if(y>u0*0.0+1.0) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
const spoutGeo = (() => { const pts = []; for (let k = 0; k <= 24; k++) { const y = k / 24; pts.push(new THREE.Vector2(0.2 + 0.8 * Math.pow(y, 1.7), y)); } return new THREE.LatheGeometry(pts, 40); })();
FX.spout = (A, o) => {
  const mk = (sc, solid, turn) => { const g = spoutGeo.clone(), P0 = g.attributes.position.array.slice(), m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_SPOUT, { col2: C.foam }))); m.visible = false; m.material.uniforms.u0.value = solid; m.material.uniforms.u1.value = turn; m.frustumCulled = false; return { m, g, P0, sc }; };
  const L = [mk(0.72, 0.9, 3.0), mk(1.0, 0.15, 4.5)], H = o.h || 2.0, R = o.r || 0.5, dur = o.dur || 2, rise = o.rise || 0.35;
  A.fx((t) => { const a = t - o.t, on = a >= 0 && a <= dur; for (const l of L) l.m.visible = on; if (!on) return; const c = P3(A, o.at, o.follow ? t : o.t), k = EASE.out(clamp(a / rise)) * (a > dur - 0.3 ? 1 - EASE.in((a - dur + 0.3) / 0.3) : 1);
    for (const l of L) { const pa = l.g.attributes.position; for (let v = 0; v < pa.count; v++) { const x = l.P0[v * 3], y = l.P0[v * 3 + 1], z = l.P0[v * 3 + 2], sw = 0.18 * y * y * Math.sin(t * 2.2 + y * 2.5), sw2 = 0.12 * y * Math.cos(t * 1.7 + y * 3.1);
        pa.setXYZ(v, c.x + x * R * l.sc * (0.6 + 0.4 * k) + sw, y * H * k, c.z + z * R * l.sc * (0.6 + 0.4 * k) + sw2); } pa.needsUpdate = true;
      l.m.material.uniforms.tm.value = t; l.m.material.uniforms.op.value = (l.sc < 1 ? 0.92 : 0.45) * Math.min(1, k * 1.4); } });
  FX.pool(A, { t0: o.t, t1: o.t + dur, at: (tt) => { const c = P3(A, o.at, o.follow ? tt : o.t); return [c.x, 0, c.z]; }, follow: true, r: R * 1.1, whirl: 1.3, op: 0.45, fin: 0.15, fout: 0.3 });
  for (let ts = o.t + rise; ts < o.t + dur - 0.3; ts += 0.12) FX.drops(A, { t: ts, at: (tt) => { const c = P3(A, o.at, o.follow ? ts : o.t), an = ts * 9.1; return [c.x + Math.cos(an) * R * 0.9 + 0.18 * Math.sin(ts * 2.2 + 2.5), H * 0.95, c.z + Math.sin(an) * R * 0.9]; }, n: 3, sp: 0.5, up: 0.4, size: 0.03, dur: 0.5, seed: Math.floor(ts * 100) + 9 });
};
// a slab of water on edge (now only Jet Sever's blade, as FX.sheet below): fish-tank clear, rising out of the floor
const slabGeo = new THREE.BoxGeometry(1, 1, 1); slabGeo.translate(0, 0.5, 0);
const VS_WALL = `varying vec3 vNo; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vNo=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
// a wall of water seen from the play camera: one deep-to-light body over the near end and the top, a glowing foot, a foam crest and swirls
const F_WALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec3 vNo; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ if(vNo.y<-0.5) discard; bool top=vNo.y>0.5; float y=vP.y; float along=clamp(vP.x*u0+0.5,0.0,1.0); float g=top? 0.45+0.55*along : 0.45*y;
    vec3 c=mix(vec3(0.03,0.13,0.5),vec3(0.15,0.45,0.95),clamp(g/0.6,0.0,1.0)); c=mix(c,vec3(0.35,0.65,1.0),smoothstep(0.6,1.0,g));
    float cs=caus(vec2((vP.x+vP.z)*3.0, y*3.0+vP.z*2.0)+vec2(0.0,-tm*0.2),tm); c=mix(c,vec3(0.3,0.6,1.0),cs*0.18);
    float foot=top? 0.0 : (1.0-smoothstep(0.0,0.25,y)); c+=vec3(0.4,0.7,1.0)*0.8*foot;
    float n=fbm(vec2((vP.x+vP.z)*8.0, y*6.0+along*6.0)+tm*0.5); float crest=smoothstep(0.88,0.95,g+0.16*(fbm(vec2((vP.x+vP.z)*12.0,along*12.0)+tm)-0.5));
    float zz=vP.z; float run=smoothstep(0.06,0.0,abs(g-0.6-0.15*zz-0.06*(fbm(vec2(zz*8.0+vP.x*4.0,g*10.0+tm))-0.5)))+smoothstep(0.06,0.0,abs(g-0.78-0.15*zz-0.06*(fbm(vec2(zz*9.0+3.0+vP.x*4.0,g*10.0-tm))-0.5))); run*=smoothstep(0.25,0.5,n);
    float edge=top? smoothstep(0.42,0.5,abs(vP.z))*smoothstep(0.3,0.6,n) : 0.0; float foam=clamp(max(max(crest,run*0.9),edge),0.0,1.0);
    float bn=fbm(vec2((vP.x+vP.z)*5.0,y*3.0-tm*0.4)); float band=top? 0.0 : smoothstep(0.82,0.97,sin(y*16.0-tm*3.0+bn*5.0+(vP.x+vP.z)*2.0))*(0.35+0.65*smoothstep(0.4,0.65,bn))*smoothstep(0.1,0.3,y);
    c=mix(c,vec3(0.55,0.8,1.0),band*0.55); foam=max(foam,band*smoothstep(0.55,0.7,n)*0.7);
    c=mix(c,mix(c,col,0.5),u1*0.6); c=mix(c,col2,foam); gl_FragColor=vec4(c, clamp(op*0.7*(1.0+0.3*foam+0.3*foot+0.25*band),0.0,1.0)); }`;
// a thin flat sheet of water on edge (Jet's Sever): the old slab, kept only for that
FX.sheet = (A, o) => {
  const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 1 }, u1: { value: o.col ? 1 : 0 }, tm: { value: 0 } }, vertexShader: VS_WALL, fragmentShader: F_WALL, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const lip = A.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.7, depthWrite: false }))); lip.visible = false;
  const cr = true ? null : A.add(new THREE.Mesh(waveGeo, new THREE.ShaderMaterial({ uniforms: { op: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); if (cr) cr.visible = false;
  const c0 = (t) => P3(A, o.at, o.follow ? t : o.t0), yawAt = (t) => typeof o.yaw === 'function' ? o.yaw(t) : (o.yaw || 0) * D2R;
  A.fx((t) => { const on = t >= o.t0 && t <= o.t1; m.visible = lip.visible = on; if (!on) return; const c = c0(t), up = EASE.out(clamp((t - o.t0) / (o.rise || 0.3))), H = (o.h || 1.3) * up; let tip = 0, sink = 1;
    if (o.fall != null && t > o.fall) { const u = clamp((t - o.fall) / 0.35); tip = EASE.in2(u) * 1.45; sink = 1 - clamp((t - o.fall - 0.3) / 0.2); }
    m.position.set(c.x, 0, c.z); m.rotation.set(0, yawAt(t), 0, 'YXZ'); m.rotateX(tip * (o.fallDir || 1)); if (o.swing) m.rotateY(o.swing(t)); m.scale.set(o.w || 2, Math.max(0.01, H * sink), (o.th || 0.18) * 1.2);
    m.material.uniforms.op.value = Math.min(1, (o.op || 0.6) * 1.15) * Math.min(1, (o.t1 - t) / 0.2) * (0.5 + 0.5 * sink); m.material.uniforms.tm.value = t; m.material.uniforms.u0.value = -Math.sin(yawAt(t)) < 0 ? 1 : -1; lip.position.copy(m.position); lip.quaternion.copy(m.quaternion); lip.translateY(H * sink); lip.scale.set(o.w || 2, 1, (o.th || 0.18) * 1.4); lip.material.opacity = 0.0;
    if (cr) { const dp = 1.0 * (o.cd || 1), ch = 0.55 * up * sink; cr.visible = on; cr.position.copy(m.position); cr.quaternion.copy(m.quaternion); cr.translateY(H * sink - 0.04); cr.translateZ(dp * 0.68 * (o.cdir || 1)); if ((o.cdir || 1) < 0) cr.rotateY(Math.PI); cr.scale.set((o.w || 2) * 0.98, Math.max(0.01, ch), dp); cr.material.uniforms.op.value = m.material.uniforms.op.value; cr.material.uniforms.tm.value = t; } });
  for (let ts = o.t0 + 0.3; ts < Math.min(o.t1, o.fall != null ? o.fall : o.t1); ts += 0.12) FX.drops(A, { t: ts, at: (tt) => { const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; return [c.x + Math.cos(y) * u * (o.w || 2), (o.h || 1.3) * 0.98, c.z - Math.sin(y) * u * (o.w || 2)]; }, n: 2, sp: 0.15, up: 0.2, size: 0.03, dur: 0.45, seed: Math.floor(ts * 100) });
  FX.ring(A, { t: o.t0, at: o.at, r0: 0.2, r1: (o.w || 2) * 0.6, dur: 0.4, col: C.foam, op: 0.5, w: 0.15 });
};
const cylFallGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1, true); cylFallGeo.translate(0, 0.5, 0);
// a waterfall (Kesh, 20 Nov: no walls; anything that needs a wall is water falling from the sky): a sheet pouring from out of sight
// onto a line, streaks racing down, a foaming pool, splashes and ripples where it lands.
// o: t0, t1, at, yaw (deg or fn, rad), w, top (the height it falls from, or fn), th (thickness, or fn), op, rise (the first water
// falling to the floor), cut (the sky stops: the last water falls), tip / tipDur / fallDir (it topples forward), follow, col, bub
const F_FALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float rnd; varying vec3 vNo; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ if(abs(vNo.y)>0.5) discard; float y=vP.y; if(y<u0-0.002||y>u1) discard; float ef=step(0.5,abs(vNo.x))*(1.0-rnd); float x=mix(mix(vP.x*3.0+vP.z, vP.z*2.0+vP.x*7.0, ef), atan(vP.z,vP.x)*1.3, rnd);
    float sp=tm*2.4; float n=fbm(vec2(x*5.0, y*2.0+sp)); float st=smoothstep(0.55,0.75,fbm(vec2(x*16.0, y*1.0+sp*1.3))); float st2=smoothstep(0.64,0.8,fbm(vec2(x*34.0+3.0, y*0.7+sp*1.7)));
    float side=mix(mix(1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5)), 1.0-smoothstep(0.36,0.5,abs(vP.z)+0.08*(n-0.5)), ef), 1.0, rnd);
    vec3 c=mix(vec3(0.05,0.2,0.62),col,0.5+0.5*n); c=mix(c,vec3(0.72,0.88,1.0),st*0.7); c=mix(c,col2,st2*0.85);
    float foot=1.0-smoothstep(0.0,0.1,y+0.06*(n-0.5)); c=mix(c,col2,foot*0.85); float lead=(1.0-smoothstep(u0,u0+0.05,y))*step(0.002,u0); c=mix(c,col2,lead*0.9);
    float sky=1.0-smoothstep(0.62,1.0,y); float a=op*side*sky*(0.65+0.35*max(max(st,st2),foot)); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
FX.waterfall = (A, o) => {
  // o.round: a round fall (Sky Fall), w is its width across
  const m = A.add(new THREE.Mesh(o.round ? cylFallGeo : slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 }, rnd: { value: o.round ? 1 : 0 } }, vertexShader: VS_WALL, fragmentShader: F_FALL, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const W = o.w || 2, rise = o.rise || 0.35, c0 = (t) => P3(A, o.at, o.follow ? t : o.t0), yawAt = (t) => typeof o.yaw === 'function' ? o.yaw(t) : (o.yaw || 0) * D2R;
  const val = (v, t, d) => typeof v === 'function' ? v(t) : (v != null ? v : d), landed = o.t0 + rise, endW = o.cut != null ? o.cut + 0.3 : o.t1;
  A.fx((t) => { const on = t >= o.t0 && t <= o.t1; m.visible = on; if (!on) return; const c = c0(t), a = t - o.t0, Ht = val(o.top, t, 3.4);
    let tip = 0; if (o.tip != null && t > o.tip) tip = EASE.in2(clamp((t - o.tip) / (o.tipDur || 0.4))) * (Math.PI / 2 - 0.05);
    m.position.set(c.x, 0, c.z); m.rotation.set(0, yawAt(t), 0, 'YXZ'); m.rotateX(tip * (o.fallDir || 1)); m.scale.set(W, Math.max(0.01, Ht), o.round ? W : Math.max(0.02, val(o.th, t, 0.2)));
    m.material.uniforms.u0.value = 1 - EASE.in(clamp(a / rise)); m.material.uniforms.u1.value = o.cut != null && t > o.cut ? 1 - EASE.in(clamp((t - o.cut) / 0.3)) : 1;
    m.material.uniforms.op.value = Math.min(1, (o.op || 0.7) * 1.2) * Math.min(1, (o.t1 - t) / 0.15); m.material.uniforms.tm.value = t; });
  // where it lands: a foaming pool along its foot, splashes kicking up, a ring when the first water hits
  FX.pool(A, { t0: landed, t1: Math.min(o.t1, endW) + 0.25, at: (tt) => { const c = c0(tt); return [c.x, 0, c.z]; }, follow: true, r: W * (o.round ? 0.8 : 0.62), sx: 1, sz: o.round ? 1 : 0.42, yaw: (tt) => yawAt(tt), op: 0.3, froth: 1.2, fin: 0.1, fout: 0.25 });
  FX.ring(A, { t: landed, at: (tt) => { const c = c0(landed); return [c.x, 0.02, c.z]; }, r0: 0.2, r1: W * 0.6, dur: 0.4, col: C.foam, op: 0.6, w: 0.15 });
  for (let ts = landed; ts < Math.min(o.t1, endW); ts += 0.09) FX.drops(A, { t: ts, at: (tt) => { const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; if (o.round) { const an = ts * 23.7; return [c.x + Math.cos(an) * W * 0.5, 0.06, c.z + Math.sin(an) * W * 0.5]; } return [c.x + Math.cos(y) * u * W * 0.9, 0.06, c.z - Math.sin(y) * u * W * 0.9]; }, n: 3, sp: 0.45, up: 0.9, size: 0.035, dur: 0.4, seed: Math.floor(ts * 100) });
  // bubbles tumbling down in it (Bubble's soap-film fall)
  if (o.bub) for (let ts = o.t0 + 0.2; ts < Math.min(o.t1, endW) - 0.5; ts += 0.22) { const u = (((ts * 5.7) % 1) - 0.5) * 0.85; FX.bubble(A, { t0: ts, t1: ts + 0.75, r: 0.06, at: (tt) => { const c = c0(tt), y = yawAt(tt), k = clamp((tt - ts) / 0.75); return [c.x + Math.cos(y) * u * W, val(o.top, tt, 3.4) * 0.55 * (1 - k * k), c.z - Math.sin(y) * u * W]; } }); }
};
// a dome of water round a point: its skin moves like the sea seen from below
FX.dome = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, 6.283, 0, Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_SKIN, fragmentShader: F_SKIN, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = P3(A, o.at, o.follow ? t : o.t0); m.position.set(c.x, 0, c.z); let fl = 0; for (const h of o.hits || []) { const b = t - h; if (b >= 0 && b < 0.3) fl = Math.max(fl, 1 - b / 0.3); }
    const fall = o.fall != null && t > o.fall ? EASE.in2(clamp((t - o.fall) / 0.3)) : 0; const s = (o.r || 2) * EASE.out(clamp(a / (o.grow || 0.35))) * (1 + 0.03 * fl * Math.sin(a * 50)); m.scale.set(s * (1 + fall * 0.15), s * (o.flat || 0.75) * (1 - fall), s * (1 + fall * 0.15));
    m.material.uniforms.op.value = Math.min(1, ((o.op || 0.5) * 1.7 + 0.4 * fl)) * Math.min(1, (o.t1 - t) / 0.25); m.material.uniforms.tm.value = t; });
  FX.ring(A, { t: o.t0, at: o.at, r0: 0.2, r1: o.r || 2, dur: o.grow || 0.35, col: C.sky, op: 0.6, w: 0.05, e: 'out' });
};
const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); const R = rng(41);
  for (let k = 0; k < 18; k++) { const cx = 30 + R() * 196, cy = 42 + R() * 22 - (Math.abs(k - 9) < 4 ? 10 : 0), r = 14 + R() * 20; const g = x.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.1, cx, cy, r); g.addColorStop(0, 'rgba(235,242,250,0.95)'); g.addColorStop(0.55, 'rgba(170,185,205,0.85)'); g.addColorStop(1, 'rgba(110,125,150,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill(); }
  return new THREE.CanvasTexture(c); })();
// rain: a low cloud, streaks falling in a disc, ripple rings where they land
FX.rain = (A, o) => { const R = rng(o.seed || 17); const N = Math.round((o.n || 40) * 1.8), rr = o.r || 1.5, h = o.h || 2.2;
  const cl = []; for (let k = 0; k < 3; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: k % 3 ? '#6E7A8C' : '#8E99AA', transparent: true, depthWrite: false, opacity: 0 })); A.add(s); cl.push({ s, a: k * 2.1 + R(), r: rr * (k ? 0.35 : 0.05), sz: rr * (k ? 0.9 : 1.2) }); }
  const st = []; for (let k = 0; k < N; k++) { const m = A.add(new THREE.Mesh(streakGeo, fxMat(C.sky, F_STREAK))); m.visible = false; st.push({ m, a: R() * 6.283, r: Math.sqrt(R()) * rr, ph: R(), sp: 0.35 + 0.15 * R() }); }
  A.fx((t) => { const k = live(t, o.t0, o.t1, 0.3, 0.4), c = P3(A, o.at, o.follow ? t : o.t0); const sx = o.sx || 1, yaw = o.yaw ? o.yaw(t) : 0;
    const P = (a, r) => { const lx = Math.cos(a) * r * sx, lz = Math.sin(a) * r; return [c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]; };
    cl.forEach((q, i) => { q.s.visible = k > 0; if (!k) return; const p = P(q.a + t * 0.05, q.r); q.s.position.set(p[0], h + 0.15 * (i % 3) + 0.1 * Math.sin(t + i), p[1]); q.s.scale.set(q.sz * 1.3, q.sz * 0.3, 1); q.s.material.opacity = 0.45 * k; });
    st.forEach((q) => { const on = k > 0; q.m.visible = on; if (!on) return; const u = ((t - o.t0) / q.sp + q.ph) % 1, p = P(q.a, q.r); q.m.position.set(p[0], h * (1 - u), p[1]); q.m.quaternion.setFromUnitVectors(ZF, new THREE.Vector3(0.05, -1, 0)); q.m.scale.set(0.012, 0.012, 1.35); q.m.material.uniforms.op.value = 0.9 * k; }); });
  const nr = Math.floor((o.t1 - o.t0) * 10); for (let i = 0; i < nr; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * rr; FX.ring(A, { t: o.t0 + 0.25 + i / 10, at: (tt) => { const c = P3(A, o.at, o.follow ? tt : o.t0); const yaw = o.yaw ? o.yaw(tt) : 0, lx = Math.cos(a) * r * (o.sx || 1), lz = Math.sin(a) * r; return [c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), 0.02, c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]; }, r0: 0.02, r1: 0.12, dur: 0.5, col: C.foam, op: 0.6, w: 0.3 }); FX.drops(A, { t: o.t0 + 0.25 + i / 10, at: (tt) => { const c = P3(A, o.at, o.follow ? tt : o.t0); const yaw = o.yaw ? o.yaw(tt) : 0, lx = Math.cos(a) * r * (o.sx || 1), lz = Math.sin(a) * r; return [c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), 0.03, c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]; }, n: 3, sp: 0.25, up: 0.6, size: 0.025, dur: 0.3, col: C.foam }); }
  if (o.wet !== false) FX.pool(A, { t0: o.t0 + 0.2, t1: o.t1 + 0.3, at: o.at, follow: o.follow, r: rr, sx: o.sx || 1, yaw: o.yaw, op: 0.3, col: '#5A9AF2', grow: true });
};
// a flat disc of water that skims and skips (Skipping Stone)
FX.stone = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 18), new THREE.MeshLambertMaterial({ color: C.sky, emissive: C.deep, transparent: true, opacity: 0.9 }))); m.visible = false;
  // o.pts: [[x, z], ...] landing spots; o.t, o.per (time per hop), o.from (start point)
  const hops = []; let prev = P3(A, o.from || 'tip', o.t); o.pts.forEach((p, i) => { hops.push({ a: prev.clone(), b: new THREE.Vector3(p[0], 0.06, p[1]), t0: o.t + i * (o.per || 0.18), t1: o.t + (i + 1) * (o.per || 0.18), h: (o.hop || 0.35) * (i === 0 ? 0.6 : 1) * (o.grow ? (1 + i * 0.15) : 1) }); prev = new THREE.Vector3(p[0], 0.06, p[1]); });
  const pos = (t) => { for (const h of hops) if (t >= h.t0 && t <= h.t1) { const u = (t - h.t0) / (h.t1 - h.t0); const p = h.a.clone().lerp(h.b, u); p.y = lerp(h.a.y, h.b.y, u) + h.h * 4 * u * (1 - u); return p; } return hops[hops.length - 1].b.clone(); };
  A.fx((t) => { const end = hops[hops.length - 1].t1; m.visible = t >= o.t && t <= end; if (!m.visible) return; m.position.copy(pos(t)); m.rotation.set(0.15 * Math.sin(t * 30), t * 25, 0); });
  FX.trail(A, { of: pos, t0: o.t, t1: hops[hops.length - 1].t1, len: 0.1, w: 0.1, col: C.foam, op: 0.5 });
  hops.forEach((h, i) => { FX.splash(A, { t: h.t1, at: [h.b.x, 0, h.b.z], r: i === hops.length - 1 ? 0.55 : 0.35, h: i === hops.length - 1 ? 0.7 : 0.45, n: 6 }); });
  return { hops, pos };
};
// a water whale (Whale breach): a long body of water rising nose first, hanging, falling flat
FX.whale = (A, o) => { const g = A.add(new THREE.Group()); const mat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.85 }, u0: { value: 0.15 } }, vertexShader: VS_BUB, fragmentShader: F_BUB, transparent: true, depthWrite: false });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); body.scale.set(0.55, 0.5, 1.5); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), mat); tail.rotation.x = -Math.PI / 2; tail.position.z = -1.7; tail.scale.set(1, 1, 0.4); g.add(tail);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.35), mat); fl.position.z = -2.1; g.add(fl);
  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.22), mat); finL.position.set(0.55, -0.15, 0.4); finL.rotation.z = -0.4; g.add(finL); const finR = finL.clone(); finR.position.x = -0.55; finR.rotation.z = 0.4; g.add(finR);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: C.foam })); eye.position.set(0.42, 0.12, 0.9); g.add(eye); const eye2 = eye.clone(); eye2.position.x = -0.42; g.add(eye2);
  g.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 1.6; g.visible = a >= 0 && a <= d; if (!g.visible) return; const c = P3(A, o.at, o.t), u = a / d; const rise = clamp(u / 0.35), fall = clamp((u - 0.55) / 0.3);
    const y = -1.4 + 3.2 * EASE.out(rise) - 2.2 * EASE.in2(fall), pitch = -1.25 + 0.9 * rise + 1.5 * EASE.in2(fall); g.position.set(c.x, y + 0.4, c.z); g.rotation.set(pitch, (o.yaw || 0) * D2R, 0.15 * Math.sin(a * 4)); g.scale.setScalar(o.s || 0.8); mat.uniforms.op.value = 0.85 * Math.min(1, a / 0.1, (d - a) / 0.15); });
};
// a rope of water from a point to another, with a pulse running along it (the Tow's rope, the Relay)
FX.rope = (A, o) => FX.stream(A, Object.assign({ core: false, helix: true, halo: false, wob: 0.12, spray: false, head: 0.15, tail: 0.15, tw: 0.9 }, o, { w: (o.w || 0.09) * 1.2 }));
// a turning ring over a foe (Homing's tag)
FX.mark = (A, o) => { const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.foam, F_RING))); m.visible = false;
  A.fx((t) => { const k = live(t, o.t0, o.t1); m.visible = k > 0; if (!m.visible) return; const p = P3(A, o.at, t); m.position.copy(p); m.rotation.set(0.5 * Math.sin(t * 3), t * 4, 0.3); m.scale.setScalar(o.r || 0.35); m.material.uniforms.u0.value = 0.15; m.material.uniforms.op.value = 0.85 * k; }); };
// the staff standing on its own (the Planted staff), at a spot, upright
FX.standStaff = (A, o) => { const src = him.main.staff; const m = A.add(new THREE.Mesh(src.geometry, src.material.clone())); m.scale.setScalar(S * 0.9); m.visible = false;
  A.fx((t) => { m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = P3(A, o.at, t); const hop = o.hop ? o.hop(t) : 0; m.position.set(c.x, (o.sink != null ? -o.sink : -0.08) + hop, c.z); m.rotation.set(o.tilt ? o.tilt(t) : 0.05 * Math.sin(t * 30) * (o.hum ? 1 : 0), (o.yaw || 0) * D2R, 0, 'YXZ'); }); };

// a flat fan of spray (Spray): a sector that sweeps open from her, streaks running out, drops at its rim
FX.fan = (A, o) => { const arc = (o.arc || 100) * D2R, N = 24; const g = new THREE.BufferGeometry(); const P = [], U = [], I = [];
  for (let i = 0; i <= N; i++) { const a = -arc / 2 + arc * i / N; P.push(0, 0, 0, Math.sin(a), 0, Math.cos(a)); U.push(i / N, 0, i / N, 1); if (i < N) { const b = i * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.sky, `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec2 vUv; void main(){ float r=vUv.y; float st=step(0.6,fract(vUv.x*14.0+sin(vUv.x*40.0)*0.2)); float front=smoothstep(u0-0.25,u0,r)*(1.0-smoothstep(u0,u0+0.03,r)); float a=op*(0.25+0.5*front+0.25*st*r)*smoothstep(0.0,0.15,r)*(1.0-smoothstep(u0,u0+0.03,r)); vec3 c=mix(col,col2,front*0.8+st*0.3); if(o_rb>0.5){ c=mix(c,vec3(0.95,0.7+0.25*vUv.x,1.0-0.5*vUv.x),front*0.25); } gl_FragColor=vec4(c,a); }`.replace('o_rb', o.rainbow ? '1.0' : '0.0'), { col2: C.foam }))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3, out = o.out || 0.25; m.visible = a >= 0 && a <= d + out; if (!m.visible) return; const c = P3(A, o.at || 'him', o.t); m.position.set(c.x, o.y != null ? o.y : 0.3, c.z); m.rotation.set(o.tilt || 0, typeof o.yaw === 'function' ? o.yaw(t) : (o.yaw || 0) * D2R, 0, 'YXZ');
    m.scale.setScalar(o.r || 3); m.material.uniforms.u0.value = EASE.out(clamp(a / d)); m.material.uniforms.op.value = (o.op || 0.7) * (a > d ? 1 - (a - d) / out : 1); });
  for (let i = 0; i < 7; i++) { const an = -arc / 2 + arc * (i + 0.5) / 7; FX.drops(A, { t: o.t + (o.dur || 0.3) * 0.8, at: (tt) => { const c = P3(A, o.at || 'him', o.t), y = (typeof o.yaw === 'function' ? o.yaw(o.t) : (o.yaw || 0) * D2R) + an; return [c.x + Math.sin(y) * (o.r || 3), 0.25, c.z + Math.cos(y) * (o.r || 3)]; }, n: 3, sp: 0.5, up: 0.5, size: 0.04, dur: 0.4, seed: i * 11 + 5 }); }
};
// the pointer (the player's aim): a small crossed ring on the floor
FX.pointer = (A, o) => { const m = A.add(new THREE.Mesh(ringGeo, fxMat(C.parch, F_RING))); m.visible = false; const x1 = A.add(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.03), new THREE.MeshBasicMaterial({ color: C.parch, transparent: true, opacity: 0.8, depthWrite: false }))); const x2 = x1.clone(); A.add(x2); x1.rotation.x = x2.rotation.x = -Math.PI / 2; x2.rotation.z = Math.PI / 2; x1.visible = x2.visible = false;
  A.fx((t) => { const on = t >= o.t0 && t <= o.t1; m.visible = x1.visible = x2.visible = on; if (!on) return; const p = P3(A, o.at, t); m.position.set(p.x, 0.03, p.z); x1.position.set(p.x, 0.031, p.z); x2.position.copy(x1.position); m.scale.setScalar(0.17 + 0.015 * Math.sin(t * 8)); m.material.uniforms.u0.value = 0.25; m.material.uniforms.op.value = 0.85; }); };

// a wake on the floor: the path a moving point left (a ride, a swim), drawn as a flat strip that dries behind
FX.wake = (A, o) => { const N = 64; const g = new THREE.BufferGeometry(); const P = new Float32Array(N * 2 * 3), U = new Float32Array(N * 2 * 2), I = [];
  for (let i = 0; i < N; i++) { U[i * 4] = i / (N - 1); U[i * 4 + 1] = 0; U[i * 4 + 2] = i / (N - 1); U[i * 4 + 3] = 1; if (i < N - 1) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_WET, { col2: C.foam }))); m.frustumCulled = false; m.visible = false; m.renderOrder = -1;
  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), life = o.life || 2;
  A.fx((t) => { const end = o.t1 + life; m.visible = t >= o.t0 && t <= end; if (!m.visible) return; const te = Math.min(t, o.t1);
    for (let i = 0; i < N; i++) { const tt = lerp(o.t0, te, i / (N - 1)); const p = V3(src(tt)), q = V3(src(Math.min(te, tt + 0.02))); const d = q.clone().sub(p); d.y = 0; if (d.lengthSq() < 1e-8) d.set(1, 0, 0); d.normalize(); const sx = -d.z, sz = d.x, w = (o.w || 0.6) * (o.taper ? 0.4 + 0.6 * (i / (N - 1)) : 1) / 2;
      P[i * 6] = p.x + sx * w; P[i * 6 + 1] = o.y || 0.01; P[i * 6 + 2] = p.z + sz * w; P[i * 6 + 3] = p.x - sx * w; P[i * 6 + 4] = o.y || 0.01; P[i * 6 + 5] = p.z - sz * w; }
    g.attributes.position.needsUpdate = true; let L = 0; for (let i = 1; i < N; i++) L += Math.hypot(P[i * 6] - P[i * 6 - 6], P[i * 6 + 2] - P[i * 6 - 4]); m.material.uniforms.ln.value = Math.max(0.2, L / (o.w || 0.6)); m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.4) * 1.6) * (t > o.t1 ? 1 - (t - o.t1) / life : 1); m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; m.material.uniforms.tm.value = t; });
};
FX.cap = (A, o) => A.cap(o.t0, o.t1, o.zh, o.en);
FX.shake = (A, o) => A.shake(o.t, o.a, o.dur);
FX.hit = (A, o) => A.hit(o.d, o.t, o.n, o);

// ---------------------------------------------------------------- the page loop
const cards = []; let speed = 1, lang = 'zh', last = 0;
export function setSpeed(s) { speed = s; }
export function setLang(l) { lang = l; }
export function addCard(def, canvas) { const c = new Card(def, canvas); cards.push(c); return c; }
export function stepCard(c, t) { if (!c.built) c.build(); c.t = t; if (renderer.domElement.width !== c.cv.width || renderer.domElement.height !== c.cv.height) renderer.setSize(c.cv.width, c.cv.height, false); c.draw(t, lang); }
export function start() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { const c = cards.find((k) => k.cv === e.target); if (c) c.visible = e.isIntersecting; }), { rootMargin: '120px' });
  cards.forEach((c) => io.observe(c.cv));
  const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (!him.ready) return;
    for (const c of cards) { if (!c.visible) continue; if (!c.built) c.build(); if (renderer.domElement.width !== c.cv.width || renderer.domElement.height !== c.cv.height) renderer.setSize(c.cv.width, c.cv.height, false);
      if (!c.paused) c.t = (c.t + dt * speed * (c.def.rate || 1)) % c.T; c.draw(c.t, lang); } };
  requestAnimationFrame(loop);
}
export { renderer, scene, cam, him, S };
// knee audit (tools only): her pose at time t of a card, and how far the knees bent
export function kneeProbe(card, t) { if (!card.built) card.build(); placeHim(card, t); const k = him.main.knees.stats; return { bend: k.bend, lift: k.lift }; }
