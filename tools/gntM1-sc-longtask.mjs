// Long tasks during the first seconds of a boot + the menu prebuild cost.
export default async function (h) {
  const { ev, sleep, log, waitFor } = h;
  await h.page.evaluateOnNewDocument(() => {
    window.__gntLong = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__gntLong.push({ t: Math.round(e.startTime), ms: Math.round(e.duration) });
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await waitFor(() => window.__echoes && __echoes.app && __echoes.tick > 30, { timeout: 120000 });
  await sleep(6000);
  log('long', await ev(() => ({ long: window.__gntLong.filter((e) => e.ms >= 100), prebuildMs: __echoes.app.prebuildMs, fps: __echoes.app.frameStats() })));
}
