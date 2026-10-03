import { launch, open, E, sleep, waitFor } from './gntfixPARTY5-lib.mjs';
const b = await launch();
try {
  const { page } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7');
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(1200);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(1400);
  await page.keyboard.press('F2'); await sleep(500);
  const d = await E(page, () => {
    const root = document.querySelector('.rn-draft');
    const els = [...root.querySelectorAll('*')].filter((e) => e.offsetParent && (e.onclick || getComputedStyle(e).cursor === 'pointer' || e.tagName === 'BUTTON' || e.dataset && Object.keys(e.dataset).length));
    return els.map((e) => `${e.tagName}.${e.className} ${JSON.stringify(e.dataset)} "${(e.innerText || '').replace(/\s+/g, ' ').slice(0, 40)}"`).slice(0, 60);
  });
  console.log(d.join('\n'));
} finally { await b.close(); }
