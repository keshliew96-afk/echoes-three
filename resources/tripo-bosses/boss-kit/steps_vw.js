const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Bind'},st(36),W,{shot:'bind_spin'},st(10),st(4),W,{shot:'bind_cast'},st(20),W,{shot:'bind_haul'},st(30),W,{shot:'bind_drawn'},{click:'Bind'},st(80),
 {click:'Heartbeat Slam'},st(55),W,{shot:'slam_rear'},st(6),st(4),W,{shot:'slam_hit'},st(30),W,{shot:'slam_veins'},{click:'Heartbeat Slam'},st(80),
 {click:'Game zoom'},{click:'Brood Sacs'},st(36),st(4),W,{shot:'brood_lob'},st(40),W,{shot:'brood_fly'},st(30),W,{shot:'brood_webs'},{click:'Brood Sacs'},st(60),
 {click:'Close'},{click:'Enrage'},st(50),W,{shot:'enrage'},st(80),{click:'Walk'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Death'},st(70),W,{shot:'death_down'},st(120),W,{shot:'death_curled'},{click:'Death (press to spawn)'},st(20),W,{shot:'spawn_grow'},st(30),W,{shot:'spawn'},st(60),
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
