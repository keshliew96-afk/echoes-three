#!/usr/bin/env node
// TONICS AND BOMBS probe (docs/CONSUMABLES.md), headless sim, no browser:
//   gate     campaigns (Endless, the Daily and Boss Rush too) carry the carry
//            slots; the legacy single run and the tutorial never do
//   roll     the elite roll is a hash (about one elite in five), so is the
//            kind; a real elite kill drops one, drawing nothing extra
//   floor    a loose one lands at the end of its tick; a hero walking over it
//            takes it into an empty slot; an AI seat with a full slot leaves
//            it; the player with a full slot swaps (and does not take the old
//            one straight back); the clear sends the rest to empty slots
//   use      each of the six kinds does its job (heal, haste + inspired,
//            shield, a fire burst and its burning patch, a frost burst with
//            slow and stun, the charm shattering enemy shots and warding)
//   deny     an empty slot, a Downed hero, and between rooms
//   press    the Q / RS press: the Healer's snapshot and a human seat's input
//            frame (press bit 10 on the wire) both use their own slot
//   ai       an AI seat drinks its tonic under 35% HP; the autopilot throws a
//            bomb into a crowd
//   shop     the stand sells one kind a visit, each hero one, into an empty
//            slot, from its own purse; an AI seat buys at Advance
//   chest    the vault's chest pays one into the first empty slot
//   save     a capture with full slots and a loose one continues identically
//   replay   the same seed plays the same tonic events
//
//   node tools/tonics-probe.mjs [--seed 4] [--out captures/tonics-probe.json]
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
const { emptySnapshot, DISCRETE_INTENTS } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const NS = await import(u('src/sim/netseats.js'));
const C = await import(u('src/sim/consumables.js'));
const { PRESS } = await import(u('src/net/protocol/codec.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/tonics-probe.json');
const R = C.CONSUMABLE_RULES;

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
    if (e.type.startsWith('tonic_') || e.type === 'eshot_despawn' || e.type === 'room_cleared' || e.type === 'heal') log.push(e);
  });
  // `press`: the Healer's next snapshot carries a use_item press (aim given).
  let press = null;
  let seats = null; // { [seat]: frame } — a human seat's next input frame
  const step = () =>
    clock.stepOnce((t) => {
      let s = ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot();
      if (press) {
        s = { ...s, presses: [...s.presses, { kind: 'use_item' }], aim: press.aim ?? s.aim };
        press = null;
      }
      if (seats) {
        const si = { seats: {}, reasons: {}, player: 'human', rewind: null };
        for (const [k, f] of Object.entries(seats)) si.seats[k] = NS.seatInputOf([{ ...f, seq: t, tick: t, viewTick: t }]);
        world.step(t, s, si);
        for (const k of Object.keys(seats)) seats[k] = { ...seats[k], press: 0 };
      } else world.step(t, s);
    });
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
  return {
    registry, bus, clock, world, ap, io, step, continuation, log, run,
    press: (aim = null) => { press = { aim }; },
    setSeats: (v) => { seats = v; },
  };
}

const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined).sort((a, b) => a.partyIndex - b.partyIndex);
const hero = (w, s) => heroes(w).find((e) => e.partyIndex === s);
function holdParty(w) {
  for (const e of heroes(w)) if (e.hp > 0) e.hp = e.maxHp;
}
function stepUntil(w, pred, guard, each = null) {
  for (let i = 0; i < guard; i++) {
    if (each) each();
    w.step();
    if (pred()) return true;
  }
  return false;
}
function place(e, x, z) {
  e.x = x;
  e.z = z;
  e.px = x;
  e.pz = z;
}
// Park the whole party far from (0, -2).
const park = (w) => heroes(w).forEach((e, i) => place(e, -4 + i * 2.6, 5));
const ts = (w) => w.run().cmd('tonicState', []);
function campaign(seed, extra = {}) {
  const w = build(seed);
  w.run().startCampaign({ level: 1, harness: true, ...extra });
  w.step();
  return w;
}
// A quiet combat room: the waves are held off (the director paused by a
// force-clear would end the room, so the probe kills what spawns instead).
function quiet(w) {
  for (const e of w.registry.all()) if (e.faction === 'hostile' && e.hp > 0 && e.state === 'active' && !e.probeKeep) w.world.cmd('setHp', e.id, 0);
}
const dummies = (w) => w.registry.all().filter((e) => e.kind === 'dummy');
const types = (w) => w.log.map((e) => e.type);

// ---------------------------------------------------------------- gate --
{
  const w = campaign(SEED);
  const s = ts(w);
  check('gate', 'a campaign carries four empty carry slots', !!s && s.slots.length === 4 && s.slots.every((x) => x === null), s);
  check('gate', 'the run view says so (present only in a run with tonics)', !!w.run().view().tonics);
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  legacy.step();
  check('gate', 'the legacy single run never carries one', ts(legacy) === null && !legacy.run().view().tonics && legacy.run().cmd('tonicGive', [0, 'mend_tonic']) === null);
  const tut = build(SEED);
  tut.run().startCampaign({ tutorial: true, harness: true });
  check('gate', 'nor does the tutorial', ts(tut) === null);
  for (const [name, o] of [['Endless', { endless: true }], ['the Daily', { daily: { key: '2026-10-11' } }], ['Boss Rush', { rush: true }]]) {
    const x = build(SEED);
    x.run().startCampaign({ harness: true, ...o });
    check('gate', `${name} carries the slots`, !!ts(x));
  }
  check('gate', 'use_item is a discrete intent on press bit 10 (codec and seat table agree)', DISCRETE_INTENTS.includes('use_item') && PRESS.use_item === 10 && NS.PRESS_BITS.use_item === 10);
  const bits = NS.pressBitsOf([{ kind: 'use_item' }, { kind: 'dodge' }]);
  check('gate', 'a frame carrying the press decodes back to it', NS.pressesOf(bits).some((p) => p.kind === 'use_item'), { bits });
}

// ---------------------------------------------------------------- roll --
{
  let n = 0;
  let hit = 0;
  const kinds = {};
  for (let s = 1; s <= 40; s++)
    for (let room = 1; room <= 8; room++)
      for (let id = 10; id < 60; id++) {
        n += 1;
        const k = C.eliteDropsTonic(s * 7919, 1, room, id);
        if (k) {
          hit += 1;
          kinds[k] = (kinds[k] ?? 0) + 1;
        }
      }
  const rate = hit / n;
  check('roll', `an elite drops one about ${R.eliteChance * 100}% of the time`, Math.abs(rate - R.eliteChance) < 0.03, { rate: Math.round(rate * 1000) / 1000 });
  check('roll', 'all six kinds come up, the Mending Tonic most', C.CONSUMABLE_IDS.every((k) => kinds[k] > 0) && Object.entries(kinds).every(([k, v]) => k === 'mend_tonic' || v <= kinds.mend_tonic), kinds);
  check('roll', 'the roll is a pure hash (same inputs, same answer)', C.eliteDropsTonic(77, 2, 3, 41) === C.eliteDropsTonic(77, 2, 3, 41) && C.standKind(5, 1, 7) === C.standKind(5, 1, 7));
  // A real elite kill whose id rolls a tonic.
  let got = null;
  for (let s = 1; s <= 30 && !got; s++) {
    const w = campaign(s, { level: 3 });
    w.world.cmd('skipToRoom', 3);
    w.step();
    for (let i = 0; i < 60 * 40 && !got; i++) {
      holdParty(w);
      w.step();
      const v = w.run().view();
      const el = w.registry.all().find((e) => e.elite && e.faction === 'hostile' && e.hp > 0 && e.state === 'active' && C.eliteDropsTonic(v.frame.seed, 1, v.room, e.id));
      if (el) {
        park(w);
        const want = C.eliteDropsTonic(v.frame.seed, 1, v.room, el.id);
        const at = { x: el.x, z: el.z };
        w.world.cmd('setHp', el.id, 0);
        stepUntil(w, () => w.log.some((x) => x.type === 'tonic_drop'), 30, () => park(w));
        const d = w.log.find((x) => x.type === 'tonic_drop');
        got = { seed: s, want, d, at, loose: w.registry.all().filter((e) => e.kind === 'tonic_item').map((e) => e.item) };
      }
    }
  }
  check('roll', 'a real elite kill drops its rolled kind where it fell', !!got && got.d && got.d.item === got.want && got.d.from === 'elite' && Math.hypot(got.d.x - got.at.x, got.d.z - got.at.z) < 1.5 && got.loose.includes(got.want), got && { seed: got.seed, want: got.want, drop: got.d });
}

// --------------------------------------------------------------- floor --
{
  const w = campaign(SEED);
  park(w);
  w.run().cmd('tonicDrop', ['fire_bomb', 0, -2]);
  check('floor', 'a loose one waits for the end of the tick', w.registry.all().filter((e) => e.kind === 'tonic_item').length === 0);
  w.step();
  const item = w.registry.all().find((e) => e.kind === 'tonic_item');
  check('floor', '...then lies on the floor', !!item && item.item === 'fire_bomb' && types(w).includes('tonic_drop'));
  // An AI seat with a full slot walks over it and leaves it.
  w.run().cmd('tonicGive', [1, 'mend_tonic']);
  const a1 = hero(w, 1);
  stepUntil(w, () => false, 2, () => {
    park(w);
    place(a1, 0, -2);
  });
  check('floor', 'an AI seat with a full slot leaves it lying', !!w.registry.byId(item.id) && ts(w).slots[1] === 'mend_tonic');
  // An AI seat with an empty slot takes it.
  const a2 = hero(w, 2);
  stepUntil(w, () => !w.registry.byId(item.id), 3, () => {
    park(w);
    place(a2, 0, -2);
  });
  check('floor', 'an AI seat with an empty slot takes it', ts(w).slots[2] === 'fire_bomb' && !w.registry.byId(item.id), ts(w).slots);
  // The player (a human Healer) with a full slot swaps; the old one stays put.
  w.run().cmd('tonicGive', [0, 'ward_flask']);
  w.run().cmd('tonicDrop', ['frost_bomb', 2, -2]);
  w.step();
  const p0 = hero(w, 0);
  stepUntil(w, () => ts(w).slots[0] === 'frost_bomb', 4, () => {
    park(w);
    place(p0, 2, -2);
  });
  for (let i = 0; i < 20; i++) {
    park(w);
    place(p0, 2, -2);
    w.step();
  }
  const left = w.registry.all().filter((e) => e.kind === 'tonic_item');
  check('floor', 'the player swaps: the new one in the slot, the old one left on the floor (not taken straight back)', ts(w).slots[0] === 'frost_bomb' && left.length === 1 && left[0].item === 'ward_flask', { slots: ts(w).slots, left: left.map((e) => e.item) });
  // Stepping off and back on swaps again.
  for (let i = 0; i < 3; i++) {
    park(w);
    w.step();
  }
  stepUntil(w, () => ts(w).slots[0] === 'ward_flask', 4, () => {
    park(w);
    place(p0, 2, -2);
  });
  check('floor', 'stepping off and back on swaps back', ts(w).slots[0] === 'ward_flask');
  // The clear sends what lies on the floor to the empty slots.
  w.run().cmd('tonicGive', [3, null]);
  park(w);
  w.step();
  const loose = w.registry.all().filter((e) => e.kind === 'tonic_item').map((e) => e.item);
  w.world.cmd('clearRoom');
  stepUntil(w, () => types(w).includes('room_cleared'), 300);
  const swept = w.log.filter((e) => e.type === 'tonic_gain' && e.from === 'sweep');
  check('floor', 'the room clear sends the loose ones to the empty slots, in seat order', loose.length === 1 && swept.length === 1 && ts(w).slots[3] === loose[0] && w.registry.all().every((e) => e.kind !== 'tonic_item'), { loose, slots: ts(w).slots, ev: w.log.filter((e) => e.type.startsWith('tonic_')).slice(-6).map((e) => [e.type, e.item, e.seat, e.from]) });
}

// ----------------------------------------------------------------- use --
let useSave = null;
{
  const w = campaign(SEED);
  park(w);
  quiet(w);
  const p0 = hero(w, 0);
  // Mending Tonic.
  p0.hp = p0.maxHp * 0.3;
  w.run().cmd('tonicGive', [0, 'mend_tonic']);
  const before = p0.hp;
  const r1 = w.run().cmd('tonicUse', [0]);
  check('use', 'the Mending Tonic heals half of max HP (a crit heals more)', r1 && r1.used === 'mend_tonic' && p0.hp - before >= p0.maxHp * 0.5 - 1e-6 && ts(w).slots[0] === null, { healed: Math.round(p0.hp - before), maxHp: p0.maxHp });
  // Haste Draught.
  w.run().cmd('tonicGive', [0, 'haste_draught']);
  w.run().cmd('tonicUse', [0]);
  check('use', 'the Haste Draught hastes and inspires the drinker', p0.status && p0.status.haste && p0.status.haste.mag >= 0.35 && p0.status.inspired && p0.status.inspired.mag >= 0.15);
  // Ward Flask.
  w.run().cmd('tonicGive', [0, 'ward_flask']);
  w.run().cmd('tonicUse', [0]);
  check('use', 'the Ward Flask shields 40% of max HP', p0.status && p0.status.shield && Math.abs(p0.status.shield.mag - p0.maxHp * 0.4) < 1);
  // Fire Bomb: three dummies 3 u ahead.
  place(p0, 0, 2);
  for (const dx of [-0.6, 0, 0.6]) w.world.cmd('spawn', 'dummy', dx, -1);
  const ds = dummies(w);
  const hp0 = ds.map((d) => d.hp);
  w.run().cmd('tonicGive', [0, 'fire_bomb']);
  const rb = w.run().cmd('tonicUse', [0, 0, -1]);
  const bomb = w.registry.all().find((e) => e.kind === 'tonic_bomb');
  check('use', 'a bomb leaves the hand and flies (no damage before it lands)', rb && rb.used === 'fire_bomb' && !!bomb && ds.every((d, i) => d.hp === hp0[i]));
  stepUntil(w, () => types(w).includes('tonic_burst'), R.flightTicks + 4, () => park(w));
  const burst = w.log.find((e) => e.type === 'tonic_burst');
  const hp1 = ds.map((d) => d.hp);
  check('use', 'the Fire Bomb bursts at the aim and hits every dummy in its radius', !!burst && burst.hit.length === 3 && hp1.every((h, i) => h < hp0[i]) && Math.hypot(burst.x, burst.z + 1) < 0.05, burst && { hit: burst.hit.length, x: burst.x, z: burst.z });
  check('use', 'it leaves a burning patch', w.registry.all().some((e) => e.kind === 'tonic_fire'));
  for (let i = 0; i < 70; i++) w.step();
  const hp2 = ds.map((d) => d.hp);
  check('use', 'the fire burns the dummies standing in it', hp2.every((h, i) => h < hp1[i]), { before: hp1.map(Math.round), after: hp2.map(Math.round) });
  stepUntil(w, () => !w.registry.all().some((e) => e.kind === 'tonic_fire'), 200);
  check('use', '...and goes out after 3 s', !w.registry.all().some((e) => e.kind === 'tonic_fire') && types(w).includes('tonic_fire_end'));
  // Frost Bomb on a real mantis (stun refuses dummies? use hostiles).
  for (const d of dummies(w)) w.registry.despawn(d.id);
  w.world.cmd('spawn', 'boar', 0, -1.5);
  const boar = w.registry.all().find((e) => e.kind === 'boar' && e.hp > 0);
  if (boar) boar.probeKeep = true;
  w.run().cmd('tonicGive', [0, 'frost_bomb']);
  w.run().cmd('tonicUse', [0, boar ? boar.x : 0, boar ? boar.z : -1.5]);
  stepUntil(w, () => w.log.filter((e) => e.type === 'tonic_burst').length >= 2, R.flightTicks + 4, () => park(w));
  const tick = w.world.tick;
  check('use', 'the Frost Bomb slows and stuns what it hits', !!boar && boar.status && boar.status.slow && boar.status.slow.mag >= 0.5 && boar.status.stun && boar.status.stun.untilTick > tick, boar && boar.status ? Object.keys(boar.status) : null);
  // Bell Charm: enemy shots round the Healer shatter; the party near is warded.
  if (boar) w.world.cmd('setHp', boar.id, 0);
  place(p0, 0, 0);
  const a1 = hero(w, 1);
  place(a1, 1, 0);
  for (const [x, z] of [[3, 0], [-3, 1], [0, 4]]) w.registry.spawn({ kind: 'eshot', faction: 'hostile', x, z, px: x, pz: z, vx: 0, vz: 0, radius: 0.07, power: 0, delivery: 'shot', traveled: 0, range: 7 });
  const far = w.registry.spawn({ kind: 'eshot', faction: 'hostile', x: 0, z: -9.5, px: 0, pz: -9.5, vx: 0, vz: 0, radius: 0.07, power: 0, delivery: 'shot', traveled: 0, range: 7 });
  w.run().cmd('tonicGive', [0, 'bell_charm']);
  w.run().cmd('tonicUse', [0]);
  const shotsLeft = w.registry.all().filter((e) => e.kind === 'eshot').map((e) => e.id);
  const charmEv = w.log.filter((e) => e.type === 'tonic_use' && e.item === 'bell_charm').pop();
  check('use', 'the Bell Charm shatters the shots within 8 u (not the one past it)', charmEv && charmEv.cleared === 3 && w.log.filter((e) => e.type === 'eshot_despawn' && e.cause === 'charm').length === 3 && shotsLeft.includes(far.id), charmEv && { cleared: charmEv.cleared, left: shotsLeft.length });
  check('use', '...and wards the heroes near the ringer', a1.status && a1.status.ward && a1.status.ward.mag >= 0.3 && p0.status.ward);
  w.registry.despawn(far.id);
  // A capture with full slots and a loose one, for the save leg.
  w.run().cmd('tonicGive', [1, 'haste_draught']);
  w.run().cmd('tonicGive', [2, 'fire_bomb']);
  w.run().cmd('tonicDrop', ['mend_tonic', 3, -3]);
  w.step();
  useSave = clonePlain(w.io.capture());
}

// ---------------------------------------------------------------- deny --
{
  const w = campaign(SEED);
  park(w);
  const r0 = w.run().cmd('tonicUse', [0]);
  check('deny', 'an empty slot: denied, nothing spent', r0 && r0.denied === 'empty');
  const a1 = hero(w, 1);
  w.run().cmd('tonicGive', [1, 'mend_tonic']);
  a1.hp = 0;
  a1.downed = true;
  const r1 = w.run().cmd('tonicUse', [1]);
  check('deny', 'a Downed hero cannot drink', r1 && r1.denied === 'downed' && ts(w).slots[1] === 'mend_tonic');
  const w2 = campaign(SEED);
  w2.run().cmd('tonicGive', [0, 'fire_bomb']);
  w2.world.cmd('clearRoom');
  stepUntil(w2, () => w2.run().view().phase !== 'combat', 60);
  const r2 = w2.run().cmd('tonicUse', [0]);
  check('deny', 'between rooms (no fight): denied, the slot kept', r2 && r2.denied === 'calm' && ts(w2).slots[0] === 'fire_bomb', { phase: w2.run().view().phase, r2 });
}

// --------------------------------------------------------------- press --
{
  const w = campaign(SEED);
  park(w);
  quiet(w);
  const p0 = hero(w, 0);
  p0.hp = p0.maxHp * 0.4;
  w.run().cmd('tonicGive', [0, 'mend_tonic']);
  w.press();
  w.step();
  check('press', "the Healer's Q press (its intent snapshot) drinks its own slot", ts(w).slots[0] === null && w.log.some((e) => e.type === 'tonic_use' && e.seat === 0));
  // A human seat's input frame with press bit 10 throws its own bomb at its aim.
  w.run().cmd('tonicGive', [2, 'frost_bomb']);
  const a2 = hero(w, 2);
  place(a2, 0, 0);
  w.setSeats({ 2: { move: 0, basic: false, revive: false, away: false, aimX: 3, aimZ: -3, press: NS.pressBitsOf([{ kind: 'use_item' }]) } });
  w.step();
  w.setSeats(null);
  const ev = w.log.filter((e) => e.type === 'tonic_use' && e.seat === 2).pop();
  check('press', "a human seat's input frame (bit 10) uses its own slot, aimed at its own aim", !!ev && ev.item === 'frost_bomb' && Math.abs(ev.toX - 3) < 0.05 && Math.abs(ev.toZ + 3) < 0.05 && ts(w).slots[2] === null, ev && { toX: ev.toX, toZ: ev.toZ });
}

// ------------------------------------------------------------------ ai --
{
  const w = campaign(SEED);
  park(w);
  const a3 = hero(w, 3);
  quiet(w);
  w.world.cmd('spawn', 'dummy', 6, -6); // a foe in the room: the AI spends only in a fight
  w.run().cmd('tonicGive', [3, 'mend_tonic']);
  for (let i = 0; i < 12; i++) w.step();
  check('ai', 'an AI seat keeps its tonic while healthy', ts(w).slots[3] === 'mend_tonic');
  stepUntil(w, () => ts(w).slots[3] === null, 30, () => {
    a3.hp = a3.maxHp * 0.3;
  });
  check('ai', 'an AI seat under 35% HP drinks it', ts(w).slots[3] === null && w.log.some((e) => e.type === 'tonic_use' && e.seat === 3 && e.item === 'mend_tonic'));
  // The autopilot (seat 0) throws a bomb into a crowd of four.
  const v = campaign(SEED);
  v.ap.configure(true);
  quiet(v);
  const p0 = hero(v, 0);
  v.run().cmd('tonicGive', [0, 'fire_bomb']);
  const at = { x: p0.x, z: p0.z - 4 };
  for (const [dx, dz] of [[-0.5, 0], [0.5, 0], [0, 0.5], [0, -0.5]]) v.world.cmd('spawn', 'boar', at.x + dx, at.z + dz);
  for (const e of v.registry.all()) if (e.kind === 'boar') e.probeKeep = true;
  stepUntil(v, () => ts(v).slots[0] === null, 40, () => holdParty(v));
  const thrown = v.log.find((e) => e.type === 'tonic_use' && e.seat === 0);
  check('ai', 'the autopilot throws its bomb into a crowd of four', !!thrown && thrown.item === 'fire_bomb' && Math.hypot(thrown.toX - at.x, thrown.toZ - at.z) < 1.5, thrown && { toX: thrown.toX, toZ: thrown.toZ, at });
  // Over a whole autopilot level, the seats spend what they find.
  const z = campaign(SEED + 1, { level: 2 });
  z.ap.configure(true);
  for (let i = 0; i < 60 * 60 * 6 && z.run().view().active && z.run().view().room < 8; i++) z.step();
  const gains = z.log.filter((e) => e.type === 'tonic_gain').length;
  const uses = z.log.filter((e) => e.type === 'tonic_use').length;
  check('ai', 'an autopilot Level II run finds tonics and spends some', gains >= 1 && uses >= 1, { gains, uses, room: z.run().view().room, byKind: z.log.filter((e) => e.type === 'tonic_use').map((e) => e.item) });
}

// ---------------------------------------------------------------- shop --
{
  const w = campaign(SEED);
  w.world.cmd('skipToRoom', 7);
  stepUntil(w, () => w.run().view().phase === 'shop', 300);
  const st = w.run().view().shop && w.run().view().shop.stand;
  check('shop', 'the Peddler has a tonic stand: one kind, its price, nobody has bought', !!st && C.CONSUMABLES[st.item] && st.price > 0 && st.bought.every((b) => !b), st);
  const wallet0 = w.run().view().wallet;
  const r = w.run().buyTonic(0);
  check('shop', 'the Healer buys one into its empty slot from the wallet', r && r.item === st.item && ts(w).slots[0] === st.item && w.run().view().wallet === wallet0 - st.price, r);
  const again = w.run().buyTonic(0);
  check('shop', 'one each a visit', again && again.denied === 'bought');
  w.run().cmd('tonicGive', [1, 'bell_charm']);
  const full = w.run().buyTonic(1);
  check('shop', 'a full slot cannot buy', full && (full.denied === 'full' || full.denied === undefined) && ts(w).slots[1] === 'bell_charm', full);
  // An AI seat with an empty slot and the Glint buys at Advance.
  w.world.cmd('partyMode', 'auto');
  w.world.cmd('partyGrant', 'max');
  const purse2 = w.run().view().partyShop ? w.run().view().partyShop.shelves[2].purse : null;
  w.run().advanceFromShop({ force: true });
  const aiBuy = w.log.find((e) => e.type === 'tonic_buy' && e.seat !== 0 && e.by === 'ai');
  check('shop', 'an AI seat with an empty slot and the purse buys at Advance', !!aiBuy || (purse2 !== null && purse2 < st.price), { aiBuy, purse2, price: st.price });
}

// --------------------------------------------------------------- chest --
{
  const w = campaign(SEED);
  w.world.cmd('skipToRoom', 2);
  w.step();
  w.run().cmd('keyGive', []);
  w.run().cmd('vaultRoom', [3]);
  w.world.cmd('clearRoom');
  for (let i = 0; i < 900 && w.run().view().phase !== 'vault'; i++) {
    const ph = w.run().view().phase;
    if (ph === 'reward') w.run().declineReward();
    else if (ph === 'relic') w.run().chooseRelic(0);
    else if (ph === 'path') w.run().choosePath(0);
    w.step();
  }
  w.run().cmd('tonicGive', [0, 'ward_flask']);
  const opened = w.run().cmd('vaultOpen', []);
  const g = w.log.find((e) => e.type === 'tonic_gain' && e.from === 'vault');
  check('chest', "the vault's chest pays one into the first empty slot (the Healer's is full)", w.run().view().phase === 'vault' && !!g && g.seat === 1 && ts(w).slots[1] === g.item, { phase: w.run().view().phase, g, opened: !!opened });
  const s2 = C.createConsumableSystem({ registry: createRegistry(), events: createEventBus(), getTick: () => 0, combat: null });
  s2.reset(true);
  check('chest', 'with every slot full (or no hero), a chest tonic is lost, not queued', s2.grant('mend_tonic', 'champion') === -1);
}

// ---------------------------------------------------------------- save --
if (useSave) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(useSave));
  a.ap.configure(true);
  const contA = a.continuation(600);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(useSave));
  b.ap.configure(true);
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const kept = ts(a);
  check('save', 'a capture with full slots and a loose one continues bit-identically in a fresh world', ok1.ok && ok2.ok && same, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length });
  check('save', 'the slots survive the round trip', !!kept && (kept.found >= 0) && contA.events.some((e) => e.includes('"tonic_')), kept);
}

// -------------------------------------------------------------- replay --
{
  const go = () => {
    const w = campaign(SEED + 7, { level: 3 });
    w.ap.configure(true);
    for (let i = 0; i < 60 * 60 * 3; i++) w.step();
    return w.log.filter((e) => e.type.startsWith('tonic_')).map((e) => canonicalJSON(e));
  };
  const A = go();
  const B = go();
  check('replay', 'the same seed plays the same tonic events', A.length > 0 && JSON.stringify(A) === JSON.stringify(B), { events: A.length });
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
