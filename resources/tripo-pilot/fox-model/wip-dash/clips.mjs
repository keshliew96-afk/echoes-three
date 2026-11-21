// Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is his left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward, rz+ toward his left. Torso: rx+ leans forward, ry+ turns to his left, rz- leans to his left.
export const CFG={name:'fox',weaponFile:'sword.glb',hand:'handR',scale:0.56,grip:[0,0.2,0],palm:[-0.02,-0.035,0.02],tilt:[52,90,0],tiltOrder:'XYZ',
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[-0.075,0.075,0.34,1.0,-0.025,0.025],pushMode:'away',sole:[[0,-0.07,-0.03],[0,-0.07,0.1]],
  // follow-through: quick and whippy. The trunk leads, the head and free arm trail, the wrist trails most so the blade whips through
  carry:0.5,lag:{chest:0.01,head:0.03,upperarmL:0.02,forearmL:0.03,handL:0.05,forearmR:0.015,handR:0.035},
  springs:[{bone:'earL',k:520,z:0.42,max:24,tip:[0.05,0.12,0]},{bone:'earR',k:520,z:0.42,max:24,tip:[-0.05,0.12,0]},
    {bone:'tail1',k:400,z:0.5,max:16},{bone:'tail2',k:320,z:0.42,max:22},{bone:'tail3',k:250,z:0.38,max:28},{bone:'tail4',k:200,z:0.36,max:32},{bone:'tail5',k:160,z:0.34,max:36,tip:[0,0.02,-0.1]}]};
export const BASE={
  spine:[4,0,0], head:[-4,0,0],
  upperarmR:[-10,0,14], forearmR:[-34,0,0],
  upperarmL:[4,0,-14], forearmL:[-16,0,0],   // the rest pose: both arms brought in from the model's arms-out pose. Poses add to this: for the free arm +z swings it OUT from his side, -z into his body
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2; // a soft max(0,x)
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tail=(t,T,a,lag=0.1)=>{const o={};for(let i=1;i<=5;i++)o['tail'+i]=[0,a*S(t,T,lag*i)*(0.5+0.14*i),0];return o;};
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.008*dir*s,0.012*c2-0.014,0], hips:[0,0,-3*dir*s], spine:[2,0,3*dir*s], chest:[0,0,2*dir*s], head:[1.5*c2,0,-3*dir*s],
    upperarmL:[0,0,4*s], upperarmR:[2*c2,0,0], earL:[4*S(t,T/2,0.2),0,0], earR:[4*S(t,T/2,0.2),0,0], ...tail(t,T,12)};
  o['leg'+lead]=[-12*pos(c),0,dir*(3+19*pos(s,0.3))]; o['leg'+trail]=[-12*pos(-c),0,-dir*(3+15*pos(-s,0.3))];
  o['foot'+lead]=[8*pos(c),0,0]; o['foot'+trail]=[8*pos(-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-6*d],head:[-4,0,14*d],_hips:[0.07*d*k,0.05,0],earL:[0,0,14*d],earR:[0,0,14*d],tail1:[0,-24*d,0],tail2:[0,-20*d,0],tail3:[0,-14*d,0],upperarmL:[0,0,d>0?26:8],upperarmR:[-8,0,d>0?-8:-24]};
    p['leg'+L]=[-16,0,24*d];p['leg'+R]=[6,0,-26*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.045,0]};crouch['leg'+L]=[0,0,-2*d];crouch['leg'+R]=[0,0,4*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.04,0],head:[2,0,4*d],earL:[0,0,-8*d],earR:[0,0,-8*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
const PRONE={hips:[84,0,0],chest:[3,0,0],head:[-60,0,0],_hips:[0,-0.24,0.0],legL:[6,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],
  upperarmL:[-160,0,-22],forearmL:[-6,0,0],upperarmR:[-150,0,24],forearmR:[20,0,0],handR:[78,0,0],earL:[20,0,8],earR:[20,0,-8],tail1:[-40,0,0],tail2:[-10,14,0]};
// ---- the Swordsman's style (Kesh, 11-12, as for the Tank: fit the class): light, quick and low. Short loads, fast releases, quick recoveries;
// the blade leads and the body follows it; he lands low and holds the finish; the tail and the free arm throw the other way for balance.
const rotY=(v,deg)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];};
// the blade through the combo: p is where the sword paw is, d is where the blade points (his own space: +x his left, +y up, +z forward)
const OUT_P=[-0.31,0.58,0.05], OUT_D=[-0.97,0.02,0.24], SPIN_C=[0,0,0.14]; const spinP=(deg)=>{const v=rotY(OUT_P,deg);return [v[0]+SPIN_C[0],v[1],v[2]+SPIN_C[2]];};
const BLADE=(o,from,to,last=9,fade=0.08)=>({from,to,fade,keys:[
  {t:0.02,p:[-0.20,0.52,0.06],d:[-0.2,0.6,0.77]},
  {t:0.07,p:[-0.29,0.70,0.0],d:[-0.42,0.6,-0.68]},                 // 1 load: up and back over his right shoulder
  {t:0.14,p:[-0.02,0.46,0.37],d:[0.55,-0.16,0.82],ease:'in'},       // 1 contact: down across the front
  {t:0.22,p:[0.17,0.38,0.33],d:[0.9,-0.26,0.35]},                   // 1 finish: low at his left, which loads 2
  {t:0.26,p:[0.18,0.38,0.31],d:[0.95,-0.2,0.2]},
  {t:0.32,p:[-0.12,0.60,0.31],d:[-0.45,0.36,0.82],ease:'in'},       // 2 contact: rising backhand
  {t:0.40,p:[-0.27,0.70,0.10],d:[-0.7,0.6,0.38]},                   // 2 finish: high at his right
  {t:0.44,p:[-0.22,0.58,-0.02],d:[0.08,0.06,0.99]},                 // 3 chamber: the grip snaps back to his shoulder, point at the target
  {t:0.50,p:[-0.07,0.52,0.41],d:[0,0.0,1],ease:'in'},               // 3 contact: straight out
  {t:0.58,p:[-0.14,0.54,0.30],d:[-0.3,0.04,0.95]},                  // 3 recoil: the point drags off to his right, which starts the spin
  {t:0.66,p:spinP(-90),d:rotY(OUT_D,-90)},                     // 4 the spin, blade out level
  {t:0.74,p:spinP(-190),d:rotY(OUT_D,-190)},
  {t:0.82,p:spinP(-290),d:rotY(OUT_D,-290)},                   // 4 contact: the blade comes through the front
  {t:0.92,p:[-0.32,0.41,0.12],d:[-0.95,-0.2,-0.22]},               // landed: the blade swept round behind him, low
  {t:1.20,p:[-0.32,0.40,0.12],d:[-0.95,-0.22,-0.21]},
  {t:1.28,p:[-0.31,0.38,0.12],d:[-0.78,-0.58,-0.2]},                  // a flick of the point
  {t:1.36,p:[-0.22,0.46,0.08],d:[-0.3,0.4,0.8]},
].filter(k=>k.t<=last+1e-6).map(k=>({...k,t:+(k.t-o).toFixed(3)}))});
export const CLIPS={
  // idle: on guard. Sword side forward, feet staggered, weight low, the blade held out in front with its point up at an enemy's throat; the free arm hangs back for balance.
  // A quick breath, the point drifts in a small circle, the tail swishes, ears turn to sounds
  idle:{T:2.6,loop:true,staffPose:{from:-1,to:9,fade:0.01,keys:[0,0.65,1.3,1.95,2.6].map((t,i)=>({t,p:[-0.19+0.006*[0,1,0,-1,0][i],0.43+0.008*[1,0,-1,0,1][i],0.10],d:[0.10+0.05*[0,1,0,-1,0][i],0.50+0.04*[1,0,-1,0,1][i],0.86],n:[1,0,0]}))},fn:(t,T)=>{const b=S(t,T/2), b2=S(t,T/2,0.1), w=S(t,T,0.15);return{
    _hips:[0.006*w,0.006*b-0.04,0.01], hips:[0,20,1.2*w], spine:[5+1.6*b,3,-1*w], chest:[2+1.6*b2,6+1.2*w,0], head:[-4-1.5*S(t,T/2,0.16),-26+4*S(t,T,0.05)+2*S(t,T/3,0.2),0],
    legL:[16,0,6], legR:[-20,0,-4], footL:[10,0,0],
    earL:[0,0,-11*bump(t,1.3,0.07)+6*bump(t,2.2,0.07)], earR:[0,0,10*bump(t,0.5,0.07)],
    upperarmL:[-14+2*b2,0,14-1.5*b], forearmL:[-16-3*b2,0,0], ...tail(t,T/2,13),
  };}},
  // walk: light and quick, up on his toes, the blade carried still while the free arm and the tail swing
  walk:{T:0.62,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.006*s,0.016*c2-0.016,0], hips:[0,6*s,3*s], spine:[7,-3.5*s,-2.5*s], chest:[1.2*b2,-7*s,0], head:[-5+2.4*b2,5*s,0],
    legL:[-36*s,0,0], legR:[36*s,0,0], footL:[24*pos(-S(t,T,0.15)),0,0], footR:[24*pos(S(t,T,0.15)),0,0],
    upperarmL:[28*s,0,2], forearmL:[-14+10*s,0,0], handL:[8*S(t,T,0.1),0,0], upperarmR:[-8-5*s,0,0], forearmR:[-6+2*b2,0,0], handR:[4*b2,0,0],
    earL:[6*S(t,T/2,0.2),0,0], earR:[6*S(t,T/2,0.2),0,0], ...tail(t,T,18),
  };}},
  walkBack:{T:0.7,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.012*c2-0.014,0], hips:[0,-4*s,2*s], spine:[-3,2*s,-1.5*s], chest:[0,4*s,0], head:[4+1.5*c2,-3*s,0],
    legL:[-28*s+4,0,0], legR:[28*s+4,0,0], footL:[-10*pos(-s),0,0], footR:[-10*pos(s),0,0],
    upperarmL:[14*s,0,4], forearmL:[-6,0,0], upperarmR:[-4*s,0,0],
    earL:[-4*S(t,T/2,0.2),0,0], earR:[-4*S(t,T/2,0.2),0,0], ...tail(t,T,10),
  };}},
  walkLeft:{T:0.62,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.62,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // The sword combo, four hits in the same 1.6 s (Kesh, 11-12: "make it 4 hit, but total time use for full combo stay the same").
  // Cut, cut, thrust, spin: 1 a forehand cut down across the front with a step in (0.14 s); 2 the blade whips straight back up as a rising backhand (0.32 s);
  // 3 from the top of that he snaps the grip back to his shoulder and stabs straight out in a short lunge (0.50 s);
  // 4 the thrust's recoil throws him into a full spin to his right with the blade out level, it cuts through the front on the way round (0.82 s),
  //   and he lands in a deep lunge and holds the finish. No stop between hits: each finish is the next one's load.
  combo:{T:1.6,staffPose:BLADE(0,0.02,1.36),keys:[
    {t:0,p:{}},
    {t:0.07,p:{spine:[-6,-12,0],chest:[-4,-28,0],head:[2,26,0],upperarmL:[14,0,8],forearmL:[-14,0,0],_hips:[0,-0.03,-0.04],legR:[14,0,0],legL:[-8,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.14,ease:'in',p:{spine:[16,14,0],chest:[8,34,0],head:[-8,-30,0],upperarmL:[34,0,26],forearmL:[-6,0,0],_hips:[0,-0.085,0.09],legR:[-38,0,0],legL:[26,0,0],footL:[26,0,0],earL:[12,0,0],earR:[12,0,0]}},
    {t:0.22,p:{spine:[19,16,0],chest:[9,40,0],head:[-12,-32,0],upperarmL:[30,0,24],forearmL:[-6,0,0],_hips:[0,-0.095,0.09],legR:[-37,0,0],legL:[26,0,0],footL:[22,0,0]}},
    {t:0.26,p:{spine:[19,14,0],chest:[9,36,0],head:[-12,-30,0],upperarmL:[26,0,20],forearmL:[-8,0,0],_hips:[0,-0.095,0.09],legR:[-36,0,0],legL:[26,0,0],footL:[20,0,0]}},
    {t:0.32,ease:'in',p:{spine:[-8,-12,0],chest:[-9,-26,0],head:[-2,22,0],upperarmL:[26,0,36],forearmL:[-10,0,0],_hips:[0,0.03,0.11],legR:[-16,0,0],legL:[14,0,0],footR:[22,0,0],footL:[24,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.40,p:{spine:[-8,-13,0],chest:[-8,-30,0],head:[0,30,0],upperarmL:[10,0,30],forearmL:[-14,0,0],_hips:[0,0.02,0.09],legR:[-6,0,0],legL:[8,0,0],footR:[14,0,0],footL:[16,0,0]}},
    // 3: the chamber is a blink (0.04 s), then the whole body goes in behind the point
    {t:0.44,p:{spine:[-2,-14,0],chest:[-4,-30,0],head:[0,30,0],upperarmL:[-20,0,14],forearmL:[-20,0,0],_hips:[0,-0.03,0.07],legR:[4,0,0],legL:[2,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.50,ease:'in',p:{spine:[18,9,0],chest:[8,20,0],head:[-18,-18,0],upperarmL:[40,0,24],forearmL:[8,0,0],_hips:[0,-0.085,0.16],legR:[-42,0,0],legL:[26,0,0],footL:[26,0,0],earL:[16,0,0],earR:[16,0,0]}},
    {t:0.58,p:{hips:[0,-10,0],spine:[14,6,0],chest:[6,10,0],head:[-14,0,0],upperarmL:[30,0,30],forearmL:[4,0,0],_hips:[0,-0.06,0.15],legR:[-34,0,0],legL:[22,0,0],footL:[20,0,0]}},
    // 4 the spin: one full turn to his right, a hop with the legs tucked, the free arm flung wide, the head whips round ahead of the body
    {t:0.66,ease:'lin',p:{hips:[0,-90,0],spine:[4,-4,0],chest:[0,-8,0],head:[0,34,0],upperarmL:[0,0,58],forearmL:[8,0,0],_hips:[0,0.08,0.14],legL:[-20,0,12],legR:[12,0,-12],footL:[22,0,0],footR:[22,0,0],earL:[-14,0,0],earR:[-14,0,0]}},
    {t:0.74,ease:'lin',p:{hips:[0,-190,0],spine:[4,-4,0],chest:[0,-8,0],head:[0,-30,0],upperarmL:[0,0,62],forearmL:[8,0,0],_hips:[0,0.11,0.14],legL:[-22,0,14],legR:[14,0,-14],footL:[24,0,0],footR:[24,0,0],earL:[-14,0,0],earR:[-14,0,0]}},
    {t:0.82,ease:'lin',p:{hips:[0,-290,0],spine:[10,-4,0],chest:[3,-8,0],head:[-6,-34,0],upperarmL:[6,0,56],forearmL:[6,0,0],_hips:[0,0.04,0.15],legL:[-22,0,8],legR:[14,0,-8],footL:[10,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    // the landing: a deep, wide lunge on the free-side foot, trunk down over the front leg and turned after the blade, the free arm reaching forward
    {t:0.92,ease:'in',p:{hips:[0,-360,0],spine:[24,-10,0],chest:[9,-24,0],head:[-22,30,0],upperarmL:[-40,0,14],forearmL:[-14,0,0],_hips:[0,-0.11,0.16],legL:[-46,0,6],legR:[40,0,-6],footR:[34,0,0],earL:[16,0,0],earR:[16,0,0]}},
    {t:1.02,p:{hips:[0,-360,0],spine:[21,-10,0],chest:[8,-22,0],head:[-20,28,0],upperarmL:[-36,0,14],forearmL:[-14,0,0],_hips:[0,-0.098,0.16],legL:[-44,0,6],legR:[38,0,-6],footR:[31,0,0]}},
    {t:1.20,p:{hips:[0,-360,0],spine:[20,-9,0],chest:[7,-20,0],head:[-19,26,0],upperarmL:[-33,0,13],forearmL:[-14,0,0],_hips:[0,-0.092,0.15],legL:[-42,0,6],legR:[36,0,-6],footR:[29,0,0]}},
    {t:1.6,p:{hips:[0,-360,0]}},
  ],fn:(t,T)=>tail(t,0.8,12)},
  // dash (Kesh 11-13): the stance from his picture, then a thrust along the way. One clip: he turns to face where he dashes.
  // 0.00-0.10 the stance: low and wide, left shoulder leading, the sword drawn back level beside his right cheek with the point at the foe, the free paw reaching forward along the blade.
  // 0.10-0.34 the thrust: he fires off the back leg and the whole body follows the point in one long low line. 0.34-0.52 the brake: front foot plants, he skids low and flicks the blade clean. Then back on guard.
  dash:{T:0.95,
    staffPose:{from:0.0,to:0.86,fade:0.05,keys:[
      {t:0.0,p:[-0.20,0.50,0.06],d:[0.1,0.5,0.86],n:[1,0,0]},
      {t:0.07,p:[-0.17,0.555,-0.08],d:[0.16,-0.04,0.98],n:[0,1,0]},
      {t:0.11,p:[-0.17,0.54,-0.10],d:[0.16,-0.05,0.98],n:[0,1,0]},
      {t:0.17,p:[-0.05,0.44,0.46],d:[0.02,-0.02,1],n:[0,1,0],ease:'in'},
      {t:0.26,p:[-0.05,0.445,0.48],d:[0.02,-0.01,1],n:[0,1,0]},{t:0.34,p:[-0.05,0.44,0.46],d:[0.02,-0.01,1],n:[0,1,0]},
      {t:0.44,p:[-0.10,0.44,0.36],d:[-0.08,0.04,1],n:[0.3,0.95,0]},
      {t:0.54,p:[-0.30,0.36,0.16],d:[-0.72,-0.42,0.55],n:[0.5,0.8,0.3],ease:'in'},
      {t:0.66,p:[-0.29,0.38,0.14],d:[-0.66,-0.36,0.66],n:[0.6,0.7,0.3]},
      {t:0.86,p:[-0.20,0.50,0.06],d:[0.1,0.5,0.86],n:[1,0,0]}]},
    offHand:{from:0.02,to:0.16,fade:0.05,keys:[{t:0.02,p:[0.10,0.46,0.20]},{t:0.08,p:[0.05,0.50,0.36]},{t:0.12,p:[0.05,0.485,0.36]},{t:0.16,p:[0.16,0.44,0.1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[17,-16,0],chest:[6,-26,0],head:[-14,34,0],_hips:[0,-0.125,-0.05],legL:[-44,0,-9],footL:[26,0,0],legR:[38,0,11],footR:[-10,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[-16,0,0],tail2:[-10,0,0]}},
    {t:0.11,p:{spine:[20,-18,0],chest:[7,-28,0],head:[-17,36,0],_hips:[0,-0.14,-0.065],legL:[-46,0,-9],footL:[28,0,0],legR:[40,0,11],footR:[-10,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[-22,0,0],tail2:[-14,0,0]}},
    {t:0.17,ease:'in',p:{spine:[38,10,0],chest:[14,20,0],head:[-44,-18,0],_hips:[0,-0.085,0.17],legR:[-58,0,0],footR:[18,0,0],legL:[54,0,0],footL:[36,0,0],upperarmL:[52,0,14],forearmL:[12,0,0],earL:[30,0,0],earR:[30,0,0],tail1:[36,0,0],tail2:[16,0,0],tail3:[8,0,0]}},
    {t:0.26,p:{spine:[41,11,0],chest:[15,21,0],head:[-47,-18,0],_hips:[0,-0.07,0.18],legR:[-54,0,0],footR:[10,0,0],legL:[60,0,0],footL:[40,0,0],upperarmL:[58,0,16],forearmL:[14,0,0],earL:[32,0,0],earR:[32,0,0],tail1:[38,0,0],tail2:[18,0,0],tail3:[10,0,0]}},
    {t:0.34,p:{spine:[37,10,0],chest:[13,20,0],head:[-42,-17,0],_hips:[0,-0.09,0.17],legR:[-56,0,0],footR:[20,0,0],legL:[50,0,0],footL:[34,0,0],upperarmL:[50,0,14],forearmL:[12,0,0],earL:[26,0,0],earR:[26,0,0],tail1:[32,0,0],tail2:[14,0,0]}},
    {t:0.44,ease:'out',p:{spine:[22,6,0],chest:[8,10,0],head:[-22,-8,0],_hips:[0,-0.115,0.12],legR:[-40,0,-4],footR:[30,0,0],legL:[26,0,4],footL:[22,0,0],upperarmL:[20,0,30],forearmL:[-10,0,0],earL:[-26,0,0],earR:[-26,0,0],tail1:[-30,0,0],tail2:[-22,0,0],tail3:[-12,0,0]}},
    {t:0.54,p:{spine:[14,-8,0],chest:[5,-12,0],head:[-10,16,0],_hips:[0,-0.095,0.09],legR:[-32,0,-6],footR:[22,0,0],legL:[20,0,6],footL:[14,0,0],upperarmL:[4,0,22],forearmL:[-16,0,0],earL:[-10,0,0],earR:[-10,0,0],tail1:[-12,0,0],tail2:[-10,10,0]}},
    {t:0.66,p:{spine:[10,-6,0],chest:[4,-8,0],head:[-6,12,0],_hips:[0,-0.07,0.06],legR:[-22,0,-4],footR:[14,0,0],legL:[14,0,4],footL:[8,0,0],upperarmL:[2,0,14],forearmL:[-10,0,0],tail1:[4,0,0],tail2:[2,-8,0]}},
    {t:0.95,p:{}},
  ]},
  // lunge: he draws the blade back to his hip and drives it straight out in a long low lunge (the dashing strikes)
  castPoint:{T:0.95,staffPose:{from:0.02,to:0.78,fade:0.1,keys:[
      {t:0.02,p:[-0.20,0.50,0.06],d:[0,0.5,0.86]},{t:0.13,p:[-0.22,0.52,-0.04],d:[0,0.08,1]},{t:0.22,p:[-0.07,0.50,0.40],d:[0,0.0,1],ease:'in'},{t:0.30,p:[-0.07,0.50,0.39],d:[0,0.05,1]},{t:0.56,p:[-0.08,0.50,0.36],d:[0,0.06,1]},{t:0.78,p:[-0.18,0.50,0.14],d:[0,0.5,0.86]}]},keys:[
    {t:0,p:{}},
    {t:0.13,p:{spine:[-5,-12,0],chest:[-3,-22,0],head:[2,20,0],upperarmL:[-34,0,10],forearmL:[-20,0,0],_hips:[0,-0.04,-0.05],legR:[12,0,0],legL:[-6,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.22,ease:'in',p:{spine:[20,9,0],chest:[9,18,0],head:[-20,-15,0],upperarmL:[46,0,22],forearmL:[8,0,0],_hips:[0,-0.085,0.13],legR:[-42,0,0],legL:[24,0,0],footL:[24,0,0],earL:[16,0,0],earR:[16,0,0]}},
    {t:0.30,p:{spine:[18,9,0],chest:[8,17,0],head:[-18,-14,0],upperarmL:[42,0,20],forearmL:[8,0,0],_hips:[0,-0.074,0.13],legR:[-40,0,0],legL:[22,0,0],footL:[22,0,0]}},
    {t:0.56,p:{spine:[16,8,0],chest:[7,15,0],head:[-16,-12,0],upperarmL:[38,0,18],forearmL:[8,0,0],_hips:[0,-0.066,0.12],legR:[-36,0,0],legL:[20,0,0],footL:[20,0,0]}},
    {t:0.95,p:{}},
  ],fn:(t,T)=>tail(t,0.95,10)},
  // edge draw: the blade comes up before his face in a salute, then is thrust to the sky, chest out (the auras and stances).
  // Kesh, 11-12: the free arm stays straight down at his side, like standing to attention (立正)
  castBloom:{T:1.3,offHand:{from:0.04,to:1.1,fade:0.14,keys:[{t:0.04,p:[0.2,0.40,0.04]},{t:0.2,p:[0.185,0.36,0.02]},{t:0.36,p:[0.18,0.40,0.0]},{t:0.9,p:[0.18,0.385,0.0]},{t:1.1,p:[0.2,0.39,0.04]}]},staffPose:{from:0.02,to:1.08,fade:0.12,keys:[
      {t:0.02,p:[-0.16,0.52,0.10],d:[0,0.9,0.4]},{t:0.10,p:[-0.13,0.54,0.27],d:[0,0.95,0.3]},{t:0.18,p:[-0.03,0.58,0.29],d:[0,1,0.04]},{t:0.24,p:[-0.03,0.57,0.29],d:[0,1,0.04]},{t:0.36,p:[-0.15,0.86,0.06],d:[-0.04,1,-0.06],ease:'in'},{t:0.90,p:[-0.15,0.85,0.06],d:[-0.04,1,-0.06]},{t:1.08,p:[-0.18,0.60,0.10],d:[0,0.9,0.4]}]},keys:[
    {t:0,p:{}},
    {t:0.18,p:{spine:[10,0,0],chest:[4,6,0],head:[8,0,0],_hips:[0,-0.05,0],legL:[-4,0,3],legR:[-4,0,-3],earL:[8,0,0],earR:[8,0,0]}},
    {t:0.36,ease:'in',p:{spine:[-9,0,0],chest:[-8,-6,0],head:[10,0,0],_hips:[0,0.04,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[-18,0,0],legL:[0,0,-1],legR:[0,0,1],footL:[14,0,0],footR:[14,0,0]}},
    {t:0.50,p:{spine:[-8,0,0],chest:[-7,-6,0],head:[9,0,0],_hips:[0,0.025,0],tail1:[-14,0,0],legL:[0,0,-1],legR:[0,0,1],footL:[8,0,0],footR:[8,0,0]}},
    {t:0.90,p:{spine:[-7,0,0],chest:[-6,-5,0],head:[8,0,0],_hips:[0,0.012,0],tail1:[-12,0,0],legL:[0,0,-1],legR:[0,0,1]}},
    {t:1.3,p:{}},
  ],fn:(t,T)=>tail(t,0.65,14)},
  // caltrops: he drops low on the free-side foot and scatters them underhand off the free paw, low along the floor; the blade is tucked back out of the way
  castPlant:{T:1.0,offHand:{from:0.04,to:0.8,fade:0.1,keys:[{t:0.04,p:[0.22,0.40,0.0]},{t:0.17,p:[0.26,0.40,-0.16]},{t:0.28,p:[0.12,0.26,0.36],ease:'in'},{t:0.40,p:[0.04,0.36,0.44]},{t:0.62,p:[0.06,0.35,0.40]},{t:0.8,p:[0.2,0.40,0.1]}]},
    staffPose:{from:0.04,to:0.82,fade:0.1,keys:[{t:0.04,p:[-0.22,0.42,0.02],d:[-0.2,0.2,0.95]},{t:0.20,p:[-0.26,0.44,-0.06],d:[-0.3,-0.25,-0.92]},{t:0.62,p:[-0.26,0.43,-0.06],d:[-0.3,-0.3,-0.9]},{t:0.82,p:[-0.22,0.42,0.02],d:[-0.2,0.2,0.95]}]},keys:[
    {t:0,p:{}},
    {t:0.17,p:{spine:[6,16,0],chest:[3,26,0],head:[0,-22,0],_hips:[0,-0.05,-0.03],legL:[10,0,0],legR:[-6,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.28,ease:'in',p:{spine:[30,-12,0],chest:[12,-24,0],head:[-26,22,0],_hips:[0,-0.10,0.09],legL:[-44,0,0],legR:[34,0,0],footR:[30,0,0],earL:[14,0,0],earR:[14,0,0]}},
    {t:0.40,p:{spine:[27,-12,0],chest:[11,-23,0],head:[-24,21,0],_hips:[0,-0.09,0.09],legL:[-42,0,0],legR:[33,0,0],footR:[27,0,0]}},
    {t:0.62,p:{spine:[24,-11,0],chest:[9,-21,0],head:[-21,19,0],_hips:[0,-0.082,0.08],legL:[-39,0,0],legR:[30,0,0],footR:[24,0,0]}},
    {t:1.0,p:{}},
  ],fn:(t,T)=>tail(t,1.0,10)},
  // crescent: he winds the blade far back and cuts one wide level arc from his right, through the front, to his left (the arcs and wakes)
  castSweep:{T:1.05,staffPose:{from:0.02,to:0.86,fade:0.1,keys:[
      {t:0.02,p:[-0.20,0.52,0.06],d:[-0.2,0.6,0.77]},{t:0.15,p:[-0.30,0.58,-0.06],d:[-0.62,0.12,-0.77]},{t:0.24,p:[-0.24,0.56,0.20],d:[-0.6,0.02,0.8]},{t:0.30,p:[-0.02,0.47,0.44],d:[0.25,-0.04,0.97],ease:'in'},{t:0.40,p:[0.21,0.46,0.34],d:[0.96,-0.04,0.28]},{t:0.62,p:[0.22,0.45,0.30],d:[0.98,-0.06,0.1]},{t:0.74,p:[0.08,0.48,0.33],d:[0.6,0.25,0.76]},{t:0.86,p:[-0.12,0.5,0.2],d:[0,0.6,0.8]}]},keys:[
    {t:0,p:{}},
    {t:0.15,p:{spine:[-4,-16,0],chest:[-3,-36,0],head:[2,40,0],upperarmL:[10,0,12],_hips:[0,-0.04,-0.04],legR:[14,0,-4],legL:[-8,0,4],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.30,ease:'in',p:{spine:[14,18,0],chest:[7,40,0],head:[-8,-40,0],upperarmL:[30,0,44],forearmL:[-6,0,0],_hips:[0,-0.09,0.10],legR:[-40,0,-4],legL:[28,0,4],footL:[26,0,0],earL:[0,0,12],earR:[0,0,12]}},
    {t:0.40,p:{spine:[15,21,0],chest:[7,46,0],head:[-9,-42,0],upperarmL:[26,0,40],forearmL:[-6,0,0],_hips:[0,-0.098,0.10],legR:[-39,0,-4],legL:[28,0,4],footL:[23,0,0]}},
    {t:0.62,p:{spine:[13,19,0],chest:[6,42,0],head:[-8,-38,0],upperarmL:[22,0,36],forearmL:[-6,0,0],_hips:[0,-0.088,0.09],legR:[-36,0,-4],legL:[26,0,4],footL:[20,0,0]}},
    {t:1.05,p:{}},
  ],fn:(t,T)=>tail(t,1.05,14)},
  // riposte: the blade snaps up across his body to catch a blow, he sways back under it, then answers standing tall with a whipping backhand slash
  // at neck height from his left to his right. (Kesh, 11-12: it was too close to the lunge, so the answer is a cut now, not a thrust; the lunge is the only stab.)
  castParry:{T:1.15,staffPose:{from:0.02,to:0.94,fade:0.1,keys:[
      {t:0.02,p:[-0.18,0.52,0.08],d:[0,0.7,0.7]},{t:0.10,p:[-0.10,0.46,0.31],d:[0.72,0.66,0.2],ease:'in'},{t:0.22,p:[-0.10,0.46,0.31],d:[0.72,0.66,0.2]},{t:0.27,p:[-0.06,0.47,0.24],d:[0.82,0.56,0.1]},
      {t:0.35,p:[0.10,0.54,0.17],d:[0.84,0.22,-0.5]},{t:0.44,p:[-0.06,0.60,0.35],d:[-0.2,0.1,0.97],ease:'in'},{t:0.52,p:[-0.30,0.63,0.15],d:[-0.9,0.2,0.38]},{t:0.70,p:[-0.30,0.62,0.14],d:[-0.9,0.18,0.36]},{t:0.94,p:[-0.18,0.5,0.12],d:[0,0.6,0.8]}]},keys:[
    {t:0,p:{}},
    {t:0.10,ease:'in',p:{spine:[4,6,0],chest:[2,12,0],head:[-4,-8,0],upperarmL:[14,0,18],_hips:[0,-0.035,0.0],legL:[-4,0,3],legR:[4,0,-3],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.22,p:{spine:[4,6,0],chest:[2,12,0],head:[-4,-8,0],upperarmL:[14,0,18],_hips:[0,-0.035,0.0],legL:[-4,0,3],legR:[4,0,-3]}},
    {t:0.27,ease:'out',p:{spine:[-9,10,0],chest:[-4,18,0],head:[4,-14,0],upperarmL:[4,0,24],_hips:[0,-0.05,-0.05],legL:[8,0,3],legR:[12,0,-3],earL:[14,0,0],earR:[14,0,0]}},
    {t:0.35,p:{spine:[-6,14,0],chest:[-3,30,0],head:[2,-26,0],upperarmL:[-10,0,16],_hips:[0,-0.045,-0.04],legL:[6,0,2],legR:[12,0,-2],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.44,ease:'in',p:{spine:[-3,-6,0],chest:[-3,-12,0],head:[-2,8,0],upperarmL:[16,0,36],forearmL:[-8,0,0],_hips:[0,0.02,0.04],legR:[-14,0,-3],legL:[10,0,3],footL:[20,0,0],footR:[12,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.52,p:{spine:[-6,-14,0],chest:[-5,-34,0],head:[0,34,0],upperarmL:[20,0,46],forearmL:[-8,0,0],_hips:[0,0.03,0.05],legR:[-16,0,-3],legL:[12,0,3],footL:[22,0,0],footR:[14,0,0]}},
    {t:0.70,p:{spine:[-5,-12,0],chest:[-4,-30,0],head:[0,30,0],upperarmL:[18,0,42],forearmL:[-8,0,0],_hips:[0,0.015,0.05],legR:[-15,0,-3],legL:[11,0,3],footL:[16,0,0],footR:[8,0,0]}},
    {t:1.15,p:{}},
  ],fn:(t,T)=>tail(t,1.15,10)},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-14,0,0],head:[-12,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-20,0,30],upperarmR:[-15,0,20],earL:[18,0,0],earR:[18,0,0]}},
    {t:0.3,p:{hips:[28,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.08,0.02],legL:[-36,0,0],legR:[-30,0,0],upperarmL:[-40,0,10],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.55,ease:'in',p:{...PRONE,_hips:[0,-0.25,0.0]}},
    {t:0.66,p:{...PRONE,_hips:[0,-0.225,0.0],head:[-68,0,0]}},
    {t:0.8,p:PRONE},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:PRONE},{t:3.0,p:PRONE}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],earL:[0,0,-6*bump(t,1.6,0.08)],tail2:[0,8*S(t,T),0],tail3:[0,10*S(t,T,0.1),0],tail4:[0,10*S(t,T,0.2),0]})},
  revive:{T:1.1,keys:[
    {t:0,p:PRONE},
    {t:0.35,p:{hips:[48,0,0],spine:[6,0,0],head:[-40,0,0],_hips:[0,-0.17,0.0],legL:[-60,0,4],legR:[-50,0,-4],upperarmL:[-60,0,10],upperarmR:[-40,0,10],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.65,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.06,0],legL:[-20,0,0],legR:[-12,0,0],upperarmL:[-10,0,0]}},
    {t:0.85,ease:'out',p:{spine:[-5,0,0],head:[-6,0,0],_hips:[0,0.03,0],upperarmL:[-20,0,24],upperarmR:[-20,0,10],earL:[-14,0,0],earR:[-14,0,0]}},
    {t:1.1,p:{}},
  ]},
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-18,0,4],chest:[-8,0,0],head:[-14,0,-6],_hips:[0,-0.02,-0.05],upperarmL:[-25,0,34],forearmL:[-20,0,0],upperarmR:[-16,0,-22],legL:[14,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[-20,0,0],tail2:[-10,15,0]}},
    {t:0.2,p:{spine:[-10,0,2],head:[-6,0,-3],_hips:[0,-0.025,-0.04],upperarmL:[-10,0,18],upperarmR:[-8,0,-10],earL:[-10,0,0],earR:[-10,0,0]}},
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
    {t:1.25,ease:'out',p:{upperarmR:[-96,0,26],forearmR:[-34,0,0],handR:[-44,0,0],chest:[-4,6,0],spine:[-4,0,0],head:[-6,-4,0],_hips:[0,0.012,0],upperarmL:[8,0,10]}},
    {t:1.7,p:{upperarmR:[-96,0,26],forearmR:[-34,0,0],handR:[-44,0,0],chest:[-4,6,0],spine:[-4,0,0],head:[-6,-4,0],_hips:[0,0.012,0],upperarmL:[8,0,10]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const u=Math.min(1,Math.max(0,(t-0.25)/0.7)); const e=u*u*(3-2*u); return{handR:[360*e,0,0],...tail(t,1.0,10)};}},
};
for(const n of ['combo','castPoint','castSweep','castParry','castPlant'])CLIPS[n].mech=true;
// ---- derived clips
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={mech:true,T:0.54,keys:cut(K,0,0.26,0.28),fn:sway,staffPose:BLADE(0,0.02,0.34,0.26,0.16)};
 CLIPS.combo2={mech:true,T:0.44,keys:cut(K,0.26,0.40,0.30),fn:sway,staffPose:BLADE(0.26,-0.2,0.22,0.40,0.16)};
 CLIPS.combo3={mech:true,T:0.50,keys:cut(K,0.40,0.58,0.32),fn:sway,staffPose:BLADE(0.40,-0.2,0.26,0.58,0.16)};
 {const k4=cut(K,0.58,1.20,0.42); k4[k4.length-1].p={hips:[0,-360,0]}; CLIPS.combo4={mech:true,T:1.04,keys:k4,fn:sway,staffPose:BLADE(0.58,-0.2,0.86)};}
 CLIPS.downCrawl={T:1.2,loop:true,keys:[{t:0,p:PRONE},{t:1.2,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmL:[-5*pos(c),0,16*s], forearmL:[-10*pos(c),0,0], upperarmR:[0,0,-5*s], legL:[-14*s,0,0], legR:[14*s,0,0], footL:[10*s,0,0], footR:[-10*s,0,0],
   hips:[0,4*s,3*s], chest:[0,-4*s,0], head:[3*c,3*s,0], _hips:[0,0.008*Math.abs(c),0], tail2:[0,12*s,0], tail3:[0,14*S(t,T,0.12),0], tail4:[0,14*S(t,T,0.24),0], earL:[4*c,0,0], earR:[4*c,0,0]};}};
}

// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 // run: a low sprint, far forward over his toes, the blade trailing behind him, the free arm pumping, ears flat, the tail streaming out
 CLIPS.run={T:0.4,loop:true,staffPose:{from:-1,to:2,fade:0.01,keys:[{t:0,p:[-0.25,0.40,-0.04],d:[-0.22,-0.1,-0.97],n:[0.97,0,-0.22]},{t:0.1,p:[-0.25,0.385,-0.05],d:[-0.22,-0.16,-0.97],n:[0.97,0,-0.22]},{t:0.2,p:[-0.25,0.40,-0.04],d:[-0.22,-0.1,-0.97],n:[0.97,0,-0.22]},{t:0.3,p:[-0.25,0.385,-0.05],d:[-0.22,-0.16,-0.97],n:[0.97,0,-0.22]},{t:0.4,p:[-0.25,0.40,-0.04],d:[-0.22,-0.1,-0.97],n:[0.97,0,-0.22]}]},fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
   _hips:[0.006*s,0.024*c2-0.03,0], hips:[0,8*s,3.5*s], spine:[21+2*c2,-5*s,-3*s], chest:[4+1.5*b2,-9*s,0], head:[-22+2.5*b2,6*s,0],
   legL:[-54*s,0,0], legR:[54*s,0,0], footL:[36*pos(-S(t,T,0.15)),0,0], footR:[36*pos(S(t,T,0.15)),0,0],
   upperarmL:[44*s,0,2], forearmL:[-40+12*s,0,0], upperarmR:[30-6*s,0,10], forearmR:[20,0,0], handR:[-30+4*b2,0,0], tail1:[20,0,0], tail2:[6,0,0], earL:[-22+5*S(t,T/2,0.2),0,0], earR:[-22+5*S(t,T/2,0.2),0,0], ...tail(t,T,14),
 };}};
 CLIPS.runBack={T:0.4,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.35)};
 CLIPS.runLeft={T:0.4,loop:true,fn:sc(CLIPS.walkLeft.fn,0.62,1.35)};
 CLIPS.runRight={T:0.4,loop:true,fn:sc(CLIPS.walkRight.fn,0.62,1.35)};
}

// ---- blade storm: a spinning hop with the blade held out level (three full turns); whole body
{const out={upperarmR:[-10,0,-78],forearmR:[30,0,0],handR:[90,-40,0],upperarmL:[0,0,62],forearmL:[10,0,0],spine:[2,0,0],head:[0,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[10,-30,0],tail2:[0,-24,0],tail3:[0,-18,0]};
 CLIPS.bladeStorm={T:0.9,keys:[
  {t:0,p:{}},
  {t:0.12,p:{hips:[0,-45,0],spine:[8,-10,0],head:[0,30,0],_hips:[0,-0.055,0],upperarmR:[-20,0,-50],forearmR:[20,0,0],handR:[20,-40,0],upperarmL:[10,0,20],legL:[0,0,6],legR:[0,0,-6]}},
  {t:0.22,ease:'in',p:{...out,hips:[0,60,0],_hips:[0,0.06,0],legL:[-14,0,10],legR:[8,0,-10]}},
  {t:0.39,ease:'lin',p:{...out,hips:[0,560,0],_hips:[0,0.11,0],legL:[-18,0,12],legR:[10,0,-12],footL:[20,0,0],footR:[20,0,0]}},
  {t:0.56,ease:'lin',p:{...out,hips:[0,1060,0],_hips:[0,0.04,0],legL:[-10,0,8],legR:[6,0,-8]}},
  {t:0.66,ease:'out',p:{hips:[0,1080,0],spine:[10,10,0],chest:[0,16,0],head:[-6,-20,0],_hips:[0,-0.06,0.01],upperarmR:[-50,0,30],forearmR:[20,0,0],handR:[40,0,0],upperarmL:[10,0,30],legL:[-12,0,6],legR:[8,0,-6]}},
  {t:0.9,p:{hips:[0,1080,0]}},
 ],fn:CLIPS.combo.fn};
}
