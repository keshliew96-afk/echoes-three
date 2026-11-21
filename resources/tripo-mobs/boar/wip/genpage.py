# Builds the Thorn Boar's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/boar'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/boar.audit.json'))
glb = open(S + '/boar.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/boar.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Thorn Boar Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Thorn Boar from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The first of the mobs: your export of the Level I rusher, with a four-legged skeleton and eight moves added by hand. The ears and the two-part tail swing on springs and the thorn crest stands up like hackles when he charges. His run speed and his three-hit gore use the game's numbers frame for frame. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
  </div>

  <div class="bench">
    <section class="pane">
      <header><h2>Tripo model</h2><span class="tag" id="clipname">idle</span></header>
      <div class="stage"><canvas id="cv"></canvas><div class="load" id="load">Loading the model…</div><div class="hint">Drag to turn · scroll to zoom · one floor square is 1 u</div></div>
      <div class="controls">
        <div class="row" id="moves"><span class="lab">Move</span></div>
        <div class="row" id="dirs"><span class="lab">Going</span></div>
        <div class="row" id="acts"><span class="lab">Action</span></div>
        <p class="layers" id="layers" aria-live="polite"></p>
        <div class="phases" id="phases" hidden></div>
        <p class="rule">Idle or Run sets what he does between attacks, and Going turns him on the spot. Gore plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds him down: press it again and he spawns back in. The bar names the part of the move that is playing.</p>
        <div class="row" id="speeds"><span class="lab">Speed</span></div>
        <div class="row" id="views"><span class="lab">View</span></div>
        <div class="row"><span class="lab">Show</span>
          <button id="feel" aria-pressed="true">Hit feel</button>
          <button id="fx" aria-pressed="true">Effects</button>
          <button id="target" aria-pressed="true">Hero for scale</button>
          <button id="bones" aria-pressed="false">Bones</button>
          <button id="pause" aria-pressed="false">Pause</button>
        </div>
      </div>
    </section>

    <section class="pane sent">
      <header><h2>Model as you sent it</h2><span class="tag">four views</span></header>
      <img src="boar-views.png" alt="The Tripo Thorn Boar from the front, his right side, the back and his left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">He came through whole: four separate legs with cloven hooves, both tusks, the snout, both ears, the olive thorn crest down the spine and the tufted tail. The tusks, the eyes and the snout ride the head bone as one piece so they never stretch.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>28 <small>hips, spine, chest, neck, head, both ears, 2 in the tail, 2 under the thorn crest, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.4 u long <small>hips 0.5 u up beside a 1 u hero. His hooves stand 0.57 u apart front to back; the game's boar is 0.6 u, so this is the game's size.</small></dd></div>
    <div><dt>In the game</dt><dd>Rusher <small>20 health, bites for 8 on contact, no warning; about half of every Level I room</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>Two slow breaths with a huff on each, a look left then right with the ears turning first, an ear flick on each side, the tail swishing. Near the end he drops his snout to root and snuffle at the floor and paws it once with his right forehoof.</td><td>6 s loop</td></tr>
      <tr><td>Run</td><td>The game's trot: diagonal pairs (left fore with right hind), head low and thrust forward, ears laid back, tail up, the thorn crest half raised. The back rocks and the shoulders roll.</td><td>Game: 2.0 u/s. A third of a second a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Short quick steps round on the spot, head leading, tail swinging out.</td><td>225° a second (my number: the game turns him instantly). 0.4 s a cycle.</td></tr>
      <tr><td>Gore</td><td>Three hits on a hero who stays in reach. A hook with the right tusk that comes with no wind-up, a backhand hook the other way, then a toss: the head drops and drives up, rearing him so the front hooves leave the floor. On each hit the front hooves step in, the head kicks on the contact frame and snaps back, and he holds the next wind-up until the bite is ready again. The ears pin, the crest stands and the tail goes up for the whole combo.</td><td>Game: a bite every 0.8 s per hero. Contacts at 2.5 frames, 0.8 s and 1.6 s; strike 2.5 frames, contact 2, snap 2.5, settle 5; the wind-up pulls back 4 frames before a strike; the hooves step in 0.16 u to land on the contact. Recover 0.35 s. 3.1 s in all.</td></tr>
      <tr><td>Hurt</td><td>The head snaps away, the ears pin, the crest bristles and the tail tucks. Plays on top of any move, so planted hooves stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor low and nose down, comes up, shakes his head hard, snorts with the crest flaring, and stands.</td><td>Game: grow in 7 frames, about 10% over, then stand. The shake and the snort are mine.</td></tr>
      <tr><td>Death</td><td>A squeal with the head thrown up. The forelegs buckle, he rolls onto his left side, the legs kick a few times and go still. The crest sags and the ears fall.</td><td>2.2 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted hoof moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted hoof its leg could not reach</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, run, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>RIM_MM mm at worst, the rim of a hoof as it rolls. Lying dead he is on the floor, not in it.</td></tr>
      <tr><td>Ears, tail and thorn crest</td><td>The ears and the tail run as springs: they trail the body and settle after it stops. Only the thorns ride the crest bones, so the hide under them does not lift.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The thorn colour.</strong> The game's boar carries an indigo thorn ridge that glows faintly, the corruption tell every Level I foe shares. Your model's thorns are olive green and I left them as they are. I can tint them and add the glow on the page if you want the game's look.</li>
        <li><strong>Which tusk leads.</strong> Built as the game has it: a right hook, a left backhand, then the toss.</li>
        <li><strong>The toss rears him up.</strong> The game tips its boar 0.3 radians nose up on the toss. On this longer body that lifts the front hooves about 0.2 u off the floor. If it reads too big I can halve it.</li>
        <li><strong>Idle extras.</strong> The rooting and the hoof paw are mine; the game's idle only breathes.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The mouth is closed in the model, so the bite is all head and tusk; there is no jaw.</li>
        <li>The thorn crest moves as two stiff clumps, front and rear. Single thorns do not bend.</li>
        <li>The shaggy fur bends with the body like skin.</li>
        <li>Switching from Run into the Gore blends in 0.18 s, so a hoof can slide a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: pale sparks at the tusk on each hit and dust under the hooves. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="boar-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.4;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Run',turnL:'Turn left',turnR:'Turn right',gore:'Gore',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['gore'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.1; let HOME=NEAR; // where the hero stands, in u, in front of him: in reach of the tusks\n  const WALK=2.0, RAGEWALK=2.0, TURN=2*Math.PI/1.6;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.72,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.7,1.25,1.5],t:[0,0.38,0.55]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.3,0.5]},Side:{p:[5.6,0.75,0.5],t:[0,0.48,0.45]},Front:{p:[0.4,0.85,5.6],t:[0,0.48,0]},Back:{p:[-1.9,1.5,-4.2],t:[0,0.45,0.3]},Top:{p:[0,7.2,0.2],t:[0,0.2,0.45]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(neck1|head|earL|earR|tail1|tail2|crestF|crestR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn him back in.'")
FX = r'''  // ---- effects (stand-ins, dim on purpose: pale sparks at the tusk, dust under the hooves)
  const FXP=[], RINGS=[]; let dotTex=null;
  let eyes=1, eyesTo=1;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.09,s1:0.32,a:0.2,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.06,s1:0.012,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0;
  // the tusk tips (left, right) and the snout, in the head bone's frame
  const tusk=(i)=>pt(bones.head,i===0?[0.075,-0.06,0.15]:i===1?[-0.075,-0.06,0.15]:[0,-0.05,0.17]);
  function fxStart(name){
    HOME=NEAR;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0,0),{r0:0.15,r1:0.8,dur:0.4,a:0.3}); dust(new THREE.Vector3(0,0,0),6,0.9,0.4); }
    if(name==='gore'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
  }
  function fxContact(name,i){
    if(name==='gore'){ hitFeel(i===2?0.45:0.3,0.05,i===2?0.8:0.55);
      // hit 1 hooks with the right tusk across to his left, hit 2 the left tusk back, hit 3 tosses with both
      const p=tusk(i===0?1:i===1?0:2); if(fxOn){ sparks(p,i===2?9:6,SPARK,i===2?2.2:1.6,0.25); ['fHoofL','fHoofR'].forEach(b=>dust(pt(bones[b],[0,-0.03,0.03]),2,0.5,0.25)); }
      if(dummy&&showTarget){ hitDummy(i===2?0.18:0.1); dummy.userData.sx=i===0?1.4:i===1?-1.4:0; if(fxOn)sparks(targetW().setY(0.5),5,SPARK,1.8,0.25); } }
    if(name==='death'){ hitFeel(0.3,0,0.3); if(fxOn)dust(pt(bones.chest,[0.1,-0.1,0]).setY(0),8,1.0,0.4); }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='idle'){}
    if(n==='death'){ eyesTo=t>1.6?0:1-0.6*t/1.6; if(t>1.6)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; [0.78].forEach(c=>{ if(shot.prev<c&&t>=c&&fxOn){ const m=pt(bones.head,[0,-0.06,0.2]); for(let i=0;i<4;i++)puff(m,new THREE.Vector3((Math.random()-0.5)*0.5,0.1+Math.random()*0.2,0.6+Math.random()*0.4),{life:0.5,s0:0.05,s1:0.2,a:0.16,drag:3}); } }); }
  }
  // the idle's hoof paw kicks up a little dirt
  let idlePrev=0;
  function idleFx(){ const a=A.idle; if(!a||a.__w<0.6){idlePrev=a?a.time:0;return;} const t=a.time; if(idlePrev<5.32&&t>=5.32&&fxOn){ const h=pt(bones.fHoofR,[0,-0.03,0.02]); for(let i=0;i<3;i++)puff(h.clone().setY(0.04),new THREE.Vector3((Math.random()-0.5)*0.4,0.3+Math.random()*0.3,-0.6-Math.random()*0.5),{life:0.45,s0:0.07,s1:0.22,a:0.2,drag:3,floor:true}); } idlePrev=t; }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy)eyesTo=sel.dead?0:1;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(0,0,feel?flash:0,(fxOn?1:0)*0.28*eyes);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d*0.25; u.sx=Math.max(-3,Math.min(3,u.sx-u.sx*d*8)); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
    // his shadow shrinks while the toss rears him up
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-0.52)/0.3)); blob.scale.set(0.3*(1-0.2*k),0.72*(1-0.2*k),1); blob.material.opacity=0.17*(1-0.3*k);
    idleFx();
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.02,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.52,'hHoofL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),1,0.35,0.2);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.02,0.05]),5,0xe9dcc0,1.3,0.22); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 1.4 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values()))))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET,', 'muzzle', 'motes'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
