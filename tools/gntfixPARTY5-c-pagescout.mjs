import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntfixPARTY5-lib.mjs';
const W = Number(process.argv[2] || 1600), H = Number(process.argv[3] || 900);
const b = await launch({ width: W, height: H });
try {
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7', { width: W, height: H });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(1500);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(1500);
  await shot(page, `gntfixPARTY5-pagescout-${W}x${H}-healer`);
  const d = await E(page, () => {
    const X = window.__echoes; const u = X.runUi();
    const root = document.querySelector('.rn-draft');
    return { runUi: JSON.stringify(u).slice(0, 4000), text: root ? root.innerText.slice(0, 2000) : null, html: root ? root.outerHTML.slice(0, 6000) : null, party: JSON.stringify(X.state().run.party || null).slice(0, 2000) };
  });
  writeJson(`gntfixPARTY5-pagescout-${W}x${H}`, { d, errors });
  console.log(d.runUi); console.log('---TEXT---\n' + d.text); console.log('---PARTY---\n' + d.party);
  await page.keyboard.press('KeyE'); await sleep(500);
  await shot(page, `gntfixPARTY5-pagescout-${W}x${H}-tank`);
  console.log('errors', errors);
} finally { await b.close(); }
