const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'lk_idle'},
 {click:'Chain Hook'},st(40),{wait:300},{shot:'lk_ch_whirl'},{click:'Game zoom'},st(12),{wait:300},{shot:'lk_ch_wind_gz'},st(7),{wait:300},{shot:'lk_ch_hit_gz'},st(6),{wait:300},{shot:'lk_ch_drag_gz'},{click:'Close'},st(8),{wait:300},{shot:'lk_ch_haul'},st(16),{wait:300},{shot:'lk_ch_home'},st(30),
 {click:'Chain Hook'},q(100),
 {click:'Lock Turn'},{click:'Game zoom'},st(30),{wait:300},{shot:'lk_lt_raise_gz'},{click:'Close'},st(25),{wait:300},{shot:'lk_lt_lean'},st(17),{wait:300},{shot:'lk_lt_hit'},{click:'Game zoom'},st(10),{wait:300},{shot:'lk_lt_slow_gz'},st(40),
 {click:'Lock Turn'},q(120),
 {click:'Rage'},st(46),{wait:300},{click:'Close'},{wait:300},{shot:'lk_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'lk_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'lk_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'lk_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'lk_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(60),{wait:300},{shot:'lk_death_fall'},st(100),{wait:300},{shot:'lk_death'},{click:'Game zoom'},{wait:300},{shot:'lk_death_gz'},
 {click:'Death (press to spawn)'},st(45),{click:'Close'},{wait:300},{shot:'lk_spawn'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'lk_full',full:true}];
