
// ---------------------------------------------------------------- Shot 狙
// F1 Piercing Shot: a side step, the bow upright, one ear folds back, a draw along the cheek; loose at 0.25; the bow spins once round her paw; end pose bow arm out, draw paw open behind her ear
NEW.sPierce={T:1.0,...(()=>{const s=seq([shot(0.0,0.07,0.21,0.25,0.95)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:0.86,fade:0.06,keys:[...s.off,{t:0.40,p:[-0.24,0.12,-0.02],b:'chest'},{t:0.7,p:[-0.24,0.10,-0.02],b:'chest'}]},
  staffPose:{from:0.0,to:0.92,fade:0.08,keys:[{t:0.0,...CARRY},{t:0.07,...LEVEL(0.8)},{t:0.21,...LEVEL(0)},{t:0.25,...LEVEL(0)},{t:0.28,...LEVEL(-0.5,0.012),ease:'in'},
    ...spinKeys(LEVEL(-0.2),0.31,0.52,[0,0,1],1),{t:0.74,...LEVEL(-0.1)},{t:0.92,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:mix(STANCE,{spine:[-2,-15,0],_hips:[0,-0.035,-0.01],legL:[-18,0,6],legR:[16,0,-6],earR:[-44,0,-10],earR2:[-36,0,0]})},
  {t:0.21,p:mix(STANCE,{spine:[-5,-16,0],chest:[-3,-29,0],head:[2,66,0],_hips:[0,-0.045,-0.02],legL:[-20,0,6],legR:[18,0,-6],footR:[14,0,0],earR:[-50,0,-12],earR2:[-40,0,0]})},
  {t:0.25,p:mix(STANCE,{spine:[-5,-16,0],chest:[-3,-29,0],head:[2,66,0],_hips:[0,-0.046,-0.02],legL:[-20,0,6],legR:[18,0,-6],footR:[14,0,0],earR:[-50,0,-12],earR2:[-40,0,0]})},
  {t:0.29,ease:'in',p:mix(STANCE,{spine:[-12,-10,0],chest:[-6,-18,0],head:[6,50,0],_hips:[0,-0.02,-0.05],legL:[-24,0,6],legR:[10,0,-6],footL:[-14,0,0],...EARS(28,24),tail1:[-20,0,0]})},
  {t:0.40,p:mix(STANCE,{spine:[-3,-14,0],chest:[-2,-24,0],head:[0,60,0],_hips:[0,-0.04,-0.04],legL:[-22,0,6],legR:[16,0,-6],...EARS(-12,-10),tail1:[10,0,0]})},
  {t:0.70,p:mix(STANCE,{spine:[-2,-14,0],chest:[-2,-24,0],head:[0,62,0],_hips:[0,-0.04,-0.04],legL:[-22,0,6],legR:[16,0,-6],...EARS(-4,-2)})},
  {t:1.0,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// F2 Power Shot (the full draw): a hind paw planted back, she sinks low, a slow draw 0.15 to 0.95 with the ears flattening and the string trembling; loose 1.0; the recoil slides her back; she rises slowly and flicks her ears
NEW.sPower={T:1.75,...(()=>{const s=seq([shot(0.04,0.15,0.95,1.0,1.0)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:1.5,fade:0.08,keys:[...s.off,{t:1.3,p:[-0.22,0.1,-0.02],b:'chest'}]},
  staffPose:{from:0.0,to:1.6,fade:0.1,keys:[{t:0.0,...CARRY},{t:0.15,...LEVEL(0.8,0.02)},{t:0.95,...LEVEL(0,-0.02)},{t:1.0,...LEVEL(0,-0.02)},{t:1.05,...LEVEL(-0.7,0.0),ease:'in'},{t:1.2,...LEVEL(0.1)},{t:1.4,...LEVEL(0.3)},{t:1.6,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.14,p:mix(STANCE,{spine:[2,-16,0],_hips:[0,-0.07,-0.02],legL:[-28,0,7],legR:[30,0,-7],footR:[20,0,0],footL:[-6,0,0]})},
  {t:0.55,p:mix(STANCE,{hips:[0,-28,0],spine:[-4,-17,0],chest:[-3,-30,0],head:[3,66,0],_hips:[0,-0.10,-0.03],legL:[-32,0,7],legR:[34,0,-7],footR:[24,0,0],footL:[-8,0,0],...EARS(-38,-30)})},
  {t:0.95,p:mix(STANCE,{hips:[0,-30,0],spine:[-7,-18,0],chest:[-4,-31,0],head:[4,68,0],_hips:[0,-0.115,-0.04],legL:[-34,0,7],legR:[36,0,-7],footR:[26,0,0],footL:[-8,0,0],...EARS(-52,-42)})},
  {t:1.0,p:mix(STANCE,{hips:[0,-30,0],spine:[-7,-18,0],chest:[-4,-31,0],head:[4,68,0],_hips:[0,-0.116,-0.04],legL:[-34,0,7],legR:[36,0,-7],footR:[26,0,0],footL:[-8,0,0],...EARS(-52,-42)})},
  {t:1.05,ease:'in',p:mix(STANCE,{hips:[0,-24,0],spine:[-20,-8,0],chest:[-9,-14,0],head:[10,44,0],_hips:[0,-0.06,-0.09],legL:[-40,0,8],legR:[14,0,-8],footL:[20,0,0],footR:[10,0,0],...EARS(34,30),tail1:[-26,0,0]})},
  {t:1.22,p:mix(STANCE,{spine:[-6,-12,0],chest:[-3,-20,0],head:[0,56,0],_hips:[0,-0.08,-0.06],legL:[-30,0,7],legR:[22,0,-7],...EARS(-16,-12),tail1:[12,0,0]})},
  {t:1.45,p:mix(STANCE,{spine:[0,-12,0],head:[-2,56,0],_hips:[0,-0.04,-0.03],earL:[-20,0,-14],earR:[10,0,10],earL2:[-16,0,-10],earR2:[12,0,0]})},
  {t:1.52,p:mix(STANCE,{spine:[0,-12,0],head:[-2,56,0],_hips:[0,-0.035,-0.03],earL:[12,0,10],earR:[-16,0,-12],earL2:[10,0,0],earR2:[-12,0,0]})},
  {t:1.75,p:{}},
],fn:(t,T)=>{const q=bump(t,0.8,0.14)*Math.sin(2*Math.PI*t/0.05);return {...tail(t,0.6,10),chest:[0.7*q,0,0],head:[0,0,0.9*q],earL:[3*q,0,0],earR:[-3*q,0,0],earL2:[4*q,0,0],earR2:[-4*q,0,0]};}};

// F3 Hunter's Mark: two fingers drawn across her eyes, then pointed at the foe; a snap shot without looking down the shaft; she ends with the finger still pointing
NEW.sMark={T:1.2,...(()=>{const s=shot(0.40,0.47,0.54,0.56,0.55);return{draw:{keys:[{t:0,d:0,a:0,h:0},...s.draw]},
  offHand:{from:0.0,to:1.05,fade:0.06,keys:[{t:0.0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.08,p:[0.05,0.03,0.10],b:'head'},{t:0.20,p:[-0.06,0.03,0.10],b:'head'},{t:0.30,p:[-0.08,0.50,0.46]},{t:0.38,p:[-0.08,0.50,0.46]},...s.off,{t:0.72,p:[-0.10,0.50,0.46],ease:'in'},{t:0.98,p:[-0.10,0.50,0.46]}]},
  staffPose:{from:0.0,to:1.05,fade:0.1,keys:[{t:0.0,...CARRY},{t:0.30,...CARRY},{t:0.45,...LEVEL(0.6)},{t:0.54,...LEVEL(0)},{t:0.58,...LEVEL(-0.4,0.01),ease:'in'},{t:0.70,...LEVEL(0.3)},{t:0.86,...LEVEL(0.5,-0.06)},{t:1.05,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:{spine:[-2,4,0],head:[-6,-6,0],...EARS(-10,-6),tail1:[0,10,0]}},
  {t:0.20,p:{spine:[-2,-4,0],head:[-6,8,0],...EARS(-14,-8)}},
  {t:0.30,p:{spine:[-4,-10,0],chest:[0,-10,0],head:[-2,14,0],_hips:[0,-0.02,0],legL:[-10,0,4],legR:[8,0,-4],...EARS(8,6)}},
  {t:0.47,p:mix(STANCE,{spine:[-2,-12,0],chest:[-1,-22,0],head:[-6,30,0],_hips:[0,-0.03,-0.01]})},
  {t:0.56,p:mix(STANCE,{spine:[-2,-12,0],chest:[-1,-22,0],head:[-6,26,0],_hips:[0,-0.03,-0.01]})},
  {t:0.60,ease:'in',p:mix(STANCE,{spine:[-8,-8,0],chest:[-4,-14,0],head:[0,20,0],_hips:[0,-0.015,-0.04],footL:[-10,0,0],...EARS(22,18),tail1:[-16,0,0]})},
  {t:0.74,p:{spine:[-3,-6,0],chest:[0,-4,0],head:[-2,8,0],_hips:[0,-0.02,-0.02],legL:[-10,0,4],legR:[8,0,-4],...EARS(-6,-4)}},
  {t:0.98,p:{spine:[-3,-6,0],chest:[0,-4,0],head:[-3,8,0],_hips:[0,-0.02,-0.02],legL:[-10,0,4],legR:[8,0,-4]}},
  {t:1.2,p:{}},
],fn:(t,T)=>tail(t,0.6,8)};

// F4 Pinning Arrow: a hop, a steep shot down from the top of it (0.32), she lands (0.52) and tugs the line (0.64)
NEW.sPin={T:1.1,air:[[0.12,0.5]],...(()=>{const s=shot(0.06,0.16,0.28,0.32,0.8);return{draw:{keys:[{t:0,d:0,a:0,h:0},...s.draw]},
  offHand:{from:0.0,to:0.95,fade:0.06,keys:[{t:0.0,p:[-0.19,-0.1,0.04],b:'chest'},...s.off,{t:0.56,p:[-0.10,0.36,0.30]},{t:0.64,p:[-0.24,0.42,-0.06],ease:'in'},{t:0.8,p:[-0.22,0.40,-0.04]}]},
  staffPose:{from:0.0,to:0.98,fade:0.08,keys:[{t:0.0,...CARRY},{t:0.16,...AIMD(30,0.8,[0,0.05,0.02])},{t:0.28,...AIMD(40,0,[0,0.03,0.04])},{t:0.32,...AIMD(40,0,[0,0.03,0.04])},{t:0.36,...AIMD(48,-0.5,[0,0.05,0.02]),ease:'in'},{t:0.5,...LEVEL(0.3,-0.04)},{t:0.62,...LEVEL(0.2,-0.04)},{t:0.98,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.09,-0.02]}},
  {t:0.16,ease:'out',p:mix(AIRAIM,{spine:[14,-14,0],chest:[8,-26,0],head:[30,56,0],legL:[-30,0,7],legR:[26,0,-7],footL:[30,0,0],footR:[34,0,0],...EARS(-24,-18)})},
  {t:0.32,p:mix(AIRAIM,{spine:[22,-15,0],chest:[12,-27,0],head:[38,56,0],legL:[-34,0,7],legR:[30,0,-7],footL:[30,0,0],footR:[34,0,0],...EARS(-20,-14)})},
  {t:0.36,ease:'in',p:mix(AIRAIM,{spine:[10,-10,0],chest:[4,-18,0],head:[26,48,0],legL:[-30,0,7],legR:[22,0,-7],footL:[26,0,0],footR:[30,0,0],...EARS(30,26),tail1:[-20,0,0]})},
  {t:0.52,ease:'in',p:{...LAND,_hips:[0,-0.11,0]}},
  {t:0.64,ease:'in',p:mix(STANCE,{spine:[-12,-18,0],chest:[-6,-30,0],head:[2,62,0],_hips:[0,-0.06,-0.05],legL:[-30,0,7],legR:[20,0,-7],footL:[-10,0,0],...EARS(-18,-14),tail1:[16,0,0]})},
  {t:0.80,p:mix(STANCE,{spine:[-4,-14,0],head:[0,58,0],_hips:[0,-0.04,-0.03],...EARS(6,4)})},
  {t:1.1,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// F5 Rapid Fire: arrows held in the draw paw, the bow canted; nine fast shots (the paw a blur, an ear rocking each time), a full spin (the page turns her), the tenth out of the spin; end with the paw fanned out
NEW.sRapid={T:1.95,...(()=>{const tilt=(k=0)=>turnP(LEVEL(k),[0,0,1],-32); const D=[{t:0,d:0,a:0,h:0},{t:0.10,d:0,a:1,h:1}]; const R=[];
  for(let i=0;i<9;i++){const tr=0.20+i*0.11; D.push({t:tr-0.05,d:0.42,a:1,h:1},{t:tr,d:0.48,a:1,h:1},{t:tr+0.015,d:-0.06,a:0,h:1,ease:'lin'},{t:tr+0.05,d:0.02,a:1,h:1}); R.push(tr);}
  D.push({t:1.30,d:0.7,a:1,h:1},{t:1.50,d:0.75,a:1,h:1},{t:1.52,d:0.75,a:0,h:1},{t:1.545,d:-0.12,a:0,h:0,ease:'lin'},{t:1.58,d:0.05,a:0,h:0},{t:1.64,d:0,a:0,h:0});
  const SK=[{t:0.0,...CARRY},{t:0.10,...tilt(0.3)}]; for(const tr of R){SK.push({t:tr-0.01,...tilt(0)},{t:tr+0.03,...tilt(-0.25),ease:'in'});} SK.push({t:1.30,...LEVEL(0)},{t:1.52,...LEVEL(0)},{t:1.56,...LEVEL(-0.5,0.012),ease:'in'},{t:1.7,...LEVEL(0.2)},{t:1.9,...CARRY});
  return {R,draw:{keys:D},offHand:{from:0.0,to:1.85,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.06,p:QUIV,b:'chest'},{t:0.10,p:[0.05,0.045,0.15],b:'chest'},{t:1.52,p:[0.0,0.045,0.13],b:'chest'},{t:1.6,p:[-0.26,0.16,0.02],b:'chest',ease:'in'},{t:1.82,p:[-0.25,0.15,0.02],b:'chest'}]},staffPose:{from:0.0,to:1.92,fade:0.08,keys:SK}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,p:mix(STANCE,{spine:[0,-15,0],_hips:[0,-0.05,-0.01],legL:[-22,0,6],legR:[18,0,-6]})},
  {t:1.20,p:mix(STANCE,{spine:[0,-15,0],_hips:[0,-0.05,-0.01],legL:[-22,0,6],legR:[18,0,-6]})},
  {t:1.30,p:mix(STANCE,{spine:[-4,-20,0],chest:[-2,-34,0],head:[0,70,0],_hips:[0,-0.08,-0.02],legL:[-14,0,10],legR:[10,0,-10],...EARS(-30,-24)})},
  {t:1.50,p:mix(STANCE,{spine:[-6,-17,0],chest:[-3,-30,0],head:[2,66,0],_hips:[0,-0.07,-0.02],legL:[-24,0,6],legR:[20,0,-6],...EARS(-36,-28)})},
  {t:1.56,ease:'in',p:mix(STANCE,{spine:[-14,-10,0],chest:[-6,-16,0],head:[6,48,0],_hips:[0,-0.03,-0.06],legL:[-26,0,6],legR:[10,0,-6],footL:[-12,0,0],...EARS(30,26),tail1:[-20,0,0]})},
  {t:1.72,p:mix(STANCE,{spine:[-2,-14,0],head:[0,58,0],_hips:[0,-0.04,-0.04],...EARS(-10,-8)})},
  {t:1.95,p:{}},
],fn:(t,T)=>{let r=0;for(let i=0;i<9;i++)r+=bump(t,0.21+i*0.11,0.03)*(i%2?1:-1);return {...tail(t,0.4,8),earR:[14*r,0,0],earR2:[18*r,0,0],earL:[-6*r,0,0],chest:[0,2*r,0]};}};

// F6 Kill Shot: she tosses the arrow up (0.08), turns side-on and catches it on the string (0.30), a breath, loose 0.48, she holds still; then the arrow comes back to her paw (0.95)
NEW.sKill={T:1.4,...(()=>{const D=[{t:0,d:0,a:0,h:0},{t:0.30,d:0,a:0,h:0.6},{t:0.31,d:0,a:1,h:1},{t:0.44,d:0.92,a:1,h:1},{t:0.48,d:0.92,a:0,h:1},{t:0.505,d:-0.12,a:0,h:0,ease:'lin'},{t:0.54,d:0.06,a:0,h:0},{t:0.58,d:0,a:0,h:0}];
  return {draw:{keys:D},offHand:{from:0.0,to:1.25,fade:0.06,keys:[{t:0.0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.04,p:QUIV,b:'chest'},{t:0.10,p:[-0.12,0.78,0.10]},{t:0.22,p:[-0.10,0.70,0.12]},{t:0.31,p:[0.05,0.045,0.15],b:'chest'},{t:0.48,p:[0.0,0.045,0.13],b:'chest'},{t:0.56,p:BACK,b:'chest',ease:'in'},{t:0.88,p:[-0.18,0.10,0.06],b:'chest'},{t:0.96,p:[-0.12,0.74,0.14]},{t:1.06,p:[-0.12,0.72,0.14]},{t:1.2,p:QUIV,b:'chest'}]},
  staffPose:{from:0.0,to:1.3,fade:0.1,keys:[{t:0.0,...CARRY},{t:0.22,...LEVEL(0.9,0.04)},{t:0.32,...LEVEL(0.6)},{t:0.44,...LEVEL(0)},{t:0.48,...LEVEL(0)},{t:0.52,...LEVEL(-0.35,0.008),ease:'in'},{t:0.62,...LEVEL(0)},{t:0.86,...LEVEL(0.1)},{t:1.1,...LEVEL(0.4,-0.05)},{t:1.3,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.10,p:{spine:[-8,0,0],chest:[-6,0,0],head:[-30,0,0],_hips:[0,0.0,0],...EARS(-6,-4),footL:[10,0,0],footR:[10,0,0]}},
  {t:0.24,p:mix(STANCE,{spine:[-6,-12,0],chest:[-4,-20,0],head:[-26,50,0],_hips:[0,-0.03,0]})},
  {t:0.32,p:mix(STANCE,{spine:[-2,-15,0],_hips:[0,-0.04,-0.01],...EARS(-10,-8)})},
  {t:0.46,p:mix(STANCE,{spine:[-4,-16,0],chest:[-3,-29,0],head:[2,66,0],_hips:[0,-0.05,-0.02],...EARS(-24,-20)})},
  {t:0.48,p:mix(STANCE,{spine:[-4,-16,0],chest:[-3,-29,0],head:[2,66,0],_hips:[0,-0.05,-0.02],...EARS(-24,-20)})},
  {t:0.52,ease:'in',p:mix(STANCE,{spine:[-8,-12,0],chest:[-4,-22,0],head:[4,58,0],_hips:[0,-0.04,-0.04],footL:[-8,0,0],...EARS(14,12),tail1:[-14,0,0]})},
  {t:0.86,p:mix(STANCE,{spine:[-4,-14,0],chest:[-3,-26,0],head:[0,62,0],_hips:[0,-0.045,-0.035]})},
  {t:0.98,p:mix(STANCE,{spine:[-10,-10,0],chest:[-6,-16,0],head:[-28,40,0],_hips:[0,-0.03,-0.02],...EARS(-12,-8)})},
  {t:1.10,p:mix(STANCE,{spine:[-4,-10,0],head:[-10,40,0],_hips:[0,-0.03,-0.02]})},
  {t:1.4,p:{}},
],fn:(t,T)=>tail(t,0.6,8)};

// F7 Eagle Stance: in (0.45 s) she slides down onto her back haunch, the front paw forward, the bow level across it; shots from the stance; out: she springs up with a twirl of the bow
const KNEEL={hips:[4,-30,0],spine:[12,-14,0],chest:[-2,-26,0],head:[-8,64,0],_hips:[0,-0.155,0.0],legL:[-32,0,2],footL:[-6,0,0],legR:[20,0,-2],footR:[70,0,0],tail1:[-16,0,0],...EARS(10,18)};
const KAIM=(k=0)=>moveP(LEVEL(k),[0,-0.06,0.03]);
NEW.sEagleIn={T:0.6,air:[[0,0.6]],staffPose:{from:0.0,to:0.75,fade:0.05,keys:[{t:0,...CARRY},{t:0.30,...moveP(LEVEL(0.4),[0,-0.08,0])},{t:0.45,...KAIM(0.3)},{t:0.6,...KAIM(0.3)}]},keys:[
  {t:0,p:{}},{t:0.16,p:{...CROUCH,_hips:[0,-0.08,0]}},{t:0.36,ease:'in',p:add(KNEEL,{_hips:[0,-0.02,0],spine:[8,0,0]})},{t:0.45,p:KNEEL},{t:0.6,p:KNEEL}]};
NEW.sEagleShot={T:0.62,...(()=>{const s=seq([shot(0.02,0.10,0.24,0.28,0.9)]);return{draw:{keys:s.draw},offHand:{from:-0.1,to:0.75,fade:0.001,keys:[...s.off.slice(1),{t:0.5,p:QUIV,b:'chest'},{t:0.62,p:QUIV,b:'chest'}]},
  staffPose:{from:-0.1,to:0.75,fade:0.001,keys:[{t:0,...KAIM(0.3)},{t:0.10,...KAIM(0.6)},{t:0.24,...KAIM(0)},{t:0.28,...KAIM(0)},{t:0.31,...moveP(KAIM(-0.5),[0,0.015,0]),ease:'in'},{t:0.45,...KAIM(0.1)},{t:0.62,...KAIM(0.3)}]}};})(),air:[[0,0.62]],keys:[
  {t:0,p:KNEEL},{t:0.26,p:add(KNEEL,{spine:[-2,-2,0],head:[0,2,0]})},{t:0.31,ease:'in',p:add(KNEEL,{spine:[-9,4,0],chest:[-4,6,0],_hips:[0,0.01,-0.03],...EARS(20,18),tail1:[-10,0,0]})},{t:0.45,p:add(KNEEL,{spine:[-2,0,0]})},{t:0.62,p:KNEEL}]};
NEW.sEagleOut={T:0.9,air:[[0,0.25]],staffPose:{from:-0.1,to:0.9,fade:0.001,keys:[{t:0,...KAIM(0.3)},...spinKeys(STAFF(0,0.02),0.12,0.5,[0,1,0],1.0).map(k=>({...k})),{t:0.62,...SHOULDER},{t:0.9,...SHOULDER}]},keys:[
  {t:0,p:KNEEL},{t:0.12,ease:'out',p:{_hips:[0,0.02,0],spine:[-6,0,0],head:[-6,0,0],legL:[-14,0,4],legR:[10,0,-4],footL:[24,0,0],footR:[24,0,0],...EARS(-30,-24)}},
  {t:0.3,p:{spine:[2,20,0],chest:[0,16,0],head:[-2,-20,0],...EARS(10,16),tail1:[0,-20,0]}},{t:0.5,p:{spine:[0,-10,0],chest:[0,-8,0],head:[0,12,0],tail1:[0,16,0]}},{t:0.7,p:{spine:[2,0,0],upperarmR:[0,0,6]}},{t:0.9,p:{}}]};

// F8 Skypiercer: she springs straight up (0.12 to 0.32) and hangs drawn while the drill winds (0.3 to 1.0); loose 1.0; the recoil throws her into a back flip (page) and she lands on one paw (1.45), bow behind her back
NEW.sSky={T:2.0,air:[[0.12,1.45]],...(()=>{const D=[{t:0,d:0,a:0,h:0},{t:0.16,d:0,a:1,h:1},{t:0.95,d:1.0,a:1,h:1},{t:1.0,d:1.0,a:0,h:1},{t:1.025,d:-0.12,a:0,h:0,ease:'lin'},{t:1.06,d:0.06,a:0,h:0},{t:1.10,d:0,a:0,h:0}];
  return {draw:{keys:D},offHand:{from:0.0,to:1.3,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.08,p:QUIV,b:'chest'},{t:0.16,p:[0.05,0.045,0.15],b:'chest'},{t:1.0,p:[0.0,0.045,0.13],b:'chest'},{t:1.08,p:BACK,b:'chest',ease:'in'},{t:1.3,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:1.9,fade:0.08,keys:[{t:0,...CARRY},{t:0.16,...LEVEL(0.8,0.04)},{t:0.95,...LEVEL(0)},{t:1.0,...LEVEL(0)},{t:1.05,...LEVEL(-0.6,0.015),ease:'in'},{t:1.18,...LEVEL(0.4,0.06)},{t:1.45,...moveP(BEHIND,[0,0.02,-0.24])},{t:1.9,...moveP(BEHIND,[0,0.02,-0.24])}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.10,p:{...CROUCH}},
  {t:0.18,ease:'out',p:{_hips:[0,0.02,0],spine:[-8,0,0],head:[-6,0,0],legL:[10,0,3],legR:[10,0,-3],footL:[46,0,0],footR:[46,0,0],...EARS(-36,-30)}},
  {t:0.34,p:mix(AIRAIM,{legL:[-26,0,6],legR:[14,0,-6],footL:[34,0,0],footR:[40,0,0],...EARS(-10,-6)})},
  {t:0.95,p:mix(AIRAIM,{hips:[0,-30,0],spine:[-6,-18,0],chest:[-4,-31,0],head:[4,68,0],legL:[-32,0,6],legR:[20,0,-6],footL:[34,0,0],footR:[40,0,0],...EARS(-40,-30)})},
  {t:1.0,p:mix(AIRAIM,{hips:[0,-30,0],spine:[-6,-18,0],chest:[-4,-31,0],head:[4,68,0],legL:[-32,0,6],legR:[20,0,-6],footL:[34,0,0],footR:[40,0,0],...EARS(-40,-30)})},
  {t:1.08,ease:'in',p:{...TUCK,...EARS(30,26)}},
  {t:1.30,p:{...TUCK,spine:[30,0,0],legL:[-80,0,10],legR:[-90,0,-10]}},
  {t:1.45,ease:'in',p:{_hips:[0,-0.12,0],spine:[26,0,0],chest:[6,0,0],head:[-14,0,0],legL:[-30,0,8],footL:[40,0,0],legR:[40,0,-8],footR:[30,0,0],...EARS(34,30),tail1:[-16,0,0]}},
  {t:1.62,p:{_hips:[0,-0.07,0],spine:[10,0,0],head:[-6,0,0],legL:[-16,0,6],footL:[14,0,0],legR:[28,0,-6],footR:[30,0,0],...EARS(-10,-8)}},
  {t:2.0,p:{}},
],fn:(t,T)=>{const q=bump(t,0.75,0.2)*Math.sin(2*Math.PI*t/0.05);return {...tail(t,0.6,10),earL:[3*q,0,0],earR:[-3*q,0,0]};}};
// the spec's per-style Eagle Stance: Deadeye braces the level bow on the raised left knee (a sniper's rest), hunched along it; each shot jolts her back 2 cm.
// Volley leans back 25° with the bow pointed 60° up; each shot thumps up and her body bobs with it.
const eagleVar=(P,B,rec)=>({T:0.62,...(()=>{const s=seq([shot(0.02,0.10,0.24,0.28,0.9)]);return{draw:{keys:s.draw},offHand:{from:-0.1,to:0.75,fade:0.001,keys:[...s.off.slice(1),{t:0.5,p:QUIV,b:'chest'},{t:0.62,p:QUIV,b:'chest'}]},
  staffPose:{from:-0.1,to:0.75,fade:0.001,keys:[{t:0,...P(0.3)},{t:0.10,...P(0.6)},{t:0.24,...P(0)},{t:0.28,...P(0)},{t:0.31,...moveP(P(-0.5),[0,0.015,0]),ease:'in'},{t:0.45,...P(0.1)},{t:0.62,...P(0.3)}]}};})(),air:[[0,0.62]],keys:[
  {t:0,p:B},{t:0.26,p:add(B,{spine:[-1,-2,0]})},{t:0.31,ease:'in',p:add(B,rec)},{t:0.45,p:add(B,{spine:[-1,0,0]})},{t:0.62,p:B}]});
const KNEEL_DE=add(KNEEL,{spine:[14,0,0],chest:[6,0,0],head:[-14,0,0]}), KAIM_DE=(k=0)=>moveP(LEVEL(k),[0,-0.17,0.08]);
const KNEEL_VO=add(KNEEL,{hips:[-8,0,0],spine:[-20,0,0],chest:[-12,0,0],head:[-6,0,0],tail1:[10,0,0]}), KAIM_VO=(k=0)=>AIMD(-72,k,[0,0.07,-0.04]);
NEW.sEagleShotDE=eagleVar(KAIM_DE,KNEEL_DE,{_hips:[0,0,-0.02],spine:[-4,2,0],...EARS(18,16)});
NEW.sEagleShotVO=eagleVar(KAIM_VO,KNEEL_VO,{_hips:[0,-0.025,0],spine:[-5,0,0],chest:[-3,0,0],...EARS(-20,-24),tail1:[-10,0,0]});
NEW.sEagleInDE={...NEW.sEagleIn,staffPose:{...NEW.sEagleIn.staffPose,keys:[{t:0,...CARRY},{t:0.30,...moveP(LEVEL(0.4),[0,-0.12,0])},{t:0.45,...KAIM_DE(0.3)},{t:0.6,...KAIM_DE(0.3)}]},keys:[{t:0,p:{}},{t:0.16,p:{...CROUCH,_hips:[0,-0.08,0]}},{t:0.36,ease:'in',p:add(KNEEL_DE,{_hips:[0,-0.02,0]})},{t:0.45,p:KNEEL_DE},{t:0.6,p:KNEEL_DE}]};
NEW.sEagleInVO={...NEW.sEagleIn,staffPose:{...NEW.sEagleIn.staffPose,keys:[{t:0,...CARRY},{t:0.30,...moveP(LEVEL(0.4),[0,-0.04,0])},{t:0.45,...KAIM_VO(0.3)},{t:0.6,...KAIM_VO(0.3)}]},keys:[{t:0,p:{}},{t:0.16,p:{...CROUCH,_hips:[0,-0.08,0]}},{t:0.36,ease:'in',p:add(KNEEL_VO,{_hips:[0,-0.02,0]})},{t:0.45,p:KNEEL_VO},{t:0.6,p:KNEEL_VO}]};
