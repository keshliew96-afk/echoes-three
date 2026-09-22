// Certification block D round 5 audit-gap reducer: sampler + surface + meter trace lines -> tables.
import { readFileSync } from 'fs';
const fmt = (s) => s ? `${s.frames}f mean ${s.meanMs} ms = ${s.meanFps} fps | p50 ${s.p50} p95 ${s.p95} p99 ${s.p99} max ${s.max} | >100ms ${s.g100}` : 'null';
for (const f of process.argv.slice(2)) {
  let txt;
  try { txt = readFileSync(`captures/${f}.console.txt`, 'utf8'); } catch (e) { console.log(`\n### ${f}: MISSING`); continue; }
  const lines = txt.split('\n');
  const lvl = {};
  for (const l of lines) { const m = l.match(/^\[(\w[\w-]*)\]/); if (m) lvl[m[1]] = (lvl[m[1]] || 0) + 1; }
  console.log(`\n### ${f}  levels=${JSON.stringify(lvl)}`);
  for (const l of lines) if (/^\[(GOTO|DEBUG-API|LOOP|HARNESS-ERROR|PAGEERROR|error|REQFAIL)\]/.test(l)) console.log('  ' + l);
  for (const l of lines) if (l.startsWith('[warn]')) console.log('  WARN ' + l.slice(0, 160).replace(/\s+/g, ' '));
  for (const line of lines) {
    if (!line.startsWith('[EVAL] ')) continue;
    let o; try { o = JSON.parse(line.slice(7)); } catch (e) { continue; }
    if (typeof o === 'string') { console.log('  -- ' + o); continue; }
    if (o && o.steady !== undefined && o.all) {
      console.log(`  -- SAMPLER ${o.tag} vp ${o.vp} durMs ${o.durMs} longTasks ${o.longTasks} top ${JSON.stringify(o.longTasksTop)}`);
      console.log(`     ALL    ${fmt(o.all)}`);
      console.log(`     WARM   ${fmt(o.warm)}`);
      console.log(`     STEADY ${fmt(o.steady)}`);
      console.log(`     CPU(steady, game JS per frame) ${fmt(o.cpuSteady)}  share of frame ${o.cpuShare}`);
      console.log(`     steady gaps>100 [relMs,ms]: ${JSON.stringify(o.steadyGaps100)}   all gaps>100: ${JSON.stringify(o.allGaps100)}`);
      console.log(`     worst 15 s steady window: ${JSON.stringify(o.worst15s)}`);
      console.log(`     2 s buckets [startS, meanFps, maxMs, g100, cpuMeanMs]: ${JSON.stringify(o.buckets)}`);
      console.log(`     per-sec [s, E.fps, ents, enemies, eshots, zones, azones, bolts, tick, bossPct, meter]:`);
      for (const s of o.perSec || []) console.log(`        ${JSON.stringify(s)}`);
      console.log(`     events: ${JSON.stringify(o.evs)}  deaths ${o.deaths}`);
      for (const fr of o.forensic || []) console.log(`     forensic rel ${fr.rel} ms dur ${fr.ms} ms ${JSON.stringify(fr.events).slice(0, 400)}`);
    } else if (o && o.peak) console.log(`  -- PEAK ${JSON.stringify(o)}`);
    else if (o && o.meterTrace) console.log(`  -- METER [s, text, E.fps, tick, ents]: ${JSON.stringify(o.meterTrace)}`);
    else if (o && o.canvases) console.log(`  -- SURF ${JSON.stringify(o)}`);
    else console.log(`  -- ${JSON.stringify(o).slice(0, 500)}`);
  }
}
