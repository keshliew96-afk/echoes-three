// gntccontent5 — page-error hunt: N boots of ?level=L&seed=S on the production preview, each held until room 1 combat
// + 4 s; every uncaught page error recorded with the boot that produced it. Usage: node tools/gntccontent5-bootstress.mjs <n>
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeJson, sleep } from './gntccontent5-lib.mjs';
const N = +(process.argv[2] || 16);
const base = process.env.ECHOES_URL;
const res = [];
for (let i = 0; i < N; i++) {
  const level = 2 + (i % 2), seed = 300 + i;
  const browser = await launchEchoes({ gpu: true, width: 1280, height: 720 });
  let r = { i, level, seed };
  try {
    const { page, errors } = await openEchoes(browser, base + `?level=${level}&seed=${seed}`, { width: 1280, height: 720 });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) { const ok = await page.evaluate(() => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat' && s.enemies.length > 0; }).catch(() => false); if (ok) break; await sleep(250); }
    r.toCombatMs = Date.now() - t0;
    await sleep(4000);
    r.errors = errors.slice();
  } catch (e) { r.harness = String(e).slice(0, 200); }
  await browser.close();
  res.push(r);
  console.log(JSON.stringify(r).slice(0, 400));
}
writeJson('gntfixM4a5-bootstress.json', { res, withErrors: res.filter((r) => r.errors && r.errors.length).length });
console.log('boots', res.length, 'with page errors', res.filter((r) => r.errors && r.errors.length).length);
