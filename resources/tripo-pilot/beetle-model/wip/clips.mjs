// The beetle Bellwright. Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is her left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward. For the free LEFT arm +z swings it out from her side; for the mallet (RIGHT) arm -z swings it out. Torso: rx+ leans forward, ry+ turns to her left.
// The cape is two wing cases hinged at her shoulders: rx+ lifts the hem out behind her, capeL rz+ and capeR rz- open them sideways. The bell hangs from the hook: rz swings it side to side, rx front to back.
export const CFG={name:'beetle',weaponFile:'mallet.glb',hand:'handR',scale:0.36,grip:[0,0.22,0],palm:[-0.02,-0.012,0.008],tilt:[42,0,8],tiltOrder:'XYZ',
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[-0.1,0.1,0.04,1.0,-0.1,0.1],pushMode:'away',sole:[[0,-0.055,-0.05],[0,-0.055,0.08]],
  // follow-through: she is a round, heavy little bell-ringer. The trunk leads, the big head trails a little, and everything that hangs from her rings on after she stops: the bell most, the antennae, the wing cases least
  carry:0.5,lag:{chest:0.012,head:0.035,upperarmL:0.03,forearmL:0.045,handL:0.06,forearmR:0.02,handR:0.03},
  springs:[{bone:'bell',k:105,z:0.07,max:42,tip:[0,-0.165,0]},{bone:'antL',k:300,z:0.22,max:24,tip:[0.105,0.08,0.05]},{bone:'antR',k:300,z:0.22,max:24,tip:[-0.12,0.08,0.045]},
    {bone:'capeL',k:170,z:0.5,max:8,tip:[0.08,-0.29,-0.08]},{bone:'capeR',k:170,z:0.5,max:8,tip:[-0.08,-0.29,-0.08]}]};
export const BASE={
  spine:[2,0,0], head:[-2,0,0],
  upperarmR:[0,0,6], forearmR:[-12,0,0],
  upperarmL:[4,0,-10], forearmL:[-8,0,0],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2;
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const cape=(up,open=0)=>({capeL:[up,0,open],capeR:[up,0,-open]});
const ring=(a,b=0)=>({bell:[b,0,a]});
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.012*dir*s,0.01*c2-0.01,0], hips:[0,0,-5*dir*s], spine:[2,0,4*dir*s], chest:[0,0,3*dir*s], head:[1.5*c2,0,-4*dir*s],
    upperarmL:[0,0,5*s], upperarmR:[2*c2,0,0], ...cape(2+2*c2,2)};
  o['leg'+lead]=[-8*pos(c),0,dir*(3+16*pos(s,0.3))]; o['leg'+trail]=[-8*pos(-c),0,-dir*(3+12*pos(-s,0.3))];
  o['foot'+lead]=[6*pos(c),0,0]; o['foot'+trail]=[6*pos(-c),0,0]; return o;};
// the dashes: her wing cases snap open and she buzzes a short way just off the floor, feet tucked
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-14*d],chest:[0,0,-5*d],head:[-4,0,12*d],_hips:[0.07*d*k,0.05,0],upperarmL:[0,0,d>0?30:10],upperarmR:[-6,0,d>0?-10:-28],...cape(34,30)};
    p['leg'+L]=[-14,0,16*d];p['leg'+R]=[8,0,-18*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.035,0],...cape(6,4)};crouch['leg'+L]=[0,0,-2*d];crouch['leg'+R]=[0,0,4*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.03,0],head:[2,0,4*d],...cape(8,6)};land['leg'+L]=[0,0,10*d];land['leg'+R]=[0,0,-5*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
// downed: she sits down hard on the floor, legs out in front, head hung, the wing cases pooled behind her
const SIT={_hips:[0,-0.095,-0.02],legL:[-76,0,12],legR:[-76,0,-12],footL:[8,0,0],footR:[8,0,0],spine:[12,0,0],chest:[8,0,0],head:[20,0,5],
  upperarmL:[8,0,-6],forearmL:[-10,0,0],upperarmR:[8,0,4],forearmR:[-6,0,0],...cape(16,8),antL:[0,0,-14],antR:[0,0,14]};

// ---- the Bellwright's style: a bell-ringer. Every blow is a strike on a bell that is not there yet: a clean wind, one stroke, and the mallet bounces off and is left to ring.
// She is round and short in the arm (the mallet paw reaches about 16 cm from her shoulder), so the blow comes from her whole body rocking, and her own bell answers every hard stroke.
const HOLD={p:[-0.30,0.33,0.07],d:[-0.1,0.74,0.66],n:[0,-0.66,0.74]};              // carried easy, head of the mallet up and forward
const RAISE={p:[-0.30,0.46,0.0],d:[-0.24,0.84,-0.48],n:[0,0.48,0.84]};             // wound back over her right shoulder
const HIGH={p:[-0.31,0.50,0.02],d:[-0.26,0.95,-0.12],n:[0,0.12,0.95]};            // straight up beside her cap
const STRIKE=(k=0)=>({p:[-0.25,0.38-0.01*k,0.16+0.02*k],d:[0.12,0.12-0.16*k,0.98],n:[0,1,0]}); // the stroke: head of the mallet straight ahead, chest high
const LEFTW={p:[-0.14,0.39,0.22],d:[0.76,0.2,0.6],n:[0,1,0]};                    // carried across to her left, wound for the backhand
const RIGHTF={p:[-0.31,0.38,0.12],d:[-0.56,0.14,0.82],n:[0,1,0]};                  // the backhand finished, out to her right front
const SMASH={p:[-0.26,0.24,0.22],d:[0.05,-0.72,0.69],n:[0,0.69,0.72]};             // driven down at the floor in front of her

export const CLIPS={
  // idle: patient and a little proud. She breathes in her round belly, rocks from boot to boot, glances up at her bell, and her antennae feel the air one at a time
  idle:{T:3.6,loop:true,fn:(t,T)=>{const b=S(t,T/2), b2=S(t,T/2,0.12), w=S(t,T,0.1), look=bump(t,2.5,0.35);return{
    _hips:[0.008*w,0.005*b-0.006,0], hips:[0,0,2*w], spine:[1.5*b,1.5*w,-1.4*w], chest:[1.6*b2,0,-0.8*w], head:[-1-5*look+1.2*S(t,T/2,0.2),5*S(t,T,0.3)+10*look,-4*look],
    legL:[0,0,-2*w], legR:[0,0,-2*w], upperarmL:[-2-3*b2,0,2+2*b2], forearmL:[-6-4*b2,0,0], upperarmR:[1.5*b,0,-1-1*b], forearmR:[-3*b2,0,0],
    antL:[6*bump(t,0.8,0.18),0,-8*bump(t,0.8,0.18)+2*w], antR:[6*bump(t,1.6,0.18),0,8*bump(t,1.6,0.18)+2*w], ...cape(1+1*b2,1), bell:[0,0,5*S(t,T/3,0.2)],
  };}},
  // walk: a round waddle. The whole body rolls over each short step, the bell swings out of time with it, the wing cases swish
  walk:{T:0.64,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.012*s,0.01*c2-0.01,0], hips:[0,5*s,5*s], spine:[4,-3*s,-3.5*s], chest:[1.2*b2,-4*s,-1.5*s], head:[-3+2*b2,2*s,2.5*s],
    legL:[-30*s,0,0], legR:[30*s,0,0], footL:[16*pos(-S(t,T,0.15)),0,0], footR:[16*pos(S(t,T,0.15)),0,0],
    upperarmL:[20*s,0,3], forearmL:[-8+8*s,0,0], upperarmR:[-6*s,0,0], forearmR:[-4+2*b2,0,0], capeL:[3+2*c2,0,3*s], capeR:[3+2*c2,0,3*s], pole:[0,0,1.2*s],
  };}},
  walkBack:{T:0.72,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0.008*s,0.008*c2-0.01,0], hips:[0,-4*s,3*s], spine:[-2,2*s,-2*s], chest:[0,3*s,0], head:[4+1.5*c2,-3*s,0],
    legL:[-22*s+3,0,0], legR:[22*s+3,0,0], footL:[-8*pos(-s),0,0], footR:[-8*pos(s),0,0],
    upperarmL:[12*s,0,4], forearmL:[-6,0,0], upperarmR:[-4*s,0,0], ...cape(-1+1*c2,1),
  };}},
  walkLeft:{T:0.64,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.64,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // The mallet combo: three strokes of a peal, each one bigger. 1 (0.22 s) a tap: the mallet comes off her shoulder and strikes straight ahead, and bounces.
  // 2 (0.56 s) the backhand: the bounce carries the mallet across to her left, and she strikes back across her front from left to right.
  // 3 (1.02 s) the toll: she rises on her toes with the mallet straight up and her wing cases lifting, holds a beat, then brings it down in front of her with her whole weight, and her own bell swings out and rings.
  combo:{T:1.6,staffPose:{from:0.02,to:1.44,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.12,...RAISE},{t:0.22,...STRIKE(1),ease:'in'},{t:0.28,...STRIKE(-0.6)},{t:0.36,p:[-0.2,0.40,0.2],d:[0.5,0.5,0.7],n:[0,1,0]},{t:0.44,...LEFTW},{t:0.5,...STRIKE(0),ease:'in'},{t:0.56,...RIGHTF},{t:0.66,p:[-0.31,0.39,0.11],d:[-0.5,0.3,0.8],n:[0,1,0]},{t:0.76,...RAISE},{t:0.86,...HIGH},{t:0.95,...HIGH},{t:1.02,...SMASH,ease:'in'},{t:1.09,p:[-0.26,0.27,0.21],d:[0.05,-0.55,0.83],n:[0,0.83,0.55]},{t:1.22,...SMASH},{t:1.44,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.12,p:{spine:[-7,-10,0],chest:[-4,-12,0],head:[3,14,0],_hips:[0,0.006,-0.015],legR:[8,0,0],upperarmL:[10,0,12],forearmL:[-20,0,0],...cape(5,3)}},
    {t:0.22,ease:'in',p:{spine:[13,9,0],chest:[7,12,0],head:[-9,-12,0],_hips:[0,-0.022,0.035],legL:[-14,0,0],legR:[10,0,0],upperarmL:[22,0,10],forearmL:[-6,0,0],...cape(-2,0)}},
    {t:0.28,p:{spine:[10,7,0],chest:[5,9,0],head:[-7,-9,0],_hips:[0,-0.018,0.03],legL:[-12,0,0],legR:[9,0,0],upperarmL:[18,0,10]}},
    {t:0.44,p:{spine:[3,18,0],chest:[1,22,0],head:[0,-24,0],_hips:[0.008,-0.01,0.005],legL:[-4,0,0],legR:[6,0,0],upperarmL:[-20,0,22],forearmL:[-26,0,0],capeL:[4,0,6],capeR:[4,0,4]}},
    {t:0.56,ease:'in',p:{spine:[8,-16,0],chest:[4,-20,0],head:[-5,22,0],_hips:[-0.01,-0.025,0.03],legL:[8,0,0],legR:[-12,0,-4],upperarmL:[16,0,26],forearmL:[-10,0,0],capeL:[4,0,-4],capeR:[4,0,-8]}},
    {t:0.66,p:{spine:[6,-13,0],chest:[3,-16,0],head:[-4,18,0],_hips:[-0.008,-0.02,0.025],legL:[6,0,0],legR:[-10,0,-4],upperarmL:[14,0,22]}},
    // 3: up on her toes, mallet high, wing cases lifting, chest open
    {t:0.86,p:{spine:[-10,0,0],chest:[-7,0,0],head:[-8,0,0],_hips:[0,0.03,-0.012],footL:[24,0,0],footR:[24,0,0],upperarmL:[-16,0,40],forearmL:[-30,0,0],...cape(16,14),...ring(-10)}},
    {t:0.95,p:{spine:[-12,0,0],chest:[-8,0,0],head:[-10,0,0],_hips:[0,0.036,-0.015],footL:[26,0,0],footR:[26,0,0],upperarmL:[-18,0,44],forearmL:[-32,0,0],...cape(20,18),...ring(-14)}},
    {t:1.02,ease:'in',p:{spine:[22,0,0],chest:[12,0,0],head:[-14,0,0],_hips:[0,-0.055,0.03],legL:[-16,0,6],legR:[-16,0,-6],upperarmL:[26,0,28],forearmL:[-10,0,0],...cape(-3,2),...ring(30,24)}},
    {t:1.09,p:{spine:[17,0,0],chest:[9,0,0],head:[-10,0,0],_hips:[0,-0.04,0.025],legL:[-13,0,5],legR:[-13,0,-5],upperarmL:[20,0,24],...cape(6,6),...ring(-22,-10)}},
    {t:1.22,p:{spine:[14,0,0],chest:[8,0,0],head:[-8,0,0],_hips:[0,-0.035,0.02],legL:[-11,0,4],legR:[-11,0,-4],upperarmL:[16,0,20],...ring(14,6)}},
    {t:1.6,p:{}},
  ]},
  // dash: the wing cases snap open and she buzzes forward just off the floor, head down, boots tucked
  dash:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[-6,0,0],_hips:[0,-0.035,-0.02],legL:[10,0,0],legR:[10,0,0],...cape(8,6)}},
    {t:0.2,ease:'out',p:{hips:[14,0,0],spine:[20,0,0],chest:[8,0,0],head:[-26,0,0],_hips:[0,0.05,0.06],legL:[30,0,0],legR:[38,0,0],footL:[26,0,0],footR:[26,0,0],upperarmL:[30,0,14],upperarmR:[30,0,-14],...cape(42,34)}},
    {t:0.4,p:{hips:[12,0,0],spine:[18,0,0],chest:[7,0,0],head:[-22,0,0],_hips:[0,0.04,0.08],legL:[34,0,0],legR:[28,0,0],footL:[24,0,0],footR:[24,0,0],upperarmL:[26,0,14],upperarmR:[26,0,-14],...cape(38,30)}},
    {t:0.52,ease:'in',p:{spine:[10,0,0],_hips:[0,-0.035,0.03],legL:[-10,0,0],legR:[6,0,0],head:[4,0,0],...cape(6,6)}},
    {t:0.66,p:{}},
  ]},
  dashBack:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[8,0,0],_hips:[0,-0.035,0.02],legL:[-8,0,0],legR:[-8,0,0],...cape(6,4)}},
    {t:0.2,ease:'out',p:{spine:[-12,0,0],chest:[-5,0,0],head:[12,0,0],_hips:[0,0.05,-0.06],legL:[-28,0,0],legR:[-16,0,0],footL:[-14,0,0],upperarmL:[-30,0,24],upperarmR:[-20,0,-16],...cape(30,32)}},
    {t:0.4,p:{spine:[-10,0,0],chest:[-4,0,0],head:[10,0,0],_hips:[0,0.04,-0.08],legL:[-18,0,0],legR:[-28,0,0],footR:[-14,0,0],upperarmL:[-26,0,22],upperarmR:[-18,0,-16],...cape(26,28)}},
    {t:0.52,ease:'in',p:{spine:[4,0,0],_hips:[0,-0.035,-0.03],legL:[8,0,0],legR:[5,0,0],head:[-3,0,0],...cape(4,6)}},
    {t:0.66,p:{}},
  ]},
  dashLeft:{T:0.66,keys:sideDash(1)},
  dashRight:{T:0.66,keys:sideDash(-1)},
  // clapper (clapper, knell, tuning fork): one long clean stroke. The mallet goes back over her shoulder as she leans away, then she steps in and strikes straight ahead at full reach, and lets it bounce
  castPoint:{T:1.1,staffPose:{from:0.02,to:0.96,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.2,...RAISE},{t:0.28,p:[-0.30,0.47,-0.01],d:[-0.26,0.8,-0.54],n:[0,0.54,0.8]},{t:0.36,...STRIKE(1.6),ease:'in'},{t:0.43,...STRIKE(-0.8)},{t:0.56,...STRIKE(0.6)},{t:0.76,...STRIKE(0)},{t:0.96,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-9,-14,0],chest:[-5,-16,0],head:[4,22,0],_hips:[0,-0.01,-0.03],legL:[-8,0,0],legR:[10,0,0],upperarmL:[-30,0,16],forearmL:[-20,0,0],...cape(6,4)}},
    {t:0.28,p:{spine:[-11,-16,0],chest:[-6,-18,0],head:[5,26,0],_hips:[0,-0.014,-0.035],legL:[-8,0,0],legR:[10,0,0],upperarmL:[-34,0,16],forearmL:[-20,0,0],...cape(8,5)}},
    {t:0.36,ease:'in',p:{spine:[18,10,0],chest:[9,13,0],head:[-15,-16,0],_hips:[0,-0.03,0.055],legL:[-20,0,0],legR:[14,0,0],footR:[12,0,0],upperarmL:[24,0,22],forearmL:[-6,0,0],...cape(-3,0),...ring(0,22)}},
    {t:0.43,p:{spine:[14,8,0],chest:[7,10,0],head:[-11,-12,0],_hips:[0,-0.026,0.048],legL:[-18,0,0],legR:[12,0,0],upperarmL:[20,0,20],...ring(0,-14)}},
    {t:0.6,p:{spine:[15,8,0],chest:[7,10,0],head:[-12,-12,0],_hips:[0,-0.028,0.045],legL:[-17,0,0],legR:[11,0,0],upperarmL:[18,0,20],...ring(0,8)}},
    {t:1.1,p:{}},
  ]},
  // peal (peal, hum, vesper chime, carillon): she lifts the mallet high like a conductor, then rocks her whole round body from side to side so the bell on her back swings wide and rings, twice
  castBloom:{T:1.5,staffPose:{from:0.02,to:1.3,fade:0.12,keys:[{t:0.02,...HOLD},{t:0.26,...HIGH},{t:0.5,p:[-0.30,0.50,0.03],d:[-0.36,0.92,-0.06],n:[0,0.06,0.95]},{t:0.74,p:[-0.31,0.50,0.02],d:[-0.12,0.98,-0.1],n:[0,0.1,0.98]},{t:0.98,...HIGH},{t:1.3,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.14,p:{spine:[5,0,0],_hips:[0,-0.025,0],upperarmL:[0,0,8]}},
    {t:0.3,p:{spine:[-6,0,8],chest:[-4,0,5],head:[-10,0,-8],_hips:[-0.02,0.02,-0.008],legL:[0,0,-6],legR:[0,0,-6],footL:[14,0,0],footR:[14,0,0],upperarmL:[-20,0,56],forearmL:[-34,0,0],...cape(8,10),...ring(-26)}},
    {t:0.5,ease:'in',p:{spine:[-6,0,-12],chest:[-4,0,-7],head:[-10,0,12],_hips:[0.028,0.012,-0.008],legL:[0,0,8],legR:[0,0,8],upperarmL:[-22,0,62],forearmL:[-36,0,0],...cape(10,12),...ring(40)}},
    {t:0.74,ease:'in',p:{spine:[-6,0,12],chest:[-4,0,7],head:[-10,0,-12],_hips:[-0.028,0.012,-0.008],legL:[0,0,-8],legR:[0,0,-8],upperarmL:[-22,0,62],forearmL:[-36,0,0],...cape(10,12),...ring(-40)}},
    {t:0.98,ease:'in',p:{spine:[-6,0,-8],chest:[-4,0,-5],head:[-10,0,8],_hips:[0.02,0.014,-0.008],legL:[0,0,6],legR:[0,0,6],upperarmL:[-20,0,56],forearmL:[-34,0,0],...cape(8,10),...ring(30)}},
    {t:1.16,p:{spine:[-2,0,2],head:[-4,0,-2],_hips:[-0.004,0.004,0],upperarmL:[-8,0,24],forearmL:[-14,0,0],...cape(3,4),...ring(-14)}},
    {t:1.5,p:{}},
  ]},
  // hang a bell (hang bell, great bell): she sets it down with her free paw, low and ahead, the mallet held back out of the way, then gives it one soft tap to wake it
  castPlant:{T:1.2,staffPose:{from:0.02,to:1.04,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.2,...RAISE},{t:0.42,...RAISE},{t:0.56,p:[-0.27,0.30,0.2],d:[0.2,-0.3,0.93],n:[0,0.93,0.3],ease:'in'},{t:0.62,p:[-0.27,0.32,0.19],d:[0.2,-0.05,0.98],n:[0,1,0]},{t:0.8,p:[-0.28,0.33,0.16],d:[0.1,0.2,0.97],n:[0,1,0]},{t:1.04,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-6,-8,0],chest:[-4,-8,0],head:[-4,8,0],_hips:[0,0.015,-0.01],upperarmL:[-50,0,20],forearmL:[-30,0,0],...cape(6,4)}},
    {t:0.4,ease:'in',p:{spine:[22,-10,0],chest:[12,-10,0],head:[-10,12,0],_hips:[0,-0.06,0.03],legL:[-16,0,6],legR:[-14,0,-6],upperarmL:[-74,0,6],forearmL:[-8,0,0],handL:[-20,0,0],...cape(-2,4)}},
    {t:0.48,p:{spine:[20,-8,0],chest:[11,-8,0],head:[-9,10,0],_hips:[0,-0.055,0.03],legL:[-15,0,6],legR:[-13,0,-6],upperarmL:[-66,0,10],forearmL:[-10,0,0]}},
    {t:0.56,ease:'in',p:{spine:[22,6,0],chest:[12,8,0],head:[-12,-8,0],_hips:[0,-0.06,0.035],legL:[-16,0,6],legR:[-14,0,-6],upperarmL:[-10,0,26],forearmL:[-20,0,0],...ring(18,10)}},
    {t:0.8,p:{spine:[16,4,0],chest:[9,5,0],head:[-9,-5,0],_hips:[0,-0.045,0.025],legL:[-12,0,5],legR:[-11,0,-5],upperarmL:[0,0,22],...ring(-10)}},
    {t:1.2,p:{}},
  ]},
  // bell swing (bell swing, knell): she winds the mallet far out to her right, her body coiled after it, then swings it across her front in one wide level stroke, right to left, and is carried round by it
  castSweep:{T:1.2,staffPose:{from:0.02,to:1.04,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.24,p:[-0.32,0.40,0.02],d:[-0.8,0.3,-0.2],n:[0,1,0]},{t:0.34,p:[-0.32,0.40,0.01],d:[-0.78,0.3,-0.3],n:[0,1,0]},{t:0.39,...RIGHTF,ease:'in'},{t:0.42,...STRIKE(0)},{t:0.46,p:[-0.15,0.37,0.23],d:[0.7,-0.05,0.7],n:[0,1,0]},{t:0.66,p:[-0.15,0.37,0.23],d:[0.76,0.0,0.64],n:[0,1,0]},{t:0.86,...STRIKE(-0.5)},{t:1.04,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.24,p:{spine:[2,-16,0],chest:[0,-20,0],head:[0,28,0],_hips:[-0.01,-0.015,-0.015],legL:[-6,0,0],legR:[8,0,0],upperarmL:[10,0,24],forearmL:[-30,0,0],capeL:[5,0,-6],capeR:[5,0,-10]}},
    {t:0.34,p:{spine:[0,-19,0],chest:[-2,-23,0],head:[0,34,0],_hips:[-0.012,-0.02,-0.02],legL:[-6,0,0],legR:[8,0,0],upperarmL:[12,0,26],forearmL:[-32,0,0],capeL:[6,0,-8],capeR:[6,0,-12],...ring(14)}},
    {t:0.46,ease:'in',p:{spine:[9,18,0],chest:[4,22,0],head:[-7,-24,0],_hips:[0.014,-0.035,0.03],legL:[-14,0,5],legR:[10,0,0],upperarmL:[-30,0,44],forearmL:[-8,0,0],capeL:[8,0,14],capeR:[8,0,8],...ring(-34)}},
    {t:0.56,p:{spine:[8,16,0],chest:[4,19,0],head:[-6,-20,0],_hips:[0.012,-0.03,0.028],legL:[-12,0,5],legR:[9,0,0],upperarmL:[-26,0,40],capeL:[5,0,8],capeR:[5,0,4],...ring(22)}},
    {t:0.7,p:{spine:[7,14,0],chest:[3,17,0],head:[-5,-18,0],_hips:[0.01,-0.028,0.025],legL:[-11,0,5],legR:[8,0,0],upperarmL:[-22,0,36],...ring(-12)}},
    {t:1.2,p:{}},
  ]},
  // wing hop (the weapon move): she crouches, the wing cases snap wide open, and she springs up and forward in one buzzing hop and lands with a bounce
  hop:{T:0.9,keys:[
    {t:0,p:{}},
    {t:0.12,p:{spine:[10,0,0],head:[-6,0,0],_hips:[0,-0.05,-0.01],legL:[-10,0,5],legR:[-10,0,-5],upperarmL:[10,0,10],upperarmR:[10,0,-8],...cape(4,6)}},
    {t:0.24,ease:'out',p:{spine:[-6,0,0],chest:[-4,0,0],head:[-6,0,0],_hips:[0,0.09,0.03],legL:[20,0,6],legR:[26,0,-6],footL:[30,0,0],footR:[30,0,0],upperarmL:[-10,0,50],forearmL:[-20,0,0],upperarmR:[-10,0,-30],...cape(50,46),antL:[-10,0,0],antR:[-10,0,0]}},
    {t:0.42,p:{spine:[4,0,0],head:[-10,0,0],_hips:[0,0.13,0.07],legL:[-26,0,8],legR:[-18,0,-8],footL:[10,0,0],footR:[10,0,0],upperarmL:[-6,0,56],forearmL:[-16,0,0],upperarmR:[-6,0,-34],...cape(44,52)}},
    {t:0.56,p:{spine:[10,0,0],head:[-12,0,0],_hips:[0,0.06,0.07],legL:[-30,0,6],legR:[-24,0,-6],upperarmL:[0,0,40],upperarmR:[0,0,-26],...cape(36,40)}},
    {t:0.66,ease:'in',p:{spine:[14,0,0],head:[-6,0,0],_hips:[0,-0.05,0.04],legL:[-12,0,6],legR:[-12,0,-6],upperarmL:[14,0,16],upperarmR:[12,0,-10],...cape(-2,8),...ring(20,20)}},
    {t:0.76,p:{spine:[4,0,0],_hips:[0,0.008,0.02],...cape(8,6),...ring(-12,-8)}},
    {t:0.9,p:{}},
  ]},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-12,0,0],head:[-10,0,0],_hips:[0,0.0,-0.03],upperarmL:[-20,0,36],upperarmR:[-15,0,-26],...cape(14,10)}},
    {t:0.3,p:{spine:[-6,0,0],head:[4,0,0],_hips:[0,-0.04,-0.03],legL:[-36,0,6],legR:[-30,0,-6],upperarmL:[-30,0,20],...cape(20,12)}},
    {t:0.5,ease:'in',p:{...SIT,_hips:[0,-0.105,-0.02],spine:[18,0,0],head:[26,0,5],...ring(0,24)}},
    {t:0.62,p:{...SIT,_hips:[0,-0.088,-0.02],spine:[9,0,0],head:[14,0,5],...ring(0,-14)}},
    {t:0.8,p:SIT},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:SIT},{t:3.0,p:SIT}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,2*S(t,T*2)],antL:[0,0,4*S(t,T,0.2)],antR:[0,0,-4*S(t,T,0.3)],bell:[0,0,3*S(t,T/2)]})},
  revive:{T:1.1,keys:[
    {t:0,p:SIT},
    {t:0.35,p:{spine:[24,0,0],head:[-4,0,0],_hips:[0,-0.07,0.01],legL:[-50,0,8],legR:[-40,0,-8],upperarmL:[-30,0,10],upperarmR:[-20,0,-4],...cape(10,8)}},
    {t:0.65,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.035,0.01],legL:[-18,0,0],legR:[-10,0,0],upperarmL:[-10,0,0],...cape(4,4)}},
    {t:0.85,ease:'out',p:{spine:[-5,0,0],head:[-6,0,0],_hips:[0,0.02,0],upperarmL:[-20,0,26],upperarmR:[-10,0,-12],...cape(12,10),...ring(16)}},
    {t:1.1,p:{}},
  ]},
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-14,0,-4],chest:[-7,0,0],head:[-10,0,6],_hips:[0,-0.015,-0.04],upperarmL:[-22,0,34],forearmL:[-20,0,0],upperarmR:[-12,0,-22],legR:[12,0,0],...cape(14,10),...ring(0,-26),antL:[-16,0,0],antR:[-16,0,0]}},
    {t:0.2,p:{spine:[-8,0,-2],head:[-4,0,3],_hips:[0,-0.018,-0.03],upperarmL:[-10,0,18],upperarmR:[-6,0,-10],...cape(5,4),...ring(0,14)}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.006,-0.01]}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{upperarmL:[0,0,100],forearmL:[10,0,-16],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:1.5,p:{upperarmL:[0,0,100],forearmL:[10,0,-16],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{forearmL:[0,0,24*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,14*e*Math.sin(2*Math.PI*t/0.36-0.6)],antL:[0,0,-8*e*Math.sin(2*Math.PI*t/0.36)],antR:[0,0,8*e*Math.sin(2*Math.PI*t/0.36)]};}},
};
// her trunk is one round barrel, so a big turn of the spine reads as the whole beetle turning away: the cross strokes turn it less
for(const n of ['combo','castSweep'])for(const k of CLIPS[n].keys)for(const j of ['spine','chest','head'])if(k.p[j])k.p[j]=[k.p[j][0],k.p[j][1]*0.65,k.p[j][2]];
for(const n of ['combo','castPoint','castSweep','castPlant'])CLIPS[n].mech=true;
// ---- derived clips: each single hit of the tap chain keeps only its own blow
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
const cutS=(o,t0,t1,to)=>{const K=CLIPS.combo.staffPose.keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-o).toFixed(3)})); K.push({t:to,...HOLD}); return {from:o>0?-0.2:0.02,to,fade:0.12,keys:K};};
{const K=CLIPS.combo.keys;
 CLIPS.combo1={mech:true,T:0.7,keys:cut(K,0,0.28,0.42),staffPose:cutS(0,0,0.28,0.56)};
 CLIPS.combo2={mech:true,T:0.75,keys:cut(K,0.28,0.66,0.37),staffPose:cutS(0.28,0.28,0.66,0.62)};
 CLIPS.combo3={mech:true,T:1.0,keys:cut(K,0.66,1.22,0.44),staffPose:cutS(0.66,0.66,1.22,0.8)};
 CLIPS.downCrawl={T:1.3,loop:true,keys:[{t:0,p:SIT},{t:1.3,p:SIT}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   hips:[0,6*s,5*s],spine:[3*c,-4*s,-3*s],head:[3*c,0,2*s],upperarmL:[-10*pos(c),0,6*pos(c)],upperarmR:[-8*pos(-c),0,-6*pos(-c)],legL:[10*pos(-c),0,0],legR:[10*pos(c),0,0],bell:[0,0,10*s]};}};
}
// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 // run: a hurrying trot, head down and belly forward, the wing cases lifted off her back and the bell jangling behind
 CLIPS.run={T:0.42,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
   _hips:[0.01*s,0.018*c2-0.018,0.015], hips:[4,6*s,5*s], spine:[13+2*c2,-4*s,-4*s], chest:[3+1.5*b2,-5*s,0], head:[-16+2.5*b2,3*s,2*s],
   legL:[-44*s-4,0,0], legR:[44*s-4,0,0], footL:[26*pos(-S(t,T,0.15)),0,0], footR:[26*pos(S(t,T,0.15)),0,0],
   upperarmL:[30*s,0,8], forearmL:[-26+10*s,0,0], upperarmR:[-10*s+6,0,-4], forearmR:[-10,0,0], capeL:[14+4*c2,0,10+4*s], capeR:[14+4*c2,0,-10+4*s], pole:[2,0,2*s], antL:[-8,0,0], antR:[-8,0,0],
 };}};
 CLIPS.runBack={T:0.42,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.3)};
 CLIPS.runLeft={T:0.42,loop:true,fn:sc(CLIPS.walkLeft.fn,0.64,1.3)};
 CLIPS.runRight={T:0.42,loop:true,fn:sc(CLIPS.walkRight.fn,0.64,1.3)};
}
