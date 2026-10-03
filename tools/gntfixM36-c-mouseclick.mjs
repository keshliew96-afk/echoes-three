// gntfixM36 copy of tools/gntcaudio6-mouseclick.mjs (critic probe, own port + outputs) — gntcaudio6 — does a MOUSE click on a menu button sound like the keyboard Enter on it? Hover first (settle 450 ms),
// then click; cues read from the cue log by key (t|cue|voice), UI-tap peak measured over the click window.
import { bootTap, out, sleep } from './gntfixM36-lib.mjs';
const { browser, page, errors } = await bootTap('fresh=1');
await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 180000 });
await sleep(2500);
await page.mouse.click(800, 450); await sleep(800); // unlock gesture (autoplay flag already allows; harmless)
const rows = [];
const since = async () => page.evaluate(() => { window.__gmk = new Set(window.__echoes.audio.cueLog(600).map((c) => c.t + '|' + c.cue + '|' + c.voice)); window.__echoes.audio.meterReset(); });
const newCues = async () => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((c) => !window.__gmk.has(c.t + '|' + c.cue + '|' + c.voice)).map((c) => c.cue + '@' + c.bus + (c.source && c.source !== 'sim' ? ':' + c.source : '')).join(','));
const rect = async (id) => page.evaluate((id) => { const f = (window.__echoes.app.focusables() || []).find((x) => x.id === id || x.label === id); return f && f.rect; }, id);
const state = async () => page.evaluate(() => { const E = window.__echoes, S = E.settings; return { stack: E.app.stack().join('>'), focus: E.app.focus() && E.app.focus().id, mMode: S.get('audio.music.mode'), mMuted: S.get('audio.music.muted') }; });
const clickRow = async (label, id) => {
  const r = await rect(id); if (!r) { rows.push({ label, err: 'no rect ' + id }); return; }
  const x = r.x + r.w / 2, y = r.y + r.h / 2;
  await since(); await page.mouse.move(x, y, { steps: 4 }); await sleep(450); const hover = await newCues();
  await since(); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(450);
  const click = await newCues(); const pk = await page.evaluate(() => window.__echoes.audio.meters().ui.peakDb);
  rows.push({ label, hover, click, uiPkClick: pk, ...(await state()) });
};
const keyRow = async (label, key) => { await since(); await page.keyboard.press(key); await sleep(450); rows.push({ label, click: await newCues(), uiPkClick: await page.evaluate(() => window.__echoes.audio.meters().ui.peakDb), ...(await state()) }); };
await clickRow('title: mouse Settings', 'Settings');
await keyRow('settings: E -> next tab (key)', 'KeyE');
const tabs = await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.id));
if (!tabs.includes('au-music-curve')) await keyRow('settings: E again', 'KeyE');
await clickRow('audio: mouse Music Curve', 'au-music-curve');
await clickRow('audio: mouse Music Curve again', 'au-music-curve');
await clickRow('audio: mouse Music Mute', 'au-music-mute');
await clickRow('audio: mouse Music Mute again', 'au-music-mute');
await clickRow('audio: mouse Music Test', 'au-music-test');
await clickRow('audio: mouse Display tab', 'ap-tab-display');
await clickRow('audio: mouse Audio tab', 'ap-tab-audio');
// keyboard reference on the same control
await page.evaluate(() => { const f = (window.__echoes.app.focusables() || []).find((x) => x.id === 'au-music-mute'); }); 
await clickRow('audio: mouse Back', 'ap-settings-back');
res: {
  console.log(out('mouseclick', { rows, errors }));
  console.table(rows);
}
await browser.close();
