#!/usr/bin/env node
// MODEL STANDARD HEROES shots (v0.5.335) — the faceted heroes in a busy fight
// at the game's own play zoom, and the same fight with ?facet=0 (the classic
// rigs) for the side by side. Needs a dev server (npm run dev) or a harness
// build; English only.
//
//   node tools/model-standard-heroes-shots.mjs [--url http://127.0.0.1:5199/]
//     [--shots captures/model-standard-heroes] [--room 3] [--seed 5]
//
// A Linux cloud session as root also needs PUPPETEER_EXECUTABLE_PATH and
// ECHOES_CHROME_ARGS (CLAUDE.md "Running things"). Software GL runs at a few
// frames a second, so the fight is shot several times over a few seconds;
// pick the busiest.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures/model-standard-heroes');
const ROOM = Number(opt('room', 3));
const SEED = Number(opt('seed', 5));
const COUNT = Number(opt('count', 6));
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fight(facet) {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 600000,
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.goto(`${URL0}?seed=${SEED}&tips=0&story=0${facet ? '' : '&facet=0'}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
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
  // Bring the room's foes in round the party, so every hero is swinging.
  await page.evaluate(() => {
    const w = window.__echoes.content.world();
    const all = w.entities();
    const party = all.filter((e) => e.kind === 'player' || e.kind === 'ally');
    const cx = party.reduce((s, e) => s + e.x, 0) / Math.max(1, party.length);
    const cz = party.reduce((s, e) => s + e.z, 0) / Math.max(1, party.length);
    const foes = all.filter((e) => e.faction === 'hostile' && e.hp > 0);
    foes.forEach((e, i) => {
      const a = (i / Math.max(1, foes.length)) * Math.PI * 2;
      e.x = e.px = cx + Math.sin(a) * 1.6;
      e.z = e.pz = cz - 1.2 + Math.cos(a) * 1.1;
    });
  });
  const tag = facet ? 'faceted' : 'classic';
  for (let i = 0; i < COUNT; i++) {
    await sleep(700);
    await page.screenshot({ path: `${SHOTS}/fight-${tag}-${i + 1}.png` });
  }
  await browser.close();
  return errors;
}

const errs = [...(await fight(true)), ...(await fight(false))];
console.log(errs.length ? `page errors:\n${errs.join('\n')}` : 'no page errors');
console.log(`shots in ${SHOTS}`);
process.exit(errs.length ? 1 : 0);
