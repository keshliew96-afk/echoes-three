const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'br_idle'},
 {click:'Reaping Sweep'},st(46),{wait:300},{shot:'br_rs_wind'},{click:'Game zoom'},{wait:300},{shot:'br_rs_wind_gz'},st(12),{wait:300},{shot:'br_rs_hit_gz'},{click:'Close'},st(3),{wait:300},{shot:'br_rs_hit'},
 {click:'Reaping Sweep'},q(70),
 {click:'Grave Lance'},st(56),{wait:300},{shot:'br_gl_wind'},{click:'Game zoom'},{wait:300},{shot:'br_gl_wind_gz'},st(22),{wait:300},{shot:'br_gl_hit_gz'},{click:'Close'},st(5),{wait:300},{shot:'br_gl_hit'},
 {click:'Grave Lance'},q(80),
 {click:'Rage'},st(26),{wait:300},{shot:'br_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'br_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'br_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'br_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Death'},st(156),{wait:300},{shot:'br_death'},{click:'Game zoom'},{wait:300},{shot:'br_death_gz'},
 {click:'Death (press to spawn)'},st(100),{click:'Close'},{wait:300},{shot:'br_spawned'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'br_full',full:true}];
