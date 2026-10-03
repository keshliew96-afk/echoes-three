// G2.8 high scores · G2.9 New Game == fresh boot · G2.11 registry order ·
// G2.12 capture point.
//   node tools/gntM2-drive.mjs tools/gntM2-sc-gates.mjs
import { auditTop } from './gntM2-audit.mjs';

const ORIGIN = 'http://127.0.0.1:5199/';
const ACT_MUL = { 1: 1, 2: 1.5, 3: 2 };
const CH_MUL = { relaxed: 0.75, standard: 1, harrowing: 1.5 };
const formula = (r) =>
  Math.round((100 * r.roomsCleared + 5 * r.kills + 1000 * (r.victory ? 1 : 0)) * ACT_MUL[r.act] * CH_MUL[r.challenge]) + (r.victory ? Math.max(0, 900 - Math.round(r.timeSec)) : 0);

export default async function (h) {
  const { ev, sleep, key, shot, waitFor, log, fail, W } = h;

  // ================================================================ G2.8
  await h.open(`${ORIGIN}?menu=0&seed=3&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  await ev(() => {
    window.__gntM2runEnds = [];
    window.__echoes.on('run_end', (e) => window.__gntM2runEnds.push({ ...e }));
  });
  // Run 1: clear room 1 (real kills), take the reward, walk into room 2, then a real defeat.
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await waitFor(() => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().enemies.length > 0, { timeout: 20000 });
  await waitFor(() => {
    window.__echoes.cmd('killAllEnemies');
    return window.__echoes.state().run.phase === 'reward';
  }, { timeout: 30000, polling: 200 });
  await sleep(900);
  await ev(() => window.__echoes.cmd('draftTake'));
  await waitFor(() => window.__echoes.state().run.phase === 'path', { timeout: 10000 });
  await sleep(700);
  await ev(() => window.__echoes.cmd('pathChoose', 0));
  await waitFor(() => window.__echoes.state().run.room === 2 && window.__echoes.state().run.phase === 'combat', { timeout: 15000 });
  await sleep(1200);
  await ev(() => window.__echoes.cmd('downAll'));
  await waitFor(() => window.__echoes.state().run.phase === 'defeat', { timeout: 10000 });
  await sleep(900);
  const run1 = await ev(() => ({ rec: window.__echoes.save.lastRecord(), ev: window.__gntM2runEnds.slice(-1)[0], card: (document.querySelector('.rn-end .rn-summary') || {}).textContent || '' }));
  await shot('gates-defeat-card');
  log('run1', run1);
  const s1 = run1.rec && run1.rec.summary;
  if (!s1 || run1.rec.score !== formula(s1)) fail('run 1 score = §3.4 formula', run1.rec);
  if (!s1 || s1.kills <= 0 || s1.roomsCleared !== run1.ev.rooms) fail('run 1 kills + rooms recorded', run1.rec);
  if (!/SCORE/.test(run1.card) || !/New best/.test(run1.card)) fail('defeat card shows SCORE · New best!', run1.card);
  await ev(() => window.__echoes.cmd('returnToCamp'));
  await sleep(1200);
  // Run 2: a victory (skip to the Stag, kill it) — beats run 1.
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(600);
  await ev(() => window.__echoes.cmd('skipToRoom', 8));
  await waitFor(() => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', { timeout: 15000 });
  await sleep(1500);
  await ev(() => window.__echoes.cmd('killBoss'));
  await waitFor(() => window.__echoes.state().run.phase === 'victory', { timeout: 15000 });
  await sleep(900);
  const run2 = await ev(() => ({ rec: window.__echoes.save.lastRecord(), ev: window.__gntM2runEnds.slice(-1)[0], card: (document.querySelector('.rn-end .rn-summary') || {}).textContent || '', profile: window.__echoes.save.profile(), unlocked: window.__echoes.content.unlockedActs() }));
  await shot('gates-victory-card');
  log('run2', { rec: run2.rec, card: run2.card, unlocked: run2.unlocked, records: run2.profile.records });
  const s2 = run2.rec && run2.rec.summary;
  if (!s2 || run2.rec.score !== formula(s2) || !s2.victory) fail('run 2 (victory) score = §3.4 formula', run2.rec);
  if (!run2.rec.newBest || run2.rec.rank !== 1) fail('run 2 is the new best, rank 1', run2.rec);
  if (!/New best/.test(run2.card)) fail('victory card shows New best', run2.card);
  if (!run2.unlocked.includes(2)) fail('a victory in Act I unlocks Act II (profile)', run2.unlocked);
  const p = run2.profile;
  if (p.highScores.length !== 2 || p.highScores[0].score !== run2.rec.score || p.records.runs !== 2 || p.records.victories !== 1 || p.records.defeats !== 1) fail('profile high scores + records', p);
  if (p.records.fastestVictorySec[1] !== Math.round(s2.timeSec)) fail('fastest victory recorded', p.records);
  // Persist across reload; shown on the Records screen from the title.
  await h.open(ORIGIN);
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  await sleep(500);
  const persisted = await ev(() => window.__echoes.save.profile());
  if (JSON.stringify(persisted.highScores) !== JSON.stringify(p.highScores)) fail('high scores persist across reload', { before: p.highScores, after: persisted.highScores });
  const rb = await ev(() => {
    const b = document.querySelector('#ap-title-records');
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await h.page.mouse.move(rb.x, rb.y);
  await h.page.mouse.click(rb.x, rb.y);
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'records', { timeout: 3000 });
  await sleep(400);
  const recUi = await ev(() => ({
    rows: [...document.querySelectorAll('.sv-scores tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()),
    side: document.querySelector('.sv-rside').textContent.replace(/\s+/g, ' ').trim().slice(0, 400),
  }));
  const auditRec = await ev(auditTop, { floor: W <= 1024 ? 14 : 18, minHit: 40 });
  log('recordsScreen', { ...recUi, audit: auditRec.issueCount, minFont: auditRec.minFont });
  if (auditRec.issueCount) fail('records layout', auditRec.issues);
  await shot('gates-records');
  if (recUi.rows.length !== 2 || !recUi.rows[0].includes(run2.rec.score.toLocaleString())) fail('Records lists both runs, best first', recUi.rows);
  await key('Escape');
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'title', { timeout: 3000 });

  // ================================================================ G2.9
  await h.open(`${ORIGIN}?seed=77&menu=1&fresh=1`);
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  const H0 = await ev(() => ({ hash: window.__echoes.save.hash(), tick: window.__echoes.tick, fresh: window.__echoes.save.freshHash(77), boot: window.__echoes.save.bootHash() }));
  await ev(() => window.__echoes.app.newGame());
  await waitFor(() => window.__echoes.app.state === 'playing', { timeout: 5000 });
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(2500);
  await ev(() => window.__echoes.app.quitToTitle({ save: false }));
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 5000 });
  const H1 = await ev(async () => {
    const p = window.__echoes.app.newGame({ seed: 77 });
    const hash = window.__echoes.save.hash(); // same task: no frame has ticked yet
    await p;
    return { hash, tick: window.__echoes.tick, scene: window.__echoes.cmd('campState').mode, run: window.__echoes.state().run.phase, state: window.__echoes.app.state };
  });
  log('newGame', { H0, H1 });
  if (H1.hash !== H0.hash || H0.hash !== H0.fresh) fail('Quit to Title -> New Game == fresh boot (same seed)', { H0, H1 });
  if (H1.scene !== 'camp' || H1.run !== 'idle') fail('New Game lands in a fresh camp', H1);
  // The player's path (no seed given): Quit to Title picks a new seed S; the
  // camp behind the title must be exactly a fresh boot with ?seed=S.
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(2000);
  await ev(() => window.__echoes.app.quitToTitle({ save: false }));
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 5000 });
  const H2 = await ev(async () => {
    const p = window.__echoes.app.newGame();
    const r = { hash: window.__echoes.save.hash(), seed: window.__echoes.seed, tick: window.__echoes.tick };
    await p;
    return r;
  });
  await h.open(`${ORIGIN}?seed=${H2.seed}&menu=1&fresh=1`);
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  const H3 = await ev(() => ({ hash: window.__echoes.save.hash(), seed: window.__echoes.seed, tick: window.__echoes.tick }));
  log('newGameNoSeed', { afterQuit: H2, freshBootSameSeed: H3 });
  if (H2.hash !== H3.hash) fail('Quit to Title -> New Game (random seed S) == fresh boot ?seed=S', { H2, H3 });

  // ================================================================ G2.11
  await h.open(`${ORIGIN}?menu=0&seed=5&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  const reg = await ev(() => {
    const E = window.__echoes;
    const S = E.save;
    E.sim.freeze();
    const x = E.cmd('spawn', 'dummy', 2, 1);
    const y = E.cmd('spawn', 'dummy', -2, 1);
    const z = E.cmd('spawn', 'dummy', 0, 2.5);
    E.cmd('setHp', y, 0); // dies -> despawned
    E.sim.stepN(2, null);
    const A = S.capture();
    const hA = S.hash();
    const savedIds = A.registry.entities.map((e) => e.id);
    const c1 = S.continuation({ ticks: 600, scriptSeed: 2, restore: false });
    // Interleave the live registry: X gone, two new ids past Z.
    E.cmd('setHp', x, 0);
    E.sim.stepN(2, null);
    const w1 = E.cmd('spawn', 'dummy', 1, -1);
    const w2 = E.cmd('spawn', 'dummy', -1, -1);
    const liveIds = S.order();
    const r = S.apply(A);
    const order = S.order();
    const ascending = order.every((id, i) => i === 0 || id > order[i - 1]);
    const hB = S.hash();
    const c2 = S.continuation({ ticks: 600, scriptSeed: 2, restore: false });
    let div = null;
    for (let i = 0; i < c1.hashes.length; i++) if (c1.hashes[i].h !== c2.hashes[i].h) { div = { i, a: c1.hashes[i], b: c2.hashes[i] }; break; }
    E.sim.thaw();
    return { ids: { x, y, z, w1, w2 }, savedIds, liveIds, applied: r.ok, order, ascending, hashEqual: hA === hB, continuationEqual: !div && c1.eventsHash === c2.eventsHash, div, events: [c1.eventCount, c2.eventCount] };
  });
  log('registryOrder', reg);
  if (!reg.applied || !reg.ascending || !reg.hashEqual || !reg.continuationEqual) fail('G2.11 registry rebuilt ascending + hash equal + 600-tick continuation matches', reg);
  if (!(reg.liveIds.includes(reg.ids.w1) && !reg.savedIds.includes(reg.ids.w1) && reg.savedIds.includes(reg.ids.x) && !reg.liveIds.includes(reg.ids.x))) fail('ids really interleaved (saved-only and live-only ids)', reg);

  // ================================================================ G2.12
  await h.open(`${ORIGIN}?menu=0&seed=8&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  const cp = {};
  // room_enter emitted INSIDE a sim step (the fade into room 2).
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await waitFor(() => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().enemies.length > 0, { timeout: 20000 });
  await waitFor(() => {
    window.__echoes.cmd('killAllEnemies');
    return window.__echoes.state().run.phase === 'reward';
  }, { timeout: 30000, polling: 200 });
  await sleep(800);
  await ev(() => window.__echoes.cmd('draftTake'));
  await waitFor(() => window.__echoes.state().run.phase === 'path', { timeout: 10000 });
  await sleep(600);
  const pRoom = ev(() => window.__echoes.save.captureOnEvent('room_enter'));
  await sleep(50);
  await ev(() => window.__echoes.cmd('pathChoose', 0));
  cp.room_enter = await pRoom;
  // shop_open inside a step: room 6 -> clear -> path -> door into room 7.
  await ev(() => window.__echoes.cmd('skipToRoom', 6));
  await waitFor(() => window.__echoes.state().run.room === 6 && window.__echoes.state().run.phase === 'combat', { timeout: 15000 });
  await sleep(1500);
  await waitFor(() => {
    window.__echoes.cmd('killAllEnemies');
    return ['reward', 'path'].includes(window.__echoes.state().run.phase);
  }, { timeout: 60000, polling: 200 });
  await sleep(800);
  // Room 6 has no path page: the reward leads straight through the fade into
  // the shop, whose shop_open fires inside that step.
  const pShop = ev(() => window.__echoes.save.captureOnEvent('shop_open'));
  await sleep(50);
  if (await ev(() => window.__echoes.state().run.phase === 'reward')) await ev(() => window.__echoes.cmd('draftTake'));
  if (await ev(() => window.__echoes.state().run.phase === 'path')) await ev(() => window.__echoes.cmd('pathChoose', 0));
  cp.shop_open = await pShop;
  // run_end inside a step: a defeat resolved by the end-of-tick rule.
  await ev(() => window.__echoes.cmd('shopAdvance'));
  await waitFor(() => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', { timeout: 15000 });
  await sleep(1000);
  const pEnd = ev(() => window.__echoes.save.captureOnEvent('run_end'));
  await sleep(50);
  await ev(() => window.__echoes.cmd('downAll'));
  cp.run_end = await pEnd;
  log('capturePoint', cp);
  for (const [k, v] of Object.entries(cp)) {
    if (!v.ok || v.captureTick !== v.eventTick) fail(`${k}: capture deferred to the event's own tick end`, v);
    if (!v.pending || v.pending.deferred !== 0 || v.pending.continuations !== 0) fail(`${k}: queues empty at capture`, v);
    if (v.directCaptureInsideListener !== 'CapturePointError') fail(`${k}: a direct capture inside the listener is refused`, v);
  }
}
