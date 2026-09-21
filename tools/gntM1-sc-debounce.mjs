// Settings write-behind check: a set() reaches localStorage within ~150 ms.
export default async function (h) {
  const { ev, sleep, log, waitFor } = h;
  await waitFor(() => window.__echoes && __echoes.settings && __echoes.tick > 30, { timeout: 120000 });
  const r = await ev(async () => {
    const t0 = performance.now();
    __echoes.settings.set('gameplay.screenshake', 0.5);
    const seen = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((res) => setTimeout(res, 50));
      const raw = localStorage.getItem('echoes.settings');
      seen.push({ ms: Math.round(performance.now() - t0), has: !!raw && raw.includes('"gameplay.screenshake":0.5') });
    }
    __echoes.settings.set('gameplay.screenshake', 1);
    return { seen, report: __echoes.settings.loadReport, keys: Object.keys(localStorage).filter((k) => k.startsWith('echoes')) };
  });
  log('debounce', r);
}
