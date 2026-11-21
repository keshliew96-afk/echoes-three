const ROOT='/home/claude/echoes-three/'; const u=(p)=>ROOT+p;
const N=+process.argv[2]||20; const kind=process.argv[3]||'quillback';
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const impl = createGameplayRng(5);
const rng = { stream:'gameplay', get seed(){return impl.seed}, get drawIndex(){return impl.drawIndex}, float:()=>impl.float(), range:(a,b)=>impl.range(a,b), int:(n)=>impl.int(n), chance:(p)=>impl.chance(p), pick:(a)=>impl.pick(a) };
const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
const run = world.runSystem();
run.startCampaign({level:3,harness:true});
for(let i=0;i<5;i++) clock.stepOnce((t)=>world.step(t, emptySnapshot()));
for(let i=0;i<N;i++){ const a=i/N*Math.PI*2; world.cmd('spawn',kind, Math.cos(a)*6, Math.sin(a)*4, {hpMul:1000}); }
for(const e of registry.all()) if(e.partyIndex!==undefined){ e.maxHp=1e9; e.hp=1e9; }
for(let i=0;i<200;i++) clock.stepOnce((t)=>world.step(t, emptySnapshot()));
const t0=performance.now(); const T=1200; let maxE=0;
for(let i=0;i<T;i++){ clock.stepOnce((t)=>world.step(t, emptySnapshot())); maxE=Math.max(maxE,registry.count); }
const ms=(performance.now()-t0)/T;
const hostile=registry.all().filter(e=>e.faction==='hostile').length;
console.log(`N=${N} ${kind} hostiles=${hostile} entities~${registry.count} max=${maxE} ms/tick=${ms.toFixed(3)} phase=${run.view().phase}`);
