// Menu critic r3 — G1.1 layout at 1024x576 / 1600x900 / 2560x1440 over every menu screen.
import { launch, open, reachTitle, dumpNav, auditLayout, logger, sleep, URL_BASE, CAP } from './gntfixM15-clib.mjs';
import { writeFileSync } from 'fs';
const log = logger('gntfixM15-layout');
const SIZES = [[1024, 576, 14], [1600, 900, 18], [2560, 1440, 18]];
const only = process.argv[2];
for (const [w, h, floor] of SIZES) {
  if (only && String(w) !== only) continue;
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await page.evaluate(() => { window.__closeCalls = 0; window.close = () => { window.__closeCalls++; }; });
    const results = [];
    async function snap(name) {
      await sleep(700);
      const d = await dumpNav(page);
      const a = auditLayout(d, { fontFloor: floor, hitFloor: w === 1024 ? 40 : 40 });
      results.push({ name, ...a, stack: d.stack, focus: d.focus && d.focus.id });
      writeFileSync(`${CAP}/gntfixM15-layout-${w}-${name}.json`, JSON.stringify(d, null, 1));
      await page.screenshot({ path: `${CAP}/gntfixM15-layout-${w}-${name}.png` });
      log(`${w}x${h} ${name}`, { stack: d.stack, focus: d.focus && d.focus.id, items: a.count, visible: a.visible, scrolled: a.scrolled.length, issues: a.issues, minFont: a.minFont, minHit: +a.minHit.toFixed(1), minText: a.minText, small: d.smallTexts.slice(0, 4) });
    }
    await snap('title');
    await page.evaluate(() => window.__echoes.app.open('settings'));
    await snap('settings-display');
    for (const tab of ['audio', 'gameplay', 'controls', 'network']) {
      await page.evaluate(() => window.__echoes.app.press('tabNext'));
      await snap('settings-' + tab);
    }
    // back to display tab, change render scale via ArrowLeft on first row, then back -> keep-display
    for (let i = 0; i < 4; i++) await page.evaluate(() => window.__echoes.app.press('tabPrev'));
    await sleep(400);
    await page.keyboard.press('ArrowLeft');
    await sleep(300);
    await page.keyboard.press('Escape');
    await snap('keep-display');
    await page.keyboard.press('Escape'); // revert
    await sleep(500);
    log('after revert', await page.evaluate(() => ({ stack: window.__echoes.app.stack(), scale: window.__echoes.settings.get('display.renderScale') })));
    while ((await page.evaluate(() => window.__echoes.app.stack().length)) > 1) { await page.keyboard.press('Escape'); await sleep(400); }
    await page.evaluate(() => window.__echoes.app.open('records'));
    await snap('records');
    await page.keyboard.press('Escape'); await sleep(400);
    await page.evaluate(() => window.__echoes.app.open('mp-menu'));
    await snap('mp-menu');
    await page.keyboard.press('Escape'); await sleep(400);
    await page.evaluate(() => window.__echoes.app.open('saves', { mode: 'load' }));
    await snap('saves-load-empty');
    await page.keyboard.press('Escape'); await sleep(400);
    // exit confirm + farewell
    await page.evaluate(() => { const el = document.querySelector('#ap-title-exit'); el && el.click(); });
    await snap('confirm-exit');
    const okId = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-screen="confirm"] [data-nav]')].find((x) => /exit|ok|confirm|leave|quit/i.test(x.textContent)); if (b) { b.click(); return b.id || b.textContent; } return null; });
    log('confirm click', okId);
    await snap('farewell');
    const ret = await page.evaluate(() => { const b = document.querySelector('[data-screen="farewell"] [data-nav]'); b && b.click(); return b && b.textContent; });
    log('farewell return', ret, await page.evaluate(() => window.__closeCalls));
    await sleep(800);
    // New Game -> camp -> pause, levels
    await page.evaluate(() => { const el = document.querySelector('#ap-title-new'); el && el.click(); });
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
    await sleep(1500);
    await page.keyboard.press('Escape');
    await snap('pause-camp');
    await page.keyboard.press('Escape'); await sleep(600);
    await page.evaluate(() => window.__echoes.campaign.open && window.__echoes.campaign.open());
    await snap('levels');
    await page.keyboard.press('Escape'); await sleep(600);
    // mid-run pause
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
    await sleep(2500);
    await page.keyboard.press('Escape');
    await snap('pause-run');
    const bad = results.filter((r) => r.issues.length);
    log(`SUMMARY ${w}x${h}`, { screens: results.length, withIssues: bad.map((r) => [r.name, r.issues.length]), minFont: Math.min(...results.map((r) => r.minFont)), minHit: +Math.min(...results.map((r) => r.minHit)).toFixed(1), errors });
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
