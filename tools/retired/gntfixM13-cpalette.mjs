// fix-M1-r3 copy of the critic's tools/gntcmenu3-palette.mjs (log + captures renamed; unchanged otherwise)
// Menu critic r3 — G1.12 palette discipline inside menu plates (analyze.mjs --box per plate) + backdrop Ember allowance.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP } from './gntcmenu3-lib.mjs';
import { execFileSync } from 'child_process';
const log = logger('gntfixM13-cpalette');
const W = 1600, H = 900;
const hues = (png, box) => { const out = execFileSync('node', ['tools/analyze.mjs', ...(box ? ['--box', box.join(',')] : []), png], { encoding: 'utf8' }); const m = out.match(/danger (\d+)\s+heal (\d+)\s+violet (\d+)\s+amber (\d+)/); return m ? { danger: +m[1], heal: +m[2], violet: +m[3], amber: +m[4] } : null; };
const browser = await launch({ width: W, height: H });
const total = { danger: 0, heal: 0, violet: 0, plates: 0 };
const offenders = [];
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  // loading plate (before any key)
  await page.waitForFunction(() => { const el = document.querySelector('#app-ui'); return el && /Press any key|Ready/i.test(el.textContent); }, { timeout: 120000 });
  await sleep(500);
  async function measure(name) {
    await sleep(700);
    const png = `${CAP}/gntfixM13-cpalette-${name}.png`;
    await page.screenshot({ path: png });
    const rects = await page.evaluate(() => {
      const st = window.__echoes.app.stack(); const id = st[st.length - 1] || 'loading';
      const top = document.querySelector(`[data-screen="${id}"]`) || document.querySelector('#app-ui');
      const els = [...top.querySelectorAll('[data-nav], .ap-plate, [class*="plate"]')];
      if (top.matches && top.matches('.ap-plate, [class*="plate"]')) els.push(top);
      const out = [];
      for (const el of els) { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y)); const w = Math.min(innerWidth - x, Math.floor(r.width)), h = Math.min(innerHeight - y, Math.floor(r.height)); if (w > 3 && h > 3) out.push({ id: el.id || el.className.toString().split(' ')[0], box: [x, y, w, h] }); }
      return out;
    });
    let sum = { danger: 0, heal: 0, violet: 0 };
    for (const r of rects) { const hsv = hues(png, r.box); if (!hsv) continue; total.plates++; for (const k of ['danger', 'heal', 'violet']) { sum[k] += hsv[k]; total[k] += hsv[k]; } if (hsv.danger || hsv.heal || hsv.violet) offenders.push({ screen: name, id: r.id, box: r.box, ...hsv }); }
    const full = hues(png);
    log(name, { plates: rects.length, insidePlates: sum, fullFrame: full });
  }
  await measure('loading');
  await reachTitle(page);
  await measure('title');
  await page.evaluate(() => window.__echoes.app.open('settings'));
  await measure('settings-display');
  for (const t of ['audio', 'gameplay', 'controls', 'network']) { await page.evaluate(() => window.__echoes.app.press('tabNext')); await measure('settings-' + t); }
  await page.keyboard.press('Escape'); await sleep(600);
  await page.evaluate(() => { window.close = () => {}; document.querySelector('#ap-title-exit').click(); });
  await measure('confirm');
  await page.evaluate(() => document.querySelector('#ap-confirm-ok').click());
  await measure('farewell');
  await page.evaluate(() => document.querySelector('#ap-farewell-return').click()); await sleep(800);
  // keep-display
  await page.evaluate(() => window.__echoes.app.open('settings')); await sleep(700);
  await page.keyboard.press('ArrowLeft'); await sleep(300); await page.keyboard.press('Escape');
  await measure('keep-display');
  log('TOTAL inside plates', total, 'offenders', offenders.slice(0, 20), 'errors', errors);
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
