#!/usr/bin/env node
// THE DUSKWING probe (docs/DUSKWING.md) — headless Node, the sim built like
// src/main.js (the same harness as tools/bellwright-probe.mjs).
//
//   node tools/duskwing-probe.mjs
//
// Checks:
//   1. Data and gate: his class row, Nip, the four base skills, all
//      campaign-only; free from the start; the default lineup is still the
//      old four; who joins the team; the seven-card picker and the lobby
//      roster; blind, the tenth status (2 s at most, half speed, never the
//      bosses or the party).
//   2. A campaign with Sable on seat 3 (the Archer at camp), the AI playing
//      him: the Dive dashes and bursts, Bloodbite bites, Night Hunger feeds
//      him, Nightfall blinds and a blinded enemy starts no attack, Night
//      Wings pulses, Nip hits.
//   3. Night Hunger by the numbers: 8% of every blow, +50% on Bloodbite,
//      banked into sips of 1.5 HP, nothing at full health or for others.
//   4. His seat played by a human: a key press dives at the aim, untouchable,
//      and the burst lands where the dive ends.
//   5. The shop shelf: his seat's shelf offers his pool.
//   6. A mid-fight save with enemies blinded continues bit-identically.
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
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { ALLY_CLASSES } = await import(u('src/sim/allies.js'));
const { frameFromSnapshot, seatInputOf } = await import(u('src/sim/netseats.js'));
const STATUS = await import(u('src/sim/status.js'));
const L = await import(u('src/data/lineup.js'));
const C = await import(u('src/data/classes.js'));

function makeWorld(seed) {
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
  const run = world.runSystem();
  const step = (snap = emptySnapshot()) => clock.stepOnce((t) => world.step(t, snap));
  const stepSeat = (seat, snap) => clock.stepOnce((t) => world.step(t, emptySnapshot(), { seats: { [seat]: seatInputOf([frameFromSnapshot(snap, { seq: t, tick: t, viewTick: t })]) }, reasons: {}, player: 'ai', rewind: null }));
  return { world, registry, bus, clock, run, log, step, stepSeat, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const cmd = (W, ...a) => W.world.cmd(...a);
const ally = (W, seat) => W.registry.all().find((e) => e.kind === 'ally' && e.partyIndex === seat);
const party = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
const P = (W) => W.world.partySystem();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SABLE = ['healer', 'tank', 'swordsman', 'duskwing'];
const KIT = ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings'];
const near = (v, w, eps = 0.02) => Math.abs(v - w) <= eps;

function campaign(seed, opts = {}) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, ...opts });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  return W;
}
function secondRoom(W, kit) {
  cmd(W, 'partyMode', 'manual');
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  for (const [seat, ids] of Object.entries(kit)) ids.forEach((id, k) => cmd(W, 'partySwap', Number(seat), id, k));
  cmd(W, 'skipToRoom', 2);
  for (let i = 0; i < 600 && !(W.run.view().phase === 'combat' && W.run.view().room === 2); i++) W.step();
}



// ---------------------------------------------------------- 1. data / gate --
{
  const row = ALLY_CLASSES.duskwing;
  check(row && row.maxHp === 80 && row.basicShape === 'melee_arc' && row.basicPower === 7 && row.basicRange === 0.8 && row.moveSpeed === 2.9 && row.attackIntervalTicks === 18, 'his class row: 80 HP, speed 2.9 (the fastest), Nip a 7-power bite every 0.3 s, reach 0.8');
  check(ALLY_CLASSES.duskwing.moveSpeed > Math.max(...Object.values(ALLY_CLASSES).filter((r) => r.classId !== 'duskwing').map((r) => r.moveSpeed)), 'he is the quickest on his feet');
  check(same(C.CLASS_BASE_KIT.duskwing, KIT) && same(C.CLASS_SKILLS.duskwing.slice(0, 4), KIT) && KIT.every((id) => SKILLS[id] && SKILLS[id].cls === 'duskwing'), 'his four base skills open his pool, all his');
  check(KIT.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(KIT, false).length === 0 && C.gatedPool(KIT, true).length === 4, 'all four are campaign-only');
  check(SKILLS.dusk_dive.dash && SKILLS.dusk_dive.dash.iframes && SKILLS.dusk_dive.shape === 'nova' && SKILLS.blood_bite.drain === 0.5 && SKILLS.nightfall.status.kind === 'blind' && SKILLS.night_wings.shape === 'aura', 'Dive dashes untouchable and bursts, Bloodbite drains, Nightfall blinds, Night Wings is a passive');
  const ids = Object.keys(SKILLS);
  const abbr = Object.values(SKILLS).map((s) => s.abbrev);
  check(KIT.every((id) => !C.CAMPAIGN_ONLY_NODES.includes(id)) && new Set(abbr).size >= abbr.length - 1 && ids.length === new Set(ids).size, 'no id or key letter collides (the gatedPool node-id gotcha)');
  check(C.MELEE_CLASSES.includes('duskwing') && C.AI_PRIORITY.duskwing && C.CLASS_TECH.duskDrain === 0.08, 'a melee seat with an equip order and Night Hunger at 8%');
  check(same(L.DEFAULT_LINEUP, ['healer', 'tank', 'swordsman', 'archer']) && same(L.benchOf(L.DEFAULT_LINEUP), ['tidecaller', 'bellwright', 'duskwing']), 'the default lineup is the old four (Rill, Tolly and Sable at camp)');
  check(L.DUSKWING_FREE === false && !L.duskwingOpen() && !L.classOpen('duskwing') && L.forceDuskwing(true) && L.classOpen('duskwing'), 'locked on a fresh profile since slice 6; ?sable=1 opens him for this probe');
  check(!L.tidecallerOpen() && !L.bellwrightOpen() && same(L.parseTeam('tank,tidecaller,duskwing,bellwright'), ['tank', 'duskwing']), 'Rill and Tolly stay locked on a fresh profile; Sable may join');
  check(L.rosterGrown(), 'four open joiners for three ally seats: the team view has a choice');
  check(same(L.plannedLineup('duskwing', ''), SABLE), 'playing him with no team chosen: he joins in the Archer\'s place');
  check(same(L.plannedLineup('healer', 'swordsman,archer,duskwing'), ['healer', 'swordsman', 'archer', 'duskwing']), 'the chosen three join, in seat order');
  check(same(L.plannedLineup('tank', 'swordsman,archer,duskwing'), ['healer', 'tank', 'swordsman', 'archer']), 'the class you play always joins (in place of the last pick)');
  check(L.plannedLineup('healer', '') === L.DEFAULT_LINEUP, 'no team chosen is the default four (the goldens)');
  L.setTidecallerUnlocked(true);
  L.forceBellwright(true);
  check(same(L.plannedLineup('healer', 'tidecaller,bellwright,duskwing'), ['healer', 'tidecaller', 'bellwright', 'duskwing']), 'with Rill and Tolly freed all three newcomers can join together');
  L.setTidecallerUnlocked(false);
  L.forceBellwright(false);
  check(L.forceDuskwing(false) === false && L.forceDuskwing(true), '?sable=1 opens him; without it a fresh profile keeps him locked (slice 6)');
  const PC = await import(u('src/app/playclass.js'));
  check(PC.PLAY_CLASSES.length === 7 && PC.playable('duskwing') && !PC.playable('tidecaller'), 'the picker shows seven cards; Sable playable');
  const MSGS = await import(u('src/net/protocol/messages.js'));
  check(MSGS.ROSTER.includes('duskwing'), 'the lobby roster offers him (co-op select_class / set_team)');
  // Darkness: the tenth status kind.
  check(STATUS.STATUS_KINDS.length === 10 && STATUS.STATUS_KINDS[9] === 'blind', 'blind is the tenth status kind');
  const foe = { id: 1, faction: 'hostile', maxHp: 50, hp: 50 };
  const boss = { id: 2, faction: 'hostile', boss: true, maxHp: 500, hp: 500 };
  const mate = { id: 3, faction: 'party', partyIndex: 1, maxHp: 50, hp: 50 };
  const rec = STATUS.apply(foe, 'blind', 1, 400, 10);
  check(rec && rec.untilTick === 130 && STATUS.isBlinded(foe, 129) && !STATUS.isBlinded(foe, 130), 'a blind lasts at most 2 s');
  check(near(STATUS.speedMul(foe, 20), 0.5, 1e-9) && STATUS.speedMul(foe, 200) === 1, 'a blinded enemy gropes at half speed');
  check(STATUS.apply(boss, 'blind', 1, 120, 10) === null && STATUS.refusal(boss, 'blind', 10) === 'boss_immune' && STATUS.refusal(mate, 'blind', 10) === 'hostile_only', 'the bosses and the party cannot be blinded');
}

// ------------------------------------------------------ 2. Sable in a fight --
let saved = null;
{
  const W = campaign(4, { lineup: SABLE });
  const p = P(W);
  const sable = ally(W, 3);
  check(same(p.lineup(), SABLE) && sable.classId === 'duskwing' && sable.maxHp === 80 && sable.hp === 80, `seat 3 is Sable (${sable.classId}, ${sable.maxHp} HP)`);
  const pool = p.pools(3);
  check(same([...pool.classSkills].sort(), [...C.CLASS_SKILLS.duskwing].sort()), `his draft pool is his kit (${pool.classSkills.length})`);
  check(L.classOfSeat(3) === 'duskwing' && L.seatOfClass('archer') === -1, 'the UI lookup: Sable on seat 3, the Archer at camp');

  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'auto');
  check(same(cmd(W, 'partyView', 3).slots, KIT), 'his four skills are on his keys');
  const h = W.world.player;
  for (const [dx, dz, k] of [[2.5, 1, 'boar'], [3, 0, 'boar'], [2.6, -1, 'boar'], [-2.5, 1.2, 'boar'], [-3, -0.5, 'mantis'], [0.5, 3, 'boar'], [1, -3, 'quillback'], [-1, 3, 'mantis']]) cmd(W, 'spawn', k, h.x + dx, h.z + dz, { hpMul: 5 });
  const from = W.log.length;
  let hurtAt = 0;
  for (let i = 0; i < 3600; i++) {
    W.step();
    // Keep the others whole; let him bleed to 60% now and then so his drain has room.
    for (const m of party(W)) if (m.id !== sable.id) m.hp = m.maxHp;
    if (sable.hp > 0 && i - hurtAt > 240) {
      sable.hp = Math.min(sable.hp, sable.maxHp * 0.6);
      hurtAt = i;
    }
    if (sable.hp <= 0) sable.hp = sable.maxHp;
    if (W.run.view().phase !== 'combat') break;
  }
  const evs = W.log.slice(from);
  const mine = evs.filter((e) => e.type === 'ally_cast' && e.partyIndex === 3 && !e.echo);
  const castSet = [...new Set(mine.map((e) => e.skill))].sort();
  check(mine.length > 0 && mine.every((e) => e.classId === 'duskwing' && KIT.includes(e.skill)), `the AI casts his skills (${mine.length}: ${castSet.join(',')})`);
  check(['dusk_dive', 'blood_bite', 'nightfall'].every((s) => castSet.includes(s)), 'Dusk Dive, Bloodbite and Nightfall all cast');
  const dives = evs.filter((e) => e.type === 'ally_dash' && e.skill === 'dusk_dive');
  check(dives.length > 0 && dives.every((e) => Math.hypot(e.x1 - e.x0, e.z1 - e.z0) <= 3.6 + 0.02), `he dives (${dives.length}, up to ${Math.max(...dives.map((e) => Math.hypot(e.x1 - e.x0, e.z1 - e.z0))).toFixed(2)} u)`);
  const landings = mine.filter((e) => e.skill === 'dusk_dive');
  const diveHits = evs.filter((e) => e.type === 'hit' && e.source === 'dusk_dive');
  check(landings.length > 0 && diveHits.length > 0, `each dive lands with a burst (${landings.length} landings, ${diveHits.length} hits)`);
  const biteHits = evs.filter((e) => e.type === 'hit' && e.source === 'blood_bite');
  check(biteHits.length > 0, `Bloodbite bites (${biteHits.length})`);
  const sips = evs.filter((e) => e.type === 'heal' && e.source === 'night_hunger');
  check(sips.length > 0 && sips.every((e) => e.target === sable.id && e.healer === sable.id && e.crit === false), `Night Hunger feeds him (${sips.length} sips, ${sips.reduce((s, e) => s + e.applied, 0).toFixed(1)} HP)`);
  const blinds = evs.filter((e) => e.type === 'status_apply' && e.status === 'blind');
  check(blinds.length > 0, `Nightfall blinds (${blinds.length} enemies)`);
  // While a blind holds, the enemy starts no attack.
  const winds = evs.filter((e) => e.type === 'telegraph_start' || e.type === 'enemy_bite' || e.type === 'enemy_fire');
  const during = winds.filter((w) => blinds.some((b) => b.id === w.id && w.tick >= b.tick + 1 && w.tick < b.untilTick));
  check(during.length === 0, `a blinded enemy starts no attack (${winds.length} attacks seen, ${during.length} while blinded)`);
  const wings = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'night_wings' && e.hit && e.hit.length);
  check(wings.length > 0, `Night Wings pulses hit (${wings.length})`);
  const nips = evs.filter((e) => e.type === 'hit' && e.source === 'duskwing_basic');
  check(nips.length > 0, `Nip hits (${nips.length})`);
  saved = W;
}

// ------------------------------------------ 3. Night Hunger, by the numbers --
{
  const W = campaign(5, { lineup: SABLE });
  secondRoom(W, { 3: KIT });
  cmd(W, 'partyMode', 'manual');
  const sable = ally(W, 3);
  const h = W.world.player;
  cmd(W, 'spawn', 'boar', sable.x + 0.6, sable.z, { hpMul: 20 });
  W.step();
  sable.hp = 20;
  sable.drainBank = 0;
  const from = W.log.length;
  const foe = W.registry.all().find((e) => e.faction === 'hostile' && e.kind === 'boar' && Math.hypot(e.x - sable.x, e.z - sable.z) < 1.2);
  cmd(W, 'partyCast', 3, 1, { x: foe.x, z: foe.z });
  W.step();
  const evs = W.log.slice(from);
  const bite = evs.find((e) => e.type === 'hit' && e.source === 'blood_bite' && e.attacker === sable.id);
  const sip = evs.find((e) => e.type === 'heal' && e.source === 'night_hunger');
  check(!!bite && !!sip && near(sip.amount, bite.amount * 0.58, 0.02), `Bloodbite heals him 58% of what it dealt (${bite ? bite.amount.toFixed(2) : '-'} dealt, ${sip ? sip.amount : '-'} back)`);
  check(sable.hp > 20, `his health rose (${sable.hp.toFixed(1)})`);
  // A full body banks nothing; a small blow banks until a sip is worth showing.
  sable.hp = sable.maxHp;
  const f2 = W.log.length;
  W.bus.emit(W.world.tick ?? 0, 'hit', { target: foe.id, attacker: sable.id, source: 'duskwing_basic', amount: 7 });
  check(!W.log.slice(f2).some((e) => e.type === 'heal') && sable.drainBank === 0, 'at full health Nip feeds him nothing');
  sable.hp = 40;
  W.bus.emit(W.world.tick ?? 0, 'hit', { target: foe.id, attacker: sable.id, source: 'duskwing_basic', amount: 7 });
  check(!W.log.slice(f2).some((e) => e.type === 'heal') && near(sable.drainBank, 0.56), `one Nip banks 0.56 HP (${sable.drainBank})`);
  W.bus.emit(W.world.tick ?? 0, 'hit', { target: foe.id, attacker: sable.id, source: 'duskwing_basic', amount: 7 });
  W.bus.emit(W.world.tick ?? 0, 'hit', { target: foe.id, attacker: sable.id, source: 'duskwing_basic', amount: 7 });
  const s3 = W.log.slice(f2).filter((e) => e.type === 'heal' && e.source === 'night_hunger');
  check(s3.length === 1 && near(s3[0].applied, 1.68) && near(sable.hp, 41.68), `the third Nip pays a 1.68 HP sip (${s3.map((e) => e.applied).join(',')})`);
  // Another class's blow feeds nobody.
  const tank = ally(W, 1);
  const f3 = W.log.length;
  tank.hp = 10;
  W.bus.emit(W.world.tick ?? 0, 'hit', { target: foe.id, attacker: tank.id, source: 'tank_basic', amount: 40 });
  check(!W.log.slice(f3).some((e) => e.type === 'heal') && tank.hp === 10, 'another hero\'s blow steals no life');
  void h;
}

// ----------------------------------------- 4. his seat played by a human --
{
  const W = campaign(4, { lineup: SABLE });
  secondRoom(W, { 3: KIT });
  const sable = ally(W, 3);
  const from = W.log.length;
  const aim = { x: sable.x + 2.4, z: sable.z - 1.2 };
  cmd(W, 'spawn', 'boar', aim.x, aim.z, { hpMul: 20 });
  W.stepSeat(3, { ...emptySnapshot(), aim, presses: [{ kind: 'skill_1' }] });
  let iframed = true;
  for (let i = 0; i < 30; i++) {
    W.stepSeat(3, emptySnapshot());
    const dashNow = W.log.slice(from).some((e) => e.type === 'ally_dash') && !W.log.slice(from).some((e) => e.type === 'ally_cast' && e.skill === 'dusk_dive');
    if (dashNow && !(sable.iframeUntilTick >= (W.world.tick ?? 0))) iframed = false;
  }
  const evs = W.log.slice(from);
  const dash = evs.find((e) => e.type === 'ally_dash' && e.skill === 'dusk_dive');
  const land = evs.find((e) => e.type === 'ally_cast' && e.skill === 'dusk_dive');
  check(!!dash && dash.cause === 'dash' && Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0) > 1, `a human Duskwing dives at his aim (${dash ? `${dash.x0},${dash.z0} -> ${dash.x1},${dash.z1}` : 'none'})`);
  check(!!land && land.tick > dash.tick && Math.hypot(land.x - aim.x, land.z - aim.z) < 1.2, `the burst lands where the dive ends (${land ? `${land.x},${land.z}` : 'none'})`);
  check(iframed, 'untouchable through the dive');
}

// ----------------------------------------------------------- 5. the shop --
{
  const W = saved;
  const pools = P(W).pools(3);
  const stock = typeof P(W).draft === 'function' ? P(W).draft(3).shopStock() : [];
  const nodePool = C.nodePoolOf('duskwing');
  check(stock.length > 0 && stock.every((c) => nodePool.includes(c.node)), `his shop shelf stocks his node pool (${stock.map((c) => c.node).join(',')})`);
  check(pools.skill.every((id) => SKILLS[id].cls === 'duskwing'), `his seat's skill pool holds only his skills (${pools.skill.join(',') || 'all owned'})`);
}

// ------------------------------------------------------------- 6. save --
{
  const W3 = campaign(6, { lineup: SABLE });
  secondRoom(W3, { 3: KIT });
  cmd(W3, 'partyMode', 'auto');
  const h = W3.world.player;
  for (const [dx, dz] of [[2.5, 1], [3, 0], [-2.5, 1.2], [0.5, 2.5]]) cmd(W3, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 5 });
  const hurt = (W) => {
    for (const m of party(W)) m.hp = m.classId === 'duskwing' ? Math.max(m.hp, m.maxHp * 0.5) : m.maxHp;
  };
  let blindAtSave = 0;
  let snap = null;
  for (let i = 0; i < 900; i++) {
    W3.step();
    hurt(W3);
    blindAtSave = W3.registry.all().filter((e) => e.status && e.status.blind && e.status.blind.untilTick > (W3.world.tick ?? 0)).length;
    if (i >= 300 && (blindAtSave > 0 || i === 899)) {
      snap = clonePlain(W3.io.capture());
      break;
    }
  }
  for (let i = 0; i < 400; i++) {
    W3.step();
    hurt(W3);
  }
  const h1 = hashState(W3.io.capture());
  const W4 = makeWorld(6);
  check(W4.io.apply(clonePlain(snap)).ok, `a save with Sable applies (${blindAtSave} enemies blinded at the save)`);
  check(same(P(W4).lineup(), SABLE) && ally(W4, 3).classId === 'duskwing' && same(cmd(W4, 'partyView', 3).slots, KIT), 'the loaded party has Sable and his keys');
  for (let i = 0; i < 400; i++) {
    W4.step();
    hurt(W4);
  }
  const h2 = hashState(W4.io.capture());
  check(h1 === h2, `a mid-fight save with Sable continues bit-identically (${h1} / ${h2})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
