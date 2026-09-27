#!/usr/bin/env node
// PARTY Node probe (docs/gauntlet/PLAN.md §16.11 / gates GP.1-GP.4, GP.14):
// pools + numbers, the 4-skill cap + swaps + reorder, the any-rarity socket
// sweep, combat_active blocks, and every class skill's sim effect, on a
// headless world built exactly like main.js.
//   node tools/gntPARTY-sim.mjs [--only name,name] [--verbose 1]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ONLY = opt('only') ? opt('only').split(',') : null;
const VERBOSE = opt('verbose') === '1';

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { NODES } = await import(u('src/sim/nodes.js'));
const { ALLY_KITS, ALLY_KITS_V150 } = await import(u('src/sim/allies.js'));
const C = await import(u('src/data/classes.js'));
const C_KITS = { 1: ['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard'], 2: ['flurry', 'lunge_strike', 'blade_storm', 'caltrops'], 3: ['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova'] };
const oracle = JSON.parse(readFileSync(join(here, 'docs/gauntlet/party-oracle.json'), 'utf8'));

function mk(seed = 7, room = null) {
  const rng = createGameplayRng(seed);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room });
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  // Steps n SIM ticks (a hitstop consumes frames without a tick, so this
  // advances until the world's tick counter moved n).
  const step = (n = 1, snap = null) => {
    const goal = world.tick + n;
    for (let guard = 0; world.tick < goal && guard < n * 4 + 64; guard++) clock.advance(1000 / 60, (t) => world.step(t, snap ? snap(t) : emptySnapshot()));
  };
  const cmd = (...a) => world.cmd(...a);
  const ally = (i) => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i);
  const since = (k) => evs.slice(k);
  return { world, registry, bus, evs, step, cmd, ally, since, rng };
}

const results = [];
function check(group, name, pass, got = null) {
  results.push({ group, name, pass: !!pass, got });
  if (VERBOSE || !pass) console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}${got !== null ? ' ' + JSON.stringify(got).slice(0, 400) : ''}`);
}
const want = (g) => !ONLY || ONLY.includes(g);

// ------------------------------------------------------------------ GP.1 --
if (want('pools')) {
  const W = mk();
  const pools = W.cmd('partyPools');
  for (const c of C.ALLY_CLASS_IDS) {
    const o = oracle.classes[c];
    check('pools', `${c} skill pool = oracle`, JSON.stringify([...pools[c].skills].sort()) === JSON.stringify(o.skills.map((s) => s.id).sort()), pools[c].skills);
    check('pools', `${c} node pool = oracle`, JSON.stringify([...pools[c].nodes].sort()) === JSON.stringify([...o.pool].sort()), pools[c].nodes);
    let bad = [];
    for (const s of o.skills) {
      const row = SKILLS[s.id];
      for (const k of ['name', 'archetype', 'shape', 'power', 'cd', 'range', 'area', 'count', 'speed', 'durationSec', 'field', 'output', 'shieldCap', 'knockback']) {
        if (s[k] === undefined && row[k] === undefined) continue;
        if (JSON.stringify(s[k]) !== JSON.stringify(row[k])) bad.push(`${s.id}.${k}: ${JSON.stringify(row[k])} vs ${JSON.stringify(s[k])}`);
      }
      for (const k of ['dash', 'vault', 'combo', 'parry', 'status']) {
        if (JSON.stringify(s[k] ?? null) !== JSON.stringify(row[k] ? { ...row[k] } : null)) bad.push(`${s.id}.${k}`);
      }
      if (row.cls !== c) bad.push(`${s.id}.cls`);
    }
    check('pools', `${c} every skill row equals the §25.2 numbers`, bad.length === 0, bad.slice(0, 6));
    const kitBad = [];
    ALLY_KITS[c].forEach((d, i) => {
      const v = ALLY_KITS_V150[c][i];
      for (const k of Object.keys(v)) if (JSON.stringify(v[k]) !== JSON.stringify(d[k])) kitBad.push(`${v.id}.${k}`);
    });
    check('pools', `${c} starting rows = v0.5.150 ALLY_KITS field for field`, kitBad.length === 0, kitBad);
    check('pools', `${c} starting loadout = the §7 kit order`, JSON.stringify(W.cmd('partyView', C.SEAT_OF_CLASS[c]).slots) === JSON.stringify(C.STARTING_LOADOUT[c]));
    const cn = Object.keys(NODES).filter((id) => NODES[id].cls === c);
    check('pools', `${c} 6 class nodes`, cn.length === 6 && JSON.stringify(cn.sort()) === JSON.stringify([...C.CLASS_NODES[c]].sort()), cn);
  }
}

// ------------------------------------------------------------------ GP.2 --
if (want('cap')) {
  for (const seat of [1, 2, 3]) {
    const W = mk();
    const cls = C.CLASS_OF_SEAT[seat];
    const fresh = C.CLASS_SKILLS[cls].filter((id) => !C.STARTING_LOADOUT[cls].includes(id));
    const r0 = W.cmd('partySwap', seat, fresh[0]);
    check('cap', `seat ${seat}: swap with no slot on a full loadout -> swap_denied full`, r0 && r0.denied === 'full' && W.cmd('partyView', seat).slots.length === 4, r0);
    // Socket 3 nodes on slot 1's skill, then swap it out.
    const pool = C.nodePoolOf(cls);
    const s1 = W.cmd('partyView', seat).slots[1];
    let put = 0;
    for (const n of pool) {
      if (put >= 3) break;
      W.cmd('partyGrantNode', seat, n, 'drafted');
      const r = W.cmd('partySocket', seat, s1, n);
      if (r && !r.denied) put += 1;
    }
    const before = W.cmd('partyView', seat);
    const benchBefore = before.bench.length;
    const r1 = W.cmd('partySwap', seat, fresh[0], 1);
    const after = W.cmd('partyView', seat);
    check('cap', `seat ${seat}: swap into slot 1 keeps exactly 4 skills, the new one in slot 1`, r1.ok && after.slots.filter(Boolean).length === 4 && after.slots[1] === fresh[0], after.slots);
    check('cap', `seat ${seat}: the replaced skill's ${put} nodes go to the bench (0 lost)`, after.bench.length === benchBefore + put && r1.released.length === put, { released: r1.released, bench: after.bench.length });
    const pools = W.world.partySystem().pools(seat);
    check('cap', `seat ${seat}: the replaced skill is back in the class pool`, pools.skill.includes(s1), pools.skill);
    const r2 = W.cmd('partySwap', seat, fresh[1], 7);
    check('cap', `seat ${seat}: a slot past 4 is refused`, r2.denied === 'no_such_slot', r2);
    const r3 = W.cmd('partySwap', seat, 'mending_bolt', 0);
    check('cap', `seat ${seat}: another class's skill is refused`, r3.denied === 'not_class', r3);
    const ro = W.cmd('partyReorder', seat, 0, 3);
    const v2 = W.cmd('partyView', seat);
    check('cap', `seat ${seat}: reorder swaps two rows (sockets travel)`, ro.ok && v2.slots[3] === after.slots[0] && v2.slots[0] === after.slots[3], v2.slots);
    // Every other path to a 5th skill: a hand-edited save.
    const tree = W.world.saveState();
    const t2 = structuredClone(tree);
    t2.systems.party.seats[seat].slots = [...t2.systems.party.seats[seat].slots, fresh[2], fresh[3]];
    W.world.loadState(t2);
    check('cap', `seat ${seat}: a hand-edited save with 6 skills loads as 4`, W.cmd('partyView', seat).slots.length === 4, W.cmd('partyView', seat).slots);
  }
}

// ------------------------------------------------------ GP.2 socket sweep --
if (want('sweep')) {
  for (const seat of [1, 2, 3]) {
    const W = mk();
    const cls = C.CLASS_OF_SEAT[seat];
    const pool = C.nodePoolOf(cls);
    const P = W.world.partySystem();
    let ops = 0;
    let limit = 0;
    const other = [];
    for (const sid of C.CLASS_SKILLS[cls]) {
      if (!P.slots(seat).includes(sid)) P.swap(seat, sid, 0);
      for (const nid of pool) {
        // Row emptied between nodes.
        const b = P.build(seat);
        for (let k = 0; k < 8; k++) b.unsocket(sid, k);
        for (let k = 0; k < 8; k++) {
          b.grantNode(nid, 'grant');
          const r = b.socket(sid, nid, k);
          ops += 1;
          if (r && r.denied) {
            if (r.denied === 'limit') limit += 1;
            else other.push(`${sid}/${nid}/${k}:${r.denied}`);
          }
        }
      }
    }
    check('sweep', `seat ${seat}: every pool node × every socket 1-8 of every class skill: only limit denials`, other.length === 0, { ops, limit, other: other.slice(0, 5) });
  }
}

// ---------------------------------------------------- combat blocks (GP.2) --
if (want('combat')) {
  const W = mk(7, 'kill_all');
  W.step(5);
  const r1 = W.cmd('partySwap', 1, 'taunting_roar', 0);
  W.cmd('partyGrantNode', 1, 'sharpen');
  const r2 = W.cmd('partySocket', 1, 'heavy_slam', 'sharpen');
  const r3 = W.cmd('partyReorder', 1, 0, 1);
  check('combat', 'combat_active blocks swap / socket / reorder', r1.denied === 'combat_active' && r2.denied === 'combat_active' && r3.denied === 'combat_active', [r1, r2, r3]);
}

// -------------------------------------------------- class skill effects --
function arena(seat, skill, slot = 0) {
  const W = mk(3);
  W.step(2);
  const P = W.world.partySystem();
  if (!P.slots(seat).includes(skill)) P.swap(seat, skill, slot);
  const s = P.slots(seat).indexOf(skill);
  W.cmd('placeAlly', 1, -1.6, 1.0);
  W.cmd('placeAlly', 2, 1.6, 1.0);
  W.cmd('placeAlly', 3, 0, 2.2);
  W.cmd('teleport', 0, 0);
  return { W, P, s };
}
const ev = (W, k, type) => W.since(k).filter((e) => e.type === type);
// A body that survives the whole probe (the other allies swing at it too).
const tough = (W, id, hp = 5000) => {
  const e = W.registry.byId(id);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    if (e.kind === 'dummy') e.knockbackable = false; // stays where the probe put it
  }
  return id;
};

if (want('skills')) {
  // Taunting Roar: hostiles around the Tank targeting others are forced onto it.
  {
    const { W, s } = arena(1, 'taunting_roar');
    const tank = W.ally(1);
    const ids = [tough(W, W.cmd('spawn', 'boar', tank.x + 1.0, tank.z)), tough(W, W.cmd('spawn', 'boar', tank.x - 0.8, tank.z + 0.9)), tough(W, W.cmd('spawn', 'boar', tank.x, tank.z - 1.2))];
    W.step(3);
    const k = W.evs.length;
    W.cmd('partyCast', 1, s);
    W.step(2);
    const boars = ids.map((id) => W.registry.byId(id)).filter(Boolean);
    const taunted = boars.filter((b) => b.status && b.status.taunt && b.status.taunt.src === tank.id);
    const onTank = boars.filter((b) => b.targetId === tank.id);
    check('skills', 'Taunting Roar taunts every hostile in 2.0 u onto the Tank (150 ticks) and they target it', taunted.length === 3 && onTank.length === 3 && ev(W, k, 'ally_cast').some((e) => e.skill === 'taunting_roar'), { taunted: taunted.length, onTank: onTank.length, ticks: taunted[0] && taunted[0].status.taunt.untilTick - W.world.tick });
  }
  // Shield Wall: the bottom-2 HP fractions in range get 24 shield.
  {
    const { W, s } = arena(1, 'shield_wall');
    const tank = W.ally(1);
    W.cmd('placeAlly', 2, tank.x + 1, tank.z);
    W.cmd('placeAlly', 3, tank.x + 2, tank.z);
    W.cmd('setHp', W.ally(2).id, 0.3);
    W.cmd('setHp', W.ally(3).id, 0.4);
    tough(W, W.cmd('spawn', 'boar', tank.x + 2.5, tank.z + 2));
    const k = W.evs.length;
    W.cmd('partyCast', 1, s);
    W.step(1);
    const sw = [W.ally(2), W.ally(3)].map((m) => (m.status && m.status.shield ? m.status.shield.mag : 0));
    check('skills', 'Shield Wall shields the 2 neediest in 3.0 u for 24 (240 ticks)', sw[0] === 24 && sw[1] === 24, { sw, cast: ev(W, k, 'ally_cast').map((e) => e.targets) });
  }
  // Shoulder Charge: a dash (≤ 2.4 u) then an arc that stuns 36 ticks.
  {
    const { W, s } = arena(1, 'shoulder_charge');
    const tank = W.ally(1);
    const x0 = tank.x;
    const bid = tough(W, W.cmd('spawn', 'boar', tank.x + 2.6, tank.z));
    W.step(1);
    const k = W.evs.length;
    W.cmd('partyCast', 1, s);
    W.step(30);
    const b = W.registry.byId(bid);
    const dash = ev(W, k, 'ally_dash')[0];
    const cast = ev(W, k, 'ally_cast').find((e) => e.skill === 'shoulder_charge');
    check('skills', 'Shoulder Charge dashes toward the target, then its arc hits and stuns (non-boss)', dash && cast && cast.dash === true && tank.x - x0 > 1.2 && (b ? b.status && b.status.stun : true), { moved: +(tank.x - x0).toFixed(2), dash, cast: cast && { dash: cast.dash, targets: cast.targets }, stun: b && b.status && b.status.stun });
  }
  // Iron Stance: a pulse every 60 ticks shields the party inside 1.3 u (+3, cap 12).
  {
    const { W } = arena(1, 'iron_stance', 3);
    const tank = W.ally(1);
    W.cmd('placeAlly', 2, tank.x + 0.8, tank.z);
    const k = W.evs.length;
    W.step(125);
    const pulses = ev(W, k, 'aura_pulse').filter((e) => e.seat === 1);
    const sh = W.ally(2).status && W.ally(2).status.shield ? W.ally(2).status.shield.mag : 0;
    check('skills', 'Iron Stance pulses every 60 ticks (+3 shield to everyone inside)', pulses.length === 2 && pulses[1].tick - pulses[0].tick === 60 && sh === 6, { n: pulses.length, gap: pulses.length > 1 ? pulses[1].tick - pulses[0].tick : null, sh });
    W.world.partySystem().swap(1, 'taunting_roar', 3);
    const k2 = W.evs.length;
    W.step(130);
    check('skills', 'Iron Stance stops the tick it is swapped out', ev(W, k2, 'aura_pulse').filter((e) => e.seat === 1).length === 0);
  }
  // Fox Step: a dash with i-frames, then the arc.
  {
    const { W, s } = arena(2, 'fox_step');
    const fox = W.ally(2);
    const x0 = fox.x;
    tough(W, W.cmd('spawn', 'boar', fox.x + 2.3, fox.z));
    W.step(1);
    const k = W.evs.length;
    W.cmd('partyCast', 2, s);
    W.step(3);
    const ifr = (fox.iframeUntilTick ?? 0) > W.world.tick;
    W.step(20);
    const cast = ev(W, k, 'ally_cast').find((e) => e.skill === 'fox_step');
    check('skills', 'Fox Step dashes (i-framed) then strikes', cast && cast.dash && ifr && fox.x - x0 > 1, { moved: +(fox.x - x0).toFixed(2), ifr, targets: cast && cast.targets });
  }
  // Crescent Finisher: +50% per OTHER skill that connected in 120 ticks.
  {
    const { W } = arena(2, 'crescent_finisher', 3);
    const fox = W.ally(2);
    tough(W, W.cmd('spawn', 'boar', fox.x + 0.5, fox.z));
    W.step(1);
    W.cmd('partyCast', 2, 0); // Flurry connects
    W.step(3);
    const k = W.evs.length;
    W.cmd('partyCast', 2, 3); // the finisher
    W.step(1);
    const cast = ev(W, k, 'ally_cast').find((e) => e.skill === 'crescent_finisher');
    check('skills', 'Crescent Finisher: +50% per other connected skill (combo ≥ 1 → 20 × (1 + 0.5·combo))', cast && cast.combo >= 1 && cast.power === 20 * (1 + 0.5 * cast.combo), cast && { combo: cast.combo, power: cast.power });
  }
  // Riposte: a parry window; the next hostile hit is blocked and countered.
  {
    const { W, s } = arena(2, 'riposte');
    const fox = W.ally(2);
    W.cmd('placeAlly', 1, -4, -3);
    W.cmd('placeAlly', 3, -3, -4);
    W.cmd('teleport', -3.5, -2);
    const bid = tough(W, W.cmd('spawn', 'boar', fox.x + 0.6, fox.z));
    W.step(2);
    const k = W.evs.length;
    W.cmd('partyCast', 2, s);
    const hp0 = fox.hp;
    W.step(120);
    const blocked = ev(W, k, 'hit_blocked').filter((e) => e.parry && e.targetId === fox.id);
    const counter = ev(W, k, 'parry_counter');
    const opened = ev(W, k, 'parry_open');
    check('skills', 'Riposte: parry window → the next hostile hit is blocked (0 dmg) and countered', opened.length === 1 && (blocked.length === 0 || counter.length >= 1), { opened: opened.length, blocked: blocked.length, counter: counter.length, hpLost: +(hp0 - fox.hp).toFixed(1), boar: !!W.registry.byId(bid) });
  }
  // Razor Wake: 3 nearest hostiles in 0.9 u take 4 per pulse, no knockback.
  {
    const { W } = arena(2, 'razor_wake', 3);
    const fox = W.ally(2);
    W.cmd('placeAlly', 2, 0, -2);
    const ids = [tough(W, W.cmd('spawn', 'dummy', 0.6, -2)), tough(W, W.cmd('spawn', 'dummy', -0.6, -2)), tough(W, W.cmd('spawn', 'dummy', 0, -1.3))];
    const k = W.evs.length;
    W.step(65);
    const hits = ev(W, k, 'hit').filter((e) => e.source === 'razor_wake');
    check('skills', 'Razor Wake hits up to 3 hostiles in 0.9 u for 4, kb 0', hits.length >= 1 && hits.every((h) => h.kb === 0), { n: hits.length, amt: hits.map((h) => h.amount) });
    void ids;
    void fox;
  }
  // Vault Shot: vault away from a close hostile, then a slowing bolt.
  {
    const { W, s } = arena(3, 'vault_shot');
    const hare = W.ally(3);
    const bid = tough(W, W.cmd('spawn', 'dummy', hare.x + 1.0, hare.z));
    W.step(1);
    const x0 = hare.x;
    const k = W.evs.length;
    W.cmd('partyCast', 3, s);
    W.step(60);
    const dash = ev(W, k, 'ally_dash')[0];
    const slow = W.since(k).filter((e) => e.type === 'status_apply' && e.id === bid && e.status === 'slow');
    check('skills', 'Vault Shot vaults 1.6 u away, then fires; a hit slows 30%', dash && dash.cause === 'vault' && Math.abs(hare.x - x0) > 1.0 && slow.length >= 1 && slow[0].mag === 0.3, { moved: +(hare.x - x0).toFixed(2), slow });
  }
  // Pinning Arrow: stun 45 on a non-boss.
  {
    const { W, s } = arena(3, 'pinning_arrow');
    const hare = W.ally(3);
    const bid = tough(W, W.cmd('spawn', 'dummy', hare.x + 3, hare.z));
    W.step(1);
    const k = W.evs.length;
    W.cmd('partyCast', 3, s, { x: hare.x + 3, z: hare.z });
    W.step(40);
    const st = W.since(k).filter((e) => e.type === 'status_apply' && e.id === bid && e.status === 'stun');
    check('skills', 'Pinning Arrow stuns 45 ticks (non-boss)', st.length >= 1 && st[0].untilTick - st[0].tick === 45, st);
  }
  // Rain of Arrows: a zone that ticks damage + slow 25%.
  {
    const { W, s } = arena(3, 'rain_of_arrows');
    const hare = W.ally(3);
    const bid = tough(W, W.cmd('spawn', 'dummy', hare.x + 3, hare.z));
    W.step(1);
    const k = W.evs.length;
    W.cmd('partyCast', 3, s, { x: hare.x + 3, z: hare.z });
    W.step(70);
    const ticks = ev(W, k, 'azone_tick').filter((e) => e.skill === 'rain_of_arrows');
    check('skills', 'Rain of Arrows ticks 7 on hostiles inside', ticks.length >= 1 && ticks[0].hit.length >= 1, ticks.map((t) => t.hit));
    void bid;
  }
  // Kestrel Watch: the nearest hostile in 4.0 u takes 6 per pulse.
  {
    const { W } = arena(3, 'kestrel_watch', 3);
    const hare = W.ally(3);
    tough(W, W.cmd('spawn', 'dummy', hare.x + 3, hare.z));
    const k = W.evs.length;
    W.step(125);
    const hits = ev(W, k, 'hit').filter((e) => e.source === 'kestrel_watch');
    const pulses = ev(W, k, 'aura_pulse').filter((e) => e.seat === 3);
    check('skills', 'Kestrel Watch: a pulse every 60 ticks strikes the nearest hostile in 4.0 u for 6', hits.length === 2 && pulses.length === 2 && hits[0].amount >= 6, { hits: hits.map((h) => h.amount), pulses: pulses.length });
  }
}

// ------------------------------------------------------ GP.11 save / load --
if (want('save')) {
  const { createStateIO } = await import(u('src/save/capture.js'));
  const { hashState } = await import(u('src/core/hash.js'));
  const codec = await import(u('src/save/codec.js'));
  const { scriptedInput } = await import(u('src/sim/script.js'));
  function mkIO(seed = 7) {
    let impl = createGameplayRng(seed >>> 0);
    const rng = {
      stream: 'gameplay',
      get seed() { return impl.seed; },
      get drawIndex() { return impl.drawIndex; },
      float: () => impl.float(),
      range: (a, b) => impl.range(a, b),
      int: (n) => impl.int(n),
      chance: (q) => impl.chance(q),
      pick: (a) => impl.pick(a),
      reseed: (s2) => { impl = createGameplayRng(s2 >>> 0); return impl.seed; },
      getState: () => impl.getState(),
      setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
    };
    const registry = createRegistry();
    const bus = createEventBus();
    const clock = createClock();
    const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
    const evs = [];
    bus.on('*', (e) => { if (e.type !== 'sound') evs.push(e); });
    const io = createStateIO({ clock, rng, registry, world });
    const stepN = (n, driver = null) => {
      let k = 0;
      for (let g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, scriptedInput(3, t, { skillSlots: 4 })))) { k += 1; if (driver) driver(world, clock.tick); }
    };
    return { world, io, stepN, clock, evs };
  }
  const drive = (world, tick) => {
    if (tick % 240 !== 0) return;
    world.cmd('killAllEnemies');
    const r = world.runSystem().view();
    if (r.phase === 'reward') world.runSystem().takeReward();
    if (r.phase === 'path') world.cmd('pathChoose', 0);
    if (r.phase === 'shop') world.cmd('shopAdvance');
  };
  const trip = (label, prep) => {
    const A = mkIO();
    prep(A);
    const tree = A.io.capture();
    const B = mkIO(99);
    const ok = B.io.apply(tree);
    const same0 = hashState(tree) === hashState(B.io.capture());
    const hA = [];
    const hB = [];
    for (let k = 0; k < 8; k++) {
      A.stepN(60, drive);
      B.stepN(60, drive);
      hA.push(hashState(A.io.capture()));
      hB.push(hashState(B.io.capture()));
    }
    check('save', `${label}: capture → apply to a fresh world → equal tree + identical continuation (8 × 60 ticks)`, ok.ok && same0 && JSON.stringify(hA) === JSON.stringify(hB), { ok, same0, first: hA.findIndex((h, i) => h !== hB[i]) });
  };
  trip('four max-stress builds mid-level', (A) => {
    A.world.runSystem().setHarnessGrant('max');
    A.world.runSystem().startRun();
    A.stepN(400);
  });
  trip('on the party page', (A) => {
    A.world.runSystem().startRun();
    for (let k = 0; k < 40 && A.world.runSystem().view().phase === 'combat'; k++) {
      A.stepN(60);
      A.world.cmd('killAllEnemies');
      A.stepN(2);
    }
  });
  // A REAL schema-3 file from the v0.5.150 tree (--base150 <dir> = a `git
  // archive` of it), loaded by this build: allies on their kits + ONE
  // catch-up grant.
  const baseDir = opt('base150');
  if (baseDir) {
    const bu = (p2) => pathToFileURL(join(baseDir, p2)).href;
    const rngM = await import(bu('src/core/rng.js'));
    const regM = await import(bu('src/core/registry.js'));
    const busM = await import(bu('src/core/events.js'));
    const clkM = await import(bu('src/core/clock.js'));
    const wM = await import(bu('src/sim/world.js'));
    const capM = await import(bu('src/save/capture.js'));
    const codM = await import(bu('src/save/codec.js'));
    let impl = rngM.createGameplayRng(7);
    const rng = { stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; }, float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (q) => impl.chance(q), pick: (a) => impl.pick(a), reseed: (s2) => { impl = rngM.createGameplayRng(s2 >>> 0); return impl.seed; }, getState: () => impl.getState(), setState: (st) => { impl = rngM.createGameplayRng(st.seed >>> 0); return impl.setState(st); } };
    const registry = regM.createRegistry();
    const bus = busM.createEventBus();
    const clock = clkM.createClock();
    const world = wM.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
    const io = capM.createStateIO({ clock, rng, registry, world });
    world.runSystem().startCampaign({ level: 2, harness: false });
    const st = (n) => { for (let k = 0, g = 0; k < n && g < n * 8; g++) if (clock.stepOnce((t) => world.step(t, scriptedInput(3, t, { skillSlots: 4 })))) k += 1; };
    for (let room = 0; room < 2; room++) {
      for (let k = 0; k < 40 && world.runSystem().view().phase === 'combat'; k++) { st(60); world.cmd('killAllEnemies'); st(2); }
      if (world.runSystem().view().phase === 'reward') world.runSystem().takeReward();
      if (world.runSystem().view().phase === 'path') world.cmd('pathChoose', 0);
      st(40);
    }
    const tree3 = io.capture();
    const built = codM.buildFile({ slot: { id: 'manual-1' }, meta: { act: 2, skills: [] }, state: tree3, game: { version: '0.5.150' }, createdAt: 0, savedAt: 0 });
    check('save', 'the v0.5.150 tree writes a schema-3 file', built.file.schema === 3);
    const parsed = codec.parseFile(built.text);
    check('save', 'a schema-3 file parses + migrates to schema 4 (meta.builds present)', parsed.ok && parsed.migrated && parsed.file.schema === 4 && Array.isArray(parsed.file.meta.builds) && parsed.file.meta.builds.length === 4, { ok: parsed.ok, err: parsed.detail, schema: parsed.file && parsed.file.schema });
    const C = mkIO(5);
    const r = C.io.apply(parsed.file.state);
    check('save', 'the migrated tree applies; every ally on its §7 kit', r.ok && [1, 2, 3].every((i) => JSON.stringify(C.world.cmd('partyView', i).slots) === JSON.stringify(C_KITS[i])), r);
    const k0 = C.evs.length;
    C.stepN(3);
    const cu = C.evs.slice(k0).filter((e) => e.type === 'party_catchup');
    const views = [1, 2, 3].map((i) => C.world.cmd('partyView', i));
    check('save', 'the ally catch-up grant fires exactly once (STARTER_GRANT[2].allies + 2 nodes / 12 Glint per cleared room)', cu.length === 1 && cu[0].level === 2 && views.every((v) => v.bench.length + v.filled >= 12 && v.purse >= 30), { cu, views: views.map((v) => ({ n: v.bench.length + v.filled, purse: v.purse, slots: v.slots })) });
    C.stepN(200);
    check('save', 'no second catch-up', C.evs.filter((e) => e.type === 'party_catchup').length === 1);
    check('save', 'MIGRATIONS chain 1 → 2 → 3 → 4 is complete', typeof codec.MIGRATIONS[1] === 'function' && typeof codec.MIGRATIONS[2] === 'function' && typeof codec.MIGRATIONS[3] === 'function' && codec.SCHEMA === 4);
  }
}

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ tool: 'gntPARTY-sim', checks: results.length, passed: results.length - failed.length, failed: failed.map((f) => `[${f.group}] ${f.name}`) }, null, 1));
process.exit(failed.length ? 1 : 0);
