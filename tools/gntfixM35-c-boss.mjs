// gntfixM35 copy of tools/gntcaudio5-boss.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.3 no clipping in a boss fight with >= 6 adds at 100% sliders; voices; leak after the fight.
import { bootTap, out, sleep } from './gntfixM35-lib.mjs';
const SLIDER = process.argv[2] === 'default' ? 'default' : 'max';
const { browser, page, errors } = await bootTap('level=1&seed=7&partygrant=1');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 120000 });
await sleep(3000);
const res = await page.evaluate(async (SLIDER) => {
  const E = window.__echoes, A = E.audio, S = E.settings, T = window.__gntTap;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (SLIDER === 'max') for (const c of ['master', 'music', 'sfx', 'ambient', 'ui']) { S.set(`audio.${c}.mode`, 'log'); S.set(`audio.${c}.level`, 1); }
  E.cmd('skipToRoom', 8);
  await wait(2500);
  E.cmd('autopilot', true);
  const types = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
  const spawnRes = [];
  const spawnAdds = (n) => { const b = E.state().party?.[0] || { x: 0, z: 0 }; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; try { spawnRes.push(E.cmd('spawn', types[i % types.length], Math.cos(a) * 6, Math.sin(a) * 5, { hpMul: 4 })); } catch (e) { spawnRes.push('ERR ' + e.message); } } };
  spawnAdds(8);
  await wait(500);
  A.meterReset(); T.reset(); A.cueLogClear && A.cueLogClear();
  const samples = [];
  const t0 = performance.now();
  let lastSpawn = t0, bossPushed = 0, maxGR = 0;
  while (performance.now() - t0 < 50000) {
    const s = E.state(); const alive = (s.enemies || []).filter((e) => !e.dead && (e.hp == null || e.hp > 0)).length;
    const lim = A.limiter(); const v = A.voices();
    samples.push({ t: Math.round(performance.now() - t0), alive, boss: s.run?.boss?.pct, gr: lim.reductionDb, voices: v.active, music: A.music().state });
    if (lim.reductionDb < maxGR) maxGR = lim.reductionDb;
    if (alive < 7 && performance.now() - lastSpawn > 3000) { spawnAdds(6); lastSpawn = performance.now(); }
    if (performance.now() - t0 > 15000 && bossPushed === 0) { E.cmd('bossHp', 0.55); bossPushed = 1; }
    if (performance.now() - t0 > 30000 && bossPushed === 1) { E.cmd('bossHp', 0.3); bossPushed = 2; }
    if (s.run?.boss && s.run.boss.hp < 400) E.cmd('bossHp', 0.5);
    await wait(100);
  }
  const m = A.meters(); const lim = A.limiter(); const d = T.read(); const v = A.voices();
  const log = A.cueLog(4000); const byCue = {}; for (const c of log) byCue[c.cue] = (byCue[c.cue] || 0) + 1;
  // leak check: end the fight
  E.cmd('autopilot', false); E.cmd('killAllEnemies'); try { E.cmd('bossHp', 0.0, true); } catch {} try { E.cmd('killBoss'); } catch {}
  const leak = [];
  const tEnd = performance.now();
  for (let i = 0; i < 40; i++) { await wait(100); leak.push([Math.round(performance.now() - tEnd), A.voices().active, (E.state().enemies || []).length]); }
  const alive = samples.map((s) => s.alive).sort((a, b) => a - b);
  return {
    slider: SLIDER, buses: A.buses(), spawnRes: spawnRes.slice(0, 4), spawns: spawnRes.length,
    aliveMin: alive[0], aliveP10: alive[Math.floor(alive.length * 0.1)], aliveMedian: alive[Math.floor(alive.length / 2)],
    prelimit: m.prelimit, master: m.master, sfx: m.sfx, music: m.music, ui: m.ui, limiter: lim, maxGRsampled: maxGR, dest: d, voices: v, byCue, cues: log.length,
    leak, samplesHead: samples.filter((_, i) => i % 25 === 0), bossEnd: E.state().run?.boss,
  };
}, SLIDER);
res.errors = errors;
console.log(out('boss-' + SLIDER, res));
const p = res.prelimit, L = res.limiter;
console.log(JSON.stringify({ slider: res.slider, aliveMin: res.aliveMin, aliveP10: res.aliveP10, aliveMed: res.aliveMedian, prelimit: { peak: p.peakDb, over1: p.overMinus1Pct, clip: p.clipCount, rms: p.rmsDb, med400: p.medianRms400Db, samples: p.samples, lost: p.lostSamples }, master: { peak: res.master.peakDb, rms: res.master.rmsDb, med400: res.master.medianRms400Db, p10: res.master.p10Rms400Db, p90: res.master.p90Rms400Db }, sfx: { peak: res.sfx.peakDb, rms: res.sfx.rmsDb, med: res.sfx.medianRms400Db, p90: res.sfx.p90Rms400Db }, music: { rms: res.music.rmsDb, med: res.music.medianRms400Db, peak: res.music.peakDb }, limiter: L, dest: res.dest, voices: res.voices, cues: res.cues, errors: res.errors }, null, 1));
console.log('byCue', JSON.stringify(res.byCue));
console.log('leak', JSON.stringify(res.leak.filter((_, i) => i % 5 === 0)));
await browser.close();
