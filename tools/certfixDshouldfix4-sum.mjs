// certfixDshouldfix4-sum.mjs — compact summary of a D recorder console file:
// every rAF sample (all / warm / steady), every gap > 60 ms with its deltas
// and the sim events around it, program adds/removes and the gl counters.
import { readFileSync } from 'fs';
for (const f of process.argv.slice(2)) {
  console.log('=== ' + f);
  const txt = readFileSync(f, 'utf8');
  const errs = (txt.match(/\[PAGEERROR\]/g) || []).length;
  console.log('PAGEERROR', errs);
  for (const line of txt.split('\n')) {
    if (!line.startsWith('[EVAL] ')) continue;
    let j; try { j = JSON.parse(line.slice(7)); } catch { console.log('  raw', line.slice(0, 160)); continue; }
    if (j && typeof j === 'object' && j.all) {
      const s = (x) => x ? `${x.frames}f mean ${x.meanFps}fps p50 ${x.p50} p95 ${x.p95} p99 ${x.p99} max ${x.max} >60:${x.gt60} >100:${x.gt100}` : '-';
      console.log(`  [${j.tag}] ALL ${s(j.all)}`);
      console.log(`     WARM ${s(j.warm)}`);
      console.log(`     STEADY ${s(j.steady)}`);
      console.log(`     prog ${j.prog0}->${j.progEnd} geo ${j.geo0}->${j.geoEnd} tex ${j.tex0}->${j.texEnd} adds ${(j.adds||[]).length} rem ${(j.removes||[]).length} longTasks ${j.longTaskCount} gpu ${j.gpuStats ? 'mean '+j.gpuStats.meanMs+' max '+j.gpuStats.max : '-'}`);
      for (const a of j.adds || []) console.log(`     +prog ${a.name}#${a.id} at ${a.at} tick ${a.tick} owners ${JSON.stringify(a.owners).slice(0,140)}`);
      for (const g of j.gaps || []) {
        const gpuMax = (g.gpuWin||[]).reduce((m,x)=>Math.max(m,x[1]||0),0);
        console.log(`     GAP ${g.gap} ms at ${g.at} (${g.room||''} +${g.sinceRoomMs??''}) tick ${g.tick} dProg ${g.dProg} dGeo ${g.dGeo} dTex ${g.dTex} jsPrev ${g.jsRenderPrev} js ${g.jsRender} timerGap ${g.timerMaxGap} gpuWinMax ${gpuMax} lt ${JSON.stringify(g.longTasks)}`);
        console.log(`        ev ${JSON.stringify((g.events||[]).slice(0,10))}`);
        if (g.dom) console.log(`        dom ${JSON.stringify(g.dom.slice(0,12))}`);
      }
      if (j.shopAfterMs !== undefined) console.log(`     shopAfterMs ${j.shopAfterMs} screen ${j.screen}`);
      if (j.setHp !== undefined) console.log(`     setHp ${JSON.stringify(j.setHp)} downedEvents ${JSON.stringify(j.downedEvents)}`);
    } else if (j && j.tag === 'census') {
      console.log(`  [census] all ${JSON.stringify(j.all)} judgedGt60 ${j.judgedGt60} judgedGt100 ${j.judgedGt100} worstJudged ${j.worstJudged} adds ${JSON.stringify(j.adds).slice(0,300)}`);
      for (const g of j.gaps) console.log(`     GAP ${g.gap} ms room ${g.room} +${g.since} tick ${g.tick} judged ${g.judged} dProg ${g.dProg} dGeo ${g.dGeo} ev ${JSON.stringify((g.ev||[]).slice(0,6))}`);
    } else {
      console.log('  ', JSON.stringify(j).slice(0, 300));
    }
  }
}
