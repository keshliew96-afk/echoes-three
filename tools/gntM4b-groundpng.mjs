#!/usr/bin/env node
// M4b: dump a layout's painted floor canvas to captures/gntM4b-ground-L<id>.png
// (half size) — to tell the painted floor apart from lighting in a frame.
//   node tools/gntM4b-groundpng.mjs <id>[,<id>...]
import { writeFileSync } from 'node:fs';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';
const ids = (process.argv[2] ?? '9').split(',').map(Number);
const browser = await launchEchoes({ gpu: true });
try {
  const { page } = await openEchoes(browser, 'http://127.0.0.1:5199/?scene=arena&seed=3');
  await waitReady(page, { minTick: 20 });
  for (const id of ids) {
    const url = await page.evaluate(async (id) => {
      const G = await import('/src/env/ground.js');
      const L = await import('/src/env/layout.js');
      const B = await import('/src/env/biomes/index.js');
      const spec = B.layoutSpec(id);
      const c = G.paintGroundCanvas(spec, L.variantLayoutRng(spec.id));
      const h = document.createElement('canvas');
      h.width = c.width / 2;
      h.height = c.height / 2;
      h.getContext('2d').drawImage(c, 0, 0, h.width, h.height);
      return h.toDataURL('image/png');
    }, id);
    const out = `captures/gntM4b-ground-L${id}.png`;
    writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log(out);
  }
} finally {
  await browser.close();
}
