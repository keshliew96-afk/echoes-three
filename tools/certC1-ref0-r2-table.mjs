// certC1-ref0-r2-table.mjs — decode a certC1-ref0-r2-* console log into readable tables.
// usage: node tools/certC1-ref0-r2-table.mjs captures/certC1-ref0-r2-run555.console.txt [--full]
import { readFileSync } from 'node:fs';
const log = process.argv[2];
const full = process.argv.includes('--full');
const lines = readFileSync(log, 'utf8').split(/\r?\n/);
for (const line of lines) {
  if (/^\[(LOOP|SHOT|HARNESS|PAGEERROR|DEBUG-API|GOTO|REQFAIL)/.test(line)) { console.log(line); continue; }
  if (/^\[error\]/.test(line)) { console.log(line.slice(0, 300)); continue; }
  if (!line.startsWith('[EVAL] ')) continue;
  let o; try { o = JSON.parse(line.slice(7)); } catch { console.log(line.slice(0, 300)); continue; }
  if (o && o.tag && /^clear\d$/.test(o.tag)) {
    if (o.missing) { console.log(`\n==== ${o.tag}: MISSING (rc ${o.rc}, ev ${o.ev})`); continue; }
    console.log(`\n==== ${o.tag}: room_cleared tick ${o.clearTick} (frame ${o.clearFr}) | last death tick ${o.deathTick} (frame ${o.deathFr}) sameTick=${o.sameTick}`);
    console.log(`death ${JSON.stringify(o.death)} hit ${JSON.stringify(o.hit)} | visible "${o.hit && o.hit.amt}" before: ${o.visBefore} | NUMERAL=${o.numeral} at=+${o.numeralAt} nearDeath=${o.numeralNearDeath} | hitstop ${o.hitstop} sound ${o.sound}`);
    console.log('ring events on the death tick: ' + JSON.stringify(o.ringAtDeathTick));
    console.log('gaps>40ms [tick,ms]: ' + JSON.stringify(o.gaps));
    console.log('marks: ' + JSON.stringify(o.marks));
    console.log('-- events [T-3,T+30] (no sound/ally/basic/skill_cast):');
    for (const e of o.events) console.log('   ' + e);
    console.log('-- frame rows [T-4,T+30]: tick | ms | vfx.numerals | ui | phase | enemies | #run-screen display/opacity | layer children [text,opacity,x,y]');
    const rows = full ? o.rows : o.rows.slice(0, 22);
    for (const r of rows) console.log('   ' + r.join(' | '));
    if (!full && o.rows.length > 22) console.log(`   ... (${o.rows.length - 22} more rows; --full)`);
  } else if (o && o.tag && /-kills$/.test(o.tag)) {
    console.log(`\n==== ${o.tag}: seed ${o.seed} v${o.version} fps ${o.fps} | kills ${o.kills}, with numeral ${o.killsWithNumeral}, missing ${JSON.stringify(o.missing)} | clearing kills ${JSON.stringify(o.clearingKills)} | enemy hits ${o.hits} with numeral ${o.hitsWithNumeral} | frame gaps>100ms ${JSON.stringify(o.frameGapsOver100)} | frames ${o.frames} rows ${o.rowsN} driverErr ${o.driverErr} pollErr ${o.pollErr}`);
    console.log('counts: ' + JSON.stringify(o.counts));
    if (full) for (const r of o.rows) console.log('   ' + JSON.stringify(r));
  } else {
    console.log('\n' + line.slice(7, 700));
  }
}
