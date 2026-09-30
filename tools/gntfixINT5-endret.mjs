#!/usr/bin/env node
// fix-INT-r5 (J5-F2 regression): the redesigned end card still leaves by every input.
// Setup (debug): ?fresh=1&level=2&seed=S -> room 1 -> a lethal setup -> the defeat card.
// Evidence (real input on the card): per mode
//   enter : Enter -> camp (screen none, app mode camp)
//   click : a mouse click on the centre of "Return to Camp" -> camp
//   esc   : Esc -> the pause menu opens over the card (the card stays), Esc -> resumed, the card is back, Enter -> camp
// Also records the card's rect + the button's rect (inside the panel) at the window size.
//   node tools/gntfixINT5-endret.mjs [--url http://127.0.0.1:4311] [--modes enter,click,esc] [--size 1280x720] [--tag a]
import { writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4311'); const tag = arg('tag', 'a');
const modes = arg('modes', 'enter,click,esc').split(',');
const [W, H] = arg('size', '1280x720').split('x').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { schema: 'gntfixINT5-endret/1', base, tag, size: `${W}x${H}`, rows: [] };
const st = (page) => page.evaluate(() => { const E = window.__echoes; const u = E.runUi() || {}; return { screen: u.screen || 'none', mode: E.app.mode, appState: E.app.state, top: (E.app.stack ? E.app.stack().slice(-1)[0] : null), phase: E.state().run.phase }; });
const browser = await launchEchoes({ gpu: true });
try {
  for (const mode of modes) {
    const ctx = await browser.createBrowserContext();
    const row = { mode };
    try {
      const { page, errors } = await openEchoes(ctx, `${base}/?fresh=1&level=2&seed=5`, { width: W, height: H });
      await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 120000 });
      await sleep(2000);
      await page.evaluate(() => { const E = window.__echoes; const s = E.state(); const p = s.party[0]; for (let i = 0; i < 8; i++) { try { E.cmd('spawn', 'boar', p.x + Math.cos(i) * 1.5, p.z + Math.sin(i) * 1.5, { elite: true, hpMul: 6, dmgMul: 6 }); } catch { /* */ } } for (const m of s.party) E.cmd('setHp', m.id, 1); });
      await page.waitForFunction(() => (window.__echoes.runUi() || {}).screen === 'end', { timeout: 60000 });
      await sleep(1500);
      row.rects = await page.evaluate(() => { const r = (n) => { const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }; const pg = document.querySelector('.rn-page.rn-end'); const bt = pg && pg.querySelector('.rn-camp'); return { panel: pg && r(pg), button: bt && r(bt), text: (pg.textContent || '').replace(/\s+/g, ' ').slice(0, 80) }; });
      row.onCard = await st(page);
      if (mode === 'enter') {
        await page.keyboard.press('Enter');
      } else if (mode === 'click') {
        const b = row.rects.button; await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2); await sleep(150); await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
      } else if (mode === 'esc') {
        await page.keyboard.press('Escape'); await sleep(600);
        row.paused = await st(page);
        await page.screenshot({ path: `captures/gntfixINT5-endret-${tag}-esc-paused.png` });
        await page.keyboard.press('Escape'); await sleep(700);
        row.resumed = await st(page);
        await page.keyboard.press('Enter');
      }
      await sleep(1500);
      row.after = await st(page);
      await page.screenshot({ path: `captures/gntfixINT5-endret-${tag}-${mode}-after.png` });
      row.pass = row.onCard.screen === 'end' && row.after.screen === 'none' && row.after.mode === 'camp' && (mode !== 'esc' || (row.paused.top === 'pause' && row.paused.screen === 'end' && row.resumed.top !== 'pause' && row.resumed.screen === 'end'));
      row.pageErrors = errors.length;
      await page.close();
    } catch (e) { row.error = String(e).slice(0, 300); row.pass = false; }
    await ctx.close();
    out.rows.push(row); console.log(JSON.stringify(row));
  }
} finally { await browser.close(); }
out.pass = out.rows.filter((r) => r.pass).length;
console.log(`SUMMARY ${out.pass}/${out.rows.length}`);
writeFileSync(`captures/gntfixINT5-endret-${tag}.json`, JSON.stringify(out, null, 1));
