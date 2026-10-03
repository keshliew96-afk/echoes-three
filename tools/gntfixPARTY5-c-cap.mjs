import { launch, open, E, sleep, waitFor, writeJson } from './gntfixPARTY5-lib.mjs';
const b = await launch();
try {
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7');
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  const r = await E(page, () => {
    const X = window.__echoes;
    const g = ['lantern_flurry', 'dewfall', 'sanctuary', 'bell_toll'].map((id) => { const x = X.cmd('giveSkill', id); return JSON.stringify(x).slice(0, 80); });
    const healer = X.cmd('buildView').skills.map((k) => k.id);
    X.cmd('killAllEnemies');
    return { g, healer };
  });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  const r2 = await E(page, () => {
    const X = window.__echoes;
    const out = {};
    for (const s of [1, 2, 3]) {
      const pools = X.cmd('partyView', s).slots;
      const cls = ['', 'tank', 'swordsman', 'archer'][s];
      const extra = { tank: 'iron_stance', swordsman: 'razor_wake', archer: 'kestrel_watch' }[cls];
      out[s] = { before: pools, noSlot: X.cmd('partySwap', s, extra), badSlot: X.cmd('partySwap', s, extra, 4), foreign: X.cmd('partySwap', s, 'mending_bolt', 0), after: X.cmd('partyView', s).slots };
    }
    const card0 = X.state().run.reward; 
    return { out, healerCard: card0 && { type: card0.type || card0.reward, swap: card0.swap, id: card0.id } };
  });
  console.log(JSON.stringify({ r, r2, errors }, null, 1).slice(0, 3000));
  writeJson('gntfixPARTY5-cap', { r, r2, errors });
} finally { await b.close(); }
