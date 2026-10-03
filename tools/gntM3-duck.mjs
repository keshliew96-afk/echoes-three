// gntM3: the pause duck — a blocking overlay while playing ducks the score
// (-5 dB + 1.3 kHz low-pass) and releases it on close; the title never ducks.
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7`);
await sleep(4000);
const read = () => ev(page, () => ({ ducked: window.__echoes.audio.music().ducked, stack: window.__echoes.app.stack(), music: window.__echoes.audio.music().state, rms: window.__echoes.audio.meter('music').shortRmsDb }));
const a = await read();
await ev(page, () => {
  window.__echoes.app.open('settings', { tab: 'audio' });
  return true;
});
await sleep(1200);
const b = await read();
await ev(page, () => {
  window.__echoes.app.back();
  return true;
});
await sleep(1200);
const c = await read();
out({ before: a, overlay: b, after: c, pass: !a.ducked && b.ducked && !c.ducked && b.rms < a.rms, errors });
await browser.close();
