// Dev probe: Quit to Title -> New Game(seed) vs the fresh tree for that seed.
export default async function (h) {
  const { ev, key, sleep, waitFor, log } = h;
  await h.open('http://127.0.0.1:5199/?seed=77&menu=1&fresh=1');
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => window.__echoes.app.newGame());
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(2500);
  await ev(() => window.__echoes.app.quitToTitle({ save: false }));
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 5000 });
  const d = await ev(async () => {
    const S = window.__echoes.save;
    const p = window.__echoes.app.newGame({ seed: 77 });
    const B = S.capture();
    await p;
    const A = S.freshTree(77);
    const out = [];
    const walk = (a, b, path) => {
      if (out.length > 40) return;
      const ta = JSON.stringify(a);
      const tb = JSON.stringify(b);
      if (ta === tb) return;
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], `${path}.${k}`);
        return;
      }
      out.push({ path, a: String(ta).slice(0, 160), b: String(tb).slice(0, 160) });
    };
    walk(A, B, '$');
    return out;
  });
  log('diff', d);
}
