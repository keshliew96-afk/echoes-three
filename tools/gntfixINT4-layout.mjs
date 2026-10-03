#!/usr/bin/env node
// fix-INT-r4 J4-F1 helper: which dressings the arena has built / is building when the player reaches the portal,
// and whether Level 1 room 1's dressing is built synchronously at run start (syncBuilds).
//   node tools/gntfixINT4-layout.mjs [--url http://127.0.0.1:4310] [--seed 7] [--wait 3000]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const seed = Number(arg('seed', 7)); const wait = Number(arg('wait', 3000));
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(100); } return -1; }
const browser = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&seed=${seed}&menu=1`);
  await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, 20000);
  const atTitle = await page.evaluate(() => window.__arenaProbe && window.__arenaProbe.layoutState());
  await sleep(1500);
  await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
  await sleep(wait);
  const atCamp = await page.evaluate(() => { const A = window.__arenaProbe; const chain = []; for (let o = A.root; o; o = o.parent) chain.push(o.name || o.type); const groups = A.root.children.filter((c) => /^dressing-L/.test(c.name)).map((g) => ({ name: g.name, visible: g.visible, y: g.position.y, s: g.scale.x })); return { rootVisible: A.root.visible, ls: A.layoutState(), gl: window.__echoes.state().gl, rootChain: chain, rootInScene: chain[chain.length - 1] === 'Scene' || chain.includes('Scene'), stageScene: A.stage.scene.uuid, top: (() => { let o = A.root; while (o.parent) o = o.parent; return { uuid: o.uuid, isStage: o === A.stage.scene }; })(), groups }; });
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await sleep(1500);
  const atRun = await page.evaluate(() => ({ ls: window.__arenaProbe.layoutState(), gl: window.__echoes.state().gl, room: window.__echoes.state().run.room }));
  console.log(JSON.stringify({ atTitle, atCamp, atRun, errors }, null, 1));
} finally { await browser.close(); }
