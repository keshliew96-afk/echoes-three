const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Hollow Note'},st(30),W,{shot:'note_wind'},st(19),W,{shot:'note_hit'},{click:'Hollow Note'},st(80),
 {click:'II'},{click:'Game zoom'},{click:'Hollow Note'},st(49),st(8),W,{shot:'note_echo_zoom'},{click:'Hollow Note'},st(90),
 {click:'Close'},{click:'Sung Lance'},st(36),W,{shot:'lance_cross'},st(19),st(4),W,{shot:'lance_hit'},{click:'Game zoom'},st(1),W,{shot:'lance_zoom'},{click:'Sung Lance'},st(90),{click:'Close'},
 {click:'III'},{click:'Heart Pulse'},st(40),W,{shot:'pulse_swell'},st(21),st(3),W,{shot:'pulse_hit'},{click:'Heart Pulse'},st(90),
 {click:'Echo Step'},st(14),W,{shot:'step_fold'},st(14),st(20),W,{shot:'step_rise'},{click:'Echo Step'},st(60),
 {click:'None'},{click:'Verse'},st(36),W,{shot:'verse'},{click:'Verse'},st(80),{eval:'JSON.stringify(__review.state().lit)'},W,{shot:'verse_lit'},
 {click:'Glide'},st(30),{click:'Turn left'},st(30),{click:'Back away'},st(30),W,{shot:'back'},{click:'Forward'},st(20),{click:'Hurt'},st(4),{click:'Heavy hit'},st(12),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Death'},st(60),W,{shot:'death_mid'},st(120),W,{shot:'death'},{click:'Death (press to spawn)'},st(4),W,{shot:'spawn0'},st(60),W,{shot:'spawn'},st(60),
 {click:'Side'},{click:'Front'},{click:'Back'},{click:'Top'},W,{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},W,{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
