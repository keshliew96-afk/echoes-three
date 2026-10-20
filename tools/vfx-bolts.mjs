#!/usr/bin/env node
// VFX rework PR 3 probe: every projectile in flight wears its template
// (render/vfx/boltfx.js, design-VFX.md §11 "Projectiles").
//
//   1. Data (no browser): every hero projectile (the Healer's bolt, the three
//      shooting basics, every projectile skill) and every foe that shoots or
//      lobs resolves to a template; the head's three faces exist.
//   2. Heroes: each projectile skill is put on a key and cast at dummies;
//      the shot it fires must draw its template head (tally
//      __echoes.content.vfx().bolt[skill].head). A four-hero fight per team
//      must draw the shooting basics' heads.
//   3. Foes: each shooting or lobbing enemy and champion is spawned alone
//      (tough, nearly harmless), each shooting boss met in its own boss room;
//      its shot must draw a head in the shooter's tone.
//
// With --shots <dir> it also writes stills and real-speed clips (virtual
// 30 fps clock) of the lab shots, a hero fight and a foe volley.
//
//   npx vite --port 5199 &
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-bolts.mjs [--url http://127.0.0.1:5199/]
//     [--only data|heroes|fights|foes|bosses|shots] [--kinds mantis,crow] [--shots captures/vfx-bolts]
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CLASS_SKILLS } from '../src/data/classes.js';
import { SKILLS } from '../src/sim/skills.js';
import { VFX_TEMPLATES, FOE_TEMPLATE, vfxTemplateFor, vfxFoeTone } from '../src/data/vfx.js';
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

// ---------------------------------------------------------------- data --
const HEROES = ['healer', 'tank', 'swordsman', 'archer', 'tidecaller', 'bellwright', 'duskwing'];
const POOL = [...new Set([...Object.values(CLASS_SKILLS).flat(), ...Object.values(SKILLS).filter((s) => !s.cls).map((s) => s.id)])];
const SHOT_SKILLS = POOL.filter((id) => SKILLS[id]?.shape === 'projectile');
const clsOf = (id) => SKILLS[id]?.cls ?? 'healer';
// The heroes whose basic attack is a shot (sim/allies.js basicShape, and the
// Healer's own bolt, sim/world.js resolveBasic).
const SHOT_BASICS = ['healer_basic', 'archer_basic', 'tidecaller_basic', 'bellwright_basic'];
// Every foe that fires an enemy shot (sim: ctx.fireShot / boss.js) or lobs
// a glob (spawnGlob). The Hourwarden's weight drops rather than flies and
// keeps its own look; affix globs are pools, not shots.
const SHOOTERS = ['mantis', 'crow', 'vane', 'hollow_choir', 'vein_matron'];
const LOBBERS = ['toad', 'rotcap', 'miller', 'geode'];
const BOSS_SHOTS = ['millwheel', 'skyhorn', 'colossus', 'cantor', 'lichram', 'veinweaver', 'cinderback', 'thornmother'];
{
  const ids = new Set(Object.keys(VFX_TEMPLATES));
  const byCls = {};
  for (const id of SHOT_SKILLS) (byCls[clsOf(id)] ??= []).push(id);
  console.log(`info projectile skills: ${Object.entries(byCls).map(([c, l]) => `${c} ${l.join(', ')}`).join('; ')}`);
  console.log(`info heroes with no projectile skill or shot basic: ${HEROES.filter((h) => !byCls[h] && !SHOT_BASICS.includes(`${h}_basic`)).join(', ')}`);
  const bad = [...SHOT_SKILLS, ...SHOT_BASICS].filter((id) => !ids.has(vfxTemplateFor(null, id)));
  check(bad.length === 0, `all ${SHOT_SKILLS.length} projectile skills and ${SHOT_BASICS.length} shot basics resolve to a template${bad.length ? ` (missing: ${bad.join(', ')})` : ''}`);
  const foes = [...SHOOTERS, ...LOBBERS, ...BOSS_SHOTS];
  const stray = foes.filter((k) => !FOE_TEMPLATE[k]);
  check(stray.length === 0, `all ${foes.length} shooting foes have a template${stray.length ? ` (missing: ${stray.join(', ')})` : ''}`);
  console.log(`info foe shots: ${foes.map((k) => `${k} ${vfxFoeTone(k).corrupt ? 'corrupt' : vfxFoeTone(k).id}`).join(', ')}`);
}
if (only && [...only].every((k) => k === 'data')) process.exit(fails ? 1 : 0);

// ----------------------------------------------------------- the page --
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
  await page.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
  return page;
}
const tally = (page) => page.evaluate(() => __echoes.content.vfx().bolt || {});
const heads = (row) => row?.head ?? 0;
const desc = (row) => Object.entries(row ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing';

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
// n virtual frames (the clock must be on); ticks sim ticks a frame.
async function frames(page, n, still = {}, ticks = 0) {
  for (let i = 0; i < n; i++) {
    await page.evaluate((ms, k) => (k && __echoes.sim.stepN(k, null), __vclock.step(ms)), 1000 / FPS, ticks);
    if (clipDir) await page.screenshot({ path: join(clipDir, `f${String(clipN++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 86 });
    if (SHOTS && still[i]) await page.screenshot({ path: join(SHOTS, `${still[i]}.png`) });
  }
}
// Step the sim a few ticks and let the page draw twice (the director reads
// the shots in flight as it draws).
const drawStep = (page, ticks) =>
  page.evaluate(
    (k) =>
      new Promise((ok) => {
        for (const m of __echoes.state().party || []) __echoes.cmd('setHp', m.id, 1);
        __echoes.sim.stepN(k, null);
        requestAnimationFrame(() => requestAnimationFrame(() => ok()));
      }),
    ticks
  );
async function campaign(page, level, lineup = ['healer', 'tank', 'swordsman', 'archer']) {
  await page.evaluate((level, lineup) => __echoes.cmd('startCampaign', { level, lineup }), level, lineup);
  await page.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 180000, polling: 250 });
  await page.evaluate(() => __echoes.sim.freeze());
}

// --------------------------------------------------------------- heroes --
const seatOf = (page, cls) =>
  page.evaluate((c) => {
    if (c === 'healer') return 0;
    for (const e of __echoes.content.world().entities()) if (e.classId === c && e.partyIndex !== undefined) return e.partyIndex;
    return null;
  }, cls);
// Keys change only out of combat: clear the room, put the set on the keys,
// walk into the next room (the vfx-rework.mjs recipe).
async function equip(page, seat, set) {
  return page.evaluate(
    (seat, set) => {
      const X = __echoes;
      const inCombat = () => (X.state().run || {}).phase === 'combat';
      for (let tries = 0; tries < 5 && inCombat(); tries++) {
        for (let i = 0; i < 60 && inCombat(); i++) {
          X.cmd('killAllEnemies');
          X.sim.stepN(30, null);
        }
        if (inCombat()) {
          X.cmd('skipToRoom', ((X.state().run || {}).room || 1) + 1);
          X.sim.stepN(60, null);
        }
      }
      const put = () => {
        if (seat === 0) X.cmd('restoreSkillState', { slots: set.map((id) => ({ id, remaining: 0 })), override: null, auras: {} });
        else {
          X.cmd('partyPurse', seat, 999);
          set.forEach((id, k) => X.cmd('partySwap', seat, id, k));
        }
      };
      put();
      X.cmd('partyMode', 'manual');
      X.cmd('skipToRoom', ((X.state().run || {}).room || 1) + 1);
      X.sim.stepN(160, null);
      X.cmd('killAllEnemies');
      X.sim.stepN(4, null);
      const keys = () => (seat === 0 ? ((X.cmd('skillState') || {}).slots || []).map((s) => s && s.id) : (X.cmd('partyView', seat) || {}).slots || []);
      if (seat === 0 && !set.every((id) => keys().includes(id))) put();
      return keys();
    },
    seat,
    set
  );
}
async function castOne(page, seat, id, slot) {
  const aim = await page.evaluate((seat) => {
    const X = __echoes;
    X.cmd('killAllEnemies');
    const me = X.content.world().entities().find((e) => e.partyIndex === seat) ?? X.content.world().player;
    const f = { x: me.x, z: me.z - 3.2 };
    for (const [dx, dz] of [[-0.9, 0], [0, -0.5], [0.9, 0]]) X.cmd('spawn', 'dummy', f.x + dx, f.z + dz);
    for (const m of (X.state().party || []).slice(1)) X.cmd('setHp', m.id, 0.5);
    return f;
  }, seat);
  if (seat === 0) {
    const pt = await page.evaluate((f) => __echoes.content.project(f.x, f.z), aim);
    if (pt) await page.mouse.move(pt.x, pt.y);
  }
  const before = heads((await tally(page))[id]);
  await page.evaluate(() => (__echoes.sim.thaw(), __vclock.start()));
  if (seat === 0) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { code: `Digit${k + 1}`, key: String(k + 1) })), slot);
    await frames(page, 3);
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keyup', { code: `Digit${k + 1}`, key: String(k + 1) })), slot);
  } else await page.evaluate((seat, slot, f) => __echoes.cmd('partyCast', seat, slot, f), seat, slot, aim);
  await frames(page, 16, { 7: `cast-${id}` });
  await page.evaluate(() => (__echoes.sim.freeze(), __vclock.stop()));
  return heads((await tally(page))[id]) - before;
}
async function heroes() {
  const teams = [
    ['healer', 'tank', 'swordsman', 'archer'],
    ['healer', 'tidecaller', 'bellwright', 'duskwing'],
  ];
  const missed = [];
  let cast = 0;
  for (const [t, lineup] of teams.entries()) {
    const list = SHOT_SKILLS.filter((id) => lineup.includes(clsOf(id)) && (t === 0 || clsOf(id) !== 'healer'));
    if (!list.length) continue;
    const page = await open(61 + t);
    await campaign(page, 1, lineup);
    await page.evaluate(() => (__echoes.cmd('killAllEnemies'), __echoes.sim.stepN(4, null)));
    clipStart(`casts-${t ? 'B' : 'A'}`);
    for (const cls of lineup) {
      const kit = list.filter((id) => clsOf(id) === cls);
      const seat = await seatOf(page, cls);
      for (let r = 0; r < kit.length; r += 4) {
        const set = kit.slice(r, r + 4);
        const keys = await equip(page, seat, set);
        for (const id of set) {
          const slot = keys.indexOf(id);
          if (slot < 0) {
            missed.push(`${id} (not on a key)`);
            continue;
          }
          const n = await castOne(page, seat, id, slot);
          cast++;
          if (n <= 0) missed.push(id);
          else console.log(`ok   ${cls} ${id} (${vfxTemplateFor(null, id)}): ${n} head(s)`);
        }
      }
    }
    clipEnd(`casts-${t ? 'B' : 'A'}`);
    await page.close();
  }
  check(missed.length === 0, `every hero projectile skill drew its template head (${cast - missed.filter((m) => !m.includes('(')).length}/${SHOT_SKILLS.length})${missed.length ? `; none from: ${missed.join(', ')}` : ''}`);
}

// A busy fight per team with the party on auto: the shooting basics' heads.
async function fights() {
  const teams = [
    ['A', ['healer', 'tank', 'swordsman', 'archer'], ['healer_basic', 'archer_basic']],
    ['B', ['healer', 'tidecaller', 'bellwright', 'duskwing'], ['tidecaller_basic', 'bellwright_basic']],
  ];
  for (const [team, lineup, need] of teams) {
    const page = await open(team === 'A' ? 71 : 72);
    await campaign(page, 1, lineup);
    await page.evaluate(() => {
      const X = __echoes;
      X.cmd('partyMode', 'auto');
      X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
      const p = X.content.world().player;
      ['boar', 'mantis', 'crow', 'toad', 'mantis', 'boar', 'crow'].forEach((k, i) => X.cmd('spawn', k, p.x + (i - 3) * 1.0, p.z - 3 - (i % 2) * 1.0, { hpMul: 4 }));
    });
    const film = !!SHOTS;
    if (film) {
      await page.evaluate(() => __vclock.start());
      clipStart(`fight-${team}`);
      await frames(page, 150, { 40: `fight-${team}-1`, 75: `fight-${team}-2`, 110: `fight-${team}-3`, 140: `fight-${team}-4` }, 60 / FPS);
      clipEnd(`fight-${team}`);
      await page.evaluate(() => __vclock.stop());
    } else for (let i = 0; i < 60; i++) await drawStep(page, 5);
    const t = await tally(page);
    for (const id of need) check(heads(t[id]) > 0, `fight ${team}: ${id} drew ${heads(t[id])} head(s) (${desc(t[id])})`);
    const foe = ['mantis', 'crow', 'toad'].map((k) => `${k} ${heads(t[k])}`).join(', ');
    console.log(`info fight ${team} foe heads: ${foe}`);
    await page.close();
  }
}

// ----------------------------------------------------------------- foes --
async function foes() {
  const page = await open(81);
  await campaign(page, 1);
  await page.evaluate(() => __echoes.cmd('partyMode', 'manual'));
  const list = KINDS ? [...SHOOTERS, ...LOBBERS].filter((k) => KINDS.includes(k)) : [...SHOOTERS, ...LOBBERS];
  const quiet = [];
  for (const kind of list) {
    const before = heads((await tally(page))[kind]);
    const id = await page.evaluate((kind) => {
      const X = __echoes;
      const p = X.content.world().player;
      const ids = new Set(X.content.world().entities().map((q) => q.id));
      // The Miller tosses its sack from 3 to 6.5 u; everyone else from 4.
      X.cmd('spawn', kind, p.x + 0.4, p.z - (kind === 'miller' ? 5.5 : 4), { hpMul: 60, dmgMul: 0.02 });
      const e = X.content.world().entities().find((q) => !ids.has(q.id) && q.kind === kind);
      for (const q of X.content.world().entities()) if (q !== e && q.faction === 'hostile' && q.hp > 0 && q.hittable) X.cmd('setHp', q.id, 0);
      return e ? e.id : null;
    }, kind);
    let t = 0;
    let n = 0;
    for (; t < 1500 && n <= 0; t += 10) {
      // The Rotcap lobs only in death (its spore burst at the corpse).
      if (kind === 'rotcap' && t === 60) await page.evaluate((id) => __echoes.cmd('setHp', id, 0), id);
      await drawStep(page, 10);
      n = heads((await tally(page))[kind]) - before;
    }
    const row = (await tally(page))[kind];
    if (n > 0) console.log(`ok   ${kind} (${vfxFoeTone(kind).corrupt ? 'corrupt' : vfxFoeTone(kind).id}): ${desc(row)} within ${t} ticks`);
    else quiet.push(kind);
  }
  check(quiet.length === 0, `every shooting or lobbing enemy and champion drew its shot's head (${list.length - quiet.length}/${list.length})${quiet.length ? `; none from: ${quiet.join(', ')}` : ''}`);
  await page.close();
}
const actOf = (kind) => Object.values(LEVELS).find((lv) => (lv.bosses ?? [{ kind: lv.boss }]).some((b) => b.kind === kind))?.act ?? 1;
async function bosses() {
  const list = KINDS ? BOSS_SHOTS.filter((b) => KINDS.includes(b)) : BOSS_SHOTS;
  const quiet = [];
  for (const kind of list) {
    const page = await open(90 + list.indexOf(kind));
    await campaign(page, actOf(kind));
    await page.evaluate((kind) => {
      const X = __echoes;
      X.cmd('bossPick', kind);
      X.cmd('skipToRoom', 8);
      for (let i = 0; i < 80 && (X.state().run || {}).phase !== 'combat'; i++) X.sim.stepN(30, null);
      X.cmd('partyMode', 'manual');
      // The Skyhorn's leap (its shards) opens in phase 2, the Cantor's echo
      // shards in its later verses: both are met at a fifth of their health.
      if (kind === 'skyhorn' || kind === 'cantor') X.cmd('bossHp', 0.2, true);
    }, kind);
    let t = 0;
    let n = 0;
    for (; t < 3000 && n <= 0; t += 12) {
      await drawStep(page, 12);
      n = heads((await tally(page))[kind]);
    }
    const row = (await tally(page))[kind];
    console.log(`${n > 0 ? 'ok  ' : 'FAIL'} boss ${kind} (${vfxFoeTone(kind).corrupt ? 'corrupt' : vfxFoeTone(kind).id}, act ${actOf(kind)}): ${desc(row)} within ${t} ticks`);
    if (n <= 0) quiet.push(kind);
    await page.close();
  }
  check(quiet.length === 0, `every shooting boss drew its shot's head (${list.length - quiet.length}/${list.length})`);
}

// ---------------------------------------------------------------- shots --
async function shots() {
  const page = await open(51);
  await campaign(page, 1);
  await page.evaluate(() => {
    __echoes.cmd('killAllEnemies');
    __echoes.sim.stepN(4, null);
    __vclock.start();
  });
  const rows = [
    ['hero', ['blade', 'magic', 'scifi', 'heal']],
    ['foe', ['mantis', 'keener', 'lancer', 'vane']],
    ['big', ['briar_knight', 'hollow_choir', 'millwheel', 'cantor']],
  ];
  for (const [name, names] of rows) {
    const n = await page.evaluate((names) => __echoes.content.vfxBoltShowcase(names), names);
    clipStart(`lab-${name}`);
    await frames(page, Math.round((n * 0.45 + 1.4) * FPS), { 26: `lab-${name}-1`, 40: `lab-${name}-2` });
    clipEnd(`lab-${name}`);
  }
  const t = await tally(page);
  const labHeads = ['lab_blade', 'lab_magic', 'lab_scifi', 'lab_heal'].every((k) => heads(t[k]) > 0);
  check(labHeads, `the lab flew a head for every hero tone (${['lab_blade', 'lab_magic', 'lab_scifi', 'lab_heal'].map((k) => `${k} ${heads(t[k])}`).join(', ')})`);
  await page.close();
}

if (want('heroes')) await heroes();
if (want('fights')) await fights();
if (want('foes')) await foes();
if (want('bosses')) await bosses();
if (want('shots') && SHOTS) await shots();
check(errors.length === 0, `no page or shader errors${errors.length ? `: ${errors.slice(0, 4).join(' | ')}` : ''}`);
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
