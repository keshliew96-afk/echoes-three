// fix-M1-r4 (MENU-R4-F1) — Esc / B / right-click inside a Settings ▸ Network
// text field is CANCEL, never commit. Real keys from the title the whole way
// (KeyZ past the boot card, ArrowDown to Settings, Enter, E x4, Down), a
// mocked standard pad for B, a real right-click, plus the dialogs whose one
// Esc must still cancel-and-close (rename save, change server), an IME
// composition, and Settings opened straight over play (no screen beneath).
// Usage: node tools/gntfixM14-cancel.mjs [--size 1280x720]   (ECHOES_URL for a preview)
// Log: captures/gntfixM14-cancel[-<LOGSUFFIX>].log, screenshots next to it.
import { launch, open, reachTitle, logger, sleep, URL_BASE, focusInfo, installGamepad, padTap } from './gntfixM14-lib.mjs';

const argv = process.argv.slice(2);
const sizeArg = argv.includes('--size') ? argv[argv.indexOf('--size') + 1] : '1280x720';
const [W, H] = sizeArg.split('x').map(Number);
const log = logger('gntfixM14-cancel' + (process.env.LOGSUFFIX ? '-' + process.env.LOGSUFFIX : ''));
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data);
};
const browser = await launch({ width: W, height: H });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: W, height: H });
  log('url', URL_BASE, 'size', W + 'x' + H, 'version', await page.evaluate(() => window.__echoes.version));
  await reachTitle(page);
  const marker = await page.evaluate(() => (window.__m14 = Math.random().toString(36).slice(2)));
  const st = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      const f = window.__echoes.app.focus();
      let stored = null;
      try {
        const d = JSON.parse(localStorage.getItem('echoes.settings')).data;
        stored = { name: d['net.playerName'], server: d['net.serverUrl'] };
      } catch {
        stored = null;
      }
      const note = (id) => {
        const i = document.getElementById(id);
        const row = i && i.closest('.ap-row');
        const n = row && row.querySelector('.ap-note');
        return n ? n.textContent : null;
      };
      return {
        stack: window.__echoes.app.stack(),
        state: window.__echoes.app.state,
        focus: f && f.id,
        ring: window.__echoes.app.ringCount(),
        active: a && (a.id || a.tagName),
        value: a && 'value' in a ? a.value : null,
        name: window.__echoes.settings.get('net.playerName'),
        server: window.__echoes.settings.get('net.serverUrl'),
        stored,
        nameNote: note('nt-set-name'),
        serverNote: note('nt-set-server'),
        tab: (document.querySelector('[data-screen="settings"] [aria-selected="true"]') || {}).id || null,
        hints: ((document.querySelector('[data-screen="settings"] .ap-hints') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
        m14: window.__m14 || null,
      };
    });
  const key = async (code, wait = 250) => {
    await page.keyboard.press(code);
    await sleep(wait);
  };
  const selectAll = async () => {
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
  };
  // Title -> Settings -> Network by real keys.
  async function toNetworkByKeys() {
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) await key('ArrowDown', 200);
    await key('Enter', 700);
    for (let i = 0; i < 6 && (await st()).tab !== 'ap-tab-network'; i++) await key('KeyE', 350);
    const s = await st();
    return s.tab === 'ap-tab-network';
  }
  async function toField(id) {
    for (let i = 0; i < 8 && (await st()).active !== id; i++) await key('ArrowDown', 220);
    return (await st()).active === id;
  }

  // ------------------------------------------------------------ keyboard --
  const onNet = await toNetworkByKeys();
  check('K0 title > Settings > Network by real keys', onNet, await st());
  const h0 = (await st()).hints;
  check('H0 footer on the tab stop is the normal set (Change, Tabs, Back)', /Change/.test(h0) && /QETabs/.test(h0) && /EscBack/.test(h0), h0);
  const n0 = await st();
  const committedName = n0.name;
  check('K1 Down reaches Player name with the caret', await toField('nt-set-name'), await st());
  await selectAll();
  await page.keyboard.type('Zed', { delay: 30 });
  await sleep(200);
  const k2a = await st();
  await key('Escape', 500);
  const k2 = await st();
  check('H1 footer while typing an uncommitted edit: Enter Save · Esc Cancel edit, no "Q E Tabs"', /EnterSave/.test(k2a.hints) && /EscCancel edit/.test(k2a.hints) && !/Tabs/.test(k2a.hints), k2a.hints);
  check('H2 footer after the cancel (caret in the field, nothing to cancel): Esc Back', /EscBack/.test(k2.hints) && !/Cancel/.test(k2.hints), k2.hints);
  check(
    'K2 Esc with a typed name: reverts to the saved name, caret stays, Settings stays, nothing saved, the note says so',
    k2a.value === 'Zed' && k2.value === committedName && k2.active === 'nt-set-name' && k2.stack.join() === 'title,settings' && k2.name === committedName && (!k2.stored || k2.stored.name === undefined || k2.stored.name === committedName) && /cancel/i.test(k2.nameNote || '') && k2.ring === 1,
    { typed: k2a.value, after: k2 }
  );
  await page.screenshot({ path: log.file.replace(/\.log$/, '-name-cancelled.png') });
  // leaving the field after a cancel commits nothing
  await key('ArrowDown', 400);
  const k3 = await st();
  check('K3 Down after the cancel: on Server address, name unchanged', k3.active === 'nt-set-server' && k3.name === committedName, k3);
  await page.keyboard.type('ws://12', { delay: 30 });
  await sleep(150);
  await key('Escape', 500);
  const k4 = await st();
  check(
    'K4 Esc with a half-typed address: field back to empty (Automatic), setting "" in memory + storage, Settings stays, note "Change cancelled. Automatic ..."',
    k4.value === '' && k4.server === '' && (!k4.stored || !k4.stored.server) && k4.stack.join() === 'title,settings' && k4.active === 'nt-set-server' && /^Change cancelled\. Automatic/.test(k4.serverNote || ''),
    k4
  );
  await page.screenshot({ path: log.file.replace(/\.log$/, '-server-cancelled.png') });
  // Enter still commits; an edit on top of a saved address reverts to THAT address.
  await page.keyboard.type('ws://127.0.0.1:7841/echoes', { delay: 10 });
  await key('Enter', 500);
  const k5 = await st();
  check('K5 Enter commits a valid address (saved + stored)', k5.server === 'ws://127.0.0.1:7841/echoes' && k5.stored && k5.stored.server === 'ws://127.0.0.1:7841/echoes' && k5.stack.join() === 'title,settings', k5);
  await page.keyboard.type('xyz', { delay: 20 });
  await key('Escape', 500);
  const k6 = await st();
  check('K6 an edit on top of the saved address + Esc -> back to the saved address, still saved', k6.value === 'ws://127.0.0.1:7841/echoes' && k6.server === 'ws://127.0.0.1:7841/echoes' && k6.stack.join() === 'title,settings', k6);
  // Refused (invalid) text + Esc -> reverts and clears the error.
  await selectAll();
  await page.keyboard.type('http://oops', { delay: 10 });
  await key('Enter', 400);
  const k7a = await st();
  await key('Escape', 500);
  const k7 = await st();
  check('K7 refused http:// text + Esc -> field back to the saved address, error replaced by the cancel note', /ws:\/\/ or wss:\/\//.test(k7a.serverNote || '') && k7.value === 'ws://127.0.0.1:7841/echoes' && /cancel/i.test(k7.serverNote || '') && k7.stack.join() === 'title,settings', { refusedNote: k7a.serverNote, after: k7 });
  // Nothing left to cancel: Esc backs exactly one level (to the title, focus on Settings).
  await key('Escape', 700);
  const k8 = await st();
  check('K8 Esc with nothing to cancel -> title (one level), focus restored on Settings, caret left the field', k8.stack.join() === 'title' && k8.focus === 'ap-title-settings' && k8.active !== 'nt-set-server' && k8.server === 'ws://127.0.0.1:7841/echoes', k8);
  // Reset to automatic (by keys, then by mouse): the button disables itself —
  // the ring re-homes on the next row, never on an unselected tab (r3 F2 rule).
  await toNetworkByKeys();
  await toField('nt-set-server');
  for (let i = 0; i < 4 && (await st()).focus !== 'nt-set-auto'; i++) await key('ArrowDown', 250);
  const r0 = await st();
  await key('Enter', 700);
  const r1 = await st();
  check('R1 Reset to automatic by Enter: address automatic, ring 1 on the next row (Connection details), selected tab Network', r0.focus === 'nt-set-auto' && r1.server === '' && r1.ring === 1 && r1.focus === 'nt-set-stats' && r1.tab === 'ap-tab-network', { before: r0.focus, after: r1 });
  await page.evaluate(() => window.__echoes.settings.set('net.serverUrl', 'ws://127.0.0.1:7841/echoes', { source: 'ui' }));
  await sleep(300);
  const bpt = await page.evaluate(() => { const r = document.getElementById('nt-set-auto').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(bpt.x - 5, bpt.y);
  await page.mouse.move(bpt.x, bpt.y);
  await page.mouse.click(bpt.x, bpt.y);
  await sleep(700);
  const r2 = await st();
  check('R2 Reset to automatic by mouse: automatic, ring 1 on a row of the Network tab (not a tab button)', r2.server === '' && r2.ring === 1 && !!r2.focus && !/^ap-tab-/.test(r2.focus) && r2.tab === 'ap-tab-network', r2);
  for (let i = 0; i < 3 && (await st()).stack.length > 1; i++) await key('Escape', 500);
  await page.evaluate(() => window.__echoes.settings.set('net.serverUrl', '', { source: 'ui' }));
  await sleep(200);

  // ---------------------------------------------------- leave-commits rule --
  await toNetworkByKeys();
  await toField('nt-set-name');
  await selectAll();
  await page.keyboard.type('Neo', { delay: 30 });
  await key('ArrowDown', 500);
  const l1 = await st();
  check('L1 moving off the field keeps what was typed (form rule): name "Neo" saved, caret on Server address', l1.name === 'Neo' && l1.active === 'nt-set-server', l1);
  await key('ArrowUp', 400);
  await selectAll();
  await page.keyboard.type(committedName, { delay: 10 });
  await key('Enter', 400);

  // ------------------------------------------------------------- gamepad --
  await installGamepad(page);
  await sleep(400); // the poller adopts the pad's resting state first
  await toField('nt-set-name');
  await selectAll();
  await page.keyboard.type('Pad', { delay: 30 });
  await sleep(150);
  await padTap(page, 1); // B
  await sleep(300);
  const g1a = await st();
  await sleep(300);
  const g1 = await st();
  check('G1 pad B with a typed name: reverted, Settings stays, nothing saved', g1.value === committedName && g1.name === committedName && g1.stack.join() === 'title,settings' && /cancel/i.test(g1.nameNote || ''), g1);
  await padTap(page, 1);
  await sleep(500);
  const g2 = await st();
  check('H4 pad footer in a text field after the pad cancel: B Back (glyphs follow the pad)', /BBack/.test(g1.hints), { before: g1a.hints, after: g1.hints });
  check('G2 pad B again (nothing to cancel) -> title, one level', g2.stack.join() === 'title' && g2.name === committedName, g2);

  // --------------------------------------------------------- right-click --
  await toNetworkByKeys();
  await toField('nt-set-name');
  await selectAll();
  await page.keyboard.type('Mouse', { delay: 30 });
  await sleep(150);
  // right-click on the Settings plate away from the field (the tab body's free space)
  const pt = await page.evaluate(() => {
    const el = document.querySelector('[data-screen="settings"] .nt-nettab p.ap-note') || document.querySelector('[data-screen="settings"]');
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 10) };
  });
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await sleep(500);
  const m1 = await st();
  check('M1 right-click with a typed name: reverted, caret kept, Settings stays, nothing saved', m1.value === committedName && m1.active === 'nt-set-name' && m1.name === committedName && m1.stack.join() === 'title,settings', { pt, m1 });
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await sleep(600);
  const m2 = await st();
  check('M2 right-click again -> title (one level), nothing saved', m2.stack.join() === 'title' && m2.name === committedName, m2);

  // ------------------------------------------------------------------ IME --
  await toNetworkByKeys();
  await toField('nt-set-name');
  const cdp = await page.target().createCDPSession();
  await page.keyboard.press('End');
  await cdp.send('Input.imeSetComposition', { text: 'ni', selectionStart: 2, selectionEnd: 2 });
  await sleep(200);
  const i0 = await st();
  await key('Escape', 400);
  const i1 = await st();
  check('I1 Esc during an IME composition belongs to the IME: no menu action (Settings stays, composition intact, nothing saved)', i1.stack.join() === 'title,settings' && i1.active === 'nt-set-name' && i1.value === i0.value && i1.name === committedName, { during: i0.value, after: i1 });
  await cdp.send('Input.insertText', { text: '' }).catch(() => {});
  await page.evaluate(() => {
    const i = document.getElementById('nt-set-name');
    if (i) i.blur();
  });
  await page.evaluate(() => window.__echoes.settings.set('net.playerName', 'Mouse111', { source: 'ui' }));
  await sleep(200);
  for (let i = 0; i < 4 && (await st()).stack.length > 1; i++) await key('Escape', 400);

  // -------------------------------------------- dialogs: one Esc = cancel --
  await page.evaluate(() => {
    window.__rn = 'pending';
    window.__echoes.app.open('sv-rename', { value: 'Old name', resolve: (v) => (window.__rn = v) });
  });
  await sleep(600);
  await selectAll();
  await page.keyboard.type('New name', { delay: 20 });
  await key('Escape', 500);
  const d1 = await page.evaluate(() => ({ rn: window.__rn, stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id }));
  check('D1 rename dialog: typed name + ONE Esc -> dialog closed, rename cancelled (resolve(null))', d1.rn === null && d1.stack.join() === 'title', d1);
  await page.evaluate(() => {
    window.__sd = 'pending';
    window.__echoes.app.open('nt-server', { onDone: (c) => (window.__sd = c) });
  });
  await sleep(600);
  await selectAll();
  await page.keyboard.type('ws://12', { delay: 20 });
  await key('Escape', 500);
  const d2 = await page.evaluate(() => ({ sd: window.__sd, stack: window.__echoes.app.stack(), server: window.__echoes.settings.get('net.serverUrl') }));
  check('D2 change-server dialog: typed address + ONE Esc -> dialog closed, nothing saved', d2.sd === false && d2.stack.join() === 'title' && d2.server === '', d2);

  // ------------------------------ Settings straight over play (no beneath) --
  await page.goto(URL_BASE + '?menu=0&seed=7', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.app && window.__echoes.app.state === 'playing', { timeout: 180000, polling: 200 });
  await sleep(800);
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'network' }));
  await sleep(800);
  await toField('nt-set-name');
  const p0 = await st();
  await key('Escape', 600);
  const p1 = await st();
  check('P1 Settings opened over play, caret in Player name, Esc -> closed to play; the caret does not stay in a hidden field', p0.active === 'nt-set-name' && p1.stack.length === 0 && p1.state === 'playing' && p1.active !== 'nt-set-name', { before: p0.active, after: p1 });
  // the game still gets movement keys afterwards (no stuck text focus)
  const hp = () => page.evaluate(() => { const p = (window.__echoes.state().party || [])[0]; return p ? { x: p.x, z: p.z != null ? p.z : p.y } : null; });
  const t0 = await hp();
  await page.keyboard.down('KeyD');
  await sleep(600);
  await page.keyboard.up('KeyD');
  await sleep(100);
  const t1 = await hp();
  const moved = t0 && t1 ? Math.hypot(t1.x - t0.x, t1.z - t0.z) : null;
  check('P2 after closing, D walks the Healer (game owns the keys, nothing typed into a hidden field)', moved != null && moved > 0.3, { moved, t0, t1 });

  check('same document (no reload mid-probe until the deliberate one)', marker && k8.m14 === marker, { marker, k8: k8.m14 });
  check('0 page errors', errors.length === 0, errors);
} catch (e) {
  fails++;
  log('ERR', String((e && e.stack) || e));
} finally {
  await browser.close();
  log('TOTAL FAILS', fails);
}
