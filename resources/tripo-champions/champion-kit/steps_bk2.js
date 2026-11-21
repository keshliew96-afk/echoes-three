const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:false});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},
 {click:'Thorn Ring'},st(84),{wait:300},{shot:'b_ring_burst'},{click:'Thorn Ring'},st(60),
 {click:'Death'},st(170),{wait:300},{shot:'b_death'},{click:'Death (press to spawn)'},st(100),
 {click:'Game zoom'},{click:'Bramble Charge'},st(80),{wait:300},{shot:'b_charge_gz'},st(100),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'b_full',full:true}];
