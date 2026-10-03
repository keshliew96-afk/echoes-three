#!/usr/bin/env node
// CAMPAIGN runner (docs/gauntlet/PLAN.md §12.10 / gate GC.12, GC.2, GC.5).
// Plays whole linear campaigns with the deterministic default-build autopilot
// (src/sim/autopilot.js: drafts taken, first door, cheapest shop, auto-fill,
// the level-transition card advanced at its untilTick) and reports, per
// level: every room { room, mode, layoutId, ticksToClear, partyDamageTaken,
// downs, minHpFrac }, the level outcome, the §4.2 playability band per level, plus a
// carry / restore / reset diff at every transition (the §12.3 table).
//
//   node tools/gntCAMPAIGN-camprun.mjs --from 1|2|3 --seeds 1-5 [--node 1] [--challenge standard] [--out f]
//   --node 1   headless Node sim (built exactly like main.js; fast)   (default)
//   --node 0   in page on the dev server (__echoes.sim.stepN, realtime loop frozen)
//   --root d   simulate another checkout (tuning experiments)
//
// A room still live 180 s after it started is STUCK (the run stops there).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FROM = Number(opt('from', '1'));
const seedsArg = opt('seeds', opt('seed', '1'));
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const CHALLENGE = opt('challenge', 'standard');
const NODE = opt('node', '1') !== '0';
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const ROOT = resolve(opt('root', here));
const OUT = opt('out', `captures/gntCAMPAIGN-camprun-from${FROM}-${SEEDS.join('_')}${NODE ? '-node' : ''}.json`);
const STUCK_TICKS = 10800;
const MAX_TICKS = 220000;

// ------------------------------------------------------------- collector --
// Runs in Node and (serialised) in the page. `ctx` = { on, world, registry }.
function installCollector(ctx) {
  const { on, world, registry } = ctx;
  const levels = [];
  let lv = null;
  let cur = null;
  const party = new Set(['player', 'ally']);
  const r1 = (v) => Math.round(v * 10) / 10;
  function buildSnap() {
    const run = world.runSystem();
    const b = world.buildSystem().view();
    const slots = world.skillSlots ? world.skillSlots() : null;
    return {
      skills: b.skills.map((s) => s.id),
      sockets: b.skills.map((s) => `${s.id}:${s.sockets.map((x) => (x ? x.node : '-')).join(',')}`),
      bench: b.bench.map((x) => x.node).sort(),
      wallet: run.wallet(),
      cooldowns: slots ? slots.filter(Boolean).map((s) => s.remainingTicks ?? 0) : null,
    };
  }
  function partySnap() {
    return registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .map((e) => ({ i: e.partyIndex, hp: r1(e.hp), max: e.maxHp, downed: !!e.downed, statuses: e.status ? Object.keys(e.status).length : 0 }));
  }
  function kinds() {
    const out = {};
    for (const e of registry.all()) out[e.kind] = (out[e.kind] || 0) + 1;
    return out;
  }
  const transitions = [];
  let pre = null;
  on('run_start', (e) => {
    lv = { level: e.act, rooms: [], outcome: null, startTick: e.tick };
    levels.push(lv);
  });
  on('level_start', (e) => {
    lv = { level: e.level, rooms: [], outcome: null, startTick: e.tick };
    levels.push(lv);
    const t = transitions[transitions.length - 1];
    if (t && t.to === e.level) {
      t.startTick = e.tick;
      t.atStart = { build: buildSnap(), party: partySnap(), kinds: kinds(), entities: registry.count };
      t.cardTicks = e.tick - t.transitTick;
    }
  });
  on('room_enter', (e) => {
    cur = { room: e.index, mode: e.mode, layoutId: e.layoutId ?? null, act: e.act ?? null, startTick: e.tick, endTick: null, partyDamageTaken: 0, downs: 0, minHpFrac: 1 };
    if (lv) lv.rooms.push(cur);
  });
  on('room_cleared', (e) => {
    if (cur) cur.endTick = e.tick;
  });
  on('hit', (e) => {
    if (!cur) return;
    if (party.has(e.kind)) {
      cur.partyDamageTaken += e.amount + (e.absorbed ?? 0);
      // GP.13 (d) Level 1 (ruling 2026-10-03): the lowest HP fraction any
      // party member reaches in the room. `hit` fires after the HP write.
      const t = registry.byId ? registry.byId(e.target) : registry.all().find((x) => x.id === e.target);
      if (t && t.maxHp > 0 && Number.isFinite(t.hp)) cur.minHpFrac = Math.min(cur.minHpFrac, Math.max(0, t.hp) / t.maxHp);
    } else if (e.kind === 'waystone') cur.partyDamageTaken += e.amount;
  });
  on('downed', () => {
    if (cur) cur.downs += 1;
  });
  on('level_clear', (e) => {
    if (lv) lv.outcome = 'cleared';
    pre = { tick: e.tick, level: e.level, next: e.next, build: buildSnap(), party: partySnap(), clears: (pre && pre.level === e.level ? pre.clears : 0) + 1 };
    transitions.push({ from: e.level, to: e.next, clearTick: e.tick, index: e.index, final: e.final, pre, clearEvents: 1 });
  });
  on('level_transit', (e) => {
    const t = transitions[transitions.length - 1];
    if (!t || e.kind !== 'clear') return;
    t.transitTick = e.tick;
    t.untilTick = e.untilTick;
    t.hardUntilTick = e.hardUntilTick;
    t.atCard = { build: buildSnap(), party: partySnap(), kinds: kinds(), entities: registry.count, card: world.runSystem().campaign().card };
  });
  on('run_end', (e) => {
    if (lv && !lv.outcome) lv.outcome = e.result;
  });
  return () => ({
    levels: levels.map((l) => ({
      level: l.level,
      outcome: l.outcome,
      rooms: l.rooms.map((r) => ({
        room: r.room,
        mode: r.mode,
        layoutId: r.layoutId,
        act: r.act,
        ticksToClear: r.endTick !== null ? r.endTick - r.startTick : null,
        partyDamageTaken: Math.round(r.partyDamageTaken * 10) / 10,
        downs: r.downs,
        minHpFrac: Math.round(r.minHpFrac * 1000) / 1000,
        startTick: r.startTick,
      })),
    })),
    transitions,
  });
}

// --------------------------------------------------------------- one run --
async function runNode(seed) {
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
  const read = installCollector({ on: (t, f) => bus.on(t, f), world, registry });
  run.startCampaign({ level: FROM, challenge: CHALLENGE, harness: true });
  ap.configure(true);
  let stuck = null;
  let outcome = null;
  for (let i = 0; i < MAX_TICKS; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      break;
    }
    if (v.phase === 'combat') {
      const d = read();
      const l = d.levels[d.levels.length - 1];
      const last = l && l.rooms[l.rooms.length - 1];
      if (last && clock.tick - last.startTick > STUCK_TICKS) {
        stuck = { level: l.level, room: last.room, mode: last.mode, tick: clock.tick };
        break;
      }
    }
  }
  const data = read();
  return { seed, from: FROM, challenge: CHALLENGE, outcome: outcome ?? (stuck ? 'stuck' : 'timeout'), stuck, ticks: clock.tick, ...data, autopilot: ap.view().stats, pageErrors: [] };
}

async function runPage(browser, seed) {
  const { openEchoes } = await import('./gnt-arch-browser.mjs');
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=${seed}`, { width: 1280, height: 720 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 20, { timeout: 120000 });
  await page.evaluate(
    (collectorSrc, from, c) => {
      __echoes.sim.freeze();
      const install = new Function(`return (${collectorSrc})`)();
      const run = () => ({ runSystem: () => ({ wallet: () => __echoes.state().wallet, campaign: () => __echoes.cmd('campaignState') }), buildSystem: () => ({ view: () => __echoes.cmd('buildState') ?? __echoes.state().build }) });
      window.__campRead = install({ on: (t, f) => __echoes.on(t, f), world: run(), registry: { all: () => __echoes.state().entities ?? [], get count() { return __echoes.entityCount; } } });
      __echoes.cmd('startCampaign', { level: from, challenge: c });
      __echoes.cmd('autopilot', true);
      return true;
    },
    installCollector.toString(),
    FROM,
    CHALLENGE
  );
  let outcome = null;
  let stuck = null;
  let tick = 0;
  for (let guard = 0; guard < 1200; guard++) {
    const r = await page.evaluate((stuckTicks) => {
      __echoes.sim.stepN(300, null);
      const v = __echoes.state().run;
      const d = window.__campRead();
      const l = d.levels[d.levels.length - 1];
      const last = l && l.rooms[l.rooms.length - 1];
      return { phase: v.phase, tick: __echoes.tick, stuck: v.phase === 'combat' && last && __echoes.tick - last.startTick > stuckTicks ? { level: l.level, room: last.room, mode: last.mode } : null };
    }, STUCK_TICKS);
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
  const data = await page.evaluate(() => window.__campRead());
  await page.evaluate(() => __echoes.cmd('autopilot', false));
  await page.close();
  return { seed, from: FROM, challenge: CHALLENGE, outcome: outcome ?? (stuck ? 'stuck' : 'timeout'), stuck, ticks: tick, ...data, pageErrors: errors };
}

// -------------------------------------------------------------- analysis --
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
// The §4.2 band, per level, over the level records of every run that
// reached that level (G4a.10 criteria: rho >= 0.6 time AND damage across rooms
// 1-6, defend rooms above their kill_all neighbours on time and damage, the
// Stag room above the late kill_all rooms on damage, no combat-room median
// above 120 s, no stuck room, victories per level, level medians rising).
function band(runs) {
  const out = { levels: {}, gates: {} };
  const WIN_MIN = { 1: 3, 2: 3, 3: 2 };
  const lvIds = [...new Set(runs.flatMap((r) => r.levels.map((l) => l.level)))].sort();
  for (const level of lvIds) {
    const recs = runs.map((r) => ({ run: r, l: r.levels.find((l) => l.level === level) })).filter((x) => x.l);
    const rooms = [1, 2, 3, 4, 5, 6].map((room) => {
      const rows = recs.map((x) => x.l.rooms.find((y) => y.room === room)).filter((y) => y && y.ticksToClear !== null);
      return { room, ticks: median(rows.map((y) => y.ticksToClear)), damage: median(rows.map((y) => y.partyDamageTaken)), n: rows.length };
    });
    const rhoT = spearman(rooms.map((x) => x.room), rooms.map((x) => x.ticks ?? 0));
    const rhoD = spearman(rooms.map((x) => x.room), rooms.map((x) => x.damage ?? 0));
    const dRooms = [];
    const dNeigh = [];
    const bRooms = [];
    const bNeigh = [];
    for (const { l } of recs) {
      const byRoom = new Map(l.rooms.map((x) => [x.room, x]));
      for (const x of l.rooms) {
        if (x.ticksToClear === null) continue;
        if (x.mode === 'defend') {
          dRooms.push(x);
          for (const n of [byRoom.get(x.room - 1), byRoom.get(x.room + 1)]) if (n && n.mode === 'kill_all' && n.ticksToClear !== null) dNeigh.push(n);
        } else if (x.mode === 'boss') {
          bRooms.push(x);
          for (const n of l.rooms) if (n.mode === 'kill_all' && n.room >= 5 && n.ticksToClear !== null) bNeigh.push(n);
        }
      }
    }
    const mt = (xs) => median(xs.map((x) => x.ticksToClear));
    const md = (xs) => median(xs.map((x) => x.partyDamageTaken));
    const spikes = { defendTime: [mt(dRooms), mt(dNeigh)], defendDamage: [md(dRooms), md(dNeigh)], bossTime: [mt(bRooms), mt(bNeigh)], bossDamage: [md(bRooms), md(bNeigh)] };
    const reached = recs.length;
    const cleared = recs.filter((x) => x.l.outcome === 'cleared').length;
    const stuck = recs.filter((x) => x.run.stuck && x.run.stuck.level === level).length;
    const maxRoomMedian = Math.max(...rooms.map((x) => x.ticks ?? 0));
    out.levels[level] = {
      reached,
      cleared,
      stuck,
      rooms,
      boss: { ticks: mt(bRooms), damage: md(bRooms) },
      rhoTime: Math.round(rhoT * 1000) / 1000,
      rhoDamage: Math.round(rhoD * 1000) / 1000,
      spikes,
      maxCombatRoomMedianSec: Math.round((maxRoomMedian / 60) * 10) / 10,
      winsNeeded: WIN_MIN[level] ?? 2,
    };
    const above2 = (p) => p[0] !== null && p[1] !== null && p[0] > p[1];
    out.gates[`L${level}.rho>=0.6`] = rhoT >= 0.6 && rhoD >= 0.6;
    out.gates[`L${level}.clears>=${WIN_MIN[level] ?? 2}/${runs.length}`] = cleared >= (WIN_MIN[level] ?? 2);
    out.gates[`L${level}.noStuck`] = stuck === 0;
    out.gates[`L${level}.medians<=120s`] = maxRoomMedian <= 7200;
    out.gates[`L${level}.defend>neighbours`] = above2(spikes.defendTime) && above2(spikes.defendDamage);
    out.gates[`L${level}.boss>late kill_all (damage)`] = above2(spikes.bossDamage);
  }
  if (lvIds.length >= 2) {
    let rising = true;
    const per = [];
    for (let room = 1; room <= 6; room++) {
      const t = lvIds.map((a) => out.levels[a].rooms[room - 1].damage ?? 0);
      per.push(t);
      for (let i = 1; i < t.length; i++) if (!(t[i - 1] < t[i])) rising = false;
    }
    out.gates['levelMedians rising (damage, equal room)'] = rising;
    out.levelDamageByRoom = per;
  }
  return out;
}

// Carry / restore / reset verdicts per transition (PLAN §12.3, GC.5).
function carryVerdicts(runs) {
  const rows = [];
  for (const r of runs) {
    for (const t of r.transitions) {
      if (t.final || !t.atCard) continue;
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const p = t.pre.build;
      const c = t.atCard.build;
      const s = t.atStart ? t.atStart.build : null;
      const kindsCard = Object.keys(t.atCard.kinds).filter((k) => k !== 'player' && k !== 'ally');
      const kindsStart = t.atStart ? t.atStart.kinds : null;
      rows.push({
        seed: r.seed,
        from: t.from,
        to: t.to,
        skillsCarried: same(p.skills, c.skills) && (!s || same(c.skills, s.skills)),
        socketsCarried: same(p.sockets, c.sockets) && (!s || same(c.sockets, s.sockets)),
        benchCarried: same(p.bench, c.bench) && (!s || same(c.bench, s.bench)),
        glintCarried: p.wallet === c.wallet && (!s || c.wallet === s.wallet),
        hpRestored: t.atCard.party.every((m) => m.hp === m.max),
        noneDowned: t.atCard.party.every((m) => !m.downed),
        statusesCleared: t.atCard.party.every((m) => m.statuses === 0),
        cooldownsReset: c.cooldowns === null || c.cooldowns.every((x) => x === 0),
        nothingButPartyOnCard: kindsCard.length === 0,
        leftoversSwept: t.atCard.card && Array.isArray(t.atCard.card.leftovers) ? t.atCard.card.leftovers : null,
        entitiesAtCard: t.atCard.entities,
        cardTicks: t.cardTicks ?? null,
        untilTicks: t.untilTick - t.transitTick,
        kindsAtStart: kindsStart,
      });
    }
  }
  // No transition in these runs (a start at the final level): n/a, not a failure.
  const all = (k) => (rows.length === 0 ? null : rows.every((x) => x[k] === true));
  return {
    rows,
    ok: {
      skills: all('skillsCarried'),
      sockets: all('socketsCarried'),
      bench: all('benchCarried'),
      glint: all('glintCarried'),
      hp: all('hpRestored'),
      downed: all('noneDowned'),
      statuses: all('statusesCleared'),
      cooldowns: all('cooldownsReset'),
      partyOnly: all('nothingButPartyOnCard'),
      noLeftovers: rows.every((x) => !x.leftoversSwept || x.leftoversSwept.length === 0),
    },
  };
}

// ------------------------------------------------------------------ main --
const runs = [];
let browser = null;
try {
  if (!NODE) {
    const { launchEchoes } = await import('./gnt-arch-browser.mjs');
    browser = await launchEchoes({ gpu: true, width: 1280, height: 720, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  }
  for (const seed of SEEDS) {
    const t0 = Date.now();
    const r = NODE ? await runNode(seed) : await runPage(browser, seed);
    r.ms = Date.now() - t0;
    runs.push(r);
    const lv = r.levels.map((l) => `L${l.level}:${l.outcome ?? '-'}(${l.rooms.map((x) => (x.ticksToClear === null ? '-' : Math.round(x.ticksToClear / 6) / 10)).join(' ')})`).join('  ');
    console.log(`from ${FROM} seed ${seed}: ${r.outcome}${r.stuck ? ` (L${r.stuck.level} room ${r.stuck.room})` : ''} ticks ${r.ticks}  ${lv}  ${r.ms} ms`);
  }
} finally {
  if (browser) await browser.close();
}
const report = { tool: 'gntCAMPAIGN-camprun', mode: NODE ? 'node' : 'page', from: FROM, challenge: CHALLENGE, at: new Date().toISOString(), runs };
report.band = band(runs);
report.carry = carryVerdicts(runs);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(report, null, 1));
for (const [a, x] of Object.entries(report.band.levels)) {
  console.log(
    `L${a}: cleared ${x.cleared}/${x.reached} reached (need ${x.winsNeeded}) stuck ${x.stuck} rhoT ${x.rhoTime} rhoD ${x.rhoDamage} maxMed ${x.maxCombatRoomMedianSec}s rooms t ${x.rooms.map((r) => Math.round((r.ticks ?? 0) / 6) / 10).join('/')} dmg ${x.rooms.map((r) => Math.round(r.damage ?? 0)).join('/')} boss ${Math.round((x.boss.ticks ?? 0) / 6) / 10}s ${Math.round(x.boss.damage ?? 0)} | defend t ${x.spikes.defendTime.map((v) => Math.round((v ?? 0) / 6) / 10).join('>')} d ${x.spikes.defendDamage.map((v) => Math.round(v ?? 0)).join('>')} boss d ${x.spikes.bossDamage.map((v) => Math.round(v ?? 0)).join('>')}`
  );
}
console.log(JSON.stringify(report.band.gates));
console.log('carry', JSON.stringify(report.carry.ok));
console.log(`-> ${OUT}`);
process.exit(runs.some((r) => r.pageErrors.length > 0) ? 1 : 0);
