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
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','slide','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',combo:'Staff combo',dash:'Dash',hurt:'Hurt',wave:'Wave',slide:'Ripple step',downed:'Downed',crawl:'Crawl',spawn:'Spawn',tap:'Tap attack',castPoint:'Cast: torrent',castBloom:'Cast: call the water',castPlant:'Cast: whirlpool',castSweep:'Cast: crashing wave'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','slide','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['combo','combo1','combo2','combo3','wave','slide','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={combo:[0.22,0.56,1.02],combo1:[0.22],combo2:[0.26],combo3:[0.36],castPoint:[0.44],castBloom:[0.60],castPlant:[0.40],castSweep:[0.46],slide:[0.26]};"+p[b:]
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
  const HITFX=[{pw:0.15},{pw:0.2},{pw:0.75}], CASTFX={castPoint:{pw:0.45},castBloom:{pw:0},castPlant:{pw:0.6},castSweep:{pw:0.55},slide:{pw:0}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0x3F7FE6,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.76,0).applyMatrix4(staff.matrixWorld); tB.set(0,0.98,0).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^(combo|castSweep|castPlant)/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.25,0.5,0.9,0.04*k); C.setXYZW(i*2+1,0.9,0.95,0.97,0.24*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.3*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/otterw/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={fx:()=>({motes:FXP.length,shots:SHOTS.filter(s=>s.t>=0).length,pool:poolT,wave:waveT}),sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.04:0;")
open(S+'/otterreview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
