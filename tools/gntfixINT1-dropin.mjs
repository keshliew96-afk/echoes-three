#!/usr/bin/env node
// Refuter (journey r1, J4-dropin-stuck-in-lobby): drop-in into a RUNNING session, alone, with variants.
//   node tools/gntfixINT1-dropin.mjs [--url http://127.0.0.1:5199] [--port 7883] [--tag a] [--mode rejoin|fresh|both]
// Records main-frame navigations (HMR full reloads) and __echoes.version on every page so an artifact
// would show up. Scenario R (critic flow): host+guest start, guest leaves, rejoins by typed code.
// Scenario F: a brand-new third client joins the running room by typed code (true drop-in, never in the lobby before).
import { writeFileSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const netPort = Number(arg('port', 7883));
const tag = arg('tag', 'a');
const mode = arg('mode', 'both');
const P = `gntfixINT1-${tag}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(root, 'captures'), { recursive: true });
const checks = []; const log = [];
function note(name, detail) { const l = `${name} ${JSON.stringify(detail)}`; log.push(l); console.log(l); }
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`); }
const shot = async (page, name) => { await page.screenshot({ path: join(root, 'captures', `${P}-${name}.png`) }); console.log(`[SHOT] ${P}-${name}.png`); };
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
const appState = (page) => page.evaluate(() => { const E = window.__echoes; let seatX = null; try { const s = E.net.seat; const p = E.state().party[s]; seatX = p ? { x: +p.x.toFixed(3), z: +p.z.toFixed(3) } : null; } catch { /* */ } return { v: E.version, state: E.app.state, stack: E.app.stack(), focus: (E.app.focus() || {}).id ?? null, net: E.net.state, seat: E.net.seat, code: E.net.code, tick: E.tick, seatPos: seatX }; });
async function press(page, key, times = 1, gap = 110) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function waitFor(page, body, { timeout = 20000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
async function toTitle(page) { await waitFor(page, `(window.__echoes.app.focus()||{}).label==='Press any key or click'`, { timeout: 40000 }); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 15000 }); }
const lobbyText = (page) => page.evaluate(() => (((document.querySelector('[data-screen="lobby"]') || {}).innerText) || '').replace(/\s+/g, ' ').trim().slice(0, 400));
const peers = (page) => page.evaluate(() => (window.__echoes.net.peers() || []).map((p) => ({ name: p.name, seat: p.seat, ready: p.ready, ai: p.ai, connected: p.connected })));

async function joinByCode(page, code) {
  await navTo(page, 'ap-title-multiplayer'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('mp-menu')`, { timeout: 10000 });
  await waitFor(page, `window.__echoes.net.serverState==='online'`, { timeout: 10000 });
  await navTo(page, 'nt-mp-join'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('mp-join')`, { timeout: 8000 }); await sleep(300);
  const ci = await page.evaluate(() => { const i = document.querySelector('[data-screen="mp-join"] input, .ap-open input'); return i ? { id: i.id, focused: document.activeElement === i, value: i.value } : null; });
  if (ci && !ci.focused) { const ok = ci.id ? await navTo(page, ci.id, 8) : false; if (!ok) await page.focus(`#${ci.id}`); }
  if (ci && ci.value) { await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); }
  await page.keyboard.type(code, { delay: 60 }); await sleep(200);
  await press(page, 'Enter');
  return waitFor(page, `window.__echoes.net.code===${JSON.stringify(code)} && (window.__echoes.app.stack().includes('lobby') || (window.__echoes.app.state==='playing' && window.__echoes.app.stack().length===0))`, { timeout: 20000 });
}

// Probe a client that just dropped in: does it reach play by itself, by Ready key, by Ready click, by a long wait?
async function probeDropIn(label, g, host) {
  const land = await appState(g);
  const lt = await lobbyText(g);
  note(`${label} landed`, { land, lobbyText: lt, hostPeers: await peers(host), guestPeers: await peers(g) });
  await shot(g, `${label}-landed`);
  // (1) no input for 6 s: does the overlay close by itself once the replica is live?
  const selfT = await waitFor(g, `window.__echoes.app.state==='playing' && window.__echoes.app.stack().length===0 && window.__echoes.net.state==='guest'`, { timeout: 6000 });
  note(`${label} v1 no-input 6s`, { selfT, st: await appState(g) });
  if (selfT >= 0) return { land, lt, reached: 'self', selfT };
  // (2) WASD behind the overlay: does the dropped-in seat move on host (i.e. is the guest actually in control)?
  const hostSeatBefore = await host.evaluate((s) => { const p = window.__echoes.state().party[s]; return p ? { x: p.x, z: p.z } : null; }, land.seat);
  await g.keyboard.down('d'); await sleep(700); await g.keyboard.up('d'); await sleep(400);
  const hostSeatAfter = await host.evaluate((s) => { const p = window.__echoes.state().party[s]; return p ? { x: p.x, z: p.z } : null; }, land.seat);
  note(`${label} v2 WASD behind overlay`, { seat: land.seat, hostSeatBefore, hostSeatAfter, guestStack: (await appState(g)).stack });
  // (3) Ready by key (Enter on nt-lobby-ready)
  const nav = await navTo(g, 'nt-lobby-ready');
  if (nav) await press(g, 'Enter');
  await sleep(300);
  const hostSawReady = await waitFor(host, `(window.__echoes.net.peers()||[]).some(p=>p.seat===${land.seat}&&p.ready===true)`, { timeout: 3000, every: 50 });
  const keyT = await waitFor(g, `window.__echoes.app.state==='playing' && window.__echoes.app.stack().length===0 && window.__echoes.net.state==='guest'`, { timeout: 8000 });
  const msgK = await lobbyText(g);
  note(`${label} v3 Ready by key`, { nav, hostSawReady, keyT, lobbyText: msgK, st: await appState(g), hostPeers: await peers(host) });
  await shot(g, `${label}-after-ready-key`);
  if (keyT >= 0) return { land, lt, reached: 'readyKey', keyT };
  // (4) Ready by mouse click on the real button
  const box = await g.evaluate(() => { const b = document.getElementById('nt-lobby-ready'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, dis: !!b.disabled, text: b.textContent.trim() }; });
  if (box && box.w > 0) { await g.mouse.move(box.x, box.y); await sleep(80); await g.mouse.click(box.x, box.y); }
  const clickT = await waitFor(g, `window.__echoes.app.state==='playing' && window.__echoes.app.stack().length===0 && window.__echoes.net.state==='guest'`, { timeout: 8000 });
  note(`${label} v4 Ready by click`, { box, clickT, lobbyText: await lobbyText(g), st: await appState(g), hostPeers: await peers(host) });
  await shot(g, `${label}-after-ready-click`);
  if (clickT >= 0) return { land, lt, reached: 'readyClick', clickT };
  // (5) long wait (host keeps playing; also force a host room transition to see whether a scene change closes it)
  const longT = await waitFor(g, `window.__echoes.app.state==='playing' && window.__echoes.app.stack().length===0 && window.__echoes.net.state==='guest'`, { timeout: 20000 });
  note(`${label} v5 long wait 20s`, { longT, st: await appState(g) });
  if (longT >= 0) return { land, lt, reached: 'longWait', longT };
  // (6) Escape: what does it offer?
  await press(g, 'Escape'); await sleep(600);
  const esc = await g.evaluate(() => ({ stack: window.__echoes.app.stack(), confirm: ((document.querySelector('[data-screen="confirm"]') || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) }));
  note(`${label} v6 Escape`, esc);
  await shot(g, `${label}-escape`);
  if (esc.stack.includes('confirm')) { await press(g, 'Escape'); await sleep(400); }
  return { land, lt, reached: null, finalState: await appState(g) };
}

const browser = await launchEchoes({ gpu: true, background: true });
let server = null;
const result = { schema: 'gntfixINT1-dropin/1', at: new Date().toISOString(), base, tag, netPort, mode };
const pages = {};
try {
  server = spawn(process.execPath, [join(root, 'server', 'index.mjs'), '--port', String(netPort)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  result.serverPid = server.pid;
  const serverLog = []; server.stdout.on('data', (d) => serverLog.push(String(d))); server.stderr.on('data', (d) => serverLog.push(String(d)));
  await sleep(1200);
  const wsUrl = `ws://127.0.0.1:${netPort}/echoes`;
  const mk = async (name, extra = '') => {
    const ctx = await browser.createBrowserContext();
    const o = await openEchoes(ctx, `${base}/?fresh=1&net=${encodeURIComponent(wsUrl)}${extra}`);
    o.navs = 0; o.page.on('framenavigated', (f) => { if (f === o.page.mainFrame()) { o.navs += 1; note(`[NAV] ${name}`, { url: f.url(), n: o.navs }); } });
    pages[name] = o; return o;
  };
  const hostO = await mk('host'); const host = hostO.page;
  const guestO = await mk('guest', '&netname=Guest'); const guest = guestO.page;
  await toTitle(host); await toTitle(guest);
  result.versions0 = { host: await host.evaluate(() => window.__echoes.version), guest: await guest.evaluate(() => window.__echoes.version) };
  // Host a game.
  await navTo(host, 'ap-title-multiplayer'); await press(host, 'Enter'); await waitFor(host, `window.__echoes.app.stack().includes('mp-menu')`, { timeout: 10000 });
  await waitFor(host, `window.__echoes.net.serverState==='online'`, { timeout: 10000 });
  await navTo(host, 'nt-mp-host'); await press(host, 'Enter');
  await waitFor(host, `window.__echoes.app.stack().includes('lobby')`, { timeout: 20000 });
  const code = await host.evaluate(() => window.__echoes.net.code ?? null);
  note('host lobby', { code });
  result.netApiKeys = await host.evaluate(() => Object.keys(window.__echoes.net));
  if (mode === 'fresh') {
    // Host starts ALONE (AI fills seats), then a brand-new guest drops in.
    const st = await navTo(host, 'nt-lobby-start');
    const dis = await host.evaluate(() => { const b = document.getElementById('nt-lobby-start'); return b ? { dis: !!b.disabled, text: b.textContent.trim() } : null; });
    await press(host, 'Enter');
    const hp = await waitFor(host, `window.__echoes.app.state==='playing' && window.__echoes.net.state==='host' && window.__echoes.app.stack().length===0`, { timeout: 25000 });
    note('F host started alone', { st, dis, hp, host: await appState(host) });
    await sleep(3000);
    const j = await joinByCode(guest, code);
    note('F guest joined running room', { j });
    await sleep(800); await shot(host, 'F-host-after-dropin');
    await press(host, 'Escape'); await waitFor(host, `window.__echoes.app.stack().includes('pause')`, { timeout: 8000 }); await sleep(500);
    note('F host pause items', await host.evaluate(() => { const el = document.querySelector('.pz-pause.ap-open') || document; return [...el.querySelectorAll('[data-nav]')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => ({ id: b.id, dis: !!b.disabled, text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) })); }));
    await shot(host, 'F-host-pause'); await press(host, 'Escape'); await sleep(600);
    note('F host after closing pause', await appState(host));
    const r = await probeDropIn('F', guest, host);
    check('F brand-new guest dropping into the running session reaches play (overlay closes, controls seat)', r.reached !== null, r);
  } else {
    // Critic flow: guest joins lobby, ready, start, leave, rejoin.
    const j1 = await joinByCode(guest, code);
    await navTo(guest, 'nt-lobby-ready'); await press(guest, 'Enter');
    const rdy = await waitFor(host, `(window.__echoes.net.peers()||[]).some(p=>p.name==='Guest'&&p.ready===true)`, { timeout: 6000, every: 50 });
    await navTo(host, 'nt-lobby-start'); await press(host, 'Enter');
    const hp = await waitFor(host, `window.__echoes.app.state==='playing' && window.__echoes.net.state==='host'`, { timeout: 25000 });
    const gp = await waitFor(guest, `window.__echoes.app.state==='playing' && window.__echoes.net.state==='guest' && window.__echoes.app.stack().length===0`, { timeout: 25000 });
    note('R initial session', { j1, rdy, hp, gp });
    check('R0 initial lobby→start puts the guest in play (sanity)', gp >= 0, { gp });
    await sleep(2500);
    await press(guest, 'Escape'); await waitFor(guest, `window.__echoes.app.stack().includes('pause')`, { timeout: 8000 }); await sleep(500);
    await navTo(guest, 'pz-leave'); await press(guest, 'Enter'); await waitFor(guest, `window.__echoes.app.stack().includes('confirm')`, { timeout: 8000 }); await navTo(guest, 'ap-confirm-ok', 6); await press(guest, 'Enter');
    const gl = await waitFor(guest, `window.__echoes.app.state==='title'`, { timeout: 25000 });
    note('R guest left', { gl, host: await appState(host), hostPeers: await peers(host) });
    await sleep(2000);
    const j2 = await joinByCode(guest, code);
    note('R guest rejoined', { j2 });
    const r = await probeDropIn('R', guest, host);
    check('R guest rejoining the running session by code reaches play', r.reached !== null, r);
    if (mode === 'both') {
      // Extra: a brand-new third client drops into the same running room.
      const thirdO = await mk('third', '&netname=Third'); const third = thirdO.page;
      await toTitle(third);
      const j3 = await joinByCode(third, code);
      note('F3 third client joined running room', { j3 });
      const r3 = await probeDropIn('F3', third, host);
      check('F3 brand-new third client dropping into the running session reaches play', r3.reached !== null, r3);
    }
  }
  result.versions1 = Object.fromEntries(await Promise.all(Object.entries(pages).map(async ([k, o]) => [k, await o.page.evaluate(() => window.__echoes.version)])));
  result.navs = Object.fromEntries(Object.entries(pages).map(([k, o]) => [k, o.navs]));
  result.errors = Object.fromEntries(Object.entries(pages).map(([k, o]) => [k, o.errors.slice(0, 5)]));
  result.consoleTail = Object.fromEntries(Object.entries(pages).map(([k, o]) => [k, o.consoleLines.filter((l) => /net|lobby|join|seat|drop|reject|warn|error/i.test(l)).slice(-25)]));
  result.serverLog = serverLog.join('').slice(-3000);
} catch (e) { console.error('[HARNESS-ERROR]', (e && e.stack) || e); result.harnessError = String((e && e.message) || e); }
finally { if (server) { try { server.kill(); } catch { /* gone */ } } await browser.close(); }
result.checks = checks; result.log = log;
writeFileSync(join(root, 'captures', `${P}.json`), JSON.stringify(result, null, 1));
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} -> captures/${P}.json`);
process.exit(result.harnessError ? 1 : 0);
