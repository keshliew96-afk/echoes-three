const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state().cc)'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},{click:'Game zoom'},
 {click:'Crosscut'},st(112),st(60),st(120),st(120),st(120),st(120),st(120),st(120),W,{shot:'m5_many'},{click:'Crosscut'},{click:'Top'},st(1),W,{shot:'m5_top'},st(600),{eval:'JSON.stringify(__review.state())'},
 {eval:'Math.random=()=>0.99',log:false},{click:'Game zoom'},{click:'Crosscut'},st(112),st(20),W,{shot:'m5_three'},{click:'Crosscut'},st(600),
 {eval:'Math.random=()=>0.0',log:false},{click:'Crosscut'},st(112),st(20),W,{shot:'m5_one'},{click:'Crosscut'},st(10)];
