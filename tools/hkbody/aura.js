const out={};
__equip(['warding_aura']);__tp(0,0);
out.slots=__slots();
// press the passive slot: must deny, never cast
{const m0=__mark();__press('Digit1');await __sleep(200);
 out.press=__since(m0,['skill_cast','intent_denied','heal']).map(e=>({t:e.type,k:e.kind,r:e.reason}));
 out.slotsAfterPress=__slots();}
// in-field pulse: ally at 0.80, others far
__equip(['warding_aura']);__pa(1,0.80,0);__pa(2,-6,-6);__pa(3,6,-6);__hp(1,0.2);__hp(2,0.2);__hp(3,0.2);__hp(0,0.2);
{const m0=__mark();const samples=[];
 for(let i=0;i<70;i++){await __sleep(50);const p=__party();samples.push({t:__tick(),d1:__r(Math.hypot(p[1].x,p[1].z))});}
 out.inField={pulses:__since(m0,['aura_pulse']).map(e=>({tick:e.tick,healed:e.healed})),
   heals:__since(m0,['heal']).map(e=>({tg:e.target,a:e.amount,src:e.source})),
   dists:samples.filter((s,i)=>i%10===0)};}
// out-of-field: ally pinned at 1.05 every 40ms
__equip(['warding_aura']);__hp(1,0.2);
{const m0=__mark();
 for(let i=0;i<90;i++){__pa(1,1.05,0);await __sleep(40);}
 out.outField={pulses:__since(m0,['aura_pulse']).map(e=>({tick:e.tick,healed:e.healed})),
   heals:__since(m0,['heal']).length};}
return out;
