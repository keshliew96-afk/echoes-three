#!/usr/bin/env node
// gntfixM4b5 — F6 "the Tank draws fire" (PLAN GP.5): the share of hostile
// attack STARTS aimed at each party member over carried campaigns (Level 1 ->
// 3, the default-build autopilot + the §25.8 ally AI in Suggested mode — the
// CAMPAIGN runner's recipe), in Node on the working tree (the sim is
// deterministic; the critic's browser probe steps the same sim).
//   starts = telegraph_start / enemy_bite / enemy_fire with a party target.
//   ALL    = every start of the campaign (the critic's gntccontent5-aggro metric)
//   TAUNT  = starts in live combat rooms where the Tank holds a taunt source
//            (Taunting Roar equipped or a Provoke socketed — the gate's clause)
// With --base <v0.5.150 checkout> the same recipe runs there (no party
// system) for the baseline share. Also records, per start, the attacker's
// distance to every standing member (the targeting geometry) and the party's
// damage / downs per level.
//   node tools/gntfixM4b5-aggro.mjs [--seeds 1-3] [--base <dir>] [--tag now]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-3');
const SEEDS = seedsArg.includes('-') ? (() => { const [a, b] = seedsArg.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : seedsArg.split(',').map(Number);
const BASE = opt('base');
const TAG = opt('tag', 'now');
const MAX_TICKS = 260000;

async function load(root) {
  const u = (p) => pathToFileURL(join(root, p)).href;
  return {
    rng: await import(u('src/core/rng.js')),
    reg: await import(u('src/core/registry.js')),
    ev: await import(u('src/core/events.js')),
    clk: await import(u('src/core/clock.js')),
    world: await import(u('src/sim/world.js')),
    intents: await import(u('src/core/intents.js')),
    ver: await import(u('src/version.js')),
  };
}

function runCampaign(T, seed) {
  let impl = T.rng.createGameplayRng(seed);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (q) => impl.chance(q),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = T.rng.createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = T.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = T.reg.createRegistry();
  const bus = T.ev.createEventBus();
  const clock = T.clk.createClock();
  const world = T.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const P = typeof world.partySystem === 'function' ? world.partySystem() : null;
  const byId = (id) => registry.byId(id);
  const member = (i) => registry.all().find((e) => e.partyIndex === i);
  const M = {
    all: [0, 0, 0, 0],
    taunt: [0, 0, 0, 0],
    live: [0, 0, 0, 0],
    byKind: {},
    geo: [], // per start: [targetSeat, dH, dT, dS, dA, tauntSrc, kind]
    levels: {},
    tauntRooms: 0,
    rooms: 0,
    firstTauntRoom: null,
    tauntApplied: 0,
    hits: [0, 0, 0, 0],
    dmg: [0, 0, 0, 0],
    downs: [0, 0, 0, 0],
    kindLv: {}, // `${level}:${kind}` -> { starts: [4], hits: [4], dmg: [4] }
  };
  let level = 1;
  let room = null;
  let tauntSource = false;
  const L = () => (M.levels[level] = M.levels[level] || { dmg: 0, downs: 0, bossDmg: 0, starts: [0, 0, 0, 0] });
  bus.on('*', (e) => {
    const t = e.type;
    if (t === 'level_start') level = e.level ?? level;
    if (t === 'room_start') {
      const v = world.runSystem().view();
      room = { level: v.act, room: v.room, mode: v.mode, end: null };
      M.rooms += 1;
      const tl = P ? P.slots(1) : [];
      const tv = P ? P.view(1) : null;
      tauntSource = !!(tl && (tl.includes('taunting_roar') || (tv && tv.skills.some((k) => k.sockets.some((x) => x && x.node === 'provoke')))));
      if (tauntSource) {
        M.tauntRooms += 1;
        if (!M.firstTauntRoom) M.firstTauntRoom = `L${v.act}r${v.room}`;
      }
    } else if (t === 'room_cleared' && room) room.end = e.tick;
    else if (t === 'status_apply' && e.status === 'taunt') M.tauntApplied += 1;
    else if (t === 'hit') {
      const tgt = byId(e.target);
      const atk = e.attacker != null ? byId(e.attacker) : null;
      if (tgt && tgt.partyIndex !== undefined && atk && atk.faction === 'hostile') {
        L().dmg += e.amount || 0;
        M.hits[tgt.partyIndex] += 1;
        {
          const k = `${level}:${atk.kind}`;
          const o = (M.kindLv[k] = M.kindLv[k] || { starts: [0, 0, 0, 0], hits: [0, 0, 0, 0], dmg: [0, 0, 0, 0] });
          if (tgt.partyIndex <= 3) { o.hits[tgt.partyIndex] += 1; o.dmg[tgt.partyIndex] += e.amount || 0; }
        }
        M.dmg[tgt.partyIndex] += e.amount || 0;
        if (room && room.mode === 'boss') L().bossDmg += e.amount || 0;
      }
    } else if (t === 'downed') {
      L().downs += 1;
      const d = byId(e.id);
      if (d && d.partyIndex !== undefined && d.partyIndex <= 3) M.downs[d.partyIndex] += 1;
    }
    if (/^(telegraph_start|enemy_bite|enemy_fire)$/.test(t) && e.target != null) {
      const tgt = byId(e.target);
      if (!tgt || tgt.partyIndex === undefined || tgt.partyIndex > 3) return;
      const s = tgt.partyIndex;
      M.all[s] += 1;
      L().starts[s] += 1;
      const src = byId(e.id);
      const kind = src ? src.kind : '?';
      (M.byKind[kind] = M.byKind[kind] || [0, 0, 0, 0])[s] += 1;
      {
        const k = `${level}:${kind === 'eglob' ? 'toad' : kind}`;
        const o = (M.kindLv[k] = M.kindLv[k] || { starts: [0, 0, 0, 0], hits: [0, 0, 0, 0], dmg: [0, 0, 0, 0] });
        o.starts[s] += 1;
      }
      if (room && room.end === null) {
        M.live[s] += 1;
        if (tauntSource) M.taunt[s] += 1;
      }
      if (src) {
        const d = [0, 1, 2, 3].map((i) => {
          const m = member(i);
          return m && m.hp > 0 ? Math.round(Math.hypot(m.x - src.x, m.z - src.z) * 100) / 100 : null;
        });
        M.geo.push([s, ...d, tauntSource ? 1 : 0, kind]);
      }
    }
  });
  const ap = world.runSystem().autopilot;
  const step = (n) => {
    for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, ap.intents(t, T.intents.emptySnapshot())))) k += 1;
  };
  world.runSystem().startCampaign({ level: 1, challenge: 'standard', harness: true });
  ap.configure(true);
  let lastKey = '';
  let lastProgress = 0;
  let stuck = null;
  for (let t = 0; t < MAX_TICKS; t += 60) {
    step(60);
    const v = world.runSystem().view();
    const key = `${v.act}:${v.room}:${v.phase}`;
    if (key !== lastKey) {
      lastKey = key;
      lastProgress = world.tick;
    }
    if (v.phase === 'idle' || v.phase === 'victory' || v.phase === 'defeat') break;
    if (world.tick - lastProgress > 10800) {
      stuck = key;
      break;
    }
  }
  const out = world.runSystem().view();
  return { M, outcome: out.phase, reached: out.act, stuck, ticks: world.tick };
}

const pct = (arr) => {
  const T = arr.reduce((a, x) => a + x, 0);
  return arr.map((x) => (T ? Math.round((1000 * x) / T) / 10 : 0));
};
const now = await load(here);
const old = BASE ? await load(resolve(BASE)) : null;
const report = { tool: 'gntfixM4b5-aggro', tag: TAG, version: now.ver.VERSION, seeds: SEEDS, now: [], base: [] };
function summarize(list, label, ver) {
  const sum = (f) => [0, 1, 2, 3].map((i) => list.reduce((a, r) => a + f(r)[i], 0));
  const all = sum((r) => r.M.all);
  const taunt = sum((r) => r.M.taunt);
  const live = sum((r) => r.M.live);
  const s = {
    label,
    version: ver,
    outcomes: list.map((r) => `${r.seed}:${r.outcome}@L${r.reached}${r.stuck ? ' STUCK ' + r.stuck : ''}`),
    all: { n: all.reduce((a, x) => a + x, 0), share: pct(all) },
    live: { n: live.reduce((a, x) => a + x, 0), share: pct(live) },
    taunt: { n: taunt.reduce((a, x) => a + x, 0), share: pct(taunt) },
    firstTauntRoom: list.map((r) => r.M.firstTauntRoom),
    tauntRooms: list.map((r) => `${r.M.tauntRooms}/${r.M.rooms}`),
    tauntApplied: list.map((r) => r.M.tauntApplied),
    hits: sum((r) => r.M.hits),
    dmg: sum((r) => r.M.dmg).map(Math.round),
    downs: sum((r) => r.M.downs),
    kindLv: (() => {
      const o = {};
      for (const r of list) for (const [k, v] of Object.entries(r.M.kindLv)) { const q = (o[k] = o[k] || { starts: [0, 0, 0, 0], hits: [0, 0, 0, 0], dmg: [0, 0, 0, 0] }); for (const f of ['starts', 'hits', 'dmg']) v[f].forEach((x, i) => (q[f][i] += x)); }
      for (const q of Object.values(o)) q.dmg = q.dmg.map(Math.round);
      return o;
    })(),
    levels: list.map((r) => Object.fromEntries(Object.entries(r.M.levels).map(([k, v]) => [k, { dmg: Math.round(v.dmg), bossDmg: Math.round(v.bossDmg), downs: v.downs, share: pct(v.starts) }]))),
    byKind: (() => {
      const o = {};
      for (const r of list) for (const [k, v] of Object.entries(r.M.byKind)) { o[k] = o[k] || [0, 0, 0, 0]; v.forEach((x, i) => (o[k][i] += x)); }
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { n: v.reduce((a, x) => a + x, 0), share: pct(v) }]));
    })(),
  };
  console.log(`${label} v${ver}: outcomes ${s.outcomes.join(' ')}`);
  console.log(`  ALL starts [H,T,S,A] % ${s.all.share.join('/')} (n ${s.all.n}) | live rooms ${s.live.share.join('/')} (n ${s.live.n}) | taunt-source rooms ${s.taunt.share.join('/')} (n ${s.taunt.n})`);
  console.log(`  first taunt-source room ${s.firstTauntRoom.join(' ')}; taunt rooms ${s.tauntRooms.join(' ')}; taunts applied ${s.tauntApplied.join(' ')}`);
  console.log(`  hostile hits landed [H,T,S,A] ${s.hits.join('/')} dmg ${s.dmg.join('/')} (total ${s.dmg.reduce((a, x) => a + x, 0)}) downs ${s.downs.join('/')}`);
  console.log(`  per level ${JSON.stringify(s.levels)}`);
  console.log(`  by kind ${JSON.stringify(s.byKind)}`);
  return s;
}
const runsNow = SEEDS.map((seed) => ({ seed, ...runCampaign(now, seed) }));
report.nowSummary = summarize(runsNow, 'NOW', now.ver.VERSION);
report.now = runsNow.map((r) => ({ seed: r.seed, outcome: r.outcome, geo: r.M.geo }));
if (old) {
  const runsOld = SEEDS.map((seed) => ({ seed, ...runCampaign(old, seed) }));
  report.baseSummary = summarize(runsOld, 'BASE', old.ver.VERSION);
  const b = report.baseSummary.all.share[1];
  const bl = report.baseSummary.live.share[1];
  console.log(`RATIO Tank share: ALL ${report.nowSummary.all.share[1]} / ${b} = x${(report.nowSummary.all.share[1] / b).toFixed(2)} | TAUNT-source rooms ${report.nowSummary.taunt.share[1]} / live ${bl} = x${(report.nowSummary.taunt.share[1] / bl).toFixed(2)} (gate >= 1.3)`);
}
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures', `gntfixM4b5-aggro-${TAG}.json`), JSON.stringify(report));
