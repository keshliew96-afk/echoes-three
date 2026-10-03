// gntfixM35 copy of tools/gntcaudio5-runui2.mjs (the round-5 audio critic's probe, logic unchanged;
// own port + outputs via tools/gntfixM35-lib.mjs). Silent run-UI selection changes: swap Q/E/A/D,
// doors A/D, shop hover / E / D — UI tap peak + UI cues per action.
import { bootTap, out, sleep, shotPath } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const rows = [];
const P = async (label, fn, shot) => {
  await page.evaluate(() => { window.__echoes.audio.meterReset(); window.__gntCL = window.__echoes.audio.cueLog(400).length; });
  await fn(); await sleep(400);
  const m = await page.evaluate(() => { const A = window.__echoes.audio; const ms = A.meters(); const cl = A.cueLog(400).slice(window.__gntCL).filter((c) => c.bus === 'ui').map((c) => c.cue); return { uiPk: ms.ui.peakDb, music: ms.music.rmsDb, uiCues: cl.join(','), sfxCuesN: A.cueLog(400).slice(window.__gntCL).filter((c) => c.bus !== 'ui').length }; });
  if (shot) await page.screenshot({ path: shotPath(`runui2-${shot}`) });
  rows.push({ label, ...m, margin: m.uiPk > -150 ? +(m.uiPk - m.music).toFixed(2) : null, shot }); await sleep(200);
};
await page.evaluate(() => { const E = window.__echoes; E.cmd('giveSkill', 'nova_bloom'); E.cmd('giveSkill', 'sanctuary'); E.cmd('killAllEnemies'); });
await page.waitForFunction(() => !!window.__echoes.state().run?.reward, { timeout: 20000 }); await sleep(1500);
await P('swap: initial', async () => {}, 'swap0');
await P('swap: E (next character)', () => page.keyboard.press('KeyE'), 'swapE');
await P('swap: Q (back to Healer)', () => page.keyboard.press('KeyQ'), 'swapQ');
await P('swap: D (choose -> Leave?)', () => page.keyboard.press('KeyD'), 'swapD');
await P('swap: A (choose -> Take?)', () => page.keyboard.press('KeyA'), 'swapA');
await P('swap: Enter (Take)', () => page.keyboard.press('Enter'));
await sleep(1500);
await P('doors: initial', async () => {}, 'door0');
await P('doors: D', () => page.keyboard.press('KeyD'), 'doorD');
await P('doors: A', () => page.keyboard.press('KeyA'), 'doorA');
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7)); await sleep(4000);
await P('shop: initial', async () => {}, 'shop0');
await P('shop: mouse hover card 2', () => page.mouse.move(685, 585), 'shopHover');
await P('shop: E (next character)', () => page.keyboard.press('KeyE'), 'shopE');
await P('shop: D', () => page.keyboard.press('KeyD'), 'shopD');
console.log(out('runui2', { rows, errors })); console.table(rows);
await browser.close();
