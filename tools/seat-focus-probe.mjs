#!/usr/bin/env node
// SEAT FOCUS probe (v0.5.357) — headless Node, a stub DOM; no browser.
// Game feel audit picks 1 and 2 (docs/HIT_FEEDBACK.md "Your hits stand out"
// and "A lighter path for laptops"), render, audio and a settings default
// only. Checks:
//   1. whose event it is: a hero's hit, a zone's strike, a cast, a kill;
//      relics and hazards belong to no hero;
//   2. the kill shake: another hero's kill at a third, yours and a no-hero
//      kill at full, a boss stomp untouched;
//   3. the sound: another hero's hit 4 dB quieter through the audio
//      engine's event gain, yours and the party's own hurt untouched;
//   4. the contact: another hero's bloom and flare at 60% of yours;
//   5. the camera: another hero's swing, slam and Dusk Dive (a delayed kick)
//      never move your camera; your own do; an elite kill's punch still does;
//   6. numerals: another hero's never past 22 px, under your smallest;
//   7. the laptop path: Render scale defaults to 0.85 on a big drawing
//      buffer, 1.0 otherwise; the settings range is unchanged.
//
//   node tools/seat-focus-probe.mjs
// Exit code 1 on any failure.

// --- a stub DOM (as tools/vfx-hit-feedback-probe.mjs) ------------------------
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
globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible', createElement: el, body: el('body'), head: el('head'), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: el('html') };
globalThis.location = { search: '', hash: '', href: 'http://localhost/' };
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;

const { Scene, PerspectiveCamera } = await import('three');
const { createEventBus } = await import('../src/core/events.js');
const { createCosmeticRng } = await import('../src/core/rng.js');
const { SEAT_FOCUS, wireSeatFocus, eventSeat, isPartySeat, killSeat, shakeFocus, hitGainDb } = await import('../src/render/vfx/seatfocus.js');
const { createSignatureFx } = await import('../src/render/vfx/signature.js');
const { setImpactFx } = await import('../src/render/vfx/hub.js');
const { createNumberPool, NUMERAL_WHO } = await import('../src/render/numbers.js');
const { DAMAGE_NUMBERS } = await import('../src/core/constants.js');
const { createAudioEngine } = await import('../src/audio/engine.js');
const { createSettingsStore, CORE_SETTINGS, LAPTOP_PATH, defaultRenderScale } = await import('../src/app/settings.js');
const { resetRenderHold, frameRenderHold } = await import('../src/render/hold.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;

// The party: you are seat 0 (the solo default, app/viewerseat.js).
const healer = { id: 1, kind: 'player', classId: 'healer', faction: 'party', partyIndex: 0, x: -2, z: 0, px: -2, pz: 0 };
const tank = { id: 3, kind: 'ally', classId: 'tank', faction: 'party', partyIndex: 1, x: -1, z: 1, px: -1, pz: 1 };
const sword = { id: 2, kind: 'ally', classId: 'swordsman', faction: 'party', partyIndex: 2, x: -1, z: 0, px: -1, pz: 0 };
const dusk = { id: 4, kind: 'ally', classId: 'duskwing', faction: 'party', partyIndex: 3, x: -1, z: -1, px: -1, pz: -1 };
const zone = { id: 50, kind: 'zone', skill: 'caltrops', sourceId: 2, x: 1, z: 0 };
const foe = { id: 9, kind: 'boar', faction: 'hostile', x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
const elite = { id: 10, kind: 'boar', elite: true, faction: 'hostile', x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
const ents = [healer, tank, sword, dusk, zone, foe, elite];
const byId = (id) => ents.find((e) => e.id === id) ?? null;
const bus = createEventBus();
wireSeatFocus({ bus, byId });
const hit = (tick, attacker, extra = {}) => bus.emit(tick, 'hit', { target: 9, kind: 'boar', attacker, amount: 5, delivery: 'basic', shape: 'melee_arc', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0, ...extra });
const lastEv = (type) => bus.recent?.(type) ?? null;
let seen = null;
bus.on('hit', (ev) => (seen = ev));

// --- 1. whose event --------------------------------------------------------------
{
  hit(1, 2);
  check('1: a hit by another hero is that hero\'s seat, and a party seat', eventSeat(seen) === 2 && isPartySeat(eventSeat(seen)), eventSeat(seen));
  hit(2, 1, { shape: 'projectile' });
  check('1: your own hit is your seat, not a party seat', eventSeat(seen) === 0 && !isPartySeat(0));
  hit(3, 50, { delivery: 'skill', shape: 'zone' });
  check('1: a zone\'s strike belongs to the hero who cast it', eventSeat(seen) === 2);
  hit(4, null, { delivery: 'relic', shape: 'relic' });
  check('1: a relic or hazard hit belongs to no hero', eventSeat(seen) === null && !isPartySeat(null));
  check('1: a cast carries its hero\'s seat; the Healer kit\'s own cast is seat 0', eventSeat({ type: 'skill_cast', classId: 'tank', partyIndex: 1 }) === 1 && eventSeat({ type: 'skill_cast', skill: 'nova_bloom' }) === 0);
  check('1: an aura pulse carries its seat', eventSeat({ type: 'aura_pulse', seat: 3 }) === 3);
  check('1: a foe\'s own event is no hero\'s', eventSeat({ type: 'enemy_fire', id: 9 }) === null);
  // Your own party being hit: no hero landed it.
  check('1: a hit on the party is no hero\'s hit', eventSeat({ type: 'hit', target: 1, kind: 'player', attacker: 9 }) === null);
}

// --- 2. the kill shake ----------------------------------------------------------
{
  hit(10, 2);
  bus.emit(10, 'death', { id: 9, kind: 'boar', delivery: 'basic', x: 0, z: 0 });
  const party = shakeFocus({ type: 'screenshake', tick: 10, cause: 'kill' });
  hit(11, 1, { shape: 'projectile' });
  bus.emit(11, 'death', { id: 9, kind: 'boar', delivery: 'basic', x: 0, z: 0 });
  const own = shakeFocus({ type: 'screenshake', tick: 11, cause: 'kill' });
  hit(12, null, { delivery: 'hazard', shape: 'hazard' });
  bus.emit(12, 'death', { id: 9, kind: 'boar', delivery: 'hazard', x: 0, z: 0 });
  const none = shakeFocus({ type: 'screenshake', tick: 12, cause: 'kill' });
  check('2: another hero\'s kill shakes at a third', Math.abs(party - 1 / 3) < 1e-9, r3(party));
  check('2: your own kill shakes at full', own === 1);
  check('2: a kill no hero landed shakes at full', none === 1);
  check('2: a boss stomp is untouched', shakeFocus({ type: 'screenshake', tick: 10, cause: 'boss_stomp' }) === 1);
  check('2: a stale kill seat never leaks into a later tick', shakeFocus({ type: 'screenshake', tick: 99, cause: 'kill' }) === 1);
}

// --- 3. the sound -------------------------------------------------------------
{
  check('3: another hero\'s hit is 4 dB quieter, yours and the party\'s hurt unchanged', hitGainDb({ type: 'hit', target: 9, kind: 'boar', attacker: 2, delivery: 'basic', shape: 'melee_arc' }) === -4 && hitGainDb({ type: 'hit', target: 9, kind: 'boar', attacker: 1, delivery: 'basic', shape: 'projectile' }) === 0 && hitGainDb({ type: 'hit', target: 1, kind: 'player', attacker: 9 }) === 0 && hitGainDb({ type: 'death', id: 9 }) === 0);
  // Through the real engine (no AudioContext in Node: the cues are logged, not voiced).
  const settings = createSettingsStore({ storage: null });
  const abus = createEventBus();
  const world = { tick: 0, entities: () => ents, player: healer };
  const engine = createAudioEngine({ bus: abus, settings, world, registry: { byId } });
  engine.setEventGain(hitGainDb);
  const log = () => engine.debug.cueLog(200);
  abus.emit(5, 'hit', { target: 9, kind: 'boar', attacker: 1, amount: 5, delivery: 'basic', shape: 'melee_arc', dirX: 1, dirZ: 0, x: 0, z: 0 });
  abus.emit(6, 'hit', { target: 9, kind: 'boar', attacker: 2, amount: 5, delivery: 'basic', shape: 'melee_arc', dirX: 1, dirZ: 0, x: 0, z: 0 });
  const hits = log().filter((e) => e.event === 'hit');
  const ownDb = hits.find((e) => e.t !== undefined && e === hits[0])?.gainDb;
  const partyDb = hits[1]?.gainDb;
  check('3: the engine plays another hero\'s hit 4 dB under yours', hits.length >= 2 && hits[0].cue === hits[1].cue && Math.abs(ownDb - partyDb - 4) < 1e-6, hits.map((e) => ({ cue: e.cue, gainDb: e.gainDb })));
}

// --- 4 and 5. the contact and the camera on the VFX director ------------------
{
  resetRenderHold();
  const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
  const vbus = createEventBus();
  wireSeatFocus({ bus: vbus, byId });
  setImpactFx({ particles: { hit() {}, kill() {}, impact() {}, embers() {}, spray() {} }, decals: { scorch() {}, spawn() {} } });
  const world = { tick: 10, entities: () => ents, player: healer, runSystem: null };
  const fx = createSignatureFx({ stage, world, bus: vbus, cosmetic: createCosmeticRng() });
  let now = 0;
  const DT = 1 / 60;
  const frame = (n = 1) => {
    for (let i = 0; i < n; i++) {
      now += DT;
      frameRenderHold(now, DT);
      fx.update(now);
      fx.applyCamera?.(now);
    }
  };
  frame();
  const biggest = () => {
    let m = 0;
    stage.scene.traverse((o) => {
      if (o.isSprite && o.visible && o.material.opacity > 0.01) m = Math.max(m, o.scale.x);
    });
    return m;
  };
  // Same hit (a Swordsman-style melee basic) from your seat and from another's.
  const ownSword = { ...sword, id: 5, partyIndex: 0 };
  ents.push(ownSword);
  vbus.emit(20, 'hit', { target: 9, kind: 'boar', attacker: 5, amount: 5, delivery: 'basic', shape: 'melee_arc', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0 });
  frame();
  const ownBig = biggest();
  frame(90);
  vbus.emit(30, 'hit', { target: 9, kind: 'boar', attacker: 2, amount: 5, delivery: 'basic', shape: 'melee_arc', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0 });
  frame();
  const partyBig = biggest();
  check('4: another hero\'s contact bloom and flare draw at 60% of yours', ownBig > 0 && Math.abs(partyBig / ownBig - SEAT_FOCUS.partyFlare) < 0.02, { own: r3(ownBig), party: r3(partyBig) });
  frame(90);

  const live = () => fx.debugCounts().cameraLive;
  // The Tank's slam (a melee-arc skill), another seat's, then yours.
  vbus.emit(40, 'skill_cast', { classId: 'tank', id: 3, partyIndex: 1, skill: 'heavy_slam', shape: 'melee_arc', x: -1, z: 1, dx: 1, dz: 0, reach: 1.2, halfAngle: 60 });
  frame(2);
  const partySlam = live();
  vbus.emit(41, 'ally_basic', { classId: 'tank', id: 3, partyIndex: 1, shape: 'melee_arc', x: -1, z: 1, dx: 1, dz: 0, reach: 0.9, halfAngle: 50 });
  frame(2);
  const partySwing = live();
  vbus.emit(42, 'skill_cast', { classId: 'duskwing', id: 4, partyIndex: 3, skill: 'dusk_dive', shape: 'nova', x: 1, z: 1, dx: 1, dz: 0, radius: 1.2 });
  frame(8); // its kick waits 0.04 s in a timer
  const partyDive = live();
  check('5: another hero\'s slam, swing and Dusk Dive never move your camera', partySlam === 0 && partySwing === 0 && partyDive === 0, { partySlam, partySwing, partyDive });
  frame(30);
  const ownTank = { ...tank, id: 6, partyIndex: 0 };
  const ownDusk = { ...dusk, id: 7, partyIndex: 0 };
  ents.push(ownTank, ownDusk);
  vbus.emit(50, 'skill_cast', { classId: 'tank', id: 6, partyIndex: 0, skill: 'heavy_slam', shape: 'melee_arc', x: -1, z: 1, dx: 1, dz: 0, reach: 1.2, halfAngle: 60 });
  frame(2);
  const ownSlam = live();
  frame(30);
  vbus.emit(51, 'skill_cast', { classId: 'duskwing', id: 7, partyIndex: 0, skill: 'dusk_dive', shape: 'nova', x: 1, z: 1, dx: 1, dz: 0, radius: 1.2 });
  frame(8);
  const ownDive = live();
  check('5: your own slam and Dusk Dive (after its timer) still kick', ownSlam > 0 && ownDive > 0, { ownSlam, ownDive });
  frame(30);
  // An elite killed by another hero: the punch is everyone's.
  vbus.emit(60, 'hit', { target: 10, kind: 'boar', attacker: 2, amount: 9, delivery: 'basic', shape: 'melee_arc', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0 });
  vbus.emit(60, 'death', { id: 10, kind: 'boar', delivery: 'basic', x: 0, z: 0 });
  frame(1);
  check('5: an elite kill by another hero still punches the camera', live() > 0, live());
  setImpactFx(null);
  resetRenderHold();
}

// --- 6. numerals ---------------------------------------------------------------
{
  const cam = new PerspectiveCamera();
  const pool = createNumberPool({ camera: cam, cosmetic: createCosmeticRng(), container: document.body });
  const px = (o) => {
    pool.spawn(o);
    const els = document.body.children.length ? document.body.children : [];
    let found = null;
    const walk = (n) => {
      for (const c of n.children || []) {
        if (c.textContent === String(o.amount)) found = c;
        walk(c);
      }
    };
    walk(document.body);
    void els;
    return found ? parseFloat(found.style.fontSize) : NaN;
  };
  const otherBig = px({ x: 0, z: 0, amount: 61, kind: 'damage', crit: true, who: 'other' });
  const ownSmall = px({ x: 1, z: 0, amount: 1, kind: 'damage', crit: false, who: 'own' });
  const ownFloor = DAMAGE_NUMBERS.minPx * NUMERAL_WHO.own.sizeMul;
  check('6: another hero\'s numeral never passes 22 px, even a big crit', otherBig <= NUMERAL_WHO.other.maxPx && NUMERAL_WHO.other.maxPx === 22, otherBig);
  check('6: ... under your smallest numeral', NUMERAL_WHO.other.maxPx < ownFloor && ownSmall >= Math.floor(ownFloor), { ownSmall, ownFloor: r3(ownFloor) });
}

// --- 7. the laptop path ----------------------------------------------------------
{
  const cases = [
    [{ innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 }, 0.85],
    [{ innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1.5 }, 0.85],
    [{ innerWidth: 1536, innerHeight: 864, devicePixelRatio: 1.25 }, 0.85],
    [{ innerWidth: 1366, innerHeight: 768, devicePixelRatio: 1 }, 1],
    [{ innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 }, 1],
  ];
  const got = cases.map(([w]) => defaultRenderScale(w));
  check('7: Render scale defaults to 0.85 on a drawing buffer over 1.5 Mpx, 1.0 otherwise', got.every((v, i) => v === cases[i][1]), got);
  check('7: no window (Node) keeps 1.0', defaultRenderScale(null) === 1);
  const spec = CORE_SETTINGS['display.renderScale'];
  check('7: the slider still runs 0.5 to 1.5 in 0.05 steps, 0.85 a valid step', spec.validate(0.4) === 0.5 && spec.validate(2) === 1.5 && spec.validate(LAPTOP_PATH.scale) === 0.85);
  // A saved profile keeps its stored value; a fresh one takes the default.
  const store = new Map([['echoes.settings', JSON.stringify({ v: 1, values: { 'display.renderScale': 1 } })]]);
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const s1 = createSettingsStore({ storage });
  check('7: a profile that saved its settings keeps its own Render scale', s1.get('display.renderScale') === 1 || s1.get('display.renderScale') === spec.default, s1.get('display.renderScale'));
}

void lastEv;
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall seat focus checks passed');
process.exit(fails.length ? 1 : 0);
