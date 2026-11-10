#!/usr/bin/env node
// MODEL STANDARD, THE LEVEL III FOES probe (v0.5.349) — headless Node, builds
// the rigs; no browser. Every creature Level III (the Ashen Barrow) rolls
// that Levels I and II have not already rebuilt (the ram, the mole, the
// crow, the brood spider and its broodling, the grave wisp, the bone knight,
// the keener and the sexton) is rebuilt on the model standard
// (docs/MODEL_STANDARD.md "The Level III foes", render/enemies/facet/).
// Visual only. This probe checks:
//   1. the telegraphed strike clip (render/facet/foestrike.js): the strike
//      lands on the resolve tick on the layer's shown ticks, a cancel (even
//      inside the strike frames) takes it back, a strike with no wind-up seen
//      snaps in within a frame, the contact holds while the sim's strike mode
//      lasts and 3 frames at least, the settle passes rest once;
//   2. the roster: every kind of Level III's roster has a faceted rig (here
//      or in an earlier level's), abilities and a model lab tab (the
//      classic rigs and `?facet=0` were retired, AUDIT.md D1);
//   3. the crowd budget: each rig draws no more calls than its
//      retired classic rig did (tools/classic-foe-calls.json);
//      its fixed geometry is shared by every copy; every lit instanced row
//      carries its ink hull; every plane is flat;
//   4. each rig in live play (a move loop in eight directions, a spin on the
//      spot, a sidestep, a backpedal, live attacks): no broken matrix, the
//      layer's group transform never written, a planted foot never slides,
//      the lean follows the travel;
//   5. each ability on its lab timeline: pure in t, and it moves the rig;
//      every pose under the elite crown;
//   6. each foe's live attack: its contact lands on the tick the sim resolves
//      it (a telegraph's resolve, the sexton's bury), or within the B1 budget
//      after an unwarned bite or the wisp's tether; a predicted bite lands on
//      the sim's bite tick; a cancelled wind-up, a spoiled dig and a stun or
//      blind landing on the resolve tick never strike;
//   7. the spawn-in on a fresh rig, the Journal's turntable with no entity,
//      the hit and death tuning and the named points the VFX layer reads, the
//      whole moving body under the envelope's node;
//   8. colour: no Ember, Bright Heal or Violet anywhere in a rig;
//   9. each foe's own beats (the ram's guard flare, the mole under its mound,
//      the wisp's ward, the knight's shield, the keener's mouth, the sexton's
//      knee);
//  10. the three Barrow beats that had no voice have a cue of their own
//      (audio/barrowheartcues.js, measured): the knight's slam, the wisp's
//      tether, the brood's split; the lab plays each foe's cue.
//
//   node tools/model-standard-level3-foes-probe.mjs [kind,kind]
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
import fs from 'node:fs';

const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Matrix4, Vector3 } = await import('three');
const { FRAME, createAttackWatch, settle } = await import('../src/render/facet/foe.js');
const { createStrikeClip, STRIKE_TICKS } = await import('../src/render/facet/foestrike.js');
const { FACET_FOES, FOE_ABILITIES } = await import('../src/render/enemies/facet/index.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-foes.js');
const { CROWN_Y } = await import('../src/render/enemies/archetypes.js');
const { LEVELS } = await import('../src/data/levels.js');
const { PALETTE } = await import('../src/data/palette.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;
// The retired classic rigs' draw calls (AUDIT.md D1), the crowd budget.
const CLASSIC_CALLS = JSON.parse(fs.readFileSync(new URL('./classic-foe-calls.json', import.meta.url), 'utf8'));

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
const built = new Set();
for (const lv of [1, 2]) for (const k of [...Object.keys(LEVELS[lv].roster), ...Object.keys(LEVELS[lv].campaignRoster || {})]) built.add(k);
const level3 = LEVELS[3];
const ALL3 = [...Object.keys(level3.roster), ...Object.keys(level3.campaignRoster || {})];
// the brood's child joins the roster's kinds: the room rolls it with its mother
const ROSTER = [...ALL3.filter((k) => !built.has(k)), 'broodling'];
{
  check('the Level III kinds Levels I and II have not built are the eight foes (nine with the broodling)', ROSTER.join() === 'ram,mole,crow,brood,gravewisp,knight,keener,sexton,broodling', ROSTER);
  for (const kind of ALL3) {
    check(`${kind}: a faceted rig and its abilities`, typeof FACET_FOES[kind] === 'function' && FOE_ABILITIES[kind] && Object.keys(FOE_ABILITIES[kind]).length > 0);
    check(`${kind}: a model lab tab with every ability`, !!LAB_ENTRIES.find((e) => e.id === kind && e.abilities.length === Object.keys(FOE_ABILITIES[kind] || {}).length));
    check(`${kind}: a classic draw budget on file`, Number.isInteger(CLASSIC_CALLS[kind]));
  }
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
//   bites(every)       an unwarned contact bite on a per-target cooldown
//   wards()            the wisp's tether: unwarned, held 240 ticks, then dropped
//   digs()             the sexton's dig: mode 'dig' 36 ticks, the bury on digTick
function digs(every = 300) {
  return {
    type: 'dig',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return null;
      const start = 30 + i * every;
      if (k === start) {
        e.mode = 'dig';
        e.digUntil = k + 36;
        events.push(k + 36);
      }
      if (k === start + 36) {
        e.mode = 'skulk';
        e.digTick = k;
      }
      return null;
    },
    cancel(e) {
      // a stun spoils the dig: up at once, no bury
      e.mode = 'skulk';
      e.status = { stun: { untilTick: 9999 } };
    },
  };
}
function wards(every = 300) {
  return {
    type: 'ward',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return null;
      const start = 30 + i * every;
      if (k === start) {
        e.tetherId = 7;
        e.mode = 'ward';
        events.push(k);
      }
      if (k === start + 240) {
        e.tetherId = null;
        e.mode = 'drift';
      }
      return null;
    },
  };
}
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
const LIVE = {
  // the horn slam: a 60-tick cone, the slam on its resolve (enemy_slam)
  ram: telegraphs({ span: 60, tel: { kind: 'cone', radius: 1.8, halfAngleDeg: 50 } }),
  // the emergence: a 60-tick ring (mode 'emerging', burrowed), surfaced on
  // its resolve, 120 ticks up, then the dig back in
  mole: telegraphs({ span: 60, tel: { kind: 'ring', radius: 0.8 }, wind: (e) => ((e.mode = 'emerging'), (e.burrowed = true)), hit: (e) => ((e.mode = 'surfaced'), (e.burrowed = false)), end: (e) => ((e.mode = 'burrowed'), (e.burrowed = true)), endAfter: 120 }),
  // the caw: a 45-tick cone, the volley (fireTick) on its resolve
  crow: telegraphs({ span: 45, tel: { kind: 'cone', radius: 5, length: 5, halfAngleDeg: 22 }, hit: (e, k) => (e.fireTick = k) }),
  // the bite: unwarned, on contact, a per-target cooldown of 60 ticks (45
  // for the broodling)
  brood: bites(60),
  broodling: bites(45),
  // the ward: unwarned on the tether tick (wisp_tether), held 240 ticks
  gravewisp: wards(),
  // the overhead slam: a 66-tick ring (mode 'slam', the guard down), the
  // blow on its resolve (slamTick), the guard back 50 ticks after
  // the wail: a 54-tick cone (mode 'keen'), the wail on its resolve (wailTick)
  keener: telegraphs({ span: 54, tel: { kind: 'cone', radius: 4.2, length: 4.2, halfAngleDeg: 28 }, wind: (e) => (e.mode = 'keen'), hit: (e, k) => ((e.wailTick = k), (e.mode = 'drift')) }),
  // the dig: mode 'dig' for 36 ticks, the bury (digTick) at its end
  sexton: digs(),
  knight: telegraphs({ span: 66, tel: { kind: 'ring', radius: 1.4 }, wind: (e) => ((e.mode = 'slam'), (e.guard = { active: false })), hit: (e, k) => ((e.slamTick = k), (e.mode = 'march')), end: (e) => (e.guard = { active: true }), endAfter: 50 }),
};

// each foe's own beats (section 9, defined below)
const OWN = { ram: OWN_ram, mole: OWN_mole, gravewisp: OWN_gravewisp, knight: OWN_knight, keener: OWN_keener, sexton: OWN_sexton };

// --- 3 to 8: each foe -------------------------------------------------------
const ONLY = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
for (const kind of ROSTER) {
  if (ONLY && !ONLY.has(kind)) continue;
  const build = FACET_FOES[kind];
  if (!build) continue;
  const abilities = FOE_ABILITIES[kind];
  const rig = build();

  // 3. the crowd budget
  const a = drawCalls(rig.group);
  const b = { calls: CLASSIC_CALLS[kind] };
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
    let pulse = 0;
    for (let k = 1; k <= 30 + 3 * 240 + 60; k++) {
      const beat = live.step(k, ee, events);
      // the layer's lunge pulse on a bite (enemy_bite)
      if (beat === 'bite') pulse = 0.18;
      else pulse = Math.max(0, pulse - DT * 1.2);
      r.setYaw(0);
      // the layer's frames on the state at k: stateTick - 1 + alpha
      for (const tk of [k - 1, k - 0.5]) r.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: pulse, telegraphK: ee.telegraph ? 1 : 0, fireK: 0, e: ee });
      const ls = r.lab.lastStrike;
      if (ls && (ls.tick !== seen || ls.id !== seen?.id)) {
        if (ls.tick !== seen) contacts.push(Math.round(ls.tick * 10) / 10);
        seen = ls.tick;
      }
    }
    if (live.type === 'bite') {
      const first = contacts.length ? contacts[0] - events[0] : -1;
      check(`${kind}: the first unwarned bite's contact lands within the B1 budget after it (8 ticks)`, first >= 0 && first <= 8, { bite: events[0], contact: contacts[0] });
      check(`${kind}: each predicted bite's contact lands on the sim's bite tick`, contacts.length >= 3 && Math.abs(contacts[1] - events[1]) <= 1 && Math.abs(contacts[2] - events[2]) <= 1, { bites: events, contact: contacts });
    } else if (live.type === 'ward') {
      const ok = contacts.length >= events.length && events.every((ev, i) => contacts[i] - ev >= 0 && contacts[i] - ev <= 8);
      check(`${kind}: each tether's cast lands within the B1 budget after the tether tick (8 ticks)`, ok, { tethers: events, contact: contacts });
    } else if (live.type === 'throw') {
      const ok = contacts.length >= events.length && events.every((ev, i) => contacts[i] - ev >= 0 && contacts[i] - ev <= 8);
      check(`${kind}: each unwarned throw's contact lands within the B1 budget after it (8 ticks)`, ok, { throws: events, contact: contacts });
    } else {
      const ok = contacts.length >= events.length && events.every((ev, i) => Math.abs(contacts[i] - ev) <= 1);
      check(`${kind}: each ${live.type === 'dig' ? 'bury' : live.type === 'mend' ? 'mend' : 'telegraphed strike'}'s contact lands on the sim's tick`, ok, { resolve: events, contact: contacts });
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
    // a bite foe stunned or blinded against its target: the sim starts no
    // bite while it holds, so the predicted next bite never plays
    if (live.type === 'bite') {
      const badB = [];
      for (const status of ['stun', 'blind']) {
        const rs = build();
        const es = { ...e, x: 0, z: 0, px: 0, pz: 0, telegraph: null, mode: 'idle', cdByTarget: {}, status: null };
        let strikes = 0;
        let lastSeen = null;
        for (let k = 1; k <= 30 + 2 * live.every; k++) {
          if (k === 30) {
            es.biteTick = k;
            es.cdByTarget[1] = k + live.every;
          }
          if (k === 40) es.status = { [status]: { untilTick: 30 + 2 * live.every } };
          rs.setYaw(0);
          rs.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: k >= 30 && k < 41 ? 0.18 : 0, telegraphK: 0, fireK: 0, e: es });
          const ls = rs.lab.lastStrike;
          if (ls && ls.tick !== lastSeen) {
            lastSeen = ls.tick;
            if (ls.tick > 45) strikes++;
          }
        }
        if (strikes) badB.push({ status, strikes });
      }
      check(`${kind}: a stunned or blinded biter never plays its predicted bite`, badB.length === 0, badB);
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
function EV(id, kind, extra) {
  return { id, kind, x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'idle', telegraph: null, cdByTarget: {}, targetId: 1, ...extra };
}
function OWN_ram(build) {
  // the guard's glow flares on a blocked shot (the sim's lastBlockedTick)
  const r = build();
  const ev = EV(4, 'ram', { mode: 'advance', lastBlockedTick: -1 });
  const op = {};
  for (let k = 1; k <= 90; k++) {
    if (k === 40) ev.lastBlockedTick = 40;
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    op[k] = r.lab.parts.guardGlow.material.opacity;
  }
  check('ram: the guard glow flares on a blocked shot', op[42] > op[30] + 0.2 && op[85] < op[42] - 0.2, { before: r3(op[30]), flare: r3(op[42]), after: r3(op[85]) });
}
function OWN_mole(build) {
  // burrowed: nothing of the mole shows above the floor but its mound; the
  // mound quakes through the ring telegraph; surfaced, the mole stands on it
  const r = build();
  const ev = EV(5, 'mole', { mode: 'burrowed', burrowed: true });
  // (topY skips the floor pieces: the mound is named mole-floor-hump)
  const top = topY;
  let under = -Infinity;
  let shake = 0;
  let up = -Infinity;
  for (let k = 1; k <= 260; k++) {
    if (k === 60) {
      ev.mode = 'emerging';
      ev.telegraph = { kind: 'ring', radius: 0.8, startTick: 60, resolveTick: 120, x: 0, z: 0, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1 };
    }
    if (k === 120) {
      ev.telegraph = null;
      ev.mode = 'surfaced';
      ev.burrowed = false;
    }
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: ev.telegraph ? 1 : 0, fireK: 0, e: ev });
    if (k > 20 && k < 60) under = Math.max(under, top(r.group));
    if (k > 80 && k < 115) shake = Math.max(shake, Math.abs(r.lab.parts.mound.scale.y - 1));
    if (k > 200) up = Math.max(up, top(r.group));
  }
  check('mole: burrowed, nothing shows above the floor but the mound', under < 0.02, r3(under));
  check('mole: the mound quakes through the ring telegraph', shake > 0.01, r3(shake));
  check('mole: surfaced, it stands up out of the earth', up > 0.3, r3(up));
}
function OWN_gravewisp(build) {
  // the core swells and the glow brightens while the tether holds; both
  // fall back once it drops
  const r = build();
  const ev = EV(6, 'gravewisp', { mode: 'drift', tetherId: null, flier: true });
  const core = {};
  for (let k = 1; k <= 200; k++) {
    if (k === 50) {
      ev.tetherId = 9;
      ev.mode = 'ward';
    }
    if (k === 150) {
      ev.tetherId = null;
      ev.mode = 'drift';
    }
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    core[k] = r.lab.parts.core.scale.x;
  }
  check('gravewisp: the core swells while the tether holds', core[100] > core[40] + 0.3, { drift: r3(core[40]), ward: r3(core[100]) });
  check('gravewisp: the core falls back once the tether drops', core[199] < core[100] - 0.3, { ward: r3(core[100]), after: r3(core[199]) });
}
function OWN_knight(build) {
  // the shield is square before it while the guard holds, swung out to its
  // left and turned away while the guard is down
  const r = build();
  const ev = EV(7, 'knight', { mode: 'march', guard: { active: true }, slamTick: -1 });
  const sh = {};
  const v = new Vector3();
  for (let k = 1; k <= 160; k++) {
    if (k === 60) ev.guard = { active: false };
    if (k === 120) ev.guard = { active: true };
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const m = r.lab.parts.shield.matrix;
    v.setFromMatrixPosition(m);
    // its face's turn off +z (the matrix's z column)
    const zx = m.elements[8];
    const zz = m.elements[10];
    sh[k] = { x: v.x, turn: Math.abs(Math.atan2(zx, zz)) };
  }
  check('knight: the shield is square before it while the guard holds', sh[50].turn < 0.15 && sh[158].turn < 0.15, { turn: r3(sh[50].turn), back: r3(sh[158].turn) });
  check('knight: the shield swings out to its left and turns away while the guard is down', sh[110].x > sh[50].x + 0.1 && sh[110].turn > 0.5, { x: r3(sh[110].x - sh[50].x), turn: r3(sh[110].turn) });
}
function OWN_keener(build) {
  // the mouth swells through the keen (the cone telegraph) and peaks on the wail
  const r = build();
  const ev = EV(8, 'keener', { mode: 'drift', wailTick: -1 });
  const mouth = {};
  for (let k = 1; k <= 140; k++) {
    if (k === 30) {
      ev.mode = 'keen';
      ev.telegraph = { kind: 'cone', radius: 4.2, length: 4.2, halfAngleDeg: 28, startTick: 30, resolveTick: 84, x: 0, z: 0, dirX: 0, dirZ: 1, playerTargeted: true, targetId: 1 };
    }
    if (k === 84) {
      ev.telegraph = null;
      ev.mode = 'drift';
      ev.wailTick = 84;
    }
    r.setYaw(0);
    for (const tk of [k - 1, k - 0.5]) r.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: ev.telegraph ? 1 : 0, fireK: 0, e: ev });
    mouth[k] = r.lab.pose().mouth;
  }
  check('keener: the mouth swells through the keen', mouth[75] > mouth[20] + 0.4, { rest: r3(mouth[20]), keen: r3(mouth[75]) });
  check('keener: the mouth peaks on the wail and closes after', mouth[86] > mouth[75] && mouth[139] < 0.2, { keen: r3(mouth[75]), wail: r3(mouth[86]), after: r3(mouth[139]) });
}
function OWN_sexton(build) {
  // it drops to a knee for the dig (the hips sink) and the flame flares;
  // the spade comes off the shoulder; it is up again after the bury
  const r = build();
  const ev = EV(9, 'sexton', { mode: 'skulk', digTick: -1 });
  const at = {};
  for (let k = 1; k <= 160; k++) {
    if (k === 30) {
      ev.mode = 'dig';
      ev.digUntil = 66;
    }
    if (k === 66) {
      ev.mode = 'skulk';
      ev.digTick = 66;
    }
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const P = r.lab.pose();
    at[k] = { crouch: P.crouch, flame: P.flame, tipY: r.points.tip.position.y };
  }
  check('sexton: it drops to a knee for the dig and the flame flares', at[50].crouch > 0.1 && at[50].flame > 0.3, { crouch: r3(at[50].crouch), flame: r3(at[50].flame) });
  check('sexton: the spade comes down off the shoulder into the earth', at[64].tipY < at[20].tipY - 0.2, { shouldered: r3(at[20].tipY), driven: r3(at[64].tipY) });
  check('sexton: it is up again after the bury', at[159].crouch < 0.02 && at[159].flame < 0.1, { crouch: r3(at[159].crouch), flame: r3(at[159].flame) });
}

// --- 10. the Barrow beats that had no voice -----------------------------------
{
  const { BH_CUE_IDS, BH_CUE_CAL, createBarrowHeartEventCues } = await import('../src/audio/barrowheartcues.js');
  const map = createBarrowHeartEventCues();
  const h = { pos: () => ({ x: 1, z: 2 }), player: () => ({ x: 0, z: 0 }) };
  for (const [event, cue, ev] of [
    ['knight_slam', 'bh_slam', { id: 7, x: 1.1, z: 0, radius: 1.4, victims: 1 }],
    ['wisp_tether', 'bh_ward', { id: 6, target: 9, etype: 'ram', x: 3, z: 3 }],
    ['brood_split', 'bh_split', { id: 4, x: 2, z: 2, brood: [10, 11] }],
  ]) {
    check(`${event} plays ${cue}`, typeof map[event] === 'function' && map[event](ev, h).some((c) => c.cue === cue), map[event] ? map[event](ev, h) : null);
    check(`${cue} is registered and measured`, BH_CUE_IDS.includes(cue) && Number.isFinite(BH_CUE_CAL[cue]) && BH_CUE_CAL[cue] !== 0, BH_CUE_CAL[cue]);
  }
  // the lab plays each foe's cue
  for (const [kind, cues] of Object.entries({ ram: ['m4b_thud'], mole: ['m4b_erupt', 'm4b_dig'], crow: ['spit'], brood: ['bite'], broodling: ['bite'], gravewisp: ['bh_ward'], knight: ['bh_slam'], keener: ['bh_keen'], sexton: ['bh_dig', 'bh_bury'] })) {
    const entry = LAB_ENTRIES.find((e) => e.id === kind);
    const has = entry ? Object.values(entry.sound || {}) : [];
    check(`${kind}: the lab plays its cue${cues.length > 1 ? 's' : ''} (${cues.join(', ')})`, cues.every((c) => has.includes(c)), has);
  }
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
