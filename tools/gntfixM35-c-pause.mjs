// gntfixM35 copy of tools/gntcaudio5-pause.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// B16 pause behaviour + AUD4-F1 re-check (music through a render-loop stall and a busy main thread), engine worklet meters (audio thread).
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const M = async (label, ms = 1500) => { await page.evaluate(() => window.__echoes.audio.meterReset()); await sleep(ms); return page.evaluate((label) => { const A = window.__echoes.audio; const m = A.meters(); const mu = A.music(); return { label, music: m.music.rmsDb, musicPk: m.music.peakDb, sfxPk: m.sfx.peakDb, sfx: m.sfx.rmsDb, amb: m.ambient.rmsDb, master: m.master.rmsDb, centroid: m.music.centroidHz, ducked: mu.ducked, state: mu.state, below50: m.music.longestBelowMinus50Ms, stack: window.__echoes.app.stack().join('>') }; }, label); };
const rows = [];
await page.evaluate(() => window.__echoes.cmd('autopilot', true));
await sleep(3000);
rows.push(await M('combat, playing'));
await page.keyboard.press('Escape'); await sleep(700);
rows.push(await M('paused (Esc)'));
rows.push(await M('paused +1.5 s'));
await page.keyboard.press('Escape'); await sleep(700);
rows.push(await M('resumed'));
// stall tests: music isolated at the engine music tap
const stalls = [];
for (const kind of ['raf4000', 'busy2500', 'busy4000']) {
  await page.evaluate(() => window.__echoes.audio.meterReset());
  const r = await page.evaluate(async (kind) => {
    const A = window.__echoes.audio; const t0 = performance.now();
    if (kind.startsWith('raf')) {
      const ms = +kind.slice(3); const orig = window.requestAnimationFrame; const held = [];
      window.requestAnimationFrame = (cb) => { held.push(cb); return 0; };
      await new Promise((r) => setTimeout(r, ms));
      window.requestAnimationFrame = orig; for (const cb of held) orig(cb);
    } else { const ms = +kind.slice(4); const end = performance.now() + ms; while (performance.now() < end) {} }
    await new Promise((r) => setTimeout(r, 1500));
    const m = A.meters().music; return { kind, wallMs: Math.round(performance.now() - t0), below50Ms: m.longestBelowMinus50Ms, rms: m.rmsDb, peak: m.peakDb, windows: m.windows100 };
  }, kind);
  stalls.push(r); await sleep(2000);
}
// baseline no-stall window of the same length
await page.evaluate(() => window.__echoes.audio.meterReset()); await sleep(5500);
stalls.push(await page.evaluate(() => { const m = window.__echoes.audio.meters().music; return { kind: 'none (baseline)', below50Ms: m.longestBelowMinus50Ms, rms: m.rmsDb, peak: m.peakDb }; }));
console.log(out('pause', { rows, stalls, errors }));
console.table(rows); console.table(stalls); console.log('errors', errors);
await browser.close();
