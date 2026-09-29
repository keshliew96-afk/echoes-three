// Save critic r5 — a FAST player: pause-menu loads back to back by real keys, alternating a Level-1 and a Level-3 save
// (different biome programs), with human-fast key timing (~70 ms between presses, no waiting for the scene to settle).
// Also: title Continue mashed from the first frame, then an immediate pause-menu load of the other level.
// Counts page errors (three.js 'isReady' TypeError) and freezes (5 s evaluate timeout).
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const errs = [];
  let cur = 'setup';
  h.page.on('pageerror', (e) => errs.push({ at: cur, msg: String(e && e.message || e).slice(0, 160) }));
  await h.open(`${BASE}?menu=0&seed=13&fresh=1&level=3`);
  await h.ready(300);
  await h.sleep(2500);
  const mk = await h.ev(async () => {
    const E = window.__echoes;
    E.cmd('skipToRoom', 4); await new Promise((r) => setTimeout(r, 2500));
    const r1 = await E.save.save('manual-1', { name: 'L3 room 4' });
    E.cmd('startCampaign', { level: 1 }); await new Promise((r) => setTimeout(r, 2500));
    E.cmd('skipToRoom', 2); await new Promise((r) => setTimeout(r, 2500));
    const r2 = await E.save.save('manual-2', { name: 'L1 room 2' });
    return { r1: r1.ok, r2: r2.ok };
  });
  h.log('made', mk);
  const alive = async () => Promise.race([h.ev(() => ({ tick: window.__echoes.tick, app: window.__echoes.app.state })).catch((e) => 'err ' + e), new Promise((r) => setTimeout(() => r('NO RESPONSE 5 s'), 5000))]);
  const foc = async () => h.ev(() => { let f = null; try { f = window.__echoes.app.focus(); } catch (e) {} return f && f.id; }).catch(() => null);
  const tap = async (k) => { await h.page.keyboard.down(k); await h.sleep(35); await h.page.keyboard.up(k); await h.sleep(35); };
  const navFast = async (id) => { for (let i = 0; i < 12; i++) { if ((await foc()) === id) return true; await tap('ArrowDown'); } return (await foc()) === id; };
  const rounds = [];
  for (let r = 0; r < 4; r++) {
    cur = 'boot-' + r;
    const t0 = Date.now();
    await h.page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await h.page.waitForFunction(() => !!window.__echoes && window.__echoes.app, { timeout: 60000 }).catch(() => {});
    let playing = null;
    for (let k = 0; k < 200; k++) {
      await tap(k % 2 ? 'Enter' : 'Space');
      const s = await Promise.race([h.ev(() => ({ app: window.__echoes.app.state, last: window.__echoes.save.lastLoad() && window.__echoes.save.lastLoad().slot })).catch(() => null), new Promise((res) => setTimeout(() => res(null), 2000))]);
      if (s && s.app === 'playing' && s.last) { playing = { ms: Date.now() - t0, slot: s.last }; break; }
    }
    const loads = [];
    for (let j = 0; j < 6; j++) {
      cur = `r${r}-load${j}`;
      const t1 = Date.now();
      const last = await h.ev(() => window.__echoes.save.lastLoad() && window.__echoes.save.lastLoad().slot).catch(() => null);
      const target = last === 'manual-1' ? 'sv-slot-manual-2' : 'sv-slot-manual-1';
      await tap('Escape');
      const okP = await navFast('pz-load');
      await tap('Enter');
      const okS = await navFast(target);
      await tap('Enter');
      await tap('Enter');
      const a = await alive();
      loads.push({ j, ms: Date.now() - t1, okP, okS, target, alive: typeof a === 'string' ? a : a.app, errs: errs.filter((e) => e.at === cur).length });
      if (typeof a === 'string') break;
    }
    cur = `r${r}-settle`;
    await h.sleep(2500);
    const fin = await alive();
    rounds.push({ r, playing, loads, final: fin, errs: errs.filter((e) => e.at.startsWith('r' + r) || e.at === 'boot-' + r).length });
    h.log('round', rounds[rounds.length - 1]);
    if (typeof fin === 'string') break;
  }
  const nLoads = rounds.reduce((s, x) => s + x.loads.length, 0);
  const msAll = rounds.flatMap((x) => x.loads.map((l) => l.ms)).sort((a, b) => a - b);
  h.log('summary', { rounds: rounds.length, loads: nLoads, loadMsMedian: msAll[Math.floor(msAll.length / 2)], loadMsMin: msAll[0], pageErrors: errs.length, errs: errs.slice(0, 8) });
}
