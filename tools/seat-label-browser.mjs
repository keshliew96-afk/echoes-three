#!/usr/bin/env node
// SEAT LABELS browser check (docs/LINEUP.md): every party tab names the
// class that actually holds its seat, for all seven heroes. Before v0.5.309
// the party strip (socket screen, party draft page, shop shelf) was dressed
// once at boot for the default four, so Rill on seat 3 still read "Archer".
//
// Rounds: the player picks a hero at camp, then a campaign starts with a
// lineup putting the newer heroes in the ally seats; each round reads the
// party page's tabs (reward phase) and the socket screen's tabs (path phase).
// Across the rounds every one of the seven heroes sits in a seat and four
// of them are played by the human. A last plain round checks the default
// four come back. Screenshots under captures/ (or --out <dir>).
//
//   npx vite --port 5199 &   then   node tools/seat-label-browser.mjs [--out dir] [--lang de]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const LANG = opt('lang', 'en');
const W = +opt('w', 1600);
const H = +opt('h', 900);
mkdirSync(OUT, { recursive: true });

const ROUNDS = [
  { play: 'tidecaller', lineup: ['healer', 'tank', 'swordsman', 'tidecaller'] },
  { play: 'bellwright', lineup: ['healer', 'archer', 'bellwright', 'duskwing'] },
  { play: 'duskwing', lineup: ['healer', 'tidecaller', 'bellwright', 'duskwing'] },
  { play: 'tank', lineup: ['healer', 'duskwing', 'tank', 'tidecaller'] },
  { play: 'healer', lineup: null },
];
const DEFAULT = ['healer', 'tank', 'swordsman', 'archer'];

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
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
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const phase = () => page.evaluate(() => (window.__echoes.state().run || {}).phase);
const waitFn = (fn, arg, timeout = 300000) => page.waitForFunction(fn, { timeout, polling: 250 }, arg);
const hold = async (code) => {
  await page.keyboard.down(code);
  await settle(250);
  await page.keyboard.up(code);
};
// The tabs of the visible party strip under `root`: class + shown name.
const tabsOf = (root) =>
  page.evaluate((sel) => {
    const strips = [...document.querySelectorAll(`${sel} .rn-pstrip`)].filter((s) => s.getBoundingClientRect().width > 0);
    const s = strips[0];
    if (!s) return null;
    return [...s.querySelectorAll('.rn-ptab')].map((tab) => ({ cls: tab.dataset.class, name: tab.querySelector('.rn-pname').textContent }));
  }, root);

await page.goto(`${URL0}?seed=3&rill=1&tolly=1&sable=1&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
// The names the page itself gives the classes (t(CLASS_NAME[c])).
const shown = await page.evaluate(async () => {
  const [{ CLASS_NAME }, { t }] = await Promise.all([import('/src/data/classes.js'), import('/src/i18n/index.js')]);
  return Object.fromEntries(Object.keys(CLASS_NAME).map((c) => [c, t(CLASS_NAME[c])]));
});

for (const [i, R] of ROUNDS.entries()) {
  const want = R.lineup || DEFAULT;
  const tag = `${i + 1}-${R.play}`;
  // Pick the hero at camp (the class is read while no run is live).
  if (i > 0) {
    await cmd('abandonRun');
    await settle(2000);
  }
  await hold('KeyC');
  await waitFn(() => !!document.querySelector('.cs-classes .cs-card'), null, 60000);
  await settle(800);
  await page.click(`.cs-classes .cs-card[data-cls="${R.play}"]`);
  await waitFn((c) => window.__echoes.playClass().chosen === c, R.play, 120000);
  // The picker goes on to "Who joins the team?"; Esc is Done there.
  const pickerUp = () => page.evaluate(() => { const e = document.querySelector('.cs-classes'); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; });
  for (let k = 0; k < 4 && (await pickerUp()); k++) {
    await settle(800);
    await hold('Escape');
    await settle(800);
  }
  check(!(await pickerUp()), `[${tag}] the class picker closed`);
  // A picker fading out can take one Esc too many (the pause menu): the
  // sim must be stepping before the run starts.
  for (let k = 0; k < 3; k++) {
    const t0 = await page.evaluate(() => window.__echoes.tick);
    await settle(4000);
    if ((await page.evaluate(() => window.__echoes.tick)) > t0) break;
    await hold('Escape');
  }
  await cmd('startCampaign', R.lineup ? { level: 1, lineup: R.lineup } : { level: 1 });
  await waitFn(() => (window.__echoes.state().run || {}).phase === 'combat');
  await waitFn((s) => window.__echoes.playClass().seat === s, want.indexOf(R.play), 60000).catch(() => null);
  const pc = await page.evaluate(() => window.__echoes.playClass());
  check(pc.classId === R.play && pc.seat === want.indexOf(R.play), `[${tag}] the ${R.play} is played on seat ${want.indexOf(R.play)} (${JSON.stringify(pc)})`);

  // The party page after the clear (the draft's strip).
  for (let k = 0; k < 40 && (await phase()) === 'combat'; k++) {
    await cmd('killAllEnemies');
    await settle(3000);
  }
  await waitFn(() => (window.__echoes.state().run || {}).phase === 'reward', null, 120000);
  await settle(1800);
  const draft = await tabsOf('#run-screen');
  if (draft) {
    check(JSON.stringify(draft.map((x) => x.cls)) === JSON.stringify(want), `[${tag}] party page tabs dress the lineup (${draft.map((x) => x.cls).join(',')})`);
    check(draft.every((x) => x.name === shown[x.cls]), `[${tag}] party page tabs name the lineup (${draft.map((x) => x.name).join(', ')})`);
  } else console.log(`note [${tag}] no party strip on the reward page (solo card)`);
  await page.screenshot({ path: `${OUT}/seat-labels-${tag}-party-${LANG}.png` });

  // Leave the reward for the path page, then open the socket screen (B).
  for (let k = 0; k < 8 && (await phase()) !== 'path'; k++) {
    const ph = await phase();
    if (ph === 'reward') {
      await cmd('draftDecline');
      await cmd('partyCommit');
    } else if (ph === 'relic') await cmd('relicChoose', 0);
    await settle(1500);
  }
  await waitFn(() => (window.__echoes.state().run || {}).phase === 'path', null, 60000).catch(async () => {
    console.log('stuck', await phase(), JSON.stringify(await cmd('partyPage')).slice(0, 600));
    throw new Error('no path page');
  });
  await settle(800);
  await hold('KeyB');
  await waitFn(() => window.__echoes.content.socketUi().open, null, 30000);
  await settle(1000);
  const sock = await tabsOf('#socket-screen');
  check(!!sock && JSON.stringify(sock.map((x) => x.cls)) === JSON.stringify(want), `[${tag}] socket screen tabs dress the lineup (${sock && sock.map((x) => x.cls).join(',')})`);
  check(!!sock && sock.every((x) => x.name === shown[x.cls]), `[${tag}] socket screen tabs name the lineup (${sock && sock.map((x) => x.name).join(', ')})`);
  const view = await page.evaluate(() => window.__echoes.content.socketUi().viewSeat);
  check(view === pc.seat, `[${tag}] the socket screen opens on the player's own seat ${pc.seat} (${view})`);
  await page.screenshot({ path: `${OUT}/seat-labels-${tag}-socket-${LANG}.png` });
  await hold('Escape');
  await settle(800);
}

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
