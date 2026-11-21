
// ---------------------------------------------------------------- Rain 雨
// F9 Volley: three arrows fanned on the flat bow, loose 0.25, then a pirouette on her toes (page) with the ears wrapping round
NEW.rVolley={T:1.0,...(()=>{const s=seq([shot(0.0,0.07,0.21,0.25,0.7,3)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:0.86,fade:0.06,keys:[...s.off,{t:0.5,p:[-0.22,0.14,0.04],b:'chest'},{t:0.7,p:[-0.2,0.1,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:0.9,fade:0.08,keys:[{t:0,...CARRY},...bowShot(FLAT3,0.07,0.21,0.25,1.0),{t:0.5,...FLAT3(0.4,0.04)},{t:0.7,...FLAT3(0.3)},{t:0.9,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:mix(STANCE,{spine:[6,-12,0],chest:[3,-18,0],head:[-6,44,0],_hips:[0,-0.045,-0.01],legL:[-20,0,6],legR:[16,0,-6]})},
  {t:0.25,p:mix(STANCE,{spine:[8,-14,0],chest:[4,-22,0],head:[-8,50,0],_hips:[0,-0.06,-0.02],legL:[-22,0,6],legR:[18,0,-6]})},
  {t:0.30,ease:'in',p:mix(STANCE,{spine:[2,-8,0],chest:[0,-12,0],head:[-2,34,0],_hips:[0,-0.04,-0.04],footL:[-12,0,0],...EARS(24,20),tail1:[-18,0,0]})},
  {t:0.40,p:{_hips:[0,0.015,0],spine:[-4,0,0],head:[-4,0,0],legL:[-6,0,2],legR:[6,0,-2],footL:[30,0,0],footR:[30,0,0],earL:[0,0,40],earR:[0,0,-40],earL2:[0,0,30],earR2:[0,0,-30],upperarmR:[0,0,-40]}},
  {t:0.62,p:{_hips:[0,0.015,0],spine:[-4,0,0],head:[-4,0,0],legL:[-6,0,2],legR:[6,0,-2],footL:[30,0,0],footR:[30,0,0],earL:[0,0,-34],earR:[0,0,34],earL2:[0,0,-26],earR2:[0,0,26],upperarmR:[0,0,-30]}},
  {t:0.72,ease:'in',p:mix(STANCE,{spine:[4,-12,0],head:[-4,50,0],_hips:[0,-0.05,-0.01],...EARS(10,8)})},
  {t:1.0,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// F10 Rain of Arrows: she leans far back with her front paw up and shoots one arrow at the sky (0.5); her head follows it up
NEW.rRain={T:1.3,...(()=>{const s=seq([shot(0.06,0.16,0.42,0.5,0.95)]);return{draw:{keys:s.draw},offHand:{from:0.02,to:1.0,fade:0.08,keys:s.off},
  staffPose:{from:0.02,to:1.18,fade:0.12,keys:[{t:0.02,...CARRY},...bowShot((k,u)=>moveP(HIGH(k,u),[0,0,-0.03]),0.16,0.42,0.5,1.2),{t:0.84,...HIGH(0.2)},{t:1.0,...LEVEL(0.15)},{t:1.18,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.16,p:mix(STANCE,{spine:[-14,-14,0],chest:[-10,-24,0],head:[-26,50,0],_hips:[0,-0.03,-0.03],legL:[-30,0,4],footL:[20,0,0],...EARS(14,12)})},
  {t:0.42,p:mix(STANCE,{spine:[-24,-16,0],chest:[-14,-26,0],head:[-32,52,0],_hips:[0,-0.03,-0.06],legL:[-58,0,4],footL:[30,0,0],legR:[10,0,-4],footR:[16,0,0],...EARS(30,24)})},
  {t:0.5,p:mix(STANCE,{spine:[-24,-16,0],chest:[-14,-26,0],head:[-32,52,0],_hips:[0,-0.03,-0.06],legL:[-58,0,4],footL:[30,0,0],legR:[10,0,-4],footR:[16,0,0],...EARS(30,24)})},
  {t:0.56,ease:'in',p:mix(STANCE,{spine:[-16,-12,0],chest:[-8,-20,0],head:[-40,48,0],_hips:[0,0.0,-0.05],legL:[-62,0,4],footL:[20,0,0],legR:[4,0,-4],footR:[24,0,0],...EARS(40,32),tail1:[-16,0,0]})},
  {t:0.75,p:mix(STANCE,{spine:[-14,-13,0],chest:[-7,-22,0],head:[-46,46,0],_hips:[0,-0.02,-0.04],legL:[-36,0,4],footL:[20,0,0],...EARS(-18,-14)})},
  {t:0.95,p:mix(STANCE,{spine:[-6,-13,0],chest:[-5,-22,0],head:[-24,52,0],_hips:[0,-0.035,-0.03],...EARS(-6,-4)})},
  {t:1.3,p:{}},
],fn:(t,T)=>tail(t,0.65,10)};

// F11 Burst Arrow: the arrow rolled along the string, a short draw, lobbed high (0.36)
NEW.rBurst={T:1.0,...(()=>{const s=seq([shot(0.02,0.10,0.30,0.36,0.7)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:0.86,fade:0.06,keys:[...s.off,{t:0.7,p:[-0.2,0.08,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:0.92,fade:0.08,keys:[{t:0,...CARRY},{t:0.10,...AIMD(-26,0.7)},{t:0.18,...turnP(AIMD(-26,0.7),[0,0,1],25)},{t:0.26,...turnP(AIMD(-30,0.4),[0,0,1],-15)},{t:0.30,...AIMD(-32,0)},{t:0.36,...AIMD(-32,0)},{t:0.40,...AIMD(-38,-0.4),ease:'in'},{t:0.6,...AIMD(-20,0.2)},{t:0.92,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.10,p:mix(STANCE,{spine:[-8,-14,0],chest:[-6,-24,0],head:[-14,56,0],_hips:[0,-0.04,-0.01],legL:[-18,0,6],legR:[18,0,-6]})},
  {t:0.36,p:mix(STANCE,{spine:[-12,-16,0],chest:[-8,-27,0],head:[-18,62,0],_hips:[0,-0.05,-0.03],legL:[-22,0,6],legR:[20,0,-6],footR:[16,0,0]})},
  {t:0.40,ease:'in',p:mix(STANCE,{spine:[-16,-10,0],chest:[-8,-16,0],head:[-24,50,0],_hips:[0,-0.02,-0.05],legL:[-26,0,6],legR:[10,0,-6],footL:[-12,0,0],...EARS(26,22),tail1:[-18,0,0]})},
  {t:0.6,p:mix(STANCE,{spine:[-6,-14,0],chest:[-3,-24,0],head:[-10,60,0],_hips:[0,-0.04,-0.04],...EARS(-10,-8)})},
  {t:1.0,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// F12 Whirl Shot: a fan of arrows swept out of the quiver, then one spin on the toes of one hind paw with the bow flat (the page turns her), loosing all round
NEW.rWhirl={T:1.1,...(()=>{const D=[{t:0,d:0,a:0,h:0},{t:0.16,d:0,a:3,h:1},{t:0.26,d:0.55,a:3,h:1},{t:0.62,d:0.55,a:3,h:1},{t:0.64,d:0.55,a:0,h:1},{t:0.665,d:-0.1,a:0,h:0,ease:'lin'},{t:0.7,d:0.04,a:0,h:0},{t:0.74,d:0,a:0,h:0}];
  return {draw:{keys:D},offHand:{from:0.0,to:0.95,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.04,p:QUIV,b:'chest'},{t:0.10,p:[-0.30,0.30,0.10],b:'chest'},{t:0.16,p:[0.05,0.045,0.15],b:'chest'},{t:0.64,p:[0.0,0.045,0.13],b:'chest'},{t:0.72,p:[-0.28,0.14,0.04],b:'chest',ease:'in'},{t:0.9,p:[-0.24,0.12,0.04],b:'chest'}]},
  staffPose:{from:0.0,to:1.0,fade:0.08,keys:[{t:0,...CARRY},{t:0.16,...FLAT3(0.6)},{t:0.26,...FLAT3(0)},{t:0.62,...FLAT3(0)},{t:0.66,...FLAT3(-0.4,0.01),ease:'in'},{t:0.8,...FLAT3(0.3)},{t:1.0,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,p:{spine:[6,24,0],chest:[2,20,0],head:[-4,-20,0],_hips:[0,-0.03,0],tail1:[0,-20,0],...EARS(-8,-6)}},
  {t:0.24,p:mix(STANCE,{spine:[4,-12,0],head:[-6,46,0],_hips:[0,-0.03,-0.01]})},
  {t:0.30,p:mix(STANCE,{spine:[2,-12,0],head:[-6,46,0],_hips:[0,0.02,0],legL:[-4,0,2],footL:[34,0,0],legR:[44,0,-14],footR:[30,0,0],earL:[0,0,36],earR:[0,0,-36],earL2:[0,0,28],earR2:[0,0,-28]})},
  {t:0.62,p:mix(STANCE,{spine:[2,-12,0],head:[-6,46,0],_hips:[0,0.02,0],legL:[-4,0,2],footL:[34,0,0],legR:[44,0,-14],footR:[30,0,0],earL:[0,0,36],earR:[0,0,-36],earL2:[0,0,28],earR2:[0,0,-28]})},
  {t:0.70,ease:'in',p:mix(STANCE,{spine:[6,-12,0],head:[-6,48,0],_hips:[0,-0.06,-0.01],legL:[-22,0,6],legR:[18,0,-6],earL:[0,0,-30],earR:[0,0,30],earL2:[0,0,-40],earR2:[0,0,40],tail1:[0,30,0]})},
  {t:0.86,p:mix(STANCE,{spine:[3,-12,0],head:[-4,50,0],_hips:[0,-0.045,-0.01],earL:[0,0,10],earR:[0,0,-10]})},
  {t:1.1,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// F13 Ricochet: her back to the foe, a low skimming shot from behind her back, looking over her shoulder; she holds the pose
const BACKSHOT=(k=0)=>({p:[-0.12+0.0*k,0.36,-0.17-0.05*k],d:[0.1,1,0.25],n:[-1,0,0]});
NEW.rRico={T:1.3,...(()=>{const s=shot(0.04,0.12,0.24,0.28,0.6);return{draw:{keys:[{t:0,d:0,a:0,h:0},...s.draw]},offHand:{from:0.0,to:1.1,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.04,p:QUIV,b:'chest'},{t:0.12,p:[-0.14,0.36,0.06]},{t:0.24,p:[-0.13,0.37,0.12]},{t:0.32,p:[-0.24,0.44,0.24],ease:'in'},{t:0.95,p:[-0.24,0.44,0.22]},{t:1.1,p:[-0.2,0.2,0.05]}]},
  staffPose:{from:0.0,to:1.15,fade:0.08,keys:[{t:0,...CARRY},{t:0.12,...BACKSHOT(0.6)},{t:0.24,...BACKSHOT(0)},{t:0.28,...BACKSHOT(0)},{t:0.32,...BACKSHOT(-0.4)},{t:0.95,...BACKSHOT(-0.2)},{t:1.15,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,p:{spine:[16,10,0],chest:[6,24,0],head:[10,70,0],_hips:[0,-0.09,0.02],legL:[-30,0,8],footL:[34,0,0],legR:[20,0,-8],footR:[24,0,0],...EARS(-24,-18),tail1:[10,0,0]}},
  {t:0.28,p:{spine:[22,12,0],chest:[8,28,0],head:[16,78,0],_hips:[0,-0.11,0.03],legL:[-34,0,8],footL:[36,0,0],legR:[24,0,-8],footR:[26,0,0],...EARS(-30,-24),tail1:[10,0,0]}},
  {t:0.32,ease:'in',p:{spine:[18,8,0],chest:[6,22,0],head:[14,70,0],_hips:[0,-0.10,0.05],legL:[-34,0,8],footL:[36,0,0],legR:[24,0,-8],footR:[26,0,0],...EARS(10,8),tail1:[-14,0,0]}},
  {t:0.95,p:{spine:[20,10,0],chest:[7,26,0],head:[14,76,0],_hips:[0,-0.10,0.04],legL:[-34,0,8],footL:[36,0,0],legR:[24,0,-8],footR:[26,0,0],...EARS(-6,-4)}},
  {t:1.3,p:{}},
],fn:(t,T)=>tail(t,0.6,8)};

// F14 Tornado Shot: the arrow spun on a fingertip in front of her face until the wind winds onto it (0.05 to 0.36), then a quick shot (0.6)
NEW.rTornado={T:1.1,...(()=>{const s=shot(0.38,0.44,0.56,0.60,0.75);const spin=[];for(let i=0;i<=12;i++){const a=i/12*6.283*3;spin.push({t:+(0.06+i*0.025).toFixed(3),p:[-0.06+0.03*Math.cos(a),0.74+0.03*Math.sin(a),0.20]});}
  return{draw:{keys:[{t:0,d:0,a:0,h:0},...s.draw]},offHand:{from:0.0,to:0.95,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.04,p:[-0.08,0.70,0.18]},...spin,...s.off.slice(1),{t:0.8,p:[-0.2,0.1,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:0.95,fade:0.08,keys:[{t:0,...CARRY},{t:0.36,...CARRY},{t:0.46,...LEVEL(0.6)},{t:0.56,...LEVEL(0)},{t:0.60,...LEVEL(0)},{t:0.64,...LEVEL(-0.45,0.012),ease:'in'},{t:0.75,...LEVEL(0.2)},{t:0.95,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:{spine:[-4,0,0],head:[-14,0,0],...EARS(14,10)}},
  {t:0.34,p:{spine:[-6,4,0],head:[-16,4,0],...EARS(20,16)}},
  {t:0.46,p:mix(STANCE,{spine:[-2,-14,0],_hips:[0,-0.04,-0.01]})},
  {t:0.60,p:mix(STANCE,{spine:[-4,-16,0],chest:[-2,-28,0],head:[0,64,0],_hips:[0,-0.05,-0.02]})},
  {t:0.64,ease:'in',p:mix(STANCE,{spine:[-10,-10,0],chest:[-5,-17,0],head:[4,50,0],_hips:[0,-0.03,-0.05],footL:[-12,0,0],...EARS(26,22),tail1:[-18,0,0]})},
  {t:0.8,p:mix(STANCE,{spine:[-2,-13,0],head:[0,58,0],_hips:[0,-0.04,-0.04],...EARS(-10,-8)})},
  {t:1.1,p:{}},
],fn:(t,T)=>tail(t,0.55,10)};

// F16 Arrowstorm: a slide on her haunches after the sprint (the page moves her), bow drawn at the sky, one whistling arrow (0.62), she rises with the bow arm out as the last rank lands
const SLIDE={hips:[0,-24,0],spine:[-20,-12,0],chest:[-10,-22,0],head:[-30,52,0],_hips:[0,-0.16,-0.05],legL:[-78,0,6],footL:[40,0,0],legR:[30,0,-10],footR:[50,0,0],tail1:[-14,0,0],...EARS(-30,-24)};
NEW.rStorm={T:1.9,air:[[0.0,1.25]],...(()=>{const s=seq([shot(0.06,0.18,0.56,0.62,1.0)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:1.6,fade:0.06,keys:[...s.off,{t:1.3,p:[-0.24,0.12,0.04],b:'chest'}]},
  staffPose:{from:0.0,to:1.75,fade:0.08,keys:[{t:0,...CARRY},{t:0.18,...moveP(HIGH(0.8),[0,-0.12,0])},{t:0.56,...moveP(HIGH(0),[0,-0.12,0])},{t:0.62,...moveP(HIGH(0),[0,-0.12,0])},{t:0.66,...moveP(HIGH(-0.5),[0,-0.10,0]),ease:'in'},{t:0.9,...moveP(HIGH(0.2),[0,-0.1,0])},{t:1.3,...LEVEL(0.0,0.04)},{t:1.55,...LEVEL(-0.2,0.04)},{t:1.75,...CARRY}]}};})(),keys:[
  {t:0,p:{...SLIDE,spine:[10,-10,0],_hips:[0,-0.10,0]}},
  {t:0.16,p:SLIDE},
  {t:0.56,p:add(SLIDE,{spine:[-4,0,0],head:[-6,0,0]})},
  {t:0.62,p:add(SLIDE,{spine:[-4,0,0],head:[-6,0,0]})},
  {t:0.66,ease:'in',p:add(SLIDE,{spine:[6,0,0],head:[-14,0,0],_hips:[0,0.01,-0.02],...EARS(50,40),tail1:[-10,0,0]})},
  {t:0.95,p:add(SLIDE,{head:[-10,0,0]})},
  {t:1.25,p:mix(STANCE,{spine:[-2,-16,0],chest:[-2,-26,0],head:[0,62,0],_hips:[0,-0.03,-0.02],legL:[-22,0,6],legR:[16,0,-6],...EARS(-10,-8)})},
  {t:1.6,p:mix(STANCE,{spine:[-2,-14,0],head:[0,60,0],_hips:[0,-0.03,-0.02]})},
  {t:1.9,p:{}},
],fn:(t,T)=>tail(t,0.6,10)};
