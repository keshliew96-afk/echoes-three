import { launch, open, E, sleep, waitFor } from './gntfixPARTY5-lib.mjs';
const b = await launch();
try {
  const { page } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7&fresh=1');
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(800);
  const r = await E(page, async () => { const S = window.__echoes.save; const l0 = await S.list(); const sv = await S.save(1); const l1 = await S.list(); const keys = Object.keys(localStorage).filter((k) => k.startsWith('echoes')); return { l0: JSON.stringify(l0).slice(0, 400), sv: JSON.stringify(sv).slice(0, 300), l1: JSON.stringify(l1).slice(0, 600), keys, sample: keys.map((k) => k + ':' + String(localStorage.getItem(k)).slice(0, 120)) }; });
  console.log(JSON.stringify(r, null, 1));
} finally { await b.close(); }
