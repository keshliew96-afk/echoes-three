// certD1: print RECTS()/VER results from a layout-sweep console as tables.
import { readFileSync } from 'fs';
const brief = process.argv.includes('--brief');
for (const f of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const lines = readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('[EVAL] '));
  console.log(`\n##### ${f}`);
  for (const l of lines) {
    let o; try { o = JSON.parse(l.slice(7)); } catch { continue; }
    if (!o || typeof o !== 'object') continue;
    if (o.apiVersion !== undefined) { console.log(`  VER api=${o.apiVersion} label="${o.text}" rect=(${o.x},${o.y},${o.w},${o.h}) right=${o.right} bottom=${o.bottom} vw=${o.vw} vh=${o.vh} fs=${o.fs} op=${o.opacity} color=${o.color} fpsMeter="${o.fpsMeter && o.fpsMeter.text}"@(${o.fpsMeter && Math.round(o.fpsMeter.x)},${o.fpsMeter && o.fpsMeter.y},${o.fpsMeter && Math.round(o.fpsMeter.w)},${o.fpsMeter && o.fpsMeter.h})`); continue; }
    if (o.ok !== undefined && o.tag === undefined) { console.log('  waitFor:', JSON.stringify(o).slice(0, 200)); continue; }
    if (!o.tag || !o.rects) continue;
    console.log(`\n  == ${o.tag} @ ${o.vw}x${o.vh} scene=${o.scene} phase=${o.phase} room=${o.room} screen=${o.screen} fps=${o.fps} tick=${o.tick}`);
    console.log(`     hud scale=${o.metrics.scale} clamped=${o.metrics.clamped} zonePct=${o.metrics.zonePct} zone1=${JSON.stringify(o.metrics.zone1)} zone2=${JSON.stringify(o.metrics.zone2)} textPx=${o.metrics.textPx} keyPx=${o.metrics.keyPx} numPx=${o.metrics.numPx}`);
    console.log(`     banner mode=${o.banner.mode} show=${o.banner.show} text="${o.banner.text}" box=${JSON.stringify(o.banner.box)}${o.fit ? ' fit=' + JSON.stringify(o.fit) : ''}${o.floors ? ' floors=' + JSON.stringify(o.floors) : ''}`);
    console.log(`     n=${o.n} OUTSIDE=${o.outside.length ? JSON.stringify(o.outside) : 'none'} OVERLAPS=${o.overlaps.length ? JSON.stringify(o.overlaps) : 'none'}`);
    if (!brief) for (const r of o.rects) console.log(`     ${r.l.padEnd(12)} x=${String(r.x).padStart(7)} y=${String(r.y).padStart(7)} w=${String(r.w).padStart(7)} h=${String(r.h).padStart(6)} fs=${String(r.fs).padStart(5)} ${r.txt ? '"' + r.txt + '"' : ''}`);
  }
}
