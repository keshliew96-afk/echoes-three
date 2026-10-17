#!/usr/bin/env node
// SABLE IN THE WORLD probe (docs/DUSKWING.md "Unlock" and "Sable in the
// world", content plan 5 slice 6) — headless Node, the same harness as
// tools/bellwright-world-probe.mjs.
//
//   node tools/duskwing-world-probe.mjs
//
// Checks:
//   1. The unlock: Sable is locked on a fresh profile; the first Level IV
//      clear (a mid-run feat) frees him once; a save that already cleared
//      Level IV, or felled a Level IV boss, frees him on load; a Records
//      reset keeps him; Rill's and Tolly's gates are untouched.
//   2. Unlocks: the Night Roost kit and the Gloaming tint need him;
//      Heartblood is free for felling the Hollow Cantor with him in the
//      party; loadouts keep his kit and tint; his kit boons reach the run.
//   3. Deeds: Sable's Night (a level cleared with him in the party) and
//      Lights Out (6 blinded by one cast), counted from the bus by the deed
//      tracker.
//   4. Relics: his two class relics are never offered to the default four;
//      with him in the party, Ripe Fig heals him per enemy his Dusk Dive
//      lands on and Moonless Fang bites every fourth of his blows on a
//      blinded enemy again; a real fight fills Lights Out's count; a
//      mid-fight save continues bit-identically.
//   5. Story data: his camp lines follow the verses held; Sable joins the
//      People table; the Voice, the Level IV card and Wick have lines.
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
const SABLE = ['healer', 'tank', 'swordsman', 'duskwing'];
const KIT = ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings'];
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
const freed = (prof) => U.duskwingFreed(prof.get().meta, prof.get().records);

// ------------------------------------------------------------ 1. unlock --
{
  check(L.DUSKWING_FREE === false && !L.duskwingOpen() && !L.classOpen('duskwing'), 'a fresh page: Sable is locked');
  check(L.plannedLineup('duskwing', '') === L.DEFAULT_LINEUP && same(L.parseTeam('tank,duskwing'), ['tank']), 'locked: he is not offered, and naming him changes nothing (the default four)');
  check(same(L.normalizeLineup(SABLE), SABLE), 'a lineup that already holds him stays valid (a save, a host seen by a guest)');
  const prof = freshStore();
  check(!freed(prof) && prof.get().meta.feats.length === 0, 'a fresh profile has not freed him');
  prof.noteLevelClear(1);
  prof.noteLevelClear(2);
  prof.noteLevelClear(3);
  check(!freed(prof) && U.tidecallerFreed(prof.get().meta, prof.get().records) && U.bellwrightFreed(prof.get().meta, prof.get().records), 'Level I to III clears free Rill and Tolly, not Sable');
  check(prof.noteFeat('duskwing') === true && freed(prof), 'the first Level IV clear frees him (the feat is stored)');
  check(prof.noteFeat('duskwing') === false, 'only once (the toast shows once)');

  const old = freshStore();
  old.noteLevelClear(4);
  check(freed(old), 'a save with a Level IV clear frees him on load');
  old.grantFreeUnlocks();
  check(old.get().meta.feats.includes('duskwing'), '... and the boot sync stores the feat');
  check(['cantor', 'colossus', 'veinweaver'].every((k) => U.duskwingFreed(U.saneMeta({ bosses: { [k]: 1 } }), {})), 'felling the Cantor, the Colossus or the Vein Weaver frees him');
  check(!U.duskwingFreed(U.saneMeta({ bosses: { stag: 3, heron: 1, wyrm: 1, hush: 1 } }), { levelClears: { 1: 2, 2: 1, 3: 1, 5: 1 } }), 'other bosses and levels do not');
  check(U.duskwingFreed(U.saneMeta({ feats: ['duskwing'] }), {}), 'the stored feat alone frees him (a Records reset keeps meta)');
  check(!U.tidecallerFreed(U.saneMeta({ feats: ['duskwing'] }), {}) && !U.bellwrightFreed(U.saneMeta({ feats: ['duskwing'] }), {}), 'his feat frees neither Rill nor Tolly');
  check(L.setDuskwingUnlocked(true) === true && L.duskwingOpen() && L.rosterGrown() && same(L.plannedLineup('duskwing', ''), SABLE), 'freed: he is a choice and joins in the Archer\'s place');
  check(!L.tidecallerOpen() && !L.bellwrightOpen(), '... and Rill and Tolly stay locked');
  check(L.setDuskwingUnlocked(false) === false && !L.duskwingOpen(), 'the lineup gate follows the profile flag');
  L.forceDuskwing(true);
  check(L.duskwingOpen(), '?sable=1 opens him for a harness');
  L.forceDuskwing(false);
}

// ----------------------------------------------------------- 2. unlocks --
{
  const kit = U.UNLOCKS.kit_nightroost;
  check(kit && kit.cls === 'duskwing' && kit.cost === 80 && kit.req.feat === 'duskwing' && kit.skills.length === 4 && kit.skills.every((s) => SKILLS[s] && SKILLS[s].cls === 'duskwing' && !C.CLASS_BASE_KIT.duskwing.includes(s)), `the Night Roost kit, 80 Embers, needs him, four skills outside his base kit (${kit.skills.join(',')})`);
  const gloam = U.UNLOCKS.tint_gloaming;
  const blood = U.UNLOCKS.tint_heartblood;
  check(gloam && gloam.cost === 30 && gloam.cls === 'duskwing' && gloam.req.feat === 'duskwing' && blood && blood.cost === 0 && blood.req.feat === 'sable_cantor', 'the Gloaming tint (30) and the free Heartblood tint');
  const ctx0 = { meta: U.freshMeta(), records: {} };
  check(U.unlockState('kit_nightroost', ctx0) === 'locked' && U.unlockState('tint_gloaming', ctx0) === 'locked' && U.unlockState('tint_heartblood', ctx0) === 'locked', 'all three locked on a fresh profile');
  const m1 = U.freshMeta();
  m1.feats.push('duskwing');
  m1.embers = 200;
  check(U.unlockState('kit_nightroost', { meta: m1, records: {} }) === 'buy' && U.unlockState('tint_gloaming', { meta: m1, records: {} }) === 'buy', 'buyable once he is freed');
  check('duskwing' in U.freshLoadout().kits && 'duskwing' in U.freshLoadout().tints, 'loadouts have a Duskwing kit and tint slot');
  m1.owned.kit_nightroost = 80;
  m1.owned.tint_gloaming = 30;
  m1.loadout.kits.duskwing = 'kit_nightroost';
  m1.loadout.tints.duskwing = 'tint_gloaming';
  const back = U.saneMeta(JSON.parse(JSON.stringify(m1)));
  check(back.loadout.kits.duskwing === 'kit_nightroost' && back.loadout.tints.duskwing === 'tint_gloaming' && back.feats.includes('duskwing'), 'his kit, tint and feat survive a save');
  const boons = U.loadoutBoons(back);
  check(boons && same(boons.kits.duskwing, kit.skills) && same(U.sanitizeBoons(boons).kits.duskwing, kit.skills), 'his kit reaches the run boons (sanitised)');
  check(U.loadoutTints(back).duskwing && U.loadoutTints(back).duskwing.glow === gloam.colors.glow, 'his tint reaches the VFX tints');

  const prof = freshStore();
  const build = (c, seat) => ({ seat, classId: c, skills: [], filled: 0, sockets: 32, bench: 0, purse: 0 });
  const levels = [1, 2, 3, 4].map((n) => ({ level: n, cleared: true, boss: ['stag', 'heron', 'wyrm', 'cantor'][n - 1], rooms: 8, index: n }));
  const sum = (party, blindBest) => ({ act: 4, result: 'defeat', roomsCleared: 32, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false }, builds: party.map(build), relics: [], curses: 0, deedRun: { blindBest } });
  prof.recordRun({ act: 4, victory: false, result: 'defeat', roomsCleared: 32, kills: 100, timeSec: 1200, seed: 9, challenge: 'standard', campaign: { mode: 'campaign', levels, complete: false } });
  const a = prof.awardRun(sum(SABLE, 7));
  const m = prof.get().meta;
  check(m.feats.includes('sable_cantor') && m.owned.tint_heartblood === 0 && m.feats.includes('duskwing'), 'felling the Cantor with him in the party frees Heartblood (and him)');
  check(a.deeds.includes('sables_night') && a.deeds.includes('lights_out'), `the run pays Sable's Night and Lights Out (${a.deeds.join(',')})`);
  const p2 = freshStore();
  p2.awardRun(sum([...L.DEFAULT_LINEUP], 5));
  const m2 = p2.get().meta;
  check(!m2.feats.includes('sable_cantor') && m2.owned.tint_heartblood === undefined && m2.feats.includes('duskwing') && !(m2.deeds || []).includes('sables_night') && !(m2.deeds || []).includes('lights_out'), 'without him: no Heartblood or his deeds, but the Level IV clear still frees him');
  check(!(a.deeds || []).includes('tollys_toll') && !(a.deeds || []).includes('rills_return'), 'the other heroes\' deeds are untouched');
}

// ------------------------------------------------------------- 3. deeds --
{
  const D = U.DEEDS;
  const base = { cleared: [], deep: [], party: [], blindBest: 0, bosses: [], relics: [], vows: [], curses: 0, runs: 0, depth: 0, challenge: 'standard' };
  check(D.sables_night.embers === 25 && D.lights_out.embers === 30, "Sable's Night pays 25, Lights Out 30");
  check(D.sables_night.test({ ...base, cleared: [1], party: SABLE }) && !D.sables_night.test({ ...base, cleared: [1], party: [...L.DEFAULT_LINEUP] }) && !D.sables_night.test({ ...base, party: SABLE }), "Sable's Night: a level cleared with him in the party");
  check(D.lights_out.test({ ...base, blindBest: 6 }) && !D.lights_out.test({ ...base, blindBest: 5 }) && !D.lights_out.test({ cleared: [] }), 'Lights Out: six blinded by one cast');
  check(U.runFacts({ deedRun: { blindBest: 6 } }).blindBest === 6 && U.runFacts({}).blindBest === 0, 'the run facts carry the tracker\'s best blind');
  const bus = (() => {
    const ls = {};
    return { on: (t, f) => (ls[t] = ls[t] || []).push(f), emit: (t, ev) => (ls[t] || []).forEach((f) => f(ev)) };
  })();
  const tr = createDeedRunTracker(bus);
  const blind = (tick, src, n, status = 'blind') => {
    for (let i = 0; i < n; i++) bus.emit('status_apply', { tick, id: 200 + i, status, src });
  };
  blind(10, 5, 4);
  blind(11, 5, 4);
  blind(12, 5, 8, 'slow');
  check(tr.facts().blindBest === 4, 'blinds on two ticks never add up; another status never counts');
  blind(20, 5, 3);
  blind(20, 6, 3);
  check(tr.facts().blindBest === 4, 'two casters on one tick never add up');
  blind(30, 5, 7);
  check(tr.facts().blindBest === 7, 'seven blinded by one cast: the best is seven');
  tr.reset();
  check(tr.facts().blindBest === 0, 'a new run starts over');
}

// ------------------------------------------------------------ 4. relics --
{
  check(R.RELICS.ripe_fig.cls === 'duskwing' && R.RELICS.moonless_fang.cls === 'duskwing' && R.CLASS_RELICS.ripe_fig === 'duskwing' && R.RELICS.ripe_fig.rarity === 'common' && R.RELICS.moonless_fang.rarity === 'rare', 'two Duskwing class relics, a common and a rare');
  check(U.UNLOCKS.heirloom_ripe_fig && U.UNLOCKS.heirloom_moonless_fang, 'each has its heirloom');
  const D = campaign(3);
  const pool = cmd(D, 'relicPool') || [];
  check(pool.length > 0 && !pool.includes('ripe_fig') && !pool.includes('moonless_fang'), `the default four are never offered them (${pool.length} in the pool)`);
  const W = campaign(4, { lineup: SABLE });
  const rpool = cmd(W, 'relicPool') || [];
  check(rpool.includes('ripe_fig') && rpool.includes('moonless_fang'), 'with him in the party both can be offered');
  const tracker = createDeedRunTracker(W.bus);
  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  cmd(W, 'relicGrant', 'ripe_fig');
  cmd(W, 'relicGrant', 'moonless_fang');
  const h = W.world.player;
  for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [1.2, 2.6], [-1, 2.8], [2.2, 2.2], [-2.2, -2.2]]) cmd(W, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  const from = W.log.length;
  const tend = (X) => {
    mend(X);
    for (const e of party(X)) if (e.classId === 'duskwing') e.hp = Math.max(1, e.maxHp - 40); // room to heal
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
  const sable = ally(W, 3);
  const dives = evs.filter((e) => e.type === 'ally_cast' && e.partyIndex === 3 && e.skill === 'dusk_dive' && Array.isArray(e.targets) && e.targets.length > 0);
  const figs = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'ripe_fig');
  const figHeals = evs.filter((e) => e.type === 'heal' && e.source === 'ripe_fig');
  check(dives.length > 0 && figs.length === dives.length && figs.every((p, i) => p.target === sable.id && p.struck === dives[i].targets.length), `Ripe Fig: one heal per Dusk Dive that struck, sized by what it struck (${figs.length} / ${dives.length} dives)`);
  check(figHeals.length > 0 && figHeals.every((e, i) => e.amount === 3 * figs[i].struck || e.crit), `... 3 HP per enemy (${figHeals.map((e) => e.amount).join(',')})`);
  // Moonless Fang: replay the blinds from the log, then count his blows on
  // the blinded the way the relic does. The bus announces a blind at the end
  // of its tick, after that tick's hits, so the replay can be one blow off.
  const blindTill = new Map();
  let onBlind = 0;
  for (const e of W.log) {
    if (e.type === 'status_apply' && e.status === 'blind') blindTill.set(e.id, e.untilTick);
    else if (e.type === 'status_expire' && e.status === 'blind') blindTill.delete(e.id);
    else if (e.type === 'hit' && e.attacker === sable.id && e.amount > 0 && !R.RELICS[e.source] && W.log.indexOf(e) >= from && (blindTill.get(e.target) ?? -1) > e.tick) onBlind += 1;
  }
  const fangs = evs.filter((e) => e.type === 'relic_proc' && e.relic === 'moonless_fang');
  const fangHits = evs.filter((e) => e.type === 'hit' && e.source === 'moonless_fang');
  check(fangs.length > 0 && Math.abs(fangs.length - Math.floor(onBlind / 4)) <= 1, `Moonless Fang: every fourth blow of his on a blinded enemy bites again (${fangs.length} for ${onBlind} blows)`);
  check(fangHits.length > 0 && fangHits.length <= fangs.length && fangHits.every((e) => e.amount === 8 || e.crit || e.amount < 8), `... for 8 each (${fangHits.length} bites)`);
  check(evs.some((e) => e.type === 'heal' && e.source === 'night_hunger' && e.target === sable.id), 'his own Night Hunger still feeds him beside them');
  check(tracker.facts().blindBest >= 2, `a real fight fills the Lights Out count (best ${tracker.facts().blindBest} by one cast)`);
  const A = makeWorld(4);
  check(snap && A.io.apply(snap).ok, 'a save with his relics applies');
  for (let i = 401; i <= 900; i++) {
    A.step();
    tend(A);
  }
  const h2 = hashState(A.io.capture());
  check(h1 === h2, `a mid-fight save with his relics continues bit-identically (${h1} / ${h2})`);
}

// --------------------------------------------------------- 5. story data --
{
  const T = ST.SABLE_LINES.byVerses.text;
  check(ST.sableLineFor(4) === T[0] && ST.sableLineFor(5) === T[1] && ST.sableLineFor(0) === T[0] && ST.sableLineFor(9) === T[T.length - 1], 'his camp lines follow the verses held');
  check(ST.NPCS.sable && ST.PEOPLE.some((p) => p.id === 'sable' && p.feat === 'duskwing'), 'Sable joins the People table once freed');
  check(!!ST.SABLE_VOICE.text && !!ST.SABLE_CLEAR.freed.text && !!ST.SABLE_CLEAR.along.text && !!ST.KEEPER_SABLE_LINE.text && ST.SABLE_LINES.extra.text.length > 0, 'the Hollow Voice, the Level IV card and Wick have lines for him');
  check(U.HEART_BOSSES.every((k) => ST.BOSS_VOICE[k]), 'every Level IV boss has its Voice line (his follows it)');
  check(U.FEATS.duskwing && U.FEATS.sable_cantor, 'his two feats are known to the profile');
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
