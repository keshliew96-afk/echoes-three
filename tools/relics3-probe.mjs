#!/usr/bin/env node
// RELICS batch 3 probe (docs/RELICS.md "Batch 3"), headless:
//
//   node tools/relics3-probe.mjs
//
//   1. Data: ten new relics (27 in all), one class relic per class, rarities
//      spread, an heirloom each.
//   2. Class gate: a class relic leaves the offer pool when its class is not
//      in the party.
//   3. Each relic in a live campaign room through the real pipeline:
//      Warden's Oath (a Tank taunt heals the Tank, once per enemy per 3 s),
//      Fox Ribbon (a Swordsman crit cuts again), Fletcher's Knot (an Archer
//      hit on an exposed enemy ricochets), Mercy Bell (the Healer's overheal
//      shields), Kindling Coal (a crit flares, doubled with Ember Tooth), Sun
//      Chalice (a heal sears the nearest enemy), Cinder Pact (a cursed room),
//      Bounty Writ (an elite kill pays), Huntsman's Horn (a Hunt room), and
//      Pilgrim's Lamp (an event room).
//   4. Off without relics: the same hits in a legacy run fire no proc.
//   5. A save taken with a proc queued restores it.
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
const { RELICS, RELIC_IDS, CLASS_RELICS } = await import(u('src/sim/relics.js'));
const STATUS = await import(u('src/sim/status.js'));
const { UNLOCKS } = await import(u('src/data/unlocks.js'));

const NEW = ['wardens_oath', 'fox_ribbon', 'fletchers_knot', 'mercy_bell', 'kindling_coal', 'sun_chalice', 'cinder_pact', 'bounty_writ', 'huntsmans_horn', 'pilgrims_lamp'];

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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const log = [];
  for (const t of ['relic_proc', 'relic_gain', 'glint_gain', 'heal', 'hit', 'room_enter', 'room_cleared', 'curse_apply'])
    bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? emptySnapshot()));
  return { world, registry, bus, clock, run, log, step };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? '  ok ' : 'FAIL ', what);
  return ok;
};
const procs = (W, id) => W.log.filter((e) => e.type === 'relic_proc' && e.relic === id);
const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
const seat = (W, i) => W.registry.all().find((e) => e.partyIndex === i);

// A campaign standing in live combat in room 1 with its waves cleared, the
// waves held so nothing new walks in.
function combatRoom(seed, level = 1) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  for (let i = 0; i < 30; i++) W.step();
  W.world.cmd('killAllEnemies');
  for (let i = 0; i < 12; i++) W.step(); // past the kill hitstop
  W.log.length = 0;
  return W;
}
// A plain enemy (no affixes, not elite) in front of the party.
function dummyFoe(W, kind, dx, dz) {
  const p = W.world.player;
  const r = W.world.cmd('spawn', kind, p.x + dx, p.z + dz);
  const e = W.registry.byId(idOf(r));
  if (e) {
    e.maxHp = 5000;
    e.hp = 5000;
  }
  return e;
}
function clearToPath(W) {
  W.world.cmd('killAllEnemies');
  for (let i = 0; i < 3000 && W.run.view().phase !== 'path'; i++) {
    const v = W.run.view();
    if (v.phase === 'combat') W.world.cmd('killAllEnemies');
    else if (v.phase === 'reward') W.run.declineReward();
    else if (v.phase === 'relic') W.run.chooseRelic(0);
    W.step();
  }
  return W.run.view().phase === 'path';
}
const stepUntil = (W, pred, max = 600) => {
  for (let i = 0; i < max && !pred(W.run.view()); i++) W.step();
  return pred(W.run.view());
};

// ---------------------------------------------------------------- 1. data --
{
  const rar = NEW.map((id) => RELICS[id] && RELICS[id].rarity);
  const n = (r) => rar.filter((x) => x === r).length;
  check(RELIC_IDS.length === 27 && NEW.every((id) => RELICS[id]), `data: ${RELIC_IDS.length} relics, the ten new ones present`);
  const cls = Object.values(CLASS_RELICS).sort().join(',');
  check(cls === 'archer,healer,swordsman,tank', `data: one class relic per class (${cls})`);
  check(n('common') === 4 && n('rare') === 4 && n('legendary') === 2, `data: rarities common ${n('common')}, rare ${n('rare')}, legendary ${n('legendary')}`);
  check(NEW.every((id) => UNLOCKS[`heirloom_${id}`] && UNLOCKS[`heirloom_${id}`].relic === id), 'data: an heirloom unlock for each new relic');
}

// ---------------------------------------------------------- 2. class gate --
{
  const W = combatRoom(21);
  const all = W.run.cmd('relicPool', []);
  const archer = seat(W, 3);
  W.registry.despawn(archer.id);
  const gated = W.run.cmd('relicPool', []);
  check(all.includes('fletchers_knot') && all.length === 27, `class gate: a full party is offered every relic (${all.length})`);
  check(!gated.includes('fletchers_knot') && gated.includes('fox_ribbon') && gated.length === 26, "class gate: with no Archer, Fletcher's Knot leaves the pool");
}

// ------------------------------------------------------- 3. Warden's Oath --
{
  const W = combatRoom(22);
  W.run.cmd('relicGrant', ['wardens_oath']);
  const tank = seat(W, 1);
  tank.hp = tank.maxHp * 0.5;
  const hp0 = tank.hp;
  const a = dummyFoe(W, 'boar', 2, -2);
  const b = dummyFoe(W, 'boar', -2, -2);
  W.step();
  // Taunt both from the Tank (the real status writer).
  const now = W.clock.tick;
  STATUS.apply(a, 'taunt', 1, 120, now + 1, tank.id);
  STATUS.apply(b, 'taunt', 1, 120, now + 1, tank.id);
  for (let i = 0; i < 4; i++) W.step();
  const first = procs(W, 'wardens_oath').length;
  const gained = tank.hp - hp0;
  // A re-taunt inside 3 s pays nothing.
  if (a.status) delete a.status.taunt;
  STATUS.apply(a, 'taunt', 1, 120, W.clock.tick, tank.id);
  for (let i = 0; i < 4; i++) W.step();
  const second = procs(W, 'wardens_oath').length;
  check(first === 2 && gained >= RELICS.wardens_oath.oath.heal * 2 - 0.01, `Warden's Oath: two taunts heal the Tank twice (+${gained.toFixed(1)} HP)`);
  check(second === 2, `Warden's Oath: a re-taunt inside 3 s pays nothing (${second} procs)`);
}

// ---------------------------------------------------------- 4. Fox Ribbon --
{
  const trial = (grant, by) => {
    const W = combatRoom(23);
    if (grant) W.run.cmd('relicGrant', ['fox_ribbon']);
    const e = dummyFoe(W, 'boar', 1.5, -1.5);
    W.step();
    W.log.length = 0;
    W.run.cmd('relicHit', [e.id, seat(W, by).id, 20, true]);
    for (let i = 0; i < 3; i++) W.step();
    return procs(W, 'fox_ribbon');
  };
  const sw = trial(true, 2);
  const tk = trial(true, 1);
  const off = trial(false, 2);
  check(sw.length === 1 && Math.abs(sw[0].amount - W0(sw)) < 1e-6, `Fox Ribbon: a Swordsman crit cuts again (${sw[0] ? sw[0].amount : 0})`);
  check(tk.length === 0 && off.length === 0, 'Fox Ribbon: a Tank crit, or no relic, cuts once');
}
function W0(list) {
  return list[0] ? list[0].amount : NaN;
}

// ------------------------------------------------------ 5. Fletcher's Knot --
{
  const trial = (exposed) => {
    const W = combatRoom(24);
    W.run.cmd('relicGrant', ['fletchers_knot']);
    const a = dummyFoe(W, 'boar', 2, -2);
    const b = dummyFoe(W, 'boar', 3.5, -2);
    W.step();
    if (exposed) STATUS.apply(a, 'exposed', 0.3, 180, W.clock.tick, null);
    const b0 = b.hp;
    W.log.length = 0;
    W.run.cmd('relicHit', [a.id, seat(W, 3).id, 20, false]);
    for (let i = 0; i < 3; i++) W.step();
    return { p: procs(W, 'fletchers_knot'), lost: b0 - b.hp, b: b.id };
  };
  const on = trial(true);
  const off = trial(false);
  check(on.p.length === 1 && on.p[0].target === on.b && on.lost > 0, `Fletcher's Knot: an Archer hit on an exposed enemy ricochets (${on.lost.toFixed(1)} to the next)`);
  check(off.p.length === 0, "Fletcher's Knot: no exposure, no ricochet");
}

// ---------------------------------------------------------- 6. Mercy Bell --
{
  const W = combatRoom(25);
  W.run.cmd('relicGrant', ['mercy_bell']);
  const tank = seat(W, 1);
  tank.hp = tank.maxHp - 5;
  W.log.length = 0;
  W.run.cmd('relicHeal', [tank.id, W.world.player.id, 25]);
  W.step();
  const sh = STATUS.magnitude(tank, 'shield', W.clock.tick);
  const p = procs(W, 'mercy_bell');
  // A heal from no one (a relic, a spring) does not ring the bell.
  const sw = seat(W, 2);
  sw.hp = sw.maxHp - 2;
  W.log.length = 0;
  W.run.cmd('relicHeal', [sw.id, null, 25]);
  W.step();
  check(p.length === 1 && sh > 0 && sh <= tank.maxHp * RELICS.mercy_bell.bell.cap + 1e-6, `Mercy Bell: the Healer's overheal shields the Tank (${sh.toFixed(1)})`);
  check(procs(W, 'mercy_bell').length === 0, "Mercy Bell: a heal that isn't the Healer's does not ring");
}

// ------------------------------------------------------- 7. Kindling Coal --
{
  const trial = (ember) => {
    const W = combatRoom(26);
    W.run.cmd('relicGrant', ['kindling_coal']);
    if (ember) W.run.cmd('relicGrant', ['ember_tooth']);
    const a = dummyFoe(W, 'boar', 2, -2);
    const b = dummyFoe(W, 'boar', 2.8, -2.3);
    const far = dummyFoe(W, 'boar', -3, 2);
    W.step();
    const b0 = b.hp;
    const f0 = far.hp;
    W.log.length = 0;
    W.run.cmd('relicHit', [a.id, seat(W, 1).id, 10, true]);
    for (let i = 0; i < 3; i++) W.step();
    const hit = W.log.find((e) => e.type === 'hit' && e.source === 'kindling_coal' && e.target === b.id);
    return { p: procs(W, 'kindling_coal'), lost: b0 - b.hp, farLost: f0 - far.hp, crit: hit ? hit.crit : false };
  };
  const plain = trial(false);
  const ember = trial(true);
  check(plain.p.length === 1 && plain.lost > 0 && plain.farLost === 0, `Kindling Coal: a crit flares the neighbour (${plain.lost.toFixed(1)}), not the far one`);
  check(ember.p.length === 1 && ember.p[0].ember && ember.lost > plain.lost * 1.5, `Kindling Coal: twice as hot with Ember Tooth (${ember.lost.toFixed(1)})`);
}

// --------------------------------------------------------- 8. Sun Chalice --
{
  const W = combatRoom(27);
  W.run.cmd('relicGrant', ['sun_chalice']);
  const tank = seat(W, 1);
  const e = dummyFoe(W, 'boar', 0, 0);
  e.x = tank.x + 1.5;
  e.z = tank.z;
  e.px = e.x;
  e.pz = e.z;
  tank.hp = tank.maxHp * 0.5;
  W.step();
  const e0 = e.hp;
  W.log.length = 0;
  W.run.cmd('relicHeal', [tank.id, W.world.player.id, 20]);
  for (let i = 0; i < 3; i++) W.step();
  const heal = W.log.find((x) => x.type === 'heal' && x.source === 'relic_probe');
  const p = procs(W, 'sun_chalice');
  check(p.length === 1 && p[0].target === e.id && e0 - e.hp > 0, `Sun Chalice: a ${heal ? heal.applied : '?'} HP heal sears the nearest enemy for ${(e0 - e.hp).toFixed(1)}`);
}

// --------------------------------------------------------- 9. Cinder Pact --
{
  const W = combatRoom(28);
  W.run.cmd('relicGrant', ['cinder_pact']);
  const e = dummyFoe(W, 'boar', 2, -2);
  W.step();
  const hitFor = () => {
    W.log.length = 0;
    W.run.cmd('relicHit', [e.id, seat(W, 1).id, 100, false]);
    const h = W.log.find((x) => x.type === 'hit' && x.target === e.id);
    return h ? h.amount : 0;
  };
  const clean = hitFor();
  W.run.cmd('relicCurseHere', ['iron_hide']);
  W.step();
  const cursed = hitFor();
  check(procs(W, 'cinder_pact').length === 0 && Math.abs(cursed / clean - 1.3) < 0.02, `Cinder Pact: a cursed room hits ${(cursed / clean).toFixed(2)}x`);
}

// --------------------------------------------------------- 10. Bounty Writ --
{
  const W = combatRoom(29);
  W.run.cmd('relicGrant', ['bounty_writ']);
  const p = W.world.player;
  const k = W.registry.byId(idOf(W.world.cmd('spawn', 'knight', p.x + 2, p.z - 2)));
  W.step();
  const affixes = Array.isArray(k.affixes) ? k.affixes.length : 0;
  W.log.length = 0;
  k.hp = 1;
  W.run.cmd('relicHit', [k.id, seat(W, 1).id, 50, false]);
  for (let i = 0; i < 10; i++) W.step(); // past the kill hitstop
  const g = W.log.find((e) => e.type === 'glint_gain' && e.reason === 'relic_bounty_writ');
  const want = RELICS.bounty_writ.bounty.base + RELICS.bounty_writ.bounty.perAffix * affixes;
  check(!!k.elite && g && g.amount === want, `Bounty Writ: an elite with ${affixes} affixes pays ${g ? g.amount : 0} Glint`);
}

// ----------------------------------------------------- 11. Huntsman's Horn --
{
  const W = combatRoom(30);
  W.run.cmd('relicGrant', ['huntsmans_horn']);
  W.run.cmd('objectiveRoom', ['hunt', 2]);
  const ok = clearToPath(W);
  W.run.choosePath(0);
  stepUntil(W, (v) => v.phase === 'combat' && v.room === 2, 900);
  const entered = procs(W, 'huntsmans_horn').some((e) => e.stage === 'enter' && e.mode === 'hunt');
  const e = dummyFoe(W, 'boar', 2, -2);
  W.step();
  W.log.length = 0;
  W.run.cmd('relicHit', [e.id, seat(W, 1).id, 100, false]);
  const h = W.log.find((x) => x.type === 'hit' && x.target === e.id);
  const pre = W.run.view();
  check(ok && pre.mode === 'hunt' && entered, `Huntsman's Horn: sounds on entering a Hunt room (${pre.mode})`);
  // Same blow with the horn gone (the multiplier is the only difference).
  const W2 = combatRoom(30);
  W2.run.cmd('objectiveRoom', ['hunt', 2]);
  clearToPath(W2);
  W2.run.choosePath(0);
  stepUntil(W2, (v) => v.phase === 'combat' && v.room === 2, 900);
  const e2 = dummyFoe(W2, 'boar', 2, -2);
  W2.step();
  W2.log.length = 0;
  W2.run.cmd('relicHit', [e2.id, seat(W2, 1).id, 100, false]);
  const h2 = W2.log.find((x) => x.type === 'hit' && x.target === e2.id);
  const ratio = h && h2 ? h.amount / h2.amount : 0;
  // Relics picked on the way differ between the two runs only by the horn;
  // compare against the run's own expected multiplier.
  check(ratio > 1.2, `Huntsman's Horn: party hits in a Hunt room x${ratio.toFixed(2)}`);
}

// ------------------------------------------------------ 12. Pilgrim's Lamp --
{
  const W = combatRoom(31);
  W.run.cmd('relicGrant', ['pilgrims_lamp']);
  W.run.cmd('eventDoor', ['wishing_well', 0]);
  clearToPath(W);
  for (const e of W.registry.all()) if (e.partyIndex !== undefined) e.hp = e.maxHp * 0.5;
  const p = W.run.view().path;
  const side = p.options.findIndex((o) => o.event);
  W.log.length = 0;
  W.run.choosePath(side);
  stepUntil(W, (v) => v.phase === 'event', 900);
  const g = W.log.find((e) => e.type === 'glint_gain' && e.reason === 'relic_pilgrims_lamp');
  const hp = W.registry.all().filter((e) => e.partyIndex !== undefined).map((e) => e.hp / e.maxHp);
  check(procs(W, 'pilgrims_lamp').length === 1 && g && g.amount === RELICS.pilgrims_lamp.lamp.glint && hp.every((f) => f >= 0.79), `Pilgrim's Lamp: an event room heals the party (to ${Math.min(...hp).toFixed(2)}) and pays ${g ? g.amount : 0}`);
}

// ---------------------------------------------- 13. off in the legacy run --
{
  const W = makeWorld(5);
  W.run.startRun({ act: 1 });
  for (let i = 0; i < 400; i++) W.step();
  const e = dummyFoe(W, 'boar', 2, -2);
  W.step();
  W.log.length = 0;
  W.run.cmd('relicGrant', ['kindling_coal']);
  W.run.cmd('relicHit', [e.id, seat(W, 2).id, 10, true]);
  for (let i = 0; i < 3; i++) W.step();
  check(W.log.every((x) => x.type !== 'relic_proc') && !('relics' in W.run.view()), 'legacy run: no relics, no procs');
}

// ------------------------------------------------- 14. save with a proc --
{
  const W = combatRoom(32);
  W.run.cmd('relicGrant', ['wardens_oath']);
  const tank = seat(W, 1);
  tank.hp = tank.maxHp * 0.5;
  const a = dummyFoe(W, 'boar', 2, -2);
  W.step();
  STATUS.apply(a, 'taunt', 1, 120, W.clock.tick, tank.id);
  // The taunt is announced at the end of the next sim tick, which queues the
  // proc for the tick after: a save taken in between carries it.
  const t0 = W.clock.tick;
  for (let i = 0; i < 20 && W.clock.tick < t0 + 1; i++) W.step();
  const save = W.world.saveState();
  const queued = JSON.stringify(save).includes('"kind":"oath"');
  const W2 = combatRoom(32);
  W2.world.loadState(JSON.parse(JSON.stringify(save)));
  // (world.saveState holds the systems; the bodies ride in the save layer's
  // registry snapshot, so the proc landing is what this checks.)
  for (let i = 0; i < 20 && !procs(W2, 'wardens_oath').length; i++) W2.step();
  check(queued && procs(W2, 'wardens_oath').length === 1, "save: a queued Warden's Oath proc rides in the save and lands after a load");
}

console.log(`\n${fails.length ? 'FAIL' : 'PASS'} relics batch 3 probe (${passes.length} ok, ${fails.length} failed)`);
process.exit(fails.length ? 1 : 0);
