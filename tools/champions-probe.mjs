#!/usr/bin/env node
// CHAMPION ROOMS probe (docs/CHAMPIONS.md), headless sim, no browser:
//   crown    every level rolls one crown door, before room 4 or 5 (hash, no
//            run-stream draw); the legacy single run and the tutorial never
//            meet one
//   door     the path screen into the crown room carries exactly one crown
//            door, never the cursed one, and taking it makes the champion room
//   room     the act's champion leads wave 1: named, not elite, no affixes,
//            the room's champion HP; the room view carries its plate
//   moves    each land's champion telegraphs both of its moves and lands them
//   rage     below half health it rages once
//   chest    the champion falls where it stood; clearing the room opens its
//            chest: a greater relic pick (rare or legendary) after the draft
//   endless  an Endless depth meets its land's champion
//   replay   the same seed plays a champion room to the same events
//   save     a mid-fight capture continues bit-identically in a fresh world
//
//   node tools/champions-probe.mjs [--seed 4] [--out captures/champions-probe.json]
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
const C = await import(u('src/sim/champions.js'));
const { CHAMPION_KITS } = await import(u('src/sim/enemies/champions.js'));
const { RELICS } = await import(u('src/sim/relics.js'));
const { GOVERNOR } = await import(u('src/sim/enemies.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/champions-probe.json');
const R = C.CHAMPION_RULES;

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
    if (e.type.startsWith('champion_') || e.type.startsWith('crown_') || ['telegraph_start', 'room_cleared', 'relic_offer', 'hit', 'death', 'path_offer', 'enemy_spawn'].includes(e.type)) log.push(e);
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
  const run = () => world.runSystem();
  return { registry, bus, clock, world, ap, io, step, continuation, log, run };
}

function holdParty(w) {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
}
function stepUntil(w, pred, guard, each = null) {
  for (let i = 0; i < guard; i++) {
    if (each) each();
    w.step();
    if (pred()) return true;
  }
  return false;
}
const room = (w) => (w.world.snapshotState ? w.world.snapshotState().room : null);
const champ = (w) => {
  const s = w.log.find((e) => e.type === 'champion_spawn');
  return s ? w.registry.byId(s.id) : null;
};
// A Level-`level` campaign walked straight into a champion room `n`.
function into(seed, n = 4, level = 1, extra = {}) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true, ...extra });
  w.run().cmd('championRoom', [n]);
  w.world.cmd('skipToRoom', n);
  w.step();
  return w;
}
// Clear the live room and walk the pages (draft declined, relic taken) to the
// next path screen.
function toPath(w) {
  w.world.cmd('clearRoom');
  for (let i = 0; i < 600 && w.run().view().phase !== 'path'; i++) {
    const ph = w.run().view().phase;
    if (ph === 'reward') w.run().declineReward();
    else if (ph === 'relic') w.run().chooseRelic(0);
    w.step();
  }
  return w.run().view().path;
}

// --------------------------------------------------------------- crown --
{
  const rooms = new Set();
  const sides = new Set();
  let ok = true;
  for (let s = 1; s <= 60; s++)
    for (let i = 1; i <= 4; i++) {
      const c = C.crownFor(s * 7919, i);
      rooms.add(c.room);
      sides.add(c.side);
      if (!R.rooms.includes(c.room)) ok = false;
    }
  check('crown', 'every level rolls one crown door, before room 4 or room 5, either side', ok && rooms.size === 2 && sides.size === 2, { rooms: [...rooms], sides: [...sides] });
  const w = build(SEED);
  w.run().startCampaign({ level: 1, harness: true });
  check('crown', 'a campaign level carries a crown', !!w.run().cmd('crownOf', []), w.run().cmd('crownOf', []));
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  check('crown', 'the legacy single run never meets one', legacy.run().cmd('crownOf', []) === null && legacy.run().cmd('championRoom', [4]) === null);
  const tut = build(SEED);
  tut.run().startCampaign({ tutorial: true, harness: true });
  check('crown', 'the tutorial never meets one', tut.run().cmd('crownOf', []) === null);
  // The crown roll draws nothing from the run stream: the frame and the
  // first rooms of a seed are the same with or without it.
  const a = build(SEED);
  a.run().startCampaign({ level: 1, harness: true });
  const b = build(SEED);
  b.run().startCampaign({ level: 1, harness: true });
  b.run().cmd('crownOf', []);
  check('crown', 'reading the crown draws nothing from the run stream', JSON.stringify(a.run().view().frame) === JSON.stringify(b.run().view().frame));
}

// ---------------------------------------------------------------- door --
{
  let seen = 0;
  let bad = [];
  for (let s = 1; s <= 12; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 1, harness: true });
    const c = w.run().cmd('crownOf', []);
    w.world.cmd('skipToRoom', c.room - 1);
    w.step();
    const p = toPath(w);
    if (!p) {
      bad.push({ seed: s, why: 'no path' });
      continue;
    }
    const crowns = p.options.filter((o) => o.champion);
    if (crowns.length !== 1 || crowns[0].win !== 'champion' || crowns[0].curse || crowns[0].event || p.nextRoom !== c.room) bad.push({ seed: s, opts: p.options, next: p.nextRoom });
    else seen += 1;
  }
  check('door', 'the crown screen carries exactly one crown door, uncursed (seeds 1-12)', bad.length === 0 && seen === 12, bad.slice(0, 2));
  // A cursed door on the crown's own side: the crown takes the other.
  const w = build(SEED);
  w.run().startCampaign({ level: 1, harness: true });
  w.world.cmd('skipToRoom', 3);
  w.step();
  w.run().cmd('relicDoor', ['short_fuse', 0]);
  w.run().cmd('crownDoor', [0]);
  const p = toPath(w);
  const crown = p && p.options.find((o) => o.champion);
  check('door', 'never the cursed door: a curse on its side moves the crown across', !!crown && crown.side === 1 && !!p.options[0].curse, p && p.options);
  const r = w.run().choosePath(crown.side);
  for (let i = 0; i < 240 && w.run().view().phase !== 'combat'; i++) w.step();
  check('door', 'taking the crown door makes the next room the champion room', r && r.champion === 'briar_knight' && w.run().view().mode === 'champion' && w.log.some((e) => e.type === 'crown_door_taken'), { r, mode: w.run().view().mode });
  check('door', 'the crown door keeps its own draft (a Skill or Node reward)', r && (r.reward === 'skill' || r.reward === 'node'), r && r.reward);
}

// --------------------------------------------------------- room / moves --
const LEVEL_CHAMP = { 1: 'briar_knight', 2: 'sluice_warden', 3: 'bone_reeve', 4: 'hollow_choir' };
for (const level of [1, 2, 3, 4]) {
  const w = into(SEED, 4, level);
  check('room', `Level ${level}: room 4 plays as the champion room`, w.run().view().mode === 'champion', w.run().view().mode);
  stepUntil(w, () => !!champ(w), 240);
  const e = champ(w);
  const hpMul = w.run().roomPlan().hpMul;
  check('room', `Level ${level}: ${LEVEL_CHAMP[level]} leads wave 1, not elite, no affixes, ${R.hp} x hpMul HP`, !!e && e.kind === LEVEL_CHAMP[level] && !e.elite && !e.affixes && Math.abs(e.maxHp - R.hp * hpMul) < 1, e && { kind: e.kind, elite: e.elite, maxHp: e.maxHp, want: R.hp * hpMul });
  const rv = room(w);
  check('room', `Level ${level}: the room view carries the champion's plate`, !!rv && rv.champion && rv.champion.kind === LEVEL_CHAMP[level] && rv.champion.hp > 0, rv && rv.champion);
  // Idle the party (kept standing) beside the champion until both moves have
  // been telegraphed and landed. Other enemies are cleared so it is alone.
  const moves = CHAMPION_KITS[LEVEL_CHAMP[level]].moves;
  const told = new Set();
  const landed = new Set();
  let hits = 0;
  let enterOk = true;
  const spawnTick = w.log.find((x) => x.type === 'champion_spawn').tick;
  for (let i = 0; i < 60 * 45 && landed.size < 2; i++) {
    holdParty(w);
    for (const x of w.registry.all()) if (x.faction === 'hostile' && x.state === 'active' && x.id !== e.id && x.hp > 0 && x.kind !== 'eshot') x.hp = 0.001;
    w.step();
  }
  for (const x of w.log) {
    if (x.type === 'champion_tell' && x.id === e.id) {
      told.add(x.move);
      if (x.tick < spawnTick + R.entranceTicks) enterOk = false;
    }
    if (x.type === 'champion_move' && x.id === e.id) landed.add(x.move);
    if (x.type === 'hit' && x.attacker === e.id) hits += 1;
  }
  check('moves', `Level ${level}: ${LEVEL_CHAMP[level]} telegraphs both moves (${moves.join(', ')}) and lands them`, moves.every((m) => told.has(m) && landed.has(m)), { told: [...told], landed: [...landed] });
  check('moves', `Level ${level}: it waits out its entrance and lands hits on the party`, enterOk && hits > 0, { hits });
  // Governor: its tells start >= 1.2 s after any other player-targeted start
  // (unless starved, which an otherwise empty room never is).
  const starts = w.log.filter((x) => x.type === 'telegraph_start' && x.playerTargeted).map((x) => x.tick);
  let gap = Infinity;
  for (let i = 1; i < starts.length; i++) gap = Math.min(gap, starts[i] - starts[i - 1]);
  check('moves', `Level ${level}: player-targeted wind-ups stay ${GOVERNOR.staggerTicks} ticks apart`, starts.length >= 2 && gap >= GOVERNOR.staggerTicks, { starts: starts.length, minGap: gap });
}

// ---------------------------------------------------------------- rage --
{
  const w = into(SEED, 5, 2);
  stepUntil(w, () => !!champ(w), 240);
  const e = champ(w);
  e.hp = e.maxHp * 0.4;
  for (let i = 0; i < 30; i++) {
    holdParty(w);
    w.step();
  }
  const rages = w.log.filter((x) => x.type === 'champion_rage');
  check('rage', 'below half health it rages, once', rages.length === 1 && e.rage === true && room(w).champion.rage === true, rages.length);
}

// --------------------------------------------------------------- chest --
let saveTree = null;
{
  const w = into(SEED, 4, 1);
  stepUntil(w, () => !!champ(w), 240);
  const e = champ(w);
  for (let i = 0; i < 300; i++) {
    holdParty(w);
    w.step();
    if (i === 200) saveTree = clonePlain(w.io.capture());
  }
  const at = { x: e.x, z: e.z };
  w.world.cmd('setHp', e.id, 0);
  stepUntil(w, () => w.log.some((x) => x.type === 'champion_fall'), 30);
  const fall = w.log.find((x) => x.type === 'champion_fall');
  check('chest', 'the champion falls where it stood', !!fall && Math.hypot(fall.x - at.x, fall.z - at.z) < 0.6 && room(w).chest, fall);
  const champClear = () => w.log.find((x) => x.type === 'room_cleared' && x.champion);
  check('chest', 'the room is not cleared while its waves stand', !champClear());
  w.world.cmd('killAllEnemies');
  w.ap.configure(true);
  stepUntil(w, () => !!champClear(), 60 * 120, () => holdParty(w));
  const c = champClear();
  check('chest', 'the room clears as the champion room, chest spot carried', !!c && c.champion === 'briar_knight' && c.chest && !c.softFailed, c);
  check('chest', 'the chest opens with the clear', w.log.some((x) => x.type === 'champion_chest'));
  w.ap.configure(false);
  for (let i = 0; i < 600 && w.run().view().phase !== 'relic'; i++) {
    if (w.run().view().phase === 'reward') w.run().declineReward();
    w.step();
  }
  const offer = w.log.filter((x) => x.type === 'relic_offer').at(-1);
  check('chest', 'after the draft the chest pays a greater relic pick (rare or legendary)', !!offer && offer.source === 'champion' && offer.choices.length > 0 && offer.choices.every((id) => RELICS[id].rarity !== 'common'), offer);
}

// ------------------------------------------------------------- endless --
{
  const w = build(SEED);
  w.run().startCampaign({ endless: true, harness: true });
  check('endless', 'an Endless depth carries a crown', !!w.run().cmd('crownOf', []));
  w.run().cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  stepUntil(w, () => !!champ(w), 240);
  check('endless', "Depth 1 meets its land's champion (the Briar Knight)", !!champ(w) && champ(w).kind === 'briar_knight', champ(w) && champ(w).kind);
}

// -------------------------------------------------------------- replay --
{
  const a = into(SEED, 4, 3);
  a.ap.configure(true);
  const b = into(SEED, 4, 3);
  b.ap.configure(true);
  const ca = a.continuation(2400);
  const cb = b.continuation(2400);
  const same = JSON.stringify(ca.hashes) === JSON.stringify(cb.hashes) && JSON.stringify(ca.events) === JSON.stringify(cb.events);
  check('replay', 'a Level 3 champion room with the autopilot plays the same twice (40 s)', same && ca.events.length > 0, { events: ca.events.length });
}

// ---------------------------------------------------------------- save --
if (saveTree) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(saveTree));
  const contA = a.continuation(900);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(saveTree));
  const contB = b.continuation(900);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  check('save', 'a mid-fight capture continues bit-identically in a fresh world, champion and all', ok1.ok && ok2.ok && same && room(a) && room(a).champion, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length });
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
