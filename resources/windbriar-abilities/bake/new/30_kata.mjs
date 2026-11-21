
// ---------------------------------------------------------------- Kata 斗
// F19 Crescent Kick: a step in, a back flip (page) with both hind paws scything up (0.30); upside down at the top (pitch -180) she shoots back over her head at the launched foe (0.46); she lands in a crouch with the bow across her knees
const OVERHEAD=(k=0)=>({p:[-0.02,0.80+0.04*k,-0.04],d:[-0.1,0.55,0.83],n:[-1,0,0]});
NEW.kCrescent={T:1.25,air:[[0.18,0.74]],...(()=>{const D=[{t:0,d:0,a:0,h:0},{t:0.36,d:0,a:0,h:0},{t:0.38,d:0,a:1,h:1},{t:0.45,d:0.75,a:1,h:1},{t:0.47,d:0.75,a:0,h:1},{t:0.495,d:-0.1,a:0,h:0,ease:'lin'},{t:0.53,d:0.04,a:0,h:0},{t:0.57,d:0,a:0,h:0}];
  return {draw:{keys:D},offHand:{from:0.0,to:1.1,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.30,p:QUIV,b:'chest'},{t:0.38,p:[0.05,0.045,0.15],b:'chest'},{t:0.47,p:[0.0,0.045,0.13],b:'chest'},{t:0.55,p:[-0.2,0.0,0.05],b:'chest'},{t:1.1,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:1.2,fade:0.08,keys:[{t:0,...CARRY},{t:0.22,...CARRY},{t:0.36,...OVERHEAD(0.4)},{t:0.47,...OVERHEAD(0)},{t:0.51,...OVERHEAD(-0.4)},{t:0.62,...CARRY},{t:0.80,p:[0.06,0.22,0.24],d:[0.98,0.1,0.1],n:[0,1,0]},{t:1.05,p:[0.06,0.22,0.24],d:[0.98,0.1,0.1],n:[0,1,0]},{t:1.2,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,p:{_hips:[0,-0.06,0.02],spine:[12,0,0],legL:[-30,0,6],footL:[10,0,0],legR:[22,0,-6],footR:[26,0,0],...EARS(-10,-8)}},
  {t:0.20,ease:'out',p:{spine:[-20,0,0],chest:[-8,0,0],head:[-16,0,0],legL:[-70,0,10],footL:[10,0,0],legR:[-40,0,-10],footR:[16,0,0],...EARS(-40,-30),upperarmR:[0,0,-30]}},
  {t:0.30,ease:'in',p:{spine:[-26,0,0],chest:[-10,0,0],head:[-20,0,0],legL:[-118,0,8],footL:[-6,0,0],legR:[-112,0,-8],footR:[-6,0,0],...EARS(-50,-40),upperarmR:[0,0,-40],tail1:[30,0,0]}},
  {t:0.40,p:{spine:[-30,0,0],chest:[-12,0,0],head:[-34,0,0],legL:[-60,0,10],footL:[20,0,0],legR:[-50,0,-10],footR:[20,0,0],...EARS(-20,-16)}},
  {t:0.47,p:{spine:[-34,0,0],chest:[-14,0,0],head:[-40,0,0],legL:[-56,0,10],footL:[20,0,0],legR:[-46,0,-10],footR:[20,0,0],...EARS(-20,-16)}},
  {t:0.58,p:{...TUCK,spine:[30,0,0]}},
  {t:0.74,ease:'in',p:{...LAND}},
  {t:0.88,p:{...CROUCH,_hips:[0,-0.11,0],spine:[20,0,0],head:[-12,0,0],...EARS(-6,-4)}},
  {t:1.05,p:{...CROUCH,_hips:[0,-0.10,0],spine:[18,0,0],head:[-10,0,0]}},
  {t:1.25,p:{}},
],fn:(t,T)=>tail(t,0.5,12)};

// F20 Windknot: the bow spun overhead (0.05 to 0.32), round her waist (0.34 to 0.52), thrust at the spot (0.62), snapped upright (0.86)
const OVER=(a)=>({p:[0.02,0.86,0.06],d:[Math.cos(a*Math.PI/180),0.05,Math.sin(a*Math.PI/180)],n:[0,1,0]});
const WAIST=(a)=>({p:[0.10*Math.sin(a*Math.PI/180)+0.04,0.36,0.12*Math.cos(a*Math.PI/180)+0.06],d:[Math.cos(a*Math.PI/180),0.05,-Math.sin(a*Math.PI/180)],n:[0,1,0]});
NEW.kKnot={T:1.25,offHand:{from:0.0,to:1.1,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.05,p:[-0.20,0.80,0.10]},{t:0.32,p:[-0.20,0.80,0.10]},{t:0.4,p:[-0.24,0.30,0.0]},{t:0.6,p:[-0.24,0.40,-0.05]},{t:0.66,p:[-0.30,0.46,-0.1],ease:'in'},{t:0.95,p:[-0.26,0.40,-0.06]},{t:1.1,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:1.2,fade:0.06,keys:[{t:0,...CARRY},...(()=>{const ks=[];for(let i=0;i<=12;i++){ks.push({t:+(0.05+i*0.0225).toFixed(4),...OVER(i*60),ease:'lin'});}for(let i=0;i<=8;i++){ks.push({t:+(0.34+i*0.0225).toFixed(4),...WAIST(-90+i*45),ease:'lin'});}return ks;})(),
    {t:0.58,p:[0.02,0.50,0.16],d:[0,0.2,1],n:[1,0,0]},{t:0.63,p:[0.0,0.52,0.36],d:[0,0.1,1],n:[1,0,0],ease:'in'},{t:0.78,p:[0.0,0.52,0.34],d:[0,0.1,1],n:[1,0,0]},{t:0.86,p:[0.02,0.52,0.28],d:[-0.05,1,0.05],n:[1,0,0],ease:'in'},{t:1.0,p:[0.02,0.52,0.26],d:[-0.05,1,0.05],n:[1,0,0]},{t:1.2,...CARRY}]},keys:[
  {t:0,p:{}},
  {t:0.1,p:{spine:[-6,10,0],head:[-10,-6,0],...EARS(-14,-10),_hips:[0,-0.02,0]}},
  {t:0.32,p:{spine:[-6,-10,0],head:[-10,8,0],...EARS(-14,-10),_hips:[0,-0.02,0]}},
  {t:0.42,p:{spine:[8,20,0],chest:[4,10,0],head:[-4,-10,0],_hips:[0,-0.06,0],legL:[-14,0,8],legR:[14,0,-8],tail1:[0,-24,0]}},
  {t:0.52,p:{spine:[8,-20,0],chest:[4,-10,0],head:[-4,10,0],_hips:[0,-0.06,0],legL:[-14,0,8],legR:[14,0,-8],tail1:[0,24,0]}},
  {t:0.63,ease:'in',p:{spine:[16,0,0],chest:[6,0,0],head:[-14,0,0],_hips:[0,-0.10,0.06],legL:[-40,0,6],footL:[10,0,0],legR:[30,0,-6],footR:[30,0,0],...EARS(30,26),tail1:[-20,0,0]}},
  {t:0.78,p:{spine:[12,0,0],chest:[4,0,0],head:[-10,0,0],_hips:[0,-0.09,0.05],legL:[-38,0,6],footL:[10,0,0],legR:[28,0,-6],footR:[30,0,0],...EARS(-10,-8)}},
  {t:0.86,ease:'in',p:{spine:[-4,0,0],head:[-4,0,0],_hips:[0,-0.04,0.02],legL:[-20,0,6],legR:[14,0,-6],...EARS(16,12)}},
  {t:1.0,p:{spine:[-2,0,0],_hips:[0,-0.03,0.01],legL:[-16,0,6],legR:[12,0,-6]}},
  {t:1.25,p:{}},
],fn:(t,T)=>tail(t,0.4,12)};

// F21 Cyclone Kick: her free paw to the floor, she spins on it (the page turns and tilts her) with both hind paws wheeling; an arrow from under her leg each turn; the last kick a double-paw thrust; she flips to her feet
NEW.kCyclone={T:1.4,air:[[0.1,1.05]],...(()=>{const D=[{t:0,d:0,a:0,h:0}];const OFF=[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.06,p:[-0.30,0.02,0.10]}];
  for(const tr of [0.22,0.52]){D.push({t:tr-0.07,d:0,a:1,h:1},{t:tr-0.01,d:0.4,a:1,h:1},{t:tr,d:0.4,a:0,h:1},{t:tr+0.02,d:-0.08,a:0,h:0,ease:'lin'},{t:tr+0.05,d:0,a:0,h:0});}
  return {draw:{keys:D},offHand:{from:0.0,to:1.2,fade:0.05,keys:[...OFF,{t:0.14,p:[-0.30,0.02,0.10]},{t:0.86,p:[-0.30,0.02,0.10]},{t:0.96,p:[-0.22,0.4,0.0]},{t:1.2,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:1.3,fade:0.06,keys:[{t:0,...CARRY},{t:0.12,p:[0.20,0.30,0.12],d:[0.2,0.4,0.9],n:[1,0,0]},{t:0.9,p:[0.20,0.30,0.12],d:[0.2,0.4,0.9],n:[1,0,0]},{t:1.3,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,spine:[40,0,-20],_hips:[0,-0.16,0]}},
  {t:0.14,p:{spine:[30,0,-30],chest:[10,0,-10],head:[-20,0,20],_hips:[0,-0.14,0],legL:[-80,0,50],footL:[-10,0,0],legR:[-60,0,-60],footR:[-10,0,0],...EARS(-40,-30),tail1:[0,30,0]}},
  {t:0.40,p:{spine:[30,0,-30],chest:[10,0,-10],head:[-20,0,20],_hips:[0,-0.14,0],legL:[-90,0,60],footL:[-10,0,0],legR:[-50,0,-50],footR:[-10,0,0],...EARS(-40,-30),tail1:[0,30,0]}},
  {t:0.70,p:{spine:[30,0,-30],chest:[10,0,-10],head:[-20,0,20],_hips:[0,-0.14,0],legL:[-80,0,50],footL:[-10,0,0],legR:[-60,0,-60],footR:[-10,0,0],...EARS(-40,-30),tail1:[0,30,0]}},
  {t:0.80,p:{spine:[46,0,0],chest:[14,0,0],head:[-30,0,0],_hips:[0,-0.16,0],legL:[-100,0,10],legR:[-104,0,-10],footL:[0,0,0],footR:[0,0,0],...EARS(-30,-24)}},
  {t:0.86,ease:'in',p:{spine:[-30,0,0],chest:[-10,0,0],head:[-20,0,0],_hips:[0,-0.10,0],legL:[-130,0,8],legR:[-130,0,-8],footL:[-20,0,0],footR:[-20,0,0],...EARS(-50,-40),tail1:[30,0,0]}},
  {t:0.98,p:{...TUCK}},
  {t:1.08,ease:'in',p:{...LAND}},
  {t:1.4,p:{}},
],fn:(t,T)=>tail(t,0.3,14)};

// F22 Bow Sweep: the lower limb strikes low (0.12), the upper limb reverses high (0.26), she hooks the string behind the foe's guard, plants a paw and snaps the arrow at arm's length (0.46); the bow twirls back
NEW.kSweep={T:1.05,...(()=>{const D=[{t:0,d:0,a:0,h:0},{t:0.32,d:0,a:0,h:0},{t:0.34,d:0,a:1,h:1},{t:0.44,d:0.6,a:1,h:1},{t:0.46,d:0.6,a:0,h:1},{t:0.485,d:-0.12,a:0,h:0,ease:'lin'},{t:0.52,d:0.05,a:0,h:0},{t:0.56,d:0,a:0,h:0}];
  return {draw:{keys:D},offHand:{from:0.0,to:0.95,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.12,p:[-0.26,0.30,-0.04]},{t:0.26,p:[-0.20,0.50,0.0]},{t:0.30,p:QUIV,b:'chest'},{t:0.34,p:[0.05,0.045,0.15],b:'chest'},{t:0.46,p:[0.0,0.045,0.13],b:'chest'},{t:0.54,p:[-0.24,0.12,0.02],b:'chest',ease:'in'},{t:0.9,p:[-0.22,0.1,0.04],b:'chest'}]},
  staffPose:{from:0.0,to:1.0,fade:0.05,keys:[{t:0,...CARRY},{t:0.05,p:[0.22,0.50,0.10],d:[0.6,0.6,-0.5],n:[0,0,1]},{t:0.12,p:[0.04,0.22,0.36],d:[-0.8,-0.5,0.3],n:[0,1,0],ease:'in'},{t:0.17,p:[-0.04,0.24,0.32],d:[-0.9,-0.3,0.1],n:[0,1,0]},
    {t:0.26,p:[0.02,0.72,0.34],d:[0.6,0.7,-0.3],n:[0,0,1],ease:'in'},{t:0.32,p:[0.06,0.62,0.30],d:[0.3,0.9,0.1],n:[1,0,0]},{t:0.36,...LEVEL(0.5,0.0)},{t:0.44,...moveP(LEVEL(0),[0,0,0.06])},{t:0.46,...moveP(LEVEL(0),[0,0,0.06])},{t:0.50,...moveP(LEVEL(-0.5,0.012),[0,0,0.06]),ease:'in'},
    ...spinKeys(LEVEL(-0.1),0.56,0.80,[0,0,1],1),{t:1.0,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.05,p:{spine:[-4,24,0],chest:[0,20,0],head:[-4,-30,0],_hips:[0,-0.04,0],legL:[-20,0,6],legR:[16,0,-6],tail1:[0,-20,0]}},
  {t:0.12,ease:'in',p:{spine:[20,-24,0],chest:[8,-20,0],head:[-14,30,0],_hips:[0,-0.10,0.04],legL:[-36,0,6],footL:[10,0,0],legR:[26,0,-6],footR:[26,0,0],...EARS(20,16),tail1:[0,20,0]}},
  {t:0.26,ease:'in',p:{spine:[-10,20,0],chest:[-4,16,0],head:[-6,-20,0],_hips:[0,-0.04,0.04],legL:[-28,0,6],legR:[20,0,-6],...EARS(-20,-16),tail1:[0,-20,0]}},
  {t:0.36,p:mix(STANCE,{spine:[6,-16,0],chest:[2,-28,0],head:[-4,62,0],_hips:[0,-0.08,0.03],legL:[-34,0,6],footL:[10,0,0],legR:[26,0,-6],footR:[20,0,0]})},
  {t:0.46,p:mix(STANCE,{spine:[8,-16,0],chest:[3,-29,0],head:[-4,62,0],_hips:[0,-0.09,0.03],legL:[-36,0,6],footL:[10,0,0],legR:[28,0,-6],footR:[22,0,0],...EARS(-20,-16)})},
  {t:0.50,ease:'in',p:mix(STANCE,{spine:[-4,-10,0],chest:[-3,-17,0],head:[4,50,0],_hips:[0,-0.06,-0.02],legL:[-34,0,6],footL:[-6,0,0],legR:[22,0,-6],...EARS(30,26),tail1:[-20,0,0]})},
  {t:0.7,p:mix(STANCE,{spine:[0,-13,0],head:[0,58,0],_hips:[0,-0.04,-0.01],...EARS(-10,-8)})},
  {t:1.05,p:{}},
],fn:(t,T)=>tail(t,0.4,12)};

// F24 Eagle Dive: a deep crouch, she rockets up (page); head down at the top (page pitch about +100) she looses five arrows down (0.60 to 0.96); a tuck, two turns, heel first (1.28); she stands with the bow on her shoulder
NEW.kDive={T:1.9,air:[[0.14,1.28]],...(()=>{const D=[{t:0,d:0,a:0,h:0}];for(let i=0;i<5;i++){const tr=0.60+i*0.09;D.push({t:tr-0.06,d:0,a:1,h:1},{t:tr-0.01,d:0.55,a:1,h:1},{t:tr,d:0.55,a:0,h:1},{t:tr+0.02,d:-0.08,a:0,h:0.6,ease:'lin'},{t:tr+0.035,d:0,a:0,h:0.6});}
  return {draw:{keys:D},offHand:{from:0.0,to:1.7,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.5,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.54,p:[0.05,0.045,0.15],b:'chest'},{t:0.98,p:[0.0,0.045,0.13],b:'chest'},{t:1.05,p:[-0.2,0.0,0.05],b:'chest'},{t:1.5,p:[-0.18,0.2,0.06],b:'chest'},{t:1.7,p:[-0.18,0.2,0.06],b:'chest'}]},
  staffPose:{from:0.0,to:1.85,fade:0.06,keys:[{t:0,...CARRY},{t:0.5,...CARRY},{t:0.56,...LEVEL(0.3)},{t:0.97,...LEVEL(0.0)},{t:1.04,...CARRY},{t:1.45,...CARRY},{t:1.62,...SHOULDER},{t:1.85,...SHOULDER}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,p:{...CROUCH,_hips:[0,-0.17,-0.03],spine:[30,0,0],...EARS(40,34)}},
  {t:0.20,ease:'out',p:{_hips:[0,0.02,0],spine:[-10,0,0],head:[-10,0,0],legL:[14,0,3],legR:[14,0,-3],footL:[50,0,0],footR:[50,0,0],...EARS(-50,-40),upperarmR:[0,0,-20]}},
  {t:0.45,p:{spine:[-4,0,0],head:[-6,0,0],legL:[-10,0,6],legR:[6,0,-6],footL:[30,0,0],footR:[34,0,0],...EARS(-30,-24)}},
  {t:0.58,p:mix(AIRAIM,{legL:[-20,0,10],legR:[30,0,-10],...EARS(-20,-14)})},
  {t:0.96,p:mix(AIRAIM,{legL:[-24,0,10],legR:[34,0,-10],...EARS(-20,-14)})},
  {t:1.05,p:{...TUCK}},
  {t:1.20,p:{...TUCK}},
  {t:1.26,ease:'out',p:{spine:[-10,0,0],head:[-6,0,0],legL:[10,0,6],footL:[60,0,0],legR:[-90,0,-6],footR:[0,0,0],...EARS(-40,-30)}},
  {t:1.30,ease:'in',p:{...LAND,_hips:[0,-0.16,0],legL:[-20,0,11],legR:[-50,0,-11]}},
  {t:1.50,p:{_hips:[0,-0.04,0],spine:[6,0,0],head:[-4,0,0],legL:[-10,0,5],legR:[10,0,-5],...EARS(-10,-8)}},
  {t:1.9,p:{}},
],fn:(t,T)=>tail(t,0.4,12)};
