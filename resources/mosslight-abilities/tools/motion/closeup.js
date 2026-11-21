// node closeup.js <out dir> [names...] : a looping close-up video of each of her moves (3/4 front view), 30 fps
// A name may be a sequence: "c_bell_toll+c_bell_loop*2+c_bell_end" (clip*n repeats a loop n times).
const { chromium } = require('playwright');
const fs = require('fs'), { execSync } = require('child_process');
(async () => {
  const [out, ...names] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 360 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:' + (process.env.LABPORT || 5200) + '/motionlab.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('window.ready===true', null, { timeout: 180000 });
  for (const spec of names) {
    const [file, seq] = spec.includes('=') ? spec.split('=') : [spec.split('+')[0], spec];
    const steps = [['idle', 0.25]]; // a breath of idle first, so the wind-up reads
    for (const part of seq.split('+')) { const [c, n] = part.split('*'); const T = (await p.evaluate((c) => window.lab.info(c), c)).T; steps.push([c, T * (+n || 1)]); }
    steps.push(['idle', 0.35]);
    const dir = `${out}/_${file}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    let k = 0;
    for (const [c, dur] of steps) {
      const T = (await p.evaluate((c) => window.lab.info(c), c)).T;
      for (let t = 0; t < dur - 1e-6; t += 1 / 30) {
        const tt = c === 'idle' ? 0 : t % T;
        await p.evaluate(([c, t]) => window.lab.show(c, t, 'q', [0, 0.42, 0]), [c, tt]);
        const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
        fs.writeFileSync(`${dir}/${String(k++).padStart(4, '0')}.png`, Buffer.from(data.split(',')[1], 'base64'));
      }
    }
    execSync(`ffmpeg -loglevel error -y -framerate 30 -i ${dir}/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 24 -movflags +faststart ${out}/${file}.mp4`);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('done', file, k, 'frames');
  }
  await b.close();
})();
