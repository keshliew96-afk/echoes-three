#!/usr/bin/env node
// THE DUSKWING's whole kit, in the browser (docs/DUSKWING.md, content plan 5
// slice 5): a Level 1 campaign with Sable on seat 3, his seven new skills put
// on his keys two loadouts at a time between rooms and cast at a pack, each
// beat screenshotted as it lands. Screenshots under captures/
// (or --out <dir>); --lang <code> plays it in that language.
//
//   npx vite --port 5199 &   then   node tools/duskwing-kit-browser.mjs [--out dir] [--lang de]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const LANG = opt('lang', null);
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
const tag = LANG ? `-${LANG}` : '';
const shot = (name) => page.screenshot({ path: `${OUT}/duskwing-kit-${name}${tag}.png` });
const seen = () => page.evaluate(() => window.__kitSeen);

await page.goto(`${URL0}?seed=3&menu=0&sable=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
await page.evaluate(() => {
  window.__kitSeen = { casts: {}, swarm: 0, pulses: 0 };
  window.__echoes.on('ally_cast', (e) => e && e.classId === 'duskwing' && (window.__kitSeen.casts[e.skill] = (window.__kitSeen.casts[e.skill] || 0) + 1));
  window.__echoes.on('azone_tick', (e) => e && e.skill === 'bat_swarm' && window.__kitSeen.swarm++);
  window.__echoes.on('aura_pulse', (e) => e && e.skill === 'blood_scent' && window.__kitSeen.pulses++);
});
await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'duskwing'] });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('partyMode', 'manual');

const ALL = ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings', 'echo_screech', 'talon_rake', 'bat_swarm', 'shadow_veil', 'flit', 'blood_scent', 'blood_moon'];
// Between rooms: clear the room, put `ids` on his keys, step into the next.
async function room(ids) {
  for (let i = 0; i < 300 && (await cmd('runState')).phase === 'combat'; i++) {
    await cmd('killAllEnemies');
    await settle(100);
  }
  for (const [k, id] of ids.entries()) {
    const s = (await cmd('partyView', 3)).slots;
    if (s[k] === id) continue;
    const j = s.indexOf(id);
    if (j >= 0) await cmd('partySwap', 3, ALL.find((x) => !s.includes(x) && !ids.includes(x)), j);
    await cmd('partySwap', 3, id, k);
  }
  const next = ((await cmd('runState')).room || 1) + 1;
  await cmd('skipToRoom', next);
  await page.waitForFunction((n) => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === n; }, { timeout: 300000, polling: 250 }, next);
  await settle(1500);
  return (await cmd('partyView', 3)).slots;
}
const me = () => page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
async function pack(at, pts, kind = 'dummy') {
  for (const [dx, dz] of pts) await cmd('spawn', kind, at.x + dx, at.z + dz, kind === 'dummy' ? {} : { hpMul: 8 });
}
const cast = (k, x, z) => cmd('partyCast', 3, k, { x, z });

const ONLY = opt('only', null); // B or C: one loadout only
let slots;
let t;
let s;
// ---- Loadout B: Echo Screech, Talon Rake, Shadow Veil, Blood Moon.
if (ONLY !== 'C') {
  slots = await room(['echo_screech', 'talon_rake', 'shadow_veil', 'blood_moon']);
  check(slots.join(',') === 'echo_screech,talon_rake,shadow_veil,blood_moon', `his keys hold Echo Screech, Talon Rake, Shadow Veil and Blood Moon (${slots.join(',')})`);
  await shot('1-hud');
  t = await me();
  await pack(t, [[-0.5, -1.6], [0.5, -1.8], [0, -2.3]], 'boar');
  await cast(0, t.x, t.z - 2);
  await settle(300);
  await shot('2-echo-screech');
  await settle(900);
  t = await me();
  await pack(t, [[-0.5, -0.8], [0.5, -0.8]], 'boar');
  await cast(1, t.x, t.z - 1);
  await settle(260);
  await shot('3-talon-rake');
  await settle(900);
  t = await me();
  await cast(2, t.x, t.z - 1);
  await settle(320);
  await shot('4-shadow-veil');
  await settle(900);
  t = await me();
  await pack(t, [[-1.4, -0.6], [1.4, -0.6], [0, -1.6], [-1, 1], [1, 1]], 'boar');
  await cast(3, t.x, t.z - 1);
  await settle(450);
  await shot('5-blood-moon');
  await settle(1200);
  s = await seen();
  check(['echo_screech', 'talon_rake', 'shadow_veil', 'blood_moon'].every((k) => s.casts[k] >= 1), `all four cast in the room (${JSON.stringify(s.casts)})`);
}

// ---- Loadout C: Bat Swarm, Flit, Blood Scent, Dusk Dive. A fresh run.
if (ONLY !== 'B') {
  if (ONLY !== 'C') {
    await cmd('abandonRun', 'quit');
    await settle(1500);
    await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'duskwing'] });
    await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
    await settle(1500);
    await cmd('partyMode', 'manual');
  }
  slots = await room(['bat_swarm', 'flit', 'blood_scent', 'dusk_dive']);
  t = await me();
  await pack(t, [[-0.7, -2.6], [0.7, -2.6], [0, -3.1]], 'boar');
  await cast(0, t.x, t.z - 2.7);
  await settle(900);
  await shot('6-bat-swarm');
  await settle(900);
  t = await me();
  await pack(t, [[0.4, 0.2]], 'boar');
  await cast(1, t.x + 0.4, t.z);
  await settle(380);
  await shot('7-flit');
  await settle(1200);
  t = await me();
  await pack(t, [[-1.2, 0.6], [1.2, 0.4]], 'boar');
  await settle(1500);
  await shot('8-blood-scent');
  t = await me();
  await pack(t, [[0, -3.0], [0.5, -3.3]], 'boar');
  await cast(3, t.x, t.z - 3.1);
  await settle(450);
  await shot('9-dusk-dive');
  s = await seen();
  check(slots.join(',') === 'bat_swarm,flit,blood_scent,dusk_dive' && ['bat_swarm', 'flit', 'dusk_dive'].every((k) => s.casts[k] >= 1), `all three actives cast in the room (${JSON.stringify(s.casts)})`);
  check(s.swarm >= 1 && s.pulses >= 1, `the swarm bites and Blood Scent pulses (${s.swarm}, ${s.pulses})`);
}

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
