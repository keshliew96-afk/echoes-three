// gntfixM35 copy of tools/gntcaudio5-zipper.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// B18 zipper/click check: raw output samples around an abrupt slider jump (1.0 -> 0.25 linear) on a steady tone; title nav ticks vs the menu score.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const res = {};
{
  const { browser, page, errors } = await bootTap('menu=0&seed=7');
  await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 200, { timeout: 180000 });
  await sleep(2000);
  res.zip = await page.evaluate(async () => {
    const E = window.__echoes, A = E.audio, S = E.settings;
    for (const c of ['music', 'ambient', 'ui']) S.set(`audio.${c}.muted`, true);
    S.set('audio.sfx.mode', 'linear'); S.set('audio.sfx.level', 1); S.set('audio.master.mode', 'linear'); S.set('audio.master.level', 1);
    await new Promise((r) => setTimeout(r, 600));
    // capture raw samples via a dedicated recorder on the same destination feed: an AnalyserNode time-domain read every block is too coarse, so use a worklet-free MediaStream? -> use our ScriptProcessor blocks' peak per block + a second fine analyser
    const ctx = window.__gntTap.ctxs[0].an.context;
    const an = window.__gntTap.ctxs[0].an; // fftSize 8192 = 170 ms window at 48 kHz
    A.testTone('sfx', { freq: 200, dbfs: -12, ms: 3000 });
    await new Promise((r) => setTimeout(r, 800));
    const buf = new Float32Array(an.fftSize);
    // schedule the jump and grab the window that contains it
    S.set('audio.sfx.level', 0.25); const tJump = ctx.currentTime;
    await new Promise((r) => setTimeout(r, 120));
    an.getFloatTimeDomainData(buf); const tRead = ctx.currentTime;
    // envelope per 1 ms (48 samples): peak |x|; max sample-to-sample delta relative to a pure 200 Hz sine's max slope
    const env = []; for (let i = 0; i < buf.length; i += 48) { let p = 0; for (let j = i; j < i + 48 && j < buf.length; j++) p = Math.max(p, Math.abs(buf[j])); env.push(+p.toFixed(4)); }
    let maxD = 0; for (let i = 1; i < buf.length; i++) maxD = Math.max(maxD, Math.abs(buf[i] - buf[i - 1]));
    const amp0 = Math.max(...env.slice(0, 20)); const sineMaxSlope = amp0 * 2 * Math.PI * 200 / ctx.sampleRate;
    // 10%-90% fall time in ms
    const hi = env[0], lo = env[env.length - 1]; const t90 = env.findIndex((v) => v < lo + 0.9 * (hi - lo)); const t10 = env.findIndex((v) => v < lo + 0.1 * (hi - lo));
    return { sr: ctx.sampleRate, envHead: env.slice(0, 5), envTail: env.slice(-5), fall10to90Ms: t10 - t90, maxDelta: +maxD.toFixed(5), sineMaxSlope: +sineMaxSlope.toFixed(5), ratio: +(maxD / sineMaxSlope).toFixed(3), windowMs: Math.round(buf.length / ctx.sampleRate * 1000), readLagMs: Math.round((tRead - tJump) * 1000) };
  });
  res.zipErrors = errors;
  await browser.close();
}
{
  const { browser, page, errors } = await bootTap('fresh=1');
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 180000 }); await sleep(3000);
  const ticks = [];
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.__echoes.audio.meterReset());
    await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown'); await sleep(420);
    ticks.push(await page.evaluate(() => { const m = window.__echoes.audio.meters(); return { uiPk: m.ui.peakDb, music: m.music.rmsDb, musicPk: m.music.peakDb, cue: (window.__echoes.audio.cueLog(1)[0] || {}).cue }; }));
    await sleep(250);
  }
  res.title = ticks.map((t) => ({ ...t, margin: +(t.uiPk - t.music).toFixed(2) }));
  res.titleErrors = errors;
  await browser.close();
}
console.log(out('zipper', res));
console.log(JSON.stringify(res.zip)); console.table(res.title);
