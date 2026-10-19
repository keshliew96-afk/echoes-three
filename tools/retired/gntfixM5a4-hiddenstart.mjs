// gntfixM5a4-hiddenstart.mjs — fix-M5a r4 (NET4-F1): the HOST tab hidden around the session start,
// by the REAL UI path (title -> Multiplayer -> Host a Game -> Start, all mouse clicks) — the critic's
// tools/gntcnet4-hiddenstart.mjs scenario, but every click waits for its button to be ENABLED
// (on a loaded machine the critic's click on "Host a Game" can land while the menu is still
// "Checking the server…", when the button is disabled and the click does nothing).
// Host = its own browser with a second blank tab (a real `hidden` when that tab is brought to the
// front); guest = another browser. Cases:
//   A  host hides --hideAt ms after pressing Start (inside the 1.5 s countdown), stays hidden --observe s
//   B  host hides 3 s after the guest synced (the mid-game control)
//   G  the GUEST's tab is hidden before the start: it must join as away (the AI plays its seat) and
//      take its seat back when shown
// Per 1 s: host visibility / app / net / tick / metronome, guest synced / applied tick / banner text;
// guest applied ticks per 2 s window while the host is hidden (G5b.11: 60 ± 2 ticks/s).
// node tools/gntfixM5a4-hiddenstart.mjs --port 7896 [--cases A,B,G] [--hideAt 800] [--observe 40]
// env GNTCNET4_BASE = the page (a production preview).
import puppeteer from 'puppeteer';
import { openClient, closeClient, writeJson, shot, sleep, waitFor, PREVIEW, WS } from './gntcnet4-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7896);
const cases = String(A.cases || 'A,B,G').split(',');
const HIDE_AT = Number(A.hideAt || 800);
const OBS = Number(A.observe || 40);
const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];
const out = { tool: 'gntfixM5a4-hiddenstart', base: PREVIEW, port, hideAt: HIDE_AT, observe: OBS, cases: {} };

// Click the smallest visible element whose text matches, once its button is enabled.
async function clickEnabled(page, re, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const box = await page.evaluate((src, flags) => {
      const rx = new RegExp(src, flags);
      const els = [...document.querySelectorAll('button, [role="button"], li, a, div, span')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && rx.test((e.innerText || '').trim()); });
      els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
      const e = els[0];
      if (!e) return null;
      const btn = e.closest('button');
      if (btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true')) return { disabled: true };
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (e.innerText || '').trim().slice(0, 40), waitedMs: 0 };
    }, re.source, re.flags);
    if (box && !box.disabled) { await page.mouse.click(box.x, box.y); return { ...box, waitedMs: Date.now() - t0 }; }
    await sleep(100);
  }
  return null;
}
const hostDiag = (p) => p.evaluate(() => { const E = window.__echoes; const st = E.net.stats(); return { vis: document.visibilityState, tick: E.tick, net: E.net.state, app: E.app.state, metronome: st.metronome, hostHiddenFedMs: st.hostHiddenFedMs }; });
const guestDiag = (p) => p.evaluate(() => {
  const E = window.__echoes;
  let d = null;
  try { const g = E.net.session.debugGuest(); d = { synced: g.synced, snapshots: g.snapshots, applied: g.replica.appliedTick, frozen: g.frozen, away: g.away }; } catch (e) { d = 'ERR ' + e.message; }
  const b = document.querySelector('#nt-hud .nt-banner');
  return { vis: document.visibilityState, net: E.net.state, d, banner: b && !b.classList.contains('nt-off') ? b.innerText.replace(/\s+/g, ' ').trim() : null };
});
async function toTitle(p) {
  await waitFor(p, () => /press any key/i.test(document.body.innerText || '') || (window.__echoes && window.__echoes.app && window.__echoes.app.state === 'title'), { timeout: 120000 });
  await sleep(500);
  if (await p.evaluate(() => window.__echoes.app.state !== 'title')) await p.keyboard.press('Enter');
  await waitFor(p, () => window.__echoes.app.state === 'title', { timeout: 20000 });
}

for (const cs of cases) {
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, defaultViewport: { width: 1280, height: 720 }, args: ['--no-first-run', '--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl', ...BG] });
  const H = await browser.newPage();
  const herr = [];
  H.on('pageerror', (e) => herr.push(String(e.message || e)));
  let G = null;
  let gBlank = null;
  const R = (out.cases[cs] = { trail: [] });
  try {
    await H.goto(PREVIEW + `?net=${encodeURIComponent(WS(port))}&netname=HidHost${cs}`, { waitUntil: 'domcontentloaded' });
    G = await openClient(PREVIEW + `?net=${encodeURIComponent(WS(port))}&netname=HidGuest${cs}`, { w: 1280, h: 720, tag: 'G' + cs });
    await toTitle(H);
    await toTitle(G.page);
    // host: Multiplayer -> Host a Game (real clicks, each once its button is enabled)
    R.uiMp = await clickEnabled(H, /^multiplayer$/i);
    R.uiHost = await clickEnabled(H, /^host a game$/i);
    const w = await waitFor(H, () => window.__echoes.net.code || false, { timeout: 10000 });
    const code = w.v;
    R.code = code;
    await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
    if (cs === 'G') { gBlank = await G.browser.newPage(); await gBlank.goto('about:blank'); await gBlank.bringToFront(); await sleep(400); R.guestVisBefore = await G.page.evaluate(() => document.visibilityState); }
    await sleep(800);
    const blank = await browser.newPage();
    await blank.goto('about:blank');
    await H.bringToFront();
    await sleep(500);
    R.before = await hostDiag(H);
    await waitFor(H, () => !/waiting for/i.test(document.body.innerText || ''), { timeout: 10000 });
    const t0 = Date.now();
    R.start = await clickEnabled(H, /^start$/i);
    if (cs === 'A') { await sleep(HIDE_AT); await blank.bringToFront(); R.hiddenAtMs = Date.now() - t0; R.hostVisAtHide = await H.evaluate(() => document.visibilityState); }
    else if (cs === 'B') { await waitFor(G.page, () => window.__echoes.net.session.debugGuest().synced, { timeout: 15000 }); await sleep(3000); await blank.bringToFront(); R.hiddenAtMs = Date.now() - t0; }
    for (let k = 0; k < (cs === 'G' ? 10 : OBS); k++) {
      await sleep(1000);
      R.trail.push({ s: Math.round((Date.now() - t0) / 100) / 10, host: await hostDiag(H), guest: await guestDiag(G.page), hostSeats: cs === 'G' ? await H.evaluate(() => { const s = window.__echoes.net.stats(); return { away: s.awaySeats, human: s.humanSeats }; }) : undefined });
    }
    await shot(G, `gntfixM5a4-hiddenstart-${cs}-guest.png`);
    if (cs === 'G') {
      await G.page.bringToFront();
      const tb = Date.now();
      const back = await waitFor(H, () => { const s = window.__echoes.net.stats(); return (s.humanSeats || []).length > 0; }, { timeout: 10000 });
      R.guestReturn = { humanMs: back.ok ? Date.now() - tb : null, synced: await waitFor(G.page, () => window.__echoes.net.session.debugGuest().synced, { timeout: 10000 }) };
    } else {
      await H.bringToFront();
      const tb = Date.now();
      const rec = await waitFor(G.page, () => window.__echoes.net.session.debugGuest().synced, { timeout: 15000 });
      R.afterReturn = { guestSyncedMs: rec.ok ? Date.now() - tb : null, host: await hostDiag(H), guest: await guestDiag(G.page) };
    }
    const t = R.trail;
    // guest applied ticks per 2 s window (while the host is hidden)
    const hid = t.filter((x) => x.host.vis === 'hidden' && x.guest.d && typeof x.guest.d === 'object');
    const win2 = [];
    for (let i = 2; i < hid.length; i += 2) win2.push(Math.round(((hid[i].guest.d.applied - hid[i - 2].guest.d.applied) / (hid[i].s - hid[i - 2].s)) * 10) / 10);
    R.summary = {
      hostTicksWhileHidden: hid.length > 1 ? hid[hid.length - 1].host.tick - hid[0].host.tick : null,
      metronome: t.length ? t[t.length - 1].host.metronome : null,
      firstSyncedAtS: (t.find((x) => x.guest.d && x.guest.d.synced) || {}).s ?? null,
      guestTicksPerSec2sWindows: win2,
      windowsOutside60pm2: win2.slice(1).filter((v) => Math.abs(v - 60) > 2).length,
      joiningBannerSeconds: t.filter((x) => x.guest.banner && /joining/i.test(x.guest.banner)).length,
      lastBanner: t.length ? t[t.length - 1].guest.banner : null,
    };
    console.log(cs, JSON.stringify(R.summary), cs === 'G' ? JSON.stringify(R.guestReturn) : JSON.stringify({ afterReturnMs: R.afterReturn && R.afterReturn.guestSyncedMs }), 'uiWaitMs host', R.uiHost && R.uiHost.waitedMs);
  } catch (e) { R.crash = String(e.stack || e); console.error(cs, e); }
  finally {
    R.pageErrors = { host: herr, guest: G ? G.errors : null };
    if (G) await closeClient(G);
    await browser.close();
  }
}
writeJson('gntfixM5a4-hiddenstart.json', out);
