import { launch, open, E, sleep, waitFor } from './gntfixPARTY5-lib.mjs';
const b = await launch();
try {
  const { page } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=1');
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(800);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  const r = await E(page, () => { const X = window.__echoes; const o = [1, 2, 3].map((s) => X.cmd('partyPick', s, 'leave')); const d = X.cmd('draftDecline'); return { o, d }; });
  await sleep(1500);
  const v = await E(page, () => { const X = window.__echoes; const run = X.state().run; return { phase: run.phase, path: JSON.stringify(run.path).slice(0, 1500), keys: Object.keys(run) }; });
  console.log(JSON.stringify(r).slice(0, 400)); console.log(JSON.stringify(v, null, 1));
} finally { await b.close(); }
