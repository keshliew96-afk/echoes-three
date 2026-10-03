// gntfixM36 — debug: what the loading splash shows without the autoplay flag (stack, prompt class, audio state).
import { launchEchoes } from './gnt-arch-browser.mjs';
import { BASE, sleep } from './gntfixM36-lib.mjs';
const browser = await launchEchoes({ gpu: true, autoplay: false, width: 1600, height: 900 });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
for (let i = 0; i < 12; i++) {
  await sleep(1500);
  console.log(await page.evaluate(() => { const E = window.__echoes; const p = document.querySelector('.ap-press'); return JSON.stringify({ t: Math.round(performance.now()), has: !!E, app: E && E.app && E.app.state, stack: E && E.app && E.app.stack && E.app.stack().join('>'), press: p && p.className, audio: E && E.audio && E.audio.state }); }));
}
await browser.close();
