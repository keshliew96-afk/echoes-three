const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Bite chain'},st(4),{wait:300},{shot:'bite1'},st(42),{wait:300},{shot:'bite2_wind'},st(6),{wait:300},{shot:'bite2'},st(40),{wait:300},{shot:'bite3_wind'},st(8),{wait:300},{shot:'bite3'},{click:'Bite chain'},st(100),
 {click:'Heartbeat'},st(20),{wait:300},{shot:'swell'},st(25),{wait:300},{shot:'surge'},st(60),{wait:300},{shot:'stalkbeat'},{click:'Heartbeat'},st(140),
 {click:'Stalk'},st(30),{wait:300},{shot:'stalk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Idle'},{click:'Death'},st(50),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(20),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{click:'Bite chain'},st(50),{wait:300},{shot:'gamezoom'},{click:'Bite chain'},st(150),{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
