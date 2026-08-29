__equip(['mending_bolt']);
__tp(0,0);
__pa(1,3.0,0); __pa(2,-4.5,-4.5); __pa(3,4.5,-4.5);
__hp(1,0.2);
const aimres = await __aim(2.5,0);
const slotsBefore = __slots();
const m0 = __mark(); const t0=__tick();
const pos0 = __party();
__press('Digit1');
// sample bolt flight
const samples=[];
for(let i=0;i<120;i++){ const st=__echoes.state(); const b=st.skillBolts[0];
  if(b) samples.push({t:st.tick,x:__r(b.x),z:__r(b.z)});
  await __sleep(8);
  if(samples.length>0 && !__echoes.state().skillBolts.length) break; }
const evs = __since(m0,['skill_cast','skill_bolt_spawn','skill_bolt_despawn','heal','full_heal','intent_denied']);
const slotsAfter = __slots();
let speed=null;
if(samples.length>2){const a=samples[0],b=samples[samples.length-1];const d=Math.hypot(b.x-a.x,b.z-a.z);const dt=b.t-a.t;speed=__r(d/dt*60);}
return {aimres:{ok:aimres.ok,aim:aimres.aim},pos0,slotsBefore,slotsAfter:slotsAfter,t0,evs,nSamples:samples.length,first:samples[0],last:samples[samples.length-1],speed,party:__party()};
