#!/usr/bin/env node
// Journey critic r5: the full-slot SWAP offer by REAL keys (B19 input consistency; user rule 2026-09-27).
// Setup (debug, not evidence): ?level=2 (starter grant -> the Healer holds 4 skills) -> room 1 cleared by cmd.
// Evidence (real keys): on the swap offer read the page, press S (select a skill to replace) then Enter ->
// was the new skill TAKEN (it replaced the selected skill) or silently declined? Also: plain Enter with no selection.
//   node tools/gntcjourney5-swap.mjs [--url http://127.0.0.1:4330] [--seeds 1,2,3,4,5,6] [--tag prod] [--mode select|plain]
import { writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4330'); const tag = arg('tag', 'prod'); const mode = arg('mode', 'select');
const seeds = arg('seeds', '1,2,3,4,5,6').split(',').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(page, body, { timeout = 30000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(every); } return -1; }
const out = { schema: 'gntcjourney5-swap/1', base, tag, mode, runs: [] };
const browser = await launchEchoes({ gpu: true });
try {
  for (const seed of seeds) {
    const ctx = await browser.createBrowserContext();
    const { page, errors } = await openEchoes(ctx, `${base}/?fresh=1&level=2&seed=${seed}`);
    const run = { seed };
    try {
      await waitFor(page, `window.__echoes.state().run.phase==='combat'`, { timeout: 120000 });
      await sleep(1500);
      // clear room 1 (setup only)
      for (let i = 0; i < 40; i++) { const ph = await page.evaluate(() => window.__echoes.state().run.phase); if (ph !== 'combat') break; await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(700); }
      const draftT = await waitFor(page, `(window.__echoes.runUi()||{}).screen==='draft' && window.__echoes.runUi().settled===true`, { timeout: 30000 });
      await sleep(600);
      const before = await page.evaluate(() => { const E = window.__echoes; const r = E.state().run; const u = E.runUi() || {}; return { skills: E.state().build.skills.map((k) => k && k.id), reward: r.reward && { kind: r.reward.kind, id: r.reward.id, replace: r.reward.replace, swap: r.reward.swap, keys: Object.keys(r.reward) }, text: (u.text || '').slice(0, 700), focus: (E.app.focus() || {}).id ?? null }; });
      run.draftT = draftT; run.before = before;
      await page.screenshot({ path: `captures/gntfixINT5-swap-${tag}-s${seed}-offer.png` });
      const n0 = await page.evaluate(() => window.__echoes.events.length);
      if (mode === 'select') { await page.keyboard.press('s'); await sleep(350); }
      const mid = await page.evaluate(() => { const u = window.__echoes.runUi() || {}; const r = window.__echoes.state().run; return { text: (u.text || '').slice(0, 700), replace: r.reward && r.reward.replace }; });
      run.mid = mid;
      await page.screenshot({ path: `captures/gntfixINT5-swap-${tag}-s${seed}-selected.png` });
      await page.keyboard.press('Enter'); await sleep(1200);
      const after = await page.evaluate((n0) => { const E = window.__echoes; const evs = E.events.slice(n0).filter((e) => /draft|reward|swap|skill_/.test(e.type)).map((e) => ({ type: e.type, id: e.id ?? e.skill ?? e.skillId ?? null, replaced: e.replaced ?? e.replace ?? null, seat: e.seat ?? null })); return { skills: E.state().build.skills.map((k) => k && k.id), phase: E.state().run.phase, screen: (E.runUi() || {}).screen, evs: evs.slice(0, 12) }; }, n0);
      run.after = after;
      const offered = before.reward && before.reward.id;
      run.taken = !!(offered && after.skills.includes(offered));
      run.declined = after.evs.some((e) => e.type === 'draft_declined' && (e.seat === 0 || e.seat === null));
      console.log(JSON.stringify({ seed, offered, before: before.skills, replaceSuggested: before.reward && before.reward.replace, midReplace: mid.replace, after: after.skills, taken: run.taken, declined: run.declined, evs: after.evs.map((e) => e.type).join(',') }));
    } catch (e) { run.error = String(e); console.log('ERR', seed, String(e)); }
    run.pageErrors = errors.slice(0, 3);
    out.runs.push(run);
    await page.close(); await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(`captures/gntfixINT5-swap-${tag}-${mode}.json`, JSON.stringify(out, null, 1));
