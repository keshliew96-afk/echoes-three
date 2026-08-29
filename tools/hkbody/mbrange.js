__equip(['mending_bolt']);
__tp(0,0);
__pa(1,-4.5,-4.5); __pa(2,-4.2,-4.5); __pa(3,-4.5,-4.2);
// dummy enemy directly in path at +x 2.0 to prove heal bolt passes enemies
const did = __echoes.cmd('spawn','dummy',2.0,0);
const aimres = await __aim(2.5,0);
const m0=__mark();
__press('Digit1');
await __sleep(1600);
const evs=__since(m0,['skill_bolt_spawn','skill_bolt_despawn','hit','heal','skill_cast']);
return {did,aim:aimres.aim,evs,dummy:__echoes.state().enemies};
