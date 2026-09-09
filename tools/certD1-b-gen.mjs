// certD1 (5th instance, audit-gap re-run) generator: builds tools/actions/certD1-b-draftdiag.json.
// Reuses the sampler-library / startRun / mouse steps of certD1-n-clear.json byte-for-byte and replaces the
// driver eval with a draft-screen diagnostic: per-frame dt tagged by screen, MutationObserver on #run-screen,
// document.getAnimations() and every run-screen element carrying an animation / filter / shadow+gradient.
import { readFileSync, writeFileSync } from 'fs';
const base = JSON.parse(readFileSync('tools/actions/certD1-n-clear.json', 'utf8'));
const diag = String.raw`(async()=>{
 const E=window.__echoes; const sl=ms=>new Promise(r=>setTimeout(r,ms));
 const t0=performance.now(); const out={drafts:[],paths:[],log:[],err:null};
 const fr=[]; let last=null; let run=true;
 const tick=(now)=>{ if(last!==null){ const dt=now-last; let scr='?'; try{scr=E.runUi().screen}catch(e){} fr.push([+(now-t0).toFixed(1),+dt.toFixed(2),scr,E.tick]); } last=now; if(run) requestAnimationFrame(tick); };
 requestAnimationFrame(tick);
 const muts=[]; let mo=null;
 const desc=(n)=>((n.id?'#'+n.id:'')+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ').filter(Boolean).slice(0,3).join('.'):'')||n.nodeName).slice(0,60);
 const ensureMO=()=>{ const rs=document.getElementById('run-screen'); if(!rs||mo) return; mo=new MutationObserver(list=>{ const n=performance.now()-t0; for(const m of list){ muts.push([+n.toFixed(1),m.type,m.attributeName||'',desc(m.target),m.addedNodes?m.addedNodes.length:0,m.removedNodes?m.removedNodes.length:0]); } }); mo.observe(rs,{attributes:true,childList:true,subtree:true,attributeFilter:['class','style']}); };
 let lastScreen=null; let roomsDone=0; const maxRooms=6; let combatSince=null; const started=performance.now();
 try{
 while(performance.now()-started<100000){
   ensureMO();
   let u=null,rs=null,st=null; try{u=E.runUi();rs=E.cmd('runState');st=E.state();}catch(e){}
   const scr=u?u.screen:null;
   if(scr!==lastScreen){ out.log.push([+(performance.now()-t0).toFixed(0),E.tick,scr,rs&&rs.phase,rs&&rs.room]);
     if(scr==='draft'){
        const openAt=performance.now()-t0; const openTick=E.tick; const frStart=fr.length; const muStart=muts.length;
        const cardsJson=JSON.stringify(u.cards||u).slice(0,400);
        const rsEl=document.getElementById('run-screen');
        await sl(1500);
        const seg=fr.slice(frStart); const gaps=seg.filter(f=>f[1]>50).map(f=>({at:+(f[0]-openAt).toFixed(0),dt:f[1],tick:f[3]}));
        const mu=muts.slice(muStart).map(m=>[+(m[0]-openAt).toFixed(0),m[1],m[2],m[3],m[4],m[5]]);
        let anims=[]; try{ anims=document.getAnimations().map(a=>{const ef=a.effect; const tg=ef&&ef.target; const tm=ef&&ef.getTiming?ef.getTiming():{}; return {name:a.animationName||a.id||(ef&&ef.constructor.name),target:tg?desc(tg):null,state:a.playState,cur:a.currentTime!=null?Math.round(a.currentTime):null,dur:tm.duration,iter:tm.iterations,delay:tm.delay}; }).slice(0,20);}catch(e){anims=[String(e).slice(0,80)];}
        const styled=[]; if(rsEl){ rsEl.querySelectorAll('*').forEach(n=>{ const c=getComputedStyle(n); if(c.display==='none')return; const an=c.animationName&&c.animationName!=='none'; const sh=c.boxShadow&&c.boxShadow!=='none'; const bg=c.backgroundImage&&c.backgroundImage!=='none'; const fl=c.filter&&c.filter!=='none'; const bd=(c.backdropFilter||c.webkitBackdropFilter||'none')!=='none'; if(an||fl||bd||(sh&&bg)){ const r=n.getBoundingClientRect(); styled.push({el:desc(n),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],anim:an?c.animationName+' '+c.animationDuration+' '+c.animationDelay+' '+c.animationIterationCount:null,filter:fl?c.filter:null,backdrop:bd?(c.backdropFilter||c.webkitBackdropFilter):null,shadow:sh?c.boxShadow.slice(0,50):null,bg:bg?c.backgroundImage.slice(0,60):null,willChange:c.willChange}); } }); }
        const txt=cardsJson+(rsEl?rsEl.textContent:'');
        const rarity=/legendary/i.test(txt)?'legendary':(/rare/i.test(txt)?'rare':(/common/i.test(txt)?'common':'?'));
        out.drafts.push({room:rs&&rs.room,openAt:+openAt.toFixed(0),openTick,rarity,cards:cardsJson.slice(0,200),frames:seg.length,maxDt:seg.length?+Math.max(...seg.map(f=>f[1])).toFixed(1):null,gaps,mutations:mu.length,mutSample:mu.slice(0,40),anims,styled:styled.slice(0,15)});
        try{E.cmd('draftTake');}catch(e){}
     } else if(scr==='path'){ const openAt=performance.now()-t0; const frStart=fr.length; await sl(700); const seg=fr.slice(frStart); out.paths.push({room:rs&&rs.room,openAt:+openAt.toFixed(0),maxDt:seg.length?+Math.max(...seg.map(f=>f[1])).toFixed(1):null,gaps:seg.filter(f=>f[1]>50).map(f=>({at:+(f[0]-openAt).toFixed(0),dt:f[1],tick:f[3]}))}); try{E.cmd('pathChoose',0);}catch(e){} roomsDone++; if(roomsDone>=maxRooms) break; combatSince=null; }
     else if(scr==='shop'||scr==='victory'||scr==='defeat'||scr==='end'){ break; }
     lastScreen=scr; }
   if(rs&&rs.phase==='combat'&&(scr==='none'||scr===null)){ if(combatSince===null) combatSince=performance.now(); const rm=rs.room; const age=performance.now()-combatSince;
      const mode=(st&&st.room&&st.room.mode)||rs.mode||null;
      if(mode==='defend'&&age>1500){ try{E.cmd('clearRoom');}catch(e){} combatSince=performance.now(); }
      else if(rm>=4&&mode!=='defend'&&age>1500){ try{E.cmd('killAllEnemies');}catch(e){} combatSince=performance.now(); } }
   await sl(30);
 }
 }catch(e){ out.err=String(e).slice(0,200); }
 run=false; if(mo) mo.disconnect();
 out.totalFrames=fr.length; out.spanMs=fr.length?Math.round(fr[fr.length-1][0]-fr[0][0]):0; out.allGaps100=fr.filter(f=>f[1]>100).map(f=>({at:f[0],dt:f[1],screen:f[2],tick:f[3]}));
 out.final={screen:lastScreen,tick:E.tick,room:(()=>{try{return E.cmd('runState').room}catch(e){return null}})()};
 return out;
})()`;
// base: [0] lib, [1] env, [2] startRun, [3] mousemove, [4] mousedown, [5] driver+sample, [6] mouseup, [7] filter probe, [8] vfx
const actions = [base[0], base[1], base[2], base[3], base[4], { type: 'eval', code: diag }, base[6], base[8]];
writeFileSync('tools/actions/certD1-b-draftdiag.json', JSON.stringify(actions, null, 1));
console.log('wrote tools/actions/certD1-b-draftdiag.json', actions.length, 'actions; base had', base.length);
