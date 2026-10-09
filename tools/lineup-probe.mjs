#!/usr/bin/env node
// PARTY LINEUP probe (docs/LINEUP.md) — headless Node, the sim built like
// src/main.js.
//
//   node tools/lineup-probe.mjs
//
// Checks:
//   1. Data: normalizeLineup keeps a valid lineup and turns anything else
//      into the default four (Healer always on seat 0).
//   2. Default: a campaign with no lineup seats Tank, Swordsman, Archer on
//      seats 1-3 exactly as before (classes, bodies, max HP, pools).
//   3. A shuffled lineup (Healer, Archer, Tank, Swordsman): every seat's
//      class, body, max HP, draft pool and AI casts follow its class; the
//      Tank-only rules (Menace's taunt pull, Retaliate) follow the Tank to
//      its new seat; the UI lookup (classOfSeat) says the same.
//   4. Only a campaign takes a lineup: the legacy run and the tutorial stay
//      the default four, and the next campaign without one goes back to it.
//   5. Saves: a mid-fight save of the shuffled party applies into a fresh
//      world with the same lineup and continues bit-identically.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { ALLY_CLASSES } = await import(u('src/sim/allies.js'));
const L = await import(u('src/data/lineup.js'));
const C = await import(u('src/data/classes.js'));

function makeWorld(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const run = world.runSystem();
  const step = (snap = emptySnapshot()) => clock.stepOnce((t) => world.step(t, snap));
  return { world, registry, bus, clock, run, log, step, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const cmd = (W, ...a) => W.world.cmd(...a);
const ally = (W, seat) => W.registry.all().find((e) => e.kind === 'ally' && e.partyIndex === seat);
const party = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
const P = (W) => W.world.partySystem();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SHUFFLED = ['healer', 'archer', 'tank', 'swordsman'];

const steps = (W, n, each = null) => {
  for (let i = 0; i < n; i++) {
    W.step();
    if (each) each();
  }
};
// Into room 1's fight.
function campaign(seed, opts = {}) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, ...opts });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  return W;
}
// The seat's keys from slot 0 on (whatever room 1's draft gave is replaced).
function equip(W, seat, ids) {
  ids.forEach((id, k) => cmd(W, 'partySwap', seat, id, k));
}
// Room 1 cleared, the given skills equipped between rooms, then room 2's fight.
function secondRoom(W, kit) {
  cmd(W, 'partyMode', 'manual');
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  for (const [seat, ids] of Object.entries(kit)) equip(W, Number(seat), ids);
  cmd(W, 'skipToRoom', 2);
  for (let i = 0; i < 600 && !(W.run.view().phase === 'combat' && W.run.view().room === 2); i++) W.step();
  cmd(W, 'partyMode', 'auto');
}

// ---------------------------------------------------------------- 1. data --
{
  check(L.normalizeLineup(null) === L.DEFAULT_LINEUP, 'no lineup is the default four');
  check(same(L.DEFAULT_LINEUP, ['healer', 'tank', 'swordsman', 'archer']) && same(L.DEFAULT_LINEUP, C.CLASS_OF_SEAT), 'the default is the old seat map');
  check(same(L.normalizeLineup(SHUFFLED), SHUFFLED), 'a shuffled lineup is kept');
  check(L.normalizeLineup(['tank', 'healer', 'swordsman', 'archer']) === L.DEFAULT_LINEUP, 'the Healer must hold seat 0');
  check(L.normalizeLineup(['healer', 'tank', 'tank', 'archer']) === L.DEFAULT_LINEUP, 'a class twice is refused');
  check(L.normalizeLineup(['healer', 'tank', 'swordsman', 'wizard']) === L.DEFAULT_LINEUP, 'an unknown class is refused');
  check(L.normalizeLineup(['healer', 'tank', 'swordsman']) === L.DEFAULT_LINEUP, 'three seats are refused');
  check(same(L.benchOf(L.DEFAULT_LINEUP), []), 'the default four leave nobody at camp');
}

// ------------------------------------------------------------- 2. default --
{
  const W = campaign(3);
  const p = P(W);
  check(same(p.lineup(), L.DEFAULT_LINEUP), `a campaign with no lineup is the default (${p.lineup().join(',')})`);
  const rows = [1, 2, 3].map((i) => ({ seat: p.seat(i).classId, body: ally(W, i).classId, hp: ally(W, i).maxHp }));
  check(same(rows, [
    { seat: 'tank', body: 'tank', hp: 150 },
    { seat: 'swordsman', body: 'swordsman', hp: 95 },
    { seat: 'archer', body: 'archer', hp: 80 },
  ]), `seats 1-3: ${rows.map((r) => `${r.seat}/${r.body}/${r.hp}`).join(' ')}`);
  check(same(L.activeLineup(), L.DEFAULT_LINEUP), 'the UI lookup reads the default too');
}

// ------------------------------------------------------------ 3. shuffled --
{
  const W = campaign(3, { lineup: SHUFFLED });
  const p = P(W);
  check(same(p.lineup(), SHUFFLED), `the campaign takes the lineup (${p.lineup().join(',')})`);
  const rows = [1, 2, 3].map((i) => ({ seat: p.seat(i).classId, body: ally(W, i).classId, hp: ally(W, i).maxHp, full: ally(W, i).hp === ally(W, i).maxHp }));
  check(rows.every((r, k) => r.seat === SHUFFLED[k + 1] && r.body === SHUFFLED[k + 1] && r.hp === ALLY_CLASSES[SHUFFLED[k + 1]].maxHp && r.full), `each seat's class, body and max HP follow it: ${rows.map((r) => `${r.seat}/${r.body}/${r.hp}`).join(' ')}`);
  for (const i of [1, 2, 3]) {
    const cls = SHUFFLED[i];
    const pool = p.pools(i);
    check(pool.classSkills.every((id) => SKILLS[id].cls === cls) && same([...pool.classSkills].sort(), [...C.CLASS_SKILLS[cls]].sort()), `seat ${i} drafts from the ${cls}'s skills`);
  }
  check(same(L.activeLineup(), SHUFFLED) && L.classOfSeat(1) === 'archer' && L.seatOfClass('tank') === 2, 'the UI lookup reads the shuffled lineup');
  const partyView = cmd(W, 'partyView', 1);
  check(partyView && partyView.classId === 'archer', `partyView(1) names the Archer (${partyView && partyView.classId})`);
  // A foreign skill is refused on a seat: the Tank's skill on seat 1 (the Archer).
  const bad = cmd(W, 'partySwap', 1, 'heavy_slam', 0);
  check(!(cmd(W, 'partyView', 1).slots || []).includes('heavy_slam'), `seat 1 refuses a Tank skill (${JSON.stringify(bad && (bad.denied || bad.reason || bad.ok))})`);

  secondRoom(W, { 1: ['piercing_shot'], 2: ['taunting_roar', 'heavy_slam'], 3: ['flurry'] });
  const from = W.log.length;
  steps(W, 1500, () => mend(W));
  const casts = W.log.slice(from).filter((e) => e.type === 'ally_cast' && !e.echo);
  const bySeat = (i) => casts.filter((e) => e.partyIndex === i);
  for (const i of [1, 2, 3]) {
    const mine = bySeat(i);
    const okCls = mine.length > 0 && mine.every((e) => e.classId === SHUFFLED[i] && SKILLS[e.skill] && SKILLS[e.skill].cls === SHUFFLED[i]);
    check(okCls, `seat ${i} (${SHUFFLED[i]}) casts its own class's skills in a fight (${mine.length} casts: ${[...new Set(mine.map((e) => e.skill))].join(',')})`);
  }
  const basics = W.log.slice(from).filter((e) => e.type === 'ally_basic');
  const basicOk = basics.length > 0 && basics.every((e) => e.classId === SHUFFLED[e.partyIndex] && e.shape === ALLY_CLASSES[SHUFFLED[e.partyIndex]].basicShape);
  check(basicOk && basics.some((e) => e.partyIndex === 1), `every basic attack is its seat's class's (${[1, 2, 3].map((i) => `${i}:${basics.filter((e) => e.partyIndex === i).length}`).join(' ')})`);
  // Menace (the Tank's taunt pull) follows the Tank to seat 2.
  const threat = cmd(W, 'threat') || {};
  check(Object.keys(threat).map(Number).includes(ally(W, 2).id) && Object.keys(threat).length === 1, `Menace weighs the Tank on seat 2 (${JSON.stringify(threat)}, tank ${ally(W, 2).id})`);

  // ------------------------------------------------------------ 5. saves --
  const snap = clonePlain(W.io.capture());
  steps(W, 300, () => mend(W));
  const h1 = hashState(W.io.capture());
  // A fresh world starts on the default four; the save brings the lineup.
  const W2 = makeWorld(3);
  const ok = W2.io.apply(clonePlain(snap)).ok;
  check(ok, 'the save applies');
  check(same(P(W2).lineup(), SHUFFLED) && [1, 2, 3].every((i) => ally(W2, i).classId === SHUFFLED[i] && P(W2).seat(i).classId === SHUFFLED[i]), 'the loaded world has the shuffled lineup');
  check(same(L.activeLineup(), SHUFFLED), 'a load sets the UI lookup');
  steps(W2, 300, () => mend(W2));
  const h2 = hashState(W2.io.capture());
  check(h1 === h2, `a mid-fight save of the shuffled party continues bit-identically (${h1} / ${h2})`);
}

// ----------------------------------------------------- 4. only campaigns --
{
  const W = makeWorld(5);
  W.run.startCampaign({ level: 1, harness: true, lineup: SHUFFLED });
  check(same(P(W).lineup(), SHUFFLED), 'campaign one: shuffled');
  cmd(W, 'abandonRun');
  for (let i = 0; i < 200; i++) W.step();
  W.run.startRun({ act: 1 });
  check(same(P(W).lineup(), L.DEFAULT_LINEUP) && [1, 2, 3].every((i) => ally(W, i).classId === L.DEFAULT_LINEUP[i] && ally(W, i).maxHp === ALLY_CLASSES[L.DEFAULT_LINEUP[i]].maxHp), 'the legacy run is always the default four');
  W.run.startCampaign({ level: 1, harness: true, tutorial: true, lineup: SHUFFLED });
  check(same(P(W).lineup(), L.DEFAULT_LINEUP), 'the tutorial is always the default four');
  W.run.startCampaign({ level: 1, harness: true, lineup: SHUFFLED });
  W.run.startCampaign({ level: 1, harness: true });
  check(same(P(W).lineup(), L.DEFAULT_LINEUP) && same(L.activeLineup(), L.DEFAULT_LINEUP), 'a campaign without a lineup goes back to the default');
  W.run.startCampaign({ level: 1, harness: true, endless: true, lineup: SHUFFLED });
  check(same(P(W).lineup(), SHUFFLED), 'Endless takes a lineup');
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
