#!/usr/bin/env node
// vfx-roster2 — VFX probe for the content slice 1 creatures
// (docs/gauntlet/design-VFX.md §5b / §6b), against `npm run dev`.
//
//   1. Sunken Mill: a Rotcap and a Lantern Snail with a wounded Rotcap beside
//      it — the snail's mend, the Rotcap's spore burst and spore cloud, both
//      deaths.
//   2. Ashen Barrow: a Barrow Crow and a Brood Spider — the crow's volley,
//      the brood split, the crow / brood / broodling deaths.
//   3. The three boss rooms with the autopilot on: each fight runs until the
//      boss dies (killBoss after a cap), and every Heron / Wyrm recipe has to
//      have played at least once (add phases forced with bossHp).
//
// Each beat reads __echoes.content.vfx().recipes (the director's per-recipe
// counters) and screenshots the frame just after it fires.
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-roster2.mjs [--url http://127.0.0.1:5199/] [--only enemies,bosses]
// Writes captures/vfx-roster2-*.png and captures/vfx-roster2.json; exits 1 on
// any page error or any recipe that never fired.
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
  const f = join('captures', `vfx-roster2-${name}.png`);
  await page.screenshot({ path: join(here, f) });
  out.shots.push(f);
  console.log('  ' + f);
}
const recipes = (page) => page.evaluate(() => __echoes.content.vfx().recipes || {});
// Step the sim in small slices until `name` has fired `n` times (or the cap).
// n counts from the current total, so a beat left over from the room's own
// enemies (a spore glob still in flight) never satisfies it.
async function until(page, name, { n = 1, step = 4, cap = 1200, each = null } = {}) {
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

// --- 1 / 2. enemies ---------------------------------------------------------
if (want('enemies')) {
  // Sunken Mill.
  {
    const { page, errors } = await open();
    await page.evaluate(() => {
      __echoes.sim.freeze();
      __echoes.cmd('skipToRoom', 3, { act: 2 });
      __echoes.sim.stepN(200, null);
      __echoes.cmd('killAllEnemies');
      __echoes.sim.stepN(5, null);
    });
    const ids = await page.evaluate(() => {
      const p = __echoes.content.world().player || { x: 0, z: 0 };
      const x = p.x ?? 0;
      const z = p.z ?? 0;
      const snail = __echoes.cmd('spawn', 'snail', x + 1.2, z - 4.2);
      const hurt = __echoes.cmd('spawn', 'rotcap', x + 2.2, z - 4.6);
      const cap = __echoes.cmd('spawn', 'rotcap', x - 1.4, z - 2.2);
      return { snail, hurt, cap };
    });
    const id = (v) => (typeof v === 'object' && v ? v.id : v);
    await page.evaluate((h) => __echoes.cmd('setHp', h, 0.35), id(ids.hurt));
    const mended = await until(page, 'snail_mend', { step: 3, cap: 600, each: `__echoes.cmd('setHp', ${id(ids.hurt)}, 0.35)` });
    console.log(`mill: snail_mend fired=${mended}`);
    await shot(page, 'mill-snail-mend');
    await page.evaluate((c) => __echoes.cmd('setHp', c, 0), id(ids.cap));
    await shot(page, 'mill-rotcap-burst');
    await until(page, 'rotcap_spore_cloud', { step: 2, cap: 120 });
    await page.evaluate(() => __echoes.sim.stepN(4, null));
    await shot(page, 'mill-rotcap-spore-cloud');
    await page.evaluate((s) => __echoes.cmd('setHp', s, 0), id(ids.snail));
    await shot(page, 'mill-snail-death');
    out.recipes.mill = await recipes(page);
    out.errors.push(...errors);
    await page.close();
  }
  // Ashen Barrow.
  {
    const { page, errors } = await open();
    await page.evaluate(() => {
      __echoes.sim.freeze();
      __echoes.cmd('skipToRoom', 3, { act: 3 });
      __echoes.sim.stepN(200, null);
      __echoes.cmd('killAllEnemies');
      __echoes.sim.stepN(5, null);
    });
    const ids = await page.evaluate(() => {
      const p = __echoes.content.world().player || { x: 0, z: 0 };
      const crow = __echoes.cmd('spawn', 'crow', (p.x ?? 0) - 1.0, (p.z ?? 0) - 4.4);
      const brood = __echoes.cmd('spawn', 'brood', (p.x ?? 0) + 1.6, (p.z ?? 0) - 2.6);
      return { crow, brood };
    });
    const id = (v) => (typeof v === 'object' && v ? v.id : v);
    // The party one-shots a 14 HP crow inside its own telegraph: give this
    // one a deep pool (probe-only) until it has loosed a volley.
    const volley = await until(page, 'crow_volley', { step: 2, cap: 900, each: `const c = __echoes.content.world().entities().find((e) => e.id === ${id(ids.crow)}); if (c) { c.maxHp = 9999; c.hp = 9999; }` });
    console.log(`barrow: crow_volley fired=${volley}`);
    await page.evaluate(() => __echoes.sim.stepN(6, null));
    await shot(page, 'barrow-crow-volley');
    await page.evaluate((b) => __echoes.cmd('setHp', b, 0), id(ids.brood));
    await page.evaluate(() => __echoes.sim.stepN(2, null));
    await shot(page, 'barrow-brood-split');
    await page.evaluate((c) => __echoes.cmd('setHp', c, 0), id(ids.crow));
    await shot(page, 'barrow-crow-death');
    await page.evaluate(() => __echoes.cmd('killAllEnemies'));
    await page.evaluate(() => __echoes.sim.stepN(2, null));
    out.recipes.barrow = await recipes(page);
    out.errors.push(...errors);
    await page.close();
  }
}

// --- 3. bosses ----------------------------------------------------------------
const BOSS_RECIPES = {
  1: [],
  2: ['heron_spear', 'heron_spear_stop', 'heron_wingbeat', 'heron_submerge', 'heron_surface', 'heron_death'],
  3: ['wyrm_breath', 'wyrm_burrow', 'wyrm_emerge', 'wyrm_enrage', 'wyrm_death'],
};
if (want('bosses')) {
  for (const act of [1, 2, 3]) {
    const { page, errors } = await open();
    await page.evaluate((a) => {
      __echoes.sim.freeze();
      __echoes.cmd('skipToRoom', 8, { act: a });
      __echoes.cmd('autopilot', true);
      __echoes.sim.stepN(60, null);
    }, act);
    const want1 = BOSS_RECIPES[act];
    const shotAt = { heron_spear: 'spear', heron_wingbeat: 'wingbeat', heron_submerge: 'submerge', heron_surface: 'surface', wyrm_breath: 'breath', wyrm_burrow: 'burrow', wyrm_emerge: 'emerge', wyrm_enrage: 'enrage' };
    const shotDone = new Set();
    let ticks = 0;
    let forced = false;
    let dead = false;
    let killed = false;
    // The fight: up to 9000 ticks with the autopilot, screenshotting each
    // signature beat the first time it plays; the add phase and the enrage
    // are forced with bossHp once the opening beats have shown.
    while (ticks < 9000) {
      const s = await page.evaluate(() => {
        __echoes.sim.stepN(3, null);
        const st = __echoes.state();
        return { r: __echoes.content.vfx().recipes || {}, boss: st.run.boss ? { hp: st.run.boss.hp, mode: st.run.boss.mode } : null, phase: st.run.phase, room: st.run.room };
      });
      ticks += 3;
      for (const [k, tag] of Object.entries(shotAt)) {
        if (!shotDone.has(k) && (s.r[k] ?? 0) > 0) {
          shotDone.add(k);
          await page.evaluate(() => __echoes.sim.stepN(3, null));
          await shot(page, `act${act}-boss-${tag}`);
        }
      }
      if (!forced && ticks > 900) {
        forced = true;
        await page.evaluate(() => __echoes.cmd('bossHp', 0.45));
      }
      if (!s.boss || !(s.boss.hp > 0)) {
        dead = true;
        break;
      }
    }
    if (!dead) {
      // A capped fight still has to END cleanly: kill it and keep stepping.
      killed = true;
      await page.evaluate(() => __echoes.cmd('killBoss'));
    }
    await page.evaluate(() => __echoes.sim.stepN(2, null));
    await shot(page, `act${act}-boss-death`);
    await page.evaluate(() => __echoes.sim.stepN(240, null));
    const end = await page.evaluate(() => {
      const st = __echoes.state();
      return { phase: st.run.phase, screen: __echoes.runUi().screen, bossfx: st.bossfx, vfx: __echoes.content.vfx() };
    });
    const r = end.vfx.recipes || {};
    const miss = want1.filter((k) => !(r[k] > 0));
    out.fights[act] = { ticks, diedInFight: dead, killBossUsed: killed, after: { phase: end.phase, screen: end.screen }, recipes: r, missing: miss, errors: errors.length };
    out.missing.push(...miss.map((k) => `act ${act}: ${k}`));
    console.log(`act ${act} boss: ticks=${ticks} died=${dead} killBoss=${killed} after=${end.phase}/${end.screen} missing=${JSON.stringify(miss)} errors=${errors.length}`);
    out.errors.push(...errors);
    await page.close();
  }
}

if (want('enemies')) {
  const all = { ...(out.recipes.mill || {}), ...(out.recipes.barrow || {}) };
  for (const k of ['snail_mend', 'rotcap_burst', 'rotcap_spore_cloud', 'rotcap_death', 'snail_death', 'crow_volley', 'brood_split', 'crow_death', 'brood_death', 'broodling_death']) if (!(all[k] > 0)) out.missing.push(k);
}
await browser.close();
writeFileSync(join(here, 'captures', 'vfx-roster2.json'), JSON.stringify(out, null, 1));
for (const e of out.errors) console.log('PAGE ERROR ' + e);
for (const m of out.missing) console.log('MISSING ' + m);
console.log(JSON.stringify({ recipes: out.recipes, missing: out.missing, errors: out.errors.length }));
process.exit(out.errors.length || out.missing.length ? 1 : 0);
