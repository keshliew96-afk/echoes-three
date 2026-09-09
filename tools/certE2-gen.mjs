// Certification block E round 2 — camp traversal critic action generator.
// Writes tools/actions/certE2-*.json programmatically. Prefix certE2- everywhere.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

// Road polylines copied verbatim from src/env/camp/spec.js (reading spec.js for
// road coordinates is the one code read this block allows).
const PATHS = [
  { pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]], w: 1.55 },
  { pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]], w: 1.6 },
];
const PATHJS = JSON.stringify(PATHS);

// Shared page-scope helpers, installed once per capture.
const HELPERS = ev(`(()=>{
  window.__P=${PATHJS};
  window.__d2seg=(px,pz,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1];const L=vx*vx+vz*vz;
    const t=L?Math.max(0,Math.min(1,((px-a[0])*vx+(pz-a[1])*vz)/L)):0;
    return Math.hypot(px-(a[0]+t*vx),pz-(a[1]+t*vz));};
  window.__dPath=(px,pz,i)=>{const P=window.__P[i].pts;let m=1e9;
    for(let k=0;k<P.length-1;k++)m=Math.min(m,window.__d2seg(px,pz,P[k],P[k+1]));return m;};
  window.__pl=()=>{const c=__echoes.cmd('campState');return c.player;};
  return 'helpers installed';
})()`);

// A leg: teleport to the start, then hold ONE real key for ms while a 16 ms
// poller samples campState().player. Reports moved / uPerSec / stalls / whether
// the body was still moving at keyup / distance from the road centreline.
const leg = (name, x, z, k, ms, pathIdx = null) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name} -> '+JSON.stringify(E.cmd('campState').player)`)),
  wait(450),
  { type: 'mousemove', x: 800, y: 200 },
  ev(`(()=>{const E=__echoes;const p=window.__pl();
    window.__s={name:${JSON.stringify(name)},key:${JSON.stringify(k)},holdMs:${ms},pathIdx:${pathIdx},
      t0:E.tick,p0:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},S:[[E.tick,+p.x.toFixed(3),+p.z.toFixed(3)]]};
    window.__si=setInterval(()=>{const q=window.__pl();
      window.__s.S.push([__echoes.tick,+q.x.toFixed(3),+q.z.toFixed(3)]);},16);
    return 'armed '+window.__s.name;})()`),
  down(k), wait(ms), up(k),
  ev(`(()=>{const E=__echoes;clearInterval(window.__si);const p=window.__pl();
    window.__s.t1=E.tick;window.__s.p1={x:+p.x.toFixed(3),z:+p.z.toFixed(3)};
    window.__s.S.push([E.tick,+p.x.toFixed(3),+p.z.toFixed(3)]);return 'keyup '+window.__s.name;})()`),
  wait(250),
  ev(`(()=>{const E=__echoes;const s=window.__s;const S=s.S;
    // dedupe by tick (poller may sample the same tick twice)
    const byTick=[];for(const r of S){if(!byTick.length||byTick[byTick.length-1][0]!==r[0])byTick.push(r);}
    const p=window.__pl();
    const moved=Math.hypot(s.p1.x-s.p0.x,s.p1.z-s.p0.z);
    const heldTicks=s.t1-s.t0;
    let firstMove=null,lastMove=null,stall=0,maxStall=0;
    for(let i=1;i<byTick.length;i++){
      const d=Math.hypot(byTick[i][1]-byTick[i-1][1],byTick[i][2]-byTick[i-1][2]);
      const dt=byTick[i][0]-byTick[i-1][0];
      if(d>0.004){if(firstMove===null)firstMove=byTick[i-1][0];lastMove=byTick[i][0];stall=0;}
      else {stall+=dt;if(stall>maxStall)maxStall=stall;}
    }
    const movingTicks=(firstMove!==null&&lastMove!==null)?(lastMove-firstMove):0;
    let pathLen=0;for(let i=1;i<byTick.length;i++)pathLen+=Math.hypot(byTick[i][1]-byTick[i-1][1],byTick[i][2]-byTick[i-1][2]);
    // still moving at keyup: any motion in the last 3 sampled steps before t1
    const tail=byTick.filter(r=>r[0]>=s.t1-6);
    let tailMove=0;for(let i=1;i<tail.length;i++)tailMove+=Math.hypot(tail[i][1]-tail[i-1][1],tail[i][2]-tail[i-1][2]);
    let offMin=1e9,offMax=-1,inBand=0;
    if(s.pathIdx!==null){const hw=window.__P[s.pathIdx].w/2;
      for(const r of byTick){const d=window.__dPath(r[1],r[2],s.pathIdx);
        if(d<offMin)offMin=d;if(d>offMax)offMax=d;if(d<=hw)inBand++;}}
    return {leg:s.name,key:s.key,holdMs:s.holdMs,p0:s.p0,p1:s.p1,pSettle:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},
      heldTicks,moved:+moved.toFixed(3),pathLen:+pathLen.toFixed(3),
      uPerSecPath:+(pathLen/(heldTicks/60)).toFixed(3),
      uPerSecHeld:+(moved/(heldTicks/60)).toFixed(3),
      uPerSecMoving:movingTicks?+(moved/(movingTicks/60)).toFixed(3):0,
      movingTicks,maxStallTicks:maxStall,stillMovingAtKeyup:+tailMove.toFixed(3)>0.01,
      samples:byTick.length,
      offCentreMin:offMin<1e9?+offMin.toFixed(2):null,offCentreMax:offMax>=0?+offMax.toFixed(2):null,
      inBandSamples:s.pathIdx!==null?inBand+'/'+byTick.length:null};
  })()`),
];

// campState digest — printed at the head and tail of every capture.
const digest = (tag) => ev(iife(`const c=E.cmd('campState');
  const rv=c.roadViolations;
  return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:E.state().scene,seed:E.seed,
    colliders:c.colliders,roadViolationsType:Array.isArray(rv)?'array':typeof rv,
    roadViolationsLen:Array.isArray(rv)?rv.length:rv,roadViolations:JSON.stringify(rv),
    propTypes:c.propTypes,campPropTypes:c.campPropTypes,emitters:c.emitters,propShadows:c.propShadows,
    seats:c.seats,seatDrift:c.seatDrift,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,
    promptBox:c.prompt&&c.prompt.box}`));

const files = {};

// ---------------- recon: what does campState actually expose at v0.4.43 ----------------
files['certE2-recon'] = [
  HELPERS,
  ev(iife(`return {version:E.version,tick:E.tick,fps:E.fps,scene:E.state().scene,seed:E.seed,bootSeed:E.bootSeed}`)),
  ev(iife(`const c=E.cmd('campState');return JSON.stringify(Object.keys(c))`)),
  ev(iife(`const c=E.cmd('campState');return JSON.stringify(c).slice(0,3000)`)),
  ev(iife(`const c=E.cmd('campState');return JSON.stringify(c).slice(3000,6000)`)),
  ev(iife(`return JSON.stringify(E.cmd('campSeats'))`)),
  ev(iife(`const el=document.querySelector('#version-label,#version,.version,[data-version]');
    if(!el)return {label:null};const r=el.getBoundingClientRect();const st=getComputedStyle(el);
    return {label:el.textContent,id:el.id,box:[+r.x.toFixed(1),+r.y.toFixed(1),+r.width.toFixed(1),+r.height.toFixed(1)],
      opacity:st.opacity,visibility:st.visibility,display:st.display}`)),
  digest('recon'),
];

// ---------------- E1a: camp road, west half (paths[1] west of the hearth) ----------------
files['certE2-roadsW'] = [
  HELPERS, digest('roadsW-start'),
  ...leg('W1_mandated_-4.0,1.3_A', -4.0, 1.3, 'KeyA', 2200, 1),
  ...leg('W2_mandated_-7.0,2.2_A', -7.0, 2.2, 'KeyA', 2200, 1),
  ...leg('W3_-9.0,2.7_D', -9.0, 2.7, 'KeyD', 2200, 1),
  ...leg('W4_-11.5,2.9_D', -11.5, 2.9, 'KeyD', 2200, 1),
  ...leg('W5_-6.5,1.3_D', -6.5, 1.3, 'KeyD', 2200, 1),
  ...leg('W6_-2.4,0.85_A', -2.4, 0.85, 'KeyA', 2200, 1),
  digest('roadsW-end'),
];

// ---------------- E1b: camp road, east half ----------------
files['certE2-roadsE'] = [
  HELPERS, digest('roadsE-start'),
  ...leg('E1_2.6,0.3_D', 2.6, 0.3, 'KeyD', 2200, 1),
  ...leg('E2_6.0,-0.4_D', 6.0, -0.4, 'KeyD', 2200, 1),
  ...leg('E3_centreline_6.6,-0.7_D', 6.6, -0.7, 'KeyD', 2200, 1),
  ...leg('E4_11.5,-1.2_A', 11.5, -1.2, 'KeyA', 2200, 1),
  ...leg('E5_10.0,-1.0_A', 10.0, -1.0, 'KeyA', 2200, 1),
  ...leg('E6_7.4,-0.3_A', 7.4, -0.3, 'KeyA', 2200, 1),
  digest('roadsE-end'),
];

// ---------------- E1c: gate road (paths[0]) both halves, both ends ----------------
files['certE2-roadsNS'] = [
  HELPERS, digest('roadsNS-start'),
  ...leg('S1_0.3,1.6_S', 0.3, 1.6, 'KeyS', 2200, 0),
  ...leg('S2_0.2,7.6_W', 0.2, 7.6, 'KeyW', 2200, 0),
  ...leg('S3_0.35,4.2_W', 0.35, 4.2, 'KeyW', 2200, 0),
  ...leg('N1_-0.1,-1.5_W', -0.1, -1.5, 'KeyW', 2200, 0),
  ...leg('N2_0.0,-5.9_S', 0.0, -5.9, 'KeyS', 2200, 0),
  ...leg('N3_0.1,-7.7_S', 0.1, -7.7, 'KeyS', 2200, 0),
  digest('roadsNS-end'),
];

// ---------------- E1d: end-to-end sweeps (is any road a dead end?) ----------------
// One long hold from a road END. Reports the full sampled track so a stall
// anywhere along the road shows up, plus whether the far terminus was reached.
const sweep = (name, x, z, k, ms, pathIdx) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name}'`)), wait(450),
  { type: 'mousemove', x: 800, y: 200 },
  ev(`(()=>{const E=__echoes;const p=window.__pl();
    window.__sw={name:${JSON.stringify(name)},t0:E.tick,p0:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},S:[[E.tick,+p.x.toFixed(3),+p.z.toFixed(3)]]};
    window.__swi=setInterval(()=>{const q=window.__pl();window.__sw.S.push([__echoes.tick,+q.x.toFixed(3),+q.z.toFixed(3)]);},16);
    return 'sweep armed '+window.__sw.name;})()`),
  down(k), wait(ms), up(k),
  ev(`(()=>{const E=__echoes;clearInterval(window.__swi);const c=E.cmd('campState');const p=c.player;
    const s=window.__sw;const B=[];for(const r of s.S){if(!B.length||B[B.length-1][0]!==r[0])B.push(r);}
    let len=0,stall=0,maxStall=0,stallAt=null;
    for(let i=1;i<B.length;i++){const d=Math.hypot(B[i][1]-B[i-1][1],B[i][2]-B[i-1][2]);
      len+=d;const dt=B[i][0]-B[i-1][0];
      if(d>0.004)stall=0;else{stall+=dt;if(stall>maxStall){maxStall=stall;stallAt=[B[i][1],B[i][2]];}}}
    let offMax=0;for(const r of B)offMax=Math.max(offMax,window.__dPath(r[1],r[2],${pathIdx}));
    return {sweep:s.name,p0:s.p0,p1:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},ticks:E.tick-s.t0,
      pathLen:+len.toFixed(2),uPerSec:+(len/((E.tick-s.t0)/60)).toFixed(3),
      maxStallTicks:maxStall,stallAt,offCentreMax:+offMax.toFixed(2),samples:B.length,
      inPortal:c.inPortal,promptVisible:c.promptVisible,
      track:B.filter((_,i)=>i%8===0).map(r=>[r[1],r[2]])};})()`),
];
files['certE2-gate'] = [
  HELPERS, digest('gate-start'),
  // gate road, SOUTH end -> north, one continuous hold: does it reach the portal?
  ...sweep('gateroad_southEnd_to_north', 0.2, 8.0, 'KeyW', 8000, 0),
  shot('certE2-gate-north-end'),
  // gate road, NORTH end (behind the gate) -> south, one continuous hold
  ...sweep('gateroad_northEnd_to_south', 0.1, -8.2, 'KeyS', 8000, 0),
  shot('certE2-gate-south-end'),
  // camp road, WEST end -> east, one continuous hold across the whole camp
  ...sweep('camproad_westEnd_to_east', -12.2, 3.35, 'KeyD', 12000, 1),
  shot('certE2-gate-east-end'),
  // camp road, EAST end -> west, one continuous hold
  ...sweep('camproad_eastEnd_to_west', 12.2, -1.35, 'KeyA', 12000, 1),
  shot('certE2-gate-west-end'),
  digest('gate-end'),
];

// ---------------- E3: interactables reachable by walking ----------------
// A "stop" holds a key long enough to run into the target, then reports the
// final distance to the target centre, the prompt state and a screenshot.
const TARGETS = {
  hearth: [0, -0.2], tent1: [-4.95, -3.35], tent2: [4.85, -3.1], tent3: [-7.5, -0.3],
  stall: [6.35, 2.5], cart: [8.35, -1.95], anvil: [-5.5, 3.7], forge: [-6.75, 3.95],
  portal: [0, -6.9], rack: [-4.15, 4.35],
};
const TJS = JSON.stringify(TARGETS);
const stopReport = (target, shotName) => [
  ev(`(()=>{const E=__echoes;const T=${TJS};const c=E.cmd('campState');const p=c.player;
    const t=T[${JSON.stringify(target)}];
    const dists={};for(const k of Object.keys(T))dists[k]=+Math.hypot(p.x-T[k][0],p.z-T[k][1]).toFixed(3);
    return {stop:${JSON.stringify(target)},player:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},
      distToTarget:+Math.hypot(p.x-t[0],p.z-t[1]).toFixed(3),target:t,
      inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt,
      portalRadius:c.portal.radius,distToPortal:+Math.hypot(p.x-c.portal.x,p.z-c.portal.z).toFixed(3),
      allDists:dists};})()`),
  shot(shotName),
];

// Continuous multi-key walk from the boot seat, no teleport between keys.
const walk = (name, steps, pathIdx = null) => {
  const out = [
    ev(iife(`const p=window.__pl();window.__wk={name:${JSON.stringify(name)},p0:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},t0:E.tick,segs:[],len:0,last:{x:p.x,z:p.z}};
      window.__wi=setInterval(()=>{const q=window.__pl();window.__wk.len+=Math.hypot(q.x-window.__wk.last.x,q.z-window.__wk.last.z);window.__wk.last={x:q.x,z:q.z};},16);
      return 'walk armed '+window.__wk.name`)),
    { type: 'mousemove', x: 800, y: 200 },
  ];
  for (const [keys, ms] of steps) {
    for (const k of keys) out.push(down(k));
    out.push(wait(ms));
    for (const k of keys) out.push(up(k));
    out.push(wait(120));
    out.push(ev(iife(`const p=window.__pl();window.__wk.segs.push([${JSON.stringify(keys.join('+'))},${ms},+p.x.toFixed(3),+p.z.toFixed(3)]);return 'seg '+${JSON.stringify(keys.join('+'))}`)));
  }
  out.push(wait(250));
  out.push(ev(iife(`clearInterval(window.__wi);const w=window.__wk;const p=window.__pl();
    return {walk:w.name,startedAt:w.p0,segs:w.segs,end:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},
      pathLen:+w.len.toFixed(2),ticks:E.tick-w.t0}`)));
  return out;
};

files['certE2-stops'] = [
  HELPERS, digest('stops-start'),
  // hearth: walk north into the stone ring from the south
  ...leg('stop_hearth', 0.0, 1.9, 'KeyW', 1500),
  ...stopReport('hearth', 'certE2-stop-hearth'),
  // tent 1 (NW): continuous walk from the boot seat, no teleport between keys
  ev(iife(`E.cmd('teleport',1.35,1.0);return 'reseat'`)), wait(400),
  ...walk('tent1_from_seat', [[['KeyA'], 2600], [['KeyW'], 1600]]),
  ...stopReport('tent1', 'certE2-stop-tent1'),
  // tent 2 (NE): continuous walk from the boot seat
  ev(iife(`E.cmd('teleport',1.35,1.0);return 'reseat'`)), wait(400),
  ...walk('tent2_from_seat', [[['KeyD'], 1450], [['KeyW'], 1600]]),
  ...stopReport('tent2', 'certE2-stop-tent2'),
  // tent 3 (west of the smithy road)
  ...leg('stop_tent3', -7.5, 1.6, 'KeyW', 1200),
  ...stopReport('tent3', 'certE2-stop-tent3'),
  // stall (market, east)
  ...leg('stop_stall', 6.35, 0.5, 'KeyS', 1500),
  ...stopReport('stall', 'certE2-stop-stall'),
  // cart (market, east)
  ...leg('stop_cart', 8.35, 0.3, 'KeyW', 1500),
  ...stopReport('cart', 'certE2-stop-cart'),
  digest('stops-end'),
];

files['certE2-stops2'] = [
  HELPERS, digest('stops2-start'),
  // anvil + forge by a CONTINUOUS walk from the boot seat (no teleport between keys)
  ...walk('anvil_from_seat', [[['KeyA'], 2000], [['KeyA', 'KeyS'], 1100], [['KeyS'], 700]]),
  ...stopReport('anvil', 'certE2-stop-anvil'),
  ...walk('forge_from_anvil', [[['KeyA'], 900], [['KeyS'], 500]]),
  ...stopReport('forge', 'certE2-stop-forge'),
  // rack (the third smithy piece)
  ev(iife(`E.cmd('teleport',-4.15,2.6);return 'tp rack'`)), wait(400),
  ...leg('stop_rack', -4.15, 2.6, 'KeyS', 1200),
  ...stopReport('rack', 'certE2-stop-rack'),
  // portal: continuous walk from the boot seat, hold W until the prompt shows
  ev(iife(`E.cmd('teleport',1.35,1.0);return 'reseat'`)), wait(500),
  ev(iife(`const c=E.cmd('campState');return {before:'portal-walk',player:c.player,promptVisible:c.promptVisible,inPortal:c.inPortal}`)),
  ...walk('portal_from_seat', [[['KeyW'], 2700]]),
  ...stopReport('portal', 'certE2-stop-portal'),
  ev(iife(`const el=[...document.querySelectorAll('*')].filter(n=>/Begin Run/i.test(n.textContent||'')&&n.children.length===0);
    return el.map(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);
      return {t:(n.textContent||'').trim().slice(0,50),box:[+r.x.toFixed(1),+r.y.toFixed(1),+r.width.toFixed(1),+r.height.toFixed(1)],op:s.opacity,vis:s.visibility}})`)),
  digest('stops2-end'),
];

// ---------------- E4: cart vs the east road ----------------
// Walk NORTH from the road at a series of x stations; the stop z is the cart's
// collider face (+ body radius). Compare with the road band at that x.
const cartProbe = (x) => [
  ev(iife(`E.cmd('teleport',${x},-0.3);return 'tp cart ${x}'`)), wait(400),
  ev(iife(`const p=window.__pl();window.__c0={x:p.x,z:p.z};return {station:${x},from:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)}}`)),
  down('KeyW'), wait(700), up('KeyW'), wait(250),
  ev(`(()=>{const E=__echoes;const p=window.__pl();const P=window.__P[1].pts;
    // road centreline z at the stopped x
    let cz=null;for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];
      if(p.x>=Math.min(a[0],b[0])&&p.x<=Math.max(a[0],b[0])){cz=a[1]+(p.x-a[0])/(b[0]-a[0])*(b[1]-a[1]);break;}}
    const hw=window.__P[1].w/2;
    return {station:${x},stop:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},
      moved:+Math.hypot(p.x-window.__c0.x,p.z-window.__c0.z).toFixed(3),
      slideX:+(p.x-window.__c0.x).toFixed(3),
      faceZ:+(p.z-0.3).toFixed(3),roadCentreZ:cz===null?null:+cz.toFixed(3),
      bandNorthEdge:cz===null?null:+(cz-hw).toFixed(3),
      intrusion:cz===null?null:+((cz-hw)-(p.z-0.3)).toFixed(3),
      distToPathCentre:+window.__dPath(p.x,p.z,1).toFixed(3)};})()`),
];
files['certE2-cart'] = [
  HELPERS, digest('cart-start'),
  ...cartProbe(7.2), ...cartProbe(7.6), ...cartProbe(8.0), ...cartProbe(8.35),
  ...cartProbe(8.7), ...cartProbe(9.1), ...cartProbe(9.5),
  // reverse: from behind (north of) the cart heading south — is the far side trapped?
  ...leg('cart_reverse_9.3,-3.4_S', 9.3, -3.4, 'KeyS', 900),
  shot('certE2-cart-north'),
  digest('cart-end'),
];

// E4 refined: sampled north-walks (stall detection + free-reach controls in the
// SAME page, so hold-latency jitter cannot be mistaken for a collider).
const cartLeg = (x) => [
  ...leg(`cartN_x${x}`, x, -0.3, 'KeyW', 900, 1),
  ev(`(()=>{const E=__echoes;const p=window.__pl();const P=window.__P[1].pts;
    let cz=null;for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];
      if(p.x>=Math.min(a[0],b[0])&&p.x<=Math.max(a[0],b[0])){cz=a[1]+(p.x-a[0])/(b[0]-a[0])*(b[1]-a[1]);break;}}
    const edge=cz-0.8;const face=p.z-0.3;
    return {cartFace:${x},stopX:+p.x.toFixed(3),stopZ:+p.z.toFixed(3),faceZ:+face.toFixed(3),
      roadCentreZ:+cz.toFixed(3),bandNorthEdge:+edge.toFixed(3),
      intrudesBandBy:+(face-edge).toFixed(3),
      centrelineClearance:+((cz-0.3)-face).toFixed(3)};})()`),
];
files['certE2-cart2'] = [
  HELPERS, digest('cart2-start'),
  ...cartLeg(5.5),   // CONTROL — west of the cart, nothing there
  ...cartLeg(6.8), ...cartLeg(7.2), ...cartLeg(7.6), ...cartLeg(8.0),
  ...cartLeg(8.35), ...cartLeg(8.7), ...cartLeg(9.1), ...cartLeg(9.5),
  ...cartLeg(10.6),  // CONTROL — east of the cart, nothing there
  digest('cart2-end'),
];

// ---------------- E5: seats ----------------
files['certE2-seats'] = [
  HELPERS, digest('seats-start'),
  ev(iife(`const c=E.cmd('campState');return {t:E.tick,seatDrift:c.seatDrift,seats:c.seats,rigs:c.party.rigs}`)),
  // 5 s idle poll, sampled every 250 ms
  ev(`(async()=>{const E=__echoes;const out=[];const t0=E.tick;
    for(let i=0;i<21;i++){const c=E.cmd('campState');
      out.push([E.tick,c.seatDrift.tank,c.seatDrift.swordsman,c.seatDrift.archer]);
      await new Promise(r=>setTimeout(r,250));}
    const mx=[0,0,0];for(const r of out){for(let k=0;k<3;k++)mx[k]=Math.max(mx[k],Math.abs(r[1+k]));}
    return {idle5s:{samples:out.length,ticks:E.tick-t0,maxDrift:{tank:mx[0],swordsman:mx[1],archer:mx[2]},
      first:out[0],last:out[out.length-1]}};})()`),
  ev(iife(`const c=E.cmd('campState');return {afterIdle:{t:E.tick,seatDrift:c.seatDrift,rigs:c.party.rigs}}`)),
  // walk THROUGH each seat with real keys
  ...leg('through_tank_seat', -3.6, 0.5, 'KeyD', 1000),
  ev(iife(`const c=E.cmd('campState');return {afterTankWalk:{seatDrift:c.seatDrift,rigs:c.party.rigs,player:c.player}}`)),
  shot('certE2-seat-tank'),
  ...leg('through_swordsman_seat', 3.9, 0.2, 'KeyA', 1000),
  ev(iife(`const c=E.cmd('campState');return {afterSwordsmanWalk:{seatDrift:c.seatDrift,rigs:c.party.rigs,player:c.player}}`)),
  shot('certE2-seat-swordsman'),
  ...leg('through_archer_seat', -1.0, -2.6, 'KeyA', 700),
  ev(iife(`const c=E.cmd('campState');return {afterArcherWalk:{seatDrift:c.seatDrift,rigs:c.party.rigs,player:c.player}}`)),
  shot('certE2-seat-archer'),
  ...leg('into_archer_from_north', -2.3, -4.3, 'KeyS', 900),
  ev(iife(`const c=E.cmd('campState');return {afterArcherNorth:{seatDrift:c.seatDrift,rigs:c.party.rigs,player:c.player}}`)),
  // 2 s post-walk poll
  ev(`(async()=>{const E=__echoes;const out=[];
    for(let i=0;i<9;i++){const c=E.cmd('campState');
      out.push([E.tick,c.seatDrift.tank,c.seatDrift.swordsman,c.seatDrift.archer]);
      await new Promise(r=>setTimeout(r,250));}
    const mx=[0,0,0];for(const r of out){for(let k=0;k<3;k++)mx[k]=Math.max(mx[k],Math.abs(r[1+k]));}
    return {postWalk2s:{samples:out.length,maxDrift:{tank:mx[0],swordsman:mx[1],archer:mx[2]},last:out[out.length-1]}};})()`),
  digest('seats-end'),
];

// ---------------- E6: visual — boot frame, then the same boot walked to the portal ----------------
files['certE2-visual'] = [
  HELPERS, digest('visual-boot'),
  shot('certE2-vis-boot'),
  wait(300), shot('certE2-vis-boot2'),
  ev(iife(`const el=document.querySelector('#version-label');const r=el.getBoundingClientRect();const s=getComputedStyle(el);
    return {label:el.textContent,box:[+r.x.toFixed(1),+r.y.toFixed(1),+r.width.toFixed(1),+r.height.toFixed(1)],op:s.opacity,vis:s.visibility}`)),
  ...walk('visual_portal_walk', [[['KeyW'], 2700]]),
  ...stopReport('portal', 'certE2-vis-portal'),
  wait(300), shot('certE2-vis-portal2'),
  digest('visual-portal'),
  ev(iife(`const el=document.querySelector('#version-label');const r=el.getBoundingClientRect();const s=getComputedStyle(el);
    return {label:el.textContent,box:[+r.x.toFixed(1),+r.y.toFixed(1),+r.width.toFixed(1),+r.height.toFixed(1)],op:s.opacity,vis:s.visibility}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
}
