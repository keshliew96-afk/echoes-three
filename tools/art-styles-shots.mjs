#!/usr/bin/env node
// ART STYLES shots (docs/MODEL_STANDARD.md "Art style study") — the model
// lab's Art styles tab (scenes/modellab-styles.js): five Healers in a row, one
// per candidate style, shot in the showcase close-up and at the game's play
// zoom, at rest and mid-combo. Then, with --room, the same styles dressed on
// the whole party in a real Level I fight (one shot per style). Needs a dev
// server (npm run dev); English only. Software GL in the cloud runs at about
// 1 fps, so it waits on frames, not time.
//
//   node tools/art-styles-shots.mjs [--url http://127.0.0.1:5199/]
//     [--shots captures/art-styles] [--room 3] [--seed 5] [--dpr 2]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures/art-styles');
const ROOM = Number(opt('room', 3));
const SEED = Number(opt('seed', 5));
const DPR = Number(opt('dpr', 2));
const ONLY = opt('only', 'lab,room');
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STYLES = ['facet', 'polished', 'smooth', 'voxel', 'painted'];

async function launch() {
  return puppeteer.launch({
    headless: true,
    protocolTimeout: 900000,
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: DPR },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
  });
}
const frames = async (page, n) => {
  const t0 = await page.evaluate(() => window.__echoes.frame ?? window.__echoes.tick);
  for (let i = 0; i < 400; i++) {
    const t = await page.evaluate(() => window.__echoes.frame ?? window.__echoes.tick);
    if (t - t0 >= n) return;
    await sleep(200);
  }
};

async function lab(errors) {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${URL0}?modellab=1&model=styles&turn=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.cmd && window.__echoes.cmd('lab', {})?.model === 'styles', { timeout: 300000, polling: 500 });
  const lab = (p) => page.evaluate((q) => window.__echoes.cmd('lab', q), p);
  await page.addStyleTag({ content: '#modellab{display:none!important}' });
  const shots = [
    ['close-rest', { view: 'showcase', mode: 'still', t: 0, azimuth: 0.25 }],
    ['close-combo', { view: 'showcase', ability: 'combo', mode: 'still', t: 0.95, azimuth: 0.25 }],
    ['play-rest', { view: 'play', mode: 'still', t: 0 }],
    ['play-combo', { view: 'play', ability: 'combo', mode: 'still', t: 0.95 }],
  ];
  for (const [name, p] of shots) {
    await lab(p);
    await sleep(1500);
    await frames(page, 4);
    await page.screenshot({ path: `${SHOTS}/lab-${name}.png` });
    console.log('shot', name);
  }
  await browser.close();
}

async function room(errors) {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  // three announces every scene and renderer it makes to a devtools hook, so
  // the probe can reach the game's own scene without a debug API for it
  await page.evaluateOnNewDocument(() => {
    window.__artSeen = { scenes: [], renderers: [] };
    const hook = new EventTarget();
    hook.addEventListener('observe', (e) => {
      const d = e.detail;
      if (d && d.isScene) window.__artSeen.scenes.push(d);
      else if (d && d.isWebGLRenderer) window.__artSeen.renderers.push(d);
    });
    window.__THREE_DEVTOOLS__ = hook;
  });
  await page.goto(`${URL0}?seed=${SEED}&tips=0&story=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const untilRoom = async (n) => {
    for (let i = 0; i < 600; i++) {
      const v = await cmd('runState');
      if (v.phase === 'combat' && v.room === n) return v;
      await sleep(150);
    }
    return null;
  };
  await cmd('startRun', { act: 1 });
  await untilRoom(1);
  if (ROOM > 1) {
    await cmd('skipToRoom', ROOM, { act: 1 });
    await untilRoom(ROOM);
  }
  await sleep(800);
  // hold the fight still (the sim paused), the foes pulled in round the party
  await page.evaluate(() => {
    const w = window.__echoes.content.world();
    const all = w.entities();
    const party = all.filter((e) => e.kind === 'player' || e.kind === 'ally');
    const cx = party.reduce((s, e) => s + e.x, 0) / Math.max(1, party.length);
    const cz = party.reduce((s, e) => s + e.z, 0) / Math.max(1, party.length);
    const foes = all.filter((e) => e.faction === 'hostile' && e.hp > 0);
    foes.forEach((e, i) => {
      const a = (i / Math.max(1, foes.length)) * Math.PI * 2;
      e.x = e.px = cx + Math.sin(a) * 1.8;
      e.z = e.pz = cz - 1.2 + Math.cos(a) * 1.2;
    });
  });
  await sleep(900);
  await page.evaluate(() => window.__echoes.sim.freeze());
  console.log('near', await page.evaluate(() => window.__echoes.content.world().entities().filter((e) => e.faction === 'hostile' && e.hp > 0).length));
  for (const s of STYLES) {
    await page.evaluate(async (style) => {
      const mod = await import('/src/scenes/modellab-styles.js');
      const scene = window.__artSeen.scenes.find((sc) => sc.children.some((c) => c.isDirectionalLight)) || window.__artSeen.scenes[0];
      const renderer = window.__artSeen.renderers[0];
      const heroes = [];
      scene.traverse((o) => {
        if (/^critter-/.test(o.name)) heroes.push(o);
      });
      window.__artHeroes = heroes.map((h) => h.name).join(',');
      for (const g of heroes) mod.restyle(g, style, { renderer });
      const pol = style === 'polished';
      const receivers = [];
      if (pol) scene.traverse((o) => o.isMesh && !(o.material && o.material.isShaderMaterial) && receivers.push(o));
      mod.sunShadows({ scene, renderer }, pol, receivers);
    }, s);
    await sleep(1500);
    await page.screenshot({ path: `${SHOTS}/room-${s}.png` });
    console.log('room', s, await page.evaluate(() => window.__artHeroes));
  }
  await browser.close();
}

const errors = [];
if (ONLY.includes('lab')) await lab(errors);
if (ONLY.includes('room')) await room(errors);
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
process.exit(errors.length ? 1 : 0);
