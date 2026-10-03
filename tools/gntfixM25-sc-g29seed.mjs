// Save critic r5 — party stream derivation of fresh boots for seeds seen in g29-clean / g29repeat.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const out = {};
  for (const seed of [763443558, 959409563, 3012535831, 1208655309]) {
    await h.open(`${BASE}?menu=0&seed=${seed}&freeze=1`);
    await h.sleep(1200);
    out[seed] = await h.ev(() => { const t = window.__echoes.save.capture(); return { tick: window.__echoes.tick, seed: window.__echoes.state().seed, party: t.systems.party.rng, hash: window.__echoes.save.hash() }; });
  }
  h.log('seeds', out);
}
