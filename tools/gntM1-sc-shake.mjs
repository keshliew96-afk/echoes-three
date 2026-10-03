// Gameplay ▸ Screen shake measurably scales the camera shake: in a live room,
// kills emit `screenshake`; the arena's probe reports the applied amplitude
// (state().vfx.shake) and the shake counter. Full = 1x, Reduced = 0.5x, Off = 0.
export default async function (h) {
  const { ev, sleep, log, waitFor } = h;
  await waitFor(() => window.__echoes && __echoes.tick > 60, { timeout: 90000 });
  await ev(() => {
    __echoes.cmd('startRun');
    return true;
  });
  await waitFor(() => {
    const r = __echoes.state().run;
    return r && r.phase === 'combat';
  }, { timeout: 20000 });
  const rows = [];
  for (const mul of [1, 0.5, 0]) {
    await ev((m) => __echoes.settings.set('gameplay.screenshake', m), mul);
    // enemies need to exist: spawn two boars, let them land, then kill them all
    await ev(() => {
      __echoes.cmd('spawn', 'boar', 2.5, 2);
      __echoes.cmd('spawn', 'boar', -2.5, 2);
      return true;
    });
    await sleep(700);
    const before = await ev(() => ({ shakes: __echoes.state().vfx.shakes }));
    const r = await ev(async () => {
      const amps = [];
      const off = __echoes.on('screenshake', (e) => amps.push(e.amp));
      __echoes.cmd('killAllEnemies');
      // sample the applied amplitude over the shake (it decays)
      let applied = 0;
      let camMax = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 300) {
        await new Promise((res) => requestAnimationFrame(res));
        const v = __echoes.state().vfx;
        applied = Math.max(applied, v.shake || 0);
      }
      const v = { ...__echoes.state().vfx, shake: applied };
      off();
      return { eventAmps: amps, applied: v.shake, shakes: v.shakes, cam: v.cam };
    });
    rows.push({ mul, before: before.shakes, ...r });
    await sleep(900);
  }
  await ev(() => __echoes.settings.set('gameplay.screenshake', 1));
  log('rows', rows);
  const full = rows.find((r) => r.mul === 1);
  const half = rows.find((r) => r.mul === 0.5);
  const offr = rows.find((r) => r.mul === 0);
  log('verdict', {
    fullAmp: full.applied,
    halfAmp: half.applied,
    offAmp: offr.applied,
    scaled: full.applied > 0 && Math.abs(half.applied - full.applied * 0.5) < 1e-3 && offr.applied === 0,
  });
}
