import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Vector3, Quaternion, Matrix4 } from 'three';
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
const buf = fs.readFileSync('public/review/fox-tripo-rigged.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const [ex, ey, ez, hx, hy, hz, fxx, fyy, fzz] = process.argv.slice(2).map(Number);
new GLTFLoader().parse(ab, '', (g) => {
  const m = g.scene;
  const mx = new AnimationMixer(m);
  mx.clipAction(g.animations.find((c) => c.name === 'idle')).play(); mx.update(0); m.updateMatrixWorld(true);
  const B = (n) => m.getObjectByName(n);
  const W = (o) => { const p = new Vector3(); o.getWorldPosition(p); return p; };
  const S = W(B('upperarmL'));
  const lu = W(B('forearmL')).distanceTo(S), lf = W(B('handL')).distanceTo(W(B('forearmL')));
  const E = new Vector3(ex, ey, ez).normalize().multiplyScalar(lu).add(S);
  const H = new Vector3(hx, hy, hz).normalize().multiplyScalar(lf).add(E);
  const roll = process.argv.slice(11).map(Number);
  const out = {};
  const aim = (n, child, target, rollDeg) => {
    const o = B(n); m.updateMatrixWorld(true);
    const P = W(o), C = W(B(child));
    const dq = new Quaternion().setFromUnitVectors(C.clone().sub(P).normalize(), target.clone().sub(P).normalize());
    const wq = new Quaternion(); o.getWorldQuaternion(wq);
    const rq = new Quaternion().setFromAxisAngle(target.clone().sub(P).normalize(), (rollDeg || 0) * Math.PI / 180);
    const nw = rq.multiply(dq).multiply(wq);
    const pq = new Quaternion(); o.parent.getWorldQuaternion(pq);
    o.quaternion.copy(pq.invert().multiply(nw)); o.updateMatrixWorld(true);
    out[n] = o.quaternion.toArray().map((v) => +v.toFixed(4));
  };
  const F = new Vector3(fxx, fyy, fzz).normalize().multiplyScalar(W(B('fingersL')).distanceTo(W(B('handL')))).add(H);
  aim('upperarmL', 'forearmL', E, roll[0]);
  aim('forearmL', 'handL', H, roll[1]);
  aim('handL', 'fingersL', F, roll[2]);
  m.updateMatrixWorld(true);
  for (const n of ['forearmL', 'handL', 'fingersL']) { const p = W(B(n)); console.log(n, p.toArray().map((v) => v.toFixed(3)).join(' ')); }
  console.log(JSON.stringify(out));
}, (e) => console.error('ERR', e));
