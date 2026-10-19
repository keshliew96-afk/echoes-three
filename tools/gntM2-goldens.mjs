#!/usr/bin/env node
// G2.10 — the 9 Node golden traces (kill_all / defend / run x seeds 1-3,
// 3600 ticks, script 3) must be bit-identical on the working tree.
//
//   node tools/gntM2-goldens.mjs            compare against tools/goldens.json
//   node tools/gntM2-goldens.mjs --record   rewrite tools/goldens.json from this tree
//   node tools/gntM2-goldens.mjs --captures compare against the old per-machine
//                                           captures/gnt-M2-golden-<mode>-<seed>.json
//
// tools/goldens.json is committed, so a fresh clone checks against the same
// hashes every slice has kept since M2 (first recorded from `git archive
// 9246562`). Record it only when a change is meant to move the legacy run.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FILE = 'tools/goldens.json';
const KEEP = ['tick', 'events', 'eventsHash', 'stateHash', 'rngDraws'];
const record = process.argv.includes('--record');
const captures = process.argv.includes('--captures');
const table = record || captures ? {} : JSON.parse(readFileSync(FILE, 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'goldens-'));
const rows = [];
let ok = true;
for (const m of ['kill_all', 'defend', 'run']) {
  for (const s of [1, 2, 3]) {
    const key = `${m}-${s}`;
    const args = ['tools/gnt-arch-simtrace.mjs', '--mode', m, '--ticks', '3600', '--seed', String(s), '--script', '3'];
    if (captures) args.push('--golden', `captures/gnt-M2-golden-${key}.json`);
    else if (!record) {
      const f = join(tmp, `${key}.json`);
      writeFileSync(f, JSON.stringify(table[key]));
      args.push('--golden', f);
    }
    let out = '';
    try {
      out = execFileSync(process.execPath, args, { encoding: 'utf8' });
    } catch (err) {
      out = String(err.stdout || err.message);
    }
    const j = JSON.parse(out.split('\n')[0]);
    const match = record || /GOLDEN MATCH/.test(out);
    if (record) table[key] = Object.fromEntries(KEEP.map((k) => [k, j[k]]));
    rows.push({ mode: m, seed: s, match, eventsHash: j.eventsHash, stateHash: j.stateHash });
    if (!match) ok = false;
  }
}
rmSync(tmp, { recursive: true, force: true });
if (record) writeFileSync(FILE, JSON.stringify(table, null, 1) + '\n');
console.log(JSON.stringify({ gate: 'G2.10', ok, recorded: record || undefined, matched: rows.filter((r) => r.match).length, of: rows.length, rows }, null, 1));
process.exit(ok ? 0 : 1);
