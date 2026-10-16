#!/usr/bin/env node
// THE BELL ABBESS in the real game (content plan 5 slice 2, docs/CHAMPIONS.md
// "The Bell Abbess"; built on tools/second-champions-browser.mjs): against
// `npm run dev` (port 5199), forces her at Level V's crown door, walks in
// through the real pages and captures (into --shots, default captures/):
//   sc-<kind>-1-entrance     it arrives (crown, sigil, plate)
//   sc-<kind>-2-<move>       each of its two moves winding up (Rope Swing:
//                            the crouch, then -ride mid-swing)...
//   sc-<kind>-3-<move>-hit   ...and landing
//   sc-<kind>-4-rage         below half health
//   sc-<kind>-5-fall         it falls; the chest rises
//   sc-journal-<kind>        its Journal page
// It fails on a page error, a room without the forced champion, a banner
// that does not name it, a move that never winds up or lands, no rage, no
// fall, or a Journal page that does not read.
//
//   node tools/spire-second-champion-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
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

await page.goto(`${URL0}?seed=5&tips=1&story=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function key(code) {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
}
const banner = () => page.evaluate(() => {
  const b = document.getElementById('hud-banner');
  return b ? { text: b.textContent.trim(), show: b.classList.contains('show'), mode: b.dataset.mode ?? null } : null;
});
const champ = () => page.evaluate(() => {
  const st = window.__echoes.state();
  const c = st.room && st.room.champion;
  if (!c || c.id == null) return null;
  const e = (st.enemies || []).find((x) => x.id === c.id);
  return { ...c, x: e ? e.x : null, z: e ? e.z : null };
});
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
async function tipAtDoors(want, shotName) {
  for (let i = 0; i < 20; i++) {
    const tp = await page.evaluate(() => window.__echoes.tutorial().debug().tip);
    if (tp === want) {
      await sleep(1800);
      if (shotName) await shot(shotName);
      await closeTip();
      return tp;
    }
    if (tp) await closeTip();
    await sleep(300);
  }
  return null;
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
    await closeTip();
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(900);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  return runView();
}
// Events seen since the last arm (a software-GL page paints about once a
// second, so beats are caught on their events, not by polling state).
await page.evaluate(() => {
  window.__ch = [];
  for (const type of ['champion_spawn', 'champion_tell', 'champion_move', 'champion_rage', 'champion_fall', 'champion_chest'])
    window.__echoes.on(type, (ev) => window.__ch.push({ type, ...ev }));
});
const seen = (type) => page.evaluate((t) => window.__ch.filter((e) => e.type === t).length, type);
const arm = () => page.evaluate(() => { window.__ch.length = 0; });
async function waitEvent(type, timeout = 60000) {
  return page.waitForFunction((t) => window.__ch.some((e) => e.type === t), { timeout, polling: 100 }, type).then(() => true).catch(() => false);
}
// Walk to the crown door and through it; returns the champion once it stands.
async function enterCrown(label) {
  await cmd('crownDoor', 1);
  const v = await toPath();
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.champion) : -1;
  check(side >= 0, `${label}: the doors carry the crown door (asked for the right; a cursed door there moves it) (${v.path && JSON.stringify(v.path.options)})`);
  return { v, side };
}
async function walkIn(side) {
  await arm();
  await cmd('pathChoose', side);
  const v = await waitPhase(['combat']);
  check(v.mode === 'champion', `the room is the champion's (${v.mode})`);
  await waitEvent('champion_spawn');
  await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.champion && r.champion.spawned); }, { timeout: 60000, polling: 250 });
  const c = await champ();
  // The party a few steps in front of it, so the camera frames both.
  if (c && c.x != null) await cmd('teleport', c.x, c.z + 2.6);
  return c;
}

const ONLY = opt('only', null);
const KINDS = [
  [5, 'bell_abbess', 'Bell Abbess', ['rope_swing', 'vesper_peal']],
].filter((k) => !ONLY || ONLY.split(',').includes(k[1]));
const waitMove = (type, move, timeout) =>
  page.waitForFunction((t, m) => window.__ch.some((e) => e.type === t && e.move === m), { timeout, polling: 60 }, type, move).then(() => true).catch(() => false);
// Keep the party near it so both moves come (one hero far for the leaps,
// hooks and lashes; the rest close for the cones and rings).
async function stage(c, move) {
  if (!c || c.x == null) return;
  const far = move === 'rope_swing';
  await cmd('teleport', c.x, c.z + (far ? 4.6 : 1.8));
}

let first = true;
for (const [level, kind, name, moves] of KINDS) {
  if (!first) {
    await cmd('endRun', 'defeat').catch(() => null);
    await sleep(1200);
    await cmd('returnToCamp').catch(() => null);
    await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
    await sleep(2000);
  }
  first = false;
  await cmd('startCampaign', { level });
  await waitPhase(['combat']);
  const forced = await cmd('championPick', kind);
  check(forced === kind, `Level ${level}: the crown is forced to the ${name} (${forced})`);
  const { side } = await enterCrown(`Level ${level}`);
  await closeTip();
  await arm();
  let c = await walkIn(side);
  check(!!c && c.kind === kind, `Level ${level}: the ${name} stands in the room (${c && c.kind})`);
  await sleep(1400);
  const b = await banner();
  check(b && b.show && b.mode === 'champion' && b.text.length > 3, `the banner names it (${b && b.text})`);
  await shot(`sc-${kind}-1-entrance`);
  for (const move of moves) {
    let told = false;
    for (let round = 0; round < 6 && !told; round++) {
      c = await champ();
      await stage(c, move);
      told = await waitMove('champion_tell', move, 12000);
    }
    check(told, `${name}: ${move} winds up`);
    await sleep(350);
    await shot(`sc-${kind}-2-${move}`);
    if (move === 'rope_swing') {
      await sleep(420);
      await shot(`sc-${kind}-2-${move}-ride`);
    }
    const landed = await waitMove('champion_move', move, 15000);
    check(landed, `${name}: ${move} lands`);
    await sleep(120);
    await shot(`sc-${kind}-3-${move}-hit`);
    await sleep(1200);
  }
  c = await champ();
  await cmd('setHp', c.id, 0.45);
  check(await waitEvent('champion_rage', 15000), `${name}: below half health it rages`);
  await sleep(1500);
  await shot(`sc-${kind}-4-rage`);
  await cmd('setHp', c.id, 0);
  check(await waitEvent('champion_fall', 15000), `${name}: it falls`);
  await sleep(1500);
  await shot(`sc-${kind}-5-fall`);
}

// -------------------------------------------------------------- journal --
await cmd('endRun', 'defeat').catch(() => null);
await sleep(1200);
await cmd('returnToCamp').catch(() => null);
await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
await sleep(4000);
let opened = false;
for (let i = 0; i < 6 && !opened; i++) {
  await key('KeyJ');
  opened = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
  if (!opened) {
    await page.keyboard.press('Escape');
    await sleep(3000);
  }
}
check(opened, 'J opens the Journal');
const dbg = () => page.evaluate(() => { const s = document.querySelector('.st-story'); return s && s.__journal ? s.__journal() : null; });
for (let i = 0; i < 6; i++) {
  const d = await dbg();
  if (d && d.tab === 'bestiary') break;
  await key('KeyE');
  await sleep(500);
}
const tiles = await page.evaluate(() => [...document.querySelectorAll('.jr-tile')].map((e) => e.dataset.jid).filter((j) => /bell_abbess|gale_herald/.test(j)));
check(tiles.length === 2, `the bestiary lists both Spire champions (${tiles.join(' ')})`);
for (const [, kind, name] of KINDS) {
  await page.evaluate((k) => {
    const b = document.querySelector(`.jr-tile[data-jid="enemy:${k}"]`);
    if (b) b.click();
    if (b) b.scrollIntoView({ block: 'center' });
  }, kind);
  await sleep(6000);
  const d = await dbg();
  check(d && d.page && d.page.detail && d.page.detail.length > 40, `the ${name}'s page reads (${d && d.page && d.page.detail.slice(0, 70)})`);
  await shot(`sc-journal-${kind}`);
}

if (LANG && LANG !== 'en') {
  const m = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
  check(m.length === 0, `no untranslated lines (${m.slice(0, 5).join(' | ')})`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
