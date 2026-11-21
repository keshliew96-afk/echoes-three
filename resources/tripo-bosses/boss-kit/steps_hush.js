const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Still Note'},st(30),W,{shot:'note_aim'},st(22),W,{shot:'note_hit'},{click:'Game zoom'},st(4),W,{shot:'note_zoom'},{click:'Still Note'},st(80),
 {click:'Unringing'},st(40),W,{shot:'unring_fill'},st(18),W,{shot:'unring_hit'},st(10),W,{shot:'unring_wave'},{click:'Unringing'},st(80),
 {click:'Great Hush'},st(60),W,{shot:'great_rise'},st(38),W,{shot:'great_hit'},st(30),W,{shot:'great_drained'},{click:'Close'},st(40),W,{shot:'great_drained_close'},{click:'Great Hush'},st(120),
 {click:'Stillness'},st(60),W,{shot:'still_1'},st(60),{click:'Stillness'},st(110),{click:'Stillness'},st(30),W,{shot:'still_up'},st(80),W,{shot:'still_3'},
 {click:'Game zoom'},{click:'Still Note'},st(53),W,{shot:'note_still3'},{click:'Still Note'},st(80),{click:'Close'},
 {click:'Drift'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Death'},st(50),W,{shot:'death_hang'},st(120),W,{shot:'death_down'},{click:'Death (press to spawn)'},st(5),W,{shot:'spawn_grow'},st(40),W,{shot:'spawn_rise'},st(60),W,{shot:'spawn'},
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
