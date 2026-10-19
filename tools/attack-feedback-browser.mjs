#!/usr/bin/env node
// ATTACK FEEDBACK (docs/HIT_FEEDBACK.md, "Your damage numbers") in the real
// game, against `npm run dev` (port 5199):
//   - who dealt a hit (Node, the same hitterSeat the game uses): an ally's
//     own id, the Healer's basic bolt with no attacker id, an enemy, a
//     hazard, a keg, and a party victim;
//   - for each class played (the Healer, seat 0 by default, and the Archer,
//     an AI-free seat 3): a live room-3 fight with four heroes and a pack of
//     tough boars prints the viewer's own hits as `own` numerals (Hearth
//     Amber, weight 900, full opacity) and every other outgoing hit as
//     `other` numerals (Bone, 45 % opacity, smaller for the same
//     amount); the game's own/other tally matches a count the probe makes
//     itself from the hit events; both looks share one frame (screenshot);
//   - heals stay Bright Heal; damage on the party stays Bruise Umber.
// Screenshots: captures/attack-<class>[-<lang>].png (copied to the slice
// folder by hand).
//
//   node tools/attack-feedback-browser.mjs [--url http://127.0.0.1:5199/] [--lang zh-Hans] [--classes healer,archer] [--act 1] [--tag name]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import { openAudio, sleep } from './gntM3-lib.mjs';
import { hitterSeat, NUMERAL_WHO } from '../src/render/numbers.js';
import { PALETTE } from '../src/data/palette.js';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', null);
const CLASSES = opt('classes', 'healer,archer').split(',');
const ACT = Number(opt('act', '1')); // the land the fight is on (6 = the Kiln)
const TAG = opt('tag', ''); // extra screenshot name part
mkdirSync('captures', { recursive: true });
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};

// 1 — attribution (pure).
const ents = new Map([
  [11, { id: 11, kind: 'ally', partyIndex: 3 }],
  [12, { id: 12, kind: 'player', partyIndex: 0 }],
  [40, { id: 40, kind: 'boar' }],
  [41, { id: 41, kind: 'hazard' }],
]);
const byId = (id) => ents.get(id) ?? null;
check(hitterSeat({ kind: 'boar', attacker: 11 }, byId) === 3, "an ally's hit names its seat");
check(hitterSeat({ kind: 'boar', attacker: 12, delivery: 'skill' }, byId) === 0, "the Healer's skill names seat 0");
check(hitterSeat({ kind: 'boar', attacker: null, delivery: 'basic', shape: 'projectile' }, byId) === 0, "the Healer's basic bolt (no attacker id) is seat 0");
check(hitterSeat({ kind: 'boar', attacker: 40 }, byId) === null, 'an enemy hitting an enemy is nobody\'s');
check(hitterSeat({ kind: 'boar', attacker: 41 }, byId) === null, 'a hazard is nobody\'s');
check(hitterSeat({ kind: 'boar', attacker: 999, source: 'keg' }, byId) === null, 'a spent keg is nobody\'s');
check(hitterSeat({ kind: 'ally', attacker: 11 }, byId) === null, 'a hit on the party is not outgoing');
const own = NUMERAL_WHO.own;
const other = NUMERAL_WHO.other;
check(own.color !== other.color && own.weight > other.weight && own.sizeMul > other.sizeMul && own.opacity > other.opacity && own.outlineW > other.outlineW, 'own numerals differ from others in colour, weight, size, opacity and outline');
check(![PALETTE.emberDanger, PALETTE.brightHeal, PALETTE.godstuffViolet, PALETTE.bruiseUmber].includes(own.color), 'the own colour is none of Ember, Bright Heal, Violet or Bruise Umber');

const hexRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
let browser, page, errors;
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
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

// The probe's own count from the hit events, with the rule written out again.
const hook = () => page.evaluate(() => {
  window.__af = { own: 0, other: 0 };
  window.__echoes.on('hit', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    const w = window.__echoes.content.world();
    let seat = null;
    if (ev.attacker == null) seat = ev.delivery === 'basic' && ev.shape === 'projectile' ? 0 : null;
    else {
      const a = w.entities().find((e) => e.id === ev.attacker);
      seat = a && Number.isInteger(a.partyIndex) ? a.partyIndex : null;
    }
    const nv = w.netView;
    const mine = nv && Number.isInteger(nv.seat) ? nv.seat : 0;
    window.__af[seat === mine ? 'own' : 'other'] += 1;
  });
});

const visible = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('#dmg-num-layer .dmg-num')]
      .filter((el) => el.style.visibility === 'visible' && Number(el.style.opacity) > 0.3)
      .map((el) => {
        const cs = getComputedStyle(el);
        return { who: el.dataset.who || '', text: el.textContent, color: cs.color, weight: cs.fontWeight, size: parseFloat(cs.fontSize), opacity: Number(el.style.opacity), z: cs.zIndex };
      }),
  );

// One fresh page per class: the class is read while no run is live.
const allErrors = [];
let kinds = {};
for (const cls of CLASSES) {
  ({ browser, page, errors } = await openAudio(`${URL0}?seed=3${LANG ? `&lang=${LANG}` : ''}`));
  await hook();
  await page.evaluate((c) => window.__echoes.settings.set('gameplay.playClass', c), cls);
  await waitFor(() => page.evaluate((c) => window.__echoes.playClass().classId === c, cls), 60000);
  await cmd('startRun', { act: ACT });
  await waitFor(async () => (await cmd('runState')).phase === 'combat', 240000);
  await cmd('skipToRoom', 3, { act: ACT });
  await waitFor(async () => {
    const r = await cmd('runState');
    return r.phase === 'combat' && r.room === 3;
  }, 240000);
  await sleep(1500);
  const seat = await page.evaluate(() => {
    const nv = window.__echoes.content.world().netView;
    return nv && Number.isInteger(nv.seat) ? nv.seat : 0;
  });
  check(cls === 'healer' ? seat === 0 : seat > 0, `${cls}: you play seat ${seat}`);
  const party = await page.evaluate(() => window.__echoes.content.world().entities().filter((e) => e.partyIndex !== undefined).map((e) => ({ id: e.id, seat: e.partyIndex, x: e.x, z: e.z })));
  // A pack of tough boars beside every hero, so everyone is hitting at once.
  for (const p of party) for (let i = 0; i < 2; i++) await cmd('spawn', 'boar', p.x + 1.2 + i * 0.6, p.z + (i ? 0.8 : -0.6), { hpMul: 60 });
  const t0 = await page.evaluate(() => ({ ...window.__echoes.numerals() }));
  await page.evaluate(() => {
    window.__af = { own: 0, other: 0 };
  });
  // The viewer attacks: hold the basic attack toward the nearest boars.
  await page.mouse.move(900, 430);
  await page.mouse.down({ button: 'right' });
  let shot = null;
  const both = await waitFor(async () => {
    const v = await visible();
    const o = v.filter((n) => n.who === 'own');
    const x = v.filter((n) => n.who === 'other');
    if (o.length && x.length) {
      if (!shot) {
        shot = `captures/attack-${cls}${ACT !== 1 ? `-act${ACT}` : ''}${LANG ? `-${LANG}` : ''}${TAG ? `-${TAG}` : ''}.png`;
        await page.screenshot({ path: shot });
      }
      return { o, x };
    }
    return null;
  }, 150000, 150);
  await sleep(2500);
  await page.mouse.up({ button: 'right' });
  check(!!both, `${cls}: your hits and an ally's share one frame (${shot ?? 'no shot'})`);
  if (both) {
    const o = both.o[0];
    const x = both.x[0];
    check(o.color === hexRgb(own.color) && Number(o.weight) >= 900, `${cls}: your numeral is Hearth Amber, weight 900 (${o.color}, ${o.weight}, "${o.text}")`);
    check(x.color === hexRgb(other.color) && x.opacity <= 0.46, `${cls}: an ally's numeral is Bone at 45 % or less (${x.color}, ${x.opacity}, "${x.text}")`);
    check(Number(o.z) > Number(x.z), `${cls}: yours draws above (z ${o.z} over ${x.z})`);
    const per = (n) => n.size / Math.max(1, Math.abs(Number(n.text)));
    const so = both.o.find((n) => Number(n.text) === Number(x.text));
    check(!so || so.size > x.size, `${cls}: same amount prints larger as yours (${so ? `${so.size} vs ${x.size}` : 'no equal pair, size per point ' + per(o).toFixed(2) + ' vs ' + per(x).toFixed(2)})`);
  }
  const t1 = await page.evaluate(() => ({ ...window.__echoes.numerals() }));
  const mine = await page.evaluate(() => ({ ...window.__af }));
  const dOwn = t1.own - t0.own;
  const dOther = t1.other - t0.other;
  check(dOwn > 0 && dOther > 0, `${cls}: own ${dOwn} and other ${dOther} numerals spawned`);
  check(dOwn === mine.own && dOther === mine.other, `${cls}: the game's split matches the probe's count from the hit events (own ${dOwn}/${mine.own}, other ${dOther}/${mine.other})`);
  check(t1.plain === t0.plain, `${cls}: no outgoing numeral spawned without a look (${t1.plain - t0.plain})`);
  // Heals and party damage keep their looks.
  const k = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('#dmg-num-layer .dmg-num')) {
      if (el.dataset.who) continue;
      const c = getComputedStyle(el).color;
      out[c] = (out[c] || 0) + 1;
    }
    return out;
  });
  for (const [c, n] of Object.entries(k)) kinds[c] = (kinds[c] || 0) + n;
  allErrors.push(...errors);
  await browser.close();
}
const allowed = new Set([hexRgb(PALETTE.brightHeal), hexRgb(PALETTE.bruiseUmber), hexRgb(PALETTE.parchment)]);
check(Object.keys(kinds).every((c) => allowed.has(c)), `heals and party damage keep Bright Heal / Bruise Umber (${JSON.stringify(kinds)})`);
check(allErrors.length === 0, `no page errors (${JSON.stringify(allErrors.slice(0, 3))})`);
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
