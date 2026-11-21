// The Barrow Wyrm's moves. Lengths are game units (u): the body is 8.08 u long and 0.46 u thick at its thickest, as the game's wyrm
// is thick (render/boss/wyrmfacet.js), and its head and short neck are Kesh's Tripo model. It has no legs: the part of the body on
// the floor only ever moves along its own line (kit/wyrm.mjs), and the bake lays that line straight behind the root; the page lays
// it along the trail the Wyrm has left, or down the hole it came out of.
// Timings come from the game: WYRM in src/sim/bosses/wyrm.js (slither 1.5 u/s; Ash Breath: 54-tick cone, radius 4.2 u, 32 degrees
// either side; Burrow Strike: tunnels at 3.4 u/s, rises under a 54-tick ring of 1.9 u, then lies exposed 90 ticks; enrage at half
// health) and the beats in render/facet/beats.js (strike 2.5 frames, held 3).
import fs from 'fs';
import { track, smooth, lerp, clamp, EASE } from '../../kit/quad.mjs';
import { makeWyrmRig } from '../../kit/wyrm.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
export const U = 4.0; const NB = skel.chain.n, LEN = skel.chain.end * U, FRONT = 2.4, HIDE = -2.0; // HIDE: how far out of its hole the neck is when the top of the skull is just under the floor (the skull reaches 1.9 u past the head joint)
export const CFG = { name: 'wyrm', unit: U, makeRig: makeWyrmRig, front: FRONT, jawMax: 0.62, extras: [['head'], ...Array.from({ length: NB }, (_, k) => ['c' + k])], scales: [], springs: [] };
const TAU = 2 * Math.PI, PI = Math.PI;
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const bump = (t, c, w) => { const x = (t - c) / w; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(PI * x); };
// a pose: X Y Z where the skull's pivot is, hy hp hr the head's yaw / pitch (+ nose down) / roll, jaw 0..1, nk how straight the neck
// leaves the skull, adv how much more body is out in front, side / bow the neck's sideways S and C, cw how far the neck is on its
// pitch line, ha how far the head follows that line
const REST = { X: 0, Y: 1.75, Z: 0.55, hy: 0, hp: 0.05, hr: 0, jaw: 0, nk: 0, adv: 0, side: 0, bow: 0, cw: 0, ha: 0, m: 1 };
const k = (o) => ({ ...REST, ...o });
const out = (p, more = {}) => ({ head: { x: p.X, y: p.Y, z: p.Z }, hy: p.hy, hp: p.hp, hr: p.hr, jaw: clamp(p.jaw), nk: clamp(p.nk), adv: p.adv, side: p.side, bow: p.bow, cw: clamp(p.cw), ha: clamp(p.ha), m: p.m, ...more });
const FLAT = () => 0; // lying along the floor

// ------------------------------------------------------------------------------------------------ idle
// Reared like a cobra and never quite still: it breathes down the whole neck, sways, looks to its left once a loop, clacks its
// jaw, and the tip of its tail lifts and flicks.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = TAU * t / 6; const look = pulse(t, 1.9, 2.5, 3.3, 3.9), clack = bump(t, 4.55, 0.09) + bump(t, 4.78, 0.08);
    const p = k({ X: 0.05 * Math.sin(w) + 0.22 * look, Y: 1.75 + 0.045 * Math.sin(2 * w), Z: 0.55 + 0.035 * Math.sin(2 * w + 1.1) - 0.06 * look, hy: 0.42 * look + 0.03 * Math.sin(w + 0.7), hp: 0.05 + 0.025 * Math.sin(2 * w + 2.2),
      hr: -0.07 * look + 0.02 * Math.sin(w), jaw: 0.04 + 0.03 * Math.sin(2 * w + 0.5) + 0.2 * clack, side: 0.07 * Math.sin(w + 0.4), bow: 0.03 * Math.sin(2 * w) });
    const fl = pulse(t, 4.9, 5.1, 5.35, 5.7); // the tail tip
    return out(p, { lift: (b) => 0.14 * fl * smooth((b - (LEN - 1.0)) / 0.9), lat: (b) => 0.16 * fl * Math.sin(22 * (t - 4.9)) * smooth((b - (LEN - 0.9)) / 0.8) });
  },
};

// ------------------------------------------------------------------------------------------------ slither (walk), turns
// One wave of the body: 2.6 u at the game's 1.5 u/s. The head rides low and forward and the neck carries the wave up to it. The
// page makes the wave: it lays the body along the winding line the Wyrm has travelled.
export const WAVE = { len: 2.6, amp: 0.2, v: 1.5 };
const WT = 104 / 60;
// The slither's neck is not reared: the first of it lies on along the floor, then it climbs to a head carried low and forward.
// Given as how steeply it climbs (kit/wyrm.mjs pitch), so it is always exactly as long as the neck: nothing folds.
const SLOPE = 0.62; export const WK = TAU * WAVE.amp / WAVE.len; // the steepest climb; the wave's steepest heading (rad)
const slPitch = (bob) => (s, Lf) => (SLOPE + bob) * smooth((s - 0.35) / 0.6) * (1 - 0.8 * smooth((s - (Lf - 0.75)) / 0.7));
const walk = {
  dur: WT, loop: true, gait: { v: WAVE.v / U },
  pose: (t) => { const w = TAU * t / WT; const fade = (s) => 1 - 0.7 * smooth((s - 0.9) / 1.3);
    return out(k({ cw: 1, ha: 0.75, nk: 1, hp: 0.3 + 0.03 * Math.sin(2 * w), hy: 0.05 * Math.sin(w + 1.5), hr: 0.04 * Math.sin(w), jaw: 0.05 }), { pitch: slPitch(0.03 * Math.sin(2 * w)), swing: (s) => WK * (Math.cos(w + TAU * s / WAVE.len) - Math.cos(w)) * fade(s) }); },
};
// A snake cannot turn on the spot: it travels round a small circle. The head leads into the turn and the neck curves that way.
const TT = 1.0;
const turn = (dir) => ({
  dur: TT, loop: true,
  pose: (t) => { const w = TAU * t / TT; return out(k({ cw: 1, ha: 0.75, nk: 1, hy: 0.3 * dir, hp: 0.3, hr: -0.1 * dir, jaw: 0.05 }), { pitch: slPitch(0.03 * Math.sin(2 * w)), swing: (s) => dir * (0.55 + 0.04 * Math.sin(w)) * smooth((s - 0.2) / 2.0) }); },
});

// ------------------------------------------------------------------------------------------------ Ash Breath
// draw (the 54-tick cone less one strike: it rears back and up, drawing more neck out, the jaw opening as it fills), strike (2.5
// frames: the head whips down over its own coil, jaw wide; the coil is given as a climb that leans back and curls over, so the
// mouth stays near the cone's point and the ash has the whole cone to cross), held (3 frames), pour (0.5 s from the strike: it
// sweeps the cone side to side, trembling), settle.
const BT = { draw: 54 / 60 - STRIKE, hit: 54 / 60 }; BT.held = BT.hit + HOLD; BT.pour = BT.hit + 0.5; BT.end = 1.95;
const brK = track([
  [0, k({})], [0.3, k({ Y: 2.05, Z: 0.25, hp: -0.15, jaw: 0.12, adv: 0.12, side: 0.1 })], [0.7, k({ Y: 2.38, Z: -0.12, hp: -0.36, jaw: 0.42, adv: 0.3, side: 0.2 })], [BT.draw, k({ Y: 2.42, Z: -0.18, hp: -0.4, jaw: 0.5, adv: 0.32, side: 0.22 })],
  [BT.hit, k({ cw: 1, ha: 0.75, nk: 1, hp: 0.2, jaw: 1, adv: 0.1 }), 'out'], [BT.held, k({ cw: 1, ha: 0.75, nk: 1, hp: 0.22, jaw: 1, adv: 0.1 })], [BT.pour, k({ cw: 1, ha: 0.75, nk: 1, hp: 0.18, jaw: 0.92, adv: 0.1 })],
  [BT.pour + 0.26, k({ Y: 1.78, Z: 1.0, hp: 0.1, jaw: 0.3, nk: 0.3, side: 0.1 })], [BT.end, k({})],
]);
const breath = {
  dur: BT.end, contact: [BT.hit], kinds: ['breath'], cues: { cone: [0, BT.hit], draw: [0.15, BT.draw], pour: [BT.hit, BT.pour] },
  phases: [['draw', 0], ['strike', BT.draw], ['held', BT.hit], ['pour', BT.held], ['settle', BT.pour]],
  pose: (t) => { const p = brK(t); const sw = pulse(t, BT.held, BT.held + 0.08, BT.pour - 0.05, BT.pour + 0.1) * Math.sin(TAU * (t - BT.held) / 0.46), tr = pulse(t, 0.45, 0.7, BT.draw - 0.02, BT.draw) + 0.7 * pulse(t, BT.hit, BT.held, BT.pour - 0.06, BT.pour);
    return out({ ...p, hy: p.hy + 0.21 * sw, X: p.X + 0.3 * sw + 0.012 * tr * Math.sin(70 * t), Y: p.Y + 0.012 * tr * Math.sin(83 * t), hr: p.hr - 0.06 * sw + 0.02 * tr * Math.sin(61 * t) },
      { pitch: (s) => (2.0 + 0.02 * tr * Math.sin(83 * t)) * smooth((s - 0.2) / 0.8) * (1 - 1.35 * smooth((s - 1.0) / 1.5)), swing: (s) => 0.3 * sw * smooth(s / 2.2) }); },
};

// ------------------------------------------------------------------------------------------------ Burrow Strike, part one: the dive
// It rears with a roar, then plunges: the head goes over in an arc and into the floor 2.8 u ahead, and the whole body pours along
// the same arc and down the same hole after it. The arc is fixed in space, so nothing slides.
const DIVE = { run: 0.9, rise: 0.6, top: 0.5, over: 1.4, up: 55 * PI / 180, down: -86 * PI / 180 };
const divePitch = (s) => { const a = s - DIVE.run; if (a <= 0) return 0; if (a < DIVE.rise) return DIVE.up * smooth(a / DIVE.rise); const b = a - DIVE.rise - DIVE.top; if (b <= 0) return DIVE.up; return lerp(DIVE.up, DIVE.down, smooth(b / DIVE.over)); };
const DV = { rear: 0.34, in: 0.6, end: 1.5 }; const DIVE_ADV = LEN - FRONT + 5.4; // every joint under the floor by the end
const dvK = track([[0, k({})], [0.2, k({ Y: 2.2, Z: 0.3, hp: -0.25, jaw: 0.5, adv: 0.15, side: 0.14 })], [DV.rear, k({ Y: 2.4, Z: 0.3, hp: -0.1, jaw: 0.75, adv: 0.3, side: 0.1 })], [DV.in, k({ Y: 2.0, Z: 0.9, hp: 0.5, jaw: 0.5, adv: 0.3, cw: 1, ha: 1, nk: 1 })], [DV.end, k({ Y: 2.0, Z: 0.9, hp: 0, jaw: 0.2, cw: 1, ha: 1, nk: 1 })]]);
const diveAdv = (t) => (t < DV.rear ? 0.3 * smooth(t / DV.rear) : 0.3 + (DIVE_ADV - 0.3) * EASE.in(clamp((t - DV.rear) / (DV.end - DV.rear))) * (2 - clamp((t - DV.rear) / (DV.end - DV.rear))) );
const burrow = {
  dur: DV.end, contact: [DV.in], kinds: ['dive'], cues: { roar: [0.1, DV.rear], pour: [DV.in, DV.end], hole: [DIVE.run + 1.86] }, sinks: true,
  phases: [['rear', 0], ['plunge', DV.rear], ['pours in', DV.in]],
  pose: (t) => { const p = dvK(t); return out({ ...p, adv: diveAdv(t), hp: t > DV.in ? 0 : p.hp }, { pitch: divePitch, under: true }); },
};

// ------------------------------------------------------------------------------------------------ Burrow Strike, part two: it comes up
// under (the whole 54-tick ring: the skull is 0.6 u under the floor and climbing, the page swells the floor; Kesh, 14 Nov: nothing
// shows until the ring is full), burst (on the ring's last frame the head breaks the floor and 3.3 u of it shoots straight up in
// 0.12 s, jaw wide), held, slump (it topples
// forward and sinks back 0.9 u), exposed (90 ticks from the burst: it lies along the floor, panting, the game's punish window),
// settle (it gathers itself back up).
const ET = { hit: 54 / 60 }; ET.seen = ET.hit; ET.top = ET.hit + 0.12; ET.held = ET.top + HOLD; ET.down = ET.held + 0.4; ET.up = ET.hit + 90 / 60; ET.end = 3.2;
const emLf = track([[0, { L: HIDE - 0.6 }], [ET.hit - 0.3, { L: HIDE - 0.25 }], [ET.hit, { L: HIDE }], [ET.top, { L: FRONT + 0.9 }, 'out'], [ET.held, { L: FRONT + 0.9 }], [ET.down, { L: FRONT }], [ET.end, { L: FRONT }]]);
const emFall = (t) => smooth((t - ET.held) / (ET.down - ET.held));
const emPitch = (t) => (s, Lf) => { const e = emFall(t); const col = PI / 2 - (50 * PI / 180) * smooth((s - (Lf - 1.3)) / 1.3); const lag = smooth(e * 1.7 - 0.7 * (s / Lf)); return col * (1 - lag); }; // the foot of the column falls first, the head last
const emerge = {
  dur: ET.end, contact: [ET.hit, ET.down], kinds: ['burst', 'slump'], cues: { ring: [0, ET.hit], seen: [ET.seen], exposed: [ET.down, ET.up] }, sinks: true,
  phases: [['under', 0], ['burst', ET.hit], ['held', ET.top], ['slump', ET.held], ['exposed', ET.down], ['settle', ET.up]],
  pose: (t) => {
    const L = emLf(t).L, up = smooth((t - ET.up) / (ET.end - ET.up - 0.1)), e = emFall(t), pant = pulse(t, ET.down, ET.down + 0.2, ET.up - 0.1, ET.up + 0.1), br = Math.sin(TAU * 2.2 * (t - ET.down));
    const roar = pulse(t, ET.hit - 0.15, ET.hit, ET.held, ET.down - 0.1);
    const p = k({ adv: L - FRONT, cw: 1 - up, ha: 1 - up, nk: 1 - up, jaw: 0.95 * roar + pant * (0.3 + 0.1 * br), hp: 0.25 * (1 - e) * roar + 0.02 * pant * br, hr: 0.3 * pant, X: 0.02 * up, Y: lerp(1.2, 1.75, up), Z: lerp(1.4, 0.55, up), hy: 0 });
    return out(p, { pitch: emPitch(t), a0: L < 0.05 ? PI / 2 : undefined, lift: (b) => 0.03 * pant * (1 + br) * bump(b, 1.3, 1.1) });
  },
};

// ------------------------------------------------------------------------------------------------ enrage (under half health)
// It rears to its full height, drawing neck out, and roars at the roof; the page lights the cracks down its body.
const ragK = track([[0, k({})], [0.3, k({ Y: 1.45, Z: 0.6, hp: 0.22, jaw: 0.1, nk: 0.1, side: 0.3 })], [0.5, k({ Y: 2.6, Z: 0.1, hp: -0.55, jaw: 1, adv: 0.5, side: 0.12 }), 'out'], [1.05, k({ Y: 2.66, Z: 0.06, hp: -0.6, jaw: 1, adv: 0.55, side: 0.12 })], [1.3, k({ Y: 2.0, Z: 0.4, hp: -0.1, jaw: 0.3, adv: 0.1 })], [1.5, k({})]]);
const enrage = {
  dur: 1.5, contact: [0.5], kinds: ['roar'], cues: { roar: [0.5, 1.05] }, phases: [['gather', 0], ['roar', 0.5], ['settle', 1.05]],
  pose: (t) => { const p = ragK(t); const tr = pulse(t, 0.5, 0.56, 1.0, 1.1); return out({ ...p, X: 0.02 * tr * Math.sin(75 * t), hr: 0.035 * tr * Math.sin(66 * t), hy: 0.03 * tr * Math.sin(58 * t), side: p.side + 0.03 * tr * Math.sin(40 * t) }); },
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const a = pulse(t, 0, 0.05, 0.1, 0.4), b = pulse(t, 0.14, 0.22, 0.26, 0.4); return out(k({ Y: 1.75 + 0.06 * a, Z: 0.55 - 0.3 * a + 0.06 * b, hp: 0.05 - 0.28 * a + 0.05 * b, hr: 0.16 * a, hy: -0.08 * a, jaw: 0.3 * a, side: 0.1 * a })); },
};
const hvK = track([[0, k({})], [0.07, k({ Y: 1.8, Z: 0.1, hp: -0.45, hr: 0.22, hy: -0.15, jaw: 0.55, side: 0.2 }), 'out'], [0.3, k({ Y: 1.86, Z: -0.22, hp: -0.6, hr: 0.3, hy: -0.22, jaw: 0.4, side: 0.34, adv: 0.1 })], [0.62, k({ Y: 1.72, Z: 0.8, hp: 0.22, hr: -0.1, hy: 0.1, jaw: 0.15, side: -0.2 })], [0.9, k({ Y: 1.8, Z: 0.6, hp: 0.0, hr: 0.03, jaw: 0.05, side: 0.05 })], [1.2, k({})]]);
const heavyHit = { dur: 1.2, contact: [0], kinds: ['taken'], phases: [['hit', 0], ['thrown back', 0.07], ['sways', 0.3], ['squares up', 0.9]], pose: (t) => out(hvK(t)) };

// ------------------------------------------------------------------------------------------------ spawn
// Grows from the floor in 7 frames (the game) with its head low, then rears into its stance with a short roar.
// It lies flat when it grows in, so its neck is given as a climb (a rear that leans back past upright, then curves forward to the head)
// that goes from nothing to full; then the neck settles onto the stance's own line.
const REAR = 1.9; const rearPitch = (e) => (s, Lf) => e * REAR * smooth((s - 0.2) / 0.9) * (1 - 0.75 * smooth((s - (Lf - 0.9)) / 0.8));
const spK = track([[0, k({ hp: 0.06, jaw: 0.1, ha: 1, nk: 1 })], [0.25, k({ hp: 0.03, jaw: 0.1, ha: 1, nk: 1 })], [0.7, k({ hp: -0.3, jaw: 0.85, adv: 0.15, ha: 0.3, nk: 0.3 }), 'out'], [1.0, k({ hp: -0.32, jaw: 0.85, adv: 0.15, ha: 0.3, nk: 0.3 })], [1.3, k({ hp: 0.08, jaw: 0.1 })], [1.5, k({})]]);
const spE = track([[0, { e: 0 }], [0.25, { e: 0.03 }], [0.7, { e: 1 }, 'out'], [1.0, { e: 1.03 }], [1.5, { e: 0.9 }]]);
const spawn = { dur: 1.5, scale: (t) => 0.05 + 0.95 * EASE.out(clamp(t / (7 / 60))), contact: [0.7], kinds: ['roar'], phases: [['grow', 0], ['rears', 0.25], ['stands', 1.0]],
  pose: (t) => out({ ...spK(t), cw: 1 - smooth((t - 1.0) / 0.45) }, { pitch: rearPitch(spE(t).e) }) };

// ------------------------------------------------------------------------------------------------ death
// It rears back from the blow, shudders while the cracks blaze, and falls: the neck goes down from its foot upward and the head
// lands last, on its side. The page then turns it to ash where it lies.
const DT = { fall: 1.15, down: 1.75 };
const dtK = track([[0, k({})], [0.1, k({ Y: 1.9, Z: -0.1, hp: -0.5, hr: 0.2, jaw: 0.8, side: 0.2 }), 'out'], [0.45, k({ Y: 2.25, Z: -0.2, hp: -0.6, hr: 0.1, jaw: 1, adv: 0.2, side: 0.25 })], [DT.fall, k({ Y: 2.2, Z: 0.0, hp: -0.3, hr: -0.1, jaw: 0.7, adv: 0.2, side: 0.1 })], [DT.down, k({ Y: 0.4, Z: 2.3, hp: 0, hr: 0.75, jaw: 0.35, adv: 0.2, cw: 1, ha: 1, nk: 1 })], [3.0, k({ Y: 0.4, Z: 2.3, hp: 0, hr: 0.8, jaw: 0.4, adv: 0.2, cw: 1, ha: 1, nk: 1 })]]);
const death = {
  dur: 3.0, contact: [DT.down], kinds: ['thud'], cues: { blaze: [0.3, DT.fall], ash: [DT.down + 0.15, 3.0] }, phases: [['hit', 0], ['shudders', 0.45], ['falls', DT.fall], ['ash', DT.down]],
  pose: (t) => { const p = dtK(t); const sh = pulse(t, 0.4, 0.55, DT.fall - 0.1, DT.fall + 0.1), e = smooth((t - DT.fall) / (DT.down - DT.fall));
    const pitch = (s, Lf) => { const lag = smooth(e * 1.6 - 0.6 * (s / Lf)); return (1 - lag) * (0.9 + 0.5 * Math.sin(PI * s / Lf)) * 0.9; };
    return out({ ...p, X: 0.03 * sh * Math.sin(64 * t), hr: p.hr + 0.05 * sh * Math.sin(51 * t), side: p.side + 0.05 * sh * Math.sin(37 * t), cw: e, ha: e }, { pitch }); },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), breath, burrow, emerge, enrage, hurt, heavyHit, spawn, death };
