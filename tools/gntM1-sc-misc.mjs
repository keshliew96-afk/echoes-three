// Title-booted session: Show FPS counter toggles the meter; Gameplay ▸ Pause
// when the window loses focus freezes the single-player sim on blur (and not
// when off); the sim is paused on the title and under a blocking overlay;
// sim_pause events carry the reason.
export default async function (h) {
  const { ev, sleep, log, waitFor, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  const meter = () => ev(() => getComputedStyle(document.getElementById('fps-meter')).display);
  const fps = { initial: await meter() };
  await ev(() => __echoes.settings.set('display.showFps', true));
  await sleep(100);
  fps.on = await meter();
  await ev(() => __echoes.settings.set('display.showFps', false));
  await sleep(100);
  fps.off = await meter();
  const tickTitle = await ev(async () => {
    const a = __echoes.tick;
    await new Promise((r) => setTimeout(r, 700));
    return { a, b: __echoes.tick, paused: __echoes.app.simPaused(), reason: __echoes.app.pauseReason() };
  });
  // New Game
  await key('Enter');
  await waitFor(() => __echoes.app.state === 'playing', { timeout: 5000 });
  await sleep(500);
  const tickRate = async () =>
    ev(async () => {
      const a = __echoes.tick;
      await new Promise((r) => setTimeout(r, 800));
      return { ticks: __echoes.tick - a, paused: __echoes.app.simPaused(), reason: __echoes.app.pauseReason() };
    });
  const playing = await tickRate();
  await ev(() => {
    window.dispatchEvent(new Event('blur'));
    return true;
  });
  const blurred = await tickRate();
  await ev(() => {
    window.dispatchEvent(new Event('focus'));
    return true;
  });
  const refocused = await tickRate();
  await ev(() => __echoes.settings.set('gameplay.autoPause', false));
  await ev(() => {
    window.dispatchEvent(new Event('blur'));
    return true;
  });
  const blurredOff = await tickRate();
  await ev(() => {
    window.dispatchEvent(new Event('focus'));
    __echoes.settings.set('gameplay.autoPause', true);
    return true;
  });
  // A blocking overlay (Settings) pauses the single-player sim.
  await ev(() => {
    __echoes.app.open('settings');
    return true;
  });
  const overlay = await tickRate();
  await ev(() => {
    __echoes.app.back();
    return true;
  });
  await sleep(300);
  const after = await tickRate();
  log('fps', fps);
  log('pause', { tickTitle, playing, blurred, refocused, blurredOff, overlay, after });
  log('verdict', {
    fpsToggle: fps.initial === 'none' && fps.on !== 'none' && fps.off === 'none',
    titlePaused: tickTitle.a === tickTitle.b && tickTitle.paused,
    autoPause: playing.ticks > 30 && blurred.ticks === 0 && blurred.reason === 'focus_lost' && refocused.ticks > 30,
    autoPauseOff: blurredOff.ticks > 30,
    overlayPauses: overlay.ticks === 0 && after.ticks > 30,
  });
}
