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
//   (d) >= 1 party down per level on >= 2 of 5 seeds. Level 1 instead (PLAN
//       GP.13, 2026-10-03): its bite is an HP dip — a down or a member below
//       35 % HP — on at least as many of seeds 1-40 as the v0.5.150 baseline
//       (Level 1 only: `camprun --stop-after 1`; seeds 1-5 are printed too).
//
//   node tools/gntPARTY-band.mjs [--seeds 1-5] [--from 1,2,3] [--l1seeds 1-40] [--root <checkout>] [--tag now] [--reuse 1]
//   --reuse 1  read the tagged runner outputs instead of re-running them.
// The Level 1 baseline is captures/gntPARTY-baseline-l1.json (captures/ is not
// in git): node tools/gntCAMPAIGN-camprun.mjs --from 1 --seeds 1-40 --stop-after 1
//   --root <git archive 2a6139b> --out captures/gntPARTY-baseline-l1.json
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';

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
const L1_SEEDS = opt('l1seeds', '1-40');
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

function runOnce(from, l1 = false) {
  const out = l1 ? `captures/gntPARTY-band-${TAG}-l1.json` : `captures/gntPARTY-band-${TAG}-from${from}.json`;
  // A tag recorded before the Level 1 run existed must not pair its outputs
  // with a fresh Level 1 run of whatever tree is here now.
  if (REUSE && l1 && !existsSync(out)) throw new Error(`--reuse: ${out} is missing (the tag predates the Level 1 run) — re-run without --reuse`);
  if (!(REUSE && existsSync(out))) {
    const args = ['tools/gntCAMPAIGN-camprun.mjs', '--from', String(from), '--seeds', l1 ? L1_SEEDS : SEEDS, '--out', out];
    if (l1) args.push('--stop-after', '1');
    if (ROOT) args.push('--root', ROOT);
    // A failed run must never leave an earlier run's file to be read as this one.
    rmSync(out, { force: true });
    const t0 = Date.now();
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0 || !existsSync(out)) throw new Error(`camprun --from ${from}${l1 ? ' --stop-after 1' : ''} failed (exit ${r.status}): ${(r.stderr || r.stdout || '').slice(-800)}`);
    console.log(`[band] ${l1 ? `Level 1 only, seeds ${L1_SEEDS}` : `from ${from}`}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
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
    // The v0.5.150 baseline's own count is printed alongside (its carried
    // Levels 1-2 have no down on any of seeds 1-5). Level 2's (d) has been met
    // since fix-PARTY-r5; Level 1's is the 2026-10-03 HP-dip ruling below.
    if (lvl === 1) {
      // Level 1 (PLAN GP.13, 2026-10-03): a seed bites on a down OR a member
      // below 35 % HP, counted over seeds 1-40 (Level 1 only) against the
      // v0.5.150 baseline; seeds 1-5 alone are too few (1 of 5 at x2.1, 13
      // of 40).
      const bit = (L) => (s) => (L.downsBySeed[s] || 0) >= 1 || (Number.isFinite(L.minHpBySeed[s]) && L.minHpBySeed[s] < L1_BITE_HP);
      const count = (L) => `${Object.keys(L.downsBySeed).filter(bit(L)).length} of ${Object.keys(L.downsBySeed).length}`;
      if (!existsSync('captures/gntPARTY-baseline-l1.json')) throw new Error('captures/gntPARTY-baseline-l1.json is missing — see the header for the command that records it');
      const wN = stats(runOnce(1, true))[1];
      const wB = stats(JSON.parse(readFileSync('captures/gntPARTY-baseline-l1.json', 'utf8')))[1];
      const seeds = Object.keys(wN.downsBySeed);
      const same = seeds.length > 0 && seeds.length === Object.keys(wB.downsBySeed).length && seeds.every((s) => s in wB.downsBySeed);
      const noHp = Object.keys(wN.minHpBySeed).length === 0 || Object.keys(wB.minHpBySeed).length === 0;
      const nowBit = seeds.filter(bit(wN)).length;
      const baseBit = Object.keys(wB.downsBySeed).filter(bit(wB)).length;
      report.levels['1:L1-wide'] = { seeds: L1_SEEDS, biteSeeds: seeds.filter(bit(wN)).map(Number), baseBiteSeeds: Object.keys(wB.downsBySeed).filter(bit(wB)).map(Number), minHpBySeed: wN.minHpBySeed };
      gate(`(d) from ${from} L1: a party down or a member below ${L1_BITE_HP * 100} % HP on at least as many of seeds ${L1_SEEDS} as the v0.5.150 baseline (${count(wN)} vs ${count(wB)}; seeds ${SEEDS}: ${count(n)}, baseline ${count(b)})`, same && !noHp && nowBit >= baseBit, { now: count(wN), base: count(wB), sameSeeds: same });
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
