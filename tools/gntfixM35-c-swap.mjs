// gntfixM35 copy of tools/gntcaudio5-swap.mjs (the round-5 audio critic's probe, logic unchanged;
// own port + outputs via tools/gntfixM35-lib.mjs). Full-slot swap offer with real keys: the
// Replaces selector W/S, A/D, Take — UI tap peak vs music tap RMS per press.
import { bootTap, out, sleep, shotPath } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const log = [];
const snap = async (label) => { const s = await page.evaluate(() => { const E = window.__echoes, A = E.audio; const r = E.state().run; return { phase: r?.phase, room: r?.room, reward: r?.reward ? JSON.stringify(r.reward).slice(0, 300) : null, skills: (E.state().skills || []).map((s) => s && s.id).join(','), stack: E.app.stack().join('>'), focus: E.app.focus()?.label, music: A.music().state, intensity: A.music().intensity, ducked: A.music().ducked }; }); log.push([label, s]); return s; };
await page.evaluate(() => { const E = window.__echoes; E.cmd('giveSkill', 'nova_bloom'); E.cmd('giveSkill', 'sanctuary'); });
await sleep(500); await snap('4 skills');
await page.evaluate(() => { const E = window.__echoes; E.audio.cueLogClear(); E.cmd('killAllEnemies'); });
for (let i = 0; i < 12; i++) { await sleep(700); const s = await snap('wait reward ' + i); if (s.reward) break; }
await sleep(1200);
await page.screenshot({ path: shotPath('swap-offer') });
await snap('offer shown');
const presses = [];
const pressMeasure = async (key, label) => {
  await page.evaluate(() => window.__echoes.audio.meterReset());
  await page.keyboard.press(key);
  await sleep(380);
  const m = await page.evaluate(() => { const A = window.__echoes.audio; const ms = A.meters(); const cl = A.cueLog(3); return { uiPk: ms.ui.peakDb, music: ms.music.rmsDb, sfxPk: ms.sfx.peakDb, lastCue: cl.length ? cl[cl.length - 1].cue : null, lastBus: cl.length ? cl[cl.length - 1].bus : null, rep: window.__echoes.state().run?.reward?.replace }; });
  presses.push({ key, label, ...m, margin: +(m.uiPk - m.music).toFixed(2) });
  await sleep(300);
};
await pressMeasure('KeyS', 'Replaces selector down');
await pressMeasure('KeyS', 'Replaces selector down');
await pressMeasure('KeyW', 'Replaces selector up');
await pressMeasure('ArrowRight', 'card right');
await pressMeasure('ArrowLeft', 'card left');
await page.screenshot({ path: shotPath('swap-selector') });
await snap('before take');
await pressMeasure('Enter', 'Take');
await sleep(1500);
await page.screenshot({ path: shotPath('swap-after-take') });
await snap('after take');
const cues = await page.evaluate(() => window.__echoes.audio.cueLog(200).map((c) => c.cue + ':' + c.bus));
const res = { log, presses, cues, errors };
console.log(out('swap', res));
for (const l of log) console.log(l[0], JSON.stringify(l[1]));
console.table(presses);
console.log('cues', cues.filter((c) => c.endsWith(':ui')).join(' '));
console.log('errors', errors);
await browser.close();
