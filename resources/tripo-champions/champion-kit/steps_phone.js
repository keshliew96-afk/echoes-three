const st=(n)=>({eval:'for(let i=0;i<'+n+';i++)__review.step(1/60);JSON.stringify(__review.state())'});
module.exports=[{wait:2500},{eval:'__review.pause(true)',log:false},{click:process.env.ACT},st(+process.env.N||40),{wait:300},{shot:'act'},{eval:'document.documentElement.scrollWidth+" "+innerWidth'},{shot:'full',full:true}];
