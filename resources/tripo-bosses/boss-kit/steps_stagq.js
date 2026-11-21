const st=n=>({eval:`for(let i=0;i<${n};i++)__review.step(1/60);0`,log:false});
module.exports=[{wait:1500},{eval:'__review.pause(true)',log:false},{click:'Antler Quake'},st(32),{wait:400},{shot:'q1'},st(14),{wait:400},{shot:'q2'},st(8),{wait:400},{shot:'q3'}];
