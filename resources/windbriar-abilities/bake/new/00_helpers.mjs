
// ==================================================================== Windbriar ability page clips (appended to the passed clips.mjs)
// Root travel, lifts, flips and spins are done by the page (it turns her whole body about her middle); these keys are the body.
const rotAx=(v,ax,deg)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),[x,y,z]=v,[u,w,q]=ax,d=u*x+w*y+q*z;
  return [u*d*(1-c)+x*c+(-q*y+w*z)*s, w*d*(1-c)+y*c+(q*x-u*z)*s, q*d*(1-c)+z*c+(-w*x+u*y)*s];};
const turnP=(P,ax,deg)=>({...P,p:P.p,d:rotAx(P.d,ax,deg),n:rotAx(P.n,ax,deg)});
const moveP=(P,dp)=>({...P,p:[P.p[0]+dp[0],P.p[1]+dp[1],P.p[2]+dp[2]]});
// the bow spun round its grip: keys every 1/40 s, straight between
const spinKeys=(P,t0,t1,ax,turns=1,e='s')=>{const ks=[];const n=Math.max(4,Math.round((t1-t0)*40));for(let i=0;i<=n;i++){const u=i/n,ue=e==='s'?u*u*(3-2*u):u;ks.push({t:+(t0+(t1-t0)*u).toFixed(4),...turnP(P,ax,360*turns*ue),ease:'lin'});}return ks;};
// a level aim pitched down (deg > 0) or up (deg < 0)
const AIMD=(deg,k=0,dp=[0,0,0])=>{const P=LEVEL(k);return moveP(turnP(P,[1,0,0],deg),dp);};
const BEHIND={p:[0.02,0.40,-0.17],d:[0.98,0.18,0.05],n:[0,0,1]};       // the bow across the small of her back
const SHOULDER={p:[0.16,0.62,0.02],d:[0.15,0.25,-0.95],n:[1,0,0]};     // the bow resting back over her left shoulder
const STAFF=(yaw,dy=0)=>{const a=yaw*Math.PI/180;return {p:[0.06*Math.cos(a),0.50+dy,0.20+0.06*Math.sin(a)],d:[Math.cos(a),0.0,Math.sin(a)],n:[0,1,0]};}; // the bow held level like a staff
const KEEP=new Set(['idle','run','combo','combo1','combo2','combo3','dash','castPoint','castBloom','castPlant','castSweep','vault','hurt','walk']);
for(const k of Object.keys(CLIPS))if(!KEEP.has(k))delete CLIPS[k];
// handy body poses
const CROUCH={_hips:[0,-0.13,-0.03],spine:[24,0,0],chest:[6,0,0],head:[-18,0,0],legL:[-36,0,8],footL:[38,0,0],legR:[-36,0,-8],footR:[38,0,0],earL:[22,0,6],earR:[22,0,-6],upperarmR:[26,0,0],forearmR:[-10,0,0]};
const TUCK={spine:[38,0,0],chest:[15,0,0],head:[24,0,0],legL:[-98,0,10],footL:[6,0,0],legR:[-104,0,-10],footR:[6,0,0],earL:[4,0,0],earR:[4,0,0],upperarmR:[-40,0,10],forearmR:[-74,0,0]};
const AIRAIM=mix(STANCE,{_hips:[0,0,0],legL:[-40,0,7],footL:[18,0,0],legR:[22,0,-7],footR:[30,0,0],earL:[-14,0,0],earR:[-14,0,0]});   // drawn in the air, side-on, legs split
const LAND={_hips:[0,-0.14,0.0],spine:[30,0,0],chest:[8,0,0],head:[-12,0,0],legL:[-38,0,11],footL:[40,0,0],legR:[-38,0,-11],footR:[40,0,0],earL:[36,0,8],earR:[36,0,-8],upperarmR:[30,0,0],forearmR:[-14,0,0]};
const EARS=(a,b=a)=>({earL:[a,0,0],earR:[a,0,0],earL2:[b,0,0],earR2:[b,0,0]});
const add=(a,b)=>{const o={...a};for(const k in b){const A=o[k]||[0,0,0],B=b[k];o[k]=[A[0]+B[0],A[1]+B[1],A[2]+B[2]];}return o;};
const NEW={};
