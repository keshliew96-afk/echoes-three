#!/usr/bin/env node
// MODEL STANDARD, THE LEVEL IV FOES probe (v0.5.348) — headless Node, builds
// the rigs; no browser. The Hollow Heart's own creatures (data/levels.js row
// 4: the roster's husk, lancer, geode and censer, the campaign roster's bloom
// and siphon) are rebuilt on the model standard (docs/MODEL_STANDARD.md "The
// Level IV foes", render/enemies/facet/). The row's other kinds are Level
// II's moth (built) and the Barrow's crow, brood, gravewisp and knight (the
// Level III foes slice's). Visual only. This probe checks:
//   1. the roster: each of the six has a faceted rig, a flag, abilities and a
//      model lab tab (the classic rigs and `?facet=0` were retired, AUDIT.md D1);
//   2. the crowd budget: each rig draws no more calls than its
//      retired classic rig did (tools/classic-foe-calls.json);
//      its fixed geometry is shared by every copy; every lit instanced row
//      carries its ink hull; every plane is flat;
//   3. each rig in live play (a move loop in eight directions, a spin on the
//      spot, a sidestep, a backpedal, live attacks): no broken matrix, the
//      layer's group transform never written, a planted foot (the husk's and
//      the lancer's feet, the brute's paws and fists, the bloom's root tips)
//      never slides, the lean follows the travel (the censer's pendulum trails
//      it, the siphon pitches into it);
//   4. each ability on its lab timeline: pure in t, and it moves the rig;
//      every pose under the elite crown (the censer's chain hangs from
//      nothing above its crown, as the classic's does: it is left out);
//   5. each foe's live attack: its contact lands on the tick the sim resolves
//      it (a telegraph's resolve, the censer's mend tick), or within the B1
//      budget after an unwarned bite; a cancelled wind-up (a spilled gather)
//      and a stun or blind landing on the resolve tick never strike;
//   6. the spawn-in on a fresh rig, the Journal's turntable with no entity,
//      the hit and death tuning and the named points the VFX layer reads, the
//      whole moving body under the envelope's node;
//   7. colour: no Ember, Bright Heal or Violet anywhere in a rig (the Heart's
//      own violet veins and crystal are its own hues);
//   8. each foe's own beats: the husk's heartbeat (veins and hunch) and bite
//      chain; the lancer's spear gone on the throw and reformed; the brute's
//      fists off the floor in the coil and down on the slam, the crystal
//      flaring; the censer's halo wide in the gather, the pendulum's lag,
//      a spill guttering the coals; the bloom rooted and sunk, its petals
//      open in the coil and shut on the pulse, its base on the floor; the
//      siphon's tendrils drawn up to cast and flung on the lash, a gulp on
//      every drink.
//
//   node tools/model-standard-level4-foes-probe.mjs [kind,kind]
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
import fs from 'node:fs';

const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Matrix4, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
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

// --- 1. the roster ----------------------------------------------------------
const level4 = LEVELS[4];
const ALL4 = [...Object.keys(level4.roster), ...Object.keys(level4.campaignRoster || {})];
const ROSTER = ['husk', 'lancer', 'geode', 'censer', 'bloom', 'siphon'];
{
  check('the six Heart foes are Level IV kinds', ROSTER.every((k) => ALL4.includes(k)), ALL4);
  for (const kind of ROSTER) {
    check(`${kind}: flagged on the model standard`, MODEL_STANDARD[kind] === true && facetOn(kind, new URLSearchParams('')));
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
    if (!o.isMesh || o.userData.inkHull || /shadow|floor|chain/i.test(o.name || '')) return;
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
// bites(): the husk's contact bite: the layer's lunge pulse on each bite
// tick, the per-target cooldown set (the next bite predicted from it)
function bites(every = 48) {
  return {
    type: 'bite',
    step(k, e, events) {
      if (k < 30 || k >= 30 + 3 * every) return;
      if ((k - 30) % every === 0) {
        e.biteTick = k;
        e.cdByTarget[1] = k + every;
        events.push(k);
      }
    },
    lunge(k) {
      // the layer's bite pulse: 0.18 s from each bite tick
      const since = (k - 30) % 48;
      return k >= 30 && k < 30 + 3 * 48 && since < 11 ? Math.sin((since / 11) * Math.PI) : 0;
    },
  };
}
// gathers(): the censer's gather: mode 'gather' with its window, the mend
// tick on its end
function gathers(every = 300) {
  return {
    type: 'mend',
    step(k, e, events) {
      const i = Math.floor((k - 30) / every);
      if (k < 30 || i >= 3) return;
      const start = 30 + i * every;
      if (k === start) {
        e.mode = 'gather';
        e.gatherUntil = k + 48;
        events.push(k + 48);
      }
      if (k === start + 48) {
        e.mode = 'drift';
        e.mendTick = k;
      }
    },
    cancel(e) {
      // a stun spills the gather: no mend
      e.mode = 'drift';
      e.status = { stun: { untilTick: 9999, at: 40 } };
    },
  };
}
const LIVE = {
  husk: bites(),
  // the lance: a 54-tick lane (mode 'aim'), the lance tick on resolve
  lancer: telegraphs({ span: 54, tel: { kind: 'lane', length: 7, width: 0.8, lance: true }, wind: (e) => (e.mode = 'aim'), hit: (e, k) => ((e.lanceTick = k), (e.mode = 'stalk')), every: 240 }),
  // the slam: a 60-tick ring (mode 'slam'), the slam tick on resolve
  geode: telegraphs({ span: 60, tel: { kind: 'ring', radius: 1.5 }, wind: (e) => (e.mode = 'slam'), hit: (e, k) => ((e.slamTick = k), (e.mode = 'march')), every: 280 }),
  censer: gathers(),
  // the pulse: rooted, a 54-tick ring, the pulse tick on resolve
  bloom: telegraphs({ span: 54, tel: { kind: 'ring', radius: 2.3 }, wind: (e) => (e.mode = 'rooted'), hit: (e, k) => (e.pulseTick = k), every: 360 }),
  // the lash: a 54-tick lane (mode 'cast'), the cast tick on resolve, then
  // the drink for 180 ticks
  siphon: telegraphs({ span: 54, tel: { kind: 'lane', length: 5.4, width: 0.7 }, wind: (e) => (e.mode = 'cast'), hit: (e, k) => ((e.castTick = k), (e.mode = 'drink'), (e.nextDrainTick = k + 30)), end: (e) => (e.mode = 'drift'), endAfter: 180, every: 300 }),
};

// each foe's own beats (section 8, defined below)
const OWN = { husk: OWN_husk, lancer: OWN_lancer, geode: OWN_geode, censer: OWN_censer, bloom: OWN_bloom, siphon: OWN_siphon };

// --- 2 to 7: each foe -------------------------------------------------------
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
    for (let k = 1; k <= 30 + 3 * 240 + 60; k++) {
      live.step(k, ee, events);
      r.setYaw(0);
      // the layer's frames on the state at k: stateTick - 1 + alpha
      for (const tk of [k - 1, k - 0.5]) r.pose({ t: tk / 60, tick: tk, walkPhase: 0, moveK: 0, lungeK: live.lunge ? live.lunge(tk) : 0, telegraphK: ee.telegraph ? 1 : 0, fireK: 0, e: ee });
      const ls = r.lab.lastStrike;
      if (ls && (ls.tick !== seen || ls.id !== seen?.id)) {
        if (ls.tick !== seen) contacts.push(Math.round(ls.tick * 10) / 10);
        seen = ls.tick;
      }
    }
    if (live.type === 'bite') {
      const ok = contacts.length >= events.length && events.every((ev, i) => contacts[i] - ev >= -1 && contacts[i] - ev <= 8);
      check(`${kind}: each bite's contact lands within the B1 budget after it (the first unwarned, the next two predicted)`, ok, { bites: events, contact: contacts });
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
    if (live.type === 'telegraph' && kind !== 'bloom') {
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

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);

// Each foe's own beats, beyond the shared contract.
function OWN_husk(build) {
  // the heartbeat: the veins brighten and the hunch deepens into the surge;
  // the bite chain: three hits in turn, the third the biggest shove
  const r = build();
  const ev = { id: 4, kind: 'husk', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'stalk', biteTick: -1, cdByTarget: {}, targetId: 1 };
  const at = {};
  // HEARTBEAT.period 180: the swell from 150, the surge from 180
  for (let k = 1; k <= 230; k++) {
    ev.mode = k >= 180 && k < 222 ? 'surge' : 'stalk';
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const c = r.lab.parts.heart.material.color;
    at[k] = { vein: c.r + c.g + c.b, hunch: r.lab.pose().hunch, throb: r.lab.parts.heart.scale.x };
  }
  check('husk: the veins brighten and the heart throbs over the swell', at[178].vein > at[100].vein + 0.2 && at[178].throb > at[100].throb + 0.1, { rest: r3(at[100].vein), swell: r3(at[178].vein) });
  check('husk: the hunch deepens into the surge', at[215].hunch > at[100].hunch + 0.2, { stalk: r3(at[100].hunch), surge: r3(at[215].hunch) });
  const pushes = [];
  const rb = build();
  const eb = { ...ev, mode: 'stalk' };
  let n = -1;
  for (let k = 1; k <= 200; k++) {
    if (k === 30 || k === 78 || k === 126) {
      eb.biteTick = k;
      eb.cdByTarget[1] = k + 48;
    }
    rb.setYaw(0);
    rb.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: eb });
    if (rb.lab.hit !== n) {
      n = rb.lab.hit;
      if (n >= 0) pushes[n] = 0;
    }
    if (n >= 0) pushes[n] = Math.max(pushes[n], rb.lab.pose().push);
  }
  check('husk: the bites chain through all three hits', pushes.length === 3 && pushes.every((p) => p > 0.1), pushes.map(r3));
  check('husk: the double rake is the biggest shove (B6)', pushes.length === 3 && pushes[2] > pushes[0] && pushes[2] > pushes[1], pushes.map(r3));
}
function OWN_lancer(build) {
  // the spear is gone from the hand on the throw and reforms after
  const r = build();
  const ev = { id: 5, kind: 'lancer', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'stalk', telegraph: null, lanceTick: -1 };
  const at = {};
  for (let k = 1; k <= 160; k++) {
    if (k === 30) Object.assign(ev, { mode: 'aim', telegraph: { kind: 'lane', startTick: 30, resolveTick: 84, dirX: 0, dirZ: 1, length: 7, width: 0.8 } });
    if (k === 84) Object.assign(ev, { mode: 'stalk', telegraph: null, lanceTick: 84 });
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    at[k] = { reform: r.lab.pose().reform, aim: r.lab.pose().aim, visible: r.lab.parts.spear.visible, z: r.lab.parts.spear.position.z };
  }
  check('lancer: the spear brightens as it aims (the tell)', at[75].aim > 0.9 && at[20].aim < 0.05, { rest: r3(at[20].aim), aim: r3(at[75].aim) });
  check('lancer: the spear is gone from the hand on the throw', !at[88].visible && at[88].reform === 0, at[88]);
  check('lancer: the spear reforms in the hand by 0.7 s', at[130].visible && at[130].reform === 1, at[130]);
}
function OWN_geode(build) {
  // the fists leave the floor in the coil (no weight) and land ahead on the
  // slam; the crystal flares
  const r = build();
  const ev = { id: 6, kind: 'geode', x: 0, z: 0, px: 0, pz: 0, hp: 60, maxHp: 60, state: 'active', mode: 'march', telegraph: null, slamTick: -1 };
  const at = {};
  for (let k = 1; k <= 200; k++) {
    if (k === 30) Object.assign(ev, { mode: 'slam', telegraph: { kind: 'ring', startTick: 30, resolveTick: 90, x: 0, z: 0.9, radius: 1.5 } });
    if (k === 90) Object.assign(ev, { mode: 'march', telegraph: null, slamTick: 90 });
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const f = r.lab.feet();
    const hi = f[2].drawnY >= f[3].drawnY ? f[2] : f[3];
    at[k] = { fistY: hi.drawnY, fistZ: hi.drawnZ, planted: hi.planted, glow: r.lab.pose().glow, em: r.lab.parts.knuckles.material.emissiveIntensity };
  }
  check('geode: a fist is hauled up off the floor through the coil, carrying no weight', at[80].fistY > 0.8 && !at[80].planted, at[80]);
  check('geode: the fist lands ahead on the slam', at[91].fistY < 0.2 && at[91].fistZ > 0.8, at[91]);
  check('geode: the crystal flares through the coil', at[80].em > at[20].em + 0.4 && at[80].glow > 0.9, { rest: r3(at[20].em), coil: r3(at[80].em) });
  check('geode: the fists are back under it after the slam', at[190].fistZ < 0.65 && at[190].fistY < 0.2, at[190]);
}
function OWN_censer(build) {
  // the halo widens and the coals flare in the gather; the mend bursts the
  // halo; a spill gutters the coals and drops the pot; the pendulum trails
  // the travel
  const r = build();
  const ev = { id: 7, kind: 'censer', x: 0, z: 0, px: 0, pz: 0, hp: 14, maxHp: 14, state: 'active', mode: 'drift', gatherUntil: 0, mendTick: -1, status: null };
  const at = {};
  for (let k = 1; k <= 200; k++) {
    if (k === 30) Object.assign(ev, { mode: 'gather', gatherUntil: 78 });
    if (k === 78) Object.assign(ev, { mode: 'drift', mendTick: 78 });
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    at[k] = { halo: r.lab.parts.halo.scale.x, coal: r.lab.pose().coal, haloA: r.lab.parts.halo.material.opacity };
  }
  check('censer: the coals flare and the halo widens through the gather', at[75].coal > 0.9 && at[75].halo > 1.3 && at[20].halo < 1.05, { rest: r3(at[20].halo), gather: r3(at[75].halo) });
  check('censer: the halo bursts wide on the mend', at[79].halo > 1.7, r3(at[79].halo));
  check('censer: the halo blinks dark after the mend, then comes back', at[90].haloA < 0.35 && at[190].haloA > 0.4, { blink: r3(at[90].haloA), after: r3(at[190].haloA) });
  const rs = build();
  const es = { ...ev, mode: 'drift', gatherUntil: 0, mendTick: -1, status: null };
  const sp = {};
  for (let k = 1; k <= 140; k++) {
    if (k === 30) Object.assign(es, { mode: 'gather', gatherUntil: 78 });
    if (k === 50) Object.assign(es, { mode: 'drift', status: { stun: { untilTick: 200 } } });
    rs.setYaw(0);
    rs.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: es });
    sp[k] = { coal: rs.lab.pose().coal, drop: rs.lab.pose().drop, struck: !!rs.lab.lastStrike };
  }
  check('censer: a spill gutters the coals and drops the pot, and never mends', sp[60].coal < -0.15 && sp[60].drop > 0.04 && !sp[139].struck, sp[60]);
}
function OWN_bloom(build) {
  // rooted it sinks onto its roots, driven in with a jolt; the petals open
  // through the coil and shut on the pulse; its base is the floor
  const r = build();
  const ev = { id: 8, kind: 'bloom', x: 0, z: 0, px: 0, pz: 0, hp: 34, maxHp: 34, state: 'active', mode: 'creep', telegraph: null, rootTick: -1, pulseTick: -1 };
  const at = {};
  let baseMin = 0;
  let baseMax = 0;
  for (let k = 1; k <= 240; k++) {
    if (k === 40) Object.assign(ev, { mode: 'rooted', rootTick: 40 });
    if (k === 120) ev.telegraph = { kind: 'ring', startTick: 120, resolveTick: 174, x: 0, z: 0, radius: 2.3 };
    if (k === 174) Object.assign(ev, { telegraph: null, pulseTick: 174 });
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const p = r.lab.pose();
    at[k] = { sink: p.sink, open: p.openNow, knotY: r.lab.parts.body.position.y };
    const b = r.lab.base();
    baseMin = Math.min(baseMin, b);
    baseMax = Math.max(baseMax, b);
  }
  check('bloom: rooted, the knot sinks onto its roots (a jolt as they drive in)', at[43].knotY < at[30].knotY - 0.04 && at[110].sink > 0.95, { creep: r3(at[30].knotY), jolt: r3(at[43].knotY), sink: r3(at[110].sink) });
  check('bloom: the petals open through the coil and shut on the pulse', at[165].open > 0.85 && at[176].open < 0.1 && at[100].open < 0.15, { rest: r3(at[100].open), coil: r3(at[165].open), pulse: r3(at[176].open) });
  check('bloom: its base stays on the floor (a legless form: the root tips)', baseMin > -0.001 && baseMax < 0.001, { min: r3(baseMin), max: r3(baseMax) });
}
function OWN_siphon(build) {
  // the tendrils are drawn up to cast and flung on the lash; drinking, a gulp
  // on every drain
  const r = build();
  const ev = { id: 9, kind: 'siphon', x: 0, z: 0, px: 0, pz: 0, hp: 20, maxHp: 20, state: 'active', mode: 'drift', telegraph: null, castTick: -1, nextDrainTick: 0 };
  const at = {};
  let gulps = 0;
  let last = 9;
  for (let k = 1; k <= 260; k++) {
    if (k === 30) Object.assign(ev, { mode: 'cast', telegraph: { kind: 'lane', startTick: 30, resolveTick: 84, dirX: 0, dirZ: 1, length: 5.4, width: 0.7 } });
    if (k === 84) Object.assign(ev, { mode: 'drink', telegraph: null, castTick: 84, nextDrainTick: 114 });
    if (k === 114) ev.nextDrainTick = 144;
    if (k === 144) ev.nextDrainTick = 174;
    if (k === 200) ev.mode = 'drift';
    r.setYaw(0);
    r.pose({ t: k / 60, tick: k, walkPhase: 0, moveK: 0, lungeK: 0, telegraphK: 0, fireK: 0, e: ev });
    const p = r.lab.pose();
    const tip = r.points.tip.position;
    at[k] = { draw: p.draw, whip: p.whip, tipZ: tip.z, tipY: tip.y, drink: p.drink };
    if (k > 90 && r.lab.gulp < last) gulps++;
    last = r.lab.gulp;
  }
  check('siphon: the tendrils are drawn up and back to cast', at[75].draw > 0.9 && at[75].tipZ < at[20].tipZ - 0.2, { rest: r3(at[20].tipZ), cast: r3(at[75].tipZ) });
  check('siphon: the tendrils are flung out forward on the lash', at[85].whip > 0.9 && at[85].tipZ > at[20].tipZ + 0.3, { rest: r3(at[20].tipZ), lash: r3(at[85].tipZ) });
  check('siphon: it drinks with the tendrils reaching, a gulp on each drain', at[170].drink > 0.9 && gulps >= 2, { drink: r3(at[170].drink), gulps });
}
