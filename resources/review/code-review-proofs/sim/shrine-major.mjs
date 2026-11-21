const R='/home/claude/echoes-three/src/';
const {createRelicSystem}=await import(R+'sim/relics.js');
const {createRegistry}=await import(R+'core/registry.js');
const {createEventBus}=await import(R+'core/events.js');
const reg=createRegistry(); const bus=createEventBus(); let tick=0; const evs=[];
for(const t of ['curse_taken','curse_lift','curse_apply']) bus.on(t,e=>evs.push(t+' '+JSON.stringify(e)));
const player=reg.spawn({kind:'player',partyIndex:0,x:0,z:0,hp:100,maxHp:100});
const rs=createRelicSystem({registry:reg,events:bus,getTick:()=>tick,combat:{setMods(){},applyHeal(){}},skillSys:{serialize:()=>({slots:[]}),restore(){}},player});
rs.reset(1,true);
// path screen after room 2: the party takes a door carrying the MAJOR curse 'hunted' into room 3
rs.takeCurse('hunted',3);
// run.js enterRoom(3): shrine curse applies "unless a door's curse already did": !relics.curseFor(n)
console.log('curseFor(3) after major door =', rs.curseFor(3), '-> shrine curse applies:', !rs.curseFor(3));
rs.takeCurse('famine',3);
rs.onRoomEnter(3,'kill_all');
rs.onRoomCleared(3,{gainGlint(){}});
// what pick is owed?
const owed=rs.owed(); let src=null;
// presentDue reveals the source via the offer
rs.presentDue(()=>{}); const v=rs.view?rs.view():null;
console.log('owed',owed,'offer source', v && (v.offer?.source ?? JSON.stringify(v).match(/"source":"[a-z]+"/)?.[0]));
console.log(evs.join('\n'));
