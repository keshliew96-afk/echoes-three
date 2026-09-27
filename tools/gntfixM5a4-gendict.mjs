// gntfixM5a4-gendict.mjs — fix-M5a r4 (NET4-F3): rebuild the bvalue.js dictionaries in measured
// frequency order (captures/gntfixM5a4-dictscan-L12.json + -L3.json from gntfixM5a4-dictscan.mjs):
// every key / string the codec wrote >= MIN times over the corpus, most frequent first (the first
// 128 cost one byte), then every older entry never seen in the corpus, in its old order (keyframes,
// full snapshots and rare events still find them). Prints the two arrays + the event shape table.
// node tools/gntfixM5a4-gendict.mjs > <scratch file>
import fs from 'node:fs';
import { KEY_DICT, STR_DICT } from '../src/net/protocol/bvalue.js';
const MIN = 3;
const files = ['captures/gntfixM5a4-dictscan-L12.json', 'captures/gntfixM5a4-dictscan-L3.json'].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const count = (lists) => { const m = new Map(); for (const f of files) for (const L of lists) for (const [k, n] of f[L]) { const key = k.startsWith('=') ? k.slice(1) : k; m.set(key, (m.get(key) || 0) + n); } return m; };
function build(old, m, ok) {
  const seen = [...m.entries()].filter(([k, n]) => n >= MIN && ok(k)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k]) => k);
  const set = new Set(seen);
  return [...seen, ...old.filter((k) => !set.has(k))];
}
const keys = build(KEY_DICT, count(['dictKeys', 'inlineKeys']), (k) => !/^\d+$/.test(k) && k.length > 0);
const strs = build(STR_DICT, count(['dictStrs', 'inlineStrs']), (k) => k.length > 1 && k.length <= 40);
const fmt = (arr) => { const lines = []; let line = ' '; for (const s of arr) { const t = ` ${JSON.stringify(s).replace(/"/g, "'")},`; if (line.length + t.length > 100) { lines.push(line); line = ' '; } line += t; } lines.push(line); return lines.join('\n'); };
const shapes = new Map();
for (const f of files) for (const [k, n] of f.shapes) shapes.set(k, (shapes.get(k) || 0) + n);
const shapeList = [...shapes.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k]) => k);
// Network play: a human seat's events carry { seat, inputSeq } (sim/allies.js) — the same
// shapes with those two members, plus the human-only dodge / denial events.
const TAGGED = new Set(['ally_basic', 'ally_cast', 'azone_spawn', 'ally_dodge', 'seat_denied', 'interact']);
for (const sh of shapeList.slice()) {
  const [type, keys] = sh.split('|');
  if (!TAGGED.has(type)) continue;
  const ks = (keys ? keys.split(',') : []).concat(['inputSeq', 'seat']).sort();
  const v = type + '|' + ks.join(',');
  if (!shapeList.includes(v)) shapeList.push(v);
}
for (const v of ['ally_dodge|classId,dx,dz,id,inputSeq,partyIndex,seat', 'seat_denied|id,inputSeq,kind,partyIndex,reason,seat']) if (!shapeList.includes(v)) shapeList.push(v);
console.log(`// KEY_DICT ${keys.length} (was ${KEY_DICT.length})\n${fmt(keys)}\n// STR_DICT ${strs.length} (was ${STR_DICT.length})\n${fmt(strs)}\n// SHAPES ${shapeList.length}\n${shapeList.map((s) => `  '${s}',`).join('\n')}`);
