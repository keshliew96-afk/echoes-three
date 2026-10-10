#!/usr/bin/env node
// DEEDS AND UNLOCKS, ROUND TWO probe (docs/UNLOCKS.md "Round two"), headless,
// no browser:
//   catalogue  the seventeen new deeds, five kits (real skills of the right
//              class), four tints and two vows; every new line in all ten
//              languages
//   deeds      each new deed is paid by the run that meets it and not by one
//              that does not; deeds counted across runs (event rooms,
//              affixes, champions, arenas, every boss, Daily days in a row)
//              add up over several runs on one profile
//   reqs       a deed opens an unlock (the Crowned tint free, the Short Fuse
//              vow); marks survive a damaged or older meta
//   vows       the Short Fuse vow shortens enemy warnings and Restless brings
//              waves sooner; with no vows the campaign is the same run
//   live       whole autopilot campaigns with the save service's tracker on
//              the sim bus: what it gathers matches the run's own events,
//              and the award pays the matching deeds
//
//   node tools/deeds-unlocks-2-probe.mjs [--seeds 1,2,3,4] [--out captures/deeds-unlocks-2-probe.json]
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
const { SKILLS } = await import(u('src/sim/skills.js'));
const { ENCOUNTER_IDS } = await import(u('src/sim/encounters.js'));
const { AFFIX_IDS } = await import(u('src/sim/affixes.js'));
const { CHAMPION_IDS } = await import(u('src/sim/champions.js'));
const { createDeedRunTracker } = await import(u('src/save/deedrun.js'));
const { createSaveStorage } = await import(u('src/save/storage.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = opt('out', 'captures/deeds-unlocks-2-probe.json');
const SEEDS = String(opt('seeds', '1,2,3,4')).split(',').map(Number);

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

const NEW_DEEDS = ['wayfarer', 'signbreaker', 'run_to_ground', 'scorched_nests', 'safe_home', 'holdfast', 'four_trials', 'crownbreaker', 'four_crowns', 'keyholder', 'treasure_seeker', 'ringwalker', 'hoarder', 'kingslayer', 'down_the_river', 'three_dawns', 'seven_dawns'];
const NEW_KITS = { kit_dawnwatch: 'healer', kit_earthwarden: 'tank', kit_moonblade: 'swordsman', kit_huntmaster: 'archer', kit_stormwater: 'tidecaller' };
const NEW_TINTS = ['tint_heartlight', 'tint_censersmoke', 'tint_hollowtide', 'tint_crowned'];
const NEW_VOWS = { vow_restless: 'restless', vow_short_fuse: 'short_fuse' };

// ------------------------------------------------------------- catalogue --
{
  check('catalogue', 'seventeen new deeds', NEW_DEEDS.every((d) => U.DEEDS[d]), NEW_DEEDS.filter((d) => !U.DEEDS[d]));
  const kitOk = Object.entries(NEW_KITS).map(([id, cls]) => {
    const k = U.UNLOCKS[id];
    return { id, ok: !!k && k.kind === 'kit' && k.cls === cls && k.skills.length >= 2 && k.skills.every((s) => SKILLS[s] && (SKILLS[s].cls || 'healer') === cls) };
  });
  check('catalogue', 'five kits of real skills of their class', kitOk.every((r) => r.ok), kitOk.filter((r) => !r.ok));
  const boons = U.sanitizeBoons({ kits: Object.fromEntries(Object.entries(NEW_KITS).map(([id, cls]) => [cls, U.UNLOCKS[id].skills])) });
  check('catalogue', 'the run accepts every new kit whole', Object.entries(NEW_KITS).every(([id, cls]) => boons && boons.kits[cls] && boons.kits[cls].join() === U.UNLOCKS[id].skills.join()));
  check('catalogue', 'four tints with colours', NEW_TINTS.every((id) => U.UNLOCKS[id] && U.UNLOCKS[id].kind === 'tint' && /^#[0-9A-F]{6}$/i.test(U.UNLOCKS[id].colors.glow)));
  const vb = U.sanitizeBoons({ vows: Object.values(NEW_VOWS) });
  check('catalogue', 'two vows the run accepts', Object.keys(NEW_VOWS).every((id) => U.UNLOCKS[id] && U.UNLOCKS[id].kind === 'vow') && vb && vb.vows.length === 2, vb);
  check('catalogue', 'four arenas', U.ARENA_IDS.join() === '21,23,25,27', U.ARENA_IDS);
  // Every new line in every language.
  const keys = new Set(['{have} of {need}', 'Earn the deed {deed}']);
  for (const d of NEW_DEEDS) keys.add(U.DEEDS[d].name).add(U.DEEDS[d].text);
  for (const id of [...Object.keys(NEW_KITS), ...NEW_TINTS, ...Object.keys(NEW_VOWS)]) keys.add(U.UNLOCKS[id].name).add(U.UNLOCKS[id].text);
  const miss = {};
  for (const l of ['de', 'es', 'fr', 'pt-BR', 'ru', 'ja', 'ko', 'zh-Hans', 'zh-Hant']) {
    const t = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    const m = [...keys].filter((k) => typeof t[k] !== 'string' || !t[k]);
    if (m.length) miss[l] = m;
  }
  check('catalogue', `all ${keys.size} new lines in the nine other languages`, Object.keys(miss).length === 0, Object.keys(miss).length ? miss : null);
}

// ----------------------------------------------------------------- deeds --
// A run's facts built from a summary, as the save service passes them.
const camp = (o = {}) => ({ mode: 'campaign', levels: o.levels ?? [{ level: 1, index: 1, cleared: false }], complete: !!o.complete, ...(o.daily ? { daily: { key: o.daily } } : {}) });
const summaryOf = (o = {}) => ({ result: o.result ?? 'defeat', seed: 1, roomsCleared: 3, campaign: camp(o), relics: o.relics ?? [], builds: o.party ? o.party.map((c) => ({ classId: c })) : null, deedRun: o.deedRun ?? {} });
const paid = (o, meta = U.freshMeta()) => U.awardFor(U.runFacts(summaryOf(o)), meta).deeds;
{
  const none = paid({});
  check('deeds', 'a plain short run pays none of the new deeds', NEW_DEEDS.every((d) => !none.includes(d)), none);
  const cases = [
    ['run_to_ground', { deedRun: { objectives: ['hunt'] } }],
    ['scorched_nests', { deedRun: { objectives: ['purge'] } }],
    ['safe_home', { deedRun: { objectives: ['escort'] } }],
    ['holdfast', { deedRun: { objectives: ['hold'] } }],
    ['four_trials', { deedRun: { objectives: ['hunt', 'purge', 'escort', 'hold'] } }],
    ['crownbreaker', { deedRun: { champions: ['briar_knight'] } }],
    ['keyholder', { deedRun: { vaults: 1 } }],
    ['treasure_seeker', { deedRun: { vaults: 3 } }],
    ['hoarder', { relics: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }],
    ['wayfarer', { deedRun: { events: ENCOUNTER_IDS.slice() } }],
    ['signbreaker', { deedRun: { affixes: AFFIX_IDS.slice() } }],
    ['four_crowns', { deedRun: { champions: CHAMPION_IDS.slice() } }],
    ['ringwalker', { deedRun: { arenas: [21, 23, 25, 27] } }],
    ['down_the_river', { complete: true, result: 'victory', levels: [1, 2, 3, 4].map((l) => ({ level: l, index: l, cleared: true })), party: ['healer', 'tank', 'archer', 'tidecaller'] }],
  ];
  for (const [deed, o] of cases) check('deeds', `${deed} is paid when met`, paid(o).includes(deed), paid(o));
  const near = [
    ['four_trials', { deedRun: { objectives: ['hunt', 'purge', 'escort'] } }],
    ['treasure_seeker', { deedRun: { vaults: 2 } }],
    ['hoarder', { relics: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    ['wayfarer', { deedRun: { events: ENCOUNTER_IDS.slice(1) } }],
    ['down_the_river', { complete: true, result: 'victory', levels: [1, 2, 3, 4].map((l) => ({ level: l, index: l, cleared: true })), party: ['healer', 'tank', 'archer', 'swordsman'] }],
    ['run_to_ground', { deedRun: { objectives: ['bogus'] } }],
    ['ringwalker', { deedRun: { arenas: [21, 23, 25, 22] } }],
  ];
  for (const [deed, o] of near) check('deeds', `${deed} is not paid one short`, !paid(o).includes(deed));
  // A deed already done is never paid twice.
  const m = U.freshMeta();
  m.deeds.push('keyholder');
  check('deeds', 'a done deed is not paid again', !paid({ deedRun: { vaults: 1 } }, m).includes('keyholder'));
  // Kingslayer: every boss felled, across runs.
  const m2 = U.freshMeta();
  for (const b of U.BOSSES.slice(1)) m2.bosses[b.kind] = 1;
  check('deeds', 'kingslayer waits for the last boss', !paid({}, m2).includes('kingslayer') && U.DEEDS.kingslayer.goal(U.lifeAfter(m2, null)).join() === `${U.BOSSES.length - 1},${U.BOSSES.length}`);
  m2.bosses[U.BOSSES[0].kind] = 1;
  check('deeds', `kingslayer once all ${U.BOSSES.length} have fallen`, paid({}, m2).includes('kingslayer'));
}

// ------------------------------------------------------- marks and Daily --
{
  // Daily streaks, pure.
  let mk = U.freshMarks();
  const day = (k) => (mk = U.marksAfter(mk, { daily: k }));
  day('2026-10-01');
  day('2026-10-02');
  day('2026-10-02');
  check('daily', 'two days in a row (the same day twice counts once)', mk.daily.streak === 2 && mk.daily.best === 2, mk.daily);
  day('2026-10-04');
  check('daily', 'a missed day starts a new streak, the best stays', mk.daily.streak === 1 && mk.daily.best === 2, mk.daily);
  day('2026-10-03');
  check('daily', 'an older day changes nothing', mk.daily.streak === 1 && mk.daily.last === '2026-10-04', mk.daily);
  for (const d of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']) day(d);
  check('daily', 'seven days in a row', mk.daily.streak === 7 && mk.daily.best === 7, mk.daily);
  const s = U.saneMarks({ event: ['wishing_well', 'nope', 'wishing_well'], affix: 'x', arena: [21, 99], daily: { last: 'bad', streak: 9, best: 4 } });
  check('marks', 'damaged marks are cleaned', s.event.join() === 'wishing_well' && s.affix.length === 0 && s.arena.join() === '21' && s.daily.last === null && s.daily.streak === 0 && s.daily.best === 4, s);
  const old = U.saneMeta({ mv: 1, embers: 5, deeds: ['first_light'] });
  check('marks', 'a meta from before round two loads with empty marks', old.marks && old.marks.event.length === 0 && old.marks.daily.streak === 0);

  // On a real profile store: the counted deeds add up over runs.
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
  };
  let ms = Date.parse('2026-10-10T00:00:00Z');
  const now = () => new Date((ms += 1000)).toISOString();
  const storage = mem();
  let prof = createProfileStore({ store: createSaveStorage({ storage }), now });
  const half = Math.ceil(ENCOUNTER_IDS.length / 2);
  const a1 = prof.awardRun(summaryOf({ deedRun: { events: ENCOUNTER_IDS.slice(0, half), champions: CHAMPION_IDS.slice(0, 2), affixes: AFFIX_IDS.slice(0, 5) }, daily: '2026-10-08' }));
  check('profile', 'half the event rooms: Wayfarer not yet', !a1.deeds.includes('wayfarer') && a1.deeds.includes('crownbreaker'), a1.deeds);
  prof = createProfileStore({ store: createSaveStorage({ storage }), now }); // a reload
  const kept = prof.get().meta.marks;
  check('profile', 'the marks survive a reload', kept.event.length === half && kept.champion.length === 2 && kept.daily.last === '2026-10-08', kept);
  prof.awardRun(summaryOf({ daily: '2026-10-09' }));
  const a2 = prof.awardRun(summaryOf({ deedRun: { events: ENCOUNTER_IDS.slice(half), champions: CHAMPION_IDS.slice(2), affixes: AFFIX_IDS.slice(5) }, daily: '2026-10-10' }));
  check('profile', 'the rest across later runs: Wayfarer, Four Crowns, Signbreaker, Three Dawns', ['wayfarer', 'four_crowns', 'signbreaker', 'three_dawns'].every((d) => a2.deeds.includes(d)), a2.deeds);
  check('profile', 'Four Crowns frees the Crowned tint', a2.unlocked.includes('tint_crowned') && prof.get().meta.owned.tint_crowned === 0, a2.unlocked);
  const ctx = { meta: prof.get().meta, records: prof.get().records };
  check('reqs', 'the Short Fuse vow waits for Once Around', U.unlockState('vow_short_fuse', ctx) === 'locked' && U.reqText(U.UNLOCKS.vow_short_fuse.req) === 'Earn the deed Once Around');
  const m3 = U.saneMeta({ ...ctx.meta, deeds: [...ctx.meta.deeds, 'rush_lap'] });
  U.grantFree(m3, ctx.records);
  check('reqs', 'Once Around frees the Short Fuse vow', m3.owned.vow_short_fuse === 0);
  check('reqs', 'the new kits wait for Level III and IV', ['kit_dawnwatch', 'kit_earthwarden', 'kit_moonblade', 'kit_huntmaster', 'kit_stormwater'].every((id) => U.unlockState(id, ctx) === 'locked'));
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
  const tracker = createDeedRunTracker(bus);
  const run = world.runSystem();
  const step = (n = 1, ap = null) => {
    for (let i = 0; i < n; i++) clock.stepOnce((t) => world.step(t, ap ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  };
  return { world, run, step, log, clock, tracker };
}
const H = (log) => createHash('sha256').update(JSON.stringify(log)).digest('hex').slice(0, 16);

// Vows: the first room of Level I, with and without.
{
  const room1 = (boons) => {
    const g = build(7);
    g.run.startCampaign({ level: 1, ...(boons ? { boons } : {}) });
    g.run.autopilot.configure(true);
    for (let i = 0; i < 60 * 70 && !g.log.some((e) => e.type === 'room_cleared'); i++) g.step(1, g.run.autopilot);
    return g;
  };
  const plain = room1(null);
  const again = room1(null);
  check('vows', 'a run with no vows is the same run twice', H(plain.log) === H(again.log));
  const spans = (g) => g.log.filter((e) => e.type === 'telegraph_start' && Number.isFinite(e.resolveTick)).map((e) => e.resolveTick - e.tick);
  const fuse = room1({ vows: ['short_fuse'] });
  const a = spans(plain);
  const b = spans(fuse);
  const minA = Math.min(...a);
  const minB = Math.min(...b);
  check('vows', 'Short Fuse: enemy warnings run shorter (never under 0.6 s)', b.length > 0 && a.length > 0 && b[0] < a[0] && minB >= 36, { plainFirst: a[0], fuseFirst: b[0], minPlain: minA, minFuse: minB });
  const waves = (g) => g.log.filter((e) => e.type === 'wave_start').map((e) => e.tick);
  const rest = room1({ vows: ['restless'] });
  const wa = waves(plain);
  const wb = waves(rest);
  check('vows', 'Restless: the second wave comes sooner', wa.length > 1 && wb.length > 1 && wb[1] - wb[0] < wa[1] - wa[0], { plain: wa.slice(0, 3), restless: wb.slice(0, 3) });
}

// Live: whole autopilot campaigns with the tracker on the bus.
{
  const total = { events: 0, affixes: 0, objectives: 0, champions: 0, arenas: 0, vaults: 0 };
  let mismatch = [];
  let paidLive = [];
  for (const seed of SEEDS) {
    const g = build(seed);
    g.run.startCampaign({ level: 1, harness: true });
    g.run.autopilot.configure(true);
    let out = null;
    for (let i = 0; i < 2_500_000; i++) {
      g.step(1, g.run.autopilot);
      const v = g.run.view();
      if (v.phase === 'transit') g.run.campaignAdvance('probe');
      if (v.phase === 'victory' || v.phase === 'defeat') {
        out = v.phase;
        break;
      }
    }
    const f = g.tracker.facts();
    // The tracker against the raw event log.
    const ev = [...new Set(g.log.filter((e) => e.type === 'event_enter').map((e) => e.encounter))];
    const ch = [...new Set(g.log.filter((e) => e.type === 'champion_fall').map((e) => e.champion))];
    const ar = [...new Set(g.log.filter((e) => e.type === 'layout_enter' && U.ARENA_IDS.includes(e.layoutId)).map((e) => e.layoutId))];
    const ob = [...new Set(g.log.filter((e) => e.type === 'room_cleared' && e.objective && e.won && !e.softFailed).map((e) => e.objective))];
    const va = g.log.filter((e) => e.type === 'vault_open').length;
    const wore = new Map(g.log.filter((e) => e.type === 'elite_affixes').map((e) => [e.id, e.affixes]));
    const af = [...new Set(g.log.filter((e) => e.type === 'death' && wore.has(e.id)).flatMap((e) => wore.get(e.id)))];
    const same = (x, y) => [...x].sort().join() === [...y].sort().join();
    if (!(same(f.events, ev) && same(f.champions, ch) && same(f.arenas, ar) && same(f.objectives, ob) && f.vaults === va && same(f.affixes, af))) mismatch.push({ seed, f, ev, ch, ar, ob, va, af });
    for (const k of Object.keys(total)) total[k] += Array.isArray(f[k]) ? f[k].length : f[k];
    const s = g.run.view().summary;
    const a = U.awardFor(U.runFacts({ ...s, deedRun: f }), U.freshMeta());
    paidLive.push({ seed, out, levels: s && s.campaign ? s.campaign.levelsCleared : 0, deeds: a.deeds.filter((d) => NEW_DEEDS.includes(d)), facts: { events: f.events.length, affixes: f.affixes.length, objectives: f.objectives, champions: f.champions, arenas: f.arenas, vaults: f.vaults } });
  }
  console.log(JSON.stringify(paidLive));
  check('live', 'the tracker matches the run’s own events on every seed', mismatch.length === 0, mismatch.length ? mismatch.slice(0, 2) : null);
  check('live', 'it saw event rooms, affixes, objective rooms and arenas', total.events > 0 && total.affixes > 0 && total.objectives > 0 && total.arenas > 0, total);
  const expect = paidLive.every((r) => (r.facts.objectives.includes('hunt') === r.deeds.includes('run_to_ground')) && ((r.facts.champions.length > 0) === r.deeds.includes('crownbreaker')) && ((r.facts.vaults > 0) === r.deeds.includes('keyholder')));
  check('live', 'the award pays the deeds the campaign met', expect && paidLive.some((r) => r.deeds.length > 0), paidLive.map((r) => ({ seed: r.seed, deeds: r.deeds })));
}

const ok = failed === 0;
console.log(`\n${ok ? 'ALL PASS' : `${failed} FAILED`} (${results.length} checks)`);
mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ ok, failed, results }, null, 1));
process.exit(ok ? 0 : 1);
