const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Horn slams'},st(40),{wait:300},{shot:'coil1'},st(21),{wait:300},{shot:'hit1'},st(80),{wait:300},{shot:'coil2'},st(19),{wait:300},{shot:'hit2'},st(140),{wait:300},{shot:'coil3'},st(17),{wait:300},{shot:'hit3'},st(60),
 {click:'Game zoom'},st(40),{wait:300},{shot:'coil_gz'},{click:'Close'},{click:'Horn slams'},st(200),
 {click:'Block'},st(10),{wait:300},{shot:'block_shot'},st(7),{wait:300},{shot:'block'},{click:'Block'},st(40),
 {click:'Walk'},st(30),{wait:300},{shot:'walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),
 {click:'Idle'},st(60),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Death'},st(40),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(100),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
