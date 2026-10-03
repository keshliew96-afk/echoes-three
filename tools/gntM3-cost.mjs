// gntM3 cost probe: engine main-thread time per frame in camp and combat.
import { openAudio, ev, sleep, summarizeErrors, out, BASE } from './gntM3-lib.mjs';
const url = process.argv[2] || `${BASE}?menu=0&seed=7`;
const { browser, page, errors, consoleLines } = await openAudio(url, { gpu: process.argv.includes('--gpu') });
await sleep(6000);
await ev(page, () => window.__echoes.audio.costReset());
await sleep(5000);
const camp = await ev(page, () => ({ cost: window.__echoes.audio.cost(), fps: window.__echoes.fps }));
await ev(page, () => { window.__echoes.cmd('startRun'); return true; });
await sleep(2500);
await ev(page, () => window.__echoes.audio.costReset());
await sleep(8000);
const combat = await ev(page, () => ({ cost: window.__echoes.audio.cost(), fps: window.__echoes.fps, voices: window.__echoes.audio.voices(), music: window.__echoes.audio.music().state, phase: window.__echoes.state().run.phase }));
out({ camp, combat, ...summarizeErrors(errors, consoleLines) });
await browser.close();
