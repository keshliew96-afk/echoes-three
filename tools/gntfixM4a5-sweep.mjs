#!/usr/bin/env node
// gntfixM4a5 — tuning sweep over env-configured variants of a scratch checkout (--root, e.g. dist-gntfixm4a5-proto
// whose src reads its tuning knobs from process.env). Each variant runs tools/gntfixM4a5-ainode.mjs for the
// carried campaign (from 1) and the Level-2 / Level-3 starts, in parallel, and is summarised against the GP.13
// gates: (b) per-level median combat-room damage / time-to-clear vs the v0.5.150 baseline
// (captures/gntPARTY-baseline-from{1,2,3}.json) on seeds 1-5 AND on all seeds run, (d) seeds with a party down per
// level, wipes (defeat) per level, GP.8 idle / fallback share, clears per level.
//   node tools/gntfixM4a5-sweep.mjs --root dist-gntfixm4a5-proto --seeds 1-10 --par 6 --from 1,2,3 "A=1 B=2" "A=2" ...
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  if (i < 0) return d;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const ROOT = opt('root', 'dist-gntfixm4a5-proto');
const SEEDS = opt('seeds', '1-10');
const PAR = +opt('par', '6');
const FROMS = opt('from', '1,2,3').split(',').map(Number);
const TAG = opt('tag', 'sw');
const configs = argv.length ? argv : [''];
mkdirSync('captures/gntfixM4a5-sweep', { recursive: true });

const med = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);

function baseStats(from) {
  const f = `captures/gntPARTY-baseline-from${from}.json`;
  if (!existsSync(f)) return {};
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const per = {};
  for (const run of j.runs) {
    if (run.seed > 5) continue;
    for (const lv of run.levels) {
      const L = (per[lv.level] = per[lv.level] || { dmg: [], ticks: [], boss: [] });
      for (const rm of lv.rooms) {
        if (rm.mode === 'kill_all' || rm.mode === 'defend') {
          if (Number.isFinite(rm.partyDamageTaken)) L.dmg.push(rm.partyDamageTaken);
          if (Number.isFinite(rm.ticksToClear)) L.ticks.push(rm.ticksToClear);
        }
        if (rm.mode === 'boss' && Number.isFinite(rm.partyDamageTaken)) L.boss.push(rm.partyDamageTaken);
      }
    }
  }
  const out = {};
  for (const [k, L] of Object.entries(per)) out[k] = { dmg: med(L.dmg), ticks: med(L.ticks), boss: med(L.boss) };
  return out;
}
const BASE = Object.fromEntries(FROMS.map((f) => [f, baseStats(f)]));

function runOne(cfg, from, idx) {
  const out = `captures/gntfixM4a5-sweep/${TAG}-${idx}-from${from}.json`;
  const env = { ...process.env };
  for (const kv of cfg.split(/\s+/).filter(Boolean)) {
    const [k, v] = kv.split('=');
    env[k] = v;
  }
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['tools/gntfixM4a5-ainode.mjs', '--from', String(from), '--seeds', SEEDS, '--root', ROOT, '--quiet', '1', '--out', out], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      if (!existsSync(out)) return resolve({ cfg, from, error: `exit ${code} ${err.slice(-300)}` });
      resolve({ cfg, from, data: JSON.parse(readFileSync(out, 'utf8')) });
    });
  });
}

function summarise(res) {
  const { from, data } = res;
  const per = {};
  let idle = 0;
  let pairs = 0;
  const fb = [];
  for (const run of data.runs) {
    idle += run.idle.length;
    pairs += run.pairs;
    fb.push(run.fallbackPct);
    const levels = {};
    for (const rm of run.rooms) (levels[rm.L] = levels[rm.L] || []).push(rm);
    for (const p of run.perLevel) {
      const L = (per[p.level] = per[p.level] || { reached: 0, cleared: 0, wipes: 0, downSeeds: 0, down5: 0, dmg5: [], t5: [], dmgAll: [], boss5: [], bossAll: [] });
      if (p.downs > 0 && run.seed <= 5) L.down5++;
      L.reached++;
      if (p.outcome === 'cleared') L.cleared++;
      else if (p.outcome === 'defeat') L.wipes++;
      if (p.downs > 0) L.downSeeds++;
      for (const rm of levels[p.level] || []) {
        if ((rm.mode === 'kill_all' || rm.mode === 'defend') && rm.sec != null) {
          L.dmgAll.push(rm.dmg);
          if (run.seed <= 5) {
            L.dmg5.push(rm.dmg);
            L.t5.push(Math.round(rm.sec * 60));
          }
        }
        if (rm.mode === 'boss' && run.seed <= 5 && rm.sec != null) L.boss5.push(rm.dmg);
        if (rm.mode === 'boss' && rm.sec != null) L.bossAll.push(rm.dmg);
      }
    }
  }
  const lines = [];
  for (const [lv, L] of Object.entries(per)) {
    const b = BASE[from][lv] || {};
    const dr = b.dmg ? med(L.dmg5) / b.dmg : null;
    const tr = b.ticks ? med(L.t5) / b.ticks : null;
    const drAll = b.dmg ? med(L.dmgAll) / b.dmg : null;
    const okB = dr != null && dr >= 0.75 && dr <= 1.35 && tr >= 0.75 && tr <= 1.35;
    const bossR = b.boss ? med(L.boss5) / b.boss : null;
    const bossRAll = b.boss ? med(L.bossAll) / b.boss : null;
    lines.push(`L${lv}: clr ${L.cleared}/${L.reached} wipe ${L.wipes} down ${L.down5}/5 ${L.downSeeds}/all | b1-5 dmg x${r2(dr)} t x${r2(tr)} ${okB ? 'ok' : 'FAIL'} | dmgAll x${r2(drAll)}${lv === '3' ? ` | stag x${r2(bossR)}${bossR >= 0.8 ? '' : ' FAIL'} all x${r2(bossRAll)}` : ''}`);
  }
  return `from${from} idle ${idle}/${pairs} fb ${r2(Math.max(...fb))}% :: ${lines.join(' || ')}`;
}

const jobs = [];
configs.forEach((cfg, i) => FROMS.forEach((from) => jobs.push({ cfg, from, i })));
const results = new Array(jobs.length);
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const k = next++;
    const j = jobs[k];
    results[k] = await runOne(j.cfg, j.from, j.i);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(PAR, jobs.length) }, worker));
configs.forEach((cfg, i) => {
  console.log(`== [${i}] ${cfg || '(defaults)'}`);
  for (let k = 0; k < jobs.length; k++) {
    if (jobs[k].i !== i) continue;
    const r = results[k];
    console.log('   ' + (r.error ? `from${r.from} ERROR ${r.error}` : summarise(r)));
  }
});
console.log(`sweep ${((Date.now() - t0) / 1000).toFixed(0)} s`);
