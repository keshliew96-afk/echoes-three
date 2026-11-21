const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Stone'},st(60),{wait:300},{shot:'stone'},
 {click:'Awake'},st(30),{wait:300},{shot:'crack'},st(22),{wait:300},{shot:'burst'},st(60),{wait:300},{shot:'awake'},
 {click:'Slam'},st(40),{wait:300},{shot:'windup'},st(16),{wait:300},{shot:'slamdown'},st(80),{click:'Slam'},st(20),
 {click:'Stalk'},st(30),{wait:300},{shot:'stalk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Stone'},st(50),{wait:300},{shot:'settle'},st(60),{click:'Stalk'},st(100),
 {click:'Awake'},{click:'Death'},st(40),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(20),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{wait:300},{shot:'gamezoom'},{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
