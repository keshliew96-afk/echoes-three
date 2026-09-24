// Fix builder M3 round 1 — in-page cost of building cue recipes (src/audio/cues.js) into an
// OfflineAudioContext vs the realtime context, with the live kit's shared noise tables.
//   node tools/gntfixM31-recipe.mjs
import { launchEchoes } from './gnt-arch-browser.mjs';

const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=17&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
  const r = await page.evaluate(async () => {
    const V = await import('/src/audio/voices.js');
    const C = await import('/src/audio/cues.js');
    const rt = new AudioContext();
    const kit = V.createVoiceKit(rt);
    while (!kit.prewarm());
    const out = {};
    const time = (n, fn) => {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) fn(i);
      return Math.round(((performance.now() - t0) / n) * 1000);
    };
    for (const id of ['impact', 'shoot', 'kill', 'heal', 'telegraph', 'hurt']) {
      const def = C.DEFAULT_CUES[id];
      const off = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 30, sampleRate: 48000 });
      const okit = V.createVoiceKit(off, { shared: kit.buffers });
      const g = off.createGain();
      g.connect(off.destination);
      const warm = time(3, (i) => def.voice(off, i * 0.5, g, { pitch: 1, kit: okit }));
      const offUs = time(40, (i) => def.voice(off, 2 + i * 0.5, g, { pitch: 1, kit: okit }));
      const g2 = rt.createGain();
      g2.gain.value = 0;
      g2.connect(rt.destination);
      const rtUs = time(40, () => def.voice(rt, rt.currentTime + 0.5, g2, { pitch: 1, kit }));
      out[id] = { firstUs: warm, offlineUs: offUs, realtimeUs: rtUs };
    }
    // fresh-context warm-up: second OfflineAudioContext, new kit vs the first kit retargeted
    {
      const def = C.DEFAULT_CUES.impact;
      const o1 = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 30, sampleRate: 48000 });
      const k1 = V.createVoiceKit(o1, { shared: kit.buffers });
      const g1 = o1.createGain();
      g1.connect(o1.destination);
      time(20, (i) => def.voice(o1, i * 0.5, g1, { pitch: 1, kit: k1 }));
      const o2 = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 30, sampleRate: 48000 });
      const g2b = o2.createGain();
      g2b.connect(o2.destination);
      const k2 = V.createVoiceKit(o2, { shared: kit.buffers });
      out.freshCtxNewKitUs = time(3, (i) => def.voice(o2, i * 0.5, g2b, { pitch: 1, kit: k2 }));
      const o3 = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 30, sampleRate: 48000 });
      const g3 = o3.createGain();
      g3.connect(o3.destination);
      k1.setContext(o3);
      out.freshCtxSameKitUs = time(3, (i) => def.voice(o3, i * 0.5, g3, { pitch: 1, kit: k1 }));
      out.freshCtxSameKitNext20Us = time(20, (i) => def.voice(o3, 2 + i * 0.5, g3, { pitch: 1, kit: k1 }));
    }
    rt.close();
    return out;
  });
  console.log(JSON.stringify(r));
} finally {
  await browser.close();
}
