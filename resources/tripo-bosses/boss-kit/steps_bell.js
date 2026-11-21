const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Molten Pour'},st(40),W,{shot:'pour_fill'},st(22),W,{shot:'pour_hit'},st(16),W,{shot:'pour_run'},{click:'Game zoom'},st(10),W,{shot:'pour_zoom'},{click:'Molten Pour'},st(60),W,{shot:'pour_pools'},st(60),
 {click:'Close'},{click:'Bell Drop'},st(40),W,{shot:'bell_up'},st(10),W,{shot:'bell_fly'},st(15),W,{shot:'bell_hit'},{click:'Bell Drop'},st(80),
 {click:'The Firing'},st(30),W,{shot:'fire_set'},st(50),W,{shot:'fire_stoke'},st(17),W,{shot:'fire_hit'},st(50),W,{shot:'fire_quench'},{click:'Game zoom'},st(4),W,{shot:'fire_quench_zoom'},{click:'Close'},{click:'The Firing'},st(170),W,{shot:'fire_lift'},st(60),
 {click:'Casting'},st(30),W,{shot:'cast_tip'},st(22),W,{shot:'cast_crack'},{click:'Casting'},st(80),
 {click:'III'},{click:'Game zoom'},{click:'Bell Drop'},st(56),W,{shot:'bell_c3'},{click:'Bell Drop'},st(80),{click:'Close'},
 {click:'Walk'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Death'},st(45),W,{shot:'death_drop'},st(130),W,{shot:'death_down'},{click:'Death (press to spawn)'},st(5),W,{shot:'spawn_grow'},st(40),W,{shot:'spawn_rise'},st(60),W,{shot:'spawn'},
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
