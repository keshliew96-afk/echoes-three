#!/usr/bin/env node
// Small fixes 5 probe (v0.5.289), headless:
//
//   node tools/small-fixes-5-probe.mjs
//
//   storm   Stormglass works in every land: in a fight with no gust vent it
//           gathers its own gust (a lane from the carrier through the
//           nearest enemy, shown 40 ticks) and blows it for the vents' 12%;
//           a Spire room with gust vents leaves it to the vents
//   crowns  Four Crowns and Five Crowns count either champion of a land
//   rush    a co-op rush keeps its own most felled; the rush count is shared
//   text    the changed lines in all nine other languages
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
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { RELICS } = await import(u('src/sim/relics.js'));
const { DEEDS } = await import(u('src/data/unlocks.js'));
const { rushLine } = await import(u('src/data/rush.js'));

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null && !ok ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
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
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  const run = () => world.runSystem();
  const cmd = (name, ...args) => world.cmd(name, ...args);
  return { registry, bus, clock, world, io, step, log, run, cmd };
}
const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
const mend = (w) => {
  for (const e of heroes(w)) e.hp = e.maxHp;
};
function place(b, x, z) {
  b.x = b.px = x;
  b.z = b.pz = z;
}
const toCombat = (w) => {
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
};
function room(level, seed, n, before = null) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  if (before) before(w);
  w.cmd('skipToRoom', n);
  toCombat(w);
  return w;
}

// --------------------------------------------------------------- storm --
const LANDS = { 1: 'Wood', 2: 'Mill', 3: 'Barrow', 4: 'Heart' };
for (const level of [1, 2, 3, 4]) {
  const w = room(level, 5, 2);
  w.cmd('relicGrant', 'stormglass');
  const hero = w.run().view ? heroes(w).find((e) => e.partyIndex === 0) : null;
  const boar = w.registry.byId(idOf(w.cmd('spawn', 'boar', 3, 0)));
  boar.maxHp = boar.hp = 5000;
  boar.elite = false;
  const vents = w.registry.all().some((e) => e.kind === 'hazard' && e.htype === 'gust');
  const pin = () => {
    mend(w);
    place(hero, 0, 0);
    place(boar, 3, 0);
    boar.status = {};
    for (const e of w.registry.all()) if (e.faction === 'hostile' && e.id !== boar.id && e.hp > 0 && Math.hypot(e.x, e.z) < 4) place(e, e.x + (e.x >= 0 ? 6 : -6), e.z);
  };
  w.log.length = 0;
  let gather = null;
  for (let i = 0; i < 700 && !gather; i++) {
    pin();
    w.step();
    gather = w.log.find((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && e.stage === 'gather');
  }
  let storm = null;
  for (let i = 0; i < 80 && gather && !storm; i++) {
    pin();
    w.step();
    storm = w.log.find((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && e.own && e.tick > gather.tick);
  }
  const L = gather && gather.lane;
  // (The bodies drift a little inside a tick: aimed within ~10 degrees.)
  const aimed = !!L && L.x1 - L.x0 > 8.8 && Math.abs(L.z1 - L.z0) < 1.6 && Math.abs(L.x0 - 0.5) < 0.1;
  const dmg = w.log.filter((h) => h.type === 'hit' && h.target === boar.id && h.source === 'stormglass').reduce((s, h) => s + h.amount / (h.crit ? 1.5 : 1), 0);
  check('storm', `${LANDS[level]} room 2 (no vent: ${!vents}): the glass gathers its own gust down a lane at the nearest enemy (tick ${gather?.tick})`, !vents && !!gather && aimed, { lane: L });
  check('storm', `${LANDS[level]}: it blows ${RELICS.stormglass.storm.gatherTicks} ticks later and strikes it for 12% of max HP (${dmg.toFixed(0)} of 5000)`, !!storm && storm.tick - gather.tick === RELICS.stormglass.storm.gatherTicks && storm.hit.includes(boar.id) && Math.abs(dmg - 600) < 1, { dt: storm && storm.tick - gather.tick, dmg });
  if (level === 1) {
    // Every 8 s: the next gather comes one beat after the first.
    let next = null;
    for (let i = 0; i < 520 && !next; i++) {
      pin();
      w.step();
      next = w.log.find((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && e.stage === 'gather' && e.tick > gather.tick);
    }
    check('storm', `the next gust gathers ${RELICS.stormglass.storm.everyTicks} ticks after the first (${next ? next.tick - gather.tick : '?'})`, !!next && next.tick - gather.tick === RELICS.stormglass.storm.everyTicks);
    // A save mid-gather keeps the gust coming and the beat after it.
    const snap = clonePlain(w.io.capture());
    const w2 = build(5);
    const ok = w2.io.apply(clonePlain(snap));
    const h2 = heroes(w2).find((e) => e.partyIndex === 0);
    const b2 = w2.registry.byId(boar.id);
    w2.log.length = 0;
    for (let i = 0; i < 600; i++) {
      mend(w2);
      place(h2, 0, 0);
      place(b2, 3, 0);
      w2.step();
    }
    const blew = w2.log.find((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && e.own);
    const again = w2.log.find((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && e.stage === 'gather');
    check('storm', 'a save mid-gather: the gust still blows after a load, and the next gathers on the beat', ok !== false && !!blew && blew.tick === next.tick + RELICS.stormglass.storm.gatherTicks && !!again && again.tick === next.tick + RELICS.stormglass.storm.everyTicks, { blew: blew?.tick, again: again?.tick, next: next.tick });
  }
}
{
  // The Spire's vents keep their own gusts; the glass blows none of its own.
  const w = build(7);
  w.run().startCampaign({ level: 5, harness: true });
  toCombat(w);
  w.cmd('setLayout', 29);
  w.cmd('relicGrant', 'stormglass');
  const vents = w.registry.all().filter((e) => e.kind === 'hazard' && e.htype === 'gust').length;
  w.log.length = 0;
  for (let i = 0; i < 1200; i++) {
    mend(w);
    w.step();
  }
  const own = w.log.filter((e) => e.type === 'relic_proc' && e.relic === 'stormglass' && (e.stage === 'gather' || e.own)).length;
  const ventGusts = w.log.filter((e) => e.type === 'hazard_resolve' && e.gust).length;
  check('storm', `a Spire room with ${vents} gust vents: the vents gust (${ventGusts}) and the glass blows none of its own (${own})`, vents > 0 && ventGusts > 0 && own === 0);
}
{
  // Without the relic nothing gathers.
  const w = room(1, 5, 2);
  w.log.length = 0;
  for (let i = 0; i < 700; i++) {
    mend(w);
    w.step();
  }
  check('storm', 'no Stormglass, no gust of its own', !w.log.some((e) => e.type === 'relic_proc' && e.relic === 'stormglass'));
}

// -------------------------------------------------------------- crowns --
{
  const facts = { cleared: [], bosses: [], champions: [], relics: [], vows: [], objectives: [] };
  const life = (champion) => ({ champion, bosses: [] });
  const four = DEEDS.four_crowns;
  const five = DEEDS.five_crowns;
  const seconds = ['moss_hart', 'lockkeeper', 'gravebell_ringer', 'vein_matron'];
  const mixed = ['briar_knight', 'lockkeeper', 'bone_reeve', 'vein_matron'];
  check('crowns', 'Four Crowns: the four second champions crown the four lands', four.test(facts, life(seconds)) && four.goal(life(seconds)).join() === '4,4');
  check('crowns', 'Four Crowns: a mix of firsts and seconds, one per land, counts', four.test(facts, life(mixed)));
  check('crowns', 'Four Crowns: both of one land count once (3 lands of 4)', !four.test(facts, life(['briar_knight', 'moss_hart', 'sluice_warden', 'lockkeeper', 'bone_reeve'])) && four.goal(life(['briar_knight', 'moss_hart', 'sluice_warden', 'lockkeeper', 'bone_reeve'])).join() === '3,4');
  check('crowns', 'Five Crowns: four seconds and the Gale Herald', !!five && five.test(facts, life([...seconds, 'gale_herald'])) && !five.test(facts, life(seconds)) && five.goal(life(seconds)).join() === '4,5');
}

// ---------------------------------------------------------------- rush --
{
  const won = { result: 'victory', timeSec: 480, seed: 1, challenge: 'standard', campaign: { mode: 'campaign', levels: rushLine(1, []).map((b) => ({ level: b.act, index: b.fight, cleared: true, boss: b.kind, rooms: 2 })), rush: { felled: 10, fights: 10, won: true, line: rushLine(1, []) }, complete: false } };
  const lost = (n) => ({ ...won, result: 'defeat', campaign: { ...won.campaign, rush: { felled: n, fights: 10, won: false, line: rushLine(1, []) } } });
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
  const { createProfileStore } = await import(u('src/save/profile.js'));
  const { createSaveStorage } = await import(u('src/save/storage.js'));
  const store = createProfileStore({ store: createSaveStorage({ storage }) });
  store.recordRun({ act: 2, victory: false, result: 'defeat', timeSec: 200, seed: 2, campaign: lost(4).campaign });
  store.recordRun({ act: 2, victory: false, result: 'defeat', timeSec: 200, seed: 3, campaign: lost(7).campaign, coop: true });
  store.recordRun({ act: 2, victory: false, result: 'defeat', timeSec: 200, seed: 4, campaign: lost(2).campaign, coop: true });
  const r = store.get().records;
  check('rush', `solo most felled 4, co-op most felled 7, rushes 3 shared (${r.rushMostFelled}, ${r.rushCoopMostFelled}, ${r.rushRuns})`, r.rushMostFelled === 4 && r.rushCoopMostFelled === 7 && r.rushRuns === 3);
  // An old profile without the field reads 0.
  const old = JSON.parse(JSON.stringify(store.get()));
  delete old.records.rushCoopMostFelled;
  check('rush', 'the fresh profile starts it at 0', (createProfileStore({ store: createSaveStorage({ storage: { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 } }) }).get().records.rushCoopMostFelled) === 0);
  const src = readFileSync(join(here, 'src/ui/run/levels.js'), 'utf8');
  check('rush', 'the lobby card reads the co-op most felled', /coop \? rec\.rushCoopMostFelled : rec\.rushMostFelled/.test(src) && src.includes("t('Co-op most felled: {n} of {total}'"));
}

// ---------------------------------------------------------------- text --
{
  const LANGS = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const keys = [RELICS.stormglass.text, DEEDS.four_crowns.text, DEEDS.five_crowns.text, 'Co-op most felled: {n} of {total}'];
  const miss = [];
  for (const l of LANGS) {
    const tab = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of keys) if (typeof tab[k] !== 'string' || !tab[k]) miss.push(`${l}: ${k.slice(0, 30)}`);
  }
  check('text', `the changed lines in all nine other languages (${keys.length} x 9)`, miss.length === 0, miss);
}

console.log(`\nsmall-fixes-5-probe: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
