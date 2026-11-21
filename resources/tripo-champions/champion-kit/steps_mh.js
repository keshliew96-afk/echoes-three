const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'mh_idle'},
 {click:'Antler Toss'},st(50),{wait:300},{shot:'mh_at_wind'},{click:'Game zoom'},{wait:300},{shot:'mh_at_wind_gz'},st(8),{wait:300},{shot:'mh_at_hit_gz'},{click:'Close'},st(6),{wait:300},{shot:'mh_at_hit'},st(30),
 {click:'Antler Toss'},q(100),
 {click:"Hart's Leap"},{click:'Game zoom'},st(30),{wait:300},{shot:'mh_hl_gather_gz'},{click:'Side'},st(20),{wait:300},{shot:'mh_hl_fly_side'},{click:'Game zoom'},st(18),{wait:300},{shot:'mh_hl_fall_gz'},{click:'Close'},st(8),{wait:300},{shot:'mh_hl_hit'},{click:'Game zoom'},st(30),{wait:300},{shot:'mh_hl_moss_gz'},st(20),
 {click:"Hart's Leap"},q(100),
 {click:'Rage'},st(46),{wait:300},{click:'Close'},{wait:300},{shot:'mh_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'mh_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'mh_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'mh_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'mh_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(60),{wait:300},{shot:'mh_death_fall'},st(120),{wait:300},{shot:'mh_death'},{click:'Game zoom'},{wait:300},{shot:'mh_death_gz'},
 {click:'Death (press to spawn)'},st(45),{click:'Close'},{wait:300},{shot:'mh_spawn_shake'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'mh_full',full:true}];
