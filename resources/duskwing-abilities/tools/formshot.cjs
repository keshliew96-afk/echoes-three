const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => errs.push('page: ' + e.message));
  await p.goto('http://localhost:8123/site/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !document.querySelector('.wrap').classList.contains('loading'), null, { timeout: 120000 });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: process.argv[2] + '-top.png' });
  await p.click('.allforms button[data-f="' + (process.argv[3] || 'ra') + '"]');
  const n = await p.evaluate(() => [...document.querySelectorAll('article.skill')].map((a) => a.id + ':' + a.dataset.form).join(' '));
  console.log(n);
  for (const id of ['F2', 'F16']) { await p.evaluate((i) => document.getElementById(i).scrollIntoView(), id); await p.waitForTimeout(6000); await p.screenshot({ path: process.argv[2] + '-' + id + '.png' }); }
  await p.evaluate(() => document.getElementById('F7').scrollIntoView());
  await p.click('#F7 .forms button[data-f="base"]'); await p.waitForTimeout(3000); await p.screenshot({ path: process.argv[2] + '-F7base.png' });
  console.log(JSON.stringify(errs.slice(0, 20))); await b.close();
})();
