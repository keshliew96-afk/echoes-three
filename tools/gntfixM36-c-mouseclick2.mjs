// gntfixM36 copy of tools/gntcaudio6-mouseclick2.mjs (critic probe, own port + outputs) — gntcaudio6 — mouse vs keyboard activation sounds in the app menus: title (Settings / Records), in-run pause menu
// (Settings, Resume), Quit to Lobby confirm; each item activated once by mouse (hover settled 450 ms first) and once
// by keyboard Enter; UI-bus cues and UI-tap peak in the 450 ms after the activation.
import { bootTap, out, sleep } from './gntfixM36-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const rows = [];
const since = async () => page.evaluate(() => { window.__gmk = new Set(window.__echoes.audio.cueLog(600).map((c) => c.t + '|' + c.cue + '|' + c.voice)); window.__echoes.audio.meterReset(); });
const newCues = async () => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((c) => !window.__gmk.has(c.t + '|' + c.cue + '|' + c.voice) && c.bus === 'ui').map((c) => c.cue + (c.source && c.source !== 'sim' ? ':' + c.source : '')).join(','));
const st = async () => page.evaluate(() => { const E = window.__echoes; return { stack: E.app.stack().join('>'), focus: E.app.focus() && E.app.focus().label && E.app.focus().label.slice(0, 24) }; });
const find = async (re) => page.evaluate((src) => { const re = new RegExp(src, 'i'); const f = (window.__echoes.app.focusables() || []).find((x) => re.test(x.label || '') || re.test(x.id || '')); return f && { id: f.id, label: f.label, rect: f.rect }; }, re);
const mouse = async (label, re) => { const f = await find(re); if (!f) { rows.push({ label, err: 'not found ' + re }); return; } const x = f.rect.x + f.rect.w / 2, y = f.rect.y + f.rect.h / 2; await page.mouse.move(x, y, { steps: 3 }); await sleep(450); await since(); await page.mouse.down(); await sleep(50); await page.mouse.up(); await sleep(450); rows.push({ label, how: 'mouse', item: f.label.slice(0, 24), cues: await newCues(), uiPk: await page.evaluate(() => window.__echoes.audio.meters().ui.peakDb), ...(await st()) }); };
const key = async (label, k) => { await since(); await page.keyboard.press(k); await sleep(450); rows.push({ label, how: 'key ' + k, cues: await newCues(), uiPk: await page.evaluate(() => window.__echoes.audio.meters().ui.peakDb), ...(await st()) }); };
await key('pause open', 'Escape');
await mouse('pause: mouse Settings', '^Settings');
await key('settings: Esc back', 'Escape');
await key('pause: Down', 'ArrowDown');
await key('pause: Enter on Settings', 'Enter');
await key('settings: Esc back', 'Escape');
await mouse('pause: mouse Resume', '^Resume');
await key('pause open', 'Escape');
await key('pause: Enter on Resume', 'Enter');
await key('pause open', 'Escape');
await mouse('pause: mouse Quit to Lobby', 'Quit to Lobby');
await mouse('confirm: mouse Keep Playing', 'Keep Playing');
await key('pause: Esc (close)', 'Escape');
console.log(out('mouseclick2', { rows, errors }));
console.table(rows);
await browser.close();
