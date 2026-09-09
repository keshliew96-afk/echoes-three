// certC2-b-pin : validate the HP keepalive (setHp on ENEMY ids) + measure who
// actually connects (ally_basic by class vs hit sources). Short capture.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','wave_start','room_cleared','screenshake'];

const arm = ev(iife(`
  window.__c={ev:[],started:performance.now()};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  return 'armed t'+E.tick+' ver '+E.version`));
const startRun = ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`));
const waitLive = ev(aiife(`const t0=performance.now();while(performance.now()-t0<45000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length,fps:E.fps};await sleep(8);}return {ok:false,tick:E.tick}`));

const acts = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,20000);return 'iframe t'+E.tick`)),
  mv(800, 450),
  // A: does setHp(enemyId, 1) restore enemy hp?
  ev(iife(`const s=E.state();const e=s.enemies[0];const before=e.hp;const r=E.cmd('setHp',e.id,1);const a=E.state().enemies.find(q=>q.id===e.id);
    const r2=E.cmd('setHp',e.id,0.5);const b=E.state().enemies.find(q=>q.id===e.id);
    return {id:e.id,kind:e.kind,before,ret1:r,afterPct1:a&&a.hp,ret2:r2,afterPct05:b&&b.hp}`)),
  // B: run the keepalive for 20 s and see whether deaths stop
  ev(iife(`window.__c.pinStart=E.tick;window.__c.pinN=0;
    window.__c.pin=setInterval(()=>{try{for(const e of E.state().enemies){E.cmd('setHp',e.id,1);}window.__c.pinN++;}catch(err){window.__c.pinErr=String(err)}},25);
    return {pinStart:E.tick}`)),
  ev(aiife(`await sleep(20000);return {tick:E.tick,pinN:window.__c.pinN,pinErr:window.__c.pinErr||null,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp]),
    deathsSincePin:window.__c.ev.filter(e=>e.T==='death'&&e.tick>=window.__c.pinStart).length,
    hitsSincePin:window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=window.__c.pinStart).length,fps:E.fps}`)),
  ev(iife(`const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=window.__c.pinStart);const src={};for(const h of H)src[h.source+'|atk'+h.attacker]=(src[h.source+'|atk'+h.attacker]||0)+1;
    const ab={};for(const a of window.__c.ev.filter(e=>e.T==='ally_basic'&&e.tick>=window.__c.pinStart))ab[a.classId+'|'+a.shape]=(ab[a.classId+'|'+a.shape]||0)+1;
    const ac={};for(const a of window.__c.ev.filter(e=>e.T==='ally_cast'&&e.tick>=window.__c.pinStart))ac[a.classId+'|'+a.skill+'|'+a.shape]=(ac[a.classId+'|'+a.skill+'|'+a.shape]||0)+1;
    const hs=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=window.__c.pinStart);
    return {hitSources:src,allyBasicFired:ab,allyCastFired:ac,hitstops:hs.map(s=>[s.tick,s.cause,s.ticks]),
      party:E.state().party.map(p=>[p.id,p.kind,p.hp,+p.x.toFixed(2),+p.z.toFixed(2)]),enemyPos:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])}`)),
  ev(iife(`clearInterval(window.__c.pin);return {done:E.tick,fps:E.fps,ver:E.version}`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-b-pin.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-b-pin.json', acts.length);
