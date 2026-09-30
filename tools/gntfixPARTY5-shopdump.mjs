// gntfixPARTY5-shopdump — the shop's vertical budget per block at one size (seat F3), for the F4 fit work.
import { launch, open, E, sleep, waitFor, shot } from './gntfixPARTY5-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const [W, H] = opt('size', '1024x640').split('x').map(Number);
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const b = await launch();
try {
  const { page } = await open(b, `${BASEURL}?menu=0&seed=7`, { width: W, height: H });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await E(page, () => { window.__echoes.cmd('skipToRoom', 7); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'shop', null, 30000);
  await sleep(1500);
  await page.keyboard.press(opt('key', 'F3')); await sleep(600);
  const r = await E(page, () => {
    const root = document.querySelector('.rn-shop');
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const s = parseFloat(getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-s')) || 1; return { y: Math.round(r.y), h: Math.round(r.height / s) }; };
    const bar = document.querySelector('.hud-bar');
    return {
      s: getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-s'), reserve: getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-reserve'), barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
      root: R(root), head: R(root.querySelector('.rn-head')), strip: R(root.querySelector('.rn-shopstrip')), shelf: R(root.querySelector('.rn-shelf')),
      itemtabs: R(root.querySelector('.rn-itemtabs')), cards: [...root.querySelectorAll('.rn-shelf:not(.rn-shelftwin) .rn-card')].map((c) => R(c).h), plaque: R(root.querySelector('.rn-plaque')), buttons: R(root.querySelector('.rn-buttons')), frame: window.__echoes.runUi().shop && window.__echoes.runUi().shop.frame,
    };
  });
  console.log(JSON.stringify(r));
  await shot(page, `gntfixPARTY5-shopdump-${W}x${H}`);
} finally { await b.close(); }
