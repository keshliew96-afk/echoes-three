// Euler degrees XYZ, added to BASE. +x is her left, +y up, +z forward.
export const CFG={name:'healer',weaponFile:'staff2.glb',hand:'handR',scale:0.8,grip:[0,0.44,0],palm:[-0.028,-0.03,0.012],tilt:[6,0,4],tiltOrder:'XYZ',eulerAdd:true,carry:0.45,lag:{chest:0.012,head:0.035,upperarmL:0.02,forearmR:0.02,handR:0.04,forearmL:0.03,handL:0.05},
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[-0.028,0.028,0.02,0.8,-0.028,0.028],pushMode:'away',sole:[[0,-0.05,-0.03],[0,-0.05,0.1]],
  springs:[{bone:'earL',k:520,z:0.42,max:26,tip:[0.13,0.09,0]},{bone:'earR',k:520,z:0.42,max:26,tip:[-0.13,0.09,0]},
    {bone:'tail1',k:420,z:0.5,max:16},{bone:'tail2',k:330,z:0.42,max:22},{bone:'tail3',k:260,z:0.38,max:26},{bone:'tail4',k:210,z:0.36,max:30},{bone:'tail5',k:170,z:0.34,max:34,tip:[0.03,0.12,-0.01]}]};
export const BASE={
  upperarmR:[-8,26,8], forearmR:[-10,22,0],
  upperarmL:[0,-8,-22], forearmL:[0,-10,-4],
  // the Tripo tail curls to her left; these straighten it so it trails behind her in a soft S (Kesh, 11-12)
  tail1:[13,26.3,-20.2], tail2:[-0.6,24,-5], tail3:[-4.8,11.5,-0.7], tail4:[0.6,0.6,1.5], tail5:[-14.7,6.1,-40.6],
};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2; // a soft max(0,x): no corner where a foot leaves the floor
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
const tailSway=(t,T,amp,lag=0.12)=>{const o={};for(let i=1;i<=5;i++)o['tail'+i]=[0,amp*S(t,T,lag*i)*(0.6+0.15*i),0];return o;};
const strafe=(t,T,dir)=>{const o=strafe0(t,T,dir);for(const j in o)o[j]=o[j].map(v=>v*1.3);return o;};
const strafe0=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0,0.010*c2-0.006,0], hips:[0,0,-3*dir*s], spine:[1,0,2.5*dir*s], chest:[0,0,1.5*dir*s], head:[1.5*c2,0,-3*dir*s],
    upperarmL:[0,0,(dir>0?5:-3)*s], upperarmR:[0,0,(dir>0?3:-5)*s],
    forearmL:[-6-5*c2,0,0], handL:[0,0,5*s], handR:[0,0,3*s], earL:[4*S(t,T/2,0.2),0,3*dir*s], earR:[4*S(t,T/2,0.2),0,3*dir*s], ...tailSway(t,T,13)};
  o['leg'+lead]=[-12*pos(c),0,22*dir*s]; o["leg"+trail]=[-12*pos(-c),0,-20*dir*s];
  o['foot'+lead]=[8*pos(c),0,0]; o['foot'+trail]=[8*pos(-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-6*d],head:[-4,0,14*d],_hips:[0.06*d*k,0.06,0],earL:[0,0,16*d],earR:[0,0,16*d],tail1:[0,-22*d,0],tail2:[0,-18*d,0]};
    p['leg'+L]=[-18,0,24*d];p['leg'+R]=[6,0,-26*d];p['upperarm'+R]=[0,0,-(R==='L'?-1:1)*28];p['upperarm'+L]=[10,0,0];return p;};
  const crouch={spine:[4,0,8*d],_hips:[-0.02*d,-0.035,0]};crouch['leg'+L]=[0,0,-6*d];crouch['leg'+R]=[0,0,8*d];
  const land={spine:[2,0,-6*d],_hips:[0.03*d,-0.03,0],earL:[0,0,-10*d],earR:[0,0,-10*d],head:[0,0,4*d]};land['leg'+L]=[0,0,12*d];land['leg'+R]=[0,0,-6*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.42,p:air(1.15)},{t:0.54,ease:'in',p:land},{t:0.7,p:{}}];}
let rel=null;
// The thrown staff: it leaves the hand at tr, turns flat and spins like a blade about a point near its heavy head,
// runs out along the aim line on the right-hand lane, comes back on the left-hand lane, and is in the hand again at tc.
const fly=(t,M,THREE,tr,tc,D=2.4)=>{ if(t<=tr+1e-6){rel=M.clone();return M;}
  const u=Math.min(1,(t-tr)/(tc-tr)), p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(); rel.decompose(p,q,s);
  const PIV=0.6, piv0=new THREE.Vector3(0,PIV,0).applyMatrix4(rel);
  const out=Math.sin(Math.PI*u), ease=u*u*(3-2*u);
  const piv=new THREE.Vector3(piv0.x-0.2*Math.sin(2*Math.PI*u)*out, piv0.y+(0.72-piv0.y)*Math.min(1,u*5)+0.05*Math.sin(u*Math.PI*4), piv0.z+D*Math.sin(Math.PI*ease));
  const flat=new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3*Math.cos(Math.PI*ease),0,0)); // upright, leaning the way it travels
  const spin=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-u*Math.PI*2*2);
  const k=Math.min(1,u*6), q2=q.clone().slerp(spin.multiply(flat),k*k*(3-2*k));
  const hp=new THREE.Vector3(),hq=new THREE.Quaternion(),hs=new THREE.Vector3(); M.decompose(hp,hq,hs);
  const b=Math.min(1,Math.max(0,(t-(tc-0.10))/0.10)), bb=b*b*(3-2*b); q2.slerp(hq,bb);
  const p2=piv.clone().sub(new THREE.Vector3(0,PIV,0).multiply(s).applyQuaternion(q2)); p2.lerp(hp,bb);
  return new THREE.Matrix4().compose(p2,q2,s); };
// hit 3 of the combo: the staff stays in her hand; she thrusts the fork forward, level, and holds it out while the gem is away
function SP3(o){return {from:0.84-o,to:1.36-o,fade:0.08,keys:[
  {t:0.84-o,p:[-0.19,0.50,0.14],d:[0,0.85,0.30]},
  {t:0.90-o,p:[-0.15,0.43,0.40],d:[0.05,0.22,0.97],ease:'in'},
  {t:1.05-o,p:[-0.15,0.45,0.37],d:[0.05,0.34,0.94]},
  {t:1.22-o,p:[-0.16,0.46,0.30],d:[0.03,0.62,0.78]},
  {t:1.32-o,p:[-0.17,0.46,0.24],d:[0,0.86,0.50]},
  {t:1.36-o,p:[-0.18,0.46,0.20],d:[0,0.92,0.38]}]};}
export const CLIPS={
  idle:{T:2.4,loop:true,fn:(t,T)=>{const b=S(t,T), b2=S(t,T,0.08), w=S(t,T,0.25), look=S(t,T,0.35)+0.35*S(t,T/2,0.1); return {
    _hips:[0.010*w,0.011*b,0], hips:[0,1.5*w,2.4*w], spine:[3*b,-1*w,-2.0*w], chest:[2.6*b2,-1.2*look,-0.8*w], head:[-3.5*S(t,T,0.12)+1.2*S(t,T/2,0.3),6*look,2*S(t,T,0.6)],
    earL:[3*S(t,T/2,0.15),0,12*bump(t,1.3,0.07)-18*bump(t,1.42,0.08)], earR:[3*S(t,T/2,0.2),0,-10*bump(t,0.5,0.07)+16*bump(t,0.62,0.08)],
    upperarmL:[4*S(t,T,0.1),0,-4*b], forearmL:[-5*S(t,T,0.18),0,0], handL:[0,0,5*S(t,T,0.26)], upperarmR:[3*S(t,T,0.05),0,1.5*w], handR:[0,0,2.5*S(t,T,0.2)],
    legL:[0,0,-1.2*w], legR:[0,0,-1.2*w], ...tailSway(t,T,13)};}},
  walk:{T:0.7,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),a=S(t,T,0.06);return{
    _hips:[0.012*s,0.02*c2-0.01,0.006*c2], hips:[2*c2,9*s,4.5*s], spine:[6+1.5*c2,-5*s,-3.5*s], chest:[1,-10*s,-1.5*s], head:[-4+3.5*S(t,T/2,0.31),6*s,1.5*s],
    legL:[-38*s,0,0], legR:[38*s,0,0], footL:[26*pos(-S(t,T,0.15)),0,0], footR:[26*pos(S(t,T,0.15)),0,0],
    upperarmL:[36*a,0,-3], forearmL:[-16+16*S(t,T,0.14),0,0], handL:[10*S(t,T,0.22),0,0], upperarmR:[-11*a,0,2], forearmR:[-4*S(t,T,0.1),0,0], handR:[0,0,3*s],
    earL:[9*S(t,T/2,0.2),0,3*s], earR:[9*S(t,T/2,0.2),0,3*s], ...tailSway(t,T,18),
  };}},
  walkBack:{T:0.76,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0,0.010*c2-0.006,0], hips:[0,-4*s,2*s], spine:[-4,2*s,-1.5*s], chest:[0,4*s,0], head:[3+1.5*c2,-3*s,0],
    legL:[-30*s+4,0,0], legR:[30*s+4,0,0], footL:[-10*pos(-s),0,0], footR:[-10*pos(s),0,0],
    upperarmL:[14*s,0,-4], forearmL:[-6,0,0], upperarmR:[-3*s,0,0],
    earL:[-4*S(t,T/2,0.2),0,0], earR:[-4*S(t,T/2,0.2),0,0], ...tailSway(t,T,9),
  };}},
  walkLeft:{T:0.7,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.7,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // Kesh's combo (11-12): 1 a heavy downward swing that shoots a bolt, 2 the swing back up that shoots a bolt,
  // 3 she throws the staff at the enemy, it spins out flat, cuts everything on its path, and comes back to her hand.
  // The low finish of hit 1 is the wind-up of hit 2; the high finish of hit 2 is the wind-up of the throw.
  // Staff aim = upperarmR x + forearmR x + handR x + torso pitch: about 0 is upright, 90 level forward, 130 tip low in front, negative behind her.
  combo:{T:1.95,keys:[
    {t:0,p:{}},
    // 1 wind-up: a small lift of the staff, weight barely moves. The gem does the work, not the wood.
    {t:0.14,p:{chest:[-6,-10,0],spine:[-4,-4,0],head:[-4,8,0],upperarmR:[-104,-6,0],forearmR:[-24,0,0],handR:[100,0,0],upperarmL:[-30,0,-8],forearmL:[-14,0,0],_hips:[-0.005,0.02,-0.015],legL:[-4,0,0],legR:[6,0,0],footL:[10,0,0],footR:[12,0,0],earL:[-12,0,0],earR:[-12,0,0]}},
    // 1 contact: a sharp downward flick with a half step; the bolt leaves the gem
    {t:0.24,ease:'in',p:{chest:[5,6,0],spine:[6,2,0],head:[-6,-3,0],upperarmR:[-46,4,0],forearmR:[-6,0,0],handR:[128,0,0],upperarmL:[18,0,-16],forearmL:[-10,0,0],_hips:[0.005,-0.03,0.04],legL:[-16,0,0],legR:[12,0,0],footR:[12,0,0],earL:[16,0,0],earR:[16,0,0]}},
    // 1 follow-through: the tip dips, she stays light on her feet. This is hit 2's wind-up.
    {t:0.34,p:{chest:[8,8,0],spine:[10,3,0],head:[-10,-5,0],upperarmR:[-20,6,0],forearmR:[-4,0,0],handR:[96,0,0],upperarmL:[24,0,-18],_hips:[0.005,-0.045,0.045],legL:[-18,0,0],legR:[13,0,0],footR:[10,0,0]}},
    {t:0.44,p:{chest:[9,9,0],spine:[11,4,0],head:[-10,-6,0],upperarmR:[-14,8,0],forearmR:[-4,0,0],handR:[92,0,0],upperarmL:[26,0,-18],_hips:[0.005,-0.05,0.045],legL:[-19,0,0],legR:[13,0,0],footR:[8,0,0]}},
    // 2 contact: she rises onto her toes and flicks the staff back up; second bolt
    {t:0.56,ease:'in',p:{chest:[-3,-8,0],spine:[-2,-3,0],head:[-4,6,0],upperarmR:[-62,-4,0],forearmR:[-8,0,0],handR:[138,0,0],upperarmL:[-12,0,18],forearmL:[-12,0,0],_hips:[-0.005,0.035,0.07],legR:[-16,0,0],legL:[14,0,0],footL:[20,0,0],earL:[-12,0,0],earR:[-12,0,0]}},
    // 2 follow-through: the staff comes up beside her head, upright. This is the wind-up of the send.
    {t:0.68,p:{chest:[-8,-16,0],spine:[-5,-6,0],head:[-4,14,0],upperarmR:[-100,-14,0],forearmR:[-30,0,0],handR:[130,0,0],upperarmL:[-40,0,6],forearmL:[-20,0,0],_hips:[-0.01,0.025,0.06],legR:[-10,0,0],legL:[8,0,0],footL:[14,0,0]}},
    // 3 gather: she draws the staff in and back, free hand cups toward it, a breath before letting it go
    {t:0.80,p:{chest:[-8,-22,0],spine:[-5,-8,0],head:[0,20,0],upperarmR:[-92,-18,0],forearmR:[-44,0,0],handR:[136,0,0],upperarmL:[-58,0,-14],forearmL:[-40,0,0],_hips:[-0.02,-0.02,0.04],legR:[8,0,-3],legL:[-8,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    // 3 release (Kesh 11-12: the staff stays in her hand, only the gem flies): she thrusts the fork forward and the gem leaves it
    {t:0.90,ease:'in',p:{chest:[9,16,0],spine:[7,6,0],head:[-8,-12,0],upperarmR:[-62,8,0],forearmR:[-6,0,0],handR:[142,0,0],upperarmL:[-54,0,-10],forearmL:[-10,0,0],_hips:[0.01,-0.03,0.09],legL:[-22,0,0],legR:[16,0,0],footR:[18,0,0],earL:[18,0,0],earR:[18,0,0]}},
    // both hands stay out, guiding it
    {t:1.05,p:{chest:[6,10,0],spine:[5,4,0],head:[-6,-8,0],upperarmR:[-58,6,0],forearmR:[-10,0,0],handR:[132,0,0],upperarmL:[-48,0,-8],forearmL:[-12,0,0],_hips:[0.01,-0.02,0.085],legL:[-20,0,0],legR:[14,0,0],footR:[14,0,0]}},
    // she draws it home
    {t:1.22,p:{chest:[-2,4,0],spine:[0,2,0],head:[-6,-3,0],upperarmR:[-70,2,0],forearmR:[-16,0,0],handR:[112,0,0],upperarmL:[-30,0,-6],forearmL:[-20,0,0],_hips:[0.005,0.0,0.06],legL:[-14,0,0],legR:[10,0,0],footR:[8,0,0]}},
    // catch: soft, a small rock back
    {t:1.32,p:{chest:[-5,-8,0],spine:[-3,-3,0],head:[0,6,0],upperarmR:[-64,-4,0],forearmR:[-26,0,0],handR:[98,0,0],upperarmL:[-14,0,8],_hips:[0,-0.02,0.04],legL:[-8,0,0],legR:[8,0,0],earL:[12,0,0],earR:[12,0,0]}},
    {t:1.42,p:{chest:[-6,-10,0],spine:[-4,-4,0],head:[0,7,0],upperarmR:[-44,-6,0],forearmR:[-34,0,0],handR:[80,0,0],upperarmL:[-12,0,10],_hips:[0,-0.028,0.02],legL:[-5,0,0],legR:[5,0,0]}},
    {t:1.65,p:{}},
    // rest: hit 1 opens again one second after the gem left
    {t:1.95,p:{}},
  ],fn:(t,T)=>tailSway(t,0.975,10),staffPose:SP3(0)},
  dash:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.08,p:{spine:[-8,0,0],_hips:[0,-0.035,-0.02],legL:[10,0,0],legR:[10,0,0]}},
    {t:0.2,ease:'out',p:{spine:[26,0,0],chest:[10,0,0],head:[-22,0,0],_hips:[0,0.06,0.06],legL:[-42,0,0],legR:[38,0,0],footR:[30,0,0],upperarmL:[55,0,-10],forearmL:[10,0,0],upperarmR:[25,-10,0],earL:[-28,0,0],earR:[-28,0,0],tail1:[14,0,0],tail2:[8,0,0],tail3:[4,0,0]}},
    {t:0.42,p:{spine:[24,0,0],chest:[8,0,0],head:[-20,0,0],_hips:[0,0.05,0.07],legL:[30,0,0],legR:[-40,0,0],footL:[30,0,0],upperarmL:[50,0,-10],upperarmR:[22,-10,0],earL:[-25,0,0],earR:[-25,0,0],tail1:[14,0,0],tail2:[8,0,0],tail3:[4,0,0]}},
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
  // Casts, rebuilt to the combo's level (Kesh, 11-12): each has a wind-up that loads the hips, a release with a step or a drop
  // under it, a recoil or rebound, and a moving hold. handR x near 90 levels the staff; upperarmR x raises the hand (negative).
  // Point: draws the staff back to her hip like a spear, then thrusts it level at the target with a step in; the release kicks the tip up.
  castPoint:{T:0.9,keys:[
    {t:0,p:{}},
    {t:0.11,p:{chest:[4,-26,0],spine:[4,-10,0],head:[0,24,0],upperarmR:[30,-14,0],forearmR:[-34,0,0],handR:[84,0,0],upperarmL:[-72,0,-6],forearmL:[-10,0,0],_hips:[-0.02,-0.045,-0.04],legL:[-10,0,0],legR:[14,0,-4],earL:[12,0,0],earR:[12,0,0]}},
    {t:0.22,ease:'in',p:{chest:[8,20,0],spine:[6,8,0],head:[-6,-14,0],upperarmR:[-42,6,0],forearmR:[-6,0,0],handR:[132,0,0],upperarmL:[36,0,-22],forearmL:[-20,0,0],_hips:[0.01,-0.04,0.075],legL:[-26,0,0],legR:[18,0,0],footR:[16,0,0],earL:[-20,0,0],earR:[-20,0,0]}},
    {t:0.31,p:{chest:[2,16,0],spine:[2,6,0],head:[-4,-12,0],upperarmR:[-50,6,0],forearmR:[-12,0,0],handR:[114,0,0],upperarmL:[30,0,-18],forearmL:[-16,0,0],_hips:[0.01,-0.03,0.06],legL:[-22,0,0],legR:[16,0,0],footR:[12,0,0]}},
    {t:0.56,p:{chest:[5,14,0],spine:[4,5,0],head:[-4,-10,0],upperarmR:[-40,6,0],forearmR:[-6,0,0],handR:[128,0,0],upperarmL:[24,0,-14],_hips:[0.01,-0.03,0.055],legL:[-20,0,0],legR:[14,0,0],footR:[8,0,0]}},
    {t:0.9,p:{}},
  ]},
  // Bloom: gathers the staff in to her chest in a deep crouch, then springs off the floor and thrusts it overhead, free arm flung wide; lands and lowers it.
  castBloom:{T:1.25,keys:[
    {t:0,p:{}},
    {t:0.16,p:{spine:[16,0,0],chest:[8,0,0],head:[14,0,0],_hips:[0,-0.075,0],upperarmR:[-34,10,0],forearmR:[-46,0,0],handR:[70,0,0],upperarmL:[-44,0,-10],forearmL:[-52,0,0],legL:[-8,0,6],legR:[-8,0,-6],earL:[16,0,6],earR:[16,0,-6]}},
    {t:0.32,ease:'in',p:{spine:[-12,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,0.12,0],upperarmR:[-135,-10,0],forearmR:[-20,0,0],handR:[135,0,0],upperarmL:[-24,0,118],forearmL:[0,0,12],handL:[0,0,14],legL:[10,0,8],legR:[14,0,-8],footL:[30,0,0],footR:[30,0,0],earL:[-24,0,10],earR:[-24,0,-10]}},
    {t:0.46,p:{spine:[-10,0,0],chest:[-8,0,0],head:[-18,0,0],_hips:[0,0.135,0],upperarmR:[-135,-10,0],forearmR:[-14,0,0],handR:[128,0,0],upperarmL:[-22,0,124],forearmL:[0,0,6],legL:[4,0,10],legR:[8,0,-10],footL:[26,0,0],footR:[26,0,0]}},
    {t:0.62,ease:'in',p:{spine:[8,0,0],chest:[2,0,0],head:[-6,0,0],_hips:[0,-0.055,0],upperarmR:[-118,-8,0],forearmR:[-22,0,0],handR:[120,0,0],upperarmL:[-10,0,84],legL:[-6,0,8],legR:[-6,0,-8],earL:[20,0,0],earR:[20,0,0]}},
    {t:0.86,p:{spine:[3,0,0],head:[-3,0,0],_hips:[0,-0.015,0],upperarmR:[-70,-4,0],forearmR:[-24,0,0],handR:[78,0,0],upperarmL:[-4,0,30]}},
    {t:1.25,p:{}},
  ]},
  // Plant, from Kesh's sketch: 1 stands with the staff at her side, 2 both hands lift it high over her head on her centre line
  // (from the side it tips back behind her head), 3 she drives it hard straight down into the floor in front of her, both arms
  // pushed forward, feet wide. Added: a small dip before the lift, a stretch at the top, a rebound and a lean after the hit.
  castPlant:{nolag:true,twoHand:{from:0.02,to:1.22,fade:0.12,y:0.53},
    // the staff's own path, in her space: p is where the right hand grips it, d is the way its head points. Both arms are solved to it.
    staffPose:{from:0.02,to:1.22,fade:0.12,keys:[
      {t:0.00,p:[-0.03,0.44,0.32],d:[0,0.95,0.3]},
      {t:0.10,p:[-0.03,0.42,0.33],d:[0,0.95,0.3]},
      {t:0.24,p:[-0.03,0.80,0.21],d:[0,0.94,-0.34]},
      {t:0.32,p:[-0.03,0.83,0.19],d:[0,0.90,-0.44]},
      {t:0.42,ease:'in',p:[-0.03,0.335,0.45],d:[0,0.995,0.10]},
      {t:0.52,p:[-0.03,0.345,0.445],d:[0,0.998,0.06]},
      {t:0.92,p:[-0.03,0.335,0.45],d:[0,0.995,0.10]},
      {t:1.30,p:[-0.03,0.40,0.33],d:[0,0.95,0.3]}]},
    T:1.3,keys:[
    {t:0,p:{}},
    {t:0.09,p:{spine:[6,0,0],head:[4,0,0],_hips:[0,-0.03,0],upperarmR:[-14,0,6],forearmR:[-14,0,0],handR:[20,0,0],upperarmL:[-18,0,-6],forearmL:[-20,0,0],legL:[0,0,4],legR:[0,0,-4]}},
    {t:0.24,p:{spine:[-9,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,0.055,-0.015],upperarmR:[-128,0,26],forearmR:[-18,0,0],handR:[150,0,0],upperarmL:[-128,0,-26],forearmL:[-22,0,0],legL:[2,0,13],legR:[2,0,-13],footL:[24,0,0],footR:[24,0,0],earL:[-20,0,0],earR:[-20,0,0]}},
    {t:0.32,p:{spine:[-12,0,0],chest:[-10,0,0],head:[-18,0,0],_hips:[0,0.07,-0.02],upperarmR:[-134,0,26],forearmR:[-22,0,0],handR:[152,0,0],upperarmL:[-134,0,-26],forearmL:[-26,0,0],legL:[2,0,13],legR:[2,0,-13],footL:[28,0,0],footR:[28,0,0],earL:[-22,0,0],earR:[-22,0,0]}},
    {t:0.42,ease:'in',p:{spine:[24,0,0],chest:[12,0,0],head:[-24,0,0],_hips:[0,-0.09,0.03],upperarmR:[-66,0,24],forearmR:[-8,0,0],handR:[76,0,0],upperarmL:[-70,0,-26],forearmL:[-12,0,0],legL:[-8,0,20],legR:[-8,0,-20],earL:[26,0,0],earR:[26,0,0]}},
    {t:0.52,p:{spine:[18,0,0],chest:[9,0,0],head:[-18,0,0],_hips:[0,-0.06,0.025],upperarmR:[-68,0,24],forearmR:[-12,0,0],handR:[84,0,0],upperarmL:[-72,0,-26],forearmL:[-16,0,0],legL:[-6,0,18],legR:[-6,0,-18]}},
    {t:0.92,p:{spine:[21,0,0],chest:[11,0,0],head:[-21,0,0],_hips:[0,-0.075,0.03],upperarmR:[-66,0,24],forearmR:[-10,0,0],handR:[78,0,0],upperarmL:[-70,0,-26],forearmL:[-14,0,0],legL:[-7,0,19],legR:[-7,0,-19]}},
    {t:1.3,p:{}},
  ]},
  // Dew fan (was Sweep): no swing. She lifts the gem and carries it slowly from her left to her right in front of her,
  // up on her toes, and dew falls from it in a fan. The staff's path is given directly and both arms follow it.
  castSweep:{nolag:true,T:1.2,
    staffPose:{from:0.02,to:1.12,fade:0.14,keys:[
      {t:0.00,p:[-0.12,0.42,0.30],d:[0.1,0.9,0.4]},
      {t:0.18,p:[-0.02,0.50,0.30],d:[0.62,0.45,0.64]},
      {t:0.34,p:[-0.08,0.52,0.34],d:[0.25,0.5,0.83]},
      {t:0.50,p:[-0.14,0.52,0.34],d:[-0.25,0.5,0.83]},
      {t:0.66,p:[-0.20,0.50,0.30],d:[-0.62,0.45,0.64]},
      {t:0.85,p:[-0.18,0.46,0.30],d:[-0.3,0.8,0.5]},
      {t:1.20,p:[-0.14,0.42,0.30],d:[0,0.95,0.3]}]},
    keys:[
    {t:0,p:{}},
    {t:0.18,p:{chest:[2,22,0],spine:[2,8,0],head:[-4,-12,0],upperarmL:[-10,0,26],forearmL:[-10,0,0],_hips:[0.02,0.02,0],legL:[0,0,4],legR:[0,0,-4],footL:[14,0,0],footR:[14,0,0],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:0.42,p:{chest:[-2,0,0],spine:[-1,0,0],head:[-6,0,0],upperarmL:[-14,0,40],forearmL:[-6,0,0],handL:[0,0,10],_hips:[0,0.035,0.01],legL:[0,0,5],legR:[0,0,-5],footL:[22,0,0],footR:[22,0,0]}},
    {t:0.66,p:{chest:[2,-22,0],spine:[2,-8,0],head:[-4,12,0],upperarmL:[-18,0,34],forearmL:[-8,0,0],_hips:[-0.02,0.02,0],legL:[0,0,4],legR:[0,0,-4],footL:[14,0,0],footR:[14,0,0]}},
    {t:0.85,p:{chest:[3,-10,0],spine:[3,-4,0],head:[2,6,0],upperarmL:[-8,0,14],_hips:[-0.01,-0.012,0],earL:[8,0,0],earR:[8,0,0]}},
    {t:1.2,p:{}},
  ]},
  // Give: for every skill that mends or shields a friend. She gathers light at her chest with her free hand, then offers it:
  // open hand out toward the ally, up on her toes, the staff drawn back out of the way. Soft timing, no hard stop.
  castGive:{T:1.15,keys:[
    {t:0,p:{}},
    {t:0.15,p:{chest:[6,-10,0],spine:[4,-4,0],head:[9,-6,0],upperarmL:[-34,0,-24],forearmL:[-72,0,0],upperarmR:[-8,0,0],handR:[10,0,0],_hips:[0,-0.03,-0.012],legL:[0,0,3],legR:[0,0,-3],earL:[12,0,4],earR:[12,0,-4]}},
    {t:0.33,p:{chest:[-4,12,0],spine:[-3,5,0],head:[-9,-4,6],upperarmL:[-60,0,-6],forearmL:[12,0,0],handL:[-22,0,0],upperarmR:[14,-6,0],forearmR:[-6,0,0],handR:[-10,0,0],_hips:[0,0.03,0.05],legL:[-14,0,0],legR:[12,0,0],footR:[18,0,0],footL:[8,0,0],earL:[-12,0,0],earR:[-12,0,0]}},
    {t:0.50,p:{chest:[-2,10,0],spine:[-2,4,0],head:[-6,-3,5],upperarmL:[-54,0,-6],forearmL:[8,0,0],handL:[-16,0,0],upperarmR:[12,-6,0],forearmR:[-6,0,0],handR:[-8,0,0],_hips:[0,0.014,0.048],legL:[-13,0,0],legR:[11,0,0],footR:[14,0,0]}},
    {t:0.82,p:{chest:[-3,11,0],spine:[-2,4,0],head:[-8,-3,6],upperarmL:[-57,0,-6],forearmL:[10,0,0],handL:[-20,0,0],upperarmR:[13,-6,0],forearmR:[-6,0,0],handR:[-9,0,0],_hips:[0,0.022,0.05],legL:[-14,0,0],legR:[12,0,0],footR:[16,0,0]}},
    {t:1.15,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.62,0.28);return{handL:[0,0,5*e*Math.sin(2*Math.PI*t/0.5)],...tailSway(t,1.15,8)};}},
  // Channel: for auras and songs. The staff comes upright onto her centre line in both hands, lifted off the floor,
  // her head bows, her ears soften, and she holds it there breathing while the staff rises and settles.
  castChannel:{nolag:true,T:2.6,twoHand:{from:0.02,to:2.5,fade:0.22,y:0.53},
    staffPose:{from:0.02,to:2.5,fade:0.22,keys:[
      {t:0.00,p:[-0.03,0.44,0.44],d:[0,1,0.05]},
      {t:0.38,p:[-0.03,0.50,0.45],d:[0,1,0.02]},
      {t:0.95,p:[-0.03,0.52,0.45],d:[0,1,0.04]},
      {t:1.50,p:[-0.03,0.50,0.45],d:[0,1,0.0]},
      {t:2.10,p:[-0.03,0.52,0.45],d:[0,1,0.04]},
      {t:2.60,p:[-0.03,0.46,0.44],d:[0,1,0.05]}]},
    keys:[
    {t:0,p:{}},
    {t:0.38,p:{spine:[10,0,0],chest:[6,0,0],head:[6,0,0],_hips:[0,-0.022,0.012],legL:[0,0,7],legR:[0,0,-7],earL:[14,0,8],earR:[14,0,-8],tail1:[0,10,0],tail2:[0,14,0],tail3:[0,16,0]}},
    {t:2.20,p:{spine:[10,0,0],chest:[6,0,0],head:[6,0,0],_hips:[0,-0.022,0.012],legL:[0,0,7],legR:[0,0,-7],earL:[14,0,8],earR:[14,0,-8],tail1:[0,10,0],tail2:[0,14,0],tail3:[0,16,0]}},
    {t:2.6,p:{}},
  ],fn:(t,T)=>{const e=Math.min(1,t/0.4,(T-t)/0.4), b=Math.sin(2*Math.PI*t/1.15);return{spine:[2.2*e*b,0,0],chest:[1.6*e*b,0,0],head:[-2.5*e*b,0,1.5*e*Math.sin(2*Math.PI*t/2.3)],_hips:[0,0.006*e*b,0],earL:[3*e*b,0,0],earR:[3*e*b,0,0]};}},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-14,0,0],head:[-12,0,0],_hips:[0,-0.01,-0.03],upperarmL:[-20,0,30],upperarmR:[-15,-20,0],earL:[18,0,0],earR:[18,0,0]}},
    {t:0.3,p:{hips:[28,0,0],spine:[8,0,0],head:[6,0,0],_hips:[0,-0.06,0.02],legL:[-36,0,0],legR:[-30,0,0],upperarmL:[-40,0,0],earL:[-10,0,0],earR:[-10,0,0]}},
    {t:0.55,ease:'in',p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0],_hips:[0,-0.21,0.05]}},
    {t:0.66,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0],_hips:[0,-0.18,0.05],head:[-70,0,0]}},
    {t:0.8,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},{t:3.0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],upperarmR:[2*S(t,T,0.15),0,0],head:[2*S(t,T,0.1),0,2*S(t,T,0.4)],earL:[0,0,4*bump(t,1.6,0.08)],tail2:[0,8*S(t,T),0],tail3:[0,10*S(t,T,0.1),0],tail4:[0,10*S(t,T,0.2),0]})},
  revive:{T:1.1,keys:[
    {t:0,p:{hips:[80,0,0],chest:[4,0,0],head:[-62,0,0],_hips:[0,-0.195,0.05],legL:[8,0,6],legR:[4,0,-6],footL:[40,0,0],footR:[40,0,0],upperarmL:[-110,0,-30],forearmL:[-20,0,0],upperarmR:[-22,-10,0],forearmR:[20,0,0],earL:[25,0,10],earR:[25,0,-10],tail1:[-30,0,0],tail2:[-20,10,0]}},
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
    {t:0.14,p:{upperarmL:[8,0,-14],spine:[3,0,3],_hips:[0,-0.018,0],head:[4,0,-3]}},
    {t:0.36,p:{upperarmL:[0,0,124],forearmL:[0,0,-20],head:[-6,0,12],spine:[-3,0,-7],chest:[0,0,-3],_hips:[0,0.02,0],legL:[0,0,3],earL:[-8,0,0],earR:[-8,0,0]}},
    {t:1.5,p:{upperarmL:[0,0,120],forearmL:[0,0,-20],head:[-4,0,11],spine:[-2,0,-6],chest:[0,0,-3],_hips:[0,0.012,0],legL:[0,0,3]}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5)*(1-bump(t,0,0.25))*(1-bump(t,T,0.25));return{forearmL:[0,0,38*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,22*e*Math.sin(2*Math.PI*t/0.36-0.6)],earL:[0,0,10*e*Math.sin(2*Math.PI*t/0.72)],earR:[0,0,6*e*Math.sin(2*Math.PI*t/0.72-0.5)],_hips:[0,0.012*e*(1-Math.cos(2*Math.PI*t/0.36))/2,0],hips:[0,0,3*e*Math.sin(2*Math.PI*t/0.72)],chest:[0,6*e*Math.sin(2*Math.PI*t/0.72),0],upperarmR:[0,0,3*e*Math.sin(2*Math.PI*t/0.72)],...tailSway(t,1.0,10)};}},
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

// ---- bigger range (Kesh, 11-12): scale each keyed move away from rest, capped so no joint folds over
{const scaleKeys=(c,k,from=0,to=1e9)=>{c.keys=c.keys.map(K=>K.t<from-1e-6||K.t>to+1e-6?K:({...K,p:Object.fromEntries(Object.entries(K.p).map(([j,v])=>[j,v.map(x=>j==='_hips'?x*Math.min(k,1.2):Math.max(-135,Math.min(135,x*k)))]))}));};
 const ampFn=(fn,k)=>(t,T)=>{const o=fn(t,T);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 for(const [n,k] of [['dash',1.2],['dashBack',1.2],['dashLeft',1.2],['dashRight',1.2],['hurt',1.35],['throw',1.0]])scaleKeys(CLIPS[n],k);
 scaleKeys(CLIPS.downFall,1.3,0.05,0.31); scaleKeys(CLIPS.revive,1.2,0.6,0.9);
 CLIPS.walkBack.fn=ampFn(CLIPS.walkBack.fn,1.3); CLIPS.downLie.fn=ampFn(CLIPS.downLie.fn,1.6);
 for(const n of ['combo','castPoint','castPlant','throw','castBloom','castGive'])CLIPS[n].mech=true;
}

// ---- derived clips
const cut=(keys,t0,t1,tail)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tail).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys, sway=CLIPS.combo.fn;
 CLIPS.combo1={mech:true,T:0.66,keys:cut(K,0,0.34,0.32),fn:sway};
 CLIPS.combo2={mech:true,T:0.66,keys:cut(K,0.34,0.68,0.32),fn:sway};
 CLIPS.combo3={mech:true,T:1.04,keys:cut(K,0.68,1.42,0.30),fn:sway,staffPose:SP3(0.68)};
 const P=CLIPS.downLie.keys[0].p;
 CLIPS.downCrawl={T:1.2,loop:true,keys:[{t:0,p:P},{t:1.2,p:P}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   upperarmL:[40*s,0,10*c], forearmL:[-24*pos(c),0,0], upperarmR:[-14*s,0,0], legL:[-22*s,0,0], legR:[22*s,0,0], footL:[10*s,0,0], footR:[-10*s,0,0],
   hips:[0,8*s,6*s], chest:[0,-9*s,0], head:[5*c,8*s,0], _hips:[0,0.008*Math.sqrt(c*c+0.03),0], tail2:[0,12*s,0], tail3:[0,14*S(t,T,0.12),0], tail4:[0,14*S(t,T,0.24),0], earL:[4*c,0,0], earR:[4*c,0,0]};}};
}

// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 CLIPS.run={T:0.46,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),a=S(t,T,0.06);return{
   _hips:[0.014*s,0.034*c2-0.02,0.01*c2], hips:[3*c2,11*s,5*s], spine:[17+2.5*c2,-6*s,-4*s], chest:[3,-13*s,-2*s], head:[-15+4*S(t,T/2,0.31),7*s,2*s],
   legL:[-54*s,0,0], legR:[54*s,0,0], footL:[40*pos(-S(t,T,0.15)),0,0], footR:[40*pos(S(t,T,0.15)),0,0],
   upperarmL:[52*a,0,-4], forearmL:[-38+18*S(t,T,0.14),0,0], handL:[12*S(t,T,0.22),0,0], upperarmR:[-16*a,0,3], forearmR:[-6*S(t,T,0.1),0,0],
   earL:[-18+9*S(t,T/2,0.2),0,4*s], earR:[-18+9*S(t,T/2,0.2),0,4*s], ...tailSway(t,T,22),
 };}};
 CLIPS.runBack={T:0.46,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.25)};
 CLIPS.runLeft={T:0.46,loop:true,fn:sc(CLIPS.walkLeft.fn,0.7,1.25)};
 CLIPS.runRight={T:0.46,loop:true,fn:sc(CLIPS.walkRight.fn,0.7,1.25)};
}
