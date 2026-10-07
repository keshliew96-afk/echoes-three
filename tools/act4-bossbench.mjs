#!/usr/bin/env node
// ACT IV BOSSES bench (docs/ACT_IV_BOSSES.md) — headless Node: the autopilot
// party (Level IV starter kit) dropped into the Heart Chamber against a forced
// boss, per seed: won or wiped, fight seconds, party damage taken, downs.
//   node tools/act4-bossbench.mjs [--bosses cantor,colossus,wyrm,lichram] [--seeds 1-8]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here0 = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const here = resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : here0);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const bosses = opt('bosses', 'cantor,colossus').split(',');
const [s0, s1] = opt('seeds', '1-8').split('-').map(Number);
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { TICK_HZ } = await import(u('src/core/constants.js'));

function fight(kind, seed) {
  const rng = createGameplayRng(seed >>> 0);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  let dmg = 0;
  let downs = 0;
  let start = null;
  const beats = {};
  bus.on('hit', (e) => {
    const t = registry.byId(e.target);
    if (start !== null && t && t.partyIndex !== undefined) dmg += e.amount || 0;
  });
  bus.on('*', (e) => {
    if (start !== null && /^boss_/.test(e.type)) beats[e.type] = (beats[e.type] || 0) + 1;
    if (start !== null && (e.type === 'party_down' || e.type === 'member_down' || e.type === 'downed')) downs += 1;
  });
  run.startRun({ act: 4, boss: kind });
  ap.configure(true);
  world.cmd('skipToRoom', 8);
  let out = null;
  let pct = 1;
  for (let i = 0; i < 20000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (start === null && v.boss && v.boss.active) start = clock.tick;
    if (v.boss && v.boss.active) pct = v.boss.pct;
    if (v.phase === 'victory' || v.phase === 'defeat' || (v.boss && v.boss.cleared)) {
      out = v.phase === 'defeat' ? 'wipe' : 'won';
      break;
    }
  }
  return { kind, seed, out: out ?? 'timeout', sec: Math.round(((clock.tick - (start ?? clock.tick)) / TICK_HZ) * 10) / 10, dmg: Math.round(dmg), bossPct: pct, downs, beats };
}

// --carried: a whole campaign from Level I (the party the Heart Chamber
// really meets); the boss is the seed's own roll.
function carried(seed, force = null) {
  const rng = createGameplayRng(seed >>> 0);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  let kind = null;
  let start = null;
  let pct = 1;
  let dmg = 0;
  bus.on('boss_spawn', (e) => {
    if (run.view().act === 4) {
      kind = e.kind;
      start = clock.tick;
    }
  });
  const by = {};
  bus.on('hit', (e) => {
    const t = registry.byId(e.target);
    if (start !== null && t && t.partyIndex !== undefined) {
      dmg += e.amount || 0;
      const a = registry.byId(e.attacker);
      const k = a ? (a.boss ? `${a.kind}:${e.shape}` : a.kind) : String(e.source || e.shape);
      by[k] = Math.round((by[k] || 0) + (e.amount || 0));
    }
  });
  run.startCampaign({ level: 1 });
  ap.configure(true);
  let level = 1;
  for (let i = 0; i < 400000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (v.act) {
      if (force && v.act === 4 && !(v.boss && v.boss.active)) run.cmd('bossPick', [force]);
      level = v.act;
    }
    if (start !== null && v.boss && v.boss.active) pct = v.boss.pct;
    if (v.phase === 'victory' || v.phase === 'defeat') {
      return { seed, reached: level, boss: kind, out: v.phase, sec: start !== null ? Math.round(((clock.tick - start) / TICK_HZ) * 10) / 10 : null, dmg: Math.round(dmg), bossPct: start !== null ? pct : null, by };
    }
  }
  return { seed, reached: level, boss: kind, out: 'timeout' };
}
if (argv.includes('--carried')) {
  const rs = [];
  const only = opt('only', null);
  const seeds = only ? only.split(',').map(Number) : Array.from({ length: s1 - s0 + 1 }, (_, i) => s0 + i);
  const forces = argv.includes('--bosses') ? bosses : [null];
  for (const f of forces) {
    for (const s of seeds) {
      const r = { force: f, ...carried(s, f) };
      rs.push(r);
      console.log(JSON.stringify(r));
    }
  }
  for (const f of forces) {
    const fr = rs.filter((r) => r.force === f && r.boss);
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    if (fr.length) console.log(`${f}: won ${fr.filter((r) => r.out === 'victory').length}/${fr.length}  median ${med(fr.map((r) => r.sec))} s  damage ${med(fr.map((r) => r.dmg))}  boss left ${med(fr.map((r) => r.bossPct))}`);
  }
  const at4 = rs.filter((r) => r.reached === 4);
  console.log(`carried: reached Level IV ${at4.length}/${rs.length}, met its boss ${at4.filter((r) => r.boss).length}, won ${rs.filter((r) => r.out === 'victory').length}`);
  process.exit(0);
}

const rows = [];
for (const k of bosses) {
  for (let s = s0; s <= s1; s++) {
    const r = fight(k, s);
    rows.push(r);
    console.log(JSON.stringify(r));
  }
}
for (const k of bosses) {
  const rs = rows.filter((r) => r.kind === k);
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(`${k}: won ${rs.filter((r) => r.out === 'won').length}/${rs.length}  median ${med(rs.map((r) => r.sec))} s  damage ${med(rs.map((r) => r.dmg))}  boss left ${med(rs.map((r) => r.bossPct ?? 0))}`);
}
