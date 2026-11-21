import re,sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
H=open(S+'/review/index.html').read(); T=open(S+'/tankreview/index.v4.html').read()
body=open(S+'/tank/body.html').read()
a=H.index('<div class="wrap">'); b=H.index('<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">')
p=H[:a]+body+H[b:]
def rep(o,n,c=1):
    global p
    assert o in p,o[:90]; p=p.replace(o,n,c)
rep('<title>Tripo Healer Review</title>','<title>Tripo Tank Review</title>')
rep('<script src="healer-model.js"></script>','<script src="tank-model.js"></script>')
rep("window.HEALER_GLB_B64","window.MODEL_GLB_B64")
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','guard','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',combo:'Shield combo',dash:'Dash',hurt:'Hurt',wave:'Wave',guard:'Guard',downed:'Downed',crawl:'Crawl',spawn:'Spawn',tap:'Tap attack',castPoint:'Cast: thrust',castBloom:'Cast: roar',castPlant:'Cast: plant',castSweep:'Cast: sweep'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','guard','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['combo','combo1','combo2','combo3','wave','guard','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={combo:[0.30,0.78,1.42],combo1:[0.30],combo2:[0.32],combo3:[0.48],castPoint:[0.30],castBloom:[0.40],castPlant:[0.46],castSweep:[0.36],guard:[0.20,0.80,1.30]};"+p[b:]
rep("const THROWS={throw:[0.42,1.22]}, GEMFLY={};","const THROWS={}, GEMFLY={};")
rep("    A.throwUp=mixer.clipAction(sub(by.throw,'throwUp',n=>UPPER.test(n)||n==='weapon'));\n","")
rep("a.setEffectiveTimeScale(w.sync?a.getClip().duration/0.7:1);","a.setEffectiveTimeScale(w.sync?a.getClip().duration/(/^dash/.test(w.n)?0.7:0.84):1);")
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
      const hitNo=key==='combo'?i+1:key==='combo1'?1:key==='combo2'?2:key==='combo3'?3:0; const fx=hitNo?HITFX[hitNo-1]:key==='guard'?GUARDFX[i]:CASTFX[key]||{pw:0.5}; const pw=fx.pw;
      hitstop=pw>0?0.035+0.085*pw:0; squash=pw>0?0.35+0.55*pw:0; shake=Math.max(shake,pw>=0.45?pw:0); castFx(key,hitNo,i); if(fx.at){ringT=0;ringAt=fx.at;ringSize=fx.size;}}});} a.__prev=t;});
  }
  // hit feel per hit. A tank's blows are heavy: longer freezes than the Healer's, the camera shakes on the bash and hard on the slam.
  const HITFX=[{pw:0.5},{pw:0.4},{pw:1,at:'foot',size:1.7}], GUARDFX=[{pw:0.3},{pw:0.45},{pw:0.45}], CASTFX={castPoint:{pw:0.6},castBloom:{pw:0.5,at:'self',size:2.1},castPlant:{pw:1,at:'foot',size:1.5},castSweep:{pw:0.5}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0xC4D2DE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.12,0.05).applyMatrix4(staff.matrixWorld); tB.set(0,0.92,0.05).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^(combo|castSweep)/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.62,0.72,0.81,0.22*k); C.setXYZW(i*2+1,0.62,0.72,0.81,0.22*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.5*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/tank/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("hand=model.getObjectByName('handR');","hand=model.getObjectByName('handL');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={fx:()=>({motes:FXP.length,crack:crackT,shell:shellT,bell:bellT,ring:ringT}),sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.07:0;")
sys.path.insert(0,S); from dashrule import apply as dashrule; from dashkit import apply as dashkit
p=dashrule(p)
p=dashkit(p,{'go':[0.10,0.68],'dist':2.2,'inv':[0,0.70],'prof':'flat','ev':[['start',0.0],['step',0.24],['step',0.52],['shove',0.71]],
  'dummy':{'mode':'knock','at':[[0.85,0.1],[1.45,-0.1],[2.05,0.12]],'r':0.5,'w':0.45,'stun':0.3,'push':3.2,'life':2.6},
  'note':'His dash is a shield charge: both paws take the slab square to the front as in his guard, and he rams along the way on the legs of his run, one full stride of two pounding steps, ending in a shove. Every foe he meets is thrown aside and stunned for 0.3 seconds: long enough to see and for his first shield bash (it lands 0.30 s after the press) to connect, short enough that a foe is stunned at most a quarter of the time if he charges on every cooldown. He turns to face where he charges. The posts are practice dummies.'},open(S+'/tank/dashfx.js').read())
open(S+'/tankreview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
