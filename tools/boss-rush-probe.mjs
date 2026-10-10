#!/usr/bin/env node
// BOSS RUSH probe (docs/BOSS_RUSH.md), headless, no browser:
//   line     the seeded line: eight fights, one per land in order then a
//            second lap that meets each land's other boss; the same seed
//            gives the same line; locked third bosses never appear, an
//            unlocked one can, and the Vein Weaver only on the second lap
//   start    a rush opens in the boss room of Level I with the Level II kit
//            and the war chest, its boss the line's first; a plain campaign,
//            Endless and the Daily carry no rush
//   flow     a fight won pays its bounty, the war chest, the draft and (after
//            odd fights) a relic pick; then the card to the next fight, which
//            opens at the Peddler and walks into the boss room; the second
//            lap plays harder numbers; the last fight ends the run won
//   records  the profile keeps rushes, most felled and the best time, never a
//            level clear or a won game; the deeds and Embers of a rush
//   auto     the autopilot plays whole rushes (seeds 1-6) with no stuck room
//
//   node tools/boss-rush-probe.mjs [--out captures/boss-rush-probe.json]
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { RUSH_RULES, rushLine, rushDifficulty, rushAct } = await import(u('src/data/rush.js'));
const { LEVELS } = await import(u('src/data/levels.js'));
const { difficulty } = await import(u('src/data/difficulty.js'));
const { runFacts, awardFor, DEEDS } = await import(u('src/data/unlocks.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = opt('out', 'captures/boss-rush-probe.json');

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
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
  return { world, run, step, log, clock, registry };
}
const kindsOf = (line) => line.map((b) => b.kind);
const gated = (act) => (LEVELS[act].bosses || []).filter((b) => b.gated).map((b) => b.kind);

// ------------------------------------------------------------------ line --
{
  const a = rushLine(12345, []);
  check('line', 'eight fights', a.length === RUSH_RULES.fights && RUSH_RULES.fights === 8, { n: a.length });
  check('line', 'lands in order, twice', a.map((b) => b.act).join() === '1,2,3,4,1,2,3,4', a.map((b) => b.act));
  check('line', 'same seed, same line', kindsOf(rushLine(12345, [])).join() === kindsOf(a).join());
  let differ = 0;
  let lapOther = 0;
  let thirdLocked = 0;
  let weaverLap1 = 0;
  let weaverSeen = 0;
  let thirdOpenSeen = 0;
  for (let s = 1; s <= 200; s++) {
    const l = rushLine(s * 7919, []);
    if (kindsOf(l).join() !== kindsOf(a).join()) differ += 1;
    for (let i = 0; i < 4; i++) if (l[i].kind !== l[i + 4].kind) lapOther += 1;
    for (const b of l) if (gated(b.act).includes(b.kind)) thirdLocked += 1;
    const o = rushLine(s * 7919, [1, 2, 3, 4]);
    for (const b of o) if (gated(b.act).includes(b.kind)) thirdOpenSeen += 1;
    for (const b of o) if (b.kind === 'veinweaver') (b.lap === 1 ? (weaverLap1 += 1) : (weaverSeen += 1));
  }
  check('line', 'other seeds give other lines', differ > 100, { differ });
  check('line', 'the second lap meets each land\'s other boss', lapOther === 800, { lapOther });
  check('line', 'locked third bosses never appear', thirdLocked === 0, { thirdLocked });
  check('line', 'unlocked third bosses can appear', thirdOpenSeen > 0, { thirdOpenSeen });
  check('line', 'the Vein Weaver only on the second lap, once open', weaverLap1 === 0 && weaverSeen > 0, { weaverLap1, weaverSeen });
  const d1 = rushDifficulty(1);
  const d5 = rushDifficulty(5);
  const base = difficulty(1, 6);
  check('line', 'lap one plays the land\'s own boss room', d1.bossHp === base.bossHp && d1.bossDmgMul === base.bossDmgMul, { hp: d1.bossHp, want: base.bossHp });
  check('line', 'lap two is harder', d5.bossHp > base.bossHp && d5.bossDmgMul > base.bossDmgMul, { hp: d5.bossHp, dmg: d5.bossDmgMul });
}

// ----------------------------------------------------------------- start --
{
  const g = build(4242);
  g.run.startCampaign({ rush: true, harness: true });
  g.step(2);
  const v = g.run.view();
  const c = g.run.campaign();
  check('start', 'opens in the boss room of Level I', v.phase === 'combat' && v.room === 8 && v.act === 1 && v.mode === 'boss', { phase: v.phase, room: v.room, act: v.act, mode: v.mode });
  check('start', 'the view and campaign carry the rush', v.rush && v.rush.fight === 1 && c.rush && c.rush.line.length === 8, { rush: v.rush });
  check('start', 'the boss is the line\'s first', v.actBoss && c.rush && v.actBoss.kind === c.rush.line[0].kind, { boss: v.actBoss && v.actBoss.kind, line: c.rush && c.rush.line[0].kind });
  const grant = g.log.find((e) => e.type === 'starter_grant');
  const sup = g.log.find((e) => e.type === 'rush_supply');
  check('start', 'the Level II starter kit and the war chest', grant && grant.level === 2 && sup && sup.fight === 0, { grant: grant && grant.level, supply: sup && sup.fight });
  check('start', 'never endless', !v.endless && !c.endless);
  const p = build(4242);
  p.run.startCampaign({ level: 1, harness: true });
  p.step(2);
  const e = build(4242);
  e.run.startCampaign({ level: 1, harness: true, endless: true, rush: true });
  e.step(2);
  const d = build(4242);
  d.run.startCampaign({ daily: { key: '2026-10-10' }, rush: true });
  d.step(2);
  check('start', 'a plain campaign, Endless and the Daily carry no rush', !p.run.view().rush && !e.run.view().rush && !d.run.view().rush && p.run.view().room === 1, { plain: p.run.view().room });
}

// ------------------------------------------------------------------ flow --
{
  const g = build(777);
  g.run.startCampaign({ rush: true, harness: true });
  g.step(2);
  const ap = g.run.autopilot;
  ap.configure(true);
  // Fight 1: the autopilot plays until the draft opens.
  let guard = 0;
  while (g.run.view().phase === 'combat' && guard++ < 60 * 400) g.step(1, ap);
  const felled = g.log.find((e) => e.type === 'rush_felled');
  const bounty = g.log.find((e) => e.type === 'glint_gain' && e.reason === 'rush_bounty');
  const sup1 = g.log.find((e) => e.type === 'rush_supply' && e.fight === 1);
  check('flow', 'fight 1 won pays the bounty and the war chest', felled && felled.fight === 1 && bounty && bounty.amount === RUSH_RULES.bounty && !!sup1, { felled: felled && felled.fight, bounty: bounty && bounty.amount });
  const v1 = g.run.view();
  check('flow', 'then the fight\'s draft (a Skill)', v1.phase === 'reward' && g.log.some((e) => e.type === 'reward_offer' && e.room === 8 && e.promised === 'skill'), { phase: v1.phase });
  check('flow', 'no level clear before the draft', !g.log.some((e) => e.type === 'level_clear'));
  guard = 0;
  while (g.run.view().phase !== 'transit' && guard++ < 60 * 60) g.step(1, ap);
  check('flow', 'a relic pick after fight 1', g.log.some((e) => e.type === 'relic_offer' && e.room === 8 && e.source === 'free'), {});
  const lc = g.log.find((e) => e.type === 'level_clear');
  check('flow', 'the card to fight 2', g.run.view().phase === 'transit' && lc && lc.fight === 1 && g.run.campaign().card.fight === 2, { card: g.run.campaign().card && g.run.campaign().card.fight });
  guard = 0;
  while (g.run.view().phase === 'transit' && guard++ < 60 * 30) {
    g.run.campaignAdvance('probe');
    g.step(1);
  }
  guard = 0;
  while (g.run.view().phase === 'fade' && guard++ < 120) g.step(1);
  const v2 = g.run.view();
  check('flow', 'fight 2 opens at the Peddler in the Mill', v2.phase === 'shop' && v2.room === 7 && v2.act === 2 && v2.rush.fight === 2, { phase: v2.phase, room: v2.room, act: v2.act });
  g.run.advanceFromShop({ force: true });
  guard = 0;
  while (g.run.view().phase !== 'combat' && guard++ < 120) g.step(1);
  const v3 = g.run.view();
  check('flow', 'then the boss room, the line\'s second boss', v3.room === 8 && v3.mode === 'boss' && v3.actBoss.kind === g.run.campaign().rush.line[1].kind, { room: v3.room, boss: v3.actBoss && v3.actBoss.kind });
  // Jump to fight 5: harder numbers.
  g.world.cmd('rushJump', [5]);
  guard = 0;
  while (g.run.view().phase === 'transit' && guard++ < 60 * 30) {
    g.run.campaignAdvance('probe');
    g.step(1);
  }
  g.run.advanceFromShop({ force: true });
  guard = 0;
  while (g.run.view().phase !== 'combat' && guard++ < 120) g.step(1);
  const plan = g.world.cmd('roomPlan') ?? g.run.roomPlan?.() ?? null;
  const v5 = g.run.view();
  check('flow', 'fight 5 is the Wood\'s other boss', v5.act === 1 && v5.rush.fight === 5 && v5.actBoss.kind === g.run.campaign().rush.line[4].kind && v5.actBoss.kind !== g.run.campaign().rush.line[0].kind, { act: v5.act, boss: v5.actBoss && v5.actBoss.kind });
  const bossHp = (() => {
    const b = g.registry.all().find((e) => e.kind === 'boss' || e.boss);
    return b ? b.maxHp : null;
  })();
  check('flow', 'on lap-two numbers', bossHp === null || bossHp >= rushDifficulty(5).bossHp * 0.99, { bossHp, want: rushDifficulty(5).bossHp, plan: plan ? plan.bossHp ?? null : null });
  // Jump to the last fight and win it.
  g.world.cmd('rushJump', [8]);
  guard = 0;
  while (g.run.view().phase === 'transit' && guard++ < 60 * 30) {
    g.run.campaignAdvance('probe');
    g.step(1);
  }
  g.run.advanceFromShop({ force: true });
  guard = 0;
  while (g.run.view().phase !== 'combat' && guard++ < 120) g.step(1);
  check('flow', 'fight 8 is the Heart', g.run.view().act === 4 && g.run.view().rush.fight === 8, { act: g.run.view().act });
  guard = 0;
  while (g.run.view().phase === 'combat' && guard++ < 60 * 600) g.step(1, ap);
  const end = g.log.find((e) => e.type === 'run_end');
  if (end && end.result === 'victory') {
    const s = g.run.view().summary;
    check('flow', 'the last fight ends the run won, with no draft after it', !g.log.some((e) => e.type === 'reward_offer' && e.tick > (g.log.find((x) => x.type === 'rush_felled' && x.fight === 8) || { tick: 1e9 }).tick), {});
    check('flow', 'the summary carries the rush, never a complete campaign', s.campaign.rush && s.campaign.rush.won && !s.campaign.complete, { rush: s.campaign.rush && { felled: s.campaign.rush.felled, won: s.campaign.rush.won } });
  } else {
    // A fall at the Heart is a fair outcome; the summary still carries the rush.
    const s = g.run.view().summary;
    check('flow', 'the run ends with the rush in its summary', end && s && s.campaign.rush && !s.campaign.complete, { result: end && end.result });
  }
}

// --------------------------------------------------------------- records --
{
  const won = { result: 'victory', timeSec: 480, ticks: 480 * 60, seed: 1, challenge: 'standard', campaign: { mode: 'campaign', levels: rushLine(1, []).map((b) => ({ level: b.act, index: b.fight, cleared: true, boss: b.kind, rooms: 2 })), rush: { felled: 8, fights: 8, won: true, line: rushLine(1, []) }, complete: false } };
  const f = runFacts(won, { runs: 3 });
  check('records', 'a rush clears no level and wins no campaign', f.cleared.length === 0 && !f.complete && f.rooms === 0, { cleared: f.cleared, complete: f.complete });
  check('records', 'its bosses count as felled', f.bosses.length === 8, { bosses: f.bosses });
  const a = awardFor(f, { deeds: [] });
  check('records', 'the rush deeds and Embers', a.deeds.includes('rush_lap') && a.deeds.includes('rush_won') && a.deeds.includes('rush_swift') && a.lines.some((l) => l.label === 'Boss Rush won'), { deeds: a.deeds });
  const slow = awardFor(runFacts({ ...won, timeSec: 1200, ticks: 1200 * 60 }, { runs: 3 }), { deeds: [] });
  check('records', 'Against the Clock wants under ten minutes', !slow.deeds.includes('rush_swift') && slow.deeds.includes('rush_won'));
  const lost = { ...won, result: 'defeat', campaign: { ...won.campaign, levels: won.campaign.levels.slice(0, 3), rush: { felled: 3, fights: 8, won: false, line: rushLine(1, []) } } };
  const la = awardFor(runFacts(lost, {}), { deeds: [] });
  check('records', 'a short rush pays per boss and no rush deed', !la.deeds.some((d) => d.startsWith('rush_')) && la.lines.some((l) => /3 bosses felled in the rush/.test(l.label)), { deeds: la.deeds });
  check('records', 'three new deeds', ['rush_lap', 'rush_won', 'rush_swift'].every((d) => DEEDS[d]));
  // The profile store: a memory backend.
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
  try {
    const { createProfileStore } = await import(u('src/save/profile.js'));
    const { createSaveStorage } = await import(u('src/save/storage.js'));
    const store = createProfileStore({ store: createSaveStorage({ storage }) });
    const r1 = store.recordRun({ act: 4, victory: true, result: 'victory', timeSec: 500, seed: 1, campaign: { ...won.campaign } });
    const r2 = store.recordRun({ act: 2, victory: false, result: 'defeat', timeSec: 200, seed: 2, campaign: { ...lost.campaign } });
    const r3 = store.recordRun({ act: 4, victory: true, result: 'victory', timeSec: 450, seed: 3, campaign: { ...won.campaign } });
    const p = store.get();
    check('records', 'rushes, most felled, best time', p.records.rushRuns === 3 && p.records.rushMostFelled === 8 && p.records.rushBestSec === 450 && r3.rush.newBest && !r2.rush.newBest && r1.rush.newBest, { runs: p.records.rushRuns, most: p.records.rushMostFelled, best: p.records.rushBestSec });
    check('records', 'never a won game, a level clear or a score', !p.records.gameWon && !(p.records.levelClears[1] > 0) && p.highScores.length === 0 && (p.records.campaigns ?? 0) === 0, { gameWon: p.records.gameWon, scores: p.highScores.length });
  } catch (err) {
    check('records', 'profile store', false, { error: String(err && err.message) });
  }
}

// ------------------------------------------------------------------ auto --
{
  let stuck = 0;
  let felledTotal = 0;
  const rows = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = build(seed);
    g.run.startCampaign({ rush: true, harness: true });
    g.run.autopilot.configure(true);
    let room = null;
    let out = null;
    for (let i = 0; i < 3_000_000; i++) {
      g.step(1, g.run.autopilot);
      const v = g.run.view();
      if (v.phase === 'transit') g.run.campaignAdvance('probe');
      if (v.phase === 'victory' || v.phase === 'defeat') {
        out = v.phase;
        break;
      }
      if (v.phase === 'combat') {
        if (!room || room.key !== `${v.rush && v.rush.fight}:${v.room}`) room = { key: `${v.rush && v.rush.fight}:${v.room}`, at: g.clock.tick };
        else if (g.clock.tick - room.at > 10800) {
          out = 'stuck';
          stuck += 1;
          break;
        }
      }
    }
    const n = g.log.filter((e) => e.type === 'rush_felled').length;
    felledTotal += n;
    rows.push({ seed, out, felled: n });
  }
  check('auto', 'whole rushes end, none stuck', stuck === 0 && rows.every((r) => r.out === 'victory' || r.out === 'defeat'), rows);
  check('auto', 'the autopilot fells bosses', felledTotal >= 6, { felledTotal });
}

const ok = failed === 0;
console.log(`\n${ok ? 'ALL PASS' : `${failed} FAILED`} (${results.length} checks)`);
mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ ok, failed, results }, null, 1));
process.exit(ok ? 0 : 1);
