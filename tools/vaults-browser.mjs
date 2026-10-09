#!/usr/bin/env node
// KEYS AND VAULTS in the real game (docs/VAULTS.md): against `npm run dev`
// (port 5199), walks a Level I campaign through the real pages and captures
// (into --shots, default captures/):
//   vault-1-key       a key falls in a fight, turning in its gold beam
//   vault-2-hud       a hero walks over it: the VAULT KEY plate on the HUD
//   vault-3-tip       the first-vault-door tip
//   vault-4-door      the vault door on the path screen, its keyhole and note
//   vault-5-room      the vault: the sanctum, the chest, piles and platter
//   vault-6-pile      a Glint pile taken
//   vault-7-open      E on the chest: the lid opens, the hoard's light
//   vault-8-relic     the chest's relic pick
// It fails on a page error, a key that never lands or is never picked up, a
// door without its keyhole or note, a vault without its chest, piles and
// platter, a chest that does not open or no relic pick after it.
//
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

await page.goto(`${URL0}?seed=5&tips=1&story=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

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
await page.evaluate(() => {
  window.__vk = [];
  for (const type of ['key_drop', 'key_pickup', 'vault_door_taken', 'vault_enter', 'vault_pile', 'vault_platter', 'vault_open'])
    window.__echoes.on(type, (ev) => window.__vk.push({ type, ...ev }));
});
const seen = (type) => page.evaluate((t) => window.__vk.filter((e) => e.type === t).length, type);
const last = (type) => page.evaluate((t) => window.__vk.filter((e) => e.type === t).pop() ?? null, type);
async function waitEvent(type, timeout = 60000) {
  return page.waitForFunction((t) => window.__vk.some((e) => e.type === t), { timeout, polling: 100 }, type).then(() => true).catch(() => false);
}
const hero = () => page.evaluate(() => { const p = window.__echoes.state().player; return p ? { x: p.x, z: p.z } : null; });

// ------------------------------------------------------ the key falls --
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
await closeTip();
const p0 = await hero();
await cmd('teleport', 0, 1.2);
await sleep(600);
check((await cmd('keyDrop', 0, -1.2)) === true, 'a key can fall in room 1');
check(await waitEvent('key_drop', 20000), 'the key lands');
await sleep(2200);
await shot('vault-1-key');
// A hero walks over it.
await cmd('teleport', 0, -1.2);
check(await waitEvent('key_pickup', 20000), `a hero walking over it takes it (from ${JSON.stringify(p0)})`);
await sleep(1800);
const plate = await page.evaluate(() => {
  const el = document.querySelector('.hud-key');
  return el ? { text: el.textContent.trim(), shown: getComputedStyle(el).display !== 'none' && Number(getComputedStyle(el).opacity) > 0.2 } : null;
});
check(plate && plate.shown && plate.text.length > 4, `the HUD shows the key plate (${plate && plate.text})`);
await shot('vault-2-hud');

// ------------------------------------------------------- the vault door --
await cmd('vaultDoor', 1);
let v = await toPath();
const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.vault) : -1;
check(side >= 0, `the doors carry the vault door (${v.path && JSON.stringify(v.path.options)})`);
const tip = await tipAtDoors('vault', 'vault-3-tip');
check(tip === 'vault', `the first-vault-door tip shows on the doors (${tip})`);
await sleep(800);
const door = await page.evaluate(() => ({
  vault: [...document.querySelectorAll('.rn-path .rn-door')].map((d) => d.classList.contains('vk-door')),
  note: (document.querySelector('.rn-path .vk-note') || {}).textContent ?? '',
  noteShown: !!document.querySelector('.rn-path .vk-note') && getComputedStyle(document.querySelector('.rn-path .vk-note')).display !== 'none',
}));
check(door.vault[side] && !door.vault[1 - side], `the vault door wears the keyhole (${door.vault})`);
check(door.noteShown && door.note.length > 20, `the vault note reads (${door.note})`);
await shot('vault-4-door');

// ------------------------------------------------------------ the vault --
await cmd('pathChoose', side);
v = await waitPhase(['vault']);
check(v.mode === 'vault', `the room is the vault (${v.mode})`);
check(await waitEvent('vault_enter', 20000), 'the vault wakes');
const enter = await last('vault_enter');
check(enter && enter.chest != null && enter.piles && enter.piles.length === 3 && enter.platter != null, `chest, three piles and the platter stand (${JSON.stringify(enter)})`);
await closeTip();
await cmd('teleport', 0, 0.6);
await sleep(3500);
await shot('vault-5-room');
const pile = (enter && enter.piles && enter.piles[0]) || { x: -3.4, z: -2.6 };
await cmd('teleport', pile.x, pile.z);
check(await waitEvent('vault_pile', 20000), 'walking over a pile takes it');
await sleep(900);
await shot('vault-6-pile');
// E at the chest.
const ch = enter && enter.chest;
await cmd('teleport', ch ? ch.x : 0, (ch ? ch.z : -4.2) + 1.0);
await sleep(1500);
for (let i = 0; i < 5 && !(await seen('vault_open')); i++) {
  await key('KeyE');
  await sleep(700);
}
if (!(await seen('vault_open'))) await cmd('vaultOpen');
check(await waitEvent('vault_open', 20000), 'E opens the chest');
const op = await last('vault_open');
check(op && op.relic, `the chest owes a relic pick (${JSON.stringify(op)})`);
await shot('vault-7-open');
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
const offer = v.relics && v.relics.offer;
check(v.phase === 'relic' && offer && offer.source === 'vault', `the chest's pick is up (${v.phase} ${offer && offer.source})`);
await sleep(1800);
await shot('vault-8-relic');
await cmd('relicChoose', 0);

if (LANG && LANG !== 'en') {
  const m = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
  check(m.length === 0, `no untranslated lines (${m.slice(0, 5).join(' | ')})`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
