// fix-M2-r1 diagnostic — G2.3 "Load from the title restores the chosen slot in <= 1.5 s" (the
// tools/gntM2-sc-slots.mjs step that timed out in the regression run): same setup, then a 16 ms
// timeline of app state / stack / tick / state hash / lastLoad after Enter on the manual-2 row.
//   node tools/gntfixM21-drive.mjs tools/gntfixM21-sc-titleload.mjs [--tag x]
export default async function (h) {
  const ORIGIN = 'http://127.0.0.1:5199/';
  await h.open(`${ORIGIN}?menu=0&seed=5&fresh=1`);
  await h.waitFor(() => window.__echoes.tick > 120 && window.__echoes.save, 60000);
  await h.ev(async () => (await window.__echoes.save.save('manual-1')).ok);
  await h.ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await h.waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1 && window.__echoes.state().enemies.length > 0; }, 20000);
  await h.sleep(1500);
  const runSave = await h.ev(async () => { const r = await window.__echoes.save.save('manual-2', { name: 'Before the wood' }); return { ok: r.ok, hash: r.hash, tick: r.meta && r.meta.meta && r.meta.meta.tick }; });
  await h.page.keyboard.press('F5');
  await h.waitFor(() => window.__echoes.save.list().some((m) => m.id === 'quick'), 5000);
  h.log('setup', runSave);
  await h.open(ORIGIN);
  await h.waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), 90000);
  if (await h.ev(() => window.__echoes.app.state !== 'title')) await h.key('Enter');
  await h.waitFor(() => window.__echoes.app.state === 'title', 10000);
  await h.sleep(700);
  h.log('title', await h.ev(() => window.__echoes.app.focus()));
  await h.key('ArrowDown'); await h.key('ArrowDown');
  h.log('onLoad', await h.ev(() => window.__echoes.app.focus().id));
  await h.key('Enter');
  await h.waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'saves', 5000);
  await h.sleep(500);
  const rows = await h.ev(() => ({ rows: [...document.querySelectorAll('.sv-row')].map((r) => r.dataset.slot), focus: window.__echoes.app.focus().id }));
  const idx = rows.rows.indexOf('manual-2');
  const cur = rows.rows.indexOf(rows.focus.replace('sv-slot-', ''));
  for (let i = 0; i < Math.abs(idx - cur); i++) await h.key(idx > cur ? 'ArrowDown' : 'ArrowUp');
  h.log('focus', await h.ev(() => window.__echoes.app.focus().id));
  const arena = () => h.ev(() => { try { const a = window.__echoes.cmd('arenaLayout'); return a && { layoutId: a.layoutId, built: a.built, queued: a.queued, building: a.building, syncBuilds: a.syncBuilds }; } catch (e) { return String(e); } });
  h.log('arena.before', await arena());
  h.log('backgroundHold', await h.ev(() => window.__echoes.app.backgroundHold && window.__echoes.app.backgroundHold()));
  // timeline recorder in the page (rAF + 16 ms interval), started just before the Enter press
  await h.ev(() => {
    window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask' }); } catch (e) {}
    const E = window.__echoes; const t0 = performance.now(); window.__tl = [];
    const rec = (src) => { let hash = null; try { hash = E.save.hash(); } catch (e) { hash = 'ERR ' + e.message; } window.__tl.push({ src, t: Math.round(performance.now() - t0), state: E.app.state, stack: E.app.stack().join(','), tick: E.tick, hash, last: E.save.lastLoad() && E.save.lastLoad().hash, paused: E.app.simPaused() }); };
    window.__tlId = setInterval(() => rec('iv'), 16);
    const raf = () => { rec('raf'); if (performance.now() - t0 < 5000) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    setTimeout(() => clearInterval(window.__tlId), 5000);
  });
  const cdp = await h.page.target().createCDPSession();
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await h.page.keyboard.press('Enter');
  await h.sleep(1200);
  const { profile } = await cdp.send('Profiler.stop');
  { // self + total time per function (ms), top entries, from the sampled profile
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const dt = profile.timeDeltas; const self = new Map(); const total = new Map();
    for (let i = 0; i < profile.samples.length; i++) {
      const ms = (dt[i + 1] ?? dt[i] ?? 0) / 1000; let id = profile.samples[i]; const n = byId.get(id);
      const key = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '')}:${n.callFrame.lineNumber + 1}`;
      self.set(key(n), (self.get(key(n)) || 0) + ms);
      const seen = new Set(); while (id != null) { const m = byId.get(id); const k = key(m); if (!seen.has(k)) { total.set(k, (total.get(k) || 0) + ms); seen.add(k); } id = parent.get(id); }
    }
    const top = (m) => [...m.entries()].filter(([k]) => !/^\((idle|program|root|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${v.toFixed(1)} ${k}`);
    h.log('profile.total', top(total)); h.log('profile.self', top(self).slice(0, 15));
  }
  await h.sleep(4100);
  const tl = await h.ev(() => window.__tl);
  h.log('arena.after', await arena());
  h.log('longtasks', await h.ev(() => window.__lt.slice(0, 12)));
  // compress: keep rows where anything but t changed
  const out = []; let prev = '';
  for (const r of tl) { const k = `${r.state}|${r.stack}|${r.tick}|${r.hash}|${r.last}|${r.paused}`; if (k !== prev) { out.push(r); prev = k; } }
  h.log('timeline', out.slice(0, 40));
  const hit = tl.find((r) => r.state === 'playing' && r.hash === runSave.hash);
  h.log('verdict', { runSaveHash: runSave.hash, runSaveTick: runSave.tick, firstMatch: hit || null, samples: tl.length });
  h.check(!!hit, 'no sample with state playing and hash === the saved hash', { runSave });
}
