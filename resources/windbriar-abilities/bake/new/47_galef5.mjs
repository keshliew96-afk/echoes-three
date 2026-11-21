// ---------------------------------------------------------------- Gale F5 Foot pin, redesigned (Kesh 19 Nov 13:40 SGT "Rapid Fire: Gale: redesign")
// 枪斗术 gun-kata standing over the pinned foot: her right hind paw stays on its foot; fourteen point-blank hip shots, one every 0.12 s, each from a new body line:
// shots 1-3 twisting left-right with the bow flat at the hip; 4-5 leaning back under its chin; 6-8 while the free leg snaps a kick into its chest;
// 9-11 through a pivot on the pinned paw (the page turns her once); 12-14 nose to nose; then a push kick off its chest frees the pin
const PK=[{t:0,d:0,a:0,h:0}];for(let k=0;k<14;k++){const b=0.07+k*0.12;PK.push({t:b-0.06,d:0.1,a:1,h:1},{t:b-0.012,d:0.42,a:1,h:1},{t:b,d:-0.07,a:0,h:1,ease:'lin'},{t:b+0.03,d:0.04,a:1,h:1});}PK.push({t:1.72,d:0,a:0,h:0});
const HIPT=(yaw,k=0.2)=>turnP(HIPP(k),[0,1,0],yaw), CHIN=(k=0.2)=>moveP(AIMD(-34,k,[0,0,0]),[0,-0.02,0.04]), NOSE=(k=0.2)=>moveP(LEVEL(k),[0,0.0,0.02]);
const PST={_hips:[0,-0.06,0],spine:[8,0,0],legR:[-16,0,-4],footR:[20,0,0],legL:[12,0,6],tail1:[-6,0,0]};
NEW.gPinKata={T:1.9,air:[[0.64,0.84],[1.74,1.9]],draw:{keys:PK},
  offHand:{from:-0.2,to:1.74,fade:0.05,keys:[{t:0,p:[0.02,-0.06,0.12],b:'chest'},{t:1.72,p:[0.02,-0.06,0.12],b:'chest'}]},
  staffPose:{from:-0.1,to:1.9,fade:0.06,keys:[{t:0,...HIPT(30)},{t:0.07,...HIPT(30)},{t:0.13,...HIPT(-30)},{t:0.19,...HIPT(-30)},{t:0.25,...HIPT(28)},{t:0.33,...HIPT(28)},
    {t:0.4,...CHIN()},{t:0.6,...CHIN()},{t:0.66,...HIPT(0)},{t:0.92,...HIPT(0)},{t:0.98,...HIPT(-20)},{t:1.32,...HIPT(-20)},{t:1.37,...NOSE()},{t:1.72,...NOSE()},{t:1.8,...moveP(BEHIND,[0,0.02,-0.16])},{t:1.9,...moveP(BEHIND,[0,0.02,-0.16])}]},
  keys:[{t:0,p:PST},
    {t:0.07,p:add(PST,{hips:[0,30,0],spine:[0,24,0],head:[0,-46,0],...EARS(-20,-10)})},{t:0.19,p:add(PST,{hips:[0,-30,0],spine:[0,-24,0],head:[0,46,0],...EARS(-10,-20)})},
    {t:0.31,p:add(PST,{hips:[0,26,0],spine:[0,20,0],head:[0,-40,0],...EARS(-20,-10)})},
    {t:0.43,p:add(PST,{_hips:[0,-0.04,-0.04],spine:[-30,0,0],chest:[-12,0,0],head:[6,0,0],...EARS(-50,-56),tail1:[20,0,0]})},{t:0.58,p:add(PST,{_hips:[0,-0.05,-0.05],spine:[-34,0,0],chest:[-14,0,0],head:[8,0,0],...EARS(-56,-60),tail1:[20,0,0]})},
    {t:0.66,p:add(PST,{spine:[-10,0,0],legL:[-40,0,0],footL:[30,0,0]})},{t:0.72,ease:'out',p:add(PST,{spine:[-34,0,0],chest:[-10,0,0],head:[10,0,0],legL:[-158,0,-6],footL:[-40,0,0],_hips:[0,-0.02,-0.06],...EARS(-40,-40),tail1:[30,0,0]})},
    {t:0.82,p:add(PST,{spine:[-4,0,0],legL:[-40,0,6],footL:[30,0,0]})},{t:0.92,p:add(PST,{spine:[6,-10,0],head:[0,10,0]})},
    {t:1.0,p:add(PST,{_hips:[0,0.02,0],spine:[0,-14,0],legL:[-30,0,10],footL:[40,0,0],footR:[50,0,0],...EARS(-40,-30),tail1:[0,30,0]})},{t:1.3,p:add(PST,{_hips:[0,0.02,0],spine:[0,-14,0],legL:[-30,0,10],footL:[40,0,0],footR:[50,0,0],...EARS(-40,-30)})},
    {t:1.38,p:add(PST,{_hips:[0,-0.03,0.04],spine:[14,0,0],chest:[6,0,0],head:[-14,0,0],...EARS(20,24)})},{t:1.7,p:add(PST,{_hips:[0,-0.04,0.05],spine:[16,0,0],chest:[6,0,0],head:[-16,0,0],...EARS(24,28)})},
    {t:1.76,p:add(PST,{spine:[10,0,0],legL:[-60,0,4],footL:[20,0,0]})},{t:1.82,ease:'out',p:add(PST,{spine:[-14,0,0],head:[-6,0,0],legL:[-96,0,4],footL:[60,0,0],...EARS(-40,-40)})},{t:1.9,p:add(PST,{spine:[-20,0,0],legL:[-70,0,4]})}],
  fn:(t,T)=>{const j=Math.max(0,1-((t-0.07)%0.12)/0.05)*(t<1.75?1:0);return {spine:[-2*j,0,0],...tail(t,0.24,8)};}};
// ---------------------------------------------------------------- Gale F5 v3 (Kesh 19 Nov 14:09 SGT): a kick chain. gFrontKick: a hard front push kick (teep), the right sole driven straight through (0.16), held, back down
NEW.gFrontKick={T:0.55,air:[[0.05,0.34]],keys:[
  {t:0,p:{_hips:[0,-0.05,0],spine:[6,0,0],legL:[-14,0,4],legR:[12,0,-4]}},
  {t:0.08,p:{_hips:[0,-0.04,0],spine:[0,0,0],head:[-6,0,0],legL:[-6,0,4],footL:[20,0,0],legR:[-80,0,-4],footR:[40,0,0],...EARS(-30,-30),tail1:[10,0,0]}},
  {t:0.16,ease:'out',p:{_hips:[0,-0.02,-0.06],spine:[-22,0,0],chest:[-8,0,0],head:[6,0,0],legL:[0,0,4],footL:[20,0,0],legR:[-104,0,-4],footR:[-36,0,0],...ARMS([20,-40,-20],[10,40,-20]),...EARS(-56,-60),tail1:[30,0,0]}},
  {t:0.26,p:{_hips:[0,-0.03,-0.05],spine:[-18,0,0],chest:[-6,0,0],legL:[0,0,4],footL:[20,0,0],legR:[-96,0,-4],footR:[-30,0,0],...EARS(-40,-40)}},
  {t:0.36,ease:'in',p:{...LAND,_hips:[0,-0.1,0],spine:[16,0,0]}},{t:0.55,p:{_hips:[0,-0.04,0],spine:[6,0,0],...EARS(-10,-6)}}]};
// Shadow kicks, 4th kick (Kesh 19 Nov 14:55 SGT: kick higher, kick to air): a flash kick. She springs off both paws, the right leg whips straight up
// under the foe (contact 0.2) and keeps driving up as the page turns her through a backflip; the other leg trails within 90°; tuck, open, land at 0.62.
NEW.gFlash={T:0.95,air:[[0.1,0.62]],keys:[
  {t:0,p:{}},
  {t:0.08,p:{...CROUCH,_hips:[0,-0.16,0],spine:[22,0,0],head:[-14,0,0],...EARS(30,26),...ARMS([30,20,-10],[30,-20,-10])}},
  {t:0.14,ease:'out',p:{spine:[-8,0,0],head:[6,0,0],...LEGS([6,4],[-50,4],40,30),...EARS(-40,-34),...ARMS([-20,-40,-10],[-20,40,-10])}},
  {t:0.2,ease:'out',p:{spine:[-20,0,0],chest:[-8,0,0],head:[22,0,0],...LEGS([-4,4],[-94,4],50,-26),...EARS(-58,-50),...ARMS([40,-50,-10],[30,40,-10]),tail1:[30,0,0]}},
  {t:0.28,p:{spine:[-22,0,0],chest:[-8,0,0],head:[24,0,0],...LEGS([-10,4],[-100,4],50,-30),...EARS(-40,-50),...ARMS([44,-54,-10],[34,44,-10]),tail1:[26,0,0]}},
  {t:0.38,p:{...TUCK,...EARS(20,20)}},
  {t:0.52,p:{spine:[10,0,0],head:[-10,0,0],...LEGS([-30,6],[-26,6],30,30),...EARS(-10,-10),...ARMS([10,-30,-10],[10,30,-10])}},
  {t:0.62,ease:'in',p:{...LAND}},
  {t:0.78,p:{_hips:[0,-0.05,0],spine:[10,0,0],head:[-6,0,0],legL:[-12,0,6],legR:[10,0,-6],...EARS(-12,-8)}},
  {t:0.95,p:{}}],fn:(t,T)=>tail(t,0.95,8)};
