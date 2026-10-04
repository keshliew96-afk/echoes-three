#!/usr/bin/env node
// Content slice 1 probe (docs/CONTENT_PLAN.md §5): proves the new bosses and
// enemy types appear in REAL runs and use their kits.
//
// Runs each expedition start-to-end on the deterministic autopilot (the same
// sim the act runner drives) and tallies, per act and seed: the room-8 boss
// kind, every boss kit beat (spear / wingbeat / submerge / surface / breath /
// burrow / emerge / enrage), enemies spawned by type across the run, and the
// new archetype beats (rotcap bursts, snail mends, crow volleys, brood splits).
//
//   node tools/content-slice1.mjs [--seeds 1-3] [--acts 1,2,3]           (Node, headless, fast)
//   node tools/content-slice1.mjs --browser 1 [--url http://127.0.0.1:5199/] [--seeds 1]
//                                    (Puppeteer against `npm run dev`; also
//                                     screenshots each boss at its first beat)
//
// Exit code 1 when any check fails.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const range = (s) => {
  if (s.includes('-')) {
    const [a, b] = s.split('-').map(Number);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  return s.split(',').map(Number);
};
const SEEDS = range(opt('seeds', '1-3'));
const ACTS = range(opt('acts', '1,2,3'));
const BROWSER = opt('browser', '0') === '1';
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const MAX_TICKS = 70000;

const EXPECT_BOSS = { 1: 'stag', 2: 'heron', 3: 'wyrm' };
// Act I is unchanged in slice 1 (docs/CONTENT_PLAN.md §3).
const NEW_ENEMIES = { 1: [], 2: ['rotcap', 'snail'], 3: ['crow', 'brood', 'broodling'] };
const KIT_BEATS = {
  heron: ['boss_spear', 'boss_wingbeat', 'boss_submerge', 'boss_surface'],
  wyrm: ['boss_breath', 'boss_burrow', 'boss_emerge', 'boss_enrage'],
  stag: ['boss_quake_resolve', 'boss_trample'],
};
const TRACKED = [
  'boss_spawn', 'boss_spear', 'boss_spear_hit', 'boss_wingbeat', 'boss_submerge', 'boss_surface',
  'boss_breath', 'boss_burrow', 'boss_emerge', 'boss_enrage', 'boss_quake_resolve', 'boss_trample',
  'rotcap_burst', 'snail_mend', 'crow_volley', 'brood_split', 'enemy_spawn', 'room_enter',
];

// Runs in Node and (serialised) in the page.
function installCollector(on) {
  const out = { bossKind: null, beats: {}, spawns: {}, rooms: 0 };
  const tracked = [
    'boss_spawn', 'boss_spear', 'boss_spear_hit', 'boss_wingbeat', 'boss_submerge', 'boss_surface',
    'boss_breath', 'boss_burrow', 'boss_emerge', 'boss_enrage', 'boss_quake_resolve', 'boss_trample',
    'rotcap_burst', 'snail_mend', 'crow_volley', 'brood_split',
  ];
  for (const t of tracked) {
    on(t, (e) => {
      out.beats[t] = (out.beats[t] ?? 0) + 1;
      if (t === 'boss_spawn') out.bossKind = e.kind ?? 'stag';
      if (!out.firstBeat && t !== 'boss_spawn' && t.startsWith('boss_')) out.firstBeat = t;
    });
  }
  on('enemy_spawn', (e) => {
    out.spawns[e.etype] = (out.spawns[e.etype] ?? 0) + 1;
  });
  on('room_enter', () => {
    out.rooms += 1;
  });
  return () => JSON.parse(JSON.stringify(out));
}

async function runNode(act, seed) {
  const u = (p) => pathToFileURL(join(here, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng: createGameplayRng(seed >>> 0), registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const read = installCollector((t, f) => bus.on(t, f));
  world.runSystem().startRun({ act, challenge: 'standard' });
  ap.configure(true);
  let outcome = 'timeout';
  for (let i = 0; i < MAX_TICKS; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = world.runSystem().view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      break;
    }
  }
  return { act, seed, outcome, ticks: clock.tick, ...read(), pageErrors: [] };
}

async function runPage(browser, act, seed) {
  const { openEchoes } = await import('./gnt-arch-browser.mjs');
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=${seed}`, { width: 1280, height: 720 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 180000 });
  await page.evaluate(
    (src, a) => {
      __echoes.sim.freeze();
      const install = new Function(`return (${src})`)();
      window.__c1Read = install((t, f) => __echoes.on(t, f));
      __echoes.cmd('startRun', { act: a, challenge: 'standard' });
      __echoes.cmd('autopilot', true);
    },
    installCollector.toString(),
    act
  );
  mkdirSync(join(here, 'captures'), { recursive: true });
  const shots = [];
  const snap = async (tag) => {
    // The sim is frozen; the render loop keeps drawing the frozen frame.
    await new Promise((ok) => setTimeout(ok, 700));
    const f = join('captures', `content-slice1-act${act}-s${seed}-${tag}.png`);
    await page.screenshot({ path: join(here, f) });
    shots.push(f);
  };
  const NEW = NEW_ENEMIES[act];
  let outcome = 'timeout';
  let enemyShot = false;
  let bossShot = false;
  for (let guard = 0; guard < 2000; guard++) {
    const r = await page.evaluate((newKinds) => {
      __echoes.sim.stepN(120, null);
      const st = __echoes.state();
      const run = st.run;
      const ents = st.enemies || [];
      const live = (k) => ents.some((e) => e.kind === k);
      const boss = run && run.boss;
      return {
        phase: run.phase,
        tick: __echoes.tick,
        newLive: newKinds.filter(live),
        bossTele: !!(boss && boss.active && (boss.telegraph || boss.quake)),
        bossfx: st.bossfx ? { boss: st.bossfx.boss, ring: st.bossfx.ring } : null,
      };
    }, NEW);
    if (!enemyShot && r.newLive.length) {
      enemyShot = true;
      await snap(`enemies-${r.newLive.join('+')}`);
    }
    if (!bossShot && r.bossTele) {
      bossShot = true;
      await snap('boss');
    }
    if (r.phase === 'victory' || r.phase === 'defeat') {
      outcome = r.phase;
      break;
    }
    if (r.tick > MAX_TICKS) break;
  }
  const read = await page.evaluate(() => window.__c1Read());
  await page.close();
  return { act, seed, outcome, shots, ...read, pageErrors: errors.slice(0, 5) };
}

function check(r) {
  const fails = [];
  if (r.pageErrors.length) fails.push(`page errors: ${r.pageErrors.join(' | ')}`);
  if (r.outcome !== 'victory' && r.outcome !== 'defeat') fails.push(`run did not finish (${r.outcome})`);
  // A party wiped before room 8 never meets the boss; that is balance, not a content failure.
  if (r.bossKind === null && r.outcome === 'defeat') return fails;
  if (r.bossKind !== EXPECT_BOSS[r.act]) fails.push(`boss ${r.bossKind} != ${EXPECT_BOSS[r.act]}`);
  else if (r.outcome === 'victory') {
    const used = KIT_BEATS[r.bossKind].filter((b) => (r.beats[b] ?? 0) > 0);
    if (used.length < 2) fails.push(`boss kit barely used: ${used.join(',') || 'none'}`);
  }
  return fails;
}

const results = [];
let browser = null;
if (BROWSER) {
  // GPU-less containers: point PUPPETEER_EXECUTABLE_PATH at a local Chromium;
  // WebGL then runs on SwiftShader.
  const { launchEchoes } = await import('./gnt-arch-browser.mjs');
  browser = await launchEchoes({ gpu: false, width: 1280, height: 720, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
}
for (const act of ACTS) {
  for (const seed of SEEDS) {
    const t0 = Date.now();
    const r = BROWSER ? await runPage(browser, act, seed) : await runNode(act, seed);
    r.fails = check(r);
    results.push(r);
    const kit = KIT_BEATS[r.bossKind] ?? [];
    console.log(
      `act ${act} seed ${seed}: ${r.outcome} boss=${r.bossKind} kit[${kit.map((b) => `${b.replace('boss_', '')}:${r.beats[b] ?? 0}`).join(' ')}]` +
        ` new[${NEW_ENEMIES[act].map((k) => `${k}:${r.spawns[k] ?? 0}`).join(' ')}]` +
        ` beats[rotcap_burst:${r.beats.rotcap_burst ?? 0} snail_mend:${r.beats.snail_mend ?? 0} crow_volley:${r.beats.crow_volley ?? 0} brood_split:${r.beats.brood_split ?? 0}]` +
        `${r.fails.length ? '  FAIL ' + r.fails.join('; ') : '  ok'}  ${Date.now() - t0} ms`
    );
  }
}
if (browser) await browser.close();

// Across seeds, every new enemy of an act must have spawned at least once.
const agg = [];
for (const act of ACTS) {
  for (const k of NEW_ENEMIES[act]) {
    const n = results.filter((r) => r.act === act).reduce((s, r) => s + (r.spawns[k] ?? 0), 0);
    if (n === 0) agg.push(`act ${act}: no ${k} spawned in any seed`);
  }
}
for (const a of agg) console.log('FAIL ' + a);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures', `content-slice1${BROWSER ? '-browser' : ''}.json`), JSON.stringify({ results, agg, tracked: TRACKED }, null, 1));
const failed = results.some((r) => r.fails.length) || agg.length > 0;
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
