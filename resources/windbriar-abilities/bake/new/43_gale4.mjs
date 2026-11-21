// ---------------------------------------------------------------- the spec's "Also on the Gale side": six-step under the basic's hip shots, the Arrow ring thrown by a butterfly twist
// basic beat 4: the two hip shots over a crouched six-step shuffle (the legs step round under her; the bow stays at her hip)
NEW.gHipSix={...NEW.gHip,T:0.64,loop:false,draw:{keys:[...NEW.gHip.draw.keys,...NEW.gHip.draw.keys.slice(1).map(k=>({...k,t:k.t+0.32}))]},
  staffPose:{...NEW.gHip.staffPose,to:0.95,keys:[...NEW.gHip.staffPose.keys,...NEW.gHip.staffPose.keys.slice(1).map(k=>({...k,t:k.t+0.32}))]},offHand:{...NEW.gHip.offHand,to:0.95},
  keys:[0,1,2,3,4,5,6].map((k)=>{const j=k%6,h=NEW.gHip.keys[k%2?1:0].p;return {t:+(k*0.64/6).toFixed(4),p:{...h,_hips:[0,-0.13,0.02],spine:[h.spine[0]+14,h.spine[1],0],legL:[SIXL[j][0],0,SIXL[j][1]],footL:[SIXL[j][2],0,0],legR:[SIXL[j][3]+(k%2?-20:10),0,-8],footR:[30,0,0],tail1:[0,k%2?20:-20,0]}};}),fn:(t,T)=>({hips:[0,14*Math.sin(2*Math.PI*t/0.213),0]})};
// the Gale Arrow ring: a wind-up crouch, a butterfly twist (the page lays her flat and turns her once), both legs whipping round level; the ring leaves her leg at the flat point (0.3)
NEW.gButterfly={T:0.62,air:[[0.16,0.46]],keys:[
  {t:0,p:{}},
  {t:0.1,p:{...CROUCH,_hips:[0,-0.15,0],spine:[30,30,0],chest:[8,20,0],head:[-20,-30,0],...ARMS([-30,-70,-20],[20,40,-20]),...EARS(20,20),tail1:[0,30,0]}},
  {t:0.16,ease:'out',p:{spine:[10,-20,0],head:[-20,20,0],legL:[-30,0,6],legR:[20,0,-6],footL:[50,0,0],footR:[50,0,0],...ARMS([-90,-90,0],[-90,90,0]),...EARS(-50,-56),tail1:[0,-30,0]}},
  {t:0.24,p:{spine:[4,0,0],head:[-24,0,0],legL:[-44,0,8],legR:[40,0,-8],footL:[50,0,0],footR:[50,0,0],...ARMS([-90,-96,0],[-90,96,0]),...EARS(-60,-66),tail1:[0,30,0]}},
  {t:0.32,p:{spine:[4,0,0],head:[-24,0,0],legL:[40,0,8],legR:[-46,0,-8],footL:[50,0,0],footR:[50,0,0],...ARMS([-90,-96,0],[-90,96,0]),...EARS(-60,-66),tail1:[0,-30,0]}},
  {t:0.4,p:{spine:[14,0,0],head:[-16,0,0],legL:[-30,0,8],legR:[-10,0,-8],footL:[30,0,0],footR:[30,0,0],...ARMS([-50,-60,-10],[-50,60,-10]),...EARS(-40,-46)}},
  {t:0.47,ease:'in',p:{...LAND,_hips:[0,-0.17,0]}},
  {t:0.62,p:{...CROUCH,_hips:[0,-0.1,0],spine:[16,0,0],head:[-10,0,0],...EARS(-10,-10)}},
]};
