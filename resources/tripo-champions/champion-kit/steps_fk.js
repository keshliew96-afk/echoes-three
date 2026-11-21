const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'fk_idle'},
 {click:'Molten Rush'},{click:'Game zoom'},st(40),{wait:300},{shot:'fk_mr_warn_gz'},{click:'Close'},{wait:300},{shot:'fk_mr_crouch'},st(30),{wait:300},{shot:'fk_mr_run'},{click:'Game zoom'},st(16),{wait:300},{shot:'fk_mr_hit_gz'},st(22),{wait:300},{shot:'fk_mr_stop_gz'},{click:'Close'},{wait:300},{shot:'fk_mr_stop'},
 {click:'Molten Rush'},q(150),
 {click:'Grate Blast'},st(40),{wait:300},{shot:'fk_gb_stoke'},{click:'Game zoom'},st(26),{wait:300},{shot:'fk_gb_hit_gz'},st(8),{wait:300},{shot:'fk_gb_waves_gz'},{click:'Close'},{wait:300},{shot:'fk_gb_after'},
 {click:'Grate Blast'},q(120),
 {click:'Rage'},st(32),{wait:300},{shot:'fk_rage_slam'},st(14),{wait:300},{shot:'fk_rage_roar'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'fk_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'fk_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'fk_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'fk_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(38),{wait:300},{shot:'fk_death_drop'},st(150),{wait:300},{shot:'fk_death'},
 {click:'Death (press to spawn)'},st(20),{wait:300},{shot:'fk_spawn'},st(55),{wait:300},{shot:'fk_spawn_clang'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'fk_full',full:true}];
