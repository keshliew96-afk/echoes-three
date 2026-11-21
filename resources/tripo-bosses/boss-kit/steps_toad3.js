const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
const W={wait:300};
module.exports=[{wait:2500},{eval:'JSON.stringify(__review.state())'},
 {eval:'__review.pause(true)',log:false},
 {click:'Side'},{click:'Belly Flop'},st(7),W,{shot:'crouch'},st(8),W,{shot:'push1'},st(7),W,{shot:'stamp1'},st(8),W,{shot:'push2'},st(7),W,{shot:'stamp2'},st(9),W,{shot:'load'},st(4),W,{shot:'off'},st(6),W,{shot:'rise'},st(4),W,{shot:'apex'},st(8),W,{shot:'fall'},st(4),W,{shot:'land'},st(40),W,{shot:'flopped'},{click:'Belly Flop'},st(90),
 {click:'Close'},{click:'Belly Flop'},st(30),W,{shot:'cl_push2'},st(24),W,{shot:'cl_apex'},{click:'Belly Flop'},st(120),
 {click:'Walk'},st(30),W,{shot:'walk'},{click:'Idle'},st(30),
 st(10),{shot:'full',full:true}];
