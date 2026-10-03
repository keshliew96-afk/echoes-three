// G1.6 V-Sync + G1.7 frame limit. Menu-skip boot (sim ticking). For each
// config: 5 s window -> rendered fps (scheduler stats), rAF Hz, source, sim
// ticks/s, and the Display tab copy (V-Sync / limit notes) when relevant.
// Run on the GPU harness (headless) and the display harness (--headful 1).
export default async function (h) {
  const { ev, sleep, log, waitFor } = h;
  await waitFor(() => __echoes.tick > 240 && (__echoes.state().gl.warmupPending | 0) === 0, { timeout: 90000 });
  await sleep(1500);
  const measure = async (vsync, limit, ms = 5000) => {
    await ev(({ vsync, limit }) => {
      __echoes.settings.set('display.vsync', vsync);
      __echoes.settings.set('display.frameLimit', limit);
      return true;
    }, { vsync, limit });
    await sleep(1200); // settle (windows reset on a change)
    return ev(async (ms) => {
      const s0 = __echoes.app.frameStats();
      const t0 = performance.now();
      const k0 = __echoes.tick;
      const f0 = s0.frames;
      await new Promise((r) => setTimeout(r, ms));
      const t1 = performance.now();
      const s1 = __echoes.app.frameStats();
      const k1 = __echoes.tick;
      const secs = (t1 - t0) / 1000;
      return {
        vsync: s1.vsync,
        limit: s1.limit,
        source: s1.source,
        fps5s: Math.round(((s1.frames - f0) / secs) * 10) / 10,
        ticksPerSec: Math.round(((k1 - k0) / secs) * 10) / 10,
        rafHz: s1.rafHz,
        displayHz: s1.displayHz,
        workMsP50: s1.workMsP50,
        frameMsP50: s1.frameMsP50,
        frameMsP95: s1.frameMsP95,
        renderedFps2s: s1.renderedFps,
      };
    }, ms);
  };
  const rows = [];
  rows.push(await measure(true, 0));
  rows.push(await measure(false, 0));
  // copy shown on the Display tab while V-Sync is off
  await ev(() => {
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  await sleep(900);
  const copyOff = await ev(() => ({
    vsyncNote: document.querySelector('[data-row-id="ap-display-vsync"] .ap-note, #ap-display-vsync')?.closest('.ap-row')?.querySelector('.ap-note')?.textContent,
    measured: document.querySelector('#ap-display-measured')?.textContent,
  }));
  await ev(() => {
    __echoes.app.back();
    return true;
  });
  await sleep(300);
  for (const lim of [30, 60, 120, 144]) rows.push(await measure(true, lim));
  for (const lim of [30, 60]) rows.push(await measure(false, lim));
  // cap note with V-Sync on and a limit above the display rate
  await ev(() => {
    __echoes.settings.set('display.vsync', true);
    __echoes.settings.set('display.frameLimit', 144);
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  await sleep(1500);
  const copyCap = await ev(() => ({
    limitNote: document.querySelector('#ap-display-frameLimit')?.closest('.ap-row')?.querySelector('.ap-note')?.textContent,
    vsyncNote: document.querySelector('#ap-display-vsync')?.closest('.ap-row')?.querySelector('.ap-note')?.textContent,
    measured: document.querySelector('#ap-display-measured')?.textContent,
  }));
  await ev(() => {
    __echoes.app.back();
    __echoes.settings.set('display.frameLimit', 0);
    __echoes.settings.set('display.vsync', true);
    return true;
  });
  for (const r of rows) log(`vs${r.vsync ? 1 : 0}-lim${r.limit}`, r);
  log('copyOff', copyOff);
  log('copyCap', copyCap);
  const on = rows[0];
  const off = rows[1];
  const rafHz = Math.max(...rows.map((r) => r.displayHz || 0), on.rafHz);
  const gpuBound = off.workMsP50 >= 0.8 * (1000 / rafHz);
  const within = (v, want, tol = 0.05) => Math.abs(v - want) <= want * tol;
  log('verdict', {
    rafHz,
    G16_on: on.source === 'raf' && on.fps5s <= rafHz * 1.02,
    G16_off_source: off.source === 'uncapped',
    G16_off_case: gpuBound ? 'b (GPU/CPU-bound)' : 'a (headroom)',
    G16_off_ok: gpuBound ? /can't go faster than your GPU/.test(copyOff.vsyncNote || '') : off.fps5s >= 1.3 * rafHz,
    G16_ticks: rows.slice(0, 2).every((r) => within(r.ticksPerSec, 60, 1 / 60)),
    // measured cap = the best unlimited rate (display- or GPU-bound, whichever binds)
    G17: rows.slice(2).map((r) => {
      const cap = Math.min(rafHz, Math.max(on.fps5s, off.fps5s));
      const want = Math.min(r.limit, cap);
      return { limit: r.limit, vsync: r.vsync, fps: r.fps5s, want: Math.round(want * 10) / 10, ok: within(r.fps5s, want) || (r.limit > cap && r.fps5s >= cap * 0.9), ticks: r.ticksPerSec };
    }),
  });
}
