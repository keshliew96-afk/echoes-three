// certC1-ref1-gen2.mjs — refuter (bar lawyer) second-pass generator for critic C F1
// (room-clearing kill has no damage numeral). Fresh seeds, synchronous in-handler DOM
// probes (hit -> death -> room_cleared on the same tick), per-rAF visibility rows,
// row-based (observer-free) numeral attribution. Writes tools/actions/certC1-ref1-sync<seed>.json.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const TYPES = ['run_start','room_enter','room_start','room_cleared','reward_offer','wave_start','enemy_spawn','hit','hit_immune','death','hitstop','sound',
  'path_chosen','enemy_despawn','run_end','boss_spawn','boss_death','boss_adds','director_stop'];

const arm = ev(iife(`
  window.__r={ev:[],rows:[],sync:[],frames:0,started:performance.now(),clears:0,lastDeathTick:-999};
  const R=window.__r;
  const L=document.querySelector('#dmg-num-layer');R.numLayer=!!L;
  const numCount=()=>{try{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null}catch(err){return 'ERR'}};
  // visible numerals: text@x,y/opacity ; all numerals: text|display|opacity (pool incl. hidden)
  const visNums=()=>{if(!L)return null;const out=[];for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||!el.textContent)continue;const r=el.getBoundingClientRect();out.push(el.textContent+'@'+Math.round(r.x)+','+Math.round(r.y)+'/'+(+cs.opacity).toFixed(2));}return out;};
  const poolNums=()=>{if(!L)return null;const out=[];for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);out.push((el.textContent||'-')+'|'+cs.display+'|'+(+cs.opacity).toFixed(2)+'|'+cs.visibility+'|'+(el.className||''));}return out;};
  R.visNums=visNums;R.numCount=numCount;
  const sync=(T,e)=>{R.sync.push({T,t:E.tick,etick:e&&e.tick,target:e&&(e.target??e.id),amount:e&&e.amount,src:e&&(e.source??e.src??e.skill??null),num:numCount(),vis:visNums(),pool:poolNums(),ui:(()=>{try{return E.runUi().screen}catch(err){return '?'}})(),en:E.state().enemies.length});};
  for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>{R.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-R.started)},e));
    if(t==='death'){R.lastDeathTick=e.tick;sync('death',e);}
    else if(t==='hit'){if(E.state().enemies.length<=1)sync('hit',e);}
    else if(t==='room_cleared'){R.clears++;sync('room_cleared',e);}
    else if(t==='reward_offer'){sync('reward_offer',e);}
    else if(t==='run_end'){sync('run_end',e);}});
  let last=-1;const f=()=>{R.frames++;const t=E.tick;let ui='?';try{ui=E.runUi().screen;}catch(err){}
    R.rows.push({t,ms:Math.round(performance.now()-R.started),num:numCount(),vis:visNums(),ui,en:E.state().enemies.length,newTick:t!==last});last=t;
    if(R.rows.length>40000)R.rows.splice(0,10000);requestAnimationFrame(f);};requestAnimationFrame(f);
  return {armed:E.tick,numLayer:R.numLayer,poolSize:(poolNums()||[]).length,version:E.version,seed:E.seed,inner:[innerWidth,innerHeight]}`));

const driver = (nClears, maxMs) => ev(iife(`
  const R=window.__r;const t0=performance.now();
  R.driver=setInterval(()=>{try{const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);}catch(err){R.driverErr=String(err);}
    if(R.clears>=${nClears}||performance.now()-t0>${maxMs}){clearInterval(R.driver);R.driverDone=true;}},40);
  return 'driver '+E.tick`));

// Row-based attribution: a kill/hit at tick t "has a numeral" when some rendered row in [t, t+4]
// shows a visible numeral whose text == amount at a screen key (text + 16-px cell) that was not visible in [t-4, t-1].
const analyze = (tag) => ev(iife(`
  const R=window.__r;const ev=R.ev;const rows=R.rows;
  const keyOf=(v)=>{const [txt,rest]=v.split('@');const [xy]=rest.split('/');const [x,y]=xy.split(',').map(Number);return txt+'|'+Math.round(x/16)+'|'+Math.round(y/16);};
  const hasNumeral=(t,amt)=>{const before=new Set();for(const r of rows)if(r.t>=t-4&&r.t<t)for(const v of (r.vis||[]))before.add(keyOf(v));
    for(const r of rows)if(r.t>=t&&r.t<=t+4)for(const v of (r.vis||[])){if(!v.startsWith(String(amt)+'@'))continue;const k=keyOf(v);if(!before.has(k))return {t:r.t,at:r.t-t,v};}return null;};
  const hitFor=(d)=>ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick)||ev.filter(e=>e.T==='hit'&&e.target===d.id).slice(-1)[0];
  const kills=ev.filter(e=>e.T==='death').map(d=>{const h=hitFor(d);const nm=h?hasNumeral(d.tick,h.amount):null;return {t:d.tick,id:d.id,amt:h&&h.amount,src:h&&(h.source??h.src??h.skill??null),num:!!nm,at:nm?nm.at:null};});
  const clears=ev.filter(e=>e.T==='room_cleared').map(rc=>{const deaths=ev.filter(e=>e.T==='death'&&e.tick<=rc.tick);const d=deaths[deaths.length-1];const h=d?hitFor(d):null;const t=d?d.tick:rc.tick;
    const nm=h?hasNumeral(d.tick,h.amount):null;
    const sync=R.sync.filter(s=>s.t>=t-1&&s.t<=rc.tick+1).map(s=>({T:s.T,t:s.t,target:s.target,amount:s.amount,src:s.src,num:s.num,vis:s.vis,pool:(s.pool||[]).filter(p=>!p.startsWith('-|')),ui:s.ui,en:s.en}));
    const seg=rows.filter(r=>r.t>=t-3&&r.t<=rc.tick+12).map(r=>r.t+(r.newTick?'':'*')+' n'+r.num+' ['+(r.vis||[]).join(' ')+'] ui='+r.ui+' en='+r.en+' ms'+r.ms);
    let mg=0,mgAt=null;const seg2=rows.filter(r=>r.t>=t-5&&r.t<=rc.tick+20);for(let i=1;i<seg2.length;i++){const g=seg2[i].ms-seg2[i-1].ms;if(g>mg){mg=g;mgAt=seg2[i].t;}}
    const around=ev.filter(e=>e.tick>=t-1&&e.tick<=rc.tick+3&&e.T!=='sound').map(e=>e.T+'@'+e.tick+(e.amount!=null?'('+e.amount+')':'')+(e.target!=null?'#'+e.target:''));
    const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);
    const renderedBetween=rows.filter(r=>r.t===t).length;
    return {clearTick:rc.tick,sameTick:d?rc.tick===d.tick:null,death:d?{tick:d.tick,id:d.id}:null,hit:h?{tick:h.tick,amt:h.amount,src:h.source??h.src??h.skill??null}:null,numeral:!!nm,numeralAt:nm?nm.at:null,framesOnKillTick:renderedBetween,sync,rows:seg,maxGapMs:mg,gapAt:mgAt,hitstop:hs,sound:snd,around};});
  const hits=ev.filter(e=>e.T==='hit'&&e.target>=4);const hitsWithNum=hits.filter(h=>hasNumeral(h.tick,h.amount)).length;
  let big=[];for(let i=1;i<rows.length;i++){const g=rows[i].ms-rows[i-1].ms;if(g>100)big.push([rows[i].t,g]);}
  return {tag:${JSON.stringify(tag)},clears,kills:kills.length,killsWithNumeral:kills.filter(k=>k.num).length,killsMissing:kills.filter(k=>!k.num),hits:hits.length,hitsWithNumeral:hitsWithNum,frameGaps:big,frames:R.frames,rowsN:rows.length,driverErr:R.driverErr||null,fps:E.fps,version:E.version,seed:E.seed}`));

const files = {};
const seq = (n) => [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`)),
  waitFor(`(()=>{const s=E.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`, 30000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  driver(3, 130000),
  { type: 'loop', label: 'clear1', cond: `window.__r.clears>=1`, maxMs: 90000, body: [wait(10)] },
  ev(iife(`const R=window.__r;return {tag:'clear1-shot',tick:E.tick,clearTick:(R.ev.filter(e=>e.T==='room_cleared')[0]||{}).tick,vis:R.visNums(),num:R.numCount(),ui:E.runUi().screen}`)),
  { type: 'shot', name: `certC1-ref1-${n}-clear1` },
  { type: 'loop', label: 'clear3', cond: `window.__r.clears>=3||window.__r.driverDone`, maxMs: 130000, body: [wait(10)] },
  wait(700),
  analyze(`${n}-clears`),
  ev(iife(`const m={};for(const e of window.__r.ev)m[e.T]=(m[e.T]||0)+1;return {tag:'counts',tick:E.tick,counts:m,fps:E.fps,ui:E.runUi().screen}`)),
];
for (const sd of [1234, 31337]) files['certC1-ref1-sync' + sd] = seq('s' + sd);

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
