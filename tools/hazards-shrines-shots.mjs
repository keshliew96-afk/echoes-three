#!/usr/bin/env node
// HAZARDS AND SHRINES in the real game (docs/SHRINES.md): against `npm run
// dev` (port 5199), each land's shrine beside the party with its prompt, the
// offer and its blessing plate, a refusal, and a Heart crystal spur winding
// up and bursting. Captures into --shots (default captures/).
//
//   node tools/hazards-shrines-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--lang de] [--only spur]
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
const sfx = LANG ? `-${LANG}` : '';
const ONLY = opt('only', null); // 'spur' skips the shrines
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
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${URL0}?seed=5&tips=0&story=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const run = () => cmd('runState');
async function untilPhase(p, n = null) {
  for (let i = 0; i < 400; i++) {
    const v = await run();
    if (v.phase === p && (n === null || v.room === n)) return v;
    await sleep(150);
  }
  return run();
}
// Hold every enemy far away so a frame shows the shrine, not a brawl.
const calm = () => page.evaluate(() => {
  const w = window.__echoes.content.world();
  for (const e of w.entities()) if (e.faction === 'enemy') { e.x = 11; e.z = 7; e.px = 11; e.pz = 7; }
});
const prompt = () => page.evaluate(() => {
  const el = document.querySelector('.ix-prompt');
  return el && el.classList.contains('ix-on') ? el.textContent.replace(/\s+/g, ' ').trim() : null;
});
const plate = () => page.evaluate(() => {
  const el = document.querySelector('.hud-bless');
  return el && getComputedStyle(el).display !== 'none' ? el.textContent.replace(/\s+/g, ' ').trim() : null;
});

const LANDS = [['wood', 1], ['mill', 2], ['barrow', 3], ['heart', 4], ['spire', 5]];
for (const [land, level] of ONLY === 'spur' ? [] : LANDS) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level });
  await untilPhase('combat');
  await cmd('skipToRoom', 3);
  await untilPhase('combat', 3);
  await sleep(600);
  const p = await page.evaluate(() => { const q = window.__echoes.content.world().player; return { x: q.x, z: q.z }; });
  await cmd('shrineHere', land, p.x + 1.3, p.z - 0.9);
  await calm();
  await sleep(2500);
  await calm();
  const pr = await prompt();
  check(!!pr && pr.length > 5, `${land}: the prompt reads "${pr}"`);
  await shot(`hs-${land}-1-shrine`);
  // A refusal first where the price can be missing.
  if (land === 'mill' || land === 'heart' || land === 'spire') {
    if (land === 'mill') await cmd('wallet', 5);
    const r = await cmd('shrineUse', 0);
    check(!!r && !!r.denied, `${land}: refused without the price (${r && r.denied})`);
    await sleep(900);
    if (land === 'heart') await shot(`hs-${land}-2-refused`);
  }
  await cmd('wallet', 60);
  await cmd('keyGive');
  await cmd('tonicGive', 0, 'haste_draught');
  const r = await cmd('shrineUse', 0);
  check(!!r && !r.denied, `${land}: the offer is taken (${JSON.stringify(r)})`);
  await sleep(700);
  await shot(`hs-${land}-3-offer`);
  await sleep(2200);
  await calm();
  const pl = await plate();
  if (land !== 'heart') check(!!pl, `${land}: the blessing plate reads "${pl}"`);
  await shot(`hs-${land}-4-after`);
}
// The Heart crystal spur under the party.
{
  if ((await run()).active) await cmd('abandonRun', 'quit');
  await sleep(500);
  await cmd('startCampaign', { level: 4 });
  await untilPhase('combat');
  await cmd('skipToRoom', 3);
  await untilPhase('combat', 3);
  await calm();
  const p = await page.evaluate(() => { const q = window.__echoes.content.world().player; return { x: q.x, z: q.z }; });
  const id = await cmd('spawnHazard', 'spur', p.x + 1.2, p.z + 0.4, {});
  // Force the wind-up (applied on the next sim step), then step the player
  // off the mark so the frame shows the ring and its crystal.
  const held = await page.evaluate(async (hid) => {
    const E = window.__echoes;
    E.cmd('hazardPhase', hid, 'telegraph');
    const find = () => E.content.world().entities().find((e) => e.id === hid);
    for (let i = 0; i < 400 && !(find() && find().telegraph); i++) await new Promise((r) => setTimeout(r, 2));
    const h = find();
    if (!h || !h.telegraph) return false;
    // A software-GL page paints about once a second, longer than the 0.9 s
    // wind-up: stretch it (its own clock) so a frame lands mid-wind-up.
    const t = h.telegraph;
    t.resolveTick = t.startTick + 54 * 12;
    t.startTick -= 54 * 4;
    h.resolveTick = h.phaseUntilTick = t.resolveTick;
    return true;
  }, id);
  await cmd('teleport', p.x - 2.2, p.z + 0.4);
  check(held, 'the wind-up starts');
  await sleep(2500);
  await shot('hs-spur-1-windup');
  const id2 = await cmd('spawnHazard', 'spur', p.x - 1.4, p.z - 0.6, {});
  await cmd('hazardPhase', id2, 'active');
  await sleep(450);
  await shot('hs-spur-2-burst');
  await sleep(2500);
  await calm();
  await shot('hs-spur-3-pillars');
  const pillars = await page.evaluate(() => window.__echoes.content.world().entities().filter((e) => e.kind === 'rubble' && e.skin === 'spur').length);
  check(pillars >= 1, `${pillars} crystal pillar(s) stand`);
}
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
process.exit(fails.length ? 1 : 0);
