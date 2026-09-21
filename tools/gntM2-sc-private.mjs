// Blocked storage (private mode / site data denied): localStorage throws on
// access. The game must boot, saves fall back to memory with an honest note,
// 0 page errors.   node tools/gntM2-drive.mjs tools/gntM2-sc-private.mjs
export default async function (h) {
  const { ev, waitFor, log, fail, shot, sleep } = h;
  await h.page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  await h.page.goto('http://127.0.0.1:5199/?menu=0&seed=6', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const st = await ev(() => ({ echoes: !!window.__echoes, save: !!(window.__echoes && window.__echoes.save), tick: window.__echoes ? window.__echoes.tick : null }));
  log('boot', { st, errors: h.errors.slice(0, 5), console: h.consoleLines.filter((l) => /error|warn/i.test(l)).slice(0, 8) });
  if (!st.save) {
    fail('boots with storage blocked');
    return;
  }
  await waitFor(() => window.__echoes.tick > 90, { timeout: 60000 });
  const priv = await ev(async () => {
    const S = window.__echoes.save;
    const r = await S.save('manual-1', { name: 'Session only' });
    const l = await S.loadRaw('manual-1');
    window.__echoes.app.open('saves', { mode: 'load' });
    await new Promise((res) => setTimeout(res, 400));
    return { saved: r.ok, loaded: l.ok, backend: S.usage().backend, note: document.querySelector('.sv-usage').textContent, profile: S.profileReport() };
  });
  log('privateMode', priv);
  await shot('private-mode');
  if (!priv.saved || !priv.loaded || priv.backend !== 'memory' || !/this visit only/.test(priv.note)) fail('blocked storage: in-memory saves + "this visit only" note', priv);
}
