#!/usr/bin/env node
// MODEL STANDARD, THE LEVEL II FOES probe (v0.5.344) — headless Node, builds
// the rigs; no browser. Every creature Level II rolls that Level I has not
// already rebuilt (the roster's toad, moth, snail, crab and lamprey, the
// campaign roster's leech and miller) is rebuilt on the model standard
// (docs/MODEL_STANDARD.md "The Level II foes", render/enemies/facet/). Visual
// only. This probe checks:
//   1. the telegraphed strike clip (render/facet/foestrike.js): the strike
//      lands on the resolve tick on the layer's shown ticks, a cancel (even
//      inside the strike frames) takes it back, a strike with no wind-up seen
//      snaps in within a frame, the contact holds while the sim's strike mode
//      lasts and 3 frames at least, the settle passes rest once;
//   2. the roster: every kind of Level II's roster and campaign roster has a
//      faceted rig (here or in Level I's), a flag, abilities and a model lab
//      tab, and `?facet=0` hands every one back to its classic rig;
//   3. the crowd budget: each rig draws no more calls than its classic rig;
//      its fixed geometry is shared by every copy; every lit instanced row
//      carries its ink hull; every plane is flat;
//   4. each rig in live play (a move loop in eight directions, a spin on the
//      spot, a sidestep, a backpedal, live attacks): no broken matrix, the
//      layer's group transform never written, a planted foot never slides,
//      the lean follows the travel;
//   5. each ability on its lab timeline: pure in t, and it moves the rig;
//   6. each foe's live attack: its contact lands on the tick the sim resolves
//      it (a telegraph's resolve, the snail's mend tick), or within the B1
//      budget after an unwarned throw; a cancelled wind-up and a stun or blind
//      landing on the resolve tick never strike;
//   7. the spawn-in on a fresh rig, the Journal's turntable with no entity,
//      the hit and death tuning and the named points the VFX layer reads, the
//      whole moving body under the envelope's node;
//   8. colour: no Ember, Bright Heal or Violet anywhere in a rig;
//   9. each foe's own beats (its tell, its strike mode held, its lurk).
//
//   node tools/model-standard-level2-foes-probe.mjs [kind,kind]
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Matrix4, Vector3 } = await import('three');
const { FRAME, createAttackWatch, settle } = await import('../src/render/facet/foe.js');
const { createStrikeClip, STRIKE_TICKS } = await import('../src/render/facet/foestrike.js');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FACET_FOES, FOE_ABILITIES, facetFoeBuilders } = await import('../src/render/enemies/facet/index.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-foes.js');
const { buildBoar } = await import('../src/render/enemies/boar.js');
const { buildMantis } = await import('../src/render/enemies/mantis.js');
const { ARCH_BUILDERS, CROWN_Y } = await import('../src/render/enemies/archetypes.js');
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

// --- 1. the strike clip -----------------------------------------------------
{
  const REST = { a: 0 };
  const V = { label: 'v', coil: { a: -1 }, strike: { a: 2 }, over: { a: 2.5 } };
  // a 42-tick telegraph from tick 30, released at 72; the layer's shown ticks
  // (stateTick - 1 + alpha) at 60 fps with two frames per tick
  function run({ cancelAt = null, cancelStatus = null, hold = 0 } = {}) {
    const clip = createStrikeClip({ rest: REST, fields: ['a'] });
    const watch = createAttackWatch();
    const e = { telegraph: null, state: 'active', hp: 5, mode: 'idle', status: null };
    const out = { a: 0 };
    const trace = [];
    let contactTick = null;
    for (let k = 1; k <= 140; k++) {
      if (k === 30) e.telegraph = { startTick: 30, resolveTick: 72 };
      if (cancelAt !== null && k === cancelAt) {
        e.telegraph = null;
        if (cancelStatus) e.status = { [cancelStatus]: { untilTick: 200 } };
      }
      if (cancelAt === null && k === 72) {
        e.telegraph = null;
        if (hold) e.mode = 'dive';
      }
      if (hold && k === 72 + hold) e.mode = 'idle';
      for (const sub of [0, 0.5]) {
        const tk = k - 1 + sub;
        const beat = watch.update({ e, tick: tk });
        const st = clip.update({ beat, tel: watch.telegraph, now: tk / 60, tick: tk, holding: e.mode === 'dive', pick: () => V, out });
        trace.push({ tk, st, a: out.a });
        if (st === 'held' && contactTick === null) contactTick = tk;
      }
    }
    return { clip, trace, contactTick };
  }
  const plain = run();
  check('the strike lands on the resolve tick (its strike tick is the resolve)', plain.clip.lastStrike && plain.clip.lastStrike.tick === 72, plain.clip.lastStrike);
  const strikeFrames = plain.trace.filter((f) => f.st === 'strike').length;
  check('the strike plays 2.5 frames (5 ticks) on the shown ticks (no one-frame pop)', strikeFrames >= 8 && strikeFrames <= 11, strikeFrames / 2);
  check('the contact pose is reached on the release frame', plain.contactTick !== null && plain.contactTick <= 72 && plain.contactTick >= 70.5, plain.contactTick);
  const firstStrike = plain.trace.find((f) => f.st === 'strike');
  check('B4 the strike leaves on its first frame (no ease-in: a quarter of the way by half a tick)', firstStrike && (firstStrike.a - -1) / 3 > 0.25, firstStrike);
  const heldFrames = plain.trace.filter((f) => f.st === 'held').length;
  check('B2 a plain strike holds its contact 3 frames at least', heldFrames >= 6, heldFrames);
  const after = plain.trace.filter((f) => f.tk > 80).map((f) => f.a);
  check('B5 it settles with one small overshoot below rest, then rests', Math.min(...after) < -0.05 && Math.min(...after) > -0.4 && after[after.length - 1] === 0, r3(Math.min(...after)));
  const dive = run({ hold: 30 });
  const diveHeld = dive.trace.filter((f) => f.st === 'held').length;
  check('the contact holds while the sim keeps its strike mode (a dive)', diveHeld >= 58, diveHeld);
  for (const [at, status] of [[50, 'stun'], [72, 'stun'], [71, 'blind'], [72, null]]) {
    const r = run({ cancelAt: at, cancelStatus: status });
    const struck = status === null ? !!r.clip.lastStrike : r.clip.lastStrike === null;
    if (status === null) check('a telegraph that simply ends on its resolve tick is the strike', struck);
    else check(`a ${status} at tick ${at} cancels the strike (taken back, eases to rest)`, struck && r.trace[r.trace.length - 1].a === 0 && !r.trace.some((f) => f.st === 'held'), r.clip.lastStrike);
  }
  // a strike the sim starts with no wind-up seen snaps in within a frame
  const clip = createStrikeClip({ rest: REST, fields: ['a'] });
  const out = { a: 0 };
  let frames = 0;
  for (let f = 0; f < 10; f++) {
    const st = clip.update({ beat: null, tel: null, now: f / 60, tick: f / 2, fired: f === 2, pick: () => V, out });
    if (f >= 2 && st === 'snapin') frames++;
  }
  check('a strike with no wind-up seen snaps into its contact within one frame (B1)', frames >= 1 && frames <= 2, frames);
  check('STRIKE_TICKS is 2.5 frames', Math.abs(STRIKE_TICKS - 2.5 * FRAME * 60) < 1e-9);
  check("the kit's settle passes its rest once", settle(0.6) < 0 && settle(1) === 0);
}

// --- 2. the roster ----------------------------------------------------------
const level1 = LEVELS[1];
const level2 = LEVELS[2];
const L1 = new Set([...Object.keys(level1.roster), ...Object.keys(level1.campaignRoster || {})]);
const ALL2 = [...Object.keys(level2.roster), ...Object.keys(level2.campaignRoster || {})];
const ROSTER = ALL2.filter((k) => !L1.has(k));
{
  check('the Level II kinds Level I has not built are the seven foes', ROSTER.join() === 'toad,moth,snail,crab,lamprey,leech,miller', ROSTER);
  for (const kind of ALL2) {
    check(`${kind}: flagged on the model standard`, MODEL_STANDARD[kind] === true && facetOn(kind, new URLSearchParams('')));
    check(`${kind}: a faceted rig and its abilities`, typeof FACET_FOES[kind] === 'function' && FOE_ABILITIES[kind] && Object.keys(FOE_ABILITIES[kind]).length > 0);
    check(`${kind}: a model lab tab with every ability`, !!LAB_ENTRIES.find((e) => e.id === kind && e.abilities.length === Object.keys(FOE_ABILITIES[kind] || {}).length));
    check(`${kind}: a classic rig kept beside it`, typeof CLASSIC[kind] === 'function');
  }
  const off = facetFoeBuilders(new URLSearchParams('facet=0'));
  check('?facet=0 hands every foe back to its classic rig', Object.keys(off).length === 0);
  const only = facetFoeBuilders(new URLSearchParams('facet=crab'));
  check('?facet=crab facets the crab alone', Object.keys(only).join() === 'crab');
}

// --- helpers ----------------------------------------------------------------
// The highest vertex of a rig's drawn meshes (ink hulls, sprites and the
// floor pieces aside); topWho names the part that holds it.
let topWho = '';
function topY(g) {
  g.updateMatrixWorld(true);
  let top = -Infinity;
  const v = new Vector3();
  const mi = new Matrix4();
  const mw = new Matrix4();
  g.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull || /shadow|floor/i.test(o.name || '')) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const pos = o.geometry.attributes.position;
    const n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) mw.multiplyMatrices(o.matrixWorld, o.getMatrixAt(i, mi));
      else mw.copy(o.matrixWorld);
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(mw);
        if (v.y > top) {
          top = v.y;
          topWho = o.name;
        }
      }
    }
  });
  return top;
}

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
// every mesh, hidden or not (a hidden floor ring still costs a call when shown)
function allCalls(g) {
  let n = 0;
  g.traverse((o) => {
    if (o.isMesh || o.isSprite || o.isLine || o.isPoints) n++;
  });
  return n;
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
    if (o.material && !Array.isArray(o.material) && o.material.opacity !== undefined) out.push(o.material.opacity);
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

// The live attacks each foe's sim makes (sim/enemies/<kind>.js), stepped tick
// by tick on the entity exactly as the sim leaves it. Each scenario records
// the tick its attacks resolve; the rig's lab.lastStrike reports the tick its
// contact lands on.
//   telegraphs({...})  a telegraph from start to resolve, the sim's mode and
//                      fields on the resolve tick (`hit`) and after (`end`)
//   throws(field)      an unwarned throw: a new tick in `field`
//   mends()            the snail's lantern: mendStartTick, then mendTick
function telegraphs({ span, tel, every = 192, wind = null, hit = null, end = null, endAfter = 20 }) {
  return {
    type: 'telegraph',
    span,
    tel,
    wind,
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return;
      const start = 30 + i * every;
      if (k === start) {
        e.telegraph = { ...tel, startTick: k, resolveTick: k + span, x: 0, z: 3, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1 };
        if (wind) wind(e, k);
        events.push(k + span);
      }
      if (k === start + span) {
        e.telegraph = null;
        if (hit) hit(e, k);
      }
      if (k === start + span + endAfter && end) end(e, k);
    },
    cancel(e) {
      e.telegraph = null;
      e.status = { stun: { untilTick: 9999 } };
      if (end) end(e, 0);
    },
  };
}
function throws(field, every = 204, extra = null) {
  return {
    type: 'throw',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return;
      if (k === 30 + i * every) {
        e[field] = k;
        if (extra) extra(e, k);
        events.push(k);
      }
    },
  };
}
function mends(every = 240) {
  return {
    type: 'mend',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return;
      const start = 30 + i * every;
      if (k === start) {
        e.mendStartTick = k;
        e.nextMendTick = k + 30;
        events.push(k + 30);
      }
      if (k === start + 30) {
        e.mendStartTick = -1;
        e.mendTick = k;
        e.nextMendTick = k + every;
      }
    },
    cancel(e) {
      // a death mid-swell: the sim never mends
      e.mendStartTick = -1;
      e.hp = 0;
      e.state = 'dying';
    },
  };
}
const LIVE = {
  // the mend: a 30-tick lantern swell, the pulse on the mend tick
  snail: mends(),
  // the lob: unwarned, a new throwTick every 204 ticks (the cooldown read ahead)
  toad: throws('throwTick', 204, (e, k) => (e.nextAttackTick = k + 204)),
  // the swoop: a 45-tick lane, then mode 'swoop' down it (0.7 s at 8 u/s)
  moth: telegraphs({ span: 45, tel: { kind: 'lane', length: 5.5, width: 0.8 }, hit: (e) => (e.mode = 'swoop'), end: (e) => (e.mode = 'orbit'), endAfter: 41 }),
  // the lunge: risen (surfaced) on a 48-tick lane, mode 'lunge' for 30
  // ticks, then beached 110 ticks, then back under
  lamprey: telegraphs({ span: 48, tel: { kind: 'lane', length: 5, width: 0.9 }, wind: (e) => ((e.mode = 'rise'), (e.burrowed = false)), hit: (e) => (e.mode = 'lunge'), end: (e) => (e.mode = 'beached'), endAfter: 30 }),
  // the leap: a 42-tick lane, mode 'leap' for 18 ticks, then latched
  leech: telegraphs({ span: 42, tel: { kind: 'lane', length: 3.2, width: 0.6 }, hit: (e) => (e.mode = 'leap'), end: (e) => (e.mode = 'latched'), endAfter: 18 }),
  // the flail sweep: a 60-tick ring (mode 'whirl'), the sweep tick on resolve
  miller: telegraphs({ span: 60, tel: { kind: 'ring', radius: 2.2 }, wind: (e) => (e.mode = 'whirl'), hit: (e, k) => ((e.sweepTick = k), (e.mode = 'plod')) }),
  // the snap: a 42-tick cone, the guard down 45 ticks after it
  crab: telegraphs({ span: 42, tel: { kind: 'cone', radius: 1.4, length: 1.4, halfAngleDeg: 55 }, wind: (e) => (e.guard = { active: false }), hit: (e, k) => (e.snapTick = k), end: (e) => (e.guard = { active: true }), endAfter: 45 }),
};

// each foe's own beats (section 9, defined below)
const OWN = { snail: OWN_snail, toad: OWN_toad, lamprey: OWN_lamprey, leech: OWN_leech, moth: OWN_moth, miller: OWN_miller };

// --- 3 to 8: each foe -------------------------------------------------------
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
  const aAll = allCalls(rig.group);
  check(`${kind}: draws no more calls than its classic rig (every part shown)`, aAll <= b.calls, { faceted: a, every: aAll, classic: b });
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
  const inkless = [];
  rig.group.traverse((o) => {
    if (o.isInstancedMesh && !o.userData.inkHull && !o.material.isMeshBasicMaterial && !o.children.some((c) => c.userData.inkHull)) inkless.push(o.name);
  });
  check(`${kind}: every lit instanced row carries its ink hull`, inkless.length === 0, inkless);
  let flatOk = true;
  const notFlat = [];
  rig.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull || !o.geometry.attributes.normal || o.geometry.index || /ink/.test(o.name)) return;
    const n = o.geometry.attributes.normal;
    for (let i = 0; i + 2 < Math.min(n.count, 300); i += 3) {
      if (Math.abs(n.getX(i) - n.getX(i + 2)) + Math.abs(n.getY(i) - n.getY(i + 2)) + Math.abs(n.getZ(i) - n.getZ(i + 2)) > 1e-4) {
        flatOk = false;
        notFlat.push(o.name);
        break;
      }
    }
  });
  check(`${kind}: faceted (flat normals on every plane)`, flatOk, notFlat);

  // 4. live play
  const e = { id: 3, kind, x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'idle', telegraph: null, elite: false, faceX: 0, faceZ: 1, cdByTarget: {}, targetId: 1 };
  const base = new Vector3(2, 0, -3);
  rig.group.scale.setScalar(1.2);
  rig.group.rotation.set(0.08, 0, -0.05);
  const s0 = rig.group.scale.clone();
  const q0 = rig.group.rotation.clone();
  const plan = [];
  for (let d = 0; d < 8; d++) plan.push({ dur: 1.3, a: (d / 8) * Math.PI * 2, v: 1.6, face: 'travel' });
  plan.push({ dur: 1.2, a: 0, v: 0, face: 'spin' });
  plan.push({ dur: 1.3, a: Math.PI / 2, v: 1.2, face: 'hold' });
  plan.push({ dur: 1.3, a: Math.PI, v: 1.0, face: 'hold' });
  plan.push({ dur: 3, a: 0, v: 0, face: 'hold', attack: true });
  let t = 0;
  let tick = 0;
  let x = 0;
  let z = 0;
  let yaw = 0;
  let walk = 0;
  let tel = 0;
  let wrote = false;
  let bad = 0;
  let slide = 0;
  let lastFeet = null;
  let nextAtk = 0.4;
  const leanFwd = [];
  const leanBack = [];
  const live = LIVE[kind];
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
        e.telegraph = { kind: 'lane', attack: 'strike', startTick: tick, resolveTick: tick + 30, dirX: 0, dirZ: 1, length: 1.5, width: 0.6, radius: 1 };
        tel = 30;
        nextAtk = 0.9;
      }
      if (tel > 0 && --tel === 0) e.telegraph = null;
      rig.group.position.set(e.x, 0, e.z);
      const pos = rig.group.position.clone();
      rig.setYaw(yaw);
      rig.pose({ t, tick, walkPhase: walk, moveK: p.v > 0 ? 1 : 0, lungeK: 0, telegraphK: e.telegraph ? 1 : 0, fireK: 0, e });
      if (!rig.group.position.equals(pos) || !rig.group.scale.equals(s0) || !rig.group.rotation.equals(q0)) wrote = true;
      if (tick % 6 === 0) bad += finite(rig.group);
      if (rig.lab.feet) {
        const f = rig.lab.feet();
        if (lastFeet) for (let i = 0; i < f.length; i++) if (f[i].planted && lastFeet[i].planted) slide = Math.max(slide, Math.hypot(f[i].x - lastFeet[i].x, f[i].z - lastFeet[i].z));
        lastFeet = f.map((q) => ({ planted: q.planted, x: q.x, z: q.z }));
      }
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
    at(0);
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
  // the elite crown sits over every pose (render/enemies/archetypes.js CROWN_Y)
  {
    rig.group.position.set(0, 0, 0);
    rig.group.scale.setScalar(1);
    rig.group.rotation.set(0, 0, 0);
    let top = -Infinity;
    let who = '';
    for (const [id, ab] of Object.entries(abilities)) {
      for (let i = 0; i <= 60; i++) {
        rig.lab.override = { id, t: (ab.duration * i) / 60 };
        for (const tt of [0, 0.03, 0.07]) {
          rig.pose({ grown: true, t: 99 + tt + i * 0.011, tick: (99 + tt) * 60, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: { ...e, telegraph: null } });
          const y = topY(rig.group);
          if (y > top) {
            top = y;
            who = `${topWho} (${id} ${r3(rig.lab.override.t)})`;
          }
        }
      }
    }
    rig.lab.override = null;
    check(`${kind}: every ability pose stays under the elite crown (CROWN_Y ${CROWN_Y[kind]})`, top < CROWN_Y[kind], { top: r3(top), who });
  }

  // 6. the live attack lands on the sim's tick
  if (live) {
    const r = build();
    const ee = { ...e, x: 0, z: 0, px: 0, pz: 0, telegraph: null, cdByTarget: {}, targetId: 1, mode: 'idle', status: null };
    const events = [];
    const contacts = [];
    let seen = null;
    for (let k = 1; k <= 30 + 3 * 240 + 60; k++) {
      live.step(k, ee, events);
      r.setYaw(0);
      // the layer's frames on the state at k: stateTick - 1 + alpha
      for (const tk of [k - 1, k - 0.5]) r.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: ee.telegraph ? 1 : 0, fireK: 0, e: ee });
      const ls = r.lab.lastStrike;
      if (ls && (ls.tick !== seen || ls.id !== seen?.id)) {
        if (ls.tick !== seen) contacts.push(Math.round(ls.tick * 10) / 10);
        seen = ls.tick;
      }
    }
    if (live.type === 'throw') {
      const ok = contacts.length >= events.length && events.every((ev, i) => contacts[i] - ev >= 0 && contacts[i] - ev <= 8);
      check(`${kind}: each unwarned throw's contact lands within the B1 budget after it (8 ticks)`, ok, { throws: events, contact: contacts });
    } else {
      const ok = contacts.length >= events.length && events.every((ev, i) => Math.abs(contacts[i] - ev) <= 1);
      check(`${kind}: each ${live.type === 'mend' ? 'mend' : 'telegraphed strike'}'s contact lands on the sim's tick`, ok, { resolve: events, contact: contacts });
    }
    if (live.cancel) {
      const rc = build();
      const ec = { ...e, telegraph: null, mode: 'idle', cdByTarget: {}, status: null };
      const once = [];
      for (let k = 1; k <= 160; k++) {
        if (k < 40) live.step(k, ec, once);
        if (k === 45) live.cancel(ec);
        rc.setYaw(0);
        rc.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: ec.telegraph ? 1 : 0, fireK: 0, e: ec });
      }
      check(`${kind}: a cancelled wind-up never strikes`, rc.lab.lastStrike === null || rc.lab.lastStrike === undefined, rc.lab.lastStrike);
    }
    if (live.type === 'telegraph') {
      const badS = [];
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
              const frames = sub ? [k - 1, k - 1 + sub] : [k];
              for (const tk of frames) rs.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: es.telegraph ? 1 : 0, fireK: 0, e: es });
            }
            if (rs.lab.lastStrike) badS.push({ status, lead, sub, strike: rs.lab.lastStrike.tick });
          }
        }
      }
      check(`${kind}: a stun or blind on the resolve tick never strikes`, badS.length === 0, badS);
    }
  } else check(`${kind}: a live-attack scenario in this probe`, false);

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

  // 9. the foe's own beats
  const own = OWN[kind];
  if (own) own(build);
}

// Each foe's own beats, beyond the shared contract.
function OWN_snail(build) {
  // the lantern swells through the wind-up and the pulse ring sweeps out on
  // the mend
  const r = build();
  const ev = { id: 4, kind: 'snail', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'creep', mendStartTick: -1, mendTick: -1, nextMendTick: 999 };
  let bulbRest = null;
  let bulbWind = 0;
  let ring = 0;
  for (let k = 1; k <= 120; k++) {
    if (k === 40) {
      ev.mendStartTick = 40;
      ev.nextMendTick = 70;
    }
    if (k === 70) {
      ev.mendStartTick = -1;
      ev.mendTick = 70;
    }
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const s = r.lab.parts.bulb.scale.x;
    if (k === 35) bulbRest = s;
    if (k === 66) bulbWind = s;
    let shown = false;
    r.group.traverse((o) => {
      if (/mend-floor/.test(o.name) && o.visible && o.material.opacity > 0.05) shown = true;
    });
    if (shown) ring++;
  }
  check('snail: the lantern bulb swells through the 30-tick wind-up', bulbWind > bulbRest * 1.2, { rest: r3(bulbRest), wind: r3(bulbWind) });
  check('snail: the pulse ring sweeps out on the mend', ring >= 20, ring);
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);

function OWN_toad(build) {
  // the gather read ahead from the cooldown: the sac fills over the last 30
  // ticks, stays full while the sim holds the throw, empties on the throw
  const r = build();
  const ev = { id: 5, kind: 'toad', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'hold', throwTick: -1, nextAttackTick: 100 };
  const sacAt = {};
  for (let k = 1; k <= 160; k++) {
    if (k === 130) ev.throwTick = 130;
    if (k === 130) ev.nextAttackTick = 334;
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    sacAt[k] = r.lab.parts.sac.scale.x;
  }
  check('toad: the sac fills over the 30 ticks before its cooldown ends (the gather)', sacAt[60] < 1.1 && sacAt[99] > 1.4, { before: r3(sacAt[60]), at: r3(sacAt[99]) });
  check('toad: it holds loaded while the sim holds the throw', sacAt[125] > 1.4, r3(sacAt[125]));
  check('toad: the throw empties the sac', sacAt[134] < 0.9, r3(sacAt[134]));
}

function OWN_lamprey(build) {
  // lurking: sunk under the floor with only the ripple; it surfaces as the
  // sim breaks it out; beached, it rolls onto its side
  const r = build();
  const ev = { id: 6, kind: 'lamprey', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'lurk', burrowed: true };
  const at = {};
  for (let k = 1; k <= 160; k++) {
    if (k === 60) Object.assign(ev, { mode: 'rise', burrowed: false });
    if (k === 110) ev.mode = 'beached';
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    at[k] = { sink: r.lab.sink, shown: r.lab.parts.body.visible, ripple: r.lab.parts.ripple.material.opacity, roll: Math.abs(r.lab.parts.body.rotation.z) };
  }
  check('lamprey: lurking it is sunk out of sight with the ripple showing', !at[50].shown && at[50].sink > 0.97 && at[40].ripple > 0, at[50]);
  check('lamprey: it surfaces when the sim breaks it out', at[90].shown && at[90].sink < 0.05, at[90]);
  check('lamprey: beached it lies rolled on its side', at[150].roll > 0.7, r3(at[150].roll));
}
function OWN_leech(build) {
  // latched: stood up on its host, a gulp swelling down the body on each
  // drain; flopped: rolled on its side
  const r = build();
  const ev = { id: 7, kind: 'leech', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'creep', nextDrainTick: 0 };
  let gulps = 0;
  let last = 9;
  let rear = 0;
  let roll = 0;
  for (let k = 1; k <= 200; k++) {
    if (k === 20) Object.assign(ev, { mode: 'latched', nextDrainTick: 50 });
    if (k === 50) ev.nextDrainTick = 80;
    if (k === 80) ev.nextDrainTick = 110;
    if (k === 120) ev.mode = 'flop';
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    if (r.lab.gulp < last) gulps++;
    last = r.lab.gulp;
    if (k === 100) rear = r.lab.pose().rear;
    if (k === 190) roll = Math.abs(r.lab.parts.body.rotation.z);
  }
  check('leech: latched it stands up its front on the host', rear > 0.18, r3(rear));
  check('leech: a gulp on each drain', gulps === 2, gulps);
  check('leech: flopped it lies rolled on its side', roll > 0.8, r3(roll));
}
function OWN_moth(build) {
  // the swoop: low and nose down with the wings swept back while the sim's
  // mode is 'swoop'
  const r = build();
  const ev = { id: 8, kind: 'moth', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'orbit', telegraph: null };
  let rest = null;
  let dive = null;
  for (let k = 1; k <= 140; k++) {
    if (k === 30) ev.telegraph = { kind: 'lane', startTick: 30, resolveTick: 75, dirX: 0, dirZ: 1, length: 5.5, width: 0.8 };
    if (k === 75) Object.assign(ev, { telegraph: null, mode: 'swoop' });
    if (k === 116) ev.mode = 'orbit';
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    if (k === 20) rest = r.lab.parts.body.position.y;
    if (k === 100) dive = { y: r.lab.parts.body.position.y, pitch: r.lab.parts.body.rotation.x };
  }
  check('moth: the swoop drops it low and nose down while the sim swoops', dive.y < rest - 0.35 && dive.pitch > 0.4, { rest: r3(rest), dive: r3(dive.y), pitch: r3(dive.pitch) });
}

function OWN_miller(build) {
  // the sack toss (unwarned): its contact within the B1 budget after the
  // sim's toss tick; the stone spins whole turns through the sweep's coil
  // and hangs at his side again after it
  const r = build();
  const ev = { id: 9, kind: 'miller', x: 0, z: 0, px: 0, pz: 0, hp: 40, maxHp: 40, state: 'active', mode: 'plod', telegraph: null, sweepTick: -1, tossTick: -1 };
  const azs = [];
  for (let k = 1; k <= 260; k++) {
    if (k === 30) ev.tossTick = 30;
    if (k === 100) Object.assign(ev, { mode: 'whirl', telegraph: { kind: 'ring', startTick: 100, resolveTick: 160, x: 0, z: 0, radius: 2.2 } });
    if (k === 160) Object.assign(ev, { mode: 'plod', telegraph: null, sweepTick: 160 });
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    azs.push(r.lab.pose().az);
  }
  const tl = r.lab.lastToss;
  check('miller: the sack toss lands its contact within the B1 budget after the toss tick', !!tl && tl.tick - 30 >= 0 && tl.tick - 30 <= 8, tl);
  const turned = Math.abs(azs[158] - azs[99]);
  check('miller: the stone spins two whole turns and more through the coil', turned > 4 * Math.PI, r3(turned));
  check('miller: the stone hangs at his side again after the sweep', Math.abs(azs[259] - azs[20]) < 1e-6, { before: r3(azs[20]), after: r3(azs[259]) });
}
