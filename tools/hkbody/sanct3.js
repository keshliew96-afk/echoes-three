const out={};
const run=async(label,off)=>{
  __equip(['sanctuary']);__tp(0,0);__pa(1,-5,-5);__pa(2,-5,5);__pa(3,5,-5);
  await __move(innerWidth/2,innerHeight/2);
  const m0=__mark();__press('Digit1');await __sleep(150);
  const z=__echoes.state().zones[0];
  if(!z) return out[label]={err:'no zone'};
  __hp(0,0.2); const tp=__tp(z.x+off,z.z);
  await __sleep(4500);
  out[label]={zone:{x:z.x,z:z.z,r:z.radius},player:tp,dist:__r(Math.hypot(tp.x-z.x,tp.z-z.z)),
    heals:__since(m0,['heal']).map(e=>e.amount),ticks:__since(m0,['zone_tick']).map(e=>e.healed.length)};
};
await run('in_0p95',0.95);
await run('out_1p06',1.06);
return out;
