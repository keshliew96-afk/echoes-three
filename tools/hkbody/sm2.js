const out={};
const fire=async(label,setup)=>{__equip(['swift_mend']);__tp(0,0);setup();
  const before=__party();const m0=__mark();__press('Digit1');await __sleep(250);
  out[label]={before,after:__party(),evs:__since(m0,['skill_cast','heal'])};};
// C2: lowest ally far OUT of range 3.2 -> fall through to next lowest in range
await fire('C2',()=>{__pa(1,5.0,0);__pa(2,1.0,0);__pa(3,-1.0,0);__hp(0,0.9);__hp(1,0.1);__hp(2,0.3);__hp(3,0.6);});
// C3: caster is lowest but everyone out of range -> self exempt from range test
await fire('C3',()=>{__pa(1,5.0,0);__pa(2,5.0,1.0);__pa(3,-5.0,0);__hp(0,0.2);__hp(1,0.9);__hp(2,0.9);__hp(3,0.9);});
// C4: all allies out of range and healthier than nobody: caster full, allies far & low -> only self eligible
await fire('C4',()=>{__pa(1,5.0,0);__pa(2,5.0,1.0);__pa(3,-5.0,0);__hp(0,1.0);__hp(1,0.1);__hp(2,0.1);__hp(3,0.1);});
return out;
