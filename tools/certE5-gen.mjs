// Certification block E round 5 — action generator. Prefix certE5-.
// All JSON written programmatically via JSON.stringify. Never hand-escaped.
// Every eval is an IIFE sharing one page scope; sampled legs poll campState() every 16 ms.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const J = JSON.stringify;

// Camp spec polylines (read from src/env/camp/spec.js — allowed by the block).
const PATHS = [
  { id: 'gate', w: 1.55, pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]] },
  { id: 'camp', w: 1.6, pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]] },
];

// ---- digest: everything E2/E5/E6 need, in one line ----
const digest = (tag) => ev(iife(`const c=E.cmd('campState');const vl=document.querySelector('#version-label')||document.querySelector('[id*=version]');const b=vl?vl.getBoundingClientRect():null;return {tag:${J(tag)},tick:E.tick,fps:+(E.fps||0).toFixed(1),ver:E.version,scene:E.state().scene,colliders:c.colliders,roadViolations:c.roadViolations,rvType:typeof c.roadViolations,rvIsArray:Array.isArray(c.roadViolations),rvJSON:JSON.stringify(c.roadViolations),seats:c.seats,seatDrift:c.seatDrift,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt&&c.prompt.box,propTypes:c.propTypes,propShadows:c.propShadows,emitters:c.emitters,verText:vl&&vl.textContent,verBox:b&&[+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)],verOpacity:vl&&getComputedStyle(vl).opacity,verVis:vl&&getComputedStyle(vl).visibility}`));

// ---- sampled leg: teleport to start, ONE real keydown/keyup, 16 ms sim sampling ----
const legStart = (name, x, z) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name}'`)),
  wait(400),
  { type: 'mousemove', x: 800, y: 200 },
  ev(iife(`const c=E.cmd('campState');window.__L={n:${J(name)},t0:E.tick,p0:{x:c.player.x,z:c.player.z},s:[[E.tick,c.player.x,c.player.z]],upIdx:-1,upTick:-1};window.__L.iv=setInterval(()=>{const p=E.cmd('campState').player;window.__L.s.push([E.tick,p.x,p.z]);},16);return {leg:window.__L.n,start:[+c.player.x.toFixed(3),+c.player.z.toFixed(3)],asked:[${x},${z}]}`)),
];
const legEnd = (pathIdx) => [
  ev(iife(`window.__L.upIdx=window.__L.s.length;window.__L.upTick=E.tick;return 'up@'+E.tick`)),
  wait(200),
  ev(iife(`clearInterval(window.__L.iv);const L=window.__L;const s=L.s.slice(0,L.upIdx);
const P=${J(PATHS)}[${pathIdx}];
const segd=(px,pz,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1];const L2=vx*vx+vz*vz;let t=L2?((px-a[0])*vx+(pz-a[1])*vz)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(a[0]+t*vx),pz-(a[1]+t*vz));};
const offc=(px,pz)=>{let m=1e9;for(let i=0;i<P.pts.length-1;i++)m=Math.min(m,segd(px,pz,P.pts[i],P.pts[i+1]));return m;};
let pathLen=0,maxStall=0,cur=0,inBand=0;let offMin=1e9,offMax=-1;
for(let i=1;i<s.length;i++){const dd=Math.hypot(s[i][1]-s[i-1][1],s[i][2]-s[i-1][2]);const dt=s[i][0]-s[i-1][0];pathLen+=dd;if(dt>0&&dd/dt<0.004){cur+=dt;if(cur>maxStall)maxStall=cur;}else if(dt>0){cur=0;}}
for(const q of s){const o=offc(q[1],q[2]);if(o<offMin)offMin=o;if(o>offMax)offMax=o;if(o<=P.w/2)inBand++;}
const last=s[s.length-1];const chord=Math.hypot(last[1]-L.p0.x,last[2]-L.p0.z);
const tail=s.slice(-5);const tailMove=tail.length>1?Math.hypot(tail[tail.length-1][1]-tail[0][1],tail[tail.length-1][2]-tail[0][2]):0;
const ticks=L.upTick-L.t0;
const hearth=Math.hypot(last[1]-0,last[2]+0.2);
const cs=E.cmd('campState');
return {leg:L.n,path:P.id,samples:s.length,ticks:ticks,p0:[+L.p0.x.toFixed(3),+L.p0.z.toFixed(3)],p1:[+last[1].toFixed(3),+last[2].toFixed(3)],moved:+chord.toFixed(3),pathLen:+pathLen.toFixed(3),uPerSecPath:+(pathLen/(ticks/60)).toFixed(3),uPerSecChord:+(chord/(ticks/60)).toFixed(3),maxStallTicks:maxStall,stillMovingAtKeyup:+tailMove.toFixed(3),offCentreMin:+offMin.toFixed(3),offCentreMax:+offMax.toFixed(3),inBandPct:+(100*inBand/s.length).toFixed(1),distHearth:+hearth.toFixed(3),rv:cs.roadViolations,colliders:cs.colliders}`)),
];
const leg = (name, x, z, key, ms, pathIdx) => [
  ...legStart(name, x, z), down(key), wait(ms), up(key), ...legEnd(pathIdx),
];

const tp = (name, x, z) => [ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name} ${x},${z}'`)), wait(400), { type: 'mousemove', x: 800, y: 200 }];
const sampStart = (name) => ev(iife(`const c=E.cmd('campState');window.__L={n:${J(name)},t0:E.tick,p0:{x:c.player.x,z:c.player.z},s:[[E.tick,c.player.x,c.player.z]]};window.__L.iv=setInterval(()=>{const p=E.cmd('campState').player;window.__L.s.push([E.tick,p.x,p.z]);},16);return {walk:${J(name)},from:[+c.player.x.toFixed(3),+c.player.z.toFixed(3)]}`));
const sampEnd = (name, target, tx, tz, pathIdx) => ev(iife(`clearInterval(window.__L.iv);const L=window.__L;const s=L.s;
const P=${J(PATHS)}[${pathIdx}];
const segd=(px,pz,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1];const L2=vx*vx+vz*vz;let t=L2?((px-a[0])*vx+(pz-a[1])*vz)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(a[0]+t*vx),pz-(a[1]+t*vz));};
const offc=(px,pz)=>{let m=1e9;for(let i=0;i<P.pts.length-1;i++)m=Math.min(m,segd(px,pz,P.pts[i],P.pts[i+1]));return m;};
let pathLen=0,maxStall=0,cur=0,offMax=-1,offMin=1e9;
for(let i=1;i<s.length;i++){const dd=Math.hypot(s[i][1]-s[i-1][1],s[i][2]-s[i-1][2]);const dt=s[i][0]-s[i-1][0];pathLen+=dd;if(dt>0&&dd/dt<0.004){cur+=dt;if(cur>maxStall)maxStall=cur;}else if(dt>0)cur=0;}
for(const q of s){const o=offc(q[1],q[2]);if(o<offMin)offMin=o;if(o>offMax)offMax=o;}
const c=E.cmd('campState');const p=c.player;
const tail=s.slice(-5);const tailMove=tail.length>1?Math.hypot(tail[tail.length-1][1]-tail[0][1],tail[tail.length-1][2]-tail[0][2]):0;
const vis=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/Begin Run|wood is waiting/i.test(e.textContent||'')).map(e=>{const b=e.getBoundingClientRect();return [(e.textContent||'').trim().slice(0,40),+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1),getComputedStyle(e).opacity,getComputedStyle(e).visibility]});
return {walk:L.n,target:${J(target)},tgt:[${tx},${tz}],end:[+p.x.toFixed(3),+p.z.toFixed(3)],dist:+Math.hypot(p.x-(${tx}),p.z-(${tz})).toFixed(3),ticks:E.tick-L.t0,pathLen:+pathLen.toFixed(3),maxStallTicks:maxStall,stillMoving:+tailMove.toFixed(3),offCentreMin:+offMin.toFixed(3),offCentreMax:+offMax.toFixed(3),inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box,promptOverlaps:c.prompt.overlaps,distPortal:+Math.hypot(p.x-0,p.z+6.9).toFixed(3),portalR:c.portal&&c.portal.radius,promptDOM:vis,rv:c.roadViolations,seatDrift:c.seatDrift}`));
const hold = (k, ms) => [down(k), wait(ms), up(k)];
const hold2 = (k1, k2, ms) => [down(k1), down(k2), wait(ms), up(k1), up(k2)];

const files = {};

// ================= recon =================
files['certE5-recon'] = [
  digest('boot'),
  ev(iife(`const c=E.cmd('campState');return {keys:Object.keys(c),portal:c.portal,hearth:c.hearth,prompt:c.prompt,party:c.party&&(c.party.rigs||c.party),campPropTypes:c.campPropTypes,emitterKinds:c.emitterKinds,mode:c.mode,arena:c.arena}`)),
  ev(iife(`return {campSeats:E.cmd('campSeats'),allyState:JSON.stringify(E.cmd('allyState')||null).slice(0,600)}`)),
  ev(iife(`const re=new RegExp('^v?[0-9]+[.][0-9]+[.][0-9]+$');const n=[...document.querySelectorAll('body *')].filter(e=>re.test((e.textContent||'').trim())&&e.children.length===0);return n.map(e=>{const b=e.getBoundingClientRect();return [e.id||e.className,e.textContent.trim(),+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1),getComputedStyle(e).opacity]})`)),
];

// ================= E1 road legs =================
files['certE5-roadsGate'] = [
  digest('gate-head'),
  ...leg('G1 north-end (0.1,-7.60) S', 0.1, -7.60, 'KeyS', 2200, 0),
  ...leg('G2 south-end (0.2,7.60) W', 0.2, 7.60, 'KeyW', 2200, 0),
  ...leg('G3 (0.35,4.2) W toward hearth', 0.35, 4.2, 'KeyW', 2200, 0),
  ...leg('G4 (0.0,-5.9) S toward hearth', 0.0, -5.9, 'KeyS', 2200, 0),
  ...leg('G5 (0.3,1.6) S', 0.3, 1.6, 'KeyS', 2200, 0),
  ...leg('G6 (-0.1,-1.5) W through gate', -0.1, -1.5, 'KeyW', 2200, 0),
  digest('gate-tail'),
];
files['certE5-roadsW'] = [
  digest('w-head'),
  ...leg('C1 MANDATED (-4.0,1.3) A', -4.0, 1.3, 'KeyA', 2200, 1),
  ...leg('C2 MANDATED (-7.0,2.2) A', -7.0, 2.2, 'KeyA', 2200, 1),
  ...leg('C3 west-end (-11.60,3.35) D', -11.60, 3.35, 'KeyD', 2200, 1),
  ...leg('C5 (-9.0,2.7) D', -9.0, 2.7, 'KeyD', 2200, 1),
  ...leg('C12 (-6.5,1.3) D', -6.5, 1.3, 'KeyD', 2200, 1),
  ...leg('C10 (-2.4,0.85) A', -2.4, 0.85, 'KeyA', 2200, 1),
  digest('w-tail'),
];
files['certE5-roadsE'] = [
  digest('e-head'),
  ...leg('C4 east-end (11.60,-1.35) A', 11.60, -1.35, 'KeyA', 2200, 1),
  ...leg('C6 (2.6,0.3) D', 2.6, 0.3, 'KeyD', 2200, 1),
  ...leg('C7 (6.0,-0.4) D', 6.0, -0.4, 'KeyD', 2200, 1),
  ...leg('C8 (11.5,-1.2) A', 11.5, -1.2, 'KeyA', 2200, 1),
  ...leg('C9 (10.0,-1.0) A', 10.0, -1.0, 'KeyA', 2200, 1),
  ...leg('C11 (7.4,-0.3) A', 7.4, -0.3, 'KeyA', 2200, 1),
  digest('e-tail'),
];

// ============ E1 extra: end-to-end sweeps (dead-end proof) ============
const sweep = (name, x, z, key, ms, pathIdx, shotName) => [
  ...tp(name, x, z), sampStart(name), ...hold(key, ms), wait(250),
  sampEnd(name, 'sweep-end', 0, 0, pathIdx), shot(shotName),
];
files['certE5-sweep'] = [
  digest('sweep-head'),
  ...sweep('SW1 gate SOUTH end -> north W8000', 0.2, 7.70, 'KeyW', 8000, 0, 'certE5-sweep-north'),
  ...sweep('SW2 gate NORTH end -> south S8000', 0.1, -7.70, 'KeyS', 8000, 0, 'certE5-sweep-south'),
  ...sweep('SW3 camp WEST end -> east D12000', -11.70, 3.40, 'KeyD', 12000, 1, 'certE5-sweep-east'),
  ...sweep('SW4 camp EAST end -> west A12000', 11.70, -1.40, 'KeyA', 12000, 1, 'certE5-sweep-west'),
  digest('sweep-tail'),
];

// ============ E3 interactables ============
const seat = ev(iife(`E.cmd('teleport',1.35,1.0);return 'back to boot seat'`));
files['certE5-stops'] = [
  digest('stops-head'),
  ...tp('hearth-approach', 0.0, 1.9), sampStart('hearth (0,1.9) W1500'), ...hold('KeyW', 1500), wait(250),
  sampEnd('hearth', 'hearth', 0, -0.2, 0), shot('certE5-stop-hearth'),
  seat, wait(400), sampStart('tent1 CONTINUOUS from seat A2600 -> W1600'),
  ...hold('KeyA', 2600), ...hold('KeyW', 1600), wait(250),
  sampEnd('tent1', 'tent1', -4.95, -3.35, 1), shot('certE5-stop-tent1'),
  seat, wait(400), sampStart('tent2 CONTINUOUS from seat D1450 -> W1600'),
  ...hold('KeyD', 1450), ...hold('KeyW', 1600), wait(250),
  sampEnd('tent2', 'tent2', 4.85, -3.1, 1), shot('certE5-stop-tent2'),
  ...tp('tent3-approach', -7.5, 1.6), sampStart('tent3 (-7.5,1.6) W1200'), ...hold('KeyW', 1200), wait(250),
  sampEnd('tent3', 'tent3', -7.5, -0.3, 1), shot('certE5-stop-tent3'),
  ...tp('stall-approach', 6.35, 0.5), sampStart('stall (6.35,0.5) S1500'), ...hold('KeyS', 1500), wait(250),
  sampEnd('stall', 'stall', 6.35, 2.5, 1), shot('certE5-stop-stall'),
  ...tp('cart-approach', 8.35, 0.3), sampStart('cart (8.35,0.3) W1500'), ...hold('KeyW', 1500), wait(250),
  sampEnd('cart', 'cart', 8.35, -1.95, 1), shot('certE5-stop-cart'),
  digest('stops-tail'),
];
files['certE5-stops2'] = [
  digest('stops2-head'),
  seat, wait(400), sampStart('anvil CONTINUOUS from seat A2000 -> A+S1100 -> S700'),
  ...hold('KeyA', 2000), ...hold2('KeyA', 'KeyS', 1100), ...hold('KeyS', 700), wait(250),
  sampEnd('anvil', 'anvil', -5.5, 3.7, 1), shot('certE5-stop-anvil'),
  sampStart('forge CONTINUOUS onward from anvil stop A900 -> S500'),
  ...hold('KeyA', 900), ...hold('KeyS', 500), wait(250),
  sampEnd('forge', 'forge', -6.75, 3.95, 1), shot('certE5-stop-forge'),
  ...tp('rack-approach', -4.15, 2.6), sampStart('rack (-4.15,2.6) S1200'), ...hold('KeyS', 1200), wait(250),
  sampEnd('rack', 'rack', -4.15, 4.35, 1), shot('certE5-stop-rack'),
  seat, wait(600),
  ev(iife(`const c=E.cmd('campState');return {preWalk:'at boot seat',player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box}`)),
  sampStart('portal CONTINUOUS from seat W2700'),
  ...hold('KeyW', 2700), wait(300),
  sampEnd('portal', 'portal', 0, -6.9, 0), shot('certE5-stop-portal'),
  seat, wait(400), sampStart('portal long CONTINUOUS from seat W3600'),
  ...hold('KeyW', 3600), wait(300),
  sampEnd('portal-long', 'portal', 0, -6.9, 0), shot('certE5-stop-portal2'),
  digest('stops2-tail'),
];

// ============ E4 cart vs east road ============
const station = (x) => [
  ev(iife(`E.cmd('teleport',${x},-0.3);return 'tp station ${x}'`)), wait(350), { type: 'mousemove', x: 800, y: 200 },
  ev(iife(`const c=E.cmd('campState');window.__S={x:${x},p0:{x:c.player.x,z:c.player.z},s:[[E.tick,c.player.x,c.player.z]]};window.__S.iv=setInterval(()=>{const p=E.cmd('campState').player;window.__S.s.push([E.tick,p.x,p.z]);},16);return 'arm ${x}'`)),
  down('KeyW'), wait(900), up('KeyW'), wait(200),
  ev(iife(`clearInterval(window.__S.iv);const S=window.__S;const s=S.s;const last=s[s.length-1];
const pts=${J(PATHS[1].pts)};const W=1.6;
const zAt=(px)=>{for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if((px>=a[0]&&px<=b[0])||(px>=b[0]&&px<=a[0])){const t=(px-a[0])/(b[0]-a[0]);return a[1]+t*(b[1]-a[1]);}}return NaN;};
let pathLen=0;for(let i=1;i<s.length;i++)pathLen+=Math.hypot(s[i][1]-s[i-1][1],s[i][2]-s[i-1][2]);
const ticks=s[s.length-1][0]-s[0][0];
const faceZ=last[2]-0.30;const centre=zAt(last[1]);const north=centre-W/2;
return {station:S.x,heldTicks:ticks,stop:[+last[1].toFixed(3),+last[2].toFixed(3)],slideX:+(last[1]-S.p0.x).toFixed(3),pathLen:+pathLen.toFixed(3),faceZ:+faceZ.toFixed(3),roadCentreZ:+centre.toFixed(3),bandNorthEdge:+north.toFixed(3),bandIntrusion:+(north-faceZ).toFixed(3),centrelineClearance:+(centre-faceZ).toFixed(3),freeReachExpected:+(0.04*ticks).toFixed(3),rv:E.cmd('campState').roadViolations}`)),
];
files['certE5-cart'] = [
  digest('cart-head'),
  ...station(5.5), ...station(6.8), ...station(7.2), ...station(7.6), ...station(8.0),
  ...station(8.35), ...station(8.7), ...station(9.1), ...station(9.5), ...station(10.6),
  ...tp('cart-behind', 9.3, -3.4), sampStart('behind cart (9.3,-3.4) S900'), ...hold('KeyS', 900), wait(200),
  sampEnd('cart-behind', 'cart', 8.35, -1.95, 1),
  digest('cart-tail'),
];

// ============ E5 seats ============
const seatRead = (tag) => ev(iife(`const c=E.cmd('campState');return {tag:${J(tag)},t:E.tick,seatDrift:c.seatDrift,rigs:(c.party.rigs||c.party).map(p=>[p.classId,+p.x.toFixed(3),+p.z.toFixed(3),p.anim||null]),seats:c.seats}`));
const poll = (tag, n, ms) => {
  const out = [];
  for (let i = 0; i < n; i++) { out.push(seatRead(`${tag}#${i}`)); out.push(wait(ms)); }
  return out;
};
files['certE5-seats'] = [
  digest('seats-head'),
  seatRead('idle-t0'),
  ...poll('idle', 21, 250),
  seatRead('idle-t5s'),
  ...tp('through-tank', -3.6, 0.5), sampStart('through TANK seat D1000'), ...hold('KeyD', 1000), wait(250),
  sampEnd('through-tank', 'tank seat', -1.95, 0.5, 1), seatRead('after-tank'), shot('certE5-seat-tank'),
  ...tp('through-sword', 3.9, 0.2), sampStart('through SWORDSMAN seat A1000'), ...hold('KeyA', 1000), wait(250),
  sampEnd('through-sword', 'swordsman seat', 2.3, 0.2, 1), seatRead('after-sword'), shot('certE5-seat-swordsman'),
  ...tp('through-archer', -1.0, -2.6), sampStart('through ARCHER seat A700'), ...hold('KeyA', 700), wait(250),
  sampEnd('through-archer', 'archer seat', -2.3, -2.5, 0), seatRead('after-archer'), shot('certE5-seat-archer'),
  ...tp('through-archer-n', -2.3, -4.3), sampStart('through ARCHER seat from north S900'), ...hold('KeyS', 900), wait(250),
  sampEnd('through-archer-n', 'archer seat', -2.3, -2.5, 0), seatRead('after-archer-n'),
  ...poll('post-walk', 9, 250),
  seatRead('final'),
  digest('seats-tail'),
];

// ============ E6 visual ============
files['certE5-visual'] = [
  digest('vis-head'),
  wait(600), shot('certE5-vis-boot'), wait(300), shot('certE5-vis-boot2'),
  ev(iife(`const c=E.cmd('campState');const vl=document.querySelector('#version-label');const b=vl.getBoundingClientRect();return {phase:'boot',propTypes:c.propTypes,campPropTypes:c.campPropTypes,propShadows:c.propShadows,emitters:c.emitters,emitterKinds:c.emitterKinds,lights:c.lights,embers:c.embers,fireflies:c.fireflies,grass:c.grass,flowers:c.flowers,colliders:c.colliders,roadViolations:c.roadViolations,verText:vl.textContent,verBox:[+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)],verOpacity:getComputedStyle(vl).opacity,critters:c.prompt.critters}`)),
  { type: 'mousemove', x: 800, y: 200 },
  sampStart('visual portal walk W3200 from boot seat'),
  ...hold('KeyW', 3200), wait(500),
  sampEnd('visual-portal', 'portal', 0, -6.9, 0),
  shot('certE5-vis-portal'), wait(300), shot('certE5-vis-portal2'),
  ev(iife(`const c=E.cmd('campState');const vl=document.querySelector('#version-label');const b=vl.getBoundingClientRect();return {phase:'portal',propTypes:c.propTypes,campPropTypes:c.campPropTypes,propShadows:c.propShadows,emitters:c.emitters,emitterKinds:c.emitterKinds,lights:c.lights,colliders:c.colliders,roadViolations:c.roadViolations,verText:vl.textContent,verBox:[+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)],verOpacity:getComputedStyle(vl).opacity,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box,critters:c.prompt.critters,seatDrift:c.seatDrift}`)),
  digest('vis-tail'),
];

// ============ E6 extra: shadow A/B on open ground ============
const spot = (tag, x, z, shotName) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${tag}'`)),
  wait(1400),
  shot(shotName),
  ev(iife(`const c=E.cmd('campState');const h=c.prompt.critters.find(k=>k.classId==='healer');return {tag:${J(tag)},world:[c.player.x,c.player.z],healerBox:h,baseXY:h?[+(h.x+h.w/2).toFixed(1),+(h.y+h.h).toFixed(1)]:null,propShadows:c.propShadows,emitters:c.emitters,tick:E.tick}`)),
  wait(300),
  shot(shotName + 'b'),
];
files['certE5-shadow'] = [
  ev(iife(`return {ver:E.version,scene:E.state().scene,toggles:JSON.stringify(E.state().toggles)}`)),
  ...spot('open-NW', -3.0, 6.5, 'certE5-shadow-a'),
  ...spot('open-E', 9.6, 4.6, 'certE5-shadow-b'),
  ...spot('road-W', -9.0, 2.7, 'certE5-shadow-c'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
}
