// node strip.js <clip> [views=q,g] [n=10] [t0] [t1]  -> shots/<clip>.png (rows = views, columns = time)
const { chromium } = require('playwright');
(async () => {
  const [clipArg, views = 'q,g', n = '10', t0 = '0', t1 = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 360 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:' + (process.env.LABPORT || 5200) + '/motionlab.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('window.ready===true', null, { timeout: 120000 });
  const fs = require('fs'), { execSync } = require('child_process');
  for (const clip of clipArg.split(',')) {
    const info = await p.evaluate((c) => window.lab.info(c), clip);
    const a = +t0, z = t1 ? +t1 : info.T; const files = [];
    for (const v of views.split(',')) for (let i = 0; i < +n; i++) {
      const t = a + ((z - a) * i) / (+n - 1);
      await p.evaluate(([c, t, v]) => window.lab.show(c, t, v), [clip, t, v]);
      const f = `${__dirname}/shots/_${clip}_${v}_${String(i).padStart(2, '0')}.png`;
      await p.locator('canvas').screenshot({ path: f }); files.push(f);
    }
    execSync(`ffmpeg -loglevel error -y -pattern_type glob -i '${__dirname}/shots/_${clip}_*.png' -vf "scale=240:-1,tile=${n}x${views.split(',').length}" -frames:v 1 ${__dirname}/shots/${clip}.png`);
    for (const f of files) fs.unlinkSync(f);
    console.log(clip, 'T', info.T, 'ct', info.ct);
  }
  await b.close();
})();
