#!/usr/bin/env node
// gntfixM4a6-stag — content r6 F1 / journey r6 J6-F2: the Level-1 Hollow Stag
// against the builds a real player brings. Headless Node sim (built exactly
// like tools/gntCAMPAIGN-camprun.mjs), Level 1 from the camp, the default
// autopilot for pages and combat, with the Healer's socket policy and
// combat play varied:
//   auto   the autopilot as shipped (every bench node auto-filled)
//   strip  the Healer never sockets a node (the critic's "never opened the
//          socket screen" player; the allies' builds are untouched)
//   idle   strip + the Healer stands still in the Stag room (journey stagopen:
//          the game AI alone holds the opening)
// Prints per variant: Stag clears / wipes, fight seconds, downs, the first
// down's time after boss_spawn, the largest single Stag hit, the seeds with
// >= 1 party down anywhere in Level 1 (GP.13 (d)'s rule before 2026-10-03),
// and the bite on seeds 1-5 (a down or a member below 35 % HP). Level 1's
// gate is now gntPARTY-band's HP dip over seeds 1-40 (PLAN GP.13).
//
//   node tools/gntfixM4a6-stag.mjs [--seeds 1-10] [--variants auto,strip,idle] [--root dir] [--out f]
import { pathToFileURL } from 'node:url';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-10');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const VARIANTS = opt('variants', 'auto,strip,idle').split(',');
const ROOT = resolve(opt('root', here));
const OUT = opt('out', null);
const MAX_TICKS = 60000;

async function runOne(seed, variant) {
  const u = (p) => pathToFileURL(join(ROOT, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  const r = { seed, variant, outcome: null, bossTick: null, endTick: null, downsL1: 0, stagDowns: 0, firstDownS: null, maxStagHit: 0, stagHits60: 0, healerSockets: null, partyHpAtBoss: null, minHpFrac: 1, minHpFracStag: 1 };
  let inBoss = false;
  bus.on('boss_spawn', (e) => {
    inBoss = true;
    r.bossTick = e.tick;
    r.healerSockets = (() => {
      const b = world.buildSystem().view();
      let f = 0;
      let n = 0;
      for (const s of b.skills) for (const x of s.sockets) { n += 1; if (x) f += 1; }
      return `${f}/${n}`;
    })();
    r.partyHpAtBoss = registry.all().filter((m) => m.partyIndex !== undefined).sort((a, b) => a.partyIndex - b.partyIndex).map((m) => `${Math.round(m.hp)}/${m.maxHp}`).join(' ');
  });
  bus.on('downed', (e) => {
    r.downsL1 += 1;
    if (inBoss) {
      r.stagDowns += 1;
      if (r.firstDownS === null) r.firstDownS = Math.round(((e.tick - r.bossTick) / 60) * 100) / 100;
    }
  });
  bus.on('hit', (e) => {
    if (e.kind !== 'player' && e.kind !== 'ally') return;
    const t = registry.byId(e.target);
    if (t && t.maxHp > 0) {
      const f = Math.max(0, t.hp) / t.maxHp;
      if (f < r.minHpFrac) r.minHpFrac = f; // unrounded: the 35 % test is strict
      if (inBoss && f < r.minHpFracStag) r.minHpFracStag = f;
    }
    if (!inBoss) return;
    const a = e.attacker !== undefined ? registry.byId(e.attacker) : null;
    const fromStag = (a && a.kind === 'stag') || /stag|quake|trample/i.test(String(e.source ?? ''));
    if (!fromStag) return;
    const amt = e.amount + (e.absorbed ?? 0);
    if (amt > r.maxStagHit) r.maxStagHit = Math.round(amt);
    if (amt >= 60) r.stagHits60 += 1;
  });
  run.startCampaign({ level: 1, challenge: 'standard', harness: true });
  ap.configure(variant === 'auto' ? true : { socket: 'off' });
  for (let i = 0; i < MAX_TICKS; i++) {
    clock.stepOnce((t) => {
      let snap = ap.intents(t, emptySnapshot());
      if (variant === 'idle' && inBoss) snap = emptySnapshot();
      world.step(t, snap);
    });
    const v = run.view();
    if (v.phase === 'defeat' || v.phase === 'victory') { r.outcome = 'wiped'; r.endTick = clock.tick; break; }
    if (v.phase === 'transit' || (v.act ?? 1) > 1) { r.outcome = 'cleared'; r.endTick = clock.tick; break; }
  }
  if (!r.outcome) r.outcome = 'timeout';
  r.fightS = r.bossTick !== null && r.endTick !== null ? Math.round(((r.endTick - r.bossTick) / 60) * 10) / 10 : null;
  if (r.outcome === 'wiped' && r.bossTick === null) r.outcome = 'wiped-before-stag';
  return r;
}

const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const all = [];
for (const variant of VARIANTS) {
  const rows = [];
  for (const seed of SEEDS) rows.push(await runOne(seed, variant));
  all.push(...rows);
  const cleared = rows.filter((x) => x.outcome === 'cleared');
  const downSeeds = rows.filter((x) => x.downsL1 > 0).map((x) => x.seed);
  const down5 = downSeeds.filter((s) => s <= 5).length;
  const bite = rows.filter((x) => x.seed <= 5 && (x.downsL1 > 0 || x.minHpFrac < 0.35)).length;
  console.log(`${variant.padEnd(6)} bite (down or <35% HP) seeds 1-5: ${bite}/5 | min HP med ${Math.round(med(rows.map((x) => x.minHpFrac)) * 1000) / 1000}`);
  console.log(`${variant.padEnd(6)} clears ${cleared.length}/${rows.length} | wipes [${rows.filter((x) => x.outcome !== 'cleared').map((x) => `${x.seed}:${x.outcome}@${x.fightS}s`).join(' ')}] | fight med ${med(cleared.map((x) => x.fightS))} s | stag downs ${rows.reduce((s, x) => s + x.stagDowns, 0)} | first down med ${med(rows.map((x) => x.firstDownS))} s | max stag hit ${Math.max(...rows.map((x) => x.maxStagHit))} | hits>=60 ${rows.reduce((s, x) => s + x.stagHits60, 0)} | down seeds 1-5: ${down5}/5 all: ${downSeeds.length}/${rows.length} | healer sockets ${[...new Set(rows.map((x) => x.healerSockets))].join(',')}`);
}
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log('->', OUT);
}
