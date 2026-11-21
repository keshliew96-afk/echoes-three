// ---------------------------------------------------------------- batch 2, Volley (the Dragon Nest bow master: wide and turning; fans from between the fingers, behind the back, in the air; the turns carry from shot to shot)
const SC=(o)=>{const s=seq(o.shots.map(a=>shot(...a)));return {T:o.T,...(o.air?{air:o.air}:{}),draw:{keys:s.draw},offHand:{from:0,to:o.offTo||o.T,fade:0.04,keys:o.off?o.off(s.off):s.off},staffPose:{from:0,to:o.T,fade:0.05,keys:o.staff},keys:o.keys,...(o.fn?{fn:o.fn}:{})};};
const AK=(P,tn,td,tr)=>[{t:tn,...P(0.3)},{t:td,...P(0)},{t:tr,...P(0)},{t:tr+0.03,...P(-0.5,0.01),ease:'in'},{t:tr+0.14,...P(0.1)}];
const ST0={_hips:[0,-0.04,0],spine:[4,0,0],legL:[-12,0,6],legR:[10,0,-6]};
const ONEPAW={_hips:[0,-0.02,0],spine:[2,0,0],head:[-6,0,0],legL:[-2,0,3],footL:[24,0,0],legR:[-46,0,-36],footR:[46,0,0],...EARS(-40,-46),tail1:[10,0,0]};

// F2 Pressure line: the full draw turned through a whole circle on her front paw (page), the hold sinking lower, the loose (1.0) pushes her back a step
NEW.vSpinDraw={...NEW.sPower,fn:(t,T)=>{const u=Math.min(1,Math.max(0,(t-0.5)/0.4)),w=t<1.0?u*u*(3-2*u):Math.max(0,1-(t-1.0)/0.2);return {...tail(t,0.5,10),_hips:[0,-0.08*w,0.01*w],spine:[8*w,0,0],legL:[-14*w,0,0],legR:[10*w,0,0],earL:[-30*w,0,0],earR:[-30*w,0,0]};}};

// F3 Flare: a pirouette on one paw (page), a snap shot straight up from behind her back at the end of the turn (0.28), she looks up shading her eyes with one paw
const UPB=(k=0,u=0)=>moveP(AIMD(-86,k,[0,0,0]),[0,0.12+u,-0.12]);
NEW.vFlare=SC({T:0.62,shots:[[0.08,0.13,0.26,0.28,0.6]],staff:[{t:0,...CARRY},{t:0.08,...UPB(0.3)},...AK(UPB,0.13,0.26,0.28).slice(1),{t:0.62,...UPB(0.2)}],
  off:(o)=>[...o,{t:0.4,p:[0.02,0.12,0.12],b:'head'},{t:0.62,p:[0.02,0.12,0.12],b:'head'}],keys:[
  {t:0,p:{}},{t:0.05,p:ONEPAW},{t:0.2,p:ONEPAW},
  {t:0.28,p:{...ST0,spine:[-14,0,0],chest:[-8,0,0],head:[-30,0,0],...EARS(-30,-30)}},
  {t:0.4,p:{...ST0,spine:[-12,0,0],chest:[-8,0,0],head:[-40,0,0],...EARS(-50,-56)}},
  {t:0.62,p:{...ST0,spine:[-10,0,0],chest:[-6,0,0],head:[-40,0,0],...EARS(-50,-56)}}]});

// F4 Net: a hop back, an overhead shot from the top of it with the bow nearly flat (0.2), she pulls her draw paw down as if drawing the net closed (0.42)
const NETP=(k=0,u=0)=>moveP(turnP(FLATP(k,u),[1,0,0],-40),[0,0.12,0]);
NEW.vNet=SC({T:0.75,air:[[0.04,0.3]],shots:[[0.03,0.07,0.18,0.2,0.7]],staff:[{t:0,...CARRY},{t:0.07,...NETP(0.3)},...AK(NETP,0.07,0.18,0.2).slice(1),{t:0.5,...NETP(0.2)},{t:0.75,...CARRY}],
  off:(o)=>[...o.filter(k=>k.t<=0.25),{t:0.3,p:[0.1,1.15,0.4]},{t:0.42,p:[0.1,0.45,0.32],ease:'in'},{t:0.6,p:[0.1,0.45,0.32]},{t:0.75,p:[-0.19,-0.1,0.04],b:'chest'}],keys:[
  {t:0,p:{}},{t:0.04,p:{...CROUCH,_hips:[0,-0.12,0]}},
  {t:0.1,ease:'out',p:{spine:[-14,0,0],chest:[-8,0,0],head:[-30,0,0],legL:[-30,0,6],legR:[-10,0,-6],footL:[40,0,0],footR:[40,0,0],...EARS(-40,-46)}},
  {t:0.22,p:{spine:[-18,0,0],chest:[-10,0,0],head:[-34,0,0],legL:[-24,0,6],legR:[-14,0,-6],footL:[40,0,0],footR:[40,0,0],...EARS(-30,-40)}},
  {t:0.31,ease:'in',p:{...LAND,_hips:[0,-0.14,0],spine:[10,0,0]}},
  {t:0.42,p:{...CROUCH,_hips:[0,-0.13,0],spine:[24,0,0],head:[-24,0,0],...EARS(20,30)}},
  {t:0.75,p:{_hips:[0,-0.05,0],spine:[8,0,0],...EARS(-10,-6)}}]});

// F5 Herding sweep: ten snap shots, one every 0.14 s, walking (the page carries her round a quarter circle and swings her); the bow sweeps like a scythe; the last two from behind her back
const V5D=[{t:0,d:0,a:0,h:0}];for(let k=0;k<10;k++){const b=0.075+k*0.14-0.06;V5D.push({t:b,d:0.12,a:1,h:1},{t:b+0.055,d:0.42,a:1,h:1},{t:b+0.075,d:-0.07,a:0,h:1,ease:'lin'},{t:b+0.1,d:0.04,a:1,h:1});}V5D.push({t:1.55,d:0,a:0,h:0});
const BBK=(k=0)=>moveP(turnP(LEVEL(k),[0,1,0],-60),[-0.12,-0.08,-0.16]);
NEW.vScythe={T:1.7,draw:{keys:V5D},offHand:{from:-0.3,to:1.55,fade:0.05,keys:[{t:0,p:[0.02,-0.06,0.12],b:'chest'},{t:1.55,p:[0.02,-0.06,0.12],b:'chest'}]},
  staffPose:{from:0,to:1.7,fade:0.06,keys:[{t:0,...CARRY},{t:0.06,...LEVEL(0.2)},{t:1.1,...LEVEL(0.2)},{t:1.2,...BBK(0.2)},{t:1.5,...BBK(0.2)},{t:1.7,...CARRY}]},
  keys:[{t:0,p:{}},{t:0.06,p:{_hips:[0,-0.06,0],spine:[6,30,0],chest:[2,20,0],head:[-6,-30,0],earL:[-20,0,20],earR:[-20,0,20]}},{t:1.1,p:{_hips:[0,-0.06,0],spine:[6,-30,0],chest:[2,-20,0],head:[-6,30,0],earL:[-20,0,-20],earR:[-20,0,-20]}},
    {t:1.2,p:{_hips:[0,-0.07,0],spine:[10,40,0],chest:[4,30,0],head:[-6,-70,0],...EARS(-30,-30)}},{t:1.5,p:{_hips:[0,-0.07,0],spine:[10,40,0],chest:[4,30,0],head:[-6,-70,0],...EARS(-30,-30)}},{t:1.7,p:{}}],
  fn:(t,T)=>{const w=t>0.06&&t<1.55?1:0;return {legL:[-24*Math.sin(2*Math.PI*t/0.28)*w,0,0],legR:[24*Math.sin(2*Math.PI*t/0.28)*w,0,0],_hips:[0,0.012*Math.abs(Math.sin(2*Math.PI*t/0.28))*w,0],...tail(t,0.28,10)};}};

// F8 Wind wall: the base Skypiercer leap and hang, then she lands and slaps both forepaws on the floor (0.25) and the wall locks
NEW.vSlap={T:0.6,offHand:{from:0,to:0.55,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.25,p:[0.14,0.03,0.42],ease:'in'},{t:0.4,p:[0.14,0.03,0.42]},{t:0.55,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{...LAND}},{t:0.14,p:{...CROUCH,_hips:[0,-0.12,0],spine:[0,0,0],head:[-20,0,0],...ARMS([-150,-30,-10],[-150,30,-10]),...EARS(-40,-40)}},
  {t:0.25,ease:'in',p:{...CROUCH,_hips:[0,-0.22,0],spine:[60,0,0],chest:[16,0,0],head:[-46,0,0],...ARMS([-50,-20,0],[-50,20,0]),...EARS(50,60)}},
  {t:0.4,p:{...CROUCH,_hips:[0,-0.21,0],spine:[58,0,0],chest:[15,0,0],head:[-36,0,0],...ARMS([-50,-20,0],[-50,20,0]),...EARS(30,46)}},
  {t:0.6,p:{_hips:[0,-0.08,0],spine:[14,0,0],head:[-10,0,0],...EARS(-10,-6)}}]};

// F9 Painted fan: three arrows between her fingers, a flat release swept across her body (0.25); a flick of the draw paw paints the foes
const FFP=(k=0,u=0)=>moveP(FLATP(k,u),[0,0.02,0.02]);
NEW.vFingerFan=SC({T:0.66,shots:[[0.02,0.08,0.22,0.25,0.7]],staff:[{t:0,...CARRY},{t:0.08,...turnP(FFP(0.3),[0,1,0],30)},{t:0.22,...FFP(0)},{t:0.25,...turnP(FFP(0),[0,1,0],-14)},{t:0.29,...turnP(FFP(-0.5,0.01),[0,1,0],-20),ease:'in'},{t:0.45,...FFP(0.1)},{t:0.66,...CARRY}],
  off:(o)=>[...o.filter(k=>k.t<=0.3),{t:0.36,p:[-0.3,0.2,0.1],b:'chest'},{t:0.42,p:[-0.42,0.05,0.24],b:'chest',ease:'in'},{t:0.5,p:[-0.42,0.05,0.24],b:'chest'},{t:0.66,p:[-0.19,-0.1,0.04],b:'chest'}],keys:[
  {t:0,p:{}},{t:0.08,p:{...ST0,spine:[6,30,0],chest:[2,20,0],head:[-6,-26,0],...EARS(-10,-10)}},
  {t:0.25,p:{...ST0,spine:[6,-20,0],chest:[2,-14,0],head:[-6,20,0],...EARS(-20,-20)}},
  {t:0.3,ease:'in',p:{...ST0,spine:[0,-28,0],chest:[-2,-18,0],head:[-4,24,0],...EARS(10,10)}},
  {t:0.42,p:{...ST0,spine:[4,-24,0],head:[-6,10,0],...EARS(-30,-20),tail1:[0,30,0]}},
  {t:0.66,p:{...ST0,...EARS(-10,-6)}}]});

// F10 Hopping rain: a lean-back shot straight up with one hind leg raised behind, bent (0.5); then she points at the pack with an open paw (the page snaps her to each hop)
const UPS=(k=0,u=0)=>AIMD(-84,k,[0,0.08+u,-0.04]);
NEW.vUpShot=SC({T:1.0,shots:[[0.12,0.2,0.46,0.5,0.95]],staff:[{t:0,...CARRY},{t:0.18,...UPS(0.3)},...AK(UPS,0.2,0.46,0.5).slice(1),{t:0.8,...LEVEL(0.3)},{t:1.0,...CARRY}],
  off:(o)=>[...o.filter(k=>k.t<=0.6),{t:0.8,p:[-0.06,0.95,0.6]},{t:1.0,p:[-0.06,0.95,0.6]}],keys:[
  {t:0,p:{}},{t:0.2,p:{...ST0,spine:[-20,0,0],chest:[-12,0,0],head:[-30,0,0],legR:[40,0,-6],footR:[70,0,0],...EARS(-30,-30),tail1:[20,0,0]}},
  {t:0.46,p:{...ST0,spine:[-24,0,0],chest:[-14,0,0],head:[-34,0,0],legR:[46,0,-6],footR:[76,0,0],...EARS(-40,-40),tail1:[20,0,0]}},
  {t:0.52,ease:'in',p:{...ST0,spine:[-28,0,0],chest:[-16,0,0],head:[-36,0,0],legR:[40,0,-6],footR:[70,0,0],...EARS(-10,-10)}},
  {t:0.8,p:mix(STANCE,{spine:[4,0,0],head:[-6,0,0],...EARS(-10,-20)})},{t:1.0,p:mix(STANCE,{spine:[4,0,0],head:[-6,0,0],...EARS(-10,-20)})}]});
NEW.vPoint={T:1.0,loop:true,offHand:{from:-0.3,to:1.3,fade:0.05,keys:[{t:0,p:[-0.06,0.95,0.6]},{t:1.0,p:[-0.06,0.95,0.6]}]},keys:[{t:0,p:mix(STANCE,{spine:[4,0,0],head:[-6,0,0],...EARS(-10,-20)})},{t:1.0,p:mix(STANCE,{spine:[4,0,0],head:[-6,0,0],...EARS(-10,-20)})}],fn:(t,T)=>tail(t,1.0,6)};

// F11 Cluster: after the lob she spins away on her toes (page), back to the blast; she raises a paw and snaps her fingers (0.65)
NEW.vSnap={T:0.9,offHand:{from:0,to:0.9,fade:0.06,keys:[{t:0,p:[-0.2,0.08,0.05],b:'chest'},{t:0.45,p:[0.0,0.72,0.3]},{t:0.62,p:[0.02,0.8,0.32]},{t:0.66,p:[-0.02,0.76,0.3],ease:'in'},{t:0.9,p:[-0.02,0.76,0.3]}]},keys:[
  {t:0,p:{}},{t:0.06,p:{_hips:[0,0.03,0],spine:[-4,0,0],legL:[-4,0,2],legR:[-8,0,-2],footL:[40,0,0],footR:[40,0,0],...ARMS([10,-10,-60],[10,10,-60]),...EARS(-50,-56),tail1:[0,30,0]}},
  {t:0.3,p:{_hips:[0,0.03,0],spine:[-4,0,0],legL:[-4,0,2],legR:[-8,0,-2],footL:[40,0,0],footR:[40,0,0],...ARMS([10,-10,-60],[10,10,-60]),...EARS(-50,-56)}},
  {t:0.42,p:mix(STANCE,{spine:[-2,-10,0],head:[-8,-40,0],...EARS(-20,-10)})},
  {t:0.66,p:mix(STANCE,{spine:[-6,-10,0],head:[-10,-50,0],...EARS(30,20),tail1:[0,-20,0]})},
  {t:0.9,p:mix(STANCE,{spine:[-4,-10,0],head:[-8,-50,0],...EARS(-30,-40)})}]};

// F12 Spinning top: the bowling delivery (the wheel already stands on its edge from the spin): front paw in, back leg sweeping behind (knee bent), bow arm swinging low (0.08); the low follow-through held
NEW.vBowl={T:0.62,keys:[
  {t:0,p:{_hips:[0,-0.06,0],spine:[10,0,0],legL:[-14,0,6],legR:[10,0,-6],...ARMS([60,-20,-20],[-40,30,-20]),...EARS(-20,-20)}},
  {t:0.08,ease:'in',p:{_hips:[0,-0.19,0.04],hips:[0,-10,0],spine:[40,0,0],chest:[12,0,0],head:[-34,0,0],legL:[-46,0,6],footL:[30,0,0],legR:[56,0,24],footR:[60,0,0],...ARMS([-70,-14,-10],[20,60,-20]),...EARS(30,30),tail1:[-20,0,0]}},
  {t:0.4,p:{_hips:[0,-0.19,0.04],hips:[0,-10,0],spine:[38,0,0],chest:[12,0,0],head:[-34,0,0],legL:[-46,0,6],footL:[30,0,0],legR:[56,0,24],footR:[60,0,0],...ARMS([-76,-14,-10],[24,62,-20]),...EARS(-10,0)}},
  {t:0.62,p:{_hips:[0,-0.06,0],spine:[10,0,0],legL:[-14,0,6],legR:[10,0,-6],...EARS(-10,-6)}}]};

// F14 Updraft: a spindle spin on one paw (page), a flat shot at its end (0.6), both forepaws thrown up, head tilted back watching them turn
const SPF=(k=0,u=0)=>moveP(FLATP(k,u),[0,0.02,0]);
NEW.vSpindle=SC({T:1.2,shots:[[0.3,0.36,0.56,0.6,0.8]],offTo:0.66,staff:[{t:0,...CARRY},{t:0.1,...SPF(0.3)},...AK(SPF,0.36,0.56,0.6),{t:0.8,...moveP(OVERHEAD(0),[0,0.06,0])},{t:1.2,...moveP(OVERHEAD(0),[0,0.06,0])}],
  off:(o)=>[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.3,p:[-0.19,-0.1,0.04],b:'chest'},...o.filter(k=>k.t>=0.3)],keys:[
  {t:0,p:{}},{t:0.08,p:{...ONEPAW,...ARMS([-20,-10,-90],[-20,10,-90])}},{t:0.4,p:{...ONEPAW}},
  {t:0.6,p:{...ST0,spine:[4,-10,0],head:[-6,10,0],...EARS(-30,-30)}},
  {t:0.72,ease:'out',p:{...ST0,_hips:[0,0.0,0],spine:[-14,0,0],chest:[-8,0,0],head:[-34,0,0],...ARMS([-150,-40,0],[-150,40,0]),...EARS(-50,-56)}},
  {t:1.2,p:{...ST0,_hips:[0,0.0,0],spine:[-16,0,0],chest:[-9,0,0],head:[-36,0,0],...ARMS([-152,-40,0],[-152,40,0]),...EARS(-56,-60)}}]});

// F15 Linked traps: a hop and a stab of a trap at her feet (0.3); three in a row (the page hops her across); then the cord whipped out between them with a flick of her arm
NEW.vStabHop={T:0.4,air:[[0.04,0.18]],offHand:{from:0,to:0.4,fade:0.04,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.1,p:QUIV,b:'chest'},{t:0.27,p:[0.14,0.06,0.24],ease:'in'},{t:0.32,p:[0.14,0.06,0.24]},{t:0.4,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{_hips:[0,-0.06,0],spine:[10,0,0]}},{t:0.05,ease:'out',p:{spine:[0,0,0],legL:[-20,0,6],legR:[-14,0,-6],footL:[40,0,0],footR:[40,0,0],...EARS(-40,-40)}},
  {t:0.2,ease:'in',p:{...LAND,_hips:[0,-0.14,0]}},{t:0.28,p:{...CROUCH,_hips:[0,-0.2,0],spine:[46,0,0],head:[-30,0,0],...EARS(20,20)}},{t:0.4,p:{...CROUCH,_hips:[0,-0.14,0],spine:[30,0,0],head:[-20,0,0]}}]};
NEW.vWhip={T:0.45,offHand:{from:0,to:0.45,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.08,p:[0.3,0.4,0.1]},{t:0.16,p:[0.0,0.5,0.5],ease:'in'},{t:0.22,p:[-0.3,0.4,0.3]},{t:0.45,p:[-0.19,-0.1,0.04],b:'chest'}]},keys:[
  {t:0,p:{...CROUCH,_hips:[0,-0.14,0],spine:[30,0,0]}},{t:0.08,p:{_hips:[0,-0.08,0],spine:[10,30,0],head:[-10,-20,0],...EARS(-10,-10)}},{t:0.18,p:{_hips:[0,-0.08,0],spine:[14,-30,0],head:[-10,20,0],...EARS(-30,-30),tail1:[0,30,0]}},{t:0.45,p:{_hips:[0,-0.05,0],spine:[6,0,0],...EARS(-10,-6)}}]};

// F16 Crossfire: one arrow straight up to her left (0.32), a turn on her paw (page), one straight up to her right (0.62); later her forearms cross in an X over her head as the curtains meet
const SKY=(k=0,u=0)=>AIMD(-82,k,[0,0.08+u,-0.03]);
NEW.vSky2=SC({T:1.0,shots:[[0.08,0.14,0.29,0.32,0.8],[0.4,0.46,0.6,0.62,0.8]],staff:[{t:0,...CARRY},...AK(SKY,0.14,0.29,0.32),...AK(SKY,0.46,0.6,0.62),{t:1.0,...CARRY}],keys:[
  {t:0,p:{}},{t:0.14,p:{...ST0,spine:[-16,0,8],chest:[-8,0,4],head:[-30,0,0],...EARS(-30,-30)}},{t:0.34,ease:'in',p:{...ST0,spine:[-20,0,8],chest:[-10,0,4],head:[-34,0,0],...EARS(0,0)}},
  {t:0.4,p:ONEPAW},{t:0.46,p:{...ST0,spine:[-16,0,-8],chest:[-8,0,-4],head:[-30,0,0],...EARS(-30,-30)}},{t:0.64,ease:'in',p:{...ST0,spine:[-20,0,-8],chest:[-10,0,-4],head:[-34,0,0],...EARS(0,0)}},{t:1.0,p:{...ST0,...EARS(-10,-6)}}]});
NEW.vCrossX={T:0.7,keys:[{t:0,p:{...ST0}},{t:0.21,ease:'out',p:{...ST0,_hips:[0,-0.08,0],spine:[-6,0,0],head:[-20,0,0],upperarmR:[-150,0,30],forearmR:[0,0,-50],upperarmL:[-150,0,-30],forearmL:[0,0,50],...EARS(-50,-56)}},
  {t:0.5,p:{...ST0,_hips:[0,-0.08,0],spine:[-6,0,0],head:[-20,0,0],upperarmR:[-150,0,30],forearmR:[0,0,-50],upperarmL:[-150,0,-30],forearmL:[0,0,50],...EARS(-50,-56)}},{t:0.7,p:{...ST0}}]};

// F17 Gust: the five arrows fanned open like a hand fan; a full-body swing from low behind to high in front, back paw planted, hips turning (0.38); the follow-through onto her toes, ears blown forward
const FANLO=moveP(turnP(FLATP(0),[0,1,0],60),[0.02,-0.22,-0.14]), FANHI=moveP(turnP(FLATP(0),[0,1,0],-40),[0,0.26,0.12]);
NEW.vGust={T:0.7,staffPose:{from:0,to:0.7,fade:0.05,keys:[{t:0,...CARRY},{t:0.12,...FLATP(0.2)},{t:0.22,...FANLO},{t:0.38,...FANHI,ease:'out'},{t:0.5,...FANHI},{t:0.7,...CARRY}]},
  offHand:{from:0,to:0.6,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.1,p:[0.06,0.48,0.3]},{t:0.18,p:[0.18,0.46,0.3]},{t:0.3,p:[-0.3,0.3,0.0],b:'chest'},{t:0.6,p:[-0.3,0.3,0.0],b:'chest'}]},keys:[
  {t:0,p:{}},{t:0.12,p:{...ST0,head:[-10,0,0],...EARS(-10,-10)}},
  {t:0.22,p:{_hips:[0,-0.15,0],hips:[0,40,0],spine:[24,30,0],chest:[8,14,0],head:[-20,-40,0],legL:[-30,0,8],legR:[24,0,-8],...EARS(10,10),tail1:[0,30,0]}},
  {t:0.38,ease:'out',p:{_hips:[0,-0.02,0.04],hips:[0,-40,0],spine:[-14,-30,0],chest:[-6,-14,0],head:[-10,30,0],legL:[-26,0,8],legR:[30,0,-8],footR:[30,0,0],...EARS(40,40),tail1:[0,-30,0]}},
  {t:0.48,p:{_hips:[0,0.03,0.05],hips:[0,-40,0],spine:[-16,-30,0],head:[-8,30,0],legL:[-20,0,6],footL:[40,0,0],legR:[30,0,-6],footR:[50,0,0],...EARS(50,56)}},
  {t:0.7,p:{...ST0,...EARS(-10,-6)}}]};

// F20 Two knots: the staff spin; a thrust to her left (0.62) plants knot one; a spinning back thrust to her right (page turn, 0.82) plants knot two; the bow ends crosswise in front, both paws on it
const THL=moveP(STAFF(0,0.02),[0.28,0,0.02]), THR=moveP(STAFF(0,0.02),[-0.3,0,0.02]);
NEW.vKnots={T:1.1,staffPose:{from:0,to:1.1,fade:0.05,keys:[{t:0,...CARRY},...spinKeys(STAFF(0,0.02),0.05,0.45,[0,1,0],2),{t:0.54,...STAFF(0,0.02)},{t:0.62,...THL,ease:'in'},{t:0.68,...THL},{t:0.76,...STAFF(0,0.02)},{t:0.82,...THR,ease:'in'},{t:0.9,...THR},{t:0.98,...STAFF(0,0.04)},{t:1.1,...STAFF(0,0.04)}]},
  offHand:{from:0.5,to:1.1,fade:0.04,keys:[{t:0.5,p:[0.17,0.52,0.2]},{t:0.62,p:[0.45,0.52,0.22]},{t:0.68,p:[0.45,0.52,0.22]},{t:0.76,p:[0.17,0.52,0.2]},{t:0.82,p:[-0.13,0.52,0.22]},{t:0.9,p:[-0.13,0.52,0.22]},{t:0.98,p:[0.17,0.54,0.2]},{t:1.1,p:[0.17,0.54,0.2]}]},keys:[
  {t:0,p:{}},{t:0.2,p:{...ST0,spine:[0,16,0],head:[-6,-14,0],...EARS(-20,-20)}},{t:0.4,p:{...ST0,spine:[0,-16,0],head:[-6,14,0],...EARS(-20,-20)}},
  {t:0.62,ease:'in',p:{_hips:[0,-0.12,0],spine:[10,30,10],head:[-6,-30,0],legL:[-30,0,30],footL:[30,0,0],legR:[14,0,-4],...EARS(20,10),tail1:[0,-30,0]}},
  {t:0.7,p:{_hips:[0,-0.06,0],spine:[6,0,0],legL:[-10,0,6],legR:[8,0,-6],...EARS(-20,-20)}},
  {t:0.82,ease:'in',p:{_hips:[0,-0.12,0],spine:[10,-30,-10],head:[-6,30,0],legR:[-30,0,-30],footR:[30,0,0],legL:[14,0,4],...EARS(20,10),tail1:[0,30,0]}},
  {t:0.98,p:{...ST0,_hips:[0,-0.08,0],spine:[10,0,0],head:[-10,0,0],...EARS(-10,-10)}},{t:1.1,p:{...ST0,_hips:[0,-0.08,0],spine:[10,0,0],head:[-10,0,0],...EARS(-10,-10)}}]};

// F23 Parting fans: shots back while running, never turning round: under her arm, over her shoulder, and from a forward roll (the hips turn her over inside the clip)
const runFn=(t,T)=>({legL:[14-40*S(t,0.32),0,-3],legR:[-24+40*S(t,0.32),0,3],footL:[24+22*S(t,0.32,0.2),0,0],footR:[24-22*S(t,0.32,0.2),0,0],_hips:[0,0.05+0.03*Math.cos(4*Math.PI*t/0.32),0],...tail(t,0.32,10)});
const BACKA=(k=0,u=0)=>moveP(turnP(LEVEL(k,u),[0,1,0],170),[0.0,-0.12,-0.02]), BACKB=(k=0,u=0)=>moveP(turnP(LEVEL(k,u),[0,1,0],180),[0.04,0.16,-0.2]);
NEW.vRunBackA={...SC({T:0.32,shots:[[0.0,0.03,0.13,0.15,0.6]],staff:[{t:0,...CARRY},...AK(BACKA,0.03,0.13,0.15),{t:0.32,...CARRY}],keys:[{t:0,p:{spine:[12,0,0]}},{t:0.06,p:{spine:[16,40,0],chest:[6,30,0],head:[-6,-70,0],...EARS(-40,-40)}},{t:0.22,p:{spine:[16,40,0],chest:[6,30,0],head:[-6,-70,0],...EARS(-40,-40)}},{t:0.32,p:{spine:[12,0,0]}}],fn:runFn}),air:[[0,0.32]]};
NEW.vRunBackB={...SC({T:0.32,shots:[[0.0,0.03,0.13,0.15,0.6]],staff:[{t:0,...CARRY},...AK(BACKB,0.03,0.13,0.15),{t:0.32,...CARRY}],keys:[{t:0,p:{spine:[12,0,0]}},{t:0.06,p:{spine:[6,-30,0],chest:[0,-30,0],head:[-6,80,0],...EARS(-40,-40)}},{t:0.22,p:{spine:[6,-30,0],chest:[0,-30,0],head:[-6,80,0],...EARS(-40,-40)}},{t:0.32,p:{spine:[12,0,0]}}],fn:runFn}),air:[[0,0.32]]};
NEW.vRunRoll={T:0.48,air:[[0,0.48]],...(()=>{const s=seq([shot(0.04,0.08,0.2,0.22,0.6)]);const RP=(k=0,u=0)=>moveP(LEVEL(k,u),[0,-0.04,0]);return{draw:{keys:s.draw},offHand:{from:0,to:0.4,fade:0.04,keys:s.off},staffPose:{from:0,to:0.48,fade:0.04,keys:[{t:0,...CARRY},...AK(RP,0.08,0.2,0.22),{t:0.48,...CARRY}]}};})(),keys:[
  {t:0,p:{spine:[12,0,0]}},{t:0.08,p:{...TUCK,_hips:[0,-0.24,0],hips:[90,0,0],head:[30,0,0]}},{t:0.16,p:{...TUCK,_hips:[0,-0.24,0],hips:[180,0,0],head:[30,0,0]}},{t:0.24,p:{...TUCK,_hips:[0,-0.24,0],hips:[270,0,0],head:[30,0,0]}},{t:0.34,p:{...TUCK,_hips:[0,-0.16,0],hips:[360,0,0]}},{t:0.48,p:{spine:[12,0,0],hips:[360,0,0]}}],fn:(t,T)=>t>0.34?runFn(t,T):{}};

// F24 Fountain: after the dive, she spins on one paw in the crater (page), crouched low, the bow pointed up; ends in a kneeling freeze
const CUP=(k=0)=>AIMD(-84,k,[0,0.02,-0.02]);
NEW.vCrater={T:1.8,air:[[1.42,1.8]],staffPose:{from:0,to:1.8,fade:0.06,keys:[{t:0,...CARRY},{t:0.12,...CUP(0.3)},{t:1.4,...CUP(0.3)},{t:1.5,...KAIM(0.3)},{t:1.8,...KAIM(0.3)}]},keys:[
  {t:0,p:{...LAND}},{t:0.12,p:{...CROUCH,_hips:[0,-0.2,-0.02],spine:[16,0,0],head:[-30,0,0],legR:[-40,0,-6],legL:[-16,0,40],...EARS(-10,-14),tail1:[0,-20,0]}},
  {t:1.4,p:{...CROUCH,_hips:[0,-0.2,-0.02],spine:[16,0,0],head:[-30,0,0],legR:[-40,0,-6],legL:[-16,0,40],...EARS(-10,-14),tail1:[0,-20,0]}},
  {t:1.5,ease:'out',p:KNEEL},{t:1.8,p:KNEEL}]};
