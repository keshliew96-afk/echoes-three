// gntfixM35 copy of tools/gntcaudio5-swapmouse.mjs (the round-5 audio critic's probe, logic unchanged;
// own port + outputs via tools/gntfixM35-lib.mjs). Swap offer with the MOUSE: hover / click replace
// slots, hover Take / Leave, click Take.
import { bootTap, out, sleep, shotPath } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const acts = [];
const A_ = async (label, fn, wait = 400) => {
  await page.evaluate(() => { window.__echoes.audio.meterReset(); window.__gntCL = window.__echoes.audio.cueLog(400).length; });
  await fn(); await sleep(wait);
  const m = await page.evaluate(() => { const E = window.__echoes, A = E.audio; const ms = A.meters(); const cl = A.cueLog(400).slice(window.__gntCL); const r = E.state().run; return { uiPk: ms.ui.peakDb, music: ms.music.rmsDb, cues: cl.filter((c) => c.bus === 'ui').map((c) => c.cue).join(','), phase: r?.phase, rep: r?.reward?.replace, skills: (E.state().skills || []).map((s) => s && s.id).join(',') }; });
  acts.push({ label, ...m, margin: m.uiPk > -150 ? +(m.uiPk - m.music).toFixed(2) : null }); await sleep(200);
};
await page.evaluate(() => { const E = window.__echoes; E.cmd('giveSkill', 'nova_bloom'); E.cmd('giveSkill', 'sanctuary'); E.cmd('killAllEnemies'); });
await page.waitForFunction(() => !!window.__echoes.state().run?.reward, { timeout: 20000 }); await sleep(1500);
// coordinates from the critic's swap-offer frame (1600x900): slots 1..4 at y~520, x 602/734/866/998; Take (727,664), Leave (890,665)
await A_('mouse move to slot 2 (hover)', () => page.mouse.move(734, 520));
await A_('mouse click slot 2', () => page.mouse.click(734, 520));
await A_('mouse click slot 3', () => page.mouse.click(866, 520));
await A_('mouse hover Leave', () => page.mouse.move(890, 665));
await A_('mouse hover Take', () => page.mouse.move(727, 664));
await page.screenshot({ path: shotPath('swapmouse-slot3') });
await A_('mouse click Take', () => page.mouse.click(727, 664), 1200);
await page.screenshot({ path: shotPath('swapmouse-aftertake') });
const stack = await page.evaluate(() => ({ stack: window.__echoes.app.stack().join('>'), phase: window.__echoes.state().run?.phase }));
const res = { acts, stack, errors };
console.log(out('swapmouse', res));
console.table(acts);
console.log(JSON.stringify(stack), errors);
await browser.close();
