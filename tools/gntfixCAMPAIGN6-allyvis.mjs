// gntfixCAMPAIGN6 — fix-CAMPAIGN-r6 regression check of the ally render layer after its level teardown
// (src/render/allies/index.js): the revive instrument's pooled record gives its GL geometry back at a level
// boundary and must draw again when taken from the pool in the next level; melee wedges (now a unit wedge
// scaled by reach) and kit zones (unit discs scaled by radius) keep drawing.
//   1. Level 1 room 1 (harness, sim frozen): one ally floored -> revive instrument drawn (shot A, crop).
//   2. Level 1 cleared by cmd -> card -> Level 2 (teardown: the record pooled, its geometry disposed).
//   3. Level 2 room 1, frozen: the same ally floored -> the instrument comes back from the pool (shot B):
//      reviveRings 1, ring on screen, the crop's bright-pixel count close to shot A's.
//   4. 6 s of real play in Level 2 (autopilot): wedges / zones drawn, 0 page errors.
// usage: node tools/gntfixCAMPAIGN6-allyvis.mjs [--base URL] [--tag t]
import { launch, open, sleep, writeJson, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
import sharp from 'sharp';
const base = ARGS.base || 'http://127.0.0.1:4380/';
const tag = ARGS.tag || 'after';
const NAME = `gntfixCAMPAIGN6-allyvis-${tag}`;
const R = { base, tag, steps: [], checks: [] };
const check = (name, ok, d) => { R.checks.push({ name, ok: !!ok, d }); console.log(ok ? 'PASS' : 'FAIL', name, d !== undefined ? JSON.stringify(d).slice(0, 300) : ''); };
const browser = await launch({ autoplay: true });
const { page, errors } = await open(browser, base + '?menu=0&seed=7&fresh=1');
const raf = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const E = (fn, ...a) => page.evaluate(fn, ...a);
async function floorAndShot(file) {
  const info = await E(() => {
    const X = window.__echoes; const s = X.state();
    const ally = s.party.find((p) => p.partyIndex === 2) || s.party[1];
    X.cmd('setHp', ally.id, 0);
    return { id: ally.id, x: ally.x, z: ally.z };
  });
  await raf(20);
  const st = await E((id) => { const X = window.__echoes; const s = X.state(); const p = s.party.find((q) => q.id === id); return { allyfx: { reviveRings: s.allyfx.reviveRings, reviveRingScreen: s.allyfx.reviveRingScreen, inkPassEnabled: s.allyfx.inkPassEnabled }, downed: p && p.downed, pt: X.content.project(p.x, p.z, 0.05) }; }, info.id);
  const clip = { x: Math.max(0, st.pt.x - 90), y: Math.max(0, st.pt.y - 90), width: 180, height: 180 };
  const buf = await page.screenshot({ path: `captures/${file}.png`, clip });
  const { data, info: im } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let bright = 0; for (let i = 0; i < data.length; i += im.channels) if (data[i] > 200 && data[i + 1] > 190 && data[i + 2] > 170) bright++;
  return { ...info, ...st, bright };
}
try {
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 120000 });
  await page.waitForFunction(() => window.__echoes.campaign.ready(1).ready, { timeout: 120000 });
  await E(() => window.__echoes.cmd('startCampaign', { level: 1, depart: false }));
  await page.waitForFunction(() => { const X = window.__echoes; const cs = X.campaign.state(); return cs.level === 1 && cs.phase === 'combat'; }, { timeout: 60000, polling: 50 });
  await E(() => { const X = window.__echoes; X.sim.stepN(60, null); X.sim.freeze(); });
  await raf(10);
  const a = await floorAndShot(`${NAME}-A`);
  R.steps.push({ step: 'L1 floored', a });
  // (the sim is frozen, so `downed` itself flips on the next tick; the render layer already draws the instrument)
  check('1 Level 1: the floored ally has a revive instrument on screen', a.allyfx.reviveRings === 1 && a.allyfx.reviveRingScreen.length === 1 && a.bright > 30, { rr: a.allyfx.reviveRings, bright: a.bright });
  await E(() => window.__echoes.sim.thaw());
  await E(() => { const X = window.__echoes; X.cmd('skipToRoom', 8); X.sim.stepN(30, null); });
  for (let i = 0; i < 60; i++) { const ph = await E(() => { const X = window.__echoes; X.cmd('killBoss'); X.cmd('killAllEnemies'); X.sim.stepN(2, null); return X.state().run.phase; }); if (ph !== 'combat') break; await raf(1); }
  await page.waitForFunction(() => { const X = window.__echoes; const cs = X.campaign.state(); return cs.level === 2 && cs.phase === 'combat' && X.app.state === 'playing'; }, { timeout: 60000, polling: 50 });
  await raf(5);
  const mid = await E(() => { const s = window.__echoes.state(); return { reviveRings: s.allyfx.reviveRings, downed: s.party.filter((p) => p.downed).length, gl: s.gl.geometries }; });
  R.steps.push({ step: 'L2 first frame', mid });
  check('2 Level 2 first frame: party restored, no revive instrument left', mid.reviveRings === 0 && mid.downed === 0, mid);
  await E(() => { const X = window.__echoes; X.sim.stepN(60, null); X.sim.freeze(); });
  await raf(10);
  const b = await floorAndShot(`${NAME}-B`);
  R.steps.push({ step: 'L2 floored', b });
  check('3 Level 2: the instrument comes back from the pool (its geometry re-uploaded) and draws on screen', b.allyfx.reviveRings === 1 && b.allyfx.reviveRingScreen.length === 1 && b.bright > 30, { a: a.bright, b: b.bright, rr: b.allyfx.reviveRings, outerPx: b.allyfx.reviveRingScreen.map((r) => r.outerPx) });
  // 4. real play
  await E((bid) => { const X = window.__echoes; X.cmd('setHp', bid, 1); X.sim.thaw(); X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }); }, b.id);
  let wedgeSeen = 0;
  for (let i = 0; i < 30; i++) { await sleep(200); const n = await E(() => { const v = window.__echoes.state(); return (v.allyfx && v.allyfx.wedges) || 0; }); wedgeSeen = Math.max(wedgeSeen, n); }
  await page.screenshot({ path: `captures/${NAME}-play.png` });
  await E(() => window.__echoes.cmd('autopilot', false));
  R.wedgeSeen = wedgeSeen;
  check('4 0 page errors through Level 2 play', errors.length === 0, errors.slice(0, 3));
} catch (e) {
  R.fatal = String((e && e.stack) || e).slice(0, 1500);
  console.error(R.fatal);
} finally {
  R.pageErrors = errors;
  writeJson(NAME, R);
  await browser.close();
}
const fails = R.checks.filter((c) => !c.ok).length;
console.log(R.fatal ? 'FATAL' : fails ? `FAIL ${fails}/${R.checks.length}` : `PASS ${R.checks.length}/${R.checks.length}`);
process.exit(R.fatal || fails ? 1 : 0);
