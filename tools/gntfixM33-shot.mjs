// fix-M3-r3: screenshots of the Audio tab after Up presses land on given controls
// (default: the SFX slider and the Master slider) — the channel name must be on screen.
//   node tools/gntfixM33-shot.mjs [W H] [id ...]   -> captures/gntfixM33/shot-<W>-<id>.png
import { launchEchoes } from './gnt-arch-browser.mjs';
import path from 'node:path';
const W = Number(process.argv[2] || 1024), H = Number(process.argv[3] || 576);
const ids = process.argv.slice(4).length ? process.argv.slice(4) : ['au-sfx-level', 'au-master-level'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchEchoes({ autoplay: true, width: W, height: H, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(process.env.GNT_URL || 'http://127.0.0.1:5199/?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.app && window.__echoes.app.state === 'title', { timeout: 180000 });
  await sleep(1200);
  const fid = () => page.evaluate(() => (window.__echoes.app.focus() || {}).id);
  for (let i = 0; i < 8 && !/settings/.test(await fid()); i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
  await page.keyboard.press('Enter'); await sleep(700);
  for (let i = 0; i < 5; i++) { if (await page.evaluate(() => { const e = document.getElementById('au-master-level'); return !!e && e.getClientRects().length > 0; })) break; await page.keyboard.press('e'); await sleep(450); }
  for (let i = 0; i < 20 && (await fid()) !== 'au-muteonblur'; i++) { await page.keyboard.press('ArrowDown'); await sleep(140); }
  for (const id of ids) {
    for (let i = 0; i < 20 && (await fid()) !== id; i++) { await page.keyboard.press('ArrowUp'); await sleep(180); }
    await sleep(250);
    const p = path.join(process.cwd(), 'captures', 'gntfixM33', `shot-${W}-${id}.png`);
    await page.screenshot({ path: p });
    console.log('SHOT', p, await fid());
  }
  console.log('pageErrors', errs.length);
} finally {
  await browser.close();
}
