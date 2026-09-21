// Dev probe: thumbnail + save main-thread cost (long tasks during saves).
export default async function (h) {
  await h.waitFor(() => window.__echoes.tick > 200 && window.__echoes.save);
  await h.ev(() => {
    window.__gntM2lt = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__gntM2lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false });
    } catch {}
    window.__gntM2frames = [];
    let last = performance.now();
    const f = (t) => { window.__gntM2frames.push(Math.round((t - last) * 10) / 10); last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await h.sleep(1500);
  await h.ev(() => { window.__gntM2lt.length = 0; window.__gntM2frames.length = 0; });
  for (let i = 0; i < 5; i++) {
    const r = await h.ev(async () => {
      const s = window.__echoes.save;
      const r = await s.save('manual-2', { name: 'probe' });
      return { ok: r.ok, ms: r.ms, thumbMs: r.thumbMs, writeMs: r.writeMs, last: s.lastThumb() };
    });
    h.log(`save${i}`, { ...r, last: r.last && { snapMs: r.last.snapMs, drawMs: r.last.drawMs, bytes: r.last.bytes, q: r.last.quality } });
  }
  const f = await h.ev(() => ({ longtasks: window.__gntM2lt.slice(), maxFrame: Math.max(...window.__gntM2frames), frames: window.__gntM2frames.length, over50: window.__gntM2frames.filter((x) => x > 50).length }));
  h.log('frames', f);
}
