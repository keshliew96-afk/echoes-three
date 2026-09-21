// gntM3: touch unlock timing detail (no autoplay flag, CDP reads without user activation).
import { launchEchoes } from './gnt-arch-browser.mjs';
import { sleep, out, BASE } from './gntM3-lib.mjs';
const how = process.argv[2] || 'touch';
const browser = await launchEchoes({ gpu: false, autoplay: false });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1, hasTouch: how === 'touch' });
const cdp = await page.createCDPSession();
const q = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: false })).result.value;
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 200; i++) {
  const st = await q(`(() => { const p = document.querySelector('.ap-press'); return !!(p && p.classList.contains('ap-on') && p.offsetParent); })()`);
  if (st) break;
  await sleep(200);
}
await sleep(1500);
if (how === 'touch') await page.touchscreen.tap(800, 450);
else if (how === 'click') await page.mouse.click(800, 450);
else await page.keyboard.press('KeyA');
await sleep(800);
out(await q(`(() => { const a = window.__echoes.audio.autoplay(); return { a, fps: window.__echoes.fps }; })()`));
await browser.close();
