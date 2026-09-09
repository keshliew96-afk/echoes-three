import { readFileSync, writeFileSync } from 'fs';
let t = readFileSync('tools/certC2-b-gen7.mjs', 'utf8');
t = t.replace("if(!window.__c.grabOn)return;if(!h.kind)return;", "if(!window.__c.grabOn)return;if(h.target<4)return;");
const startIdx = t.indexOf('  ev(aiife(`const t0=performance.now();let n=0;');
const endMark = 'deaths:window.__c.ev.filter(e=>e.T===' + String.fromCharCode(39) + 'death' + String.fromCharCode(39) + ').length}' + String.fromCharCode(96) + ')),';
const endIdx = t.indexOf(endMark, startIdx);
if (startIdx < 0 || endIdx < 0) throw new Error('loop not found ' + startIdx + ' ' + endIdx);
const newLoop = [
  '  ev(aiife(`const t0=performance.now();let n=0;',
  "    while(performance.now()-t0<80000){",
  "      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');",
  "      const s=E.state();const tk=s.party[1],sw=s.party[2];",
  "      for(let i=0;i<4;i++){const q=s.party[i];if(q&&q.maxHp&&q.hp<q.maxHp)E.cmd('setHp',i,1);}",
  "      if(s.enemies.length<5){const a=(n%2===0?tk:sw)||tk;if(a)E.cmd('spawn','boar',a.x+0.45,a.z+0.25);}",
  "      const e=s.enemies[0];",
  "      if(e&&n%3===0){E.cmd('mark',e.id);E.cmd('teleport',e.x+0.9,e.z+0.4);E.cmd('rally');}",
  "      n++;await sleep(200);}",
  "    return {end:E.tick,fps:E.fps,hits:window.__c.hits.length,enemies:E.state().enemies.length," + endMark,
].join('\n');
t = t.slice(0, startIdx) + newLoop + t.slice(endIdx + endMark.length);
t = t.replace(/certC2-b-hits2\.json/g, 'certC2-b-hits3.json').replace(/certC2-b2-seq/g, 'certC2-b3-seq');
writeFileSync('tools/certC2-b-gen8.mjs', t);
console.log('wrote tools/certC2-b-gen8.mjs');
