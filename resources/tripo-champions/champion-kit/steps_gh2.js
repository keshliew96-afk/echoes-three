const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())',log:true});
const q=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);1',log:false});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},
 {click:'Close'},q(30),{wait:300},{shot:'gh2_idle'},
 {click:'Turn left'},q(40),{click:'Hurt'},q(6),{wait:300},{shot:'gh2_turn_hurt'},{click:'Idle'},q(30),
 {click:'Death'},st(160),{wait:300},{shot:'gh2_death'},{click:'Top'},{wait:300},{shot:'gh2_death_top'},
 {click:'Death (press to spawn)'},st(10),{click:'Close'},{wait:300},{shot:'gh2_spawn_statue'},st(54),{wait:300},{shot:'gh2_spawn_snap'},st(60),
 {click:'Bones'},{wait:300},{shot:'gh2_bones'},{click:'Bones'},{click:'Effects'},{click:'Hit feel'},{click:'Hero for scale'},{click:'Stoop'},st(80),{wait:300},{shot:'gh2_stoop_plain'},{click:'Stoop'},
 {click:'0.25×'},{click:'Pause'},{click:'Pause'},{click:'1×'},
 {eval:'document.documentElement.scrollWidth+" "+innerWidth'}];
