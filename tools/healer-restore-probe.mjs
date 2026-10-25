#!/usr/bin/env node
// HEALER RESTORE probe (v0.5.331) — headless Node, reads the code; no browser.
// Kesh asked for the original healer back and the Blender mouse model removed:
//   1. critters/index.js builds the Healer from the procedural rig (healer.js)
//      through the plain BUILDERS table, with no model switch.
//   2. The mouse model's files are gone: its rig code, its .glb, its probes,
//      its Blender script and its doc; nothing under src/ or tools/ imports it.
//   3. The game no longer waits on a model load before the first scene.
//
//   node tools/healer-restore-probe.mjs
// Exit code 1 on any failure.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const read = (p) => readFileSync(join(here, p), 'utf8');

// --- 1. the builder
const idx = read('src/render/critters/index.js');
check('the Healer is built by the procedural rig', /healer:\s*buildHealer/.test(idx) && /const build = BUILDERS\[classId\]/.test(idx));
check('no model switch is left in the critter factory', !/clipDriven|healerBuilder|HEALER_MODEL/.test(idx));

// --- 2. the files
const gone = ['src/render/critters/mousehealer.js', 'src/assets/heroes/mousehealer.glb', 'tools/mouse-healer-probe.mjs', 'tools/mouse-healer-browser.mjs', 'tools/blender/mousehealer_footlock.py', 'docs/MOUSE_HEALER.md'];
for (const f of gone) check(`removed: ${f}`, !existsSync(join(here, f)));
const hits = [];
const walk = (dir) => {
  for (const name of readdirSync(join(here, dir))) {
    const p = `${dir}/${name}`;
    if (statSync(join(here, p)).isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(name) && p !== 'tools/healer-restore-probe.mjs' && /mousehealer|mouse-healer|MOUSE_HEALER/i.test(read(p))) hits.push(p);
  }
};
walk('src');
walk('tools');
check('nothing under src/ or tools/ names the mouse model', hits.length === 0, hits);

// --- 3. startup
check('the game does not wait on a hero model before the first scene', !/preloadMouseHealer/.test(read('src/main.js')));

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
