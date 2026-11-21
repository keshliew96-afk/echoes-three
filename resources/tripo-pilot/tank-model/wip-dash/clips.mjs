// Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is his left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward, rz+ toward his left. Torso: rx+ leans forward, ry+ turns to his left, rz- leans to his left.
export const CFG={name:'tank',weaponFile:'shield.glb',hand:'handL',scale:0.58,grip:[0,0.5,-0.17],palm:[0.045,-0.04,0.0],tilt:[0,12,0],holdBones:['upperarmL','forearmL','handL','fingersL'],box:[-0.35,0.35,0.01,0.99,-0.1,0.08],
  // follow-through, as on the Healer but heavier: the trunk leads, the head and the free arm trail, the shield arm trails least (it is a slab)
  carry:0.4,lag:{chest:0.015,head:0.045,forearmR:0.03,handR:0.05,forearmL:0.015},
  springs:[{bone:'earL',k:700,z:0.5,max:16,tip:[0.05,0.07,0]},{bone:'earR',k:700,z:0.5,max:16,tip:[-0.05,0.07,0]},
    {bone:'tail1',k:420,z:0.5,max:14},{bone:'tail2',k:330,z:0.45,max:20},{bone:'tail3',k:260,z:0.4,max:26,tip:[0,-0.03,-0.06]}]};
export const BASE={
  upperarmL:[-18,0,-30], forearmL:[-62,-30,0],
  upperarmR:[-6,0,34], forearmR:[-14,0,0],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2; // a soft max(0,x)
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tail=(t,T,a)=>({tail1:[0,a*S(t,T),0],tail2:[0,a*S(t,T,0.12),0],tail3:[0,a*S(t,T,0.24),0]});
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.012*dir*s,0.010*c2-0.008,0], hips:[0,0,-4*dir*s], spine:[2,0,3*dir*s], chest:[0,0,2*dir*s], head:[1.5*c2,0,-3*dir*s],
    upperarmR:[0,0,4*s], upperarmL:[2*c2,0,0], ...tail(t,T,8)};
  o['leg'+lead]=[-8*Math.max(0,c),0,18*dir*s]; o['leg'+trail]=[-8*Math.max(0,-c),0,-16*dir*s];
  o['foot'+lead]=[6*Math.max(0,c),0,0]; o['foot'+trail]=[6*Math.max(0,-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-14*d],chest:[0,0,-5*d],head:[-3,0,10*d],_hips:[0.05*d*k,0.05,0],earL:[0,0,10*d],earR:[0,0,10*d],tail1:[0,-16*d,0],tail2:[0,-14*d,0],upperarmL:[-8,0,d>0?14:-4],upperarmR:[0,0,d>0?-10:-24]};
    p['leg'+L]=[-10,0,22*d];p['leg'+R]=[4,0,-22*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.04,0]};crouch['leg'+L]=[0,0,-5*d];crouch['leg'+R]=[0,0,7*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.045,0],head:[2,0,4*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.1,p:crouch},{t:0.22,ease:'out',p:air(1)},{t:0.42,p:air(1.15)},{t:0.54,ease:'in',p:land},{t:0.7,p:{}}];}
// the prone pose
const PRONE={hips:[84,0,0],chest:[3,0,0],head:[-58,0,0],_hips:[0,-0.055,0.02],legL:[6,0,8],legR:[4,0,-8],footL:[35,0,0],footR:[35,0,0],
  upperarmL:[48,0,25],forearmL:[-48,0,0],upperarmR:[-80,0,-30],forearmR:[-10,0,0],tail1:[-20,0,0]};
// ---- the Tank's style (Kesh, 11-12: "it need to fit the tank class style"): heavy and planted. Every blow has a long load, a short
// release and a slow recovery; the weight drops on every contact; the slab leads and the body follows it; the free paw is a fist.
const stepBob=(t,T,ph=0)=>{const th=4*Math.PI*t/T-ph; return Math.cos(th+0.5*Math.sin(th));}; // twice per stride: the body lands on each foot. Skewed for weight: he comes over the top quickly and stays down on the planted foot
const walkFn=(t,T)=>{const s=S(t,T),c2=stepBob(t,T),b2=stepBob(t,T,0.7),b3=stepBob(t,T,1.3);return{
    // a waddle: the hips swing over the planted foot and drop as it lands; the trunk counters; the slab bounces a beat late
    _hips:[0.028*s,0.018*c2-0.016,0], hips:[0,5*s,6.5*s], spine:[7+2.2*c2,-3*s,-4.5*s], chest:[2.2*b2,-7*s,-1.5*s], head:[-4+3.4*b3,5*s,-2*s],
    legL:[-32*s,0,0], legR:[32*s,0,0], footL:[18*pos(-S(t,T,0.15)),0,0], footR:[18*pos(S(t,T,0.15)),0,0],
    upperarmR:[-22*s,0,-3], forearmR:[-12-10*s,0,0], handR:[-6*S(t,T,0.1),0,0],
    upperarmL:[3.6*b2,4*s,0], forearmL:[3.4*b3,0,0], earL:[4*b3,0,0], earR:[4*b3,0,0], ...tail(t,T,14),
  };};
const walkBackFn=(t,T)=>{const s=-S(t,T),c2=stepBob(t,T),b2=stepBob(t,T,0.7);return{
    _hips:[0.016*s,0.013*c2-0.012,0], hips:[0,-4*s,4*s], spine:[-3,2.5*s,-2.5*s], chest:[1.2*b2,4*s,0], head:[5+2*b2,-3*s,0],
    legL:[-24*s+3,0,0], legR:[24*s+3,0,0], footL:[-10*pos(-s),0,0], footR:[-10*pos(s),0,0],
    upperarmR:[-11*s,0,-5], forearmR:[-10,0,0], upperarmL:[-8+2.5*b2,-3*s,0], forearmL:[2*b2,0,0], ...tail(t,T,9),
  };};
const strafeFn=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=stepBob(t,T),b2=stepBob(t,T,0.7);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.016*dir*s,0.013*c2-0.011,0], hips:[0,0,-5*dir*s], spine:[2.5,0,4*dir*s], chest:[1.2*b2,0,2.5*dir*s], head:[2*b2,0,-4*dir*s],
    upperarmR:[0,0,5*s], forearmR:[-6-4*c2,0,0], upperarmL:[2.5*b2,0,0], forearmL:[2*b2,0,0], ...tail(t,T,10)};
  o['leg'+lead]=[-10*pos(c),0,22*dir*s]; o['leg'+trail]=[-10*pos(-c),0,-20*dir*s];
  o['foot'+lead]=[8*pos(c),0,0]; o['foot'+trail]=[8*pos(-c),0,0]; return o;};
// poses used more than once
const OVER={upperarmL:[-150,-12,-8],forearmL:[-8,-10,0],upperarmR:[-150,0,-30],forearmR:[-30,0,0]}; // the slab over his head in both paws
const SLAM={upperarmL:[-56,-30,0],forearmL:[40,-16,0],upperarmR:[-52,20,-30],forearmR:[-20,0,0]};  // its lower edge driven into the ground in front
const BRACE={upperarmL:[-40,-28,0],forearmL:[22,-12,0],upperarmR:[-34,26,-16],forearmR:[-46,0,0]};  // the slab square in front, the free paw behind it
// the free paw takes the slab's edge when a move needs both paws on it (shield-local point; the build pulls the paw onto it)
const THX=+(process.env.THX||-0.3), THY=+(process.env.THY||0.8), THZ=+(process.env.THZ||-0.1);
// (his arms are too short to hold the slab over his head in both paws: the head is in the way. The free paw joins it as it lands.)
// the hook: the fist is led through these points (his own space: +x his left, +z forward): cocked behind his right hip, then round to front centre, then across
const HOOK=(o)=>({from:0.50-o,to:1.06-o,fade:0.1,keys:[{t:0.50-o,p:[-0.40,0.46,-0.10]},{t:0.64-o,p:[-0.42,0.50,-0.16]},{t:0.78-o,p:[0.00,0.62,0.48],ease:'in'},{t:0.94-o,p:[0.20,0.60,0.40]},{t:1.06-o,p:[0.10,0.66,0.34]}]});
const TH=(from,to)=>({from,to,fade:0.12,x:THX,y:THY,z:THZ});
// guard (Kesh, 11-12: "make the shield face straight"): the slab is led by its grip so it stands upright, square to the front and centred on him.
// Each of the two blows knocks it back a hand's width and it comes forward again.
const GP=(dz=0)=>[0.05,0.38,0.34+dz], GUARD={from:0.1,to:1.98,fade:0.14,keys:[[0.1,0],[0.2,0],[0.76,0],[0.82,-0.045],[0.96,0.006],[1.06,0],[1.26,0],[1.32,-0.045],[1.46,0.006],[1.56,0],[1.98,0]].map(([t,dz])=>({t,p:GP(dz),d:[0,1,-0.04],n:[0,0,1]}))};
export const CLIPS={
  // idle: slow heavy breath, the weight rolls from foot to foot, the head scans, and once a cycle he re-seats the slab with a short hitch
  idle:{T:3.6,loop:true,fn:(t,T)=>{const b=S(t,T/2), b2=S(t,T/2,0.1), w=S(t,T,0.2), h=bump(t,2.5,0.09)-0.6*bump(t,2.68,0.12);return{
    _hips:[0.010*w,0.007*b-0.006*h,0], hips:[0,0,2.2*w], spine:[2.2*b,0,-1.6*w], chest:[2.4*b2,1.5*w,-0.6*w], head:[-2.2*S(t,T/2,0.16)+3*h,7*S(t,T,0.05)+2*S(t,T/3,0.3),0],
    legL:[0,0,-2.2*w], legR:[0,0,-2.2*w],
    earL:[0,0,-9*bump(t,1.3,0.07)], earR:[0,0,8*bump(t,0.5,0.07)-6*bump(t,3.0,0.07)],
    upperarmL:[2*b2-7*h,1.5*w,0], forearmL:[1.5*b2-4*h,0,0], upperarmR:[2*b,0,-2*b-1.5*w], forearmR:[-3-3*b2,0,0], handR:[-5*S(t,T/2,0.25),0,0], ...tail(t,T/2,8),
  };}},
  walk:{T:0.84,loop:true,fn:walkFn},
  walkBack:{T:0.9,loop:true,fn:walkBackFn},
  walkLeft:{T:0.84,loop:true,fn:(t,T)=>strafeFn(t,T,1)},
  walkRight:{T:0.84,loop:true,fn:(t,T)=>strafeFn(t,T,-1)},
  // The shield combo, three different weights of blow that flow into each other:
  // 1 a backhand shield bash with a stamped step (it leaves him turned to his right, the fist cocked behind him),
  // 2 a hook with the free fist, driven by the hips turning back the other way (it leaves the slab swung out to his left),
  // 3 both paws take the slab overhead, a short hop, and its lower edge is driven into the ground: the heavy one.
  combo:{T:2.3,keys:[
    {t:0,p:{}},
    // 1 load: coils to his left, weight on the back foot, the slab drawn across his chest
    {t:0.16,p:{spine:[-4,10,0],chest:[-3,26,0],head:[0,-20,0],upperarmL:[-8,38,12],forearmL:[0,12,0],upperarmR:[8,0,-10],forearmR:[-10,0,0],_hips:[0.015,-0.022,-0.03],legL:[8,0,0],legR:[-4,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    // 1 contact: the slab swings across with a stamped step
    {t:0.30,ease:'in',p:{spine:[10,-14,0],chest:[6,-34,0],head:[-2,26,0],upperarmL:[-50,-32,0],forearmL:[36,-10,0],upperarmR:[26,0,-30],forearmR:[-30,0,0],_hips:[-0.012,-0.045,0.06],legR:[-18,0,0],legL:[12,0,0],footL:[14,0,0],earL:[12,0,0],earR:[12,0,0]}},
    // 1 settle: the turn carries on a little and the fist cocks behind him
    {t:0.46,p:{spine:[11,-16,0],chest:[5,-38,0],head:[-2,28,0],upperarmL:[-46,-34,0],forearmL:[34,-10,0],upperarmR:[34,0,-36],forearmR:[-52,0,0],_hips:[-0.014,-0.052,0.055],legR:[-16,0,0],legL:[11,0,0],footL:[10,0,0]}},
    // 2 load: sinks lower, the slab pulls in to cover him, the fist is fully cocked
    {t:0.64,p:{spine:[13,-17,0],chest:[4,-40,0],head:[-2,30,0],upperarmL:[-30,-22,0],forearmL:[20,-10,0],upperarmR:[42,0,-40],forearmR:[-72,0,0],_hips:[-0.016,-0.064,0.05],legR:[-15,0,0],legL:[11,0,0],footL:[8,0,0]}},
    // 2 contact: the hips turn back and the fist comes round as a hook
    {t:0.78,ease:'in',p:{spine:[5,14,0],chest:[3,36,0],head:[0,-26,0],upperarmR:[-80,20,0],forearmR:[-50,0,0],upperarmL:[-10,20,6],forearmL:[0,6,0],_hips:[0.012,-0.034,0.085],legL:[-16,0,0],legR:[14,0,0],footR:[18,0,0],earL:[12,0,0],earR:[12,0,0]}},
    // 2 follow-through: the fist carries across his body
    {t:0.94,p:{spine:[4,16,0],chest:[2,42,0],head:[0,-28,0],upperarmR:[-74,46,0],forearmR:[-58,0,0],upperarmL:[-8,24,8],forearmL:[0,6,0],_hips:[0.014,-0.038,0.085],legL:[-15,0,0],legR:[13,0,0],footR:[14,0,0]}},
    // 3 load: both paws take the slab up over his head and he rises onto his toes
    {t:1.14,p:{spine:[-16,0,0],chest:[-12,0,0],head:[-12,0,0],...OVER,_hips:[0,0.03,0.05],legL:[6,0,0],legR:[6,0,0],footL:[18,0,0],footR:[18,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    // 3 apex: a short hop, the slab at its highest, his back arched
    {t:1.28,p:{spine:[-21,0,0],chest:[-14,0,0],head:[-14,0,0],...OVER,upperarmL:[-158,-12,-8],upperarmR:[-158,0,-30],_hips:[0,0.11,0.07],legL:[-20,0,0],legR:[-12,0,0],footL:[10,0,0],footR:[22,0,0]}},
    // 3 contact: he lands and the lower edge goes into the ground
    {t:1.42,ease:'in',p:{spine:[30,0,0],chest:[14,0,0],head:[-20,0,0],...SLAM,_hips:[0,-0.09,0.10],legL:[-30,0,0],legR:[16,0,0],footR:[20,0,0],earL:[18,0,0],earR:[18,0,0]}},
    // 3 rebound and hold: he stays down on it for a long beat
    {t:1.54,p:{spine:[26,0,0],chest:[12,0,0],head:[-16,0,0],...SLAM,_hips:[0,-0.072,0.10],legL:[-27,0,0],legR:[15,0,0],footR:[18,0,0]}},
    {t:1.80,p:{spine:[23,0,0],chest:[10,0,0],head:[-13,0,0],...SLAM,_hips:[0,-0.064,0.09],legL:[-24,0,0],legR:[13,0,0],footR:[14,0,0]}},
    {t:2.3,p:{}},
  ],fn:(t,T)=>tail(t,1.15,9),twoHand:TH(1.38,1.98),offHand:HOOK(0)},
  // dash (Kesh 11-13): a shield charge. Both paws on the slab as in his guard, square to the front, and he rams along the way on the legs of his run:
  // one full stride, two pounding steps, the whole trunk leaning in behind the slab. It ends in a shove off the front foot, then he settles back heavily.
  // One clip: he turns to face where he charges.
  dash:{T:1.3,nolag:true,twoHand:TH(0.08,0.98),
    staffPose:{from:0.0,to:1.06,fade:0.08,keys:[[0.0,0,0],[0.10,0,0],...[0.17,0.24,0.31,0.38,0.45,0.52,0.59].map(t=>[t,0.012,0.012*Math.cos(4*Math.PI*(t-0.10)/0.56)]),[0.64,0.0,0],[0.71,0.04,0.012],[0.80,0.02,0],[0.94,0,0],[1.06,0,0]].map(([t,dz,dy])=>({t,p:[0.05,0.38+dy,0.34+dz],d:[0,1,-0.03],n:[0,0,1]}))},
    keys:[
    {t:0,p:{}},
    {t:0.10,ease:'out',p:{spine:[15,0,0],chest:[5,0,0],head:[-3,0,0],_hips:[0,-0.075,-0.012],...BRACE,legL:[-16,0,6],legR:[18,0,-6],earL:[16,0,0],earR:[16,0,0],tail1:[-14,0,0]}},
    {t:0.17,p:{spine:[23,0,0],chest:[7,0,0],head:[-10,0,0],_hips:[0,-0.05,0.045],...BRACE,earL:[20,0,0],earR:[20,0,0],tail1:[16,0,0],tail2:[8,0,0]}},
    {t:0.60,p:{spine:[24,0,0],chest:[7,0,0],head:[-11,0,0],_hips:[0,-0.05,0.05],...BRACE,earL:[20,0,0],earR:[20,0,0],tail1:[16,0,0],tail2:[8,0,0]}},
    {t:0.71,ease:'in',p:{spine:[31,0,0],chest:[10,0,0],head:[-17,0,0],_hips:[0,-0.095,0.09],...BRACE,upperarmL:[-50,-28,0],forearmL:[32,-12,0],legL:[-30,0,7],footL:[8,0,0],legR:[28,0,-7],footR:[16,0,0],earL:[-22,0,0],earR:[-22,0,0],tail1:[-24,0,0],tail2:[-12,0,0]}},
    {t:0.80,p:{spine:[24,0,0],chest:[8,0,0],head:[-10,0,0],_hips:[0,-0.105,0.065],...BRACE,legL:[-26,0,7],footL:[6,0,0],legR:[24,0,-7],footR:[10,0,0],earL:[12,0,0],earR:[12,0,0],tail1:[10,0,0]}},
    {t:0.98,p:{spine:[12,0,0],chest:[4,0,0],head:[-4,0,0],_hips:[0,-0.06,0.03],upperarmL:[-22,-15,0],forearmL:[12,-6,0],upperarmR:[-16,13,-8],forearmR:[-22,0,0],legL:[-12,0,4],legR:[10,0,-4]}},
    {t:1.3,p:{}},
  ],fn:(t,T)=>{ // the run's legs under the guard: one stride of 0.56 s from 0.10
    const sm=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);}; const k=sm(0.09,0.15,t)*(1-sm(0.62,0.70,t)); if(k<=0)return {};
    const tt=t-0.10, Tr=0.56, s=S(tt,Tr), c2=stepBob(tt,Tr), b3=stepBob(tt,Tr,1.3);
    return {_hips:[0.010*s*k,(0.026*c2-0.012)*k,0], hips:[0,5*s*k,3.5*s*k], spine:[2.5*c2*k,-3*s*k,-2.5*s*k], head:[3*b3*k,3*s*k,0],
      legL:[-44*s*k,0,0], legR:[44*s*k,0,0], footL:[34*pos(-S(tt,Tr,0.15))*k,0,0], footR:[34*pos(S(tt,Tr,0.15))*k,0,0], earL:[4*b3*k,0,0], earR:[4*b3*k,0,0]}; }},
  // thrust: he coils behind the slab and drives it straight out with his whole weight (shoulder charge, bashes)
  castPoint:{T:1.05,keys:[
    {t:0,p:{}},
    {t:0.18,p:{spine:[-7,10,0],chest:[-4,20,0],head:[4,-16,0],upperarmL:[10,14,0],forearmL:[-18,0,0],upperarmR:[-12,0,-12],forearmR:[-30,0,0],_hips:[0,-0.045,-0.05],legL:[10,0,0],legR:[-6,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.30,ease:'in',p:{spine:[16,-8,0],chest:[8,-18,0],head:[-12,14,0],upperarmL:[-66,-24,0],forearmL:[48,-12,0],upperarmR:[30,0,-22],forearmR:[-20,0,0],_hips:[0,-0.055,0.10],legL:[-24,0,0],legR:[18,0,0],footR:[20,0,0],earL:[14,0,0],earR:[14,0,0]}},
    {t:0.40,p:{spine:[14,-8,0],chest:[7,-17,0],head:[-10,13,0],upperarmL:[-62,-24,0],forearmL:[46,-12,0],upperarmR:[27,0,-20],forearmR:[-20,0,0],_hips:[0,-0.046,0.10],legL:[-22,0,0],legR:[16,0,0],footR:[17,0,0]}},
    {t:0.62,p:{spine:[12,-7,0],chest:[6,-15,0],head:[-9,12,0],upperarmL:[-58,-24,0],forearmL:[44,-12,0],upperarmR:[24,0,-18],forearmR:[-20,0,0],_hips:[0,-0.042,0.09],legL:[-20,0,0],legR:[14,0,0],footR:[14,0,0]}},
    {t:1.05,p:{}},
  ],fn:(t,T)=>tail(t,1.05,8)},
  // roar: he sinks and fills his chest, then throws his arms wide and his head back; the head and chest shake with it (taunts, rallies)
  castBloom:{T:1.6,keys:[
    {t:0,p:{}},
    {t:0.24,p:{spine:[16,0,0],chest:[8,0,0],head:[14,0,0],_hips:[0,-0.065,0],upperarmL:[-16,-12,0],forearmL:[6,0,0],upperarmR:[-12,0,16],forearmR:[-40,0,0],legL:[-6,0,4],legR:[-6,0,-4],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.40,ease:'in',p:{spine:[-15,0,0],chest:[-13,0,0],head:[-30,0,0],_hips:[0,0.035,0],upperarmL:[12,50,34],forearmL:[12,12,0],upperarmR:[12,0,-66],forearmR:[12,0,-12],earL:[-14,0,0],earR:[-14,0,0],legL:[0,0,7],legR:[0,0,-7],footL:[8,0,0],footR:[8,0,0]}},
    {t:0.56,p:{spine:[-13,0,0],chest:[-11,0,0],head:[-27,0,0],_hips:[0,0.02,0],upperarmL:[12,46,32],forearmL:[12,12,0],upperarmR:[12,0,-62],forearmR:[12,0,-12],legL:[0,0,7],legR:[0,0,-7]}},
    {t:1.10,p:{spine:[-10,0,0],chest:[-9,0,0],head:[-22,0,0],_hips:[0,0.008,0],upperarmL:[10,42,28],forearmL:[10,10,0],upperarmR:[10,0,-56],forearmR:[10,0,-10],legL:[0,0,6],legR:[0,0,-6]}},
    {t:1.6,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.74,0.26);return{head:[0,0,3.5*e*Math.sin(2*Math.PI*t/0.09)],chest:[0,0,1.4*e*Math.sin(2*Math.PI*t/0.09)],upperarmR:[0,0,2*e*Math.sin(2*Math.PI*t/0.09+1)],...tail(t,0.8,10)};}},
  // plant: both paws lift the slab, a short hop, and it is driven into the ground; he stays crouched behind it (walls, stances, ground skills)
  castPlant:{T:1.7,nolag:true,twoHand:TH(0.42,1.42),keys:[
    {t:0,p:{}},
    {t:0.24,p:{spine:[-14,0,0],chest:[-10,0,0],head:[-10,0,0],...OVER,_hips:[0,0.04,0],legL:[5,0,0],legR:[5,0,0],footL:[16,0,0],footR:[16,0,0]}},
    {t:0.34,p:{spine:[-17,0,0],chest:[-12,0,0],head:[-12,0,0],...OVER,_hips:[0,0.085,0.02],legL:[-16,0,0],legR:[-10,0,0],footL:[10,0,0],footR:[20,0,0]}},
    {t:0.46,ease:'in',p:{spine:[26,0,0],chest:[10,0,0],head:[-14,0,0],upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-38,26,-24],forearmR:[-24,0,0],_hips:[0,-0.095,0.04],legL:[-22,0,8],legR:[12,0,-8],earL:[16,0,0],earR:[16,0,0]}},
    {t:0.58,p:{spine:[22,0,0],chest:[8,0,0],head:[-11,0,0],upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-37,26,-24],forearmR:[-24,0,0],_hips:[0,-0.078,0.04],legL:[-20,0,8],legR:[11,0,-8]}},
    {t:1.15,p:{spine:[20,0,0],chest:[7,0,0],head:[-10,0,0],upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-36,26,-24],forearmR:[-24,0,0],_hips:[0,-0.07,0.04],legL:[-18,0,8],legR:[10,0,-8]}},
    {t:1.7,p:{}},
  ]},
  // sweep: he winds the whole trunk to his left and turns it through with the slab held out flat (cleaves, whirls)
  castSweep:{T:1.35,keys:[
    {t:0,p:{}},
    {t:0.20,p:{spine:[-2,16,0],chest:[-2,32,0],head:[0,-34,0],upperarmL:[-22,44,18],forearmL:[22,12,0],upperarmR:[0,0,-14],forearmR:[-20,0,0],_hips:[0.014,-0.04,-0.02],legL:[6,0,6],legR:[-4,0,-6]}},
    {t:0.36,ease:'in',p:{spine:[8,-18,0],chest:[5,-40,0],head:[0,38,0],upperarmL:[-64,-36,0],forearmL:[46,-14,0],upperarmR:[20,0,-42],forearmR:[-10,0,0],_hips:[-0.014,-0.05,0.04],legR:[-14,0,-6],legL:[8,0,6],footL:[12,0,0],earL:[0,0,12],earR:[0,0,12]}},
    {t:0.52,p:{spine:[8,-21,0],chest:[5,-46,0],head:[0,42,0],upperarmL:[-58,-42,0],forearmL:[42,-14,0],upperarmR:[16,0,-38],forearmR:[-10,0,0],_hips:[-0.016,-0.052,0.04],legR:[-13,0,-6],legL:[8,0,6],footL:[9,0,0]}},
    {t:0.82,p:{spine:[7,-19,0],chest:[4,-42,0],head:[0,38,0],upperarmL:[-54,-40,0],forearmL:[40,-14,0],upperarmR:[13,0,-32],forearmR:[-10,0,0],_hips:[-0.014,-0.045,0.035],legR:[-11,0,-5],legL:[7,0,5]}},
    {t:1.35,p:{}},
  ],fn:(t,T)=>tail(t,1.35,12)},
  downFall:{T:0.85,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-12,0,0],head:[-10,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-10,20,10],upperarmR:[-12,0,-24]}},
    {t:0.32,p:{hips:[26,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.05,0.02],legL:[-30,0,0],legR:[-26,0,0],upperarmL:[-30,0,20],upperarmR:[-40,0,-20]}},
    {t:0.58,ease:'in',p:{...PRONE,_hips:[0,-0.058,0.02]}},
    {t:0.68,p:{...PRONE,_hips:[0,-0.04,0.02],head:[-66,0,0]}},
    {t:0.85,p:PRONE},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:PRONE},{t:3.0,p:PRONE}],fn:(t,T)=>({chest:[1.2*S(t,T),0,0],head:[2*S(t,T,0.1),0,2*S(t,T*2)],earL:[0,0,-6*bump(t,1.6,0.08)],tail2:[0,8*S(t,T),0],tail3:[0,10*S(t,T,0.1),0]})},
  revive:{T:1.2,keys:[
    {t:0,p:PRONE},
    {t:0.4,p:{hips:[50,0,0],spine:[6,0,0],head:[-38,0,0],_hips:[0,-0.07,0.02],legL:[-56,0,6],legR:[-46,0,-6],upperarmL:[-40,0,20],upperarmR:[-50,0,-16]}},
    {t:0.72,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.05,0],legL:[-16,0,0],legR:[-10,0,0],upperarmR:[-10,0,0]}},
    {t:0.94,ease:'out',p:{spine:[-4,0,0],head:[-5,0,0],_hips:[0,0.02,0],upperarmL:[-12,0,0],upperarmR:[-12,0,-14]}},
    {t:1.2,p:{}},
  ]},
  // hurt: he barely gives ground. The blow rocks his head and shoulders back, the slab comes up by reflex, and he leans back into it
  // hurt: a tank takes it. The blow sinks him onto his heels behind the slab instead of throwing him back: the shield jolts a hand's width, his head ducks, his fist clenches up,
  // his back foot digs in and he slides a little; then he pushes slowly back up into his stance
  hurt:{T:0.6,keys:[
    {t:0,p:{}},
    {t:0.06,ease:'out',p:{spine:[-7,0,2],chest:[-4,0,0],head:[9,0,-4],_hips:[0,-0.04,-0.026],legL:[12,0,8],legR:[-12,0,-8],footR:[10,0,0],upperarmL:[-12,6,4],forearmL:[7,0,0],upperarmR:[-10,0,-16],forearmR:[-30,0,0],earL:[20,0,0],earR:[20,0,0],tail1:[14,0,0]}},
    {t:0.20,p:{spine:[-3,0,1],chest:[-2,0,0],head:[5,0,-2],_hips:[0,-0.046,-0.032],legL:[13,0,8],legR:[-13,0,-8],footR:[10,0,0],upperarmL:[-17,0,2],forearmL:[9,-2,0],upperarmR:[-6,0,-9],forearmR:[-20,0,0],earL:[8,0,0],earR:[8,0,0],tail1:[-6,0,0]}},
    {t:0.42,p:{spine:[5,0,0],head:[-2,0,0],_hips:[0,-0.024,-0.01],legL:[6,0,4],legR:[-6,0,-4],upperarmL:[-9,-3,0],forearmL:[4,-1,0],forearmR:[-8,0,0]}},
    {t:0.6,p:{}},
  ]},
  // wave: a big slow one. The fist goes up high and swings twice from the shoulder, his trunk sways under it and his weight rolls onto the shield-side foot; he ends it with a short nod
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.34,p:{upperarmR:[0,0,-132],forearmR:[10,0,24],head:[-4,0,-7],spine:[-2,0,5],chest:[0,6,0],hips:[0,0,-2],_hips:[0.012,0.008,0]}},
    {t:1.46,p:{upperarmR:[0,0,-132],forearmR:[10,0,24],head:[-4,0,-7],spine:[-2,0,5],chest:[0,6,0],hips:[0,0,-2],_hips:[0.012,0.008,0]}},
    {t:1.72,p:{upperarmR:[0,0,-50],forearmR:[0,0,8],head:[10,0,0],spine:[5,0,1],chest:[2,2,0],_hips:[0,-0.012,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5), w=Math.sin(2*Math.PI*t/0.52);return{upperarmR:[0,0,-8*e*w],forearmR:[0,0,-22*e*Math.sin(2*Math.PI*t/0.52-0.5)],handR:[0,0,-12*e*Math.sin(2*Math.PI*t/0.52-1.0)],spine:[0,0,2.6*e*w],chest:[0,0,1.2*e*Math.sin(2*Math.PI*t/0.52-0.4)],head:[0,0,-2*e*Math.sin(2*Math.PI*t/0.52-0.8)],_hips:[0.004*e*w,0,0],...tail(t,1.0,8)};}},
  // guard: the slab snaps up square in front with a stamp, the free paw braces behind it, and two blows drive him back a hand's width each
  guard:{T:2.2,nolag:true,twoHand:TH(0.2,1.9),staffPose:GUARD,keys:[
    {t:0,p:{}},
    {t:0.07,p:{spine:[-3,0,0],_hips:[0,0.012,-0.01],legL:[-10,0,3]}},
    {t:0.2,ease:'in',p:{spine:[11,0,0],chest:[4,0,0],head:[-4,0,0],_hips:[0,-0.07,0.02],...BRACE,legL:[-14,0,7],legR:[10,0,-7],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.32,p:{spine:[9,0,0],chest:[3,0,0],head:[-3,0,0],_hips:[0,-0.058,0.02],...BRACE,legL:[-12,0,6],legR:[9,0,-6]}},
    {t:1.75,p:{spine:[9,0,0],chest:[3,0,0],head:[-3,0,0],_hips:[0,-0.058,0.02],...BRACE,legL:[-12,0,6],legR:[9,0,-6]}},
    {t:2.2,p:{}},
  ],fn:(t,T)=>{const k=(c)=>bump(t,c,0.045)-0.55*bump(t,c+0.11,0.08);const e=k(0.8)+k(1.3);return{spine:[-9*e,0,0],chest:[-3*e,0,0],_hips:[0,-0.012*Math.abs(e),-0.028*e],head:[5*e,0,0],legL:[4*e,0,0],legR:[4*e,0,0],earL:[10*e,0,0],earR:[10*e,0,0]};}},
};
for(const n of ['combo','castPoint','castSweep'])CLIPS[n].mech=true;
// ---- derived clips
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={mech:true,T:0.84,keys:cut(K,0,0.46,0.38),fn:sway};
 CLIPS.combo2={mech:true,T:0.86,keys:cut(K,0.46,0.94,0.38),fn:sway,offHand:{...HOOK(0.46),to:0.62}};
 CLIPS.combo3={mech:true,T:1.34,keys:cut(K,0.94,1.80,0.48),fn:sway,twoHand:TH(0.44,1.04)};
 CLIPS.downCrawl={T:1.3,loop:true,keys:[{t:0,p:PRONE},{t:1.3,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmR:[22*s,0,6*c], forearmR:[-14*Math.max(0,c),0,0], upperarmL:[-10*s,0,0], legL:[-12*s,0,0], legR:[12*s,0,0], footL:[8*s,0,0], footR:[-8*s,0,0],
   hips:[0,4*s,3*s], chest:[0,-5*s,0], head:[3*c,4*s,0], _hips:[0,0.006*Math.abs(c),0], tail2:[0,10*s,0], tail3:[0,12*S(t,T,0.12),0]};}};
}

// ---- run: four directions on one period so diagonals blend without re-timing. A charge: he leans in behind the slab and pounds.
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 CLIPS.run={T:0.56,loop:true,fn:(t,T)=>{const s=S(t,T),c2=stepBob(t,T),b2=stepBob(t,T,0.7),b3=stepBob(t,T,1.3);return{
   _hips:[0.016*s,0.026*c2-0.024,0], hips:[0,8*s,5.5*s], spine:[17+3*c2,-5*s,-4*s], chest:[4+3*b2,-10*s,0], head:[-15+4.5*b3,6*s,0],
   legL:[-42*s,0,0], legR:[42*s,0,0], footL:[34*pos(-S(t,T,0.15)),0,0], footR:[34*pos(S(t,T,0.15)),0,0],
   upperarmR:[-38*s,0,-4], forearmR:[-36-10*s,0,0], upperarmL:[-12+5*b2,5*s,0], forearmL:[6+4.5*b3,0,0], earL:[-8+5*b3,0,0], earR:[-8+5*b3,0,0], ...tail(t,T,16),
 };}};
 CLIPS.runBack={T:0.56,loop:true,fn:sc(walkBackFn,0.9,1.3)};
 CLIPS.runLeft={T:0.56,loop:true,fn:sc((t,T)=>strafeFn(t,T,1),0.84,1.3)};
 CLIPS.runRight={T:0.56,loop:true,fn:sc((t,T)=>strafeFn(t,T,-1),0.84,1.3)};
}
