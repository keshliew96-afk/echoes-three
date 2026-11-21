const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await p.addInitScript(() => localStorage.setItem('dw-lang', 'en'));
  await p.goto('http://localhost:8123/site/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !document.querySelector('.wrap').classList.contains('loading'), null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  console.log('scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: '/home/user/dw/s/phone.png' }); await b.close();
})();
