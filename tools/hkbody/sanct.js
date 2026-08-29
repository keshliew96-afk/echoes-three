const out={};
__tp(0,0);
// A: placement clamp — aim far beyond range 3.8
const aFar=await __aim(6.0,0);
__equip(['sanctuary']);__tp(0,0);
__pa(1,3.8,0);__pa(2,4.7,0);__pa(3,-5,0);
__hp(0,.5);__hp(1,.2);__hp(2,.2);__hp(3,.5);
let m0=__mark();__press('Digit1');await __sleep(120);
const spawnEv=__since(m0,['zone_spawn','skill_cast']).map(e=>({t:e.type,x:e.x,z:e.z,r:e.radius,zx:e.x}));
const zoneState=__echoes.state().zones;
const slotsA=__slots().map(s=>s&&{tot:s.totalTicks,rem:s.remainingTicks});
// watch the full lifetime
const t0=__tick();
await __sleep(5200);
const life=__since(m0,['zone_tick','zone_expire','heal']).map(e=>({t:e.type,tick:e.tick,n:e.n,tg:e.target,a:e.amount,healed:e.healed}));
out.A={aimFar:aFar.aim,spawnEv,zoneState,slotsA,t0,life,party:__party()};
return out;
