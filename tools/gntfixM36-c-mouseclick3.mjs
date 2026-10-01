// gntfixM36 copy of tools/gntcaudio6-mouseclick3.mjs (critic probe, own port + outputs) — gntcaudio6 — title "New Game": mouse click (hover settled) vs keyboard Enter, each in a fresh browser; UI cues + UI-tap peak.
import { bootTap, out, sleep } from './gntfixM36-lib.mjs';
const rows = [];
for (const how of ['mouse', 'enter']) {
  const { browser, page, errors } = await bootTap('fresh=1');
  await page.waitForFunction(() => window.__echoes.app.state === 'title' && window.__echoes.audio.state === 'running', { timeout: 180000 });
  await sleep(3000);
  const f = await page.evaluate(() => { const x = (window.__echoes.app.focusables() || []).find((q) => /^New Game/i.test(q.label || '')); return x && { rect: x.rect, focused: window.__echoes.app.focus() && window.__echoes.app.focus().label }; });
  if (how === 'mouse') { await page.mouse.move(f.rect.x + f.rect.w / 2, f.rect.y + f.rect.h / 2, { steps: 3 }); await sleep(450); }
  await page.evaluate(() => { window.__gmk = new Set(window.__echoes.audio.cueLog(600).map((c) => c.t + '|' + c.cue + '|' + c.voice)); window.__echoes.audio.meterReset(); });
  if (how === 'mouse') { await page.mouse.down(); await sleep(50); await page.mouse.up(); } else await page.keyboard.press('Enter');
  await sleep(450);
  const r = await page.evaluate(() => ({ cues: window.__echoes.audio.cueLog(600).filter((c) => !window.__gmk.has(c.t + '|' + c.cue + '|' + c.voice)).map((c) => c.cue + '@' + c.bus + ':' + (c.source || '') + (c.dropped ? '(dropped ' + c.dropped + ')' : '')).join(','), uiPk: window.__echoes.audio.meters().ui.peakDb, stack: window.__echoes.app.stack().join('>'), app: window.__echoes.app.state }));
  rows.push({ how, focusedBefore: f.focused, ...r, errors: errors.length });
  await browser.close();
}
console.log(out('mouseclick3', { rows }));
console.table(rows);
