// The bat Duskwing. Deltas in Euler degrees XYZ, in the parent's frame (the bones have no rest rotation, so at rest these are his own axes). +x is his left, +y up, +z forward.
// No weapon: he fights with the thumb claws at his wrists, the wings that hang from them, and his bite. A one-triangle dummy stands in for the weapon so the build and the page keep their shape.
export const CFG={name:'bat',weaponFile:'dummy.glb',hand:'handR',scale:0.001,grip:[0,0,0],palm:[0,0,0],tilt:[0,0,0],tiltOrder:'XYZ',
  holdBones:['upperarmR','forearmR','handR','fingersR'],box:[0,0.5,0,0.5,0,0.5],pushMode:'away',sole:[[0,-0.066,-0.03],[0,-0.066,0.08]],
  // follow-through: light and quick. The big ears and the wing tips trail everything and flick when he stops
  carry:0.5,lag:{chest:0.012,head:0.03,forearmL:0.015,forearmR:0.015,handL:0.035,handR:0.035,fingersL:0.06,fingersR:0.06},
  springs:[{bone:'earL',k:260,z:0.3,max:22,tip:[0.17,0.2,-0.19]},{bone:'earR',k:260,z:0.3,max:22,tip:[-0.17,0.2,-0.19]},
           {bone:'fingersL',k:170,z:0.42,max:16,tip:[-0.06,-0.155,-0.11]},{bone:'fingersR',k:170,z:0.42,max:16,tip:[0.06,-0.155,-0.11]}]};
export const BASE={};
const S=(t,T,ph=0)=>Math.sin(2*Math.PI*(t/T-ph));
const pos=(x,e=0.18)=>(x+Math.sqrt(x*x+e*e)-e)/2;
const bump=(t,c,w)=>Math.exp(-(((t-c)/w)**2));
// arm: raise lifts it out and up, fwd swings it forward (negative: back), twist rolls it so the wing below swings forward
const arm=(s,raise=0,fwd=0,twist=0)=>({['upperarm'+s]:[twist,(s==='L'?-1:1)*fwd,(s==='L'?1:-1)*raise]});
// wing: open swings the hanging wing out from his side like a fan, fwd swings it forward, tip bends the lower half the same way again
const wing=(s,open=0,fwd=0,tip=0)=>({['hand'+s]:[-fwd,0,(s==='L'?1:-1)*open],['fingers'+s]:[-fwd*0.4,0,(s==='L'?1:-1)*tip]});
const both=(raise=0,fwd=0,twist=0,open=0,wfwd=0,tip=0)=>({...arm('L',raise,fwd,twist),...arm('R',raise,fwd,twist),...wing('L',open,wfwd,tip),...wing('R',open,wfwd,tip)});
const ears=(droop=0,fwd=0)=>({earL:[fwd,0,-droop],earR:[fwd,0,droop]});
const strafe=(t,T,dir)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T),c2=Math.cos(4*Math.PI*t/T);
  const lead=dir>0?'L':'R', trail=dir>0?'R':'L'; const o={
    _hips:[0.012*dir*s,0.012*c2-0.012,0], hips:[0,0,-5*dir*s], spine:[2,0,4*dir*s], chest:[0,0,3*dir*s], head:[1.5*c2,0,-5*dir*s],
    ...arm(lead,14+8*pos(s,0.3),0,0),...wing(lead,18+12*pos(s,0.3),0,6),...arm(trail,4,0,0),...wing(trail,4+4*c2,0,0)};
  o['leg'+lead]=[-10*pos(c),0,dir*(3+18*pos(s,0.3))]; o['leg'+trail]=[-10*pos(-c),0,-dir*(3+12*pos(-s,0.3))];
  o['foot'+lead]=[6*pos(c),0,0]; o['foot'+trail]=[6*pos(-c),0,0]; return o;};
function sideDash(d){const L=d>0?'L':'R',R=d>0?'R':'L';
  const air=(k)=>{const p={spine:[4,0,-18*d],chest:[0,0,-8*d],head:[-4,0,14*d],_hips:[0.07*d*k,0.06,0],...arm(L,10,10,0),...wing(L,6,0,0),...arm(R,62,-10,0),...wing(R,70,0,14),...ears(18)};
    p['leg'+L]=[-12,0,22*d];p['leg'+R]=[6,0,-24*d];return p;};
  const crouch={spine:[6,0,8*d],_hips:[-0.02*d,-0.04,0],...both(12,0,0,10)};crouch['leg'+L]=[0,0,-2*d];crouch['leg'+R]=[0,0,4*d];
  const land={spine:[5,0,-6*d],_hips:[0.03*d,-0.035,0],head:[2,0,4*d],...both(20,0,0,26)};land['leg'+L]=[0,0,10*d];land['leg'+R]=[0,0,-5*d];
  return [{t:0,p:{}},{t:0.08,p:crouch},{t:0.2,ease:'out',p:air(1)},{t:0.4,p:air(1.15)},{t:0.52,ease:'in',p:land},{t:0.66,p:{}}];}
// downed: he sits down in a heap, wings fallen round him like a dropped cloak, head hung, ears flat
const SIT={_hips:[0,-0.075,-0.03],hips:[-16,0,0],spine:[24,0,0],chest:[14,0,0],head:[24,0,0],legL:[-66,0,10],legR:[-66,0,-10],footL:[-10,0,0],footR:[-10,0,0],
  ...both(6,34,0,22,10,10),...ears(38,6)};

// ---- the Duskwing's style: a small hunter. Still, then sudden. He folds in tight before every move and bursts out of it; the wings are his cloak when he waits and his blades when he strikes,
// and the big ears tell his mood: pricked forward before a strike, flat back in it, flicking after.
const REAR={spine:[-16,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,0.03,-0.035],footL:[22,0,0],footR:[22,0,0],...both(62,-28,0,58,0,10),...ears(-6,-12)};      // reared up, wings flared, ears pricked
const LUNGE=(k=1)=>({spine:[30,0,0],chest:[14,0,0],head:[-36,0,0],_hips:[0,-0.05,0.10*k],legL:[-24,0,4],legR:[16,0,-4],footR:[14,0,0],...both(16,-52,0,30,0,8),...ears(30,0)}); // thrown forward, jaws leading, wings swept back
const CHOMP=(k=1)=>({spine:[32,0,0],chest:[15,0,0],head:[-16,0,0],_hips:[0,-0.055,0.105*k],legL:[-24,0,4],legR:[16,0,-4],footR:[14,0,0],...both(10,-46,0,22,0,4),...ears(34,0)});

const CURL={spine:[24,0,0],chest:[12,0,0],head:[16,0,0],_hips:[0,-0.065,0],legL:[-22,0,5],legR:[-22,0,-5],footL:[10,0,0],footR:[10,0,0],...both(4,38,0,8,30,0),...ears(26,8)};  // wrapped in his wings, small and round: the moment he comes apart into bats or back together
const LANDP={spine:[-6,0,0],chest:[-4,0,0],head:[-8,0,0],_hips:[0,-0.035,0],legL:[-8,0,6],legR:[-8,0,-6],...both(64,-22,0,70,0,14),...ears(-8,-10)};                                  // out of the dark: wings thrown open
// hits 4 to 6, each struck just out of a blink: the wind-up he comes out of the dark in, the blow, and the short follow-through before he wraps up again
const W4={spine:[-6,-12,0],chest:[-3,-16,0],head:[-4,18,0],_hips:[0,0.02,-0.01],...arm('R',70,-34,0),...wing('R',48,0,10),...arm('L',20,0,0),...wing('L',20,0,4),...ears(-6,-10)};
const H4={spine:[18,14,0],chest:[8,20,0],head:[-14,-20,0],_hips:[0.008,-0.045,0.06],legL:[-18,0,0],legR:[12,0,0],...arm('R',4,84,-36),...wing('R',30,46,10),...arm('L',44,-30,0),...wing('L',32,0,6),...ears(26,0)};
const F4={spine:[10,16,0],chest:[4,22,0],head:[-6,-22,0],_hips:[0.008,-0.03,0.05],legL:[-15,0,0],legR:[10,0,0],...arm('R',10,56,-14),...wing('R',24,22,6),...arm('L',30,-20,0),...wing('L',26,0,6),...ears(0,-8)};
const W5={spine:[-6,12,0],chest:[-3,16,0],head:[-4,-18,0],_hips:[0,0.02,-0.01],...arm('L',70,-34,0),...wing('L',48,0,10),...arm('R',20,0,0),...wing('R',20,0,4),...ears(-6,-10)};
const H5={spine:[18,-14,0],chest:[8,-20,0],head:[-14,20,0],_hips:[-0.008,-0.05,0.07],legL:[-10,0,0],legR:[-16,0,0],...arm('L',4,84,-36),...wing('L',30,46,10),...arm('R',44,-30,0),...wing('R',32,0,6),...ears(26,0)};
const F5={spine:[10,-16,0],chest:[4,-22,0],head:[-6,22,0],_hips:[-0.008,-0.03,0.05],legL:[-8,0,0],legR:[-13,0,0],...arm('L',10,56,-14),...wing('L',24,22,6),...arm('R',30,-20,0),...wing('R',26,0,6),...ears(0,-8)};
const R6={spine:[-20,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,0.05,-0.03],footL:[22,0,0],footR:[22,0,0],...both(78,-30,0,64,0,12),...ears(-6,-12)};
const H6={spine:[34,0,0],chest:[16,0,0],head:[-34,0,0],_hips:[0,-0.07,0.10],legL:[-26,0,4],legR:[-22,0,-4],footL:[10,0,0],footR:[10,0,0],...both(2,80,-34,28,46,10),...ears(34,0)};
const B6={spine:[24,0,0],chest:[12,0,0],head:[-18,0,0],_hips:[0,-0.055,0.08],legL:[-22,0,5],legR:[-20,0,-5],footL:[8,0,0],footR:[8,0,0],...both(12,34,-8,22,16,6),...ears(20,0)};
const POUNCE={spine:[-12,0,0],chest:[-8,0,0],head:[-14,0,0],footL:[20,0,0],footR:[20,0,0],...both(70,-30,0,60,0,12),...ears(-8,-12)};                                              // behind the foe, claws high
export const CLIPS={
  // idle: alert and never quite still. He breathes, shrugs his wings up like a cloak and lets them settle, tilts his head to listen and flicks one ear
  idle:{T:3.2,loop:true,fn:(t,T)=>{const b=S(t,T/2), b2=S(t,T/2,0.12), w=S(t,T,0.1), sh=bump(t,1.0,0.22), li=bump(t,2.3,0.3);return{
    _hips:[0.006*w,0.006*b-0.006,0], hips:[0,1.5*w,1.5*w], spine:[1.5*b,1.5*w,-1.2*w], chest:[1.6*b2,1.5*w,0], head:[-2+1.5*S(t,T/2,0.2)-3*li,5*S(t,T,0.3),7*li],
    legL:[0,0,-1.5*w], legR:[0,0,-1.5*w], ...both(3+3*b2+10*sh,0,0,3+3*b+12*sh,0,3*b2), earL:[4*li,0,-8*bump(t,2.42,0.07)+2*b], earR:[4*li,0,10*bump(t,0.5,0.07)-2*b],
  };}},
  // walk: a quick bouncing waddle on tiny feet, the wings swinging like a cloak and half-opening on each bounce
  walk:{T:0.56,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
    _hips:[0.012*s,0.014*c2-0.012,0], hips:[0,6*s,5*s], spine:[5,-3*s,-3.5*s], chest:[1.2*b2,-5*s,-1.5*s], head:[-4+2.5*b2,3*s,3*s],
    legL:[-34*s,0,0], legR:[34*s,0,0], footL:[18*pos(-S(t,T,0.15)),0,0], footR:[18*pos(S(t,T,0.15)),0,0],
    ...arm('L',8+4*c2,-14*s,0),...arm('R',8+4*c2,14*s,0),...wing('L',8+7*b2,6*s,3*b2),...wing('R',8+7*b2,-6*s,3*b2),
  };}},
  walkBack:{T:0.64,loop:true,fn:(t,T)=>{const s=-S(t,T),c2=Math.cos(4*Math.PI*t/T);return{
    _hips:[0.008*s,0.012*c2-0.012,0], hips:[0,-4*s,3*s], spine:[-3,2*s,-2*s], chest:[0,4*s,0], head:[4+1.5*c2,-3*s,0],
    legL:[-26*s+3,0,0], legR:[26*s+3,0,0], footL:[-8*pos(-s),0,0], footR:[-8*pos(s),0,0],
    ...both(12+4*c2,12,0,14+6*c2,10,0),
  };}},
  walkLeft:{T:0.56,loop:true,fn:(t,T)=>strafe(t,T,1)},
  walkRight:{T:0.56,loop:true,fn:(t,T)=>strafe(t,T,-1)},
  // The claw combo, six hits in the same 1.35 s (Kesh 11-13): 1 (0.10) the right claw rakes down across his front, 2 (0.24) the left claw rakes back so the cuts cross,
  // 3 (0.46) he rears and snaps forward with a bite. Then each of hits 4, 5 and 6 has a blink of its own (Kesh 11-13, second word): he wraps himself in his wings and is gone, and comes out of the dark
  // beside the foe nearest the player's mouse, from a different side each time if it is the same foe: behind it for 4 (0.62, right claw), on its other flank for 5 (0.78, left claw), on the third side for 6 (0.96, both claws
  // driven down together); then he wraps once more (1.04) and is back where he stood (1.10). He is hidden 0.50 to 0.56, 0.66 to 0.72, 0.83 to 0.89 and 1.04 to 1.10.
  combo:{T:1.35,keys:[
    {t:0,p:{}},
    {t:0.045,p:{spine:[-4,-12,0],chest:[-2,-16,0],head:[0,18,0],_hips:[0,-0.02,-0.015],...arm('R',66,-34,0),...wing('R',44,0,10),...arm('L',6,10,0),...ears(-4,-8)}},
    {t:0.10,ease:'in',p:{spine:[12,14,0],chest:[6,20,0],head:[-8,-22,0],_hips:[0.008,-0.035,0.04],legL:[-16,0,0],legR:[10,0,0],...arm('R',6,78,-34),...wing('R',30,44,10),...arm('L',40,-30,0),...wing('L',30,0,6),...ears(22,0)}},
    {t:0.17,p:{spine:[6,18,0],chest:[2,24,0],head:[-3,-26,0],_hips:[0.008,-0.022,0.035],legL:[-13,0,0],legR:[8,0,0],...arm('R',6,70,-18),...wing('R',24,28,6),...arm('L',68,-36,0),...wing('L',46,0,10),...ears(-2,-8)}},
    {t:0.24,ease:'in',p:{spine:[13,-14,0],chest:[6,-20,0],head:[-8,22,0],_hips:[-0.008,-0.04,0.06],legL:[-10,0,0],legR:[-14,0,0],...arm('L',6,78,-34),...wing('L',30,44,10),...arm('R',40,-30,0),...wing('R',30,0,6),...ears(22,0)}},
    {t:0.30,p:{spine:[8,-15,0],chest:[3,-20,0],head:[-5,22,0],_hips:[-0.008,-0.02,0.04],legL:[-8,0,0],legR:[-10,0,0],...arm('L',20,56,-20),...wing('L',34,24,8),...arm('R',52,-30,0),...wing('R',44,0,8),...ears(6,-4)}},
    {t:0.37,p:REAR},
    {t:0.41,p:{...REAR,_hips:[0,0.036,-0.04]}},
    {t:0.46,ease:'in',p:LUNGE()},
    {t:0.49,p:CHOMP()},
    {t:0.52,p:CURL},
    {t:0.565,p:W4},
    {t:0.62,ease:'in',p:H4},
    {t:0.65,p:F4},
    {t:0.69,p:CURL},
    {t:0.725,p:W5},
    {t:0.78,ease:'in',p:H5},
    {t:0.81,p:F5},
    {t:0.86,p:CURL},
    {t:0.895,p:R6},
    {t:0.96,ease:'in',p:H6},
    {t:1.01,p:B6},
    {t:1.07,p:CURL},
    {t:1.11,p:LANDP},
    {t:1.21,p:{spine:[6,0,0],_hips:[0,-0.02,0],...both(16,-4,0,20,0,2),...ears(4,0)}},
    {t:1.35,p:{}},
  ]},
  // dash (Kesh 11-13): a blink, the fastest dash of all. He wraps himself in his wings and breaks into a cloud of small bats (0.05), they stream to the spot
  // and gather into him again (0.17); he lands with the wings thrown open and settles. One clip: he turns to face where he blinks.
  dash:{T:0.7,keys:[
    {t:0,p:{}},
    {t:0.05,ease:'in',p:CURL},
    {t:0.17,p:CURL},
    {t:0.23,ease:'out',p:{...LANDP,_hips:[0,0.02,0.02]}},
    {t:0.32,p:{spine:[10,0,0],chest:[4,0,0],head:[-6,0,0],_hips:[0,-0.05,0.01],legL:[-12,0,4],legR:[-12,0,-4],...both(40,-10,0,52,0,8),...ears(16,0)}},
    {t:0.46,p:{spine:[5,0,0],_hips:[0,-0.02,0],...both(16,-4,0,20,0,2),...ears(-4,0)}},
    {t:0.7,p:{}},
  ]},
  // screech (echo screech, bat swarm): he draws his wings in and leans back to fill his chest, then throws his head forward with the wings flung back and his ears flat; a cone of sound leaves him
  castPoint:{T:1.1,keys:[
    {t:0,p:{}},
    {t:0.2,p:{spine:[-14,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,-0.012,-0.03],...both(4,34,0,-4,16),...ears(-6,-12)}},
    {t:0.34,p:{spine:[-17,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,-0.008,-0.038],footL:[10,0,0],footR:[10,0,0],...both(6,38,0,-4,18),...ears(-8,-14)}},
    {t:0.42,ease:'in',p:{spine:[20,0,0],chest:[10,0,0],head:[-24,0,0],_hips:[0,-0.04,0.05],legL:[-18,0,4],legR:[12,0,-4],...both(44,-46,0,58,0,12),...ears(36,0)}},
    {t:0.7,p:{spine:[17,0,0],chest:[8,0,0],head:[-20,0,0],_hips:[0,-0.035,0.045],legL:[-16,0,4],legR:[10,0,-4],...both(38,-40,0,50,0,8),...ears(30,0)}},
    {t:1.1,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.56,0.14);return{head:[1.5*e*S(t,0.07),0,0],chest:[1.2*e*S(t,0.07,0.3),0,0]};}},
  // nightfall (nightfall, shadow veil, blood moon): he wraps both wings across himself like a cloak and curls small, then throws them wide and high; the dark opens round him
  castBloom:{T:1.4,keys:[
    {t:0,p:{}},
    {t:0.25,p:{spine:[14,0,0],chest:[8,0,0],head:[12,0,0],_hips:[0,-0.04,0],...both(10,62,-10,12,24,4),...ears(26,4)}},
    {t:0.46,p:{spine:[18,0,0],chest:[10,0,0],head:[16,0,0],_hips:[0,-0.055,0],...both(12,70,-12,14,28,4),...ears(32,4)}},
    {t:0.6,ease:'in',p:{spine:[-12,0,0],chest:[-8,0,0],head:[-16,0,0],_hips:[0,0.04,-0.01],footL:[26,0,0],footR:[26,0,0],...both(74,-8,0,84,0,18),...ears(-8,-10)}},
    {t:0.9,p:{spine:[-10,0,0],chest:[-6,0,0],head:[-13,0,0],_hips:[0,0.03,-0.008],footL:[20,0,0],footR:[20,0,0],...both(68,-6,0,76,0,12),...ears(-4,-6)}},
    {t:1.4,p:{}},
  ]},
  // bloodbite: the deep bite. He rears, lunges further than in the combo, clamps and shakes his head, then tears away to one side
  castPlant:{T:1.2,keys:[
    {t:0,p:{}},
    {t:0.16,p:{...REAR,_hips:[0,0.024,-0.03]}},
    {t:0.3,p:{...REAR,_hips:[0,0.036,-0.045]}},
    {t:0.4,ease:'in',p:LUNGE(1.3)},
    {t:0.46,p:CHOMP(1.3)},
    {t:0.68,p:CHOMP(1.25)},
    {t:0.8,ease:'out',p:{spine:[6,-14,0],chest:[2,-12,0],head:[-16,-26,10],_hips:[0,-0.02,0.04],legL:[-10,0,0],legR:[6,0,0],...both(34,-20,0,40,0,8),...ears(12,0)}},
    {t:1.2,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.57,0.1);return{head:[0,11*e*S(t,0.11),5*e*S(t,0.11,0.25)]};}},
  // talon rake: both wings wound back to his right, then his whole body whips round to the left with the wings out flat, the right claw leading across his front and the left trailing behind
  castSweep:{T:1.15,keys:[
    {t:0,p:{}},
    {t:0.24,p:{spine:[-6,-24,0],chest:[-4,-28,0],head:[0,36,0],_hips:[-0.01,-0.02,-0.02],legL:[-6,0,0],legR:[8,0,0],...arm('R',58,-46,0),...wing('R',72,0,14),...arm('L',40,30,0),...wing('L',50,0,8),...ears(-4,-8)}},
    {t:0.34,p:{spine:[-8,-28,0],chest:[-5,-32,0],head:[0,42,0],_hips:[-0.012,-0.026,-0.025],legL:[-6,0,0],legR:[8,0,0],...arm('R',62,-52,0),...wing('R',78,0,16),...arm('L',44,36,0),...wing('L',54,0,8),...ears(-6,-10)}},
    {t:0.42,ease:'in',p:{spine:[12,26,0],chest:[6,32,0],head:[-8,-34,0],_hips:[0.014,-0.045,0.04],legL:[-14,0,5],legR:[10,0,0],...arm('R',30,74,-16),...wing('R',70,20,10),...arm('L',52,-50,0),...wing('L',74,0,14),...ears(28,0)}},
    {t:0.6,p:{spine:[10,30,0],chest:[5,36,0],head:[-6,-38,0],_hips:[0.014,-0.04,0.036],legL:[-12,0,5],legR:[9,0,0],...arm('R',22,84,-12),...wing('R',54,16,6),...arm('L',48,-56,0),...wing('L',66,0,10),...ears(16,0)}},
    {t:1.15,p:{}},
  ]},
  // dusk dive (the weapon move): he crouches, springs up with his wings thrown high, hangs spread for a beat, and drops on the spot ahead with both wings slammed down
  dive:{T:1.05,keys:[
    {t:0,p:{}},
    {t:0.12,p:{spine:[12,0,0],_hips:[0,-0.055,0],...both(4,20,0,0,10),...ears(-4,-10)}},
    {t:0.3,ease:'out',p:{spine:[-10,0,0],chest:[-6,0,0],head:[-10,0,0],_hips:[0,0.17,0.02],legL:[26,0,6],legR:[30,0,-6],footL:[30,0,0],footR:[30,0,0],...both(80,-10,0,70,0,14),...ears(24,0)}},
    {t:0.44,p:{spine:[6,0,0],chest:[2,0,0],head:[6,0,0],_hips:[0,0.2,0.05],legL:[10,0,6],legR:[14,0,-6],footL:[20,0,0],footR:[20,0,0],...both(58,0,0,86,0,18),...ears(10,0)}},
    {t:0.56,ease:'in',p:{spine:[28,0,0],chest:[12,0,0],head:[-22,0,0],_hips:[0,-0.06,0.09],legL:[-22,0,6],legR:[-22,0,-6],...both(-8,44,-16,46,30,10),...ears(34,0)}},
    {t:0.7,p:{spine:[22,0,0],chest:[9,0,0],head:[-16,0,0],_hips:[0,-0.045,0.08],legL:[-18,0,5],legR:[-18,0,-5],...both(2,34,-10,36,20,6),...ears(20,0)}},
    {t:1.05,p:{}},
  ]},
  downFall:{T:0.8,keys:[
    {t:0,p:{}},
    {t:0.1,ease:'out',p:{spine:[-14,0,0],head:[-12,0,0],_hips:[0,0.01,-0.03],...both(60,10,0,60,0,10),...ears(30,0)}},
    {t:0.3,p:{spine:[6,0,0],head:[8,0,0],_hips:[0,-0.03,-0.04],legL:[-30,0,6],legR:[-26,0,-6],...both(30,20,0,30,0,0),...ears(20,0)}},
    {t:0.55,ease:'in',p:{...SIT,_hips:[0,-0.085,-0.03],head:[32,0,0]}},
    {t:0.66,p:{...SIT,_hips:[0,-0.07,-0.03],head:[18,0,0]}},
    {t:0.8,p:SIT},
  ]},
  downLie:{T:3.0,loop:true,keys:[{t:0,p:SIT},{t:3.0,p:SIT}],fn:(t,T)=>({chest:[1.5*S(t,T),0,0],head:[2*S(t,T,0.1),0,3*S(t,T*2)],earL:[0,0,3*S(t,T,0.2)],earR:[0,0,-3*S(t,T,0.3)],handL:[0,0,2*S(t,T)],handR:[0,0,-2*S(t,T)]})},
  revive:{T:1.1,keys:[
    {t:0,p:SIT},
    {t:0.35,p:{spine:[20,0,0],head:[4,0,0],_hips:[0,-0.06,-0.01],legL:[-30,0,6],legR:[-26,0,-6],...both(10,30,0,10,10),...ears(16,0)}},
    {t:0.65,p:{spine:[12,0,0],head:[-6,0,0],_hips:[0,-0.035,0],legL:[-10,0,0],legR:[-6,0,0],...both(30,6,0,34),...ears(0,-6)}},
    {t:0.85,ease:'out',p:{spine:[-6,0,0],head:[-8,0,0],_hips:[0,0.025,0],footL:[16,0,0],footR:[16,0,0],...both(60,-6,0,66,0,12),...ears(-6,-8)}},
    {t:1.1,p:{}},
  ]},
  // hurt: he flinches back and throws his wings up in front of his face, ears flat
  hurt:{T:0.55,keys:[
    {t:0,p:{}},
    {t:0.07,ease:'out',p:{spine:[-16,0,-4],chest:[-8,0,0],head:[-6,0,6],_hips:[0,-0.018,-0.045],legR:[12,0,0],...both(34,58,-10,10,30),...ears(40,0)}},
    {t:0.2,p:{spine:[-9,0,-2],head:[-2,0,3],_hips:[0,-0.022,-0.035],...both(22,40,-6,8,20),...ears(28,0)}},
    {t:0.36,p:{spine:[4,0,0],head:[3,0,0],_hips:[0,-0.008,-0.01],...both(8,10,0,6),...ears(8,0)}},
    {t:0.55,p:{}},
  ]},
  wave:{T:2.0,keys:[
    {t:0,p:{}},
    {t:0.3,p:{...arm('L',78,0,0),...wing('L',40,0,10),head:[0,0,8],spine:[0,0,-4],_hips:[0,0.008,0],...ears(-4,-6)}},
    {t:1.5,p:{...arm('L',78,0,0),...wing('L',40,0,10),head:[0,0,8],spine:[0,0,-4],_hips:[0,0.008,0],...ears(-4,-6)}},
    {t:2.0,p:{}},
  ],fn:(t,T)=>{const e=bump(t,0.9,0.5);return{upperarmL:[0,0,10*e*Math.sin(2*Math.PI*t/0.36)],handL:[0,0,26*e*Math.sin(2*Math.PI*t/0.36-0.6)],fingersL:[0,0,14*e*Math.sin(2*Math.PI*t/0.36-1.2)]};}},
};
// his trunk is one round ball, so a big turn of the spine reads as the whole bat turning away: the rakes turn it less
for(const n of ['combo','castSweep'])for(const k of CLIPS[n].keys)for(const j of ['spine','chest','head'])if(k.p[j])k.p[j]=[k.p[j][0],k.p[j][1]*0.6,k.p[j][2]];
for(const n of ['combo','castPoint','castSweep','castPlant','dive'])CLIPS[n].mech=true;
// ---- derived clips: each single hit of the tap chain keeps only its own blow
const cut=(keys,t0,t1,tl)=>{const ks=keys.filter(k=>k.t>=t0-1e-6&&k.t<=t1+1e-6).map(k=>({...k,t:+(k.t-t0).toFixed(3)})); ks[0]={t:0,p:ks[0].p}; ks.push({t:+(t1-t0+tl).toFixed(3),p:{}}); return ks;};
{const K=CLIPS.combo.keys;
 CLIPS.combo1={mech:true,T:0.5,keys:cut(K,0,0.17,0.33)};
 CLIPS.combo2={mech:true,T:0.5,keys:cut(K,0.17,0.30,0.37)};
 CLIPS.combo3={mech:true,T:0.6,keys:cut(K,0.30,0.49,0.41)};
 // hits 4 to 6 as single taps: each one opens with its own blink to its side of the foe, strikes, and wraps up and comes home by itself in case the chain stops there
 const RECOIL={spine:[12,0,0],chest:[6,0,0],_hips:[0,-0.035,0.03],legL:[-12,0,5],legR:[-12,0,-5],...both(14,26,0,22,12,4),...ears(10,0)}, SETTLE={spine:[6,0,0],_hips:[0,-0.02,0],...both(16,-4,0,20,0,2)};
 const one=(W,H,F,tw,th,T)=>[{t:0,p:CURL},{t:tw,p:W},{t:th,ease:'in',p:H},{t:+(th+0.05).toFixed(3),p:F},{t:+(th+0.16).toFixed(3),p:RECOIL},{t:+(th+0.26).toFixed(3),p:CURL},{t:+(th+0.34).toFixed(3),p:LANDP},{t:+(th+0.46).toFixed(3),p:SETTLE},{t:T,p:{}}];
 CLIPS.combo4={mech:true,T:0.8,keys:one(W4,H4,F4,0.075,0.14,0.8)};
 CLIPS.combo5={mech:true,T:0.8,keys:one(W5,H5,F5,0.075,0.14,0.8)};
 CLIPS.combo6={mech:true,T:0.85,keys:one(R6,H6,B6,0.08,0.15,0.85)};
 CLIPS.downCrawl={T:1.1,loop:true,keys:[{t:0,p:SIT},{t:1.1,p:SIT}],fn:(t,T)=>{const s=S(t,T),c=Math.cos(2*Math.PI*t/T);return{
   _hips:[0,0.008*pos(c),0],hips:[0,5*s,4*s],spine:[3*c,-4*s,0],head:[3*c,0,0],legL:[10*pos(c),0,0],legR:[10*pos(-c),0,0],upperarmL:[0,-12*s,0],upperarmR:[0,-12*s,0],handL:[0,0,5*pos(s)],handR:[0,0,-5*pos(-s)]};}};
}
// ---- run: four directions, all on one period so diagonals blend without re-timing
{const sc=(fn,Tw,k)=>(t,T)=>{const o=fn(t*Tw/T,Tw);for(const j in o)o[j]=o[j].map(v=>v*k);return o;};
 // run: a skimming sprint, body pitched forward, the wings half open and swept back, beating once a stride like a bird about to take off
 CLIPS.run={T:0.4,loop:true,fn:(t,T)=>{const s=S(t,T),c2=Math.cos(4*Math.PI*t/T),b2=Math.cos(4*Math.PI*t/T-0.7);return{
   _hips:[0.01*s,0.024*c2-0.02,0.02], hips:[8,7*s,5*s], spine:[16+2*c2,-4*s,-4*s], chest:[4+1.5*b2,-6*s,0], head:[-24+2.5*b2,4*s,2*s],
   legL:[-48*s-6,0,0], legR:[48*s-6,0,0], footL:[28*pos(-S(t,T,0.15)),0,0], footR:[28*pos(S(t,T,0.15)),0,0],
   ...both(30+12*c2,-30,0,44+16*b2,0,8+6*b2),...ears(24,0),
 };}};
 CLIPS.runBack={T:0.4,loop:true,fn:sc(CLIPS.walkBack.fn,CLIPS.walkBack.T,1.25)};
 CLIPS.runLeft={T:0.4,loop:true,fn:sc(CLIPS.walkLeft.fn,0.56,1.25)};
 CLIPS.runRight={T:0.4,loop:true,fn:sc(CLIPS.walkRight.fn,0.56,1.25)};
}
