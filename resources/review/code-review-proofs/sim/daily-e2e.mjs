const ROOT='/home/claude/echoes-three/'; const u=(p)=>ROOT+p;
const key=process.argv[2]||'2026-01-01';
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { runFacts } = await import(u('src/data/unlocks.js'));
let impl = createGameplayRng(1);
const rng = { stream:'gameplay', get seed(){return impl.seed}, get drawIndex(){return impl.drawIndex}, float:()=>impl.float(), range:(a,b)=>impl.range(a,b), int:(n)=>impl.int(n), chance:(p)=>impl.chance(p), pick:(a)=>impl.pick(a), reseed:(s)=>{impl=createGameplayRng(s>>>0);return impl.seed} };
const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
const run = world.runSystem(); const ap = run.autopilot;
const fought=[]; let summary=null;
bus.on('room_enter',(e)=>{ if(e.mode==='boss') fought.push({level:run.view().act, kind:run.view().actBoss?.kind, seed:run.view().frame?.seed}); });
bus.on('level_clear',(e)=>{ fought[fought.length-1].cleared=true; });
bus.on('run_end',(e)=>{ const s=run.view().summary; summary={result:e.result,seed:s?s.seed:null,campaign:e.campaign??s?.campaign,act:e.act}; });
// make the party unkillable so the run goes deep
run.startCampaign({level:1,harness:true,daily:{key}}); ap.configure(true);
for(let i=0;i<3_000_000 && !summary;i++){ for(const e of registry.all()) if(e.partyIndex!==undefined && e.hp>0) e.hp=e.maxHp; clock.stepOnce((t)=>world.step(t, ap.intents(t, emptySnapshot()))); }
console.log('fought', JSON.stringify(fought));
console.log('summary.seed', summary.seed, 'result', summary.result);
console.log('credited', runFacts(summary,{}).bosses);
