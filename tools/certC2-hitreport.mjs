import { readFileSync } from 'node:fs';
const lines = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] '));
for (const ln of lines) {
  let o; try { o = JSON.parse(ln.slice(7)); } catch { continue; }
  if (o && o.rows && o.tally) {
    console.log('HITS', o.hits, 'analyzed', o.analyzed, 'tally', JSON.stringify(o.tally), 'fails', o.failsCount);
    console.log('tick  tgt amt  src               kill clr  kbObs kbAt kbT num numPos            sound        hitstop');
    for (const r of o.rows) {
      console.log(String(r.t).padEnd(6), String(r.tgt).padEnd(3), String(r.amt).padEnd(4),
        String(r.src).padEnd(18), (r.dead?'Y':'.').padEnd(4), (r.clearsRoom?'CLR':'.').padEnd(4),
        String(r.kbObs).padEnd(6), String(r.kbAtTick).padEnd(4), String(r.kbTicksSeen).padEnd(3),
        String(r.numDomHit).padEnd(3), JSON.stringify(r.numDomPos[0]||null).slice(0,18).padEnd(18),
        JSON.stringify(r.sound).padEnd(13), JSON.stringify(r.hitstop));
    }
    const nonkill = o.rows.filter(r => !r.dead);
    console.log('\nNON-KILL hits:', nonkill.length, 'kb range', nonkill.map(r=>r.kbObs).sort((a,b)=>a-b).slice(0,3), '...', nonkill.map(r=>r.kbObs).sort((a,b)=>a-b).slice(-3));
    console.log('KILLS:', o.rows.filter(r=>r.dead).length);
  }
  if (o && o.shake) {
    console.log('\nHITSTOP median tick gap', o.tickGapMedianMs, 'ms; causes', JSON.stringify(o.causes));
    console.log('hitstops [tick,ticks,cause,wallMsOnTick]:'); for (const h of o.hitstops) console.log('  ', JSON.stringify(h));
    console.log('SHAKE thr', o.shake.thr, 'baseMed', o.shake.baseMed, 'baseP95', o.shake.baseP95,
      'killsWithShake', o.shake.killsWithShake, '/', o.shake.kills);
    console.log('perKill [death,maxJerk,ticksOver]:', JSON.stringify(o.shake.perKill));
  }
}
