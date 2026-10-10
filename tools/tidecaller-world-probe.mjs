#!/usr/bin/env node
// RILL IN THE WORLD probe (docs/TIDECALLER.md "Unlock", the plan's slice 4) —
// headless Node, the same harness as tools/tidecaller-probe.mjs.
//
//   node tools/tidecaller-world-probe.mjs
//
// Checks:
//   1. The unlock: Rill is locked on a fresh profile; the first Level II
//      clear (a mid-run feat) frees her once; a save that already cleared
//      Level II, or felled the Heron or the Millwheel, frees her on load;
//      a Records reset keeps her.
//   2. Unlocks: the Millrace kit and the Brine tint need her; Heron Rain is
//      free for felling the Drowned Heron with her in the party; loadouts
//      keep her kit and tint; her kit boons reach the run.
//   3. Deeds: Rill's Return (a level cleared with her in the party) and High
//      Water (5 soaked enemies crashed by one cast).
//   4. Relics: her two class relics are never offered to the default four;
//      with her in the party, Otter's Pearl heals her per crash and Millrace
//      Charm spreads the soak every fourth soaked hit, both on the bus.
//   5. Story data: her camp lines follow the verses held; Rill joins the
//      People table.
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

const U = await import(u('src/data/unlocks.js'));
const R = await import(u('src/sim/relics.js'));
const ST = await import(u('src/data/story.js'));
const { createSaveStorage } = await import(u('src/save/storage.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}
let clockMs = Date.parse('2026-10-10T00:00:00Z');
const now = () => new Date((clockMs += 1000)).toISOString();
const freshStore = () => createProfileStore({ store: createSaveStorage({ storage: memStorage() }), now });
const freed = (prof) => U.tidecallerFreed(prof.get().meta, prof.get().records);

// ------------------------------------------------------------ 1. unlock --
{
  check(L.TIDECALLER_FREE === false && !L.tidecallerOpen(), 'a fresh page: Rill is locked');
  const prof = freshStore();
  check(!freed(prof) && prof.get().meta.feats.length === 0, 'a fresh profile has not freed her');
  prof.noteLevelClear(1);
  check(!freed(prof), 'a Level I clear does not free her');
  check(prof.noteFeat('tidecaller') === true && freed(prof), 'the first Level II clear frees her (the feat is stored)');
  check(prof.noteFeat('tidecaller') === false, 'only once (the toast shows once)');
  check(prof.noteFeat('bogus') === false && !prof.get().meta.feats.includes('bogus'), 'an unknown feat is refused');

  // Saves from before this build: the records prove it.
  const old = freshStore();
  old.noteLevelClear(2);
  check(freed(old), 'a save with a Level II clear frees her on load');
  old.grantFreeUnlocks();
  check(old.get().meta.feats.includes('tidecaller'), '... and the boot sync stores the feat');
  const mw = U.saneMeta({ bosses: { millwheel: 1 } });
  check(U.tidecallerFreed(mw, {}) && U.tidecallerFreed(U.saneMeta({ bosses: { heron: 2 } }), {}), 'felling the Millwheel or the Heron frees her');
  check(!U.tidecallerFreed(U.saneMeta({ bosses: { stag: 3, wyrm: 1 } }), { levelClears: { 1: 2, 3: 1 } }), 'other bosses and levels do not');
  check(U.tidecallerFreed(U.saneMeta({ feats: ['tidecaller'] }), {}), 'the stored feat alone frees her (a Records reset keeps meta)');
  check(L.setTidecallerUnlocked(true) === true && L.tidecallerOpen() && L.setTidecallerUnlocked(false) === false, 'the lineup gate follows the profile flag');
  L.forceTidecaller(true);
  check(L.tidecallerOpen(), '?rill=1 opens her for a harness');
  L.forceTidecaller(false);
}

// ----------------------------------------------------------- 2. unlocks --
{
  const kit = U.UNLOCKS.kit_millrace;
  check(kit && kit.cls === 'tidecaller' && kit.cost === 80 && kit.req.feat === 'tidecaller' && kit.skills.every((s) => SKILLS[s] && SKILLS[s].cls === 'tidecaller') && kit.skills.includes('riverbolt'), `the Millrace kit, 80 Embers, needs her (${kit.skills.join(',')})`);
  const brine = U.UNLOCKS.tint_brine;
  const rain = U.UNLOCKS.tint_heronrain;
  check(brine && brine.cost === 30 && brine.cls === 'tidecaller' && rain && rain.cost === 0 && rain.req.feat === 'rill_heron', 'the Brine tint (30) and the free Heron Rain tint');
  const ctx0 = { meta: U.freshMeta(), records: {} };
  check(U.unlockState('kit_millrace', ctx0) === 'locked' && U.unlockState('tint_brine', ctx0) === 'locked', 'both locked on a fresh profile');
  const m1 = U.freshMeta();
  m1.feats.push('tidecaller');
  m1.embers = 200;
  check(U.unlockState('kit_millrace', { meta: m1, records: {} }) === 'buy' && U.unlockState('tint_brine', { meta: m1, records: {} }) === 'buy', 'buyable once she is freed');
  check('tidecaller' in U.freshLoadout().kits && 'tidecaller' in U.freshLoadout().tints, 'loadouts have a Tidecaller kit and tint slot');
  m1.owned.kit_millrace = 80;
  m1.owned.tint_brine = 30;
  m1.loadout.kits.tidecaller = 'kit_millrace';
  m1.loadout.tints.tidecaller = 'tint_brine';
  const back = U.saneMeta(JSON.parse(JSON.stringify(m1)));
  check(back.loadout.kits.tidecaller === 'kit_millrace' && back.loadout.tints.tidecaller === 'tint_brine' && back.feats.includes('tidecaller'), 'her kit, tint and feat survive a save');
  const boons = U.loadoutBoons(back);
  check(boons && same(boons.kits.tidecaller, kit.skills) && same(U.sanitizeBoons(boons).kits.tidecaller, kit.skills), 'her kit reaches the run boons (sanitised)');
  check(U.loadoutTints(back).tidecaller && U.loadoutTints(back).tidecaller.glow === brine.colors.glow, 'her tint reaches the VFX tints');

  // The Heron with her in the party pays the free tint.
  const prof = freshStore();
  const build = (c, seat) => ({ seat, classId: c, skills: [], filled: 0, sockets: 32, bench: 0, purse: 0 });
  const levels = [{ level: 1, cleared: true, boss: 'stag', rooms: 8, index: 1 }, { level: 2, cleared: true, boss: 'heron', rooms: 8, index: 2 }];
  prof.recordRun({ act: 2, victory: false, result: 'defeat', roomsCleared: 16, kills: 50, timeSec: 600, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false } });
  const a = prof.awardRun({ act: 2, result: 'defeat', roomsCleared: 16, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false }, builds: RILL.map(build), relics: [], curses: 0, crashBest: 6 });
  const m = prof.get().meta;
  check(m.feats.includes('rill_heron') && m.owned.tint_heronrain === 0, 'felling the Heron with her in the party frees Heron Rain');
  check(a.deeds.includes('rills_return') && a.deeds.includes('high_water'), `the run pays Rill's Return and High Water (${a.deeds.join(',')})`);
  const p2 = freshStore();
  p2.awardRun({ act: 2, result: 'defeat', roomsCleared: 16, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false }, builds: L.DEFAULT_LINEUP.map(build), relics: [], curses: 0, crashBest: 4 });
  const m2 = p2.get().meta;
  check(!m2.feats.includes('rill_heron') && m2.owned.tint_heronrain === undefined && m2.feats.includes('tidecaller'), 'without her: no Heron Rain, but the Level II clear still frees her');
}

// ------------------------------------------------------------- 3. deeds --
{
  const D = U.DEEDS;
  const base = { cleared: [], deep: [], party: [], crashBest: 0, bosses: [], relics: [], vows: [], curses: 0, runs: 0, depth: 0, challenge: 'standard' };
  check(D.rills_return.embers === 25 && D.high_water.embers === 30, "Rill's Return pays 25, High Water 30");
  check(D.rills_return.test({ ...base, cleared: [1], party: RILL }) && !D.rills_return.test({ ...base, cleared: [1], party: [...L.DEFAULT_LINEUP] }) && !D.rills_return.test({ ...base, party: RILL }), "Rill's Return: a level cleared with her in the party");
  check(D.high_water.test({ ...base, crashBest: 5 }) && !D.high_water.test({ ...base, crashBest: 4 }) && !D.high_water.test({ cleared: [] }), 'High Water: five crashed by one cast');
}

// ------------------------------------------------------------ 4. relics --
{
  check(R.RELICS.otters_pearl.cls === 'tidecaller' && R.RELICS.millrace_charm.cls === 'tidecaller' && R.CLASS_RELICS.otters_pearl === 'tidecaller', 'two Tidecaller class relics');
  check(!R.dailyOmen(12345).relic.startsWith('otters') && R.RELIC_IDS.filter((id) => !R.RELICS[id].cls).every((id) => id !== 'millrace_charm'), 'never the Daily omen (class relics are left out)');
  const D = campaign(3);
  const pool = cmd(D, 'relicPool') || [];
  check(pool.length > 0 && !pool.includes('otters_pearl') && !pool.includes('millrace_charm'), `the default four are never offered them (${pool.length} in the pool)`);
  const W = campaign(4, { lineup: RILL });
  const rpool = cmd(W, 'relicPool') || [];
  check(rpool.includes('otters_pearl') && rpool.includes('millrace_charm'), 'with her in the party both can be offered');
  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  cmd(W, 'relicGrant', 'otters_pearl');
  cmd(W, 'relicGrant', 'millrace_charm');
  const h = W.world.player;
  for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [1.2, 2.6], [-1, 2.8]]) cmd(W, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  const from = W.log.length;
  const tend = (X) => {
    mend(X);
    for (const e of party(X)) if (e.classId === 'tidecaller') e.hp = Math.max(1, e.maxHp - 30); // room to heal
  };
  let snap = null;
  let h1 = null;
  for (let i = 0; i < 3600; i++) {
    W.step();
    tend(W);
    if (i === 400) snap = clonePlain(W.io.capture());
    if (i === 700) h1 = hashState(W.io.capture());
    if (W.run.view().phase !== 'combat' && i > 700) break;
  }
  const evs = W.log.slice(from);
  const rill = ally(W, 3);
  const crashes = evs.filter((e) => e.type === 'crash' && e.seat === 3);
  const pearls = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'otters_pearl');
  const pearlHeals = evs.filter((e) => e.type === 'heal' && e.source === 'otters_pearl');
  check(crashes.length > 0 && pearls.length === crashes.length && pearls.every((p) => p.target === rill.id), `Otter's Pearl: one heal per enemy crashed (${pearls.length} / ${crashes.length} crashes)`);
  check(pearlHeals.length > 0 && pearlHeals.every((e) => e.amount <= 2 + 1e-6 || e.crit), `... each for 2 HP (${pearlHeals.length} heals)`);
  const charms = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'millrace_charm');
  const charmSoaks = charms.filter((c) => evs.some((e) => e.type === 'status_apply' && e.status === 'soaked' && e.id === c.target && e.tick === c.tick));
  check(charms.length > 0, `Millrace Charm spreads the soak (${charms.length} spreads)`);
  check(charms.every((c) => c.target !== c.from && Math.hypot(c.x - c.fx, c.z - c.fz) <= 1.5 + 0.8), 'each spread lands on another enemy within reach');
  check(charmSoaks.length === charms.length, `each spread is a real soak (${charmSoaks.length})`);
  // Determinism: a mid-fight save with her relics continues identically.
  const A = makeWorld(4);
  check(snap && A.io.apply(snap).ok, 'a save with her relics applies');
  for (let i = 401; i <= 700; i++) {
    A.step();
    tend(A);
  }
  const h2 = hashState(A.io.capture());
  check(h1 === h2, `a mid-fight save with her relics continues bit-identically (${h1} / ${h2})`);
}

// --------------------------------------------------------- 5. story data --
{
  check(ST.rillLineFor(2) === ST.RILL_LINES.byVerses.text[0] && ST.rillLineFor(3) === ST.RILL_LINES.byVerses.text[1] && ST.rillLineFor(4) === ST.RILL_LINES.byVerses.text[2] && ST.rillLineFor(0) === ST.RILL_LINES.byVerses.text[0], 'her camp lines follow the verses held');
  check(ST.NPCS.rill && ST.PEOPLE.some((p) => p.id === 'rill' && p.feat === 'tidecaller'), 'Rill joins the People table once freed');
  check(!!ST.RILL_VOICE.text && !!ST.RILL_CLEAR.freed.text && !!ST.RILL_CLEAR.along.text && !!ST.KEEPER_RILL_LINE.text, 'the Hollow Voice, the Level II card and Wick have lines for her');
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
