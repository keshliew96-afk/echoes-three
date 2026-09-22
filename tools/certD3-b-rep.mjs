// Certification block D round 3b — reducer for the certD3-b-* perf captures.
import { readFileSync } from 'fs';
for (const f of process.argv.slice(2)) {
  const t = readFileSync(`captures/${f}.console.txt`, 'latin1');
  console.log(`\n================ ${f} ================`);
  for (const line of t.split('\n')) {
    if (!line.startsWith('[EVAL]')) continue;
    let o; try { o = JSON.parse(line.slice(7)); } catch (e) { console.log('  RAW', line.slice(0, 220)); continue; }
    if (o && o.tag && o.all) {
      console.log(`SAMPLE ${o.tag}  dur ${o.durMs} ms`);
      console.log('  all    ', JSON.stringify(o.all));
      console.log('  warm   ', JSON.stringify(o.warm));
      console.log('  steady ', JSON.stringify(o.steady));
      console.log('  steadyGaps100', JSON.stringify(o.steadyGaps100));
      console.log('  allGaps100   ', JSON.stringify(o.allGaps100));
      console.log('  worst15s', JSON.stringify(o.worst15s), ' longTasks', o.longTasks, JSON.stringify(o.longTasksTop || []));
      if (o.buckets) { console.log('  2 s buckets [startS, {frames,meanMs,meanFps,p50,p95,p99,max,g100}]:'); for (const b of o.buckets) console.log('    ', b[0], JSON.stringify(b[1])); }
      const S = o.perHalfSec || o.perSec;
      if (S) { console.log(`  series (${o.perHalfSec ? 't,Efps,ents,enemies,bossPct,bossAdds,azones,bolts,tick' : 't,Efps,ents,enemies,eshots,zones,azones,bolts,tick'}):`); for (const r of S) console.log('    ', JSON.stringify(r)); }
      if (o.evs) {
        const c = {}; for (const e of o.evs) c[e[0]] = (c[e[0]] || 0) + 1;
        console.log('  evCounts', JSON.stringify(c));
        console.log('  quakes', JSON.stringify(o.evs.filter((e) => e[0] === 'boss_quake_start').map((e) => e[1])));
        console.log('  adds  ', JSON.stringify(o.evs.filter((e) => e[0] === 'boss_adds').map((e) => e[1])));
      }
    } else console.log('  ' + JSON.stringify(o).slice(0, 700));
  }
  const lv = {};
  for (const line of t.split('\n')) { const m = line.match(/^\[([A-Za-z-]+)\]/); if (m) lv[m[1]] = (lv[m[1]] || 0) + 1; }
  console.log('  console line levels:', JSON.stringify(lv));
}
