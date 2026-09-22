// Certification block E round 3 — action generator. Prefix certE3-.
// All JSON written programmatically via JSON.stringify. Never hand-escaped.
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

// Camp spec polylines (read from src/env/camp/spec.js — allowed by the block).
const PATHS = [
  { id: 'gate', w: 1.55, pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]] },
  { id: 'camp', w: 1.6, pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]] },
];

// ---- digest: everything E2/E5/E6 need, in one line ----
const digest = (tag) => ev(iife(`const c=E.cmd('campState');const vl=document.querySelector('#version-label')||document.querySelector('[id*=version]');const b=vl?vl.getBoundingClientRect():null;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:+(E.fps||0).toFixed(1),ver:E.version,scene:E.state().scene,colliders:c.colliders,roadViolations:c.roadViolations,rvType:typeof c.roadViolations,rvIsArray:Array.isArray(c.roadViolations),rvJSON:JSON.stringify(c.roadViolations),seats:c.seats,seatDrift:c.seatDrift,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt&&c.prompt.box,propTypes:c.propTypes,propShadows:c.propShadows,emitters:c.emitters,verText:vl&&vl.textContent,verBox:b&&[+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)],verOpacity:vl&&getComputedStyle(vl).opacity,verVis:vl&&getComputedStyle(vl).visibility}`));

// ---- sampled leg: teleport to start, ONE real keydown/keyup, 16 ms sim sampling ----
const legStart = (name, x, z) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name}'`)),
  wait(400),
  { type: 'mousemove', x: 800, y: 200 },
  ev(iife(`const c=E.cmd('campState');window.__L={n:${JSON.stringify(name)},t0:E.tick,p0:{x:c.player.x,z:c.player.z},s:[[E.tick,c.player.x,c.player.z]],upIdx:-1,upTick:-1};window.__L.iv=setInterval(()=>{const p=E.cmd('campState').player;window.__L.s.push([E.tick,p.x,p.z]);},16);return {leg:window.__L.n,start:[+c.player.x.toFixed(3),+c.player.z.toFixed(3)],asked:[${x},${z}]}`)),
];
const legEnd = (pathIdx) => [
  ev(iife(`window.__L.upIdx=window.__L.s.length;window.__L.upTick=E.tick;return 'up@'+E.tick`)),
  wait(200),
  ev(iife(`clearInterval(window.__L.iv);const L=window.__L;const s=L.s.slice(0,L.upIdx);
const P=${JSON.stringify(PATHS)}[${pathIdx}];
const segd=(px,pz,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1];const L2=vx*vx+vz*vz;let t=L2?((px-a[0])*vx+(pz-a[1])*vz)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(a[0]+t*vx),pz-(a[1]+t*vz));};
const offc=(px,pz)=>{let m=1e9;for(let i=0;i<P.pts.length-1;i++)m=Math.min(m,segd(px,pz,P.pts[i],P.pts[i+1]));return m;};
let pathLen=0,maxStall=0,cur=0,inBand=0;let offMin=1e9,offMax=-1;
for(let i=1;i<s.length;i++){const dd=Math.hypot(s[i][1]-s[i-1][1],s[i][2]-s[i-1][2]);const dt=s[i][0]-s[i-1][0];pathLen+=dd;if(dt>0&&dd/dt<0.004){cur+=dt;if(cur>maxStall)maxStall=cur;}else if(dt>0){cur=0;}}
for(const q of s){const o=offc(q[1],q[2]);if(o<offMin)offMin=o;if(o>offMax)offMax=o;if(o<=P.w/2)inBand++;}
const last=s[s.length-1];const chord=Math.hypot(last[1]-L.p0.x,last[2]-L.p0.z);
const tail=s.slice(-5);const tailMove=tail.length>1?Math.hypot(tail[tail.length-1][1]-tail[0][1],tail[tail.length-1][2]-tail[0][2]):0;
const ticks=L.upTick-L.t0;
const hearth=Math.hypot(last[1]-0,last[2]+0.2);
return {leg:L.n,path:P.id,samples:s.length,ticks:ticks,p0:[+L.p0.x.toFixed(3),+L.p0.z.toFixed(3)],p1:[+last[1].toFixed(3),+last[2].toFixed(3)],moved:+chord.toFixed(3),pathLen:+pathLen.toFixed(3),uPerSecPath:+(pathLen/(ticks/60)).toFixed(3),uPerSecChord:+(chord/(ticks/60)).toFixed(3),maxStallTicks:maxStall,stillMovingAtKeyup:+tailMove.toFixed(3),offCentreMin:+offMin.toFixed(3),offCentreMax:+offMax.toFixed(3),inBandPct:+(100*inBand/s.length).toFixed(1),distHearth:+hearth.toFixed(3),rv:E.cmd('campState').roadViolations}`)),
];
const leg = (name, x, z, key, ms, pathIdx) => [
  ...legStart(name, x, z), down(key), wait(ms), up(key), ...legEnd(pathIdx),
];

const files = {};

// ================= recon =================
files['certE3-recon'] = [
  digest('boot'),
  ev(iife(`const c=E.cmd('campState');return {keys:Object.keys(c),portal:c.portal,hearth:c.hearth,prompt:c.prompt,party:c.party&&(c.party.rigs||c.party),campPropTypes:c.campPropTypes,mode:c.mode,arena:c.arena}`)),
  ev(iife(`return {campSeats:E.cmd('campSeats'),allyState:JSON.stringify(E.cmd('allyState')||null).slice(0,600)}`)),
  ev(iife(`const n=[...document.querySelectorAll('body *')].filter(e=>/^v?\d+\.\d+\.\d+$/.test((e.textContent||'').trim())&&e.children.length===0);return n.map(e=>{const b=e.getBoundingClientRect();return [e.id||e.className,e.textContent.trim(),+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1),getComputedStyle(e).opacity]})`)),
];

// ================= E1 road legs =================
files['certE3-roadsGate'] = [
  digest('gate-head'),
  ...leg('G1 north-end (0.1,-7.60) S', 0.1, -7.60, 'KeyS', 2200, 0),
  ...leg('G2 south-end (0.2,7.60) W', 0.2, 7.60, 'KeyW', 2200, 0),
  ...leg('G3 (0.35,4.2) W toward hearth', 0.35, 4.2, 'KeyW', 2200, 0),
  ...leg('G4 (0.0,-5.9) S toward hearth', 0.0, -5.9, 'KeyS', 2200, 0),
  ...leg('G5 (0.3,1.6) S', 0.3, 1.6, 'KeyS', 2200, 0),
  ...leg('G6 (-0.1,-1.5) W through gate', -0.1, -1.5, 'KeyW', 2200, 0),
  digest('gate-tail'),
];
files['certE3-roadsW'] = [
  digest('w-head'),
  ...leg('C1 MANDATED (-4.0,1.3) A', -4.0, 1.3, 'KeyA', 2200, 1),
  ...leg('C2 MANDATED (-7.0,2.2) A', -7.0, 2.2, 'KeyA', 2200, 1),
  ...leg('C3 west-end (-11.60,3.35) D', -11.60, 3.35, 'KeyD', 2200, 1),
  ...leg('C5 (-9.0,2.7) D', -9.0, 2.7, 'KeyD', 2200, 1),
  ...leg('C12 (-6.5,1.3) D', -6.5, 1.3, 'KeyD', 2200, 1),
  ...leg('C10 (-2.4,0.85) A', -2.4, 0.85, 'KeyA', 2200, 1),
  digest('w-tail'),
];
files['certE3-roadsE'] = [
  digest('e-head'),
  ...leg('C4 east-end (11.60,-1.35) A', 11.60, -1.35, 'KeyA', 2200, 1),
  ...leg('C6 (2.6,0.3) D', 2.6, 0.3, 'KeyD', 2200, 1),
  ...leg('C7 (6.0,-0.4) D', 6.0, -0.4, 'KeyD', 2200, 1),
  ...leg('C8 (11.5,-1.2) A', 11.5, -1.2, 'KeyA', 2200, 1),
  ...leg('C9 (10.0,-1.0) A', 10.0, -1.0, 'KeyA', 2200, 1),
  ...leg('C11 (7.4,-0.3) A', 7.4, -0.3, 'KeyA', 2200, 1),
  digest('e-tail'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
}
