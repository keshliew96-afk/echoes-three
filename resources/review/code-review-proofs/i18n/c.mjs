import fs from 'fs';import path from 'path';
const ROOT='/home/claude/echoes-three/';
const walk=(d,o=[])=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n);fs.statSync(p).isDirectory()?walk(p,o):p.endsWith('.js')&&o.push(p)}return o};
const files=[...walk(ROOT+'src/ui'),...walk(ROOT+'src/render'),...walk(ROOT+'src/app'),ROOT+'src/main.js'].filter(f=>fs.existsSync(f)&&!/vfxlab|ui\/debug\.js/.test(f));
const sinks=/(textContent|innerText|innerHTML|outerHTML|\.title|placeholder|ariaLabel|\.alt)\s*\+?=\s*|setAttribute\(\s*['"](aria-label|title|placeholder|alt|aria-description|data-tip)['"]\s*,\s*|fillText\(\s*|strokeText\(\s*|insertAdjacentHTML\([^,]+,\s*|\b(label|text|title|hint|tip|desc|caption|message|msg|toast|note|heading|subtitle|body)\s*:\s*/;
const lit=/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const out=[];
for(const f of files){const lines=fs.readFileSync(f,'utf8').split('\n');
 lines.forEach((L,i)=>{const s=L.trim(); if(/^(\/\/|\*|\/\*)/.test(s))return; if(/console\.|throw |new Error|import |assert/.test(L))return;
  for(const m of L.matchAll(lit)){let v=m[1]??m[2]??m[3];const before=L.slice(0,m.index);
   if(/(?<![\w.$])tn?\(\s*(?:[^,()]+,\s*)?(?:'[^']*',\s*)?$/.test(before))continue; // inside t(
   if(/\b(t|tn)\($/.test(before.replace(/\s+$/,'')))continue;
   const txt=v.replace(/\$\{[^}]*\}/g,' ').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ');
   const words=txt.match(/\b[A-Za-z][a-z]{2,}\b/g)||[];
   if(words.length<2 && !(words.length===1 && /^[A-Z][a-z]{3,}$/.test(words[0]) && sinks.test(before.slice(-60))))continue;
   if(/^[\w.\-\/#: ,()%]*$/.test(v) && !/ [a-z]+ /.test(v) && words.length<3 && !/^[A-Z]/.test(v))continue;
   if(/(px|rem|em|rgba?|solid|flex|none|absolute|relative|font|var\(|calc|transform|translate|inherit|auto|bold|monospace|sans-serif|ease|linear|pointer|hidden|center|block|inline|grid|nowrap|uppercase|serif|system-ui|vmin|vw|vh|deg|#[0-9a-f]{3})/i.test(v) && !/[A-Z][a-z]+ [a-z]+ [a-z]+/.test(txt))continue;
   if(/^(class|id|data-|aria-|role|type|button|div|span|input|section|keydown|click|pointer)/.test(v))continue;
   if(/^[a-z][\w-]*( [a-z][\w-]*)*$/.test(v) && !sinks.test(before.slice(-60)))continue; // css class lists
   const isSink=sinks.test(before.slice(-70));
   out.push({f:path.relative(ROOT,f),line:i+1,sink:isSink,v:v.slice(0,90)});
  }});
}
const sinkHits=out.filter(o=>o.sink);
console.log('total candidates',out.length,'at sinks',sinkHits.length);
const byFile={};for(const o of out)byFile[o.f]=(byFile[o.f]||0)+1;
console.log(Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0,25));
fs.writeFileSync(process.argv[2],out.map(o=>`${o.sink?'S':'-'} ${o.f}:${o.line}  ${o.v}`).join('\n'));
