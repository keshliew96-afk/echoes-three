// vfx-gallery — VFX redesign probe (docs/gauntlet/design-VFX.md).
// Stages one live run room with every enemy type, fires every class skill of
// the four characters (partyCast for the AI seats, the player's own keys for
// the Healer), then the Hollow Stag's room, and screenshots each beat.
//
//   node tools/vfx-gallery.mjs [prefix] [--only tank,swordsman,archer,healer,enemies,boss]
//
// Writes captures/<prefix>-*.png and captures/<prefix>.json (page errors, the
// VFX layer counts, the fps the run measured). Exits 1 on any page error.
// CHROME: set PUPPETEER_EXECUTABLE_PATH when puppeteer's own browser is not
// installed; --no-sandbox is added when running as root (cloud containers).
import fs from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const prefix = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'vfx';
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? new Set(argv[onlyAt + 1].split(',')) : null;
const want = (k) => !only || only.has(k);
const BASE = process.env.GNTC_BASE || 'http://127.0.0.1:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (page, n) =>
  page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({
  gpu: !process.env.VFX_SWGL,
  background: true,
  extraArgs: [...(root ? ['--no-sandbox'] : []), '--disable-features=NetworkServiceSandbox', ...(process.env.VFX_SWGL ? ['--enable-unsafe-swiftshader'] : [])],
});
fs.mkdirSync('captures', { recursive: true });
const out = { errors: [], shots: [], counts: {}, fps: {} };

async function openPage(url) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => out.errors.push(String(e?.message ?? e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 120, { timeout: 180000, polling: 200 });
  return page;
}
async function shot(page, name) {
  const file = `captures/${prefix}-${name}.png`;
  await page.screenshot({ path: file });
  out.shots.push(file);
  return file;
}
async function fps(page, ms = 2000) {
  return page.evaluate((dur) => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < dur) requestAnimationFrame(f); else res(Math.round((n * 10000) / (performance.now() - t0)) / 10); };
    requestAnimationFrame(f);
  }), ms);
}

// Into a live combat room with a party that owns the given class skills.
async function unusedCombatRoom(page) {
  await page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); });
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000, polling: 200 });
  await sleep(500);
  await page.evaluate(() => window.__echoes.cmd('clearRoom'));
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'draft', { timeout: 30000, polling: 200 });
  await sleep(600);
}

const LOADOUTS = {
  1: ['heavy_slam', 'ground_crack', 'taunting_roar', 'shoulder_charge'],
  2: ['flurry', 'blade_storm', 'crescent_finisher', 'fox_step'],
  3: ['piercing_shot', 'volley', 'rain_of_arrows', 'detonating_charge'],
};
const SECOND = {
  1: ['brutal_cleave', 'whirling_guard', 'shield_wall', 'iron_stance'],
  2: ['lunge_strike', 'caltrops', 'riposte', 'razor_wake'],
  3: ['sundering_nova', 'pinning_arrow', 'vault_shot', 'kestrel_watch'],
};
const CLASS_OF = { 1: 'tank', 2: 'swordsman', 3: 'archer' };

async function equip(page, table) {
  await page.evaluate((t) => {
    const X = window.__echoes;
    for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave');
    for (const s of Object.keys(t)) t[s].forEach((id, k) => X.cmd('partySwap', Number(s), id, k));
  }, table);
}

// Clear the live room, take the given loadouts on the reward page, walk on.
async function nextRoomWith(page, table) {
  await page.evaluate(() => window.__echoes.cmd('clearRoom'));
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'draft', { timeout: 30000, polling: 200 });
  await sleep(600);
  await equip(page, table);
  await page.evaluate(() => window.__echoes.cmd('draftDecline'));
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'path', { timeout: 20000, polling: 200 });
  await page.evaluate(() => window.__echoes.content.world().runSystem().choosePath(0));
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000, polling: 200 });
  await sleep(1500);
}

async function stage(page) {
  // A ring of every enemy type in front of the party, then hold the AI still
  // so each cast is the only thing in its frame.
  return page.evaluate(() => {
    const X = window.__echoes;
    X.cmd('killAllEnemies');
    X.cmd('teleport', 0, 1.2);
    const spots = [[-1.2, 1.6], [0, 2.0], [1.2, 1.6]];
    for (let i = 0; i < 3; i++) X.cmd('placeAlly', i + 1, spots[i][0], spots[i][1]);
    const types = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
    const ids = types.map((t, i) => X.cmd('spawn', t, -3 + i, -1.6 + (i % 2) * 0.6));
    return ids;
  });
}

try {
  if (want('tank') || want('swordsman') || want('archer') || want('enemies')) {
    const page = await openPage(`${BASE}?menu=0&seed=11`);
    await page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); });
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000, polling: 200 });
    for (const pass of [LOADOUTS, SECOND]) {
      await nextRoomWith(page, pass);
      for (const seat of [1, 2, 3]) {
        if (!want(CLASS_OF[seat])) continue;
        for (let slot = 0; slot < 4; slot++) {
          await stage(page);
          await sleep(350);
          const id = pass[seat][slot];
          if (id === 'shield_wall') await page.evaluate(() => { const X = window.__echoes; const p = X.state().party || []; if (p[0]) X.cmd('setHp', p[0].id, 0.5); });
          await page.evaluate((a) => window.__echoes.cmd('partyCast', a[0], a[1], { x: 0, z: -1.4 }), [seat, slot]);
          // -a: the first rendered frame of the cast (impact / sweep); -b: two
          // frames later (follow-through, debris). Frame-counted, so the pair
          // means the same thing on a GPU and on software GL.
          await frames(page, 1);
          await shot(page, `${CLASS_OF[seat]}-${id}-a`);
          await frames(page, 2);
          await shot(page, `${CLASS_OF[seat]}-${id}-b`);
          await sleep(500);
        }
      }
    }
    if (want('enemies')) {
      // Every enemy type telegraphing / firing at the party.
      await stage(page);
      for (let i = 0; i < 6; i++) { await frames(page, 2); await shot(page, `enemies-${i}`); }
      out.fps.enemies = await fps(page);
    }
    out.counts.classFx = await page.evaluate(() => { try { return window.__echoes.content.classFx(); } catch (e) { return String(e); } });
    await page.close();
  }
  if (want('healer')) {
    const page = await openPage(`${BASE}?menu=0&seed=11`);
    await page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); });
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000, polling: 200 });
    const healer = ['spirit_bolt', 'mending_bolt', 'nova_bloom', 'sanctuary', 'bell_toll', 'pale_lance', 'rootsnare', 'mending_tide', 'restorative_wave', 'guardian_bond', 'lantern_flurry', 'hearthsong'];
    for (let i = 0; i < healer.length; i += 4) {
      const group = healer.slice(i, i + 4);
      await nextRoomWith(page, { 0: group });
      for (let k = 0; k < group.length; k++) {
        await stage(page);
        await page.evaluate(() => { const X = window.__echoes; const p = X.state().party || []; for (const m of p.slice(1)) X.cmd('setHp', m.id, 0.5); });
        const pt = await page.evaluate(() => window.__echoes.content.project(0, -1.4));
        await page.mouse.move(pt.x, pt.y);
        await sleep(250);
        await page.keyboard.press(`Digit${k + 1}`);
        await frames(page, 1);
        await shot(page, `healer-${group[k]}-a`);
        await frames(page, 2);
        await shot(page, `healer-${group[k]}-b`);
        await sleep(400);
      }
    }
    await page.close();
  }
  if (want('boss')) {
    const page = await openPage(`${BASE}?menu=0&seed=5`);
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8, { act: 1 }));
    await page.waitForFunction(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 8; }, { timeout: 60000, polling: 200 });
    for (let i = 0; i < 10; i++) { await frames(page, 3); await shot(page, `boss-${i}`); }
    out.fps.boss = await fps(page);
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`captures/${prefix}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ shots: out.shots.length, errors: out.errors, fps: out.fps }, null, 1));
process.exit(out.errors.length ? 1 : 0);
