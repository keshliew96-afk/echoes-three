// fix-M2-r4 — lifetime playtime across two tabs: the file gains exactly what
// each tab played (A's run + B's own seconds), never one tab's time twice.
const BASE = process.env.GCS4_BASE || 'http://127.0.0.1:5199/';
const NEUTRAL = process.env.GCS4_NEUTRAL || new URL('/src/version.js', BASE).href;
export default async function (h) {
  await h.page.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
  await h.ev(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('echoes.')) localStorage.removeItem(k); });
  const stored = () => h.ev(() => { const p = JSON.parse(localStorage.getItem('echoes.profile.v1') || 'null'); return p && { playtimeSec: p.playtimeSec, hs: p.highScores.length, savedAt: p.savedAt }; });
  const openGame = async (url) => {
    const pg = await h.browser.newPage();
    await pg.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    h.hook(pg);
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await pg.waitForFunction(() => !!window.__echoes && window.__echoes.save && window.__echoes.tick >= 60, { timeout: 120000 });
    return pg;
  };
  const tabState = (pg) => pg.evaluate(() => ({ tick: window.__echoes.tick, profileTicks: window.__echoes.save.tracker().profileTicks, view: window.__echoes.save.profile().playtimeSec, tabs: window.__echoes.save.tabs() }));
  const A = await openGame(BASE + '?menu=0&seed=5');
  const B = await openGame(BASE + '?menu=0&seed=6');
  const s0 = await stored();
  const a0 = await tabState(A);
  const b0 = await tabState(B);
  const rec = await A.evaluate(async () => {
    const E = window.__echoes;
    const t0 = E.save.tracker().profileTicks;
    E.cmd('startCampaign', { level: 1 });
    for (let i = 0; i < 400 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
    E.cmd('abandonRun');
    for (let i = 0; i < 60; i++) E.sim.stepN(1);
    await new Promise((r) => setTimeout(r, 300));
    return { t0, after: E.save.tracker().profileTicks };
  });
  const s1 = await stored();
  const a1 = await tabState(A);
  await h.sleep(1500);
  const b1 = await tabState(B);
  await B.goto(NEUTRAL, { waitUntil: 'domcontentloaded' });
  await h.sleep(800);
  const s2 = await stored();
  const a2 = await tabState(A);
  h.log('playtime', { s0, a0, b0, rec, s1, a1, b1, s2, a2 });
  const bOwn = b1.profileTicks / 60;
  const gained = s2.playtimeSec - s1.playtimeSec;
  h.check(s2.hs === 1, 'high score kept');
  h.check(Math.abs(gained - bOwn) < 1.5, 'B exit adds about its own unwritten seconds only', { gained, bOwn, bTicksAtCheck: b1.profileTicks });
}
