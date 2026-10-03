// gntfixM35 copy of tools/gntcaudio5-balance.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.4 balance at defaults in normal combat: 400 ms windows of master/sfx/music/ui taps; UI clicks over combat music.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=11');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 120000 });
await sleep(2500);
const res = await page.evaluate(async () => {
  const E = window.__echoes, A = E.audio, S = E.settings;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  E.cmd('autopilot', true);
  const win = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 40000) {
    A.meterReset(); await wait(400);
    const m = A.meters(); const st = E.state();
    win.push({ t: Math.round(performance.now() - t0), master: m.master.rmsDb, masterPk: m.master.peakDb, sfxPk: m.sfx.peakDb, sfxRms: m.sfx.rmsDb, music: m.music.rmsDb, amb: m.ambient.rmsDb, phase: st.run?.phase, room: st.run?.room, alive: (st.enemies || []).length, mstate: A.music().state });
  }
  E.cmd('autopilot', false);
  // UI clicks over combat music: force combat music state (room still live or pin), then nav clicks via the real UI cue path (app.press in the pause menu) and direct cue
  const ui = [];
  const beforeMusic = A.music();
  for (let i = 0; i < 6; i++) { A.meterReset(); A.play('ui_move'); await wait(400); const m = A.meters(); ui.push({ how: 'play ui_move', uiPk: m.ui.peakDb, music: m.music.rmsDb }); }
  for (let i = 0; i < 6; i++) { A.meterReset(); A.play('ui_confirm'); await wait(400); const m = A.meters(); ui.push({ how: 'play ui_confirm', uiPk: m.ui.peakDb, music: m.music.rmsDb }); }
  return { win, ui, beforeMusic: { state: beforeMusic.state, intensity: beforeMusic.intensity, ducked: beforeMusic.ducked } };
});
const med = (a) => { const s = a.filter((x) => x > -150).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const combat = res.win.filter((w) => w.phase === 'combat' && w.alive > 0);
const margins = combat.map((w) => w.sfxPk - w.music).filter((x) => isFinite(x));
margins.sort((a, b) => a - b);
res.summary = {
  windows: res.win.length, combatWindows: combat.length,
  masterMedian400: med(combat.map((w) => w.master)), masterP10: combat.map((w) => w.master).sort((a, b) => a - b)[Math.floor(combat.length * 0.1)], masterP90: combat.map((w) => w.master).sort((a, b) => a - b)[Math.floor(combat.length * 0.9)],
  musicMedian: med(combat.map((w) => w.music)), sfxPeakMedian: med(combat.map((w) => w.sfxPk)), sfxRmsMedian: med(combat.map((w) => w.sfxRms)),
  marginMedian: margins[Math.floor(margins.length / 2)], marginP10: margins[Math.floor(margins.length * 0.1)], marginMin: margins[0], pctWindowsMarginGe6: Math.round(100 * margins.filter((x) => x >= 6).length / margins.length),
  uiPkMedian: med(res.ui.map((u) => u.uiPk)), uiMusic: med(res.ui.map((u) => u.music)), uiMargin: med(res.ui.map((u) => u.uiPk - u.music)),
  masterPeakMax: Math.max(...combat.map((w) => w.masterPk)),
};
res.errors = errors;
console.log(out('balance', res));
console.log(JSON.stringify(res.summary, null, 1), JSON.stringify(res.beforeMusic), 'errors', errors.length);
await browser.close();
