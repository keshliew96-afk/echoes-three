// Windbriar ability review page: one live three.js stage drawn into every visible card.
// Every clip is a pure function of its own time t, so cards loop, pause and slow down freely.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addKnees, kneeSolver } from './knees.js';

const C = { jade: '#5ED3C0', core: '#FFF3C4', gold: '#FFB43C', bone: '#C9C2B3', parch: '#F4EFE6', slow: '#7FB8F0', stun: '#F2E3A0',
  floorA: '#6A665F', floorB: '#625E58', line: '#4E4B46', edge: '#8A867E', bg: '#34322E',
  canvas: '#8F887B', wood: '#4A3B2C', rope: '#8C8472' };
const S = 1.5;            // model units to world units: she stands about 1.15 u to the ear tips
const PIV = 0.36 * S;      // her middle: flips and rolls turn about it
const G = 22;              // gravity for launched dummies, u/s²
const STOPK = 0.1;         // how fast time runs inside a contact hold
const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const EASE = { s: sm, lin: (x) => clamp(x), in: (x) => { x = clamp(x); return x * x * x; }, out: (x) => { x = 1 - clamp(x); return 1 - x * x * x; }, io2: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } };
const lerp = (a, b, u) => a + (b - a) * u;
export const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---------------------------------------------------------------- stage
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
const cam = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 200);
{
  // the floor: 1 u square tiles in two close greys with a thin dark joint, drawn in the shader so it never shimmers
  const fm = new THREE.ShaderMaterial({ uniforms: { a: { value: new THREE.Color(C.floorA) }, b: { value: new THREE.Color(C.floorB) }, l: { value: new THREE.Color(C.line) } },
    vertexShader: `varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 a; uniform vec3 b; uniform vec3 l; varying vec2 vP; void main(){ vec2 c=floor(vP); float k=mod(c.x+c.y,2.0); vec3 col=mix(a,b,k);
      vec2 f=abs(fract(vP)-0.5); vec2 ln=smoothstep(vec2(0.47),vec2(0.49),f); float j=max(ln.x,ln.y); col=mix(col,l,j*0.9);
      float r=length(vP)/26.0; col*=1.0-0.25*smoothstep(0.4,1.0,r); gl_FragColor=vec4(col,1.0);
      #include <colorspace_fragment>
    }` });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 48, 48), fm);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#55524C', 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF6E8', 1.9); sun.position.set(-5, 12, 9); scene.add(sun);
  const rim = new THREE.DirectionalLight('#DDE8F0', 0.7); rim.position.set(6, 6, -8); scene.add(rim);
}
// soft blob shadows (they also read height in a jump)
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function blob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = -2; return m; }

// ---------------------------------------------------------------- her
const her = { ready: false };
export async function loadHer(url, extra = []) {
  const gl = typeof url === 'string' ? await new GLTFLoader().loadAsync(url) : await new GLTFLoader().parseAsync(url, './');
  for (const u of extra) { const g2 = await new GLTFLoader().loadAsync(u); for (const c of g2.animations) { const i = gl.animations.findIndex((a) => a.name === c.name); if (i >= 0) gl.animations[i] = c; else gl.animations.push(c); } }
  const model = gl.scene; addKnees(model); model.scale.setScalar(S);
  her.knees = kneeSolver(model);
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.roughness = 0.85; o.material.metalness = 0; } } });
  const root = new THREE.Group(), lift = new THREE.Group(), piv = new THREE.Group();
  root.add(lift); lift.add(piv); piv.add(model); piv.position.y = -PIV; lift.position.y = PIV;
  scene.add(root);
  const sh = blob(0.42); scene.add(sh);
  const mixer = new THREE.AnimationMixer(model);
  const acts = {}; for (const c of gl.animations) { const a = mixer.clipAction(c); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; acts[c.name] = { a, T: c.duration }; }
  const bone = (n) => model.getObjectByName(n);
  Object.assign(her, { model, root, lift, piv, sh, mixer, acts, ready: true,
    b: { footL: bone('footL'), footR: bone('footR'), handR: bone('handR'), handL: bone('handL'), chest: bone('chest'), head: bone('head'), hips: bone('hips'), forearmL: bone('forearmL'), weapon: bone('weapon'), earL2: bone('earL2'), earR2: bone('earR2'), earL: bone('earL'), earR: bone('earR'), tail1: bone('tail1') } });
  // how fast a planted paw travels back under her in the run and walk loops (u per clip second): the page's travel sets the loops' pace from this, so planted paws do not slide
  her.gait = {}; root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  for (const nm of ['run', 'walk', 'gHipRun']) { const r = acts[nm]; if (!r) continue; const N = Math.round(r.T * 120), P = []; mixer.stopAllAction(); r.a.reset(); r.a.play(); r.a.setEffectiveWeight(1);
    for (let f = 0; f <= N; f++) { r.a.time = Math.min(r.T - 1e-4, f / 120); mixer.update(0); root.updateMatrixWorld(true); const v = new THREE.Vector3(); P.push(['footL', 'footR'].map((k) => bone(k).getWorldPosition(v).toArray())); }
    let sum = 0, cnt = 0; for (const s of [0, 1]) { let lo = 9; for (const q of P) lo = Math.min(lo, q[s][1]); for (let f = 0; f < N; f++) if (P[f][s][1] < lo + 0.03 && P[f + 1][s][1] < lo + 0.03 && P[f][s][2] - P[f + 1][s][2] > 0.004) { sum += (P[f][s][2] - P[f + 1][s][2]) * 120; cnt++; } }
    her.gait[nm] = cnt ? sum / cnt : 0; }
  mixer.stopAllAction();
  // the three Tailwind feathers ride her bow forearm
  const fg = new THREE.Group(); her.b.forearmL.add(fg); her.feathers = [];
  for (let k = 0; k < 3; k++) { const f = featherMesh(); f.position.set(0.03 + 0.0, -0.02 - 0.028 * k, 0.03); f.rotation.set(0.3, 0, -0.9 + k * 0.15); f.scale.setScalar(0.15); fg.add(f); her.feathers.push(f); }
  return her;
}
function featherMesh() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.22, 0.45, 0, 1); s.quadraticCurveTo(-0.22, 0.45, 0, 0);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 6), new THREE.MeshBasicMaterial({ color: C.jade, side: THREE.DoubleSide, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  return m;
}
// knees bend only in skill moves: the passed idle, walk, run, dash and basic combo never turn them (19 Nov knees)
const PASSED = /^(idle|walk|run|dash|combo)/;
// pose her body at time t of a card's sequence (body clips with idle in the gaps, short crossfades)
function poseBody(seq, t) {
  const A = her.acts; her.mixer.stopAllAction();
  let cur = null, prev = null;
  for (let i = 0; i < seq.length; i++) if (seq[i][0] <= t) { prev = cur; cur = seq[i]; }
  her.kw = 0; her.kwT = 0;
  const play = (name, tt, w) => { const nm = A[name] ? name : 'idle'; her.kw += PASSED.test(nm) ? 0 : w; her.kwT += w; const r = A[name] || A.idle; r.a.reset(); r.a.play(); r.a.setEffectiveWeight(w); r.a.time = clamp(tt, 0, r.T - 1e-4); };
  const segT = (s, tt) => { const o = s[2] || {}; const sp = o.speed || 1, from = o.from || 0, to = o.to != null ? o.to : (A[s[1]] || A.idle).T;
    if (o.loop) { const L = to - from, tu = Math.min(tt, o.until); let adv = (tu - s[0]) * sp; const g = her.gait[s[1]], P = seq.path;
      if (g > 0.2 && P && (o.match != null ? o.match : (s[1] === 'run' || s[1] === 'gHipRun'))) { const at = (x) => { const f = clamp(x * 60, 0, P.length - 1), i = Math.floor(f), j = Math.min(P.length - 1, i + 1); return lerp(P[i], P[j], f - i); }; if (at(o.until) - at(s[0]) > 0.3) adv = (at(tu) - at(s[0])) / g; }
      const loc = from + (adv % L); return { loc, end: tt >= o.until, to: loc, sp, endT: o.until }; }
    const loc = from + (tt - s[0]) * sp; return { loc, end: loc > to, to, sp, endT: s[0] + (to - from) / sp }; };
  if (!cur) { play('idle', (t % 6), 1); her.mixer.update(0); return; }
  const c = segT(cur, t), o = cur[2] || {};
  if (c.end && !o.hold) { // after the segment: idle (or run), faded in from the segment's last frame
    const endT = c.endT, k = sm((t - endT) / 0.18), after = o.then || 'idle';
    if (k < 1) play(cur[1], c.to, 1 - k);
    play(after, (t - endT) % (A[after] ? A[after].T : 6), Math.max(1e-3, k));
  } else {
    const k = prev && prev[1] !== cur[1] ? sm((t - cur[0]) / (o.fade != null ? o.fade : 0.1)) : 1; // the same clip twice in a row shares one action: no crossfade
    if (k < 1 && prev) { const p = segT(prev, t); play(prev[1], Math.min(p.loc, p.to), 1 - k); }
    play(cur[1], Math.min(c.loc, c.to), Math.max(1e-3, k));
  }
  her.mixer.update(0);
}
const OVK = 7, ovE = new THREE.Euler(), ovQ = new THREE.Quaternion();
function ovApply(b, rx, ry, rz) { if (!b) return; ovQ.setFromEuler(ovE.set(rx * D2R, ry * D2R, rz * D2R, 'XYZ')); b.quaternion.premultiply(ovQ); }
// Follow-through worked out from the root keys alone, as damped springs at 240 Hz, sampled at 60 Hz:
// 0 ear lean (back when she speeds up, forward when she stops, against a flip), 1 ear splay (spins, take-offs, landings), 2 ear twist (one ear leads in a spin), 3 ear-tip lean,
// 4 tail swing, 5 tail lift, 6 squash (1 = none): a stretch off the floor, a squash and a rebound on landing
function buildOverlap(card) {
  const n = Math.ceil(card.T * 60) + 2, out = new Float32Array(n * OVK), H = 0.58, dt = 1 / 240, sub = 4;
  const pt = (t) => { const r = rootAt(card, clamp(t, 0, card.T)); const e = new THREE.Euler(r.pitch, r.yaw, r.roll, 'YXZ'); const m = new THREE.Matrix4().makeRotationFromEuler(e); const p = new THREE.Vector3(0, H, 0).applyMatrix4(m); p.x += r.x; p.z += r.z; p.y += PIV + r.y; return { p, m, r }; };
  const cl = (x, a) => Math.max(-a, Math.min(a, x));
  const st = [0, 0, 0, 0, 0, 0].map(() => ({ x: 0, v: 0 })), K = [[330, 0.42], [300, 0.5], [330, 0.42], [210, 0.34], [200, 0.36], [260, 0.42]];
  const lands = [], offs = []; let py = rootAt(card, 0).y;
  for (let f = 0; f < n; f++) { for (let k = 0; k < sub; k++) { const t = f / 60 + k * dt; const a = pt(t - dt), b = pt(t), c = pt(t + dt);
      const acc = a.p.clone().add(c.p).addScaledVector(b.p, -2).multiplyScalar(1 / (dt * dt));
      const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(); b.m.extractBasis(X, Y, Z);
      const af = cl(acc.dot(Z), 60), au = cl(acc.dot(Y), 80);
      const wrp = (x) => x - Math.round(x / (2 * Math.PI)) * 2 * Math.PI; let wy = wrp(c.r.yaw - a.r.yaw) / (2 * dt), wp = wrp(c.r.pitch - a.r.pitch) / (2 * dt), wr = wrp(c.r.roll - a.r.roll) / (2 * dt); wy = cl(wy, 40); wp = cl(wp, 40); wr = cl(wr, 40);
      const tg = [cl(-0.75 * af - 2.0 * wp, 36), cl(1.3 * Math.abs(wy) + 0.32 * Math.max(0, au) + 0.9 * Math.abs(wr), 26), cl(-1.4 * wy, 20), cl(-1.1 * af - 3.0 * wp - 0.45 * Math.max(0, au), 46), cl(2.2 * wy, 34), cl(0.5 * af + 1.5 * wp, 26)];
      for (let j = 0; j < 6; j++) { const w0 = Math.sqrt(K[j][0]); st[j].v += (K[j][0] * (tg[j] - st[j].x) - 2 * K[j][1] * w0 * st[j].v) * dt; st[j].x += st[j].v * dt; }
      const y = b.r.y; if (py > 0.03 && y <= 0.03) lands.push({ t, v: Math.abs((c.r.y - a.r.y) / (2 * dt)) + Math.abs((b.r.y - pt(t - 0.05).r.y) / 0.05) * 0.5 }); if (py <= 0.03 && y > 0.03) offs.push(t); py = y; }
    for (let j = 0; j < 6; j++) out[f * OVK + j] = st[j].x; }
  for (let f = 0; f < n; f++) { const t = f / 60; let sq = 1;
    for (const o of offs) { const a = t - o; if (a > -0.02 && a < 0.2) sq += 0.07 * Math.exp(-(((a - 0.05) / 0.055) ** 2)); }
    for (const l of lands) { const a = t - l.t; if (a >= 0 && a < 0.5) sq -= clamp(l.v * 0.02, 0.035, 0.13) * Math.exp(-a / 0.085) * Math.cos(a * 24); }
    out[f * OVK + 6] = sq; }
  card.ov = out; card.ovN = n; card.lands = lands;
}
// her root: start spot and facing, then keyed travel (fw forward, sd to her right), lift, spin, flip (pitch) and roll
function rootAt(card, t) {
  const R = card.rootK, h = card.her;
  let k = { fw: 0, sd: 0, y: 0, spin: 0, pitch: 0, roll: 0 };
  if (R.length) {
    if (t <= R[0].t) k = R[0]; else if (t >= R[R.length - 1].t) k = R[R.length - 1];
    else for (let i = 0; i < R.length - 1; i++) if (t >= R[i].t && t <= R[i + 1].t) {
      const a = R[i], b = R[i + 1], u = (t - a.t) / (b.t - a.t || 1), e = EASE[b.e || 's'](u), o = {};
      for (const c of ['fw', 'sd', 'spin', 'pitch', 'roll']) o[c] = lerp(a[c], b[c], e);
      o.y = b.jump ? lerp(a.y, b.y, u) + b.jump * 4 * u * (1 - u) : lerp(a.y, b.y, EASE[b.ye || b.e || 's'](u));
      k = o; break;
    }
  }
  // small hops laid over the keys: a step, a lunge or a turn on the spot leaves the floor instead of sliding on it
  let hy = 0; const hp = card.def && card.def.hops; if (hp) for (const q of hp) if (t > q[0] && t < q[1]) { const u = (t - q[0]) / (q[1] - q[0]); hy += q[2] * 4 * u * (1 - u); }
  const yaw = (h.face) * D2R, fx = Math.sin(yaw), fz = Math.cos(yaw);
  return { x: h.x + fx * k.fw - fz * k.sd, z: h.z + fz * k.fw + fx * k.sd, y: k.y + hy, yaw: yaw + k.spin * D2R, pitch: k.pitch * D2R, roll: k.roll * D2R };
}
function placeHer(card, t) {
  const r = rootAt(card, t);
  her.root.position.set(r.x, 0, r.z); her.root.rotation.set(0, r.yaw, 0);
  let gl = 0; if (card.lift) { const ff = clamp(t, 0, card.T) * 60, i0 = Math.min(card.lift.length - 1, Math.floor(ff)), i1 = Math.min(card.lift.length - 1, i0 + 1); gl = lerp(card.lift[i0], card.lift[i1], ff - i0); }
  her.lift.position.y = PIV + r.y + gl; her.lift.rotation.set(r.pitch, 0, r.roll, 'YXZ');
  her.sh.position.set(r.x, 0.004, r.z); const sc = 1 / (1 + r.y * 0.8); her.sh.scale.setScalar(sc); her.sh.material.opacity = sc;
  poseBody(card.seq, t);
  her.root.scale.set(1, 1, 1); her.root.updateMatrixWorld(true);
  her.knees.solve(globalThis.__noKnee || card.def && card.def.noKnee ? 0 : (her.kwT > 0 ? her.kw / her.kwT : 0));
  // overlap from her root's own motion (the body clips know nothing of the page's travel, spins and flips): ears and tail trail, landings squash
  const ov = card.ov;
  if (ov) { const ff = clamp(t, 0, card.T) * 60, i0 = Math.min(card.ovN - 1, Math.floor(ff)), i1 = Math.min(card.ovN - 1, i0 + 1), u = ff - i0, g = (c) => lerp(ov[i0 * OVK + c], ov[i1 * OVK + c], u);
    const ep = g(0), es = g(1), tw = g(2), tp = g(3), ty = g(4), tx = g(5), sq = g(6);
    ovApply(her.b.earL, ep + tw, 0, -es); ovApply(her.b.earR, ep - tw, 0, es); ovApply(her.b.earL2, tp + tw * 0.7, 0, -es * 0.6); ovApply(her.b.earR2, tp - tw * 0.7, 0, es * 0.6); ovApply(her.b.tail1, tx, ty, 0);
    her.root.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  } else her.root.scale.set(1, 1, 1);
  her.root.updateMatrixWorld(true);
  const tw = card.tail ? card.tail(t) : 0;
  her.feathers.forEach((f, i) => { f.visible = i < tw; });
  return r;
}

// ---------------------------------------------------------------- training dummies
const DG = { post: new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8), body: new THREE.CylinderGeometry(0.24, 0.27, 0.56, 12), head: new THREE.SphereGeometry(0.17, 14, 10), arm: new THREE.CylinderGeometry(0.05, 0.05, 0.86, 8), band: new THREE.CylinderGeometry(0.255, 0.255, 0.05, 12), base: new THREE.CylinderGeometry(0.26, 0.3, 0.06, 12) };
const woodM = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 }), ropeM = new THREE.MeshStandardMaterial({ color: C.rope, roughness: 1 });
function makeDummy(big, face) {
  const g = new THREE.Group(), tilt = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: C.canvas, roughness: 0.95, emissive: '#FFFFFF', emissiveIntensity: 0 });
  const base = new THREE.Mesh(DG.base, woodM); base.position.y = 0.03; tilt.add(base);
  const post = new THREE.Mesh(DG.post, woodM); post.position.y = 0.25; tilt.add(post);
  const body = new THREE.Mesh(DG.body, cm); body.position.y = 0.72; tilt.add(body);
  for (const y of [0.55, 0.88]) { const b = new THREE.Mesh(DG.band, ropeM); b.position.y = y; tilt.add(b); }
  const arm = new THREE.Mesh(DG.arm, woodM); arm.rotation.z = Math.PI / 2; arm.position.y = 0.84; tilt.add(arm);
  const head = new THREE.Mesh(DG.head, cm); head.position.y = 1.15; tilt.add(head);
  if (face != null) { // which way it faces: a wooden beak on its head and a rope band across its chest front
    const a = face * Math.PI / 180, dx = Math.sin(a), dz = Math.cos(a); const nose = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.32, 8), woodM); nose.position.set(dx * 0.26, 1.13, dz * 0.26); nose.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz)); tilt.add(nose);
    const arm2 = tilt.children.find((c) => c.geometry === DG.arm); if (arm2) { arm2.rotation.order = 'YXZ'; arm2.rotation.set(0, a, Math.PI / 2); } }
  g.add(tilt); const s = big ? 1.2 : 0.82; tilt.scale.setScalar(s);
  const sh = blob(0.36 * s / 0.78);
  return { g, tilt, cm, sh, s, h: 1.3 * s };
}

// ---------------------------------------------------------------- effect materials
const VS = `varying vec2 vUv; varying float vA; attribute float a; void main(){ vUv=uv; vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
function fxMat(color, frag, extra = {}) {
  return new THREE.ShaderMaterial({ uniforms: Object.assign({ col: { value: new THREE.Color(color) }, op: { value: 1 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, extra.uniforms || {}),
    vertexShader: extra.vs || `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: frag,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: extra.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
}
// a streak: bright at its head (v=1), gone at its tail (v=0); u across
const F_STREAK = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ float x=abs(vUv.x-0.5)*2.0; float a=pow(vUv.y,1.3)*(1.0-x*x)*op; vec3 c=mix(col,vec3(1.0),0.45*(1.0-x)); gl_FragColor=vec4(c*a, a); }`;
// a ribbon revealed between u0 and u1 along its length (v), soft across (u)
const F_RIB = `uniform vec3 col; uniform float op; uniform float u0; uniform float u1; varying vec2 vUv; void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.08,vUv.x)*(1.0-smoothstep(u1-0.02,u1,vUv.x)); float h=smoothstep(u0,u1,vUv.x); float a=s*(1.0-x*x)*op*(0.35+0.65*h); gl_FragColor=vec4(col*a,a); }`;
// a floor ring: soft band between inner and outer radius (RingGeometry uv is planar, so use the radius)
// a four-point glint on a contact: two thin rays and a small core
const F_STAR = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=max(exp(-abs(p.x)*16.0)*(1.0-abs(p.y)), exp(-abs(p.y)*16.0)*(1.0-abs(p.x))); a=max(0.0,a)*0.9+exp(-r*r*18.0)*0.7; a*=op*(1.0-smoothstep(0.8,1.0,r)); gl_FragColor=vec4(mix(col,vec3(1.0),0.4)*a,a); }`;
const F_RING = `uniform vec3 col; uniform float op; uniform float u0; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float w=max(0.02,u0); float a=smoothstep(1.0-w,1.0-w*0.5,r)*(1.0-smoothstep(0.97,1.0,r))*op; gl_FragColor=vec4(col*a,a); }`;
const F_DISC = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=(1.0-smoothstep(0.2,1.0,r))*op; gl_FragColor=vec4(col*a,a); }`;
const F_FLAT = `uniform vec3 col; uniform float op; varying vec2 vUv; void main(){ gl_FragColor=vec4(col*op,op); }`;

// streak geometry: two crossed quads along +z from 0 (tail, v=0) to 1 (head, v=1)
const streakGeo = (() => { const g = new THREE.BufferGeometry(); const P = [], U = [], I = [];
  const quad = (ax) => { const b = P.length / 3; for (const [s, v] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { P.push(ax === 0 ? s * 0.5 : 0, ax === 1 ? s * 0.5 : 0, v); U.push(s < 0 ? 0 : 1, v); } I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); };
  quad(0); quad(1); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; })();
const arrowGeo = (() => { // a slim arrow along +z, 1 u long, tip at z=0.5: shaft, head, three fletches
  const parts = [];
  const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5); shaft.rotateX(Math.PI / 2); parts.push([shaft, 0]);
  const head = new THREE.ConeGeometry(0.035, 0.12, 6); head.rotateX(Math.PI / 2); head.translate(0, 0, 0.47); parts.push([head, 1]);
  for (let k = 0; k < 3; k++) { const f = new THREE.PlaneGeometry(0.05, 0.16); f.translate(0.03, 0, -0.36); f.rotateZ(k * 2.094); parts.push([f, 2]); }
  const g = new THREE.BufferGeometry(); const P = [], N = [], Cc = [], I = []; const cols = [new THREE.Color('#8A6B4A'), new THREE.Color('#D9D4C8'), new THREE.Color('#E8E2D6')];
  for (const [pg, ci] of parts) { const ng = pg.index ? pg.toNonIndexed() : pg; ng.computeVertexNormals(); const b = P.length / 3; const pa = ng.attributes.position, na = ng.attributes.normal; for (let i = 0; i < pa.count; i++) { P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); N.push(na.getX(i), na.getY(i), na.getZ(i)); Cc.push(cols[ci].r, cols[ci].g, cols[ci].b); I.push(b + i); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setIndex(I); return g; })();
const arrowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);

// ---------------------------------------------------------------- numbers and captions are drawn in 2D over the card
// ---------------------------------------------------------------- the card runtime
const V3 = (a) => a && a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ZF = new THREE.Vector3(0, 0, 1);

export class Card {
  constructor(def, canvas) {
    this.def = def; this.cv = canvas; this.ctx = canvas.getContext('2d'); this.t = 0; this.built = false; this.visible = false;
  }
  setDef(def) { if (this.grp) scene.remove(this.grp); this.def = def; this.built = false; this.t = 0; }
  build() {
    const d = this.def; this.T = d.T; this.her = d.her || { x: 0, z: 0, face: 90 }; this.seq = d.seq || [];
    // root keys with every channel filled forward
    const R = (d.root || []).map((k) => ({ ...k })).sort((a, b) => a.t - b.t); let last = { fw: 0, sd: 0, y: 0, spin: 0, pitch: 0, roll: 0 };
    if (R.length && R[0].t > 0) R.unshift({ t: 0, ...last });
    for (const k of R) { for (const c of ['fw', 'sd', 'y', 'spin', 'pitch', 'roll']) if (k[c] == null) k[c] = last[c]; last = k; }
    this.rootK = R; this.tail = d.tail || null; this.ov = null; if (d.overlap !== false) buildOverlap(this);
    { const n0 = Math.ceil(this.T * 60) + 2, P = new Float32Array(n0); let q = rootAt(this, 0); for (let f = 1; f < n0; f++) { const r = rootAt(this, Math.min(this.T, f / 60)); P[f] = P[f - 1] + Math.hypot(r.x - q.x, r.z - q.z); q = r; } this.seq.path = P; this.lift = null; }
    this.grp = new THREE.Group(); this.grp.visible = false; scene.add(this.grp);
    // her tracks: sample once at 60 Hz so trails, arrows and kicks can read where her paws and bow were at any time
    const n = Math.ceil(this.T * 60) + 2; this.trk = {}; const names = ['footL', 'footR', 'handR', 'handL', 'chest', 'head', 'hips', 'weapon']; for (const k of names) this.trk[k] = new Float32Array(n * 3);
    this.trk.tipA = new Float32Array(n * 3); this.trk.tipB = new Float32Array(n * 3); this.trk.nock = new Float32Array(n * 3); this.trk.root = new Float32Array(n * 4);
    const loA = new THREE.Vector3(0.11, 0.906, 0), loB = new THREE.Vector3(0.11, 0.095, 0), loN = new THREE.Vector3(0.11, 0.5, 0);
    for (let f = 0; f < n; f++) { const t = f / 60; const r = placeHer(this, Math.min(t, this.T));
      for (const k of names) { her.b[k].getWorldPosition(tmpV); tmpV.toArray(this.trk[k], f * 3); }
      tmpV.copy(loA).applyMatrix4(her.b.weapon.matrixWorld).toArray(this.trk.tipA, f * 3); tmpV.copy(loB).applyMatrix4(her.b.weapon.matrixWorld).toArray(this.trk.tipB, f * 3); tmpV.copy(loN).applyMatrix4(her.b.weapon.matrixWorld).toArray(this.trk.nock, f * 3);
      this.trk.root[f * 4] = r.x; this.trk.root[f * 4 + 1] = r.z; this.trk.root[f * 4 + 2] = r.yaw; this.trk.root[f * 4 + 3] = r.y; }
    this.n = n;
    // keep her out of the floor: where a paw, a hand or her head would dip under it (a tilted spin, a low flip), her whole body rides up by that much, eased in and out
    if (d.ground !== false) { const Y = (k, f) => this.trk[k][f * 3 + 1], need = new Float32Array(n); let any = 0;
      for (let f = 0; f < n; f++) { need[f] = Math.max(0, 0.03 - Math.min(Y('footL', f), Y('footR', f)), 0.03 - Math.min(Y('handL', f), Y('handR', f)), (d.headMin != null ? d.headMin : 0.2) - Y('head', f), 0.1 - Y('hips', f)); any = Math.max(any, need[f]); }
      if (any > 0.012) { let a = new Float32Array(n), b = new Float32Array(n); for (let f = 0; f < n; f++) { let m = 0; for (let k = -4; k <= 4; k++) m = Math.max(m, need[clamp(f + k, 0, n - 1)]); a[f] = m; }
        for (let pass = 0; pass < 2; pass++) { for (let f = 0; f < n; f++) { let m = 0; for (let k = -3; k <= 3; k++) m += a[clamp(f + k, 0, n - 1)]; b[f] = m / 7; } [a, b] = [b, a]; }
        this.lift = a; for (const k in this.trk) if (k !== 'root') for (let f = 0; f < n; f++) this.trk[k][f * 3 + 1] += a[f]; } }
    // dummies
    this.dum = (d.dum || []).map((p, i) => { const m = makeDummy(p[2] && p[2].big, p[2] && p[2].face); this.grp.add(m.g); this.grp.add(m.sh); return { i, x: p[0], z: p[1], opt: p[2] || {}, m, hits: [], moves: [], launches: [] }; });
    // effects
    this.fx = []; this.nums = []; this.caps = []; this.shakes = [];
    this.stars = []; for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fxMat(C.parch, F_STAR)); m.visible = false; m.renderOrder = 5; this.grp.add(m); this.stars.push(m); }
    const api = this.api();
    for (const e of (d.ev || [])) (Array.isArray(e) ? e : [e]).forEach((x) => FX[x.k](api, x));
    if (d.fx) d.fx(api);
    // dummies' moves resolved in time order
    for (const dm of this.dum) { dm.moves.sort((a, b) => a.t - b.t); dm.launches.sort((a, b) => a.t - b.t); }
    // contact holds: when a paw or the bow really lands on a dummy the whole card almost stops for a few frames (game hit-stop)
    const pv = (nm, f) => new THREE.Vector3(this.trk[nm][f * 3], this.trk[nm][f * 3 + 1], this.trk[nm][f * 3 + 2]); const cand = [];
    for (const dm of this.dum) for (const h of dm.hits) { if (!h.melee || h.nostop) continue; const f = clamp(Math.round(h.t * 60), 2, n - 3); const p = this.dumPos(dm, h.t); let ok = !!h.stop;
      for (const nm of ['footL', 'footR', 'tipA', 'tipB']) { const q = pv(nm, f), sp = pv(nm, f + 1).distanceTo(pv(nm, f - 2)) * 20; if (Math.hypot(q.x - p.x, q.z - p.z) < 1.0 && sp > 3.2) ok = true; }
      if (ok) { h.contact = true; cand.push({ t: h.t, d: h.big ? 0.085 : 0.055 }); } }
    cand.sort((a, b) => a.t - b.t); this.stops = []; for (const c of cand) { const l = this.stops[this.stops.length - 1]; if (l && c.t - l.t < 0.16) l.d = Math.max(l.d, c.d); else this.stops.push({ ...c }); }
    if (d.stops === false) this.stops = [];
    this.Td = this.T + this.stops.reduce((a, c) => a + c.d * (1 - STOPK), 0);
    // a run paced by her travel: a puff of dust behind her at every landing of the bound
    for (const sg of this.seq) { const o = sg[2] || {}, g = her.gait[sg[1]], P = this.seq.path; if (!o.loop || (sg[1] !== 'run' && sg[1] !== 'gHipRun') || o.match === false || !(g > 0.2) || !P) continue; const L = ((o.to != null ? o.to : her.acts[sg[1]].T) - (o.from || 0)) * g;
      const f0 = Math.round(sg[0] * 60), f1 = Math.min(P.length - 1, Math.round(o.until * 60)); if (P[f1] - P[f0] <= 0.3) continue; let k = 0;
      for (let f = f0; f <= f1; f++) { const d = P[f] - P[f0]; if (d >= k * L) { k++; const tt = f / 60, r0 = rootAt(this, tt), r1 = rootAt(this, Math.min(this.T, tt + 0.05)); FX.dust(api, { t: tt, at: [r0.x, 0, r0.z], n: 3, sp: 0.8, r: 0.11, op: 0.26, dir: [r0.x - r1.x, r0.z - r1.z], seed: 90 + k }); } } }
    // her own landings kick up a little dust (harder from higher)
    if (d.landDust !== false) for (const l of this.lands || []) { if (l.v < 1.2) continue; const r0 = rootAt(this, l.t); FX.dust(api, { t: l.t, at: [r0.x, 0, r0.z], n: l.v > 5 ? 6 : 4, sp: 0.7 + Math.min(1.2, l.v * 0.08), r: 0.13, op: 0.32, seed: 71 }); }
    // dummies: dust where a launched one comes down, and along a hard shove
    for (const dm of this.dum) { let py = 0; dm.lands = []; for (let f = 1; f < n; f++) { const y = this.dumPos(dm, f / 60).y; if (py > 0.04 && y <= 0) dm.lands.push({ t: f / 60, v: py * 60 }); py = y; }
      for (const l of dm.lands) FX.dust(api, { t: l.t, at: () => { const p = this.dumPos(dm, l.t); return [p.x, 0, p.z]; }, n: l.v > 5 ? 7 : 4, sp: 1.0 + l.v * 0.08, r: 0.16 });
      for (const m of dm.moves) { const a = this.dumPos(dm, m.t), b = this.dumPos(dm, m.t + m.dur), L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 0.9 || L / m.dur < 3) continue;
        for (let k = 0; k < 3; k++) { const tk = m.t + m.dur * (0.15 + k * 0.3); FX.dust(api, { t: tk, at: () => { const p = this.dumPos(dm, tk); return [p.x, 0, p.z]; }, n: 2, sp: 0.5, r: 0.13, dir: [a.x - b.x, a.z - b.z], seed: 31 + k, op: 0.3 }); } } }
    this.built = true;
  }
  // ---- what the effects can use
  api() {
    const self = this;
    return {
      card: self, grp: self.grp, T: self.T, her: self.her,
      at(name, t) { const f = clamp(t, 0, self.T) * 60, i = Math.floor(f), u = f - i, A = self.trk[name], j = Math.min(self.n - 1, i + 1); return new THREE.Vector3(lerp(A[i * 3], A[j * 3], u), lerp(A[i * 3 + 1], A[j * 3 + 1], u), lerp(A[i * 3 + 2], A[j * 3 + 2], u)); },
      rootAt(t) { const f = Math.round(clamp(t, 0, self.T) * 60), R = self.trk.root; return { x: R[f * 4], z: R[f * 4 + 1], yaw: R[f * 4 + 2], y: R[f * 4 + 3] }; },
      fwd(t, deg = 0) { const r = this.rootAt(t); const y = r.yaw + deg * D2R; return new THREE.Vector3(Math.sin(y), 0, Math.cos(y)); },
      dpos(i, t) { return self.dumPos(self.dum[i], t); },
      hit(i, t, n, o = {}) { const dm = self.dum[i]; if (!dm) return; dm.hits.push({ t, n, dir: o.dir || null, big: !!o.big, crit: !!o.crit, melee: !('dir' in o) && n != null, arrow: ('dir' in o), stop: !!o.stop, nostop: !!o.nostop });
        if (n != null) self.nums.push({ t, i, n, big: o.big || o.crit, crit: !!o.crit, col: o.col });
        if (o.knock) this.move(i, t, o.knock, o.kdur || 0.28, o.ke || 'out');
        if (o.up) this.launch(i, t, o.up); if (o.stun) this.status(i, t, 'stun', o.stun); if (o.slow) this.status(i, t, 'slow', o.slow); },
      move(i, t, by, dur = 0.3, e = 's') { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.moves.push({ t, by, dur, e }); },
      moveTo(i, t, to, dur = 0.3, e = 's') { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.moves.push({ t, to, dur, e }); },
      down(i, t, dur = 1.2, dir = [1, 0]) { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; (dm.downs = dm.downs || []).push({ t, dur, dir }); },
      launch(i, t, h) { const dm = self.dum[i]; if (!dm || dm.opt.boss) return; dm.launches.push({ t, h }); },
      status(i, t, kind, dur) { FX.status(this, { i, t, kind, dur }); },
      add(o) { self.grp.add(o); return o; },
      fx(upd) { self.fx.push(upd); },
      cap(t0, t1, zh, en) { self.caps.push({ t0, t1, zh, en }); },
      shake(t, a = 0.06, dur = 0.18) { self.shakes.push({ t, a, dur }); },
      mat: fxMat, F: { STREAK: F_STREAK, RIB: F_RIB, RING: F_RING, DISC: F_DISC, FLAT: F_FLAT }, C, THREE, streakGeo, arrowGeo, arrowMat, ringGeo, EASE, sm, clamp, lerp, rng,
    };
  }
  // display time (with the contact holds) to card time
  warp(td) { let t = td, add = 0; for (const s of this.stops) { const a = s.t + add; if (td <= a) break; if (td < a + s.d) { t = s.t + (td - a) * STOPK; return t; } add += s.d * (1 - STOPK); t = td - add; } return Math.min(t, this.T); }
  dumPos(dm, t) {
    // pushes, pulls and carries in time order (a "to" move is resolved from where the dummy is when it starts)
    let x = dm.x, z = dm.z;
    for (const m of dm.moves) { if (t <= m.t) break; if (m.to && !m.by0) { const p = this.dumPosXZ(dm, m.t, m); m.by0 = [m.to[0] - p[0], m.to[1] - p[1]]; } const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; }
    // launches: each relaunch starts from the height it is at (free juggling)
    let y = 0, spin = 0;
    for (let k = 0; k < dm.launches.length; k++) { const L = dm.launches[k]; if (t < L.t) break; const y0 = k ? this.dumY(dm, L.t, k) : 0; const v = Math.sqrt(2 * G * L.h); const tau = t - L.t; const yy = y0 + v * tau - 0.5 * G * tau * tau; const nx = dm.launches[k + 1]; if (!nx || t < nx.t) { y = Math.max(0, yy); spin = yy > 0 ? tau * 7 : 0; } }
    return { x, z, y, spin };
  }
  dumPosXZ(dm, t, upto) { let x = dm.x, z = dm.z; for (const m of dm.moves) { if (m === upto || t <= m.t) break; const by = m.by0 || m.by; const u = EASE[m.e](clamp((t - m.t) / m.dur)); x += by[0] * u; z += by[1] * u; } return [x, z]; }
  dumY(dm, t, k) { let y = 0; for (let j = 0; j < k; j++) { const L = dm.launches[j]; const y0 = j ? this.dumY(dm, L.t, j) : 0; const v = Math.sqrt(2 * G * L.h), tau = t - L.t; y = Math.max(0, y0 + v * tau - 0.5 * G * tau * tau); } return y; }
  // ---- draw one frame of this card
  draw(t, lang) {
    const r = placeHer(this, t);
    for (const dm of this.dum) {
      const p = this.dumPos(dm, t); dm.m.g.position.set(p.x, p.y, p.z); dm.m.sh.position.set(p.x, 0.004, p.z); const sc = 1 / (1 + p.y); dm.m.sh.scale.setScalar(sc);
      // a hit flashes the canvas and rocks the dummy away from the blow
      let fl = 0, rx = 0, rz = 0;
      for (const h of dm.hits) { const a = t - h.t; if (a < 0 || a > 0.6) continue; fl = Math.max(fl, 1 - a / 0.14); let dx = h.dir ? h.dir[0] : p.x - r.x, dz = h.dir ? h.dir[1] : p.z - r.z; const l = Math.hypot(dx, dz) || 1; const amp = (h.big ? 0.4 : 0.26) * Math.exp(-a * 7) * Math.cos(a * 22); rx += (dz / l) * amp; rz += (-dx / l) * amp; }
      dm.m.cm.emissiveIntensity = 0.16 * Math.max(0, fl);
      if (dm.fellT != null && t > dm.fellT) { const a = t - dm.fellT; dm.m.g.visible = a < 0.9; rx += -1.4 * EASE.out(a / 0.35); dm.m.g.position.y -= Math.max(0, a - 0.35) * 1.2; } else dm.m.g.visible = true;
      // tripped or thrown: it goes over flat along the blow, bounces once, lies there, then rocks back up
      for (const dn of dm.downs || []) { const a = t - dn.t; if (a < 0 || a > dn.dur + 0.45) continue; const l = Math.hypot(dn.dir[0], dn.dir[1]) || 1;
        const k = a < dn.dur ? (a < 0.2 ? EASE.in(a / 0.2) : 1 - 0.1 * Math.exp(-(a - 0.2) * 9) * Math.abs(Math.sin((a - 0.2) * 16))) : 1 - sm((a - dn.dur) / 0.4) + 0.06 * Math.sin(clamp((a - dn.dur) / 0.45) * Math.PI * 2);
        rx += (dn.dir[1] / l) * k * 1.45; rz += (-dn.dir[0] / l) * k * 1.45; }
      dm.m.tilt.rotation.set(rx + (p.y > 0 ? Math.sin(p.spin) * 0.9 : 0), p.spin * 0.6, rz);
      let sqd = 0; for (const h of dm.hits) { const a = t - h.t; if (a >= 0 && a < 0.25 && h.n != null) sqd = Math.max(sqd, (h.big ? 0.1 : 0.06) * Math.exp(-a * 16) * Math.cos(a * 30)); }
      for (const l of dm.lands || []) { const a = t - l.t; if (a >= 0 && a < 0.4) sqd += clamp(l.v * 0.022, 0.04, 0.16) * Math.exp(-a / 0.08) * Math.cos(a * 22); }
      dm.m.tilt.scale.set(dm.m.s * (1 + sqd * 1.1), dm.m.s * (1 - sqd), dm.m.s * (1 + sqd * 1.1));
    }
    for (const f of this.fx) f(t);
    // camera: the game's view angle (52° down), framed on the card's spot; a small shake on heavy hits
    const cm = globalThis.__closeCam ? { x: her.root.position.x, z: her.root.position.z, w: globalThis.__closeCam } : (this.def.cam || { x: 0, z: 0, w: 9 }); const w = cm.w, el = (globalThis.__camEl || 52) * D2R, fov = 30; cam.fov = fov; cam.aspect = this.cv.width / this.cv.height; cam.updateProjectionMatrix();
    const dist = (w / cam.aspect) / (2 * Math.tan(fov * D2R / 2)) * 1.0 / Math.sin(globalThis.__camEl ? 52 * D2R : el) * 0.92;
    let sx = 0, sz = 0; for (const s of this.shakes) { const a = t - s.t; if (a >= 0 && a < s.dur) { const k = s.a * (1 - a / s.dur); sx += Math.sin(a * 90) * k; sz += Math.cos(a * 77) * k; } }
    const fx0 = cm.x + sx, fz0 = (cm.z || 0) + sz;
    { const az = (globalThis.__camAz || 0) * D2R; cam.position.set(fx0 + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, fz0 + Math.cos(az) * Math.cos(el) * dist); } cam.lookAt(fx0, globalThis.__closeCam ? 0.6 + her.lift.position.y - PIV : 0.4, fz0);
    // a glint where a blow or an arrow lands
    { let si = 0; for (const m of this.stars) m.visible = false;
      for (const dm of this.dum) for (const h of dm.hits) { const a = t - h.t; if (a < 0 || a > 0.13 || si >= this.stars.length || !(h.contact || h.arrow) || h.n == null) continue; const p = this.dumPos(dm, h.t), m = this.stars[si++], u = a / 0.13;
        tmpV.set(r.x - p.x, 0, r.z - p.z); const l = tmpV.length() || 1; m.visible = true; m.position.set(p.x + tmpV.x / l * 0.2, p.y + 0.62 * dm.m.s / 0.82 + ((h.t * 37) % 1 - 0.5) * 0.25, p.z + tmpV.z / l * 0.2 + 0.12);
        m.quaternion.copy(cam.quaternion); m.rotateZ((h.t * 91) % 1.57); m.scale.setScalar((h.big ? 1.0 : 0.62) * (0.55 + u * 0.9)); m.material.uniforms.op.value = (h.big ? 0.95 : 0.75) * (1 - u * u); } }
    this.grp.visible = true; renderer.render(scene, cam); this.grp.visible = false;
    const x = this.ctx, W = this.cv.width, H = this.cv.height; x.drawImage(renderer.domElement, 0, 0, W, H);
    // damage numbers
    const k = W / 640;
    for (let ni = 0; ni < this.nums.length; ni++) { const nm = this.nums[ni]; const a = t - nm.t; if (a < 0 || a > 0.85) continue; const p = this.dumPos(this.dum[nm.i], nm.t + Math.min(a, 0.1)); tmpV.set(p.x, p.y + this.dum[nm.i].m.h + 0.15 + a * 0.6, p.z).project(cam);
      const jx = (((ni * 0.6180339) % 1) - 0.5) * 46 * k, jy = (((ni * 0.381966) % 1) - 0.5) * 14 * k;
      const sx2 = (tmpV.x + 1) / 2 * W + jx, sy2 = (1 - tmpV.y) / 2 * H + jy, al = a < 0.6 ? 1 : 1 - (a - 0.6) / 0.25, pop = 1 + 0.35 * Math.max(0, 1 - a / 0.12);
      x.globalAlpha = al; x.font = `700 ${Math.round((nm.big ? 22 : 17) * k * pop)}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(20,18,16,0.85)';
      const s = String(nm.n) + (nm.crit ? '!' : ''); x.strokeText(s, sx2, sy2); x.fillStyle = nm.col || C.parch; x.fillText(s, sx2, sy2); x.globalAlpha = 1; }
    // the Tailwind count, top right: three feathers, lit as she holds them
    if (this.tail) { const n = this.tail(t); for (let i = 0; i < 3; i++) { const cx = W - (16 + (2 - i) * 20) * k, cy = 22 * k; x.save(); x.translate(cx, cy); x.rotate(0.5); x.beginPath(); x.moveTo(0, -11 * k); x.quadraticCurveTo(6 * k, 0, 0, 11 * k); x.quadraticCurveTo(-6 * k, 0, 0, -11 * k);
      x.fillStyle = i < n ? C.jade : 'rgba(244,239,230,0.18)'; x.fill(); x.restore(); } }
    // captions (in the page's language)
    let cnow = null; for (const c of this.caps) if (t >= c.t0 && t <= c.t1 && (!cnow || c.t0 >= cnow.t0)) cnow = c;
    for (const c of cnow ? [cnow] : []) { const s = lang === 'zh' ? c.zh : c.en; x.font = `600 ${Math.round(15 * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`; x.textAlign = 'left';
      const m = x.measureText(s).width; x.fillStyle = 'rgba(14,16,12,0.82)'; x.fillRect(10 * k, 10 * k, m + 18 * k, 26 * k); x.fillStyle = C.parch; x.fillText(s, 19 * k, 28 * k); }
  }
}

// ---------------------------------------------------------------- the effect kit
export const FX = {};
// a flying arrow: from her nock (or a point) to a point or a dummy; path straight or arced; a bone streak behind it
FX.arrow = (A, o) => {
  const t0 = o.t, dur = o.dur || 0.18, len = o.len || 0.7, col = (!o.col || o.col === C.jade || o.col === C.bone) ? C.gold : o.col, scale = o.scale || 1; // Blade comet: gold tail, core head (kit pick 3a)
  const m = A.add(new THREE.Mesh(arrowGeo, arrowMat)); m.scale.setScalar(0.8 * scale); m.visible = false;
  const st = A.add(new THREE.Mesh(streakGeo, fxMat(col, F_STREAK))); st.visible = false;
  const glow = o.glow ? A.add(new THREE.Mesh(streakGeo, fxMat(C.gold, F_STREAK))) : null; if (glow) glow.visible = false;
  const head = A.add(new THREE.Mesh(streakGeo, fxMat(C.core, F_STREAK))); head.visible = false;
  let P0 = null, P1 = null, ctrl = null;
  const from = () => { if (P0) return P0; P0 = Array.isArray(o.from) ? V3(o.from) : A.at(o.from || 'nock', t0).clone(); if (o.fromOff) P0.add(V3(o.fromOff)); return P0; };
  const jr = rng(Math.floor(t0 * 977 + (o.to && o.to.d != null ? o.to.d * 131 : 0) + 3)), jx = (jr() - 0.5) * 0.12, jy = (jr() - 0.5) * (o.to && o.to.y != null ? 0.1 : 0.3), jz = (jr() - 0.5) * 0.12;
  const to = (t) => { if (o.to && o.to.d != null) { const p = A.dpos(o.to.d, Math.min(t, t0 + dur)); return new THREE.Vector3(p.x + (o.to.dx || 0) + jx, p.y + (o.to.y != null ? o.to.y : 0.55) + jy, p.z + (o.to.dz || 0) + jz); }
    if (!P1) { if (Array.isArray(o.to)) P1 = V3(o.to); else { const f = A.fwd(t0, o.deg || 0); const s = from(); P1 = new THREE.Vector3(s.x + f.x * (o.range || 6), o.toY != null ? o.toY : s.y, s.z + f.z * (o.range || 6)); } } return P1; };
  const posAt = (u, t) => { const a = from(), b = to(t); const p = a.clone().lerp(b, u); if (o.arc) p.y += o.arc * 4 * u * (1 - u); if (o.side) { const d = b.clone().sub(a); const sd = new THREE.Vector3(-d.z, 0, d.x).normalize(); p.addScaledVector(sd, o.side * 4 * u * (1 - u)); } if (o.path) o.path(p, u, a, b); return p; };
  // hits as it passes the dummies listed
  if (o.pierce) for (const h of o.pierce) { const a = from(), b = to(t0), dd = b.clone().sub(a); const L = dd.length(); dd.normalize(); const pp = A.dpos(h.d, t0); const u = clamp(new THREE.Vector3(pp.x - a.x, 0, pp.z - a.z).dot(new THREE.Vector3(dd.x, 0, dd.z).normalize()) / (L * Math.hypot(dd.x, dd.z) || 1)); A.hit(h.d, t0 + dur * u, h.n, Object.assign({ dir: [dd.x, dd.z] }, h)); if (o.onPass) o.onPass(h, t0 + dur * u); }
  if (o.hits) for (const h of o.hits) { const u = h.u != null ? h.u : 1; A.hit(h.d, t0 + dur * u, h.n, Object.assign({ dir: h.dir }, h)); }
  const inDummy = o.to && o.to.d != null && !o.pierce; const stick = o.stick != null ? o.stick : inDummy ? 1.1 : 0; let dirHit = null;
  A.fx((t) => {
    const a = t - t0; m.visible = st.visible = head.visible = false; if (glow) glow.visible = false;
    if (a < 0) return;
    if (a > dur + stick + 0.25) return;
    let u = clamp(a / dur); const ue = o.ease ? EASE[o.ease](u) : u;
    const p = posAt(ue, t), q = posAt(Math.max(0, ue - 0.02), t); let dir = p.clone().sub(q); if (dir.lengthSq() < 1e-8) dir = to(t).clone().sub(from()); dir.normalize();
    if (a <= dur + stick) {
      m.visible = !(o.noHead); m.position.copy(p); tmpQ.setFromUnitVectors(ZF, dir); m.quaternion.copy(tmpQ);
      if (a > dur && inDummy) { // it stays in the dummy, shivers, rides it, then shrinks away
        if (!dirHit) { const e = posAt(1, t0 + dur), b4 = posAt(0.94, t0 + dur); dirHit = e.sub(b4).normalize(); if (dirHit.lengthSq() < 0.5) dirHit = dir.clone(); }
        const b = a - dur, pd = A.dpos(o.to.d, t), wob = 0.28 * Math.exp(-b * 8) * Math.sin(b * 48); const dw = dirHit.clone(); dw.y += wob; dw.normalize();
        m.position.set(pd.x + (o.to.dx || 0) + jx, pd.y + (o.to.y != null ? o.to.y : 0.55) + jy, pd.z + (o.to.dz || 0) + jz).addScaledVector(dw, -0.34 * scale); tmpQ.setFromUnitVectors(ZF, dw); m.quaternion.copy(tmpQ);
        m.scale.setScalar(0.8 * scale * clamp((stick - b) / 0.15)); }
    }
    // the streak: from where the arrow was a moment ago to where it is
    const fade = a > dur ? 1 - (a - dur) / 0.25 : 1; if (fade <= 0) return;
    const tail = posAt(Math.max(0, ue - (len / Math.max(0.5, from().distanceTo(to(t))))), t);
    const L = p.distanceTo(tail); if (L < 0.01) return;
    st.visible = true; st.position.copy(tail); st.quaternion.setFromUnitVectors(ZF, p.clone().sub(tail).normalize()); st.scale.set(o.w || 0.1, o.w || 0.1, L); st.material.uniforms.op.value = (o.op || 0.85) * fade;
    head.visible = true; const hl = Math.min(L, 0.3 * (o.scale || 1)); head.position.copy(p).addScaledVector(p.clone().sub(tail).normalize(), -hl); head.quaternion.copy(st.quaternion); head.scale.set((o.w || 0.1) * 0.75, (o.w || 0.1) * 0.75, hl); head.material.uniforms.op.value = 0.95 * fade;
    if (glow) { glow.visible = true; glow.position.copy(tail); glow.quaternion.copy(st.quaternion); glow.scale.set((o.w || 0.1) * 3.5, (o.w || 0.1) * 3.5, L * 1.1); glow.material.uniforms.op.value = 0.32 * fade; }
  });
  return { from, to, posAt };
};
// a ring on the floor that grows and fades
FX.ring = (A, o) => {
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.gold, F_RING))); m.visible = false; m.position.y = (o.y || 0.02);
  
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d;
    const at = typeof o.at === 'function' ? V3(o.at(t)) : o.at && o.at.d != null ? (() => { const p = A.dpos(o.at.d, t); return new THREE.Vector3(p.x, p.y + (o.at.y || 0), p.z); })() : o.at === 'her' ? (() => { const r = A.rootAt(t); return new THREE.Vector3(r.x, 0, r.z); })() : V3(o.at);
    m.position.set(at.x, at.y + (o.y || 0.02), at.z); if (o.dir) { const dv = typeof o.dir === 'function' ? o.dir(t) : V3(o.dir); m.quaternion.setFromUnitVectors(UP, dv.clone().normalize()); }
    const r = lerp(o.r0 != null ? o.r0 : 0.2, o.r1 || 1.5, EASE[o.e || 'out'](u)); m.scale.setScalar(r); m.material.uniforms.u0.value = o.w || 0.18; m.material.uniforms.op.value = (o.op || 0.9) * (1 - EASE.in(u)); });
};
FX.disc = (A, o) => { // a soft filled disc (a flash or a stain)
  const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.gold, F_DISC))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.3; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = typeof o.at === 'function' ? V3(o.at(t)) : V3(o.at); m.position.set(at.x, at.y + 0.03, at.z); m.scale.setScalar(lerp(o.r0 || 0.3, o.r1 || 1, EASE.out(u))); m.material.uniforms.op.value = (o.op || 0.5) * (1 - u); });
};
// a ribbon that follows a moving point (her foot, a bow tip): the last `len` seconds of its path
FX.trail = (A, o) => {
  const N = 28; const g = new THREE.BufferGeometry(); const P = new Float32Array(N * 2 * 3), U = new Float32Array(N * 2 * 2), I = [];
  for (let i = 0; i < N; i++) { U[i * 4] = i / (N - 1); U[i * 4 + 1] = 0; U[i * 4 + 2] = i / (N - 1); U[i * 4 + 3] = 1; if (i < N - 1) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.gold, F_RIB))); m.frustumCulled = false; m.visible = false;
  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), wid = o.w || 0.16, len = o.len || 0.16;
  const src2 = o.of2 ? (typeof o.of2 === 'function' ? o.of2 : (t) => A.at(o.of2, t)) : null;
  A.fx((t) => { m.visible = t >= o.t0 && t <= o.t1 + len; if (!m.visible) return; const te = Math.min(t, o.t1);
    for (let i = 0; i < N; i++) { const tt = Math.max(o.t0, te - len * (1 - i / (N - 1))); const p = src(tt); let q;
      if (src2) q = src2(tt); else { const p2 = src(Math.max(o.t0, tt - 1 / 60)); const d = p.clone().sub(p2); const s = new THREE.Vector3().crossVectors(d, UP); if (s.lengthSq() < 1e-8) s.set(1, 0, 0); s.normalize().multiplyScalar(wid * 0.5); q = p.clone().add(s); p.sub(s); }
      P[i * 6] = p.x; P[i * 6 + 1] = p.y; P[i * 6 + 2] = p.z; P[i * 6 + 3] = q.x; P[i * 6 + 4] = q.y; P[i * 6 + 5] = q.z; }
    g.attributes.position.needsUpdate = true; const fade = t > o.t1 ? 1 - (t - o.t1) / len : 1; m.material.uniforms.op.value = (o.op || 0.8) * fade; m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; });
};
// a tube along a fixed curve, revealed from start to end and then fading (spirals, crescents, ribbons, cords)
FX.tube = (A, o) => {
  const pts = o.pts(A); const curve = new THREE.CatmullRomCurve3(pts); const g = o.flat ? flatRibbon(curve, o.w || 0.2, o.seg || 64, o.up) : new THREE.TubeGeometry(curve, o.seg || 64, o.r || 0.03, 6, false);
  const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.jade, F_RIB))); m.visible = false; m.frustumCulled = false;
  if (!o.flat) { // tube uv: x along, y around -> make y soft by swapping
  }
  A.fx((t) => { const a = t - o.t; const d = o.dur || 0.3, hold = o.hold || 0, out = o.out || 0.25; m.visible = a >= 0 && a <= d + hold + out; if (!m.visible) return;
    const u1 = clamp(a / d), u0 = o.chase ? clamp((a - (o.chase)) / d) : 0; m.material.uniforms.u1.value = EASE[o.e || 'out'](u1) * 1.02; m.material.uniforms.u0.value = u0;
    m.material.uniforms.op.value = (o.op || 0.8) * (a > d + hold ? 1 - (a - d - hold) / out : 1); if (o.move) o.move(m, t, a); });
};
function flatRibbon(curve, w, seg, up) { const g = new THREE.BufferGeometry(); const P = [], U = [], I = []; const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const p = pts[i], q = pts[Math.min(seg, i + 1)], r = pts[Math.max(0, i - 1)]; const d = q.clone().sub(r).normalize(); const s = up ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3().crossVectors(d, UP).normalize(); const ww = typeof w === 'function' ? w(i / seg) : w;
    P.push(p.x - s.x * ww / 2, p.y - s.y * ww / 2, p.z - s.z * ww / 2, p.x + s.x * ww / 2, p.y + s.y * ww / 2, p.z + s.z * ww / 2); U.push(i / seg, 0, i / seg, 1); if (i < seg) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; }
FX.flatRibbon = flatRibbon;
// dust: a few soft grey puffs
FX.dust = (A, o) => { const R = rng(o.seed || 7); const n = o.n || 6;
  for (let k = 0; k < n; k++) { const ang = R() * 6.283, sp = (o.sp || 1.2) * (0.5 + R()), m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || '#B9B2A4', F_DISC, { normal: true }))); m.visible = false; const dl = R() * 0.06;
    A.fx((t) => { const a = t - o.t - dl, d = o.dur || 0.5; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const at = typeof o.at === 'function' ? V3(o.at(o.t)) : V3(o.at); const dir = o.dir ? new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize().multiplyScalar(0.6).add(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(0.4)) : new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      m.position.set(at.x + dir.x * sp * EASE.out(u) * 0.6, 0.05 + u * 0.25 * (o.rise || 1), at.z + dir.z * sp * EASE.out(u) * 0.6); m.scale.setScalar((o.r || 0.18) * (0.6 + u)); m.material.uniforms.op.value = (o.op || 0.35) * (1 - u); m.rotation.x = 0; }); } };
// a short-lived bright spark at a point (an arrow strike)
FX.spark = (A, o) => { const blade = !o.col || o.col === C.jade || o.col === C.bone || o.col === C.parch; // strike sparks are Blade (kit pick 3a)
  const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), fxMat(blade ? C.core : o.col, F_FLAT))); m.visible = false;
  const R = rng(Math.floor(o.t * 911) + 5), rays = []; if (blade) for (let k = 0; k < 5; k++) { const r = A.add(new THREE.Mesh(streakGeo, fxMat(C.gold, F_STREAK))); r.visible = false; const az = R() * 6.283, el = (R() - 0.3) * 1.2; rays.push([r, new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)), 0.6 + R() * 0.6]); }
  const atOf = () => typeof o.at === 'function' ? V3(o.at(o.t)) : o.at.d != null ? (() => { const p = A.dpos(o.at.d, o.t); return new THREE.Vector3(p.x, p.y + 0.55, p.z); })() : V3(o.at);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.12; m.visible = a >= 0 && a <= d; rays.forEach(([r]) => { r.visible = false; }); if (a < 0 || a > d * 1.8) return; const at = atOf();
    if (m.visible) { m.position.copy(at); m.scale.setScalar((o.r || 0.12) * (1 + a / d)); m.material.uniforms.op.value = (o.op || 0.8) * (1 - a / d); }
    const sc = (o.r || 0.12) / 0.12, u = a / (d * 1.8); rays.forEach(([r, v, sp]) => { const d0 = 0.08 * sc + 0.45 * sc * sp * EASE.out(u), L = 0.16 * sc * (1 - u * 0.6); r.visible = true; r.position.copy(at).addScaledVector(v, d0 - L); r.quaternion.setFromUnitVectors(ZF, v); r.scale.set(0.035 * sc, 0.035 * sc, L); r.material.uniforms.op.value = 0.75 * (1 - u); }); }); };
// status looks: stun stars, slow ring, marks
FX.status = (A, o) => {
  const dm = A.card.dum[o.i]; if (!dm) return;
  if (o.kind === 'stun') { const g = A.add(new THREE.Group()); for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: C.stun })); g.add(s); } g.visible = false;
    A.fx((t) => { const a = t - o.t; g.visible = a >= 0 && a <= o.dur; if (!g.visible) return; const p = A.dpos(o.i, t); g.position.set(p.x, p.y + dm.m.h + 0.12, p.z); g.children.forEach((s, k) => { const an = a * 6 + k * 2.094; s.position.set(Math.cos(an) * 0.22, 0, Math.sin(an) * 0.22); }); }); }
  if (o.kind === 'slow') { const m = A.add(new THREE.Mesh(ringGeo, fxMat(C.slow, F_RING))); m.visible = false;
    A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = A.dpos(o.i, t); m.position.set(p.x, 0.03, p.z); m.scale.setScalar(0.42 + 0.03 * Math.sin(a * 8)); m.material.uniforms.u0.value = 0.2; m.material.uniforms.op.value = 0.6 * Math.min(1, (o.dur - a) / 0.2); }); }
};

// a helix of jade threads round a line, revealed as the arrow flies along it
FX.helix = (A, o) => {
  const n = o.strands || 1;
  for (let k = 0; k < n; k++) FX.tube(A, { t: o.t, dur: o.dur || 0.2, hold: o.hold || 0.05, out: o.out || 0.3, col: o.col || C.jade, r: o.r2 || 0.018, op: o.op || 0.75, e: 'lin', chase: o.chase,
    pts: (A2) => { const a = V3(typeof o.from === 'function' ? o.from(A2) : o.from), b = V3(typeof o.to === 'function' ? o.to(A2) : o.to); const d = b.clone().sub(a); const L = d.length(); d.normalize();
      const s1 = new THREE.Vector3().crossVectors(d, UP); if (s1.lengthSq() < 1e-6) s1.set(1, 0, 0); s1.normalize(); const s2 = new THREE.Vector3().crossVectors(s1, d).normalize(); const P = []; const N = Math.max(24, Math.round(L * (o.turns || 2) * 10));
      for (let i = 0; i <= N; i++) { const u = i / N; const an = u * (o.turns || 2) * 6.283 + k * 6.283 / n; const r = (o.r || 0.18) * (o.taper ? lerp(o.taper, 1, u) : 1); P.push(a.clone().addScaledVector(d, L * u).addScaledVector(s1, Math.cos(an) * r).addScaledVector(s2, Math.sin(an) * r)); } return P; },
    move: o.spin ? (m, t, a) => { m.rotation.set(0, 0, 0); } : null });
};
// rings standing across a line (a wind tunnel), popping in order and fading
FX.tunnel = (A, o) => { const n = o.n || 5; for (let k = 0; k < n; k++) { const u = (k + 0.5) / n;
  FX.ring(A, { t: o.t + (o.dur || 0.2) * u, dur: o.life || 0.45, r0: (o.r || 0.4) * 0.6, r1: o.r || 0.4, w: 0.25, op: o.op || 0.7, col: o.col || C.jade,
    at: (t) => { const a = typeof o.from === 'function' ? o.from() : V3(o.from), b = typeof o.to === 'function' ? o.to() : V3(o.to); return a.clone().lerp(b, u); },
    dir: () => { const a = typeof o.from === 'function' ? o.from() : V3(o.from), b = typeof o.to === 'function' ? o.to() : V3(o.to); return b.sub(a); } });
} };
// an arrow standing where it struck (floor or dummy)
FX.stuck = (A, o) => { const m = A.add(new THREE.Mesh(arrowGeo, arrowMat)); m.scale.setScalar(0.8 * (o.scale || 1)); m.visible = false;
  A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= (o.dur || 1); if (!m.visible) return; const at = typeof o.at === 'function' ? V3(o.at(t)) : V3(o.at); const d = V3(o.dir).normalize(); m.position.copy(at).addScaledVector(d, -0.15); m.quaternion.setFromUnitVectors(ZF, d);
    if (o.shiver) m.rotateX(Math.sin(a * 60) * 0.06 * Math.exp(-a * 4)); m.scale.setScalar(0.8 * (o.scale || 1) * (a > (o.dur || 1) - 0.2 ? (o.dur - a) / 0.2 : 1)); }); };
// a dummy felled: it tips over and sinks away
FX.fell = (A, o) => { const dm = A.card.dum[o.d]; dm.fellT = o.t; };

// three jade feathers that close on a foe and then circle over it (a mark)
FX.reticle = (A, o) => { const g = A.add(new THREE.Group()); g.visible = false; const fs = [];
  for (let k = 0; k < 3; k++) { const f = featherMesh(); f.material = f.material.clone(); f.material.color.set(o.col || C.jade); f.scale.setScalar(0.32); g.add(f); fs.push(f); }
  A.fx((t) => { const a = t - o.t; g.visible = a >= 0 && a <= o.dur; if (!g.visible) return; const p = A.dpos(o.d, t); const dm = A.card.dum[o.d];
    const close = EASE.out(clamp(a / 0.25)), r = lerp(1.1, 0.42, close), y = lerp(0.6, dm.m.h + 0.25, clamp((a - 0.3) / 0.3));
    g.position.set(p.x, p.y + y, p.z); const fade = a > o.dur - 0.25 ? (o.dur - a) / 0.25 : 1;
    fs.forEach((f, k) => { const an = k * 2.094 + a * (a < 0.3 ? 1 : 2.2); f.position.set(Math.cos(an) * r, 0, Math.sin(an) * r); f.rotation.set(-Math.PI / 2, 0, -an + Math.PI / 2); f.material.opacity = 0.9 * fade * (a > 0.3 ? 0.75 : 1); f.scale.setScalar(a > 0.3 ? 0.2 : 0.32); }); }); };
// a loose arrow tossed through the air (spinning), from one moving point to another
FX.toss = (A, o) => { const m = A.add(new THREE.Mesh(arrowGeo, arrowMat)); m.scale.setScalar(0.8); m.visible = false;
  A.fx((t) => { const a = t - o.t0, d = o.t1 - o.t0; m.visible = a >= 0 && a <= d; if (!m.visible) return; const u = a / d; const f = V3(typeof o.from === 'function' ? o.from(o.t0) : o.from), e = V3(typeof o.to === 'function' ? o.to(Math.min(t, o.t1)) : o.to);
    m.position.copy(f).lerp(e, o.ease ? EASE[o.ease](u) : u); m.position.y += (o.arc || 0.6) * 4 * u * (1 - u); m.rotation.set(u * (o.spin || 2) * 6.283, o.yaw || 0, 0.3); if (o.endDir && u > 0.85) { m.quaternion.setFromUnitVectors(ZF, V3(o.endDir(t)).normalize()); } }); };
// a soft dark patch on the floor (the light dims round a foe)
FX.dim = (A, o) => { const m = A.add(new THREE.Mesh(ringGeo, fxMat('#000000', F_DISC, { normal: true }))); m.visible = false;
  A.fx((t) => { const a = t - o.t; m.visible = a >= 0 && a <= o.dur; if (!m.visible) return; const p = A.dpos(o.d, t); m.position.set(p.x, 0.012, p.z); m.scale.setScalar(o.r || 1.4); m.material.uniforms.op.value = (o.op || 0.35) * Math.min(1, a / 0.12, (o.dur - a) / 0.15); }); };
// floor dust drawn in toward a point (a draw that sucks the wind in)
FX.suck = (A, o) => { const R = rng(o.seed || 3); for (let k = 0; k < (o.n || 10); k++) { const ang = R() * 6.283, r0 = (o.r || 1.6) * (0.6 + 0.5 * R()), ph = R(), per = o.per || 0.45;
  const m = A.add(new THREE.Mesh(streakGeo, fxMat(o.col || '#BDB6A8', F_STREAK))); m.visible = false;
  A.fx((t) => { const a = t - o.t0; m.visible = a >= 0 && t <= o.t1; if (!m.visible) return; const at = V3(typeof o.at === 'function' ? o.at(t) : o.at); const u = ((a / per) + ph) % 1; const r = r0 * (1 - EASE.in(u)); const sw = ang + u * (o.swirl || 1.2);
    const p = new THREE.Vector3(at.x + Math.cos(sw) * r, (o.y != null ? o.y : 0.03) + (at.y - (o.y != null ? o.y : 0.03)) * u * (o.lift || 0), at.z + Math.sin(sw) * r); const q = new THREE.Vector3(at.x + Math.cos(sw - 0.25) * (r + 0.35), p.y, at.z + Math.sin(sw - 0.25) * (r + 0.35));
    m.position.copy(q); m.quaternion.setFromUnitVectors(ZF, p.clone().sub(q).normalize()); m.scale.set(0.05, 0.05, p.distanceTo(q)); m.material.uniforms.op.value = (o.op || 0.55) * Math.sin(u * Math.PI); }); } };

// arrows raining on a spot: each falls on a slant, stands in the floor a moment and fades; jade ripples where they land
FX.rain = (A, o) => { const R = rng(o.seed || 11), N = Math.round((o.t1 - o.t0) * (o.rate || 22)), fall = o.fall || 0.28, stand = o.stand || 0.35, pool = Math.min(N, Math.ceil((fall + stand) * (o.rate || 22)) + 4);
  const im = new THREE.InstancedMesh(arrowGeo, arrowMat, pool); im.frustumCulled = false; A.add(im);
  const sm2 = new THREE.InstancedMesh(streakGeo, fxMat(o.col || C.bone, F_STREAK, { vs: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }` }), pool); sm2.frustumCulled = false; A.add(sm2);
  const drops = []; for (let i = 0; i < N; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * (o.r || 1.4); drops.push({ t: o.t0 + i / (o.rate || 22) + R() * 0.03, x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  const sl = V3([o.slant ? o.slant[0] : 0.35, -1, o.slant ? o.slant[1] : 0.2]).normalize(), H = o.h || 4, M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const rip = []; for (let k = 0; k < 6; k++) { const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.rip || C.gold, F_RING))); m.visible = false; rip.push(m); }
  A.fx((t) => { let used = 0; for (let i = 0; i < pool; i++) { im.setMatrixAt(i, zero); sm2.setMatrixAt(i, zero); }
    const at = V3(typeof o.at === 'function' ? o.at(t) : o.at); rip.forEach((m) => m.visible = false); let ri = 0;
    for (const d of drops) { const a = t - d.t; if (a < 0 || a > fall + stand || used >= pool) continue; const land = new THREE.Vector3(at.x + d.x, 0, at.z + d.z);
      if (a < fall) { const u = a / fall; pos.copy(land).addScaledVector(sl, -(1 - u) * H); q.setFromUnitVectors(ZF, sl); M.compose(pos, q, sc.setScalar(0.75)); im.setMatrixAt(used, M);
        const L = Math.min(1.4, H * u + 0.2); M.compose(pos.clone().addScaledVector(sl, -L), q, sc.set(0.07, 0.07, L)); sm2.setMatrixAt(used, M); }
      else { const u = (a - fall) / stand; pos.copy(land).addScaledVector(sl, -0.14); q.setFromUnitVectors(ZF, sl); M.compose(pos, q, sc.setScalar(0.75 * (u > 0.7 ? (1 - u) / 0.3 : 1))); im.setMatrixAt(used, M);
        if (u < 0.5 && ri < rip.length) { const m = rip[ri++]; m.visible = true; m.position.set(land.x, 0.02, land.z); m.scale.setScalar(0.1 + u * 0.5); m.material.uniforms.u0.value = 0.3; m.material.uniforms.op.value = 0.5 * (1 - u * 2); } }
      used++; }
    im.instanceMatrix.needsUpdate = true; sm2.instanceMatrix.needsUpdate = true; }); };
// a slim jade twister: ribbons winding up and out, turning; small arrows ride round inside it
FX.twister = (A, o) => { const g = A.add(new THREE.Group()); g.visible = false; const H = o.h || 2.4, R = o.r || 1.0; const mats = [];
  for (let k = 0; k < (o.strands || 4); k++) { const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60, an = u * 6.283 * 2.2 + k * 6.283 / (o.strands || 4), r = R * (0.25 + 0.75 * u); pts.push(new THREE.Vector3(Math.cos(an) * r, u * H, Math.sin(an) * r)); }
    const m = new THREE.Mesh(flatRibbon(new THREE.CatmullRomCurve3(pts), (u) => 0.08 + 0.22 * u, 80, true), fxMat(o.col || C.jade, F_RIB)); g.add(m); mats.push(m.material); }
  const riders = []; for (let k = 0; k < (o.riders || 4); k++) { const m = new THREE.Mesh(arrowGeo, arrowMat); m.scale.setScalar(0.6); g.add(m); riders.push(m); }
  A.fx((t) => { const a = t - o.t0, d = o.t1 - o.t0; g.visible = a >= 0 && a <= d + 0.4; if (!g.visible) return; const at = V3(typeof o.at === 'function' ? o.at(t) : o.at); g.position.set(at.x, 0, at.z);
    const grow = EASE.out(clamp(a / 0.3)), out = a > d ? (a - d) / 0.4 : 0; g.rotation.y = -a * 7; g.scale.set(lerp(0.3, 1, grow), lerp(0.2, 1, grow) * (1 + out * 1.2), lerp(0.3, 1, grow));
    mats.forEach((m) => { m.uniforms.u0.value = out; m.uniforms.u1.value = 1; m.uniforms.op.value = (o.op || 0.6) * (1 - out); });
    riders.forEach((m, k) => { const an = k * 6.283 / riders.length, h = 0.5 + 0.35 * k; m.position.set(Math.cos(an) * R * 0.5, h, Math.sin(an) * R * 0.5); m.quaternion.setFromUnitVectors(ZF, new THREE.Vector3(-Math.sin(an), 0.15, Math.cos(an))); m.visible = out < 0.5; }); }); };
// her kestrel: a small wind bird made of a few jade planes that circles her
FX.kestrel = (A, o) => { const g = A.add(new THREE.Group()); const mat = new THREE.MeshBasicMaterial({ color: C.jade, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), mat); body.rotation.x = Math.PI / 2; g.add(body);
  const wing = (s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * 0.32, -0.06); sh.lineTo(s * 0.26, 0.05); sh.lineTo(0, 0.08); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); m.rotation.x = -Math.PI / 2; const p = new THREE.Group(); p.add(m); g.add(p); return p; };
  const wl = wing(1), wr = wing(-1); g.visible = false; o.api = g;
  A.fx((t) => { g.visible = t >= (o.t0 || 0) && t <= (o.t1 || 1e9); if (!g.visible) return; const r = A.rootAt(t); const P = o.pos ? o.pos(t) : null; let x, y, z, yaw;
    if (P) { x = P.x; y = P.y; z = P.z; yaw = P.yaw; } else { const an = t * (o.w || 2.2); x = r.x + Math.cos(an) * (o.r || 1.1); z = r.z + Math.sin(an) * (o.r || 1.1); y = o.y || 1.5; yaw = -an; }
    g.position.set(x, y, z); g.rotation.set(0, yaw, 0); const fl = Math.sin(t * 22) * 0.7; wl.rotation.z = fl; wr.rotation.z = -fl; }); };
FX.cap = (A, o) => A.cap(o.t0, o.t1, o.zh, o.en);
FX.shake = (A, o) => A.shake(o.t, o.a, o.dur);
FX.hit = (A, o) => A.hit(o.d, o.t, o.n, o);

// ---------------------------------------------------------------- the page loop
const cards = []; let speed = 1, lang = 'zh', last = 0, paused = false;
export function setSpeed(s) { speed = s; }
export function setLang(l) { lang = l; }
export function addCard(def, canvas) { const c = new Card(def, canvas); cards.push(c); return c; }
export function cardsList() { return cards; }
export function stepCard(c, t) { if (!c.built) c.build(); c.t = t; c.draw(t, lang); }
export function start() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { const c = cards.find((k) => k.cv === e.target); if (c) c.visible = e.isIntersecting; }), { rootMargin: '120px' });
  cards.forEach((c) => io.observe(c.cv));
  const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (!her.ready) return;
    for (const c of cards) { if (!c.visible) continue; if (!c.built) c.build(); if (renderer.domElement.width !== c.cv.width || renderer.domElement.height !== c.cv.height) renderer.setSize(c.cv.width, c.cv.height, false);
      if (!c.paused) c.t = (c.t + dt * speed * (c.def.rate || 1)) % (c.Td || c.T); c.draw(c.warp ? c.warp(c.t) : c.t, lang); } };
  requestAnimationFrame(loop);
}
export { renderer, scene, cam, her, C, S };
// knee audit (tools only): her pose at time t of a card, and how far the knees bent
export function kneeProbe(card, t) { if (!card.built) card.build(); placeHer(card, t); const k = her.knees.stats; return { bend: k.bend, lift: k.lift }; }
