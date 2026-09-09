// certC1-pxtable.mjs — print the per-hit tables of a certC1-pxflash / certC1-lastkill2
// console log as markdown. usage: node tools/certC1-pxtable.mjs captures/certC1-pxflash.console.txt
import { readFileSync } from 'node:fs';
const log = process.argv[2];
const lines = readFileSync(log, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] {'));
for (const line of lines) {
  let o; try { o = JSON.parse(line.slice(7)); } catch { continue; }
  if (o.frameRows) {
    console.log(`\n#### trial ${o.trial} dummy id ${o.id}: hit tick ${o.grabHitTick}, frame rows (tick:frame L S W B mx)`);
    console.log(o.frameRows.map(r => `${r[0]}:${r[1]} L${r[2]} S${r[3]} W${r[4]} B${r[5]} mx${r[6]}${r[7] ? '(' + r[7] + ')' : ''}`).join(' | '));
    console.log('events: ' + JSON.stringify(o.events));
    console.log('dom numerals: ' + JSON.stringify(o.dom) + ' grabs ' + o.grabCount);
  } else if (o.tag === 'dummy-phase' || o.tag === 'natural') {
    console.log(`\n#### ${o.tag}: hits ${o.hits}, non-kill measurable ${o.nonKillMeasurable}, non-kill with pixel flash ${o.nonKillFlash}, kills ${o.kills} (shake ${o.killsWithShake}, hitstop ${o.killsWithHitstop}), numerals ${o.numerals}/${o.hits}, hit-sound ${o.sounds}/${o.hits}, kb>=0.1u ${o.kbNonKill}/${o.nonKillMeasurable}, base jerk p95 ${o.baseJerkP95}`);
    console.log('| t | id kind | src amt | killed | pre/post frames | baseW→peakW | baseB→peakB | baseL→peakL | maxL | peak@ | FLASH | numeral (tick+) | kb u (tick+) | sound | hitstop | shake |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of o.rows) console.log(`| ${r.t} | ${r.id} ${r.kind || ''} | ${r.src || ''} ${r.amt}${r.crit ? ' crit' : ''} | ${r.killed ? 'KILL' : ''} | ${r.preFrames}/${r.postFrames} | ${r.baseW}→${r.peakW} | ${r.baseB}→${r.peakB} | ${r.baseL}→${r.peakL} | ${r.baseMx}→${r.peakMx} | ${r.peakAt} | ${r.flash ? 'yes' : (r.killed ? 'n/a' : 'NO')} | ${r.num ? 'yes (+' + r.numAt + ')' : 'NO ' + JSON.stringify(r.numAny)} | ${r.kb} (${r.kbAt}) | ${r.snd.join('+')} | ${r.hs.join(',')} | ${r.shake ?? ''} |`);
  } else if (o.tag === 'clears') {
    console.log(`\n#### room clears: kills ${o.kills}, with numeral ${o.killsWithNumeral}, missing ${JSON.stringify(o.killsMissingNumeral)}, frame gaps >100ms ${JSON.stringify(o.frameGapsOver100ms)}`);
    for (const r of o.rooms) console.log(JSON.stringify(r));
  } else if (o.tag === 'GRABS') {
    console.log(`\n#### GRABS trial ${o.trial}: ${o.grabs.length} crops, hit tick ${o.hitTick}: ` + o.grabs.map(g => `t${g.t}/${g.phase}/W${g.W}/B${g.B}/mx${g.mx}`).join(' '));
  } else if (o.ticksSeen !== undefined || o.counts || o.tag) {
    console.log('\n' + line.slice(7, 700));
  }
}
