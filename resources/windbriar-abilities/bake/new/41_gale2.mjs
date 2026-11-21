// ---------------------------------------------------------------- Gale F14 to F18 from the design thread's motion spec (WINDBRIAR_MOTION_GALE.md)
// F14 Homecoming twister: the cord arrow whirled overhead (three loops, faster each time, hips swaying), thrown at 0.45
NEW.gLasso={T:0.62,keys:[
  {t:0,p:{}},
  {t:0.05,p:{_hips:[0,-0.06,0],spine:[-6,0,0],head:[-10,0,0],legL:[-14,0,8],legR:[12,0,-8],...ARMS([-150,-20,-30],[-20,20,-10]),...EARS(-10,-10)}},
  {t:0.38,p:{_hips:[0,-0.07,0],spine:[-8,0,0],head:[-12,0,0],legL:[-14,0,8],legR:[12,0,-8],...ARMS([-160,-30,-20],[-24,24,-10]),...EARS(-24,-30)}},
  {t:0.42,p:{_hips:[0,-0.1,0],spine:[-14,20,0],chest:[-6,14,0],head:[-6,-20,0],legL:[-20,0,8],legR:[20,0,-8],...ARMS([-150,-60,-10],[-10,30,-10]),...EARS(-30,-40),tail1:[0,20,0]}},
  {t:0.47,ease:'out',p:{_hips:[0,-0.09,0],spine:[22,-20,0],chest:[8,-14,0],head:[-20,20,0],legL:[-30,0,8],legR:[24,0,-8],...ARMS([-80,-10,0],[20,30,-10]),...EARS(20,10),tail1:[0,-20,0]}},
  {t:0.62,p:{_hips:[0,-0.08,0],spine:[10,-6,0],head:[-10,6,0],legL:[-24,0,8],legR:[18,0,-8],...ARMS([-70,-10,-10],[-30,20,-20]),...EARS(0,0)}},
],fn:(t,T)=>{const w=t<0.4?(t/0.4):0; const ph=2*Math.PI*(3*w*w); return {upperarmR:[12*Math.sin(ph)*w,0,18*Math.cos(ph)*w],forearmR:[-20-14*Math.sin(ph+1)*w,0,0],hips:[0,14*Math.sin(ph)*w,6*Math.cos(ph)*w],spine:[0,0,-5*Math.cos(ph)*w],tail1:[0,18*Math.sin(ph+0.6)*w,0]};}};
// the haul: leaned back 40° (spine, chest and a sit of the hips), both hind paws planted ahead and knees bent; forepaws pull in turn, one pull every 0.25 s (loop 0.5)
const HAUL={_hips:[0,-0.13,-0.06],hips:[-14,0,0],spine:[-20,0,0],chest:[-10,0,0],head:[14,0,0],legL:[-30,0,9],footL:[24,0,0],legR:[-18,0,-9],footR:[16,0,0],...EARS(-30,-40),tail1:[-10,0,0]};
NEW.gHaul={T:0.5,loop:true,keys:[
  {t:0,p:{...HAUL,...ARMS([-84,-8,-10],[-20,16,-80])}},
  {t:0.2,p:{...HAUL,spine:[-22,-10,0],...ARMS([-20,-16,-80],[-84,8,-10])}},
  {t:0.25,p:{...HAUL,spine:[-22,-12,0],...ARMS([-16,-16,-84],[-86,8,-8])}},
  {t:0.45,p:{...HAUL,spine:[-22,10,0],...ARMS([-84,-8,-10],[-18,16,-82])}},
  {t:0.5,p:{...HAUL,...ARMS([-84,-8,-10],[-20,16,-80])}},
],fn:(t,T)=>({_hips:[0,0.012*Math.sin(4*Math.PI*t/T),0],earL:[0,0,8*Math.sin(4*Math.PI*t/T)],earR:[0,0,8*Math.sin(4*Math.PI*t/T+1)]})};
// the pirouette: up onto the left paw, the right paw drawn to the left knee (passé), arms rounded overhead; the page spins her twice in place; the burst flings her arms out, the cord coiled on her arm
NEW.gPirouette={T:0.62,keys:[
  {t:0,p:{...HAUL,...ARMS([-84,-8,-10],[-20,16,-80])}},
  {t:0.07,ease:'out',p:{_hips:[0,0.0,0],spine:[-4,0,0],head:[-4,0,0],legL:[-2,0,3],footL:[30,0,0],legR:[-50,0,-40],footR:[50,0,0],...ARMS([-150,-30,-60],[-150,30,-60]),...EARS(-40,-50),tail1:[10,0,0]}},
  {t:0.4,p:{_hips:[0,0.0,0],spine:[-4,0,0],head:[-4,0,0],legL:[-2,0,3],footL:[30,0,0],legR:[-52,0,-42],footR:[50,0,0],...ARMS([-156,-26,-60],[-156,26,-60]),...EARS(-50,-60),tail1:[10,0,0]}},
  {t:0.46,ease:'out',p:{_hips:[0,-0.07,0],spine:[-10,0,0],head:[-10,0,0],legL:[-20,0,10],legR:[14,0,-10],...ARMS([-90,-90,0],[-90,90,0]),...EARS(-20,-30),tail1:[20,0,0]}},
  {t:0.62,p:{_hips:[0,-0.04,0],spine:[4,0,0],head:[-6,0,0],legL:[-12,0,7],legR:[10,0,-7],...ARMS([-30,-20,-110],[-10,10,-10]),...EARS(10,0)}},
]};

// F15 Briar lash: the vine drawn out across her body like a sword, one full loop overhead as the right paw steps in, a deep lunge as it cracks across 120° at shin height right to left (0.37), wrapped once round her and flicked home
NEW.gLash={T:0.78,keys:[
  {t:0,p:{}},
  {t:0.06,p:{_hips:[0,-0.04,0],spine:[6,24,0],chest:[2,14,0],head:[-6,-20,0],...ARMS([10,30,-70],[-10,16,-20]),...EARS(-10,-6)}},
  {t:0.12,ease:'out',p:{_hips:[0,-0.04,0],spine:[0,-24,0],chest:[0,-14,0],head:[-6,20,0],...ARMS([-50,-80,-10],[-20,20,-20]),...EARS(-20,-14),tail1:[0,-14,0]}},
  {t:0.19,p:{_hips:[0,-0.03,0],spine:[-8,-6,0],head:[-14,0,0],legL:[-6,0,6],legR:[-24,0,-6],...ARMS([-172,-8,-10],[-30,30,-20]),...EARS(-30,-30),tail1:[0,10,0]}},
  {t:0.25,p:{_hips:[0,-0.07,0],spine:[-4,-30,0],chest:[-2,-16,0],head:[-10,24,0],legL:[12,0,6],legR:[-30,0,-6],...ARMS([-150,-60,-30],[-20,30,-20]),...EARS(-20,-30),tail1:[0,26,0]}},
  {t:0.31,ease:'in',p:{_hips:[0,-0.17,0.02],spine:[30,-34,0],chest:[10,-20,0],head:[-30,30,0],legL:[34,0,8],footL:[-30,0,0],legR:[-52,0,-8],footR:[30,0,0],...ARMS([-50,-74,-6],[30,40,-20]),...EARS(16,10),tail1:[0,34,0]}},
  {t:0.37,p:{_hips:[0,-0.19,0.02],spine:[36,30,0],chest:[12,20,0],head:[-34,-24,0],legL:[36,0,8],footL:[-32,0,0],legR:[-54,0,-8],footR:[32,0,0],...ARMS([-62,30,-4],[10,50,-20]),...EARS(40,34),tail1:[0,-36,0]}},
  {t:0.42,p:{_hips:[0,-0.18,0.02],spine:[34,36,0],chest:[11,22,0],head:[-32,-26,0],legL:[36,0,8],footL:[-32,0,0],legR:[-54,0,-8],footR:[32,0,0],...ARMS([-56,40,-10],[6,50,-20]),...EARS(30,40),tail1:[0,-28,0]}},
  {t:0.52,p:{_hips:[0,-0.11,0.0],spine:[14,-30,0],chest:[4,-20,0],head:[-14,30,0],legL:[20,0,8],legR:[-34,0,-8],...ARMS([-30,40,-100],[-10,30,-30]),...EARS(0,10),tail1:[0,20,0]}},
  {t:0.6,ease:'out',p:{_hips:[0,-0.08,0.0],spine:[10,0,0],head:[-10,0,0],legL:[12,0,8],legR:[-22,0,-8],...ARMS([-60,-20,-6],[-10,20,-20]),...EARS(-10,-4),tail1:[0,-10,0]}},
  {t:0.78,p:{_hips:[0,-0.03,0],spine:[4,0,0],legL:[-8,0,6],legR:[6,0,-6],...EARS(-6,-4)}},
]};

// F16 Bulldoze: a shove from a planted stamp, the bow level across both forepaws driven forward from the hips; toprock shuffles between; the third shove leaps, body straight from paws to bow
const SHOVE0=STAFF(0,0.02), SHOVE1=moveP(STAFF(0,0.04),[0,0,0.2]);
const shoveClip=(m)=>({T:0.5,staffPose:{from:0,to:0.5,fade:0.04,keys:[{t:0,...SHOVE0},{t:0.14,...moveP(SHOVE0,[0,-0.02,-0.04])},{t:0.22,...SHOVE1,ease:'out'},{t:0.34,...SHOVE1},{t:0.5,...SHOVE0}]},
  offHand:{from:0,to:0.5,fade:0.04,keys:[{t:0,p:[0.17,0.52,0.2]},{t:0.14,p:[0.17,0.5,0.16]},{t:0.22,p:[0.17,0.54,0.4],ease:'in'},{t:0.34,p:[0.17,0.54,0.4]},{t:0.5,p:[0.17,0.52,0.2]}]},keys:[
  {t:0,p:{_hips:[0,-0.04,0],spine:[6,0,0],...EARS(-10,-10)}},
  {t:0.07,p:{_hips:[0,-0.02,0],spine:[0,-8*m,0],head:[-4,8*m,0],...(m>0?{legR:[-44,0,-8],footR:[20,0,0],legL:[4,0,6]}:{legL:[-44,0,8],footL:[20,0,0],legR:[4,0,-6]}),...EARS(-20,-20)}},
  {t:0.12,ease:'in',p:{_hips:[0,-0.15,0],spine:[14,-12*m,0],chest:[4,-6*m,0],head:[-14,12*m,0],...(m>0?{legR:[-34,0,-8],footR:[30,0,0],legL:[28,0,8],footL:[-10,0,0]}:{legL:[-34,0,8],footL:[30,0,0],legR:[28,0,-8],footR:[-10,0,0]}),...EARS(20,10),tail1:[10,0,0]}},
  {t:0.22,ease:'out',p:{_hips:[0,-0.13,0.05],hips:[0,14*m,0],spine:[26,-4*m,0],chest:[10,0,0],head:[-24,0,0],...(m>0?{legR:[-38,0,-8],footR:[30,0,0],legL:[40,0,8],footL:[-20,0,0]}:{legL:[-38,0,8],footL:[30,0,0],legR:[40,0,-8],footR:[-20,0,0]}),...EARS(40,30),tail1:[-10,0,0]}},
  {t:0.34,p:{_hips:[0,-0.13,0.05],hips:[0,14*m,0],spine:[24,-4*m,0],chest:[9,0,0],head:[-22,0,0],...(m>0?{legR:[-38,0,-8],footR:[30,0,0],legL:[40,0,8],footL:[-20,0,0]}:{legL:[-38,0,8],footL:[30,0,0],legR:[40,0,-8],footR:[-20,0,0]}),...EARS(10,30)}},
  {t:0.5,p:{_hips:[0,-0.05,0],spine:[6,0,0],legL:[-6,0,6],legR:[6,0,-6],...EARS(-10,-10)}},
],fn:(t,T)=>tail(t,0.5,10)});
NEW.gShove=shoveClip(1); NEW.gShoveL=shoveClip(-1);
// toprock shuffle forward, two beats, the bow bouncing on her shoulders
const SHOULDER2={p:[0.0,0.74,-0.08],d:[1,0,0],n:[0,1,0]};
NEW.gRock={T:0.36,staffPose:{from:0,to:0.36,fade:0.05,keys:[{t:0,...SHOVE0},{t:0.06,...SHOULDER2},{t:0.12,...moveP(SHOULDER2,[0,-0.03,0])},{t:0.18,...SHOULDER2},{t:0.24,...moveP(SHOULDER2,[0,-0.03,0])},{t:0.30,...SHOULDER2},{t:0.36,...SHOVE0}]},
  offHand:{from:0,to:0.36,fade:0.05,keys:[{t:0,p:[0.17,0.52,0.2]},{t:0.06,p:[0.2,0.76,-0.08]},{t:0.3,p:[0.2,0.76,-0.08]},{t:0.36,p:[0.17,0.52,0.2]}]},keys:[
  {t:0,p:{_hips:[0,-0.05,0],spine:[6,0,0]}},
  {t:0.06,p:{_hips:[0,-0.02,0],spine:[0,0,6],legL:[-30,0,10],footL:[20,0,0],legR:[10,0,-4],...EARS(-20,-10)}},
  {t:0.12,p:{_hips:[0,-0.08,0],spine:[6,0,0],legL:[-14,0,8],legR:[14,0,-8],...EARS(10,20)}},
  {t:0.18,p:{_hips:[0,-0.02,0],spine:[0,0,-6],legR:[-30,0,-10],footR:[20,0,0],legL:[10,0,4],...EARS(-20,-10)}},
  {t:0.24,p:{_hips:[0,-0.08,0],spine:[6,0,0],legL:[14,0,8],legR:[-14,0,-8],...EARS(10,20)}},
  {t:0.30,p:{_hips:[0,-0.03,0],spine:[2,0,0],legL:[-20,0,8],legR:[8,0,-6],...EARS(-10,-10)}},
  {t:0.36,p:{_hips:[0,-0.05,0],spine:[6,0,0]}},
],fn:(t,T)=>({tail1:[0,16*Math.sin(t*Math.PI*2/0.12),0]})};
// the leaping shove: off both paws, body straight from paws to bow (flat out), lands on both paws, ears flop
NEW.gLeapShove={T:0.62,air:[[0.1,0.36]],staffPose:{from:0,to:0.62,fade:0.04,keys:[{t:0,...SHOVE0},{t:0.08,...moveP(SHOVE0,[0,-0.04,-0.04])},{t:0.2,...moveP(STAFF(0,0.06),[0,0,0.28]),ease:'out'},{t:0.36,...moveP(STAFF(0,0.06),[0,0,0.28])},{t:0.5,...SHOVE0}]},
  offHand:{from:0,to:0.62,fade:0.04,keys:[{t:0,p:[0.17,0.52,0.2]},{t:0.08,p:[0.17,0.48,0.16]},{t:0.2,p:[0.17,0.56,0.48]},{t:0.36,p:[0.17,0.56,0.48]},{t:0.5,p:[0.17,0.52,0.2]}]},keys:[
  {t:0,p:{_hips:[0,-0.05,0],spine:[6,0,0]}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.17,-0.03],spine:[30,0,0],head:[-24,0,0],...EARS(30,30)}},
  {t:0.16,ease:'out',p:{_hips:[0,0.0,0.0],spine:[4,0,0],chest:[2,0,0],head:[-14,0,0],legL:[30,0,4],footL:[50,0,0],legR:[34,0,-4],footR:[50,0,0],...EARS(-60,-66),tail1:[30,0,0]}},
  {t:0.34,p:{_hips:[0,0.0,0.0],spine:[2,0,0],head:[-12,0,0],legL:[24,0,4],footL:[44,0,0],legR:[28,0,-4],footR:[44,0,0],...EARS(-50,-60),tail1:[20,0,0]}},
  {t:0.4,ease:'in',p:{...LAND,_hips:[0,-0.16,0.0],spine:[24,0,0],head:[-16,0,0]}},
  {t:0.48,p:{...LAND,_hips:[0,-0.13,0.0],spine:[20,0,0],head:[-10,0,0],...EARS(60,70)}},
  {t:0.62,p:{_hips:[0,-0.05,0],spine:[8,0,0],...EARS(30,46)}},
]};

// F17 Pinwheel: the five arrows tossed up and caught point-up on her right fingertip, spun like a ball on a finger; a cross punch with full hip turn (the rear paw pivots on its ball), the cone drills in (0.27); she hops back into a low crouch, one forepaw on the floor
NEW.gPinwheel={T:0.66,air:[[0.33,0.43]],keys:[
  {t:0,p:{}},
  {t:0.05,p:{_hips:[0,-0.06,0],spine:[10,0,0],head:[-10,0,0],...ARMS([-40,-20,-60],[-10,16,-10]),...EARS(-6,-6)}},
  {t:0.1,ease:'out',p:{_hips:[0,-0.02,0],spine:[-6,0,0],head:[-30,0,0],...ARMS([-150,-10,-10],[-20,20,-10]),...EARS(-30,-30)}},
  {t:0.17,p:{_hips:[0,-0.05,0],hips:[0,-26,0],spine:[-2,-24,0],chest:[0,-14,0],head:[-20,40,0],legL:[-20,0,8],legR:[22,0,-8],footR:[24,0,0],...ARMS([-130,-30,-40],[-50,30,-60]),...EARS(-20,-30),tail1:[0,20,0]}},
  {t:0.21,p:{_hips:[0,-0.08,0],hips:[0,-34,0],spine:[6,-30,0],chest:[2,-18,0],head:[-14,50,0],legL:[-24,0,8],legR:[26,0,-8],footR:[30,0,0],...ARMS([-60,-30,-90],[-60,30,-70]),...EARS(0,-10),tail1:[0,26,0]}},
  {t:0.27,ease:'out',p:{_hips:[0,-0.1,0.04],hips:[0,30,0],spine:[16,22,0],chest:[6,14,0],head:[-16,-30,0],legL:[-30,0,8],footL:[20,0,0],legR:[30,0,-8],footR:[50,0,0],...ARMS([-88,20,-2],[-40,30,-90]),...EARS(30,20),tail1:[0,-26,0]}},
  {t:0.32,p:{_hips:[0,-0.11,0.04],hips:[0,28,0],spine:[18,20,0],chest:[6,12,0],head:[-18,-28,0],legL:[-30,0,8],footL:[20,0,0],legR:[30,0,-8],footR:[48,0,0],...ARMS([-86,18,-2],[-40,30,-90]),...EARS(20,30),tail1:[0,-20,0]}},
  {t:0.36,ease:'out',p:{_hips:[0,-0.02,0],spine:[10,0,0],head:[-12,0,0],legL:[-20,0,8],footL:[30,0,0],legR:[-16,0,-8],footR:[30,0,0],...ARMS([-30,-20,-20],[-30,20,-20]),...EARS(-30,-30)}},
  {t:0.45,ease:'in',p:{...CROUCH,_hips:[0,-0.2,-0.02],spine:[44,0,0],chest:[14,0,0],head:[-40,0,0],...ARMS([30,-20,-20],[-60,10,0]),...EARS(30,40)}},
  {t:0.66,p:{...CROUCH,_hips:[0,-0.2,-0.02],spine:[46,0,0],chest:[14,0,0],head:[-44,10,0],...ARMS([30,-20,-20],[-62,10,0]),...EARS(-40,-46)}},
],fn:(t,T)=>tail(t,0.4,8)};

// F18 Switch: a bound in, forepaws planted on its shoulders, up into a handstand there (legs together and straight up, held), the push-off and the swap arc, lands crouched where it stood looking back over her shoulder
const HSTAND={spine:[-4,0,0],chest:[-2,0,0],head:[30,0,0],legL:[2,0,3],footL:[60,0,0],legR:[2,0,-3],footR:[60,0,0],...ARMS([-172,-14,0],[-172,14,0]),...EARS(30,36),tail1:[-20,0,0]};
NEW.gSwitch={T:0.8,air:[[0.04,0.52]],keys:[
  {t:0,p:{...CROUCH,_hips:[0,-0.14,0],spine:[30,0,0],...EARS(20,20)}},
  {t:0.08,ease:'out',p:{spine:[10,0,0],head:[-10,0,0],legL:[30,0,6],legR:[34,0,-6],footL:[40,0,0],footR:[40,0,0],...ARMS([-110,-20,-10],[-110,20,-10]),...EARS(-50,-56),tail1:[20,0,0]}},
  {t:0.14,p:{spine:[40,0,0],chest:[14,0,0],head:[-10,0,0],...TUCK,...ARMS([-150,-14,0],[-150,14,0]),...EARS(-20,-20)}},
  {t:0.24,ease:'out',p:HSTAND},
  {t:0.34,p:add(HSTAND,{head:[4,0,0],legL:[4,0,0],legR:[4,0,0]})},
  {t:0.42,p:{...TUCK,spine:[30,0,0],head:[20,0,0],...ARMS([-120,-20,-10],[-120,20,-10]),...EARS(-40,-40)}},
  {t:0.52,p:{spine:[20,0,0],head:[-10,0,0],legL:[-40,0,8],legR:[-40,0,-8],footL:[30,0,0],footR:[30,0,0],...ARMS([-60,-30,-10],[-60,30,-10]),...EARS(-40,-46)}},
  {t:0.58,ease:'in',p:{...LAND,_hips:[0,-0.19,0],spine:[34,-10,0],head:[-14,30,0],...EARS(40,46)}},
  {t:0.8,p:{...CROUCH,_hips:[0,-0.15,0],spine:[24,-16,0],chest:[6,-14,0],head:[-10,80,0],...EARS(-10,-20)}},
]};
