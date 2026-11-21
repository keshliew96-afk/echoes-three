const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{shot:'idle'},
 {eval:'__review.pause(true)',log:false},
 {click:'Fissure'},st(40),W,{shot:'fis_raise'},st(14),W,{shot:'fis_hit'},st(12),W,{shot:'fis_crack'},{click:'Game zoom'},st(1),W,{shot:'fis_zoom'},{click:'Fissure'},st(60),{click:'Close'},
 {click:'Geode Rain'},st(28),W,{shot:'rain_load'},st(6),W,{shot:'rain_hurl'},st(40),W,{shot:'rain_rings'},{click:'Game zoom'},st(30),W,{shot:'rain_fall'},{click:'Geode Rain'},st(40),W,{shot:'rain_land'},st(60),{click:'Close'},
 {click:'Geode Burst'},st(50),W,{shot:'burst_swell'},st(11),W,{shot:'burst_hit'},st(60),W,{shot:'burst_spent'},{click:'Geode Burst'},st(90),
 {click:'Enrage'},st(42),W,{shot:'enrage_beat'},st(50),W,{shot:'enrage_slam'},{click:'Enrage'},st(60),
 {click:'Geode Burst'},st(61),W,{shot:'burst_shards'},st(20),W,{shot:'burst_shards2'},{click:'Geode Burst'},st(150),{click:'Enraged'},
 {click:'Walk'},st(20),W,{shot:'walk'},{click:'Turn left'},st(15),W,{shot:'turnL'},{click:'Turn right'},st(15),{click:'Forward'},st(20),{click:'Hurt'},st(4),W,{shot:'hurt'},{click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Idle'},{click:'Death'},st(90),W,{shot:'death_mid'},st(120),W,{shot:'death'},{click:'Death (press to spawn)'},st(4),W,{shot:'spawn0'},st(55),W,{shot:'spawn_slam'},st(60),
 {click:'Side'},W,{shot:'side'},{click:'Front'},{click:'Back'},W,{shot:'back'},{click:'Top'},W,{shot:'top'},{click:'Close'},
 {click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'Bones'},W,{shot:'bones'},{click:'Bones'},{click:'Hit feel'},{click:'Effects'},{click:'Hero for scale'},{click:'0.25×'},{click:'1×'},{click:'Pause'},{click:'Pause'},
 st(10),{shot:'full',full:true}];
