#!/usr/bin/env node
// SHOT STAMP probe (tools/shot-stamp.mjs, docs/TESTING.md "Shot stamps"),
// headless. Stamps a scratch file under captures/, then checks that an
// unchanged file reads fresh (exit 0), an edited one CHANGED (exit 1), a
// deleted one GONE (exit 1), and a file outside the repo is refused (exit 2).
//
//   node tools/shot-stamp-probe.mjs
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tool = join(root, 'tools/shot-stamp.mjs');
const work = join(root, 'captures/shot-stamp-probe');
const shots = join(work, 'shots');
const file = join(work, 'proved.js');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
writeFileSync(file, 'export const a = 1;\n');

const fails = [];
const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
const expect = (what, r, status, re) => {
  const ok = r.status === status && re.test(r.stdout);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : ` (exit ${r.status}: ${r.stdout.trim()})`}`);
  if (!ok) fails.push(what);
};

expect('stamp records the file', run('stamp', shots, 'captures/shot-stamp-probe/proved.js'), 0, /stamped 1 files/);
expect('an unchanged file reads fresh', run('check', shots), 0, /same\s+captures\/shot-stamp-probe\/proved\.js[\s\S]*fresh/);
writeFileSync(file, 'export const a = 2;\n');
expect('an edited file reads CHANGED and the shots STALE', run('check', shots), 1, /CHANGED captures\/shot-stamp-probe\/proved\.js[\s\S]*STALE/);
rmSync(file);
expect('a deleted file reads GONE', run('check', shots), 1, /GONE\s+captures\/shot-stamp-probe\/proved\.js/);
const outside = mkdtempSync(join(tmpdir(), 'shot-stamp-'));
writeFileSync(join(outside, 'x.js'), '1');
expect('a file outside the repo is refused', run('stamp', shots, join(outside, 'x.js')), 2, /outside the repo/);
expect('stamp with no files is refused', run('stamp', shots), 2, /name the files/);
rmSync(outside, { recursive: true, force: true });
rmSync(work, { recursive: true, force: true });

if (fails.length) {
  console.log(`FAIL shot stamp: ${fails.length} checks`);
  process.exit(1);
}
console.log('PASS shot stamp');
