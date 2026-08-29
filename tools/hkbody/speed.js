const out={};
const measure=async(id)=>{
  __equip([id]);__tp(0,0);__pa(1,-6,-6);__pa(2,-6,6);__pa(3,6,-6);
  __echoes.cmd('killAllEnemies');
  await __aim(2.5,0);
  const m0=__mark();__press('Digit1');
  const s=[];
  for(let i=0;i<160;i++){const st=__echoes.state();const b=st.skillBolts.find(b=>b.skill===id);
    if(b)s.push({t:st.tick,x:b.x,z:b.z});
    else if(s.length)break;
    await __sleep(6);}
  let sp=null,dt=null;
  if(s.length>3){const p=s[0],q=s[s.length-1];dt=q.t-p.t;sp=__r(Math.hypot(q.x-p.x,q.z-p.z)/dt*60);}
  return {id,n:s.length,dt,speed:sp,first:s[0],last:s[s.length-1],
    ev:__since(m0,['skill_bolt_spawn','skill_bolt_despawn']).filter(e=>e.skill===id).map(e=>({t:e.type,tick:e.tick,tv:e.traveled,c:e.cause}))};
};
out.mb=await measure('mending_bolt');
out.sb=await measure('spirit_bolt');
return out;
