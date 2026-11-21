// ---------------------------------------------------------------- batch 2, Deadeye (the Dragon Nest sniper: still, low and exact; the tricks are in the draw; one show-off beat after the shot)
// F1 Flank: a combat roll sideways over her shoulder (the page rolls her), up onto one knee; a snap draw with the bow canted flat, cheek on the string, ears folded back; the loose (0.4); she half rises and slides the bow behind her back
NEW.dRoll={T:0.8,air:[[0.02,0.46]],...(()=>{const s=seq([shot(0.18,0.24,0.37,0.4,0.9)]);return{draw:{keys:s.draw},offHand:{from:0.14,to:0.6,fade:0.04,keys:s.off.filter(k=>k.t>=0.18)},
  staffPose:{from:0,to:0.8,fade:0.04,keys:[{t:0,...CARRY},{t:0.18,...moveP(FLATP(0.3),[0,-0.08,0])},{t:0.37,...moveP(FLATP(0),[0,-0.08,0])},{t:0.42,...moveP(FLATP(-0.4,0.01),[0,-0.08,0]),ease:'in'},{t:0.54,...moveP(FLATP(0.1),[0,-0.04,0])},{t:0.66,...moveP(BEHIND,[0,0.02,-0.07])},{t:0.8,...moveP(BEHIND,[0,0.02,-0.07])}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.03,p:{...TUCK,...EARS(-40,-46)}},
  {t:0.16,p:{...TUCK,...EARS(-40,-46)}},
  {t:0.2,ease:'out',p:add(KNEEL,{spine:[10,0,0],head:[-6,0,-14],...EARS(-50,-60)})},
  {t:0.37,p:add(KNEEL,{spine:[12,0,0],head:[-6,0,-18],...EARS(-60,-66)})},
  {t:0.42,ease:'in',p:add(KNEEL,{spine:[4,0,0],head:[-4,0,-14],_hips:[0,0.01,-0.02],...EARS(-30,-40)})},
  {t:0.6,p:{_hips:[0,-0.08,0],spine:[10,-10,0],head:[-6,30,0],legL:[-24,0,6],legR:[16,0,-6],...ARMS([20,-20,-20],[30,30,-30]),...EARS(-6,-4)}},
  {t:0.8,p:{_hips:[0,-0.04,0],spine:[4,-6,0],head:[-4,20,0],legL:[-10,0,6],legR:[8,0,-6],...EARS(-10,-6)}},
]};
// F3 Bounty: thumb and finger frame one eye (bow lowered, head tilted, one ear swung toward the foe); the frame closes to a pointing finger; one-motion draw and snap shot (0.43); paw back to her hip
NEW.dBounty={T:0.9,...(()=>{const s=seq([shot(0.3,0.33,0.4,0.43,0.7)]);return{draw:{keys:s.draw},offHand:{from:0,to:0.7,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.06,p:[0.04,0.06,0.13],b:'head'},{t:0.17,p:[0.04,0.06,0.13],b:'head'},{t:0.25,p:[0.0,0.92,0.62]},{t:0.3,p:[0.0,0.92,0.62]},...s.off.filter(k=>k.t>0.3),{t:0.55,p:[-0.22,-0.06,0.08],b:'chest'},{t:0.7,p:[-0.22,-0.06,0.08],b:'chest'}]},
  staffPose:{from:0,to:0.9,fade:0.05,keys:[{t:0,...CARRY},{t:0.06,...moveP(CARRY,[0,-0.04,0])},{t:0.28,...moveP(CARRY,[0,-0.04,0])},{t:0.33,...LEVEL(0.3)},{t:0.43,...LEVEL(0)},{t:0.46,...LEVEL(-0.5,0.01),ease:'in'},{t:0.6,...LEVEL(0.1)},{t:0.9,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:mix(STANCE,{head:[-4,50,-18],earL:[-30,0,-20],earR:[10,0,0]})},
  {t:0.17,p:mix(STANCE,{head:[-4,52,-20],earL:[-34,0,-24],earR:[10,0,0]})},
  {t:0.26,p:mix(STANCE,{spine:[4,-16,0],head:[-6,60,-4],...EARS(-20,-20)})},
  {t:0.43,p:mix(STANCE,{spine:[2,-16,0],head:[-2,62,0],...EARS(-20,-20)})},
  {t:0.47,ease:'in',p:mix(STANCE,{spine:[-6,-12,0],head:[0,60,0],...EARS(14,16)})},
  {t:0.9,p:mix(STANCE,{head:[-2,50,0],...EARS(-6,-6)})},
]};
// the payout: she catches the last feather between two fingers and tucks it behind her ear
NEW.dTuck={T:0.6,offHand:{from:0,to:0.6,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.14,p:[0.12,0.62,0.36]},{t:0.2,p:[0.12,0.62,0.36]},{t:0.36,p:[0.06,0.14,-0.02],b:'head'},{t:0.44,p:[0.06,0.14,-0.02],b:'head'},{t:0.6,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{}},{t:0.16,p:{spine:[-4,0,0],head:[-14,10,0],...EARS(-20,-10)}},{t:0.38,p:{spine:[0,0,0],head:[0,-10,10],earL:[-40,0,0],...EARS(-10,-6)}},{t:0.6,p:{...EARS(-6,-4)}}]};

// F4 Pain link: a crouch and a jump 1 u up; at the top she tips forward (page) and shoots steeply down (0.27); lands crouched; yanks the cord once with her draw paw; lets it go and brushes her paw on her chest
NEW.dAirShot={T:0.9,air:[[0.1,0.46]],...(()=>{const s=seq([shot(0.1,0.15,0.25,0.27,0.8)]);return{draw:{keys:s.draw},offHand:{from:0,to:0.9,fade:0.04,keys:[...s.off.filter(k=>k.t<=0.4),{t:0.5,p:[0.02,-0.02,0.2],b:'chest'},{t:0.56,p:[-0.24,0.0,-0.02],b:'chest',ease:'in'},{t:0.66,p:[-0.24,0.0,-0.02],b:'chest'},{t:0.76,p:[0.0,0.0,0.12],b:'chest'},{t:0.84,p:[0.06,-0.04,0.12],b:'chest'},{t:0.9,p:[-0.19,-0.1,0.04],b:'chest'}]},
  staffPose:{from:0,to:0.9,fade:0.04,keys:[{t:0,...CARRY},{t:0.15,...AIMD(20,0.4)},{t:0.25,...AIMD(20,0)},{t:0.29,...AIMD(20,-0.5,[0,0.015,0]),ease:'in'},{t:0.4,...AIMD(10,0.2)},{t:0.5,...LEVEL(0.3)},{t:0.9,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.09,p:{...CROUCH,_hips:[0,-0.16,0],spine:[30,0,0],...EARS(30,30)}},
  {t:0.16,ease:'out',p:{spine:[10,0,0],head:[-10,0,0],legL:[-30,0,6],legR:[-10,0,-6],footL:[40,0,0],footR:[40,0,0],...EARS(-40,-46)}},
  {t:0.27,p:{spine:[16,0,0],head:[-14,0,0],legL:[-50,0,6],legR:[-20,0,-6],footL:[40,0,0],footR:[40,0,0],...EARS(-30,-40),tail1:[30,0,0]}},
  {t:0.38,p:{spine:[10,0,0],head:[-10,0,0],legL:[-40,0,8],legR:[-34,0,-8],footL:[30,0,0],footR:[30,0,0],...EARS(-40,-46)}},
  {t:0.47,ease:'in',p:{...LAND,_hips:[0,-0.17,0]}},
  {t:0.56,p:{...CROUCH,_hips:[0,-0.13,0],spine:[10,-16,0],head:[-10,20,0],...EARS(20,30)}},
  {t:0.66,p:{...CROUCH,_hips:[0,-0.12,0],spine:[8,-14,0],head:[-10,20,0],...EARS(-10,0)}},
  {t:0.9,p:{_hips:[0,-0.04,0],spine:[4,0,0],head:[-4,0,0],...EARS(-10,-6)}},
]};

// F9 Interrupt: three quick draws from three stances (standing from the hip; down on one knee, level under its arm; up and pivoting on the front paw, across her body); her head stays still, only her ears flick
NEW.dInterrupt={T:0.8,air:[[0.2,0.4]],...(()=>{const s=seq([shot(0.0,0.04,0.14,0.16,0.6),shot(0.2,0.24,0.34,0.36,0.6),shot(0.42,0.46,0.56,0.58,0.6)]);return{draw:{keys:s.draw},offHand:{from:0,to:0.72,fade:0.04,keys:s.off},
  staffPose:{from:0,to:0.8,fade:0.04,keys:[{t:0,...CARRY},{t:0.05,...HIPP(0.3)},{t:0.14,...HIPP(0)},{t:0.17,...HIPP(-0.5,0.01)},{t:0.23,...KAIM(0.3)},{t:0.34,...KAIM(0)},{t:0.37,...moveP(KAIM(-0.5),[0,0.015,0])},{t:0.45,...LEVEL(0.3)},{t:0.56,...LEVEL(0)},{t:0.6,...LEVEL(-0.5,0.01)},{t:0.8,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.05,p:{spine:[-9,0,0],chest:[-4,-10,0],head:[0,10,0],_hips:[0,-0.04,0.02],legL:[-14,0,8],legR:[10,0,-8],earL:[-10,0,-20],earR:[-10,0,0]}},
  {t:0.16,p:{spine:[-10,0,0],chest:[-5,-12,0],head:[0,12,0],_hips:[0,-0.045,0.02],legL:[-14,0,8],legR:[10,0,-8],earL:[-10,0,-30],earR:[-10,0,0]}},
  {t:0.22,ease:'out',p:add(KNEEL,{earL:[0,0,0],earR:[0,0,20]})},
  {t:0.36,p:add(KNEEL,{spine:[-3,0,0],earR:[0,0,26]})},
  {t:0.44,ease:'out',p:mix(STANCE,{hips:[0,-50,0],spine:[1,-20,0],chest:[0,-30,0],head:[-2,100,0],legL:[-16,0,4],footL:[20,0,0],legR:[16,0,-4],earL:[-10,0,30],earR:[-10,0,30]})},
  {t:0.58,p:mix(STANCE,{hips:[0,-52,0],spine:[-2,-20,0],chest:[-2,-30,0],head:[0,102,0],legL:[-16,0,4],footL:[20,0,0],legR:[16,0,-4],earL:[10,0,30],earR:[10,0,30]})},
  {t:0.8,p:mix(STANCE,{head:[-2,62,0],...EARS(-6,-4)})},
]};

// F12 Spotter wheel: eight arrows flicked up from the quiver with two fingers, one every 0.065 s, a little turn each (page); an open paw raised (the wheel locks); the paw closes to a fist and drops
NEW.dSpotter={T:1.0,offHand:{from:0,to:1.0,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},...[0,1,2,3,4,5,6,7].flatMap(k=>[{t:0.02+k*0.0625,p:QUIV,b:'chest'},{t:0.05+k*0.0625,p:[-0.2,0.5,0.1],b:'chest'}]),{t:0.62,p:[-0.1,1.3,0.3]},{t:0.76,p:[-0.1,1.32,0.3]},{t:0.86,p:[-0.16,0.6,0.32]},{t:1.0,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{}},
  {t:0.05,p:mix(STANCE,{spine:[-6,-16,0],head:[-26,60,0],...EARS(-20,-20)})},
  {t:0.5,p:mix(STANCE,{spine:[-8,-16,0],head:[-30,60,0],...EARS(-30,-30)})},
  {t:0.62,p:mix(STANCE,{spine:[-10,-10,0],head:[-34,50,0],...EARS(-40,-40)})},
  {t:0.76,p:mix(STANCE,{spine:[-10,-10,0],head:[-34,50,0],...EARS(-44,-44)})},
  {t:0.86,ease:'in',p:mix(STANCE,{spine:[6,-14,0],head:[-14,56,0],...EARS(10,20)})},
  {t:1.0,p:mix(STANCE,{head:[-10,56,0],...EARS(-6,-6)})},
],fn:(t,T)=>({spine:[0,0,t<0.5?4*Math.sin(t*100):0]})};

// F13 Bank shot: her head turns to the wall and follows the bounce path back (ears tracing it); she leans away from the shot, the bow canted 30°, and draws; the loose across her body (0.3); she steps through holding the follow-through
NEW.dBank={T:0.7,...(()=>{const s=seq([shot(0.1,0.15,0.28,0.3,0.9)]);const CANT=(k,u=0)=>moveP(turnP(LEVEL(k,u),[0,0,1],30),[0,0.02,0]);return{draw:{keys:s.draw},offHand:{from:0,to:0.7,fade:0.04,keys:[...s.off,{t:0.5,p:[-0.24,0.12,-0.02],b:'chest'},{t:0.7,p:[-0.22,0.1,-0.02],b:'chest'}]},
  staffPose:{from:0,to:0.7,fade:0.04,keys:[{t:0,...CARRY},{t:0.12,...CANT(0.3)},{t:0.28,...CANT(0)},{t:0.32,...CANT(-0.5,0.01)},{t:0.5,...CANT(0)},{t:0.7,...CANT(0.2)}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.05,p:mix(STANCE,{head:[-4,0,0],earL:[0,0,-30],earR:[0,0,-30]})},
  {t:0.13,p:mix(STANCE,{head:[-4,100,0],earL:[0,0,30],earR:[0,0,30]})},
  {t:0.28,p:mix(STANCE,{spine:[1,-16,16],chest:[0,-28,8],head:[-2,62,-14],...EARS(-30,-30)})},
  {t:0.32,ease:'in',p:mix(STANCE,{spine:[-6,-12,16],chest:[-3,-26,8],head:[0,60,-14],...EARS(10,10)})},
  {t:0.42,p:mix(STANCE,{spine:[-4,-12,10],head:[0,30,-6],legL:[-30,0,6],legR:[20,0,-6],...EARS(0,0)})},
  {t:0.5,p:mix(STANCE,{spine:[-2,-12,6],head:[0,-10,0],legL:[-10,0,6],legR:[24,0,-6],...EARS(-10,-10)})},
  {t:0.7,p:mix(STANCE,{spine:[0,-12,4],head:[0,40,0],...EARS(-10,-10)})},
]};

// F15 Tripwire: an arrow stabbed into the floor at her feet; a one-paw cartwheel (the page turns her over and carries her) with the wire paying out; the second arrow stabbed; the wire plucked like a harp string
NEW.dTrip={T:1.0,air:[[0.16,0.5]],offHand:{from:0,to:1.0,fade:0.04,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.05,p:QUIV,b:'chest'},{t:0.13,p:[0.12,0.08,0.26],ease:'in'},{t:0.16,p:[0.12,0.08,0.26]},{t:0.5,p:[-0.18,0.0,0.06],b:'chest'},{t:0.56,p:QUIV,b:'chest'},{t:0.66,p:[0.12,0.08,0.26],ease:'in'},{t:0.7,p:[0.12,0.08,0.26]},{t:0.78,p:[0.24,0.16,0.22]},{t:0.82,p:[0.3,0.16,0.18]},{t:1.0,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{}},
  {t:0.13,ease:'in',p:{...CROUCH,_hips:[0,-0.2,0],spine:[46,0,0],head:[-30,0,0],...EARS(20,20)}},
  {t:0.16,p:{...CROUCH,_hips:[0,-0.19,0],spine:[44,0,0],head:[-30,0,0],...EARS(20,20)}},
  {t:0.22,ease:'out',p:{spine:[0,0,0],head:[-6,0,0],...VL(-4,-4,40,50),...ARMS([-170,-30,0],[-170,30,0]),...EARS(-40,-40),tail1:[0,30,0]}},
  {t:0.44,p:{spine:[0,0,0],head:[-6,0,0],...VL(-4,-4,40,50),...ARMS([-170,-30,0],[-170,30,0]),...EARS(-40,-40),tail1:[0,-30,0]}},
  {t:0.52,ease:'in',p:{...LAND,_hips:[0,-0.17,0]}},
  {t:0.66,ease:'in',p:{...CROUCH,_hips:[0,-0.2,0],spine:[46,0,0],head:[-30,0,0],...EARS(10,10)}},
  {t:0.72,p:{...CROUCH,_hips:[0,-0.19,0],spine:[40,0,0],head:[-26,0,0],...EARS(10,10)}},
  {t:0.82,p:{...CROUCH,_hips:[0,-0.16,0],spine:[30,0,0],head:[-20,30,0],...EARS(-30,-20)}},
  {t:1.0,p:{_hips:[0,-0.05,0],spine:[8,0,0],head:[-6,20,0],...EARS(-10,-6)}},
]};

// F20 Lone wolf: the bow spun as a staff (in front, behind her back, overhead, a figure eight); a leap; the lower limb driven into the floor beside the chosen foe (0.57); she wrenches it out and strikes the lone foe with the upper limb (0.92)
const STAB={p:[0.06,0.42,0.42],d:[0,1,0.12],n:[1,0,0]}, CHOP0={p:[0.0,0.92,-0.02],d:[0,0.6,-0.8],n:[1,0,0]}, CHOP1={p:[0.04,0.5,0.4],d:[0,0.5,0.86],n:[1,0,0]};
NEW.dLone={T:1.25,air:[[0.4,0.56]],staffPose:{from:0,to:1.25,fade:0.05,keys:[{t:0,...CARRY},...spinKeys(STAFF(0,0.02),0.04,0.18,[0,1,0],1),{t:0.24,...BEHIND},...spinKeys(OVERHEAD(0),0.28,0.38,[0,0,1],1),{t:0.46,...moveP(STAB,[0,0.24,-0.08])},{t:0.57,...STAB,ease:'in'},{t:0.8,...STAB},{t:0.86,...CHOP0},{t:0.92,...CHOP1,ease:'in'},{t:1.05,...CHOP1},{t:1.25,...CARRY}]},
  offHand:{from:0.44,to:1.0,fade:0.04,keys:[{t:0.44,p:[0.06,0.78,0.34]},{t:0.57,p:[0.06,0.62,0.44]},{t:0.8,p:[0.06,0.62,0.44]},{t:0.86,p:[0.06,1.0,0.0]},{t:0.92,p:[0.06,0.66,0.56]},{t:1.0,p:[0.06,0.66,0.56]}]},keys:[
  {t:0,p:{}},
  {t:0.1,p:{_hips:[0,-0.04,0],spine:[0,20,0],head:[-6,-20,0],...EARS(-20,-20),tail1:[0,20,0]}},
  {t:0.24,p:{_hips:[0,-0.05,0],spine:[6,-20,0],head:[-6,20,0],...EARS(-10,-30),tail1:[0,-20,0]}},
  {t:0.34,p:{_hips:[0,-0.03,0],spine:[-6,0,0],head:[-14,0,0],...EARS(-40,-40)}},
  {t:0.4,p:{...CROUCH,_hips:[0,-0.16,0],spine:[30,0,0],head:[-20,0,0],...EARS(20,30)}},
  {t:0.47,ease:'out',p:{spine:[10,0,0],head:[-10,0,0],legL:[-40,0,6],legR:[20,0,-6],footL:[30,0,0],footR:[40,0,0],...EARS(-50,-56)}},
  {t:0.57,ease:'in',p:{...LAND,_hips:[0,-0.2,0],spine:[40,0,0],head:[-30,0,0],...EARS(50,60)}},
  {t:0.8,p:{...LAND,_hips:[0,-0.19,0],spine:[38,0,0],head:[-30,0,0],...EARS(20,40)}},
  {t:0.86,p:{_hips:[0,-0.05,0],spine:[-16,0,0],chest:[-8,0,0],head:[-10,0,0],legL:[-24,0,6],legR:[20,0,-6],...EARS(-40,-46)}},
  {t:0.92,ease:'in',p:{_hips:[0,-0.13,0.04],spine:[34,0,0],chest:[10,0,0],head:[-30,0,0],legL:[-34,0,6],legR:[30,0,-6],...EARS(40,40),tail1:[-20,0,0]}},
  {t:1.05,p:{_hips:[0,-0.12,0.04],spine:[30,0,0],chest:[9,0,0],head:[-26,0,0],legL:[-34,0,6],legR:[30,0,-6],...EARS(10,30)}},
  {t:1.25,p:{_hips:[0,-0.04,0],spine:[6,0,0],...EARS(-10,-6)}},
]};

// F22 Armour break: the lower limb hooks behind the foe's guard and yanks its arm aside; the back paw plants, hips turn, both forepaws drive the upper limb into its chest like a spear (0.4); she pushes off, steps back, draws and puts one shot into the crack (0.66)
const SPEAR0={p:[0.08,0.52,0.08],d:[0,0.05,1],n:[1,0,0]}, SPEAR1={p:[0.06,0.56,0.36],d:[0,0.05,1],n:[1,0,0]}, HOOKP={p:[0.1,0.46,0.3],d:[0.3,-0.6,0.74],n:[1,0,0]}, HOOKY={p:[0.24,0.5,0.12],d:[0.8,-0.4,0.44],n:[1,0,0]};
NEW.dBreak={T:1.0,...(()=>{const s=seq([shot(0.5,0.54,0.63,0.66,0.6)]);return{draw:{keys:s.draw},offHand:{from:0,to:0.9,fade:0.04,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.2,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.28,p:[0.08,0.54,-0.06]},{t:0.4,p:[0.06,0.58,0.22],ease:'in'},{t:0.46,p:[0.06,0.58,0.22]},...s.off.filter(k=>k.t>=0.5),{t:0.9,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0,to:1.0,fade:0.04,keys:[{t:0,...CARRY},{t:0.1,...HOOKP},{t:0.2,...HOOKY,ease:'in'},{t:0.28,...SPEAR0},{t:0.4,...SPEAR1,ease:'in'},{t:0.46,...SPEAR1},{t:0.54,...LEVEL(0.3)},{t:0.66,...LEVEL(0)},{t:0.7,...LEVEL(-0.5,0.01),ease:'in'},{t:0.84,...LEVEL(0.1)},{t:1.0,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.1,p:{_hips:[0,-0.06,0],spine:[14,0,0],head:[-10,0,0],legL:[-30,0,6],legR:[16,0,-6],...EARS(-10,-10)}},
  {t:0.2,ease:'in',p:{_hips:[0,-0.09,0],hips:[0,-24,0],spine:[10,-20,0],head:[-10,30,0],legL:[-30,0,6],legR:[20,0,-6],...EARS(10,-10),tail1:[0,20,0]}},
  {t:0.28,p:{_hips:[0,-0.1,0],hips:[0,-30,0],spine:[6,-20,0],head:[-10,40,0],legL:[-30,0,6],legR:[30,0,-6],footR:[-10,0,0],...EARS(-20,-20)}},
  {t:0.4,ease:'in',p:{_hips:[0,-0.14,0.06],hips:[0,26,0],spine:[22,10,0],chest:[8,6,0],head:[-20,-20,0],legL:[-40,0,6],legR:[36,0,-6],footR:[-20,0,0],...EARS(40,40),tail1:[0,-20,0]}},
  {t:0.46,p:{_hips:[0,-0.14,0.06],hips:[0,24,0],spine:[20,10,0],chest:[7,6,0],head:[-18,-20,0],legL:[-40,0,6],legR:[36,0,-6],footR:[-20,0,0],...EARS(20,40)}},
  {t:0.56,p:mix(STANCE,{_hips:[0,-0.06,0],legL:[-6,0,6],legR:[24,0,-6],...EARS(-10,-10)})},
  {t:0.7,ease:'in',p:mix(STANCE,{spine:[-6,-12,0],head:[0,60,0],...EARS(14,16)})},
  {t:1.0,p:mix(STANCE,{...EARS(-6,-6)})},
]};
