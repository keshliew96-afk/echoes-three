#!/usr/bin/env node
// Small fixes 2 in the real game, against `npm run dev` (port 5199), audio
// unlocked: the new cues are registered and calibrated; walking a campaign
// into a Healing Spring and a Hunt and a Purge room plays them (read from the
// engine's cue log); a slick patch under the hero plays the slide while the
// hero slides and stops once the slide ends; the ?vfxlab=1 panel carries the
// new Sound rows; the Act IV music trims sit in the other acts' range.
// Screenshots: captures/sf2-*.png.
//
//   node tools/smallfixes2-browser.mjs [--url http://127.0.0.1:5199/]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<wrapper adding --no-sandbox>.
import { mkdirSync } from 'node:fs';
import { openAudio, sleep } from './gntM3-lib.mjs';
import { ENCOUNTER_CUE_IDS, ENCOUNTER_UI_CUE_IDS, ENCOUNTER_CUE_CAL, ENCOUNTER_TAKE_CUES } from '../src/audio/encountercues.js';
import { HEART_CUE_IDS, HEART_CUE_CAL } from '../src/audio/heartcues.js';
import { MUSIC_TRIM } from '../src/audio/music.js';
import { BED_TRIM } from '../src/audio/ambient.js';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
mkdirSync('captures', { recursive: true });
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};

// 1 — data: every new cue measured (no 0 left in the tables), the Act IV
// trims inside the span of the other acts' own.
const sfxIds = ENCOUNTER_CUE_IDS.filter((id) => !ENCOUNTER_UI_CUE_IDS.includes(id));
check(sfxIds.every((id) => ENCOUNTER_CUE_CAL[id] !== undefined && ENCOUNTER_CUE_CAL[id] !== 0), `all ${sfxIds.length} SFX objective / slide cues carry a measured calDb (the ${ENCOUNTER_UI_CUE_IDS.length} UI cues level by their baked peak)`);
check(HEART_CUE_IDS.every((id) => HEART_CUE_CAL[id] !== 0), `all ${HEART_CUE_IDS.length} Act IV creature cues carry a measured calDb`);
check(Object.values(ENCOUNTER_TAKE_CUES).length === 14, 'each of the fourteen encounters has its own Take cue');
const span = (keys) => [Math.min(...keys.map((k) => MUSIC_TRIM[k])) - 1.5, Math.max(...keys.map((k) => MUSIC_TRIM[k])) + 1.5];
const [c0, c1] = span(['combat:wood', 'combat:mill', 'combat:barrow']);
const [b0, b1] = span(['boss:wood', 'boss:mill', 'boss:barrow']);
check(MUSIC_TRIM['combat:heart'] >= c0 && MUSIC_TRIM['combat:heart'] <= c1, `combat:heart trim ${MUSIC_TRIM['combat:heart']} sits with the other acts' (${c0 + 1.5}..${c1 - 1.5})`);
check(MUSIC_TRIM['boss:heart'] >= b0 && MUSIC_TRIM['boss:heart'] <= b1, `boss:heart trim ${MUSIC_TRIM['boss:heart']} sits with the other acts' (${b0 + 1.5}..${b1 - 1.5})`);
check(Number.isFinite(BED_TRIM.heart), `the heart bed has a trim (${BED_TRIM.heart})`);

const { browser, page, errors } = await openAudio(`${URL0}?seed=3`);
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const logged = () => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((e) => !e.dropped).map((e) => e.cue));
const mark = async () => (await logged()).length;
// Cues played since a mark (the log is a ring of 600: compare tails).
const since = async (n0, ids, timeout = 15000) => {
  const t0 = Date.now();
  let got = [];
  while (Date.now() - t0 < timeout) {
    const all = await page.evaluate(() => window.__echoes.audio.cueLog(600).filter((e) => !e.dropped).map((e) => e.cue));
    got = all.slice(Math.max(0, Math.min(n0, all.length - 1)));
    if (ids.every((id) => got.includes(id))) break;
    await sleep(250);
  }
  return got;
};
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
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
const key = async (code, ms = 250) => {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
};

try {
  await page.waitForFunction(() => window.__echoes.audio && window.__echoes.audio.autoplay().contextState === 'running', { timeout: 60000, polling: 250 }).catch(() => null);
  const reg = await page.evaluate(() => window.__echoes.app.service('audio').debug.cues());
  check([...ENCOUNTER_CUE_IDS, ...HEART_CUE_IDS].every((id) => reg.includes(id)), 'the engine has every new cue registered');
  const types = await page.evaluate(() => window.__echoes.app.service('audio').debug.eventTypes());
  check(['event_enter', 'event_open', 'event_take', 'event_leave', 'event_chest', 'purge_start', 'purge_rooted'].every((t) => types.includes(t)), 'the engine listens for the event room and purge events');

  // 2 — a Healing Spring: enter, open the card, take.
  await cmd('startCampaign', { level: 1 });
  await waitPhase(['combat']);
  await cmd('eventDoor', 'healing_spring', 1);
  let v = await toPath();
  for (let g = 0; g < 3 && v.phase === 'path' && !v.path.options.some((o) => o.event); g++) {
    await cmd('pathChoose', 0);
    await waitPhase(['combat'], 60000).catch(() => null);
    v = await toPath();
  }
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.event) : -1;
  if (check(side >= 0, 'the doors carry the forced "?" door')) {
    await sleep(900);
    let n0 = await mark();
    await cmd('pathChoose', side);
    await waitPhase(['event']);
    check((await since(n0, ['ev_enter'])).includes('ev_enter'), 'walking into the "?" room plays ev_enter');
    await cmd('teleport', 1.2, -2.6);
    await sleep(500);
    n0 = await mark();
    await key('KeyE');
    v = await waitPhase(['encounter'], 60000).catch(() => runView());
    check((await since(n0, ['ev_open'])).includes('ev_open'), 'the card opening plays ev_open');
    n0 = await mark();
    await cmd('eventChoose', 'take');
    check((await since(n0, ['ev_spring'])).includes('ev_spring'), 'taking the Healing Spring plays ev_spring');
    await sleep(600);
    await page.screenshot({ path: 'captures/sf2-1-spring.png' });
  }

  // 3 — a Hunt room, then a Purge room, in the same level.
  v = await runView();
  const r = v.room;
  check(!!(await cmd('objectiveRoom', 'hunt', r + 1)), `room ${r + 1} forced to a hunt`);
  check(!!(await cmd('objectiveRoom', 'purge', r + 2)), `room ${r + 2} forced to a purge`);
  const walk = async (mode) => {
    let p = await toPath();
    const i = p.phase === 'path' ? Math.max(0, p.path.options.findIndex((o) => o.win === mode)) : 0;
    const n0 = await mark();
    await cmd('pathChoose', i);
    await waitPhase(['combat'], 60000).catch(() => null);
    return n0;
  };
  let n0 = await walk('hunt');
  let got = await since(n0, ['ob_horn'], 30000);
  check(got.includes('ob_horn'), 'the quarry breaking cover plays the hunting horn (ob_horn)');
  await page.screenshot({ path: 'captures/sf2-2-hunt.png' });
  const q = await page.evaluate(() => (window.__echoes.state().room || {}).quarry || null);
  if (q && q.id != null) await cmd('setHp', q.id, 0);
  n0 = await mark();
  await cmd('clearRoom');
  got = await since(n0, ['ob_won'], 20000);
  check(got.includes('ob_won') && got.includes('room_clear'), 'a won hunt plays the horn triad with the room clear (ob_won)');
  n0 = await walk('purge');
  got = await since(n0, ['ob_purge', 'ob_nest'], 30000);
  check(got.includes('ob_purge') && got.includes('ob_nest'), 'a purge starts with ob_purge and its nests rise with ob_nest');
  const nest = await page.evaluate(() => ((window.__echoes.state().room || {}).nests || []).find((n) => n.alive) || null);
  if (nest) {
    n0 = await mark();
    await cmd('setHp', nest.id, 0);
    got = await since(n0, ['ob_burst'], 15000);
    check(got.includes('ob_burst'), 'a nest bursting plays ob_burst');
  } else check(false, 'a nest stands in the purge room');
  await page.screenshot({ path: 'captures/sf2-3-purge.png' });
  await cmd('abandonRun');
  await sleep(1500);

  // 4 — the slide: a wet patch under the hero in an Act II room; run across
  // it, let go, and listen to the slide while the hero still moves.
  await cmd('startRun', { act: 2 });
  await waitPhase(['combat']);
  await cmd('killAllEnemies');
  const p0 = await page.evaluate(() => window.__echoes.content.world().player);
  await cmd('spawnHazard', 'slip', p0.x, p0.z - 1.5, { r: 2.6, skin: 'wet' });
  await sleep(400);
  n0 = await mark();
  await key('KeyW', 900);
  got = await since(n0, ['sl_wet'], 8000);
  const slides = got.filter((c) => c === 'sl_wet').length;
  check(slides >= 2, `running onto wet stone plays the slide (${slides} grains)`);
  await page.screenshot({ path: 'captures/sf2-4-slide.png' });
  await sleep(2500);
  n0 = await mark();
  await sleep(1500);
  const still = (await since(n0, [], 0)).filter((c) => c.startsWith('sl_')).length;
  check(still === 0, `standing still on it is silent (${still} grains in 1.5 s)`);
  await cmd('abandonRun');
  await sleep(1000);

  // 5 — the lab rows.
  await page.goto(`${URL0}?seed=3&vfxlab=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await sleep(1500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('div')].map((d) => d.firstChild && d.firstChild.nodeType === 3 ? d.firstChild.textContent : (d.firstElementChild ? d.firstElementChild.textContent : '')).filter((t) => /^Sound, (event rooms|objectives|slide)$/.test(t)));
  check(new Set(rows).size === 3, `the vfx lab has the Sound rows for event rooms, objectives and the slide (${[...new Set(rows)].join(', ')})`);
  const glass = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Heart crystal'));
  check(glass, 'the Slick floor row has a Heart crystal patch');
  await page.screenshot({ path: 'captures/sf2-5-lab.png' });
} finally {
  check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await browser.close();
}
console.log(`${fails.length ? 'FAIL' : 'PASS'} ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
