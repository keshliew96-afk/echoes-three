const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'vm_idle'},
 {click:'Vein Lash'},{click:'Game zoom'},st(50),{wait:300},{shot:'vm_vl_wind_gz'},{click:'Close'},{wait:300},{shot:'vm_vl_wind'},st(9),{wait:300},{shot:'vm_vl_hit'},{click:'Game zoom'},st(3),{wait:300},{shot:'vm_vl_crack_gz'},st(20),{wait:300},{shot:'vm_vl_drink_gz'},
 {click:'Vein Lash'},q(120),
 {click:'Heart Pulse'},{click:'Close'},st(60),{wait:300},{shot:'vm_hp_wind'},{click:'Game zoom'},st(9),{wait:300},{shot:'vm_hp_wind_gz'},st(3),{wait:300},{shot:'vm_hp_hit_gz'},st(30),{wait:300},{shot:'vm_hp_shards_gz'},{click:'Close'},{wait:300},{shot:'vm_hp_after'},
 {click:'Heart Pulse'},q(120),
 {click:'Rage'},st(30),{wait:300},{shot:'vm_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'vm_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'vm_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'vm_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'vm_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(20),{wait:300},{shot:'vm_death_crack'},st(150),{wait:300},{shot:'vm_death'},
 {click:'Death (press to spawn)'},st(20),{wait:300},{shot:'vm_spawn'},st(45),{wait:300},{shot:'vm_spawn_beat'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'vm_full',full:true}];
