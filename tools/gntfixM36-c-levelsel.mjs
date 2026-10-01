// gntfixM36 copy of tools/gntcaudio6-levelsel.mjs (critic probe, own port + outputs) — gntcaudio6 — audio of the lobby Level Select (new this iteration): open (L), keyboard moves, a click on a LOCKED
// card, Esc; then with a probe unlock override [1,2]: move to Level 2 and start it (Enter) -> music follows.
import { bootTap, out, sleep } from './gntfixM36-lib.mjs';
const { browser, page, errors } = await bootTap('menu=0&seed=7&fresh=1');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 200, { timeout: 180000 });
await sleep(3000);
const rows = [];
const since = async () => page.evaluate(() => { window.__gmk = new Set(window.__echoes.audio.cueLog(600).map((c) => c.t + '|' + c.cue + '|' + c.voice)); window.__echoes.audio.meterReset(); });
const newCues = async () => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((c) => !window.__gmk.has(c.t + '|' + c.cue + '|' + c.voice) && c.bus === 'ui').map((c) => c.cue + (c.source && c.source !== 'sim' ? ':' + c.source : '')).join(','));
const st = async () => page.evaluate(() => { const E = window.__echoes; const f = E.app.focus(); const c = E.campaign && E.campaign.state(); return { stack: E.app.stack().join('>'), focus: f && (f.label || f.id || '').slice(0, 30), music: E.audio.music().state + ':' + E.audio.music().theme, level: c && c.level }; });
const act = async (label, fn, wait = 500, shot) => { await since(); await fn(); await sleep(wait); if (shot) await page.screenshot({ path: `captures/gntfixM36/${process.env.GNTFIXM36_TAG || 'run'}-levelsel-${shot}.png` }); rows.push({ label, cues: await newCues(), uiPk: await page.evaluate(() => window.__echoes.audio.meters().ui.peakDb), ...(await st()) }); };
await act('camp: press L', () => page.keyboard.press('KeyL'), 900, 'open');
const cards = await page.evaluate(() => [...document.querySelectorAll('[aria-disabled], .lv-card, [data-level]')].map((e) => { const b = e.getBoundingClientRect(); return { cls: e.className && String(e.className).slice(0, 40), dis: e.getAttribute('aria-disabled'), lvl: e.getAttribute('data-level'), txt: (e.textContent || '').trim().slice(0, 50), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((c) => c.w > 60 && c.h > 60));
await act('ArrowRight', () => page.keyboard.press('ArrowRight'));
await act('ArrowDown', () => page.keyboard.press('ArrowDown'));
const locked = cards.find((c) => c.dis === 'true');
if (locked) {
  await page.mouse.move(locked.x + locked.w / 2, locked.y + locked.h / 2, { steps: 3 }); await sleep(450);
  await act('mouse click LOCKED card ' + (locked.lvl || locked.txt.slice(0, 16)), async () => { await page.mouse.down(); await sleep(50); await page.mouse.up(); }, 500, 'locked');
}
await act('Esc', () => page.keyboard.press('Escape'), 700);
await page.evaluate(() => { try { window.__echoes.campaign.unlock([1, 2]); } catch (e) {} });
await act('L again (L1 + L2 unlocked)', () => page.keyboard.press('KeyL'), 900, 'open2');
await act('ArrowRight', () => page.keyboard.press('ArrowRight'), 500, 'right');
await act('ArrowLeft', () => page.keyboard.press('ArrowLeft'));
await act('ArrowRight', () => page.keyboard.press('ArrowRight'));
await act('Enter (start Level 2)', () => page.keyboard.press('Enter'), 2500);
await sleep(2500); rows.push({ label: '+2.5 s', ...(await st()) });
console.log(out('levelsel', { rows, cards, errors }));
console.table(rows); console.log(JSON.stringify(cards)); console.log('errors', errors.length);
await browser.close();
