const out={};
const shot=async(label,setup)=>{__equip(['nova_bloom']);__tp(0,0);setup();
  const before=__party();const m0=__mark();__press('Digit1');await __sleep(250);
  out[label]={before:before.map(p=>({id:p.id,f:p.f,d:__r(Math.hypot(p.x,p.z))}),0),
    evs:__since(m0,['skill_cast','heal']).map(e=>({t:e.type,tg:e.target,tgs:e.targets,a:e.amount,c:e.crit})),
    slots:__slots().map(s=>s&&{id:s.id,tot:s.totalTicks,rem:s.remainingTicks})};};
// A: 3 allies inside 1.4 + self => 4 candidates, cap 3, nearest-first
await shot('A_cap3',()=>{__pa(1,0.5,0);__pa(2,0,0.8);__pa(3,-1.1,0);__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);});
// B: radius boundary — ally at 1.35 in, others far out
await shot('B_in135',()=>{__pa(1,1.35,0);__pa(2,5,0);__pa(3,-5,0);__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);});
// C: ally at 1.45 out
await shot('C_out145',()=>{__pa(1,1.45,0);__pa(2,5,0);__pa(3,-5,0);__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);});
return out;
