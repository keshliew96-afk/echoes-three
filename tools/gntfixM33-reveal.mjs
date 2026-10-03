// fix-M3-r3 AUD3-F1 probe — Settings > Audio focus walk by keyboard (arrows + W/S),
// a mocked standard gamepad D-pad and the debug API, at several window sizes.
// Every stop inside the Audio tab must show: the focused control and its focus
// ring fully inside the list viewport, the CHANNEL NAME it belongs to, and the
// whole channel group whenever it fits. The walk must visit every row in both
// directions (Up = exact reverse of Down), never land on an unselected tab,
// and a mouse hover must never scroll the list.
//   node tools/gntfixM33-reveal.mjs [WxH ...]   (default 1024x576 1280x720 1366x768 1600x900 1920x1080)
//   GNT_URL=http://127.0.0.1:4303/?fresh=1 (a vite preview of a production build) overrides the dev server.
// Writes captures/gntfixM33/reveal-<W>.json and prints FAIL lines + a TOTAL.
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['1024x576', '1280x720', '1366x768', '1600x900', '1920x1080']).map((s) => s.split('x').map(Number));
const OUT = path.join(process.cwd(), 'captures', 'gntfixM33');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(W, H) {
  const browser = await launchEchoes({ autoplay: true, width: W, height: H, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(process.env.GNT_URL || 'http://127.0.0.1:5199/?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__echoes && window.__echoes.app && window.__echoes.app.state === 'title', { timeout: 180000 });
    await sleep(1200);
    const version = await page.evaluate(() => window.__echoes.version);
    // Mocked pad installed up front (the poll reads navigator.getGamepads every frame).
    await page.evaluate(() => {
      const mk = (btns) => ({ id: 'gntfixM33 pad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: btns.includes(i), touched: btns.includes(i), value: btns.includes(i) ? 1 : 0 })) });
      let cur = mk([]);
      navigator.getGamepads = () => [cur, null, null, null];
      window.__gntPad = async (b) => { cur = mk([b]); await new Promise((r) => setTimeout(r, 110)); cur = mk([]); await new Promise((r) => setTimeout(r, 150)); };
    });
    const sample = () =>
      page.evaluate(() => {
        const f = window.__echoes.app.focus();
        if (!f) return null;
        const node = document.getElementById(f.id);
        const activeTab = [...document.querySelectorAll('[id^="ap-tab-"]')].find((t) => t.getAttribute('aria-selected') === 'true');
        const o = { id: f.id, activeTab: activeTab && activeTab.id, helpTitle: (document.querySelector('.ap-info h3, .ap-info .ap-info-title, .ap-infotitle') || {}).textContent || null };
        if (!node) return o;
        let sc = null;
        for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) { const oy = getComputedStyle(p).overflowY; if (oy === 'auto' || oy === 'scroll') { sc = p; break; } }
        const r2 = (x) => Math.round(x * 10) / 10;
        if (!sc) return { ...o, scroller: null };
        const sr = sc.getBoundingClientRect();
        const vt = sr.top + sc.clientTop, vb = vt + sc.clientHeight;
        const inside = (r, grow = 0) => r.top - grow >= vt - 0.5 && r.bottom + grow <= vb + 0.5;
        const nr = node.getBoundingClientRect();
        const row = node.closest('.ap-row') || node;
        const rr = row.getBoundingClientRect();
        const chan = node.closest('.au-chan');
        const lab = chan ? chan.querySelector('.ap-label') : null;
        const lr = lab ? lab.getBoundingClientRect() : null;
        const cr = chan ? chan.getBoundingClientRect() : null;
        const cs = getComputedStyle(node);
        const ring = (parseFloat(cs.outlineWidth) || 0) + Math.max(0, parseFloat(cs.outlineOffset) || 0);
        return {
          ...o,
          scrollTop: Math.round(sc.scrollTop), viewH: sc.clientHeight, scrollH: sc.scrollHeight,
          node: { top: r2(nr.top - vt), bottom: r2(vb - nr.bottom), ok: inside(nr, ring) },
          ring: { top: r2(rr.top - vt), bottom: r2(vb - rr.bottom), ok: inside(rr, 2) },
          label: lab ? { text: lab.textContent, top: r2(lr.top - vt), ok: inside(lr) } : null,
          group: chan ? { ch: chan.getAttribute('data-channel'), fits: cr.height + 4 <= sc.clientHeight, ok: inside(cr) } : null,
        };
      });
    const legs = {};
    async function walk(name, press, dir, n, startId) {
      if (startId) {
        for (let i = 0; i < 40; i++) {
          const f = await sample();
          if (f && f.id === startId) break;
          await press(dir === 'up' ? 'down' : 'up');
          await sleep(120);
        }
      }
      const seq = [await sample()];
      for (let i = 0; i < n; i++) {
        await press(dir);
        await sleep(220);
        seq.push(await sample());
      }
      legs[name] = seq;
      return seq;
    }
    const key = (map) => async (d) => page.keyboard.press(map[d]);
    const arrows = key({ up: 'ArrowUp', down: 'ArrowDown' });
    const ws = key({ up: 'w', down: 's' });
    const pad = async (d) => page.evaluate((b) => window.__gntPad(b), d === 'up' ? 12 : 13);
    const api = async (d) => page.evaluate((d) => window.__echoes.app.press(d), d);
    // Title -> Settings -> Audio.
    for (let i = 0; i < 8; i++) { const f = await sample(); if (/settings/.test(f.id)) break; await page.keyboard.press('ArrowDown'); await sleep(150); }
    await page.keyboard.press('Enter'); await sleep(700);
    for (let i = 0; i < 5; i++) { const ok = await page.evaluate(() => { const e = document.getElementById('au-master-level'); return !!e && e.getClientRects().length > 0; }); if (ok) break; await page.keyboard.press('e'); await sleep(450); }
    await sleep(400);
    await walk('downArrows', arrows, 'down', 16);
    await walk('upArrows', arrows, 'up', 16, 'au-muteonblur');
    await walk('upWS', ws, 'up', 14, 'au-muteonblur');
    await walk('downWS', ws, 'down', 14, 'ap-tab-audio');
    await walk('upPad', pad, 'up', 14, 'au-muteonblur');
    await walk('downPad', pad, 'down', 14, 'ap-tab-audio');
    const hasApiPress = await page.evaluate(() => typeof window.__echoes.app.press === 'function');
    if (hasApiPress) await walk('upApi', api, 'up', 14, 'au-muteonblur');
    // Pointer: scroll the list to the middle, hover an item cut by the top edge -> no scroll jump.
    const hover = await (async () => {
      const setup = await page.evaluate(() => {
        const n = document.getElementById('au-music-level');
        let sc = null;
        for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) { const oy = getComputedStyle(p).overflowY; if (oy === 'auto' || oy === 'scroll') { sc = p; break; } }
        if (!sc || sc.scrollHeight <= sc.clientHeight + 1) return { scrolls: false };
        const sr = sc.getBoundingClientRect();
        const nr = n.getBoundingClientRect();
        sc.scrollTop += nr.top - sr.top + nr.height * 0.4; // music slider 40 % above the edge
        const r = n.getBoundingClientRect();
        return { scrolls: true, before: Math.round(sc.scrollTop), x: r.left + r.width / 2, y: Math.max(sr.top + 3, r.bottom - 4) };
      });
      if (!setup.scrolls) return { scrolls: false, ok: true };
      await sleep(250);
      await page.mouse.move(setup.x, setup.y, { steps: 4 });
      await sleep(400);
      const after = await page.evaluate(() => { const n = document.getElementById('au-music-level'); let sc = null; for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) { const oy = getComputedStyle(p).overflowY; if (oy === 'auto' || oy === 'scroll') { sc = p; break; } } return { scrollTop: Math.round(sc.scrollTop), focus: window.__echoes.app.focus().id }; });
      return { scrolls: true, before: setup.before, ...after, ok: after.scrollTop === setup.before };
    })();
    await page.screenshot({ path: path.join(OUT, `reveal-${W}-end.png`) });
    return { W, H, version, legs, hover, errors };
  } finally {
    await browser.close();
  }
}

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL', m); };
for (const [W, H] of sizes) {
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { res = await run(W, H); break; } catch (e) { console.error(`[${W}x${H}] attempt ${attempt}: ${String(e.message || e).split('\n')[0]}`); if (attempt === 3) throw e; }
  }
  fs.writeFileSync(path.join(OUT, `reveal-${W}.json`), JSON.stringify(res, null, 1));
  const tag = `${W}x${H}`;
  let stops = 0, clipped = 0, labelOff = 0, groupOff = 0;
  const rowKey = (s) => (s ? s.id.replace(/-(curve|mute|test)$/, '-acts') : null);
  for (const [leg, seq] of Object.entries(res.legs)) {
    for (const s of seq) {
      if (!s) { fail(`${tag} ${leg}: no focus`); continue; }
      if (s.activeTab !== 'ap-tab-audio') fail(`${tag} ${leg}: selected tab ${s.activeTab} at ${s.id}`);
      if (/^ap-tab-/.test(s.id) && s.id !== 'ap-tab-audio') fail(`${tag} ${leg}: focus on unselected tab ${s.id}`);
      if (!/^au-/.test(s.id) || !s.node) continue;
      stops++;
      if (!s.node.ok || !s.ring.ok) { clipped++; fail(`${tag} ${leg}: ${s.id} clipped (node top ${s.node.top} bottom ${s.node.bottom}, ring top ${s.ring.top})`); }
      if (s.label && !s.label.ok) { labelOff++; fail(`${tag} ${leg}: ${s.id} channel name "${s.label.text}" off the list (top ${s.label.top})`); }
      if (s.group && s.group.fits && !s.group.ok) { groupOff++; fail(`${tag} ${leg}: ${s.id} channel group ${s.group.ch} not wholly shown`); }
    }
  }
  // Order: Up = reverse of Down, every row visited, one ring.
  const down = res.legs.downArrows.map(rowKey);
  const up = res.legs.upArrows.map(rowKey);
  const ringDown = down.slice(0, down.indexOf('ap-tab-audio') + 1);
  const expectRows = ['au-master-level', 'au-master-acts', 'au-music-level', 'au-music-acts', 'au-sfx-level', 'au-sfx-acts', 'au-ambient-level', 'au-ambient-acts', 'au-ui-level', 'au-ui-acts', 'au-muteonblur', 'ap-settings-reset', 'ap-settings-back', 'ap-tab-audio'];
  if (JSON.stringify(ringDown) !== JSON.stringify(expectRows)) fail(`${tag} Down ring ${ringDown.join(' > ')}`);
  const upRing = up.slice(0, up.indexOf('ap-tab-audio') + 1);
  const expectUp = ['au-muteonblur', 'au-ui-acts', 'au-ui-level', 'au-ambient-acts', 'au-ambient-level', 'au-sfx-acts', 'au-sfx-level', 'au-music-acts', 'au-music-level', 'au-master-acts', 'au-master-level', 'ap-tab-audio'];
  if (JSON.stringify(upRing) !== JSON.stringify(expectUp)) fail(`${tag} Up ring ${upRing.join(' > ')}`);
  for (const leg of ['upWS', 'upPad', 'upApi']) {
    if (!res.legs[leg]) continue;
    const u = res.legs[leg].map(rowKey);
    const r = u.slice(0, u.indexOf('ap-tab-audio') + 1);
    if (JSON.stringify(r) !== JSON.stringify(expectUp)) fail(`${tag} ${leg} ring ${r.join(' > ')}`);
  }
  if (!res.hover.ok) fail(`${tag} hover scrolled the list ${res.hover.before} -> ${res.hover.scrollTop}`);
  if (res.errors.length) fail(`${tag} page errors ${res.errors.join(' | ')}`);
  console.log(`${tag} v${res.version}: ${stops} audio stops, clipped ${clipped}, channel name off ${labelOff}, group cut ${groupOff}; hover ${JSON.stringify(res.hover)}; UP ${up.join(' > ')}`);
}
console.log('TOTAL FAILS', fails);
process.exit(fails ? 1 : 0);
