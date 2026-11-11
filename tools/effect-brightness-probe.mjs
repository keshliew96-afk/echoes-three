#!/usr/bin/env node
// EFFECT BRIGHTNESS probe (v0.5.359) — headless Node, a stub DOM; no browser.
// Kesh's pick C from /mnt/project-files/effect-brightness/BRIGHTNESS_REVIEW.md
// (docs/HIT_FEEDBACK.md "The light budget"): render only. Checks:
//   1. the bloom pass: strength 0.9 (was 1.35), threshold and radius as before;
//   2. the foe hit flash: 0.45 (was 1.0); a champion's lit level stays 0.4 and
//      the Gale Herald's 0.25, as before;
//   3. the class kit's light budget: flashes and stars on one spot give way
//      by 1 / (1 + per * n) down to the floor, one event's own pieces never
//      count each other, a lone one and one out of
//      reach stay full, out of scope nothing changes, rings never give way;
//   4. the template kit's blasts share the same budget with the class kit;
//   5. on the VFX director: four heroes' hits and a kill on one spot draw at
//      most 70% of their light drawn one by one (your own hit, first, stays
//      full; the others already draw at 60%); a foe's hit on a hero in the
//      middle of it keeps its full flash.
//
//   node tools/effect-brightness-probe.mjs
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
const { HITFLASH } = await import('../src/core/constants.js');
const { BLOOM } = await import('../src/render/stage.js');
const { CHAMPION_BUILDERS, CHAMPION_FLASH } = await import('../src/render/enemies/champions.js');
const { createVfxKit, LIGHT_BUDGET, lightBudget } = await import('../src/render/vfx/kit.js');
const { createTemplateKit } = await import('../src/render/vfx/tplkit.js');
const { createSignatureFx } = await import('../src/render/vfx/signature.js');
const { wireSeatFocus } = await import('../src/render/vfx/seatfocus.js');
const { setImpactFx } = await import('../src/render/vfx/hub.js');
const { resetRenderHold, frameRenderHold } = await import('../src/render/hold.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const near = (a, b) => Math.abs(a - b) < 1e-6;

// --- 1. the bloom pass ------------------------------------------------------------
check('1: bloom strength 0.9 (was 1.35)', BLOOM.strength === 0.9, BLOOM.strength);
check('1: bloom threshold 0.68 and radius 0.6 unchanged', BLOOM.threshold === 0.68 && BLOOM.radius === 0.6, BLOOM);

// --- 2. the foe hit flash ---------------------------------------------------------
check('2: the foe hit flash lights at 0.45 (was 1.0)', HITFLASH.intensity === 0.45 && HITFLASH.ticks === 3, HITFLASH);
check('2: a champion still lights at 0.4', near(CHAMPION_FLASH * HITFLASH.intensity, 0.4), r3(CHAMPION_FLASH * HITFLASH.intensity));
{
  const herald = CHAMPION_BUILDERS.gale_herald(createCosmeticRng());
  check('2: the Gale Herald still lights at 0.25', near(herald.flashScale * HITFLASH.intensity, 0.25), r3(herald.flashScale * HITFLASH.intensity));
  const briar = CHAMPION_BUILDERS.briar_knight(createCosmeticRng());
  check('2: every other champion takes the champions\' level', briar.flashScale === CHAMPION_FLASH);
}

// --- 3. the class kit's light budget ----------------------------------------------
{
  let on = true;
  const kit = createVfxKit({ stage: { scene: new Scene() }, cosmetic: createCosmeticRng(), budgeted: () => on });
  const ops = [];
  for (let i = 0; i < 8; i++) ops.push((kit.newGroup(), kit).flash({ x: 0, z: 0, size: 1, life: 1, opacity: 1 }).op);
  const want = ops.map((_, i) => ops[0] * lightBudget(i));
  const kitA = createVfxKit({ stage: { scene: new Scene() }, cosmetic: createCosmeticRng(), budgeted: () => true });
  kitA.newGroup();
  const own = [0, 1, 2].map(() => kitA.flash({ x: 0, z: 0, size: 1, life: 1, opacity: 1 }).op);
  check('3: one event\'s own pieces never count each other (a lone hit is untouched)', own.every((v) => near(v, own[0])), own.map(r3));
  check('3: a lone flash is untouched; each one stacked on it gives way by 1 / (1 + per * n)', ops.every((v, i) => near(v, want[i])), ops.map(r3));
  check('3: the budget never goes under its floor', near(lightBudget(100), LIGHT_BUDGET.floor) && Math.min(...ops) >= ops[0] * LIGHT_BUDGET.floor - 1e-9);
  kit.newGroup();
  const star0 = kit.star({ x: 0, z: 0, size: 1, life: 1 }).op;
  check('3: a star shares the same budget as the flashes', near(star0, 0.9 * lightBudget(8)), r3(star0));
  kit.newGroup();
  const far = kit.flash({ x: LIGHT_BUDGET.radius + 0.5, z: 0, size: 1, life: 1, opacity: 1 }).op;
  check('3: a flash out of reach of the stack stays full', near(far, ops[0]), r3(far));
  on = false;
  kit.newGroup();
  const out = kit.flash({ x: 0, z: 0, size: 1, life: 1, opacity: 1 }).op;
  check('3: outside the scope (a foe\'s tell) a flash stays full in the stack', near(out, ops[0]), r3(out));
  kit.newGroup();
  const forced = kit.flash({ x: 0, z: 0, size: 1, life: 1, opacity: 1, budget: true }).op;
  check('3: the contact bloom asks for the budget even outside the scope', forced < ops[0] * 0.5, r3(forced));
  // Rings never give way: the same ring alone and inside the stack.
  const kit2 = createVfxKit({ stage: { scene: new Scene() }, cosmetic: createCosmeticRng(), budgeted: () => true });
  const ringAlone = kit2.ring({ x: 0, z: 0, r0: 0.2, r1: 1, life: 1 });
  const aloneOp = ringAlone.op ?? ringAlone.u?.uOpacity?.value;
  kit.ring({ x: 0, z: 0, r0: 0.2, r1: 1, life: 1 });
  const stacked = kit.ring({ x: 0, z: 0, r0: 0.2, r1: 1, life: 1 });
  const stackedOp = stacked.op ?? stacked.u?.uOpacity?.value;
  check('3: a ring is never dimmed by the budget', aloneOp !== undefined && near(aloneOp, stackedOp), { alone: aloneOp, stacked: stackedOp });
}

// --- 4. the template kit's blasts share it ------------------------------------------
{
  let kitN = 0;
  let on = true;
  const tk = createTemplateKit({ stage: { scene: new Scene() }, cosmetic: createCosmeticRng(), budgeted: () => on, neighbours: () => kitN });
  const alone = tk.blast({ x: 5, z: 5, opacity: 1 }).op;
  kitN = 4;
  const shared = tk.blast({ x: -5, z: -5, opacity: 1 }).op;
  check('4: a blast among four class-kit flashes and stars gives way to them', near(shared, alone * lightBudget(4)), { alone: r3(alone), shared: r3(shared) });
  on = false;
  const out = tk.blast({ x: 20, z: 20, opacity: 1 }).op;
  check('4: outside the scope a blast is untouched by the class kit', near(out, alone), r3(out));
  const kit = createVfxKit({ stage: { scene: new Scene() }, cosmetic: createCosmeticRng(), budgeted: () => true, neighbours: (x, z, r) => tk.blastsNear(x, z, r) });
  tk.setGroup(kit.newGroup());
  const f = kit.flash({ x: 5, z: 5, size: 1, life: 1, opacity: 1 }).op;
  const g = kit.flash({ x: 50, z: 50, size: 1, life: 1, opacity: 1 }).op;
  check('4: a class-kit flash gives way to a live template blast', near(f, g * lightBudget(1)), { at: r3(f), clear: r3(g) });
}

// --- 5. on the VFX director ---------------------------------------------------------
{
  resetRenderHold();
  const healer = { id: 1, kind: 'player', classId: 'healer', faction: 'party', partyIndex: 0, x: -2, z: 0, px: -2, pz: 0 };
  const tank = { id: 3, kind: 'ally', classId: 'tank', faction: 'party', partyIndex: 1, x: -1, z: 1, px: -1, pz: 1 };
  const sword = { id: 2, kind: 'ally', classId: 'swordsman', faction: 'party', partyIndex: 2, x: -1, z: 0, px: -1, pz: 0 };
  const archer = { id: 4, kind: 'ally', classId: 'archer', faction: 'party', partyIndex: 3, x: -1, z: -1, px: -1, pz: -1 };
  const foe = { id: 9, kind: 'boar', faction: 'hostile', x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, radius: 0.4 };
  const ents = [healer, tank, sword, archer, foe];
  const byId = (id) => ents.find((e) => e.id === id) ?? null;
  setImpactFx({ particles: { hit() {}, kill() {}, impact() {}, embers() {}, spray() {} }, decals: { scorch() {}, spawn() {} } });
  const DT = 1 / 60;
  // Total additive sprite light (opacity x area) on screen one frame after `emit`.
  function lightOf(emit) {
    const stage = { scene: new Scene(), camera: new PerspectiveCamera() };
    const vbus = createEventBus();
    wireSeatFocus({ bus: vbus, byId });
    const world = { tick: 10, entities: () => ents, player: healer, runSystem: null };
    const fx = createSignatureFx({ stage, world, bus: vbus, cosmetic: createCosmeticRng() });
    let now = 0;
    const frame = () => { now += DT; frameRenderHold(now, DT); fx.update(now); };
    frame();
    emit(vbus);
    frame();
    let sum = 0;
    stage.scene.traverse((o) => { if (o.isSprite && o.visible && o.material.blending === 2) sum += o.material.opacity * o.scale.x * o.scale.y; });
    let ember = 0;
    stage.scene.traverse((o) => { if (o.isSprite && o.visible && o.material.blending === 2 && o.material.color.r > o.material.color.g * 1.6) ember = Math.max(ember, o.material.opacity); });
    return { sum, ember };
  }
  const hitBy = (v, tick, attacker) => v.emit(tick, 'hit', { target: 9, kind: 'boar', attacker, amount: 5, delivery: 'basic', shape: 'melee_arc', kb: 0.3, dirX: 1, dirZ: 0, x: 0, z: 0 });
  const kill = (v, tick) => v.emit(tick, 'death', { id: 9, kind: 'boar', delivery: 'basic', x: 0, z: 0 });
  const one = [1, 3, 2, 4].map((a) => lightOf((v) => hitBy(v, 20, a)).sum);
  const killAlone = lightOf((v) => { hitBy(v, 20, 2); kill(v, 20); }).sum - one[2];
  const apart = one.reduce((a, b) => a + b, 0) + killAlone;
  const stack = lightOf((v) => { for (const a of [1, 3, 2, 4]) hitBy(v, 20, a); kill(v, 20); }).sum;
  check('5: four heroes\' hits and a kill on one spot draw at most 70% of their light drawn one by one', apart > 0 && stack <= apart * 0.7, { apart: r3(apart), stack: r3(stack), share: r3(stack / apart) });
  const foeHit = (v) => v.emit(21, 'hit', { target: 1, kind: 'player', attacker: 9, amount: 5, delivery: 'contact', shape: 'contact', kb: 0, dirX: 1, dirZ: 0, x: 0, z: 0 });
  const tellAlone = lightOf(foeHit).ember;
  const tellInStack = lightOf((v) => { for (const a of [1, 3, 2, 4]) hitBy(v, 20, a); kill(v, 20); foeHit(v); }).ember;
  check('5: a foe\'s hit on a hero keeps its full Ember flash inside the stack', tellAlone > 0 && tellInStack >= tellAlone - 1e-6, { alone: r3(tellAlone), inStack: r3(tellInStack) });
}

if (fails.length) {
  console.log(`\n${fails.length} effect brightness check(s) FAILED`);
  process.exit(1);
}
console.log('\nall effect brightness checks passed');
