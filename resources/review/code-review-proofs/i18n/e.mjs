import fs from 'fs';import path from 'path';
const ROOT='/home/claude/echoes-three/';
const cat=JSON.parse(fs.readFileSync(ROOT+'src/i18n/catalog.json'));
const walk=(d,o=[])=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n);fs.statSync(p).isDirectory()?walk(p,o):p.endsWith('.js')&&o.push(p)}return o};
const files=walk(ROOT+'src').filter(f=>!/\/src\/(sim|core|i18n)\//.test(f));
let lit=0,dyn=[],tmpl=[],concat=[];const exprs={};
for(const f of files){const src=fs.readFileSync(f,'utf8');if(!/i18n\/index\.js/.test(src))continue;
 for(const m of src.matchAll(/(?<![\w.$])(t|tn)\(\s*/g)){
  let rest=src.slice(m.index+m[0].length);
  if(m[1]==='tn'){ // skip first arg
    let d=0,i=0;for(;i<rest.length;i++){const c=rest[i];if('([{'.includes(c))d++;else if(')]}'.includes(c))d--;else if(c===','&&d===0)break;}
    rest=rest.slice(i+1).trimStart();}
  const line=src.slice(0,m.index).split('\n').length;const loc=path.relative(ROOT,f)+':'+line;
  if(/^`[^`]*\$\{/.test(rest)){tmpl.push(loc+' '+rest.slice(0,80).replace(/\n/g,' '));continue;}
  if(/^(['"`])/.test(rest)){ // literal; check concat
    const mm=rest.match(/^('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*\+/); if(mm)concat.push(loc+' '+rest.slice(0,80));
    lit++;continue;}
  if(/^\)/.test(rest))continue;
  const e=rest.match(/^[^,)]*(\([^)]*\))?[^,)]*/)[0].replace(/\s+/g,' ').slice(0,60);
  dyn.push(loc+'  t('+e+')');exprs[e]=(exprs[e]||0)+1;
 }}
console.log('literal calls',lit,'dynamic calls',dyn.length,'template-with-${} keys',tmpl.length,'concat',concat.length);
tmpl.forEach(x=>console.log(' TMPL',x));concat.forEach(x=>console.log(' CONCAT',x));
fs.writeFileSync(process.argv[2],dyn.join('\n'));
// dead keys: catalog keys whose text appears nowhere in src as a literal (outside catalog/locales)
const all=files.concat(walk(ROOT+'src/sim'),walk(ROOT+'src/core')).map(f=>fs.readFileSync(f,'utf8')).join('\n');
const dead=Object.keys(cat).filter(k=>!all.includes(k) && !all.includes(JSON.stringify(k).slice(1,-1)) && !all.includes(k.replace(/'/g,"\\'")));
console.log('catalog keys not found verbatim in src:',dead.length, '(data-flagged:',dead.filter(k=>cat[k].data).length,')');
console.log(dead.filter(k=>!cat[k].data).slice(0,10));
console.log(dead.filter(k=>cat[k].data).slice(0,10).map(s=>s.slice(0,60)));
