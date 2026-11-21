// Duskwing ability review page: one live three.js stage drawn into every visible card.
// Every clip is a pure function of its own time t, so cards loop, pause and slow down freely.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RCLIPS } from './poses.js';

export const C = { blood: '#A5121F', core: '#5C0912', rim: '#F6ECEE', rose: '#E0509E', moon: '#F2D9E6', plum: '#55304F', leather: '#7A4E66', ink: '#140B12',
  heal: '#5FE873', parch: '#F4EFE6', stun: '#F2E3A0', slow: '#7FB8F0', floorA: '#6A665F', floorB: '#625E58', line: '#4E4B46', bg: '#34322E',
  canvas: '#8F887B', wood: '#4A3B2C', rope: '#8C8472', shield: '#C9A6D8', ally: '#6F93B8' };
const S = 1.2;              // model units to world units: he stands about 1.2 u to the ear tips
const PIV = 0.36 * S;       // his middle: flips, rolls and spins turn about it
const G = 22;               // gravity for launched dummies, u/s²
const HEALGLOW = new THREE.Color('#D9465E');
const BACKGLOW = new THREE.Color(C.rose); // a foe glows faintly when he stands at its back // the warm pulse in him when a heal lands
const D2R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const EASE = { s: sm, lin: (x) => clamp(x), in: (x) => { x = clamp(x); return x * x * x; }, out: (x) => { x = 1 - clamp(x); return 1 - x * x * x; },
  in2: (x) => { x = clamp(x); return x * x; }, out2: (x) => { x = 1 - clamp(x); return 1 - x * x; }, io2: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } };
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

// ---------------------------------------------------------------- him: one rig drawn as himself, more as after-images and shades
const BONES = ['root', 'hips', 'spine', 'chest', 'head', 'earL', 'earR', 'legL', 'footL', 'legR', 'footR', 'upperarmR', 'forearmR', 'handR', 'fingersR', 'upperarmL', 'forearmL', 'handL', 'fingersL'];
const LAGB = ['earL', 'earR', 'fingersL', 'fingersR'];
const him = { ready: false, clips: {}, rest: {} };
class Rig {
  constructor(model, ghost) {
    this.model = model; model.scale.setScalar(S);
    this.root = new THREE.Group(); this.lift = new THREE.Group(); this.piv = new THREE.Group();
    this.root.add(this.lift); this.lift.add(this.piv); this.piv.add(model); this.piv.position.y = -PIV; this.lift.position.y = PIV;
    scene.add(this.root); this.sh = blob(0.36); scene.add(this.sh);
    this.b = {}; for (const n of BONES) this.b[n] = model.getObjectByName(n);
    const wpn = model.getObjectByName('weapon'); if (wpn) wpn.visible = false;
    this.mats = [];
    model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); o.material.roughness = 0.85; o.material.metalness = 0; this.mats.push(o.material); } } });
    this.base = this.mats.map((m) => m.color.clone());
    if (ghost) { this.mats.forEach((m) => { m.transparent = true; m.depthWrite = false; m.emissive = new THREE.Color(C.rose); }); }
    this.root.visible = !ghost;
  }
  look(op, tint, emis) { // op 1: solid, his own colours; less: see-through; tint: multiply colour; emis: glow
    this.mats.forEach((m, i) => { const solid = op >= 0.999; m.transparent = !solid; m.opacity = op; m.depthWrite = solid; m.color.copy(this.base[i]); if (tint) m.color.multiply(tint);
      if (emis) { m.emissive.copy(emis.c); m.emissiveIntensity = emis.k; } else m.emissiveIntensity = 0; });
  }
}
const ghosts = [];
export async function loadHim(src) {
  const gl = typeof src === 'string' ? await new GLTFLoader().loadAsync(src) : await new GLTFLoader().parseAsync(src, './');
  const main = new Rig(gl.scene, false); him.main = main;
  for (const n of BONES) { const b = main.b[n]; him.rest[n] = b.position.clone(); }
  for (let k = 0; k < 6; k++) ghosts.push(new Rig(SkeletonUtils.clone(gl.scene), true));
  for (const c of gl.animations) {
    const tr = c.tracks.map((tk) => { const [node, prop] = tk.name.split('.'); return { node, prop, it: tk.createInterpolant() }; }).filter((x) => BONES.includes(x.node));
    him.clips[c.name] = { T: c.duration, baked: tr };
  }
  for (const [n, c] of Object.entries(RCLIPS)) him.clips[n] = c;
  him.ready = true; return him;
}
// ---- poses: a map bone -> { q, p }
const tmpE = new THREE.Euler(), qI = new THREE.Quaternion();
const newPose = () => { const o = {}; for (const n of BONES) o[n] = { q: new THREE.Quaternion(), p: him.rest[n].clone() }; return o; };
const POOL = []; let poolI = 0; const takePose = () => { if (poolI >= POOL.length) POOL.push(newPose()); const p = POOL[poolI++]; for (const n of BONES) { p[n].q.identity(); p[n].p.copy(him.rest[n]); } return p; };
function evalKeys(c, t) { // a runtime clip: Euler degree deltas per bone, eased between keys, plus an additive fn
  const K = c.keys, out = {}; let a = K[0], b = K[K.length - 1], u = 0;
  if (t <= K[0].t) { a = b = K[0]; } else if (t >= K[K.length - 1].t) { a = b = K[K.length - 1]; } else for (let i = 0; i < K.length - 1; i++) if (t >= K[i].t && t <= K[i + 1].t) { a = K[i]; b = K[i + 1]; u = (t - a.t) / (b.t - a.t || 1); break; }
  const e = EASE[b.ease === 'in' ? 'in2' : b.ease === 'out' ? 'out2' : b.ease === 'lin' ? 'lin' : 's'](u);
  const names = new Set([...Object.keys(a.p), ...Object.keys(b.p)]);
  for (const n of names) { const A = a.p[n] || [0, 0, 0], B = b.p[n] || [0, 0, 0]; out[n] = [lerp(A[0], B[0], e), lerp(A[1], B[1], e), lerp(A[2], B[2], e)]; }
  if (c.fn) { const f = c.fn(t, c.T); for (const n in f) { const A = out[n] || [0, 0, 0], B = f[n]; out[n] = [A[0] + B[0], A[1] + B[1], A[2] + B[2]]; } }
  return out;
}
function sample(name, t) {
  const c = him.clips[name] || him.clips.idle, P = takePose();
  if (c.baked) { for (const k of c.baked) { const v = k.it.evaluate(clamp(t, 0, c.T)); const o = P[k.node]; if (k.prop === 'quaternion') o.q.set(v[0], v[1], v[2], v[3]); else if (k.prop === 'position') o.p.set(v[0], v[1], v[2]); } return P; }
  const tt = c.loop ? ((t % c.T) + c.T) % c.T : clamp(t, 0, c.T);
  const E = evalKeys(c, tt), L = evalKeys(c, c.loop ? (((tt - 0.05) % c.T) + c.T) % c.T : Math.max(0, tt - 0.05));
  for (const n in E) { if (n === '_hips') { P.hips.p.set(him.rest.hips.x + E[n][0], him.rest.hips.y + E[n][1], him.rest.hips.z + E[n][2]); continue; }
    if (!P[n]) continue; const d = LAGB.includes(n) && L[n] ? [lerp(E[n][0], L[n][0], 0.7), lerp(E[n][1], L[n][1], 0.7), lerp(E[n][2], L[n][2], 0.7)] : E[n];
    P[n].q.setFromEuler(tmpE.set(d[0] * D2R, d[1] * D2R, d[2] * D2R, 'XYZ')); }
  for (const n of LAGB) if (!E[n] && L[n]) P[n].q.setFromEuler(tmpE.set(L[n][0] * D2R * 0.7, L[n][1] * D2R * 0.7, L[n][2] * D2R * 0.7, 'XYZ'));
  return P;
}
function blendInto(A, B, w) { for (const n of BONES) { A[n].q.slerp(B[n].q, w); A[n].p.lerp(B[n].p, w); } return A; }
function applyPose(rig, P) { for (const n of BONES) { const b = rig.b[n]; if (!b) continue; b.quaternion.copy(P[n].q); b.position.copy(P[n].p); } }
// his body at time t of a card's sequence: [t, clip, {speed, from, to, loop, until, hold, then, fade}], idle in the gaps, short crossfades
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
// his root: start spot and facing, then keyed travel (fw forward, sd to his right), lift, spin, flip (pitch) and roll; a key with cut: true jumps there at once (a blink)
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
  rig.sh.position.set(r.x, 0.004, r.z); const sc = 1 / (1 + r.y * 0.8); rig.sh.scale.setScalar(sc); rig.sh.material.opacity = sc;
  applyPose(rig, P); rig.root.updateMatrixWorld(true);
}
function placeHim(card, t) { const r = rootAt(card, t); placeRig(him.main, r, seqPose(card.seq, t)); return r; }

// ---------------------------------------------------------------- training dummies
const DG = { post: new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8), body: new THREE.CylinderGeometry(0.24, 0.27, 0.56, 12), head: new THREE.SphereGeometry(0.17, 14, 10), arm: new THREE.CylinderGeometry(0.05, 0.05, 0.86, 8), band: new THREE.CylinderGeometry(0.255, 0.255, 0.05, 12), base: new THREE.CylinderGeometry(0.26, 0.3, 0.06, 12),
  back: new THREE.PlaneGeometry(0.26, 0.3) };
const woodM = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 }), ropeM = new THREE.MeshStandardMaterial({ color: C.rope, roughness: 1 });
const backM = new THREE.MeshStandardMaterial({ color: '#6E675B', roughness: 1 });
function makeDummy(big) {
  const g = new THREE.Group(), tilt = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: C.canvas, roughness: 0.95, emissive: '#FFFFFF', emissiveIntensity: 0 });
  const base = new THREE.Mesh(DG.base, woodM); base.position.y = 0.03; tilt.add(base);
  const post = new THREE.Mesh(DG.post, woodM); post.position.y = 0.25; tilt.add(post);
  const body = new THREE.Mesh(DG.body, cm); body.position.y = 0.72; tilt.add(body);
  for (const y of [0.55, 0.88]) { const b = new THREE.Mesh(DG.band, ropeM); b.position.y = y; tilt.add(b); }
  const arm = new THREE.Mesh(DG.arm, woodM); arm.rotation.z = Math.PI / 2; arm.position.y = 0.84; tilt.add(arm);
  const head = new THREE.Mesh(DG.head, cm); head.position.y = 1.15; tilt.add(head);
  // a patch sewn on its back, so its back reads (backstabs)
  const bm = backM.clone(); bm.emissive = new THREE.Color(C.rose); bm.emissiveIntensity = 0; const bk = new THREE.Mesh(DG.back, bm); bk.position.set(0, 0.74, -0.262); bk.rotation.y = Math.PI; tilt.add(bk);
  const face = new THREE.Group(); face.add(tilt); g.add(face); const s = big ? 1.2 : 0.82; tilt.scale.setScalar(s);
  const sh = blob(0.36 * s / 0.78);
  return { g, face, tilt, cm, bm, sh, s, h: 1.3 * s };
}

// ---------------------------------------------------------------- effect materials
function fxMat(color, frag, extra = {}) {
  return new THREE.ShaderMaterial({ uniforms: Object.assign({ col: { value: new THREE.Color(color) }, op: { value: 1 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, extra.uniforms || {}),
    vertexShader: extra.vs || `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: frag,
    transparent: true, depthWrite: false, depthTest: extra.noDepth ? false : true, side: THREE.DoubleSide, blending: extra.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
}
const F_STREAK = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ float x=abs(vUv.x-0.5)*2.0; float a=pow(vUv.y,1.3)*(1.0-x*x)*op; vec3 c=mix(col,vec3(1.0),0.35*(1.0-x)); gl_FragColor=vec4(c*a, a); }`;
const F_RIB = `uniform vec3 col; uniform float op; uniform float u0; uniform float u1; varying vec2 vUv; void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.08,vUv.x)*(1.0-smoothstep(u1-0.02,u1,vUv.x)); float h=smoothstep(u0,u1,vUv.x); float a=s*(1.0-x*x)*op*(0.35+0.65*h); gl_FragColor=vec4(col*a,a); }`;
const F_RING = `uniform vec3 col; uniform float op; uniform float u0; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float w=max(0.02,u0); float a=smoothstep(1.0-w,1.0-w*0.5,r)*(1.0-smoothstep(0.97,1.0,r))*op; gl_FragColor=vec4(col*a,a); }`;
const F_DISC = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=(1.0-smoothstep(0.2,1.0,r))*op; gl_FragColor=vec4(col*a,a); }`;
const F_DISCN = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=(1.0-smoothstep(0.15,1.0,r))*op; gl_FragColor=vec4(col,a); }`;
const F_FLAT = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ gl_FragColor=vec4(col*op,op); }`;
const F_FLATN = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ gl_FragColor=vec4(col,op); }`;
// a blood thread: a thin line with a bright pulse running along it from v=0 to v=1
const F_THREAD = `uniform vec3 col; uniform float op; uniform float u0; varying vec2 vUv; void main(){ float x=abs(vUv.x-0.5)*2.0; float p=exp(-pow((vUv.y-u0)*9.0,2.0)); float a=(1.0-x*x)*op*(0.55+1.2*p); vec3 c=mix(col,vec3(1.0,0.85,0.9),0.5*p); gl_FragColor=vec4(c*a,a); }`;
// a crescent blade: bright at its leading edge
const F_CRES = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ float e=smoothstep(0.0,0.9,vUv.y); float a=op*e*smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x); vec3 c=mix(col,vec3(1.0,0.92,0.95),0.55*pow(vUv.y,4.0)); gl_FragColor=vec4(c*a,a); }`;
// a dome of dark: thick at its edge, thin in the middle
const F_DOME = `uniform vec3 col; uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f=1.0-abs(dot(normalize(vN),normalize(vV))); float a=op*(0.25+0.75*pow(f,1.6)); gl_FragColor=vec4(col,a); }`;
const VS_DOME = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;

const streakGeo = (() => { const g = new THREE.BufferGeometry(); const P = [], U = [], I = [];
  const quad = (ax) => { const b = P.length / 3; for (const [s, v] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { P.push(ax === 0 ? s * 0.5 : 0, ax === 1 ? s * 0.5 : 0, v); U.push(s < 0 ? 0 : 1, v); } I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); };
  quad(0); quad(1); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; })();
const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
const quadGeo = new THREE.PlaneGeometry(2, 2);

// ---------------------------------------------------------------- the card runtime
export const V3 = (a) => a && a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]);
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ZF = new THREE.Vector3(0, 0, 1);
const TRK = { footL: null, footR: null, handR: [0, -0.02, 0.02], handL: [0, -0.02, 0.02], chest: null, head: null, hips: null,
  mouth: ['head', [0, 0.075, 0.2]], tipL: ['fingersL', [-0.06, -0.155, -0.11]], tipR: ['fingersR', [0.06, -0.155, -0.11]],
  eyeL: ['head', [0.066, 0.1, 0.17]], eyeR: ['head', [-0.066, 0.1, 0.17]], midL: ['handL', [0, -0.12, -0.03]], midR: ['handR', [0, -0.12, -0.03]] };

export class Card {
  constructor(def, canvas) { this.def = def; this.cv = canvas; this.ctx = canvas.getContext('2d'); this.t = 0; this.built = false; this.visible = false; }
  setDef(def) { if (this.grp) scene.remove(this.grp); this.def = def; this.built = false; this.t = 0; }
  build() {
    const d = this.def; this.T = d.T; this.her = d.her || { x: 0, z: 0, face: 90 }; this.seq = d.seq || [];
    // a run of three or more one-sided claw blows takes a rising claw and a backhand in turn, so no flurry is the same blow over and over
    { let ci = 0; const nC = this.seq.filter((e) => e[1] === 'clawR' || e[1] === 'clawL').length;
      if (nC >= 3 && !d.keepClaws) this.seq = this.seq.map((e) => { if (e[1] !== 'clawR' && e[1] !== 'clawL') return e; const s = e[1].slice(-1), v = ci++ % 4; return v === 2 ? [e[0], 'clawUp' + s, e[2]] : v === 3 ? [e[0], 'clawBack' + s, e[2]] : e; }); }
    // root keys: absolute spots (x, z, look) turn into his own frame; every channel filled forward
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
    // his tracks: sampled once at 60 Hz so trails, marks and threads can read where his claws, mouth and wing tips were at any time
    const n = Math.ceil(this.T * 60) + 2; this.trk = {}; for (const k in TRK) this.trk[k] = new Float32Array(n * 3); this.trk.root = new Float32Array(n * 4);
    for (let f = 0; f < n; f++) { const t = f / 60; const r = placeHim(this, Math.min(t, this.T)); const B = him.main.b;
      for (const k in TRK) { const s = TRK[k]; if (!s) B[k].getWorldPosition(tmpV); else if (typeof s[0] === 'number') tmpV.set(s[0], s[1], s[2]).applyMatrix4(B[k].matrixWorld); else tmpV.set(...s[1]).applyMatrix4(B[s[0]].matrixWorld); tmpV.toArray(this.trk[k], f * 3); }
      this.trk.root[f * 4] = r.x; this.trk.root[f * 4 + 1] = r.z; this.trk.root[f * 4 + 2] = r.yaw; this.trk.root[f * 4 + 3] = r.y; }
    this.n = n;
    this.dum = (d.dum || []).map((p, i) => { const m = makeDummy(p[2] && p[2].big); if (p[2] && p[2].ally) m.cm.color.set(C.ally); this.grp.add(m.g); this.grp.add(m.sh); return { i, x: p[0], z: p[1], opt: p[2] || {}, m, hits: [], moves: [], launches: [], turns: [] }; });
    this.fx = []; this.post = []; this.nums = []; this.caps = []; this.shakes = []; this.darks = []; this.ghostK = []; this.hud = [];
    const api = this.api();
    for (const e of (d.ev || [])) (Array.isArray(e) ? e : [e]).forEach((x) => FX[x.k](api, x));
    if (d.fx) d.fx(api);
    for (const dm of this.dum) { dm.moves.sort((a, b) => a.t - b.t); dm.launches.sort((a, b) => a.t - b.t); }
    // hit-stop: a heavy or sure-crit hit holds the whole scene a beat, then it catches up, so the card keeps its length
    let mx = 0, nmx = 0; for (const dm of this.dum) for (const h of dm.hits) if (typeof h.n === 'number') { if (h.n > mx) { mx = h.n; nmx = 1; } else if (h.n === mx) nmx++; } if (nmx > 2) mx = 1e9;
    const hs = []; if (!d.noStop) for (const dm of this.dum) for (const h of dm.hits) if (!h.noStop && (h.big || h.crit || h.fell || (mx >= 12 && h.n === mx))) hs.push({ t: h.t, i: dm.i, hold: h.big ? 0.085 : 0.065, crit: h.crit, big: h.big, dir: h.dir });
    hs.sort((a, b) => a.t - b.t); this.stops = []; for (const s of hs) { const L = this.stops[this.stops.length - 1]; if (L && s.t - L.t < 0.24) { L.also = (L.also || []).concat([s]); continue; } if (s.t < 0.05 || s.t > this.T - 0.3) continue; this.stops.push(s); }
    // page-wide motion detail (pass 2): a shade left where he blinks out, smears behind fast moves, blood and dust on heavy hits
    if (!d.noAuto) {
      const outs = (d.hide || []).map((w) => w[0]).filter((t0) => t0 > 0.02);
      const fastAt = (t) => { const f = Math.floor(t * 60); if (f < 1 || f + 1 >= this.n) return false; const R = this.trk.root; const sp = Math.hypot(R[f * 4] - R[f * 4 - 4], R[f * 4 + 1] - R[f * 4 - 3]) * 60; return sp > 5 && sp < 30; };
      this.ghostK.push((t) => { const out = [];
        for (let oi = 0; oi < outs.length; oi++) { const t0 = outs[oi], life = Math.min(0.3, oi + 1 < outs.length ? Math.max(0.12, outs[oi + 1] - t0) : 0.3); const a = t - t0; if (a < 0 || a > life) continue; const u = a / life; out.push({ at: t0 - 0.017, op: 0.36 * (1 - u) * (1 - u), tint: C.plum, col: C.plum, glow: 0.35 * (1 - u) }); }
        if (!this.vis(t).hide && fastAt(t)) for (const [lag, op] of [[0.035, 0.2], [0.07, 0.11]]) { const tt = t - lag; if (tt > 0 && !this.vis(tt).hide) out.push({ lag, op, glow: 0.3 }); }
        return out; });
      // he lands: a puff of dust; a foe knocked back scuffs the floor; a foe that falls back to the floor thumps
      const RT = this.trk.root; for (let f = 2; f < this.n; f++) { const y0 = RT[f * 4 - 4 + 3], y1 = RT[f * 4 + 3]; if (y0 > 0.08 && y1 <= 0.012 && !this.vis(f / 60).hide) FX.dust(api, { t: f / 60, at: [RT[f * 4], 0.03, RT[f * 4 + 1]], n: 5, sp: 0.7, dur: 0.38, seed: f }); }
      for (const dm of this.dum) { for (const m of dm.moves) { const by = m.by0 || m.by; if (!by || m.dur > 0.7) continue; const L = Math.hypot(by[0], by[1]); if (L < 0.35) continue; FX.dust(api, { t: m.t + 0.03, at: { d: dm.i, y: 0.03 }, dir: [-by[0], -by[1]], n: 5, sp: 0.6, dur: 0.4, seed: Math.floor(m.t * 97) }); }
        dm.launches.forEach((L, k) => { const nx = dm.launches[k + 1]; const y0 = k ? this.dumY(dm, L.t, k) : 0; let tl; if (L.h < 0) tl = L.t + y0 / 9; else { if (L.h < 0.2) return; const v = Math.sqrt(2 * G * L.h); tl = L.t + (v + Math.sqrt(v * v + 2 * G * y0)) / G; } if (nx && nx.t < tl) return; if (tl > this.T - 0.1) return;
          FX.dust(api, { t: tl, at: { d: dm.i, y: 0.03 }, n: 7, sp: 1.0, dur: 0.45, seed: Math.floor(tl * 131) }); FX.ring(api, { t: tl, at: { d: dm.i, y: 0.03 }, r0: 0.2, r1: 0.8, dur: 0.3, col: C.parch, op: 0.35, w: 0.1, normal: true }); }); }
      // a lit Combo (15 and up, the Night Hunt bonus) shows on him: blood-red streaks run off his wing tips while it holds
      { const ch = this.hud.find((f) => f._n); if (ch) { let on = null; const W2 = []; for (let t = 0; t <= this.T + 1e-6; t += 1 / 30) { const lit = (ch._n(t) || 0) >= ch._lit; if (lit && on == null) on = t; if (!lit && on != null) { W2.push([on, t]); on = null; } } if (on != null) W2.push([on, this.T]);
        this.litW = W2; for (const [a0, a1] of W2) for (const tip of ['tipL', 'tipR']) FX.trail(api, { of: tip, t0: a0, t1: a1, len: 0.22, w: 0.05, op: 0.5, col: C.blood }); } }
      // after his last close blow, blood drips off his claw tips while he settles
      { let tl = -1, di = -1; for (const dm of this.dum) for (const h of dm.hits) if (typeof h.n === 'number' && h.t > tl) { tl = h.t; di = dm.i; }
        if (tl > 0 && tl < this.T - 0.5) { const p = this.dumPos(this.dum[di], tl), r = rootAt(this, tl); if (Math.hypot(p.x - r.x, p.z - r.z) < 1.3 && !this.vis(tl + 0.3).hide)
          for (const [hand, dl] of [['handR', 0.22], ['handL', 0.4], ['handR', 0.62]]) FX.drops(api, { t: tl + dl, at: (t) => api.at(hand, t), n: 2, sp: 0.08, up: -0.2, size: 0.03, dur: 0.5, spread: 0.08, seed: Math.floor((tl + dl) * 337) }); } }
      for (const s of this.stops) for (const hh of [s].concat(s.also || [])) { const dm = this.dum[hh.i]; if (!dm) continue;
        FX.drops(api, { t: hh.t, at: { d: hh.i, y: 0.7 * dm.m.s / 0.82 }, n: hh.big ? 9 : 6, sp: 1.3, up: 0.9, size: 0.045, dur: 0.55 });
        if (hh.big) FX.dust(api, { t: hh.t, at: { d: hh.i, y: 0.03 }, n: 6, sp: 1.1, dur: 0.45, seed: Math.floor(hh.t * 131) });
        // the blood lands on the floor past it, away from the blow, and stays a while
        { const p = this.dumPos(dm, hh.t), r = rootAt(this, hh.t); let dx = hh.dir ? hh.dir[0] : p.x - r.x, dz = hh.dir ? hh.dir[1] : p.z - r.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const R = rng(Math.floor(hh.t * 613) + hh.i);
          for (let j = 0; j < 3; j++) { const dd = 0.3 + 0.35 * j + 0.15 * R(), sd = (R() - 0.5) * 0.35; FX.disc(api, { t: hh.t + 0.12 + 0.05 * j, at: [p.x + dx * dd - dz * sd, 0, p.z + dz * dd + dx * sd], y: 0.012 + 0.001 * j, r0: 0.04, r1: (0.16 - 0.035 * j) * (hh.big ? 1.25 : 1), hold: true, dur: 1.7, col: C.core, op: 0.62, normal: true }); } } }
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
      dpt(i, t, y = 0.6) { const p = self.dumPos(self.dum[i], t); return new THREE.Vector3(p.x, p.y + y, p.z); },
      hit(i, t, n, o = {}) { const dm = self.dum[i]; if (!dm) return; dm.hits.push({ t, n, dir: o.dir || null, big: !!o.big, crit: !!o.crit, fell: !!o.fell, noStop: !!o.noStop });
        if (n != null) self.nums.push({ t, i, n, big: o.big || o.crit, crit: !!o.crit, col: o.col });
        if (o.knock) this.move(i, t, o.knock, o.kdur || 0.28, o.ke || 'out');
        if (o.up) this.launch(i, t, o.up); if (o.stun) this.status(i, t, 'stun', o.stun); if (o.slow) this.status(i, t, 'slow', o.slow);
        if (o.blind) this.status(i, t, 'blind', o.blind); if (o.bleed) this.status(i, t, 'bleed', o.bleed);
        if (o.fell) FX.fell(this, { d: i, t: t + 0.05 }); },
      heal(t, n, o = {}) { self.nums.push({ t, me: true, n: '+' + n, col: o.col || C.heal, big: o.big }); },
      say(t, s, o = {}) { self.nums.push({ t, me: true, n: s, col: o.col || C.moon, small: true }); },
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
      dark(t0, t1, a = 0.75, fin = 0.25, fout = 0.3, o = {}) { self.darks.push({ t0, t1, a, fin, fout, eyes: o.eyes !== false }); },
      hud(fn) { self.hud.push(fn); },
      ghost(fn) { self.ghostK.push(fn); },
      mat: fxMat, F: { STREAK: F_STREAK, RIB: F_RIB, RING: F_RING, DISC: F_DISC, DISCN: F_DISCN, FLAT: F_FLAT, FLATN: F_FLATN, THREAD: F_THREAD, CRES: F_CRES }, C, THREE, streakGeo, ringGeo, quadGeo, EASE, sm, clamp, lerp, rng, cam,
    };
  }
  dumPos(dm, t) {
    let x = dm.x, z = dm.z;
    for (const m of dm.moves) { if (t <= m.t) break; if (m.to && !m.by0) { const p = this.dumPosXZ(dm, m.t, m); m.by0 = [m.to[0] - p[0], m.to[1] - p[1]]; } const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; }
    let y = 0, spin = 0;
    for (let k = 0; k < dm.launches.length; k++) { const L = dm.launches[k]; if (t < L.t) break; const y0 = k ? this.dumY(dm, L.t, k) : 0; const v = Math.sqrt(2 * G * Math.max(0.001, L.h)); const tau = t - L.t; const yy = L.h < 0 ? y0 - 9 * tau : y0 + v * tau - 0.5 * G * tau * tau; const nx = dm.launches[k + 1]; if (!nx || t < nx.t) { y = Math.max(0, yy); spin = yy > 0 ? tau * 7 : 0; } }
    let face = dm.opt.face != null ? dm.opt.face : -90; for (const r of dm.turns) if (t > r.t) face += r.deg * EASE.s((t - r.t) / r.dur);
    return { x, z, y, spin, face };
  }
  dumPosXZ(dm, t, upto) { let x = dm.x, z = dm.z; for (const m of dm.moves) { if (m === upto || t <= m.t) break; const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; } return [x, z]; }
  dumY(dm, t, k) { let y = 0; for (let j = 0; j < k; j++) { const L = dm.launches[j]; const y0 = j ? this.dumY(dm, L.t, j) : 0; const v = Math.sqrt(2 * G * Math.max(0.001, L.h)), tau = t - L.t; y = L.h < 0 ? Math.max(0, y0 - 9 * tau) : Math.max(0, y0 + v * tau - 0.5 * G * tau * tau); } return y; }
  vis(t) { // hidden (a blink), see-through (Unseen), or solid
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
    if (v.ghost > 0) M.look(1 - 0.72 * v.ghost, new THREE.Color().setRGB(1 - 0.55 * v.ghost, 1 - 0.6 * v.ghost, 1 - 0.5 * v.ghost), { c: new THREE.Color(C.plum), k: 0.5 * v.ghost }); else { // blood drunk: a warm pulse runs through him as a heal lands
      let hg = 0; for (const nm of this.nums) if (nm.me) { const a = t0 - nm.t; if (a >= 0 && a < 0.35) hg = Math.max(hg, a < 0.05 ? a / 0.05 : 1 - (a - 0.05) / 0.3); } const lit = (this.litW || []).some((w) => t >= w[0] && t < w[1]); if (hg > 0) M.look(1, null, { c: HEALGLOW, k: 0.32 * hg }); else if (lit && !v.hide) M.look(1, null, { c: HEALGLOW, k: 0.07 + 0.04 * Math.sin(t * 9) }); else M.look(1); }
    if (v.ghost > 0) M.sh.material.opacity *= 1 - 0.7 * v.ghost;
    // after-images and shades
    let gi = 0; for (const fn of this.ghostK) { const specs = fn(t) || []; for (const s of specs) { if (gi >= ghosts.length) break; const g = ghosts[gi++]; const tt = clamp(s.at != null ? s.at : t - (s.lag || 0), 0, this.T);
        poolI = 0; const P = s.clip ? sample(s.clip, s.ct || 0) : seqPose(this.seq, tt); const rr = s.root || rootAt(this, tt); placeRig(g, rr, P); g.root.visible = true; g.sh.visible = !!s.shadow;
        g.look(s.op != null ? s.op : 0.35, new THREE.Color(s.tint || C.plum), { c: new THREE.Color(s.col || C.rose), k: s.glow != null ? s.glow : 0.6 }); } }
    for (let k = gi; k < ghosts.length; k++) { ghosts[k].root.visible = false; ghosts[k].sh.visible = false; }
    for (const dm of this.dum) {
      const p = this.dumPos(dm, t); dm.m.g.position.set(p.x, p.y, p.z); dm.m.face.rotation.y = (p.face + 90) * D2R; dm.m.sh.position.set(p.x, 0.004, p.z); const sc = 1 / (1 + p.y); dm.m.sh.scale.setScalar(sc);
      let fl = 0, rx = 0, rz = 0;
      for (const h of dm.hits) { const a = t - h.t; if (a < 0 || a > 0.6) continue; fl = Math.max(fl, 1 - a / 0.14); let dx = h.dir ? h.dir[0] : p.x - r.x, dz = h.dir ? h.dir[1] : p.z - r.z; const l = Math.hypot(dx, dz) || 1; const amp = (h.big ? 0.4 : 0.26) * Math.exp(-a * 7) * Math.cos(a * 22); rx += (dz / l) * amp; rz += (-dx / l) * amp; }
      let q = 0, hf = 0; for (const h of dm.hits) { const a = t0 - h.t; if (a < 0 || a > 0.5) continue; const hv = h.big || h.crit; q += (hv ? 0.2 : 0.11) * Math.exp(-a * 14) * Math.cos(a * 30); if (hv && a < 0.09) hf = 1; }
      // a backstab spot: a foe is taken to face where he started the card; when he stands at its back it glows Dusk Rose
      let kb = 0; { const h0 = this.her, fx0 = h0.x - p.x, fz0 = h0.z - p.z, l0 = Math.hypot(fx0, fz0) || 1, vx = r.x - p.x, vz = r.z - p.z, l = Math.hypot(vx, vz) || 1, dt = (vx * fx0 + vz * fz0) / (l * l0);
        kb = v.hide || dm.opt.ally || dm.fellT != null && t > dm.fellT || l0 < 0.3 ? 0 : clamp((-dt - 0.35) / 0.4) * clamp((1.45 - l) / 0.35); }
      const s0 = dm.m.s; dm.m.tilt.scale.set(s0 * (1 + q * 0.7), s0 * (1 - q), s0 * (1 + q * 0.7));
      const fw = Math.max(0.09 * Math.max(0, fl), hf * 0.13), bg = kb * (0.11 + 0.04 * Math.sin(t * 14)); if (bg > fw) { dm.m.cm.emissive.copy(BACKGLOW); dm.m.cm.emissiveIntensity = bg; } else { dm.m.cm.emissive.setRGB(1, 1, 1); dm.m.cm.emissiveIntensity = fw; }
      if (dm.fellT != null && t > dm.fellT) { const a = t - dm.fellT; dm.m.g.visible = a < 0.9; rx += -1.4 * EASE.out(a / 0.35); dm.m.g.position.y -= Math.max(0, a - 0.35) * 1.2; dm.m.sh.visible = a < 0.9; } else { dm.m.g.visible = true; dm.m.sh.visible = true; }
      if (dm.opt.hideAt != null && t < dm.opt.hideAt[0] || dm.opt.hideAt && t > dm.opt.hideAt[1]) { dm.m.g.visible = false; dm.m.sh.visible = false; }
      dm.m.tilt.parent.parent.rotation.set(rx + (p.y > 0 ? Math.sin(p.spin) * 0.9 : 0), 0, rz); dm.m.tilt.rotation.set(0, p.spin * 0.6, 0);
    }
    // camera: the game's view angle (52° down), framed on the card's spot; a small shake on heavy hits
    const cm = globalThis.__closeCam ? { x: r.x, z: r.z, w: globalThis.__closeCam } : (typeof this.def.cam === 'function' ? this.def.cam(t) : (this.def.cam || { x: 0, z: 0, w: 9 })); let pu = 0; for (const s of this.stops || []) { const a = t0 - s.t; if (a >= 0 && a < 0.28) pu = Math.max(pu, (s.big ? 1 : 0.7) * (a < 0.04 ? a / 0.04 : 1 - EASE.s((a - 0.04) / 0.24))); } const w = cm.w * (1 - 0.045 * pu), el = (cm.el || 52) * D2R, fov = 30; cam.fov = fov; cam.aspect = this.cv.width / this.cv.height; cam.updateProjectionMatrix();
    const dist = (w / cam.aspect) / (2 * Math.tan(fov * D2R / 2)) * 1.0 / Math.sin(el) * 0.92;
    let sx = 0, sz = 0; for (const s of this.shakes) { const a = t0 - s.t; if (a >= 0 && a < s.dur) { const k = s.a * (1 - a / s.dur); sx += Math.sin(a * 90) * k; sz += Math.cos(a * 77) * k; } }
    const fx0 = cm.x + sx, fz0 = (cm.z || 0) + sz, ly = cm.y != null ? cm.y : 0.4;
    cam.position.set(fx0, ly + Math.sin(el) * dist, fz0 + Math.cos(el) * dist); cam.lookAt(fx0, ly, fz0); cam.updateMatrixWorld();
    for (const f of this.fx) f(t);
    this.grp.visible = true; renderer.render(scene, cam); this.grp.visible = false;
    const x = this.ctx, W = this.cv.width, H = this.cv.height; x.drawImage(renderer.domElement, 0, 0, W, H);
    const k = W / 640;
    // the dark: the room dims round him; his eyes still show
    let dk = 0, eyes = false; for (const d of this.darks) { if (t < d.t0 || t > d.t1 + d.fout) continue; const a = d.a * Math.min(1, (t - d.t0) / d.fin, t > d.t1 ? 1 - (t - d.t1) / d.fout : 1); if (a > dk) { dk = a; eyes = d.eyes; } }
    if (dk > 0) { x.fillStyle = `rgba(10,5,10,${dk})`; x.fillRect(0, 0, W, H);
      if (eyes && !v.hide) for (const e of ['eyeL', 'eyeR']) { const p = this.apiE || (this.apiE = this.api()); tmpV.copy(p.at(e, t)).project(cam); const ex = (tmpV.x + 1) / 2 * W, ey = (1 - tmpV.y) / 2 * H;
        const g = x.createRadialGradient(ex, ey, 0, ex, ey, 9 * k); g.addColorStop(0, `rgba(255,226,240,${dk})`); g.addColorStop(0.3, `rgba(224,80,158,${0.8 * dk})`); g.addColorStop(1, 'rgba(224,80,158,0)'); x.fillStyle = g; x.beginPath(); x.arc(ex, ey, 9 * k, 0, 6.283); x.fill(); } }
    for (const f of this.post) f(t, x, W, H, k, lang);
    // impact frame: on a held hit, sharp spokes burst from the hit spot for a few frames (blood red core, Dusk Rose rim)
    for (const s of this.stops || []) { const a = t0 - s.t; if (a < 0 || a > 0.13) continue; for (const hh of [s].concat(s.also || [])) { const dm = this.dum[hh.i]; if (!dm) continue; const p = this.dumPos(dm, hh.t); tmpV.set(p.x, p.y + dm.m.h * 0.6, p.z).project(cam);
        const cx = (tmpV.x + 1) / 2 * W, cy = (1 - tmpV.y) / 2 * H, u = a / 0.13, R = (hh.big ? 86 : 68) * k * (0.6 + 0.5 * EASE.out(u)), al = 1 - u; let sd = Math.floor(hh.t * 997) % 360;
        x.save(); x.globalAlpha = 0.9 * al;
        for (let j = 0; j < 9; j++) { const an = (sd + j * 40 + (j % 2) * 13) * D2R, ln = R * (j % 3 === 0 ? 1 : 0.62), w = (j % 3 === 0 ? 9 : 5) * k * (1 - 0.5 * u);
          const r0 = R * (0.16 + 0.3 * u), bx = cx + Math.cos(an) * r0, by = cy + Math.sin(an) * r0, px = -Math.sin(an) * w / 2, py = Math.cos(an) * w / 2; x.beginPath(); x.moveTo(bx + px, by + py); x.lineTo(cx + Math.cos(an) * ln, cy + Math.sin(an) * ln); x.lineTo(bx - px, by - py); x.closePath(); x.fillStyle = j % 3 === 0 ? C.rose : C.blood; x.fill(); }
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.42); g.addColorStop(0, `rgba(255,236,242,${0.9 * al})`); g.addColorStop(0.35, `rgba(224,80,158,${0.55 * al})`); g.addColorStop(1, 'rgba(158,27,43,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.42, 0, 6.283); x.fill(); x.restore(); } }
    // damage and heal numbers
    for (let ni = 0; ni < this.nums.length; ni++) { const nm = this.nums[ni]; const a = t0 - nm.t; if (a < 0 || a > 0.85) continue;
      if (nm.me) { const rr = rootAt(this, nm.t); tmpV.set(rr.x, rr.y + 1.35 + a * 0.5, rr.z).project(cam); }
      else { const p = this.dumPos(this.dum[nm.i], nm.t + Math.min(a, 0.1)); tmpV.set(p.x, p.y + this.dum[nm.i].m.h + 0.15 + a * 0.6, p.z).project(cam); }
      const jx = nm.me ? 0 : (((ni * 0.6180339) % 1) - 0.5) * 46 * k, jy = nm.me ? 0 : (((ni * 0.381966) % 1) - 0.5) * 14 * k;
      const sx2 = (tmpV.x + 1) / 2 * W + jx, sy2 = (1 - tmpV.y) / 2 * H + jy, al = a < 0.6 ? 1 : 1 - (a - 0.6) / 0.25, pop = 1 + 0.35 * Math.max(0, 1 - a / 0.12);
      x.globalAlpha = al; x.font = `700 ${Math.round((nm.big ? 22 : nm.small ? 14 : 17) * k * pop)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'center'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(20,18,16,0.85)';
      const s = String(lang === 'zh' && nm.n && nm.n.zh ? nm.n.zh : nm.n && nm.n.en ? nm.n.en : nm.n) + (nm.crit ? '!' : ''); x.strokeText(s, sx2, sy2); x.fillStyle = nm.col || C.parch; x.fillText(s, sx2, sy2); x.globalAlpha = 1; }
    // the HUD (top right): the Combo count and the like
    for (const f of this.hud) f(t, x, W, H, k, lang);
    let cnow = null; for (const c of this.caps) if (t >= c.t0 && t <= c.t1 && (!cnow || c.t0 >= cnow.t0)) cnow = c;
    for (const c of cnow ? [cnow] : []) { const s = lang === 'zh' ? c.zh : c.en; x.font = `600 ${Math.round(15 * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'left';
      const m = x.measureText(s).width; x.fillStyle = 'rgba(14,12,14,0.82)'; x.fillRect(10 * k, 10 * k, m + 18 * k, 26 * k); x.fillStyle = C.parch; x.fillText(s, 19 * k, 28 * k); }
  }
}

// ---------------------------------------------------------------- the effect kit
export const FX = {};
const P3 = (A, at, t) => typeof at === 'function' ? V3(at(t)) : at && at.d != null ? A.dpt(at.d, t, at.y != null ? at.y : 0.6).add(new THREE.Vector3(at.dx || 0, 0, at.dz || 0)) : at === 'him' ? A.body(t, 0) : V3(at);
FX.P3 = P3;
// a ring on the floor (or upright, facing dir) that grows and fades
FX.ring = (A, o) => {
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.rose, F_RING, { normal: o.normal }))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d;
    const at = P3(A, o.at, o.follow ? t : o.t);
    m.position.set(at.x, at.y + (o.y != null ? o.y : 0.02), at.z); if (o.dir) { const dv = typeof o.dir === 'function' ? o.dir(t) : V3(o.dir); m.quaternion.setFromUnitVectors(UP, dv.clone().normalize()); }
    const r = lerp(o.r0 != null ? o.r0 : 0.2, o.r1 || 1.5, EASE[o.e || 'out'](u)); m.scale.setScalar(r); m.material.uniforms.u0.value = o.w || 0.18; m.material.uniforms.op.value = (o.op || 0.8) * (1 - EASE.in(u)) * Math.min(1, a / 0.03); });
};
FX.disc = (A, o) => { // a soft filled disc on the floor (a flash, a stain, a pool)
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.rose, o.normal ? F_DISCN : F_DISC, { normal: o.normal }))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = P3(A, o.at, o.follow ? t : o.t); m.position.set(at.x, (o.y != null ? o.y : 0.025), at.z);
    m.scale.setScalar(o.hold ? lerp(o.r0 || 0.3, o.r1 || 1, EASE.out(clamp(a / 0.15))) : lerp(o.r0 || 0.3, o.r1 || 1, EASE.out(u))); m.material.uniforms.op.value = (o.op || 0.5) * (o.hold ? Math.min(1, (d - a) / 0.3) : 1 - u); });
};
// a ribbon that follows a moving point (a claw, a wing tip): the last `len` seconds of its path
FX.trail = (A, o) => {
  const N = 28; const g = new THREE.BufferGeometry(); const P = new Float32Array(N * 2 * 3), U = new Float32Array(N * 2 * 2), I = [];
  for (let i = 0; i < N; i++) { U[i * 4] = i / (N - 1); U[i * 4 + 1] = 0; U[i * 4 + 2] = i / (N - 1); U[i * 4 + 3] = 1; if (i < N - 1) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.moon, F_RIB))); m.frustumCulled = false; m.visible = false;
  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), wid = o.w || 0.12, len = o.len || 0.14;
  const src2 = o.of2 ? (typeof o.of2 === 'function' ? o.of2 : (t) => A.at(o.of2, t)) : null;
  A.fx((t) => { m.visible = t >= o.t0 && t <= o.t1 + len; if (!m.visible) return; const te = Math.min(t, o.t1);
    for (let i = 0; i < N; i++) { const tt = Math.max(o.t0, te - len * (1 - i / (N - 1))); const p = src(tt); let q;
      if (src2) q = src2(tt); else { const p2 = src(Math.max(o.t0, tt - 1 / 60)); const d = p.clone().sub(p2); const s = new THREE.Vector3().crossVectors(d, cam.position.clone().sub(p)); if (s.lengthSq() < 1e-8) s.set(1, 0, 0); s.normalize().multiplyScalar(wid * 0.5); q = p.clone().add(s); p.sub(s); }
      P[i * 6] = p.x; P[i * 6 + 1] = p.y; P[i * 6 + 2] = p.z; P[i * 6 + 3] = q.x; P[i * 6 + 4] = q.y; P[i * 6 + 5] = q.z; }
    g.attributes.position.needsUpdate = true; const fade = t > o.t1 ? 1 - (t - o.t1) / len : 1; m.material.uniforms.op.value = (o.op || 0.7) * fade; m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; });
};
// a tube or flat ribbon along a fixed curve, revealed from start to end and then fading
FX.tube = (A, o) => {
  let m = null;
  const mk = () => { const pts = o.pts(A); const curve = new THREE.CatmullRomCurve3(pts); const g = o.flat ? flatRibbon(curve, o.w || 0.2, o.seg || 64, o.up) : new THREE.TubeGeometry(curve, o.seg || 64, o.r || 0.03, 6, false); m = A.add(new THREE.Mesh(g, fxMat(o.col || C.rose, F_RIB, { normal: o.normal }))); m.frustumCulled = false; };
  mk(); m.visible = false;
  A.fx((t) => { const a = t - o.t; const d = o.dur || 0.3, hold = o.hold || 0, out = o.out || 0.25; m.visible = a >= 0 && a <= d + hold + out; if (!m.visible) return;
    const u1 = clamp(a / d), u0 = o.chase ? clamp((a - (o.chase)) / d) : 0; m.material.uniforms.u1.value = EASE[o.e || 'out'](u1) * 1.02; m.material.uniforms.u0.value = u0;
    m.material.uniforms.op.value = (o.op || 0.8) * (a > d + hold ? 1 - (a - d - hold) / out : 1); if (o.move) o.move(m, t, a); });
};
export function flatRibbon(curve, w, seg, up) { const g = new THREE.BufferGeometry(); const P = [], U = [], I = []; const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const p = pts[i], q = pts[Math.min(seg, i + 1)], r = pts[Math.max(0, i - 1)]; const d = q.clone().sub(r).normalize(); const s = up ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3().crossVectors(d, UP).normalize(); const ww = typeof w === 'function' ? w(i / seg) : w;
    P.push(p.x - s.x * ww / 2, p.y - s.y * ww / 2, p.z - s.z * ww / 2, p.x + s.x * ww / 2, p.y + s.y * ww / 2, p.z + s.z * ww / 2); U.push(i / seg, 0, i / seg, 1); if (i < seg) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; }
FX.flatRibbon = flatRibbon;
// dust: a few soft grey puffs kicked up off the floor
FX.dust = (A, o) => { const R = rng(o.seed || 7); const n = o.n || 6;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, sp = (o.sp || 1.2) * (0.5 + R()), m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || '#B9B2A4', F_DISCN, { normal: true }))); m.visible = false; const dl = R() * 0.06;
    A.fx((t) => { const a = t - o.t - dl, d = o.dur || 0.5; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = P3(A, o.at, o.t); const dir = o.dir ? new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize().multiplyScalar(0.6).add(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(0.4)) : new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      m.position.set(at.x + dir.x * sp * EASE.out(u) * 0.6, 0.05 + u * 0.25 * (o.rise || 1), at.z + dir.z * sp * EASE.out(u) * 0.6); m.scale.setScalar((o.r || 0.18) * (0.6 + u)); m.material.uniforms.op.value = (o.op || 0.35) * (1 - u); }); } };
// ink smoke: dark soft puffs that swell and drift up (where he was, where he comes out)
FX.smoke = (A, o) => { const R = rng(o.seed || 5); const n = o.n || 7;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, rr = (o.r || 0.25) * Math.sqrt(R()), hy = (o.h || 0.5) * R(), dl = R() * (o.spread || 0.06), sz = (o.size || 0.22) * (0.7 + 0.6 * R());
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 ? (o.col || C.ink) : (o.col2 || C.plum), transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; A.add(s);
    A.fx((t) => { const a = t - o.t - dl, d = o.dur || 0.6; s.visible = a >= 0 && a <= d; if (!s.visible) return; const u = a / d; const at = P3(A, o.at, o.follow ? t : o.t);
      s.position.set(at.x + Math.cos(ang) * rr * (1 + u * (o.out || 0.8)), at.y + hy + u * (o.rise || 0.3), at.z + Math.sin(ang) * rr * (1 + u * (o.out || 0.8))); s.scale.setScalar(sz * (0.6 + 1.2 * EASE.out(u))); s.material.opacity = (o.op || 0.75) * Math.min(1, a / 0.05) * (1 - EASE.in(u)); }); } };
// a short-lived bright spark at a point
FX.spark = (A, o) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: o.col || C.moon, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; A.add(s);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.14; s.visible = a >= 0 && a <= d; if (!s.visible) return; const at = P3(A, o.at, o.t); s.position.copy(at); s.scale.setScalar((o.r || 0.4) * (0.6 + a / d)); s.material.opacity = (o.op || 0.8) * (1 - a / d); }); };
// status looks: stun stars, slow ring, blind smoke band, bleed drips, a mark on its back
FX.status = (A, o) => {
  const dm = A.card.dum[o.i]; if (!dm) return;
  if (o.kind === 'stun') { const g = A.add(new THREE.Group()); for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: C.stun })); g.add(s); } g.visible = false;
    A.fx((t) => { const a = t - o.t; g.visible = a >= 0 && a <= o.dur; if (!g.visible) return; const p = A.dpos(o.i, t); g.position.set(p.x, p.y + dm.m.h + 0.12, p.z); g.children.forEach((s, k) => { const an = a * 6 + k * 2.094; s.position.set(Math.cos(an) * 0.22, 0, Math.sin(an) * 0.22); }); }); }
  if (o.kind === 'slow') { const m = A.add(new THREE.Mesh(ringGeo, fxMat(C.slow, F_RING))); m.visible = false;
    A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = A.dpos(o.i, t); m.position.set(p.x, 0.03, p.z); m.scale.setScalar(0.42 + 0.03 * Math.sin(a * 8)); m.material.uniforms.u0.value = 0.2; m.material.uniforms.op.value = 0.6 * Math.min(1, (o.dur - a) / 0.2); }); }
  if (o.kind === 'blind') { // a band of ink smoke wrapped round its head
    const ss = []; for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 2 ? C.ink : C.plum, transparent: true, depthWrite: false, opacity: 0 })); A.add(s); ss.push(s); }
    A.fx((t) => { const a = t - o.t, on = a >= 0 && a <= o.dur; const p = A.dpos(o.i, t); ss.forEach((s, k) => { s.visible = on; if (!on) return; const an = a * 2.2 + k * 0.9; s.position.set(p.x + Math.cos(an) * 0.2 * dm.m.s / 0.82, p.y + dm.m.h - 0.12 + 0.03 * Math.sin(an * 2), p.z + Math.sin(an) * 0.2 * dm.m.s / 0.82); s.scale.setScalar(0.24); s.material.opacity = 0.85 * Math.min(1, a / 0.12, (o.dur - a) / 0.25); }); }); }
  if (o.kind === 'bleed') { // drops that fall from it, a few a second, and a dark wet patch under it
    const R = rng(o.i * 31 + 7), drops = []; const N = Math.ceil(o.dur * (o.rate || 6)); for (let k = 0; k < N; k++) drops.push({ t: o.t + k / (o.rate || 6) + R() * 0.08, x: (R() - 0.5) * 0.35, z: (R() - 0.5) * 0.35, y: 0.4 + R() * 0.5 });
    const mats = drops.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: C.blood, transparent: true, depthWrite: false, opacity: 0 })); A.add(s); return s; });
    const pool = A.add(new THREE.Mesh(ringGeo, fxMat(C.core, F_DISCN, { normal: true }))); pool.visible = false;
    A.fx((t) => { const a = t - o.t; const p = A.dpos(o.i, t);
      drops.forEach((d, k) => { const s = mats[k], b = t - d.t; s.visible = b >= 0 && b < 0.45; if (!s.visible) return; s.position.set(p.x + d.x * dm.m.s, p.y + d.y * dm.m.s * 1.3 - 4 * b * b - b * 0.6, p.z + d.z * dm.m.s); s.scale.set(0.06, 0.09, 1); s.material.opacity = 0.95 * (1 - b / 0.45); });
      pool.visible = a >= 0 && a <= o.dur + 0.4; if (pool.visible) { pool.position.set(p.x, 0.012, p.z); pool.scale.setScalar(0.25 + 0.2 * clamp(a / 1.5)); pool.material.uniforms.op.value = 0.55 * Math.min(1, a / 0.3, (o.dur + 0.4 - a) / 0.4); } }); }
};
// a dummy felled: it tips over and sinks away
FX.fell = (A, o) => { const dm = A.card.dum[o.d]; dm.fellT = o.t; };
// a soft dark patch on the floor round a foe (the light dims a touch)
FX.dim = (A, o) => { const m = A.add(new THREE.Mesh(ringGeo, fxMat('#000000', F_DISCN, { normal: true }))); m.visible = false;
  A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = o.d != null ? A.dpos(o.d, t) : P3(A, o.at, t); m.position.set(p.x, 0.012, p.z); m.scale.setScalar(o.r || 1.4); m.material.uniforms.op.value = (o.op || 0.35) * Math.min(1, a / 0.12, (o.dur - a) / 0.15); }); };

// ---- torn marks (his claw marks and bite, as passed on his model page): tapered, ragged slashes in dark red with a pale torn edge.
// A slash is a strip along a bent centre line, pointed at both ends (a tooth: blunt at the gum), drawn three times: pale rim, colour, darker core. It tears open along its length, holds, and fades.
const mrng = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
function slashGeo(len, wid, bend, seed, grow, jag, tooth) { const N = 20, R = mrng(seed), P = [], idx = [];
  for (let i = 0; i <= N; i++) { const u = i / N, x = (u - 0.5) * len, y = bend * len * 4 * u * (1 - u), dx = len, dy = bend * len * 4 * (1 - 2 * u), dl = Math.hypot(dx, dy), nx = -dy / dl, ny = dx / dl;
    const prof = tooth ? Math.pow(1 - u, 0.75) * Math.min(1, u * 9 + 0.25) : Math.pow(Math.sin(Math.PI * u), 0.62) * (0.72 + 0.28 * u); const end = (i === 0 && !tooth) || i === N;
    const ht = end ? 0 : wid * prof * (1 + jag * (R() - 0.5)) + grow * Math.min(1, prof * 3), hb = end ? 0 : wid * prof * (1 + jag * (R() - 0.5)) + grow * Math.min(1, prof * 3);
    P.push(x + nx * ht, y + ny * ht, 0, x - nx * hb, y - ny * hb, 0); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); return g; }
const MPAL = { red: { fill: C.blood, core: C.core, rim: C.rim }, back: { fill: C.blood, core: C.core, rim: '#FFFFFF' }, rose: { fill: C.rose, core: C.plum, rim: C.moon }, ghost: { fill: '#B9A3C9', core: C.plum, rim: '#F4EEF8' } };
function slash(parent, pal, len, wid, bend, seed, x, y, rot, delay, tooth, rimW) { const g = new THREE.Group(); g.position.set(x, y, 0); g.rotation.z = rot; const parts = [];
  [[pal.rim, rimW || 0.012, 0.9, 0.9, 0], [pal.fill, 0, 0.5, 0.95, 0.001], [pal.core, -wid * 0.55, 0.35, 0.9, 0.002]].forEach(([col, grow, jag, op, z]) => { const geo = slashGeo(len, Math.max(0.004, wid + Math.min(0, grow)), bend, seed, Math.max(0, grow), jag, tooth);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); m.position.z = z; m.renderOrder = 20 + z * 1000; m.frustumCulled = false; g.add(m); parts.push({ m, op }); });
  parent.add(g); return { g, parts, delay }; }
// claws: n torn slashes side by side, the middle ones longest, each a moment after the one before. back: a backstab's mark, larger, with a wide pale edge
FX.claw = (A, o) => { const pal = MPAL[o.pal || (o.back ? 'back' : 'red')], n = o.n || 3, bend = o.bend != null ? o.bend : 0.1, seed = o.seed || Math.floor(o.t * 977 + n * 13);
  const grp = A.add(new THREE.Group()); grp.visible = false; const items = [];
  for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2, len = (o.len || 1) * (1 - 0.16 * Math.abs(k) - 0.05 * ((seed + i) % 3)); items.push(slash(grp, pal, len, (o.wid || 0.036) - 0.004 * Math.abs(k), bend * (1 + 0.12 * k), seed + i * 7, 0.03 * k * k - 0.02 * k, k * (o.gap || 0.17), 0.05 * k, (o.stagger != null ? o.stagger : 0.022) * i, false, o.back ? 0.03 : 0.012)); }
  const life = o.life || 0.62, open = o.open || 0.09, size = (o.size || 0.5) * (o.back ? 1.35 : 1);
  A.fx((t) => { const a = t - o.t; grp.visible = a >= 0 && a <= life; if (!grp.visible) return; const u = a / life; const at = P3(A, o.at, o.follow ? t : o.t); grp.position.copy(at);
    grp.quaternion.copy(cam.quaternion); grp.rotateZ(o.roll || 0); grp.scale.setScalar(size * (1 + 0.06 * u)); const fade = Math.min(1, (1 - u) / 0.45);
    items.forEach((it) => { const r = clamp((a - it.delay) / open); it.parts.forEach((p) => { const nI = p.m.geometry.index.count; p.m.geometry.setDrawRange(0, Math.ceil(r * nI / 6) * 6); p.m.material.opacity = p.op * fade * Math.min(1, r * 4); }); }); });
  if (o.drops !== false) FX.drops(A, { t: o.t + 0.03, at: o.at, n: o.back ? 8 : 4, sp: 0.9, up: 0.6, size: 0.035 });
};
// bite: two rows of torn tooth cuts, the fangs longest, that snap shut on each other
FX.bite = (A, o) => { const pal = MPAL[o.pal || 'red'], seed = o.seed || Math.floor(o.t * 733 + 5); const grp = A.add(new THREE.Group()); grp.visible = false; const jaws = [new THREE.Group(), new THREE.Group()]; grp.add(jaws[0], jaws[1]); const items = [];
  [1, -1].forEach((sgn, j) => { const n = j ? 4 : 5; for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2, fang = !j && Math.abs(k) === 1 || j && Math.abs(k) === 1.5, len = (fang ? 0.36 : 0.22) - 0.02 * Math.abs(k); const x = k * 0.19, y = sgn * (0.3 - 0.065 * k * k);
    items.push(slash(jaws[j], pal, len, fang ? 0.05 : 0.04, 0.06 * k * sgn * -1, seed + i * 5 + j * 40, x, y - sgn * len / 2, (sgn > 0 ? -Math.PI / 2 : Math.PI / 2) + 0.1 * k * sgn * -1, 0, true)); } });
  const life = o.life || 0.7, size = o.size || 0.45;
  A.fx((t) => { const a = t - o.t; grp.visible = a >= 0 && a <= life; if (!grp.visible) return; const u = a / life; const at = P3(A, o.at, o.follow ? t : o.t); grp.position.copy(at); grp.quaternion.copy(cam.quaternion); grp.rotateZ(o.roll || 0); grp.scale.setScalar(size * (1 + 0.06 * u));
    const c = Math.min(1, a / 0.07), e = c * c, gap = 0.34 * (1 - e) + (c >= 1 ? 0.03 * Math.exp(-(a - 0.07) * 30) * Math.cos((a - 0.07) * 60) : 0); jaws[0].position.y = gap; jaws[1].position.y = -gap;
    const fade = Math.min(1, (1 - u) / 0.45); items.forEach((it) => it.parts.forEach((p) => { p.m.material.opacity = p.op * fade * Math.min(1, a / 0.03); })); });
  FX.drops(A, { t: o.t + 0.07, at: o.at, n: 6, sp: 0.8, up: 0.8, size: 0.04 });
};
// blood drops: small red beads that spray out and fall; with `to`, they hang a beat and then fly home to it (his mouth)
FX.drops = (A, o) => { const R = rng(o.seed || Math.floor(o.t * 911 + 3)); const n = o.n || 6;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, sp = (o.sp || 1) * (0.4 + 0.8 * R()), up = (o.up || 0.6) * (0.4 + R()), dl = R() * (o.spread || 0.04), sz = (o.size || 0.04) * (0.7 + 0.6 * R());
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 4 === 3 ? (o.col2 || C.rose) : (o.col || C.blood), transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; A.add(s);
    const hang = o.hang || 0.25, fly = o.fly || 0.22;
    A.fx((t) => { const a = t - o.t - dl, d = o.to ? hang + fly : (o.dur || 0.5); s.visible = a >= 0 && a <= d; if (!s.visible) return; const at = P3(A, o.at, o.t);
      if (o.to) { const h = Math.min(a, hang), drift = EASE.out(h / hang); const p0 = new THREE.Vector3(at.x + Math.cos(ang) * sp * 0.35 * drift, at.y + up * 0.3 * drift, at.z + Math.sin(ang) * sp * 0.35 * drift);
        if (a <= hang) s.position.copy(p0); else { const u = EASE.in2((a - hang) / fly); s.position.copy(p0).lerp(P3(A, o.to, t), u); } s.scale.setScalar(sz * 1.2); s.material.opacity = 0.95; return; }
      s.position.set(at.x + Math.cos(ang) * sp * a, Math.max(0.02, at.y + up * a - 5 * a * a), at.z + Math.sin(ang) * sp * a); s.scale.setScalar(sz); s.material.opacity = 0.95 * (1 - EASE.in(a / d)); }); } };
// a blood thread: from a point (a foe) to another (his mouth), with a pulse running home
FX.thread = (A, o) => { const m = A.add(new THREE.Mesh(streakGeo, fxMat(o.col || C.blood, F_THREAD))); m.visible = false; const g = A.add(new THREE.Mesh(streakGeo, fxMat(o.glow || C.rose, F_THREAD))); g.visible = false;
  A.fx((t) => { const a = t - o.t0, on = t >= o.t0 && t <= o.t1 + 0.2; m.visible = g.visible = on; if (!on) return; const p = P3(A, o.from, t), q = P3(A, o.to, t), L = p.distanceTo(q); if (L < 0.01) { m.visible = g.visible = false; return; }
    const grow = EASE.out(clamp(a / (o.grow || 0.12))); const end = p.clone().lerp(q, grow); m.position.copy(p); m.quaternion.setFromUnitVectors(ZF, end.clone().sub(p).normalize()); m.scale.set(o.w || 0.035, o.w || 0.035, p.distanceTo(end));
    g.position.copy(m.position); g.quaternion.copy(m.quaternion); g.scale.set((o.w || 0.035) * 4, (o.w || 0.035) * 4, p.distanceTo(end));
    const fade = t > o.t1 ? 1 - (t - o.t1) / 0.2 : 1, pulse = ((a / (o.per || 0.45)) % 1); m.material.uniforms.u0.value = pulse; g.material.uniforms.u0.value = pulse; m.material.uniforms.op.value = (o.op || 0.9) * fade; g.material.uniforms.op.value = 0.18 * fade; }); };
// small bats (his blink, his swarms): each a little body, two ears and two flapping wings
const batParts = (() => { const wingGeo = new THREE.BufferGeometry(); const W = [[0, 0, 0.012], [0.05, 0, 0.03], [0.105, 0, 0.012], [0.085, 0, -0.012], [0.07, 0, -0.036], [0.05, 0, -0.014], [0.035, 0, -0.034], [0.018, 0, -0.012], [0, 0, -0.02]]; const pos = [], idx = []; W.forEach((v) => pos.push(...v)); for (let i = 1; i < W.length - 1; i++) idx.push(0, i, i + 1);
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wingGeo.setIndex(idx); return { wingGeo, bodyGeo: new THREE.SphereGeometry(0.02, 8, 6), earGeo: new THREE.ConeGeometry(0.008, 0.022, 4),
    dark: [new THREE.MeshBasicMaterial({ color: 0x35212F }), new THREE.MeshBasicMaterial({ color: 0x432A3B })], skin: [new THREE.MeshBasicMaterial({ color: 0x55344A, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: 0x6B4059, side: THREE.DoubleSide })],
    red: new THREE.MeshBasicMaterial({ color: 0x7A1020, side: THREE.DoubleSide }) }; })();
function makeBat(i, red) { const g = new THREE.Group(); const dk = batParts.dark[i % 3 ? 0 : 1], sk = red ? batParts.red : batParts.skin[i % 3 ? 0 : 1];
  const body = new THREE.Mesh(batParts.bodyGeo, dk); body.scale.set(0.8, 0.8, 1.5); g.add(body); const eL = new THREE.Mesh(batParts.earGeo, dk), eR = new THREE.Mesh(batParts.earGeo, dk); eL.position.set(0.011, 0.018, 0.022); eR.position.set(-0.011, 0.018, 0.022); g.add(eL, eR);
  const wL = new THREE.Mesh(batParts.wingGeo, sk), wR = new THREE.Mesh(batParts.wingGeo, sk); wR.scale.x = -1; g.add(wL, wR); g.visible = false; return { g, wL, wR }; }
// a blink: he comes apart into a cloud of small bats that scatter, stream from `from` to `to` and gather again
FX.blink = (A, o) => { const R = rng(o.seed || Math.floor(o.t * 577 + 9)); const n = o.n || 13, dur = o.dur || 0.12; const bats = [];
  for (let i = 0; i < n; i++) { const b = makeBat(i, o.red); A.add(b.g); bats.push({ ...b, lag: 0.02 + 0.2 * (i / n) * dur, d: dur * (0.86 + 0.3 * R()), j0: [R() - 0.5, R() - 0.5, R() - 0.5], j1: [R() - 0.5, R() - 0.5, R() - 0.5], a: i / n * 6.283 + (R() - 0.5) * 0.8, r: 0.22 + 0.3 * R(), ph: R() * 6.28, rate: 20 + R() * 8, size: (o.size || 1.6) * (0.8 + 0.6 * R()) }); }
  A.fx((t) => { const from = P3(A, o.from, o.t), to = P3(A, o.to, o.t + dur), dir = to.clone().sub(from); const len = dir.length() || 1; dir.multiplyScalar(1 / len); const side = new THREE.Vector3(dir.z, 0, -dir.x); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    for (const b of bats) { const u = (t - o.t - b.lag) / b.d; if (u < 0 || u >= 1) { b.g.visible = false; continue; }
      const at = (v, out) => { const e = v * v * (3 - 2 * v), sp = Math.pow(Math.sin(Math.PI * v), 0.55); const r = b.r * Math.min(1.4, 0.45 + len * 0.3) * (o.spreadK || 1);
        out.set(lerp(from.x + b.j0[0] * 0.14, to.x + b.j1[0] * 0.12, e), lerp(from.y + b.j0[1] * 0.24, to.y + b.j1[1] * 0.2, e), lerp(from.z + b.j0[2] * 0.14, to.z + b.j1[2] * 0.12, e));
        out.addScaledVector(side, Math.cos(b.a) * r * sp); out.y += (Math.sin(b.a) * r * 0.75 + 0.1) * sp + 0.03 * Math.sin(b.ph + v * 20); return out; };
      const p = at(u, new THREE.Vector3()), q = at(Math.min(1, u + 0.03), new THREE.Vector3()); b.g.visible = true; b.g.position.copy(p); if (q.distanceToSquared(p) > 1e-8) b.g.lookAt(q);
      const k = Math.min(1, u * 7) * Math.min(1, (1 - u) * 5); b.g.scale.setScalar(b.size * (0.15 + 0.85 * k)); const fl = Math.sin(b.ph + (t - o.t) * b.rate * 6.283 / 2.2) * 0.95; b.wL.rotation.z = fl; b.wR.rotation.z = -fl; } });
  if (o.puff !== false) { FX.smoke(A, { t: o.t, at: o.from, n: 6, r: 0.2, h: 0.3, size: 0.42, dur: 0.5, op: 0.32, y0: -0.3, col: C.plum, col2: C.leather }); FX.smoke(A, { t: o.t + dur, at: o.to, n: 6, r: 0.2, h: 0.3, size: 0.42, dur: 0.5, op: 0.32, seed: 9, col: C.plum, col2: C.leather }); }
};
// a cloud of small bats circling a centre (a moving point), a ring of radius r, rising and falling; with out(t) the ring can widen
FX.swarm = (A, o) => { const R = rng(o.seed || 21); const n = o.n || 18; const bats = [];
  for (let i = 0; i < n; i++) { const b = makeBat(i, o.red); A.add(b.g); bats.push({ ...b, a0: R() * 6.283, w: (o.w || 3) * (0.7 + 0.6 * R()) * (R() < (o.both ? 0.5 : 0) ? -1 : 1), rr: (0.55 + 0.45 * R()), hy: (o.h || 0.8) * (0.3 + 0.9 * R()), ph: R() * 6.28, rate: 20 + R() * 8, size: (o.size || 1.7) * (0.8 + 0.5 * R()), dl: R() * 0.15 }); }
  A.fx((t) => { const a = t - o.t0, on = t >= o.t0 && t <= o.t1; const c = P3(A, o.at, t); const rk = o.r ? (typeof o.r === 'function' ? o.r(t) : o.r) : 1.2;
    for (const b of bats) { const aa = a - b.dl; const vis = on && aa >= 0; b.g.visible = vis; if (!vis) continue; const grow = EASE.out(clamp(aa / 0.25)) * Math.min(1, (o.t1 - t) / 0.2 + 0.0);
      const an = b.a0 + aa * b.w; const r = rk * b.rr * (0.3 + 0.7 * grow); const p = new THREE.Vector3(c.x + Math.cos(an) * r, c.y + b.hy + 0.08 * Math.sin(aa * 5 + b.ph), c.z + Math.sin(an) * r);
      const q = new THREE.Vector3(c.x + Math.cos(an + 0.2 * Math.sign(b.w)) * r, p.y, c.z + Math.sin(an + 0.2 * Math.sign(b.w)) * r); b.g.position.copy(p); b.g.lookAt(q); b.g.scale.setScalar(b.size * Math.max(0.05, grow)); const fl = Math.sin(b.ph + aa * b.rate * 2.85) * 0.95; b.wL.rotation.z = fl; b.wR.rotation.z = -fl; } });
};
// a crescent blade that flies flat across the floor: a thin arc, bright at its front edge
function crescentGeo(R, th, arc) { const g = new THREE.BufferGeometry(); const P = [], U = [], I = []; const N = 24;
  for (let i = 0; i <= N; i++) { const u = i / N, an = (u - 0.5) * arc, w = th * Math.sin(Math.PI * u); P.push(Math.sin(an) * R, 0, Math.cos(an) * R - R, Math.sin(an) * (R - w), 0, Math.cos(an) * (R - w) - R); U.push(u, 1, u, 0); if (i < N) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; }
FX.crescent = (A, o) => { const geo = crescentGeo(o.R || 0.7, o.th || 0.16, o.arc || 2.2); const m = A.add(new THREE.Mesh(geo, fxMat(o.col || C.moon, F_CRES))); m.visible = false; const g2 = o.glow !== false ? A.add(new THREE.Mesh(crescentGeo((o.R || 0.7) * 1.05, (o.th || 0.16) * 2.4, (o.arc || 2.2) * 1.05), fxMat(o.glow || C.rose, F_CRES))) : null; if (g2) g2.visible = false;
  const path = o.path || ((u) => { const a = P3(A, o.from, o.t), b = P3(A, o.to, o.t); return a.lerp(b, u); });
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3; const on = a >= 0 && a <= d + (o.out || 0.12); m.visible = on; if (g2) g2.visible = on; if (!on) return; const u = clamp(a / d), ue = EASE[o.e || 'out2'](u);
    const p = path(ue), q = path(Math.min(1, ue + 0.02)); let dir = q.clone().sub(p); if (dir.lengthSq() < 1e-8) dir = path(1).sub(path(0.9)); dir.y = 0; dir.normalize();
    for (const mm of g2 ? [m, g2] : [m]) { mm.position.copy(p); mm.quaternion.setFromUnitVectors(ZF, dir); if (o.tilt) mm.rotateZ(o.tilt); if (o.roll) mm.rotateZ(o.roll); mm.scale.setScalar((o.grow ? lerp(0.5, 1, EASE.out(clamp(a / 0.1))) : 1) * (o.scale ? o.scale(ue) : 1)); }
    const fade = a > d ? 1 - (a - d) / (o.out || 0.12) : 1; m.material.uniforms.op.value = (o.op || 0.95) * fade * Math.min(1, a / 0.03); if (g2) g2.material.uniforms.op.value = (o.glowOp || 0.35) * fade * Math.min(1, a / 0.03); }); };
// red crystal spikes bursting out of the floor; they stand, then break into drops
const spikeGeo = (() => { const g = new THREE.ConeGeometry(0.11, 1, 5, 1); g.translate(0, 0.5, 0); return g; })();
const spikeMat = new THREE.MeshStandardMaterial({ color: '#8E1424', emissive: C.blood, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1, flatShading: true });
FX.spike = (A, o) => { const m = A.add(new THREE.Mesh(spikeGeo, spikeMat)); m.visible = false; const R = rng(o.seed || Math.floor(o.t * 313 + (o.x || 0) * 17));
  const lean = o.lean || [(R() - 0.5) * 0.3, (R() - 0.5) * 0.3]; const h = o.h || 0.7, life = o.life || 0.8;
  A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= life; if (!m.visible) return; const at = P3(A, o.at, o.t); m.position.set(at.x, 0, at.z); const up = EASE.out(clamp(a / 0.07)), down = a > life - 0.2 ? (life - a) / 0.2 : 1;
    m.rotation.set(lean[0] + (o.tilt ? o.tilt[0] : 0), o.yaw || R() * 6.283, lean[1] + (o.tilt ? o.tilt[1] : 0)); m.scale.set((o.w || 1) * (0.6 + 0.4 * down), h * up * down, (o.w || 1) * (0.6 + 0.4 * down)); });
  if (o.burst !== false) FX.drops(A, { t: o.t + (o.life || 0.8) - 0.2, at: (t) => { const p = P3(A, o.at, o.t); return [p.x, h * 0.5, p.z]; }, n: 4, sp: 0.6, up: 0.4, size: 0.04 });
  FX.ring(A, { t: o.t, at: o.at, r0: 0.05, r1: 0.35 * (o.w || 1), dur: 0.25, col: C.blood, op: 0.6, normal: true });
};
// a moon: a soft disc that rises and hangs (red, or eclipsed by a black disc)
FX.moon = (A, o) => { const m = A.add(new THREE.Mesh(quadGeo, fxMat(o.col || C.blood, `uniform vec3 col; uniform float op; uniform float u0; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float disc=1.0-smoothstep(0.58,0.62,r); float glow=(1.0-smoothstep(0.55,1.0,r))*0.55;
    vec2 q=p-vec2(u0,0.0); float ec=1.0-smoothstep(0.58,0.62,length(q)); vec3 c=mix(col*1.25,vec3(1.0,0.8,0.85),0.25*(1.0-r));
    // its face: darker seas, three craters with a lit lip, a brighter limb, and a thin halo just outside it
    float mar=smoothstep(0.35,0.8,0.5+0.27*sin(p.x*5.3+p.y*3.1+1.7)+0.23*sin(p.y*7.7-p.x*2.3+0.4)); c*=1.0-0.3*mar*disc;
    for(int i=0;i<3;i++){ vec2 cc0=i==0?vec2(-0.22,0.18):i==1?vec2(0.2,-0.12):vec2(0.05,0.33); float rr=i==0?0.12:i==1?0.09:0.06; float d0=length(p-cc0); c*=1.0-0.32*(1.0-smoothstep(rr*0.75,rr,d0))*disc; c+=vec3(0.22,0.08,0.1)*exp(-pow((d0-rr)/0.018,2.0))*disc; }
    c+=vec3(0.32,0.1,0.16)*smoothstep(0.42,0.6,r)*disc; float halo=exp(-pow((r-0.7)/0.035,2.0))*0.55; glow=max(glow,halo); float a=max(disc*(1.0-ec),glow*(1.0-ec*0.6)); vec3 cc=mix(c, vec3(0.03,0.01,0.02), ec*disc); float aa=max(a, ec*disc); gl_FragColor=vec4(cc,aa*op); }`, { normal: true }))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = P3(A, o.at, t); m.position.copy(c); m.position.y += EASE.out(clamp(a / 0.5)) * (o.rise || 0); m.quaternion.copy(cam.quaternion); const s = (o.r || 1) * EASE.out(clamp(a / (o.grow || 0.4)));
    m.scale.setScalar(s); m.material.uniforms.op.value = (o.op || 0.9) * Math.min(1, (o.t1 - t) / 0.3); m.material.uniforms.u0.value = o.eclipse ? lerp(1.3, 0, EASE.s(clamp((t - o.eclipse[0]) / (o.eclipse[1] - o.eclipse[0])))) : 9; }); };
// a dome of dark round a point (Nightfall), thick at its rim, with a sigil ring on the floor
FX.dome = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, 6.283, 0, Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.ink) }, op: { value: 0 } }, vertexShader: VS_DOME, fragmentShader: F_DOME, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = P3(A, o.at, o.follow ? t : o.t0); m.position.set(c.x, 0, c.z); const s = (o.r || 2) * EASE.out(clamp(a / (o.grow || 0.25))); m.scale.set(s, s * (o.flat || 0.55), s); m.material.uniforms.op.value = (o.op || 0.6) * Math.min(1, (o.t1 - t) / 0.35); }); };
// a shield of dark folded round him: a bubble with a rose rim that shimmers when struck
FX.shield = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.shield) }, op: { value: 0 } }, vertexShader: VS_DOME, fragmentShader: F_DOME, transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending }))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = A.body(t, 0.5); m.position.copy(c); let flash = 0; for (const h of o.hits || []) { const b = t - h; if (b >= 0 && b < 0.25) flash = Math.max(flash, 1 - b / 0.25); }
    const s = (o.r || 0.75) * EASE.out(clamp(a / 0.15)) * (1 + 0.06 * flash); m.scale.set(s, s * 1.1, s); m.material.uniforms.op.value = ((o.op || 0.5) + 0.5 * flash) * Math.min(1, (o.t1 - t) / 0.2); }); };
// mist: a cloud of soft red puffs, slowly turning, with a few dark bat shapes in it
FX.mist = (A, o) => { const R = rng(o.seed || 41); const n = o.n || 22; const ps = [];
  for (let k = 0; k < n; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 4 === 0 ? (o.col2 || C.rose) : (o.col || '#7A1424'), transparent: true, depthWrite: false, opacity: 0 })); A.add(s); ps.push({ s, a0: R() * 6.283, r: Math.sqrt(R()), y: R(), w: (R() - 0.5) * 2, sz: 0.4 + 0.5 * R() }); }
  A.fx((t) => { const a = t - o.t0, on = t >= o.t0 && t <= o.t1; const c = P3(A, o.at, t); const rr = typeof o.r === 'function' ? o.r(t) : (o.r || 1); const grow = EASE.out(clamp(a / 0.2)), fade = Math.min(1, (o.t1 - t) / 0.3);
    for (const p of ps) { p.s.visible = on; if (!on) continue; const an = p.a0 + a * p.w; p.s.position.set(c.x + Math.cos(an) * p.r * rr * grow, c.y + 0.1 + p.y * (o.h || 0.9), c.z + Math.sin(an) * p.r * rr * grow); p.s.scale.setScalar(p.sz * rr * 0.8); p.s.material.opacity = (o.op || 0.55) * grow * fade; } });
  if (o.bats !== false) FX.swarm(A, { t0: o.t0 + 0.05, t1: o.t1, at: o.at, r: typeof o.r === 'function' ? (t) => o.r(t) * 0.7 : (o.r || 1) * 0.7, n: o.nb || 6, h: (o.h || 0.9) * 0.8, w: 2, size: 1.4, seed: 5 });
};
// a sigil on the floor or on a foe's back: a bat's skull drawn in rose lines, turning slowly
const sigilTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 5; x.lineJoin = 'round';
  x.beginPath(); x.arc(64, 64, 58, 0, 6.283); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 50, 0, 6.283); x.stroke();
  // skull: a round head, two pointed ears, two fangs, eye holes
  x.lineWidth = 5; x.beginPath(); x.moveTo(36, 54); x.lineTo(30, 24); x.lineTo(50, 42); x.quadraticCurveTo(64, 36, 78, 42); x.lineTo(98, 24); x.lineTo(92, 54); x.quadraticCurveTo(96, 80, 74, 88); x.lineTo(70, 100); x.lineTo(66, 88); x.lineTo(62, 88); x.lineTo(58, 100); x.lineTo(54, 88); x.quadraticCurveTo(32, 80, 36, 54); x.closePath(); x.stroke();
  x.beginPath(); x.ellipse(52, 62, 7, 9, 0.4, 0, 6.283); x.fill(); x.beginPath(); x.ellipse(76, 62, 7, 9, -0.4, 0, 6.283); x.fill(); return new THREE.CanvasTexture(c); })();
FX.sigil = (A, o) => { const m = A.add(new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial({ map: sigilTex, color: o.col || C.rose, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = t >= o.t0 && t <= o.t1; if (!m.visible) return; const c = P3(A, o.at, t); m.position.copy(c);
    if (o.floor) { m.rotation.set(-Math.PI / 2, 0, a * 0.8); m.position.y = 0.03; } else m.quaternion.copy(cam.quaternion);
    const pulse = o.bright ? o.bright(t) : 0; m.scale.setScalar((o.r || 0.3) * EASE.out(clamp(a / 0.15)) * (1 + 0.15 * pulse)); m.material.opacity = Math.min(1, (o.op || 0.85) + 0.3 * pulse) * Math.min(1, (o.t1 - t) / 0.2); }); };
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
