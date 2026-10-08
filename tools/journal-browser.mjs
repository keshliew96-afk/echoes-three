#!/usr/bin/env node
// THE JOURNAL in the real game (docs/JOURNAL.md, content plan 2 slice 9):
// against `npm run dev` (port 5199), on a fresh profile, checks and captures:
//   journal-1-empty     J opens the Journal on the Story page; Q / E turn to
//                       the Bestiary, every entry a silhouette (0 met)
//   journal-2-bestiary  after a Level I run (a room, an event room, the
//                       boss): the met enemies and the Stag have names,
//                       lore, attacks and kill counts, and a turning model
//   journal-3-boss      the Hollow Stag's page
//   journal-4-relics    the relic taken in the run (Taken 1 time)
//   journal-5-events    the event room entered (Visited 1 time)
//   journal-6-deeds     the deeds page (First Light done)
// It fails on a page error, a missing piece, or (with --lang) a missing
// translation on these screens.
//
//   node tools/journal-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
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
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack.slice(0, 400) : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });

await page.goto(`${URL0}?seed=3&story=0&tutorial=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const profile = () => page.evaluate(() => window.__echoes.save.profile());
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function key(code) {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
}
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
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
async function openJournal() {
  for (let i = 0; i < 6; i++) {
    await key('KeyJ');
    const ok = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (ok) return true;
    await page.keyboard.press('Escape'); // a card or the pause menu in the way
    await sleep(3000);
  }
  return false;
}
const dbg = () => page.evaluate(() => {
  const s = document.querySelector('.st-story');
  return s && s.__journal ? s.__journal() : null;
});
async function toTab(id) {
  for (let i = 0; i < 6; i++) {
    const d = await dbg();
    if (d && d.tab === id) return d;
    await key('KeyE');
    await sleep(500);
  }
  return dbg();
}
async function pick(jid) {
  await page.evaluate((j) => {
    const b = document.querySelector(`.jr-tile[data-jid="${j}"]`);
    if (b) b.click();
  }, jid);
  await sleep(1500);
  return dbg();
}
const misses = async () => (LANG && LANG !== 'en' ? page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : [])) : []);

// 1 — a fresh profile: the Journal opens on the story, the bestiary is dark.
{
  await sleep(2500);
  check(await openJournal(), 'J opens the Journal');
  await sleep(800);
  let d = await dbg();
  check(d && d.tab === 'story', `it opens on the Story page (${d && d.tab})`);
  const tabs = await page.evaluate(() => document.querySelectorAll('.st-story .st-tab').length);
  check(tabs === 5, `five pages: Story, Bestiary, Relics, Events, Deeds (${tabs})`);
  d = await toTab('bestiary');
  check(d && d.tab === 'bestiary', 'E turns to the Bestiary');
  await sleep(3000);
  d = await dbg();
  const pg = d && d.page;
  check(pg && pg.tiles === 29 && pg.unseen === 29, `29 entries, all unmet (${pg && pg.tiles} / ${pg && pg.unseen})`);
  check(pg && pg.viewer && pg.viewer.rigs.length > 0 && pg.viewer.rigs.every((r) => r.ok), `the model viewer builds its rigs (${pg && pg.viewer && JSON.stringify(pg.viewer.rigs.filter((r) => !r.ok))})`);
  check(pg && /\?\?\?/.test(pg.detail), 'an unmet entry has no name');
  console.log('viewer', JSON.stringify(pg && pg.viewer));
  await shot('journal-1-empty');
  await key('KeyQ');
  await sleep(400);
  d = await dbg();
  check(d && d.tab === 'story', 'Q turns back');
  await page.keyboard.press('Escape');
  await sleep(800);
  check(!(await page.evaluate(() => !!document.querySelector('.st-story'))), 'Esc closes the Journal');
}

// 2 — a Level I run: room 1, an event room, a relic, the Stag.
let relicTaken = null;
let eventSeen = null;
{
  await cmd('startCampaign', { level: 1, boss: 'stag', depart: false });
  await waitPhase(['combat']);
  await cmd('eventDoor', 'healing_spring', 1);
  // bring the first wave in and fell it, so the room's enemies are met and counted
  await cmd('startWave');
  await sleep(6000);
  const felled = await cmd('killAllEnemies');
  check(felled > 0, `the first wave arrives and is felled (${felled})`);
  await sleep(1000);
  let v = await toPath();
  for (let g = 0; g < 3 && v.phase === 'path' && !v.path.options.some((o) => o.event); g++) {
    await cmd('pathChoose', 0);
    await waitPhase(['combat'], 60000).catch(() => null);
    await sleep(2500);
    v = await toPath();
  }
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.event) : -1;
  if (check(side >= 0, 'the doors carry a "?" door')) {
    await sleep(900);
    await cmd('pathChoose', side);
    await waitPhase(['event']);
    eventSeen = 'healing_spring';
    await cmd('teleport', 1.2, -2.6);
    await sleep(500);
    await key('KeyE');
    await waitPhase(['encounter'], 60000).catch(() => null);
    await sleep(800);
    await cmd('eventChoose', 'take');
    await sleep(1500);
  }
  await cmd('relicGrant', 'whetstone').catch(() => null);
  await cmd('skipToRoom', 8).catch(() => null);
  await sleep(4000);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 60000, polling: 250 }).catch(() => null);
  await sleep(3000);
  await cmd('killBoss');
  await sleep(1500);
  // End the run the way a player does, so the run is recorded and awarded.
  await sleep(2500);
  await cmd('endRun', 'defeat');
  await sleep(1500);
  await cmd('returnToCamp');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(4000);
  const p = await profile();
  const j = p && p.journal && p.journal.seen;
  console.log('journal', JSON.stringify(j));
  relicTaken = j && Object.keys(j.relic || {}).find((k) => j.relic[k] > 0);
  const kills = j ? Object.values(j.enemy || {}).reduce((a, b) => a + b, 0) : 0;
  check(j && Object.keys(j.enemy || {}).length > 0 && kills > 0, `the run's enemies are in the profile journal (${j && JSON.stringify(j.enemy)})`);
  check(j && (j.boss || {}).stag > 0, `the Stag is met and felled (${j && JSON.stringify(j.boss)})`);
  check(j && eventSeen && (j.event || {})[eventSeen] === 1, `the event room is recorded once (${j && JSON.stringify(j.event)})`);
}

// 3 — the Journal after the run.
{
  check(await openJournal(), 'J opens the Journal again');
  let d = await toTab('bestiary');
  await sleep(4000);
  d = await dbg();
  const met = d.journal.bestiary.filter((r) => r.seen);
  check(met.length >= 3, `the bestiary shows the met enemies (${met.map((r) => r.id).join(', ')})`);
  const firstEnemy = met.find((r) => !r.boss && r.count > 0);
  if (firstEnemy) {
    d = await pick(`enemy:${firstEnemy.id}`);
    check(!/\?\?\?/.test(d.page.detail) && /\d/.test(d.page.detail), `a met enemy shows its name, lore, attacks and count (${d.page.detail.slice(0, 140)})`);
    check(d.page.viewer && d.page.viewer.shown === firstEnemy.id, 'its model turns in the viewer');
    await sleep(1200);
    await shot('journal-2-bestiary');
  }
  d = await pick('boss:stag');
  check(d.page.selected === 'boss:stag' && !/\?\?\?/.test(d.page.detail), 'the Hollow Stag has its page');
  await sleep(1200);
  await shot('journal-3-boss');
  d = await toTab('relics');
  await sleep(800);
  if (relicTaken) {
    d = await pick(`relic:${relicTaken}`);
    check(!/\?\?\?/.test(d.page.detail), `the relic taken has its page (${relicTaken})`);
  } else check(false, 'a relic was taken in the run');
  await shot('journal-4-relics');
  d = await toTab('events');
  await sleep(800);
  if (eventSeen) {
    d = await pick(`event:${eventSeen}`);
    check(!/\?\?\?/.test(d.page.detail), `the event room has its page (${d.page.detail.slice(0, 120)})`);
  }
  await shot('journal-5-events');
  d = await toTab('deeds');
  await sleep(800);
  check(d.page && d.page.rows === 18 && d.page.done >= 1, `the deeds page lists every deed, First Light done (${d.page && d.page.done}/${d.page && d.page.rows})`);
  await shot('journal-6-deeds');
  await page.keyboard.press('Escape');
  await sleep(600);
}

const m = await misses();
if (LANG && LANG !== 'en') check(m.length === 0, `no missing ${LANG} lines (${m.slice(0, 8).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
await browser.close();
process.exit(fails.length ? 1 : 0);
