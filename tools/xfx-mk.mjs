// Generates every xfx-* action JSON programmatically (hand-escaped regex in JSON breaks the harness).
import { writeFileSync } from 'fs';

const wait = (ms) => ({ type: 'wait', ms });
const ev = (code) => ({ type: 'eval', code });
const key = (k, ms = 60) => ({ type: 'key', key: k, ms });
const mouse = (x, y) => ({ type: 'mousemove', x, y });

// Install a time-based rAF freeze once per page (shared scope -> guarded).
const INSTALL = `(()=>{if(!window.__xfxRaf){window.__xfxRaf=window.requestAnimationFrame.bind(window);window.__xfxStopAt=null;window.requestAnimationFrame=function(cb){if(window.__xfxStopAt!==null&&performance.now()>=window.__xfxStopAt)return 0;return window.__xfxRaf(cb);};}return {installed:true};})()`;
const FREEZE_NOW = `(()=>{window.__xfxStopAt=0;return {frozenAt:window.__echoes.tick};})()`;
const armOn = (evt, ms) => `(()=>{window.__echoes.on('${evt}',function(){if(window.__xfxStopAt===null)window.__xfxStopAt=performance.now()+${ms};});return {armed:'${evt}',ms:${ms}};})()`;

// Camera + ring + party probe dump (tag ringprobe).
const PROBE = `(()=>{const S=window.__arenaProbe.stage,cam=S.camera;cam.updateMatrixWorld(true);const V=cam.position.constructor;const st=window.__echoes.state();const rings=[];S.scene.traverse(function(o){if(o.name!=='identity-ring')return;const v=new V();o.getWorldPosition(v);const band=o.children.find(function(c){return c.material&&c.material.type==='ShaderMaterial';});const half=band.geometry.parameters.width/2;let best=null,bd=1e9;for(const p of st.party){const d=Math.hypot(p.x-v.x,p.z-v.z);if(d<bd){bd=d;best=p;}}const q=v.clone().project(cam);rings.push({cls:best.kind==='player'?'healer':best.classId,wx:v.x,wz:v.z,half:half,core:'#'+band.material.uniforms.uCore.value.getHexString(),rim:'#'+band.material.uniforms.uRim.value.getHexString(),vis:o.visible,chk:[((q.x+1)/2)*innerWidth,((1-q.y)/2)*innerHeight]});});return {tag:'ringprobe',W:innerWidth,H:innerHeight,P:cam.projectionMatrix.elements,Vm:cam.matrixWorldInverse.elements,rings:rings,emitters:window.__arenaProbe.emitters.map(function(e){return {k:e.kind,x:e.x,z:e.z};}),enemies:st.enemies.length,party:st.party.map(function(p){return [p.kind,p.classId||'healer',+p.x.toFixed(2),+p.z.toFixed(2),Math.round(p.hp)];}),tick:window.__echoes.tick,fps:window.__echoes.fps,variant:st.vfx&&st.vfx.variant,zones:st.zones,bolts:st.skillBolts,fx:st.skillfx,skills:st.skills,ev:window.__echoes.events.slice(-6).map(function(e){return e.type;})};})()`;

// After `ms`, hide objects matching `sel` (a JS predicate on an Object3D) and re-render the frozen frame.
const hideLater = (pred, ms) => `(()=>{const S=window.__arenaProbe.stage;setTimeout(function(){S.scene.traverse(function(o){if(${pred})o.visible=false;});S.render();},${ms});return {hideScheduled:${ms}};})()`;
const HIDE_RINGS = "o.name==='identity-ring'";
const HIDE_SKILLFX = "o.name==='skillfx'";

const setAlliesHp = (f) => `(()=>{const s=window.__echoes.state();const o=[];s.party.forEach(function(a){if(a.kind==='ally'){window.__echoes.cmd('setHp',a.id,${f});o.push(a.id);}});return {lowered:o};})()`;

const files = {};

// ---- Criterion 1+2: pool framings (player teleport, allies leash in), no enemies.
files['xfx-pool-v1'] = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(3500), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];
files['xfx-pool-v3'] = [wait(400), ev(`window.__echoes.cmd('teleport',8.6,-3.8)`), wait(3500), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];
// Edge case: the whole party rallied INTO the brazier pool (player 0.8 u from the bowl).
files['xfx-poolrally-v1'] = [wait(400), ev(`window.__echoes.cmd('teleport',4.0,-1.9)`), wait(1500), ev(`window.__echoes.cmd('rally')`), wait(4500), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];
files['xfx-poolrally-v3'] = [wait(400), ev(`window.__echoes.cmd('teleport',6.6,-1.7)`), wait(1500), ev(`window.__echoes.cmd('rally')`), wait(4500), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];
// Ring hue at a neutral framing (no pool) for a control reading.
files['xfx-ringctl-v1'] = [wait(400), ev(`window.__echoes.cmd('teleport',-1,3)`), wait(1500), ev(`window.__echoes.cmd('rally')`), wait(4500), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];

// ---- Criterion 3: party-skill shapes with the party bunched (rally at the player).
const bunch = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(2000), ev(`window.__echoes.cmd('rally')`), wait(5000), ev(setAlliesHp(0.35)), ev(INSTALL)];
files['xfx-wave'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','restorative_wave')`), mouse(700, 470), wait(400), ev(armOn('skill_cast', 90)), key('Digit3'), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-wave2'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','restorative_wave')`), mouse(700, 470), wait(400), ev(armOn('skill_cast', 200)), key('Digit3'), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-bond'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','guardian_bond')`), mouse(700, 470), wait(400), ev(armOn('skill_cast', 120)), key('Digit3'), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-bond2'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','guardian_bond')`), mouse(700, 470), wait(400), ev(armOn('skill_cast', 280)), key('Digit3'), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-sanct'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','sanctuary')`), mouse(760, 470), wait(400), ev(armOn('skill_cast', 700)), key('Digit3'), wait(1500), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-sanct2'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','sanctuary')`), mouse(760, 470), wait(400), ev(armOn('skill_cast', 1600)), key('Digit3'), wait(2400), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];

// ---- Criterion 4: heal bolt in flight over grass (aim east-south-east away from the allies).
files['xfx-bolt'] = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(2500), ev(INSTALL), mouse(1250, 620), wait(300), ev(armOn('skill_bolt_spawn', 330)), key('Digit1'), wait(1200), ev(PROBE), ev(`(()=>{const S=window.__arenaProbe.stage,cam=S.camera,V=cam.position.constructor;const out=[];S.scene.traverse(function(o){if(o.name!=='skillfx')return;o.traverse(function(c){if(c.isMesh&&c.visible&&(c.name==='core'||c.name==='glow')){const v=new V();c.getWorldPosition(v);const q=v.clone().project(cam);out.push({n:c.name,sx:((q.x+1)/2)*innerWidth,sy:((1-q.y)/2)*innerHeight,wy:v.y});}});});return {tag:'boltprobe',cores:out,bolts:window.__echoes.state().skillBolts};})()`), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-bolt2'] = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(2500), ev(INSTALL), mouse(1250, 620), wait(300), ev(armOn('skill_bolt_spawn', 600)), key('Digit1'), wait(1500), ev(PROBE), ev(`(()=>{const S=window.__arenaProbe.stage,cam=S.camera,V=cam.position.constructor;const out=[];S.scene.traverse(function(o){if(o.name!=='skillfx')return;o.traverse(function(c){if(c.isMesh&&c.visible&&(c.name==='core'||c.name==='glow')){const v=new V();c.getWorldPosition(v);const q=v.clone().project(cam);out.push({n:c.name,sx:((q.x+1)/2)*innerWidth,sy:((1-q.y)/2)*innerHeight,wy:v.y});}});});return {tag:'boltprobe',cores:out,bolts:window.__echoes.state().skillBolts};})()`), ev(hideLater(HIDE_SKILLFX, 1500))];

// ---- Criterion 5: regression. Plain frames per variant; heal-only colour; telegraph Ember; telegraph over a ring.
files['xfx-plain'] = [wait(400), ev(INSTALL), ev(FREEZE_NOW), wait(150), ev(PROBE)];
files['xfx-heal'] = [...bunch, ev(`window.__echoes.cmd('giveSkill','nova_bloom')`), wait(300), ev(armOn('skill_cast', 110)), key('Digit3'), key('Digit2'), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files['xfx-tele'] = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(2500), ev(INSTALL), ev(`window.__echoes.cmd('spawn','mantis',8.5,-1.5)`), ev(armOn('telegraph_start', 350)), wait(3000), ev(PROBE), ev(`(()=>{return {tag:'tele',ev:window.__echoes.events.filter(function(e){return /tele|spawn|fire/.test(e.type);}).slice(-8),enemies:window.__echoes.state().enemies};})()`), ev(hideLater(HIDE_RINGS, 1500))];
files['xfx-fight'] = [wait(400), ev(`window.__echoes.cmd('teleport',0,0)`), wait(800), ev(`window.__echoes.cmd('startRoom','kill_all')`), mouse(900, 400), { type: 'mousedown', button: 'right' }, wait(9000), { type: 'mouseup', button: 'right' }, ev(`(()=>{const ev=window.__echoes.events;const c={};ev.forEach(function(e){c[e.type]=(c[e.type]||0)+1;});const s=window.__echoes.state();return {tag:'fight',counts:c,stats:window.__echoes.stats,fps:window.__echoes.fps,enemies:s.enemies.length,party:s.party.map(function(p){return [p.kind,p.hp];})};})()`)];

// ---- Criterion 6: fps with the full party on screen.
files['xfx-fps'] = [wait(400), ev(`window.__echoes.cmd('teleport',6,-4)`), wait(2000), ev(`window.__echoes.cmd('rally')`), wait(2500), ev(`(async()=>{const out=[];for(let i=0;i<40;i++){await new Promise(function(r){setTimeout(r,250);});out.push(window.__echoes.fps);}out.sort(function(a,b){return a-b;});return {tag:'fps',n:out.length,min:out[0],p10:out[4],median:out[20],max:out[39],party:window.__echoes.state().party.length};})()`)];
files['xfx-fpsfight'] = [wait(400), ev(`window.__echoes.cmd('teleport',0,0)`), wait(800), ev(`window.__echoes.cmd('startRoom','kill_all')`), mouse(900, 400), { type: 'mousedown', button: 'right' }, ev(`(async()=>{const out=[];for(let i=0;i<32;i++){await new Promise(function(r){setTimeout(r,250);});out.push(window.__echoes.fps);}out.sort(function(a,b){return a-b;});return {tag:'fps',n:out.length,min:out[0],p10:out[3],median:out[16],max:out[31],enemies:window.__echoes.state().enemies.length};})()`), { type: 'mouseup', button: 'right' }];


// ---- follow-ups
const bunchPool = [wait(400), ev(`window.__echoes.cmd("teleport",4.0,-1.9)`), wait(1500), ev(`window.__echoes.cmd("rally")`), wait(4500), ev(setAlliesHp(0.35)), ev(INSTALL)];
files["xfx-poolsanct-v1"] = [...bunchPool, ev(`window.__echoes.cmd("giveSkill","sanctuary")`), mouse(800, 449), wait(400), ev(armOn("skill_cast", 700)), key("Digit3"), wait(1500), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files["xfx-poolheal-v1"] = [...bunchPool, ev(`window.__echoes.cmd("giveSkill","nova_bloom")`), wait(300), ev(armOn("skill_cast", 110)), key("Digit3"), key("Digit2"), wait(900), ev(PROBE), ev(hideLater(HIDE_SKILLFX, 1500))];
files["xfx-tele2"] = [wait(400), ev(`window.__echoes.cmd("teleport",6,-4)`), wait(2500), ev(INSTALL), ev(armOn("telegraph_start", 350)), ev(`(()=>{const id=window.__echoes.cmd("spawn","mantis",9.2,-4.6);const hp=window.__echoes.cmd("setHp",id,20);return {tag:"spawned",id:id,hp:hp};})()`), wait(4000), ev(PROBE), ev(`(()=>{return {tag:"tele",ev:window.__echoes.events.filter(function(e){return /tele|enemy|eshot/.test(e.type);}).slice(-10),enemies:window.__echoes.state().enemies,frozenAt:window.__xfxStopAt,now:performance.now()};})()`), ev(hideLater(HIDE_RINGS, 1500))];

// ---- placed allies around a brazier, rings non-overlapping, rotating which class faces the pool from the camera side
const placeAt = (o) => `(()=>{const s=window.__echoes.state();const m={};s.party.forEach(function(p){if(p.kind==="ally")m[p.classId]=p.partyIndex;});const c=window.__echoes.cmd;return {tag:"placed",tank:c("placeAlly",m.tank,${o.tank[0]},${o.tank[1]}),sw:c("placeAlly",m.swordsman,${o.sw[0]},${o.sw[1]}),ar:c("placeAlly",m.archer,${o.ar[0]},${o.ar[1]})};})()`;
const placeSeq = (px, pz, o) => [wait(400), ev(`window.__echoes.cmd("teleport",${px},${pz})`), wait(2500), ev(INSTALL), ev(placeAt(o)), wait(450), ev(FREEZE_NOW), wait(150), ev(PROBE), ev(hideLater(HIDE_RINGS, 1500))];
// v1 brazier (3.2,-2.4): N = (3.2,-3.35) pool arc faces camera; E = (4.15,-2.3); W = (2.25,-2.5)
files["xfx-place-v1a"] = placeSeq(5.2, -3.6, { tank: [3.2, -3.35], sw: [4.15, -2.3], ar: [2.25, -2.5] });
files["xfx-place-v1b"] = placeSeq(5.2, -3.6, { sw: [3.2, -3.35], ar: [4.15, -2.3], tank: [2.25, -2.5] });
files["xfx-place-v1c"] = placeSeq(5.2, -3.6, { ar: [3.2, -3.35], tank: [4.15, -2.3], sw: [2.25, -2.5] });
// v3 brazier (5.8,-2.2)
files["xfx-place-v3a"] = placeSeq(7.8, -3.4, { tank: [5.8, -3.15], sw: [6.75, -2.1], ar: [4.85, -2.3] });
files["xfx-place-v3b"] = placeSeq(7.8, -3.4, { ar: [5.8, -3.15], tank: [6.75, -2.1], sw: [4.85, -2.3] });

for (const [n, acts] of Object.entries(files)) writeFileSync(`tools/actions/${n}.json`, JSON.stringify(acts, null, 1));
console.log('wrote', Object.keys(files).length, 'action files');
