#!/usr/bin/env node
// GI.1 — the whole player journey by REAL input, with no dead end
// (docs/gauntlet/PLAN.md §7 INT). Owner: INT.
//
//   title -> Settings (one display + one audio change) -> New Game -> camp ->
//   portal -> room 1 -> draft taken -> pause -> save -> quit to title ->
//   Load -> same room, same build -> run ends -> high score ->
//   Multiplayer host + 1 headless guest -> leave -> title -> reload (the
//   settings changed in step 2 are applied on boot).
//
//   node tools/gntINT-journey.mjs [--url http://127.0.0.1:5199] [--port 7830]
//                                 [--out captures/gntINT-journey.json] [--shots]
//
// Every step asserts against the RUNNING game (debug API + DOM rects); the
// exit code is 0 when every check passed and 1 otherwise. Multi-page profile
// (PLAN §6.7) because the MP leg drives two pages in one browser.
import { writeFileSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5199');
const netPort = Number(arg('port', 7830));
const outPath = arg('out', 'captures/gntINT-journey.json');
const wantShots = argv.includes('--shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
let failures = 0;
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`);
}

const shot = async (page, name) => {
  if (!wantShots) return;
  mkdirSync(join(root, 'captures'), { recursive: true });
  await page.screenshot({ path: join(root, 'captures', `${name}.png`) });
};

// ---------------------------------------------------------------- helpers --
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
const appState = (page) =>
  page.evaluate(() => ({
    state: window.__echoes.app.state,
    stack: window.__echoes.app.stack(),
    focus: (window.__echoes.app.focus() || {}).id ?? null,
    rings: window.__echoes.app.ringCount(),
  }));

async function press(page, key, times = 1, gap = 110) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await sleep(gap);
  }
}

// Move the focus ring to `id` with real Down/Up presses (never by script).
async function navTo(page, id, max = 24) {
  if ((await focusOf(page)) === id) return true;
  for (let i = 0; i < max; i++) {
    await press(page, 'ArrowDown');
    if ((await focusOf(page)) === id) return true;
  }
  for (let i = 0; i < max; i++) {
    await press(page, 'ArrowUp');
    if ((await focusOf(page)) === id) return true;
  }
  return false;
}

async function waitFor(page, fnBody, { timeout = 20000, every = 150 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(`(()=>{try{return !!(${fnBody})}catch(e){return false}})()`)) return true;
    await sleep(every);
  }
  return false;
}

const browser = await launchEchoes({ gpu: true, background: true });
let server = null;
try {
  // ================================================== A — boot to the title --
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1`);
  await sleep(1500);
  let s = await appState(page);
  check('A1 boot shows the loading splash', s.state === 'boot' && s.stack.includes('loading'), s);
  await press(page, 'Enter'); // "Press any key or click" — also the audio unlock gesture
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 15000 });
  s = await appState(page);
  check('A2 title, one focus ring, sim paused', s.state === 'title' && s.rings === 1 && (await page.evaluate(() => window.__echoes.app.simPaused())), s);
  await shot(page, 'gntINT-j-title');

  // =============================================== B — settings by real input --
  check('B0 Settings reachable from the title', await navTo(page, 'ap-title-settings'));
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('settings')`);
  const buf0 = await page.evaluate(() => window.__echoes.app.display().drawingBuffer);
  // Display tab is the first one: walk to the render-scale row and lower it.
  const scaleRow = await navTo(page, 'ap-display-renderScale');
  check('B1 Display > Render scale row focusable', scaleRow, await focusOf(page));
  await press(page, 'ArrowLeft', 5, 160); // 1.00 -> 0.75
  await sleep(700);
  const disp = await page.evaluate(() => ({ scale: window.__echoes.settings.get('display.renderScale'), buf: window.__echoes.app.display().drawingBuffer }));
  check('B2 render scale changed the drawing buffer live', disp.scale < 1 && disp.buf.w < buf0.w, { from: buf0, to: disp });
  // Leaving the Display tab with an armed change asks "Keep these display
  // settings?" (PLAN §5 / G1.9) — answer Keep, then land on the Audio tab.
  const gain0 = await page.evaluate(() => window.__echoes.audio.buses().master.gainDb);
  await press(page, 'PageDown');
  const keepAsked = await waitFor(page, `window.__echoes.app.stack().includes('keep-display')`, { timeout: 6000 });
  check('B2b leaving the tab asked Keep / Revert', keepAsked, await appState(page));
  if (keepAsked) {
    await navTo(page, 'ap-keep-keep', 6);
    await press(page, 'Enter');
    await sleep(600);
  }
  const onAudio = await page.evaluate(() => document.querySelector('.ap-tab.ap-active')?.textContent?.trim() ?? null);
  const lvlRow = await navTo(page, 'au-master-level');
  check('B3 Audio tab reached, master level row focusable', onAudio === 'Audio' && lvlRow, { tab: onAudio, focus: await focusOf(page) });
  await press(page, 'ArrowLeft', 8, 140);
  await sleep(500);
  const aud = await page.evaluate(() => ({ level: window.__echoes.settings.get('audio.master.level'), gainDb: window.__echoes.audio.buses().master.gainDb }));
  check('B4 master level changed the bus gain', aud.level < 0.8 && aud.gainDb < gain0, { from: gain0, to: aud });
  await shot(page, 'gntINT-j-settings');
  await press(page, 'Escape'); // back to the title, one level
  await waitFor(page, `window.__echoes.app.state==='title' && !window.__echoes.app.stack().includes('settings')`);
  check('B5 Escape leaves Settings back to the title', (await appState(page)).stack.join() === 'title');

  // ====================================================== C/D — New Game -> run --
  check('C1 New Game focusable', await navTo(page, 'ap-title-new'));
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 20000 });
  await waitFor(page, `window.__echoes.tick>60`, { timeout: 20000 });
  check('C2 playing in camp, sim running', await page.evaluate(() => window.__echoes.app.state === 'playing' && window.__echoes.app.mode === 'camp' && !window.__echoes.app.simPaused()));
  const seed = await page.evaluate(() => window.__echoes.seed);

  await page.keyboard.down('w');
  const atPortal = await waitFor(page, `window.__echoes.cmd('campState').inPortal`, { timeout: 25000 });
  await page.keyboard.up('w');
  check('D1 walked into the portal by real input', atPortal);
  await press(page, 'e');
  const inRoom1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===1})()`, { timeout: 25000 });
  check('D2 room 1 combat started', inRoom1);
  await shot(page, 'gntINT-j-room1');

  // ============================================== E — clear room 1 + take a draft --
  await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
  await waitFor(page, `window.__echoes.state().run.phase==='reward'`, { timeout: 25000 });
  await waitFor(page, `window.__echoes.runUi().settled===true`, { timeout: 10000 });
  const offered = await page.evaluate(() => window.__echoes.state().run.reward);
  await press(page, 'Enter'); // Take (the page's default focus)
  await sleep(900);
  const build1 = await page.evaluate(() => ({ skills: window.__echoes.state().skills ?? null, run: window.__echoes.state().run.phase, room: window.__echoes.state().run.room }));
  check('E1 draft taken by real input', !!offered && build1.skills !== null, { offered: offered && offered.id, build: build1 });

  // ============================================ F — pause -> save into a slot --
  await press(page, 'Escape');
  await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  check('F1 pause from the run page', (await appState(page)).stack.join() === 'pause');
  check('F2 Save Game enabled in single player', await navTo(page, 'pz-save'));
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('saves')`);
  const slotId = await page.evaluate(() => {
    const el = document.querySelector('.ap-screen[data-screen="saves"] [data-nav]');
    return el ? el.id : null;
  });
  await press(page, 'Enter'); // the focused (first) slot
  await sleep(500);
  // A fresh slot may ask to confirm an overwrite — confirm if a dialog opened.
  if ((await appState(page)).stack.includes('confirm')) {
    await navTo(page, 'ap-confirm-ok');
    await press(page, 'Enter');
  }
  const saved = await waitFor(page, `window.__echoes.save.list().length>0`, { timeout: 12000 });
  const savedMeta = await page.evaluate(() => window.__echoes.save.list().map((x) => ({ id: x.id, mode: x.meta && x.meta.mode, room: x.meta && x.meta.room, act: x.meta && x.meta.act })));
  check('F3 the save landed in a slot', saved, { slotFocus: slotId, slots: savedMeta });
  await shot(page, 'gntINT-j-saves');
  // Back out of the slot list to the pause menu, then Resume.
  await press(page, 'Escape');
  await waitFor(page, `window.__echoes.app.stack().join()==='pause'`);
  check('F4 back from the slot list lands on the pause menu', (await appState(page)).stack.join() === 'pause');

  // ====================================================== G — quit to title --
  const before = await page.evaluate(() => ({ room: window.__echoes.state().run.room, phase: window.__echoes.state().run.phase, skills: window.__echoes.state().skills, wallet: window.__echoes.state().run.wallet, seed: window.__echoes.seed, tick: window.__echoes.tick }));
  check('G0 Quit to Title focusable', await navTo(page, 'pz-quit'));
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('confirm')`);
  await navTo(page, 'ap-confirm-ok');
  await press(page, 'Enter');
  const backAtTitle = await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 });
  check('G1 quit to title (confirmed)', backAtTitle, await appState(page));

  // ================================================== H — continue the save --
  const cont = await navTo(page, 'ap-title-continue');
  check('H0 Continue offered on the title after saving', cont, await page.evaluate(() => window.__echoes.app.focusables().map((f) => f.id)));
  await press(page, 'Enter');
  const loaded = await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.state().run.active`, { timeout: 25000 });
  const after = await page.evaluate(() => ({ room: window.__echoes.state().run.room, phase: window.__echoes.state().run.phase, skills: window.__echoes.state().skills, wallet: window.__echoes.state().run.wallet, seed: window.__echoes.seed }));
  check(
    'H1 loaded into the same room with the same build and run seed',
    loaded && after.room === before.room && after.phase === before.phase && after.wallet === before.wallet && JSON.stringify(after.skills) === JSON.stringify(before.skills) && after.seed === before.seed,
    { before, after, bootSeed: seed }
  );
  await shot(page, 'gntINT-j-loaded');

  // ===================================== I — finish the run -> high score kept --
  const prof0 = await page.evaluate(() => {
    const p = window.__echoes.save.profile();
    return { runs: p.records.runs, scores: p.highScores.length, best: p.records.bestScore };
  });
  await page.evaluate(() => window.__echoes.cmd('endRun', 'victory'));
  await waitFor(page, `window.__echoes.runUi().screen==='end'`, { timeout: 20000 });
  await sleep(1200);
  const prof1 = await page.evaluate(() => {
    const p = window.__echoes.save.profile();
    return { runs: p.records.runs, scores: p.highScores.length, best: p.records.bestScore, victories: p.records.victories };
  });
  check('I1 the finished run is recorded as a high score', prof1.runs === prof0.runs + 1 && prof1.scores > prof0.scores && prof1.best > 0, { before: prof0, after: prof1 });
  await waitFor(page, `window.__echoes.runUi().settled===true`, { timeout: 10000 });
  await press(page, 'Enter'); // the end card's own button -> camp
  await sleep(1500);
  check('I2 the end card returns to play (no dead end)', await page.evaluate(() => window.__echoes.app.state === 'playing'), await appState(page));

  // =============================================== J — multiplayer, 2 pages --
  server = spawn(process.execPath, [join(root, 'server', 'index.mjs'), '--port', String(netPort)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const serverLog = [];
  server.stdout.on('data', (d) => serverLog.push(String(d)));
  server.stderr.on('data', (d) => serverLog.push(String(d)));
  await sleep(1200);
  const wsUrl = `ws://127.0.0.1:${netPort}/echoes`;

  // Host: from the title through the multiplayer menus, by real input.
  const hostCtx = await browser.createBrowserContext();
  const guestCtx = await browser.createBrowserContext();
  const host = (await openEchoes(hostCtx, `${base}/?fresh=1&net=${encodeURIComponent(wsUrl)}`)).page;
  await sleep(1500);
  await press(host, 'Enter');
  await waitFor(host, `window.__echoes.app.state==='title'`, { timeout: 15000 });
  const mpItem = await navTo(host, 'ap-title-multiplayer');
  check('J1 Multiplayer offered on the title', mpItem);
  await press(host, 'Enter');
  await waitFor(host, `window.__echoes.app.stack().includes('mp-menu')`, { timeout: 10000 });
  await waitFor(host, `window.__echoes.net.serverState!=='checking'`, { timeout: 15000 }).catch(() => {});
  check('J2 Host a Game focusable', await navTo(host, 'nt-mp-host'));
  await press(host, 'Enter');
  const inLobby = await waitFor(host, `window.__echoes.app.stack().includes('lobby')`, { timeout: 20000 });
  const code = await host.evaluate(() => {
    const n = window.__echoes.net;
    const r = n.room;
    return n.code ?? (r && typeof r === 'object' ? r.code : r) ?? null;
  });
  check('J3 lobby open with a room code', inLobby && !!code, { code });
  await shot(host, 'gntINT-j-lobby');

  const guest = (await openEchoes(guestCtx, `${base}/?fresh=1&net=${encodeURIComponent(wsUrl)}&netjoin=${code}&netname=Guest`)).page;
  await sleep(1500);
  await press(guest, 'Enter');
  const guestIn = await waitFor(guest, `(()=>{const n=window.__echoes.net;const c=n.code ?? (n.room&&n.room.code);return c===${JSON.stringify(code)}})()`, { timeout: 25000 });
  check('J4 headless guest joined the room', guestIn, await guest.evaluate(() => ({ state: window.__echoes.net.state, code: window.__echoes.net.code ?? null, seat: window.__echoes.net.seat })));
  await guest.evaluate(() => window.__echoes.net.setReady && window.__echoes.net.setReady(true));
  await sleep(700);
  await navTo(host, 'nt-lobby-start');
  await press(host, 'Enter');
  const started = await waitFor(host, `window.__echoes.net.inSession===true||window.__echoes.net.state==='host'`, { timeout: 25000 });
  const guestPlaying = await waitFor(guest, `window.__echoes.app.state==='playing'`, { timeout: 25000 });
  check('J5 session started on both pages', started && guestPlaying, {
    host: await host.evaluate(() => ({ state: window.__echoes.net.state, app: window.__echoes.app.state })),
    guest: await guest.evaluate(() => ({ state: window.__echoes.net.state, app: window.__echoes.app.state })),
  });
  await sleep(2500);

  // The guest's pause menu: the sim keeps running and saving is host-only.
  const gTick0 = await guest.evaluate(() => window.__echoes.tick);
  await press(guest, 'Escape');
  await waitFor(guest, `window.__echoes.app.stack().includes('pause')`, { timeout: 10000 });
  await sleep(1200);
  const gPause = await guest.evaluate(() => {
    const el = document.querySelector('.pz-pause.ap-open');
    return {
      tick: window.__echoes.tick,
      simPaused: window.__echoes.app.simPaused(),
      online: el ? !el.querySelector('.pz-online').hidden : null,
      items: el ? [...el.querySelectorAll('[data-nav]')].map((b) => ({ id: b.id, disabled: !!b.disabled, cap: (b.querySelector('.pz-cap') || {}).textContent || '' })) : null,
    };
  });
  const saveItem = (gPause.items || []).find((i) => i.id === 'pz-save');
  check('J6 guest pause: sim keeps running, honest online note', gPause.tick > gTick0 && gPause.simPaused === false && gPause.online === true, gPause);
  check('J7 guest pause: Save is disabled, host-only reason', !!saveItem && saveItem.disabled && /host/i.test(saveItem.cap), saveItem);
  check('J8 guest pause: Leave Session offered, no Quit', !!(gPause.items || []).find((i) => i.id === 'pz-leave') && !(gPause.items || []).find((i) => i.id === 'pz-quit'), (gPause.items || []).map((i) => i.id));
  await shot(guest, 'gntINT-j-mp-pause');

  await navTo(guest, 'pz-leave');
  await press(guest, 'Enter');
  await waitFor(guest, `window.__echoes.app.stack().includes('confirm')`, { timeout: 8000 });
  await navTo(guest, 'ap-confirm-ok');
  await press(guest, 'Enter');
  const guestLeft = await waitFor(guest, `window.__echoes.app.state==='title'`, { timeout: 25000 });
  check('J9 guest leaves the session back to the title', guestLeft, await guest.evaluate(() => ({ app: window.__echoes.app.state, net: window.__echoes.net.state, stack: window.__echoes.app.stack() })));

  await press(host, 'Escape');
  await waitFor(host, `window.__echoes.app.stack().includes('pause')`, { timeout: 10000 });
  await navTo(host, 'pz-leave');
  await press(host, 'Enter');
  await waitFor(host, `window.__echoes.app.stack().includes('confirm')`, { timeout: 8000 });
  await navTo(host, 'ap-confirm-ok');
  await press(host, 'Enter');
  const hostLeft = await waitFor(host, `window.__echoes.app.state==='title'`, { timeout: 25000 });
  check('J10 host leaves the session back to the title', hostLeft, await host.evaluate(() => ({ app: window.__echoes.app.state, net: window.__echoes.net.state })));
  const hostErrors = await host.evaluate(() => 0);
  void hostErrors;
  await guest.close();
  await host.close();
  await guestCtx.close();
  await hostCtx.close();

  // =========================== K — settings survive a reload and apply on boot --
  await page.goto(`${base}/`, { waitUntil: 'networkidle2', timeout: 120000 });
  await waitFor(page, `!!window.__echoes`, { timeout: 60000 });
  await sleep(2500);
  const boot = await page.evaluate(() => ({
    scale: window.__echoes.settings.get('display.renderScale'),
    buf: window.__echoes.app.display().drawingBuffer,
    master: window.__echoes.settings.get('audio.master.level'),
    gainDb: window.__echoes.audio.buses().master.gainDb,
    loadReport: window.__echoes.settings.loadReport.status,
  }));
  check('K1 the display setting persisted and is applied on boot', boot.scale === disp.scale && boot.buf.w === disp.buf.w, { expected: disp, got: boot });
  const kept = await page.evaluate(() => ({ slots: window.__echoes.save.list().length, runs: window.__echoes.save.profile().records.runs }));
  check('K3 saves and the profile survived the reload', kept.slots > 0 && kept.runs > 0, kept);
  check('K2 the audio setting persisted and is applied on boot', Math.abs(boot.master - aud.level) < 1e-6 && Math.abs(boot.gainDb - aud.gainDb) < 0.6, { expected: aud, got: boot });
  await shot(page, 'gntINT-j-reload');

  check('Z page errors on the journey page', errors.length === 0, errors.slice(0, 5));
} finally {
  if (server) {
    try {
      server.kill();
    } catch {
      /* already gone */
    }
  }
  await browser.close();
}

mkdirSync(join(root, dirname(outPath)), { recursive: true });
writeFileSync(join(root, outPath), JSON.stringify({ schema: 'gntINT-journey/1', at: new Date().toISOString(), base, netPort, failures, checks }, null, 1));
console.log(`\n${checks.length - failures}/${checks.length} checks passed -> ${outPath}`);
process.exit(failures ? 1 : 0);
