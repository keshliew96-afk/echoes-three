const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Swoop'},st(30),{wait:300},{shot:'coil'},st(30),{wait:300},{shot:'dive'},st(20),{wait:300},{shot:'crossed'},st(50),{wait:300},{shot:'wheel'},
 {click:'Game zoom'},st(50),{wait:300},{shot:'coil2_gz'},st(30),{wait:300},{shot:'dive2_gz'},{click:'Close'},st(130),{wait:300},{shot:'coil3'},st(30),{wait:300},{shot:'plunge'},{click:'Swoop'},st(200),
 {click:'Fly'},st(40),{wait:300},{shot:'fly'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),
 {click:'Hover'},st(60),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Death'},st(40),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
