#!/usr/bin/env node
// Slice-2 room layouts (docs/CONTENT_PLAN.md §4): one screenshot per new
// layout in a real campaign run, against `npm run dev`. Starts a campaign at
// the layout's level with the autopilot on, steps until a combat room rolls
// the layout, lets the fight open, and captures the frame.
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/slice2-layouts-shots.mjs [--url http://127.0.0.1:5199/] [--only 12] [--ids 21,22] [--out dir]
// Writes captures/slice2-layout-<id>.png; exit 1 on a page error or a layout
// that never rolled.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const URL0 = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'http://127.0.0.1:5199/';
const ONLY = argv.includes('--only') ? Number(argv[argv.indexOf('--only') + 1]) : null;
// --ids 21,22 shoots other layouts (plan 3 slice 8); --out dir writes there.
const IDS = argv.includes('--ids') ? argv[argv.indexOf('--ids') + 1].split(',').map(Number) : [10, 11, 12, 13, 14, 15];
const OUT = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : join(here, 'captures');
const PREFIX = argv.includes('--out') ? 'layout' : 'slice2-layout';
const { launchEchoes, openEchoes } = await import('./gnt-arch-browser.mjs');
const { LAYOUTS } = await import('../src/data/layouts.js');
const browser = await launchEchoes({ gpu: false, width: 1280, height: 720, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
let bad = 0;

for (const id of IDS) {
  if (ONLY && id !== ONLY) continue;
  const L = LAYOUTS[id];
  let found = null;
  for (let seed = 1; seed <= 8 && !found; seed++) {
    const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=${seed}`, { width: 1280, height: 720 });
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 180000 });
    await page.evaluate((lv) => {
      __echoes.sim.freeze();
      window.__rooms = [];
      __echoes.on('room_enter', (e) => window.__rooms.push({ index: e.index, layoutId: e.layoutId, mode: e.mode, act: e.act }));
      __echoes.cmd('startCampaign', { level: lv });
      __echoes.cmd('autopilot', true);
    }, L.act);
    for (let guard = 0; guard < 400; guard++) {
      const r = await page.evaluate((target, act) => {
        __echoes.sim.stepN(60, null);
        const hit = window.__rooms.find((x) => x.layoutId === target && x.act === act && (x.mode === 'kill_all' || x.mode === 'defend'));
        const ph = __echoes.state().run?.phase;
        const over = window.__rooms.some((x) => x.act !== act) || ph === 'victory' || ph === 'defeat';
        return { hit: hit ?? null, over };
      }, id, L.act);
      if (r.hit) {
        found = { seed, ...r.hit };
        break;
      }
      if (r.over) break;
    }
    if (found) {
      // Step into the first wave (spawn telegraphs up, party fanning out), then hold the frame.
      await page.evaluate(() => __echoes.sim.stepN(110, null));
      await wait(4000);
      const f = join(OUT, `${PREFIX}-${id}.png`);
      await page.screenshot({ path: f });
      console.log(`L${id} ${L.name}: seed ${seed} room ${found.index} ${found.mode} -> ${f}`);
    }
    if (errors.length) {
      bad += 1;
      console.log(`L${id} page errors:`, errors.slice(0, 5));
    }
    await page.close();
  }
  if (!found) {
    bad += 1;
    console.log(`L${id} ${L.name}: never rolled`);
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
