#!/usr/bin/env node
// SMALL FIXES 3 (content plan 4, item 12) — headless Node, the sim built like
// src/main.js. Legs:
//   weaver   the Vein Weaver joins campaign Level IV's roll once the save has
//            felled the Cantor and the Colossus (it was Endless-only); locked
//            seeds keep their old boss; Endless Depth 4 meets the campaign's
//            roll; Boss Rush lap one can meet it; the Journal line that said
//            "met only in the deep descent" is gone, the new one translated.
//   censer   a Heart Censer with no kin left stops fleeing and drifts in over
//            the nearest hero (with kin it still hangs behind them); a
//            Colossus room on autopilot, boss felled with its censer and
//            husks about, clears within 10 s on every seed (it used to take
//            up to 22 s, and two loose censers could kite the party for 2 min).
//   daily    the server's 4 s a room floor (MIN_ROOM_TICKS) checked against a
//            "god mode" Daily (every enemy killed the tick it spawns, the
//            party kept whole): the fastest a run can be. Each such run, and
//            every room count along it from Depth 20 on, posts as plausible;
//            a made-up Depth 40 in a minute does not.
// The dressing cap lives in src/scenes/arena.js (render side), so its check
// is a browser run of tools/memory-probe.mjs with --query dressings=5 (see
// docs/MEMORY.md), not this probe.
//   node tools/small-fixes-3-probe.mjs [--fast]   (--fast: one Daily, 8 seeds)
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
const { LEVELS, bossFor, bossPool } = await import(u('src/data/levels.js'));
const { endlessBossIndex } = await import(u('src/data/endless.js'));
const { rushLine } = await import(u('src/data/rush.js'));
const { dailyKey, dailySeed } = await import(u('src/data/daily.js'));
const { VERSION } = await import(u('src/version.js'));
const { checkScore, MIN_ROOM_TICKS } = await import(u('server/daily.mjs'));
const journal = readFileSync(join(here, 'src/data/journal.js'), 'utf8');

const FAST = process.argv.includes('--fast');

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
  const run = world.runSystem();
  return { world, registry, bus, clock, run, ap: run.autopilot };
}
const stepIdle = (W, n) => {
  for (let i = 0; i < n; i++) W.clock.stepOnce((t) => W.world.step(t, emptySnapshot()));
};
const stepAp = (W, n) => {
  for (let i = 0; i < n; i++) W.clock.stepOnce((t) => W.world.step(t, W.ap.intents(t, emptySnapshot())));
};

const fails = [];
let passes = 0;
const check = (leg, ok, what) => {
  if (ok) passes += 1;
  else fails.push(`[${leg}] ${what}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${leg}] ${what}`);
};

// ------------------------------------------------------------- weaver --
{
  const kinds = LEVELS[4].bosses.map((b) => b.kind);
  check('weaver', kinds.join() === 'cantor,colossus,veinweaver' && LEVELS[4].bosses[2].gated === true && !LEVELS[4].bosses.some((b) => b.endlessOnly), `Level IV lists ${kinds.join(', ')}; the Weaver gated, no row Endless-only`);
  const before = ['cantor', 'colossus'];
  let same = 0;
  for (let s = 1; s <= 200; s++) if (before.includes(bossFor(4, s).kind) && bossPool(LEVELS[4], 4).length === 2) same += 1;
  check('weaver', same === 200, `locked, seeds 1-200 on Level IV meet the Cantor or the Colossus (${same}/200)`);
  const n = {};
  for (let s = 1; s <= 300; s++) {
    const k = bossFor(4, s, null, [4]).kind;
    n[k] = (n[k] ?? 0) + 1;
  }
  check('weaver', n.veinweaver >= 70 && n.cantor > 0 && n.colossus > 0, `unlocked, seeds 1-300 on Level IV: ${Object.entries(n).map(([k, v]) => `${k} ${v}`).join(', ')} (about a third each)`);
  let d4 = 0;
  for (let s = 1; s <= 60; s++) if (LEVELS[4].bosses[endlessBossIndex(4, s, [4])].kind === bossFor(4, s, null, [4]).kind) d4 += 1;
  check('weaver', d4 === 60, `unlocked, Endless Depth 4 meets the campaign's roll (${d4}/60)`);
  let rush = 0;
  for (let s = 1; s <= 40; s++) if (rushLine(s, [4]).slice(0, 5).some((r) => (r.kind ?? r.boss ?? r) === 'veinweaver')) rush += 1;
  check('weaver', rush > 0, `unlocked, Boss Rush lap one meets the Weaver on ${rush} of 40 seeds`);
  // A campaign run started with the Heart open reaches the Weaver's room.
  let s = 1;
  while (bossFor(4, s, null, [4]).kind !== 'veinweaver') s += 1;
  const W = makeWorld(s);
  W.run.startCampaign({ level: 4, harness: true, thirdBosses: [4] });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepIdle(W, 1);
  const fs = W.run.view().frame?.seed ?? s;
  const want = bossFor(4, fs, null, [4]).kind;
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) stepIdle(W, 1);
  const b = W.registry.all().find((e) => e.boss === true);
  check('weaver', b && b.kind === want && W.run.view().layout?.layoutId === (want === 'veinweaver' ? 27 : W.run.view().layout?.layoutId), `an open campaign's Level IV boss room holds its roll (${b?.kind}, layout ${W.run.view().layout?.layoutId})`);
  check('weaver', !/met only in the deep descent/.test(journal) && /woken once the Cantor and the Colossus have fallen/.test(journal), 'the Journal says when it wakes, not "only in the deep descent"');
  const line = "The Heart's own spider, woken once the Cantor and the Colossus have fallen, spinning violet veins through the dark.";
  const langs = ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant'];
  const missing = langs.filter((l) => {
    const t = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    return !t[line] || Object.keys(t).some((k) => /met only in the deep descent/.test(k));
  });
  check('weaver', missing.length === 0, `the new Journal line in all ten languages${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
}

// ------------------------------------------------------------- censer --
{
  const room = (seed) => {
    const W = makeWorld(seed);
    W.run.startCampaign({ level: 4, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepIdle(W, 1);
    stepIdle(W, 30);
    W.world.cmd('killAllEnemies');
    return W;
  };
  const hero = (W) => W.registry.all().find((e) => e.partyIndex === 0);
  const gap = (W, c) => Math.min(...W.registry.all().filter((e) => e.faction === 'party' && e.partyIndex !== undefined && e.hp > 0).map((p) => Math.hypot(c.x - p.x, c.z - p.z)));
  // Steps with the room's later waves cleared out as they arrive, so only
  // the censer (and `keep`) are about.
  const stepAlone = (W, n, keep = []) => {
    for (let i = 0; i < n; i++) {
      for (const e of W.registry.all()) if (e.faction === 'hostile' && e.kind !== 'censer' && !keep.includes(e.id) && e.hp > 0 && e.boss !== true) W.registry.despawn(e.id);
      stepIdle(W, 1);
    }
  };
  // Alone it comes in; with kin it keeps off the player (the seats parked
  // across the room). Twenty ticks (300 for the drift) from a set place, tough enough not to fall and its knockback cleared each tick,
  // so the seats' shots do not muddy the direction it walks.
  const walk = (seed, at, kin, ticks = 20) => {
    const W = room(seed);
    W.world.cmd('teleport', 0, 0);
    for (const a of W.registry.all().filter((e) => e.kind === 'ally')) W.world.cmd('placeAlly', a.partyIndex, -9, -6 + a.partyIndex * 0.8);
    const keep = kin ? [W.world.cmd('spawn', 'husk', 0, 4, { hpMul: 50 })] : [];
    const c = W.registry.byId(W.world.cmd('spawn', 'censer', at, 0, { hpMul: 50 }));
    const d0 = Math.hypot(c.x, c.z);
    for (let i = 0; i < ticks; i++) {
      c.kbTicks = 0;
      stepAlone(W, 1, keep);
    }
    return [d0, Math.hypot(c.x - hero(W).x, c.z - hero(W).z), gap(W, c)];
  };
  {
    const [a0, a1] = walk(3, 2.0, false);
    check('censer', a1 < a0, `alone, 2 u from the player, it no longer flees the player (${a0.toFixed(2)} -> ${a1.toFixed(2)} u)`);
    const [b0, , b1] = walk(3, 6.0, false, 300);
    check('censer', b1 < 2.0, `alone, 6 u off, it drifts in over the nearest hero (${b0.toFixed(2)} -> ${b1.toFixed(2)} u in 5 s; it used to hold at 4.5 u)`);
    const [c0, c1] = walk(3, 1.5, true);
    check('censer', c1 > c0 + 0.1, `with a husk alive, 1.5 u from the player, it still flees (${c0.toFixed(2)} -> ${c1.toFixed(2)} u)`);
  }
  // A Colossus room on autopilot: the boss falls with its adds about.
  const seeds = FAST ? 8 : 24;
  const out = [];
  for (let s = 1; s <= seeds; s++) {
    const W = makeWorld(s);
    W.run.startCampaign({ level: 4, harness: true, boss: 'colossus' });
    W.ap.configure(true);
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepAp(W, 1);
    W.world.cmd('skipToRoom', 8);
    for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) stepAp(W, 1);
    stepAp(W, 60);
    const B = W.registry.all().find((e) => e.boss === true);
    for (const f of [0.7, 0.45, 0.2]) {
      B.hp = B.maxHp * f;
      stepAp(W, 240);
    }
    const censers = W.registry.all().filter((e) => e.kind === 'censer' && e.hp > 0).length;
    W.run.cmd('killBoss');
    let t = 0;
    for (; t < 3600 && W.run.view().phase === 'combat'; t += 30) stepAp(W, 30);
    out.push({ s, t, censers });
  }
  const worst = out.reduce((a, b) => (b.t > a.t ? b : a));
  const withCenser = out.filter((r) => r.censers > 0).length;
  check('censer', withCenser > 0 && worst.t <= 600, `Colossus rooms on ${seeds} seeds (${withCenser} with a censer alive at the fall): the room clears within 10 s of the fall, worst ${(worst.t / 60).toFixed(1)} s (seed ${worst.s})`);
}

// -------------------------------------------------------------- daily --
{
  const days = FAST ? [5] : [5, 18, 2];
  const post = (key, depth, ticks, won) => checkScore({ key, id: 'probe-small-fixes-3', name: 'probe', cls: 'healer', depth, won, ticks, seed: dailySeed(key), version: VERSION }, key);
  check('daily', MIN_ROOM_TICKS === 240, `the floor stays 4 s a room (${MIN_ROOM_TICKS} ticks)`);
  for (const d of days) {
    const key = dailyKey(Date.UTC(2026, 9, d));
    const W = makeWorld(1);
    W.run.startCampaign({ daily: { key }, harness: true });
    W.ap.configure(true);
    const t0 = W.clock.tick;
    const enters = [];
    W.bus.on('room_enter', () => enters.push(W.clock.tick - t0));
    for (let i = 0; i < 400000; i++) {
      const v = W.run.view();
      if (v.phase === 'victory' || v.phase === 'defeat') break;
      if (v.phase === 'combat') {
        W.world.cmd('killAllEnemies');
        if (v.boss && v.boss.active) W.run.cmd('killBoss');
        for (const e of W.registry.all()) if (e.partyIndex != null && e.hp < e.maxHp) e.hp = e.maxHp;
      }
      W.clock.stepOnce((t) => W.world.step(t, W.ap.intents(t, emptySnapshot())));
    }
    const v = W.run.view();
    const sum = v.summary;
    const depth = sum?.campaign?.daily?.depth;
    check('daily', v.phase === 'victory' && depth === 40, `god-mode Daily ${key}: won at Depth ${depth} in ${sum?.ticks} ticks (${Math.round((sum?.ticks ?? 0) / 40)} a room)`);
    const r = post(key, 40, sum.ticks, true);
    check('daily', !!r.entry, `  its post is plausible (${r.error ?? 'accepted'})`);
    // Every count of rooms done from Depth 20 on, as a run that died there.
    let worst = Infinity;
    let at = 0;
    for (let k = 20; k < enters.length; k++) if (enters[k] / k < worst) [worst, at] = [enters[k] / k, k];
    const rr = post(key, at, Math.ceil(worst * at), false);
    check('daily', !!rr.entry, `  its fastest stretch, ${at} rooms at ${Math.round(worst)} ticks a room, posts as plausible (${rr.error ?? 'accepted'})`);
    const fake = post(key, 40, 3600, true);
    check('daily', fake.error === 'implausible', `  a made-up Depth 40 in one minute is refused (${fake.error ?? 'accepted'})`);
  }
}

console.log(`\n${passes} passed, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
