#!/usr/bin/env node
// MODEL STANDARD, LEVEL III CHAMPIONS (docs/MODEL_STANDARD.md "Level III
// champions"): the faceted Bone Reeve and Gravebell Ringer, headless.
//
//   1. flags: both play the standard by default, `?facet=0` keeps the classic
//      rigs, the Level V champions stay classic, the champion table builds
//      the faceted rig with the champions' soft flash, the classic rigs still
//      build;
//   2. the rigs: the classic interface plus lab, points and react; the root's
//      first child carries the body (the hit overlay wraps it), the shadow is
//      a floor piece; every instanced part inked; faceted geometry under every
//      vertex-coloured material; the hit flash's white emissive on every mat;
//      named points (B8); no Ember, Bright Heal or Violet in the body, nothing
//      in the amber family;
//   3. the [M] beats: strikes of 2 to 3 frames then a held contact (B2), off
//      on the first frame (B4), one overshoot in the settle (B5), the lab's
//      cue on the contact;
//   4. locked feet under the robes: a walk with a turn never slides a planted
//      foot, every foot steps, the legs reach their feet, a foot is always
//      down; at rest all planted; a spin in place;
//   5. the sim drives each move: the Reaping Sweep draws the scythe back
//      through its warning and swings on the resolve; the Grave Lance raises
//      it and drives on the resolve; the Death Knell hauls on the rope
//      through its warning, the bell swinging wide, and tolls on the resolve
//      with the bell crashed over; the Grave Call lifts the mallet and slams
//      on the resolve; telegraphs are known by move and start tick (a fresh
//      copy every tick never restarts one); on a slow frame a strike runs no
//      further than its contact while the warning is live; the feet hold
//      through every move;
//   6. both hands reach the scythe's grips, the rope and the mallet in every
//      pose; the rope runs from the left hand to the yoke's hitch; the
//      mallet's head reaches the floor on the slam;
//   7. spawn-in on a new champion only; the rage flares the tell;
//   8. the lab: an entry per champion, each ability plays without a throw.
//
//   node tools/model-standard-level3-champions-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const reeveM = await import('../src/render/enemies/champfacet/bonereeve.js');
const ringerM = await import('../src/render/enemies/champfacet/gravebellringer.js');
const { CHAMPION_BUILDERS, CHAMPION_FLASH, buildBoneReeve } = await import('../src/render/enemies/champions.js');
const { buildGravebellRinger } = await import('../src/render/enemies/champions2.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-champions.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;
const cosmetic = { range: (a, b) => (a + b) / 2, next: () => 0.5, pick: (l) => l[0], int: (a) => a, chance: () => false };

const CHAMPS = [
  { kind: 'bone_reeve', name: 'Bone Reeve', build: reeveM.buildBoneReeveFacet, classic: buildBoneReeve, abilities: reeveM.REEVE_ABILITIES, channels: reeveM.abilityChannels, walk: reeveM.REEVE_WALK, feet: ['footL', 'footR'], points: ['tip', 'hand', 'lantern', 'eye'], contact: ['sweep', 'lance'] },
  { kind: 'gravebell_ringer', name: 'Gravebell Ringer', build: ringerM.buildGravebellRingerFacet, classic: buildGravebellRinger, abilities: ringerM.RINGER_ABILITIES, channels: ringerM.abilityChannels, walk: ringerM.RINGER_WALK, feet: ['footL', 'footR'], points: ['bell', 'clapper', 'mallet', 'hand', 'eye'], contact: ['knell', 'call'] },
];

// --- 1. flags ----------------------------------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  const kinds = CHAMPS.map((c) => c.kind);
  check('the Level III champions play the model standard by default', kinds.every((k) => MODEL_STANDARD[k] === true && facetOn(k, q(''))));
  check('?facet=0 keeps them classic; ?facet=bone_reeve only the Reeve', kinds.every((k) => !facetOn(k, q('facet=0'))) && facetOn('bone_reeve', q('facet=bone_reeve')) && !facetOn('gravebell_ringer', q('facet=bone_reeve')));
  check('the Level V champions stay classic', !facetOn('bell_abbess', q('')) && !facetOn('furnace_knight', q('')) && !facetOn('glassblower', q('')));
  const built = kinds.map((k) => CHAMPION_BUILDERS[k](cosmetic));
  check("the champion table builds the faceted rigs with the champions' soft flash", built.every((b) => b.group.userData.modelStandard === true && b.flashScale === CHAMPION_FLASH && typeof b.pose === 'function'), built.map((b) => b.flashScale));
  const classics = CHAMPS.map((C) => C.classic(cosmetic)).filter((r) => r && r.group && typeof r.pose === 'function' && !r.group.userData.modelStandard);
  check('the classic rigs still build beside the faceted ones', classics.length === CHAMPS.length);
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
    if (!x.isMesh) return;
    const p = new Vector3();
    x.getWorldPosition(p);
    if (p.y > 0.1) ok = false;
  });
  return ok;
}
const amber = (c) => {
  const srgb = c.clone().convertLinearToSRGB();
  const hsl = {};
  srgb.getHSL(hsl);
  const max = Math.max(srgb.r, srgb.g, srgb.b);
  const sat = max > 0 ? (max - Math.min(srgb.r, srgb.g, srgb.b)) / max : 0;
  return hsl.h * 360 >= 30 && hsl.h * 360 <= 50 && sat > 0.35 && hsl.l > 0.4;
};
for (const B of CHAMPS) {
  const r = B.build();
  const iface = ['group', 'mats', 'setYaw', 'pose', 'lab', 'points', 'react'].filter((k) => !(k in r));
  check(`${B.name}: the classic interface plus lab, points and react`, iface.length === 0 && r.group.userData.modelStandard === true, iface);
  const body = r.group.children[0];
  let meshes = 0;
  body.traverse((x) => x.isMesh && meshes++);
  const others = r.group.children.slice(1);
  check(`${B.name}: the root's first child carries the body, the rest are floor pieces`, meshes > 30 && others.length >= 1 && others.every(floorPiece), others.map((o) => o.name || o.type));
  const ink = inkReport(r.group);
  // light, not ink-lined: the teeth, the eyes, the sockets and the runes
  const bare = ink.filter((p) => !p.inked && !/teeth|eyes|sockets|runes/.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink`, ink.length >= 10 && bare.length === 0, { parts: ink.length, bare });
  const black = [];
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.vertexColors && !o.geometry.getAttribute('color')) black.push(o.name || o.geometry.type);
  });
  check(`${B.name}: every vertex-coloured material sits on faceted geometry`, black.length === 0, black);
  const flash = r.mats.filter((m) => !(m.emissive && m.emissive.getHex() === 0xffffff && m.emissiveIntensity === 0));
  check(`${B.name}: every body material takes the hit flash (white emissive, off at rest)`, r.mats.length >= 6 && flash.length === 0, { mats: r.mats.length, bad: flash.length });
  const pts = [...B.points, ...B.feet].filter((n) => !(r.points[n] && r.points[n].isObject3D));
  let rooted = true;
  for (const p of Object.values(r.points)) {
    let x = p;
    while (x.parent) x = x.parent;
    if (x !== r.group) rooted = false;
  }
  check(`${B.name}: named points (${B.points.join(', ')}) and each foot (B8)`, pts.length === 0 && rooted, pts);
  const R = r.react;
  check(`${B.name}: the hit overlay's tuning (a champion's half squash and flinch, its small hop)`, R && R.squash === 1 && R.flinch === 1 && R.knock === 1 && R.midY > 0.3, R);
  // colour
  const close = (a, b) => {
    const x = new Color(a);
    const y = new Color(b);
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
  };
  const mats = new Set();
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.color && !m.map) mats.add(m);
  });
  const reserved = [...mats].filter((m) => ['#FF5A36', '#5FE873', '#B79CF0'].some((c) => close(m.color.getHex(), c))).map((m) => `#${m.color.getHexString()}`);
  const amb = [...mats].filter((m) => amber(m.color)).map((m) => `#${m.color.getHexString()}`);
  check(`${B.name}: no Ember, Bright Heal or Violet in the body, nothing in the amber family`, reserved.length === 0 && amb.length === 0, { reserved, amb });
}

// --- 3. the [M] beats ------------------------------------------------------------------
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
for (const B of CHAMPS) {
  for (const id of B.contact) {
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
    const last = ph[ph.length - 1];
    const s0 = B.channels(id, tl.sample(tl.startOf(last.id) + 1e-6));
    let crossed = false;
    for (let k = 0.62; k <= 1; k += 0.02) {
      const c = B.channels(id, tl.sample(tl.startOf(last.id) + last.dur * k));
      for (const key of Object.keys(c)) if (Math.abs(s0[key]) > 0.05 && c[key] * s0[key] < 0) crossed = true;
    }
    check(`${B.name} ${tl.label}: its ${last.id} overshoots rest once (B5)`, crossed);
    const cue = (tl.cues || [])[0];
    const contactAt = strikes.length ? tl.startOf(ph[strikes[strikes.length - 1]].id) + STRIKE_SEC : -1;
    check(`${B.name} ${tl.label}: the lab's cue fires on the contact`, cue && Math.abs(cue.at - contactAt) < 1e-6, cue);
  }
}

// --- 4. locked feet ---------------------------------------------------------------------
function drive(r, e, frames, move, out) {
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    out.tick += 1;
    if (move) move(f);
    out.world.updateMatrixWorld(true);
    r.pose({ t: out.t, tick: out.tick, e });
    if (r.lab.legs) for (const S of r.lab.legs.state) out.gap = Math.max(out.gap, S.end.distanceTo(S.foot));
    const feet = r.lab.feet();
    if (feet.every((ft) => !ft.planted)) out.allAir++;
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
  return { world, t: 0, tick: 0, slide: 0, prev: [], order: [], gap: 0, allAir: 0 };
};
for (const B of CHAMPS) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null, rage: false };
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
  check(`${B.name}: walking with a turn, a planted foot never slides`, st.slide < 1e-4, r3(st.slide));
  check(`${B.name}: every foot steps along the travel, the two in turn`, steps.every((n) => n >= 4) && st.order.length > 8 && alt / (st.order.length - 1) > 0.3, { steps, landings: st.order.length, switches: alt });
  check(`${B.name}: walking, every drawn foot reaches its gait point and a foot is always down`, st.gap < 1e-3 && st.allAir === 0, { gap: r3(st.gap), allAir: st.allAir });
  const before = r.lab.feet().map((f) => f.steps);
  drive(r, e, 120, null, st);
  const after = r.lab.feet().map((f) => f.steps);
  const settled = after.map((n, i) => n - before[i]);
  drive(r, e, 120, null, st);
  const still = r.lab.feet().map((f, i) => f.steps - after[i]);
  check(`${B.name}: at rest every foot is planted again and stays (no step loop)`, r.lab.feet().every((f) => f.planted) && still.every((n) => n === 0), { settled, still });
  st.gap = 0;
  st.allAir = 0;
  let y = yaw;
  drive(r, e, 90, () => {
    y += (yaw + Math.PI * 0.999 - y) * (1 - Math.exp(-9 * DT));
    r.setYaw(y);
  }, st);
  check(`${B.name}: a spin in place steps round with no leg past its reach`, st.gap < 1e-3 && st.allAir <= 3, { gap: r3(st.gap), allAir: st.allAir });
}

// --- 5. the sim drives each move --------------------------------------------------------
const peak = { max: {}, min: {} };
const watch = (r) => {
  const c = r.lab.channels();
  for (const [k, v] of Object.entries(c)) {
    peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
    peak.min[k] = Math.min(peak.min[k] ?? Infinity, v);
  }
};
const reset = () => {
  peak.max = {};
  peak.min = {};
};
// a warning of W ticks (a fresh copy every tick, a co-op guest's snapshot),
// then the resolve: returns the wind-up's peak, the channel at the last
// warned tick, and the strike's peak over the next few frames
function warned(r, st, e, move, W, windKey, strikeKey, extra = {}, each = null) {
  const T0 = st.tick + 1;
  let restarted = false;
  let atResolve = null;
  reset();
  drive(r, e, W, (f) => {
    e.telegraph = { move, startTick: T0, resolveTick: T0 + W, x: 0, z: 0, ...extra };
    watch(r);
    if (each) each(f);
    const c = r.lab.channels();
    // (the strike starts one strike before the resolve: the wind-up is judged before it)
    if (f > 10 && f < W - 6 && c[windKey] < peak.max[windKey] - 0.2) restarted = true;
    if (f === W - 1) atResolve = c[strikeKey];
  }, st);
  const wind = peak.max[windKey];
  e.telegraph = null;
  reset();
  drive(r, e, 4, () => watch(r), st);
  const struck = peak.max[strikeKey];
  return { wind, atResolve, struck, restarted };
}
{
  // the Bone Reeve: the 54-tick cone, the 66-tick lane
  const r = reeveM.buildBoneReeveFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  const sw = warned(r, st, e, 'reaping_sweep', 54, 'draw', 'swing', { dirX: 0, dirZ: 1 });
  // the blade crossed the front: the scythe's yaw went from the right to the left
  const P = r.lab.parts;
  const swungYaw = P.scythe.rotation.y;
  drive(r, e, 60, null, st);
  check('Reaping Sweep: the scythe draws back through its warning and swings across the front on the resolve', sw.wind > 0.95 && sw.atResolve > 0 && sw.struck > 0.95 && swungYaw < -1.2, { ...sw, swungYaw: r3(swungYaw) });
  check('Reaping Sweep: a fresh copy of the warning every tick never restarts the draw', !sw.restarted);
  let raisedY = 0;
  const ln = warned(r, st, e, 'grave_lance', 66, 'raise', 'drive', { length: 6, fromX: 0, fromZ: 0 }, () => (raisedY = Math.max(raisedY, P.scythe.position.y)));
  const drivenPitch = P.scythe.rotation.x;
  drive(r, e, 60, null, st);
  check('Grave Lance: the scythe rises overhead through its warning and drives down into the floor ahead on the resolve', ln.wind > 0.95 && ln.atResolve > 0 && ln.struck > 0.95 && raisedY > 2.1 && drivenPitch > 1.1, { ...ln, raisedY: r3(raisedY), drivenPitch: r3(drivenPitch) });
  check('Bone Reeve: the feet hold through the draw, the swing, the raise and the drive', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
  // a slow frame (1 fps) while the warning is live: the swing lands and holds
  {
    const r2 = reeveM.buildBoneReeveFacet();
    const s2 = runner(r2);
    const e2 = { id: 8, telegraph: null };
    drive(r2, e2, 10, null, s2);
    const T = s2.tick + 1;
    e2.telegraph = { move: 'reaping_sweep', startTick: T, resolveTick: T + 54, x: 0, z: 0 };
    for (let f = 0; f < 54; f++) {
      s2.t += 1;
      s2.tick += 60;
      r2.pose({ t: s2.t, tick: s2.tick, e: e2 });
    }
    const c = r2.lab.channels();
    check('Bone Reeve: on a slow frame the swing runs no further than its contact while the warning is live', c.swing > 0.95 && c.squash > 0.95, { swing: r3(c.swing), squash: r3(c.squash) });
  }
}
{
  // the Gravebell Ringer: the 78-tick ring, the 64-tick ring
  const r = ringerM.buildGravebellRingerFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  let swingWide = 0;
  const kn = warned(r, st, e, 'death_knell', 78, 'heave', 'toll', { radius: 3.6 }, () => (swingWide = Math.max(swingWide, Math.abs(r.lab.swing()))));
  let crashed = 0;
  drive(r, e, 12, () => (crashed = Math.max(crashed, Math.abs(r.lab.swing()))), st);
  drive(r, e, 80, null, st);
  const stilled = Math.abs(r.lab.swing());
  check('Death Knell: it hauls on the rope through its warning with the bell swinging wide, tolls on the resolve with the bell crashed over, and the bell stills again', kn.wind > 0.95 && kn.atResolve > 0 && kn.struck > 0.95 && swingWide > 0.25 && crashed > 0.6 && stilled < 0.1, { ...kn, swingWide: r3(swingWide), crashed: r3(crashed), stilled: r3(stilled) });
  check('Death Knell: a fresh copy of the warning every tick never restarts the heave', !kn.restarted);
  const P = r.lab.parts;
  let malletUp = 0;
  const cl = warned(r, st, e, 'grave_call', 64, 'lift', 'slam', { radius: 1.8, x: 2, z: 2 }, () => {
    r.group.updateMatrixWorld(true);
    malletUp = Math.max(malletUp, r.points.mallet.getWorldPosition(new Vector3()).y);
  });
  r.group.updateMatrixWorld(true);
  const headY = r.points.mallet.getWorldPosition(new Vector3()).y;
  drive(r, e, 60, null, st);
  check("Grave Call: the mallet rises high through its warning and slams into the floor ahead on the resolve (the head at the floor)", cl.wind > 0.95 && cl.atResolve > 0 && cl.struck > 0.95 && malletUp > 2.4 && headY < 0.25, { ...cl, malletUp: r3(malletUp), headY: r3(headY) });
  check('Gravebell Ringer: the feet hold through the heave, the toll, the lift and the slam', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
  {
    const r2 = ringerM.buildGravebellRingerFacet();
    const s2 = runner(r2);
    const e2 = { id: 10, telegraph: null };
    drive(r2, e2, 10, null, s2);
    const T = s2.tick + 1;
    e2.telegraph = { move: 'grave_call', startTick: T, resolveTick: T + 64, x: 0, z: 0 };
    for (let f = 0; f < 64; f++) {
      s2.t += 1;
      s2.tick += 60;
      r2.pose({ t: s2.t, tick: s2.tick, e: e2 });
    }
    const c = r2.lab.channels();
    check('Gravebell Ringer: on a slow frame the slam runs no further than its contact while the warning is live', c.slam > 0.95 && c.squash > 0.95, { slam: r3(c.slam), squash: r3(c.squash) });
  }
}

// --- 6. the hands, the grips, the rope -----------------------------------------------------
for (const B of CHAMPS) {
  const r = B.build();
  let miss = 0;
  for (const id of B.contact) {
    const tl = B.abilities[id];
    for (let t = 0; t <= tl.duration; t += 0.02) {
      r.lab.pose({ dt: DT, ability: id, abT: t });
      for (const A of r.lab.arms) miss = Math.max(miss, A.fist.position.distanceTo(A.hand));
    }
  }
  r.lab.pose({ dt: DT, ability: null, abT: 0 });
  for (const A of r.lab.arms) miss = Math.max(miss, A.fist.position.distanceTo(A.hand));
  check(`${B.name}: the hands reach their grips in every pose`, miss < 0.02, r3(miss));
}
{
  // the Reeve: both fists sit on the pole
  const r = reeveM.buildBoneReeveFacet();
  const P = r.lab.parts;
  let worst = 0;
  const v = new Vector3();
  for (const [id, t] of [['sweep', 0.3], ['sweep', 0.95], ['lance', 0.5], ['lance', 1.1], [null, 0]]) {
    r.lab.pose({ dt: DT, ability: id, abT: t });
    r.group.updateMatrixWorld(true);
    for (const A of r.lab.arms) {
      // the fist's distance from the pole's axis, in scythe space
      P.scythe.worldToLocal(A.fist.getWorldPosition(v));
      worst = Math.max(worst, Math.hypot(v.x, v.z));
    }
  }
  check('Bone Reeve: both fists sit on the scythe\'s pole in every pose', worst < 0.03, r3(worst));
}
{
  // the Ringer: the rope runs from the left fist to the yoke's hitch
  const r = ringerM.buildGravebellRingerFacet();
  const P = r.lab.parts;
  let worst = 0;
  for (const [id, t] of [['knell', 0.5], ['knell', 1.3], ['call', 0.5], [null, 0]]) {
    r.lab.pose({ dt: DT, ability: id, abT: t });
    r.group.updateMatrixWorld(true);
    const fist = r.lab.arms[0].fist.getWorldPosition(new Vector3());
    const foot = P.rope.getWorldPosition(new Vector3());
    const top = P.rope.localToWorld(new Vector3(0, 1, 0));
    const hitch = P.chest.localToWorld(new Vector3(-0.18, 2.4, -0.02));
    worst = Math.max(worst, fist.distanceTo(foot), top.distanceTo(hitch));
  }
  check('Gravebell Ringer: the rope runs from the left fist up to the yoke\'s hitch in every pose', worst < 0.05, r3(worst));
}

// --- 7. spawn-in and rage -----------------------------------------------------------------
for (const B of CHAMPS) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null };
  drive(r, e, 1, null, st);
  const g0 = r.lab.grow();
  drive(r, e, Math.ceil(SPAWN_SEC * 60) + 2, null, st);
  const g1 = r.lab.grow();
  r.group.position.x += 3; // a jump in place (a teleport): no spawn-in
  drive(r, e, 1, null, st);
  const g2 = r.lab.grow();
  drive(r, { id: 2, telegraph: null }, 1, null, st);
  const g3 = r.lab.grow();
  check(`${B.name}: grows in from the floor on a new champion only (B7)`, g0 < 0.5 && g1 === 1 && g2 === 1 && g3 < 0.5, { g0: r3(g0), g1, g2, g3: r3(g3) });
}
{
  const glow = (B, rage) => {
    const r = B.build();
    const st = runner(r);
    drive(r, { id: 1, telegraph: null, rage }, 30, null, st);
    let best = 0;
    r.group.traverse((o) => {
      if (o.isSprite) best = Math.max(best, o.material.opacity);
    });
    return best;
  };
  for (const B of CHAMPS) check(`${B.name}: the rage flares the tell`, glow(B, true) > glow(B, false) + 0.05, { calm: r3(glow(B, false)), rage: r3(glow(B, true)) });
}

// --- 8. the lab ---------------------------------------------------------------------------
{
  check('the model lab lists both Level III champions after the Level II pair', LAB_ENTRIES.map((e) => e.id).slice(0, 6).join(',') === 'briar_knight,moss_hart,sluice_warden,lockkeeper,bone_reeve,gravebell_ringer', LAB_ENTRIES.map((e) => e.id));
  const bad = [];
  const vfx = new Proxy({}, { get: () => () => null });
  for (const E of LAB_ENTRIES.filter((x) => CHAMPS.some((B) => B.kind === x.id))) {
    try {
      const ent = E.build({ cosmetic, vfx, play: () => null });
      const world = new Group();
      world.add(ent.group, ent.classic);
      for (const [id] of E.abilities) {
        const tl = ent.timeline(id);
        ent.reset();
        for (let t = 0; t <= tl.duration; t += 1 / 30) {
          ent.update({ mode: 'ability', ability: id, classic: true, movePhase: 0, t }, 1 / 30, t);
          for (const c of ent.cues(id)) if (Math.abs(c.at - t) < 1 / 60) ent.onCue(c.id, { x: 0, z: 0 });
        }
      }
      ent.update({ mode: 'move', ability: null, classic: true, movePhase: 1, t: 0 }, 1 / 30, 0);
    } catch (err) {
      bad.push(`${E.id}: ${err.message}`);
    }
  }
  check('every Level III lab entry plays every ability, with its classic twin beside', bad.length === 0, bad);
}

console.log(fails.length ? `\n${fails.length} failed` : '\nall pass');
process.exit(fails.length ? 1 : 0);
