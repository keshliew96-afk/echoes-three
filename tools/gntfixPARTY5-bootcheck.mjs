// gntfixPARTY5-bootcheck — the app state a harness URL boots into (menu-skip check).
import { launch, open, E, sleep } from './gntfixPARTY5-lib.mjs';
const urls = process.argv.slice(2);
const b = await launch();
try {
  for (const u of urls) {
    const { page, errors } = await open(b, u, { width: 1280, height: 720, minTick: 0 });
    const out = [];
    for (let i = 0; i < 6; i++) { out.push(await E(page, () => ({ app: window.__echoes.app && window.__echoes.app.state, tick: window.__echoes.tick, mode: window.__echoes.state().vfx && window.__echoes.state().vfx.mode }))); await sleep(1500); }
    console.log(u, JSON.stringify(out), 'errors', errors.length, errors.slice(0, 2));
    await page.close();
  }
} finally { await b.close(); }
