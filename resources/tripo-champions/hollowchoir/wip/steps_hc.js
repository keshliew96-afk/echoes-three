const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'hc_idle'},
 {click:'Shard Hymn'},st(56),{wait:300},{shot:'hc_sh_wind'},{click:'Game zoom'},{wait:300},{shot:'hc_sh_wind_gz'},st(8),{wait:300},{shot:'hc_sh_hit_gz'},st(26),{wait:300},{shot:'hc_sh_fly_gz'},{click:'Close'},st(12),{wait:300},{shot:'hc_sh_fly'},st(20),
 {click:'Shard Hymn'},q(90),
 {click:'Discord'},st(64),{wait:300},{shot:'hc_dc_wind'},{click:'Game zoom'},{wait:300},{shot:'hc_dc_wind_gz'},st(10),{wait:300},{shot:'hc_dc_hit_gz'},{click:'Close'},st(4),{wait:300},{shot:'hc_dc_hit'},
 {click:'Discord'},q(90),
 {click:'Rage'},st(28),{wait:300},{shot:'hc_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'hc_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'hc_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'hc_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Death'},st(160),{wait:300},{shot:'hc_death'},{click:'Game zoom'},{wait:300},{shot:'hc_death_gz'},
 {click:'Death (press to spawn)'},st(100),{click:'Close'},{wait:300},{shot:'hc_spawned'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'hc_full',full:true}];
