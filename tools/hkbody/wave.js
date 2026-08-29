const out={};
const D=Math.PI/180;
const shot=async(label,setup)=>{__equip(['restorative_wave']);__tp(0,0);setup();
  const a=await __aim(2.5,0);
  const before=__party();const m0=__mark();__press('Digit1');await __sleep(250);
  out[label]={aim:a.ok,before:before.map(p=>({id:p.id,d:__r(Math.hypot(p.x,p.z)),ang:__r(Math.atan2(p.z,p.x)/D)})),
    evs:__since(m0,['skill_cast','heal']).map(e=>({t:e.type,tg:e.target,tgs:e.targets,a:e.amount})),
    slots:__slots().map(s=>s&&{tot:s.totalTicks})};};
// A: 50 deg (in) vs 60 deg (out) at r=0.9, plus one straight ahead at 0.5
await shot('A_angle',()=>{__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);
  __pa(1,__r(0.9*Math.cos(50*D)),__r(0.9*Math.sin(50*D)));
  __pa(2,__r(0.9*Math.cos(60*D)),__r(0.9*Math.sin(60*D)));
  __pa(3,0.5,0);});
// B: reach 1.05 (in) vs 1.15 (out) straight ahead
await shot('B_reach',()=>{__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);
  __pa(1,1.05,0);__pa(2,1.15,0);__pa(3,-3,0);});
// C: behind the aim (180 deg) must be excluded
await shot('C_behind',()=>{__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);
  __pa(1,-0.6,0);__pa(2,-0.8,0.2);__pa(3,0.6,0);});
return out;
