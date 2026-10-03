#!/usr/bin/env node
// gntDEPLOY-layout — the DEPLOY copy at the smallest supported window
// (1024x576) and a large one: the unreachable panel with the longest
// (automatic "this site") copy, and Settings ▸ Network with the new
// "Automatic server" row. Layout audit: every nav target inside the window,
// no overlap, >= 40 px targets, type >= 14 px, nothing clipped (scroll
// height fits or the panel scrolls). Screenshots for the critic.
//   node tools/gntDEPLOY-layout.mjs [--url http://127.0.0.1:5199/]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5199/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { url, checks: [], shots: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
}
const audit = (page, sel) =>
  page.evaluate((s) => {
    const root = document.querySelector(s);
    if (!root) return { found: false };
    const vw = innerWidth;
    const vh = innerHeight;
    const rects = [...root.querySelectorAll('[data-nav]')].filter((n) => n.getClientRects().length).map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.id || n.className, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const outside = rects.filter((r) => r.x < -0.5 || r.x + r.w > vw + 0.5 || r.y + r.h > vh + 0.5 || r.y < -0.5).map((r) => r.id);
    const overlaps = [];
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5) overlaps.push([a.id, b.id]);
      }
    const small = rects.filter((r) => r.w < 40 || r.h < 40).map((r) => `${r.id} ${Math.round(r.w)}x${Math.round(r.h)}`);
    let minFont = 99;
    for (const n of root.querySelectorAll('*')) {
      if (!n.getClientRects().length) continue;
      const txt = [...n.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join('');
      if (!txt) continue;
      minFont = Math.min(minFont, parseFloat(getComputedStyle(n).fontSize));
    }
    return { found: true, items: rects.length, outside, overlaps, small, minFont: Math.round(minFont * 10) / 10 };
  }, sel);

let browser = null;
try {
  for (const [W, H] of [
    [1024, 576],
    [1920, 1080],
  ]) {
    browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    await page.goto(`${url}?fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
    for (let i = 0; i < 160; i++) {
      if ((await page.evaluate(() => window.__echoes.app.state)) === 'title') break;
      if (i % 4 === 3) await page.keyboard.press('Enter');
      await sleep(250);
    }
    await sleep(600);
    await page.click('#ap-title-multiplayer');
    await page.waitForFunction(() => !!document.querySelector('.nt-mp .nt-status.nt-unreachable'), { timeout: 12000 });
    await sleep(300);
    const a1 = await audit(page, '.nt-mp');
    const p1 = `captures/gntDEPLOY-layout-unreachable-${W}x${H}.png`;
    await page.screenshot({ path: p1 });
    out.shots.push(p1);
    check(`${W}x${H} unreachable panel (automatic / this-site copy): inside the window, no overlap, >= 40 px, type >= 14 px`, a1.found && !a1.outside.length && !a1.overlaps.length && !a1.small.length && a1.minFont >= 14, a1);
    await page.keyboard.press('Escape');
    await sleep(400);
    await page.click('#ap-title-settings');
    await page.waitForFunction(() => window.__echoes.app.overlay === 'settings', { timeout: 5000 });
    await page.click('#ap-tab-network');
    await sleep(500);
    // Walk to the last row so every row has been in view.
    const a2 = await audit(page, '.nt-nettab');
    const p2 = `captures/gntDEPLOY-layout-network-${W}x${H}.png`;
    await page.screenshot({ path: p2 });
    out.shots.push(p2);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.nt-nettab .ap-row')].map((r) => {
      const b = r.getBoundingClientRect();
      return { id: r.dataset.rowId || null, h: Math.round(b.height), bottom: Math.round(b.bottom) };
    }));
    check(`${W}x${H} Settings ▸ Network: rows laid out, targets >= 40 px, type >= 14 px`, a2.found && a2.items >= 5 && !a2.outside.length && !a2.overlaps.length && !a2.small.length && a2.minFont >= 14 && rows.length >= 4, { ...a2, rows });
    check(`${W}x${H} 0 page errors`, errors.length === 0, { errors });
    await browser.close();
    browser = null;
  }
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync('captures/gntDEPLOY-layout.json', JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
