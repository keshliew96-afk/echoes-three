#!/usr/bin/env node
// SECRET ROOMS in the real game (docs/SECRET_ROOMS.md): against `npm run dev`
// (port 5199), plays Level I campaigns with a wall forced into room 4 and
// captures (into --shots, default captures/):
//   secret-1-wall      the cracked wall in a live fight, its seam and draught
//   secret-2-tip       the first-wall floor tip
//   secret-3-breach    a bomb breaks it open
//   secret-4-open      the breach, dark, once the dust settles
//   secret-5-<holds>   the chamber with what it holds (hoard, relic, tonics,
//                      lore, event), then secret-6-<holds> once taken
//   secret-7-relic     the hidden reliquary's relic pick
//   secret-8-end       the end card's SECRETS FOUND row
//   secret-9-journal   the Journal's lore page
// It fails on a page error, a wall that never shows or never opens, a
// chamber that never comes, a missing end-card row or Journal page.
//
//   node tools/secret-rooms-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir] [--only lore,relic]
//   node tools/vaults-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', null);
const SHOTS = opt('shots', 'captures');
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
mkdirSync(SHOTS, { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });

await page.goto(`${URL0}?seed=5&tips=1&story=0&tutorial=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const ONLY = opt('only', 'hoard,relic,tonics,lore,event').split(',');
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function key(code, ms = 260) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
}
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function closeTip() {
  const tip = await page.evaluate(() => (window.__echoes.tutorial ? window.__echoes.tutorial().debug().tip : null));
  if (tip) {
    await page.keyboard.press('Enter');
    await sleep(400);
  }
  return tip;
}
await page.evaluate(() => {
  window.__sr = [];
  for (const type of ['secret_wall', 'secret_knock', 'secret_open', 'secret_enter', 'secret_pile', 'secret_take', 'relic_offer'])
    window.__echoes.on(type, (ev) => window.__sr.push({ type, ...ev }));
});
const last = (type) => page.evaluate((t) => window.__sr.filter((e) => e.type === t).pop() ?? null, type);
const count = (type) => page.evaluate((t) => window.__sr.filter((e) => e.type === t).length, type);
async function waitEvent(type, n = 1, timeout = 60000) {
  return page.waitForFunction((t, k) => window.__sr.filter((e) => e.type === t).length >= k, { timeout, polling: 100 }, type, n).then(() => true).catch(() => false);
}
const floorTip = () => page.evaluate(() => {
  const el = document.querySelector('.tt-floor, .tut-floor, [class*="floor-tip"]');
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
});

let first = true;
let walls = 0;
for (const holds of ONLY) {
  if (!first) {
    await cmd('abandonRun', 'quit');
    await sleep(2500);
  }
  // A plain fight in room 4 (a run whose room 4 became an objective room
  // starts again), the wall forced into it.
  for (let k = 0; k < 8; k++) {
    if (k) {
      await cmd('abandonRun', 'quit');
      await sleep(2500);
    }
    await cmd('startCampaign', { level: 1 });
    await waitPhase(['combat']);
    await closeTip();
    await cmd('secretWall', 4, holds);
    await cmd('skipToRoom', 4);
    await sleep(1500);
    const rv = await waitPhase(['combat']);
    if (rv.mode === 'kill_all' || rv.mode === 'defend') break;
    await page.evaluate(() => {
      const i = window.__sr.map((e) => e.type).lastIndexOf('secret_wall');
      if (i >= 0) window.__sr.splice(i, 1);
    });
  }
  check(await waitEvent('secret_wall', walls + 1, 30000), `${holds}: room 4 shows the wall`);
  walls += 1;
  const w = (await runView()).secrets.wall;
  const wl = await last('secret_wall');
  const fx = w.x + Math.sin(wl.yaw) * 2.6;
  const fz = w.z + Math.cos(wl.yaw) * 2.6;
  await cmd('teleport', fx, fz);
  if (first) {
    await sleep(3500);
    const tt = await page.evaluate(() => (window.__echoes.tutorial ? window.__echoes.tutorial().debug() : null));
    await shot('secret-1-wall');
    check(!!tt, `the floor tip state: ${JSON.stringify(tt && { floor: tt.floor ?? null, tip: tt.tip ?? null })}`);
    await shot('secret-2-tip');
  }
  // The bomb.
  await cmd('tonicGive', 0, 'fire_bomb');
  await cmd('teleport', fx, fz);
  await cmd('tonicUse', 0, w.x + Math.sin(wl.yaw) * 0.5, w.z + Math.cos(wl.yaw) * 0.5);
  check(await waitEvent('secret_open', walls, 20000), `${holds}: the bomb breaks the wall open`);
  if (first) {
    await sleep(250);
    await shot('secret-3-breach');
    await sleep(3500);
    await shot('secret-4-open');
  }
  // Clear and walk to the chamber.
  await cmd('clearRoom');
  let v = null;
  for (let i = 0; i < 60; i++) {
    v = await runView();
    if (v.phase === 'secret' || (holds === 'event' && v.phase === 'event' && v.secrets && v.secrets.chamber)) break;
    await closeTip();
    if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(900);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  check(v && v.secrets && v.secrets.chamber && v.secrets.chamber.content === holds, `${holds}: the party stands in the chamber (${v && v.phase} ${JSON.stringify(v && v.secrets)})`);
  await sleep(4000);
  const plate = await page.evaluate(() => (document.querySelector('.hud-loc-name')?.textContent ?? '') + ' / ' + (document.querySelector('.hud-loc-sub')?.textContent ?? ''));
  check(/HIDDEN|VERBORGENE/.test(plate) || !!LANG, `${holds}: the HUD plate (${plate})`);
  await shot(`secret-5-${holds}`);
  if (holds === 'hoard') {
    const p = { x: -1.7, z: -3.0 }; // SECRET_RULES.spotsIn.piles[0][0]
    await cmd('teleport', p.x, p.z);
    await waitEvent('secret_pile', 1, 10000);
    await sleep(700);
    await shot('secret-6-hoard-pile');
    await cmd('secretTake');
  } else if (holds === 'event') {
    await cmd('eventOpen');
    await waitPhase(['encounter'], 30000).catch(() => null);
    await sleep(1500);
    await shot('secret-6-event');
    await cmd('eventChoose', 'leave');
  } else {
    await cmd('teleport', 0, -2.3);
    await sleep(1500);
    for (let i = 0; i < 4 && (await count('secret_take')) < walls; i++) {
      await key('KeyE');
      await sleep(700);
    }
    if ((await count('secret_take')) < walls) await cmd('secretTake');
  }
  if (holds !== 'event') {
    check(await waitEvent('secret_take', walls - (ONLY.slice(0, ONLY.indexOf(holds)).includes('event') ? 1 : 0), 20000), `${holds}: the chamber pays`);
    await sleep(150);
    await shot(`secret-6-${holds}`);
  }
  if (holds === 'relic') {
    v = await waitPhase(['relic'], 30000).catch(() => null);
    const o = v && v.relics && v.relics.offer;
    check(o && o.source === 'secret', `the reliquary's pick is up (${o && o.source})`);
    await sleep(1800);
    await shot('secret-7-relic');
    await cmd('relicChoose', 0);
  }
  first = false;
}
// The end card.
await sleep(1500);
await cmd('endRun', 'defeat');
await waitPhase(['defeat'], 60000).catch(() => null);
await sleep(3000);
const end = await page.evaluate(() => document.querySelector('.rn-end .rn-summary')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
check(/SECRETS FOUND\s*1 \/ 1|GEHEIMNISSE GEFUNDEN\s*1 \/ 1/.test(end), `the end card counts the secret (${end.slice(0, 220)})`);
await shot('secret-8-end');
// The Journal.
if (ONLY.includes('lore')) {
  await cmd('returnToCamp');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(4000);
  let open = false;
  for (let i = 0; i < 6 && !open; i++) {
    await key('KeyJ');
    open = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (!open) {
      await page.keyboard.press('Escape');
      await sleep(3000);
    }
  }
  check(open, 'J opens the Journal');
  for (let i = 0; i < 6; i++) {
    const tab = await page.evaluate(() => document.querySelector('.st-story')?.__journal?.().tab);
    if (tab === 'events') break;
    await key('KeyE');
    await sleep(600);
  }
  const page0 = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.jr-tile[data-jid^="lore:"]')];
    const seen = b.find((x) => !x.classList.contains('jr-unseen'));
    if (seen) seen.click();
    return { tiles: b.length, seen: seen ? seen.dataset.jid : null };
  });
  await sleep(1500);
  const det = await page.evaluate(() => document.querySelector('.jr-events .jr-detail')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
  check(page0.tiles === 10 && !!page0.seen && !/\?\?\?/.test(det), `the Journal holds the lore page (${JSON.stringify(page0)} ${det.slice(0, 160)})`);
  await shot('secret-9-journal');
}

if (LANG && LANG !== 'en') {
  const m = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
  check(m.length === 0, `no untranslated lines (${m.slice(0, 5).join(' | ')})`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
