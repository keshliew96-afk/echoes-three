const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Flail sweep'},st(40),{wait:300},{shot:'whirl1'},st(22),{wait:300},{shot:'sweep1'},st(110),{wait:300},{shot:'whirl2'},{click:'Game zoom'},st(115),{wait:300},{shot:'slam_gz'},{click:'Close'},st(10),{wait:300},{shot:'slam'},{click:'Flail sweep'},st(60),
 {click:'Sack toss'},st(26),{wait:300},{shot:'reach'},st(6),{wait:300},{shot:'throw1'},st(30),{wait:300},{shot:'flight'},{click:'Game zoom'},st(32),{wait:300},{shot:'landed_gz'},{click:'Close'},{click:'Sack toss'},st(300),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Idle'},{click:'Death'},st(50),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
