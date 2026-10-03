// gntfixCAMPAIGN6 — quick three.js object census of a booted page (sanity check of the lib census).
// usage: node tools/gntfixCAMPAIGN6-censusquick.mjs [--base URL] [--q '?menu=0&seed=7&fresh=1']
import { launch, open, sleep, threeCensus, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
const base = ARGS.base || 'http://127.0.0.1:4381/';
const browser = await launch({ autoplay: true });
try {
  const { page, errors, cdp } = await open(browser, base + (ARGS.q || '?menu=0&seed=7&fresh=1'));
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
  await sleep(+(ARGS.wait || 3000));
  const c = await threeCensus(cdp);
  for (const k of ['mat', 'geo', 'tex']) {
    const g = c[k];
    if (!g || !g.groups) { console.log(k, JSON.stringify(g)); continue; }
    console.log(k, 'total', g.total, 'scenes', g.scenes);
    for (const [key, n] of Object.entries(g.groups).sort((a, b) => b[1] - a[1]).slice(0, +(ARGS.top || 12))) console.log('  ', String(n).padStart(5), key.slice(0, 160));
  }
  console.log('pageErrors', errors.length);
} finally { await browser.close(); }
