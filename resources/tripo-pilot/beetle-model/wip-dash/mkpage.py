import re,sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
H=open(S+'/review/index.html').read()
body=open(S+'/beetlew/body.html').read()
a=H.index('<div class="wrap">'); b=H.index('<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">')
p=H[:a]+body+H[b:]
def rep(o,n,c=1):
    global p
    assert o in p,o[:90]; p=p.replace(o,n,c)
rep('<title>Tripo Healer Review</title>','<title>Tripo Beetle Review</title>')
rep('<script src="healer-model.js"></script>','<script src="beetle-model.js"></script>\n<script src="bell-model.js"></script>')
rep("window.HEALER_GLB_B64","window.MODEL_GLB_B64")
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','hop','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',combo:'Mallet combo',dash:'Dash',hurt:'Hurt',wave:'Wave',hop:'Wing hop',downed:'Downed',crawl:'Crawl',spawn:'Spawn',tap:'Tap attack',castPoint:'Cast: clapper',castBloom:'Cast: peal',castPlant:'Cast: hang a bell',castSweep:'Cast: bell swing'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','hop','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['combo','combo1','combo2','combo3','wave','hop','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={combo:[0.22,0.56,0.90,1.00,1.10,1.22],combo1:[0.22],combo2:[0.28],combo3:[0.24,0.34,0.44,0.56],castPoint:[0.36],castBloom:[0.50,0.74,0.98],castPlant:[0.40,0.56],castSweep:[0.42],hop:[0.20,0.66]};"+p[b:]
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
      const hitNo=key==='combo'?i+1:key==='combo1'?1:key==='combo2'?2:key==='combo3'?3+i:0; const fx=hitNo?HITFX[hitNo-1]:CASTFX[key]||{pw:0.3}; const pw=fx.pw;
      hitstop=pw>0?0.035+0.085*pw:0; squash=pw>0?0.35+0.55*pw:0; shake=Math.max(shake,pw>=0.45?pw:0); castFx(key,hitNo,i); if(fx.at){ringT=0;ringAt=fx.at;ringSize=fx.size;}}});} a.__prev=t;});
  }
  // hit feel per hit. A bell-ringer's strokes: the two taps freeze a little, the three quick strokes on the great bell barely at all, the last stroke, the clapper and the bell swing land heavy; the camera only shakes on those.
  const HITFX=[{pw:0.2},{pw:0.25},{pw:0.05},{pw:0.05},{pw:0.05},{pw:0.8}], CASTFX={castPoint:{pw:0.6},castBloom:{pw:0.15},castPlant:{pw:0.1},castSweep:{pw:0.55},hop:{pw:0}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0xF5D06B,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.62,0).applyMatrix4(staff.matrixWorld); tB.set(0,0.98,0).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^(combo|castSweep|castPoint)/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.96,0.82,0.42,0.03*k); C.setXYZW(i*2+1,0.96,0.82,0.42,0.2*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.3*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/beetlew/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={fx:()=>({motes:FXP.length,rings:RINGS.filter(s=>s.t>=0).length,wave:WAVES.filter(w=>w.t>=0).length,bells:BELLS.filter(b=>b.t>=0).map(b=>b.tag+':'+b.t.toFixed(2)),bellTris:window.__bellTris||0}),sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.04:0;")
rep("const UPPER=/^(spine|chest|head|ear|upperarm|forearm|hand|fingers)/","const UPPER=/^(spine|chest|head|ant|cape|pole|bell|upperarm|forearm|hand|fingers)/")
rep("const VIEWS={Close:{p:[1.3,0.95,2.6],t:[0,0.5,0.1]},","const VIEWS={Close:{p:[1.3,0.95,2.6],t:[0,0.5,0.1]},Attack:{p:[3.0,1.7,3.4],t:[0,0.4,0.9]},")
import sys; sys.path.insert(0,S); from dashrule import apply as dashrule; p=dashrule(p)
from dashkit import apply as dashkit
p=dashkit(p,{'free':True,'go':[0,0],'dist':0,'inv':[0,0],'ev':[],
  'note':'Her dash is the bell: she throws the mallet up and calls, a great bell drops over her in 0.36 s, and under it she cannot be hit and walks where you steer with Going, at one and a half times her walking speed, for up to 2.5 s. Tap attack or any cast lifts the bell and plays; so does pressing Dash again, or the end of its time. It is the longest dash and the slowest.'},open(S+'/beetlew/dashfx.js').read())
rep("else if(sel.dash){mixOf('dash',sel.dir).forEach(m=>want.push(m)); parts='Whole body: dash '+dl+' · invincible'+(cancelNote?' · '+cancelNote:'');}",
    "else if(sel.dash){ if(bellPh==='in'){mixOf('walk',sel.dir).forEach(m=>want.push(m)); parts='Under the bell: walking '+dl+' · invincible';} else {want.push({n:'dash',once:true}); parts='Whole body: calling the bell'+(cancelNote?' · '+cancelNote:'');} }")
rep("sel.dash?DIRV[sel.dir].map(v=>v*2.2):","sel.dash?(bellPh==='in'?DIRV[sel.dir].map(v=>v*BELL_SPEED):null):")
rep("const on=sel.dash&&!sel.downed&&!rising; invClock+=d;","const on=sel.dash&&bellPh==='in'&&!sel.downed&&!rising; invClock+=d;")
rep("[sel.dash?'Dash · invincible':LABEL[sel.base],","[sel.dash?(bellPh==='in'?'Bell dash · invincible':'Bell dash · calling'):LABEL[sel.base],")
rep("else if(k==='dash'){sel.dash=!sel.dash; if(sel.dash)dashCancel(); else cancelNote='';}","else if(k==='dash'){sel.dash=!sel.dash; if(sel.dash){dashCancel(); bellStart();} else {cancelNote=''; sel.dash=true; bellEnd('off');}}")
rep("  function pick(k){\n","  function pick(k){\n    if(sel.dash&&(k==='tap'||ACTIONS.includes(k))){ bellEnd('attack'); cancelNote=''; }\n")
rep("else if(sel.dash){off=true;why='Dash uses the whole body, so it plays alone.';}","else if(sel.dash&&!(k==='tap'||ACTIONS.includes(k))){off=true;why='Under the bell she only walks. An attack or a cast lifts it.';}")
rep("window.__review={","window.__review={bellS:()=>({ph:bellPh,t:+bellT.toFixed(2),dash:sel.dash}),")
import re
p,c=re.subn(r"walks, runs or dashes while she keeps facing the same way","walks, runs or steers the bell while she keeps facing the same way",p); assert c==1
p,c=re.subn(r"4 dashes","1 dash (the bell call)",p); assert c>=1
p,c=re.subn(r"(<dt>Moves</dt><dd>)(\d+)",lambda m:m.group(1)+str(int(m.group(2))-3),p); assert c==1
open(S+'/beetlereview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
