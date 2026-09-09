// certC1-ref0-table.mjs — decode a certC1-ref0-* console log: prints per-clear event/DOM/row tables.
import { readFileSync } from 'node:fs';
const log = process.argv[2];
const lines = readFileSync(log, 'utf8').split(/\r?\n/);
for (const line of lines) {
  if (line.startsWith('[LOOP]') || line.startsWith('[SHOT]') || line.startsWith('[HARNESS') || line.startsWith('[PAGEERROR') || line.startsWith('[DEBUG-API]')) { console.log(line); continue; }
  if (!line.startsWith('[EVAL] ')) continue;
  let o; try { o = JSON.parse(line.slice(7)); } catch { console.log(line.slice(0, 300)); continue; }
  if (o && o.tag && /^clear\d$/.test(o.tag) && Array.isArray(o.events)) {
    console.log(`\n==== ${o.tag}: clearTick ${o.clearTick} (ms ${o.clearMs}) sameTickAsLastDeath=${o.sameTick}`);
    console.log('death:', JSON.stringify(o.death));
    console.log('hit:  ', JSON.stringify(o.hit));
    console.log('room_cleared sync:', JSON.stringify(o.rcSync));
    console.log('marks:', JSON.stringify(o.marks));
    console.log('gaps>40ms (tick,ms):', JSON.stringify(o.gaps));
    console.log('-- events [T-3, T+40] (no sound/ally rows):');
    for (const e of o.events) { const c = Object.assign({}, e); delete c.layerSync; console.log('  ', JSON.stringify(c).slice(0, 260)); }
    console.log('-- DOM mutations on #dmg-num-layer [T-3, T+60]:');
    for (const d of o.dom) console.log('  ', JSON.stringify(d));
    console.log('-- frame rows [T-4, T+40]: tick ms vfx.numerals ui phase enemies layerChildren visibleNumerals[txt,x,y]');
    for (const r of o.rows) console.log('  ', r.join(' | '));
  } else if (o && o.tag === 'kills') {
    console.log(`\n==== kills: ${o.n}, with a visible numeral frame ${o.withVisible}, missing ${JSON.stringify(o.missing)}`);
    for (const r of o.rows) console.log('  ', JSON.stringify(r));
  } else {
    console.log('\n' + line.slice(7, 900));
  }
}
