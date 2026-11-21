// Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is his left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward, rz+ toward his left. Torso: rx+ leans forward, ry+ turns to his left, rz- leans to his left.
export const CFG={name:'tank',weaponFile:'shield.glb',hand:'handL',scale:0.58,grip:[0,0.5,-0.17],palm:[0.045,-0.04,0.0],tilt:[0,12,0],holdBones:['upperarmL','forearmL','handL','fingersL'],box:[-0.35,0.35,0.01,0.99,-0.1,0.08]};
export const BASE={
  upperarmL:[-18,0,-30], forearmL:[-62,-30,0],
  upperarmR:[-6,0,34], forearmR:[-14,0,0],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
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
export const CLIPS={
  idle:{T:2.8,loop:true,fn:(t,T)=>({
    _hips:[0,0.006*S(t,T),0], spine:[1.5*S(t,T),0,0], chest:[1.5*S(t,T,0.08),0,0], head:[-1.5*S(t,T,0.12),3*S(t,T*2,0.1),0],
    earL:[0,0,-8*bump(t,1.3,0.07)], earR:[0,0,7*bump(t,0.5,0.07)],
    upperarmL:[1.5*S(t,T,0.1),0,0], upperarmR:[1.5*S(t,T,0.05),0,-1.5*S(t,T)], ...tail(t,T,6),
  })},
  walk:{T:0.76,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0.012*s,0.012*c2-0.008,0], hips:[0,4*s,3.5*s], spine:[5,-2*s,-2.5*s], chest:[0,-5*s,0], head:[-3+1.5*c2,3*s,-1*s],
    legL:[-24*s,0,0], legR:[24*s,0,0], footL:[Math.max(0,-14*S(t,T,0.15)),0,0], footR:[Math.max(0,14*S(t,T,0.15)),0,0],
    upperarmR:[-16*s,0,0], forearmR:[-8-6*s,0,0], upperarmL:[2*c2,3*s,0], ...tail(t,T,10),
  };}},
  walkBack:{T:0.84,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0.010*s,0.010*c2-0.008,0], hips:[0,-3*s,3*s], spine:[-2,2*s,-2*s], chest:[0,3*s,0], head:[4+1.5*c2,-2*s,0],
    legL:[-20*s+3,0,0], legR:[20*s+3,0,0], footL:[-8*Math.max(0,-s),0,0], footR:[-8*Math.max(0,s),0,0],
    upperarmR:[-9*s,0,-3], upperarmL:[-6+2*c2,-3*s,0], ...tail(t,T,7),
  };}},
  walkLeft:{T:0.76,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.76,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // 1 backhand bash left to right, 2 rising bash low right to high left, 3 overhead slam with both paws
  combo:{T:1.9,keys:[
    {t:0,p:{}},
    {t:0.14,p:{hips:[0,10,0],spine:[-3,10,0],chest:[-2,22,0],head:[0,-18,0],upperarmL:[-6,34,10],forearmL:[0,10,0],upperarmR:[6,0,-8],_hips:[0.01,-0.012,-0.02],legL:[6,0,0]}},
    {t:0.26,ease:'in',p:{hips:[0,-10,0],spine:[9,-12,0],chest:[5,-30,0],head:[0,22,0],upperarmL:[-46,-30,0],forearmL:[34,-10,0],upperarmR:[14,0,-22],_hips:[-0.01,-0.03,0.035],legR:[-12,0,0]}},
    {t:0.44,p:{hips:[0,-12,0],spine:[7,-14,0],chest:[4,-34,0],head:[0,24,0],upperarmL:[-44,-32,0],forearmL:[32,-10,0],upperarmR:[10,0,-18],_hips:[-0.012,-0.035,0.03],legR:[-10,0,0]}},
    {t:0.58,p:{hips:[0,-14,0],spine:[16,-14,0],chest:[8,-30,0],head:[-8,24,0],upperarmL:[-34,-26,0],forearmL:[40,-6,0],upperarmR:[8,0,-12],_hips:[-0.012,-0.06,0.02],legR:[-10,0,0],legL:[8,0,0]}},
    {t:0.70,ease:'in',p:{hips:[0,8,0],spine:[-6,10,0],chest:[-8,20,0],head:[-4,-14,0],upperarmL:[-96,16,6],forearmL:[-10,0,0],upperarmR:[12,0,-26],_hips:[0.01,0.035,0.03],legL:[-10,0,0],footR:[14,0,0]}},
    {t:0.90,p:{hips:[0,10,0],spine:[-8,10,0],chest:[-9,22,0],head:[-4,-14,0],upperarmL:[-108,20,8],forearmL:[-12,0,0],upperarmR:[8,0,-22],_hips:[0.01,0.02,0.02],legL:[-8,0,0]}},
    {t:1.10,p:{spine:[-14,0,0],chest:[-10,0,0],head:[-10,0,0],upperarmL:[-150,-12,-8],forearmL:[-8,-10,0],upperarmR:[-150,0,-30],forearmR:[-30,0,0],_hips:[0,0.07,-0.02],legL:[6,0,0],legR:[6,0,0],footL:[16,0,0],footR:[16,0,0]}},
    {t:1.24,ease:'in',p:{spine:[26,0,0],chest:[12,0,0],head:[-16,0,0],upperarmL:[-56,-30,0],forearmL:[40,-16,0],upperarmR:[-52,20,-30],forearmR:[-20,0,0],_hips:[0,-0.075,0.07],legL:[-26,0,0],legR:[14,0,0],footR:[18,0,0]}},
    {t:1.48,p:{spine:[22,0,0],chest:[10,0,0],head:[-13,0,0],upperarmL:[-52,-30,0],forearmL:[38,-16,0],upperarmR:[-46,20,-30],forearmR:[-20,0,0],_hips:[0,-0.06,0.06],legL:[-22,0,0],legR:[12,0,0],footR:[14,0,0]}},
    {t:1.9,p:{}},
  ],fn:(t,T)=>tail(t,0.9,8)},
  dash:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.1,p:{spine:[-6,0,0],_hips:[0,-0.04,-0.02],legL:[8,0,0],legR:[8,0,0],upperarmL:[-10,-10,0]}},
    {t:0.22,ease:'out',p:{spine:[22,0,0],chest:[8,10,0],head:[-18,-8,0],_hips:[0,0.04,0.06],legL:[-32,0,0],legR:[30,0,0],footR:[24,0,0],upperarmL:[-40,-24,0],forearmL:[40,-8,0],upperarmR:[30,0,-12],tail1:[-20,0,0]}},
    {t:0.42,p:{spine:[20,0,0],chest:[7,10,0],head:[-16,-8,0],_hips:[0,0.03,0.07],legL:[26,0,0],legR:[-32,0,0],footL:[24,0,0],upperarmL:[-38,-24,0],forearmL:[40,-8,0],upperarmR:[26,0,-12],tail1:[-20,0,0]}},
    {t:0.54,ease:'in',p:{spine:[10,0,0],_hips:[0,-0.045,0.03],legL:[-10,0,0],legR:[8,0,0],head:[4,0,0],upperarmL:[-10,-10,0]}},
    {t:0.7,p:{}},
  ]},
  dashBack:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.1,p:{spine:[8,0,0],_hips:[0,-0.04,0.02],legL:[-6,0,0],legR:[-6,0,0]}},
    {t:0.22,ease:'out',p:{spine:[-14,0,0],chest:[-5,0,0],head:[14,0,0],_hips:[0,0.045,-0.06],legL:[-30,0,0],legR:[-16,0,0],footL:[-16,0,0],upperarmL:[-30,-18,0],upperarmR:[-22,0,-16],forearmR:[-20,0,0],tail1:[16,0,0]}},
    {t:0.42,p:{spine:[-12,0,0],chest:[-4,0,0],head:[12,0,0],_hips:[0,0.035,-0.07],legL:[-18,0,0],legR:[-28,0,0],footR:[-16,0,0],upperarmL:[-28,-18,0],upperarmR:[-20,0,-16],forearmR:[-20,0,0],tail1:[16,0,0]}},
    {t:0.54,ease:'in',p:{spine:[4,0,0],_hips:[0,-0.045,-0.03],legL:[8,0,0],legR:[5,0,0],head:[-3,0,0]}},
    {t:0.7,p:{}},
  ]},
  dashLeft:{T:0.7,keys:sideDash(1)},
  dashRight:{T:0.7,keys:sideDash(-1)},
  // thrust: a straight shield punch (charges, bashes)
  castPoint:{T:0.85,keys:[
    {t:0,p:{}},
    {t:0.13,p:{spine:[-5,8,0],chest:[-3,16,0],head:[0,-14,0],upperarmL:[14,10,0],forearmL:[-14,0,0],upperarmR:[-10,0,-10],_hips:[0,-0.02,-0.025]}},
    {t:0.23,ease:'in',p:{spine:[12,-6,0],chest:[6,-14,0],head:[-8,12,0],upperarmL:[-62,-22,0],forearmL:[46,-12,0],upperarmR:[24,0,-18],_hips:[0,-0.03,0.05],legL:[-14,0,0],legR:[10,0,0]}},
    {t:0.5,p:{spine:[10,-6,0],chest:[5,-12,0],head:[-7,10,0],upperarmL:[-56,-22,0],forearmL:[42,-12,0],upperarmR:[20,0,-16],_hips:[0,-0.028,0.045],legL:[-12,0,0],legR:[8,0,0]}},
    {t:0.85,p:{}},
  ]},
  // roar: chest out, arms flung wide (taunts, rallies, auras)
  castBloom:{T:1.2,keys:[
    {t:0,p:{}},
    {t:0.16,p:{spine:[12,0,0],chest:[6,0,0],head:[12,0,0],_hips:[0,-0.05,0],upperarmL:[-14,-10,0],upperarmR:[-10,0,14],forearmR:[-30,0,0]}},
    {t:0.32,ease:'out',p:{spine:[-12,0,0],chest:[-10,0,0],head:[-26,0,0],_hips:[0,0.03,0],upperarmL:[10,44,30],forearmL:[10,10,0],upperarmR:[10,0,-58],forearmR:[10,0,-10],earL:[-10,0,0],earR:[-10,0,0],legL:[0,0,5],legR:[0,0,-5]}},
    {t:0.85,p:{spine:[-10,0,0],chest:[-8,0,0],head:[-22,0,0],_hips:[0,0.015,0],upperarmL:[10,40,28],forearmL:[10,10,0],upperarmR:[10,0,-54],forearmR:[10,0,-10],legL:[0,0,5],legR:[0,0,-5]}},
    {t:1.2,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.58,0.2);return{head:[0,0,3*e*Math.sin(2*Math.PI*t/0.09)],chest:[0,0,1.2*e*Math.sin(2*Math.PI*t/0.09)]};}},
  // plant: the slab driven into the ground in front (walls, stances, ground skills)
  castPlant:{T:1.2,keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-8,0,0],head:[-6,0,0],_hips:[0,0.04,0],upperarmL:[-118,-16,0],forearmL:[-6,-10,0],upperarmR:[-100,22,-20],forearmR:[-30,0,0],footL:[10,0,0],footR:[10,0,0]}},
    {t:0.32,ease:'in',p:{spine:[20,0,0],chest:[8,0,0],head:[-10,0,0],_hips:[0,-0.07,0.03],upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-38,26,-24],forearmR:[-24,0,0],legL:[-18,0,6],legR:[10,0,-6]}},
    {t:0.8,p:{spine:[18,0,0],chest:[7,0,0],head:[-9,0,0],_hips:[0,-0.06,0.03],upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-36,26,-24],forearmR:[-24,0,0],legL:[-16,0,6],legR:[9,0,-6]}},
    {t:1.2,p:{}},
  ]},
  // sweep: a wide turn of the whole trunk with the slab out (cleaves, whirls)
  castSweep:{T:1.0,keys:[
    {t:0,p:{}},
    {t:0.16,p:{hips:[0,16,0],spine:[0,14,0],chest:[0,26,0],head:[0,-30,0],upperarmL:[-20,40,16],forearmL:[20,10,0],upperarmR:[0,0,-10],_hips:[0.01,-0.025,0]}},
    {t:0.32,ease:'in',p:{hips:[0,-16,0],spine:[6,-16,0],chest:[4,-34,0],head:[0,34,0],upperarmL:[-44,-36,0],forearmL:[34,-14,0],upperarmR:[16,0,-34],_hips:[-0.01,-0.035,0.02],legR:[-10,0,0]}},
    {t:0.6,p:{hips:[0,-18,0],spine:[6,-18,0],chest:[4,-38,0],head:[0,36,0],upperarmL:[-38,-40,0],forearmL:[30,-14,0],upperarmR:[12,0,-30],_hips:[-0.01,-0.035,0.02]}},
    {t:1.0,p:{}},
  ]},
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
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-14,0,3],chest:[-6,0,0],head:[-12,0,-5],_hips:[0,-0.015,-0.04],upperarmL:[-14,14,8],upperarmR:[-18,0,-26],forearmR:[-16,0,0],legL:[10,0,0],earL:[14,0,0],earR:[14,0,0],tail1:[16,0,0]}},
    {t:0.2,p:{spine:[-8,0,2],head:[-5,0,-3],_hips:[0,-0.02,-0.03],upperarmL:[-6,6,4],upperarmR:[-8,0,-12]}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.005,-0.01]}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{upperarmR:[0,0,-128],forearmR:[10,0,24],head:[0,0,-6],spine:[0,0,3],_hips:[0,0.008,0]}},
    {t:1.5,p:{upperarmR:[0,0,-128],forearmR:[10,0,24],head:[0,0,-6],spine:[0,0,3],_hips:[0,0.008,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{forearmR:[0,0,-24*e*Math.sin(2*Math.PI*t/0.4)],handR:[0,0,-12*e*Math.sin(2*Math.PI*t/0.4-0.6)],...tail(t,1.0,8)};}},
  // guard: the slab up and square in front, two blows shrugged off
  guard:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.22,ease:'out',p:{spine:[8,-6,0],chest:[3,-10,0],head:[-2,12,0],_hips:[0,-0.05,0.01],upperarmL:[-40,-28,0],forearmL:[22,-12,0],upperarmR:[-10,0,10],forearmR:[-40,0,0],legL:[-10,0,5],legR:[8,0,-5]}},
    {t:1.6,p:{spine:[8,-6,0],chest:[3,-10,0],head:[-2,12,0],_hips:[0,-0.05,0.01],upperarmL:[-40,-28,0],forearmL:[22,-12,0],upperarmR:[-10,0,10],forearmR:[-40,0,0],legL:[-10,0,5],legR:[8,0,-5]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const k=(c)=>bump(t,c,0.05)-0.5*bump(t,c+0.1,0.07);const e=k(0.7)+k(1.2);return{spine:[-7*e,0,0],upperarmL:[9*e,0,0],_hips:[0,0,-0.02*e],head:[3*e,0,0]};}},
};
// ---- derived clips
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={T:0.78,keys:cut(K,0,0.44,0.34),fn:sway};
 CLIPS.combo2={T:0.80,keys:cut(K,0.44,0.90,0.34),fn:sway};
 CLIPS.combo3={T:1.0,keys:cut(K,0.90,1.48,0.42),fn:sway};
 CLIPS.downCrawl={T:1.3,loop:true,keys:[{t:0,p:PRONE},{t:1.3,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmR:[22*s,0,6*c], forearmR:[-14*Math.max(0,c),0,0], upperarmL:[-10*s,0,0], legL:[-12*s,0,0], legR:[12*s,0,0], footL:[8*s,0,0], footR:[-8*s,0,0],
   hips:[0,4*s,3*s], chest:[0,-5*s,0], head:[3*c,4*s,0], _hips:[0,0.006*Math.abs(c),0], tail2:[0,10*s,0], tail3:[0,12*S(t,T,0.12),0]};}};
}

// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 CLIPS.run={T:0.52,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
   _hips:[0,0.018*c2-0.018*0.6,0], hips:[0,7*s,3*s], spine:[11,-4*s,-2.5*s], chest:[2,-8*s,0], head:[-11+3+2*c2,5*s,0],
   legL:[-34*s,0,0], legR:[34*s,0,0], footL:[Math.max(0,-30*S(t,T,0.15)),0,0], footR:[Math.max(0,30*S(t,T,0.15)),0,0],
   upperarmR:[-30*s,0,0], forearmR:[-30-8*s,0,0], upperarmL:[-6+3*c2,4*s,0], ...tail(t,T,12),
 };}};
 CLIPS.runBack={T:0.52,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.35)};
 CLIPS.runLeft={T:0.52,loop:true,fn:sc(CLIPS.walkLeft.fn,0.76,1.35)};
 CLIPS.runRight={T:0.52,loop:true,fn:sc(CLIPS.walkRight.fn,0.76,1.35)};
}
