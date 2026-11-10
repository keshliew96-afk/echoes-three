#!/usr/bin/env node
// VFX EXTRAS shots (v0.5.348): the traced blade slashes (T1) in a busy Level
// I fight at play zoom, the same fight on the classic rigs (?facet=0: the
// procedural arcs, as before), the bigger stuck arrows, the bigger frost
// twinkles and the vault's stars after its snap. Needs a dev server
// (npm run dev, port 5199). A virtual clock drives the page at 30 fps, so
// software GL's 1 fps still shoots every frame of a 0.36 s trail.
//
//   node tools/vfx-extras-shots.mjs [--url http://127.0.0.1:5199/]
//     [--shots captures/vfx-extras] [--only fight|classic|arrows|frost|vault]
//     [--seed 5] [--frames 90]
//
// A Linux cloud session as root also needs PUPPETEER_EXECUTABLE_PATH and
// ECHOES_CHROME_ARGS (CLAUDE.md "Running things").
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures/vfx-extras');
const ONLY = opt('only');
const SEED = Number(opt('seed', 5));
const FRAMES = Number(opt('frames', 90));
const LANG = opt('lang', '');
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FPS = 30;
const TICKS = 2; // sim ticks a frame (60 Hz sim, 30 fps page)

const VCLOCK = () => {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let vt = 0;
  let queue = [];
  window.requestAnimationFrame = (cb) => {
    if (on) {
      queue.push(cb);
      return queue.length;
    }
    return realRaf(cb);
  };
  performance.now = () => (on ? vt : realNow());
  window.__vclock = {
    start() {
      vt = Math.max(realNow(), vt);
      on = true;
      return new Promise((ok) => {
        const t0 = realNow();
        const look = () => (queue.length || realNow() - t0 > 20000 ? ok(queue.length) : setTimeout(look, 15));
        look();
      });
    },
    stop() {
      on = false;
      const q = queue;
      queue = [];
      for (const cb of q) realRaf(cb);
    },
    step(ms) {
      vt += ms;
      const q = queue;
      queue = [];
      for (const cb of q) cb(vt);
      return q.length;
    },
  };
};

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
});
const errors = [];
async function open(query = '') {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e?.message ?? e)));
  await page.evaluateOnNewDocument(VCLOCK);
  await page.goto(`${URL0}?seed=${SEED}&tips=0&story=0${LANG ? `&lang=${LANG}` : ''}${query}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
  return page;
}
const cmd = (page, name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
async function untilRoom(page, n) {
  for (let i = 0; i < 600; i++) {
    const v = await cmd(page, 'runState');
    if (v && v.phase === 'combat' && v.room === n) return v;
    await sleep(150);
  }
  return null;
}
// Step one page frame on the virtual clock (the sim by TICKS), then the
// counts the picker reads.
const frame = (page) =>
  page.evaluate(
    (ms, k) => {
      __echoes.sim.stepN(k, null);
      __vclock.step(ms);
      const v = __echoes.content.vfx();
      return { traces: v.tpl.traces, blazes: v.tpl.blazes, glint: v.recipes['tpl:blade_glint'] ?? 0, trace: v.recipes['tpl:blade_trace'] ?? 0, swing: v.recipes['tpl:blade_swing'] ?? 0, stuck: v.bolt?.arrow?.stuck ?? 0, air: v.recipes.element_air ?? 0 };
    },
    1000 / FPS,
    TICKS
  );
async function startFight(page, lineup, room = 3) {
  await cmd(page, 'startCampaign', { level: 1, lineup });
  await untilRoom(page, 1);
  await cmd(page, 'skipToRoom', room);
  await untilRoom(page, room);
  await sleep(600);
  await cmd(page, 'partyMode', 'auto');
  // The room's foes round the party, so every hero is swinging.
  await page.evaluate(() => {
    const w = window.__echoes.content.world();
    const all = w.entities();
    const party = all.filter((e) => e.kind === 'player' || e.kind === 'ally');
    const cx = party.reduce((s, e) => s + e.x, 0) / Math.max(1, party.length);
    const cz = party.reduce((s, e) => s + e.z, 0) / Math.max(1, party.length);
    const foes = all.filter((e) => e.faction === 'hostile' && e.hp > 0);
    foes.forEach((e, i) => {
      const a = (i / Math.max(1, foes.length)) * Math.PI * 2;
      e.x = e.px = cx + Math.sin(a) * 1.3;
      e.z = e.pz = cz + Math.cos(a) * 1.1;
      e.hp = e.maxHp * 40; // they stay up for the whole reel
    });
  });
  await page.evaluate(() => __vclock.start());
}
async function reel(page, tag, pick) {
  let kept = 0;
  let last = null;
  for (let i = 0; i < FRAMES; i++) {
    const c = await frame(page);
    if (pick(c, last, i)) {
      await page.screenshot({ path: join(SHOTS, `${tag}-${String(i).padStart(3, '0')}.png`) });
      kept++;
    }
    last = c;
  }
  console.log(`${tag}: ${kept} frames kept of ${FRAMES}`, last);
}

const want = (k) => !ONLY || ONLY === k;
if (want('fight')) {
  const page = await open();
  await startFight(page, ['healer', 'tank', 'swordsman', 'duskwing']);
  await reel(page, 'fight-traced', (c) => c.traces > 0);
  await page.close();
}
if (want('classic')) {
  const page = await open('&facet=0');
  await startFight(page, ['healer', 'tank', 'swordsman', 'duskwing']);
  await reel(page, 'fight-classic', (c) => c.blazes > 0);
  await page.close();
}
if (want('arrows')) {
  const page = await open();
  await startFight(page, ['healer', 'archer', 'bellwright', 'tank']);
  await reel(page, 'arrows', (c, l) => c.stuck > 0 && (!l || c.stuck !== l.stuck || Math.random() < 0.15));
  await page.close();
}
if (want('frost')) {
  const page = await open();
  await startFight(page, ['healer', 'tank', 'swordsman', 'archer']);
  await cmd(page, 'tonicGive', 0, 'frost_bomb');
  const at = await page.evaluate(() => {
    const w = window.__echoes.content.world();
    const f = w.entities().find((e) => e.faction === 'hostile' && e.hp > 0);
    return f ? { x: f.x, z: f.z } : { x: 0, z: 0 };
  });
  await cmd(page, 'tonicUse', 0, at.x, at.z);
  await reel(page, 'frost', (c, l, i) => c.air > 0 && i % 4 === 0);
  await page.close();
}
if (want('vault')) {
  const page = await open();
  await cmd(page, 'startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'archer'] });
  await untilRoom(page, 1);
  await cmd(page, 'vaultRoom', 3);
  await cmd(page, 'skipToRoom', 3);
  await untilRoom(page, 3);
  await sleep(600);
  await cmd(page, 'killAllEnemies');
  await sleep(300);
  await page.evaluate(() => __vclock.start());
  for (let i = 0; i < 20; i++) await frame(page);
  await cmd(page, 'vaultOpen');
  for (let i = 0; i < 100; i++) {
    await frame(page);
    if (i % 10 === 9) await page.screenshot({ path: join(SHOTS, `vault-${String(i + 1).padStart(3, '0')}.png`) });
  }
  await page.close();
}
await browser.close();
if (errors.length) {
  console.log('page errors:', errors.slice(0, 5));
  process.exit(1);
}
console.log('done');
