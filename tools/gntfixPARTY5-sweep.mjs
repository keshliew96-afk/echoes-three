#!/usr/bin/env node
// gntfixPARTY5-sweep — GP.13 (d) tuning sweep (party critic r5 F9). Runs the CAMPAIGN runner
// (tools/gntCAMPAIGN-camprun.mjs, read-only) on a scratch checkout whose src reads env knobs, for several
// knob sets in parallel, and prints per start level / level: reached, cleared, wiped, seeds with >= 1 down
// (seeds 1-5 and all), downs by room kind (combat / stag), median party damage per combat room and in the
// Stag room. Usage:
//   node tools/gntfixPARTY5-sweep.mjs --root <proto> --seeds 1-10 --from 1,2 --par 4 --sets 'A:STAGDMG1=3;B:STAGDMG1=3.5,STAGDMG2=2'
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOT = opt('root');
const SEEDS = opt('seeds', '1-10');
const FROMS = opt('from', '1,2').split(',').map(Number);
const PAR = Number(opt('par', '4'));
const SETS = opt('sets', 'base:').split(';').filter(Boolean).map((s) => {
  const [name, kv] = s.split(':');
  const env = {};
  for (const p of (kv || '').split(',').filter(Boolean)) { const [k, v] = p.split('='); env[k] = v; }
  return { name, env };
});
mkdirSync('captures/gntfixPARTY5-sweep', { recursive: true });
const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const jobs = [];
for (const set of SETS) for (const from of FROMS) jobs.push({ set, from, out: `captures/gntfixPARTY5-sweep/${set.name}-from${from}.json` });
const runJob = (j) => new Promise((res) => {
  const args = ['tools/gntCAMPAIGN-camprun.mjs', '--from', String(j.from), '--seeds', SEEDS, '--out', j.out];
  if (ROOT) args.push('--root', ROOT);
  const p = spawn(process.execPath, args, { env: { ...process.env, ...j.set.env }, stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => res({ ...j, code, err: err.slice(-400) }));
});
const queue = [...jobs];
const done = [];
await Promise.all(Array.from({ length: PAR }, async () => { while (queue.length) done.push(await runJob(queue.shift())); }));
for (const set of SETS) {
  const lines = [];
  for (const from of FROMS) {
    const j = done.find((x) => x.set === set && x.from === from);
    if (!existsSync(j.out)) { lines.push(`  from ${from}: FAILED ${j.err}`); continue; }
    const J = JSON.parse(readFileSync(j.out, 'utf8'));
    const per = {};
    for (const run of J.runs) {
      for (const lv of run.levels) {
        const L = (per[lv.level] = per[lv.level] || { reached: 0, cleared: 0, wiped: 0, downSeeds: [], downSeeds5: 0, combatDowns: 0, stagDowns: 0, dmg: [], stag: [], wipeSeeds: [] });
        L.reached += 1;
        if (lv.outcome === 'cleared') L.cleared += 1; else { L.wiped += 1; L.wipeSeeds.push(run.seed); }
        let d = 0;
        for (const rm of lv.rooms) {
          d += rm.downs || 0;
          if (rm.mode === 'boss') { L.stagDowns += rm.downs || 0; L.stag.push(rm.partyDamageTaken); }
          else if (rm.mode === 'kill_all' || rm.mode === 'defend') { L.combatDowns += rm.downs || 0; L.dmg.push(rm.partyDamageTaken); }
        }
        if (d > 0) { L.downSeeds.push(run.seed); if (run.seed <= 5) L.downSeeds5 += 1; }
      }
    }
    for (const [lvl, L] of Object.entries(per)) lines.push(`  from ${from} L${lvl}: reached ${L.reached} cleared ${L.cleared} wiped ${L.wiped}${L.wipeSeeds.length ? ` (seeds ${L.wipeSeeds.join(',')})` : ''} | down seeds 1-5: ${L.downSeeds5} all: ${L.downSeeds.length} [${L.downSeeds.join(',')}] | downs combat ${L.combatDowns} stag ${L.stagDowns} | med dmg/combat room ${Math.round(med(L.dmg))} stag ${Math.round(med(L.stag))}`);
    lines.push(`  from ${from} band gates: ${JSON.stringify(J.band && J.band.gates ? Object.fromEntries(Object.entries(J.band.gates).filter(([, v]) => v !== true)) : J.band ? 'n/a' : null).slice(0, 300)}`);
  }
  console.log(`== ${set.name} ${JSON.stringify(set.env)}\n${lines.join('\n')}`);
}
