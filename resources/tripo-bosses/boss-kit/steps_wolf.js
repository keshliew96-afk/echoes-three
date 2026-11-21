const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Pounce'},st(30),{wait:300},{shot:'pounce_crouch'},st(16),{wait:300},{shot:'pounce_air'},st(9),{wait:300},{shot:'pounce_land'},st(40),
 {click:'Pounce'},st(70),
 {click:'Rend'},st(34),{wait:300},{shot:'rend_wind'},st(6),{wait:300},{shot:'rend_hit'},st(40),{click:'Rend'},st(60),
 {click:'Moon Howl'},st(56),{wait:300},{shot:'howl_rise'},st(12),{wait:300},{shot:'howl_cry'},st(60),{click:'Moon Howl'},st(60),
 {click:'Game zoom'},{click:'Call the pack'},st(44),{wait:300},{shot:'call'},{click:'Call the pack'},st(90),
 {click:'Close'},{click:'Enrage'},st(50),{wait:300},{shot:'enrage'},{click:'Enrage'},st(100),{wait:300},{shot:'raged_idle'},
 {click:'Walk'},st(30),{wait:300},{shot:'raged_walk'},{click:'Turn left'},st(30),{click:'Turn right'},st(20),{click:'Forward'},st(20),{click:'Enraged'},st(30),{click:'Hurt'},st(4),{click:'Heavy hit'},st(6),{wait:300},{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Death'},st(70),{wait:300},{shot:'death_mid'},st(110),{wait:300},{shot:'death'},{click:'Death (press to spawn)'},st(30),{wait:300},{shot:'spawn'},st(90),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
