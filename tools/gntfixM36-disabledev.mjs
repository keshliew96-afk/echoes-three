// gntfixM36 — which pointer / mouse events does headless Chrome dispatch for a press on a DISABLED <button>
// and on an aria-disabled one (design input for the pointer deny cue, fix-M3-r6)?
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--no-first-run'] });
const page = await browser.newPage();
await page.setContent(`<div id="root" style="padding:40px"><div data-screen="t"><button id="dis" data-nav disabled style="width:200px;height:60px"><span>Disabled</span></button>
<button id="aria" data-nav aria-disabled="true" style="width:200px;height:60px"><span>Aria</span></button></div></div>`);
await page.evaluate(() => {
  window.__log = [];
  for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'])
    document.getElementById('root').addEventListener(t, (e) => window.__log.push(t + '>' + (e.target.id || e.target.tagName)), { capture: true });
});
for (const id of ['dis', 'aria']) {
  const r = await page.evaluate((id) => { const b = document.getElementById(id).getBoundingClientRect(); return { x: b.x + 20, y: b.y + 20 }; }, id);
  await page.evaluate(() => (window.__log = []));
  await page.mouse.click(r.x, r.y);
  console.log(id, 'mouse:', await page.evaluate(() => window.__log.join(' ')));
  await page.evaluate(() => (window.__log = []));
  await page.touchscreen.tap(r.x, r.y);
  console.log(id, 'touch:', await page.evaluate(() => window.__log.join(' ')));
}
await browser.close();
