// certC1-ref1-table.mjs — print the refuter's clear-tick analysis from a certC1-ref1-* console log.
import { readFileSync } from 'node:fs';
const log = process.argv[2];
const full = process.argv.includes('--full');
const lines = readFileSync(log, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] {') || l.startsWith('[LOOP]') || l.startsWith('[SHOT]'));
for (const line of lines) {
  if (!line.startsWith('[EVAL]')) { console.log(line); continue; }
  let o; try { o = JSON.parse(line.slice(7)); } catch { console.log(line.slice(0, 300)); continue; }
  if (o.rooms) {
    console.log(`\n=== ${o.tag}: seed ${o.seed} v${o.version} fps ${o.fps} | kills ${o.kills}, with numeral ${o.killsWithNumeral}, missing ${JSON.stringify(o.killsMissing)} | hits ${o.hits} with numeral ${o.hitsWithNumeral} | frame gaps>100ms ${JSON.stringify(o.frameGaps)} | frames ${o.frames} rows ${o.rowsN} dom ${o.domN} driverErr ${o.driverErr}`);
    for (const r of o.rooms) {
      console.log(`\n--- room_cleared t${r.clearTick} sameTickAsKill=${r.sameTick} death ${JSON.stringify(r.death)} hit ${JSON.stringify(r.hit)} numeral=${r.numeral} at=${r.numeralAt} maxGap ${r.maxGapMs}ms@${r.gapAt} hitstop ${r.hitstop} sound ${r.sound}`);
      console.log('  events around: ' + r.around.join(' '));
      console.log('  event-time snaps [T, tick, target, amount, vfx.numerals, visible DOM numerals]:');
      for (const s of r.snaps) console.log('    ' + JSON.stringify(s));
      console.log('  raw DOM mutations [tick, kind, text, opacity, x, y]: ' + JSON.stringify(r.domRaw));
      console.log('  per-tick rows (tick n=vfx.numerals [visible numerals] ui rs=#run-screen pg=page ly=#dmg-num-layer en=enemies ms):');
      const fr = full ? r.frames : r.frames.slice(0, 16);
      for (const f of fr) console.log('    ' + f);
      if (!full && r.frames.length > 16) console.log(`    ... (${r.frames.length - 16} more rows; --full)`);
    }
  } else if (o.tag) {
    console.log('\n' + line.slice(7, 600));
  } else {
    console.log(line.slice(7, 300));
  }
}
