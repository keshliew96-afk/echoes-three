#!/usr/bin/env node
// SECOND CHAMPIONS probe (plan 4 slice 8, docs/CHAMPIONS.md "Second
// champions"), headless sim, no browser:
//   pick     each of Acts I to IV has two champions, the crown door leads to
//            one by a hash of the level's seed and index (both turn up over
//            seeds; the crown's own room and side roll is unchanged); Act V's
//            first is still the Gale Herald (plan 5 slice 2 gave it a second,
//            tools/spire-second-champion-probe.mjs); the door and the room agree; Endless
//            depths meet one of their land's two; cmd championPick forces
//   hart     the Moss Hart's Antler Toss throws the heroes it hits ~2 u; its
//            Hart's Leap bounds onto the farthest hero's mark in the second
//            half of the warning and leaves a moss patch
//   keeper   the Lockkeeper's Chain Hook drags a hooked hero to its feet; its
//            Lock Turn slows the heroes inside (50 %)
//   ringer   the Gravebell Ringer's Death Knell slows (45 %); its Grave Call
//            leaves an ash patch where it opens
//   matron   the Vein Matron's Vein Lash heals her 3 % per hero cut; her
//            Heart Pulse throws eight shards all round
//   common   each spawns with the room's champion HP and rages below half;
//            a mid-leap capture continues bit-identically in a fresh world
//   deeds    the Journal lists ten champions (plan 5 slice 2's Bell Abbess
//            the tenth); Four and Five Crowns count either champion of a
//            land; marks record all ten
//
//   node tools/second-champions-probe.mjs [--seed 4] [--out captures/second-champions-probe.json]
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
const { BESTIARY } = await import(u('src/data/journal.js'));
const { DEEDS, MARK_KINDS } = await import(u('src/data/unlocks.js'));
const C = await import(u('src/sim/champions.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/second-champions-probe.json');

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
  const log = [];
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (e.type !== 'sound') log.push(e);
    if (log.length > 60000) log.splice(0, 20000);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push(hashState(io.capture()));
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  return { registry, bus, clock, world, ap, io, step, continuation, log, run: () => world.runSystem() };
}
const holdParty = (w) => {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
};
const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const player = (w) => w.registry.all().find((e) => e.partyIndex === 0);
const seen = (w, type, pred = () => true) => w.log.filter((e) => e.type === type && pred(e));
function stage(seed, level, n = 3) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 30; i++) w.step();
  w.world.cmd('killAllEnemies');
  for (let i = 0; i < 4; i++) w.step();
  holdParty(w);
  return w;
}
function spawnAt(w, kind, x, z, hp = 600) {
  const r = w.world.cmd('spawn', kind, x, z);
  const id = typeof r === 'object' && r ? r.id : r;
  const e = w.registry.byId(id);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    e.elite = false;
    delete e.affixes;
  }
  return id;
}
// Everything hostile but `keep` melts (a staged fight stays one-on-one).
function thin(w, keep, soft = false) {
  for (const x of w.registry.all()) if (x.faction === 'hostile' && !keep.includes(x.id) && x.hp > 0 && x.kind !== 'eshot' && x.state === 'active') {
      if (soft) x.hp = 0.001;
      else w.world.cmd('setHp', x.id, 0);
    }
}

// -------------------------------------------------------------- herald --

const SECONDS = { 1: 'moss_hart', 2: 'lockkeeper', 3: 'gravebell_ringer', 4: 'vein_matron' };
const FIRSTS = { 1: 'briar_knight', 2: 'sluice_warden', 3: 'bone_reeve', 4: 'hollow_choir', 5: 'gale_herald' };

// ---------------------------------------------------------------- pick --
{
  for (const a of [1, 2, 3, 4]) {
    const ids = C.championsOfAct(a).map((c) => c.id);
    const got = new Set();
    for (let s = 1; s <= 40; s++) got.add(C.championPick(s * 7919, 0, a).id);
    check('pick', `Act ${a} has two champions and the seed picks both`, ids.length === 2 && ids[0] === FIRSTS[a] && ids[1] === SECONDS[a] && got.size === 2, { ids, got: [...got] });
  }
  check('pick', "Act V's first champion is still the Gale Herald", C.championsOfAct(5)[0].id === 'gale_herald' && C.championFor(5).id === 'gale_herald');
  check('pick', 'the pick is pure (same seed and index, same champion)', [1, 2, 3, 4].every((a) => C.championPick(4242, 2, a).id === C.championPick(4242, 2, a).id));
  check('pick', 'twelve champions in all (plan 5 slice 2 added the Bell Abbess, slice 9 the Kiln two)', C.CHAMPION_IDS.length === 12 && C.CHAMPION_LIST.length === 12 && C.CHAMPION_IDS.every((id) => C.isChampionKind(id)), C.CHAMPION_IDS);
  // The door and the room: a level's crown door names its pick, and taking
  // it spawns that champion.
  let agree = 0;
  let tried = 0;
  const met = new Set();
  for (let s = 1; s <= 12; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 1, harness: true });
    const pick = w.run().cmd('championPick', []);
    w.run().cmd('championRoom', [4]);
    w.world.cmd('skipToRoom', 4);
    for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
    const sp = seen(w, 'champion_spawn')[0];
    tried += 1;
    if (sp && sp.champion === pick) agree += 1;
    if (sp) met.add(sp.champion);
  }
  check('pick', 'the champion room spawns the level\'s pick (12 seeds), and both Wood champions turn up', agree === tried && met.has('briar_knight') && met.has('moss_hart'), { agree, tried, met: [...met] });
  // The path screen's crown door names it too.
  let doorOk = null;
  for (let s = 1; s <= 30 && doorOk === null; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 2, harness: true });
    const pick = w.run().cmd('championPick', []);
    if (pick !== 'lockkeeper') continue;
    w.world.cmd('skipToRoom', 3);
    w.step();
    w.run().cmd('crownDoor', [0]);
    w.world.cmd('clearRoom');
    for (let i = 0; i < 600 && w.run().view().phase !== 'path'; i++) {
      const ph = w.run().view().phase;
      if (ph === 'reward') w.run().declineReward();
      else if (ph === 'relic') w.run().chooseRelic(0);
      w.step();
    }
    const p = w.run().view().path;
    const door = p && p.options.find((o) => o.champion);
    doorOk = !!door && door.champion === 'lockkeeper' ? true : { options: p && p.options };
    if (doorOk === true) {
      const r = w.run().choosePath(door.side);
      for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
      const sp = seen(w, 'champion_spawn')[0];
      if (!(r && r.champion === 'lockkeeper' && sp && sp.champion === 'lockkeeper')) doorOk = { r, sp };
    }
  }
  check('pick', 'a Mill crown door names the Lockkeeper when the seed picks it, and its room spawns him', doorOk === true, doorOk);
  // Forcing.
  const w = build(SEED);
  w.run().startCampaign({ level: 3, harness: true });
  const forced = w.run().cmd('championPick', ['gravebell_ringer']);
  check('pick', 'cmd championPick forces the level\'s champion', forced === 'gravebell_ringer' && w.run().cmd('championPick', []) === 'gravebell_ringer');
  // Endless: each depth meets one of its land's two.
  const lands = new Set();
  for (let s = 1; s <= 10; s++) {
    const e = build(s);
    e.run().startCampaign({ endless: true, harness: true });
    const p = e.run().cmd('championPick', []);
    if (p) lands.add(p);
  }
  check('pick', 'Endless Depth 1 meets the Briar Knight or the Moss Hart', lands.size >= 1 && [...lands].every((k) => k === 'briar_knight' || k === 'moss_hart'), [...lands]);
  // The legacy single-level run never rolls one.
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  check('pick', 'the legacy single run has no champion pick', legacy.run().cmd('championPick', []) === null);
}

// A champion room of `level` holding `kind`, the rest of its waves melted.
function champRoom(seed, level, kind) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.run().cmd('championPick', [kind]);
  w.run().cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  w.ap.configure(false);
  for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
  const sp = seen(w, 'champion_spawn')[0];
  const e = sp ? w.registry.byId(sp.id) : null;
  check('common', `${kind}: spawns in the Level ${['', 'I', 'II', 'III', 'IV'][level]} crown room with the room's champion HP`, !!e && e.kind === kind && Math.abs(e.maxHp - C.CHAMPION_RULES.hp * w.run().roomPlan().hpMul) < 1, e && { kind: e.kind, hp: e.maxHp });
  return { w, e };
}
// Step until `pred` (or n ticks), the party held and the room thinned.
function run(w, e, n, pred, each = null) {
  for (let i = 0; i < n; i++) {
    holdParty(w);
    thin(w, [e.id], true);
    if (each) each();
    const k = w.log.length;
    w.step();
    if (pred(w.log.slice(k))) return true;
  }
  return false;
}
const moveOf = (evs, e, move) => evs.find((x) => x.type === 'champion_move' && x.id === e.id && x.move === move);
// Hold every hero at a spot (the heroes stand still; the AI is off).
function pin(w, spots) {
  const ps = party(w).filter((p) => p.hp > 0);
  ps.forEach((p, i) => {
    const s = spots[Math.min(i, spots.length - 1)];
    if (s) {
      p.x = p.px = s[0];
      p.z = p.pz = s[1];
    }
  });
}

// ---------------------------------------------------------------- hart --
let leapSave = null;
{
  const { w, e } = champRoom(SEED, 1, 'moss_hart');
  if (e) {
    // Antler Toss: everyone close, in front of it.
    let toss = null;
    let before = null;
    run(w, e, 1800, (evs) => {
      const m = moveOf(evs, e, 'antler_toss');
      if (m && m.victims > 0) toss = m;
      return !!toss;
    }, () => {
      if (!e.telegraph) pin(w, [[e.x, e.z + 1.6], [e.x + 0.5, e.z + 1.8], [e.x - 0.5, e.z + 1.8], [e.x, e.z + 2.1]]);
      else if (e.telegraph.move === 'antler_toss') before = party(w).map((p) => [p.id, p.x, p.z]);
      else pin(w, [[e.x, e.z + 1.6], [e.x + 0.5, e.z + 1.8], [e.x - 0.5, e.z + 1.8], [e.x, e.z + 2.1]]);
    });
    for (let i = 0; i < 12; i++) w.step();
    const moved = toss && before ? Math.max(...before.map(([id, x, z]) => { const b = w.registry.byId(id); return b ? Math.hypot(b.x - x, b.z - z) : 0; })) : 0;
    check('hart', `Antler Toss throws the heroes it hits about 2 u (${moved.toFixed(2)})`, !!toss && moved >= 1.4 && moved <= 2.8, toss);
    // Hart's Leap: the party spread far; it should bound to the farthest.
    let leap = null;
    let mid = null;
    let early = null;
    let flierSeen = false;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'harts_leap');
      if (m) leap = { ...m, at: [e.x, e.z], flier: !!e.flier };
      return !!leap;
    }, () => {
      const t = e.telegraph;
      if (t && t.move === 'harts_leap') {
        const W = t.resolveTick - t.startTick;
        const k = (w.clock.tick - t.startTick) / W;
        if (k < 0.35 && !early) early = { x: e.x, z: e.z, x0: e.flight && e.flight.x0, z0: e.flight && e.flight.z0 };
        if (k > 0.6 && k < 0.8) {
          mid = mid ?? { x: e.x, z: e.z };
          if (e.flier) flierSeen = true;
          if (!leapSave) leapSave = clonePlain(w.io.capture());
        }
      } else if (!t) {
        // Heroes far away: one right off, the others closer.
        pin(w, [[e.x + 6.0 > 7 ? e.x - 6.0 : e.x + 6.0, e.z + 0.5], [e.x, e.z + 3.0], [e.x + 1.0, e.z + 3.0], [e.x - 1.0, e.z + 3.0]]);
      }
    });
    const stillEarly = early && early.x0 != null && Math.hypot(early.x - early.x0, early.z - early.z0) < 0.05;
    check('hart', "Hart's Leap: it crouches through the first part of the warning (no glide yet)", !!stillEarly, early);
    check('hart', "Hart's Leap: it is aloft (a flier) in the bound", flierSeen && !!mid, mid);
    check('hart', "Hart's Leap: it lands on the marked ring at the end and is grounded", !!leap && Math.hypot(leap.at[0] - leap.x, leap.at[1] - leap.z) < 0.35 && !leap.flier, leap);
    const moss = seen(w, 'slick_spawn', (s) => s.variant === 'moss' && leap && s.tick === leap.tick);
    check('hart', "Hart's Leap leaves a moss patch where it lands", moss.length === 1 && Math.hypot(moss[0].x - leap.x, moss[0].z - leap.z) < 0.05, moss[0] ?? null);
    // Rage below half.
    e.hp = e.maxHp * 0.45;
    run(w, e, 4, (evs) => evs.some((x) => x.type === 'champion_rage' && x.id === e.id));
    check('common', 'moss_hart: rages below half health', !!e.rage);
  }
}
if (leapSave) {
  const a = build(SEED);
  a.io.apply(clonePlain(leapSave));
  const b = build(SEED + 99);
  b.io.apply(clonePlain(leapSave));
  const ra = a.continuation(600);
  const rb = b.continuation(600);
  check('common', 'a mid-leap capture continues bit-identically in a fresh world (600 ticks)', JSON.stringify(ra) === JSON.stringify(rb) && ra.events.length > 0, { hashes: ra.hashes.length, events: ra.events.length });
} else check('common', 'a mid-leap capture was taken', false);

// -------------------------------------------------------------- keeper --
{
  const { w, e } = champRoom(SEED, 2, 'lockkeeper');
  if (e) {
    let hook = null;
    let from = null;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'chain_hook');
      if (m && m.victims > 0) hook = m;
      return !!hook;
    }, () => {
      const t = e.telegraph;
      if (!t || t.move !== 'chain_hook') pin(w, [[e.x, e.z + 5.0], [e.x, e.z + 5.0], [e.x, e.z + 5.0], [e.x, e.z + 5.0]]);
      else {
        // Stand in the lane, 5 u off.
        pin(w, [[e.x + t.dirX * 5, e.z + t.dirZ * 5]]);
        from = party(w).filter((p) => p.hp > 0).map((p) => [p.id, Math.hypot(p.x - e.x, p.z - e.z)]);
      }
    });
    for (let i = 0; i < 12; i++) w.step();
    const after = from ? Math.min(...from.map(([id]) => { const b = w.registry.byId(id); return b ? Math.hypot(b.x - e.x, b.z - e.z) : 99; })) : 99;
    check('keeper', `Chain Hook drags a hooked hero in to its feet (5 u -> ${after.toFixed(2)} u)`, !!hook && hook.hooked >= 1 && after < 2.8, hook);
    let turn = null;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'lock_turn');
      if (m && m.victims > 0) turn = m;
      return !!turn;
    }, () => pin(w, [[e.x, e.z + 1.4], [e.x + 0.6, e.z + 1.4], [e.x - 0.6, e.z + 1.4], [e.x, e.z + 1.8]]));
    const slowed = party(w).filter((p) => p.status && p.status.slow && p.status.slow.mag >= 0.5 - 1e-9 && p.status.slow.src === e.id);
    check('keeper', 'Lock Turn clamps the heroes inside (slow 50 %)', !!turn && slowed.length >= 1, { turn, slowed: slowed.length });
  }
}

// -------------------------------------------------------------- ringer --
{
  const { w, e } = champRoom(SEED, 3, 'gravebell_ringer');
  if (e) {
    let knell = null;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'death_knell');
      if (m && m.victims > 0) knell = m;
      return !!knell;
    }, () => pin(w, [[e.x, e.z + 2.0], [e.x + 0.8, e.z + 2.4], [e.x - 0.8, e.z + 2.4], [e.x, e.z + 3.0]]));
    const slowed = party(w).filter((p) => p.status && p.status.slow && p.status.slow.mag >= 0.45 - 1e-9 && p.status.slow.src === e.id);
    check('ringer', 'Death Knell slows the heroes inside (45 %)', !!knell && slowed.length >= 1, { knell, slowed: slowed.length });
    let call = null;
    run(w, e, 2400, (evs) => {
      call = moveOf(evs, e, 'grave_call') ?? call;
      return !!call;
    }, () => pin(w, [[e.x, e.z + 5.5], [e.x + 1, e.z + 5.5], [e.x - 1, e.z + 5.5], [e.x, e.z + 6]]));
    const ash = call ? seen(w, 'slick_spawn', (s) => s.variant === 'ash' && s.tick === call.tick) : [];
    check('ringer', 'Grave Call opens under a hero and leaves an ash patch there', !!call && ash.length === 1 && Math.hypot(ash[0].x - call.x, ash[0].z - call.z) < 0.05, { call, ash: ash[0] ?? null });
  }
}

// -------------------------------------------------------------- matron --
{
  const { w, e } = champRoom(SEED, 4, 'vein_matron');
  if (e) {
    let lash = null;
    let hpBefore = null;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'vein_lash');
      if (m && m.victims > 0) lash = m;
      return !!lash;
    }, () => {
      const t = e.telegraph;
      if (!t || t.move !== 'vein_lash') pin(w, [[e.x, e.z + 4.5]]);
      else {
        pin(w, [[e.x + t.dirX * 4, e.z + t.dirZ * 4], [e.x + t.dirX * 3, e.z + t.dirZ * 3]]);
        e.hp = e.maxHp * 0.6;
        hpBefore = e.hp;
      }
    });
    const want = lash ? e.maxHp * Math.min(0.06, 0.03 * lash.victims) : 0;
    check('matron', `Vein Lash: she drinks 3 % of her max HP per hero cut, 6 % at most (+${lash ? lash.drank : 0})`, !!lash && hpBefore !== null && Math.abs(lash.drank - want) < 0.02, { lash, want });
    let pulse = null;
    run(w, e, 2400, (evs) => {
      pulse = moveOf(evs, e, 'heart_pulse') ?? pulse;
      return !!pulse;
    }, () => pin(w, [[e.x, e.z + 1.8], [e.x + 0.6, e.z + 2], [e.x - 0.6, e.z + 2], [e.x, e.z + 2.4]]));
    const shots = pulse ? seen(w, 'enemy_fire', (s) => s.id === e.id && s.tick === pulse.tick) : [];
    const spread = shots.length ? Math.abs(shots.reduce((a, s) => a + s.dx, 0)) + Math.abs(shots.reduce((a, s) => a + s.dz, 0)) : 99;
    check('matron', 'Heart Pulse throws eight shards evenly all round her', !!pulse && shots.length === 8 && spread < 0.2, { shots: shots.length, spread });
  }
}

// ---------------------------------------------------------------- deeds --
{
  const champs = BESTIARY.filter((b) => b.champion);
  check('deeds', 'the Journal lists twelve champions, each in its land, with lore and text', champs.length === 12 && Object.entries(SECONDS).every(([a, id]) => { const r = champs.find((c) => c.id === id); return r && r.lands[0] === Number(a) && r.lore && r.text; }), champs.map((c) => c.id));
  const four = DEEDS.four_crowns ?? (DEEDS.get ? DEEDS.get('four_crowns') : null);
  const five = DEEDS.five_crowns ?? (DEEDS.get ? DEEDS.get('five_crowns') : null);
  const life = (ids) => ({ champion: ids });
  const fr = { cleared: [], bosses: [], champions: [] };
  // (Small fixes 5: either of a land's champions crowns it.)
  check('deeds', 'Four Crowns takes either champion of each of the first four lands', !!four && four.test(fr, life(C.FIRST_CROWNS)) && four.test(fr, life(['moss_hart', 'lockkeeper', 'gravebell_ringer', 'vein_matron'])) && !four.test(fr, life(['briar_knight', 'moss_hart', 'sluice_warden', 'lockkeeper', 'bone_reeve', 'gravebell_ringer'])));
  if (five) check('deeds', 'Five Crowns counts a land per champion of either kind, the Herald for the Spire', five.test(fr, life(C.FIVE_CROWNS)) && five.test(fr, life(['moss_hart', 'lockkeeper', 'gravebell_ringer', 'vein_matron', 'gale_herald'])) && !five.test(fr, life([...C.FIRST_CROWNS, 'moss_hart', 'lockkeeper', 'gravebell_ringer', 'vein_matron'])) && five.goal(life(C.CHAMPION_IDS))[1] === 5);
  else check('deeds', 'Five Crowns is listed', false);
  check('deeds', 'champion marks record all twelve', MARK_KINDS.champion.length === 12 && Object.values(SECONDS).every((id) => MARK_KINDS.champion.includes(id)));
}

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ seed: SEED, passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
