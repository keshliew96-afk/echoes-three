const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Horn Rush'},st(24),W,{shot:'rush_rear'},st(20),W,{shot:'rush_paw'},{click:'Game zoom'},st(30),W,{shot:'rush_run'},st(28),W,{shot:'rush_wall'},st(40),W,{shot:'rush_dazed'},{click:'Close'},st(46),W,{shot:'rush_shake'},{click:'Horn Rush'},st(80),
 {click:'Bell Toll'},st(40),W,{shot:'toll_lift'},st(12),W,{shot:'toll_hit'},st(16),W,{shot:'toll_after'},{click:'Bell Toll'},st(80),
 {click:'Game zoom'},{click:'Sky Leap'},st(30),W,{shot:'leap_crouch'},st(25),W,{shot:'leap_air'},st(18),W,{shot:'leap_land'},st(12),W,{shot:'leap_shards'},{click:'Sky Leap'},st(80),
 {click:'Close'},{click:'Enrage'},st(40),W,{shot:'enrage'},st(80),{click:'Walk'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Death'},st(70),W,{shot:'death_fall'},st(120),W,{shot:'death_down'},{click:'Death (press to spawn)'},st(5),W,{shot:'spawn_grow'},st(60),W,{shot:'spawn'},st(60),
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
