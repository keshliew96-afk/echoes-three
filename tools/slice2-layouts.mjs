#!/usr/bin/env node
// Slice-2 room layouts (docs/CONTENT_PLAN.md §4, layouts 10-15): one probe per
// layout, headless, in a real CAMPAIGN run played by the default autopilot.
//
// Per layout it plays campaigns from the layout's level (seeds 1..N) until a
// combat room rolls that layout, then checks, in that room:
//   spawns  every spawn telegraph sits on the layout's own ring (<= 1.7 u
//           from a ring point, the wave fan included), none on the old ring
//   party   all four seats (Healer, Tank, Swordsman, Archer) are in the room
//           and each one moves (path length and distinct 1 u cells visited)
//   clear   the room clears (room_cleared) without going STUCK
//   doors   a two-door path offer follows the clear (a curse glyph noted when
//           rolled), a door is taken and the next room is entered
// plus a static reachability check: on a 0.2 u grid, a 0.45 u body can walk
// from every ring point and every party entry spot to every other (walls and
// barricades block; brambles, water and vents do not).
//
//   node tools/slice2-layouts.mjs [--seeds 12] [--ids 21,22]   exit 1 on any failure
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const MAX_SEEDS = argv.includes('--seeds') ? Number(argv[argv.indexOf('--seeds') + 1]) : 12;

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { LAYOUTS, PLACEMENT_RULES } = await import(u('src/data/layouts.js'));
const { SPAWN_POINTS } = await import(u('src/sim/waves.js'));
const { ARENA } = await import(u('src/core/constants.js'));
const { INTERACT_TYPES } = await import(u('src/sim/interactables.js'));
const { CLASS_OF_SEAT } = await import(u('src/data/classes.js'));

// --ids 21,22,... probes other layouts (plan 3 slice 8: 21-28).
const IDS = argv.includes('--ids') ? argv[argv.indexOf('--ids') + 1].split(',').map(Number) : [10, 11, 12, 13, 14, 15];

// ------------------------------------------------------------ reachability --
function reachability(L) {
  const step = 0.2;
  const r = 0.45;
  const nx = Math.round((ARENA.halfW * 2) / step) + 1;
  const nz = Math.round((ARENA.halfD * 2) / step) + 1;
  const B = INTERACT_TYPES.barricade;
  const boxes = L.interactables.filter((p) => p.type === 'barricade');
  const blocked = (x, z) => {
    if (Math.abs(x) > ARENA.halfW - r || Math.abs(z) > ARENA.halfD - r) return true;
    for (const b of boxes) {
      // local frame of the box (three.js yaw: local +x -> (cos, -sin))
      const dx = x - b.x;
      const dz = z - b.z;
      const c = Math.cos(b.yaw ?? 0);
      const s = Math.sin(b.yaw ?? 0);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const ex = Math.max(0, Math.abs(lx) - B.hx);
      const ez = Math.max(0, Math.abs(lz) - B.hz);
      if (Math.hypot(ex, ez) < r) return true;
    }
    return false;
  };
  const idx = (i, j) => j * nx + i;
  const free = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[idx(i, j)] = blocked(-ARENA.halfW + i * step, -ARENA.halfD + j * step) ? 0 : 1;
  const cell = (x, z) => [Math.round((x + ARENA.halfW) / step), Math.round((z + ARENA.halfD) / step)];
  const [si, sj] = cell(0, 0);
  const seen = new Uint8Array(nx * nz);
  const q = [idx(si, sj)];
  seen[q[0]] = 1;
  while (q.length) {
    const k = q.pop();
    const i = k % nx;
    const j = (k - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const kk = idx(a, b);
      if (!seen[kk] && free[kk]) {
        seen[kk] = 1;
        q.push(kk);
      }
    }
  }
  const points = [...(L.spawns ?? SPAWN_POINTS), ...PLACEMENT_RULES.partySpots];
  const cut = points.filter(([x, z]) => {
    const [i, j] = cell(x, z);
    return !seen[idx(i, j)];
  });
  let nFree = 0;
  let nSeen = 0;
  for (let k = 0; k < free.length; k++) {
    nFree += free[k];
    nSeen += seen[k];
  }
  return { ok: cut.length === 0, unreachable: cut, floorReached: Math.round((nSeen / nFree) * 1000) / 10 };
}

// --------------------------------------------------------------- one probe --
async function probe(id, seed) {
  const L = LAYOUTS[id];
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
  let room = null; // the probed room's record
  let done = null;
  let level = L.act;
  let placed = null; // layout_placed lands just before its room_enter
  bus.on('level_start', (e) => (level = e.level));
  bus.on('layout_placed', (e) => (placed = e));
  bus.on('room_enter', (e) => {
    if (room && room.cleared && !room.nextRoom) {
      room.nextRoom = { index: e.index, layoutId: e.layoutId, mode: e.mode };
      done = 'ok';
      return;
    }
    // Rooms 1-5 only, so a two-door offer follows the clear (room 6 leads
    // straight into the shop).
    if (room || level !== L.act || e.layoutId !== id || e.index > 5 || !(e.mode === 'kill_all' || e.mode === 'defend')) return;
    const pl = placed && placed.layoutId === id ? placed : null;
    room = { level, index: e.index, mode: e.mode, startTick: e.tick, spawns: [], cleared: false, offer: null, curse: null, hazards: pl ? pl.hazards : null, assets: pl ? pl.interactables : null, party: {} };
  });
  bus.on('curse_apply', (e) => {
    if (room && !room.cleared) room.curse = e.curse;
  });
  bus.on('spawn_telegraph', (e) => {
    if (room && !room.cleared) room.spawns.push([e.x, e.z]);
  });
  bus.on('room_cleared', (e) => {
    if (room && !room.cleared) {
      room.cleared = true;
      room.ticks = e.tick - room.startTick;
    }
  });
  bus.on('path_offer', (e) => {
    // By room index: a soft-failed defend room goes straight to the doors
    // inside the run's own room_cleared handler, before ours has run.
    if (room && e.room === room.index && !room.offer) room.offer = e.options.map((o) => ({ side: o.side, win: o.win, reward: o.reward, curse: o.curse ?? null }));
  });
  bus.on('run_end', () => {
    if (!done) done = room ? 'run_end' : 'no_room';
  });
  run.startCampaign({ level: L.act, harness: true });
  ap.configure(true);
  const last = new Map();
  for (let i = 0; i < 160000 && !done; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (!room && (level > L.act || v.phase === 'victory' || v.phase === 'defeat')) {
      done = 'no_room';
      break;
    }
    if (room && !room.cleared) {
      for (const e of registry.all()) {
        if (e.partyIndex === undefined) continue;
        const p = (room.party[e.partyIndex] ??= { cls: CLASS_OF_SEAT[e.partyIndex], path: 0, cells: new Set(), minX: e.x, maxX: e.x, minZ: e.z, maxZ: e.z });
        const prev = last.get(e.partyIndex);
        if (prev) p.path += Math.hypot(e.x - prev[0], e.z - prev[1]);
        last.set(e.partyIndex, [e.x, e.z]);
        p.cells.add(`${Math.floor(e.x)},${Math.floor(e.z)}`);
        p.minX = Math.min(p.minX, e.x);
        p.maxX = Math.max(p.maxX, e.x);
        p.minZ = Math.min(p.minZ, e.z);
        p.maxZ = Math.max(p.maxZ, e.z);
      }
      if (clock.tick - room.startTick > 10800) {
        done = 'stuck';
        break;
      }
    }
  }
  return { done: done ?? 'timeout', room };
}

const ring = (L) => L.spawns ?? SPAWN_POINTS;
const near = (pts, [x, z], d) => pts.some(([a, b]) => Math.hypot(a - x, b - z) <= d);
let fails = 0;
const rows = [];
for (const id of IDS) {
  const L = LAYOUTS[id];
  const reach = reachability(L);
  let res = null;
  let seed = 0;
  // A party wipe in the probed room (run_end before the clear: the autopilot
  // starting cold at Level III or IV) says nothing about the layout, so the
  // next seed is tried; the wipes are counted. A STUCK room still fails.
  let wipes = 0;
  for (seed = 1; seed <= MAX_SEEDS; seed++) {
    res = await probe(id, seed);
    if (res.room && res.done === 'run_end' && !res.room.cleared) {
      wipes += 1;
      continue;
    }
    if (res.room) break;
  }
  const r = res && res.room;
  const checks = {};
  checks.reach = reach.ok;
  checks.rolled = !!r;
  if (r) {
    const own = ring(L);
    const offRing = r.spawns.filter((p) => !near(own, p, 1.7));
    const onOld = r.spawns.filter((p) => near(SPAWN_POINTS, p, 0.9) && !near(own, p, 0.9));
    checks.spawns = r.spawns.length > 0 && offRing.length === 0 && onOld.length === 0;
    const seats = Object.values(r.party);
    checks.party = seats.length === 4 && seats.every((p) => p.path > 6 && p.cells.size >= 6);
    checks.clear = r.cleared && res.done !== 'stuck';
    const want = L.hazards.reduce((n, h) => n + (h.minRoom && r.index < h.minRoom ? 0 : 1), 0);
    checks.placed = r.hazards === want && r.assets === L.interactables.length;
    checks.doors = !!r.offer && r.offer.length === 2 && !!r.nextRoom;
    r.offRing = offRing.length;
    r.party = Object.fromEntries(
      Object.entries(r.party).map(([k, p]) => [
        p.cls,
        { path: Math.round(p.path * 10) / 10, cells: p.cells.size, x: [Math.round(p.minX * 10) / 10, Math.round(p.maxX * 10) / 10], z: [Math.round(p.minZ * 10) / 10, Math.round(p.maxZ * 10) / 10] },
      ])
    );
    r.spawnCount = r.spawns.length;
    delete r.spawns;
  }
  const ok = Object.values(checks).every(Boolean);
  if (!ok) fails += 1;
  rows.push({ id, name: L.name, act: L.act, ok, seed: r ? seed : null, wipes, checks, reach, room: r, end: res && res.done });
  console.log(`L${id} ${L.name.padEnd(16)} ${ok ? 'PASS' : 'FAIL'}  seed ${r ? seed : '-'} (wipes ${wipes}) room ${r ? r.index : '-'} ${r ? r.mode : ''}  ` + Object.entries(checks).map(([k, v]) => `${k}:${v ? 'ok' : 'NO'}`).join(' '));
}
console.log(JSON.stringify(rows, null, 1));
console.log(fails ? `${fails} layout(s) failed` : `all ${IDS.length} layouts pass`);
process.exit(fails ? 1 : 0);
