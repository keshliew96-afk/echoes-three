#!/usr/bin/env node
// THE BELLWRIGHT probe (docs/BELLWRIGHT.md) — headless Node, the sim built
// like src/main.js (the same harness as tools/tidecaller-probe.mjs).
//
//   node tools/bellwright-probe.mjs
//
// Checks:
//   1. Data and gate: her class row, Ding, the four base skills, all
//      campaign-only; free from the start; the default lineup is still the
//      old four; who joins the team; the six-card picker and the lobby roster.
//   2. A campaign with Tolly on seat 3 (the Archer at camp), the AI playing
//      her: bells hung (three at most) toll once a second, the Peal rings
//      them (each enemy once, a daze), the Clapper lands +50% in a ring, Hum
//      pulses, Ding hits.
//   3. The cap: a fourth bell replaces her oldest; a Peal with no bell hung
//      rings round her.
//   4. Her seat played by a human: a key press hangs a bell at the aim.
//   5. The shop shelf: her seat's shelf offers her pool.
//   6. A mid-fight save with her bells hung continues bit-identically.
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
const { frameFromSnapshot, seatInputOf } = await import(u('src/sim/netseats.js'));
const STATUS = await import(u('src/sim/status.js'));
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
  const stepSeat = (seat, snap) => clock.stepOnce((t) => world.step(t, emptySnapshot(), { seats: { [seat]: seatInputOf([frameFromSnapshot(snap, { seq: t, tick: t, viewTick: t })]) }, reasons: {}, player: 'ai', rewind: null }));
  return { world, registry, bus, clock, run, log, step, stepSeat, io };
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
const TOLLY = ['healer', 'tank', 'swordsman', 'bellwright'];
const KIT = ['hang_bell', 'peal', 'clapper', 'hum'];
const near = (v, w, eps = 0.02) => Math.abs(v - w) <= eps;

function campaign(seed, opts = {}) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, ...opts });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  return W;
}
function secondRoom(W, kit) {
  cmd(W, 'partyMode', 'manual');
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  for (const [seat, ids] of Object.entries(kit)) ids.forEach((id, k) => cmd(W, 'partySwap', Number(seat), id, k));
  cmd(W, 'skipToRoom', 2);
  for (let i = 0; i < 600 && !(W.run.view().phase === 'combat' && W.run.view().room === 2); i++) W.step();
}


// ---------------------------------------------------------- 1. data / gate --
{
  const row = ALLY_CLASSES.bellwright;
  check(row && row.maxHp === 95 && row.basicShape === 'projectile' && row.basicPower === 7 && row.moveSpeed === 2.35, 'her class row: 95 HP, speed 2.35, Ding a 7-power bolt');
  check(same(C.CLASS_SKILLS.bellwright, KIT) && KIT.every((id) => SKILLS[id] && SKILLS[id].cls === 'bellwright'), 'her four base skills, all hers');
  check(KIT.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(KIT, false).length === 0 && C.gatedPool(KIT, true).length === 4, 'all four are campaign-only');
  check(SKILLS.hang_bell.bell === true && SKILLS.peal.peal === true && SKILLS.clapper.ringBonus === true && SKILLS.hum.shape === 'aura', 'Hang Bell hangs a bell, Peal rings them, the Clapper reads the ring, Hum is a passive');
  check(same(L.DEFAULT_LINEUP, ['healer', 'tank', 'swordsman', 'archer']) && same(L.benchOf(L.DEFAULT_LINEUP), ['tidecaller', 'bellwright']), 'the default lineup is the old four (Rill and Tolly at camp)');
  check(L.BELLWRIGHT_FREE === true && L.bellwrightOpen() && L.classOpen('bellwright'), 'she is free from the start in this slice');
  check(!L.tidecallerOpen() && same(L.parseTeam('tank,tidecaller,bellwright'), ['tank', 'bellwright']), 'Rill stays locked on a fresh profile; Tolly may join');
  check(L.rosterGrown(), 'five open classes for three ally seats: the team view has a choice');
  check(same(L.plannedLineup('bellwright', ''), TOLLY), 'playing her with no team chosen: she joins in the Archer\'s place');
  check(same(L.plannedLineup('healer', 'tank,archer,bellwright'), ['healer', 'tank', 'archer', 'bellwright']), 'the chosen three join, in seat order');
  check(same(L.plannedLineup('swordsman', 'tank,archer,bellwright'), ['healer', 'tank', 'swordsman', 'archer']), 'the class you play always joins (in place of the last pick)');
  check(L.plannedLineup('healer', '') === L.DEFAULT_LINEUP, 'no team chosen is the default four (the goldens)');
  L.setTidecallerUnlocked(true);
  check(same(L.plannedLineup('healer', 'tidecaller,bellwright'), ['healer', 'tank', 'tidecaller', 'bellwright']), 'with Rill freed both new heroes can join together');
  check(same(L.normalizeLineup(['healer', 'bellwright', 'tidecaller', 'archer']), ['healer', 'bellwright', 'tidecaller', 'archer']), 'any three of the five may hold the ally seats');
  L.setTidecallerUnlocked(false);
  const PC = await import(u('src/app/playclass.js'));
  check(PC.PLAY_CLASSES.length === 6 && PC.playable('bellwright') && !PC.playable('tidecaller'), 'the picker shows six cards; Tolly playable, Rill locked');
  const MSGS = await import(u('src/net/protocol/messages.js'));
  check(MSGS.ROSTER.includes('bellwright'), 'the lobby roster offers her (co-op select_class / set_team)');
}

// ------------------------------------------------------ 2. Tolly in a fight --
let saved = null;
{
  const W = campaign(4, { lineup: TOLLY });
  const p = P(W);
  const tolly = ally(W, 3);
  check(same(p.lineup(), TOLLY) && tolly.classId === 'bellwright' && tolly.maxHp === 95 && tolly.hp === 95, `seat 3 is Tolly (${tolly.classId}, ${tolly.maxHp} HP)`);
  const pool = p.pools(3);
  check(same([...pool.classSkills].sort(), [...KIT].sort()), `her draft pool is her four skills (${pool.classSkills.join(',')})`);
  check(L.classOfSeat(3) === 'bellwright' && L.seatOfClass('archer') === -1, 'the UI lookup: Tolly on seat 3, the Archer at camp');

  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  check(same(cmd(W, 'partyView', 3).slots, KIT), 'her four skills are on her keys');
  const h = W.world.player;
  for (const [dx, dz, k] of [[2.5, 1, 'boar'], [3, 0, 'boar'], [2.6, -1, 'boar'], [-2.5, 1.2, 'boar'], [-3, -0.5, 'boar'], [0.5, 3, 'boar'], [1, -3, 'quillback'], [-1, 3, 'quillback']]) cmd(W, 'spawn', k, h.x + dx, h.z + dz, { hpMul: 5 });
  const from = W.log.length;
  let maxBells = 0;
  for (let i = 0; i < 3600; i++) {
    W.step();
    maxBells = Math.max(maxBells, W.registry.all().filter((z) => z.kind === 'azone' && z.bell && z.sourceId === tolly.id).length);
    mend(W);
    if (W.run.view().phase !== 'combat') break;
  }
  const evs = W.log.slice(from);
  const mine = evs.filter((e) => e.type === 'ally_cast' && e.partyIndex === 3 && !e.echo);
  const castSet = [...new Set(mine.map((e) => e.skill))].sort();
  check(mine.length > 0 && mine.every((e) => e.classId === 'bellwright' && KIT.includes(e.skill)), `the AI casts her skills (${mine.length}: ${castSet.join(',')})`);
  check(castSet.includes('hang_bell') && castSet.includes('peal') && castSet.includes('clapper'), 'Hang Bell, Peal and the Clapper all cast');
  const hangs = evs.filter((e) => e.type === 'azone_spawn' && e.skill === 'hang_bell');
  check(hangs.length > 0 && hangs.every((e) => e.bell === true), `bells are hung (${hangs.length})`);
  check(maxBells >= 2 && maxBells <= 3, `never more than three bells at once (up to ${maxBells})`);
  const tolls = evs.filter((e) => e.type === 'azone_tick' && e.skill === 'hang_bell');
  const tollHits = evs.filter((e) => e.type === 'hit' && e.source === 'hang_bell');
  check(tolls.length > 0 && tollHits.length > 0, `the bells toll on the beat and strike (${tolls.length} tolls, ${tollHits.length} hits)`);
  const gaps = [];
  const byZone = new Map();
  for (const e of tolls) {
    if (byZone.has(e.id)) gaps.push(e.tick - byZone.get(e.id));
    byZone.set(e.id, e.tick);
  }
  check(gaps.length > 0 && gaps.every((g) => g === 60), `a bell tolls once a second (${[...new Set(gaps)].join(',')} ticks)`);
  const peals = mine.filter((e) => e.skill === 'peal');
  check(peals.some((e) => Array.isArray(e.bells) && e.bells.some((b) => b.id != null)), `the Peal rings her hung bells (${peals.map((e) => (e.bells || []).length).join(',')} bells per peal)`);
  const pealHits = evs.filter((e) => e.type === 'hit' && e.source === 'peal');
  check(pealHits.length > 0, `the Peal strikes (${pealHits.length} hits)`);
  const pealTargets = peals.flatMap((e) => e.targets || []);
  check(peals.every((e) => new Set(e.targets).size === (e.targets || []).length), 'each enemy is struck once per Peal');
  const stuns = evs.filter((e) => e.type === 'status_apply' && e.status === 'stun' && pealTargets.includes(e.id));
  check(stuns.length > 0, `the Peal dazes (${stuns.length} stuns)`);
  const ring = evs.filter((e) => e.type === 'bell_ring_hit');
  const clapHits = evs.filter((e) => e.type === 'hit' && e.source === 'clapper' && !e.crit);
  check(clapHits.length > 0, `the Clapper lands (${clapHits.length})`);
  const rungHits = clapHits.filter((hh) => ring.some((r) => r.target === hh.target && r.tick === hh.tick));
  const plainClap = clapHits.filter((hh) => !rungHits.includes(hh));
  const avg = (a) => a.reduce((s, x) => s + x.amount, 0) / Math.max(1, a.length);
  check(ring.length > 0 && rungHits.length > 0, `the Clapper reads the ring (${ring.length} ring hits)`);
  if (rungHits.length && plainClap.length) check(near(avg(rungHits) / avg(plainClap), 1.5, 0.12), `inside a ring it lands +50% (${avg(rungHits).toFixed(1)} vs ${avg(plainClap).toFixed(1)})`);
  const hums = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'hum' && e.hit && e.hit.length);
  check(hums.length > 0, `Hum pulses hit (${hums.length})`);
  const dings = evs.filter((e) => e.type === 'hit' && e.source === 'bellwright_basic');
  check(dings.length > 0, `Ding hits (${dings.length})`);
  saved = W;
}

// ---------------------------------------- 3. the cap: a fourth bell replaces --
{
  const W = campaign(5, { lineup: TOLLY });
  secondRoom(W, { 3: KIT });
  const tolly = ally(W, 3);
  const ids = [];
  W.bus.on('azone_spawn', (e) => e.skill === 'hang_bell' && ids.push(e.id));
  const replaced = [];
  W.bus.on('azone_expire', (e) => e.replaced && replaced.push(e.id));
  for (let k = 0; k < 4; k++) {
    cmd(W, 'partyCast', 3, 0, { x: tolly.x + (k - 1.5) * 1.2, z: tolly.z - 2 });
    W.step();
  }
  const live = W.registry.all().filter((z) => z.kind === 'azone' && z.bell && z.sourceId === tolly.id).map((z) => z.id);
  check(ids.length === 4 && live.length === 3 && same(replaced, [ids[0]]) && same(live.sort((a, b) => a - b), ids.slice(1)), `a fourth bell takes the oldest one's place (live ${live.join(',')}, replaced ${replaced.join(',')})`);
  // The Peal with no enemies near still rings each bell, round herself when none hang.
  const from = W.log.length;
  cmd(W, 'partyCast', 3, 1, { x: tolly.x, z: tolly.z });
  W.step();
  const pc = W.log.slice(from).find((e) => e.type === 'ally_cast' && e.skill === 'peal');
  check(pc && pc.bells.length === 3 && pc.bells.every((b) => live.includes(b.id)), 'the Peal rings all three bells');
  for (let i = 0; i < 600; i++) W.step();
  check(!W.registry.all().some((z) => live.includes(z.id)), 'the bells fall silent after 8 s');
  // Her AI may have hung new ones meanwhile: take them down for the next check.
  for (const z of W.registry.all().filter((z) => z.kind === 'azone' && z.bell)) W.registry.despawn(z.id);
  const f2 = W.log.length;
  cmd(W, 'partyCast', 3, 1, { x: tolly.x, z: tolly.z });
  W.step();
  const pc2 = W.log.slice(f2).find((e) => e.type === 'ally_cast' && e.skill === 'peal');
  check(pc2 && pc2.bells.length === 1 && pc2.bells[0].id === null, 'with no bell hung the Peal rings round her');
}

// ----------------------------------------- 4. her seat played by a human --
{
  const W = campaign(4, { lineup: TOLLY });
  secondRoom(W, { 3: KIT });
  const tolly = ally(W, 3);
  const from = W.log.length;
  // A human press on key 1 hangs a bell where she aims.
  W.stepSeat(3, { ...emptySnapshot(), aim: { x: tolly.x + 1.5, z: tolly.z - 1.5 }, presses: [{ kind: 'skill_1' }] });
  for (let i = 0; i < 3; i++) W.stepSeat(3, emptySnapshot());
  const hang = W.log.slice(from).find((e) => e.type === 'azone_spawn' && e.skill === 'hang_bell');
  check(!!hang && hang.bell === true, `a human Bellwright hangs a bell where she aims (${hang ? `${hang.x},${hang.z}` : 'none'})`);
}

// ----------------------------------------------------------- 5. the shop --
{
  const W = saved;
  const pools = P(W).pools(3);
  const stock = typeof P(W).draft === 'function' ? P(W).draft(3).shopStock() : [];
  const nodePool = C.nodePoolOf('bellwright');
  check(stock.length > 0 && stock.every((c) => nodePool.includes(c.node)), `her shop shelf stocks her node pool (${stock.map((c) => c.node).join(',')})`);
  check(pools.skill.every((id) => SKILLS[id].cls === 'bellwright'), `her seat's skill pool holds only her skills (${pools.skill.join(',') || 'all owned'})`);
}

// ------------------------------------------------------------- 6. save --
{
  const W3 = campaign(6, { lineup: TOLLY });
  secondRoom(W3, { 3: KIT });
  cmd(W3, 'partyMode', 'auto');
  const h = W3.world.player;
  for (const [dx, dz] of [[2.5, 1], [3, 0], [-2.5, 1.2]]) cmd(W3, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 5 });
  for (let i = 0; i < 400; i++) {
    W3.step();
    mend(W3);
  }
  const snap = clonePlain(W3.io.capture());
  const bellsAtSave = W3.registry.all().filter((z) => z.kind === 'azone' && z.bell).length;
  for (let i = 0; i < 400; i++) {
    W3.step();
    mend(W3);
  }
  const h1 = hashState(W3.io.capture());
  const W4 = makeWorld(6);
  check(W4.io.apply(clonePlain(snap)).ok, `a save with Tolly applies (${bellsAtSave} bells hung at the save)`);
  check(same(P(W4).lineup(), TOLLY) && ally(W4, 3).classId === 'bellwright' && same(cmd(W4, 'partyView', 3).slots, KIT), 'the loaded party has Tolly and her keys');
  for (let i = 0; i < 400; i++) {
    W4.step();
    mend(W4);
  }
  const h2 = hashState(W4.io.capture());
  check(h1 === h2, `a mid-fight save with Tolly continues bit-identically (${h1} / ${h2})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
