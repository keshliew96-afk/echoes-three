// REVIEW-ONLY (never committed, never pushed): draws the passed Tripo Stonehide
// model in place of the code-built Tank rig when the URL carries ?tripo=1, so his
// redesigned kit (STONEHIDE_SKILL_KIT.md 1.1) can be recorded during the feature
// freeze. The sim review module (src/sim/reviewStonehide.js) tells this rig what
// to play through `review_sh_*` events; the body bits his kit grows (Stone
// patches, iron thorns, the ore glow) are stand-ins built here.
import { AnimationMixer, Color, ConeGeometry, Euler, Group, IcosahedronGeometry, LoopOnce, LoopRepeat, Matrix4, Mesh, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

let gltfP = null;
const load = () => (gltfP ??= new GLTFLoader().loadAsync('/review/tank-tripo-moves.glb'));
export const tripoOn = () => typeof location !== 'undefined' && /[?&]tripo=1\b/.test(location.search);

const D = Math.PI / 180;
const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// A clip with Euler deltas laid over chosen bones (weight w(t) in 0..1); the
// weapon's tracks are dropped (his shieldless set hides the slab).
function overlay(src, name, deltas, w = () => 1, { dropWeapon = true } = {}) {
  const c = src.clone();
  c.name = name;
  if (dropWeapon) c.tracks = c.tracks.filter((t) => !t.name.startsWith('weapon.'));
  const e = new Euler(), q = new Quaternion(), q2 = new Quaternion();
  for (const tr of c.tracks) {
    const [bn, prop] = tr.name.split('.');
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

// The left arm takes the right arm's motion, mirrored (x -> -x), half a cycle
// late on a loop: with the slab gone both paws swing as fists.
function mirrorLeft(c, half) {
  const T = c.duration;
  const byName = Object.fromEntries(c.tracks.map((t) => [t.name, t]));
  for (const [r, l] of [['upperarmR', 'upperarmL'], ['forearmR', 'forearmL'], ['handR', 'handL'], ['fingersR', 'fingersL']]) {
    const tr = byName[`${r}.quaternion`];
    if (!tr) continue;
    const times = tr.times.slice();
    const vals = new Float32Array(tr.values.length);
    const tmp = new Quaternion();
    const it = tr.createInterpolant();
    for (let i = 0; i < times.length; i++) {
      const tt = half ? (times[i] + T / 2) % T : times[i];
      const v = it.evaluate(tt);
      tmp.set(v[0], -v[1], -v[2], v[3]);
      vals.set([tmp.x, tmp.y, tmp.z, tmp.w], i * 4);
    }
    const old = byName[`${l}.quaternion`];
    if (old) c.tracks.splice(c.tracks.indexOf(old), 1);
    c.tracks.push(new QuaternionKeyframeTrack(`${l}.quaternion`, times, vals));
  }
  return c;
}

// Both fists (the shieldless combo's third hit): over a window the left arm
// takes the right arm's motion, mirrored.
function hammer(c, w) {
  const by = Object.fromEntries(c.tracks.map((t) => [t.name, t]));
  const a = new Quaternion(), b = new Quaternion();
  for (const [r, l] of [['upperarmR', 'upperarmL'], ['forearmR', 'forearmL'], ['handR', 'handL'], ['fingersR', 'fingersL']]) {
    const tr = by[`${r}.quaternion`], tl = by[`${l}.quaternion`];
    if (!tr || !tl) continue;
    const it = tr.createInterpolant();
    for (let i = 0; i < tl.times.length; i++) {
      const k = w(tl.times[i]);
      if (k <= 0) continue;
      const v = it.evaluate(tl.times[i]);
      b.set(v[0], -v[1], -v[2], v[3]);
      a.fromArray(tl.values, i * 4).slerp(b, k).toArray(tl.values, i * 4);
    }
  }
}

const LOCO = ['idle', 'walk', 'walkBack', 'walkLeft', 'walkRight', 'run', 'runBack', 'runLeft', 'runRight'];
const UPPER_ONLY = new Set(['maul', 'grudgeBrace']); // his legs keep walking under these
const UP = /^(spine|chest|head|ear|upperarm|forearm|hand|fingers)/;
const LOW = /^(root|hips|leg|foot|tail)/;

// Stone patch spots (bone, local position, size): eight, laid in the order they
// turn to stone. Iron thorn spots: his back and shoulders.
const STONE = [
  ['chest', [0.0, 0.03, -0.25], 1.15],
  ['chest', [0.2, 0.06, -0.1], 0.95],
  ['chest', [-0.2, 0.06, -0.1], 0.95],
  ['spine', [0.0, 0.0, -0.27], 1.1],
  ['upperarmL', [0.06, -0.04, 0.0], 0.8],
  ['upperarmR', [-0.06, -0.04, 0.0], 0.8],
  ['hips', [0.12, 0.02, -0.24], 0.9],
  ['head', [0.0, 0.17, -0.05], 0.75],
];
const THORN = [
  ['chest', [0.0, 0.12, -0.2], [-55, 0, 0], 1.25],
  ['chest', [0.09, 0.08, -0.22], [-60, 0, -20], 1.0],
  ['chest', [-0.09, 0.08, -0.22], [-60, 0, 20], 1.0],
  ['spine', [0.0, 0.05, -0.27], [-75, 0, 0], 1.1],
  ['spine', [0.11, 0.0, -0.24], [-75, 0, -25], 0.9],
  ['spine', [-0.11, 0.0, -0.24], [-75, 0, 25], 0.9],
  ['chest', [0.19, 0.12, -0.08], [-20, 0, -55], 0.95],
  ['chest', [-0.19, 0.12, -0.08], [-20, 0, 55], 0.95],
  ['hips', [0.0, 0.06, -0.26], [-85, 0, 0], 0.8],
  ['upperarmL', [0.07, 0.0, -0.04], [-30, 0, -70], 0.7],
  ['upperarmR', [-0.07, 0.0, -0.04], [-30, 0, 70], 0.7],
];

export function attachTripoTank({ yawGroup, rig, group }) {
  const st = { model: null, mixer: null, A: {}, act: null, actT: 0, actEnd: 0, loco: 0, run: 0, last: null, shield: true, sink: 0, hidden: false };
  rig.visible = false;
  if (typeof window !== 'undefined') { window.__tripoTank = st; (window.__tripoTankSts ||= []).push(st); }
  const inner = new Group(); // sinks into the floor for the Dig
  yawGroup.add(inner);
  const stones = [], thorns = [];
  const stoneMat = new MeshStandardMaterial({ color: '#8E8B85', roughness: 1, flatShading: true });
  const ironMat = new MeshStandardMaterial({ color: '#3B4046', roughness: 0.55, metalness: 0.6, flatShading: true, emissive: new Color('#9DB8CF'), emissiveIntensity: 0 });
  const want = { stone: 0, thorns: 0, ore: 0, rust: 0, stoneSkin: 0 };
  const have = { thorns: 0, ore: 0, rust: 0, stoneSkin: 0 };
  let skinMats = null;
  const RUST = new Color('#7A4E36'), STONEC = new Color('#8E8B85');

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
    for (const c of g.animations) clips[c.name] = c;
    addClips(clips);
    for (const name in clips) st.A[name] = st.mixer.clipAction(clips[name]);
    for (const n of LOCO) for (const p of ['', 'c_', 'lb_']) {
      const a = st.A[p + n];
      if (!a) continue;
      a.setLoop(LoopRepeat, Infinity).play();
      a.setEffectiveWeight(0);
    }
    st.weapon = m.getObjectByName('weapon');
    st.handL = m.getObjectByName('handL');
    m.updateMatrixWorld(true);
    st.G = new Matrix4().copy(st.handL.matrixWorld).invert().multiply(st.weapon.matrixWorld);
    // body bits
    for (const [bn, p, s] of STONE) {
      const geo = new IcosahedronGeometry(0.075, 0);
      geo.scale(1.25 * s, 0.55 * s, 1.0 * s);
      const mesh = new Mesh(geo, stoneMat);
      const b = m.getObjectByName(bn);
      mesh.position.set(...p);
      // lie flat on the hide: its thin axis along the bone-to-spot direction
      const dir = new Vector3(...p).normalize();
      mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
      mesh.scale.setScalar(0.001);
      mesh.visible = false;
      b.add(mesh);
      stones.push({ mesh, k: 0, want: 0 });
    }
    for (const [bn, p, r, s] of THORN) {
      const geo = new ConeGeometry(0.03 * s, 0.17 * s, 5);
      geo.translate(0, 0.085 * s, 0);
      const mesh = new Mesh(geo, ironMat);
      mesh.position.set(...p);
      mesh.rotation.set(r[0] * D, r[1] * D, r[2] * D);
      mesh.scale.setScalar(0.001);
      mesh.visible = false;
      m.getObjectByName(bn).add(mesh);
      thorns.push(mesh);
    }
    skinMats = [];
    m.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive && o.name !== 'weapon') {
        o.material = o.material.clone();
        skinMats.push({ m: o.material, e: o.material.emissive.clone(), c: o.material.color.clone() });
      }
    });
  });

  // ---- the moves. Every skill move is baked into the review GLB (tools/motion:
  // the model page's own build, 60 fps, with follow-through, springs, the slab
  // kept out of his body and planted feet locked). Here: the upper-body moves are
  // cut down to the trunk and arms, the walks get lower-body copies to run under
  // them, and the shieldless set (Bare Claws) is derived.
  function addClips(C) {
    for (const n of UPPER_ONLY) {
      if (!C[n]) continue;
      C[n] = C[n].clone();
      C[n].tracks = C[n].tracks.filter((t) => UP.test(t.name.split('.')[0]));
    }
    for (const n of LOCO) {
      if (!C[n]) continue;
      const c = C[n].clone();
      c.name = 'lb_' + n;
      c.tracks = c.tracks.filter((t) => LOW.test(t.name.split('.')[0]));
      C['lb_' + n] = c;
    }
    // THE SHIELDLESS SET (the Feral talent Bare Claws): the slab is hidden; the
    // left paw takes the right's fist swing on the walks and runs; hit 3 of the
    // combo brings both fists down; the dash is a shoulder ram.
    for (const n of LOCO) {
      if (!C[n]) continue;
      const c = overlay(C[n], 'c_' + n, {}, () => 1);
      C['c_' + n] = mirrorLeft(c, n !== 'idle');
      // claws out: a little hunch and the paws forward
      C['c_' + n] = overlay(C['c_' + n], 'c_' + n, { spine: [6, 0, 0], head: [-5, 0, 0], upperarmL: [-14, 0, 6], upperarmR: [-14, 0, -6] });
    }
    for (const n of Object.keys(C)) if (!LOCO.includes(n) && !/^(c_|lb_)/.test(n) && n !== 'dash') C['c_' + n] = overlay(C[n], 'c_' + n, {});
    if (C.c_combo) hammer(C.c_combo, (t) => sm(0.98, 1.12, t) * (1 - sm(1.85, 2.1, t)));
    // the ram: the trunk turns so the left shoulder leads, the left arm tucks in
    const ramW = (t) => sm(0.06, 0.16, t) * (1 - sm(0.8, 1.0, t));
    C.c_dash = overlay(C.dash, 'c_dash', { spine: [0, 22, 0], chest: [0, 24, 0], head: [0, -36, 0], upperarmL: [40, 0, 26], forearmL: [-40, 0, 0], upperarmR: [30, 0, -20], forearmR: [-50, 0, 0] }, ramW);
    // the slab held up (Slabguard): the guard's held upper body, laid over the
    // walk after the mixer runs, so the legs keep walking
    const g = C.guardUp;
    if (g) {
      const at = 0.4;
      slabPose = [];
      for (const tr of g.tracks) {
        const [bn, prop] = tr.name.split('.');
        if (!UP.test(bn) || prop !== 'quaternion') continue;
        const v = tr.createInterpolant().evaluate(at);
        slabPose.push({ bn, prop, v: new Quaternion(v[0], v[1], v[2], v[3]) });
      }
    }
  }
  let slabPose = null;
  const SLAB_YAW = 0;

  function start(name, { from = 0, speed = 1, end = null } = {}) {
    const nm = !st.shield && st.A['c_' + name] ? 'c_' + name : name;
    const a = st.A[nm];
    if (!a) return;
    if (st.act && st.act !== a) st.act.stop();
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = speed;
    a.time = from;
    a.play();
    st.act = a;
    st.actName = name;
    st.actT = 0;
    st.actEnd = end ?? a.getClip().duration;
    st.attachSlab = UPPER_ONLY.has(name); // an upper-body move carries no slab tracks: the slab rides the left paw
  }

  // dig state: 'down' (sinking), 'under' (hidden), 'up' (bursting)
  const dig = { state: null, t: 0 };
  let dashT = -1, dashFace = null;
  const hop = { t: -1, secs: 0.4 }, grow = { k: 1, from: 1, to: 1, t: -1, secs: 0.5 }, slab = { on: false, w: 0, rip: false };
  st.dbg = { hop, grow, slab, pose: () => slabPose };
  function cue(kind, ev) {
    if (!st.model) return;
    if (kind === 'play') start(ev.clip, ev);
    else if (kind === 'dash') {
      start('dash', {});
      dashFace = Math.atan2(ev.dx, ev.dz);
      dashT = 0;
    } else if (kind === 'dig') {
      dig.state = ev.phase;
      dig.t = 0;
      if (ev.phase === 'down') start('digDown');
      if (ev.phase === 'up') start('digUp');
    } else if (kind === 'look') Object.assign(want, ev);
    else if (kind === 'hop') {
      start('hop');
      hop.t = 0;
      hop.secs = ev.secs || 0.4;
    } else if (kind === 'grow') {
      grow.from = grow.k;
      grow.to = ev.scale;
      grow.t = 0;
      grow.secs = ev.secs || 0.5;
    } else if (kind === 'slab') {
      if (ev.on) {
        slab.on = true;
        slab.yaw = null;
        slab.rip = !!ev.rip;
        if (slab.rip && st.weapon) {
          // Bare Claws: a slab ripped out of the floor, stone instead of iron
          slab.mats = [];
          st.weapon.traverse((o) => { if (o.isMesh) { slab.mats.push([o, o.material]); o.material = stoneMat; } });
          st.weapon.visible = true;
        }
      } else {
        slab.on = false;
        if (slab.rip && st.weapon) {
          st.weapon.visible = st.shield;
          for (const [o, m] of slab.mats || []) o.material = m;
          slab.rip = false;
        }
      }
    } else if (kind === 'slabaway') {
      // Slab Throw: the slab is out of his paw until it comes back
      st.away = !!ev.on;
      if (st.weapon) st.weapon.visible = st.shield && !st.away;
    } else if (kind === 'shield') {
      st.shield = !!ev.on;
      if (st.weapon) st.weapon.visible = st.shield && !st.away;
    }
  }

  function setSkin(rust, stone) {
    if (!skinMats) return;
    for (const s of skinMats) {
      s.m.emissive.copy(s.e).lerp(RUST, rust * 0.35);
      s.m.color.copy(s.c).lerp(STONEC, stone * 0.55);
    }
  }

  function update(dt) {
    st.lastDt = dt;
    const p = group.position;
    let vx = 0, vz = 0;
    if (st.last && dt > 0) {
      vx = (p.x - st.last.x) / dt;
      vz = (p.z - st.last.z) / dt;
    }
    st.last = { x: p.x, z: p.z };
    if (!st.model) return;
    // dash facing (the model page: he turns to face where he charges)
    let wantYaw = 0;
    if (dashT >= 0) {
      dashT += dt;
      if (dashT < 1.0 && dashFace != null) {
        const dy = dashFace - yawGroup.rotation.y;
        wantYaw = Math.atan2(Math.sin(dy), Math.cos(dy));
      }
      if (dashT > 1.3) dashT = -1;
    }
    // Slabguard: he turns side-on so the slab on his left arm faces the aim
    if (slab.on && dashT < 0 && slab.yaw != null) wantYaw = slab.yaw;
    st.model.rotation.y += (wantYaw - st.model.rotation.y) * Math.min(1, dt * (wantYaw ? 30 : 12));
    // dig: sink, hide, burst
    if (dig.state) {
      dig.t += dt;
      if (dig.state === 'down') inner.position.y = -1.15 * sm(0.1, 0.3, dig.t);
      else if (dig.state === 'under') {
        inner.position.y = -1.3;
        inner.visible = false;
      } else if (dig.state === 'up') {
        inner.visible = true;
        const u = dig.t;
        inner.position.y = u < 0.12 ? -0.9 + 1.1 * sm(0, 0.12, u) : 0.2 * (1 - sm(0.12, 0.28, u));
        if (u > 0.4) {
          dig.state = null;
          inner.position.y = 0;
        }
      }
    }
    // hop: a parabola under the clip, launched after the short crouch
    if (hop.t >= 0) {
      hop.t += dt;
      const u = Math.min(1, Math.max(0, (hop.t - 0.04) / hop.secs));
      if (!dig.state) inner.position.y = 0.5 * 4 * u * (1 - u);
      if (hop.t > hop.secs + 0.05) {
        hop.t = -1;
        if (!dig.state) inner.position.y = 0;
      }
    }
    // Colossus: he grows, and later shrinks, over half a second (a small overshoot)
    if (grow.t >= 0) {
      grow.t += dt;
      const u = Math.min(1, grow.t / grow.secs);
      const e = u * u * (3 - 2 * u) + 0.12 * Math.sin(Math.PI * u) * (grow.to > grow.from ? 1 : 0.4);
      grow.k = grow.from + (grow.to - grow.from) * e;
      if (u >= 1) {
        grow.k = grow.to;
        grow.t = -1;
      }
      inner.scale.setScalar(grow.k);
    }
    // locomotion weights: walk or run, by the heading against the facing
    const speed = Math.hypot(vx, vz);
    const yaw = yawGroup.rotation.y + st.model.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const fwd = (vx * fx + vz * fz) / (speed || 1), side = (vx * fz - vz * fx) / (speed || 1);
    const moving = speed > 0.35 && dashT < 0 && !dig.state;
    st.loco += ((moving ? 1 : 0) - st.loco) * Math.min(1, dt * 10);
    st.run += ((speed > 2.4 ? 1 : 0) - st.run) * Math.min(1, dt * 6);
    let aw = 0;
    if (st.act) {
      st.actT += dt;
      const left = (st.actEnd - st.act.time) / Math.max(0.1, st.act.timeScale);
      aw = Math.min(1, st.actT / 0.06) * Math.min(1, left / 0.16);
      if (left <= 0.001) {
        st.act.stop();
        st.act = null;
        st.actName = null;
        aw = 0;
      } else st.act.setEffectiveWeight(aw);
    }
    const dirW = { '': Math.max(0, fwd), Back: Math.max(0, -fwd), Left: Math.max(0, side), Right: Math.max(0, -side) };
    const sum = dirW[''] + dirW.Back + dirW.Left + dirW.Right || 1;
    const P = st.shield ? '' : 'c_';
    for (const pre of ['', 'c_']) {
      const on = pre === P ? 1 : 0;
      const idle = st.A[pre + 'idle'];
      if (idle) idle.setEffectiveWeight(on * (1 - st.loco) * (1 - aw));
      for (const d of ['', 'Back', 'Left', 'Right']) {
        const k = on * st.loco * (1 - aw) * (dirW[d] / sum);
        const wa = st.A[pre + 'walk' + d], ra = st.A[pre + 'run' + d];
        if (wa) wa.setEffectiveWeight(k * (1 - st.run));
        if (ra) ra.setEffectiveWeight(k * st.run);
      }
    }
    // the legs keep walking (or standing) under an upper-body move
    const lay = st.act && UPPER_ONLY.has(st.actName) ? aw : 0;
    if (st.A.lb_idle) st.A.lb_idle.setEffectiveWeight(lay * (1 - st.loco));
    for (const d of ['', 'Back', 'Left', 'Right']) {
      const k = lay * st.loco * (dirW[d] / sum);
      const wa = st.A['lb_walk' + d], ra = st.A['lb_run' + d];
      if (wa) wa.setEffectiveWeight(k * (1 - st.run));
      if (ra) ra.setEffectiveWeight(k * st.run);
    }
    st.mixer.update(dt);
    if (st.weapon && st.act && st.attachSlab) {
      st.model.updateMatrixWorld(true);
      const m = new Matrix4().copy(st.weapon.parent.matrixWorld).invert().multiply(st.handL.matrixWorld).multiply(st.G);
      m.decompose(st.weapon.position, st.weapon.quaternion, st.weapon.scale);
    }
    // the slab held up over the walk
    slab.w += ((slab.on ? 1 : 0) - slab.w) * Math.min(1, dt * 12);
    if (slabPose && slab.w > 0.01 && !(st.act && st.actName === 'guardUp' && st.actT < 0.3)) {
      for (const p of slabPose) {
        const o = st.model.getObjectByName(p.bn);
        if (!o) continue;
        o.quaternion.slerp(p.v, slab.w);
      }
      // the slab rides the left paw, as in the runtime clips
      if (st.weapon) {
        st.model.updateMatrixWorld(true);
        const m = new Matrix4().copy(st.weapon.parent.matrixWorld).invert().multiply(st.handL.matrixWorld).multiply(st.G);
        m.decompose(st.weapon.position, st.weapon.quaternion, st.weapon.scale);
        // the held pose twists his chest: turn the body so the slab sits toward the aim
        if (slab.yaw == null && slab.w > 0.9) {
          st.model.updateMatrixWorld(true);
          const v = st.weapon.getWorldPosition(new Vector3());
          st.model.worldToLocal(v);
          slab.yaw = -Math.atan2(v.x, v.z);
        }
      }
    }
    // body bits
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i];
      const tgt = i < want.stone ? 1 : 0;
      s.k += (tgt - s.k) * Math.min(1, dt * (tgt ? 14 : 5));
      s.mesh.visible = s.k > 0.02;
      s.mesh.scale.setScalar(Math.max(0.001, s.k * (1 + 0.25 * Math.max(0, 1 - s.k) * 4)));
    }
    have.thorns += (want.thorns - have.thorns) * Math.min(1, dt * (want.thorns > have.thorns ? 12 : 4));
    have.ore += (want.ore - have.ore) * Math.min(1, dt * 6);
    for (let i = 0; i < thorns.length; i++) {
      const k = Math.min(1, Math.max(0, have.thorns * thorns.length - i * 0.6));
      thorns[i].visible = k > 0.02;
      thorns[i].scale.setScalar(Math.max(0.001, k));
    }
    ironMat.emissiveIntensity = 1.6 * have.ore;
    have.rust += (want.rust - have.rust) * Math.min(1, dt * 5);
    have.stoneSkin += (want.stoneSkin - have.stoneSkin) * Math.min(1, dt * 8);
    setSkin(have.rust, have.stoneSkin);
  }

  return { cue, update, ready: () => !!st.model };
}
