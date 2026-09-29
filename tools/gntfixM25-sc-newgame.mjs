// Save critic r5 — New Game over a run in progress (round-3 J3-F3 regression) and G2.9 (New Game == fresh boot).
// Campaign A reaches room 3, Save & Quit; title New Game (keys) -> dialog?; campaign B plays rooms with autosaves
// (throttle reset between rooms instead of waiting 20 s); is A still loadable? Then G2.9.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id, label: f && f.label }; });
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => { for (const k of keys) for (let i = 0; i < 14; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(100); } return (await foc()).focus === id; };
  const conf = async () => h.ev(() => { const c = document.getElementById('ap-confirm-ok'); if (!c || c.offsetParent === null) return null; const box = c.closest('[class*="confirm"]') || c.parentElement.parentElement; return box.innerText.replace(/\n+/g, ' | ').slice(0, 500); });
  const autos = async () => h.ev(() => window.__echoes.save.list().filter((s) => s.kind !== 'manual').map((s) => ({ id: s.id, seed: s.meta && s.meta.seed, room: s.meta && s.meta.room, level: s.meta && s.meta.level, phase: s.meta && s.meta.phase, hash: s.hash })));
  const playRooms = async (n) => h.ev(async (n) => {
    const E = window.__echoes; const st = () => E.state();
    const wait = async (pred, ms = 20000) => { const t = performance.now(); while (performance.now() - t < ms) { if (pred()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };
    const log = [];
    for (let i = 0; i < n; i++) {
      const room = st().run.room;
      E.save.resetAutosaveThrottle();
      E.cmd('skipToRoom', room + 1);
      await wait(() => st().run.room === room + 1 && st().run.phase === 'combat', 15000);
      await new Promise((r) => setTimeout(r, 900));
      const l = E.save.autosaveLog(); const a = l[l.length - 1];
      log.push({ room: st().run.room, auto: a && { reason: a.reason, slot: a.slot, ok: a.ok, skipped: a.skipped } });
    }
    return log;
  }, n);
  await h.open(BASE + '?fresh=1');
  await h.sleep(1500);
  await h.gesture();
  await h.sleep(700);
  await h.key('Enter');
  await h.ready(200);
  await h.sleep(800);
  await h.ev(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await h.waitFor(() => window.__echoes.state().run.phase === 'combat', 20000);
  const seedA = await h.ev(() => window.__echoes.state().seed);
  const aRooms = await playRooms(2);
  // Save & Quit
  await h.key('Escape'); await h.sleep(450);
  await navTo('pz-savequit'); await h.key('Enter'); await h.sleep(500);
  await navTo('ap-confirm-ok', ['ArrowLeft', 'ArrowRight']);
  const aHash = await h.ev(() => window.__echoes.save.hash());
  await h.key('Enter');
  await h.waitFor(() => window.__echoes.app.state === 'title', 15000);
  await h.sleep(900);
  const autosA = await autos();
  // title -> New Game (keys)
  await navTo('ap-title-new');
  await h.key('Enter');
  await h.sleep(700);
  const dlg = { f: await foc(), text: await conf() };
  await h.shot('newgame-dialog');
  h.log('A', { seedA, aRooms, aHash, autosA, dlg });
  if (dlg.f.stack.includes('confirm')) { if (dlg.f.focus !== 'ap-confirm-ok') await navTo('ap-confirm-ok', ['ArrowLeft', 'ArrowRight']); await h.key('Enter'); }
  await h.waitFor(() => window.__echoes.app.state === 'playing', 15000);
  await h.sleep(900);
  await h.ev(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await h.waitFor(() => window.__echoes.state().run.phase === 'combat', 20000);
  const seedB = await h.ev(() => window.__echoes.state().seed);
  const bRooms = await playRooms(4);
  const autosB = await autos();
  const aSurvives = autosB.find((s) => s.seed === seedA);
  let aLoad = null;
  if (aSurvives) aLoad = await h.ev(async (id) => { const r = await window.__echoes.save.loadRaw(id); return { ok: r.ok, hash: window.__echoes.save.hash(), seed: window.__echoes.state().seed, room: window.__echoes.state().run.room }; }, aSurvives.id);
  h.log('B', { seedB, bRooms, autosB, aSurvives, aLoad, aHashExpected: aHash });
  h.check(!!aSurvives && aLoad && aLoad.hash === aHash, 'the Save & Quit run A was lost after New Game B autosaved', { autosB, aLoad, aHash });
  // G2.9: Quit to Title -> New Game -> frozen at tick 0 vs a fresh boot with that seed
  await h.ev(() => window.__echoes.app.quitToTitle && window.__echoes.app.quitToTitle());
  await h.waitFor(() => window.__echoes.app.state === 'title', 15000);
  await h.sleep(800);
  const r9 = await h.ev(async () => {
    const E = window.__echoes;
    const r = E.app.newGame ? await E.app.newGame() : null;
    E.sim.freeze();
    return { r: r && JSON.stringify(r).slice(0, 100), tick: E.tick, seed: E.state().seed, hash: E.save.hash() };
  });
  await h.open(BASE + `?menu=0&seed=${r9.seed}&freeze=1`);
  await h.sleep(1200);
  const fresh = await h.ev(() => ({ tick: window.__echoes.tick, hash: window.__echoes.save.hash() }));
  h.log('G2.9', { newGame: r9, freshBoot: fresh, equal: r9.hash === fresh.hash });
}
