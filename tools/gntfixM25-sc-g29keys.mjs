// fix-M2-r5 — SAVE5-F1 by REAL keys (the refuter's route): title New Game (Enter) -> Esc -> pause "Quit to Title"
// (Down to pz-quit, Enter, confirm) -> title New Game (Enter, confirm "Start a new game?" if asked) -> the camp's
// party stream vs a fresh ?menu=0&seed=<that seed>&freeze=1 boot. Two quits in one page (the second New Game was
// the stale one). The camp never draws from the party stream, so the stream state must be equal to the boot's.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const foc = async () => h.ev(() => { let f = null; try { f = window.__echoes.app.focus(); } catch (e) {} return f && f.id; });
  const navTo = async (id, key = 'ArrowDown', n = 12) => { for (let i = 0; i < n; i++) { if ((await foc()) === id) return true; await h.key(key); await h.sleep(120); } return (await foc()) === id; };
  const confirmIfAsked = async () => {
    await h.sleep(400);
    const dlg = await h.ev(() => !!document.querySelector('#ap-confirm-ok'));
    if (dlg) { const ok = await navTo('ap-confirm-ok', 'ArrowLeft', 4) || await navTo('ap-confirm-ok', 'ArrowRight', 4); await h.key('Enter'); return ok ? 'ok' : 'enter'; }
    return 'none';
  };
  await h.open(`${BASE}?fresh=1`);
  await h.gesture();
  await h.sleep(800);
  const games = [];
  await navTo('ap-title-new', 'ArrowDown');
  await h.key('Enter');
  games.push({ start: await confirmIfAsked() });
  await h.waitFor(() => window.__echoes.app.state === 'playing', 20000);
  await h.sleep(1500);
  for (let g = 0; g < 2; g++) {
    await h.key('Escape'); await h.sleep(500);
    const onQuit = await navTo('pz-quit', 'ArrowDown');
    await h.key('Enter');
    const conf = await confirmIfAsked();
    await h.waitFor(() => window.__echoes.app.state === 'title', 20000);
    await h.sleep(1200);
    const onNew = await navTo('ap-title-new', 'ArrowDown') || await navTo('ap-title-new', 'ArrowUp');
    await h.key('Enter');
    const conf2 = await confirmIfAsked();
    await h.waitFor(() => window.__echoes.app.state === 'playing', 20000);
    await h.sleep(600);
    const A = await h.ev(() => { const E = window.__echoes; const t = E.save.capture(); return { seed: E.state().seed, tick: E.tick, party: t.systems.party.rng, mode: E.app.mode }; });
    games.push({ g, onQuit, conf, onNew, conf2, A });
  }
  h.log('games', games);
  const out = [];
  for (const gm of games.filter((x) => x.A)) {
    await h.open(`${BASE}?menu=0&seed=${gm.A.seed}&freeze=1`);
    await h.sleep(1200);
    const B = await h.ev(() => { const t = window.__echoes.save.capture(); return { seed: window.__echoes.state().seed, party: t.systems.party.rng }; });
    const equal = JSON.stringify(gm.A.party) === JSON.stringify(B.party);
    out.push({ g: gm.g, seed: gm.A.seed, newGame: gm.A.party, freshBoot: B.party, equal });
    h.check(equal, `game ${gm.g}: party stream equals the fresh boot's`, { A: gm.A.party, B: B.party });
  }
  h.log('g29keys', out);
}
