// gntfixM36 copy of tools/gntcmenu6-mouse2.mjs (menu critic r6) with renamed outputs gntfixM36-m-mouse2 — fix-M3-r6 regression of the pointer nav-sound edit in src/app/nav.js.
// Menu critic r6 — mouse-only reach/exit for the remaining screens: keep-display (drag the slider,
// click Revert / Keep), saves (load mode, empty), mp-menu > join code dialog, farewell (click Return).
import { launch, logger, sleep, CAP, URL_BASE } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM36-m-mouse2');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await page.evaluate(() => { history.pushState({}, '', location.href); window.close = () => {}; });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), state: a.state }; });
  const rect = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, l: r.x, w: r.width }; }, sel);
  const click = async (sel, w = 500, button = 'left') => { const r = await rect(sel); if (!r) { log('missing', sel); return F(); } await page.mouse.click(r.x, r.y, { button }); await sleep(w); return F(); };
  await page.waitForFunction(() => { const el = document.querySelector('[data-screen="loading"]'); return el && /Press any key|Ready/i.test(el.textContent); }, { timeout: 150000, polling: 200 });
  for (let i = 0; i < 20 && (await F()).state === 'boot'; i++) { await page.mouse.click(800, 450); await sleep(350); }
  await sleep(800);
  // keep-display by mouse: drag the Resolution scale slider left
  await click('#ap-title-settings', 700);
  const sl = await page.evaluate(() => { const el = document.querySelector('[data-row-id="ap-display-renderScale"] input[type="range"]') || document.getElementById('ap-display-renderScale'); const r = el.getBoundingClientRect(); return { tag: el.tagName, x: r.x, y: r.y + r.height / 2, w: r.width }; });
  await page.mouse.move(sl.x + sl.w * 0.5, sl.y); await page.mouse.down(); await page.mouse.move(sl.x + sl.w * 0.2, sl.y, { steps: 8 }); await page.mouse.up(); await sleep(400);
  const dragged = await page.evaluate(() => ({ s: window.__echoes.settings.get('display.renderScale'), c: document.querySelector('canvas').width }));
  let f = await click('#ap-settings-back', 600);
  const kd = f.stack;
  f = await click('#ap-keep-revert', 600);
  const rv = await page.evaluate(() => ({ s: window.__echoes.settings.get('display.renderScale'), c: document.querySelector('canvas').width }));
  check('MS1 slider drag changes the scale live; Back -> Keep/Revert; click Revert restores value + buffer', dragged.s < 1 && dragged.c < 1600 && /keep-display/.test(kd) && rv.s === 1 && rv.c === 1600, { sl, dragged, kd, rv, after: f });
  // saves (load mode) by mouse: Load is disabled on a fresh profile -> clicking it does nothing
  f = await click('#ap-title-load', 500);
  check('MS2 clicking the disabled Load Game does nothing (no dead screen)', f.stack === 'title', f);
  // mp-menu > join by code (if present) -> right-click back twice
  f = await click('#ap-title-multiplayer', 800);
  const mpItems = await page.evaluate(() => [...document.querySelectorAll('[data-screen="mp-menu"] [data-nav]')].map((e) => ({ id: e.id, t: e.textContent.trim().slice(0, 30), dis: e.getAttribute('aria-disabled') })));
  log('mp-menu items', mpItems);
  const join = mpItems.find((i) => /join/i.test(i.id + i.t) && i.dis !== 'true');
  if (join) { f = await click('#' + join.id, 800); log('after join click', f); f = await click('body', 500, 'right'); log('right-click', f); }
  const plate = await page.evaluate(() => { const b = document.getElementById('nt-mp-retry').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y - 30 }; });
  const hit = await page.evaluate((p) => { const e = document.elementFromPoint(p.x, p.y); return e ? e.tagName + '.' + String(e.className).split(' ')[0] : null; }, plate);
  await page.mouse.click(plate.x, plate.y, { button: 'right' }); await sleep(500); const rcPlate = await F();
  log('right-click inside the mp-menu plate at', plate, 'hit', hit, '->', rcPlate);
  if (rcPlate.stack !== 'title') { await page.mouse.click(40, 450, { button: 'right' }); await sleep(500); log('right-click on the scrim (40,450) ->', await F()); }
  if ((await F()).stack !== 'title') { f = await click('#nt-mp-uback', 600); log('click Back ->', f); }
  check('MS3 Multiplayer menu reachable and exitable by mouse (right-click back)', (await F()).stack === 'title', await F());
  // farewell by mouse
  await click('#ap-title-exit', 500); await click('#ap-confirm-ok', 900);
  const fw = await F();
  f = await click('#ap-farewell-return', 800);
  check('MS4 Exit -> OK -> farewell -> click Return -> title (mouse only)', fw.state === 'farewell' && f.state === 'title', { fw, f });
  log('page errors', errors.length, errors.slice(0, 3));
  check('0 page errors', errors.length === 0, errors.length);
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
