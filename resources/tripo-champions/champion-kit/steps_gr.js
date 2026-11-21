const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'gr_idle'},
 {click:'Death Knell'},st(60),{wait:300},{shot:'gr_dk_wind'},{click:'Game zoom'},st(16),{wait:300},{shot:'gr_dk_wind_gz'},st(4),{wait:300},{shot:'gr_dk_hit_gz'},{click:'Close'},st(4),{wait:300},{shot:'gr_dk_hit'},{click:'Game zoom'},st(30),{wait:300},{shot:'gr_dk_slow_gz'},st(30),
 {click:'Death Knell'},q(120),
 {click:'Grave Call'},{click:'Close'},st(55),{wait:300},{shot:'gr_gc_wind'},{click:'Game zoom'},st(6),{wait:300},{shot:'gr_gc_wind_gz'},st(6),{wait:300},{shot:'gr_gc_hit_gz'},{click:'Close'},st(3),{wait:300},{shot:'gr_gc_hit'},{click:'Game zoom'},st(60),{wait:300},{shot:'gr_gc_ash_gz'},
 {click:'Grave Call'},q(120),
 {click:'Rage'},st(46),{wait:300},{click:'Close'},{wait:300},{shot:'gr_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'gr_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'gr_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'gr_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'gr_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(60),{wait:300},{shot:'gr_death_fall'},st(110),{wait:300},{shot:'gr_death'},{click:'Game zoom'},{wait:300},{shot:'gr_death_gz'},
 {click:'Death (press to spawn)'},st(20),{click:'Close'},{wait:300},{shot:'gr_spawn'},st(80),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'gr_full',full:true}];
