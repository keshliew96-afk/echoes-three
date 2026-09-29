// Save critic r5 — does New Game re-derive the party stream? Two New Games in ONE page: compare the room-1 reward
// cards of the Healer (main stream) and of the allies (party stream), plus party.rng after each New Game.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  await h.open(`${BASE}?fresh=1`);
  await h.gesture();
  await h.sleep(800);
  const games = [];
  for (let g = 0; g < 3; g++) {
    if (g > 0) {
      await h.ev(() => window.__echoes.app.quitToTitle());
      await h.waitFor(() => window.__echoes.app.state === 'title', 15000);
      await h.sleep(800);
    }
    const r = await h.ev(async () => {
      const E = window.__echoes; const S = E.sim;
      await E.app.newGame();
      S.freeze();
      const t0 = E.save.capture();
      const rng0 = JSON.stringify(t0.systems.party.rng);
      const until = (p, n) => { for (let i = 0; i < n; i++) { if (p()) return i; S.stepN(1, null); } return -1; };
      E.cmd('startCampaign', { level: 1 });
      until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
      until(() => { E.cmd('killAllEnemies'); return E.state().run.phase === 'reward'; }, 1500);
      S.stepN(5, null);
      const st = E.state();
      const t1 = E.save.capture();
      const run = t1.systems.run;
      const pick = (o) => String(JSON.stringify(o)).slice(0, 700);
      const views = [1, 2, 3].map((i) => { try { return pick(E.cmd('partyView', i)); } catch (e) { return String(e); } });
      const out = { runKeys: Object.keys(run).join(','), phase: st.run.phase, seed: st.seed, rng0, rngAfter: JSON.stringify(t1.systems.party.rng), healerReward: pick(run.reward), allyCards: pick(run.party), views };
      S.thaw();
      return out;
    });
    games.push(r);
    h.log('game' + g, r);
  }
  const same = (k) => games.map((g) => g[k]).every((v) => v === games[0][k]);
  h.log('compare', { seeds: games.map((g) => g.seed), partyRng0Same: same('rng0'), partyRngAfterSame: same('rngAfter'), healerRewardSame: same('healerReward'), allyCardsSame: same('allyCards'), viewsSame: games.every((g) => JSON.stringify(g.views) === JSON.stringify(games[0].views)) });
}
