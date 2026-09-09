// certC1-ref0-gen.mjs — refuter (harness-artifact hunter) generator for finding F1
// "room-clearing kill has no damage numeral". Writes tools/actions/certC1-ref0-*.json.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

const TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'hit','hit_immune','death','hitstop','sound','reward','reward_offer','draft_taken','path_chosen','enemy_despawn',
  'ally_cast','ally_basic','basic_fire','skill_cast','run_end'];

// ARM: event listeners with synchronous DOM/vfx snapshots, childList-aware MutationObserver,
// per-rAF sampler (tick, ms, vfx.numerals, ui screen, layer children).
const arm = ev(`(()=>{const E=__echoes;
const C=window.__c={ev:[],dom:[],rows:[],lastPos:{},started:performance.now(),frames:0};
const L=document.querySelector('#dmg-num-layer');C.numLayer=!!L;
const P=window.__arenaProbe;const V=P&&P.root&&P.root.position.constructor;const W=window.innerWidth,H=window.innerHeight;
const proj=(x,y,z)=>{try{const v=new V(x,y,z);v.project(P.stage.camera);return [Math.round((v.x*0.5+0.5)*W),Math.round((-v.y*0.5+0.5)*H)];}catch(e){return null;}};
C.proj=proj;
const vis=(el)=>{const cs=getComputedStyle(el);return !(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);};
const layerSnap=()=>{if(!L)return null;return [...L.children].map(c=>{const cs=getComputedStyle(c);const r=c.getBoundingClientRect();return [(c.textContent||'').trim(),cs.display==='none'?'none':(+cs.opacity).toFixed(2),Math.round(r.x),Math.round(r.y)];});};
C.layerSnap=layerSnap;
const numOf=()=>{try{const v=E.state().vfx||{};return v.numerals??null;}catch(e){return 'err';}};
for(const t of TYPES_PLACEHOLDER){E.on(t,e=>{const r=Object.assign({T:t,ms:Math.round(performance.now()-C.started)},e);
  if(t==='hit'||t==='death'||t==='room_cleared'||t==='reward_offer'||t==='reward'||t==='room_enter'){r.numSync=numOf();r.layerSync=layerSnap();r.uiSync=E.runUi().screen;}
  if(t==='death'){const lp=C.lastPos[e.id];if(lp){r.pos=[+lp.x.toFixed(2),+lp.z.toFixed(2),lp.kind];r.scr=proj(lp.x,1.1,lp.z);}}
  C.ev.push(r);});}
if(L){const lastKey=new WeakMap();const mo=new MutationObserver(muts=>{const t=E.tick;const ms=Math.round(performance.now()-C.started);for(const m of muts){
  if(m.type==='childList'){for(const n of m.addedNodes){if(n.nodeType===1)C.dom.push({t,ms,k:'add',txt:(n.textContent||'').trim(),cls:String(n.className).slice(0,40)});}
    for(const n of m.removedNodes){if(n.nodeType===1)C.dom.push({t,ms,k:'rm',txt:(n.textContent||'').trim(),cls:String(n.className).slice(0,40)});}}
  else if(m.type==='characterData'){C.dom.push({t,ms,k:'txt',txt:m.target.data,old:m.oldValue});}
  else if(m.type==='attributes'){const el=m.target;if(!el.classList)continue;const inLayer=el===L||el.closest('#dmg-num-layer');if(!inLayer)continue;const cs=getComputedStyle(el);const r=el.getBoundingClientRect();const key=(el.textContent||'')+'|'+cs.display+'|'+(+cs.opacity).toFixed(1)+'|'+Math.round(r.x/16)+'|'+Math.round(r.y/16);if(lastKey.get(el)===key)continue;lastKey.set(el,key);C.dom.push({t,ms,k:'attr',self:el===L,a:m.attributeName,txt:(el.textContent||'').trim(),disp:cs.display,op:(+cs.opacity).toFixed(2),x:Math.round(r.x),y:Math.round(r.y)});}
  if(C.dom.length>40000)C.dom.splice(0,10000);}});
  mo.observe(L,{childList:true,subtree:true,characterData:true,characterDataOldValue:true,attributes:true,attributeFilter:['style','class','hidden']});
  const moP=new MutationObserver(muts=>{const t=E.tick;for(const m of muts){if(m.type==='attributes'&&m.target===L){const cs=getComputedStyle(L);C.dom.push({t,ms:Math.round(performance.now()-C.started),k:'layer',a:m.attributeName,disp:cs.display,op:cs.opacity,vis:cs.visibility});}}});
  if(L.parentElement)moP.observe(L.parentElement,{attributes:true,attributeFilter:['style','class','hidden']});}
let last=-1;const f=()=>{C.frames++;const t=E.tick;let s=null;try{s=E.state();}catch(e){}
  const row={t,nt:t!==last,ms:Math.round(performance.now()-C.started),num:s?(s.vfx||{}).numerals??null:null,ui:E.runUi().screen,ph:s?s.run.phase:null,en:s?s.enemies.length:null,lc:L?L.childElementCount:null,lv:L?[...L.children].filter(vis).map(c=>{const r=c.getBoundingClientRect();return [(c.textContent||'').trim(),Math.round(r.x),Math.round(r.y)];}):null};
  if(s)for(const e of s.enemies)C.lastPos[e.id]={x:e.x,z:e.z,kind:e.kind};
  C.rows.push(row);if(t!==last)last=t;if(C.rows.length>30000)C.rows.splice(0,10000);requestAnimationFrame(f);};requestAnimationFrame(f);
const s0=E.state();return {armed:E.tick,numLayer:C.numLayer,layerCs:L?[getComputedStyle(L).display,getComputedStyle(L).opacity,getComputedStyle(L).zIndex,getComputedStyle(L).pointerEvents]:null,probe:!!P,vfxKeys:Object.keys(s0.vfx||{}),vfx:s0.vfx,inner:[W,H]}})()`.replace('TYPES_PLACEHOLDER', JSON.stringify(TYPES)));

const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const waitCombat = ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<30000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0),enemies:s.enemies.length,phase:s.run.phase};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,phase:E.state().run.phase}})()`);
const iframe = ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`));
const keepAlive = ev(iife(`const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);return 0`));

const clearsCond = (k) => `window.__c.ev.filter(e=>e.T==='room_cleared').length>=${k}`;
const deathsCond = (k) => `window.__c.ev.filter(e=>e.T==='death').length>=${k}`;
const mark = (tag) => ev(iife(`window.__c.marks=window.__c.marks||[];const m={tag:${JSON.stringify(tag)},tick:E.tick,ms:Math.round(performance.now()-window.__c.started),ui:E.runUi().screen,num:(E.state().vfx||{}).numerals};window.__c.marks.push(m);return m`));

// Dump everything around the k-th room clear.
const dumpClear = (k) => ev(iife(`const C=window.__c;const rc=C.ev.filter(e=>e.T==='room_cleared')[${k}-1];if(!rc)return {tag:'clear${k}',missing:true,ev:C.ev.length};const T=rc.tick;
const evs=C.ev.filter(e=>e.tick>=T-3&&e.tick<=T+40&&e.T!=='sound'&&e.T!=='ally_basic'&&e.T!=='ally_cast'&&e.T!=='basic_fire').map(e=>{const o=Object.assign({},e);return o;});
const deaths=C.ev.filter(e=>e.T==='death'&&e.tick<=T);const d=deaths[deaths.length-1];
const h=d?(C.ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick)||null):null;
const dom=C.dom.filter(x=>x.t>=T-3&&x.t<=T+60);
const rows=C.rows.filter(r=>r.t>=T-4&&r.t<=T+40).map(r=>[r.t,r.ms,r.num,r.ui,r.ph,r.en,r.lc,JSON.stringify(r.lv)]);
let gaps=[];const seg=C.rows.filter(r=>r.t>=T-10&&r.t<=T+40);for(let i=1;i<seg.length;i++){const g=seg[i].ms-seg[i-1].ms;if(g>40)gaps.push([seg[i].t,g]);}
return {tag:'clear${k}',clearTick:T,clearMs:rc.ms,room:rc.room??null,death:d?{tick:d.tick,id:d.id,pos:d.pos,scr:d.scr,numSync:d.numSync,layerSync:d.layerSync,uiSync:d.uiSync}:null,hit:h?{tick:h.tick,amt:h.amount,src:h.source??h.src??h.skill??null,numSync:h.numSync,layerSync:h.layerSync}:null,rcSync:{num:rc.numSync,layer:rc.layerSync,ui:rc.uiSync},sameTick:!!(d&&d.tick===T),events:evs,dom,rows,gaps,marks:C.marks}`));

// Per-kill numeral table (all deaths so far) using the DOM add records + visible-row records.
const killTable = ev(iife(`const C=window.__c;const out=[];for(const d of C.ev.filter(e=>e.T==='death')){const h=C.ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick);const amt=h?String(h.amount):null;
const adds=C.dom.filter(x=>x.k==='add'&&x.t>=d.tick&&x.t<=d.tick+2);const attrs=C.dom.filter(x=>x.k==='attr'&&x.t>=d.tick&&x.t<=d.tick+3&&x.txt===amt&&x.disp!=='none'&&+x.op>0);
const seen=C.rows.filter(r=>r.t>=d.tick&&r.t<=d.tick+12&&r.lv&&r.lv.some(v=>v[0]===amt));
const rc=C.ev.find(e=>e.T==='room_cleared'&&e.tick===d.tick);
out.push({t:d.tick,id:d.id,amt,clearing:!!rc,domAdd:adds.length,domAttr:attrs.length,framesVisible:seen.length,firstVisibleAt:seen.length?seen[0].t-d.tick:null});}
return {tag:'kills',n:out.length,withVisible:out.filter(k=>k.framesVisible>0).length,missing:out.filter(k=>k.framesVisible===0),rows:out}`));

const advanceUi = ev(`(async()=>{const E=__echoes;const seen=[];const t0=performance.now();while(performance.now()-t0<12000){const u=E.runUi().screen;if(u==='draft'){seen.push(['draft',E.tick]);E.cmd('draftDecline');}else if(u==='path'){seen.push(['path',E.tick]);E.cmd('pathChoose',0);}else if(u==='shop'){seen.push(['shop',E.tick]);E.cmd('shopAdvance');}const s=E.state();if(s.run.combatActive&&s.enemies.length>0&&u==='none')return {ok:true,seen,tick:E.tick,room:s.run.room,mode:s.run.mode};await new Promise(r=>setTimeout(r,40));}return {ok:false,seen,tick:E.tick,ui:E.runUi().screen,phase:E.state().run.phase}})()`);

const loopUntil = (cond, label, maxMs = 95000) => ({ type: 'loop', cond, maxMs, label, body: [keepAlive, wait(30)] });

const end = ev(iife(`const s=E.state();const r=s.run;const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const rows=window.__c.rows;let gaps=0,mx=0;for(let i=1;i<rows.length;i++){const g=rows[i].t-rows[i-1].t;if(g>1){gaps+=g-1;mx=Math.max(mx,g);}}return {tag:'ref0-end',tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,ui:E.runUi().screen,counts:m,frames:window.__c.frames,rows:rows.length,missedTicks:gaps,maxTickGap:mx,domRecords:window.__c.dom.length}`));

const files = {};

// ---------- main probe: natural run rooms 1..3, shots right after each clear, no auto-advance at the clear ----------
files['certC1-ref0-clearpx'] = [
  arm, startRun, waitCombat, iframe, { type: 'mousemove', x: 800, y: 450 },
  // control: first ordinary kill of the run -> shot ~40 ms later
  loopUntil(deathsCond(1), 'death1', 60000), mark('kill1-shot'), shot('certC1-ref0-kill1-a'), mark('kill1-shot-done'),
  // room 1 clear
  loopUntil(clearsCond(1), 'clear1'), mark('clear1-shot'), shot('certC1-ref0-clear1-a'), mark('clear1-shot-done'), shot('certC1-ref0-clear1-b'), mark('clear1-b-done'),
  wait(300), dumpClear(1), advanceUi,
  // room 2 (defend: timer clear) — record too
  loopUntil(clearsCond(2), 'clear2'), mark('clear2-shot'), shot('certC1-ref0-clear2-a'), mark('clear2-shot-done'),
  wait(300), dumpClear(2), advanceUi,
  // room 3 clear
  loopUntil(clearsCond(3), 'clear3'), mark('clear3-shot'), shot('certC1-ref0-clear3-a'), mark('clear3-shot-done'), shot('certC1-ref0-clear3-b'), mark('clear3-b-done'),
  wait(300), dumpClear(3), killTable, end,
];

// ---------- variation: sanctioned harness boot ?scene=arena&room=kill_all (no run / no reward flow) ----------
const waitArena = ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<30000){const s=E.state();if(s.enemies.length>0)return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0),enemies:s.enemies.length,phase:s.run.phase,room:s.room,scene:s.scene};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,phase:E.state().run.phase,room:E.state().room,scene:E.state().scene}})()`);
const arenaClearCond = `(()=>{const C=window.__c;if(C.ev.some(e=>e.T==='room_cleared'))return true;const s=__echoes.state();return !!(s.room&&s.room.cleared)})()`;
const dumpLastDeath = ev(iife(`const C=window.__c;const deaths=C.ev.filter(e=>e.T==='death');const d=deaths[deaths.length-1];if(!d)return {tag:'lastdeath',none:true};const T=d.tick;
const h=C.ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick)||null;const rc=C.ev.find(e=>e.T==='room_cleared')||null;
const evs=C.ev.filter(e=>e.tick>=T-3&&e.tick<=T+40&&e.T!=='sound'&&e.T!=='ally_basic'&&e.T!=='ally_cast'&&e.T!=='basic_fire').map(e=>{const o=Object.assign({},e);delete o.layerSync;return o;});
const dom=C.dom.filter(x=>x.t>=T-3&&x.t<=T+60);const rows=C.rows.filter(r=>r.t>=T-4&&r.t<=T+40).map(r=>[r.t,r.ms,r.num,r.ui,r.ph,r.en,r.lc,JSON.stringify(r.lv)]);
return {tag:'lastdeath',deathTick:T,deaths:deaths.length,death:{id:d.id,pos:d.pos,scr:d.scr,numSync:d.numSync,layerSync:d.layerSync},hit:h?{amt:h.amount,src:h.source??h.src??h.skill??null,numSync:h.numSync,layerSync:h.layerSync}:null,roomCleared:rc?{tick:rc.tick,sameTick:rc.tick===T}:null,roomState:E.state().room,events:evs,dom,rows,marks:C.marks}`));
files['certC1-ref0-arena'] = [
  arm, waitArena, iframe, { type: 'mousemove', x: 800, y: 450 },
  loopUntil(deathsCond(1), 'death1', 60000), mark('kill1-shot'), shot('certC1-ref0-arena-kill1-a'), mark('kill1-shot-done'),
  { type: 'loop', cond: arenaClearCond, maxMs: 120000, label: 'arena-clear', body: [keepAlive, wait(30)] },
  mark('clear-shot'), shot('certC1-ref0-arena-clear-a'), mark('clear-shot-done'), shot('certC1-ref0-arena-clear-b'), mark('clear-b-done'),
  wait(300), dumpLastDeath, killTable, end,
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
