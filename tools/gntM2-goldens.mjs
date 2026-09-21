#!/usr/bin/env node
// G2.10 — the 9 W2-end Node golden traces (kill_all / defend / run x seeds
// 1-3, 3600 ticks, script 3) recorded by M2 BEFORE its first edit
// (captures/gnt-M2-golden-<mode>-<seed>.json, from `git archive 9246562`)
// must be bit-identical on the working tree.  node tools/gntM2-goldens.mjs
import { execFileSync } from 'node:child_process';
const rows = [];
let ok = true;
for (const m of ['kill_all', 'defend', 'run']) {
  for (const s of [1, 2, 3]) {
    let out = '';
    let match = false;
    try {
      out = execFileSync(process.execPath, ['tools/gnt-arch-simtrace.mjs', '--mode', m, '--ticks', '3600', '--seed', String(s), '--script', '3', '--golden', `captures/gnt-M2-golden-${m}-${s}.json`], { encoding: 'utf8' });
      match = /GOLDEN MATCH/.test(out);
    } catch (err) {
      out = String(err.stdout || err.message);
    }
    const j = JSON.parse(out.split('\n')[0]);
    rows.push({ mode: m, seed: s, match, eventsHash: j.eventsHash, stateHash: j.stateHash });
    if (!match) ok = false;
  }
}
console.log(JSON.stringify({ gate: 'G2.10', ok, matched: rows.filter((r) => r.match).length, of: rows.length, rows }, null, 1));
process.exit(ok ? 0 : 1);
