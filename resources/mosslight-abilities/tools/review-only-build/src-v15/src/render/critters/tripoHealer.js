// REVIEW-ONLY (never committed, never pushed): draws the passed Tripo
// Mosslight model in place of the code-built healer rig when the URL carries
// ?tripo=1, so her skills can be recorded with the new model during the
// feature freeze. The sim, the VFX and every number are the game's own; only
// the body drawn changes.
import { AdditiveBlending, AnimationMixer, Color, DoubleSide, PlaneGeometry, Sprite, SpriteMaterial, LoopOnce, LoopRepeat, Matrix4, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { getRadialTexture } from '../glow.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

let gltfP = null;
const load = () => (gltfP ??= new GLTFLoader().loadAsync('/review/healer-tripo-rigged.glb'));
export const tripoOn = () => typeof location !== 'undefined' && /[?&]tripo=1\b/.test(location.search);

// Effect frames of the passed clips (her review page V21).
const CT = { combo1: 0.24, combo2: 0.22, combo3: 0.22, castPoint: 0.22, castBloom: 0.32, castPlant: 0.42, castSweep: 0.26, castGive: 0.33, castChannel: 0.38 };
const LEAD = 0.1; // the clip starts this long before its effect frame (review page choice 24 b)
const BY_SHAPE = { projectile: 'castPoint', direct: 'castPoint', nova: 'castBloom', ground_aoe: 'castPlant', melee_arc: 'castSweep' };
// The druid kit's cast moves (MOSSLIGHT_SKILL_KIT.md S10 to S25), by the ids the review build reuses.
const BY_SKILL = { swift_mend: 'castGive', mending_tide: 'castPoint', guardian_bond: 'castPlant', restorative_wave: 'castPlant', kindred_shield: 'castGive', nova_bloom: 'castGive', lantern_ward: 'castGive', hearthsong: 'castSweep', sanctuary: 'castPlant', bell_toll: 'castChannel', dawn_brand: 'castGive', spirit_bolt: 'castPoint', lantern_flurry: 'castSweep', pale_lance: 'castPlant', rootsnare: 'castPlant' }; // kit v1.3 (S6)
const GEM_LOCAL = new Vector3(0, 0.92, 0);

// The gem is its own shell of the staff mesh; split it off so it can leave the
// fork on combo hit 3 (the passed review page's splitGem, ported).
function splitGem(staff) {
  let m = null;
  staff.traverse((o) => {
    if (o.isMesh && !m) m = o;
  });
  if (!m || !m.geometry.index) return null;
  m.geometry = m.geometry.clone();
  const g = m.geometry, pos = g.attributes.position, idx = g.index.array, nv = pos.count, key = new Map(), par = new Int32Array(nv);
  for (let i = 0; i < nv; i++) {
    const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
    if (!key.has(k)) key.set(k, i);
    par[i] = key.get(k);
  }
  const find = (x) => {
    while (par[x] !== x) {
      par[x] = par[par[x]];
      x = par[x];
    }
    return x;
  };
  for (let i = 0; i < idx.length; i += 3) {
    const a = find(idx[i]);
    par[find(idx[i + 1])] = a;
    par[find(idx[i + 2])] = a;
  }
  const comp = new Map();
  for (let i = 0; i < idx.length; i += 3) {
    const r = find(idx[i]);
    let c = comp.get(r);
    if (!c) comp.set(r, (c = { tris: [], minY: 9 }));
    c.tris.push(i);
    c.minY = Math.min(c.minY, pos.getY(idx[i]));
  }
  const list = [...comp.values()].filter((c) => c.tris.length > 100).sort((a, b) => b.minY - a.minY);
  if (list.length < 2) return null;
  const isTop = new Set(list[0].tris), gi = [], wi = [];
  for (let i = 0; i < idx.length; i += 3) (isTop.has(i) ? gi : wi).push(idx[i], idx[i + 1], idx[i + 2]);
  const gg = g.clone();
  gg.setIndex(gi);
  gg.computeBoundingBox();
  const c = gg.boundingBox.getCenter(new Vector3());
  gg.translate(-c.x, -c.y, -c.z);
  g.setIndex(wi);
  const gem = new Mesh(gg, m.material);
  gem.position.copy(c);
  gem.frustumCulled = false;
  m.add(gem);
  return { gem, rest: c.clone() };
}


export function attachTripoHealer({ yawGroup, rig, group, comboHitOf }) {
  const st = { model: null, mixer: null, A: {}, hand: null, staff: null, G: new Matrix4(), act: null, actT: 0, actEnd: 0, walkW: 0, last: null, dashing: false };
  rig.visible = false;
  if (typeof window !== 'undefined') window.__tripo = st;
  const att = new Matrix4();
  const inv = new Matrix4();

  load().then((g) => {
    const m = skClone(g.scene);
    m.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });
    yawGroup.add(m);
    st.model = m;
    st.mixer = new AnimationMixer(m);
    for (const c of g.animations) {
      const a = st.mixer.clipAction(c);
      st.A[c.name] = a;
    }
    for (const n of ['idle', 'walk']) {
      st.A[n].setLoop(LoopRepeat, Infinity).play();
    }
    st.A.walk.setEffectiveWeight(0);
    st.hand = m.getObjectByName('handR');
    st.staff = m.getObjectByName('weapon');
    m.updateMatrixWorld(true);
    st.G.copy(st.hand.matrixWorld).invert().multiply(st.staff.matrixWorld);
    st.gemPart = splitGem(st.staff);
  });

  // Hit 3 (Kesh's sketch, 11-16): she throws the staff overhand, it flies
  // butt-first and sticks in the floor, leaning back toward her at the angle
  // of the throw; the gem glows and acts as the turret (the sim fires its
  // bolts); it flies back to her paw when the turret ends or on her next hit 1.
  const TH = { from: 0.15, release: 0.42, end: 1.05, fly: 0.16, out: 5.0, back: 0.18, dist: 2.2, sink: 0.12, lean: Math.PI / 3, gemBig: 1.7 };
  const th = (st.th = { state: 'hand', t: 0, age: 0, pending: null, dir: new Vector3(0, 0, 1), relP: new Vector3(), relQ: new Quaternion(), plantP: new Vector3(), plantQ: new Quaternion(), wob: new Vector3() });
  const invP = new Matrix4(), tmpV = new Vector3(), tmpV2 = new Vector3(), tmpQ = new Quaternion(), tmpQ2 = new Quaternion(), tmpM = new Matrix4(), UPV = new Vector3(0, 1, 0), ONE = new Vector3(1, 1, 1);
  const gemWorld = (out) => (st.gemPart ? st.gemPart.gem.getWorldPosition(out) : out.copy(GEM_LOCAL).applyMatrix4(st.staff.matrixWorld));
  function throwStaff(ev) {
    const dx = ev?.dx ?? 0, dz = ev?.dz ?? 1;
    th.dir.set(dx, 0, dz).normalize();
    th.pending = true;
    th.age = 0;
  }
  function releaseStaff() {
    th.pending = null;
    st.staff.getWorldPosition(th.relP);
    st.staff.getWorldQuaternion(th.relQ);
    th.plantP.set(group.position.x + th.dir.x * TH.dist, -TH.sink, group.position.z + th.dir.z * TH.dist);
    // Planted leaning back toward her: the staff's up axis points up and back along the throw.
    const up = tmpV.set(-th.dir.x * Math.cos(TH.lean), Math.sin(TH.lean), -th.dir.z * Math.cos(TH.lean)).normalize();
    th.plantQ.setFromUnitVectors(UPV, up);
    th.wob.set(th.dir.z, 0, -th.dir.x); // wobble axis, across the throw
    th.state = 'fly';
    th.t = 0;
  }
  function recallStaff() {
    if (th.state === 'fly' || th.state === 'planted') {
      st.staff.getWorldPosition(th.relP);
      st.staff.getWorldQuaternion(th.relQ);
      th.state = 'back';
      th.t = 0;
    }
    th.pending = null;
  }
  // Soft glow around the turret gem, and a faint pool of its light on the floor.
  const glowMat = new SpriteMaterial({ map: getRadialTexture(), color: '#BFE8A0', blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const gemGlow = new Sprite(glowMat);
  gemGlow.visible = false;
  const poolMat = new MeshBasicMaterial({ map: getRadialTexture(), color: '#7FBF62', blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const gemPool = new Mesh(new PlaneGeometry(1, 1), poolMat);
  gemPool.rotation.x = -Math.PI / 2;
  gemPool.visible = false;
  let glowAdded = false;
  function placeGlow(at, k, spin) {
    if (!glowAdded && group.parent) {
      group.parent.add(gemGlow, gemPool);
      glowAdded = true;
    }
    const on = k > 0.001;
    gemGlow.visible = gemPool.visible = on;
    if (!on) return;
    const pulse = 1 + 0.08 * Math.sin(spin * 6);
    gemGlow.position.copy(at);
    gemGlow.scale.setScalar(0.62 * pulse * Math.max(0.3, k));
    glowMat.opacity = 0.5 * k;
    gemPool.position.set(at.x, 0.03, at.z);
    gemPool.scale.setScalar(0.75 * pulse);
    poolMat.opacity = 0.28 * k;
  }
  // Drives the staff in world space while it is out of her paw (after the paw attach ran).
  let sapK = 0, sapSpin = 0;
  function driveStaff(d) {
    if (th.pending && st.act === st.A.throw && st.act.time >= TH.release) releaseStaff();
    if (th.state !== 'hand' || th.pending) th.age += d;
    let gemK = 0, glowK = 0;
    if (th.state === 'hand') {
      // Harvest (T35): the gem grows and brightens as Sap fills it.
      const pl = typeof window !== 'undefined' && window.__echoes?.content?.world?.()?.player;
      const sap = pl && pl.reviewSapOn ? Math.min(1, (pl.reviewSap || 0) / (pl.reviewSapCap || 50)) : 0;
      sapK += (sap - sapK) * Math.min(1, d * 8);
      if (st.gemPart) st.gemPart.gem.scale.setScalar(1 + 0.6 * sapK);
      placeGlow(gemWorld(tmpV), sapK * 0.8, th.age + (sapSpin += d));
      return;
    }
    th.t += d;
    const P = tmpV2, Q = tmpQ;
    if (th.state === 'fly') {
      const u = Math.min(1, th.t / TH.fly);
      P.lerpVectors(th.relP, th.plantP, u);
      P.y += 0.25 * Math.sin(Math.PI * u) * (1 - u);
      Q.slerpQuaternions(th.relQ, th.plantQ, Math.min(1, th.t / (TH.fly * 0.6)));
      if (u >= 1) {
        th.state = 'planted';
        th.t = 0;
      }
    } else if (th.state === 'planted') {
      P.copy(th.plantP);
      // A short quiver as it bites into the floor.
      const w = 0.14 * Math.exp(-th.t * 9) * Math.sin(th.t * 46);
      Q.setFromAxisAngle(th.wob, w).multiply(th.plantQ);
      gemK = Math.min(1, th.t / 0.2);
      glowK = gemK;
      if (th.age >= TH.out) recallStaff();
    } else {
      // Flies back to her paw.
      const u = Math.min(1, th.t / TH.back), e = u * u * (3 - 2 * u);
      const handP = new Vector3();
      st.staff.matrixWorld.decompose(handP, tmpQ2, tmpV);
      P.lerpVectors(th.relP, handP, e);
      P.y += 0.2 * Math.sin(Math.PI * u);
      Q.slerpQuaternions(th.relQ, tmpQ2, e);
      gemK = 1 - u;
      glowK = 1 - u;
      if (u >= 1) {
        th.state = 'hand';
        return driveStaff(0);
      }
    }
    // Put the staff at P, Q in world space.
    tmpM.compose(P, Q, ONE);
    tmpM.premultiply(invP.copy(st.staff.parent.matrixWorld).invert());
    tmpM.decompose(st.staff.position, st.staff.quaternion, st.staff.scale);
    st.staff.updateMatrixWorld(true);
    if (st.gemPart) st.gemPart.gem.scale.setScalar(1 + (TH.gemBig - 1) * gemK);
    placeGlow(gemWorld(tmpV), glowK, th.age);
  }

  // Dash landing heal (line 2): a Bright Heal ring closing on her feet.
  const healRing = new Mesh(new RingGeometry(0.86, 1, 48), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
  healRing.rotation.x = -Math.PI / 2;
  healRing.position.y = 0.04;
  healRing.visible = false;
  group.add(healRing);
  let ringT = -1;
  let dashT = -1, dashFace = null;
  // Pale blue untouchable tint (the model page's), on the model's own materials.
  let tintMats = null, tintK = 0;
  const TINT = new Color('#9CC4F2');
  function setTint(k) {
    if (!st.model || Math.abs(k - tintK) < 1e-3) return;
    tintK = k;
    if (!tintMats) {
      tintMats = [];
      st.model.traverse((o) => {
        if (o.isMesh && o.material && o.material.emissive) tintMats.push({ m: o.material, e: o.material.emissive.clone(), i: o.material.emissiveIntensity ?? 1 });
      });
    }
    for (const t of tintMats) {
      t.m.emissive.copy(t.e).lerp(TINT, k * 0.16);
    }
  }
  // Rising heal motes as she lands (the model page's), Bright Heal.
  const motes = [];
  function healMotes() {
    for (let i = 0; i < 12; i++) {
      const sp = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: PALETTE.brightHeal, depthWrite: false, transparent: true, opacity: 0 }));
      const a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 0.3;
      sp.position.set(Math.cos(a) * r, 0.05 + Math.random() * 0.2, Math.sin(a) * r);
      sp.scale.setScalar(0.07 + Math.random() * 0.05);
      group.add(sp);
      motes.push({ sp, t: 0, life: 0.7 + Math.random() * 0.4, vy: 0.45 + Math.random() * 0.35 });
    }
  }
  function updateMotes(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.t += dt;
      const u = m.t / m.life;
      m.sp.position.y += m.vy * dt;
      m.sp.material.opacity = 0.7 * Math.min(1, u * 6) * (1 - u);
      if (u >= 1) {
        group.remove(m.sp);
        m.sp.material.dispose();
        motes.splice(i, 1);
      }
    }
  }

  function start(name, from = null) {
    const a = st.A[name];
    if (!a) return;
    if (st.act && st.act !== a) st.act.stop();
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    a.time = from ?? Math.max(0, (CT[name] ?? 0) - LEAD);
    a.play();
    st.act = a;
    st.actT = 0;
    st.actEnd = a.getClip().duration;
  }

  function cue(kind, ev) {
    if (!st.model) return;
    if (kind === 'dashHeal') {
      ringT = 0;
      healMotes();
      return;
    }
    if (kind === 'dashStart') {
      // The model page's dash (Kesh 11-16): the clip from its first frame,
      // facing the dash, a pale blue tint while untouchable (0.35 s).
      start('dash', 0);
      const v = typeof window !== 'undefined' && window.__echoes?.content?.world?.()?.player?.dashVel;
      dashFace = v ? Math.atan2(v.x, v.z) : null;
      dashT = 0;
      return;
    }
    if (kind === 'basic') {
      const h = ev?.hit ?? (comboHitOf ? comboHitOf(ev) : 1);
      if (h === 1) recallStaff();
      if (h === 3) {
        throwStaff(ev);
        start('throw', TH.from);
        st.actEnd = TH.end;
      } else start(`combo${h === 2 ? 2 : 1}`);
    } else if (kind === 'skill') {
      if (!ev || ev.shape === 'aura') return;
      start(BY_SKILL[ev.skill] || BY_SHAPE[ev.shape] || 'castPoint');
    }
  }

  function update(dt, anim) {
    const p = group.position;
    let speed = 0;
    if (st.last && dt > 0) {
      speed = Math.hypot(p.x - st.last.x, p.z - st.last.z) / dt;
      if (speed > 0.5) {
        st.vx = p.x - st.last.x;
        st.vz = p.z - st.last.z;
      }
    }
    st.last = { x: p.x, z: p.z };
    if (!st.model) return;
    // She turns to face where she dashes (line 2), from the press until she has landed.
    let want = 0;
    if (dashT >= 0) {
      dashT += dt;
      if (dashT < 0.6 && dashFace != null) {
        const dy = dashFace - yawGroup.rotation.y;
        want = Math.atan2(Math.sin(dy), Math.cos(dy));
      }
      setTint(dashT < 0.35 ? Math.min(1, dashT / 0.04) : Math.max(0, 1 - (dashT - 0.35) / 0.08));
      if (dashT > 0.95) dashT = -1;
    }
    st.model.rotation.y += (want - st.model.rotation.y) * Math.min(1, dt * (want ? 30 : 12));
    updateMotes(dt);
    if (ringT >= 0) {
      ringT += dt;
      const u = Math.min(1, ringT / 0.4);
      healRing.visible = u < 1;
      healRing.scale.setScalar(0.85 - 0.5 * u);
      healRing.material.opacity = 0.75 * Math.min(1, u * 5) * (1 - u * u);
      if (u >= 1) ringT = -1;
    }
    const walking = anim === 'walk' && dashT < 0;
    st.walkW += ((walking ? 1 : 0) - st.walkW) * Math.min(1, dt * 10);
    let aw = 0;
    if (st.act) {
      st.actT += dt;
      const left = st.actEnd - st.act.time;
      aw = Math.min(1, st.actT / 0.06) * Math.min(1, left / 0.18);
      if (left <= 0.001) {
        st.act.stop();
        st.act = null;
        aw = 0;
      } else st.act.setEffectiveWeight(aw);
    }
    st.A.idle.setEffectiveWeight((1 - st.walkW) * (1 - aw));
    st.A.walk.setEffectiveWeight(st.walkW * (1 - aw));
    st.mixer.update(dt);
    // The staff follows the right paw (the review page's rule).
    st.model.updateMatrixWorld(true);
    inv.copy(st.staff.parent.matrixWorld).invert();
    att.multiplyMatrices(inv, st.hand.matrixWorld).multiply(st.G);
    att.decompose(st.staff.position, st.staff.quaternion, st.staff.scale);
    st.staff.updateMatrixWorld(true);
    driveStaff(dt);
  }

  const tip = (out = new Vector3()) => {
    if (!st.staff) return null;
    // Staff out: she casts from her empty paw (Kesh 11-16).
    if (th.state !== 'hand') return st.hand.getWorldPosition(out);
    return gemWorld(out);
  };
  return { cue, update, tip, ready: () => !!st.model };
}
