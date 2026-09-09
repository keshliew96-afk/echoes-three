// certD1: print __D.sample() results from a capture console as tables (frame-time stats, gaps w/ heap + event
// ring, 15 s windows, long tasks, per-second E.fps / entities / enemies / projectiles / vfx / heap).
import { readFileSync } from 'fs';
const brief = process.argv.includes('--brief');
for (const f of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const lines = readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('[EVAL] '));
  console.log(`\n##### ${f}`);
  for (const l of lines) {
    let o; try { o = JSON.parse(l.slice(7)); } catch { continue; }
    if (!o || typeof o !== 'object') continue;
    if (o.ok !== undefined && !o.all) console.log('  waitFor:', JSON.stringify(o).slice(0, 400));
    if (o.skip) console.log('  skip:', JSON.stringify(o).slice(0, 600));
    if (o.spawned !== undefined) console.log('  spawn:', JSON.stringify(o));
    if (o.hwConcurrency) console.log('  load:', JSON.stringify(o));
    if (!o.all) continue;
    const st = (s) => s ? `frames ${s.frames} span ${s.spanMs} ms | mean ${s.meanFps} fps (${s.meanMs} ms) | p50 ${s.p50} p95 ${s.p95} p99 ${s.p99} max ${s.max} ms | >50 ${s.gt50} >100 ${s.gt100} >250 ${s.gt250}` : 'n/a';
    console.log(`  tag=${o.tag || ''} ticks ${o.tick0}->${o.tick1} (${o.simTicks} sim ticks) heap ${o.heap ? (o.heap.used / 1048576).toFixed(1) + ' MB' : '?'} stateCost max ${o.stateCostMs && o.stateCostMs.max} ms`);
    console.log('  ALL    :', st(o.all)); console.log('  WARM   :', st(o.warm)); console.log('  STEADY :', st(o.steady));
    console.log('  GAPS>100:', o.gaps.length ? '' : 'none');
    for (const g of o.gaps) { console.log(`    ${g.ms} ms: dt ${g.dt} ms @t${g.tick} ents ${g.ents} E.fps ${g.fps} heap ${g.heapBefore}->${g.heapAfter} MB`); if (g.ring && !brief) console.log(`      ring(last 40 ticks): ${g.ring.join(' ')}`); }
    if (o.windows15s) console.log('  WIN15s :', o.windows15s.map(w => `[${w.from / 1000}-${w.to / 1000}s] gt100 ${w.gt100} max ${w.max} mean ${w.meanFps}`).join(' | '));
    if (o.longTasks) console.log('  LONGTASKS:', o.longTasks.length ? o.longTasks.map(t => `${t.at}ms/${t.dur}ms`).join(', ') : 'none');
    if (o.events) console.log('  EVENTS :', JSON.stringify(o.events));
    if (o.topUps !== undefined) console.log('  topUps', o.topUps, 'phase', o.phase);
    if (o.boss) console.log('  boss   :', JSON.stringify(o.boss).slice(0, 300));
    if (o.party) console.log('  party  :', JSON.stringify(o.party));
    if (o.roomState) console.log('  room   :', JSON.stringify(o.roomState));
    if (o.campState) console.log('  camp   :', JSON.stringify(o.campState));
    if (o.perSec && !brief) { console.log('  s | ms | tick | E.fps | ents | enemies | eshots | bolts | zones | azones | numerals | particles | bossHp | phase | heapMB'); for (const p of o.perSec) console.log(`  ${p.s} | ${p.ms} | ${p.tick} | ${p.fps} | ${p.ents} | ${p.enemies} | ${p.eshots} | ${p.bolts} | ${p.zones} | ${p.azones} | ${p.numerals} | ${p.particles} | ${p.bossHp} | ${p.phase} | ${p.heap}`); }
  }
}
