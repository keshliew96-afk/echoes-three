#!/usr/bin/env node
// CROSS-RUN UNLOCKS probe (docs/UNLOCKS.md), headless.
//
//   node tools/unlocks-probe.mjs [--seeds 1-3] [--base <checkout before this slice>]
//
// Checks:
//   1. a campaign with nothing equipped plays event-for-event like the base
//      checkout (--base; skipped without it): unlocks never touch a run the
//      player did not pick them for;
//   2. a played campaign earns Embers on a profile (rooms, levels, deeds);
//   3. buying + equipping an unlock persists: a NEW profile store over the
//      same storage (a reload) still owns and wears it, and the next run is
//      started with it (kit skills, heirloom relic, purse Glint, vow numbers);
//   4. the boons ride a save (run state round trip) and the run summary;
//   5. the meta block survives damage and version changes (unknown unlocks
//      refunded), a records reset keeps it, and two tabs never lose a buy.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ROOT = resolve(opt('root', here));
const HASH_ONLY = argv.includes('--hash-only');
const seedsArg = opt('seeds', '1-3');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const MAX_TICKS = 240000;

const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));

function makeWorld(seed, types = null) {
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
  const log = [];
  if (types === 'all') bus.on('*', (e) => log.push(e));
  else for (const t of types ?? ['boons', 'relic_gain', 'glint_gain', 'run_end', 'level_clear']) bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  const step = (ap) => clock.stepOnce((t) => world.step(t, ap ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  return { world, registry, bus, clock, run, log, step };
}

function playCampaign(seed, { boons = undefined, types = null, maxTicks = MAX_TICKS } = {}) {
  const W = makeWorld(seed, types);
  const ap = W.run.autopilot;
  W.run.startCampaign({ level: 1, harness: true, ...(boons !== undefined ? { boons } : {}) });
  ap.configure(true);
  let summary = null;
  for (let i = 0; i < maxTicks; i++) {
    W.step(ap);
    const v = W.run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      summary = v.summary;
      break;
    }
  }
  return { ...W, summary };
}

// --hash-only: the plain campaign's whole event stream, hashed (used against --base).
function plainHashes() {
  return SEEDS.map((seed) => {
    const r = playCampaign(seed, { types: 'all', maxTicks: 30000 });
    const h = createHash('sha256').update(JSON.stringify(r.log)).digest('hex').slice(0, 16);
    return { seed, events: r.log.length, hash: h };
  });
}
if (HASH_ONLY) {
  console.log(JSON.stringify(plainHashes()));
  process.exit(0);
}

const fails = [];
const out = {};
const check = (ok, what) => {
  if (!ok) fails.push(what);
  return ok;
};

// ---------------------------------------------------- 1: no pick, no change --
const base = opt('base');
const mine = plainHashes();
out.plain = mine;
if (base) {
  const theirs = JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--hash-only', '--root', resolve(base), '--seeds', seedsArg], { encoding: 'utf8' }).trim().split('\n').pop());
  out.baseCompare = mine.map((m, i) => ({ seed: m.seed, mine: m.hash, base: theirs[i].hash, same: m.hash === theirs[i].hash }));
  check(out.baseCompare.every((r) => r.same), `a campaign with nothing equipped plays exactly like the base checkout (${JSON.stringify(out.baseCompare)})`);
}
// sanitizeBoons(null) / boons: null / undefined are the same run.
{
  const a = playCampaign(SEEDS[0], { types: 'all', maxTicks: 6000 });
  const b = playCampaign(SEEDS[0], { types: 'all', maxTicks: 6000, boons: null });
  const c = playCampaign(SEEDS[0], { types: 'all', maxTicks: 6000, boons: { kits: {}, vows: [], relic: 'nope' } });
  const H = (r) => createHash('sha256').update(JSON.stringify(r.log)).digest('hex');
  check(H(a) === H(b) && H(a) === H(c), 'empty or invalid boons are a plain run');
}

// ---------------------------------------------------------- 2-5: profile --
const { createSaveStorage } = await import(u('src/save/storage.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));
const U = await import(u('src/data/unlocks.js'));
const { difficulty } = await import(u('src/data/difficulty.js'));
const { RUN } = await import(u('src/sim/run.js'));

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _m: m,
  };
}
let clockMs = Date.parse('2026-10-04T00:00:00Z');
const now = () => new Date((clockMs += 1000)).toISOString();
const storage = memStorage();
const store = createSaveStorage({ storage });
let prof = createProfileStore({ store, now });

// Play campaigns until one clears Level I (earns Embers + deeds).
let won = null;
let earned = 0;
for (const seed of [...SEEDS, 4, 5, 6, 7, 8]) {
  const r = playCampaign(seed);
  if (!r.summary) continue;
  const s = r.summary;
  const summary = {
    act: s.act,
    victory: s.result === 'victory',
    result: s.result,
    roomsCleared: s.campaign ? s.campaign.levels.reduce((n, l) => n + (l.rooms || 0), 0) : s.rooms,
    kills: 0,
    timeSec: s.ticks / 60,
    seed: s.seed,
    challenge: s.challenge,
    lastRoom: s.lastRoom,
    campaign: s.campaign,
    relics: s.relics,
    curses: s.curses,
    boons: s.boons ?? null,
  };
  // (the game notes each level clear as it happens: save/index.js level_clear)
  for (const l of s.campaign ? s.campaign.levels : []) if (l.cleared) prof.noteLevelClear(l.level);
  prof.recordRun(summary);
  const a = prof.awardRun(summary);
  check(a.embers > 0 && a.written, `seed ${seed}: the run earned Embers (${a.embers})`);
  earned += a.embers;
  if (s.campaign && s.campaign.levelsCleared > 0) {
    won = { seed, award: a, summary };
    break;
  }
}
out.earned = earned;
check(won !== null, 'some autopilot campaign cleared Level I');
const m1 = prof.get().meta;
check(m1.embers === earned && m1.earned === earned, `balance = Embers earned (${m1.embers} vs ${earned})`);
if (won) {
  check(m1.deeds.includes('first_light'), 'the First Light deed was paid on the first Level I clear');
  check(Object.keys(m1.bosses).length >= 1, `a boss kill was counted (${JSON.stringify(m1.bosses)})`);
  check(m1.owned.vow_elite_tide === 0, 'the Level I vow unlocked itself (free, condition met)');
  check(m1.relicsSeen.length >= 1, `relics found are remembered (${m1.relicsSeen})`);
  out.award = won.award;
}

// Buy: a locked one refuses, a poor one refuses, a met + affordable one buys.
{
  const unseen = U.UNLOCK_IDS.find((id) => U.UNLOCKS[id].kind === 'heirloom' && !prof.get().meta.relicsSeen.includes(U.UNLOCKS[id].relic));
  if (unseen) check(prof.buyUnlock(unseen).reason === 'locked', `an heirloom of a relic never found is locked (${unseen})`);
  const other = createProfileStore({ store: createSaveStorage({ storage: memStorage() }), now });
  check(other.buyUnlock('kit_warden').reason === 'locked', 'Warden kit is locked before Level II is cleared');
  check(other.equipUnlock('vow_iron_hide').ok === false, 'an unowned vow cannot be worn');
}
check(prof.buyUnlock('nope').ok === false, 'an unknown unlock is refused');
// Give the profile enough Embers for the test purchases (a commit like any other).
const grant = (n) => prof.awardRun({ result: 'defeat', roomsCleared: Math.ceil(n / 3), campaign: null, challenge: 'standard' });
while (prof.get().meta.embers < 300) grant(90);
const r1 = prof.buyUnlock('kit_bulwark');
const r2 = prof.buyUnlock('purse_1');
const r3 = prof.buyUnlock('tint_emberforge');
const seenRelic = prof.get().meta.relicsSeen[0];
const r4 = seenRelic ? prof.buyUnlock(`heirloom_${seenRelic}`) : { ok: false };
check(r1.ok && r2.ok && r3.ok, `kit, purse and tint bought (${JSON.stringify([r1, r2, r3])})`);
check(!seenRelic || r4.ok || r4.reason === 'poor', `a found relic's heirloom can be bought (${JSON.stringify(r4)})`);
check(prof.buyUnlock('kit_bulwark').reason === 'owned', 'a second buy is refused');
if (won) check(prof.equipUnlock('vow_elite_tide', true).ok, 'an owned vow can be worn');

// RELOAD: a fresh store over the same storage.
prof = createProfileStore({ store, now });
const m2 = prof.get().meta;
check(m2.owned.kit_bulwark === U.UNLOCKS.kit_bulwark.cost && m2.loadout.kits.tank === 'kit_bulwark', 'after a reload the Bulwark kit is owned and equipped');
check(m2.loadout.purse === 1 && m2.loadout.tints.tank === 'tint_emberforge', 'after a reload the purse and the tint are equipped');
const boons = U.loadoutBoons(m2);
out.boons = boons;
check(boons && boons.kits && boons.kits.tank && boons.glint === 15, `the loadout becomes run boons (${JSON.stringify(boons)})`);
check(JSON.stringify(U.loadoutTints(m2)) === JSON.stringify({ tank: U.UNLOCKS.tint_emberforge.colors }), 'the tint is a render-only colour set');

// The NEXT run, started with those boons.
{
  const W = makeWorld(SEEDS[0], ['boons', 'relic_gain', 'glint_gain']);
  W.run.startCampaign({ level: 1, harness: true, boons });
  const v = W.run.view();
  const ev = W.log.find((e) => e.type === 'boons');
  check(!!ev && ev.kits.includes('tank') && ev.glint === 15, `the run announced its boons (${JSON.stringify(ev)})`);
  check(v.glint === RUN.startingGlint + 15 || v.wallet === RUN.startingGlint + 15, `the purse added 15 Glint (wallet ${v.glint ?? v.wallet})`);
  check(!!v.boons, 'the run view carries the boons');
  if (boons.relic) check(v.relics && v.relics.owned.some((r) => r.id === boons.relic), 'the heirloom relic is held from the first room');
  const tree = W.run.saveState();
  check(tree.campaign && tree.campaign.boons && tree.campaign.boons.glint === 15, 'the boons ride the run save');
  const W2 = makeWorld(SEEDS[0]);
  W2.run.loadState(JSON.parse(JSON.stringify(tree)));
  check(JSON.stringify(W2.run.saveState().campaign.boons) === JSON.stringify(tree.campaign.boons), 'a loaded save keeps the boons');
}
// Kits for every class + a vow: skills in slots, vow numbers in the room plan.
{
  const all = { kits: Object.fromEntries(['healer', 'tank', 'swordsman', 'archer'].map((c) => [c, U.UNLOCKS[{ healer: 'kit_grovekeeper', tank: 'kit_bulwark', swordsman: 'kit_duelist', archer: 'kit_warden' }[c]].skills.slice()])), vows: ['iron_hide', 'elite_tide'] };
  const W = makeWorld(SEEDS[0]);
  W.run.startCampaign({ level: 1, harness: true, boons: all });
  const healerSlots = W.world.skillSlots().filter(Boolean).map((x) => x.id);
  check(JSON.stringify(healerSlots) === JSON.stringify(all.kits.healer), `the Healer starts with its kit (${healerSlots})`);
  const plan = W.run.roomPlan();
  const want = difficulty(1, 1, 'standard');
  check(Math.abs(plan.hpMul - Math.round(want.hpMul * 1.4 * 100) / 100) < 0.011, `vow Iron Hide raises enemy HP in every combat room (${plan.hpMul} vs ${want.hpMul})`);
  check(Math.abs(plan.eliteChance - Math.min(0.9, want.eliteChance + 0.35)) < 0.011, `vow Elite Tide raises the elite chance (${plan.eliteChance})`);
  // play until the run ends; the summary keeps the boons; the Healer cast its kit
  const ap = W.run.autopilot;
  ap.configure(true);
  const casts = new Set();
  // (room 1 only: later rooms may draft the replaced skills back)
  let firstRoom = true;
  W.bus.on('room_clear', () => (firstRoom = false));
  W.bus.on('reward_offer', () => (firstRoom = false));
  for (const t of ['skill_cast', 'cast', 'ally_cast']) W.bus.on(t, (e) => e && e.skill && firstRoom && casts.add(e.skill));
  let s = null;
  for (let i = 0; i < 40000 && !s; i++) {
    W.step(ap);
    const v = W.run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') s = v.summary;
  }
  out.kitCasts = [...casts].sort();
  const fresh = ['shield_wall', 'taunting_roar', 'fox_step', 'riposte', 'crescent_finisher', 'pinning_arrow', 'rain_of_arrows', 'dewfall', 'mending_tide'];
  const dropped = ['brutal_cleave', 'ground_crack', 'whirling_guard', 'lunge_strike', 'blade_storm', 'caltrops', 'volley', 'detonating_charge', 'sundering_nova'];
  check(fresh.filter((id) => casts.has(id)).length >= 5, `kit skills outside the starting pool were cast (${out.kitCasts})`);
  check(dropped.every((id) => !casts.has(id)), `the replaced starting skills were not (${dropped.filter((id) => casts.has(id))})`);
  if (s) check(s.boons && s.boons.vows.length === 2, 'the summary keeps the boons');
  if (s && s.builds) {
    const tank = s.builds.find((b) => b.classId === 'tank');
    out.tankBuildAtEnd = tank && tank.skills;
  }
}

// ---------------------------------------------------------- 5: robustness --
{
  const fresh = U.saneMeta(null);
  check(fresh.embers === 0 && fresh.mv === U.META_VERSION, 'a missing meta loads fresh');
  const odd = U.saneMeta({ mv: 0, embers: 40, earned: 10, owned: { kit_bulwark: 80, kit_removed_later: 120 }, loadout: { kits: { tank: 'kit_bulwark', healer: 'kit_removed_later' }, purse: 3, vows: ['vow_crowded'] }, deeds: ['first_light', 'gone'] });
  check(odd.embers === 160 && odd.owned.kit_bulwark === 80 && !odd.owned.kit_removed_later, `an unlock this build lacks is refunded (${odd.embers})`);
  check(odd.loadout.kits.tank === 'kit_bulwark' && odd.loadout.kits.healer === null && odd.loadout.purse === 0 && odd.loadout.vows.length === 0, 'a loadout holds only what is owned');
  check(odd.deeds.length === 1 && odd.earned >= odd.embers, 'unknown deeds dropped, lifetime >= balance');
  // Damaged profile text: the meta falls back to the backup like the rest.
  const before = prof.get().meta.embers;
  storage.setItem('echoes.profile.v1', '{"v":1,"meta":');
  const p3 = createProfileStore({ store, now });
  check(p3.get().meta.embers === before || p3.report.status !== 'ok', `a torn profile restores from the backup (${p3.report.status}, ${p3.get().meta.embers})`);
  // Two tabs: A buys, B (stale) awards; nothing is lost.
  const s2 = memStorage();
  const st2 = createSaveStorage({ storage: s2 });
  const A = createProfileStore({ store: st2, now });
  const B = createProfileStore({ store: st2, now });
  A.awardRun({ result: 'defeat', roomsCleared: 40, campaign: null, challenge: 'standard' });
  const buy = A.buyUnlock('tint_moonlit');
  B.awardRun({ result: 'defeat', roomsCleared: 5, campaign: null, challenge: 'standard' });
  const C = createProfileStore({ store: st2, now });
  check(buy.ok && C.get().meta.owned.tint_moonlit === 30 && C.get().meta.embers === 120 - 30 + 15, `two tabs: the buy and the other tab's Embers both survive (${C.get().meta.embers})`);
  // Records reset keeps the meta.
  const keep = C.get().meta.embers;
  C.reset();
  check(C.get().meta.embers === keep && C.get().records.runs === 0, 'a records reset keeps Embers and unlocks');
}

console.log(JSON.stringify({ probe: 'unlocks', ok: fails.length === 0, fails, ...out }, null, 1));
process.exit(fails.length ? 1 : 0);
