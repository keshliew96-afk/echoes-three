#!/usr/bin/env node
// ROOM OBJECTIVES in the real game (docs/ROOM_OBJECTIVES.md): against
// `npm run dev` (port 5199), plays a Level 1 campaign through the real pages
// with room 2 forced to a hunt and room 3 to a purge, and captures:
//   captures/objective-door-hunt.png     the doors before the hunt (glyph + legend)
//   captures/objective-tip-hunt.png      the first-hunt tip on those doors
//   captures/objective-hunt.png          the quarry running, marked, HUD timer
//   captures/objective-hunt-winded.png   the quarry winded
//   captures/objective-purge.png         the three nests and the HUD pips
//   captures/objective-purge-spawn.png   a nest spawning
//   captures/objective-purge-wounded.png two nests down, one wounded
// ESCORT AND HOLD (content plan 3 slice 7), the next two rooms (4 and 5; 2
// and 3 with --legs eh):
//   captures/objective-door-escort.png    the doors before the escort (⚑)
//   captures/objective-tip-escort.png     the first-escort tip
//   captures/objective-escort.png         the pilgrim on its road, the waypost
//   captures/objective-escort-wait.png    left alone: it waits and calls
//   captures/objective-escort-arrive.png  it reaches the waypost
//   captures/objective-door-hold.png      the doors before the hold (◎)
//   captures/objective-tip-hold.png       the first-hold tip
//   captures/objective-hold.png           the lit sigil ring, the rifts, the clock
//   captures/objective-hold-empty.png     the ring left empty, fading
//   captures/objective-hold-surge.png     the surge
//   captures/objective-hold-sealed.png    held to the end
// It fails on a page error, a door without its glyph, a room without its
// quarry, nests, pilgrim or ring, or a banner that does not name the objective.
//
//   node tools/objectives-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--legs all|eh]
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
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
const LEGS = opt('legs', 'all');
const HP = LEGS !== 'eh'; // the hunt and purge legs
// Escort and hold take rooms 2 and 3 of a fresh Level I run (rooms 5 and 6
// of the first run can both be defend rooms).
let RE = 2; // the escort's room (the first room that is not a defend room)
let RH = 3; // the hold's room (the next one)
mkdirSync('captures', { recursive: true });

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

await page.goto(`${URL0}?seed=5&tips=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
// Through any rooms in between (a defend room) to the doors into mode `m`.
async function toDoorsOf(m) {
  let v = await toPath();
  for (let i = 0; i < 4 && v.phase === 'path' && !v.path.options.some((o) => o.win === m); i++) {
    await cmd('pathChoose', 0);
    await waitPhase(['combat']);
    v = await toPath();
  }
  return v;
}
const room = () => page.evaluate(() => window.__echoes.state().room ?? null);
const banner = () => page.evaluate(() => {
  const b = document.getElementById('hud-banner');
  return b ? { text: b.textContent.trim(), show: b.classList.contains('show'), mode: b.dataset.mode ?? null } : null;
});
// The quarry / the nests as the state lists them (enemies + the room view).
const entities = (kind) =>
  page.evaluate((k) => {
    const st = window.__echoes.state();
    const r = st.room || {};
    const ids = k === 'quarry' ? (r.quarry && r.quarry.id != null ? [r.quarry.id] : []) : (r.nests || []).filter((n) => n.alive).map((n) => n.id);
    return (st.enemies || []).filter((e) => ids.includes(e.id)).map((e) => ({ ...e, maxHp: k === 'nest' ? (r.nests.find((n) => n.id === e.id) || {}).maxHp : r.quarry.maxHp }));
  }, kind);
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
// On the doors: close any other tip (a cursed door's) until `want` shows.
async function tipAtDoors(want, shotName) {
  for (let i = 0; i < 20; i++) {
    const tp = await page.evaluate(() => window.__echoes.tutorial().debug().tip);
    if (tp === want) {
      await sleep(1800); // a software-GL page paints about once a second
      if (shotName) await page.screenshot({ path: `captures/${shotName}${sfx}.png` });
      await closeTip();
      return tp;
    }
    if (tp) await closeTip();
    await sleep(300);
  }
  return null;
}
// The door into the objective room (a "?" door may sit beside it).
const doorOf = (v, m) => Math.max(0, v.path.options.findIndex((o) => o.win === m));
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

// The winded beat is 1.4 s of sim time: catch it on its event, not by polling.
await page.evaluate(() => { window.__winded = 0; window.__echoes.on('quarry_winded', () => { window.__winded += 1; }); });
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
if (HP) check(!!(await cmd('objectiveRoom', 'hunt', 2)), 'room 2 forced to a hunt');
if (HP) check(!!(await cmd('objectiveRoom', 'purge', 3)), 'room 3 forced to a purge');
async function forceEscortHold() {
  // The first two later rooms that are not defend rooms (objectiveRoom
  // refuses those).
  const force = async (m, from) => {
    for (let n = from; n <= 6; n++) if (await cmd('objectiveRoom', m, n)) return n;
    return 0;
  };
  RE = await force('escort', (await runView()).room + 1);
  check(RE > 0, `room ${RE} forced to an escort`);
  RH = await force('hold', RE + 1);
  check(RH > 0, `room ${RH} forced to a hold`);
}
if (!HP) await forceEscortHold();
let v = null;
let b = null;
if (HP) {
// ------------------------------------------------------------------ hunt --
v = await toPath();
check(v.phase === 'path' && v.path.options.some((o) => o.win === 'hunt') && v.path.options.every((o) => o.win === 'hunt' || o.event), `the doors lead to the hunt (${v.path && v.path.options.map((o) => o.win)})`);
const tip = await tipAtDoors('hunt', 'objective-tip-hunt');
check(tip === 'hunt', `the first-hunt tip shows on the doors (${tip})`);
await sleep(600);
const door = await page.evaluate(() => ({
  glyphs: [...document.querySelectorAll('.rn-path .rn-gwin')].map((e) => e.textContent),
  legend: (document.querySelector('.rn-path .rn-legend') || {}).textContent ?? '',
}));
check(door.glyphs.includes('➶') && door.glyphs.every((g) => g === '➶' || g === '?'), `the doors wear the hunt glyph (${door.glyphs.join(' ')})`);
await page.screenshot({ path: `captures/objective-door-hunt${sfx}.png` });
await cmd('pathChoose', doorOf(v, 'hunt'));
v = await waitPhase(['combat']);
check(v.mode === 'hunt', `room 2 is a hunt (${v.mode})`);
await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.quarry && r.quarry.spawned); }, { timeout: 60000, polling: 250 });
let q = (await entities('quarry'))[0];
check(!!q, `the quarry broke cover (${q && q.kind})`);
// Stand a few steps off it so the camera frames the chase.
await cmd('teleport', q.x * 0.55, q.z * 0.55);
await sleep(1800);
b = await banner();
check(b && b.show && b.mode === 'hunt', `the banner shows the hunt (${b && b.text})`);
await page.screenshot({ path: `captures/objective-hunt${sfx}.png` });
// Wait for a winded beat (it rests every 5 s of running).
const winded = await page
  .waitForFunction(() => window.__winded > 0, { timeout: 120000, polling: 100 })
  .then(() => true)
  .catch(() => false);
check(winded, 'the quarry stops, winded');
q = (await entities('quarry'))[0];
if (q) await cmd('teleport', q.x * 0.7, q.z * 0.7);
await sleep(250);
await page.screenshot({ path: `captures/objective-hunt-winded${sfx}.png` });
const r1 = await room();
check(r1 && r1.quarry && r1.huntTicksLeft > 0, `the room counts the escape down (${r1 && r1.huntTicksLeft} ticks)`);

// ----------------------------------------------------------------- purge --
v = await toPath();
check(v.phase === 'path' && v.path.options.some((o) => o.win === 'purge') && v.path.options.every((o) => o.win === 'purge' || o.event), `the doors lead to the purge (${v.path && v.path.options.map((o) => o.win)})`);
const tip2 = await tipAtDoors('purge', 'objective-tip-purge');
check(tip2 === 'purge', `the first-purge tip shows on the doors (${tip2})`);
await sleep(600);
await cmd('pathChoose', doorOf(v, 'purge'));
v = await waitPhase(['combat']);
check(v.mode === 'purge', `room 3 is a purge (${v.mode})`);
await sleep(1500);
const nests = await entities('nest');
check(nests.length === 3, `three nests stand (${nests.length})`);
b = await banner();
check(b && b.show && b.mode === 'purge', `the banner shows the purge (${b && b.text})`);
await page.screenshot({ path: `captures/objective-purge${sfx}.png` });
// A nest's spawn: stand by the first nest and wait for its pulse.
await cmd('teleport', nests[0].x * 0.5, nests[0].z * 0.5);
await page
  .waitForFunction(() => (window.__echoes.state().room || {}).pendingSpawns > 0, { timeout: 60000, polling: 100 })
  .catch(() => null);
await sleep(200);
await page.screenshot({ path: `captures/objective-purge-spawn${sfx}.png` });
// Two nests down, the third wounded.
for (const n of nests.slice(0, 2)) await cmd('setHp', n.id, 0);
await cmd('setHp', nests[2].id, 0.35);
const n3 = (await entities('nest'))[0];
await sleep(1500);
const r2 = await room();
check(r2 && r2.nestsAlive === 1, `two nests destroyed (${r2 && r2.nestsAlive} left)`);
if (n3) await cmd('teleport', n3.x * 0.6, n3.z * 0.6);
await sleep(900);
await page.screenshot({ path: `captures/objective-purge-wounded${sfx}.png` });
}

// ---------------------------------------------------------------- escort --
const pilgrim = () => page.evaluate(() => {
  const r = window.__echoes.state().room || {};
  return r.pilgrim ? { ...r.pilgrim } : null;
});
if (HP) {
  // A fresh page and Level I run: the same rooms the --legs eh run uses.
  await page.goto(`${URL0}?seed=5&tips=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await cmd('startCampaign', { level: 1 });
  await waitPhase(['combat']);
  await forceEscortHold();
}
await page.evaluate(() => {
  window.__eh = {};
  for (const t of ['pilgrim_wait', 'pilgrim_walk', 'pilgrim_arrive', 'sigil_fading', 'sigil_relit', 'hold_surge', 'sigil_sealed', 'rift_pulse']) window.__echoes.on(t, () => { window.__eh[t] = (window.__eh[t] || 0) + 1; });
});
v = await toDoorsOf('escort');
check(v.phase === 'path' && v.path.options.some((o) => o.win === 'escort'), `the doors lead to the escort (${v.path && v.path.options.map((o) => o.win)})`);
const tip3 = await tipAtDoors('escort', 'objective-tip-escort');
check(tip3 === 'escort', `the first-escort tip shows on the doors (${tip3})`);
await sleep(600);
const door3 = await page.evaluate(() => [...document.querySelectorAll('.rn-path .rn-gwin')].map((e) => e.textContent));
check(door3.includes('⚑'), `the doors wear the escort glyph (${door3.join(' ')})`);
await page.screenshot({ path: `captures/objective-door-escort${sfx}.png` });
await cmd('pathChoose', doorOf(v, 'escort'));
v = await waitPhase(['combat']);
check(v.mode === 'escort', `room ${RE} is an escort (${v.mode})`);
await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.pilgrim && r.pilgrim.spawned); }, { timeout: 60000, polling: 250 });
// A third of the way along, the party at its side and the waves held off.
await cmd('objectiveDebug', 'road', 0.3);
let pg = await pilgrim();
await cmd('killAllEnemies');
await cmd('teleport', pg.x - 1.3, pg.z + 1.2);
await sleep(2500);
b = await banner();
check(b && b.show && b.mode === 'escort', `the banner shows the escort (${b && b.text})`);
pg = await pilgrim();
check(pg && !pg.waiting && !pg.lost && pg.progress >= 0.29, `the pilgrim is on its road, escorted (${pg && Math.round(pg.progress * 100)}%)`);
const fx1 = await page.evaluate(() => { const f = window.__echoes.content.enemyfx(); return f ? f.escortHold : null; });
check(fx1 && fx1.pilgrim && fx1.waypost && fx1.roadMotes > 4, `the pilgrim, its road and the waypost are drawn (${JSON.stringify(fx1)})`);
await page.screenshot({ path: `captures/objective-escort${sfx}.png` });
// Alone: the AI seats leash to the pilgrim, so they go down (a room clear
// stands them up again) and the hero steps away.
const allyIds = await page.evaluate(() => window.__echoes.state().party.filter((m) => m.kind === 'ally').map((m) => m.id));
for (const id of allyIds) await cmd('setHp', id, 0);
pg = await pilgrim();
const awayX = pg.x > 0 ? pg.x - 5.6 : pg.x + 5.6;
for (let i = 0; i < 16; i++) {
  await cmd('teleport', awayX, pg.z * 0.4);
  await sleep(250);
  if (await page.evaluate(() => (window.__eh.pilgrim_wait || 0) > 0)) break;
}
check(await page.evaluate(() => (window.__eh.pilgrim_wait || 0) > 0), 'left alone, the pilgrim waits');
await cmd('killAllEnemies');
await sleep(1500);
await page.screenshot({ path: `captures/objective-escort-wait${sfx}.png` });
b = await banner();
check(b && /WAIT|WARTET|ESPER|ATTENTE|待|기다|ЖДЁТ|等待/i.test(b.text), `the banner says it waits (${b && b.text})`);
// Near the end, at its side: it arrives.
await cmd('objectiveDebug', 'road', 0.93);
pg = await pilgrim();
await cmd('teleport', pg.x * 0.8, pg.z * 0.8);
const arrived = await page
  .waitForFunction(() => (window.__eh.pilgrim_arrive || 0) > 0, { timeout: 120000, polling: 100 })
  .then(() => true)
  .catch(() => false);
check(arrived, 'the pilgrim reaches the waypost');
await sleep(350);
await page.screenshot({ path: `captures/objective-escort-arrive${sfx}.png` });

// ------------------------------------------------------------------ hold --
v = await toDoorsOf('hold');
check(v.phase === 'path' && v.path.options.some((o) => o.win === 'hold'), `the doors lead to the hold (${v.path && v.path.options.map((o) => o.win)})`);
const tip4 = await tipAtDoors('hold', 'objective-tip-hold');
check(tip4 === 'hold', `the first-hold tip shows on the doors (${tip4})`);
await sleep(600);
const door4 = await page.evaluate(() => [...document.querySelectorAll('.rn-path .rn-gwin')].map((e) => e.textContent));
check(door4.includes('◎'), `the doors wear the hold glyph (${door4.join(' ')})`);
await page.screenshot({ path: `captures/objective-door-hold${sfx}.png` });
await cmd('pathChoose', doorOf(v, 'hold'));
v = await waitPhase(['combat']);
check(v.mode === 'hold', `room ${RH} is a hold (${v.mode})`);
await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.sigil); }, { timeout: 60000, polling: 250 });
let rs = await room();
check(rs.sigil && rs.sigil.lit && rs.rifts.length === 3, `the ring burns and three rifts open (${rs.rifts && rs.rifts.length})`);
const fx0 = await page.evaluate(() => { const f = window.__echoes.content.enemyfx(); return f ? f.escortHold : null; });
check(fx0 && fx0.sigil && fx0.rifts === 3, `the ring and the rifts are drawn (${JSON.stringify(fx0)})`);
await cmd('teleport', rs.sigil.x + 0.6, rs.sigil.z + 0.4);
await page
  .waitForFunction(() => (window.__eh.rift_pulse || 0) > 0, { timeout: 60000, polling: 100 })
  .catch(() => null);
await sleep(1200);
b = await banner();
check(b && b.show && b.mode === 'hold', `the banner shows the hold (${b && b.text})`);
await page.screenshot({ path: `captures/objective-hold${sfx}.png` });
// Empty: the AI seats (leashed to the ring) go down and the hero steps out.
const allyIds2 = await page.evaluate(() => window.__echoes.state().party.filter((m) => m.kind === 'ally').map((m) => m.id));
for (const id of allyIds2) await cmd('setHp', id, 0);
const ox = rs.sigil.x + (rs.sigil.x > 0 ? -5.2 : 5.2);
for (let i = 0; i < 12; i++) {
  await cmd('teleport', ox, rs.sigil.z + 1.5);
  await sleep(200);
  if (await page.evaluate(() => (window.__eh.sigil_fading || 0) > 0)) break;
}
await sleep(900);
rs = await room();
check(rs.sigil.empty && rs.sigil.fade > 0 && !rs.softFailed, `left empty, the ring fades (${rs.sigil.fade})`);
await page.screenshot({ path: `captures/objective-hold-empty${sfx}.png` });
await cmd('teleport', rs.sigil.x, rs.sigil.z);
await page
  .waitForFunction(() => (window.__eh.sigil_relit || 0) > 0, { timeout: 30000, polling: 100 })
  .catch(() => null);
check(await page.evaluate(() => (window.__eh.sigil_relit || 0) > 0), 'stepping back in relights it');
// The surge, then the seal.
await cmd('objectiveDebug', 'clock', 19 * 60);
await page
  .waitForFunction(() => (window.__eh.hold_surge || 0) > 0, { timeout: 30000, polling: 100 })
  .catch(() => null);
check(await page.evaluate(() => (window.__eh.hold_surge || 0) > 0), 'the surge comes in the last stretch');
await cmd('teleport', rs.sigil.x + 0.5, rs.sigil.z + 0.5);
await sleep(1200);
await page.screenshot({ path: `captures/objective-hold-surge${sfx}.png` });
await cmd('objectiveDebug', 'clock', 30);
const sealed = await page
  .waitForFunction(() => (window.__eh.sigil_sealed || 0) > 0, { timeout: 60000, polling: 100 })
  .then(() => true)
  .catch(() => false);
check(sealed, 'held to the end, the ring is sealed');
await sleep(300);
await page.screenshot({ path: `captures/objective-hold-sealed${sfx}.png` });
const fx2 = await page.evaluate(() => { const f = window.__echoes.content.enemyfx(); return f ? f.escortHold : null; });
check(fx2 && fx2.sigil && fx2.sigil.sealed, `the sealed ring is drawn (${JSON.stringify(fx2)})`);

const misses = LANG ? await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : [])) : [];
check(!LANG || misses.length === 0, `no untranslated lines (${(misses || []).slice(0, 4).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(JSON.stringify({ probe: 'objectives-browser', ok: fails.length === 0, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
