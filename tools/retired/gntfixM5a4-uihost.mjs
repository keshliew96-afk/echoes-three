// gntfixM5a4-uihost.mjs — fix-M5a r4: debug the real-UI "Multiplayer -> Host a Game" path used by
// the critic's hidden-start probe (body text, net state and net log over 10 s after the click).
import { openClient, closeClient, sleep, waitFor, PREVIEW, WS, shot } from './gntcnet4-lib.mjs';
const port = Number(process.argv[2] || 7896);
const c = await openClient(PREVIEW + `?net=${encodeURIComponent(WS(port))}&netname=UiHost`, { tag: 'ui' });
async function clickText(page, re) { const box = await page.evaluate((src, flags) => { const rx = new RegExp(src, flags); const els = [...document.querySelectorAll('button, [role="button"], li, a, div, span')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && rx.test((e.innerText || '').trim()); }); els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height); const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: e.tagName, dis: !!e.disabled, cls: e.className }; }, re.source, re.flags); if (box) await c.page.mouse.click(box.x, box.y); return box; }
try {
  await waitFor(c.page, () => /press any key/i.test(document.body.innerText || '') || (window.__echoes && window.__echoes.app && window.__echoes.app.state === 'title'), { timeout: 120000 });
  await sleep(500);
  if (await c.page.evaluate(() => window.__echoes.app.state !== 'title')) await c.page.keyboard.press('Enter');
  await waitFor(c.page, () => window.__echoes.app.state === 'title', { timeout: 20000 });
  console.log('mp', JSON.stringify(await clickText(c.page, /^multiplayer$/i)));
  for (let i = 0; i < 12; i++) {
    await sleep(500);
    const s = await c.page.evaluate(() => ({ net: window.__echoes.net.state, code: window.__echoes.net.code, body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300) }));
    console.log(i, JSON.stringify(s));
    if (i === 3) console.log('host click', JSON.stringify(await clickText(c.page, /^host a game$/i)));
  }
  console.log(JSON.stringify(await c.page.evaluate(() => window.__echoes.net.log(20))).slice(0, 2500));
  await shot(c, 'gntfixM5a4-uihost.png');
} finally { await closeClient(c); }
