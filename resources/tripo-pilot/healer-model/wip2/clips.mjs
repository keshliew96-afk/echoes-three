// Euler degrees XYZ, added to BASE. +x is her left, +y up, +z forward.
export const BASE={
  upperarmR:[-8,26,8], forearmR:[-10,22,0],
  upperarmL:[0,-8,-22], forearmL:[0,-10,-4],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tailSway=(t,T,amp,lag=0.12)=>{const o={};for(let i=1;i<=5;i++)o['tail'+i]=[0,amp*S(t,T,lag*i)*(0.6+0.15*i),0];return o;};
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0,0.010*c2-0.006,0], hips:[0,0,-3*dir*s], spine:[1,0,2.5*dir*s], chest:[0,0,1.5*dir*s], head:[1.5*c2,0,-3*dir*s],
    upperarmL:[0,0,(dir>0?5:-3)*s], upperarmR:[0,0,(dir>0?3:-5)*s],
    earL:[4*S(t,T/2,0.2),0,0], earR:[4*S(t,T/2,0.2),0,0], ...tailSway(t,T,10)};
  o['leg'+lead]=[-12*Math.max(0,c),0,22*dir*s]; o["leg"+trail]=[-12*Math.max(0,-c),0,-20*dir*s];
  o['foot'+lead]=[8*Math.max(0,c),0,0]; o['foot'+trail]=[8*Math.max(0,-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-6*d],head:[-4,0,14*d],_hips:[0.06*d*k,0.06,0],earL:[0,0,16*d],earR:[0,0,16*d],tail1:[0,-22*d,0],tail2:[0,-18*d,0]};
    p['leg'+L]=[-18,0,24*d];p['leg'+R]=[6,0,-26*d];p['upperarm'+R]=[0,0,-(R==='L'?-1:1)*28];p['upperarm'+L]=[10,0,0];return p;};
  const crouch={spine:[4,0,8*d],_hips:[-0.02*d,-0.035,0]};crouch['leg'+L]=[0,0,-6*d];crouch['leg'+R]=[0,0,8*d];
  const land={spine:[2,0,-6*d],_hips:[0.03*d,-0.03,0],earL:[0,0,-10*d],earR:[0,0,-10*d],head:[0,0,4*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.42,p:air(1.15)},{t:0.54,ease:'in',p:land},{t:0.7,p:{}}];}
let rel=null;
export const CLIPS={
  idle:{T:2.4,loop:true,fn:(t,T)=>({
    _hips:[0,0.006*S(t,T),0], spine:[1.5*S(t,T),0,0], chest:[1.5*S(t,T,0.08),0,0], head:[-2*S(t,T,0.12),3*S(t,T*2,0.1),0],
    earL:[0,0,5*bump(t,1.3,0.07)-9*bump(t,1.42,0.08)], earR:[0,0,-4*bump(t,0.5,0.07)+8*bump(t,0.62,0.08)],
    upperarmL:[2*S(t,T,0.1),0,-2*S(t,T)], upperarmR:[1.5*S(t,T,0.05),0,0], ...tailSway(t,T,7),
  })},
  walk:{T:0.7,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.012*c2-0.006,0], hips:[0,5*s,2.5*s], spine:[5,-3*s,-2*s], chest:[0,-6*s,0], head:[-3+2*c2,4*s,0],
    legL:[-30*s,0,0], legR:[30*s,0,0], footL:[Math.max(0,-18*S(t,T,0.15)),0,0], footR:[Math.max(0,18*S(t,T,0.15)),0,0],
    upperarmL:[24*s,0,0], forearmL:[-10+8*s,0,0], upperarmR:[-5*s,0,0],
    earL:[5*S(t,T/2,0.2),0,0], earR:[5*S(t,T/2,0.2),0,0], ...tailSway(t,T,12),
  };}},
  walkBack:{T:0.76,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.010*c2-0.006,0], hips:[0,-4*s,2*s], spine:[-4,2*s,-1.5*s], chest:[0,4*s,0], head:[3+1.5*c2,-3*s,0],
    legL:[-30*s+4,0,0], legR:[30*s+4,0,0], footL:[Math.min(0,14*S(t,T,0.1))*-1*0-10*Math.max(0,-s),0,0], footR:[-10*Math.max(0,s),0,0],
    upperarmL:[14*s,0,-4], forearmL:[-6,0,0], upperarmR:[-3*s,0,0],
    earL:[-4*S(t,T/2,0.2),0,0], earR:[-4*S(t,T/2,0.2),0,0], ...tailSway(t,T,9),
  };}},
  walkLeft:{T:0.7,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.7,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  combo:{T:1.7,keys:[
    {t:0,p:{}},
    {t:0.12,p:{upperarmR:[-55,-20,0],forearmR:[-15,0,0],chest:[-4,-18,0],head:[0,12,0],spine:[-4,-6,0],upperarmL:[10,0,-10],_hips:[0,-0.01,0]}},
    {t:0.24,ease:'in',p:{upperarmR:[48,30,0],forearmR:[8,8,0],chest:[8,20,0],head:[2,-12,0],spine:[10,8,0],upperarmL:[30,0,-25],_hips:[0,-0.02,0.02],legR:[-12,0,0]}},
    {t:0.40,p:{upperarmR:[40,38,0],forearmR:[8,10,0],chest:[6,24,0],head:[2,-14,0],spine:[8,8,0],upperarmL:[25,0,-20],_hips:[0,-0.025,0.02]}},
    {t:0.56,ease:'in',p:{upperarmR:[30,-50,0],forearmR:[0,-12,0],chest:[2,-24,0],head:[0,14,0],spine:[2,-10,0],upperarmL:[-15,0,-5],_hips:[0,0.0,0.02],legL:[-10,0,0]}},
    {t:0.76,p:{upperarmR:[-30,-30,0],forearmR:[-20,0,0],chest:[-8,-10,0],head:[-4,6,0],spine:[-8,-4,0],upperarmL:[-20,0,10],_hips:[0,-0.035,0.01]}},
    {t:0.94,p:{upperarmR:[-78,-5,0],forearmR:[-25,0,0],upperarmL:[-60,0,25],forearmL:[-20,0,0],chest:[-12,0,0],spine:[-10,0,0],_hips:[0,0.13,0.03],legL:[-25,0,0],legR:[20,0,0],footL:[20,0,0],head:[-6,0,0],earL:[-15,0,0],earR:[-15,0,0]}},
    {t:1.07,ease:'in',p:{upperarmR:[62,8,0],forearmR:[10,0,0],upperarmL:[20,0,-15],chest:[14,0,0],spine:[16,0,0],_hips:[0,-0.04,0.05],legL:[-22,0,0],legR:[14,0,0],head:[-8,0,0],earL:[18,0,0],earR:[18,0,0]}},
    {t:1.3,p:{upperarmR:[52,8,0],forearmR:[6,0,0],chest:[10,0,0],spine:[12,0,0],_hips:[0,-0.03,0.04],legL:[-16,0,0],legR:[10,0,0],head:[-6,0,0]}},
    {t:1.7,p:{}},
  ],fn:(t,T)=>tailSway(t,0.85,10)},
  dash:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[-8,0,0],_hips:[0,-0.035,-0.02],legL:[10,0,0],legR:[10,0,0]}},
    {t:0.2,ease:'out',p:{spine:[26,0,0],chest:[10,0,0],head:[-22,0,0],_hips:[0,0.06,0.06],legL:[-42,0,0],legR:[38,0,0],footR:[30,0,0],upperarmL:[55,0,-10],forearmL:[10,0,0],upperarmR:[25,-10,0],earL:[-28,0,0],earR:[-28,0,0],tail1:[-25,0,0],tail2:[-10,-20,0],tail3:[0,-20,0]}},
    {t:0.42,p:{spine:[24,0,0],chest:[8,0,0],head:[-20,0,0],_hips:[0,0.05,0.07],legL:[30,0,0],legR:[-40,0,0],footL:[30,0,0],upperarmL:[50,0,-10],upperarmR:[22,-10,0],earL:[-25,0,0],earR:[-25,0,0],tail1:[-25,0,0],tail2:[-10,-20,0],tail3:[0,-20,0]}},
    {t:0.54,ease:'in',p:{spine:[10,0,0],_hips:[0,-0.03,0.03],legL:[-12,0,0],legR:[8,0,0],earL:[14,0,0],earR:[14,0,0],head:[4,0,0]}},
    {t:0.7,p:{}},
  ]},
  dashBack:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[8,0,0],_hips:[0,-0.035,0.02],legL:[-8,0,0],legR:[-8,0,0]}},
    {t:0.2,ease:'out',p:{spine:[-20,0,0],chest:[-6,0,0],head:[16,0,0],_hips:[0,0.06,-0.06],legL:[-38,0,0],legR:[-22,0,0],footL:[-20,0,0],upperarmL:[-45,0,-10],forearmL:[-15,0,0],upperarmR:[-18,0,0],earL:[26,0,0],earR:[26,0,0],tail1:[20,0,0],tail2:[10,-15,0]}},
    {t:0.42,p:{spine:[-18,0,0],chest:[-5,0,0],head:[14,0,0],_hips:[0,0.05,-0.07],legL:[-24,0,0],legR:[-36,0,0],footR:[-20,0,0],upperarmL:[-40,0,-10],upperarmR:[-16,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[20,0,0],tail2:[10,-15,0]}},
    {t:0.54,ease:'in',p:{spine:[-6,0,0],_hips:[0,-0.03,-0.03],legL:[10,0,0],legR:[6,0,0],earL:[-12,0,0],earR:[-12,0,0],head:[-3,0,0]}},
    {t:0.7,p:{}},
  ]},
  dashLeft:{T:0.7,keys:sideDash(1)},
  dashRight:{T:0.7,keys:sideDash(-1)},
  castPoint:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.12,p:{upperarmR:[-40,-10,0],forearmR:[-25,0,0],chest:[-5,-12,0],head:[0,8,0],spine:[-4,0,0],upperarmL:[10,0,-8]}},
    {t:0.22,ease:'in',p:{upperarmR:[58,10,0],forearmR:[12,-8,0],chest:[8,12,0],head:[-4,-8,0],spine:[8,0,0],upperarmL:[30,0,-15],_hips:[0,-0.015,0.02]}},
    {t:0.5,p:{upperarmR:[52,10,0],forearmR:[10,-8,0],chest:[6,10,0],head:[-3,-6,0],spine:[6,0,0],upperarmL:[26,0,-12],_hips:[0,-0.012,0.02]}},
    {t:0.8,p:{}},
  ]},
  castBloom:{T:1.1,keys:[
    {t:0,p:{}},
    {t:0.14,p:{spine:[8,0,0],_hips:[0,-0.04,0],upperarmR:[20,10,0],upperarmL:[20,0,-15],head:[8,0,0]}},
    {t:0.3,ease:'out',p:{spine:[-10,0,0],chest:[-8,0,0],head:[-14,0,0],_hips:[0,0.05,0],upperarmR:[-70,-30,0],forearmR:[-20,-10,0],handR:[62,0,0],upperarmL:[-20,0,115],forearmL:[0,0,10],earL:[-12,0,8],earR:[-12,0,-8],legL:[-6,0,0],legR:[6,0,0]}},
    {t:0.75,p:{spine:[-8,0,0],chest:[-6,0,0],head:[-12,0,0],_hips:[0,0.02,0],upperarmR:[-66,-30,0],forearmR:[-18,-10,0],handR:[58,0,0],upperarmL:[-18,0,110],forearmL:[0,0,10]}},
    {t:1.1,p:{}},
  ]},
  castPlant:{T:1.1,keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-8,0,0],head:[-8,0,0],_hips:[0,0.04,0],upperarmR:[-48,8,-10],forearmR:[-30,10,0],handR:[55,0,0],upperarmL:[-60,-40,0],forearmL:[-30,-30,0]}},
    {t:0.32,ease:'in',p:{spine:[14,0,0],chest:[6,0,0],head:[2,0,0],_hips:[0,-0.06,0.02],upperarmR:[10,14,6],forearmR:[10,10,0],upperarmL:[-25,-50,0],forearmL:[-20,-40,0],legL:[-14,0,4],legR:[10,0,-4],earL:[16,0,0],earR:[16,0,0]}},
    {t:0.75,p:{spine:[12,0,0],chest:[5,0,0],head:[0,0,0],_hips:[0,-0.05,0.02],upperarmR:[8,14,6],forearmR:[8,10,0],upperarmL:[-25,-50,0],forearmL:[-20,-40,0],legL:[-12,0,4],legR:[8,0,-4]}},
    {t:1.1,p:{}},
  ]},
  castSweep:{T:0.9,keys:[
    {t:0,p:{}},
    {t:0.14,p:{upperarmR:[35,-60,0],forearmR:[5,-20,0],chest:[0,-30,0],head:[0,20,0],spine:[2,-10,0],upperarmL:[0,0,-10],_hips:[0,-0.02,0]}},
    {t:0.32,ease:'in',p:{upperarmR:[45,50,0],forearmR:[8,15,0],chest:[4,32,0],head:[0,-20,0],spine:[6,12,0],upperarmL:[20,0,25],_hips:[0,-0.03,0.02],legR:[-10,0,0]}},
    {t:0.55,p:{upperarmR:[40,56,0],forearmR:[8,16,0],chest:[4,34,0],head:[0,-20,0],spine:[6,12,0],upperarmL:[16,0,20],_hips:[0,-0.03,0.02]}},
    {t:0.9,p:{}},
  ]},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-14,0,0],head:[-12,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-20,0,30],upperarmR:[-15,-20,0],earL:[18,0,0],earR:[18,0,0]}},
    {t:0.3,p:{hips:[28,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.06,0.02],legL:[-36,0,0],legR:[-30,0,0],upperarmL:[-40,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.55,ease:'in',p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0],_hips:[0,-0.21,0.05]}},
    {t:0.66,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0],_hips:[0,-0.18,0.05],head:[-70,0,0]}},
    {t:0.8,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},{t:3.0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-5,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],earL:[0,0,4*bump(t,1.6,0.08)],tail2:[0,8*S(t,T),0],tail3:[0,10*S(t,T,0.1),0],tail4:[0,10*S(t,T,0.2),0]})},
  revive:{T:1.1,keys:[
    {t:0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-95,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[0,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},
    {t:0.35,p:{hips:[48,0,0],spine:[6,0,0],head:[-40,0,0],_hips:[0,-0.15,0.03],legL:[-60,0,4],legR:[-50,0,-4],upperarmL:[-60,0,-10],upperarmR:[-40,0,0],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.65,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.05,0],legL:[-20,0,0],legR:[-12,0,0],upperarmL:[-10,0,0]}},
    {t:0.85,ease:'out',p:{spine:[-5,0,0],head:[-6,0,0],_hips:[0,0.03,0],upperarmL:[-20,0,30],upperarmR:[-25,-10,0],earL:[-14,0,0],earR:[-14,0,0]}},
    {t:1.1,p:{}},
  ]},
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-18,0,4],chest:[-8,0,0],head:[-14,0,-6],_hips:[0,-0.015,-0.05],upperarmL:[-25,0,38],forearmL:[-20,0,0],upperarmR:[-20,-25,0],legL:[14,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[20,0,0],tail2:[10,15,0]}},
    {t:0.2,p:{spine:[-10,0,2],head:[-6,0,-3],_hips:[0,-0.02,-0.04],upperarmL:[-10,0,20],upperarmR:[-8,-10,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.005,-0.01]}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{upperarmL:[0,0,118],forearmL:[0,0,-20],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.01,0]}},
    {t:1.5,p:{upperarmL:[0,0,118],forearmL:[0,0,-20],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.01,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{forearmL:[0,0,26*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,14*e*Math.sin(2*Math.PI*t/0.36-0.6)],earL:[0,0,6*e*Math.sin(2*Math.PI*t/0.72)],...tailSway(t,1.0,10)};}},
  throw:{T:1.6,keys:[
    {t:0,p:{}},
    {t:0.28,p:{upperarmR:[-120,-20,0],forearmR:[-40,0,0],chest:[-8,-24,0],spine:[-10,-8,0],upperarmL:[-30,0,-5],_hips:[0,-0.02,-0.03],legR:[12,0,0]}},
    {t:0.42,ease:'in',p:{upperarmR:[-30,14,0],forearmR:[0,0,0],chest:[10,18,0],spine:[14,8,0],upperarmL:[30,0,-20],_hips:[0,-0.02,0.04],legL:[-14,0,0],head:[4,0,0]}},
    {t:0.6,p:{upperarmR:[-20,16,0],chest:[8,16,0],spine:[12,6,0],upperarmL:[25,0,-15],_hips:[0,-0.02,0.04],legL:[-12,0,0]}},
    {t:1.15,p:{upperarmR:[-45,5,0],chest:[2,6,0],spine:[4,2,0],_hips:[0,0,0.01]}},
    {t:1.3,ease:'out',p:{upperarmR:[-25,0,0],forearmR:[-15,0,0],chest:[-4,-6,0],spine:[-5,0,0],_hips:[0,-0.02,-0.02]}},
    {t:1.6,p:{}},
  ],fn:(t,T)=>tailSway(t,0.8,9),
  staff:(t,T,M,THREE,{STAFF_SCALE})=>{const tr=0.42,tc=1.22; if(t<=tr+1e-6){rel=M.clone();return M;}
    const u=Math.min(1,(t-tr)/(tc-tr)); const off=new THREE.Vector3(0,0.18*Math.sin(Math.PI*u),1.25*Math.sin(Math.PI*u));
    const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(); rel.decompose(p,q,s);
    const mid=new THREE.Vector3(0,0.5,0).applyMatrix4(rel);
    const spin=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),u*Math.PI*6);
    const q2=spin.clone().multiply(q); const p2=p.clone().sub(mid).applyQuaternion(spin).add(mid).add(off);
    const fly=new THREE.Matrix4().compose(p2,q2,s); if(t<tc-0.12) return fly;
    const b=Math.min(1,(t-(tc-0.12))/0.12); const hp=new THREE.Vector3(),hq=new THREE.Quaternion(),hs=new THREE.Vector3(); M.decompose(hp,hq,hs);
    return new THREE.Matrix4().compose(p2.lerp(hp,b),q2.slerp(hq,b),s);}},
};

// ---- derived clips
const cut=(keys,t0,t1,tail)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tail).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={T:0.72,keys:cut(K,0,0.40,0.32),fn:sway};
 CLIPS.combo2={T:0.68,keys:cut(K,0.40,0.76,0.32),fn:sway};
 CLIPS.combo3={T:0.94,keys:cut(K,0.76,1.3,0.40),fn:sway};
 const P=CLIPS.downLie.keys[0].p;
 CLIPS.downCrawl={T:1.2,loop:true,keys:[{t:0,p:P},{t:1.2,p:P}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmL:[30*s,0,8*c], forearmL:[-18*Math.max(0,c),0,0], upperarmR:[-14*s,0,0], legL:[-16*s,0,0], legR:[16*s,0,0], footL:[10*s,0,0], footR:[-10*s,0,0],
   hips:[0,5*s,4*s], chest:[0,-6*s,0], head:[3*c,5*s,0], _hips:[0,0.008*Math.abs(c),0], tail2:[0,12*s,0], tail3:[0,14*S(t,T,0.12),0], tail4:[0,14*S(t,T,0.24),0], earL:[4*c,0,0], earR:[4*c,0,0]};}};
}

// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 CLIPS.run={T:0.46,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
   _hips:[0,0.02*c2-0.02*0.6,0], hips:[0,7*s,3*s], spine:[13,-4*s,-2.5*s], chest:[2,-8*s,0], head:[-13+3+2*c2,5*s,0],
   legL:[-44*s,0,0], legR:[44*s,0,0], footL:[Math.max(0,-30*S(t,T,0.15)),0,0], footR:[Math.max(0,30*S(t,T,0.15)),0,0],
   upperarmL:[36*s,0,0], forearmL:[-26+10*s,0,0], upperarmR:[-8*s,0,0], earL:[-12+5*S(t,T/2,0.2),0,0], earR:[-12+5*S(t,T/2,0.2),0,0], ...tailSway(t,T,16),
 };}};
 CLIPS.runBack={T:0.46,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.35)};
 CLIPS.runLeft={T:0.46,loop:true,fn:sc(CLIPS.walkLeft.fn,0.7,1.35)};
 CLIPS.runRight={T:0.46,loop:true,fn:sc(CLIPS.walkRight.fn,0.7,1.35)};
}
