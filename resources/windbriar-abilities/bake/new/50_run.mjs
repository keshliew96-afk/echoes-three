
// ---------------------------------------------------------------- the run, as a bound (Kesh, 2026-11-18: "then change it"; it replaces the passed alternating run on this page)
// Both hind paws land together ahead of her (leg 42 deg forward), stay where they landed while her body passes over them, and push off 48 deg behind: 0.108 s on the floor.
// Then 0.252 s in the air: the legs trail, fold through under her and reach forward for the next landing. sin(leg angle) runs straight in time on the floor, so a planted paw
// goes back under her at one speed (0.2965 model units in 0.108 s); the page plays the loop at her travel speed over that, and the paws do not slide.
{const Tb=0.36, Ts=0.108, LL=0.21, R2D=180/Math.PI, TH0=-42, TH1=48, s0=Math.sin(TH0/R2D), s1=Math.sin(TH1/R2D);
 const smk=(x)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
 const keyed=(K,u)=>{for(let i=0;i<K.length-1;i++)if(u<=K[i+1][0]){const a=K[i],b=K[i+1];return a[1]+(b[1]-a[1])*smk((u-a[0])/(b[0]-a[0]));}return K[K.length-1][1];};
 const FLY_LEG=[[0,TH1],[0.2,63],[0.52,6],[0.82,-53],[1,TH0]], FLY_FOOT=[[0,-TH1+38],[0.2,36],[0.6,46],[1,-TH0]];
 const pf=(us)=>38*Math.max(0,(us-0.55)/0.45)**2;                                   // the heel peels off at the end of the push
 const hipS=(us)=>{const th=Math.asin(s0+(s1-s0)*us);return -LL*(1-Math.cos(th))-0.012-0.03*Math.sin(Math.PI*us)+0.095*Math.sin(pf(us)/R2D);};
 const Y0=hipS(1), Y1=hipS(0), HOP=0.11;
 NEW.run={T:Tb,loop:true,air:[[Ts+0.006,Tb-0.006]],fn:(t,T)=>{t=((t%Tb)+Tb)%Tb; const st=t<Ts, us=t/Ts, uf=(t-Ts)/(Tb-Ts);
   const th=st?Math.asin(s0+(s1-s0)*us)*R2D:keyed(FLY_LEG,uf), ft=st?-th+pf(us):keyed(FLY_FOOT,uf), y=st?hipS(us):Y0+(Y1-Y0)*uf+HOP*4*uf*(1-uf);
   const a=Math.cos(2*Math.PI*(t-Ts*0.5)/Tb), a2=Math.cos(2*Math.PI*(t-Ts*0.5-0.03)/Tb), a3=Math.cos(2*Math.PI*(t-Ts*0.5-0.07)/Tb), q=Math.sin(2*Math.PI*(t-Ts*0.5)/Tb);
   return {_hips:[0,y,0], hips:[5*q,0,0], spine:[21+10*a,0,0], chest:[5+5*a2,-5,0], head:[-24-12*a2,5,0],
     legL:[th-2,0,4], legR:[th+2,0,-4], footL:[ft,0,0], footR:[ft,0,0],
     upperarmR:[6+34*q,0,-6-4*a], forearmR:[-46+16*a2,0,0], handR:[-10*a3,0,0], upperarmL:[-12+7*a,0,5], forearmL:[-26+6*a2,0,0], handL:[4*a2,0,0],
     tail1:[14+14*a2,0,0], earL:[-30+17*a2,0,3*a3], earR:[-30+17*a3,0,-3*a2], earL2:[-18+20*a3,0,0], earR2:[-18+20*Math.cos(2*Math.PI*(t-Ts*0.5-0.1)/Tb),0,0]};}};}
// the hip shot at a run: the bound's legs and bounce, the bow flat at her hip riding up and down with her (its pose written every 1/120 s), three snap shots to a bound
{const R=NEW.run, n=3, d=R.T/n, D=[], SP=[]; const sm=(x)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
 for(let i=0;i<n;i++){const b=i*d; D.push({t:+b.toFixed(4),d:0.12,a:1,h:1},{t:+(b+0.062).toFixed(4),d:0.42,a:1,h:1},{t:+(b+0.072).toFixed(4),d:0.44,a:1,h:1},{t:+(b+0.084).toFixed(4),d:-0.07,a:0,h:1,ease:'lin'},{t:+(b+0.105).toFixed(4),d:0.03,a:1,h:1});}
 D.push({t:R.T,d:0.12,a:1,h:1});
 for(let f=0;f<=Math.round(R.T*120);f++){const t=Math.min(R.T,f/120), ph=t%d; let k=0.25*(1-sm(ph/0.07)), up=0; if(ph>=0.072&&ph<0.095){const e=(ph-0.072)/0.023;k=-0.5*e;up=0.01*e;} else if(ph>=0.095){const e=sm((ph-0.095)/(d-0.095));k=-0.5+0.75*e;up=0.01*(1-e);}
   const P=HIPP(k,up), y=R.fn(t,R.T)._hips[1]; SP.push({t:+t.toFixed(4),p:[P.p[0],P.p[1]+y,P.p[2]],d:P.d,n:P.n,ease:'lin'});}
 NEW.gHipRun={T:R.T,loop:true,air:R.air,draw:{keys:D},offHand:{from:-0.3,to:0.7,fade:0.05,keys:[{t:0,p:[0.02,-0.06,0.12],b:'chest'},{t:R.T,p:[0.02,-0.06,0.12],b:'chest'}]},staffPose:{from:-0.3,to:0.7,fade:0.05,keys:SP},
  keys:[{t:0,p:{}},{t:R.T,p:{}}],fn:(t,T)=>{const o=R.fn(t,T);return {_hips:o._hips,hips:o.hips,legL:o.legL,legR:o.legR,footL:o.footL,footR:o.footR,spine:[o.spine[0]-16,0,0],chest:[o.chest[0]-5,-10,0],head:[o.head[0]+14,8,0],tail1:o.tail1,earL:o.earL,earR:o.earR,earL2:o.earL2,earR2:o.earR2};}};}
