
// ---------------------------------------------------------------- Gale 弓斗: kicks and close work (the page turns, tips and carries her; these are the body)
// Her legs have no knee: a kick is a straight leg, a tuck is the hips folding. Toes point (foot rx+) on a thrust, pull back (rx-) when the heel or sole lands.
const ARMS=(r,l=r)=>({upperarmR:[r[0],0,r[1]],forearmR:[r[2]||0,0,0],upperarmL:[l[0],0,-l[1]],forearmL:[l[2]||0,0,0]});
const LEGS=(L,R,fL=0,fR=fL)=>({legL:[L[0],0,L[1]||5],legR:[R[0],0,-(R[1]||5)],footL:[fL,0,0],footR:[fR,0,0]});

// the mule kick: back to the foe (page turns her), a look over the shoulder, both hind paws fire straight back, soles first (0.22)
NEW.gMule={T:0.9,air:[[0.13,0.50]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.15,0.02],spine:[28,14,0],chest:[8,10,0],head:[-12,64,0],...EARS(26,20)}},
  {t:0.16,ease:'out',p:{_hips:[0,0.03,0.03],spine:[40,6,0],chest:[12,4,0],head:[-34,58,0],...LEGS([-84,8],[-88,8],22),...EARS(-24,-18),...ARMS([-34,-22,-30],[-20,10,-10]),tail1:[-10,0,0]}},
  {t:0.22,ease:'in',p:{_hips:[0,0.02,-0.03],spine:[-8,0,0],chest:[-5,0,0],head:[-26,52,0],...LEGS([70,4],[74,4],-36),...EARS(40,34),...ARMS([-78,-30,-34],[-52,22,-16]),tail1:[36,0,0]}},
  {t:0.27,p:{_hips:[0,0.02,-0.02],spine:[-4,0,0],chest:[-3,0,0],head:[-24,50,0],...LEGS([62,4],[66,4],-30),...EARS(6,22),...ARMS([-70,-28,-30],[-48,20,-14]),tail1:[20,0,0]}},
  {t:0.38,p:{spine:[26,0,0],chest:[8,0,0],head:[-18,24,0],...LEGS([-44,8],[-36,8],16),...EARS(-18,-4),...ARMS([-20,-24,-30],[-10,12,-10])}},
  {t:0.50,ease:'in',p:{...LAND}},
  {t:0.66,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.9,p:{}},
],fn:(t,T)=>tail(t,0.45,10)};

// the axe kick: a hop, the right hind leg swings straight up past her ear (0.30), hangs, and chops heel first (0.43); she folds over it and lands low
NEW.gAxe={T:1.0,air:[[0.13,0.54]],keys:[
  {t:0,p:{}},
  {t:0.10,p:{...CROUCH,_hips:[0,-0.16,-0.02],spine:[28,0,0],...EARS(34,28)}},
  {t:0.18,ease:'out',p:{spine:[-8,6,0],head:[-6,0,0],...LEGS([24,4],[-74,6],50,30),...EARS(-46,-36),...ARMS([24,-30,-10],[-20,24,-10]),tail1:[20,0,0]}},
  {t:0.30,p:{spine:[-20,8,0],chest:[-8,4,0],head:[14,-6,0],...LEGS([34,4],[-166,8],40,-30),...EARS(-30,-42),...ARMS([-44,-50,-20],[34,30,-10]),tail1:[30,0,0]}},
  {t:0.37,p:{spine:[-23,8,0],chest:[-9,4,0],head:[16,-6,0],...LEGS([36,4],[-172,8],40,-34),...EARS(-10,-30),...ARMS([-50,-54,-20],[38,32,-10]),tail1:[24,0,0]}},
  {t:0.43,ease:'in',p:{spine:[34,-4,0],chest:[12,-2,0],head:[-24,0,0],...LEGS([46,4],[-62,6],30,-24),...EARS(46,40),...ARMS([44,-20,-30],[-30,20,-20]),tail1:[-26,0,0]}},
  {t:0.48,p:{spine:[40,-2,0],chest:[14,0,0],head:[-28,0,0],...LEGS([40,4],[-40,6],30,-10),...EARS(18,44),...ARMS([40,-18,-30],[-26,18,-20]),tail1:[-10,0,0]}},
  {t:0.56,ease:'in',p:{...LAND,_hips:[0,-0.17,0],legL:[-30,0,11],legR:[-46,0,-11]}},
  {t:0.76,p:{_hips:[0,-0.06,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:1.0,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// the flying knee (no knee to bend: the lead leg is thrown up with the toes hanging, the other trails): body upright and arched, the free paw thrown back
NEW.gKnee={T:0.85,air:[[0.11,0.50]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.14,0.03],spine:[36,0,0],...EARS(30,24)}},
  {t:0.16,ease:'out',p:{_hips:[0,0.02,0.04],spine:[-14,-8,0],chest:[-6,-6,0],head:[4,10,0],...LEGS([40,4],[-106,6],46,80),...EARS(-54,-46),...ARMS([48,-16,-52],[28,20,-10]),tail1:[26,0,0]}},
  {t:0.27,p:{_hips:[0,0.02,0.05],spine:[-19,-10,0],chest:[-8,-8,0],head:[8,12,0],...LEGS([46,4],[-114,6],50,84),...EARS(-34,-50),...ARMS([56,-18,-56],[32,22,-10]),tail1:[30,0,0]}},
  {t:0.33,ease:'in',p:{spine:[8,0,0],chest:[4,0,0],head:[-8,0,0],...LEGS([14,4],[-62,6],30,40),...EARS(34,26),...ARMS([10,-20,-30],[0,14,-10]),tail1:[-14,0,0]}},
  {t:0.50,ease:'in',p:{...LAND}},
  {t:0.66,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.85,p:{}},
],fn:(t,T)=>tail(t,0.4,10)};

// the low sweep: she drops onto the left hind paw, the right leg laid out along the floor, and the page whirls her once (0.16 to 0.46); the free paw skims the floor
NEW.gSweepLow={T:0.9,keys:[
  {t:0,p:{}},
  {t:0.09,p:{_hips:[0,-0.18,0],spine:[30,22,0],chest:[8,14,0],head:[-22,-34,0],...LEGS([-20,10],[12,30],30,10),...EARS(40,34),...ARMS([10,-50,-30],[0,10,-10]),tail1:[0,-24,0]}},
  {t:0.16,ease:'in',p:{_hips:[0,-0.20,0],spine:[34,-10,6],chest:[8,-8,0],head:[-24,12,0],...LEGS([-30,14],[-88,24],36,62),earL:[-24,0,14],earR:[-24,0,14],earL2:[-32,0,10],earR2:[-32,0,10],...ARMS([-4,-84,-10],[-10,30,-20]),tail1:[0,34,0]}},
  {t:0.31,p:{_hips:[0,-0.21,0],spine:[37,-14,8],chest:[9,-10,0],head:[-26,16,0],...LEGS([-32,14],[-92,28],36,66),earL:[-28,0,18],earR:[-28,0,18],earL2:[-38,0,14],earR2:[-38,0,14],...ARMS([-6,-88,-10],[-12,34,-20]),tail1:[0,38,0]}},
  {t:0.46,p:{_hips:[0,-0.20,0],spine:[34,-6,4],chest:[8,-4,0],head:[-24,6,0],...LEGS([-30,14],[-84,20],36,58),earL:[-10,0,-10],earR:[-10,0,-10],earL2:[-4,0,-16],earR2:[-4,0,-16],...ARMS([-4,-70,-10],[-10,26,-20]),tail1:[0,-30,0]}},
  {t:0.56,p:{_hips:[0,-0.16,0],spine:[28,8,0],chest:[6,4,0],head:[-18,-8,0],...LEGS([-30,10],[-30,12],32,30),...EARS(30,24),...ARMS([10,-30,-20],[0,10,-10]),tail1:[0,10,0]}},
  {t:0.72,p:{_hips:[0,-0.05,0],spine:[8,0,0],head:[-4,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-14,-10)}},
  {t:0.9,p:{}},
]};

// the roundhouse: a hop, the right leg chambers and whips out level to her side (0.24) while the page spins her; her body leans away from it
NEW.gRound={T:0.85,air:[[0.12,0.47]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{_hips:[0,-0.11,0],spine:[14,30,0],chest:[4,24,0],head:[-8,-44,0],...LEGS([-20,6],[14,6],16,10),...EARS(20,16),...ARMS([0,-40,-20],[0,10,-10]),tail1:[0,-30,0]}},
  {t:0.16,ease:'out',p:{spine:[0,-10,14],chest:[0,-10,6],head:[-4,24,-10],...LEGS([10,4],[-72,40],50,30),...EARS(-40,-30),...ARMS([-20,-60,-30],[10,30,-10]),tail1:[0,10,0]}},
  {t:0.24,ease:'in',p:{spine:[-6,-26,30],chest:[-2,-16,10],head:[0,44,-24],...LEGS([16,10],[-30,100],50,44),earL:[-10,0,-16],earR:[-10,0,-16],earL2:[-18,0,-22],earR2:[-18,0,-22],...ARMS([30,-30,-20],[-10,54,-10]),tail1:[0,36,0]}},
  {t:0.31,p:{spine:[-4,-30,28],chest:[-2,-18,10],head:[0,48,-22],...LEGS([18,10],[6,94],50,40),earL:[-4,0,12],earR:[-4,0,12],earL2:[-8,0,20],earR2:[-8,0,20],...ARMS([34,-26,-20],[-12,50,-10]),tail1:[0,20,0]}},
  {t:0.40,p:{spine:[12,0,8],chest:[4,0,2],head:[-8,0,-4],...LEGS([-22,6],[-40,20],20,26),...EARS(-10,0),...ARMS([0,-30,-20],[0,14,-10]),tail1:[0,-16,0]}},
  {t:0.48,ease:'in',p:{...LAND}},
  {t:0.64,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.85,p:{}},
],fn:(t,T)=>tail(t,0.4,10)};

// the rising kick: a hop and the right leg snaps straight up from the floor to over her head (0.21), toes pulled back; she leans away, hangs, lands
NEW.gRise={T:0.9,air:[[0.11,0.56]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.15,-0.02],spine:[26,0,0],legR:[30,0,-8],footR:[10,0,0],...EARS(30,24)}},
  {t:0.14,ease:'out',p:{spine:[-10,0,0],head:[2,0,0],...LEGS([10,4],[-64,5],40,20),...EARS(-32,-24),...ARMS([10,-30,-10],[-10,20,-10])}},
  {t:0.21,ease:'in',p:{spine:[-27,0,0],chest:[-10,0,0],head:[18,0,0],...LEGS([24,4],[-156,6],56,-24),...EARS(-56,-48),...ARMS([34,-42,-10],[22,30,-10]),tail1:[32,0,0]}},
  {t:0.29,p:{spine:[-30,0,0],chest:[-11,0,0],head:[20,0,0],...LEGS([26,4],[-164,6],56,-28),...EARS(-20,-44),...ARMS([38,-46,-10],[24,32,-10]),tail1:[22,0,0]}},
  {t:0.42,p:{spine:[8,0,0],chest:[3,0,0],head:[-6,0,0],...LEGS([-14,5],[-52,6],24,24),...EARS(12,-10),...ARMS([0,-24,-20],[0,12,-10])}},
  {t:0.56,ease:'in',p:{...LAND}},
  {t:0.72,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.9,p:{}},
],fn:(t,T)=>tail(t,0.45,10)};

// 霹雳舞 the windmill: on her back and shoulders (the page lays her over and spins her), legs flung wide in a V that scissors as she turns, the free paw sweeping the floor; a loop
const WINDV={spine:[24,0,0],chest:[9,0,0],head:[30,0,0],...ARMS([-64,-74,-56],[-30,40,-30]),footL:[42,0,0],footR:[42,0,0],...EARS(-34,-44),tail1:[10,0,0]};
NEW.gWind={T:0.6,air:[[0,0.6]],keys:[{t:0,p:WINDV},{t:0.6,p:WINDV}],
  fn:(t,T)=>({legL:[-84+26*S(t,T),0,60+12*S(t,T,0.25)],legR:[-56-26*S(t,T),0,-64-12*S(t,T,0.25)],spine:[4*S(t,T,0.1),0,9*S(t,T)],chest:[0,0,5*S(t,T,0.08)],head:[0,10*S(t,T,0.3),0],
    earL:[6*S(t,T,0.2),0,16*S(t,T,0.35)],earR:[6*S(t,T,0.25),0,16*S(t,T,0.4)],earL2:[8*S(t,T,0.3),0,20*S(t,T,0.45)],earR2:[8*S(t,T,0.35),0,20*S(t,T,0.5)],tail1:[0,22*S(t,T,0.2),0],upperarmR:[10*S(t,T,0.15),0,-8*S(t,T)]})};
// out of the windmill: both legs fold to her chest (0.05) and shoot out flat along the floor, together (0.11); the page whips her round once so they scythe the whole ring; then back to the V
const WINDVL={...WINDV,legL:[-84,0,60],legR:[-56,0,-64]};
NEW.gWindKick={T:0.5,air:[[0,0.5]],keys:[
  {t:0,p:WINDVL},
  {t:0.05,p:{...WINDV,spine:[44,0,0],chest:[16,0,0],head:[36,0,0],...LEGS([-138,6],[-140,6],10),...EARS(-10,-20)}},
  {t:0.11,ease:'in',p:{...WINDV,spine:[-8,0,0],chest:[-4,0,0],head:[30,0,0],...LEGS([-10,3],[-16,3],34),...EARS(30,36),...ARMS([-150,-40,-20],[-120,30,-10]),tail1:[30,0,0]}},
  {t:0.24,p:{...WINDV,spine:[-6,0,0],chest:[-3,0,0],head:[30,0,0],...LEGS([-14,3],[-20,3],30),...EARS(0,24),...ARMS([-146,-44,-20],[-116,34,-10]),tail1:[16,0,0]}},
  {t:0.40,p:WINDVL},
  {t:0.5,p:WINDVL},
]};
// the kip-up that ends it: legs to her chest, a kick at the sky (0.14) that throws her onto her feet (the page stands her up), a low landing, ears flopping after
NEW.gKip={T:0.8,air:[[0,0.36]],keys:[
  {t:0,p:WINDVL},
  {t:0.08,p:{...WINDV,spine:[46,0,0],chest:[16,0,0],head:[34,0,0],...LEGS([-140,6],[-142,6],10),...EARS(-10,-20)}},
  {t:0.15,ease:'in',p:{spine:[-18,0,0],chest:[-8,0,0],head:[-10,0,0],...LEGS([-40,4],[-44,4],50),...EARS(-50,-44),...ARMS([-150,-20,-10],[-120,10,-10]),tail1:[30,0,0]}},
  {t:0.27,p:{spine:[10,0,0],head:[-6,0,0],...LEGS([-30,6],[-34,6],30),...EARS(-30,-40),...ARMS([-60,-30,-20],[-30,16,-10])}},
  {t:0.36,ease:'in',p:{...LAND}},
  {t:0.54,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.8,p:{}},
]};

// the hip shot: square to the foe, leaning back, the bow laid flat at her hip; a short snap draw and loose every 0.32 s (a loop; "run" adds the legs of a sprint)
const HIPP=(k=0,up=0)=>{const P=FLATP(k,up);return {...P,p:[P.p[0]+0.035,P.p[1]-0.135+up,P.p[2]-0.02]};};
const hipClip=(run)=>({T:0.32,...(run?{air:[[0,0.32]]}:{}),draw:{keys:[{t:0,d:0.12,a:1,h:1},{t:0.10,d:0.40,a:1,h:1},{t:0.14,d:0.46,a:1,h:1},{t:0.155,d:-0.07,a:0,h:1,ease:'lin'},{t:0.20,d:0.03,a:1,h:1},{t:0.32,d:0.12,a:1,h:1}]},
  offHand:{from:-0.3,to:0.7,fade:0.05,keys:[{t:0,p:[0.02,-0.06,0.12],b:'chest'},{t:0.32,p:[0.02,-0.06,0.12],b:'chest'}]},
  staffPose:{from:-0.3,to:0.7,fade:0.05,keys:[{t:0,...HIPP(0.25)},{t:0.13,...HIPP(0)},{t:0.14,...HIPP(0)},{t:0.175,...HIPP(-0.5,0.01),ease:'in'},{t:0.25,...HIPP(0.1)},{t:0.32,...HIPP(0.25)}]},
  keys:[
    {t:0,p:{spine:[-9,0,0],chest:[-4,-10,0],head:[0,8,0],_hips:[0,-0.04,0.02],legL:[-14,0,8],legR:[10,0,-8],...EARS(-8,-6)}},
    {t:0.14,p:{spine:[-10,-3,0],chest:[-5,-13,0],head:[0,10,0],_hips:[0,-0.045,0.02],legL:[-14,0,8],legR:[10,0,-8],...EARS(-12,-8)}},
    {t:0.175,ease:'in',p:{spine:[-13,4,0],chest:[-7,-4,0],head:[3,4,0],_hips:[0,-0.035,0.0],legL:[-14,0,8],legR:[10,0,-8],...EARS(22,26),tail1:[-14,0,0]}},
    {t:0.26,p:{spine:[-9,0,0],chest:[-4,-9,0],head:[0,8,0],_hips:[0,-0.04,0.02],legL:[-14,0,8],legR:[10,0,-8],...EARS(-2,6)}},
    {t:0.32,p:{spine:[-9,0,0],chest:[-4,-10,0],head:[0,8,0],_hips:[0,-0.04,0.02],legL:[-14,0,8],legR:[10,0,-8],...EARS(-8,-6)}},
  ],fn:run?((t,T)=>({legL:[14-40*S(t,T),0,-3],legR:[-24+40*S(t,T),0,3],footL:[24+22*S(t,T,0.2),0,0],footR:[24-22*S(t,T,0.2),0,0],_hips:[0,0.05+0.03*Math.cos(4*Math.PI*t/T),0],spine:[12,0,0],tail1:[0,10*S(t,T),0]})):((t,T)=>tail(t,T,6))});
NEW.gHip=hipClip(false); NEW.gHipRun=hipClip(true);

// the neck hook: a step in, the bow's upper limb goes over the foe's neck (0.12), she turns and wrenches it down past her hip (0.30), then draws on it where it lies (0.60)
NEW.gHook={T:1.05,...(()=>{const s=seq([shot(0.36,0.44,0.56,0.60,0.6)]);const DN=(k=0,up=0)=>AIMD(34,k,[0,up-0.04,0]);
  return {draw:{keys:s.draw},offHand:{from:0.0,to:0.95,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.12,p:[-0.24,0.2,0.0],b:'chest'},{t:0.30,p:[-0.24,0.1,-0.04],b:'chest'},...s.off.filter(k=>k.t>=0.36),{t:0.9,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:1.0,fade:0.06,keys:[{t:0,...CARRY},{t:0.12,p:[0.04,0.56,0.42],d:[0.25,0.5,0.83],n:[1,0,0],ease:'in'},{t:0.18,p:[0.03,0.52,0.36],d:[-0.2,0.45,0.87],n:[1,0,0]},
    {t:0.30,p:[0.20,0.26,0.20],d:[-0.4,-0.1,0.91],n:[0,1,0],ease:'in'},{t:0.36,p:[0.18,0.30,0.20],d:[-0.3,0.2,0.93],n:[0,1,0]},{t:0.44,...DN(0.8)},{t:0.56,...DN(0)},{t:0.60,...DN(0)},{t:0.64,...DN(-0.45,0.012),ease:'in'},{t:0.76,...DN(0.2)},{t:1.0,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.12,ease:'in',p:{spine:[12,-12,0],chest:[4,-10,0],head:[-10,16,0],_hips:[0,-0.05,0.07],legL:[-34,0,6],footL:[10,0,0],legR:[24,0,-6],footR:[24,0,0],...EARS(-24,-18),tail1:[14,0,0]}},
  {t:0.18,p:{spine:[8,-4,0],chest:[2,-4,0],head:[-8,8,0],_hips:[0,-0.05,0.05],legL:[-30,0,6],footL:[10,0,0],legR:[22,0,-6],footR:[22,0,0],...EARS(14,10)}},
  {t:0.30,ease:'in',p:{spine:[30,34,0],chest:[10,22,0],head:[-22,-36,0],_hips:[0,-0.13,0.0],legL:[-22,0,10],footL:[16,0,0],legR:[22,0,-10],footR:[20,0,0],...EARS(36,30),tail1:[0,-30,0]}},
  {t:0.36,p:{spine:[26,30,0],chest:[8,18,0],head:[-18,-30,0],_hips:[0,-0.12,0.0],legL:[-22,0,10],footL:[16,0,0],legR:[22,0,-10],footR:[20,0,0],...EARS(0,20),tail1:[0,-10,0]}},
  {t:0.46,p:mix(STANCE,{spine:[16,-16,0],chest:[6,-28,0],head:[14,62,0],_hips:[0,-0.07,0.0],legL:[-24,0,6],legR:[20,0,-6]})},
  {t:0.60,p:mix(STANCE,{spine:[18,-17,0],chest:[7,-29,0],head:[16,62,0],_hips:[0,-0.08,0.0],legL:[-26,0,6],legR:[22,0,-6],...EARS(-24,-18)})},
  {t:0.64,ease:'in',p:mix(STANCE,{spine:[8,-10,0],chest:[2,-17,0],head:[20,50,0],_hips:[0,-0.05,-0.04],legL:[-26,0,6],footL:[-10,0,0],legR:[16,0,-6],...EARS(30,26),tail1:[-20,0,0]})},
  {t:0.82,p:mix(STANCE,{spine:[4,-13,0],head:[6,58,0],_hips:[0,-0.04,-0.02],...EARS(-10,-8)})},
  {t:1.05,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};

// the stamp: an arrow from the quiver planted at her feet (0.16), a hop, both hind paws drive it home (0.36)
NEW.gStamp={T:0.7,air:[[0.22,0.36]],offHand:{from:0.0,to:0.5,fade:0.06,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.07,p:QUIV,b:'chest'},{t:0.16,p:[-0.10,0.06,0.20],ease:'in'},{t:0.22,p:[-0.10,0.07,0.20]},{t:0.30,p:[-0.24,0.2,0.0],b:'chest'},{t:0.5,p:[-0.2,0.0,0.05],b:'chest'}]},keys:[
  {t:0,p:{}},
  {t:0.07,p:{spine:[-6,-10,0],head:[-4,-20,0],_hips:[0,-0.03,0],...EARS(-14,-10)}},
  {t:0.16,ease:'in',p:{...CROUCH,_hips:[0,-0.19,0.02],spine:[40,10,0],chest:[12,8,0],head:[-10,0,0],...EARS(38,32)}},
  {t:0.22,p:{...CROUCH,_hips:[0,-0.17,0.0],spine:[32,0,0],head:[-14,0,0],...EARS(10,26)}},
  {t:0.29,ease:'out',p:{spine:[6,0,0],head:[14,0,0],...LEGS([-76,7],[-80,7],10),...EARS(-50,-40),...ARMS([-30,-50,-20],[-20,30,-10]),tail1:[24,0,0]}},
  {t:0.36,ease:'in',p:{_hips:[0,-0.10,0],spine:[22,0,0],chest:[6,0,0],head:[2,0,0],...LEGS([-22,9],[-22,9],-14),...EARS(44,38),...ARMS([20,-36,-10],[0,24,-10]),tail1:[-24,0,0]}},
  {t:0.46,p:{_hips:[0,-0.13,0],spine:[26,0,0],head:[-10,0,0],...LEGS([-30,10],[-30,10],30),...EARS(-6,20)}},
  {t:0.7,p:{_hips:[0,-0.10,0],spine:[20,0,0],head:[-8,0,0],...LEGS([-26,9],[-26,9],26),...EARS(-10,-6)}},
]};

// the paw strike: the free paw driven flat into the foe's chest (0.10) off the back foot, held a beat for the spring away
NEW.gPush={T:0.5,offHand:{from:0.0,to:0.4,fade:0.05,keys:[{t:0,p:[-0.19,-0.1,0.04],b:'chest'},{t:0.05,p:[-0.20,0.12,-0.04],b:'chest'},{t:0.10,p:[-0.03,0.55,0.50],ease:'in'},{t:0.20,p:[-0.03,0.55,0.47]},{t:0.4,p:[-0.2,0.0,0.05],b:'chest'}]},keys:[
  {t:0,p:{}},
  {t:0.05,p:{spine:[-4,-24,0],chest:[-2,-16,0],head:[-2,34,0],_hips:[0,-0.05,-0.03],legL:[-10,0,6],legR:[16,0,-6],...EARS(-16,-12)}},
  {t:0.10,ease:'in',p:{spine:[14,28,0],chest:[6,20,0],head:[-12,-40,0],_hips:[0,-0.07,0.08],legL:[10,0,6],footL:[20,0,0],legR:[-36,0,-6],footR:[10,0,0],...EARS(34,28),tail1:[-18,0,0]}},
  {t:0.20,p:{spine:[12,24,0],chest:[5,17,0],head:[-10,-34,0],_hips:[0,-0.07,0.07],legL:[10,0,6],footL:[20,0,0],legR:[-34,0,-6],footR:[10,0,0],...EARS(-6,10)}},
  {t:0.5,p:{}},
]};

// the drill: she rides the wind feet first, laid back flat (hips), legs together, toes to the foe, the bow hugged along her; the page spins her round her line of flight; a loop
const DRILL={hips:[-80,0,0],spine:[10,0,0],chest:[6,0,0],head:[34,0,0],...LEGS([-10,2],[-14,2],-24),...ARMS([-20,-10,-90],[-10,6,-60]),...EARS(10,6),tail1:[-20,0,0]};
NEW.gDrill={T:0.4,air:[[0,0.4]],keys:[{t:0,p:DRILL},{t:0.4,p:DRILL}],fn:(t,T)=>({earL:[8*S(t,T),0,0],earR:[8*S(t,T,0.2),0,0],earL2:[14*S(t,T,0.15),0,0],earR2:[14*S(t,T,0.35),0,0],legL:[3*S(t,T),0,0],legR:[-3*S(t,T),0,0]})};

// the spring: she comes down on a foe feet first (0.05), sinks into it (0.09), and kicks off it (0.15) into a tuck
NEW.gSpring={T:0.4,air:[[0,0.4]],keys:[
  {t:0,p:{...TUCK}},
  {t:0.05,p:{spine:[12,0,0],head:[14,0,0],...LEGS([-12,5],[-8,5],-22),...EARS(-44,-36),...ARMS([-40,-40,-20],[-20,24,-10]),tail1:[20,0,0]}},
  {t:0.09,ease:'in',p:{_hips:[0,-0.07,0],spine:[30,0,0],chest:[8,0,0],head:[2,0,0],...LEGS([-56,8],[-56,8],34),...EARS(34,30),...ARMS([10,-30,-20],[0,16,-10]),tail1:[-20,0,0]}},
  {t:0.15,ease:'out',p:{spine:[-10,0,0],head:[-10,0,0],...LEGS([14,3],[16,3],58),...EARS(-54,-46),...ARMS([-150,-16,-10],[-60,20,-10]),tail1:[26,0,0]}},
  {t:0.28,p:{...TUCK}},
  {t:0.4,p:{...TUCK}},
]};

// Ricochet Gale (kit 2.6 motion, Kesh 19 Nov "jump like 僵尸"; spec WINDBRIAR_MOTION_GALE.md F13): every spring is a crouch, a forepaw swing, a knee drive and a tuck.
// Head 1 a stomp (left paw plants 0.30), head 2 a scissor (right heel plants 0.60), head 3 a cartwheel (page roll) and both paws tap it (0.90), then she springs (0.97) for gAirShot.
// Plants are out of the air windows so the bake folds the legs into the knees.
NEW.gRico={T:1.0,air:[[0.13,0.29],[0.37,0.59],[0.67,0.89],[0.97,1.0]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.17,0.02],spine:[38,0,0],chest:[10,0,0],head:[-24,0,0],...ARMS([50,-24,-10],[40,14,-10]),...EARS(32,26),tail1:[-14,0,0]}},
  {t:0.13,ease:'out',p:{_hips:[0,0.02,0],spine:[-8,0,0],chest:[-4,0,0],head:[-12,0,0],...LEGS([22,4],[28,4],54),...ARMS([-150,-30,-10],[-130,20,-10]),...EARS(-54,-44),tail1:[22,0,0]}},
  {t:0.20,p:{...TUCK,spine:[26,0,0],head:[0,0,0],...ARMS([-40,-44,-40],[-24,24,-30]),...EARS(-30,-36)}},
  {t:0.27,ease:'out',p:{spine:[10,0,0],head:[-16,0,0],...LEGS([-8,6],[-112,6],-14,20),...ARMS([10,-60,-20],[10,40,-20]),...EARS(-10,-24),tail1:[10,0,0]}},
  {t:0.30,ease:'in',p:{_hips:[0,-0.15,0.03],spine:[44,0,0],chest:[14,0,0],head:[-30,0,0],...LEGS([-14,10],[-104,8],30,20),...ARMS([40,-40,-24],[30,26,-20]),...EARS(44,48),tail1:[-22,0,0]}},
  {t:0.34,p:{_hips:[0,-0.16,0.03],spine:[46,0,0],chest:[14,0,0],head:[-30,0,0],...LEGS([-14,10],[-100,8],30,20),...ARMS([46,-40,-24],[36,26,-20]),...EARS(30,48),tail1:[-22,0,0]}},
  {t:0.37,ease:'out',p:{_hips:[0,0.02,0],spine:[0,0,0],head:[-14,0,0],...LEGS([20,4],[-60,4],56,30),...ARMS([-150,-24,-10],[-130,18,-10]),...EARS(-56,-48),tail1:[24,0,0]}},
  {t:0.45,p:{spine:[-12,0,0],chest:[-4,0,0],head:[-4,0,0],...LEGS([-124,5],[20,5],60,50),...ARMS([-20,-80,-10],[-20,76,-10]),...EARS(-50,-56),tail1:[30,0,0]}},
  {t:0.52,p:{spine:[-6,0,0],head:[-8,0,0],...LEGS([-118,5],[-36,5],60,-20),...ARMS([-10,-84,-10],[-10,80,-10]),...EARS(-30,-50),tail1:[20,0,0]}},
  {t:0.57,ease:'in',p:{spine:[14,0,0],head:[-14,0,0],...LEGS([-84,5],[-10,5],50,-24),...ARMS([10,-76,-10],[10,70,-10]),...EARS(-10,-30)}},
  {t:0.60,ease:'in',p:{_hips:[0,-0.14,0.03],spine:[36,0,-6],chest:[10,0,-4],head:[-24,0,6],...LEGS([-70,8],[-14,10],40,30),...ARMS([30,-70,-10],[20,66,-10]),...EARS(40,46),tail1:[-18,0,0]}},
  {t:0.64,p:{_hips:[0,-0.16,0.03],spine:[40,0,-6],chest:[12,0,-4],head:[-26,0,6],...LEGS([-60,8],[-14,10],40,30),...ARMS([36,-66,-10],[26,62,-10]),...EARS(30,46),tail1:[-20,0,0]}},
  {t:0.67,ease:'out',p:{_hips:[0,0.02,0],spine:[-4,0,0],head:[-12,0,0],...LEGS([-30,4],[24,4],56,56),...ARMS([-160,-20,-10],[-150,20,-10]),...EARS(-56,-50),tail1:[24,0,0]}},
  {t:0.74,p:{spine:[-6,0,0],head:[-4,0,0],legL:[-6,0,40],legR:[-6,0,-40],footL:[50,0,0],footR:[50,0,0],...ARMS([-170,-34,0],[-170,34,0]),...EARS(-60,-60),tail1:[10,0,0]}},
  {t:0.84,p:{spine:[-4,0,0],head:[-2,0,0],legL:[-8,0,44],legR:[-8,0,-44],footL:[54,0,0],footR:[54,0,0],...ARMS([-172,-38,0],[-172,38,0]),...EARS(-40,-60),tail1:[-10,0,0]}},
  {t:0.88,ease:'in',p:{spine:[16,0,0],head:[-10,0,0],...LEGS([-30,8],[-30,8],-10),...ARMS([20,-50,-20],[20,40,-20]),...EARS(-10,-24)}},
  {t:0.90,ease:'in',p:{_hips:[0,-0.17,0.04],spine:[50,0,0],chest:[14,0,0],head:[-32,0,0],...LEGS([-22,9],[-22,9],32),...ARMS([60,-30,-10],[54,20,-10]),...EARS(50,50),tail1:[-26,0,0]}},
  {t:0.94,p:{_hips:[0,-0.18,0.04],spine:[52,0,0],chest:[16,0,0],head:[-34,0,0],...LEGS([-22,9],[-22,9],32),...ARMS([66,-28,-10],[60,18,-10]),...EARS(36,50),tail1:[-26,0,0]}},
  {t:0.97,ease:'out',p:{_hips:[0,0.03,0],spine:[-6,0,0],chest:[-2,0,0],head:[-16,0,0],...LEGS([18,4],[22,4],58),...ARMS([-160,-24,-10],[-140,20,-10]),...EARS(-58,-50),tail1:[26,0,0]}},
  {t:1.0,p:{_hips:[0,0.03,0],spine:[-8,0,0],chest:[-3,0,0],head:[-14,0,0],...LEGS([10,4],[12,4],58),...ARMS([-160,-24,-10],[-140,20,-10]),...EARS(-58,-56),tail1:[26,0,0]}},
],fn:(t,T)=>tail(t,0.4,12)};
// the corkscrew air shot (the page rolls her 360 while she passes over head 4): legs together and pointed, a snap draw upside down, loose 0.18;
// then she tucks and comes down in a three-point landing (0.46: both hind paws and the right forepaw, the bow out to her side)
NEW.gAirShot={T:0.9,air:[[0,0.45]],...(()=>{const s=seq([shot(0.0,0.05,0.15,0.18,0.42)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:0.38,fade:0.06,keys:s.off},
  staffPose:{from:0.0,to:0.8,fade:0.08,keys:[{t:0,...CARRY},{t:0.05,...LEVEL(0.8)},{t:0.15,...LEVEL(0)},{t:0.18,...LEVEL(0)},{t:0.21,...LEVEL(-0.5,0.012),ease:'in'},{t:0.34,...LEVEL(-0.1)},{t:0.5,...moveP(LEVEL(0),[0.12,-0.1,0])},{t:0.8,...CARRY}]}};})(),keys:[
  {t:0,p:{_hips:[0,0.03,0],spine:[-8,0,0],chest:[-3,0,0],head:[-14,0,0],...LEGS([10,4],[12,4],58),...EARS(-58,-56),tail1:[26,0,0]}},
  {t:0.08,p:{spine:[-14,0,0],chest:[-6,0,0],head:[-10,0,0],...LEGS([4,3],[2,3],62),...EARS(-60,-60),tail1:[30,0,0]}},
  {t:0.18,p:{spine:[-16,0,0],chest:[-7,0,0],head:[-8,0,0],...LEGS([0,3],[-2,3],64),...EARS(-40,-60),tail1:[20,0,0]}},
  {t:0.21,ease:'in',p:{spine:[-10,0,0],chest:[-4,0,0],head:[-6,0,0],...LEGS([-10,3],[-12,3],60),...EARS(-20,-30),tail1:[10,0,0]}},
  {t:0.32,p:{...TUCK,spine:[30,0,0],head:[6,0,0],...EARS(-30,-40)}},
  {t:0.42,ease:'in',p:{spine:[20,0,0],head:[-10,0,0],...LEGS([-36,8],[-30,8],-10),upperarmR:[20,0,30],forearmR:[0,0,0],...EARS(-10,-24)}},
  {t:0.46,ease:'in',p:{_hips:[0,-0.19,0.04],spine:[52,0,10],chest:[16,0,6],head:[-36,-10,0],legL:[-30,0,14],legR:[-18,0,-12],footL:[40,0,0],footR:[40,0,0],upperarmR:[86,0,10],forearmR:[0,0,0],...EARS(14,24),tail1:[-26,0,0]}},
  {t:0.56,p:{_hips:[0,-0.18,0.04],spine:[46,0,10],chest:[14,0,6],head:[-28,-14,0],legL:[-30,0,14],legR:[-18,0,-12],footL:[40,0,0],footR:[40,0,0],upperarmR:[84,0,10],forearmR:[0,0,0],...EARS(0,20),tail1:[-20,0,0]}},
  {t:0.72,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-8,0,0],legL:[-14,0,6],legR:[10,0,-6],upperarmR:[20,0,0],...EARS(-12,-8)}},
  {t:0.9,p:{}},
],fn:(t,T)=>tail(t,0.4,12)};

// ---- Breakdance (spec F7, Kesh 19 Nov "街舞 with fancy rolls"): toprock, swipe, windmill, flare, 1990, air flare, kip-up into an air chair.
// Legs stay together or in a V of 80° at most; the page lays her down, spins and rolls her; these are the body.
const VL=(a,b,z=40,f=56)=>({legL:[a,0,z],legR:[b,0,-z],footL:[f,0,0],footR:[f,0,0]});
// toprock: two Indian steps in place (cross, kick out, cross back), shoulders bouncing, the bow spun once in her paw
NEW.gTop={T:0.5,staffPose:{from:0,to:0.5,fade:0.05,keys:[{t:0,...CARRY},...spinKeys(STAFF(0,0.02),0.06,0.36,[0,1,0],1),{t:0.5,...CARRY}]},keys:[
  {t:0,p:{}},
  {t:0.08,p:{_hips:[0,-0.04,0],hips:[0,18,0],spine:[6,-14,0],head:[-6,-6,0],legR:[-22,0,16],footR:[20,0,0],legL:[4,0,4],...EARS(-10,-4),tail1:[0,-16,0]}},
  {t:0.16,ease:'out',p:{_hips:[0,-0.01,0],hips:[0,-6,0],spine:[-8,6,0],head:[-10,4,0],legR:[-52,0,-16],footR:[44,0,0],legL:[8,0,4],...EARS(-30,-24),tail1:[0,10,0]}},
  {t:0.25,p:{_hips:[0,-0.05,0],hips:[0,-18,0],spine:[6,14,0],head:[-6,6,0],legL:[-22,0,-16],footL:[20,0,0],legR:[4,0,-4],...EARS(-6,0),tail1:[0,16,0]}},
  {t:0.33,ease:'out',p:{_hips:[0,-0.01,0],hips:[0,6,0],spine:[-8,-6,0],head:[-10,-4,0],legL:[-52,0,16],footL:[44,0,0],legR:[8,0,-4],...EARS(-30,-24),tail1:[0,-10,0]}},
  {t:0.42,p:{...CROUCH,_hips:[0,-0.12,-0.02],spine:[30,0,0],...ARMS([60,-20,-10],[50,20,-10]),...EARS(26,20)}},
  {t:0.5,p:{...CROUCH,_hips:[0,-0.16,0.0],spine:[44,0,0],chest:[12,0,0],head:[-24,0,0],...ARMS([86,-16,0],[80,16,0]),...EARS(34,30)}},
]};
// the swipe: forepaws on the floor, hips whipping round over them, legs together swinging a half circle (the page pitches her over and spins her)
NEW.gSwipe={T:0.25,air:[[0,0.25]],keys:[
  {t:0,p:{...CROUCH,_hips:[0,-0.16,0.0],spine:[44,0,0],chest:[12,0,0],head:[-24,0,0],...ARMS([86,-16,0],[80,16,0]),...EARS(34,30)}},
  {t:0.1,p:{spine:[20,0,0],chest:[6,0,0],head:[-30,0,0],...VL(-40,-46,6,50),...ARMS([96,-14,0],[90,14,0]),...EARS(-20,-30),tail1:[20,0,0]}},
  {t:0.18,p:{spine:[10,0,0],head:[-20,0,0],...VL(-70,-74,8,56),...ARMS([60,-30,-30],[50,30,-30]),...EARS(-40,-50),tail1:[10,0,0]}},
  {t:0.25,p:{spine:[22,0,0],chest:[8,0,0],head:[30,0,0],...VL(-80,-80,30,58),...ARMS([-60,-20,-90],[-30,40,-30]),...EARS(-40,-50)}},
]};
// the windmill: rolling across her upper back, chin tucked, legs straight in a V circling over her; one forepaw tucked to her chest, the other sweeping (a loop of one turn)
const MILP={spine:[8,0,0],chest:[4,0,0],head:[36,0,0],...VL(-70,-70,38,58),...ARMS([-60,-20,-90],[-30,40,-30]),...EARS(-40,-50)};
NEW.gMill={T:0.5,air:[[0,0.5]],keys:[{t:0,p:MILP},{t:0.5,p:MILP}],
  fn:(t,T)=>({hips:[0,40*S(t,T,0.0),0],legL:[-70+18*S(t,T),0,38+4*S(t,T,0.25)],legR:[-70-18*S(t,T),0,-38-4*S(t,T,0.25)],spine:[8+6*S(t,T,0.1),0,10*S(t,T)],chest:[4,0,6*S(t,T,0.08)],head:[36,8*S(t,T,0.3),0],upperarmL:[-30+30*S(t,T,0.2),0,-40-20*S(t,T)],tail1:[0,20*S(t,T,0.2),0],
    earL:[-40+8*S(t,T,0.2),0,14*S(t,T,0.35)],earR:[-40+8*S(t,T,0.25),0,14*S(t,T,0.4)]})};
// the flare: held up on both forepaws, body leaning back, straight legs in a V swinging round under and in front of her (the page spins her round her paws, a loop of one circle)
const FLP={_hips:[0,0.0,0],spine:[-4,0,0],chest:[-2,0,0],head:[-6,0,0],...VL(-96,-96,40,60),upperarmR:[-6,0,-6],forearmR:[0,0,0],upperarmL:[-6,0,6],forearmL:[0,0,0],...EARS(-50,-56),tail1:[20,0,0]};
NEW.gFlare={T:0.4,air:[[0,0.4]],keys:[{t:0,p:FLP},{t:0.4,p:FLP}],
  fn:(t,T)=>({legL:[-96+22*S(t,T),0,40+6*S(t,T,0.25)],legR:[-96-22*S(t,T),0,-40-6*S(t,T,0.25)],spine:[-4,0,12*S(t,T)],chest:[-6,0,6*S(t,T,0.1)],tail1:[0,26*S(t,T,0.2),0],earL:[-50,0,20*S(t,T,0.3)],earR:[-50,0,20*S(t,T,0.35)],earL2:[-56,0,24*S(t,T,0.4)],earR2:[-56,0,24*S(t,T,0.45)]})};
// the 1990: a handstand on her right forepaw (the page turns her upside down and spins her), legs together pointing at the sky, the left forepaw held out with the bow
const NNP={spine:[-4,0,0],chest:[-2,0,0],head:[14,0,0],...VL(4,4,3,64),upperarmR:[-170,0,6],forearmR:[0,0,0],upperarmL:[-20,0,70],forearmL:[0,0,0],...EARS(20,30),tail1:[-10,0,0]};
NEW.g1990={T:0.3,air:[[0,0.3]],keys:[{t:0,p:NNP},{t:0.3,p:NNP}],fn:(t,T)=>({legL:[4+5*S(t,T),0,3],legR:[4+5*S(t,T),0,-3],tail1:[0,18*S(t,T,0.2),0],earL:[20,0,16*S(t,T,0.3)],earR:[20,0,16*S(t,T,0.35)]})};
// the air flare: she revolves forepaw to forepaw through the air, legs in a V; the right paw pushes (0.05), the left catches (0.25), the legs whip over (the kick-out)
NEW.gAirFlare={T:0.4,air:[[0,0.4]],keys:[
  {t:0,p:{...FLP}},
  {t:0.08,p:{spine:[-20,0,10],chest:[-8,0,6],head:[-10,0,0],...VL(-110,-70,40,60),upperarmR:[-160,0,-10],upperarmL:[40,0,30],...EARS(-60,-60),tail1:[30,0,0]}},
  {t:0.2,p:{spine:[-24,0,-10],chest:[-10,0,-6],head:[-12,0,0],...VL(-60,-120,40,62),upperarmR:[40,0,-30],upperarmL:[-160,0,10],...EARS(-60,-60),tail1:[-20,0,0]}},
  {t:0.32,p:{spine:[20,0,0],chest:[8,0,0],head:[30,0,0],...VL(-110,-110,10,40),upperarmR:[-40,0,-40],upperarmL:[-30,0,40],...EARS(-30,-40)}},
  {t:0.4,p:{...WINDVL}},
]};
// the air chair: out of the kip-up, one bent forepaw on the floor, body tipped over it, legs bent together in the air; held, then a bow flourish and up
NEW.gChair={T:0.9,keys:[
  {t:0,p:{...LAND}},
  {t:0.1,ease:'out',p:{_hips:[0,-0.06,0],spine:[30,0,40],chest:[10,0,20],head:[-10,0,-30],...VL(-110,-104,12,40),upperarmR:[60,0,-60],forearmR:[-60,0,0],upperarmL:[-90,0,70],...EARS(-20,-30),tail1:[0,30,0]}},
  {t:0.3,p:{_hips:[0,-0.07,0],spine:[32,0,42],chest:[11,0,21],head:[-12,0,-30],...VL(-112,-106,12,40),upperarmR:[62,0,-60],forearmR:[-62,0,0],upperarmL:[-96,0,74],...EARS(-10,-20),tail1:[0,28,0]}},
  {t:0.5,ease:'in',p:{...LAND,spine:[24,0,0]}},
  {t:0.7,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.9,p:{}},
]};

// ---- Ride (Kill Shot Gale; spec F6, Kesh 19 Nov "really controlling and riding the foe"): a leapfrog mount, astride its neck with the ears as reins,
// four rocking steps as it stumbles where she leans (the page carries her on it), up onto its shoulders, a shot straight down between her paws, the recoil pops her into a backflip (page)
const SIT={_hips:[0,-0.16,-0.04],spine:[16,0,0],chest:[4,0,0],head:[-14,0,0],legL:[-62,0,26],legR:[-62,0,-26],footL:[50,0,0],footR:[50,0,0],upperarmL:[-20,0,10],...EARS(-10,-4),tail1:[30,0,0]};
const LEAN=(s,k=1)=>add(SIT,{spine:[6*k,0,-16*s*k],chest:[2*k,0,-8*s*k],head:[4*k,-10*s*k,8*s*k],hips:[0,0,-6*s*k],...EARS(-14*k,-20*k),tail1:[0,26*s*k,0]});
NEW.gRide={T:2.6,air:[[0.13,2.24]],...(()=>{const s=seq([shot(1.46,1.56,1.82,1.87,0.9)]);const DN=(k=0,dp=[0,-0.08,0.1])=>AIMD(30,k,dp);
  return {draw:{keys:s.draw},offHand:{from:0.14,to:2.1,fade:0.06,keys:[{t:0.14,p:[0.02,0.12,0.22],b:'chest'},{t:0.36,p:[0.0,0.2,0.26],b:'chest'},{t:0.62,p:[-0.06,0.24,0.24],b:'chest'},{t:0.87,p:[0.06,0.22,0.24],b:'chest'},{t:1.12,p:[-0.06,0.24,0.24],b:'chest'},{t:1.37,p:[0.04,0.2,0.24],b:'chest'},...s.off.filter(k=>k.t>=1.46),{t:2.1,p:[-0.2,0.0,0.05],b:'chest'}]},
  staffPose:{from:0.0,to:2.5,fade:0.08,keys:[{t:0,...CARRY},{t:0.36,...moveP(CARRY,[0.04,0.02,0.06])},{t:1.42,...moveP(CARRY,[0.04,0.02,0.06])},{t:1.56,...DN(0.8)},{t:1.82,...DN(0)},{t:1.87,...DN(0)},{t:1.90,...DN(-0.5,[0,-0.065,0.1]),ease:"in"},{t:2.05,...DN(0.3)},{t:2.4,...CARRY}]}};})(),keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.16,0.02],spine:[36,0,0],head:[-22,0,0],upperarmL:[50,0,-10],...EARS(30,26),tail1:[-14,0,0]}},
  {t:0.14,ease:'out',p:{_hips:[0,0.02,0],spine:[20,0,0],head:[-16,0,0],...LEGS([24,4],[28,4],54),upperarmL:[-90,0,-10],...EARS(-50,-40),tail1:[22,0,0]}},
  {t:0.25,p:{spine:[40,0,0],chest:[10,0,0],head:[-30,0,0],legL:[-40,0,34],legR:[-40,0,-34],footL:[56,0,0],footR:[56,0,0],upperarmL:[-50,0,-6],...EARS(-30,-40),tail1:[30,0,0]}},
  {t:0.33,ease:'in',p:add(SIT,{_hips:[0,-0.03,0],spine:[10,0,0],...EARS(20,30)})},
  {t:0.40,p:LEAN(0,0)},
  {t:0.50,p:LEAN(1)},{t:0.62,p:add(LEAN(1),{_hips:[0,-0.02,0]})},{t:0.75,p:LEAN(-0.6)},{t:0.87,p:add(LEAN(-0.6),{_hips:[0,-0.02,0]})},
  {t:1.0,p:LEAN(1.2)},{t:1.12,p:add(LEAN(1.2),{_hips:[0,-0.02,0]})},{t:1.25,p:LEAN(0.8)},{t:1.37,p:add(LEAN(0.8),{_hips:[0,-0.02,0]})},
  {t:1.44,p:{...CROUCH,_hips:[0,-0.15,0],spine:[30,0,0],head:[-30,0,0],legL:[-30,0,14],legR:[-30,0,-14],...EARS(-10,-4),tail1:[20,0,0]}},
  {t:1.54,ease:'out',p:{_hips:[0,-0.05,0],spine:[10,0,0],chest:[4,0,0],head:[-20,0,0],legL:[-8,0,16],legR:[-8,0,-16],footL:[10,0,0],footR:[10,0,0],...EARS(-24,-20),tail1:[24,0,0]}},
  {t:1.82,p:{_hips:[0,-0.06,0],spine:[12,0,0],chest:[5,0,0],head:[-22,0,0],legL:[-8,0,16],legR:[-8,0,-16],footL:[10,0,0],footR:[10,0,0],...EARS(-30,-24),tail1:[20,0,0]}},
  {t:1.89,ease:'out',p:{_hips:[0,0.02,0],spine:[-10,0,0],chest:[-6,0,0],head:[-10,0,0],...LEGS([10,6],[12,6],50),...EARS(40,46),tail1:[-20,0,0]}},
  {t:2.0,p:{...TUCK,head:[20,0,0],...EARS(-30,-40)}},
  {t:2.14,p:{...TUCK,spine:[30,0,0],head:[16,0,0],...EARS(-40,-50)}},
  {t:2.22,ease:'in',p:{spine:[10,0,0],head:[-6,0,0],...LEGS([-30,8],[-26,8],-8),...EARS(-10,-20)}},
  {t:2.26,ease:'in',p:{...LAND,_hips:[0,-0.17,0],spine:[36,0,0],head:[-10,70,0],...EARS(40,40)}},
  {t:2.42,p:{_hips:[0,-0.12,0],spine:[24,0,0],head:[-6,90,0],legL:[-26,0,10],legR:[-26,0,-10],footL:[34,0,0],footR:[34,0,0],...EARS(0,20)}},
  {t:2.6,p:{_hips:[0,-0.06,0],spine:[12,0,0],head:[-4,60,0],legL:[-14,0,6],legR:[-10,0,-6],...EARS(-12,-8)}},
],fn:(t,T)=>tail(t,0.5,10)};

// ---- spec batch (WINDBRIAR_MOTION_GALE.md), 19 Nov
// F1 Chase: a pivot on the left paw (back to the foe), pitched onto her forepaws (page), both hind legs snap straight back (0.23), the push rolls her forward over her shoulder (page), up crouched, a hop turn
NEW.gChase={T:0.62,air:[[0.56,0.61]],keys:[
  {t:0,p:{}},
  {t:0.06,p:{_hips:[0,-0.06,0],hips:[0,-20,0],spine:[14,26,0],chest:[6,16,0],head:[-10,60,0],legL:[-10,0,6],legR:[12,0,-6],footR:[30,0,0],...ARMS([30,-20,-10],[20,10,-10]),...EARS(-40,-30),tail1:[0,-20,0]}},
  {t:0.13,ease:'in',p:{_hips:[0,-0.04,0],spine:[22,0,0],chest:[8,0,0],head:[-34,0,0],...LEGS([-78,8],[-82,8],24),...ARMS([-46,-14,0],[-40,14,0]),...EARS(-30,-20),tail1:[-10,0,0]}},
  {t:0.23,ease:'in',p:{_hips:[0,0.02,-0.03],spine:[-8,0,0],chest:[-5,0,0],head:[-30,0,0],...LEGS([72,4],[76,4],-36),...ARMS([-52,-14,0],[-46,14,0]),...EARS(40,34),tail1:[36,0,0]}},
  {t:0.28,p:{_hips:[0,0.02,-0.02],spine:[-4,0,0],chest:[-3,0,0],head:[-26,0,0],...LEGS([64,4],[68,4],-30),...ARMS([-50,-14,0],[-44,14,0]),...EARS(6,22),tail1:[20,0,0]}},
  {t:0.33,p:{...TUCK,head:[34,0,0],...ARMS([-40,-24,-80],[-30,20,-70]),...EARS(-20,-30)}},
  {t:0.46,p:{...TUCK,spine:[42,0,0],head:[36,0,0],...ARMS([-44,-24,-84],[-34,20,-74]),...EARS(-36,-44)}},
  {t:0.50,ease:'out',p:{...CROUCH,_hips:[0,-0.17,0.02],spine:[36,0,0],head:[-20,0,0],...ARMS([40,-20,-10],[30,14,-10]),...EARS(30,36)}},
  {t:0.55,p:{...CROUCH,_hips:[0,-0.16,0.02],spine:[30,0,0],head:[-16,20,0],...EARS(10,30)}},
  {t:0.58,ease:'out',p:{_hips:[0,-0.04,0],spine:[10,0,0],head:[-8,0,0],...LEGS([-30,8],[-24,8],20),...EARS(-30,-24)}},
  {t:0.62,ease:'in',p:{...CROUCH,_hips:[0,-0.14,0.02],spine:[26,0,0],head:[-14,0,0],...EARS(24,20)}},
],fn:(t,T)=>tail(t,0.4,10)};
// the chasing shot from a sprinter's lunge: the left paw forward, the right leg stretched behind (knee forward, not a split); nock, draw, loose 0.2
NEW.gLunge={T:0.62,...(()=>{const s=seq([shot(0.0,0.06,0.17,0.2,0.9)]);return{draw:{keys:s.draw},offHand:{from:0.0,to:0.5,fade:0.06,keys:[...s.off,{t:0.4,p:[-0.24,0.12,-0.02],b:'chest'}]},
  staffPose:{from:0.0,to:0.58,fade:0.06,keys:[{t:0,...CARRY},{t:0.06,...LEVEL(0.8)},{t:0.17,...LEVEL(0)},{t:0.2,...LEVEL(0)},{t:0.23,...LEVEL(-0.5,0.012),ease:'in'},{t:0.36,...LEVEL(-0.1)},{t:0.58,...CARRY}]}};})(),keys:[
  {t:0,p:{...CROUCH,_hips:[0,-0.14,0.02],spine:[26,0,0],head:[-14,0,0],...EARS(24,20)}},
  {t:0.08,p:mix(STANCE,{_hips:[0,-0.15,0.0],spine:[18,-16,0],chest:[4,-26,0],head:[-6,62,0],legL:[-46,0,6],footL:[10,0,0],legR:[38,0,-6],footR:[50,0,0],...EARS(-20,-16),tail1:[-10,0,0]})},
  {t:0.2,p:mix(STANCE,{_hips:[0,-0.15,0.0],spine:[18,-17,0],chest:[4,-28,0],head:[-6,64,0],legL:[-46,0,6],footL:[10,0,0],legR:[38,0,-6],footR:[50,0,0],...EARS(-26,-20),tail1:[-10,0,0]})},
  {t:0.23,ease:'in',p:mix(STANCE,{_hips:[0,-0.13,-0.03],spine:[10,-10,0],chest:[0,-18,0],head:[-2,54,0],legL:[-46,0,6],footL:[10,0,0],legR:[38,0,-6],footR:[50,0,0],...EARS(24,22),tail1:[-26,0,0]})},
  {t:0.4,p:mix(STANCE,{_hips:[0,-0.1,-0.01],spine:[12,-14,0],head:[-4,58,0],legL:[-36,0,6],legR:[28,0,-6],footR:[30,0,0],...EARS(-8,-6),tail1:[16,0,0]})},
  {t:0.62,p:{}},
],fn:(t,T)=>tail(t,0.5,10)};
// F2 Wound kick: the coffee grinder coil (deep squat on the left paw, the right leg straight out along the floor, forepaws down behind; the page turns her round the paw), a loop
const GRIND={_hips:[0,-0.21,0.02],hips:[0,10,0],spine:[18,-10,0],chest:[6,-8,0],head:[-16,30,0],legL:[-24,0,10],footL:[30,0,0],legR:[-8,0,-84],footR:[40,0,0],...ARMS([54,-14,0],[50,14,0]),...EARS(-20,-30),tail1:[0,-20,0]};
NEW.gGrindIn={T:0.18,keys:[{t:0,p:{}},{t:0.08,p:{...CROUCH,_hips:[0,-0.14,0],spine:[30,0,0],...EARS(20,10)}},{t:0.18,ease:'in',p:GRIND}]};
NEW.gGrind={T:0.4,keys:[{t:0,p:GRIND},{t:0.4,p:GRIND}],fn:(t,T)=>({legR:[-8+6*S(t,T),0,-84],spine:[18,-10+4*S(t,T,0.2),0],earL:[-20,0,30*S(t,T,0.3)],earR:[-20,0,30*S(t,T,0.35)],earL2:[-30,0,36*S(t,T,0.4)],earR2:[-30,0,36*S(t,T,0.45)],tail1:[0,-20+20*S(t,T),0]})};
// the tornado kick: she springs off the squat paw with the bow thrown overhead, turns once in the air (page) and the right leg whips round straight at hip height (0.18); she lands on the kicking leg first (0.26), then the other, low guard
NEW.gTornado={T:0.7,air:[[0.06,0.26]],keys:[
  {t:0,p:GRIND},
  {t:0.06,ease:'out',p:{_hips:[0,0.02,0],spine:[-10,10,0],chest:[-4,8,0],head:[-6,-10,0],...LEGS([20,4],[-20,30],50,40),...ARMS([-170,-20,0],[-160,20,0]),...EARS(-56,-48),tail1:[0,20,0]}},
  {t:0.12,p:{spine:[0,-6,14],chest:[0,-6,6],head:[-4,20,-10],...LEGS([10,6],[-70,50],50,30),...ARMS([-120,-50,-20],[-110,50,-20]),...EARS(-40,-30),tail1:[0,10,0]}},
  {t:0.18,ease:'in',p:{spine:[-6,-24,30],chest:[-2,-14,10],head:[0,40,-24],...LEGS([16,10],[-24,100],50,44),earL:[-10,0,-16],earR:[-10,0,-16],earL2:[-18,0,-22],earR2:[-18,0,-22],...ARMS([30,-30,-20],[-10,54,-10]),tail1:[0,36,0]}},
  {t:0.22,p:{spine:[-4,-26,26],chest:[-2,-16,10],head:[0,44,-20],...LEGS([18,10],[-10,80],50,40),...ARMS([30,-30,-20],[-12,50,-10]),tail1:[0,20,0]}},
  {t:0.26,ease:'in',p:{_hips:[0,-0.06,0],spine:[10,-10,8],head:[-6,10,-4],legR:[-12,0,-8],footR:[20,0,0],legL:[-60,0,20],footL:[40,0,0],...EARS(20,30),...ARMS([20,-40,-20],[0,30,-10]),tail1:[0,-16,0]}},
  {t:0.32,ease:'in',p:{...LAND,_hips:[0,-0.16,0],legL:[-36,0,11],legR:[-30,0,-11]}},
  {t:0.46,p:mix(STANCE,{_hips:[0,-0.1,0],spine:[20,-16,0],head:[-10,62,0],legL:[-30,0,8],legR:[24,0,-8],...EARS(-10,-6)})},
  {t:0.7,p:{}},
],fn:(t,T)=>tail(t,0.4,10)};
// F3 Beat mark: after the axe kick the heel plants and she rolls her weight over it into a baby freeze (left forepaw down, right leg bent up, body tipped; the page tilts her), held; she rises tapping the bow on its chest
NEW.gBaby={T:0.55,staffPose:{from:0.3,to:0.55,fade:0.05,keys:[{t:0.3,...CARRY},{t:0.4,...moveP(STAFF(0,0.0),[0,0,0.12])},{t:0.44,...moveP(STAFF(0,0.0),[0,0,0.2]),ease:'in'},{t:0.55,...CARRY}]},keys:[
  {t:0,p:{...LAND,_hips:[0,-0.17,0],legL:[-30,0,11],legR:[-46,0,-11]}},
  {t:0.08,ease:'out',p:{_hips:[0,-0.2,0.02],spine:[40,0,24],chest:[12,0,10],head:[-20,-20,-16],legL:[-26,0,12],footL:[30,0,0],legR:[-100,0,-20],footR:[50,0,0],upperarmL:[-40,0,30],forearmL:[0,0,0],upperarmR:[-30,0,-40],...EARS(40,46),tail1:[0,30,0]}},
  {t:0.3,p:{_hips:[0,-0.2,0.02],spine:[42,0,26],chest:[13,0,11],head:[-22,-22,-16],legL:[-26,0,12],footL:[30,0,0],legR:[-104,0,-20],footR:[52,0,0],upperarmL:[-42,0,30],forearmL:[0,0,0],upperarmR:[-32,0,-42],...EARS(20,40),tail1:[0,28,0]}},
  {t:0.42,ease:'out',p:mix(STANCE,{_hips:[0,-0.06,0],spine:[10,-14,0],head:[-6,60,0],...EARS(-20,-14)})},
  {t:0.55,p:{}},
],fn:(t,T)=>tail(t,0.5,8)};
// F4 Slingshot: the water-ski lean on the taut cord (both paws planted, knees bent, body tipped back), two bounces, then the feet-first dropkick (the page lays her flat and gives a half corkscrew), soles hit 0.25, a three-point landing
const SKI={_hips:[0,-0.16,-0.06],spine:[-26,0,0],chest:[-20,0,0],head:[14,0,0],legL:[-34,0,8],footL:[10,0,0],legR:[-28,0,-8],footR:[10,0,0],...ARMS([-70,-10,-20],[-60,10,-20]),...EARS(-50,-56),tail1:[20,0,0]};
NEW.gSki={T:0.48,keys:[{t:0,p:{}},{t:0.08,p:SKI},{t:0.16,p:add(SKI,{_hips:[0,-0.05,0],spine:[4,0,0]})},{t:0.24,p:add(SKI,{_hips:[0,0.03,0],spine:[-4,0,0],...EARS(10,6)})},{t:0.32,p:add(SKI,{_hips:[0,-0.05,0],spine:[4,0,0]})},{t:0.4,p:add(SKI,{_hips:[0,0.03,0],spine:[-4,0,0]})},{t:0.48,p:add(SKI,{_hips:[0,-0.03,0],spine:[2,0,0]})}],fn:(t,T)=>tail(t,0.24,8)};
NEW.gDropkick={T:0.6,air:[[0,0.42]],keys:[
  {t:0,p:add(SKI,{_hips:[0,-0.03,0]})},
  {t:0.05,ease:'out',p:{hips:[0,0,0],spine:[-10,0,0],chest:[-4,0,0],head:[20,0,0],...LEGS([-80,3],[-84,3],50),...ARMS([-40,-10,-100],[-34,10,-100]),...EARS(-60,-60),tail1:[30,0,0]}},
  {t:0.13,p:{hips:[0,90,0],spine:[-11,0,0],chest:[-5,0,0],head:[22,0,0],...LEGS([-84,3],[-86,3],52),...ARMS([-42,-10,-102],[-36,10,-102]),...EARS(-58,-60),tail1:[24,0,0]}},
  {t:0.22,p:{hips:[0,180,0],spine:[-12,0,0],chest:[-5,0,0],head:[24,0,0],...LEGS([-86,3],[-88,3],52),...ARMS([-44,-10,-104],[-38,10,-104]),...EARS(-56,-60),tail1:[20,0,0]}},
  {t:0.25,ease:'in',p:{hips:[0,180,0],spine:[-6,0,0],head:[20,0,0],...LEGS([-96,4],[-98,4],-20),...ARMS([-44,-10,-104],[-38,10,-104]),...EARS(10,-20),tail1:[0,0,0]}},
  {t:0.33,p:{...TUCK,hips:[0,270,0],head:[20,0,0],...EARS(-30,-40)}},
  {t:0.42,ease:'in',p:{hips:[0,360,0],spine:[20,0,0],head:[-10,0,0],...LEGS([-36,8],[-30,8],-10),upperarmR:[20,0,30],...EARS(-10,-24)}},
  {t:0.45,ease:'in',p:{hips:[0,360,0],_hips:[0,-0.19,0.04],spine:[52,0,10],chest:[16,0,6],head:[-36,-10,0],legL:[-30,0,14],legR:[-18,0,-12],footL:[40,0,0],footR:[40,0,0],upperarmR:[86,0,10],forearmR:[0,0,0],upperarmL:[-120,0,30],...EARS(14,24),tail1:[-26,0,0]}},
  {t:0.52,p:{hips:[0,360,0],_hips:[0,-0.18,0.04],spine:[46,0,10],chest:[14,0,6],head:[-28,-14,0],legL:[-30,0,14],legR:[-18,0,-12],footL:[40,0,0],footR:[40,0,0],upperarmR:[84,0,10],forearmR:[0,0,0],upperarmL:[-124,0,30],...EARS(0,20),tail1:[-20,0,0]}},
  {t:0.6,p:{hips:[0,360,0],_hips:[0,-0.1,0],spine:[20,0,0],head:[-8,0,0],legL:[-16,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
],fn:(t,T)=>tail(t,0.4,10)};
// F5 Foot pin: six-step footwork crouched low round the pinned right paw, the bow at her hip, a snap shot every 0.12 s; her body bends a new way each shot (under her arm, behind her back, bent double, over her shoulder, sitting back, level)
const SIXD=[];for(let k=0;k<6;k++){const b=k*0.12;SIXD.push({t:b,d:0.12,a:1,h:1},{t:b+0.065,d:0.42,a:1,h:1},{t:b+0.075,d:-0.07,a:0,h:1,ease:'lin'},{t:b+0.1,d:0.04,a:1,h:1});}SIXD.push({t:0.72,d:0.12,a:1,h:1});
const SIXB=[{spine:[34,-20,0],chest:[10,-20,0],head:[-14,40,0]},{spine:[30,30,0],chest:[8,26,0],head:[-10,-50,0]},{spine:[60,0,0],chest:[20,0,0],head:[-40,0,0]},{spine:[20,-40,-10],chest:[6,-30,0],head:[0,70,0]},{spine:[-16,0,0],chest:[-8,0,0],head:[10,0,0]},{spine:[14,-14,0],chest:[4,-24,0],head:[-4,60,0]}];
const SIXL=[[-40,10,24,-10],[-10,30,30,-10],[20,10,30,-10],[30,-20,30,-10],[-10,-30,30,-10],[-40,-10,30,-10]];
NEW.gSix={T:0.72,draw:{keys:SIXD},offHand:{from:-0.3,to:1.0,fade:0.05,keys:[{t:0,p:[0.02,-0.06,0.12],b:'chest'},{t:0.72,p:[0.02,-0.06,0.12],b:'chest'}]},
  staffPose:{from:-0.3,to:1.0,fade:0.05,keys:[{t:0,...FLATP(0.25)},{t:0.72,...FLATP(0.25)}]},
  keys:SIXB.map((b,k)=>({t:k*0.12,p:{_hips:[0,-0.15,0.02],...b,legL:[SIXL[k][0],0,SIXL[k][1]],footL:[SIXL[k][2],0,0],legR:[SIXL[k][3],0,-6],footR:[30,0,0],...EARS(-20+8*(k%2),-14),tail1:[0,(k%2?20:-20),0]}})).concat([{t:0.72,p:{_hips:[0,-0.15,0.02],...SIXB[0],legL:[SIXL[0][0],0,SIXL[0][1]],footL:[SIXL[0][2],0,0],legR:[SIXL[0][3],0,-6],footR:[30,0,0],...EARS(-20,-14),tail1:[0,-20,0]}}])};
// out of the pin: a back handspring off the pinned paw (the page flips her backward)
NEW.gHandspring={T:0.55,air:[[0.06,0.4]],keys:[
  {t:0,p:{...CROUCH,_hips:[0,-0.15,0]}},
  {t:0.06,ease:'out',p:{spine:[-30,0,0],chest:[-16,0,0],head:[30,0,0],...LEGS([10,4],[14,4],50),...ARMS([-170,-20,0],[-170,20,0]),...EARS(-60,-60),tail1:[20,0,0]}},
  {t:0.2,p:{spine:[-40,0,0],chest:[-20,0,0],head:[34,0,0],...LEGS([-20,4],[-24,4],56),...ARMS([-176,-16,0],[-176,16,0]),...EARS(-60,-60)}},
  {t:0.3,p:{...TUCK,spine:[20,0,0],...EARS(-30,-40)}},
  {t:0.4,ease:'in',p:{...LAND}},
  {t:0.55,p:{_hips:[0,-0.06,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
]};
// F8 Arrow spear: pulls the giant arrow out by its middle (dips under its weight), a figure eight round her body (hips counter-turn), an overhead helicopter (arms straight up, the page pivots her), a low sweep, two steps back and a javelin throw
NEW.gSpear={T:1.45,air:[[1.12,1.2]],keys:[
  {t:0,p:{}},
  {t:0.1,p:{spine:[10,0,0],head:[-10,0,0],...ARMS([-80,-10,-10],[-80,10,-10]),...EARS(-10,-6)}},
  {t:0.23,ease:'in',p:{_hips:[0,-0.1,0],spine:[18,0,0],head:[-6,0,0],legL:[-20,0,6],legR:[-20,0,-6],...ARMS([-50,-10,-60],[-50,10,-60]),...EARS(20,26)}},
  {t:0.32,p:{_hips:[0,-0.05,0],hips:[0,24,0],spine:[-6,-30,-10],chest:[0,-16,0],head:[0,20,0],...ARMS([-150,-30,-20],[-110,40,-20]),...EARS(-20,-10),tail1:[0,30,0]}},
  {t:0.41,p:{_hips:[0,-0.06,0],hips:[0,-24,0],spine:[10,30,8],chest:[4,16,0],head:[-6,-20,0],...ARMS([40,-30,-10],[50,30,-10]),...EARS(10,-10),tail1:[0,-30,0]}},
  {t:0.5,p:{_hips:[0,-0.05,0],hips:[0,10,0],spine:[0,-10,0],head:[-4,0,0],...ARMS([-120,-20,-20],[-120,20,-20]),...EARS(-20,-20)}},
  {t:0.56,p:{spine:[-8,0,0],chest:[-4,0,0],head:[10,0,0],legL:[-6,0,6],legR:[6,0,-6],...ARMS([-176,-6,0],[-176,6,0]),...EARS(-30,-40),tail1:[0,20,0]}},
  {t:0.76,p:{spine:[-10,0,0],chest:[-5,0,0],head:[12,0,0],legL:[-6,0,6],legR:[6,0,-6],...ARMS([-178,-6,0],[-178,6,0]),...EARS(-40,-50),tail1:[0,-20,0]}},
  {t:0.84,ease:'in',p:{...CROUCH,_hips:[0,-0.19,0.02],spine:[40,0,0],head:[-20,0,0],...ARMS([-30,-70,0],[-30,70,0]),...EARS(30,36),tail1:[0,30,0]}},
  {t:0.96,p:{...CROUCH,_hips:[0,-0.19,0.02],spine:[42,0,0],head:[-22,0,0],...ARMS([-30,-74,0],[-30,74,0]),...EARS(10,36),tail1:[0,-30,0]}},
  {t:1.04,p:{_hips:[0,-0.04,0],spine:[6,0,0],head:[-6,0,0],legL:[-30,0,6],legR:[24,0,-6],...ARMS([30,-40,-60],[-70,10,0]),...EARS(-20,-14)}},
  {t:1.12,p:{_hips:[0,-0.02,0],spine:[-4,0,0],head:[-4,0,0],legL:[20,0,6],legR:[-34,0,-6],...ARMS([50,-50,-70],[-84,10,0]),...EARS(-20,-14)}},
  {t:1.2,p:{_hips:[0,-0.03,0],spine:[-20,-10,0],chest:[-10,-10,0],head:[6,10,0],legL:[-26,0,6],footL:[10,0,0],legR:[46,0,-6],footR:[60,0,0],...ARMS([70,-50,-80],[-90,10,0]),...EARS(-40,-30),tail1:[20,0,0]}},
  {t:1.26,ease:'in',p:{_hips:[0,-0.06,0],spine:[30,16,0],chest:[10,10,0],head:[-14,-10,0],legL:[-30,0,6],legR:[30,0,-6],...ARMS([-130,-20,0],[20,10,-20]),...EARS(30,24),tail1:[-20,0,0]}},
  {t:1.34,p:mix(STANCE,{_hips:[0,-0.13,0],spine:[26,10,0],head:[-10,40,0],legL:[-44,0,6],legR:[34,0,-6],footR:[40,0,0],...ARMS([-90,-20,0],[30,10,-10]),...EARS(10,10)})},
  {t:1.45,p:mix(STANCE,{_hips:[0,-0.1,0],spine:[20,0,0],head:[-6,50,0],legL:[-40,0,6],legR:[30,0,-6],footR:[36,0,0],...EARS(-10,-6)})},
],fn:(t,T)=>tail(t,0.5,10)};
// F9 Slide shot: a baseball slide on her back and hip (the page lays her down and slides her), right leg straight ahead, left tucked; three snap shots straight up from under it
NEW.gSlide={T:0.7,...(()=>{const s=seq([shot(0.18,0.22,0.27,0.29,0.5),shot(0.31,0.32,0.35,0.37,0.5),shot(0.39,0.4,0.43,0.45,0.5)]);return{draw:{keys:s.draw},offHand:{from:0.15,to:0.6,fade:0.05,keys:s.off.filter(k=>k.t>=0.18)},
  staffPose:{from:0.0,to:0.66,fade:0.06,keys:[{t:0,...CARRY},{t:0.1,...moveP(STAFF(0,0),[0,-0.1,0.06])},{t:0.2,...LEVEL(0.4)},{t:0.29,...LEVEL(0)},{t:0.31,...LEVEL(-0.3,0.01)},{t:0.37,...LEVEL(0)},{t:0.39,...LEVEL(-0.3,0.01)},{t:0.45,...LEVEL(0)},{t:0.48,...LEVEL(-0.4,0.01)},{t:0.66,...LEVEL(0.2)}]}};})(),air:[[0,0.7]],keys:[
  {t:0,p:{_hips:[0,-0.03,0],spine:[10,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
  {t:0.08,p:{spine:[20,0,0],chest:[8,0,0],head:[20,0,0],legL:[-120,0,10],footL:[40,0,0],legR:[-84,0,-6],footR:[50,0,0],...EARS(-60,-64),tail1:[0,0,0]}},
  {t:0.7,p:{spine:[22,0,0],chest:[8,0,0],head:[24,0,0],legL:[-124,0,10],footL:[40,0,0],legR:[-88,0,-6],footR:[50,0,0],...EARS(-60,-64),tail1:[0,0,0]}},
],fn:(t,T)=>({earL:[-60,0,6*Math.sin(t*40)],earR:[-60,0,6*Math.sin(t*40+1)]})};
// F10 Closing rain: four coffee-grinder turns that close (the swept leg draws in each turn, a hop of the forepaws over it), then she rises pulling both forepaws in to a fist
NEW.gGrindClose={T:2.0,keys:[0,0.5,1.0,1.5,2.0].map((t,k)=>({t,p:{...GRIND,legR:[-8,0,-84+k*12],footR:[40,0,0]}})).concat([0.25,0.75,1.25,1.75].map((t)=>({t,p:{...GRIND,_hips:[0,-0.17,0.02],legR:[-12,0,-84+t*24],...ARMS([20,-20,0],[16,20,0]),spine:[24,-10,0]}}))).sort((a,b)=>a.t-b.t),fn:(t,T)=>({earL:[-20,0,30*Math.sin(t*12.6)],earR:[-20,0,30*Math.sin(t*12.6+0.4)],tail1:[0,30*Math.sin(t*12.6),0]})};
NEW.gCloseUp={T:0.45,keys:[{t:0,p:{...GRIND,legR:[-8,0,-36]}},{t:0.1,p:{...CROUCH,_hips:[0,-0.16,0],...ARMS([-40,-50,-30],[-40,50,-30])}},{t:0.24,ease:'out',p:{_hips:[0,0.0,0],spine:[-6,0,0],head:[-10,0,0],...ARMS([-80,-6,-70],[-80,6,-70]),...EARS(-30,-24)}},{t:0.45,p:{}}]};
// F11 Blast ride: sprinter's blocks (forepaws down, both hind paws braced), a flying side kick (the page turns her sideways and lays her flat: the right leg leads, the left tucked, the bow back along her), a long skid on both hind paws
NEW.gSideKick={T:0.8,air:[[0.1,0.36]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.18,0],spine:[60,0,0],chest:[16,0,0],head:[-40,0,0],legL:[-30,0,8],legR:[10,0,-8],...ARMS([-40,-10,0],[-40,10,0]),...EARS(-10,10),tail1:[-10,0,0]}},
  {t:0.12,ease:'out',p:{spine:[0,0,0],head:[-10,0,0],legR:[-4,0,-4],footR:[-20,0,0],legL:[-110,0,10],footL:[50,0,0],...ARMS([40,-10,-10],[30,10,-10]),...EARS(-60,-60),tail1:[20,0,0]}},
  {t:0.34,p:{spine:[-4,0,0],head:[-8,0,0],legR:[-2,0,-4],footR:[-24,0,0],legL:[-114,0,10],footL:[50,0,0],...ARMS([44,-10,-10],[34,10,-10]),...EARS(-60,-60),tail1:[20,0,0]}},
  {t:0.38,ease:'in',p:add(SKI,{spine:[10,0,0]})},
  {t:0.56,p:add(SKI,{_hips:[0,0.02,0],spine:[16,0,0],...EARS(30,40)})},
  {t:0.66,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-10,0,0],legL:[-16,0,6],legR:[-12,0,-6],...EARS(40,50)}},
  {t:0.8,p:{_hips:[0,-0.03,0],spine:[6,0,0],...EARS(-10,-6)}},
],fn:(t,T)=>tail(t,0.4,10)};
// F12 Kicked saw: the wheel drops to her paws, a keepy-up flick of the right instep (0.1), she watches it, ears up; then the tornado kick from standing
NEW.gKeepy={T:0.36,keys:[
  {t:0,p:{}},
  {t:0.06,p:{_hips:[0,-0.05,0],spine:[20,0,0],head:[-30,0,0],legR:[-20,0,-6],footR:[20,0,0],...EARS(-10,-10)}},
  {t:0.12,ease:'out',p:{_hips:[0,-0.02,0],spine:[16,0,0],head:[-26,0,0],legR:[-56,0,-14],footR:[-20,0,0],...ARMS([10,-30,-10],[0,20,-10]),...EARS(-40,-30)}},
  {t:0.22,p:{_hips:[0,-0.04,0],spine:[10,0,0],head:[-14,0,0],legR:[-10,0,-6],footR:[10,0,0],...EARS(-50,-50)}},
  {t:0.36,p:{...CROUCH,_hips:[0,-0.1,0],spine:[20,0,0],head:[-14,0,0],...EARS(-30,-40)}},
]};
NEW.gTornadoS={...NEW.gTornado,keys:[{t:0,p:{...CROUCH,_hips:[0,-0.1,0],spine:[20,0,0],head:[-14,0,0],...EARS(-30,-40)}},...NEW.gTornado.keys.slice(1)]};
