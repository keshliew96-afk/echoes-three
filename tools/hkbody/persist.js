const out={};
__equip(['mending_bolt','nova_bloom','warding_aura','sanctuary']);__tp(0,0);
await __move(innerWidth/2,innerHeight/2);await __sleep(200);
__press('Digit1');await __sleep(60);__press('Digit2');await __sleep(400);
__echoes.cmd('healOverride',3);
const saved=__echoes.cmd('skillState');
out.saved=saved; out.slotsAtSave=__slots().map(s=>s&&{id:s.id,rem:s.remainingTicks,passive:s.passive});
out.ovrAtSave=__echoes.state().healOverride;
await __sleep(2500);
out.slotsAfterDrift=__slots().map(s=>s&&{id:s.id,rem:s.remainingTicks});
// wipe the loadout (simulating a scene/world rebuild), then restore
__echoes.cmd('restoreSkillState',{slots:[null,null,null,null],override:null});
out.slotsWiped=__slots();
out.ovrWiped=__echoes.state().healOverride;
const r=__echoes.cmd('restoreSkillState',saved);
out.restoreReturned=r;
out.slotsRestored=__slots().map(s=>s&&{id:s.id,rem:s.remainingTicks,tot:s.totalTicks,passive:s.passive});
out.ovrRestored=__echoes.state().healOverride;
// aura must resume pulsing after restore
{const m=__mark();await __sleep(2200);out.auraPulsesAfterRestore=__since(m,['aura_pulse']).length;}
// a restored cooldown must actually gate the fire
{const m=__mark();__press('Digit1');await __sleep(250);out.fireOnRestoredCd=__since(m,['skill_cast','intent_denied']).map(e=>e.type+':'+(e.reason||e.skill));}
return out;
