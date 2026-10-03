// fix-M1-r6: verbatim copy of tools/gntcmenu6-padfs.mjs, outputs renamed gntfixM16-cpadfs. Menu critic r6 — repro: gamepad on Settings > Display mode. After each input, record the row VALUE,
// document.fullscreenElement and display.fullscreen, plus a crop screenshot. Title boot, fresh profile.
import sharp from 'sharp';
import { launch, logger, sleep, CAP, URL_BASE, reachTitle, installGamepad, padTap } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM16-cpadfs');
const browser = await launch({});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await reachTitle(page);
  await installGamepad(page);
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>') }; });
  const st = async (label) => {
    const s = await page.evaluate(() => { const r = document.querySelector('[data-row-id="ap-display-mode"]'); const v = document.getElementById('ap-display-mode'); return { value: v ? v.textContent.trim() : null, note: r ? (r.querySelector('.ap-note') || {}).textContent : null, fsEl: !!document.fullscreenElement, set: window.__echoes.settings.get('display.fullscreen'), focus: window.__echoes.app.focus().id, stack: window.__echoes.app.stack().join('>') }; });
    const file = `${CAP}/gntfixM16-cpadfs-${label}.png`;
    await page.screenshot({ path: file });
    const r = await page.evaluate(() => { const e = document.querySelector('[data-row-id="ap-display-mode"]'); const b = e.getBoundingClientRect(); return [Math.floor(b.x), Math.floor(b.y), Math.ceil(b.width), Math.ceil(b.height)]; });
    await sharp(file).extract({ left: r[0], top: r[1], width: r[2], height: r[3] }).toFile(`${CAP}/gntfixM16-cpadfs-${label}-row.png`);
    log(label, s);
    return s;
  };
  for (let i = 0; i < 8 && (await F()).id !== 'ap-title-settings'; i++) { await padTap(page, 13); await sleep(120); }
  await padTap(page, 0); await sleep(700);
  await padTap(page, 13); await sleep(200);
  await st('0-focused');
  await padTap(page, 0); await sleep(500); await st('1-padA');
  await padTap(page, 0); await sleep(500); await st('2-padA');
  await padTap(page, 0); await sleep(500); await st('3-padA');
  await padTap(page, 15); await sleep(500); await st('4-dpadRight');
  await padTap(page, 15); await sleep(500); await st('5-dpadRight');
  await page.keyboard.press('Enter'); await sleep(600); await st('6-keyEnter');
  await page.keyboard.press('Enter'); await sleep(600); await st('7-keyEnter');
  if (await page.evaluate(() => !!document.fullscreenElement)) { await page.evaluate(() => document.exitFullscreen()); await sleep(500); await st('8-exited'); }
  log('page errors', errors.length);
} finally { await browser.close(); }
