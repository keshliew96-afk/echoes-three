// gntfixPARTY5-mptabs — party critic r5 F5 (+ F3 in a session): on the multiplayer party page, do the
// owner labels ("you" / a player's name / "AI") overlap the character names in the tabs (glyph rects of every
// text node inside each .rn-ptab), and does the page hold still while the viewer switches tabs (F1-F4, real keys)?
// Own session server (PARTY block 7950-7959), host + guest (Swordsman, seat 2), both on the given base.
//   node tools/gntfixPARTY5-mptabs.mjs [--port 7951] [--base http://127.0.0.1:5199/] [--sizes 1280x720,1024x640,1600x900] [--tag dev]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const port = Number(arg('port', 7951));
const base = arg('base', 'http://127.0.0.1:5199/');
const TAG = arg('tag', 'dev');
const SIZES = arg('sizes', '1280x720,1024x640,1600x900').split(',').map((s) => s.split('x').map(Number));
const out = { port, base, rows: [], checks: [] };
const check = (what, ok, got = null) => { out.checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`); };
async function waitOn(c, src, { timeout = 30000, poll = 80 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { const r = await netEval(c, src).catch(() => null); if (r) return r; await sleep(poll); }
  throw new Error(`${c.name}: timeout ${src.slice(0, 120)}`);
}
const RUNV = 'const v = E.state().run;';
// glyph-rect audit of the tab strip: every pair of text nodes in different elements inside the strip
const AUDIT = () => {
  const strip = document.querySelector('.rn-draft .rn-pstrip');
  if (!strip) return { missing: true };
  const texts = [];
  const walk = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const cs = getComputedStyle(n.parentElement);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) texts.push({ el: n.parentElement, t: n.textContent.trim(), r });
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(strip);
  const ov = [];
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.el === b.el) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 0.5 && h > 0.5) ov.push(`${a.t} x ${b.t} ${Math.round(w)}x${Math.round(h)}`);
  }
  const tabs = [...strip.querySelectorAll('.rn-ptab')].map((t) => { const r = t.getBoundingClientRect(); const o = t.querySelector('.rn-powner'); return { seat: t.dataset.seat, y: Math.round(r.y), x: Math.round(r.x), owner: o && getComputedStyle(o).display !== 'none' ? o.textContent : null }; });
  const page = document.querySelector('.rn-draft').getBoundingClientRect();
  return { ov, tabs, pageY: Math.round(page.y), pageH: Math.round(page.height) };
};
let srv = null; let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1280, height: 720, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Fox', seed: 8 });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, 2);
  check('guest joined seat 2', seat === 2, seat);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await sleep(1000);
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000, poll: 250 });
  await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(host, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await waitOn(guest, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await sleep(1500);
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await waitOn(host, `${RUNV} return v.phase === 'reward' && !!v.party && E.runUi().screen === 'draft';`, { timeout: 20000 });
  await waitOn(guest, `${RUNV} return v.phase === 'reward' && !!v.party && E.runUi().screen === 'draft';`, { timeout: 20000 });
  await sleep(1300);
  for (const [W, H] of SIZES) {
    for (const [who, c] of [['host', host], ['guest', guest]]) {
      await c.page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      await c.page.bringToFront();
      await sleep(500);
      const per = [];
      for (const k of ['F1', 'F2', 'F3', 'F4']) {
        await c.page.keyboard.press(k); await sleep(350);
        per.push(await c.page.evaluate(AUDIT));
      }
      await c.page.screenshot({ path: `captures/gntfixPARTY5-mptabs-${TAG}-${W}x${H}-${who}.png` });
      const ov = [...new Set(per.flatMap((p) => p.ov || []))];
      const ys = per.map((p) => (p.tabs && p.tabs[3] ? p.tabs[3].y : null));
      const owners = per[0].tabs ? per[0].tabs.map((t) => t.owner) : null;
      out.rows.push({ size: `${W}x${H}`, who, ov, tabY: ys, pageH: per.map((p) => p.pageH), owners });
      check(`${W}x${H} ${who}: 0 text overlaps inside the tab strip (owners ${JSON.stringify(owners)})`, ov.length === 0 && owners && owners.filter(Boolean).length === 4, { ov, owners });
      // the Archer tab (never the viewed one in this loop until F4) — its y must not move by more than the lift
      check(`${W}x${H} ${who}: the page holds still across F1-F4 (Archer tab y ${JSON.stringify(ys)}, page h ${JSON.stringify(per.map((p) => p.pageH))})`, Math.max(...ys) - Math.min(...ys) <= 4, ys);
    }
  }
} catch (e) {
  check('probe ran to completion', false, String(e.stack || e).slice(0, 800));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
  writeFileSync(`captures/gntfixPARTY5-mptabs-${TAG}.json`, JSON.stringify(out, null, 1));
  console.log(`checks ${out.checks.filter((c) => c.ok).length}/${out.checks.length}`);
}
