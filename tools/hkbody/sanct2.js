const out={};
const run=async(label,offset)=>{
  __equip(['sanctuary']);__tp(0,0);
  __pa(1,-5,-5);__pa(2,-5,5);__pa(3,5,-5);
  // aim exactly on the caster => zone placed at the caster
  await __move(innerWidth/2,innerHeight/2);
  const st=__echoes.state().party[0].aim;
  const m0=__mark();__press('Digit1');await __sleep(120);
  const z=__echoes.state().zones[0];
  __hp(0,0.2); __tp(offset,0);
  await __sleep(4600);
  out[label]={aim:st&&{x:__r(st.x),z:__r(st.z)},zone:z&&{x:z.x,z:z.z,r:z.radius},playerAt:offset,
    heals:__since(m0,['heal']).map(e=>({tg:e.target,a:e.amount,src:e.source})),
    ticks:__since(m0,['zone_tick']).map(e=>({n:e.n,healed:e.healed})),
    expire:__since(m0,['zone_expire']).length};
};
await run('inside_0.95',0.95);
await run('outside_1.06',1.06);
return out;
