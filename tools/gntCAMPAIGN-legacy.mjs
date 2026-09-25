#!/usr/bin/env node
// CAMPAIGN legacy-harness regression (docs/gauntlet/PLAN.md gate GC.13, §6.1,
// §12.11): the boot params and debug commands written before the campaign
// keep their contracts.
//   ?scene=arena&room=kill_all the room harness boots straight into a fight
//   ?run=1&seed=7             a SINGLE-level run (mode 'single'): the Stag
//                             clear ends it with victory -> camp (no card)
//   ?menu=0 + startRun act 2  single run, starter grant, victory at the Stag
//   ?level=3&seed=7           a campaign AT level 3 on the first ticked frame
//                             (harness, setting-out card while L3 loads)
//   ?menu=0&act=2 + portal E  legacy rule 1: the portal starts at ?act=N
//   ?menu=0 + skipToRoom(5)   with no run: a single run in room 5
//   node tools/gntCAMPAIGN-legacy.mjs [--url http://127.0.0.1:5199/]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const URL0 = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'http://127.0.0.1:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(what, ok, got = null) {
  checks.push({ what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 400)}`}`);
}
async function waitFor(page, cond, { timeout = 60000, args = [] } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(cond, ...args)) return Date.now() - t0;
    await sleep(100);
  }
  throw new Error(`timeout ${cond.toString().slice(0, 100)}`);
}
async function stag(page) {
  await page.evaluate(() => __echoes.cmd('skipToRoom', 8));
  await sleep(400);
  for (let i = 0; i < 100; i++) {
    const ph = await page.evaluate(() => {
      const v = __echoes.state().run;
      if (v.phase === 'combat' && v.room === 8) {
        __echoes.cmd('killBoss');
        __echoes.cmd('killAllEnemies');
      }
      return v.phase;
    });
    if (ph !== 'combat' && ph !== 'fade' && ph !== 'skip') return ph;
    await sleep(80);
  }
  return 'stuck';
}
const browser = await launchEchoes({ gpu: true, width: 1280, height: 720 });
async function open(q) {
  const ctx = await browser.createBrowserContext();
  const o = await openEchoes(ctx, `${URL0}${q}`, { width: 1280, height: 720 });
  o.ctx = ctx;
  await o.page.waitForFunction(() => window.__echoes && __echoes.tick > 20, { timeout: 180000 });
  return o;
}
try {
  {
    const o = await open('?seed=7&scene=arena&room=kill_all');
    await sleep(2500);
    const r = await o.page.evaluate(() => ({ app: __echoes.app.state, room: __echoes.state().room, scene: __echoes.state().scene, mode: __echoes.state().vfx && __echoes.state().vfx.mode }));
    check(`?scene=arena&room=kill_all: boots playing into the wave-room harness (${JSON.stringify({ app: r.app, scene: r.scene, room: r.room && r.room.mode })})`, r.app === 'playing' && r.room && o.errors.length === 0, { r, errors: o.errors });
    await o.ctx.close();
  }
  {
    const o = await open('?run=1&seed=7');
    await waitFor(o.page, () => __echoes.state().run.active && __echoes.state().run.phase === 'combat');
    const c = await o.page.evaluate(() => __echoes.campaign.state());
    const ph = await stag(o.page);
    await sleep(300);
    const end = await o.page.evaluate(() => ({ phase: __echoes.state().run.phase, screen: __echoes.runUi().screen }));
    check(`?run=1: a single-level run (mode ${c.mode}, harness ${c.harness}) — the Stag clear -> ${ph} (end card ${end.screen}), no level card`, c.mode === 'single' && c.harness === true && ph === 'victory' && end.screen === 'end', { c, ph, end });
    await o.page.keyboard.press('Enter');
    await waitFor(o.page, () => __echoes.state().run.phase === 'idle' && __echoes.cmd('campState').mode === 'camp', { timeout: 15000 });
    check('?run=1: Enter on the victory card -> camp', o.errors.length === 0, o.errors);
    await o.ctx.close();
  }
  {
    const o = await open('?menu=0&seed=7');
    const r = await o.page.evaluate(() => {
      const v = __echoes.cmd('startRun', { act: 2 });
      return { phase: v.phase, act: v.act, c: __echoes.campaign.state() };
    });
    await sleep(800);
    const ph = await stag(o.page);
    check(`cmd('startRun', { act: 2 }): single run at act 2 with the starter grant (${JSON.stringify(r.c.card || null)}) -> ${ph}`, r.act === 2 && r.c.mode === 'single' && ph === 'victory', r);
    await o.ctx.close();
  }
  {
    const o = await open('?level=3&seed=7');
    await waitFor(o.page, () => { const v = __echoes.state().run; return v.active && v.phase === 'combat' && v.act === 3; }, { timeout: 60000 });
    const c = await o.page.evaluate(() => __echoes.campaign.state());
    const t = await o.page.evaluate(() => __echoes.campaign.transitions().slice(-1)[0]);
    check(`?level=3: a campaign AT Level 3 (start ${c.startLevel}, harness ${c.harness}, setting-out card ${t ? t.kind : null} ${t ? `${t.clearToControlMs} ms` : ''})`, c.mode === 'campaign' && c.startLevel === 3 && c.level === 3 && c.harness === true && o.errors.length === 0, { c, t });
    await o.ctx.close();
  }
  {
    const o = await open('?menu=0&act=2&seed=7');
    await o.page.keyboard.down('w');
    await waitFor(o.page, () => __echoes.cmd('campState').inPortal, { timeout: 15000 });
    await o.page.keyboard.up('w');
    await o.page.keyboard.press('e');
    await waitFor(o.page, () => { const v = __echoes.state().run; return v.active && v.phase === 'combat' && v.act === 2; }, { timeout: 60000 });
    const c = await o.page.evaluate(() => __echoes.campaign.state());
    check(`?menu=0&act=2 + portal E: legacy rule 1 — a campaign at Level 2 (harness ${c.harness})`, c.mode === 'campaign' && c.startLevel === 2 && c.harness === true, c);
    await o.ctx.close();
  }
  {
    const o = await open('?menu=0&seed=7');
    await o.page.evaluate(() => __echoes.cmd('skipToRoom', 5));
    await sleep(1200);
    const v = await o.page.evaluate(() => ({ run: __echoes.state().run, c: __echoes.campaign.state() }));
    check(`skipToRoom(5) with no run: a single run in room ${v.run.room} (mode ${v.c.mode})`, v.run.active && v.run.room === 5 && v.c.mode === 'single', { room: v.run.room, phase: v.run.phase, mode: v.c.mode });
    await o.ctx.close();
  }
} catch (err) {
  check('probe completed', false, String(err && err.stack ? err.stack : err).slice(0, 500));
} finally {
  await browser.close();
}
mkdirSync('captures', { recursive: true });
writeFileSync('captures/gntCAMPAIGN-legacy.json', JSON.stringify({ checks }, null, 1));
console.log(`${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
