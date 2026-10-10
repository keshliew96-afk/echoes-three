#!/usr/bin/env node
// THE TIDECALLER's kit in a browser (docs/TIDECALLER.md, slice 3): plays the
// three Tidecaller reels of the VFX lab (?vfxlab=1) step by step, the way
// the lab does: a Level 1 campaign with Rill on seat 3, each set put on her
// keys between rooms, every skill cast at training targets in front of her. Checks that each skill's own water
// beat played (the signature director's recipe counters, tide:*), that her
// sounds were asked for (td_* cue requests), and that nothing threw; takes a
// screenshot of every cast.
// Screenshots under captures/ (or --out <dir>).
//
//   npx vite --port 5199 &   then   node tools/tidecaller-kit-browser.mjs [--out dir]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, ...extra],
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

await page.goto(`${URL0}?vfxlab=1&seed=3`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60 && !!document.querySelector('#vfxlab'), { timeout: 300000, polling: 500 });
await settle(1500);
// Count every td_* cue the engine is asked for (the event cue handlers'
// output passes through the engine's event bus; we listen on the same
// events and ask the registered handlers' module directly).
await page.evaluate(async () => {
  const mod = await import('/src/audio/tidecues.js');
  const cues = mod.createTideEventCues();
  const h = { pos: () => null, player: () => ({ x: 0, z: 0 }) };
  window.__tdCues = {};
  for (const [type, fn] of Object.entries(cues)) {
    window.__echoes.on(type, (e) => {
      const r = fn({ type, ...e }, h);
      for (const q of r || []) if (q.cue.startsWith('td_')) window.__tdCues[q.cue] = (window.__tdCues[q.cue] || 0) + 1;
    });
  }
});

const REELS = [
  ['A', ['riverbolt', 'torrent', 'undertow', 'breaker']],
  ['B', ['whirlpool', 'crashing_wave', 'bubble_ward', 'ripple_step']],
  ['C', ['rain_squall', 'maelstrom', 'riverbolt', 'tidepool']],
];
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runv = () => page.evaluate(() => window.__echoes.state().run || {});
const rill = () => page.evaluate(() => window.__echoes.content.world().entities().find((e) => e.classId === 'tidecaller' && e.partyIndex !== undefined) || null).then((e) => (e ? { x: e.x, z: e.z, seat: e.partyIndex } : null));
check(await page.evaluate(() => [...document.querySelectorAll('#vfxlab button')].some((x) => x.textContent === 'Tidecaller A')), 'the lab has the Tidecaller reels');
// The lab's reel, step by step here, so each screenshot waits for nothing:
// a Level 1 campaign with Rill on seat 3, her set put on between rooms.
await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'tidecaller'] });
for (let i = 0; i < 300 && (await runv()).phase !== 'combat'; i++) await settle(100);
const seat = (await rill())?.seat;
check(seat === 3, `Rill is on seat 3 (${seat})`);
await cmd('partyMode', 'manual');
for (const [letter, set] of REELS) {
  for (let i = 0; i < 900 && (await runv()).phase === 'combat'; i++) {
    await cmd('killAllEnemies');
    await settle(100);
  }
  for (const [k, id] of set.entries()) {
    const s = (await cmd('partyView', seat)).slots;
    if (s[k] === id) continue;
    const j = s.indexOf(id);
    const spare = REELS.flatMap((r) => r[1]).find((x) => !s.includes(x) && !set.includes(x));
    if (j >= 0 && spare) await cmd('partySwap', seat, spare, j);
    await cmd('partySwap', seat, id, k);
  }
  check((await cmd('partyView', seat)).slots.join(',') === set.join(','), `reel ${letter} on her keys (${set.join(', ')})`);
  const next = ((await runv()).room || 1) + 1;
  await cmd('skipToRoom', next);
  for (let i = 0; i < 300 && !((await runv()).phase === 'combat' && (await runv()).room === next); i++) await settle(100);
  await settle(1200);
  for (const [k, id] of set.entries()) {
    const me = await rill();
    const f = { x: me.x, z: me.z - 2.2 };
    for (const [dx, dz] of [[-0.9, 0], [0, -0.5], [0.9, 0]]) await cmd('spawn', 'dummy', f.x + dx, f.z + dz);
    if (id === 'ripple_step') await cmd('spawn', 'dummy', me.x + 0.4, me.z);
    await settle(250);
    if (id !== 'tidepool') {
      const r = await cmd('partyCast', seat, k, f);
      check(r && r.ok, `reel ${letter}: ${id} cast (${JSON.stringify(r)})`);
    }
    await settle(id === 'maelstrom' ? 1150 : id === 'rain_squall' ? 1300 : id === 'tidepool' ? 1500 : 380);
    await page.screenshot({ path: `${OUT}/tidekit-${letter}-${id}.png` });
    await settle(900);
  }
}

const recipes = await page.evaluate(() => window.__echoes.content.vfx().recipes || {});
const tide = Object.keys(recipes).filter((k) => k.startsWith('tide:')).sort();
console.log('   recipes', tide.map((k) => `${k}=${recipes[k]}`).join(' '));
for (const id of ['riverbolt', 'torrent', 'breaker', 'crashing_wave', 'bubble_ward', 'maelstrom']) check(recipes[`tide:${id}`] > 0, `her ${id} beat played`);
for (const z of ['undertow', 'whirlpool', 'rain_squall', 'ripple_step']) check(recipes[`tide:zone:${z}`] > 0, `her ${z} zone beat played`);
check(recipes['tide:maelstrom:burst'] > 0, 'the Maelstrom burst into its column');
check(recipes['tide:ripple_step:vault'] > 0, 'Ripple Step vaulted with its spray arc');
check(recipes['tide:hit:riverbolt'] > 0 && recipes['tide:hit:torrent'] > 0, 'Riverbolt and Torrent landed with splash crowns');
const td = await page.evaluate(() => window.__tdCues);
console.log('   cues', JSON.stringify(td));
for (const c of ['td_bolt', 'td_jet', 'td_swirl', 'td_wave', 'td_rain', 'td_bubble', 'td_vault', 'td_draw', 'td_burst', 'td_splash']) check(td[c] > 0, `her ${c} sound was asked for`);
const v = await page.evaluate(() => window.__echoes.content.vfx());
console.log('   vfx', JSON.stringify({ updateMs: v.updateMs, trails: v.trails }));
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
