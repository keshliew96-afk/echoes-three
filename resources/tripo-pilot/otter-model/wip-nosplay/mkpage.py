import re,sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
H=open(S+'/review/index.html').read()
body=open(S+'/otterw/body.html').read()
a=H.index('<div class="wrap">'); b=H.index('<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">')
p=H[:a]+body+H[b:]
def rep(o,n,c=1):
    global p
    assert o in p,o[:90]; p=p.replace(o,n,c)
rep('<title>Tripo Healer Review</title>','<title>Tripo Otter Review</title>')
rep('<script src="healer-model.js"></script>','<script src="otter-model.js"></script>')
rep("window.HEALER_GLB_B64","window.MODEL_GLB_B64")
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['hold','castPoint','castBloom','castPlant','castSweep','slide','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',hold:'Hold attack',stream:'water stream',tsunami:'tsunami',handPoint:'stream + left-paw torrent',handBloom:'stream + left-paw call the water',handPlant:'stream + left-paw whirlpool',handSweep:'stream + left-paw crashing wave',dash:'Dash',hurt:'Hurt',wave:'Wave',slide:'Ripple step',downed:'Downed',crawl:'Crawl',spawn:'Spawn',castPoint:'Cast: torrent',castBloom:'Cast: call the water',castPlant:'Cast: whirlpool',castSweep:'Cast: crashing wave'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['castPoint','castBloom','castPlant','castSweep','slide','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['stream','tsunami','handPoint','handBloom','handPlant','handSweep','wave','slide','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={tsunami:[0.68],handPoint:[0.30],handBloom:[0.45],handPlant:[0.34],handSweep:[0.36],castPoint:[0.44],castBloom:[0.60],castPlant:[0.40],castSweep:[0.46],slide:[0.26]};"+p[b:]
rep("const THROWS={throw:[0.42,1.22]}, GEMFLY={};","const THROWS={}, GEMFLY={};")
rep("    A.throwUp=mixer.clipAction(sub(by.throw,'throwUp',n=>UPPER.test(n)||n==='weapon'));\n","")
rep("a.setEffectiveTimeScale(w.sync?a.getClip().duration/0.7:1);","a.setEffectiveTimeScale(w.sync?a.getClip().duration/(/^dash/.test(w.n)?0.66:0.64):1);")
rep("const cur=document.getElementById('cur'); if(cur.dataset.name===name)return;","const cur=document.getElementById('cur'); if(!cur||cur.dataset.name===name)return;")
rep("const CUR={idle:'cur-idle.mp4',walk:'cur-walk.mp4',combo:'cur-combo.mp4',dash:'cur-dash.mp4',hurt:'cur-hurt.mp4'};","const CUR={};")
rep("    if(next===1){ if(gemLocked())return; recallGem(); }\n","")
rep("else{ if(k==='combo'&&sel.action!=='combo'){ if(gemLocked())return; recallGem(); } sel.action=sel.action===k?null:k;}","else{sel.action=sel.action===k?null:k;}")
rep("      else if((k==='tap'&&!sel.tap||k==='combo'&&sel.action!=='combo')&&gemLocked()){off=true;why='The gem is out. Hit 1 opens again 1 second after it leaves.';}\n","")
rep("if(wasFlying&&!fl&&throwAct&&feel){flash=0.7; riseAt(new THREE.Vector3(0,0,0.1),14,0.4);} wasFlying=fl;","wasFlying=fl;")
# contacts
a=p.index("  function watchContacts(){"); b=p.index("  function makeFx(){")
p=p[:a]+"""  function watchContacts(){
    running.forEach((a,n)=>{const key=n.replace(/Up$/,''); const cts=CT[key]; const t=a.time; if(cts&&feel&&a.__tw>0){cts.forEach((c,i)=>{if(a.__prev<c&&t>=c){
      const hitNo=key==='combo'?i+1:key==='combo1'?1:key==='combo2'?2:key==='combo3'?3:0; const fx=hitNo?HITFX[hitNo-1]:CASTFX[key]||{pw:0.3}; const pw=fx.pw;
      hitstop=pw>0?0.035+0.085*pw:0; squash=pw>0?0.35+0.55*pw:0; shake=Math.max(shake,pw>=0.45?pw:0); castFx(key,hitNo,i); if(fx.at){ringT=0;ringAt=fx.at;ringSize=fx.size;}}});} a.__prev=t;});
  }
  // hit feel per hit. Water swells before it breaks: the two bolts barely freeze, the staff slam, the whirlpool and the wave land heavy; the camera only shakes on those.
  const HITFX=[{pw:0.15},{pw:0.2},{pw:0.75}], CASTFX={tsunami:{pw:0.85},handPoint:{pw:0},handBloom:{pw:0},handPlant:{pw:0},handSweep:{pw:0},castPoint:{pw:0.45},castBloom:{pw:0},castPlant:{pw:0.6},castSweep:{pw:0.55},slide:{pw:0}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0x3F7FE6,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.76,0).applyMatrix4(staff.matrixWorld); tB.set(0,0.98,0).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^(tsunami|castSweep|castPlant)/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.25,0.5,0.9,0.04*k); C.setXYZW(i*2+1,0.9,0.95,0.97,0.24*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.3*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/otterw/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; pawL=model.getObjectByName('handL'); makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={fx:()=>({motes:FXP.length,shots:SHOTS.filter(s=>s.t>=0).length,pool:poolT,wave:waveT,stream:+sHead.toFixed(2),tail:+sTail.toFixed(2),wall:+tsuT.toFixed(2),orb:orb.visible}),hold:()=>({t:+holdT.toFixed(2),ph:holdPh,on:sel.hold}),setHold:(t)=>{holdT=t;},sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.04:0;")

# ---- Version 2: no hit combo. Holding attack streams water; after 5 s of stream she throws the tsunami; casts play once over a held attack and the stream picks up again
rep("const sel={base:'idle',dir:'F',action:null,hurt:false,dash:false,downed:false,crawl:false,tap:0};","const sel={base:'idle',dir:'F',action:null,hurt:false,dash:false,downed:false,crawl:false,tap:0,hold:false,hand:false}; let pawL=null; const HOLDMAX=5; let holdT=0, holdPh='stream', gaugeTxt='';")
rep("const act=sel.tap?'combo'+sel.tap:sel.action;","const act=sel.action?(sel.hand?'hand'+sel.action.slice(4):sel.action):(holdPh==='tsunami'?'tsunami':sel.hold?'stream':null), once=act==='tsunami'||sel.hand||(sel.hold&&!!sel.action);")
rep("want.push({n:act+'Up',once:!!sel.tap,restart:restartAction}); parts='Legs: '+sel.base+' '+dl+' · Upper body: '+(sel.tap?'combo hit '+sel.tap:LABEL[act].toLowerCase());","want.push({n:act+'Up',once,restart:restartAction}); parts='Legs: '+sel.base+' '+dl+' · Upper body: '+LABEL[act].toLowerCase();")
rep("want.push({n:act,once:!!sel.tap,restart:restartAction}); parts='Whole body: '+(sel.tap?'combo hit '+sel.tap:LABEL[act].toLowerCase());","want.push({n:act,once,restart:restartAction}); parts='Whole body: '+LABEL[act].toLowerCase();")
rep("!sel.dash&&sel.tap?'Combo hit '+sel.tap:null,","!sel.dash&&(sel.hold||holdPh==='tsunami')?(holdPh==='tsunami'?'Tsunami':'Hold attack'):null,")
rep("const pressed=k==='downed'?sel.downed:","const pressed=k==='hold'?sel.hold:k==='downed'?sel.downed:")
rep("else if(k==='downed'){off=!!(sel.action||sel.hurt||sel.dash||sel.tap);","else if(k==='downed'){off=!!(sel.action||sel.hurt||sel.dash||sel.hold||holdPh==='tsunami');")
rep("else if(k==='dash'){off=!!(sel.action||sel.hurt||sel.tap);","else if(k==='dash'){off=!!(sel.action||sel.hurt||holdPh==='tsunami');")
rep("else if(k==='tap'){off=!!sel.action;why='Only one upper-body move at a time.';}","else if(k==='hold'){off=false;}")
rep("off=!!((sel.action&&sel.action!==k)||sel.tap);why='Only one upper-body move at a time.';","off=!!((sel.action&&sel.action!==k)||holdPh==='tsunami');why=holdPh==='tsunami'?'She is throwing the tsunami.':'Only one upper-body move at a time.';")
rep("else{sel.action=sel.action===k?null:k;}","else{sel.action=sel.action===k?null:k; sel.hand=!!sel.action&&sel.hold&&holdPh==='stream'&&!sel.dash&&/^cast/.test(k);}")
rep("    if(k==='tap'){tapAttack();return;}\n","    if(k==='hold'){sel.hold=!sel.hold; holdT=0; if(sel.hold&&holdPh!=='tsunami')sel.action=null; last='idle'; apply(); return;}\n")
rep("else if(/^combo[123](Up)?$/.test(n)&&sel.tap){sel.tap=0;tapUntil=performance.now()/1000+0.4;apply();}});","else if(/^tsunami(Up)?$/.test(n)){holdPh='stream';holdT=0;apply();}\n      else if(sel.action&&/^(hand|cast|slide|wave)/.test(n)){sel.action=null;sel.hand=false;apply();}});\n    let spaceHeld=false; addEventListener('keydown',e=>{if(e.code!=='Space'||/^(INPUT|TEXTAREA)$/.test(e.target.tagName||''))return; e.preventDefault(); if(document.activeElement&&document.activeElement.blur)document.activeElement.blur(); if(e.repeat||spaceHeld)return; spaceHeld=true; if(!sel.hold)pick('hold');});\n    addEventListener('keyup',e=>{if(e.code!=='Space'||!spaceHeld)return; e.preventDefault(); spaceHeld=false; if(sel.hold)pick('hold');});")
rep("stepFades(d); mixer.update(d); watchContacts();","stepFades(d); mixer.update(d); watchContacts(); holdTick(d);")
rep("  let wasFlying=false;\n","""  let wasFlying=false;
  // the 5 seconds only count while the stream is really flowing: a cast, a dash or letting go stops the count; letting go empties it
  function holdTick(d){ const flowing=sel.hold&&holdPh==='stream'&&(!sel.action||sel.hand)&&!sel.dash&&!sel.downed&&!rising;
    if(flowing){ holdT+=d; if(holdT>=HOLDMAX&&!sel.action){ holdPh='tsunami'; apply(true); } }
    const g=holdPh==='tsunami'?'Tsunami':sel.hold?'Stream '+Math.min(HOLDMAX,holdT).toFixed(1)+' of '+HOLDMAX+' s'+(flowing?'':' (waiting)'):''; if(g!==gaugeTxt){gaugeTxt=g; const el=document.getElementById('gauge'); if(el)el.textContent=g;} }
""")
rep("const VIEWS={Close:{p:[1.3,0.95,2.6],t:[0,0.5,0.1]},","const VIEWS={Close:{p:[1.3,0.95,2.6],t:[0,0.5,0.1]},Attack:{p:[5.0,3.0,4.4],t:[0,0.2,1.7]},")
import sys; sys.path.insert(0,S); from dashrule import apply as dashrule; p=dashrule(p)
from dashkit import apply as dashkit
p=dashkit(p,{'go':[0.14,0.68],'dist':2.8,'inv':[0,0.70],'prof':'surge','ev':[['start',0.0],['rise',0.13],['break',0.66],['land',0.80]],
  'dummy':{'mode':'slow','at':[[1.2,0.42],[2.2,-0.42]],'r':-9,'w':0.01,'life':4.6},
  'note':'Her dash is a ride on a tide she calls up: she heaves the shell down, a tide taller than a foe heaves up under her feet and carries her side-on like a surfer, and it breaks where she steps off. The water it leaves on the floor stays 3 s and slows any foe standing in it (the two practice posts sway slowly while they are in it). She turns to face where she rides and cannot be hit until the tide breaks.'},open(S+'/otterw/dashfx.js').read())
NOTE_TOE='<p class="note"><strong>No turned-out feet (13 November).</strong> In every walk and run the toes now point straight ahead. Before, they turned out by 26 to 40 degrees (外八). Each leg turns in at the hip by as much as the foot was modelled turned out, in every frame and in all eight directions; the steps themselves are unchanged, and standing still keeps the modelled stance. Checked as numbers and as stills from above and from the front, not at full speed.</p>\n'
assert p.count('<p class="note">')>0
p=p.replace('<p class="note">',NOTE_TOE+'<p class="note">',1)
open(S+'/otterreview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
