import { boot, ev, writeJson, BASE, sleep, waitFor, shot } from './gntccontent4-lib.mjs';
const out = [];
for (const L of [2, 3]) {
  const { browser, page, errors } = await boot(BASE + `?menu=0&seed=4`);
  await ev(page, (L) => window.__echoes.cmd('startCampaign', { level: L }), L);
  await waitFor(page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat'; }, { timeout: 60000 });
  const b0 = await ev(page, () => { const b = window.__echoes.cmd('buildView'); return { filled: b.skills.reduce((a, s) => a + s.filled, 0), bench: b.bench.length, wallet: window.__echoes.state().run.wallet }; });
  await waitFor(page, () => { const s = window.__echoes.state(); if (s.run.phase === 'combat') window.__echoes.cmd('killAllEnemies'); return s.run.phase === 'reward'; }, { timeout: 90000, poll: 400 });
  await sleep(1500);
  const rw = await ev(page, () => ({ text: window.__echoes.runUi().text.slice(0, 200), reward: window.__echoes.state().run.reward, spoils: window.__echoes.state().run.spoils }));
  await shot(page, `gntfixM4a4-c-start-L${L}-reward`);
  out.push({ L, b0, rw, errors });
  console.log('start L' + L, JSON.stringify(b0), JSON.stringify(rw).slice(0, 400), errors.length);
  await browser.close();
}
writeJson('gntfixM4a4-c-l3start.json', out);
