// Certification block E round 1 — audit-gap closure (prefix certE1-b-).
// Proves tent 1 (NW) and tent 2 (NE) are reachable by CONTINUOUS real-key
// walks from the boot seat (1.35, 1.0): no teleport between keys. Each route
// is a sequence of key holds (single keys or A+W / D+W diagonals) driven by
// puppeteer keydown/keyup; one 16 ms poller samples campState().player across
// the whole route so per-segment speed, stalls, still-moving-at-keyup, the
// final stop reason, the slide direction of the last moving samples and the
// nearest spec props to the stop point all come from sampled sim state.
// Written programmatically (JSON.stringify), never hand-escaped.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

// Road centrelines + prop table copied from src/env/camp/spec.js (reading the
// spec's coordinates is allowed for this block). Props are only used to name
// the nearest colliders to a stop point; yaw in radians.
const PATHS = [
  { id: 'gate', pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]], w: 1.55 },
  { id: 'camp', pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]], w: 1.6 },
];
const PROPS = [
  ['hearth', 0, -0.2, 0.3], ['tripod', -1.45, -1.15, 0.6], ['bench1', -3.0, -1.7, 0.62], ['bench2', 3.05, -1.55, -0.62],
  ['bench3', 1.7, 2.65, -0.32], ['woodpile', -2.65, 1.95, 0.4], ['tent1', -4.95, -3.35, 0.34], ['tent2', 4.85, -3.1, -0.36],
  ['tent3', -7.5, -0.3, 1.42], ['bedroll1', -3.95, -2.15, 0.5], ['bedroll2', 5.75, -1.95, -0.55], ['bedroll3', -6.25, -0.6, 1.5],
  ['forge', -6.75, 3.95, 0.36], ['anvil', -5.5, 3.7, 0.5], ['rack', -4.15, 4.35, -0.12], ['stall', 6.35, 2.5, -0.38],
  ['sack1', 5.2, 3.3, 0.4], ['sack2', 5.62, 3.6, -0.5], ['sack3', 7.4, 3.5, 0.9], ['cart', 8.35, -1.95, 0.42], ['sack4', -3.35, 4.55, 0.2],
  ['pole1', -2.35, -4.45, 0.5], ['pole2', 2.45, -4.5, -0.5], ['pole3', 7.35, 1.1, 1.0], ['pole4', -8.7, -1.5, -0.7],
  ['banner1', -1.6, 5.5, 0.22], ['banner2', 4.0, 5.35, -0.26], ['portal', 0, -6.9, 0], ['rune1', -2.15, -6.5, 0.34], ['rune2', 2.15, -6.5, -0.34],
];
const SEAT = [1.35, 1.0];
const HEARTH = [0, -0.2];
const BODY = 0.3;
const WALL = { x: 12, z: 8 };

const roadWarn = (tag) => ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)},tick:E.tick,version:E.version,colliders:c.colliders,roadViolations:c.roadViolations,roadViolationsType:Array.isArray(c.roadViolations)?'array':typeof c.roadViolations,scene:E.state().scene,player:c.player}`));
const bootState = ev(iife(`const s=E.state();return {version:E.version,scene:s.scene,party:s.party.map(p=>[p.id,p.classId||'healer',+p.x.toFixed(2),+p.z.toFixed(2)]),entities:E.entityCount,fps:E.fps,tick:E.tick,seed:E.seed}`));

// ---------- continuous route ----------
// segs: [{keys:['KeyA'], ms}, {keys:['KeyA','KeyW'], ms}, ...]
// reseat: teleport to the boot seat BEFORE the route starts (never between keys).
const route = (name, target, segs, note = '', reseat = true) => {
  const acts = [];
  if (reseat) acts.push(ev(iife(`E.cmd('teleport',${SEAT[0]},${SEAT[1]});return 'reseat before ${name}'`)), wait(500));
  acts.push({ type: 'mousemove', x: 800, y: 200 });
  acts.push(ev(iife(`if(window.__pi)clearInterval(window.__pi);const p=E.cmd('campState').player;window.__S=[[E.tick,+p.x.toFixed(3),+p.z.toFixed(3)]];window.__R={name:${JSON.stringify(name)},t0:E.tick,p0:{x:p.x,z:p.z},segs:[]};window.__pi=setInterval(()=>{const q=E.cmd('campState').player;window.__S.push([E.tick,+q.x.toFixed(3),+q.z.toFixed(3)]);},16);return {route:__R.name,t0:__R.t0,start:[+p.x.toFixed(2),+p.z.toFixed(2)],startIsSeat:Math.hypot(p.x-${SEAT[0]},p.z-${SEAT[1]})<0.01}`)));
  segs.forEach((sg, i) => {
    const keys = sg.keys;
    acts.push(ev(iife(`const p=E.cmd('campState').player;window.__R.segs.push({i:${i},keys:${JSON.stringify(keys)},ms:${sg.ms},tDown:E.tick,pDown:{x:p.x,z:p.z}});return {seg:${i},keys:${JSON.stringify(keys)},tDown:E.tick,pDown:[+p.x.toFixed(2),+p.z.toFixed(2)]}`)));
    for (const k of keys) acts.push(down(k));
    acts.push(wait(sg.ms));
    for (const k of keys) acts.push(up(k));
    acts.push(ev(iife(`const p=E.cmd('campState').player;const s=window.__R.segs[${i}];s.tUp=E.tick;s.pUp={x:p.x,z:p.z};return {seg:${i},tUp:E.tick,pUp:[+p.x.toFixed(2),+p.z.toFixed(2)]}`)));
  });
  acts.push(wait(300));
  acts.push(ev(iife(`clearInterval(window.__pi);window.__pi=null;const S=window.__S;const R=window.__R;const P=${JSON.stringify(PROPS)};const c=E.cmd('campState');const p1=c.player;const tx=${target[0]},tz=${target[1]};
    const dp=(x,z,pts)=>{let best=1e9;for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const vx=bx-ax,vz=bz-az;const L=vx*vx+vz*vz;let t=((x-ax)*vx+(z-az)*vz)/L;t=Math.max(0,Math.min(1,t));const d=Math.hypot(x-(ax+vx*t),z-(az+vz*t));if(d<best)best=d;}return best;};
    const PATHS=${JSON.stringify(PATHS)};
    const segOut=R.segs.map((s)=>{const inSeg=S.filter(q=>q[0]>=s.tDown&&q[0]<=s.tUp);let first=null,last=null,maxStall=0,stallAt=null,run=null;for(let i=1;i<inSeg.length;i++){const a=inSeg[i-1],b=inSeg[i];const d=Math.hypot(b[1]-a[1],b[2]-a[2]);if(d>0.004){if(first===null)first=b[0];last=b[0];run=null;}else if(first!==null){if(run===null)run=a[0];const len=b[0]-run;if(len>maxStall){maxStall=len;stallAt=[+a[1].toFixed(2),+a[2].toFixed(2)];}}}
      const held=s.tUp-s.tDown;const moved=Math.hypot(s.pUp.x-s.pDown.x,s.pUp.z-s.pDown.z);const uHeld=moved/(held/60);const uMov=(first!==null&&last>first)?moved/((last-first)/60):0;const still=last!==null&&(s.tUp-last)<=4;
      let minRoad=1e9;for(const q of inSeg){const d=Math.min(dp(q[1],q[2],PATHS[0].pts),dp(q[1],q[2],PATHS[1].pts));if(d<minRoad)minRoad=d;}
      return {seg:s.i,keys:s.keys.join('+'),holdMs:s.ms,heldTicks:held,pDown:[+s.pDown.x.toFixed(2),+s.pDown.z.toFixed(2)],pUp:[+s.pUp.x.toFixed(2),+s.pUp.z.toFixed(2)],moved:+moved.toFixed(2),uPerSecHeld:+uHeld.toFixed(2),uPerSecMoving:+uMov.toFixed(2),firstMove:first,lastMove:last,stillMovingAtKeyup:still,maxStallTicks:maxStall,stallAt,samples:inSeg.length,minDistToAnyRoadCentre:+minRoad.toFixed(2)};});
    const L=R.segs[R.segs.length-1];const lastSeg=segOut[segOut.length-1];
    const dh=Math.hypot(L.pUp.x-(${HEARTH[0]}),L.pUp.z-(${HEARTH[1]}));
    let stopReason='stillMoving';if(!lastSeg.stillMovingAtKeyup){if(Math.abs(L.pUp.x)>=${WALL.x - BODY - 0.05}||Math.abs(L.pUp.z)>=${WALL.z - BODY - 0.05})stopReason='arenaWall';else if(dh<=1.25)stopReason='hearthRing';else stopReason='COLLIDER';}
    // slide direction: last 12 samples of the final segment that actually moved
    const inLast=S.filter(q=>q[0]>=L.tDown&&q[0]<=L.tUp);const mv=[];for(let i=1;i<inLast.length;i++){const a=inLast[i-1],b=inLast[i];if(Math.hypot(b[1]-a[1],b[2]-a[2])>0.004)mv.push(b);}const tail=mv.slice(-12);let slide=null;if(tail.length>=3){const a=tail[0],b=tail[tail.length-1];const dx=b[1]-a[1],dz=b[2]-a[2];slide={from:[a[1],a[2]],to:[b[1],b[2]],dx:+dx.toFixed(3),dz:+dz.toFixed(3),tiltDeg:+((Math.atan2(dz,dx)*180/Math.PI)).toFixed(1),len:+Math.hypot(dx,dz).toFixed(3)};}
    // where did the final segment first get deflected from its key direction?
    const keyDir=(k)=>{let x=0,z=0;for(const kk of k){if(kk==='KeyW')z-=1;if(kk==='KeyS')z+=1;if(kk==='KeyA')x-=1;if(kk==='KeyD')x+=1;}const n=Math.hypot(x,z)||1;return [x/n,z/n];};const kd=keyDir(L.keys);let firstDeflect=null;for(let i=1;i<inLast.length;i++){const a=inLast[i-1],b=inLast[i];const dx=b[1]-a[1],dz=b[2]-a[2];const d=Math.hypot(dx,dz);if(d<=0.004)continue;const cos=(dx*kd[0]+dz*kd[1])/d;if(cos<0.97){firstDeflect={tick:b[0],at:[a[1],a[2]],cos:+cos.toFixed(3)};break;}}
    const near=P.map(q=>({prop:q[0],d:+Math.hypot(p1.x-q[1],p1.z-q[2]).toFixed(2),yawDeg:+(q[3]*180/Math.PI).toFixed(1)})).sort((a,b)=>a.d-b.d).slice(0,4);
    const total=Math.hypot(p1.x-R.p0.x,p1.z-R.p0.z);let pathLen=0;for(let i=1;i<S.length;i++)pathLen+=Math.hypot(S[i][1]-S[i-1][1],S[i][2]-S[i-1][2]);
    const dist=Math.hypot(p1.x-tx,p1.z-tz);
    return {route:R.name,note:${JSON.stringify(note)},target:[tx,tz],start:[+R.p0.x.toFixed(2),+R.p0.z.toFixed(2)],startIsSeat:Math.hypot(R.p0.x-${SEAT[0]},R.p0.z-${SEAT[1]})<0.01,teleportsDuringRoute:0,segs:segOut,final:[+p1.x.toFixed(2),+p1.z.toFixed(2)],distToTarget:+dist.toFixed(2),displacement:+total.toFixed(2),pathLength:+pathLen.toFixed(2),totalTicks:S[S.length-1][0]-S[0][0],samples:S.length,stopReason,distHearth:+dh.toFixed(2),slide,firstDeflect,nearestProps:near,promptVisible:c.promptVisible,inPortal:c.inPortal,promptBox:c.prompt.box,healerAnim:c.party.healerAnim,tailSamples:inLast.slice(-10)}`)));
  return acts;
};

const files = {};

files['certE1-b-tents'] = [
  bootState,
  roadWarn('b-start'),
  // ---- Tent 1 (NW) at (-4.95, -3.35) ----
  // T1a: west along the camp road from the seat, then straight north past the
  // bedroll (-3.95,-2.15) to the tent's south face. Crosses the old teleported
  // start (-4.95,-1.5) on the way.
  ...route('T1a_seat_A2600_W1600', [-4.95, -3.35], [{ keys: ['KeyA'], ms: 2600 }, { keys: ['KeyW'], ms: 1600 }], 'seat -> west along the camp road -> north to tent 1 south face (through the old teleported start (-4.95,-1.5))', false),
  shot('certE1-b-t1a'),
  // T1b: north from the seat beside the hearth on the gate road, then west at
  // z ~ -3.6 between the bench/archer (-3.0,-1.7)/(-2.3,-2.5) and the lantern
  // pole (-2.35,-4.45) to the tent's east face / door side.
  ...route('T1b_seat_W1900_A2400', [-4.95, -3.35], [{ keys: ['KeyW'], ms: 1900 }, { keys: ['KeyA'], ms: 2400 }], 'seat -> north on the gate road -> west between bench 1 and lantern pole 1 to tent 1 east face'),
  shot('certE1-b-t1b'),
  // T1c: diagonal. North a step, then A+W diagonal, then west.
  ...route('T1c_seat_W1000_AW1300_A1500', [-4.95, -3.35], [{ keys: ['KeyW'], ms: 1000 }, { keys: ['KeyA', 'KeyW'], ms: 1300 }, { keys: ['KeyA'], ms: 1500 }], 'seat -> W -> A+W diagonal -> A to tent 1'),
  shot('certE1-b-t1c'),
  // ---- Tent 2 (NE) at (4.85, -3.1) ----
  // T2a: east along the camp road, then straight north past the bench 2
  // (3.05,-1.55) / bedroll (5.75,-1.95) to the tent's south face. Crosses the
  // old teleported start (4.85,-1.3).
  ...route('T2a_seat_D1450_W1600', [4.85, -3.1], [{ keys: ['KeyD'], ms: 1450 }, { keys: ['KeyW'], ms: 1600 }], 'seat -> east along the camp road -> north to tent 2 south face (through the old teleported start (4.85,-1.3))'),
  shot('certE1-b-t2a'),
  ...route('T2b_seat_W1900_D2400', [4.85, -3.1], [{ keys: ['KeyW'], ms: 1900 }, { keys: ['KeyD'], ms: 2400 }], 'seat -> north on the gate road -> east between bench 2 and lantern pole 2 to tent 2 west face'),
  shot('certE1-b-t2b'),
  ...route('T2c_seat_W1000_DW1300_D1500', [4.85, -3.1], [{ keys: ['KeyW'], ms: 1000 }, { keys: ['KeyD', 'KeyW'], ms: 1300 }, { keys: ['KeyD'], ms: 1500 }], 'seat -> W -> D+W diagonal -> D to tent 2'),
  shot('certE1-b-t2c'),
  roadWarn('b-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
