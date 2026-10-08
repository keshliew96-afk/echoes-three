#!/usr/bin/env node
// MORE CLASS SKILLS in the real game (docs/CLASS_SKILLS.md): against
// `npm run dev` (port 5199), a Level I campaign room where each new skill is
// swapped into its seat and fired at training dummies, captured as
//   captures/skill-<id>.png   the skill's signature beat mid-play
// It fails on a page error, a refused swap or cast, or a signature recipe that
// never plays (`__echoes.content.vfx().recipes`).
//
//   node tools/class-skills-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--only moonfang,feather_fan]
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
const ONLY = opt('only', null);
const OUT = opt('out', 'captures');
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
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

await page.goto(`${URL0}?seed=3&tips=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (fn, arg, timeout = 120000) => page.waitForFunction(fn, { timeout, polling: 200 }, arg).then(() => true, () => false);
const recipes = () => page.evaluate(() => window.__echoes.content.vfx().recipes);
const body = (cls) => page.evaluate((c) => {
  const w = window.__echoes.content.world();
  if (c === 'healer') return { x: w.player.x, z: w.player.z, seat: 0 };
  const e = w.entities().find((x) => x.classId === c && x.partyIndex !== undefined);
  return e ? { x: e.x, z: e.z, seat: e.partyIndex } : null;
}, cls);

await cmd('startCampaign', { level: 1 });
await waitFor(() => window.__echoes.cmd('runState').phase === 'combat', null, 240000);
await cmd('partyMode', 'manual');
// Clear room 1 (every wave): loadouts change between rooms only.
await page.evaluate(async () => {
  for (let i = 0; i < 600 && window.__echoes.cmd('runState').phase === 'combat'; i++) {
    window.__echoes.cmd('killAllEnemies');
    await new Promise((r) => setTimeout(r, 100));
  }
});
check((await cmd('runState')).phase !== 'combat', 'room 1 cleared');
const NEW = { tank: ['earthshatter', 'rallying_cry', 'earthen_grasp'], swordsman: ['moonfang', 'blade_dance', 'crimson_edge'], archer: ['hunters_mark', 'barbed_trap', 'feather_fan'] };
const SLOT = {};
for (const [cls, ids] of Object.entries(NEW)) {
  const b = await body(cls);
  for (let k = 0; k < ids.length; k++) {
    const sw = await cmd('partySwap', b.seat, ids[k], k);
    check(sw && !sw.denied, `${ids[k]}: swapped into the ${cls}'s slot ${k + 1} (${JSON.stringify(sw?.denied ?? null)})`);
    SLOT[ids[k]] = k;
  }
}
for (const id of ['lantern_ward', 'dawn_brand']) await cmd('giveSkill', id);
const hs = await page.evaluate(() => window.__echoes.content.world().player.skills);
SLOT.lantern_ward = hs.indexOf('lantern_ward');
SLOT.dawn_brand = hs.indexOf('dawn_brand');
check(SLOT.lantern_ward >= 0 && SLOT.dawn_brand >= 0, `the Healer holds Lantern Ward and Dawn Brand (${JSON.stringify(hs)})`);
await cmd('skipToRoom', 2);
await waitFor(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, null, 120000);
await sleep(800);

// [skill, class, aim distance ahead of the caster, dummy layout]
const ALL = [
  ['earthshatter', 'tank', 1.3, 'line'],
  ['rallying_cry', 'tank', 1.5, 'arc'],
  ['earthen_grasp', 'tank', 1.8, 'ring'],
  ['moonfang', 'swordsman', 2.6, 'arc'],
  ['blade_dance', 'swordsman', 0.9, 'ring'],
  ['crimson_edge', 'swordsman', 0.9, 'ring'],
  ['hunters_mark', 'archer', 3.2, 'arc'],
  ['barbed_trap', 'archer', 2.6, 'point'],
  ['feather_fan', 'archer', 2.2, 'arc'],
  ['lantern_ward', 'healer', 1.5, 'arc'],
  ['dawn_brand', 'healer', 2.4, 'point'],
];
const list = ONLY ? ALL.filter((s) => ONLY.split(',').includes(s[0])) : ALL;
const LAYOUT = {
  line: [[0, 0], [0.15, -0.5], [-0.15, 0.4]],
  arc: [[-0.6, 0], [0, -0.3], [0.6, 0]],
  ring: [[-0.7, 0.4], [0.7, 0.4], [0, -0.8]],
  point: [[0, 0], [0.3, 0.2]],
};

for (const [id, cls, dist, lay] of list) {
  const b = await body(cls);
  if (!check(!!b, `${id}: the ${cls} is in the party`)) continue;
  const r0 = await recipes();
  const before = (r0[`skill:${id}`] ?? 0) + (r0[`zone:${id}`] ?? 0);
  // Ring layouts centre on the caster; the rest sit `dist` ahead (screen up).
  const cx = b.x;
  const cz = lay === 'ring' ? b.z : b.z - dist;
  // One tick: the room's enemies and blockers go, the dummies arrive (an
  // empty room would clear and refuse them), the seats' AI stays off.
  await page.evaluate((pts) => {
    const E = window.__echoes;
    const w = E.content.world();
    E.cmd('killAllEnemies');
    for (const e of w.entities()) {
      if (e.kind === 'eglob' || e.kind === 'slick' || e.kind === 'barricade' || e.blocksProjectiles) E.content.world().registry?.despawn?.(e.id);
      if (e.kind === 'ally' && Array.isArray(e.cds)) for (let k = 0; k < e.cds.length; k++) e.cds[k] = 1e9;
    }
    for (const [x, z] of pts) E.cmd('spawn', 'dummy', x, z);
    for (const e of w.entities()) if (e.partyIndex > 0) E.cmd('setHp', e.id, 0.5);
  }, LAYOUT[lay].map(([dx, dz]) => [cx + dx, cz + dz]));
  await sleep(300);
  if (cls === 'healer') {
    await page.evaluate((x, z) => { const p = window.__echoes.content.world().player; p.lastAimDir = { x: 0, z: -1 }; window.__echoes.cmd('aimAt', x, z); }, cx, cz).catch(() => {});
    const code = `Digit${SLOT[id] + 1}`;
    await page.keyboard.down(code);
    await sleep(260);
    await page.keyboard.up(code);
  } else {
    const r = await cmd('partyCast', b.seat, SLOT[id], { x: cx, z: cz });
    check(!(r && r.error), `${id}: cast (${JSON.stringify(r && r.error ? r.error : 'ok')})`);
  }
  const ok = await waitFor((a) => {
    const r = window.__echoes.content.vfx().recipes;
    return (r[`skill:${a.id}`] ?? 0) + (r[`zone:${a.id}`] ?? 0) > a.before;
  }, { id, before }, 30000);
  check(ok, `${id}: its signature beat played`);
  await sleep(id === 'barbed_trap' ? 1400 : id === 'dawn_brand' ? 500 : 180);
  await page.screenshot({ path: `${OUT}/skill-${id}${sfx}.png` });
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(`\n${fails.length ? `${fails.length} FAILED` : 'all passed'}`);
process.exit(fails.length ? 1 : 0);
