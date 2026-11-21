const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'gb_idle'},
 {click:'Glass Bubble'},st(40),{wait:300},{shot:'gb_bb_blow'},{click:'Game zoom'},st(14),{wait:300},{shot:'gb_bb_swell_gz'},{click:'Close'},st(4),{wait:300},{shot:'gb_bb_full'},st(6),{wait:300},{shot:'gb_bb_lob'},st(14),{wait:300},{shot:'gb_bb_fly'},{click:'Game zoom'},st(11),{wait:300},{shot:'gb_bb_burst_gz'},st(30),{wait:300},{shot:'gb_bb_patch_gz'},{click:'Close'},{wait:300},{shot:'gb_bb_after'},
 {click:'Glass Bubble'},q(150),
 {click:'Glass Gout'},st(40),{wait:300},{shot:'gb_gg_level'},{click:'Game zoom'},st(14),{wait:300},{shot:'gb_gg_hit_gz'},st(6),{wait:300},{shot:'gb_gg_spray_gz'},{click:'Close'},{wait:300},{shot:'gb_gg_spray'},
 {click:'Glass Gout'},q(120),
 {click:'Rage'},st(33),{wait:300},{shot:'gb_rage_strike'},st(16),{wait:300},{shot:'gb_rage_howl'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'gb_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'gb_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'gb_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'gb_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(40),{wait:300},{shot:'gb_death_sag'},st(150),{wait:300},{shot:'gb_death'},
 {click:'Death (press to spawn)'},st(20),{wait:300},{shot:'gb_spawn'},st(55),{wait:300},{shot:'gb_spawn_tap'},st(60),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'gb_full',full:true}];
