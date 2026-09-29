// gntfixM35 — debug: what pointermove events reach the run UI root on a harness mouse move (movementX/Y, target).
import { bootTap, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(2000);
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
await sleep(4000);
await page.evaluate(() => {
  window.__pm = [];
  const root = document.getElementById('run-screen');
  for (const t of ['pointermove', 'mousemove', 'pointerover']) root.addEventListener(t, (e) => window.__pm.push([t, e.movementX, e.movementY, e.pointerType, (e.target.className || '').toString().slice(0, 30)]), { passive: true, capture: true });
});
await page.mouse.move(685, 585);
await sleep(300);
await page.mouse.move(690, 590);
await sleep(300);
await page.mouse.move(900, 590, { steps: 4 });
await sleep(400);
const r = await page.evaluate(() => ({ pm: window.__pm.slice(0, 30), cues: window.__echoes.audio.cueLog(20).filter((c) => c.bus === 'ui').map((c) => c.cue + ':' + c.source), rootPE: getComputedStyle(document.getElementById('run-screen')).pointerEvents }));
console.log(JSON.stringify(r, null, 1), errors);
await browser.close();
