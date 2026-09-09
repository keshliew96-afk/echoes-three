// certD1 generator, part E — derive the room-2 (waves 5/4/3, the biggest seed-999 wave) worst-case probe from the
// room-4 defend probe (same sampler library, same RMB-held drive), sampling 25 s instead of the 47 s defend room.
import { readFileSync, writeFileSync } from 'fs';
const src = JSON.parse(readFileSync('tools/actions/certD1-wave.json', 'utf8'));
const acts = JSON.parse(JSON.stringify(src));
let hits = 0;
for (const a of acts) {
  if (a.type !== 'eval') continue;
  if (a.code.includes("E.cmd('skipToRoom',4)")) { a.code = a.code.replace("E.cmd('skipToRoom',4)", "E.cmd('skipToRoom',2)"); hits++; }
  if (a.code.includes('window.__D.sample(47000,{})')) { a.code = a.code.replace('window.__D.sample(47000,{})', 'window.__D.sample(25000,{})'); hits++; }
}
writeFileSync('tools/actions/certD1-wave2.json', JSON.stringify(acts, null, 1));
console.log('wrote certD1-wave2', acts.length, 'edits', hits);
