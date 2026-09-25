#!/usr/bin/env node
// Refuter (journey r1, J1-pause-save-overlay) — standalone reproduction of
// "Save/Load from the pause menu is drawn under the pause plate and hit-blocked".
// Runs ALONE (one browser, one page), varies url / viewport / settle, and adds
// control conditions: pause items themselves, Settings-from-pause, saves from the
// camp pause, saves from the title. Real mouse clicks measure the player-facing
// consequence (does a click on a slot save? does Back close the screen?).
//   node tools/gntfixINT1-pausesave.mjs [--url U] [--tag T] [--w 1600] [--h 900] [--settle 400]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const W = parseInt(arg('w', '1600'), 10), H = parseInt(arg('h', '900'), 10);
const settle = parseInt(arg('settle', '400'), 10);
const outPath = `captures/gntfixINT1-pausesave-${tag}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(root, 'captures'), { recursive: true });
const checks = []; let failures = 0;
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`); }
const shot = async (page, name) => { await page.screenshot({ path: join(root, 'captures', `${name}.png`) }); console.log(`[SHOT] ${name}.png`); };
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
const appState = (page) => page.evaluate(() => ({ state: window.__echoes.app.state, mode: window.__echoes.app.mode, stack: window.__echoes.app.stack(), focus: (window.__echoes.app.focus() || {}).id ?? null, rings: window.__echoes.app.ringCount(), simPaused: window.__echoes.app.simPaused(), tick: window.__echoes.tick, saves: window.__echoes.save ? window.__echoes.save.list().length : null }));
async function press(page, key, times = 1, gap = 110) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function waitFor(page, fnBody, { timeout = 20000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${fnBody})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
// Hit test EVERY visible [data-nav] of a screen (the critic tested the first 6).
const hitTest = (page, screen) => page.evaluate((screen) => {
  const els = [...document.querySelectorAll(`[data-screen="${screen}"] [data-nav]`)].filter((b) => b.getBoundingClientRect().width > 0);
  const out = [];
  for (const el of els) { const r = el.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const hit = document.elementFromPoint(x, y); const stackAt = document.elementsFromPoint(x, y).slice(0, 6).map((e) => e.id || String(e.className).split(' ')[0] || e.tagName); out.push({ id: el.id, cx: Math.round(x), cy: Math.round(y), hit: hit ? ((hit.closest('[data-nav]') || hit).id || String(hit.className).slice(0, 30)) : null, ok: !!(hit && (hit === el || el.contains(hit))), stackAt }); }
  return { n: els.length, blocked: out.filter((o) => !o.ok).length, out, ringCount: window.__echoes.app.ringCount() };
}, screen);
// Computed layer facts for the pause root and the saves/settings root — DOM state of the running game.
const layerInfo = (page, other) => page.evaluate((other) => {
  const chain = (el) => { const c = []; let n = el; while (n && n !== document.body) { const cs = getComputedStyle(n); c.push({ tag: n.tagName.toLowerCase(), id: n.id || undefined, cls: String(n.className).slice(0, 50), z: cs.zIndex, pos: cs.position, op: cs.opacity, vis: cs.visibility, disp: cs.display, pe: cs.pointerEvents }); n = n.parentElement; } return c; };
  const p = document.querySelector('[data-screen="pause"]') || document.querySelector('.pz-pause');
  const o = document.querySelector(`[data-screen="${other}"]`);
  const order = p && o ? (p.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING ? `${other} AFTER pause in DOM` : `${other} BEFORE pause in DOM`) : 'missing';
  const sameParent = p && o && p.parentElement === o.parentElement;
  return { pause: p ? chain(p) : null, other: o ? chain(o) : null, order, sameParent, pauseRect: p && (() => { const r = p.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() };
}, other);
const toastText = (page) => page.evaluate(() => { const m = (document.body.innerText || '').match(/(Saved to[^\n]*|Quicksaved[^\n]*|Loaded[^\n]*)/); return m ? m[1] : null; });
async function steerToPortal(page) { for (let i = 0; i < 30; i++) { const cs = await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { p: c.player, portal: c.portal, inPortal: c.inPortal }; }); if (cs.inPortal) return true; const dx = cs.portal.x - cs.p.x, dz = cs.portal.z + 0.55 - cs.p.z; const keys = []; if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break; const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000)); for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(160); } return page.evaluate(() => window.__echoes.cmd('campState').inPortal); }
const centre = (page, id) => page.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }, id);

const browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });
const result = { schema: 'gntfixINT1-pausesave/1', at: new Date().toISOString(), base, tag, viewport: [W, H], settle, chrome: await browser.version() };
let errors = [], consoleLines = [];
try {
  const t0 = Date.now();
  const opened = await openEchoes(browser, `${base}/?fresh=1`, { width: W, height: H });
  const page = opened.page; errors = opened.errors; consoleLines = opened.consoleLines;
  await waitFor(page, `(window.__echoes.app.focus()||{}).label==='Press any key or click'`, { timeout: 60000 });
  result.bootMs = Date.now() - t0;
  result.version = await page.evaluate(() => window.__echoes.version);
  await press(page, 'Enter');
  check('R0 boot → title', (await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 15000 })) >= 0, await appState(page));
  await sleep(800);
  // New Game → camp.
  await navTo(page, 'ap-title-new'); await press(page, 'Enter');
  check('R1 New Game → playing(camp)', (await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 15000 })) >= 0, await appState(page));
  await sleep(1500);
  // ---- Condition A: CAMP pause → Save Game.
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`); await sleep(300);
  const pauseHt = await hitTest(page, 'pause');
  check('A0 pause items themselves are hit-testable (control)', pauseHt.blocked === 0, { n: pauseHt.n, blocked: pauseHt.blocked });
  await navTo(page, 'pz-save'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(settle);
  const aSt = await appState(page); const aHt = await hitTest(page, 'saves'); const aLayer = await layerInfo(page, 'saves');
  check('A1 camp pause → Save Game: every visible saves item hit-testable', aHt.blocked === 0, { stack: aSt.stack, focus: aSt.focus, n: aHt.n, blocked: aHt.blocked, sample: aHt.out.slice(0, 4) });
  result.A_layer = aLayer; console.log('[A layer]', JSON.stringify(aLayer));
  await shot(page, `gntfixINT1-${tag}-A-camp-pause-save`);
  await press(page, 'Escape'); await sleep(300); await press(page, 'Escape'); await sleep(300);
  check('A2 Esc Esc → back in play', (await appState(page)).stack.length === 0, await appState(page));
  // ---- Condition B: RUN (combat room 1) pause → Save Game, exact reproduce steps.
  const atPortal = await steerToPortal(page); await press(page, 'e');
  const r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===1})()`, { timeout: 20000 });
  check('B0 portal → room 1 by real input', atPortal && r1 >= 0);
  await sleep(1500);
  const hmrBefore = consoleLines.filter((l) => /\[vite\]/.test(l)).length;
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`); await sleep(300);
  const tickAtPause = await page.evaluate(() => window.__echoes.tick);
  await navTo(page, 'pz-save'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(settle);
  const bSt = await appState(page); const bHt = await hitTest(page, 'saves'); const bLayer = await layerInfo(page, 'saves');
  result.B_state = bSt; result.B_hit = bHt; result.B_layer = bLayer;
  console.log('[B layer]', JSON.stringify(bLayer));
  check('B1 run pause → Save Game: stack is [pause, saves] and focus is a slot', bSt.stack.join() === 'pause,saves' && /sv-/.test(bSt.focus || ''), { stack: bSt.stack, focus: bSt.focus, rings: bSt.rings });
  check('B2 run pause → Save Game: every visible saves item hit-testable (critic P10/G2)', bHt.blocked === 0, { n: bHt.n, blocked: bHt.blocked, out: bHt.out.map((o) => `${o.id}@${o.cx},${o.cy}→${o.hit}`) });
  const pauseVisible = await page.evaluate(() => { const p = document.querySelector('[data-screen="pause"]') || document.querySelector('.pz-pause'); if (!p) return null; const cs = getComputedStyle(p); return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents, ariaHidden: p.getAttribute('aria-hidden'), inert: p.hasAttribute('inert'), cls: String(p.className) }; });
  check('B3 while saves is on top, the pause screen is hidden or inert (opacity 0 / display none / pointer-events none / inert)', pauseVisible && (pauseVisible.display === 'none' || pauseVisible.visibility === 'hidden' || +pauseVisible.opacity < 0.05 || pauseVisible.pointerEvents === 'none' || pauseVisible.inert), pauseVisible);
  await shot(page, `gntfixINT1-${tag}-B-run-pause-save`);
  // Real mouse on Slot 1 (hover then click) — the player-facing consequence.
  const s1 = await centre(page, 'sv-slot-manual-1');
  const savesBefore = (await appState(page)).saves;
  await page.mouse.move(s1.x - 250, s1.y + 150); await sleep(120); await page.mouse.move(s1.x, s1.y, { steps: 14 }); await sleep(350);
  const hoverFocus = await focusOf(page);
  await page.mouse.click(s1.x, s1.y); await sleep(900);
  const afterClick = await appState(page); const toast1 = await toastText(page);
  check('B4 mouse hover over Slot 1 focuses it (§3.3 hover focuses)', hoverFocus === 'sv-slot-manual-1', { hoverFocus, slotCentre: [Math.round(s1.x), Math.round(s1.y)] });
  check('B5 mouse click on Slot 1 saves (list grows) or opens a confirm', afterClick.saves > savesBefore || afterClick.stack.includes('confirm') || !!toast1, { savesBefore, savesAfter: afterClick.saves, stack: afterClick.stack, focus: afterClick.focus, toast: toast1 });
  await shot(page, `gntfixINT1-${tag}-B-after-slot1-click`);
  if (afterClick.stack.includes('confirm')) { await press(page, 'Escape'); await sleep(300); }
  // Real mouse on the saves Back button.
  const bk = await centre(page, 'sv-back');
  if (bk) { await page.mouse.move(bk.x, bk.y, { steps: 8 }); await sleep(200); await page.mouse.click(bk.x, bk.y); await sleep(600); }
  const afterBack = await appState(page);
  check('B6 mouse click on the saves Back button closes the saves screen (stack → [pause])', afterBack.stack.join() === 'pause', { stack: afterBack.stack, focus: afterBack.focus, backCentre: bk && [Math.round(bk.x), Math.round(bk.y)] });
  // Where does that click actually land? (what elementsFromPoint says at Slot 1 and at Back)
  result.B_pointAt = await page.evaluate((pts) => pts.map(([x, y]) => document.elementsFromPoint(x, y).slice(0, 5).map((e) => e.id || String(e.className).split(' ')[0] || e.tagName)), [[s1.x, s1.y], bk ? [bk.x, bk.y] : [0, 0]]);
  // Keyboard control: Esc back to pause if still on saves, then keyboard save via pz-save → Enter → Enter.
  if (afterBack.stack.includes('saves')) { await press(page, 'Escape'); await sleep(300); }
  const kb0 = (await appState(page)).saves;
  await navTo(page, 'pz-save'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(settle);
  await navTo(page, 'sv-slot-manual-2', 12); await press(page, 'Enter'); await sleep(1200);
  const kb1 = await appState(page); const toastK = await toastText(page);
  check('B7 keyboard save (Enter on Slot 2) writes a save (control: the save engine works, the layer is the issue)', kb1.saves > kb0 || !!toastK, { before: kb0, after: kb1.saves, toast: toastK, stack: kb1.stack });
  await shot(page, `gntfixINT1-${tag}-B-after-kb-save`);
  // Back to pause.
  for (let i = 0; i < 3 && (await appState(page)).stack.includes('saves'); i++) { await press(page, 'Escape'); await sleep(300); }
  // ---- Condition C: pause → Settings (control: does the pause plate hide under Settings?).
  await navTo(page, 'pz-settings'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('settings')`); await sleep(settle);
  const cHt = await hitTest(page, 'settings'); const cLayer = await layerInfo(page, 'settings'); result.C_layer = cLayer; console.log('[C layer]', JSON.stringify(cLayer));
  const cPause = await page.evaluate(() => { const p = document.querySelector('[data-screen="pause"]') || document.querySelector('.pz-pause'); const cs = p && getComputedStyle(p); return cs && { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents, cls: String(p.className) }; });
  check('C1 pause → Settings: every visible settings item hit-testable (control)', cHt.blocked === 0, { n: cHt.n, blocked: cHt.blocked, sample: cHt.out.slice(0, 3).map((o) => `${o.id}→${o.hit}`), pauseUnderneath: cPause });
  await shot(page, `gntfixINT1-${tag}-C-pause-settings`);
  await press(page, 'Escape'); await sleep(300);
  // ---- Condition D: pause → Load Game.
  await navTo(page, 'pz-load'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(settle);
  const dHt = await hitTest(page, 'saves');
  check('D1 run pause → Load Game: every visible saves item hit-testable (critic P10)', dHt.blocked === 0, { n: dHt.n, blocked: dHt.blocked, out: dHt.out.map((o) => `${o.id}→${o.hit}`) });
  await shot(page, `gntfixINT1-${tag}-D-run-pause-load`);
  // Real mouse: click the first slot in load mode → does a load happen (stack leaves saves / confirm)?
  const firstSlot = dHt.out.find((o) => /sv-slot-/.test(o.id));
  if (firstSlot) { await page.mouse.move(firstSlot.cx, firstSlot.cy, { steps: 10 }); await sleep(250); await page.mouse.click(firstSlot.cx, firstSlot.cy); await sleep(1200); }
  const dAfter = await appState(page);
  check('D2 mouse click on a load slot loads (stack leaves saves) or opens a confirm', !dAfter.stack.includes('saves') || dAfter.stack.includes('confirm'), { stack: dAfter.stack, focus: dAfter.focus, tickAtPause, tickNow: dAfter.tick });
  for (let i = 0; i < 4 && (await appState(page)).stack.length; i++) { await press(page, 'Escape'); await sleep(300); }
  // ---- Condition E: saves from the TITLE (control: no pause underneath).
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`); await sleep(200);
  await navTo(page, 'pz-quit'); await press(page, 'Enter'); await sleep(400);
  if ((await appState(page)).stack.includes('confirm')) { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter'); }
  check('E0 Quit to Title reached', (await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 15000 })) >= 0, await appState(page));
  await sleep(600);
  await navTo(page, 'ap-title-load'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(settle);
  const eHt = await hitTest(page, 'saves');
  check('E1 title → Load Game: every visible saves item hit-testable (control)', eHt.blocked === 0, { n: eHt.n, blocked: eHt.blocked, sample: eHt.out.slice(0, 3).map((o) => `${o.id}→${o.hit}`) });
  await shot(page, `gntfixINT1-${tag}-E-title-load`);
  // Harness-artifact facts.
  const hmrAfter = consoleLines.filter((l) => /\[vite\]/.test(l)).length;
  result.hmrLinesDuringRun = hmrAfter - hmrBefore; result.viteLines = consoleLines.filter((l) => /\[vite\]/.test(l)).slice(0, 10);
  result.pageErrors = errors; result.consoleErrors = consoleLines.filter((l) => /^\[error\]/.test(l) && !/X3595|X4000/.test(l)).slice(0, 10);
  check('Z0 zero page errors during the run', errors.length === 0, errors);
  check('Z1 no HMR / vite reload lines during the run (artifact check)', result.hmrLinesDuringRun === 0, result.viteLines);
} catch (e) {
  console.log('[HARNESS-ERROR]', (e && e.stack) || e); result.harnessError = String((e && e.message) || e); failures += 1;
} finally {
  result.checks = checks; result.failures = failures;
  writeFileSync(join(root, outPath), JSON.stringify(result, null, 1));
  console.log(`[DONE] ${checks.length - failures}/${checks.length} → ${outPath}`);
  await browser.close();
}
