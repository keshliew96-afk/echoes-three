#!/usr/bin/env node
// THE TIDECALLER, her whole kit (docs/TIDECALLER.md, slice 3) — headless
// Node, the sim built like src/main.js (the harness of tools/tidecaller-probe.mjs).
//
//   node tools/tidecaller-kit-probe.mjs
//
// Checks:
//   1. Data and gate: eleven skills, eight class nodes, all campaign-only,
//      her AI order holds all eleven, her node pool (13 shared + 8).
//   2. Node verdicts: which of her skills each node works on.
//   3. The seven new skills, cast on training dummies: Torrent pierces and
//      crashes, Whirlpool and Rain Squall soak and slow (Whirlpool drags),
//      Ripple Step vaults and leaves its puddle where she stood, Bubble Ward
//      picks the most threatened (the Tank last) and bursts into a soak,
//      Crashing Wave crashes and knocks back, the Maelstrom drags the room
//      in and bursts a second later as a Crash.
//   4. The eight nodes, each on a skill it works on.
//   5. The AI plays her whole kit in a real fight.
//   6. A mid-fight save with a bubble up and a Maelstrom pending continues
//      bit-identically.
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
const RILL = ['healer', 'tank', 'swordsman', 'tidecaller'];
const BASE = ['riverbolt', 'undertow', 'breaker', 'tidepool'];
const NEW = ['torrent', 'whirlpool', 'ripple_step', 'bubble_ward', 'crashing_wave', 'rain_squall', 'maelstrom'];
const ALL = [...BASE, ...NEW];
const NODE_IDS = ['wellspring', 'deluge', 'current', 'ebb', 'spring_tide', 'undercurrent', 'riptide', 'confluence'];

function campaign(seed) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, lineup: RILL });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  cmd(W, 'partyMode', 'manual');
  return W;
}
// Between rooms (a loadout only changes there): clear the room, put `ids`
// on Rill's keys (the rest filled with skills she will not be asked to
// cast; never Tidepool, which pulses on its own), socket `nodes`
// ({ skill: [node, ...] }), then walk into the next room.
function room(W, ids, nodes = {}) {
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  const pads = ALL.filter((id) => id !== 'tidepool' && !ids.includes(id));
  const desired = [...ids, ...pads].slice(0, 4);
  for (let k = 0; k < 4; k++) {
    const s = cmd(W, 'partyView', 3).slots;
    if (s[k] === desired[k]) continue;
    const j = s.indexOf(desired[k]);
    if (j >= 0) cmd(W, 'partySwap', 3, ALL.find((id) => id !== 'tidepool' && !s.includes(id) && !desired.includes(id)), j);
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
// (alive, so the room never clears and ends the zones) and their shots
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
// Every seat is held by a (silent) human through these sections, so no AI
// swings at the dummies and none casts for Rill: only partyCast does.
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
function clearDummies(W) {
  for (const d of dummies(W)) W.registry.despawn(d.id);
}
function spawnAt(W, pts) {
  return pts.map(([x, z]) => {
    const d = W.registry.byId(cmd(W, 'spawn', 'dummy', x, z));
    d.hp = d.maxHp = 5000; // sturdy enough to stand through every check
    return d;
  });
}
const soak = (W, e, ticks = 240) => STATUS.apply(e, 'soaked', 0.15, ticks, W.clock.tick, null);
function park(W, x, z) {
  const r = ally(W, 3);
  r.x = r.px = x;
  r.z = r.pz = z;
  r.faceX = 1;
  r.faceZ = 0;
  r.cds = [0, 0, 0, 0];
  return r;
}

// ---------------------------------------------------------- 1. data / gate --
{
  check(same(C.CLASS_SKILLS.tidecaller, ALL) && ALL.every((id) => SKILLS[id] && SKILLS[id].cls === 'tidecaller'), 'eleven skills, all hers');
  check(ALL.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(ALL, false).length === 0, 'all eleven are campaign-only');
  check(same([...C.AI_PRIORITY.tidecaller].sort(), [...ALL].sort()), 'her AI order ranks all eleven');
  check(same(C.CLASS_NODES.tidecaller, NODE_IDS) && NODE_IDS.every((id) => NODES[id] && NODES[id].cls === 'tidecaller' && NODES[id].kind === 'technique'), 'eight class nodes, all hers');
  check(NODE_IDS.filter((id) => NODES[id].rarity === 'rare').join(',') === 'riptide,confluence', 'Riptide and Confluence are the rare two');
  check(NODE_IDS.every((id) => C.CAMPAIGN_ONLY_NODES.includes(id)) && C.gatedPool(NODE_IDS, false).length === 0, 'all eight are campaign-only');
  check(C.nodePoolOf('tidecaller').length === 21, `her node pool: 13 shared + 8 (${C.nodePoolOf('tidecaller').length})`);
}

// ------------------------------------------------------------- 2. verdicts --
{
  const want = {
    wellspring: ['riverbolt', 'undertow', 'tidepool', 'whirlpool', 'ripple_step', 'bubble_ward', 'rain_squall'],
    spring_tide: ['riverbolt', 'undertow', 'tidepool', 'whirlpool', 'ripple_step', 'bubble_ward', 'rain_squall'],
    deluge: ['riverbolt', 'torrent'],
    current: ALL.filter((id) => id !== 'bubble_ward'),
    ebb: ['breaker', 'torrent', 'crashing_wave', 'maelstrom'],
    riptide: ['breaker', 'torrent', 'crashing_wave', 'maelstrom'],
    undercurrent: ['undertow', 'breaker', 'whirlpool', 'crashing_wave', 'maelstrom'],
    confluence: ALL.filter((id) => id !== 'tidepool'),
  };
  for (const n of NODE_IDS) {
    const live = ALL.filter((id) => classVerdict(SKILLS[id], n).state === 'live');
    check(same([...live].sort(), [...want[n]].sort()), `${n} works on ${want[n].length} of her skills (${live.join(',')})`);
  }
  check(classVerdict(SKILLS.ripple_step, 'reach').state === 'grey', 'Reach is grey on Ripple Step (the puddle lands at her feet)');
  check(classVerdict(SKILLS.maelstrom, 'linger').state === 'grey' && classVerdict(SKILLS.whirlpool, 'linger').state === 'live', 'Linger: grey on the Maelstrom, live on Whirlpool');
}

// ------------------------------------------------------- 3. the seven skills --
let W = campaign(4);
const T = () => W.clock.tick;
const since = (from, type, f = () => true) => W.log.slice(from).filter((e) => e.type === type && f(e));
const live = (e, k) => STATUS.magnitude(e, k, T());
const cast0 = (x, z) => cmd(W, 'partyCast', 3, 0, { x, z });
{
  // Torrent: one jet through three in a line, two of them soaked.
  check(room(W, ['torrent']), 'Torrent on her first key');
  steps(W, 2);
  park(W, -2, 0);
  const ds = spawnAt(W, [[-0.5, 0], [0.5, 0], [1.5, 0]]);
  soak(W, ds[0]);
  soak(W, ds[2]);
  const from = W.log.length;
  cast0(2.5, 0);
  steps(W, 40);
  const hits = since(from, 'hit', (e) => e.source === 'torrent');
  const crashes = since(from, 'crash', (e) => e.skill === 'torrent');
  check(new Set(hits.map((h) => h.target)).size === 3, `Torrent runs through all three (${hits.length} hits)`);
  check(crashes.length === 2, `Torrent crashes the two soaked (${crashes.length})`);
  const crashHit = hits.filter((h) => crashes.some((c) => c.target === h.target) && !h.crit);
  const dryHit = hits.filter((h) => !crashes.some((c) => c.target === h.target) && !h.crit);
  if (crashHit.length && dryHit.length) check(near(crashHit[0].amount / dryHit[0].amount, 1.6, 0.05), `a crashing jet hits +60% (${crashHit[0].amount} vs ${dryHit[0].amount})`);
}
{
  // Whirlpool: soaks, slows 30% and drags the pack to its middle.
  check(room(W, ['whirlpool']), 'Whirlpool on her first key');
  steps(W, 2);
  park(W, -2.5, 0);
  const ds = spawnAt(W, [[0.4, 0.9], [1.2, -0.6], [-0.2, -0.7]]);
  const from = W.log.length;
  cast0(0.4, 0);
  const zone = since(from, 'azone_spawn', (e) => e.skill === 'whirlpool')[0];
  steps(W, 64);
  check(!!zone && near(zone.radius, 1.4), 'Whirlpool lands (radius 1.4)');
  check(ds.every((d) => live(d, 'soaked') > 0 && near(live(d, 'slow'), 0.3, 1e-6)), `everyone inside is soaked and slowed 30% (${ds.map((d) => `${live(d, 'soaked')}/${live(d, 'slow')}`).join(' ')})`);
  const wp = since(from, 'hit', (e) => e.source === 'whirlpool');
  check(wp.length >= 3 && wp.every((h) => h.kb < 0 && h.kb >= -0.5 - 1e-9), `Whirlpool drags its occupants in, at most 0.5 u (${wp.map((h) => h.kb).join(',')})`);
}
{
  // Rain Squall: soaks and slows 25% over a wide circle.
  check(room(W, ['rain_squall']), 'Rain Squall on her first key');
  steps(W, 2);
  park(W, -3, 0);
  const ds = spawnAt(W, [[0.5, 1.2], [1.4, -0.9], [-0.6, -0.8]]);
  const from = W.log.length;
  cast0(0.4, 0);
  steps(W, 64);
  const zone = since(from, 'azone_spawn', (e) => e.skill === 'rain_squall')[0];
  check(!!zone && near(zone.radius, 1.8) && zone.totalTicks === 6, 'Rain Squall lands for 6 s (radius 1.8)');
  check(ds.every((d) => live(d, 'soaked') > 0 && near(live(d, 'slow'), 0.25, 1e-6)), 'everyone under it is soaked and slowed 25%');
  check(since(from, 'hit', (e) => e.source === 'rain_squall').every((h) => h.kb >= 0), 'the squall never drags');
}
{
  // Ripple Step: she vaults away from where she aims; the puddle lands
  // where she stood, soaks and stings.
  check(room(W, ['ripple_step']), 'Ripple Step on her first key');
  steps(W, 2);
  const r = park(W, 0, 0);
  const [d] = spawnAt(W, [[0.6, 0]]);
  const from = W.log.length;
  cast0(0.6, 0);
  steps(W, 20);
  const dash = since(from, 'ally_dash', (e) => e.skill === 'ripple_step')[0];
  const zone = since(from, 'azone_spawn', (e) => e.skill === 'ripple_step')[0];
  check(!!dash && dash.cause === 'vault' && dash.x1 < dash.x0 - 1.5, `she vaults away from the enemy (${dash && `${dash.x0} -> ${dash.x1}`})`);
  check(!!zone && near(zone.x, 0, 0.05) && near(zone.z, 0, 0.05), `the puddle lands where she stood (${zone && `${zone.x},${zone.z}`})`);
  check(Math.hypot(r.x, r.z) > 1.5, `and she is clear of it (${r.x.toFixed(2)},${r.z.toFixed(2)})`);
  steps(W, 70);
  check(live(d, 'soaked') > 0 && since(from, 'hit', (e) => e.source === 'ripple_step').length > 0, 'the puddle soaks and stings what stands in it');
}

W = campaign(5);
{
  // Bubble Ward: the member most enemies are on, else the most hurt; the
  // Tank last.
  check(room(W, ['bubble_ward']), 'Bubble Ward on her first key');
  steps(W, 2);
  const r = park(W, 0, 0);
  const tank = ally(W, 1);
  const sword = ally(W, 2);
  for (const [m, x] of [[tank, 1], [sword, -1]]) {
    m.x = m.px = x;
    m.z = m.pz = 0.5;
  }
  W.world.player.x = W.world.player.px = 0;
  W.world.player.z = W.world.player.pz = 1.2;
  tank.hp = tank.maxHp * 0.1;
  sword.hp = sword.maxHp * 0.4;
  let from = W.log.length;
  cast0(0, 1);
  let cast = since(from, 'ally_cast', (e) => e.skill === 'bubble_ward')[0];
  check(!!cast && same(cast.targets, [sword.id]), `the bubble goes to the most hurt, the Tank last (${cast && cast.targets})`);
  check(!!sword.bubble && !!sword.status.shield && sword.status.shield.skill === 'bubble_ward' && near(sword.status.shield.mag, 14), 'a 14 shield and a bubble on its bearer');
  // Pop it: a dummy beside the bearer is soaked when the shield is spent.
  const [d] = spawnAt(W, [[sword.x + 0.5, sword.z]]);
  sword.status.shield.mag = 0;
  from = W.log.length;
  steps(W, 1);
  const pop = since(from, 'bubble_burst')[0];
  check(!!pop && pop.broken === true && pop.hit.includes(d.id) && live(d, 'soaked') > 0, `the spent bubble bursts and soaks the enemy beside it (${pop && JSON.stringify(pop.hit)})`);
  check(!sword.bubble, 'the bubble is gone');
  // A threat decides first: a dummy "on" the Healer outweighs the hurt fox.
  clearDummies(W);
  const [b] = spawnAt(W, [[W.world.player.x + 0.8, W.world.player.z + 0.3]]);
  b.targetId = W.world.player.id;
  sword.hp = sword.maxHp * 0.4;
  r.cds = [0, 0, 0, 0];
  from = W.log.length;
  cast0(0, 1);
  cast = since(from, 'ally_cast', (e) => e.skill === 'bubble_ward')[0];
  check(!!cast && same(cast.targets, [W.world.player.id]), `the member an enemy is after gets the bubble (${cast && cast.targets})`);
  // Running out also bursts it.
  clearDummies(W);
  from = W.log.length;
  steps(W, 245);
  const out = since(from, 'bubble_burst')[0];
  check(!!out && out.broken === false, 'a bubble that runs out bursts too');
}
{
  // Crashing Wave: a wide wave 2.2 u out, a Crash, a 1.2 u knockback.
  check(room(W, ['crashing_wave']), 'Crashing Wave on her first key');
  steps(W, 2);
  park(W, -1.5, 0);
  const ds = spawnAt(W, [[0.3, 0], [0.1, 0.9], [0.1, -0.9]]);
  soak(W, ds[0]);
  const from = W.log.length;
  cast0(1, 0);
  const cast = since(from, 'ally_cast', (e) => e.skill === 'crashing_wave')[0];
  const hits = since(from, 'hit', (e) => e.source === 'crashing_wave');
  check(!!cast && cast.targets.length === 3 && near(cast.reach, 2.2) && cast.halfAngle === 50, `the wave reaches all three (${cast && cast.targets.length})`);
  check(since(from, 'crash', (e) => e.skill === 'crashing_wave').length === 1, 'and crashes the soaked one');
  check(hits.length === 3 && hits.every((h) => near(h.kb, 1.2, 0.01)), `each is knocked back 1.2 u (${hits.map((h) => h.kb).join(',')})`);
}
{
  // Maelstrom: drag everything within 3 u in by 1 u now, burst a second later.
  check(room(W, ['maelstrom']), 'the Maelstrom on her first key');
  steps(W, 2);
  park(W, 0, 0);
  const ds = spawnAt(W, [[2.4, 0], [-1.2, 0.8], [0, -2.0], [1.3, 0.1]]);
  soak(W, ds[3]);
  const before = ds.map((d) => Math.hypot(d.x, d.z));
  const from = W.log.length;
  cast0(1, 0);
  const cast = since(from, 'ally_cast', (e) => e.skill === 'maelstrom')[0];
  check(!!cast && cast.drawn.length === 4 && cast.delayTicks === 60, `the Maelstrom draws all four in (${cast && cast.drawn.length})`);
  ally(W, 3).x = ally(W, 3).px = -3; // she may walk off: the burst stays where she cast it
  steps(W, 30);
  const after = ds.map((d) => Math.hypot(d.x, d.z));
  check(after.every((v, i) => v < before[i] - 0.5), `each was dragged about 1 u in (${before.map((v, i) => `${v.toFixed(2)}->${after[i].toFixed(2)}`).join(' ')})`);
  check(since(from, 'hit', (e) => e.source === 'maelstrom').length === 0, 'nothing is hit before the beat');
  steps(W, 35);
  const hits = since(from, 'hit', (e) => e.source === 'maelstrom');
  const inner = ds.filter((d, i) => after[i] <= 1.6);
  check(hits.length >= 3 && hits.length === inner.length, `the burst lands on those within 1.6 u of the cast (${hits.length} of ${inner.length})`);
  check(since(from, 'crash', (e) => e.skill === 'maelstrom').length === 1, 'the burst crashes the soaked one');
}

// --------------------------------------------------------------- 4. nodes --
// Each on a fresh run, socketed between rooms 1 and 2.
function nodeRoom(seed, ids, nodes) {
  W = campaign(seed);
  const ok = room(W, ids, nodes);
  steps(W, 2);
  return ok;
}
{
  // Wellspring: +2 s on Riverbolt's soak (two copies: +4 s).
  nodeRoom(11, ['riverbolt'], { riverbolt: ['wellspring', 'wellspring'] });
  park(W, -2, 0);
  const [d] = spawnAt(W, [[0.5, 0]]);
  cast0(0.5, 0);
  let landed = null;
  for (let i = 0; i < 40 && landed === null; i++) {
    steps(W, 1);
    if (d.status && d.status.soaked) landed = d.status.soaked.untilTick - T();
  }
  check(landed !== null && landed >= 470 && landed <= 481, `Wellspring x2: the soak lasts 8 s (${landed} ticks)`);
}
{
  // Spring Tide: a soaked enemy hit again is drenched (30%).
  nodeRoom(12, ['riverbolt'], { riverbolt: ['spring_tide'] });
  park(W, -2, 0);
  const [d] = spawnAt(W, [[0.5, 0]]);
  soak(W, d);
  cast0(0.5, 0);
  steps(W, 30);
  check(near(live(d, 'soaked'), 0.3, 1e-6), `Spring Tide drenches a soaked enemy (${live(d, 'soaked')})`);
}
{
  // Deluge: the bolt leaves a puddle where it lands; the puddle soaks.
  nodeRoom(13, ['riverbolt'], { riverbolt: ['deluge'] });
  park(W, -2, 0);
  const [d] = spawnAt(W, [[0.5, 0]]);
  const from = W.log.length;
  cast0(0.5, 0);
  steps(W, 30);
  const p = since(from, 'azone_spawn', (e) => e.skill === 'deluge')[0];
  const hit = since(from, 'hit', (e) => e.source === 'riverbolt')[0];
  check(!!p && !!hit && p.puddle === true && Math.hypot(p.x - hit.x, p.z - hit.z) < 0.05, 'Deluge: a puddle where the bolt landed');
  steps(W, 130);
  check(!W.registry.all().some((z) => z.kind === 'azone' && z.skill === 'deluge'), 'it dries after 2 s');
}
{
  // Current: Torrent swells +15% per soaked enemy near where it lands.
  nodeRoom(14, ['torrent'], { torrent: ['current'] });
  park(W, -2, 0);
  const ds = spawnAt(W, [[0.5, 0], [0.8, 0.8], [0.8, -0.8]]);
  ds.forEach((d) => soak(W, d));
  const from = W.log.length;
  cast0(0.5, 0);
  const cast = since(from, 'ally_cast', (e) => e.skill === 'torrent')[0];
  check(!!cast && near(cast.power, 18 * 1.45, 0.05), `Current: three soaked near the landing, +45% (${cast && cast.power})`);
}
{
  // Ebb: a landed Crash cuts her other cooldowns 0.5 s.
  nodeRoom(15, ['breaker', 'whirlpool'], { breaker: ['ebb'] });
  const r = park(W, -0.5, 0);
  const [d] = spawnAt(W, [[0.4, 0]]);
  soak(W, d);
  r.cds[1] = T() + 300;
  const was = r.cds[1];
  const from = W.log.length;
  cast0(0.4, 0);
  steps(W, 2);
  check(since(from, 'crash', (e) => e.skill === 'breaker').length === 1 && r.cds[1] === was - 30, `Ebb: Whirlpool's cooldown drops 30 ticks (${was - r.cds[1]})`);
}
{
  // Undercurrent: Breaker pulls instead of pushing.
  nodeRoom(16, ['breaker'], { breaker: ['undercurrent'] });
  park(W, -0.5, 0);
  spawnAt(W, [[0.4, 0], [-0.5, 0.9]]);
  const from = W.log.length;
  cast0(0.4, 0);
  const hits = since(from, 'hit', (e) => e.source === 'breaker');
  check(hits.length === 2 && hits.every((h) => near(h.kb, -1.0, 0.01)), `Undercurrent: Breaker pulls 1 u (${hits.map((h) => h.kb).join(',')})`);
}
{
  // Riptide: the Crash also stuns.
  nodeRoom(17, ['breaker'], { breaker: ['riptide'] });
  park(W, -0.5, 0);
  const [d] = spawnAt(W, [[0.4, 0]]);
  soak(W, d);
  const from = W.log.length;
  cast0(0.4, 0);
  steps(W, 1);
  const c = since(from, 'crash', (e) => e.skill === 'breaker')[0];
  check(!!c && c.stun === true && STATUS.isStunned(d, T()), 'Riptide: the Crash stuns');
}
{
  // Confluence: a party member's hit on a soaked enemy ticks the skill
  // 0.1 s, once per 0.5 s; her own hits never do.
  nodeRoom(18, ['riverbolt'], { riverbolt: ['confluence'] });
  const r = park(W, -3, 0);
  const [d] = spawnAt(W, [[3, 2]]);
  r.cds[0] = T() + 600;
  soak(W, d, 2000);
  const was = r.cds[0];
  const sword = ally(W, 2);
  const from = W.log.length;
  W.bus.emit(T(), 'hit', { target: d.id, attacker: sword.id, source: 'swordsman_basic', amount: 1 });
  const cut1 = was - r.cds[0];
  W.bus.emit(T(), 'hit', { target: d.id, attacker: sword.id, source: 'swordsman_basic', amount: 1 });
  const cut2 = was - r.cds[0];
  W.bus.emit(T() + 40, 'hit', { target: d.id, attacker: r.id, source: 'riverbolt', amount: 1 });
  const cut3 = was - r.cds[0];
  check(cut1 === 6 && cut2 === 6 && cut3 === 6, `Confluence: an ally's hit on the soaked ticks it 0.1 s, once per 0.5 s, never her own (${cut1}/${cut2}/${cut3})`);
  check(since(from, 'technique_pulse', (e) => e.node === 'confluence').length === 1, 'one Confluence pulse');
}

// ------------------------------------------------------- 5. AI plays it all --
{
  const W2 = campaign(7);
  const loadouts = [['torrent', 'whirlpool', 'crashing_wave', 'maelstrom'], ['riverbolt', 'rain_squall', 'bubble_ward', 'ripple_step'], ['undertow', 'breaker', 'torrent', 'tidepool']];
  const castBy = new Set();
  for (const lo of loadouts) {
    room(W2, lo);
    cmd(W2, 'partyMode', 'auto');
    const h = W2.world.player;
    for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [0.9, 2.6], [1.4, 2.2]]) cmd(W2, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
    // Two boars on top of Rill herself, so her panic vault has a reason.
    const rill = W2.registry.all().find((e) => e.partyIndex === 3);
    if (rill) for (const dx of [0.5, -0.5]) cmd(W2, 'spawn', 'boar', rill.x + dx, rill.z + 0.3, { hpMul: 6 });
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

// --------------------------------------------- 5b. the Millrace kit --
// (slice 4's Unlocks kit lists Torrent and Bubble Ward; with them in SKILLS
// it carries all four and a campaign started with it puts them on her keys.)
{
  const U = await import(u('src/data/unlocks.js'));
  const kit = U.UNLOCKS.kit_millrace;
  check(same(kit.skills, ['riverbolt', 'undertow', 'torrent', 'bubble_ward']), `the Millrace kit carries all four (${kit.skills.join(',')})`);
  const W4 = makeWorld(11);
  W4.run.startCampaign({ level: 1, harness: true, lineup: RILL, boons: { kits: { tidecaller: kit.skills.slice() } } });
  for (let i = 0; i < 4000 && W4.run.view().phase !== 'combat'; i++) W4.step();
  check(same(cmd(W4, 'partyView', 3).slots, kit.skills), `a run with the kit starts her on them (${cmd(W4, 'partyView', 3).slots.join(',')})`);
}

// ------------------------------------------------------------- 6. save --
{
  const W3 = campaign(9);
  room(W3, ['maelstrom', 'bubble_ward', 'whirlpool', 'torrent'], { maelstrom: ['riptide'], whirlpool: ['wellspring'] });
  cmd(W3, 'partyMode', 'auto');
  const h = W3.world.player;
  for (const [dx, dz] of [[1.5, 1], [2, 0], [1.6, -1], [-1.5, 1.2]]) cmd(W3, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  for (let i = 0; i < 120; i++) {
    W3.step();
    mend(W3);
  }
  cmd(W3, 'partyCast', 3, 1, { x: h.x, z: h.z });
  cmd(W3, 'partyCast', 3, 0, { x: h.x + 1, z: h.z });
  W3.step();
  const pending = W3.registry.all().some((z) => z.kind === 'azone' && z.burst) && party(W3).some((m) => m.bubble);
  check(pending, 'the save is taken with a bubble up and a Maelstrom pending');
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
