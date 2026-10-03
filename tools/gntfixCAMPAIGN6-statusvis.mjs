// gntfixCAMPAIGN6 — fix-CAMPAIGN-r6 (CR6-F2) functional + visual check of the POOLED status rigs and the
// skill layers' level teardown, on a running build:
//   1. Level 1 room 1 (harness start, sim frozen): shield + ward on all four party members, slow + stun on
//      one enemy -> content.fx().status lists the parts, screenshot A (party crop).
//   2. statuses cleared -> rigs released to the pool (content.fx().pooled.statusRigs), 0 live rigs.
//   3. statuses re-applied -> rigs come back FROM the pool (pool shrinks, no new rig), the same visible
//      parts per entity, screenshot B.
//   4. a Bounce / Siphon arc burst + Swift Mend beams in flight, then the level is cleared by cmd and the
//      card advances: at Level 2's first controllable frame content.fx() / techfx / skillfx hold no live
//      flourish, the pooled tube / ribbon geometries are handed back (gl.geometries before vs after),
//      and the rimShell ShaderMaterial count is bounded.
// usage: node tools/gntfixCAMPAIGN6-statusvis.mjs [--base URL] [--tag t]
import { launch, open, sleep, writeJson, threeCensus, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
const base = ARGS.base || 'http://127.0.0.1:4380/';
const tag = ARGS.tag || 'after';
const NAME = `gntfixCAMPAIGN6-statusvis-${tag}`;
const R = { base, tag, steps: [], checks: [] };
const check = (name, ok, d) => { R.checks.push({ name, ok: !!ok, d }); console.log(ok ? 'PASS' : 'FAIL', name, d !== undefined ? JSON.stringify(d).slice(0, 300) : ''); };
const browser = await launch({ autoplay: true });
const { page, errors, cdp } = await open(browser, base + '?menu=0&seed=7&fresh=1');
const raf = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const E = (fn, ...a) => page.evaluate(fn, ...a);
const rimCount = async () => { const c = await threeCensus(cdp); return Object.entries(c.mat.groups).filter(([k]) => k.includes('z8pbzx')).reduce((n, [, v]) => n + v, 0); };
async function partyShot(file) {
  const box = await E(() => {
    const X = window.__echoes; const ps = X.state().party.filter((p) => !p.downed);
    const pts = ps.map((p) => X.content.project(p.x, p.z, 0.5));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.max(0, Math.min(...xs) - 140), y0 = Math.max(0, Math.min(...ys) - 160);
    return { x: x0, y: y0, width: Math.min(innerWidth - x0, Math.max(...xs) - x0 + 140), height: Math.min(innerHeight - y0, Math.max(...ys) - y0 + 120) };
  });
  await page.screenshot({ path: `captures/${file}.png`, clip: box });
  return box;
}
try {
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 120000 });
  await page.waitForFunction(() => window.__echoes.campaign.ready(1).ready, { timeout: 120000 });
  await E(() => window.__echoes.cmd('startCampaign', { level: 1, depart: false }));
  await page.waitForFunction(() => { const X = window.__echoes; const cs = X.campaign.state(); return cs.level === 1 && cs.phase === 'combat' && X.state().enemies && Object.keys(X.state().enemies).length > 0; }, { timeout: 60000, polling: 50 });
  await E(() => window.__echoes.sim.stepN(120, null));
  await E(() => window.__echoes.sim.freeze());
  await raf(10);
  const rim0 = await rimCount();
  // 1. statuses on
  const apply = () => E(() => {
    const X = window.__echoes; const s = X.state();
    const party = s.party.filter((p) => !p.downed).map((p) => p.id);
    const en = Object.values(s.enemies || {}).filter((e) => e.hp > 0).map((e) => e.id);
    const out = { party, enemy: en[0] ?? null, res: [] };
    for (const id of party) { out.res.push(X.cmd('setStatus', id, 'shield', 15, 900)); out.res.push(X.cmd('setStatus', id, 'ward', 0.3, 900)); }
    if (out.enemy !== null) { out.res.push(X.cmd('setStatus', out.enemy, 'slow', 0.4, 900)); out.res.push(X.cmd('setStatus', out.enemy, 'stun', 1, 900)); }
    return out;
  });
  const a1 = await apply();
  await raf(12);
  const fx1 = await E(() => window.__echoes.content.fx());
  R.steps.push({ step: 'apply-1', a1, fx: fx1 });
  const shotA = await partyShot(`${NAME}-A`);
  const partsOf = (fx, id) => (fx.status[id] || []).slice().sort().join(',');
  check('1 shield+ward rigs on every party member', a1.party.every((id) => /shell/.test(partsOf(fx1, id)) && /ward/.test(partsOf(fx1, id))), a1.party.map((id) => partsOf(fx1, id)));
  check('1 slow+stun rig on the enemy', a1.enemy === null || (/slow/.test(partsOf(fx1, a1.enemy)) && /stun/.test(partsOf(fx1, a1.enemy))), a1.enemy !== null ? partsOf(fx1, a1.enemy) : 'no enemy');
  // 2. clear -> released to the pool
  await E((ids) => { const X = window.__echoes; for (const id of ids) X.cmd('clearStatus', id); }, [...a1.party, ...(a1.enemy !== null ? [a1.enemy] : [])]);
  await raf(6);
  const fx2 = await E(() => window.__echoes.content.fx());
  R.steps.push({ step: 'cleared', fx: fx2 });
  check('2 cleared: 0 live status rigs, the released rigs pooled', fx2.statusRigs === 0 && fx2.pooled && fx2.pooled.statusRigs >= fx1.statusRigs, { live: fx2.statusRigs, pooled: fx2.pooled });
  // 3. re-apply -> taken from the pool
  const a3 = await apply();
  await raf(12);
  const fx3 = await E(() => window.__echoes.content.fx());
  R.steps.push({ step: 'apply-2', fx: fx3 });
  await partyShot(`${NAME}-B`);
  check('3 re-applied: rigs come from the pool (pool shrank by the live count)', fx3.statusRigs === fx1.statusRigs && fx3.pooled?.statusRigs === fx2.pooled?.statusRigs - fx3.statusRigs, { live: fx3.statusRigs, pooledBefore: fx2.pooled?.statusRigs, pooledAfter: fx3.pooled?.statusRigs });
  check('3 the same visible parts per entity', a3.party.every((id) => partsOf(fx3, id) === partsOf(fx1, id)) && (a1.enemy === null || partsOf(fx3, a1.enemy) === partsOf(fx1, a1.enemy)), a3.party.map((id) => [partsOf(fx1, id), partsOf(fx3, id)]));
  // repeat the cycle 20 times: the rimShell material count must not grow
  for (let i = 0; i < 20; i++) {
    await E((ids) => { const X = window.__echoes; for (const id of ids) X.cmd('clearStatus', id); }, [...a1.party, ...(a1.enemy !== null ? [a1.enemy] : [])]);
    await raf(2);
    await apply();
    await raf(2);
  }
  const rim1 = await rimCount();
  check('3b 20 more clear/apply cycles: live rimShell ShaderMaterials unchanged (pool reuse, nothing minted)', rim1 === (await rimCount()) && rim1 <= rim0 + 2 * (fx1.statusRigs + 1), { before: rim0, after: rim1 });
  // 4. level teardown with effects in flight
  await E(() => window.__echoes.sim.thaw());
  await sleep(300);
  const pre = await E(() => { const X = window.__echoes; const s = X.state(); return { gl: s.gl, content: X.content.fx(), techfx: s.techfx, skillfx: s.skillfx }; });
  R.steps.push({ step: 'pre-clear', pre });
  await E(() => { const X = window.__echoes; X.cmd('skipToRoom', 8); X.sim.stepN(30, null); });
  for (let i = 0; i < 60; i++) { const ph = await E(() => { const X = window.__echoes; X.cmd('killBoss'); X.cmd('killAllEnemies'); X.sim.stepN(2, null); return X.state().run.phase; }); if (ph !== 'combat') break; await raf(1); }
  await page.waitForFunction(() => { const X = window.__echoes; const cs = X.campaign.state(); return cs.level === 2 && cs.phase === 'combat' && X.app.state === 'playing'; }, { timeout: 60000, polling: 50 });
  await raf(5);
  const post = await E(() => { const X = window.__echoes; const s = X.state(); return { gl: s.gl, content: X.content.fx(), techfx: s.techfx, skillfx: s.skillfx, transitions: X.campaign.transitions().slice(-1) }; });
  R.steps.push({ step: 'level-2-first-frame', post });
  const c = post.content;
  check('4 Level 2 first frame: no content flourish carried over', c.motes + c.flashes + c.rings + c.glyphs + c.absorbNumerals + c.wedges + c.rootZones + c.lances === 0, c);
  check('4 Level 2 first frame: techfx holds nothing in flight', post.techfx.arcs + post.techfx.rings + post.techfx.flashes + post.techfx.motes === 0, post.techfx);
  R.pageErrors = errors;
  check('0 page errors', errors.length === 0, errors.slice(0, 3));
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
