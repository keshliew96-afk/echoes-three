#!/usr/bin/env node
// Hit feedback (docs/HIT_FEEDBACK.md) in the real game, against `npm run dev`
// (port 5199), audio unlocked:
//   - the tiers: a boar's bite on the Healer is light, a 4x boar's is heavy,
//     a hazard tick is soft, the hit that empties the bar is down (Node, the
//     same hitTier the game uses);
//   - Settings ▸ Gameplay carries the Hit feedback toggle, on by default;
//   - a live boar on your character pulses the edge vignette, draws the arc,
//     flashes the struck rig and plays the thud; a heavy boar adds the camera
//     kick and the heavy thud; an ally struck flashes its rig but never your
//     screen;
//   - with the toggle off a live hit shows nothing and plays the old thud;
//   - nothing shows in the camp; the ?vfxlab=1 panel carries the Hit row.
// Screenshots: captures/hit-*.png (copied to the slice folder by hand).
//
//   node tools/hitfeedback-browser.mjs [--url http://127.0.0.1:5199/]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<wrapper adding --no-sandbox>.
import { mkdirSync } from 'node:fs';
import { openAudio, sleep } from './gntM3-lib.mjs';
import { hitTier, HEAVY_FRAC } from '../src/render/vfx/hitfeedback.js';
import { HIT_CUE_IDS, HIT_CUE_CAL } from '../src/audio/hitcues.js';

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

// 1 — tiers (pure).
const healer = { hp: 92, maxHp: 100 };
const hit = (o) => ({ kind: 'player', amount: 8, delivery: 'contact', shape: 'contact', ...o });
check(hitTier(hit({}), healer) === 'light', 'a boar bite (8 of 100) is light');
check(hitTier(hit({ amount: 100 * HEAVY_FRAC }), healer) === 'heavy', `a hit of ${HEAVY_FRAC * 100}% of the bar is heavy`);
check(hitTier(hit({ amount: 11 }), healer, { kind: 'stag' }) === 'heavy', 'a boss blow of 11% is heavy');
check(hitTier(hit({ amount: 4, delivery: 'hazard', shape: 'hazard' }), healer) === 'soft', 'a hazard tick is soft');
check(hitTier(hit({ amount: 3, shape: 'molten', source: 'molten' }), healer) === 'soft', 'a Molten burn is soft');
check(hitTier(hit({}), { hp: 0, maxHp: 100 }) === 'down', 'the hit that empties the bar is down');
check(hitTier(hit({ amount: 0, absorbed: 8 }), healer) === null, 'a hit the shield took whole shows nothing');
check(hitTier({ kind: 'boar', amount: 30 }, healer) === null, 'an enemy hit is not ours');
check(HIT_CUE_IDS.every((id) => HIT_CUE_CAL[id] !== 0), `the ${HIT_CUE_IDS.length} hit cues carry a measured calDb`);

const { browser, page, errors } = await openAudio(`${URL0}?seed=3&vfxlab=1`);
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const hf = () => page.evaluate(() => window.__echoes.content.hitFeedback());
const S = (k, v) => page.evaluate((key, val) => window.__echoes.app.service('settings').set(key, val, { source: 'probe' }), k, v);
const G = (k) => page.evaluate((key) => window.__echoes.app.service('settings').get(key), k);
const logged = () => page.evaluate(() => window.__echoes.audio.cueLog(600).filter((e) => !e.dropped).map((e) => e.cue));
const W = () => page.evaluate(() => {
  const w = window.__echoes.content.world();
  const party = w.entities().filter((e) => e.partyIndex !== undefined).map((e) => ({ id: e.id, kind: e.kind, classId: e.classId, seat: e.partyIndex, x: e.x, z: e.z, hp: e.hp }));
  return { party };
});
async function waitFor(fn, timeout = 60000, poll = 250) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) {
    v = await fn();
    if (v) return v;
    await sleep(poll);
  }
  return v;
}

// 2 — the setting.
check((await G('gameplay.hitFeedback')) === true, 'gameplay.hitFeedback defaults to on');
await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'gameplay' }));
await sleep(1500);
const rowShown = await page.evaluate(() => !!document.getElementById('ap-gameplay-hitFeedback') && document.body.innerText.includes('Hit feedback') && document.body.innerText.includes('Red edge pulse, flash and camera kick when you are hit'));
check(rowShown, 'Settings ▸ Gameplay shows the Hit feedback row with its note');
await page.screenshot({ path: 'captures/hit-setting.png' });
await page.evaluate(() => window.__echoes.app.back());
await sleep(800);
check(await page.evaluate(() => /Hit feedback/.test(document.getElementById('vfxlab')?.textContent ?? '')), 'the ?vfxlab=1 panel carries the Hit feedback row');

// 3 — a live room. The room's own enemies stay (killing them all would
// clear the room and pause the sim on the reward page); a tough keeper boar
// holds it open, and the party is topped up before each step.
await cmd('startRun', { act: 1 });
await waitFor(async () => (await cmd('runState')).phase === 'combat', 240000);
await cmd('skipToRoom', 3, { act: 1 });
await waitFor(async () => {
  const r = await cmd('runState');
  return r.phase === 'combat' && r.room === 3;
}, 240000);
await sleep(1500);
const st0 = await W();
const me = st0.party.find((p) => p.seat === 0);
check(!!me, `your character is seat 0 (${me && me.kind})`);
const heal = async () => {
  for (const p of (await W()).party) await cmd('setHp', p.id, 1);
};
const inCombat = async () => (await cmd('runState')).phase === 'combat';
await cmd('spawn', 'boar', me.x + 6, me.z + 4, { hpMul: 400 }); // the keeper
const c0 = await hf();
const log0 = (await logged()).length;

// Light: a plain boar next to you.
await heal();
const b1 = await cmd('spawn', 'boar', me.x + 0.9, me.z - 0.4, { hpMul: 400 });
const lightSeen = await waitFor(async () => {
  const c = await hf();
  return c.light > c0.light && c.vignette > 0 ? c : null;
}, 90000, 120);
if (lightSeen) await page.screenshot({ path: 'captures/hit-light-live.png' });
check(!!lightSeen, `a boar's bite on you pulses the edge (vignette ${lightSeen && lightSeen.vignette}, arcs ${lightSeen && lightSeen.arcsLive})`);
check(!!lightSeen && lightSeen.arcs > c0.arcs, 'it draws the arc toward the boar');
check(!!lightSeen && lightSeen.flashes > c0.flashes, 'the struck rig flashes');
await cmd('setHp', b1, 0);

// Heavy: a 3x boar.
await heal();
const c1 = await hf();
const b2 = await cmd('spawn', 'boar', me.x - 0.9, me.z + 0.4, { hpMul: 400, dmgMul: 3 });
const heavySeen = await waitFor(async () => {
  const c = await hf();
  return c.heavy > c1.heavy && c.vignette > 0 ? c : null;
}, 90000, 120);
if (heavySeen) await page.screenshot({ path: 'captures/hit-heavy-live.png' });
check(!!heavySeen, `a 3x boar's bite is heavy (vignette ${heavySeen && heavySeen.vignette})`);
check(!!heavySeen && heavySeen.kicks > c1.kicks, 'a heavy hit kicks the camera');
await cmd('setHp', b2, 0);
const cues = (await logged()).slice(log0);
check(cues.includes('hurt'), 'a light hit plays the party thud');
check(cues.includes('hurt_heavy'), 'a heavy hit plays the heavy thud');

// An ally struck: its rig flashes, your screen stays clear.
await heal();
const c2 = await hf();
const allies = (await W()).party.filter((p) => p.seat !== 0 && p.hp > 0);
const bs = [];
for (const a of allies) bs.push(await cmd('spawn', 'boar', a.x + 0.8, a.z, { hpMul: 400 }));
const allySeen = await waitFor(async () => {
  const c = await hf();
  return c.allyHits > c2.allyHits ? c : null;
}, 90000, 150);
check(!!allySeen && allySeen.flashes > c2.flashes, `an ally struck flashes (${allySeen ? allySeen.allyHits - c2.allyHits : 0} ally hits)`);
for (const b of bs) await cmd('setHp', b, 0);

// Toggle off: hits still land (the thud plays), nothing shows.
await S('gameplay.hitFeedback', false);
await heal();
await sleep(1200);
const c3 = await hf();
const n3 = (await logged()).length;
const b3 = await cmd('spawn', 'boar', me.x + 0.9, me.z + 0.4, { hpMul: 400, dmgMul: 3 });
await waitFor(async () => (await logged()).slice(n3).includes('hurt'), 90000, 200);
await sleep(1500);
const c4 = await hf();
const offCues = (await logged()).slice(n3);
check(await inCombat(), 'the room was still in combat for the toggle-off check');
check(offCues.includes('hurt') && !offCues.includes('hurt_heavy'), `with Hit feedback off a heavy blow plays only the old thud (${offCues.filter((c) => c.startsWith('hurt')).join(',')})`);
check(c4.heavy + c4.light === c3.heavy + c3.light && c4.vignette === 0 && c4.flashes === c3.flashes, `with Hit feedback off a hit shows nothing (light ${c4.light - c3.light}, heavy ${c4.heavy - c3.heavy}, flashes ${c4.flashes - c3.flashes})`);
await cmd('setHp', b3, 0);
await S('gameplay.hitFeedback', true);

// Clean screenshots for review: the lab preview, panel hidden.
await page.evaluate(() => {
  const l = document.getElementById('vfxlab');
  if (l) l.style.display = 'none';
});
await heal();
await sleep(2500);
for (const tier of ['light', 'heavy']) {
  await page.evaluate((t) => window.__echoes.content.hitPreview(t), tier);
  await sleep(60);
  await page.screenshot({ path: `captures/hit-${tier}.png` });
  await sleep(2500);
}

// The lab preview: soft and downed.
const c5 = await hf();
await page.evaluate(() => window.__echoes.content.hitPreview('soft'));
await page.evaluate(() => window.__echoes.content.hitPreview('down'));
const c6 = await hf();
check(c6.soft === c5.soft + 1 && c6.down === c5.down + 1, 'the lab preview plays a soft and a downed hit');

// The camp: nothing shows.
await cmd('abandonRun', 'quit');
await waitFor(async () => !(await cmd('runState')).active, 60000);
await sleep(2500);
const c7 = await hf();
check(c7.vignette === 0 && c7.arcsLive === 0, 'the camp shows no hit feedback');

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL OK');
process.exit(fails.length ? 1 : 0);
