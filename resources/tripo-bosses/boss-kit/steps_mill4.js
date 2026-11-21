const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Game zoom'},{click:'Crosscut'},st(104),W,{shot:'cc_wall'},st(8),W,{shot:'cc_loose'},st(14),W,{shot:'cc_fall'},st(20),W,{shot:'cc_fall2'},st(30),W,{shot:'cc_land'},
 {click:'Crosscut'},st(120),W,{shot:'cc_spin'},{click:'Close'},st(2),W,{shot:'cl_gaps'},{click:'Game zoom'},st(80),W,{shot:'cc_path'},st(20),W,{shot:'cc_back'},st(40),W,{shot:'cc_home'},
 {click:'Crosscut'},st(130),{click:'Crosscut'},st(130),{eval:'JSON.stringify(__review.state())'},{click:'Roll'},st(40),W,{shot:'cc_rollgap'},st(40),W,{shot:'cc_rollgap2'},st(300),{click:'Idle'},st(200),{eval:'JSON.stringify(__review.state())'},
 {click:'Plank Spin'},st(60),{click:'Plank Spin'},st(600),W,{shot:'ps'},
 st(10),{shot:'full',full:true}];
