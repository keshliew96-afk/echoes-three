#!/usr/bin/env node
// VOW RANKS probe (plan 4 slice 10, docs/UNLOCKS.md "Vow ranks"). Headless:
// the data rules, the profile store and short sim runs. Never imports
// src/render.
//
//   catalogue  eight vows (the six plus the Spire's two), three ranks each;
//              rank I is the curse's own number; every new line in all ten
//              languages
//   boons      a rank-I loadout makes the boons it always made; ranks II and
//              III travel as `vowRanks`; sanitizeBoons drops what is not a
//              worn vow's rank II or III
//   level      the Vow level adds the ranks; six rank-I vows pay +150% as six
//              vows always did, past six each level pays +15%
//   best       a beaten mode (campaign complete, the campaign won inside an
//              Endless Descent, a Boss Rush won) records its best; a loss, a
//              lower level and the Daily never do; the deeds at 5, 10 and 15
//   profile    the store steps a vow through its ranks, keeps them over a
//              reload, and an old save loads at rank I with no bests
//   sim        a run with no vows is the same run twice; a rank-I vow is the
//              same run whether or not the rank is named; Iron Hide, Restless
//              and Short Fuse bite harder at rank III; Thin Air weakens the
//              first heal; Heavy Bell slows the dodge ring
//
//   node tools/vow-ranks-probe.mjs [--out captures/vow-ranks-probe.json]
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const U = await import(u('src/data/unlocks.js'));
const V = await import(u('src/data/vows.js'));
const { CURSES, cursedDiff, dodgeCooldownTicks } = await import(u('src/sim/relics.js'));
const { createSaveStorage } = await import(u('src/save/storage.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = opt('out', 'captures/vow-ranks-probe.json');

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}
const near = (a, b, eps = 0.011) => Math.abs(a - b) <= eps;

// ------------------------------------------------------------ catalogue --
const VOW_UNLOCKS = U.UNLOCK_IDS.filter((id) => U.UNLOCKS[id].kind === 'vow');
{
  check('catalogue', 'eight vows: the six and the Spire’s Thin Air and Heavy Bell', VOW_UNLOCKS.length === 8 && U.UNLOCKS.vow_thin_air && U.UNLOCKS.vow_heavy_bell, VOW_UNLOCKS);
  check('catalogue', 'every vow has three ranks', VOW_UNLOCKS.every((id) => V.VOW_RANKS[U.UNLOCKS[id].curse] && V.VOW_RANKS[U.UNLOCKS[id].curse].ranks.length === 3));
  check('catalogue', 'the Spire vows open on Level V and the Skyhorn Warden', U.UNLOCKS.vow_thin_air.req.level === 5 && U.UNLOCKS.vow_heavy_bell.req.boss === 'skyhorn');
  check('catalogue', 'no door carries a Spire vow', !CURSES.thin_air && !CURSES.heavy_bell && V.SPIRE_VOW_IDS.join() === 'thin_air,heavy_bell');
  // Rank I is the curse exactly; ranks II and III land on their numbers.
  const base = { budget: 10, defendBudget: 8, hpMul: 1, dmgMul: 1, eliteChance: 0.05, waveIntervalTicks: 600 };
  const field = { eliteAdd: (d) => r2(d.eliteChance - base.eliteChance), budgetMul: (d) => d.budget / base.budget, hpMul: (d) => d.hpMul, dmgMul: (d) => d.dmgMul, waveMul: (d) => d.waveIntervalTicks / base.waveIntervalTicks };
  const bad = [];
  for (const [id, row] of Object.entries(V.VOW_RANKS)) {
    if (!row.key) continue;
    for (let r = 1; r <= 3; r++) {
      const got = field[row.key](cursedDiff(base, id, V.vowScale(id, r)));
      if (!near(got, row.ranks[r - 1])) bad.push({ id, r, got, want: row.ranks[r - 1] });
    }
    if (JSON.stringify(cursedDiff(base, id, V.vowScale(id, 1))) !== JSON.stringify(cursedDiff(base, id))) bad.push({ id, rankI: 'differs' });
    if (!near(row.ranks[0], CURSES[id].diff[row.key], 1e-9)) bad.push({ id, rankI: CURSES[id].diff[row.key] });
  }
  check('catalogue', 'the five wave vows read their rank’s numbers (rank I = the curse)', bad.length === 0, bad.length ? bad : null);
  const f1 = V.vowFuseRule('short_fuse', 1);
  const f3 = V.vowFuseRule('short_fuse', 3);
  check('catalogue', 'Short Fuse: rank I is the curse (0.8, 0.6 s floor), rank III 0.6 over a 0.5 s floor', f1 === CURSES.short_fuse.fuse && f3.mul === 0.6 && f3.minTicks === 30, { f1, f3 });
  // Text: the card names the three numbers.
  const txt = U.UNLOCKS.vow_iron_hide;
  check('catalogue', 'a card’s text fills its three ranks', txt.vars.r1 === 40 && txt.vars.r2 === 70 && txt.vars.r3 === 100 && /\{r3\}/.test(txt.text), txt.vars);
  // Every new line in the nine other languages.
  const keys = new Set([...VOW_UNLOCKS.map((id) => U.UNLOCKS[id].text), ...VOW_UNLOCKS.map((id) => U.UNLOCKS[id].name), 'Five Oaths', 'Ten Oaths', 'Fifteen Oaths', ...['sworn_five', 'sworn_ten', 'sworn_fifteen'].map((d) => U.DEEDS[d].text), 'VOW LEVEL', 'Vow level {n} +{pct}%', 'Sworn at rank {rank}', 'Raise to {rank}', 'The Daily is vow-free.', 'One seed for everyone, no vows', 'Best Vow level']);
  const miss = {};
  for (const l of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru']) {
    const t = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    const m = [...keys].filter((k) => typeof t[k] !== 'string' || !t[k]);
    if (m.length) miss[l] = m;
  }
  check('catalogue', `all ${keys.size} vow lines in the nine other languages`, Object.keys(miss).length === 0, Object.keys(miss).length ? miss : null);
}
function r2(v) {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------- boons --
const metaWith = (vows, ranks = {}) => {
  const m = U.freshMeta();
  for (const id of vows) m.owned[id] = 0;
  m.loadout.vows = vows.slice();
  m.loadout.vowRanks = { ...ranks };
  return U.saneMeta(m);
};
{
  const b1 = U.loadoutBoons(metaWith(['vow_iron_hide', 'vow_restless']));
  check('boons', 'a rank-I loadout makes the boons it always made', JSON.stringify(b1) === JSON.stringify({ vows: ['iron_hide', 'restless'] }), b1);
  const b3 = U.loadoutBoons(metaWith(['vow_iron_hide', 'vow_restless', 'vow_thin_air'], { vow_iron_hide: 3, vow_thin_air: 2 }));
  check('boons', 'ranks II and III ride as vowRanks', JSON.stringify(b3) === JSON.stringify({ vows: ['iron_hide', 'restless', 'thin_air'], vowRanks: { iron_hide: 3, thin_air: 2 } }), b3);
  const s = U.sanitizeBoons({ vows: ['iron_hide', 'heavy_bell', 'nope'], vowRanks: { iron_hide: 4, heavy_bell: 3, crowded: 3, nope: 2 } });
  check('boons', 'sanitizeBoons keeps a worn vow’s rank II or III only', JSON.stringify(s) === JSON.stringify({ vows: ['iron_hide', 'heavy_bell'], vowRanks: { heavy_bell: 3 } }), s);
  check('boons', 'no vows: no boons', U.loadoutBoons(U.freshMeta()) === null);
}

// ---------------------------------------------------------------- level --
{
  check('level', 'the Vow level adds the ranks', V.vowLevelOf({ vows: ['iron_hide', 'restless', 'thin_air'], vowRanks: { iron_hide: 3, thin_air: 2 } }) === 6 && V.vowLevelOf(null) === 0);
  check('level', 'six rank-I vows pay +150%, as six vows always did', V.vowPayPct(6) === 150 && V.vowPayPct(1) === 25 && V.vowPayPct(2) === 50);
  check('level', 'past six each level pays +15%', V.vowPayPct(7) === 165 && V.vowPayPct(10) === 210 && V.vowPayPct(15) === 285 && V.vowPayPct(24) === 420, [7, 10, 15, 24].map(V.vowPayPct));
  check('level', 'the deepest Vow level is 24 (eight vows at rank III)', V.MAX_VOW_LEVEL === 24);
  // The award: the Vow level line and its Embers.
  const s = summaryOf({ complete: true, result: 'victory', boons: { vows: ['iron_hide', 'crowded', 'sharp_fangs'], vowRanks: { iron_hide: 3, crowded: 3, sharp_fangs: 3 } } });
  const f = U.runFacts(s);
  const a = U.awardFor(f, U.freshMeta());
  const line = a.lines.find((l) => /^Vow level/.test(l.label));
  check('level', 'three vows at rank III: Vow level 9, +195%', f.vowLevel === 9 && line && line.label === 'Vow level 9 +195%', line);
  const old = U.awardFor({ ...f, vowLevel: undefined, vows: ['iron_hide', 'crowded'] }, U.freshMeta());
  check('level', 'facts from before the ranks pay by vow count', old.lines.some((l) => l.label === 'Vow level 2 +50%'));
}

// ----------------------------------------------------------------- best --
function camp(o = {}) {
  return {
    mode: 'campaign',
    levels: o.levels ?? [{ level: 1, index: 1, cleared: !!o.complete }],
    complete: !!o.complete,
    ...(o.daily ? { daily: { key: o.daily } } : {}),
    ...(o.endless ? { endless: true, won: !!o.won, depth: 6 } : {}),
    ...(o.rush ? { rush: { felled: o.rush.felled, won: !!o.rush.won, fights: 10, line: [] } } : {}),
  };
}
function summaryOf(o = {}) {
  return { result: o.result ?? 'defeat', seed: 1, roomsCleared: 3, campaign: camp(o), relics: [], builds: null, deedRun: {}, ...(o.boons ? { boons: o.boons } : {}) };
}
const B = (level) => {
  const vows = ['iron_hide', 'crowded', 'sharp_fangs', 'elite_tide', 'restless', 'short_fuse', 'thin_air', 'heavy_bell'];
  const out = { vows: [], vowRanks: {} };
  let left = level;
  for (const v of vows) {
    if (left <= 0) break;
    const r = Math.min(3, left);
    out.vows.push(v);
    if (r > 1) out.vowRanks[v] = r;
    left -= r;
  }
  return out;
};
{
  const award = (o, meta = U.freshMeta()) => U.awardFor(U.runFacts(summaryOf(o)), meta);
  const won = award({ complete: true, result: 'victory', boons: B(7) });
  check('best', 'a campaign completed at Vow level 7 is a new campaign best', won.vow && won.vow.mode === 'campaign' && won.vow.level === 7 && won.vow.newBest, won.vow);
  const lost = award({ boons: B(7) });
  check('best', 'a lost campaign is no best', lost.vow && !lost.vow.beaten && !lost.vow.newBest, lost.vow);
  const meta = U.freshMeta();
  meta.vowBest = U.vowBestAfter(meta.vowBest, won.vow);
  check('best', 'the best is stored per mode', meta.vowBest.campaign === 7 && meta.vowBest.endless === 0 && meta.vowBest.rush === 0, meta.vowBest);
  const lower = award({ complete: true, result: 'victory', boons: B(5) }, meta);
  check('best', 'a lower level beaten is no new best', lower.vow && lower.vow.best === 7 && !lower.vow.newBest && U.vowBestAfter(meta.vowBest, lower.vow).campaign === 7);
  const rush = award({ rush: { felled: 10, won: true }, result: 'victory', boons: B(4) });
  check('best', 'a Boss Rush won records the rush best', rush.vow.mode === 'rush' && rush.vow.newBest && U.vowBestAfter(meta.vowBest, rush.vow).rush === 4, rush.vow);
  const rushLost = award({ rush: { felled: 7, won: false }, boons: B(4) });
  check('best', 'a Boss Rush lost keeps none', !rushLost.vow.newBest);
  const deep = award({ endless: true, won: true, boons: B(3) });
  check('best', 'an Endless Descent whose campaign was won records the Endless best', deep.vow.mode === 'endless' && deep.vow.newBest, deep.vow);
  const shallow = award({ endless: true, won: false, boons: B(3) });
  check('best', 'an Endless fall before the campaign was won keeps none', !shallow.vow.newBest);
  const daily = U.runFacts(summaryOf({ daily: '2026-10-15', complete: true, boons: B(5) }));
  check('best', 'the Daily keeps no Vow level', daily.vowMode === null && daily.vowLevel === 0);
  // Deeds at 5, 10 and 15.
  const deeds = (lv, o = {}) => award({ complete: true, result: 'victory', boons: B(lv), ...o }).deeds.filter((d) => d.startsWith('sworn_'));
  check('best', 'Five Oaths at Vow level 5', deeds(5).join() === 'sworn_five' && deeds(4).length === 0, { at5: deeds(5), at4: deeds(4) });
  check('best', 'Ten and Fifteen Oaths at 10 and 15', deeds(10).join() === 'sworn_five,sworn_ten' && deeds(15).join() === 'sworn_five,sworn_ten,sworn_fifteen', { at10: deeds(10), at15: deeds(15) });
  check('best', 'the oath deeds need the mode beaten', award({ boons: B(15) }).deeds.filter((d) => d.startsWith('sworn_')).length === 0);
}

// -------------------------------------------------------------- profile --
{
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
  };
  let ms = Date.parse('2026-10-15T00:00:00Z');
  const now = () => new Date((ms += 1000)).toISOString();
  const storage = mem();
  let prof = createProfileStore({ store: createSaveStorage({ storage }), now });
  // Iron Hide (Level III) and Restless (Level IV) earned and Iron Hide worn
  // the old way (equip: no rank named).
  prof.noteLevelClear(3);
  prof.noteLevelClear(4);
  prof.grantFreeUnlocks();
  prof.equipUnlock('vow_iron_hide', true);
  prof = createProfileStore({ store: createSaveStorage({ storage }), now });
  const m0 = prof.get().meta;
  check('profile', 'a vow worn the old way reads rank I, with no bests', m0.loadout.vows.join() === 'vow_iron_hide' && Object.keys(m0.loadout.vowRanks).length === 0 && m0.vowBest.campaign === 0, { vows: m0.loadout.vows, ranks: m0.loadout.vowRanks, best: m0.vowBest });
  const old = U.saneMeta({ mv: 1, embers: 5, owned: { vow_crowded: 0 }, loadout: { vows: ['vow_crowded'] } });
  check('profile', 'a meta from before the ranks loads at rank I with no bests', old.loadout.vows.join() === 'vow_crowded' && JSON.stringify(old.loadout.vowRanks) === '{}' && JSON.stringify(old.vowBest) === '{"campaign":0,"endless":0,"rush":0}');
  const junk = U.saneMeta({ owned: { vow_crowded: 0, vow_iron_hide: 0 }, loadout: { vows: ['vow_crowded'], vowRanks: { vow_crowded: 9, vow_iron_hide: 3 } }, vowBest: { campaign: 99, rush: -2, endless: 'x' } });
  check('profile', 'damaged ranks and bests are cleaned', junk.loadout.vowRanks.vow_crowded === 3 && junk.loadout.vowRanks.vow_iron_hide === undefined && junk.vowBest.campaign === 24 && junk.vowBest.rush === 0 && junk.vowBest.endless === 0, { ranks: junk.loadout.vowRanks, best: junk.vowBest });
  const steps = [];
  for (let i = 0; i < 4; i++) {
    const cur = prof.get().meta.loadout;
    const now = cur.vows.includes('vow_iron_hide') ? cur.vowRanks.vow_iron_hide || 1 : 0;
    prof.setVowRank('vow_iron_hide', now >= 3 ? 0 : now + 1);
    const l = prof.get().meta.loadout;
    steps.push(l.vows.includes('vow_iron_hide') ? l.vowRanks.vow_iron_hide || 1 : 0);
  }
  check('profile', 'a vow steps I → II → III → off → I', steps.join() === '2,3,0,1', steps);
  prof.setVowRank('vow_iron_hide', 3);
  prof.setVowRank('vow_restless', 2);
  check('profile', 'not owned: no rank', prof.setVowRank('vow_thin_air', 2).ok === false);
  prof = createProfileStore({ store: createSaveStorage({ storage }), now }); // a reload
  const l = prof.get().meta.loadout;
  check('profile', 'the ranks survive a reload', l.vowRanks.vow_iron_hide === 3 && l.vowRanks.vow_restless === 2, l.vowRanks);
  const boons = U.loadoutBoons(prof.get().meta);
  check('profile', 'the reloaded loadout makes Vow level 5 boons', V.vowLevelOf(boons) === 5, boons);
  const a = prof.awardRun(summaryOf({ complete: true, result: 'victory', boons }));
  check('profile', 'a campaign won at Vow level 5 stores the best and pays Five Oaths', prof.get().meta.vowBest.campaign === 5 && a.deeds.includes('sworn_five') && a.vow.newBest, { best: prof.get().meta.vowBest, deeds: a.deeds });
  prof.setVowRank('vow_iron_hide', 0);
  check('profile', 'taking a vow off forgets its rank', !prof.get().meta.loadout.vows.includes('vow_iron_hide') && prof.get().meta.loadout.vowRanks.vow_iron_hide === undefined);
}

// ------------------------------------------------------------------ sim --
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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const log = [];
  bus.on('*', (e) => log.push(e));
  const run = world.runSystem();
  const step = (n = 1, ap = null) => {
    for (let i = 0; i < n; i++) clock.stepOnce((t) => world.step(t, ap ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  };
  return { world, run, step, log };
}
const H = (log) => createHash('sha256').update(JSON.stringify(log)).digest('hex').slice(0, 16);
{
  const room1 = (boons, seed = 7) => {
    const g = build(seed);
    g.run.startCampaign({ level: 1, ...(boons ? { boons } : {}) });
    g.run.autopilot.configure(true);
    for (let i = 0; i < 60 * 70 && !g.log.some((e) => e.type === 'room_cleared'); i++) g.step(1, g.run.autopilot);
    return g;
  };
  const plain = room1(null);
  const again = room1(null);
  check('sim', 'a run with no vows is the same run twice', H(plain.log) === H(again.log));
  const hideI = room1({ vows: ['iron_hide'] });
  const hideNamed = room1({ vows: ['iron_hide'], vowRanks: { iron_hide: 1 } });
  check('sim', 'a rank-I vow is the same run whether or not its rank is named', H(hideI.log) === H(hideNamed.log));
  const hideIII = room1({ vows: ['iron_hide'], vowRanks: { iron_hide: 3 } });
  const hp = (g) => (g.log.find((e) => e.type === 'enemy_spawn' && Number.isFinite(e.hp)) || {}).hp;
  const h1 = hp(hideI);
  const h3 = hp(hideIII);
  check('sim', 'Iron Hide III: the first enemy has 2.0× its HP where rank I gives 1.4×', h1 > 0 && h3 > 0 && near(h3 / h1, 2 / 1.4, 0.02), { rankI: h1, rankIII: h3 });
  const waves = (g) => g.log.filter((e) => e.type === 'wave_start').map((e) => e.tick);
  const rI = waves(room1({ vows: ['restless'] }));
  const rIII = waves(room1({ vows: ['restless'], vowRanks: { restless: 3 } }));
  check('sim', 'Restless III: the second wave comes sooner than at rank I', rI.length > 1 && rIII.length > 1 && rIII[1] - rIII[0] < rI[1] - rI[0], { rankI: rI.slice(0, 3), rankIII: rIII.slice(0, 3) });
  const spans = (g) => g.log.filter((e) => e.type === 'telegraph_start' && Number.isFinite(e.resolveTick)).map((e) => e.resolveTick - e.tick);
  const fI = spans(room1({ vows: ['short_fuse'] }));
  const fIII = spans(room1({ vows: ['short_fuse'], vowRanks: { short_fuse: 3 } }));
  const mean = (a) => a.reduce((n, v) => n + v, 0) / Math.max(1, a.length);
  check('sim', 'Short Fuse III: warnings shorter than rank I on average, never under 0.5 s', fI.length && fIII.length && mean(fIII) < mean(fI) && Math.min(...fIII) >= 30, { meanI: r2(mean(fI)), meanIII: r2(mean(fIII)), minIII: Math.min(...fIII) });
  // The first heal of the run (both runs are the same run until it lands).
  const firstHeal = (boons) => {
    const g = build(7);
    g.run.startCampaign({ level: 1, ...(boons ? { boons } : {}) });
    g.run.autopilot.configure(true);
    for (let i = 0; i < 60 * 120 && !g.log.some((e) => e.type === 'heal' && e.amount > 0); i++) {
      g.step(1, g.run.autopilot);
      const v = g.run.view();
      if (v.phase === 'transit') g.run.campaignAdvance('probe');
    }
    return g;
  };
  const heal = (g) => g.log.find((e) => e.type === 'heal' && e.amount > 0);
  const thin = firstHeal({ vows: ['thin_air'], vowRanks: { thin_air: 3 } });
  const a = heal(firstHeal(null));
  const b = heal(thin);
  check('sim', 'Thin Air III: the first heal is 40% weaker', a && b && a.tick === b.tick && a.crit === b.crit && near(b.amount / a.amount, 0.6, 0.005), { plain: a && a.amount, thin: b && b.amount });
  // A Spire vow never touches a room's waves: the first wave is the plain run's.
  const firstWave = (g) => g.log.find((e) => e.type === 'room_start');
  check('sim', 'Thin Air leaves the room’s waves as they were', JSON.stringify(firstWave(plain)) === JSON.stringify(firstWave(thin)) && !!firstWave(thin));
  const g = build(7);
  g.run.startCampaign({ level: 1, boons: { vows: ['heavy_bell'], vowRanks: { heavy_bell: 3 } } });
  g.step(5);
  const rl = g.run.relics();
  check('sim', 'Heavy Bell III: the dodge ring reads 65% slower', rl && rl.vowDodge === 0.65 && dodgeCooldownTicks(72, [], rl.vowDodge) === Math.round(72 * 1.65), { vowDodge: rl && rl.vowDodge });
  const g0 = build(7);
  g0.run.startCampaign({ level: 1 });
  g0.step(5);
  check('sim', 'no vow: the relic view has no vowDodge', g0.run.relics() && g0.run.relics().vowDodge === undefined);
  // The Daily never takes boons.
  const gd = build(7);
  gd.run.startCampaign({ level: 1, daily: { key: '2026-10-15' }, boons: { vows: ['iron_hide'], vowRanks: { iron_hide: 3 } } });
  gd.step(5);
  check('sim', 'the Daily is vow-free whatever it is handed', !gd.run.view().boons);
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ probe: 'vow-ranks', failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
