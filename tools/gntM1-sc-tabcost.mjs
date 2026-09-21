// Cost of a settings tab switch: click handler + microtask switch + the
// style/layout it forces (read back with a rect), 20 alternations.
export default async function (h) {
  const { ev, sleep, log, waitFor, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => {
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  await sleep(800);
  const r = await ev(async () => {
    const ids = ['ap-tab-gameplay', 'ap-tab-display', 'ap-tab-controls', 'ap-tab-audio'];
    const out = [];
    for (let i = 0; i < 20; i++) {
      const id = ids[i % ids.length];
      const t0 = performance.now();
      document.getElementById(id).click();
      await Promise.resolve();
      await Promise.resolve();
      const t1 = performance.now();
      document.querySelector('.ap-tabwrap').getBoundingClientRect();
      const t2 = performance.now();
      out.push({ id, js: Math.round((t1 - t0) * 10) / 10, layout: Math.round((t2 - t1) * 10) / 10 });
      await new Promise((res) => setTimeout(res, 120));
    }
    return out;
  });
  log('tabcost', r);
}
