// G2.7 attribution probe: the same room transitions with autosave ON vs OFF —
// frames > 50 ms that appear in BOTH are the transition itself (M4b's
// dressing swap / the camp->arena scene change), not the autosave.
//   node tools/gntM2-drive.mjs tools/gntM2-sc-autosave-ab.mjs
const ORIGIN = 'http://127.0.0.1:5199/';
async function leg(h, on) {
  const { ev, sleep, waitFor } = h;
  await h.open(`${ORIGIN}?menu=0&seed=12&fresh=1`);
  await waitFor(() => window.__echoes.tick > 240 && window.__echoes.save && window.__echoes.state().gl.warmupPending === 0, { timeout: 90000 });
  await ev((on) => {
    window.__echoes.save.autosaveEnabled(on);
    window.__gntM2f = [];
    let last = performance.now();
    const f = (t) => { window.__gntM2f.push([Math.round(t), Math.round((t - last) * 10) / 10]); last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.__gntM2ev = [];
    for (const t of ['run_start', 'room_enter', 'shop_open', 'layout_enter']) window.__echoes.on(t, (e) => window.__gntM2ev.push({ type: t, tick: e.tick, at: Math.round(performance.now()) }));
  }, on);
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(3000);
  await ev(() => window.__echoes.cmd('skipToRoom', 7));
  await sleep(3000);
  await ev(() => window.__echoes.cmd('shopAdvance'));
  await sleep(3000);
  const r = await ev(() => ({ frames: window.__gntM2f.slice(5), evs: window.__gntM2ev, log: window.__echoes.save.autosaveLog() }));
  const over = r.frames.filter(([, d]) => d > 50).map(([t, d]) => {
    const near = r.evs.filter((e) => Math.abs(e.at - t) < 400).map((e) => `${e.type}@${e.at - t}ms`);
    return { t, d, near };
  });
  return { on, over, writes: r.log.filter((x) => x.ok).length, n: r.frames.length };
}
export default async function (h) {
  const a = await leg(h, true);
  const b = await leg(h, false);
  h.log('autosaveOn', a);
  h.log('autosaveOff', b);
}
