// Visual tour: loading -> title -> settings tabs -> exit confirm. Screenshots
// captures/gntM1-tour-*.png at the driver's window size.
export default async function (h) {
  const { ev, shot, key, sleep, log, waitFor, W } = h;
  const tag = `${W}`;
  const boot = await waitFor(() => {
    const a = window.__echoes && window.__echoes.app;
    if (!a) return null;
    if (a.state === 'title') return { state: 'title' };
    const s = a.stack();
    if (s[0] === 'loading') {
      const b = document.querySelector('.ap-press.ap-on');
      return b ? { state: 'prompt' } : null;
    }
    return null;
  }, { timeout: 60000 });
  log('boot', boot);
  await shot(`tour-${tag}-loading`);
  if (boot && boot.state === 'prompt') await key('Enter');
  const t = await waitFor(() => window.__echoes.app.state === 'title' && window.__echoes.app.focus(), { timeout: 10000 });
  log('title-focus', t);
  await sleep(700);
  await shot(`tour-${tag}-title`);
  log('title', await ev(() => ({ stack: __echoes.app.stack(), items: __echoes.app.focusables(), rings: __echoes.app.ringCount(), tick: __echoes.tick, paused: __echoes.app.simPaused(), cam: __echoes.app.titleCam() })));
  // Settings
  await ev(() => __echoes.app.open('settings'));
  await sleep(400);
  await shot(`tour-${tag}-settings-display`);
  log('settings', await ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus(), items: __echoes.app.focusables(), rings: __echoes.app.ringCount() })));
  for (const tab of ['next', 'next', 'next']) {
    await key('KeyE');
    await sleep(350);
    const f = await ev(() => __echoes.app.focus());
    log('tab', f);
    await shot(`tour-${tag}-settings-${(f && f.id) || 'x'}`);
  }
  await key('Escape');
  await sleep(300);
  log('after-esc', await ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus() })));
  // Exit confirm
  await ev(() => {
    const b = document.querySelector('#ap-title-exit');
    b && b.click();
  });
  await sleep(350);
  await shot(`tour-${tag}-confirm`);
  log('confirm', await ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus() })));
  await key('Escape');
  await sleep(300);
  log('end', await ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus(), toasts: __echoes.app.toasts() })));
}
