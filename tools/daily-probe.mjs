#!/usr/bin/env node
// DAILY DESCENT probe (docs/DAILY.md), headless, no browser:
//   seed     the same day gives the same run whatever the session's stream:
//            seed, room modes, the day's relic and major curse held from the
//            start; another day gives another run
//   levels   Level II of the day rolls from the day too: two sessions that
//            drew differently in Level I meet the same Level II frame
//   rules    Standard challenge and no boons whatever is asked; the summary
//            carries the day and the depth reached; a plain campaign carries
//            no daily key
//   board    the server store: best run per player, deeper then faster,
//            today and yesterday only, bad input refused, Upstash commands
//   http     the session server's /daily/ routes end to end
//
//   node tools/daily-probe.mjs [--out captures/daily-probe.json]
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
const { dailySeed, dailyLevelSeed, dailyDepth, depthPlace } = await import(u('src/data/daily.js'));
const { dailyOmen, RELICS, CURSES } = await import(u('src/sim/relics.js'));
const { createDailyStore } = await import(u('server/daily.mjs'));
const { createEchoesServer } = await import(u('server/server.mjs'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = opt('out', 'captures/daily-probe.json');
const DAY = '2026-10-08';

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
  const rng = createGameplayRng(seed >>> 0);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const log = [];
  bus.on('*', (e) => {
    if (['run_start', 'level_start', 'relic_gain', 'curse_taken', 'run_end'].includes(e.type)) log.push(e);
  });
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) clock.stepOnce((t) => world.step(t, emptySnapshot()));
  };
  return { rng, world, step, log, run: () => world.runSystem() };
}

// ------------------------------------------------------------------ seed --
{
  const a = build(1);
  const b = build(987654);
  a.world.cmd('startCampaign', { daily: { key: DAY } });
  b.world.cmd('startCampaign', { daily: { key: DAY } });
  a.step(3);
  b.step(3);
  const sa = a.log.find((e) => e.type === 'run_start');
  const sb = b.log.find((e) => e.type === 'run_start');
  check('seed', 'run seed is the day seed', sa && sa.seed === dailySeed(DAY), { seed: sa && sa.seed, want: dailySeed(DAY) });
  check('seed', 'two sessions, same frame', sa && sb && sa.seed === sb.seed && JSON.stringify(sa.modes) === JSON.stringify(sb.modes) && JSON.stringify(sa.sides) === JSON.stringify(sb.sides), { a: sa && sa.modes, b: sb && sb.modes });
  const omen = dailyOmen(dailySeed(DAY));
  const rv = a.world.cmd('relics') ?? null;
  const gainA = a.log.find((e) => e.type === 'relic_gain');
  const curseA = a.log.find((e) => e.type === 'curse_taken');
  check('seed', "the day's relic is held from the start", gainA && gainA.relic === omen.relic && gainA.source === 'daily' && RELICS[omen.relic] && !RELICS[omen.relic].cls, { relic: omen.relic });
  check('seed', "the day's major curse binds from the start", curseA && curseA.curse === omen.curse && curseA.major === true && CURSES[omen.curse].major, { curse: omen.curse, rv: rv ? 'ok' : null });
  const c = build(1);
  c.world.cmd('startCampaign', { daily: { key: '2026-10-09' } });
  c.step(3);
  const sc = c.log.find((e) => e.type === 'run_start');
  check('seed', 'another day, another run', sc && sc.seed !== sa.seed && sc.seed === dailySeed('2026-10-09'));
  // Over a month the omens vary.
  const relics = new Set();
  const curses = new Set();
  for (let d = 1; d <= 30; d++) {
    const o = dailyOmen(dailySeed(`2026-11-${String(d).padStart(2, '0')}`));
    relics.add(o.relic);
    curses.add(o.curse);
  }
  check('seed', 'a month of days varies the relic and the curse', relics.size >= 8 && curses.size >= 3, { relics: relics.size, curses: curses.size });
}

// ---------------------------------------------------------------- levels --
async function clearLevelOne(w, extraDraws) {
  w.world.cmd('startCampaign', { daily: { key: DAY } });
  w.step(2);
  for (let i = 0; i < extraDraws; i++) w.rng.float(); // a different Level I
  w.world.cmd('skipToRoom', 8);
  w.step(30);
  w.world.cmd('killBoss');
  for (let i = 0; i < 4000 && !w.log.some((e) => e.type === 'level_start'); i++) {
    w.step(1);
    const cv = w.world.cmd('campaignState');
    if (cv && cv.phase === 'transit') w.world.cmd('campaignAdvance', 'probe');
    const v = w.run().view();
    if (v.phase === 'reward' || v.phase === 'relic' || v.phase === 'socket') w.world.cmd('campaignAdvance', 'probe');
  }
  return w.log.find((e) => e.type === 'level_start');
}
{
  const a = build(5);
  const b = build(77);
  const la = await clearLevelOne(a, 0);
  const lb = await clearLevelOne(b, 13);
  const want = dailyLevelSeed(dailySeed(DAY), 2);
  check('levels', 'Level II starts after the boss falls', !!la && !!lb && la.level === 2 && lb.level === 2, { a: la && la.level, b: lb && lb.level });
  check('levels', 'Level II rolls from the day, not from play', la && lb && la.seed === want && lb.seed === want && JSON.stringify(la.modes) === JSON.stringify(lb.modes), { a: la && la.seed, b: lb && lb.seed, want });
  // The run ends where it stands: Level II, room 3 entered (2 cleared).
  a.world.cmd('skipToRoom', 3);
  a.step(5);
  a.world.cmd('abandonRun', 'probe');
  a.step(2);
  const s = a.run().view().summary;
  const d = s && s.campaign && s.campaign.daily;
  check('rules', 'the summary carries the day and its depth', d && d.key === DAY && d.depth === 10 && d.won === false && depthPlace(d.depth).level === 2 && depthPlace(d.depth).room === 2, d);
}

// ----------------------------------------------------------------- rules --
{
  const a = build(3);
  a.world.cmd('startCampaign', { daily: { key: DAY }, challenge: 'hard', boons: { kits: { healer: ['radiant_burst'] } }, level: 3, endless: true, tutorial: true });
  a.step(2);
  const cv = a.world.cmd('campaignState');
  const v = a.run().view();
  check('rules', 'Standard, Level I, no Endless, no tutorial, no boons', v.challenge === 'standard' && v.act === 1 && !v.endless && !v.tutorial && v.daily && v.daily.key === DAY && cv && !cv.boons, { challenge: v.challenge, act: v.act, daily: v.daily });
  const p = build(3);
  p.world.cmd('startCampaign', { level: 1 });
  p.step(2);
  const pv = p.run().view();
  check('rules', 'a plain campaign has no daily key', !('daily' in pv) && !p.log.some((e) => e.type === 'relic_gain'));
  check('rules', 'a bad day key is a plain campaign', (() => {
    const q = build(3);
    q.world.cmd('startCampaign', { daily: { key: '2026-02-30' } });
    q.step(2);
    return !('daily' in q.run().view());
  })());
  check('rules', 'depth: a cleared run counts every room', dailyDepth({ index: 4, rooms: 8, won: true, levels: 4 }) === 32 && dailyDepth({ index: 1, rooms: 0 }) === 0 && dailyDepth({ index: 3, rooms: 5 }) === 21);
}

// ----------------------------------------------------------------- board --
{
  let now = Date.parse(`${DAY}T10:00:00Z`);
  const s = createDailyStore({ env: {}, now: () => now });
  const id = (n) => `player-${String(n).padStart(12, '0')}`;
  const post = (n, depth, ticks, extra = {}) => s.score({ key: DAY, id: id(n), name: `P${n}`, cls: 'archer', depth, ticks, won: false, ...extra }, `10.0.0.${n}`);
  await post(1, 10, 9000);
  await post(2, 12, 20000);
  await post(3, 10, 7000);
  const r1 = await post(1, 8, 5000); // shallower: not kept
  check('board', 'a worse run keeps the best', r1.status === 200 && r1.body.best === false && r1.body.entry.depth === 10, r1.body);
  const r2 = await post(1, 10, 6000); // same depth, faster: kept
  check('board', 'the same depth, faster, replaces it', r2.body.best === true && r2.body.rank === 2, { rank: r2.body.rank });
  const b = await s.board(DAY, id(3), '10.0.0.9');
  check('board', 'deeper first, then faster', b.body.entries.map((e) => e.name).join(',') === 'P2,P1,P3' && b.body.total === 3 && b.body.me && b.body.me.rank === 3, b.body.entries.map((e) => `${e.name}:${e.depth}:${e.ticks}`));
  check('board', 'the board never shows ids', !JSON.stringify(b.body).includes('player-'));
  const old = await s.score({ key: '2026-10-06', id: id(4), name: 'X', depth: 3, ticks: 100 }, '10.0.0.4');
  check('board', 'an old day is closed', old.status === 400 && old.body.error === 'closed_day');
  const fut = await s.score({ key: '2026-10-09', id: id(4), name: 'X', depth: 3, ticks: 100 }, '10.0.0.4');
  check('board', 'a future day is closed', fut.status === 400 && fut.body.error === 'closed_day');
  now = Date.parse('2026-10-09T00:20:00Z');
  const late = await s.score({ key: DAY, id: id(5), name: '<b>Late</b>  Owl', depth: 4, ticks: 100 }, '10.0.0.5');
  check('board', 'yesterday still takes a run past midnight; names cleaned', late.status === 200 && late.body.entry.name === 'bLate/b Owl', late.body.entry);
  const bad = await Promise.all([
    s.score({ key: DAY, id: 'short', depth: 3, ticks: 100 }, 'x'),
    s.score({ key: DAY, id: id(6), depth: 999, ticks: 100 }, 'x'),
    s.score({ key: DAY, id: id(6), depth: 3, ticks: 0 }, 'x'),
    s.score({ key: 'yesterday', id: id(6), depth: 3, ticks: 10 }, 'x'),
  ]);
  check('board', 'bad id, depth, time and day are refused', bad.every((r) => r.status === 400), bad.map((r) => r.body.error));
  // Upstash: the same store over the REST command API (a fake Redis).
  const hashes = new Map();
  const cmds = [];
  const fakeFetch = async (url, init) => {
    const args = JSON.parse(init.body);
    cmds.push(args[0]);
    const h = hashes.get(args[1]) || new Map();
    hashes.set(args[1], h);
    let result = null;
    if (args[0] === 'HSET') h.set(args[2], args[3]), (result = 1);
    else if (args[0] === 'HGET') result = h.get(args[2]) ?? null;
    else if (args[0] === 'HGETALL') result = [...h.entries()].flat();
    else if (args[0] === 'EXPIRE') result = 1;
    return { ok: true, json: async () => ({ result }) };
  };
  const rs = createDailyStore({ env: { ECHOES_CLOUD_REDIS_URL: 'https://fake.upstash.io/', ECHOES_CLOUD_REDIS_TOKEN: 't' }, fetchImpl: fakeFetch, now: () => Date.parse(`${DAY}T10:00:00Z`) });
  await rs.score({ key: DAY, id: id(1), name: 'A', depth: 5, ticks: 500 }, 'r');
  await rs.score({ key: DAY, id: id(2), name: 'B', depth: 7, ticks: 900 }, 'r');
  const rb = await rs.board(DAY, null, 'r');
  check('board', 'Upstash: kept under echoes:daily:<day>, durable, ranked', rs.durable && rs.kind === 'redis' && hashes.has(`echoes:daily:${DAY}`) && rb.body.entries.map((e) => e.name).join(',') === 'B,A' && cmds.includes('EXPIRE'), { cmds: [...new Set(cmds)] });
}

// ------------------------------------------------------------------ http --
{
  const srv = createEchoesServer({ port: 0, host: '127.0.0.1' });
  const info = await srv.listen();
  const base = `http://127.0.0.1:${info.port}`;
  const today = new Date().toISOString().slice(0, 10);
  const id = 'http-probe-000000000001';
  const p = await fetch(`${base}/daily/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: today, id, name: 'Probe', cls: 'tank', depth: 9, ticks: 3600, won: false, version: 'probe' }) });
  const pj = await p.json();
  check('http', 'POST /daily/score', p.status === 200 && pj.ok && pj.rank === 1 && pj.store === 'memory' && pj.durable === false, pj);
  const g = await fetch(`${base}/daily/board/${today}?me=${id}`);
  const gj = await g.json();
  check('http', 'GET /daily/board/<day>', g.status === 200 && gj.ok && gj.total === 1 && gj.entries[0].name === 'Probe' && gj.entries[0].cls === 'tank' && gj.me && gj.me.rank === 1, gj);
  const n = await fetch(`${base}/daily/board/not-a-day`);
  check('http', 'a bad day is a 400', n.status === 400);
  await srv.close();
}

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ probe: 'daily', failed, passed: results.length - failed, results }, null, 1));
console.log(`daily probe: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
