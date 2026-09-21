// Frame cost in each app state: ?menu=0 camp, then (plain URL) title + settings.
export default async function (h) {
  const { ev, sleep, log, waitFor, key } = h;
  await sleep(3000);
  const st = await ev(() => __echoes.app.state);
  if (st !== 'playing') {
    await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 60000 });
    if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
    await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  }
  await sleep(2500);
  log('stats-' + (await ev(() => __echoes.app.state)), await ev(() => __echoes.app.frameStats()));
  if ((await ev(() => __echoes.app.state)) === 'title') {
    await ev(() => __echoes.app.open('settings'));
    await sleep(2500);
    log('stats-settings', await ev(() => __echoes.app.frameStats()));
    // Profile JS: time spent in app.update vs the rest.
    const prof = await ev(async () => {
      const a = __echoes.app;
      const t = [];
      const orig = performance.now.bind(performance);
      return { ringCount: a.ringCount(), focus: a.focus() };
    });
    log('prof', prof);
  }
}
