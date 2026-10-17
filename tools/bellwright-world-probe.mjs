#!/usr/bin/env node
// TOLLY IN THE WORLD probe (docs/BELLWRIGHT.md "Unlock" and "Tolly in the
// world", content plan 4 slice 6) — headless Node, the same harness as
// tools/tidecaller-world-probe.mjs.
//
//   node tools/bellwright-world-probe.mjs
//
// Checks:
//   1. The unlock: Tolly is locked on a fresh profile; the first Level III
//      clear (a mid-run feat) frees her once; a save that already cleared
//      Level III, or felled a Level III boss, frees her on load; a Records
//      reset keeps her; Rill's gate is untouched.
//   2. Unlocks: the Belltower kit and the Silver Peal tint need her; Wyrm
//      Bronze is free for felling the Barrow Wyrm with her in the party;
//      loadouts keep her kit and tint; her kit boons reach the run.
//   3. Deeds: Tolly's Toll (a level cleared with her in the party) and Full
//      Peal (6 struck by one Peal or Carillon ringing three bells), counted
//      from the bus by the deed tracker.
//   4. Relics: her two class relics are never offered to the default four;
//      with her in the party, Bell-Rope heals her per bell her Peal rings and
//      Verdigris Clapper rings every fourth striking toll again; a mid-fight
//      save continues bit-identically.
//   5. Story data: her camp lines follow the verses held; Tolly joins the
//      People table; the Voice, the Level III card and Wick have lines.
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
const { createDeedRunTracker } = await import(u('src/save/deedrun.js'));
const freed = (prof) => U.bellwrightFreed(prof.get().meta, prof.get().records);

// ------------------------------------------------------------ 1. unlock --
{
  check(L.BELLWRIGHT_FREE === false && !L.bellwrightOpen() && !L.classOpen('bellwright'), 'a fresh page: Tolly is locked');
  check(!L.classOpen('bellwright') && L.plannedLineup('bellwright', '') === L.DEFAULT_LINEUP && same(L.parseTeam('tank,bellwright'), ['tank']), 'locked: she is not offered, and naming her changes nothing (the default four)');
  check(same(L.normalizeLineup(TOLLY), TOLLY), 'a lineup that already holds her stays valid (a save, a host seen by a guest)');
  const prof = freshStore();
  check(!freed(prof) && prof.get().meta.feats.length === 0, 'a fresh profile has not freed her');
  prof.noteLevelClear(1);
  prof.noteLevelClear(2);
  check(!freed(prof) && U.tidecallerFreed(prof.get().meta, prof.get().records), 'Level I and II clears free Rill, not Tolly');
  check(prof.noteFeat('bellwright') === true && freed(prof), 'the first Level III clear frees her (the feat is stored)');
  check(prof.noteFeat('bellwright') === false, 'only once (the toast shows once)');

  const old = freshStore();
  old.noteLevelClear(3);
  check(freed(old), 'a save with a Level III clear frees her on load');
  old.grantFreeUnlocks();
  check(old.get().meta.feats.includes('bellwright'), '... and the boot sync stores the feat');
  check(['wyrm', 'lichram', 'ashraven'].every((k) => U.bellwrightFreed(U.saneMeta({ bosses: { [k]: 1 } }), {})), 'felling the Wyrm, the Lich Ram or the Ash Raven frees her');
  check(!U.bellwrightFreed(U.saneMeta({ bosses: { stag: 3, heron: 1, cantor: 1 } }), { levelClears: { 1: 2, 2: 1, 4: 1 } }), 'other bosses and levels do not');
  check(U.bellwrightFreed(U.saneMeta({ feats: ['bellwright'] }), {}), 'the stored feat alone frees her (a Records reset keeps meta)');
  check(L.setBellwrightUnlocked(true) === true && L.bellwrightOpen() && L.rosterGrown() && same(L.plannedLineup('bellwright', ''), TOLLY), 'freed: she is a choice and joins in the Archer\'s place');
  check(L.setBellwrightUnlocked(false) === false && !L.bellwrightOpen(), 'the lineup gate follows the profile flag');
  L.forceBellwright(true);
  check(L.bellwrightOpen(), '?tolly=1 opens her for a harness');
  L.forceBellwright(false);
}

// ----------------------------------------------------------- 2. unlocks --
{
  const kit = U.UNLOCKS.kit_belltower;
  check(kit && kit.cls === 'bellwright' && kit.cost === 80 && kit.req.feat === 'bellwright' && kit.skills.length === 4 && kit.skills.every((s) => SKILLS[s] && SKILLS[s].cls === 'bellwright'), `the Belltower kit, 80 Embers, needs her (${kit.skills.join(',')})`);
  const silver = U.UNLOCKS.tint_silverpeal;
  const bronze = U.UNLOCKS.tint_wyrmbronze;
  check(silver && silver.cost === 30 && silver.cls === 'bellwright' && bronze && bronze.cost === 0 && bronze.req.feat === 'tolly_wyrm', 'the Silver Peal tint (30) and the free Wyrm Bronze tint');
  const ctx0 = { meta: U.freshMeta(), records: {} };
  check(U.unlockState('kit_belltower', ctx0) === 'locked' && U.unlockState('tint_silverpeal', ctx0) === 'locked', 'both locked on a fresh profile');
  const m1 = U.freshMeta();
  m1.feats.push('bellwright');
  m1.embers = 200;
  check(U.unlockState('kit_belltower', { meta: m1, records: {} }) === 'buy' && U.unlockState('tint_silverpeal', { meta: m1, records: {} }) === 'buy', 'buyable once she is freed');
  check('bellwright' in U.freshLoadout().kits && 'bellwright' in U.freshLoadout().tints, 'loadouts have a Bellwright kit and tint slot');
  m1.owned.kit_belltower = 80;
  m1.owned.tint_silverpeal = 30;
  m1.loadout.kits.bellwright = 'kit_belltower';
  m1.loadout.tints.bellwright = 'tint_silverpeal';
  const back = U.saneMeta(JSON.parse(JSON.stringify(m1)));
  check(back.loadout.kits.bellwright === 'kit_belltower' && back.loadout.tints.bellwright === 'tint_silverpeal' && back.feats.includes('bellwright'), 'her kit, tint and feat survive a save');
  const boons = U.loadoutBoons(back);
  check(boons && same(boons.kits.bellwright, kit.skills) && same(U.sanitizeBoons(boons).kits.bellwright, kit.skills), 'her kit reaches the run boons (sanitised)');
  check(U.loadoutTints(back).bellwright && U.loadoutTints(back).bellwright.glow === silver.colors.glow, 'her tint reaches the VFX tints');

  const prof = freshStore();
  const build = (c, seat) => ({ seat, classId: c, skills: [], filled: 0, sockets: 32, bench: 0, purse: 0 });
  const levels = [{ level: 1, cleared: true, boss: 'stag', rooms: 8, index: 1 }, { level: 2, cleared: true, boss: 'heron', rooms: 8, index: 2 }, { level: 3, cleared: true, boss: 'wyrm', rooms: 8, index: 3 }];
  const sum = (party, pealBest) => ({ act: 3, result: 'defeat', roomsCleared: 24, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false }, builds: party.map(build), relics: [], curses: 0, deedRun: { pealBest } });
  prof.recordRun({ act: 3, victory: false, result: 'defeat', roomsCleared: 24, kills: 80, timeSec: 900, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false } });
  const a = prof.awardRun(sum(TOLLY, 7));
  const m = prof.get().meta;
  check(m.feats.includes('tolly_wyrm') && m.owned.tint_wyrmbronze === 0 && m.feats.includes('bellwright'), 'felling the Wyrm with her in the party frees Wyrm Bronze (and her)');
  check(a.deeds.includes('tollys_toll') && a.deeds.includes('full_peal'), `the run pays Tolly's Toll and Full Peal (${a.deeds.join(',')})`);
  const p2 = freshStore();
  p2.awardRun(sum([...L.DEFAULT_LINEUP], 5));
  const m2 = p2.get().meta;
  check(!m2.feats.includes('tolly_wyrm') && m2.owned.tint_wyrmbronze === undefined && m2.feats.includes('bellwright') && !(m2.deeds || []).includes('tollys_toll') && !(m2.deeds || []).includes('full_peal'), 'without her: no Wyrm Bronze or her deeds, but the Level III clear still frees her');
}

// ------------------------------------------------------------- 3. deeds --
{
  const D = U.DEEDS;
  const base = { cleared: [], deep: [], party: [], pealBest: 0, bosses: [], relics: [], vows: [], curses: 0, runs: 0, depth: 0, challenge: 'standard' };
  check(D.tollys_toll.embers === 25 && D.full_peal.embers === 30, "Tolly's Toll pays 25, Full Peal 30");
  check(D.tollys_toll.test({ ...base, cleared: [1], party: TOLLY }) && !D.tollys_toll.test({ ...base, cleared: [1], party: [...L.DEFAULT_LINEUP] }) && !D.tollys_toll.test({ ...base, party: TOLLY }), "Tolly's Toll: a level cleared with her in the party");
  check(D.full_peal.test({ ...base, pealBest: 6 }) && !D.full_peal.test({ ...base, pealBest: 5 }) && !D.full_peal.test({ cleared: [] }), 'Full Peal: six struck by one ring of three bells');
  check(U.runFacts({ deedRun: { pealBest: 6 } }).pealBest === 6 && U.runFacts({}).pealBest === 0, 'the run facts carry the tracker\'s best peal');
  // The tracker: only her Peals and Carillons with three bells or more count.
  const bus = (() => {
    const ls = {};
    return { on: (t, f) => (ls[t] = ls[t] || []).push(f), emit: (t, ev) => (ls[t] || []).forEach((f) => f(ev)) };
  })();
  const tr = createDeedRunTracker(bus);
  const bells = (n) => Array.from({ length: n }, (_, i) => ({ id: 100 + i, x: 0, z: 0 }));
  const ids = (n) => Array.from({ length: n }, (_, i) => 200 + i);
  bus.emit('ally_cast', { classId: 'bellwright', skill: 'peal', bells: bells(2), targets: ids(9) });
  bus.emit('ally_cast', { classId: 'bellwright', skill: 'peal', bells: [{ id: null, x: 0, z: 0 }], targets: ids(9) });
  bus.emit('ally_cast', { classId: 'tank', skill: 'heavy_slam', bells: bells(3), targets: ids(9) });
  check(tr.facts().pealBest === 0, 'two bells, a Peal round herself, or another class: no count');
  bus.emit('ally_cast', { classId: 'bellwright', skill: 'carillon', bells: bells(3), targets: ids(6) });
  bus.emit('ally_cast', { classId: 'bellwright', skill: 'peal', bells: bells(3), targets: ids(4) });
  check(tr.facts().pealBest === 6, 'three bells ringing six: the best is six');
  tr.reset();
  check(tr.facts().pealBest === 0, 'a new run starts over');
}

// ------------------------------------------------------------ 4. relics --
{
  check(R.RELICS.bell_rope.cls === 'bellwright' && R.RELICS.verdigris_clapper.cls === 'bellwright' && R.CLASS_RELICS.bell_rope === 'bellwright' && R.RELICS.bell_rope.rarity === 'common' && R.RELICS.verdigris_clapper.rarity === 'rare', 'two Bellwright class relics, a common and a rare');
  check(U.UNLOCKS.heirloom_bell_rope && U.UNLOCKS.heirloom_verdigris_clapper, 'each has its heirloom');
  const D = campaign(3);
  const pool = cmd(D, 'relicPool') || [];
  check(pool.length > 0 && !pool.includes('bell_rope') && !pool.includes('verdigris_clapper'), `the default four are never offered them (${pool.length} in the pool)`);
  const W = campaign(4, { lineup: TOLLY });
  const rpool = cmd(W, 'relicPool') || [];
  check(rpool.includes('bell_rope') && rpool.includes('verdigris_clapper'), 'with her in the party both can be offered');
  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  cmd(W, 'relicGrant', 'bell_rope');
  cmd(W, 'relicGrant', 'verdigris_clapper');
  const h = W.world.player;
  for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [1.2, 2.6], [-1, 2.8]]) cmd(W, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  const from = W.log.length;
  const tend = (X) => {
    mend(X);
    for (const e of party(X)) if (e.classId === 'bellwright') e.hp = Math.max(1, e.maxHp - 40); // room to heal
  };
  let snap = null;
  let h1 = null;
  for (let i = 0; i < 3600; i++) {
    W.step();
    tend(W);
    if (i === 400) snap = clonePlain(W.io.capture());
    if (i === 900) h1 = hashState(W.io.capture());
    if (W.run.view().phase !== 'combat' && i > 900) break;
  }
  const evs = W.log.slice(from);
  const tolly = ally(W, 3);
  const rung = (e) => (e.bells || []).filter((b) => b && b.id !== null).length;
  const peals = evs.filter((e) => e.type === 'ally_cast' && e.partyIndex === 3 && Array.isArray(e.bells) && rung(e) > 0);
  const ropes = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'bell_rope');
  const ropeHeals = evs.filter((e) => e.type === 'heal' && e.source === 'bell_rope');
  check(peals.length > 0 && ropes.length === peals.length && ropes.every((p, i) => p.target === tolly.id && p.bells === rung(peals[i])), `Bell-Rope: one heal per Peal that rang bells, sized by its bells (${ropes.length} / ${peals.length} peals)`);
  check(ropeHeals.length > 0 && ropeHeals.every((e) => e.amount <= 3 * 4 + 1e-6 || e.crit) && ropeHeals.some((e) => e.amount >= 3 - 1e-6), `... 3 HP per bell (${ropeHeals.map((e) => e.amount).join(',')})`);
  const striking = evs.filter((e) => e.type === 'azone_tick' && Array.isArray(e.hit) && e.hit.length > 0 && W.log.some((s) => s.type === 'azone_spawn' && s.id === e.id && s.bell));
  const claps = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'verdigris_clapper');
  check(claps.length > 0 && claps.length === Math.floor(striking.length / 4), `Verdigris Clapper: every fourth striking toll rings again (${claps.length} for ${striking.length} tolls)`);
  const clapHits = evs.filter((e) => e.type === 'hit' && e.source === 'verdigris_clapper');
  check(clapHits.length > 0 && clapHits.length === claps.reduce((s, c) => s + c.hit.length, 0), `... striking every enemy in that ring (${clapHits.length} hits)`);
  const A = makeWorld(4);
  check(snap && A.io.apply(snap).ok, 'a save with her relics applies');
  for (let i = 401; i <= 900; i++) {
    A.step();
    tend(A);
  }
  const h2 = hashState(A.io.capture());
  check(h1 === h2, `a mid-fight save with her relics continues bit-identically (${h1} / ${h2})`);
}

// --------------------------------------------------------- 5. story data --
{
  const T = ST.TOLLY_LINES.byVerses.text;
  check(ST.tollyLineFor(3) === T[0] && ST.tollyLineFor(4) === T[1] && ST.tollyLineFor(5) === T[2] && ST.tollyLineFor(0) === T[0] && ST.tollyLineFor(9) === T[2], 'her camp lines follow the verses held');
  check(ST.NPCS.tolly && ST.PEOPLE.some((p) => p.id === 'tolly' && p.feat === 'bellwright'), 'Tolly joins the People table once freed');
  check(!!ST.TOLLY_VOICE.text && !!ST.TOLLY_CLEAR.freed.text && !!ST.TOLLY_CLEAR.along.text && !!ST.KEEPER_TOLLY_LINE.text && ST.TOLLY_LINES.extra.text.length > 0, 'the Hollow Voice, the Level III card and Wick have lines for her');
  check(U.STONE_BOSSES.every((k) => ST.BOSS_VOICE[k]), 'every Level III boss has its Voice line (hers follows it)');
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
