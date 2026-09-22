#!/usr/bin/env node
// gntM4c — band analysis over an act-runner JSON (tools/gnt-M4a-actrun.mjs):
// per act, the kill_all-only per-room medians of time-to-clear and party
// damage (the gate's per-room medians mix the randomly placed defend rooms,
// which last a fixed 45 s), their Spearman ρ, defend / boss spikes, win and
// stuck counts.   node tools/gntM4c-band.mjs <actrun.json> [...more]
import { readFileSync } from 'node:fs';
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
function rank(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function spearman(a) {
  const x = rank(a.map((_, i) => i));
  const y = rank(a);
  const n = a.length;
  const mx = x.reduce((p, q) => p + q, 0) / n;
  const my = y.reduce((p, q) => p + q, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000;
}
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  const out = { file: f };
  for (const act of [1, 2, 3]) {
    const runs = r.runs.filter((x) => x.act === act);
    if (!runs.length) continue;
    const kt = [], kd = [], dt = [], dd = [];
    for (let room = 1; room <= 6; room++) {
      const ka = runs.flatMap((x) => x.rooms.filter((q) => q.room === room && q.mode === 'kill_all' && q.ticksToClear != null));
      const de = runs.flatMap((x) => x.rooms.filter((q) => q.room === room && q.mode === 'defend' && q.ticksToClear != null));
      kt.push(Math.round(med(ka.map((q) => q.ticksToClear)) / 6) / 10);
      kd.push(Math.round(med(ka.map((q) => q.partyDamageTaken))));
      dt.push(de.length);
      dd.push(de.length ? Math.round(med(de.map((q) => q.partyDamageTaken))) : null);
    }
    const boss = runs.flatMap((x) => x.rooms.filter((q) => q.room === 8 && q.ticksToClear != null));
    out[`act${act}`] = {
      runs: runs.length,
      wins: runs.filter((x) => x.outcome === 'victory').length,
      defeats: runs.filter((x) => x.outcome === 'defeat').length,
      stuck: runs.filter((x) => x.outcome === 'stuck' || x.stuck).length,
      killAllTimeS: kt,
      killAllDamage: kd,
      rhoKillAllTime: spearman(kt.filter((v) => !Number.isNaN(v))),
      rhoKillAllDamage: spearman(kd.filter((v) => !Number.isNaN(v))),
      defendDamage: dd,
      bossTimeS: Math.round(med(boss.map((q) => q.ticksToClear)) / 6) / 10,
      bossDamage: Math.round(med(boss.map((q) => q.partyDamageTaken))),
    };
  }
  console.log(JSON.stringify(out));
}
