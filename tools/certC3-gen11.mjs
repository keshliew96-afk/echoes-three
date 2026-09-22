// Numeral coverage at NATURAL hit density (no HP pinning, no crowding, no canvas
// readback so the frame budget stays cheap): does every enemy hit draw its numeral?
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;

const acts = [
  ev(iife(`window.__c={ev:[]};for(const t of ['hit','sound','hitstop','death','screenshake','room_cleared','room_enter','wave_start'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
    E.cmd('startRun');
    (async()=>{while(true){try{const u=E.runUi();
      if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
      else if(u.screen==='shop')E.cmd('shopAdvance');
      E.cmd('iframe',0,600);if(E.state().party[0].hp<100)E.cmd('heal',0,100);}catch(e){}
      await new Promise(r=>setTimeout(r,250));}})();
    return {seed:E.seed,tick:E.tick}`)),
  wait(1500),
  ev(iife(`const layer=document.querySelector('#dmg-num-layer');
    window.__n={num:[],seen:[],state:new Map(),frames:0,tick:[],last:-1,lastWall:0,pool:[]};
    const N=window.__n;
    const f=()=>{N.frames++;const t=E.tick;const now=performance.now();
      if(t!==N.last){if(N.last>=0)N.tick.push([N.last,+(now-N.lastWall).toFixed(1),t-N.last]);N.last=t;N.lastWall=now;
        const s=E.state();N.pool.push([t,(s.vfx.arena?s.vfx.arena.numerals:s.vfx.numerals)|0]);}
      for(const n of layer.querySelectorAll('.dmg-num')){const st=getComputedStyle(n);
        const v=st.display!=='none'&&st.visibility!=='hidden'&&parseFloat(st.opacity||'1')>0.05;
        const txt=(n.textContent||'').trim();const prev=N.state.get(n)||{v:false,txt:''};
        if(v){const r=n.getBoundingClientRect();
          N.seen.push([t,txt,Math.round(r.x),Math.round(r.y)]);
          if(!prev.v||prev.txt!==txt)N.num.push([t,txt,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),st.color]);}
        N.state.set(n,{v,txt});}
      if(N.seen.length>60000)N.seen.splice(0,30000);
      requestAnimationFrame(f);};requestAnimationFrame(f);
    return 'numeral tracker armed at '+E.tick`)),
  wait(70000),
  ev(iife(`const N=window.__n,evs=window.__c.ev;const ENEMY={boar:1,mantis:1,stag:1};
    const hits=evs.filter(e=>e.T==='hit'&&ENEMY[e.kind]);
    const used=new Set();const rows=[];
    for(const h of hits){const T=h.tick;let m=null;
      for(let i=0;i<N.num.length;i++){const n=N.num[i];if(used.has(i))continue;
        if(n[0]>=T-1&&n[0]<=T+3&&n[1]===String(h.amount)){m=n;used.add(i);break;}}
      let seen=null;if(!m){for(const n of N.seen){if(n[0]>=T&&n[0]<=T+8&&n[1]===String(h.amount)){seen=n;break;}}}
      const pa=N.pool.filter(p=>p[0]<=T-1).pop(),pb=N.pool.find(p=>p[0]>=T+2);
      const kill=evs.some(e=>e.T==='death'&&e.id===h.target&&e.tick>=T&&e.tick<=T+1);
      const clear=evs.some(e=>e.T==='room_cleared'&&e.tick>=T&&e.tick<=T+1);
      rows.push({t:T,src:h.source,amt:h.amount,kill,clear,num:m?m[1]+'@'+m[2]+','+m[3]:null,
        color:m?m[6]:null,seen:seen?seen[1]+'@'+seen[2]+','+seen[3]:null,
        pool:pa&&pb?[pa[1],pb[1]]:null,snd:evs.some(e=>e.T==='sound'&&e.tick>=T&&e.tick<=T+2)});}
    const miss=rows.filter(r=>!r.num&&!r.seen);
    const gaps=N.tick.map(r=>r[1]).sort((a,b)=>a-b);
    return {tick:E.tick,fps:E.fps,frames:N.frames,hits:rows.length,kills:rows.filter(r=>r.kill).length,
      numeralFresh:rows.filter(r=>r.num).length,numeralAny:rows.filter(r=>r.num||r.seen).length,
      soundOk:rows.filter(r=>r.snd).length,poolStep:rows.filter(r=>r.pool&&r.pool[1]>r.pool[0]).length,
      missing:miss.map(r=>[r.t,r.src,r.amt,r.kill?'kill':'',r.clear?'CLEARS':'']),
      clearingKills:rows.filter(r=>r.clear).map(r=>[r.t,r.src,r.amt,r.num||('seen:'+r.seen)]),
      rooms:evs.filter(e=>e.T==='room_enter').map(e=>[e.tick,e.index,e.mode]),
      clears:evs.filter(e=>e.T==='room_cleared').map(e=>e.tick),
      frameGaps:{n:gaps.length,median:gaps[Math.floor(gaps.length/2)],p99:gaps[Math.floor(gaps.length*0.99)],max:gaps[gaps.length-1],over100:gaps.filter(g=>g>100).length},
      sample:rows.slice(0,24).map(r=>[r.t,r.src,r.amt,r.num||('seen:'+r.seen),r.color,r.pool])}`)),
];
writeFileSync('tools/actions/certC3-numaudit.json', JSON.stringify(acts, null, 1));
console.log('wrote certC3-numaudit', acts.length);
