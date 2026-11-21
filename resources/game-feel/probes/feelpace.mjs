import { pathToFileURL } from 'node:url';
const ROOT = '/home/user/echoes-three/';
const u = (p) => pathToFileURL(ROOT + p).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const LEVEL = Number(process.argv[2] || 1);
const SEEDS = (process.argv[3] || '1,2,3,4').split(',').map(Number);
const all = [];
for (const seed of SEEDS) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = { stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; }, float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (p) => impl.chance(p), pick: (a) => impl.pick(a), reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; } };
  const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
  const hs = { req: 0, need: 0, got: 0, clipped: 0 };
  const rh = (n) => { const g = clock.requestHitstop(n); hs.req++; hs.need += n; hs.got += g; if (g < n) hs.clipped++; return g; };
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: rh, room: null });
  const run = world.runSystem(); const ap = run.autopilot;
  const rooms = []; let room = null; const lastAtk = new Map();
  bus.on('room_enter', (e) => { room = { i: e.index, mode: e.mode, start: e.tick, kills: [], killBy: {}, hits: 0, ownHits: 0, casts: 0, ownCasts: 0 }; rooms.push(room); });
  bus.on('room_cleared', (e) => { if (room) room.end = e.tick; });
  bus.on('hit', (e) => { if (!room || e.kind === 'player' || e.kind === 'ally') return; room.hits++; const a = e.attacker ? registry.byId?.(e.attacker) : null; const seat = a ? a.partyIndex : (e.attacker == null ? 0 : undefined); lastAtk.set(e.target, seat); if (seat === 0) room.ownHits++; });
  bus.on('skill_cast', (e) => { if (!room) return; room.casts++; if (!e.classId) room.ownCasts++; });
  bus.on('death', (e) => { if (!room || e.kind === 'player' || e.kind === 'ally') return; room.kills.push(e.tick); const s = lastAtk.get(e.id); room.killBy[s ?? 'other'] = (room.killBy[s ?? 'other'] || 0) + 1; });
  run.startCampaign({ level: LEVEL, harness: true });
  ap.configure(true);
  let stop = false; bus.on('level_clear', () => (stop = true));
  for (let i = 0; i < 2_000_000 && !stop; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view(); if (v.phase === 'victory' || v.phase === 'defeat') break;
  }
  // multi-kill clusters: kills within 30 ticks of the previous one
  for (const r of rooms) {
    r.dur = r.end ? (r.end - r.start) / 60 : null;
    let cl = 0, best = 0, n = 0; let prev = -999;
    for (const t of r.kills) { if (t - prev <= 30) n++; else n = 1; best = Math.max(best, n); if (n === 3) cl++; prev = t; }
    r.bestBurst = best; r.bursts3 = cl;
    let gap = 0; for (let k = 1; k < r.kills.length; k++) gap = Math.max(gap, r.kills[k] - r.kills[k - 1]); r.maxGapSec = Math.round(gap / 6) / 10;
    r.killCount = r.kills.length; delete r.kills;
  }
  all.push({ seed, ticks: clock.tick, hs, rooms });
}
for (const r of all) {
  console.log(`seed ${r.seed}: ${Math.round(r.ticks / 60)} s sim, hitstop req ${r.hs.req} need ${r.hs.need} got ${r.hs.got} clipped ${r.hs.clipped}`);
  for (const m of r.rooms) console.log(`  room ${m.i} ${m.mode} ${m.dur?.toFixed(1)}s kills ${m.killCount} by ${JSON.stringify(m.killBy)} hits ${m.hits} own ${m.ownHits} casts ${m.casts} own ${m.ownCasts} best3s ${m.bestBurst} bursts ${m.bursts3} maxGap ${m.maxGapSec}s`);
}
