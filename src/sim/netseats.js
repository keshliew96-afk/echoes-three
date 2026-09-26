// Network seat inputs for the sim (docs/gauntlet/PLAN.md §3.7). Owner: M5b.
//
// The host's world.step(tick, snapshot, seatInputs) receives, per human
// seat, ONE normalised seat input built here from the network input frames
// the host consumed for that seat this tick (usually one; two or more when
// the host drains a grown jitter buffer — every frame keeps its own movement
// step, see sim/remote.js). Pure data, no DOM, no clock, no RNG.
//
//   seatInputs = {
//     seats:   { [partyIndex 1..3]: SeatInput },   // absent seat -> §12 ally AI
//     reasons: { [partyIndex]: 'join'|'drop'|'away'|'return'|'migrate' },
//     player:  'human' | 'ai',                      // who produced world.step's snapshot
//     rewind:  (viewTick) -> Map(id -> {x, z}) | null   // host lag compensation (net/lagcomp.js)
//   }
//   SeatInput = { seq, moves: [{x, z}, …] (>= 1), aim: {x, z} | null,
//                 basic, revive, presses: [{ kind }], viewTick }
//
// Input frame (src/net/protocol/codec.js INPUT): { seq, tick, viewTick,
// move 0..8, basic, revive, away, aimX, aimZ, press bits }.
import { moveOf, moveIndex } from './remote.js';

// Press bits of the INPUT frame (codec.js PRESS): 0 dodge, 1..8 skill_1..8,
// 9 interact.
export const PRESS_BITS = Object.freeze({ dodge: 0, skill_1: 1, skill_2: 2, skill_3: 3, skill_4: 4, skill_5: 5, skill_6: 6, skill_7: 7, skill_8: 8, interact: 9 });
const BIT_KINDS = Object.entries(PRESS_BITS).sort((a, b) => a[1] - b[1]);

export const SEAT_REASONS = Object.freeze(['join', 'drop', 'away', 'return', 'migrate']);

export function pressBitsOf(presses) {
  let bits = 0;
  for (const p of presses || []) {
    const b = PRESS_BITS[p && p.kind];
    if (b !== undefined) bits |= 1 << b;
  }
  return bits;
}
export function pressesOf(bits) {
  const out = [];
  for (const [kind, b] of BIT_KINDS) if (bits & (1 << b)) out.push({ kind });
  return out;
}

// Quantised aim exactly as the wire carries it (1/64 u), so a guest predicts
// with the aim the host will see.
export const AIM_Q = 64;
export const quantAim = (v) => Math.round(v * AIM_Q) / AIM_Q + 0;

// frameFromSnapshot(snap, { seq, tick, viewTick, away }) — a local intent
// snapshot (core/input.js) as a network input frame. Presses outside the
// seat's vocabulary (rally, target_*) are dropped: party commands are the
// Healer's.
export function frameFromSnapshot(snap, { seq, tick, viewTick = 0, away = false } = {}) {
  const mv = snap && snap.move ? moveIndex(snap.move.x, snap.move.z) : 0;
  const aim = snap && snap.aim ? { x: quantAim(snap.aim.x), z: quantAim(snap.aim.z) } : null;
  return {
    seq,
    tick,
    viewTick,
    move: away ? 0 : mv,
    basic: !away && !!(snap && snap.basicAttackHeld),
    revive: !away && !!(snap && snap.reviveHeld),
    away: !!away,
    // The wire always carries an aim (0, 0 before the cursor ever moved):
    // both sides then resolve the same point.
    aimX: aim ? aim.x : 0,
    aimZ: aim ? aim.z : 0,
    press: away ? 0 : pressBitsOf(snap && snap.presses),
  };
}

// seatInputOf(frames, carryPresses) -> SeatInput. `frames` are the frames
// the host consumes for one seat in ONE tick, oldest first. Held states come
// from the newest frame; presses are the union of every frame's bits plus
// late presses carried over (PLAN: a late frame's presses are applied on the
// next tick, never dropped).
//
// pressSeq: { [kind]: seq } — the input frame each press RODE (a late,
// carried press keeps its own older seq): the host tags that press's events
// and runs its timers from it, so a guest's prediction (made on that frame)
// matches exactly even when the host drained two frames or the press landed
// a few ticks late.
export function seatInputOf(frames, carryBits = 0, carrySeqs = null) {
  const last = frames[frames.length - 1];
  let bits = carryBits;
  const pressSeq = {};
  if (carrySeqs) for (const c of carrySeqs) for (const p of pressesOf(c.bits | 0)) if (!(p.kind in pressSeq)) pressSeq[p.kind] = c.seq;
  for (const f of frames) {
    bits |= f.press | 0;
    for (const p of pressesOf(f.press | 0)) if (!(p.kind in pressSeq)) pressSeq[p.kind] = f.seq;
  }
  return {
    seq: last.seq,
    moves: frames.map((f) => moveOf(f.move)),
    aim: { x: last.aimX, z: last.aimZ },
    basic: !!last.basic,
    revive: !!last.revive,
    presses: pressesOf(bits),
    pressSeq,
    viewTick: last.viewTick ?? 0,
    // A starved tick's repeat of the held state (no input frame consumed,
    // net/driver.js): the seat walks on it (the stale-input policy) but its
    // dash does not advance — a dash runs on the seat's input frames.
    starved: frames.length > 0 && frames.every((f) => f.starved === true),
  };
}

// Stale-input policy (PLAN "Stale input + hidden tabs"): a missing frame
// repeats the last HELD state (move, aim, basic/revive — never presses) for
// at most STALE_REPEAT_TICKS ticks, then neutral input until a frame arrives.
export const STALE_REPEAT_TICKS = 8;
export function repeatFrame(last, seq) {
  return { ...last, seq, tick: (last.tick | 0) + 1, press: 0, synthetic: 'repeat' };
}
export function neutralFrame(last, seq) {
  return { ...last, seq, tick: (last ? last.tick | 0 : 0) + 1, move: 0, basic: false, revive: false, press: 0, synthetic: 'neutral' };
}

// seatInputToPlayerSnapshot(si) — a remote human on SEAT 0 (the Healer, e.g.
// the old host rejoining after a migration) drives world.step's player
// snapshot through the intent vocabulary. Movement uses the newest move (the
// Healer's continuous phase takes one step per tick).
export function playerSnapshotOf(si) {
  const mv = si.moves[si.moves.length - 1] || { x: 0, z: 0 };
  return {
    move: { x: mv.x, z: mv.z },
    aim: si.aim ? { x: si.aim.x, z: si.aim.z } : null,
    basicAttackHeld: !!si.basic,
    reviveHeld: !!si.revive,
    presses: si.presses.map((p) => (p.kind.startsWith('skill_') ? { kind: p.kind, slot: Number(p.kind.slice(6)) - 1 } : { kind: p.kind })),
  };
}
