// G1.4 render scale: for s in {0.5, 0.75, 1.0, 1.25, 1.5} the drawing buffer is
// round(css x min(dpr,2) x s) +-1 px within 2 frames of the change (clamped
// to 3840x2160), the HUD rects stay +-1 px, and fps(0.5) >= fps(1.0).
// Run on a menu-skip boot (?menu=0) so the HUD is up.
export default async function (h) {
  const { ev, sleep, log, waitFor } = h;
  await waitFor(() => __echoes.tick > 200, { timeout: 90000 });
  await sleep(1500);
  const hudRects = () =>
    ev(() => {
      const sel = ['.hud-bar', '#hud-banner', '.hud-loc', '.hud-glint', '#version-label', '#fps-meter'];
      const out = {};
      for (const s of sel) {
        const n = document.querySelector(s);
        if (!n) continue;
        const r = n.getBoundingClientRect();
        if (r.width < 1) continue;
        out[s] = [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10);
      }
      return out;
    });
  const base = await hudRects();
  const rows = [];
  for (const s of [0.5, 0.75, 1.0, 1.25, 1.5, 1.0]) {
    const r = await ev(async (s) => {
      __echoes.settings.set('display.renderScale', s);
      const f0 = __echoes.app.frameStats().frames;
      // wait exactly two rendered frames
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const f1 = __echoes.app.frameStats().frames;
      const d = __echoes.app.display();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const want = { w: Math.round(innerWidth * dpr * s), h: Math.round(innerHeight * dpr * s) };
      const cap = Math.min(3840 / innerWidth, 2160 / innerHeight);
      const eff = Math.min(dpr * s, cap);
      const wantClamped = { w: Math.floor(innerWidth * eff), h: Math.floor(innerHeight * eff) };
      return { s, framesBetween: f1 - f0, buffer: d.drawingBuffer, want, wantClamped, clamped: d.clamped, canvasCss: d.canvasCss, dpr: d.dpr };
    }, s);
    r.ok = Math.abs(r.buffer.w - r.wantClamped.w) <= 1 && Math.abs(r.buffer.h - r.wantClamped.h) <= 1;
    const hr = await hudRects();
    r.hudSame = Object.keys(base).every((k) => hr[k] && hr[k].every((v, i) => Math.abs(v - base[k][i]) <= 1));
    rows.push(r);
    await sleep(300);
  }
  const fpsAt = async (s) => {
    await ev((s) => __echoes.settings.set('display.renderScale', s), s);
    await sleep(2600);
    return ev(() => __echoes.app.frameStats());
  };
  const f10 = await fpsAt(1.0);
  const f05 = await fpsAt(0.5);
  const f15 = await fpsAt(1.5);
  await ev(() => __echoes.settings.set('display.renderScale', 1));
  log('rows', rows);
  log('fps', { s10: f10.renderedFps, s05: f05.renderedFps, s15: f15.renderedFps, work10: f10.workMsP50, work05: f05.workMsP50, work15: f15.workMsP50, frame10: f10.frameMsP50, frame05: f05.frameMsP50, frame15: f15.frameMsP50 });
  log('verdict', { buffersOk: rows.every((r) => r.ok), hudSame: rows.every((r) => r.hudSame), fpsOk: f05.renderedFps >= f10.renderedFps * 0.98 });
}
