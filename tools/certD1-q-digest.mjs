// certD1 (4th instance) console digest: prints a compact summary of captures/<name>.console.txt and
// (with --append) checkpoints it into docs/critiques/certification-D-r1.md.
import { readFileSync, appendFileSync } from 'fs';
const name = process.argv[2]; const append = process.argv.includes('--append');
const txt = readFileSync(`captures/${name}.console.txt`, 'utf8'); const lines = txt.split(/\r?\n/);
const lv = {}; for (const l of lines) { const m = l.match(/^\[([A-Za-z-]+)\]/); if (m) lv[m[1]] = (lv[m[1]] || 0) + 1; }
const out = [];
out.push(`#### digest ${name}  levels=${JSON.stringify(lv)}`);
out.push((lines.find(l => l.startsWith('[GOTO]')) || '[GOTO] none').slice(0, 100));
for (const l of lines.filter(l => /^\[(PAGEERROR|error|HARNESS-ERROR)\]/.test(l))) out.push('ERR ' + l.slice(0, 400));
const warnKinds = {}; for (const l of lines.filter(l => l.startsWith('[warn]'))) { const k = l.slice(7, 80).replace(/\d+/g, '#'); warnKinds[k] = (warnKinds[k] || 0) + 1; }
out.push('warn kinds: ' + JSON.stringify(warnKinds));
const g = (o) => JSON.stringify(o);
lines.filter(l => l.startsWith('[EVAL]')).forEach((l, i) => {
  const s = l.slice(7); let j = null; try { j = JSON.parse(s); } catch { }
  if (j === null || typeof j !== 'object') { out.push(`E${i}: ${s.slice(0, 300)}`); return; }
  if (j.all && j.steady) {
    out.push(`E${i} SAMPLE tick ${j.tick0}->${j.tick1} (${j.simTicks} sim ticks) tag=${j.tag || ''}`);
    out.push(`  ALL ${g(j.all)}`); out.push(`  WARM ${g(j.warm)}`); out.push(`  STEADY ${g(j.steady)}`);
    out.push(`  windows15s ${g(j.windows15s)}`);
    out.push(`  peakEnt ${j.peakEnt} peakAlive ${g(j.peakAlive)} timer ${g(j.timer)} stateCostMs ${g(j.stateCostMs)} longTasks n=${(j.longTasks || []).length} top=${g((j.longTasks || []).slice().sort((a, b) => b.dur - a.dur).slice(0, 6))}`);
    for (const x of j.gaps || []) out.push(`  GAP ${x.dt} ms @${x.ms} ms tick ${x.tick} screen ${x.screen} phase ${x.phase} timerMaxGap ${x.timerMaxGap} ents ${x.ents} alive ${x.alive} heap ${x.heapBefore}->${x.heapAfter} geo ${x.rinfo && x.rinfo.geometries} ring[-3..] ${g((x.ring || []).slice(-4))}`);
    if (j.perSec) out.push('  perSec s:fps/E.ents/enemies/alive/eshots/bolts/azones/bossHp/heap/screen: ' + j.perSec.map(p => `${p.s}:${p.fps}/${p.ents}/${p.enemies}/${p.alive}/${p.eshots}/${p.bolts}/${p.azones}/${p.bossHp ?? '-'}/${p.heap}/${p.screen}`).join(' '));
    if (j.events) out.push(`  events ${g(j.events)}`);
    for (const k of ['party', 'boss', 'phase', 'room', 'screen', 'hpResets', 'topUps', 'driver', 'clearsSeen', 'roomState', 'campState', 'firstSpawn']) if (j[k] !== undefined) out.push(`  ${k} ${g(j[k]).slice(0, 400)}`);
  } else if (j.rects) {
    out.push(`E${i} RECTS tag=${j.tag} vw${j.vw}x${j.vh} tick ${j.tick} fps ${j.fps} scene ${j.scene} phase ${j.phase} room ${j.room} screen ${j.screen} fit ${g(j.fit)} floors ${g(j.floors)}`);
    out.push(`  metrics ${g(j.metrics)} banner ${g(j.banner)}`);
    out.push(`  n=${j.n} OUTSIDE ${g(j.outside)} OVERLAPS ${g(j.overlaps)}`);
    out.push('  rects ' + j.rects.map(r => `${r.l}(${r.x},${r.y},${r.w},${r.h},fs${r.fs}${r.txt ? ',"' + r.txt.slice(0, 18) + '"' : ''})`).join(' '));
  } else if (j.tag && j.renderer) {
    out.push(`E${i} VFX ${g(j)}`);
  } else out.push(`E${i}: ${s.slice(0, 700)}`);
});
const text = out.join('\n') + '\n';
console.log(text);
if (append) appendFileSync('docs/critiques/certification-D-r1.md', '\n' + text);
