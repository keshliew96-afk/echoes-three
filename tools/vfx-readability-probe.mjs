#!/usr/bin/env node
// VFX READABILITY probe (docs/VFX_READABILITY.md) — headless Node, no browser.
//
//   node tools/vfx-readability-probe.mjs
//
// Kesh (2026-10-21): "for some time the light effect too bright, player
// cannot see clearly". The cause was the template hearts (the hot cores of
// the blade/magic/sci-fi pieces) summing without bound at a melee kill. This
// checks the two rules that bound them (src/render/vfx/heart.js):
//   1. Every template core, at every gain the kit uses, lands at or under
//      HEART_MAX linear luminance and still above the bloom threshold (one
//      piece keeps its hot core and still blooms).
//   2. The hearts within 2 u share HEART_BUDGET: a melee kill's stack (three
//      swing arcs, the swing tip, the impact and the kill blast at one point
//      in one tick) sums to under 2.0 heart-luminance, against about 4.9
//      before, and the first piece at a point keeps its whole heart.
//   3. The wiring: every heart piece in tplkit.js (beam, blaze, blast, head)
//      goes through setHeart(), every core mix in the four shaders is scaled
//      by uHeart, and no piece still multiplies its core by a raw gain.
// The look itself is checked in the game by tools/vfx-readability-browser.mjs.
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info ? `  ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const mod = (p) => import(pathToFileURL(join(here, p)).href);
const { HEART_MAX, HEART_BUDGET, HEART_FLOOR, heartColor, heartShare, heartHot, lum } = await mod('src/render/vfx/heart.js');
const { BLOOM } = await mod('src/render/stage.js');
const { exactColor } = await mod('src/render/critters/common.js');
const { VFX_TEMPLATES } = await mod('src/data/vfx.js');
const { VFX_FOE } = await mod('src/data/palette.js');

// --- 1. the cap: every template core at every gain the kit uses
const GAINS = { beam: 1.15, afterimage: 1.1, ring: 1.2, blaze: 1.25, swing: 1.35, blast: 1.3, head: 1.3 };
const cores = [];
for (const [id, t] of Object.entries(VFX_TEMPLATES)) cores.push([`hero ${id}`, t.core]);
for (const [id, t] of Object.entries(VFX_FOE)) cores.push([`foe ${id}`, t.core ?? t.star]);
let worstRaw = 0;
let capped = 0;
let dull = [];
let over = [];
for (const [name, hex] of cores) {
  const c = exactColor(hex).toArray();
  for (const [g, gain] of Object.entries(GAINS)) {
    const raw = lum(c[0] * gain, c[1] * gain, c[2] * gain);
    worstRaw = Math.max(worstRaw, raw);
    const h = heartColor(c, gain);
    const l = lum(h[0], h[1], h[2]);
    if (raw > HEART_MAX) capped++;
    if (l > HEART_MAX + 1e-6) over.push(`${name} ${g} ${l.toFixed(3)}`);
    if (!heartHot(h)) dull.push(`${name} ${g} ${l.toFixed(3)}`);
  }
}
check(`cap: every core at every gain is at most ${HEART_MAX} linear (worst before the cap ${worstRaw.toFixed(2)}, ${capped} of ${cores.length * Object.keys(GAINS).length} capped)`, over.length === 0, over.length ? { over } : '');
check(`cap: every heart still clears the bloom threshold ${BLOOM.threshold} on its own`, dull.length === 0, dull.length ? { dull } : '');
check('cap: the blade core at the blast gain was above the cap before (the old 1.6 heart)', lum(...exactColor(VFX_TEMPLATES.blade.core).toArray().map((x) => x * GAINS.blast)) > 1.5);

// --- 2. the budget: a melee kill's stack at one point in one tick
const STACK = [
  ['swing arc', 1.0],
  ['swing afterimage', 0.5],
  ['swing afterimage', 0.35],
  ['swing tip blast', 1.0],
  ['impact blast', 1.0],
  ['kill blast', 1.0],
];
let sum = 0;
const shares = [];
for (const [name, op] of STACK) {
  const load = HEART_MAX * op;
  const share = heartShare(sum, load);
  shares.push(`${name} ${share.toFixed(2)}`);
  sum += load * share;
}
const before = STACK.reduce((a, [, op]) => a + 1.6 * op, 0);
check(`budget: the kill stack sums to ${sum.toFixed(2)} heart-luminance (before: ${before.toFixed(2)}), under 2.0`, sum < 2.0, shares.join(', '));
check('budget: the first piece at a point keeps its whole heart', heartShare(0, HEART_MAX) === 1);
check(`budget: a piece never drops under the floor ${HEART_FLOOR}`, heartShare(99, 1) === HEART_FLOOR && heartShare(HEART_BUDGET, 1) === HEART_FLOOR);
check('budget: the second heart at a point gets what is left', Math.abs(heartShare(1.0, 1.0) - (HEART_BUDGET - 1.0)) < 1e-9);

// --- 3. the wiring in tplkit.js
const src = readFileSync(join(here, 'src/render/vfx/tplkit.js'), 'utf8');
const count = (re) => (src.match(re) || []).length;
check('wiring: beam, blaze, blast and head set their heart through setHeart()', count(/setHeart\(s, o, o\.core/g) === 4, { calls: count(/setHeart\(s, o, o\.core/g) });
const mixes = src.match(/mix\( [^\n]*uCore \* uGain[^\n]*\)/g) || [];
check('wiring: every core mix in the shaders is scaled by uHeart', mixes.length === 9 && mixes.every((m) => m.includes('uHeart')), { mixes: mixes.length, scaled: mixes.filter((m) => m.includes('uHeart')).length });
check('wiring: the four heart shaders declare uHeart', count(/uniform float uHeart;/g) === 4);
check('wiring: no piece multiplies its core by a raw gain any more', count(/u\.uGain\.value = o\.gain/g) === 0);
check('wiring: the heart pools are the beams, blazes, blasts and heads', /heartPools = \[beams, blazes, blasts, heads\]/.test(src));

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall pass');
process.exit(fails.length ? 1 : 0);
