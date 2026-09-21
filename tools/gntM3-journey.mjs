// gntM3 regression journey WITHOUT the autoplay flag (a real player's path):
// plain URL -> loading splash ("Press any key") -> a real key unlocks audio
// and advances -> Enter on the title (New Game) -> hold W to the portal -> E
// -> room 1 combat -> clear -> reward. Checks the engine follows every step
// (menu -> camp -> combat music, sound events flowing) with 0 page errors.
import { launchEchoes } from './gnt-arch-browser.mjs';
import { sleep, out, BASE } from './gntM3-lib.mjs';

const browser = await launchEchoes({ gpu: true, autoplay: false });
const page = await browser.newPage();
const errors = [];
const warn = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('console', (m) => {
  const t = m.type();
  if ((t === 'error' || t === 'warning') && !/X3595|X4000/.test(m.text())) warn.push(`[${t}] ${m.text().slice(0, 160)}`);
});
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
const q = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: false, awaitPromise: true })).result.value;
const until = async (expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await q(expr)) return true;
    await sleep(150);
  }
  return false;
};
const snap = () => q(`(() => { const E = window.__echoes; const r = E.state().run; return { app: E.app.state, audio: E.audio.state, music: E.audio.music().state, phase: r.phase, room: r.room, tick: E.tick, sounds: E.audio.voices().soundEvents }; })()`);
const steps = [];
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
steps.push({ step: 'prompt', ok: await until(`(() => { const p = document.querySelector('.ap-press'); return !!(p && p.classList.contains('ap-on')); })()`, 120000), s: await snap() });
await page.keyboard.press('KeyA'); // unlocks audio + advances the splash
steps.push({ step: 'title', ok: await until(`window.__echoes.app.state === 'title' && window.__echoes.audio.state === 'running'`, 20000), s: await snap() });
await sleep(2500);
steps.push({ step: 'menu-music', ok: await q(`window.__echoes.audio.music().state === 'menu'`), s: await snap() });
await page.keyboard.press('Enter'); // New Game (primary)
steps.push({ step: 'camp', ok: await until(`window.__echoes.app.state === 'playing'`, 20000), s: await snap() });
await sleep(2600);
steps.push({ step: 'camp-music', ok: await q(`window.__echoes.audio.music().state === 'camp' && window.__echoes.audio.ambient().bed === 'camp'`), s: await snap() });
await page.keyboard.down('KeyW');
const portal = await until(`window.__echoes.cmd('campState').inPortal`, 12000);
await page.keyboard.up('KeyW');
steps.push({ step: 'portal', ok: portal, s: await snap() });
await page.keyboard.press('KeyE');
steps.push({ step: 'room1', ok: await until(`(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; })()`, 15000), s: await snap() });
await page.mouse.move(800, 330);
await page.mouse.down({ button: 'right' });
await sleep(3000);
steps.push({ step: 'combat-music', ok: await q(`window.__echoes.audio.music().state === 'combat'`), s: await snap() });
await page.mouse.up({ button: 'right' });
for (let i = 0; i < 40; i++) {
  if (await q(`window.__echoes.state().run.phase !== 'combat'`)) break;
  await q(`window.__echoes.cmd('killAllEnemies')`);
  await sleep(400);
}
steps.push({ step: 'reward', ok: await until(`window.__echoes.state().run.phase === 'reward'`, 15000), s: await snap() });
const cues = await q(`(() => { const c = {}; for (const e of window.__echoes.audio.cueLog(600)) c[e.cue] = (c[e.cue] || 0) + 1; return c; })()`);
await browser.close();
const pass = steps.every((s) => s.ok) && errors.length === 0 && warn.length === 0;
out({ pass, steps, cues, pageErrors: errors, consoleWarnErr: warn });
