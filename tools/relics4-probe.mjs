#!/usr/bin/env node
// RELICS batch 4 probe (docs/RELICS.md "Batch 4"), headless:
//
//   node tools/relics4-probe.mjs [--seed 4]
//
//   data     ten new relics (39 in all), two room curses and two major ones,
//            an heirloom each
//   crook    Shepherd's Crook: the Escort pilgrim walks out with +50% HP, and
//            bringing it home pays 15 Glint
//   vigil    Vigil Candle: -20% damage taken in Escort and Hold rooms only
//   chalk    Warding Chalk: the Hold ring takes 8 s empty to go out (not 4),
//            and members inside it mend 2 HP a second
//   laurel   Champion's Laurel: +30% damage on a champion, its chest pays 25
//   jailer   Jailer's Ring: a key picked up heals the party and pays 10
//   ledger   Vault Ledger: a vault pile pays double
//   pennant  Banner Pennant: a won objective room heals the party 25%
//   token    Wanderer's Token: an event Take pays 12
//   geode    Geode Heart: a cleared cursed room pays 20 and a greater pick
//   curses   Restless (sooner waves), Kindred Blood (a kill heals the kin),
//            Teeming (+12% waves), Pauper's Mark (-20% Glint), and Saint's
//            Ashes halving both majors
//   legacy   the single-level run carries none of it
//   save     a save mid-Hold with Warding Chalk keeps mending after a load
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { RELICS, RELIC_IDS, CURSES, CURSE_IDS, MAJOR_CURSE_IDS } = await import(u('src/sim/relics.js'));
const { OBJECTIVE_RULES } = await import(u('src/sim/objectives.js'));
const { VAULT_RULES } = await import(u('src/sim/vaults.js'));
const { UNLOCKS } = await import(u('src/data/unlocks.js'));

const argv = process.argv.slice(2);
const SEED = Number(argv.includes('--seed') ? argv[argv.indexOf('--seed') + 1] : 4);
const NEW = ['shepherds_crook', 'vigil_candle', 'warding_chalk', 'champions_laurel', 'jailers_ring', 'vault_ledger', 'banner_pennant', 'wanderers_token', 'geode_heart', 'saints_ashes'];
const H = OBJECTIVE_RULES.hold;

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null && !ok ? ` ${JSON.stringify(detail)}` : ''}`);
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
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? emptySnapshot()));
  const run = () => world.runSystem();
  const cmd = (name, ...args) => world.cmd(name, ...args);
  return { registry, bus, clock, world, io, step, log, run, cmd };
}
const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const seat = (w, i) => heroes(w).find((e) => e.partyIndex === i);
const procs = (w, id, stage = null) => w.log.filter((e) => e.type === 'relic_proc' && e.relic === id && (!stage || e.stage === stage));
const gains = (w, reason) => w.log.filter((e) => e.type === 'glint_gain' && e.reason === reason);
function holdParty(w) {
  for (const e of heroes(w)) if (e.hp > 0) e.hp = e.maxHp;
}
function place(b, x, z) {
  b.x = b.px = x;
  b.z = b.pz = z;
}
function standParty(w, x, z, full = true) {
  heroes(w).forEach((b, i) => {
    const a = i * 1.7;
    place(b, x + Math.cos(a) * 0.5 * (i > 0 ? 1 : 0), z + Math.sin(a) * 0.5 * (i > 0 ? 1 : 0));
    if (full && b.hp > 0) b.hp = b.maxHp;
  });
}
function stepUntil(w, pred, guard, each = null) {
  for (let i = 0; i < guard; i++) {
    if (each) each();
    w.step();
    if (pred()) return true;
  }
  return false;
}
function campaign(seed, relics = [], level = 1) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.step();
  for (const id of relics) w.cmd('relicGrant', id);
  return w;
}
// A campaign walked straight into room `n` played as objective `mode`.
function objective(seed, mode, relics = [], n = 4) {
  const w = campaign(seed, relics);
  w.cmd('objectiveRoom', mode, n);
  w.cmd('skipToRoom', n);
  w.step();
  return w;
}
// Clear the live room and walk the pages (draft declined, relic taken) to
// the next path screen.
function toPath(w, pick = true) {
  w.cmd('clearRoom');
  for (let i = 0; i < 900 && w.run().view().phase !== 'path'; i++) {
    const ph = w.run().view().phase;
    if (ph === 'combat') w.cmd('killAllEnemies');
    else if (ph === 'reward') w.run().declineReward();
    else if (ph === 'relic' && pick) w.run().chooseRelic(0);
    else if (ph === 'relic') break;
    w.step();
  }
  return w.run().view().path;
}
function intoNext(w, side) {
  w.run().choosePath(side);
  const n = w.run().view().path ? w.run().view().path.nextRoom : null;
  for (let i = 0; i < 300 && (w.run().view().phase === 'fade' || w.run().view().phase === 'path' || (n && w.run().view().room !== n)); i++) w.step();
}
// One party hit with no attacker through the real pipeline; returns the
// damage before crit (the crit roll is the run stream's, so normalise it).
function partyTakes(w, target, power = 20) {
  w.log.length = 0;
  w.cmd('relicHit', target.id, null, power, false);
  const h = w.log.find((e) => e.type === 'hit' && e.target === target.id);
  return h ? h.amount / (h.crit ? 1.5 : 1) : NaN;
}

// ---------------------------------------------------------------- data --
{
  const rar = NEW.map((id) => RELICS[id] && RELICS[id].rarity);
  const n = (r) => rar.filter((x) => x === r).length;
  check('data', `39 relics, the ten new ones present (${RELIC_IDS.length})`, RELIC_IDS.length === 39 && NEW.every((id) => RELICS[id]));
  check('data', `rarities 4 common, 4 rare, 2 legendary (${n('common')}/${n('rare')}/${n('legendary')})`, n('common') === 4 && n('rare') === 4 && n('legendary') === 2);
  check('data', 'none of them a class relic', NEW.every((id) => !RELICS[id].cls));
  check('data', 'an heirloom for each', NEW.every((id) => UNLOCKS[`heirloom_${id}`] && UNLOCKS[`heirloom_${id}`].relic === id));
  check('data', `8 room curses and 6 major (${CURSE_IDS.length}/${MAJOR_CURSE_IDS.length})`, CURSE_IDS.length === 8 && MAJOR_CURSE_IDS.length === 6 && CURSE_IDS.includes('restless') && CURSE_IDS.includes('kindred_blood') && MAJOR_CURSE_IDS.includes('teeming') && MAJOR_CURSE_IDS.includes('paupers_mark'));
}

// --------------------------------------------------------------- crook --
{
  const plain = objective(SEED, 'escort');
  const w = objective(SEED, 'escort', ['shepherds_crook']);
  stepUntil(plain, () => plain.log.some((e) => e.type === 'pilgrim_spawn'), 600, () => holdParty(plain));
  stepUntil(w, () => procs(w, 'shepherds_crook', 'spawn').length > 0, 600, () => holdParty(w));
  const p0 = plain.registry.byId(plain.log.find((e) => e.type === 'pilgrim_spawn').id);
  const sp = w.log.find((e) => e.type === 'pilgrim_spawn');
  const p = sp && w.registry.byId(sp.id);
  check('crook', `the pilgrim walks out with 50% more HP (${p0 && p0.maxHp} -> ${p && p.maxHp})`, !!p && !!p0 && Math.abs(p.maxHp - p0.maxHp * 1.5) < 0.05 && Math.abs(p.hp - p.maxHp) < 0.05);
  w.cmd('objectiveDebug', 'road', 0.97);
  const home = stepUntil(w, () => w.log.some((e) => e.type === 'pilgrim_arrive'), 60 * 20, () => {
    w.cmd('killAllEnemies');
    standParty(w, p.x, p.z + 0.8);
  });
  for (let i = 0; i < 3; i++) w.step();
  const g = gains(w, 'relic_shepherds_crook');
  check('crook', 'bringing it home pays 15 Glint, once', home && g.length === 1 && g[0].amount === 15 && procs(w, 'shepherds_crook', 'home').length === 1, { home, g });
}

// --------------------------------------------------------------- vigil --
{
  const take = (mode, relic) => {
    const w = mode === 'kill_all' ? campaign(SEED, relic ? ['vigil_candle'] : []) : objective(SEED, mode, relic ? ['vigil_candle'] : []);
    for (let i = 0; i < 5; i++) w.step();
    return partyTakes(w, seat(w, 1));
  };
  const e0 = take('escort', false);
  const e1 = take('escort', true);
  const h0 = take('hold', false);
  const h1 = take('hold', true);
  const k0 = take('kill_all', false);
  const k1 = take('kill_all', true);
  check('vigil', `an Escort room: the Tank takes 20% less (${e0.toFixed(2)} -> ${e1.toFixed(2)})`, Math.abs(e1 / e0 - 0.8) < 0.01);
  check('vigil', `a Hold room: the Tank takes 20% less (${h0.toFixed(2)} -> ${h1.toFixed(2)})`, Math.abs(h1 / h0 - 0.8) < 0.01);
  check('vigil', `a plain room: unchanged (${k0.toFixed(2)} -> ${k1.toFixed(2)})`, Math.abs(k1 / k0 - 1) < 0.01);
}

// --------------------------------------------------------------- chalk --
let chalkSave = null;
{
  const outTicks = (relic) => {
    const w = objective(SEED, 'hold', relic ? ['warding_chalk'] : [], 5);
    const hs = w.log.find((e) => e.type === 'hold_start');
    const away = () => standParty(w, hs.x + (hs.x > 0 ? -7 : 7), hs.z + (hs.z > 0 ? -4 : 4));
    stepUntil(w, () => w.log.some((e) => e.type === 'sigil_out'), H.fadeTicks * 2 + 120, away);
    const a = w.log.find((e) => e.type === 'sigil_fading');
    const b = w.log.find((e) => e.type === 'sigil_out');
    return a && b ? b.tick - a.tick : null;
  };
  const t0 = outTicks(false);
  const t1 = outTicks(true);
  check('chalk', `left empty, the ring goes out after ${H.fadeTicks * 2} ticks, not ${H.fadeTicks} (${t0} -> ${t1})`, Math.abs(t0 - H.fadeTicks) <= 2 && Math.abs(t1 - H.fadeTicks * 2) <= 2);
  const w = objective(SEED, 'hold', ['warding_chalk'], 5);
  const hs = w.log.find((e) => e.type === 'hold_start');
  check('chalk', 'the ring is drawn on the Hold start', procs(w, 'warding_chalk', 'drawn').length === 1);
  standParty(w, hs.x, hs.z);
  const tank = seat(w, 1);
  tank.hp = tank.maxHp * 0.5;
  const far = seat(w, 3);
  place(far, hs.x + (hs.x > 0 ? -8 : 8), hs.z);
  far.hp = far.maxHp * 0.5;
  const t0hp = tank.hp;
  const f0hp = far.hp;
  w.log.length = 0;
  for (let i = 0; i < 200; i++) {
    w.cmd('killAllEnemies');
    standParty(w, hs.x, hs.z, false);
    place(far, hs.x + (hs.x > 0 ? -8 : 8), hs.z);
    w.step();
    if (i === 90) chalkSave = clonePlain(w.io.capture());
  }
  const mends = procs(w, 'warding_chalk', 'mend');
  check('chalk', `inside the ring the Tank mends about 2 HP a second (+${(tank.hp - t0hp).toFixed(1)} in 200 ticks, ${mends.length} pulses)`, mends.length === 3 && tank.hp - t0hp >= 5.9 && tank.hp - t0hp <= 6.1 && mends.every((m) => m.healed.includes(tank.id) && !m.healed.includes(far.id)));
  check('chalk', 'outside it nobody mends', Math.abs(far.hp - f0hp) < 2.5, { far: far.hp - f0hp });
}

// -------------------------------------------------------------- laurel --
{
  const champRoom = (relics) => {
    const w = campaign(SEED, relics);
    w.cmd('championRoom', 4);
    w.cmd('skipToRoom', 4);
    stepUntil(w, () => w.log.some((e) => e.type === 'champion_spawn'), 300, () => holdParty(w));
    for (let i = 0; i < 150; i++) {
      holdParty(w);
      w.step();
    }
    return { w, c: w.registry.byId(w.log.find((e) => e.type === 'champion_spawn').id) };
  };
  const dealt = (w, c) => {
    w.log.length = 0;
    w.cmd('relicHit', c.id, seat(w, 1).id, 20, false);
    const h = w.log.find((e) => e.type === 'hit' && e.target === c.id);
    return h ? h.amount / (h.crit ? 1.5 : 1) : NaN;
  };
  const a = champRoom([]);
  const b = champRoom(['champions_laurel']);
  const d0 = dealt(a.w, a.c);
  const d1 = dealt(b.w, b.c);
  check('laurel', `a champion takes 30% more from the party (${d0.toFixed(2)} -> ${d1.toFixed(2)})`, Math.abs(d1 / d0 - 1.3) < 0.01);
  const boar = b.w.cmd('spawn', 'boar', b.c.x + 3, b.c.z);
  const bid = boar && typeof boar === 'object' ? boar.id : boar;
  const bb = b.w.registry.byId(bid);
  if (bb) bb.elite = false;
  const plainA = dealt(a.w, { id: (() => { const r = a.w.cmd('spawn', 'boar', a.c.x + 3, a.c.z); return r && typeof r === 'object' ? r.id : r; })() });
  const plainB = dealt(b.w, { id: bid });
  check('laurel', `any other enemy takes the same (${plainA.toFixed(2)} vs ${plainB.toFixed(2)})`, Math.abs(plainB / plainA - 1) < 0.01);
  const w = b.w;
  w.cmd('setHp', b.c.id, 0);
  stepUntil(w, () => w.log.some((e) => e.type === 'room_cleared'), 60 * 60, () => {
    w.cmd('killAllEnemies');
    holdParty(w);
  });
  for (let i = 0; i < 3; i++) w.step();
  const g = gains(w, 'relic_champions_laurel');
  check('laurel', "the champion's room pays 25 Glint on its clear", g.length === 1 && g[0].amount === 25 && w.log.some((e) => e.type === 'champion_chest'), g);
}

// -------------------------------------------------------------- jailer --
{
  const w = campaign(SEED, ['jailers_ring']);
  w.cmd('skipToRoom', 2);
  w.step();
  w.cmd('killAllEnemies');
  for (const e of heroes(w)) place(e, -4, 4);
  for (const e of heroes(w)) e.hp = e.maxHp * 0.5;
  const hp0 = heroes(w).map((e) => e.hp);
  w.cmd('keyDrop', 3, -3);
  w.step();
  const tank = seat(w, 1);
  w.log.length = 0;
  place(tank, 3.4, -3.2);
  for (let i = 0; i < 3; i++) {
    w.cmd('killAllEnemies');
    w.step();
  }
  const up = w.log.find((e) => e.type === 'key_pickup');
  const p = procs(w, 'jailers_ring');
  const g = gains(w, 'relic_jailers_ring');
  const rose = heroes(w).every((e, i) => e.hp >= hp0[i] + e.maxHp * 0.149);
  check('jailer', 'a key picked up heals the party 15% and pays 10 Glint', !!up && p.length === 1 && g.length === 1 && g[0].amount === 10 && rose, { up: !!up, p: p.length, g });
}

// -------------------------------------------------------------- ledger --
{
  const pileOf = (relics) => {
    const w = campaign(SEED, relics);
    w.cmd('skipToRoom', 2);
    w.step();
    w.cmd('keyGive');
    w.cmd('vaultDoor', 1);
    const p = toPath(w);
    const door = p && p.options.find((o) => o.vault);
    if (!door) return null;
    intoNext(w, door.side);
    const enter = w.log.find((e) => e.type === 'vault_enter');
    if (!enter) return null;
    const sw = seat(w, 2);
    const wallet0 = w.run().view().wallet;
    place(sw, enter.piles[0].x, enter.piles[0].z);
    w.step();
    const pg = w.log.find((e) => e.type === 'vault_pile');
    return { pg, got: w.run().view().wallet - wallet0, proc: procs(w, 'vault_ledger').length };
  };
  const a = pileOf([]);
  const b = pileOf(['vault_ledger']);
  check('ledger', `a vault pile pays ${VAULT_RULES.pileGlint} plainly, ${VAULT_RULES.pileGlint * 2} with the ledger (${a && a.got} -> ${b && b.got})`, !!a && !!b && a.got === VAULT_RULES.pileGlint && b.got === VAULT_RULES.pileGlint * 2 && b.pg.glint === VAULT_RULES.pileGlint * 2 && b.proc === 1 && a.proc === 0, { a, b });
}

// ------------------------------------------------------------- pennant --
{
  const win = (relics) => {
    const w = objective(SEED, 'hold', relics, 5);
    const hs = w.log.find((e) => e.type === 'hold_start');
    w.cmd('objectiveDebug', 'clock', 30);
    // Hurt the party, then hold it still (nobody heals) until the clear.
    for (const e of heroes(w)) e.hp = e.maxHp * 0.4;
    let hp0 = null;
    stepUntil(w, () => w.log.some((e) => e.type === 'room_cleared' && e.objective), 60 * 120, () => {
      w.cmd('killAllEnemies');
      standParty(w, hs.x, hs.z, false);
      for (const e of heroes(w)) e.hp = e.maxHp * 0.4;
      hp0 = heroes(w).map((e) => e.hp);
    });
    const c = w.log.find((e) => e.type === 'room_cleared' && e.objective);
    return { c, gain: heroes(w).map((e, i) => (e.hp - hp0[i]) / e.maxHp), p: procs(w, 'banner_pennant') };
  };
  const a = win([]);
  const b = win(['banner_pennant']);
  check('pennant', 'a won Hold room heals the party 25% of max HP', b.c && b.c.won && b.p.length === 1 && b.gain.every((g, i) => g >= a.gain[i] + 0.249), { a: a.gain, b: b.gain });
  check('pennant', 'without it, no such heal', a.p.length === 0);
}

// --------------------------------------------------------------- token --
{
  const take = (relics) => {
    const w = campaign(SEED, relics);
    w.cmd('eventDoor', 'healing_spring', 0);
    const p = toPath(w);
    const side = p ? p.options.findIndex((o) => o.event) : -1;
    if (side < 0) return null;
    intoNext(w, side);
    const body = w.registry.all().find((e) => e.itype === 'encounter');
    if (!body) return null;
    w.cmd('teleport', body.x, body.z + 1.0);
    for (let i = 0; i < 3; i++) w.step();
    w.step({ ...emptySnapshot(), presses: [{ kind: 'interact' }] });
    w.step();
    w.log.length = 0;
    w.run().chooseEncounter('take');
    for (let i = 0; i < 3; i++) w.step();
    return { take: w.log.some((e) => e.type === 'event_take'), g: gains(w, 'relic_wanderers_token') };
  };
  const a = take([]);
  const b = take(['wanderers_token']);
  check('token', 'an event Take pays 12 Glint with the token, nothing without', !!a && !!b && a.take && b.take && a.g.length === 0 && b.g.length === 1 && b.g[0].amount === 12, { a, b });
}

// --------------------------------------------------------------- geode --
{
  let seen = 0;
  let greater = 0;
  let plainCommon = 0;
  let paid = true;
  // Clear one forced cursed room (room 2) and read its pick.
  const cursedPick = (seed, relics) => {
    const w = campaign(seed, relics);
    w.cmd('relicDoor', 'short_fuse', 0);
    const p = toPath(w);
    if (!p || !p.options[0].curse) return null;
    intoNext(w, 0);
    w.log.length = 0;
    toPath(w, false);
    return { off: w.log.filter((e) => e.type === 'relic_offer').at(-1), g: gains(w, 'relic_geode_heart') };
  };
  for (let s = 1; s <= 8; s++) {
    const seed = SEED + s * 101;
    const b = cursedPick(seed, ['geode_heart']);
    const a = cursedPick(seed, []);
    if (!b || !b.off || !a || !a.off) continue;
    seen += 1;
    if (b.off.choices.every((id) => RELICS[id].rarity !== 'common')) greater += 1;
    if (a.off.choices.some((id) => RELICS[id].rarity === 'common')) plainCommon += 1;
    if (!(b.g.length === 1 && b.g[0].amount === 20)) paid = false;
  }
  check('geode', `a cleared cursed room pays 20 Glint (${seen} rooms)`, seen >= 6 && paid);
  check('geode', `its pick is a greater one, rare or legendary (${greater}/${seen}); without it commons turn up (${plainCommon}/${seen})`, greater === seen && plainCommon > 0);
}

// -------------------------------------------------------------- curses --
{
  // Restless: the cursed room's wave interval x0.65.
  const plan = (curse) => {
    const w = campaign(SEED);
    w.cmd('relicDoor', curse, 0);
    toPath(w);
    intoNext(w, 0);
    return w.run().roomPlan();
  };
  const a = plan('short_fuse');
  const b = plan('restless');
  check('curses', `Restless: waves come 35% sooner (${a.waveIntervalTicks} -> ${b.waveIntervalTicks} ticks)`, Number.isFinite(a.waveIntervalTicks) && b.waveIntervalTicks === Math.round(a.waveIntervalTicks * 0.65));
  // Kindred Blood: a party kill heals the fallen's kin 10%.
  const w = campaign(SEED);
  for (let i = 0; i < 30; i++) w.step();
  w.cmd('killAllEnemies');
  for (let i = 0; i < 12; i++) w.step();
  w.cmd('relicCurseHere', 'kindred_blood');
  const pl = w.world.player;
  const ids = [-1.0, 0, 1.0].map((dx) => {
    const r = w.cmd('spawn', 'boar', pl.x + dx, pl.z - 2);
    return r && typeof r === 'object' ? r.id : r;
  });
  const far = (() => {
    const r = w.cmd('spawn', 'boar', pl.x + 6, pl.z + 5);
    return r && typeof r === 'object' ? r.id : r;
  })();
  const kin = ids.slice(1).map((id) => w.registry.byId(id));
  const fb = w.registry.byId(far);
  for (const e of [...kin, fb]) {
    e.maxHp = 400;
    e.hp = 200;
  }
  w.step();
  const victim = w.registry.byId(ids[0]);
  victim.hp = 1;
  w.log.length = 0;
  w.cmd('relicHit', victim.id, seat(w, 1).id, 50, false);
  for (let i = 0; i < 15; i++) w.step(); // past the kill hitstop
  const cp = w.log.find((e) => e.type === 'curse_proc' && e.curse === 'kindred_blood');
  const kh = w.log.filter((e) => e.type === 'heal' && e.source === 'kindred_blood');
  check('curses', `Kindred Blood: a kill heals its two kin 10% of max HP (${kh.map((e) => e.applied).join(', ')}), not the far one`, !!cp && kin.every((e) => cp.healed.includes(e.id)) && !cp.healed.includes(far) && kh.length === 2 && kh.every((e) => Math.abs(e.amount - 40) < 0.01 || Math.abs(e.amount - 60) < 0.01), { cp, kh });
  // Teeming / Pauper's Mark, and Saint's Ashes halving them.
  const bound = (majors, relics) => {
    const w = campaign(SEED, relics);
    for (const m of majors) w.cmd('eventMajor', m);
    w.cmd('skipToRoom', 2);
    w.step();
    w.log.length = 0;
    w.cmd('clearRoom');
    for (let i = 0; i < 30; i++) w.step();
    const st = w.log.find((e) => e.type === 'glint_gain' && e.reason === 'clear_stipend');
    const ps = w.log.find((e) => e.type === 'purse_gain');
    return { plan: w.run().roomPlan(), stipend: st ? st.amount : null, purse: ps ? ps.amount : null };
  };
  const none = bound([], []);
  const tm = bound(['teeming'], []);
  const tma = bound(['teeming'], ['saints_ashes']);
  check('curses', `Teeming: every wave 12% larger (${none.plan.budget} -> ${tm.plan.budget})`, Math.abs(tm.plan.budget - Math.round(none.plan.budget * 1.12 * 100) / 100) < 0.011);
  check('curses', `Saint's Ashes: Teeming at half weight (+6%, ${tma.plan.budget})`, Math.abs(tma.plan.budget - Math.round(none.plan.budget * 1.06 * 100) / 100) < 0.011);
  const pm = bound(['paupers_mark'], []);
  const pma = bound(['paupers_mark'], ['saints_ashes']);
  check('curses', `Pauper's Mark: the clear stipend ${none.stipend} -> ${pm.stipend} (x0.8), purses too (${none.purse} -> ${pm.purse})`, pm.stipend === Math.round(none.stipend * 0.8) && (none.purse === null || pm.purse === Math.max(1, Math.round(none.purse * 0.8))));
  check('curses', `Saint's Ashes: Pauper's Mark at half weight (${pma.stipend})`, pma.stipend === Math.round(none.stipend * 0.9));
}

// -------------------------------------------------------------- legacy --
{
  const w = build(SEED);
  w.run().startRun({ act: 1 });
  w.step();
  const granted = w.cmd('relicGrant', 'shepherds_crook');
  w.log.length = 0;
  w.cmd('clearRoom');
  for (let i = 0; i < 30; i++) w.step();
  const st = w.log.find((e) => e.type === 'glint_gain' && e.reason === 'clear_stipend');
  check('legacy', 'the single-level run carries no relic and pays the full stipend', granted === null && !w.run().view().relics && st && st.amount === 12, { granted, st });
}

// ---------------------------------------------------------------- save --
{
  const a = build(SEED);
  const ok = chalkSave && a.io.apply(clonePlain(chalkSave));
  const tank = seat(a, 1);
  if (tank) tank.hp = tank.maxHp * 0.5;
  a.log.length = 0;
  for (let i = 0; i < 130; i++) a.step();
  const m = procs(a, 'warding_chalk', 'mend');
  check('save', 'a save mid-Hold keeps the chalk ring after a load (mending goes on)', !!ok && m.length >= 1, { ok: !!ok, mends: m.length });
}

console.log(`\nrelics4-probe: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
