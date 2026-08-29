const out={};
// giveSkill contract
out.g0=__echoes.cmd('restoreSkillState',{slots:[null,null,null,null],override:null});
out.g1=__echoes.cmd('giveSkill','mending_bolt');
out.g2=__echoes.cmd('giveSkill','swift_mend');
out.g3=__echoes.cmd('giveSkill','warding_aura');
out.g3dup=__echoes.cmd('giveSkill','warding_aura');
out.g4=__echoes.cmd('giveSkill','spirit_bolt');
out.g5=__echoes.cmd('giveSkill','nova_bloom');
out.gbad=__echoes.cmd('giveSkill','not_a_skill');
out.slots=__slots().map(s=>s&&{id:s.id,passive:s.passive});
// aura on via giveSkill?
{const m=__mark();await __sleep(1300);out.auraPulseAfterGive=__since(m,['aura_pulse']).length;}
// aura radius boundary 0.87 in / 0.94 out (pinned ally)
__echoes.cmd('restoreSkillState',{slots:[{id:'warding_aura',remaining:0},null,null,null],override:null});
__tp(0,0);__pa(2,-7,6);__pa(3,-7,-6);
for (const [lab,d] of [['in_0p87',0.87],['out_0p94',0.94]]) {
  const m=__mark();
  for(let i=0;i<60;i++){__pa(1,d,0);await __sleep(35);}
  out[lab]={pulses:__since(m,['aura_pulse']).map(e=>e.healed.length),dist:__r(Math.hypot(__party()[1].x,__party()[1].z))};
}
return out;
