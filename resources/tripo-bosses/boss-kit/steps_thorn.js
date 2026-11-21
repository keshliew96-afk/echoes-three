const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Seed Volley'},st(5),{wait:300},{shot:'volley_hit'},st(30),{wait:300},{shot:'volley_fly'},st(40),{wait:300},{shot:'volley_land'},
 {click:'Seed Volley'},st(60),
 {click:'Briar Charge'},st(45),{wait:300},{shot:'charge_paw'},st(22),{wait:300},{shot:'charge_hit'},st(12),{wait:300},{shot:'charge_run'},st(16),{wait:300},{shot:'charge_stop'},st(40),{wait:300},{shot:'charge_skid'},
 {click:'Briar Charge'},st(80),
 {click:'Game zoom'},{click:'Call the wood'},st(34),{wait:300},{shot:'call'},{click:'Call the wood'},st(90),
 {click:'Walk'},st(30),{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Hurt'},st(4),{click:'Heavy hit'},st(6),{wait:300},{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Close'},{click:'Death'},st(100),{wait:300},{shot:'death'},st(80),{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(90),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
