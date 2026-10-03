// gntM3: music RMS vs intensity per themed state (through the glue compressor, unity sliders).
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const { browser, page } = await openAudio(`${BASE}?menu=0&seed=7`);
await sleep(3000);
const rows = [];
for (const [st, th] of [['combat', 'wood'], ['combat', 'barrow'], ['boss', 'wood']]) {
  for (const i of [0, 0.3, 0.6, 1]) {
    const r = await ev(
      page,
      async (st, th, i) => {
        const S = window.__echoes.settings;
        for (const ch of ['master', 'music']) {
          S.set(`audio.${ch}.mode`, 'log');
          S.set(`audio.${ch}.level`, 1);
          S.set(`audio.${ch}.muted`, false);
        }
        S.set('audio.muteOnBlur', false);
        const A = window.__echoes.audio;
        A.setMusic(st, { theme: th, bed: null, crossfadeSec: 0.1, intensity: i });
        await new Promise((r) => setTimeout(r, 1800));
        A.meterReset();
        await new Promise((r) => setTimeout(r, 5000));
        const m = A.meter('music');
        return { rms: m.rmsDb, peak: m.peakDb, comp: A.musicCompReduction(), inten: A.music().intensity };
      },
      st,
      th,
      i
    );
    rows.push({ st, th, i, ...r });
    process.stderr.write(`${JSON.stringify(rows[rows.length - 1])}\n`);
  }
}
out(rows);
await browser.close();
