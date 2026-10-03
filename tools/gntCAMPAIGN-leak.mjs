#!/usr/bin/env node
// CAMPAIGN leak hunter (gate GC.6 diagnosis): N back-to-back campaigns
// (skipToRoom 8 + killBoss + killAllEnemies per level), a scene census in
// camp and at each level's first controllable frame; prints which top-level
// scene groups grew and the renderer's geometry / texture counts.
//   node tools/gntCAMPAIGN-leak.mjs [--n 3] [--url http://127.0.0.1:5199/] [--seed 7]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const N = Number(opt('n', '3'));
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SEED = Number(opt('seed', '7'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
const o = await openEchoes(browser, `${URL0}?seed=${SEED}&menu=0`);
const { page } = o;
const E = (fn, ...a) => page.evaluate(fn, ...a);
async function waitFor(fn, args = [], timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn, ...args)) return;
    await sleep(100);
  }
  throw new Error('timeout ' + fn.toString().slice(0, 100));
}
await waitFor(() => window.__echoes && __echoes.tick > 30 && __echoes.campaign && __echoes.campaign.ready(1).ready, [], 120000);
await sleep(1500);
const rows = [];
rows.push({ label: 'boot', ...(await E(() => __echoes.campaign.census())) });
for (let c = 1; c <= N; c++) {
  await E(() => __echoes.cmd('startCampaign', { level: 1 }));
  for (const lv of [1, 2, 3]) {
    await waitFor((l) => { const v = __echoes.state().run; return v.phase === 'combat' && v.act === l && v.room === 1 && __echoes.campaign.state().transitionState === 'none'; }, [lv]);
    await sleep(1000);
    rows.push({ label: `c${c}-L${lv}`, ...(await E(() => __echoes.campaign.census())) });
    await E(() => __echoes.cmd('skipToRoom', 8));
    await sleep(300);
    for (let i = 0; i < 100; i++) {
      const ph = await E(() => { const v = __echoes.state().run; if (v.phase === 'combat' && v.room === 8) { __echoes.cmd('killBoss'); __echoes.cmd('killAllEnemies'); } return v.phase; });
      if (ph === 'transit' || ph === 'victory') break;
      await sleep(100);
    }
  }
  await page.keyboard.press('Enter');
  await waitFor(() => __echoes.state().run.phase === 'idle' && __echoes.campaign.ready(1).ready, [], 90000);
  await sleep(1500);
  rows.push({ label: `c${c}-camp`, ...(await E(() => __echoes.campaign.census())), off: await E(() => __echoes.campaign.glOffScene()) });
  if (c === 1) console.log('armed', JSON.stringify(await E(() => __echoes.campaign.glTrack())));
}
for (const r of rows) if (r.off) console.log(r.label, 'offScene', JSON.stringify(r.off));
for (const r of rows) console.log(r.label, 'gl', JSON.stringify(r.gl), 'scene', r.sceneGeometries, r.sceneMaterials);
const diff = (a, b) => {
  const out = {};
  for (const k of new Set([...Object.keys(a.groups), ...Object.keys(b.groups)])) {
    const x = a.groups[k] ? a.groups[k].geometries : 0;
    const y = b.groups[k] ? b.groups[k].geometries : 0;
    if (x !== y) out[k] = [x, y];
  }
  return out;
};
const by = (l) => rows.find((r) => r.label === l);
for (let c = 2; c <= N; c++) {
  for (const k of ['L1', 'L2', 'L3', 'camp']) {
    const a = by(`c1-${k}`);
    const b = by(`c${c}-${k}`);
    if (a && b) console.log(`c1->c${c} ${k}: gl ${b.gl.geometries - a.gl.geometries}, scene ${b.sceneGeometries - a.sceneGeometries}`, JSON.stringify(diff(a, b)));
  }
}
console.log('errors', o.errors.slice(0, 5));
await browser.close();
