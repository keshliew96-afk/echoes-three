#!/usr/bin/env node
// THE BELLWRIGHT, her whole kit (docs/BELLWRIGHT.md, content plan 4 slice 5)
// — headless Node, the sim built like src/main.js (the harness of
// tools/tidecaller-kit-probe.mjs).
//
//   node tools/bellwright-kit-probe.mjs
//
// Checks:
//   1. Data and gate: eleven skills, eight class nodes, all campaign-only,
//      her AI order holds all eleven, her node pool (12 shared + 8).
//   2. Node verdicts: which of her skills each node works on.
//   3. The seven new skills on training dummies: the Great Bell (a bigger
//      bell that slows harder and counts against the three), the Knell
//      (pierces, +50% in a ring), Bell Swing (an arc that pushes), Wing Hop
//      (a hop away, a handbell where she stood), Vesper Chime (the two
//      members enemies are after), Tuning Fork (shield and haste round her),
//      the Carillon (rings every bell, dazes, and starts their time over).
//   4. The eight nodes, each on a skill it works on.
//   5. The AI plays her whole kit in a real fight.
//   6. A mid-fight save with bells hung and nodes socketed continues
//      bit-identically.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

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
const { frameFromSnapshot, seatInputOf } = await import(u('src/sim/netseats.js'));
const { NODES, classVerdict } = await import(u('src/sim/nodes.js'));
const STATUS = await import(u('src/sim/status.js'));
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
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
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
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (v, w, eps = 0.02) => Math.abs(v - w) <= eps;
const TOLLY = ['healer', 'tank', 'swordsman', 'bellwright'];
const BASE = ['hang_bell', 'peal', 'clapper', 'hum'];
const NEW = ['great_bell', 'knell', 'bell_swing', 'wing_hop', 'vesper_chime', 'tuning_fork', 'carillon'];
const ALL = [...BASE, ...NEW];
const NODE_IDS = ['bronze', 'clangour', 'resound', 'aftertone', 'tuned', 'cloister', 'belfry', 'sympathy'];

function campaign(seed) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, lineup: TOLLY });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  cmd(W, 'partyMode', 'manual');
  return W;
}
// Between rooms (a loadout only changes there): clear the room, put `ids` on
// Tolly's keys (the rest padded with skills she will not be asked to cast;
// never the Hum, which pulses on its own), socket `nodes` ({ skill: [node,
// ...] }), then walk into the next room.
function room(W, ids, nodes = {}) {
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  const pads = ALL.filter((id) => id !== 'hum' && !ids.includes(id));
  const desired = [...ids, ...pads].slice(0, 4);
  for (let k = 0; k < 4; k++) {
    const s = cmd(W, 'partyView', 3).slots;
    if (s[k] === desired[k]) continue;
    const j = s.indexOf(desired[k]);
    if (j >= 0) cmd(W, 'partySwap', 3, ALL.find((id) => id !== 'hum' && !s.includes(id) && !desired.includes(id)), j);
    cmd(W, 'partySwap', 3, desired[k], k);
  }
  for (const [skill, list] of Object.entries(nodes)) {
    for (const n of list) {
      cmd(W, 'partyGrantNode', 3, n);
      const r = cmd(W, 'partySocket', 3, skill, n);
      if (r && r.error) console.log('   socket', skill, n, JSON.stringify(r));
    }
  }
  const next = (W.run.view().room ?? 1) + 1;
  cmd(W, 'skipToRoom', next);
  for (let i = 0; i < 900 && !(W.run.view().phase === 'combat' && W.run.view().room === next); i++) W.step();
  quiet(W);
  return same(cmd(W, 'partyView', 3).slots, desired);
}
// A quiet room: the room's own enemies are held in a far corner every tick
// (alive, so the room never clears and ends the bells) and their shots
// lifted out, so only the training dummies stand near the party.
function quiet(W) {
  for (const e of W.registry.all()) {
    if (e.faction === 'hostile' && e.kind !== 'dummy' && e.hp > 0) {
      e.x = e.px = 9;
      e.z = e.pz = 9;
      e.telegraph = null;
    } else if (e.kind === 'eshot' || e.kind === 'eglob') W.registry.despawn(e.id);
  }
}
// Every seat is held by a (silent) human, so no AI casts: only partyCast does.
function stepHuman(W) {
  W.clock.stepOnce((t) => {
    const f = () => seatInputOf([frameFromSnapshot(emptySnapshot(), { seq: t, tick: t, viewTick: t })]);
    W.world.step(t, emptySnapshot(), { seats: { 1: f(), 2: f(), 3: f() }, reasons: {}, player: 'human', rewind: null });
  });
}
function steps(W, n, { calm = true } = {}) {
  for (let i = 0; i < n; i++) {
    if (calm) quiet(W);
    stepHuman(W);
    mend(W);
  }
}
const dummies = (W) => W.registry.all().filter((e) => e.kind === 'dummy');
function spawnAt(W, pts) {
  return pts.map(([x, z]) => {
    const d = W.registry.byId(cmd(W, 'spawn', 'dummy', x, z));
    d.hp = d.maxHp = 5000;
    return d;
  });
}
function park(W, x, z) {
  const r = ally(W, 3);
  r.x = r.px = x;
  r.z = r.pz = z;
  r.faceX = 1;
  r.faceZ = 0;
  r.cds = [0, 0, 0, 0];
  return r;
}
const bellsOf = (W, id) => W.registry.all().filter((z) => z.kind === 'azone' && z.bell && z.sourceId === id);
const unbell = (W) => W.registry.all().filter((z) => z.kind === 'azone' && z.bell).forEach((z) => W.registry.despawn(z.id));

// ---------------------------------------------------------- 1. data / gate --
{
  check(same(C.CLASS_SKILLS.bellwright, ALL) && ALL.every((id) => SKILLS[id] && SKILLS[id].cls === 'bellwright'), 'eleven skills, all hers');
  check(ALL.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(ALL, false).length === 0, 'all eleven are campaign-only');
  check(same([...C.AI_PRIORITY.bellwright].sort(), [...ALL].sort()), 'her AI order ranks all eleven');
  check(same(C.CLASS_NODES.bellwright, NODE_IDS) && NODE_IDS.every((id) => NODES[id] && NODES[id].cls === 'bellwright' && NODES[id].kind === 'technique'), 'eight class nodes, all hers');
  check(NODE_IDS.filter((id) => NODES[id].rarity === 'rare').join(',') === 'belfry,sympathy', 'Belfry and Sympathy are the rare two');
  check(NODE_IDS.every((id) => C.CAMPAIGN_ONLY_NODES.includes(id)) && C.gatedPool(NODE_IDS, false).length === 0, 'all eight are campaign-only');
  check(C.nodePoolOf('bellwright').length === 20, `her node pool: 12 shared + 8 (${C.nodePoolOf('bellwright').length})`);
  const abbrevs = Object.values(SKILLS).map((s) => s.abbrev);
  check(NEW.every((id) => abbrevs.filter((a) => a === SKILLS[id].abbrev).length === 1), `each new skill has its own medallion (${NEW.map((id) => SKILLS[id].abbrev).join(',')})`);
  const CARDS = await import(u('src/ui/run/cards.js'));
  check(NEW.every((id) => CARDS.SKILL_BODY[id]) && NODE_IDS.every((id) => CARDS.NODE_EFFECT[id] && CARDS.NODE_EFFECT_SHORT[id] && CARDS.NODE_GLYPH[id]), 'every new skill and node has its card text and glyph');
  const ICONS = await import(u('src/ui/hud/icons.js'));
  check([...NEW, ...NODE_IDS].every((id) => ICONS.hasIcon(id)), 'every new skill and node has a drawn icon');
  const lines = [...NEW.map((id) => SKILLS[id].name), ...NEW.map((id) => SKILLS[id].abbrev), ...NEW.map((id) => CARDS.SKILL_BODY[id]), ...NODE_IDS.map((id) => NODES[id].name), ...NODE_IDS.map((id) => CARDS.NODE_EFFECT[id]), ...NODE_IDS.map((id) => CARDS.NODE_EFFECT_SHORT[id])];
  const miss = [];
  for (const l of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru']) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!k || !tb[k]) miss.push(`${l}: ${String(k).slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.length}: ${miss.slice(0, 4).join('; ')})` : ''}`);
}

// ------------------------------------------------------------- 2. verdicts --
{
  const BELLS = ['hang_bell', 'great_bell', 'wing_hop'];
  const want = {
    bronze: BELLS,
    clangour: BELLS,
    belfry: BELLS,
    resound: ['clapper', 'knell'],
    sympathy: ['clapper', 'knell'],
    aftertone: ['peal', 'carillon'],
    tuned: ['bell_swing', 'hum'],
    cloister: ['vesper_chime', 'tuning_fork'],
  };
  for (const n of NODE_IDS) {
    const live = ALL.filter((id) => classVerdict(SKILLS[id], n).state === 'live');
    check(same([...live].sort(), [...want[n]].sort()), `${n} works on ${want[n].length} of her skills (${live.join(',')})`);
  }
  check(classVerdict(SKILLS.wing_hop, 'reach').state === 'grey', 'Reach is grey on Wing Hop (the handbell drops at her feet)');
}

// ------------------------------------------------------- 3. the seven skills --
let W = campaign(4);
const T = () => W.clock.tick;
const since = (from, type, f = () => true) => W.log.slice(from).filter((e) => e.type === type && f(e));
const live = (e, k) => STATUS.magnitude(e, k, T());
const castK = (k, x, z) => cmd(W, 'partyCast', 3, k, { x, z });
const avg = (a) => a.reduce((s, x) => s + x.amount, 0) / Math.max(1, a.length);
{
  // The Great Bell: a bigger bell that tolls 12 and slows 35%; it counts
  // against her three.
  check(room(W, ['great_bell', 'hang_bell']), 'the Great Bell on her first key');
  steps(W, 2);
  const tolly = park(W, -2, 0);
  const [d] = spawnAt(W, [[1.6, 0.6]]);
  const from = W.log.length;
  castK(0, 1.0, 0);
  steps(W, 1);
  const sp = since(from, 'azone_spawn', (e) => e.skill === 'great_bell')[0];
  check(!!sp && sp.bell === true && sp.radius === 1.9 && sp.bellSize === 1.4 && sp.totalTicks === 6, `a great bell is hung (ring ${sp && sp.radius}, size ${sp && sp.bellSize}, ${sp && sp.totalTicks} tolls)`);
  steps(W, 62);
  const hits = since(from, 'hit', (e) => e.source === 'great_bell' && !e.crit);
  check(hits.length === 1 && near(hits[0].amount, 12, 0.6), `its toll strikes 12 (${hits.map((h) => h.amount).join(',')})`);
  check(near(live(d, 'slow'), 0.35, 1e-6), `and slows 35% (${live(d, 'slow')})`);
  for (let k = 0; k < 3; k++) {
    tolly.cds = [0, 0, 0, 0];
    castK(1, -1 + k, -2);
    steps(W, 1);
  }
  check(bellsOf(W, tolly.id).length === 3 && !bellsOf(W, tolly.id).some((z) => z.skill === 'great_bell'), 'three Hang Bells later, the great bell was her oldest and went');
  unbell(W);
}
{
  // The Knell: through all three on the line; +50% on those in a ring.
  check(room(W, ['knell', 'hang_bell']), 'the Knell on her first key');
  steps(W, 2);
  park(W, -2.5, 0);
  spawnAt(W, [[-0.5, 0], [0.5, 0], [1.5, 0]]);
  castK(1, 1.5, 0.6); // a bell over the far one
  steps(W, 2);
  const from = W.log.length;
  castK(0, 2.5, 0);
  steps(W, 40);
  const hits = since(from, 'hit', (e) => e.source === 'knell' && !e.crit);
  const rings = since(from, 'bell_ring_hit', (e) => e.skill === 'knell');
  check(new Set(hits.map((h) => h.target)).size === 3, `the Knell runs through all three (${hits.length} hits)`);
  const rung = hits.filter((h) => rings.some((r) => r.target === h.target));
  const dry = hits.filter((h) => !rings.some((r) => r.target === h.target));
  check(rung.length >= 1 && dry.length >= 1 && near(avg(rung) / avg(dry), 1.5, 0.08), `+50% inside the ring (${avg(rung).toFixed(1)} vs ${avg(dry).toFixed(1)})`);
  unbell(W);
}
{
  // Bell Swing: a 120° arc 1.9 u out, pushing back.
  check(room(W, ['bell_swing']), 'Bell Swing on her first key');
  steps(W, 2);
  park(W, -0.5, 0);
  spawnAt(W, [[0.6, 0], [0.2, 0.9], [-1.6, 0]]);
  const from = W.log.length;
  castK(0, 0.6, 0);
  const hits = since(from, 'hit', (e) => e.source === 'bell_swing');
  check(hits.length === 2 && hits.every((h) => h.kb > 0), `the swing strikes the two in front, pushed (${hits.length}, kb ${hits.map((h) => h.kb).join(',')})`);
}
{
  // Wing Hop: 2.4 u away from the aim, a handbell left where she stood.
  check(room(W, ['wing_hop']), 'Wing Hop on her first key');
  steps(W, 2);
  const tolly = park(W, 0, 0);
  spawnAt(W, [[0.5, 0]]);
  const from = W.log.length;
  castK(0, 1, 0);
  steps(W, 20);
  const sp = since(from, 'azone_spawn', (e) => e.skill === 'wing_hop')[0];
  check(tolly.x < -2.0, `she hops away from the aim (to x ${tolly.x.toFixed(2)})`);
  check(!!sp && sp.bell === true && Math.hypot(sp.x, sp.z) < 0.05 && sp.bellSize === 0.7, `a handbell where she stood (${sp && `${sp.x},${sp.z}`})`);
  steps(W, 70);
  check(since(from, 'hit', (e) => e.source === 'wing_hop').length >= 1, 'and it tolls on the one she left behind');
  unbell(W);
}
{
  // Vesper Chime: the two members enemies are after (never the Tank first).
  check(room(W, ['vesper_chime']), 'Vesper Chime on her first key');
  steps(W, 2);
  const tolly = park(W, 0, 0);
  const sw = ally(W, 2);
  const tank = ally(W, 1);
  const healer = W.world.player;
  for (const m of [sw, tank, healer]) {
    m.x = m.px = 1;
    m.z = m.pz = 0.5;
  }
  const ds = spawnAt(W, [[3, 3], [3.2, 3], [3.4, 3]]);
  ds[0].targetId = sw.id;
  ds[1].targetId = sw.id;
  ds[2].targetId = tank.id;
  const from = W.log.length;
  castK(0, 0, 0);
  const c = since(from, 'ally_cast', (e) => e.skill === 'vesper_chime')[0];
  check(!!c && c.targets.length === 2 && c.targets[0] === sw.id && !c.targets.includes(tank.id), `two shields, the hunted first and the Tank last (${c && c.targets.join(',')})`);
  check(near(live(sw, 'shield'), 12, 1e-6), `a 12 shield (${live(sw, 'shield')})`);
  void tolly;
}
{
  // Tuning Fork: every member in reach takes a 6 shield and 25% haste.
  check(room(W, ['tuning_fork']), 'Tuning Fork on her first key');
  steps(W, 2);
  park(W, 0, 0);
  const sw = ally(W, 2);
  const tank = ally(W, 1);
  sw.x = sw.px = 1;
  sw.z = sw.pz = 0;
  tank.x = tank.px = -1;
  tank.z = tank.pz = 0.5;
  const from = W.log.length;
  castK(0, 0, 0);
  const c = since(from, 'ally_cast', (e) => e.skill === 'tuning_fork')[0];
  check(!!c && c.targets.includes(sw.id) && c.targets.includes(tank.id), `the members in reach (${c && c.targets.length})`);
  check(near(live(sw, 'shield'), 6, 1e-6) && near(live(tank, 'haste'), 0.25, 1e-6), `a 6 shield and 25% haste (${live(sw, 'shield')}, ${live(tank, 'haste')})`);
}
{
  // The Carillon: every bell at once, a 0.6 s daze, and each bell's time
  // starts over.
  check(room(W, ['carillon', 'hang_bell']), 'the Carillon on her first key');
  steps(W, 2);
  const tolly = park(W, -2, 0);
  const ds = spawnAt(W, [[0, 1.5], [0, -1.5]]);
  castK(1, 0, 1.5);
  steps(W, 1);
  tolly.cds = [0, 0, 0, 0];
  castK(1, 0, -1.5);
  steps(W, 300); // five tolls in: three left
  const bells = bellsOf(W, tolly.id);
  const left0 = bells.map((z) => z.totalTicks - z.ticksDone);
  const from = W.log.length;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0, 0);
  const c = since(from, 'ally_cast', (e) => e.skill === 'carillon')[0];
  const hits = since(from, 'hit', (e) => e.source === 'carillon' && !e.crit);
  check(!!c && c.bells.length === 2 && hits.length === 2 && hits.every((h) => near(h.amount, 24, 1.2)), `it rings both bells: 24 to each enemy (${hits.map((h) => h.amount).join(',')})`);
  check(ds.every((d) => STATUS.isStunned(d, T())) && ds.every((d) => d.status.stun.untilTick - T() === 36), 'a 0.6 s daze');
  const left1 = bells.map((z) => z.totalTicks - z.ticksDone);
  check(same(left0, [3, 3]) && same(left1, [8, 8]) && since(from, 'bell_rehang').length === 2, `each bell starts its time over (${left0.join(',')} tolls left, now ${left1.join(',')})`);
  unbell(W);
}

// --------------------------------------------------------------- 4. nodes --
function nodeRoom(seed, ids, nodes) {
  W = campaign(seed);
  const ok = room(W, ids, nodes);
  steps(W, 2);
  return ok;
}
{
  // Bronze x2: the bell tolls 4 s longer (12 tolls).
  nodeRoom(11, ['hang_bell'], { hang_bell: ['bronze', 'bronze'] });
  park(W, -2, 0);
  const from = W.log.length;
  castK(0, 0, 0);
  const sp = since(from, 'azone_spawn', (e) => e.skill === 'hang_bell')[0];
  check(!!sp && sp.totalTicks === 12, `Bronze x2: twelve tolls (${sp && sp.totalTicks})`);
}
{
  // Clangour: each toll slows 35% instead of 20%.
  nodeRoom(12, ['hang_bell'], { hang_bell: ['clangour'] });
  park(W, -2, 0);
  const [d] = spawnAt(W, [[0.3, 0]]);
  castK(0, 0, 0);
  steps(W, 62);
  check(near(live(d, 'slow'), 0.35, 1e-6), `Clangour: the toll slows 35% (${live(d, 'slow')})`);
}
{
  // Belfry: four bells.
  nodeRoom(13, ['hang_bell'], { hang_bell: ['belfry'] });
  const tolly = park(W, -2, 0);
  for (let k = 0; k < 5; k++) {
    tolly.cds = [0, 0, 0, 0];
    castK(0, -2 + k, -2);
    steps(W, 1);
  }
  check(bellsOf(W, tolly.id).length === 4, `Belfry: four bells hang at once (${bellsOf(W, tolly.id).length})`);
}
{
  // Resound: the Clapper's ring bonus grows to +90%.
  nodeRoom(14, ['clapper', 'hang_bell'], { clapper: ['resound'] });
  const tolly = park(W, -2, 0);
  const [d] = spawnAt(W, [[0.5, 0]]);
  castK(1, 0.5, 0);
  steps(W, 2);
  const from = W.log.length;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0.5, 0);
  steps(W, 30);
  const h = since(from, 'hit', (e) => e.source === 'clapper')[0];
  const r = since(from, 'bell_ring_hit', (e) => e.skill === 'clapper')[0];
  check(!!h && !!r && near(h.amount / (h.crit ? 2 : 1), 12 * 1.9, 0.8), `Resound: 12 lands ${h && h.amount} in the ring (+90%)`);
  void d;
}
{
  // Sympathy: a ring hit tolls the bell at once (once a second).
  nodeRoom(15, ['clapper', 'hang_bell'], { clapper: ['sympathy'] });
  const tolly = park(W, -2, 0);
  spawnAt(W, [[0.5, 0]]);
  castK(1, 0.5, 0);
  steps(W, 2);
  const bell = bellsOf(W, tolly.id)[0];
  const from = W.log.length;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0.5, 0);
  steps(W, 30);
  const sym = since(from, 'bell_sympathy');
  const tolls = since(from, 'azone_tick', (e) => e.id === bell.id);
  check(sym.length === 1 && tolls.length === 1 && tolls[0].tick === sym[0].tick + 1, `Sympathy: the bell tolls at once (${tolls.map((t) => t.tick - from).length} toll the tick after the hit)`);
  check(bell.totalTicks === 9, `an extra toll, not a stolen one (${bell.totalTicks})`);
  tolly.cds = [0, 0, 0, 0];
  const f2 = W.log.length;
  castK(0, 0.5, 0);
  steps(W, 28);
  check(since(f2, 'bell_ring_hit').length >= 1 && since(f2, 'bell_sympathy').length === 0, `at most once a second per bell (${since(f2, 'bell_ring_hit').length} ring hits, ${since(f2, 'bell_sympathy').length} tolls)`);
}
{
  // Aftertone: the Peal gives each bell two more tolls.
  nodeRoom(16, ['peal', 'hang_bell'], { peal: ['aftertone'] });
  const tolly = park(W, -2, 0);
  castK(1, 0, 0);
  steps(W, 2);
  const bell = bellsOf(W, tolly.id)[0];
  const before = bell.totalTicks;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0, 0);
  check(bell.totalTicks === before + 2, `Aftertone: the bell tolls twice more (${before} to ${bell.totalTicks})`);
}
{
  // Tuned: Bell Swing lands +50% on an enemy in her ring; and on the Hum.
  nodeRoom(17, ['bell_swing', 'hang_bell'], { bell_swing: ['tuned'] });
  const tolly = park(W, -0.5, 0);
  spawnAt(W, [[0.6, 0], [0.4, 0.8]]);
  castK(1, 0.9, -0.9); // a ring over the first, not the second
  steps(W, 2);
  const from = W.log.length;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0.6, 0);
  const hits = since(from, 'hit', (e) => e.source === 'bell_swing' && !e.crit);
  const rings = since(from, 'bell_ring_hit', (e) => e.skill === 'bell_swing');
  const rung = hits.filter((h) => rings.some((r) => r.target === h.target));
  const dry = hits.filter((h) => !rings.some((r) => r.target === h.target));
  check(rung.length === 1 && dry.length === 1 && near(rung[0].amount / dry[0].amount, 1.5, 0.08), `Tuned: the swing lands +50% in the ring (${rung.map((h) => h.amount)} vs ${dry.map((h) => h.amount)})`);
}
{
  nodeRoom(18, ['hum', 'hang_bell'], { hum: ['tuned'] });
  const tolly = park(W, -1, 0);
  spawnAt(W, [[0.4, 0], [-1.0, 1.5]]);
  castK(1, 0.6, -0.4);
  const from = W.log.length;
  steps(W, 130);
  const hits = since(from, 'hit', (e) => e.source === 'hum' && !e.crit);
  const rings = since(from, 'bell_ring_hit', (e) => e.skill === 'hum');
  const rung = hits.filter((h) => rings.some((r) => r.target === h.target && r.tick === h.tick));
  const dry = hits.filter((h) => !rings.some((r) => r.target === h.target && r.tick === h.tick));
  check(rung.length >= 1 && dry.length >= 1 && near(avg(rung) / avg(dry), 1.5, 0.1), `Tuned on the Hum: +50% in the ring (${avg(rung).toFixed(1)} vs ${avg(dry).toFixed(1)})`);
  void tolly;
}
{
  // Cloister: Tuning Fork's shield +50% on a member inside her ring.
  nodeRoom(19, ['tuning_fork', 'hang_bell'], { tuning_fork: ['cloister'] });
  const tolly = park(W, 0, 0);
  const sw = ally(W, 2);
  const tank = ally(W, 1);
  sw.x = sw.px = 1.5;
  sw.z = sw.pz = 0;
  tank.x = tank.px = -1.5;
  tank.z = tank.pz = 0;
  castK(1, 1.5, 0);
  steps(W, 1);
  sw.x = sw.px = 1.5;
  sw.z = sw.pz = 0;
  tank.x = tank.px = -1.5;
  tank.z = tank.pz = 0;
  tolly.x = tolly.px = 0;
  tolly.z = tolly.pz = 0;
  tolly.cds = [0, 0, 0, 0];
  castK(0, 0, 0);
  check(near(live(sw, 'shield'), 9, 1e-6) && near(live(tank, 'shield'), 6, 1e-6), `Cloister: 9 inside her ring, 6 outside (${live(sw, 'shield')}, ${live(tank, 'shield')})`);
}

// ------------------------------------------------------- 5. AI plays it all --
{
  const W2 = campaign(7);
  const loadouts = [['great_bell', 'knell', 'carillon', 'bell_swing'], ['hang_bell', 'vesper_chime', 'tuning_fork', 'wing_hop'], ['hang_bell', 'peal', 'clapper', 'hum']];
  const castBy = new Set();
  for (const lo of loadouts) {
    room(W2, lo);
    cmd(W2, 'partyMode', 'auto');
    const h = W2.world.player;
    for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [0.9, 2.6], [1.4, 2.2]]) cmd(W2, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
    const tolly = ally(W2, 3);
    if (tolly) for (const dx of [0.5, -0.5]) cmd(W2, 'spawn', 'boar', tolly.x + dx, tolly.z + 0.3, { hpMul: 6 });
    const from = W2.log.length;
    for (let i = 0; i < 1800; i++) {
      W2.step();
      mend(W2);
      if (W2.run.view().phase !== 'combat') break;
    }
    for (const e of W2.log.slice(from)) if (e.type === 'ally_cast' && e.partyIndex === 3 && !e.echo) castBy.add(e.skill);
  }
  const actives = ALL.filter((id) => SKILLS[id].shape !== 'aura');
  const missing = actives.filter((id) => !castBy.has(id));
  check(missing.length === 0, `the AI casts every one of her ten actives (${missing.length ? `missing ${missing.join(',')}` : 'all ten'})`);
}

// ------------------------------------------------------------- 6. save --
{
  const W3 = campaign(9);
  room(W3, ['hang_bell', 'carillon', 'great_bell', 'clapper'], { hang_bell: ['bronze', 'belfry'], clapper: ['sympathy'], carillon: ['aftertone'] });
  cmd(W3, 'partyMode', 'auto');
  const h = W3.world.player;
  for (const [dx, dz] of [[1.5, 1], [2, 0], [1.6, -1], [-1.5, 1.2]]) cmd(W3, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  for (let i = 0; i < 300; i++) {
    W3.step();
    mend(W3);
  }
  const tolly = ally(W3, 3);
  const n = bellsOf(W3, tolly.id).length;
  check(n >= 1, `the save is taken with bells hung (${n})`);
  const snap = clonePlain(W3.io.capture());
  for (let i = 0; i < 400; i++) {
    W3.step();
    mend(W3);
  }
  const h1 = hashState(W3.io.capture());
  const W4 = makeWorld(9);
  check(W4.io.apply(clonePlain(snap)).ok, 'the save applies');
  for (let i = 0; i < 400; i++) {
    W4.step();
    mend(W4);
  }
  const h2 = hashState(W4.io.capture());
  check(h1 === h2, `a mid-fight save with her kit continues bit-identically (${h1} / ${h2})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
