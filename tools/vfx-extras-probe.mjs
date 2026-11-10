#!/usr/bin/env node
// VFX EXTRAS probe (v0.5.348) — headless Node, a stub DOM; no browser. The
// extras left over from the VFX rework and the hit feedback slices
// (docs/HIT_FEEDBACK.md "The extras", VFX_HIT_RULES T1, T6, D2, D3):
//   1. the hero rig registry: the arena's and the ally layer's rigs register
//      by class; a registered model-standard rig answers hand, tip, centre
//      and moveLive; a classic rig has no named points;
//   2. T1: a blade swing (the Swordsman's, the Tank's, the Duskwing's basic;
//      the Bellwright's basic is magic) of a registered rig mid-move is traced from its
//      weapon: a trace and two ghosts, fed the tip each frame, the outer edge
//      pushed out to the sim's reach, the band in toward the hero, columns
//      spread over the record; the glint and the shards fire at the tip on
//      the first strike frame (the tip faster than TRACE_FX.strikeSpeed),
//      never at the arc's start; the procedural arc plays softer under it
//      and keeps its afterimages for the strokes after the first; a swing
//      with no rig, a classic rig or a rig at rest plays the arc as before;
//   3. a trace holds through the hitstop like a blaze, and dies with its
//      slot when the record ends; a dead slot's token refuses a feed;
//   4. D2: the stuck arrow is bigger (0.8 u shaft); D3: the frost twinkles
//      are bigger (0.09 to 0.16 u); the caps and lives are unchanged;
//   5. colour: the trace draws in the blade's gold, never Ember, Bright
//      Heal or Violet.
//
//   node tools/vfx-extras-probe.mjs
// Exit code 1 on any failure.
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

const { Scene, PerspectiveCamera, Group, Vector3 } = await import('three');
const { createEventBus } = await import('../src/core/events.js');
const { createCosmeticRng } = await import('../src/core/rng.js');
const { PALETTE } = await import('../src/data/palette.js');
const { createSignatureFx } = await import('../src/render/vfx/signature.js');
const { ELEMENT_AIR } = await import('../src/render/vfx/sig/common.js');
const { setImpactFx } = await import('../src/render/vfx/hub.js');
const { STUCK } = await import('../src/render/vfx/boltfx.js');
const { TRACE, TPL_CAPS, createTemplateKit } = await import('../src/render/vfx/tplkit.js');
const { TRACE_FX } = await import('../src/render/vfx/templates.js');
const { createCritter } = await import('../src/render/critters/index.js');
const { registerHeroRig, unregisterHeroRig, heroRig, heroRigPoint, heroRigCenter, heroRigMoving } = await import('../src/render/critters/rigs.js');
const { renderHold, resetRenderHold, frameRenderHold } = await import('../src/render/hold.js');
const { VERSION } = await import('../src/version.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r2 = (v) => Math.round(v * 100) / 100;
const DT = 1 / 30;
const cmp = (a, b) => a.split('.').map(Number).reduce((s, v, i) => s || v - b.split('.').map(Number)[i], 0);
check('the version is 0.5.348 or later', cmp(VERSION, '0.5.348') >= 0, VERSION);
setImpactFx({ particles: { hit() {}, kill() {}, impact() {}, embers() {}, spray() {} }, decals: { scorch() {}, spawn() {} } });

const hue = (hex) => {
  const c = parseInt(hex.slice(1), 16);
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return 0;
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60) % 360;
};
const hueGap = (a, b) => {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return Math.min(d, 360 - d);
};

// A fight: the healer (you), a blade hero ally with its live rig, a boar.
function fight(cls, { register = true } = {}) {
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const bus = createEventBus();
  const cosmetic = createCosmeticRng();
  const rig = createCritter(cls, { cosmetic });
  const root = new Group();
  root.add(rig.group);
  stage.scene.add(root);
  rig.group.position.set(-2, 0, 0);
  rig.setAnim('idle');
  rig.update(0.2);
  unregisterHeroRig(cls);
  if (register) registerHeroRig(cls, rig);
  const healer = { id: 1, kind: 'player', classId: 'healer', faction: 'party', partyIndex: 0, hp: 10, x: -4, z: 0, px: -4, pz: 0 };
  const hero = { id: 3, kind: 'ally', classId: cls, faction: 'party', partyIndex: 1, hp: 10, x: -2, z: 0, px: -2, pz: 0 };
  const foe = { id: 9, kind: 'boar', faction: 'hostile', x: -1, z: 0, px: -1, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
  const world = { tick: 10, entities: () => [healer, hero, foe], player: healer, runSystem: null };
  const fx = createSignatureFx({ stage, world, bus, cosmetic });
  let now = 0;
  const frame = (dt = DT) => {
    now += dt;
    world.tick += 1;
    rig.update(dt);
    fx.update(now);
  };
  const kitRoot = stage.scene.children.find((c) => c.name === 'vfxtplkit');
  const traces = () => kitRoot.children.filter((o) => o.geometry && o.geometry.index && o.geometry.attributes.position.count === TRACE.cols * 2);
  const swing = (reach = 0.9) => {
    const ev = { tick: world.tick, id: 3, classId: cls, shape: 'melee_arc', x: -2, z: 0, dx: 1, dz: 0, reach, halfAngle: 50 };
    rig.cue('basic', ev); // the ally layer hears it first
    bus.emit(world.tick, 'ally_basic', ev);
    return ev;
  };
  const counts = () => fx.debugCounts();
  const rec = (name) => counts().recipes[`tpl:${name}`] ?? 0;
  return { stage, bus, fx, rig, hero, foe, world, frame, traces, swing, counts, rec };
}

// --- 1. the registry ----------------------------------------------------------------
{
  const { rig } = fight('swordsman');
  const v = new Vector3();
  check('1: the registered rig answers by class', heroRig('swordsman') === rig);
  check('1: hand, tip and centre in world space', !!heroRigPoint('swordsman', 'hand', v) && !!heroRigPoint('swordsman', 'tip', v) && !!heroRigCenter('swordsman', v) && r2(v.x) === -2);
  check('1: a rig at rest is not mid-move', heroRigMoving('swordsman') === false);
  rig.cue('basic', { a: 1 });
  check('1: a rig just cued a swing is mid-move', heroRigMoving('swordsman') === true);
  for (let i = 0; i < 30; i++) rig.update(DT);
  check('1: ...and at rest again after the swing', heroRigMoving('swordsman') === false);
  check('1: no rig for an unregistered class', heroRig('healer') === null && heroRigPoint('healer', 'tip', v) === null && heroRigMoving('healer') === false);
  const other = createCritter('swordsman', { cosmetic: createCosmeticRng() });
  unregisterHeroRig('swordsman', other);
  check('1: unregistering another instance leaves the live rig', heroRig('swordsman') === rig);
  unregisterHeroRig('swordsman');
  check('1: unregistered', heroRig('swordsman') === null);
}

// --- 2. the traced slash ------------------------------------------------------------
{
  check('T1: the trace pool, record and band', TPL_CAPS.trace >= 12 && TRACE.cols >= 32 && TRACE.sec >= 0.2 && TRACE.sec <= 0.35 && TRACE.band >= 0.6 && TRACE.band <= 0.75, TRACE);
  check('T1: two ghosts, the arc softer underneath', TRACE_FX.ghosts.length === 2 && TRACE_FX.under > 0.3 && TRACE_FX.under < 0.8 && TRACE_FX.strikeSpeed >= 2 && TRACE_FX.strikeSpeed <= 6);
  for (const cls of ['swordsman', 'tank', 'duskwing']) {
    const F = fight(cls);
    const before = F.counts().tpl;
    F.swing(0.9);
    const live0 = F.traces().filter((m) => m.visible).length;
    check(`T1 ${cls}: a swing of a rig mid-move starts a trace and its two ghosts`, F.rec('blade_trace') === 1 && F.rec('blade_swing') === 1 && live0 === 3, { live: live0, before });
    check(`T1 ${cls}: the arc still plays under it, with no afterimages`, F.counts().tpl.blazes === 1 && F.rec('blade_glint') === 0, F.counts().tpl);
    let glintAt = -1;
    let maxR = 0;
    let minR = 9;
    let heights = [];
    const feet = new Vector3();
    for (let f = 0; f < 12; f++) {
      F.frame();
      if (glintAt < 0 && F.rec('blade_glint') === 1) glintAt = f;
      const m = F.traces().find((o) => o.visible && o.material.uniforms.uOpacity.value > 0);
      if (m) {
        heroRigCenter(cls, feet);
        const P = m.geometry.attributes.position.array;
        for (let i = 0; i < TRACE.cols; i++) {
          const r = Math.hypot(P[(i * 2 + 1) * 3] - feet.x, P[(i * 2 + 1) * 3 + 2] - feet.z);
          maxR = Math.max(maxR, r);
          minR = Math.min(minR, r);
          heights.push(P[(i * 2 + 1) * 3 + 1]);
        }
      }
    }
    check(`T1 ${cls}: the glint fires on a strike frame of the swing, not at its start`, glintAt >= 0 && glintAt <= 6 && F.rec('blade_glint') === 1, { glintAt });
    check(`T1 ${cls}: the outer edge reaches the sim's reach (0.855 u) and stays within it or the weapon's own`, r2(minR) >= 0.85 && maxR <= 1.6, { minR: r2(minR), maxR: r2(maxR) });
    check(`T1 ${cls}: the ribbon rides above the floor at the tip's height`, heights.every((y) => y >= 0.119) && Math.max(...heights) <= 1.6, { lo: r2(Math.min(...heights)), hi: r2(Math.max(...heights)) });
    for (let f = 0; f < 12; f++) F.frame();
    check(`T1 ${cls}: the trace is gone within 0.8 s`, F.traces().every((m) => !m.visible), F.counts().tpl.traces);
    unregisterHeroRig(cls);
  }
  // the fallback: no rig, a rig at rest
  {
    const F = fight('swordsman', { register: false });
    F.swing();
    check('T1: a swing with no registered rig plays the procedural arc with its glint and afterimages', F.rec('blade_trace') === 0 && F.rec('blade_swing') === 1 && F.counts().tpl.blazes === 3 && F.counts().tpl.traces === 0);
  }
  {
    const F = fight('swordsman');
    const ev = { tick: F.world.tick, id: 3, classId: 'swordsman', shape: 'melee_arc', x: -2, z: 0, dx: 1, dz: 0, reach: 0.9, halfAngle: 50 };
    F.bus.emit(F.world.tick, 'ally_basic', ev); // the rig never heard it: at rest
    check('T1: a rig at rest (the event unheard by the rig) plays the procedural arc', F.rec('blade_trace') === 0 && F.counts().tpl.blazes === 3);
    unregisterHeroRig('swordsman');
  }
  // the skill swing: a second stroke keeps the arc and its glint
  {
    const F = fight('swordsman');
    const ev = { tick: F.world.tick, id: 3, classId: 'swordsman', skill: 'flurry', shape: 'melee_arc', x: -2, z: 0, dx: 1, dz: 0, reach: 1.0, halfAngle: 50 };
    F.rig.cue('skill', ev);
    F.rig.cue('basic', ev); // a swing either way
    F.bus.emit(F.world.tick, 'ally_cast', ev);
    check('T1: a three-stroke skill traces its first stroke and keeps the two procedural strokes after it', F.rec('blade_trace') === 1 && F.rec('blade_skill') === 1 && F.counts().tpl.traces === 3 && F.counts().tpl.blazes >= 5, F.counts().tpl);
    unregisterHeroRig('swordsman');
  }
}

// --- 3. the hold and the token ------------------------------------------------------
{
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const tk = createTemplateKit({ stage, cosmetic: createCosmeticRng() });
  const s = tk.trace({ x: 0, z: 0, radius: 0.9, life: 0.4 });
  const tok = s.tok;
  const feet = new Vector3(0, 0, 0);
  const hand = new Vector3(0.3, 0.3, 0);
  const tip = new Vector3(0.6, 0.6, 0);
  check('3: a trace with one point draws nothing yet', tk.feedTrace(s, tok, feet, hand, tip) === 0 && s.u.uOpacity.value === 0);
  tk.update(DT, null);
  tip.set(0.6, 0.6, 0.5);
  const path = tk.feedTrace(s, tok, feet, hand, tip);
  check('3: the tip is pushed out to the reach and the path counts from there', r2(Math.hypot(tip.x, tip.z)) === 0.9 && path > 0.3, { r: r2(Math.hypot(tip.x, tip.z)), path: r2(path) });
  tk.update(DT, null);
  check('3: two points draw, the window at the clock', s.u.uOpacity.value > 0 && r2(s.u.uHead.value) === r2((2 * DT) / TRACE.sec), { op: s.u.uOpacity.value, head: s.u.uHead.value });
  resetRenderHold();
  frameRenderHold(0.1, DT, 10, 7); // the sim froze 3 ticks this frame
  const headBefore = s.u.uHead.value;
  tk.update(DT, renderHold);
  check('3: a trace holds through the hitstop like a blaze', s.u.uHead.value === headBefore && tk.counts().held === 1, { head: s.u.uHead.value, held: tk.counts().held });
  const rt = s.rt;
  check('3: a held frame feeds no new point', tk.feedTrace(s, tok, feet, hand, tip) === path && s.rt === rt);
  for (let i = 0; i < 20; i++) tk.update(DT, null);
  check('3: the trace ends with its life', s.live === false && tk.feedTrace(s, tok, feet, hand, tip) === -1);
  const s2 = tk.trace({ x: 0, z: 0, radius: 0.9 });
  check('3: a slot given away refuses the old token', s2.tok !== tok && tk.feedTrace(s2, tok, feet, hand, tip) === -1 && tk.feedTrace(s2, s2.tok, feet, hand, tip) === 0);
  resetRenderHold();
}

// --- 4. the bigger arrow and twinkles ----------------------------------------------
{
  check('D2: the stuck arrow is 0.8 u long and thicker, same cap and life', STUCK.len === 0.8 && STUCK.girth >= 0.035 && STUCK.fletch[0] >= 0.1 && STUCK.cap === 10 && STUCK.life === 3, STUCK);
  check('D3: the frost twinkles are 0.09 to 0.16 u, same count and life', ELEMENT_AIR.size[0] === 0.09 && ELEMENT_AIR.size[1] === 0.16 && ELEMENT_AIR.twinkles === 100 && ELEMENT_AIR.sec[0] === 1.0 && ELEMENT_AIR.sec[1] === 1.9, ELEMENT_AIR);
  const { fx, stage, bus, world, frame } = fight('archer');
  // the boar's arrow lands: the arrow in the floor measures its new length
  bus.emit(world.tick, 'projectile_spawn', { id: 50, kind: 'bolt', owner: 3, classId: 'archer', x: -2, z: 0, dx: 1, dz: 0 });
  let big = false;
  stage.scene.traverse((o) => {
    if (o.geometry && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters && Math.abs(o.geometry.parameters.height - STUCK.len) < 1e-6) big = true;
  });
  check('D2: the arrow pool is built at the new length', big);
  unregisterHeroRig('archer');
  void fx;
  void frame;
}

// --- 5. colour -----------------------------------------------------------------------
{
  const F = fight('swordsman');
  F.swing();
  const cols = [];
  for (const m of F.traces()) if (m.visible) for (const k of ['uCore', 'uA', 'uB']) cols.push(`#${m.material.uniforms[k].value.getHexString().toUpperCase()}`);
  const reserved = [PALETTE.ember, PALETTE.brightHeal, PALETTE.violet].filter(Boolean);
  const clear = cols.every((c) => reserved.every((r) => hueGap(c, r) >= 20 || c === '#FFF3C4'));
  check('5: the trace draws in the blade\'s gold, clear of Ember, Bright Heal and Violet', cols.length === 9 && clear, cols);
  unregisterHeroRig('swordsman');
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
