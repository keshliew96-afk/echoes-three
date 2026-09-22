// Certification block D round 5 — reduce sampler / peak / pre-post EVAL lines from console.txt to tables.
import { readFileSync } from 'fs';
const fmt = (s) => s ? `${s.frames}f mean ${s.meanMs} ms = ${s.meanFps} fps | p50 ${s.p50} p95 ${s.p95} p99 ${s.p99} max ${s.max} | >100ms ${s.g100}` : 'null';
for (const f of process.argv.slice(2)) {
  let txt;
  try { txt = readFileSync(`captures/${f}.console.txt`, 'latin1'); } catch (e) { console.log(`\n### ${f}: MISSING`); continue; }
  const lines = txt.split('\n');
  const lvl = {};
  for (const l of lines) { const m = l.match(/^\[(\w[\w-]*)\]/); if (m) lvl[m[1]] = (lvl[m[1]] || 0) + 1; }
  console.log(`\n### ${f}  levels=${JSON.stringify(lvl)}`);
  const goto = lines.find((l) => l.startsWith('[GOTO]')); if (goto) console.log('  ' + goto);
  const dbg = lines.find((l) => l.startsWith('[DEBUG-API]')); if (dbg) console.log('  ' + dbg);
  for (const line of lines) {
    if (!line.startsWith('[EVAL] ')) continue;
    let o; try { o = JSON.parse(line.slice(7)); } catch (e) { continue; }
    if (o && typeof o === 'object' && o.steady !== undefined && o.all) {
      console.log(`  -- SAMPLER ${o.tag}  durMs ${o.durMs}  longTasks ${o.longTasks} top ${JSON.stringify(o.longTasksTop)}`);
      console.log(`     ALL    ${fmt(o.all)}`);
      console.log(`     WARM   ${fmt(o.warm)}`);
      console.log(`     STEADY ${fmt(o.steady)}`);
      console.log(`     steady gaps>100 ms [relMs,ms]: ${JSON.stringify(o.steadyGaps100)}`);
      console.log(`     all gaps>100 ms: ${JSON.stringify(o.allGaps100)}`);
      console.log(`     worst 15 s steady window: ${JSON.stringify(o.worst15s)}`);
      console.log(`     2 s buckets [startS, meanFps, maxMs, g100]: ${JSON.stringify(o.buckets)}`);
      console.log(`     per-sec [s, E.fps, ents, enemies, eshots, zones, azones, bolts, tick, bossPct]:`);
      for (const s of o.perSec || []) console.log(`        ${JSON.stringify(s)}`);
      console.log(`     events: ${JSON.stringify(o.evs)}  deaths ${o.deaths}`);
      console.log(`     forensic (frames >60 ms, events at [ms from frame start, type, tick, detail]):`);
      for (const fr of o.forensic || []) console.log(`        rel ${fr.rel} ms  dur ${fr.ms} ms  ${JSON.stringify(fr.events)}`);
    } else if (o && o.peak) {
      console.log(`  -- PEAK ${JSON.stringify(o)}`);
    } else if (o && typeof o.tag === 'string' && /^(pre|post)-/.test(o.tag)) {
      console.log(`  -- ${o.tag}: ${JSON.stringify(o).slice(0, 700)}`);
    } else if (o && o.ok !== undefined) {
      console.log(`  -- waitFor ok=${o.ok} tick=${o.tick} waited=${o.waitedTicks} ${JSON.stringify(o).slice(0, 300)}`);
    } else if (o && o.found) {
      console.log(`  -- VERSION vp=${o.vp} E.version=${o.version} found=${JSON.stringify(o.found)}`);
    } else if (o && o.heap !== undefined && o.vfx && !o.tag) {
      console.log(`  -- snapshot ${JSON.stringify(o).slice(0, 400)}`);
    } else if (o && typeof o.tag === 'string' && o.ents !== undefined && o.dom !== undefined) {
      console.log(`  -- MEM ${o.tag}: tick ${o.tick} scene ${o.scene} runActive ${o.runActive} room ${o.room} ents ${o.ents} en/es/z/az/b ${o.enemies}/${o.eshots}/${o.zones}/${o.azones}/${o.bolts} dom ${o.dom} numLayer ${o.numLayer} threat ${o.threatLayer} heap ${o.heap} vfx ${JSON.stringify(o.vfx)} renderer ${JSON.stringify(o.renderer)} stats ${String(JSON.stringify(o.stats)).slice(0, 200)}`);
    }
  }
  for (const l of lines) if (l.startsWith('[LOOP]') || l.startsWith('[HARNESS-ERROR]') || l.startsWith('[PAGEERROR]') || l.startsWith('[error]')) console.log('  ' + l);
}
