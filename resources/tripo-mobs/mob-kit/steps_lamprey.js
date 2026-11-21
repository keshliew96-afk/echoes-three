const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Lunge'},st(20),{wait:300},{shot:'lurk'},st(40),{wait:300},{shot:'coil'},st(26),{wait:300},{shot:'lunge_mid'},st(30),{wait:300},{shot:'beached'},st(60),{wait:300},{shot:'thrash'},st(60),{wait:300},{shot:'under'},st(60),{wait:300},{shot:'back'},{click:'Lunge'},st(60),
 {click:'Swim'},st(30),{wait:300},{shot:'swim'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Surface'},{click:'Death'},st(40),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{click:'Lunge'},st(70),{wait:300},{shot:'gamezoom'},st(60),{wait:300},{shot:'gamezoom_beach'},{click:'Lunge'},st(250),{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
