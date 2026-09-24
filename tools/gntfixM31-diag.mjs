// Fix builder M3 round 1 — quick boot diagnostic: loads the game with the autoplay flag, waits,
// prints page errors, console errors and the audio engine's state / bake / cost / voices.
//   node tools/gntfixM31-diag.mjs [--url U] [--wait 15000] [--room 8]
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL = arg('--url', 'http://127.0.0.1:5199/?menu=0&seed=17&fresh=1');
const WAIT = +arg('--wait', 15000);
const ROOM = arg('--room', null);
const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  const cons = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning' || /audio/i.test(m.text())) cons.push(`[${m.type()}] ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const t0 = Date.now();
  let st = null;
  while (Date.now() - t0 < WAIT) {
    await new Promise((r) => setTimeout(r, 1000));
    st = await page
      .evaluate(() => {
        const E = window.__echoes;
        if (!E) return { echoes: false };
        const a = E.audio;
        return { echoes: true, tick: E.tick, version: E.version, audio: a ? a.state : null, bake: a && a.bake ? a.bake() : null, music: a && a.music ? a.music().state : null };
      })
      .catch((e) => ({ evalError: String(e.message || e) }));
    console.log(Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(st).slice(0, 600));
    if (ROOM && st && st.tick > 200 && !globalThis.__roomed) {
      globalThis.__roomed = true;
      await page.evaluate((r) => window.__echoes.cmd('skipToRoom', +r), ROOM);
    }
  }
  const fin = await page.evaluate(() => {
    const a = window.__echoes && window.__echoes.audio;
    return a ? { cost: a.cost(), voices: a.voices(), music: a.music() } : null;
  });
  console.log('FINAL', JSON.stringify(fin).slice(0, 3000));
  console.log('ERRORS', JSON.stringify(errors));
  console.log('CONSOLE', JSON.stringify(cons.slice(0, 20)));
} finally {
  await browser.close();
}
