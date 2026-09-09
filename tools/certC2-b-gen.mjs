// Certification critic — block C round 2, AUDIT RE-RUN (prefix certC2-b-).
// Covers the two completeness gaps flagged against docs/critiques/certification-C-r2.md:
//   G1  hitstop on NON-KILLING melee-arc connects (BUILD_BRIEF §9 item 4)
//   G2  >= 20 enemy hits with flash + numeral + knockback + sound, incl. non-kill MELEE knockback
// Action JSON is written programmatically; every eval is IIFE-wrapped and shares one page scope.
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const mdown = (b) => ({ type: 'mousedown', button: b });
const mup = (b) => ({ type: 'mouseup', button: b });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'intent','intent_denied','dash_end','downed','revive','screenshake','flash','knockback',
  'basic_fire','skill_cast','ally_cast','ally_basic','crit','squash','decal'];

// ---- shared arm: event bus + per-frame (tick, wallclock) sampler + numeral observer ----
const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],frames:[],started:performance.now(),grabOn:false,W:{},hits:[]};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{try{window.__c.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-window.__c.started)},e))}catch(err){window.__c.ev.push({T:t,bad:1})}});
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;
  const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  // per-rAF: one row per NEW sim tick (positions/hp/kb) + a raw frame log (wall ms, tick) for pause detection
  let last=-1;
  const f=()=>{const now=performance.now()-window.__c.started;const t=E.tick;
    window.__c.frames.push([Math.round(now*10)/10,t]);
    if(window.__c.frames.length>40000)window.__c.frames.splice(0,15000);
    if(t!==last){last=t;const s=E.state();const p=s.party[0];const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];
      const party=s.party.map(q=>[+q.x.toFixed(3),+q.z.toFixed(3),q.hp]);
      const vfx=s.vfx||{};const num=vfx.numerals??(vfx.arena&&vfx.arena.numerals)??null;
      window.__c.rows.push({t,ms:Math.round(now),px:+p.x.toFixed(4),pz:+p.z.toFixed(4),hp:p.hp,num,en,party});
      if(window.__c.rows.length>20000)window.__c.rows.splice(0,8000);}
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' probe '+!!window.__arenaProbe`));

const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,tick:E.tick,room:r&&r.room}`));
const LIVE = `(()=>{const s=__echoes.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await sleep(8);}return {ok:false,tick:E.tick${extra}}`));
const waitLive = waitFor(LIVE, 45000, `,enemies:E.state().enemies.length,fps:E.fps`);
const snap = (tag) => ev(iife(`const s=E.state();return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,ver:E.version,scene:s.scene,phase:s.run.phase,room:s.run.room,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.classId||p.cls||'?',p.hp,p.downed])}`));

const files = {};

// ===================== RECON: event shapes, cmds, setHp, player attack =====================
files['certC2-b-recon'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe t'+E.tick`)),
  wait(6000),
  ev(iife(`const h=window.__c.ev.filter(e=>e.T==='hit').slice(0,6);return {n:window.__c.ev.filter(e=>e.T==='hit').length,sample:h}`)),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {counts:m,tick:E.tick}`)),
  ev(iife(`return {hitstop:window.__c.ev.filter(e=>e.T==='hitstop'),shake:window.__c.ev.filter(e=>e.T==='screenshake').slice(0,4),sound:window.__c.ev.filter(e=>e.T==='sound').slice(0,6),allyBasic:window.__c.ev.filter(e=>e.T==='ally_basic').slice(0,4),allyCast:window.__c.ev.filter(e=>e.T==='ally_cast').slice(0,4)}`)),
  ev(iife(`const s=E.state();return {stateKeys:Object.keys(s),partyKeys:Object.keys(s.party[0]),party:s.party.map(p=>({id:p.id,cls:p.classId||p.cls||p.klass,hp:p.hp,max:p.maxHp||p.hpMax,skills:p.skills})),enemyKeys:s.enemies[0]?Object.keys(s.enemies[0]):null,enemy0:s.enemies[0],skills:s.skills,build:s.build,vfx:s.vfx,toggles:s.toggles}`)),
  ev(iife(`const s=E.state();const e=s.enemies[0];if(!e)return 'no enemy';const before=e.hp;const r1=E.cmd('setHp',e.id,1);const a=E.state().enemies.find(q=>q.id===e.id);return {id:e.id,before,ret:r1,after:a&&a.hp,maxGuess:a&&(a.maxHp||a.hpMax)}`)),
  ev(iife(`const out={};for(const n of ['killAllEnemies','hitOnce','giveSkill','mark','rally','spawn'])out[n]=typeof E.cmd;return {cmdType:typeof E.cmd,echoKeys:Object.keys(E),hudKeys:Object.keys(E.hud||{})}`)),
  // player basic attack: right-click hold aimed at the first enemy
  ev(iife(`const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;const s=E.state();const e=s.enemies[0];if(!e)return 'no enemy';const v=new V(e.x,0.5,e.z);v.project(cam);const sx=Math.round((v.x*0.5+0.5)*window.innerWidth),sy=Math.round((-v.y*0.5+0.5)*window.innerHeight);window.__c.aim=[sx,sy];window.__c.evMark=window.__c.ev.length;E.cmd('teleport',e.x-1.2,e.z);return {enemy:[e.x,e.z],screen:[sx,sy],tick:E.tick}`)),
  ev(iife(`const a=window.__c.aim;return a`)),
  mv(800, 450), wait(60),
  ev(iife(`const a=window.__c.aim;return {aim:a}`)),
  // aim at recorded coords then hold right mouse 1.5 s
  ...[0].map(() => ev(iife(`return 'aim-next'`))),
  wait(50),
  ev(iife(`window.__c.evMark=window.__c.ev.length;return 'mark '+window.__c.evMark`)),
  mdown('right'), wait(1500), mup('right'),
  ev(iife(`const nu=window.__c.ev.slice(window.__c.evMark);const m={};for(const e of nu)m[e.T]=(m[e.T]||0)+1;return {counts:m,basic:nu.filter(e=>e.T==='basic_fire').slice(0,4),hitsBySrc:nu.filter(e=>e.T==='hit').slice(0,8)}`)),
  // skills the player holds + try giving a melee arc heal
  ev(iife(`const g=E.cmd('giveSkill','restorative_wave');const s=E.state();return {give:g,skills:s.skills,build:s.build&&s.build.skills}`)),
  snap('recon-end'),
];

mkdirSync('tools/actions', { recursive: true });
for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/' + name + '.json', acts.length, 'actions');
}
