// gntM3: screenshots of Settings > Audio at the three PLAN sizes (fresh open).
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const res = [];
for (const [w, h] of [[1024, 576], [1600, 900], [2560, 1440]]) {
  const { browser, page, errors } = await openAudio(`${BASE}?seed=7&menu=1`, { width: w, height: h });
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 60000 });
  await sleep(600);
  await ev(page, () => window.__echoes.app.open('settings', { tab: 'audio' }));
  await sleep(900);
  // focus the Music curve button (shows the ring + the info panel text)
  const f = await ev(page, () => {
    const el = document.getElementById('au-master-level');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(f.x, f.y);
  await sleep(400);
  await page.screenshot({ path: `captures/gntM3-tab-${w}.png` });
  const info = await ev(page, () => ({ focus: window.__echoes.app.focus(), info: (document.querySelector('.ap-info') || {}).innerText || null }));
  res.push({ w, h, info, errors: errors.length });
  await browser.close();
}
out(res);
