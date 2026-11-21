const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Wails'},st(45),{wait:300},{shot:'keen_coil'},st(10),{wait:300},{shot:'keen_wail'},st(70),{wait:300},{shot:'lament_coil'},st(19),{wait:300},{shot:'lament_wail'},st(70),{wait:300},{shot:'dirge_coil'},st(19),{wait:300},{shot:'dirge_wail'},{click:'Wails'},st(60),
 {click:'Glide'},st(30),{wait:300},{shot:'glide'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{wait:300},{shot:'hurt'},st(30),
 {click:'Hover'},{click:'Death'},st(50),{wait:300},{shot:'death_mid'},st(100),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(20),{wait:300},{shot:'spawn'},st(100),
 {click:'Game zoom'},{click:'Wails'},st(54),{wait:300},{shot:'gamezoom'},{click:'Wails'},st(150),{click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
