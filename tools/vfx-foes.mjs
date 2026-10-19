#!/usr/bin/env node
// vfx-foes — the probe for VFX rework PR 2: Kesh's three templates on the
// enemies, champions and bosses (docs/gauntlet/design-VFX.md §11, "The foes").
//
//   1. Data (no browser): every enemy kind the sim knows (ENEMY_KINDS, the
//      champions among them) and every boss (BOSS_KINDS) has a template row;
//      foe tones never wear Bright Heal; a corrupted tone goes only to a
//      Heart body or a boss; hero tones never wear Ember or Violet.
//   2. Live, enemies: each kind is spawned alone (tough, nearly harmless)
//      in a Level I room and stepped until it plays a foe beat; every kind
//      that attacks must play its strike, shot or hit.
//   3. Live, bosses: each boss is met in its own level's boss room and must
//      play a strike, and its death must play the fall.
//
// Counts come from the director's per-kind tally (__echoes.content.vfx().foe).
// With --shots <dir> it also writes stills and real-speed clips (virtual
// clock, software GL) of one foe per tone, a busy fight and three bosses.
//
//   npx vite --port 5199 &
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-foes.mjs [--url http://127.0.0.1:5199/]
//     [--only data|enemies|bosses|shots] [--kinds boar,keener] [--shots captures/vfx-foes]
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FOE_TEMPLATE, FOE_BOSSES, FOE_CHAMPIONS, ENEMY_VFX, vfxFoeTone } from '../src/data/vfx.js';
import { PALETTE, VFX_FOE, VFX_TEMPLATE } from '../src/data/palette.js';
import { ENEMY_KINDS } from '../src/sim/enemies.js';
import { BOSS_KINDS } from '../src/sim/boss.js';
import { LEVELS } from '../src/data/levels.js';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const only = argv.includes('--only') ? new Set(arg('--only').split(',')) : null;
const KINDS = argv.includes('--kinds') ? arg('--kinds').split(',') : null;
const SHOTS = argv.includes('--shots') ? resolve(here, arg('--shots')) : null;
const want = (k) => !only || only.has(k);
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails++;
};

// ------------------------------------------------------------------ data --
const ENEMIES = [...ENEMY_KINDS].filter((k) => !FOE_CHAMPIONS.has(k));
const CHAMPS = [...ENEMY_KINDS].filter((k) => FOE_CHAMPIONS.has(k));
const BOSSES = [...BOSS_KINDS];
{
  const T = new Set(['magic', 'blade', 'scifi']);
  const all = [...ENEMY_KINDS, ...BOSSES];
  const missing = all.filter((k) => !T.has(FOE_TEMPLATE[k]));
  check(missing.length === 0, `all ${ENEMIES.length} enemies, ${CHAMPS.length} champions and ${BOSSES.length} bosses have a template${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  const stray = Object.keys(FOE_TEMPLATE).filter((k) => !all.includes(k));
  check(stray.length === 0, `every FOE_TEMPLATE row names a real foe${stray.length ? ` (stray: ${stray.join(', ')})` : ''}`);
  check(CHAMPS.length === FOE_CHAMPIONS.size && BOSSES.every((b) => FOE_BOSSES.has(b)) && FOE_BOSSES.size === BOSSES.length, `the champion (${CHAMPS.length}) and boss (${BOSSES.length}) lists match the sim`);
  const tally = (list) => ['blade', 'magic', 'scifi'].map((t) => `${t} ${list.filter((k) => FOE_TEMPLATE[k] === t).length}`).join(', ');
  console.log(`info enemies: ${tally(ENEMIES)}; champions: ${tally(CHAMPS)}; bosses: ${tally(BOSSES)}`);
  const up = (h) => h.toUpperCase();
  const foeHex = Object.values(VFX_FOE).flatMap((r) => Object.values(r)).map(up);
  check(!foeHex.includes(up(PALETTE.brightHeal)), 'no foe tone wears Bright Heal');
  const heroHex = Object.values(VFX_TEMPLATE).flatMap((r) => Object.values(r)).map(up);
  check(![PALETTE.emberDanger, PALETTE.godstuffViolet, PALETTE.brightHeal].map(up).some((h) => heroHex.includes(h)), 'hero tones never wear Ember, Violet or Bright Heal');
  const corrupt = all.filter((k) => vfxFoeTone(k).corrupt);
  check(corrupt.every((k) => FOE_BOSSES.has(k) || ENEMY_VFX[k]?.heart), `the corrupted tone goes only to Heart bodies and bosses (${corrupt.join(', ')})`);
}
if (only && [...only].every((k) => k === 'data')) process.exit(fails ? 1 : 0);

// ------------------------------------------------------------------ live --
const W = 960;
const H = 540;
const FPS = 30;
const { launchEchoes } = await import('./gnt-arch-browser.mjs');
const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({ gpu: false, width: W, height: H, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(root ? ['--no-sandbox'] : [])] });
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const errors = [];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const VCLOCK = () => {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let vt = 0;
  let queue = [];
  window.requestAnimationFrame = (cb) => {
    if (on) {
      queue.push(cb);
      return queue.length;
    }
    return realRaf(cb);
  };
  performance.now = () => (on ? vt : realNow());
  window.__vclock = {
    start() {
      vt = realNow();
      on = true;
    },
    stop() {
      on = false;
      const q = queue;
      queue = [];
      for (const cb of q) realRaf(cb);
    },
    step(ms) {
      vt += ms;
      const q = queue;
      queue = [];
      for (const cb of q) cb(vt);
      return q.length;
    },
  };
};

async function open(seed) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e?.message ?? e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|webgl|program/i.test(m.text())) errors.push(m.text().slice(0, 300));
  });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(VCLOCK);
  await page.goto(`${URL0}?menu=0&seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 180000, polling: 250 });
  return page;
}
const recipes = (page) => page.evaluate(() => __echoes.content.vfx().recipes);
const tplSum = (r) => Object.entries(r).filter(([k]) => k.startsWith('tpl:')).reduce((n, [, v]) => n + v, 0);

// Frames recorded for a clip (one numbered jpg per virtual frame).
let clipDir = null;
let clipN = 0;
function clipStart(name) {
  if (!SHOTS) return;
  clipDir = join(SHOTS, `${name}-frames`);
  rmSync(clipDir, { recursive: true, force: true });
  mkdirSync(clipDir, { recursive: true });
  clipN = 0;
}
function clipEnd(name) {
  if (!SHOTS || !clipDir) return;
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(clipDir, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(SHOTS, `${name}.mp4`)]);
  } catch (e) {
    console.log(`info no clip for ${name}: ${e.message}`);
  }
  rmSync(clipDir, { recursive: true, force: true });
  clipDir = null;
}
// Step n virtual frames; still[i] names a still to keep at frame i.
async function frames(page, n, still = {}, ticks = 0) {
  for (let i = 0; i < n; i++) {
    await page.evaluate((ms, k) => (k && __echoes.sim.stepN(k, null), __vclock.step(ms)), 1000 / FPS, ticks);
    if (clipDir) await page.screenshot({ path: join(clipDir, `f${String(clipN++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 86 });
    if (SHOTS && still[i]) await page.screenshot({ path: join(SHOTS, `${still[i]}.png`) });
  }
}
const counts = (page) => page.evaluate(() => __echoes.content.vfx().foe);
const STRIKES = ['ring', 'cone', 'lane', 'laser', 'shot', 'hit', 'ward', 'tether'];
const struck = (row) => STRIKES.reduce((n, k) => n + (row?.[k] ?? 0), 0);
const desc = (row) => Object.entries(row ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing';

// Keep the party up and the run in combat: the party's hp is topped up and
// the spawned foe is too tough to fall.
const HOLD = () => {
  for (const m of __echoes.state().party || []) __echoes.cmd('setHp', m.id, 1);
};

async function campaign(page, level, lineup = ['healer', 'tank', 'swordsman', 'archer']) {
  await page.evaluate((level, lineup) => __echoes.cmd('startCampaign', { level, lineup }), level, lineup);
  await page.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 180000, polling: 250 });
  await page.evaluate(() => __echoes.sim.freeze());
}

// ------------------------------------------------------------ enemies --
// Each kind on its own: spawned three units in front of the party (tough,
// nearly harmless), the last one killed only after the next stands.
async function enemies() {
  const page = await open(31);
  await campaign(page, 1);
  await page.evaluate(() => __echoes.cmd('partyMode', 'manual'));
  const list = (KINDS ?? [...ENEMIES, ...CHAMPS]).filter((k) => ENEMY_KINDS.has(k));
  const silent = [];
  for (const kind of list) {
    const res = await page.evaluate(
      (kind, hold) => {
        const X = __echoes;
        const p = X.content.world().player;
        const ids = new Set(X.content.world().entities().map((q) => q.id));
        X.cmd('spawn', kind, p.x + 0.4, p.z - 3, { hpMul: 60, dmgMul: 0.02 });
        const e = X.content.world().entities().find((q) => !ids.has(q.id) && q.kind === kind);
        // Everything else hostile falls, so this kind has the attack
        // governor to itself (the run stays in combat while it stands).
        for (const q of X.content.world().entities()) if (q !== e && q.faction === 'hostile' && q.hp > 0 && q.hittable) X.cmd('setHp', q.id, 0);
        const before = (X.content.vfx().foe || {})[kind] || {};
        const sum = (r) => ['ring', 'cone', 'lane', 'laser', 'shot', 'hit', 'ward', 'tether'].reduce((n, k) => n + (r[k] ?? 0), 0);
        let t = 0;
        for (; t < 1500; t += 30) {
          new Function(hold)();
          X.sim.stepN(30, null);
          const row = (X.content.vfx().foe || {})[kind] || {};
          if (sum(row) > sum(before)) break;
        }
        return { id: e && e.id, ticks: t, row: (X.content.vfx().foe || {})[kind] || {} };
      },
      kind,
      `(${HOLD})()`
    );
    if (struck(res.row) > 0) console.log(`ok   ${kind} (${FOE_TEMPLATE[kind]}): ${desc(res.row)} within ${res.ticks} ticks`);
    else silent.push(`${kind} (${desc(res.row)})`);
  }
  check(silent.length === 0, `every enemy and champion played a foe beat: a strike, shot or hit, or a support's ward or tether (${list.length - silent.length}/${list.length})${silent.length ? `; none from: ${silent.join(', ')}` : ''}`);
  await page.close();
}

// ------------------------------------------------------------- bosses --
const actOf = (kind) => Object.values(LEVELS).find((lv) => (lv.bosses ?? [{ kind: lv.boss }]).some((b) => b.kind === kind))?.act ?? 1;
async function bosses() {
  const list = KINDS ? BOSSES.filter((b) => KINDS.includes(b)) : BOSSES;
  const quiet = [];
  for (const kind of list) {
    const page = await open(40 + list.indexOf(kind));
    await campaign(page, actOf(kind));
    const res = await page.evaluate(
      (kind, hold) => {
        const X = __echoes;
        X.cmd('bossPick', kind);
        X.cmd('skipToRoom', 8);
        for (let i = 0; i < 80 && (X.state().run || {}).phase !== 'combat'; i++) X.sim.stepN(30, null);
        X.cmd('partyMode', 'manual');
        let t = 0;
        const sum = (r) => ['ring', 'cone', 'lane', 'laser', 'shot', 'hit'].reduce((n, k) => n + (r[k] ?? 0), 0);
        for (; t < 2400; t += 30) {
          new Function(hold)();
          X.sim.stepN(30, null);
          const row = (X.content.vfx().foe || {})[kind] || {};
          if (sum(row) >= 3) break;
        }
        X.cmd('killBoss');
        X.sim.stepN(30, null);
        return { ticks: t, row: (X.content.vfx().foe || {})[kind] || {}, boss: ((X.state().run || {}).boss || {}).kind ?? null };
      },
      kind,
      `(${HOLD})()`
    );
    const ok = struck(res.row) > 0 && (res.row.fall ?? 0) > 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} boss ${kind} (${FOE_TEMPLATE[kind]}, act ${actOf(kind)}): ${desc(res.row)} within ${res.ticks} ticks`);
    if (!ok) quiet.push(kind);
    await page.close();
  }
  check(quiet.length === 0, `every boss played its strikes and its fall (${list.length - quiet.length}/${list.length})`);
}

// -------------------------------------------------------------- shots --
async function shots() {
  // The lab strikes of one foe per tone, at play zoom on a Level I floor.
  const page = await open(51);
  await page.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
  await campaign(page, 1);
  await page.evaluate(() => __echoes.cmd('killAllEnemies'));
  for (const kind of ['boar', 'keener', 'lancer', 'vane', 'briar_knight', 'stag']) {
    clipStart(`lab-${kind}`);
    await page.evaluate((k) => __echoes.content.vfxFoeShowcase(k), kind);
    await frames(page, 110, { 6: `lab-${kind}-ring`, 30: `lab-${kind}-cone`, 54: `lab-${kind}-lane`, 75: `lab-${kind}-shot`, 96: `lab-${kind}-fall` });
    clipEnd(`lab-${kind}`);
  }
  await page.close();
  // A busy fight: the four heroes on auto against a mixed pack.
  const fp = await open(52);
  await fp.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
  await campaign(fp, 1);
  await fp.evaluate(() => {
    const X = __echoes;
    X.cmd('partyMode', 'auto');
    X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
    const p = X.content.world().player;
    ['boar', 'mantis', 'keener', 'quillback', 'crow', 'toad', 'vane'].forEach((k, i) => X.cmd('spawn', k, p.x + (i - 3) * 1.0, p.z - 2.6 - (i % 2) * 0.9, { hpMul: 3 }));
  });
  clipStart('fight');
  await frames(fp, 180, { 50: 'fight-1', 90: 'fight-2', 130: 'fight-3', 170: 'fight-4' }, 2);
  clipEnd('fight');
  await fp.close();
  // Three bosses, one per template.
  for (const kind of ['stag', 'thornmother', 'hourwarden']) {
    const bp = await open(60 + kind.length);
    await bp.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
    await campaign(bp, actOf(kind));
    await bp.evaluate((kind) => {
      const X = __echoes;
      X.cmd('bossPick', kind);
      X.cmd('skipToRoom', 8);
      for (let i = 0; i < 80 && (X.state().run || {}).phase !== 'combat'; i++) X.sim.stepN(30, null);
      X.cmd('partyMode', 'auto');
      X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
      X.sim.stepN(120, null);
    }, kind);
    clipStart(`boss-${kind}`);
    await frames(bp, 240, { 60: `boss-${kind}-1`, 120: `boss-${kind}-2`, 180: `boss-${kind}-3`, 235: `boss-${kind}-4` }, 2);
    clipEnd(`boss-${kind}`);
    await bp.close();
  }
}

if (want('enemies')) await enemies();
if (want('bosses')) await bosses();
if (SHOTS && want('shots')) await shots();
check(errors.length === 0, `no page or shader errors${errors.length ? `: ${errors.slice(0, 4).join(' | ')}` : ''}`);
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
