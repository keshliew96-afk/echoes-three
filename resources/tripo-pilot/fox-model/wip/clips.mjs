// Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is his left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward, rz+ toward his left. Torso: rx+ leans forward, ry+ turns to his left, rz- leans to his left.
export const CFG={name:'fox',weaponFile:'sword.glb',hand:'handR',scale:0.56,grip:[0,0.2,0],palm:[-0.02,-0.035,0.02],tilt:[52,90,0],tiltOrder:'XYZ',
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[-0.075,0.075,0.34,1.0,-0.025,0.025],pushMode:'away',sole:[[0,-0.07,-0.03],[0,-0.07,0.1]]};
export const BASE={
  spine:[4,0,0], head:[-4,0,0],
  upperarmR:[-10,0,14], forearmR:[-34,0,0],
  upperarmL:[4,0,-14], forearmL:[-16,0,0],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tail=(t,T,a,lag=0.1)=>{const o={};for(let i=1;i<=5;i++)o['tail'+i]=[0,a*S(t,T,lag*i)*(0.5+0.14*i),0];return o;};
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.008*dir*s,0.012*c2-0.014,0], hips:[0,0,-3*dir*s], spine:[2,0,3*dir*s], chest:[0,0,2*dir*s], head:[1.5*c2,0,-3*dir*s],
    upperarmL:[0,0,4*s], upperarmR:[2*c2,0,0], earL:[4*S(t,T/2,0.2),0,0], earR:[4*S(t,T/2,0.2),0,0], ...tail(t,T,12)};
  o['leg'+lead]=[-12*Math.max(0,c),0,20*dir*s]; o['leg'+trail]=[-12*Math.max(0,-c),0,-18*dir*s];
  o['foot'+lead]=[8*Math.max(0,c),0,0]; o['foot'+trail]=[8*Math.max(0,-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-6*d],head:[-4,0,14*d],_hips:[0.07*d*k,0.05,0],earL:[0,0,14*d],earR:[0,0,14*d],tail1:[0,-24*d,0],tail2:[0,-20*d,0],tail3:[0,-14*d,0],upperarmL:[0,0,d>0?-6:-26],upperarmR:[-8,0,d>0?22:6]};
    p['leg'+L]=[-16,0,24*d];p['leg'+R]=[6,0,-26*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.045,0]};crouch['leg'+L]=[0,0,-6*d];crouch['leg'+R]=[0,0,8*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.04,0],head:[2,0,4*d],earL:[0,0,-8*d],earR:[0,0,-8*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
const PRONE={hips:[84,0,0],chest:[3,0,0],head:[-60,0,0],_hips:[0,-0.24,0.0],legL:[6,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],
  upperarmL:[-160,0,-22],forearmL:[-6,0,0],upperarmR:[-150,0,24],forearmR:[20,0,0],handR:[78,0,0],earL:[20,0,8],earR:[20,0,-8],tail1:[-40,0,0],tail2:[-10,14,0]};
export const CLIPS={
  idle:{T:2.4,loop:true,fn:(t,T)=>({
    _hips:[0,0.006*S(t,T)-0.004,0], spine:[1.5*S(t,T),0,0], chest:[1.5*S(t,T,0.08),0,0], head:[-2*S(t,T,0.12),3*S(t,T*2,0.1),0],
    earL:[0,0,-9*bump(t,1.3,0.07)], earR:[0,0,8*bump(t,0.5,0.07)],
    upperarmL:[2*S(t,T,0.1),0,-1.5*S(t,T)], upperarmR:[1.5*S(t,T,0.05),0,0], handR:[3*S(t,T,0.2),0,0], ...tail(t,T,9),
  })},
  walk:{T:0.62,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.014*c2-0.016,0], hips:[0,5*s,2.5*s], spine:[6,-3*s,-2*s], chest:[0,-6*s,0], head:[-4+2*c2,4*s,0],
    legL:[-32*s,0,0], legR:[32*s,0,0], footL:[Math.max(0,-20*S(t,T,0.15)),0,0], footR:[Math.max(0,20*S(t,T,0.15)),0,0],
    upperarmL:[24*s,0,0], forearmL:[-10+8*s,0,0], upperarmR:[-6*s,0,0],
    earL:[5*S(t,T/2,0.2),0,0], earR:[5*S(t,T/2,0.2),0,0], ...tail(t,T,14),
  };}},
  walkBack:{T:0.7,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.012*c2-0.014,0], hips:[0,-4*s,2*s], spine:[-3,2*s,-1.5*s], chest:[0,4*s,0], head:[4+1.5*c2,-3*s,0],
    legL:[-28*s+4,0,0], legR:[28*s+4,0,0], footL:[-10*Math.max(0,-s),0,0], footR:[-10*Math.max(0,s),0,0],
    upperarmL:[14*s,0,-4], forearmL:[-6,0,0], upperarmR:[-4*s,0,0],
    earL:[-4*S(t,T/2,0.2),0,0], earR:[-4*S(t,T/2,0.2),0,0], ...tail(t,T,10),
  };}},
  walkLeft:{T:0.62,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.62,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // 1 forehand slash right to left, 2 rising backhand low left to high right, 3 leaping two-handed cut into a lunge
  combo:{T:1.5,keys:[
    {t:0,p:{}},
    {t:0.10,p:{hips:[0,-8,0],spine:[-3,-10,0],chest:[-2,-24,0],head:[0,22,0],upperarmR:[-40,0,-62],forearmR:[10,0,0],handR:[30,0,0],upperarmL:[10,0,-6],_hips:[0,-0.02,-0.02],legR:[8,0,0]}},
    {t:0.20,ease:'in',p:{hips:[0,10,0],spine:[8,12,0],chest:[4,30,0],head:[0,-26,0],upperarmR:[-78,0,34],forearmR:[26,0,0],handR:[44,0,0],upperarmL:[26,0,-24],_hips:[0,-0.035,0.035],legR:[-16,0,0],legL:[8,0,0]}},
    {t:0.34,p:{hips:[0,12,0],spine:[8,14,0],chest:[4,34,0],head:[0,-28,0],upperarmR:[-60,0,46],forearmR:[20,0,0],handR:[40,0,0],upperarmL:[22,0,-22],_hips:[0,-0.04,0.03],legR:[-14,0,0],legL:[8,0,0]}},
    {t:0.46,p:{hips:[0,12,0],spine:[14,14,0],chest:[6,30,0],head:[-8,-26,0],upperarmR:[-26,0,40],forearmR:[20,0,0],handR:[60,0,0],upperarmL:[16,0,-16],_hips:[0,-0.06,0.02],legR:[-12,0,0],legL:[8,0,0]}},
    {t:0.56,ease:'in',p:{hips:[0,-10,0],spine:[-6,-12,0],chest:[-8,-26,0],head:[-4,20,0],upperarmR:[-124,0,-40],forearmR:[20,0,0],handR:[10,0,0],upperarmL:[20,0,-30],_hips:[0,0.02,0.03],legL:[-12,0,0],footR:[16,0,0]}},
    {t:0.72,p:{hips:[0,-12,0],spine:[-8,-12,0],chest:[-9,-28,0],head:[-4,20,0],upperarmR:[-136,0,-44],forearmR:[16,0,0],handR:[0,0,0],upperarmL:[16,0,-26],_hips:[0,0.01,0.02],legL:[-10,0,0]}},
    {t:0.90,p:{spine:[-14,0,0],chest:[-10,0,0],head:[-10,0,0],upperarmR:[-158,0,16],forearmR:[-10,0,0],handR:[80,0,0],upperarmL:[-150,0,-24],forearmL:[-20,0,0],_hips:[0,0.16,0.0],legL:[-30,0,0],legR:[24,0,0],footL:[20,0,0],footR:[26,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[-20,0,0]}},
    {t:1.02,ease:'in',p:{spine:[24,0,0],chest:[12,0,0],head:[-18,0,0],upperarmR:[-62,0,20],forearmR:[26,0,0],handR:[64,0,0],upperarmL:[-56,0,-34],forearmL:[-6,0,0],_hips:[0,-0.085,0.09],legL:[-34,0,0],legR:[22,0,0],footR:[22,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[18,0,0]}},
    {t:1.22,p:{spine:[20,0,0],chest:[10,0,0],head:[-15,0,0],upperarmR:[-56,0,20],forearmR:[24,0,0],handR:[60,0,0],upperarmL:[-50,0,-34],forearmL:[-6,0,0],_hips:[0,-0.07,0.08],legL:[-30,0,0],legR:[18,0,0],footR:[18,0,0],tail1:[10,0,0]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>tail(t,0.8,12)},
  dash:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[-8,0,0],_hips:[0,-0.045,-0.02],legL:[10,0,0],legR:[10,0,0]}},
    {t:0.2,ease:'out',p:{spine:[28,0,0],chest:[10,0,0],head:[-24,0,0],_hips:[0,0.04,0.07],legL:[-44,0,0],legR:[40,0,0],footR:[30,0,0],upperarmL:[50,0,-14],forearmL:[10,0,0],upperarmR:[30,0,10],forearmR:[20,0,0],handR:[-30,0,0],earL:[-28,0,0],earR:[-28,0,0],tail1:[30,0,0],tail2:[10,0,0]}},
    {t:0.4,p:{spine:[26,0,0],chest:[8,0,0],head:[-22,0,0],_hips:[0,0.03,0.08],legL:[32,0,0],legR:[-42,0,0],footL:[30,0,0],upperarmL:[46,0,-14],upperarmR:[28,0,10],forearmR:[20,0,0],handR:[-30,0,0],earL:[-25,0,0],earR:[-25,0,0],tail1:[30,0,0],tail2:[10,0,0]}},
    {t:0.52,ease:'in',p:{spine:[10,0,0],_hips:[0,-0.04,0.03],legL:[-12,0,0],legR:[8,0,0],earL:[14,0,0],earR:[14,0,0],head:[4,0,0]}},
    {t:0.66,p:{}},
  ]},
  dashBack:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[8,0,0],_hips:[0,-0.045,0.02],legL:[-8,0,0],legR:[-8,0,0]}},
    {t:0.2,ease:'out',p:{spine:[-18,0,0],chest:[-6,0,0],head:[16,0,0],_hips:[0,0.05,-0.07],legL:[-38,0,0],legR:[-22,0,0],footL:[-20,0,0],upperarmL:[-40,0,-14],forearmL:[-15,0,0],upperarmR:[-30,0,-10],handR:[20,0,0],earL:[24,0,0],earR:[24,0,0],tail1:[-24,0,0],tail2:[-10,-12,0]}},
    {t:0.4,p:{spine:[-16,0,0],chest:[-5,0,0],head:[14,0,0],_hips:[0,0.04,-0.08],legL:[-24,0,0],legR:[-36,0,0],footR:[-20,0,0],upperarmL:[-36,0,-14],upperarmR:[-28,0,-10],handR:[20,0,0],earL:[20,0,0],earR:[20,0,0],tail1:[-24,0,0],tail2:[-10,-12,0]}},
    {t:0.52,ease:'in',p:{spine:[4,0,0],_hips:[0,-0.04,-0.03],legL:[10,0,0],legR:[6,0,0],earL:[-12,0,0],earR:[-12,0,0],head:[-3,0,0]}},
    {t:0.66,p:{}},
  ]},
  dashLeft:{T:0.66,keys:sideDash(1)},
  dashRight:{T:0.66,keys:sideDash(-1)},
  // lunge: a long straight thrust (the dashing strikes)
  castPoint:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.12,p:{spine:[-4,-10,0],chest:[-3,-20,0],head:[0,18,0],upperarmR:[20,0,-14],forearmR:[-30,0,0],handR:[40,0,0],upperarmL:[-30,0,-10],_hips:[0,-0.03,-0.03],legR:[10,0,0]}},
    {t:0.22,ease:'in',p:{spine:[16,8,0],chest:[8,16,0],head:[-16,-14,0],upperarmR:[-70,0,22],forearmR:[34,0,0],handR:[62,0,0],upperarmL:[40,0,-20],forearmL:[10,0,0],_hips:[0,-0.06,0.08],legR:[-36,0,0],legL:[20,0,0],footL:[20,0,0]}},
    {t:0.5,p:{spine:[14,8,0],chest:[7,14,0],head:[-14,-12,0],upperarmR:[-66,0,22],forearmR:[32,0,0],handR:[60,0,0],upperarmL:[36,0,-18],forearmL:[10,0,0],_hips:[0,-0.055,0.07],legR:[-32,0,0],legL:[18,0,0],footL:[18,0,0]}},
    {t:0.8,p:{}},
  ]},
  // edge draw: the blade raised high, chest out (the auras and stances)
  castBloom:{T:1.1,keys:[
    {t:0,p:{}},
    {t:0.14,p:{spine:[10,0,0],head:[10,0,0],_hips:[0,-0.045,0],upperarmR:[10,0,20],handR:[30,0,0],upperarmL:[10,0,-10]}},
    {t:0.3,ease:'out',p:{spine:[-10,0,0],chest:[-8,0,0],head:[-18,0,0],_hips:[0,0.03,0],upperarmR:[-150,0,-18],forearmR:[10,0,0],handR:[95,0,0],upperarmL:[14,0,-34],forearmL:[-10,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[-16,0,0],legL:[0,0,5],legR:[0,0,-5]}},
    {t:0.78,p:{spine:[-8,0,0],chest:[-6,0,0],head:[-16,0,0],_hips:[0,0.015,0],upperarmR:[-146,0,-18],forearmR:[10,0,0],handR:[95,0,0],upperarmL:[14,0,-32],forearmL:[-10,0,0],tail1:[-12,0,0],legL:[0,0,5],legR:[0,0,-5]}},
    {t:1.1,p:{}},
  ]},
  // caltrops: a low underhand fling off the free paw
  castPlant:{T:0.95,keys:[
    {t:0,p:{}},
    {t:0.16,p:{spine:[6,14,0],chest:[2,22,0],head:[0,-18,0],upperarmL:[30,0,-20],forearmL:[-50,0,0],upperarmR:[-10,0,-14],_hips:[0,-0.03,-0.01]}},
    {t:0.28,ease:'in',p:{spine:[16,-10,0],chest:[6,-20,0],head:[-10,18,0],upperarmL:[-74,0,-8],forearmL:[14,0,0],handL:[-20,0,0],upperarmR:[16,0,-18],handR:[20,0,0],_hips:[0,-0.065,0.03],legL:[-22,0,0],legR:[12,0,0]}},
    {t:0.6,p:{spine:[14,-10,0],chest:[5,-18,0],head:[-9,16,0],upperarmL:[-66,0,-8],forearmL:[12,0,0],handL:[-20,0,0],upperarmR:[14,0,-18],handR:[20,0,0],_hips:[0,-0.055,0.03],legL:[-20,0,0],legR:[10,0,0]}},
    {t:0.95,p:{}},
  ]},
  // crescent: one wide level cut through a turn of the trunk (the arcs and the storm)
  castSweep:{T:0.9,keys:[
    {t:0,p:{}},
    {t:0.14,p:{hips:[0,-14,0],spine:[0,-14,0],chest:[0,-30,0],head:[0,34,0],upperarmR:[-50,0,-70],forearmR:[16,0,0],handR:[40,0,0],upperarmL:[0,0,-10],_hips:[0,-0.03,0]}},
    {t:0.3,ease:'in',p:{hips:[0,16,0],spine:[6,16,0],chest:[4,36,0],head:[0,-36,0],upperarmR:[-80,0,30],forearmR:[26,0,0],handR:[50,0,0],upperarmL:[20,0,-40],_hips:[0,-0.045,0.02],legR:[-12,0,0]}},
    {t:0.56,p:{hips:[0,18,0],spine:[6,18,0],chest:[4,40,0],head:[0,-38,0],upperarmR:[-70,0,40],forearmR:[22,0,0],handR:[46,0,0],upperarmL:[16,0,-36],_hips:[0,-0.045,0.02]}},
    {t:0.9,p:{}},
  ]},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-14,0,0],head:[-12,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-20,0,-30],upperarmR:[-15,0,20],earL:[18,0,0],earR:[18,0,0]}},
    {t:0.3,p:{hips:[28,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.08,0.02],legL:[-36,0,0],legR:[-30,0,0],upperarmL:[-40,0,-10],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.55,ease:'in',p:{...PRONE,_hips:[0,-0.25,0.0]}},
    {t:0.66,p:{...PRONE,_hips:[0,-0.225,0.0],head:[-68,0,0]}},
    {t:0.8,p:PRONE},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:PRONE},{t:3.0,p:PRONE}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],earL:[0,0,-6*bump(t,1.6,0.08)],tail2:[0,8*S(t,T),0],tail3:[0,10*S(t,T,0.1),0],tail4:[0,10*S(t,T,0.2),0]})},
  revive:{T:1.1,keys:[
    {t:0,p:PRONE},
    {t:0.35,p:{hips:[48,0,0],spine:[6,0,0],head:[-40,0,0],_hips:[0,-0.17,0.0],legL:[-60,0,4],legR:[-50,0,-4],upperarmL:[-60,0,-10],upperarmR:[-40,0,10],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.65,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.06,0],legL:[-20,0,0],legR:[-12,0,0],upperarmL:[-10,0,0]}},
    {t:0.85,ease:'out',p:{spine:[-5,0,0],head:[-6,0,0],_hips:[0,0.03,0],upperarmL:[-20,0,-24],upperarmR:[-20,0,10],earL:[-14,0,0],earR:[-14,0,0]}},
    {t:1.1,p:{}},
  ]},
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-18,0,4],chest:[-8,0,0],head:[-14,0,-6],_hips:[0,-0.02,-0.05],upperarmL:[-25,0,-34],forearmL:[-20,0,0],upperarmR:[-16,0,-22],legL:[14,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[-20,0,0],tail2:[-10,15,0]}},
    {t:0.2,p:{spine:[-10,0,2],head:[-6,0,-3],_hips:[0,-0.025,-0.04],upperarmL:[-10,0,-18],upperarmR:[-8,0,-10],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.008,-0.01]}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{upperarmL:[0,0,122],forearmL:[10,0,-22],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:1.5,p:{upperarmL:[0,0,122],forearmL:[10,0,-22],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{forearmL:[0,0,26*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,14*e*Math.sin(2*Math.PI*t/0.36-0.6)],earL:[0,0,6*e*Math.sin(2*Math.PI*t/0.72)],...tail(t,1.0,12)};}},
  // flourish: the blade spun once at the wrist, then a salute
  flourish:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.25,p:{upperarmR:[-50,0,-24],forearmR:[10,0,0],chest:[0,-8,0],head:[0,6,0]}},
    {t:1.0,p:{upperarmR:[-50,0,-24],forearmR:[10,0,0],chest:[0,-8,0],head:[0,6,0]}},
    {t:1.25,ease:'out',p:{upperarmR:[-96,0,26],forearmR:[-34,0,0],handR:[-44,0,0],chest:[-4,6,0],spine:[-4,0,0],head:[-6,-4,0],_hips:[0,0.012,0],upperarmL:[8,0,-10]}},
    {t:1.7,p:{upperarmR:[-96,0,26],forearmR:[-34,0,0],handR:[-44,0,0],chest:[-4,6,0],spine:[-4,0,0],head:[-6,-4,0],_hips:[0,0.012,0],upperarmL:[8,0,-10]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const u=Math.min(1,Math.max(0,(t-0.25)/0.7)); const e=u*u*(3-2*u); return{handR:[360*e,0,0],...tail(t,1.0,10)};}},
};
// ---- derived clips
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={T:0.64,keys:cut(K,0,0.34,0.30),fn:sway};
 CLIPS.combo2={T:0.68,keys:cut(K,0.34,0.72,0.30),fn:sway};
 CLIPS.combo3={T:0.90,keys:cut(K,0.72,1.22,0.40),fn:sway};
 CLIPS.downCrawl={T:1.2,loop:true,keys:[{t:0,p:PRONE},{t:1.2,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmL:[-5*Math.max(0,c),0,-16*s], forearmL:[-10*Math.max(0,c),0,0], upperarmR:[0,0,-5*s], legL:[-14*s,0,0], legR:[14*s,0,0], footL:[10*s,0,0], footR:[-10*s,0,0],
   hips:[0,4*s,3*s], chest:[0,-4*s,0], head:[3*c,3*s,0], _hips:[0,0.008*Math.abs(c),0], tail2:[0,12*s,0], tail3:[0,14*S(t,T,0.12),0], tail4:[0,14*S(t,T,0.24),0], earL:[4*c,0,0], earR:[4*c,0,0]};}};
}

// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 CLIPS.run={T:0.4,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
   _hips:[0,0.022*c2-0.022*0.6,0], hips:[0,7*s,3*s], spine:[15,-4*s,-2.5*s], chest:[2,-8*s,0], head:[-15+3+2*c2,5*s,0],
   legL:[-50*s,0,0], legR:[50*s,0,0], footL:[Math.max(0,-30*S(t,T,0.15)),0,0], footR:[Math.max(0,30*S(t,T,0.15)),0,0],
   upperarmL:[40*s,0,0], forearmL:[-36+10*s,0,0], upperarmR:[-10*s,0,0], handR:[-14,0,0], tail1:[14,0,0], earL:[-16+5*S(t,T/2,0.2),0,0], earR:[-16+5*S(t,T/2,0.2),0,0], ...tail(t,T,16),
 };}};
 CLIPS.runBack={T:0.4,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.35)};
 CLIPS.runLeft={T:0.4,loop:true,fn:sc(CLIPS.walkLeft.fn,0.62,1.35)};
 CLIPS.runRight={T:0.4,loop:true,fn:sc(CLIPS.walkRight.fn,0.62,1.35)};
}

// ---- blade storm: a spinning hop with the blade held out level (three full turns); whole body
{const out={upperarmR:[-10,0,-78],forearmR:[30,0,0],handR:[90,-40,0],upperarmL:[0,0,-62],forearmL:[10,0,0],spine:[2,0,0],head:[0,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[10,-30,0],tail2:[0,-24,0],tail3:[0,-18,0]};
 CLIPS.bladeStorm={T:0.9,keys:[
  {t:0,p:{}},
  {t:0.12,p:{hips:[0,-45,0],spine:[8,-10,0],head:[0,30,0],_hips:[0,-0.055,0],upperarmR:[-20,0,-50],forearmR:[20,0,0],handR:[20,-40,0],upperarmL:[10,0,-20],legL:[0,0,6],legR:[0,0,-6]}},
  {t:0.22,ease:'in',p:{...out,hips:[0,60,0],_hips:[0,0.06,0],legL:[-14,0,10],legR:[8,0,-10]}},
  {t:0.39,ease:'lin',p:{...out,hips:[0,560,0],_hips:[0,0.11,0],legL:[-18,0,12],legR:[10,0,-12],footL:[20,0,0],footR:[20,0,0]}},
  {t:0.56,ease:'lin',p:{...out,hips:[0,1060,0],_hips:[0,0.04,0],legL:[-10,0,8],legR:[6,0,-8]}},
  {t:0.66,ease:'out',p:{hips:[0,1080,0],spine:[10,10,0],chest:[0,16,0],head:[-6,-20,0],_hips:[0,-0.06,0.01],upperarmR:[-50,0,30],forearmR:[20,0,0],handR:[40,0,0],upperarmL:[10,0,-30],legL:[-12,0,6],legR:[8,0,-6]}},
  {t:0.9,p:{hips:[0,1080,0]}},
 ],fn:CLIPS.combo.fn};
}
