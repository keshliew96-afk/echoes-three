// C2 natural-attack i-frames, take 2: alternate dash direction so the player never
// pins against a wall (round-1 design flaw in certC3-dash3). Plus a high-N telegraph
// confirmation (certC3-tele2).
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const files = {};

const ARM = ev(iife(`window.__c={ev:[]};for(const t of ['intent','dash_end','hit','hit_immune','sound','hitstop','death','room_cleared','enemy_spawn','telegraph_start','telegraph_resolve','enemy_fire','screenshake','wave_start','room_enter'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));
const SAMPLER = ev(iife(`window.__s={rows:[],kd:[],last:-1};
  const f=()=>{const t=E.tick;if(t!==window.__s.last){const p=E.state().party[0];
    window.__s.rows.push([t,+p.x.toFixed(3),+p.z.toFixed(3),p.dashTicksLeft|0,p.hp]);window.__s.last=t;}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  addEventListener('keydown',e=>{if(!e.repeat)window.__s.kd.push([e.code,E.tick]);},true);
  return 'sampler armed at '+E.tick`));

const pair = (mv) => [down(mv), wait(40), down('Space'), wait(90), up('Space'), up(mv), wait(1200)];
const trials = [];
for (let i = 0; i < 12; i++) { trials.push(...pair(i % 2 ? 'KeyA' : 'KeyD')); }

files['certC3-dash4'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 30000),
  ev(iife(`E.cmd('teleport',-3,2);
    for(const e of E.state().enemies)E.cmd('iframe',e.id,30000);
    const id=E.cmd('spawn','boar',-3.0,2.7);window.__biter=id;
    (async()=>{while(true){if(E.state().party[0].hp<70)E.cmd('heal',0,100);await new Promise(r=>setTimeout(r,100));}})();
    return {biter:JSON.stringify(id),enemies:E.state().enemies.map(e=>[e.id,e.kind,e.iframed])}`)),
  wait(700),
  SAMPLER,
  ...trials,
  wait(400),
  ev(iife(`const evs=window.__c.ev,S=window.__s.rows;
    const dashes=[];for(const i of evs.filter(e=>e.T==='intent'&&e.kind==='dodge')){
      const de=evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick);
      const a=S.filter(r=>r[0]<=i.tick).pop(),b=S.find(r=>r[0]>=(de?de.tick:i.tick+15));
      dashes.push({start:i.tick,end:de?de.tick:null,cause:de?de.cause:null,dur:de?de.tick-i.tick:null,
        travel:a&&b?+Math.hypot(b[1]-a[1],b[2]-a[2]).toFixed(3):null});}
    const full=dashes.filter(d=>d.dur>=10);
    const inside=(t)=>full.find(d=>t>d.start&&t<d.end);
    const hits=evs.filter(e=>e.T==='hit'&&e.target===0);
    const imm=evs.filter(e=>e.T==='hit_immune'&&e.target===0);
    return {fps:E.fps,tick:E.tick,dashes:dashes.length,fullDashes:full.length,
      hitsTotal:hits.length,hitsInsideFullDash:hits.filter(h=>inside(h.tick)).map(h=>[h.tick,h.amount]),
      immuneTotal:imm.length,immuneInsideFullDash:imm.filter(h=>inside(h.tick)).map(h=>[h.tick,h.reason]),
      dashSpans:full.map(d=>[d.start,d.end,d.cause,d.dur,d.travel]),
      allDashes:dashes.map(d=>[d.start,d.end,d.cause,d.dur,d.travel]),
      hitTicks:hits.map(h=>h.tick),immTicks:imm.map(h=>[h.tick,h.reason])}`)),
];

// ---- high-N telegraph confirmation: a mantis line-up, player i-framed ----
files['certC3-tele2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');
    (async()=>{while(true){try{E.cmd('iframe',0,600);if(E.state().party[0].hp<100)E.cmd('heal',0,100);
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
      const ms=E.state().enemies.filter(e=>e.kind==='mantis');
      if(ms.length<6){for(let i=ms.length;i<6;i++){const a=i*1.05;E.cmd('spawn','mantis',+(Math.cos(a)*5).toFixed(2),+(Math.sin(a)*5).toFixed(2));}}
      for(const e of E.state().enemies)E.cmd('iframe',e.id,600);}catch(err){window.__err=String(err);}
      await new Promise(r=>setTimeout(r,300));}})();
    return {seed:E.seed,tick:E.tick}`)),
  wait(65000),
  ev(iife(`const evs=window.__c.ev;const rows=[];
    for(const s of evs.filter(e=>e.T==='telegraph_start')){
      const r=evs.find(e=>e.T==='telegraph_resolve'&&e.id===s.id&&e.tick>=s.tick);
      const f=evs.find(e=>e.T==='enemy_fire'&&e.id===s.id&&e.tick>=s.tick&&e.tick<=s.tick+60);
      const d=evs.find(e=>e.T==='death'&&e.id===s.id&&e.tick>=s.tick);
      rows.push([s.id,s.tick,s.resolveTick,s.resolveTick-s.tick,r?r.tick:null,r?r.tick-s.tick:null,f?f.tick:null,d?d.tick:null]);}
    const gaps=rows.filter(r=>r[5]!=null).map(r=>r[5]);
    const starts=rows.map(r=>r[1]);const interStart=[];for(let i=1;i<starts.length;i++)interStart.push(starts[i]-starts[i-1]);
    return {tick:E.tick,fps:E.fps,err:window.__err||null,n:rows.length,resolved:gaps.length,
      minPlanned:Math.min.apply(null,rows.map(r=>r[3])),maxPlanned:Math.max.apply(null,rows.map(r=>r[3])),
      minGap:gaps.length?Math.min.apply(null,gaps):null,maxGap:gaps.length?Math.max.apply(null,gaps):null,
      belowGate:gaps.filter(g=>g<42).length,fireAtResolve:rows.filter(r=>r[4]!=null&&r[6]===r[4]).length,
      minInterStart:interStart.length?Math.min.apply(null,interStart):null,rows}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
