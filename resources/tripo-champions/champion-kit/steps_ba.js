const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'ba_idle'},
 {click:'Rope Swing'},st(18),{wait:300},{shot:'ba_rs_reach'},st(24),{wait:300},{shot:'ba_rs_pull'},st(8),{wait:300},{shot:'ba_rs_ride'},{click:'Game zoom'},{wait:300},{shot:'ba_rs_ride_gz'},{click:'Side'},{wait:300},{shot:'ba_rs_ride_side'},{click:'Close'},st(12),{wait:300},{shot:'ba_rs_land'},st(5),{wait:300},{shot:'ba_rs_hit'},{click:'Game zoom'},st(4),{wait:300},{shot:'ba_rs_hit_gz'},st(25),{wait:300},{shot:'ba_rs_letgo_gz'},
 {click:'Rope Swing'},q(120),{click:'Close'},
 {click:'Vesper Peal'},st(50),{wait:300},{shot:'ba_vp_raise'},{click:'Game zoom'},st(8),{wait:300},{shot:'ba_vp_wind_gz'},st(4),{wait:300},{shot:'ba_vp_hit_gz'},st(14),{wait:300},{shot:'ba_vp_waves_gz'},{click:'Close'},{wait:300},{shot:'ba_vp_after'},
 {click:'Vesper Peal'},q(120),
 {click:'Rage'},st(30),{wait:300},{shot:'ba_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'ba_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'ba_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'ba_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'ba_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(20),{wait:300},{shot:'ba_death_crack'},st(170),{wait:300},{shot:'ba_death'},
 {click:'Death (press to spawn)'},st(20),{wait:300},{shot:'ba_spawn'},st(45),{wait:300},{shot:'ba_spawn_chime'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'ba_full',full:true}];
