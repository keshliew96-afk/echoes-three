const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Game zoom'},{click:'Pendulum'},st(30),W,{shot:'pend_fill'},st(26),W,{shot:'pend_swing'},st(8),W,{shot:'pend_ghost'},st(26),W,{shot:'pend_back'},{click:'Close'},st(1),W,{shot:'pend_close'},{click:'Pendulum'},st(90),
 {click:'Game zoom'},{click:'Hand Sweep'},st(30),W,{shot:'sweep_wind'},st(11),W,{shot:'sweep_hit'},{click:'Close'},st(4),W,{shot:'sweep_close'},{click:'Hand Sweep'},st(80),
 {click:'Game zoom'},{click:'Toll of the Hours'},st(40),W,{shot:'toll_rings'},st(22),W,{shot:'toll_first'},st(28),W,{shot:'toll_third'},{click:'Close'},st(1),W,{shot:'toll_close'},st(30),W,{shot:'toll_rundown'},st(60),W,{shot:'toll_wake'},{click:'Toll of the Hours'},st(60),
 {click:'Enrage'},st(50),W,{shot:'enrage_up'},st(30),W,{shot:'enrage_slam'},{click:'Enrage'},st(60),
 {click:'Glide'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(20),W,{shot:'heavy'},{click:'Heavy hit'},st(70),
 {click:'Death'},st(50),W,{shot:'death_tip'},st(110),W,{shot:'death_down'},{click:'Death (press to spawn)'},st(20),W,{shot:'spawn_rise'},st(30),W,{shot:'spawn_land'},st(60),W,{shot:'spawn'},
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
