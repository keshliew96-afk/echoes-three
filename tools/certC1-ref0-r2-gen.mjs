// certC1-ref0-r2-gen.mjs — refuter r2 (harness-artifact hunter) for critic C finding F1
// "room-clearing kill has no damage numeral". Writes tools/actions/certC1-ref0-r2-*.json.
// Design: NO E.on() listeners at all (rules out listener-order / thrown-listener artifacts):
// a per-rAF sampler (registered after the game's own rAF, so it sees the frame the game
// just produced) drains the E.events ring buffer, snapshots every child of #dmg-num-layer
// (text, opacity, x, y — NO visibility filter), state().vfx numerals counter, ui screen and
// the #run-screen overlay style. Analysis runs in-page and lands in console.txt as [EVAL].
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

const arm = ev(iife(`
const C=window.__r2={ev:[],seen:new Set(),rows:[],frames:0,started:performance.now(),marks:[],clears:0,deaths:0,firstDeathTick:null,lastDeathTick:null,driverErr:null,pollErr:null};
const L=document.querySelector('#dmg-num-layer');C.numLayer=!!L;
const RS=document.querySelector('#run-screen');
const P=window.__arenaProbe;const V=P&&P.root&&P.root.position&&P.root.position.constructor;
const proj=(x,y,z)=>{try{const v=new V(x,y,z);v.project(P.stage.camera);return [Math.round((v.x*0.5+0.5)*innerWidth),Math.round((-v.y*0.5+0.5)*innerHeight)];}catch(e){return null;}};
C.proj=proj;
const numOf=()=>{try{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null;}catch(e){return 'err';}};
C.numOf=numOf;
const kids=()=>{if(!L)return null;const out=[];for(const c of L.children){const cs=getComputedStyle(c);const r=c.getBoundingClientRect();out.push([(c.textContent||'').trim(),cs.display==='none'?-1:+(+cs.opacity).toFixed(2),Math.round(r.x),Math.round(r.y)]);}return out;};
C.kids=kids;
const drain=()=>{let evs=null;try{evs=E.events;}catch(e){C.pollErr=String(e);return;}if(!evs)return;for(const e of evs){if(!e)continue;const k=e.tick+'|'+e.type+'|'+(e.target??e.id??'')+'|'+(e.amount??'')+'|'+(e.slot??e.cause??e.source??'');if(C.seen.has(k))continue;C.seen.add(k);const o=Object.assign({fr:C.frames,ms:Math.round(performance.now()-C.started)},e);
  if(e.type==='death'){const lp=C.lastPos&&C.lastPos[e.id];const x=e.x??(lp&&lp.x),z=e.z??(lp&&lp.z);if(x!=null)o.scr=proj(x,1.1,z);}
  C.ev.push(o);if(e.type==='room_cleared')C.clears++;if(e.type==='death'){C.deaths++;C.lastDeathTick=e.tick;if(C.firstDeathTick==null)C.firstDeathTick=e.tick;}}
  if(C.seen.size>30000){C.seen=new Set([...C.seen].slice(-8000));}};
C.drain=drain;C.lastPos={};
let last=-1;const f=()=>{C.frames++;const t=E.tick;drain();let ui='?';try{ui=E.runUi().screen;}catch(e){}const rcs=RS?getComputedStyle(RS):null;let s=null;try{s=E.state();}catch(e){}
  if(s)for(const en of s.enemies)C.lastPos[en.id]={x:en.x,z:en.z};
  C.rows.push({t,fr:C.frames,nt:t!==last,ms:Math.round(performance.now()-C.started),num:s?((s.vfx||{}).numerals??((s.vfx||{}).arena&&(s.vfx||{}).arena.numerals)??null):'err',ui,ph:s?s.run.phase:null,en:s?s.enemies.length:null,rs:rcs?(rcs.display+'/'+(+rcs.opacity).toFixed(2)):null,kids:kids()});
  last=t;if(C.rows.length>40000)C.rows.splice(0,10000);requestAnimationFrame(f);};requestAnimationFrame(f);
return {armed:E.tick,numLayer:C.numLayer,runScreen:!!RS,version:E.version,seed:E.seed,bootSeed:E.bootSeed,evRingLen:(()=>{try{return E.events.length}catch(e){return String(e)}})(),inner:[innerWidth,innerHeight],layerCs:L?[getComputedStyle(L).display,getComputedStyle(L).opacity,getComputedStyle(L).zIndex,getComputedStyle(L).visibility]:null,rsCs:RS?[getComputedStyle(RS).display,getComputedStyle(RS).opacity,getComputedStyle(RS).zIndex]:null,probe:!!P}`));

const startRun = ev(iife(`const r=E.cmd('startRun');return {tag:'startRun',seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const waitCombat = ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<40000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tag:'waitCombat',tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0),enemies:s.enemies.length,phase:s.run.phase};await new Promise(r=>setTimeout(r,8));}return {ok:false,tag:'waitCombat',tick:E.tick,phase:E.state().run.phase}})()`);
const waitArena = ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<40000){const s=E.state();if(s.enemies.length>0)return {ok:true,tag:'waitArena',tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0),enemies:s.enemies.length,phase:s.run.phase,scene:s.scene,room:s.room};await new Promise(r=>setTimeout(r,8));}return {ok:false,tag:'waitArena',tick:E.tick,phase:E.state().run.phase,scene:E.state().scene,room:E.state().room}})()`);
const iframe = ev(iife(`E.cmd('iframe',0,9000);return 'iframe '+E.tick`));
// Non-blocking driver: decline drafts, door 0, advance shop. No enemy is ever touched by a cmd.
const driver = (maxMs) => ev(iife(`const C=window.__r2;const t0=performance.now();C.driver=setInterval(()=>{try{const u=E.runUi();if(u.screen==='draft'){C.marks.push(['draftDecline',E.tick]);E.cmd('draftDecline');}else if(u.screen==='path'){C.marks.push(['pathChoose',E.tick]);E.cmd('pathChoose',0);}else if(u.screen==='shop'){C.marks.push(['shopAdvance',E.tick]);E.cmd('shopAdvance');}}catch(err){C.driverErr=String(err);}if(performance.now()-t0>${maxMs})clearInterval(C.driver);},40);return 'driver '+E.tick`));
const stopDriver = ev(iife(`clearInterval(window.__r2.driver);return 'driver stopped '+E.tick`));
const mark = (tag) => ev(iife(`const C=window.__r2;const m={tag:${JSON.stringify(tag)},tick:E.tick,ms:Math.round(performance.now()-C.started),ui:E.runUi().screen,num:C.numOf(),vis:(C.kids()||[]).filter(k=>k[1]>0)};C.marks.push(m);return m`));
const loopUntil = (cond, label, maxMs) => ({ type: 'loop', cond, maxMs, label, body: [wait(5)] });

// In-page analysis of the k-th room clear (k=0 → last death, arena mode).
const analyzeClear = (k) => ev(iife(`const C=window.__r2;const ev=C.ev,rows=C.rows;
const rc=${k}>0?ev.filter(e=>e.type==='room_cleared')[${k}-1]:null;
const deaths=ev.filter(e=>e.type==='death'&&(!rc||e.tick<=rc.tick));const d=deaths[deaths.length-1];
if(!d)return {tag:'clear${k}',missing:true,rc:rc&&rc.tick,ev:ev.length};
const T=rc?rc.tick:d.tick;const h=ev.find(e=>e.type==='hit'&&e.target===d.id&&e.tick===d.tick)||null;const amt=h?String(h.amount):null;
const visCount=(r,txt)=>(r.kids||[]).filter(x=>x[0]===txt&&x[1]>0).length;
const before=Math.max(0,...rows.filter(r=>r.t>=d.tick-3&&r.t<d.tick).map(r=>visCount(r,amt)));
const afterRows=rows.filter(r=>r.t>=d.tick&&r.t<=d.tick+8);
const firstNew=afterRows.find(r=>visCount(r,amt)>before)||null;
const near=(r)=>(r.kids||[]).filter(x=>x[0]===amt&&x[1]>0&&d.scr&&Math.hypot(x[2]-d.scr[0],x[3]-d.scr[1])<160);
const nearAny=afterRows.some(r=>near(r).length>0);
const seg=rows.filter(r=>r.t>=T-4&&r.t<=T+30).map(r=>[r.t,r.ms,r.num,r.ui,r.ph,r.en,r.rs,JSON.stringify((r.kids||[]).filter(x=>x[1]>=0))]);
let gaps=[];const seg2=rows.filter(r=>r.t>=T-10&&r.t<=T+40);for(let i=1;i<seg2.length;i++){const g=seg2[i].ms-seg2[i-1].ms;if(g>40)gaps.push([seg2[i].t,g]);}
const evs=ev.filter(e=>e.tick>=T-3&&e.tick<=T+30&&!/^(sound|ally_basic|ally_cast|basic_fire|skill_cast)$/.test(e.type)).map(e=>{const o=Object.assign({},e);return JSON.stringify(o).slice(0,220);});
const ring=(()=>{try{return E.events.filter(e=>e.tick===d.tick).map(e=>e.type+(e.amount!=null?'('+e.amount+')':'')+(e.target!=null?'#'+e.target:'')+(e.id!=null&&e.type==='death'?'#'+e.id:''));}catch(e){return String(e)}})();
return {tag:'clear${k}',clearTick:rc?rc.tick:null,clearFr:rc?rc.fr:null,deathTick:d.tick,deathFr:d.fr,sameTick:!!(rc&&rc.tick===d.tick),death:{id:d.id,kind:d.kind,scr:d.scr,x:d.x,z:d.z},hit:h?{amt:h.amount,src:h.source??h.src??h.skill??null,attacker:h.attacker}:null,visBefore:before,numeral:!!firstNew,numeralAt:firstNew?firstNew.t-d.tick:null,numeralNearDeath:nearAny,hitstop:ev.filter(e=>e.type==='hitstop'&&e.tick>=d.tick&&e.tick<=d.tick+2).map(e=>e.ticks+':'+e.cause),sound:ev.filter(e=>e.type==='sound'&&e.tick>=d.tick&&e.tick<=d.tick+2).map(e=>e.slot),ringAtDeathTick:ring,events:evs,gaps,rows:seg,marks:C.marks.slice(-8)}`));

// Per-kill table (all deaths so far).
const killTable = (tag) => ev(iife(`const C=window.__r2;const ev=C.ev,rows=C.rows;const out=[];
const visCount=(r,txt)=>(r.kids||[]).filter(x=>x[0]===txt&&x[1]>0).length;
for(const d of ev.filter(e=>e.type==='death')){const h=ev.find(e=>e.type==='hit'&&e.target===d.id&&e.tick===d.tick);const amt=h?String(h.amount):null;
  const before=Math.max(0,...rows.filter(r=>r.t>=d.tick-3&&r.t<d.tick).map(r=>visCount(r,amt)));const after=rows.filter(r=>r.t>=d.tick&&r.t<=d.tick+8);const first=after.find(r=>visCount(r,amt)>before)||null;
  const rc=ev.find(e=>e.type==='room_cleared'&&e.tick===d.tick);const framesAt=rows.filter(r=>r.t===d.tick).length;
  out.push({t:d.tick,id:d.id,amt,clearing:!!rc,num:!!first,at:first?first.t-d.tick:null,framesRenderedOnTick:framesAt,visBefore:before});}
const hits=ev.filter(e=>e.type==='hit'&&e.target>=4);let hitsNum=0;for(const h of hits){const amt=String(h.amount);const before=Math.max(0,...rows.filter(r=>r.t>=h.tick-3&&r.t<h.tick).map(r=>visCount(r,amt)));if(rows.some(r=>r.t>=h.tick&&r.t<=h.tick+8&&visCount(r,amt)>before))hitsNum++;}
let big=[];for(let i=1;i<rows.length;i++){const g=rows[i].ms-rows[i-1].ms;if(g>100)big.push([rows[i].t,g]);}
const m={};for(const e of ev)m[e.type]=(m[e.type]||0)+1;
return {tag:${JSON.stringify(tag)},kills:out.length,killsWithNumeral:out.filter(k=>k.num).length,missing:out.filter(k=>!k.num),clearingKills:out.filter(k=>k.clearing),hits:hits.length,hitsWithNumeral:hitsNum,frameGapsOver100:big,frames:C.frames,rowsN:rows.length,fps:E.fps,version:E.version,seed:E.seed,driverErr:C.driverErr,pollErr:C.pollErr,counts:m,rows:out}`));

const end = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,ui:E.runUi().screen,roomState:s.room,enemies:s.enemies.length}`));

const files = {};
// ---- natural run, rooms 1..3, listener-free sampler; shots at first kill (control) and at every clear
const runSeq = (n) => [
  arm, startRun, waitCombat, iframe, { type: 'mousemove', x: 800, y: 450 }, driver(150000),
  loopUntil(`window.__r2.deaths>=1`, 'death1', 60000), mark('kill1-shot'), shot(`certC1-ref0-r2-${n}-kill1`), mark('kill1-shot-done'),
  loopUntil(`window.__r2.clears>=1`, 'clear1', 90000), mark('clear1-shot'), shot(`certC1-ref0-r2-${n}-clear1`), mark('clear1-shot-done'),
  wait(400), analyzeClear(1),
  loopUntil(`window.__r2.clears>=2`, 'clear2', 90000), mark('clear2-shot'), shot(`certC1-ref0-r2-${n}-clear2`), mark('clear2-shot-done'),
  wait(400), analyzeClear(2),
  loopUntil(`window.__r2.clears>=3`, 'clear3', 90000), mark('clear3-shot'), shot(`certC1-ref0-r2-${n}-clear3`), mark('clear3-shot-done'),
  wait(400), analyzeClear(3), stopDriver, killTable(`${n}-kills`), end(`${n}-end`),
];
files['certC1-ref0-r2-run555'] = runSeq('s555');
files['certC1-ref0-r2-run9001'] = runSeq('s9001');

// ---- sanctioned harness boot ?scene=arena&room=kill_all — no run, no reward overlay
const arenaClearCond = `(()=>{const C=window.__r2;if(C.clears>=1)return true;const s=__echoes.state();return !!(s.room&&s.room.cleared)})()`;
files['certC1-ref0-r2-arena'] = [
  arm, waitArena, iframe, { type: 'mousemove', x: 800, y: 450 },
  loopUntil(`window.__r2.deaths>=1`, 'death1', 60000), mark('kill1-shot'), shot('certC1-ref0-r2-arena-kill1'), mark('kill1-shot-done'),
  { type: 'loop', cond: arenaClearCond, maxMs: 150000, label: 'arena-clear', body: [wait(5)] },
  mark('clear-shot'), shot('certC1-ref0-r2-arena-clear'), mark('clear-shot-done'),
  wait(400), analyzeClear(0), killTable('arena-kills'), end('arena-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
