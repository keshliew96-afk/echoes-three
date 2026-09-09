// certC1-ref1-gen.mjs — refuter (bar lawyer) generator for critic C F1
// (room-clearing kill has no damage numeral). Writes tools/actions/certC1-ref1-*.json.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','hit','hit_immune','death','hitstop','sound',
  'reward','draft_taken','path_chosen','enemy_despawn','run_end','victory','defeat','boss_spawn','boss_death','boss_adds','director_stop','flash','knockback','screenshake'];

// ARM: raw DOM observer (no visibility filter) + event-time snapshots + per-rAF rows.
const arm = ev(iife(`
  window.__c={ev:[],dom:[],rows:[],snaps:[],frames:0,started:performance.now(),lastDeathTick:-999,clears:0,driverDone:false};
  const C=window.__c;
  const L=document.querySelector('#dmg-num-layer');C.numLayer=!!L;
  const visNums=()=>{if(!L)return null;const out=[];for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||!el.textContent)continue;const r=el.getBoundingClientRect();out.push(el.textContent+'@'+Math.round(r.x)+','+Math.round(r.y)+'/'+(+cs.opacity).toFixed(2));}return out;};
  const allNums=()=>{if(!L)return null;const out=[];for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);out.push((el.textContent||'')+'|'+cs.display+'|'+(+cs.opacity).toFixed(2)+'|'+cs.visibility);}return out;};
  C.visNums=visNums;C.allNums=allNums;
  const snap=(T,e)=>{let n=null;try{n=(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})();}catch(err){n='ERR '+err;}C.snaps.push({T,t:E.tick,tick:e&&e.tick,target:e&&(e.target??e.id),amount:e&&e.amount,num:n,dom:visNums(),domAll:(allNums()||[]).length});};
  for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>{C.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-C.started)},e));if(t==='death'){C.lastDeathTick=e.tick;snap('death',e);}else if(t==='hit'){snap('hit',e);}else if(t==='room_cleared'){C.clears++;snap('room_cleared',e);}else if(t==='run_end'){snap('run_end',e);}});
  if(L){const lastKey=new WeakMap();const perEl=new WeakMap();const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);if(!vis){lastKey.set(el,'hidden');perEl.set(el,0);continue;}const r=el.getBoundingClientRect();const k=el.textContent+'|'+Math.round(r.x/8)+'|'+Math.round(r.y/8);if(lastKey.get(el)===k)continue;const cnt=(perEl.get(el)||0)+1;perEl.set(el,cnt);lastKey.set(el,k);if(cnt>3)continue;C.dom.push({t,ms:Math.round(performance.now()-C.started),k:cnt===1?'show':'move',txt:el.textContent,op:+(+cs.opacity).toFixed(2),x:Math.round(r.x),y:Math.round(r.y)});}
    if(C.dom.length>6000)C.dom.splice(0,2000);});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  const RS=document.querySelector('#run-screen');const HUD=document.querySelector('#hud');
  let last=-1;const f=()=>{C.frames++;const t=E.tick;if(t!==last){last=t;let n=null;try{n=(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})();}catch(err){n=-1;}let ui='?';try{ui=E.runUi().screen;}catch(err){}const rcs=RS?getComputedStyle(RS):null;const lcs=L?getComputedStyle(L):null;const page=RS?[...RS.querySelectorAll('.rn-page')].find(p=>getComputedStyle(p).display!=='none'):null;const pcs=page?getComputedStyle(page):null;
    C.rows.push({t,ms:Math.round(performance.now()-C.started),num:n,vis:visNums(),ui,rs:rcs?rcs.display+'/'+(+rcs.opacity).toFixed(2):null,pg:pcs?(page.className+'/'+(+pcs.opacity).toFixed(2)):null,ly:lcs?lcs.display+'/'+(+lcs.opacity).toFixed(2)+'/'+lcs.visibility:null,en:E.state().enemies.length});if(C.rows.length>30000)C.rows.splice(0,10000);}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  return {armed:E.tick,numLayer:C.numLayer,runScreen:!!RS,hud:!!HUD,version:E.version,seed:E.seed,inner:[innerWidth,innerHeight]}`));

// non-blocking driver: decline drafts, pick door 0, advance shop, keep player alive, stop after N clears.
const driver = (nClears, maxMs) => ev(iife(`
  const C=window.__c;const t0=performance.now();
  C.driver=setInterval(()=>{try{const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);}catch(err){C.driverErr=String(err);}
    if(C.clears>=${nClears}||performance.now()-t0>${maxMs}){clearInterval(C.driver);C.driverDone=true;}},40);
  return 'driver '+E.tick`));

const analyze = (tag) => ev(iife(`
  const C=window.__c;const ev=C.ev;const rows=C.rows;const out=[];
  const hitFor=(d)=>ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick)||ev.filter(e=>e.T==='hit'&&e.target===d.id).slice(-1)[0];
  const numFor=(d,h)=>{if(!h)return [];const a=C.dom.filter(x=>x.t>=d.tick&&x.t<=d.tick+2&&x.txt===String(h.amount)&&x.k==='show');if(a.length)return a;const before=new Set();for(const r of rows)if(r.t>=d.tick-3&&r.t<d.tick)for(const v of (r.vis||[]))before.add(v.split('/')[0]);for(const r of rows)if(r.t>=d.tick&&r.t<=d.tick+3)for(const v of (r.vis||[])){const key=v.split('/')[0];if(key.startsWith(String(h.amount)+'@')&&!before.has(key))return [{t:r.t,txt:String(h.amount),k:'row'}];}return [];};
  const bs=ev.find(e=>e.T==='boss_spawn');for(const rc of ev.filter(e=>e.T==='room_cleared'&&(!bs||e.tick>bs.tick))){const deaths=ev.filter(e=>e.T==='death'&&e.tick<=rc.tick);const d=deaths[deaths.length-1];if(!d){out.push({clearTick:rc.tick,death:null});continue;}
    const h=hitFor(d);const t=d.tick;const nm=numFor(d,h);
    const domRaw=C.dom.filter(x=>x.t>=t-2&&x.t<=t+12).map(x=>[x.t,x.k,x.txt,x.op,x.x,x.y]);
    const snaps=C.snaps.filter(s=>s.t>=t-1&&s.t<=t+2).map(s=>[s.T,s.t,s.target,s.amount,s.num,s.dom&&s.dom.join(' ')]);
    const seg=rows.filter(r=>r.t>=t-3&&r.t<=t+40).map(r=>r.t+' n'+r.num+' ['+(r.vis||[]).join(' ')+'] ui='+r.ui+' rs='+r.rs+' pg='+r.pg+' ly='+r.ly+' en='+r.en+' ms'+r.ms);
    let mg=0,mgAt=null;const seg2=rows.filter(r=>r.t>=t-5&&r.t<=t+20);for(let i=1;i<seg2.length;i++){const g=seg2[i].ms-seg2[i-1].ms;if(g>mg){mg=g;mgAt=seg2[i].t;}}
    const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);
    const around=ev.filter(e=>e.tick>=t-1&&e.tick<=t+3&&e.T!=='sound').map(e=>e.T+'@'+e.tick+(e.amount!=null?'('+e.amount+')':'')+(e.target!=null?'#'+e.target:''));
    out.push({clearTick:rc.tick,sameTick:rc.tick===t,death:{tick:t,id:d.id},hit:h?{tick:h.tick,amt:h.amount,src:h.source??h.src??h.skill??null}:null,numeral:nm.length>0,numeralAt:nm.length?nm[0].t-t:null,domRaw,snaps,frames:seg,maxGapMs:mg,gapAt:mgAt,hitstop:hs,sound:snd,around});}
  const kills=ev.filter(e=>e.T==='death').map(d=>{const h=hitFor(d);const nm=numFor(d,h);return {t:d.tick,id:d.id,amt:h&&h.amount,num:nm.length>0,at:nm.length?nm[0].t-d.tick:null};});
  const hits=ev.filter(e=>e.T==='hit'&&e.target>=4);const hitsWithNum=hits.filter(h=>numFor({tick:h.tick,id:h.target},h).length>0).length;
  let big=[];for(let i=1;i<rows.length;i++){const g=rows[i].ms-rows[i-1].ms;if(g>100)big.push([rows[i].t,g]);}
  return {tag:${JSON.stringify(tag)},rooms:out,kills:kills.length,killsWithNumeral:kills.filter(k=>k.num).length,killsMissing:kills.filter(k=>!k.num),hits:hits.length,hitsWithNumeral:hitsWithNum,frameGaps:big,frames:C.frames,rowsN:rows.length,domN:C.dom.length,driverErr:C.driverErr||null,fps:E.fps,version:E.version,seed:E.seed}`));

const files = {};
// ---- clear: natural rooms 1..3 (same as the critic) with raw observer + overlay timing + harness shots at each clear
const clearSeq = (n) => [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`)),
  waitFor(`(()=>{const s=E.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`, 30000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  driver(3, 120000),
  // control shot: first non-clearing kill
  { type: 'loop', label: 'ctrl-kill', cond: `(()=>{const C=window.__c;return C.clears>0||(C.ev.some(e=>e.T==='death')&&__echoes.tick-C.lastDeathTick<=2&&__echoes.state().enemies.length>0)})()`, maxMs: 60000, body: [wait(10)] },
  ev(iife(`const C=window.__c;return {tag:'ctrl-shot',tick:E.tick,lastDeath:C.lastDeathTick,vis:C.visNums(),num:(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})()}`)),
  { type: 'shot', name: `certC1-ref1-${n}-ctrlkill` },
  { type: 'loop', label: 'clear1', cond: `window.__c.clears>=1`, maxMs: 90000, body: [wait(10)] },
  ev(iife(`const C=window.__c;return {tag:'clear1-shot',tick:E.tick,clearTick:(C.ev.filter(e=>e.T==='room_cleared')[0]||{}).tick,vis:C.visNums(),num:(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})(),ui:E.runUi().screen}`)),
  { type: 'shot', name: `certC1-ref1-${n}-clear1` },
  { type: 'loop', label: 'clear2', cond: `window.__c.clears>=2`, maxMs: 90000, body: [wait(10)] },
  ev(iife(`const C=window.__c;return {tag:'clear2-shot',tick:E.tick,clearTick:(C.ev.filter(e=>e.T==='room_cleared')[1]||{}).tick,vis:C.visNums(),num:(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})(),ui:E.runUi().screen}`)),
  { type: 'shot', name: `certC1-ref1-${n}-clear2` },
  { type: 'loop', label: 'clear3', cond: `window.__c.clears>=3`, maxMs: 90000, body: [wait(10)] },
  ev(iife(`const C=window.__c;return {tag:'clear3-shot',tick:E.tick,clearTick:(C.ev.filter(e=>e.T==='room_cleared')[2]||{}).tick,vis:C.visNums(),num:(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})(),ui:E.runUi().screen}`)),
  { type: 'shot', name: `certC1-ref1-${n}-clear3` },
  wait(700),
  analyze(`${n}-clears`),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tag:'counts',tick:E.tick,counts:m,fps:E.fps}`)),
];
for (const sd of [555, 4242, 777]) files['certC1-ref1-clear'+sd] = clearSeq('s'+sd);

// ---- boss: room 8 natural fight to victory (last add kill = room_cleared = run_end)
files['certC1-ref1-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,9000);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 300 },
  ev(iife(`const C=window.__c;C.clears=0;C.driver=setInterval(()=>{try{const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);}catch(err){}},60);return 'guard'`)),
  { type: 'loop', label: 'boss-clear', cond: `window.__c.ev.some(e=>e.T==='run_end')`, maxMs: 150000, body: [wait(10)] },
  ev(iife(`const C=window.__c;clearInterval(C.driver);return {tag:'boss-shot',tick:E.tick,vis:C.visNums(),num:(()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null})(),ui:E.runUi().screen,ends:C.ev.filter(e=>e.T==='room_cleared'||e.T==='run_end'||e.T==='boss_death').map(e=>[e.T,e.tick])}`)),
  { type: 'shot', name: 'certC1-ref1-boss-victory' },
  wait(700),
  analyze('boss'),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tag:'counts',tick:E.tick,counts:m,fps:E.fps,ui:E.runUi().screen}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
