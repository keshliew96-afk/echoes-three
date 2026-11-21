// Bramble's moves (the Peddler, an NPC: no walk, no attacks). Units are model units (the page draws it CFG.unit times
// bigger). Timings come from the game's rig, src/render/npcs/peddler.js: a slow breath (1 rad a second) the body swells
// with; the neck slowly reaching out and drawing back in (0.8 rad a second), and every 5-9 s a peek further out, held
// 2.8 s (eased over 0.5 s), the head turning to one side and tipping its chin up; a blink every 3-6 s (0.2 s); the
// lantern and the hanging wares swaying; and talking (eased in and out at 8 a second by src/render/npcs/index.js): the
// jaw working (0.4 rad on an 11 rad/s beat) and the head nodding (6 rad/s).
import { V3, smooth, clamp } from '../../mobs/kit/quad.mjs';
export const CFG = {
  name: 'bramble', unit: 1.25, base: {},
  chain: [['hips', 'b']],
  extras: [['neck', 'n'], ['head', 'h'], ['jaw', 'j'], ['lantern', 'l'], ['herbL', 'gL'], ['herbR', 'gR']],
  scales: [['hips', ['bsx', 'bsy', 'bsz']], ['eyeL', ['exL', 'eyL', 'ezL']], ['eyeR', ['exR', 'eyR', 'ezR']]],
  legs: {}, springs: [],
};
const U = CFG.unit, TAU = 2 * Math.PI;
const none = () => ({});
const held = (s, d, e) => (s < 0 || s > d ? 0 : smooth(Math.min(1, s / e, (d - s) / e)));
// w: the loop's angular rates, each a whole number of turns in the loop so it closes
function tortoise(t, w, o = {}) {
  const br = Math.sin(w.br * t), out = 0.5 + 0.5 * Math.sin(w.out * t), pk = o.peek || 0, pr = o.pr ?? 0.5, talk = o.talk || 0, lid = o.lid || 0;
  return {
    bsx: 0.008 * br, bsy: 0.012 * br, bsz: 0.008 * br,
    hb: (0.035 * out + 0.06 * pk) / U,
    np: 0.05 * out + 0.12 * pk - 0.1 * talk * Math.max(0, Math.sin(w.nod * t)), ny: (pr - 0.5) * 0.6 * pk,
    hr: (pr - 0.5) * 0.3 * pk, hp: 0.08 * pk,
    jp: -0.4 * talk * Math.max(0, Math.sin(w.chat * t)),
    eyL: -0.85 * lid, eyR: -0.85 * lid,
    lr: 0.16 * Math.sin(w.lz * t) + 0.04 * Math.sin(w.lz2 * t), lp: -0.08 * Math.sin(w.lx * t + 1.2),
    gLr: 0.1 * Math.sin(w.lz * t + 0.7), gLp: -0.06 * Math.sin(w.hx * t), gRr: 0.1 * Math.sin(w.lz * t + 1.4), gRp: -0.06 * Math.sin(w.hx * t + 1),
  };
}
// ------------------------------------------------------------------------------------------------ idle
// One loop of 31.4 s holds whole turns of every slow wave (the breath five, the neck four; the lantern's sway rounded
// to the nearest whole turn). The game rolls its peeks and blinks; the page fixes four peeks (two to each side) and
// eight blinks in the loop.
const ID = 1885 / 60, iw = (n) => TAU * n / ID;
const IW = { br: iw(5), out: iw(4), lz: iw(6), lz2: iw(16), lx: iw(5), hx: iw(5), nod: 0, chat: 0 };
const PEEKS = [[3, 0.2], [11, 0.8], [19, 0.35], [26.5, 0.65]];
const BLINKS = [1.5, 5.2, 9.8, 13.9, 17.5, 22.6, 27.4, 30.3];
const idle = {
  dur: ID, loop: true, feet: none,
  pose: (t) => { let peek = 0, pr = 0.5; for (const [a, r] of PEEKS) { const k = held(t - a, 2.8 + 1.0, 0.5); if (k > peek) { peek = k; pr = r; } }
    const lid = Math.max(...BLINKS.map((a) => held(t - a, 0.2, 0.07)));
    return tortoise(t, IW, { peek, pr, lid }); },
};
// ------------------------------------------------------------------------------------------------ talk
const TD = 377 / 60, tw = (n) => TAU * n / TD;
const TW = { br: tw(1), out: tw(1), lz: tw(1), lz2: tw(3), lx: tw(1), hx: tw(1), nod: tw(6), chat: tw(11) };
const talk = {
  dur: TD, contact: [], feet: none,
  phases: [['speaks a line', 0], ['the line ends', TD - 0.4]],
  pose: (t) => { const k = Math.min(1 - Math.exp(-8 * t), 1 - Math.exp(-8 * (TD - t))); return tortoise(t, TW, { talk: k }); },
};
const still = (dur) => ({ dur, loop: true, feet: none, pose: () => ({}) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), talk, hurt: { dur: 0.4, upperOnly: true, feet: none, pose: () => ({}) }, spawn: { dur: 0.5, contact: [], feet: none, pose: () => ({}) }, death: { dur: 0.5, contact: [], feet: none, pose: () => ({}) } };
