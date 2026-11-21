const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Game zoom'},{click:'Plank Spin'},st(72),W,{shot:'gz_fly'},st(78),W,{shot:'gz_bare'},st(165),W,{shot:'gz_path'},st(30),W,{shot:'gz_path2'},st(20),W,{shot:'gz_back'},st(18),W,{shot:'gz_back2'},st(20),W,{shot:'gz_back3'},st(20),W,{shot:'gz_home'},st(30),W,{shot:'gz_kick'},st(40),W,{shot:'gz_settle'},{click:'Plank Spin'},st(60),
 {click:'Close'},{click:'Plank Spin'},st(150),W,{shot:'cl_bare'},st(190),W,{shot:'cl_back'},st(40),W,{shot:'cl_home'},{click:'Plank Spin'},st(140),
 {click:'Roll'},st(60),W,{shot:'roll'},{click:'Idle'},st(80),{click:'Crosscut'},st(80),W,{shot:'cc'},{click:'Crosscut'},st(220),
 {click:'Death'},st(180),{click:'Death (press to spawn)'},st(100),W,{shot:'spawn'},
 st(10),{shot:'full',full:true}];
