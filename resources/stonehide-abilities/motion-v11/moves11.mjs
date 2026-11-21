// moves.mjs: Stonehide's skill moves (review build), in the model page's key language (see base-lib.mjs).
// Every skill's effect lands 0.10 s after the press (the kit's rule), so every move here is: a compact wind-up
// (0 to 0.10 s, opposite to the blow), the contact AT 0.10 s arriving at full speed, a carry past it, a held
// beat with the weight down, and a slow heavy recovery. Ears and tail are springs; the head and the free arm trail.
import { CLIPS as B, S, pos, bump, tail, OVER, SLAM, BRACE, TH, GP, HOOK, stepBob } from './base-lib.mjs';
const sm=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
const win=(t,a,b,f=0.12)=>sm(a,a+f,t)*(1-sm(b-f,b,t));              // 0..1 window
const sway=(t,T,per,a)=>{const w=win(t,0,T,0.2),o=tail(t,per,a);for(const k in o)o[k]=o[k].map(v=>v*w);return o;}; // a tail sway that starts and ends still
const shake=(t,c,w,hz,ph=0)=>bump(t,c,w)*Math.sin(2*Math.PI*hz*t+ph);
const WIDE={upperarmL:[12,50,34],forearmL:[12,12,0],upperarmR:[12,0,-66],forearmR:[12,0,-12]};  // both arms thrown wide (the roar)
export const CLIPS={
  // BELLOW (S16): the roar. He drops and fills his chest in four frames, then throws his arms wide and his head back; the roar
  // sweeps from his right to his left with the head, and the chest and the free paw shake with it.
  bellow:{T:1.35,keys:[
    {t:0,p:{}},
    {t:0.055,p:{spine:[17,0,0],chest:[9,0,0],head:[15,-10,0],_hips:[0,-0.07,0],upperarmL:[-16,-12,0],forearmL:[6,0,0],upperarmR:[-12,0,16],forearmR:[-44,0,0],legL:[-6,0,4],legR:[-6,0,-4],earL:[12,0,0],earR:[12,0,0],tail1:[-16,0,0]}},
    {t:0.10,ease:'in',p:{spine:[-15,0,0],chest:[-13,0,0],head:[-30,-16,0],_hips:[0,0.035,0],...WIDE,earL:[-16,0,0],earR:[-16,0,0],legL:[0,0,7],legR:[0,0,-7],footL:[8,0,0],footR:[8,0,0],tail1:[22,0,0],tail2:[12,0,0]}},
    {t:0.24,p:{spine:[-13,0,0],chest:[-11,0,0],head:[-27,-10,0],_hips:[0,0.018,0],upperarmL:[12,46,32],forearmL:[12,12,0],upperarmR:[12,0,-62],forearmR:[12,0,-12],legL:[0,0,7],legR:[0,0,-7],tail1:[14,0,0]}},
    {t:0.78,p:{spine:[-10,0,0],chest:[-9,0,0],head:[-22,16,0],_hips:[0,0.006,0],upperarmL:[10,42,28],forearmL:[10,10,0],upperarmR:[10,0,-56],forearmR:[10,0,-10],legL:[0,0,6],legR:[0,0,-6]}},
    {t:1.02,p:{spine:[6,0,0],chest:[2,0,0],head:[-2,4,0],_hips:[0,-0.03,0],upperarmL:[-4,10,6],upperarmR:[0,0,-12],forearmR:[-12,0,0]}},
    {t:1.35,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.44,0.26),w=Math.sin(2*Math.PI*t/0.085);return{head:[0,0,3.8*e*w],chest:[0,0,1.5*e*w],upperarmR:[0,0,2.2*e*Math.sin(2*Math.PI*t/0.085+1)],upperarmL:[0,0,1.2*e*Math.sin(2*Math.PI*t/0.085+2)],...sway(t,T,0.7,9)};}},
  // RALLYING CRY (S25): a call to his side, not a threat. The fist punches straight up, the slab goes up beside it like a banner,
  // his chest opens to the party; two pumps of the fist while he calls, then the weight comes down.
  rally:{T:1.3,
    staffPose:{from:0.03,to:0.95,fade:0.07,keys:[{t:0.03,p:[0.24,0.44,0.22],d:[0.1,1,0],n:[0,0,1]},{t:0.10,p:[0.42,0.74,0.06],d:[0.42,1,-0.05],n:[0,0,1],ease:'in'},{t:0.24,p:[0.41,0.70,0.06],d:[0.36,1,-0.04],n:[0,0,1]},{t:0.44,p:[0.42,0.74,0.06],d:[0.42,1,-0.05],n:[0,0,1]},{t:0.62,p:[0.41,0.70,0.06],d:[0.36,1,-0.04],n:[0,0,1]},{t:0.95,p:[0.26,0.5,0.2],d:[0.1,1,0],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[11,0,0],chest:[5,0,0],head:[9,0,0],_hips:[0,-0.055,0],upperarmR:[8,0,12],forearmR:[-58,0,0],legL:[-5,0,3],legR:[-5,0,-3],earL:[10,0,0],earR:[10,0,0],tail1:[-14,0,0]}},
    {t:0.10,ease:'in',p:{spine:[-11,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,0.04,0],upperarmR:[-12,0,-150],forearmR:[0,0,14],footL:[16,0,0],footR:[16,0,0],legL:[0,0,5],legR:[0,0,-5],earL:[-14,0,0],earR:[-14,0,0],tail1:[20,0,0]}},
    {t:0.24,p:{spine:[-8,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,0.01,0],upperarmR:[-10,0,-132],forearmR:[0,0,34],footL:[4,0,0],footR:[4,0,0],legL:[0,0,5],legR:[0,0,-5]}},
    {t:0.44,ease:'in',p:{spine:[-10,0,0],chest:[-10,8,0],head:[-19,-14,0],_hips:[0,0.03,0],upperarmR:[-12,0,-152],forearmR:[0,0,12],footL:[12,0,0],footR:[12,0,0],legL:[0,0,5],legR:[0,0,-5]}},
    {t:0.62,p:{spine:[-8,0,0],chest:[-8,-8,0],head:[-16,14,0],_hips:[0,0.008,0],upperarmR:[-10,0,-134],forearmR:[0,0,30],legL:[0,0,5],legR:[0,0,-5]}},
    {t:0.95,p:{spine:[8,0,0],chest:[3,0,0],head:[2,0,0],_hips:[0,-0.04,0],upperarmR:[0,0,-20],forearmR:[-20,0,0],legL:[-4,0,3],legR:[-4,0,-3]}},
    {t:1.3,p:{}},
  ],fn:(t,T)=>sway(t,T,0.65,8)},
  // COLOSSUS (S45): the long wind-up (0.30 s): a breath in on his toes, then he curls in tight, stamps (the roar's ring), and swells out of the curl through the half second he grows:
  // back straightening, arms spreading, then a chest-out roar at full height and a heavy settle.
  colossus:{T:2.05,keys:[
    {t:0,p:{}},
    {t:0.17,ease:'out',p:{spine:[-9,0,0],chest:[-9,0,0],head:[-11,0,0],_hips:[0,0.032,-0.01],upperarmL:[4,22,16],forearmL:[6,6,0],upperarmR:[8,0,-34],forearmR:[-8,0,-6],legL:[4,0,4],legR:[4,0,-4],footL:[13,0,0],footR:[13,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[16,0,0]}},
    {t:0.3,ease:'in',p:{spine:[24,0,0],chest:[13,0,0],head:[18,0,0],_hips:[0,-0.105,0.01],upperarmL:[-8,30,8],forearmL:[4,10,0],upperarmR:[-40,34,14],forearmR:[-72,0,0],legL:[-14,0,7],legR:[-14,0,-7],earL:[16,0,0],earR:[16,0,0],tail1:[-22,0,0]}},
    {t:0.45,p:{spine:[22,0,0],chest:[12,0,0],head:[16,0,0],_hips:[0,-0.09,0.01],upperarmL:[-8,28,8],forearmL:[4,10,0],upperarmR:[-38,32,12],forearmR:[-70,0,0],legL:[-12,0,7],legR:[-12,0,-7]}},
    {t:0.9,ease:'in',p:{spine:[-16,0,0],chest:[-15,0,0],head:[-24,0,0],_hips:[0,0.045,0],...WIDE,upperarmR:[14,0,-74],legL:[0,0,10],legR:[0,0,-10],footL:[10,0,0],footR:[10,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[24,0,0],tail2:[12,0,0]}},
    {t:1.06,p:{spine:[-13,0,0],chest:[-12,0,0],head:[-20,0,0],_hips:[0,0.015,0],upperarmL:[12,46,30],forearmL:[12,12,0],upperarmR:[12,0,-64],forearmR:[10,0,-22],legL:[0,0,10],legR:[0,0,-10]}},
    {t:1.45,p:{spine:[-9,0,0],chest:[-8,0,0],head:[-13,0,0],_hips:[0,0.004,0],upperarmL:[8,36,22],forearmL:[8,8,0],upperarmR:[8,0,-48],forearmR:[0,0,-26],legL:[0,0,8],legR:[0,0,-8]}},
    {t:1.72,p:{spine:[7,0,0],chest:[3,0,0],head:[0,0,0],_hips:[0,-0.04,0],upperarmL:[-4,8,4],upperarmR:[0,0,-10],forearmR:[-14,0,0],legL:[-3,0,4],legR:[-3,0,-4]}},
    {t:2.05,p:{}},
  ],fn:(t,T)=>{const e=bump(t,1.14,0.2),w=Math.sin(2*Math.PI*t/0.09),g=win(t,0.4,0.88,0.1);return{head:[0,0,3.4*e*w+1.6*g*Math.sin(2*Math.PI*t/0.07)],chest:[0,0,1.4*e*w+0.9*g*Math.sin(2*Math.PI*t/0.07+1)],upperarmR:[0,0,2*e*Math.sin(2*Math.PI*t/0.09+1)+1.4*g*Math.sin(2*Math.PI*t/0.06)],upperarmL:[0,0,1.2*g*Math.sin(2*Math.PI*t/0.065+2)],...sway(t,T,0.9,9)};}},
  // BLOODBOIL (S28): he beats his own chest. The first thump lands with the burn, a second follows, then the head goes
  // back in a snarl with the arms flexed down and out, the whole body trembling as the blood comes up.
  boil:{T:1.35,
    offHand:{from:0.0,to:0.5,fade:0.06,keys:[{t:0,p:[-0.30,0.44,0.16]},{t:0.05,p:[-0.36,0.58,0.26]},{t:0.10,p:[-0.03,0.56,0.25],ease:'in'},{t:0.20,p:[-0.30,0.60,0.30]},{t:0.31,p:[-0.03,0.57,0.25],ease:'in'},{t:0.40,p:[-0.24,0.56,0.28]},{t:0.5,p:[-0.3,0.44,0.2]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-7,-8,0],chest:[-6,-12,0],head:[-6,8,0],_hips:[0,0.012,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.10,ease:'in',p:{spine:[7,4,0],chest:[5,8,0],head:[7,-4,0],_hips:[0,-0.04,0],legL:[-4,0,5],legR:[-4,0,-5],earL:[14,0,0],earR:[14,0,0],tail1:[-12,0,0]}},
    {t:0.20,p:{spine:[-5,-6,0],chest:[-4,-10,0],head:[-6,6,0],_hips:[0,0.0,0],legL:[-2,0,5],legR:[-2,0,-5]}},
    {t:0.31,ease:'in',p:{spine:[8,4,0],chest:[6,8,0],head:[8,-4,0],_hips:[0,-0.05,0],legL:[-5,0,6],legR:[-5,0,-6],earL:[14,0,0],earR:[14,0,0]}},
    {t:0.42,p:{spine:[12,0,0],chest:[6,0,0],head:[10,0,0],_hips:[0,-0.07,0],upperarmL:[-6,14,4],legL:[-8,0,7],legR:[-8,0,-7]}},
    {t:0.56,ease:'in',p:{spine:[-14,0,0],chest:[-13,0,0],head:[-30,0,0],_hips:[0,0.02,0],upperarmL:[26,30,30],forearmL:[20,10,0],upperarmR:[30,0,-44],forearmR:[-46,0,0],legL:[0,0,9],legR:[0,0,-9],earL:[-18,0,0],earR:[-18,0,0],tail1:[22,0,0]}},
    {t:0.72,p:{spine:[-11,0,0],chest:[-11,0,0],head:[-26,0,0],_hips:[0,0.006,0],upperarmL:[24,28,28],forearmL:[18,10,0],upperarmR:[27,0,-40],forearmR:[-50,0,0],legL:[0,0,9],legR:[0,0,-9]}},
    {t:1.0,p:{spine:[4,0,0],chest:[0,0,0],head:[-6,0,0],_hips:[0,-0.03,0],upperarmL:[6,8,8],upperarmR:[8,0,-12],forearmR:[-26,0,0],legL:[-2,0,5],legR:[-2,0,-5]}},
    {t:1.35,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.72,0.2);return{head:[0,0,3.6*e*Math.sin(2*Math.PI*t/0.075)],chest:[1.2*e*Math.sin(2*Math.PI*t/0.06),0,1.6*e*Math.sin(2*Math.PI*t/0.075+0.8)],upperarmR:[0,0,3*e*Math.sin(2*Math.PI*t/0.07+1)],upperarmL:[0,0,2*e*Math.sin(2*Math.PI*t/0.07+2.2)],forearmR:[3*e*Math.sin(2*Math.PI*t/0.065),0,0],...sway(t,T,0.6,10)};}},
  // IRON QUILLS (S33): he balls up tight, then snaps open with his back arched and his arms thrown down and back:
  // the quills leave his back on the snap. A shiver runs out through him afterwards.
  quills:{T:1.05,keys:[
    {t:0,p:{}},
    {t:0.06,p:{spine:[28,0,0],chest:[15,0,0],head:[22,0,0],_hips:[0,-0.11,0.01],upperarmL:[-10,30,8],forearmL:[6,10,0],upperarmR:[-36,30,12],forearmR:[-70,0,0],legL:[-16,0,5],legR:[-16,0,-5],earL:[18,0,0],earR:[18,0,0],tail1:[-26,0,0],tail2:[-12,0,0]}},
    {t:0.10,ease:'in',p:{spine:[-17,0,0],chest:[-15,0,0],head:[-18,0,0],_hips:[0,0.03,-0.01],upperarmL:[34,30,24],forearmL:[22,10,0],upperarmR:[40,0,-40],forearmR:[10,0,0],legL:[2,0,8],legR:[2,0,-8],footL:[10,0,0],footR:[10,0,0],earL:[-20,0,0],earR:[-20,0,0],tail1:[30,0,0],tail2:[16,0,0],tail3:[10,0,0]}},
    {t:0.22,p:{spine:[-14,0,0],chest:[-12,0,0],head:[-14,0,0],_hips:[0,0.01,-0.01],upperarmL:[30,28,22],forearmL:[20,10,0],upperarmR:[36,0,-36],forearmR:[6,0,0],legL:[2,0,8],legR:[2,0,-8],tail1:[18,0,0]}},
    {t:0.45,p:{spine:[-11,0,0],chest:[-9,0,0],head:[-10,0,0],_hips:[0,0.004,0],upperarmL:[24,24,18],forearmL:[16,8,0],upperarmR:[28,0,-28],forearmR:[0,0,0],legL:[1,0,7],legR:[1,0,-7]}},
    {t:0.72,p:{spine:[6,0,0],chest:[2,0,0],head:[2,0,0],_hips:[0,-0.035,0],upperarmL:[2,6,4],upperarmR:[4,0,-8],forearmR:[-14,0,0],legL:[-2,0,4],legR:[-2,0,-4]}},
    {t:1.05,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.3,0.14);return{spine:[0,0,2.4*e*Math.sin(2*Math.PI*t/0.07)],chest:[0,0,2.2*e*Math.sin(2*Math.PI*t/0.07-0.9)],head:[0,0,3*e*Math.sin(2*Math.PI*t/0.07-1.8)],...sway(t,T,0.5,7)};}},
  // IRON BRISTLES (S30): a wet-dog shake. A twist runs up from his hips to his head and out to his ears, hard and fast,
  // and when it stops he stands a size bigger: chest out, elbows out, hackles up.
  bristle:{T:1.1,keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[10,0,0],chest:[4,0,0],head:[8,0,0],_hips:[0,-0.05,0],upperarmR:[0,0,8],legL:[-4,0,4],legR:[-4,0,-4],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.10,ease:'in',p:{spine:[4,0,0],chest:[0,0,0],head:[2,0,0],_hips:[0,-0.03,0],upperarmL:[4,10,10],upperarmR:[6,0,-18],forearmR:[-10,0,0],legL:[-2,0,6],legR:[-2,0,-6]}},
    {t:0.46,p:{spine:[2,0,0],chest:[-2,0,0],head:[-2,0,0],_hips:[0,-0.025,0],upperarmL:[6,12,12],upperarmR:[8,0,-22],forearmR:[-12,0,0],legL:[-2,0,7],legR:[-2,0,-7]}},
    {t:0.56,ease:'in',p:{spine:[-9,0,0],chest:[-9,0,0],head:[-8,0,0],_hips:[0,0.02,0],upperarmL:[10,22,20],forearmL:[6,6,0],upperarmR:[12,0,-36],forearmR:[-34,0,0],legL:[0,0,8],legR:[0,0,-8],earL:[-14,0,0],earR:[-14,0,0],tail1:[18,0,0]}},
    {t:0.82,p:{spine:[-6,0,0],chest:[-6,0,0],head:[-5,0,0],_hips:[0,0.006,0],upperarmL:[8,18,16],forearmL:[4,4,0],upperarmR:[10,0,-28],forearmR:[-28,0,0],legL:[0,0,7],legR:[0,0,-7]}},
    {t:1.1,p:{}},
  ],fn:(t,T)=>{const e=win(t,0.08,0.5,0.07),hz=10.5,w=(ph)=>e*Math.sin(2*Math.PI*hz*(t-0.08)-ph);return{hips:[0,5*w(0),0],spine:[0,9*w(0.7),3*w(0.7)],chest:[0,12*w(1.4),4*w(1.4)],head:[0,16*w(2.2),9*w(2.2)],upperarmR:[0,0,6*w(1.9)],upperarmL:[0,0,3*w(1.9)],forearmR:[5*w(2.6),0,0],tail1:[0,14*w(-0.6),0],tail2:[0,18*w(-1.3),0],tail3:[0,22*w(-2.0),0]};}},
  // STONEHEART (S53): one hard thump of the fist on his chest, and he drops into a wide stance and goes still as stone:
  // no sway, no breath, until it lets go of him.
  stoneheart:{T:1.2,nolag:true,
    offHand:{from:0.0,to:0.86,fade:0.06,keys:[{t:0,p:[-0.30,0.44,0.16]},{t:0.05,p:[-0.38,0.66,0.3]},{t:0.10,p:[-0.02,0.55,0.25],ease:'in'},{t:0.16,p:[-0.03,0.53,0.25]},{t:0.8,p:[-0.03,0.53,0.25]},{t:0.86,p:[-0.2,0.48,0.24]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-8,-6,0],chest:[-6,-10,0],head:[-6,6,0],_hips:[0,0.025,0],footL:[10,0,0],footR:[10,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.10,ease:'in',p:{spine:[6,0,0],chest:[4,4,0],head:[10,0,0],_hips:[0,-0.085,0],legL:[-6,0,12],legR:[-6,0,-12],upperarmL:[-6,10,6],earL:[16,0,0],earR:[16,0,0],tail1:[-16,0,0]}},
    {t:0.17,p:{spine:[4,0,0],chest:[2,4,0],head:[6,0,0],_hips:[0,-0.07,0],legL:[-5,0,12],legR:[-5,0,-12],upperarmL:[-6,10,6]}},
    {t:0.80,p:{spine:[4,0,0],chest:[2,4,0],head:[6,0,0],_hips:[0,-0.07,0],legL:[-5,0,12],legR:[-5,0,-12],upperarmL:[-6,10,6]}},
    {t:1.2,p:{}},
  ]},
};
// ---------------------------------------------------------------- batch 2: the ground skills
const PLA={upperarmL:[-36,-30,0],forearmL:[12,-18,0],upperarmR:[-38,26,-24],forearmR:[-24,0,0]};  // the slab's lower edge planted at his feet, both paws on it
const REST_G=[0.24,0.44,0.22];
const trem=(t,a,b,hz,amp,ph=0)=>win(t,a,b,0.08)*amp*Math.sin(2*Math.PI*hz*t+ph);
Object.assign(CLIPS,{
  // GROWLSTONE (S18): a stamp wakes the ground, then he hauls the stone up out of it with the free paw, slow and heavy,
  // the paw shaking with the weight; when it stands he lets the arm fall.
  summonStone:{T:1.5,
    offHand:{from:0.15,to:1.0,fade:0.1,keys:[{t:0.15,p:[-0.30,0.34,0.22]},{t:0.24,p:[-0.30,0.30,0.30]},{t:0.56,p:[-0.24,0.88,0.24]},{t:0.76,p:[-0.24,0.84,0.24]},{t:1.0,p:[-0.3,0.44,0.18]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-8,0,-3],chest:[-6,0,0],head:[-8,0,0],_hips:[0.012,0.03,0],legR:[-30,0,-6],footR:[14,0,0],upperarmR:[-24,0,-46],forearmR:[-64,0,0],earL:[-10,0,0],earR:[-10,0,0],tail1:[14,0,0]}},
    {t:0.10,ease:'in',p:{spine:[15,0,2],chest:[6,0,0],head:[11,0,0],_hips:[-0.01,-0.085,0.02],legR:[-10,0,-10],legL:[2,0,8],upperarmR:[12,0,8],forearmR:[-8,0,0],upperarmL:[-8,10,4],earL:[18,0,0],earR:[18,0,0],tail1:[-20,0,0]}},
    {t:0.18,p:{spine:[12,0,0],chest:[5,0,0],head:[8,0,0],_hips:[0,-0.066,0.02],legR:[-9,0,-10],legL:[2,0,8],upperarmL:[-8,10,4]}},
    {t:0.26,p:{spine:[16,0,0],chest:[6,0,0],head:[2,0,0],_hips:[0,-0.08,0.03],legR:[-10,0,-10],legL:[0,0,8],upperarmL:[-10,10,4]}},
    {t:0.56,p:{spine:[-12,4,0],chest:[-10,6,0],head:[-20,-4,0],_hips:[0,0.03,0],legL:[0,0,7],legR:[0,0,-7],footL:[10,0,0],footR:[10,0,0],upperarmL:[6,14,8],earL:[-14,0,0],earR:[-14,0,0],tail1:[16,0,0]}},
    {t:0.76,p:{spine:[-9,4,0],chest:[-8,6,0],head:[-16,-4,0],_hips:[0,0.012,0],legL:[0,0,7],legR:[0,0,-7],upperarmL:[4,12,6]}},
    {t:1.0,p:{spine:[9,0,0],chest:[3,0,0],head:[2,0,0],_hips:[0,-0.045,0],legL:[-4,0,4],legR:[-4,0,-4]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>({chest:[0,0,trem(t,0.26,0.74,13,1.3)],head:[0,0,trem(t,0.26,0.74,13,1.6,1)],spine:[trem(t,0.26,0.6,11,1.0),0,0],...sway(t,T,0.75,8)})},
  // STONE CUBS (S46): he knocks the slab's lower edge on the ground twice, like knocking on a door, then looks to each side
  // and waves them up with the free paw.
  callCubs:{T:1.35,
    staffPose:{from:0.0,to:0.98,fade:0.05,keys:[{t:0,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.05,p:[0.25,0.5,0.23],d:[0.08,1,0.04],n:[0,0,1]},{t:0.10,p:[0.26,0.3,0.28],d:[0.05,1,0.06],n:[0,0,1],ease:'in'},{t:0.16,p:[0.26,0.335,0.27],d:[0.05,1,0.05],n:[0,0,1]},{t:0.24,p:[0.25,0.5,0.23],d:[0.08,1,0.04],n:[0,0,1]},{t:0.30,p:[0.26,0.3,0.28],d:[0.05,1,0.06],n:[0,0,1],ease:'in'},{t:0.38,p:[0.26,0.325,0.27],d:[0.05,1,0.05],n:[0,0,1]},{t:0.66,p:[0.26,0.31,0.27],d:[0.05,1,0.05],n:[0,0,1]},{t:0.98,p:REST_G,d:[0.1,1,0],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-5,0,0],chest:[-3,0,0],head:[4,0,0],_hips:[0,0.016,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.10,ease:'in',p:{spine:[11,5,0],chest:[5,7,0],head:[13,4,0],_hips:[0,-0.062,0.01],legL:[-5,0,6],legR:[-5,0,-6],upperarmR:[6,0,-8],forearmR:[-14,0,0],earL:[14,0,0],earR:[14,0,0],tail1:[-12,0,0]}},
    {t:0.16,p:{spine:[9,5,0],chest:[4,7,0],head:[10,4,0],_hips:[0,-0.046,0.01],legL:[-4,0,6],legR:[-4,0,-6],upperarmR:[6,0,-8],forearmR:[-14,0,0]}},
    {t:0.24,p:{spine:[1,2,0],chest:[0,3,0],head:[5,2,0],_hips:[0,-0.008,0],legL:[-2,0,6],legR:[-2,0,-6],upperarmR:[4,0,-10],forearmR:[-18,0,0]}},
    {t:0.30,ease:'in',p:{spine:[13,5,0],chest:[6,7,0],head:[15,4,0],_hips:[0,-0.072,0.01],legL:[-6,0,7],legR:[-6,0,-7],upperarmR:[8,0,-10],forearmR:[-16,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[-14,0,0]}},
    {t:0.38,p:{spine:[11,5,0],chest:[5,7,0],head:[12,6,0],_hips:[0,-0.056,0.01],legL:[-5,0,7],legR:[-5,0,-7],upperarmR:[8,0,-10],forearmR:[-16,0,0]}},
    {t:0.52,p:{spine:[8,8,0],chest:[4,12,0],head:[8,34,0],_hips:[0.008,-0.05,0.01],legL:[-4,0,7],legR:[-4,0,-7],upperarmR:[-20,0,-24],forearmR:[-50,0,0]}},
    {t:0.78,p:{spine:[7,-6,0],chest:[3,-12,0],head:[8,-36,0],_hips:[-0.008,-0.045,0.01],legL:[-4,0,7],legR:[-4,0,-7],upperarmR:[-28,0,-34],forearmR:[-60,0,0]}},
    {t:1.0,p:{spine:[5,0,0],chest:[2,0,0],head:[2,0,0],_hips:[0,-0.025,0],legL:[-2,0,4],legR:[-2,0,-4],upperarmR:[-6,0,-10],forearmR:[-20,0,0]}},
    {t:1.35,p:{}},
  ],fn:(t,T)=>({forearmR:[trem(t,0.46,0.92,4.4,22),0,0],handR:[trem(t,0.46,0.92,4.4,16,-0.8),0,0],...sway(t,T,0.6,9)})},
  // IRON BRIAR (S32): a sower's backhand. The free paw is cocked across his chest, the hips turn, and the paw flings the
  // briar out low and wide; the slab swings back the other way as the counterweight.
  scatter:{T:1.15,mech:true,
    offHand:{from:0.0,to:0.7,fade:0.05,keys:[{t:0,p:[-0.30,0.44,0.16]},{t:0.055,p:[0.10,0.60,0.24]},{t:0.10,p:[-0.14,0.60,0.44],ease:'in'},{t:0.19,p:[-0.52,0.58,0.16]},{t:0.4,p:[-0.5,0.54,0.12]},{t:0.7,p:[-0.3,0.44,0.16]}]},
    keys:[
    {t:0,p:{}},
    {t:0.055,p:{spine:[4,10,0],chest:[2,24,0],head:[2,-22,0],_hips:[0.018,-0.04,-0.02],legL:[6,0,4],legR:[-4,0,-4],upperarmL:[-6,-14,0],earL:[-8,0,0],earR:[-8,0,0],tail1:[0,14,0]}},
    {t:0.10,ease:'in',p:{spine:[8,-8,0],chest:[4,-20,0],head:[-2,16,0],_hips:[-0.012,-0.06,0.05],legL:[10,0,5],legR:[-14,0,-6],footL:[12,0,0],upperarmL:[4,16,8],forearmL:[0,8,0],earL:[12,0,0],earR:[12,0,0]}},
    {t:0.19,p:{spine:[8,-14,0],chest:[4,-36,0],head:[-2,30,0],_hips:[-0.016,-0.064,0.05],legL:[10,0,5],legR:[-13,0,-6],footL:[9,0,0],upperarmL:[6,24,10],forearmL:[0,10,0]}},
    {t:0.40,p:{spine:[7,-12,0],chest:[3,-30,0],head:[-2,26,0],_hips:[-0.014,-0.055,0.045],legL:[9,0,5],legR:[-12,0,-6],upperarmL:[5,20,8],forearmL:[0,8,0]}},
    {t:0.72,p:{spine:[4,-3,0],chest:[1,-8,0],head:[0,6,0],_hips:[0,-0.03,0.015],legL:[3,0,3],legR:[-4,0,-3]}},
    {t:1.15,p:{}},
  ],fn:(t,T)=>sway(t,T,0.9,10)},
  // FAULT LINE (S23): the long load. The slab goes up in the first tenth of a second (the line shows on the floor as he sights
  // down it), he hangs there on his toes with the weight straining him, a short hop, and at half a second the lower edge
  // splits the ground. He stays down on it while the crack runs.
  faultLine:{T:1.75,nolag:true,twoHand:TH(0.46,1.3),free:[[0.36,0.47]],keys:[
    {t:0,p:{}},
    {t:0.10,ease:'out',p:{spine:[-14,0,0],chest:[-10,0,0],head:[-6,0,0],...OVER,_hips:[0,0.04,-0.01],legL:[5,0,0],legR:[5,0,0],footL:[16,0,0],footR:[16,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[12,0,0]}},
    {t:0.30,p:{spine:[-20,0,0],chest:[-13,0,0],head:[-4,0,0],...OVER,upperarmL:[-158,-12,-8],upperarmR:[-158,0,-30],_hips:[0,0.052,-0.03],legL:[8,0,0],legR:[8,0,0],footL:[22,0,0],footR:[22,0,0],tail1:[18,0,0]}},
    {t:0.40,p:{spine:[-22,0,0],chest:[-14,0,0],head:[-10,0,0],...OVER,upperarmL:[-160,-12,-8],upperarmR:[-160,0,-30],_hips:[0,0.115,0.03],legL:[-20,0,0],legR:[-12,0,0],footL:[10,0,0],footR:[22,0,0]}},
    {t:0.50,ease:'in',p:{spine:[32,0,0],chest:[14,0,0],head:[-20,0,0],...SLAM,_hips:[0,-0.10,0.10],legL:[-30,0,6],legR:[16,0,-6],footR:[20,0,0],earL:[20,0,0],earR:[20,0,0],tail1:[26,0,0],tail2:[12,0,0]}},
    {t:0.62,p:{spine:[27,0,0],chest:[12,0,0],head:[-16,0,0],...SLAM,_hips:[0,-0.08,0.10],legL:[-27,0,6],legR:[15,0,-6],footR:[18,0,0]}},
    {t:1.2,p:{spine:[24,0,0],chest:[10,0,0],head:[-13,0,0],...SLAM,_hips:[0,-0.07,0.09],legL:[-24,0,6],legR:[13,0,-6],footR:[14,0,0]}},
    {t:1.75,p:{}},
  ],fn:(t,T)=>({upperarmL:[0,0,trem(t,0.12,0.38,12,1.6)],upperarmR:[0,0,trem(t,0.12,0.38,12,1.6,2)],chest:[0,0,trem(t,0.12,0.38,12,0.8,1)+2.2*bump(t,0.55,0.05)*Math.sin(2*Math.PI*t/0.05)],head:[0,0,3*bump(t,0.56,0.06)*Math.sin(2*Math.PI*t/0.05)],...sway(t,T,0.9,6)})},
  // HEAVY SLAM (S26): the long wind-up (0.30 s, Kesh's yes 18 Nov). He heaves the slab up over his head and strains on his
  // toes, hops, and belly-flops behind it: he throws himself forward and down with the slab
  // face-first under him, flat on the ground, both paws and all his weight on it. He has to push himself back up.
  heavySlam:{T:1.5,nolag:true,free:[[0.19,0.29]],
    offHand:{from:0.22,to:1.04,fade:0.05,keys:[{t:0.22,p:[-0.2,0.8,0.2]},{t:0.30,p:[-0.13,0.13,0.44],ease:'in'},{t:0.8,p:[-0.13,0.13,0.44]},{t:1.04,p:[-0.3,0.44,0.18]}]},
    staffPose:{from:0.2,to:1.06,fade:0.07,keys:[{t:0.2,p:[0.16,0.78,0.22],d:[0,1,0.1],n:[0,-0.1,1]},{t:0.25,p:[0.17,0.6,0.36],d:[0,0.8,0.6],n:[0,-0.6,0.8]},{t:0.30,p:[0.14,0.13,0.5],d:[0,0.12,1],n:[0,-1,0.1],ease:'in'},{t:0.8,p:[0.14,0.13,0.5],d:[0,0.12,1],n:[0,-1,0.1]},{t:1.06,p:[0.24,0.42,0.26],d:[0.08,1,0.1],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.12,ease:'out',p:{spine:[-14,0,0],chest:[-10,0,0],head:[-6,0,0],...OVER,_hips:[0,0.03,-0.035],legL:[7,0,0],legR:[7,0,0],footL:[14,0,0],footR:[14,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[14,0,0]}},
    {t:0.21,p:{spine:[-21,0,0],chest:[-14,0,0],head:[-8,0,0],...OVER,upperarmL:[-160,-12,-8],upperarmR:[-160,0,-30],_hips:[0,0.085,-0.02],legL:[-16,0,3],legR:[-14,0,-3],footL:[18,0,0],footR:[18,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[18,0,0]}},
    {t:0.30,ease:'in',p:{hips:[18,0,0],spine:[34,0,0],chest:[16,0,0],head:[-30,0,0],_hips:[0,-0.125,0.12],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-36,0,7],legR:[10,0,-7],footL:[10,0,0],footR:[28,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[30,0,0],tail2:[14,0,0]}},
    {t:0.38,p:{hips:[15,0,0],spine:[30,0,0],chest:[14,0,0],head:[-25,0,0],_hips:[0,-0.105,0.12],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-33,0,7],legR:[9,0,-7],footL:[10,0,0],footR:[24,0,0]}},
    {t:0.78,p:{hips:[14,0,0],spine:[28,0,0],chest:[13,0,0],head:[-22,0,0],_hips:[0,-0.098,0.115],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-31,0,7],legR:[9,0,-7],footL:[10,0,0],footR:[22,0,0]}},
    {t:1.08,p:{spine:[14,0,0],chest:[5,0,0],head:[-6,0,0],_hips:[0,-0.055,0.04],legL:[-14,0,4],legR:[6,0,-4]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>({upperarmL:[0,0,trem(t,0.1,0.22,12,1.5)],upperarmR:[0,0,trem(t,0.1,0.22,12,1.5,2)],chest:[0,0,trem(t,0.1,0.22,12,0.7,1)+2.4*bump(t,0.35,0.05)*Math.sin(2*Math.PI*t/0.05)],head:[0,0,3.2*bump(t,0.36,0.06)*Math.sin(2*Math.PI*t/0.05)],...sway(t,T,0.8,6)})},
  // LANDSLIDE (S19): he reaches out, digs the slab's edge in as far forward as he can, and hauls the ground back toward him,
  // leaning away with everything he has; when it comes he rocks back on his heels and has to catch himself.
  haul:{T:1.4,nolag:true,twoHand:TH(0.07,0.8),
    staffPose:{from:0.04,to:0.9,fade:0.05,keys:[{t:0.04,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.10,p:[0.12,0.31,0.56],d:[0,0.85,-0.5],n:[0,0.4,1],ease:'in'},{t:0.17,p:[0.12,0.3,0.55],d:[0,0.85,-0.5],n:[0,0.4,1]},{t:0.48,p:[0.14,0.35,0.24],d:[0,0.92,-0.36],n:[0,0.3,1],ease:'in'},{t:0.62,p:[0.16,0.43,0.21],d:[0,1,-0.14],n:[0,0.1,1]},{t:0.9,p:REST_G,d:[0.1,1,0],n:[0,0,1]}]},keys:[
    {t:0,p:{}},
    {t:0.045,p:{spine:[-4,6,0],chest:[-3,10,0],head:[2,-8,0],_hips:[0,-0.03,-0.03],upperarmL:[8,12,0],forearmL:[-14,0,0],legL:[8,0,0],legR:[-4,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.10,ease:'in',p:{spine:[24,-4,0],chest:[11,-8,0],head:[-16,8,0],upperarmL:[-70,-24,0],forearmL:[50,-12,0],upperarmR:[-40,22,-16],forearmR:[-30,0,0],_hips:[0,-0.075,0.12],legL:[-28,0,3],legR:[20,0,-3],footR:[22,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[20,0,0]}},
    {t:0.17,p:{spine:[22,-4,0],chest:[10,-8,0],head:[-14,8,0],upperarmL:[-68,-24,0],forearmL:[48,-12,0],upperarmR:[-40,22,-16],forearmR:[-30,0,0],_hips:[0,-0.085,0.115],legL:[-27,0,3],legR:[19,0,-3],footR:[20,0,0]}},
    {t:0.48,ease:'in',p:{spine:[-7,4,0],chest:[-6,6,0],head:[8,-4,0],...BRACE,_hips:[0,-0.085,-0.05],legL:[14,0,5],legR:[-9,0,-5],earL:[-16,0,0],earR:[-16,0,0],tail1:[14,0,0]}},
    {t:0.62,p:{spine:[-12,4,0],chest:[-9,6,0],head:[5,-4,0],...BRACE,_hips:[0,-0.06,-0.07],legL:[16,0,5],legR:[-8,0,-5],tail1:[10,0,0]}},
    {t:0.84,p:{spine:[8,0,0],chest:[3,0,0],head:[-2,0,0],upperarmL:[-12,-8,0],forearmL:[4,-4,0],upperarmR:[-10,8,-6],forearmR:[-16,0,0],_hips:[0,-0.055,-0.03],legL:[6,0,3],legR:[-4,0,-3]}},
    {t:1.4,p:{}},
  ],fn:(t,T)=>({chest:[0,0,trem(t,0.18,0.46,14,1.5)],head:[0,0,trem(t,0.18,0.46,14,1.8,1.2)],spine:[trem(t,0.18,0.46,12,1.1),0,0],...sway(t,T,0.9,7)})},
  // STONE RING (S44): a short stab. The slab's edge goes into the floor at his feet like a key, he drops behind it,
  // and he watches the stones come up round him, left then right, before he pulls it free.
  plant:{T:1.5,nolag:true,twoHand:TH(0.07,1.1),keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-9,0,0],chest:[-6,0,0],head:[-4,0,0],_hips:[0,0.035,0],...PLA,footL:[14,0,0],footR:[14,0,0],earL:[-10,0,0],earR:[-10,0,0],tail1:[12,0,0]}},
    {t:0.10,ease:'in',p:{spine:[27,0,0],chest:[10,0,0],head:[-14,0,0],...PLA,_hips:[0,-0.10,0.04],legL:[-23,0,8],legR:[12,0,-8],earL:[16,0,0],earR:[16,0,0],tail1:[-18,0,0]}},
    {t:0.20,p:{spine:[22,0,0],chest:[8,0,0],head:[-11,0,0],...PLA,_hips:[0,-0.078,0.04],legL:[-20,0,8],legR:[11,0,-8]}},
    {t:0.46,p:{spine:[20,4,0],chest:[7,6,0],head:[-14,34,0],...PLA,_hips:[0,-0.072,0.04],legL:[-19,0,8],legR:[10,0,-8]}},
    {t:0.82,p:{spine:[20,-4,0],chest:[7,-6,0],head:[-14,-34,0],...PLA,_hips:[0,-0.07,0.04],legL:[-18,0,8],legR:[10,0,-8]}},
    {t:1.06,p:{spine:[18,0,0],chest:[6,0,0],head:[-8,0,0],...PLA,_hips:[0,-0.066,0.04],legL:[-17,0,8],legR:[9,0,-8]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>({chest:[0,0,2*bump(t,0.15,0.05)*Math.sin(2*Math.PI*t/0.05)],...sway(t,T,0.75,5)})},
  // GRINDSTONE (S49): he drags the slab's edge round him across the floor, left to right, low, the whole trunk turning with it:
  // the sweep that starts the stone turning. It ends with the slab swung wide and the fist out the other side.
  grind:{T:1.3,mech:true,
    staffPose:{from:0.01,to:0.8,fade:0.04,keys:[{t:0.01,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.05,p:[0.46,0.33,0.04],d:[0.3,1,0],n:[1,0,0.3]},{t:0.10,p:[0.14,0.31,0.5],d:[0.05,1,-0.2],n:[0.15,0,1],ease:'in'},{t:0.19,p:[-0.02,0.33,0.5],d:[-0.12,1,-0.14],n:[-0.6,0,1]},{t:0.34,p:[-0.04,0.36,0.48],d:[-0.14,1,-0.1],n:[-0.7,0,1]},{t:0.8,p:REST_G,d:[0.1,1,0],n:[0,0,1]}]},keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[8,14,0],chest:[3,28,0],head:[0,-30,0],upperarmL:[-22,44,18],forearmL:[26,12,0],upperarmR:[0,0,-14],forearmR:[-20,0,0],_hips:[0.014,-0.08,-0.02],legL:[4,0,8],legR:[-6,0,-8],earL:[0,0,-10],earR:[0,0,-10]}},
    {t:0.10,ease:'in',p:{spine:[18,-4,0],chest:[9,-8,0],head:[-8,8,0],upperarmL:[-50,-6,6],forearmL:[40,-6,0],upperarmR:[10,0,-28],forearmR:[-14,0,0],_hips:[0,-0.11,0.03],legL:[-4,0,9],legR:[-4,0,-9]}},
    {t:0.19,p:{spine:[13,-20,0],chest:[6,-44,0],head:[-4,42,0],upperarmL:[-62,-40,0],forearmL:[44,-14,0],upperarmR:[20,0,-46],forearmR:[-8,0,0],_hips:[-0.014,-0.09,0.04],legR:[-14,0,-8],legL:[8,0,8],footL:[12,0,0],earL:[0,0,14],earR:[0,0,14]}},
    {t:0.34,p:{spine:[11,-23,0],chest:[5,-50,0],head:[-3,46,0],upperarmL:[-58,-44,0],forearmL:[42,-14,0],upperarmR:[18,0,-42],forearmR:[-8,0,0],_hips:[-0.016,-0.078,0.04],legR:[-13,0,-8],legL:[8,0,8],footL:[9,0,0]}},
    {t:0.7,p:{spine:[8,-14,0],chest:[4,-30,0],head:[-2,28,0],upperarmL:[-44,-30,0],forearmL:[32,-10,0],upperarmR:[12,0,-28],forearmR:[-10,0,0],_hips:[-0.01,-0.055,0.03],legR:[-9,0,-6],legL:[6,0,6]}},
    {t:1.3,p:{}},
  ],fn:(t,T)=>sway(t,T,1.3,12)},
});
// ---------------------------------------------------------------- batch 3: throws, leaps, the dig and the rest
const GD=[0,1,-0.04], GN=[0,0,1];
const BRP={spine:[9,0,0],chest:[3,0,0],head:[-3,0,0],_hips:[0,-0.058,0.02],...BRACE,legL:[-12,0,6],legR:[9,0,-6]};  // the guard's held pose
const asym=(t,c,wi,wo)=>Math.exp(-(((t-c)/(t<c?wi:wo))**2));          // fast in, slow out
const stp=(t,c,a=0.09,b=0.03)=>sm(c-a,c+b,t);
Object.assign(CLIPS,{
  // ROCK TOSS (S17): he dips, scoops a rock off the floor beside his right foot, and lobs it underarm; the paw carries on up
  // past his ear and his weight goes onto the front foot after it.
  toss:{T:1.0,
    offHand:{from:0.0,to:0.72,fade:0.05,keys:[{t:0,p:[-0.30,0.44,0.16]},{t:0.05,p:[-0.36,0.2,-0.08]},{t:0.10,p:[-0.24,0.5,0.4],ease:'in'},{t:0.18,p:[-0.2,0.84,0.34]},{t:0.4,p:[-0.22,0.76,0.3]},{t:0.72,p:[-0.3,0.44,0.16]}]},
    keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[24,-12,0],chest:[9,-16,0],head:[-14,14,0],_hips:[-0.012,-0.105,-0.02],legR:[-10,0,-4],legL:[6,0,4],upperarmL:[-8,-8,0],earL:[14,0,0],earR:[14,0,0],tail1:[18,0,0]}},
    {t:0.10,ease:'in',p:{spine:[4,8,0],chest:[-1,14,0],head:[-8,-8,0],_hips:[0.008,-0.03,0.05],legR:[14,0,-3],legL:[-16,0,3],footR:[18,0,0],upperarmL:[4,10,4],earL:[-10,0,0],earR:[-10,0,0],tail1:[-14,0,0]}},
    {t:0.18,p:{spine:[-8,10,0],chest:[-6,17,0],head:[-13,-10,0],_hips:[0.01,0.02,0.065],legR:[16,0,-3],legL:[-17,0,3],footR:[24,0,0],upperarmL:[6,14,6]}},
    {t:0.4,p:{spine:[-4,8,0],chest:[-4,13,0],head:[-9,-8,0],_hips:[0.008,-0.012,0.055],legR:[13,0,-3],legL:[-15,0,3],footR:[14,0,0],upperarmL:[4,10,4]}},
    {t:0.72,p:{spine:[4,2,0],chest:[0,3,0],head:[-2,-2,0],_hips:[0,-0.03,0.02],legR:[4,0,-2],legL:[-5,0,2]}},
    {t:1.0,p:{}},
  ],fn:(t,T)=>sway(t,T,0.8,9)},
  // SLAB THROW (S47): a discus throw. He coils to his left with the slab drawn back, the hips turn first, and the slab leaves
  // flat off the end of a straight arm; the empty arm carries on across him and the fist goes out behind for balance.
  throw:{T:0.95,mech:true,
    staffPose:{from:0.0,to:0.22,fade:0.045,keys:[{t:0,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.055,p:[0.44,0.5,-0.24],d:[0.6,0.1,-1],n:[0.1,1,0.2]},{t:0.10,p:[0.02,0.56,0.54],d:[-0.1,0.05,1],n:[0,1,-0.1],ease:'in'},{t:0.22,p:[-0.2,0.6,0.44],d:[-0.6,0.05,1],n:[0,1,0]}]},keys:[
    {t:0,p:{}},
    {t:0.055,p:{spine:[6,26,0],chest:[4,30,0],head:[0,-30,0],_hips:[0.012,-0.06,-0.03],upperarmL:[-50,-60,10],forearmL:[-30,0,0],upperarmR:[-10,0,-10],forearmR:[-30,0,0],legL:[8,0,4],legR:[-6,0,-4],earL:[0,0,-10],earR:[0,0,-10]}},
    {t:0.10,ease:'in',p:{spine:[5,-28,0],chest:[2,-34,0],head:[0,28,0],_hips:[-0.01,-0.04,0.055],upperarmL:[-80,60,30],forearmL:[-4,0,0],upperarmR:[20,0,-34],forearmR:[-16,0,0],legL:[12,0,4],legR:[-16,0,-4],footL:[16,0,0],earL:[0,0,14],earR:[0,0,14]}},
    {t:0.20,p:{spine:[7,-32,0],chest:[3,-44,0],head:[0,36,0],_hips:[-0.014,-0.05,0.06],upperarmL:[-64,74,34],forearmL:[-10,0,0],upperarmR:[26,0,-42],forearmR:[-14,0,0],legL:[12,0,4],legR:[-15,0,-4],footL:[12,0,0]}},
    {t:0.46,p:{spine:[6,-22,0],chest:[2,-30,0],head:[0,24,0],_hips:[-0.01,-0.042,0.05],upperarmL:[-44,50,24],forearmL:[-8,0,0],upperarmR:[16,0,-28],forearmR:[-14,0,0],legL:[10,0,4],legR:[-12,0,-4]}},
    {t:0.95,p:{}},
  ],fn:(t,T)=>sway(t,T,0.95,11)},
  // THE CATCH (the slab comes back): it slaps into his paw and its weight turns him and sinks him onto his back foot;
  // he pushes back up and hitches it into place on his arm.
  catch:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.05,ease:'out',p:{spine:[-6,14,0],chest:[-4,20,0],head:[5,-14,0],_hips:[0.012,-0.05,-0.05],upperarmL:[10,24,8],forearmL:[-14,6,0],upperarmR:[-10,0,-20],forearmR:[-26,0,0],legL:[10,0,4],legR:[-6,0,-4],earL:[18,0,0],earR:[18,0,0],tail1:[14,0,0]}},
    {t:0.17,p:{spine:[-2,17,0],chest:[-2,23,0],head:[3,-16,0],_hips:[0.014,-0.07,-0.06],upperarmL:[14,26,8],forearmL:[-16,6,0],upperarmR:[-6,0,-14],forearmR:[-20,0,0],legL:[11,0,4],legR:[-6,0,-4]}},
    {t:0.38,p:{spine:[7,3,0],chest:[2,4,0],head:[-2,-3,0],_hips:[0,-0.034,-0.01],upperarmL:[2,4,0],legL:[3,0,2],legR:[-2,0,-2]}},
    {t:0.5,p:{spine:[-2,0,0],chest:[-2,0,0],head:[2,0,0],_hips:[0,0.008,0],upperarmL:[-12,0,0],forearmL:[-7,0,0]}},
    {t:0.8,p:{}},
  ],fn:(t,T)=>sway(t,T,0.8,8)},
  // BURROW, DOWN (S24): right claw, left claw, and he goes in head first with his legs kicking.
  digDown:{T:0.3,nolag:true,plant:false,keys:[
    {t:0,p:{}},
    {t:0.04,p:{spine:[8,0,0],chest:[5,0,0],head:[6,0,0],_hips:[0,-0.05,0],upperarmR:[-110,0,-14],forearmR:[-30,0,0],upperarmL:[-30,0,8],legL:[-10,0,6],legR:[-10,0,-6],earL:[16,0,0],earR:[16,0,0]}},
    {t:0.09,ease:'in',p:{hips:[14,0,0],spine:[20,-8,0],chest:[10,-8,0],head:[-6,8,0],_hips:[0,-0.10,0.04],upperarmR:[-50,0,-10],forearmR:[20,0,0],upperarmL:[-100,0,16],forearmL:[10,0,0],legL:[-22,0,6],legR:[-22,0,-6],footL:[14,0,0],footR:[14,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[16,0,0]}},
    {t:0.15,ease:'in',p:{hips:[30,0,0],spine:[28,8,0],chest:[14,8,0],head:[-10,-8,0],_hips:[0,-0.12,0.08],upperarmL:[-60,0,18],forearmL:[36,0,0],upperarmR:[-110,0,-18],forearmR:[30,0,0],legL:[-30,0,6],legR:[-24,0,-6],footL:[30,0,0],footR:[30,0,0],earL:[28,0,0],earR:[28,0,0],tail1:[30,0,0]}},
    {t:0.22,p:{hips:[40,0,0],spine:[32,0,0],chest:[16,0,0],head:[-14,0,0],_hips:[0,-0.14,0.1],upperarmL:[-120,0,22],upperarmR:[-120,0,-22],forearmL:[40,0,0],forearmR:[40,0,0],legL:[-10,0,6],legR:[-40,0,-6],footL:[34,0,0],footR:[34,0,0],earL:[30,0,0],earR:[30,0,0],tail1:[36,0,0]}},
    {t:0.3,p:{hips:[44,0,0],spine:[32,0,0],chest:[16,0,0],head:[-14,0,0],_hips:[0,-0.14,0.1],upperarmL:[-120,0,22],upperarmR:[-120,0,-22],forearmL:[40,0,0],forearmR:[40,0,0],legL:[-40,0,6],legR:[-10,0,-6],footL:[34,0,0],footR:[34,0,0],earL:[30,0,0],earR:[30,0,0],tail1:[36,0,0]}},
  ]},
  // BURROW, UP: he comes out of the floor paws first with his back arched, hangs, lands heavily, shakes the dirt off
  // like a wet dog, and rises.
  digUp:{T:1.05,free:[[0,0.26]],keys:[
    {t:0,p:{spine:[-10,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,-0.04,0],upperarmL:[-150,0,10],upperarmR:[-150,0,-10],forearmL:[-10,0,0],forearmR:[-10,0,0],legL:[-10,0,0],legR:[-10,0,0],earL:[-20,0,0],earR:[-20,0,0]}},
    {t:0.12,ease:'out',p:{spine:[-20,0,0],chest:[-14,0,0],head:[-28,0,0],_hips:[0,0.04,0],upperarmL:[12,50,40],upperarmR:[12,0,-72],forearmL:[12,12,0],forearmR:[12,0,-12],legL:[14,0,10],legR:[20,0,-10],footL:[30,0,0],footR:[30,0,0],earL:[-24,0,0],earR:[-24,0,0],tail1:[-24,0,0]}},
    {t:0.2,p:{spine:[-10,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,0.03,0],upperarmL:[6,40,34],upperarmR:[6,0,-60],forearmL:[10,10,0],forearmR:[6,0,-10],legL:[-6,0,9],legR:[-2,0,-9],footL:[-4,0,0],footR:[-4,0,0],earL:[-16,0,0],earR:[-16,0,0]}},
    {t:0.28,ease:'in',p:{spine:[26,0,0],chest:[11,0,0],head:[-14,0,0],_hips:[0,-0.115,0.03],upperarmL:[-36,-10,14],upperarmR:[-30,10,-24],forearmL:[18,0,0],forearmR:[-24,0,0],legL:[-28,0,10],legR:[-22,0,-10],footL:[14,0,0],footR:[14,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[22,0,0]}},
    {t:0.40,p:{spine:[20,0,0],chest:[8,0,0],head:[-10,0,0],_hips:[0,-0.085,0.03],upperarmL:[-28,-8,12],upperarmR:[-24,8,-20],forearmL:[14,0,0],forearmR:[-22,0,0],legL:[-22,0,9],legR:[-18,0,-9]}},
    {t:0.76,p:{spine:[12,0,0],chest:[4,0,0],head:[-4,0,0],_hips:[0,-0.05,0.015],upperarmL:[-10,0,8],upperarmR:[-6,0,-14],forearmR:[-16,0,0],legL:[-10,0,6],legR:[-8,0,-6]}},
    {t:1.05,p:{}},
  ],fn:(t,T)=>{const e=win(t,0.4,0.76,0.07),hz=10.5,w=(ph)=>e*Math.sin(2*Math.PI*hz*(t-0.4)-ph);return{hips:[0,3*w(0),0],spine:[0,6*w(0.7),2*w(0.7)],chest:[0,8*w(1.4),3*w(1.4)],head:[0,12*w(2.2),7*w(2.2)],upperarmR:[0,0,4*w(1.9)],tail1:[0,10*w(-0.6),0],tail2:[0,14*w(-1.3),0],tail3:[0,18*w(-2.0),0]};}},
  // BODYGUARD (S22): the hop. A short crouch, he tucks his legs and swings the slab round to the front in the air, and he
  // lands square behind it with both paws on it, squashed low, between his friend and the foe.
  hop:{T:0.98,nolag:true,free:[[0.04,0.43]],twoHand:TH(0.3,0.82),
    staffPose:{from:0.2,to:0.86,fade:0.1,keys:[{t:0.2,p:GP(0),d:GD,n:GN},{t:0.38,p:GP(0),d:GD,n:GN},{t:0.44,p:GP(0.035),d:GD,n:GN,ease:'in'},{t:0.52,p:GP(-0.02),d:GD,n:GN},{t:0.62,p:GP(0),d:GD,n:GN},{t:0.86,p:GP(0),d:GD,n:GN}]},
    keys:[
    {t:0,p:{}},
    {t:0.045,p:{spine:[15,0,0],chest:[6,0,0],head:[-6,0,0],_hips:[0,-0.095,0],legL:[-24,0,4],legR:[-24,0,-4],footL:[18,0,0],footR:[18,0,0],upperarmL:[20,0,10],upperarmR:[24,0,-12],forearmR:[-30,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[-18,0,0]}},
    {t:0.15,ease:'out',p:{spine:[-7,0,0],chest:[-5,0,0],head:[-10,0,0],_hips:[0,0.03,0.02],legL:[30,0,5],legR:[36,0,-5],footL:[36,0,0],footR:[36,0,0],upperarmL:[-30,-10,10],forearmL:[0,-6,0],upperarmR:[-44,0,-30],forearmR:[-30,0,0],earL:[-20,0,0],earR:[-20,0,0],tail1:[24,0,0],tail2:[12,0,0]}},
    {t:0.28,p:{spine:[10,0,0],chest:[4,0,0],head:[-8,0,0],_hips:[0,0.02,0.02],...BRACE,legL:[-38,0,6],legR:[-30,0,-6],footL:[26,0,0],footR:[26,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[10,0,0]}},
    {t:0.38,p:{spine:[8,0,0],chest:[3,0,0],head:[-6,0,0],_hips:[0,0.0,0.02],...BRACE,legL:[-14,0,8],legR:[-8,0,-8],footL:[-8,0,0],footR:[-8,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[26,0,0]}},
    {t:0.44,ease:'in',p:{spine:[27,0,0],chest:[10,0,0],head:[-16,0,0],_hips:[0,-0.135,0.03],...BRACE,legL:[-33,0,10],legR:[-26,0,-10],footL:[20,0,0],footR:[20,0,0],earL:[24,0,0],earR:[24,0,0],tail1:[-24,0,0],tail2:[-12,0,0]}},
    {t:0.56,p:{spine:[19,0,0],chest:[8,0,0],head:[-10,0,0],_hips:[0,-0.095,0.03],...BRACE,legL:[-26,0,9],legR:[-20,0,-9],footL:[14,0,0],footR:[14,0,0]}},
    {t:0.78,p:{spine:[13,0,0],chest:[5,0,0],head:[-6,0,0],_hips:[0,-0.066,0.025],...BRACE,legL:[-16,0,7],legR:[-10,0,-7]}},
    {t:0.98,p:{}},
  ]},
  // MAUL (S27): six blows in two seconds, upper body only (his legs keep walking under it). The slab's edge chops from his
  // left, the claws rake from his right, and each blow's follow-through is the next one's wind-up: the trunk never stops
  // turning, and his weight drops into every contact.
  maul:{T:2.2,plant:false,upper:true,
    offHand:{from:0.04,to:2.14,fade:0.1,keys:[{t:0.08,p:[-0.3,0.5,0.18]},{t:0.39,p:[-0.46,0.68,0.0]},{t:0.54,p:[0.0,0.58,0.5],ease:'in'},{t:0.65,p:[0.2,0.42,0.38]},{t:0.79,p:[-0.24,0.5,0.24]},{t:1.03,p:[-0.46,0.68,0.0]},{t:1.18,p:[0.0,0.58,0.5],ease:'in'},{t:1.29,p:[0.2,0.42,0.38]},{t:1.43,p:[-0.24,0.5,0.24]},{t:1.67,p:[-0.46,0.68,0.0]},{t:1.82,p:[0.0,0.58,0.5],ease:'in'},{t:1.93,p:[0.2,0.42,0.38]},{t:2.07,p:[-0.24,0.5,0.24]}]},keys:[{t:0,p:{}},{t:0.1,p:{spine:[10,0,0],chest:[3,0,0],head:[-6,0,0]}},{t:2.02,p:{spine:[10,0,0],chest:[3,0,0],head:[-6,0,0]}},{t:2.2,p:{}}],
    fn:(t,T)=>{const o={upperarmL:[0,0,0],forearmL:[0,0,0],upperarmR:[0,0,0],forearmR:[0,0,0],chest:[0,0,0],spine:[0,0,0],head:[0,0,0]};
      let Y=sm(0.0,0.11,t)*(1-sm(2.02,2.2,t));   // the trunk's turn: +1 wound to his left, -1 to his right
      for(let i=0;i<6;i++){const c=0.22+i*0.32,L=i%2===0,k=asym(t,c,0.05,0.15),pre=asym(t,c-0.14,0.09,0.06),dip=asym(t,c+0.01,0.04,0.1);
        Y+=(L?-2:2)*stp(t,c)*(1-sm(2.02,2.2,t));
        o.spine[0]+=7*dip; o.chest[0]+=4*dip; o.head[0]+=-5*dip;
        if(L){o.upperarmL[0]+=-64*k+12*pre;o.upperarmL[1]+=-36*k+28*pre;o.forearmL[0]+=30*k-8*pre;o.upperarmR[2]+=-10*k;}
        else{o.upperarmL[1]+=10*k;}}
      o.chest[1]+=30*Y;o.spine[1]+=11*Y;o.head[1]+=-24*Y;o.chest[2]+=-3*Y;const en=sm(0,0.07,t);for(const k in o)o[k]=o[k].map(v=>v*en);return o;}},
  // SAVAGE BITE (S29): he drops onto his haunches, leaps flat with his jaws out and his legs trailing, the head snaps down
  // on the bite at the end of the leap, and he lands on it and worries it side to side.
  bite:{T:0.95,nolag:true,free:[[0.05,0.215]],
    staffPose:{from:0.02,to:0.86,fade:0.05,keys:[{t:0.02,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.055,p:[0.42,0.4,0.02],d:[0.1,1,-0.3],n:[0.6,0,1]},{t:0.12,p:[0.47,0.47,0.2],d:[0.2,0.5,-1],n:[1,0.2,0]},{t:0.16,p:[0.47,0.43,0.26],d:[0.2,0.5,-1],n:[1,0.2,0]},{t:0.22,p:[0.45,0.36,0.22],d:[0.2,0.7,-0.7],n:[1,0.2,0.2]},{t:0.56,p:[0.44,0.37,0.2],d:[0.2,0.8,-0.6],n:[1,0.2,0.3]},{t:0.86,p:REST_G,d:[0.1,1,0],n:[0,0,1]}]},keys:[
    {t:0,p:{}},
    {t:0.055,p:{spine:[15,0,0],chest:[4,0,0],head:[-15,0,0],_hips:[0,-0.095,-0.04],legL:[-18,0,5],legR:[-18,0,-5],footL:[12,0,0],footR:[12,0,0],upperarmL:[18,0,8],upperarmR:[30,0,-14],forearmR:[-40,0,0],earL:[-16,0,0],earR:[-16,0,0],tail1:[-20,0,0]}},
    {t:0.12,ease:'out',p:{hips:[30,0,0],spine:[22,0,0],chest:[8,0,0],head:[-36,0,0],_hips:[0,0.055,0.10],legL:[34,0,4],legR:[40,0,-4],footL:[40,0,0],footR:[40,0,0],upperarmL:[-50,0,16],upperarmR:[-74,0,-22],forearmR:[-10,0,0],earL:[-26,0,0],earR:[-26,0,0],tail1:[22,0,0],tail2:[12,0,0]}},
    {t:0.16,ease:'in',p:{hips:[34,0,0],spine:[26,0,0],chest:[12,0,0],head:[6,0,0],_hips:[0,0.035,0.14],legL:[26,0,4],legR:[34,0,-4],footL:[30,0,0],footR:[30,0,0],upperarmL:[-60,-10,14],upperarmR:[-84,20,-6],forearmR:[-44,0,0],earL:[24,0,0],earR:[24,0,0],tail1:[26,0,0]}},
    {t:0.22,ease:'in',p:{hips:[12,0,0],spine:[25,0,0],chest:[10,0,0],head:[12,0,0],_hips:[0,-0.105,0.12],legL:[-28,0,6],legR:[16,0,-6],footR:[22,0,0],upperarmL:[-44,-10,14],upperarmR:[-60,20,-8],forearmR:[-50,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[-20,0,0]}},
    {t:0.34,p:{hips:[10,0,0],spine:[21,0,0],chest:[8,0,0],head:[14,0,0],_hips:[0,-0.085,0.115],legL:[-25,0,6],legR:[15,0,-6],footR:[18,0,0],upperarmL:[-40,-10,14],upperarmR:[-56,20,-8],forearmR:[-50,0,0]}},
    {t:0.56,p:{hips:[8,0,0],spine:[18,0,0],chest:[7,0,0],head:[8,0,0],_hips:[0,-0.075,0.10],legL:[-22,0,6],legR:[13,0,-6],footR:[14,0,0],upperarmL:[-30,-8,10],upperarmR:[-40,14,-8],forearmR:[-40,0,0]}},
    {t:0.95,p:{}},
  ],fn:(t,T)=>{const e=win(t,0.2,0.54,0.05),w=Math.sin(2*Math.PI*13*(t-0.2));return{head:[0,13*e*w,9*e*w],chest:[0,5*e*Math.sin(2*Math.PI*13*(t-0.2)-0.9),0],spine:[0,3*e*Math.sin(2*Math.PI*13*(t-0.2)-1.6),0],tail1:[0,-10*e*w,0],tail2:[0,-14*e*Math.sin(2*Math.PI*13*(t-0.2)-0.7),0]};}},
  // BADGER TOSS (S55): the long wind-up (the throw leaves at 0.55 s). He goes down and gets the free paw and the slab's arm
  // under it, hoists it up and back over his shoulder, strains under it with his spine arched, and whips it forward off his
  // whole body; the throw folds him over and he has to stand up out of it.
  grab:{T:1.3,
    offHand:{from:0.03,to:0.91,fade:0.06,keys:[{t:0.03,p:[-0.30,0.44,0.16]},{t:0.12,p:[-0.12,0.3,0.5]},{t:0.36,p:[-0.16,0.98,0.06],ease:'out'},{t:0.48,p:[-0.17,0.99,-0.04]},{t:0.55,p:[-0.18,0.76,0.46],ease:'in'},{t:0.65,p:[-0.22,0.4,0.52]},{t:0.91,p:[-0.3,0.42,0.3]}]},
    keys:[
    {t:0,p:{}},
    {t:0.12,p:{hips:[14,0,0],spine:[26,0,0],chest:[10,0,0],head:[-16,0,0],_hips:[0,-0.115,0.06],upperarmL:[-50,-20,0],forearmL:[30,-10,0],legL:[-24,0,8],legR:[-24,0,-8],footL:[14,0,0],footR:[14,0,0],earL:[16,0,0],earR:[16,0,0],tail1:[20,0,0]}},
    {t:0.36,ease:'out',p:{spine:[-17,0,0],chest:[-12,0,0],head:[-10,0,0],_hips:[0,0.02,-0.03],upperarmL:[-138,-10,-6],forearmL:[-8,-10,0],legL:[6,0,6],legR:[3,0,-6],footL:[12,0,0],footR:[12,0,0],earL:[-16,0,0],earR:[-16,0,0],tail1:[-16,0,0]}},
    {t:0.49,p:{spine:[-23,0,0],chest:[-15,0,0],head:[-14,0,0],_hips:[0,0.035,-0.06],upperarmL:[-146,-10,-6],forearmL:[-10,-10,0],legL:[10,0,6],legR:[5,0,-6],footL:[20,0,0],footR:[20,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[-22,0,0]}},
    {t:0.55,ease:'in',p:{spine:[14,0,0],chest:[10,0,0],head:[2,0,0],_hips:[0,-0.03,0.05],upperarmL:[-84,-20,0],forearmL:[20,-12,0],legL:[-18,0,6],legR:[12,0,-6],footR:[16,0,0],earL:[14,0,0],earR:[14,0,0]}},
    {t:0.65,p:{spine:[29,0,0],chest:[14,0,0],head:[8,0,0],_hips:[0,-0.095,0.09],upperarmL:[-56,-28,0],forearmL:[36,-14,0],legL:[-27,0,6],legR:[16,0,-6],footR:[20,0,0],tail1:[24,0,0]}},
    {t:0.91,p:{spine:[22,0,0],chest:[10,0,0],head:[2,0,0],_hips:[0,-0.075,0.08],upperarmL:[-40,-20,0],forearmL:[24,-10,0],legL:[-22,0,6],legR:[13,0,-6],footR:[14,0,0]}},
    {t:1.3,p:{}},
  ],fn:(t,T)=>({upperarmL:[0,0,trem(t,0.3,0.52,12,1.4)],chest:[0,0,trem(t,0.3,0.52,12,0.8,1)],head:[0,0,trem(t,0.3,0.52,12,1.2,2)],...sway(t,T,1.05,8)})},
  // COUNTER SPIN (S54): a hop and one full turn in the air with the slab held out as a blade and the fist out the other
  // side; his head whips round ahead of the turn, and he lands low and wide.
  spin:{T:0.72,free:[[0.05,0.46]],keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[9,10,0],chest:[3,12,0],head:[0,-10,0],_hips:[0,-0.07,0],legL:[-12,0,5],legR:[-12,0,-5],upperarmL:[0,0,30],upperarmR:[0,0,-34],earL:[10,0,0],earR:[10,0,0]}},
    {t:0.13,ease:'out',p:{spine:[8,-6,-6],chest:[2,-8,0],head:[0,-26,0],_hips:[0,0.06,0],legL:[-26,0,7],legR:[-14,0,-7],footL:[22,0,0],footR:[22,0,0],upperarmL:[0,0,52],forearmL:[10,10,0],upperarmR:[6,0,-66],forearmR:[8,0,-10]}},
    {t:0.38,p:{spine:[8,-6,-6],chest:[2,-8,0],head:[0,-18,0],_hips:[0,0.045,0],legL:[-22,0,8],legR:[-12,0,-8],footL:[14,0,0],footR:[14,0,0],upperarmL:[0,0,50],forearmL:[10,10,0],upperarmR:[6,0,-62],forearmR:[8,0,-10]}},
    {t:0.47,ease:'in',p:{spine:[19,6,0],chest:[7,8,0],head:[-10,10,0],_hips:[0,-0.105,0],legL:[-22,0,11],legR:[-20,0,-11],footL:[12,0,0],footR:[12,0,0],upperarmL:[0,0,26],upperarmR:[4,0,-34],earL:[20,0,0],earR:[20,0,0]}},
    {t:0.57,p:{spine:[14,3,0],chest:[5,4,0],head:[-6,5,0],_hips:[0,-0.075,0],legL:[-16,0,9],legR:[-14,0,-9],upperarmL:[0,0,14],upperarmR:[2,0,-18]}},
    {t:0.72,p:{}},
  ],fn:(t,T)=>({hips:[0,-360*sm(0.05,0.45,t),0]})},
  // SLABGUARD, UP (S21): the snap. A stamp and the slab is square in front with the free paw braced behind it.
  guardUp:{T:0.5,nolag:true,twoHand:TH(0.1,2),staffPose:{from:0.02,to:2,fade:0.08,keys:[{t:0.02,p:GP(0),d:GD,n:GN},{t:0.10,p:GP(0.03),d:GD,n:GN,ease:'in'},{t:0.2,p:GP(-0.012),d:GD,n:GN},{t:0.32,p:GP(0),d:GD,n:GN},{t:0.5,p:GP(0),d:GD,n:GN}]},keys:[
    {t:0,p:{}},
    {t:0.04,p:{spine:[-4,0,0],_hips:[0,0.014,-0.01],legL:[-14,0,3],footL:[8,0,0]}},
    {t:0.10,ease:'in',p:{...BRP,spine:[12,0,0],chest:[4,0,0],head:[-5,0,0],_hips:[0,-0.075,0.02],legL:[-14,0,7],legR:[10,0,-7],earL:[12,0,0],earR:[12,0,0],tail1:[-12,0,0]}},
    {t:0.22,p:BRP},
    {t:0.5,p:BRP},
  ]},
  // SLABGUARD, THE SHOVE: from behind the slab he sinks back onto his rear foot, then drives off it and rams the slab
  // out to the end of his arms; it hangs there a beat before he lets it down.
  shove:{T:0.95,nolag:true,twoHand:TH(-0.5,0.74),staffPose:{from:-0.5,to:0.8,fade:0.1,keys:[{t:0,p:GP(0),d:GD,n:GN},{t:0.2,p:GP(-0.075),d:[0,1,-0.1],n:GN},{t:0.30,p:GP(0.15),d:[0,1,0.08],n:GN,ease:'in'},{t:0.38,p:GP(0.12),d:[0,1,0.05],n:GN},{t:0.62,p:GP(0.04),d:GD,n:GN},{t:0.8,p:GP(0),d:GD,n:GN}]},keys:[
    {t:0,p:BRP},
    {t:0.2,p:{...BRP,spine:[3,0,0],chest:[0,0,0],head:[3,0,0],_hips:[0,-0.08,-0.05],legL:[10,0,6],legR:[-8,0,-6],earL:[-10,0,0],earR:[-10,0,0],tail1:[-14,0,0]}},
    {t:0.30,ease:'in',p:{...BRP,spine:[23,0,0],chest:[8,0,0],head:[-13,0,0],_hips:[0,-0.062,0.12],legL:[-27,0,6],legR:[20,0,-6],footR:[22,0,0],earL:[18,0,0],earR:[18,0,0],tail1:[22,0,0]}},
    {t:0.38,p:{...BRP,spine:[20,0,0],chest:[7,0,0],head:[-10,0,0],_hips:[0,-0.07,0.112],legL:[-25,0,6],legR:[18,0,-6],footR:[18,0,0]}},
    {t:0.62,p:{...BRP,spine:[13,0,0],chest:[4,0,0],head:[-5,0,0],_hips:[0,-0.055,0.06],legL:[-16,0,6],legR:[12,0,-6],footR:[8,0,0]}},
    {t:0.95,p:{}},
  ]},
  // GRUDGE, THE BRACE (S31): upper body only. He hunches down behind the slab and takes it, coiling tighter and shaking
  // harder the longer it goes on.
  grudgeBrace:{T:3.4,nolag:true,plant:false,upper:true,twoHand:TH(0.1,9),staffPose:{from:0.02,to:9,fade:0.08,keys:[{t:0.02,p:GP(0),d:GD,n:GN},{t:0.10,p:GP(0.02),d:GD,n:GN,ease:'in'},{t:0.2,p:GP(0),d:GD,n:GN},{t:3.4,p:GP(-0.02),d:GD,n:GN}]},keys:[
    {t:0,p:{}},
    {t:0.045,p:{spine:[-4,0,0],chest:[-3,0,0],head:[2,0,0]}},
    {t:0.10,ease:'in',p:{spine:[13,0,0],chest:[5,0,0],head:[-3,0,0],...BRACE,earL:[12,0,0],earR:[12,0,0]}},
    {t:0.22,p:{spine:[10,0,0],chest:[4,0,0],head:[-2,0,0],...BRACE}},
    {t:3.1,p:{spine:[17,0,0],chest:[8,0,0],head:[6,0,0],...BRACE,earL:[14,0,0],earR:[14,0,0]}},
    {t:3.4,p:{spine:[17,0,0],chest:[8,0,0],head:[6,0,0],...BRACE,earL:[14,0,0],earR:[14,0,0]}},
  ],fn:(t,T)=>{const e=sm(0.2,3.0,t)*0.8+0.2*sm(0.15,0.3,t);return{spine:[1.6*Math.sin(2*Math.PI*t/1.05),0,0],chest:[1.2*Math.sin(2*Math.PI*t/1.05-0.6),0,1.3*e*Math.sin(2*Math.PI*t/0.075)],head:[0,0,2.2*e*Math.sin(2*Math.PI*t/0.075+1)],forearmR:[1.6*e*Math.sin(2*Math.PI*t/0.07),0,0]};}},
  // GRUDGE, THE SLAM: everything he took comes out at once, on the long wind-up (contact at 0.65 s: the move starts 0.3 s
  // before the count ends and lands 0.35 s after it). From the brace the slab goes up, he strains under it, leaves the floor, and he
  // comes down on its edge with both paws; then the head goes back and he roars it out before he lets go.
  grudgeSlam:{T:1.85,nolag:true,twoHand:TH(0.61,0.87),free:[[0.45,0.62]],keys:[
    {t:0,p:{spine:[17,0,0],chest:[8,0,0],head:[6,0,0],...BRACE}},
    {t:0.20,ease:'out',p:{spine:[-15,0,0],chest:[-11,0,0],head:[-8,0,0],...OVER,_hips:[0,0.04,-0.02],legL:[6,0,0],legR:[6,0,0],footL:[18,0,0],footR:[18,0,0],earL:[-12,0,0],earR:[-12,0,0]}},
    {t:0.43,p:{spine:[-21,0,0],chest:[-14,0,0],head:[-5,0,0],...OVER,upperarmL:[-158,-12,-8],upperarmR:[-158,0,-30],_hips:[0,0.055,-0.035],legL:[9,0,0],legR:[9,0,0],footL:[23,0,0],footR:[23,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[18,0,0]}},
    {t:0.55,p:{spine:[-23,0,0],chest:[-15,0,0],head:[-12,0,0],...OVER,upperarmL:[-160,-12,-8],upperarmR:[-160,0,-30],_hips:[0,0.14,0.03],legL:[-24,0,3],legR:[-14,0,-3],footL:[12,0,0],footR:[24,0,0],tail1:[20,0,0]}},
    {t:0.65,ease:'in',p:{spine:[34,0,0],chest:[15,0,0],head:[-22,0,0],...SLAM,_hips:[0,-0.11,0.10],legL:[-32,0,7],legR:[16,0,-7],footR:[22,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[28,0,0],tail2:[14,0,0]}},
    {t:0.77,p:{spine:[27,0,0],chest:[12,0,0],head:[-16,0,0],...SLAM,_hips:[0,-0.085,0.10],legL:[-28,0,7],legR:[15,0,-7],footR:[18,0,0]}},
    {t:0.97,ease:'in',p:{spine:[-8,0,0],chest:[-10,0,0],head:[-30,0,0],upperarmL:[-20,-20,10],forearmL:[10,-8,0],upperarmR:[12,0,-60],forearmR:[10,0,-12],_hips:[0,-0.03,0.06],legL:[-14,0,8],legR:[8,0,-8],earL:[-18,0,0],earR:[-18,0,0],tail1:[20,0,0]}},
    {t:1.40,p:{spine:[-6,0,0],chest:[-8,0,0],head:[-24,0,0],upperarmL:[-16,-16,8],forearmL:[8,-6,0],upperarmR:[10,0,-52],forearmR:[8,0,-10],_hips:[0,-0.025,0.05],legL:[-12,0,8],legR:[7,0,-8]}},
    {t:1.85,p:{}},
  ],fn:(t,T)=>{const e=bump(t,1.17,0.2),w=Math.sin(2*Math.PI*t/0.085);return{head:[0,0,3.8*e*w+3*bump(t,0.71,0.05)*Math.sin(2*Math.PI*t/0.05)],chest:[0,0,1.6*e*w+trem(t,0.2,0.5,12,0.9,1)],upperarmL:[0,0,trem(t,0.2,0.5,12,1.8)],upperarmR:[0,0,2.2*e*Math.sin(2*Math.PI*t/0.085+1)+trem(t,0.2,0.5,12,1.8,2)],...sway(t,T,0.8,8)};}},
  // the basic combo, re-baked: the same passed keys, with planted feet locked and a tail that starts and ends still
  combo:{...B.combo,fn:(t,T)=>sway(t,T,1.15,9)},
});

// =============================================================================================================
// VERSION 11 (overnight review, 18-19 Nov): new, not passed. Each move below replaces its passed version in
// moves11.glb only; moves.glb (passed) is untouched. Why each one changed: OVERNIGHT_REVIEW.md, part B and C.
// =============================================================================================================
const breath=(t,a,b,per,amp,ph=0)=>win(t,a,b,0.15)*amp*Math.sin(2*Math.PI*(t-a)/per+ph);   // a slow breath inside a hold
const decay=(t,a,len,hz,amp,ph=0)=>t<a?0:amp*Math.exp(-(t-a)/len)*Math.sin(2*Math.PI*hz*(t-a)+ph); // a shiver that dies away
const V11={
  // HEAVY SLAM, v11: a falling tree, not a hop. He rocks back onto his heels behind the slab, held upright in front of him
  // with the free paw on its top edge, hangs there straining, then lets himself topple like a felled tree: the feet stay
  // planted, the body pivots over them, the slab turns flat as he falls, and he lands on it at 0.30 s. Then the passed hold and push-up, with heavy breaths.
  heavySlam:{T:1.5,nolag:true,free:[[0.25,0.30]],
    offHand:{from:0.04,to:1.04,fade:0.06,keys:[{t:0.04,p:[-0.3,0.46,0.2]},{t:0.12,p:[-0.06,0.64,0.33]},{t:0.22,p:[-0.06,0.66,0.3]},{t:0.30,p:[-0.13,0.13,0.44],ease:'in'},{t:0.8,p:[-0.13,0.13,0.44]},{t:1.04,p:[-0.3,0.44,0.18]}]},
    staffPose:{from:0.02,to:1.06,fade:0.06,keys:[{t:0.02,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.12,p:[0.06,0.4,0.3],d:[0,1,-0.12],n:[0,0.1,1]},{t:0.22,p:[0.06,0.42,0.27],d:[0,1,-0.18],n:[0,0.16,1]},{t:0.26,p:[0.1,0.36,0.42],d:[0,0.7,0.7],n:[0,-0.7,0.7]},{t:0.30,p:[0.14,0.13,0.5],d:[0,0.12,1],n:[0,-1,0.1],ease:'in'},{t:0.8,p:[0.14,0.13,0.5],d:[0,0.12,1],n:[0,-1,0.1]},{t:1.06,p:[0.24,0.42,0.26],d:[0.08,1,0.1],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.12,ease:'out',p:{spine:[-12,0,0],chest:[-7,0,0],head:[6,0,0],_hips:[0,-0.02,-0.06],legL:[-9,0,3],legR:[-9,0,-3],footL:[-12,0,0],footR:[-12,0,0],earL:[-10,0,0],earR:[-10,0,0],tail1:[-14,0,0]}},
    {t:0.22,p:{spine:[-21,0,0],chest:[-11,0,0],head:[12,0,0],_hips:[0,-0.04,-0.1],legL:[-16,0,3],legR:[-16,0,-3],footL:[-19,0,0],footR:[-19,0,0],earL:[-14,0,0],earR:[-14,0,0],tail1:[-20,0,0],tail2:[-8,0,0]}},
    {t:0.30,ease:'in',p:{hips:[18,0,0],spine:[34,0,0],chest:[16,0,0],head:[-30,0,0],_hips:[0,-0.125,0.12],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-36,0,7],legR:[10,0,-7],footL:[10,0,0],footR:[28,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[30,0,0],tail2:[14,0,0]}},
    {t:0.38,p:{hips:[15,0,0],spine:[30,0,0],chest:[14,0,0],head:[-25,0,0],_hips:[0,-0.105,0.12],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-33,0,7],legR:[9,0,-7],footL:[10,0,0],footR:[24,0,0]}},
    {t:0.78,p:{hips:[14,0,0],spine:[28,0,0],chest:[13,0,0],head:[-22,0,0],_hips:[0,-0.098,0.115],upperarmR:[-60,20,-20],forearmR:[-10,0,0],legL:[-31,0,7],legR:[9,0,-7],footL:[10,0,0],footR:[22,0,0]}},
    {t:1.08,p:{spine:[14,0,0],chest:[5,0,0],head:[-6,0,0],_hips:[0,-0.055,0.04],legL:[-14,0,4],legR:[6,0,-4]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>({upperarmL:[0,0,trem(t,0.12,0.26,13,1.4)],upperarmR:[0,0,trem(t,0.12,0.26,13,1.4,2)],chest:[breath(t,0.42,0.86,0.42,-2.4)+0,0,trem(t,0.12,0.26,13,0.7,1)+2.4*bump(t,0.35,0.05)*Math.sin(2*Math.PI*t/0.05)],spine:[breath(t,0.42,0.86,0.42,-1.2,0.5),0,0],head:[breath(t,0.42,0.86,0.42,2,1),0,3.2*bump(t,0.36,0.06)*Math.sin(2*Math.PI*t/0.05)],...sway(t,T,0.8,6)})},

  // GRUDGE'S SLAM, v11: a turning chop, not an overhead hop. From the brace he coils away to his right with the slab drawn
  // across his belly, his eyes still on the foe, and shakes with the load; then he unwinds, the slab swings up past his left
  // shoulder and chops down on its edge in front at 0.65 s. No roar after it: he stays bent over the slab, heaving, then
  // pulls it out of the floor.
  grudgeSlam:{T:1.85,nolag:true,twoHand:TH(0.62,0.92),free:[[0.53,0.66]],
    staffPose:{from:0.0,to:0.6,fade:0.07,keys:[{t:0,p:GP(0),d:GD,n:GN},{t:0.2,p:[-0.08,0.42,0.26],d:[-0.4,0.9,0.1],n:[-0.6,0,0.8]},{t:0.43,p:[-0.12,0.42,0.22],d:[-0.45,0.88,0.1],n:[-0.65,0,0.76]},{t:0.53,p:[0.38,0.86,-0.02],d:[0.12,0.95,-0.3],n:[0.95,0,0.25],ease:'out'},{t:0.6,p:[0.26,0.7,0.3],d:[0.05,0.6,0.8],n:[0.7,-0.3,0.6]}]},
    keys:[
    {t:0,p:{spine:[17,0,0],chest:[8,0,0],head:[6,0,0],...BRACE}},
    {t:0.2,ease:'out',p:{hips:[0,-14,0],spine:[10,-18,0],chest:[5,-30,0],head:[-2,44,0],_hips:[-0.02,-0.06,-0.01],upperarmR:[18,0,14],forearmR:[-56,0,0],legL:[-8,0,6],legR:[4,0,-6],earL:[-10,0,0],earR:[-10,0,0],tail1:[0,18,0]}},
    {t:0.43,p:{hips:[0,-17,0],spine:[13,-22,0],chest:[6,-36,0],head:[-4,52,0],_hips:[-0.026,-0.08,-0.015],upperarmR:[22,0,16],forearmR:[-60,0,0],legL:[-11,0,7],legR:[2,0,-7],earL:[-14,0,0],earR:[-14,0,0],tail1:[0,24,0]}},
    {t:0.53,ease:'out',p:{hips:[0,10,0],spine:[-16,14,0],chest:[-12,24,0],head:[-14,-22,0],_hips:[0.01,0.05,0.0],upperarmR:[-70,0,-40],forearmR:[-40,0,0],legL:[-4,0,4],legR:[-14,0,-4],footR:[18,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[0,-16,0]}},
    {t:0.65,ease:'in',p:{hips:[0,-4,0],spine:[34,-4,0],chest:[15,-6,0],head:[-22,4,0],...SLAM,_hips:[0,-0.11,0.10],legL:[-32,0,7],legR:[16,0,-7],footR:[22,0,0],earL:[22,0,0],earR:[22,0,0],tail1:[28,-10,0],tail2:[14,0,0]}},
    {t:0.77,p:{spine:[29,-3,0],chest:[13,-4,0],head:[-17,3,0],...SLAM,_hips:[0,-0.09,0.10],legL:[-29,0,7],legR:[15,0,-7],footR:[18,0,0]}},
    {t:1.2,p:{spine:[26,0,0],chest:[12,0,0],head:[-10,0,0],...SLAM,_hips:[0,-0.08,0.09],legL:[-26,0,7],legR:[14,0,-7],footR:[14,0,0]}},
    {t:1.5,p:{spine:[10,0,0],chest:[4,0,0],head:[-2,0,0],_hips:[0,-0.04,0.03],legL:[-10,0,5],legR:[5,0,-5]}},
    {t:1.85,p:{}},
  ],fn:(t,T)=>({chest:[breath(t,0.8,1.3,0.5,-3.2),0,trem(t,0.2,0.47,12,1.1,1)+2.4*bump(t,0.7,0.05)*Math.sin(2*Math.PI*t/0.05)],spine:[breath(t,0.8,1.3,0.5,-1.6,0.6),0,0],head:[breath(t,0.8,1.3,0.5,2.5,1.2),0,3*bump(t,0.71,0.05)*Math.sin(2*Math.PI*t/0.05)],upperarmL:[0,0,trem(t,0.2,0.47,12,1.8)],upperarmR:[0,0,trem(t,0.2,0.47,12,1.8,2)],...sway(t,T,0.8,8)})},

  // COLOSSUS, v11: the peak is his own, not Bellow's. Out of the curl he swells into a giant's flex: the slab set down on its
  // edge beside him under his left paw like a door he leans on, the right arm flexed with the fist by his ear, chest up, chin level, and a low growl through his teeth
  // (no head-back roar). The flex shakes with strain as he grows, then he lets the arms down heavily.
  colossus:{T:2.05,
    staffPose:{from:0.62,to:1.64,fade:0.14,keys:[{t:0.62,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.9,p:[0.36,0.31,0.14],d:[0.05,1,0],n:[0.25,0,1],ease:'in'},{t:1.45,p:[0.36,0.31,0.14],d:[0.05,1,0],n:[0.25,0,1]},{t:1.64,p:[0.26,0.42,0.22],d:[0.1,1,0],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.17,ease:'out',p:{spine:[-9,0,0],chest:[-9,0,0],head:[-11,0,0],_hips:[0,0.032,-0.01],upperarmL:[4,22,16],forearmL:[6,6,0],upperarmR:[8,0,-34],forearmR:[-8,0,-6],legL:[4,0,4],legR:[4,0,-4],footL:[13,0,0],footR:[13,0,0],earL:[-12,0,0],earR:[-12,0,0],tail1:[16,0,0]}},
    {t:0.3,ease:'in',p:{spine:[24,0,0],chest:[13,0,0],head:[18,0,0],_hips:[0,-0.105,0.01],upperarmL:[-8,30,8],forearmL:[4,10,0],upperarmR:[-40,34,14],forearmR:[-72,0,0],legL:[-14,0,7],legR:[-14,0,-7],earL:[16,0,0],earR:[16,0,0],tail1:[-22,0,0]}},
    {t:0.45,p:{spine:[22,0,0],chest:[12,0,0],head:[16,0,0],_hips:[0,-0.09,0.01],upperarmL:[-8,28,8],forearmL:[4,10,0],upperarmR:[-38,32,12],forearmR:[-70,0,0],legL:[-12,0,7],legR:[-12,0,-7]}},
    {t:0.9,ease:'in',p:{spine:[-12,0,0],chest:[-14,0,0],head:[-2,0,0],_hips:[0,0.045,0],upperarmR:[0,-62,-56],forearmR:[-96,0,0],legL:[0,0,11],legR:[0,0,-11],footL:[8,0,0],footR:[8,0,0],earL:[-16,0,0],earR:[-16,0,0],tail1:[24,0,0],tail2:[12,0,0]}},
    {t:1.06,p:{spine:[-10,0,0],chest:[-12,0,0],head:[-1,0,0],_hips:[0,0.02,0],upperarmR:[0,-62,-56],forearmR:[-96,0,0],legL:[0,0,11],legR:[0,0,-11]}},
    {t:1.45,p:{spine:[-8,0,0],chest:[-9,0,0],head:[0,0,0],_hips:[0,0.008,0],upperarmR:[2,-60,-52],forearmR:[-92,0,0],legL:[0,0,9],legR:[0,0,-9]}},
    {t:1.72,p:{spine:[7,0,0],chest:[3,0,0],head:[2,0,0],_hips:[0,-0.04,0],upperarmL:[-4,8,4],upperarmR:[0,0,-10],forearmR:[-14,0,0],legL:[-3,0,4],legR:[-3,0,-4]}},
    {t:2.05,p:{}},
  ],fn:(t,T)=>{const g=win(t,0.4,0.88,0.1),f=win(t,0.95,1.45,0.1),w=Math.sin(2*Math.PI*t/0.07);return{head:[0,0,1.6*g*w+1.2*f*Math.sin(2*Math.PI*t/0.06)],chest:[0,0,0.9*g*Math.sin(2*Math.PI*t/0.07+1)+1.1*f*Math.sin(2*Math.PI*t/0.065+1)],spine:[breath(t,1.0,1.5,0.5,-1.2),0,0],upperarmR:[0,0,1.4*g*Math.sin(2*Math.PI*t/0.06)],...sway(t,T,0.9,9)};}},

  // STONEHEART, v11: a statue, not a chest thump (Bloodboil owns the chest). He breathes in, sets his feet wide and drops his
  // weight, and his body locks: a shiver runs through him and dies away, the free arm hangs straight and rigid at his side,
  // chin level, eyes front. One long breath out while it holds, then the stone lets go of him.
  stoneheart:{T:1.2,nolag:true,keys:[
    {t:0,p:{}},
    {t:0.05,p:{spine:[-7,0,0],chest:[-7,0,0],head:[-6,0,0],_hips:[0,0.025,0],upperarmR:[0,0,-12],forearmR:[-24,0,0],footL:[10,0,0],footR:[10,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.10,ease:'in',p:{spine:[-3,0,0],chest:[-6,0,0],head:[0,0,0],_hips:[0,-0.085,0],legL:[-6,0,13],legR:[-6,0,-13],upperarmR:[6,0,-30],forearmR:[10,0,0],handR:[0,0,0],earL:[8,0,0],earR:[8,0,0],tail1:[-12,0,0]}},
    {t:0.2,p:{spine:[-3,0,0],chest:[-6,0,0],head:[0,0,0],_hips:[0,-0.074,0],legL:[-5,0,13],legR:[-5,0,-13],upperarmR:[6,0,-30],forearmR:[10,0,0],earL:[6,0,0],earR:[6,0,0]}},
    {t:0.8,p:{spine:[-1,0,0],chest:[-3,0,0],head:[1,0,0],_hips:[0,-0.08,0],legL:[-5,0,13],legR:[-5,0,-13],upperarmR:[6,0,-29],forearmR:[10,0,0],earL:[6,0,0],earR:[6,0,0]}},
    {t:0.94,p:{spine:[6,0,0],chest:[2,0,0],head:[3,0,0],_hips:[0,-0.05,0],legL:[-3,0,7],legR:[-3,0,-7],upperarmR:[0,0,-6],forearmR:[-10,0,0]}},
    {t:1.2,p:{}},
  ],fn:(t,T)=>({chest:[0,0,decay(t,0.1,0.06,15,2.2)],head:[0,0,decay(t,0.1,0.06,15,2.6,1)],spine:[0,0,decay(t,0.1,0.06,15,1.4,0.5)],upperarmR:[0,0,decay(t,0.1,0.06,15,2,2)],tail1:[0,decay(t,0.1,0.09,9,8),0]})},

  // STONE RING, v11: he lifts the ring out of the floor. A deep crouch with the slab and the fist low and wide, then he heaves
  // both up and out at 0.10 s as the stones break the floor, up onto his toes as they rise, and looks left, then right, before
  // he lets the arms down. (Was a stab of the slab's edge, which Stone Cubs' knock also uses.)
  plant:{T:1.5,nolag:true,
    offHand:{from:0.0,to:1.2,fade:0.06,keys:[{t:0,p:[-0.3,0.44,0.18]},{t:0.055,p:[-0.42,0.24,0.2]},{t:0.10,p:[-0.42,0.5,0.3],ease:'in'},{t:0.36,p:[-0.42,0.6,0.28]},{t:0.9,p:[-0.4,0.58,0.28]},{t:1.2,p:[-0.3,0.46,0.18]}]},
    staffPose:{from:0.0,to:1.22,fade:0.06,keys:[{t:0,p:REST_G,d:[0.1,1,0],n:[0,0,1]},{t:0.055,p:[0.4,0.3,0.2],d:[0.3,1,0.05],n:[0.3,0,0.95]},{t:0.10,p:[0.42,0.48,0.3],d:[0.2,1,0.1],n:[0.5,0,0.86],ease:'in'},{t:0.36,p:[0.42,0.58,0.28],d:[0.15,1,0.05],n:[0.5,0,0.86]},{t:0.9,p:[0.4,0.56,0.28],d:[0.15,1,0.05],n:[0.5,0,0.86]},{t:1.22,p:REST_G,d:[0.1,1,0],n:[0,0,1]}]},
    keys:[
    {t:0,p:{}},
    {t:0.055,p:{spine:[22,0,0],chest:[9,0,0],head:[-12,0,0],_hips:[0,-0.11,0.02],legL:[-18,0,9],legR:[-18,0,-9],footL:[8,0,0],footR:[8,0,0],earL:[14,0,0],earR:[14,0,0],tail1:[-18,0,0]}},
    {t:0.10,ease:'in',p:{spine:[-10,0,0],chest:[-10,0,0],head:[-10,0,0],_hips:[0,0.035,0],legL:[0,0,8],legR:[0,0,-8],footL:[14,0,0],footR:[14,0,0],earL:[-16,0,0],earR:[-16,0,0],tail1:[22,0,0],tail2:[10,0,0]}},
    {t:0.36,p:{spine:[-12,0,0],chest:[-11,0,0],head:[-12,0,0],_hips:[0,0.05,0],legL:[0,0,8],legR:[0,0,-8],footL:[20,0,0],footR:[20,0,0],tail1:[16,0,0]}},
    {t:0.5,p:{spine:[-8,4,0],chest:[-8,8,0],head:[-6,34,0],_hips:[0,0.012,0],legL:[0,0,8],legR:[0,0,-8]}},
    {t:0.82,p:{spine:[-8,-4,0],chest:[-8,-8,0],head:[-6,-34,0],_hips:[0,0.008,0],legL:[0,0,8],legR:[0,0,-8]}},
    {t:1.06,p:{spine:[8,0,0],chest:[3,0,0],head:[0,0,0],_hips:[0,-0.04,0],legL:[-3,0,5],legR:[-3,0,-5]}},
    {t:1.5,p:{}},
  ],fn:(t,T)=>({chest:[0,0,trem(t,0.12,0.36,13,1.0)],upperarmL:[0,0,trem(t,0.12,0.36,13,1.2,1)],upperarmR:[0,0,trem(t,0.12,0.36,13,1.2,2)],spine:[breath(t,0.4,0.95,0.55,-1.2),0,0],...sway(t,T,0.75,6)})},
};
// BURROW UP, v11: no wet-dog shake (Iron Bristles owns it). He comes up paws first as before, lands, and wipes the dirt from
// his face with the back of the free paw, then flicks his head once.
V11.digUp={...CLIPS.digUp,
  offHand:{from:0.4,to:0.78,fade:0.06,keys:[{t:0.4,p:[-0.24,0.5,0.24]},{t:0.47,p:[-0.12,0.86,0.26]},{t:0.56,p:[0.08,0.84,0.22],ease:'in'},{t:0.64,p:[0.06,0.8,0.2]},{t:0.78,p:[-0.3,0.46,0.18]}]},
  fn:(t,T)=>({head:[-8*win(t,0.44,0.62,0.06),10*win(t,0.44,0.6,0.06)-8*win(t,0.56,0.66,0.04),9*bump(t,0.7,0.035)*Math.sin(2*Math.PI*t/0.07)],chest:[0,6*win(t,0.44,0.6,0.06),0],...sway(t,T,0.6,9)})};
// DETAIL PASS, v11 (part C): small additions on top of passed moves. Each wraps the passed fn and adds to it.
const addP=(a,b)=>{const o={...a};for(const k in b){o[k]=o[k]?o[k].map((v,i)=>v+b[k][i]):b[k];}return o;};
const more=(c,f)=>{const g=CLIPS[c].fn;return {...CLIPS[c],fn:(t,T)=>addP(g?g(t,T):{},f(t,T))};};
// ROCK TOSS: the wrist cocks back as the paw drops, then snaps through the release and settles with a small shake.
V11.toss=more('toss',(t)=>({handR:[-34*win(t,0.0,0.09,0.04)+30*asym(t,0.12,0.02,0.08)+decay(t,0.2,0.08,9,6),0,0]}));
// SCATTER: the open paw leads the sweep (wrist bent back), then flicks over at the end of the throw.
V11.scatter=more('scatter',(t)=>({handR:[0,22*win(t,0.03,0.12,0.03)-26*asym(t,0.17,0.03,0.1),0]}));
// FAULT LINE: heavy breaths through the long hold on the slab, ears flat then lifting as he lets go.
V11.faultLine=more('faultLine',(t)=>({spine:[breath(t,0.64,1.2,0.5,-1.6),0,0],chest:[breath(t,0.64,1.2,0.5,-1.2,0.5),0,0],head:[breath(t,0.64,1.2,0.5,1.4,0.9),0,0],earL:[-10*win(t,0.55,1.2,0.1),0,0],earR:[-10*win(t,0.55,1.2,0.1),0,0]}));
// BADGER HAUL (Landslide): the body sat a little low in the heave and the tail went under the floor for a frame.
V11.haul={...CLIPS.haul,keys:CLIPS.haul.keys.map(k=>k.t===0.48||k.t===0.62?{...k,p:{...k.p,_hips:[0,k.p._hips[1]+0.02,k.p._hips[2]],tail1:[k.p.tail1[0]+16,0,0],tail2:[10,0,0]}}:k)};
// HOP: the slab's rim touched his chin for a frame at the top of the hop; the head tucks back 6 more degrees there.
V11.hop={...CLIPS.hop,keys:CLIPS.hop.keys.map(k=>k.t===0.15||k.t===0.28?{...k,p:{...k.p,head:[k.p.head[0]+8,0,0],chest:[k.p.chest[0]+3,0,0]}}:k)};
// IRON QUILLS, v11: a porcupine, not a roar (Bellow owns arms wide and head back). Out of the same tight curl he does
// not open up: he hunches harder, shoulders up round his ears, back rounded, elbows out, chin tucked, and the shake throws
// the quills off his back. Then he unrolls.
V11.quills={...CLIPS.quills,
  offHand:{from:0.02,to:0.8,fade:0.06,keys:[{t:0.02,p:[-0.30,0.44,0.16]},{t:0.06,p:[-0.06,0.40,0.26]},{t:0.10,p:[0.02,0.38,0.27],ease:'in'},{t:0.45,p:[0.0,0.39,0.26]},{t:0.8,p:[-0.30,0.44,0.16]}]},
  keys:[
    {t:0,p:{}},
    {t:0.06,p:{spine:[28,0,0],chest:[15,0,0],head:[18,0,0],_hips:[0,-0.11,0.01],upperarmL:[-14,20,4],forearmL:[10,8,0],legL:[-18,0,3],legR:[-18,0,-3],earL:[-14,0,0],earR:[-14,0,0],tail1:[-26,0,0],tail2:[-12,0,0]}},
    {t:0.10,ease:'in',p:{spine:[34,0,0],chest:[24,0,0],head:[16,0,0],_hips:[0,-0.125,-0.03],upperarmL:[-20,16,2],forearmL:[16,6,0],legL:[-24,0,2],legR:[-24,0,-2],footL:[16,0,0],footR:[16,0,0],earL:[-28,0,0],earR:[-28,0,0],tail1:[-32,0,0],tail2:[-18,0,0],tail3:[-10,0,0]}},
    {t:0.22,p:{spine:[32,0,0],chest:[22,0,0],head:[15,0,0],_hips:[0,-0.12,-0.03],upperarmL:[-18,16,2],forearmL:[14,6,0],legL:[-23,0,2],legR:[-23,0,-2],footL:[15,0,0],footR:[15,0,0],earL:[-26,0,0],earR:[-26,0,0],tail1:[-28,0,0]}},
    {t:0.45,p:{spine:[26,0,0],chest:[17,0,0],head:[11,0,0],_hips:[0,-0.10,-0.02],upperarmL:[-14,14,2],forearmL:[10,6,0],legL:[-19,0,3],legR:[-19,0,-3],footL:[12,0,0],footR:[12,0,0],earL:[-18,0,0],earR:[-18,0,0]}},
    {t:0.72,p:{spine:[6,0,0],chest:[2,0,0],head:[2,0,0],_hips:[0,-0.035,0],upperarmL:[2,6,4],legL:[-2,0,4],legR:[-2,0,-4],earL:[6,0,0],earR:[6,0,0]}},
    {t:1.05,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.3,0.14),q=(ph)=>Math.sin(2*Math.PI*t/0.07-ph);return{spine:[1.5*e*q(0.3),0,2.8*e*q(0)],chest:[1.8*e*q(0.4),0,2.6*e*q(0.9)],head:[0,0,1.6*e*q(1.8)],tail1:[0,10*e*q(-0.6),0],...sway(t,T,0.5,7)};}};
// BLOODBOIL, v11: the two fists to the chest stay; the peak is no longer Bellow's roar. He drops into a bull's charge
// stance, head low, fists clenched low in front, and his shoulders heave with each hard breath, with one snort.
V11.boil={...CLIPS.boil,
  offHand:{...CLIPS.boil.offHand,to:1.12,keys:CLIPS.boil.offHand.keys.filter(k=>k.t<0.45).concat([{t:0.56,p:[-0.34,0.34,-0.06],ease:'in'},{t:0.82,p:[-0.34,0.35,-0.04]},{t:1.12,p:[-0.3,0.44,0.16]}])},
  keys:CLIPS.boil.keys.filter(k=>k.t<0.5||k.t>1.2).concat([
    {t:0.56,ease:'in',p:{spine:[27,0,0],chest:[9,0,0],head:[-18,0,0],_hips:[0,-0.115,0.03],upperarmL:[-8,22,16],forearmL:[10,6,0],legL:[-21,0,13],legR:[-21,0,-13],footL:[12,0,0],footR:[12,0,0],earL:[-22,0,0],earR:[-22,0,0],tail1:[-22,0,0]}},
    {t:0.82,p:{spine:[24,0,0],chest:[8,0,0],head:[-15,0,0],_hips:[0,-0.105,0.03],upperarmL:[-6,20,14],forearmL:[9,6,0],legL:[-19,0,12],legR:[-19,0,-12],footL:[10,0,0],footR:[10,0,0],earL:[-18,0,0],earR:[-18,0,0],tail1:[-16,0,0]}},
    {t:1.02,p:{spine:[6,0,0],chest:[1,0,0],head:[-2,0,0],_hips:[0,-0.035,0],upperarmL:[4,8,6],upperarmR:[6,0,-12],forearmR:[-24,0,0],legL:[-3,0,5],legR:[-3,0,-5]}},
  ]).sort((a,b)=>a.t-b.t),
  fn:(t,T)=>{const h=breath(t,0.58,1.0,0.34,1),s=bump(t,0.66,0.04);return{spine:[-3*h,0,0],chest:[-2.4*h,0,0],head:[2*h+5*s,0,0],upperarmR:[0,0,2*h],upperarmL:[0,0,-1.4*h],earL:[6*s,0,0],earR:[6*s,0,0],...sway(t,T,0.6,10)};}};
// IRON BRISTLES, v11: the wet-dog shake is its whole beat now. It no longer ends opening up like a roar: the shake dies,
// the ears flick out once, and he settles straight back to his stance.
V11.bristle={...CLIPS.bristle,keys:CLIPS.bristle.keys.filter(k=>k.t<0.5||k.t>1).concat([
    {t:0.58,p:{spine:[4,0,0],chest:[1,0,0],head:[3,0,0],_hips:[0,-0.035,0],upperarmL:[5,10,10],upperarmR:[6,0,-18],forearmR:[-12,0,0],legL:[-2,0,6],legR:[-2,0,-6],earL:[-12,0,0],earR:[-12,0,0]}},
    {t:0.7,p:{spine:[3,0,0],chest:[1,0,0],head:[1,0,0],_hips:[0,-0.03,0],upperarmL:[4,8,8],upperarmR:[5,0,-14],forearmR:[-10,0,0],legL:[-2,0,5],legR:[-2,0,-5],earL:[10,0,0],earR:[10,0,0]}},
  ]).sort((a,b)=>a.t-b.t)};
Object.assign(CLIPS,V11);
