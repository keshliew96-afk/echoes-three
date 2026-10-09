#!/usr/bin/env node
// NEW ENEMIES, BARROW AND HEART in the real game
// (docs/NEW_ENEMIES_BARROW_HEART.md): against `npm run dev` (port 5199),
// stages each new kind in a live Act III or Act IV room and captures (into
// --shots, default captures/):
//   bh-1-keener-tell    the Keener raising its head over its Ember cone
//   bh-2-keener-wail    the keen landing: Ember fill, sound arcs, ash
//   bh-3-sexton-dig     the Sexton kneeling over a grave, dirt flying
//   bh-4-snare-jaws     a sprung snare: bone teeth in their Ember ring
//   bh-5-snare-snap     the jaws closing
//   bh-6-bloom-open     two rooted Blooms opening on the beat
//   bh-7-bloom-pulse    the pulse
//   bh-8-siphon-drink   a Siphon latched and drinking down its tether
// It fails on a page error, a kind without its rig, an attack that never
// lands, a VFX recipe that never plays, a snare or tether never drawn, or a
// death without its recipe.
//
//   node tools/new-enemies-bh-browser.mjs [--url http://127.0.0.1:5199/] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<wrapper adding --no-sandbox>.
import { mkdirSync } from 'node:fs';
import { openAudio, sleep } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};

const { browser, page, errors } = await openAudio(`${URL0}?seed=11&menu=0&story=0&tips=0`);
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const run = () => cmd('runState');
const fx = () => page.evaluate(() => window.__echoes.content.enemyfx());
const recipes = () => page.evaluate(() => window.__echoes.content.vfx().recipes || {});
const ent = (id) =>
  page.evaluate((i) => {
    const e = window.__echoes.content.world().entities().find((x) => x.id === i);
    return e ? { id: e.id, kind: e.kind, x: e.x, z: e.z, hp: e.hp, mode: e.mode, telegraph: !!e.telegraph, latchId: e.latchId ?? null, snareIds: e.snareIds ? [...e.snareIds] : null } : null;
  }, id);
const player = () =>
  page.evaluate(() => {
    const p = window.__echoes.content.world().player;
    return p ? { x: p.x, z: p.z } : null;
  });

await page.evaluate(() => {
  window.__bh = [];
  for (const type of ['keener_wail', 'sexton_dig', 'sexton_bury', 'sexton_snare_trip', 'sexton_snare_snap', 'bloom_root', 'bloom_open', 'bloom_pulse', 'siphon_lash', 'siphon_latch', 'siphon_drink', 'siphon_unlatch'])
    window.__echoes.on(type, (ev) => window.__bh.push({ type, ...ev }));
});
const seen = (type, id) => page.evaluate((t, i) => window.__bh.filter((e) => e.type === t && (i == null || e.id === i)).length, type, id ?? null);
const last = (type, id) => page.evaluate((t, i) => window.__bh.filter((e) => e.type === t && (i == null || e.id === i)).pop() ?? null, type, id ?? null);
async function waitFor(fn, timeout = 30000, poll = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await fn();
    if (v) return v;
    await sleep(poll);
  }
  return null;
}
// Keep the party standing while it stands in harm's way for the camera.
let keepAlive = null;
function hold() {
  keepAlive = setInterval(() => cmd('heal').catch(() => {}), 1500);
}
async function room(act) {
  const r = await run();
  if (r.active) {
    await cmd('abandonRun', 'quit');
    await sleep(400);
  }
  await cmd('startRun', { act });
  await waitFor(async () => (await run()).phase === 'combat', 60000);
  await cmd('skipToRoom', 3, { act });
  await waitFor(async () => {
    const v = await run();
    return v.phase === 'combat' && v.room === 3;
  }, 60000);
  await sleep(800);
  await cmd('killAllEnemies');
  await cmd('teleport', 0, 2.5);
  await sleep(300);
}
hold();
// Staged kinds stand up to the party's blows long enough to be filmed.
// (Spawned and toughened in one evaluate: the party kills a fresh 24 HP
// Keener between two round trips.)
const spawn = (kind, x, z) =>
  page.evaluate(
    (k, px, pz) => {
      const id = window.__echoes.cmd('spawn', k, px, pz);
      const e = window.__echoes.content.world().entities().find((q) => q.id === id);
      if (e) e.hp = e.maxHp = 4000;
      return id;
    },
    kind,
    x,
    z
  );

// ------------------------------------------------------------- Act III --
await room(3);
const keener = await spawn('keener', -0.6, -0.4);
const sexton = await spawn('sexton', 2.6, -1.2);
await sleep(600);
let kinds = (await fx()).rigKinds || [];
check(kinds.includes('keener') && kinds.includes('sexton'), `the Keener and the Sexton have their rigs (${kinds.join(', ')})`);

const tell = await waitFor(async () => (await ent(keener))?.telegraph, 60000, 50);
check(!!tell, 'the Keener raises its cone');
await sleep(500);
await shot('bh-1-keener-tell');
const wailed = await waitFor(() => seen('keener_wail', keener), 8000, 30);
await sleep(90);
await shot('bh-2-keener-wail');
check(!!wailed, 'the keen lands');

const dug = await waitFor(() => seen('sexton_dig', sexton), 60000, 50);
await sleep(250);
await shot('bh-3-sexton-dig');
check(!!dug, 'the Sexton kneels to dig');
const bury = await waitFor(() => last('sexton_bury', sexton), 6000, 50);
check(!!bury, 'the Sexton buries a snare');
check(((await fx()).snares ?? 0) >= 1, `the snare is drawn on the floor (${(await fx()).snares})`);
// Step onto it once it has armed.
await sleep(1000);
if (bury) await cmd('teleport', bury.x, bury.z);
const tripped = await waitFor(() => seen('sexton_snare_trip', sexton), 6000, 30);
check(!!tripped, 'a hero on an armed snare springs it');
await sleep(350);
await shot('bh-4-snare-jaws');
const snapped = await waitFor(() => seen('sexton_snare_snap', sexton), 4000, 20);
await sleep(70);
await shot('bh-5-snare-snap');
check(!!snapped, 'the jaws close');

let rec = await recipes();
for (const r of ['keener_wail', 'sexton_bury', 'sexton_snare_trip', 'sexton_snare_snap']) check((rec[r] ?? 0) >= 1, `VFX recipe ${r} played (${rec[r] ?? 0})`);
await cmd('killAllEnemies');
await sleep(600);
rec = await recipes();
check((rec.keener_death ?? 0) >= 1 && (rec.sexton_death ?? 0) >= 1, `the Keener and the Sexton die with their own recipes (${rec.keener_death ?? 0}, ${rec.sexton_death ?? 0})`);
check(((await fx()).snares ?? 0) === 0, 'a dead Sexton\'s snares are gone from the floor');

// -------------------------------------------------------------- Act IV --
await room(4);
const blooms = [await spawn('bloom', -1.3, 0.4), await spawn('bloom', 1.3, 0.4)];
const siphon = await spawn('siphon', 0, -2.2);
await sleep(600);
kinds = (await fx()).rigKinds || [];
check(kinds.includes('bloom') && kinds.includes('siphon'), `the Bloom and the Siphon have their rigs (${kinds.join(', ')})`);

const rooted = await waitFor(async () => (await Promise.all(blooms.map((b) => seen('bloom_root', b)))).every(Boolean), 10000, 50);
check(!!rooted, 'both Blooms take root');
const opened = await waitFor(() => seen('bloom_open', blooms[0]), 15000, 30);
check(!!opened, 'a Bloom opens on the beat');
await sleep(500);
await shot('bh-6-bloom-open');
const pulsed = await waitFor(() => seen('bloom_pulse', blooms[0]), 3000, 20);
await sleep(70);
await shot('bh-7-bloom-pulse');
check(!!pulsed, 'the Bloom pulses');
const b0 = await last('bloom_open', blooms[0]);
const b1 = await last('bloom_open', blooms[1]);
check(!!b0 && !!b1 && b0.tick === b1.tick, `both Blooms open on the same beat (${b0?.tick}, ${b1?.tick})`);

// The Siphon: let it lash and latch.
const latched = await waitFor(() => seen('siphon_latch', siphon), 30000, 50);
check(!!latched, 'the Siphon latches onto a hero');
await sleep(400);
await shot('bh-8-siphon-drink');
check(((await fx()).drinks ?? 0) >= 1, `the tether is drawn (${(await fx()).drinks}; ${JSON.stringify(await ent(siphon))})`);
const drank = await waitFor(() => seen('siphon_drink', siphon), 3000, 50);
check(!!drank, 'the Siphon drinks');
// Walk away to snap it.
const s = await ent(siphon);
if (s) await cmd('teleport', s.x > 0 ? -6 : 6, s.z > 0 ? -4 : 4);
const unl = await waitFor(() => last('siphon_unlatch', siphon), 6000, 50);
check(!!unl, `the tether snaps (${unl?.cause})`);
const phase = (await run()).phase;

rec = await recipes();
for (const r of ['bloom_root', 'bloom_open', 'bloom_pulse', 'siphon_lash', 'siphon_latch', 'siphon_drink', 'siphon_unlatch']) check((rec[r] ?? 0) >= 1, `VFX recipe ${r} played (${rec[r] ?? 0})`);
for (const id of [...blooms, siphon]) await cmd('setHp', id, 0);
await sleep(600);
rec = await recipes();
check((rec.bloom_death ?? 0) >= 1 && (rec.siphon_death ?? 0) >= 1, `the Bloom and the Siphon die with their own recipes (${rec.bloom_death ?? 0}, ${rec.siphon_death ?? 0}; room ${phase})`);
check(((await fx()).drinks ?? 0) === 0, 'no tether outlives the Siphon');

clearInterval(keepAlive);
const real = errors.filter((e) => !/ResizeObserver/.test(e));
check(real.length === 0, `no page errors${real.length ? `: ${real.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(`${fails.length ? 'FAIL' : 'PASS'} ${fails.length} failing`);
process.exit(fails.length ? 1 : 0);
