# Builds the Furnace Knight's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are his own). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Furnace Knight Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Furnace Knight from Tripo, rigged</h1>
    <p class="lede">Your export of the Ember Kiln champion, with a skeleton and 11 moves added by hand. Their timings are the game's. Pick a move, drag to turn him, and judge the charge, the furnace's roar and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him kneeling where he fell: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster. The hero stands 4.5 u off for the Molten Rush (he charges 6.5 u down the lane and the stage follows him) and 2.4 u off for the Grate Blast.</p>
        <div class="row" id="speeds"><span class="lab">Speed</span></div>
        <div class="row" id="views"><span class="lab">View</span></div>
        <div class="row"><span class="lab">Show</span>
          <button id="rage" aria-pressed="false">Enraged</button>
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
      <img src="furnaceknight-views.png" alt="The Tripo Furnace Knight from the front, both sides and the back" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">He came through whole: nothing doubled and nothing missing. He carries a short sledge on his right shoulder instead of the game's long sledge held across the body, and has one barred grate on his chest instead of the game's two doors. Two welds were cut: the haft was welded through his right fist, and the sledge's head was welded onto his shoulder plate and helm. Now the sledge rides free: his right fist closes on it, and his left hand takes it for the two-handed slam.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,455 as sent, 92 added to close the cuts at the fist and the shoulder</small></dd></div>
    <div><dt>Bones</dt><dd>20 <small>hips, spine, chest, head, 3 in each arm, 3 in each leg, the apron front and back, and the sledge</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.6 u to the top of the chimney <small>My guess from the game's body radius of 0.66 u, beside a 1 u hero. Say if he should be bigger or smaller.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A furnace at rest. He breathes slowly and the grate glows with each breath. His weight eases from boot to boot, the helm turns left and then right, the left fist clenches, and once a loop he lifts the sledge off his shoulder and lets it drop back with a clang.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>Heavy. He rolls from boot to boot and sinks onto each one. His shoulders roll with the stride, the sledge bounces on the shoulder plate, the left arm swings short and the apron swings.</td><td>Game: 1.2 u/s. 1 s loop. Enraged: 1.38 u/s, the same loop played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot in short heavy steps, the helm leading.</td><td>100° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Molten Rush</td><td>He tips the sledge back on his shoulder and drops into a ram's crouch, left boot forward. He drags the right boot back twice, like a bull. Then he charges down the lane helm-first, his left arm pumping and the apron streaming. His molten boots leave slag behind him. At the lane's end he digs a boot in, stops hard, rocks back and squares up.</td><td>Game: 1.03 s lane warning (1.15 u wide, 2.2 to 6.5 u, at the farthest hero), then 8.6 u/s down it. Here the lane is 6.5 u, so the charge takes 0.76 s. A slag pool drops every 9 ticks, four at most (r 0.9 u, 35 percent slow for 3 s). Braced stop 3 frames and a beat, settle 0.6 s. 15 damage to each hero he runs through.</td></tr>
      <tr><td>Grate Blast</td><td>He sets his boots wide and swings the sledge off his shoulder to hang head-down from his right fist. He throws the left arm and both shoulders back to bare the grate, and rears back as the furnace builds, shaking. On the warning's end he heaves his chest forward and the furnace roars out over the cone. The hero is thrown back. Then he lifts the sledge back onto his shoulder.</td><td>Game: 1.1 s cone warning (r 3.8 u, 40° each side). The heave takes 2.5 frames and lands on the warning's end. The roar holds 3 frames plus a short burn. Recoil 0.25 s, settle 0.5 s. 16 damage and a 1.6 u throw.</td></tr>
      <tr><td>Rage</td><td>He swings the sledge up over his head in both fists and rears back. Then he drives its head into the floor in front of him and roars with his helm thrown back, his left arm flung wide and his right fist on the haft of the standing sledge. The cracks in his armour flare. The Enraged state stays on after it: he hunches over with the helm low and breathes fast, and every crack burns brighter and flickers.</td><td>Mine: 1.75 s. The game does not stop him: below half health he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The helm and chest flinch back, the left arm jolts and the sledge knocks on the shoulder. Plays on top of any move.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>He is driven back two short heavy steps. The sledge jolts on his shoulder and the left arm is flung wide. He plants himself, shakes the helm and squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>He grows from the floor in a crouch and stands up slowly, like iron drawn from a forge. Then he lifts the sledge off his shoulder and drops it back with a clang, and the grate flares.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The clang is mine.</td></tr>
      <tr><td>Death</td><td>A jolt. His right fist opens and the sledge drops, lands head-first beside his boot with a clang and falls over. Both knees give and he comes down kneeling, the left hand on his knee and the helm bowed. Then the furnace goes out: the grate, the visor and every crack cool to dark iron, and a last smoke rises.</td><td>2.6 s, then he stays. The cooling is mine.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted boot sliding</td><td>0 mm in every move</td></tr>
      <tr><td>A boot falling short of where it is put</td><td>0 mm in every move</td></tr>
      <tr><td>A hand falling short of where it reaches (the left fist on the haft, the right hand after it lets go in the death)</td><td>__ARM__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor, the sledge included</td><td>__UNDER__</td></tr>
      <tr><td>Feet on the walk</td><td>Your rule allows a wider, heavier step for heavy characters, and he is one. His boots point straight ahead as sent, so they are left that way: no splay.</td></tr>
      <tr><td>The head</td><td>Faces straight ahead at rest and stays to the front through the turns and both attacks.</td></tr>
      <tr><td>The sledge</td><td>Rides on its own joint, so it never bends. At rest it lies on his shoulder with his right fist closed on it; in the moves it goes where the move takes it, and the fist follows. Its head and pommel never pass under the floor.</td></tr>
      <tr><td>The arms</td><td>Each forearm and fist is cut out from the body along the cheapest groove, under the shoulder plate. The plate stays with the chest, and the arm's share grows from the middle out, so it stretches evenly. Looked at close at the top of the rage, the stoke and the end of the death: no tears, no spikes.</td></tr>
      <tr><td>The apron</td><td>The cloth front and back hang on their own joints and swing a beat after him. The torn side flaps go with the thighs.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The grate.</strong> The game's grate is two barred doors that swing open for the blast. The model's grate is one panel, with its bars drawn into a few large faces, so here it only flares. A new export with the doors as separate pieces would let them open.</li>
        <li><strong>The sledge in the charge.</strong> He keeps it on his shoulder and charges helm-first. The game holds the sledge across his body. Across the chest, this short sledge's head sits in front of his visor, so I left it on the shoulder. Say if you want it across.</li>
        <li><strong>The sledge in the blast.</strong> It hangs from his right fist so the grate is bare. It could stay on his shoulder instead.</li>
        <li><strong>Death.</strong> He kneels and cools. Two other ways to play it: he topples forward onto his grate and the fire spills out, or he stays standing and cools on his feet, leaning on the sledge.</li>
        <li><strong>Rage.</strong> A new 1.75 s slam and roar. The game has no pause at half health. The Enraged button shows the state without the slam.</li>
        <li><strong>Size.</strong> Drawn 2.6 u to the top of the chimney.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The upper arms are hidden under the shoulder plates, which are one skin with the chest. When an arm swings far out, the plate on that side stretches with it.</li>
        <li>The chimney, the rings on the belt and the rivets are one skin with the body and do not swing.</li>
        <li>The grate's bars are drawn into the texture on a few large faces, so they cannot open or glow one by one.</li>
        <li>The glow of the cracks, the visor and the grate is the model's own texture, made brighter by this page. The cooling at death is drawn by this page too.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Kiln Gold for his heat and the slag, Violet only for the spawn's rune. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="furnaceknight-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.6;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, KILN=0xFFC24A, KILNCORE=0xFFE6A8, KILNSTONE=0x584640, SMOKE=0x5a5450;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',molten_rush:'Molten Rush',grate_blast:'Grate Blast',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['molten_rush','grate_blast','rage','heavyHit'];
  const HOME=2.0, HOME_OF={molten_rush:4.5,grate_blast:2.4}; // where the hero stands, in u, in front of him (he keeps 1.4 to 2.4 u off)
  const WALK=1.2, RAGEWALK=1.2*1.15, TURN=2*Math.PI/3.6, MRT=62/60, MR_RUN=6.5/8.6, LANE_W=1.15, LANE_L=6.5, POOL_R=0.9, POOL_LIFE=3.0, GBT=66/60, CONE_R=3.8, CONE_A=40*Math.PI/180;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.95,0.85,1)') + r'''
  const VIEWS={Close:{p:[6.0,3.4,8.8],t:[0,1.3,1.0]},'Game zoom':{p:[0,16,14],t:[0,0.5,2.6]},Side:{p:[14,2.2,2.4],t:[0,1.3,2.4]},Front:{p:[3.4,2.2,11.4],t:[0,1.3,0]},Back:{p:[-4.2,3.6,-9.2],t:[0,1.3,0.6]},Top:{p:[0,21,0.4],t:[0,0.4,2.6]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, coolU={value:0}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // his heat is in the texture: the hot texels (the cracks, the visor slit, the grate) are found by their colour and made to
    // shine. The mask marks the visor (x) and the grate (y), which can flare on their own; w lights every hot texel at once.
    // uCool turns the hot texels to dark iron when he dies.
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU; sh.uniforms.uCool=coolU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;\nuniform float uCool;\nfloat hot; vec3 hotC;').replace('#include <map_fragment>','#include <map_fragment>\nhot=smoothstep(0.42,0.75,diffuseColor.r)*smoothstep(0.12,0.32,diffuseColor.r-diffuseColor.b);\nhotC=diffuseColor.rgb;\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.13,0.095,0.085),hot*uCool);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=hotC*hot*max(0.0,uGlow.w+uGlow.x*vMask.x+uGlow.y*vMask.y)*(1.0-uCool)+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|handL|upperarmR|forearmR|handR|sledge)\.quaternion/; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),lane:lane.visible,cone:cone.visible,pools:POOLS.filter(p=>p.t>=0).length,waves:WAVES.filter(w=>w.t>=0).length,grate:+grateG.toFixed(2),cracks:+crackG.toFixed(2),cool:+coolU.value.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,VISOR),6,0xfff4e0,1.6,0.25)").replace("spawn her back in", "spawn him back in") + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Kiln Gold is his heat and the slag)
  const FXP=[], RINGS=[], WAVES=[], POOLS=[]; let dotTex=null, rune=null, lane=null, laneFill=null, cone=null, coneRim=null;
  let visor=1, visorTo=1, grateG=0, grateTo=0, crackG=0, crackTo=0, cool=0, coolTo=0, pooled=0;
  const VISOR=[0,0.05,0.1], GRATE=[0,0.015,0.135], SLEDGE_HEAD=[0.1207,0.1486,-0.1696];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Molten Rush's warning: an Ember lane in front of him that fills along its length
    const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    laneFill=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    lane=new THREE.Group(); const lm=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false});
    [[-LANE_W/2,0.035,LANE_L,-LANE_L/2],[LANE_W/2,0.035,LANE_L,-LANE_L/2],[0,LANE_W,0.035,-LANE_L],[0,LANE_W,0.035,0]].forEach(([x,w,h,y])=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm); e.position.set(x,y,0); lane.add(e);}); lane.userData.mat=lm;
    [lane,laneFill].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    // the slag his boots leave: Kiln Gold pools that crust over to kiln stone and fade over the 3 s they last
    for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(POOL_R,32),new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);
      const rim=new THREE.Mesh(new THREE.RingGeometry(POOL_R*0.9,POOL_R,32),new THREE.MeshBasicMaterial({color:KILNSTONE,transparent:true,opacity:0,depthWrite:false})); rim.rotation.x=-Math.PI/2; rim.visible=false; fxG.add(rim); POOLS.push({m,rim,t:-1}); }
    // the Grate Blast's warning: an Ember cone in front of him that fills; at the roar three Kiln Gold waves of fire roll out over it
    const T0=1.5*Math.PI-CONE_A, TL=2*CONE_A;
    cone=new THREE.Mesh(new THREE.CircleGeometry(1,48,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    coneRim=new THREE.Mesh(new THREE.RingGeometry(0.985,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false}));
    [cone,coneRim].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);}); coneRim.scale.setScalar(CONE_R);
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); WAVES.push({m,t:-1,delay:i*0.08}); }
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.3); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296).replace("function motes(pos,n,spread,rise){", "function motes(pos,n,spread,rise,col){").replace("a:0.38,col:VIOLET,add:false}", "a:0.38,col:col||VIOLET,add:false}") + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane){lane.visible=laneFill.visible=false;cone.visible=coneRim.visible=false;rune.visible=false;} WAVES.forEach(w=>{w.t=-1;w.m.visible=false;}); POOLS.forEach(p=>{p.t=-1;p.m.visible=p.rim.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const grateW=()=>pt(bones.chest,GRATE);
  const visorW=()=>pt(bones.head,VISOR);
  const sledgeW=()=>pt(bones.sledge,SLEDGE_HEAD);
  const underW=()=>pt(bones.hips,[0,0,0]).setY(0.02);
  const inLane=(u)=>{ const p=targetW().applyMatrix4(fxG.matrix.clone().invert()).sub(u.o).applyAxisAngle(Y,-u.yaw); return Math.abs(p.x)<LANE_W/2+0.25&&p.z>-0.3&&p.z<LANE_L+0.3; };
  // fire thrown out of the grate along the cone: Kiln Gold puffs that rise a little and burn out
  function roar(n){ const o=grateW(), yaw=cone.userData.yaw+floorYaw; for(let i=0;i<n;i++){ const a=(Math.random()*2-1)*CONE_A*0.9, sp=3.5+Math.random()*3.5; const dir=new THREE.Vector3(Math.sin(a),0.12+Math.random()*0.12,Math.cos(a)).applyAxisAngle(Y,yaw).normalize();
    puff(o,dir.multiplyScalar(sp),{life:0.35+Math.random()*0.3,s0:0.18,s1:0.55,a:0.32,col:Math.random()<0.25?KILNCORE:KILN,add:false,drag:2.2,g:0.8}); } }
  let runeT=-1, laneT=-1, coneT=-1;
  function fxStart(name){
    crackTo=0; if(lane){lane.visible=laneFill.visible=false;cone.visible=coneRim.visible=false;} laneT=-1; coneT=-1;
    if(name==='molten_rush'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.molten_rush)>0.3){ dummy.userData.z=HOME_OF.molten_rush; dummy.userData.x=0; } if(dummy)dummy.userData.hold=MRT+MR_RUN+0.6; const o=toFloor(new THREE.Vector3(0,0,0)), yaw=-floorYaw; lane.userData.o=o; lane.userData.yaw=yaw; lane.userData.hit=false; pooled=0; if(fxOn)laneT=0; }
    if(name==='grate_blast'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.grate_blast)>0.3){ dummy.userData.z=HOME_OF.grate_blast; dummy.userData.x=0; } cone.userData.o=toFloor(new THREE.Vector3(0,0,0)); cone.userData.yaw=-floorYaw; if(fxOn)coneT=0; }
    if(name==='spawn'){ visor=0; visorTo=0; cool=1; coolTo=1; coolU.value=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.6,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,[0,0.05,0.12]),12,KILN,2.4,0.3); }
    if(name==='death'){ hitFeel(0.5,0.06,0.4); flash=0.4; }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxContact(name,i){
    if(name==='molten_rush'&&i===0){ const u=lane.userData; if(dummy&&showTarget&&inLane(u)){ u.hit=true; hitFeel(0.8,0.07,0.6); hitDummy(0.05); dummy.userData.sx=11; if(fxOn){ sparks(targetW().setY(0.55),12,KILN,2.4,0.3); ringAt(targetW().setY(0.5),{r0:0.1,r1:0.8,dur:0.25,a:0.35,bill:true,col:KILNCORE}); } } }
    if(name==='molten_rush'&&i===1){ hitFeel(0.55,0.05,0.5); if(fxOn){ dust(underW(),14,2.0,0.5); ringAt(underW(),{r0:0.5,r1:2.0,dur:0.36,a:0.3,col:DUST}); sparks(underW().setY(0.1),10,KILN,2.2,0.3); } }
    if(name==='grate_blast'){ hitFeel(0.9,0.08,0.6); grateG=3.2; visor=2.0; crackG=1.4; const u=cone.userData;
      if(fxOn){ WAVES.forEach(w=>{w.t=0; w.m.position.copy(u.o).setY(0.018); w.m.rotation.y=u.yaw;}); roar(40); sparks(grateW(),14,KILNCORE,2.6,0.35); ringAt(grateW(),{r0:0.15,r1:1.0,dur:0.3,a:0.35,bill:true,col:KILN}); }
      if(dummy&&showTarget){ const p=targetW().applyMatrix4(fxG.matrix.clone().invert()).sub(u.o).applyAxisAngle(Y,-u.yaw); const r=Math.hypot(p.x,p.z), a=Math.atan2(p.x,p.z); if(r<CONE_R+0.25&&Math.abs(a)<CONE_A+0.1){ hitDummy(1.6); if(fxOn)sparks(targetW().setY(0.5),10,KILN,2.0,0.3); } } }
    if(name==='rage'){ hitFeel(0.8,0.07,0.6); rage=true; $('rage').setAttribute('aria-pressed','true'); visor=2.6; crackG=2.4; grateG=2.0; const s=sledgeW().setY(0.02);
      if(fxOn){ dust(s,14,2.0,0.6); ringAt(s,{r0:0.3,r1:2.2,dur:0.4,a:0.32,col:DUST}); ringAt(s,{r0:0.2,r1:1.4,dur:0.3,a:0.35,col:KILN}); sparks(s.clone().setY(0.15),16,KILN,3.0,0.4); } }
    if(name==='spawn'){ hitFeel(0.3,0.03,0.3); visorTo=1; visor=1.8; grateG=2.2; coolTo=0; if(fxOn){ const s=sledgeW(); sparks(s,10,KILN,2.0,0.3); ringAt(underW(),{r0:0.3,r1:1.6,dur:0.4,a:0.3,col:DUST}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.3,0.03,0.2); if(fxOn){ const s=sledgeW().setY(0.05); sparks(s.clone().setY(0.12),12,KILN,2.2,0.3); dust(s,8,1.2,0.4); } }
      if(i===1){ hitFeel(0.45,0.04,0.35); coolTo=1; visorTo=0; if(fxOn){ dust(underW(),12,1.6,0.4); ringAt(underW(),{r0:0.4,r1:1.9,dur:0.36,a:0.3,col:DUST}); } } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='molten_rush'){ const k=Math.min(1,t/MRT), on=t<MRT; visorTo=on?1+0.8*k:1.6; crackTo=t>MRT&&t<MRT+MR_RUN?1.0:0;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=laneFill.visible=on; lane.rotation.y=laneFill.rotation.y=u.yaw; lane.position.copy(u.o).setY(0.012); laneFill.position.copy(u.o).setY(0.011); laneFill.scale.set(LANE_W,Math.max(0.001,k*LANE_L),1); u.mat.opacity=0.45+0.25*Math.sin(t*24)*k; }
      // the game drops a slag pool every 9 ticks of the charge, four at most, where he is at that tick
      while(pooled<4&&t>=MRT+(pooled+1)*9/60){ pooled++; const p=POOLS.find(q=>q.t<0)||POOLS[0]; p.t=0; p.m.position.copy(toFloor(underW())).setY(0.009+0.0006*pooled); p.rim.position.copy(p.m.position).setY(p.m.position.y+0.0003); if(fxOn)sparks(underW().setY(0.08),5,KILN,1.6,0.25); }
      if(t>MRT&&t<MRT+MR_RUN&&fxOn&&Math.random()<d*30)motes(underW().setY(0.1),1,0.5,0.4,KILN); }
    if(n==='grate_blast'){ const k=Math.min(1,t/GBT), on=t<GBT; visorTo=on?1+0.6*k:1; grateTo=on?0.3+2.2*k*k:0;
      if(coneT>=0&&fxOn){ const u=cone.userData; cone.visible=coneRim.visible=on; cone.rotation.y=coneRim.rotation.y=u.yaw; cone.position.copy(u.o).setY(0.011); coneRim.position.copy(u.o).setY(0.012); cone.scale.setScalar(Math.max(0.001,k*CONE_R)); coneRim.material.opacity=0.45+0.25*Math.sin(t*24)*k; if(on&&t>0.4&&Math.random()<d*18*k)motes(grateW(),1,0.25,0.5,KILN); }
      if(t>GBT&&t<GBT+0.28&&fxOn&&Math.random()<d*60)roar(1); }
    if(n==='rage'){ visorTo=t>0.42?2.2:1+2*t; crackTo=t>0.5&&t<1.2?1.2:0; if(t>0.6&&t<1.2&&fxOn&&Math.random()<d*14)motes(visorW(),1,0.3,0.6,KILN); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4,KILN); }
    if(n==='death'){ if(t>1.3&&t<2.6&&fxOn&&Math.random()<d*8)motes(pt(bones.head,[0,0.2,0]),1,0.12,0.5,SMOKE); }
  }
  function updateFx(d){
    visor+=(visorTo-visor)*Math.min(1,d*(visor>visorTo?5:12)); grateG+=(grateTo-grateG)*Math.min(1,d*(grateG>grateTo?3:10)); crackG+=(crackTo-crackG)*Math.min(1,d*(crackG>crackTo?3:10)); flash=Math.max(0,flash-d*3.2);
    cool+=(coolTo-cool)*Math.min(1,d*(coolTo>cool?0.8:5)); coolU.value=fxOn?cool:(sel.dead?1:0);
    const on=fxOn?1:0; const burn=rageW*(0.85+0.3*Math.sin(clockT*17)*Math.sin(clockT*6.1)); const breath=0.12*Math.sin(clockT*2*Math.PI/3);
    // the visor and the grate burn a little brighter than the cracks at rest; the rage makes every crack burn and flicker
    glowU.value.set(on*Math.max(-0.6,0.35*(visor-1)+0.15+0.3*burn),on*(0.25+breath+0.3*grateG+0.25*burn),feel?flash:0,on*(0.35+0.25*crackG+0.55*burn));
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(lane&&!(shot&&!shot.done&&shot.name==='molten_rush'&&shot.action.time<MRT)){ lane.visible=laneFill.visible=false; }
    if(cone&&!(shot&&!shot.done&&shot.name==='grate_blast')){ cone.visible=coneRim.visible=false; coneT=-1; }
    // slag: bright as it drops, crusting to kiln stone, gone after the 3 s it lasts
    POOLS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/POOL_LIFE; if(u>=1){p.t=-1;p.m.visible=p.rim.visible=false;return;} p.m.visible=p.rim.visible=fxOn; const grow=Math.min(1,p.t/0.15); p.m.scale.setScalar(0.4+0.6*grow); p.rim.scale.setScalar(0.4+0.6*grow);
      p.m.material.color.setHex(KILN).lerp(new THREE.Color(KILNSTONE),Math.min(1,u*1.6)); p.m.material.opacity=0.42*(u>0.8?(1-u)/0.2:1); p.rim.material.opacity=0.5*(u>0.8?(1-u)/0.2:1); });
    // the roar: three waves of fire roll out over the cone in 0.4 s each, a beat apart
    WAVES.forEach(w=>{ if(w.t<0)return; w.t+=d; const u=(w.t-w.delay)/0.4; if(u<0){w.m.visible=false;return;} if(u>=1){w.t=-1;w.m.visible=false;return;} w.m.visible=fxOn; w.m.scale.setScalar(0.4+(CONE_R-0.4)*u); w.m.material.opacity=0.42*(1-u); });
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // a little dust where each boot comes down on the walk and the turns
  const STEP={L:[0.0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn){ dust(pt(bones[STEP[k][1]],[0,-0.06,0.05]),3,0.6,0.3); } stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
aud = json.load(open(sys.argv[5]))
arm = max(v.get('arm_mm', 0) for v in aud.values())
VW, VH = sys.argv[7].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__ARM__', '0 mm in every move' if arm < 0.5 else '%.0f mm at worst' % arm).replace('__UNDER__', sys.argv[6])
bad = [k for k in ('sword', 'THORNS', 'thicket', ' her ', ' she ', 'scythe', 'antler', 'whip', 'crozier', 'rope', 'Abbess', 'bellW', 'thorn-model', 'Gravebell', 'Lockkeeper', 'stoneU', '__TRIS__', '__MB__', '__UNDER__', '__VW__', '__ARM__') if k in page]
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.95,0.85,1)" in page and 'spawn him back in' in page and 'bones.head,VISOR),6' in page and 'col:col||VIOLET' in page and not bad, bad
open(out, 'w').write(page); print('wrote', out, len(page))
