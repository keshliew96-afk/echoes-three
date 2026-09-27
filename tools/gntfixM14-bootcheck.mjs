// fix-M1-r4: which app state does a harness boot land in? (?seed=7&menu=0 must be 'playing', no title)
import { launch, open, sleep, URL_BASE } from './gntfixM14-lib.mjs';
const q = process.argv[2] || '?seed=7&menu=0';
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + q, { width: 1280, height: 720 });
  for (let i = 0; i < 12; i++) {
    const s = await page.evaluate(() => ({ v: window.__echoes && window.__echoes.version, app: window.__echoes && window.__echoes.app && window.__echoes.app.state, stack: window.__echoes && window.__echoes.app && window.__echoes.app.stack(), tick: window.__echoes && window.__echoes.tick, href: location.href, params: window.__echoes && window.__echoes.app && window.__echoes.app.params && { menuSkip: window.__echoes.app.params.menuSkip, menu: window.__echoes.app.params.menu } }));
    console.log(JSON.stringify(s));
    if (s.app === 'playing' && s.tick > 60) break;
    await sleep(1000);
  }
  console.log('errors', JSON.stringify(errors));
} finally { await browser.close(); }
