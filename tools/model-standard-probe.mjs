#!/usr/bin/env node
// MODEL STANDARD probe (v0.5.332) — headless Node, builds the rigs; no browser.
// The pilot of the model standard (docs/MODEL_STANDARD.md) rebuilds the Barrow
// Wyrm and the Tank on a faceted material, a kit of instanced parts and
// rewindable ability timelines. Visual only. This probe checks:
//   1. the timelines: pure in t, cues fire once per forward pass, a rewind
//      and replay land on the same poses;
//   2. faceting: flat normals with a value step per plane; every instanced
//      part carries its ink hull on the same instance matrices;
//   3. the Wyrm: the coil follows its own path without slipping, the coil's
//      base stays planted while the head draws its breath, the sim's breath
//      and burrow drive the timelines, a turntable turns the coil rigidly,
//      the death collapse freezes it;
//   4. the Tank: the combo chains hit to hit with no pop, matches the sim's
//      swing cadence, every Tank skill plays an ability, the hips lead the
//      slab, the feet stay locked while planted and step along the travel,
//      the walk leans into the travel whatever the aim, the slam lunges;
//   5. the flag: `?facet=` and the classic rigs beside;
//   6. colour: no reserved colour, nothing in the amber family, and the
//      Tank's Bone stays its brightest value.
//
//   node tools/model-standard-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites, face decals): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, IcosahedronGeometry, Vector3 } = await import('three');
const { createTimeline, createPlayhead } = await import('../src/render/facet/timeline.js');
const { facetize, facetMaterial } = await import('../src/render/facet/material.js');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { buildWyrmFacet, WYRM_ABILITIES } = await import('../src/render/boss/wyrmfacet.js');
const { TANK_ABILITIES, TANK_HITS, TANK_SKILL_ABILITY, SWING_SEC, COMBO_LAB, WIND, hitPose, abilityPose } = await import('../src/render/critters/tankfacet.js');
const { createCritter } = await import('../src/render/critters/index.js');
const { ALLY_CLASSES } = await import('../src/sim/allies.js');
const { SKILLS } = await import('../src/sim/skills.js');
const { CLASS_SKILLS } = await import('../src/data/classes.js');
const { PALETTE } = await import('../src/data/palette.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;

// --- 1. timelines -----------------------------------------------------------
{
  const tl = createTimeline('t', 'Test', [{ id: 'a', label: 'a', dur: 0.3 }, { id: 'b', label: 'b', dur: 0.2 }], { cues: [{ at: 0.3, id: 'hit' }] });
  check('a timeline lasts the sum of its phases', Math.abs(tl.duration - 0.5) < 1e-9 && Math.abs(tl.startOf('b') - 0.3) < 1e-9);
  const s1 = JSON.stringify(tl.sample(0.37));
  tl.sample(0.05);
  tl.sample(0.49);
  check('a timeline sample is pure in t', JSON.stringify(tl.sample(0.37)) === s1 && tl.sample(0.4).id === 'b' && Math.abs(tl.sample(0.4).k - 0.5) < 1e-9);
  let cues = 0;
  const ph = createPlayhead(tl, { onCue: () => cues++ });
  const at = (smp) => `${smp.id}:${smp.k.toFixed(6)}`;
  const fwd = [];
  for (let i = 0; i < 8; i++) fwd.push(at(ph.update(0.05)));
  const cuesAfterPlay = cues;
  ph.setRate(-1);
  for (let i = 0; i < 8; i++) ph.update(0.05);
  const cuesAfterRewind = cues;
  ph.setRate(1);
  const again = [];
  for (let i = 0; i < 8; i++) again.push(at(ph.update(0.05)));
  check('a cue fires once per forward pass, never on the rewind', cuesAfterPlay === 1 && cuesAfterRewind === 1 && cues === 2, { cuesAfterPlay, cuesAfterRewind, cues });
  check('a rewind and replay land on the same poses', fwd.join() === again.join());
  const all = [...Object.values(WYRM_ABILITIES), ...Object.values(TANK_ABILITIES), ...TANK_HITS.map((h) => h.timeline)];
  const bad = all.filter((t) => !(t.duration > 0) || t.phases.some((p) => !(p.dur > 0) || !p.label) || !t.readout(t.duration / 2).includes(t.label));
  check('every ability and hit timeline has named phases and a readout', bad.length === 0 && all.length === 7, bad.map((t) => t.id));
}

// --- 2. faceting --------------------------------------------------------------
{
  const g = facetize(new IcosahedronGeometry(1, 1), { seed: 3 });
  const n = g.getAttribute('normal');
  const c = g.getAttribute('color');
  let flat = true;
  for (let i = 0; i < n.count; i += 3) {
    for (let j = 1; j < 3; j++) if (Math.abs(n.getX(i) - n.getX(i + j)) + Math.abs(n.getY(i) - n.getY(i + j)) + Math.abs(n.getZ(i) - n.getZ(i + j)) > 1e-5) flat = false;
  }
  const steps = new Set();
  for (let i = 0; i < c.count; i++) steps.add(r3(c.getX(i)));
  check('facetize gives flat normals (one per face)', g.index === null && flat);
  check('facetize steps the value per plane', steps.size >= 6, steps.size);
  const m = facetMaterial('#808080');
  check('a facet material is the toon material with vertex colours', m.isMeshToonMaterial && m.vertexColors === true && m.userData.facet === true);
}

// Ink: every instanced part (bar the glow shards) has its hull on its matrices.
function inkReport(root) {
  const parts = [];
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.inkHull) return;
    const hull = o.children.find((ch) => ch.isInstancedMesh && ch.instanceMatrix === o.instanceMatrix);
    parts.push({ name: o.name, count: o.count, inked: !!hull });
  });
  return parts;
}

// --- 3. the Wyrm --------------------------------------------------------------
function wyrmAt() {
  const w = buildWyrmFacet();
  const world = new Group();
  world.add(w.group);
  return { w, world };
}
const coil = ({ w, world }) => {
  world.updateMatrixWorld(true);
  return w.lab.coil();
};
const ent = (o = {}) => ({ x: 0, z: 0, mode: 'stalk', telegraph: null, burrowed: false, enraged: false, ...o });
{
  const { w, world } = wyrmAt();
  const parts = inkReport(w.group);
  const instances = parts.reduce((s, p) => s + p.count, 0);
  const uninked = parts.filter((p) => !p.inked).map((p) => p.name);
  check('the Wyrm is built of instanced parts', parts.length >= 6 && instances >= 300, { parts: parts.length, instances });
  check('every instanced Wyrm part is inked (bar the glowing cracks and the bronze tips on inked spikes)', uninked.every((n) => /crack|tips/.test(n)), uninked);

  // Travel straight ahead: a ground spot keeps its lateral place in the coil.
  w.setYaw(0);
  let t = 0;
  const bins = new Map();
  for (let f = 0; f < 60 * 7; f++) {
    t += DT;
    w.group.position.set(0, 0, 1.4 * t);
    world.updateMatrixWorld(true);
    w.pose({ t, moveK: 1, hpFrac: 1, e: ent({ x: 0, z: 1.4 * t }) });
    if (f < 60 * 2) continue;
    const pts = coil({ w, world });
    for (let i = 4; i < pts.length; i++) {
      const key = Math.round(pts[i].z / 0.05);
      const b = bins.get(key) || { lo: Infinity, hi: -Infinity };
      b.lo = Math.min(b.lo, pts[i].x);
      b.hi = Math.max(b.hi, pts[i].x);
      bins.set(key, b);
    }
  }
  let slip = 0;
  for (const b of bins.values()) slip = Math.max(slip, b.hi - b.lo);
  check('the coil slides through its own curves (no slip on travel)', slip < 0.03 && bins.size > 60, { slip: r3(slip), bins: bins.size });
}
{
  // The breath: the head draws back and up, the coil's base stays planted.
  const drift = (breath) => {
    const { w, world } = wyrmAt();
    w.setYaw(0.4);
    let t = 0;
    const step = (e) => {
      t += DT;
      world.updateMatrixWorld(true);
      w.pose({ t, moveK: 0, hpFrac: 1, e });
      return coil({ w, world });
    };
    for (let f = 0; f < 30; f++) step(ent());
    const base0 = coil({ w, world }).slice(4).map((p) => p.clone());
    const head0 = coil({ w, world })[0].clone();
    let maxDrift = 0;
    let headUp = 0;
    let reach = 0;
    for (let f = 0; f < 150; f++) {
      const tel = breath && f < 54 ? { attack: 'breath', startTick: 0, resolveTick: 54 } : null;
      const pts = step(ent({ telegraph: tel }));
      pts.slice(4).forEach((p, i) => (maxDrift = Math.max(maxDrift, p.distanceTo(base0[i]))));
      if (f < 54) headUp = Math.max(headUp, pts[0].y - head0.y);
      else if (f < 80) reach = Math.max(reach, Math.hypot(pts[0].x - head0.x, pts[0].z - head0.z));
    }
    return { maxDrift, headUp, reach };
  };
  const rest = drift(false);
  const br = drift(true);
  check("the breath's draw rears the head", br.headUp > 0.3, r3(br.headUp));
  check("the breath's strike throws the head forward", br.reach > 0.2, r3(br.reach));
  check('the coil base stays planted through the breath (only the rest sway moves it)', br.maxDrift <= rest.maxDrift + 0.005, { breath: r3(br.maxDrift), rest: r3(rest.maxDrift) });
}
{
  // The burrow: the sim's modes sink the Wyrm and bring it back up.
  const { w, world } = wyrmAt();
  let t = 0;
  const box = () => {
    world.updateMatrixWorld(true);
    return Math.max(...coil({ w, world }).map((p) => p.y));
  };
  const run = (frames, e) => {
    for (let f = 0; f < frames; f++) {
      t += DT;
      world.updateMatrixWorld(true);
      w.pose({ t, moveK: 0, hpFrac: 1, e });
    }
    return box();
  };
  const up = run(30, ent());
  const under = run(90, ent({ mode: 'burrowed', burrowed: true }));
  run(40, ent({ mode: 'emerging', burrowed: false }));
  run(60, ent({ mode: 'exposed' }));
  const back = run(120, ent({ mode: 'stalk' }));
  check('burrowed sinks the coil; it rises again after', under < up * 0.5 && Math.abs(back - up) < 0.12, { up: r3(up), under: r3(under), back: r3(back) });
}
{
  // A turntable (the Journal viewer) turns the coil with the head, rigidly.
  const { w, world } = wyrmAt();
  const local = (yaw) => {
    w.setYaw(yaw);
    world.updateMatrixWorld(true);
    w.pose({ t: 1, moveK: 0, hpFrac: 1, e: ent(), turntable: true });
    world.updateMatrixWorld(true);
    return coil({ w, world }).map((p) => w.group.worldToLocal(p.clone()).applyAxisAngle(new Vector3(0, 1, 0), -yaw));
  };
  const a = local(0);
  const b = local(2.1);
  const err = Math.max(...a.map((p, i) => p.distanceTo(b[i])));
  check('a turntable turns the coil rigidly with the head', err < 1e-3, r3(err));
  // The death collapse (pose with no entity) freezes the coil where it lay.
  let t = 1;
  for (let f = 0; f < 60; f++) {
    t += DT;
    w.group.position.set(Math.sin(t) * 2, 0, t);
    world.updateMatrixWorld(true);
    w.pose({ t, moveK: 1, hpFrac: 1, e: ent({ x: w.group.position.x, z: t }) });
  }
  const before = coil({ w, world }).slice(4).map((p) => p.clone());
  for (let f = 0; f < 30; f++) {
    t += DT;
    world.updateMatrixWorld(true);
    w.pose({ t, moveK: 0, hpFrac: 0, e: null });
  }
  const freeze = Math.max(...coil({ w, world }).slice(4).map((p, i) => p.distanceTo(before[i])));
  check('the death collapse freezes the coil (no snap straight)', freeze < 0.075, r3(freeze));
}

// --- 4. the Tank --------------------------------------------------------------
check('the combo swings at the sim cadence', Math.abs(SWING_SEC - ALLY_CLASSES.tank.attackIntervalTicks / 60) < 1e-9, { SWING_SEC, ticks: ALLY_CLASSES.tank.attackIntervalTicks });
{
  const missing = CLASS_SKILLS.tank.filter((id) => !TANK_SKILL_ABILITY[SKILLS[id].shape]);
  check(`every Tank skill plays an ability (${CLASS_SKILLS.tank.length} skills)`, missing.length === 0, missing);
  const chain = TANK_HITS.every((h, n) => h.next === TANK_HITS[(n + 1) % 3].from);
  check("each hit settles into the next hit's wind-up", chain);
  // No pops: every phase boundary of every hit is continuous, fresh from
  // the stance (hit 1) or chained from the last hit's held wind-up.
  const REST = abilityPose('slam', 0);
  let worst = 0;
  let where = '';
  const cases = [[0, true, REST], [0, false, TANK_HITS[0].from], [1, false, TANK_HITS[1].from], [2, false, TANK_HITS[2].from]];
  for (const [n, fresh, capture] of cases) {
    const tl = TANK_HITS[n].timeline;
    for (const ph of tl.phases.slice(1)) {
      const b = tl.startOf(ph.id);
      const a1 = hitPose(n, b - 1e-5, capture, fresh);
      const a2 = hitPose(n, b + 1e-5, capture, fresh);
      for (const k of Object.keys(a1)) {
        const d = Math.abs(a1[k] - a2[k]);
        if (d > worst) {
          worst = d;
          where = `hit ${n + 1} ${fresh ? 'fresh' : 'chained'} ${k} into ${ph.id}`;
        }
      }
    }
    // a chained hit starts exactly where the last one held
    if (!fresh) {
      const last = TANK_HITS[(n + 2) % 3].timeline;
      const held = hitPose((n + 2) % 3, last.startOf('ready') + 0.01, TANK_HITS[(n + 2) % 3].from, false);
      const start = hitPose(n, WIND, held, false);
      for (const k of Object.keys(held)) worst = Math.max(worst, Math.abs(held[k] - start[k]));
    }
  }
  check('every hit and every chain is continuous (no pop at a phase change)', worst < 0.01, { worst: r3(worst), where });
  const contact = COMBO_LAB.strikes.map((s) => `${COMBO_LAB.at(s - 0.002).phase}>${COMBO_LAB.at(s + 0.002).phase}`);
  check("the lab combo's three impact cues sit on the strike's contact frame", contact.every((p) => p === 'strike>overshoot'), contact);
}

function tankRig(facet = true) {
  const c = createCritter('tank', { facet });
  const world = new Group();
  world.add(c.group);
  return { c, world };
}
{
  // The hips lead, the slab follows (hit 1, backhand bash).
  const { c, world } = tankRig();
  const { torso, shield } = c.lab.parts;
  for (let f = 0; f < 20; f++) {
    world.updateMatrixWorld(true);
    c.update(DT);
  }
  c.cue('basic', {});
  let hipF = -1;
  let slabF = -1;
  const midHip = (TANK_HITS[0].from.yaw + TANK_HITS[0].strike.yaw) / 2;
  const midSlab = (TANK_HITS[0].from.sry + TANK_HITS[0].strike.sry) / 2;
  for (let f = 0; f < 40; f++) {
    world.updateMatrixWorld(true);
    c.update(DT);
    if (hipF < 0 && torso.rotation.y < midHip) hipF = f;
    if (slabF < 0 && shield.rotation.y < midSlab) slabF = f;
  }
  check('the hips turn through the swing before the slab does', hipF >= 0 && slabF > hipF, { hipFrame: hipF, slabFrame: slabF });
}
{
  // The third hit lunges: the far foot steps in toward the facing.
  const { c, world } = tankRig();
  const tick = (n) => {
    for (let f = 0; f < n; f++) {
      world.updateMatrixWorld(true);
      c.update(DT);
    }
  };
  tick(20);
  const z0 = c.lab.feet()[0].z;
  c.cue('basic', {});
  tick(39);
  c.cue('basic', {});
  tick(39);
  c.cue('basic', {});
  let z1 = z0;
  for (let f = 0; f < 24; f++) {
    tick(1);
    z1 = Math.max(z1, c.lab.feet()[0].z);
  }
  check('the crushing slam lunges the lead foot in', z1 - z0 > 0.08, r3(z1 - z0));
}
{
  // Walk eight ways under a fixed aim: the feet stay put while they carry
  // weight, step along the travel, never both at once; the lean follows.
  const rows = [];
  let worstLock = 0;
  let both = 0;
  for (let d = 0; d < 8; d++) {
    const a = (d * Math.PI) / 4;
    const vx = Math.sin(a) * 2.1;
    const vz = Math.cos(a) * 2.1;
    const { c, world } = tankRig();
    c.setYaw(0);
    c.setAnim('idle');
    for (let f = 0; f < 20; f++) {
      world.updateMatrixWorld(true);
      c.update(DT);
    }
    c.setAnim('walk');
    let prev = c.lab.feet();
    let steps = 0;
    let pitch = 0;
    let roll = 0;
    let n = 0;
    for (let f = 0; f < 180; f++) {
      c.group.position.x += vx * DT;
      c.group.position.z += vz * DT;
      world.updateMatrixWorld(true);
      c.update(DT);
      world.updateMatrixWorld(true);
      const feet = c.lab.feet();
      if (!feet[0].planted && !feet[1].planted) both++;
      feet.forEach((ft, i) => {
        if (ft.planted) worstLock = Math.max(worstLock, Math.hypot(ft.drawnX - ft.x, ft.drawnZ - ft.z));
        if (ft.planted && prev[i].planted) worstLock = Math.max(worstLock, Math.hypot(ft.x - prev[i].x, ft.z - prev[i].z));
        if (ft.planted && !prev[i].planted) steps++;
      });
      prev = feet;
      if (f > 40) {
        pitch += c.lab.parts.torso.rotation.x;
        roll += c.lab.parts.torso.rotation.z;
        n++;
      }
    }
    rows.push({ dir: d * 45, steps, pitch: r3(pitch / n), roll: r3(roll / n) });
  }
  check('planted feet never slide (drawn on their planted spot)', worstLock < 1e-3, r3(worstLock));
  check('the feet step one at a time', both === 0, both);
  check('every direction of travel steps the feet', rows.every((r) => r.steps >= 6), rows.map((r) => `${r.dir}:${r.steps}`));
  const fwd = rows[0];
  const back = rows[4];
  const side = rows[2];
  const otherSide = rows[6];
  check('the walk leans into the travel: forward ahead, a backpedal back', fwd.pitch > 0.04 && back.pitch < -0.03, { forward: fwd.pitch, backpedal: back.pitch });
  check('a sidestep leans aside, each way', Math.sign(side.roll) === -Math.sign(otherSide.roll) && Math.abs(side.roll) > 0.03, { right: side.roll, left: otherSide.roll });
}
{
  // Steps land ahead along the travel (the landing leads the body).
  const { c, world } = tankRig();
  c.setYaw(0);
  c.setAnim('walk');
  const v = new Vector3(1.5, 0, -1.5);
  let prev = c.lab.feet();
  let ahead = 0;
  let behind = 0;
  for (let f = 0; f < 200; f++) {
    c.group.position.addScaledVector(v, DT);
    world.updateMatrixWorld(true);
    c.update(DT);
    const feet = c.lab.feet();
    feet.forEach((ft, i) => {
      if (ft.planted && !prev[i].planted) {
        const rel = (ft.x - prev[i].x) * v.x + (ft.z - prev[i].z) * v.z;
        if (rel > 0) ahead++;
        else behind++;
      }
    });
    prev = feet;
  }
  check('each step lands further along the travel', ahead >= 6 && behind === 0, { ahead, behind });
}
{
  // Going down unlocks the feet and does not throw.
  const { c, world } = tankRig();
  let ok = true;
  try {
    c.setAnim('downed');
    for (let f = 0; f < 90; f++) {
      world.updateMatrixWorld(true);
      c.update(DT);
    }
    c.setAnim('idle');
    for (let f = 0; f < 90; f++) {
      world.updateMatrixWorld(true);
      c.update(DT);
    }
  } catch (err) {
    ok = String(err);
  }
  check('downed and revived poses run', ok === true, ok === true ? '' : ok);
  const parts = inkReport(c.group);
  check('the Tank carries instanced parts, inked', parts.length >= 5 && parts.filter((p) => !p.inked).every((p) => /rivet|stud/.test(p.name)), parts.map((p) => `${p.name}:${p.count}${p.inked ? '' : ' (no ink)'}`));
}

// --- 5. the flag and the classic rigs -------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  check('the pilot plays the Wyrm and the Tank by default', MODEL_STANDARD.wyrm === true && MODEL_STANDARD.tank === true && facetOn('wyrm', q('')) && facetOn('tank', q('')) && !facetOn('heron', q('')));
  check('?facet=0 turns every model classic', !facetOn('wyrm', q('facet=0')) && !facetOn('tank', q('facet=0')));
  check('?facet=wyrm keeps only the Wyrm faceted', facetOn('wyrm', q('facet=wyrm')) && !facetOn('tank', q('facet=wyrm')));
  const classic = createCritter('tank', { facet: false });
  const faceted = createCritter('tank', { facet: true });
  check('the classic Tank still builds beside the faceted one', classic.modelStandard === false && classic.lab === null && faceted.modelStandard === true);
}

// --- 6. colour -------------------------------------------------------------------
{
  const RESERVED = { ember: '#FF5A36', heal: '#5FE873' };
  const close = (a, b) => {
    const x = new Color(a);
    const y = new Color(b);
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
  };
  const mats = (root) => {
    const out = new Set();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.inkHull) return;
      for (const m of [].concat(o.material)) if (m && m.color && !m.map && !m.isShaderMaterial) out.add(m);
    });
    return [...out];
  };
  // the analyzer's amber family: hue 30-50, saturation over .35, lightness
  // over 40, on the displayed (sRGB) colour
  const amber = (c) => {
    const srgb = c.clone().convertLinearToSRGB();
    const hsl = {};
    srgb.getHSL(hsl);
    const max = Math.max(srgb.r, srgb.g, srgb.b);
    const sat = max > 0 ? (max - Math.min(srgb.r, srgb.g, srgb.b)) / max : 0;
    return hsl.h * 360 >= 30 && hsl.h * 360 <= 50 && sat > 0.35 && hsl.l > 0.4;
  };
  const wyrm = buildWyrmFacet();
  const tank = createCritter('tank', { facet: true });
  const all = [...mats(wyrm.group).map((m) => ['wyrm', m]), ...mats(tank.group).map((m) => ['tank', m])];
  const reserved = all.filter(([, m]) => close(m.color.getHex(), RESERVED.ember) || close(m.color.getHex(), RESERVED.heal)).map(([w, m]) => `${w} #${m.color.getHexString()}`);
  check('no Ember or Bright Heal on either model', reserved.length === 0, reserved);
  const amb = all.filter(([, m]) => amber(m.color)).map(([w, m]) => `${w} #${m.color.getHexString()}`);
  check('no material in the amber family', amb.length === 0, amb);
  const violetT = mats(tank.group).filter((m) => close(m.color.getHex(), PALETTE.godstuffViolet)).length;
  check('no Violet on the Tank', violetT === 0, violetT);
  const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const bone = luma(new Color(PALETTE.bone));
  const brighter = mats(tank.group).filter((m) => m.isMeshToonMaterial && luma(m.color) > bone + 1e-3).map((m) => `#${m.color.getHexString()}`);
  check("Bone stays the Tank's brightest value", brighter.length === 0, brighter);
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
