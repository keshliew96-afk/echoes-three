#!/usr/bin/env node
// vfx-roster3 — VFX probe for the content slice 2 creatures
// (docs/gauntlet/design-VFX.md §5c / §6c).
//
//   1. Hollow Wood: a Briar Wasp and a Thornling — the dart, the planting,
//      the pricks, both deaths.
//   2. Sunken Mill: a Weir Crab and a Bog Lamprey — the snap; the lamprey's
//      rise, lunge and beaching; both deaths.
//   3. Ashen Barrow: a Bone Knight and a Grave Wisp warding a Barrow Ram —
//      the overhead slam, the tether, both deaths.
//   4. The Thornmother, the Millwheel and the Lich Ram with the autopilot
//      on: each fight runs until the boss dies (killBoss after a cap) and
//      every signature recipe has to have played (enrage / add phases
//      forced with bossHp).
//
// Each beat reads __echoes.content.vfx().recipes (the director's per-recipe
// counters) and screenshots the frame just after it fires.
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-roster3.mjs [--url http://127.0.0.1:5199/] [--only enemies,bosses] [--boss thornmother,...]
// Writes captures/vfx-roster3-*.png and captures/vfx-roster3.json; exits 1 on
// any page error or any required recipe that never fired.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const URL0 = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'http://127.0.0.1:5199/';
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : null;
const want = (k) => !only || only.has(k);
const { launchEchoes, openEchoes } = await import('./gnt-arch-browser.mjs');
const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({ gpu: false, width: 1280, height: 720, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(root ? ['--no-sandbox'] : [])] });
mkdirSync(join(here, 'captures'), { recursive: true });
const out = { errors: [], shots: [], recipes: {}, fights: {}, missing: [] };
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function open() {
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=4`, { width: 1280, height: 720 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 180000 });
  return { page, errors };
}
async function shot(page, name) {
  await wait(2600); // SwiftShader renders ~1 fps: let a frame of the CURRENT tick land
  const f = join('captures', `vfx-roster3-${name}.png`);
  await page.screenshot({ path: join(here, f) });
  out.shots.push(f);
  console.log('  ' + f);
}
const recipes = (page) => page.evaluate(() => __echoes.content.vfx().recipes || {});
// Step the sim until `name` has fired n more times (or the cap). `each` runs
// before every step (probe-only rigging such as a deep HP pool).
async function until(page, name, { n = 1, step = 3, cap = 1200, each = null } = {}) {
  n += (await recipes(page))[name] ?? 0;
  for (let t = 0; t < cap; t += step) {
    const r = await page.evaluate(
      (a) => {
        if (a.each) new Function(a.each)();
        __echoes.sim.stepN(a.step, null);
        return __echoes.content.vfx().recipes || {};
      },
      { step, each }
    );
    if ((r[name] ?? 0) >= n) return true;
  }
  return false;
}
// Probe-only: keep these bodies alive (the party one-shots small ones inside
// their own wind-up) until their beat has played.
const deep = (ids) => `for (const e of __echoes.content.world().entities()) if (${JSON.stringify(ids)}.includes(e.id)) { e.maxHp = 9999; e.hp = 9999; }`;
const idOf = (v) => (typeof v === 'object' && v ? v.id : v);

async function room(page, act) {
  await page.evaluate((a) => {
    __echoes.sim.freeze();
    __echoes.cmd('skipToRoom', 3, { act: a });
    __echoes.sim.stepN(200, null);
    __echoes.cmd('killAllEnemies');
    __echoes.sim.stepN(5, null);
  }, act);
}
async function spawn(page, list) {
  return page.evaluate((l) => {
    const p = __echoes.content.world().player || { x: 0, z: 0 };
    return l.map(([k, dx, dz]) => __echoes.cmd('spawn', k, (p.x ?? 0) + dx, (p.z ?? 0) + dz));
  }, list);
}
async function kill(page, ids, name) {
  for (const id of ids) await page.evaluate((i) => __echoes.cmd('setHp', i, 0), idOf(id));
  await page.evaluate(() => __echoes.sim.stepN(2, null));
  await shot(page, name);
}

// --- 1-3. enemies -----------------------------------------------------------
const ENEMY_RECIPES = ['wasp_dart', 'thorn_plant', 'wasp_death', 'thornling_death', 'crab_snap', 'lamprey_rise', 'lamprey_lunge', 'lamprey_beach', 'crab_death', 'lamprey_death', 'knight_slam', 'wisp_tether', 'knight_death', 'gravewisp_death'];
if (want('enemies')) {
  {
    const { page, errors } = await open();
    await room(page, 1);
    const [wasp, thorn] = (await spawn(page, [['wasp', -1.2, -3.6], ['thornling', 1.4, -3.2]])).map(idOf);
    const ids = [wasp, thorn];
    console.log(`wood: wasp_dart=${await until(page, 'wasp_dart', { each: deep(ids) })}`);
    await page.evaluate(() => __echoes.sim.stepN(4, null));
    await shot(page, 'wood-wasp-dart');
    console.log(`wood: thorn_plant=${await until(page, 'thorn_plant', { each: deep(ids), cap: 900 })}`);
    await shot(page, 'wood-thorn-plant');
    await kill(page, [wasp, thorn], 'wood-deaths');
    out.recipes.wood = await recipes(page);
    out.errors.push(...errors);
    await page.close();
  }
  {
    const { page, errors } = await open();
    await room(page, 2);
    const [crab, eel] = (await spawn(page, [['crab', 0.6, -1.6], ['lamprey', -2.0, -4.0]])).map(idOf);
    const ids = [crab, eel];
    console.log(`mill: crab_snap=${await until(page, 'crab_snap', { each: deep(ids) })}`);
    await shot(page, 'mill-crab-snap');
    console.log(`mill: lamprey_lunge=${await until(page, 'lamprey_lunge', { each: deep(ids), cap: 1500 })}`);
    await page.evaluate(() => __echoes.sim.stepN(6, null));
    await shot(page, 'mill-lamprey-lunge');
    console.log(`mill: lamprey_beach=${await until(page, 'lamprey_beach', { each: deep(ids), cap: 300 })}`);
    await kill(page, [crab, eel], 'mill-deaths');
    out.recipes.mill = await recipes(page);
    out.errors.push(...errors);
    await page.close();
  }
  {
    const { page, errors } = await open();
    await room(page, 3);
    const [knight, ram, wisp] = (await spawn(page, [['knight', 0.4, -2.0], ['ram', 2.6, -4.6], ['gravewisp', 3.4, -5.6]])).map(idOf);
    const ids = [knight, ram, wisp];
    console.log(`barrow: wisp_tether=${await until(page, 'wisp_tether', { each: deep(ids) })}`);
    await page.evaluate(() => __echoes.sim.stepN(12, null));
    await shot(page, 'barrow-wisp-tether');
    console.log(`barrow: knight_slam=${await until(page, 'knight_slam', { each: deep(ids), cap: 1500 })}`);
    await shot(page, 'barrow-knight-slam');
    await kill(page, [knight, wisp, ram], 'barrow-deaths');
    out.recipes.barrow = await recipes(page);
    out.errors.push(...errors);
    await page.close();
  }
  const all = { ...(out.recipes.wood || {}), ...(out.recipes.mill || {}), ...(out.recipes.barrow || {}) };
  for (const k of ENEMY_RECIPES) if (!(all[k] > 0)) out.missing.push(k);
}

// --- 4. bosses ----------------------------------------------------------------
const BOSSES = {
  thornmother: { act: 1, need: ['thorn_seed_volley', 'thorn_seed_root', 'thorn_charge_windup', 'thorn_charge', 'thorn_charge_end', 'thornmother_death'], shots: ['thorn_seed_root', 'thorn_charge', 'thorn_charge_end', 'thorn_burst'] },
  millwheel: { act: 2, need: ['millwheel_spokes', 'millwheel_shards', 'millwheel_crosscut_windup', 'millwheel_crosscut', 'millwheel_cut_end', 'millwheel_death'], shots: ['millwheel_shards', 'millwheel_crosscut', 'millwheel_cut_end'] },
  lichram: { act: 3, need: ['lichram_rush_windup', 'lichram_rush', 'lichram_stuck', 'lichram_grave_call', 'lichram_grave_burst', 'lichram_grave_raise', 'lichram_enrage', 'lichram_death'], shots: ['lichram_rush', 'lichram_stuck', 'lichram_grave_burst', 'lichram_enrage'] },
};
if (want('bosses')) {
  const pick = argv.includes('--boss') ? argv[argv.indexOf('--boss') + 1].split(',') : null;
  for (const [kind, B] of Object.entries(BOSSES)) {
    if (pick && !pick.includes(kind)) continue;
    const { page, errors } = await open();
    await page.evaluate(
      (k, a) => {
        __echoes.sim.freeze();
        if (__echoes.state().run?.active) __echoes.cmd('abandonRun', 'quit');
        __echoes.cmd('startRun', { act: a, boss: k });
        __echoes.sim.stepN(30, null);
        __echoes.cmd('skipToRoom', 8, { act: a });
        __echoes.cmd('autopilot', true);
        __echoes.sim.stepN(60, null);
      },
      kind,
      B.act
    );
    const who = await page.evaluate(() => __echoes.state().run.boss?.kind ?? __echoes.content.world().entities().find((e) => e.boss)?.kind ?? null);
    const shotDone = new Set();
    let ticks = 0;
    let forced = false;
    let dead = false;
    let killed = false;
    while (ticks < 9000) {
      const s = await page.evaluate(() => {
        // Probe-only: keep the party standing, so the fight ends with the
        // boss's death beat and not a wipe.
        for (const m of __echoes.state().party || []) __echoes.cmd('setHp', m.id, 1);
        __echoes.sim.stepN(3, null);
        const st = __echoes.state();
        return { r: __echoes.content.vfx().recipes || {}, boss: st.run.boss ? { hp: st.run.boss.hp } : null };
      });
      ticks += 3;
      for (const k of B.shots) {
        if (!shotDone.has(k) && (s.r[k] ?? 0) > 0) {
          shotDone.add(k);
          await page.evaluate(() => __echoes.sim.stepN(3, null));
          await shot(page, `${kind}-${k.replace(/^(thorn|millwheel|lichram)_/, '')}`);
        }
      }
      const done = B.need.filter((k) => k !== `${kind}_death`).every((k) => (s.r[k] ?? 0) > 0);
      if (!forced && (ticks > 1500 || done)) {
        forced = true;
        await page.evaluate(() => __echoes.cmd('bossHp', 0.35));
      }
      if (!s.boss || !(s.boss.hp > 0)) {
        dead = true;
        break;
      }
      if (forced && done && ticks > 2400) break;
    }
    if (!dead) {
      killed = true;
      await page.evaluate(() => __echoes.cmd('killBoss'));
    }
    await page.evaluate(() => __echoes.sim.stepN(2, null));
    await shot(page, `${kind}-death`);
    await page.evaluate(() => __echoes.sim.stepN(240, null));
    const end = await page.evaluate(() => ({ phase: __echoes.state().run.phase, vfx: __echoes.content.vfx() }));
    const r = end.vfx.recipes || {};
    const miss = B.need.filter((k) => !(r[k] > 0));
    out.fights[kind] = { boss: who, ticks, diedInFight: dead, killBossUsed: killed, phase: end.phase, recipes: r, missing: miss, errors: errors.length };
    out.missing.push(...miss.map((k) => `${kind}: ${k}`));
    console.log(`${kind}: boss=${who} ticks=${ticks} died=${dead} killBoss=${killed} after=${end.phase} missing=${JSON.stringify(miss)} errors=${errors.length}`);
    out.errors.push(...errors);
    await page.close();
  }
}

await browser.close();
writeFileSync(join(here, 'captures', 'vfx-roster3.json'), JSON.stringify(out, null, 1));
for (const e of out.errors) console.log('PAGE ERROR ' + e);
for (const m of out.missing) console.log('MISSING ' + m);
console.log(JSON.stringify({ recipes: out.recipes, missing: out.missing, errors: out.errors.length }));
process.exit(out.errors.length || out.missing.length ? 1 : 0);
