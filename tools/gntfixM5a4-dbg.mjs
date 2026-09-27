// gntfixM5a4-dbg.mjs — fix-M5a r4 quick debug: host via API on a page, print net state/log.
import { openClient, closeClient, sleep, waitFor } from './gntcnet4-lib.mjs';
const base = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const port = Number(process.env.GNTCNET4_PORT || 7896);
const c = await openClient(base + `?net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}&netname=Dbg`, { tag: 'dbg' });
try {
  await waitFor(c.page, () => window.__echoes && window.__echoes.app && (window.__echoes.app.state === 'title' || /press any key/i.test(document.body.innerText || '')), { timeout: 120000 });
  await sleep(500);
  if (await c.page.evaluate(() => window.__echoes.app.state !== 'title')) await c.page.keyboard.press('Enter');
  await sleep(500);
  const r = await c.page.evaluate(async () => { try { const x = await window.__echoes.net.host({ visibility: 'private' }); return { x, st: window.__echoes.net.state }; } catch (e) { return { err: String(e.stack || e) }; } });
  console.log(JSON.stringify(r).slice(0, 2000));
  await sleep(1000);
  console.log(await c.page.evaluate(() => JSON.stringify({ st: window.__echoes.net.state, code: window.__echoes.net.code, ver: window.__echoes.version })));
  console.log(c.consoleLines.filter((l) => /net|error|warn/i.test(l)).slice(-20).join('\n'));
} finally { await closeClient(c); }
