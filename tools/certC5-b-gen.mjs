// Certification C round 5, audit re-run (prefix certC5-b-): recon of the boss-room boot paths.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const INFO = (tag) => ev(iife(`let st=null,err=null;try{st=E.state();}catch(e){err=String(e);}
  const P=window.__arenaProbe;const cam=P&&P.stage&&P.stage.camera;
  const evs=(E.events||[]).filter(e=>/boss|screenshake|room_enter|wave_start|death/.test(e.type)).map(e=>[e.tick,e.type,e.cause||'']);
  let ru=null;try{ru=E.runUi();}catch(e){ru=String(e);}
  return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,url:location.search,
    probe:!!P,stageKeys:P&&P.stage?Object.keys(P.stage):null,
    cam:cam?[cam.position.x,cam.position.y,cam.position.z].map(v=>+v.toFixed(3)):null,
    sceneHook:P&&P.stage&&P.stage.scene?typeof P.stage.scene.onBeforeRender:null,
    stErr:err,stRoom:st?JSON.stringify(st.room).slice(0,200):null,stScene:st?st.scene:null,enemies:st&&st.enemies?st.enemies.map(e=>[e.id,e.kind,e.hp]):null,
    vfxArena:st&&st.vfx?!!st.vfx.arena:null,screen:ru&&ru.screen,runState:JSON.stringify(E.cmd('runState')).slice(0,300),evs:evs.slice(-40)}`));
const files = {};
files['certC5-b-recon8'] = [INFO('boot'), shot('certC5-b-recon8-a'), wait(3000), INFO('boot+3s'), shot('certC5-b-recon8-b')];
files['certC5-b-reconskip'] = [INFO('camp'), ev(iife(`E.cmd('startRun');return E.tick`)), wait(1500), INFO('run'),
  ev(iife(`const r=E.cmd('skipToRoom',8);return {tick:E.tick,r:JSON.stringify(r).slice(0,300)}`)), wait(1500), INFO('skip8+1.5s'),
  shot('certC5-b-reconskip-a'), wait(3000), INFO('skip8+4.5s'), shot('certC5-b-reconskip-b')];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
