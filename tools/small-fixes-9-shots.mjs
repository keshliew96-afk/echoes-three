#!/usr/bin/env node
// Small fixes 9 in the real game, against `npm run dev` (port 5199):
//   crowd    a Kiln campaign room: the party blessed Tempered at the Forge
//            Shrine, then a press of Kiln enemies round it (four tempered
//            heroes, eight foes): the glow calms (vfx().tempered.calm near 1)
//   solo     the same room with only the hero tempered and the foes sent
//            off: the calm eases back to 0, the full look of Small fixes 7
//   journal  an elite with Gusting and Cinder arrives and falls in a
//            campaign room; the Journal's Bestiary lists the twelve elite
//            powers, those two met (Felled: 1), the rest silhouettes
// Captures into --shots (default captures/), suffixed with --tag. On a build
// before this round (--tag before) the calm and journal checks fail: the
// shots are the before half of the pair.
//
//   node tools/small-fixes-9-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--tag before] [--only crowd|solo|journal] [--lang de]
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
const SHOTS = opt('shots', 'captures');
const TAG = opt('tag', null);
const ONLY = opt('only', null);
const LANG = opt('lang', null);
const sfx = `${LANG ? `-${LANG}` : ''}${TAG ? `-${TAG}` : ''}`;
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const run = () => cmd('runState');
const tick = () => page.evaluate(() => window.__echoes.tick);
const vfxT = () => page.evaluate(() => (window.__echoes.content.vfx?.() ?? {}).tempered ?? null);
let fails = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails += 1;
  return ok;
};
async function untilPhase(p, tries = 600) {
  for (let i = 0; i < tries; i++) {
    const v = await run();
    if (v.phase === p) return v;
    await sleep(150);
  }
  return run();
}
async function key(code) {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
}
// Send the room's own hostiles (all but those in `keep`) far off.
const sendOff = (keep = []) => page.evaluate((k) => {
  for (const e of window.__echoes.content.world().entities()) if (e.faction === 'hostile' && !k.includes(e.id)) { e.x = e.px = 0; e.z = e.pz = 30; }
}, keep);
const sturdy = () => page.evaluate(() => { for (const e of window.__echoes.content.world().entities()) if (e.partyIndex !== undefined) e.hp = e.maxHp = 9999; });

await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0&tutorial=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

async function kilnRoom(seed) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level: 6, seed });
  await untilPhase('combat');
  await sleep(800);
  await sendOff();
}

if (!ONLY || ONLY === 'crowd' || ONLY === 'solo') {
  await kilnRoom(4);
  await sturdy();
  await cmd('relicGrant', 'slag_greaves');
  await cmd('shrineHere', 'kiln', 2.6, -0.6);
  await cmd('teleport', 2.6, 0.7);
  await sleep(600);
  await sendOff();
  await cmd('shrineUse');
  const t0 = await tick();
  for (let i = 0; i < 80 && (await tick()) < t0 + 240; i++) {
    await sendOff();
    await sleep(150);
  }
  await cmd('teleport', 0.4, 1.4);
  await sleep(600);
  const heroes = await page.evaluate(() => window.__echoes.content.world().entities().filter((e) => e.partyIndex !== undefined && e.blessing && e.blessing.id === 'tempered').length);
  // A press of Kiln enemies round the party, sturdy enough to stay.
  const foes = [];
  const kinds = ['slag', 'newt', 'bellows', 'cindermoth', 'hurler', 'newt', 'slag', 'cindermoth'];
  for (let i = 0; i < kinds.length; i++) {
    const a = (i / kinds.length) * Math.PI * 2;
    foes.push(await cmd('spawn', kinds[i], 0.4 + Math.cos(a) * 3.2, 1.4 + Math.sin(a) * 3.2, { hpMul: 40 }));
  }
  if (!ONLY || ONLY === 'crowd') {
    for (let i = 0; i < 24; i++) {
      await sendOff(foes);
      await sturdy();
      await sleep(150);
    }
    // Hold the fight still so the shot reads (the effects keep playing).
    await page.evaluate(() => window.__echoes.sim.freeze());
    await sleep(1800);
    const v = await vfxT();
    await page.screenshot({ path: `${SHOTS}/sf9-crowd${sfx}.png` });
    await page.evaluate(() => window.__echoes.sim.thaw());
    console.log(`crowd: ${heroes} tempered heroes, ${foes.length} foes, ${JSON.stringify(v)}`);
    check(heroes >= 3, `sf9-crowd${sfx}.png: the party is tempered (${heroes} heroes)`);
    check(!!v && v.calm >= 0.8, `the Tempered look calms in the crowd (calm ${v && v.calm})`);
  }
  if (!ONLY || ONLY === 'solo') {
    // Only the hero keeps the blessing; the foes go.
    await page.evaluate((ids) => {
      for (const e of window.__echoes.content.world().entities()) {
        if (e.partyIndex !== undefined && e.partyIndex !== 0) e.blessing = null;
        if (ids.includes(e.id)) e.hp = 0;
      }
    }, foes);
    await cmd('killAllEnemies');
    // The calm eases out over about a second of frames; a software-GL page
    // draws few frames, so wait on the value (up to about 2 min), not the clock.
    for (let i = 0; i < 800; i++) {
      await sendOff();
      const v = await vfxT();
      if (!v || v.calm <= 0.02) break;
      if (process.env.SF9_TRACE && i % 20 === 0) console.log('  calm', i, JSON.stringify(v), await tick());
      await sleep(150);
    }
    await page.evaluate(() => window.__echoes.sim.freeze());
    await sleep(1800);
    const v = await vfxT();
    await page.screenshot({ path: `${SHOTS}/sf9-solo${sfx}.png` });
    await page.evaluate(() => window.__echoes.sim.thaw());
    console.log(`solo: ${JSON.stringify(v)}`);
    check(!!v && v.heroes === 1 && v.calm <= 0.1, `sf9-solo${sfx}.png: one tempered hero in a quiet room keeps the full look (calm ${v && v.calm})`);
  }
}

if (!ONLY || ONLY === 'journal') {
  await kilnRoom(6);
  await sturdy();
  await cmd('teleport', 0, 1.5);
  const eid = await cmd('spawn', 'boar', 0, -1.5, { elite: true, affixes: ['gusting', 'cinder'] });
  await sleep(1500);
  await page.evaluate((id) => { const e = window.__echoes.content.world().entities().find((x) => x.id === id); if (e) e.hp = 1; }, eid);
  await cmd('killAllEnemies');
  await sleep(800);
  await cmd('clearRoom');
  await sleep(2000);
  // Back at camp (the run's end writes the batch too), where J opens.
  await cmd('abandonRun', 'quit');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(3000);
  const seen = await page.evaluate(() => ((window.__echoes.save.profile() || {}).journal || {}).seen?.affix ?? null);
  console.log(`journal.seen.affix: ${JSON.stringify(seen)}`);
  check(!!seen && seen.gusting === 1 && seen.cinder === 1, 'the fallen elite\'s two late powers are in the profile journal, felled once each (the room\'s own elites add theirs)');
  let open = false;
  for (let i = 0; i < 6 && !open; i++) {
    await key('KeyJ');
    open = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (!open) {
      await page.keyboard.press('Escape');
      await sleep(2500);
    }
  }
  check(open, 'J opens the Journal');
  for (let i = 0; i < 6; i++) {
    const tab = await page.evaluate(() => document.querySelector('.st-story')?.__journal?.()?.tab);
    if (tab === 'bestiary') break;
    await key('KeyE');
    await sleep(600);
  }
  await sleep(2500);
  const grid = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.jr-tile[data-jid^="affix:"]')];
    const b = document.querySelector('.jr-tile[data-jid="affix:gusting"]');
    if (b) {
      b.scrollIntoView({ block: 'center' });
      b.click();
    }
    const secs = [...document.querySelectorAll('.jr-sec')].map((s) => s.textContent);
    return { tiles: tiles.length, unseen: tiles.filter((x) => x.classList.contains('jr-unseen')).length, secs };
  });
  await sleep(1200);
  const detail = await page.evaluate(() => document.querySelector('.jr-detail')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
  await page.screenshot({ path: `${SHOTS}/sf9-journal${sfx}.png` });
  console.log(`journal: ${JSON.stringify(grid)} | ${detail}`);
  const met = Object.keys(seen || {}).length;
  check(grid.tiles === 12 && grid.unseen === 12 - met, `sf9-journal${sfx}.png: twelve elite powers on the Bestiary, the ${met} met in the run lit (${grid.tiles} / ${grid.unseen} unseen)`);
  check(/1/.test(detail) && detail.length > 60, 'the Gusting page shows its line and its count');
  if (LANG && LANG !== 'en') {
    const miss = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
    check(miss.length === 0, `no missing translations on these screens (${miss.slice(0, 4).join(' | ')})`);
  }
}

console.log(errors.length ? `FAIL page errors: ${errors.slice(0, 3).join(' | ')}` : 'ok   no page errors');
console.log(`${fails} failed`);
await browser.close();
process.exit(fails || errors.length ? 1 : 0);
