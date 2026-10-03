// Fix builder M3 round 1 — spatial check of the SAMPLER path (baked cue voices panned in the worklet
// with spatial.gains()) against the PannerNode path (the same cue synthesised live, bakeEnabled(false)):
// a cue at listener +6 u / -6 u / 0 / 3 u vs 12 u ahead; L / R RMS read on the sfx tap.
//   node tools/gntfixM31-pan.mjs
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=7&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  await waitReady(page, { minTick: 200 }).catch(() => {});
  const r = await page.evaluate(async () => {
    const A = window.__echoes.audio;
    const S = window.__echoes.settings;
    for (const c of ['master', 'music', 'sfx', 'ambient', 'ui']) {
      S.set(`audio.${c}.mode`, 'log');
      S.set(`audio.${c}.level`, 1);
      S.set(`audio.${c}.muted`, false);
    }
    S.set('audio.ambient.muted', true);
    S.set('audio.muteOnBlur', false);
    A.quiet();
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < 100 && A.bake().pending > 0; i++) await sleep(100);
    await sleep(600);
    const L = A.listener();
    async function measure(dx, dz) {
      A.meterReset();
      // 6 plays spaced past the cooldown and the voice length
      for (let i = 0; i < 6; i++) {
        A.play('telegraph_hit', { x: L.x + dx, z: L.z + dz, exactPitch: true });
        await sleep(160);
      }
      await sleep(300);
      const m = A.meter('sfx');
      return { l: m.lRmsDb, r: m.rRmsDb, rms: m.rmsDb };
    }
    async function suite(label) {
      const p6 = await measure(6, 0);
      const m6 = await measure(-6, 0);
      const c0 = await measure(0, 0);
      const n3 = await measure(0, -3);
      const f12 = await measure(0, -12);
      return { label, plus6RminusL: +(p6.r - p6.l).toFixed(2), minus6LminusR: +(m6.l - m6.r).toFixed(2), centreAbsLR: +Math.abs(c0.l - c0.r).toFixed(2), near3VsFar12Db: +(n3.rms - f12.rms).toFixed(2), centreRms: c0.rms, predict: { plus6: A.predictPan(L.x + 6, L.z), near: A.predictPan(L.x, L.z - 3), far: A.predictPan(L.x, L.z - 12) } };
    }
    const baked = await suite('sampler (baked)');
    const sStats = A.sampler();
    A.bakeEnabled(false);
    const live = await suite('PannerNode (live)');
    A.bakeEnabled(true);
    return { baked, live, sampler: sStats, bake: { keys: A.bake().keys } };
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERRORS', JSON.stringify(errors));
  fs.writeFileSync(path.join(process.cwd(), 'captures', 'gntfixM31-pan.json'), JSON.stringify(r, null, 1));
} finally {
  await browser.close();
}
