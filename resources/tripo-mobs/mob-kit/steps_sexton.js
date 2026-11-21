const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Dig a snare'},st(14),{wait:300},{shot:'dig_chop1'},st(20),{wait:300},{shot:'dig_stamp'},st(3),{wait:300},{shot:'dig_bury'},st(40),{wait:300},{shot:'dig_rise'},st(30),{wait:300},{shot:'dig_armed'},
 {click:'Game zoom'},st(10),{wait:300},{shot:'dig_gz'},{click:'Close'},{click:'Dig a snare'},st(80),
 {click:'The snare springs'},st(30),{wait:300},{shot:'spring_walk'},st(30),{wait:300},{shot:'spring_ring'},st(26),{wait:300},{shot:'spring_snap'},st(40),{wait:300},{shot:'spring_held'},{click:'The snare springs'},st(140),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),
 {click:'Idle'},st(60),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Death'},st(60),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
