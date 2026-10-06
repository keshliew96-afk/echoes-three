#!/usr/bin/env node
// CAMP FIXES (v0.5.227): every class's shots fly and expire in the camp.
// For each class: pick it, hold the basic attack (right mouse) and press 1-4
// in the camp, then wait. Every bolt spawned (projectile_spawn /
// skill_bolt_spawn) must despawn, and its position must change while it
// lives. Before the fix the ally seats' bolts hung in the air forever.
// Screenshots: captures/campfix-proj-<class>.png.
//
//   node tools/campfix-projectiles.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--skills 0]
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
const SEED = Number(opt('seed', '3'));
// Camp has no skills since v0.5.227 (they come from wave rewards); --skills 1
// grants each seat its class kit first so the skill bolts are exercised too.
const GRANT = opt('skills', '1') === '1';
// The pre-v0.5.227 starting kits, granted for the test only.
const OLD_KITS = {
  healer: ['mending_bolt', 'swift_mend'],
  tank: ['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard'],
  swordsman: ['flurry', 'lunge_strike', 'blade_storm', 'caltrops'],
  archer: ['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova'],
};
mkdirSync('captures', { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra],
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
const tick = () => page.evaluate(() => window.__echoes.tick);
const waitTicks = async (n) => {
  const t0 = await tick();
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 180000, polling: 100 }, t0 + n);
};

await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await page.evaluate(() => {
  window.__bolts = new Map();
  const live = (ev) => window.__bolts.get(ev.id);
  window.__echoes.on('*', (ev) => {
    if (ev.type === 'projectile_spawn' || ev.type === 'skill_bolt_spawn') window.__bolts.set(ev.id, { id: ev.id, type: ev.type, tick: ev.tick, gone: null });
    else if (ev.type === 'azone_spawn') window.__bolts.set(ev.id, { id: ev.id, type: ev.type, zone: true, tick: ev.tick, gone: null });
    else if (ev.type === 'projectile_despawn' || ev.type === 'skill_bolt_despawn' || ev.type === 'azone_expire') {
      const b = live(ev);
      if (b) b.gone = { tick: ev.tick, traveled: ev.traveled ?? null, cause: ev.cause ?? null };
    } else if (ev.type === 'ally_cast' || ev.type === 'ally_basic' || ev.type === 'basic_fire' || ev.type === 'skill_cast') window.__acts = (window.__acts || 0) + 1;
  });
});

for (const cls of ['healer', 'tank', 'swordsman', 'archer']) {
  await page.evaluate((c) => window.__echoes.settings.set('gameplay.playClass', c), cls);
  await waitTicks(20);
  if (GRANT) {
    const got = await page.evaluate(
      (c, kit) => (c === 'healer' ? kit.map((id) => window.__echoes.cmd('giveSkill', id)) : kit.map((id) => window.__echoes.cmd('partySwap', ['tank', 'swordsman', 'archer'].indexOf(c) + 1, id))),
      cls,
      OLD_KITS[cls],
    );
    console.log(`     ${cls}: granted ${JSON.stringify(got).slice(0, 160)}`);
  }
  await page.evaluate(() => {
    window.__bolts.clear();
    window.__acts = 0;
  });
  await page.mouse.move(640, 220);
  await page.mouse.down({ button: 'right' });
  await waitTicks(70);
  await page.mouse.up({ button: 'right' });
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) {
    await page.keyboard.down(k);
    await waitTicks(14);
    await page.keyboard.up(k);
  }
  await page.screenshot({ path: `captures/campfix-proj-${cls}.png` });
  await waitTicks(420);
  const bolts = await page.evaluate(() => [...window.__bolts.values()]);
  const acts = await page.evaluate(() => window.__acts || 0);
  const hung = bolts.filter((b) => !b.gone);
  const still = bolts.filter((b) => !b.zone && b.gone && !(b.gone.traveled > 0));
  const kinds = [...new Set(bolts.map((b) => b.type))].join(', ') || 'melee only';
  check(acts > 0, `${cls}: attacked in camp (${acts} attacks / casts; ${bolts.length} bolts or zones: ${kinds})`);
  check(hung.length === 0 && still.length === 0, `${cls}: every bolt flew and expired, every zone ended (left ${hung.length}, never moved ${still.length})`);
}
check(errors.length === 0, `no page errors (${JSON.stringify(errors.slice(0, 3))})`);
await browser.close();
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
