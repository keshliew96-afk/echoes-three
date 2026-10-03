#!/usr/bin/env node
// PARTY difficulty band (docs/gauntlet/PLAN.md GP.13, BUILD_BRIEF §25.10).
// Runs the CAMPAIGN runner (tools/gntCAMPAIGN-camprun.mjs, read-only; the
// deterministic default-build autopilot for the Healer + the §25.8 ally AI in
// Suggested mode) on THIS tree — the carried campaign from Level 1 and the
// Level-2 / Level-3 starts with the grant, seeds 1-5 — and compares it with
// the v0.5.150 baseline recorded before PARTY's first sim edit
// (captures/gntPARTY-baseline-from{1,2,3}.json):
//   (a) the §4.2 / GC.12 band (the runner's own gates, all true);
//   (b) per level, the median party damage per combat room and the median
//       time-to-clear within x0.75-x1.35 of the baseline;
//   (c) the Level 3 Stag room's median party damage >= 0.8 x baseline;
//   (d) >= 1 party down per level on >= 2 of 5 seeds; on Level 1 a seed also
//       counts when a member drops below 35 % HP (the design owner's ruling,
//       2026-10-03: Level 1's bite is an HP dip, not a down — PLAN GP.13).
//
//   node tools/gntPARTY-band.mjs [--seeds 1-5] [--from 1,2,3] [--root <checkout>] [--tag now] [--reuse 1]
//   --reuse 1  read the tagged runner outputs instead of re-running them.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEEDS = opt('seeds', '1-5');
const FROMS = opt('from', '1,2,3').split(',').map(Number);
const ROOT = opt('root', null);
const TAG = opt('tag', 'now');
const REUSE = opt('reuse', '0') === '1';
mkdirSync('captures', { recursive: true });

const med = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r2 = (v) => (v === null ? null : Math.round(v * 100) / 100);
// GP.13 (d) on Level 1: a member below this HP fraction counts as the bite.
const L1_BITE_HP = 0.35;

function runOnce(from) {
  const out = `captures/gntPARTY-band-${TAG}-from${from}.json`;
  if (!(REUSE && existsSync(out))) {
    const args = ['tools/gntCAMPAIGN-camprun.mjs', '--from', String(from), '--seeds', SEEDS, '--out', out];
    if (ROOT) args.push('--root', ROOT);
    const t0 = Date.now();
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0 && !existsSync(out)) throw new Error(`camprun --from ${from} failed: ${(r.stderr || r.stdout || '').slice(-800)}`);
    console.log(`[band] from ${from}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  return JSON.parse(readFileSync(out, 'utf8'));
}

// Per level: every combat room (kill_all / defend) sample over the seeds.
function stats(json) {
  const per = {};
  for (const run of json.runs) {
    for (const lv of run.levels) {
      const L = (per[lv.level] = per[lv.level] || { dmg: [], ticks: [], boss: [], downsBySeed: {}, minHpBySeed: {}, cleared: 0, reached: 0 });
      L.reached += 1;
      if (lv.outcome === 'cleared') L.cleared += 1;
      let downs = 0;
      let minHp = null; // null when the runner output predates minHpFrac
      for (const rm of lv.rooms) {
        downs += rm.downs || 0;
        if (Number.isFinite(rm.minHpFrac)) minHp = Math.min(minHp ?? 1, rm.minHpFrac);
        if (rm.mode === 'kill_all' || rm.mode === 'defend') {
          if (Number.isFinite(rm.partyDamageTaken)) L.dmg.push(rm.partyDamageTaken);
          if (Number.isFinite(rm.ticksToClear)) L.ticks.push(rm.ticksToClear);
        }
        if (rm.mode === 'boss' && Number.isFinite(rm.partyDamageTaken)) L.boss.push(rm.partyDamageTaken);
      }
      L.downsBySeed[run.seed] = (L.downsBySeed[run.seed] || 0) + downs;
      if (minHp !== null) L.minHpBySeed[run.seed] = Math.min(L.minHpBySeed[run.seed] ?? 1, minHp);
    }
  }
  return per;
}

const report = { tool: 'gntPARTY-band', seeds: SEEDS, from: FROMS, root: ROOT, tag: TAG, at: new Date().toISOString(), levels: {}, gates: {}, runnerGates: {} };
const fails = [];
const gate = (k, ok, got) => {
  report.gates[k] = { ok: !!ok, got };
  console.log(`${ok ? 'PASS' : 'FAIL'} ${k} ${JSON.stringify(got)}`);
  if (!ok) fails.push(k);
};
for (const from of FROMS) {
  const now = runOnce(from);
  const base = JSON.parse(readFileSync(`captures/gntPARTY-baseline-from${from}.json`, 'utf8'));
  // (a) the runner's own band gates (GC.12 / §4.2).
  const rg = now.band && now.band.gates ? now.band.gates : {};
  report.runnerGates[from] = rg;
  const bad = Object.entries(rg).filter(([, v]) => v !== true).map(([k]) => k);
  gate(`(a) from ${from}: the §4.2 / GC.12 band`, bad.length === 0, bad.length ? bad : `${Object.keys(rg).length} gates`);
  const sN = stats(now);
  const sB = stats(base);
  for (const lvl of Object.keys(sN).map(Number).sort()) {
    if (!sB[lvl]) continue;
    const n = sN[lvl];
    const b = sB[lvl];
    const dmgR = med(n.dmg) / med(b.dmg);
    const ttcR = med(n.ticks) / med(b.ticks);
    const row = {
      from,
      level: lvl,
      reached: n.reached,
      cleared: n.cleared,
      medDamage: r2(med(n.dmg)),
      baseDamage: r2(med(b.dmg)),
      damageRatio: r2(dmgR),
      medTicks: med(n.ticks),
      baseTicks: med(b.ticks),
      ttcRatio: r2(ttcR),
      bossDamage: r2(med(n.boss)),
      baseBossDamage: r2(med(b.boss)),
      downsBySeed: n.downsBySeed,
      minHpBySeed: n.minHpBySeed,
    };
    report.levels[`${from}:${lvl}`] = row;
    gate(`(b) from ${from} L${lvl}: combat-room median damage x${row.damageRatio} (${row.medDamage} vs ${row.baseDamage}) and time-to-clear x${row.ttcRatio} (${row.medTicks} vs ${row.baseTicks} ticks) within x0.75-x1.35`, dmgR >= 0.75 && dmgR <= 1.35 && ttcR >= 0.75 && ttcR <= 1.35, row);
    if (lvl === 3) gate(`(c) from ${from} L3: the Stag room's median party damage ${row.bossDamage} >= 0.8 x ${row.baseBossDamage}`, med(n.boss) >= 0.8 * med(b.boss), { now: row.bossDamage, base: row.baseBossDamage });
    // The v0.5.150 baseline's own count is printed alongside: on the carried
    // Levels 1-2 it is 0 of 5 (BUILD_BRIEF §23.2 PARTY note: (d) there cannot
    // be met without breaking (b)'s x1.35 ceiling — a recorded design conflict).
    if (lvl === 1) {
      // Level 1 (ruling 2026-10-03): a down OR a member below 35 % HP.
      const bit = (L) => (s) => (L.downsBySeed[s] || 0) >= 1 || (Number.isFinite(L.minHpBySeed[s]) && L.minHpBySeed[s] < L1_BITE_HP);
      const seedsBit = Object.keys(n.downsBySeed).filter(bit(n)).length;
      const baseBit = Object.keys(b.minHpBySeed).length ? `${Object.keys(b.downsBySeed).filter(bit(b)).length} of ${Object.keys(b.downsBySeed).length}` : 'n/a (no minHpFrac)';
      const noHp = Object.keys(n.downsBySeed).length > 0 && Object.keys(n.minHpBySeed).length === 0;
      gate(`(d) from ${from} L1: a party down or a member below ${L1_BITE_HP * 100} % HP on >= 2 of ${Object.keys(n.downsBySeed).length} seeds (${seedsBit}; the v0.5.150 baseline: ${baseBit})`, !noHp && seedsBit >= 2, { downsBySeed: n.downsBySeed, minHpBySeed: n.minHpBySeed });
    } else {
      const seedsWithDown = Object.values(n.downsBySeed).filter((d) => d >= 1).length;
      const baseWithDown = Object.values(b.downsBySeed).filter((d) => d >= 1).length;
      gate(`(d) from ${from} L${lvl}: >= 1 party down on >= 2 of ${Object.keys(n.downsBySeed).length} seeds (${seedsWithDown}; the v0.5.150 baseline: ${baseWithDown} of ${Object.keys(b.downsBySeed).length})`, seedsWithDown >= 2, n.downsBySeed);
    }
  }
}
writeFileSync(`captures/gntPARTY-band-${TAG}.json`, JSON.stringify(report, null, 1));
console.log(`${Object.values(report.gates).filter((g) => g.ok).length}/${Object.keys(report.gates).length} band gates pass`);
process.exit(fails.length ? 1 : 0);
