const out={};const D=Math.PI/180;
__tp(0,0);
const a=await __aim(2.5,0);   // aim once, up front
const shot=async(label,setup)=>{__equip(['restorative_wave']);__tp(0,0);setup();
  const before=__party();const m0=__mark();__press('Digit1');
  await __sleep(200);
  out[label]={before:before.map(p=>({id:p.id,d:__r(Math.hypot(p.x,p.z)),ang:__r(Math.atan2(p.z,p.x)/D)})),
    hits:__since(m0,['heal']).map(e=>e.target),amt:__since(m0,['heal']).map(e=>e.amount)};};
await shot('ang53_in',()=>{__hp(0,.5);__hp(1,.5);__hp(2,.5);__hp(3,.5);__pa(1,__r(0.9*Math.cos(53*D)),__r(0.9*Math.sin(53*D)));__pa(2,-5,0);__pa(3,-5,1);});
await shot('ang57_out',()=>{__hp(0,.5);__hp(1,.5);__hp(2,.5);__hp(3,.5);__pa(1,__r(0.9*Math.cos(57*D)),__r(0.9*Math.sin(57*D)));__pa(2,-5,0);__pa(3,-5,1);});
await shot('reach105_in',()=>{__hp(0,.5);__hp(1,.5);__hp(2,.5);__hp(3,.5);__pa(1,1.05,0);__pa(2,-5,0);__pa(3,-5,1);});
await shot('reach118_out',()=>{__hp(0,.5);__hp(1,.5);__hp(2,.5);__hp(3,.5);__pa(1,1.18,0);__pa(2,-5,0);__pa(3,-5,1);});
out.aimOk=a.ok; out.aim=a.aim;
return out;
