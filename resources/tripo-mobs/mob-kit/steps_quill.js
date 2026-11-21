const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 st(90),{wait:300},{shot:'tilt'},st(240),{wait:300},{shot:'hop'},st(300),{wait:300},{shot:'later'},
 {click:'Talk'},st(90),{wait:300},{shot:'talk'},{click:'Close'},st(10),{wait:300},{shot:'talk_close'},st(300),{click:'Talk'},
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},{wait:300},{shot:'top'},{click:'Game zoom'},st(5),{wait:300},{shot:'gz'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},{wait:300},{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
