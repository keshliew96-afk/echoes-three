// certD1: print __G.diag() results (gaps with heap / renderer.info / event ring, long tasks, per-second heap).
import { readFileSync } from 'fs';
for (const f of process.argv.slice(2)) {
  const lines = readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('[EVAL] '));
  console.log(`\n##### ${f}`);
  for (const l of lines) {
    let o; try { o = JSON.parse(l.slice(7)); } catch { continue; }
    if (!o || typeof o !== 'object') continue;
    if (o.lib) { console.log('  lib:', JSON.stringify(o)); continue; }
    if (o.ok !== undefined && !o.frames) { console.log('  waitFor:', JSON.stringify(o).slice(0, 300)); continue; }
    if (o.frames === undefined) { console.log('  other:', JSON.stringify(o).slice(0, 300)); continue; }
    console.log(`  ticks ${o.tick0}->${o.tick1} frames ${o.frames} meanFps ${o.meanFps} p95 ${o.p95} max ${o.max} gt100 ${o.gt100} renderer ${o.rendererPath} screen ${o.screen || ''} phase ${o.phase || ''}`);
    for (const g of o.gaps) {
      console.log(`  GAP ${g.ms} ms: dt ${g.dt} ms @t${g.tick} ents ${g.ents} heap ${g.heapBeforeMB}->${g.heapAfterMB} MB`);
      console.log(`      info before ${JSON.stringify(g.infoBefore)} after ${JSON.stringify(g.infoAfter)}`);
      console.log(`      ring(last 40 ticks): ${g.ring.join(' ')}`);
    }
    if (o.eventsNearGaps) o.eventsNearGaps.forEach((e, i) => console.log(`  events +-45 ticks of gap ${i}: ${e.join(' ')}`));
    console.log('  longTasks:', o.longTasks.length ? o.longTasks.map(t => `${t.start}ms/${t.dur}ms ${t.name} ${t.attr}`).join(' | ') : 'none (or observer unsupported)');
    console.log('  s | tick | fps | ents | heapMB | programs/geometries/textures/calls/tris');
    for (const p of o.per) console.log(`  ${p.s} | ${p.tick} | ${p.fps} | ${p.ents} | ${p.heapMB} | ${p.info ? [p.info.programs, p.info.geometries, p.info.textures, p.info.calls, p.info.triangles].join('/') : '-'}`);
  }
}
