// fix-M2-r1 regression copy of tools/gntM1-sc-journey.mjs (unchanged body) so the M1 driver writes captures/gntfixM21-m1journey.json.
// G1.11 journey by real input: plain URL -> loading (any key) -> title ->
// New Game (Enter) -> camp controllable (W moves the Healer) within 1.0 s of
// the press -> walk to the portal -> E -> room 1 combat -> killAllEnemies until
// the room clears -> reward page.
export default async function (h) {
  const { ev, sleep, log, waitFor, page, shot } = h;
  const t0 = Date.now();
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) {
    await page.keyboard.press('Enter');
  }
  await waitFor(() => __echoes.app.state === 'title' && __echoes.app.focus() && __echoes.app.focus().id === 'ap-title-new', { timeout: 10000 });
  await sleep(600);
  log('title', await ev(() => ({ tick: __echoes.tick, paused: __echoes.app.simPaused(), focus: __echoes.app.focus().id, bootMs: Math.round(performance.now()) })));
  // Press Enter on New Game and hold W straight after: controllable = the
  // Healer's sim position changes.
  const p0 = await ev(() => __echoes.cmd('campState').player);
  const pressAt = await ev(() => performance.now());
  await page.keyboard.press('Enter');
  await page.keyboard.down('KeyW');
  const moved = await waitFor(
    (p) => {
      const q = __echoes.cmd('campState').player;
      return Math.hypot(q.x - p.x, q.z - p.z) > 0.05 ? { t: performance.now(), q, state: __echoes.app.state, tick: __echoes.tick } : null;
    },
    { timeout: 5000, poll: 10, arg: p0 }
  );
  log('controllable', { msFromPress: moved ? Math.round(moved.t - pressAt) : null, moved });
  const inPortal = await waitFor(() => __echoes.cmd('campState').inPortal, { timeout: 12000, poll: 50 });
  await page.keyboard.up('KeyW');
  log('portal', { inPortal: !!inPortal, tick: await ev(() => __echoes.tick) });
  await page.keyboard.press('KeyE');
  const combat = await waitFor(() => {
    const r = __echoes.state().run;
    return r && r.phase === 'combat' && r.room === 1 ? { tick: __echoes.tick } : null;
  }, { timeout: 10000 });
  log('combat', combat);
  let cleared = null;
  for (let i = 0; i < 12 && !cleared; i++) {
    await ev(() => __echoes.cmd('killAllEnemies'));
    cleared = await waitFor(() => {
      const r = __echoes.state().run;
      return r && r.phase !== 'combat' ? { phase: r.phase, room: r.room, tick: __echoes.tick } : null;
    }, { timeout: 1500 });
  }
  log('cleared', cleared);
  await sleep(800);
  await shot('gntfixM21-journey-reward');
  log('end', await ev(() => ({ app: __echoes.app.state, stack: __echoes.app.stack(), run: __echoes.state().run && __echoes.state().run.phase, runUi: __echoes.runUi && __echoes.runUi.screen ? __echoes.runUi.screen() : null, ms: Math.round(performance.now()) })));
  log('wallMs', Date.now() - t0);
}
