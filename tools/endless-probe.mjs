#!/usr/bin/env node
// ENDLESS probe (docs/ENDLESS.md) — headless Node, the sim built exactly like
// src/main.js, on the deterministic autopilot.
//
//   node tools/endless-probe.mjs [--seed 3] [--out captures/endless-probe.json]
//
// Legs:
//   data      Depths 1-4 are the campaign's numbers and rosters exactly; past
//             4 the numbers only rise; the cycle wraps; each cycle meets the
//             act's other boss.
//   campaign  a plain campaign carries no endless key (record, view, events).
//   descent   an endless campaign goes through Depth 4 into Depth 5 (the
//             autopilot plays Depth 1 and the Heart, the probe's endlessJump
//             skips the levels between; since Elite affixes the autopilot
//             rarely clears four levels on its own): the Heart's clear is not final, campaign_won fires, the card and
//             the view carry the depth, room 1 rolls endlessDifficulty's
//             numbers, room 8 holds endlessBossIndex's boss.
//   replay    the same seed reaches Depth 5 with the same state hash twice.
//   save      a capture taken in Depth 5 continues bit-identically in a
//             fresh world (hashes every 60 ticks + every event, 600 ticks).
//   profile   the run's end records gameWon, endlessRuns and
//             endlessBestDepth, and the end summary names the depth.
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
const { difficulty } = await import(u('src/data/difficulty.js'));
const { levelFor, campaignLevel } = await import(u('src/data/levels.js'));
const E = await import(u('src/data/endless.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));
const { createSaveStorage } = await import(u('src/save/storage.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '3'));
const OUT = opt('out', 'captures/endless-probe.json');

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
  const log = [];
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (['level_clear', 'campaign_won', 'level_transit', 'level_start', 'boss_spawn', 'run_end'].includes(e.type)) log.push(e);
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
  return { registry, bus, clock, world, ap, io, step, continuation, log, run: () => world.runSystem() };
}

// Autopilot until `pred(view)` holds (or the run ends / the guard runs out).
function playUntil(w, pred, guard = 900000) {
  for (let i = 0; i < guard; i++) {
    w.step();
    const v = w.run().view();
    if (pred(v)) return v;
    if (v.phase === 'victory' || v.phase === 'defeat') return v;
  }
  return w.run().view();
}

// An endless descent to Depth 5: the autopilot plays into Depth 1, the
// probe jumps to the Heart (Depth 4), plays into its first room, then clears it
// as Depth 4 into the Wood.
function descend(w) {
  w.run().startCampaign({ level: 1, harness: true, endless: true });
  w.ap.configure(true);
  playUntil(w, (x) => x.room >= 2 && x.phase === 'combat');
  w.world.cmd('endlessJump', 4);
  for (let i = 0; i < 600; i++) w.step(); // a few seconds of the Heart's first room
  playUntil(w, (x) => x.endless && x.endless.depth === 4 && x.phase === 'combat');
  w.world.cmd('endlessJump', 5);
  return playUntil(w, (x) => x.endless && x.endless.depth === 5 && x.phase === 'combat');
}

// ---------------------------------------------------------------- data --
{
  let same = true;
  for (let d = 1; d <= 4; d++)
    for (let r = 1; r <= 6; r++)
      for (const c of ['relaxed', 'standard', 'harrowing']) if (JSON.stringify(E.endlessDifficulty(d, r, c)) !== JSON.stringify(difficulty(d, r, c))) same = false;
  check('data', 'Depths 1-4 roll difficulty(act, room) exactly (every room, every challenge)', same);
  // Endless is campaign play: each land's campaign-only creatures are in its row.
  check('data', 'Depths 1-4 roll the act\'s own campaign row (roster, introduce)', [1, 2, 3, 4].every((d) => E.endlessLevel(d) === campaignLevel(levelFor(d))));
  check('data', 'the cycle wraps: Barrow -> Heart -> Wood -> Mill', E.endlessNextLevel(3) === 4 && E.endlessNextLevel(4) === 1 && E.endlessNextLevel(1) === 2 && E.levelOfDepth(4) === 4 && E.levelOfDepth(5) === 1 && E.levelOfDepth(11) === 3 && E.levelOfDepth(12) === 4 && E.levelOfDepth(13) === 1);
  let rising = true;
  const keys = ['hpMul', 'dmgMul', 'budget', 'bossHp', 'addHpMul'];
  for (let r = 1; r <= 6; r++) {
    for (let d = 5; d <= 16; d++) {
      const a = d === 5 ? difficulty(4, r) : E.endlessDifficulty(d - 1, r);
      const b = E.endlessDifficulty(d, r);
      for (const k of keys) if (b[k] < a[k]) rising = false;
      if (b.eliteChance > E.ELITE_CAP + 1e-9) rising = false;
    }
  }
  check('data', 'past Depth 4 the numbers never fall below the Heart\'s and rise every depth (elite capped)', rising, { d5: E.endlessDifficulty(5, 6).hpMul, d8: E.endlessDifficulty(8, 6).hpMul, d12: E.endlessDifficulty(12, 6).hpMul });
  const mixed = E.endlessLevel(5);
  check('data', 'Depth 5 (the Wood) mixes in Mill, Barrow and Heart creatures at the guest weight', mixed.roster.toad > 0 && mixed.roster.knight > 0 && mixed.roster.husk > 0 && mixed.roster.boar === levelFor(1).roster.boar && mixed.introduce.husk === levelFor(4).introduce.husk + 1, { toad: mixed.roster.toad, knight: mixed.roster.knight, husk: mixed.roster.husk });
  check('data', 'Depths 1-4 mix nothing in (the Heart rolls its own roster)', E.endlessLevel(4) === levelFor(4));
  let alt = true;
  for (let s = 1; s <= 20; s++) for (const act of [1, 2, 3, 4]) if (E.endlessBossIndex(act, s) === E.endlessBossIndex(act + E.CYCLE, s)) alt = false;
  check('data', 'each cycle meets the other boss of the act (seeds 1-20, all acts)', alt);
}

// ------------------------------------------------------------ campaign --
{
  const w = build(SEED);
  w.run().startCampaign({ level: 1, harness: true });
  w.ap.configure(true);
  const v = playUntil(w, (x) => x.room >= 2);
  const c = w.run().campaign();
  check('campaign', 'a plain campaign has no endless key in its record, view or level events', !('endless' in c) && !('depth' in c) && !('endless' in v) && w.log.every((e) => !('depth' in e)));
}

// ------------------------------------------------------------- descent --
let saveTree = null;
let depth4Hash = null;
{
  const w = build(SEED);
  let v = descend(w);
  const reached = !!(v.endless && v.endless.depth === 5);
  check('descent', `seed ${SEED}: the autopilot plays an endless descent into Depth 5`, reached, { phase: v.phase, endless: v.endless ?? null });
  if (reached) {
    const clr = w.log.filter((e) => e.type === 'level_clear');
    const fourth = clr.find((e) => e.depth === 4);
    check('descent', "Depth 4's clear (the Heart) is not final: it leads to the Wood", !!fourth && fourth.final === false && fourth.next === 1 && fourth.level === 4, fourth);
    const third = clr.find((e) => e.depth === 3);
    check('descent', "Depth 3's clear (the Barrow) leads on to the Heart", !!third && third.final === false && third.next === 4 && third.level === 3, third);
    check('descent', 'the autopilot played Depth 4 in the Heart (its own roster)', w.log.some((e) => e.type === 'level_start' && e.depth === 4 && e.level === 4));
    const won = w.log.find((e) => e.type === 'campaign_won');
    check('descent', 'campaign_won fires once, at Depth 4', !!won && won.depth === 4 && w.log.filter((e) => e.type === 'campaign_won').length === 1, won);
    const tr = w.log.filter((e) => e.type === 'level_transit').at(-1);
    check('descent', 'the card to the Wood carries Depth 5', tr && tr.depth === 5 && tr.to === 1, tr);
    const c = w.run().campaign();
    check('descent', 'campaignState names the depth and the win', c.endless === true && c.depth === 5 && c.won === true && c.next === 2, { depth: c.depth, won: c.won, next: c.next });
    const plan = w.run().roomPlan();
    const want = E.endlessDifficulty(5, 1);
    check('descent', "Depth 5 room 1 rolls endlessDifficulty(5, 1)'s numbers", plan && plan.hpMul === want.hpMul && plan.dmgMul === want.dmgMul && plan.budget === want.budget, { plan: plan && { hpMul: plan.hpMul, dmgMul: plan.dmgMul, budget: plan.budget }, want: { hpMul: want.hpMul, dmgMul: want.dmgMul, budget: want.budget } });
    depth4Hash = hashState(w.io.capture());
    // A capture a little into the room (the save leg).
    for (let i = 0; i < 300; i++) w.step();
    saveTree = clonePlain(w.io.capture());
    // On to room 8 by the probe skip: the boss is the cycle's other boss.
    w.world.cmd('skipToRoom', 8);
    w.step();
    v = w.run().view();
    const lv = levelFor(1);
    const wantBoss = lv.bosses[E.endlessBossIndex(5, v.frame.seed)].kind;
    const spawn = w.log.filter((e) => e.type === 'boss_spawn').at(-1);
    check('descent', `Depth 5 room 8 holds ${wantBoss} (the other Act I boss from Depth 1's)`, v.actBoss && v.actBoss.kind === wantBoss && spawn && (spawn.kind ?? 'stag') === wantBoss, { view: v.actBoss, spawn: spawn && spawn.kind });
    const s = w.run().endRun('defeat');
    check('descent', 'the end summary names the depth and the campaign win', s.campaign.endless === true && s.campaign.depth === 5 && s.campaign.won === true && s.campaign.complete === true && s.campaign.depthsCleared >= 2, { endless: s.campaign.endless, depth: s.campaign.depth, won: s.campaign.won, complete: s.campaign.complete, cleared: s.campaign.depthsCleared });

    // -------------------------------------------------------- profile --
    const mem = new Map();
    const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, x) => mem.set(k, String(x)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
    const ps = createProfileStore({ store: createSaveStorage({ storage }) });
    const r1 = ps.recordRun({ act: s.act, victory: false, result: 'defeat', roomsCleared: 25, kills: 300, timeSec: s.ticks / 60, seed: s.seed, campaign: s.campaign });
    const p = ps.get().records;
    check('profile', 'the descent records gameWon, endlessRuns 1 and endlessBestDepth 5', p.gameWon === true && p.endlessRuns === 1 && p.endlessBestDepth === 5 && p.campaignsCompleted === 1 && r1.endless && r1.endless.newDepthRecord === true, { gameWon: p.gameWon, endlessRuns: p.endlessRuns, endlessBestDepth: p.endlessBestDepth, endless: r1.endless });
    check('profile', 'Depth 5 stays out of the per-level records (Level 1 deepest room is from Depth 1)', (p.deepestRoom[1] ?? 0) === s.campaign.levels.find((l) => l.index === 1).rooms && p.levelClears[1] === 0, { deepestRoom: p.deepestRoom });
    const r2 = ps.recordRun({ act: 1, result: 'defeat', roomsCleared: 3, kills: 10, timeSec: 100, seed: 9, campaign: { ...s.campaign, depth: 2, index: 2, won: false, complete: false, levels: s.campaign.levels.slice(0, 2) } });
    check('profile', 'a shallower descent keeps the record', ps.get().records.endlessBestDepth === 5 && r2.endless.newDepthRecord === false);
  }
}

// -------------------------------------------------------------- replay --
if (depth4Hash) {
  const w = build(SEED);
  descend(w);
  const h = hashState(w.io.capture());
  check('replay', 'the same seed reaches Depth 5 with the same state hash', h === depth4Hash, { a: depth4Hash, b: h });
}

// ---------------------------------------------------------------- save --
if (saveTree) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(saveTree));
  const contA = a.continuation(600);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(saveTree));
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes.map((x) => x.h)) === JSON.stringify(contB.hashes.map((x) => x.h)) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const v = a.run().view();
  check('save', 'a Depth 5 capture continues bit-identically in a fresh world, still endless', ok1.ok && ok2.ok && same && v.endless && v.endless.depth === 5, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length, endless: v.endless ?? null });
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
