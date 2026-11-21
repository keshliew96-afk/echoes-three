const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Front'},{click:'Walk'},st(40),{wait:300},{shot:'v2_walk_front'},{click:'Close'},st(17),{wait:300},{shot:'v2_walk_close'},{click:'Game zoom'},st(13),{wait:300},{shot:'v2_walk_gz'},
 {click:'Idle'},{click:'Close'},st(30),{click:'Death'},st(30),{wait:300},{shot:'v2_death_point'},st(30),{wait:300},{shot:'v2_death_knee'},st(110),{wait:300},{shot:'v2_death'},{click:'Game zoom'},{wait:300},{shot:'v2_death_gz'},{click:'Side'},{wait:300},{shot:'v2_death_side'},
 {click:'Death (press to spawn)'},st(100),{click:'Close'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'v2_full',full:true}];
