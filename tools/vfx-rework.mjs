#!/usr/bin/env node
// vfx-rework — the probe for Kesh's three VFX templates on the seven heroes
// (docs/gauntlet/design-VFX.md §11).
//
//   1. Data (no browser): every hero class and every skill in every pool
//      (the 66 class skills and the Healer's 19) resolves to one of the
//      three templates; the template colours never equal a reserved hue and
//      the blade fire stays clear of Ember.
//   2. Live: each hero's whole kit is cast at training targets and every
//      cast must play its template (the director's tpl:* recipe counters);
//      a fight with the party on auto must play the basics' templates
//      (swings, releases and hits) for both teams of four.
//
// The page runs on a VIRTUAL clock (as tools/vfx-clips.mjs), so effects play
// at true 30 fps time on software GL. With --shots <dir> it also writes a
// still of each cast at its peak and real-speed clips of each hero's reel
// and of the busy fights (needs ffmpeg).
//
//   npx vite --port 5199 &
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-rework.mjs [--url http://127.0.0.1:5199/]
//     [--only data|healer,tank,...,fightA,fightB] [--shots captures/vfx-rework] [--purple safe]
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CLASS_SKILLS } from '../src/data/classes.js';
import { SKILLS } from '../src/sim/skills.js';
import { CLASS_TEMPLATE, SKILL_TEMPLATE, VFX_TEMPLATES, vfxTemplateFor } from '../src/data/vfx.js';
import { PALETTE, VFX_TEMPLATE } from '../src/data/palette.js';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const only = argv.includes('--only') ? new Set(arg('--only').split(',')) : null;
const SHOTS = argv.includes('--shots') ? resolve(here, arg('--shots')) : null;
const PURPLE = arg('--purple', 'vivid');
const want = (k) => !only || only.has(k);
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails++;
};

// ------------------------------------------------------------------ data --
const HEROES = ['healer', 'tank', 'swordsman', 'archer', 'tidecaller', 'bellwright', 'duskwing'];
const IDS = new Set(Object.keys(VFX_TEMPLATES));
{
  check(['magic', 'blade', 'scifi'].every((t) => IDS.has(t)), 'three templates: magic, blade, scifi');
  check(HEROES.every((h) => IDS.has(CLASS_TEMPLATE[h])), `every hero has a template (${HEROES.map((h) => `${h} ${CLASS_TEMPLATE[h]}`).join(', ')})`);
  const pool = [...Object.values(CLASS_SKILLS).flat(), ...Object.values(SKILLS).filter((s) => !s.cls).map((s) => s.id)];
  const unmapped = pool.filter((id) => !IDS.has(vfxTemplateFor(null, id)));
  check(unmapped.length === 0, `all ${pool.length} hero skills resolve to a template${unmapped.length ? ` (missing: ${unmapped.join(', ')})` : ''}`);
  const stray = Object.keys(SKILL_TEMPLATE).filter((id) => !pool.includes(id));
  check(stray.length === 0, `every SKILL_TEMPLATE row names a real skill${stray.length ? ` (stray: ${stray.join(', ')})` : ''}`);
  for (const h of HEROES) check(IDS.has(vfxTemplateFor(h, `${h}_basic`)), `${h} basic -> ${vfxTemplateFor(h, `${h}_basic`)}`);
  const hue = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const d = mx - mn;
    if (!d) return 0;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const gap = (a, b) => {
    const d = Math.abs(hue(a) - hue(b)) % 360;
    return Math.min(d, 360 - d);
  };
  const reserved = [PALETTE.emberDanger, PALETTE.brightHeal, PALETTE.godstuffViolet].map((h) => h.toUpperCase());
  const all = Object.values(VFX_TEMPLATE).flatMap((row) => Object.values(row)).map((h) => h.toUpperCase());
  check(all.every((h) => !reserved.includes(h)), 'no template colour is a reserved hex (Ember, Bright Heal, Violet)');
  const blade = Object.values(VFX_TEMPLATE.blade).filter((h) => h !== VFX_TEMPLATE.blade.smoke);
  const minEmber = Math.min(...blade.map((h) => gap(h, PALETTE.emberDanger)));
  check(minEmber >= 20, `blade fire stays clear of Ember (closest hue gap ${minEmber.toFixed(0)} deg)`);
  console.log(`info magic purple vs Violet: ${gap(VFX_TEMPLATE.magic.purple, PALETTE.godstuffViolet).toFixed(0)} deg (vivid), ${gap(VFX_TEMPLATE.magic.arcaneSafe, PALETTE.godstuffViolet).toFixed(0)} deg (safe magenta)`);
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
  if (PURPLE === 'safe') await page.evaluate(() => import('/src/data/vfx.js').then((m) => m.setArcaneVariant('safe')));
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
async function frames(page, n, still = {}) {
  for (let i = 0; i < n; i++) {
    await page.evaluate((ms) => __vclock.step(ms), 1000 / FPS);
    if (clipDir) await page.screenshot({ path: join(clipDir, `f${String(clipN++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 86 });
    if (SHOTS && still[i]) await page.screenshot({ path: join(SHOTS, `${still[i]}.png`) });
  }
}
const live = (page, on) => page.evaluate((v) => (v ? (__echoes.sim.thaw(), __vclock.start()) : (__echoes.sim.freeze(), __vclock.stop())), on);

// A Level 1 campaign: the first four heroes, or the three later heroes
// beside the Healer.
async function setupTeam(page, team) {
  // A campaign, so the campaign-only skills of each pool can go on a key.
  const lineup = team === 'A' ? ['healer', 'tank', 'swordsman', 'archer'] : ['healer', 'tidecaller', 'bellwright', 'duskwing'];
  await page.evaluate((lineup) => __echoes.cmd('startCampaign', { level: 1, lineup }), lineup);
  await page.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 180000, polling: 250 });
  await page.evaluate(() => {
    __echoes.sim.freeze();
    __echoes.cmd('killAllEnemies');
    __echoes.sim.stepN(4, null);
  });
}
const seatOf = (page, cls) =>
  page.evaluate((c) => {
    for (const e of __echoes.content.world().entities()) if (e.classId === c && e.partyIndex !== undefined) return e.partyIndex;
    return null;
  }, cls);

// Keys change only out of combat: clear the room to its reward, put each
// hero's next set of up to four on its keys (the Healer's through its skill
// state), then walk into the next room.
async function equipAll(page, sets) {
  return page.evaluate((sets) => {
    const X = __echoes;
    const inCombat = () => (X.state().run || {}).phase === 'combat';
    // A room that will not clear by kills (a timed hold) is skipped for the next one.
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
    const denied = [];
    for (const { seat, set } of sets) {
      if (seat === 0) X.cmd('restoreSkillState', { slots: set.map((id) => ({ id, remaining: 0 })), override: null, auras: {} });
      else {
        X.cmd('partyPurse', seat, 999); // swaps cost Glint; the probe pays
        set.forEach((id, k) => {
          const r = X.cmd('partySwap', seat, id, k);
          if (r && r.denied && r.denied !== 'owned') denied.push(`${id}: ${r.denied} (phase ${(X.state().run || {}).phase})`);
        });
      }
    }
    X.cmd('partyMode', 'manual');
    const next = ((X.state().run || {}).room || 1) + 1;
    X.cmd('skipToRoom', next);
    X.sim.stepN(160, null);
    X.cmd('killAllEnemies');
    X.sim.stepN(4, null);
    const out = {};
    if (denied.length) out.denied = denied;
    for (const { seat } of sets) out[seat] = seat === 0 ? ((X.cmd('skillState') || {}).slots || []).map((s) => s && s.id) : (X.cmd('partyView', seat) || {}).slots || [];
    return out;
  }, sets);
}

const KITS = Object.fromEntries(HEROES.filter((h) => h !== 'healer').map((h) => [h, CLASS_SKILLS[h]]));
const HEALER_KIT = Object.values(SKILLS).filter((s) => !s.cls).map((s) => s.id);
const PASSIVE = (id) => SKILLS[id]?.shape === 'aura';

async function castOne(page, cls, seat, id, slot) {
  const near = SKILLS[id].shape === 'melee_arc' || ['bell_swing', 'talon_rake', 'shadow_veil'].includes(id);
  const aim = await page.evaluate(
    (seat, near) => {
      const X = __echoes;
      X.cmd('killAllEnemies');
      const me = X.content.world().entities().find((e) => e.partyIndex === seat) ?? X.content.world().player;
      const f = { x: me.x, z: me.z - (near ? 1.0 : 2.2) };
      for (const [dx, dz] of [[-0.9, 0], [0, -0.5], [0.9, 0]]) X.cmd('spawn', 'dummy', f.x + dx, f.z + dz);
      X.cmd('spawn', 'dummy', me.x + 0.5, me.z);
      for (const m of (X.state().party || []).slice(1)) X.cmd('setHp', m.id, 0.5);
      return f;
    },
    seat,
    near
  );
  if (seat === 0) {
    const pt = await page.evaluate((f) => __echoes.content.project(f.x, f.z), aim);
    if (pt) await page.mouse.move(pt.x, pt.y);
  }
  const before = tplSum(await recipes(page));
  await live(page, true);
  if (seat === 0) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { code: `Digit${k + 1}`, key: String(k + 1) })), slot);
    await frames(page, 3);
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keyup', { code: `Digit${k + 1}`, key: String(k + 1) })), slot);
  } else {
    await page.evaluate((seat, slot, f) => __echoes.cmd('partyCast', seat, slot, f), seat, slot, aim);
  }
  await frames(page, 18, { 5: `${cls}-${id}` });
  await live(page, false);
  return tplSum(await recipes(page)) - before;
}

// Every active skill of every hero on the team, a round of four at a time.
async function teamReel(page, team, heroes) {
  const plan = [];
  for (const cls of heroes) {
    const seat = cls === 'healer' ? 0 : await seatOf(page, cls);
    check(seat != null, `${cls}: in the party (seat ${seat})`);
    if (seat == null) continue;
    const kit = (cls === 'healer' ? HEALER_KIT : KITS[cls]).filter((id) => !PASSIVE(id));
    plan.push({ cls, seat, kit, missed: [] });
  }
  const rounds = Math.max(...plan.map((p) => Math.ceil(p.kit.length / 4)));
  clipStart(`reel-${team}`);
  for (let r = 0; r < rounds; r++) {
    const sets = plan.map((p) => ({ seat: p.seat, set: p.kit.slice(r * 4, r * 4 + 4) })).filter((x) => x.set.length);
    const slots = await equipAll(page, sets);
    if (slots.denied) console.log(`info ${team} round ${r + 1} swaps denied: ${slots.denied.join(', ')}`);
    for (const p of plan) {
      for (const id of p.kit.slice(r * 4, r * 4 + 4)) {
        const slot = (slots[p.seat] || []).indexOf(id);
        if (slot < 0) {
          p.missed.push(`${id} (not on a key)`);
          continue;
        }
        if ((await castOne(page, p.cls, p.seat, id, slot)) <= 0) p.missed.push(id);
      }
    }
  }
  clipEnd(`reel-${team}`);
  for (const p of plan) check(p.missed.length === 0, `${p.cls}: ${p.kit.length - p.missed.length}/${p.kit.length} active skills played their template${p.missed.length ? ` (no template: ${p.missed.join(', ')})` : ''}`);
}

// A busy fight with the party on auto: the basics' templates must play.
async function fight(page, team) {
  const r0 = await recipes(page);
  await page.evaluate(() => {
    const X = __echoes;
    // A fresh campaign's first room: its own enemies plus a pack on top.
    X.cmd('partyMode', 'auto');
    // Seat 0 is the human's hero, which partyMode leaves alone: the leader bot plays it.
    X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
    const p = X.content.world().player;
    const kinds = ['boar', 'mantis', 'boar', 'quillback', 'mantis', 'moth', 'boar'];
    kinds.forEach((k, i) => X.cmd('spawn', k, p.x + (i - 3) * 0.9, p.z - 2.2 - (i % 2) * 0.9));
  });
  clipStart(`fight-${team}`);
  await live(page, true);
  await frames(page, 150, { 40: `fight-${team}-1`, 75: `fight-${team}-2`, 110: `fight-${team}-3`, 140: `fight-${team}-4` });
  await live(page, false);
  clipEnd(`fight-${team}`);
  const r1 = await recipes(page);
  const d = (k) => (r1[k] ?? 0) - (r0[k] ?? 0);
  const need = team === 'A' ? ['tpl:blade_swing', 'tpl:blade_release', 'tpl:blade_hit', 'tpl:magic_release', 'tpl:magic_hit'] : ['tpl:blade_swing', 'tpl:magic_release', 'tpl:magic_hit', 'tpl:blade_hit'];
  for (const k of need) check(d(k) > 0, `fight ${team}: ${k.slice(4)} played ${d(k)}x`);
  const counts = await page.evaluate(() => __echoes.content.vfx().tpl);
  console.log(`info fight ${team} live template primitives at the end: ${JSON.stringify(counts)}`);
}

for (const team of ['A', 'B']) {
  const heroes = team === 'A' ? ['healer', 'tank', 'swordsman', 'archer'] : ['tidecaller', 'bellwright', 'duskwing'];
  // (the B team's Healer is the A team's: its kit is cast once)
  const fightKey = `fight${team}`;
  if (!heroes.some(want) && !want(fightKey)) continue;
  if (heroes.some(want)) {
    const page = await open(team === 'A' ? 11 : 12);
    await setupTeam(page, team);
    await wait(800);
    await teamReel(page, team, heroes.filter(want));
    await page.close();
  }
  if (want(fightKey)) {
    // The fight on a fresh page: the reels leave the run on a shop page.
    const fp = await open(team === 'A' ? 21 : 22);
    await fp.evaluate((lineup) => __echoes.cmd('startCampaign', { level: 1, lineup }), team === 'A' ? ['healer', 'tank', 'swordsman', 'archer'] : ['healer', 'tidecaller', 'bellwright', 'duskwing']);
    await fp.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 180000, polling: 250 });
    await fp.evaluate(() => __echoes.sim.freeze());
    await fight(fp, team);
    await fp.close();
  }
}
check(errors.length === 0, `no page or shader errors${errors.length ? `: ${errors.slice(0, 4).join(' | ')}` : ''}`);
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
