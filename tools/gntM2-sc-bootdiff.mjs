// Dev probe: what differs between the boot snapshot (SAVE block, tick 0) and
// the world at the title (still tick 0)?
export default async function (h) {
  const { ev, key, waitFor, log } = h;
  await h.open('http://127.0.0.1:5199/?seed=77&menu=1&fresh=1');
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  const d = await ev(() => {
    const S = window.__echoes.save;
    const A = S.bootTree();
    const B = S.capture();
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
      out.push({ path, a: String(ta).slice(0, 120), b: String(tb).slice(0, 120) });
    };
    walk(A, B, '$');
    return out;
  });
  log('diff', d);
}
