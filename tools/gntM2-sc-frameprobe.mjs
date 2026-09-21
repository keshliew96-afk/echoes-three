// Dev probe: frame-time distribution with vs without saving (G2.7 groundwork).
async function frames(h, fn, ms) {
  await h.ev(() => {
    window.__gntM2frames = [];
    window.__gntM2run = true;
    let last = performance.now();
    const f = (t) => { if (!window.__gntM2run) return; window.__gntM2frames.push(Math.round((t - last) * 10) / 10); last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  if (fn) await fn(); else await h.sleep(ms);
  return h.ev(() => {
    window.__gntM2run = false;
    const a = window.__gntM2frames.slice(1);
    const s = [...a].sort((x, y) => x - y);
    return { n: a.length, max: s[s.length - 1], p50: s[Math.floor(s.length / 2)], p99: s[Math.floor(s.length * 0.99)], over50: a.filter((x) => x > 50).length, over33: a.filter((x) => x > 33).length };
  });
}
export default async function (h) {
  await h.waitFor(() => window.__echoes.tick > 400 && window.__echoes.save);
  await h.sleep(2000);
  h.log('baseline', await frames(h, null, 6000));
  h.log('saving', await frames(h, async () => {
    for (let i = 0; i < 5; i++) {
      await h.ev(async () => window.__echoes.save.save('manual-2', { name: 'probe' }));
      await h.sleep(300);
    }
  }));
  h.log('baseline2', await frames(h, null, 6000));
}
