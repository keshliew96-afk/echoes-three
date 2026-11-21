const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Tendril lash'},st(36),{wait:300},{shot:'lash_coil'},st(19),{wait:300},{shot:'lash_whip'},st(95),{wait:300},{shot:'lash2_coil'},st(10),{wait:300},{shot:'lash2_miss'},st(110),{wait:300},{shot:'lash3_coil'},st(10),{wait:300},{shot:'lash3_plunge'},
 {click:'Game zoom'},st(10),{wait:300},{shot:'lash_gz'},{click:'Close'},{click:'Tendril lash'},st(80),
 {click:'Drink'},st(58),{wait:300},{shot:'drink_latch'},st(60),{wait:300},{shot:'drink_gulp'},st(12),{wait:300},{shot:'drink_bead'},st(125),{wait:300},{shot:'drink_letgo'},{click:'Drink'},st(80),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),
 {click:'Idle'},st(60),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Death'},st(58),{wait:300},{shot:'death_land'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
