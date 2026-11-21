const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Dart'},st(30),{wait:300},{shot:'coil'},st(12),{wait:300},{shot:'release'},st(14),{wait:300},{shot:'hit'},st(30),{wait:300},{shot:'pullup'},{click:'Dart'},st(60),
 {click:'Dart string'},st(131),{wait:300},{shot:'corkscrew'},st(86),{wait:300},{shot:'plunge'},{click:'Dart string'},st(120),
 {click:'Buzz'},st(20),{wait:300},{shot:'buzz'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Hover'},{click:'Death'},st(22),{wait:300},{shot:'death_mid'},st(110),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(20),{wait:300},{shot:'spawn'},st(90),
 {click:'Game zoom'},{wait:300},{shot:'gamezoom'},{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
