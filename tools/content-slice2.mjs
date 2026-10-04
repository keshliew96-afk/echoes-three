#!/usr/bin/env node
// Content slice 2 probe (docs/CONTENT_PLAN.md §2.4 / §3) — headless Node, the
// sim built exactly like src/main.js, on the deterministic autopilot.
//
//   node tools/content-slice2.mjs [--seeds 1-8] [--out captures/content-slice2.json]
//
// Legs:
//   enemies  each new enemy (wasp, thornling, crab, lamprey, gravewisp,
//            knight) spawns in a real run of its act and fires its signature
//            beat (dart, plant, snap, lunge, tether, slam); the knight always
//            spawns Elite; the wasp swarms in threes.
//   bosses   each of the six bosses (the three originals and the three new
//            ones) fights a real room 8 of its act (startRun + skipToRoom 8),
//            and every new boss fires each beat of its kit.
//   roll     bossFor(act, seed) gives both bosses of every act over seeds
//            1-40, and a run on a seed meets exactly bossFor's boss.
//   save     a capture taken mid-fight (each new boss, plus a Bone Knight /
//            Grave Wisp room) applies into a fresh world and both continue
//            bit-identically for 600 ticks (hashes every 60 + every event).
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { bossFor } = await import(u('src/data/levels.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-8');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const OUT = opt('out', 'captures/content-slice2.json');

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
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
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const io = createStateIO({ clock, rng, registry, world });
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push({ tick: clock.tick, h: hashState(io.capture()) });
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  return { registry, bus, clock, world, ap, io, step, continuation, run: () => world.runSystem() };
}

// ------------------------------------------------------------- enemies --
const ENEMY = {
  wasp: { act: 1, beat: (e) => e.type === 'enemy_swoop' && e.etype === 'wasp' },
  thornling: { act: 1, beat: (e) => e.type === 'thorn_plant' },
  crab: { act: 2, beat: (e) => e.type === 'crab_snap' },
  lamprey: { act: 2, beat: (e) => e.type === 'lamprey_lunge' },
  gravewisp: { act: 3, beat: (e) => e.type === 'wisp_tether' },
  knight: { act: 3, beat: (e) => e.type === 'knight_slam' },
};
const firstSeen = {};
for (const act of [1, 2, 3]) {
  const want = Object.keys(ENEMY).filter((k) => ENEMY[k].act === act);
  for (const seed of SEEDS) {
    if (want.every((k) => firstSeen[k] && firstSeen[k].beat)) break;
    const w = build(seed);
    const kinds = new Map();
    const hits = {};
    w.bus.on('*', (e) => {
      if (e.type === 'enemy_spawn') {
        kinds.set(e.id, e.etype);
        const k = e.etype;
        if (ENEMY[k] && !firstSeen[k]) firstSeen[k] = { seed, room: w.run().view().room, spawned: 0, elite: 0 };
        if (ENEMY[k] && firstSeen[k].seed === seed) {
          firstSeen[k].spawned += 1;
          if (e.elite) firstSeen[k].elite += 1;
        }
      }
      for (const k of want) {
        if (ENEMY[k].beat(e) && firstSeen[k] && firstSeen[k].seed === seed && !firstSeen[k].beat) firstSeen[k].beat = { type: e.type, tick: e.tick, room: w.run().view().room };
        if (e.type === 'hit' && (e.kind === 'player' || e.kind === 'ally')) {
          const a = e.attacker != null ? w.registry.byId(e.attacker) : null;
          if (a && a.kind === k) hits[k] = (hits[k] ?? 0) + 1;
        }
      }
      if (e.type === 'hit_immune' && firstSeen.gravewisp && firstSeen.gravewisp.seed === seed) {
        const t = w.registry.byId(e.target);
        if (t && t.wardedBy) firstSeen.gravewisp.wardedHits = (firstSeen.gravewisp.wardedHits ?? 0) + 1;
      }
    });
    w.run().startRun({ act });
    w.ap.configure(true);
    for (let i = 0; i < 70000; i++) {
      w.step();
      const v = w.run().view();
      if (v.phase === 'victory' || v.phase === 'defeat') break;
      if (want.every((k) => firstSeen[k] && firstSeen[k].seed !== seed) || want.every((k) => firstSeen[k] && firstSeen[k].beat && firstSeen[k].seed !== seed)) break;
    }
    for (const k of want) if (firstSeen[k] && firstSeen[k].seed === seed) firstSeen[k].hitsOnParty = hits[k] ?? 0;
  }
}
for (const k of Object.keys(ENEMY)) {
  const f = firstSeen[k];
  check('enemies', `${k} spawns in an Act ${ENEMY[k].act} run and fires its beat`, f && f.beat, f ?? null);
}
check('enemies', 'every Bone Knight spawns Elite', firstSeen.knight && firstSeen.knight.elite === firstSeen.knight.spawned, firstSeen.knight ?? null);
check('enemies', 'Briar Wasps come in swarms of three', firstSeen.wasp && firstSeen.wasp.spawned % 3 === 0, firstSeen.wasp ?? null);
check('enemies', 'a Grave Wisp ward turns hits into hit_immune', firstSeen.gravewisp && (firstSeen.gravewisp.wardedHits ?? 0) > 0, firstSeen.gravewisp ?? null);

// -------------------------------------------------------------- bosses --
const KIT = {
  stag: { act: 1, beats: ['boss_quake_resolve'] },
  thornmother: { act: 1, beats: ['boss_seed_volley', 'enemy_glob_land', 'slick_spawn', 'boss_charge', 'boss_thorn_burst', 'boss_charge_end'] },
  heron: { act: 2, beats: ['boss_spear'] },
  millwheel: { act: 2, beats: ['boss_cog_shards', 'enemy_fire', 'boss_crosscut', 'boss_cut_end'] },
  wyrm: { act: 3, beats: ['boss_breath'] },
  lichram: { act: 3, beats: ['boss_grave_call', 'boss_grave_raise', 'boss_rush', 'boss_horns_stuck', 'hit_blocked'] },
};
const saveAt = {};
for (const [kind, k] of Object.entries(KIT)) {
  const seed = SEEDS[0];
  const w = build(seed);
  const seen = {};
  let spawnKind = null;
  let bossId = null;
  w.bus.on('*', (e) => {
    if (e.type === 'boss_spawn') {
      spawnKind = e.kind ?? 'stag';
      bossId = e.id;
    }
    if (e.type === 'hit_blocked' && e.targetId !== bossId) return;
    if (k.beats.includes(e.type)) seen[e.type] = (seen[e.type] ?? 0) + 1;
  });
  w.run().startRun({ act: k.act, boss: kind });
  w.world.cmd('skipToRoom', 8);
  w.ap.configure(true);
  let out = null;
  let ticks = 0;
  for (let i = 0; i < 9000; i++) {
    w.step();
    ticks += 1;
    if (i === 300 && !saveAt[kind]) saveAt[kind] = clonePlain(w.io.capture());
    const v = w.run().view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      out = v.phase;
      break;
    }
    if (k.beats.every((b) => seen[b]) && saveAt[kind]) {
      out = 'beats-seen';
      break;
    }
  }
  check('bosses', `${kind}: room 8 of Act ${k.act} spawns it`, spawnKind === kind, { spawnKind });
  check('bosses', `${kind}: fires every beat of its kit`, k.beats.every((b) => seen[b]), { seen, out, sec: Math.round(ticks / 6) / 10 });
}

// ---------------------------------------------------------------- roll --
for (const act of [1, 2, 3]) {
  const kinds = new Set();
  for (let s = 1; s <= 40; s++) kinds.add(bossFor(act, s).kind);
  check('roll', `Act ${act}: seeds 1-40 meet both of its bosses`, kinds.size === 2, [...kinds]);
}
for (const [act, seed] of [[1, SEEDS[0]], [2, SEEDS[1] ?? 2], [3, SEEDS[2] ?? 3]]) {
  const w = build(seed);
  let met = null;
  w.bus.on('boss_spawn', (e) => {
    met = e.kind ?? 'stag';
  });
  w.run().startRun({ act });
  w.world.cmd('skipToRoom', 8);
  w.step();
  const v = w.run().view();
  check('roll', `Act ${act} seed ${seed}: the run meets bossFor's boss, and the view names it`, met === bossFor(act, seed).kind && v.actBoss && v.actBoss.kind === met, { met, want: bossFor(act, seed).kind, view: v.actBoss ?? null });
}

// ---------------------------------------------------------------- save --
function roundTrip(label, tree, seed) {
  const a = build(seed);
  const ok1 = a.io.apply(clonePlain(tree));
  const contA = a.continuation(600);
  const b = build(seed + 1000); // a different seed: everything must come from the save
  const ok2 = b.io.apply(clonePlain(tree));
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes.map((h) => h.h)) === JSON.stringify(contB.hashes.map((h) => h.h)) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  check('save', `${label}: a mid-fight capture continues bit-identically in a fresh world`, ok1.ok && ok2.ok && same, { applyA: ok1.ok, applyB: ok2.ok, hashes: contA.hashes.length, events: contA.events.length, lastA: contA.hashes.at(-1)?.h, lastB: contB.hashes.at(-1)?.h });
}
for (const kind of ['thornmother', 'millwheel', 'lichram']) {
  if (saveAt[kind]) roundTrip(`${kind} fight`, saveAt[kind], SEEDS[0]);
  else check('save', `${kind} fight: captured`, false);
}
{
  // A live Act III room with a Bone Knight or a Grave Wisp in it.
  let tree = null;
  for (const seed of SEEDS) {
    const w = build(seed);
    w.run().startRun({ act: 3 });
    w.ap.configure(true);
    for (let i = 0; i < 40000 && !tree; i++) {
      w.step();
      const v = w.run().view();
      if (v.phase === 'victory' || v.phase === 'defeat') break;
      if (v.phase === 'combat' && i % 30 === 0) {
        const ents = w.registry.all();
        const kn = ents.find((e) => e.kind === 'knight' && e.state === 'active' && e.telegraph);
        const ws = ents.find((e) => e.kind === 'gravewisp' && e.tetherId != null);
        if (kn || ws) tree = { tree: clonePlain(w.io.capture()), seed, what: kn ? 'knight mid-slam' : 'wisp mid-ward' };
      }
    }
    if (tree) break;
  }
  if (tree) roundTrip(`Act III room (${tree.what})`, tree.tree, tree.seed);
  else check('save', 'Act III room with a knight or wisp: captured', false);
}

mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ tool: 'content-slice2', at: new Date().toISOString(), seeds: SEEDS, failed, results }, null, 1));
console.log(`${results.length - failed}/${results.length} pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
