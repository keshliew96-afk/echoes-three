// gntfixM35 — the shop shelf with the keyboard card focus (PLAN §16.4) at several window sizes:
// screenshot + the hint / lamp / button boxes (overlap and clip check against the page box).
// Usage: node tools/gntfixM35-shopshot.mjs [WxH ...]   (default 1024x576 1600x900 2560x1440)
import { bootTap, out, sleep, shotPath } from './gntfixM35-lib.mjs';
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['1024x576', '1600x900', '2560x1440']).map((s) => s.split('x').map(Number));
const res = [];
for (const [w, h] of sizes) {
  const { browser, page, errors } = await bootTap('level=1&seed=7', { width: w, height: h });
  await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
  await sleep(1500);
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
  await page.waitForFunction(() => window.__echoes.state().run?.phase === 'shop', { timeout: 30000 });
  await sleep(1500);
  const measure = () => page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const pageEl = q('#run-screen .rn-shop');
    const hl = q('#run-screen .rn-hint-l'), hr = q('#run-screen .rn-hint-r'), lamp = q('#run-screen .rn-advance');
    const P = box(pageEl), L = box(hl), R = box(hr), A = box(lamp);
    const inside = (b) => b && P && b.x >= P.x - 1 && b.y >= P.y - 1 && b.x + b.w <= P.x + P.w + 1 && b.y + b.h <= P.y + P.h + 1;
    const overlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const bar = box(document.querySelector('#hud .cb-bar, #hud [class*="command"]'));
    return { page: P, hintL: L, hintR: R, lamp: A, hintLText: hl?.textContent, hintRText: hr ? ([...hr.children].find((c) => c.style.visibility !== 'hidden') || hr).textContent : null, inside: { hintL: inside(L), hintR: inside(R), lamp: inside(A) }, overlap: { lHintLamp: overlap(L, A), rHintLamp: overlap(R, A) }, pageBottom: P ? P.y + P.h : null, win: [innerWidth, innerHeight], focus: window.__echoes.runUi().shop.focus };
  });
  const lampState = await measure();
  await page.keyboard.press('KeyD'); await sleep(250); await page.keyboard.press('KeyD'); await sleep(400);
  const cardState = await measure();
  await page.screenshot({ path: shotPath(`shop-${w}x${h}`) });
  res.push({ size: `${w}x${h}`, lampState, cardState, errors });
  console.log(`${w}x${h}`, JSON.stringify({ lamp: { inside: lampState.inside, overlap: lampState.overlap, hL: lampState.hintL, hR: lampState.hintR, page: lampState.page }, card: { focus: cardState.focus, inside: cardState.inside, overlap: cardState.overlap, hR: cardState.hintR, text: cardState.hintRText, page: cardState.page } }), 'errors', errors.length);
  await browser.close();
}
console.log(out('shopshot', res));
