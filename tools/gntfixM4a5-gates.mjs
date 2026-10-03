// gntccontent5 — §4.2 / G4a.10 / GC.12 band gates recomputed on the critic's own in-page campaign data (metric dmgAll =
// hit amount + absorbed on party members + Waystone damage, the builder runner's definition), for a seed subset.
// Usage: node tools/gntccontent5-gates.mjs <json> <seedFrom-seedTo>
import fs from 'node:fs';
const [f, sr] = process.argv.slice(2);
const [s0, s1] = (sr || '1-5').split('-').map(Number);
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const runs = j.runs.filter((r) => r.rooms && r.seed >= s0 && r.seed <= s1);
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function rank(a) { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); for (let i = 0; i < idx.length;) { let k = i; while (k + 1 < idx.length && idx[k + 1][0] === idx[i][0]) k++; for (let q = i; q <= k; q++) r[idx[q][1]] = (i + k) / 2 + 1; i = k + 1; } return r; }
const sp = (y) => { const x = y.map((_, i) => i + 1); const rx = rank(x), ry = rank(y); const n = y.length; const mx = rx.reduce((a, b) => a + b) / n, my = ry.reduce((a, b) => a + b) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (rx[i] - mx) * (ry[i] - my); b += (rx[i] - mx) ** 2; c += (ry[i] - my) ** 2; } return +(a / Math.sqrt(b * c)).toFixed(3); };
const WIN = { 1: 3, 2: 3, 3: 2 };
const levels = [...new Set(runs.flatMap((r) => r.rooms.map((x) => x.level)))];
const gates = {};
const perLevel = {};
for (const L of levels) {
  const recs = runs.map((r) => r.rooms.filter((x) => x.level === L)).filter((a) => a.length);
  const rooms = [1, 2, 3, 4, 5, 6].map((room) => { const xs = recs.map((a) => a.find((x) => x.room === room)).filter((x) => x && x.ticks != null); return { room, t: med(xs.map((x) => x.ticks)), d: med(xs.map((x) => x.dmgAll ?? x.dmg)) }; });
  const d = [], dn = [], b = [], bn = [];
  for (const a of recs) {
    const by = new Map(a.map((x) => [x.room, x]));
    for (const x of a) {
      if (x.ticks == null) continue;
      if (x.mode === 'defend') { d.push(x); for (const n of [by.get(x.room - 1), by.get(x.room + 1)]) if (n && n.mode === 'kill_all' && n.ticks != null) dn.push(n); }
      else if (x.mode === 'boss') { b.push(x); for (const n of a) if (n.mode === 'kill_all' && n.room >= 5 && n.ticks != null) bn.push(n); }
    }
  }
  const mt = (xs) => med(xs.map((x) => x.ticks)), md = (xs) => med(xs.map((x) => x.dmgAll ?? x.dmg));
  const cleared = recs.filter((a) => { const bb = a.find((x) => x.mode === 'boss'); return bb && bb.clearTick != null; }).length;
  const rhoT = sp(rooms.map((x) => x.t)), rhoD = sp(rooms.map((x) => x.d));
  perLevel[L] = { reached: recs.length, cleared, rhoT, rhoD, rooms, defend: { t: [mt(d), mt(dn)], d: [md(d), md(dn)] }, boss: { t: [mt(b), mt(bn)], d: [md(b), md(bn)] } };
  gates[`L${L}.rho>=0.6`] = rhoT >= 0.6 && rhoD >= 0.6;
  gates[`L${L}.clears>=${WIN[L]}`] = cleared >= WIN[L];
  gates[`L${L}.medians<=120s`] = Math.max(...rooms.map((x) => x.t || 0)) <= 7200;
  gates[`L${L}.defend>neighbours`] = mt(d) > mt(dn) && md(d) > md(dn);
  gates[`L${L}.boss>late kill_all (damage)`] = md(b) > md(bn);
}
if (levels.length >= 2) for (let room = 1; room <= 6; room++) { const v = levels.map((L) => perLevel[L].rooms[room - 1].d); gates[`room${room} L-rising`] = v.every((x, i) => i === 0 || x > v[i - 1]); }
const pass = Object.values(gates).filter(Boolean).length;
console.log(JSON.stringify({ file: f, seeds: runs.map((r) => r.seed), pass: pass + '/' + Object.keys(gates).length, failing: Object.entries(gates).filter(([, v]) => !v).map(([k]) => k), perLevel: Object.fromEntries(Object.entries(perLevel).map(([L, x]) => [L, { cleared: x.cleared + '/' + x.reached, rhoT: x.rhoT, rhoD: x.rhoD, dmg: x.rooms.map((r) => Math.round(r.d)), t: x.rooms.map((r) => +(r.t / 60).toFixed(1)), defend: x.defend.d.map(Math.round), boss: x.boss.d.map(Math.round) }])) }, null, 0));
