__equip(['nova_bloom','swift_mend','guardian_bond','restorative_wave']);
__tp(0,0);__pa(1,0.7,0.2);__pa(2,-0.7,0.3);__pa(3,0,-0.8);
__hp(0,0.2);__hp(1,0.25);__hp(2,0.3);__hp(3,0.35);
await __move(innerWidth/2+180,innerHeight/2);
await __sleep(200);
const m=__mark();
for(let i=0;i<4;i++){__press('Digit'+(i+1));await __sleep(120);}
await __sleep(600);
const ev=__since(m,['heal','skill_cast']).map(e=>`${e.type}|${e.skill??''}|${e.target??''}|${e.amount??''}|${e.crit??''}|${(e.targets||[]).join(',')}`);
return {seed:__echoes.seed,rngDraws:__echoes.state().rngDraws,ev};
