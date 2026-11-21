// ---------------------------------------------------------------- Gale F19 to F24 from the design thread's motion spec (WINDBRIAR_MOTION_GALE.md)
// F19 Air juggle: out of the backflip kick's landing squash straight into the jump; a rising front kick (0.12), a butterfly twist with both legs whipping round (page lays her flat and spins her, 0.2 to 0.3), a bicycle kick over her head while upside down (0.42), a superhero landing
const HERO={_hips:[0,-0.2,0.0],spine:[34,0,0],chest:[10,0,0],head:[-40,0,0],legL:[-56,0,6],footL:[30,0,0],legR:[24,0,-4],footR:[70,0,0],...ARMS([20,-24,-10],[-50,40,-30]),...EARS(30,40),tail1:[-10,0,0]};
NEW.gJuggle={T:0.66,air:[[0.03,0.54]],keys:[
  {t:0,p:{...LAND,_hips:[0,-0.17,0]}},
  {t:0.05,ease:'out',p:{spine:[-6,0,0],head:[-30,0,0],legL:[4,0,4],legR:[6,0,-4],footL:[50,0,0],footR:[50,0,0],...ARMS([-160,-20,-10],[-160,20,-10]),...EARS(-56,-60),tail1:[20,0,0]}},
  {t:0.12,ease:'out',p:{spine:[-16,0,0],chest:[-6,0,0],head:[-34,0,0],legL:[24,0,4],footL:[40,0,0],legR:[-168,0,-6],footR:[50,0,0],...ARMS([30,-40,-10],[30,40,-10]),...EARS(-40,-50),tail1:[30,0,0]}},
  {t:0.18,p:{spine:[20,0,0],head:[-10,0,0],legL:[-60,0,6],legR:[-70,0,-6],footL:[40,0,0],footR:[40,0,0],...ARMS([-60,-60,-20],[-60,60,-20]),...EARS(-30,-40)}},
  {t:0.24,ease:'out',p:{spine:[4,0,0],head:[-20,0,0],legL:[-46,0,8],legR:[40,0,-8],footL:[50,0,0],footR:[50,0,0],...ARMS([-90,-90,0],[-90,90,0]),...EARS(-60,-60),tail1:[0,30,0]}},
  {t:0.3,p:{spine:[4,0,0],head:[-20,0,0],legL:[40,0,8],legR:[-46,0,-8],footL:[50,0,0],footR:[50,0,0],...ARMS([-90,-90,0],[-90,90,0]),...EARS(-60,-60),tail1:[0,-30,0]}},
  {t:0.36,p:{spine:[30,0,0],chest:[10,0,0],head:[10,0,0],legL:[-100,0,6],legR:[20,0,-6],footL:[40,0,0],footR:[40,0,0],...ARMS([-30,-50,-30],[-30,50,-30]),...EARS(-20,-30)}},
  {t:0.42,ease:'out',p:{spine:[36,0,0],chest:[12,0,0],head:[16,0,0],legL:[30,0,6],legR:[-164,0,-6],footL:[40,0,0],footR:[50,0,0],...ARMS([30,-60,-10],[30,60,-10]),...EARS(-30,-40),tail1:[-20,0,0]}},
  {t:0.5,p:{spine:[16,0,0],head:[-10,0,0],legL:[-50,0,8],legR:[-30,0,-8],footL:[30,0,0],footR:[30,0,0],...ARMS([-40,-60,-10],[-40,60,-10]),...EARS(-50,-56)}},
  {t:0.56,ease:'in',p:HERO},
  {t:0.66,p:add(HERO,{head:[6,0,0],...EARS(-30,-30)})},
],fn:(t,T)=>tail(t,0.3,8)};

// F20 Cuju: the dribble behind the wind ball (a bounding step with an inside tap each beat, left then right; loop 0.5), a knee juggle, a rainbow flick, around the world, a scorpion kick off her planted forepaws, a forward roll out
NEW.gDribble={T:0.5,loop:true,air:[[0.1,0.2],[0.35,0.45]],keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-14,0,0],legL:[-30,0,6],legR:[20,0,-6],...ARMS([20,-20,-30],[-30,20,-30]),...EARS(-30,-34)}},
  {t:0.1,p:{_hips:[0,-0.03,0],spine:[12,6,0],head:[-14,-6,0],legL:[-10,0,-24],footL:[10,0,0],legR:[10,0,-6],...ARMS([-10,-30,-30],[10,30,-30]),...EARS(-40,-44)}},
  {t:0.25,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-14,0,0],legL:[20,0,6],legR:[-30,0,-6],...ARMS([-30,-20,-30],[20,20,-30]),...EARS(-30,-34)}},
  {t:0.35,p:{_hips:[0,-0.03,0],spine:[12,-6,0],head:[-14,6,0],legR:[-10,0,24],footR:[10,0,0],legL:[10,0,6],...ARMS([10,-30,-30],[-10,30,-30]),...EARS(-40,-44)}},
  {t:0.5,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-14,0,0],legL:[-30,0,6],legR:[20,0,-6],...ARMS([20,-20,-30],[-30,20,-30]),...EARS(-30,-34)}},
],fn:(t,T)=>tail(t,0.25,12)};
NEW.gKneeUp={T:0.32,keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[16,0,0],head:[-14,0,0],legL:[-20,0,6],legR:[10,0,-6]}},
  {t:0.1,ease:'out',p:{_hips:[0,0.0,0],spine:[6,0,0],head:[-30,0,0],legL:[-2,0,4],legR:[-84,0,-8],footR:[50,0,0],...ARMS([-40,-50,-20],[-40,50,-20]),...EARS(-40,-30)}},
  {t:0.2,p:{_hips:[0,-0.02,0],spine:[4,0,0],head:[-40,0,0],legL:[-2,0,4],legR:[-30,0,-8],footR:[30,0,0],...ARMS([-30,-50,-20],[-30,50,-20]),...EARS(-50,-50)}},
  {t:0.32,p:{_hips:[0,-0.08,0],spine:[14,0,0],head:[-30,0,0],legL:[-20,0,6],legR:[10,0,-6],...EARS(-30,-30)}},
]};
NEW.gRainbow={T:0.42,air:[[0.14,0.26]],keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[14,0,0],head:[-30,0,0],legL:[-20,0,6],legR:[10,0,-6]}},
  {t:0.08,p:{_hips:[0,-0.07,0],spine:[24,0,0],head:[-20,0,0],legL:[-10,0,6],legR:[30,0,-4],footR:[-20,0,0],...EARS(-10,-10)}},
  {t:0.16,ease:'out',p:{_hips:[0,-0.0,0],spine:[-10,0,0],chest:[-6,0,0],head:[-50,0,0],legL:[4,0,6],footL:[40,0,0],legR:[74,0,-6],footR:[70,0,0],...ARMS([30,-60,-10],[30,60,-10]),...EARS(-60,-66),tail1:[40,0,0]}},
  {t:0.26,p:{_hips:[0,-0.0,0],spine:[-14,0,0],chest:[-8,0,0],head:[-56,0,0],legL:[0,0,6],legR:[50,0,-6],...ARMS([20,-60,-10],[20,60,-10]),...EARS(-50,-60)}},
  {t:0.34,ease:'in',p:{_hips:[0,-0.1,0],spine:[10,0,0],head:[-30,0,0],legL:[-20,0,6],legR:[16,0,-6],...EARS(10,10)}},
  {t:0.42,p:{_hips:[0,-0.06,0],spine:[10,0,0],head:[-30,0,0],legL:[-14,0,6],legR:[12,0,-6],...EARS(-20,-20)}},
]};
NEW.gWorld={T:0.4,air:[[0.06,0.3]],keys:[
  {t:0,p:{_hips:[0,-0.06,0],spine:[10,0,0],head:[-30,0,0],legL:[-14,0,6],legR:[12,0,-6]}},
  {t:0.06,p:{_hips:[0,-0.02,0],spine:[6,0,0],head:[-34,0,0],legL:[0,0,4],legR:[-40,0,-30],footR:[40,0,0],...ARMS([-20,-60,-10],[-20,60,-10]),...EARS(-40,-40)}},
  {t:0.3,p:{_hips:[0,-0.02,0],spine:[6,0,0],head:[-34,0,0],legL:[0,0,4],legR:[-40,0,-30],footR:[40,0,0],...ARMS([-20,-60,-10],[-20,60,-10]),...EARS(-40,-40)}},
  {t:0.4,p:{_hips:[0,-0.1,0],spine:[14,0,0],head:[-30,0,0],legL:[-20,0,6],legR:[14,0,-6],...EARS(0,0)}},
],fn:(t,T)=>{const u=Math.min(1,Math.max(0,(t-0.06)/0.24)),w=Math.sin(Math.PI*u);return{legR:[-24*Math.cos(2*Math.PI*u)*w,0,-30*Math.sin(2*Math.PI*u)*w],hips:[0,20*Math.sin(2*Math.PI*u)*w,0]};}};
// the scorpion: she dives forward onto both forepaws (the page tips her nose-down over them), her hind legs arc up over her back and the heel whips over her head into the ball (0.3), held up on her planted forepaws; then a forward roll out
NEW.gScorpion={T:0.8,air:[[0.04,0.14],[0.48,0.66]],keys:[
  {t:0,p:{_hips:[0,-0.06,0],spine:[14,0,0],head:[-30,0,0],legL:[-14,0,6],legR:[12,0,-6]}},
  {t:0.06,p:{...CROUCH,_hips:[0,-0.14,0],spine:[40,0,0],head:[-30,0,0],...ARMS([-80,-20,-10],[-80,20,-10])}},
  {t:0.14,ease:'out',p:{spine:[-20,0,0],chest:[-10,0,0],head:[-50,0,0],legL:[20,0,4],legR:[24,0,-4],footL:[50,0,0],footR:[50,0,0],...ARMS([-150,-14,0],[-150,14,0]),...EARS(-20,-30),tail1:[30,0,0]}},
  {t:0.22,p:{spine:[-34,0,0],chest:[-18,0,0],head:[-56,0,0],legL:[40,0,6],legR:[70,0,-6],footL:[40,0,0],footR:[60,0,0],...ARMS([-160,-14,0],[-160,14,0]),...EARS(10,0),tail1:[30,0,0]}},
  {t:0.3,ease:'out',p:{spine:[-44,0,0],chest:[-22,0,0],head:[-60,0,0],legL:[46,0,8],legR:[120,0,-8],footL:[40,0,0],footR:[-30,0,0],...ARMS([-164,-14,0],[-164,14,0]),...EARS(30,20),tail1:[40,0,0]}},
  {t:0.4,p:{spine:[-36,0,0],chest:[-18,0,0],head:[-56,0,0],legL:[40,0,8],legR:[90,0,-8],footL:[40,0,0],footR:[-10,0,0],...ARMS([-162,-14,0],[-162,14,0]),...EARS(20,30),tail1:[30,0,0]}},
  {t:0.48,p:{...TUCK,...ARMS([-120,-20,-20],[-120,20,-20])}},
  {t:0.62,p:{...TUCK,...ARMS([-60,-20,-20],[-60,20,-20])}},
  {t:0.7,ease:'in',p:{...LAND,_hips:[0,-0.16,0]}},
  {t:0.8,p:{_hips:[0,-0.07,0],spine:[12,0,0],head:[-10,0,0],...EARS(-10,-10)}},
]};

// F21 Parry spin: three upright spins on her left paw (the page turns her, the paw stays put), the bow upright like a staff; each spin stops dead on a blow (0.16, 0.56, 0.96) and the turn throws a different counter: a spinning back kick, a hook kick to the head, a crescent kick; then a side-on guard
const UPR={p:[0.02,0.52,0.22],d:[0,1,0],n:[1,0,0]};
const SPN={_hips:[0,-0.04,0],spine:[2,0,0],head:[-4,0,0],legL:[-2,0,3],footL:[20,0,0],legR:[-30,0,-14],footR:[40,0,0],...EARS(-30,-40),tail1:[0,20,0]};
NEW.gParry={T:1.3,staffPose:{from:0,to:1.3,fade:0.05,keys:[{t:0,...CARRY},{t:0.06,...UPR},{t:0.16,...moveP(UPR,[0,0,0.06])},{t:0.2,...UPR},{t:0.56,...moveP(UPR,[0,0,0.06])},{t:0.6,...UPR},{t:0.96,...moveP(UPR,[0,0,0.06])},{t:1.3,...UPR}]},keys:[
  {t:0,p:{}},
  {t:0.06,p:SPN},
  {t:0.16,p:add(SPN,{spine:[6,0,0],legR:[10,0,0],...EARS(30,40)})},
  {t:0.2,p:{...SPN,spine:[30,0,0],chest:[8,0,0],head:[-20,70,0],legR:[30,0,-6],footR:[-10,0,0]}},
  {t:0.27,ease:'out',p:{...SPN,_hips:[0,-0.03,0],spine:[44,0,0],chest:[12,0,0],head:[-30,74,0],legR:[86,0,-6],footR:[-30,0,0],...EARS(-40,-50),tail1:[0,-30,0]}},
  {t:0.36,p:SPN},
  {t:0.56,p:add(SPN,{spine:[6,0,0],...EARS(30,40)})},
  {t:0.6,p:{...SPN,hips:[0,30,0],spine:[-6,-20,0],legR:[-80,0,-70],footR:[30,0,0]}},
  {t:0.67,ease:'out',p:{...SPN,hips:[0,-30,0],spine:[-14,20,0],chest:[-6,10,0],head:[-6,-20,0],legR:[-104,0,-10],footR:[-20,0,0],...EARS(-50,-56),tail1:[0,-30,0]}},
  {t:0.76,p:SPN},
  {t:0.96,p:add(SPN,{spine:[6,0,0],...EARS(30,40)})},
  {t:1.0,p:{...SPN,spine:[-6,10,0],legR:[-110,0,-50],footR:[40,0,0]}},
  {t:1.07,ease:'out',p:{...SPN,spine:[-12,-16,0],head:[-6,16,0],legR:[-124,0,20],footR:[40,0,0],...EARS(-50,-56),tail1:[0,30,0]}},
  {t:1.16,p:mix(STANCE,{_hips:[0,-0.08,0],legL:[-20,0,4],legR:[16,0,-4],footR:[30,0,0],...EARS(-10,-10)})},
  {t:1.3,p:mix(STANCE,{_hips:[0,-0.07,0],legL:[-20,0,4],legR:[16,0,-4],footR:[34,0,0],...EARS(-20,-14)})},
],fn:(t,T)=>tail(t,0.33,8)};

// F22 Head clap: a step in between and in front of two foes, the bow's string side hooked behind both necks (held wide in both forepaws), her weight drops and her hips twist as both paws yank it in and down (0.24), she lets go and spins it back to her grip, a cocky toprock step back: cross, kick, cross
const NECK=moveP(STAFF(0,0.42),[0,0,0.28]), YANK=moveP(STAFF(0,0.2),[0,0,0.12]);
NEW.gClap={T:1.0,staffPose:{from:0,to:1.0,fade:0.05,keys:[{t:0,...CARRY},{t:0.1,...NECK},{t:0.14,...NECK},{t:0.24,...YANK,ease:'in'},{t:0.28,...YANK},...spinKeys(STAFF(0,0.04),0.3,0.44,[0,1,0],1),{t:0.5,...CARRY},{t:1.0,...CARRY}]},
  offHand:{from:0.04,to:0.32,fade:0.05,keys:[{t:0,p:[0.3,0.94,0.48]},{t:0.14,p:[0.3,0.94,0.48]},{t:0.24,p:[0.26,0.72,0.32],ease:'in'},{t:0.32,p:[0.26,0.72,0.32]}]},keys:[
  {t:0,p:{}},
  {t:0.06,p:{_hips:[0,-0.03,0],spine:[6,0,0],legL:[-30,0,6],legR:[10,0,-6],...EARS(-10,-10)}},
  {t:0.12,p:{_hips:[0,-0.05,0],spine:[-4,0,0],head:[-10,0,0],legL:[-16,0,8],legR:[12,0,-8],...EARS(-20,-20)}},
  {t:0.18,p:{_hips:[0,-0.08,0],hips:[0,-14,0],spine:[0,10,0],head:[-10,0,0],legL:[-18,0,10],legR:[14,0,-10],...EARS(-24,-20)}},
  {t:0.24,ease:'in',p:{_hips:[0,-0.19,0],hips:[0,26,0],spine:[24,-16,0],chest:[8,-8,0],head:[-20,0,0],legL:[-30,0,14],legR:[24,0,-14],...EARS(40,40),tail1:[0,20,0]}},
  {t:0.3,p:{_hips:[0,-0.17,0],hips:[0,24,0],spine:[20,-14,0],chest:[6,-6,0],head:[-16,0,0],legL:[-30,0,14],legR:[24,0,-14],...EARS(10,30)}},
  {t:0.44,p:{_hips:[0,-0.05,0],spine:[0,0,0],head:[-14,0,0],legL:[-10,0,6],legR:[8,0,-6],...EARS(-40,-46)}},
  {t:0.54,p:{_hips:[0,-0.03,0],spine:[-4,0,0],head:[-16,0,0],legL:[-6,0,-16],legR:[16,0,-6],...ARMS([10,-30,-30],[-20,30,-30]),...EARS(-50,-50),tail1:[0,30,0]}},
  {t:0.66,ease:'out',p:{_hips:[0,0.0,0],spine:[-8,0,0],head:[-18,0,0],legL:[-2,0,4],legR:[-70,0,-6],footR:[50,0,0],...ARMS([-30,-40,-30],[20,30,-30]),...EARS(-56,-60),tail1:[0,-30,0]}},
  {t:0.78,p:{_hips:[0,-0.04,0],spine:[-4,0,0],head:[-16,0,0],legL:[10,0,6],legR:[-4,0,16],...ARMS([10,-30,-30],[-20,30,-30]),...EARS(-50,-50),tail1:[0,30,0]}},
  {t:0.9,p:{_hips:[0,-0.03,0],spine:[0,0,0],head:[-14,0,0],legL:[-10,0,6],legR:[10,0,-6],...EARS(-56,-56),tail1:[0,-20,0]}},
  {t:1.0,p:{_hips:[0,-0.02,0],head:[-10,0,0],...EARS(-50,-50)}},
]};

// F23 Zigzag turn kicks (each from a planted pivot paw; the page turns her through the turn): a hook kick, a spinning back kick; the tornado and the low sweep come from gTornadoS and gSweepLow; a skid and a toprock beat at the end
NEW.zHook={T:0.36,keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[16,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
  {t:0.08,p:{_hips:[0,-0.08,0],hips:[0,30,0],spine:[0,-14,0],head:[-6,10,0],legL:[-10,0,4],footL:[20,0,0],legR:[-86,0,-60],footR:[40,0,0],...ARMS([-40,-30,-30],[-20,40,-30]),...EARS(-20,-20)}},
  {t:0.16,ease:'out',p:{_hips:[0,-0.06,0],hips:[0,-30,0],spine:[-10,20,0],chest:[-6,10,0],head:[-6,-20,0],legL:[-10,0,4],footL:[20,0,0],legR:[-104,0,-6],footR:[-20,0,0],...ARMS([30,-40,-30],[-40,40,-30]),...EARS(-50,-56),tail1:[0,-30,0]}},
  {t:0.26,p:{_hips:[0,-0.1,0],spine:[16,0,0],head:[-10,0,0],legL:[-24,0,6],legR:[20,0,-6],...EARS(-20,-20)}},
  {t:0.36,p:{_hips:[0,-0.08,0],spine:[16,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
],fn:(t,T)=>tail(t,0.3,10)};
NEW.zBack={T:0.42,keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[16,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
  {t:0.1,p:{_hips:[0,-0.1,0],spine:[20,0,0],head:[-14,70,0],legL:[-14,0,6],legR:[-30,0,-6],footR:[30,0,0],...EARS(-10,-20)}},
  {t:0.19,ease:'out',p:{_hips:[0,-0.06,0],spine:[46,0,0],chest:[14,0,0],head:[-36,74,0],legL:[-14,0,6],footL:[20,0,0],legR:[90,0,-6],footR:[-34,0,0],...ARMS([-20,-50,-20],[10,40,-20]),...EARS(-50,-56),tail1:[0,-30,0]}},
  {t:0.28,p:{_hips:[0,-0.1,0],spine:[24,0,0],head:[-14,20,0],legL:[-20,0,6],legR:[10,0,-6],...EARS(-20,-20)}},
  {t:0.42,p:{_hips:[0,-0.08,0],spine:[16,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
],fn:(t,T)=>tail(t,0.3,10)};
NEW.zSkid={T:0.6,keys:[
  {t:0,p:{_hips:[0,-0.08,0],spine:[16,0,0],legL:[-20,0,6],legR:[20,0,-6]}},
  {t:0.08,p:add(SKI,{})},
  {t:0.26,p:add(SKI,{_hips:[0,0.02,0],spine:[14,0,0],...EARS(30,40)})},
  {t:0.34,p:{_hips:[0,-0.04,0],spine:[0,0,6],legL:[-30,0,10],footL:[20,0,0],legR:[10,0,-4],...ARMS([20,-30,-30],[-20,30,-30]),...EARS(-20,-10)}},
  {t:0.42,p:{_hips:[0,-0.09,0],spine:[6,0,0],legL:[-14,0,8],legR:[14,0,-8],...EARS(10,20)}},
  {t:0.5,p:{_hips:[0,-0.03,0],spine:[0,0,-6],legR:[-30,0,-10],footR:[20,0,0],legL:[10,0,4],...ARMS([-20,-30,-30],[20,30,-30]),...EARS(-20,-10)}},
  {t:0.6,p:{_hips:[0,-0.05,0],spine:[6,0,0],...EARS(-10,-10)}},
],fn:(t,T)=>({tail1:[0,16*Math.sin(t*Math.PI*2/0.16),0]})};

// F24 Sinkhole: a deep crouch, ears down, the launch straight up; she flips over at the top and drills down heel first, legs together and straight, arms tight (the page spins her twice); impact (0.5); she spins three times on her right paw in a low crouch in the pit (page); a back handspring out to the rim, lands low facing the pit
const SDRILL={spine:[0,0,0],chest:[0,0,0],head:[6,0,0],legL:[0,0,1],footL:[60,0,0],legR:[0,0,-1],footR:[60,0,0],...ARMS([-6,6,-120],[-6,-6,-120]),...EARS(-60,-66),tail1:[0,0,0]};
const PIT={...CROUCH,_hips:[0,-0.2,-0.02],spine:[30,0,0],head:[-20,0,0],legR:[-40,0,-6],footR:[40,0,0],legL:[-16,0,46],footL:[30,0,0],...ARMS([20,-40,-20],[10,50,-20]),...EARS(-40,-50),tail1:[0,-20,0]};
NEW.gSink={T:1.62,air:[[0.27,0.5],[1.06,1.27]],keys:[
  {t:0,p:{}},
  {t:0.2,p:{...CROUCH,_hips:[0,-0.2,-0.02],spine:[40,0,0],head:[-30,0,0],...ARMS([30,-20,-20],[30,20,-20]),...EARS(50,60)}},
  {t:0.27,ease:'out',p:{spine:[-6,0,0],head:[-20,0,0],legL:[2,0,3],legR:[2,0,-3],footL:[60,0,0],footR:[60,0,0],...ARMS([-170,-10,0],[-170,10,0]),...EARS(-60,-66),tail1:[20,0,0]}},
  {t:0.33,p:{...TUCK,...ARMS([-80,-20,-60],[-80,20,-60])}},
  {t:0.38,p:SDRILL},
  {t:0.48,p:add(SDRILL,{head:[4,0,0]})},
  {t:0.52,ease:'in',p:{...LAND,_hips:[0,-0.22,0],spine:[40,0,0],head:[-20,0,0],...ARMS([40,-50,-20],[40,50,-20]),...EARS(60,70)}},
  {t:0.6,p:PIT},
  {t:1.0,p:add(PIT,{spine:[4,0,0]})},
  {t:1.06,ease:'out',p:{_hips:[0,-0.02,0],spine:[-30,0,0],chest:[-14,0,0],head:[30,0,0],legL:[-10,0,4],legR:[-6,0,-4],footL:[50,0,0],footR:[50,0,0],...ARMS([-170,-14,0],[-170,14,0]),...EARS(-40,-50),tail1:[20,0,0]}},
  {t:1.16,p:{spine:[-20,0,0],head:[30,0,0],legL:[-10,0,6],legR:[-14,0,-6],footL:[50,0,0],footR:[50,0,0],...ARMS([-172,-14,0],[-172,14,0]),...EARS(-30,-30)}},
  {t:1.28,ease:'in',p:{...LAND,_hips:[0,-0.19,0],spine:[36,0,0],head:[-26,0,0],...ARMS([40,-30,-20],[-40,40,-20])}},
  {t:1.62,p:{...CROUCH,_hips:[0,-0.18,0],spine:[34,0,0],head:[-30,0,0],...ARMS([30,-30,-20],[-40,40,-20]),...EARS(-20,-30)}},
]};
