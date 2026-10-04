#!/usr/bin/env node
// M4a act runner (docs/gauntlet/PLAN.md §6.7 — the fixed name critics cite).
// Boots `?menu=0&seed=S`, starts the act with cmd('startRun', { act,
// challenge }), turns on the deterministic default-build autopilot
// (src/sim/autopilot.js: drafts taken, first door, cheapest shop item, every
// bench node socketed) and steps the run to its end with __echoes.sim.stepN
// in chunks (realtime loop frozen: fast and deterministic). Reports per room
// { room, mode, layoutId, ticksToClear, partyDamageTaken, downs,
// enemiesByType, elites } + { outcome, pageErrors }.
//
//   node tools/gnt-M4a-actrun.mjs --act 1|2|3 --seed S [--challenge standard] [--out f]
//   node tools/gnt-M4a-actrun.mjs --act all --seeds 1-5 [--out f]      (sweep + §4.2 band verdict)
//   add --node 1 to run the identical sim headless in Node (no browser; fast sweeps)
//   add --url http://127.0.0.1:5199/ to point at another server
//
// A room that is still live 180 s (10 800 ticks) after it started is STUCK:
// the run stops there and the report says so (gate G4a.9 "no stuck phase").
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ACTS = opt('act', '1') === 'all' ? [1, 2, 3] : [Number(opt('act', '1'))];
const seedsArg = opt('seeds', opt('seed', '1'));
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const CHALLENGE = opt('challenge', 'standard');
const BOSS = opt('boss', null); // slice 2: force the act's boss (stag | thornmother | heron | millwheel | wyrm | lichram)
const NODE = opt('node', '0') === '1';
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', `captures/gnt-M4a-actrun-${ACTS.join('')}-${SEEDS.join('_')}${NODE ? '-node' : ''}.json`);
const STUCK_TICKS = 10800;
const MAX_TICKS = 70000;

// ------------------------------------------------------ in-run collector --
// The same function runs in the page (serialised) and in Node: it installs
// bus listeners and returns a reader.
function installCollector(on) {
  const rooms = [];
  let cur = null;
  const party = new Set(['player', 'ally']);
  on('room_enter', (e) => {
    cur = { room: e.index, mode: e.mode, layoutId: e.layoutId ?? null, act: e.act ?? null, startTick: e.tick, endTick: null, partyDamageTaken: 0, memberDamage: 0, objectiveDamage: 0, downs: 0, enemiesByType: {}, elites: 0, bossAdds: 0 };
    rooms.push(cur);
  });
  on('room_cleared', (e) => {
    if (cur) cur.endTick = e.tick;
  });
  // Party damage taken = every hit on a party-faction body: the four members
  // (HP lost + shield absorbed) and, in defend rooms, the Waystone — the
  // objective IS the party's to protect (it joins the §11 party candidate
  // set). The members-only figure is reported beside it.
  on('hit', (e) => {
    if (!cur) return;
    if (party.has(e.kind)) {
      cur.memberDamage += e.amount + (e.absorbed ?? 0);
      cur.partyDamageTaken += e.amount + (e.absorbed ?? 0);
    } else if (e.kind === 'waystone') {
      cur.objectiveDamage += e.amount;
      cur.partyDamageTaken += e.amount;
    }
  });
  on('downed', () => {
    if (cur) cur.downs += 1;
  });
  on('enemy_spawn', (e) => {
    if (cur) cur.enemiesByType[e.etype] = (cur.enemiesByType[e.etype] ?? 0) + 1;
  });
  on('elite_spawn', () => {
    if (cur) cur.elites += 1;
  });
  on('boss_adds', (e) => {
    if (cur) cur.bossAdds += e.spawned ?? 0;
  });
  on('boss_spawn', (e) => {
    if (cur) cur.boss = e.kind ?? 'stag';
  });
  return () =>
    rooms.map((r) => ({
      room: r.room,
      mode: r.mode,
      layoutId: r.layoutId,
      ticksToClear: r.endTick !== null ? r.endTick - r.startTick : null,
      partyDamageTaken: Math.round(r.partyDamageTaken * 10) / 10,
      memberDamage: Math.round(r.memberDamage * 10) / 10,
      objectiveDamage: Math.round(r.objectiveDamage * 10) / 10,
      downs: r.downs,
      enemiesByType: r.enemiesByType,
      elites: r.elites,
      bossAdds: r.bossAdds,
      ...(r.boss ? { boss: r.boss } : {}),
      startTick: r.startTick,
    }));
}

// ------------------------------------------------------------ one run --
const ROOT = resolve(opt('root', here)); // --root <checkout>: simulate another tree (tuning experiments)
async function runNode(act, seed) {
  const u = (p) => pathToFileURL(join(ROOT, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  const rng = createGameplayRng(seed >>> 0);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const read = installCollector((t, f) => bus.on(t, f));
  world.runSystem().startRun({ act, challenge: CHALLENGE, ...(BOSS ? { boss: BOSS } : {}) });
  ap.configure(true);
  let stuck = null;
  let outcome = null;
  for (let i = 0; i < MAX_TICKS; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = world.runSystem().view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      break;
    }
    if (v.phase === 'combat') {
      const rs = read();
      const last = rs[rs.length - 1];
      if (last && clock.tick - last.startTick > STUCK_TICKS) {
        stuck = { room: last.room, mode: last.mode, tick: clock.tick };
        break;
      }
    }
  }
  return { act, seed, challenge: CHALLENGE, outcome: outcome ?? (stuck ? 'stuck' : 'timeout'), stuck, ticks: clock.tick, rooms: read(), autopilot: ap.view().stats, pageErrors: [] };
}

async function runPage(browser, act, seed) {
  const { openEchoes } = await import('./gnt-arch-browser.mjs');
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=${seed}`, { width: 1280, height: 720 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 120000 });
  await page.evaluate(
    (collectorSrc, a, c, b) => {
      __echoes.sim.freeze();
      const install = new Function(`return (${collectorSrc})`)();
      window.__actRead = install((t, f) => __echoes.on(t, f));
      __echoes.cmd('startRun', { act: a, challenge: c, ...(b ? { boss: b } : {}) });
      __echoes.cmd('autopilot', true);
      return true;
    },
    installCollector.toString(),
    act,
    CHALLENGE,
    BOSS
  );
  let outcome = null;
  let stuck = null;
  let tick = 0;
  for (let guard = 0; guard < 400; guard++) {
    const r = await page.evaluate(
      (stuckTicks) => {
        __echoes.sim.stepN(300, null);
        const v = __echoes.state().run;
        const rooms = window.__actRead();
        const last = rooms[rooms.length - 1];
        return { phase: v.phase, tick: __echoes.tick, stuck: v.phase === 'combat' && last && __echoes.tick - last.startTick > stuckTicks ? { room: last.room, mode: last.mode } : null };
      },
      STUCK_TICKS
    );
    tick = r.tick;
    if (r.phase === 'victory' || r.phase === 'defeat') {
      outcome = r.phase;
      break;
    }
    if (r.stuck) {
      stuck = { ...r.stuck, tick };
      break;
    }
    if (tick > MAX_TICKS) break;
  }
  const rooms = await page.evaluate(() => window.__actRead());
  const ap = await page.evaluate(() => __echoes.cmd('autopilot', false));
  await page.close();
  return { act, seed, challenge: CHALLENGE, outcome: outcome ?? (stuck ? 'stuck' : 'timeout'), stuck, ticks: tick, rooms, autopilot: ap && ap.stats, pageErrors: errors };
}

// ------------------------------------------------------------ analysis --
const median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (a.length === 0) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
function spearman(xs, ys) {
  const rank = (v) => {
    const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(v.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}
function band(runs) {
  const out = { acts: {}, gates: {} };
  const WIN_MIN = { 1: 3, 2: 3, 3: 2 };
  for (const act of [...new Set(runs.map((r) => r.act))]) {
    const rs = runs.filter((r) => r.act === act);
    const rooms = [1, 2, 3, 4, 5, 6].map((room) => {
      const rows = rs.map((r) => r.rooms.find((x) => x.room === room)).filter(Boolean);
      return {
        room,
        ticks: median(rows.map((x) => x.ticksToClear)),
        damage: median(rows.map((x) => x.partyDamageTaken)),
        defendShare: rows.filter((x) => x.mode === 'defend').length / Math.max(1, rows.length),
      };
    });
    const boss = rs.map((r) => r.rooms.find((x) => x.room === 8)).filter(Boolean);
    const rhoT = spearman(rooms.map((x) => x.room), rooms.map((x) => x.ticks ?? 0));
    const rhoD = spearman(rooms.map((x) => x.room), rooms.map((x) => x.damage ?? 0));
    // Defend rooms and the boss above their neighbouring kill_all rooms,
    // judged per run (the defend positions differ by seed).
    let above = 0;
    let total = 0;
    for (const r of rs) {
      const byRoom = new Map(r.rooms.map((x) => [x.room, x]));
      for (const x of r.rooms) {
        if (x.mode !== 'defend' && x.mode !== 'boss') continue;
        const neigh = [byRoom.get(x.room - 1), byRoom.get(x.room + 1)].filter((n) => n && n.mode === 'kill_all' && n.ticksToClear !== null);
        if (x.mode === 'boss') neigh.push(...r.rooms.filter((n) => n.mode === 'kill_all' && n.room >= 5 && n.ticksToClear !== null));
        if (neigh.length === 0 || x.ticksToClear === null) continue;
        total += 1;
        const nt = median(neigh.map((n) => n.ticksToClear));
        const nd = median(neigh.map((n) => n.partyDamageTaken));
        if (x.ticksToClear > nt && x.partyDamageTaken > nd) above += 1;
      }
    }
    // The same comparison on medians (per act): defend rooms vs their
    // kill_all neighbours, the boss vs the late kill_all rooms (5-6).
    const dRooms = [];
    const dNeigh = [];
    const bRooms = [];
    const bNeigh = [];
    for (const r of rs) {
      const byRoom = new Map(r.rooms.map((x) => [x.room, x]));
      for (const x of r.rooms) {
        if (x.ticksToClear === null) continue;
        if (x.mode === 'defend') {
          dRooms.push(x);
          for (const n of [byRoom.get(x.room - 1), byRoom.get(x.room + 1)]) if (n && n.mode === 'kill_all' && n.ticksToClear !== null) dNeigh.push(n);
        } else if (x.mode === 'boss') {
          bRooms.push(x);
          for (const n of r.rooms) if (n.mode === 'kill_all' && n.room >= 5 && n.ticksToClear !== null) bNeigh.push(n);
        }
      }
    }
    const mt = (xs) => median(xs.map((x) => x.ticksToClear));
    const md = (xs) => median(xs.map((x) => x.partyDamageTaken));
    const spikes = {
      defendTime: [mt(dRooms), mt(dNeigh)],
      defendDamage: [md(dRooms), md(dNeigh)],
      bossTime: [mt(bRooms), mt(bNeigh)],
      bossDamage: [md(bRooms), md(bNeigh)],
    };
    const wins = rs.filter((r) => r.outcome === 'victory').length;
    const stuck = rs.filter((r) => r.outcome === 'stuck' || r.outcome === 'timeout').length;
    const maxRoomMedian = Math.max(...rooms.map((x) => x.ticks ?? 0));
    out.acts[act] = {
      runs: rs.length,
      wins,
      stuck,
      rooms,
      boss: { ticks: median(boss.map((x) => x.ticksToClear)), damage: median(boss.map((x) => x.partyDamageTaken)) },
      rhoTime: Math.round(rhoT * 1000) / 1000,
      rhoDamage: Math.round(rhoD * 1000) / 1000,
      spikesAbove: `${above}/${total}`,
      spikes,
      maxCombatRoomMedianSec: Math.round((maxRoomMedian / 60) * 10) / 10,
      winsNeeded: WIN_MIN[act],
    };
    out.gates[`act${act}.rho>=0.6`] = rhoT >= 0.6 && rhoD >= 0.6;
    out.gates[`act${act}.victories>=${WIN_MIN[act]}/5`] = wins >= WIN_MIN[act];
    out.gates[`act${act}.noStuck`] = stuck === 0;
    out.gates[`act${act}.medians<=120s`] = maxRoomMedian <= 7200;
    const above2 = (p) => p[0] !== null && p[1] !== null && p[0] > p[1];
    out.gates[`act${act}.defend>neighbours (time & damage)`] = above2(spikes.defendTime) && above2(spikes.defendDamage);
    out.gates[`act${act}.boss>late kill_all (damage)`] = above2(spikes.bossDamage);
  }
  const acts = Object.keys(out.acts).map(Number).sort();
  if (acts.length === 3) {
    let rising = true;
    const per = [];
    for (let room = 1; room <= 6; room++) {
      const t = acts.map((a) => out.acts[a].rooms[room - 1].damage ?? 0);
      per.push(t);
      if (!(t[0] < t[1] && t[1] < t[2])) rising = false;
    }
    out.gates['actMedians I<II<III (damage, equal room)'] = rising;
    out.actDamageByRoom = per;
  }
  return out;
}

// ---------------------------------------------------------------- main --
const runs = [];
let browser = null;
try {
  if (!NODE) {
    const { launchEchoes } = await import('./gnt-arch-browser.mjs');
    browser = await launchEchoes({ gpu: true, width: 1280, height: 720 });
  }
  for (const act of ACTS) {
    for (const seed of SEEDS) {
      const t0 = Date.now();
      const r = NODE ? await runNode(act, seed) : await runPage(browser, act, seed);
      r.ms = Date.now() - t0;
      runs.push(r);
      const bossRoom = r.rooms.find((x) => x.boss);
      if (bossRoom) r.boss = bossRoom.boss;
      const clears = r.rooms.map((x) => (x.ticksToClear === null ? '-' : Math.round(x.ticksToClear / 6) / 10)).join(' ');
      console.log(`act ${act} seed ${seed}${r.boss ? ` [${r.boss}]` : ''}: ${r.outcome}${r.stuck ? ` (room ${r.stuck.room})` : ''} ticks ${r.ticks}  clears[s] ${clears}  pageErrors ${r.pageErrors.length}  ${r.ms} ms`);
    }
  }
} finally {
  if (browser) await browser.close();
}
const report = { tool: 'gnt-M4a-actrun', mode: NODE ? 'node' : 'page', challenge: CHALLENGE, at: new Date().toISOString(), runs };
if (runs.length > 1) report.band = band(runs);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify(report, null, 1));
if (report.band) {
  for (const [a, x] of Object.entries(report.band.acts))
    console.log(`act ${a}: spikes defend t ${x.spikes.defendTime.map((v) => Math.round((v ?? 0) / 6) / 10).join('>')} dmg ${x.spikes.defendDamage.map((v) => Math.round(v ?? 0)).join('>')} · boss t ${x.spikes.bossTime.map((v) => Math.round((v ?? 0) / 6) / 10).join('>')} dmg ${x.spikes.bossDamage.map((v) => Math.round(v ?? 0)).join('>')}`) ||
    console.log(`act ${a}: wins ${x.wins}/${x.runs} (need ${x.winsNeeded}) stuck ${x.stuck} rhoT ${x.rhoTime} rhoD ${x.rhoDamage} spikes ${x.spikesAbove} maxRoomMedian ${x.maxCombatRoomMedianSec}s  rooms t ${x.rooms.map((r) => Math.round((r.ticks ?? 0) / 6) / 10).join('/')}  dmg ${x.rooms.map((r) => Math.round(r.damage ?? 0)).join('/')} boss ${Math.round((x.boss.ticks ?? 0) / 6) / 10}s ${Math.round(x.boss.damage ?? 0)}`);
  console.log(JSON.stringify(report.band.gates));
}
console.log(`-> ${OUT}`);
process.exit(runs.some((r) => r.pageErrors.length > 0) ? 1 : 0);
