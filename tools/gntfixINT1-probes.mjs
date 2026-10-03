#!/usr/bin/env node
// Journey critic follow-up probes (gauntlet r1): the items the first journey pass could not settle.
//   node tools/gntfixINT1-probes.mjs [--url http://127.0.0.1:5199] [--tag dev]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const outPath = arg('out', `captures/gntfixINT1-probes-${tag}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(root, 'captures'), { recursive: true });
const checks = []; let failures = 0;
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`); }
const shot = async (page, name) => { await page.screenshot({ path: join(root, 'captures', `${name}.png`) }); console.log(`[SHOT] ${name}.png`); };
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
const appState = (page) => page.evaluate(() => ({ state: window.__echoes.app.state, mode: window.__echoes.app.mode, stack: window.__echoes.app.stack(), focus: (window.__echoes.app.focus() || {}).id ?? null, rings: window.__echoes.app.ringCount(), simPaused: window.__echoes.app.simPaused(), tick: window.__echoes.tick }));
async function press(page, key, times = 1, gap = 110) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function waitFor(page, fnBody, { timeout = 20000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${fnBody})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
const runView = (page) => page.evaluate(() => { const s = window.__echoes.state(); const r = s.run; const p = s.party && s.party[0]; return { active: r.active, room: r.room, phase: r.phase, wallet: r.wallet, skills: (s.skills || []).map((k) => k && k.id), hp: p && p.hp, tick: window.__echoes.tick, seed: window.__echoes.seed, hash: window.__echoes.save.hash() }; });
const slots = (page) => page.evaluate(() => window.__echoes.save.list().map((x) => ({ id: x.id, mode: x.meta && x.meta.mode, room: x.meta && x.meta.room, phase: x.meta && x.meta.phase, tick: x.meta && x.meta.tick, savedAt: x.meta && (x.meta.savedAt || x.savedAt || x.at) })));
const hitTest = (page, screen) => page.evaluate((screen) => { const els = [...document.querySelectorAll(`[data-screen="${screen}"] [data-nav]`)].filter((b) => b.getBoundingClientRect().width > 0); const out = []; for (const el of els.slice(0, 6)) { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); out.push({ id: el.id, hit: hit ? ((hit.closest('[data-nav]') || hit).id || String(hit.className).slice(0, 30)) : null, ok: !!(hit && (hit === el || el.contains(hit))) }); } const ringEls = [...document.querySelectorAll('.ap-focus, [data-focused="true"], .ap-nav-focus, .focused')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.id || e.className); return { n: els.length, out, blocked: out.filter((o) => !o.ok).length, ringEls, ringCount: window.__echoes.app.ringCount() }; }, screen);
async function steerToPortal(page) { for (let i = 0; i < 30; i++) { const cs = await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { p: c.player, portal: c.portal, inPortal: c.inPortal }; }); if (cs.inPortal) return true; const dx = cs.portal.x - cs.p.x, dz = cs.portal.z + 0.55 - cs.p.z; const keys = []; if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break; const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000)); for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(160); } return page.evaluate(() => window.__echoes.cmd('campState').inPortal); }

const browser = await launchEchoes({ gpu: true, background: true });
const result = { schema: 'gntfixINT1-probes/1', at: new Date().toISOString(), base, tag };
try {
  const t0 = Date.now();
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1`);
  await waitFor(page, `(window.__echoes.app.focus()||{}).label==='Press any key or click'`, { timeout: 40000 });
  const bootMs = Date.now() - t0;
  // P1 first gesture: long tasks + unlock timing measured by rAF-independent means (longtask observer).
  await page.evaluate(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__lt.push({ err: String(e) }); } window.__k0 = null; window.addEventListener('keydown', () => { if (window.__k0 === null) window.__k0 = performance.now(); }, true); });
  await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 15000 }); await sleep(1500);
  const lt = await page.evaluate(() => ({ k0: window.__k0 && Math.round(window.__k0), tasks: window.__lt.filter((t) => t.start >= (window.__k0 || 0) - 50 && t.start < (window.__k0 || 0) + 2000), audio: window.__echoes.audio.state }));
  check('P1 first gesture (unlock + title open) causes no long task > 100 ms', lt.tasks.length === 0 || Math.max(...lt.tasks.map((t) => t.ms || 0)) <= 100, { bootMs, ...lt });
  // P2 mouse: stepped hover then click confirms.
  const r = await page.evaluate(() => { const e = document.getElementById('ap-title-settings').getBoundingClientRect(); return { x: e.x + e.width / 2, y: e.y + e.height / 2 }; });
  await page.mouse.move(r.x - 300, r.y + 200); await sleep(100); await page.mouse.move(r.x, r.y, { steps: 12 }); await sleep(300);
  const hov = { focus: await focusOf(page), rings: await page.evaluate(() => window.__echoes.app.ringCount()), lastSource: await page.evaluate(() => window.__echoes.app.lastSource) };
  await page.mouse.click(r.x, r.y); await sleep(500);
  const clicked = await appState(page);
  check('P2 mouse hover (stepped) moves the highlight and a click confirms the item', hov.focus === 'ap-title-settings' && hov.rings === 1 && clicked.stack.includes('settings'), { hov, clicked });
  const backRect = await page.evaluate(() => { const e = document.getElementById('ap-settings-back'); const b = e && e.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; });
  if (backRect) await page.mouse.click(backRect.x, backRect.y); else await press(page, 'Escape');
  await sleep(400);
  check('P2b mouse Back leaves settings', (await appState(page)).stack.join() === 'title');
  // P3 right-click on a menu = back (PLAN §3.3): open Settings by key, right-click.
  await navTo(page, 'ap-title-settings'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('settings')`);
  await page.mouse.click(800, 450, { button: 'right' }); await sleep(400);
  check('P3 right-click in a menu goes back one level', (await appState(page)).stack.join() === 'title', await appState(page));
  // P4 New Game → controllable: hold W for 1.5 s immediately after the press.
  await navTo(page, 'ap-title-new');
  await page.evaluate(() => { window.__ng = { t0: performance.now(), playingAt: null, movedAt: null, x0: null, z0: null }; const poll = () => { const E = window.__echoes; const g = window.__ng; if (g.playingAt === null && E.app.state === 'playing') { g.playingAt = performance.now() - g.t0; const p = E.state().party[0]; g.x0 = p.x; g.z0 = p.z; } if (g.playingAt !== null && g.movedAt === null) { const p = E.state().party[0]; if (Math.abs(p.x - g.x0) > 1e-4 || Math.abs(p.z - g.z0) > 1e-4) g.movedAt = performance.now() - g.t0; } if (g.movedAt === null && performance.now() - g.t0 < 6000) setTimeout(poll, 4); }; poll(); });
  await page.keyboard.press('Enter'); await page.keyboard.down('w'); await sleep(1500); await page.keyboard.up('w'); await sleep(200);
  const ng = await page.evaluate(() => window.__ng);
  check('P4 New Game → player moves within 1.0 s of the press with W held', ng.movedAt !== null && ng.movedAt <= 1000, { playingAt: ng.playingAt && Math.round(ng.playingAt), movedAt: ng.movedAt && Math.round(ng.movedAt) });
  await shot(page, `gntfixINT1-${tag}-P4-newgame`);
  // P5 camp → portal → room 1, then pause → Save & Quit → title focus + slots.
  const atPortal = await steerToPortal(page); await press(page, 'e');
  const r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===1})()`, { timeout: 20000 });
  check('P5 portal → room 1 by real input', atPortal && r1 >= 0);
  await sleep(1500);
  const before = await runView(page);
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  check('P6 Save & Quit to Title offered on the pause menu', await navTo(page, 'pz-savequit'));
  const slots0 = await slots(page);
  await press(page, 'Enter');
  for (let i = 0; i < 2; i++) { await sleep(300); const st = await appState(page); if (st.stack.includes('confirm')) { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter'); } }
  const titleT = await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 }); await sleep(600);
  const st1 = await appState(page); const slots1 = await slots(page);
  check('P7 Save & Quit → a slot was written and the title is reached', titleT >= 0 && slots1.length > slots0.length, { slots0, slots1 });
  check('P8 after Save & Quit the title focuses Continue (Enter resumes the saved run)', st1.focus === 'ap-title-continue', { focus: st1.focus });
  await shot(page, `gntfixINT1-${tag}-P8-title-after-savequit`);
  // P9 Continue → same state.
  await navTo(page, 'ap-title-continue'); await press(page, 'Enter');
  const contT = await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.state().run.active`, { timeout: 20000 }); await sleep(300);
  const after = await runView(page);
  check('P9 Continue restores the same room, phase, wallet, build, seed and HP', contT >= 0 && after.room === before.room && after.phase === before.phase && after.wallet === before.wallet && JSON.stringify(after.skills) === JSON.stringify(before.skills) && after.seed === before.seed && after.hp === before.hp, { before, after });
  // P10 pause → Load Game hit test (overlay issue from the save side) + Esc back.
  await sleep(500); await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  await navTo(page, 'pz-load'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(400);
  const ht = await hitTest(page, 'saves');
  const slotDom = await page.evaluate(() => [...document.querySelectorAll('[data-screen="saves"] [data-nav]')].filter((b) => b.getBoundingClientRect().width > 0 && /slot|auto|quick/i.test(b.id)).map((b) => ({ id: b.id, text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160) })));
  check('P10 Load Game from pause: every visible slot is hit-testable (not under the pause plate)', ht.blocked === 0, ht);
  check('P11 a filled slot shows date/time, playtime and location in its DOM text', slotDom.some((s) => /room|act|camp/i.test(s.text) && /\d{1,2}:\d{2}|\d+\s*(s|m|min|h)\b/i.test(s.text)), slotDom.slice(0, 4));
  await shot(page, `gntfixINT1-${tag}-P10-load-from-pause`);
  await press(page, 'Escape'); await sleep(300);
  // P12 pause → Settings → Audio tab explicitly → change → Esc → pause → Resume.
  await navTo(page, 'pz-settings'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('settings')`); await sleep(200);
  let tabName = await page.evaluate(() => document.querySelector('.ap-tab.ap-active')?.textContent?.trim());
  for (let i = 0; i < 5 && tabName !== 'Audio'; i++) { await press(page, 'PageDown'); await sleep(200); tabName = await page.evaluate(() => document.querySelector('.ap-tab.ap-active')?.textContent?.trim()); }
  const lvl0 = await page.evaluate(() => window.__echoes.settings.get('audio.master.level'));
  const onRow = await navTo(page, 'au-master-level');
  await press(page, 'ArrowLeft', 2, 140); await sleep(200);
  const lvl1 = await page.evaluate(() => ({ level: window.__echoes.settings.get('audio.master.level'), gainDb: window.__echoes.audio.buses().master.gainDb }));
  await press(page, 'Escape'); await sleep(400);
  const st2 = await appState(page);
  await press(page, 'Enter'); await sleep(400);
  const st3 = await appState(page);
  check('P12 pause → Settings(Audio) → change applies → Esc lands on pause (focus Settings) → Enter resumes', tabName === 'Audio' && onRow && Math.abs(lvl1.level - (lvl0 - 0.1)) < 1e-6 && st2.stack.join() === 'pause' && st2.focus === 'pz-settings' && st3.stack.length === 0 && !st3.simPaused, { tabName, lvl0, lvl1, st2, st3 });
  // P13 New Game over an existing save: confirm? and what happens to the slots.
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  await navTo(page, 'pz-quit'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('confirm')`); await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 }); await sleep(500);
  const slotsB = await slots(page);
  await navTo(page, 'ap-title-new'); await press(page, 'Enter'); await sleep(600);
  const ngState = await appState(page);
  const confirmText = ngState.stack.includes('confirm') ? await page.evaluate(() => ((document.querySelector('[data-screen="confirm"]') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)) : null;
  if (ngState.stack.includes('confirm')) { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter'); }
  await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 20000 }); await sleep(1500);
  const slotsC = await slots(page);
  const lost = slotsB.filter((s) => !slotsC.some((t) => t.id === s.id && t.tick === s.tick));
  check('P13 New Game with an existing save never silently destroys it (either a confirm, or the slots stay loadable)', !!confirmText || lost.length === 0, { confirmText, slotsB, slotsC, lost });
  await shot(page, `gntfixINT1-${tag}-P13-newgame-over-save`);
  // P14 Continue after New Game: does the title still offer the old run? (walk to portal and past room 1 → autosave, then check)
  const atP = await steerToPortal(page); await press(page, 'e'); await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===1})()`, { timeout: 20000 }); await sleep(2500);
  const slotsD = await slots(page);
  const lost2 = slotsB.filter((s) => !slotsD.some((t) => t.id === s.id && t.tick === s.tick));
  check('P14 after the new run reaches room 1 (autosave point), the earlier run is still in a slot or the game said so', lost2.length === 0 || !!confirmText, { atP, slotsB, slotsD, lost2 });
  check('Z 0 page errors', errors.length === 0, errors.slice(0, 5));
} catch (e) { console.error('[HARNESS-ERROR]', (e && e.stack) || e); result.harnessError = String((e && e.message) || e); failures += 1; }
finally { await browser.close(); }
result.failures = failures; result.checks = checks;
writeFileSync(join(root, outPath), JSON.stringify(result, null, 1));
console.log(`\n${checks.length - failures}/${checks.length} checks passed -> ${outPath}`);
process.exit(result.harnessError ? 1 : 0);
