// fix-M1-r3 (MENU-R3-F2) — the Settings vertical ring on EVERY tab, by keyboard
// arrows, Tab / Shift+Tab and a mocked gamepad d-pad, at 1024x576 and 1600x900.
// Per tab: Down x (ring + 2) from the tab's first row and Up x (ring + 2);
// checks (a) the cursor never lands on an unselected tab, (b) one Down cycle
// visits every enabled stop (selected tab + rows + enabled footer buttons)
// exactly once and comes home, (c) Up is the exact reverse of Down, (d) the
// selected tab never changes, (e) exactly one focus ring after every press,
// (f) a mouse-hovered UNSELECTED tab + Down lands on the selected tab's first
// row, (g) Enter on the ring's tab stop keeps the tab. Log: captures/gntfixM13-ring.log
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, installGamepad, padTap } from './gntcmenu3-lib.mjs';

const log = logger('gntfixM13-ring');
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data);
};
const SIZES = process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1024, 576], [1600, 900]];

const snap = (page) =>
  page.evaluate(() => {
    const a = window.__echoes.app;
    const f = a.focus();
    const sel = document.querySelector('[data-screen="settings"] [aria-selected="true"]');
    return { id: f && f.id, sel: sel && sel.id, ring: document.querySelectorAll('.ap-focus').length, stack: a.stack() };
  });
// The ring's stops: the selected tab, the tab body's visual ROWS (items whose
// centres share a band — same grouping as src/ui/menu/settings.js), Reset (if
// enabled), Back. rowOf maps every focusable id to its stop key.
const stops = (page) =>
  page.evaluate(() => {
    const scr = document.querySelector('[data-screen="settings"]');
    const shown = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
    const en = (n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true';
    const body = scr.querySelector('.ap-tabbody.ap-active');
    const bodies = scr.querySelectorAll('.ap-tabbody.ap-active').length;
    const items = body ? [...body.querySelectorAll('[data-nav]')].filter((n) => shown(n) && en(n)) : [];
    const recs = items
      .map((n) => { const r = n.getBoundingClientRect(); return { id: n.id, top: r.top, bottom: r.bottom, cy: r.top + r.height / 2, left: r.left, text: n.tagName === 'INPUT' && n.type === 'text' }; })
      .sort((a, b) => a.cy - b.cy || a.left - b.left);
    const rows = [];
    for (const it of recs) {
      const row = rows[rows.length - 1];
      if (row && it.cy >= row.top && it.cy <= row.bottom) row.items.push(it);
      else rows.push({ top: it.top, bottom: it.bottom, items: [it] });
    }
    for (const row of rows) row.items.sort((a, b) => a.left - b.left);
    const foot = [...scr.querySelectorAll('.ap-set-foot [data-nav]')].filter((n) => shown(n) && en(n)).map((n) => n.id);
    const sel = scr.querySelector('[aria-selected="true"]');
    const rowOf = {};
    rowOf[sel.id] = 'tab';
    rows.forEach((r, i) => r.items.forEach((it) => (rowOf[it.id] = 'r' + i)));
    for (const f of foot) rowOf[f] = f;
    return { rows: rows.map((r) => r.items.map((it) => it.id)), textRows: rows.map((r) => r.items.some((it) => it.text)), foot, tab: sel && sel.id, rowOf, bodies };
  });

async function press(page, how) {
  if (how.pad !== undefined) await padTap(page, how.pad);
  else {
    if (how.shift) await page.keyboard.down('Shift');
    await page.keyboard.press(how.key);
    if (how.shift) await page.keyboard.up('Shift');
    await sleep(160);
  }
  return snap(page);
}

for (const [w, h] of SIZES) {
  const browser = await launch({ width: w, height: h, autoplay: true });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await installGamepad(page);
    const tabs = await page.evaluate(() => {
      window.__echoes.app.open('settings');
      return [...document.querySelectorAll('[data-screen="settings"] .ap-tab')].map((b) => b.id.replace('ap-tab-', ''));
    });
    await sleep(500);
    await page.keyboard.press('Escape');
    await sleep(500);
    log(`${w}x${h} tabs`, tabs);
    for (const tab of tabs.filter((t) => !process.env.TABS || process.env.TABS.split(',').includes(t))) {
      for (const src of [
        { name: 'arrows', down: { key: 'ArrowDown' }, up: { key: 'ArrowUp' } },
        { name: 'tabkey', down: { key: 'Tab' }, up: { key: 'Tab', shift: true } },
        { name: 'dpad', down: { pad: 13 }, up: { pad: 12 } },
      ]) {
        await page.evaluate((t) => window.__echoes.app.open('settings', { tab: t }), tab);
        await sleep(450);
        const s0 = await snap(page);
        const st = await stops(page);
        const ring = ['tab', ...st.rows.map((_, i) => 'r' + i), ...st.foot];
        const n = ring.length;
        const key = (id) => (id && st.rowOf[id]) || (id && id.startsWith('ap-tab-') ? 'WRONG-TAB:' + id : 'other:' + id);
        const down = [s0.id];
        let ringOk = s0.ring === 1;
        let selOk = s0.sel === `ap-tab-${tab}`;
        for (let i = 0; i < n + 2; i++) {
          const s = await press(page, src.down);
          down.push(s.id);
          ringOk = ringOk && s.ring === 1;
          selOk = selOk && s.sel === `ap-tab-${tab}`;
        }
        const up = [down[down.length - 1]];
        for (let i = 0; i < n + 2; i++) {
          const s = await press(page, src.up);
          up.push(s.id);
          ringOk = ringOk && s.ring === 1;
          selOk = selOk && s.sel === `ap-tab-${tab}`;
        }
        const wrongTab = [...down, ...up].filter((id) => id && id.startsWith('ap-tab-') && id !== `ap-tab-${tab}`);
        const dk = down.map(key);
        const uk = up.map(key);
        // one full Down cycle from the start visits every stop once and comes home
        const cycle = dk.slice(0, n + 1);
        const visitedAll = ring.every((k) => cycle.includes(k)) && new Set(cycle.slice(0, n)).size === n && cycle[n] === cycle[0];
        // each Down step moves to the NEXT stop of the ring (no skip)
        const stepOk = dk.every((k, i) => i === 0 || ring.indexOf(k) === (ring.indexOf(dk[i - 1]) + 1) % n);
        // Up retraces the stops backwards
        const rk = [...dk].reverse();
        const reverseOk = uk.every((k, i) => k === rk[i]);
        check(`${w}x${h} ${tab} ${src.name} ring`, wrongTab.length === 0 && visitedAll && stepOk && reverseOk && ringOk && selOk && st.bodies === 1, {
          ring,
          rows: st.rows,
          start: s0.id,
          down,
          up,
          wrongTab,
          visitedAll,
          stepOk,
          reverseOk,
          ringOk,
          selOk,
          bodiesShown: st.bodies,
        });
        // Left / Right inside every multi-item row (not a text field's row,
        // where ←→ move the caret): every item of the row is reachable.
        if (src.name === 'arrows') {
          for (let ri = 0; ri < st.rows.length; ri++) {
            const row = st.rows[ri];
            if (row.length < 2 || st.textRows[ri]) continue;
            await page.evaluate((id) => { const n = document.getElementById(id); window.__echoes.app.focus(); n.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 1, movementY: 1 })); }, row[0]);
            await sleep(120);
            const seen = [(await snap(page)).id];
            for (let k = 0; k < row.length + 1; k++) seen.push((await press(page, { key: 'ArrowRight' })).id);
            check(`${w}x${h} ${tab} row ${ri} Left/Right reach every item`, row.every((id) => seen.includes(id)), { row, seen });
          }
        }
        await page.keyboard.press('Escape');
        await sleep(450);
      }
    }
    // (f) hover an unselected tab with the mouse, then Down / Up
    await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'display' }));
    await sleep(450);
    const other = await page.evaluate(() => {
      const b = document.querySelector('#ap-tab-gameplay');
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(other.x - 20, other.y + 2, { steps: 3 });
    await page.mouse.move(other.x, other.y, { steps: 4 });
    await sleep(200);
    const hov = await snap(page);
    const afterDown = await press(page, { key: 'ArrowDown' });
    check(`${w}x${h} hovered unselected tab + Down -> selected tab's first row`, hov.id === 'ap-tab-gameplay' && afterDown.id === 'ap-display-renderScale' && afterDown.sel === 'ap-tab-display', { hov, afterDown });
    // (g) Enter on the ring's tab stop keeps the selected tab (and focus on it)
    await press(page, { key: 'ArrowUp' });
    const onTab = await snap(page);
    const afterEnter = await press(page, { key: 'Enter' });
    check(`${w}x${h} Enter on the ring's tab stop keeps Display`, onTab.id === 'ap-tab-display' && afterEnter.sel === 'ap-tab-display' && afterEnter.stack.join() === 'title,settings', { onTab, afterEnter });
    // Right on the tab stop switches tab and keeps the cursor on the (new) selected tab
    const afterRight = await press(page, { key: 'ArrowRight' });
    await sleep(300);
    const r2 = await snap(page);
    check(`${w}x${h} Right on the tab stop -> next tab selected + focused`, r2.id === r2.sel && r2.sel !== 'ap-tab-display', { afterRight, r2 });
    await page.screenshot({ path: `${CAP}/gntfixM13-ring-${w}.png` });
    check(`${w}x${h} page errors`, errors.length === 0, errors);
  } catch (e) {
    fails++;
    log('ERR', String((e && e.stack) || e));
  } finally {
    await browser.close();
  }
}
log('TOTAL FAILS', fails);
