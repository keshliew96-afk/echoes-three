const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},{eval:'__review.pause(true)',log:false},
 st(30),W,{shot:'idle'},
 {click:'Game zoom'},{click:'Magma Dive'},st(20),W,{shot:'dive_dig'},st(40),W,{shot:'dive_under'},st(18),W,{shot:'dive_crack'},st(4),W,{shot:'dive_burst'},st(16),W,{shot:'dive_slam'},st(30),W,{shot:'dive_spent'},{click:'Close'},st(2),W,{shot:'dive_spent_close'},{click:'Magma Dive'},st(120),
 {click:'Tail Lash'},st(40),W,{shot:'lash_coil'},st(9),W,{shot:'lash_hit'},st(6),W,{shot:'lash_through'},{click:'Game zoom'},st(1),W,{shot:'lash_zoom'},{click:'Close'},{click:'Tail Lash'},st(90),
 {click:'Game zoom'},{click:'Ember Spit'},st(15),W,{shot:'spit_rear'},st(8),W,{shot:'spit_spit'},st(30),W,{shot:'spit_fly'},st(25),W,{shot:'spit_land'},st(20),W,{shot:'spit_pools'},{click:'Close'},{click:'Ember Spit'},st(80),
 {click:'Enrage'},st(40),W,{shot:'enrage_roar'},st(36),W,{shot:'enrage_slap'},{click:'Enrage'},st(80),
 {click:'Prowl'},st(40),W,{shot:'walk'},{click:'Idle'},st(40),
 {click:'Heavy hit'},st(10),W,{shot:'heavy'},{click:'Heavy hit'},st(80),
 {click:'Death'},st(50),W,{shot:'death_thrash'},st(130),W,{shot:'death_down'},{click:'Death (press to spawn)'},st(5),W,{shot:'spawn_grow'},st(20),W,{shot:'spawn_rise'},st(40),W,{shot:'spawn_shake'},st(60),W,{shot:'spawn'},
 {click:'Side'},st(5),W,{shot:'side'},
 st(10),{shot:'full',full:true}];
