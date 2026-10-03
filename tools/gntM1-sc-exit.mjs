// G1.10 exit: Exit -> confirm (Enter on "Exit") -> window.close() refused by
// the browser (the tab has 2 history entries, so it is not script-closable) ->
// farewell card within 500 ms of the confirm; Return -> title with settings
// intact; music -> 'silence' on the farewell (M3 engine, when present).
export default async function (h) {
  const { ev, sleep, log, waitFor, page, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => {
    history.pushState({}, '', location.href); // a second history entry: window.close() is refused
    __echoes.settings.set('gameplay.screenshake', 0.5);
    window.__gntStates = [];
    __echoes.app.state; // warm
    return true;
  });
  // Record app_state transitions with timestamps.
  await ev(() => {
    const svc = window.__echoes;
    window.__gntT = {};
    const obs = setInterval(() => {
      const st = svc.app.state;
      if (!window.__gntT[st]) window.__gntT[st] = performance.now();
    }, 5);
    window.__gntObs = obs;
    return true;
  });
  // Focus Exit, Enter, then Enter on the dialog's Exit button (default focus = Cancel -> ArrowLeft).
  for (let i = 0; i < 8; i++) {
    const f = await ev(() => __echoes.app.focus() && __echoes.app.focus().id);
    if (f === 'ap-title-exit') break;
    await page.keyboard.press('ArrowDown');
    await sleep(100);
  }
  await page.keyboard.press('Enter');
  await sleep(300);
  const dlg = await ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus().id, title: document.querySelector('.ap-dlg-title')?.textContent, body: document.querySelector('.ap-dlg-body')?.textContent }));
  await page.keyboard.press('ArrowLeft');
  await sleep(100);
  const confirmAt = await ev(() => performance.now());
  await page.keyboard.press('Enter');
  const fw = await waitFor(() => (__echoes.app.state === 'farewell' ? performance.now() : null), { timeout: 3000, poll: 10 });
  await sleep(400);
  const farewell = await ev(() => ({
    state: __echoes.app.state,
    stack: __echoes.app.stack(),
    focus: __echoes.app.focus() && __echoes.app.focus().id,
    text: document.querySelector('.ap-farewell .ap-dlg-body')?.textContent,
    music: __echoes.audio && __echoes.audio.music ? __echoes.audio.music() : null,
    closed: window.closed,
  }));
  await h.shot('exit-farewell');
  await page.keyboard.press('Enter'); // Return to Title
  await sleep(500);
  const back = await ev(() => ({ state: __echoes.app.state, stack: __echoes.app.stack(), focus: __echoes.app.focus() && __echoes.app.focus().id, shake: __echoes.settings.get('gameplay.screenshake'), music: __echoes.audio && __echoes.audio.music ? __echoes.audio.music() : null }));
  await ev(() => {
    __echoes.settings.set('gameplay.screenshake', 1);
    clearInterval(window.__gntObs);
    return true;
  });
  log('dialog', dlg);
  log('farewell', { ...farewell, msFromConfirm: fw ? Math.round(fw - confirmAt) : null });
  log('return', back);
  log('verdict', {
    confirmDialog: dlg.stack.join() === 'title,confirm' && dlg.focus === 'ap-confirm-cancel',
    farewellWithin500: fw !== null && fw - confirmAt <= 500,
    returnToTitle: back.state === 'title' && back.stack.join() === 'title',
    settingsIntact: back.shake === 0.5,
    musicSilence: farewell.music ? farewell.music.state === 'silence' : 'no audio engine',
  });
}
