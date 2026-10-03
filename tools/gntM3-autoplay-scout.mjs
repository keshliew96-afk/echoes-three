// gntM3 scout: what autoplay-detection primitives does this Chrome expose,
// and which of them log console warnings? Runs the trial from a PAGE script
// (page.evaluate grants user activation, so it cannot be used). One-off.
import { launchEchoes } from './gnt-arch-browser.mjs';
import http from 'node:http';
const html = `<html><body>x<script>
(async () => {
  const out = { hasGetPolicy: typeof navigator.getAutoplayPolicy, ua2: navigator.userActivation && { a: navigator.userActivation.isActive, h: navigator.userActivation.hasBeenActive } };
  const sr = 8000, n = 400;
  const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  const a = new Audio(); a.src = url;
  const t0 = performance.now();
  try { await a.play(); out.mediaTrial = 'allowed'; a.pause(); } catch (e) { out.mediaTrial = e.name; }
  out.mediaMs = Math.round(performance.now() - t0);
  window.__r = out;
  document.addEventListener('keydown', (e) => { window.__k = { key: e.key, a: navigator.userActivation.isActive }; try { const c = new AudioContext(); window.__k.ctx = c.state; setTimeout(() => { window.__k.ctx2 = c.state; }, 50); } catch (err) { window.__k.err = String(err); } }, true);
})();
</script></body></html>`;
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(html); }).listen(4303);
for (const autoplay of [false, true]) {
  const browser = await launchEchoes({ gpu: false, autoplay });
  const page = await browser.newPage();
  const lines = [];
  page.on('console', (m) => lines.push(`[${m.type()}] ${m.text()}`));
  await page.goto('http://127.0.0.1:4303/');
  await page.waitForFunction(() => window.__r, { timeout: 10000 });
  const r = await page.evaluate(() => window.__r);
  await page.keyboard.press('Escape');
  await new Promise((res) => setTimeout(res, 200));
  const kEsc = await page.evaluate(() => window.__k);
  await page.keyboard.press('KeyA');
  await new Promise((res) => setTimeout(res, 200));
  const kA = await page.evaluate(() => window.__k);
  console.log(JSON.stringify({ autoplay, r, kEsc, kA, lines }, null, 1));
  await browser.close();
}
srv.close();
