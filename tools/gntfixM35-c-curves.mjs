// gntfixM35 copy of tools/gntcaudio5-curves.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.1 curves + G3.2 decoupling (partial) — AudioParam dB and testTone RMS on the tap and on the critic's destination tap.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('menu=0&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 200, { timeout: 120000 });
await sleep(1500);
const res = await page.evaluate(async () => {
  const E = window.__echoes, A = E.audio, S = E.settings; const T = window.__gntTap;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const table = { linear: [-Infinity, -12.04, -6.02, -2.5, 0], log: [-Infinity, -20, -10, -4.15, 0] };
  const L = [0, 0.25, 0.5, 0.75, 1];
  const rows = [];
  // isolate: mute music, ambient, ui; sfx/music reference 1.0 linear
  const setAll = () => { for (const c of ['master','music','sfx','ambient','ui']) { S.set(`audio.${c}.mode`, 'linear'); S.set(`audio.${c}.level`, 1); S.set(`audio.${c}.muted`, false); } S.set('audio.ambient.muted', true); S.set('audio.ui.muted', true); };
  const tt0 = A.testTone('sfx', { ms: 200, dbfs: -18 });
  const ttInfo = JSON.stringify(tt0);
  for (const ch of ['master', 'music', 'sfx']) {
    for (const mode of ['linear', 'log']) {
      for (let i = 0; i < L.length; i++) {
        setAll();
        if (ch !== 'music') S.set('audio.music.muted', true);
        S.set(`audio.${ch}.mode`, mode); S.set(`audio.${ch}.level`, L[i]);
        await wait(350);
        const toneBus = ch === 'music' ? 'music' : 'sfx';
        const tap = ch === 'master' ? 'master' : ch;
        if (ch === 'music') { A.setMusic && A.setMusic('silence', { crossfadeSec: 0.05 }); }
        await wait(ch === 'music' ? 400 : 0);
        A.testTone(toneBus, { ms: 1400, dbfs: -18, freq: 440 });
        await wait(300);
        A.meterReset(); T.reset();
        await wait(900);
        const m = A.meter(tap); const bg = A.busGain(ch); const bs = A.buses()[ch];
        const d = T.read();
        rows.push({ ch, mode, s: L[i], storedLevel: S.get(`audio.${ch}.level`), storedMode: S.get(`audio.${ch}.mode`), paramDb: bg && bg.db, param: bg && bg.param, busGainDb: bs.gainDb, expectDb: table[mode][i], tapRmsDb: m.rmsDb, tapPeakDb: m.peakDb, destRmsDb: d && d.rmsDb });
        await wait(300);
      }
    }
  }
  // restore music
  A.releaseMusic && A.releaseMusic();
  return { ttInfo, rows };
});
// derive errors vs table (relative to s=1 for tone)
const byKey = {};
for (const r of res.rows) { (byKey[r.ch + '/' + r.mode] ||= []).push(r); }
const summary = [];
for (const [k, rs] of Object.entries(byKey)) {
  const ref = rs.find((r) => r.s === 1);
  for (const r of rs) {
    const toneRel = r.tapRmsDb - ref.tapRmsDb; const destRel = r.destRmsDb != null && ref.destRmsDb != null ? r.destRmsDb - ref.destRmsDb : null;
    summary.push({ k, s: r.s, expect: r.expectDb, paramDb: r.paramDb, paramErr: isFinite(r.expectDb) ? +(r.paramDb - r.expectDb).toFixed(3) : r.paramDb, toneRel: +toneRel.toFixed(2), toneErr: isFinite(r.expectDb) ? +(toneRel - r.expectDb).toFixed(2) : +toneRel.toFixed(1), destRel: destRel == null ? null : +destRel.toFixed(2), tapAbs: r.tapRmsDb });
  }
}
const f = out('curves', { res, summary, errors });
console.log(f); console.table(summary);
console.log('ttInfo', res.ttInfo, 'errors', errors.length);
await browser.close();
