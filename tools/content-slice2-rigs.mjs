#!/usr/bin/env node
// Content slice 2 rig + render probe (docs/CONTENT_PLAN.md §2.4 / §3), in the
// real game against the dev server (npm run dev, port 5199):
//   1. each new enemy rig spawned in a room of its act (two screenshots);
//   2. each new boss in room 8: its first telegraphs (lane / ring / cone and
//      the glob rings), with the boss layer's shape state;
//   3. an in-page save round trip mid-fight per act / boss (capture -> 600
//      ticks -> apply -> the same 600 ticks hash for hash);
//   and no page errors anywhere. Exit code 1 on any page error or divergence.
//
//   node tools/content-slice2-rigs.mjs [--url http://127.0.0.1:5199/]
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const URL0 = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'http://127.0.0.1:5199/';
const { launchEchoes, openEchoes } = await import('./gnt-arch-browser.mjs');
const browser = await launchEchoes({ gpu: false, width: 1280, height: 720, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
mkdirSync(join(here, 'captures'), { recursive: true });
const allErrors = [];
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function open() {
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=4`, { width: 1280, height: 720 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 180000 });
  return { page, errors };
}
async function shot(page, name) {
  await wait(2600); // SwiftShader renders ~1 fps: let a frame of the CURRENT tick land
  const f = join('captures', `content-slice2-rig-${name}.png`);
  await page.screenshot({ path: join(here, f) });
  console.log('  ' + f);
}

// --- 1. enemies --------------------------------------------------------------
for (const [act, kinds] of [
  [1, ['wasp', 'thornling']],
  [2, ['crab', 'lamprey']],
  [3, ['gravewisp', 'knight', 'mole']],
]) {
  const { page, errors } = await open();
  await page.evaluate((a) => {
    __echoes.sim.freeze();
    __echoes.cmd('skipToRoom', 3, { act: a });
    __echoes.sim.stepN(200, null);
    __echoes.cmd('killAllEnemies');
    __echoes.sim.stepN(5, null);
  }, act);
  const ids = await page.evaluate((ks) => {
    const p = __echoes.state().player || { x: 0, z: 0 };
    return ks.map((k, i) => __echoes.cmd('spawn', k, (p.x ?? 0) + (i - (ks.length - 1) / 2) * 1.8, (p.z ?? 0) - 2.4));
  }, kinds);
  await page.evaluate(() => __echoes.sim.stepN(20, null));
  await shot(page, `act${act}-enemies-${kinds.join('+')}`);
  await page.evaluate(() => __echoes.sim.stepN(150, null));
  await shot(page, `act${act}-enemies-${kinds.join('+')}-later`);
  const rt = await page.evaluate(() => {
    const r = __echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 });
    return { equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence, entities: r.entities };
  });
  console.log(`act ${act} enemies save round trip: ${JSON.stringify(rt)}`);
  if (!rt.equal || !rt.continuationEqual) allErrors.push(`act ${act} enemy-room save round trip diverged`);
  console.log(`act ${act} enemies spawned: ${JSON.stringify(ids)}  errors: ${errors.length}`);
  allErrors.push(...errors);
  await page.close();
}

// --- 2. bosses ---------------------------------------------------------------
for (const [act, kind] of [
  [1, 'thornmother'],
  [2, 'millwheel'],
  [3, 'lichram'],
]) {
  const { page, errors } = await open();
  await page.evaluate(
    (a, k) => {
      __echoes.sim.freeze();
      __echoes.cmd('startRun', { act: a, boss: k });
      __echoes.cmd('skipToRoom', 8);
      __echoes.sim.stepN(90, null);
    },
    act,
    kind
  );
  await shot(page, `${kind}-enter`);
  const shotsTaken = new Set();
  for (let i = 0; i < 120 && shotsTaken.size < 2; i++) {
    const t = await page.evaluate(() => {
      __echoes.sim.stepN(10, null);
      const b = __echoes.state().run.boss;
      if (b && b.telegraph) return b.telegraph.attack;
      return null; // glob volleys (seeds, graves) telegraph on the globs
    });
    if (t && !shotsTaken.has(t)) {
      shotsTaken.add(t);
      await page.evaluate(() => __echoes.sim.stepN(20, null));
      await wait(300);
      const fx = await page.evaluate(() => __echoes.state().bossfx);
      console.log(`${kind} telegraph ${t}: render ring=${fx.ring} shape=${fx.shape} at=${JSON.stringify(fx.shapeAt)}`);
      await shot(page, `${kind}-${t}`);
    }
  }
  const v = await page.evaluate(() => {
    __echoes.cmd('bossHp', 0.7);
    __echoes.sim.stepN(120, null);
    const b = __echoes.state().run.boss;
    return { name: b && b.name, kind: b && b.kind, mode: b && b.mode, bossfx: __echoes.state().bossfx };
  });
  await shot(page, `${kind}-adds`);
  const rt = await page.evaluate(() => {
    const r = __echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 });
    return { equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence, entities: r.entities };
  });
  console.log(`${kind} save round trip: ${JSON.stringify(rt)}`);
  if (!rt.equal || !rt.continuationEqual) allErrors.push(`${kind} save round trip diverged`);
  if (v.kind !== kind) allErrors.push(`${kind}: room 8 held ${v.kind}`);
  console.log(`${kind}: ${v.name} (${v.kind}) mode=${v.mode} rig=${v.bossfx && v.bossfx.boss}  errors: ${errors.length}`);
  allErrors.push(...errors);
  await page.close();
}
await browser.close();
for (const e of allErrors) console.log('PAGE ERROR ' + e);
process.exit(allErrors.length ? 1 : 0);
