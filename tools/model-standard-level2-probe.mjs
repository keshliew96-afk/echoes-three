#!/usr/bin/env node
// MODEL STANDARD, LEVEL II BOSSES probe — headless Node, builds the rigs; no
// browser. The slice rebuilds the Drowned Heron, the Millwheel and the Mire
// King to the model standard (docs/MODEL_STANDARD.md) against the [M]
// checklist (VFX_HIT_RULES §6.1). Visual only. This probe checks:
//   1. the flags: the three bosses play faceted by default, `?facet=` turns
//      them classic or picks them, and the classic rigs still build;
//   2. every rig: the classic interface plus lab, points and react; the root
//      holds the moving body in its first child and only floor pieces beside
//      it; every instanced part inked; every vertex-coloured material on
//      faceted geometry; its named points;
//   3. colour: no Ember, no Bright Heal, nothing in the amber family on a
//      model material;
//   4. the [M] beats on every ability: a strike of at most 3 frames followed
//      by a held contact (B2), a strike that leaves on its first frame (B4),
//      a settle that overshoots rest once (B5), a recoil on every hit (B3),
//      the lash's lunge (B9);
//   5. locked feet: the Heron and the Mire King walking the sim's speeds with
//      turns never slide a planted foot, step in turn, reach every foot and
//      plant again at rest; the Millwheel rolls on its paddles, a planted
//      paddle tip never sliding, the hub rising and falling over each;
//   6. the sim drives each ability: the Heron's spear (the lane, the 11 u/s
//      dash in the air, the landing), wingbeat, submerge and surface; the
//      Millwheel's shards, the crosscut (the 9 u/s cut rolled on its paddles,
//      the slam, the dizzy); the Mire King's lash (the tongue the lane's
//      length), the flop (the heave, the leap over the sim's travel, the
//      landing) and the swallow; the strikes land on the sim's hit; a co-op
//      guest's telegraph copies never restart a wind-up; a boss killed in a
//      wind-up never plays the strike; a hitch is not a new boss;
//   7. the spawn-in (B7), a pooled rig posed for a new boss, the turntable;
//   8. the lab: an entry per boss, each ability plays without a throw.
//
//   node tools/model-standard-level2-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites, face decals): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const heronM = await import('../src/render/boss/heronfacet.js');
const millM = await import('../src/render/boss/millwheelfacet.js');
const mireM = await import('../src/render/boss/mirekingfacet.js');
const { buildHeron } = await import('../src/render/boss/heron.js');
const { buildMillwheel } = await import('../src/render/boss/slice2.js');
const { buildMireKing } = await import('../src/render/boss/third.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-bosses.js');
const { HERON } = await import('../src/sim/bosses/heron.js');
const { MIREKING } = await import('../src/sim/bosses/mireking.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;

const BOSSES = [
  { kind: 'heron', name: 'Drowned Heron', build: heronM.buildHeronFacet, classic: buildHeron, abilities: heronM.HERON_ABILITIES, channels: heronM.abilityChannels, walk: HERON.moveSpeed, points: ['mouth', 'tip', 'chest', 'footL', 'footR'], rest: 'stalk' },
  { kind: 'millwheel', name: 'Millwheel', build: millM.buildMillwheelFacet, classic: buildMillwheel, abilities: millM.MILL_ABILITIES, channels: millM.abilityChannels, walk: millM.MILL_ROLL, points: ['hub', 'tip', 'chest', 'rim'], rest: 'roll' },
  { kind: 'mireking', name: 'Mire King', build: mireM.buildMireKingFacet, classic: buildMireKing, abilities: mireM.MIRE_ABILITIES, channels: mireM.abilityChannels, walk: MIREKING.moveSpeed, points: ['mouth', 'tip', 'chest', 'sac', 'footFL', 'footFR', 'footHL', 'footHR'], rest: 'wade' },
];
const LEGGED = BOSSES.filter((B) => B.kind !== 'millwheel');

// --- 1. flags ----------------------------------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  const kinds = BOSSES.map((B) => B.kind);
  check('the Level II bosses play the model standard by default', kinds.every((k) => MODEL_STANDARD[k] === true && facetOn(k, q(''))));
  check('?facet=0 turns them classic', kinds.every((k) => !facetOn(k, q('facet=0'))));
  check('?facet=heron keeps only the Heron faceted', facetOn('heron', q('facet=heron')) && !facetOn('millwheel', q('facet=heron')) && !facetOn('mireking', q('facet=heron')));
  check('the Level III bosses stay classic', !facetOn('lichram', q('')) && !facetOn('ashraven', q('')) && !facetOn('veinweaver', q('')));
  const classics = BOSSES.map((B) => B.classic()).filter((r) => r && r.group && typeof r.pose === 'function' && !r.group.userData.modelStandard);
  check('the classic rigs still build beside the faceted ones', classics.length === BOSSES.length);
}

// --- 2. the rigs -------------------------------------------------------------------
function inkReport(root) {
  const parts = [];
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.inkHull) return;
    const hull = o.children.find((ch) => ch.isInstancedMesh && ch.instanceMatrix === o.instanceMatrix);
    parts.push({ name: o.name, inked: !!hull });
  });
  return parts;
}
function floorPiece(o) {
  let ok = true;
  o.updateMatrixWorld(true);
  o.traverse((x) => {
    if (!x.isMesh && !x.isSprite) return;
    const p = new Vector3();
    x.getWorldPosition(p);
    if (p.y > 0.1) ok = false;
  });
  return ok;
}
for (const B of BOSSES) {
  const r = B.build();
  const iface = ['group', 'mats', 'setYaw', 'setFlash', 'pose', 'lab', 'points', 'react'].filter((k) => !(k in r));
  check(`${B.name}: the classic interface plus lab, points and react`, iface.length === 0 && r.group.userData.modelStandard === true, iface);
  const body = r.group.children[0];
  let n = 0;
  body.traverse((x) => x.isMesh && n++);
  const others = r.group.children.slice(1);
  check(`${B.name}: the root's first child carries the body, the rest are floor pieces`, n > 12 && others.every(floorPiece), { meshes: n, floor: others.map((o) => o.name || o.type) });
  const ink = inkReport(r.group);
  // light, not ink-lined parts: the violet gems and lights
  const bare = ink.filter((p) => !p.inked && !/gems|lights|weedglow/.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink`, ink.length >= 6 && bare.length === 0, { parts: ink.length, bare });
  const black = [];
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.vertexColors && !o.geometry.getAttribute('color')) black.push(o.name || o.geometry.type);
  });
  check(`${B.name}: every vertex-coloured material sits on faceted geometry`, black.length === 0, black);
  const missing = B.points.filter((p) => !(r.points[p] && r.points[p].isObject3D));
  let rooted = true;
  for (const p of Object.values(r.points)) {
    let x = p;
    while (x.parent) x = x.parent;
    if (x !== r.group) rooted = false;
  }
  check(`${B.name}: its named points (B8)`, missing.length === 0 && rooted, missing);
  const R = r.react;
  check(`${B.name}: a hit envelope tuning (the envelope's boss amounts, no knockback, a pivot height)`, R && R.squash === 1 && R.flinch === 1 && R.knock === 0 && R.midY > 0.3, R);
}

// --- 3. colour -----------------------------------------------------------------------
{
  const close = (a, b) => {
    const x = new Color(a);
    const y = new Color(b);
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
  };
  const amber = (c) => {
    const srgb = c.clone().convertLinearToSRGB();
    const hsl = {};
    srgb.getHSL(hsl);
    const max = Math.max(srgb.r, srgb.g, srgb.b);
    const sat = max > 0 ? (max - Math.min(srgb.r, srgb.g, srgb.b)) / max : 0;
    return hsl.h * 360 >= 30 && hsl.h * 360 <= 50 && sat > 0.35 && hsl.l > 0.4;
  };
  for (const B of BOSSES) {
    const r = B.build();
    const mats = new Set();
    r.group.traverse((o) => {
      if (!(o.isMesh || o.isSprite) || o.userData.inkHull) return;
      for (const m of [].concat(o.material)) if (m && m.color && !m.isShaderMaterial) mats.add(m);
    });
    const all = [...mats];
    const reserved = all.filter((m) => close(m.color.getHex(), '#FF5A36') || close(m.color.getHex(), '#5FE873')).map((m) => `#${m.color.getHexString()}`);
    const amb = all.filter((m) => amber(m.color)).map((m) => `#${m.color.getHexString()}`);
    check(`${B.name}: no Ember or Bright Heal, nothing in the amber family`, reserved.length === 0 && amb.length === 0, { reserved, amb });
  }
}

// --- 4. the [M] beats ------------------------------------------------------------------
const CONTACT = {
  heron: ['spear', 'wingbeat', 'dive', 'surface'],
  millwheel: ['shards', 'crosscut'],
  mireking: ['lash', 'flop', 'swallow'],
};
// abilities that end under the water rather than on a settle
const NO_SETTLE = { heron: ['dive'] };
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
for (const B of BOSSES) {
  for (const id of CONTACT[B.kind]) {
    const tl = B.abilities[id];
    const ph = tl.phases;
    const strikes = [];
    for (let i = 0; i < ph.length - 1; i++) if (Math.abs(ph[i].dur - STRIKE_SEC) < 1e-9) strikes.push(i);
    const held = strikes.filter((i) => ph[i + 1].dur >= HOLD_SEC - 1e-9);
    check(`${B.name} ${tl.label}: a strike of 2 to 3 frames, then the contact held (B2)`, strikes.length > 0 && held.length === strikes.length && STRIKE_SEC <= 3 * FRAME, ph.map((p) => `${p.id} ${r3(p.dur)}`));
    for (const i of strikes) {
      const at = tl.startOf(ph[i].id);
      const a = B.channels(id, tl.sample(at + 1e-6));
      const keys = Object.keys(a);
      const m = B.channels(id, tl.sample(at + FRAME));
      const b = B.channels(id, tl.sample(at + ph[i].dur - 1e-6));
      const k = dist(a, m, keys) / Math.max(1e-6, dist(a, b, keys));
      check(`${B.name} ${tl.label}: the ${ph[i].id} leaves on its first frame (B4)`, k > 0.55, r3(k));
    }
    if ((NO_SETTLE[B.kind] || []).includes(id)) continue;
    const last = ph[ph.length - 1];
    const s0 = B.channels(id, tl.sample(tl.startOf(last.id) + 1e-6));
    let crossed = false;
    for (let k = 0.62; k <= 1; k += 0.02) {
      const c = B.channels(id, tl.sample(tl.startOf(last.id) + last.dur * k));
      for (const key of Object.keys(c)) if (Math.abs(s0[key]) > 0.05 && c[key] * s0[key] < 0) crossed = true;
    }
    check(`${B.name} ${tl.label}: its ${last.id} overshoots rest once (B5)`, crossed);
  }
}
// B3: every hit shoves the body back 0.08 to 0.12 u (the shove channel x 0.1 u)
{
  const peaks = {};
  for (const B of BOSSES) {
    for (const id of CONTACT[B.kind]) {
      if (id === 'dive') continue; // it goes under: no blow to recoil from
      const TL = B.abilities[id];
      let m = 0;
      for (let t = 0; t <= TL.duration; t += 1 / 240) m = Math.max(m, B.channels(id, TL.sample(t)).shove);
      peaks[`${B.kind} ${id}`] = r3(m);
    }
  }
  check('every hit plays its recoil (B3): a shove of 0.08 to 0.12 u', Object.values(peaks).every((v) => v >= 0.8 && v <= 1.2), peaks);
}
// B9: the lash draws back, drives past rest, and the tongue reaches the lane
{
  const tl = mireM.MIRE_ABILITIES.lash;
  const at = (id, k) => mireM.abilityChannels('lash', tl.sample(tl.startOf(id) + tl.phases.find((p) => p.id === id).dur * k));
  check('Mire King Tongue Lash: draws back, lunges past rest with the tongue out, reels it in (B9)', at('draw', 0.9).reach < -0.05 && at('hold', 0.5).reach > 0.4 && at('hold', 0.5).tongue === 1 && at('reel', 1).tongue < 0.01, { draw: r3(at('draw', 0.9).reach), hold: r3(at('hold', 0.5).reach) });
}

// --- 5. locked feet ---------------------------------------------------------------------
function drive(r, e, frames, move, out) {
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    if (move) move(f);
    out.world.updateMatrixWorld(true);
    r.pose({ t: out.t, hpFrac: 1, e });
    if (out.each) out.each(f);
    if (!r.lab.feet) continue;
    if (r.lab.legs) for (const S of r.lab.legs.state) out.gap = Math.max(out.gap, S.end.distanceTo(S.foot));
    const feet = r.lab.feet();
    if (feet.every((ft) => !ft.planted) && !(r.lab.channels().air > 0.02) && !(r.lab.channels().sink > 0.02)) out.allAir++;
    feet.forEach((ft, i) => {
      const p = out.prev[i];
      if (p && p.planted && ft.planted && p.steps === ft.steps) out.slide = Math.max(out.slide, Math.hypot(ft.drawnX - p.x, ft.drawnZ - p.z));
      if (p && ft.steps > p.steps) out.order.push(ft.group);
      out.prev[i] = { planted: ft.planted, x: ft.drawnX, z: ft.drawnZ, steps: ft.steps };
    });
  }
  return out;
}
const runner = (r) => {
  const world = new Group();
  world.add(r.group);
  return { world, t: 0, slide: 0, prev: [], order: [], gap: 0, allAir: 0, each: null };
};
for (const B of LEGGED) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null, mode: B.rest };
  drive(r, e, 20, null, st);
  st.slide = 0;
  const steps0 = r.lab.feet().map((f) => f.steps);
  let yaw = 0;
  drive(r, e, 300, (f) => {
    yaw += (f < 150 ? 0.4 : -0.6) * DT;
    r.group.position.x += Math.sin(yaw) * B.walk * DT;
    r.group.position.z += Math.cos(yaw) * B.walk * DT;
    r.setYaw(yaw);
  }, st);
  const steps = r.lab.feet().map((f, i) => f.steps - steps0[i]);
  let alt = 0;
  for (let i = 1; i < st.order.length; i++) if (st.order[i] !== st.order[i - 1]) alt++;
  const groups = r.lab.feet().map((f) => f.group);
  const pairGap = Math.max(...[0, 1].map((g) => {
    const n = steps.filter((_, i) => groups[i] === g);
    return Math.max(...n) - Math.min(...n);
  }));
  check(`${B.name}: walking with a turn, a planted foot never slides`, st.slide < 1e-4, r3(st.slide));
  check(`${B.name}: every foot steps along the travel`, steps.every((n) => n >= 3), steps);
  check(`${B.name}: the steps alternate between its two gait groups, each group together`, st.order.length > 6 && alt / (st.order.length - 1) > 0.3 && pairGap <= 1, { landings: st.order.length, switches: alt, pairGap });
  check(`${B.name}: walking, every drawn foot reaches its gait point and a foot is always down`, st.gap < 1e-3 && st.allAir === 0, { gap: r3(st.gap), allAir: st.allAir });
  drive(r, e, 45, null, st);
  check(`${B.name}: at rest every foot is planted again`, r.lab.feet().every((f) => f.planted), r.lab.feet().map((f) => f.planted));
  st.gap = 0;
  st.allAir = 0;
  let y = yaw;
  drive(r, e, 90, () => {
    y += (yaw + Math.PI * 0.999 - y) * (1 - Math.exp(-7 * DT));
    r.setYaw(y);
  }, st);
  check(`${B.name}: a spin in place steps round with no leg past its reach (every foot up for at most 3 frames)`, st.gap < 1e-3 && st.allAir <= 3, { gap: r3(st.gap), allAir: st.allAir });
}
// the Millwheel rolls on its paddles: the planted tip holds its spot
function wheelRun(r, e, frames, speed, st, turn = 0) {
  const tip = new Vector3();
  let prevTip = null;
  let prevIdx = null;
  let yaw = 0;
  const hubs = [];
  const move = () => {
    yaw += turn * DT;
    r.group.position.x += Math.sin(yaw) * speed * DT;
    r.group.position.z += Math.cos(yaw) * speed * DT;
    r.setYaw(yaw);
  };
  st.each = () => {
    r.lab.tip(tip);
    const R = r.lab.roll();
    hubs.push(R.hub);
    if (prevTip && prevIdx === R.idx) {
      st.slide = Math.max(st.slide, Math.hypot(tip.x - prevTip.x, tip.z - prevTip.z));
      st.along = Math.max(st.along ?? 0, Math.abs((tip.x - prevTip.x) * Math.sin(yaw) + (tip.z - prevTip.z) * Math.cos(yaw)));
    }
    prevTip = tip.clone();
    prevIdx = R.idx;
  };
  drive(r, e, frames, move, st);
  st.each = null;
  return hubs;
}
{
  const r = millM.buildMillwheelFacet();
  const st = runner(r);
  const e = { id: 1, telegraph: null, mode: 'roll' };
  drive(r, e, 20, null, st);
  const idx0 = r.lab.roll().idx;
  const hubs = wheelRun(r, e, 300, millM.MILL_ROLL, st);
  const R = r.lab.roll();
  check('Millwheel: rolling at the sim\'s 2.4 u/s, the planted paddle tip never slides', st.slide < 1e-3, r3(st.slide));
  check('Millwheel: it rolls from paddle to paddle as it travels, the hub rising and falling over each', R.idx - idx0 >= 8 && Math.max(...hubs) - Math.min(...hubs) > 0.02, { paddles: R.idx - idx0, hubMin: r3(Math.min(...hubs)), hubMax: r3(Math.max(...hubs)) });
  const st2 = runner(r);
  st2.t = st.t;
  wheelRun(r, e, 120, millM.MILL_ROLL, st2, 0.8);
  check('Millwheel: rolling through a turn, the planted tip never slides along the roll (it only pivots as the wheel turns on it)', st2.along < 1e-3, r3(st2.along));
}

// --- 6. the sim drives each ability ------------------------------------------------------
const peak = { max: {} };
const watch = (r) => {
  for (const [k, v] of Object.entries(r.lab.channels())) peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
};
{
  // the Heron: the spear lane, the dash, the landing; the wingbeat; submerge, surface
  const r = heronM.buildHeronFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, mode: 'stalk' };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'spear', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1, length: 5 };
  peak.max = {};
  drive(r, e, 48, () => watch(r), st);
  const coil = peak.max.rise !== undefined ? r.lab.channels() : null;
  e.telegraph = null;
  e.mode = 'dash';
  e.dashVx = 0;
  e.dashVz = 11 / 60;
  peak.max = {};
  let airFrames = 0;
  drive(r, e, 27, () => {
    watch(r);
    r.group.position.z += 11 * DT;
    if (r.lab.channels().air > 0.5) airFrames++;
  }, st);
  const air = peak.max.air;
  e.mode = 'stalk';
  st.prev = [];
  peak.max = {};
  drive(r, e, 12, () => watch(r), st);
  const land = peak.max.squash;
  drive(r, e, 40, null, st);
  e.telegraph = { attack: 'wingbeat', startTick: 300, resolveTick: 342 };
  peak.max = {};
  drive(r, e, 42, () => watch(r), st);
  const raised = peak.max.spread;
  e.telegraph = null;
  peak.max = {};
  drive(r, e, 50, () => watch(r), st);
  const beat = peak.max.squash;
  check('Drowned Heron: the spear coils through its lane, dashes in the air at 11 u/s and lands; the wingbeat raises and beats', coil && air > 0.95 && airFrames >= 18 && land > 0.9 && raised > 0.9 && beat > 0.9, { air: r3(air), airFrames, land: r3(land), raised: r3(raised), beat: r3(beat) });
  check('Drowned Heron: the feet hold through the spear (the dash aside) and the wingbeat', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
  // submerge: it sinks out of sight and glides; surfacing rises on the ring
  e.mode = 'submerged';
  e.submerged = true;
  drive(r, e, 50, () => (r.group.position.x += 2.8 * DT), st);
  const sunk = r.lab.channels().sink;
  const hidden = !r.group.children[0].children[0].children.find((c) => c.visible === false) ? null : true;
  e.mode = 'surfacing';
  e.telegraph = { attack: 'surface', kind: 'ring', startTick: 600, resolveTick: 648 };
  peak.max = {};
  const sinkAt = [];
  drive(r, e, 48, () => sinkAt.push(r.lab.channels().sink), st);
  e.telegraph = null;
  e.mode = 'stalk';
  e.submerged = false;
  st.prev = [];
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  check('Drowned Heron: the dive sinks it under; the surface rises out through the ring\'s warning and bursts', sunk > 0.97 && sinkAt[0] > 0.9 && sinkAt[sinkAt.length - 1] < 0.4 && peak.max.spread > 0.9, { sunk: r3(sunk), from: r3(sinkAt[0]), to: r3(sinkAt[sinkAt.length - 1]), hidden });
  drive(r, e, 30, null, st);
  check('Drowned Heron: standing again after it surfaces, every foot planted', r.lab.feet().every((f) => f.planted));
}
{
  // the Millwheel: shards, the crosscut's rock, cut at 9 u/s, slam, dizzy
  const r = millM.buildMillwheelFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, mode: 'roll' };
  drive(r, e, 20, null, st);
  e.telegraph = { attack: 'shards', kind: 'cone', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1 };
  peak.max = {};
  drive(r, e, 48, () => watch(r), st);
  const teeth = peak.max.teeth;
  e.telegraph = null;
  drive(r, e, 40, () => watch(r), st);
  const loosed = peak.max.squash;
  e.telegraph = { attack: 'crosscut', kind: 'lane', startTick: 100, resolveTick: 166, dirX: 0, dirZ: 1 };
  peak.max = {};
  drive(r, e, 66, () => watch(r), st);
  e.telegraph = null;
  e.mode = 'cut';
  e.cutVx = 0;
  e.cutVz = 9 / 60;
  const st2 = runner(r);
  st2.world = st.world;
  st2.t = st.t;
  const idx0 = r.lab.roll().idx;
  wheelRun(r, e, 36, 9, st2);
  st.t = st2.t;
  const rolled = r.lab.roll().idx - idx0;
  e.mode = 'dizzy';
  peak.max = {};
  drive(r, e, 75, () => watch(r), st);
  const slam = peak.max.squash;
  const tilt = peak.max.tilt;
  e.mode = 'roll';
  drive(r, e, 40, null, st);
  check('Millwheel: the shards bare the teeth and loose; the crosscut cuts at 9 u/s rolled on its paddles, slams and reels dizzy', teeth > 0.9 && loosed > 0.9 && rolled >= 7 && st2.slide < 1e-3 && slam > 0.9 && tilt > 0.05, { teeth: r3(teeth), loosed: r3(loosed), rolled, slide: r3(st2.slide), slam: r3(slam), tilt: r3(tilt) });
}
{
  // the Mire King: the lash (the tongue to the lane's end), the flop's heave,
  // leap and landing, the swallow, the rage
  const r = mireM.buildMireKingFacet();
  const st = runner(r);
  const e = { id: 11, telegraph: null, mode: 'wade', enraged: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'lash', kind: 'lane', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1, length: 6, lance: true };
  e.mode = 'lash';
  peak.max = {};
  drive(r, e, 48, () => watch(r), st);
  const sac = peak.max.sac;
  const atLash = r.lab.tongueLength();
  e.telegraph = null;
  e.mode = 'wade';
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  const reeled = r.lab.channels().tongue;
  check('Mire King: the lash fills the sac, shoots the tongue to the lane\'s far end on the hit and reels it in', sac > 0.5 && Math.abs(atLash - (6 - 1.45)) < 0.05 && reeled < 0.01, { sac: r3(sac), tongue: r3(atLash), reeled: r3(reeled) });
  check('Mire King: the feet hold through the lash', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
  // the flop: 46 ticks of heave, then 20 ticks of leap over 5 u, then the landing
  e.telegraph = { attack: 'flop', kind: 'ring', startTick: 200, resolveTick: 266, x: 0, z: 5 };
  e.mode = 'heave';
  peak.max = {};
  let frontUp = 0;
  drive(r, e, 46, () => {
    watch(r);
    frontUp = Math.max(frontUp, r.lab.feet()[0].drawnY);
  }, st);
  const lift = peak.max.lift;
  const heaveSlide = st.slide;
  e.mode = 'flop';
  peak.max = {};
  let airFrames = 0;
  let grew = true;
  const z0 = r.group.position.z;
  drive(r, e, 20, () => {
    watch(r);
    r.group.position.z += 5 / 20;
    if (r.lab.channels().air > 0.3) airFrames++;
  }, st);
  grew = r.lab.grow() === 1;
  const atFlop = r.lab.channels().squash;
  const air = peak.max.air;
  e.telegraph = null;
  e.mode = 'wade';
  st.prev = [];
  st.slide = 0;
  drive(r, e, 60, null, st);
  check('Mire King: the flop heaves (fore-feet off the floor), leaps the sim\'s travel and lands on the hit, squashed', lift > 0.9 && frontUp > 0.1 && air > 0.95 && airFrames >= 10 && atFlop > 0.95 && grew && r.group.position.z - z0 > 4.9, { lift: r3(lift), frontUp: r3(frontUp), air: r3(air), airFrames, atFlop: r3(atFlop) });
  check('Mire King: the hind feet hold through the heave, every foot after the landing', heaveSlide < 1e-4 && st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), { heave: r3(heaveSlide), after: r3(st.slide) });
  e.telegraph = { attack: 'swallow', kind: 'ring', startTick: 400, resolveTick: 478 };
  e.mode = 'gape';
  peak.max = {};
  drive(r, e, 78, () => watch(r), st);
  const jaw = peak.max.jaw;
  const atSnap = r.lab.channels().squash;
  e.telegraph = null;
  e.mode = 'wade';
  e.enraged = true;
  drive(r, e, 120, null, st);
  check('Mire King: the swallow gapes wide and snaps shut on the hit; the rage holds', jaw > 0.95 && atSnap > 0.95 && r.lab.channels().rage > 0.9, { jaw: r3(jaw), snap: r3(atSnap), rage: r3(r.lab.channels().rage) });
  check('Mire King: the feet hold through the swallow', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
}
// the strikes land on the sim's hit
{
  const out = {};
  const h = heronM.buildHeronFacet();
  const sh = runner(h);
  const he = { id: 21, telegraph: { attack: 'wingbeat', startTick: 0, resolveTick: 42 }, mode: 'stalk' };
  drive(h, he, 42, null, sh);
  out.wingbeat = r3(h.lab.channels().squash);
  const m = millM.buildMillwheelFacet();
  const sm = runner(m);
  const me = { id: 22, telegraph: { attack: 'shards', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1 }, mode: 'roll' };
  drive(m, me, 48, null, sm);
  out.shards = r3(m.lab.channels().squash);
  const k = mireM.buildMireKingFacet();
  const sk = runner(k);
  const ke = { id: 23, telegraph: { attack: 'swallow', startTick: 0, resolveTick: 78 }, mode: 'gape' };
  drive(k, ke, 78, null, sk);
  out.swallow = r3(k.lab.channels().squash);
  ke.telegraph = { attack: 'lash', startTick: 100, resolveTick: 148, dirX: 0, dirZ: 1, length: 5 };
  drive(k, ke, 48, null, sk);
  out.lash = r3(k.lab.channels().squash);
  check('the strikes land on the sim\'s hit: the wingbeat, the shards, the swallow\'s snap, the lash', Object.values(out).every((v) => v > 0.95), out);
}
// a co-op guest: every snapshot hands the rig a fresh copy of the telegraph
{
  const out = {};
  const k = mireM.buildMireKingFacet();
  const sk = runner(k);
  const e = { id: 24, telegraph: null, mode: 'wade' };
  drive(k, e, 20, null, sk);
  const T = { attack: 'swallow', startTick: 10, resolveTick: 88, kind: 'ring' };
  peak.max = {};
  drive(k, e, 70, (f) => {
    if (f % 3 === 0) e.telegraph = { ...T };
    watch(k);
  }, sk);
  out.gape = r3(peak.max.jaw);
  const h = heronM.buildHeronFacet();
  const sh = runner(h);
  const he = { id: 25, telegraph: null, mode: 'stalk' };
  drive(h, he, 20, null, sh);
  const W = { attack: 'wingbeat', startTick: 10, resolveTick: 52, kind: 'ring' };
  peak.max = {};
  drive(h, he, 38, (f) => {
    if (f % 3 === 0) he.telegraph = { ...W };
    watch(h);
  }, sh);
  out.raise = r3(peak.max.spread);
  check('a co-op guest\'s fresh telegraph copies never restart the wind-up (the gape opens, the wings rise)', out.gape > 0.9 && out.raise > 0.85, out);
}
// killed in a wind-up: the death collapse never plays the strike
{
  const out = {};
  const h = heronM.buildHeronFacet();
  const sh = runner(h);
  drive(h, { id: 26, telegraph: { attack: 'spear', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1 }, mode: 'stalk' }, 20, null, sh);
  peak.max = {};
  drive(h, null, 66, () => watch(h), sh);
  out.heronAir = r3(peak.max.air);
  const m = millM.buildMillwheelFacet();
  const sm = runner(m);
  drive(m, { id: 27, telegraph: { attack: 'shards', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1 }, mode: 'roll' }, 20, null, sm);
  peak.max = {};
  drive(m, null, 66, () => watch(m), sm);
  out.millSquash = r3(peak.max.squash);
  const k = mireM.buildMireKingFacet();
  const sk = runner(k);
  drive(k, { id: 28, telegraph: { attack: 'lash', startTick: 0, resolveTick: 48, dirX: 0, dirZ: 1, length: 5 }, mode: 'lash' }, 20, null, sk);
  peak.max = {};
  drive(k, null, 66, () => watch(k), sk);
  out.mireTongue = r3(peak.max.tongue);
  check('a boss killed in its wind-up collapses in it (no dash, no loosing, no tongue)', out.heronAir < 0.02 && out.millSquash < 0.02 && out.mireTongue < 0.02, out);
}
// a hitch (a long frame at speed) is not a new boss
{
  const out = {};
  for (const B of BOSSES) {
    const r = B.build();
    const st = runner(r);
    const e = { id: 29, telegraph: null, mode: B.rest };
    drive(r, e, 20, null, st);
    drive(r, e, 1, () => (r.group.position.z += 3), st);
    out[B.kind] = r3(r.lab.grow());
  }
  check('a 3 u jump in one frame (a hitch) re-plants but never replays the spawn-in', Object.values(out).every((v) => v === 1), out);
}

// --- 7. spawn-in, and a pooled rig posed for a new boss -----------------------------------------
for (const B of BOSSES) {
  const r = B.build();
  const st = runner(r);
  const g = [];
  drive(r, { id: 1, telegraph: null }, 1, null, st);
  for (let f = 0; f < 20; f++) {
    g.push(r.lab.grow());
    drive(r, { id: 1, telegraph: null }, 1, null, st);
  }
  const full = Math.round(SPAWN_SEC / DT) + 1;
  check(`${B.name}: grows from the floor in ~7 frames, past full size once (B7)`, g[0] < 0.4 && Math.max(...g) > 1.04 && g.slice(full).every((v) => Math.abs(v - 1) < 1e-6), g.slice(0, 10).map(r3));
  const g2 = [];
  for (let f = 0; f < 3; f++) {
    drive(r, { id: 2, telegraph: null }, 1, null, st);
    g2.push(r.lab.grow());
  }
  check(`${B.name}: a pooled rig posed for a new boss spawns in again`, g2[0] < 0.5, g2.map(r3));
  const v = B.build();
  v.pose({ t: 0.5, hpFrac: 1, e: null, turntable: true });
  check(`${B.name}: the viewer's turntable shows it full size`, v.lab.grow() === 1);
}

// --- 8. the lab ------------------------------------------------------------------------------
{
  const ids = LAB_ENTRIES.map((x) => x.id);
  check('the model lab lists the three bosses', BOSSES.every((B) => ids.includes(B.kind)), ids);
  const vfx = new Proxy({}, { get: () => () => {} });
  const errs = [];
  for (const E of LAB_ENTRIES.filter((x) => BOSSES.some((B) => B.kind === x.id))) {
    try {
      const b = E.build({ cosmetic: null, vfx, play: () => {} });
      for (const [id] of E.abilities) {
        const tl = b.timeline(id);
        const state = { mode: 'ability', ability: id, classic: true, movePhase: 0, t: 0 };
        for (let t = 0; t <= tl.duration + 0.2; t += DT) b.update(state, DT, Math.min(t, tl.duration));
        for (const c of b.cues(id)) b.onCue(c.id, { x: 0, z: 0, yaw: 0 });
      }
      b.update({ mode: 'move', ability: E.abilities[0][0], classic: false, movePhase: 1, t: 0 }, DT, 0);
      b.reset();
    } catch (err) {
      errs.push(`${E.id}: ${err.message}`);
    }
  }
  check('every Level II lab entry plays every ability, with its classic twin beside', errs.length === 0, errs);
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
