const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +(process.argv[3] || 1100), height: 900 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => errs.push('page: ' + e.message));
  await p.goto('http://localhost:8123/site/index.html' + (process.argv[4] || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !document.querySelector('.wrap').classList.contains('loading'), null, { timeout: 120000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: process.argv[2] + '-top.png' });
  for (const id of (process.argv[5] || 'F8').split(',')) { await p.evaluate((i) => document.getElementById(i).scrollIntoView(), id); await p.waitForTimeout(5000); await p.screenshot({ path: process.argv[2] + '-' + id + '.png' }); }
  console.log(JSON.stringify(errs.slice(0, 20))); await b.close();
})();
