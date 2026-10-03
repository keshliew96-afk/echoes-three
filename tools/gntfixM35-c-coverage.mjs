// gntfixM35 copy of tools/gntcaudio5-coverage.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.7 coverage: every sim event type counted (bus.on) vs the cues it produced (cueLog), over a real-time autopilot campaign slice.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=3&partygrant=2');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(2000);
await page.evaluate(() => {
  const E = window.__echoes, A = E.audio;
  const C = (window.__gntCov = { ev: {}, snd: {}, sndN: 0 });
  for (const t of A.eventTypes()) { try { E.on(t, () => { C.ev[t] = (C.ev[t] || 0) + 1; }); } catch {} }
  for (const t of ['level_clear', 'level_start', 'level_transit', 'reward_offer', 'swap_offer', 'skill_swapped', 'draft_taken', 'nav']) { if (!C.ev[t]) try { E.on(t, () => { C.ev[t] = (C.ev[t] || 0) + 1; }); } catch {} }
  try { E.on('sound', (e) => { C.sndN++; const k = (e && (e.cue || e.slot)) || '?'; C.snd[k] = (C.snd[k] || 0) + 1; }); } catch {}
  A.cueLogClear();
  // keep the full cue log: poll into our own array
  C.cues = []; let seen = 0;
  setInterval(() => { const l = A.cueLog(2000); const n = l.length; if (n < seen) seen = 0; for (let i = seen; i < n; i++) C.cues.push(l[i]); seen = n; if (n > 1500) { A.cueLogClear(); seen = 0; } }, 250);
  E.cmd('autopilot', true);
});
const phaseLog = [];
const t0 = Date.now();
// real-time autopilot for ~150 s, then force the boss
while (Date.now() - t0 < 150000) { await sleep(5000); phaseLog.push(await page.evaluate(() => { const r = window.__echoes.state().run; return `${Math.round(performance.now() / 1000)}s ${r?.phase}:${r?.room}`; })); }
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); await sleep(3000);
await page.evaluate(() => { const E = window.__echoes; E.cmd('autopilot', true); });
for (let i = 0; i < 8; i++) { await sleep(5000); await page.evaluate((i) => { const E = window.__echoes; const b = E.state().run?.boss; if (b && b.pct > 0.4 && i === 2) E.cmd('bossHp', 0.45); }, i); }
// UI: pause menu nav by real keys
await page.keyboard.press('Escape'); await sleep(600); await page.keyboard.press('ArrowDown'); await sleep(300); await page.keyboard.press('ArrowUp'); await sleep(300); await page.keyboard.press('Escape'); await sleep(800);
await page.evaluate(() => { const E = window.__echoes; E.cmd('bossHp', 0.02, true); }); await sleep(1500);
await page.evaluate(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch {} E.cmd('killAllEnemies'); });
await sleep(9000);
const res = await page.evaluate(() => {
  const C = window.__gntCov; const byEvent = {}; const byCue = {};
  for (const c of C.cues) { const ev = c.event || c.source || '?'; (byEvent[ev] ||= {}); byEvent[ev][c.cue] = (byEvent[ev][c.cue] || 0) + 1; byCue[c.cue] = (byCue[c.cue] || 0) + 1; }
  return { ev: C.ev, snd: C.snd, sndN: C.sndN, cuesN: C.cues.length, byEvent, byCue, sample: C.cues.slice(0, 3), voices: window.__echoes.audio.voices(), cost: window.__echoes.audio.cost ? window.__echoes.audio.cost() : null };
});
res.phaseLog = phaseLog; res.errors = errors;
console.log(out('coverage', res));
console.log('events', JSON.stringify(res.ev));
console.log('cues', JSON.stringify(res.byCue));
console.log('byEvent', JSON.stringify(res.byEvent).slice(0, 4000));
console.log('sample', JSON.stringify(res.sample));
console.log('voices', JSON.stringify(res.voices), 'cost', JSON.stringify(res.cost));
console.log(phaseLog.join(' | '), 'errors', errors);
await browser.close();
