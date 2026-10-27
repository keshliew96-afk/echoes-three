#!/usr/bin/env node
// VFX AND HIT FEEDBACK probe, Part 2 (v0.5.339) — headless Node, a stub DOM;
// no browser. THE CAST, THE SHOT, THE REWARD AND THE AFTERMATH
// (docs/HIT_FEEDBACK.md, VFX_HIT_RULES §6.2 f-o) is render and audio only.
// This probe drives the real layers and checks:
//   1. shots (f, n, l R6, m D2): the head swells at the hand and stretches
//      as it flies, a shot lights its target's near side once as it nears,
//      an Archer arrow that lands stays stuck in the floor for 3 s, then
//      goes; the ranged hold is 3 frames;
//   2. the crit flipbook (l L4): 5 drawings, 2 ticks each, then a hard cut;
//      the swipe trail tapers from the blade to the start (L3);
//   3. element air (m D3): about 100 twinkles and a mist hold 1 to 2 s after
//      the Frost Bomb and the Frozen elite's burst;
//   4. the chest beat (i, O1 to O5): the wobble quickens as a hero nears;
//      the press squashes to 0.92 x 1.07 (90% by 8 of 15 frames) and snaps
//      at 0.5 s; the hop holds 4 frames at its top; the lid is half open on
//      S and fully by S+3; it lands by S+11; the padlock lands about S+31
//      and stays; the light sheet and the stars; 8 star pops over 0.7 s from
//      0.87 s;
//   5. the chest rigs: the vault chest, the reliquary and the cache wobble
//      near a hero, press on their event and snap inside their reveals;
//      the champion chest snaps on the clear, with a UI hold before the
//      draft; the Trapped Chest keeps its twitch and flings its lid in 3
//      frames with no light;
//   6. sounds (g, i): the chest's layers on the beat's clock, the impact
//      families and the whiz rule;
//   7. colour: nothing new draws in Ember (but the Trapped Chest's threat),
//      Bright Heal or Violet; the camera punch on the snap is 2%.
//
//   node tools/vfx-hit-feedback2-probe.mjs
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';

// --- a stub DOM: enough for canvases and sprites. --------------------------------
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

const { Scene, PerspectiveCamera, Group } = await import('three');
const { createEventBus } = await import('../src/core/events.js');
const { createCosmeticRng } = await import('../src/core/rng.js');
const { TICK_HZ } = await import('../src/core/constants.js');
const { PALETTE } = await import('../src/data/palette.js');
const { createSignatureFx, ELEMENT_AIR } = await import('../src/render/vfx/signature.js');
const { setImpactFx } = await import('../src/render/vfx/hub.js');
const { SHOT_FX, STUCK, NEAR_LIGHT } = await import('../src/render/vfx/boltfx.js');
const { FLIPBOOK, FLIPBOOK_SEC, flipFrame } = await import('../src/render/vfx/flipbook.js');
const { REACT } = await import('../src/render/react.js');
const { CHEST_BEAT, STAR_POP_TIMES, heldClock, chestPose, attachChestBeat } = await import('../src/render/interactables/chestbeat.js');
const { buildVaultChest } = await import('../src/render/interactables/vaults.js');
const { buildSecretBody } = await import('../src/render/interactables/secrets.js');
const { buildEncounter } = await import('../src/render/interactables/encounters.js');
const { VAULT_RULES } = await import('../src/sim/vaults.js');
const { SECRET_RULES } = await import('../src/sim/secrets.js');
const { CHEST_EVENT_CUES, CHEST_CUE_IDS, registerChestCues } = await import('../src/audio/chestcues.js');
const { impactFamily, passesNear, castWhooshes, IMPACT_SOUND } = await import('../src/audio/impactcues.js');
const { createDryKit } = await import('../src/audio/voices.js');
const { VERSION } = await import('../src/version.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;
const F = 1 / 30;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const cmp = (a, b) => a.split('.').map(Number).reduce((s, v, i) => s || v - b.split('.').map(Number)[i], 0);
check('the version is 0.5.339 or later', cmp(VERSION, '0.5.339') >= 0, VERSION);

// One effect layer over a small fight: the healer (you), an archer ally, a
// boar, and whatever bolts the test puts in.
function fight() {
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const bus = createEventBus();
  const sprays = [];
  setImpactFx({
    particles: { hit() {}, kill() {}, impact() {}, embers() {}, spray: (mode, x, y, z, n, o) => sprays.push({ mode, n, o }) },
    decals: { scorch() {}, spawn() {} },
  });
  const healer = { id: 1, kind: 'player', classId: 'healer', faction: 'party', partyIndex: 0, hp: 10, x: -4, z: 0, px: -4, pz: 0 };
  const archer = { id: 3, kind: 'ally', classId: 'archer', faction: 'party', partyIndex: 1, hp: 10, x: -3, z: 0, px: -3, pz: 0 };
  const foe = { id: 9, kind: 'boar', faction: 'hostile', x: 3, z: 0, px: 3, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
  const ents = [healer, archer, foe];
  const world = { tick: 10, entities: () => ents, player: healer, runSystem: null };
  const fx = createSignatureFx({ stage, world, bus, cosmetic: createCosmeticRng() });
  let now = 0;
  const frame = () => {
    now += DT;
    world.tick += 1;
    fx.update(now);
  };
  return { stage, bus, fx, ents, foe, world, frame, sprays };
}

// --- 1. shots ------------------------------------------------------------------
{
  check('n: the ranged hold is 3 frames', REACT.rangedHold === 3);
  check('S1/S3: the head swells at the hand and stretches as it flies', SHOT_FX.swell > 0.3 && SHOT_FX.stretch >= 1.5 && SHOT_FX.settleSec <= 0.15, { swell: SHOT_FX.swell, stretch: SHOT_FX.stretch });
  const { fx, ents, frame, stage } = fight();
  frame();
  // An Archer arrow flying at the boar, 0.15 u a tick.
  const arrow = { id: 50, kind: 'skillbolt', skill: 'archer_basic', faction: 'party', x: -2.5, z: 0, vx: 0.15, vz: 0, traveled: 0 };
  ents.push(arrow);
  let nearAt = null;
  for (let i = 0; i < 40; i++) {
    arrow.x += arrow.vx;
    arrow.traveled += arrow.vx;
    frame();
    const row = fx.debugCounts().bolt.archer_basic ?? {};
    if (nearAt === null && row.near) nearAt = r3(ents[2].x - arrow.x);
    if (arrow.x >= 2.6) break;
  }
  check('R6: the arrow lights the boar\'s near side once, within about 1.5 bw of it', nearAt !== null && nearAt <= NEAR_LIGHT.reach + 0.16 && (fx.debugCounts().bolt.archer_basic.near ?? 0) === 1, { nearAt, reach: NEAR_LIGHT.reach });
  // It stops on the boar: it stays stuck in the floor.
  ents.splice(ents.indexOf(arrow), 1);
  frame();
  const stuckOf = () => {
    let n = 0;
    stage.scene.traverse((o) => {
      if (o.isGroup && o.visible && o.children.length === 2 && o.children[0].geometry?.type === 'CylinderGeometry' && o.children[1].geometry?.type === 'ConeGeometry') n += 1;
    });
    return n;
  };
  check('D2: the Archer arrow that lands stays stuck in the floor', stuckOf() === 1 && (fx.debugCounts().bolt.arrow?.stuck ?? 0) === 1, { live: stuckOf() });
  for (let i = 0; i < Math.round((STUCK.life - 0.2) * 60); i++) frame();
  const still = stuckOf();
  for (let i = 0; i < 20; i++) frame();
  check('D2: ...for a few seconds (3 s), then it is gone', still === 1 && stuckOf() === 0, { at2_8: still, after: stuckOf() });
  // A healer bolt never leaves an arrow.
  const bolt = { id: 51, kind: 'bolt', faction: 'party', x: -2.5, z: 0, vx: 0.15, vz: 0, traveled: 0 };
  ents.push(bolt);
  for (let i = 0; i < 6; i++) {
    bolt.x += bolt.vx;
    bolt.traveled += bolt.vx;
    frame();
  }
  ents.splice(ents.indexOf(bolt), 1);
  frame();
  check('D2: only arrows stick (a healer bolt leaves none)', stuckOf() === 0);
  setImpactFx(null);
}

// --- 2. the crit flipbook and the swipe taper ---------------------------------
{
  check('L4: 5 drawings, 2 ticks each', FLIPBOOK.frames >= 3 && FLIPBOOK.frames <= 5 && FLIPBOOK.ticksPer === 2 && r3(FLIPBOOK_SEC) === r3(10 / TICK_HZ));
  const seq = [];
  for (let k = 0; k < 12; k++) seq.push(flipFrame((k + 0.5) / TICK_HZ));
  check('L4: the drawings swap every 2 ticks and end on a hard cut', seq.join(',') === '0,0,1,1,2,2,3,3,4,4,-1,-1', seq.join(','));
  const { bus, stage, frame } = fight();
  frame();
  const books = () => {
    const out = [];
    stage.scene.traverse((o) => {
      if (o.isSprite && o.visible && o.renderOrder === 6) out.push(o);
    });
    return out;
  };
  bus.emit(12, 'hit', { target: 9, kind: 'boar', attacker: 3, amount: 9, crit: true, delivery: 'basic', shape: 'projectile', kb: 0, dirX: 1, dirZ: 0, x: 3, z: 0 });
  frame();
  const shown = books();
  const offs = [];
  for (let i = 0; i < 9; i++) {
    offs.push(r3(shown[0]?.material.map.offset.x ?? -1));
    frame();
  }
  check('L4: a crit\'s contact plays the book at the hit, in pale gold', shown.length === 1 && shown[0].material.color.getHexString().toUpperCase() === 'FFE7A8', shown[0]?.material.color.getHexString());
  check('L4: ...each drawing in turn, gone by 10 ticks', new Set(offs).size >= 4 && books().length === 0, offs);
  const tpl = src('src/render/vfx/tplkit.js');
  check('L3: a swipe trail is thickest at the blade and thins to a point at its start', /taper = mix\( taper, pow\( clamp\( uv\.x \/ max\( uHead, 0\.05 \), 0\.0, 1\.0 \), 0\.75 \), uSwipe \)/.test(tpl));
  setImpactFx(null);
}

// --- 3. element air -----------------------------------------------------------
{
  check('D3: about 100 twinkles and a faint mist for 1 to 2 s', ELEMENT_AIR.twinkles >= 80 && ELEMENT_AIR.twinkles <= 120 && ELEMENT_AIR.sec[0] >= 1 && ELEMENT_AIR.sec[1] <= 2 && ELEMENT_AIR.mistOpacity <= 0.2, ELEMENT_AIR);
  const { bus, fx, frame } = fight();
  frame();
  const dust0 = fx.debugCounts().tpl.dust ?? 0;
  bus.emit(12, 'tonic_burst', { item: 'frost_bomb', x: 3, z: 0, radius: 2.4, hit: [9] });
  for (let i = 0; i < 20; i++) frame(); // the twinkles stagger in over 0.25 s
  const air1 = fx.debugCounts().recipes.element_air ?? 0;
  const dust1 = fx.debugCounts().tpl.dust ?? 0;
  for (let i = 0; i < 40; i++) frame();
  const dustHeld = fx.debugCounts().tpl.dust ?? 0;
  for (let i = 0; i < 80; i++) frame();
  const dustGone = fx.debugCounts().tpl.dust ?? 0;
  bus.emit(14, 'enemy_glob_land', { id: 77, affix: 'frozen', x: 0, z: 0, radius: 1.6 });
  frame();
  const air2 = fx.debugCounts().recipes.element_air ?? 0;
  check('D3: the Frost Bomb leaves its air where it burst and on each foe it froze', air1 === 2 && dust1 - dust0 >= 80, { air1, dust: dust1 - dust0 });
  check('D3: the Frozen elite\'s burst leaves its air too', air2 === 3, { air2 });
  check('D3: the air holds a second, then clears by 2 s', dustHeld >= 80 && dustGone < dustHeld * 0.2, { at1s: dustHeld, at2_3s: dustGone });
  setImpactFx(null);
}

// --- 4. the chest beat --------------------------------------------------------
{
  const B = CHEST_BEAT;
  const w = 1;
  // O1: the wobble quickens as a hero nears.
  const swingRate = (near) => {
    const g = new Group();
    const body = new Group();
    g.add(body);
    const beat = attachChestBeat(g, body, { w, d: 0.6, rim: 0.5, hasp: { y: 0.36, z: 0.3 } }, { spray() {} });
    let flips = 0;
    let last = 0;
    let maxTilt = 0;
    for (let i = 0; i < 300; i++) {
      const p = beat.update(DT, near);
      if (Math.abs(p.tilt) > 0.005) {
        if (last !== 0 && Math.sign(p.tilt) !== Math.sign(last)) flips += 1;
        last = p.tilt;
      }
      maxTilt = Math.max(maxTilt, Math.abs(p.tilt));
    }
    return { flips, maxTilt: r3(maxTilt) };
  };
  const far = swingRate(9);
  const mid = swingRate(3.5);
  const close = swingRate(1.2);
  check('O1: no wobble with nobody near', far.flips === 0 && far.maxTilt === 0, far);
  check('O1: it wobbles faster and faster as a hero comes near', close.flips > mid.flips && mid.flips > 0, { mid, close });
  check('O1: the tilt stays small (about 2 to 2.5 degrees)', close.maxTilt <= 0.045 && close.maxTilt >= 0.03, close);
  // O2: the press.
  const P = (t) => chestPose({ mode: 'press', t, amp0: 1, ph0: 1 }, w);
  const at8 = P(B.finish + (B.snap - B.finish) * (8 / 15));
  const atS = P(B.snap - 1e-6);
  check('O2: the press squashes to 0.92 x 1.07 and keeps a tremble', r3(atS.sy) === 0.92 && r3(atS.sx) === 1.07 && atS.tremble > 0 && atS.tremble <= 0.005, { sx: r3(atS.sx), sy: r3(atS.sy) });
  check('O2: 90% of the depth by 8 of its 15 frames, then it creeps', Math.abs((1 - at8.sy) / 0.08 - 0.9) < 0.02, r3((1 - at8.sy) / 0.08));
  check('§2.14: the snap lands inside both reveals (0.5 s after the press)', B.snap <= 0.55 && B.snap + B.rise + B.hold < SECRET_RULES.revealSec && B.snap + B.rise + B.hold + B.land < VAULT_RULES.revealSec, { snap: B.snap, secret: SECRET_RULES.revealSec, vault: VAULT_RULES.revealSec });
  // O3: the snap.
  const O = (b) => chestPose({ mode: 'open', t: b }, w);
  check('O3: the lid is half open on S and fully open by S+3', r3(O(0).lid) === 0.5 && O(3 * F).lid >= 0.999, { s: r3(O(0).lid), s3: r3(O(3 * F).lid) });
  check('O3: the lid is flung open, never slammed shut (it stays open)', [0.3, 1, 3].every((b) => O(b).lid >= 0.999));
  const top = [4, 5, 6, 7].map((f) => O(f * F + 0.001));
  check('O3: the hop is about 8% of the width and holds 4 frames at its top', top.every((p) => r3(p.hop) === r3(B.hop * w)) && B.hop >= 0.07 && B.hop <= 0.09, top.map((p) => r3(p.hop)));
  check('O3: it narrows a little on the hop and lands by S+11', r3(O(5 * F).sx) <= 0.99 && O(11 * F + 0.001).hop === 0, { sx: r3(O(5 * F).sx), hop11: O(11 * F + 0.001).hop });
  check('O3: the hold is on its own clock (the light and the stars hold too)', heldClock(5 * F) === heldClock(7 * F) && heldClock(10 * F) < 10 * F);
  // A beat played through: the padlock, the sheet, the stars.
  const g = new Group();
  const body = new Group();
  g.add(body);
  const sprays = [];
  const beat = attachChestBeat(g, body, { w, d: 0.6, rim: 0.5, hasp: { y: 0.36, z: 0.3 } }, { spray: (mode, x, y, z, n, o) => sprays.push({ mode, n }) }, createCosmeticRng());
  beat.update(DT, 2);
  beat.press();
  let t = 0;
  while (beat.state().mode !== 'open') {
    beat.update(DT, 2);
    t += DT;
  }
  check('O2/O3: a press snaps at CHEST_BEAT.snap', Math.abs(t - B.snap) <= DT + 1e-9, r3(t));
  const lock = g.children.find((c) => c.isGroup && c.children.length === 2 && c.children[0].geometry?.type === 'BoxGeometry');
  const sheetOps = [];
  const lockYs = [];
  let landedAt = null;
  const starsLive = [];
  for (let i = 0; i < 150; i++) {
    beat.update(DT, 2);
    const b = beat.state().t;
    if (landedAt === null && beat.state().landed) landedAt = r3(b);
    lockYs.push(lock.position.y);
    let so = 0;
    g.traverse((o) => {
      if (o.isMesh && o.geometry?.type === 'PlaneGeometry') so = o.material.opacity;
    });
    sheetOps.push(so);
    starsLive.push(beat.state().stars);
  }
  check('O3: the padlock flies off, lands about S+31 and stays on the floor', landedAt !== null && Math.abs(landedAt - 31 * F) < 0.05 && lockYs[lockYs.length - 1] < 0.05 && Math.max(...lockYs) > 0.36, { landedAt, top: r3(Math.max(...lockYs)), rest: r3(lockYs[lockYs.length - 1]) });
  const sheetOn = sheetOps.findIndex((o) => o > 0.3);
  const sheetOff = sheetOps.findIndex((o, i) => i > sheetOn && o === 0);
  check('O4: the light sheet is up by S+2 and gone by S+11 (0.37 s)', sheetOn >= 0 && sheetOn <= 4 && sheetOff > 0 && (sheetOff + 1) * DT <= 11 * F + DT + 1e-9, { on: sheetOn, off: sheetOff });
  check('O5: 8 stars burst up on the snap and pop away by about 1.6 s', Math.max(...starsLive.slice(0, 40)) === B.stars && starsLive[starsLive.length - 1] === 0, { first: starsLive.slice(0, 3), last: starsLive[starsLive.length - 1] });
  check('O5: the pops come one at a time from 0.87 s over 0.7 s', STAR_POP_TIMES.length === 8 && r3(STAR_POP_TIMES[0]) === 0.87 && r3(STAR_POP_TIMES[7] - STAR_POP_TIMES[0]) === 0.7, STAR_POP_TIMES.map(r3));
  check('O5: tiny sparks rise from the release and each pop throws a scatter', sprays.filter((s) => s.mode === 'spark').length > 20, sprays.length);
  const restored = new Group();
  const rb = new Group();
  restored.add(rb);
  const beat2 = attachChestBeat(restored, rb, { w, d: 0.6, rim: 0.5, hasp: { y: 0.36, z: 0.3 } }, { spray() {} });
  beat2.restore();
  const rp = beat2.update(DT, 1);
  check('a chest already open shows open, with no burst', rp.lid === 1 && rp.hop === 0);
}

// --- 5. the chest rigs --------------------------------------------------------
{
  const lidOf = (hinge) => -hinge.rotation.x;
  // The vault chest: wobbles near a hero, presses on vault_open, snaps at 0.5 s.
  const v = buildVaultChest();
  v.group.position.set(0, 0, 0);
  const ctxNear = { party: [{ x: 1.5, z: 0 }] };
  let tilts = 0;
  let ts = 0;
  for (let i = 0; i < 120; i++) {
    ts += DT;
    v.update({ uses: 1 }, ts, ctxNear);
    if (Math.abs(v.beat ? 1 : 0) && v.group.children.some((c) => c.isGroup && Math.abs(c.rotation.z) > 0.01)) tilts += 1;
  }
  check('i: the vault chest wobbles as a hero comes near', tilts > 10, tilts);
  v.onEvent('vault_open');
  const hinge = (() => {
    let h = null;
    v.group.traverse((o) => {
      if (o.isGroup && o.position.y === 0.72 && o.position.z === -0.34) h = o;
    });
    return h;
  })();
  const lids = [];
  for (let i = 0; i < 60; i++) {
    ts += DT;
    v.update({ uses: 0 }, ts, ctxNear);
    lids.push(r3(lidOf(hinge)));
  }
  const first = lids.findIndex((l) => l > 0.01);
  check('i: the vault chest\'s lid stays shut through the press and is flung open at the snap', first >= Math.round(B_SNAP() * 60) - 2 && first <= Math.round(B_SNAP() * 60) + 1 && lids[first + 6] >= 1.94, { first, lids: lids.slice(first, first + 6) });
  // The reliquary and the cache.
  for (const content of ['relic', 'tonics']) {
    const r = buildSecretBody({ content, uses: 1 });
    let t2 = 0;
    let moved = 0;
    for (let i = 0; i < 120; i++) {
      t2 += DT;
      r.update({ uses: 1 }, t2, ctxNear);
      if (r.group.children.some((c) => c.isGroup && Math.abs(c.rotation.z) > 0.01)) moved += 1;
    }
    r.onEvent('take');
    let snapAt = null;
    for (let i = 0; i < 60; i++) {
      t2 += DT;
      r.update({ uses: 0 }, t2, ctxNear);
      if (snapAt === null && r.beat.state().mode === 'open') snapAt = r3((i + 1) * DT);
    }
    check(`i: the secret ${content === 'relic' ? 'reliquary' : 'cache'} wobbles, presses on the Take and snaps inside 1.2 s`, moved > 10 && snapAt !== null && snapAt <= 0.55, { moved, snapAt });
  }
  const lectern = buildSecretBody({ content: 'lore', uses: 1 });
  check('i: the lectern is not a chest: no beat', lectern.beat === null);
  // A restored vault (built open) skips the beat.
  const v2 = buildVaultChest();
  v2.update({ uses: 0 }, 1, ctxNear);
  check('i: a vault rebuilt already open shows open with no burst', v2.beat.state().restored === true);
  // The Trapped Chest: its twitch kept, its lid flung in 3 frames, no light.
  const trap = buildEncounter({ encounter: 'trapped_chest', uses: 1 });
  const tsrc = src('src/render/interactables/encounters.js');
  check('i: the Trapped Chest keeps its lure twitch and its lid opens in 3 frames on Ember sparks, with no light', /const twitch = !opening/.test(tsrc) && /TRAP_LID = Object\.freeze\(\{ sec: 3 \/ 30 \}\)/.test(tsrc) && /inside\.material\.opacity = 0;/.test(tsrc) && /spray\('spark', x, 0\.4, z, 14, \{ color: PALETTE\.emberDanger/.test(tsrc) && !!trap);
  const csrc = src('src/render/enemies/champions.js');
  check('i: the champion chest wobbles from the fall and snaps on the clear', /chest\.rec\.beat\.force\(0\.5\)/.test(csrc) && /chest\.rec\.beat\.open\(\)/.test(csrc) && /hinge\.rotation\.x = -1\.9 \* pose\.lid/.test(csrc));
  const usrc = src('src/ui/run/index.js');
  check('i: the champion chest gets a UI-only hold before the draft', /bus\.on\('champion_chest', \(\) => \{\s*takeHoldUntil = performance\.now\(\) \+ TAKE_HOLD_MS;/.test(usrc));
  const ssrc = src('src/render/vfx/signature.js');
  check('C2: a chest snap punches the camera 2%, inside the hold', /chest: 0\.02/.test(ssrc) && /after\(snapIn \+ 5 \/ 30, \(\) => camfx\.punch\(CAM_PUNCH\.chest, 0\.6\)\)/.test(ssrc) && /bus\.on\('champion_chest', \(\) => chestPunch\(0\)\)/.test(ssrc));
}
function B_SNAP() {
  return CHEST_BEAT.snap;
}

// --- 6. sounds ----------------------------------------------------------------
{
  const defs = {};
  const handlers = {};
  registerChestCues({ registerCue: (id, d) => (defs[id] = d), registerEventCue: (type, fn) => (handlers[type] = fn) });
  const { measure } = createDryKit();
  const end = (id) => measure((k, t, d) => defs[id].voice(null, t, d, { pitch: 1, kit: k })).dur;
  const vault = CHEST_EVENT_CUES.vault_open({ x: 1, z: 2 }).map((r) => r.cue);
  const champ = CHEST_EVENT_CUES.champion_chest({ x: 1, z: 2 }).map((r) => r.cue);
  check('i: each layer of a press chest has its own sound (tremble, snap, shine, lock, stars)', ['cb_tremble', 'cb_snap', 'cb_shine', 'cb_lock', 'cb_stars'].every((c) => vault.includes(c)), vault);
  check('i: the champion chest\'s layers start on its event (no press)', champ.every((c) => c.endsWith('_now')) && !champ.includes('cb_tremble'), champ);
  check('i: the reliquary and the cache get the layers; the lectern and the hoard do not', !!CHEST_EVENT_CUES.secret_take({ content: 'relic' }) && !!CHEST_EVENT_CUES.secret_take({ content: 'tonics' }) && CHEST_EVENT_CUES.secret_take({ content: 'lore' }) === null && CHEST_EVENT_CUES.secret_take({ content: 'hoard' }) === null);
  const lead = r3(end('cb_snap') - end('cb_snap_now'));
  check('i: a press chest\'s snap sounds CHEST_BEAT.snap after its press', lead === r3(CHEST_BEAT.snap), lead);
  check('i: the padlock\'s clink and the star tings land on their frames', end('cb_lock_now') >= CHEST_BEAT.lockLand && end('cb_lock_now') < CHEST_BEAT.lockLand + 0.3 && end('cb_stars_now') >= STAR_POP_TIMES[7] && end('cb_stars_now') < STAR_POP_TIMES[7] + 0.3, { lock: r3(end('cb_lock_now')), stars: r3(end('cb_stars_now')) });
  check('i: every chest cue is registered with a calibration entry', CHEST_CUE_IDS.every((id) => defs[id] && Number.isFinite(defs[id].calDb) && defs[id].calDb === defs[id.endsWith('_now') || id === 'cb_tremble' ? id : `${id}_now`].calDb) && Object.keys(handlers).length === 3);
  // The impact families and the whiz rule (g).
  const hit = (o) => ({ kind: 'enemy', delivery: 'basic', attacker: 3, ...o });
  check('A3: a spell booms, an arrow thunks, a blade cuts', impactFamily(hit({ source: 'healer_basic', shape: 'projectile' }), { classId: 'healer', faction: 'party' }) === 'imp_boom' && impactFamily(hit({ source: 'archer_basic', shape: 'projectile' }), { classId: 'archer', faction: 'party' }) === 'imp_thunk' && impactFamily(hit({ source: 'swordsman_basic', shape: 'melee_arc' }), { classId: 'swordsman', faction: 'party' }) === 'imp_cut');
  check('A5: about ±6% pitch jitter', IMPACT_SOUND.jitter >= 0.05 && IMPACT_SOUND.jitter <= 0.07);
  check('A4 (my limit): a foe shot whizzes only when its line passes near your hero', passesNear(0, 0, 1, 0, 5, 1) && !passesNear(0, 0, 1, 0, 5, 3) && !passesNear(0, 0, 1, 0, -2, 0));
  check('A2: a magic cast whooshes, a heal does not', castWhooshes('healer', 'healer_basic') !== undefined && castWhooshes('tidecaller', 'x') === false);
}

// --- 7. colour ----------------------------------------------------------------
{
  const NEW = ['src/render/interactables/chestbeat.js', 'src/render/vfx/flipbook.js', 'src/render/vfx/animefx.js', 'src/render/rim.js', 'src/audio/chestcues.js'];
  const bad = [];
  for (const f of NEW) {
    const s = src(f);
    for (const tok of ['#FF5A36', '#5FE873', '#B79CF0', 'emberDanger', 'brightHeal', 'violet']) if (s.includes(tok)) bad.push(`${f}: ${tok}`);
  }
  check('colour: nothing new draws in Ember, Bright Heal or Violet', bad.length === 0, bad);
  check('colour: the crit book is pale gold, the frost air its own cyan', src('src/render/vfx/signature.js').includes("const CRIT_BOOK = '#FFE7A8'"));
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
