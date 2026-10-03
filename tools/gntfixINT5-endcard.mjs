#!/usr/bin/env node
// fix-INT-r5 (J5-F2): copy of tools/gntrjourney5spec-endcard.mjs (the refuter's spec-lens probe; outputs renamed to
// gntfixINT5-endcard-*) + an `extra` block: the party table's rows / column alignment, text spilling out of the
// panel, and overlap with the HUD's corner plates (.hud-loc / .hud-glint) and the command bar (.hud-bar).
// Setup by debug (not evidence of play): ?level=N (starter grant = built party) or level 1 fresh (0 nodes),
// then a lethal setup (defeat) or skipToRoom 8 + kills (victory).
//   node tools/gntrjourney5spec-endcard.mjs --url http://127.0.0.1:4346 --scen def2,def1 --sizes 1600x900 --tag a
import { writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4346'); const tag = arg('tag', 'a');
const scens = arg('scen', 'def2').split(',');
const sizes = arg('sizes', '1024x576,1280x720,1600x900,1920x1080,2560x1440').split(',').map((s) => s.split('x').map(Number));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { schema: 'gntfixINT5-endcard/1', base, tag, rows: [] };
const browser = await launchEchoes({ gpu: true });

async function measure(page) {
  return page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const el = document.querySelector('.rn-page.rn-end');
    if (!el) return { vw, vh, panel: null };
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const rr = (x) => ({ x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height) });
    // text nodes: clipped by the viewport?
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let textNodes = 0, clipped = 0; const clippedSamples = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue; textNodes++;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) {
        if (b.width === 0) continue;
        if (b.left < -0.5 || b.top < -0.5 || b.right > vw + 0.5 || b.bottom > vh + 0.5) { clipped++; if (clippedSamples.length < 5) clippedSamples.push({ t: n.textContent.slice(0, 30), ...rr(b) }); break; }
      }
    }
    // lines inside the build box: find elements whose text contains a class name and are "row-like"
    const names = ['Healer', 'Tank', 'Swordsman', 'Archer'];
    const rows = [];
    for (const nm of names) {
      const leaf = [...el.querySelectorAll('*')].find((x) => x.children.length === 0 && (x.textContent || '').trim() === nm);
      if (!leaf) continue;
      const row = leaf.parentElement; const cells = [...row.children].map((c) => ({ t: (c.textContent || '').trim().slice(0, 16), ...rr(c.getBoundingClientRect()) }));
      rows.push({ name: nm, row: rr(row.getBoundingClientRect()), cells });
    }
    // nodes line: the element containing 'skills' names list (first row of the build box)
    const healerLeaf = [...el.querySelectorAll('*')].find((x) => x.children.length === 0 && (x.textContent || '').trim() === 'Healer');
    const box = healerLeaf ? (function up(n) { let p = n; for (let i = 0; i < 5 && p; i++) { p = p.parentElement; if (p && p !== el && getComputedStyle(p).borderTopStyle !== 'none') return p; } return null; })(healerLeaf) : null;
    const buildBox = box ? rr(box.getBoundingClientRect()) : null;
    let buildHead = null;
    if (box && box.firstElementChild) { const f = box.firstElementChild; const rg = document.createRange(); rg.selectNodeContents(f); const lines = new Set([...rg.getClientRects()].map((b) => Math.round(b.top))); buildHead = { ...rr(f.getBoundingClientRect()), lines: lines.size, chars: (f.textContent || '').length, text: (f.textContent || '').slice(0, 90) }; }
    const btn = [...el.querySelectorAll('button')].map((b) => ({ t: b.textContent.trim(), ...rr(b.getBoundingClientRect()) }));
    // location plate / HUD elements overlapped by the panel
    const plates = [...document.querySelectorAll('body *')].filter((x) => x.children.length === 0 && /HEARTH CAMP|SUNKEN MILL|HOLLOW WOOD|ASHEN BARROW|GLINT/.test(x.textContent || '') && !el.contains(x) && x.getBoundingClientRect().width > 0).map((x) => ({ t: x.textContent.trim().slice(0, 24), ...rr(x.getBoundingClientRect()) }));
    const ov = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    const P = rr(r);
    return {
      vw, vh, panel: { ...P, cls: el.className, maxWidth: cs.maxWidth, width: cs.width, overflowY: cs.overflowY, scrollH: el.scrollHeight, clientH: el.clientHeight, leftGap: P.x, rightGap: vw - (P.x + P.w), topGap: P.y, bottomGap: vh - (P.y + P.h), pctW: Math.round((P.w / vw) * 1000) / 10 },
      docScroll: { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth },
      textNodes, clipped, clippedSamples, rows, buildBox, buildHead, btn,
      platesOverlapped: plates.filter((p) => ov(P, p)).map((p) => p.t),
      extra: (() => {
        const R = (n) => { const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
        const prows = [...el.querySelectorAll('.rn-prow')].map((row) => ({ seat: row.dataset.seat, row: R(row), cells: [...row.children].map((c) => ({ cls: c.className, ...R(c) })), lines: (() => { const s = row.querySelector('.rn-pskills'); if (!s) return 0; return new Set([...s.children].map((c) => Math.round(c.getBoundingClientRect().top))).size; })(), text: (row.textContent || '').replace(/s+/g, ' ').trim().slice(0, 120) }));
        const colSpread = [0, 1, 2, 3].map((i) => { const xs = prows.map((r) => r.cells[i] && r.cells[i].x).filter((v) => v != null); return xs.length ? Math.max(...xs) - Math.min(...xs) : null; });
        const P = el.getBoundingClientRect();
        let spill = 0; const spillS = [];
        const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) { if (b.width === 0) continue; if (b.left < P.left - 0.5 || b.right > P.right + 0.5 || b.top < P.top - 0.5 || b.bottom > P.bottom + 0.5) { spill++; if (spillS.length < 4) spillS.push(n.textContent.slice(0, 24)); break; } } }
        const hud = {}; for (const sel of ['.hud-loc', '.hud-glint', '.hud-bar']) { const n = document.querySelector(sel); if (n) { const b = n.getBoundingClientRect(); if (b.width > 1) hud[sel] = { ...R(n), overlap: !(P.right <= b.left || b.right <= P.left || P.bottom <= b.top || b.bottom <= P.top) }; } }
        const fit = (window.__echoes.runUi() || {}).fit || null;
        return { prows, colSpread, spill, spillS, hud, rnTop: getComputedStyle(document.getElementById('run-screen')).paddingTop, rnS: getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-s'), fit };
      })(),
      mode: window.__echoes.app && window.__echoes.app.mode, head: ((window.__echoes.runUi() || {}).text || '').slice(0, 70),

    };
  });
}

try {
  for (const scen of scens) {
    for (const [w, h] of sizes) {
      let row = null;
      for (let attempt = 1; attempt <= 3 && !row; attempt++) {
        const ctx = await browser.createBrowserContext();
        try {
          const lvl = scen === 'def1' ? 1 : scen === 'def3' || scen === 'vic3' ? 3 : 2;
          const url = `${base}/?fresh=1&level=${lvl}&seed=5`;
          const { page, errors } = await openEchoes(ctx, url, { width: w, height: h });
          await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 120000 });
          await sleep(2500);
          if (scen.startsWith('def')) {
            await page.evaluate(() => { const E = window.__echoes; const s = E.state(); const p = s.party[0]; for (let i = 0; i < 8; i++) { try { E.cmd('spawn', 'boar', p.x + Math.cos(i) * 1.5, p.z + Math.sin(i) * 1.5, { elite: true, hpMul: 6, dmgMul: 6 }); } catch { /* */ } } for (const m of s.party) E.cmd('setHp', m.id, 1); });
          } else {
            await page.evaluate(async () => { const E = window.__echoes; try { E.cmd('skipToRoom', 8); } catch { /* */ } });
            await sleep(3000);
            await page.evaluate(async () => { const E = window.__echoes; for (let i = 0; i < 200; i++) { try { const s = E.state(); if ((E.runUi() || {}).screen === 'end') break; if (s.run.phase === 'combat') { try { E.cmd('bossHp', 0.001); } catch { /* */ } E.cmd('killAllEnemies'); } } catch { /* */ } await new Promise((r) => setTimeout(r, 250)); } });
          }
          await page.waitForFunction(() => (window.__echoes.runUi() || {}).screen === 'end', { timeout: 90000 });
          await sleep(2000);
          const info = await measure(page);
          const nodes = await page.evaluate(() => { try { const t = (window.__echoes.runUi() || {}).text || ''; const m = t.match(/NODES HELD\s*(\d+)/i); return m ? Number(m[1]) : null; } catch { return null; } });
          await page.screenshot({ path: `captures/gntfixINT5-endcard-${tag}-${scen}-${w}x${h}.png` });
          row = { scen, size: `${w}x${h}`, nodesHeld: nodes, ...info, pageErrors: errors.length, attempt };
          delete row.nodesHeldLen;
          await page.close();
        } catch (e) { console.log(`retry ${scen} ${w}x${h} #${attempt}: ${e.message}`); }
        await ctx.close();
      }
      if (row) { out.rows.push(row); console.log(JSON.stringify({ scen: row.scen, size: row.size, nodes: row.nodesHeld, panel: { x: row.panel.x, y: row.panel.y, w: row.panel.w, h: row.panel.h, pctW: row.panel.pctW, bottomGap: row.panel.bottomGap }, clipped: row.clipped, plates: row.platesOverlapped, spill: row.extra.spill, colSpread: row.extra.colSpread, skillLines: row.extra.prows.map((r) => r.lines), hudOverlap: Object.fromEntries(Object.entries(row.extra.hud).map(([k, v]) => [k, v.overlap])), rnTop: row.extra.rnTop, rnS: row.extra.rnS, pageErrors: row.pageErrors })); }
    }
  }
} finally { await browser.close(); }
writeFileSync(`captures/gntfixINT5-endcard-${tag}.json`, JSON.stringify(out, null, 1));
