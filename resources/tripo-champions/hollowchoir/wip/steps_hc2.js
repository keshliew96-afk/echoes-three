const all={eval:`(()=>{const out=[];const bs=[...document.querySelectorAll('button')];for(const b of bs){const n=b.textContent.trim();if(n==='Pause')continue;b.click();for(let i=0;i<25;i++)__review.step(1/60);out.push(n);}
 for(const b of bs.slice().reverse()){if(b.textContent.trim()==='Pause')continue;b.click();for(let i=0;i<12;i++)__review.step(1/60);} return out.join(' | ')+' :: '+JSON.stringify(__review.state());})()`};
const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:false});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},all,
 {click:'1×'},{click:'Idle'},{click:'Close'},st(140),{wait:300},{shot:'b_idle_face'},{click:'Discord'},st(50),{wait:300},{shot:"b_dc_spin"},st(26),{wait:300},{shot:'b_dc_hit'},{click:'Discord'},st(80),
 {click:'Shard Hymn'},st(58),{wait:300},{shot:'b_sh'},st(30),{wait:300},{shot:'b_sh_fly'},{click:'Shard Hymn'},st(80),{click:'Heavy hit'},st(8),{wait:300},{shot:'b_hh'},{click:'Heavy hit'},st(80),
 {click:'Enraged'},st(40),{wait:300},{shot:'b_enraged'},{click:'Enraged'},{click:'Death'},st(170),{wait:300},{shot:'b_death'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'b_full',full:true}];
