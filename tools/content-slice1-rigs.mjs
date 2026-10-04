#!/usr/bin/env node
// Content slice 1 rig captures (docs/CONTENT_PLAN.md §5): a close look at every
// new rig in the real game renderer, against `npm run dev`.
//
//   1. enemies: in a live Act II / Act III room, the new archetypes are
//      spawned in a row in front of the Healer and captured (plus each one's
//      telegraph / mend beat after a short step).
//   2. bosses: skipToRoom 8 in Acts II and III, the boss is captured standing,
//      then on its first telegraph, then mid-burrow / submerged.
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/content-slice1-rigs.mjs [--url http://127.0.0.1:5199/]
// Also runs __echoes.save.roundTrip (capture -> 600 ticks -> apply -> replay)
// in an enemy room and mid boss fight.
// Writes captures/content-slice1-rig-*.png and prints page errors (exit 1 on any).
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
  const f = join('captures', `content-slice1-rig-${name}.png`);
  await page.screenshot({ path: join(here, f) });
  console.log('  ' + f);
}

// --- 1. enemies --------------------------------------------------------------
for (const [act, kinds] of [
  [2, ['rotcap', 'snail']],
  [3, ['crow', 'brood', 'broodling']],
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
    return ks.map((k, i) => __echoes.cmd('spawn', k, (p.x ?? 0) + (i - (ks.length - 1) / 2) * 1.6, (p.z ?? 0) - 2.2));
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
for (const act of [2, 3]) {
  const { page, errors } = await open();
  await page.evaluate((a) => {
    __echoes.sim.freeze();
    __echoes.cmd('skipToRoom', 8, { act: a });
    __echoes.sim.stepN(90, null);
  }, act);
  await shot(page, `act${act}-boss-enter`);
  // First telegraph.
  for (let i = 0; i < 60; i++) {
    const t = await page.evaluate(() => {
      __echoes.sim.stepN(10, null);
      const b = __echoes.state().run.boss;
      return b && b.telegraph ? b.telegraph.attack : null;
    });
    if (t) {
      await page.evaluate(() => __echoes.sim.stepN(20, null));
      await wait(300);
      const fx = await page.evaluate(() => __echoes.state().bossfx);
      console.log(`act ${act} boss telegraph ${t}: render ring=${fx.ring} shape=${fx.shape}`);
      await shot(page, `act${act}-boss-${t}`);
      if (t === 'wingbeat' || t === 'emerge' || t === 'surface') continue;
      break;
    }
  }
  // Add phase (submerge) / burrow.
  const deep = await page.evaluate(() => {
    __echoes.cmd('bossHp', 0.7);
    for (let i = 0; i < 40; i++) {
      __echoes.sim.stepN(10, null);
      const b = __echoes.state().run.boss;
      if (b && (b.submerged || b.burrowed)) return b.mode;
    }
    return null;
  });
  if (deep) await shot(page, `act${act}-boss-${deep}`);
  const v = await page.evaluate(() => {
    const b = __echoes.state().run.boss;
    return { name: b && b.name, kind: b && b.kind, bossfx: __echoes.state().bossfx };
  });
  // Save round trip mid-fight (boss underground, adds live): capture -> 600
  // ticks -> apply -> the same 600 ticks must match hash for hash.
  const rt = await page.evaluate(() => {
    const r = __echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 });
    return { equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence, entities: r.entities };
  });
  console.log(`act ${act} boss save round trip: ${JSON.stringify(rt)}`);
  if (!rt.equal || !rt.continuationEqual) allErrors.push(`act ${act} boss save round trip diverged`);
  console.log(`act ${act} boss: ${v.name} (${v.kind}) deep=${deep} rig=${v.bossfx && v.bossfx.boss}  errors: ${errors.length}`);
  allErrors.push(...errors);
  await page.close();
}
await browser.close();
for (const e of allErrors) console.log('PAGE ERROR ' + e);
process.exit(allErrors.length ? 1 : 0);
