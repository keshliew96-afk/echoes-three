// The otter Tidecaller. Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is her left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward. For the free LEFT arm +z swings it out from her side; for the staff (RIGHT) arm -z swings it out. Torso: rx+ leans forward, ry+ turns to her left.
// The tail points back along the floor: rx+ lifts it, ry swings it side to side.
export const CFG={name:'otter',weaponFile:'staff.glb',hand:'handR',scale:0.9,grip:[0,0.40,0],palm:[-0.02,-0.03,0.02],tilt:[0,0,-4],tiltOrder:'XYZ',
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[-0.05,0.05,0.0,1.0,-0.05,0.05],pushMode:'away',sole:[[0,-0.055,-0.02],[0,-0.045,0.15]],
  // follow-through: heavy and flowing, like water. The trunk leads, the head and the free arm trail, the staff trails a little, and the thick tail trails most
  carry:0.55,lag:{chest:0.015,head:0.04,upperarmL:0.03,forearmL:0.045,handL:0.06,forearmR:0.02,handR:0.03},
  springs:[{bone:'tail1',k:260,z:0.5,max:12},{bone:'tail2',k:200,z:0.42,max:18},{bone:'tail3',k:160,z:0.38,max:24},{bone:'tail4',k:130,z:0.34,max:30,tip:[0.03,-0.01,-0.07]}]};
export const BASE={
  spine:[2,0,0], head:[-2,0,0],
  upperarmR:[0,0,10], forearmR:[-10,0,0],
  upperarmL:[6,0,-28], forearmL:[-4,0,-6],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2;
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
// the tail: a slow wave that runs down it, growing toward the tip
const tail=(t,T,a,lag=0.12)=>{const o={};for(let i=1;i<=4;i++)o['tail'+i]=[0,a*S(t,T,lag*i)*(0.45+0.2*i),0];return o;};
const tailUp=(a)=>({tail1:[a*0.5,0,0],tail2:[a*0.3,0,0],tail3:[a*0.2,0,0],tail4:[a*0.15,0,0]});
const mix=(a,b)=>{const o={...a};for(const k in b)o[k]=b[k];return o;};
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.012*dir*s,0.01*c2-0.012,0], hips:[0,0,-5*dir*s], spine:[2,0,4*dir*s], chest:[0,0,3*dir*s], head:[1.5*c2,0,-4*dir*s],
    upperarmL:[0,0,5*s], upperarmR:[2*c2,0,0], ...tail(t,T,10)};
  o['leg'+lead]=[-10*pos(c),0,dir*(3+16*pos(s,0.3))]; o['leg'+trail]=[-10*pos(-c),0,-dir*(3+12*pos(-s,0.3))];
  o['foot'+lead]=[6*pos(c),0,0]; o['foot'+trail]=[6*pos(-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-16*d],chest:[0,0,-6*d],head:[-4,0,12*d],_hips:[0.07*d*k,0.045,0],tail1:[6,-20*d,0],tail2:[4,-18*d,0],tail3:[0,-14*d,0],upperarmL:[0,0,d>0?24:8],upperarmR:[-6,0,d>0?-8:-22]};
    p['leg'+L]=[-12,0,20*d];p['leg'+R]=[6,0,-22*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.04,0]};crouch['leg'+L]=[0,0,-2*d];crouch['leg'+R]=[0,0,4*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.035,0],head:[2,0,4*d]};land['leg'+L]=[0,0,10*d];land['leg'+R]=[0,0,-5*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
// lying on her belly, chin on the floor, tail flat behind
const PRONE={hips:[82,0,0],spine:[2,0,0],chest:[2,0,0],head:[-62,0,0],_hips:[0,-0.085,0.0],legL:[10,0,8],legR:[8,0,-8],footL:[40,0,0],footR:[40,0,0],
  upperarmR:[-120,0,-30],forearmR:[-10,0,0],upperarmL:[-120,0,30],forearmL:[-10,0,0],tail1:[-62,6,0],tail2:[-24,8,0],tail3:[0,8,0],tail4:[4,6,0]};

// ---- the Tidecaller's style: water. Nothing snaps: every move swells, breaks and washes back. Her whole heavy body rolls behind the staff,
// the free paw conducts the water, and the thick tail is her counterweight: it lifts before a blow and slaps down with it.
// Her arms are short (the staff paw reaches about 19 cm from her shoulder), so the staff works at her right side and the shell head does the travelling.
const HOLD={p:[-0.31,0.40,0.03],d:[0.13,1,0.05],n:[0,0,1]};                      // upright at her side, butt just off the floor
const FWD=(k=0)=>({p:[-0.32,0.50+0.02*k,0.14+0.03*k],d:[0.08,0.42-0.2*k,0.9],n:[0,1,0]});   // levelled at the target, shell forward
const HIGH=(k=0)=>({p:[-0.29,0.64+0.02*k,0.05],d:[-0.05,1,0.1],n:[0,0,1]});         // raised: the shell above her head
const BACKR={p:[-0.34,0.50,0.04],d:[-0.3,0.75,-0.6],n:[0,1,0]};                  // wound back over her right shoulder, shell up and behind her
const LEFTF={p:[-0.14,0.46,0.26],d:[0.75,0.05,0.66],n:[0,1,0]};
const MIDF={p:[-0.32,0.46,0.12],d:[-0.1,0.14,0.98],n:[0,1,0]};                      // halfway through a sweep: shell straight ahead, low                      // swept across, shell out to her front left
const SLAM={p:[-0.35,0.37,0.14],d:[0.1,1,-0.05],n:[0,0,1]};                       // butt driven into the floor in front of her
const STREAM=(k=0)=>({p:[-0.32,0.52,0.17-0.012*Math.abs(k)],d:[0.06+0.03*k,0.2,0.95],n:[0,1,0]});   // levelled and held: the shell forward, weaving a little
const HEAVE={p:[-0.33,0.42,0.19],d:[0.05,-0.06,1],n:[0,1,0]};                        // thrown over and down: the shell low and far ahead
// braced behind the stream: low, leaning in, right shoulder forward, the free paw steadying beside the staff
const BRACE={spine:[16,10,0],chest:[7,12,0],head:[-16,-16,0],_hips:[0,-0.045,0.035],legL:[-20,0,5],legR:[16,0,-5],footR:[12,0,0],upperarmL:[-24,-46,8],forearmL:[-22,0,0],handL:[-10,0,0],tail1:[6,0,0]};

export const CLIPS={
  // idle: she is never still, like water in a bowl. A slow roll of the hips, the staff leaning with it, the free paw lifting as she breathes in, the nose testing the air, the tail tip curling
  idle:{T:3.2,loop:true,fn:(t,T)=>{const b=S(t,T/2), b2=S(t,T/2,0.12), w=S(t,T,0.1);return{
    _hips:[0.009*w,0.006*b-0.008,0], hips:[0,2*w,2.2*w], spine:[1.5*b,1.5*w,-1.6*w], chest:[1.8*b2,2*w,-0.8*w], head:[-2-3*bump(t,2.3,0.3)+1.5*S(t,T/2,0.2),6*S(t,T,0.3),3*bump(t,2.3,0.3)],
    legL:[0,0,-2*w], legR:[0,0,-2*w],
    upperarmL:[-3-3*b2,0,3+2*b2], forearmL:[-8-5*b2,0,0], handL:[6*S(t,T/2,0.25),0,0], upperarmR:[1.5*b,0,-1-1*b], forearmR:[-2*b2,0,0], ...tail(t,T,7), tail4:[3*bump(t,1.2,0.2),10*S(t,T,0.48),0],
  };}},
  // walk: a rolling waddle on short legs, the whole body swaying over each step, the tail swinging the other way, the staff tapping along
  walk:{T:0.64,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.012*s,0.012*c2-0.012,0], hips:[0,6*s,4.5*s], spine:[5,-3*s,-3.5*s], chest:[1.2*b2,-5*s,-1.5*s], head:[-4+2*b2,3*s,2.5*s],
    legL:[-30*s,0,0], legR:[30*s,0,0], footL:[18*pos(-S(t,T,0.15)),0,0], footR:[18*pos(S(t,T,0.15)),0,0],
    upperarmL:[22*s,0,3], forearmL:[-10+8*s,0,0], handL:[6*S(t,T,0.1),0,0], upperarmR:[-5*s,0,0], forearmR:[-4+2*b2,0,0], ...tail(t,T,13),
  };}},
  walkBack:{T:0.72,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0.008*s,0.01*c2-0.012,0], hips:[0,-4*s,3*s], spine:[-2,2*s,-2*s], chest:[0,4*s,0], head:[4+1.5*c2,-3*s,0],
    legL:[-24*s+3,0,0], legR:[24*s+3,0,0], footL:[-8*pos(-s),0,0], footR:[-8*pos(s),0,0],
    upperarmL:[12*s,0,4], forearmL:[-6,0,0], upperarmR:[-4*s,0,0], ...tail(t,T,8),
  };}},
  walkLeft:{T:0.64,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.64,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // The basic attack is a held stream: she levels the staff, braces behind it and keeps the water flowing. No hits: a steady push with a small shiver of recoil.
  stream:{T:0.8,loop:true,staffPose:{from:-1,to:99,fade:0.01,keys:[{t:0,...STREAM(0)},{t:0.2,...STREAM(1)},{t:0.4,...STREAM(0)},{t:0.6,...STREAM(-1)},{t:0.8,...STREAM(0)}]},
    keys:[{t:0,p:BRACE},{t:0.8,p:BRACE}],fn:(t,T)=>{const r=S(t,0.2), w=S(t,T), w2=S(t,T,0.2);return{
      _hips:[0.004*w,0.004*S(t,T/2),-0.004*r], spine:[1.2*r+1.5*w2,2*w,0], chest:[0.8*r,2.5*w,0], head:[-1.5*w2,-3*w,1.5*w], forearmL:[3*r,0,0], handL:[5*w2,0,0], ...tail(t,T,9)};}},
  // the tsunami, after 5 seconds of stream: the pull and the heave. She cuts the stream and hauls the staff back and up over her shoulder as if dragging the whole stream back
  // (the water balls up over the shell), rises on her toes with her tail high, hangs a beat, then heaves the staff over and down with her whole weight, tail slapping the floor,
  // free paw shoved forward; the wave stands up in front of her and rolls away. Contact 0.68 s.
  tsunami:{T:1.6,staffPose:{from:-0.2,to:1.42,fade:0.12,keys:[{t:0,...STREAM(0)},{t:0.14,p:[-0.33,0.52,0.06],d:[-0.1,0.8,0.5],n:[0,0,1]},{t:0.3,...BACKR},{t:0.44,...HIGH(1)},{t:0.56,...HIGH(1.3)},{t:0.68,...HEAVE,ease:'in'},{t:0.8,p:[-0.33,0.43,0.2],d:[0.05,0.04,1],n:[0,1,0]},{t:1.1,...HEAVE},{t:1.42,...HOLD}]},keys:[
    {t:0,p:BRACE},
    {t:0.14,p:{spine:[0,-8,0],chest:[0,-10,0],head:[0,12,0],_hips:[0,-0.02,-0.01],legL:[-6,0,0],legR:[6,0,0],upperarmL:[-30,0,24],forearmL:[-24,0,0],...tailUp(10)}},
    {t:0.3,p:{spine:[-8,-22,0],chest:[-5,-26,0],head:[-2,32,0],_hips:[-0.008,-0.01,-0.035],legL:[-6,0,0],legR:[10,0,0],upperarmL:[-44,0,40],forearmL:[-34,0,0],...tailUp(24)}},
    {t:0.44,p:{spine:[-13,-8,0],chest:[-9,-8,0],head:[-12,8,0],_hips:[0,0.035,-0.03],footL:[26,0,0],footR:[26,0,0],upperarmL:[-26,0,62],forearmL:[-40,0,0],...tailUp(38)}},
    {t:0.56,p:{spine:[-16,0,0],chest:[-10,0,0],head:[-14,0,0],_hips:[0,0.05,-0.035],footL:[30,0,0],footR:[30,0,0],upperarmL:[-28,0,70],forearmL:[-44,0,0],...tailUp(44)}},
    {t:0.68,ease:'in',p:{spine:[26,6,0],chest:[14,8,0],head:[-20,-8,0],_hips:[0,-0.075,0.075],legL:[-24,0,6],legR:[12,0,-6],footR:[14,0,0],upperarmL:[-74,0,26],forearmL:[-6,0,0],handL:[-30,0,0],...tailUp(0)}},
    {t:0.8,p:{spine:[21,5,0],chest:[11,6,0],head:[-15,-6,0],_hips:[0,-0.055,0.065],legL:[-20,0,6],legR:[10,0,-6],footR:[10,0,0],upperarmL:[-66,0,26],forearmL:[-8,0,0],handL:[-24,0,0],...tailUp(9)}},
    {t:1.1,p:{spine:[18,4,0],chest:[9,5,0],head:[-12,-5,0],_hips:[0,-0.05,0.055],legL:[-18,0,5],legR:[9,0,-5],upperarmL:[-56,0,24],forearmL:[-10,0,0],handL:[-16,0,0],...tailUp(0)}},
    {t:1.6,p:{}},
  ],fn:(t,T)=>tail(t,0.8,6)},
  // dash: an otter's slide. She throws herself forward low and long and lands rolling back onto her feet
  dash:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[-6,0,0],_hips:[0,-0.04,-0.02],legL:[10,0,0],legR:[10,0,0],...tailUp(10)}},
    {t:0.2,ease:'out',p:{hips:[20,0,0],spine:[26,0,0],chest:[10,0,0],head:[-34,0,0],_hips:[0,0.02,0.07],legL:[36,0,0],legR:[42,0,0],footL:[30,0,0],footR:[30,0,0],upperarmL:[-70,0,10],forearmL:[-10,0,0],upperarmR:[30,0,-10],...tailUp(-12)}},
    {t:0.4,p:{hips:[16,0,0],spine:[22,0,0],chest:[8,0,0],head:[-28,0,0],_hips:[0,0.0,0.09],legL:[-26,0,0],legR:[-16,0,0],upperarmL:[-60,0,10],upperarmR:[24,0,-10],...tailUp(0)}},
    {t:0.52,ease:'in',p:{spine:[12,0,0],_hips:[0,-0.04,0.03],legL:[-10,0,0],legR:[6,0,0],head:[4,0,0],...tailUp(8)}},
    {t:0.66,p:{}},
  ]},
  dashBack:{T:0.66,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[8,0,0],_hips:[0,-0.04,0.02],legL:[-8,0,0],legR:[-8,0,0]}},
    {t:0.2,ease:'out',p:{spine:[-14,0,0],chest:[-6,0,0],head:[14,0,0],_hips:[0,0.05,-0.06],legL:[-30,0,0],legR:[-18,0,0],footL:[-16,0,0],upperarmL:[-36,0,24],upperarmR:[-20,0,-14],...tailUp(22)}},
    {t:0.4,p:{spine:[-12,0,0],chest:[-5,0,0],head:[12,0,0],_hips:[0,0.04,-0.08],legL:[-20,0,0],legR:[-30,0,0],footR:[-16,0,0],upperarmL:[-30,0,22],upperarmR:[-18,0,-14],...tailUp(18)}},
    {t:0.52,ease:'in',p:{spine:[4,0,0],_hips:[0,-0.04,-0.03],legL:[8,0,0],legR:[5,0,0],head:[-3,0,0],...tailUp(0)}},
    {t:0.66,p:{}},
  ]},
  dashLeft:{T:0.66,keys:sideDash(1)},
  dashRight:{T:0.66,keys:sideDash(-1)},
  // torrent (riverbolt, torrent, undertow): the staff is drawn back beside her as she leans away, then pushed straight out, the shell leading, her whole weight behind it; a stream leaves the shell
  castPoint:{T:1.15,staffPose:{from:0.02,to:1.0,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.22,p:[-0.31,0.50,-0.06],d:[-0.32,0.5,0.8],n:[0,1,0]},{t:0.34,p:[-0.31,0.50,-0.08],d:[-0.34,0.46,0.82],n:[0,1,0]},{t:0.44,...FWD(1.4),ease:'in'},{t:0.62,...FWD(1.1)},{t:0.8,...FWD(0.4)},{t:1.0,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.22,p:{spine:[-10,-16,0],chest:[-5,-18,0],head:[4,26,0],_hips:[0,-0.012,-0.035],legL:[-8,0,0],legR:[10,0,0],upperarmL:[-46,0,16],forearmL:[-20,0,0],...tailUp(16)}},
    {t:0.34,p:{spine:[-12,-18,0],chest:[-6,-20,0],head:[5,30,0],_hips:[0,-0.016,-0.04],legL:[-8,0,0],legR:[10,0,0],upperarmL:[-50,0,16],forearmL:[-20,0,0],...tailUp(20)}},
    {t:0.44,ease:'in',p:{spine:[20,12,0],chest:[10,14,0],head:[-18,-18,0],_hips:[0,-0.04,0.06],legL:[-20,0,0],legR:[14,0,0],footR:[12,0,0],upperarmL:[26,0,24],forearmL:[-6,0,0],...tailUp(0)}},
    {t:0.62,p:{spine:[17,10,0],chest:[8,12,0],head:[-15,-15,0],_hips:[0,-0.035,0.05],legL:[-18,0,0],legR:[12,0,0],upperarmL:[20,0,22],...tailUp(4)}},
    {t:1.15,p:{}},
  ],fn:(t,T)=>tail(t,0.58,7)},
  // calling the water (bubble ward, rain squall, tidepool): she rises tall, lifts the shell high and turns it once like stirring the sky, her free paw open beside it; the water answers around her
  castBloom:{T:1.4,staffPose:{from:0.02,to:1.2,fade:0.12,keys:[{t:0.02,...HOLD},{t:0.3,...HIGH(0.6)},{t:0.44,p:[-0.28,0.66,0.08],d:[0.06,1,0.2],n:[0,0,1]},{t:0.56,p:[-0.30,0.67,0.03],d:[-0.2,1,-0.06],n:[0,0,1]},{t:0.68,...HIGH(1.2)},{t:0.9,...HIGH(1)},{t:1.2,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.14,p:{spine:[6,0,0],_hips:[0,-0.03,0],upperarmL:[0,0,10],...tailUp(0)}},
    {t:0.3,p:{spine:[-8,0,0],chest:[-6,0,0],head:[-14,-6,0],_hips:[0,0.025,-0.01],footL:[20,0,0],footR:[20,0,0],upperarmL:[-30,0,60],forearmL:[-40,0,0],...tailUp(18)}},
    {t:0.5,p:{spine:[-10,6,0],chest:[-7,6,0],head:[-16,-10,0],_hips:[0.006,0.032,-0.012],footL:[24,0,0],footR:[24,0,0],upperarmL:[-34,0,70],forearmL:[-44,0,0],...tailUp(24)}},
    {t:0.68,p:{spine:[-12,-4,0],chest:[-8,-4,0],head:[-18,0,0],_hips:[0,0.038,-0.014],footL:[26,0,0],footR:[26,0,0],upperarmL:[-36,0,76],forearmL:[-46,0,0],...tailUp(28)}},
    {t:0.9,p:{spine:[-9,0,0],chest:[-6,0,0],head:[-14,0,0],_hips:[0,0.028,-0.01],footL:[20,0,0],footR:[20,0,0],upperarmL:[-30,0,66],forearmL:[-40,0,0],...tailUp(18)}},
    {t:1.4,p:{}},
  ],fn:(t,T)=>tail(t,0.7,8)},
  // whirlpool (whirlpool, maelstrom, the pools on the floor): the staff is planted hard in front of her and her tail slaps the floor behind; she leans on the staff as the pool opens
  castPlant:{T:1.2,staffPose:{from:0.02,to:1.04,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.2,...HIGH(0.2)},{t:0.3,...HIGH(0.5)},{t:0.4,...SLAM,ease:'in'},{t:0.74,...SLAM},{t:1.04,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-8,0,0],chest:[-5,0,0],head:[-6,0,0],_hips:[0,0.02,-0.01],footL:[18,0,0],footR:[18,0,0],upperarmL:[-10,0,30],forearmL:[-24,0,0],...tailUp(30)}},
    {t:0.3,p:{spine:[-10,0,0],chest:[-6,0,0],head:[-8,0,0],_hips:[0,0.026,-0.012],footL:[22,0,0],footR:[22,0,0],upperarmL:[-12,0,34],forearmL:[-26,0,0],...tailUp(36)}},
    {t:0.4,ease:'in',p:{spine:[24,0,0],chest:[13,0,0],head:[-16,0,0],_hips:[0,-0.07,0.03],legL:[-18,0,6],legR:[-18,0,-6],upperarmL:[20,0,36],forearmL:[-8,0,0],...tailUp(0)}},
    {t:0.5,p:{spine:[19,0,0],chest:[10,0,0],head:[-12,0,0],_hips:[0,-0.05,0.025],legL:[-14,0,5],legR:[-14,0,-5],upperarmL:[14,0,32],...tailUp(8)}},
    {t:0.74,p:{spine:[17,0,0],chest:[9,0,0],head:[-10,0,0],_hips:[0,-0.045,0.02],legL:[-13,0,5],legR:[-13,0,-5],upperarmL:[12,0,30],...tailUp(0)}},
    {t:1.2,p:{}},
  ],fn:(t,T)=>tail(t,1.2,6)},
  // crashing wave (breaker, crashing wave): she winds the staff far back to her right, her body coiled after it, then heaves it across her front in one wide level sweep; a wave rolls out ahead
  castSweep:{T:1.2,staffPose:{from:0.02,to:1.04,fade:0.1,keys:[{t:0.02,...HOLD},{t:0.24,...BACKR},{t:0.34,p:[-0.34,0.51,0.03],d:[-0.34,0.7,-0.64],n:[0,1,0]},{t:0.4,...MIDF,ease:'in'},{t:0.46,...LEFTF},{t:0.66,p:[-0.13,0.46,0.26],d:[0.8,0.05,0.6],n:[0,1,0]},{t:0.86,...FWD(0)},{t:1.04,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.24,p:{spine:[2,-24,0],chest:[0,-28,0],head:[0,36,0],_hips:[-0.01,-0.02,-0.02],legL:[-6,0,0],legR:[8,0,0],upperarmL:[-36,0,20],forearmL:[-30,0,0],tail1:[4,-18,0],tail2:[2,-16,0],tail3:[0,-12,0]}},
    {t:0.34,p:{spine:[0,-28,0],chest:[-2,-32,0],head:[0,42,0],_hips:[-0.012,-0.026,-0.025],legL:[-6,0,0],legR:[8,0,0],upperarmL:[-40,0,22],forearmL:[-32,0,0],tail1:[6,-22,0],tail2:[3,-18,0],tail3:[0,-14,0]}},
    {t:0.46,ease:'in',p:{spine:[10,26,0],chest:[5,30,0],head:[-8,-30,0],_hips:[0.014,-0.045,0.035],legL:[-14,0,5],legR:[10,0,0],upperarmL:[-20,0,50],forearmL:[-8,0,0],tail1:[0,22,0],tail2:[0,20,0],tail3:[0,16,0]}},
    {t:0.66,p:{spine:[8,22,0],chest:[4,25,0],head:[-6,-25,0],_hips:[0.012,-0.038,0.03],legL:[-12,0,5],legR:[9,0,0],upperarmL:[-16,0,44],tail1:[0,12,0],tail2:[0,14,0],tail3:[0,12,0]}},
    {t:1.2,p:{}},
  ],fn:(t,T)=>tail(t,0.6,5)},
  // ripple step (the weapon move): she drops onto her belly and slides forward like an otter down a bank, staff held out ahead, then rolls back up onto her feet
  slide:{T:1.1,staffPose:{from:0.04,to:0.96,fade:0.12,keys:[{t:0.04,...HOLD},{t:0.26,p:[-0.27,0.2,0.2],d:[0.05,0.16,0.98],n:[0,1,0]},{t:0.62,p:[-0.27,0.19,0.22],d:[0.05,0.12,0.99],n:[0,1,0]},{t:0.96,...HOLD}]},keys:[
    {t:0,p:{}},
    {t:0.1,p:{spine:[-6,0,0],_hips:[0,-0.03,-0.02],legL:[8,0,0],legR:[8,0,0],...tailUp(14)}},
    {t:0.26,ease:'out',p:{hips:[62,0,0],spine:[6,0,0],chest:[4,0,0],head:[-58,0,0],_hips:[0,-0.075,0.06],legL:[30,0,6],legR:[34,0,-6],footL:[36,0,0],footR:[36,0,0],upperarmL:[-110,0,24],forearmL:[-10,0,0],tail1:[-46,0,0],tail2:[-16,0,0],tail3:[4,0,0]}},
    {t:0.44,p:{hips:[66,0,0],spine:[6,0,0],chest:[4,0,0],head:[-60,0,0],_hips:[0,-0.08,0.09],legL:[34,0,6],legR:[30,0,-6],footL:[38,0,0],footR:[38,0,0],upperarmL:[-114,0,26],forearmL:[-10,0,0],tail1:[-48,8,0],tail2:[-16,8,0],tail3:[4,6,0]}},
    {t:0.62,p:{hips:[62,0,0],spine:[6,0,0],chest:[4,0,0],head:[-56,0,0],_hips:[0,-0.075,0.08],legL:[28,0,6],legR:[32,0,-6],footL:[34,0,0],footR:[34,0,0],upperarmL:[-108,0,24],tail1:[-46,-8,0],tail2:[-16,-8,0],tail3:[4,-6,0]}},
    {t:0.82,ease:'in',p:{hips:[14,0,0],spine:[14,0,0],head:[-10,0,0],_hips:[0,-0.05,0.03],legL:[-14,0,0],legR:[-8,0,0],upperarmL:[-20,0,10],...tailUp(6)}},
    {t:1.1,p:{}},
  ]},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-12,0,0],head:[-10,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-20,0,30],upperarmR:[-15,0,-20],...tailUp(14)}},
    {t:0.3,p:{hips:[26,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.04,0.02],legL:[-30,0,0],legR:[-26,0,0],upperarmL:[-40,0,10]}},
    {t:0.55,ease:'in',p:{...PRONE,_hips:[0,-0.095,0.0]}},
    {t:0.66,p:{...PRONE,_hips:[0,-0.078,0.0],head:[-68,0,0]}},
    {t:0.8,p:PRONE},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:PRONE},{t:3.0,p:PRONE}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],tail3:[0,6*S(t,T),0],tail4:[0,10*S(t,T,0.1),0]})},
  revive:{T:1.1,keys:[
    {t:0,p:PRONE},
    {t:0.35,p:{hips:[46,0,0],spine:[6,0,0],head:[-38,0,0],_hips:[0,-0.07,0.0],legL:[-50,0,4],legR:[-42,0,-4],upperarmL:[-60,0,10],upperarmR:[-40,0,10],tail1:[-30,0,0],tail2:[-10,0,0]}},
    {t:0.65,p:{spine:[14,0,0],head:[-8,0,0],_hips:[0,-0.04,0],legL:[-18,0,0],legR:[-10,0,0],upperarmL:[-10,0,0]}},
    {t:0.85,ease:'out',p:{spine:[-5,0,0],head:[-6,0,0],_hips:[0,0.02,0],upperarmL:[-20,0,24],upperarmR:[-10,0,-10],...tailUp(10)}},
    {t:1.1,p:{}},
  ]},
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-16,0,-4],chest:[-8,0,0],head:[-12,0,6],_hips:[0,-0.018,-0.045],upperarmL:[-25,0,34],forearmL:[-20,0,0],upperarmR:[-12,0,-20],legR:[12,0,0],...tailUp(16)}},
    {t:0.2,p:{spine:[-9,0,-2],head:[-5,0,3],_hips:[0,-0.022,-0.035],upperarmL:[-10,0,18],upperarmR:[-6,0,-10],...tailUp(6)}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.008,-0.01]}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{upperarmL:[0,0,118],forearmL:[10,0,-22],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:1.5,p:{upperarmL:[0,0,118],forearmL:[10,0,-22],head:[0,0,7],spine:[0,0,-3],_hips:[0,0.008,0]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{forearmL:[0,0,26*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,14*e*Math.sin(2*Math.PI*t/0.36-0.6)],...tail(t,0.5,12)};}},
};
// ---- casting over the stream: the staff keeps streaming (same brace, same levelled staff) and only her free left paw makes the cast
{const SP={from:-1,to:99,fade:0.01,keys:[{t:0,...STREAM(0)},{t:0.2,...STREAM(1)},{t:0.4,...STREAM(0)},{t:0.6,...STREAM(-1)},{t:0.8,...STREAM(0)},{t:1.0,...STREAM(1)},{t:1.2,...STREAM(0)}]};
 const B=(o)=>({...BRACE,...o}), shiver=(t,T)=>{const r=S(t,0.2), w=S(t,0.8);return{_hips:[0.004*w,0,-0.004*r],spine:[1.2*r,0,0],chest:[0.8*r,0,0],...tail(t,0.8,9)};};
 const UPP={upperarmL:[-90,-50,60]}, OUT={upperarmL:[-120,0,90]}, FWDP={upperarmL:[0,0,180]}, LOW={upperarmL:[-40,-50,20]}, ACROSS={upperarmL:[0,-90,60]};   // paw by her cheek / flung wide to her left / reached forward palm down / forward and low palm up / across her belly
 // torrent: the paw is drawn up beside her cheek and thrown forward, and she leans after it
 CLIPS.handPoint={T:0.8,staffPose:SP,fn:shiver,keys:[{t:0,p:BRACE},{t:0.15,p:B({...UPP,chest:[2,2,0],head:[-14,-6,0],_hips:[0,-0.035,0.01]})},{t:0.3,ease:'in',p:B({...FWDP,forearmL:[0,0,10],chest:[10,22,0],spine:[19,12,0],head:[-14,-24,0],_hips:[0,-0.055,0.045]})},{t:0.46,p:B({...FWDP,forearmL:[0,0,6],chest:[9,20,0],spine:[18,12,0],head:[-13,-22,0],_hips:[0,-0.05,0.04]})},{t:0.8,p:BRACE}]};
 // calling the water: the paw is flung up and out, stirs once, and her head follows it
 CLIPS.handBloom={T:1.0,staffPose:SP,fn:shiver,keys:[{t:0,p:BRACE},{t:0.2,p:B({...OUT,head:[-24,2,8],chest:[2,6,-4],_hips:[0,-0.02,0.02]})},{t:0.32,p:B({...UPP,head:[-26,-6,6],chest:[2,10,-3],_hips:[0,-0.012,0.02]})},{t:0.45,p:B({upperarmL:[-130,0,100],forearmL:[0,0,-14],head:[-28,4,10],chest:[1,4,-6],_hips:[0,-0.005,0.02]})},{t:0.62,p:B({...OUT,head:[-24,2,8],chest:[2,6,-4],_hips:[0,-0.015,0.02]})},{t:1.0,p:BRACE}]};
 // whirlpool: the paw is lifted by her cheek and slapped down ahead of her, palm down, and her whole body dips with it
 CLIPS.handPlant={T:0.85,staffPose:SP,fn:shiver,keys:[{t:0,p:BRACE},{t:0.18,p:B({...UPP,_hips:[0,-0.02,0.02],spine:[10,8,0],head:[-18,-8,4]})},{t:0.34,ease:'in',p:B({...FWDP,forearmL:[14,0,0],handL:[24,0,0],_hips:[0,-0.085,0.04],spine:[24,10,0],chest:[9,14,0],head:[-10,-14,0]})},{t:0.5,p:B({...FWDP,forearmL:[10,0,0],handL:[20,0,0],_hips:[0,-0.075,0.04],spine:[22,10,0],chest:[8,14,0],head:[-10,-14,0]})},{t:0.85,p:BRACE}]};
 // crashing wave: the paw is flung wide to her left and swept across her front, her chest turning with it
 CLIPS.handSweep={T:0.9,staffPose:SP,fn:shiver,keys:[{t:0,p:BRACE},{t:0.18,p:B({...OUT,chest:[5,-4,0],head:[-14,10,0]})},{t:0.36,ease:'in',p:B({...LOW,chest:[7,24,0],head:[-12,-26,0],_hips:[0,-0.055,0.035]})},{t:0.5,p:B({...ACROSS,chest:[7,27,0],head:[-12,-28,0],_hips:[0,-0.05,0.035]})},{t:0.9,p:BRACE}]};
}
// her tail lies on the floor, so whenever her hips sink the tail is lifted by the same amount at its root and stays on the floor instead of going under it
for(const n in CLIPS){ if(/^(down|revive|slide|dash)/.test(n)||!CLIPS[n].keys)continue; for(const k of CLIPS[n].keys){const h=k.p._hips; if(h&&h[1]<-0.005&&!k.p.hips){const a=-h[1]*270, t=k.p.tail1||[0,0,0]; k.p.tail1=[t[0]+a,t[1],t[2]];}} }
// her trunk is one barrel, so a big turn of the spine reads as the whole otter turning away: the sweeps turn it less
for(const n of ['castSweep'])for(const k of CLIPS[n].keys)for(const j of ['spine','chest','head'])if(k.p[j])k.p[j]=[k.p[j][0],k.p[j][1]*0.55,k.p[j][2]];
for(const n of ['tsunami','castPoint','castSweep','castPlant'])CLIPS[n].mech=true;
// ---- derived clips: each single hit of the tap chain keeps only its own blow
{
 CLIPS.downCrawl={T:1.3,loop:true,keys:[{t:0,p:PRONE},{t:1.3,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   hips:[0,0,4*s],spine:[0,5*s,0],head:[3*c,0,0],upperarmL:[-5*pos(c),0,-14*s],upperarmR:[-4*pos(-c),0,-10*s],legL:[8*pos(-c),0,0],legR:[8*pos(c),0,0],tail1:[0,-6*s,0],tail2:[0,-8*S(t,T,0.15),0],tail3:[0,-10*S(t,T,0.3),0]};}};
}
// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 // run: a low, rolling lope, body pitched forward, the tail streaming straight out behind as a rudder, the staff tucked level at her side
 CLIPS.run={T:0.42,loop:true,staffPose:{from:-1,to:99,fade:0.01,keys:[{t:0,p:[-0.3,0.4,0.06],d:[0.04,0.5,0.86],n:[0,1,0]},{t:0.42,p:[-0.3,0.4,0.06],d:[0.04,0.5,0.86],n:[0,1,0]}]},fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
   _hips:[0.01*s,0.022*c2-0.022,0.02], hips:[6,7*s,5*s], spine:[16+2*c2,-4*s,-4*s], chest:[4+1.5*b2,-6*s,0], head:[-22+2.5*b2,4*s,2*s],
   legL:[-46*s-6,0,0], legR:[46*s-6,0,0], footL:[28*pos(-S(t,T,0.15)),0,0], footR:[28*pos(S(t,T,0.15)),0,0],
   upperarmL:[34*s,0,6], forearmL:[-30+10*s,0,0], tail1:[8+3*c2,6*s,0], tail2:[4+3*b2,8*S(t,T,0.12),0], tail3:[2,10*S(t,T,0.24),0], tail4:[2,12*S(t,T,0.36),0],
 };}};
 CLIPS.runBack={T:0.42,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.3)};
 CLIPS.runLeft={T:0.42,loop:true,fn:sc(CLIPS.walkLeft.fn,0.64,1.3)};
 CLIPS.runRight={T:0.42,loop:true,fn:sc(CLIPS.walkRight.fn,0.64,1.3)};
}
