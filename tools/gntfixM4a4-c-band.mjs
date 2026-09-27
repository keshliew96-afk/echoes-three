// Band analysis over captures/gntfixM4a4-camp-from{1,2,3}.json (per start mode, per level): per-room medians of
// time-to-clear / party damage / enemies spawned / spawned HP, Spearman rho (rooms 1-6), defend + boss spikes, clears.
import fs from 'node:fs';
const seedsArg = process.argv[2] || '1-5';
const [s0, s1] = seedsArg.split('-').map(Number);
const med = (a) => { const v = a.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
function rank(a) { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function spearman(y) { const x = y.map((_, i) => i + 1); const rx = rank(x), ry = rank(y); const n = y.length; const mx = rx.reduce((a, b) => a + b) / n, my = ry.reduce((a, b) => a + b) / n; let num = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; } return +(num / Math.sqrt(dx * dy)).toFixed(3); }
const out = {};
for (const from of [1, 2, 3]) {
  const f = `captures/gntfixM4a4-camp-from${from}.json`;
  if (!fs.existsSync(f)) continue;
  const J = JSON.parse(fs.readFileSync(f, 'utf8'));
  const runs = J.runs.filter((r) => r.seed >= s0 && r.seed <= s1);
  const levels = {};
  for (const run of runs) {
    for (const rm of run.rooms) {
      const L = (levels[rm.level] = levels[rm.level] || { rooms: {}, clears: 0, reached: 0, seeds: new Set(), defendSpikes: [0, 0], perSeed: {} });
      L.seeds.add(run.seed);
      (L.perSeed[run.seed] = L.perSeed[run.seed] || []).push(rm);
      const R = (L.rooms[rm.room] = L.rooms[rm.room] || { t: [], d: [], n: [], hp: [], el: [], modes: {}, dk: [], dd: [] });
      if (rm.mode === 'shop') continue;
      R.t.push(rm.ticks != null ? rm.ticks / 60 : null);
      R.d.push(rm.dmg);
      R.n.push(rm.n);
      R.hp.push(rm.hpSum);
      R.el.push(rm.elites);
      R.modes[rm.mode] = (R.modes[rm.mode] || 0) + 1;
      if (rm.mode === 'kill_all') R.dk.push(rm.dmg);
      if (rm.mode === 'defend') R.dd.push(rm.dmg);
      if (rm.room === 8 && rm.levelClear != null) L.clears++;
    }
  }
  const res = {};
  for (const [lv, L] of Object.entries(levels)) {
    const rooms = [1, 2, 3, 4, 5, 6, 8];
    const tbl = rooms.map((r) => { const R = L.rooms[r] || { t: [], d: [], n: [], hp: [], el: [], modes: {}, dk: [], dd: [] }; return { room: r, runs: R.d.length, tMed: med(R.t) && +med(R.t).toFixed(1), dMed: med(R.d) && Math.round(med(R.d)), nMed: med(R.n), hpMed: med(R.hp) && Math.round(med(R.hp)), elites: R.el.reduce((a, b) => a + b, 0), modes: R.modes, killDmgMed: med(R.dk) && Math.round(med(R.dk)), defDmgMed: med(R.dd) && Math.round(med(R.dd)) }; });
    const t16 = tbl.slice(0, 6).map((x) => x.tMed), d16 = tbl.slice(0, 6).map((x) => x.dMed);
    // defend vs adjacent kill_all (per seed)
    let dOk = 0, dN = 0, bossVs6 = [], bossVs56 = [];
    const allKill = [], allDef = [];
    for (const rs of Object.values(L.perSeed)) {
      const by = Object.fromEntries(rs.map((x) => [x.room, x]));
      for (const x of rs) {
        if (x.mode === 'kill_all' && x.room <= 6) allKill.push(x.dmg);
        if (x.mode === 'defend') {
          allDef.push(x.dmg);
          const nb = [by[x.room - 1], by[x.room + 1]].filter((y) => y && y.mode === 'kill_all');
          if (nb.length) { dN++; if (x.dmg > Math.max(...nb.map((y) => y.dmg))) dOk++; }
        }
      }
      if (by[8] && by[6]) bossVs6.push([by[8].dmg, by[6].dmg]);
    }
    const bossMed = tbl[6].dMed;
    const k56 = [];
    for (const rs of Object.values(L.perSeed)) for (const x of rs) if ((x.room === 5 || x.room === 6) && x.mode === 'kill_all') k56.push(x.dmg);
    res[lv] = {
      seeds: L.seeds.size,
      clears: L.clears,
      table: tbl,
      rhoTime: spearman(t16),
      rhoDmg: spearman(d16),
      maxRoomMedianS: Math.max(...t16.filter((x) => x != null)),
      defendAboveAdjacentKill: `${dOk}/${dN}`,
      pooled: { killMed: Math.round(med(allKill)), defMed: Math.round(med(allDef)) },
      boss: { dMed: bossMed, room6Med: tbl[5].dMed, pooledKill56Med: Math.round(med(k56)), perSeedBossAbove6: `${bossVs6.filter(([b, s]) => b > s).length}/${bossVs6.length}` },
    };
  }
  out['from' + from] = res;
}
fs.writeFileSync(`captures/gntfixM4a4-band-${seedsArg}.json`, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  for (const [lv, r] of Object.entries(v)) {
    console.log(`${k} L${lv}: seeds ${r.seeds} clears ${r.clears} rhoT ${r.rhoTime} rhoD ${r.rhoDmg} maxMed ${r.maxRoomMedianS}s defend>adjKill ${r.defendAboveAdjacentKill} pooled kill/def ${r.pooled.killMed}/${r.pooled.defMed} boss ${r.boss.dMed} vs r6 ${r.boss.room6Med} vs k56 ${r.boss.pooledKill56Med} bossAbove6 ${r.boss.perSeedBossAbove6}`);
    console.log('   t: ' + r.table.map((x) => `${x.room}:${x.tMed}`).join(' ') + ' | d: ' + r.table.map((x) => `${x.room}:${x.dMed}`).join(' ') + ' | n: ' + r.table.map((x) => `${x.room}:${x.nMed}`).join(' ') + ' | hp: ' + r.table.map((x) => `${x.room}:${x.hpMed}`).join(' ') + ' | el: ' + r.table.map((x) => x.elites).join(','));
  }
}
