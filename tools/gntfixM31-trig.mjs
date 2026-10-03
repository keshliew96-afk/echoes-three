// Fix builder M3 round 1 — in-page cost of one cue request through the engine's public play()
// (trigger: cooldown check, voice slot, baked/live start, cueLog, `sound` event), baked vs live.
// Rotates over 20 hot cues so no request hits its cooldown. Block-timed (the page timer is 100 us).
//   node tools/gntfixM31-trig.mjs
import { launchEchoes } from './gnt-arch-browser.mjs';

const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=17&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 12000));
  const r = await page.evaluate(async () => {
    const a = window.__echoes.audio;
    const cues = ['impact', 'hurt', 'shoot', 'swing', 'bow', 'spit', 'bite', 'kill', 'crit', 'heal', 'bolt', 'whiff', 'telegraph', 'shimmer', 'zone_pulse', 'aura', 'sparkle', 'dodge', 'bounce', 'mark'];
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    async function run(label, extra = {}) {
      const per = [];
      for (let k = 0; k < 15; k++) {
        await sleep(150); // cooldowns and voices clear
        const t0 = performance.now();
        for (let i = 0; i < cues.length; i++) a.play(cues[i], { x: (i % 5) - 2, z: 1, gainDb: -30, ...extra });
        per.push(((performance.now() - t0) / cues.length) * 1000);
      }
      per.sort((x, y) => x - y);
      return { label, p50us: Math.round(per[7]), minUs: Math.round(per[0]), maxUs: Math.round(per[14]) };
    }
    const baked = await run('baked');
    const noEmit = await run('baked-noemit', { emit: false });
    const flat = await run('baked-flat', { x: undefined, z: undefined });
    const flatNoEmit = await run('baked-flat-noemit', { x: undefined, z: undefined, emit: false });
    a.bakeEnabled(false);
    const live = await run('live');
    a.bakeEnabled(true);
    return { baked, noEmit, flat, flatNoEmit, live };
  });
  console.log(JSON.stringify(r));
} finally {
  await browser.close();
}
