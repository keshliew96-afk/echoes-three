// gntM3 boot probe: engine boots (autoplay flag), graph + music live, 0 errors.
import { openAudio, ev, sleep, summarizeErrors, out, BASE } from './gntM3-lib.mjs';
const url = process.argv[2] || `${BASE}?menu=0&seed=7`;
const { browser, page, errors, consoleLines } = await openAudio(url);
await sleep(4000);
const r = await ev(page, () => {
  const A = window.__echoes.audio;
  return {
    v: window.__echoes.version, state: A.state, autoplay: A.autoplay(), buses: A.buses(), master: A.busGain('master'), music: A.busGain('music'),
    musicState: A.music(), amb: A.ambient(), voices: A.voices(), cost: A.cost(), limiter: A.limiter(),
    meters: Object.fromEntries(Object.entries(A.meters() || {}).map(([k, v]) => [k, { rms: v.rmsDb, peak: v.peakDb, s: v.seconds }])),
    log: A.cueLog(8), sounds: window.__echoes.events.filter((e) => e.type === 'sound').slice(-5),
  };
});
out({ url, ...r, ...summarizeErrors(errors, consoleLines) });
await browser.close();
