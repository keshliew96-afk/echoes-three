// G1.3 response: input -> visual change p95 <= 50 ms, max <= 100 ms over 20
// presses per source (keyboard, mouse, gamepad), read from
// __echoes.app.responses() (inputTs = event timeStamp / pad poll, paintTs =
// first task after the next rendered frame).
export default async function (h) {
  const { ev, sleep, log, waitFor, page, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => {
    const pad = { id: 'gntM1 mock pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__gntPad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
    return true;
  });
  await ev(() => __echoes.app.open('settings'));
  await sleep(1500);
  const stats0 = await ev(() => __echoes.app.frameStats());
  await ev(() => __echoes.app.clearResponses());
  // keyboard: 20 up/down presses in the settings rows
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
    await sleep(120);
  }
  await sleep(300);
  const rsKb = await ev(() => __echoes.app.responses());
  await ev(() => __echoes.app.clearResponses());
  // mouse: 20 clicks alternating two tab buttons
  const c = await ev(() => ['#ap-tab-gameplay', '#ap-tab-display'].map((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }));
  for (let i = 0; i < 20; i++) {
    const p = c[i % 2];
    await page.mouse.click(p.x, p.y);
    await sleep(160);
  }
  await sleep(300);
  const rsMouse = await ev(() => __echoes.app.responses());
  await ev(() => __echoes.app.clearResponses());
  // gamepad: 20 D-pad presses
  for (let i = 0; i < 20; i++) {
    const b = i % 2 ? 12 : 13;
    await ev((b) => {
      window.__gntPad.buttons[b].pressed = true;
      window.__gntPad.timestamp = performance.now();
      return true;
    }, b);
    await sleep(70);
    await ev((b) => {
      window.__gntPad.buttons[b].pressed = false;
      window.__gntPad.timestamp = performance.now();
      return true;
    }, b);
    await sleep(90);
  }
  await sleep(300);
  const rs = [...rsKb, ...rsMouse, ...(await ev(() => __echoes.app.responses()))];
  const bySrc = {};
  for (const r of rs) {
    if (r.ms === null) continue;
    (bySrc[r.source] = bySrc[r.source] || []).push(r.ms);
  }
  const summary = {};
  for (const [src, arr] of Object.entries(bySrc)) {
    const s = [...arr].sort((a, b) => a - b);
    summary[src] = { n: s.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], max: s[s.length - 1] };
  }
  log('frameStats', stats0);
  log('responses', summary);
  log('raw', Object.fromEntries(Object.entries(bySrc).map(([k, v]) => [k, v.map((x) => Math.round(x))])));
  log('verdict', { pass: Object.values(summary).every((v) => v.n >= 18 && v.p95 <= 50 && v.max <= 100), summary });
}
