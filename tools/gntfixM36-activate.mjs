// gntfixM36 — fix-M3-r6 AUD6-F1 acceptance probe: an app-menu item sounds the SAME whatever activates it.
// For every item the pointer first hovers it (settled 450 ms, which also moves the focus ring onto it), then it
// is activated by ONE device — a mouse press/release, Enter, or the A button of a mocked standard pad — in its own
// fresh browser per device, along the same title -> Settings -> Audio / Display -> Back -> New Game and the in-run
// pause -> Settings -> Back -> Quit to Lobby -> Keep Playing -> Resume paths. The activation cue = the UI-bus cues
// requested in the 450 ms after the press (hover ticks excluded), with the UI-tap peak.
// PASS per item: mouse cues == Enter cues == pad cues == the expected role cue, peak >= -24 dBFS.
// Pointer-only legs (mouse browser): a natively disabled item (title Load Game on a fresh profile) -> ui_deny and no
// screen change; a slider-track click / a Display select ‹ › step / right-click keep their own cue (ui_slider,
// ui_slider, ui_back) and never add ui_confirm; a press that slides off the item before release plays nothing and
// activates nothing; a touch tap = the click cue with no extra hover tick; a splash-dismissing click (no autoplay
// flag) never sounds or activates a title item. Usage: node tools/gntfixM36-activate.mjs [tag]
import { launchEchoes } from './gnt-arch-browser.mjs';
import { TAP_SCRIPT, BASE, sleep } from './gntfixM36-lib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const TAG = process.argv[2] || process.env.GNTFIXM36_TAG || 'run';
mkdirSync('captures/gntfixM36', { recursive: true });
const PAD = `(() => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'gntfixM36 mock pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
  navigator.getGamepads = () => { pad.timestamp = performance.now(); return [pad, null, null, null]; };
  window.__gfPress = (i, on) => { buttons[i].pressed = !!on; buttons[i].value = on ? 1 : 0; buttons[i].touched = !!on; };
  window.addEventListener('load', () => { try { const e = new Event('gamepadconnected'); e.gamepad = pad; window.dispatchEvent(e); } catch (x) {} });
})();`;

async function boot(params, { autoplay = true, pad = false } = {}) {
  const browser = await launchEchoes({ gpu: true, autoplay, width: 1600, height: 900 });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(TAP_SCRIPT);
  if (pad) await page.evaluateOnNewDocument(PAD);
  await page.goto(BASE + '?' + params, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  return { browser, page, errors };
}
const mark = (page) => page.evaluate(() => { window.__gfm = new Set(window.__echoes.audio.cueLog(600).map((c) => c.t + '|' + c.cue + '|' + c.voice)); window.__echoes.audio.meterReset(); });
const fresh = (page) => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((c) => !window.__gfm.has(c.t + '|' + c.cue + '|' + c.voice)).map((c) => ({ cue: c.cue, bus: c.bus, source: c.source || '', event: c.event || '', dropped: c.dropped || '' })));
const uiPeak = (page) => page.evaluate(() => window.__echoes.audio.meters().ui.peakDb);
const state = (page) => page.evaluate(() => { const E = window.__echoes; const f = E.app.focus(); return { app: E.app.state, stack: E.app.stack().join('>'), focus: f ? f.id || f.label.slice(0, 24) : null }; });
// The item: by id, else by a label regex — its rect (CSS px) and whether it is disabled.
const find = (page, key) => page.evaluate((key) => {
  const top = window.__echoes.app.stack().slice(-1)[0];
  const host = document.querySelector(`[data-screen="${top}"]`);
  if (!host) return null;
  const items = [...host.querySelectorAll('[data-nav]')].filter((n) => n.getClientRects().length > 0);
  const re = key.re ? new RegExp(key.re, 'i') : null;
  const el = items.find((n) => (key.id && n.id === key.id) || (re && re.test((n.getAttribute('aria-label') || n.textContent || '').trim())));
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  return { id: el.id, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true' };
}, key);
const press = async (page, device) => {
  if (device === 'mouse') { await page.mouse.down(); await sleep(50); await page.mouse.up(); }
  else if (device === 'enter') await page.keyboard.press('Enter');
  else { await page.evaluate(() => window.__gfPress(0, true)); await sleep(90); await page.evaluate(() => window.__gfPress(0, false)); }
};
// The activation's own UI cues: nav / settings ticks and Test phrases (sim cues — a room starting under a Resume — are game content).
const navCues = (cues) => cues.filter((c) => c.bus === 'ui' && ['nav', 'settings', 'test'].includes(c.source) && !c.dropped).map((c) => c.cue);

const TITLE_STEPS = [
  { label: 'title Settings', key: { id: 'ap-title-settings' }, want: 'ui_confirm', after: { stack: 'title>settings' } },
  { label: 'Settings tab chip Audio', key: { id: 'ap-tab-audio' }, want: 'ui_tab' },
  { label: 'Audio Music Curve', key: { id: 'au-music-curve' }, want: 'ui_confirm' },
  { label: 'Audio Music Curve again', key: { id: 'au-music-curve' }, want: 'ui_confirm' },
  { label: 'Audio Music Mute', key: { id: 'au-music-mute' }, want: 'ui_confirm' },
  { label: 'Audio Music Mute again', key: { id: 'au-music-mute' }, want: 'ui_confirm' },
  { label: 'Audio Master Test', key: { id: 'au-master-test' }, want: 'ui_confirm', extra: ['test_ui'] },
  { label: 'Settings tab chip Display', key: { id: 'ap-tab-display' }, want: 'ui_tab' },
  { label: 'Settings Back', key: { id: 'ap-settings-back' }, want: 'ui_back', after: { stack: 'title' } },
  { label: 'title New Game', key: { id: 'ap-title-new' }, want: 'ui_confirm', after: { app: 'playing' } },
];
const PAUSE_STEPS = [
  { label: 'pause Settings', key: { id: 'pz-settings' }, want: 'ui_confirm', after: { stack: 'pause>settings' } },
  { label: 'Settings Back (pause)', key: { id: 'ap-settings-back' }, want: 'ui_back', after: { stack: 'pause' } },
  { label: 'pause Quit to Lobby', key: { id: 'pz-lobby' }, want: 'ui_confirm', after: { stack: 'pause>confirm' } },
  { label: 'confirm Keep Playing', key: { id: 'ap-confirm-cancel' }, want: 'ui_back', after: { stack: 'pause' } },
  { label: 'pause Resume', key: { id: 'pz-resume' }, want: 'ui_confirm', after: { stack: '' } },
];

async function walk(device, params, steps, pre) {
  const { browser, page, errors } = await boot(params, { pad: device === 'pad' });
  const rows = [];
  try {
    await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.app && window.__echoes.app.state !== 'boot', { timeout: 180000 });
    await sleep(2500);
    if (pre) await pre(page);
    for (const s of steps) {
      const it = await find(page, s.key);
      if (!it) { rows.push({ device, label: s.label, err: 'not found', ids: await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.id || f.label.slice(0, 16)).join(',')), ...(await state(page)) }); continue; }
      await page.mouse.move(it.x - 2, it.y - 1); await page.mouse.move(it.x, it.y, { steps: 3 }); await sleep(450);
      const focusBefore = (await state(page)).focus;
      await mark(page); await press(page, device); await sleep(450);
      const cues = await fresh(page);
      rows.push({ device, label: s.label, item: it.id || it.label, focusBefore, cues: navCues(cues), all: cues.map((c) => c.cue + ':' + c.source + (c.event ? '/' + c.event : '')).join(','), uiPk: await uiPeak(page), ...(await state(page)), want: s.want, extra: s.extra || [], after: s.after || null });
      if (s.label === 'pause Resume') break;
    }
  } finally {
    await browser.close();
  }
  return { rows, errors };
}

const out = { tag: TAG, base: BASE, devices: {}, compare: [], pointerOnly: [], errors: {} };
// The campaign must be live before the pause menu is built (it lists Quit to Lobby only in a campaign).
const pausePre = async (page) => {
  await page.waitForFunction(() => { const E = window.__echoes; const c = E.campaign && E.campaign.state && E.campaign.state(); return E.tick > 120 && c && c.level; }, { timeout: 120000 });
  await sleep(800); await page.keyboard.press('Escape'); await sleep(700);
};
if (process.env.GF_ONLY) {
  // debug: GF_ONLY=<device> runs that device's pause walk only and prints its rows
  const p = await walk(process.env.GF_ONLY, 'level=1&seed=7&fresh=1', PAUSE_STEPS, pausePre);
  console.log(JSON.stringify(p, null, 1));
  process.exit(0);
}
for (const device of ['mouse', 'enter', 'pad']) {
  const t = await walk(device, 'fresh=1', TITLE_STEPS);
  const p = await walk(device, 'level=1&seed=7&fresh=1', PAUSE_STEPS, pausePre);
  out.devices[device] = [...t.rows, ...p.rows];
  out.errors[device] = [...t.errors, ...p.errors];
  console.log(`[${device}] ${out.devices[device].length} rows, ${out.errors[device].length} page errors`);
}
let fails = 0;
for (const s of [...TITLE_STEPS, ...PAUSE_STEPS]) {
  const by = {};
  for (const d of ['mouse', 'enter', 'pad']) by[d] = (out.devices[d] || []).find((r) => r.label === s.label) || null;
  const firstNav = (r) => (r && r.cues ? r.cues.filter((c) => c.startsWith('ui_'))[0] || '' : '');
  const navCount = (r) => (r && r.cues ? r.cues.filter((c) => /^ui_(confirm|back|tab|deny|toggle|slider|move)$/.test(c)).length : 0);
  const okAfter = (r) => !s.after || Object.entries(s.after).every(([k, v]) => r && r[k] === v);
  const row = { item: s.label, want: s.want };
  let pass = true;
  for (const d of ['mouse', 'enter', 'pad']) {
    const r = by[d];
    row[d] = r ? `${(r.cues || []).join('+') || '(none)'} ${r.uiPk}` : 'missing';
    const extraOk = (s.extra || []).every((c) => r && r.cues.includes(c));
    if (!r || r.err || firstNav(r) !== s.want || navCount(r) !== 1 || !(r.uiPk >= -24) || !okAfter(r) || !extraOk) pass = false;
  }
  row.same = ['enter', 'pad'].every((d) => by[d] && by.mouse && JSON.stringify(by[d].cues) === JSON.stringify(by.mouse.cues));
  if (!row.same) pass = false;
  row.result = pass ? 'PASS' : 'FAIL';
  if (!pass) fails++;
  out.compare.push(row);
}
console.table(out.compare);

// ---- pointer-only legs (mouse) ----
const po = out.pointerOnly;
const leg = (name, ok, detail) => { po.push({ leg: name, result: ok ? 'PASS' : 'FAIL', ...detail }); if (!ok) fails++; };
{
  const { browser, page, errors } = await boot('fresh=1');
  try {
    await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.app.state === 'title', { timeout: 180000 });
    await sleep(2500);
    // (a) natively disabled title item (Load Game on a fresh profile): pointer -> ui_deny, nothing opens.
    const ld = await find(page, { id: 'ap-title-load' });
    if (ld && ld.disabled) {
      await page.mouse.move(ld.x, ld.y, { steps: 3 }); await sleep(450);
      await mark(page); await press(page, 'mouse'); await sleep(450);
      const c = navCues(await fresh(page)); const st = await state(page);
      leg('disabled Load Game click', c.join('+') === 'ui_deny' && st.stack === 'title', { cues: c.join('+'), uiPk: await uiPeak(page), stack: st.stack });
    } else leg('disabled Load Game click', false, { err: 'Load Game not found or not disabled', ld });
    // (b) drag-off: press on Settings, slide off to empty space, release -> no cue, nothing opens.
    const se = await find(page, { id: 'ap-title-settings' });
    await page.mouse.move(se.x, se.y, { steps: 3 }); await sleep(450);
    await mark(page); await page.mouse.down(); await sleep(40); await page.mouse.move(1450, 120, { steps: 6 }); await sleep(40); await page.mouse.up(); await sleep(450);
    { const c = navCues(await fresh(page)); const st = await state(page); leg('press on Settings, release off it', c.length === 0 && st.stack === 'title', { cues: c.join('+') || '(none)', stack: st.stack }); }
    // open Settings by mouse for the control legs
    await page.mouse.move(se.x, se.y, { steps: 3 }); await sleep(300); await press(page, 'mouse'); await sleep(600);
    const au = await find(page, { id: 'ap-tab-audio' });
    await page.mouse.move(au.x, au.y, { steps: 3 }); await sleep(300); await press(page, 'mouse'); await sleep(600);
    // (c) slider track click (Music level at 25 %) -> the slider's own tick, never ui_confirm
    const ml = await find(page, { id: 'au-music-level' });
    if (ml) {
      const x = ml.x - ml.w / 2 + ml.w * 0.25;
      await page.mouse.move(x, ml.y, { steps: 3 }); await sleep(450);
      await mark(page); await press(page, 'mouse'); await sleep(450);
      const all = (await fresh(page)).filter((x) => x.source !== 'hover' && !x.dropped);
      const c = all.map((x) => x.cue + '@' + x.bus + ':' + x.source);
      leg('slider track click', !all.some((x) => x.cue === 'ui_confirm') && all.length >= 1, { cues: c.join('+'), level: await page.evaluate(() => window.__echoes.settings.get('audio.music.level')) });
    } else leg('slider track click', false, { err: 'no au-music-level' });
    // (d) right-click on the Settings screen -> ui_back (unchanged), back at the title
    await mark(page); await page.mouse.click(1500, 160, { button: 'right' }); await sleep(450);
    { const c = navCues(await fresh(page)); const st = await state(page); leg('right-click back', c.join('+') === 'ui_back' && st.stack === 'title', { cues: c.join('+'), stack: st.stack }); }
    // (e) Display tab select ‹ › step button -> the setting's own tick (ui_slider), never ui_confirm
    await page.mouse.move(se.x, se.y, { steps: 3 }); await sleep(300); await press(page, 'mouse'); await sleep(600);
    let step = null;
    for (const tab of ['ap-tab-display', 'ap-tab-gameplay', 'ap-tab-controls']) {
      const t = await find(page, { id: tab });
      if (!t) continue;
      await page.mouse.move(t.x, t.y, { steps: 3 }); await sleep(300); await press(page, 'mouse'); await sleep(500);
      step = await page.evaluate(() => { const host = document.querySelector('[data-screen="settings"]'); const b = [...host.querySelectorAll('.ap-step.ap-next')].find((n) => { const row = n.closest('.ap-row'); const title = (row && row.dataset.helpTitle) || ''; return n.getClientRects().length && !n.disabled && !/mode|window|fullscreen|language/i.test(title); }); if (!b) return null; b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); const row = b.closest('.ap-row'); return { x: r.x + r.width / 2, y: r.y + r.height / 2, row: row && row.dataset.helpTitle }; });
      if (step) { step.tab = tab; break; }
    }
    if (step) {
      await page.mouse.move(step.x, step.y, { steps: 3 }); await sleep(450);
      await mark(page); await press(page, 'mouse'); await sleep(450);
      const c = navCues(await fresh(page));
      leg('select › step click', !c.includes('ui_confirm') && c.length === 1, { cues: c.join('+'), row: step.row, tab: step.tab });
      await page.mouse.move(step.x - 200, step.y, { steps: 2 });
    } else leg('select › step click', false, { err: 'no step button' });
    out.errors.pointerOnly1 = errors;
  } catch (err) { leg('leg crashed', false, { err: String(err && err.message || err).slice(0, 300) }); } finally { await browser.close(); }
}
{
  // (f) touch tap on a title item: one activation cue, no hover tick
  const { browser, page, errors } = await boot('fresh=1');
  try {
    await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.app.state === 'title', { timeout: 180000 });
    await sleep(2500);
    const se = await find(page, { id: 'ap-title-settings' });
    await mark(page); await page.touchscreen.tap(se.x, se.y); await sleep(450);
    const all = await fresh(page); const c = navCues(all); const st = await state(page);
    leg('touch tap Settings', c.join('+') === 'ui_confirm' && !all.some((x) => x.source === 'hover') && st.stack === 'title>settings', { cues: c.join('+'), all: all.map((x) => x.cue + ':' + x.source).join(','), stack: st.stack });
    out.errors.pointerOnly2 = errors;
  } catch (err) { leg('leg crashed', false, { err: String(err && err.message || err).slice(0, 300) }); } finally { await browser.close(); }
}
{
  // (g) splash: no autoplay flag; the click that dismisses "Press any key or click" lands where New Game will be.
  let ng = null;
  {
    const { browser, page } = await boot('fresh=1');
    await page.waitForFunction(() => window.__echoes.app.state === 'title' && window.__echoes.app.stack().join('>') === 'title', { timeout: 180000 });
    await sleep(1500);
    ng = await find(page, { id: 'ap-title-new' });
    await browser.close();
  }
  // NO puppeteer evaluate / waitForFunction before the click: they run with userGesture true, which grants
  // user activation and lets the engine create its context at boot (no splash). Reads go through CDP
  // Runtime.evaluate with userGesture false, as the round-6 critic's autoplay probe does.
  for (const how of ['mouse', 'touch']) {
  const browser = await launchEchoes({ gpu: true, autoplay: false, width: 1600, height: 900 });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  try {
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(TAP_SCRIPT);
    // where the dismissing press / click really land (is a title item ever the click target?)
    await page.evaluateOnNewDocument(`(() => { window.__gfClicks = []; for (const t of ['pointerdown', 'click']) window.addEventListener(t, (e) => { const it = e.target && e.target.closest ? e.target.closest('[data-nav]') : null; const E = window.__echoes; window.__gfClicks.push({ t, item: it ? it.id || it.className : null, top: E && E.app ? E.app.stack().join('>') : null, trusted: e.isTrusted }); }, { capture: true }); })();`);
    const cdp = await page.createCDPSession();
    const ev = async (expr) => { const r = await cdp.send('Runtime.evaluate', { expression: expr, userGesture: false, returnByValue: true }); return r.result ? r.result.value : null; };
    await page.goto(BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
    let seen = null;
    for (let i = 0; i < 240 && !(seen && seen.ok); i++) {
      await sleep(500);
      seen = await ev("(() => { const E = window.__echoes; if (!E || !E.app) return { ok: false }; const p = document.querySelector('.ap-press'); return { ok: !!(E.app.stack().includes('loading') && p && p.classList.contains('ap-on')), stack: E.app.stack().join('>'), app: E.app.state, press: p && p.className, audio: E.audio && E.audio.state }; })()");
    }
    if (!seen || !seen.ok) throw new Error('splash prompt never shown: ' + JSON.stringify(seen));
    await sleep(300);
    if (how === 'touch') await page.touchscreen.tap(ng.x, ng.y);
    else { await page.mouse.move(ng.x, ng.y); await page.mouse.down(); await sleep(60); await page.mouse.up(); }
    await sleep(700);
    const all = await page.evaluate(() => window.__echoes.audio.cueLog(600).map((c) => ({ cue: c.cue, source: c.source, event: c.event || '', dropped: c.dropped || '' })));
    const st = await state(page);
    const ptr = all.filter((c) => c.event === 'pointer');
    leg(`splash-dismiss ${how} never activates / sounds a title item`, ptr.length === 0 && st.app === 'title' && st.stack === 'title', { landed: JSON.stringify(await page.evaluate(() => window.__gfClicks)), pointerCues: ptr.length, stack: st.stack, app: st.app, audio: await page.evaluate(() => window.__echoes.audio.state) });
    out.errors['splash_' + how] = errors;
  } catch (err) { leg('leg crashed', false, { err: String(err && err.message || err).slice(0, 300) }); } finally { await browser.close(); }
  }
}
console.table(po);
const pageErrors = Object.values(out.errors).reduce((n, e) => n + (e ? e.length : 0), 0);
out.verdict = { fails, pageErrors, result: fails === 0 && pageErrors === 0 ? 'ALL PASS' : 'FAIL' };
writeFileSync(`captures/gntfixM36/${TAG}-activate.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.verdict), `captures/gntfixM36/${TAG}-activate.json`);
