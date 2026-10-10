#!/usr/bin/env node
// THE TIDECALLER probe (docs/TIDECALLER.md) — headless Node, the sim built
// like src/main.js (the same harness as tools/lineup-probe.mjs).
//
//   node tools/tidecaller-probe.mjs
//
// Checks:
//   1. Data and gate: her class row, Spit, the four base skills, all
//      campaign-only; the default lineup is still the old four; the planned
//      lineup rules (who joins the team).
//   2. Soaked: the slow, a boss's 5% cap, stacking with a slow, a Frozen
//      elite refusing it, the party never carrying it.
//   3. A campaign with Rill on seat 3 (the Archer at camp): her body, max HP
//      and draft pool; the AI plays her in a fight: Riverbolt, Undertow and
//      Tidepool soak, Undertow drags its occupants in, Breaker crashes the
//      soaked (+60%, the soak spent), Spit never soaks.
//   4. Her seat played by a human: Dive leaves a puddle that soaks.
//   5. The shop shelf: her seat's class shelf offers her skills.
//   6. A mid-fight save with her in the party continues bit-identically.
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
const RILL = ['healer', 'tank', 'swordsman', 'tidecaller'];
const KIT = ['riverbolt', 'undertow', 'breaker', 'tidepool'];
// Slice 3 finished her kit: the four base skills lead her eleven.
const FULL = [...KIT, 'torrent', 'whirlpool', 'ripple_step', 'bubble_ward', 'crashing_wave', 'rain_squall', 'maelstrom'];
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
  const row = ALLY_CLASSES.tidecaller;
  check(row && row.maxHp === 85 && row.basicShape === 'projectile' && row.basicPower === 6 && row.moveSpeed === ALLY_CLASSES.archer.moveSpeed, 'her class row: 85 HP, the Archer\'s speed, Spit a 6-power bolt');
  check(same(C.CLASS_SKILLS.tidecaller, FULL) && FULL.every((id) => SKILLS[id] && SKILLS[id].cls === 'tidecaller'), 'her eleven skills (the four base ones first), all hers');
  check(KIT.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(KIT, false).length === 0 && C.gatedPool(KIT, true).length === 4, 'all four are campaign-only');
  check(SKILLS.riverbolt.status.kind === 'soaked' && SKILLS.undertow.status.kind === 'soaked' && SKILLS.tidepool.status.kind === 'soaked' && SKILLS.breaker.crash === true && !SKILLS.breaker.status, 'Riverbolt, Undertow and Tidepool soak; Breaker crashes');
  check(same(L.DEFAULT_LINEUP, ['healer', 'tank', 'swordsman', 'archer']) && same(L.benchOf(L.DEFAULT_LINEUP), ['tidecaller']), 'the default lineup is the old four (Rill at camp)');
  // Slice 4: she is locked until the profile frees the Verse of Water.
  check(L.TIDECALLER_FREE === false && !L.tidecallerOpen() && L.plannedLineup('tidecaller', '') === L.DEFAULT_LINEUP && same(L.parseTeam('tank,tidecaller'), ['tank']), 'locked, she is not a choice (the default four)');
  check(same(L.normalizeLineup(RILL), RILL), 'locked, a lineup that already holds her stays valid (saves, a host\'s run)');
  L.setTidecallerUnlocked(true);
  check(same(L.plannedLineup('tidecaller', ''), RILL), 'playing her with no team chosen: she joins in the Archer\'s place');
  check(same(L.plannedLineup('healer', 'tank,archer,tidecaller'), ['healer', 'tank', 'archer', 'tidecaller']), 'the chosen three join, in seat order');
  check(same(L.plannedLineup('swordsman', 'tank,archer,tidecaller'), ['healer', 'tank', 'swordsman', 'archer']), 'the class you play always joins (in place of the last pick)');
  check(same(L.plannedLineup('healer', 'tidecaller'), ['healer', 'tank', 'swordsman', 'tidecaller']), 'a short team is filled from today\'s party');
  check(L.plannedLineup('healer', '') === L.DEFAULT_LINEUP && L.plannedLineup('archer', undefined) === L.DEFAULT_LINEUP && L.plannedLineup('tank', 'tank,swordsman,archer') === L.DEFAULT_LINEUP, 'no team chosen (or today\'s party) is the default four');
  check(same(L.parseTeam('archer,healer,bogus,archer,tank,swordsman,tidecaller'), ['archer', 'tank', 'swordsman']), 'the setting keeps three known joiners');
  check(same(L.normalizeLineup(['healer', 'tidecaller', 'archer', 'tank']), ['healer', 'tidecaller', 'archer', 'tank']), 'any three of the four may hold the ally seats');
}

// ------------------------------------------------------------- 2. soaked --
{
  const e = { id: 1, faction: 'hostile', hp: 10, maxHp: 10 };
  STATUS.apply(e, 'soaked', 0.15, 240, 0, 9);
  check(near(STATUS.speedMul(e, 1), 0.85, 1e-9), `a soaked enemy moves 15% slower (${STATUS.speedMul(e, 1)})`);
  STATUS.apply(e, 'slow', 0.25, 240, 0, 9);
  check(near(STATUS.speedMul(e, 1), 0.85 * 0.75, 1e-9), 'a soak stacks with a slow');
  check(near(STATUS.speedMul(e, 241), 1, 1e-9), 'the soak lasts 4 s');
  const boss = { id: 2, faction: 'hostile', boss: true, hp: 10, maxHp: 10 };
  check(!!STATUS.apply(boss, 'soaked', 0.15, 240, 0) && near(STATUS.speedMul(boss, 1), 0.95, 1e-9), 'a boss can be soaked, slowed only 5%');
  const ice = { id: 3, faction: 'hostile', affixes: ['frozen'], hp: 10, maxHp: 10 };
  check(STATUS.apply(ice, 'soaked', 0.15, 240, 0) === null, 'a Frozen elite cannot be soaked');
  check(STATUS.apply({ id: 4, partyIndex: 1, hp: 10, maxHp: 10 }, 'soaked', 0.15, 240, 0) === null, 'the party is never soaked');
}

// ------------------------------------------------------- 3. Rill in a fight --
let saved = null;
{
  const W = campaign(4, { lineup: RILL });
  const p = P(W);
  const rill = ally(W, 3);
  check(same(p.lineup(), RILL) && rill.classId === 'tidecaller' && rill.maxHp === 85 && rill.hp === 85, `seat 3 is Rill (${rill.classId}, ${rill.maxHp} HP)`);
  const pool = p.pools(3);
  check(same([...pool.classSkills].sort(), [...FULL].sort()), `her draft pool is her eleven skills (${pool.classSkills.join(',')})`);
  check(L.classOfSeat(3) === 'tidecaller' && L.seatOfClass('archer') === -1, 'the UI lookup: Rill on seat 3, the Archer at camp');

  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  check(same(cmd(W, 'partyView', 3).slots, KIT), 'her four skills are on her keys');
  // A tougher pack beside the party so the fight runs long enough to show
  // every rule (six sturdy boars and two quillbacks).
  const h = W.world.player;
  for (const [dx, dz, k] of [[2.5, 1, 'boar'], [3, 0, 'boar'], [2.6, -1, 'boar'], [-2.5, 1.2, 'boar'], [-3, -0.5, 'boar'], [0.5, 3, 'boar'], [1, -3, 'quillback'], [-1, 3, 'quillback']]) cmd(W, 'spawn', k, h.x + dx, h.z + dz, { hpMul: 5 });
  const dryAtCrash = [];
  W.bus.on('crash', (ev) => {
    const t = W.registry.byId(ev.target);
    dryAtCrash.push(!t || !(t.status && t.status.soaked));
  });
  const from = W.log.length;
  let soakedSeen = 0;
  for (let i = 0; i < 3600; i++) {
    W.step();
    soakedSeen = Math.max(soakedSeen, W.registry.all().filter((e) => e.faction === 'hostile' && e.status && e.status.soaked).length);
    mend(W);
    if (W.run.view().phase !== 'combat') break;
  }
  const evs = W.log.slice(from);
  const mine = evs.filter((e) => e.type === 'ally_cast' && e.partyIndex === 3 && !e.echo);
  const castSet = [...new Set(mine.map((e) => e.skill))].sort();
  check(mine.length > 0 && mine.every((e) => e.classId === 'tidecaller' && KIT.includes(e.skill)), `the AI casts her skills (${mine.length}: ${castSet.join(',')})`);
  check(castSet.includes('riverbolt') && castSet.includes('undertow'), 'Riverbolt and Undertow both cast');
  const soakApplies = evs.filter((e) => e.type === 'status_apply' && e.status === 'soaked');
  check(soakApplies.length > 0 && soakedSeen > 0, `enemies get soaked (${soakApplies.length} soaks, up to ${soakedSeen} at once)`);
  const pulses = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'tidepool' && e.hit && e.hit.length);
  check(pulses.length > 0, `Tidepool pulses hit (${pulses.length})`);
  // Spit never soaks: a soak applied on the tick of a Spit hit comes from a skill.
  const spitHits = evs.filter((e) => e.type === 'hit' && e.source === 'tidecaller_basic');
  check(spitHits.length > 0, `Spit hits (${spitHits.length})`);
  // Undertow: zone ticks pull (negative knockback toward the centre).
  const utHits = evs.filter((e) => e.type === 'hit' && e.source === 'undertow');
  const pulled = utHits.filter((e) => e.kb < 0);
  const pushed = utHits.filter((e) => e.kb > 0);
  check(utHits.length > 0 && pulled.length > 0 && pushed.length === 0, `Undertow drags its occupants in (${pulled.length} pulls, ${pushed.length} pushes of ${utHits.length} hits)`);
  check(pulled.every((e) => e.kb >= -0.25 - 1e-9), 'each drag is at most 0.25 u');
  // Breaker: crashes on soaked enemies, +60%, the soak spent.
  const crashes = evs.filter((e) => e.type === 'crash' && e.skill === 'breaker');
  const bk = evs.filter((e) => e.type === 'hit' && e.source === 'breaker' && !e.crit);
  const crashHit = bk.filter((h) => crashes.some((c) => c.target === h.target && evs.indexOf(c) > evs.indexOf(h) && evs.indexOf(c) - evs.indexOf(h) < 40));
  const plainHit = bk.filter((h) => !crashHit.includes(h));
  const avg = (a) => a.reduce((s, h) => s + h.amount, 0) / Math.max(1, a.length);
  check(crashes.length > 0, `Breaker crashes soaked enemies (${crashes.length} crashes, ${bk.length} non-crit hits)`);
  if (crashHit.length && plainHit.length) check(near(avg(crashHit) / avg(plainHit), 1.6, 0.12), `a crash deals +60% (${avg(crashHit).toFixed(1)} vs ${avg(plainHit).toFixed(1)})`);
  else check(crashHit.length > 0 && crashHit.every((h) => h.amount >= 22 * 1.6 * 0.9), `a crash lands for ~35 (${crashHit.map((h) => h.amount.toFixed(1)).join(',')})`);
  check(dryAtCrash.length > 0 && dryAtCrash.every(Boolean), `the soak is spent on a crash (${dryAtCrash.length})`);
  // Breaker's rule: no cast with fewer than two soaked in reach unless rushed or a big target.
  check(mine.filter((e) => e.skill === 'breaker').length <= crashes.length + 6, 'Breaker waits for soaked enemies (or a rush)');

  // ------------------------------------------------------- 6. save --
  {
    const W3 = campaign(6, { lineup: RILL });
    secondRoom(W3, { 3: KIT });
    cmd(W3, 'partyMode', 'auto');
    for (let i = 0; i < 400; i++) {
      W3.step();
      mend(W3);
    }
    const snap = clonePlain(W3.io.capture());
    for (let i = 0; i < 400; i++) {
      W3.step();
      mend(W3);
    }
    const h1 = hashState(W3.io.capture());
    const W4 = makeWorld(6);
    check(W4.io.apply(clonePlain(snap)).ok, 'a save with Rill applies');
    check(same(P(W4).lineup(), RILL) && ally(W4, 3).classId === 'tidecaller' && same(cmd(W4, 'partyView', 3).slots, KIT), 'the loaded party has Rill and her keys');
    for (let i = 0; i < 400; i++) {
      W4.step();
      mend(W4);
    }
    const h2 = hashState(W4.io.capture());
    check(h1 === h2, `a mid-fight save with Rill continues bit-identically (${h1} / ${h2})`);
  }
  saved = W;
}

// --------------------------------------------------- 4. Dive (human seat) --
{
  const W = campaign(4, { lineup: RILL });
  const rill = ally(W, 3);
  const foe = W.registry.all().find((e) => e.faction === 'hostile' && e.hittable && e.hp > 0) || null;
  // Park an enemy beside her, then dive.
  if (foe) {
    foe.x = rill.x + 0.3;
    foe.z = rill.z;
    foe.px = foe.x;
    foe.pz = foe.z;
  }
  const from = W.log.length;
  W.stepSeat(3, { ...emptySnapshot(), move: { x: -1, z: 0 }, presses: [{ kind: 'dodge' }] });
  W.stepSeat(3, emptySnapshot());
  const evs = W.log.slice(from);
  const dodge = evs.find((e) => e.type === 'ally_dodge' && e.partyIndex === 3);
  const puddle = evs.find((e) => e.type === 'azone_spawn' && e.skill === 'dive');
  check(!!dodge && !!puddle, `Dive dodges and leaves a puddle (${!!dodge} / ${!!puddle})`);
  const wet = foe && foe.status && foe.status.soaked;
  check(!foe || !!wet, 'the puddle soaks an enemy standing in it');
  for (let i = 0; i < 70; i++) W.stepSeat(3, emptySnapshot());
  check(!W.registry.all().some((z) => z.kind === 'azone' && z.skill === 'dive'), 'the puddle dries after 1 s');
}

// ----------------------------------------------------------- 5. the shop --
{
  const W = saved;
  const pools = P(W).pools(3);
  const stock = typeof P(W).draft === 'function' ? P(W).draft(3).shopStock() : [];
  const nodePool = C.nodePoolOf('tidecaller');
  check(stock.length > 0 && stock.every((c) => nodePool.includes(c.node)), `her shop shelf stocks her node pool (${stock.map((c) => c.node).join(',')})`);
  check(pools.skill.every((id) => SKILLS[id].cls === 'tidecaller'), `her seat's skill pool holds only her skills (${pools.skill.join(',') || 'all owned'})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
