// fix-M1-r3 copy of the critic's tools/gntcmenu3-resp.mjs (log + captures renamed; unchanged otherwise)
// Menu critic r3 — G1.3 input -> visual response. Independent instrument (installed before game scripts):
// input timestamp -> first DOM mutation in #app-ui -> next rAF (paint opportunity). Plus app.responses().
import { launch, logger, sleep, URL_BASE, reachTitle, installGamepad, stats } from './gntcmenu3-lib.mjs';
import { openEchoes } from './gnt-arch-browser.mjs';
const log = logger('gntfixM13-cresp');
const RUNS = +(process.argv[2] || 3);
const INSTR = () => {
  window.__rq = { pending: null, out: [] };
  const mark = (ts, src) => { window.__rq.pending = { ts, src, mut: null }; };
  window.addEventListener('keydown', (e) => { if (!e.repeat) mark(e.timeStamp, 'key'); }, true);
  window.addEventListener('pointerdown', (e) => mark(e.timeStamp, 'click'), true);
  window.__rqMark = mark;
  const start = () => {
    const ui = document.querySelector('#app-ui');
    if (!ui) return setTimeout(start, 50);
    new MutationObserver(() => {
      const p = window.__rq.pending;
      if (!p || p.mut) return;
      p.mut = performance.now();
      requestAnimationFrame((t) => { window.__rq.out.push({ src: p.src, ms: t - p.ts, mutMs: p.mut - p.ts }); window.__rq.pending = null; });
    }).observe(ui, { subtree: true, attributes: true, childList: true, characterData: true });
  };
  start();
};
const browser = await launch({ width: 1600, height: 900 });
const summary = [];
try {
  for (let run = 1; run <= RUNS; run++) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(INSTR);
    await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 });
    await reachTitle(page);
    await installGamepad(page);
    const take = () => page.evaluate(() => { const o = window.__rq.out.splice(0); window.__rq.pending = null; return o; });
    const appResp = () => page.evaluate(() => { const r = window.__echoes.app.responses(); window.__echoes.app.clearResponses && window.__echoes.app.clearResponses(); return r; });
    await take(); await appResp();
    const row = { run };
    // keyboard early (right after the title appeared) and settled
    for (const phase of ['keyEarly', 'keySettled']) {
      if (phase === 'keySettled') await sleep(5000);
      for (let i = 0; i < 20; i++) { await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown'); await sleep(170); }
      await sleep(300);
      const ind = (await take()).map((x) => x.ms); const app = (await appResp()).map((x) => x.ms);
      row[phase] = { ind: stats(ind), app: stats(app) };
    }
    // gamepad d-pad
    {
      for (let i = 0; i < 20; i++) {
        await page.evaluate((b) => { window.__rqMark(performance.now(), 'pad'); window.__gcPress(b, true); }, i % 2 ? 12 : 13);
        await sleep(70); await page.evaluate((b) => window.__gcPress(b, false), i % 2 ? 12 : 13); await sleep(150);
      }
      await sleep(300);
      const ind = (await take()).map((x) => x.ms); const app = (await appResp()).map((x) => x.ms);
      row.pad = { ind: stats(ind), app: stats(app) };
    }
    // mouse hover (real movement between two rows)
    {
      const rects = await page.evaluate(() => ['#ap-title-settings', '#ap-title-records'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
      await page.mouse.move(rects[0].x, rects[0].y, { steps: 3 }); await sleep(300); await take(); await appResp();
      for (let i = 0; i < 20; i++) {
        const r = rects[(i + 1) % 2];
        await page.evaluate(() => window.__rqMark(performance.now(), 'hover'));
        await page.mouse.move(r.x, r.y, { steps: 1 });
        await sleep(220);
      }
      await sleep(300);
      const ind = (await take()).map((x) => x.ms); const app = (await appResp()).map((x) => x.ms);
      row.hover = { ind: stats(ind), app: stats(app) };
    }
    // mouse click: open Settings (click) then Back (click)
    {
      for (let i = 0; i < 20; i++) {
        const sel = i % 2 ? '#ap-settings-back' : '#ap-title-settings';
        const c = await page.evaluate((s) => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
        await page.mouse.move(c.x, c.y, { steps: 2 }); await sleep(250); await take();
        await page.mouse.click(c.x, c.y);
        await sleep(600);
      }
      const ind = (await take()).map((x) => x.ms); const app = (await appResp()).map((x) => x.ms);
      row.click = { ind: stats(ind), app: stats(app) };
    }
    row.fps = await page.evaluate(() => window.__echoes.app.frameStats().renderedFps);
    row.errors = errors.length;
    log('run', row);
    summary.push(row);
    await page.close();
  }
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
const gate = (s) => s && s.n ? (s.p95 <= 50 && s.max <= 100 ? 'PASS' : 'FAIL') : 'n/a';
for (const r of summary) log('GATE run', r.run, ['keyEarly', 'keySettled', 'pad', 'hover', 'click'].map((k) => `${k}: ind ${gate(r[k].ind)} ${r[k].ind.p50}/${r[k].ind.p95}/${r[k].ind.max} app ${gate(r[k].app)} ${r[k].app.p50}/${r[k].app.p95}/${r[k].app.max} n${r[k].app.n}`).join(' | '), 'fps', r.fps);
