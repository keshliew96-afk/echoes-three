// fix-M1-r5 (MENU-R5-F1) — every contributed Gameplay row says what its CURRENT value does.
// Real keys / mouse only (the debug API only reads state, except case D which is the "someone else changed the store" case).
// A  Socket my new nodes: Enter / ArrowLeft / ArrowRight / mouse click -> the sub-line matches the value every time.
// B  Q/E tab switch and close + reopen Settings -> still matches.
// C  Challenge Harrowing + Ally builds Manual + Socket On by keys, then "Reset to defaults" (real keys through the
//    confirm dialog) -> every row shows the default value and the default's line.
// D  store changed while the tab is open (debug API set, standing in for the pause menu / another screen) -> rows follow.
// E  booted with Socket On stored (reload) -> On line; toggle Off by Enter -> Off line; reopen -> Off line.
// Usage: ECHOES_URL=http://127.0.0.1:5199/ node tools/gntfixM15-rows.mjs
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-rows');
const ON = 'Your bench is auto-filled at every commit';
const OFF = 'Your new nodes wait on the bench';
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails += 1;
  log(`${ok ? 'PASS' : 'FAIL'} ${name}`, data ?? '');
};
const rowOf = (page, id) =>
  page.evaluate((id) => {
    const n = document.getElementById(id);
    const r = n && n.closest('.ap-row');
    return r ? { ctl: (n.textContent || '').trim(), note: (r.querySelector('.ap-note')?.textContent || '').trim() } : null;
  }, id);
const snap = async (page) => {
  const s = await page.evaluate(() => ({
    sock: window.__echoes.settings.get('gameplay.autoSocketOwn'),
    ally: window.__echoes.settings.get('gameplay.allyBuilds'),
    chal: window.__echoes.settings.get('gameplay.challenge'),
  }));
  return { ...s, sockRow: await rowOf(page, 'pt-gameplay-autoSocketOwn'), allyRow: await rowOf(page, 'pt-gameplay-allyBuilds'), chalRow: await rowOf(page, 'ex-gameplay-challenge') };
};
const sockOk = (s) => !!s.sockRow && s.sockRow.ctl === (s.sock ? 'On' : 'Off') && s.sockRow.note === (s.sock ? ON : OFF);
const LBL = { suggest: 'Suggested', manual: 'Manual', auto: 'Automatic', relaxed: 'Relaxed', standard: 'Standard', harrowing: 'Harrowing' };
async function focusId(page, id, max = 16) {
  for (let i = 0; i < max && (await focusInfo(page)).id !== id; i++) {
    await page.keyboard.press('ArrowDown');
    await sleep(170);
  }
  return (await focusInfo(page)).id === id;
}
async function openGameplayByKeys(page) {
  // title -> Settings by real keys, then E until the Gameplay tab is selected
  for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) {
    await page.keyboard.press('ArrowDown');
    await sleep(170);
  }
  await page.keyboard.press('Enter');
  await sleep(700);
  for (let i = 0; i < 6; i++) {
    const sel = await page.evaluate(() => document.querySelector('[data-screen="settings"] [aria-selected="true"]')?.id);
    if (sel === 'ap-tab-gameplay') break;
    await page.keyboard.press('KeyE');
    await sleep(350);
  }
}
const browser = await launch({ width: 1600, height: 900 });
try {
  const first = await open(browser, URL_BASE + '?fresh=1');
  let page = first.page;
  const errors = first.errors;
  await reachTitle(page);
  const titleIds = await page.evaluate(() => window.__echoes.app.focusables ? window.__echoes.app.focusables().map((f) => f.id) : null);
  log('title items', titleIds);
  await openGameplayByKeys(page);
  check('A0 reached Socket row', await focusId(page, 'pt-gameplay-autoSocketOwn'));
  let s = await snap(page);
  check('A1 fresh Off', sockOk(s) && s.sock === false, s.sockRow);
  for (const k of ['Enter', 'ArrowLeft', 'ArrowRight', 'Space']) {
    await page.keyboard.press(k);
    await sleep(350);
    s = await snap(page);
    check(`A2 ${k} -> ${s.sock}`, sockOk(s), s.sockRow);
  }
  // mouse click on the switch
  const box = await page.evaluate(() => { const r = document.getElementById('pt-gameplay-autoSocketOwn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(box.x, box.y);
  await sleep(350);
  s = await snap(page);
  check(`A3 click -> ${s.sock}`, sockOk(s), s.sockRow);
  await page.mouse.click(box.x, box.y);
  await sleep(350);
  s = await snap(page);
  check(`A3 click -> ${s.sock}`, sockOk(s), s.sockRow);
  // B: tab switch + reopen
  await page.keyboard.press('KeyQ'); await sleep(350); await page.keyboard.press('KeyE'); await sleep(450);
  s = await snap(page);
  check(`B1 after Q/E (${s.sock})`, sockOk(s), s.sockRow);
  await focusId(page, 'pt-gameplay-autoSocketOwn');
  await page.keyboard.press('Enter'); await sleep(350);
  await page.keyboard.press('Escape'); await sleep(600);
  await page.keyboard.press('Enter'); await sleep(800); // title focus returns to Settings
  s = await snap(page);
  check(`B2 after close + reopen (${s.sock})`, sockOk(s), s.sockRow);
  // C: change three contributed rows by keys, then Reset to defaults by keys
  await focusId(page, 'ex-gameplay-challenge');
  await page.keyboard.press('ArrowRight'); await sleep(300); // standard -> harrowing
  await focusId(page, 'pt-gameplay-allyBuilds');
  await page.keyboard.press('ArrowRight'); await sleep(300); // suggest -> manual
  await focusId(page, 'pt-gameplay-autoSocketOwn');
  if (!(await page.evaluate(() => window.__echoes.settings.get('gameplay.autoSocketOwn')))) { await page.keyboard.press('Enter'); await sleep(300); }
  s = await snap(page);
  log('C0 before reset', s);
  check('C0 changed rows show their values', s.chalRow.ctl === LBL[s.chal] && s.allyRow.ctl === LBL[s.ally] && sockOk(s) && s.chal !== 'standard' && s.ally !== 'suggest' && s.sock === true, s);
  await focusId(page, 'ap-settings-reset', 20);
  await page.keyboard.press('Enter'); await sleep(600);
  const dlg = await focusInfo(page);
  log('C1 dialog', dlg);
  // the dialog defaults to Cancel: move to Reset and confirm
  for (let i = 0; i < 4; i++) {
    const f = await focusInfo(page);
    if (f.screen === 'confirm' && /reset/i.test(f.label || '')) break;
    await page.keyboard.press('ArrowLeft'); await sleep(200);
  }
  log('C1 on', await focusInfo(page));
  await page.keyboard.press('Enter'); await sleep(700);
  s = await snap(page);
  log('C2 after reset', s);
  check('C2 store at defaults', s.chal === 'standard' && s.ally === 'suggest' && s.sock === false, s);
  check('C3 Challenge row shows Standard', s.chalRow && s.chalRow.ctl === 'Standard', s.chalRow);
  check('C4 Ally builds row shows Suggested', s.allyRow && s.allyRow.ctl === 'Suggested' && /pre-picked/.test(s.allyRow.note), s.allyRow);
  check('C5 Socket row shows Off + Off line', sockOk(s), s.sockRow);
  // D: the store changes while the tab is open (another screen / API)
  await page.evaluate(() => { window.__echoes.settings.set('gameplay.autoSocketOwn', true); window.__echoes.settings.set('gameplay.allyBuilds', 'auto'); window.__echoes.settings.set('gameplay.challenge', 'relaxed'); });
  await sleep(300);
  s = await snap(page);
  check('D1 rows follow an outside change', sockOk(s) && s.allyRow.ctl === 'Automatic' && s.chalRow.ctl === 'Relaxed', s);
  await page.evaluate(() => { window.__echoes.settings.set('gameplay.challenge', 'standard'); window.__echoes.settings.set('gameplay.allyBuilds', 'suggest'); window.__echoes.settings.persist && window.__echoes.settings.persist(); });
  await page.screenshot({ path: `${CAP}/gntfixM15-rows-gameplay.png` });
  // E: reload with Socket On stored
  await page.keyboard.press('Escape'); await sleep(500);
  // a fresh tab of the same profile (a same-tab reload on the busy dev server can stall)
  await page.close();
  const second = await open(browser, URL_BASE);
  page = second.page;
  errors.push(...second.errors);
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await reachTitle(page);
  await openGameplayByKeys(page);
  await focusId(page, 'pt-gameplay-autoSocketOwn');
  s = await snap(page);
  check('E1 booted On -> On line', sockOk(s) && s.sock === true, s.sockRow);
  await page.keyboard.press('Enter'); await sleep(350);
  s = await snap(page);
  check('E2 Enter -> Off line', sockOk(s) && s.sock === false, s.sockRow);
  const crop = await page.evaluate(() => { const r = document.getElementById('pt-gameplay-autoSocketOwn').closest('.ap-row').getBoundingClientRect(); return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 }; });
  await page.screenshot({ path: `${CAP}/gntfixM15-rows-socket-off-crop.png`, clip: crop });
  await page.keyboard.press('Escape'); await sleep(600);
  await page.keyboard.press('Enter'); await sleep(800);
  s = await snap(page);
  check('E3 reopen -> Off line', sockOk(s) && s.sock === false, s.sockRow);
  await focusId(page, 'pt-gameplay-autoSocketOwn');
  await page.keyboard.press('Enter'); await sleep(350);
  s = await snap(page);
  check('E4 Enter -> On line', sockOk(s) && s.sock === true, s.sockRow);
  await page.screenshot({ path: `${CAP}/gntfixM15-rows-socket-on.png` });
  await page.evaluate(() => { window.__echoes.settings.set('gameplay.autoSocketOwn', false); window.__echoes.settings.persist && window.__echoes.settings.persist(); });
  check('Z page errors 0', errors.length === 0 && second.errors.length === 0, [...errors, ...second.errors]);
} catch (e) {
  fails += 1;
  log('ERR', String((e && e.stack) || e));
} finally {
  await browser.close();
}
log(`TOTAL FAILS ${fails}`);
process.exit(fails ? 1 : 0);
