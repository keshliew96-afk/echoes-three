# Builds the Glassblower's review page from the Thornmother's page (the bench, the controls and the play loop are shared;
# the words, the numbers and the effects are his own).
# usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <hands json> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Glassblower Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Glassblower from Tripo, rigged</h1>
    <p class="lede">Your export of the Ember Kiln's second champion, with a skeleton and 11 moves added by hand. Their timings are the game's. Pick a move, drag to turn him, and judge the blowing, the spray and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him kneeling where he fell: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster. He keeps his distance in the game (3.4 to 5.6 u), so the hero stands 4.5 u off for the Glass Bubble and 4 u off for the Glass Gout.</p>
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
      <img src="glassblower-views.png" alt="The Tripo Glassblower from the front, both sides and the back" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">He came through whole: nothing doubled and nothing missing. He is a tall thin glassblower in goggles and a long scorched apron rather than the game's hunched imp, and his blowpipe stands upright beside him with its foot on the floor and the glowing gather on top, his right fist round it high up. One weld was cut: the pipe was welded through his right fist, and Tripo left no pipe inside the fist. Now the pipe rides free and a short piece closes it inside the fist, so his hands can slide along it.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,500 as sent, 11 to close the fist where the pipe left it and 15 for the piece of pipe inside it</small></dd></div>
    <div><dt>Bones</dt><dd>20 <small>hips, spine, chest, head, 3 in each arm, 3 in each leg, the apron front and back, and the pipe</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.4 u to the top of the pipe <small>My guess from the game's body radius of 0.6 u, beside a 1 u hero. Say if he should be bigger or smaller.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>He leans on the pipe and waits. A slow breath, his weight easing from boot to boot, the head cocked one way and then the other, the left glove flexing. Once a loop he lifts the pipe and taps its foot on the floor.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>Long loose strides with his boots pointing straight ahead. The head bobs a little ahead of him, the shoulders swing, the left glove swings long and the apron flaps round his knees. He carries the pipe just off the floor and it swings with his stride.</td><td>Game: 1.1 u/s. 1 s loop. Enraged: 1.27 u/s, the same loop played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot in short steps, the head leading, the pipe carried.</td><td>100° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Glass Bubble</td><td>He takes the pipe in both fists, swings it down to slant before him and puts its end to his lips. He blows three long breaths, his shoulders rising with each, and a bubble of molten glass swells on the gather. Then he flicks the pipe up and the bubble flies off in an arc. It lands on the hero and bursts, leaving a patch of glass. He sets the pipe back on its foot.</td><td>Game: 1.4 s ring warning (r 2.1 u, on a hero's spot 1.2 to 8 u off). The flick takes 2.5 frames and the bubble flies for 0.45 s, so it lands on the warning's end. Settle 0.75 s. 15 damage, then a glass patch (35 percent slow for 4 s).</td></tr>
      <tr><td>Glass Gout</td><td>He swings the pipe down level under his right arm like a lance, the gather forward, and sinks with his left boot forward. On the warning's end he lunges and thrusts it down the lane, and molten glass sprays off the gather. Then he stands it back on its foot.</td><td>Game: 0.9 s lane warning (6.5 u long, 1.0 u wide). The thrust takes 2.5 frames and lands on the warning's end. The spray holds 3 frames plus a short stream. Recoil 0.25 s, settle 0.5 s. 12 damage and a 50 percent slow for 1 s.</td></tr>
      <tr><td>Rage</td><td>He lifts the pipe high in his right fist and drives its foot into the floor, and the gather flares. Then he throws his head back with his left arm flung wide, shaking. The Enraged state stays on after it: he hunches lower with his head pushed forward and breathes fast, and everything hot on him burns brighter and flickers.</td><td>Mine: 1.75 s. The game does not stop him: below half health he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The head and chest flinch back and the left arm jolts. Plays on top of any move.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>He is driven back two long stumbling steps, the pipe lifted off the floor and tipped back, the left arm flung wide. He catches himself, plants the pipe with a tap and shakes his head.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>He grows from the floor folded over the pipe and unfolds to his full height. He looks about, lifts the pipe and taps its foot on the floor, and the gather lights.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The tap is mine.</td></tr>
      <tr><td>Death</td><td>A jolt, and he sags against the pipe, his left fist coming up to grip it too. His knees give and he slides down it to kneel, both fists round the pipe and his brow bowed against them. The pipe stays standing. Then the gather and every ember on him go dark, and a last smoke rises from the gather.</td><td>2.6 s, then he stays. The dimming is mine.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted boot sliding</td><td>0 mm in every move</td></tr>
      <tr><td>A boot falling short of where it is put</td><td>0 mm in every move</td></tr>
      <tr><td>The right fist falling short of its place on the pipe</td><td>__RIGHT__</td></tr>
      <tr><td>The left fist falling short of the pipe, when it holds it</td><td>__LEFT__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor, the pipe and its gather included</td><td>0 mm: nothing goes under the floor in any move. The pipe's foot stands on the floor, and is carried just off it on the walk.</td></tr>
      <tr><td>Feet on the walk and the turns</td><td>Straight ahead, no splay, as your rule asks for every humanoid who is not heavy.</td></tr>
      <tr><td>The head</td><td>Faces straight ahead at rest and stays to the front through the turns and both attacks.</td></tr>
      <tr><td>The pipe</td><td>Rides on its own joint, so it never bends. At rest it stands where it stood in your model. In the moves his right fist slides along it and his left fist joins it; his arms are short for his height, so in the Glass Bubble both fists hold it close to his mouth.</td></tr>
      <tr><td>The arms</td><td>Each forearm and fist is cut out from the body along the cheapest groove, below the shoulder. The shirt stays with the chest and the arm's share grows from the middle out, so the sleeve stretches evenly. Looked at close in the blowing, the lance hold and the kneel: no tears, no spikes.</td></tr>
      <tr><td>The apron</td><td>The front and the back hang on their own joints and swing a beat after him. The torn side strips go with the thighs.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>How he blows.</strong> He holds the pipe slanting forward and down from his lips with both fists close to his mouth. It could point up at the sky instead, the way the bubble flies.</li>
        <li><strong>The bubble's flight.</strong> It leaves the pipe 0.45 s before the warning ends and lands on its last tick. It could instead grow and burst on the gather, with the patch dropping on the hero.</li>
        <li><strong>The Glass Gout.</strong> He holds the pipe level under his arm like a lance. It could be swung in a short arc instead, spraying the glass sideways across the lane.</li>
        <li><strong>Death.</strong> He kneels against the standing pipe and goes dark. Two other ways: he lets the pipe fall and the gather shatters on the floor, or he folds over and topples sideways.</li>
        <li><strong>Rage.</strong> A new 1.75 s strike and howl. The game has no pause at half health. The Enraged button shows the state without the strike.</li>
        <li><strong>Size.</strong> Drawn 2.4 u to the top of the pipe.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>His arms are short for his height, so a fist cannot slide far along the pipe; the moves are built round that.</li>
        <li>The hair, the goggle straps, the tools and the bottles on his belt are one skin with the body and do not swing.</li>
        <li>The glow of the gather, the goggle lens and the embers on his apron is the model's own texture, made brighter by this page. The dimming at death is drawn by this page too.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Kiln Gold for the molten glass, Violet only for the spawn's rune. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="glassblower-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, KILN=0xFFC24A, KILNCORE=0xFFE6A8, KILNSTONE=0x584640, SMOKE=0x5a5450;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',glass_bubble:'Glass Bubble',glass_gout:'Glass Gout',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['glass_bubble','glass_gout','rage','heavyHit'];
  const HOME=4.0, HOME_OF={glass_bubble:4.5,glass_gout:4.0}; // where the hero stands, in u, in front of him (he keeps 3.4 to 5.6 u off)
  const WALK=1.1, RAGEWALK=1.1*1.15, TURN=2*Math.PI/3.6, BBT=84/60, BB_LOB=0.95, RING_R=2.1, PATCH_LIFE=4.0, GGT=54/60, LANE_W=1.0, LANE_L=6.5;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.55,0.5,1)') + r'''
  const VIEWS={Close:{p:[7.5,3.6,10.5],t:[0,1.1,1.8]},'Game zoom':{p:[0,16,14],t:[0,0.5,2.6]},Side:{p:[14,2.2,2.4],t:[0,1.2,2.4]},Front:{p:[3.4,2.2,11.4],t:[0,1.2,0]},Back:{p:[-4.2,3.6,-9.2],t:[0,1.2,0.6]},Top:{p:[0,21,0.4],t:[0,0.4,2.6]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, coolU={value:0}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // his heat is in the texture: the hot texels (the gather, the goggle lens, the embers on his apron) are found by their
    // colour and made to shine. The mask marks the lens (x) and the gather (y), which can flare on their own; w lights every
    // hot texel at once. uCool turns the hot texels to dark glass when he dies.
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU; sh.uniforms.uCool=coolU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;\nuniform float uCool;\nfloat hot; vec3 hotC;').replace('#include <map_fragment>','#include <map_fragment>\nhot=smoothstep(0.42,0.75,diffuseColor.r)*smoothstep(0.12,0.32,diffuseColor.r-diffuseColor.b);\nhotC=diffuseColor.rgb;\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.16,0.12,0.1),hot*uCool);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=hotC*hot*max(0.0,uGlow.w+uGlow.x*vMask.x+uGlow.y*vMask.y)*(1.0-uCool)+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    // the additive layers carry the pipe's place as well as its turn: it is held in the room, so its joint moves against the chest
    const UPPER=/^((spine|chest|head|upperarmL|forearmL|handL|upperarmR|forearmR|handR|pipe)\.quaternion|pipe\.position)$/; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),ring:ring.visible,lane:lane.visible,bubble:bubble.visible?+bubble.scale.x.toFixed(2):0,flying:fly.t>=0,patches:PATCHES.filter(p=>p.t>=0).length,gather:+gatherG.toFixed(2),cool:+coolU.value.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,LENS),6,0xfff4e0,1.6,0.25)").replace("spawn her back in", "spawn him back in") + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Kiln Gold is the molten glass)
  const FXP=[], RINGS=[], PATCHES=[], DROPS=[]; let dotTex=null, rune=null, ring=null, ringFill=null, lane=null, laneFill=null, bubble=null;
  let lens=1, lensTo=1, gatherG=0, gatherTo=0, emberG=0, emberTo=0, cool=0, coolTo=0;
  const fly={t:-1,p0:new THREE.Vector3(),p1:new THREE.Vector3(),r:0.3};
  // points on the bones, in the rest model: the goggle lens on the head, the gather and the pipe's foot on the pipe
  const LENS=[0,0.07,0.07], GATHER=[0.008,0.2148,-0.0042], PFOOT=[-0.0275,-0.7414,0.0144];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Glass Bubble's warning: an Ember ring on the hero's spot that fills from its middle
    ring=new THREE.Mesh(new THREE.RingGeometry(RING_R*0.975,RING_R,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false}));
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    [ring,ringFill].forEach(m=>{m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    // the Glass Gout's warning: an Ember lane in front of him that fills along its length
    const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    laneFill=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    lane=new THREE.Group(); const lm=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false});
    [[-LANE_W/2,0.035,LANE_L,-LANE_L/2],[LANE_W/2,0.035,LANE_L,-LANE_L/2],[0,LANE_W,0.035,-LANE_L],[0,LANE_W,0.035,0]].forEach(([x,w,h,y])=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm); e.position.set(x,y,0); lane.add(e);}); lane.userData.mat=lm;
    [lane,laneFill].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    // the bubble of molten glass: a Kiln Gold shell blown on the gather, then thrown
    bubble=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0.38,depthWrite:false})); bubble.visible=false; scene.add(bubble);
    const core=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12),new THREE.MeshBasicMaterial({color:KILNCORE,transparent:true,opacity:0.3,depthWrite:false})); bubble.add(core);
    // the glass patch the burst leaves (35 % slow for 4 s): pale glass with a gold rim and a few shards, fading out
    for(let i=0;i<4;i++){ const gq=new THREE.Group(); const d=new THREE.Mesh(new THREE.CircleGeometry(RING_R*0.85,48),new THREE.MeshBasicMaterial({color:KILNCORE,transparent:true,opacity:0,depthWrite:false})); d.rotation.x=-Math.PI/2; gq.add(d);
      const rim=new THREE.Mesh(new THREE.RingGeometry(RING_R*0.8,RING_R*0.85,48),new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0,depthWrite:false})); rim.rotation.x=-Math.PI/2; rim.position.y=0.001; gq.add(rim);
      const sm=new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); for(let k=0;k<9;k++){ const sh=new THREE.Mesh(new THREE.CircleGeometry(0.09,3),sm); const a=k*2.3, rr=0.3+((k*37)%10)/10*RING_R*0.6; sh.position.set(Math.cos(a)*rr,0.003,Math.sin(a)*rr); sh.rotation.set(-Math.PI/2,0,a); gq.add(sh); }
      gq.visible=false; fxG.add(gq); PATCHES.push({g:gq,d,rim,sm,t:-1}); }
    // glaze drops the spray leaves along the lane, gone after the 1 s slow
    for(let i=0;i<24;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(0.12,10),new THREE.MeshBasicMaterial({color:KILN,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); DROPS.push({m,t:-1,delay:0}); }
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.1); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296).replace("function motes(pos,n,spread,rise){", "function motes(pos,n,spread,rise,col){").replace("a:0.38,col:VIOLET,add:false}", "a:0.38,col:col||VIOLET,add:false}") + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(ring){ring.visible=ringFill.visible=false;lane.visible=laneFill.visible=false;rune.visible=false;bubble.visible=false;} fly.t=-1; PATCHES.forEach(p=>{p.t=-1;p.g.visible=false;}); DROPS.forEach(d=>{d.t=-1;d.m.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const gatherW=()=>pt(bones.pipe,GATHER);
  const lensW=()=>pt(bones.head,LENS);
  const pfootW=()=>pt(bones.pipe,PFOOT).setY(0.02);
  const underW=()=>pt(bones.hips,[0,0,0]).setY(0.02);
  const inLane=(u)=>{ const p=targetW().applyMatrix4(fxG.matrix.clone().invert()).sub(u.o).applyAxisAngle(Y,-u.yaw); return Math.abs(p.x)<LANE_W/2+0.25&&p.z>-0.3&&p.z<LANE_L+0.3; };
  // molten glass thrown off the gather down the lane: Kiln Gold drops that fly out low and fall
  function spray(n){ const o=gatherW(), yaw=lane.userData.yaw+floorYaw; for(let i=0;i<n;i++){ const a=(Math.random()*2-1)*0.07, sp=9+Math.random()*5; const dir=new THREE.Vector3(Math.sin(a),0.04+Math.random()*0.08,Math.cos(a)).applyAxisAngle(Y,yaw).normalize();
    puff(o,dir.multiplyScalar(sp),{life:0.35+Math.random()*0.2,s0:0.3,s1:0.12,a:0.55,col:Math.random()<0.3?KILNCORE:KILN,add:false,drag:1.2,g:-5}); } }
  let runeT=-1, laneT=-1, ringT=-1;
  function fxStart(name){
    emberTo=0; if(ring){ring.visible=ringFill.visible=false;lane.visible=laneFill.visible=false;} laneT=-1; ringT=-1; bubble.visible=false; fly.t=-1;
    if(name==='glass_bubble'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.glass_bubble)>0.3){ dummy.userData.z=HOME_OF.glass_bubble; dummy.userData.x=0; } if(dummy)dummy.userData.hold=BBT+0.5; const c=toFloor(targetW()); ring.userData.c=c; if(fxOn)ringT=0; }
    if(name==='glass_gout'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.glass_gout)>0.3){ dummy.userData.z=HOME_OF.glass_gout; dummy.userData.x=0; } const o=toFloor(new THREE.Vector3(0,0,0)); lane.userData.o=o; lane.userData.yaw=-floorYaw; if(fxOn)laneT=0; }
    if(name==='spawn'){ lens=0; lensTo=0; cool=1; coolTo=1; coolU.value=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.6,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,[0,0.05,0.08]),10,0xfff4e0,2.2,0.3); }
    if(name==='death'){ hitFeel(0.5,0.06,0.4); flash=0.4; }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxContact(name,i){
    if(name==='glass_bubble'&&i===0){ // the lob: the bubble leaves the gather for the ring's middle
      fly.t=0; fly.p0.copy(gatherW()); fly.p1.copy(ring.userData.c).applyMatrix4(fxG.matrix).setY(0.3); fly.r=bubble.scale.x; hitFeel(0.25,0.02,0.2); if(fxOn)motes(gatherW(),4,0.2,0.4,KILN); }
    if(name==='glass_bubble'&&i===1){ // the burst
      const c=ring.userData.c; const w=c.clone().applyMatrix4(fxG.matrix); fly.t=-1; bubble.visible=false; hitFeel(0.75,0.07,0.55);
      if(dummy&&showTarget&&targetW().distanceTo(w.clone().setY(0))<RING_R+0.2)hitDummy(0.0);
      if(fxOn){ sparks(w.clone().setY(0.35),22,KILN,3.2,0.4); sparks(w.clone().setY(0.3),10,KILNCORE,2.4,0.35); ringAt(w.clone().setY(0.4),{r0:0.2,r1:1.3,dur:0.3,a:0.35,bill:true,col:KILNCORE}); ringAt(w,{r0:0.3,r1:RING_R,dur:0.35,a:0.3,col:KILN});
        const p=PATCHES.find(q=>q.t<0)||PATCHES[0]; p.t=0; p.g.position.copy(c).setY(0.008); p.g.rotation.y=Math.random()*6; } }
    if(name==='glass_gout'){ const u=lane.userData; hitFeel(0.6,0.05,0.45); gatherG=2.6; lens=1.6;
      if(fxOn){ spray(40); DROPS.forEach((d,k)=>{ d.t=0; d.delay=0.04+k*0.012; const z=0.9+k*(LANE_L-1.2)/DROPS.length, x=(Math.random()-0.5)*LANE_W*0.7; d.m.position.copy(u.o).add(new THREE.Vector3(x,0,z).applyAxisAngle(Y,u.yaw)).setY(0.009+0.0003*k); }); }
      if(dummy&&showTarget&&inLane(u)){ hitDummy(0.0); if(fxOn)sparks(targetW().setY(0.5),10,KILN,2.0,0.3); } }
    if(name==='rage'){ hitFeel(0.8,0.07,0.6); rage=true; $('rage').setAttribute('aria-pressed','true'); lens=2.6; gatherG=3.0; emberG=2.0; const s=pfootW();
      if(fxOn){ dust(s,12,1.8,0.5); ringAt(s,{r0:0.2,r1:1.8,dur:0.4,a:0.32,col:DUST}); ringAt(s,{r0:0.15,r1:1.1,dur:0.3,a:0.35,col:KILN}); sparks(gatherW(),16,KILN,2.6,0.4); } }
    if(name==='heavyHit'&&i===1){ hitFeel(0.25,0.02,0.2); if(fxOn)dust(pfootW(),5,0.8,0.3); }
    if(name==='spawn'){ hitFeel(0.3,0.03,0.3); lensTo=1; lens=1.8; gatherG=2.4; coolTo=0; if(fxOn){ sparks(gatherW(),10,KILN,1.8,0.3); dust(pfootW(),6,1.0,0.3); } }
    if(name==='death'){ hitFeel(0.45,0.04,0.35); coolTo=1; lensTo=0; if(fxOn){ dust(underW(),12,1.6,0.4); ringAt(underW(),{r0:0.4,r1:1.7,dur:0.36,a:0.3,col:DUST}); } }
    if(name==='idle'){ if(fxOn)dust(pfootW(),3,0.6,0.25); }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='glass_bubble'){ const k=Math.min(1,t/BBT);
      if(ringT>=0&&fxOn){ const on=t<BBT; ring.visible=ringFill.visible=on; const c=ring.userData.c; ring.position.copy(c).setY(0.012); ringFill.position.copy(c).setY(0.011); ringFill.scale.setScalar(Math.max(0.001,k*RING_R)); ring.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      // the bubble swells on the gather with each of his three breaths, then flies on an arc to land on the warning's end
      const B0=0.3, B1=BB_LOB-5/60; if(t>B0&&t<BB_LOB&&fly.t<0){ const u=(t-B0)/(B1-B0), step=Math.min(1,u)*3, br=Math.floor(Math.min(2.999,step))+smoothE(step-Math.floor(Math.min(2.999,step))); bubble.visible=fxOn; bubble.scale.setScalar(0.06+0.11*br); bubble.position.copy(gatherW()); gatherTo=0.6+0.5*br; lensTo=1.3; }
      if(fly.t>=0){ fly.t+=d; const u=Math.min(1,fly.t/(BBT-BB_LOB)); const p=fly.p0.clone().lerp(fly.p1,u); p.y+=1.4*4*u*(1-u); bubble.visible=fxOn; bubble.position.copy(p); bubble.scale.setScalar(fly.r*(1+0.15*Math.sin(fly.t*30))); if(fxOn&&Math.random()<d*30)motes(p,1,0.15,0.1,KILN); }
      if(t>BB_LOB){ gatherTo=0; lensTo=1; } }
    if(n==='glass_gout'){ const k=Math.min(1,t/GGT), on=t<GGT; lensTo=on?1+0.5*k:1; gatherTo=on?0.4+1.6*k*k:0;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=laneFill.visible=on; lane.rotation.y=laneFill.rotation.y=u.yaw; lane.position.copy(u.o).setY(0.012); laneFill.position.copy(u.o).setY(0.011); laneFill.scale.set(LANE_W,Math.max(0.001,k*LANE_L),1); u.mat.opacity=0.45+0.25*Math.sin(t*24)*k; if(on&&t>0.3&&Math.random()<d*14*k)motes(gatherW(),1,0.15,0.4,KILN); }
      if(t>GGT&&t<GGT+0.26&&fxOn&&Math.random()<d*70)spray(1); }
    if(n==='rage'){ lensTo=t>0.45?2.2:1+2*t; gatherTo=t<0.5?1.2*t/0.5:0; emberTo=t>0.55&&t<1.2?1.2:0; if(t>0.6&&t<1.2&&fxOn&&Math.random()<d*12)motes(gatherW(),1,0.15,0.6,KILN); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.6,1.3,KILN); }
    if(n==='death'){ if(t>1.3&&t<2.6&&fxOn&&Math.random()<d*8)motes(gatherW(),1,0.08,0.45,SMOKE); }
  }
  const smoothE=(x)=>{x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x);};
  function updateFx(d){
    lens+=(lensTo-lens)*Math.min(1,d*(lens>lensTo?5:12)); gatherG+=(gatherTo-gatherG)*Math.min(1,d*(gatherG>gatherTo?3:10)); emberG+=(emberTo-emberG)*Math.min(1,d*(emberG>emberTo?3:10)); flash=Math.max(0,flash-d*3.2);
    cool+=(coolTo-cool)*Math.min(1,d*(coolTo>cool?0.8:5)); coolU.value=fxOn?cool:(sel.dead?1:0);
    const on=fxOn?1:0; const burn=rageW*(0.85+0.3*Math.sin(clockT*17)*Math.sin(clockT*6.1)); const breath=0.1*Math.sin(clockT*2*Math.PI/3);
    // the lens and the gather burn a little brighter than the embers at rest; the rage makes everything burn and flicker
    glowU.value.set(on*Math.max(-0.6,0.35*(lens-1)+0.15+0.3*burn),on*(0.25+breath+0.3*gatherG+0.25*burn),feel?flash:0,on*(0.3+0.25*emberG+0.5*burn));
    if(bubble&&!(shot&&!shot.done&&shot.name==='glass_bubble'))bubble.visible=false;
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(ring&&!(shot&&!shot.done&&shot.name==='glass_bubble'&&shot.action.time<BBT)){ ring.visible=ringFill.visible=false; }
    if(lane&&!(shot&&!shot.done&&shot.name==='glass_gout'&&shot.action.time<GGT)){ lane.visible=laneFill.visible=false; }
    // the glass patch: bright as it lands, settling to pale glass, gone after the 4 s it lasts
    PATCHES.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/PATCH_LIFE; if(u>=1){p.t=-1;p.g.visible=false;return;} p.g.visible=fxOn; const f=u>0.85?(1-u)/0.15:1, grow=Math.min(1,p.t/0.12); p.g.scale.setScalar(0.5+0.5*grow);
      p.d.material.opacity=(0.16+0.2*Math.max(0,1-p.t/0.4))*f; p.rim.material.opacity=0.42*f; p.sm.opacity=0.5*f; });
    DROPS.forEach(q=>{ if(q.t<0)return; q.t+=d; const u=(q.t-q.delay)/1.0; if(u<0){q.m.visible=false;return;} if(u>=1){q.t=-1;q.m.visible=false;return;} q.m.visible=fxOn; q.m.material.opacity=0.45*(1-u); q.m.scale.setScalar(0.6+0.6*Math.min(1,u*6)); });
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // a little dust where each boot comes down on the walk and the turns
  const STEP={L:[0.0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn){ dust(pt(bones[STEP[k][1]],[0,-0.06,0.03]),3,0.5,0.25); } stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
hands = json.load(open(sys.argv[5]))
mm = lambda k: max(v[k] for v in hands.values())
fmt = lambda v: '0 mm in every move' if v < 0.5 else '%.0f mm at worst' % v
VW, VH = sys.argv[6].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__RIGHT__', fmt(mm('right_mm'))).replace('__LEFT__', fmt(mm('left_mm')))
bad = [k for k in ('sword', 'THORNS', 'thicket', ' her ', ' she ', 'scythe', 'antler', 'whip', 'crozier', 'Abbess', 'sledge', 'SLEDGE', 'grate', 'Grate', 'VISOR', 'Molten Rush', 'furnaceknight', 'thorn-model', '__TRIS__', '__MB__', '__VW__', '__RIGHT__', '__LEFT__') if k in page]
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.55,0.5,1)" in page and 'spawn him back in' in page and 'bones.head,LENS),6' in page and 'col:col||VIOLET' in page and not bad, bad
open(out, 'w').write(page); print('wrote', out, len(page))
