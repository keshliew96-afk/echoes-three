#!/usr/bin/env node
// MODEL STANDARD, LEVEL III BOSSES probe — headless Node, builds the rigs; no
// browser. The slice rebuilds the Lich Ram and the Ash Raven to the model
// standard (docs/MODEL_STANDARD.md) against the [M] checklist
// (VFX_HIT_RULES §6.1); the Barrow Wyrm is the pilot's. Visual only. Checks:
//   1. the flags: both play faceted by default, `?facet=` turns them classic
//      or picks them, the Level V bosses stay classic, the classics build;
//   2. every rig: the classic interface plus lab, points and react; the root
//      holds the moving body in its first child and only floor pieces beside
//      it; every instanced part inked; every vertex-coloured material on
//      faceted geometry; its named points;
//   3. colour: no Ember, no Bright Heal, nothing in the amber family;
//   4. the [M] beats on every ability: a strike of at most 3 frames followed
//      by a held contact (B2), a strike that leaves on its first frame (B4),
//      a settle that overshoots rest once (B5), a recoil on every hit (B3),
//      the rush's pull-back and drive (B9);
//   5. locked feet: the Ram trots the sim's speed with turns, a planted hoof
//      never sliding, its diagonal pairs stepping in turn; the Raven hops,
//      both feet leaving and landing together, a planted talon never sliding;
//   6. the sim drives each ability: the rush (the lane's wind-up, the 11 u/s
//      gallop, the slam and the stuck, the wrench free), the call (the gather
//      read ahead from nextGraveTick, the stamp on the call's tick, a held-
//      back call waiting at the top of its gather), the dive (the rise into
//      the air, the stoop as the sim's dive starts, the skim, the landing on
//      the resolve, the preen), the gust, the omen; the rage; a co-op guest's
//      fresh telegraph copies never restart a wind-up; a boss killed in its
//      wind-up never plays the strike; a hitch is not a new boss;
//   7. the spawn-in (B7), a pooled rig posed for a new boss, the turntable;
//   8. the lab: an entry per boss, each ability plays without a throw.
//
//   node tools/model-standard-level3-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const ramM = await import('../src/render/boss/lichramfacet.js');
const ravenM = await import('../src/render/boss/ashravenfacet.js');
const { buildLichram } = await import('../src/render/boss/slice2.js');
const { buildAshRaven } = await import('../src/render/boss/third.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-bosses.js');
const { LICHRAM } = await import('../src/sim/bosses/lichram.js');
const { ASHRAVEN } = await import('../src/sim/bosses/ashraven.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;

const BOSSES = [
  { kind: 'lichram', name: 'Lich Ram', build: ramM.buildLichramFacet, classic: buildLichram, abilities: ramM.LICHRAM_ABILITIES, channels: ramM.abilityChannels, walk: LICHRAM.moveSpeed, points: ['mouth', 'tip', 'chest', 'hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'], rest: 'stalk' },
  { kind: 'ashraven', name: 'Ash Raven', build: ravenM.buildAshRavenFacet, classic: buildAshRaven, abilities: ravenM.RAVEN_ABILITIES, channels: ravenM.abilityChannels, walk: ASHRAVEN.moveSpeed, points: ['mouth', 'tip', 'chest', 'wingL', 'wingR', 'footL', 'footR'], rest: 'stalk' },
];

// --- 1. flags ----------------------------------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  const kinds = BOSSES.map((B) => B.kind);
  check('the Level III bosses play the model standard by default', kinds.every((k) => MODEL_STANDARD[k] === true && facetOn(k, q(''))) && facetOn('wyrm', q('')));
  check('?facet=0 turns them classic', kinds.every((k) => !facetOn(k, q('facet=0'))));
  check('?facet=lichram keeps only the Lich Ram faceted', facetOn('lichram', q('facet=lichram')) && !facetOn('ashraven', q('facet=lichram')));
  check('the Level V bosses stay classic', !facetOn('hush', q('')) && !facetOn('skyhorn', q('')) && !facetOn('hourwarden', q('')));
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
  // light, not ink-lined parts: the runes and the teeth
  const bare = ink.filter((p) => !p.inked && !/runes|teeth/.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink`, ink.length >= 8 && bare.length === 0, { parts: ink.length, bare });
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
  lichram: ['rush', 'call'],
  ashraven: ['dive', 'gust', 'omen'],
};
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
for (const B of BOSSES) {
  for (const id of CONTACT[B.kind]) {
    const tl = B.abilities[id];
    const ph = tl.phases;
    const strikes = [];
    for (let i = 0; i < ph.length - 1; i++) if (Math.abs(ph[i].dur - STRIKE_SEC) < 1e-9) strikes.push(i);
    // a strike into a held contact; the rush's burst leads into the run and
    // the dive's stoop into the dive, each held longer than a contact
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
  }
}
// B3: every hit shoves the body back 0.08 to 0.12 u (the shove channel x 0.1 u)
{
  const peaks = {};
  for (const B of BOSSES) {
    for (const id of CONTACT[B.kind]) {
      const TL = B.abilities[id];
      let m = 0;
      for (let t = 0; t <= TL.duration; t += 1 / 240) m = Math.max(m, B.channels(id, TL.sample(t)).shove);
      peaks[`${B.kind} ${id}`] = r3(m);
    }
  }
  check('every hit plays its recoil (B3): a shove of 0.08 to 0.12 u', Object.values(peaks).every((v) => v >= 0.8 && v <= 1.2), peaks);
}
// B9: the rush pulls back through its wind-up and drives past rest on the burst
{
  const tl = ramM.LICHRAM_ABILITIES.rush;
  const at = (id, k) => ramM.abilityChannels('rush', tl.sample(tl.startOf(id) + tl.phases.find((p) => p.id === id).dur * k));
  check('Lich Ram Bone Rush: pulls back through the wind-up, drives past rest on the burst, the horns level (B9)', at('wind', 0.95).reach < -0.05 && at('run', 0.05).reach > 0.3 && at('wind', 0.95).head > 0.4 && at('hold', 0.5).squash > 0.95, { wind: r3(at('wind', 0.95).reach), burst: r3(at('run', 0.05).reach), head: r3(at('wind', 0.95).head) });
  const paw = [];
  for (let k = 0; k <= 1; k += 0.02) paw.push(at('wind', k).paw);
  check('Lich Ram Bone Rush: a forehoof paws through the warning and is down for the burst', Math.max(...paw) > 0.9 && at('burst', 0.5).paw < 0.05, { peak: r3(Math.max(...paw)) });
}

// --- 5. locked feet ---------------------------------------------------------------------
function drive(r, e, frames, move, out, tick = null) {
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    out.tick++;
    if (move) move(f);
    out.world.updateMatrixWorld(true);
    r.pose({ t: out.t, hpFrac: 1, e, tick: tick === null ? out.tick : tick });
    if (out.each) out.each(f);
    if (!r.lab.feet) continue;
    if (r.lab.legs) for (const S of r.lab.legs.state) out.gap = Math.max(out.gap, S.end.distanceTo(S.foot));
    const feet = r.lab.feet();
    const ch = r.lab.channels();
    if (feet.every((ft) => !ft.planted) && !(ch.alt > 0.02)) out.allAir++;
    feet.forEach((ft, i) => {
      const p = out.prev[i];
      if (p && p.planted && ft.planted && p.steps === ft.steps) out.slide = Math.max(out.slide, Math.hypot(ft.drawnX - p.x, ft.drawnZ - p.z));
      if (p && ft.steps > p.steps) out.order.push({ f, i, group: ft.group });
      out.prev[i] = { planted: ft.planted, x: ft.drawnX, z: ft.drawnZ, steps: ft.steps };
    });
  }
  return out;
}
const runner = (r) => {
  const world = new Group();
  world.add(r.group);
  return { world, t: 0, tick: 0, slide: 0, prev: [], order: [], gap: 0, allAir: 0, each: null };
};
{
  // the Ram: a trot in diagonal pairs with a turn, a rest, a spin in place
  const B = BOSSES[0];
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null, mode: 'stalk', nextGraveTick: 100000, guard: { active: true } };
  drive(r, e, 20, null, st);
  st.slide = 0;
  const steps0 = r.lab.feet().map((f) => f.steps);
  let yaw = 0;
  drive(r, e, 360, (f) => {
    yaw += (f < 180 ? 0.4 : -0.6) * DT;
    r.group.position.x += Math.sin(yaw) * B.walk * DT;
    r.group.position.z += Math.cos(yaw) * B.walk * DT;
    r.setYaw(yaw);
  }, st);
  const steps = r.lab.feet().map((f, i) => f.steps - steps0[i]);
  const order = st.order.map((o) => o.group);
  let alt = 0;
  for (let i = 1; i < order.length; i++) if (order[i] !== order[i - 1]) alt++;
  const groups = r.lab.feet().map((f) => f.group);
  const pairGap = Math.max(...[0, 1].map((g) => {
    const n = steps.filter((_, i) => groups[i] === g);
    return Math.max(...n) - Math.min(...n);
  }));
  check('Lich Ram: walking with a turn, a planted hoof never slides', st.slide < 1e-4, r3(st.slide));
  check('Lich Ram: every hoof steps along the travel', steps.every((n) => n >= 3), steps);
  check('Lich Ram: the steps alternate between its diagonal pairs, each pair together', order.length > 6 && alt / (order.length - 1) > 0.3 && pairGap <= 1, { landings: order.length, switches: alt, pairGap });
  check('Lich Ram: walking, every drawn hoof reaches its gait point and a hoof is always down', st.gap < 1e-3 && st.allAir === 0, { gap: r3(st.gap), allAir: st.allAir });
  drive(r, e, 45, null, st);
  check('Lich Ram: at rest every hoof is planted again', r.lab.feet().every((f) => f.planted), r.lab.feet().map((f) => f.planted));
  st.gap = 0;
  st.allAir = 0;
  let y = yaw;
  drive(r, e, 90, () => {
    y += (yaw + Math.PI * 0.999 - y) * (1 - Math.exp(-7 * DT));
    r.setYaw(y);
  }, st);
  check('Lich Ram: a spin in place steps round with no leg past its reach (every hoof up for at most 3 frames)', st.gap < 1e-3 && st.allAir <= 3, { gap: r3(st.gap), allAir: st.allAir });
}
{
  // the Raven: a hop, both feet leaving and landing together
  const B = BOSSES[1];
  const r = B.build();
  const st = runner(r);
  const e = { id: 2, telegraph: null, mode: 'stalk' };
  drive(r, e, 20, null, st);
  st.slide = 0;
  const steps0 = r.lab.feet().map((f) => f.steps);
  let yaw = 0;
  let hops = 0;
  let both = 0;
  let wasAir = false;
  st.each = () => {
    const feet = r.lab.feet();
    const air = feet.every((f) => !f.planted);
    if (air && !wasAir) hops++;
    if (air) both++;
    wasAir = air;
  };
  drive(r, e, 360, (f) => {
    yaw += (f < 180 ? 0.4 : -0.6) * DT;
    r.group.position.x += Math.sin(yaw) * B.walk * DT;
    r.group.position.z += Math.cos(yaw) * B.walk * DT;
    r.setYaw(yaw);
  }, st);
  st.each = null;
  const steps = r.lab.feet().map((f, i) => f.steps - steps0[i]);
  // the two feet land within a frame of each other
  const lands = st.order;
  let apart = 0;
  for (let i = 1; i < lands.length; i += 2) apart = Math.max(apart, Math.abs(lands[i].f - lands[i - 1].f));
  check('Ash Raven: hopping with a turn, a planted talon never slides', st.slide < 1e-4, r3(st.slide));
  check('Ash Raven: it hops along the travel, both feet leaving and landing together', hops >= 3 && steps.every((n) => n >= 3) && Math.abs(steps[0] - steps[1]) <= 1 && apart <= 1, { hops, steps, apart, airFrames: both });
  check('Ash Raven: hopping, every drawn foot reaches its gait point', st.gap < 1e-3, r3(st.gap));
  drive(r, e, 45, null, st);
  check('Ash Raven: at rest both feet are planted again', r.lab.feet().every((f) => f.planted), r.lab.feet().map((f) => f.planted));
}

// --- 6. the sim drives each ability ------------------------------------------------------
const peak = { max: {} };
const watch = (r) => {
  for (const [k, v] of Object.entries(r.lab.channels())) peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
};
{
  // the Lich Ram: the rush (wind, gallop, slam, stuck, free), the call, the rage
  const r = ramM.buildLichramFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, mode: 'stalk', nextGraveTick: 100000, guard: { active: true }, enraged: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'rush', kind: 'lane', startTick: st.tick, resolveTick: st.tick + 54, dirX: 0, dirZ: 1, length: 6 };
  peak.max = {};
  drive(r, e, 54, () => watch(r), st);
  const wound = peak.max.head;
  const pawed = peak.max.paw;
  const windSlide = st.slide;
  e.telegraph = null;
  e.mode = 'rush';
  e.rushVx = 0;
  e.rushVz = 11 / 60;
  peak.max = {};
  const z0 = r.group.position.z;
  let stepsRun = 0;
  const s0 = r.lab.feet().map((f) => f.steps);
  drive(r, e, 30, () => {
    watch(r);
    r.group.position.z += 11 * DT;
  }, st);
  stepsRun = r.lab.feet().reduce((s, f, i) => s + f.steps - s0[i], 0);
  const stride = peak.max.stride;
  const runSlide = st.slide;
  e.mode = 'stuck';
  e.guard.active = false;
  st.prev = [];
  st.slide = 0;
  peak.max = {};
  drive(r, e, 75, () => watch(r), st);
  const slam = peak.max.squash;
  const sag = r.lab.channels().sag;
  const stuckSlide = st.slide;
  e.mode = 'stalk';
  e.guard.active = true;
  peak.max = {};
  drive(r, e, 50, () => watch(r), st);
  check('Lich Ram: the rush lowers the horns and paws through the lane\'s warning, gallops at 11 u/s, slams into the floor and hangs stuck, then wrenches free', wound > 0.5 && pawed > 0.9 && stride > 0.9 && stepsRun >= 4 && r.group.position.z - z0 > 5 && slam > 0.95 && sag > 0.95 && r.lab.channels().sag < 0.01, { wound: r3(wound), pawed: r3(pawed), stride: r3(stride), stepsRun, slam: r3(slam), sag: r3(sag) });
  check('Lich Ram: the hooves hold through the wind-up and the stuck, and never slide under the gallop', windSlide < 1e-4 && runSlide < 1e-4 && stuckSlide < 1e-4 && r.lab.feet().every((f) => f.planted), { wind: r3(windSlide), run: r3(runSlide), stuck: r3(stuckSlide) });
  // the call: the gather reads ahead from nextGraveTick, the stamp on the call
  e.nextGraveTick = st.tick + 60;
  peak.max = {};
  const lifts = [];
  drive(r, e, 59, () => {
    watch(r);
    lifts.push(r.lab.channels().lift);
  }, st);
  const beforeStamp = r.lab.channels();
  const early = lifts.slice(0, 25).every((v) => v < 0.01);
  // the call fires: nextGraveTick moves on
  e.nextGraveTick = st.tick + 391;
  drive(r, e, 3, null, st); // the stamp lands over its 2.5 frames
  const atStamp = r.lab.channels();
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  check('Lich Ram: the call gathers over the last 30 ticks before nextGraveTick (nothing earlier), the hoof raised, and stamps on the call\'s tick', early && beforeStamp.lift > 0.9 && beforeStamp.stamp > 0.9 && atStamp.squash > 0.9 && atStamp.gape > 0.9 && peak.max.shove > 0.8, { lift: r3(beforeStamp.lift), stamp: r3(beforeStamp.stamp), squash: r3(atStamp.squash), gape: r3(atStamp.gape) });
  // a held-back call (the governor): the gather waits at its top
  e.nextGraveTick = st.tick + 30;
  drive(r, e, 60, null, st);
  const waiting = r.lab.channels();
  e.nextGraveTick = st.tick + 391;
  drive(r, e, 3, null, st);
  const lateStamp = r.lab.channels().squash;
  drive(r, e, 60, null, st);
  check('Lich Ram: a call the sim holds back waits at the top of its gather and stamps when it fires', waiting.lift > 0.9 && waiting.squash < 0.05 && lateStamp > 0.9, { lift: r3(waiting.lift), squash: r3(waiting.squash), late: r3(lateStamp) });
  e.enraged = true;
  drive(r, e, 120, null, st);
  check('Lich Ram: the rage holds, the feet planted', r.lab.channels().rage > 0.9 && r.lab.feet().every((f) => f.planted), r3(r.lab.channels().rage));
}
{
  // the Ash Raven: the dive (rise, stoop, skim, land, preen), the gust, the omen
  const r = ravenM.buildAshRavenFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, mode: 'stalk', enraged: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'dive', kind: 'lane', startTick: st.tick, resolveTick: st.tick + 50, dirX: 0, dirZ: 1, length: 7, fromX: 0, fromZ: 0 };
  e.mode = 'rise';
  peak.max = {};
  drive(r, e, 30, () => watch(r), st);
  const risen = r.lab.channels(); // hanging at the top of the rise
  drive(r, e, 6, () => watch(r), st); // the stoop plays on the clamp, held until the sim dives
  e.mode = 'dive';
  peak.max = {};
  const z0 = r.group.position.z;
  drive(r, e, 14, () => {
    watch(r);
    r.group.position.z += 6 / 14;
  }, st);
  const diving = r.lab.channels();
  const sweep = peak.max.sweep;
  e.telegraph = null;
  e.mode = 'preen';
  st.prev = [];
  st.slide = 0;
  drive(r, e, 3, null, st); // the strike lands over its 2.5 frames
  const landed = r.lab.channels();
  drive(r, e, 37, null, st);
  const preen = r.lab.channels();
  e.mode = 'stalk';
  drive(r, e, 60, null, st);
  check('Ash Raven: the dive rises into the air through the lane\'s warning, stoops and skims as the sim dives, lands on the resolve and preens', risen.alt > 1.3 && risen.open > 0.9 && diving.alt < 0.6 && diving.alt > 0.3 && sweep > 0.9 && landed.squash > 0.9 && landed.alt < 0.05 && preen.preen > 0.9 && r.lab.channels().preen < 0.01 && r.group.position.z - z0 > 5.9, { risen: r3(risen.alt), diving: r3(diving.alt), sweep: r3(sweep), landed: r3(landed.squash), preen: r3(preen.preen) });
  check('Ash Raven: after the landing both feet are planted and hold through the preen', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
  e.telegraph = { attack: 'gust', kind: 'cone', startTick: st.tick, resolveTick: st.tick + 40, dirX: 0, dirZ: 1 };
  e.mode = 'gust';
  peak.max = {};
  drive(r, e, 40, () => watch(r), st);
  const mantled = peak.max.hackle;
  const crouched = peak.max.crouch;
  e.telegraph = null;
  e.mode = 'stalk';
  peak.max = {};
  drive(r, e, 40, () => watch(r), st);
  const beat = peak.max.fore;
  const beatSquash = peak.max.squash;
  e.telegraph = { attack: 'omen', kind: 'ring', startTick: st.tick, resolveTick: st.tick + 84, x: 3, z: 3 };
  e.mode = 'call';
  peak.max = {};
  drive(r, e, 84, () => watch(r), st);
  const called = peak.max.gape;
  const wingsUp = peak.max.flap;
  e.telegraph = null;
  e.mode = 'stalk';
  peak.max = {};
  drive(r, e, 50, () => watch(r), st);
  const cawed = peak.max.squash;
  e.enraged = true;
  drive(r, e, 120, null, st);
  check('Ash Raven: the gust mantles (hackles up, crouched) and throws the wings forward on the hit; the omen calls with the wings high and the beak open and caws on the hit; the rage holds', mantled > 0.9 && crouched > 0.7 && beat > 0.9 && beatSquash > 0.9 && called > 0.5 && wingsUp > 0.9 && cawed > 0.9 && r.lab.channels().rage > 0.9, { mantled: r3(mantled), crouched: r3(crouched), beat: r3(beat), called: r3(called), wingsUp: r3(wingsUp), cawed: r3(cawed) });
  check('Ash Raven: the feet hold through the gust and the omen', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
}
// the strikes land on the sim's hit
{
  const out = {};
  const k = ramM.buildLichramFacet();
  const sk = runner(k);
  const ke = { id: 21, telegraph: { attack: 'rush', startTick: 0, resolveTick: 54, dirX: 0, dirZ: 1, length: 5 }, mode: 'stalk', nextGraveTick: 100000, guard: { active: true } };
  drive(k, ke, 54, null, sk);
  out.burst = r3(k.lab.channels().stride);
  const h = ravenM.buildAshRavenFacet();
  const sh = runner(h);
  const he = { id: 22, telegraph: { attack: 'gust', startTick: 0, resolveTick: 40, dirX: 0, dirZ: 1 }, mode: 'gust' };
  drive(h, he, 40, null, sh);
  out.gust = r3(h.lab.channels().squash);
  he.telegraph = { attack: 'omen', startTick: 100, resolveTick: 184 };
  he.mode = 'call';
  drive(h, he, 84, null, sh);
  out.omen = r3(h.lab.channels().squash);
  check('the strikes land on the sim\'s hit: the rush\'s burst, the gust\'s beat, the omen\'s caw', Object.values(out).every((v) => v > 0.95), out);
}
// a co-op guest: every snapshot hands the rig a fresh copy of the telegraph
{
  const out = {};
  const k = ramM.buildLichramFacet();
  const sk = runner(k);
  const e = { id: 24, telegraph: null, mode: 'stalk', nextGraveTick: 100000, guard: { active: true } };
  drive(k, e, 20, null, sk);
  const T = { attack: 'rush', startTick: 20, resolveTick: 74, kind: 'lane', dirX: 0, dirZ: 1, length: 5 };
  peak.max = {};
  drive(k, e, 50, (f) => {
    if (f % 3 === 0) e.telegraph = { ...T };
    watch(k);
  }, sk);
  out.horns = r3(peak.max.head);
  const h = ravenM.buildAshRavenFacet();
  const sh = runner(h);
  const he = { id: 25, telegraph: null, mode: 'stalk' };
  drive(h, he, 20, null, sh);
  const W = { attack: 'omen', startTick: 20, resolveTick: 104, kind: 'ring' };
  peak.max = {};
  drive(h, he, 80, (f) => {
    if (f % 3 === 0) he.telegraph = { ...W };
    watch(h);
  }, sh);
  out.call = r3(peak.max.flap);
  check('a co-op guest\'s fresh telegraph copies never restart the wind-up (the horns go down, the wings go up)', out.horns > 0.5 && out.call > 0.85, out);
}
// killed in a wind-up: the death collapse never plays the strike
{
  const out = {};
  const k = ramM.buildLichramFacet();
  const sk = runner(k);
  drive(k, { id: 26, telegraph: { attack: 'rush', startTick: 0, resolveTick: 54, dirX: 0, dirZ: 1, length: 5 }, mode: 'stalk', nextGraveTick: 100000, guard: { active: true } }, 20, null, sk);
  peak.max = {};
  drive(k, null, 66, () => watch(k), sk);
  out.ramStride = r3(peak.max.stride);
  const h = ravenM.buildAshRavenFacet();
  const sh = runner(h);
  drive(h, { id: 27, telegraph: { attack: 'gust', startTick: 0, resolveTick: 40, dirX: 0, dirZ: 1 }, mode: 'gust' }, 20, null, sh);
  peak.max = {};
  drive(h, null, 66, () => watch(h), sh);
  out.ravenFore = r3(peak.max.fore);
  check('a boss killed in its wind-up collapses in it (no gallop, no beat)', out.ramStride < 0.02 && out.ravenFore < 0.02, out);
}
// a hitch (a long frame at speed) is not a new boss
{
  const out = {};
  for (const B of BOSSES) {
    const r = B.build();
    const st = runner(r);
    const e = { id: 29, telegraph: null, mode: B.rest, nextGraveTick: 100000, guard: { active: true } };
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
  check('the model lab lists both bosses', BOSSES.every((B) => ids.includes(B.kind)), ids);
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
  check('every Level III lab entry plays every ability, with its classic twin beside', errs.length === 0, errs);
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
