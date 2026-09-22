// Certification C round 5 — fourth-pass generator: threat pointer direction probe (certC5-threat2).
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const THREAT = (tag) => ev(iife(`const t=E.hud.threat();
  const chips=[...document.querySelectorAll('#hud-threat *')].filter(n=>{const s=getComputedStyle(n);return s.display!=='none'&&/matrix/.test(s.transform||'')&&n.getBoundingClientRect().width>4;});
  const dom=chips.map(n=>{const r=n.getBoundingClientRect();const m=/matrix\\(([^)]+)\\)/.exec(getComputedStyle(n).transform||'');let deg=null;if(m){const v=m[1].split(',').map(Number);deg=+(Math.atan2(v[1],v[0])*180/Math.PI).toFixed(1);}
    const kids=[...n.querySelectorAll('*')].map(k=>{const kr=k.getBoundingClientRect();return [k.tagName.toLowerCase(),(k.className&&k.className.baseVal!==undefined?k.className.baseVal:k.className)||'',Math.round(kr.x),Math.round(kr.y),Math.round(kr.width),Math.round(kr.height),(getComputedStyle(k).transform||'none').slice(0,40)]});
    return {box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],center:[Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)],deg,kids,html:n.outerHTML.slice(0,900)}});
  const thr=(t.threats||[]).map(x=>[x.key,x.kind,x.sx,x.sy,x.onScreen,x.inSafeFrame,x.marker,x.markerIndex]);
  const expect=thr.filter(x=>x[6]).map(x=>{const c=dom[x[7]]||dom[0];if(!c)return null;const dx=x[2]-c.center[0],dy=x[3]-c.center[1];return [x[0],x[7],c.center,+(Math.atan2(dy,dx)*180/Math.PI).toFixed(1),c.deg]});
  return {tag:${JSON.stringify(tag)},tick:E.tick,gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,uncued:t.uncued,threats:thr,expectVsDom:expect,dom}`));

const files = {};
files['certC5-threat2'] = [
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick,version:E.version}`)),
  waitFor(`E.state().enemies.length>=3`, 40000),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');E.cmd('teleport',-9,6);
    const id=E.cmd('spawn','mantis',10,-6);for(const e of E.state().enemies)E.cmd('iframe',e.id,60000);
    return {tick:E.tick,id:String(id),enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1)])}`)),
  wait(1500),
  THREAT('one'),
  shot('certC5-threat2-one'),
  THREAT('one-post'),
  ev(iife(`const ids=[E.cmd('spawn','boar',10,6),E.cmd('spawn','boar',-10,-6),E.cmd('spawn','boar',-2,-9)];for(const e of E.state().enemies)E.cmd('iframe',e.id,60000);
    return {tick:E.tick,ids:ids.map(String),enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1)])}`)),
  wait(1500),
  THREAT('four'),
  shot('certC5-threat2-four'),
  THREAT('four-post'),
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
