// gntM3: in-page determinism check with the audio engine running (autoplay
// flag, so it is live): ?seed=7&scene=arena&room=kill_all&freeze=1 then
// __echoes.sim.trace(600, 3) must equal the documented reference
// (8e8d6fd519dca899 / 817f1e9940c91d76, TESTING.md) on two loads.
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const res = [];
for (let i = 0; i < 2; i++) {
  const { browser, page, errors } = await openAudio(`${BASE}?seed=7&scene=arena&room=kill_all&freeze=1`, { gpu: false });
  await page.waitForFunction(() => window.__echoes && window.__echoes.sim && window.__echoes.audio, { timeout: 120000 });
  await sleep(5000);
  const r = await ev(page, () => {
    const t = window.__echoes.sim.trace(600, 3);
    return { stateHash: t.stateHash, eventsHash: t.eventsHash, eventCount: t.eventCount, audio: window.__echoes.audio.state, sounds: window.__echoes.events.filter((e) => e.type === 'sound').length };
  });
  res.push({ ...r, pageErrors: errors.length });
  await browser.close();
}
out({ res, pass: res.every((r) => r.stateHash === '8e8d6fd519dca899' && r.eventsHash === '817f1e9940c91d76') });
