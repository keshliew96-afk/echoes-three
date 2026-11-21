import fs from 'fs';
const R='/home/claude/echoes-three/src/i18n/';
const cat=JSON.parse(fs.readFileSync(R+'catalog.json'));
const langs=fs.readdirSync(R+'locales').map(f=>f.replace('.json',''));
const T={};for(const l of langs)T[l]=JSON.parse(fs.readFileSync(R+'locales/'+l+'.json'));
const keys=Object.keys(cat);
const need=keys.filter(k=>!(cat[k].pluralOne)); // catalog doesn't store pluralOne; recompute
const ones=new Set(keys.filter(k=>cat[k].plural).map(k=>cat[k].one));
console.log('catalog keys',keys.length,'plural',ones.size);
const holders=s=>[...String(s).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
const bare=k=>k.split('@@')[0];
for(const l of langs){
  const t=T[l];
  const missing=keys.filter(k=>!(k in t)&&!ones.has(k)).filter(k=>!(ones.has(k)));
  const missOnes=keys.filter(k=>!(k in t)&&ones.has(k));
  const empty=keys.filter(k=>t[k]==='');
  const extra=Object.keys(t).filter(k=>!(k in cat));
  // identical
  let ident=[];
  for(const k of keys){const v=t[k];if(typeof v!=='string')continue;if(v===bare(k))ident.push(k);}
  // filter: has 2+ words of letters >=3 chars, or single word len>=5 lowercase-ish
  const sig=ident.filter(k=>{const b=bare(k).replace(/\{\w+\}/g,'');const w=b.match(/[A-Za-z]{3,}/g)||[];return w.length>=2;});
  // placeholder
  const mism=[];const pluralBad=[];
  for(const k of keys){const v=t[k];if(v===undefined)continue;const forms=typeof v==='string'?[v]:Object.entries(v);
    const want=holders(k);
    if(typeof v==='string'){if(holders(v)!==want)mism.push([k,v]);}
    else{ for(const [f,s] of forms){const g=holders(s); if(g!==want && g.split(',').filter(x=>x!=='n').join(',')!==want.split(',').filter(x=>x!=='n').join(','))mism.push([k,f+':'+s]); if(g!==want && f==='other')pluralBad.push([k,s]);}
      if(cat[k].plural){const pr=new Intl.PluralRules(l).resolvedOptions().pluralCategories;const miss=pr.filter(c=>!(c in v));if(miss.length)pluralBad.push([k,'missing forms '+miss]);}}
  }
  // non-plural keys with plural objects / plural keys with string
  const pluralAsString=keys.filter(k=>cat[k].plural&&typeof t[k]==='string');
  // script check: CJK/ru values with no native script
  let noScript=[];
  const re={ja:/[぀-ヿ一-鿿]/,ko:/[가-힯]/,'zh-Hans':/[一-鿿]/,'zh-Hant':/[一-鿿]/,ru:/[Ѐ-ӿ]/}[l];
  if(re)noScript=keys.filter(k=>typeof t[k]==='string'&&!re.test(t[k])&&/[A-Za-z]{3,}/.test(t[k]));
  console.log(`\n== ${l}: entries ${Object.keys(t).length} missing ${missing.length} (+${missOnes.length} one-forms, expected) empty ${empty.length} extra ${extra.length} identicalToEn ${ident.length} (multiword ${sig.length}) placeholderMism ${mism.length} pluralIssues ${pluralBad.length} pluralAsString ${pluralAsString.length} latinOnlyInNonLatin ${noScript.length}`);
  console.log(' missing:',missing.slice(0,5));
  console.log(' ident ex:',sig.slice(0,12).map(s=>s.slice(0,60)));
  if(noScript.length)console.log(' latin-only ex:',noScript.slice(0,10).map(k=>k.slice(0,50)+' => '+String(t[k]).slice(0,40)));
  mism.slice(0,6).forEach(m=>console.log(' mism:',m[0].slice(0,70),'=>',String(m[1]).slice(0,70)));
  pluralBad.slice(0,4).forEach(m=>console.log(' plural:',m[0].slice(0,50),'=>',String(m[1]).slice(0,60)));
  if(l==='de')console.log(' extra:',extra);
}
