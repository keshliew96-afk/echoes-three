#!/usr/bin/env node
// CAMPAIGN save / records probe (docs/gauntlet/PLAN.md §12.8, gates GC.9,
// GC.10) — headless Node, the sim built exactly like src/main.js.
//
//   node tools/gntCAMPAIGN-save.mjs [--seed 7] [--out captures/gntCAMPAIGN-save.json]
//
// Legs:
//   card     a campaign cleared to the level-clear card; capture mid-card;
//            apply into the same world AND a fresh world; both continue
//            bit-identically through the card's advance into Level 2
//            (hashes every 60 ticks + every non-sound event).
//   level2   the same for a capture mid-Level 2 (the carried build rides).
//   migrate2 a schema-2 file of an active act-2 run (no campaign key) ->
//            parseFile migrates to schema 3: a campaign from level 2 (index
//            1, not harness), meta.level / levelName / campaign; applied to a
//            fresh world it clears Level 2 into the card and advances to 3.
//   migrate1 a synthetic schema-1 file (8 skill slots, 2-socket rows) chains
//            1 -> 2 -> 3.
//   score    scoreCampaign(one level) === scoreRun for a grid of inputs; the
//            campaign formula for a 3-level campaign by hand.
//   profile  noteLevelClear unlocks N+1 at once (persisted), recordRun
//            counts campaigns / completed / abandoned / furthest level /
//            fastest campaign (Level-1 starts only) / level clears; a v1
//            profile without the new keys loads with the defaults.
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
const { scriptedInput } = await import(u('src/sim/script.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { encodeOrdered, buildFile, parseFile, SCHEMA, clonePlain } = await import(u('src/save/codec.js'));
const { scoreRun, scoreCampaign, createProfileStore, freshProfile } = await import(u('src/save/profile.js'));
const { createSaveStorage, PROFILE_KEY } = await import(u('src/save/storage.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '7'));
const OUT = opt('out', 'captures/gntCAMPAIGN-save.json');

function build(seed = SEED) {
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
  const autopilot = world.runSystem().autopilot;
  const rawStep = world.step;
  world.step = (tick, snap, ...rest) => rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
  });
  const io = createStateIO({ clock, rng, registry, world });
  function stepN(n) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, scriptedInput(0, t, { skillSlots: 0 })))) stepped += 1;
    }
    return stepped;
  }
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      stepN(Math.min(every, n - done));
      hashes.push({ tick: clock.tick, h: hashState(io.capture()) });
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  const run = () => world.runSystem();
  return { rng, registry, bus, clock, world, io, stepN, continuation, run };
}

// Clear the live level: jump to the Stag, fell it and every add, step until
// the phase moves (transit / victory).
function clearLevel(w) {
  w.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 400; i++) {
    const v = w.run().view();
    if (v.phase === 'transit' || v.phase === 'victory' || v.phase === 'defeat') return v.phase;
    if (v.phase === 'combat' && v.room === 8) {
      w.world.cmd('killBoss');
      w.world.cmd('killAllEnemies');
    }
    w.stepN(5);
  }
  return 'stuck';
}

const checks = [];
function check(leg, what, ok, got = null) {
  checks.push({ leg, what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 300)}`}`);
}

function sameContinuation(a, b) {
  if (a.hashes.length !== b.hashes.length) return { hashes: [a.hashes.length, b.hashes.length] };
  for (let i = 0; i < a.hashes.length; i++) if (a.hashes[i].h !== b.hashes[i].h || a.hashes[i].tick !== b.hashes[i].tick) return { at: i, a: a.hashes[i], b: b.hashes[i] };
  if (a.events.length !== b.events.length) return { events: [a.events.length, b.events.length] };
  for (let i = 0; i < a.events.length; i++) if (a.events[i] !== b.events[i]) return { event: i, a: a.events[i].slice(0, 200), b: b.events[i].slice(0, 200) };
  return null;
}

// Round trip: capture -> file text -> parse -> apply (same world + fresh
// world) -> identical continuations.
function roundTrip(leg, w, ticks) {
  const tree = w.io.capture();
  const h0 = hashState(tree);
  const meta = { level: w.run().view().act };
  const { text } = buildFile({ slot: { id: 'slot-1', kind: 'manual', name: leg }, meta, state: tree, game: 'probe', createdAt: 'x', savedAt: 'x' });
  const pf = parseFile(text);
  check(leg, `file parses at schema ${SCHEMA} (no migration)`, pf.ok && !pf.migrated && pf.file.schema === SCHEMA && pf.file.state.v === SCHEMA, { ok: pf.ok, error: pf.error, detail: pf.detail });
  const A = w.continuation(ticks);
  const ap = w.io.apply(pf.file.state);
  check(leg, 'apply into the same world', ap.ok && hashState(w.io.capture()) === h0, ap);
  const B = w.continuation(ticks);
  const d1 = sameContinuation(A, B);
  check(leg, `same-world continuation identical over ${ticks} ticks`, d1 === null, d1);
  const f = build(999);
  const ap2 = f.io.apply(pf.file.state);
  check(leg, 'apply into a fresh world', ap2.ok && hashState(f.io.capture()) === h0, ap2);
  const C = f.continuation(ticks);
  const d2 = sameContinuation(A, C);
  check(leg, `fresh-world continuation identical over ${ticks} ticks`, d2 === null, d2);
  return { h0, after: f.run().campaign(), view: f.run().view() };
}

const out = { seed: SEED, schema: SCHEMA, legs: {} };

// ------------------------------------------------------------------ card --
{
  const w = build();
  w.stepN(30);
  w.world.cmd('startCampaign', { level: 1 });
  w.stepN(120);
  const ph = clearLevel(w);
  check('card', 'Level 1 clears into the transit card', ph === 'transit', ph);
  w.stepN(60); // mid-card
  const c0 = w.run().campaign();
  check('card', 'card state is live (kind clear, 1 -> 2)', c0.card && c0.card.kind === 'clear' && c0.card.from === 1 && c0.card.to === 2, c0.card);
  const r = roundTrip('card', w, 900); // through the sim's own hard advance (600 ticks) into Level 2
  check('card', 'the loaded card advances into Level 2 (index 2)', r.after.active && r.after.level === 2 && r.after.index === 2 && r.view.phase !== 'transit', { c: r.after && { level: r.after.level, index: r.after.index }, phase: r.view.phase });
  out.legs.card = { card: c0.card, after: { level: r.after.level, index: r.after.index, phase: r.view.phase } };
}

// ---------------------------------------------------------------- level2 --
{
  const w = build();
  w.stepN(30);
  w.world.cmd('startCampaign', { level: 1 });
  w.stepN(120);
  clearLevel(w);
  w.world.cmd('campaignAdvance');
  w.stepN(40);
  w.world.cmd('campaignAdvance');
  w.stepN(200);
  const v = w.run().view();
  check('level2', 'mid-Level 2 of a campaign', v.act === 2 && v.phase === 'combat' && w.run().campaign().index === 2, { act: v.act, phase: v.phase });
  const r = roundTrip('level2', w, 600);
  out.legs.level2 = { after: { level: r.after.level, index: r.after.index } };
}

// -------------------------------------------------------------- migrate2 --
function v2FileOf(tree, meta) {
  const t = clonePlain(tree);
  t.v = 2;
  delete t.systems.run.campaign;
  delete t.systems.run.autoReturnTick;
  const file = { format: 'echoes-save', schema: 2, game: '0.5.87', slot: { id: 'slot-1', kind: 'manual', name: 'v2' }, createdAt: 'x', savedAt: 'x', meta, state: t, hash: hashState(t) };
  return encodeOrdered(file);
}
{
  const w = build();
  w.stepN(30);
  w.world.cmd('startRun', { act: 2 });
  w.stepN(300);
  const tree = w.io.capture();
  const text = v2FileOf(tree, { act: 2, actName: 'The Sunken Mill', mode: 'run', room: 1, phase: 'combat' });
  const pf = parseFile(text);
  const c = pf.ok ? pf.file.state.systems.run.campaign : null;
  check('migrate2', 'schema-2 act run parses and migrates to schema 3', pf.ok && pf.migrated && pf.file.schema === 3 && pf.file.state.v === 3, { ok: pf.ok, error: pf.error, detail: pf.detail });
  check('migrate2', 'the act run became a campaign from level 2 (index 1, not harness, no grant)', c && c.mode === 'campaign' && c.harness === false && c.startLevel === 2 && c.level === 2 && c.index === 1 && c.grant === null, c);
  check('migrate2', 'meta gains level / levelName / campaign', pf.ok && pf.file.meta.level === 2 && pf.file.meta.levelName === 'The Sunken Mill' && pf.file.meta.campaign && pf.file.meta.campaign.startLevel === 2, pf.ok ? pf.file.meta : null);
  const f = build(123);
  const ap = f.io.apply(pf.file.state);
  check('migrate2', 'the migrated tree applies to a fresh world', ap.ok, ap);
  const ph = clearLevel(f);
  check('migrate2', 'the migrated run clears Level 2 into the card (a campaign, not a single run)', ph === 'transit', ph);
  f.stepN(40);
  f.world.cmd('campaignAdvance');
  f.stepN(30);
  const cv = f.run().campaign();
  check('migrate2', '...and advances to Level 3', cv.level === 3 && cv.index === 2, { level: cv.level, index: cv.index });
  // A camp tree (no run) migrates to campaign: null.
  const camp = build();
  camp.stepN(30);
  const pfc = parseFile(v2FileOf(camp.io.capture(), { act: 1, mode: 'camp' }));
  check('migrate2', 'a camp tree migrates with campaign: null', pfc.ok && pfc.file.state.systems.run.campaign === null && pfc.file.meta.campaign === null, pfc.ok ? pfc.file.state.systems.run.campaign : pfc);
  out.legs.migrate2 = { campaign: c, meta: pf.ok ? pf.file.meta : null };
}

// -------------------------------------------------------------- migrate1 --
{
  const w = build();
  w.stepN(30);
  w.world.cmd('startRun', { act: 1 });
  w.stepN(200);
  const t = clonePlain(w.io.capture());
  t.v = 1;
  delete t.systems.run.campaign;
  delete t.systems.run.autoReturnTick;
  // v1 shape: 8 skill slots, 2-socket active rows / 1-socket passive rows.
  while (t.systems.skills.slots.length < 8) t.systems.skills.slots.push(null);
  t.systems.build.assignments = (t.systems.build.assignments || []).map(([id, row]) => [id, row.slice(0, 2)]);
  const file = { format: 'echoes-save', schema: 1, game: '0.4.63', slot: { id: 'slot-1', kind: 'manual', name: 'v1' }, createdAt: 'x', savedAt: 'x', meta: { act: 1, mode: 'run', skills: [] }, state: t, hash: hashState(t) };
  const pf = parseFile(encodeOrdered(file));
  const c = pf.ok ? pf.file.state.systems.run.campaign : null;
  check('migrate1', 'schema-1 chains 1 -> 2 -> 3', pf.ok && pf.migrated && pf.file.schema === 3 && pf.file.state.v === 3 && c && c.mode === 'campaign' && c.level === 1, { ok: pf.ok, error: pf.error, detail: pf.detail, c });
  const f = build(5);
  check('migrate1', 'the chained tree applies', pf.ok && f.io.apply(pf.file.state).ok);
}

// ----------------------------------------------------------------- score --
{
  let same = 0;
  let total = 0;
  const bad = [];
  for (const act of [1, 2, 3])
    for (const rooms of [0, 3, 8])
      for (const kills of [0, 17, 60])
        for (const victory of [false, true])
          for (const challenge of ['relaxed', 'standard', 'harrowing'])
            for (const timeSec of [300, 1200]) {
              total += 1;
              const a = scoreRun({ roomsCleared: rooms, kills, victory, act, challenge, timeSec });
              const b = scoreCampaign({ levels: [{ level: act, rooms, kills, cleared: victory }], challenge, complete: victory, timeSec });
              if (a === b) same += 1;
              else if (bad.length < 5) bad.push({ act, rooms, kills, victory, challenge, timeSec, a, b });
            }
  check('score', `one-level campaign score === scoreRun (${same}/${total})`, same === total, bad);
  const three = scoreCampaign({
    levels: [
      { level: 1, rooms: 8, kills: 40, cleared: true },
      { level: 2, rooms: 8, kills: 50, cleared: true },
      { level: 3, rooms: 8, kills: 60, cleared: true },
    ],
    challenge: 'standard',
    complete: true,
    timeSec: 2000,
  });
  const byHand = Math.round((800 + 200 + 1000) * 1 + (800 + 250 + 1000) * 1.5 + (800 + 300 + 1000) * 2) + (2700 - 2000);
  check('score', `3-level campaign by hand (${three} === ${byHand})`, three === byHand);
  out.legs.score = { same, total, three };
}

// --------------------------------------------------------------- profile --
{
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  };
  const store = createSaveStorage({ storage });
  // A v1 profile written before CAMPAIGN (no new keys) loads with defaults.
  const old = freshProfile();
  delete old.records.campaigns;
  delete old.records.levelClears;
  delete old.records.abandoned;
  old.records.victories = 2;
  store.writeAtomic(PROFILE_KEY, JSON.stringify(old));
  const ps = createProfileStore({ store });
  const p0 = ps.get();
  check('profile', 'an older v1 profile loads with the campaign defaults', p0.records.campaigns === 0 && p0.records.levelClears[1] === 0 && p0.records.abandoned === 0 && p0.records.victories === 2, p0.records);
  const lc = ps.noteLevelClear(1);
  const disk = JSON.parse(store.read(PROFILE_KEY));
  check('profile', 'noteLevelClear(1) unlocks Level 2 and persists at once', lc.unlocked && disk.unlocks.acts.includes(2) && disk.records.levelClears[1] === 1, { lc, unlocks: disk.unlocks });
  // An abandoned campaign after Level 1 (Quit to Lobby in Level 2).
  const ab = ps.recordRun({
    act: 2,
    result: 'abandoned',
    roomsCleared: 11,
    kills: 70,
    timeSec: 700,
    challenge: 'standard',
    lastRoom: 3,
    campaign: { mode: 'campaign', startLevel: 1, level: 2, levels: [{ level: 1, rooms: 8, kills: 50, cleared: true, ticks: 30000 }, { level: 2, rooms: 3, kills: 20, cleared: false, ticks: 9000 }], complete: false },
  });
  const r1 = ps.get().records;
  check('profile', 'abandoned campaign: abandoned 1, defeats unchanged, campaigns 1, furthest 2, Level 2 still unlocked', r1.abandoned === 1 && r1.defeats === 0 && r1.campaigns === 1 && r1.furthestLevel === 2 && ps.get().unlocks.acts.includes(2) && ab.entry.result === 'abandoned', r1);
  ps.noteLevelClear(1);
  ps.noteLevelClear(2);
  ps.noteLevelClear(3);
  const done = ps.recordRun({
    act: 3,
    victory: true,
    result: 'victory',
    roomsCleared: 24,
    kills: 150,
    timeSec: 1500,
    challenge: 'standard',
    lastRoom: 8,
    campaign: { mode: 'campaign', startLevel: 1, level: 3, levels: [1, 2, 3].map((l) => ({ level: l, rooms: 8, kills: 50, cleared: true, ticks: 30000 })), complete: true },
  });
  const r2 = ps.get().records;
  check('profile', 'complete campaign from Level 1: completed 1 of 2, fastest campaign 1500 s, level clears 2/1/1, furthest 3, all levels open', r2.campaignsCompleted === 1 && r2.campaigns === 2 && r2.fastestCampaignSec === 1500 && r2.levelClears[1] === 2 && r2.levelClears[2] === 1 && r2.levelClears[3] === 1 && r2.furthestLevel === 3 && ps.get().unlocks.acts.join() === '1,2,3', { r2, entry: done.entry });
  ps.recordRun({ act: 3, victory: true, result: 'victory', roomsCleared: 8, kills: 40, timeSec: 400, challenge: 'standard', lastRoom: 8, campaign: { mode: 'campaign', startLevel: 3, level: 3, levels: [{ level: 3, rooms: 8, kills: 40, cleared: true, ticks: 24000 }], complete: true } });
  check('profile', 'a Level-3 start does not set the fastest campaign', ps.get().records.fastestCampaignSec === 1500 && ps.get().records.campaignsCompleted === 2, ps.get().records);
  check('profile', 'high-score entries carry campaign / startLevel / levels / result', done.entry.campaign === true && done.entry.startLevel === 1 && done.entry.levels === 3 && done.entry.result === 'victory', done.entry);
  out.legs.profile = { records: ps.get().records, unlocks: ps.get().unlocks };
}

const fails = checks.filter((c) => !c.ok);
out.checks = checks;
out.ok = fails.length === 0;
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(out, null, 1));
console.log(`${checks.length - fails.length}/${checks.length} checks pass -> ${OUT}`);
process.exit(fails.length ? 1 : 0);
