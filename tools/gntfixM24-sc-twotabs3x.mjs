// fix-M2-r4 copy of the save critic's twotabs3 matrix (+ B's unwritten playtime logged) — focused: A (background) records a run; B (front, ticking) exits. Diff every echoes.* key.
const BASE = process.env.GCS4_BASE || 'http://127.0.0.1:5199/';
const NEUTRAL = process.env.GCS4_NEUTRAL || new URL('/src/version.js', BASE).href;
export default async function (h) {
  const snap = async (pg) => pg.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage).sort()) if (k.startsWith('echoes.')) { const v = localStorage.getItem(k); let x = 0; for (let i = 0; i < v.length; i++) x = (x * 31 + v.charCodeAt(i)) | 0; o[k] = v.length + '#' + (x >>> 0).toString(16); } const p = JSON.parse(localStorage.getItem('echoes.profile.v1') || 'null'); return { keys: o, prof: p && { hs: p.highScores.length, abandoned: p.records.abandoned, playtimeSec: p.playtimeSec, unlocks: JSON.stringify(p.unlocks), clears: JSON.stringify(p.records.levelClears) } }; });
  const diff = (a, b) => { const out = {}; for (const k of new Set([...Object.keys(a.keys), ...Object.keys(b.keys)])) if (a.keys[k] !== b.keys[k]) out[k] = [a.keys[k] || null, b.keys[k] || null]; return out; };
  const rows = [];
  for (const exit of (process.env.GCS4_EXITS || 'neutral,reload,close').split(',')) {
    for (const bUrl of (process.env.GCS4_BURLS || '?menu=0&seed=6|title').split('|')) {
      const N = await h.browser.newPage();
      await N.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
      await N.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('echoes.')) localStorage.removeItem(k); });
      const A = await h.browser.newPage();
      h.hook(A);
      await A.goto(BASE + '?menu=0&seed=5', { waitUntil: 'domcontentloaded' });
      await A.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 60, { timeout: 120000 });
      const B = await h.browser.newPage();
      h.hook(B);
      await B.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      if (bUrl === 'title') {
        await B.goto(BASE, { waitUntil: 'domcontentloaded' });
        await B.waitForFunction(() => !!window.__echoes && window.__echoes.app, { timeout: 120000 });
        for (let i = 0; i < 30; i++) { const st = await B.evaluate(() => window.__echoes.app.state); if (st === 'title') break; await B.keyboard.press('Space'); await h.sleep(300); }
        await B.keyboard.press('Enter');
        await B.waitForFunction(() => window.__echoes.app.state === 'playing' && window.__echoes.tick > 60, { timeout: 60000 });
      } else {
        await B.goto(BASE + bUrl, { waitUntil: 'domcontentloaded' });
        await B.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 60, { timeout: 120000 });
      }
      const recA = await A.evaluate(async (clear) => {
        const E = window.__echoes;
        E.cmd('startCampaign', { level: 1 });
        if (clear) { for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1); E.cmd('skipToRoom', 8); for (let i = 0; i < 900; i++) { const s = E.state(); if (s.run.phase === 'combat' && s.run.boss && s.run.boss.active) break; E.sim.stepN(1); } for (let i = 0; i < 900 && E.state().run.phase !== 'transit'; i++) { try { E.cmd('killBoss'); } catch (e) {} E.cmd('killAllEnemies'); E.sim.stepN(1); } E.cmd('campaignAdvance'); }
        for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
        E.cmd('abandonRun');
        for (let i = 0; i < 120; i++) E.sim.stepN(1);
        await new Promise((r) => setTimeout(r, 500));
        return { hs: E.save.profile().highScores.length, unlocked: E.campaign.unlocked() };
      }, !!process.env.GCS4_ACLEAR);
      const s1 = await snap(N);
      const b1 = await B.evaluate(() => ({ app: window.__echoes.app.state, overlay: window.__echoes.app.overlay, tick: window.__echoes.tick, vis: document.visibilityState, focus: document.hasFocus() }));
      await h.sleep(2000);
      const b2 = await B.evaluate(() => ({ tick: window.__echoes.tick, playtime: window.__echoes.save.profile().playtimeSec, profileTicks: window.__echoes.save.tracker().profileTicks, tabs: window.__echoes.save.tabs ? window.__echoes.save.tabs().profile : null }));
      const s2 = await snap(N);
      if (exit === 'neutral') await B.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
      else if (exit === 'reload') { await B.reload({ waitUntil: 'domcontentloaded' }); await B.waitForFunction(() => !!window.__echoes, { timeout: 120000 }); }
      else await B.close({ runBeforeUnload: true });
      await h.sleep(1500);
      const s3 = await snap(N);
      const row = { exit, bUrl, recA, b1, b2, profBefore: s2.prof, profAfter: s3.prof, whileOpen: diff(s1, s2), onExit: diff(s2, s3), lost: s3.prof.hs < s2.prof.hs };
      rows.push(row);
      h.log('row', row);
      for (const p of [A, B, N]) await p.close().catch(() => {});
    }
  }
  h.log('matrix', rows.map((r) => `${r.bUrl}/${r.exit}: B unwritten ${(r.b2.profileTicks / 60).toFixed(1)}s playtime ${r.profBefore.playtimeSec}->${r.profAfter.playtimeSec} | ${r.b1.app}/${r.b1.overlay} tick ${r.b1.tick}->${r.b2.tick} vis ${r.b1.vis} | unlocks ${r.profBefore.unlocks}->${r.profAfter.unlocks} clears ${r.profBefore.clears}->${r.profAfter.clears} | hs ${r.profBefore.hs}->${r.profAfter.hs}${r.lost ? ' LOST' : ''} | exit wrote ${Object.keys(r.onExit).join(',')}`));
}
