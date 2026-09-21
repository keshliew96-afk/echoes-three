// gntM3 shared helpers for the audio probes (M3 builder). Uses the ARCH
// launcher read-only. Every eval is wrapped so HMR reloads (other builders
// edit src/** concurrently) are retried instead of reported as defects.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

export const BASE = process.env.ECHOES_URL || 'http://127.0.0.1:5199/';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openAudio(url, { autoplay = true, width = 1600, height = 900, gpu = false } = {}) {
  const browser = await launchEchoes({ gpu, autoplay, width, height });
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const o = await openEchoes(browser, url, { width, height });
      // Menu-skip boots tick the sim; title boots and ?freeze=1 hold it at tick 0.
      await o.page.waitForFunction(
        () => window.__echoes && window.__echoes.audio && (window.__echoes.tick > 30 || (window.__echoes.app && window.__echoes.app.state === 'title') || (window.__echoes.sim && window.__echoes.sim.frozen)),
        { timeout: 120000 }
      );
      return { browser, ...o };
    } catch (e) {
      lastErr = e;
      await sleep(1500);
    }
  }
  await browser.close();
  throw lastErr;
}

// Evaluate with retries across HMR reloads (navigation destroys the context).
export async function ev(page, fn, ...args) {
  let err = null;
  for (let i = 0; i < 4; i++) {
    try {
      // 90 s guard: a navigation (HMR reload) can strand an awaited evaluate.
      let timer;
      const guard = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('evaluate guard timeout (context lost?)')), 90000);
      });
      try {
        return await Promise.race([page.evaluate(fn, ...args), guard]);
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      err = e;
      if (!/context|navigat|Target closed|detached|guard timeout/i.test(String(e && e.message))) throw e;
      await sleep(1500);
      try {
        await page.waitForFunction(() => window.__echoes && window.__echoes.audio, { timeout: 60000 });
      } catch {
        /* retry */
      }
    }
  }
  throw err;
}

export function summarizeErrors(errors, consoleLines) {
  const warn = consoleLines.filter((l) => /^\[(error|warning|warn)\]/.test(l) && !/X3595|X4000|GPU stall|WebGL|GL Driver|ReadPixels/i.test(l));
  return { pageErrors: errors.length, errors: errors.slice(0, 5), consoleWarnErr: warn.slice(0, 10), consoleWarnErrCount: warn.length };
}

export function out(obj) {
  console.log(JSON.stringify(obj, null, 1));
}
