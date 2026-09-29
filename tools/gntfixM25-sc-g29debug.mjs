// fix-M2-r5 — SAVE5-F1 debug: where does the stale party stream come from after Quit to Title -> New Game?
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  await h.open(`${BASE}?fresh=1`);
  await h.gesture();
  await h.sleep(800);
  const boot = await h.ev(() => { const E = window.__echoes; const t = E.save.capture(); return { seed: E.state().seed, party: t.systems.party.rng, top: t.rng }; });
  await h.key('Enter');
  await h.ready(200);
  await h.sleep(400);
  const g1 = await h.ev(() => { const E = window.__echoes; const t = E.save.capture(); return { seed: E.state().seed, party: t.systems.party.rng }; });
  const camp = await h.ev(() => {
    const E = window.__echoes; const S = E.sim; S.freeze();
    const until = (p, n) => { for (let i = 0; i < n; i++) { if (p()) return i; S.stepN(1, null); } return -1; };
    E.cmd('startCampaign', { level: 1 });
    until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
    const t = E.save.capture();
    S.thaw();
    return { seed: E.state().seed, party: t.systems.party.rng };
  });
  await h.ev(() => window.__echoes.app.quitToTitle());
  await h.waitFor(() => window.__echoes.app.state === 'title', 15000);
  await h.sleep(500);
  const afterQuit = await h.ev(() => { const E = window.__echoes; const t = E.save.capture(); return { seed: E.state().seed, party: t.systems.party.rng }; });
  const A = await h.ev(async () => { const E = window.__echoes; await E.app.newGame(); E.sim.freeze(); const t = E.save.capture(); return { seed: E.state().seed, party: t.systems.party.rng, hash: E.save.hash() }; });
  h.log('g29debug', { boot, g1, camp, afterQuit, A });
}
