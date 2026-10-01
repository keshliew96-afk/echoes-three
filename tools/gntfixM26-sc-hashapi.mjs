// Save critic r6 — does save.hash(tree) hash its argument? (PLAN §3.4: api.hash(tree = api.capture()))
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';
export default async function (h) {
  await h.open(BASE + '?menu=0&seed=13&fresh=1&freeze=1');
  await h.ready(0);
  await h.sleep(800);
  const r = await h.ev(async () => {
    const E = window.__echoes; E.sim.freeze();
    const a = E.save.capture();
    const b = JSON.parse(JSON.stringify(a)); b.clock.tick += 1;
    const out = { live: E.save.hash(), a: E.save.hash(a), b: E.save.hash(b), empty: (() => { try { return E.save.hash({}); } catch (e) { return 'threw ' + e.message; } })() };
    await E.save.save('manual-1', { name: 'h' });
    const f = JSON.parse(E.save.exportText('manual-1'));
    out.fileHash = f.hash; out.hashOfFileState = E.save.hash(f.state);
    E.sim.stepN(10, null);
    out.liveAfter10 = E.save.hash(); out.aAfter10 = E.save.hash(a);
    return out;
  });
  h.log('hashapi', r);
}
