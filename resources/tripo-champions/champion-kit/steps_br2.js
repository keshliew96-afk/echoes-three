const all={eval:`(()=>{const out=[];const bs=[...document.querySelectorAll('button')];for(const b of bs){const n=b.textContent.trim();if(n==='Pause')continue;b.click();for(let i=0;i<25;i++)__review.step(1/60);out.push(n);}
 // every button a second time, in reverse, so toggles go back and actions stop
 for(const b of bs.slice().reverse()){if(b.textContent.trim()==='Pause')continue;b.click();for(let i=0;i<12;i++)__review.step(1/60);} return out.join(' | ')+' :: '+JSON.stringify(__review.state());})()`};
const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:false});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},all,
 {click:'1×'},{click:'Idle'},{click:'Close'},{click:'Grave Lance'},st(60),{wait:300},{shot:"b_gl"},st(18),{wait:300},{shot:'b_gl_hit'},{click:'Grave Lance'},st(80),
 {click:'Reaping Sweep'},st(70),{wait:300},{shot:'b_rs'},{click:'Reaping Sweep'},st(80),{click:'Heavy hit'},st(6),{wait:300},{shot:'b_hh'},{click:'Heavy hit'},st(80),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'b_full',full:true}];
