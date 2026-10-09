#!/usr/bin/env node
// CHAMPION ROOMS in the real game (docs/CHAMPIONS.md): against `npm run dev`
// (port 5199), walks a Level I campaign through the real pages with the crown
// door forced onto the room-2 screen, then each later land's champion, and
// captures (into --shots, default captures/):
//   champion-1-door        the crown door, its glyph and its note
//   champion-2-tip         the first-crown-door tip
//   champion-3-entrance    the Briar Knight arrives (crown, sigil, plate)
//   champion-4-tell        one of its moves winding up
//   champion-5-rage        below half health: the rage aura, ENRAGED plate
//   champion-6-fall        it falls; the chest rises where it stood
//   champion-7-chest       the chest's greater relic pick
//   champion-8-<kind>      the Sluice Warden, Bone Reeve, Hollow Choir in
//                          their lands, winding up a move
//   champion-9-journal     the Journal's Champions row
// It fails on a page error, a crown door without its glyph or note, a room
// without its champion, a banner that does not name it, no rage, no chest
// or a chest pick that is not rare or legendary.
//
//   node tools/champions-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
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

// --------------------------------------------------------- Level I, all --
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
let { side } = await enterCrown('Level I');
const tip = await tipAtDoors('champion', 'champion-2-tip');
check(tip === 'champion', `the first-crown-door tip shows on the doors (${tip})`);
await sleep(800);
const door = await page.evaluate(() => ({
  glyphs: [...document.querySelectorAll('.rn-path .rn-gwin')].map((e) => e.textContent),
  crown: [...document.querySelectorAll('.rn-path .rn-door')].map((d) => d.classList.contains('ch-door')),
  note: (document.querySelector('.rn-path .ch-note') || {}).textContent ?? '',
  noteShown: !!document.querySelector('.rn-path .ch-note') && getComputedStyle(document.querySelector('.rn-path .ch-note')).display !== 'none',
}));
check(door.glyphs[side] === '♛' && door.crown[side] && !door.crown[1 - side], `the crown door wears the crown (${door.glyphs.join(' ')})`);
check(door.noteShown && door.note.length > 20, `the crown note names the champion (${door.note})`);
await shot('champion-1-door');
let c = await walkIn(side);
check(!!c && c.kind === 'briar_knight', `the Briar Knight stands in the room (${c && c.kind})`);
await sleep(1500);
let b = await banner();
check(b && b.show && b.mode === 'champion', `the banner shows the champion (${b && b.text})`);
await shot('champion-3-entrance');
const told = await waitEvent('champion_tell', 30000);
check(told, 'it winds up a move');
await sleep(250);
await shot('champion-4-tell');
await waitEvent('champion_move', 15000);
check((await seen('champion_move')) > 0, 'the move lands');
// Below half: the rage.
c = await champ();
await cmd('setHp', c.id, 0.45);
check(await waitEvent('champion_rage', 15000), 'below half health it rages');
await sleep(1600);
b = await banner();
check(b && b.mode === 'champion' && (await champ()).rage, `the plate says it rages (${b && b.text})`);
await shot('champion-5-rage');
// It falls; the chest rises.
await cmd('setHp', c.id, 0);
check(await waitEvent('champion_fall', 15000), 'it falls');
await sleep(1500);
const fx = await page.evaluate(() => (window.__echoes.render && window.__echoes.render().enemies ? window.__echoes.render().enemies.debugState?.().champions ?? null : null)).catch(() => null);
console.log('champion fx', JSON.stringify(fx));
b = await banner();
check(b && /·/.test(b.text), `the plate says it fell (${b && b.text})`);
await shot('champion-6-fall');
// Clear the room: the draft, then the chest's greater pick.
await cmd('killAllEnemies');
await cmd('clearRoom');
let v = runView();
for (let i = 0; i < 30; i++) {
  v = await runView();
  if (v.phase === 'relic') break;
  await closeTip();
  if (v.phase === 'reward') {
    await cmd('draftDecline');
    await sleep(900);
    await closeSocket();
  }
  await sleep(600);
}
check(await seen('champion_chest') > 0, 'the chest opens');
const offer = v.relics && v.relics.offer;
check(v.phase === 'relic' && offer && offer.source === 'champion', `the chest's pick is up (${v.phase} ${offer && offer.source})`);
check(offer && offer.choices.every((x) => x.rarity === 'rare' || x.rarity === 'legendary'), `every choice is rare or legendary (${offer && offer.choices.map((x) => x.rarity)})`);
await sleep(1800);
await shot('champion-7-chest');
await cmd('relicChoose', 0);
await sleep(800);

// --------------------------------------------- the other lands' champions --
for (const [level, kind] of [[2, 'sluice_warden'], [3, 'bone_reeve'], [4, 'hollow_choir']]) {
  await cmd('endRun', 'defeat').catch(() => null);
  await sleep(1200);
  await cmd('returnToCamp').catch(() => null);
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(2000);
  await cmd('startCampaign', { level });
  await waitPhase(['combat']);
  ({ side } = await enterCrown(`Level ${level}`));
  await closeTip();
  c = await walkIn(side);
  check(!!c && c.kind === kind, `Level ${level}: ${kind} stands in the room (${c && c.kind})`);
  await arm();
  check(await waitEvent('champion_tell', 30000), `${kind} winds up a move`);
  await sleep(250);
  await shot(`champion-8-${kind}`);
  await waitEvent('champion_move', 15000);
  check((await seen('champion_move')) > 0, `${kind}'s move lands`);
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
const secs = await page.evaluate(() => [...document.querySelectorAll('.jr-sec')].map((e) => e.textContent));
check(secs.length >= 6, `the bestiary has a Champions row (${secs.join(' | ')})`);
await page.evaluate(() => {
  const b = document.querySelector('.jr-tile[data-jid="enemy:briar_knight"]');
  if (b) b.click();
  if (b) b.scrollIntoView({ block: 'center' });
});
await sleep(6000);
const d = await dbg();
check(d && /16/.test(d.page ? d.page.detail : ''), `the Briar Knight's page reads (${d && d.page && d.page.detail.slice(0, 90)})`);
await shot('champion-9-journal');
await page.evaluate(() => {
  const b = document.querySelector('.jr-tile[data-jid="enemy:hollow_choir"]');
  if (b) b.click();
});
await sleep(6000);
const d2 = await dbg();
check(d2 && /15/.test(d2.page ? d2.page.detail : ''), `the Hollow Choir's page reads (${d2 && d2.page && d2.page.detail.slice(0, 60)})`);
await shot('champion-9-journal-choir');

if (LANG && LANG !== 'en') {
  const m = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
  check(m.length === 0, `no untranslated lines (${m.slice(0, 5).join(' | ')})`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
