const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Volley'},st(15),{wait:300},{shot:'v_spin'},st(30),{wait:300},{shot:'v_aim'},st(4),{wait:300},{shot:'v_dart1'},st(15),{wait:300},{shot:'v_dart3'},st(30),{wait:300},{shot:'v_fly'},
 {click:'Game zoom'},st(40),{wait:300},{shot:'v_gz'},{click:'Close'},{click:'Volley'},st(80),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),
 {click:'Idle'},st(60),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Death'},st(60),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
