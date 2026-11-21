// node harness.mjs seed mode(campaign|endless|rush|daily|kiln) maxLevels
const ROOT='/home/claude/echoes-three/';
const [seed=1, mode='campaign', maxL='5']=process.argv.slice(2);
const u=(p)=>ROOT+p;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
let impl = createGameplayRng(seed >>> 0);
const rng = { stream:'gameplay', get seed(){return impl.seed}, get drawIndex(){return impl.drawIndex}, float:()=>impl.float(), range:(a,b)=>impl.range(a,b), int:(n)=>impl.int(n), chance:(p)=>impl.chance(p), pick:(a)=>impl.pick(a), reseed:(s)=>{impl=createGameplayRng(s>>>0);return impl.seed} };
const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
const run = world.runSystem(); const ap = run.autopilot;
const seen=new Map(); let roomKey='init'; const leaks=[]; const nans=[]; const log=[];
const isParty=(e)=>e.partyIndex!==undefined||e.kind==='player'||e.kind==='ally';
bus.on('room_enter',(e)=>{ const lv=run.view().act; roomKey=`L${lv}r${e.index}`;
  for(const ent of registry.all()){ if(isParty(ent)) continue; const k=seen.get(ent.id); if(k && k!==roomKey) leaks.push(`${roomKey} t${clock.tick}: ${ent.kind}#${ent.id} from ${k} hp=${ent.hp} state=${ent.state} fac=${ent.faction} x=${ent.x?.toFixed?.(1)},${ent.z?.toFixed?.(1)} owner=${ent.boltOwner??ent.owner??""} until=${ent.untilTick??ent.expireTick??""}`); }
  log.push(`${clock.tick} enter ${roomKey} ${e.mode} n=${registry.count}`); });
bus.on('level_transit',(e)=>{ const c=run.campaign(); if(c&&c.card&&c.card.leftovers&&c.card.leftovers.length) leaks.push('card leftovers '+c.card.leftovers.join(',')); log.push(`${clock.tick} transit ${e.kind} ${e.from}->${e.to}`); if(mode==='kiln'&&e.from===4) { const r=run.pickRoad?run.pickRoad('kiln'):run.cmd?.('pickRoad','kiln'); log.push('pickRoad '+JSON.stringify(r)); }});
bus.on('level_clear',(e)=>log.push(`${clock.tick} level_clear ${JSON.stringify(e).slice(0,120)}`));
bus.on('run_end',(e)=>log.push(`${clock.tick} run_end ${JSON.stringify(e).slice(0,200)}`));
const opts={level:1,harness:true}; if(mode==='endless')opts.endless=true; if(mode==='rush'){opts.rush=true;opts.thirdBosses=[1,2,3,4,5];} if(mode==='daily') opts.daily={key:'2026-10-19'};
run.startCampaign(opts); ap.configure(true);
const slowList=[]; let maxN=0, maxMs=0, totalMs=0, ticks=0, slowTicks=0; const kindsAtMax={};
let levels=0; let lateAt=null, lateKey=null; bus.on('room_enter',(e)=>{lateAt=clock.tick+240; lateKey=roomKey;}); bus.on('level_start',()=>{levels++;});
for(let i=0;i<3_000_000;i++){
  const t0=performance.now();
  clock.stepOnce((t)=>world.step(t, ap.intents(t, emptySnapshot())));
  const dt=performance.now()-t0; totalMs+=dt; ticks++; if(dt>maxMs)maxMs=dt; if(dt>4) slowTicks++; if(dt>20) slowList.push(`${dt.toFixed(0)}ms t${clock.tick} ${roomKey} n=${registry.count} ph=${run.view().phase}`);
  if(registry.count>maxN){maxN=registry.count;}
  if(i%7===0) for(const e of registry.all()){ if(!seen.has(e.id)) seen.set(e.id,roomKey); for(const f of ['x','z','hp']) if(e[f]!==undefined && !Number.isFinite(e[f])) { if(nans.length<20) nans.push(`${roomKey} t${clock.tick} ${e.kind}#${e.id}.${f}=${e[f]}`);} }
  else for(const e of registry.all()) if(!seen.has(e.id)) seen.set(e.id,roomKey);
  if(lateAt!==null && clock.tick>=lateAt){ lateAt=null; for(const ent of registry.all()){ if(isParty(ent)) continue; const k=seen.get(ent.id); if(k && k!==lateKey) leaks.push(`LATE+240 ${lateKey}: ${ent.kind}#${ent.id} from ${k} state=${ent.state} fac=${ent.faction} hp=${ent.hp}`);} }
  const v=run.view(); if(v.phase==='victory'||v.phase==='defeat'){ log.push('END '+v.phase); break; }
  if(levels>=+maxL) { log.push('cap'); break; }
}
console.log(log.slice(-60).join('\n'));
console.log('ticks',ticks,'avg ms',(totalMs/ticks).toFixed(3),'max ms',maxMs.toFixed(1),'slow>4ms',slowTicks,'maxEntities',maxN);
console.log('SLOW',slowList.length, slowList.slice(0,30).join('\n'));
console.log('LEAKS',leaks.length, leaks.slice(0,40).join('\n'));
console.log('NANS',nans.length, nans.join('\n'));
