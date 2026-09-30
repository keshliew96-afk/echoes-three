// gntfixPARTY5-shine — the legendary shimmer after the band-box change: the band box stays on its card,
// its ::before sweeps (computed transform changes over time), and the card's pixels change between phases.
import { launch, open, E, sleep, waitFor } from './gntfixPARTY5-lib.mjs';
import fs from 'node:fs';
const BASEURL = process.argv[2] || 'http://127.0.0.1:5199/';
const b = await launch();
try {
  const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=7`, { width: 1600, height: 900 });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await E(page, () => { window.__echoes.cmd('skipToRoom', 7); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'shop', null, 30000);
  await sleep(1500);
  const rows = [];
  const crops = [];
  for (let i = 0; i < 6; i++) {
    const r = await E(page, () => {
      const band = document.querySelector('.rn-shop .rn-shelf:not(.rn-shelftwin) .rn-card.rn-legendary > .rn-shine');
      if (!band) return null;
      const card = band.parentElement.getBoundingClientRect();
      const bb = band.getBoundingClientRect();
      return { card: [Math.round(card.x), Math.round(card.y), Math.round(card.width), Math.round(card.height)], band: [Math.round(bb.x), Math.round(bb.right)], pseudo: getComputedStyle(band, '::before').transform, shx: band.style.getPropertyValue('--shx') };
    });
    rows.push(r);
    if (r) crops.push(await page.screenshot({ clip: { x: r.card[0], y: r.card[1], width: r.card[2], height: r.card[3] }, encoding: 'binary' }));
    await sleep(430);
  }
  const sizes = crops.map((c) => c.length);
  console.log(JSON.stringify({ rows, cropBytes: sizes, distinctCrops: new Set(crops.map((c) => c.toString('base64'))).size, errors: errors.length }));
  crops.forEach((c, i) => fs.writeFileSync(`captures/gntfixPARTY5-shine-${i}.png`, c));
} finally { await b.close(); }
