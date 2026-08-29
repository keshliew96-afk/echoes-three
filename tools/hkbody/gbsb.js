const out={};
// ---- Guardian Bond: bottom-2 by HP fraction inside 3.4
const gb=async(label,setup)=>{__equip(['guardian_bond']);__tp(0,0);setup();
  const before=__party();const m0=__mark();__press('Digit1');await __sleep(220);
  out[label]={before:before.map(p=>({id:p.id,f:p.f,d:__r(Math.hypot(p.x,p.z))})),
    evs:__since(m0,['heal','skill_cast']).map(e=>({t:e.type,tg:e.target,tgs:e.targets,a:e.amount,o:e.override})),
    tot:__slots()[0].totalTicks};};
await gb('A_bottom2',()=>{__hp(0,0.9);__hp(1,0.3);__hp(2,0.5);__hp(3,0.2);__pa(1,1,0);__pa(2,0,1);__pa(3,-1,0);});
await gb('B_out_of_range',()=>{__hp(0,0.9);__hp(1,0.3);__hp(2,0.5);__hp(3,0.2);__pa(1,1,0);__pa(2,0,1);__pa(3,-5,0);});
// C: forced override + N-1 remaining, forced recipient excluded from the rest
__equip(['guardian_bond']);__tp(0,0);__hp(0,0.9);__hp(1,0.3);__hp(2,0.5);__hp(3,0.2);__pa(1,1,0);__pa(2,0,1);__pa(3,-1,0);
__echoes.cmd('healOverride',2); // force swordsman (party_index 2, f=0.5)
{const before=__party();const m0=__mark();__press('Digit1');await __sleep(220);
 out.C_forced={before:before.map(p=>({id:p.id,f:p.f})),evs:__since(m0,['heal','skill_cast']).map(e=>({t:e.type,tg:e.target,tgs:e.targets,a:e.amount,o:e.override}))};}
// ---- Spirit Bolt: damage 18, range 4.8, speed 5.0, cd 4 s
__equip(['spirit_bolt']);__tp(0,0);__pa(1,-5,-5);__pa(2,-5,5);__pa(3,5,-5);
const did=__echoes.cmd('spawn','dummy',3.0,0);
const a=await __aim(2.5,0);
{const m0=__mark();__press('Digit1');
 const samp=[];for(let i=0;i<100;i++){const st=__echoes.state();const b=st.skillBolts[0];if(b)samp.push({t:st.tick,x:__r(b.x),z:__r(b.z)});await __sleep(8);if(samp.length&&!__echoes.state().skillBolts.length)break;}
 let sp=null;if(samp.length>2){const p=samp[0],q=samp[samp.length-1];sp=__r(Math.hypot(q.x-p.x,q.z-p.z)/(q.t-p.t)*60);}
 out.SB={aim:a.ok,did,evs:__since(m0,['skill_bolt_spawn','skill_bolt_despawn','hit','skill_cast']).filter(e=>!e.skill||e.skill==='spirit_bolt').map(e=>({t:e.type,a:e.amount,tv:e.traveled,c:e.cause,src:e.source})),speed:sp,tot:__slots()[0].totalTicks};}
// SB range: no target in path
__equip(['spirit_bolt']);__echoes.cmd('killAllEnemies');await __sleep(200);
{const m0=__mark();__press('Digit1');await __sleep(1600);
 out.SB_range=__since(m0,['skill_bolt_despawn']).filter(e=>e.skill==='spirit_bolt').map(e=>({c:e.cause,tv:e.traveled}));}
return out;
