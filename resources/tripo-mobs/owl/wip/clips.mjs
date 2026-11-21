// The Shriek Owl's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/owl.js (glides 1.5 u up at 2.4 u/s keeping 3.2 to 5.2 u from its target;
// within 4.2 u it hangs and shrieks: an Ember cone r 3.8, half-angle 30 degrees, telegraphed 54 ticks, 8 damage and a
// 35% slow for 1.5 s; cooldown 230 ticks) and its rig src/render/enemies/facet/owl.js (the glide's beat 5.2 rad/s in
// bursts, the hang's tread 13 rad/s, the bob, the bank and lean from travel; the shriek on SHRIEK_TL: rise 12 ticks,
// gather, strike 3 frames onto the resolve tick, contact 4 frames, recoil 3, settle 12; poses HANG, COIL, SHRIEK,
// RECOIL). Its pose fields are copied key for key and mapped onto this rig in fly() below.
import { V3, smooth, lerp, clamp, addPose, EASE, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'owl', unit: 1.7, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['head', 'h']],
  extras: [['tail', 't'], ['armL', 'aL'], ['handL', 'nL'], ['armR', 'aR'], ['handR', 'nR'], ['legL', 'lL'], ['talL', 'cL'], ['legR', 'lR'], ['talR', 'cR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['head', 'hd'], ['tail', ['tsx', 'tsy', 'tsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOVER = 1.5;
const HOV = HOVER / U - 0.42; // the hips (the body's middle) ride at the game's 1.5 u
const WING0 = 0.6; // this model's wings rest raised about 0.6 rad above the game's glide (its HANG's raise)
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const ease = { out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, inOut: (k) => k * k * (3 - 2 * k) };
const settle = (k) => (k <= 0 ? 1 : k >= 1 ? 0 : (1 - k) * (1 - k) * (1 - 2.6 * k));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, sx: 1, sy: 1, sz: 1, hz: 0, hy: 0, hp: 0, disc: 1, beak: 0.1, flap: 0.18, sweep: 0, fold: 0, twist: 0, amp: 1, tread: 0, talon: 0, tail: 0, tailP: 0, pupil: 1, glow: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const HANG = K({ lift: 0.12, pitch: -0.22, sx: 1.03, sy: 1.03, sz: 1.04, hz: -0.02, hp: -0.1, disc: 1.12, beak: 0.18, flap: 0.55, sweep: 0.35, fold: -0.1, twist: 0.15, amp: 0.8, tread: 1, talon: 0.25, tail: 0.7, tailP: -0.25, pupil: 1.5, glow: 0.2 });
const COIL = K({ lift: 0.16, pitch: -0.38, sx: 1.08, sy: 1.07, sz: 1.12, hz: -0.06, hy: 0.02, hp: -0.32, disc: 1.3, beak: 0.3, flap: 0.85, sweep: 0.6, fold: -0.2, twist: 0.3, amp: 0.3, tread: 1, talon: 0.5, tail: 1, tailP: -0.32, pupil: 1.8, glow: 0.4 });
const SHRIEK = K({ lift: 0.08, push: 0.06, pitch: 0.32, sx: 1.19, sy: 0.91, sz: 1, hz: 0.1, hy: -0.02, hp: 0.3, disc: 1.38, beak: 0.95, flap: -0.4, sweep: -0.3, fold: 0.1, twist: -0.25, amp: 0, tread: 1, talon: -0.55, tail: 0.8, tailP: 0.2, pupil: 1.5, glow: 0.7 });
const RECOIL = K({ lift: 0.13, push: -0.07, pitch: -0.14, sx: 0.95, sy: 1.06, sz: 1, hz: -0.02, hp: -0.1, disc: 1.15, beak: 0.35, flap: 0.45, sweep: 0.1, fold: 0.3, twist: 0.2, amp: 0, tread: 0.6, talon: 0.1, tail: 0.5, tailP: -0.1, pupil: 1.2, glow: 0.3 });
const lerpF = (a, b, k) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * k; return o; };

// the beat: the glide's 5.2 rad/s rounded to a 1.2 s beat, the hang's tread 13 rad/s; the glide's bursts (the game's
// hold, 0.2 to 1 of the beat) on a 6 s cycle (the game's 7.9 s), so the loops close
const W_GLIDE = TAU / 1.2, W_TREAD = 13;
const GLIDE_AMP = 0.5, TREAD_AMP = 0.3;
const glideHold = (t) => 0.2 + 0.8 * smooth((Math.sin(TAU * t / 6) + 0.3) / 0.8);
// The game's pose on this rig. ph: the beat's phase; o: lean (nose down), roll (bank: + its left side up), effort,
// sweepAdd, swingF/swingS (the legs and tail trailing), look (the head's yaw), hold (the glide's burst).
function fly(g, t, ph, o = {}) {
  const tread = clamp(g.tread, 0, 1);
  const A = Math.max(0, g.amp) * (GLIDE_AMP * (o.hold ?? 1) * (1 - tread) + TREAD_AMP * tread) * (o.effort ?? 1);
  const sn = Math.sin(ph), cs = Math.cos(ph);
  const flap = g.flap + A * sn - WING0; // relative to this model's raised wings (the game's 0.6)
  const sweep = g.sweep + (o.sweepAdd || 0);
  const twist = g.twist + 0.3 * A * cs, fold = g.fold + 0.55 * A * Math.max(0, cs), wOut = -0.55 * A * cs;
  const bob = (o.bob ?? 1) * (0.06 * Math.sin(TAU * t / 3) * (1 - 0.7 * tread) + 0.02 * A * Math.cos(ph - 0.6));
  const breath = Math.sin(TAU * t / 3);
  const sf = o.swingF || 0, ss = o.swingS || 0;
  return {
    oy: (o.oy ?? HOV) + (g.lift + bob) / U, oz: g.push / U,
    bp: -(g.pitch + (o.lean || 0)), br: o.roll || 0, by: o.yaw || 0,
    qsx: g.sx - 1, qsy: g.sy * (1 + 0.012 * breath) - 1, qsz: g.sz - 1,
    hp: -g.hp, hy: o.look || 0, hr: -0.35 * (o.look || 0), hd: 0.3 * (g.disc - 1),
    aLr: flap, aRr: -flap, aLy: sweep, aRy: -sweep, aLp: twist, aRp: twist,
    nLy: fold, nRy: -fold, nLr: wOut, nRr: -wOut,
    tp: -(g.tailP - 0.25 * Math.min(0, o.fwd || 0)), ty: -0.5 * (o.roll || 0), tr: 0.3 * (o.roll || 0), tsx: 0.35 * (g.tail + 0.5 * Math.max(0, -(o.fwd || 0))),
    lLp: -(g.talon + sf), lRp: -(g.talon + sf), lLr: ss, lRr: ss, cLp: -0.4 * (g.talon + sf), cRp: -0.4 * (g.talon + sf),
  };
}
// the phase of the beat: integrated over a clip from a function of t giving the tread (0 glide .. 1 hang)
function phaseTable(dur, treadOf, ph0 = 0) {
  const n = Math.ceil(dur * 600) + 2, tab = new Float64Array(n); let ph = ph0;
  for (let i = 0; i < n; i++) { tab[i] = ph; const tr = clamp(treadOf(i / 600), 0, 1); ph += (W_GLIDE + (W_TREAD - W_GLIDE) * tr) / 600; }
  return (t) => { const f = t * 600, i = Math.min(n - 2, Math.floor(f)); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); };
}

// ------------------------------------------------------------------------------------------------ idle (the glide)
// 6 s. The game's glide: bursts of slow beats with the wings held out between them, the bob and the breath, a slow
// look round (a hunter scanning). The owl never lands.
const idle = {
  dur: 6, loop: true,
  pose: (t) => fly(REST, t, W_GLIDE * t, { hold: glideHold(t), look: 0.22 * Math.sin(TAU * t / 6) }),
  feet: () => ({}),
};
// ------------------------------------------------------------------------------------------------ glide forward
// The game's flight at 2.4 u/s: nose down 0.13, the wings swept 0.12 back and beating harder (effort 1.35), the
// talons and tail trailing.
const walk = {
  dur: 6, loop: true, gait: { T: 6, duty: 0, v: 2.4 / U },
  pose: (t) => fly(REST, t, W_GLIDE * t, { hold: glideHold(t), lean: 0.13, effort: 1.35, sweepAdd: 0.12, swingF: 0.45, fwd: 1, look: 0.1 * Math.sin(TAU * t / 6) }),
  feet: () => ({}),
};
// The game turns it at once and banks into the turn; mine: 180 degrees a second, banked, the head leading.
const turn = (dir) => ({
  dur: 1.2, loop: true, gait: { T: 1.2, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => fly(REST, t, W_GLIDE * t, { hold: 1, roll: 0.07 * 3 * 0.3 * dir * 1.5, look: 0.3 * dir, swingS: -0.15 * dir, bob: 0 }),
  feet: () => ({}),
});

// ------------------------------------------------------------------------------------------------ the shriek
const RISE = 12 / 60, TEL = 54 / 60, STRIKE = 3 * FR, CONTACT = 4 * FR, RECOIL_S = 3 * FR, SETTLE = 12 * FR;
const S0 = TEL - STRIKE, POST = CONTACT + RECOIL_S + SETTLE;
const strikeEase = (k) => k * (0.6 + 0.4 * k);
function shriekPose(t) {
  if (t < RISE) return lerpF(REST, HANG, ease.out(t / RISE));
  if (t < S0) return lerpF(HANG, COIL, ease.inOut((t - RISE) / (S0 - RISE)));
  if (t < TEL) return lerpF(COIL, SHRIEK, strikeEase((t - S0) / STRIKE));
  let pt = t - TEL;
  if (pt < CONTACT) { const o = { ...SHRIEK }; const fade = 1 - 0.5 * (pt / CONTACT); o.hp += 0.04 * Math.sin(pt * 95) * fade; o.disc *= 1 + 0.03 * Math.sin(pt * 77 + 1) * fade; return o; }
  pt -= CONTACT;
  if (pt < RECOIL_S) return lerpF(SHRIEK, RECOIL, ease.out(pt / RECOIL_S));
  pt -= RECOIL_S;
  return lerpF(REST, RECOIL, settle(Math.min(1, pt / SETTLE)));
}
const SH_DUR = TEL + POST + 0.4;
const shPh = phaseTable(SH_DUR, (t) => shriekPose(t).tread);
const shriek = {
  dur: SH_DUR, contact: [TEL],
  phases: [['rise into the hang', 0], ['gather: head back, disc and wings flare, chest swells', RISE], ['strike: wings drive down, head snaps out', S0], ['shriek: beak wide (contact)', TEL], ['recoil: braking upstroke', TEL + CONTACT], ['settle into the glide', TEL + CONTACT + RECOIL_S], ['glide', TEL + POST]],
  pose: (t) => fly(shriekPose(t), t, shPh(t), { hold: 1 }),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the head jolts back, the body flinches, the wings stutter up, the tail flicks.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = track([[0, { a: 0 }], [0.05, { a: 1 }, 'out'], [0.17, { a: -0.25 }], [0.4, { a: 0 }]])(t).a;
    return { oy: HOV, hp: 0.3 * k, hr: 0.12 * k, bp: 0.12 * k, aLr: 0.25 * k, aRr: -0.25 * k, aLp: 0.2 * k, aRp: 0.2 * k, nLy: 0.25 * k, nRy: -0.25 * k, tp: 0.3 * k, qsx: 0.04 * k, qsy: -0.04 * k }; },
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over (from the floor, as the game's spawn node). Mine on top:
// a mantling flare of the wings and the disc, then into the glide.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grow in', 0], ['wings flare', 7 * FR], ['glide', 0.8]],
  pose: (t) => { const fl = pulse(t, 0.2, 0.4, 0.55, 0.85); const g = K({ flap: 0.18 + 0.45 * fl, sweep: -0.2 * fl, disc: 1 + 0.25 * fl, tail: 0.8 * fl, lift: 0.05 * fl, hp: -0.15 * fl }); return fly(g, t, W_GLIDE * t, { hold: 1 }); },
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). The beat stops, it drops out of the air turning onto its back, lands
// with the wings spread flat on the floor and the talons curled up. LOW: the lowest point of the body for a backward tip
// a (every 0.1 rad), measured with a probe clip, so it lies on the floor, not in it.
const LOW = [0.0, -0.003, -0.001, 0.004, 0.014, 0.028, 0.046, 0.067, 0.092, 0.121, 0.152, 0.186, 0.216, 0.247, 0.279, 0.312, 0.346];
const lowAt = (a) => { const f = clamp(a / 0.1, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const DROP = 0.55, TIP = 1.55;
const death = {
  dur: 2.2, contact: [DROP], phases: [['hit', 0], ['falls', 0.06], ['lands', DROP], ['lies still', 0.9]],
  pose: (t) => {
    const k = c01((t - 0.06) / (DROP - 0.06));
    const a = TIP * ease.inOut(c01((t - 0.06) / (DROP - 0.06))) + 0.05 * bump(t, DROP + 0.08, 0.16);
    const land = -lowAt(a);
    const oy = lerp(HOV, land, k * k) + 0.03 * Math.max(0, Math.sin(Math.PI * (t - DROP) / 0.16)) * (t > DROP && t < DROP + 0.16 ? 1 : 0);
    const g = K({ flap: 0.18 + 0.12 * smooth(t / 0.4), sweep: -0.45 * smooth(t / 0.45), amp: 1 - smooth(t / 0.15), talon: -0.8 * smooth((t - 0.3) / 0.5), tail: 0.5, disc: 1 - 0.05 * smooth(t), pupil: 0.6 });
    const o = fly(g, t, W_GLIDE * t, { hold: 1, oy, bob: 0 });
    o.bp = a; o.hp = -0.3 * smooth((t - 0.5) / 0.4); o.hr = 0.3 * smooth((t - 0.5) / 0.4);
    return o;
  },
  feet: () => ({}),
};
// The probe: tips it back 0..1.6 rad in 0.1 steps, the hips at their rest height (oy 0), the wings as in death.
const probe = {
  dur: 16 / 30,
  pose: (t) => { const o = fly(K({ flap: 0.3, sweep: -0.45, amp: 0, talon: -0.8, tail: 0.5 }), 0, 0, { oy: 0, bob: 0 }); o.bp = Math.round(t * 30) * 0.1; return o; },
  feet: () => ({}),
};

export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), shriek, hurt, spawn, death };
