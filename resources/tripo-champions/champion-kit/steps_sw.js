const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'sw_idle'},
 {click:'Floodgate'},st(50),{wait:300},{shot:'sw_fg_wind'},{click:'Game zoom'},{wait:300},{shot:'sw_fg_wind_gz'},st(18),{wait:300},{shot:'sw_fg_hit_gz'},{click:'Close'},st(4),{wait:300},{shot:'sw_fg_hit'},
 {click:'Floodgate'},q(60),
 {click:'Undertow'},st(40),{wait:300},{shot:'sw_ut_stir'},{click:'Game zoom'},{wait:300},{shot:'sw_ut_stir_gz'},st(40),{wait:300},{shot:'sw_ut_hit_gz'},{click:'Close'},st(6),{wait:300},{shot:'sw_ut_hit'},
 {click:'Undertow'},q(70),{click:'Game zoom'},{wait:300},{shot:'sw_slick_gz'},
 {click:'Close'},{click:'Rage'},st(26),{wait:300},{shot:'sw_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'sw_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'sw_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'sw_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Death'},st(150),{wait:300},{shot:'sw_death'},{click:'Game zoom'},{wait:300},{shot:'sw_death_gz'},
 {click:'Death (press to spawn)'},st(100),{click:'Close'},{wait:300},{shot:'sw_spawned'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'sw_full',full:true}];
