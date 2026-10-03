// Save critic r5 — G2.9 diff: Quit to Title -> New Game (after a DIRTY game with four max-stress builds, wallet,
// party purses) vs a fresh boot ?menu=0&seed=<same seed>&freeze=1. Reports every differing path of the two captures.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
function diff(a, b, path, out) {
  if (out.length > 60) return;
  if (a === b) return;
  const ta = Array.isArray(a) ? 'array' : typeof a;
  const tb = Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb || a === null || b === null || ta !== 'object' && ta !== 'array') {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, a: JSON.stringify(a).slice(0, 160), b: JSON.stringify(b).slice(0, 160) });
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) diff(a[k], b[k], path + '.' + k, out);
}
export default async function (h) {
  const variant = (process.env.GFM25_G29 || process.env.GCS5_G29) || 'dirty';
  await h.open(`${BASE}?fresh=1`);
  await h.gesture();
  await h.sleep(800);
  await h.key('Enter'); // New Game from the fresh title
  await h.ready(200);
  await h.sleep(600);
  let dirty = null;
  if (variant === 'dirty') {
    dirty = await h.ev(async () => {
      const E = window.__echoes; const S = E.sim; S.freeze();
      const until = (p, n) => { for (let i = 0; i < n; i++) { if (p()) return i; S.stepN(1, null); } return -1; };
      E.cmd('startCampaign', { level: 1 });
      until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
      until(() => { E.cmd('killAllEnemies'); return E.state().run.phase === 'reward'; }, 1500);
      S.stepN(5, null);
      E.cmd('partyStress');
      E.cmd('partyMode', 'manual');
      E.cmd('draftTake');
      S.stepN(60, 1);
      S.thaw();
      return [1, 2, 3].map((i) => { const v = E.cmd('partyView', i); return v.classId + ':' + v.slots.join('/') + ':' + v.filled + ':p' + v.purse; });
    });
  }
  const pre = await h.ev(() => { const t = window.__echoes.save.capture(); return { seed: window.__echoes.state().seed, party: t.state && t.state.systems && t.state.systems.party ? t.state.systems.party.rng : (t.systems && t.systems.party && t.systems.party.rng) }; });
  await h.ev(() => window.__echoes.app.quitToTitle && window.__echoes.app.quitToTitle());
  await h.waitFor(() => window.__echoes.app.state === 'title', 15000);
  await h.sleep(800);
  const A = await h.ev(async () => {
    const E = window.__echoes;
    await E.app.newGame();
    E.sim.freeze();
    const t = E.save.capture();
    const views = [1, 2, 3].map((i) => { const v = E.cmd('partyView', i); return v.classId + ':' + v.slots.join('/') + ':' + v.filled + ':p' + v.purse + ':' + v.mode; });
    return { tick: E.tick, seed: E.state().seed, hash: E.save.hash(), tree: JSON.stringify(t), views, wallet: E.state().wallet };
  });
  await h.open(`${BASE}?menu=0&seed=${A.seed}&freeze=1`);
  await h.sleep(1500);
  const B = await h.ev(() => { const E = window.__echoes; const t = E.save.capture(); const views = [1, 2, 3].map((i) => { const v = E.cmd('partyView', i); return v.classId + ':' + v.slots.join('/') + ':' + v.filled + ':p' + v.purse + ':' + v.mode; }); return { tick: E.tick, seed: E.state().seed, hash: E.save.hash(), tree: JSON.stringify(t), views, wallet: E.state().wallet }; });
  const out = [];
  diff(JSON.parse(A.tree), JSON.parse(B.tree), '', out);
  h.log('g29', { variant, dirty, pre, A: { tick: A.tick, seed: A.seed, hash: A.hash, views: A.views, wallet: A.wallet }, B: { tick: B.tick, seed: B.seed, hash: B.hash, views: B.views, wallet: B.wallet }, equal: A.hash === B.hash, diffs: out });
}
