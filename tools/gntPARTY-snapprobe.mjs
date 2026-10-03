// Which state-tree branches change per snapshot in the max-stress room (SP).
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';
const browser = await launchEchoes({ gpu: true, background: true });
try {
  const { page } = await openEchoes(browser, 'http://127.0.0.1:4400/?menu=0&seed=7&level=3&partygrant=max');
  await waitReady(page, { minTick: 200 });
  const r = await page.evaluate(async () => {
    const E = window.__echoes;
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < 60 && E.state().run.phase !== 'combat'; i++) await wait(250);
    E.cmd('skipToRoom', 6);
    for (let i = 0; i < 60 && !(E.state().run.phase === 'combat' && E.state().run.room === 6); i++) await wait(250);
    E.cmd('autopilot', true);
    await wait(6000);
    const flat = (tree) => {
      const out = {};
      const walk = (o, p, d) => {
        const deep = p.startsWith('systems.party') || p.startsWith('systems.allies') || p.startsWith('systems.nodes');
        if ((d === 3 && !deep) || d === 8 || o === null || typeof o !== 'object') { out[p] = JSON.stringify(o) ?? ''; return; }
        for (const k of Object.keys(o)) walk(o[k], p ? p + '.' + k : k, d + 1);
      };
      walk(tree, '', 0);
      return out;
    };
    let prev = flat(E.save.capture());
    const stats = {};
    for (let i = 0; i < 40; i++) {
      await wait(50);
      const cur = flat(E.save.capture());
      for (const k of new Set([...Object.keys(cur), ...Object.keys(prev)])) {
        const s = stats[k] || (stats[k] = { changes: 0, bytes: 0 });
        if (cur[k] !== prev[k]) { s.changes += 1; s.bytes += (cur[k] || '').length; }
      }
      prev = cur;
    }
    return Object.entries(stats).filter(([k, v]) => v.changes && !k.startsWith('registry')).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 50).map(([k, v]) => `${k} ch${v.changes} ${Math.round(v.bytes / v.changes)}B`);
  });
  console.log(r.join('\n'));
} finally {
  await browser.close();
}
