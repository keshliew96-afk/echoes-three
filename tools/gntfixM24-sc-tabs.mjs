// fix-M2-r4 (SAVE4-F1) — two game tabs sharing one localStorage, beyond the
// critic's exit sequence: the OTHER tab's view stays live and none of its
// decisions is made on a stale catalogue.
//   node tools/gntfixM24-drive.mjs tools/gntfixM24-sc-tabs.mjs --tag dev
//   (GCS4_BASE / GCS4_NEUTRAL for a production preview)
// Leg P: tab B (camp, Records open) sees tab A's campaign record + Level II
//        unlock without a reload; B played on + reloaded keeps them.
// Leg S: slots — B sees A's saves at once (list, Continue), B's autosave
//        rotation spares A's run in progress, B's import never lands on A's
//        slot, A's open saves screen redraws when B deletes a slot, and the
//        ended-runs list keeps both tabs' games.
const BASE = process.env.GCS4_BASE || 'http://127.0.0.1:5199/';
const NEUTRAL = process.env.GCS4_NEUTRAL || new URL('/src/version.js', BASE).href;
export default async function (h) {
  await h.page.goto(NEUTRAL, { waitUntil: 'domcontentloaded' }); // the driver's own game page leaves
  const wipe = async (pg) => pg.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('echoes.')) localStorage.removeItem(k); });
  const prof = async (pg) => pg.evaluate(() => { const p = JSON.parse(localStorage.getItem('echoes.profile.v1') || 'null'); return p && { hs: p.highScores.length, unlocks: p.unlocks.acts.join(','), clears: p.records.levelClears[1], runs: p.records.runs, abandoned: p.records.abandoned }; });
  const openGame = async (url) => {
    const pg = await h.browser.newPage();
    await pg.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    h.hook(pg);
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await pg.waitForFunction(() => !!window.__echoes && window.__echoes.save && window.__echoes.tick >= 60, { timeout: 120000 });
    return pg;
  };
  // A campaign in tab `pg`: optionally clear Level 1, then Quit to Lobby (abandonRun).
  const campaignRecord = (pg, clear) => pg.evaluate(async (clear) => {
    const E = window.__echoes;
    E.cmd('startCampaign', { level: 1 });
    for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
    if (clear) {
      E.cmd('skipToRoom', 8);
      for (let i = 0; i < 900; i++) { const s = E.state(); if (s.run.phase === 'combat' && s.run.boss && s.run.boss.active) break; E.sim.stepN(1); }
      for (let i = 0; i < 900 && E.state().run.phase !== 'transit'; i++) { try { E.cmd('killBoss'); } catch (e) {} E.cmd('killAllEnemies'); E.sim.stepN(1); }
      E.cmd('campaignAdvance');
      for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
    }
    const seed = E.state().run.frame ? E.state().run.frame.seed : null;
    E.cmd('abandonRun');
    for (let i = 0; i < 120; i++) E.sim.stepN(1);
    await new Promise((r) => setTimeout(r, 300));
    return { seed, hs: E.save.profile().highScores.length, unlocked: E.campaign.unlocked() };
  }, clear);

  // ---------------------------------------------------------------- Leg P --
  {
    const N = await h.browser.newPage();
    await N.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
    await wipe(N);
    const B = await openGame(BASE + '?menu=0&seed=6');
    await B.evaluate(() => window.__echoes.app.open('records'));
    await h.sleep(400);
    const bBefore = await B.evaluate(() => ({ sub: (document.querySelector('.sv-rsub') || {}).textContent, unlocked: window.__echoes.campaign.unlocked(), top: window.__echoes.app.overlay }));
    const A = await openGame(BASE + '?menu=0&seed=5');
    const recA = await campaignRecord(A, true);
    await h.sleep(800);
    const bLive = await B.evaluate(() => ({
      sub: (document.querySelector('.sv-rsub') || {}).textContent,
      rows: document.querySelectorAll('.sv-scores tr, .sv-scores .sv-srow').length,
      unlocked: window.__echoes.campaign.unlocked(),
      hs: window.__echoes.save.profile().highScores.length,
      tabs: window.__echoes.save.tabs(),
    }));
    h.page = B;
    await B.bringToFront();
    await h.sleep(300);
    await h.shot('tabs-B-records-live');
    h.log('legP-live', { bBefore, recA, bLive });
    h.check(bBefore.sub && /^0 runs/.test(bBefore.sub), 'B Records start at 0 runs', bBefore);
    h.check(bLive.unlocked.includes(2) && bLive.hs === 1 && /^1 run/.test(bLive.sub || ''), "B's open Records + unlocks follow A's write without a reload", bLive);
    h.check(bLive.tabs.adopted.profile >= 1, 'B adopted the profile from the storage event', bLive.tabs);
    // B plays on, then reloads — the critic's exit
    await B.evaluate(() => window.__echoes.app.back());
    await h.sleep(300);
    if ((await B.evaluate(() => window.__echoes.app.overlay)) === 'pause') { await B.keyboard.press('Escape'); await h.sleep(400); }
    await B.keyboard.down('KeyD'); await h.sleep(1500); await B.keyboard.up('KeyD');
    const before = await prof(N);
    await B.reload({ waitUntil: 'domcontentloaded' });
    await B.waitForFunction(() => !!window.__echoes && window.__echoes.save, { timeout: 120000 });
    await h.sleep(1500);
    const after = await prof(N);
    h.log('legP-exit', { before, after });
    h.check(after.hs === before.hs && after.unlocks === before.unlocks && after.clears === before.clears && after.abandoned === before.abandoned, 'B reload keeps A\'s records + unlock', { before, after });
    for (const p of [A, B, N]) await p.close().catch(() => {});
  }

  // ---------------------------------------------------------------- Leg S --
  {
    const N = await h.browser.newPage();
    await N.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
    await wipe(N);
    const B = await openGame(BASE + '?menu=0&seed=6'); // boots on an empty catalogue
    const A = await openGame(BASE + '?menu=0&seed=5');
    // A: a run in progress with a manual save and an autosave
    const aSaves = await A.evaluate(async () => {
      const E = window.__echoes;
      E.cmd('startCampaign', { level: 1 });
      for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
      const m = await E.save.save('manual-1', { name: 'A manual' });
      const q = await E.save.autosave('quit');
      return { manual: m.ok, auto: q.ok ? q.meta.id : q.error, list: E.save.list().map((x) => x.id), seed: E.state().run.frame.seed };
    });
    const aHash1 = await N.evaluate(() => JSON.parse(localStorage.getItem('echoes.save.v1.manual-1')).hash);
    // B, right away (the storage event may not even have landed yet)
    const bView = await B.evaluate(() => {
      const S = window.__echoes.save;
      return { list: S.list().map((x) => x.id), latest: (() => { const R = window.__echoes.app.service('save'); const l = R.latest(); return l && l.id; })(), autoSlotFor: S.autoSlotFor(), impact: S.newGameImpact() ? S.newGameImpact().runs.map((r) => r.id) : null };
    });
    h.log('legS-bView', { aSaves, bView });
    h.check(bView.list.includes('manual-1') && bView.list.includes(aSaves.auto), "B lists A's saves", bView);
    h.check(bView.latest === aSaves.auto || bView.latest === 'manual-1', "B's Continue points at A's newest save", bView);
    h.check(bView.autoSlotFor !== aSaves.auto, "B's next autosave spares A's run in progress", bView);
    // B: a real autosave + an import of a file (no target)
    const bOps = await B.evaluate(async (text) => {
      const S = window.__echoes.save;
      const q = await S.autosave('quit');
      const imp = S.importText(text);
      return { auto: q.ok ? q.meta.id : q.error, importedTo: imp.ok ? imp.slotId : imp.error };
    }, await N.evaluate(() => localStorage.getItem('echoes.save.v1.manual-1')));
    const aHash2 = await N.evaluate(() => JSON.parse(localStorage.getItem('echoes.save.v1.manual-1')).hash);
    const aAuto = await N.evaluate((id) => { const t = localStorage.getItem('echoes.save.v1.' + id); return t && JSON.parse(t).meta.seed; }, aSaves.auto);
    h.log('legS-bOps', { bOps, aHash1, aHash2, aAutoSeed: aAuto, aSeed: aSaves.seed });
    h.check(bOps.auto !== aSaves.auto && aAuto === aSaves.seed, "B's autosave did not overwrite A's run autosave", { bOps, aAuto, aSeed: aSaves.seed });
    h.check(bOps.importedTo === 'manual-2' && aHash1 === aHash2, "B's import went to a free slot, A's manual-1 untouched", { bOps, aHash1, aHash2 });
    // A's saves screen open; B deletes the imported slot; A redraws
    await A.evaluate(() => window.__echoes.app.open('saves', { mode: 'load' }));
    await h.sleep(500);
    const aRows1 = await A.evaluate(() => [...document.querySelectorAll('[data-slot]')].map((e) => e.dataset.slot));
    await B.evaluate(() => window.__echoes.save.remove('manual-2'));
    await h.sleep(700);
    const aRows2 = await A.evaluate(() => [...document.querySelectorAll('[data-slot]')].map((e) => e.dataset.slot));
    h.page = A;
    await A.bringToFront();
    await h.sleep(300);
    await h.shot('tabs-A-saves-live');
    h.log('legS-live', { aRows1, aRows2 });
    h.check(aRows1.includes('manual-2') && !aRows2.includes('manual-2') && aRows2.includes('manual-1'), "A's open saves screen follows B's delete", { aRows1, aRows2 });
    await A.evaluate(() => window.__echoes.app.back());
    // ended runs: both tabs end their runs; both keys kept
    const ends = [];
    ends.push(await A.evaluate(async () => { const E = window.__echoes; const seed = E.state().run.frame.seed; E.cmd('abandonRun'); for (let i = 0; i < 60; i++) E.sim.stepN(1); await new Promise((r) => setTimeout(r, 200)); return seed; }));
    ends.push(await B.evaluate(async () => { const E = window.__echoes; E.cmd('startCampaign', { level: 1 }); for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1); const seed = E.state().run.frame.seed; E.cmd('abandonRun'); for (let i = 0; i < 60; i++) E.sim.stepN(1); await new Promise((r) => setTimeout(r, 200)); return seed; }));
    const ended = await N.evaluate(() => JSON.parse(localStorage.getItem('echoes.save.v1.endedRuns') || '[]'));
    h.log('legS-ended', { ends, ended });
    h.check(ends.every((s) => ended.includes(`run:${s >>> 0}`)), 'ended-runs list keeps both tabs\' games', { ends, ended });
    const fin = await prof(N);
    h.check(fin.runs === 2 && fin.abandoned === 2, 'profile counts both tabs\' runs', fin);
    for (const p of [A, B, N]) await p.close().catch(() => {});
  }
}
