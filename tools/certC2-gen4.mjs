// certC2 batch 4: numeral audit. Same natural run as certC2-lastkill, but for
// EVERY death it dumps a wide DOM-numeral window [t-4,t+12], the victim's
// projected screen position at the death tick, the render-frame wall gap on that
// tick, and the vfx.numerals trace, so a "missing" numeral can be told apart
// from an observer/window artefact.
import { writeFileSync } from 'fs';
const ev = (c) => ({ type: 'eval', code: c });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;
const EVT = ['hit','death','room_cleared','sound','hitstop','enemy_despawn','wave_start','enemy_spawn'];
const arm = ev(iife(`
  window.__c={ev:[],dom:[],rows:[],started:performance.now()};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;
  const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  let last=-1;const f=()=>{const t=E.tick;if(t!==last){last=t;const s=E.state();const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(2),+e.z.toFixed(2)];const vfx=s.vfx||{};window.__c.rows.push({t,ms:Math.round(performance.now()-window.__c.started),num:vfx.numerals??null,en});if(window.__c.rows.length>20000)window.__c.rows.splice(0,8000);}requestAnimationFrame(f);};requestAnimationFrame(f);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer`));
const PROJ = `const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;const W=window.innerWidth,H=window.innerHeight;const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [Math.round((v.x*0.5+0.5)*W),Math.round((-v.y*0.5+0.5)*H)];};`;
const files = {};
files['certC2-numaudit'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,tick:E.tick,modes:r&&r.frame&&r.frame.modes}`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick};await sleep(20);}return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe t'+E.tick`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<175000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<40)E.cmd('setHp',0,1);if(window.__c.ev.filter(e=>e.T==='room_cleared').length>=3)return {ok:true,tick:E.tick,room:E.state().run.room};await sleep(60);}return {ok:false,tick:E.tick,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length}`)),
  ev(iife(`${PROJ}
    const ev=window.__c.ev;const rows=window.__c.rows;const byT=new Map();for(const r of rows)byT.set(r.t,r);
    const clears=ev.filter(e=>e.T==='room_cleared').map(e=>e.tick);
    const deaths=ev.filter(e=>e.T==='death'&&e.id>=4);
    const out=deaths.map(d=>{
      const h=ev.filter(e=>e.T==='hit'&&e.target===d.id&&e.tick>=d.tick-2&&e.tick<=d.tick).slice(-1)[0];
      const amt=h?String(Math.round(h.amount)):null;
      const win=window.__c.dom.filter(x=>x.t>=d.tick-4&&x.t<=d.tick+12);
      const exact=win.filter(x=>x.txt===amt);
      let pre=null;for(let k=d.tick-1;k>=d.tick-6;k--){if(byT.has(k)&&byT.get(k).en[d.id]){pre=byT.get(k);break;}}
      const pos=pre?pre.en[d.id]:null;
      const scr=pos?proj(pos[0],0.45,pos[1]):null;
      let gap=null;for(let i=1;i<rows.length;i++){if(rows[i].t>=d.tick){gap=rows[i].ms-rows[i-1].ms;break;}}
      const numTrace=rows.filter(r=>r.t>=d.tick-3&&r.t<=d.tick+6).map(r=>r.t+':'+r.num).join(' ');
      return {death:d.tick,id:d.id,amt,clears:clears.includes(d.tick),exact:exact.length,exactPos:exact.slice(0,1).map(x=>[x.t,x.x,x.y,x.w,x.h]),win:win.map(x=>[x.t,x.txt,x.x,x.y]),world:pos,screen:scr,onScreen:scr?(scr[0]>=-60&&scr[0]<=1660&&scr[1]>=-60&&scr[1]<=960):null,frameGapMs:gap,numTrace};});
    return JSON.stringify({clears,deaths:out.length,withNumeral:out.filter(o=>o.exact>0).length,missing:out.filter(o=>o.exact===0),clearing:out.filter(o=>o.clears)})`)),
  ev(iife(`const rows=window.__c.rows;const g=[];for(let i=1;i<rows.length;i++)g.push([rows[i].t,rows[i].ms-rows[i-1].ms]);const big=g.filter(x=>x[1]>100).slice(0,25);const s=g.map(x=>x[1]).sort((a,b)=>a-b);return {frames:rows.length,medianGapMs:s[Math.floor(s.length/2)],p99GapMs:s[Math.floor(s.length*0.99)],maxGapMs:s[s.length-1],gapsOver100ms:g.filter(x=>x[1]>100).length,worst:big}`)),
  wait(200),
];
for (const [n, a] of Object.entries(files)) { writeFileSync(`tools/actions/${n}.json`, JSON.stringify(a, null, 1)); console.log('wrote', n, a.length); }
