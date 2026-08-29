const out={};
const fire=async(label,setup)=>{__equip(['swift_mend']);__tp(0,0);setup();await __sleep(60);
  const before=__party();const m0=__mark();__press('Digit1');await __sleep(300);
  out[label]={before,evs:__since(m0,['skill_cast','heal','intent_denied']),slots:__slots()};};
// A: distinct fractions, lowest = ally2 (swordsman, 0.30)
await fire('A',()=>{__pa(1,1.0,0);__pa(2,0,1.0);__pa(3,-1.0,0);__hp(0,1.0);__hp(1,0.5);__hp(2,0.3);__hp(3,0.6);});
// B: all equal fraction 0.5 -> self (caster) first
await fire('B',()=>{__pa(1,1.0,0);__pa(2,0,1.0);__pa(3,-1.0,0);__hp(0,0.5);__hp(1,0.5);__hp(2,0.5);__hp(3,0.5);});
// C: lowest ally OUT of range 3.2 (at 3.35) -> picks next lowest in range
await fire('C',()=>{__pa(1,3.35,0);__pa(2,1.0,0);__pa(3,-1.0,0);__hp(0,0.9);__hp(1,0.1);__hp(2,0.3);__hp(3,0.6);});
// D: same but lowest ally just INSIDE range (3.10) -> picks it
await fire('D',()=>{__pa(1,3.10,0);__pa(2,1.0,0);__pa(3,-1.0,0);__hp(0,0.9);__hp(1,0.1);__hp(2,0.3);__hp(3,0.6);});
return out;
