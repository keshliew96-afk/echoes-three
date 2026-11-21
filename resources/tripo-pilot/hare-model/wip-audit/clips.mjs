// The hare Archer. Deltas in Euler degrees XYZ, in the parent's frame, applied after BASE. +x is her left, +y up, +z forward.
// Down-pointing limbs: rx- swings forward, rz+ toward her left (so +z swings the LEFT arm out, -z swings the RIGHT arm out). Torso: rx+ leans forward, ry+ turns to her left.
// The bow is in her LEFT paw; the RIGHT paw is free: it fetches the arrow from the quiver over her right shoulder, nocks, draws and looses.
export const CFG={name:'hare',weaponFile:'bow_ns.glb',hand:'handL',scale:0.5,grip:[-0.055,0.5,0],palm:[0.02,-0.035,0.02],tilt:[0,90,20],tiltOrder:'YXZ',
  holdBones:['upperarmL','forearmL','handL','fingersL'],box:[-0.124,0.05,0.02,0.98,-0.05,0.05],pushMode:'away',sole:[[0,-0.06,-0.015],[0,-0.06,0.108],[0.08,-0.06,0.108],[0.08,-0.06,0.0],[-0.008,-0.06,0.05]],   // the whole big foot, out to the outer toe (x is mirrored for the right foot)
 
  // the string is ours: tied where the Tripo string was (x 0.110, y 0.095 to 0.906 in the bow's own space), pulled back up to 0.32 (16 cm); the loose arrow rests beside the grip
  bow:{fan:0.28,x:0.110,y0:0.095,y1:0.906,r:0.006,pull:0.30,rest:[-0.055,0.5,0.058],arrowFile:'arrows.glb',arrowScale:0.68,palm:[-0.028,-0.045,0.012]},
  // follow-through: poised and springy. The trunk leads, the head and the draw arm trail; the long ears trail most
  carry:0.4,lag:{chest:0.01,head:0.03,upperarmR:0.01,forearmR:0.015,handR:0.02},
  springs:[{bone:'earL',k:330,z:0.42,max:26},{bone:'earR',k:330,z:0.42,max:26},{bone:'earL2',k:210,z:0.34,max:40,tip:[0.015,0.13,0]},{bone:'earR2',k:210,z:0.34,max:40,tip:[-0.015,0.13,0]},{bone:'tail1',k:420,z:0.45,max:24,tip:[0,0,-0.05]}]};
export const BASE={
  spine:[3,0,0], head:[-3,0,0],
  upperarmL:[4,0,-24], forearmL:[-22,0,-6],   // the rest pose: both arms brought in from the model's arms-out pose
  upperarmR:[4,0,24], forearmR:[-14,0,6],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2; // a soft max(0,x)
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tail=(t,T,a)=>({tail1:[0,a*S(t,T,0.1),0]});
// ears: each turns on its own to a sound, and both nod with the step
const ears=(t,T)=>({earL:[0,0,-9*bump(t,T*0.5,0.07)+5*bump(t,T*0.85,0.07)], earL2:[0,0,-7*bump(t,T*0.5+0.04,0.08)], earR:[0,0,8*bump(t,T*0.2,0.07)], earR2:[0,0,6*bump(t,T*0.2+0.04,0.08)]});
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.008*dir*s,0.016*c2-0.018,0], hips:[0,0,-3*dir*s], spine:[2,0,3*dir*s], chest:[0.8*c2,3*dir,2*dir*s], head:[1.5*c2,5*dir,-3*dir*s],
    upperarmR:[0,0,-4*s], forearmR:[-8+4*s,0,0], handR:[-5*c2,0,0], upperarmL:[2*c2,0,5], forearmL:[-4+2*c2,0,0],
    // the long ears trail away from the way she steps, the tips most
    earL:[5*S(t,T/2,0.2),0,6*dir+3*dir*S(t,T/2,0.15)], earR:[5*S(t,T/2,0.25),0,6*dir+3*dir*S(t,T/2,0.2)], earL2:[5*S(t,T/2,0.32),0,7*dir+4*dir*S(t,T/2,0.3)], earR2:[5*S(t,T/2,0.37),0,7*dir+4*dir*S(t,T/2,0.35)], tail1:[4*c2,12*S(t,T,0.1),0]};
  o['leg'+lead]=[-12*pos(c),0,dir*(3+19*pos(s,0.3))]; o['leg'+trail]=[-12*pos(-c),0,-dir*(3+15*pos(-s,0.3))];
  o['foot'+lead]=[8*pos(c),0,0]; o['foot'+trail]=[8*pos(-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-6*d],head:[-4,0,14*d],_hips:[0.08*d*k,0.07,0],earL:[0,0,14*d],earR:[0,0,14*d],tail1:[0,-24*d,0],upperarmR:[0,0,d>0?-8:-26],upperarmL:[-8,0,d>0?24:8]};
    p['leg'+L]=[-16,0,24*d];p['leg'+R]=[6,0,-26*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.05,0]};crouch['leg'+L]=[0,0,-2*d];crouch['leg'+R]=[0,0,4*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.045,0],head:[2,0,4*d],earL:[0,0,-8*d],earR:[0,0,-8*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
const PRONE={hips:[84,0,0],chest:[3,0,0],head:[-60,0,0],_hips:[0,-0.19,0.0],legL:[6,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],
  upperarmR:[-160,0,22],forearmR:[-6,0,0],upperarmL:[-150,0,-24],forearmL:[20,0,0],handL:[0,0,-80],earL:[20,0,8],earR:[20,0,-8],earL2:[14,0,0],earR2:[14,0,0],tail1:[-30,0,0]};

// ---- the Archer's style: poised, precise and springy. She stands side-on behind the bow, weight on the back foot; every shot is reach, nock, draw, loose,
// and the loose is the accent: the string snaps, the bow kicks, the draw paw flies back past her ear, and her ears whip after it.
const CARRY={p:[0.205,0.365,0.07],d:[0.0,0.94,0.34],n:[1,0,0]};          // the bow at her side, top leaning forward
const AIM=(dz=0,dy=0,cant=0.12)=>({p:[0.045,0.515+dy,0.285+dz],d:[cant,1,0.0],n:[1,0,0]});  // level at the target, canted a touch
const POSE=(p,d,n,f)=>(k=0,up=0)=>({p:[p[0]-0.07*k*f[0],p[1]-0.07*k*f[1]+up,p[2]-0.07*k*f[2]],d,n});
const LEVEL=POSE([-0.135,0.515,0.26],[-0.12,1,0],[1,0,0],[0,0,1]);
const HIGH=POSE([-0.17,0.60,0.22],[-0.1,0.52,-0.85],[1,0,0],[0,0.85,0.52]);
const FLATP=POSE([-0.125,0.47,0.27],[-0.97,0.24,0],[0,1,0],[0,0,1]);
// the bow for one shot: held close while she nocks (tn), pushed out as she draws (td), then it kicks on the loose (tr)
const tipd=(P,k)=>Math.abs(P.d[1])>0.6?{...P,d:[P.d[0],P.d[1],P.d[2]+k]}:P;   // an upright bow rocks its top toward the target as the string snaps
const bowShot=(A,tn,td,tr,kk)=>[{t:tn,...A(0.8)},{t:td,...A(0)},{t:tr,...A(0)},{t:tr+0.04,...tipd(A(-0.45*kk,0.012*kk),0.09*Math.min(kk,1.2)),ease:'in'},{t:tr+0.12,...A(0)}];
const sh=(P,dy,dz)=>({...P,p:[P.p[0],P.p[1]+dy,P.p[2]+dz]});
const FLAT3_=POSE([-0.125,0.47,0.27],[-0.97,0.24,0],[0,1,0],[0,0,1]), FLAT3=(k=0,up=0)=>FLAT3_(k>0?k*0.5:k,up);  // the bow laid flat for the combo's last shot: three arrows at once
const QUIV=[-0.125,0.185,-0.115];                                        // the arrows in the quiver, in her chest's own space
const BACK=[-0.19,0.05,-0.02];                                           // where the draw paw flies to after a loose, chest space
const STANCE={hips:[0,-26,0],spine:[1,-16,0],chest:[0,-28,0],head:[-2,62,0],_hips:[0,-0.022,-0.01],legL:[-15,0,4],legR:[13,0,-4],footR:[9,0,0]};
const mix=(a,b)=>{const o={...a};for(const k in b)o[k]=b[k];return o;};
// one shot: the paw is at the quiver at tq, the arrow is on the string at tn, the draw is full (dmax) at td, loosed at tr
const shot=(tq,tn,td,tr,dmax,na=1)=>({
  draw:[{t:tq,d:0,a:0,h:0},{t:tn,d:0,a:na,h:1},{t:td,d:dmax,a:na,h:1},{t:tr,d:dmax,a:0,h:1},{t:tr+0.025,d:-0.12,a:0,h:0,ease:'lin'},{t:tr+0.06,d:0.06,a:0,h:0},{t:tr+0.10,d:-0.02,a:0,h:0},{t:tr+0.14,d:0,a:0,h:0}],
  off:[{t:tq,p:QUIV,b:'chest'},{t:+(tq*0.45+tn*0.55).toFixed(3),p:[-0.2,0.1,0.03],b:'chest'},{t:tn,p:[0.05,0.045,0.15],b:'chest'},{t:tr,p:[0.0,0.045,0.13],b:'chest'},{t:tr+0.08,p:BACK,b:'chest',ease:'in'}]});
const seq=(shots)=>({draw:[{t:0,d:0,a:0,h:0},...shots.flatMap(s=>s.draw)],off:[{t:0.0,p:[-0.19,-0.1,0.04],b:'chest'},...shots.flatMap(s=>s.off)]});
const win=(keys,o,t0,t1,pad)=>{const k=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-o).toFixed(3)})); return k;};

const COMBO=seq([shot(0.07,0.13,0.20,0.22,0.55),shot(0.32,0.40,0.50,0.54,0.62),shot(0.66,0.76,0.94,1.00,0.85,3)]);
const kick=(t,k)=>[{t:t,...AIM()},{t:t+0.04,...AIM(0.03*k,0.012*k,0.12+0.1*k),ease:'in'},{t:t+0.12,...AIM()}];
const COMBO_BOW=[{t:0.02,...CARRY},...bowShot(LEVEL,0.13,0.20,0.22,0.7),...bowShot(LEVEL,0.40,0.50,0.54,0.7),...bowShot(FLAT3,0.76,0.94,1.00,1.3),{t:1.18,...FLAT3(0.3)},{t:1.36,...CARRY}];

// the dash: a jump of 0.60 s (0.15 to 0.75) that peaks 0.75 up; the one shot in it takes three arrows; the bow rides up and down with her, so its pose is written every frame
const DSH_H=(t)=>{const u=(t-0.15)/0.60; return u>0&&u<1?0.75*4*u*(1-u):0;};
const DSH=(()=>{const s=shot(0.42,0.50,0.57,0.60,0.85,3); return {draw:[{t:0,d:0,a:0,h:0},...s.draw],off:[{t:0.36,p:[-0.19,-0.1,0.04],b:'chest'},...s.off]};})();
const DASH_BOW=(()=>{const sm=(x)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);}, ks=[];
  for(let t=0.44;t<=0.781;t+=1/60){ let k=1,up=0; if(t>=0.50&&t<0.57)k=1-sm((t-0.50)/0.07); else if(t>=0.57&&t<0.60)k=0; else if(t>=0.60&&t<0.64){const e=((t-0.60)/0.04)**3;k=-0.585*e;up=0.0156*e;} else if(t>=0.64&&t<0.72){const e=1-sm((t-0.64)/0.08);k=-0.585*e;up=0.0156*e;} else if(t>=0.72)k=0.3*sm((t-0.72)/0.06);
    const P=FLAT3(k,up); ks.push({t:+t.toFixed(4),p:[P.p[0],P.p[1]+DSH_H(t),P.p[2]],d:P.d,n:P.n,ease:'lin'}); }
  return ks;})();

export const CLIPS={
  // idle (6 s): at ease but listening. The bow hangs in her left paw, her weight shifts from foot to foot and each long ear turns on its own to a sound. She tugs her quiver strap (0.7),
  // glances to her left (1.7), then rises on her toes to look the other way, tall as a hare in the grass, ears straight up, free paw at her chest (3.9, a double-take at 4.3);
  // she settles, and thumps her back foot twice (5.25, 5.44) with a shiver in the ears and a flick of the tail.
  idle:{T:6.0,loop:true,fn:(t,T)=>{const b=S(t,3), b2=S(t,3,0.1), w=S(t,6,0.15), up=bump(t,3.9,0.42), look=bump(t,1.7,0.4), fid=bump(t,0.7,0.26), dbl=bump(t,4.3,0.11),
      lf=bump(t,5.17,0.05)+0.8*bump(t,5.37,0.042), th=bump(t,5.25,0.04)+0.7*bump(t,5.44,0.04), e=ears(t<3?t:t-3,3);
    return{
    _hips:[0.007*w,0.006*b-0.008+0.026*up-0.005*th,0], hips:[0,-6,1.6*w], spine:[1.6*b-4*up+1.5*th,-3-3*up,-1.2*w], chest:[1.6*b2-3*up,-4+1.5*w-5*up,0],
    head:[-2-3*look-1.5*S(t,3,0.16)-6*up+2.5*th, 10+7*S(t,6,0.05)+14*look-30*up-9*dbl, 2*look-3*dbl],
    legL:[-4,0,-1.4*w+2], legR:[5-13*lf,0,-1.4*w-2], footL:[20*up,0,0], footR:[20*up-12*lf,0,0],
    upperarmR:[2*b2-26*fid-18*up,0,-2-1.2*b], forearmR:[-4-3*b2,30*fid+25*up,62*fid+52*up+5*fid*Math.sin(2*Math.PI*t/0.22)], handR:[0,0,10*fid+8*up], upperarmL:[-4+1.5*b-5*up,0,3], forearmL:[-4+2*b2-4*up,0,0], handL:[3*S(t,3,0.22),0,0],
    earL:[8*up+7*th, 0, e.earL[2]-6*up], earL2:[6*up+8*th, 0, e.earL2[2]-4*up], earR:[8*up-15*dbl+7*th, 0, e.earR[2]+6*up], earR2:[6*up-12*dbl+8*th, 0, e.earR2[2]+4*up],
    tail1:[-12*up+10*th, 10*S(t,2,0.1)+12*th*Math.sin(2*Math.PI*t/0.11), 0],
  };}},
  // walk: a light springy step, almost a hop, up on her toes; the bow is carried still, the free arm swings, the ears nod a beat behind
  walk:{T:0.6,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.005*s,0.026*c2-0.022,0], hips:[0,5*s,2.5*s], spine:[6+1.2*c2,-3*s,-2*s], chest:[1.4*b2,-6*s,1.6*s], head:[-4+2.6*b2,4*s,-1.2*s],
    legL:[-34*s,0,0], legR:[34*s,0,0], footL:[24*pos(-S(t,T,0.15)),0,0], footR:[24*pos(S(t,T,0.15)),0,0],
    upperarmR:[-26*s,0,-2], forearmR:[-14-10*s,0,0], handR:[-8*S(t,T,0.1),0,0], upperarmL:[-6+5*s,0,0], forearmL:[-6+2*b2,0,0], handL:[4*b2,0,0],
    earL:[9*S(t,T/2,0.2),0,0], earR:[9*S(t,T/2,0.25),0,0], earL2:[9*S(t,T/2,0.32),0,0], earR2:[9*S(t,T/2,0.37),0,0], tail1:[7*c2,12*S(t,T/2,0.1),0],
  };}},
  // backing off: small careful steps, her eyes stay on what she backs away from, the free paw out for balance; the ears tip forward and nod a beat behind each step
  walkBack:{T:0.7,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.004*s,0.016*c2-0.018,0], hips:[0,-4*s,2*s], spine:[-4,2*s,-1.5*s], chest:[0.9*b2,4*s,-1.2*s], head:[5+1.8*b2,-3*s,1*s],
    legL:[-28*s+4,0,0], legR:[28*s+4,0,0], footL:[-10*pos(-s),0,0], footR:[-10*pos(s),0,0],
    upperarmR:[-14*s,0,-6], forearmR:[-10-5*s,0,0], handR:[-6*S(t,T,0.1),0,0], upperarmL:[4*s-2,0,2], forearmL:[-4+2*b2,0,0], handL:[3*b2,0,0],
    earL:[5+6*S(t,T/2,0.2),0,0], earR:[5+6*S(t,T/2,0.25),0,0], earL2:[5+7*S(t,T/2,0.32),0,0], earR2:[5+7*S(t,T/2,0.37),0,0], tail1:[-8+4*c2,8*S(t,T/2,0.1),0],
  };}},
  walkLeft:{T:0.6,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.6,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // The bow combo: three shots, no stop between them. 1 a snap shot off a half draw (0.22 s); 2 a second snap shot, the paw already back at the quiver while the first arrow flies (0.54 s);
  // 3 she lays the bow over flat, takes three arrows at once, sinks behind a full draw and holds a beat, then looses all three in a spread (1.00 s) and the recoil hops her back half a step.
  combo:{T:1.5,staffPose:{from:0.02,to:1.36,fade:0.08,keys:COMBO_BOW},draw:{keys:COMBO.draw},offHand:{from:0.02,to:1.3,fade:0.08,keys:COMBO.off},keys:[
    {t:0,p:{}},
    {t:0.10,p:mix(STANCE,{earL:[-8,0,0],earR:[-8,0,0]})},
    // each snap shot: the back heel lifts as she draws, the front toes lift as the bow kicks, her head dips after the arrow and the tail jerks
    {t:0.20,p:mix(STANCE,{spine:[-1,-15,0],_hips:[0,-0.026,-0.014],footR:[16,0,0]})},
    {t:0.26,ease:'in',p:mix(STANCE,{spine:[-4,-12,0],chest:[-2,-20,0],head:[-5,58,0],_hips:[0,-0.016,-0.022],footL:[-11,0,0],earL:[16,0,0],earR:[16,0,0],earL2:[14,0,0],earR2:[14,0,0],tail1:[-16,0,0]})},
    {t:0.36,p:mix(STANCE,{spine:[2,-14,0],head:[-3,65,0],_hips:[0,-0.024,-0.008],tail1:[8,0,0]})},
    {t:0.50,p:mix(STANCE,{spine:[-1,-15,0],_hips:[0,-0.026,-0.012],footR:[17,0,0]})},
    {t:0.58,ease:'in',p:mix(STANCE,{spine:[-4,-12,0],chest:[-2,-20,0],head:[-5,58,0],_hips:[0,-0.016,-0.022],footL:[-11,0,0],earL:[16,0,0],earR:[16,0,0],earL2:[14,0,0],earR2:[14,0,0],tail1:[-16,0,0]})},
    {t:0.70,p:mix(STANCE,{spine:[3,-14,0],_hips:[0,-0.03,-0.004],tail1:[8,0,0]})},
    // 3: she sinks and leans back behind the full draw, front foot light
    {t:0.94,p:mix(STANCE,{hips:[0,-28,0],spine:[-7,-17,0],chest:[-4,-30,0],head:[2,68,0],_hips:[0,-0.05,-0.035],legL:[-22,0,4],legR:[16,0,-4],footL:[-8,0,0],earL:[-10,0,0],earR:[-10,0,0]})},
    {t:1.00,p:mix(STANCE,{hips:[0,-28,0],spine:[-8,-17,0],chest:[-4,-30,0],head:[2,68,0],_hips:[0,-0.052,-0.037],legL:[-22,0,4],legR:[16,0,-4],footL:[-8,0,0]})},
    {t:1.06,ease:'in',p:mix(STANCE,{hips:[0,-26,0],spine:[-12,-10,0],chest:[-6,-16,0],head:[6,48,0],_hips:[0,0.03,-0.075],legL:[-28,0,6],legR:[4,0,-6],footL:[14,0,0],footR:[18,0,0],earL:[26,0,0],earR:[26,0,0],earL2:[22,0,0],earR2:[22,0,0],tail1:[-20,0,0]})},
    {t:1.16,ease:'in',p:mix(STANCE,{spine:[6,-12,0],head:[-6,52,0],_hips:[0,-0.05,-0.085],legL:[-18,0,5],legR:[14,0,-5],earL:[-14,0,0],earR:[-14,0,0]})},
    {t:1.28,p:mix(STANCE,{spine:[2,-12,0],_hips:[0,-0.03,-0.08]})},
    {t:1.5,p:{}},
  ],fn:(t,T)=>tail(t,0.75,10)},
  // dash (Kesh 11-13, his second word on it): she jumps into the air and turns a somersault on the way to the spot, and while she is up she shoots three homing arrows at the nearest foe.
  // A deep crouch (0.11), a hard push (0.15), a tight forward somersault on the way up (0.20 to 0.48) during which her free paw takes three arrows from the quiver,
  // she opens out at the top side-on with the bow laid flat and all three on the string, draws (0.57) and looses (0.60), then drops and lands deep (0.75). One clip: she turns to face the jump.
  dash:{T:1.35,draw:{keys:DSH.draw},offHand:{from:0.40,to:0.74,fade:0.06,keys:DSH.off},staffPose:{from:0.45,to:0.76,fade:0.07,keys:DASH_BOW},keys:[
    {t:0,p:{}},
    {t:0.11,ease:'out',p:{_hips:[0,-0.135,-0.04],spine:[26,0,0],chest:[6,0,0],head:[-20,0,0],legL:[-38,0,8],footL:[40,0,0],legR:[-38,0,-8],footR:[40,0,0],earL:[26,0,6],earR:[26,0,-6],upperarmR:[30,0,0],forearmR:[-10,0,0]}},
    {t:0.17,ease:'in',p:{_hips:[0,0.02,0.02],spine:[-8,0,0],chest:[-4,0,0],head:[-2,0,0],legL:[16,0,2],footL:[44,0,0],legR:[16,0,-2],footR:[44,0,0],earL:[-34,0,0],earR:[-34,0,0],upperarmR:[-40,0,0],forearmR:[-20,0,0]}},
    {t:0.23,p:{spine:[34,0,0],chest:[14,0,0],head:[24,0,0],legL:[-84,0,9],footL:[10,0,0],legR:[-92,0,-9],footR:[10,0,0],earL:[-10,0,0],earR:[-10,0,0],upperarmR:[-44,0,10],forearmR:[-70,0,0],upperarmL:[-24,0,0],forearmL:[-40,0,0]}},
    {t:0.34,p:{spine:[40,0,0],chest:[16,0,0],head:[28,0,0],legL:[-98,0,10],footL:[4,0,0],legR:[-104,0,-10],footR:[4,0,0],earL:[8,0,0],earR:[8,0,0],upperarmR:[-40,0,10],forearmR:[-74,0,0],upperarmL:[-26,0,0],forearmL:[-44,0,0]}},
    {t:0.41,p:{spine:[30,-3,0],chest:[11,-5,0],head:[16,10,0],legL:[-80,0,9],footL:[8,0,0],legR:[-70,0,-9],footR:[10,0,0],earL:[-6,0,0],earR:[-6,0,0],upperarmL:[-18,0,0],forearmL:[-30,0,0]}},
    {t:0.46,p:{spine:[12,-6,0],chest:[4,-10,0],head:[2,24,0],legL:[-44,0,8],footL:[12,0,0],legR:[-22,0,-8],footR:[20,0,0],earL:[-20,0,0],earR:[-20,0,0]}},
    {t:0.53,p:mix(STANCE,{spine:[-7,-16,0],chest:[-3,-30,0],head:[4,66,0],_hips:[0,0,0],legL:[-36,0,7],footL:[18,0,0],legR:[20,0,-7],footR:[30,0,0],earL:[-12,0,0],earR:[-12,0,0]})},
    {t:0.60,p:mix(STANCE,{spine:[-10,-17,0],chest:[-4,-31,0],head:[5,68,0],_hips:[0,0,0],legL:[-40,0,7],footL:[20,0,0],legR:[24,0,-7],footR:[32,0,0]})},
    {t:0.64,ease:'in',p:mix(STANCE,{spine:[-16,-10,0],chest:[-7,-16,0],head:[8,48,0],_hips:[0,0,-0.03],legL:[-56,0,8],footL:[10,0,0],legR:[-30,0,-8],footR:[16,0,0],earL:[26,0,0],earR:[26,0,0],earL2:[22,0,0],earR2:[22,0,0],tail1:[-20,0,0]})},
    {t:0.72,p:{_hips:[0,0,-0.01],spine:[2,-6,0],chest:[0,-8,0],head:[0,18,0],legL:[-14,0,8],footL:[-12,0,0],legR:[-16,0,-8],footR:[-12,0,0],earL:[-36,0,0],earR:[-36,0,0],upperarmR:[-22,0,0]}},
    {t:0.79,ease:'in',p:{_hips:[0,-0.155,0.0],spine:[32,0,0],chest:[8,0,0],head:[-12,0,0],legL:[-40,0,11],footL:[42,0,0],legR:[-40,0,-11],footR:[42,0,0],earL:[38,0,8],earR:[38,0,-8],upperarmR:[34,0,0],forearmR:[-14,0,0]}},
    {t:0.89,p:{_hips:[0,-0.10,0.0],spine:[20,0,0],chest:[5,0,0],head:[-8,0,0],legL:[-28,0,9],footL:[30,0,0],legR:[-28,0,-9],footR:[30,0,0],earL:[-10,0,0],earR:[-10,0,0],upperarmR:[14,0,0]}},
    {t:1.06,p:{_hips:[0,-0.03,0.0],spine:[6,0,0],head:[-2,0,0],legL:[-8,0,3],footL:[8,0,0],legR:[-8,0,-3],footR:[8,0,0],earL:[6,0,0],earR:[6,0,0]}},
    {t:1.35,p:{}},
  ],fn:(t,T)=>{const h=DSH_H(t), v=Math.min(1,Math.max(0,(t-0.20)/0.28)), a=360*v*v*(3-2*v), r=a*Math.PI/180, c=0.10;   // the somersault turns about her middle, not her hip joint
    return {_hips:[0,h+c*(1-Math.cos(r)),-c*Math.sin(r)],hips:[a>=360?0:a,0,0]};}},
  // power shot (piercing shot, pinning arrow, the charged shots): the bow comes up high, she draws slowly as it lowers onto the target, holds, looses; the recoil rocks her back
  castPoint:{T:1.2,...(()=>{const s=seq([shot(0.08,0.18,0.52,0.62,1.0)]);return{draw:{keys:s.draw},offHand:{from:0.02,to:0.98,fade:0.08,keys:s.off},
     staffPose:{from:0.02,to:1.0,fade:0.1,keys:[{t:0.02,...CARRY},{t:0.18,p:[-0.135,0.59,0.205],d:[-0.1,0.94,-0.28],n:[1,0,0]},...bowShot(LEVEL,0.52,0.52,0.62,1.6).slice(1),{t:0.86,...LEVEL(0.3)},{t:1.0,...CARRY}]}};})(),keys:[
    {t:0,p:{}},
    {t:0.18,p:mix(STANCE,{spine:[-6,-14,0],head:[-10,54,0],_hips:[0,-0.01,-0.01],earL:[-10,0,0],earR:[-10,0,0]})},
    {t:0.52,p:mix(STANCE,{hips:[0,-28,0],spine:[-8,-17,0],chest:[-4,-30,0],head:[2,68,0],_hips:[0,-0.052,-0.035],legL:[-22,0,4],legR:[16,0,-4],footL:[-8,0,0]})},
    {t:0.62,p:mix(STANCE,{hips:[0,-28,0],spine:[-9,-17,0],chest:[-4,-30,0],head:[2,68,0],_hips:[0,-0.055,-0.038],legL:[-22,0,4],legR:[16,0,-4],footL:[-8,0,0]})},
    {t:0.68,ease:'in',p:mix(STANCE,{hips:[0,-26,0],spine:[-15,-10,0],chest:[-7,-16,0],head:[8,48,0],_hips:[0,-0.03,-0.07],legL:[-30,0,6],legR:[8,0,-6],footL:[18,0,0],earL:[28,0,0],earR:[28,0,0],earL2:[24,0,0],earR2:[24,0,0],tail1:[-20,0,0]})},
    {t:0.76,p:mix(STANCE,{spine:[-3,-11,0],head:[1,50,0],_hips:[0,-0.046,-0.082],legL:[-26,0,6],legR:[11,0,-6],footL:[-12,0,0],earL:[-20,0,0],earR:[-20,0,0],earL2:[-16,0,0],earR2:[-16,0,0],tail1:[14,0,0]})},
    {t:0.88,p:mix(STANCE,{spine:[5,-12,0],head:[-5,54,0],_hips:[0,-0.035,-0.06],earL:[8,0,0],earR:[8,0,0]})},
    {t:1.2,p:{}},
  ],fn:(t,T)=>{const q=bump(t,0.55,0.075)*Math.sin(2*Math.PI*t/0.055);   // the held full draw trembles, most in the ears
    return {...tail(t,0.6,10),chest:[0.6*q,0,0],head:[0,0,0.8*q],earL:[2.5*q,0,0],earR:[-2.5*q,0,0],earL2:[3.5*q,0,0],earR2:[-3.5*q,0,0]};}},
  // sky volley (volley, rain of arrows): she leans back, aims high and looses into the sky
  castBloom:{T:1.3,...(()=>{const s=seq([shot(0.10,0.20,0.44,0.52,0.9)]);return{draw:{keys:s.draw},offHand:{from:0.02,to:0.92,fade:0.08,keys:s.off},
     staffPose:{from:0.02,to:1.18,fade:0.12,keys:[{t:0.02,...CARRY},...bowShot(HIGH,0.20,0.44,0.52,1.2),{t:0.84,...HIGH(0.2)},{t:1.0,...LEVEL(0.15)},{t:1.18,...CARRY}]}};})(),keys:[
    {t:0,p:{}},
    {t:0.20,p:mix(STANCE,{spine:[-10,-14,0],chest:[-8,-24,0],head:[-22,50,0],_hips:[0,-0.03,-0.02],earL:[14,0,0],earR:[14,0,0]})},
    {t:0.44,p:mix(STANCE,{spine:[-15,-16,0],chest:[-11,-26,0],head:[-26,52,0],_hips:[0,-0.05,-0.035],legL:[-20,0,4],legR:[14,0,-4]})},
    {t:0.52,p:mix(STANCE,{spine:[-16,-16,0],chest:[-11,-26,0],head:[-26,52,0],_hips:[0,-0.052,-0.036],legL:[-20,0,4],legR:[14,0,-4]})},
    {t:0.58,ease:'in',p:mix(STANCE,{spine:[-9,-12,0],chest:[-6,-20,0],head:[-30,48,0],_hips:[0,-0.012,-0.03],footL:[14,0,0],footR:[24,0,0],earL:[24,0,0],earR:[24,0,0],earL2:[20,0,0],earR2:[20,0,0],tail1:[-16,0,0]})},
    {t:0.72,p:mix(STANCE,{spine:[-11,-13,0],chest:[-7,-22,0],head:[-38,46,0],_hips:[0,-0.02,-0.032],footL:[8,0,0],footR:[16,0,0],earL:[-22,0,0],earR:[-22,0,0],earL2:[-18,0,0],earR2:[-18,0,0]})},
    {t:0.90,p:mix(STANCE,{spine:[-6,-13,0],chest:[-5,-22,0],head:[-22,52,0],_hips:[0,-0.035,-0.03],earL:[-8,0,0],earR:[-8,0,0]})},
    {t:1.06,p:mix(STANCE,{spine:[-1,-13,0],chest:[-2,-22,0],head:[-6,58,0],_hips:[0,-0.03,-0.02],earL:[6,0,0],earR:[6,0,0]})},
    {t:1.3,p:{}},
  ],fn:(t,T)=>tail(t,0.65,10)},
  // trap (barbed trap, the marks set on the ground): she drops low, sets it on the floor ahead with the free paw and presses it down; the bow is held back out of the way
  castPlant:{T:1.1,offHand:{from:0.04,to:0.86,fade:0.1,keys:[{t:0.04,p:[-0.2,0.36,0.02]},{t:0.18,p:[-0.16,0.42,-0.06]},{t:0.34,p:[-0.05,0.13,0.27],ease:'in'},{t:0.42,p:[-0.05,0.08,0.28]},{t:0.50,p:[-0.05,0.15,0.27]},{t:0.56,p:[-0.05,0.08,0.28],ease:'in'},{t:0.66,p:[-0.05,0.08,0.28]},{t:0.86,p:[-0.19,0.36,0.04]}]},
    staffPose:{from:0.04,to:0.9,fade:0.1,keys:[{t:0.04,...CARRY},{t:0.3,p:[0.22,0.26,0.03],d:[0.25,0.9,-0.36],n:[1,0,0]},{t:0.62,p:[0.22,0.26,0.03],d:[0.25,0.9,-0.36],n:[1,0,0]},{t:0.9,...CARRY}]},keys:[
    {t:0,p:{}},
    {t:0.18,p:{spine:[4,-10,0],chest:[2,-14,0],head:[2,12,0],_hips:[0,-0.03,-0.02],legR:[8,0,0],earL:[-8,0,0],earR:[-8,0,0],tail1:[16,0,0]}},
    {t:0.34,ease:'in',p:{spine:[36,8,0],chest:[14,14,0],head:[-22,-10,0],_hips:[0,-0.11,0.07],legR:[-46,0,0],legL:[28,0,0],footL:[30,0,0],earL:[20,0,0],earR:[20,0,0],earL2:[16,0,0],earR2:[16,0,0],tail1:[30,26,0]}},
    {t:0.42,p:{spine:[40,8,0],chest:[15,14,0],head:[-20,-10,0],_hips:[0,-0.12,0.07],legR:[-46,0,0],legL:[28,0,0],footL:[28,0,0],tail1:[26,26,0]}},
    // she lifts the paw, glances up the way she came with one ear turned, and pats it down a second time
    {t:0.50,p:{spine:[35,8,0],chest:[13,14,0],head:[-30,16,0],_hips:[0,-0.108,0.065],legR:[-45,0,0],legL:[27,0,0],footL:[27,0,0],earL:[-6,0,-12],earR:[4,0,0],earL2:[-4,0,-10],tail1:[30,34,0]}},
    {t:0.56,ease:'in',p:{spine:[41,8,0],chest:[15,14,0],head:[-20,-8,0],_hips:[0,-0.122,0.07],legR:[-46,0,0],legL:[28,0,0],footL:[28,0,0],earL:[18,0,0],earR:[18,0,0],earL2:[16,0,0],earR2:[16,0,0],tail1:[22,20,0]}},
    {t:0.68,p:{spine:[36,8,0],chest:[14,13,0],head:[-28,-24,0],_hips:[0,-0.114,0.065],legR:[-44,0,0],legL:[26,0,0],footL:[26,0,0],earR:[-6,0,12],earR2:[-4,0,10],tail1:[28,30,0]}},
    {t:0.86,ease:'out',p:{spine:[-4,-4,0],chest:[-2,-6,0],head:[-4,8,0],_hips:[0,0.022,-0.01],footL:[18,0,0],footR:[18,0,0],earL:[-22,0,0],earR:[-22,0,0],earL2:[-18,0,0],earR2:[-18,0,0],tail1:[-14,0,0]}},
    {t:0.97,p:{spine:[3,0,0],_hips:[0,-0.016,0],earL:[8,0,0],earR:[8,0,0]}},
    {t:1.1,p:{}},
  ],fn:(t,T)=>tail(t,1.1,8)},
  // feather fan (feather fan, the spread shots): the bow is laid over flat, a short draw, and a fan of arrows leaves it level
  castSweep:{T:1.05,...(()=>{const s=seq([shot(0.06,0.14,0.30,0.36,0.7)]);return{draw:{keys:s.draw},offHand:{from:0.02,to:0.74,fade:0.08,keys:s.off},
     staffPose:{from:0.02,to:0.86,fade:0.1,keys:[{t:0.02,...CARRY},...bowShot(FLATP,0.14,0.30,0.36,1.0),{t:0.66,...FLATP(0.2)},{t:0.86,...CARRY}]}};})(),keys:[
    {t:0,p:{}},
    {t:0.14,p:mix(STANCE,{spine:[6,-12,0],chest:[3,-18,0],head:[-6,44,0],_hips:[0,-0.045,-0.01],legL:[-20,0,6],legR:[16,0,-6]})},
    {t:0.36,p:mix(STANCE,{spine:[8,-14,0],chest:[4,-22,0],head:[-8,50,0],_hips:[0,-0.06,-0.02],legL:[-22,0,6],legR:[18,0,-6]})},
    {t:0.42,ease:'in',p:mix(STANCE,{spine:[2,-8,0],chest:[0,-12,0],head:[-2,34,0],_hips:[0,-0.045,-0.04],legL:[-22,0,6],legR:[14,0,-6],footL:[-12,0,0],earL:[24,0,0],earR:[24,0,0],earL2:[20,0,0],earR2:[20,0,0],tail1:[-18,0,0]})},
    {t:0.54,p:mix(STANCE,{spine:[7,-11,0],chest:[3,-17,0],head:[-7,44,0],_hips:[0,-0.058,-0.034],legL:[-20,0,6],legR:[15,0,-6],earL:[-14,0,0],earR:[-14,0,0],earL2:[-10,0,0],earR2:[-10,0,0],tail1:[10,0,0]})},
    {t:0.66,p:mix(STANCE,{spine:[5,-10,0],chest:[2,-16,0],head:[-5,42,0],_hips:[0,-0.05,-0.03],legL:[-20,0,6],legR:[15,0,-6]})},
    {t:1.05,p:{}},
  ],fn:(t,T)=>tail(t,1.05,10)},
  // vault shot (the weapon move): she springs straight back off both feet and shoots at the top of the hop, down the line she just left
  vault:{T:1.1,...(()=>{const s=seq([shot(0.08,0.17,0.30,0.36,0.75)]);return{draw:{keys:s.draw},offHand:{from:0.02,to:0.76,fade:0.08,keys:s.off},
     staffPose:{from:0.02,to:0.9,fade:0.1,keys:[{t:0.02,...CARRY},{t:0.16,...sh(LEVEL(0.75),0.03,-0.04)},{t:0.30,...sh(LEVEL(0),0.11,-0.14)},{t:0.36,...sh(LEVEL(0),0.13,-0.17)},{t:0.40,...sh(LEVEL(-0.45,0.012),0.11,-0.19),ease:'in'},{t:0.56,...sh(LEVEL(0.3),-0.05,-0.22)},{t:0.72,...sh(LEVEL(0.3),-0.02,-0.22)},{t:0.9,...CARRY}]}};})(),keys:[
    {t:0,p:{}},
    {t:0.10,p:mix(STANCE,{spine:[10,-10,0],_hips:[0,-0.07,0.02],legL:[-6,0,4],legR:[-2,0,-4],earL:[12,0,0],earR:[12,0,0]})},
    {t:0.24,ease:'out',p:mix(STANCE,{spine:[-4,-14,0],_hips:[0,0.10,-0.10],legL:[-34,0,6],legR:[-24,0,-6],footL:[30,0,0],footR:[30,0,0],earL:[-26,0,0],earR:[-26,0,0],earL2:[-20,0,0],earR2:[-20,0,0],tail1:[24,0,0]})},
    {t:0.36,p:mix(STANCE,{spine:[4,-16,0],chest:[2,-26,0],head:[6,60,0],_hips:[0,0.13,-0.17],legL:[-30,0,6],legR:[-20,0,-6],footL:[24,0,0],footR:[24,0,0],earL:[-10,0,0],earR:[-10,0,0]})},
    {t:0.46,p:mix(STANCE,{spine:[-4,-12,0],head:[2,52,0],_hips:[0,0.07,-0.21],legL:[-16,0,5],legR:[4,0,-5],footL:[10,0,0],footR:[14,0,0],earL:[24,0,0],earR:[24,0,0],earL2:[20,0,0],earR2:[20,0,0]})},
    {t:0.56,ease:'in',p:mix(STANCE,{spine:[10,-12,0],head:[-8,52,0],_hips:[0,-0.07,-0.23],legL:[-18,0,5],legR:[12,0,-5],footL:[-12,0,0],footR:[-4,0,0],earL:[-18,0,0],earR:[-18,0,0],earL2:[-14,0,0],earR2:[-14,0,0],tail1:[-18,0,0]})},
    {t:0.64,p:mix(STANCE,{spine:[13,-12,0],head:[-10,54,0],_hips:[0,-0.058,-0.228],legL:[-17,0,5],legR:[13,0,-5],earL:[20,0,0],earR:[20,0,0],earL2:[18,0,0],earR2:[18,0,0],tail1:[12,0,0]})},
    {t:0.74,p:mix(STANCE,{spine:[3,-12,0],_hips:[0,-0.035,-0.22],earL:[-6,0,0],earR:[-6,0,0]})},
    {t:1.1,p:{}},
  ],fn:(t,T)=>tail(t,0.55,10)},
  // downed: the blow throws her head and ears back, her legs give, she folds forward onto the bow and bounces once; the ears flop on over her face a beat late
  downFall:{T:0.85,keys:[
    {t:0,p:{}},
    {t:0.09,ease:'out',p:{spine:[-18,0,4],chest:[-6,0,0],head:[-16,0,-8],_hips:[0,0.012,-0.04],legL:[-8,0,3],legR:[6,0,-3],upperarmR:[-30,0,-40],forearmR:[-20,0,0],upperarmL:[-20,0,26],earL:[30,0,0],earR:[30,0,0],earL2:[24,0,0],earR2:[24,0,0],tail1:[-20,0,0]}},
    {t:0.24,p:{hips:[10,0,0],spine:[2,0,-4],head:[10,0,6],_hips:[0,-0.05,-0.02],legL:[-30,0,2],legR:[-22,0,-2],footL:[20,0,0],footR:[20,0,0],upperarmR:[-50,0,-16],forearmR:[-30,0,0],upperarmL:[-30,0,10],earL:[-24,0,0],earR:[-24,0,0],earL2:[-20,0,0],earR2:[-20,0,0]}},
    {t:0.38,p:{hips:[34,0,0],spine:[10,0,0],head:[2,0,0],_hips:[0,-0.09,0.02],legL:[-40,0,0],legR:[-34,0,0],upperarmR:[-80,0,-10],upperarmL:[-60,0,-10],earL:[-10,0,6],earR:[-14,0,-6]}},
    {t:0.56,ease:'in',p:{...PRONE,_hips:[0,-0.2,0.0],earL:[-22,0,8],earR:[-22,0,-8],earL2:[-18,0,0],earR2:[-18,0,0]}},
    {t:0.64,p:{...PRONE,_hips:[0,-0.172,0.0],head:[-70,0,0],earL:[34,0,8],earR:[34,0,-8],earL2:[30,0,0],earR2:[30,0,0],tail1:[-44,0,0]}},
    {t:0.74,p:{...PRONE,_hips:[0,-0.192,0.0],head:[-58,0,0],earL:[26,0,8],earR:[26,0,-8],earL2:[20,0,0],earR2:[20,0,0]}},
    {t:0.85,p:PRONE},
  ]},
  // lying: slow breath, one ear still listening, a back foot that twitches now and then
  downLie:{T:3.0,loop:true,keys:[{t:0,p:PRONE},{t:3.0,p:PRONE}],fn:(t,T)=>({chest:[2.2*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],earL:[0,0,-7*bump(t,1.6,0.08)],earL2:[0,0,-6*bump(t,1.66,0.09)],earR2:[4*bump(t,0.7,0.1),0,0],footR:[9*bump(t,2.3,0.06)-5*bump(t,2.42,0.06),0,0],tail1:[0,8*S(t,T),0]})},
  // revive: her head comes up first and one ear stands, she gathers her legs under her, springs up onto her toes, and shakes her head so both ears flap after it
  revive:{T:1.2,keys:[
    {t:0,p:PRONE},
    {t:0.14,p:{...PRONE,head:[-46,0,0],earL:[36,0,8],earR:[12,0,-8],earL2:[22,0,0]}},
    {t:0.36,p:{hips:[48,0,0],spine:[6,0,0],head:[-40,0,0],_hips:[0,-0.14,0.0],legL:[-60,0,4],legR:[-50,0,-4],upperarmR:[-60,0,-10],upperarmL:[-40,0,-10],earL:[14,0,0],earR:[26,0,0]}},
    {t:0.62,p:{spine:[16,0,0],head:[-10,0,0],_hips:[0,-0.06,0],legL:[-22,0,0],legR:[-14,0,0],footL:[10,0,0],footR:[10,0,0],upperarmR:[-10,0,0],earL:[-8,0,0],earR:[-4,0,0]}},
    {t:0.80,ease:'out',p:{spine:[-5,0,0],head:[-6,0,9],_hips:[0,0.03,0],footL:[20,0,0],footR:[20,0,0],upperarmR:[-20,0,-24],upperarmL:[-20,0,10],earL:[-18,0,10],earR:[-18,0,10],earL2:[-14,0,12],earR2:[-14,0,12]}},
    {t:0.92,p:{spine:[2,0,0],head:[0,0,-9],_hips:[0,-0.012,0],earL:[4,0,-12],earR:[4,0,-12],earL2:[0,0,-14],earR2:[0,0,-14],tail1:[0,16,0]}},
    {t:1.03,p:{head:[0,0,5],earL:[0,0,8],earR:[0,0,8],earL2:[0,0,10],earR2:[0,0,10],tail1:[0,-12,0]}},
    {t:1.2,p:{}},
  ]},
  // hurt: a startled hare. The blow lifts her off both feet with her ears left behind, the bow pulled in and the free paw up at her face (0.06); she lands back and low, ears whipping back (0.17);
  // then the ears come up one after the other and she shakes it off with a flick of the tail
  hurt:{T:0.6,keys:[
    {t:0,p:{}},
    {t:0.06,ease:'out',p:{spine:[-20,0,-5],chest:[-9,6,0],head:[-16,-10,7],_hips:[0,0.022,-0.05],legL:[-16,0,4],legR:[-10,0,-4],footL:[22,0,0],footR:[26,0,0],
      upperarmR:[-46,0,-26],forearmR:[-58,0,0],handR:[-20,0,0],upperarmL:[-22,0,16],forearmL:[-26,0,0],earL:[38,0,-6],earR:[38,0,6],earL2:[30,0,0],earR2:[30,0,0],tail1:[-26,0,0]}},
    {t:0.17,ease:'in',p:{spine:[12,0,-2],chest:[5,3,0],head:[8,-5,3],_hips:[0,-0.055,-0.09],legL:[-26,0,5],legR:[18,0,-5],footL:[18,0,0],footR:[8,0,0],
      upperarmR:[-30,0,-14],forearmR:[-44,0,0],upperarmL:[-12,0,8],forearmL:[-14,0,0],earL:[-30,0,0],earR:[-30,0,0],earL2:[-24,0,0],earR2:[-24,0,0],tail1:[16,0,0]}},
    {t:0.29,p:{spine:[5,0,0],chest:[2,0,0],head:[2,0,-8],_hips:[0,-0.03,-0.07],legL:[-16,0,4],legR:[11,0,-4],upperarmR:[-12,0,-6],forearmR:[-20,0,0],earL:[10,0,-8],earR:[-14,0,0],earL2:[8,0,0],earR2:[-12,0,0]}},
    {t:0.39,p:{spine:[1,0,0],head:[-2,0,7],_hips:[0,-0.012,-0.035],legL:[-8,0,2],legR:[5,0,-2],earL:[-4,0,0],earR:[8,0,8],earR2:[6,0,0],tail1:[0,14,0]}},
    {t:0.49,p:{head:[0,0,-3],_hips:[0,-0.004,-0.01],earL:[3,0,0],earR:[-3,0,0],tail1:[0,-8,0]}},
    {t:0.6,p:{}},
  ]},
  // wave: a quick dip, then up on her toes with the free paw high over her head, waving it wide; she bounces with each wave, her head tips to the paw, the far ear flops out and swings, the tail wags.
  // She ends with a small bob of a bow, ears dipping forward, and springs back up
  wave:{T:2.2,keys:[
    {t:0,p:{}},
    {t:0.14,p:{_hips:[0,-0.03,0],spine:[6,0,0],head:[4,0,0],legL:[-10,0,2],legR:[-10,0,-2],footL:[10,0,0],footR:[10,0,0],earL:[10,0,0],earR:[10,0,0],upperarmR:[-10,0,-30],forearmR:[-30,0,0]}},
    {t:0.34,ease:'out',p:{_hips:[0,0.012,0],spine:[-4,0,5],chest:[-2,8,3],head:[-8,-6,6],footL:[18,0,0],footR:[18,0,0],upperarmR:[8,0,-150],forearmR:[0,0,4],handR:[0,0,-10],upperarmL:[-6,0,6],earL:[-10,0,-14],earR:[-8,0,-10],earL2:[-8,0,-34],earR2:[-6,0,-8],tail1:[-14,0,0]}},
    {t:1.56,p:{_hips:[0,0.012,0],spine:[-4,0,5],chest:[-2,8,3],head:[-8,-6,6],footL:[18,0,0],footR:[18,0,0],upperarmR:[8,0,-150],forearmR:[0,0,4],handR:[0,0,-10],upperarmL:[-6,0,6],earL:[-10,0,-14],earR:[-8,0,-10],earL2:[-8,0,-34],earR2:[-6,0,-8],tail1:[-14,0,0]}},
    {t:1.74,ease:'in',p:{_hips:[0,-0.035,0],spine:[10,0,0],chest:[4,0,0],head:[10,0,0],legL:[-12,0,2],legR:[-12,0,-2],footL:[12,0,0],footR:[12,0,0],upperarmR:[-14,0,-40],forearmR:[-40,0,0],earL:[22,0,0],earR:[22,0,0],earL2:[18,0,0],earR2:[18,0,0]}},
    {t:1.94,p:{_hips:[0,0.006,0],spine:[-2,0,0],head:[-3,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:2.2,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.95,0.5), ph=2*Math.PI*(t-0.34)/0.34, w=Math.sin(ph), w2=Math.sin(ph-0.7), hop=Math.abs(Math.sin(ph/2));
    return{upperarmR:[0,0,-10*e*Math.abs(w)],forearmR:[0,0,-24*e*w2],handR:[0,0,-16*e*Math.sin(ph-1.3)],_hips:[0.006*e*w,0.014*e*hop,0],spine:[0,0,2.5*e*w],head:[0,0,4*e*w2],footL:[8*e*hop,0,0],footR:[8*e*hop,0,0],
      earL2:[0,0,-8*e*w2],earR:[0,0,6*e*w2],earR2:[0,0,8*e*Math.sin(ph-1.4)],tail1:[0,18*e*Math.sin(2*Math.PI*t/0.17),0]};}},
};
for(const n of ['combo','castPoint','castSweep','castPlant'])CLIPS[n].mech=true;
// ---- derived clips: each single hit of the tap chain keeps only its own shot
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 const one=(o,sh,bow,to)=>{const s=seq([sh]);return{draw:{keys:s.draw},offHand:{from:-0.2,to,fade:0.1,keys:s.off},staffPose:{from:o>0?-0.2:0.02,to:to+0.06,fade:0.12,keys:bow}};};
 CLIPS.combo1={mech:true,T:0.6,keys:cut(K,0,0.26,0.34),fn:sway,...one(0,shot(0.07,0.13,0.20,0.22,0.55),[{t:0.02,...CARRY},...bowShot(LEVEL,0.13,0.20,0.22,0.7),{t:0.40,...LEVEL(0.3)}],0.38)};
 CLIPS.combo2={mech:true,T:0.6,keys:cut(K,0.26,0.58,0.28),fn:sway,...one(0.26,shot(0.06,0.14,0.24,0.28,0.62),[{t:0,...LEVEL(0.3)},...bowShot(LEVEL,0.14,0.24,0.28,0.7),{t:0.46,...LEVEL(0.3)}],0.42)};
 CLIPS.combo3={mech:true,T:1.0,keys:cut(K,0.58,1.28,0.3),fn:sway,...one(0.58,shot(0.08,0.18,0.36,0.42,0.85,3),[{t:0,...LEVEL(0.3)},...bowShot(FLAT3,0.18,0.36,0.42,1.3),{t:0.62,...FLAT3(0.3)},{t:0.8,...LEVEL(0.3)}],0.74)};
 CLIPS.downCrawl={T:1.2,loop:true,keys:[{t:0,p:PRONE},{t:1.2,p:PRONE}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   hips:[0,0,4*s],spine:[0,4*s,0],head:[3*c,0,0],upperarmR:[-5*pos(c),0,16*s],upperarmL:[-4*pos(-c),0,10*s],legL:[10*pos(-c),0,0],legR:[10*pos(c),0,0],earL:[4*c,0,0],earR:[4*c,0,0],earL2:[6*S(t,T,0.15),0,0],earR2:[6*S(t,T,0.2),0,0],tail1:[0,10*s,0]};}};
}
// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 // run: a bounding run, both feet leaving the ground, far forward, the bow tucked low and level, the ears laid back and streaming
 CLIPS.run={T:0.4,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
   _hips:[0.005*s,0.040*c2-0.036,0], hips:[0,7*s,3*s], spine:[20+4.5*c2,-4*s,-3*s], chest:[4+2.5*b2,-8*s,1.5*s], head:[-20+3.5*b2,5*s,0],
   legL:[-52*s,0,0], legR:[52*s,0,0], footL:[36*pos(-S(t,T,0.15)),0,0], footR:[36*pos(S(t,T,0.15)),0,0],
   upperarmR:[-42*s,0,-2], forearmR:[-40-12*s,0,0], upperarmL:[-14+6*s,0,4], forearmL:[-24+4*b2,0,0], handL:[4*b2,0,0], tail1:[16+9*c2,0,0],
   earL:[-34+9*S(t,T/2,0.2),0,0], earR:[-34+9*S(t,T/2,0.26),0,0], earL2:[-20+11*S(t,T/2,0.33),0,0], earR2:[-20+11*S(t,T/2,0.39),0,0],
 };}};
 CLIPS.runBack={T:0.4,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.35)};
 CLIPS.runLeft={T:0.4,loop:true,fn:sc(CLIPS.walkLeft.fn,0.6,1.35)};
 CLIPS.runRight={T:0.4,loop:true,fn:sc(CLIPS.walkRight.fn,0.6,1.35)};
}

// the bow goes from her side to the aim (and back) low and out in front, never up past her face
{const VIA={p:[0.05,0.39,0.30],d:[-0.04,1,0.16],n:[1,0,0]};
 for(const n in CLIPS){const c=CLIPS[n]; if(!c.draw)continue; const K=c.staffPose.keys;
  if(K[0].p===CARRY.p)K.splice(1,0,{t:+((K[0].t*0.45+K[1].t*0.55)).toFixed(3),...VIA});
  const L=K.length-1; if(K[L].p===CARRY.p)K.splice(L,0,{t:+((K[L-1].t+K[L].t)/2).toFixed(3),...VIA});}}
