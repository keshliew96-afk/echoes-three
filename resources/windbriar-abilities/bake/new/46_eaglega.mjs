// ---------------------------------------------------------------- Eagle Stance, Gale (Kesh 19 Nov 11:25 SGT: redesign; a stance holds between shots)
// A b-boy get-down stance: low crouch, the draw paw planted on the floor, the bow held low in front. It never stands up between beats.
// Each beat (0.62 s): a kick out from the planted paw (the dragged foe flies out through the pack), the paw comes up and fires one stance shot,
// then a small hop-turn on the spot (the page turns her 60°) and the paw plants again. Every beat starts and ends on the same pose.
const GD={_hips:[0,-0.24,-0.08],spine:[70,0,0],chest:[14,0,0],head:[-52,0,0],legL:[-46,0,10],footL:[50,0,0],legR:[-8,0,-10],footR:[56,0,0],...EARS(-24,-28),tail1:[-12,0,0]};
const GDS=add(GD,{spine:[-8,0,0],head:[6,0,0],...EARS(-10,-10)});
const GDB=(k=0)=>moveP(LEVEL(k),[0,-0.17,0.06]);
const PLANT=[-0.2,0.06,0.28];
const gBeat=(kick,dir)=>{const s=seq([shot(0.18,0.24,0.31,0.34,0.8)]);return {T:0.62,air:[[0,0.62]],draw:{keys:s.draw},
  offHand:{from:-0.1,to:0.75,fade:0.001,keys:[{t:0,p:PLANT},{t:0.15,p:PLANT},...s.off.slice(1),{t:0.5,p:[-0.24,0.2,0.3]},{t:0.57,p:PLANT,ease:'in'},{t:0.62,p:PLANT}]},
  staffPose:{from:-0.1,to:0.75,fade:0.001,keys:[{t:0,...GDB(0.3)},{t:0.16,...GDB(0.3)},{t:0.24,...GDB(0.5)},{t:0.31,...GDB(0)},{t:0.34,...GDB(0)},{t:0.37,...moveP(GDB(-0.5),[0,0.015,0]),ease:'in'},{t:0.48,...GDB(0.2)},{t:0.62,...GDB(0.3)}]},
  keys:[{t:0,p:GD},...kick,{t:0.22,p:GDS},{t:0.34,p:GDS},{t:0.37,ease:'in',p:add(GDS,{spine:[-4,0,0],_hips:[0,0,-0.02],...EARS(16,16)})},{t:0.46,p:GD},
    {t:0.52,p:add(GD,{_hips:[0,0.03,0],legL:[-8,0,0],legR:[-8,0,0],footL:[16,0,0],footR:[16,0,0]})},{t:0.62,p:GD}],
  fn:(t,T)=>tail(t,0.62,8)};};
// beat 1: a snap kick to her front-right with the right leg
NEW.gEagleK1=gBeat([{t:0.04,p:add(GD,{legR:[-60,0,-6],footR:[30,0,0],spine:[-6,0,0]})},{t:0.09,ease:'out',p:add(GD,{hips:[0,-16,0],spine:[-12,0,0],legR:[-80,0,-16],footR:[-34,0,0],...EARS(-20,-20)})},{t:0.14,p:add(GD,{hips:[0,-12,0],spine:[-10,0,0],legR:[-60,0,-8],footR:[0,0,0]})}]);
// beat 2: a mule kick, both hind legs thrust out behind together, weight onto the planted paw
NEW.gEagleK2=gBeat([{t:0.04,p:add(GD,{spine:[16,0,0],_hips:[0,0.02,0],legL:[-20,0,0],legR:[-60,0,0],footL:[20,0,0],footR:[20,0,0]})},{t:0.09,ease:'out',p:add(GD,{spine:[30,0,0],chest:[6,0,0],head:[14,0,0],_hips:[0,0.1,0.06],legL:[96,0,-6],legR:[124,0,6],footL:[-20,0,0],footR:[-20,0,0],tail1:[30,0,0],...EARS(30,30)})},{t:0.15,p:add(GD,{spine:[16,0,0],_hips:[0,0.04,0.02],legL:[60,0,-6],legR:[80,0,6]})}]);
// beat 3: a side kick out to her right, the leg flat and the hips rolled up over the planted paw
NEW.gEagleK3=gBeat([{t:0.04,p:add(GD,{hips:[0,-40,0],spine:[-10,30,0],head:[0,-20,0],_hips:[0,0.02,0],legL:[-60,0,-6],legR:[-80,0,6],footL:[30,0,0],footR:[30,0,0]})},{t:0.09,ease:'out',p:add(GD,{hips:[0,-70,0],spine:[-30,50,0],chest:[-6,10,0],head:[10,-40,0],_hips:[0,0.06,0.04],legL:[-50,0,-12],legR:[-58,0,-4],footL:[-30,0,0],footR:[-30,0,0],...EARS(-20,-30)})},{t:0.15,p:add(GD,{hips:[0,-40,0],spine:[-16,30,0],head:[4,-24,0],legL:[-40,0,-8],legR:[-50,0,0]})}]);
// beat 4: a back flick with the left leg out behind her left, her head turned to watch it
NEW.gEagleK4=gBeat([{t:0.04,p:add(GD,{legL:[20,0,10],footL:[20,0,0],head:[0,-20,0]})},{t:0.09,ease:'out',p:add(GD,{hips:[0,24,0],spine:[10,26,0],head:[0,-50,0],legL:[120,0,24],footL:[-20,0,0],_hips:[0,0.06,0.04],tail1:[0,-30,0],...EARS(20,10)})},{t:0.15,p:add(GD,{hips:[0,14,0],spine:[6,16,0],head:[0,-30,0],legL:[70,0,20]})}]);
// the drop in: a toprock step, then a spin down (the page turns her once) into the get-down, paw planted at 0.5
NEW.gEagleIn={T:0.6,air:[[0.18,0.6]],offHand:{from:0.3,to:0.75,fade:0.1,keys:[{t:0.3,p:[-0.3,0.3,0.25]},{t:0.5,p:PLANT,ease:'in'},{t:0.6,p:PLANT}]},
  staffPose:{from:0,to:0.75,fade:0.05,keys:[{t:0,...CARRY},{t:0.3,...moveP(LEVEL(0.3),[0,-0.06,0.02])},{t:0.5,...GDB(0.3)},{t:0.6,...GDB(0.3)}]},keys:[
  {t:0,p:{}},{t:0.1,p:{_hips:[0,-0.03,0],hips:[0,0,0],spine:[6,0,0],legL:[-40,0,-14],footL:[30,0,0],legR:[6,0,-4],...EARS(-10,-10)}},
  {t:0.2,p:{_hips:[0,-0.06,0],spine:[10,0,0],legL:[-14,0,6],legR:[-24,0,-6],footR:[30,0,0],...EARS(-30,-30)}},
  {t:0.36,p:add(GD,{_hips:[0,0.12,0.03],spine:[-14,0,0],legL:[20,0,0],legR:[20,0,0]})},{t:0.5,ease:'in',p:add(GD,{_hips:[0,-0.02,0],...EARS(20,20)})},{t:0.6,p:GD}]};
// the way out: a push off the planted paw up onto her feet, the bow swung onto her shoulder
NEW.gEagleOut={T:0.8,air:[[0,0.4]],offHand:{from:-0.1,to:0.5,fade:0.1,keys:[{t:0,p:PLANT},{t:0.1,p:PLANT},{t:0.3,p:[-0.24,0.4,0.1]}]},
  staffPose:{from:-0.1,to:0.8,fade:0.05,keys:[{t:0,...GDB(0.3)},{t:0.12,...GDB(0.3)},{t:0.45,...SHOULDER},{t:0.8,...SHOULDER}]},keys:[
  {t:0,p:GD},{t:0.1,p:add(GD,{_hips:[0,-0.03,0],spine:[10,0,0]})},{t:0.22,ease:'out',p:{_hips:[0,0.06,0],spine:[-8,0,0],head:[-6,0,0],legL:[-6,0,4],legR:[-6,0,-4],footL:[40,0,0],footR:[40,0,0],...EARS(-40,-40)}},
  {t:0.42,ease:'in',p:{...LAND,_hips:[0,-0.08,0],spine:[12,0,0]}},{t:0.8,p:{}}]};
// ---------------------------------------------------------------- Eagle Stance Gale v2 (Kesh 19 Nov 12:41 SGT): leap, dive and slam; the slam leaves a wind well that stays put
// gSlam: crouch, spring up into a tuck (the page carries her forward and turns her through a front flip), the dive opens heel-first with the bow up behind,
// she slams into a superhero landing (one fist and one knee down) at 0.72, holds it, and rises ready to run at 1.2
NEW.gSlam={T:1.25,air:[[0.12,1.25]],
  staffPose:{from:0,to:1.25,fade:0.05,keys:[{t:0,...CARRY},{t:0.3,...BEHIND},{t:0.6,...BEHIND},{t:0.72,...moveP(BEHIND,[0,-0.04,0])},{t:1.05,...moveP(BEHIND,[0,-0.04,0])},{t:1.25,...CARRY}]},
  offHand:{from:0.5,to:1.15,fade:0.06,keys:[{t:0.5,p:[-0.2,0.5,0.5]},{t:0.72,p:[-0.16,0.03,0.3],ease:'in'},{t:1.0,p:[-0.16,0.03,0.3]},{t:1.15,p:[-0.2,0.3,0.2]}]},
  keys:[{t:0,p:{}},{t:0.1,p:{...CROUCH,_hips:[0,-0.16,0]}},
  {t:0.18,ease:'out',p:{spine:[-10,0,0],head:[-24,0,0],legL:[8,0,3],legR:[8,0,-3],footL:[50,0,0],footR:[50,0,0],...EARS(-56,-60),tail1:[20,0,0]}},
  {t:0.32,p:{...TUCK,...EARS(20,20)}},{t:0.52,p:{...TUCK,...EARS(20,20)}},
  {t:0.64,ease:'out',p:{spine:[-18,0,0],chest:[-6,0,0],head:[-14,0,0],legL:[-44,0,3],legR:[-38,0,-3],footL:[-20,0,0],footR:[-20,0,0],...EARS(-60,-60),tail1:[30,0,0]}},
  {t:0.72,ease:'in',p:{...HERO,_hips:[0,-0.24,0.02],spine:[46,0,0],...EARS(40,46)}},
  {t:0.8,p:{...HERO,_hips:[0,-0.22,0.0],spine:[40,0,0],head:[-46,0,0],...EARS(10,20)}},{t:1.02,p:{...HERO,head:[-44,0,0],...EARS(-20,-24)}},
  {t:1.25,p:{_hips:[0,-0.04,0],spine:[10,0,0],head:[-6,0,0],...EARS(-10,-6)}}]};
