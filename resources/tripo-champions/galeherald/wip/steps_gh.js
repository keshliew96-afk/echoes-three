const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'gh_idle'},
 {click:'Gale Call'},st(56),{wait:300},{shot:'gh_gc_wind'},{click:'Game zoom'},{wait:300},{shot:'gh_gc_wind_gz'},st(7),{wait:300},{shot:'gh_gc_hit_gz'},{click:'Close'},st(6),{wait:300},{shot:'gh_gc_hit'},st(30),
 {click:'Gale Call'},q(100),
 {click:'Stoop'},{click:'Game zoom'},st(30),{wait:300},{shot:'gh_st_fly_gz'},{click:'Side'},st(8),{wait:300},{shot:'gh_st_fly_side'},st(28),{wait:300},{shot:'gh_st_hang_side'},{click:'Close'},st(8),{wait:300},{shot:'gh_st_hit'},{click:'Game zoom'},st(6),{wait:300},{shot:'gh_st_hit_gz'},st(40),
 {click:'Stoop'},q(100),
 {click:'Rage'},st(30),{wait:300},{click:'Close'},{wait:300},{shot:'gh_rage'},{click:'Rage'},q(90),{click:'Front'},{wait:300},{shot:'gh_enraged_front'},{click:'Enraged'},
 {click:'Walk'},q(45),{click:'Side'},{wait:300},{shot:'gh_walk_side'},{click:'Game zoom'},q(20),{wait:300},{shot:'gh_walk_gz'},
 {click:'Idle'},{click:'Close'},q(30),{click:'Heavy hit'},st(10),{wait:300},{shot:'gh_heavy'},{click:'Heavy hit'},q(90),
 {click:'Death'},st(50),{wait:300},{shot:'gh_death_stone'},st(110),{wait:300},{shot:'gh_death'},{click:'Game zoom'},{wait:300},{shot:'gh_death_gz'},
 {click:'Death (press to spawn)'},st(64),{click:'Close'},{wait:300},{shot:'gh_spawn_snap'},st(40),
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'gh_full',full:true}];
