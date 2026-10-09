#!/usr/bin/env node
// PARTY LINEUP browser check (docs/LINEUP.md): the page follows a shuffled
// lineup — the player's chosen class on its new seat, the command bar
// portraits and the overhead HP bars in the seat's class colours, the bodies
// drawn as their classes — and a plain campaign afterwards is the default
// four again. Screenshots under captures/ (or --out <dir>).
//
//   npx vite --port 5199 &   then   node tools/lineup-browser.mjs [--out dir]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const SHUFFLED = ['healer', 'archer', 'tank', 'swordsman'];
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });

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
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const pc = () => page.evaluate(() => window.__echoes.playClass());
async function waitPhase(phases, timeout = 300000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}
const hud = () =>
  page.evaluate(() => ({
    ports: [...document.querySelectorAll('.hud-port')].map((c) => c.dataset.class),
    bars: [...document.querySelectorAll('#hpbar-layer .hpbar')].map((b) => b.dataset.class),
    bodies: window.__echoes.state().party.filter((p) => p.partyIndex > 0).sort((a, b) => a.partyIndex - b.partyIndex).map((p) => p.classId),
  }));

await page.goto(`${URL0}?seed=3`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// Play the Tank, who sits on seat 2 in the shuffled lineup.
await page.keyboard.press('KeyC');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(800);
await page.click('.cs-classes .cs-card[data-cls="tank"]');
await page.waitForFunction(() => window.__echoes.playClass().seat === 1, { timeout: 120000, polling: 250 });

await cmd('startCampaign', { level: 1, lineup: SHUFFLED });
await waitPhase(['combat']);
await page.waitForFunction((t) => window.__echoes.tick > t, { timeout: 120000, polling: 250 }, (await page.evaluate(() => window.__echoes.tick)) + 30);
await settle(1500);
let p = await pc();
check(p.classId === 'tank' && p.seat === 2, `the Tank is played on its lineup seat (${JSON.stringify(p)})`);
let h = await hud();
check(JSON.stringify(h.bodies) === JSON.stringify(SHUFFLED.slice(1)), `the bodies are the lineup's classes (${h.bodies.join(',')})`);
check(JSON.stringify(h.ports) === JSON.stringify(SHUFFLED), `the command bar portraits follow the lineup (${h.ports.join(',')})`);
check(h.bars.length === 0 || JSON.stringify(h.bars) === JSON.stringify(SHUFFLED), `the HP bars follow the lineup (${h.bars.join(',')})`);
await page.screenshot({ path: `${OUT}/lineup-1-shuffled-room.png` });

// A plain campaign afterwards: the default four again.
await cmd('abandonRun');
await settle(1500);
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
await settle(2500);
p = await pc();
h = await hud();
check(p.classId === 'tank' && p.seat === 1, `a plain campaign seats the Tank on seat 1 again (${JSON.stringify(p)})`);
check(JSON.stringify(h.ports) === JSON.stringify(['healer', 'tank', 'swordsman', 'archer']), `the portraits are the default four (${h.ports.join(',')})`);
await page.screenshot({ path: `${OUT}/lineup-2-default-room.png` });

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
