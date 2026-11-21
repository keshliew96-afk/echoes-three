const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Bramble Charge'},st(50),{wait:300},{shot:'charge_couch'},st(22),{wait:300},{shot:'charge_run'},st(13),{wait:300},{shot:'charge_hit'},st(22),{wait:300},{shot:'charge_stop'},st(40),{wait:300},{shot:'charge_settle'},
 {click:'Bramble Charge'},st(80),
 {click:'Thorn Ring'},st(60),{wait:300},{shot:'ring_raise'},st(14),{wait:300},{shot:'ring_plant'},st(8),{wait:300},{shot:'ring_burst'},st(40),{wait:300},{shot:'ring_thicket'},
 {click:'Thorn Ring'},st(60),
 {click:'Game zoom'},{click:'Rage'},st(30),{wait:300},{shot:'rage'},{click:'Rage'},st(90),{wait:300},{shot:'enraged_idle'},
 {click:'Walk'},st(30),{wait:300},{shot:'walk_enraged'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Enraged'},st(30),{click:'Hurt'},st(4),{click:'Heavy hit'},st(6),{wait:300},{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Close'},{click:'Death'},st(60),{wait:300},{shot:'death_kneel'},st(110),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(40),{wait:300},{shot:'spawn_clang'},st(60),
 {click:'Side'},{wait:200},{shot:'side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
