#!/usr/bin/env node
// M5b sim-layer probe (headless Node): human-controlled ally seats through
// world.step(tick, snapshot, seatInputs) — movement / dodge / basic / kit /
// denials / seat_control / lag-compensated selection / same-tick interact /
// human revive — plus replica refusal and host-vs-predictor movement parity.
//   node tools/gntM5b-simseats.mjs [--out captures/gntM5b-simseats.json]
import { writeFileSync } from 'node:fs';
import { createGameplayRng } from '../src/core/rng.js';
import { createRegistry } from '../src/core/registry.js';
import { createEventBus } from '../src/core/events.js';
import { createClock } from '../src/core/clock.js';
import { createWorld } from '../src/sim/world.js';
import { emptySnapshot } from '../src/core/intents.js';
import { seatInputOf, frameFromSnapshot, STALE_REPEAT_TICKS } from '../src/sim/netseats.js';
import { stepHumanMove, moveOf, moveIndex } from '../src/sim/remote.js';
import { ALLY_CLASSES } from '../src/sim/allies.js';
import { DODGE } from '../src/core/constants.js';

const out = { checks: [], ok: true };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  if (!ok) out.ok = false;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
}

function makeWorld(seed = 7) {
  let impl = createGameplayRng(seed);
  const rng = {
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
  const evs = [];
  bus.on('*', (e) => { if (e.type !== 'sound') evs.push(e); });
  return { world, registry, bus, clock, evs };
}

let seqCounter = 0;
function frame({ move = 0, aim = { x: 0, z: 0 }, basic = false, revive = false, presses = [], viewTick = 0 } = {}) {
  seqCounter += 1;
  const snap = emptySnapshot();
  const m = moveOf(move);
  snap.move = { x: m.x, z: m.z };
  snap.aim = aim;
  snap.basicAttackHeld = basic;
  snap.reviveHeld = revive;
  snap.presses = presses.map((k) => ({ kind: k }));
  return frameFromSnapshot(snap, { seq: seqCounter, tick: seqCounter, viewTick });
}
function stepWith(W, seats, extra = {}) {
  const si = { seats: {}, reasons: {}, player: 'human', rewind: extra.rewind ?? null };
  for (const [i, f] of Object.entries(seats)) si.seats[i] = seatInputOf(Array.isArray(f) ? f : [f]);
  // A pending hitstop tick is consumed without stepping (clock.stepOnce):
  // keep going until this input really lands on a world step.
  for (let g = 0; g < 8; g++) if (W.clock.stepOnce((t) => W.world.step(t, extra.player ?? emptySnapshot(), si))) break;
}
const ally = (W, i) => W.registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i);

// ---------------------------------------------------------------- 1 move
{
  const W = makeWorld();
  const a = ally(W, 2);
  const x0 = a.x;
  const z0 = a.z;
  stepWith(W, { 2: frame() });
  const ctl = W.evs.filter((e) => e.type === 'seat_control');
  check('seat_control join on the first human tick', ctl.length === 1 && ctl[0].partyIndex === 2 && ctl[0].controller === 'human' && ctl[0].reason === 'join', { ctl });
  for (let k = 0; k < 60; k++) stepWith(W, { 2: frame({ move: 1, aim: { x: a.x + 3, z: a.z } }) });
  const dx = a.x - x0;
  const want = Math.min(ALLY_CLASSES.swordsman.moveSpeed, 11.4 - x0 - a.radius);
  check('human swordsman walks east at class speed (60 frames = 1 s)', Math.abs(dx - want) < 0.02 && Math.abs(a.z - z0) < 1e-9, { dx: +dx.toFixed(4), want: +want.toFixed(4) });
  // Seat 1 / 3 stay AI: their bodies were never given human fields.
  check('other seats stay AI (no human fields)', ally(W, 1).controller === undefined && ally(W, 3).controller === undefined, {});
  // drop -> AI
  W.clock.stepOnce((t) => W.world.step(t, emptySnapshot(), { seats: {}, reasons: { 2: 'drop' }, player: 'human' }));
  const drop = W.evs.filter((e) => e.type === 'seat_control').pop();
  check('seat_control drop -> ai with reason', drop.partyIndex === 2 && drop.controller === 'ai' && drop.reason === 'drop' && a.controller === undefined, { drop });
}

// ---------------------------------------------------------------- 2 dodge
{
  const W = makeWorld();
  const a = ally(W, 1);
  a.x = -3;
  a.z = 0;
  stepWith(W, { 1: frame({ aim: { x: 0, z: 0 } }) });
  const x0 = a.x;
  stepWith(W, { 1: frame({ move: 1, presses: ['dodge'], aim: { x: 0, z: 0 } }) });
  const iframed = a.iframeUntilTick > W.world.tick;
  for (let k = 0; k < DODGE.durationTicks + 2; k++) stepWith(W, { 1: frame({ aim: { x: 0, z: 0 } }) });
  const dist = a.x - x0;
  check('human dodge travels 1.8 u (15 ticks), i-framed while dashing', Math.abs(dist - DODGE.distance) < 0.05 && iframed, { dist: +dist.toFixed(4), iframed });
  const ev = W.evs.find((e) => e.type === 'ally_dodge');
  check('ally_dodge event tagged { seat, inputSeq }', ev && ev.seat === 1 && Number.isInteger(ev.inputSeq), { ev });
  stepWith(W, { 1: frame({ presses: ['dodge'] }) });
  const den = W.evs.filter((e) => e.type === 'seat_denied' && e.kind === 'dodge');
  check('second dodge inside 1.2 s denied on_cooldown (seat_denied)', den.length === 1 && den[0].reason === 'on_cooldown', { den });
}

// ---------------------------------------------------------------- 3 basic + kit
{
  const W = makeWorld();
  const a = ally(W, 2); // swordsman
  a.x = 0;
  a.z = 0;
  const dId = W.world.cmd('spawn', 'dummy', 0.6, 0);
  const d = W.registry.byId(dId);
  d.hp = d.maxHp = 1e6; // AI seats 1 / 3 fight it too: it must survive the probe
  d.knockbackable = false; // ...and stay where the arc is aimed
  const hp0 = d.hp;
  stepWith(W, { 2: frame({ aim: { x: 3, z: 0 }, basic: true }) });
  const b = W.evs.find((e) => e.type === 'ally_basic');
  check('human basic swings on the aim and hits the dummy in the arc', b && b.targets.includes(dId) && d.hp < hp0 && b.seat === 2, { targets: b && b.targets, hp: d.hp });
  // AI seats 1 / 3 fight the dummy too: judge the HUMAN seat's own events.
  d.hp = d.maxHp;
  const nBefore = W.evs.length;
  for (let k = 0; k < 30; k++) stepWith(W, { 2: frame({ aim: { x: -3, z: 0 }, basic: true }) });
  const away = W.evs.slice(nBefore).filter((e) => e.type === 'ally_basic' && e.seat === 2);
  check('aiming away from the dummy never hits it', away.length >= 1 && away.every((e) => e.targets.length === 0), { swings: away.length });
  d.hp = d.maxHp;
  stepWith(W, { 2: frame({ aim: { x: 3, z: 0 }, presses: ['skill_1'] }) });
  const c = W.evs.find((e) => e.type === 'ally_cast' && e.skill === 'flurry' && e.seat === 2);
  check('human kit skill_1 (Flurry) casts on the aim with tag', c && c.seat === 2 && c.targets.includes(dId), { c: c && { targets: c.targets, inputSeq: c.inputSeq } });
  stepWith(W, { 2: frame({ aim: { x: 3, z: 0 }, presses: ['skill_1', 'skill_6'] }) });
  const dn = W.evs.filter((e) => e.type === 'seat_denied');
  check('kit on cooldown -> seat_denied on_cooldown; slot 6 -> empty_slot', dn.some((e) => e.kind === 'skill_1' && e.reason === 'on_cooldown') && dn.some((e) => e.kind === 'skill_6' && e.reason === 'empty_slot'), { dn: dn.map((e) => [e.kind, e.reason]) });
}
{
  // archer projectile + ground aoe (a fresh world: the AI archer's cooldowns are clean)
  const W = makeWorld();
  const r = ally(W, 3);
  r.x = -2;
  r.z = 2;
  stepWith(W, { 3: frame({ aim: { x: 2, z: 2 }, presses: ['skill_3'] }) });
  const dc = W.evs.find((e) => e.type === 'ally_cast' && e.skill === 'detonating_charge' && e.seat === 3);
  check('archer ground_aoe lands at the aim point (clamped to 4.2)', dc && Math.abs(dc.zx - 2) < 0.01 && Math.abs(dc.zz - 2) < 0.01 && W.evs.some((e) => e.type === 'azone_spawn' && e.seat === 3), { zx: dc && dc.zx, zz: dc && dc.zz });
  const before = new Set(W.registry.all().map((e) => e.id));
  stepWith(W, { 3: frame({ aim: { x: 2, z: 2 }, basic: true }) });
  const bolt = W.registry.all().find((e) => e.kind === 'skillbolt' && e.sourceId === r.id && e.skill === 'archer_basic' && !before.has(e.id));
  check('archer basic spawns a bolt toward the aim', !!bolt && bolt.vx > 0 && Math.abs(bolt.vz) < 1e-9, { bolt: bolt && { vx: bolt.vx, vz: bolt.vz } });
}

// ---------------------------------------------------------------- 4 lag compensation
{
  const run = (withRewind) => {
    const W = makeWorld();
    const a = ally(W, 2);
    a.x = 0;
    a.z = 0;
    const dId = W.world.cmd('spawn', 'dummy', 2.0, 0); // LIVE: out of reach (0.75)
    const d = W.registry.byId(dId);
    const hp0 = d.hp;
    // The guest saw the dummy at 0.6 u in front (its interpolated past).
    const rewind = withRewind ? () => ({ ticks: 9, map: new Map([[dId, { x: 0.6, z: 0 }]]) }) : null;
    stepWith(W, { 2: frame({ aim: { x: 3, z: 0 }, basic: true, viewTick: 1 }) }, { rewind });
    const lag = W.world.cmd('netSeats').lag;
    return { hit: d.hp < hp0, x: d.x, lag };
  };
  const on = run(true);
  const off = run(false);
  check('lag comp: a swing at the SEEN position hits (live body restored after)', on.hit && on.x === 2 && on.lag.compHits === 1, on);
  check('lag comp disabled: the same swing misses', !off.hit, off);
}

// ---------------------------------------------------------------- 5 interact once
{
  const W = makeWorld();
  const ixId = W.world.cmd('spawnInteractable', 'bell', 0, 0);
  const player = W.world.player;
  player.x = -0.5;
  player.z = 0;
  const a = ally(W, 1);
  a.x = 0.5;
  a.z = 0;
  // the bell only works mid-room: start a room so it is not dormant
  W.world.cmd('startRoom', 'kill_all');
  const snap = emptySnapshot();
  snap.presses = [{ kind: 'interact' }];
  stepWith(W, { 1: frame({ presses: ['interact'] }) }, { player: snap });
  const uses = W.evs.filter((e) => e.type === 'interact');
  const denies = W.evs.filter((e) => e.type === 'interact_denied');
  check('same-tick E by the Healer and a human seat -> one activation (Healer first)', uses.length === 1 && uses[0].by === player.id && denies.length <= 1, { uses: uses.map((u) => u.by), denies: denies.map((d) => d.reason), ixId });
}

// ---------------------------------------------------------------- 6 human revive
{
  const W = makeWorld();
  const a = ally(W, 3);
  const body = ally(W, 1);
  a.x = 1;
  a.z = 1;
  body.x = 1.3;
  body.z = 1;
  W.world.cmd('setHp', body.id, 0);
  stepWith(W, { 3: frame() });
  for (let k = 0; k < 305; k++) stepWith(W, { 3: frame({ revive: true }) });
  const rev = W.evs.find((e) => e.type === 'revive' && e.target === body.id);
  check('human seat revives a Downed ally by holding E 5 s', !!rev && rev.reviver === a.id && body.hp > 0, { rev });
  // moving breaks it
  W.world.cmd('setHp', body.id, 0);
  for (let k = 0; k < 30; k++) stepWith(W, { 3: frame({ revive: true }) });
  stepWith(W, { 3: frame({ revive: true, move: 1 }) });
  const br = W.evs.filter((e) => e.type === 'revive_break').pop();
  check('moving breaks a human revive channel (reason move)', br && br.reason === 'move' && br.reviver === a.id, { br });
}

// ---------------------------------------------------------------- 7 parity host vs predictor
{
  const W = makeWorld(11);
  const a = ally(W, 2);
  a.x = -4;
  a.z = -1;
  const proxy = { x: a.x, z: a.z, radius: a.radius, dashTicksLeft: 0, dashVel: { x: 0, z: 0 } };
  let maxErr = 0;
  const frames = [];
  for (let k = 0; k < 400; k++) {
    const mv = [1, 2, 3, 0, 8, 7, 5, 4][Math.floor(k / 25) % 8];
    const presses = k % 97 === 10 ? ['dodge'] : [];
    frames.push(frame({ move: mv, aim: { x: 3, z: -2 }, presses }));
  }
  for (const f of frames) {
    stepWith(W, { 2: f });
    // predictor: same order as the host (move this frame, then a dodge press
    // starts the dash for the NEXT frame)
    const si = seatInputOf([f]);
    stepHumanMove(proxy, si.moves[0], ALLY_CLASSES.swordsman.moveSpeed);
    if (si.presses.some((p) => p.kind === 'dodge') && a.dashTicksLeft === DODGE.durationTicks) {
      proxy.dashTicksLeft = a.dashTicksLeft;
      proxy.dashVel = { ...a.dashVel };
    }
    maxErr = Math.max(maxErr, Math.hypot(proxy.x - a.x, proxy.z - a.z));
  }
  check('predictor (sim/remote.js) matches host movement bit-for-bit over 400 frames with dodges', maxErr === 0, { maxErr });
  check('move table round trip (8 dirs)', [1, 2, 3, 4, 5, 6, 7, 8].every((k) => moveIndex(moveOf(k).x, moveOf(k).z) === k), {});
  check('stale repeat constant is 8 ticks', STALE_REPEAT_TICKS === 8, {});
}

// ---------------------------------------------------------------- 8 replica
{
  const W = makeWorld();
  W.world.setReplica(true);
  const t0 = W.world.tick;
  W.clock.stepOnce((t) => W.world.step(t, emptySnapshot()));
  const r1 = W.world.cmd('teleport', 5, 5);
  const r2 = W.world.cmd('runState');
  const ref = W.world.replicaRefusals();
  check('replica: step refused, mutating cmd refused + counted, reads answered', W.world.tick === t0 && r1 === null && r2 && ref.cmds === 1 && ref.steps === 1, { ref, runState: !!r2 });
  W.world.setReplica(false);
  check('replica off: cmd restored', W.world.cmd('teleport', 1, 1) !== null, {});
}

writeFileSync(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'captures/gntM5b-simseats.json', JSON.stringify(out, null, 1));
console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length} ${out.ok ? 'ALL PASS' : 'FAILURES'}`);
process.exit(out.ok ? 0 : 1);
