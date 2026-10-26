#!/usr/bin/env node
// MODEL STANDARD, THE LEVEL I FOES probe (v0.5.337) — headless Node, builds
// the rigs; no browser. Every creature Level I rolls is rebuilt on the model
// standard (docs/MODEL_STANDARD.md "Foes", render/enemies/facet/). Visual
// only. This probe checks:
//   1. the foe kit: the spawn-in curve (B7), the settle's one overshoot (B5),
//      the 3-hit chain (a chained hit never pops, a predicted bite's contact
//      lands on its tick, the real bite confirms it, a dropped prediction
//      eases out), the clock on the sim's tick (a hitstop pauses a clip), a
//      telegraph the sim cancels on its resolve tick (a stun) never reads as
//      a strike, a short blink re-stands the feet, a foot is never drawn past
//      its leg's reach;
//   2. the roster: every kind of Level I's roster and campaign roster has a
//      faceted rig, a flag, abilities and a model lab tab, and `?facet=0`
//      hands every one back to its classic rig;
//   3. the crowd budget: each rig draws no more calls than its classic rig;
//      its baked detail rows are shared by every copy (one buffer per kind);
//      every instanced row carries its ink hull;
//   4. each rig in live play (a move loop in eight directions, a spin on the
//      spot, a sidestep, a backpedal, live bites, shots and telegraphs): no
//      broken matrix, the layer's group transform never written, a planted
//      foot never slides, the lean follows the travel;
//   5. each ability on its lab timeline: pure in t (a rewind lands on the
//      same pose), and it moves the rig;
//   6. each foe's live strike: its contact lands on the tick the sim resolves
//      the attack (a telegraph's resolve, a predicted bite), or within the B1
//      budget after an unwarned event; a cancelled wind-up, a stun or blind
//      landing on the resolve tick (on whole ticks and on the layer's shown
//      ticks), and a stunned biter's predicted bite never strike;
//   7. the spawn-in on a fresh rig, the Journal's turntable with no entity,
//      the hit and death tuning and the named points the VFX layer reads;
//   8. colour: no Ember, Bright Heal or Violet anywhere in a rig.
//
//   node tools/model-standard-foes-probe.mjs [kind,kind]
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Vector3 } = await import('three');
const { createTimeline, ease } = await import('../src/render/facet/timeline.js');
const { FRAME, SPAWN_SEC, spawnScale, settle, hitTimelines, createChain, createFoeClock, createAttackWatch } = await import('../src/render/facet/foe.js');
const { createLegs, clampReach } = await import('../src/render/facet/foelegs.js');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FACET_FOES, FOE_ABILITIES, facetFoeBuilders } = await import('../src/render/enemies/facet/index.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-foes.js');
const { buildBoar } = await import('../src/render/enemies/boar.js');
const { buildMantis } = await import('../src/render/enemies/mantis.js');
const { ARCH_BUILDERS } = await import('../src/render/enemies/archetypes.js');
const { LEVELS } = await import('../src/data/levels.js');
const { PALETTE } = await import('../src/data/palette.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;
const CLASSIC = { boar: buildBoar, mantis: buildMantis, ...ARCH_BUILDERS };

// --- 1. the foe kit ---------------------------------------------------------
{
  const s = [];
  for (let f = 0; f <= 9; f++) s.push(spawnScale(f * FRAME));
  const peak = Math.max(...s);
  check('B7 the spawn-in grows from the floor to rest in about 7 frames with about 10% overshoot', s[0] < 0.01 && peak > 1.08 && peak < 1.12 && spawnScale(SPAWN_SEC) === 1 && Math.abs(SPAWN_SEC - 7 * FRAME) < 1e-9, s.map(r3));
  let crossings = 0;
  let prev = settle(0);
  let lo = 1;
  for (let i = 1; i < 100; i++) {
    const v = settle(i / 100);
    if (Math.sign(v) !== Math.sign(prev) && prev !== 0) crossings++;
    lo = Math.min(lo, v);
    prev = v;
  }
  check('B5 the settle passes its rest once, by a small overshoot, and lands on it', crossings === 1 && lo < -0.05 && lo > -0.25 && settle(1) === 0, { crossings, overshoot: r3(lo) });

  const REST = { a: 0 };
  const K = (a) => ({ a });
  const hits = [
    { label: 'one', from: K(-1), pull: K(-3), strike: K(2), over: K(2.4), next: K(-2) },
    { label: 'two', from: K(-2), pull: K(-4), strike: K(3), over: K(3.4), next: K(-3) },
    { label: 'three', from: K(-3), pull: K(-1.5), strike: K(5), over: K(5.6), next: K(-1) },
  ];
  const WINDOW = 1.2;
  const tls = hitTimelines(hits, WINDOW, createTimeline);
  const chain = createChain({ hits, tls, rest: REST, window: WINDOW, ease });
  const out = { a: 0 };
  let now = 0;
  let startJump = 0;
  let last = null;
  const BITE = 0.8;
  const bites = [0.5, 0.5 + BITE, 0.5 + 2 * BITE];
  const contacts = [];
  let seen = null;
  let confirmed = 0;
  for (let f = 0; f < 200; f++) {
    now = f * DT;
    for (const b of bites) if (Math.abs(now - b) < DT / 2 && !chain.hit(now)) confirmed++;
    const next = bites.find((b) => b > now + 1e-9);
    const due = chain.current >= 0 && next !== undefined ? next - now : null;
    const playing = chain.pose(now, out, due);
    if (chain.contactAt !== null && chain.contactAt !== seen) {
      // a chained hit starts from wherever the last one is: no pop
      if (seen !== null && last !== null) startJump = Math.max(startJump, Math.abs(out.a - last));
      seen = chain.contactAt;
      contacts.push(seen);
    }
    last = playing ? out.a : null;
  }
  check('the chain runs hit 1, 2, 3 on three bites', contacts.length === 3, contacts.map(r3));
  check('a fresh hit lands 3.5 frames after its bite (one frame of wind-back inside the strike, B1)', Math.abs(contacts[0] - (bites[0] + 3.5 * FRAME)) < 1e-6, r3(contacts[0]));
  check('a predicted bite: the chained strike starts early so its contact lands on the bite', Math.abs(contacts[1] - bites[1]) < 1e-6 && Math.abs(contacts[2] - bites[2]) < 1e-6, contacts.map(r3));
  check('the real bite confirms the early strike instead of starting another', confirmed === 2, confirmed);
  check('a chained hit starts from wherever the last one is (no pop on the frame it begins)', startJump < 0.5, r3(startJump));
}
{
  // a dropped prediction (the target stepped away) eases the pull-back out
  const REST = { a: 0 };
  const K = (a) => ({ a });
  const hits = [
    { label: 'one', from: K(-1), pull: K(-3), strike: K(2), over: K(2.4), next: K(-2) },
    { label: 'two', from: K(-2), pull: K(-4), strike: K(3), over: K(3.4), next: K(-3) },
    { label: 'three', from: K(-3), pull: K(-1.5), strike: K(5), over: K(5.6), next: K(-1) },
  ];
  const tls = hitTimelines(hits, 1.2, createTimeline);
  const chain = createChain({ hits, tls, rest: REST, window: 1.2, ease });
  const out = { a: 0 };
  let last = null;
  let worst = 0;
  chain.hit(0);
  for (let f = 0; f < 60; f++) {
    const now = f * DT;
    // the next bite looks due at 0.6 s until frame 30, then the target leaves
    const due = f < 30 ? 0.6 - now : null;
    chain.pose(now, out, due > 0 ? due : null);
    // from the end of the settle on: the held wind-up begins (pulling), the
    // drop lands at frame 30
    if (last !== null && now > 12.5 * FRAME) worst = Math.max(worst, Math.abs(out.a - last));
    last = out.a;
  }
  check('the pull-back never jumps in, and a dropped prediction eases it out (no pop)', worst < 0.3, r3(worst));
  chain.recover(1.0);
  check('a chain the foe gives up goes from its held wind-up to recover', tls[chain.current].sample(1.0 - (chain.contactAt - 3.5 * FRAME)).id === 'recover');

  // the clock runs on the sim's tick: a hitstop (the tick frozen, the frames
  // going on, the interpolated tick saw-toothing inside it) pauses a clip
  const clock = createFoeClock();
  let ran = 0;
  for (let f = 0; f <= 20; f++) clock.step({ t: f / 60, tick: f });
  const before = clock.now;
  for (let f = 1; f <= 6; f++) ran += clock.step({ t: (20 + f) / 60, tick: 20 + (f % 2) * 0.5 });
  check('the foe clock holds through a hitstop (the tick frozen while frames go on)', ran < 0.01 && clock.now - before < 0.01, r3(ran));
  const tt = createFoeClock();
  tt.step({ t: 0, turntable: true });
  check("the foe clock runs on t where there is no tick (the Journal's turntable)", Math.abs(tt.step({ t: 0.05, turntable: true }) - 0.05) < 1e-9);
  const rw = createFoeClock();
  rw.step({ t: 2, tick: 120 });
  check('a rewind restarts the foe clock without a step', rw.step({ t: 0, tick: 0 }) === 0 && rw.step({ t: 1 / 60, tick: 1 }) > 0);

  // a telegraph the sim cancels on its resolve tick (a stun landing on it,
  // a room clear) is a cancel, never a strike
  const watch = createAttackWatch();
  const e = { telegraph: { startTick: 10, resolveTick: 52 }, state: 'active', hp: 5 };
  watch.update({ e, tick: 10 });
  e.telegraph = null;
  e.status = { stun: { untilTick: 112 } };
  const stunBeat = watch.update({ e, tick: 51.4 });
  const w2 = createAttackWatch();
  const e2 = { telegraph: { startTick: 10, resolveTick: 52 }, state: 'active', hp: 5 };
  w2.update({ e: e2, tick: 10 });
  e2.telegraph = null;
  const relBeat = w2.update({ e: e2, tick: 51.4 });
  check('a telegraph stunned on its resolve tick is a cancel, an untouched one a release', stunBeat && stunBeat.type === 'cancel' && relBeat && relBeat.type === 'release', [stunBeat && stunBeat.type, relBeat && relBeat.type]);

  // a short blink (a Blinking elite lands 1 to 1.4 u off) re-stands the feet
  const legs = createLegs({ homes: [new Vector3(0.1, 0, 0.1), new Vector3(-0.1, 0, 0.1), new Vector3(0.1, 0, -0.1), new Vector3(-0.1, 0, -0.1)], groups: [[0, 3], [1, 2]], reach: 0.2 });
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  for (let f = 0; f < 10; f++) legs.update(DT, fr);
  fr.x = 1.1;
  legs.update(DT, fr);
  const far = Math.max(...legs.out.map((o) => Math.hypot(o.x, o.z)));
  check('a short blink re-stands the feet under the body', far < 0.2, r3(far));

  // a foot past the leg's reach is pulled in along the floor, never stretched
  const hip = new Vector3(0, 0.3, 0);
  const foot = new Vector3(0.6, 0, 0);
  const moved = clampReach(hip, foot, 0.2, 0.2);
  check("a foot past its leg's reach is drawn at the reach, on the floor", moved > 0 && Math.abs(foot.distanceTo(hip) - 0.4 * 0.995) < 1e-6 && foot.y === 0, { moved: r3(moved), len: r3(foot.distanceTo(hip)) });
}

// --- 2. the roster ----------------------------------------------------------
const level1 = LEVELS[1];
const ROSTER = [...Object.keys(level1.roster), ...Object.keys(level1.campaignRoster || {})];
{
  check('the Level I roster and campaign roster are the eight foes', ROSTER.length === 8, ROSTER);
  for (const kind of ROSTER) {
    check(`${kind}: flagged on the model standard`, MODEL_STANDARD[kind] === true && facetOn(kind, new URLSearchParams('')));
    check(`${kind}: a faceted rig and its abilities`, typeof FACET_FOES[kind] === 'function' && FOE_ABILITIES[kind] && Object.keys(FOE_ABILITIES[kind]).length > 0);
    check(`${kind}: a model lab tab with every ability`, !!LAB_ENTRIES.find((e) => e.id === kind && e.abilities.length === Object.keys(FOE_ABILITIES[kind] || {}).length));
    check(`${kind}: a classic rig kept beside it`, typeof CLASSIC[kind] === 'function');
  }
  const off = facetFoeBuilders(new URLSearchParams('facet=0'));
  check('?facet=0 hands every foe back to its classic rig', Object.keys(off).length === 0);
  const only = facetFoeBuilders(new URLSearchParams('facet=boar'));
  check('?facet=boar facets the boar alone', Object.keys(only).join() === 'boar');
}

// --- helpers ----------------------------------------------------------------
function drawCalls(g) {
  let n = 0;
  let tris = 0;
  g.traverse((o) => {
    if ((o.isMesh || o.isSprite || o.isLine || o.isPoints) && o.visible !== false) {
      n++;
      const geo = o.geometry;
      if (geo && geo.attributes && geo.attributes.position) tris += ((geo.index ? geo.index.count : geo.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
    }
  });
  return { calls: n, tris: Math.round(tris) };
}
function finite(g) {
  let bad = 0;
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    if (o.matrixWorld.elements.some((v) => !Number.isFinite(v))) bad++;
    if (o.isInstancedMesh) {
      const a = o.instanceMatrix.array;
      for (let i = 0; i < o.count * 16; i++) if (!Number.isFinite(a[i])) return void bad++;
    }
  });
  return bad;
}
function snapshot(g) {
  g.updateMatrixWorld(true);
  const out = [];
  g.traverse((o) => {
    out.push(...o.matrixWorld.elements);
    if (o.isInstancedMesh) out.push(...o.instanceMatrix.array.slice(0, o.count * 16));
  });
  return out;
}
const RESERVED = { Ember: new Color(PALETTE.emberDanger), 'Bright Heal': new Color(PALETTE.brightHeal), Violet: new Color(PALETTE.godstuffViolet) };
const near = (c, r) => Math.abs(c.r - r.r) + Math.abs(c.g - r.g) + Math.abs(c.b - r.b) < 0.09;
function reservedColours(g) {
  const hits = new Set();
  const c = new Color();
  g.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const key of ['color', 'emissive']) {
        if (!m[key] || !m[key].isColor) continue;
        if (key === 'emissive' && (m.emissiveIntensity ?? 1) === 0) continue;
        for (const [name, r] of Object.entries(RESERVED)) if (near(m[key], r)) hits.add(`${o.name}:${key}:${name}`);
      }
    }
    const col = o.geometry && o.geometry.attributes && o.geometry.attributes.color;
    if (col && mats[0] && mats[0].vertexColors) {
      const base = mats[0].color || new Color(1, 1, 1);
      for (let i = 0; i < col.count; i += 3) {
        c.setRGB(col.getX(i) * base.r, col.getY(i) * base.g, col.getZ(i) * base.b);
        for (const [name, r] of Object.entries(RESERVED)) if (near(c, r)) hits.add(`${o.name}:vertex:${name}`);
      }
    }
  });
  return [...hits];
}

// The live attacks each foe's sim makes (sim/enemies.js and
// sim/enemies/<kind>.js), stepped tick by tick on the entity exactly as the
// sim leaves it, with the layer's lunge pulse on a bite (enemy_bite) and its
// fire pulse on a shot (enemy_fire). Each scenario records the tick its
// attacks resolve; the rig's lab.lastStrike reports the tick its contact
// lands on.
//   bites(every)       an unwarned contact bite on a per-target cooldown
//   telegraphs({...})  a telegraph from start to resolve, the sim's mode and
//                      fields on the resolve tick (`hit`) and after (`end`)
//   roots(span)        the thornling's root (no telegraph: mode and rootUntil)
function bites(every) {
  return {
    type: 'bite',
    every,
    step(k, e, events) {
      if (k < 30 || (k - 30) % every !== 0 || k >= 30 + 3 * every) return null;
      events.push(k);
      e.cdByTarget[1] = k + every;
      e.biteTick = k;
      return 'bite';
    },
  };
}
function telegraphs({ span, tel, every = 192, wind = null, hit = null, end = null, endAfter = 20, fire = false }) {
  return {
    type: 'telegraph',
    span,
    tel,
    wind,
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return null;
      const start = 30 + i * every;
      if (k === start) {
        e.telegraph = { ...tel, startTick: k, resolveTick: k + span, x: 0, z: 3, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1 };
        if (wind) wind(e, k);
        events.push(k + span);
      }
      if (k === start + span) {
        e.telegraph = null;
        if (hit) hit(e, k);
        return fire ? 'fire' : null;
      }
      if (k === start + span + endAfter && end) end(e, k);
      return null;
    },
  };
}
function roots(span, every = 192) {
  return {
    type: 'root',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return null;
      const start = 30 + i * every;
      if (k === start) {
        e.mode = 'root';
        e.rootUntil = k + span;
        events.push(k + span);
      }
      if (k === start + span) {
        e.mode = 'skulk';
        e.plantTick = k;
      }
      return null;
    },
  };
}
const LIVE = {
  boar: bites(48),
  rotcap: bites(60),
  // the spit: a 42-tick telegraph (no kind: the sim's own), the shot on its resolve
  mantis: telegraphs({ span: 42, tel: {}, fire: true }),
  // the charge: a 48-tick lane, then the roll
  quillback: telegraphs({ span: 48, tel: { kind: 'lane', length: 5, width: 0.9 }, hit: (e) => ((e.mode = 'charge'), (e.chargeHits = [])), end: (e) => (e.mode = 'approach'), endAfter: 40 }),
  // the dart: a 42-tick lane, then the dive down it
  wasp: telegraphs({ span: 42, tel: { kind: 'lane', length: 3, width: 0.6 }, hit: (e) => ((e.mode = 'dart'), (e.dartTicksLeft = 12)), end: (e) => ((e.mode = 'buzz'), (e.dartTicksLeft = 0)), endAfter: 12 }),
  // the shriek: a 54-tick cone from the hang
  owl: telegraphs({ span: 54, tel: { kind: 'cone', radius: 3, length: 3, halfAngleDeg: 35 }, wind: (e) => (e.mode = 'hang'), hit: (e, k) => (e.shriekTick = k), end: (e) => (e.mode = 'glide'), endAfter: 30 }),
  // the lash: a 48-tick lane, the yank on the resolve
  lasher: telegraphs({ span: 48, tel: { kind: 'lane', length: 5.4, width: 0.7 }, wind: (e) => (e.mode = 'coil'), hit: (e, k) => ((e.lashTick = k), (e.yank = { ids: [1], ticksLeft: 12 })), end: (e) => ((e.mode = 'creep'), (e.yank = null)), endAfter: 12 }),
  // the plant: a 30-tick root
  thornling: roots(30),
};

// --- 3 to 8: each foe -------------------------------------------------------
// `node tools/model-standard-foes-probe.mjs owl,boar` checks only those foes
const ONLY = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
for (const kind of ROSTER) {
  if (ONLY && !ONLY.has(kind)) continue;
  const build = FACET_FOES[kind];
  if (!build) continue;
  const abilities = FOE_ABILITIES[kind];
  const rig = build();
  const classic = CLASSIC[kind]();

  // 3. the crowd budget
  const a = drawCalls(rig.group);
  const b = drawCalls(classic.group);
  check(`${kind}: draws no more calls than its classic rig`, a.calls <= b.calls, { faceted: a, classic: b });
  const twin = build();
  const shared = [];
  rig.group.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && !o.userData.inkHull && o.geometry) shared.push(o.geometry);
  });
  const shared2 = [];
  twin.group.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && !o.userData.inkHull && o.geometry) shared2.push(o.geometry);
  });
  check(`${kind}: its fixed geometry is one buffer per kind (two copies share every one)`, shared.length > 0 && shared.every((g, i) => g === shared2[i]));
  // (unlit glow rows: a tell's tips, spores, gauzy wings, carry no ink)
  const inkless = [];
  rig.group.traverse((o) => {
    if (o.isInstancedMesh && !o.userData.inkHull && !o.material.isMeshBasicMaterial && !o.children.some((c) => c.userData.inkHull)) inkless.push(o.name);
  });
  check(`${kind}: every lit instanced row carries its ink hull`, inkless.length === 0, inkless);
  let flatOk = true;
  rig.group.traverse((o) => {
    if (!flatOk || !o.isMesh || o.userData.inkHull || !o.geometry.attributes.normal || o.geometry.index) return;
    const n = o.geometry.attributes.normal;
    for (let i = 0; i + 2 < Math.min(n.count, 300); i += 3) {
      if (Math.abs(n.getX(i) - n.getX(i + 2)) + Math.abs(n.getY(i) - n.getY(i + 2)) + Math.abs(n.getZ(i) - n.getZ(i + 2)) > 1e-4) flatOk = false;
    }
  });
  check(`${kind}: faceted (flat normals on every plane)`, flatOk);

  // 4. live play
  const e = { id: 3, kind, x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'chase', telegraph: null, elite: false, faceX: 0, faceZ: 1, cdByTarget: {}, targetId: 1 };
  const base = new Vector3(2, 0, -3);
  rig.group.scale.setScalar(1.2);
  rig.group.rotation.set(0.08, 0, -0.05);
  const s0 = rig.group.scale.clone();
  const q0 = rig.group.rotation.clone();
  const plan = [];
  for (let d = 0; d < 8; d++) plan.push({ dur: 1.3, a: (d / 8) * Math.PI * 2, v: 1.8, face: 'travel' });
  plan.push({ dur: 1.2, a: 0, v: 0, face: 'spin' });
  plan.push({ dur: 1.3, a: Math.PI / 2, v: 1.4, face: 'hold' });
  plan.push({ dur: 1.3, a: Math.PI, v: 1.2, face: 'hold' });
  plan.push({ dur: 3, a: 0, v: 0, face: 'hold', attack: true });
  let t = 0;
  let tick = 0;
  let x = 0;
  let z = 0;
  let yaw = 0;
  let walk = 0;
  let lunge = 0;
  let fire = 0;
  let tel = 0;
  let wrote = false;
  let bad = 0;
  let slide = 0;
  let lastFeet = null;
  let nextAtk = 0.4;
  const leanFwd = [];
  const leanBack = [];
  for (const p of plan) {
    for (let pt = 0; pt < p.dur; pt += DT) {
      t += DT;
      tick += 1;
      const vx = Math.sin(p.a) * p.v;
      const vz = Math.cos(p.a) * p.v;
      x += vx * DT;
      z += vz * DT;
      walk += p.v * DT * Math.PI * 2.6;
      if (p.face === 'travel' && p.v > 0) yaw = Math.atan2(vx, vz);
      else if (p.face === 'spin') yaw += DT * 3.2;
      else yaw = 0;
      e.px = e.x;
      e.pz = e.z;
      e.x = base.x + x;
      e.z = base.z + z;
      if (p.attack && (nextAtk -= DT) <= 0) {
        const which = Math.floor(t * 5) % 3;
        if (which === 0) lunge = 0.18;
        else if (which === 1) fire = 0.2;
        else {
          e.telegraph = { kind: 'lane', attack: 'strike', startTick: tick, resolveTick: tick + 30, dirX: 0, dirZ: 1, length: 1.5, width: 0.6, radius: 1 };
          tel = 30;
        }
        nextAtk = 0.9;
      }
      if (tel > 0 && --tel === 0) e.telegraph = null;
      rig.group.position.set(e.x, 0, e.z);
      const pos = rig.group.position.clone();
      rig.setYaw(yaw);
      rig.pose({ t, tick, walkPhase: walk, moveK: p.v > 0 ? 1 : 0, lungeK: lunge > 0 ? Math.sin((lunge / 0.18) * Math.PI) : 0, telegraphK: e.telegraph ? 1 : 0, fireK: fire > 0 ? Math.sin((fire / 0.2) * Math.PI) : 0, e });
      lunge = Math.max(0, lunge - DT);
      fire = Math.max(0, fire - DT);
      if (!rig.group.position.equals(pos) || !rig.group.scale.equals(s0) || !rig.group.rotation.equals(q0)) wrote = true;
      if (tick % 6 === 0) bad += finite(rig.group);
      if (rig.lab.feet) {
        const f = rig.lab.feet();
        if (lastFeet) for (let i = 0; i < f.length; i++) if (f[i].planted && lastFeet[i].planted) slide = Math.max(slide, Math.hypot(f[i].x - lastFeet[i].x, f[i].z - lastFeet[i].z));
        lastFeet = f.map((q) => ({ planted: q.planted, x: q.x, z: q.z }));
      }
      // the lean: the body's pitch in the yaw frame while it walks forward,
      // then while it backs off (the backpedal leg, facing +z)
      if (pt > 0.5 && rig.lab.parts && rig.lab.parts.body) {
        if (p.face === 'travel' && p.v > 0) leanFwd.push(rig.lab.parts.body.rotation.x);
        if (p.face === 'hold' && p.a === Math.PI) leanBack.push(rig.lab.parts.body.rotation.x);
      }
    }
  }
  check(`${kind}: no broken matrix through a move loop and live attacks`, bad === 0, bad);
  check(`${kind}: never writes the layer's group transform`, !wrote);
  if (rig.lab.feet) check(`${kind}: a planted foot never slides (rule 2)`, slide < 1e-6, r3(slide));
  if (leanFwd.length && leanBack.length) {
    const avg = (v) => v.reduce((s, q) => s + q, 0) / v.length;
    check(`${kind}: the lean follows the travel (forward leans in, a backpedal leans back: rule 1)`, avg(leanFwd) > avg(leanBack), { forward: r3(avg(leanFwd)), back: r3(avg(leanBack)) });
  }

  // 5. abilities, pure in t
  for (const [id, ab] of Object.entries(abilities)) {
    const at = (tt) => {
      rig.lab.override = { id, t: tt };
      rig.pose({ grown: true, t: 99, tick: 99 * 60, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: { ...e, telegraph: null } });
      return snapshot(rig.group);
    };
    at(0); // one frame to arrive at the lab's clock: every sample below takes no time
    const ts = [];
    for (let i = 0; i <= 10; i++) ts.push((ab.duration * i) / 10);
    const fwd = ts.map(at);
    const back = ts.slice().reverse().map(at).reverse();
    let worst = 0;
    let moved = 0;
    for (let i = 0; i < fwd.length; i++) for (let j = 0; j < fwd[i].length; j++) worst = Math.max(worst, Math.abs(fwd[i][j] - back[i][j]));
    for (let i = 1; i < fwd.length; i++) for (let j = 0; j < fwd[i].length; j++) moved = Math.max(moved, Math.abs(fwd[i][j] - fwd[0][j]));
    check(`${kind}: '${ab.label}' is pure in t (a rewind lands on the same pose)`, worst < 1e-6, r3(worst));
    check(`${kind}: '${ab.label}' moves the rig`, moved > 0.01, r3(moved));
  }
  rig.lab.override = null;

  // 6. the live strike lands on the sim's tick
  const live = LIVE[kind];
  if (live) {
    const r = build();
    const ee = { ...e, x: 0, z: 0, px: 0, pz: 0, telegraph: null, cdByTarget: {}, targetId: 1, mode: 'idle' };
    const events = [];
    const contacts = [];
    let seen = null;
    let pulse = 0;
    let pulseFire = 0;
    for (let k = 1; k <= 30 + 3 * 192 + 60; k++) {
      const beat = live.step(k, ee, events);
      if (beat === 'bite') pulse = 0.18;
      if (beat === 'fire') pulseFire = 0.2;
      r.setYaw(0);
      r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: pulse > 0 ? Math.sin((pulse / 0.18) * Math.PI) : 0, telegraphK: ee.telegraph ? 1 : 0, fireK: pulseFire > 0 ? Math.sin((pulseFire / 0.2) * Math.PI) : 0, e: ee });
      pulse = Math.max(0, pulse - DT);
      pulseFire = Math.max(0, pulseFire - DT);
      const ls = r.lab.lastStrike;
      if (ls && ls.tick !== seen) {
        seen = ls.tick;
        contacts.push(Math.round(ls.tick * 10) / 10);
      }
    }
    if (live.type === 'bite') {
      const first = contacts[0] - events[0];
      check(`${kind}: the first unwarned bite's contact lands within the B1 budget after it (8 ticks)`, first >= 0 && first <= 8, { bite: events[0], contact: contacts[0] });
      check(`${kind}: each predicted bite's contact lands on the sim's bite tick`, contacts.length >= 3 && Math.abs(contacts[1] - events[1]) <= 1 && Math.abs(contacts[2] - events[2]) <= 1, { bites: events, contact: contacts });
    } else {
      const ok = contacts.length >= events.length && events.every((ev, i) => Math.abs(contacts[i] - ev) <= 1);
      check(`${kind}: each ${live.type === 'root' ? 'plant' : 'telegraphed strike'}'s contact lands on the sim's resolve tick`, ok, { resolve: events, contact: contacts });
    }
    // a cancelled wind-up (a stun) never strikes
    if (live.type !== 'bite') {
      const rc = build();
      const ec = { ...e, telegraph: null, mode: 'idle', cdByTarget: {} };
      for (let k = 1; k <= 140; k++) {
        if (k === 30) {
          if (live.type === 'root') {
            ec.mode = 'root';
            ec.rootUntil = 60;
          } else ec.telegraph = { kind: 'lane', startTick: 30, resolveTick: 70, x: 0, z: 3, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1, length: 3, width: 0.6 };
        }
        if (k === 45) {
          // the stun: the telegraph is cancelled (the root is lost to a death)
          ec.telegraph = null;
          if (live.type === 'root') {
            ec.mode = 'skulk';
            ec.hp = 0;
            ec.state = 'dying';
          }
        }
        rc.setYaw(0);
        rc.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: ec.telegraph ? 1 : 0, fireK: 0, e: ec });
      }
      check(`${kind}: a cancelled wind-up never strikes`, rc.lab.lastStrike === null || rc.lab.lastStrike === undefined, rc.lab.lastStrike);
    }
    // a stun or blind landing on the resolve tick (or the tick before): the
    // sim cancels the telegraph and nothing resolves (sim/enemies.js
    // cancelTelegraph), so no strike plays, on the probe's whole ticks and on
    // the layer's shown ticks (stateTick - 1 + alpha)
    if (live.type === 'telegraph') {
      const bad = [];
      for (const status of ['stun', 'blind']) {
        for (const lead of [0, 1]) {
          for (const sub of [0, 0.5]) {
            const rs = build();
            const es = { ...e, telegraph: null, mode: 'idle', cdByTarget: {}, status: null };
            const R = 30 + live.span;
            for (let k = 1; k <= R + 60; k++) {
              if (k === 30) {
                es.telegraph = { ...live.tel, startTick: 30, resolveTick: R, x: 0, z: 3, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1 };
                if (live.wind) live.wind(es, 30);
              }
              if (k === R - lead) {
                es.telegraph = null;
                es.status = { [status]: { untilTick: R + 40 } };
              }
              rs.setYaw(0);
              // the layer's frames on the state at k: stateTick - 1 + alpha
              const frames = sub ? [k - 1, k - 1 + sub] : [k];
              for (const tk of frames) rs.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: es.telegraph ? 1 : 0, fireK: 0, e: es });
            }
            if (rs.lab.lastStrike) bad.push({ status, lead, sub, strike: rs.lab.lastStrike.tick });
          }
        }
      }
      check(`${kind}: a stun or blind on the resolve tick never strikes`, bad.length === 0, bad);
    }
    // a bite foe stunned or blinded against its target: the sim starts no
    // bite while it holds, so the predicted next bite never plays
    if (live.type === 'bite') {
      const bad = [];
      for (const status of ['stun', 'blind']) {
        const rs = build();
        const es = { ...e, telegraph: null, mode: 'chase', cdByTarget: {}, targetId: 1, status: null };
        const strikes = [];
        let seenS = null;
        let pulse = 0;
        for (let k = 1; k <= 30 + 3 * live.every; k++) {
          if (k === 30) {
            es.cdByTarget[1] = k + live.every;
            es.biteTick = k;
            pulse = 0.18;
          }
          if (k === 30 + Math.round(live.every / 2)) es.status = { [status]: { untilTick: 9999 } };
          rs.setYaw(0);
          rs.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: pulse > 0 ? Math.sin((pulse / 0.18) * Math.PI) : 0, telegraphK: 0, fireK: 0, e: es });
          pulse = Math.max(0, pulse - DT);
          const ls = rs.lab.lastStrike;
          if (ls && ls.tick !== seenS) {
            seenS = ls.tick;
            strikes.push(Math.round(ls.tick));
          }
        }
        if (strikes.length !== 1) bad.push({ status, strikes });
      }
      check(`${kind}: a stunned or blinded biter never plays its predicted bite`, bad.length === 0, bad);
    }
  } else check(`${kind}: a live-strike scenario in this probe`, false);

  // 7. spawn-in, the turntable, the VFX contract
  const fresh = build();
  const grow = [];
  for (let i = 0; i < 16; i++) {
    fresh.pose({ t: i * DT, tick: i, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: { ...e, telegraph: null } });
    let sc = null;
    fresh.group.traverse((o) => {
      if (sc === null && /spawn/.test(o.name)) sc = o.scale.x;
    });
    grow.push(sc);
  }
  check(`${kind}: B7 a fresh rig grows from the floor with an overshoot`, grow[0] !== null && grow[0] < 0.05 && Math.max(...grow) > 1.05 && Math.abs(grow[15] - 1) < 1e-6, grow.map((v) => r3(v ?? -1)));
  const tt = build();
  tt.pose({ turntable: true, t: 0, tick: 0, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: null });
  tt.pose({ turntable: true, t: 0.5, tick: 30, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: null });
  check(`${kind}: the Journal's turntable poses it with no entity`, finite(tt.group) === 0);
  check(`${kind}: names its points for the VFX layer (B8)`, rig.points && Object.values(rig.points).length > 0 && Object.values(rig.points).every((p) => p && p.isObject3D), Object.keys(rig.points || {}));
  check(`${kind}: tunes the shared hit and death envelopes (items 9, 10)`, !!rig.react && !!rig.death && rig.modelStandard === true);
  // the envelope wraps rig.body: every moving part under it, the floor's
  // things (the contact shadow) beside it on the group
  let outside = 0;
  for (const c of rig.group.children) {
    if (c === rig.body) continue;
    c.traverse((o) => {
      if ((o.isMesh || o.isSprite) && !/shadow|floor/i.test(o.name || '')) outside++;
    });
  }
  check(`${kind}: the hit envelope's node holds the whole moving body (rig.body, the group's first child)`, rig.body && rig.body.parent === rig.group && rig.group.children[0] === rig.body && outside === 0, { outside });

  // 8. colour
  const bad8 = reservedColours(rig.group);
  check(`${kind}: no Ember, Bright Heal or Violet in the rig (item 11)`, bad8.length === 0, bad8);
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
