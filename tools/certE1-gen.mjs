// Certification block E (camp traversal) round 1 — action-file generator.
// Writes tools/actions/certE1-*.json programmatically (never hand-escaped JSON).
// Modelled on tools/cert-gen.mjs (arm/snap/waitFor/leg helpers) with a per-leg
// 33 ms position poller so speed, stalls, "still moving at keyup", stop reason
// and off-centreline distance come from sampled sim state, not two endpoints.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

// Road centrelines copied from src/env/camp/spec.js (reading the road
// coordinates is explicitly allowed for this block). w is the drawn width.
const PATHS = [
  { id: 'gate', pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]], w: 1.55 },
  { id: 'camp', pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]], w: 1.6 },
];
const HEARTH = [0, -0.2];
const BODY = 0.3;            // sim body radius (ring 0.9 + 0.3 = 1.2 hearth clamp measured by D2/E-prev)
const WALL = { x: 12, z: 8 }; // frozen ARENA rect 24x16 -> reachable |x|<=11.7, |z|<=7.7

const campDump = (tag, max = 9000) => ev(iife(`const c=E.cmd('campState');return JSON.stringify({tag:${JSON.stringify(tag)},tick:E.tick,version:E.version,c}).slice(0,${max})`));
const verLabel = ev(iife(`const n=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&/v?0\\.4\\.\\d+/.test(x.textContent||''));return {version:E.version,labels:n.map(x=>{const r=x.getBoundingClientRect();return [x.tagName,x.id,x.className,(x.textContent||'').trim(),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),getComputedStyle(x).opacity,getComputedStyle(x).visibility,getComputedStyle(x).color,getComputedStyle(x).fontSize]})}`));
const roadWarn = (tag) => ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)},tick:E.tick,colliders:c.colliders,roadViolations:c.roadViolations,roadViolationsType:Array.isArray(c.roadViolations)?'array':typeof c.roadViolations,scene:E.state().scene}`));
const bootState = ev(iife(`const s=E.state();return {version:E.version,scene:s.scene,phase:s.run&&s.run.phase,party:s.party.map(p=>[p.id,p.classId||'healer',+p.x.toFixed(2),+p.z.toFixed(2),p.hp,p.maxHp]),toggles:s.toggles,entities:E.entityCount,fps:E.fps,tick:E.tick,seed:E.seed,bootSeed:E.bootSeed}`));

// ---------- leg with poller ----------
// Teleport only positions the START; the leg itself is a real keydown/keyup.
const distToPath = `const dp=(x,z,pts)=>{let best=1e9;for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const vx=bx-ax,vz=bz-az;const L=vx*vx+vz*vz;let t=((x-ax)*vx+(z-az)*vz)/L;t=Math.max(0,Math.min(1,t));const d=Math.hypot(x-(ax+vx*t),z-(az+vz*t));if(d<best)best=d;}return best;};`;
const leg = (name, x, z, k, ms, pathId, note = '', tp = true) => {
  const P = PATHS.find((p) => p.id === pathId) || PATHS[1];
  const pts = JSON.stringify(P.pts);
  const halfW = P.w / 2;
  const acts = [];
  if (tp) acts.push(ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name}'`)), wait(400));
  acts.push(
    { type: 'mousemove', x: 800, y: 200 },
    ev(iife(`if(window.__pi)clearInterval(window.__pi);const p=E.cmd('campState').player;window.__s=[[E.tick,p.x,p.z]];window.__w={name:${JSON.stringify(name)},t0:E.tick,p0:{x:p.x,z:p.z},tUp:null};window.__pi=setInterval(()=>{const q=E.cmd('campState').player;window.__s.push([E.tick,q.x,q.z]);},33);return {leg:__w.name,t0:__w.t0,p0:[+p.x.toFixed(2),+p.z.toFixed(2)]}`)),
    down(k), wait(ms), up(k),
    ev(iife(`window.__w.tUp=E.tick;const p=E.cmd('campState').player;window.__w.pUp={x:p.x,z:p.z};return {leg:__w.name,tUp:__w.tUp,pUp:[+p.x.toFixed(2),+p.z.toFixed(2)]}`)),
    wait(250),
    ev(iife(`clearInterval(window.__pi);window.__pi=null;${distToPath}const S=window.__s;const w=window.__w;const p1=E.cmd('campState').player;const pts=${pts};
      let firstMove=null,lastMove=null,maxStall=0,stallStart=null,stallEnd=null;let prev=S[0];
      for(let i=1;i<S.length;i++){const s=S[i];const d=Math.hypot(s[1]-prev[1],s[2]-prev[2]);if(d>0.004){if(firstMove===null)firstMove=s[0];lastMove=s[0];}prev=s;}
      let runStart=null;for(let i=1;i<S.length;i++){const s=S[i],q=S[i-1];if(s[0]>w.tUp)break;if(firstMove===null||s[0]<firstMove)continue;const d=Math.hypot(s[1]-q[1],s[2]-q[2]);if(d<=0.004){if(runStart===null)runStart=q[0];const len=s[0]-runStart;if(len>maxStall){maxStall=len;stallStart=runStart;stallEnd=s[0];}}else runStart=null;}
      const held=w.tUp-w.t0;const moved=Math.hypot(w.pUp.x-w.p0.x,w.pUp.z-w.p0.z);const movedFinal=Math.hypot(p1.x-w.p0.x,p1.z-w.p0.z);
      const uPerSecHeld=moved/(held/60);const uPerSecMoving=(firstMove!==null&&lastMove>firstMove)?moved/((Math.min(lastMove,w.tUp)-firstMove)/60):0;
      const stillMovingAtKeyup=lastMove!==null&&(w.tUp-lastMove)<=4;
      let maxOff=0,inBand=0;const offAtEnd=dp(p1.x,p1.z,pts);for(const s of S){const d=dp(s[1],s[2],pts);if(d>maxOff)maxOff=d;if(d<=${halfW})inBand++;}
      const hx=${HEARTH[0]},hz=${HEARTH[1]};const dh=Math.hypot(w.pUp.x-hx,w.pUp.z-hz);
      let stopReason='none';if(!stillMovingAtKeyup){if(Math.abs(w.pUp.x)>=${WALL.x - BODY - 0.05}||Math.abs(w.pUp.z)>=${WALL.z - BODY - 0.05})stopReason='arenaWall';else if(dh<=1.25)stopReason='hearthRing';else stopReason='COLLIDER';}
      const lateral=${k === 'KeyA' || k === 'KeyD' ? '(w.pUp.z-w.p0.z)' : '(w.pUp.x-w.p0.x)'};
      return {leg:w.name,note:${JSON.stringify(note)},key:${JSON.stringify(k)},holdMs:${ms},p0:[+w.p0.x.toFixed(2),+w.p0.z.toFixed(2)],pUp:[+w.pUp.x.toFixed(2),+w.pUp.z.toFixed(2)],p1:[+p1.x.toFixed(2),+p1.z.toFixed(2)],heldTicks:held,firstMoveTick:firstMove,lastMoveTick:lastMove,moved:+moved.toFixed(2),movedFinal:+movedFinal.toFixed(2),uPerSecHeld:+uPerSecHeld.toFixed(2),uPerSecMoving:+uPerSecMoving.toFixed(2),stillMovingAtKeyup,stopReason,distHearthAtKeyup:+dh.toFixed(2),lateralSlide:+lateral.toFixed(2),maxStallTicks:maxStall,stall:[stallStart,stallEnd],samples:S.length,inBandPct:+(100*inBand/S.length).toFixed(0),maxOffCentre:+maxOff.toFixed(2),offCentreAtEnd:+offAtEnd.toFixed(2),halfW:${halfW}}`)),
  );
  return acts;
};
const legCont = (name, k, ms, pathId, note = '') => leg(name, 0, 0, k, ms, pathId, note, false);

const files = {};

// ---------- boot: E2 + E6 boot frame ----------
files['certE1-boot'] = [
  bootState,
  campDump('boot'),
  roadWarn('boot'),
  verLabel,
];

// ---------- E1 roads: camp road WEST half (paths[1]) ----------
files['certE1-roadsW'] = [
  roadWarn('roadsW-start'),
  ...leg('W1_mandated_from(-4.0,1.3)_A', -4.0, 1.3, 'KeyA', 2200, 'camp', 'MANDATED west road from (-4.0,1.3) heading west'),
  ...leg('W2_mandated_from(-7.0,2.2)_A', -7.0, 2.2, 'KeyA', 2200, 'camp', 'MANDATED from (-7.0,2.2) heading west; arena wall x=-11.7 expected at 4.7u'),
  ...leg('W3_hearthEnd_from(-1.6,1.0)_A', -1.6, 1.0, 'KeyA', 2200, 'camp', 'hearth end -> west along the north half of the band (woodpile verge)'),
  ...leg('W4_wallEnd_from(-11.5,2.9)_D', -11.5, 2.9, 'KeyD', 2200, 'camp', 'west wall end -> east along the centreline (forge verge)'),
  ...leg('W5_far_from(-9.0,2.7)_D', -9.0, 2.7, 'KeyD', 2200, 'camp', 'far west -> hearth side'),
  ...leg('W6_mid_from(-6.5,1.3)_D', -6.5, 1.3, 'KeyD', 2200, 'camp', 'mid road -> hearth side, north half of band (woodpile)'),
  ...leg('W7_north_from(-10.5,2.3)_D', -10.5, 2.3, 'KeyD', 2200, 'camp', 'north half of band, past tent3/bedroll'),
  ...leg('W8_south_from(-3.0,1.6)_A', -3.0, 1.6, 'KeyA', 2200, 'camp', 'south half of band from the woodpile side heading west (anvil/rack verge)'),
  roadWarn('roadsW-end'),
];

// ---------- E1 roads: camp road EAST half (paths[1]) + E4 cart ----------
files['certE1-roadsE'] = [
  roadWarn('roadsE-start'),
  ...leg('E1_hearthEnd_from(2.6,0.3)_D', 2.6, 0.3, 'KeyD', 2200, 'camp', 'template: hearth side -> east'),
  ...leg('E2_far_from(6.0,-0.4)_D', 6.0, -0.4, 'KeyD', 2200, 'camp', 'template far leg, passes the cart at z -0.4'),
  ...leg('E3_centre_from(6.6,-0.7)_D', 6.6, -0.7, 'KeyD', 2200, 'camp', 'ON the centreline at the cart (z_c(8.35) = -0.72); wall x=11.7 at 5.1u'),
  ...leg('E4_wallEnd_north_from(11.5,-1.2)_A', 11.5, -1.2, 'KeyA', 2200, 'camp', 'east wall end -> west in the north half of the band (cart intrusion check)'),
  ...leg('E5_mid_from(10.0,-1.0)_A', 10.0, -1.0, 'KeyA', 2200, 'camp', 'east -> west past the cart at z -1.0'),
  ...leg('E6_toHearth_from(7.4,-0.3)_A', 7.4, -0.3, 'KeyA', 2200, 'camp', 'east -> hearth side'),
  ...leg('E7_seatSide_from(1.6,0.4)_D', 1.6, 0.4, 'KeyD', 2200, 'camp', 'hearth end -> east THROUGH the Swordsman seat (2.3,0.2) and past the lanternpole (7.35,1.1)'),
  ...leg('E8_wallEnd_south_from(11.5,-0.6)_A', 11.5, -0.6, 'KeyA', 2200, 'camp', 'east wall end -> west in the south half of the band'),
  roadWarn('roadsE-end'),
];

// ---------- E1 roads: gate road (paths[0]) south + north halves ----------
files['certE1-roadsNS'] = [
  roadWarn('roadsNS-start'),
  ...leg('S1_hearthEnd_from(0.3,1.6)_S', 0.3, 1.6, 'KeyS', 2200, 'gate', 'hearth side -> south wall'),
  ...leg('S2_from(0.4,2.4)_S', 0.4, 2.4, 'KeyS', 2200, 'gate', 'toward the south wall; wall z=7.7 expected at ~5.3u'),
  ...leg('S3_wallEnd_from(0.2,7.6)_W', 0.2, 7.6, 'KeyW', 2200, 'gate', 'south wall end -> hearth'),
  ...leg('S4_from(0.3,6.6)_W', 0.3, 6.6, 'KeyW', 2200, 'gate', 'south -> hearth side, ends 1.3u short of the ring'),
  ...leg('N1_hearthEnd_from(-0.1,-1.5)_W', -0.1, -1.5, 'KeyW', 2200, 'gate', 'hearth side -> portal (portal = authored terminus; disc r1.9)'),
  ...leg('N2_from(0.0,-2.4)_W', 0.0, -2.4, 'KeyW', 2200, 'gate', 'toward the north wall through the portal disc; wall z=-7.7 at ~5.3u'),
  ...leg('N3_sill_from(0.0,-5.9)_S', 0.0, -5.9, 'KeyS', 2200, 'gate', 'portal sill -> hearth; hearth clamp z<=-1.4 expected at 4.5u (authored terminus)'),
  ...leg('N4_wallEnd_from(0.1,-7.6)_S', 0.1, -7.6, 'KeyS', 2200, 'gate', 'north wall end (behind the gate) -> south through the gate'),
  ev(iife(`const c=E.cmd('campState');return {inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt,player:c.player,roadViolations:c.roadViolations}`)),
  roadWarn('roadsNS-end'),
];

// ---------- E3 interactables reachable by walking ----------
const stopProbe = (label, tx, tz) => ev(iife(`const c=E.cmd('campState');const p=c.player;return {stop:${JSON.stringify(label)},target:[${tx},${tz}],player:[+p.x.toFixed(2),+p.z.toFixed(2)],dist:+Math.hypot(p.x-(${tx}),p.z-(${tz})).toFixed(2),inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box,portalRadius:c.portal.radius,distToPortal:+Math.hypot(p.x-c.portal.x,p.z-c.portal.z).toFixed(2),healerAnim:c.party.healerAnim}`));
const promptDom = (tag) => ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)},inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt,player:c.player,promptDom:[...document.querySelectorAll('body *')].filter(n=>n.children.length===0&&/begin|press|enter|portal|\\bE\\b/i.test(n.textContent||'')).map(n=>{const r=n.getBoundingClientRect();return [n.id,n.className,(n.textContent||'').trim().slice(0,60),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),getComputedStyle(n).opacity,getComputedStyle(n).visibility,getComputedStyle(n).display]})}`));
files['certE1-stops'] = [
  roadWarn('stops-start'),
  ...leg('hearth_from(0,1.9)_W', 0.0, 1.9, 'KeyW', 1500, 'gate', 'to the hearth (ring 0.9 + body 0.3 = 1.2 expected)'), stopProbe('hearth', 0, -0.2), shot('certE1-stop-hearth'),
  ...leg('tent1_from(-4.95,-1.5)_W', -4.95, -1.5, 'KeyW', 1200, 'camp', 'to tent 1 (NW)'), stopProbe('tent1', -4.95, -3.35), shot('certE1-stop-tent1'),
  ...leg('tent2_from(4.85,-1.3)_W', 4.85, -1.3, 'KeyW', 1200, 'camp', 'to tent 2 (NE)'), stopProbe('tent2', 4.85, -3.1), shot('certE1-stop-tent2'),
  ...leg('tent3_from(-7.5,1.6)_W', -7.5, 1.6, 'KeyW', 1200, 'camp', 'to tent 3 from the west road'), stopProbe('tent3', -7.5, -0.3), shot('certE1-stop-tent3'),
  ...leg('stall_from(6.35,0.5)_S', 6.35, 0.5, 'KeyS', 1500, 'camp', 'to the market stall from the east road'), stopProbe('stall', 6.35, 2.5), shot('certE1-stop-stall'),
  ...leg('cart_from(8.35,0.3)_W', 8.35, 0.3, 'KeyW', 1500, 'camp', 'to the cart from the east road'), stopProbe('cart', 8.35, -1.95), shot('certE1-stop-cart'),
  ...leg('anvil_a_from(-4,1.3)_A', -4.0, 1.3, 'KeyA', 700, 'camp', 'template anvil leg 1: west along the road'),
  ...legCont('anvil_b_S', 'KeyS', 1500, 'camp', 'template anvil leg 2: south off the road to the anvil'), stopProbe('anvil', -5.5, 3.7), shot('certE1-stop-anvil'),
  ...leg('forge_from(-6.75,2.2)_S', -6.75, 2.2, 'KeyS', 1200, 'camp', 'to the forge from the west road'), stopProbe('forge', -6.75, 3.95), shot('certE1-stop-forge'),
  // REAL walks from the boot seat (no teleport between keys)
  ...leg('seatToAnvil_a_from_seat(1.35,1.0)_A', 1.35, 1.0, 'KeyA', 2000, 'camp', 'REAL walk from the boot seat: west along the camp road'),
  ev(iife(`window.__w={name:'seatToAnvil_b_AS+S',t0:E.tick,p0:E.cmd('campState').player};return __w`)),
  down('KeyA'), down('KeyS'), wait(1100), up('KeyA'), wait(700), up('KeyS'), wait(250),
  ev(iife(`const p=E.cmd('campState').player;return {leg:'seatToAnvil_b_AS+S',p0:__w.p0,p1:[+p.x.toFixed(2),+p.z.toFixed(2)],ticks:E.tick-__w.t0,moved:+Math.hypot(p.x-__w.p0.x,p.z-__w.p0.z).toFixed(2)}`)),
  stopProbe('anvil-realwalk', -5.5, 3.7), shot('certE1-stop-anvil-real'),
  ...leg('seatToStall_a_from_seat(1.35,1.0)_D', 1.35, 1.0, 'KeyD', 2000, 'camp', 'REAL walk from the boot seat: east along the camp road'),
  ...legCont('seatToStall_b_S', 'KeyS', 900, 'camp', 'then south to the stall'),
  stopProbe('stall-realwalk', 6.35, 2.5), shot('certE1-stop-stall-real'),
  ...leg('portal_from_seat(1.35,1.0)_W', 1.35, 1.0, 'KeyW', 2700, 'gate', 'template seat -> portal walk (the brief\'s "walk north and press E")'), stopProbe('portal', 0, -6.9), shot('certE1-stop-portal'),
  promptDom('portal-stop'),
  roadWarn('stops-end'),
];

// ---------- E5 seats: idle drift over 5 s, then walk THROUGH each seat ----------
const seatsNow = (tag) => ev(iife(`const c=E.cmd('campState');const s=E.state();return {tag:${JSON.stringify(tag)},tick:E.tick,seatDrift:c.seatDrift,seats:c.seats,rigs:c.party.rigs.map(r=>[r.classId,r.anim,+r.x.toFixed(3),+r.z.toFixed(3)]),sim:s.party.map(p=>[p.id,p.classId||'healer',+p.x.toFixed(3),+p.z.toFixed(3)])}`));
const driftPollStart = (tag) => ev(iife(`window.__sd=[];window.__sdi=setInterval(()=>{const c=E.cmd('campState');const r=c.party.rigs;window.__sd.push([E.tick,c.seatDrift.tank,c.seatDrift.swordsman,c.seatDrift.archer,r[1].x,r[1].z,r[2].x,r[2].z,r[3].x,r[3].z]);},250);return ${JSON.stringify(tag)}`));
const driftPollEnd = (tag) => ev(iife(`clearInterval(window.__sdi);const S=window.__sd;const mx=[0,0,0];const mn=[1e9,1e9,1e9,1e9,1e9,1e9],mxp=[-1e9,-1e9,-1e9,-1e9,-1e9,-1e9];for(const s of S){for(let i=0;i<3;i++)mx[i]=Math.max(mx[i],s[i+1]);for(let i=0;i<6;i++){mn[i]=Math.min(mn[i],s[4+i]);mxp[i]=Math.max(mxp[i],s[4+i]);}}return {tag:${JSON.stringify(tag)},samples:S.length,ticksSpanned:S.length?S[S.length-1][0]-S[0][0]:0,maxDrift:{tank:mx[0],swordsman:mx[1],archer:mx[2]},rigRange:{tank:[+(mxp[0]-mn[0]).toFixed(4),+(mxp[1]-mn[1]).toFixed(4)],swordsman:[+(mxp[2]-mn[2]).toFixed(4),+(mxp[3]-mn[3]).toFixed(4)],archer:[+(mxp[4]-mn[4]).toFixed(4),+(mxp[5]-mn[5]).toFixed(4)]}}`));
files['certE1-seats'] = [
  seatsNow('idle-0s'),
  driftPollStart('drift poll 5s'),
  wait(5000),
  driftPollEnd('idle 5s'),
  seatsNow('idle-5s'),
  shot('certE1-seats-idle'),
  ...leg('passTank_from(-3.6,0.5)_D', -3.6, 0.5, 'KeyD', 1000, 'camp', 'walk east THROUGH the Tank seat (-1.95,0.5) to the hearth clamp'), seatsNow('after-passTank'), shot('certE1-seat-tank'),
  ...leg('passSwordsman_from(3.9,0.2)_A', 3.9, 0.2, 'KeyA', 1000, 'camp', 'walk west THROUGH the Swordsman seat (2.3,0.2) to the hearth clamp'), seatsNow('after-passSwordsman'), shot('certE1-seat-swordsman'),
  ...leg('passArcher_from(-1.0,-2.6)_A', -1.0, -2.6, 'KeyA', 700, 'camp', 'walk west THROUGH the Archer seat (-2.3,-2.5)'), seatsNow('after-passArcher'), shot('certE1-seat-archer'),
  ...leg('passArcherS_from(-2.3,-4.3)_S', -2.3, -4.3, 'KeyS', 900, 'camp', 'walk south INTO the Archer seat from the north'), seatsNow('after-passArcherS'),
  ...leg('passTankS_from(-1.95,-1.4)_S', -1.95, -1.4, 'KeyS', 900, 'camp', 'walk south INTO the Tank seat from the north'), seatsNow('after-passTankS'),
  driftPollStart('drift poll post-walk'),
  wait(2000),
  driftPollEnd('post-walk 2s'),
  seatsNow('final'),
];

// ---------- E6 visual: portal frame(s) after a real walk from the seat ----------
files['certE1-portal'] = [
  ev(iife(`const c=E.cmd('campState');return {tick:E.tick,propTypes:c.propTypes,propShadows:c.propShadows,emitters:c.emitters,colliders:c.colliders,critters:c.prompt.critters,player:c.player}`)),
  shot('certE1-portal-pre'),
  { type: 'mousemove', x: 800, y: 200 },
  down('KeyW'), wait(2700), up('KeyW'), wait(500),
  shot('certE1-portalA'), wait(400), shot('certE1-portalB'),
  ev(iife(`const c=E.cmd('campState');return {tick:E.tick,inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt,player:c.player,propTypes:c.propTypes,propShadows:c.propShadows,emitters:c.emitters,colliders:c.colliders,rigs:c.party.rigs,fps:E.fps}`)),
  promptDom('portal-frame'),
  verLabel,
];

// ---------- E4 cart: profile the cart collider's road-side face across x ----------
// Walk NORTH (KeyW) from z -0.3 (south half of the band) for 700 ms at seven x
// stations; unobstructed the body reaches z ~ -1.98. Then walk SOUTH from behind
// the cart at the same stations for the cart's north face.
const cartStations = [7.2, 7.6, 8.0, 8.35, 8.7, 9.1, 9.5];
files['certE1-cart'] = [
  roadWarn('cart-start'),
  ...cartStations.flatMap((x) => leg(`cartFace_x${x}_W`, x, -0.3, 'KeyW', 700, 'camp', 'north across the band toward the cart')),
  ...cartStations.flatMap((x) => leg(`cartBack_x${x}_S`, x, -3.6, 'KeyS', 900, 'camp', 'south from behind the cart toward the road (cart north face)')),
  ev(iife(`E.cmd('teleport',8.35,-0.72);return 'tp centreline beside cart'`)), wait(500),
  ev(iife(`const c=E.cmd('campState');return {tag:'on-centreline-at-cart',player:c.player,critters:c.prompt.critters}`)),
  shot('certE1-cart-centre'),
  ev(iife(`E.cmd('teleport',8.35,-1.2);return 'tp north half beside cart'`)), wait(500),
  ev(iife(`const c=E.cmd('campState');return {tag:'north-half-at-cart',player:c.player,critters:c.prompt.critters}`)),
  shot('certE1-cart-north'),
  roadWarn('cart-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}

// ---------- supplementary: road VERGE legs (band edges, not the centreline) ----------
const files2 = {};
files2['certE1-verges'] = [
  roadWarn('verges-start'),
  ...leg('V1_gateSouth_eastEdge_from(0.95,1.4)_S', 0.95, 1.4, 'KeyS', 2200, 'gate', 'gate road SOUTH segment, east edge of the band (x_c+0.6): bench (1.7,2.65) verge'),
  ...leg('V2_gateSouth_westEdge_from(-0.45,1.4)_S', -0.45, 1.4, 'KeyS', 2200, 'gate', 'gate road SOUTH segment, west edge of the band: woodpile / banner (-1.6,5.5) verge'),
  ...leg('V3_gateNorth_eastEdge_from(0.55,-1.6)_W', 0.55, -1.6, 'KeyW', 2200, 'gate', 'gate road NORTH segment, east edge: lanternpole (2.45,-4.5) / runestone (2.15,-6.5) verge'),
  ...leg('V4_gateNorth_westEdge_from(-0.85,-1.6)_W', -0.85, -1.6, 'KeyW', 2200, 'gate', 'gate road NORTH segment, west edge: tripod (-1.45,-1.15) / lanternpole (-2.35,-4.45) / runestone (-2.15,-6.5) verge'),
  ...leg('V5_campEast_northEdge_from(1.6,-0.3)_D', 1.6, -0.3, 'KeyD', 2200, 'camp', 'camp road EAST, north edge: bench (3.05,-1.55) / bedroll (5.75,-1.95) verge'),
  ...leg('V6_campWest_northEdge_from(-1.6,0.3)_A', -1.6, 0.3, 'KeyA', 2200, 'camp', 'camp road WEST, north edge: tripod / bench (-3.0,-1.7) / bedroll (-3.95,-2.15) verge'),
  ...leg('V7_campWest_southEdge_from(-1.6,1.45)_A', -1.6, 1.45, 'KeyA', 2200, 'camp', 'camp road WEST, south edge: woodpile (-2.65,1.95) / sack (-3.35,4.55) / rack (-4.15,4.35) verge'),
  ...leg('V8_campEast_southEdge_from(1.6,1.05)_D', 1.6, 1.05, 'KeyD', 2200, 'camp', 'camp road EAST, south edge: bench (1.7,2.65) / stall (6.35,2.5) / lanternpole (7.35,1.1) verge'),
  roadWarn('verges-end'),
];
for (const [name, acts] of Object.entries(files2)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
