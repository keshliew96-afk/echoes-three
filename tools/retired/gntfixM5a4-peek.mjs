// gntfixM5a4-peek.mjs — fix-M5a r4: print a few cold paths' values + their 4-snapshot diffs at the L3 Stag.
import { openClient, closeClient, waitFor, sleep } from './gntcnet4-lib.mjs';
const BASE = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const c = await openClient(BASE + '?menu=0&seed=5', { w: 960, h: 540, tag: 'peek' });
try {
  await waitFor(c.page, () => window.__echoes && window.__echoes.tick > 240, { timeout: 120000 });
  await c.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 3 }));
  await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await c.page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await c.page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
  await sleep(12000);
  const r = await c.page.evaluate(async () => {
    const E = window.__echoes;
    const tdm = await import('/src/net/protocol/treediff.js');
    const t = [];
    for (let i = 0; i < 6; i++) { t.push(E.save.capture()); await new Promise((res) => setTimeout(res, 50)); }
    const g = (tr, p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), tr);
    const out = {};
    for (const p of ['systems.build.echoQueue', 'clock.grants', 'clock', 'systems.build.lastHeal', 'systems.build.lastHit', 'world.stats', 'systems.combat', 'systems.skills.slots']) {
      out[p] = { v: JSON.stringify(g(t[5], p)).slice(0, 600), d: JSON.stringify(tdm.diffValue(g(t[1], p), g(t[5], p))).slice(0, 600) };
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k, '\n  V', v.v, '\n  D', v.d);
} finally { await closeClient(c); }
