// gntfixM35 — fix-M3-r5 AUD5-F1 own probe: every selection change on the build pages ticks (keyboard,
// mocked gamepad, pointer), nothing ticks without a player input, and the shop's keyboard card focus
// (PLAN §16.4 "buy — Enter on the focused card") works. Legs:
//   A swap offer by PAD (RB tab, d-pad right/left Take<->Leave, d-pad down Replaces, A take)
//   B socket screen (B opens it on the door page): arrows / Q-E / mouse over cells, Esc closes
//   C door picker by keyboard + pad
//   D shop by keyboard: D -> card 0 (hint "Enter buy this card"), Enter buys, A -> lamp, Enter advances
//   E pause menu mouse hover (screen manager pointer focus) -> ui_move source 'hover'
//   F no spurious ticks: combat keys, a page opening under held keys, idle frames
// Usage: node tools/gntfixM35-nav.mjs   (GNTFIXM35_BASE / GNTFIXM35_TAG as in gntfixM35-lib.mjs)
import { bootTap, out, sleep, shotPath } from './gntfixM35-lib.mjs';
const PAD = `(() => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'gntfixM35 mock pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
  navigator.getGamepads = () => { pad.timestamp = performance.now(); return [pad, null, null, null]; };
  window.__gfPress = (i, on) => { buttons[i].pressed = !!on; buttons[i].value = on ? 1 : 0; buttons[i].touched = !!on; };
  window.addEventListener('load', () => { try { const e = new Event('gamepadconnected'); e.gamepad = pad; window.dispatchEvent(e); } catch (x) {} });
})();`;
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.evaluateOnNewDocument(PAD);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const rows = [];
const fails = [];
const state = () => page.evaluate(() => {
  const E = window.__echoes; const r = E.state().run; const ru = E.runUi ? E.runUi() : null; const so = E.content && E.content.socketUi ? E.content.socketUi() : null;
  return { phase: r?.phase, room: r?.room, rep: r?.reward?.replace, pathFocus: r?.path?.focus, wallet: r?.shop?.wallet ?? r?.wallet, draft: ru?.draft ? { focus: ru.draft.focus, viewSeat: ru.draft.viewSeat, replace: ru.draft.replace } : null, shop: ru?.shop ? { viewSeat: ru.shop.viewSeat, focus: ru.shop.focus } : null, hintR: (() => { const hr = document.querySelector('#run-screen .rn-hint-r'); if (!hr) return null; const v = [...hr.children].find((c) => c.style.visibility !== 'hidden'); return (v || hr).textContent; })(), socket: so && so.open ? { seat: so.viewSeat, focus: so.focus } : null, stack: E.app.stack().join('>'), focusLabel: E.app.focus()?.label ?? null };
});
const act = async (leg, label, fn, { wait = 380, expect = null } = {}) => {
  await page.evaluate(() => { window.__echoes.audio.meterReset(); window.__gfCL = window.__echoes.audio.cueLog(600).length; });
  const before = await state();
  await fn(); await sleep(wait);
  const m = await page.evaluate(() => { const A = window.__echoes.audio; const ms = A.meters(); const cl = A.cueLog(600).slice(window.__gfCL); return { uiPk: ms.ui.peakDb, music: ms.music.rmsDb, ui: cl.filter((c) => c.bus === 'ui').map((c) => `${c.cue}:${c.source}${c.dropped ? '!' + c.dropped : ''}`).join(',') }; });
  const after = await state();
  const row = { leg, label, ...m, margin: m.uiPk > -150 ? +(m.uiPk - m.music).toFixed(2) : null, before, after };
  if (expect) { const bad = expect(row); if (bad) { row.fail = bad; fails.push(`${leg} ${label}: ${bad}`); } }
  rows.push(row);
  console.log(`${leg} ${label.padEnd(34)} ui=[${m.ui}] pk=${m.uiPk} margin=${row.margin}${row.fail ? '  FAIL ' + row.fail : ''}`);
  await sleep(150);
  return row;
};
const tick = (cue) => (r) => (r.ui.split(',').some((c) => c.startsWith(cue + ':')) && r.margin >= 3 ? null : `expected ${cue} >= +3 dB, got [${r.ui}] margin ${r.margin}`);
const silent = (r) => (r.ui === '' ? null : `expected no UI cue, got [${r.ui}]`);
const pad = async (b, hold = 90) => { await page.evaluate((b) => window.__gfPress(b, true), b); await sleep(hold); await page.evaluate((b) => window.__gfPress(b, false), b); };

// F (part 1): combat keys never tick.
await act('F', 'combat: WASD + 1 while fighting', async () => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) { await page.keyboard.down(k); await sleep(60); await page.keyboard.up(k); } }, { expect: (r) => (r.ui.includes('ui_move') || r.ui.includes('ui_tab') ? `combat key ticked [${r.ui}]` : null) });

// A — swap offer by pad (and the page opening under a held key never ticks).
await page.evaluate(() => { const E = window.__echoes; E.cmd('giveSkill', 'nova_bloom'); E.cmd('giveSkill', 'sanctuary'); });
await page.keyboard.down('KeyD');
await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
await page.waitForFunction(() => !!window.__echoes.state().run?.reward, { timeout: 20000 });
await act('F', 'reward page opens under a held D', async () => { await sleep(200); await page.keyboard.up('KeyD'); }, { wait: 900, expect: (r) => (/ui_move|ui_tab/.test(r.ui) ? `opening ticked [${r.ui}]` : null) });
await act('A', 'pad RB (next character)', () => pad(B.RB), { expect: tick('ui_tab') });
await act('A', 'pad LB (back to Healer)', () => pad(B.LB), { expect: tick('ui_tab') });
const f0 = (await state()).draft.focus;
await act('A', f0 === 1 ? 'pad d-pad left (Take)' : 'pad d-pad right (Leave)', () => pad(f0 === 1 ? B.LEFT : B.RIGHT), { expect: tick('ui_move') });
await act('A', 'pad same direction again (edge)', () => pad(f0 === 1 ? B.LEFT : B.RIGHT), { expect: silent });
await act('A', f0 === 1 ? 'pad d-pad right (Leave)' : 'pad d-pad left (Take)', () => pad(f0 === 1 ? B.RIGHT : B.LEFT), { expect: tick('ui_move') });
await act('A', 'pad d-pad down (Replaces)', () => pad(B.DOWN), { expect: tick('ui_move') });
await act('F', 'idle 1 s on the page', async () => sleep(600), { expect: silent });
await page.screenshot({ path: shotPath('nav-swap') });
await act('A', 'pad A (Take)', () => pad(B.A), { wait: 1200, expect: (r) => (r.ui.includes('draft_take') ? null : `expected draft_take, got [${r.ui}]`) });
// A take with released nodes may chain into the socket screen; close it.
const s0 = await state();
if (s0.socket) await page.keyboard.press('Escape'), await sleep(600);

// C — door picker by keyboard, then the pad.
await page.waitForFunction(() => window.__echoes.state().run?.phase === 'path', { timeout: 20000 });
await sleep(500);
await act('C', 'doors: D', () => page.keyboard.press('KeyD'), { expect: tick('ui_move') });
await act('C', 'doors: D again (already right)', () => page.keyboard.press('KeyD'), { expect: silent });
await act('C', 'doors: A', () => page.keyboard.press('KeyA'), { expect: tick('ui_move') });
await act('C', 'doors: mouse onto the right door', async () => { const b = await page.evaluate(() => { const d = document.querySelectorAll('#run-screen .rn-doorwrap')[1].getBoundingClientRect(); return [d.x + d.width / 2, d.y + d.height / 2]; }); await page.mouse.move(b[0], b[1], { steps: 3 }); }, { expect: tick('ui_move') });
await act('C', 'doors: mouse still on it', async () => { const b = await page.evaluate(() => { const d = document.querySelectorAll('#run-screen .rn-doorwrap')[1].getBoundingClientRect(); return [d.x + d.width / 2 + 6, d.y + d.height / 2 + 6]; }); await page.mouse.move(b[0], b[1]); }, { expect: silent });
await act('C', 'doors: pad d-pad left', () => pad(B.LEFT), { expect: (r) => tick('ui_move')(r) || (r.after.pathFocus === 0 ? null : 'pad did not move the door focus') });
await act('C', 'doors: pad d-pad right', () => pad(B.RIGHT), { expect: (r) => tick('ui_move')(r) || (r.after.pathFocus === 1 ? null : 'pad did not move the door focus') });

// B — socket screen from the door page.
await act('B', 'socket: B opens it', () => page.keyboard.press('KeyB'), { wait: 700, expect: (r) => (/ui_move|ui_tab/.test(r.ui) ? `opening ticked [${r.ui}]` : null) });
const so = await state();
if (so.socket) {
  await act('B', 'socket: ArrowRight', () => page.keyboard.press('ArrowRight'), { expect: tick('ui_move') });
  await act('B', 'socket: ArrowUp (bench -> sockets)', () => page.keyboard.press('ArrowUp'), { expect: tick('ui_move') });
  await act('B', 'socket: E (next character)', () => page.keyboard.press('KeyE'), { expect: tick('ui_tab') });
  await act('B', 'socket: Q (back)', () => page.keyboard.press('KeyQ'), { expect: tick('ui_tab') });
  await act('B', 'socket: pad d-pad right', () => pad(B.RIGHT), { expect: tick('ui_move') });
  await act('B', 'socket: mouse over another cell', async () => { const b = await page.evaluate(() => { const c = [...document.querySelectorAll('.nd-cell')].filter((x) => x.offsetParent)[5].getBoundingClientRect(); return [c.x + c.width / 2, c.y + c.height / 2]; }); await page.mouse.move(b[0], b[1], { steps: 3 }); }, { expect: tick('ui_move') });
  await page.screenshot({ path: shotPath('nav-socket') });
  await act('B', 'socket: Esc closes', () => page.keyboard.press('Escape'), { wait: 600, expect: (r) => (/ui_move|ui_tab/.test(r.ui) ? `closing ticked [${r.ui}]` : null) });
} else fails.push('B socket screen did not open with B on the door page');

// D — shop by keyboard.
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
await page.waitForFunction(() => window.__echoes.state().run?.phase === 'shop', { timeout: 30000 });
await sleep(1500);
await page.screenshot({ path: shotPath('nav-shop0') });
await act('D', 'shop: D (card 0)', () => page.keyboard.press('KeyD'), { expect: (r) => tick('ui_move')(r) || (r.after.shop && r.after.shop.focus === 0 && /buy/.test(r.after.hintR || '') ? null : `focus/hint wrong ${JSON.stringify(r.after.shop)} "${r.after.hintR}"`) });
await act('D', 'shop: ArrowRight (card 1)', () => page.keyboard.press('ArrowRight'), { expect: tick('ui_move') });
await page.screenshot({ path: shotPath('nav-shop1') });
await act('D', 'shop: Enter buys card 1', () => page.keyboard.press('Enter'), { wait: 900, expect: (r) => (r.ui.includes('purchase') && r.after.phase === 'shop' ? null : `expected purchase on the shelf, got [${r.ui}] phase ${r.after.phase}`) });
await act('D', 'shop: A (card 0)', () => page.keyboard.press('KeyA'), { expect: tick('ui_move') });
await act('D', 'shop: A (lamp)', () => page.keyboard.press('KeyA'), { expect: (r) => tick('ui_move')(r) || (r.after.shop && r.after.shop.focus === -1 && /advance/.test(r.after.hintR || '') ? null : `lamp focus/hint wrong ${JSON.stringify(r.after.shop)} "${r.after.hintR}"`) });
await act('D', 'shop: A at the lamp (edge)', () => page.keyboard.press('KeyA'), { expect: silent });
await act('D', 'shop: mouse hover card 2', async () => { const b = await page.evaluate(() => { const c = [...document.querySelectorAll('#run-screen .rn-shop .rn-card')][2].getBoundingClientRect(); return [c.x + c.width / 2, c.y + c.height / 2]; }); await page.mouse.move(b[0], b[1], { steps: 3 }); }, { expect: tick('ui_move') });
await act('D', 'shop: Enter on the lamp advances', () => page.keyboard.press('Enter'), { wait: 2500, expect: (r) => (r.after.phase !== 'shop' ? null : `still in the shop (phase ${r.after.phase})`) });

// E — pause menu mouse hover.
await sleep(1500);
await page.keyboard.press('Escape');
await sleep(800);
const items = await page.evaluate(() => [...document.querySelectorAll('[data-nav]')].filter((n) => n.offsetParent).slice(0, 3).map((n) => { const r = n.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, (n.textContent || '').trim().slice(0, 20)]; }));
if (items.length >= 2) {
  await page.mouse.move(items[0][0], items[0][1]);
  await sleep(300);
  await act('E', `pause: mouse onto "${items[1][2]}"`, () => page.mouse.move(items[1][0], items[1][1], { steps: 4 }), { expect: (r) => (r.ui.includes('ui_move:hover') ? null : `expected ui_move:hover, got [${r.ui}]`) });
  await act('E', 'pause: mouse still', () => sleep(200), { expect: silent });
} else fails.push('E pause menu items not found');
await page.keyboard.press('Escape');
await sleep(500);
const res = { rows, fails, errors };
console.log(out('nav', res));
console.log(fails.length ? `FAILS ${fails.length}:\n  ${fails.join('\n  ')}` : 'ALL PASS', 'errors', errors.length);
await browser.close();
