// gntfixM4a3 — boot-param check: ?seed=7&menu=0 must land in camp with the sim ticking.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const url = process.argv[2] || 'http://127.0.0.1:5199/?seed=7&menu=0';
const b = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(b, url);
  const out = [];
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    out.push(await page.evaluate(() => ({ tick: window.__echoes.tick, app: window.__echoes.app && window.__echoes.app.state, params: location.search })));
  }
  console.log(JSON.stringify({ url, out, errors }));
} finally { await b.close(); }
