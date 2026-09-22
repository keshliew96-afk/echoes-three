// C2 dash re-run (cooldown-aware spacing + natural bite) and C3 telegraphs.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const files = {};

const ARM = ev(iife(`window.__c={ev:[]};for(const t of ['intent','dash_end','hit','hit_immune','sound','hitstop','death','room_cleared','enemy_spawn','telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','screenshake','flash','knockback','wave_start','room_enter','reward','draft','path_chosen','shop_buy','run_end','boss_quake_start','boss_quake_resolve'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const SAMPLER = ev(iife(`window.__s={rows:[],kd:[],last:-1};
  const f=()=>{const t=E.tick;if(t!==window.__s.last){const p=E.state().party[0];
    window.__s.rows.push([t,+p.x.toFixed(4),+p.z.toFixed(4),p.dashTicksLeft|0,p.hp,+performance.now().toFixed(1)]);window.__s.last=t;}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  addEventListener('keydown',e=>{if(!e.repeat)window.__s.kd.push([e.code,E.tick,+performance.now().toFixed(1)]);},true);
  return 'sampler armed at '+E.tick`));

// ---------------- C2 re-run ----------------
const dashArm = (n) => ev(iife(`window.__d=window.__d||[];const rec={trial:${n}};window.__d.push(rec);
  (async()=>{const t0=E.tick;
    while(E.tick-t0<240&&E.state().party[0].dashTicksLeft<=0)await new Promise(r=>setTimeout(r,4));
    const p=E.state().party[0];rec.dashSeenTick=E.tick;rec.dashTicksLeft=p.dashTicksLeft;rec.hpBefore=p.hp;
    rec.midHit=E.cmd('hitOnce',0);rec.midTick=E.tick;rec.hpAfterMid=E.state().party[0].hp;
    while(E.tick-t0<400&&E.state().party[0].dashTicksLeft>0)await new Promise(r=>setTimeout(r,4));
    rec.dashOverTick=E.tick;const w=E.tick;while(E.tick-w<6)await new Promise(r=>setTimeout(r,4));
    rec.postHit=E.cmd('hitOnce',0);rec.postTick=E.tick;rec.hpAfterPost=E.state().party[0].hp;rec.done=true;})();
  return 'armed '+${n}+' at '+E.tick`));

files['certC3-dash2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 30000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('teleport',-3,2);E.cmd('iframe',0,7200);E.cmd('spawn','boar',9,-6);E.cmd('spawn','boar',-9,-6);
    const st=E.state();for(const e of st.enemies)E.cmd('iframe',e.id,7200);
    return {enemies:st.enemies.map(e=>[e.id,e.kind]),player:[st.party[0].x,st.party[0].z,st.party[0].hp]}`)),
  wait(500),
  SAMPLER,
  // 5 plain latency trials, spaced 1500 ms (> the 72-tick dodge cooldown)
  ...[0, 1, 2, 3, 4].flatMap(() => [down('Space'), wait(90), up('Space'), wait(1500)]),
  wait(300),
  ev(iife(`const kd=window.__s.kd.filter(k=>k[0]==='Space');const evs=window.__c.ev;
    const rows=kd.map(rec=>{const t0=rec[1];const i=evs.find(e=>e.T==='intent'&&e.kind==='dodge'&&e.tick>=t0&&e.tick<=t0+12);
      const de=i?evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick):null;
      const S=window.__s.rows;const a=S.find(r=>r[0]>=t0);
      return {keydownTick:t0,intentTick:i?i.tick:null,latency:i?i.tick-t0:null,dashEnd:de?de.tick:null,cause:de?de.cause:null,duration:i&&de?de.tick-i.tick:null};});
    return {n:rows.length,fps:E.fps,rows}`)),
  // dash travel distance from the sampler
  ev(iife(`const evs=window.__c.ev,S=window.__s.rows;
    const out=evs.filter(e=>e.T==='intent'&&e.kind==='dodge').map(i=>{const de=evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick);
      const a=S.filter(r=>r[0]<=i.tick).pop(),b=S.find(r=>r[0]>=(de?de.tick:i.tick+15));
      return a&&b?{intent:i.tick,end:de?de.tick:null,travel:+Math.hypot(b[1]-a[1],b[2]-a[2]).toFixed(3)}:null;}).filter(Boolean);
    return out`)),
  // i-frame trials with the global i-frame cleared
  ev(iife(`E.cmd('iframe',0,0);E.cmd('heal',0,100);window.__d=[];return {hp:E.state().party[0].hp}`)),
  dashArm(1), down('Space'), wait(90), up('Space'), wait(1600),
  dashArm(2), down('Space'), wait(90), up('Space'), wait(1600),
  dashArm(3), down('Space'), wait(90), up('Space'), wait(1600),
  ev(iife(`return JSON.stringify(window.__d)`)),
  // natural adjacent enemy: un-i-frame one boar, park it beside the player, let it bite
  ev(iife(`E.cmd('heal',0,100);const id=E.cmd('spawn','boar',-3.0,2.6);
    return {spawned:JSON.stringify(id),enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.iframed])}`)),
  wait(2500),
  ev(iife(`const evs=window.__c.ev;return {bitesBefore:evs.filter(e=>e.T==='hit'&&e.target===0).map(e=>[e.tick,e.amount,e.source]),hp:E.state().party[0].hp,kd:window.__s.kd.length}`)),
  down('Space'), wait(90), up('Space'), wait(2500),
  ev(iife(`const evs=window.__c.ev,kd=window.__s.kd.filter(k=>k[0]==='Space');const last=kd[kd.length-1];
    const i=evs.filter(e=>e.T==='intent'&&e.kind==='dodge').pop();const de=evs.filter(e=>e.T==='dash_end').pop();
    return {lastSpaceKeydown:last?last[1]:null,intent:i?i.tick:null,dashEnd:de?de.tick:null,
      hitsOnPlayer:evs.filter(e=>e.T==='hit'&&e.target===0).map(e=>[e.tick,e.amount,e.source]),
      immuneOnPlayer:evs.filter(e=>e.T==='hit_immune'&&e.target===0).map(e=>[e.tick,e.reason]),
      hp:E.state().party[0].hp,fps:E.fps,tick:E.tick}`)),
];

// ---------------- C3 telegraph events over >= 60 s of Act-1 waves ----------------
files['certC3-tele'] = [
  ARM,
  ev(iife(`E.cmd('startRun');
    (async()=>{while(true){try{const u=E.runUi();
      if(u.screen==='draft')E.cmd('draftDecline');
      else if(u.screen==='path')E.cmd('pathChoose',0);
      else if(u.screen==='shop')E.cmd('shopAdvance');
      else if(u.screen==='reward'||u.screen==='reward_offer')E.cmd('draftDecline');
      if(E.state().party[0].hp<100)E.cmd('heal',0,100);
      E.cmd('iframe',0,600);}catch(err){window.__drverr=String(err);}
      await new Promise(r=>setTimeout(r,250));}})();
    return {seed:E.seed,tick:E.tick,modes:E.cmd('runState').frame.modes}`)),
  wait(70000),
  ev(iife(`const evs=window.__c.ev;const st=evs.filter(e=>e.T==='telegraph_start');
    return {tick:E.tick,fps:E.fps,elapsedTicks:E.tick-st[0]?0:0,starts:st.length,resolves:evs.filter(e=>e.T==='telegraph_resolve').length,
      fires:evs.filter(e=>e.T==='enemy_fire').length,deaths:evs.filter(e=>e.T==='death').length,
      rooms:evs.filter(e=>e.T==='room_enter').map(e=>[e.tick,e.index,e.mode]),waves:evs.filter(e=>e.T==='wave_start').length,
      drverr:window.__drverr||null,sampleStart:JSON.stringify(st[0]||null),sampleResolve:JSON.stringify(evs.find(e=>e.T==='telegraph_resolve')||null)}`)),
  ev(iife(`const evs=window.__c.ev;const rows=[];
    for(const s of evs.filter(e=>e.T==='telegraph_start')){
      const r=evs.find(e=>e.T==='telegraph_resolve'&&e.id===s.id&&e.tick>=s.tick);
      const f=evs.find(e=>e.T==='enemy_fire'&&e.id===s.id&&e.tick>=s.tick&&e.tick<=s.tick+60);
      const d=evs.find(e=>e.T==='death'&&e.id===s.id&&e.tick>=s.tick);
      rows.push([s.id,s.tick,s.resolveTick,s.resolveTick-s.tick,r?r.tick:null,r?r.tick-s.tick:null,f?f.tick:null,d?d.tick:null]);}
    const gaps=rows.filter(r=>r[5]!=null).map(r=>r[5]);
    return {n:rows.length,resolved:gaps.length,minPlanned:Math.min.apply(null,rows.map(r=>r[3])),maxPlanned:Math.max.apply(null,rows.map(r=>r[3])),
      minGap:gaps.length?Math.min.apply(null,gaps):null,maxGap:gaps.length?Math.max.apply(null,gaps):null,
      fireAtResolve:rows.filter(r=>r[4]!=null&&r[6]===r[4]).length,rows}`)),
  ev(iife(`const evs=window.__c.ev;return {firstTick:evs[0]?evs[0].tick:null,lastTick:evs[evs.length-1]?evs[evs.length-1].tick:null,
    counts:evs.reduce((m,e)=>{m[e.T]=(m[e.T]||0)+1;return m;},{}),enemies:E.state().enemies.length,run:JSON.stringify(E.cmd('runState')).slice(0,300)}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
