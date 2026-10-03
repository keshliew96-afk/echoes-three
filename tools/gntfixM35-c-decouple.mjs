// gntfixM35 copy of tools/gntcaudio5-decouple.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.2 decoupling + master/channel mute, measured on engine taps AND the critic's destination FFT/RMS.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('menu=0&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 200, { timeout: 120000 });
await sleep(2500);
const res = await page.evaluate(async () => {
  const E = window.__echoes, A = E.audio, S = E.settings, T = window.__gntTap;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { connects: T.connects, ctxs: T.ctxs.length, steps: [] };
  const snap = async (label) => {
    await wait(350); A.meterReset(); T.reset(); await wait(700);
    const m = A.meters(); const d = T.read();
    const r = { label, sfxTap: m.sfx.rmsDb, musicTap: m.music.rmsDb, ambTap: m.ambient.rmsDb, masterTap: m.master.rmsDb, dest: d && d.rmsDb, destPeak: d && d.peakDb, bin3k: await T.bin(3000, 8), bin1k: await T.bin(1000, 8), music: A.music().state };
    out.steps.push(r); return r;
  };
  for (const c of ['master', 'music', 'sfx', 'ambient', 'ui']) S.set(`audio.${c}.mode`, 'log');
  S.set('audio.master.level', 0.8); S.set('audio.music.level', 1); S.set('audio.sfx.level', 1);
  // A: real camp music playing + an SFX tone at 3 kHz; Music 100 -> 0 (log), then linear
  A.testTone('sfx', { freq: 3000, dbfs: -18, ms: 9000 });
  await snap('A music=1.0 log (real camp music + sfx 3k tone)');
  S.set('audio.music.level', 0.5); await snap('A music=0.5 log');
  S.set('audio.music.level', 0); await snap('A music=0 log');
  S.set('audio.music.mode', 'linear'); S.set('audio.music.level', 1); await snap('A music=1.0 linear');
  S.set('audio.music.level', 0); await snap('A music=0 linear');
  S.set('audio.music.mode', 'log'); S.set('audio.music.level', 1);
  await wait(2500);
  // B: music tone 1 kHz on the music bus (score pinned silent), SFX 100 -> 0
  A.setMusic('silence', { crossfadeSec: 0.05 }); S.set('audio.ambient.muted', true); await wait(800);
  A.testTone('music', { freq: 1000, dbfs: -18, ms: 9000 });
  await snap('B sfx=1.0 (music 1k tone)');
  A.testTone('sfx', { freq: 3000, dbfs: -18, ms: 7000 });
  await snap('B sfx=1.0 + sfx tone');
  S.set('audio.sfx.level', 0); await snap('B sfx=0 log');
  S.set('audio.sfx.mode', 'linear'); S.set('audio.sfx.level', 0); await snap('B sfx=0 linear');
  S.set('audio.sfx.mode', 'log'); S.set('audio.sfx.level', 1);
  await wait(3000);
  // C: master 1.0 -> 0.5 log with tones on music (1k) and sfx (3k)
  S.set('audio.master.level', 1);
  A.testTone('music', { freq: 1000, dbfs: -18, ms: 9000 }); A.testTone('sfx', { freq: 3000, dbfs: -18, ms: 9000 });
  await snap('C master=1.0');
  S.set('audio.master.level', 0.5); await snap('C master=0.5 log');
  S.set('audio.master.mode', 'linear'); await wait(200); out.masterAfterModeSwitch = { level: S.get('audio.master.level'), db: A.busGain('master').db };
  await snap('C master mode->linear (loudness kept?)');
  S.set('audio.master.mode', 'log'); await wait(200); out.masterBackToLog = { level: S.get('audio.master.level'), db: A.busGain('master').db };
  // D: mutes
  S.set('audio.master.level', 1);
  S.set('audio.music.muted', true); await snap('D music muted');
  S.set('audio.music.muted', false); S.set('audio.master.muted', true); await snap('D master muted');
  out.masterMutedBuses = A.buses().master;
  S.set('audio.master.muted', false); await snap('D master unmuted');
  S.set('audio.master.level', 0); await snap('D master level 0');
  S.set('audio.master.level', 0.8); S.set('audio.ambient.muted', false);
  A.releaseMusic();
  return out;
});
res.errors = errors;
console.log(out('decouple', res));
console.table(res.steps);
console.log(JSON.stringify({ connects: res.connects, ctxs: res.ctxs, a: res.masterAfterModeSwitch, b: res.masterBackToLog, mm: res.masterMutedBuses, errors }));
await browser.close();
