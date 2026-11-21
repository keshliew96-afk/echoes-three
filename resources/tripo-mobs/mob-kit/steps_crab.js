const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Claw hook'},st(30),{wait:300},{shot:'coil'},st(12),{wait:300},{shot:'hook'},st(30),{wait:300},{shot:'guarddown'},st(50),{click:'Claw hook'},st(20),
 {click:'Claw jab'},st(42),{wait:300},{shot:'jab'},st(70),{click:'Claw jab'},st(10),
 {click:'Scissor slam'},st(42),{wait:300},{shot:'slam'},st(70),{click:'Scissor slam'},st(20),
 {click:'Scuttle'},st(30),{wait:300},{shot:'scuttle'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Idle'},{click:'Death'},st(40),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(20),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{wait:300},{shot:'gamezoom'},{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
