# Builds the Vein Matron's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are her own). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Bell Abbess Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Bell Abbess from Tripo, rigged</h1>
    <p class="lede">Your export of the Still Spire champion, with a skeleton and 11 moves added by hand. Their timings are the game's. Pick a move, drag to turn her, and judge the rope ride, the peal and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what she does between attacks, and Going turns her on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves her standing where she turned to stone: press it again and she spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is her state under half health: it stays on over every move until you switch it off, and she glides faster. In both attacks the hero stands 3 u off. The Rope Swing carries her 4.2 u down the lane, to 1.2 u past the hero, and the stage follows her.</p>
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
      <img src="bellabbess-views.png" alt="The Tripo Bell Abbess from the front, both sides and the back" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">She came through whole: nothing doubled and nothing missing. She stands on a round plinth with no legs, like a saint's statue, and holds a crozier with a bell in its crook instead of the game's rope and hand-bell. Three welds were cut: the crozier's shaft was welded through her right fist (now it rides in that hand on its own joint), the bell's neck was welded into the crook's hook (now it swings and tolls), and the inside edge of her left sleeve was stuck to the robe at the belt (now the sleeve hangs free when she lifts her arm).</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,744 as sent, 42 added to close the cuts at the fist and the bell</small></dd></div>
    <div><dt>Bones</dt><dd>16 <small>hips, spine, chest, head, 2 in the habit, 3 in each arm, a sleeve on each arm, the crozier and its bell</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>3.15 u to the top of the crozier <small>My guess from the game's body radius of 0.6 u, beside a 1 u hero. Say if she should be bigger or smaller.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>She stands as still as the statue she looks like and breathes slowly. The blessing hand lifts a little and settles, the head bows a touch and rises, and the bell stirs in the crook.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>She glides on her plinth as if carried in a procession. She leans a little into it and sways with an unseen step, the habit ripples, the sleeves trail, and the crozier is carried just off the floor, rocking so the bell swings. The blessing hand stays raised.</td><td>Game: 1.1 u/s. 2 s loop. Enraged: 1.27 u/s, the same loop played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the plinth, the head leading and the crozier swinging out.</td><td>100° a second (my number: the game turns her instantly)</td></tr>
      <tr><td>Rope Swing</td><td>The great bell's rope drops out of the dark above her. Her blessing hand goes up and closes on it, and she hangs her weight on it, bowing, the crozier drawn back. At half the warning she rides: she is lifted off the floor in an arc and swings down the lane, tipping back on the way up and forward on the way down, the habit and sleeves streaming. She lands at the lane's end, the habit flares, and she plants the crozier with a toll. The lane strikes, the hero is knocked aside, and she lets the rope go: it swings away up into the dark.</td><td>Game: 1.1 s lane warning (1.2 u wide, from her to 1.2 u past a hero 2.4 to 7.5 u off). She stands for the first half, rides from 50 to 92 percent of it in an arc 1.1 u high at the top, and is down at the lane's end before it strikes. Held 3 frames, lets go 0.3 s, settle 0.6 s. 14 damage and a 1.6 u knock to the side.</td></tr>
      <tr><td>Vesper Peal</td><td>She lifts the crozier high and tips it back over her right shoulder, turning her face up, the blessing hand opening toward the cone. The bell shivers in the crook faster and faster. On the warning's end she swings the crozier down and forward so the crook points at the cone, and the bell tolls: the peal rolls out over the cone in three waves, and a hero it catches is rung still.</td><td>Game: 1.0 s cone warning (r 4.4 u, 36° each side), the swing 2.5 frames landing on the warning's end, held 3 frames, the bell sings on 0.3 s, settle 0.6 s. 11 damage and a 55 percent slow for 1.2 s.</td></tr>
      <tr><td>Rage</td><td>She bows over the crozier, drawing it in to her breast. Then she rears up and thrusts it high, the blessing hand flung up and open and the head thrown back, and the bell clangs wildly. The Enraged state stays on after it: drawn up stiff, the blessing hand raised higher with the palm thrust out and trembling, the bell keeping up a nervous ring, the eyes and the bells at her belt burning.</td><td>Mine: 1.6 s. The game does not stop her: below half health she glides 15 percent faster and her moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The head and chest flinch back, the blessing hand jolts up, and the bell knocks. Plays on top of any move.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Her plinth holds, so she is not thrown back: she bends back from the waist, the crozier swaying out and the bell swinging wide. She rocks forward past upright, catches herself on the crozier and straightens, and the bell rings down.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor bowed in prayer over the crozier, the blessing hand at her breast. She straightens, lifts her face (her eyes light), raises the blessing hand high, and the bell rings once.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The prayer and the chime are mine.</td></tr>
      <tr><td>Death</td><td>The bell cracks: a last toll jolts her upright and back, and the light goes out of her eyes. She draws the crozier in to her breast and takes it in both hands, then bows over it, sinking a little into her habit with her head bowed to the crook. The colour drains out of her and she stays there: a statue at prayer on her plinth.</td><td>2.8 s, then she stays. The stone is mine.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>The plinth moving</td><td>0 mm in every move. It is tied to the floor, and the habit bends above it. In the Rope Swing the page lifts her whole, plinth and all, as the game does.</td></tr>
      <tr><td>A hand falling short of where it reaches (the crozier, the rope, both hands on the crozier in the death)</td><td>__ARM__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor, the crozier included</td><td>__UNDER__</td></tr>
      <tr><td>Legs</td><td>She has none, so the rule about feet pointing straight ahead does not apply. She glides.</td></tr>
      <tr><td>The head</td><td>Faces straight ahead at rest, and stays to the front through the turns and both attacks.</td></tr>
      <tr><td>The crozier</td><td>Rides in her right fist on its own joint, so it never bends. When she stands it is held upright with its foot on the floor; in the attacks it goes where the move takes it. Its foot never passes under the floor.</td></tr>
      <tr><td>The bell</td><td>Hangs from the hook on its own joint and swings a beat after the crozier. It is rung by hand in the peal, the landing, the rage, the spawn and the death.</td></tr>
      <tr><td>The arms and sleeves</td><td>Each hand, forearm and cream sleeve is cut out from the robe along the cheapest fold, so lifting the arm does not drag the robe. The sleeves hang under their own weight from the forearms. Looked at close at the top of the rope reach, the peal, the rage and the end of the death: no tears, no spikes.</td></tr>
      <tr><td>The habit</td><td>Two joints. Its hem stays level on the plinth whatever the waist does.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The plinth.</strong> She keeps it, glides on it, and rides the rope with it. It could be taken off so she stands on the floor in her habit, as the game's abbess does.</li>
        <li><strong>The rope.</strong> The game shows the rope in her hand all the time. Here it drops out of the dark only for the Rope Swing, because the model's left hand is raised in blessing. Say if it should always be there.</li>
        <li><strong>The crozier and its bell.</strong> They stand in for the game's hand-bell: the peal is rung with the crozier's bell. Say if you want a separate hand-bell.</li>
        <li><strong>Death.</strong> She turns to stone at prayer. Two other ways to play it: the bell falls from the crook and she sinks into her plinth, or she topples from the plinth and the bell rolls away.</li>
        <li><strong>Rage.</strong> A new 1.6 s cry. The game has no pause at half health. The Enraged button shows the state without the cry.</li>
        <li><strong>Size.</strong> Drawn 3.15 u to the top of the crozier.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The upper arms are hidden under the capelet and the black over-sleeves, which are one skin with the shoulders. When she lifts the crozier high or reaches for the rope, the over-sleeve on that side stretches with the arm.</li>
        <li>The ten little bells on her belt, the hand-bell at her breast and the mitre are one skin with the body and do not swing.</li>
        <li>The plinth slides on the floor when she glides.</li>
        <li>The bell, the rope's ride and the sleeves do not feel the lift of the swing itself: their swing is set by hand.</li>
        <li>The rope, its glowing grip, the peal's waves and the stone are drawn by this page.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for her power. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="bellabbess-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=3.15;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, MAGENTA=0xC64BC0;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',ropeSwing:'Rope Swing',vesperPeal:'Vesper Peal',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['ropeSwing','vesperPeal','rage','heavyHit'];
  const HOME=3.0, HOME_OF={ropeSwing:3.0,vesperPeal:3.0}; // where the hero stands, in u, in front of her (she keeps 2.2 to 4.4 u off)
  const WALK=1.1, RAGEWALK=1.1*1.15, TURN=2*Math.PI/3.6, RST=66/60, RS_RIDE=0.5*66/60, RS_DROP=0.92*66/60, RS_HELD=66/60+0.1, LANE_W=1.2, LANE_L=3.0+1.2, LIFT=1.1, ROPE_TOP=7.5, VPT=60/60, CONE_R=4.4, CONE_A=36*Math.PI/180;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.9,0.9,1)') + r'''
  const VIEWS={Close:{p:[6.4,3.8,9.4],t:[0,1.6,1.0]},'Game zoom':{p:[0,16,14],t:[0,0.5,2.6]},Side:{p:[14,2.3,1.8],t:[0,1.6,1.8]},Front:{p:[3.8,2.4,12.6],t:[0,1.6,0]},Back:{p:[-4.4,4,-9.8],t:[0,1.6,0.6]},Top:{p:[0,21,0.4],t:[0,0.4,2.4]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, stoneU={value:0}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the face round the eyes (x), the bell in the crook (y) and the bells at her belt and breast (z). The eyes
    // are drawn in the texture, so only their pale blue texels light; the bell flares when it tolls; the belt burns in the
    // rage. uStone drains the colour from her when she dies.
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU; sh.uniforms.uStone=stoneU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;\nuniform float uStone;').replace('#include <map_fragment>','#include <map_fragment>\nfloat ey=smoothstep(0.08,0.25,diffuseColor.b-diffuseColor.r)*vMask.x;\nfloat gl=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(gl*0.8+0.06),uStone);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.55,0.75,1.0)*uGlow.x*ey+vec3(0.62,0.45,1.0)*uGlow.y*vMask.y+vec3(0.6,0.42,1.0)*uGlow.w*vMask.z+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|handL|upperarmR|forearmR|handR)\.quaternion/; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),lane:lane.visible,crack:crack.visible,cone:cone.visible,rope:rope.visible,lift:+model.position.y.toFixed(2),tilt:+model.rotation.x.toFixed(2),waves:WAVES.filter(w=>w.t>=0).length,still:+stillT.toFixed(2),bell:+bellG.toFixed(2),stone:+stoneU.value.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,EYES),6,0xfff4e0,1.6,0.25)").replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is her power)
  const FXP=[], RINGS=[], WAVES=[]; let dotTex=null, rune=null, lane=null, laneFill=null, crack=null, cone=null, coneRim=null, rope=null, sally=null, stillRing=null;
  let eyes=1, eyesTo=1, bellG=0, bellTo=0, beltG=0, beltTo=0, dark=0, darkTo=0, stone=0, stoneTo=0, stillT=0;
  const EYES=[0,0.1,0.07], BELL=[0.011,-0.06,0.0], PALM=[0.015,0.07,0.02];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Rope Swing's warning: an Ember lane in front of her that fills along its length; at the strike a Violet streak runs down it
    const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    laneFill=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    lane=new THREE.Group(); const lm=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false});
    [[-LANE_W/2,0.035,LANE_L,-LANE_L/2],[LANE_W/2,0.035,LANE_L,-LANE_L/2],[0,LANE_W,0.035,-LANE_L],[0,LANE_W,0.035,0]].forEach(([x,w,h,y])=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm); e.position.set(x,y,0); lane.add(e);}); lane.userData.mat=lm;
    crack=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); crack.userData.t=-1;
    [lane,laneFill,crack].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    // the Vesper Peal's warning: an Ember cone in front of her that fills; at the toll three Violet waves roll out over it
    const T0=1.5*Math.PI-CONE_A, TL=2*CONE_A;
    cone=new THREE.Mesh(new THREE.CircleGeometry(1,48,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    coneRim=new THREE.Mesh(new THREE.RingGeometry(0.985,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false}));
    [cone,coneRim].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);}); coneRim.scale.setScalar(CONE_R);
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); WAVES.push({m,t:-1,delay:i*0.09}); }
    // the great bell's rope: hemp, from her fist up out of sight; its woven grip glows Violet as the swing comes
    const rg=new THREE.CylinderGeometry(0.028,0.028,1,6); rg.translate(0,0.5,0);
    rope=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({color:0x8a7350,roughness:1,transparent:true,opacity:1})); rope.visible=false; scene.add(rope);
    const sgm=new THREE.CylinderGeometry(0.05,0.05,0.42,8); sgm.translate(0,0.21,0);
    sally=new THREE.Mesh(sgm,new THREE.MeshStandardMaterial({color:0x4b3a6e,roughness:0.8,emissive:VIOLET,emissiveIntensity:0,transparent:true})); sally.visible=false; scene.add(sally);
    // the slow: a Violet ring that tightens at the feet of a hero she rang still, for the 1.2 s it lasts
    stillRing=new THREE.Mesh(new THREE.RingGeometry(0.86,1,40),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); stillRing.rotation.x=-Math.PI/2; stillRing.visible=false; scene.add(stillRing);
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.2); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane){lane.visible=laneFill.visible=false;crack.visible=false;crack.userData.t=-1;cone.visible=coneRim.visible=false;rune.visible=false;rope.visible=sally.visible=false;stillRing.visible=false;} WAVES.forEach(w=>{w.t=-1;w.m.visible=false;}); stillT=0; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bellW=()=>pt(bones.bell,BELL);
  const palmW=()=>pt(bones.handL,PALM);
  const underW=()=>pt(bones.hips,[0,0,0]).setY(0.02);
  let runeT=-1, laneT=-1, coneT=-1, ropeT=-1;
  function fxStart(name){
    beltTo=0; if(lane){lane.visible=laneFill.visible=false;cone.visible=coneRim.visible=false;} laneT=-1; coneT=-1;
    if(name==='ropeSwing'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.ropeSwing)>0.3){ dummy.userData.z=HOME_OF.ropeSwing; dummy.userData.x=0; } if(dummy)dummy.userData.hold=RST+0.6; const o=toFloor(new THREE.Vector3(0,0,0)), yaw=-floorYaw; lane.userData.o=o; lane.userData.yaw=yaw; lane.userData.hit=false;
      rope.userData.top=o.clone().add(new THREE.Vector3(0,ROPE_TOP,LANE_L/2).applyAxisAngle(Y,yaw)); ropeT=0; if(fxOn)laneT=0; }
    if(name==='vesperPeal'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.vesperPeal)>0.3){ dummy.userData.z=HOME_OF.vesperPeal; dummy.userData.x=0; } cone.userData.o=toFloor(new THREE.Vector3(0,0,0)); cone.userData.yaw=-floorYaw; if(fxOn)coneT=0; }
    if(name==='spawn'){ eyes=0; eyesTo=0; dark=1; darkTo=1; stone=0; stoneTo=0; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; bellG=0.8; if(fxOn)sparks(pt(bones.chest,[0,0.05,0.1]),12,0xfff4e0,2.4,0.3); }
    if(name==='death'){ hitFeel(0.5,0.06,0.4); flash=0.4; }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxContact(name,i){
    if(name==='ropeSwing'&&i===0){ hitFeel(0.6,0.05,0.7); bellG=2.0; if(fxOn){ dust(underW(),12,1.8,0.5); ringAt(underW(),{r0:0.5,r1:1.8,dur:0.34,a:0.3,col:DUST}); ringAt(bellW(),{r0:0.1,r1:0.9,dur:0.4,a:0.35,bill:true}); } }
    if(name==='ropeSwing'&&i===1){ hitFeel(0.8,0.07,0.5); eyes=2.0; const u=lane.userData;
      if(fxOn){ crack.userData.t=0; crack.position.copy(u.o).setY(0.017); crack.rotation.y=u.yaw; }
      if(dummy&&showTarget){ const p=targetW().applyMatrix4(fxG.matrix.clone().invert()).sub(u.o).applyAxisAngle(Y,-u.yaw); if(Math.abs(p.x)<LANE_W/2+0.25&&p.z>-0.3&&p.z<LANE_L+0.3){ u.hit=true; hitDummy(0.05); dummy.userData.sx=12.8; if(fxOn)sparks(targetW().setY(0.55),10,0xd9c8ff,2.0,0.3); } } }
    if(name==='vesperPeal'){ hitFeel(0.8,0.07,0.6); eyes=2.2; bellG=2.6; const u=cone.userData;
      if(fxOn){ WAVES.forEach(w=>{w.t=0; w.m.position.copy(u.o).setY(0.018); w.m.rotation.y=u.yaw;}); const b=bellW(); ringAt(b,{r0:0.1,r1:1.0,dur:0.35,a:0.4,bill:true}); ringAt(b,{r0:0.1,r1:0.7,dur:0.3,a:0.3,bill:true,delay:0.1}); sparks(b,8,0xd9c8ff,1.6,0.3); }
      if(dummy&&showTarget){ const p=targetW().applyMatrix4(fxG.matrix.clone().invert()).sub(u.o).applyAxisAngle(Y,-u.yaw); const r=Math.hypot(p.x,p.z), a=Math.atan2(p.x,p.z); if(r<CONE_R+0.25&&Math.abs(a)<CONE_A+0.1){ hitDummy(0.25); stillT=1.2; } } }
    if(name==='rage'){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); eyes=2.6; bellG=2.2; beltG=1.6; const b=bellW(); if(fxOn)[0,0.12,0.24].forEach(dl=>ringAt(b,{r0:0.15,r1:1.6,dur:0.6,a:0.3,bill:true,delay:dl})); }
    if(name==='spawn'){ hitFeel(0.25,0.03,0.3); eyesTo=1; eyes=1.8; bellG=1.8; darkTo=0; if(fxOn){ ringAt(bellW(),{r0:0.1,r1:1.1,dur:0.45,a:0.35,bill:true}); ringAt(underW(),{r0:0.3,r1:1.6,dur:0.4,a:0.3}); } }
    if(name==='heavyHit'){ if(i===1){ hitFeel(0.2,0,0.2); } }
    if(name==='death'){ if(i===0){ bellG=2.6; if(fxOn){ const b=bellW(); sparks(b,14,0xd9c8ff,2.2,0.35); ringAt(b,{r0:0.1,r1:0.9,dur:0.3,a:0.4,bill:true}); } darkTo=1; eyesTo=0; }
      if(i===1){ hitFeel(0.35,0.03,0.3); stoneTo=1; if(fxOn){ dust(underW(),10,1.4,0.4); ringAt(underW(),{r0:0.4,r1:1.8,dur:0.34,a:0.3,col:DUST}); } } }
  }
  // she rides the rope: lifted in the game's arc (1.1 u high at the top) and tipped back on the way up, forward on the way
  // down, about a point at her raised hand; the floor carries her down the lane (the move's travel)
  const RIDE_PIV=2.6;
  function rideUpdate(){
    let lift=0, tilt=0;
    if(shot&&!shot.done&&shot.name==='ropeSwing'){ const q=(shot.action.time-RS_RIDE)/(RS_DROP-RS_RIDE); if(q>0&&q<1){ lift=LIFT*Math.sin(Math.PI*q); tilt=(-0.3+0.6*q)*Math.min(1,Math.sin(Math.PI*q)*3); } }
    model.rotation.x=tilt; model.position.set(0,lift+RIDE_PIV*(1-Math.cos(tilt)),-RIDE_PIV*Math.sin(tilt));
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='ropeSwing'){ const k=Math.min(1,t/RST), on=t<RST; eyesTo=on?1+0.6*k:1;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=laneFill.visible=on; lane.rotation.y=laneFill.rotation.y=u.yaw; lane.position.copy(u.o).setY(0.012); laneFill.position.copy(u.o).setY(0.011); laneFill.scale.set(LANE_W,Math.max(0.001,k*LANE_L),1); u.mat.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(t>RS_RIDE&&t<RS_DROP&&fxOn&&Math.random()<d*20)motes(underW().setY(0.4),1,0.8,-0.4); }
    if(n==='vesperPeal'){ const k=Math.min(1,t/VPT), on=t<VPT; eyesTo=on?1+0.9*k:1; bellTo=on&&t>0.5?0.4+1.2*k:0;
      if(coneT>=0&&fxOn){ const u=cone.userData; cone.visible=coneRim.visible=on; cone.rotation.y=coneRim.rotation.y=u.yaw; cone.position.copy(u.o).setY(0.011); coneRim.position.copy(u.o).setY(0.012); cone.scale.setScalar(Math.max(0.001,k*CONE_R)); coneRim.material.opacity=0.45+0.25*Math.sin(t*24)*k; if(on&&t>0.55&&Math.random()<d*14)motes(bellW(),1,0.2,0.3); } }
    if(n==='rage'){ eyesTo=t>0.34?2.4:1+2*t; beltTo=t>0.34&&t<1.2?1.2:0; if(t>0.42&&t<1.1&&fxOn&&Math.random()<d*18)motes(bellW(),1,0.5,0.8); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); }
  }
  // the rope: it drops out of the dark onto her raised hand (0 to 0.3 s), is held through the ride, and after the strike it
  // is let go and swings back up out of sight. It always leans to its anchor high over the middle of the lane.
  function ropeUpdate(d){
    const live=shot&&shot.name==='ropeSwing'&&ropeT>=0&&fxOn&&!sel.dead; if(!live){ rope.visible=sally.visible=false; if(!(shot&&shot.name==='ropeSwing'))ropeT=-1; return; }
    const t=shot.done?META.ropeSwing.dur:shot.action.time; const top=rope.userData.top.clone().applyMatrix4(fxG.matrix), hand=palmW();
    let bot=hand.clone(), a=1;
    if(t<0.3){ const e=1-Math.pow(1-t/0.3,3); bot=hand.clone().lerp(top,1-e).setY(Math.max(hand.y,top.y-(top.y-hand.y)*e)); }
    if(t>RS_HELD){ const r=Math.min(1,(t-RS_HELD)/0.6); const swing=top.clone().setY(top.y-3.5); bot=hand.clone().lerp(swing,r*0.6); bot.y+=r*r*4; a=1-r; }
    const v=top.clone().sub(bot); const len=v.length(); rope.position.copy(bot); rope.quaternion.setFromUnitVectors(Y,v.normalize()); rope.scale.set(1,len,1); rope.material.opacity=a; rope.visible=a>0.02;
    const held=t>=0.25&&t<=RS_HELD; sally.visible=rope.visible; sally.position.copy(bot).addScaledVector(v,-0.1); sally.quaternion.copy(rope.quaternion); sally.material.opacity=a;
    sally.material.emissiveIntensity=(held?0.25+0.6*Math.min(1,t/RST):0.15)*(0.85+0.15*Math.sin(clockT*14))+0.3*rageW;
  }
  function updateFx(d){
    eyes+=(eyesTo-eyes)*Math.min(1,d*(eyes>eyesTo?5:12)); bellG+=(bellTo-bellG)*Math.min(1,d*(bellG>bellTo?4:10)); beltG+=(beltTo-beltG)*Math.min(1,d*(beltG>beltTo?3:10)); dark+=(darkTo-dark)*Math.min(1,d*(darkTo>dark?1.6:4)); flash=Math.max(0,flash-d*3.2);
    stone+=(stoneTo-stone)*Math.min(1,d*(stoneTo>stone?0.9:6)); stoneU.value=stone;
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    const ex=eyes>=1?0.35*(eyes-1):-0.9*(1-eyes);
    glowU.value.set(Math.max(-0.5,on*(ex+0.25+(sel.dead?0:0.5*burn))-0.75*dark),Math.max(0,on*(bellG+0.3*burn)*0.12*(1-dark)),feel?flash:0,Math.max(0,on*(beltG+0.7*burn)*0.05*(1-dark)));   // only the eyes may go below nothing (they go out); the bells just stop shining
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(lane&&!(shot&&!shot.done&&shot.name==='ropeSwing')){ lane.visible=laneFill.visible=false; laneT=-1; }
    if(cone&&!(shot&&!shot.done&&shot.name==='vesperPeal')){ cone.visible=coneRim.visible=false; coneT=-1; }
    ropeUpdate(d);
    // the strike: a Violet streak runs down the lane behind her in 0.12 s and fades
    if(crack&&crack.userData.t>=0){ const u=crack.userData; u.t+=d; const run=Math.min(1,u.t/0.12), fade=u.t<0.12?1:1-(u.t-0.12)/0.4; if(fade<=0){u.t=-1;crack.visible=false;} else { crack.visible=fxOn; crack.scale.set(0.5,Math.max(0.001,run*LANE_L),1); crack.material.opacity=0.4*fade; } }
    // the peal: three waves roll out over the cone in 0.45 s each, a beat apart
    WAVES.forEach(w=>{ if(w.t<0)return; w.t+=d; const u=(w.t-w.delay)/0.45; if(u<0){w.m.visible=false;return;} if(u>=1){w.t=-1;w.m.visible=false;return;} w.m.visible=fxOn; w.m.scale.setScalar(0.4+(CONE_R-0.4)*u); w.m.material.opacity=0.42*(1-u); });
    // rung still: the ring at the hero's feet tightens over the slow's 1.2 s
    if(stillT>0&&dummy){ stillT=Math.max(0,stillT-d); stillRing.visible=fxOn&&showTarget; stillRing.position.set(dummy.position.x,0.02,dummy.position.z); stillRing.scale.setScalar(0.35+0.25*stillT/1.2); stillRing.material.opacity=0.5*Math.min(1,stillT/0.3); if(fxOn&&Math.random()<d*10)motes(targetW().setY(0.3),1,0.4,0.25); } else if(stillRing) stillRing.visible=false;
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  function footfalls(){}   // she has no feet

''' + ln(355, 384).replace("model.updateMatrixWorld(true); footfalls();", "rideUpdate(); model.updateMatrixWorld(true); footfalls();").replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
aud = json.load(open(sys.argv[5]))
arm = max(v.get('arm_mm', 0) for v in aud.values())
VW, VH = sys.argv[7].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__ARM__', '0 mm in every move' if arm < 0.5 else '%.0f mm at worst' % arm).replace('__UNDER__', sys.argv[6])
bad = [k for k in ('sword', 'THORNS', 'thicket', ' his ', ' him ', 'scythe', 'antler', 'whip', 'heartW', 'Vein', 'footL', 'Gravebell', 'Lockkeeper', 'boot', 'veinmatron', '__TRIS__', '__MB__', '__UNDER__', '__VW__', '__ARM__') if k in page]
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.9,0.9,1)" in page and 'spawn her back in' in page and 'bones.head,EYES),6' in page and 'PIV=new THREE.Vector3(0,0,0)' in page and 'rideUpdate(); model.updateMatrixWorld' in page and not bad, bad
open(out, 'w').write(page); print('wrote', out, len(page))
