const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Lance'},st(30),{wait:300},{shot:'aim1'},st(25),{wait:300},{shot:'lance1'},st(20),{wait:300},{shot:'reform1'},st(66),{wait:300},{shot:'aim2'},st(19),{wait:300},{shot:'lance2'},st(86),{wait:300},{shot:'aim3'},st(19),{wait:300},{shot:'lance3'},{click:'Lance'},st(80),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Idle'},{click:'Death'},st(50),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{click:'Lance'},st(50),{wait:300},{shot:'gamezoom'},st(6),{wait:300},{shot:'gamezoom_lance'},{click:'Lance'},st(250),{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
