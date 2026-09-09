// certC1-ref1-table2.mjs — print the refuter's gen2 clear-tick analysis from a certC1-ref1-sync* console log.
import { readFileSync } from 'node:fs';
const log = process.argv[2];
const full = process.argv.includes('--full');
const lines = readFileSync(log, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] {') || l.startsWith('[EVAL] "') || l.startsWith('[LOOP]') || l.startsWith('[SHOT]') || l.startsWith('[PAGEERROR') || l.startsWith('[HARNESS') || l.startsWith('[GOTO'));
for (const line of lines) {
  if (!line.startsWith('[EVAL]')) { console.log(line); continue; }
  let o; try { o = JSON.parse(line.slice(7)); } catch { console.log(line.slice(0, 300)); continue; }
  if (o && o.clears) {
    console.log(`\n=== ${o.tag}: seed ${o.seed} v${o.version} fps ${o.fps} | kills ${o.kills}, with numeral ${o.killsWithNumeral}, missing ${JSON.stringify(o.killsMissing)} | enemy hits ${o.hits} with numeral ${o.hitsWithNumeral} | frame gaps>100ms ${JSON.stringify(o.frameGaps)} | frames ${o.frames} rows ${o.rowsN} driverErr ${o.driverErr}`);
    for (const r of o.clears) {
      console.log(`\n--- room_cleared t${r.clearTick} sameTickAsKill=${r.sameTick} death ${JSON.stringify(r.death)} hit ${JSON.stringify(r.hit)} numeral=${r.numeral} at=${r.numeralAt} framesRenderedOnKillTick=${r.framesOnKillTick} maxGap ${r.maxGapMs}ms@${r.gapAt} hitstop ${r.hitstop} sound ${r.sound}`);
      console.log('  events around: ' + r.around.join(' '));
      console.log('  synchronous in-handler probes [T, tick, target, amount, src, vfx.numerals, visible DOM numerals, pool (non-empty text), ui, enemies]:');
      for (const s of r.sync) console.log('    ' + JSON.stringify(s));
      console.log('  per-frame rows (tick[*=same tick re-rendered] n=vfx.numerals [visible numerals text@x,y/opacity] ui enemies ms):');
      const fr = full ? r.rows : r.rows.slice(0, 14);
      for (const f of fr) console.log('    ' + f);
      if (!full && r.rows.length > 14) console.log(`    ... (${r.rows.length - 14} more rows; --full)`);
    }
  } else if (o && o.tag) {
    console.log('\n' + line.slice(7, 700));
  } else {
    console.log(line.slice(7, 400));
  }
}
