const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Bone Rush'},st(40),{wait:300},{shot:'rush_wind'},st(24),{wait:300},{shot:'rush_run'},st(34),{wait:300},{shot:'rush_slam'},st(60),{wait:300},{shot:'rush_stuck'},st(18),{wait:300},{shot:'rush_free'},st(30),{click:'Bone Rush'},st(60),
 {click:'Game zoom'},{click:'Bone Rush'},st(50),{wait:300},{shot:'rush_zoom_wind'},st(48),{wait:300},{shot:'rush_zoom_slam'},{click:'Bone Rush'},st(150),
 {click:'Grave Call'},st(28),{wait:300},{shot:'call_gather'},st(8),{wait:300},{shot:'call_stamp'},st(30),{wait:300},{shot:'call_souls'},st(34),{wait:300},{shot:'call_land'},st(14),{wait:300},{shot:'call_mole'},{click:'Grave Call'},st(90),
 {click:'Close'},{click:'Grave Call'},st(34),{wait:300},{shot:'call_close'},{click:'Grave Call'},st(140),
 {click:'Enrage'},st(40),{wait:300},{shot:'enrage'},{click:'Enrage'},st(100),{wait:300},{shot:'raged_idle'},
 {click:'Block'},st(3),{wait:300},{shot:'block'},st(12),{click:'Block'},st(40),
 {click:'Walk'},st(30),{wait:300},{shot:'raged_walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Enraged'},st(30),{click:'Hurt'},st(4),{click:'Heavy hit'},st(6),{wait:300},{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Death'},st(60),{wait:300},{shot:'death_mid'},st(120),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(4),{wait:300},{shot:'spawn0'},st(50),{wait:300},{shot:'spawn'},st(70),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
