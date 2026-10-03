// gntfixM35 copy of tools/gntcaudio5-uicues.mjs (the round-5 audio critic's probe, logic unchanged;
// own port + outputs via tools/gntfixM35-lib.mjs). G3.4 UI clause: every UI-bus cue x6 over live
// combat music at defaults (engine.play), UI-tap peak vs music-tap RMS in the same 450 ms window.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=1&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(4000);
const rows = await page.evaluate(async () => {
  const A = window.__echoes.audio; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cues = ['ui_move', 'ui_confirm', 'ui_back', 'ui_tab', 'ui_slider', 'ui_toggle', 'ui_deny', 'ui_blip', 'room_start', 'wave_start', 'room_clear', 'reward', 'draft_take', 'draft_decline', 'path', 'shop_open', 'purchase', 'deny', 'glint', 'socket', 'unsocket', 'node_grant'];
  const out = [];
  for (const c of cues) { const m = []; for (let i = 0; i < 6; i++) { A.meterReset(); A.play(c); await wait(450); const ms = A.meters(); m.push([ms.ui.peakDb, ms.music.rmsDb, ms.sfx.peakDb]); await wait(120); }
    const margins = m.map((x) => x[0] - x[1]).sort((a, b) => a - b); const bus = (A.cueLog(1)[0] || {}).bus;
    out.push({ cue: c, bus, uiPkMed: m.map((x) => x[0]).sort((a, b) => a - b)[3], musicMed: m.map((x) => x[1]).sort((a, b) => a - b)[3], marginMin: +margins[0].toFixed(2), marginMed: +margins[3].toFixed(2), ge3: margins.filter((x) => x >= 3).length + '/6', music: A.music().state }); }
  return out;
});
console.log(out('uicues', { rows, errors })); console.table(rows);
await browser.close();
