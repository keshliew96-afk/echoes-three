#!/usr/bin/env node
// NEW ENEMIES, Wood and Mill, in the real game (docs/WOOD_MILL_ENEMIES.md):
// against `npm run dev` (port 5199), in a Level I and a Level II campaign
// room, spawns each new enemy in front of the party and captures (into
// --shots, default captures/):
//   woodmill-<kind>-tell   its attack winding up (the Ember shape on the floor)
//   woodmill-<kind>-beat   the attack landing (its VFX recipe)
//   woodmill-leech-latch   a Mire Leech clinging to the hero
//   woodmill-miller-sack*  the Drowned Miller's sack: its ring, then the landing
//   woodmill-journal-<kind>  its Journal page after it was met
// It fails on a page error, a beat that never comes, a VFX recipe that never
// fires, or (with --lang) a missing translation on the Journal pages.
//
//   node tools/woodmill-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
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
const PART = opt('part', 'all'); // all | wood | mill (the Journal only with all)
const SHOTS = opt('shots', 'captures');
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
mkdirSync(SHOTS, { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack.slice(0, 400) : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });
  console.log(`  ${SHOTS}/${name}${sfx}.png`);
};

await page.goto(`${URL0}?seed=5&story=0&tips=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const recipes = () => page.evaluate(() => window.__echoes.content.vfx().recipes || {});
const me = () => page.evaluate(() => {
  const p = window.__echoes.content.world().entities().find((e) => e.partyIndex === 0);
  return p ? { x: p.x, z: p.z } : { x: 0, z: 0 };
});
const heal = () => page.evaluate(() => {
  for (const e of window.__echoes.content.world().entities()) if (e.partyIndex !== undefined) window.__echoes.cmd('setHp', e.id, 1);
});
const key = async (code) => {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
};
// Events seen since the last arm (a software-GL page paints about once a
// second, so beats are caught on their events, not by polling state).
await page.evaluate(() => {
  window.__wm = [];
  for (const type of ['telegraph_start', 'owl_shriek', 'lasher_lash', 'lasher_yank', 'leech_leap', 'leech_latch', 'leech_drain', 'miller_sweep', 'enemy_glob_land'])
    window.__echoes.on(type, (ev) => window.__wm.push({ type, ...ev }));
});
async function waitEvent(pred, timeout = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    await heal();
    const hit = await page.evaluate((src) => window.__wm.find(new Function('e', `return ${src}`)) || null, pred);
    if (hit) return hit;
    await sleep(100);
  }
  return null;
}
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}

// Room 3 of a Level `level` campaign, a tough keeper boar holding it open.
async function campaignRoom(level) {
  await cmd('startCampaign', { level });
  await waitPhase(['combat']);
  await cmd('skipToRoom', 3);
  await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 3; }, { timeout: 240000, polling: 250 });
  await sleep(1500);
  const p = await me();
  await cmd('spawn', 'boar', p.x + 6, p.z + 5, { hpMul: 400 });
}
// Spawn `kind` in front of you; shoot its warning shape, then its beat.
async function showcase(kind, beat, dz) {
  await heal();
  await page.evaluate(() => (window.__wm.length = 0));
  // Out on the far side from the allies (they run in to melee it, and it
  // would turn on them), its first move ready now.
  const id = await page.evaluate((k, dist) => {
    const X = window.__echoes;
    const w = X.content.world();
    const party = w.entities().filter((e) => e.partyIndex !== undefined);
    const p = party.find((e) => e.partyIndex === 0);
    let ax = 0, az = 0;
    for (const a of party) if (a !== p) { ax += a.x - p.x; az += a.z - p.z; }
    const l = Math.hypot(ax, az) || 1;
    const nid = X.cmd('spawn', k, p.x - (ax / l) * dist, p.z - (az / l) * dist, { hpMul: 30 });
    const e = w.entities().find((x) => x.id === nid);
    if (e) e.nextAttackTick = 0;
    return nid;
  }, kind, Math.abs(dz));
  const tel = await waitEvent(`e.type === 'telegraph_start' && e.id === ${id}`, 240000);
  if (tel) {
    await sleep(350);
    await shot(`woodmill-${kind}-tell`);
  }
  const b = await waitEvent(`e.type === '${beat}' && e.id === ${id}`);
  if (b) await shot(`woodmill-${kind}-beat`);
  return { id, tel, b };
}

// --- the Wood ------------------------------------------------------------
if (PART !== 'mill') {
await campaignRoom(1);
  const v = await cmd('runState');
  check(v.act === 1 && v.phase === 'combat', `a Level I campaign room (act ${v.act}, room ${v.room}, ${v.phase})`);
  const o = await showcase('owl', 'owl_shriek', -4.2);
  check(!!o.tel && !!o.b, `the Shriek Owl marks its cone and shrieks (${o.b ? `${o.b.victims} caught` : 'no shriek'})`);
  await cmd('setHp', o.id, 0);
  const l = await showcase('lasher', 'lasher_lash', -3.4);
  check(!!l.tel && !!l.b, `the Vine Lasher marks its lane and lashes (${l.b ? `${l.b.victims} caught` : 'no lash'})`);
  await cmd('setHp', l.id, 0);
  await sleep(800);
  await cmd('killAllEnemies'); // the room clears: the journal batch is written
  await sleep(1500);
  await cmd('endRun', 'defeat');
  await sleep(1500);
  await cmd('returnToCamp');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(2500);
}
// --- the Mill ------------------------------------------------------------
if (PART !== 'wood') {
await campaignRoom(2);
  const v = await cmd('runState');
  check(v.act === 2 && v.phase === 'combat', `a Level II campaign room (act ${v.act}, room ${v.room}, ${v.phase})`);
  const lt = await showcase('leech', 'leech_latch', -3.0);
  check(!!lt.tel && !!lt.b, 'the Mire Leech marks its leap and latches on');
  if (lt.b) {
    await sleep(900);
    await shot('woodmill-leech-latch');
  }
  await cmd('setHp', lt.id, 0);
  const m = await showcase('miller', 'miller_sweep', -1.4);
  check(!!m.tel && !!m.b, `the Drowned Miller rings himself and sweeps (${m.b ? `${m.b.victims} caught` : 'no sweep'})`);
  await cmd('setHp', m.id, 0);
  // The sack: the miller at range.
  await heal();
  await page.evaluate(() => (window.__wm.length = 0));
  // Five steps out on the far side from the allies, his sack ready now (the
  // allies run in to melee him, and a hugged miller only ever sweeps).
  const m2 = await page.evaluate(() => {
    const X = window.__echoes;
    const w = X.content.world();
    const party = w.entities().filter((e) => e.partyIndex !== undefined);
    const p = party.find((e) => e.partyIndex === 0);
    const al = party.filter((e) => e !== p);
    let ax = 0, az = 0;
    for (const a of al) { ax += a.x - p.x; az += a.z - p.z; }
    const l = Math.hypot(ax, az) || 1;
    const id = X.cmd('spawn', 'miller', p.x - (ax / l) * 5, p.z - (az / l) * 5, { hpMul: 30 });
    const m = w.entities().find((e) => e.id === id);
    if (m) m.nextSackTick = m.nextAttackTick = 0;
    return id;
  });
  const sackTel = await waitEvent(`e.type === 'telegraph_start' && e.id === ${m2}`);
  if (sackTel) {
    await sleep(500);
    await shot('woodmill-miller-sack-tell');
  }
  const sack = await waitEvent(`e.type === 'enemy_glob_land' && e.sack`);
  if (sack) await shot('woodmill-miller-sack');
  check(!!sack, 'the Drowned Miller throws a flour sack');
  const fired = await recipes();
  const want = PART === 'mill' ? ['leech_leap', 'leech_latch', 'miller_sweep', 'miller_sack_land'] : ['owl_shriek', 'lasher_lash', 'leech_leap', 'leech_latch', 'miller_sweep', 'miller_sack_land'];
  check(want.every((k) => fired[k] > 0), `their VFX recipes fired (${want.map((k) => `${k} ${fired[k] ?? 0}`).join(', ')})`);
  await cmd('killAllEnemies');
  await sleep(1500);
  await cmd('endRun', 'defeat');
  await sleep(1500);
  await cmd('returnToCamp');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(3000);
}

// --- the Journal ---------------------------------------------------------
if (PART === 'all') {
  const seen = await page.evaluate(() => ((window.__echoes.save.profile() || {}).journal || {}).seen || {});
  const met = ['owl', 'lasher', 'leech', 'miller'].filter((k) => seen.enemy && k in seen.enemy);
  check(met.length === 4, `the profile's journal met all four (${JSON.stringify(seen.enemy || {})})`);
  let open = false;
  for (let i = 0; i < 6 && !open; i++) {
    await key('KeyJ');
    open = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (!open) {
      await page.keyboard.press('Escape');
      await sleep(3000);
    }
  }
  check(open, 'J opens the Journal');
  const dbg = () => page.evaluate(() => {
    const s = document.querySelector('.st-story');
    return s && s.__journal ? s.__journal() : null;
  });
  for (let i = 0; i < 6; i++) {
    const d = await dbg();
    if (d && d.tab === 'bestiary') break;
    await key('KeyE');
    await sleep(500);
  }
  await sleep(3000);
  for (const k of ['owl', 'lasher', 'leech', 'miller']) {
    await page.evaluate((id) => {
      const b = document.querySelector(`.jr-tile[data-jid="enemy:${id}"]`);
      if (b) b.click();
    }, k);
    await sleep(2500);
    const d = await dbg();
    check(d && d.page && d.page.selected === `enemy:${k}` && !/\?\?\?/.test(d.page.detail || '') && (!d.page.viewer || d.page.viewer.shown === k), `the Journal has the ${k}'s page and model (${d && d.page && (d.page.detail || '').slice(0, 80)})`);
    if (k === 'owl' || k === 'miller') await shot(`woodmill-journal-${k}`);
  }
  if (LANG && LANG !== 'en') {
    const miss = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
    check(miss.length === 0, `no missing ${LANG} lines (${miss.slice(0, 6).join(' | ')})`);
  }
}

await browser.close();
for (const e of errors) console.log('PAGE ERROR ' + e);
check(errors.length === 0, `no page errors (${errors.length})`);
console.log(`\n${fails.length ? 'FAILED' : 'all checks pass'} (${fails.length} failed)`);
process.exit(fails.length ? 1 : 0);
