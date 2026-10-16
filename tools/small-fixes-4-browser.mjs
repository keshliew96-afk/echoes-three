#!/usr/bin/env node
// SMALL FIXES 4 — the Gale Herald's haze, in the real game. Against
// `npm run dev` (port 5199) it opens a Level V campaign, forces the Gale
// Herald's crown room, walks in and checks:
//   - a hit on another enemy still lights its body at the full hit flash (1.0);
//   - a hit on the herald lights it at its own flashScale (0.25), not 1.0: the
//     full white flash on that pale, wide-winged body crossed the bloom
//     threshold across the wingspan and veiled the Spire room in white haze;
//   - on that frozen hit frame, the 720 x 420 window round the herald has
//     fewer than 15000 blown (> 235) pixels (about 60000 before the fix);
//   - the Briar Knight (Level I) and the Hollow Choir (Level IV) light at the
//     champions' softer CHAMPION_FLASH (0.4), and their hit frames pass the
//     same blown-pixel bar.
// Captures (into --shots, default captures/): sf4-1-herald-idle,
// sf4-2-herald-hit, sf4-3-<kind>-hit (the sim frozen on the tick of a hit, so
// the flash holds).
//
//   node tools/small-fixes-4-browser.mjs [--url http://127.0.0.1:5199/] [--shots dir]
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
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });

await page.goto(`${URL0}?seed=5&tips=0&story=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function key(code) {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
}
const banner = () => page.evaluate(() => {
  const b = document.getElementById('hud-banner');
  return b ? { text: b.textContent.trim(), show: b.classList.contains('show'), mode: b.dataset.mode ?? null } : null;
});
const champ = () => page.evaluate(() => {
  const st = window.__echoes.state();
  const c = st.room && st.room.champion;
  if (!c || c.id == null) return null;
  const e = (st.enemies || []).find((x) => x.id === c.id);
  return { ...c, x: e ? e.x : null, z: e ? e.z : null };
});
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function closeTip() {
  const tip = await page.evaluate(() => (window.__echoes.tutorial ? window.__echoes.tutorial().debug().tip : null));
  if (tip) {
    await page.keyboard.press('Enter');
    await sleep(400);
  }
  return tip;
}
async function tipAtDoors(want, shotName) {
  for (let i = 0; i < 20; i++) {
    const tp = await page.evaluate(() => window.__echoes.tutorial().debug().tip);
    if (tp === want) {
      await sleep(1800);
      if (shotName) await shot(shotName);
      await closeTip();
      return tp;
    }
    if (tp) await closeTip();
    await sleep(300);
  }
  return null;
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
    await closeTip();
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(900);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  return runView();
}
// Events seen since the last arm (a software-GL page paints about once a
// second, so beats are caught on their events, not by polling state).
await page.evaluate(() => {
  window.__ch = [];
  for (const type of ['champion_spawn', 'champion_tell', 'champion_move', 'champion_rage', 'champion_fall', 'champion_chest'])
    window.__echoes.on(type, (ev) => window.__ch.push({ type, ...ev }));
});
const seen = (type) => page.evaluate((t) => window.__ch.filter((e) => e.type === t).length, type);
const arm = () => page.evaluate(() => { window.__ch.length = 0; });
async function waitEvent(type, timeout = 60000) {
  return page.waitForFunction((t) => window.__ch.some((e) => e.type === t), { timeout, polling: 100 }, type).then(() => true).catch(() => false);
}
// Walk to the crown door and through it; returns the champion once it stands.
async function enterCrown(label) {
  await cmd('crownDoor', 1);
  const v = await toPath();
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.champion) : -1;
  check(side >= 0, `${label}: the doors carry the crown door (asked for the right; a cursed door there moves it) (${v.path && JSON.stringify(v.path.options)})`);
  return { v, side };
}
async function walkIn(side) {
  await arm();
  await cmd('pathChoose', side);
  const v = await waitPhase(['combat']);
  check(v.mode === 'champion', `the room is the champion's (${v.mode})`);
  await waitEvent('champion_spawn');
  await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.champion && r.champion.spawned); }, { timeout: 60000, polling: 250 });
  const c = await champ();
  // The party a few steps in front of it, so the camera frames both.
  if (c && c.x != null) await cmd('teleport', c.x, c.z + 2.6);
  return c;
}


const P = (fn, a) => page.evaluate(fn, a);
await sleep(3000);
await cmd('startCampaign', { level: 5 });
await waitPhase(['combat']);
await cmd('championPick', 'gale_herald');
const { side } = await enterCrown('Level V');
await closeTip();
const c = await walkIn(side);
check(!!c && c.kind === 'gale_herald', `the Gale Herald stands in the room (${c && c.kind})`);
await cmd('teleport', c.x, c.z + 3.2);
await sleep(2500);
await shot('sf4-1-herald-idle');
const flashOf = (id) => P((i) => { const v = window.__echoes.state().enemyfx; return v && v.flash ? v.flash[i] ?? null : null; }, id);
// Freeze the sim, then step it one tick at a time until the next hit that
// matches lands, so its flash holds on screen (the realtime loop steps
// several ticks per software-GL frame and would run the 3-tick flash out).
async function freezeOnHit(hid0, wantHerald) {
  const got = await P(([hid, want]) => {
    const E = window.__echoes;
    E.sim.freeze();
    window.__sf4 = null;
    const ids = new Set(Object.keys(E.state().enemyfx.flash || {}).map(Number));
    const off = E.on('hit', (ev) => {
      if (window.__sf4 == null && ids.has(ev.target) && (ev.target === hid) === want) window.__sf4 = ev.target;
    });
    for (let i = 0; i < 3000 && window.__sf4 == null; i++) E.sim.stepN(1);
    off();
    // Bring the party in front of the champion for the frame: one more tick
    // still holds the 3-tick flash.
    const h = (E.state().enemies || []).find((e) => e.id === hid);
    if (window.__sf4 === hid && h) {
      E.cmd('teleport', h.x, h.z + 3.2);
      E.sim.stepN(1);
    }
    return window.__sf4;
  }, [hid0, wantHerald]);
  await sleep(1500); // a few rendered frames on the frozen tick
  return got;
}
const other = await freezeOnHit(c.id, false);
const otherLit = other != null ? await flashOf(other) : null;
const otherKind = await P((i) => (window.__echoes.state().enemies || []).find((e) => e.id === i)?.kind ?? null, other);
check(other != null && Math.abs(otherLit - 1) < 1e-6, `a hit on another enemy lights it at the full flash (${otherKind} ${other}: ${otherLit})`);
await P(() => window.__echoes.sim.thaw());
// Frame the herald where it stands now (it walks), then wait for its hit.
const hp = await P((id) => (window.__echoes.state().enemies || []).find((e) => e.id === id), c.id);
if (hp) await cmd('teleport', hp.x, hp.z + 3.2);
await sleep(1500);
const her = await freezeOnHit(c.id, true);
const herLit = her != null ? await flashOf(her) : null;
check(her === c.id && Math.abs(herLit - 0.25) < 1e-6, `a hit on the herald lights it at its flashScale 0.25 (${her}: ${herLit})`);
await shot('sf4-2-herald-hit');
await P(() => window.__echoes.sim.thaw());
// Every other champion: the softer CHAMPION_FLASH (0.4).
const others = [[1, 'briar_knight'], [4, 'hollow_choir']];
for (const [level, kind] of others) {
  await cmd('endRun', 'defeat').catch(() => null);
  await sleep(1200);
  await cmd('returnToCamp').catch(() => null);
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(2000);
  await cmd('startCampaign', { level });
  await waitPhase(['combat']);
  await cmd('championPick', kind);
  const { side: sd } = await enterCrown(`Level ${level}`);
  await closeTip();
  const k = await walkIn(sd);
  check(!!k && k.kind === kind, `Level ${level}: ${kind} stands in the room (${k && k.kind})`);
  const id = await freezeOnHit(k.id, true);
  const lit = id != null ? await flashOf(id) : null;
  check(id === k.id && Math.abs(lit - 0.4) < 1e-6, `a hit on the ${kind} lights it at 0.4 (${id}: ${lit})`);
  await shot(`sf4-3-${kind}-hit`);
  await P(() => window.__echoes.sim.thaw());
}
await browser.close();
const sharp = (await import('sharp')).default;
async function blown(name) {
  const { data, info } = await sharp(`${SHOTS}/${name}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.round(info.width / 2 - 360);
  let n = 0;
  for (let y = 0; y < 420; y++) for (let x = x0; x < x0 + 720; x++) {
    const i = (y * info.width + x) * 3;
    if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 235) n += 1;
  }
  return n;
}
{
  const n = await blown('sf4-2-herald-hit');
  check(n < 15000, `the hit frame round the herald is not veiled (${n} blown pixels, under 15000)`);
  for (const [, kind] of others) {
    const m = await blown(`sf4-3-${kind}-hit`);
    check(m < 15000, `the ${kind}'s hit frame is not veiled (${m} blown pixels, under 15000)`);
  }
}
check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
