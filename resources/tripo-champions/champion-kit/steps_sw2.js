const all={eval:`(()=>{const out=[];const bs=[...document.querySelectorAll('button')];for(const b of bs){const n=b.textContent.trim();if(n==='Pause')continue;b.click();for(let i=0;i<25;i++)__review.step(1/60);out.push(n);}
 // every button a second time, in reverse, so toggles go back and actions stop
 for(const b of bs.slice().reverse()){if(b.textContent.trim()==='Pause')continue;b.click();for(let i=0;i<12;i++)__review.step(1/60);} return out.join(' | ')+' :: '+JSON.stringify(__review.state());})()`};
const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:false});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},all,
 {click:'1×'},{click:'Idle'},{click:'Close'},{click:'Undertow'},st(60),{wait:300},{shot:'b_ut'},st(24),{wait:300},{shot:'b_ut_hit'},{click:'Undertow'},st(80),
 {click:'Floodgate'},st(70),{wait:300},{shot:'b_fg'},{click:'Floodgate'},st(80),{click:'Heavy hit'},st(6),{wait:300},{shot:'b_hh'},{click:'Heavy hit'},st(80),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'b_full',full:true}];
