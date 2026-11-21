import fs from 'fs';import path from 'path';
const ROOT='/home/claude/echoes-three/';
const cat=JSON.parse(fs.readFileSync(ROOT+'src/i18n/catalog.json'));
const walk=(d,o=[])=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n);fs.statSync(p).isDirectory()?walk(p,o):p.endsWith('.js')&&o.push(p)}return o};
const files=walk(ROOT+'src').filter(f=>!/\/src\/(sim|core|i18n)\//.test(f)&&!/vfxlab|ui\/debug\.js/.test(f));
const lit=/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/gs;
const out=[];
for(const f of files){let src=fs.readFileSync(f,'utf8');
 // strip comments crudely
 src=src.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g,(m,a)=>a+' '.repeat(m.length-a.length));
 for(const m of src.matchAll(lit)){const v=m[1]??m[2]??m[3];if(v===undefined)continue;
   let val; try{val=m[3]!==undefined?v:Function('return '+m[0])()}catch{val=v}
   if(cat[val])continue;
   if(/\$\{/.test(val) && /\bt\(|tn\(/.test(val))continue;
   const txt=val.replace(/\$\{[^}]*\}/g,' ').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ');
   const words=txt.match(/\b[A-Za-z][a-z]{1,}\b/g)||[];
   if(words.length<3)continue;
   if(!/\b(the|a|to|of|is|your|you|and|in|on|for|no|not|this|with|or|at|be|it)\b/i.test(txt))continue;
   if(/[{};]\s*$|:\s*[\d#]|px|rgba|var\(--/.test(val)&&!/[.!?]$/.test(val))continue;
   const before=src.slice(Math.max(0,m.index-40),m.index);
   if(/console\.\w+\(\s*$|Error\(\s*$|warn\(\s*$/.test(before))continue;
   const line=src.slice(0,m.index).split('\n').length;
   out.push(`${path.relative(ROOT,f)}:${line} ${JSON.stringify(val.slice(0,110))}  <<${before.replace(/\s+/g,' ').slice(-30)}`);
 }}
console.log(out.length);fs.writeFileSync(process.argv[2],out.join('\n'));
