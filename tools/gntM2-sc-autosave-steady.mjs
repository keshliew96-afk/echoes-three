// G2.7 steady-state frame check: in live combat (room 1, enemies up, real-
// time sim), 8 autosaves through the real safe-point path vs 8 idle windows of
// the same length, interleaved. Frames > 50 ms inside autosave windows must
// not exceed the idle windows' (the machine's own noise floor).
//   node tools/gntM2-drive.mjs tools/gntM2-sc-autosave-steady.mjs
const ORIGIN = 'http://127.0.0.1:5199/';
export default async function (h) {
  const { ev, sleep, waitFor, log, fail } = h;
  await h.open(`${ORIGIN}?menu=0&seed=21&fresh=1`);
  await waitFor(() => window.__echoes.tick > 240 && window.__echoes.save && window.__echoes.state().gl.warmupPending === 0, { timeout: 90000 });
  await ev(() => {
    window.__echoes.save.autosaveEnabled(false);
    window.__echoes.cmd('startRun', { act: 1 });
  });
  await waitFor(() => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().enemies.length > 0, { timeout: 20000 });
  await ev(() => {
    const p = window.__echoes.state().party[0];
    window.__echoes.cmd('iframe', p.id, 1e6);
    window.__gntM2f = [];
    let last = performance.now();
    const f = (t) => {
      window.__gntM2f.push([Math.round(t), Math.round((t - last) * 10) / 10]);
      last = t;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await sleep(3000);
  const on = [];
  const off = [];
  for (let i = 0; i < 8; i++) {
    // ON: the real safe-point path (request -> capture at the boundary -> calm -> pieces).
    const r = await ev(async () => {
      const S = window.__echoes.save;
      S.autosaveEnabled(true);
      S.resetAutosaveThrottle();
      const n0 = S.autosaveLog().length;
      const t0 = Math.round(performance.now());
      S.autosave('room_enter');
      for (let k = 0; k < 200; k++) {
        await new Promise((r) => setTimeout(r, 20));
        const L = S.autosaveLog();
        if (L.length > n0 && L[L.length - 1].ok !== undefined) {
          S.autosaveEnabled(false);
          return { t0, rec: L[L.length - 1], t1: Math.round(performance.now()) };
        }
      }
      S.autosaveEnabled(false);
      return { t0, rec: null, t1: Math.round(performance.now()) };
    });
    const fr = await ev(([a, b]) => window.__gntM2f.filter(([t]) => t >= a && t <= b + 20).map(([, d]) => d), [r.t0, r.t1]);
    on.push({ ms: r.t1 - r.t0, ok: r.rec && r.rec.ok, pieces: r.rec && r.rec.pieces, captureMs: r.rec && r.rec.captureMs, max: Math.max(...fr), over50: fr.filter((d) => d > 50).length, n: fr.length });
    await sleep(400);
    // OFF: an idle window of the same length.
    const t0 = await ev(() => Math.round(performance.now()));
    await sleep(r.t1 - r.t0);
    const t1 = await ev(() => Math.round(performance.now()));
    const fo = await ev(([a, b]) => window.__gntM2f.filter(([t]) => t >= a && t <= b + 20).map(([, d]) => d), [t0, t1]);
    off.push({ ms: t1 - t0, max: Math.max(...fo), over50: fo.filter((d) => d > 50).length, n: fo.length });
    await sleep(400);
  }
  const sum = (L) => ({ windows: L.length, framesOver50: L.reduce((s, x) => s + x.over50, 0), worst: Math.max(...L.map((x) => x.max)), frames: L.reduce((s, x) => s + x.n, 0) });
  const A = sum(on);
  const B = sum(off);
  const pieceMax = Math.max(...on.map((x) => Math.max(x.captureMs || 0, ...Object.values(x.pieces || {}).filter((v) => typeof v === 'number'))));
  log('autosaveWindows', on);
  log('idleWindows', off);
  log('summary', { autosave: A, idle: B, pieceMaxMs: pieceMax, allWritten: on.every((x) => x.ok) });
  if (!on.every((x) => x.ok)) fail('every steady-state autosave written', on);
  if (pieceMax > 20) fail('an autosave piece > 20 ms of main thread', pieceMax);
  if (A.framesOver50 > B.framesOver50) fail('autosave windows show more > 50 ms frames than idle windows', { A, B });
}
