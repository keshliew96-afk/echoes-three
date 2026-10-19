// gntfixM36 copy of tools/gntcmenu6-navmouse.mjs (menu critic r6) with renamed outputs gntfixM36-m-navmouse — fix-M3-r6 regression of the pointer nav-sound edit in src/app/nav.js.
// Menu critic r6 — G1.2 mouse-only navigation: loading click, hover focus, click, right-click back,
// wheel, tab clicks, value arrows, Exit confirm, New Game, mouse-only pause path; hint glyph switching.
import { launch, open, logger, sleep, CAP, URL_BASE, installGamepad, padTap } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM36-m-navmouse');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({});
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await page.evaluate(() => { history.pushState({}, '', location.href); });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), ring: a.ringCount(), state: a.state }; });
  const rect = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }, sel);
  const hover = async (sel) => { const r = await rect(sel); if (!r) return null; await page.mouse.move(r.x, r.y, { steps: 4 }); await sleep(200); return F(); };
  const click = async (sel, w = 450, button = 'left') => { const r = await rect(sel); if (!r) { log('no element', sel); return F(); } await page.mouse.click(r.x, r.y, { button }); await sleep(w); return F(); };
  const foot = () => page.evaluate(() => document.querySelector('.ap-title-foot').innerText.replace(/\s+/g, ' '));
  await page.waitForFunction(() => { const el = document.querySelector('[data-screen="loading"]'); return el && /Press any key|Ready/i.test(el.textContent); }, { timeout: 150000, polling: 200 });
  for (let i = 0; i < 20 && (await F()).state === 'boot'; i++) { await page.mouse.click(800, 450); await sleep(350); }
  let f = await F();
  check('M0 loading card passes by a mouse click', f.state === 'title', f);
  await sleep(800);
  const items = ['#ap-title-multiplayer', '#ap-title-settings', '#ap-title-records', '#ap-title-exit', '#ap-title-new'];
  const hov = [];
  for (const s of items) { f = await hover(s); hov.push([s, f.id, f.ring]); }
  check('M1 hover moves the one focus ring', hov.every(([s, id, r]) => '#' + id === s && r === 1), hov);
  log('title hints after mouse', await foot());
  f = await hover('#ap-title-load'); check('M1b hovering the disabled Load Game does not focus it', f.id !== 'ap-title-load', f);
  await page.mouse.move(1500, 800); await sleep(300); f = await F();
  check('M1c mouse off every item: still exactly 1 ring', f.ring === 1, f);
  await hover('#ap-title-settings'); await page.keyboard.press('ArrowDown'); await sleep(200); f = await F();
  check('M1d key Down continues from the hovered item', f.id === 'ap-title-records' && f.ring === 1, f);
  const hintsK = await foot();
  await installGamepad(page); await padTap(page, 13); await sleep(200);
  const hintsP = await foot();
  await page.keyboard.press('ArrowUp'); await sleep(200);
  const hintsK2 = await foot();
  log('hints key / pad / key', hintsK, '||', hintsP, '||', hintsK2);
  check('M1e hint glyphs follow the last device (key -> pad -> key)', hintsK !== hintsP && hintsK2 === hintsK, { hintsK, hintsP, hintsK2 });
  f = await click('#ap-title-settings', 600); check('M2 click Settings opens it', f.stack === 'title>settings', f);
  f = await click('#ap-tab-audio', 500);
  const selA = await page.evaluate(() => document.querySelector('[id^="ap-tab-"][aria-selected="true"]').id);
  check('M3 click Audio tab selects it', selA === 'ap-tab-audio', selA);
  const sb0 = await page.evaluate(() => { const el = document.getElementById('au-ui-level'); let p = el && el.parentElement; while (p && !(p.scrollHeight > p.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; window.__gcSB = p; return p ? { top: p.scrollTop, sh: p.scrollHeight, ch: p.clientHeight } : null; });
  const mid = await rect('#au-master-level'); await page.mouse.move(mid.x, mid.y); await page.mouse.wheel({ deltaY: 400 }); await sleep(500);
  const sb1 = await page.evaluate(() => (window.__gcSB ? window.__gcSB.scrollTop : null));
  check('M4 wheel scrolls the Audio list', !!sb0 && sb1 > sb0.top, { sb0, sb1 });
  await click('#ap-tab-display', 500);
  const val = () => page.evaluate(() => window.__echoes.settings.get('display.frameLimit'));
  const v0 = await val();
  const arrows = await page.evaluate(() => { const row = document.getElementById('ap-display-frameLimit'); const btns = row ? [...row.querySelectorAll('button')] : []; return btns.map((b, i) => { b.setAttribute('data-gc-arrow', String(i)); return b.getAttribute('aria-label') || b.textContent.trim(); }); });
  log('frameLimit row buttons', arrows);
  await click('[data-row-id="ap-display-frameLimit"] .ap-next', 300); const v1 = await val();
  await click('[data-row-id="ap-display-frameLimit"] .ap-prev', 300); const v2 = await val();
  check('M5 clicking the > / < arrows changes Frame-rate limit and back', v1 !== v0 && v2 === v0, { v0, v1, v2 });
  const vs0 = await page.evaluate(() => window.__echoes.settings.get('display.vsync'));
  await click('#ap-display-vsync', 300); const vs1 = await page.evaluate(() => window.__echoes.settings.get('display.vsync'));
  await click('#ap-display-vsync', 300); const vs2 = await page.evaluate(() => window.__echoes.settings.get('display.vsync'));
  check('M6 clicking V-Sync toggles it and back', vs1 === !vs0 && vs2 === vs0, { vs0, vs1, vs2 });
  f = await click('#ap-display-showFps', 500, 'right');
  check('M7 right-click in Settings backs to title, focus restored on Settings', f.stack === 'title' && f.id === 'ap-title-settings', f);
  // M7b: pointer resting on Settings, keyboard moved focus to Records, click without moving -> which item opens, where does focus return?
  await page.mouse.move(1500, 800); await sleep(200); await hover('#ap-title-settings'); await page.keyboard.press('ArrowDown'); await sleep(250);
  const beforeClick = (await F()).id; { const r = await rect('#ap-title-settings'); await page.mouse.down(); await page.mouse.up(); } await sleep(600); const opened = (await F()).stack;
  await page.keyboard.press('Escape'); await sleep(500); f = await F();
  log('M7b pointer on Settings, key focus', beforeClick, '-> click opened', opened, '-> after Esc focus', f.id);
  check('M7b focus returns to the item the click activated', !(opened === 'title>settings' && f.id !== 'ap-title-settings'), { beforeClick, opened, after: f.id });
  f = await click('#ap-title-records', 600); const rs = f.stack; f = await click('#sv-records-back', 500);
  check('M8 Records by click, Back button returns', rs === 'title>records' && f.stack === 'title', { rs, f });
  f = await click('#ap-title-exit', 500); const es = f.stack; f = await click('#ap-confirm-cancel', 500);
  check('M9 Exit confirm by click, Cancel returns', es === 'title>confirm' && f.stack === 'title', { es, f });
  f = await click('#ap-title-new', 1500); check('M10 click New Game -> playing', f.state === 'playing', f);
  await sleep(1000);
  const hudBtn = await page.evaluate(() => {
    const re = /pause|menu|options/i;
    const c = [...document.querySelectorAll('button, [role="button"], [data-action]')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && re.test((el.getAttribute('aria-label') || '') + ' ' + el.textContent + ' ' + el.id + ' ' + el.className); });
    return c.map((el) => ({ id: el.id, cls: String(el.className).slice(0, 40), label: el.getAttribute('aria-label'), text: el.textContent.trim().slice(0, 20), r: el.getBoundingClientRect().toJSON() }));
  });
  log('HUD pause/menu buttons visible in play', hudBtn);
  if (hudBtn.length) {
    const b = hudBtn[0]; await page.mouse.click(b.r.x + b.r.width / 2, b.r.y + b.r.height / 2); await sleep(600); f = await F();
    check('M11 a mouse-only player can open the pause menu', f.stack === 'pause', f);
    await page.screenshot({ path: `${CAP}/gntfixM36-m-navmouse-pause.png` });
    f = await click('#pz-resume', 500); check('M11b click Resume', f.stack === '' && f.state === 'playing', f);
  } else check('M11 a mouse-only player can open the pause menu', false, 'no visible HUD pause/menu button');
  await page.screenshot({ path: `${CAP}/gntfixM36-m-navmouse-play.png` });
  log('page errors', errors.length, errors.slice(0, 3));
  check('M12 0 page errors', errors.length === 0, errors.length);
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
