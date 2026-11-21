import fs from 'fs';
const R='/home/claude/echoes-three/src/i18n/';
const cat=JSON.parse(fs.readFileSync(R+'catalog.json'));
const bare=k=>k.split('@@')[0];
for(const l of ['ja','de','fr','pt-BR','es','ko','ru']){const t=JSON.parse(fs.readFileSync(R+'locales/'+l+'.json'));
 const id=Object.keys(cat).filter(k=>t[k]===bare(k)&&/[A-Za-z]{2,}/.test(k));
 console.log(l,id.length, JSON.stringify(id.map(s=>s.slice(0,30))));
}
// CJK translations containing English words >=4 letters (excluding placeholders)
for(const l of ['ja','ko','zh-Hans','zh-Hant','ru']){const t=JSON.parse(fs.readFileSync(R+'locales/'+l+'.json'));
 const hits=[];for(const k of Object.keys(cat)){const v=t[k];if(typeof v!=='string')continue;const s=v.replace(/\{\w+\}/g,'').replace(/<[^>]+>/g,'');const w=(s.match(/\b[A-Za-z]{4,}\b/g)||[]).filter(x=>!/^(Echoes|Enter|Shift|Space|Esc|Tab|Start|Select|Ctrl|Alt|WebGL|HTTPS|http|https|localhost|echoes|README|Chrome|Firefox|Safari|LAN|Wi-Fi|Back|npm|serve|node|vfxlab|debug|net)$/i.test(x));if(w.length)hits.push(k.slice(0,40)+' => '+v.slice(0,60)+' ['+w.join(',')+']');}
 console.log('\n',l,'embedded-latin',hits.length);hits.slice(0,8).forEach(h=>console.log('  ',h));}
