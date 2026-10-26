#!/usr/bin/env node
// VFX AND HIT FEEDBACK probe, Part 1 (v0.5.333) — headless Node, a stub DOM;
// no browser. THE HIT AND THE KILL (docs/HIT_FEEDBACK.md, VFX_HIT_RULES §6.2
// a-e) is render and audio only. This probe drives the real render layers
// through a hitstop and checks:
//   1. the render hold: a hitstop holds the rig clock from the frame after
//      the hit for its ticks, never more than 4 ticks, never backwards;
//   2. the hit reaction envelope (R2-R5): the curves, then every foe,
//      champion and boss rig in the data built, wrapped and measured, a hit
//      squashing it with its base on the floor, bosses at half and never
//      hopping, ropes and coils on their own axes, all back at rest;
//   3. the foe layer through a hitstop: the squash holds while the tick is
//      frozen, a push hops the body and lands it, a spell's flash fades, the
//      kill swells then pops, held by the freeze, thrown along the hit;
//   4. the contact and the kill on the effect layer: the white bloom held at
//      full strength 100 ms, the class flare held, the kill's bloom and
//      flare held 117 ms, its ring gone by 0.22 s and drawn under the floor
//      warnings, its burst waiting for the swell and leaning along the hit,
//      a magic hit's streaks leaving through the far side;
//   5. numbers (N1-N3): the arc alternates sides, your own pop white, hold
//      through the freeze, settle to Hearth Amber in 0.1 s; crits 1.55x with
//      CRIT! in all ten languages; others' Bone, heals Bright Heal, never
//      white;
//   6. audio: the kill's rumble after the pop, under a second; the first
//      impact of a tick is marked to skip the frame budget;
//   7. colour: nothing new draws in Ember, Bright Heal or Violet.
//
//   node tools/vfx-hit-feedback-probe.mjs
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';

// --- a stub DOM: enough for canvases, the numerals' divs and their styles. --
const grad = { addColorStop() {} };
const ctx2d = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
function el(tag = 'div') {
  const vars = new Map();
  const node = {
    tagName: tag.toUpperCase(),
    width: 0,
    height: 0,
    id: '',
    className: '',
    textContent: '',
    offsetWidth: 0,
    children: [],
    dataset: {},
    style: { setProperty: (k, v) => vars.set(k, String(v)), removeProperty: (k) => vars.delete(k), getPropertyValue: (k) => vars.get(k) ?? '' },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    getContext: () => ctx2d,
    appendChild(c) {
      node.children.push(c);
      c.parentNode = node;
      return c;
    },
    remove() {
      if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
  };
  return node;
}
globalThis.document = { createElement: el, body: el('body'), head: el('head'), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: el('html') };
globalThis.location = { search: '', hash: '', href: 'http://localhost/' };
globalThis.window = globalThis;
globalThis.innerWidth = 1600;
globalThis.innerHeight = 900;

const { Scene, PerspectiveCamera, Vector3, Group } = await import('three');
const { createEventBus } = await import('../src/core/events.js');
const { createCosmeticRng } = await import('../src/core/rng.js');
const { HITSTOP, TICK_HZ } = await import('../src/core/constants.js');
const { PALETTE } = await import('../src/data/palette.js');
const { wireRenderHold, markRenderHold, frameRenderHold, renderHold, resetRenderHold, HOLD_CAP } = await import('../src/render/hold.js');
const { REACT, squashCurve, hopCurves, hitProfile, createEnvClock, hitNode, measureBody, createReaction, armReaction, settleReaction, evalReaction, writeReaction, resetNode } = await import('../src/render/react.js');
const { createEnemyLayer } = await import('../src/render/enemies/index.js');
const { createBossLayer } = await import('../src/render/boss/index.js');
const { createSignatureFx } = await import('../src/render/vfx/signature.js');
const { createVfxKit, KIT_CAPS } = await import('../src/render/vfx/kit.js');
const { setImpactFx } = await import('../src/render/vfx/hub.js');
const { createNumberPool, updateNumberPools, NUMERAL_WHO, NUMERAL_FEEL, numeralArc, numeralLook } = await import('../src/render/numbers.js');
const { SPELL_FLASH, spellFlashLevel, vfxSpellHit, vfxTemplateFor, VFX_HEAL_SKILLS, CLASS_TEMPLATE } = await import('../src/data/vfx.js');
const { ENEMY_KINDS } = await import('../src/sim/enemies.js');
const { BOSS_KINDS } = await import('../src/sim/boss.js');
const { CHAMPION_IDS } = await import('../src/sim/champions.js');
const { FRAME_BUDGET } = await import('../src/audio/engine.js');
const { createDryKit } = await import('../src/audio/voices.js');
const { VERSION } = await import('../src/version.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;
// The render hold is a module singleton wired to one bus, as in the game:
// each section relays its own bus's hitstops to it.
const holdBus = createEventBus();
wireRenderHold(holdBus);
const relayHold = (bus) => {
  bus.on('hitstop', (ev) => holdBus.emit(ev.tick, 'hitstop', { ticks: ev.ticks, cause: ev.cause }));
  bus.on('state_restored', () => holdBus.emit(0, 'state_restored', {}));
};
const cmp = (a, b) => a.split('.').map(Number).reduce((s, v, i) => s || v - b.split('.').map(Number)[i], 0);
check('the version is 0.5.333 or later', cmp(VERSION, '0.5.333') >= 0, VERSION);

// --- 1. the render hold -------------------------------------------------------
{
  resetRenderHold();
  const bus = createEventBus();
  relayHold(bus);
  let t = 10;
  const frame = () => {
    t += DT;
    frameRenderHold(t, DT);
    return { paid: renderHold.paid, time: renderHold.time(t), rig: renderHold.rigDt(DT) };
  };
  frame();
  bus.emit(100, 'hitstop', { ticks: HITSTOP.meleeTicks ?? 2, cause: 'melee' });
  const f0 = frame(); // the hit's own frame still plays
  const f1 = frame();
  const f2 = frame();
  const f3 = frame();
  const melee = (HITSTOP.meleeTicks ?? 2) / TICK_HZ;
  check('the hit frame plays, then the hold pays the freeze', f0.paid === 0 && Math.abs(f1.paid + f2.paid - melee) < 1e-9 && f3.paid === 0, { f0: f0.paid, f1: r3(f1.paid), f2: r3(f2.paid), f3: f3.paid });
  check('a rig stands still while the hold pays', f1.rig === 0 && f2.rig === 0 && f3.rig > 0);
  check('the held clock never runs backwards', f1.time >= f0.time && f2.time >= f1.time && f3.time > f2.time);
  bus.emit(200, 'hitstop', { ticks: 3 });
  bus.emit(200, 'hitstop', { ticks: 3 });
  frame();
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += frame().paid;
  check('no window holds more than 4 ticks', Math.abs(sum - HOLD_CAP) < 1e-9 && Math.abs(HOLD_CAP - 4 / 60) < 1e-9, r3(sum));
  bus.emit(300, 'hitstop', { ticks: 2 });
  bus.emit(300, 'state_restored', {});
  frame();
  check('a restored save drops a pending hold', frame().paid === 0);
  // Solo and host: the hold pays the frozen ticks the clock really consumed,
  // at any frame rate. At 20 fps a kill's 3 ticks: 2 frozen inside the hit
  // frame, 1 in the next (with 2 live ticks).
  resetRenderHold();
  const step = (dt, before, after, grant = 0) => {
    markRenderHold();
    if (grant) bus.emit(400, 'hitstop', { ticks: grant, cause: 'kill' });
    t += dt;
    frameRenderHold(t, dt, before, after);
    return { paid: renderHold.paid, rig: renderHold.rigDt(dt) };
  };
  const s0 = step(0.05, 0, 1, 3);
  const s1 = step(0.05, 1, 0);
  const s2 = step(0.05, 0, 0);
  check('solo and host: the hold matches the frozen ticks the clock consumed at 20 fps', Math.abs(s0.paid - 2 / 60) < 1e-9 && Math.abs(s0.rig - 1 / 60) < 1e-9 && Math.abs(s1.paid - 1 / 60) < 1e-9 && s2.paid === 0, { s0, s1, s2 });
  const g0 = step(DT, 0, 2, 2); // the hit frame at 60 fps: granted, nothing frozen yet
  const g1 = step(DT, 2, 1);
  const g2 = step(DT, 1, 0);
  check('solo and host at 60 fps: the hit frame plays, the next two hold', g0.paid === 0 && g1.rig === 0 && g2.rig === 0);
  markRenderHold();
  bus.emit(500, 'state_restored', {});
  t += DT;
  frameRenderHold(t, DT, 0, 0);
  check('solo and host: a restore never pays a bogus hold', renderHold.paid === 0);
  resetRenderHold();
  // The flare a hit makes holds as long as the rigs at any frame rate and
  // wherever the hit falls in its frame (a kill: 3 ticks).
  const kit = createVfxKit({ stage: { scene: new Scene(), camera: new PerspectiveCamera() }, cosmetic: createCosmeticRng() });
  const runs = [];
  for (const fps of [60, 30, 20, 15]) {
    const n = 60 / fps;
    for (let j = 0; j < n; j++) {
      resetRenderHold();
      kit.clear?.();
      let pending = 0;
      let slot = null;
      let rig = 0;
      let wall = 0;
      for (let f = 0; f < 6; f++) {
        const before = pending;
        markRenderHold();
        for (let k = 0; k < n; k++) {
          if (pending > 0) pending -= 1;
          else if (f === 1 && k === j) {
            pending += 3;
            holdBus.emit(700, 'hitstop', { ticks: 3, cause: 'kill' });
            slot = kit.flash({ x: 0, z: 0, life: 1 });
          }
        }
        t += 1 / fps;
        frameRenderHold(t, 1 / fps, before, pending);
        kit.update(1 / fps, renderHold);
        if (f >= 1) rig += renderHold.paid;
        if (slot) wall += 1 / fps;
      }
      runs.push({ fps, j, rig: r3(rig), flare: r3(wall - slot.age) });
    }
  }
  check('a hit\'s flare holds with the rigs at 60, 30, 20 and 15 fps', runs.every((r) => Math.abs(r.rig - 3 / 60) < 2e-3 && Math.abs(r.flare - r.rig) < 2e-3), runs.filter((r) => Math.abs(r.flare - r.rig) >= 2e-3));
  check('the flash pool keeps room for two flashes a hit', KIT_CAPS.flash >= 64, KIT_CAPS.flash);
  resetRenderHold();
}

// --- 2. the hit reaction envelope --------------------------------------------
{
  const L = REACT.light;
  const curve = [];
  for (let a = 0; a <= 40; a++) curve.push(squashCurve(a, L));
  check('R2: a hard cut to full squash, held, then a stretch back to rest', curve[0] === 1 && curve[2] === 1 && Math.min(...curve) < -0.2 && Math.abs(curve[40]) < 0.01, curve.slice(0, 12).map(r3));
  const plain = hitProfile({ delivery: 'basic', shape: 'melee' });
  const crit = hitProfile({ delivery: 'basic', shape: 'melee', crit: true });
  const burn = hitProfile({ delivery: 'skill', shape: 'burn' });
  const big = hitProfile({ delivery: 'basic', shape: 'melee' }, { big: true });
  const shot = hitProfile({ delivery: 'basic', shape: 'projectile' });
  const heavy = hitProfile({ delivery: 'skill', shape: 'aoe' });
  check('a crit squashes more, a burn barely, a boss at half', crit.amp > plain.amp && Math.abs(burn.amp - REACT.heavy.amp * REACT.softMul) < 1e-9 && Math.abs(big.amp - plain.amp * REACT.bigMul) < 1e-9);
  check('a shot is wider and less short, a skill heavier', shot.p.hK === REACT.shot.hK && shot.p.amp === REACT.shot.amp && heavy.p === REACT.heavy && heavy.amp > plain.amp);
  const hc = [];
  for (let i = 1; i < 20; i++) hc.push(hopCurves(i / 20));
  const peakAt = hc.reduce((b, c, i) => (c.lift > hc[b].lift ? i : b), 0) + 1;
  check('R4: the hop peaks early, tilts back then forward, stretches in the air', Math.abs(peakAt / 20 - REACT.hopPeak) < 0.08 && Math.max(...hc.map((c) => c.tilt)) > 0.9 && Math.min(...hc.map((c) => c.tilt)) < 0 && Math.max(...hc.map((c) => c.air)) > 0.9);
  const clock = createEnvClock();
  const seq = [clock.step(10, 0.2), clock.step(10, 0.9), clock.step(10, 0.1), clock.step(11, 0.5), clock.step(2, 0)];
  check('the envelope clock holds through a frozen tick and restarts on a new run', seq[1] > seq[0] && seq[2] === seq[1] && seq[3] > seq[2] && seq[4] < seq[3], seq.map(r3));

  // Every rig in the data: built, wrapped, measured; a hit squashes it with
  // its base on the floor; it comes back to rest.
  const layerStage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const cos = createCosmeticRng();
  const foeKinds = [...ENEMY_KINDS];
  const bad = [];
  const floating = [];
  const checkRig = (kind, node, body, st, label) => {
    const out = {};
    armReaction(st, { tick: 10, delivery: 'basic', shape: 'melee', dirX: 1, dirZ: 0, kb: 0 }, { radius: 0.4 });
    writeReaction(node, st, evalReaction(st, 10, out), body, 1);
    const m = node.matrix.elements;
    const sx = Math.hypot(m[0], m[1], m[2]);
    const sy = Math.hypot(m[4], m[5], m[6]);
    const sz = Math.hypot(m[8], m[9], m[10]);
    // The pivot stays put: a standing body keeps its base on the floor.
    const p = new Vector3(0, body.pivot, 0).applyMatrix4(node.matrix);
    const ok = m.every(Number.isFinite) && Math.abs(p.y - body.pivot) < 1e-6;
    let shape;
    if (st.rope) shape = sy === 1 && sx > 1;
    else if (st.coil) shape = sx === 1 && sz === 1 && sy < 1;
    else shape = sx > 1 && sy < 1;
    writeReaction(node, st, evalReaction(st, 60, out), body, 1);
    const rest = node.matrix.equals(new (node.matrix.constructor)());
    if (!ok || !shape || !rest || !(body.height > 0)) bad.push({ kind: label, ok, shape, rest, h: r3(body.height) });
    if (body.floats) floating.push(label);
  };
  // Foes and champions through the layer's own builders (one layer, one
  // rig per kind spawned at once).
  const foeBus = createEventBus();
  const ents = foeKinds.map((kind, i) => ({ id: 1000 + i, kind, x: i * 3, z: 0, px: i * 3, pz: 0, hp: 10, maxHp: 10, radius: 0.35, faceX: 0, faceZ: 1, champion: CHAMPION_IDS.includes(kind) ? kind : undefined }));
  const foeWorld = { tick: 5, entities: () => ents, pendingSpawns: () => [], roomState: {} };
  const foeLayer = createEnemyLayer({ stage: layerStage, world: foeWorld, bus: foeBus, cosmetic: cos });
  foeLayer.update(1, 0.5);
  const rigsByKind = new Map();
  layerStage.scene.traverse((o) => {
    if (o.name === 'hit-react' && o.parent) rigsByKind.set(o.parent, o);
  });
  const wrapped = [...rigsByKind.values()];
  check('every foe and champion kind builds a rig with its hit node over the body', wrapped.length >= foeKinds.length && wrapped.every((n) => n.children.length > 0 && n.parent.children[0] === n), { kinds: foeKinds.length, wrapped: wrapped.length });
  // A hit on each through the layer's own bus: every rig reacts.
  foeWorld.tick = 6;
  for (const e of ents) foeBus.emit(6, 'hit', { target: e.id, kind: e.kind, attacker: null, amount: 1, delivery: 'basic', shape: 'melee', kb: 0, dirX: 1, dirZ: 0, x: e.x, z: 0 });
  foeLayer.update(1.02, 0.5);
  const dbg = foeLayer.debugState().react ?? {};
  const flat = ents.filter((e) => !(dbg[e.id] && dbg[e.id].q > 0 && (dbg[e.id].sy < 1 || dbg[e.id].sx > 1))).map((e) => e.kind);
  check(`every foe and champion rig reacts to a hit through the layer (${foeKinds.length} kinds)`, Object.keys(dbg).length === foeKinds.length && flat.length === 0, flat);
  // R5 on the body as the sim makes it (a champion carries its id).
  const champAmps = ents.filter((e) => e.champion).map((e) => dbg[e.id]?.amp);
  const plainAmp = dbg[ents.find((e) => e.kind === 'boar').id]?.amp;
  check(`R5: all ${CHAMPION_IDS.length} champions squash at half through the layer`, champAmps.length === CHAMPION_IDS.length && champAmps.every((a) => Math.abs(a - plainAmp * REACT.bigMul) < 1e-9), { champAmps, plainAmp });
  for (const [i, kind] of foeKinds.entries()) {
    const group = [...rigsByKind.keys()].find((g) => g.position.x === i * 3);
    if (!group) {
      bad.push({ kind, missing: true });
      continue;
    }
    const node = rigsByKind.get(group);
    const champion = CHAMPION_IDS.includes(kind);
    checkRig(kind, node, measureBody(kind, node), createReaction(kind, { champion }), kind);
  }
  // Bosses through the boss layer (one boss at a time, as the game has).
  const bossStage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const bossBus = createEventBus();
  let bossEnt = null;
  const bossWorld = { tick: 5, entities: () => (bossEnt ? [bossEnt] : []), pendingSpawns: () => [], roomState: {} };
  const bossLayer = createBossLayer({ stage: bossStage, world: bossWorld, bus: bossBus, cosmetic: cos });
  let bossesWrapped = 0;
  for (const [i, kind] of BOSS_KINDS.entries()) {
    bossEnt = { id: 5000 + i, kind, boss: true, x: 0, z: 0, px: 0, pz: 0, hp: 100, maxHp: 100, radius: 1, faceX: 0, faceZ: 1 };
    bossLayer.update(2 + i, 0.5);
    let node = null;
    bossLayer.root.traverse((o) => {
      if (o.name === 'hit-react' && o.parent?.visible !== false && o.parent?.parent === bossLayer.root && !node) node = o;
    });
    if (!node) {
      bad.push({ kind, missing: true });
      continue;
    }
    bossesWrapped += 1;
    if (kind === 'wyrm') {
      // The layer measures a boss after its first pose: the faceted Wyrm's
      // coil lies on the floor, so it squashes from the floor.
      const lb = measureBody('boss:wyrm', node);
      check('the Barrow Wyrm (faceted) is measured posed: its coil squashes from the floor', lb.floats === false && lb.pivot === 0, { minY: r3(lb.minY), floats: lb.floats });
    }
    checkRig(kind, node, measureBody(`probe:${kind}`, node), createReaction(kind, { boss: true }), `boss:${kind}`);
    resetNode(node);
  }
  check('every boss kind builds a rig with its hit node', bossesWrapped === BOSS_KINDS.length, { bosses: BOSS_KINDS.length, wrapped: bossesWrapped });
  check(`R2-R5 on all ${foeKinds.length} foe and champion kinds and ${BOSS_KINDS.length} bosses: squashed on the floor, ropes and coils on their axes, back at rest`, bad.length === 0, bad.slice(0, 6));
  check('floating bodies (moths, wisps, censers) squash about their middle', ['moth', 'gravewisp', 'censer'].every((k) => floating.includes(k)), floating);
  // R5: a boss at half, never hopping; a champion's small push still hops.
  const bossSt = createReaction('stag', { boss: true });
  armReaction(bossSt, { tick: 10, delivery: 'basic', shape: 'melee', dirX: 1, dirZ: 0, kb: 0.5 }, { radius: 1 });
  const footSt = createReaction('boar');
  armReaction(footSt, { tick: 10, delivery: 'basic', shape: 'melee', dirX: 1, dirZ: 0, kb: 0.5 }, { radius: 0.4 });
  const champSt = createReaction('briar_knight', { champion: true });
  armReaction(champSt, { tick: 10, delivery: 'skill', shape: 'aoe', dirX: 1, dirZ: 0, kb: 0.6 }, { radius: 0.5 });
  settleReaction(champSt, { kbScale: 0.15 }, 11);
  settleReaction(footSt, { kbScale: 1 }, 11);
  check('R5: a boss squashes at half and never hops', bossSt.hop === null && Math.abs(bossSt.amp - footSt.amp * REACT.bigMul) < 1e-9);
  const lifts = [];
  for (let k = 11; k < 30; k++) lifts.push(evalReaction(footSt, k, {}).lift);
  check('R4: a pushed foe hops and lands', Math.max(...lifts) > 0.5 && lifts[lifts.length - 1] === 0);
  check('R5: a champion\'s small push still hops, smaller', champSt.hop && champSt.hop.dist < REACT.pushRef * 0.3 && champSt.hop.dist >= REACT.minPush);
  // A burn tick under a skill's blow never cuts the blow's squash.
  const blow = createReaction('boar');
  armReaction(blow, { tick: 10, delivery: 'skill', shape: 'aoe', dirX: 1, dirZ: 0, kb: 0 }, {});
  const qBlow = evalReaction(blow, 12, {}).q;
  armReaction(blow, { tick: 12, delivery: 'skill', shape: 'burn', dirX: 1, dirZ: 0, kb: 0 }, {});
  const qAfter = evalReaction(blow, 12, {}).q;
  check('a burn or aura tick never cuts a stronger squash', Math.abs(qAfter - qBlow) < 1e-9 && qBlow > 0.15, { qBlow: r3(qBlow), qAfter: r3(qAfter) });
  // A shot's hop is a fraction of the body's height in the world: an elite
  // (x1.2) hops 1.2 x as high as a plain one.
  const shotLift = (b) => {
    const st = createReaction('boar');
    armReaction(st, { tick: 10, delivery: 'basic', shape: 'projectile', dirX: 1, dirZ: 0, kb: 0.34 }, { radius: 0.4 });
    settleReaction(st, { kbScale: 1 }, 11);
    const node = new Group();
    node.matrixAutoUpdate = false;
    writeReaction(node, st, evalReaction(st, 13, {}), { pivot: 0, height: 0.8 }, b);
    return node.matrix.elements[13] * b; // back to world units
  };
  check('R4: a shot\'s hop scales with the body (elites and splitlings)', Math.abs(shotLift(1.2) / shotLift(1) - 1.2) < 1e-6 && shotLift(1) > 0, { plain: r3(shotLift(1)), elite: r3(shotLift(1.2)) });
  const gar = createReaction('gargoyle');
  armReaction(gar, { tick: 10, delivery: 'basic', shape: 'melee', dirX: 1, dirZ: 0, kb: 0.5 }, {});
  settleReaction(gar, { kbScale: 0 }, 11);
  check('R4: no push, no hop (a stone Gargoyle, kbScale 0)', gar.hop === null);
}

// --- 3. the foe layer through a hitstop ---------------------------------------
{
  resetRenderHold();
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const bus = createEventBus();
  relayHold(bus);
  const foe = { id: 7, kind: 'boar', x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, radius: 0.4, faceX: 0, faceZ: 1, kbScale: 1 };
  const healer = { id: 1, kind: 'player', classId: 'healer', x: -2, z: 0, px: -2, pz: 0 };
  let ents = [foe, healer];
  const world = { tick: 10, entities: () => ents, pendingSpawns: () => [], roomState: {} };
  const layer = createEnemyLayer({ stage, world, bus, cosmetic: createCosmeticRng() });
  let t = 1;
  const frame = (alpha = 0.5) => {
    t += DT;
    frameRenderHold(t, DT);
    layer.update(t, alpha);
    return layer.debugState();
  };
  for (let i = 0; i < 3; i++) frame();
  // A melee hit lands on tick 11 with a push, then the sim freezes 2 ticks.
  world.tick = 11;
  bus.emit(11, 'hit', { target: 7, kind: 'boar', attacker: 1, amount: 5, delivery: 'basic', shape: 'melee', kb: 0.5, dirX: 1, dirZ: 0, x: 0, z: 0 });
  bus.emit(11, 'hitstop', { ticks: 2, cause: 'melee' });
  const s0 = frame(0).react[7];
  const held = [frame(0.5).react[7], frame(0.9).react[7]];
  check('the squash holds full while the freeze holds the tick', s0.q > 0.1 && held.every((h) => h.q === s0.q && h.lift === 0), { q0: s0.q, held: held.map((h) => h.q) });
  const lifts = [];
  for (let k = 12; k < 34; k++) {
    world.tick = k;
    foe.px = foe.x;
    foe.x += k < 18 ? 0.08 : 0;
    lifts.push(frame(0.5).react[7].lift ?? 0);
  }
  check('after the freeze the push hops the body and lands it', Math.max(...lifts) > 0.2 && lifts[lifts.length - 1] === 0, lifts.map(r3).slice(0, 16));
  // R1: a spell hit (the Healer's basic is magic) flashes, holds, fades.
  const healerMagic = vfxTemplateFor('healer') === 'magic';
  world.tick = 40;
  bus.emit(40, 'hit', { target: 7, kind: 'boar', attacker: 1, amount: 5, delivery: 'basic', shape: 'projectile', kb: 0, dirX: 1, dirZ: 0, x: foe.x, z: 0 });
  frame();
  const flashAt = (tk) => {
    world.tick = tk;
    frame();
    return layer.debugState().react[7].spell;
  };
  const fl = [41, 44, 46, 50, 60, 70, 75].map(flashAt);
  check('R1: a spell hit holds its flash 5 ticks, then fades it out', healerMagic && fl[0] === 1 && fl[1] === 1 && fl[2] < 1 && fl[3] > fl[4] && fl[4] > fl[5] && fl[6] === 0, fl.map(r3));
  check('R1: the curve: hold 5 ticks, fade over 27', spellFlashLevel(0) === 1 && spellFlashLevel(SPELL_FLASH.holdTicks - 1) === 1 && spellFlashLevel(SPELL_FLASH.holdTicks + SPELL_FLASH.fadeTicks) === 0 && spellFlashLevel(SPELL_FLASH.holdTicks + 10) < 0.5);
  // Which hits are spells: magic templates, never heals, never on the party.
  const archer = { kind: 'ally', classId: 'archer' };
  const sword = { kind: 'ally', classId: 'swordsman' };
  const magicCls = Object.keys(CLASS_TEMPLATE).filter((c) => vfxTemplateFor(c) === 'magic');
  check('a spell is a magic hero\'s hit, never a blade or a shot, a heal or a hit on the party', magicCls.length > 0 && magicCls.every((c) => vfxSpellHit({ delivery: 'basic', kind: 'boar' }, { kind: 'ally', classId: c })) && !vfxSpellHit({ delivery: 'basic', kind: 'boar' }, sword) && !vfxSpellHit({ delivery: 'basic', kind: 'player' }, { kind: 'ally', classId: magicCls[0] }) && !vfxSpellHit({ delivery: 'skill', skill: [...VFX_HEAL_SKILLS][0], source: [...VFX_HEAL_SKILLS][0], kind: 'boar' }, { kind: 'player', classId: 'healer' }) && vfxTemplateFor(archer.classId) !== 'magic' ? !vfxSpellHit({ delivery: 'basic', kind: 'boar' }, archer) : true, magicCls);
  // K2/K4: the kill swells round, then pops; the freeze holds it; it flies
  // along the last hit.
  world.tick = 80;
  bus.emit(80, 'hit', { target: 7, kind: 'boar', attacker: 1, amount: 9, delivery: 'basic', shape: 'melee', kb: 0.5, dirX: 0, dirZ: 1, x: foe.x, z: 0 });
  bus.emit(80, 'death', { id: 7, kind: 'boar', delivery: 'basic', x: foe.x, z: 0 });
  bus.emit(80, 'hitstop', { ticks: 3, cause: 'kill' });
  ents = [healer];
  const k0 = frame().kills;
  const kills = [k0[0]];
  for (let i = 0; i < 14; i++) {
    world.tick = 81 + Math.max(0, i - 3);
    kills.push(frame().kills[0] ?? null);
  }
  const ages = kills.map((k) => (k ? k.age : null));
  const swell = kills.filter(Boolean).map((k) => k.sx);
  check('K2: the kill holds on its frame through the freeze (3 ticks)', ages[1] === ages[0] && ages[2] === ages[1] && ages[3] === ages[2] && ages[4] > ages[3], ages.slice(0, 6).map(r3));
  check('K2: then a round swell before the flat pop, flat on the floor even tipped', Math.max(...swell) > 1.2 && kills.filter(Boolean).some((k) => k.sy < 0.1), { swell: swell.map(r3).slice(0, 10), sy: kills.filter(Boolean).map((k) => r3(k.sy)) });
  const lastKill = kills.filter(Boolean).pop();
  check('K4: the body flies along the killing hit', lastKill && lastKill.z > 0.1 && Math.abs(lastKill.x - foe.x) < 0.05, lastKill);
  // A body killed mid-hop comes down through the pop, not in one frame.
  for (let i = 0; i < 20; i++) frame();
  const foe2 = { id: 8, kind: 'boar', x: 4, z: 0, px: 4, pz: 0, hp: 10, maxHp: 10, radius: 0.4, faceX: 0, faceZ: 1, kbScale: 1 };
  ents = [foe2, healer];
  world.tick = 120;
  frame();
  bus.emit(120, 'hit', { target: 8, kind: 'boar', attacker: 1, amount: 3, delivery: 'basic', shape: 'melee', kb: 0.5, dirX: 1, dirZ: 0, x: 4, z: 0 });
  for (let k = 121; k <= 125; k++) {
    world.tick = k;
    foe2.px = foe2.x;
    foe2.x += 0.08;
    frame();
  }
  const liftBefore = layer.debugState().react[8].lift;
  bus.emit(125, 'hit', { target: 8, kind: 'boar', attacker: 1, amount: 9, delivery: 'basic', shape: 'melee', kb: 0.5, dirX: 1, dirZ: 0, x: foe2.x, z: 0 });
  bus.emit(125, 'death', { id: 8, kind: 'boar', delivery: 'basic', x: foe2.x, z: 0 });
  ents = [healer];
  const tys = [];
  for (let i = 0; i < 16; i++) tys.push(frame().kills.find((k) => k.ty !== undefined)?.ty ?? null);
  const live = tys.filter((v) => v !== null);
  check('a body killed mid-hop sinks through the pop instead of snapping down', liftBefore > 0.3 && live[0] > 0.2 && live.every((v, i) => i === 0 || v <= live[i - 1] + 1e-9) && live[live.length - 1] < 0.05, { liftBefore: r3(liftBefore), tys: live.map(r3) });
  resetRenderHold();
}

// --- 4. the contact and the kill on the effect layer ---------------------------
{
  resetRenderHold();
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const bus = createEventBus();
  relayHold(bus);
  const calls = [];
  let now = 0;
  setImpactFx({
    particles: { hit() {}, kill: (x, z, o) => calls.push({ at: now, o }), impact() {}, embers() {}, spray: (mode, x, y, z, n, o) => mode === 'shard' && calls.push({ at: now, shard: true, o }) },
    decals: { scorch() {}, spawn() {} },
  });
  const sword = { id: 2, kind: 'ally', classId: 'swordsman', faction: 'party', x: -1, z: 0, px: -1, pz: 0 };
  const healer = { id: 1, kind: 'player', classId: 'healer', faction: 'party', x: -2, z: 0, px: -2, pz: 0 };
  const foe = { id: 9, kind: 'boar', faction: 'hostile', x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
  const ents = [healer, sword, foe];
  const world = { tick: 10, entities: () => ents, player: healer, runSystem: null };
  const fx = createSignatureFx({ stage, world, bus, cosmetic: createCosmeticRng() });
  const frame = () => {
    now += DT;
    frameRenderHold(now, DT);
    fx.update(now);
  };
  frame();
  const sprites = () => {
    const out = [];
    stage.scene.traverse((o) => {
      if (o.isSprite && o.visible && o.material.opacity > 0.01) out.push(o);
    });
    return out;
  };
  // The bloom is the one flash this size (the class flashes are 0.3 to 0.46);
  // its colour is the kit's Parchment (checked in the source, section 7).
  // A basic hit from the Swordsman: the white bloom about 2 bw, held.
  bus.emit(10, 'hit', { target: 9, kind: 'boar', attacker: 2, amount: 5, delivery: 'basic', shape: 'melee', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0 });
  bus.emit(10, 'hitstop', { ticks: 2, cause: 'melee' });
  frame();
  const bloom0 = sprites().find((s) => s.scale.x >= 1.5);
  const op0 = bloom0?.material.opacity ?? 0;
  const ops = [];
  for (let i = 0; i < 12; i++) {
    frame();
    ops.push(bloom0?.visible ? bloom0.material.opacity : 0);
  }
  // Held 100 ms of effect time; the freeze adds its 2 ticks on top.
  const fullFor = ops.findIndex((o) => o < op0 - 1e-6);
  check('P3: a near-white bloom about 2 body widths across lands on the contact', !!bloom0 && bloom0.scale.x >= 1.5 && bloom0.scale.x <= 2.2, bloom0 ? r3(bloom0.scale.x) : null);
  check('L5: the bloom holds full strength 100 ms (more with the freeze), then fades', fullFor >= 6 && fullFor <= 10 && ops[ops.length - 1] < op0 * 0.5, { fullFor, ops: ops.map(r3) });
  // The kill: a bigger bloom held 117 ms, a ring gone by 0.22 s, the burst after the swell, leaning.
  for (let i = 0; i < 30; i++) frame();
  calls.length = 0;
  const killAt = now;
  bus.emit(20, 'hit', { target: 9, kind: 'boar', attacker: 2, amount: 9, delivery: 'basic', shape: 'melee', kb: 0.3, dirX: 0, dirZ: 1, x: 0, z: 0 });
  bus.emit(20, 'death', { id: 9, kind: 'boar', delivery: 'basic', x: 0, z: 0 });
  bus.emit(20, 'hitstop', { ticks: 3, cause: 'kill' });
  frame();
  // Twice the area: about 1.41 x the hit bloom's 1.6 u width.
  const kb = sprites().filter((s) => s.scale.x >= 2.2 && s.scale.x <= 2.6);
  check('K1: the kill\'s white bloom is twice a hit\'s area', kb.length > 0, kb.map((s) => r3(s.scale.x)));
  const ringOrders = [];
  stage.scene.traverse((o) => {
    if (o.visible && o.material?.uniforms?.uRadius) ringOrders.push(o.renderOrder);
  });
  const arcs0 = fx.kit.counts().arcs;
  for (let i = 0; i < 3 + 14; i++) frame(); // the freeze, then 0.233 s
  const arcs1 = fx.kit.counts().arcs;
  check('K1: the kill ring is drawn under the floor warnings and gone within 0.25 s', arcs0 > 0 && ringOrders.includes(0) && arcs1 === 0, { arcs0, ringOrders, arcs1 });
  for (let i = 0; i < 3; i++) frame();
  const burst = calls.find((c) => !c.shard);
  check('K2: the debris bursts after the swell (0.1 s held, plus the freeze)', !!burst && burst.at - killAt >= 0.1 + 3 / 60 - 1e-6 && burst.at - killAt <= 0.2, burst ? r3(burst.at - killAt) : null);
  check('P1: the kill burst leans along the killing hit', burst && burst.o.dir && burst.o.dir.z > 0.99 && burst.o.dirBias > 0 && burst.o.dirBias <= 0.3, burst?.o);
  const src = readFileSync(new URL('../src/render/vfx/signature.js', import.meta.url), 'utf8');
  const killFx = /const KILL_FX = Object\.freeze\(\{([^}]*)\}\)/.exec(src)?.[1] ?? '';
  const num = (k) => Number(new RegExp(`${k}: ([0-9.]+)`).exec(killFx)?.[1]);
  check('K1: the flare holds 117 ms (5 frames with the freeze), the ring lives 0.22 s under the floor warnings', num('flareHold') >= 0.1 && num('flareHold') <= 0.167 && num('ringLife') <= 0.25 && num('ringOrder') === 0, killFx.trim());
  // A magic hit leaves through the far side.
  const sparksBefore = fx.debugCounts().tpl;
  bus.emit(30, 'hit', { target: 9, kind: 'boar', attacker: 1, amount: 4, delivery: 'basic', shape: 'projectile', kb: 0, dirX: 1, dirZ: 0, x: 0, z: 0 });
  frame();
  const sparksAfter = fx.debugCounts().tpl;
  check('P1: a magic hit throws streaks out of the far side', (sparksAfter.sparks ?? 0) > (sparksBefore.sparks ?? 0), { before: sparksBefore.sparks, after: sparksAfter.sparks });
  setImpactFx(null);
  resetRenderHold();
}

// --- 5. numbers ---------------------------------------------------------------
{
  const cam = new PerspectiveCamera(50, 1600 / 900, 0.1, 100);
  cam.position.set(0, 12, 10);
  cam.lookAt(0, 0, 0);
  const pool = createNumberPool({ camera: cam, cosmetic: createCosmeticRng(), container: document.body });
  const live = () => pool.live();
  // A frame as main.js runs it at 60 fps: the clock's pending freeze before
  // and after its step, then the numbers.
  resetRenderHold();
  let nt = 50;
  const nframe = (before = 0, after = 0, grant = 0, dt = DT) => {
    markRenderHold();
    if (grant) holdBus.emit(800, 'hitstop', { ticks: grant, cause: 'melee' });
    nt += dt;
    frameRenderHold(nt, dt, before, after);
    updateNumberPools(dt);
  };
  pool.spawn({ x: 0, z: 0, amount: 12, kind: 'damage', crit: false, who: 'own', tick: 5 });
  pool.hold(5, 2);
  nframe(0, 2, 2);
  const n0 = live()[0];
  check('N1: your own numeral pops white', n0.color === PALETTE.parchment && n0.phase === 'pop', n0);
  // Held through the freeze: still white two frames on.
  nframe(2, 1);
  nframe(1, 0);
  const nHeld = live()[0];
  check('N1: the freeze holds the pop (size, white) while the arc runs on', nHeld.hold < 2 / 60 && nHeld.phase === 'pop' && nHeld.popAge < 0.03 && nHeld.age >= 0.05, nHeld);
  for (let i = 0; i < 8; i++) nframe();
  const nSet = live()[0];
  check('N1: settled to Hearth Amber within 0.1 s of held time', nSet.phase === 'settled' && nSet.color.toUpperCase() === PALETTE.hearthAmber.toUpperCase(), nSet);
  // At 20 fps a kill freezes 2 ticks inside its own frame: the numeral pays
  // them there, so its first drawn frame is still white.
  pool.releaseAll();
  pool.spawn({ x: 0, z: 0, amount: 12, kind: 'damage', crit: false, who: 'own', tick: 8 });
  pool.hold(8, 3);
  nframe(0, 1, 3, 0.05);
  const slow0 = live()[0];
  nframe(1, 0, 0, 0.05);
  const slow1 = live()[0];
  check('N1: at 20 fps the first frame is white and the hold ends with the freeze', slow0.color === PALETTE.parchment && Math.abs(slow0.popAge - 1 / 60) < 2e-3 && slow1.hold === 0 && Math.abs(slow1.age - slow1.popAge - 3 / 60) < 2e-3, { slow0, slow1 });
  // A cleave: the staggered numerals show after the freeze and never hold
  // while the world moves.
  pool.releaseAll();
  for (let i = 0; i < 3; i++) pool.spawn({ x: 0, z: 0, amount: 12, kind: 'damage', crit: false, who: 'own', tick: 9 });
  pool.hold(9, 2);
  nframe(0, 2, 2);
  nframe(2, 1);
  nframe(1, 0);
  for (let i = 0; i < 10; i++) nframe();
  const fan = live().map((r) => r3(r.age - r.popAge));
  check('N1: staggered numerals never hold after the freeze', fan.length === 3 && fan.filter((v) => v > 0).length === 1 && Math.abs(Math.max(...fan) - 2 / 60) < 2e-3, fan);
  pool.releaseAll();
  resetRenderHold();
  const steps = [];
  for (let a = 0; a <= 0.11; a += DT / 2) steps.push(numeralLook(a).step);
  check('N1: white to amber in three steps', new Set(steps).size === 4 && steps[0] === 0 && steps[steps.length - 1] === 3, steps);
  pool.spawn({ x: 0, z: 0, amount: 30, kind: 'damage', crit: true, who: 'own', tick: 6 });
  updateNumberPools(DT);
  const c = live().find((r) => r.crit);
  check('N3: your crit carries the CRIT! tag, the text stays the number', c && c.tag === 'CRIT!' && c.text === '30', c);
  check('N3: your crits print 1.55x', NUMERAL_WHO.own.critScale === 1.55);
  const sides = [];
  for (let i = 0; i < 4; i++) {
    pool.releaseAll();
    pool.spawn({ x: 0, z: 0, amount: 5, kind: 'damage', who: 'own', tick: 10 + i });
    sides.push(live()[0].side);
  }
  check('N2: the arc drifts to alternating sides', sides.join() === '-1,1,-1,1' || sides.join() === '1,-1,1,-1', sides);
  const arc = [0, 0.3, 0.68, 1].map((tt) => numeralArc(tt, 1));
  check('N2: a ballistic arc, apex at 68 % of the life, drifting sideways', arc[2].rise > arc[1].rise && arc[2].rise > arc[3].rise && arc[3].dx > arc[1].dx && Math.abs(arc[2].rise - 1) < 1e-9);
  pool.releaseAll();
  pool.spawn({ x: 0, z: 0, amount: 5, kind: 'damage', who: 'other', tick: 20 });
  pool.spawn({ x: 3, z: 0, amount: 5, kind: 'heal', tick: 20 });
  updateNumberPools(0);
  const [other, heal] = live();
  check('N4: others\' numerals stay Bone, never white or amber', other.color === PALETTE.bone && other.who === 'other', other);
  check('heals stay Bright Heal with "+" from their first frame', heal.color === PALETTE.brightHeal && heal.text === '+5', heal);
  pool.releaseAll();
  const want = { de: 'KRIT!', es: '¡CRÍTICO!', fr: 'CRITIQUE !', ja: 'クリティカル！', ko: '치명타!', 'pt-BR': 'CRÍTICO!', ru: 'КРИТ!', 'zh-Hans': '暴击！', 'zh-Hant': '暴擊！' };
  const miss = Object.keys(want).filter((code) => !JSON.parse(readFileSync(new URL(`../src/i18n/locales/${code}.json`, import.meta.url), 'utf8'))['CRIT!']);
  check('N3: CRIT! in all ten languages', miss.length === 0, miss);
}

// --- 6. audio -------------------------------------------------------------------
{
  const cues = new Map();
  const engine = { registerCue: (id, def) => cues.set(id, def), registerEventCue() {} };
  const mod = await import('../src/audio/cues.js');
  if (typeof mod.registerCues === 'function') mod.registerCues(engine);
  const src = readFileSync(new URL('../src/audio/cues.js', import.meta.url), 'utf8');
  const kill = /cue\('kill',[\s\S]*?\n\);/.exec(src)?.[0] ?? '';
  const { measure } = createDryKit();
  const body = kill.slice(kill.indexOf('(k, t, d, p) =>') + '(k, t, d, p) =>'.length, kill.lastIndexOf(')'));
  const P = (p, hz) => hz * (p.pitch || 1);
  const build = new Function('P', `return (k, t, d, p) => ${body}`)(P);
  const m = measure((k, t, d) => build(k, t, d, { pitch: 1 }));
  check('A6: the kill rings on in a rumble with a crackle, all inside a second', m.dur > 0.6 && m.dur < 1 && /src: 'brown'/.test(kill) && /src: 'crackle'/.test(kill) && /t \+ 0\.3/.test(kill), r3(m.dur));
  check('I1/A1: the first impact of a tick skips the frame budget', FRAME_BUDGET.firstPerTick.includes('impact'));
  const eng = readFileSync(new URL('../src/audio/engine.js', import.meta.url), 'utf8');
  check('I1/A1: the dispatch plays a marked first impact like a telegraph', /const must = q\.first \|\|/.test(eng));
}

// --- 7. colour ------------------------------------------------------------------
{
  const reserved = [PALETTE.emberDanger, PALETTE.brightHeal, PALETTE.godstuffViolet].filter(Boolean).map((h) => h.toUpperCase());
  const files = ['src/render/react.js', 'src/render/hold.js'];
  const hits = files.filter((f) => reserved.some((h) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').toUpperCase().includes(h)));
  const sig = readFileSync(new URL('../src/render/vfx/signature.js', import.meta.url), 'utf8');
  const blocks = [/function bloom\([\s\S]*?\n  \}/.exec(sig)?.[0] ?? '', /function enemyDeath\([\s\S]*?\n  \}/.exec(sig)?.[0] ?? ''];
  const bad = blocks.filter((b) => /EMBER|HEAL\b|VIOLET/.test(b));
  check('nothing new draws in Ember, Bright Heal or Violet', hits.length === 0 && bad.length === 0 && reserved.length === 3, { hits, bad: bad.length });
  check('the contact and kill blooms are near-white Parchment', /color: PARCH/.test(blocks[0]));
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
