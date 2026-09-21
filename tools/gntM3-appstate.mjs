// gntM3: report app state / params for a URL (diagnostic).
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const url = process.argv[2] || `${BASE}?seed=7&menu=0`;
const { browser, page, errors, consoleLines } = await openAudio(url);
await sleep(4000);
out(await ev(page, () => ({ url: location.href, app: window.__echoes.app.state, stack: window.__echoes.app.stack(), tick: window.__echoes.tick, fps: window.__echoes.fps, audio: window.__echoes.audio.state, ap: window.__echoes.audio.autoplay(), music: window.__echoes.audio.music().state, frame: window.__echoes.app.frameStats && window.__echoes.app.frameStats(), paused: window.__echoes.app.simPaused ? window.__echoes.app.simPaused() : 'n/a', vis: document.visibilityState, focus: document.hasFocus() })));
out({ errors, consoleLines: consoleLines.slice(-15) });
await browser.close();
