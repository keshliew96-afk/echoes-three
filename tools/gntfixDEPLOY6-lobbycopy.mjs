#!/usr/bin/env node
// gntfixDEPLOY6-lobbycopy (fix-DEPLOY-r6, DEP6-F2): does the lobby tell the
// truth about who builds what? Real-UI, zero-config flow (adapted from the
// refuter probe tools/gntrdeploy6harness-f2-lobbycopy.mjs): two fresh
// headless profiles open the plain page served by OUR OWN `--static` session
// server (no ?net / ?nethost / ?netjoin), click Multiplayer ▸ Host a Game /
// Join by Code, type the code, Ready, Start. Checks:
//   L1  the SHARE panel's how-to line never says the host makes the build
//       choices (the binding PER-CHARACTER BUILDS rule: each human builds
//       their OWN character, the host builds AI-held seats);
//   L2  it names the viewer's own character and says they build it
//       (host: Healer; guest: its seat's class) and that the host builds the
//       AI-held seats;
//   L3  the panel fits: the how-to line inside the window and the panel,
//       the lobby panel needs no more scroll than the --base-scroll given;
//   R1  the rule it states is what happens: after room 1 the guest's own
//       reward card is for ITS class ("FOR THE <CLASS>" / its strip tab);
//   N1  the guest pressing Enter on the door page (the host's decision) gets
//       a note that names the door, never "makes the build choices".
// usage: node tools/gntfixDEPLOY6-lobbycopy.mjs --port 7930 --tag A [--w 1280 --h 720] [--lobby-only 1]
import puppeteer from 'puppeteer';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const PORT = +(a.port || 7930);
const TAG = a.tag || 'A';
const W = +(a.w || 1280);
const H = +(a.h || 720);
const LOBBY_ONLY = a['lobby-only'] === '1';
const URL0 = `http://127.0.0.1:${PORT}/`;
const OUT = 'captures/gntfixDEPLOY6';
mkdirSync(OUT, { recursive: true });
const PROF = join(process.env.TEMP || '.', 'gntfixDEPLOY6-profiles');
mkdirSync(PROF, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { tag: TAG, port: PORT, size: [W, H], steps: [], checks: [] };
const step = (k, v) => {
  out.steps.push({ k, v });
  console.log(k, JSON.stringify(v).slice(0, 600));
};
const check = (name, ok, detail = {}) => {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 400)}`);
};
const SEAT = ['Healer', 'Tank', 'Swordsman', 'Archer'];
const BAD = /makes the build choices|host (?:makes|chooses|decides) (?:the |all |every )?build/i;

async function openProfile(name) {
  const dir = mkdtempSync(join(PROF, `${name}-`));
  const browser = await puppeteer.launch({ headless: true, userDataDir: dir, protocolTimeout: 240000, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required'] });
  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const p = { name, browser, page, log: [], errors: [] };
  page.on('console', (m) => p.log.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => {
    p.errors.push(e.message);
    p.log.push(`[PAGEERROR] ${e.message}`);
  });
  return p;
}
async function waitFor(p, fn, { timeout = 30000, poll = 150 } = {}) {
  const t = Date.now();
  while (Date.now() - t < timeout) {
    const v = await p.page.evaluate(fn).catch(() => null);
    if (v) return { ok: true, ms: Date.now() - t, v };
    await sleep(poll);
  }
  return { ok: false, ms: Date.now() - t };
}
async function toTitle(p) {
  await p.page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.page.waitForFunction(() => window.__echoes && window.__echoes.app, { timeout: 120000 });
  const t = Date.now();
  while (Date.now() - t < 120000) {
    const st = await p.page.evaluate(() => window.__echoes.app.state);
    if (st === 'title') return true;
    if (st === 'boot') await p.page.keyboard.press('KeyQ');
    await sleep(300);
  }
  return false;
}
async function rect(p, sel) {
  return p.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, dis: !!el.disabled };
  }, sel);
}
async function click(p, sel, timeout = 20000) {
  const t = Date.now();
  let r = null;
  while (Date.now() - t < timeout) {
    r = await rect(p, sel);
    if (r && !r.dis) break;
    await sleep(120);
  }
  if (!r || r.dis) throw new Error(`${p.name}: ${sel} not clickable (${JSON.stringify(r)})`);
  // The panel scrolls at small sizes: bring the control into view first.
  await p.page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'nearest' }), sel);
  await sleep(80);
  r = await rect(p, sel);
  await p.page.mouse.click(r.x, r.y);
  return r;
}
// Click until `cond` holds (the title's first pointer press can land while
// the title is still settling; retry like a player would).
async function clickUntil(p, sel, cond, tries = 4) {
  for (let i = 0; i < tries; i++) {
    await click(p, sel);
    const w = await waitFor(p, cond, { timeout: 5000 });
    if (w.ok) return w;
  }
  throw new Error(`${p.name}: ${sel} press never reached its screen`);
}
const shot = (p, n) => p.page.screenshot({ path: `${OUT}/lc-${TAG}-${n}.png` });
const howto = (p) =>
  p.page.evaluate(() => {
    const s = document.querySelector('.nt-lobby .nt-howto');
    const panel = document.querySelector('.nt-lobby .nt-panel');
    if (!s || !panel) return null;
    const r = s.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return {
      text: s.innerText,
      visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      inWindow: r.x >= -0.5 && r.y >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      inPanel: r.x >= pr.x - 0.5 && r.right <= pr.right + 0.5 && r.y >= pr.y - 0.5 && r.bottom <= pr.bottom + 0.5,
      panelScroll: panel.scrollHeight - panel.clientHeight,
      fontPx: parseFloat(cs.fontSize),
    };
  });
const rewardText = (p) =>
  p.page.evaluate(() => {
    let u = null;
    try {
      u = window.__echoes.runUi();
    } catch (e) {
      u = null;
    }
    const vis = document.body.innerText;
    const i = vis.search(/FOR YOU|FOR THE|SWAP|CHOOSE/i);
    return { screen: u && u.screen, phase: u && u.phase, text: i >= 0 ? vis.slice(Math.max(0, i - 120), i + 360).replace(/\n+/g, ' | ') : vis.slice(0, 300).replace(/\n+/g, ' | ') };
  });
const hudNotes = (p) => p.page.evaluate(() => [...document.querySelectorAll('.nt-note')].map((n) => n.textContent));

const profs = [];
try {
  const Hh = await openProfile(`lc${TAG}-host`);
  profs.push(Hh);
  step('host.title', await toTitle(Hh));
  await clickUntil(Hh, '#ap-title-multiplayer', () => !!document.querySelector('#nt-mp-host') && document.querySelector('#nt-mp-host').getClientRects().length > 0);
  await click(Hh, '#nt-mp-host');
  const hl = await waitFor(Hh, () => window.__echoes.app.overlay === 'lobby' && window.__echoes.net.room && window.__echoes.net.room.code, { timeout: 30000 });
  const code = hl.v;
  const ver = await Hh.page.evaluate(() => window.__echoes.version);
  const addr = await Hh.page.evaluate(() => {
    try {
      const i = window.__echoes.net.addressInfo();
      return { url: i.url, source: i.source, auto: i.auto };
    } catch (e) {
      return String(e);
    }
  });
  step('host.lobby', { ok: hl.ok, code, version: ver, addr });
  out.version = ver;
  await sleep(800);
  const hHow = await howto(Hh);
  step('host.howto', hHow);
  await shot(Hh, 'host-lobby-alone');

  const Gg = await openProfile(`lc${TAG}-guest`);
  profs.push(Gg);
  step('guest.title', await toTitle(Gg));
  await clickUntil(Gg, '#ap-title-multiplayer', () => !!document.querySelector('#nt-mp-join') && document.querySelector('#nt-mp-join').getClientRects().length > 0);
  await click(Gg, '#nt-mp-join');
  await waitFor(Gg, () => document.activeElement && document.activeElement.id === 'nt-join-code', { timeout: 8000 });
  await Gg.page.keyboard.type(code, { delay: 40 });
  await Gg.page.keyboard.press('Enter');
  const gl = await waitFor(Gg, () => window.__echoes.app.overlay === 'lobby' && window.__echoes.net.room, { timeout: 30000 });
  await sleep(1000);
  const gSeat = await Gg.page.evaluate(() => window.__echoes.net.seat);
  step('guest.lobby', { ok: gl.ok, seat: gSeat });
  const gHow = await howto(Gg);
  step('guest.howto', gHow);
  await shot(Gg, 'guest-lobby');
  await click(Gg, '#nt-lobby-ready');
  await sleep(1200);
  const hHow2 = await howto(Hh);
  step('host.howto.full', hHow2);
  await shot(Hh, 'host-lobby-full');

  // L1 / L2 / L3
  for (const [who, hw, seat] of [
    ['host', hHow2, 0],
    ['guest', gHow, gSeat],
  ]) {
    const t = hw ? hw.text : '';
    check(`L1 ${who}: no "host makes the build choices"`, hw && !BAD.test(t), { text: t });
    const cls = SEAT[seat] || '?';
    check(`L2 ${who}: names its own character (${cls}) and that it builds it`, hw && new RegExp(`\\b${cls}\\b`).test(t) && /\bbuild/i.test(t) && /(your own|yourself|their own)/i.test(t), { cls, text: t });
    check(`L2 ${who}: the host builds the AI-held seats`, hw && /AI[- ]held seats/i.test(t) && /\bhost\b|\byou\b/i.test(t), { text: t });
    check(`L3 ${who}: the line is visible, inside the window and the panel`, hw && hw.visible && hw.inWindow && hw.inPanel && hw.fontPx >= 14, { rect: hw && hw.rect, inWindow: hw && hw.inWindow, inPanel: hw && hw.inPanel, panelScroll: hw && hw.panelScroll, fontPx: hw && hw.fontPx });
  }
  if (a['base-scroll'] !== undefined) {
    const base = +a['base-scroll'];
    check(`L3 lobby panel scroll <= base ${base}`, hHow2 && hHow2.panelScroll <= base + 1 && gHow && gHow.panelScroll <= base + 1, { host: hHow2 && hHow2.panelScroll, guest: gHow && gHow.panelScroll });
  }

  if (LOBBY_ONLY) {
    // L4: a guest who takes another free seat reads its NEW character.
    await click(Gg, '#nt-seat-2');
    const moved = await waitFor(Gg, () => window.__echoes.net.seat === 2, { timeout: 10000 });
    await sleep(600);
    const g2 = await howto(Gg);
    step('guest.howto.seat2', g2);
    await shot(Gg, 'guest-lobby-seat2');
    check('L4 the guest took the Swordsman seat and the line follows', moved.ok && g2 && /You play the Swordsman/.test(g2.text) && g2.inPanel, { text: g2 && g2.text });
  }
  if (!LOBBY_ONLY) {
    await click(Hh, '#nt-lobby-start', 20000);
    // L3 during the start countdown (the side panel gains "Starting in 1.5 s").
    let cdMax = -1;
    let cdSeen = null;
    for (let i = 0; i < 12; i++) {
      const m = await Hh.page.evaluate(() => {
        const p = document.querySelector('.nt-lobby .nt-panel');
        const c = document.querySelector('.nt-lobby .nt-countdown');
        return p && p.getClientRects().length ? { scroll: p.scrollHeight - p.clientHeight, cd: c ? c.textContent : null } : null;
      });
      if (m) {
        cdMax = Math.max(cdMax, m.scroll);
        if (m.cd) cdSeen = m.cd;
      }
      await sleep(100);
    }
    if (a['base-scroll'] !== undefined) check('L3 lobby panel scroll during the countdown <= base', cdMax <= +a['base-scroll'] + 1, { cdMax, cdSeen });
    const hp = await waitFor(Hh, () => window.__echoes.app.state === 'playing', { timeout: 40000 });
    const gp = await waitFor(Gg, () => window.__echoes.app.state === 'playing' && window.__echoes.net.state === 'guest', { timeout: 40000 });
    step('playing', { host: hp.ok, guest: gp.ok });
    await sleep(2500);
    // begin the run (debug startRun on the host = the portal's Begin Run), clear room 1
    await Hh.page.evaluate(() => window.__echoes.cmd('startRun'));
    const comb = await waitFor(Hh, () => {
      const r = window.__echoes.state().run;
      return r && r.phase === 'combat';
    }, { timeout: 40000 });
    step('combat', comb.ok);
    const rew = await waitFor(Hh, () => {
      const r = window.__echoes.state().run;
      if (r && r.phase === 'combat') window.__echoes.cmd('killAllEnemies');
      return r && r.phase === 'reward';
    }, { timeout: 40000, poll: 300 });
    step('reward', rew.ok);
    await sleep(3000);
    const hR = await rewardText(Hh);
    const gR = await rewardText(Gg);
    step('host.reward', hR);
    step('guest.reward', gR);
    await shot(Hh, 'host-reward');
    await shot(Gg, 'guest-reward');
    const gCls = (SEAT[gSeat] || '?').toUpperCase();
    check('R1 the guest gets its own card (FOR THE <its class>)', new RegExp(`FOR THE ${gCls}`).test(gR.text.toUpperCase()), { text: gR.text.slice(0, 200) });
    check('R1 the host gets the Healer\'s card (FOR YOU — THE HEALER)', /FOR YOU/i.test(hR.text) && /HEALER/i.test(hR.text), { text: hR.text.slice(0, 200) });
    // Both commit their own cards (Enter = the focused primary action).
    await Gg.page.bringToFront();
    await Gg.page.keyboard.press('Enter');
    await sleep(1500);
    await Hh.page.bringToFront();
    await Hh.page.keyboard.press('Enter');
    const door = await waitFor(Gg, () => {
      const r = window.__echoes.state().run;
      return r && r.phase === 'path';
    }, { timeout: 45000, poll: 300 });
    step('door', door.ok);
    await sleep(1500);
    const gDoor = await Gg.page.evaluate(() => {
      const n = [...document.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /picks the door/i.test(x.textContent || ''));
      return n ? n.textContent : null;
    });
    step('guest.doorLine', gDoor);
    await Gg.page.bringToFront();
    await Gg.page.keyboard.press('Enter');
    const note = await waitFor(Gg, () => {
      const ns = [...document.querySelectorAll('.nt-note')].map((n) => n.textContent);
      return ns.find((t) => /pick was shown|build|door/i.test(t)) || null;
    }, { timeout: 8000, poll: 100 });
    step('guest.note', note);
    await shot(Gg, 'guest-door-note');
    const allNotes = (await hudNotes(Gg)).concat(Gg.log.filter((l) => /build choices/i.test(l)));
    check('N1 the guest\'s refused door press names the door, never "build choices"', note.ok && /door/i.test(note.v) && !BAD.test(note.v) && !allNotes.some((t) => BAD.test(t)), { note: note.v || null, notes: allNotes });
  }
  out.errors = profs.map((p) => ({ name: p.name, errors: p.errors }));
  check('no page errors', profs.every((p) => p.errors.length === 0), { errors: out.errors });
} catch (e) {
  out.fatal = String(e.stack || e);
  console.log('FATAL', out.fatal);
} finally {
  for (const p of profs) {
    writeFileSync(`${OUT}/lc-${TAG}-${p.name}.console.txt`, p.log.join('\n'));
    await p.browser.close().catch(() => {});
  }
  const fails = out.checks.filter((c) => !c.ok).length;
  out.summary = { pass: out.checks.length - fails, fail: fails, fatal: !!out.fatal };
  writeFileSync(`${OUT}/lc-${TAG}.json`, JSON.stringify(out, null, 2));
  console.log('SUMMARY', JSON.stringify(out.summary));
}
